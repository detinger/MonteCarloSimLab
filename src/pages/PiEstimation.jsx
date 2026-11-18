import {resultNumber} from '../components/preferences'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FolderOpen, Pause, Play, RotateCcw, Save, Square, Upload } from 'lucide-react'
import { downloadRunBundle } from '../components/runBundle'
import CodeExporter from '../components/CodeExporter'
import { Latex } from '../components/ui/Latex'
import { ENGINE_VERSION, validate } from '../engine/index.js'
import { startRun } from '../engine/client.js'
import { pythonScript, rScript, notebook } from '../engine/export.js'
import { Dartboard, Convergence } from './PiPlots'
import { downloadPiFile, initialPiModel, piBundle, piModelFromFields, readPiBundle, savedPiRun } from './piSession'
import '../styles/pi.css'

const count = new Intl.NumberFormat().format
const decimal = (n, precision = 4) => resultNumber(n,v=>Number.isFinite(v) ? v.toFixed(precision) : '—')

export default function PiEstimation() {
  const [seed, setSeed] = useState(String(initialPiModel.seed))
  const [samples, setSamples] = useState(String(initialPiModel.samples))
  const [run, setRun] = useState(null)
  const [previousRun, setPreviousRun] = useState(null)
  const [overlay, setOverlay] = useState(false)
  const lastComplete = useRef(null)
  const [notice, setNotice] = useState('')
  const [opening, setOpening] = useState(false)
  const [exportKind, setExportKind] = useState('ipynb')
  const [codeOpen, setCodeOpen] = useState(false)
  const job = useRef(null)
  const generation = useRef(0)
  const fileInput = useRef(null)
  const plot = useRef(null)
  const model = piModelFromFields(seed, samples)
  const issues = validate(model)
  const result = run?.result
  const status = run?.status ?? 'ready'
  const active = status === 'running' || status === 'paused'
  const complete = status === 'complete'
  const earlier = run && (run.model.seed !== model.seed || run.model.samples !== model.samples)
  const exportable = complete && result?.n === run.model.samples

  const begin = useCallback((snapshot, expectedHits) => {
    const id = ++generation.current
    job.current?.dispose()
    setNotice('')
    setPreviousRun(lastComplete.current)
    setRun({ model: snapshot, status: 'running', result: null })
    const fail = message => {
      if (generation.current !== id) return
      setNotice(String(message))
      setRun(previous => ({ ...previous, status: 'failed' }))
    }
    try {
      job.current = startRun(snapshot, update => {
        if (generation.current !== id) return
        if (update.status === 'complete' && expectedHits !== undefined) {
          if (expectedHits !== update.hits) {
            fail('The replay differs from the saved hit count. Check the run file and engine version.')
            return
          }
          setNotice('Reopened run. Replay reproduced the saved hit count.')
        }
        const currentRun = { model: snapshot, status: update.status, result: update }
        if (update.status === 'complete') lastComplete.current = currentRun
        setRun(currentRun)
      }, fail)
    } catch (error) {
      fail(error.message)
    }
  }, [])

  useEffect(() => {
    begin(initialPiModel)
    return () => {
      job.current?.dispose()
    }
  }, [begin])

  async function reopen(file) {
    setOpening(true)
    try {
      if (file && file.size > 65536) throw new Error('Choose a Pi run JSON file smaller than 64 KiB.')
      const data = file ? JSON.parse(await file.text()) : await savedPiRun('open')
      if (!data) throw new Error('No saved Pi run on this device. Complete a run and choose Save run.')
      const saved = readPiBundle(data)
      setSeed(String(saved.model.seed))
      setSamples(String(saved.model.samples))
      begin(saved.model, saved.hits)
    } catch (error) {
      setNotice(error instanceof SyntaxError ? 'The selected file contains invalid JSON.' : error.message)
    } finally {
      setOpening(false)
    }
  }

  async function save() {
    try {
      await savedPiRun('save', piBundle(run.model, result))
      setNotice('Saved as the latest Pi run on this device.')
    } catch (error) {
      setNotice(`Could not save on this device. ${error.message} Download the run JSON to keep a copy.`)
    }
  }

  function download() {
    try {
      let content
      let mime = 'text/plain'
      switch (exportKind) {
        case 'zip': {
          const manifest = piBundle(run.model, result)
          return downloadRunBundle({name:'estimating-pi-'+run.model.seed,model:run.model,manifest,
            summary:{...manifest.result, convergence:result.convergence},notebook:notebook(run.model)})
        }
        case 'png': {
          const original = plot.current.querySelector('canvas')
          const snapshot = document.createElement('canvas')
          snapshot.width = 550
          snapshot.height = 580
          const ctx = snapshot.getContext('2d')
          const style = getComputedStyle(original)
          ctx.fillStyle = style.getPropertyValue('--bg-elevated').trim()
          ctx.fillRect(0, 0, 550, 580)
          ctx.fillStyle = style.getPropertyValue('--text').trim()
          ctx.font = '20px system-ui'
          ctx.fillText('Estimating Pi · dart coordinates', 24, 34)
          ctx.font = '14px system-ui'
          ctx.fillText('Seed '+run.model.seed+' · '+count(result.n)+' darts · estimate '+decimal(result.mean,5),24,58)
          ctx.drawImage(original,40,70)
          ctx.fillText('Circles · inside     Squares · outside',24,555)
          const link = document.createElement('a')
          link.download = 'estimating-pi-'+run.model.seed+'.png'
          link.href = snapshot.toDataURL('image/png')
          link.click()
          return
        }
        case 'json': content = JSON.stringify(piBundle(run.model, result), null, 2); mime = 'application/json'; break
        case 'ipynb': content = JSON.stringify(notebook(run.model), null, 2); mime = 'application/x-ipynb+json'; break
        case 'py': content = pythonScript(run.model); break
        case 'R': content = rScript(run.model); break
        case 'csv': {
          const fields = ['seed', 'completed_darts', 'hits', 'pi_estimate', 'scaled_wilson_95_lower', 'scaled_wilson_95_upper']
          content = [fields.join(','), [run.model.seed, result.n, result.hits, result.mean, ...result.meanCI].join(',')].join('\n') + '\n'
          mime = 'text/csv'
          break
        }
      }
      downloadPiFile(`estimating-pi-${run.model.seed}-${run.model.samples}.${exportKind}`, content, mime)
    } catch (error) {
      setNotice(error.message)
    }
  }

  const n = result?.n ?? 0
  const p = result?.probability
  const estimate = n ? result.mean : undefined
  const error = Math.abs(estimate - Math.PI)
  const reset = () => {
    setSamples(String(initialPiModel.samples))
    setSeed(String(initialPiModel.seed))
    begin(initialPiModel)
  }
  return <article className="pi-page">
    <header className="pi-header"><h1>Estimating Pi</h1><p>How accurately can random darts estimate the area of a unit circle?</p></header>
    <div className="pi-workspace">
      <section className="pi-card pi-config">
        <h2>Experiment setup</h2>
        <fieldset disabled={active || opening}>
          <label htmlFor="pi-samples">Number of darts</label>
          <input id="pi-samples" type="text" inputMode="numeric" autoComplete="off" value={samples} onChange={e => setSamples(e.target.value)}/>
          <input className="pi-slider" aria-label="Number of darts from 100 to 20,000" type="range" min="100" max="20000" step="100"
            value={Number.isFinite(model.samples) ? Math.min(20000, Math.max(100, model.samples)) : 100}
            onChange={e => setSamples(e.target.value)}/>
          <div className="pi-presets" aria-label="Sample size presets">{[100, 1000, 10000, 100000].map(value =>
            <button key={value} aria-pressed={model.samples === value} onClick={() => setSamples(String(value))}>{value < 1000 ? value : value / 1000 + 'k'}</button>
          )}</div>
          <label htmlFor="pi-seed">Random seed</label>
          <input id="pi-seed" type="text" inputMode="numeric" autoComplete="off" value={seed} onChange={e => setSeed(e.target.value)}/>
          <small>Reuse the seed and dart count to reproduce a run.</small>
        </fieldset>
        {issues.length > 0 && <p className="pi-validation" role="status">{issues.join(' ')}</p>}
        <div className="pi-actions">
          {active ? <>
            <button className="pi-primary" onClick={() => status === 'paused' ? job.current.resume() : job.current.pause()}>
              {status === 'paused' ? <Play/> : <Pause/>}{status === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button onClick={() => job.current.cancel()}><Square/> Cancel</button>
          </> : <>
            <button className="pi-primary" disabled={issues.length > 0 || opening} onClick={() => begin(model)}><Play/> Run simulation</button>
            <button onClick={reset} disabled={opening}><RotateCcw/> Reset</button>
          </>}
        </div>
        <div className="pi-progress">
          <div><strong role="status">{status === 'complete' ? 'Completed' : status.charAt(0).toUpperCase() + status.slice(1)}</strong>
            <span>{count(n)} / {count(run?.model.samples ?? initialPiModel.samples)}</span>
          </div>
          <progress aria-label="Completed darts" value={n} max={run?.model.samples ?? initialPiModel.samples}/>
        </div>
        <div className="pi-reopen">
          <button disabled={active || opening} onClick={() => reopen()}><FolderOpen/> Reopen saved run</button>
          <button disabled={active || opening} onClick={() => fileInput.current.click()}><Upload/> Import run JSON</button>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) reopen(file)
          }}/>
        </div>
      </section>
      <section ref={plot} className="pi-card pi-visual">
        <header><h2>Dartboard</h2><span className="pi-seed-label">Seed {run?.model.seed ?? initialPiModel.seed}</span></header>
        <Dartboard result={result}/>
      </section>
    </div>
    {notice && <p role="status" className="pi-notice">{notice}</p>}
    <section className="pi-card">
      <header><h2>Run results</h2>{earlier && <strong className="pi-stale">From earlier settings</strong>}</header>
      <p className="pi-caption">Seed {run?.model.seed ?? initialPiModel.seed} · {count(n)} completed darts · {ENGINE_VERSION}</p>
      <dl className="pi-metrics">
        <div><dt>Estimated π</dt><dd>{decimal(estimate, 5)}</dd></div>
        <div><dt>95% Wilson interval for π</dt><dd>{n && result.meanCI ? result.meanCI.map(v => decimal(v)).join(' – ') : '—'}</dd></div>
        <div><dt>Analytical π</dt><dd>{Math.PI.toFixed(5)}</dd></div>
        <div><dt>Hits inside</dt><dd>{n ? count(result.hits) + ' (' + decimal(100 * p, 1) + '%)' : '—'}</dd></div>
        <div><dt>Absolute / relative error</dt><dd>{n ? decimal(error, 5) + ' / ' + decimal(100 * error / Math.PI, 2) + '%' : '—'}</dd></div>
        <div><dt>Estimated standard error</dt><dd>{n > 1 ? decimal(4 * Math.sqrt(p * (1 - p) / (n - 1)), 5) : '—'}</dd></div>
      </dl>
      <p className="pi-caption">The interval measures sampling uncertainty. It scales the 95% Wilson interval for the hit probability by four.</p>
      <h3>Convergence toward π</h3>
      {previousRun && <label className="pi-overlay"><input type="checkbox" checked={overlay} onChange={e => setOverlay(e.target.checked)}/>
        Overlay previous run (seed {previousRun.model.seed}, {count(previousRun.result.n)} darts)</label>}
      <Convergence result={result} previous={overlay ? previousRun?.result : null}/>
    </section>
    <section className="pi-card">
      <h2>Why it works</h2>
      <p>Draw the two coordinates independently and uniformly from −1 to 1. A dart lands inside or on the circle when <Latex math={String.raw`x^2+y^2\leq 1`}/>. The circle has area π and the square has area 4, so a dart hits the circle with probability π/4.</p>
      <p><Latex math={String.raw`\hat\pi=4\frac{\text{hits}}{\text{darts}}`}/></p>
      <p>As more independent darts accumulate, the hit fraction converges to the area ratio. Individual runs can move away from π along the way. Quadrupling the dart count roughly halves the standard error.</p>
    </section>
    <section className="pi-card">
      <h2>Save and export</h2>
      <p className="pi-caption">Exports use the displayed run. Open the notebook in Jupyter or upload it in Colab.</p>
      <div className="pi-actions">
        <button disabled={!exportable} onClick={save}><Save/> Save run</button>
        <select aria-label="Pi export format" value={exportKind} onChange={e => setExportKind(e.target.value)}>
          <option value="ipynb">Colab notebook (.ipynb)</option><option value="json">Reproducible run (.json)</option>
          <option value="zip">Run bundle (.zip)</option><option value="png">Dartboard image (.png)</option>
          <option value="csv">Run results (.csv)</option><option value="py">Python (.py)</option><option value="R">R (.R)</option>
        </select>
        <button disabled={!exportable} onClick={download}><Download/> Download</button>
      </div>
      {exportable && <details onToggle={e => setCodeOpen(e.currentTarget.open)}><summary>Python and R code</summary>
        {codeOpen && <><CodeExporter language="Python" code={pythonScript(run.model)}/><CodeExporter language="R" code={rScript(run.model)}/></>}
      </details>}
    </section>
  </article>
}
