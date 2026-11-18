import { useEffect, useRef, useState } from 'react'
import { Activity, Binary, ChartNoAxesColumnIncreasing, Equal, Focus, FunctionSquare, GitBranch, Minus, Plus, Table2 } from 'lucide-react'
import {dependencies} from './relations.js'
import { families } from './project'

const W = 174, H = 78
const meta = {
  input: [Activity, 'Random variable'], constant: [Equal, 'Constant'],
  formula: [FunctionSquare, 'Formula'], event: [Binary, 'Threshold event'], metric: [ChartNoAxesColumnIncreasing, 'Metric'],
}

function makeNodes(project) {
  const center = Math.max(1, project.inputs.length - 1) * 56 + 24
  const derived=project.relations||[]
  const offset=derived.length?216:0
  return [
    ...project.inputs.map((v, i) => ({ id: v.name, title: v.label || v.name, kind: v.distribution === 'constant' ? 'constant' : 'input',
      value: families[v.distribution].title + ' · ' + families[v.distribution].fields.map((_, i) => String(v['abcd'[i]]??'')).join(', '),
      x: 24, y: 24 + i * 112 })),
    ...derived.map((v,i)=>({id:v.name,title:v.label,kind:'formula',value:v.expression,x:240,y:24+i*112})),
    { id: 'formula', title: 'Model output', value: project.expression || 'Set a formula', kind: 'formula', x: 240+offset, y: center },
    { id: 'event', title: 'Threshold event', value: 'Output ' + (project.comparator ?? '>') + ' ' + project.threshold + ' ' + project.unit, kind: 'event', x: 456+offset, y: center },
    { id: 'metric', title: 'Event probability', value: '95% Wilson interval', kind: 'metric', x: 456+offset, y: center + 112 },
  ].map(n => ({ ...n, ...project.positions[n.id] }))
}

