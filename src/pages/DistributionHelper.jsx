import { useMemo, useState } from 'react'
import { ReactFlow, ReactFlowProvider, Background, Controls, Handle, Position, BaseEdge, EdgeLabelRenderer, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowRight, ChevronRight, Maximize2, Plus, SlidersHorizontal } from 'lucide-react'
import { distributions, lawFor } from '../science/distributions'
import { questions, leaves, families, edges, pathTo } from '../science/distributionTree'
import '../styles/helper.css'

const QW = 210, LW = 190

// Small density (continuous) or mass (discrete) sketch drawn from the real law.
function Thumb({kind}) {
  const shape = useMemo(() => {
    const law = lawFor(kind, families[kind].thumb)
    const W = 140, H = 56
    if (law.discrete) {
      const lo = Math.floor(law.inv(.001)), hi = Math.max(lo+1, Math.ceil(law.inv(.999)))
      const xs = Array.from({length:hi-lo+1}, (_, i) => lo+i)
      const ps = xs.map(law.pdf), top = Math.max(...ps) || 1, step = W/xs.length
      return {bars:xs.map((_, i) => ({x:i*step+step*.18, w:step*.64, h:ps[i]/top*(H-4)})), H}
    }
    const lo = law.inv(.004), hi = law.inv(.996)
    const pts = Array.from({length:61}, (_, i) => { const x = lo+(hi-lo)*i/60; return [x, law.pdf(x)] })
    const top = Math.max(...pts.map(p => p[1])) || 1
    const d = 'M0,'+H+' '+pts.map(([, p], i) => 'L'+(i/60*W).toFixed(1)+','+(H-Math.min(p/top, 1)*(H-4)).toFixed(1)).join(' ')+' L'+W+','+H+' Z'
    return {area:d, H}
  }, [kind])
  return <svg className="dh-thumb" viewBox={'0 0 140 '+shape.H} aria-hidden="true">
    {shape.bars ? shape.bars.map((b, i) => <rect key={i} x={b.x} y={shape.H-b.h} width={b.w} height={b.h} rx="1"/>) : <path d={shape.area}/>}
  </svg>
}

function QuestionNode({data}) {
  return <div className={'dh-node dh-question'+(data.state ? ' dh-'+data.state : '')} style={{width:QW}}>
    <Handle type="target" position={Position.Top} isConnectable={false}/>
    {data.text}
    <Handle type="source" position={Position.Bottom} isConnectable={false}/>
  </div>
}
function LeafNode({data}) {
  return <div className={'dh-node dh-leaf'+(data.state ? ' dh-'+data.state : '')} style={{width:LW}}>
    <Handle type="target" position={Position.Top} isConnectable={false}/>
    <strong>{data.title}</strong>
    <Thumb kind={data.kinds[0]}/>
  </div>
}
const nodeTypes = {question:QuestionNode, leaf:LeafNode}

// Straight line with its answer label placed near the child, where branches have room.
function AnswerEdge({id, sourceX, sourceY, targetX, targetY, label, data}) {
  const t = .68, x = sourceX+(targetX-sourceX)*t, y = sourceY+(targetY-sourceY)*t
  return <>
    <BaseEdge id={id} path={`M${sourceX},${sourceY} L${targetX},${targetY}`} className={data.hot ? 'dh-edge-hot' : ''}/>
    <EdgeLabelRenderer>
      <span className={'dh-edge-label'+(data.hot ? ' dh-edge-hot' : '')} style={{transform:`translate(-50%,-50%) translate(${x}px,${y}px)`}}>{label}</span>
    </EdgeLabelRenderer>
  </>
}
const edgeTypes = {answer:AnswerEdge}

