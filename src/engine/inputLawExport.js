// These branches receive validated numeric model parameters only. Python and
// R use the same midpoint uniform as the browser for inverse-CDF families.
export const pythonQuantiles = `def quantile_draw(kind, node, q):
    from scipy import special
    a, b = node["a"], node.get("b")
    if kind == "discrete":
        return min(b, a + math.floor(q*(b-a+1)))
    if kind == "binomial":
        from scipy.stats import binom
        return float(binom.ppf(q, a, b))
    if kind == "poisson":
        from scipy.stats import poisson
        return float(poisson.ppf(q, a))
    if kind == "categorical":
        total, cumulative = sum(a), 0.0
        for category, weight in enumerate(a, 1):
            cumulative += weight
            if q <= cumulative/total:
                return category
        return len(a)
    if kind == "empirical":
        return sorted(a)[math.ceil(q*len(a))-1]
    if kind == "lognormal":
        return math.exp(a + b*special.ndtri(q))
    if kind == "exponential":
        return -math.log1p(-q)/a
    if kind == "truncated":
        lower = special.ndtr((node["c"]-a)/b)
        upper = special.ndtr((node["d"]-a)/b)
        return a + b*special.ndtri(lower + q*(upper-lower))
    if kind == "beta":
        return float(special.betaincinv(a,b,q))
    if kind == "gamma":
        return float(b*special.gammaincinv(a,q))
    if kind == "weibull":
        return b*(-math.log1p(-q))**(1/a)
    if kind == "geometric":
        return 0 if a == 1 else max(0, math.ceil(math.log1p(-q)/math.log1p(-a)) - 1)
    if kind == "negbinomial":
        from scipy.stats import nbinom
        return 0 if b == 1 else float(nbinom.ppf(q, a, b))
    if kind == "hypergeometric":
        N, K, n = int(a), int(b), int(node["c"])
        def log_choose(x, y):
            return math.lgamma(x+1) - math.lgamma(y+1) - math.lgamma(x-y+1)
        values = range(max(0, n+K-N), min(n, K)+1)
        masses = [math.exp(log_choose(K, k) + log_choose(N-K, n-k) - log_choose(N, n)) for k in values]
        total, cumulative = sum(masses), 0.0
        for k, mass in zip(values, masses):
            cumulative += mass
            if q <= cumulative/total:
                return k
        return values[-1]
    if kind == "logistic":
        return a + b*math.log(q/(1-q))
    if kind == "cauchy":
        return a + b*math.tan(math.pi*(q-0.5))
    if kind == "minextreme":
        return a + b*math.log(-math.log1p(-q))
    raise ValueError("Unsupported input distribution")`

export function rQuantile(input) {
  const {distribution,a,b,c,d}=input
  // All numbers and array entries have passed inputLaw's validation.
  const prefix='q <- d$u + 0.5/2^32\n'
  const expr={
    discrete:`pmin(${b}, ${a} + floor(q*(${b}-(${a})+1)))`,
    binomial:`qbinom(q, size=${a}, prob=${b})`,
    poisson:`qpois(q, lambda=${a})`,
    lognormal:`qlnorm(q, meanlog=${a}, sdlog=${b})`,
    exponential:`qexp(q, rate=${a})`,
    beta:`qbeta(q, shape1=${a}, shape2=${b})`,
    gamma:`qgamma(q, shape=${a}, scale=${b})`,
    weibull:`qweibull(q, shape=${a}, scale=${b})`,
    truncated:`qnorm(pnorm(${c},${a},${b}) + q*(pnorm(${d},${a},${b}) - pnorm(${c},${a},${b})), ${a}, ${b})`,
    geometric:a===1?'0*q':`pmax(0, ceiling(log1p(-q)/log1p(-(${a}))) - 1)`,
    negbinomial:b===1?'0*q':`qnbinom(q, size=${a}, prob=${b})`,
    hypergeometric:'hyper_k[findInterval(q, cumsum(hyper_m)/sum(hyper_m), left.open=TRUE)+1L]',
    logistic:`${a} + ${b}*log(q/(1-q))`,
    cauchy:`${a} + ${b}*tan(pi*(q-0.5))`,
    minextreme:`${a} + ${b}*log(-log1p(-q))`,
    categorical:'findInterval(q, cumsum(weights)/sum(weights), left.open=TRUE)+1L',
    empirical:'sort(observations)[ceiling(q*length(observations))]',
  }[distribution]
  if(!expr) throw Error('Unsupported portable distribution.')
  const list=distribution==='categorical'?'weights':distribution==='empirical'?'observations':null
  const hyper=distribution==='hypergeometric'
    ? `hyper_k <- max(0, ${c}+${b}-${a}):min(${c}, ${b})\nhyper_m <- exp(lchoose(${b}, hyper_k) + lchoose(${a}-${b}, ${c}-hyper_k) - lchoose(${a}, ${c}))\n` : ''
  return {prefix:prefix+(list?list+' <- c('+a.join(',')+')\n':'')+hyper,expr}
}
