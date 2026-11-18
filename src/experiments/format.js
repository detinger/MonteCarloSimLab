import {modelInfo} from './library.js'
export const fmt=v=>Number.isFinite(v)?Number(v.toPrecision(6)).toLocaleString(undefined,{maximumSignificantDigits:6}):'—'
export function entryLabel(entry) {
  const info=modelInfo(entry.model)
  return (entry.title||info.title)+(entry.result?' · seed '+entry.model.seed+' · n '+entry.result.n.toLocaleString():'')+
    (entry.source==='Runner history'?' · '+new Date(entry.finishedAt).toLocaleTimeString():'')
}
