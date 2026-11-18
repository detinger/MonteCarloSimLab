import {isDomain, domainErrors, compileDomain, domainReplication, describeOutputs, quantile, walkSummary} from './domains.js'
import {parseFormula, dimensions, evaluate, reservedNames} from './formula.js'
import {philox, streamId} from './rng.js'
import {inputLaw,inputQuantile} from './inputLaws.js'

export const ENGINE_VERSION = 'philox2x32-10/v1'
export const MAX_SAMPLES = 1000000
export const comparators = ['>', '>=', '<', '<=']

// Version-one projects without an explicit comparison counted strict exceedances.
export function eventOccurs(value,model) {
  switch (model.comparator) {
    case undefined:
    case '>': return value > model.threshold
    case '>=': return value >= model.threshold
    case '<': return value < model.threshold
    case '<=': return value <= model.threshold
    default: throw Error('Choose a supported threshold comparison.')
  }
}
const TWO32 = 4294967296

export function validate(model) {
  if (!model || (!isDomain(model.kind) && !['pi','builder'].includes(model.kind))) return ['Choose a supported experiment.']
  const errors = []
  if (!Number.isInteger(model.seed) || model.seed < 0 || model.seed >= TWO32) errors.push('Seed must be a whole number from 0 to 4294967295.')
  if (!Number.isInteger(model.samples) || model.samples < 1 || model.samples > MAX_SAMPLES) errors.push('Enter 1 to 1,000,000 replications.')
  if (isDomain(model.kind)) return [...errors,...domainErrors(model)]
  if (model.kind === 'pi') return errors
  if (typeof model.question !== 'string' || !model.question.trim()) errors.push('Enter a question for this model.')
  if (model.comparator !== undefined && !comparators.includes(model.comparator)) errors.push('Choose >, ≥, < or ≤ for the threshold event.')
  if (!Number.isFinite(model.threshold)) errors.push('Enter a finite threshold.')
  if (!Array.isArray(model.inputs) || !model.inputs.length || model.inputs.length > 64) return [...errors, 'Define between 1 and 64 inputs.']
  const streams = new Set()
  for (const input of model.inputs) {
    if (!input || typeof input.name !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(input.name)) {
      errors.push('Use input names beginning with a letter, up to 64 letters, numbers or underscores.')
      continue
    }
    const {name} = input
    if (reservedNames.includes(name)) errors.push(name+' is a formula function. Choose another input name.')
    const stream = streamId('builder/' + name)
    if (streams.has(stream)) errors.push('Choose a unique name for ' + name + '.')
    streams.add(stream)
    try { inputLaw(input) } catch(error) { errors.push(name+' · '+error.message) }
  }
  try {
    const ast = parseFormula(model.expression, model.inputs.map(i => i?.name).filter(Boolean))
    dimensions(ast, model.inputs)
    checkDomain(ast, Object.fromEntries(model.inputs.filter(i=>i?.distribution==='constant').map(i=>[i.name,i.a])))
  } catch (e) { errors.push(e.message) }
  return errors
}

function checkDomain(node,constants) {
  if (node.op === 'ref') return Object.hasOwn(constants,node.name) ? constants[node.name] : undefined
  if (node.op === 'num') return node.value
  const operand = node.left ? checkDomain(node.left,constants) : checkDomain(node.value,constants)
  const right = node.right ? checkDomain(node.right,constants) : undefined
  if(node.op==='/' && right===0) throw Error('The formula divides by zero.')
  if(node.op==='log' && operand<=0) throw Error('Log requires a positive argument.')
  if(node.op==='sqrt' && operand<0) throw Error('Square root requires a nonnegative argument.')
  if(operand===undefined || (node.right && right===undefined)) return undefined
  const value=evaluate(node,constants)
  if(!Number.isFinite(value))throw Error('A fixed formula component exceeds the real finite numeric range.')
  return value
}

export function compile(model) {
  const errors = validate(model)
  if (errors.length) throw Error(errors.join(' '))
  if (isDomain(model.kind)) return compileDomain(model)
  if (model.kind === 'pi') return {...model, stream:streamId('pi/coordinates')}
  return {...model, comparator:model.comparator ?? '>', ast:parseFormula(model.expression,model.inputs.map(i => i.name)),
    inputs:model.inputs.map(i => ({...i,stream:streamId('builder/' + i.name)}))}
}

export function sample(input, index, seed) {
  const {distribution, a, b, c} = input
  if (distribution === 'constant') return a
  const [first,second] = philox(index,input.stream,seed)
  const u = first/TWO32
  switch (distribution) {
    case 'uniform': return a + (b-a)*u
    case 'bernoulli': return Number(u < a)
    case 'normal': return a + b*Math.sqrt(-2*Math.log1p(-u))*Math.cos(2*Math.PI*second/TWO32)
    case 'triangular': {
      const mode = (b-a)/(c-a)
      return u < mode ? a + (c-a)*Math.sqrt(u*mode) : c - (c-a)*Math.sqrt((1-u)*(1-mode))
    }
    default: return inputQuantile(input,(first+0.5)/TWO32)
  }
}

