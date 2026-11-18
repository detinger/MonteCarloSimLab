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
    categorical:'findInterval(q, cumsum(weights)/sum(weights), left.open=TRUE)+1L',
    empirical:'sort(observations)[ceiling(q*length(observations))]',
  }[distribution]
  if(!expr) throw Error('Unsupported portable distribution.')
  const list=distribution==='categorical'?'weights':distribution==='empirical'?'observations':null
  return {prefix:prefix+(list?list+' <- c('+a.join(',')+')\n':''),expr}
}
