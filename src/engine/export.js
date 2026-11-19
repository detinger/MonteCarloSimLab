import {pythonQuantiles,rQuantile} from './inputLawExport.js'
import {usesLegacyTransform} from './inputLaws.js'
import {pythonDomain, rDomain, rPlot} from './domainExport.js'
import {isDomain, domainSpecs} from './domains.js'
import {compile, ENGINE_VERSION} from './index.js'
import {pythonBuilderCells, pythonBuilderData, rBuilderPlots} from './builderExport.js'

// The notebook installs missing packages into its own kernel; scripts stop with the install command.
const requiredPackages = `import importlib.util
import subprocess
import sys
missing = [name for name in ("scipy", "matplotlib") if importlib.util.find_spec(name) is None]
if missing:
    print("Installing", ", ".join(missing), "into this kernel …")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", *missing])`

const requireScriptPackages = `import importlib.util
_missing = [name for name in ("scipy", "matplotlib") if importlib.util.find_spec(name) is None]
if _missing:
    sys.exit("This script needs " + " and ".join(_missing) + ". Install with:\\n    " + sys.executable + " -m pip install " + " ".join(_missing))`

const libraries = `import csv
import json
import math
import operator
import platform
import statistics
import sys
from collections import Counter
print("Python", platform.python_version())`

const functions = `def draws(index, stream, seed):
    """Philox2x32-10; index and stream are the two counter words."""
    x, y = index, stream
    mask = 2**32 - 1
    for _ in range(10):
        product = x * 0xd256d193
        x, y = ((product >> 32) ^ y ^ seed) & mask, product & mask
        seed = (seed + 0x9e3779b9) & mask
    return x / 2**32, y / 2**32

${pythonQuantiles}

def sample(node, index):
    a, kind = node["a"], node["distribution"]
    if kind == "constant":
        return a
    u, v = draws(index, node["stream"], model["seed"])
    if kind not in ("bernoulli", "uniform", "normal", "triangular"):
        return quantile_draw(kind, node, u + 0.5/2**32)
    if kind == "bernoulli":
        return int(u < a)
    b = node["b"]
    if kind == "uniform":
        return a + (b-a)*u
    if kind == "normal":
        return a + b*math.sqrt(-2*math.log1p(-u))*math.cos(2*math.pi*v)
    c = node["c"]
    mode = (b-a)/(c-a)
    return a+(c-a)*math.sqrt(u*mode) if u < mode else c-(c-a)*math.sqrt((1-u)*(1-mode))

def formula(node, values):
    op = node["op"]
    if op == "ref":
        return values[node["name"]]
    if op == "num":
        return node["value"]
    if op == "neg":
        return -formula(node["value"], values)
    if op in ("abs","sqrt","log","exp"):
        fn = {"abs":abs,"sqrt":math.sqrt,"log":math.log,"exp":math.exp}[op]
        return fn(formula(node["value"],values))
    left, right = formula(node["left"], values), formula(node["right"], values)
    if op == "+": return left + right
    if op == "-": return left - right
    if op == "*": return left * right
    if op == "/": return left / right
    if op == "^": return math.pow(left,right)
    if op == "min": return min(left,right)
    if op == "max": return max(left,right)
    raise ValueError("Unsupported operator")

def wilson(hits, n):
    z = 1.959963984540054
    p = hits/n
    denominator = 1 + z*z/n
    center = (p + z*z/(2*n))/denominator
    radius = z * math.sqrt((p*(1-p) + z*z/(4*n))/n)/denominator
    return [0 if hits == 0 else center-radius, 1 if hits == n else center+radius]`

const simulation = `outputs, scatter, events, convergence, paths = [], [], [], [], []
input_samples = {node["name"]: [] for node in model.get("inputs", [])} if model["kind"] == "builder" else {}
n = model["samples"]
critical_counts = Counter()
hits = 0
if model["kind"] == "builder":
    compare = {">":operator.gt, ">=":operator.ge, "<":operator.lt, "<=":operator.le}[model.get("comparator", ">")]
    print("Event: output", model.get("comparator", ">"), model["threshold"], model.get("unit", ""))
running_mean = 0.0
for i in range(n):
    if model["kind"] == "pi":
        u, v = draws(i, model["stream"], model["seed"])
        x, y = 2*u-1, 2*v-1
        event = x*x+y*y <= 1
        output = 4*int(event)
        if i < 2048:
            scatter.append((x, y, event))
    elif model["kind"] != "builder":
        output, event, path = domain_row(i)
        if path: paths.append(path)
    else:
        values = {node["name"]: sample(node, i) for node in model["inputs"]}
        for name, value in values.items():
            input_samples[name].append(value)
        output = formula(model["ast"], values)
        if not math.isfinite(output):
            raise ValueError(f"Nonfinite output at replication {i+1}")
        event = compare(output, model["threshold"])
    outputs.append(output)
    events.append(int(event))
    hits += int(event)
    running_mean += (output-running_mean)/(i+1)
    if i == 0 or (i+1) % math.ceil(n/128) == 0 or i+1 == n:
        convergence.append((i+1, running_mean))`

