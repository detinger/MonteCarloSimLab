// Builder analysis figures for the Python, notebook and R exports. They mirror the
// in-app results: input distributions, output histogram and CDF with threshold and
// mean markers, the percentile table, convergence and one-at-a-time sensitivity.
// Model curves come from each input's own quantile function, so every family is
// covered without separate density formulas.
import {rQuantile} from './inputLawExport.js'

export const percentileLevels = [.05,.25,.5,.75,.8,.9,.95]
const discreteKinds = ['bernoulli','discrete','binomial','poisson','categorical','empirical','geometric','negbinomial','hypergeometric']

// [heading, explanation, code] cells. The script joins them; the notebook shows each one.
export const pythonBuilderCells = [
  ['Figures setup', 'Figures are shown inline in a notebook and saved as PNG files next to a script.', `import matplotlib
IN_NOTEBOOK = "ipykernel" in sys.modules
if not IN_NOTEBOOK:
    matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy.special import ndtri
print("Matplotlib", matplotlib.__version__)
DISCRETE = set(${JSON.stringify(discreteKinds)})
unit = model.get("unit") or ""
output_label = "Output" + (f" ({unit})" if unit else "")
threshold = model["threshold"]
event_label = f"Threshold {model.get('comparator', '>')} {threshold:g}"

def input_quantile(node, q):
    kind, a = node["distribution"], node["a"]
    if kind == "constant":
        return a
    if kind == "bernoulli":
        return float(q > 1-a)
    if kind == "uniform":
        return a + (node["b"]-a)*q
    if kind == "normal":
        return a + node["b"]*float(ndtri(q))
    if kind == "triangular":
        b, c = node["b"], node["c"]
        mode = (b-a)/(c-a)
        return a+(c-a)*math.sqrt(q*mode) if q < mode else c-(c-a)*math.sqrt((1-q)*(1-mode))
    return quantile_draw(kind, node, q)

def describe(node):
    values = []
    for key in ("a", "b", "c", "d"):
        if key in node:
            value = node[key]
            values.append("[" + ", ".join(f"{v:g}" for v in value[:6]) + (", …" if len(value) > 6 else "") + "]" if isinstance(value, list) else f"{value:g}")
    return f'{node.get("label") or node["name"]}\\n{node["distribution"]}({", ".join(values)})'

def finish(fig, name):
    if IN_NOTEBOOK:
        plt.show()
    else:
        fig.savefig(name, dpi=120)
        plt.close(fig)
        print("Saved", name)`],
  ['Percentiles', 'Outcome percentiles of the replications, as in the Histogram tab.', `print("Percentiles of", output_label)
for p in ${JSON.stringify(percentileLevels)}:
    print(f"  P{round(p*100):>2}: {quantile(p):.6g}")`],
  ['Input distributions', 'Each panel shows the sampled values of one input. The black curve or dots show the specified distribution.', `columns = min(3, len(model["inputs"]))
rows = math.ceil(len(model["inputs"])/columns)
fig, axes = plt.subplots(rows, columns, figsize=(5*columns, 3.4*rows), squeeze=False, constrained_layout=True)
for ax, node in zip(axes.flat, model["inputs"]):
    xs, kind = input_samples[node["name"]], node["distribution"]
    if kind == "constant":
        ax.axvline(node["a"], linewidth=3)
        ax.set_yticks([])
    elif kind in DISCRETE and len(set(xs)) <= 60:
        counts = Counter(xs)
        keys = sorted(counts)
        ax.bar(keys, [counts[k]/n for k in keys], width=0.8 if len(keys) > 1 else 0.4, alpha=0.6, label="Sampled")
        grid = 4000
        model_counts = Counter(input_quantile(node, (k+0.5)/grid) for k in range(grid))
        support = sorted(model_counts)
        ax.plot(support, [model_counts[k]/grid for k in support], "o", color="black", markersize=4, label="Model")
        ax.set_ylabel("Probability")
    else:
        lo, hi = sorted(xs)[int(0.005*(n-1))], sorted(xs)[int(0.995*(n-1))]
        if hi <= lo:
            lo, hi = min(xs), max(xs) + 1e-9
        ax.hist(xs, bins=40, range=(lo, hi), density=True, alpha=0.6, label="Sampled")
        if kind not in DISCRETE:
            ps = [(k+0.5)/400 for k in range(400)]
            qs = [input_quantile(node, p) for p in ps]
            curve = [((qs[k]+qs[k+1])/2, (ps[k+1]-ps[k])/(qs[k+1]-qs[k])) for k in range(399) if qs[k+1] > qs[k]]
            curve = [(x, y) for x, y in curve if lo <= x <= hi and math.isfinite(y)]
            if curve:
                ax.plot(*zip(*curve), color="black", label="Model")
        ax.set_xlim(lo, hi)
        ax.set_ylabel("Density")
    ax.set_title(describe(node), fontsize=9)
    ax.set_xlabel(node.get("unit") or "value")
    if kind != "constant":
        ax.legend(fontsize=8)
for ax in axes.flat[len(model["inputs"]):]:
    ax.axis("off")
fig.suptitle("Input distributions")
finish(fig, "input-distributions.png")`],
  ['Output distribution', 'Histogram and cumulative frequency of the model output with the event threshold and the mean.', `fig, (hist_ax, cdf_ax) = plt.subplots(1, 2, figsize=(13, 4.2), constrained_layout=True)
hist_ax.hist(outputs, bins=30, alpha=0.75)
hist_ax.set(xlabel=output_label, ylabel="Replications", title="Histogram")
counts = Counter(ordered)
xs = sorted(counts)
ys, cum = [0], 0
for x in xs:
    cum += counts[x]
    ys.append(cum/n)
cdf_ax.step([xs[0]] + xs, ys, where="post")
cdf_ax.set(xlabel=output_label, ylabel="Cumulative fraction", title="Cumulative frequency", ylim=(0, 1.02))
for ax in (hist_ax, cdf_ax):
    ax.axvline(threshold, color="C3", linestyle=":", label=event_label)
    ax.axvline(mean, color="C1", label=f"Mean {mean:.4g}")
    ax.legend(fontsize=8)
fig.suptitle(f"P(event) = {hits/n:.2%}   ·   95% Wilson interval {probability_ci[0]:.2%} – {probability_ci[1]:.2%}")
finish(fig, "output-distribution.png")`],
  ['Convergence', 'Running mean of the output against the number of replications.', `fig, ax = plt.subplots(figsize=(8, 4), constrained_layout=True)
xs, ys = zip(*convergence)
ax.plot(xs, ys)
ax.axhline(mean, color="C1", linestyle=":", label=f"Final mean {mean:.4g}")
ax.set(xlabel="Replications", ylabel="Running mean" + (f" ({unit})" if unit else ""), title="Convergence")
ax.legend(fontsize=8)
finish(fig, "convergence.png")`],
  ['Sensitivity', 'Each input is swept from its 10th to 90th percentile while the others stay at their median. Longer bars drive more of the output uncertainty.', `median = {node["name"]: input_quantile(node, 0.5) for node in model["inputs"]}
base = formula(model["ast"], median)
bars = []
for node in model["inputs"]:
    if node["distribution"] == "constant":
        continue
    try:
        low = formula(model["ast"], {**median, node["name"]: input_quantile(node, 0.1)})
        high = formula(model["ast"], {**median, node["name"]: input_quantile(node, 0.9)})
    except (ValueError, ZeroDivisionError, OverflowError):
        continue
    if math.isfinite(low) and math.isfinite(high):
        bars.append((node.get("label") or node["name"], min(low, high), max(low, high)))
bars.sort(key=lambda bar: bar[2]-bar[1])
print(f"Sensitivity (base output {base:.6g})")
for label, lo, hi in reversed(bars):
    print(f"  {label}: {lo:.6g} to {hi:.6g} (swing {hi-lo:.6g})")
if bars:
    fig, ax = plt.subplots(figsize=(8, 0.5*len(bars) + 1.5), constrained_layout=True)
    ax.barh([b[0] for b in bars], [b[2]-b[1] for b in bars], left=[b[1] for b in bars], alpha=0.75)
    ax.axvline(base, color="black", linestyle=":", label=f"Base {base:.4g}")
    ax.set(xlabel=output_label, title="Sensitivity (P10 to P90 of each input)")
    ax.legend(fontsize=8)
    finish(fig, "sensitivity.png")`],
]

