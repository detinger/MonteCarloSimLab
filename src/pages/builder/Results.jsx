import {resultNumber} from '../../components/preferences'
import {convergenceSvg} from './chart.js'
import {computeSensitivity} from './sensitivity.js'
import DistributionChart from '../../components/analysis/DistributionChart'
import '../../styles/analysis.css'
import { useMemo, useState } from 'react'

const fmt=n=>resultNumber(n,defaultFormat)
const defaultFormat=n=>Number.isFinite(n) ? n.toLocaleString(undefined, {maximumFractionDigits:4}) : '—'
const pct = n => Number.isFinite(n) ? (100*n).toFixed(2)+'%' : '—'
const bounds = (interval, format) => interval ? interval.map(format).join(' – ') : 'Unavailable'

function Tornado({sensitivity, unit}) {
  const {base, bars, domain} = sensitivity
  const [lo, hi] = domain, span = hi - lo || 1
  const W = 680, labelW = 150, padR = 20, rowH = 30, top = 10
  const plotW = W - labelW - padR
  const x = v => labelW + ((v - lo) / span) * plotW
  const height = top + bars.length * rowH + 28
  return <svg className="bd-run-chart" viewBox={'0 0 '+W+' '+height} role="img"
    aria-label={'Tornado chart ranking inputs by their effect on the output. '+bars.map(b=>b.label+' swings from '+fmt(b.lo)+' to '+fmt(b.hi)).join('. ')}>
    <line x1={x(base)} y1={top} x2={x(base)} y2={top+bars.length*rowH} stroke="var(--border-strong)" strokeDasharray="3 3"/>
    {bars.map((b,i)=>{
      const y = top + i*rowH + 5
      return <g key={b.name}>
        <text x={labelW-8} y={y+13} textAnchor="end" fontSize="12" fill="var(--text)">{b.label}</text>
        <rect x={x(b.lo)} y={y} width={Math.max(2,x(b.hi)-x(b.lo))} height={rowH-12} rx="3" fill="var(--primary)" opacity="0.85"/>
      </g>
    })}
    <text x={labelW} y={height-8} fontSize="11" fill="var(--text-muted)">{fmt(lo)}</text>
    <text x={x(base)} y={height-8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">base {fmt(base)}{unit?' '+unit:''}</text>
    <text x={W-padR} y={height-8} textAnchor="end" fontSize="11" fill="var(--text-muted)">{fmt(hi)}</text>
  </svg>
}

export default function Results({run,stale}) {
  const [tab,setTab] = useState('Overview')
  const result = run?.result, model = run?.model
  const sensitivity = useMemo(() => model ? computeSensitivity(model) : null, [model])

  if (!result?.n) return <p className="bd-hint">Run the model to estimate the mean output and the probability of your threshold event.</p>

  const statusLine = (stale ? 'From an earlier model revision' : result.status === 'complete' ? 'Completed run' : 'Partial run') + ' · Seed ' + model.seed
  const tabs = <div className="bd-tabs">{['Overview','Histogram','Cumulative frequency','Samples','Convergence',...(sensitivity?['Sensitivity']:[])].map(v => <button aria-pressed={tab===v} key={v} onClick={() => setTab(v)}>{v}</button>)}<span className="bd-tabs-status">{statusLine}</span></div>
  const content = <>
    {tab === 'Overview' && <><div className="bd-kpis">
      <div><small>P(output {model.comparator ?? '>'} {fmt(model.threshold)} {model.unit})</small><strong>{pct(result.probability)}</strong><span>95% Wilson interval · {bounds(result.probabilityCI,pct)}</span></div>
      <div><small>Mean output {model.unit && '('+model.unit+')'}</small><strong>{fmt(result.mean)}</strong><span>95% t interval · {bounds(result.meanCI,fmt)}</span></div>
      <div><small>Completed replications</small><strong>{fmt(result.n)}</strong><span>{fmt(result.hits)} events observed</span></div></div>
      <p className="bd-hint">Intervals describe sampling uncertainty under the saved model assumptions. Wider input ranges can also change the modeled outcomes.</p></>}
    {(tab === 'Histogram' || tab === 'Cumulative frequency') && (result.histogram ? <>
      <DistributionChart rows={result.histogram.map(b => ({lo:b.low,hi:b.high,count:b.count,observed:b.count/result.n}))} unit={'Output'+(model.unit ? ' ('+model.unit+')' : '')} n={result.n}
        marker={[{value:model.threshold,label:'Threshold '+fmt(model.threshold)},{value:result.mean,label:'Mean '+fmt(result.mean),color:'var(--accent)',dash:''}]} view={tab === 'Histogram' ? 'histogram' : 'cdf'}/>
      <div className="bd-table-wrap"><table><thead><tr><th>Percentile</th>{result.quantiles.map(q => <th key={q.p}>P{Math.round(q.p*100)}</th>)}</tr></thead>
        <tbody><tr><td>Output {model.unit && '('+model.unit+')'}</td>{result.quantiles.map(q => <td key={q.p}>{fmt(q.value)}</td>)}</tr></tbody></table></div></>
      : <p className="bd-hint">The output distribution is available once a run completes all replications. Run the model again to see it.</p>)}
    {tab === 'Samples' && <><p className="bd-hint">Showing {result.trace.length} captured replications. Values are displayed to four decimal places.</p>
      <div className="bd-table-wrap"><table><thead><tr><th>Replication</th>{model.inputs.map(v => <th key={v.name}>{v.label || v.name}</th>)}<th>Output ({model.unit || 'units'})</th><th>Output {model.comparator ?? '>'} {fmt(model.threshold)}</th></tr></thead>
        <tbody>{result.trace.map((v,i) => <tr key={i}><td>{i+1}</td>{model.inputs.map(x => <td key={x.name}>{fmt(v.inputs[x.name])}</td>)}<td>{fmt(v.output)}</td><td>{v.event ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div></>}
    {tab === 'Convergence' && <><img className="bd-run-chart" alt="Running output mean against replication count. The table lists the plotted values." src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(convergenceSvg(run))}/><div className="bd-table-wrap"><table><thead><tr><th>Replications</th><th>Running mean ({model.unit || 'units'})</th></tr></thead>
      <tbody>{result.convergence.map((v,i) => <tr key={i}><td>{fmt(v.n)}</td><td>{fmt(v.mean)}</td></tr>)}</tbody></table></div></>}
    {tab === 'Sensitivity' && sensitivity && <><p className="bd-hint">Each input swept from its 10th to 90th percentile while the others stay at their median. Longer bars drive more of the output uncertainty.</p>
      <Tornado sensitivity={sensitivity} unit={model.unit}/>
      <div className="bd-table-wrap"><table><thead><tr><th>Input</th><th>Low (P10)</th><th>High (P90)</th><th>Output swing</th></tr></thead>
        <tbody>{sensitivity.bars.map(b => <tr key={b.name}><td>{b.label}</td><td>{fmt(b.lo)}</td><td>{fmt(b.hi)}</td><td>{fmt(b.swing)}</td></tr>)}</tbody></table></div></>}
  </>

  return <>{tabs}{content}</>
}
