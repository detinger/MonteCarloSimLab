import { useCallback, useEffect, useRef, useState } from 'react'
import { ReactFlow, Controls, Handle, Position, MarkerType, useNodesState, useEdgesState } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Activity, AlertTriangle, Binary, ChartNoAxesColumnIncreasing, Check, Equal, FunctionSquare, GitBranch, LayoutGrid, Table2, AlignHorizontalJustifyStart, AlignVerticalJustifyStart } from 'lucide-react'
import {dependencies} from './relations.js'
import { families } from './project'
import { SetupTree } from './Editor.jsx'

const W = 184

const meta = {
  input: [Activity, 'Random variable'], constant: [Equal, 'Constant'],
  formula: [FunctionSquare, 'Formula'], event: [Binary, 'Threshold event'], metric: [ChartNoAxesColumnIncreasing, 'Metric'],
}

// Node components must live outside the parent so React Flow does not remount
// them on every render. A single component covers all six kinds.
function RfNode({ data }) {
  const [Icon, type] = meta[data.kind]
  return <div className={'bd-node bd-' + data.kind + (data.grouped ? ' bd-grouped' : '')} title={data.title + ' · ' + data.value} style={{ width: W }}>
    <Handle type="target" position={Position.Left} isConnectable={false}/>
    <small><Icon size={13}/> {type}</small><strong>{data.title}</strong><span>{data.value}</span>
    <Handle type="source" position={Position.Right} isConnectable={false}/>
  </div>
}
const nodeTypes = { mc: RfNode }

function layout(project) {
  const center = Math.max(1, project.inputs.length - 1) * 56 + 24
  const derived = project.relations || []
  const offset = derived.length ? 216 : 0
  return [
    ...project.inputs.map((v, i) => ({ id: v.name, kind: v.distribution === 'constant' ? 'constant' : 'input',
      title: v.label || v.name,
      value: families[v.distribution].title + ' · ' + families[v.distribution].fields.map((_, i) => String(v['abcd'[i]] ?? '')).join(', '),
      x: 24, y: 24 + i * 112 })),
    ...derived.map((v, i) => ({ id: v.name, title: v.label, kind: 'formula', value: v.expression, x: 240, y: 24 + i * 112 })),
    { id: 'formula', title: 'Model output', value: project.expression || 'Set a formula', kind: 'formula', x: 240 + offset, y: center },
    { id: 'event', title: 'Threshold event', value: 'Output ' + (project.comparator ?? '>') + ' ' + project.threshold + ' ' + project.unit, kind: 'event', x: 456 + offset, y: center },
    { id: 'metric', title: 'Event probability', value: '95% Wilson interval', kind: 'metric', x: 672 + offset, y: center },
  ].map(n => ({ ...n, ...project.positions[n.id] }))
}

function buildEdges(project) {
  const names = [...project.inputs, ...(project.relations || [])].map(v => v.name)
  const pairs = [
    ...[...(project.relations || []), { name: 'formula', expression: project.expression }].flatMap(node =>
      dependencies(node.expression, names).map(source => [source, node.name])),
    ['formula', 'event'], ['event', 'metric'],
  ]
  return pairs.map(([source, target]) => ({ id: source + '->' + target, source, target, type: 'default',
    selectable: false, focusable: false, markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 } }))
}

function toRfNodes(project, selected, group) {
  return layout(project).map(n => ({ id: n.id, type: 'mc', position: { x: n.x, y: n.y },
    selected: n.id === selected, data: { kind: n.kind, title: n.title, value: n.value, grouped: group.includes(n.id) } }))
}

