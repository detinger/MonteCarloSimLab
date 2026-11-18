import {captureCompleted} from '../experiments/snapshots.js'

export function startRun(model, onUpdate, onError, {capture=true}={}) {
  const worker = new Worker(new URL('./worker.js', import.meta.url), {type:'module'})
  let closed = false
  function stop() {
    closed = true
    worker.terminate()
  }
  worker.onmessage = ({data}) => {
    if (closed) return
    if (data.status === 'error') {
      stop()
      onError(data.message)
      return
    }
    if (data.status === 'complete' || data.status === 'cancelled') stop()
    if (capture && data.status === 'complete') captureCompleted(model,data)
    onUpdate(data)
  }
  worker.onerror = event => {
    stop()
    onError(event.message || 'The simulation worker stopped unexpectedly.')
  }
  function command(type) { if (!closed) worker.postMessage({type}) }
  worker.postMessage({type:'start',model})
  return {pause:() => command('pause'), resume:() => command('resume'), cancel:() => command('cancel'), dispose:stop}
}
