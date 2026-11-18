import { experiment } from './newExamples.js'
let running=false, job, config, completed=0, timer, lastReport=0
function batch(){
  if(!running) return
  try {
    const deadline=performance.now()+24
    do { completed=job.step(4) } while(completed<config.samples && performance.now()<deadline)
    if(completed===config.samples){running=false;self.postMessage({status:'complete',result:job.result()})}
    else {
      if(performance.now()-lastReport>=80){
        self.postMessage({status:'running',n:completed})
        lastReport=performance.now()
      }
      timer=setTimeout(batch,0)
    }
  }catch(error){running=false;self.postMessage({status:'failed',message:error.message})}
}
self.onmessage=({data})=>{
  if(data.type==='start'){
    try{config=data.config;job=experiment(config);running=true;batch()}
    catch(error){self.postMessage({status:'failed',message:error.message})}
  }else if(data.type==='pause'){running=false;clearTimeout(timer);self.postMessage({status:'paused',n:completed})}
  else if(data.type==='cancel'){
    running=false
    clearTimeout(timer)
    self.postMessage({status:'cancelled',result:completed?job.result():null,n:completed})
  }
  else if(data.type==='resume'&&!running){running=true;batch()}
}
