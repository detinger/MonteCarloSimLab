import {resultNumber} from '../../components/preferences'
import {convergenceSvg} from './chart.js'
import { useState } from 'react'
import { ChartNoAxesColumnIncreasing } from 'lucide-react'

const fmt=n=>resultNumber(n,defaultFormat)
const defaultFormat=n=>Number.isFinite(n) ? n.toLocaleString(undefined, {maximumFractionDigits:4}) : '—'
const pct = n => Number.isFinite(n) ? (100*n).toFixed(2)+'%' : '—'
const bounds = (interval, format) => interval ? interval.map(format).join(' – ') : 'Unavailable'
export default function Results({run,stale}) {
  const [tab,setTab] = useState('Overview')
  const result = run?.result, model = run?.model
  return <section className="bd-panel bd-results"><header className="bd-panel-head"><h2><ChartNoAxesColumnIncreasing size={18}/> Experiment results</h2>
    {result && <span className="bd-hint">{stale ? 'From earlier model revision' : result.status === 'complete' ? 'Completed' : 'Partial run'} · Seed {model.seed}</span>}
    </header>
    {!result?.n ? <div className="bd-empty">Run the model to estimate the mean output and the probability of your threshold event.</div> :
      <div className="bd-pad"><div className="bd-tabs">{['Overview','Samples','Convergence'].map(v => <button aria-pressed={tab===v} key={v} onClick={() => setTab(v)}>{v}</button>)}</div>
        {tab === 'Overview' && <><div className="bd-kpis">
          <div><small>P(output {model.comparator ?? '>'} {fmt(model.threshold)} {model.unit})</small><strong>{pct(result.probability)}</strong><span>95% Wilson interval · {bounds(result.probabilityCI,pct)}</span></div>
          <div><small>Mean output {model.unit && '('+model.unit+')'}</small><strong>{fmt(result.mean)}</strong><span>95% t interval · {bounds(result.meanCI,fmt)}</span></div>
          <div><small>Completed replications</small><strong>{fmt(result.n)}</strong><span>{fmt(result.hits)} events observed</span></div></div>
          <p className="bd-hint">Intervals describe sampling uncertainty under the saved model assumptions. Wider input ranges can also change the modeled outcomes.</p></>}
        {tab === 'Samples' && <><p className="bd-hint">Showing {result.trace.length} captured replications. Values are displayed to four decimal places.</p>
          <div className="bd-table-wrap"><table><thead><tr><th>Replication</th>{model.inputs.map(v => <th key={v.name}>{v.label || v.name}</th>)}<th>Output ({model.unit || 'units'})</th><th>Output {model.comparator ?? '>'} {fmt(model.threshold)}</th></tr></thead>
            <tbody>{result.trace.map((v,i) => <tr key={i}><td>{i+1}</td>{model.inputs.map(x => <td key={x.name}>{fmt(v.inputs[x.name])}</td>)}<td>{fmt(v.output)}</td><td>{v.event ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div></>}
        {tab === 'Convergence' && <><img className="bd-run-chart" alt="Running output mean against replication count. The table lists the plotted values." src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(convergenceSvg(run))}/><div className="bd-table-wrap"><table><thead><tr><th>Replications</th><th>Running mean ({model.unit || 'units'})</th></tr></thead>
          <tbody>{result.convergence.map((v,i) => <tr key={i}><td>{fmt(v.n)}</td><td>{fmt(v.mean)}</td></tr>)}</tbody></table></div></>}
      </div>}
  </section>
}
