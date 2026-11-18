import {useState} from 'react'
import {domainSpecs, functionValue, reference} from '../../engine/domains.js'

const colors = Array.from({length:8},(_,i)=>'var(--chart-'+(i+1)+')')
const dashes=[undefined,'6 2','2 2','8 3 2 3','10 3','3 2 1 2','6 3 1 3','1 2']
const fmt = n => Number(n.toPrecision(4)).toString()

function range(values) {
  let low=Infinity,high=-Infinity
  for(const v of values){low=Math.min(low,v);high=Math.max(high,v)}
  if (low===high) return [low-0.5,high+0.5]
  return [low,high]
}

function Plot({lines=[],points=[],bars=[],bands=[],cells=[],label,xTitle,yTitle,square=false,threshold,reference}) {
  const coords=lines.flatMap(s=>s.coords).concat(points,bars.flatMap(b=>[[b.low,0],[b.high,b.count]]),
    bands.flatMap(b=>b.quantiles.map(q=>[b.day,q])),cells.flatMap(c=>[[c.x,c.y],[c.x+c.width,c.y+c.width]]))
  if(!coords.length) return <p>Waiting for sampled values.</p>
  let [minX,maxX]=range(coords.map(p=>p[0]))
  let [minY,maxY]=range(coords.map(p=>p[1]).concat(reference??[]))
  const w=square?245:435,h=245,left=62,top=12
  if(square){
    const bound=Math.max(Math.abs(minX),Math.abs(maxX),Math.abs(minY),Math.abs(maxY),1)
    minX=minY=-bound;maxX=maxY=bound
  }
  const x=v=>left+w*(v-minX)/(maxX-minX),y=v=>top+h-h*(v-minY)/(maxY-minY)
  const path=coords=>coords.map(([a,b],i)=>(i?'L':'M')+x(a).toFixed(2)+','+y(b).toFixed(2)).join(' ')
  const maxCell=Math.max(1,...cells.map(c=>c.count))
  return <svg viewBox={'0 0 '+(w+90)+' 312'} role="img" aria-label={label} style={{width:'100%',maxHeight:330}}>
    <title>{label}</title>
    {Array.from({length:5},(_,i)=>{const value=minY+(maxY-minY)*i/4;return <g key={i}>
      <line x1={left} x2={left+w} y1={y(value)} y2={y(value)} stroke="var(--chart-grid)"/>
      <text x={left-4} y={y(value)+3} textAnchor="end">{fmt(value)}</text></g>})}
    {cells.map((c,i)=><rect key={i} x={x(c.x)} y={y(c.y+c.width)} width={x(c.x+c.width)-x(c.x)} height={y(c.y)-y(c.y+c.width)} fill="var(--chart-1)" opacity={.15+.85*c.count/maxCell}><title>{c.count} walkers</title></rect>)}
    {bands.length>1 && [[0,4],[1,3]].map(([a,b])=><path key={a} fill="var(--primary)" opacity={.12}
      d={path([...bands.map(d=>[d.day,d.quantiles[a]]),...bands.slice().reverse().map(d=>[d.day,d.quantiles[b]])])+'Z'}/>)}
    {bars.map((b,i)=><rect key={i} x={x(b.low)-(bars.length===1?7:0)} y={y(b.count)} width={bars.length===1?14:Math.max(1,x(b.high)-x(b.low)-1)} height={Math.abs(y(0)-y(b.count))} fill="var(--chart-1)"/>)}
    {reference!==undefined && <line x1={left} x2={left+w} y1={y(reference)} y2={y(reference)} stroke="var(--text-muted)" strokeDasharray="5 4"/>}
    {threshold>=minX && threshold<=maxX && <line x1={x(threshold)} x2={x(threshold)} y1={top} y2={top+h} stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 3"/>}
    {lines.map((s,i)=><path key={i} d={path(s.coords)} fill="none" stroke={colors[(s.series??i)%colors.length]} strokeWidth="1.7" strokeDasharray={s.dash??dashes[(s.series??i)%dashes.length]}/>)}
    {points.map(([a,b],i)=><circle key={i} cx={x(a)} cy={y(b)} r="2.4" opacity=".7" fill={b<0?'var(--chart-2)':'var(--chart-1)'}/>)}
    {Array.from({length:5},(_,i)=>{const value=minX+(maxX-minX)*i/4;return <text key={i} x={x(value)} y={top+h+20} textAnchor="middle">{fmt(value)}</text>})}
    <text x={left+w/2} y="303" textAnchor="middle">{xTitle}</text>
    <text transform={'translate(13,'+(top+h/2)+') rotate(-90)'} textAnchor="middle">{yTitle}</text>
  </svg>
}

export default function DomainScene({model:m,result:r}) {
  const [selection,setSelection]=useState('all')
  const [walkView,setWalkView]=useState('paths')
  const spec=domainSpecs[m.kind]
  let plot,notes
  if(m.kind==='integration'){
    const points=r.points.map(({x,y})=>[x,y]),{a,b}=m.params
    const curve=Array.from({length:201},(_,i)=>{const x=a+(b-a)*i/200;return [x,functionValue(m.integrand,x)]})
    plot=<Plot label={spec.scene} xTitle="x" yTitle="f(x)" reference={0} lines={[{coords:curve}]} points={points}/>
    notes='Curve and first '+points.length+' sampled values. Samples below zero contribute negative function values.'
  }else if(m.kind==='montyhall'){
    plot=<Plot label={spec.scene} xTitle="Games" yTitle="Win fraction" reference={2/3} lines={[
      {coords:r.convergence.map(d=>[d.n,d.mean])},{coords:r.convergence.map(d=>[d.n,1-d.mean]),dash:'4 3'}]}/>
    const g=r.trace[0]?.inputs
    notes=<><b>Switch</b> solid · <b>Stay</b> dashed · theoretical switch probability ⅔.{g&&<p>Game 1 placed the prize at door {g.prize}. The player chose {g.pick}, the host opened {g.opened}, and switching selected {g.switched}.</p>}</>
  }else if(m.kind==='stock' || m.kind==='randomwalk'){
    const paths=r.paths||[],chosen=selection==='all'?paths:[paths[Number(selection)]].filter(Boolean)
    plot=<><label>Displayed path <select value={selection} onChange={e=>setSelection(e.target.value)}>
      <option value="all">All traced paths</option>{paths.map((_,i)=><option key={i} value={i}>Path {i+1}</option>)}</select></label>
      <Plot label={spec.scene} xTitle={m.kind==='stock'?'Trading day':'East displacement'} yTitle={m.kind==='stock'?'Price (model currency units)':'North displacement'} square={m.kind==='randomwalk'} lines={chosen.map(coords=>({coords,series:paths.indexOf(coords)}))}
        points={chosen.map(path=>path.at(-1))} bands={m.kind==='stock'?r.bands:[]}/></>
    notes=m.kind==='stock'?'Up to eight traced paths. Darker and lighter shading show empirical 25–75% and 5–95% ranges across all paths at the displayed days.':'Independent walkers start at the origin. Markers show their final positions.'
  }else{
    plot=<Plot label={spec.scene} bars={r.histogram} xTitle={spec.unit} yTitle="Replications" threshold={m.params.threshold}/>
    notes='Bars count completed replications. The dashed marker indicates the target when it lies within the observed range.'
  }
  if(m.kind==='randomwalk'&&r.walk){
    const walk=r.walk
    if(walkView==='endpoints'){
      plot=<Plot label="Walker endpoints" points={walk.endpoints} square xTitle="East displacement" yTitle="North displacement"/>
      notes='Final positions of the first '+walk.endpoints.length+' walkers.'
    }
    if(walkView==='heatmap'){
      plot=<Plot label="Endpoint frequency heatmap" cells={walk.cells} square xTitle="East displacement" yTitle="North displacement"/>
      notes='Cell intensity measures the number of walkers ending in each cell, across all '+r.n+' replications.'
    }
    if(walkView==='msd'){
      const observed=[[0,0],...walk.msd]
      plot=<Plot label="Mean squared displacement by step" xTitle="Step" yTitle="Mean squared displacement" lines={[{coords:observed},{coords:observed.map(([t])=>[t,t*m.params.length**2]),dash:'5 3'}]}/>
      notes='The solid line shows the ensemble average. The dashed line shows the analytical expectation.'
    }
  }
  return <figure>{m.kind==='randomwalk'&&r.walk&&<label>Walk view <select value={walkView} onChange={e=>setWalkView(e.target.value)}>
    <option value="paths">Individual trajectories</option><option value="endpoints">Endpoint scatter</option><option value="heatmap">Endpoint heatmap</option><option value="msd">Ensemble mean squared displacement</option>
  </select></label>}{plot}<figcaption className="pi-caption">{notes}</figcaption></figure>
}

export function Convergence({result,model}) {
  const benchmark=reference(model)
  return <figure><Plot label="Convergence of the estimated mean" xTitle="Completed replications" yTitle={domainSpecs[model.kind].metric} reference={benchmark??undefined}
    lines={[{coords:result.convergence.map(d=>[d.n,d.mean])}]}/>
    <figcaption className="pi-caption">Running estimate across completed replications.{benchmark!==null&&' The dashed line shows the analytical reference.'}</figcaption></figure>
}
