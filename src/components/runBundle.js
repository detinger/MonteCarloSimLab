import {strToU8,zipSync} from 'fflate'

export function runBundle({model,manifest,summary,notebook}) {
  const files={'model.json':model,'run-manifest.json':manifest,'summary.json':summary}
  if(notebook) files['analysis.ipynb']=notebook
  return zipSync(Object.fromEntries(Object.entries(files).map(([name,content])=>[name,strToU8(JSON.stringify(content,null,2))])),{level:4})
}
export function downloadRunBundle(config) {
  const url=URL.createObjectURL(new Blob([runBundle(config)],{type:'application/zip'}))
  const a=document.createElement('a')
  a.href=url
  a.download=(config.name||'experiment').replace(/[^A-Za-z0-9_-]+/g,'-')+'.zip'
  a.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