export default function ModelGraph({ project, selected, select, move, arrange, add, addFormula, tidy, duplicate }) {
  const [table, setTable] = useState(false)
  const [zoom, setZoom] = useState(null)
  const [width, setWidth] = useState(600)
  const [group,setGroup]=useState([])
  const [snap,setSnap]=useState(true)
  const [grid,setGrid]=useState(true)
  const clipboard=useRef(null)
  const pan=useRef(null)
  const viewport = useRef(null)
  const drag = useRef(null)
  const [moving, setMoving] = useState(null)
  useEffect(() => {
    const root = viewport.current
    if (!root) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(root)
    return () => observer.disconnect()
  }, [table])
  const nodes = makeNodes(project).map(n => moving?.id === n.id ? { ...n, ...moving } : n)
  const boardWidth = Math.max(...nodes.map(n => n.x)) + W + 24
  const boardHeight = Math.max(...nodes.map(n => n.y)) + H + 24
  const scale = zoom ?? Math.max(0.68, Math.min(1, width / boardWidth))
  const names=[...project.inputs,...(project.relations||[])].map(v=>v.name)
  const edges=[
    ...[...(project.relations||[]),{name:'formula',expression:project.expression}].flatMap(node=>
      dependencies(node.expression,names).map(source=>[source,node.name])),
    ['formula','event'],['event','metric'],
  ]
  function release() {
    if (moving) move(moving.id, { x: moving.x, y: moving.y })
    drag.current = null
    setMoving(null)
  }
  function groupAlign(axis) {
    const picked=nodes.filter(v=>group.includes(v.id))
    if(picked.length<2)return
    const position=Math.min(...picked.map(v=>v[axis]))
    arrange({...project.positions,...Object.fromEntries(picked.map(v=>[v.id,{x:v.x,y:v.y,[axis]:position}]))})
  }
  return <section className="bd-panel bd-graph" onKeyDown={e=>{
    if(!(e.ctrlKey||e.metaKey)||!e.target.closest('.bd-viewport')) return
    const node=[...project.inputs,...(project.relations||[])].find(n=>n.name===selected)
    const key=e.key.toLowerCase()
    if(key==='c' && node){e.preventDefault();clipboard.current=node}
    if(key==='v' && clipboard.current){e.preventDefault();duplicate(clipboard.current)}
    if(key==='d' && node){e.preventDefault();duplicate(node)}
  }}>
    <header className="bd-panel-head"><h2><GitBranch size={17}/> Model structure</h2>
      <button type="button" onClick={() => setTable(!table)}>{table ? <GitBranch size={14}/> : <Table2 size={14}/>} {table ? 'Diagram' : 'Table'}</button>
    </header>
    {table ? <div className="bd-table-wrap"><table><thead><tr><th>Node</th><th>Kind</th><th>Definition</th></tr></thead>
      <tbody>{nodes.map(n => <tr key={n.id}><td><button onClick={() => select(n.id)} aria-pressed={selected === n.id}>{n.title}</button></td><td>{meta[n.kind][1]}</td><td>{n.value}</td></tr>)}</tbody>
    </table></div> : <div className={'bd-viewport'+(grid?'':' bd-plain')} ref={viewport} tabIndex="0"
      onPointerDown={e=>{if(e.target.closest('button') || e.pointerType==='touch' || e.button!==0)return
        pan.current={x:e.clientX,y:e.clientY,left:e.currentTarget.scrollLeft,top:e.currentTarget.scrollTop}
        e.currentTarget.setPointerCapture(e.pointerId)}}
      onPointerMove={e=>{if(pan.current)e.currentTarget.scrollTo(pan.current.left+pan.current.x-e.clientX,pan.current.top+pan.current.y-e.clientY)}}
      onPointerUp={()=>{pan.current=null}} onPointerCancel={()=>{pan.current=null}} aria-label="Model diagram. Select a node to edit. Arrow keys move the selected node.">
      <div style={{ width: boardWidth * scale, height: boardHeight * scale }}>
        <div className="bd-board" style={{ width: boardWidth, height: boardHeight, transform: 'scale(' + scale + ')' }}>
          <svg width={boardWidth} height={boardHeight} aria-hidden="true">
            {edges.map(([from,to]) => {
              const a = nodes.find(n => n.id === from), b = nodes.find(n => n.id === to)
              if (from === 'event') return <path key={from+'-'+to} d={`M ${a.x+W/2} ${a.y+H} L ${b.x+W/2} ${b.y}`}/>
              const start = a.x + W, end = b.x, mid = (start + end)/2, y = a.y + H/2, y2 = b.y + H/2
              return <path key={from+'-'+to} d={`M ${start} ${y} C ${mid} ${y} ${mid} ${y2} ${end} ${y2}`}/>
            })}
          </svg>
          {nodes.map(n => {
            const [Icon, type] = meta[n.kind]
            return <button type="button" key={n.id} className={'bd-node bd-' + n.kind + (group.includes(n.id)?' bd-grouped':'')} title={n.title + ' · ' + n.value}
              aria-pressed={selected === n.id} style={{ left:n.x, top:n.y, width:W, height:H }}
              onClick={e=>{if(e.shiftKey)setGroup(g=>g.includes(n.id)?g.filter(v=>v!==n.id):[...g,n.id])
                else setGroup([]);select(n.id)}} onKeyDown={e => {
                const delta = { ArrowLeft: [-16,0], ArrowRight: [16,0], ArrowDown: [0,16], ArrowUp: [0,-16] }[e.key]
                if (delta) { e.preventDefault(); move(n.id, {x: Math.max(0,n.x+delta[0]), y: Math.max(0,n.y+delta[1])}) }
              }}
              onPointerDown={e => { if (e.button !== 0) return; drag.current = {id:n.id,x:e.clientX,y:e.clientY,startX:n.x,startY:n.y,scale}; e.currentTarget.setPointerCapture(e.pointerId) }}
              onPointerMove={e => {
                const s = drag.current
                if (s?.id !== n.id || Math.abs(e.clientX-s.x)+Math.abs(e.clientY-s.y)<6) return
                const coordinate=value=>Math.max(0,snap&&!e.altKey?Math.round(value/16)*16:value)
                setMoving({id:n.id,x:coordinate(s.startX+(e.clientX-s.x)/s.scale),y:coordinate(s.startY+(e.clientY-s.y)/s.scale)})
              }} onPointerUp={release} onPointerCancel={() => {drag.current=null; setMoving(null)}}>
              <small><Icon size={13}/> {type}</small><strong>{n.title}</strong><span>{n.value}</span>
            </button>
          })}
        </div>
      </div>
    </div>}
    <footer className="bd-graph-tools"><div className="bd-tools"><button onClick={add} disabled={project.inputs.length >= 32}><Plus size={15}/> Add input</button><button disabled={project.relations?.length>=24} onClick={addFormula}><Plus size={15}/> Add formula</button><button onClick={tidy}>Tidy layout</button></div>
      {!table && <div className="bd-tools"><button aria-label="Zoom out" onClick={() => setZoom(Math.max(.5,scale-.15))}><Minus size={14}/></button>
        <span>{Math.round(scale*100)}%</span><button aria-label="Zoom in" onClick={() => setZoom(Math.min(2,scale+.15))}><Plus size={14}/></button>
        <button aria-label="Fit diagram" onClick={() => {setZoom(null); viewport.current?.scrollTo(0,0)}}><Focus size={15}/></button></div>}</footer>
    {!table && <details className="bd-canvas-options"><summary>Canvas tools</summary><div className="bd-tools">
      <button onClick={()=>setSnap(!snap)} aria-pressed={snap}>Snap to grid</button><button onClick={()=>setGrid(!grid)} aria-pressed={grid}>Show grid</button>
      <button disabled={group.length<2} onClick={()=>groupAlign('x')}>Align left</button><button disabled={group.length<2} onClick={()=>groupAlign('y')}>Align tops</button>
      <button onClick={()=>setGroup(group.length===nodes.length?[]:nodes.map(n=>n.id))}>{group.length===nodes.length?'Clear selection':'Select all'}</button></div>
      <p className="bd-hint">Shift-click to select several nodes. Drag the background to pan. Ctrl/Cmd+C copies a selected input or formula; Ctrl/Cmd+V pastes a duplicate.</p></details>}
  </section>
}
