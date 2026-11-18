import {notebook,pythonScript,rScript} from '../engine/export.js'
import {portable} from '../domains/newExports.js'
import {runBundle} from '../components/runBundle.js'
import {modelInfo} from './library.js'

export const formats={ipynb:'Colab / Jupyter notebook',py:'Python script',R:'R script',model:'Model JSON',json:'Run manifest',csv:'Summary CSV',zip:'Run bundle (ZIP)'}
export function availableFormats(entry){
  const analysis=entry.status==='complete'||!entry.status
  if(!entry.result)return analysis?['ipynb','py','R','model']:['model','json']
  return analysis?Object.keys(formats):['json','csv','model']
}
export function manifest(entry) {
  const info=modelInfo(entry.model)
  return {schemaVersion:1,engineVersion:entry.engineVersion??info.engine,runId:entry.id,source:entry.source,sourceId:entry.sourceId??null,
    title:entry.title??info.title,metric:info.metric,unit:info.unit??null,intervalMethod:info.method,confidenceLevel:.95,
    status:entry.status??'draft',startedAt:entry.startedAt??null,finishedAt:entry.finishedAt??null,
    model:entry.model,summary:entry.result??null,error:entry.error??null}
}

function csvCell(x){
  if(x==null)return ''
  if(typeof x==='number')return String(x)
  const val=String(x)
  const safe=/^\s*[=+@-]/.test(val)?"'"+val:val
  return '"'+safe.replaceAll('"','""')+'"'
}
function summaryCsv(entry,doc) {
  const r=entry.result
  const columns=['title','metric','unit','engine','status','seed','requested','completed','estimate','interval_method','confidence_level','lower95','upper95','hits','probability','event_wilson95_low','event_wilson95_high']
  const values=[doc.title,doc.metric,doc.unit,doc.engineVersion,entry.status,entry.model.seed,entry.model.samples,r.n,r.mean,doc.intervalMethod,.95,...(r.interval??[null,null]),r.hits,r.probability,...(r.probabilityCI??[null,null])]
  return columns.join(',')+'\n'+values.map(csvCell).join(',')+'\n'
}

export function artifact(entry,format){
  if(!availableFormats(entry).includes(format))throw Error('Choose a file type available for this run.')
  const m=entry.model,doc=manifest(entry),name=(m.kind??m.id)+'-'+m.seed+'-'+(entry.result?.n??m.samples)
  const code=type=>m.kind?(type==='ipynb'?JSON.stringify(notebook(m),null,2):type==='py'?pythonScript(m):rScript(m)):portable(m)[type]
  if(format==='zip')return {name:name+'.zip',mime:'application/zip',data:runBundle({model:m,manifest:doc,summary:entry.result,notebook:JSON.parse(code('ipynb'))}),preview:'model.json\nrun-manifest.json\nsummary.json\nanalysis.ipynb'}
  if(format==='model'||format==='json'){
    const data=JSON.stringify(format==='model'?m:doc,null,2)
    return {name:name+(format==='model'?'-model':'-run')+'.json',mime:'application/json',data,preview:data}
  }
  if(format==='csv'){
    const data=summaryCsv(entry,doc)
    return {name:name+'.csv',mime:'text/csv',data,preview:data}
  }
  const data=code(format)
  let preview=data
  if(format==='ipynb'){
    const nb=JSON.parse(data)
    preview=nb.cells.map((cell,i)=>{
      const source=Array.isArray(cell.source)?cell.source.join(''):cell.source
      return (i+1)+'. '+(cell.cell_type==='markdown'?'Text':'Python')+' · '+source.split('\n').find(Boolean)
    }).join('\n')
  }
  return {name:name+'.'+format,mime:format==='ipynb'?'application/x-ipynb+json':'text/plain',data,preview}
}
