export function gbmStep(price, drift, volatility, years, standardNormal) {
  const logChange = (drift - volatility * volatility / 2) * years
    + volatility * Math.sqrt(years) * standardNormal
  return price * Math.exp(logChange)
}
