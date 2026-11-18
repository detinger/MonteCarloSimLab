import {createExperiment} from './index.js'

let experiment, samples, timer
let status = 'idle'

function publish() { self.postMessage({...experiment.summary(),status}) }
function fail(error) {
  status = 'error'
  self.postMessage({status,message:error.message})
}
function batch() {
  if (status !== 'running') return
  try {
    const until = performance.now()+20
    let n
    do { n = experiment.advance(128) } while (n < samples && performance.now() < until)
    if (n === samples) status = 'complete'
    publish()
    if (status === 'running') timer = setTimeout(batch,0)
  } catch (error) { fail(error) }
}
self.onmessage = ({data}) => {
  try {
    if (data.type === 'start') {
      experiment = createExperiment(data.model)
      samples = data.model.samples
      status = 'running'
      publish()
      timer = setTimeout(batch,0)
    } else if (data.type === 'pause' && status === 'running') {
      clearTimeout(timer)
      status = 'paused'
      publish()
    } else if (data.type === 'resume' && status === 'paused') {
      status = 'running'
      batch()
    } else if (data.type === 'cancel' && ['running','paused'].includes(status)) {
      clearTimeout(timer)
      status = 'cancelled'
      publish()
    }
  } catch (error) { fail(error) }
}
