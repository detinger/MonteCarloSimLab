import {analyze} from './analyze.js'
self.onmessage=({data})=>{
  try {self.postMessage({result:analyze(data.base,data.alt,n=>self.postMessage({n}),data.coupling)})}
  catch(error) {self.postMessage({error:error.message})}
}