export const pythonBuilderData = `with open("replications.csv", "w", newline="", encoding="utf-8") as handle:
    writer = csv.writer(handle)
    names = [node["name"] for node in model["inputs"]]
    writer.writerow(["replication", *names, "output", "event"])
    writer.writerows((i+1, *(input_samples[name][i] for name in names), y, event) for i,(y,event) in enumerate(zip(outputs,events)))
with open("run-manifest.json", "w", encoding="utf-8") as handle:
    json.dump({"model":model, "summary":summary}, handle, ensure_ascii=False, indent=2)
print("Saved replications.csv and run-manifest.json")`

function rInputQuantile(input) {
  const {name,distribution:kind,a,b,c}=input
  let body
  if(kind==='constant') body=`rep(${a}, length(q))`
  else if(kind==='bernoulli') body=`as.numeric(q > 1-(${a}))`
  else if(kind==='uniform') body=`${a} + (${b}-(${a}))*q`
  else if(kind==='normal') body=`qnorm(q, ${a}, ${b})`
  else if(kind==='triangular') body=`span <- ${c}-(${a})\n  mode <- (${b}-(${a}))/span\n  ifelse(q < mode, ${a}+span*sqrt(q*mode), ${c}-span*sqrt((1-q)*(1-mode)))`
  else {
    const {prefix,expr}=rQuantile(input)
    body=prefix.split('\n').slice(1).filter(Boolean).concat(expr).join('\n  ')
  }
  return `input_quantile[[${JSON.stringify(name)}]] <- function(q) {\n  ${body}\n}`
}

