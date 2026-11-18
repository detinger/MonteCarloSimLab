import {previewDistribution} from './distributions.js'

self.onmessage=({data})=>{
  try {self.postMessage({result:previewDistribution(data.kind,data.fields,data.seed,data.n)})}
  catch(error){self.postMessage({error:error.message})}
}