const stats = `probability_ci = wilson(hits, n)
mean = statistics.mean(outputs)
sd = statistics.stdev(outputs) if n >= 2 else None
if model["kind"] == "pi":
    mean_ci = [4*p for p in probability_ci]
elif model["kind"] == "montyhall":
    mean_ci = probability_ci
else:
    mean_ci = None
    if sd is not None:
        from scipy.stats import t
        radius = t.ppf(0.975, n-1)*sd/math.sqrt(n)
        mean_ci = [mean-radius, mean+radius]
ordered = sorted(outputs)
def quantile(p):
    location = p*(n-1)
    a, b = math.floor(location), math.ceil(location)
    return ordered[a] + (location-a)*(ordered[b]-ordered[a])
summary = dict(n=n, hits=hits, mean=mean, sd=sd, probability=hits/n,
               probabilityCI=probability_ci, meanCI=mean_ci,
               p05=quantile(0.05), p50=quantile(0.5), p95=quantile(0.95))
if model["kind"] == "pi":
    summary["reference"] = math.pi
elif model.get("reference") is not None:
    summary["reference"] = model["reference"]
if model["kind"] == "projectmgmt":
    summary["criticalFrequencies"] = {task["id"]:critical_counts[task["id"]]/n for task in model["plan"]}
    summary["within120Days"] = sum(y<=120 for y in outputs)/n
print(json.dumps(summary, indent=2))`

function parameterCell(model) {
  // JSON inside an escaped string literal handles quotes, HTML and Unicode.
  const data = {...compile(model),engineVersion:ENGINE_VERSION}
  return 'model = json.loads(' + JSON.stringify(JSON.stringify(data)) + ')\nprint(model.get("question", "Estimate pi from the fraction of darts inside the unit circle."))\nprint(model.get("assumptions", "Independent uniform darts in the square." if model["kind"] == "pi" else "Independent input distributions."))\nprint("Engine", model["engineVersion"], "seed", model["seed"], "replications", model["samples"])'
}

function modelFunctions(model) {
  return isDomain(model.kind) ? functions + "\n\n" + pythonDomain(model) : functions
}

export function pythonScript(model) {
  if (model.kind === 'builder' || compile(model).kind === 'builder')
    return [libraries,requireScriptPackages,parameterCell(model),modelFunctions(model),simulation,stats,...pythonBuilderCells.map(([title,,code])=>'# ---- '+title+' ----\n'+code),pythonBuilderData].join('\n\n')+'\n'
  const optionalPlots='# Add --plot to render the analysis figures.\nif "--plot" in sys.argv:\n'+plots.split('\n').map(line=>'    '+line).join('\n')
  return [libraries,parameterCell(model),modelFunctions(model),simulation,stats,optionalPlots].join('\n\n')+'\n'
}

