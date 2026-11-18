import {useSyncExternalStore} from 'react'

const key='mc-precision'
const digits=new Set(['4','6','8'])
function read(key,fallback){
  try{return localStorage.getItem(key)??fallback}catch{return fallback}
}
function write(key,value){
  try{localStorage.setItem(key,value)}catch{/* In-memory preferences remain active for this visit. */}
  window.dispatchEvent(new Event('mc-preferences'))
}
function subscribe(callback){
  window.addEventListener('mc-preferences',callback)
  window.addEventListener('storage',callback)
  return ()=>{window.removeEventListener('mc-preferences',callback);window.removeEventListener('storage',callback)}
}
function readPrecision(){const value=read(key,'default');return digits.has(value)?value:'default'}
let precision=readPrecision()
export function setPrecision(value){
  precision=digits.has(value)?value:'default'
  write(key,precision)
}
export function usePrecision(){return useSyncExternalStore(subscribe,()=>precision)}
let theme=document.documentElement.dataset.theme||'system'
function applyTheme(value){
  theme=['light','dark'].includes(value)?value:'system'
  if(theme==='system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme=theme
}
export function setTheme(value){
  applyTheme(value)
  write('mc-theme',theme)
}
export function useTheme(){return useSyncExternalStore(subscribe,()=>theme)}
window.addEventListener('storage',e=>{
  if(e.key===key||e.key===null) precision=readPrecision()
  if(e.key==='mc-theme'||e.key===null) applyTheme(read('mc-theme','system'))
})
const formatters=Object.fromEntries([...digits].map(d=>[d,new Intl.NumberFormat(undefined,{maximumSignificantDigits:Number(d)})]))
export function resultNumber(value,fallback){
  if(Number.isFinite(value)&&formatters[precision]) return formatters[precision].format(value)
  return fallback(value)
}