export default function ModelGraph({ project, selected, select, move, arrange, add, addFormula, tidy, duplicate, remove, edit, editNode, issues = [] }) {
  const [table, setTable] = useState(false)
  const [group, setGroup] = useState([])
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const clipboard = useRef(null)
  const relCount = project.relations?.length || 0
  const edgeCount = buildEdges(project).length

  // Rebuild the diagram whenever the model structure, selection or grouping
  // changes. Positions committed on drag flow back through project.positions,
  // so rebuilding never jumps a node from where the user dropped it.
  useEffect(() => { setNodes(toRfNodes(project, selected, group)) }, [project, selected, group, setNodes])
  useEffect(() => { setEdges(buildEdges(project)) }, [project, setEdges])

  const onNodeClick = useCallback((e, node) => {
    if (e.shiftKey) setGroup(g => g.includes(node.id) ? g.filter(v => v !== node.id) : [...g, node.id])
    else { setGroup([]); editNode(node.id) }
  }, [editNode])

  const onNodeDragStop = useCallback((e, node) => {
    move(node.id, { x: Math.round(node.position.x), y: Math.round(node.position.y) })
  }, [move])

  function groupAlign(axis) {
    const picked = tableNodes.filter(v => group.includes(v.id))
    if (picked.length < 2) return
    const position = Math.min(...picked.map(v => v[axis]))
    arrange({ ...project.positions, ...Object.fromEntries(picked.map(v => [v.id, { x: v.x, y: v.y, [axis]: position }])) })
  }

  function onKeyDown(e) {
    const node = [...project.inputs, ...(project.relations || [])].find(n => n.name === selected)
    if (!e.target.closest('input,textarea,select,[contenteditable="true"]') && (e.key === 'Delete' || e.key === 'Backspace') && node) {
      e.preventDefault(); remove(node); return
    }
    if (!(e.ctrlKey || e.metaKey)) return
    const key = e.key.toLowerCase()
    if (key === 'c' && node) { e.preventDefault(); clipboard.current = node }
    if (key === 'v' && clipboard.current) { e.preventDefault(); duplicate(clipboard.current) }
    if (key === 'd' && node) { e.preventDefault(); duplicate(node) }
  }

  return <section className="bd-panel bd-graph" onKeyDown={onKeyDown}>
    <header className="bd-panel-head"><h2><GitBranch size={17}/> Model structure</h2>
      <div className="bd-tools">
        <button className="bd-add bd-add-input" onClick={add} disabled={project.inputs.length >= 32} title="Add a random variable — an uncertain input drawn from a distribution each replication"><Activity size={14}/> Add input</button>
        <button className="bd-add bd-add-formula" disabled={project.relations?.length >= 24} onClick={addFormula} title="Add an intermediate formula that combines inputs into a named value"><FunctionSquare size={14}/> Add formula</button>
        <button className="bd-add bd-add-tidy" onClick={tidy} disabled={table} title="Reset every node to the automatic left-to-right layout"><LayoutGrid size={14}/> Tidy layout</button>
        <div className="bd-toolbar-sep"/>
        {group.length >= 2 && !table && <>
          <button type="button" onClick={() => groupAlign('x')} title="Align selected nodes to the left"><AlignHorizontalJustifyStart size={14}/> Align X</button>
          <button type="button" onClick={() => groupAlign('y')} title="Align selected nodes to the top"><AlignVerticalJustifyStart size={14}/> Align Y</button>
        </>}
        <button type="button" onClick={() => setTable(!table)}>{table ? <GitBranch size={14}/> : <Table2 size={14}/>} {table ? 'Diagram' : 'Setup'}</button>
      </div>
    </header>
    {table ? <div className="bd-setup-wrap"><SetupTree draft={project} change={edit} select={select}/></div> : <div className="bd-rf" aria-label="Model diagram. Click a node to edit it. Shift-click to group nodes.">
      <div className="bd-canvas-hint">Click a node to edit · drag to move · shift-click to group · Backspace to delete</div>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick} onNodeDragStop={onNodeDragStop}
        nodesConnectable={false} edgesFocusable={false} deleteKeyCode={null} proOptions={{ hideAttribution: true }}
        fitView fitViewOptions={{ padding: 0.2, maxZoom: 1 }} minZoom={0.3} maxZoom={2}>
        <Controls showInteractive={false}/>
      </ReactFlow>
    </div>}
    <footer className="bd-graph-status">
      <span>{project.inputs.length} input{project.inputs.length === 1 ? '' : 's'} · {relCount} formula{relCount === 1 ? '' : 's'} · {edgeCount} link{edgeCount === 1 ? '' : 's'}</span>
      <span className={issues.length ? 'bd-status-warn' : 'bd-status-ok'}>{issues.length ? <><AlertTriangle size={13}/> {issues.length} issue{issues.length === 1 ? '' : 's'}</> : <><Check size={13}/> Valid</>}</span>
    </footer>
  </section>
}
