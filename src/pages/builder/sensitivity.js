import {parseFormula, evaluate} from '../../engine/formula.js'
import {inputQuantile} from '../../engine/inputLaws.js'

// One-at-a-time (OAT) sensitivity. Each varying input is swept from its 10th to
// its 90th percentile while every other input is held at its median, measuring
// how far the model output swings. Constant inputs contribute no uncertainty.
export function computeSensitivity(model) {
  if (!model?.inputs?.length || !model.expression) return null
  const names = model.inputs.map(i => i.name)
  let tree
  try { tree = parseFormula(model.expression, names) } catch { return null }
  const median = {}
  for (const input of model.inputs) {
    try { median[input.name] = input.distribution === 'constant' ? input.a : inputQuantile(input, 0.5) }
    catch { return null }
  }
  let base
  try { base = evaluate(tree, median) } catch { return null }
  const bars = []
  for (const input of model.inputs) {
    if (input.distribution === 'constant') continue
    try {
      const low = evaluate(tree, {...median, [input.name]: inputQuantile(input, 0.1)})
      const high = evaluate(tree, {...median, [input.name]: inputQuantile(input, 0.9)})
      const lo = Math.min(low, high), hi = Math.max(low, high)
      bars.push({name: input.name, label: input.label || input.name, lo, hi, swing: hi - lo})
    } catch { /* skip an input that produces a nonfinite output */ }
  }
  if (!bars.length) return null
  bars.sort((a, b) => b.swing - a.swing)
  const lo = Math.min(base, ...bars.map(b => b.lo))
  const hi = Math.max(base, ...bars.map(b => b.hi))
  return {base, bars, domain: [lo, hi]}
}
