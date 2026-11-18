import {parseFormula,dimensions} from '../../engine/formula.js'

const lexemes=/\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|[A-Za-z][A-Za-z0-9_]*|[^\s]/g

export function dependencies(source,names) {
  return [...new Set((source.match(lexemes)||[]).filter(token=>names.includes(token)))]
}

// Inline scalar formulas only after validating the complete DAG, including
// disconnected nodes. Random inputs remain symbolic references to one draw.
export function resolveRelations(draft) {
  const relations=draft.relations||[]
  const byName=new Map(relations.map(v=>[v.name,v]))
  const inputs=draft.inputs.map(v=>({...v,unit:v.unit??draft.unit}))
  const names=[...inputs.map(v=>v.name),...byName.keys()]
  const visiting=new Set(),cache=new Map()
  function expand(source, unit, label) {
    parseFormula(source,names)
    let expanded=''
    for(const token of source.match(lexemes)||[]) {
      expanded+=(byName.has(token)?'('+resolve(token)+')':token)+' '
      if(expanded.length>4096) throw Error(label+' expands beyond 4,096 characters. Simplify the formula.')
    }
    const ast=parseFormula(expanded,inputs.map(i=>i.name))
    const powers=dimensions(ast,inputs)
    if(unit && powers && (powers.size!==1 || powers.get(unit)!==1)) {
      const inferred=[...powers].map(([u,p])=>p===1?u:u+'^'+p).join('*') || 'dimensionless'
      if(inferred!==unit) throw Error(label+' has calculated unit '+inferred+'. Update the declared unit or the formula.')
    }
    return expanded.trim()
  }
  function resolve(name) {
    if(visiting.has(name)) throw Error('Cycle at '+name+'. Remove its reference to an upstream formula that already depends on it.')
    if(cache.has(name)) return cache.get(name)
    visiting.add(name)
    const node=byName.get(name)
    const text=expand(node.expression,node.unit,node.label||name)
    visiting.delete(name);cache.set(name,text)
    return text
  }
  try {
    for(const name of byName.keys()) resolve(name)
    const expression=expand(draft.expression,draft.unit,'Model output')
    return {expression:relations.length?expression:draft.expression,error:''}
  } catch(e){return {expression:'',error:e.message}}
}