export function rBuilderPlots(config, outputExpression) {
  const describe=v=>{
    const values=['a','b','c','d'].filter(k=>k in v).map(k=>Array.isArray(v[k])?'['+v[k].slice(0,6).join(', ')+(v[k].length>6?', …':'')+']':String(v[k]))
    return (v.label||v.name)+'\n'+v.distribution+'('+values.join(', ')+')'
  }
  const meta='input_meta <- list(\n'+config.inputs.map(v=>`  ${JSON.stringify(v.name)} = list(kind=${JSON.stringify(v.distribution)}, title=${JSON.stringify(describe(v))}, unit=${JSON.stringify(v.unit||'value')})`).join(',\n')+'\n)'
  return `# ---- Analysis figures (saved as PNG files when run with Rscript) ----
levels <- c(${percentileLevels.join(', ')})
cat("Percentiles\\n"); print(quantile(output, levels))
unit <- ${JSON.stringify(config.unit||'')}
output_label <- if (nzchar(unit)) paste0("Output (", unit, ")") else "Output"
threshold <- ${config.threshold}
discrete_kinds <- c(${discreteKinds.map(k=>JSON.stringify(k)).join(', ')})
input_quantile <- list()
${config.inputs.map(rInputQuantile).join('\n')}
${meta}
eval_output <- function(inputs) ${outputExpression}
save_plot <- function(file, width, height, draw) {
  if (interactive()) { draw(); return(invisible()) }
  png(file, width=width, height=height, res=110); draw(); invisible(dev.off()); cat("Saved", file, "\\n")
}
save_plot("input-distributions.png", 520*min(3, length(inputs)), 380*ceiling(length(inputs)/3) + 60, function() {
  par(mfrow=c(ceiling(length(inputs)/3), min(3, length(inputs))), mar=c(4.2, 4.2, 3.6, 1), oma=c(0, 0, 2, 0))
  for (name in names(inputs)) {
    x <- inputs[[name]]; info <- input_meta[[name]]; qf <- input_quantile[[name]]
    if (info$kind == "constant") {
      plot(x[1], 0, type="n", xlim=x[1]+c(-1,1), ylim=c(0,1), yaxt="n", xlab=info$unit, ylab="", main=info$title, cex.main=0.85)
      abline(v=x[1], lwd=3, col="steelblue")
    } else if (info$kind %in% discrete_kinds && length(unique(x)) <= 60) {
      observed <- table(x)/length(x)
      grid <- qf((seq_len(4000)-0.5)/4000); modelled <- table(grid)/4000
      plot(as.numeric(names(observed)), as.numeric(observed), type="h", lwd=8, col=adjustcolor("steelblue", 0.6), ylim=c(0, max(observed, modelled)*1.1),
        xlab=info$unit, ylab="Probability", main=info$title, cex.main=0.85)
      points(as.numeric(names(modelled)), as.numeric(modelled), pch=19, cex=0.7)
      legend("topright", c("Sampled", "Model"), col=c("steelblue", "black"), lwd=c(6, NA), pch=c(NA, 19), bty="n", cex=0.8)
    } else {
      lim <- quantile(x, c(0.005, 0.995), names=FALSE)
      if (lim[2] <= lim[1]) lim <- range(x) + c(0, 1e-9)
      inside <- x[x >= lim[1] & x <= lim[2]]
      h <- hist(inside, breaks=seq(lim[1], lim[2], length.out=41), plot=FALSE)
      p <- (seq_len(400)-0.5)/400; xq <- qf(p); keep <- diff(xq) > 0
      mids <- ((head(xq,-1)+tail(xq,-1))/2)[keep]; dens <- (diff(p)/diff(xq))[keep]
      keep <- is.finite(dens) & mids >= lim[1] & mids <= lim[2]
      top <- max(h$density, if (!(info$kind %in% discrete_kinds)) dens[keep] else 0)
      plot(h, freq=FALSE, col=adjustcolor("steelblue", 0.6), border="white", ylim=c(0, top*1.1), xlab=info$unit, ylab="Density", main=info$title, cex.main=0.85)
      if (!(info$kind %in% discrete_kinds)) lines(mids[keep], dens[keep], lwd=2)
      legend("topright", c("Sampled", "Model"), col=c("steelblue", "black"), lwd=c(6, 2), bty="n", cex=0.8)
    }
  }
  mtext("Input distributions", outer=TRUE, line=0.4, font=2)
})
save_plot("output-distribution.png", 1400, 480, function() {
  par(mfrow=c(1, 2), mar=c(4.2, 4.2, 3.6, 1))
  marks <- function(where) {
    abline(v=threshold, col="firebrick", lty=3, lwd=2); abline(v=mean(output), col="darkorange", lwd=2)
    legend(where, c(paste("Threshold", ${JSON.stringify(config.comparator)}, threshold), paste("Mean", signif(mean(output), 4))), col=c("firebrick", "darkorange"), lty=c(3, 1), lwd=2, bty="n", cex=0.8)
  }
  hist(output, breaks=30, col=adjustcolor("steelblue", 0.75), border="white", xlab=output_label, ylab="Replications",
    main=sprintf("Histogram · P(event) = %.2f%% (95%% CI %.2f%% – %.2f%%)", 100*prob, 100*probability_ci[1], 100*probability_ci[2]), cex.main=0.85)
  marks("topright")
  plot(ecdf(output), do.points=FALSE, verticals=TRUE, xlab=output_label, ylab="Cumulative fraction", main="Cumulative frequency", cex.main=0.85)
  marks("bottomright")
})
save_plot("convergence.png", 900, 450, function() {
  plot(seq_len(n), cumsum(output)/seq_len(n), type="l", xlab="Replications", ylab=paste("Running mean", if (nzchar(unit)) paste0("(", unit, ")") else ""), main="Convergence")
  abline(h=mean(output), col="darkorange", lty=3, lwd=2)
})
median_inputs <- lapply(input_quantile, function(f) f(0.5))
base <- eval_output(median_inputs)
bars <- do.call(rbind, lapply(names(inputs), function(name) {
  if (input_meta[[name]]$kind == "constant") return(NULL)
  ends <- sapply(c(0.1, 0.9), function(p) { varied <- median_inputs; varied[[name]] <- input_quantile[[name]](p); eval_output(varied) })
  if (!all(is.finite(ends))) return(NULL)
  data.frame(input=sub("\\n.*", "", input_meta[[name]]$title), low=min(ends), high=max(ends))
}))
if (!is.null(bars)) {
  bars$swing <- bars$high - bars$low
  bars <- bars[order(bars$swing), ]
  cat("Sensitivity (base output", signif(base, 6), ")\\n"); print(bars[rev(seq_len(nrow(bars))), ], row.names=FALSE)
  save_plot("sensitivity.png", 900, 140 + 50*nrow(bars), function() {
    par(mar=c(4.2, max(8, max(nchar(bars$input))*0.55), 3, 1))
    plot(range(bars$low, bars$high, base), c(0.5, nrow(bars)+0.5), type="n", yaxt="n", xlab=output_label, ylab="", main="Sensitivity (P10 to P90 of each input)")
    rect(bars$low, seq_len(nrow(bars))-0.35, bars$high, seq_len(nrow(bars))+0.35, col=adjustcolor("steelblue", 0.75), border=NA)
    axis(2, at=seq_len(nrow(bars)), labels=bars$input, las=1, cex.axis=0.8)
    abline(v=base, lty=3)
  })
}
write.csv(data.frame(replication=seq_len(n), as.data.frame(inputs), output=output, event=as.integer(event)), "replications.csv", row.names=FALSE)
cat("Saved replications.csv\\n")`
}