const plots = `import matplotlib
import matplotlib.pyplot as plt
print("Matplotlib", matplotlib.__version__)
fig, axes = plt.subplots(1, 3, figsize=(15, 4), constrained_layout=True)
if model["kind"] == "pi":
    for hit, label, marker in [(True,"Inside","."), (False,"Outside","x")]:
        group = [(x,y) for x,y,e in scatter if e == hit]
        if group:
            x, y = zip(*group)
            axes[0].scatter(x, y, marker=marker, s=5, label=label)
    axes[0].set(xlabel="x", ylabel="y", aspect="equal", title="First 2,048 darts or fewer")
    axes[0].legend()
elif model["kind"] in ("randomwalk","stock"):
    for path in paths:
        xs,ys = zip(*path)
        axes[0].plot(xs,ys)
    axes[0].set(title="First eight paths or fewer",xlabel="x" if model["kind"]=="randomwalk" else "Trading day",ylabel="y" if model["kind"]=="randomwalk" else "Price (model currency units)")
    if model["kind"]=="randomwalk": axes[0].set_aspect("equal")
elif model["kind"]=="integration":
    points = sorted(path[0] for path in paths)
    xs,ys = zip(*points)
    axes[0].scatter(xs,ys,s=5)
    axes[0].axhline(0,linestyle=":")
    axes[0].set(title="Sampled abscissae",xlabel="x",ylabel="f(x)")
else:
    axes[0].hist(outputs, bins=30)
    axes[0].set(xlabel=model.get("unit", "Output"), ylabel="Replications", title="Sampled outputs")
# Duplicate values form one jump of the empirical CDF.
counts = Counter(ordered)
xs = sorted(counts)
ys, cum = [0], 0
for x in xs:
    cum += counts[x]
    ys.append(cum/n)
axes[1].step([xs[0]] + xs, ys, where="post")
axes[1].set(xlabel="Replication output", ylabel="Cumulative fraction", title="Empirical CDF")
if model["kind"] == "builder":
    axes[1].axvline(model["threshold"], linestyle=":", label="Threshold")
    axes[1].legend()
xs, ys = zip(*convergence)
axes[2].plot(xs, ys)
axes[2].set(xlabel="Replications", ylabel="Running estimate", title="Convergence")
if model["kind"] == "pi":
    axes[2].axhline(math.pi, linestyle=":", label="Analytical pi")
    axes[2].legend()
plt.show()`

const dataExport = `with open("replications.csv", "w", newline="", encoding="utf-8") as handle:
    writer = csv.writer(handle)
    writer.writerow(["replication", "output", "event"])
    writer.writerows((i+1,y,event) for i,(y,event) in enumerate(zip(outputs,events)))
with open("run-manifest.json", "w", encoding="utf-8") as handle:
    json.dump({"model":model, "summary":summary}, handle, ensure_ascii=False, indent=2)`

export function notebook(model) {
  const builder = compile(model).kind === 'builder'
  const cell = (type, id, source) => ({cell_type:type,id,metadata:{},source,
    ...(type === 'code' ? {execution_count:null,outputs:[]} : {})})
  return {nbformat:4,nbformat_minor:5,
    metadata:{kernelspec:{name:'python3',language:'python',display_name:'Python 3'},language_info:{name:'python'}},
    cells:[
      cell('markdown','intro','# Monte Carlo experiment\n\nExported '+new Date().toISOString()+'. The parameter cell displays the saved question and assumptions. Results describe the specified model.'),
      cell('markdown','requirements','Run in Python 3 with Matplotlib for charts and SciPy for t intervals and inverse distribution functions. The first code cell installs either package if this kernel lacks it. Open a local file in Colab using File → Upload notebook.'),
      cell('code','packages',requiredPackages),
      cell('code','libraries',libraries),
      cell('code','parameters',parameterCell(model)),
      cell('markdown','method','Each replication has its own counter. Each named input uses a separate stream. Repeated references to an input use the same draw within a replication. The integer generator matches the browser. Floating-point functions may differ in their last digits.'),
      cell('code','functions',modelFunctions(model)),
      cell('code','simulate',simulation),
      cell('code','statistics',stats),
      cell('markdown','intervals','Wilson intervals measure sampling uncertainty in the event probability. For pi, multiply both endpoints by four. Builder mean intervals use Student’s t, with a normality or large-sample approximation. Outcome percentiles describe the spread of replications under fixed assumptions.'),
      ...(builder ? pythonBuilderCells.flatMap(([title,text,code],i)=>[cell('markdown','figure-'+i+'-text','## '+title+'\n\n'+text),cell('code','figure-'+i,code)]) : [cell('code','plots',plots)]),
      cell('markdown','files','Running the next cell writes the replication table'+(builder?' with every input':'')+' and model manifest to the notebook working directory.'),
      cell('code','export',builder ? pythonBuilderData : dataExport)]}
}

