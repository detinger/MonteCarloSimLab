// Keep the latest completed run per model family available while navigating.
// Large trajectory arrays stay with the originating lab.
const latest=new Map()
export const runsChanged='mc-run-results-changed'
export function compactResult(result) {
  const interval=result.meanCI??result.interval??null
  return {n:result.n,mean:result.mean??null,interval,hits:result.hits??null,
    probability:result.probability??null,probabilityCI:result.probabilityCI??null,
    sd:result.sd??null,se:result.se??null,reference:result.reference??null,
    convergence:result.convergence??[],quantiles:result.quantiles??null,totals:result.totals??null}
}
export function captureCompleted(model,result) {
  if(result.n!==model.samples)return
  const family=model.kind??model.id
  const entry={id:'live-'+family,model:structuredClone(model),result:compactResult(result),status:'complete',
    finishedAt:new Date().toISOString(),source:'Current session'}
  latest.set(family,entry)
  window.dispatchEvent(new Event(runsChanged))
}
export function sessionRuns(){return [...latest.values()]}
