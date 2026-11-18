import { criticalT } from '../engine/index.js'
import { streamId } from '../engine/rng.js'
import { examples, issues } from './newExamples.js'

const pythonModels={
  coins:`    if mode == "die":
        return rng.randint(1, 6), {}
    return sum(rng.random() < p for _ in range(tosses)), {}`,
  birthday:`    days = [rng.randrange(365) for _ in range(people)]
    return int(len(set(days)) < people), {}`,
  reliability:`    states = [rng.random() < r for r in (a, b, c)]
    return int(all(states) if layout == "series" else any(states)), {}`,
  queue:`    arrival_time = finish = total_wait = 0.0
    for i in range(warmup + customers):
        arrival_time += rng.expovariate(arrival / 60)
        start = max(arrival_time, finish)
        finish = start + rng.expovariate(service / 60)
        if i >= warmup:
            total_wait += start - arrival_time
        if i == warmup:
            first_arrival = arrival_time
    return total_wait / customers, {"waiting_minutes": total_wait, "cohort_window_minutes": finish - first_arrival}`,
  inventory:`    demands = [rng.randint(0, demand) for _ in range(days)]
    def policy(threshold):
        arrivals = [0] * (days + lead)
        stock, outstanding, served, unfilled, stockouts, storage = initial, 0, 0, 0, 0, 0
        for day, requested in enumerate(demands):
            stock += arrivals[day]
            outstanding -= arrivals[day]
            filled = min(stock, requested)
            stock -= filled
            served += filled
            unfilled += requested - filled
            stockouts += int(requested > filled)
            storage += stock * holding
            if stock + outstanding <= threshold:
                arrivals[day + lead] += order
                outstanding += order
        return storage + lost * unfilled, served, unfilled, stockouts
    base, alt = policy(point), policy(alternate)
    return base[0], dict(alternative_cost=alt[0], baseline_filled=base[1], alternative_filled=alt[1], demand_units=sum(demands), baseline_stockout_days=base[3], alternative_stockout_days=alt[3])`,
}
const rModels={
  coins:`  if (mode == "die") return(c(value=sample.int(6, 1)))
  c(value=sum(runif(tosses) < p))`,
  birthday:`  c(value=as.integer(anyDuplicated(sample.int(365, people, replace=TRUE)) > 0))`,
  reliability:`  states <- runif(3) < c(a,b,c)
  c(value=as.integer(if (layout == "series") all(states) else any(states)))`,
  queue:`  arrival_time <- finish <- total_wait <- 0
  for (i in seq_len(warmup + customers)) {
    arrival_time <- arrival_time + rexp(1, arrival / 60)
    start <- max(arrival_time, finish)
    finish <- start + rexp(1, service / 60)
    if (i > warmup) total_wait <- total_wait + start - arrival_time
    if (i == warmup + 1) first_arrival <- arrival_time
  }
  c(value=total_wait/customers, waiting_minutes=total_wait, cohort_window_minutes=finish-first_arrival)`,
  inventory:`  demands <- sample.int(demand+1, days, replace=TRUE)-1
  policy <- function(threshold) {
    arrivals <- numeric(days+lead)
    stock <- initial
    outstanding <- served <- unfilled <- stockouts <- storage <- 0
    for (day in seq_len(days)) {
      stock <- stock + arrivals[day]
      outstanding <- outstanding - arrivals[day]
      supply <- min(stock, demands[day])
      stock <- stock - supply
      served <- served + supply
      unfilled <- unfilled + demands[day] - supply
      stockouts <- stockouts + as.integer(demands[day] > supply)
      storage <- storage + stock * holding
      if (stock + outstanding <= threshold) {
        arrivals[day+lead] <- arrivals[day+lead]+order
        outstanding <- outstanding + order
      }
    }
    c(storage + lost*unfilled, served, unfilled, stockouts)
  }
  base <- policy(point)
  alt <- policy(alternate)
  c(value=base[1], alternative_cost=alt[1], baseline_filled=base[2], alternative_filled=alt[2], demand_units=sum(demands), baseline_stockout_days=base[4], alternative_stockout_days=alt[4])`,
}
export function portable(config) {
  const errors=issues(config)
  if(errors.length) throw new Error(errors.join(' '))
  const meta=examples[config.id]
  const fields=['seed','samples',...meta.fields.map(f=>f.key)]
  const args=Object.fromEntries(fields.map(key=>[key,config[key]]))
  const pythonRef={
    coins:'tosses*p if mode == "coin" else 3.5',
    birthday:'1-math.prod((365-i)/365 for i in range(people))',
    reliability:'a*b*c if layout == "series" else 1-(1-a)*(1-b)*(1-c)',
    queue:'60*arrival/(service*(service-arrival)) if arrival < service else None',
    inventory:'None',
  }[config.id]
  const rRef={
    coins:'if(mode == "coin") tosses*p else 3.5',
    birthday:'1-prod((365-(seq_len(people)-1))/365)',
    reliability:'if(layout == "series") a*b*c else 1-(1-a)*(1-b)*(1-c)',
    queue:'if(arrival < service) 60*arrival/(service*(service-arrival)) else NA_real_',
    inventory:'NA_real_',
  }[config.id]
  const imports='import csv, json, math, statistics, sys\nfrom statistics import NormalDist'
  const parameters=fields.map(key=>key+' = '+JSON.stringify(config[key])).join('\n')
  const run=`class DrawStream:
    """Counter-based Philox2x32-10. Each replication starts a fresh draw counter."""
    def __init__(self, replication):
        self.replication = replication
        self.counter = 0

    def next_word(self):
        x, y, key = self.replication, self.counter, seed ^ ${streamId(config.id)}
        self.counter += 1
        mask = 2**32 - 1
        for _ in range(10):
            product = x * 0xd256d193
            x, y = ((product >> 32) ^ y ^ key) & mask, product & mask
            key = (key + 0x9e3779b9) & mask
        return x

    def random(self):
        return (self.next_word() + 0.5) / 2**32

    def randrange(self, stop):
        bucket = 2**32 // stop
        limit = bucket * stop
        word = self.next_word()
        while word >= limit:
            word = self.next_word()
        return word // bucket

    def randint(self, lo, hi):
        return lo + self.randrange(hi-lo+1)

    def expovariate(self, rate):
        return -math.log(self.random())/rate

def replicate(rng):
${pythonModels[config.id]}

rows = []
for index in range(samples):
    value, metrics = replicate(DrawStream(index))
    rows.append({"replication": index + 1, "value": value, **metrics})
values = [row["value"] for row in rows]
estimate = statistics.mean(values)
print("Replications", samples, "Estimate", estimate)`
  const meanCI=`if samples > 1:
    df = samples - 1
    table = ${JSON.stringify(Array.from({length:30},(_,i)=>criticalT(i+1)))}
    z = NormalDist().inv_cdf(.975)
    critical = table[df-1] if df <= 30 else z + (z**3+z)/(4*df) + (5*z**5+16*z**3+3*z)/(96*df**2) + (3*z**7+19*z**5+17*z**3-15*z)/(384*df**3)
    radius = critical * statistics.stdev(values) / math.sqrt(samples)
    print("95% Student t interval", estimate-radius, estimate+radius)
else:
    print("Mean interval unavailable for one replication.")`
  const probCI=`z = NormalDist().inv_cdf(0.975)
den = 1 + z*z/samples
center = (estimate + z*z/(2*samples))/den
radius = z*math.sqrt(estimate*(1-estimate)/samples+z*z/(4*samples**2))/den
print("95% Wilson interval", max(0,center-radius), min(1,center+radius))`
  const diagnostics={
    inventory:`requested = sum(r["demand_units"] for r in rows)
for policy in ("baseline", "alternative"):
    filled = sum(r[policy+"_filled"] for r in rows)
    print(policy, "fill rate", filled/requested if requested else None)
    print(policy, "meets fill target", filled/requested >= target if requested else None)
    print(policy, "stockout day fraction", sum(r[policy+"_stockout_days"] for r in rows)/(samples*days))
print("Mean alternative cost", statistics.mean(r["alternative_cost"] for r in rows))`,
    queue:`span = sum(r["cohort_window_minutes"] for r in rows)
rate = samples*customers/span
print("Offered load", arrival/service, "cohort throughput per hour", rate*60)
print("Mean measured cohort queue length", sum(r["waiting_minutes"] for r in rows)/span, "rate times waiting time", rate*estimate)`,
  }[config.id]??''
  const spread=`ordered = sorted(values)
def empirical_quantile(q):
    index = (len(ordered) - 1) * q
    lo = math.floor(index)
    hi = math.ceil(index)
    return ordered[lo] + (ordered[hi] - ordered[lo])*(index-lo)
print("Replication SD", statistics.stdev(values) if samples > 1 else None)
print("Outcome quantiles", {q: empirical_quantile(q) for q in (0.05,0.25,0.5,0.75,0.95)})`
  const analysis=[spread,meta.probability?probCI:meanCI,diagnostics,'reference = '+pythonRef+'\nif reference is not None:\n    print("Reference", reference)' ].filter(Boolean).join('\n')
  const manifest=JSON.stringify({schemaVersion:1,engineVersion:'domain/philox2x32-10/v1',example:config.id,parameters:args,metric:meta.metric(config),rng:'Philox2x32-10/v1',browserRng:'Philox2x32-10/v1'})
  const save=`with open("replications.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
with open("run-manifest.json", "w") as f:
    manifest = json.loads(${JSON.stringify(manifest)})
    for name in manifest["parameters"]:
        manifest["parameters"][name] = globals()[name]
    json.dump(manifest, f, indent=2)`
  const chart=`try:
    import matplotlib.pyplot as plt
    fig, axes = plt.subplots(1, 3, figsize=(13, 4))
    axes[0].hist(values)
    axes[0].set(xlabel="Replication output", ylabel="Count")
    axes[1].step(sorted(values), [(i+1)/samples for i in range(samples)], where="post")
    axes[1].set(xlabel="Replication output", ylabel="Cumulative probability")
    running = 0
    curve = []
    for i, x in enumerate(values):
        running += (x-running)/(i+1)
        curve.append(running)
    axes[2].plot(range(1, samples+1), curve)
    axes[2].set(xlabel="Replications", ylabel="Running estimate")
    plt.tight_layout()
    plt.show()
except ImportError:
    print("Install matplotlib for plots. The CSV includes all observations.")`
  const md=source=>({cell_type:'markdown',source,metadata:{}})
  const code=source=>({cell_type:'code',source,metadata:{},outputs:[],execution_count:null})
  const cells=[md('# '+meta.title+'\n\n'+meta.question+'\n\n'+meta.assumptions+'\n\nGenerated '+new Date().toISOString()+' with domain/philox2x32-10/v1. Intervals describe Monte Carlo sampling uncertainty under the stated model.'),code(imports+'\nprint(sys.version)'),md('## Run parameters\nPython and the browser use Philox counters keyed by example, replication and draw. Floating-point arithmetic can differ between runtimes.'),code(parameters),code(run),code(analysis),code(chart),md('## Save results\nWrite the replication table and settings to the current directory.'),code(save)]
  const ipynb=JSON.stringify({nbformat:4,nbformat_minor:5,metadata:{kernelspec:{name:'python3',display_name:'Python 3',language:'python'},language_info:{name:'python'}},cells:cells.map((cell,i)=>({...cell,id:'mc-cell-'+i}))},null,2)
  const rInterval=meta.probability?`z <- qnorm(0.975)
den <- 1 + z^2/samples
center <- (estimate + z^2/(2*samples))/den
radius <- z*sqrt(estimate*(1-estimate)/samples + z^2/(4*samples^2))/den
print(c(Wilson_lower=max(0,center-radius), Wilson_upper=min(1,center+radius)))`:`if (samples > 1) {
  radius <- qt(.975, samples-1)*sd(values)/sqrt(samples)
  print(c(t_lower=estimate-radius, t_upper=estimate+radius))
}`
  const rExtra=config.id==='inventory'?`total_demand <- sum(rows[,"demand_units"])
print(c(alternative_cost=mean(rows[,"alternative_cost"]),
        fill_target=target,
        baseline_fill=if(total_demand) sum(rows[,"baseline_filled"])/total_demand else NA_real_,
        alternative_fill=if(total_demand) sum(rows[,"alternative_filled"])/total_demand else NA_real_))`:config.id==='queue'?'print(c(load=arrival/service, cohort_Lq=sum(rows[,"waiting_minutes"])/sum(rows[,"cohort_window_minutes"])))':''
  const r=[`# ${meta.title}\n# ${meta.assumptions}\n# Base R uses MT19937. Statistical agreement is expected across engines.`,
    fields.map(key=>key+' <- '+JSON.stringify(config[key])).join('\n'),
    'set.seed(as.integer(seed %% 2147483647))',
    'trial <- function() {\n'+rModels[config.id]+'\n}',
    'rows <- do.call(rbind, lapply(seq_len(samples), function(i) trial()))\nvalues <- rows[,"value"]\nestimate <- mean(values)\nprint(c(samples=samples, estimate=estimate))',rInterval,rExtra,'reference <- '+rRef+'\nif (!is.na(reference)) print(c(reference=reference))' ,'write.csv(rows, "replications.csv", row.names=FALSE)'].filter(Boolean).join('\n\n')
  return {py:['# '+meta.title,'# '+meta.assumptions,'# Counter-based Philox2x32-10, as in the browser.',imports,parameters,run,analysis,save].join('\n\n'),R:r,ipynb}
}
