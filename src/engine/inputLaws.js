import {distributions, lawFor} from '../science/distributions.js'

// Version 1 projects store parameter slots a, b, c. The fourth slot is the
// upper truncation bound. A list-valued first slot is numeric in a compiled
// model and comma-separated editable text in the project document.
export const slotKeys = ['a','b','c','d']
export const isListLaw = kind => kind === 'empirical' || kind === 'categorical'
export const families = Object.fromEntries(Object.entries(distributions).map(([id,[title,fields,defaults]])=>[id,{title,fields,defaults}]))
const legacy = new Set(['constant','uniform','normal','triangular','bernoulli'])
const inverseLaws = new WeakMap()

export function inputLaw(input) {
  const {distribution:kind}=input
  if(!Object.hasOwn(families,kind)) throw Error('Choose a supported input distribution.')
  const params=families[kind].fields.map((_,i)=>input[slotKeys[i]])
  if(isListLaw(kind)){
    if(!Array.isArray(params[0]) || !params[0].length || params[0].length>256 || !params[0].every(Number.isFinite))
      throw Error('Enter between 1 and 256 finite numeric values.')
  } else if(!params.every(Number.isFinite)) throw Error('Enter finite numeric parameters.')
  if((kind==='uniform'||kind==='triangular')&&!Number.isFinite((kind==='uniform'?input.b:input.c)-input.a))
    throw Error('The input range must be finite.')
  const law=lawFor(kind,params)
  if(!law.undefinedMean && !Number.isFinite(law.mean)) throw Error('Distribution mean exceeds the supported numeric range.')
  return law
}
export function inputQuantile(input, probability) {
  let law=inverseLaws.get(input)
  if(!law){
    law=inputLaw(input)
    inverseLaws.set(input,law)
  }
  const value=law.inv(probability)
  if(!Number.isFinite(value)) throw Error('The '+input.name+' draw exceeded the numeric range. Adjust its distribution parameters.')
  return value
}
export const usesLegacyTransform = kind => legacy.has(kind)
export function typedSlot(kind, value) {
  const number=v=>v==null||String(v).trim()===''?NaN:Number(v)
  return isListLaw(kind) ? String(value??'').split(',').map(number) : number(value)
}