export function wilson(hits,n) {
  if (!n) return null
  const z = 1.959963984540054
  const p = hits/n
  const d = 1+z*z/n
  const center = (p+z*z/(2*n))/d
  const radius = z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/d
  return [hits === 0 ? 0 : center-radius, hits === n ? 1 : center+radius]
}

// Two-sided .95 t interval. Tabulated through 30 df; the three-term
// Cornish–Fisher expansion for df > 30 is accurate within 0.000002.
export function criticalT(df) {
  const table = [0,12.706205,4.302653,3.182446,2.776445,2.570582,2.446912,2.364624,2.306004,2.262157,2.228139,2.200985,2.178813,2.160369,2.144787,2.131450,2.119905,2.109816,2.100922,2.093024,2.085963,2.079614,2.073873,2.068658,2.063899,2.059539,2.055529,2.051831,2.048407,2.045230,2.042272]
  if (df <= 30) return table[df]
  const z = 1.959963984540054
  return z + (z**3+z)/(4*df) + (5*z**5+16*z**3+3*z)/(96*df**2) + (3*z**7+19*z**5+17*z**3-15*z)/(384*df**3)
}

export function createExperiment(model) {
  const config = compile(model)
  const points = [], trace = [], convergence = [], values = [], paths = [], bands = []
  const domain = isDomain(config.kind)
  const walk = {endpoints:[],msd:[]}
  let under120 = 0
  const criticalCounts = Object.create(null)
  let n = 0, mean = 0, sumSquares = 0, hits = 0
  const stride = Math.ceil(config.samples/128)
  function advance(count) {
    const end = Math.min(config.samples,n+count)
    while (n < end) {
      let inputs, output, event
      if (config.kind === 'pi') {
        const [a,b] = philox(n,config.stream,config.seed)
        const x = 2*a/TWO32-1, y = 2*b/TWO32-1
        event = x*x+y*y <= 1
        output = event ? 4 : 0
        if (points.length < 2048) points.push({x,y,inside:event})
        if (trace.length < 32) inputs = {x,y}
      } else if (domain) {
        const row = domainReplication(config,n,paths,bands,walk)
        inputs = row.inputs
        output = row.output
        event = row.event
        values.push(output)
        if (config.kind === 'projectmgmt') {
          if(output<=120) under120++
          for(const id of row.critical) criticalCounts[id]=(criticalCounts[id]??0)+1
        }
        if (config.kind === 'integration' && points.length < 256) points.push(inputs)
      } else {
        inputs = Object.create(null)
        for (const input of config.inputs) inputs[input.name] = sample(input,n,config.seed)
        try { output = evaluate(config.ast,inputs) } catch (error) {
          throw Error(error.message+' Check replication '+(n+1)+' and the input ranges.')
        }
        event = eventOccurs(output,config)
      }
      n++
      hits += Number(event)
      const delta = output - mean
      mean += delta/n
      sumSquares += delta*(output-mean)
      if (!Number.isFinite(sumSquares)) throw Error('Variance exceeded the numeric range. Rescale model inputs.')
      if (trace.length < 32) trace.push({index:n,inputs,output,event})
      if (n === 1 || n%stride === 0 || n === config.samples) convergence.push({n,mean:config.kind === 'pi' ? 4*hits/n : mean})
    }
    return n
  }
  function summary() {
    const probabilityCI = wilson(hits,n)
    const sd = n > 1 ? Math.sqrt(sumSquares/(n-1)) : null
    const se = n > 1 ? sd/Math.sqrt(n) : null
    const radius = n > 1 ? criticalT(n-1)*se : null
    const meanCI = config.kind === 'montyhall' ? probabilityCI : config.kind === 'pi' ? probabilityCI?.map(x => 4*x) ?? null : radius === null ? null : [mean-radius, mean+radius]
    const analysis = domain && n === config.samples ? {...describeOutputs(values),under120,criticalCounts,outcomes:values,
      ...(config.kind==='randomwalk'?{walk:walkSummary(walk)}:{}),
      bands:bands.map(({day,prices})=>{
        const ordered=[...prices].sort((a,b)=>a-b)
        return {day,quantiles:[.05,.25,.5,.75,.95].map(p=>quantile(ordered,p))}
      })} : {}
    return {...analysis,paths,n,hits,mean: n ? (config.kind === 'pi' ? 4*hits/n : mean) : null,sd,se,meanCI,probability:n ? hits/n : null,probabilityCI,points:[...points],trace:[...trace],convergence:[...convergence]}
  }
  return {advance,summary}
}