const rRng = `# Unsigned 32-bit arithmetic in exact 16-bit components.
xor32 <- function(x, y) {
  bitwXor(as.integer(x %% 65536), as.integer(y %% 65536)) +
    65536 * bitwXor(as.integer(floor(x / 65536)), as.integer(floor(y / 65536)))
}
draws <- function(index, stream, key) {
  x <- index
  y <- stream
  for (round in seq_len(10)) {
    low <- x %% 65536
    high <- floor(x / 65536)
    middle <- high*0xd193 + low*0xd256 + floor(low*0xd193/65536)
    upper <- high*0xd256 + floor(middle/65536)
    lower <- (middle %% 65536)*65536 + ((low*0xd193) %% 65536)
    x <- xor32(xor32(upper, y), key)
    y <- lower
    key <- (key+0x9e3779b9) %% 2^32
  }
  list(u=x/2^32, v=y/2^32)
}`

function rExpression(tree) {
  if (tree.op === 'num') return String(tree.value)
  if (tree.op === 'ref') return 'inputs[[' + JSON.stringify(tree.name) + ']]'
  if (tree.op === 'neg') return '(-'+rExpression(tree.value)+')'
  if (['sqrt','exp','log','abs'].includes(tree.op)) return tree.op+'('+rExpression(tree.value)+')'
  if (['min','max'].includes(tree.op)) return 'p'+tree.op+'('+rExpression(tree.left)+', '+rExpression(tree.right)+')'
  return '('+rExpression(tree.left)+' '+tree.op+' '+rExpression(tree.right)+')'
}

function rInput(input) {
  const {name, a, b, c, stream, distribution} = input
  let expr = {
    constant:`rep(${a}, n)`,
    uniform:`${a} + (${b}-(${a}))*d$u`,
    normal:`${a} + ${b}*sqrt(-2*log1p(-d$u))*cos(2*pi*d$v)`,
    bernoulli:`as.numeric(d$u < ${a})`,
    triangular:`ifelse(d$u < mode, ${a}+span*sqrt(d$u*mode), ${c}-span*sqrt((1-d$u)*(1-mode)))`,
  }[distribution]
  const lines = []
  if (distribution !== 'constant') lines.push(`d <- draws(index, ${stream}, seed)`)
  if (distribution === 'triangular') lines.push(`span <- ${c}-(${a})`,`mode <- (${b}-(${a}))/span`)
  if(!usesLegacyTransform(distribution)){
    const quantile=rQuantile(input)
    lines.push(quantile.prefix)
    expr=quantile.expr
  }
  lines.push('inputs[[' + JSON.stringify(name) + ']] <- '+expr)
  return lines.join('\n')
}

export function rScript(model) {
  const config = compile(model)
  const lines = [
    '# Monte Carlo Simulation Lab · '+ENGINE_VERSION,
    'n <- '+config.samples, 'seed <- '+config.seed, 'index <- as.double(seq_len(n)-1L)', rRng,
  ]
  if (config.kind === 'pi') {
    lines.push('d <- draws(index, '+config.stream+', seed)','event <- (2*d$u-1)^2 + (2*d$v-1)^2 <= 1','output <- 4*event')
  } else if (isDomain(config.kind)) {
    lines.push(rDomain(config,domainSpecs[config.kind].fields))
  } else {
    lines.push('inputs <- list()',...config.inputs.map(rInput), 'output <- rep_len('+rExpression(config.ast)+', n)',
      'stopifnot(all(is.finite(output)))','event <- output '+config.comparator+' '+config.threshold)
  }
  if(['projectmgmt','manufacturing'].includes(config.kind))lines.push('p_threshold <- p$threshold')
  lines.push(`prob <- mean(event)
z <- qnorm(0.975)
denominator <- 1 + z^2/n
center <- (prob + z^2/(2*n))/denominator
radius <- z*sqrt((prob*(1-prob)+z^2/(4*n))/n)/denominator
probability_ci <- c(if (prob == 0) 0 else center-radius, if (prob == 1) 1 else center+radius)`,
    config.kind === 'pi' ? 'mean_ci <- 4*probability_ci' : config.kind === 'montyhall' ? 'mean_ci <- probability_ci' : 'mean_ci <- if (n > 1) mean(output) + c(-1,1)*qt(0.975,n-1)*sd(output)/sqrt(n) else c(NA,NA)',
    'print(list(n=n,hits=sum(event),mean=mean(output),sd=sd(output),probability=prob,probabilityCI=probability_ci,meanCI=mean_ci,quantiles=quantile(output,c(.05,.5,.95))))')
  lines.push(config.kind === 'builder' ? rBuilderPlots(config, rExpression(config.ast)) : rPlot(config.kind))
  return lines.join('\n\n')+'\n'
}