// Horizontal strip above the canvas: what is selected · what you can do next · how you got here.
function Details({selected, choose, focus}) {
  const steps = selected ? pathTo(selected) : []
  const path = <div className="dh-zone dh-zone-path"><h3>Your path</h3>
    {steps.length ? <ol className="dh-path">{steps.map(s => <li key={s.to}><button onClick={() => choose(s.from)}>{questions[s.from].text}</button><span><ChevronRight size={12}/>{s.answer}</span></li>)}</ol>
      : <p>{selected ? 'This is the first question.' : 'Your answers will appear here.'}</p>}</div>
  if (!selected) return <div className="dh-panel-body">
    <div className="dh-zone"><small className="dh-kicker">How to use</small><h2>Find a distribution for your data</h2>
      <p>Start at the top question and follow the answers that describe your data. Each path ends at a distribution family that fits it.</p></div>
    <div className="dh-zone dh-zone-main">
      <ul className="dh-tips"><li>Click any box on the canvas to see what it means.</li><li>Drag to pan, scroll or pinch to zoom.</li><li>Open a result in the Distribution Studio, or add it straight to your Builder model.</li></ul>
      <button className="dh-primary" onClick={() => { choose('root'); focus('root') }}>Start at the first question <ArrowRight size={14}/></button>
    </div>
    {path}
  </div>
  const question = questions[selected]
  if (question) return <div className="dh-panel-body">
    <div className="dh-zone"><small className="dh-kicker">Question</small><h2>{question.text}</h2><p>{question.help}</p></div>
    <div className="dh-zone dh-zone-main"><div className="dh-answers">{edges.filter(([from]) => from === selected).map(([, to, answer]) =>
      <button key={to} onClick={() => { choose(to); focus(to) }}><span>{answer}</span><ArrowRight size={14}/></button>)}</div></div>
    {path}
  </div>
  const leaf = leaves[selected]
  return <div className="dh-panel-body">
    <div className="dh-zone"><small className="dh-kicker">Suggested distribution{leaf.kinds.length > 1 ? 's' : ''}</small><h2>{leaf.title}</h2>
      <p>{leaf.kinds.length > 1 ? 'These families fit this kind of data. Compare them and pick the one whose story matches yours.' : 'This family fits the kind of data you described.'}</p></div>
    <div className="dh-zone dh-zone-main dh-families">{leaf.kinds.map(kind => {
      const [title, labels, defaults] = distributions[kind]
      return <section key={kind} className="dh-family">
        <header><Thumb kind={kind}/><strong>{title}</strong></header>
        <p>{families[kind].use}</p>
        <p className="dh-example"><b>Example:</b> {families[kind].example}</p>
        <p className="dh-params"><b>Parameters:</b> {labels.join(', ')}</p>
        <div className="dh-actions">
          <a href={'#/distributions/'+kind}><SlidersHorizontal size={14}/> Open in Studio</a>
          <button onClick={() => addToBuilder(kind, defaults)}><Plus size={14}/> Add to Builder</button>
        </div>
      </section>
    })}</div>
    {path}
  </div>
}

// Hands the family to the Builder through the same channel the Studio uses.
function addToBuilder(distribution, defaults) {
  try { sessionStorage.setItem('mc-studio-input', JSON.stringify({distribution, fields:defaults.map(String)})) } catch { /* storage unavailable */ }
  window.location.assign('#/builder')
}

function Canvas() {
  const [selected, setSelected] = useState(null)
  const flow = useReactFlow()
  const onPath = useMemo(() => {
    const steps = selected ? pathTo(selected) : []
    return {nodes:new Set(selected ? ['root', ...steps.map(s => s.to)] : []), edges:new Set(steps.map(s => s.from+'->'+s.to))}
  }, [selected])
  const nodes = useMemo(() => [
    ...Object.entries(questions).map(([id, q]) => ({id, type:'question', position:{x:q.x-QW/2, y:q.y},
      data:{text:q.text, state:id === selected ? 'selected' : onPath.nodes.has(id) ? 'onpath' : ''}})),
    ...Object.entries(leaves).map(([id, l]) => ({id, type:'leaf', position:{x:l.x-LW/2, y:l.y},
      data:{title:l.title, kinds:l.kinds, state:id === selected ? 'selected' : onPath.nodes.has(id) ? 'onpath' : ''}})),
  ], [selected, onPath])
  const flowEdges = useMemo(() => edges.map(([from, to, answer]) => {
    const hot = onPath.edges.has(from+'->'+to)
    return {id:from+'->'+to, source:from, target:to, type:'answer', label:answer, data:{hot}, selectable:false, focusable:false}
  }), [onPath])
  // Centre a node; the strip above can change height, so wait a frame for the canvas to settle.
  function focus(id, zoomIn = true) {
    const n = questions[id] || leaves[id]
    if (n) requestAnimationFrame(() => flow.setCenter(n.x, n.y + 60, {zoom:zoomIn ? Math.max(flow.getZoom(), .9) : flow.getZoom(), duration:400}))
  }
  return <div className="dh-layout">
    <section className="dh-panel" aria-live="polite"><Details selected={selected} choose={setSelected} focus={focus}/></section>
    <div className="dh-canvas">
      <ReactFlow nodes={nodes} edges={flowEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        onNodeClick={(_, node) => { setSelected(node.id); focus(node.id, false) }} onPaneClick={() => setSelected(null)}
        nodesDraggable={false} nodesConnectable={false} edgesFocusable={false} proOptions={{hideAttribution:true}}
        fitView fitViewOptions={{padding:.08}} minZoom={.2} maxZoom={1.8}>
        <Background gap={24} size={1}/>
        <Controls showInteractive={false}/>
      </ReactFlow>
      <button className="dh-fit" onClick={() => flow.fitView({padding:.08, duration:500})}><Maximize2 size={14}/> Show whole tree</button>
    </div>
  </div>
}

export default function DistributionHelper() {
  return <article className="dh">
    <header className="dh-head"><div><h1>Distribution Helper</h1><p>Answer a few questions about your data to find a distribution that fits it.</p></div></header>
    <ReactFlowProvider><Canvas/></ReactFlowProvider>
  </article>
}
