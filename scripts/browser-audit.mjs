// Run against a served production dist, after npm run build.
import {chromium} from 'playwright'
import {readdir,mkdir,writeFile} from 'node:fs/promises'
import {cpus,platform,arch} from 'node:os'
import process from 'node:process'
const base=process.env.LAB_TEST_URL || 'http://127.0.0.1:4173'
const browser=await chromium.launch({channel:process.env.LAB_CHROME_CHANNEL || undefined})
try {
  const page=await browser.newPage({viewport:{width:1366,height:820}})
  await mkdir('docs/verification',{recursive:true})
  for(const [route,theme,width] of [['overview','light',1366],['builder','dark',1366],['pi','light',390],['inventory','dark',390]]) {
    await page.goto(base+'/#/'+route)
    await page.setViewportSize({width,height:820})
    await page.getByLabel('Color theme').selectOption(theme)
    await page.locator('.screen-'+route+' h1').waitFor()
    if(route==='inventory') {
      await page.getByRole('button',{name:'Run simulation'}).click()
      await page.getByRole('heading',{name:'Run results'}).waitFor()
    }
    if(route==='pi') await page.getByRole('button',{name:'Save run',exact:true}).waitFor()
    await page.screenshot({path:'docs/verification/'+route+'-'+theme+'.png'})
  }
  const workerFile=(await readdir('dist/assets')).find(name=>/^worker-.*\.js$/.test(name))
  if(!workerFile) throw Error('Build the current application before running this audit.')
  await page.goto(base)
  const cdp=await browser.newBrowserCDPSession()
  async function heap() {
    const {targetInfos}=await cdp.send('Target.getTargets')
    const target=targetInfos.find(t=>t.type==='worker'&&t.url.endsWith(workerFile))
    if(!target) return null
    const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId})
    try {
      const response=new Promise(resolve=>{
        const receive=event=>{
          const msg=JSON.parse(event.message)
          if(event.sessionId===sessionId&&msg.id===1){
            cdp.off('Target.receivedMessageFromTarget',receive)
            resolve(msg.result?.usedSize??null)
          }
        }
        cdp.on('Target.receivedMessageFromTarget',receive)
      })
      await cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:1,method:'Runtime.getHeapUsage'})})
      return await response
    } finally { await cdp.send('Target.detachFromTarget',{sessionId}) }
  }
  const rows=[]
  for(const n of [1000,10000,100000,1000000]){
    const runs=[]
    for(let i=0;i<20;i++){
      const run=await page.evaluate(async({n,workerFile})=>{
        const start=performance.now(),worker=new Worker('/assets/'+workerFile,{type:'module'})
        window.auditWorker=worker
        const delays=[]
        let last=start
        const timer=setInterval(()=>{const now=performance.now();delays.push(Math.max(0,now-last-8));last=now},8)
        try {
          const data=await new Promise((resolve,reject)=>{
            worker.onerror=e=>reject(Error(e.message))
            worker.onmessage=e=>{if(e.data.status==='error')reject(Error(e.data.message));if(e.data.status==='complete')resolve(e.data)}
            worker.postMessage({type:'start',model:{kind:'pi',seed:42,samples:n}})
          })
          return {elapsedMs:performance.now()-start,worstTimerDelayMs:Math.max(0,...delays),hits:data.hits}
        }finally{clearInterval(timer)}
      },{n,workerFile})
      run.heapBytes=await heap()
      await page.evaluate(()=>window.auditWorker.terminate())
      runs.push(run)
    }
    const p95=key=>runs.map(r=>r[key]).sort((a,b)=>a-b)[18]
    rows.push({samples:n,hits:runs[0].hits,p95JobMs:p95('elapsedMs'),p95WorkerHeapBytes:p95('heapBytes'),p95MaxMainTimerDelayMs:p95('worstTimerDelayMs')})
  }
  await mkdir('docs/benchmarks',{recursive:true})
  await writeFile('docs/benchmarks/pi-browser.json',JSON.stringify({date:new Date().toISOString(),browser:browser.version(),cpu:cpus()[0].model,platform:platform()+' '+arch(),method:'20 fresh dedicated workers per workload, seed 42, nearest-rank P95. Wall time includes worker startup and delivery of the final progress message. V8 heap is measured after completion, before worker termination, without forced GC. An 8 ms timer observes main-thread scheduling delay.',rows},null,2)+'\n')
} finally {await browser.close()}
