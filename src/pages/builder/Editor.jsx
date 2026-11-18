import { useEffect, useRef, useState } from 'react'
import { Activity, Binary, ChartNoAxesColumnIncreasing, ChevronDown, ChevronUp, Copy, Equal, FunctionSquare, Plus, Settings2, Trash2, X } from 'lucide-react'
import {slotKeys,isListLaw} from '../../engine/inputLaws.js'
import {comparators} from '../../engine/index.js'
import { createProject, families, issuesFor, newInput, template } from './project'
import Results from './Results.jsx'

export function Field({ title, ...props }) {
  return <label className="bd-field"><span>{title}</span><input {...props}/></label>
}
const RESERVED = new Set(['abs','sqrt','log','exp','min','max','pi','e','sin','cos','tan','if'])
function IdentifierField({ name, rename, usedNames=[] }) {
  const [value, setValue] = useState(name)
  const [error, setError] = useState('')
  useEffect(() => { setValue(name); setError('') }, [name])
  function validate(v) {
    if (!v.trim()) return 'Cannot be empty'
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v)) return 'Letters, digits and underscores only'
    if (usedNames.includes(v)) return 'Already used by another input or formula'
    if (RESERVED.has(v.toLowerCase())) return `"${v}" is a reserved function name`
    return ''
  }
  function commit() {
    const v = value.trim()
    if (v === name) return
    const err = validate(v)
    if (err) { setError(err); setValue(name); return }
    rename(name, v)
  }
  return <><label className="bd-field"><span>Identifier</span>
    <input value={value} maxLength={40}
      onChange={e => { setValue(e.target.value); setError('') }}
      onBlur={commit}
      onKeyDown={e => { if (e.key==='Enter') e.target.blur(); if (e.key==='Escape') { setValue(name); setError('') } }}/>
  </label>
  {error && <p className="bd-hint" style={{color:'var(--error)'}}>{error}</p>}</>
}
export function InputFields({ input, change, rename, usedNames }) {
  return <>
    <Field title="Display name" value={input.label} maxLength={80} onChange={e => change({label:e.target.value})}/>
    <label className="bd-field"><span>Distribution</span>
      <select value={input.distribution} onChange={e => {
        const distribution = e.target.value
        const params = Object.fromEntries(slotKeys.map((key,i)=>[key,families[distribution].defaults[i]?.toString()]))
        change({distribution,...params})
      }}>{Object.entries(families).map(([key,v]) => <option key={key} value={key}>{v.title}</option>)}</select>
    </label>
    <div className="bd-params">{families[input.distribution].fields.map((label, i) =>
      <Field key={label} title={label} inputMode={isListLaw(input.distribution)?'text':'decimal'} maxLength={isListLaw(input.distribution)?8192:128} value={input[slotKeys[i]] ?? ''} onChange={e => change({[slotKeys[i]]: e.target.value})}/>
    )}</div>
    <Field title="Input unit" value={input.unit ?? ''} maxLength={40} onChange={e => change({unit:e.target.value})}/>
    {rename
      ? <IdentifierField name={input.name} rename={rename} usedNames={usedNames}/>
      : <p className="bd-hint">Formula identifier <code>{input.name}</code></p>}
  </>
}
export function Expression({ draft, change, source=draft.expression, write=value=>change({expression:value}), exclude }) {
  const candidates=[...draft.inputs,...(draft.relations||[])].filter(v=>v.name!==exclude)
  return <><label className="bd-field"><span>Output formula</span><textarea value={source} maxLength={512} onChange={e => write(e.target.value)} placeholder="input1 + input2"/></label>
    <div className="bd-chips">{[...draft.inputs,...(draft.relations||[])].filter(v=>v.name!==exclude).map(v => <button key={v.name} onClick={() => write((source + ' ' + v.name).trim())} title={'Insert ' + v.name}>{v.name}</button>)}</div>
    <details className="bd-connect"><summary>Connect inputs as a sum</summary>
      <p className="bd-hint">Checking a source replaces the formula with the sum of the checked sources.</p>
      {candidates.map(v=>{const list=source.split('+').map(x=>x.trim()).filter(x=>candidates.some(c=>c.name===x))
        return <label key={v.name}><input type="checkbox" checked={list.includes(v.name)} onChange={e=>write((e.target.checked?[...list,v.name]:list.filter(x=>x!==v.name)).join(' + '))}/>{v.label} <code>{v.name}</code></label>})}</details>
    <p className="bd-hint">Use arithmetic, powers (^), abs, sqrt, log, exp, min or max. Each identifier takes one value per replication.</p></>
}
function EventFields({draft,change}) {
  const names={'>':'Greater than (>)','>=':'At least (≥)','<':'Less than (<)','<=':'At most (≤)'}
  const comparator=draft.comparator ?? '>'
  return <><label className="bd-field"><span>Count an event when the output is</span>
    <select value={comparator} onChange={e=>change({comparator:e.target.value})}>
      {comparators.map(op=><option key={op} value={op}>{names[op]}</option>)}</select></label>
    <Field title={'Threshold ('+(draft.unit || 'output units')+')'} value={draft.threshold} onChange={e=>change({threshold:e.target.value})}/>
    <p className="bd-hint">{comparator.includes('=')?'An output equal to the threshold counts as an event.':'An output equal to the threshold falls outside the event.'}</p></>
}
export function Settings({ draft, change }) {
  return <div className="bd-params"><Field title="Replications" inputMode="numeric" value={draft.samples} onChange={e => change({samples:e.target.value})}/>
    <Field title="Seed" inputMode="numeric" value={draft.seed} onChange={e => change({seed:e.target.value})}/></div>
}
export function ModelQuestion({draft, change}) {
  return <><Field title="Project name" maxLength={120} value={draft.title} onChange={e => change({title:e.target.value})}/>
    <label className="bd-field"><span>Decision question</span><textarea maxLength={1000} value={draft.question} onChange={e => change({question:e.target.value})}/></label>
    <Field title="Output unit" value={draft.unit} maxLength={40} onChange={e => change({unit:e.target.value})}/>
    <label className="bd-field"><span>Model assumptions</span><textarea maxLength={2000} value={draft.assumptions} onChange={e => change({assumptions:e.target.value})}/></label></>
}

export function nodeTitle(draft, selected) {
  const input = draft.inputs.find(v => v.name === selected)
  const derived = draft.relations?.find(v => v.name === selected)
  const names = {formula:'Output formula',event:'Threshold event',metric:'Probability metric',question:'Project settings'}
  return input?.label || derived?.label || names[selected] || 'Project settings'
}

// Per-node editor, reused by the canvas popup and the setup-tree popup.
export function NodeEditor({draft, selected, change, select, close}) {
  const input = draft.inputs.find(v => v.name === selected)
  const derived = draft.relations?.find(v => v.name === selected)
  const editInput = patch => change({inputs:draft.inputs.map(v => v === input ? {...v,...patch} : v)})
  const editDerived = patch => change({relations:draft.relations.map(v => v === derived ? {...v,...patch} : v)})
  const usedNames = [...draft.inputs,...(draft.relations||[])].filter(v => v !== input).map(v => v.name)
  const renameInput = (oldName, newName) => {
    const sub = expr => expr?.replace(new RegExp(`\\b${oldName}\\b`,'g'), newName)
    change({inputs:draft.inputs.map(v => v === input ? {...v,name:newName} : v),
      expression:sub(draft.expression),relations:draft.relations?.map(r=>({...r,expression:sub(r.expression)}))})
    select(newName)
  }
  const removeNode = patch => { change(patch); select('formula'); close?.() }
  if (input) return <>
    <InputFields input={input} change={editInput} rename={renameInput} usedNames={usedNames}/>
    <div className="bd-tools"><button disabled={draft.inputs.length >= 32} onClick={() => {
      const copy = {...input, name:newInput(draft.inputs).name, label:input.label + ' copy'}
      change({inputs:[...draft.inputs,copy]}); select(copy.name)
    }}><Copy size={14}/> Duplicate</button>
    <button onClick={() => removeNode({inputs:draft.inputs.filter(v => v !== input)})}><Trash2 size={14}/> Remove</button></div>
  </>
  if (derived) return <>
    <Field title="Formula name" value={derived.label} onChange={e=>editDerived({label:e.target.value})}/>
    <Field title="Formula unit" value={derived.unit} onChange={e=>editDerived({unit:e.target.value})}/>
    <Expression draft={draft} source={derived.expression} exclude={derived.name} write={expression=>editDerived({expression})}/>
    <p className="bd-hint">Formula identifier <code>{derived.name}</code></p>
    <button onClick={()=>removeNode({relations:draft.relations.filter(v=>v!==derived)})}><Trash2 size={14}/> Remove formula</button>
  </>
  if (selected === 'formula') return <Expression draft={draft} change={change}/>
  if (selected === 'event') return <EventFields draft={draft} change={change}/>
  if (selected === 'metric') return <p className="bd-hint">The event probability is the fraction of independent replications meeting the threshold condition. Set replications and seed in Project settings.</p>
  return <><ModelQuestion draft={draft} change={change}/><Settings draft={draft} change={change}/></>
}

const kindMeta = {
  input: [Activity, 'Random variable'], constant: [Equal, 'Constant'],
  formula: [FunctionSquare, 'Formula'], event: [Binary, 'Threshold event'], metric: [ChartNoAxesColumnIncreasing, 'Metric'],
}
// One node in the setup tree: hierarchy glyph + its full inline editor (all the
// fields that used to live in the right pane).
function SetupNode({id, kind, title, depth, glyph, draft, change, select}) {
  const [Icon] = kindMeta[kind]
  return <div className={'bd-setup-node bd-' + kind} style={{marginLeft:depth*18}}>
    <div className="bd-setup-node-head"><span className="bd-tree-glyph">{glyph}</span><Icon size={14}/><strong>{title}</strong></div>
    <div className="bd-setup-node-body"><NodeEditor draft={draft} selected={id} change={change} select={select}/></div>
  </div>
}
// Reversed hierarchy: inputs and formulas (leaves) on top, flowing down to the metric.
export function SetupTree({draft, change, select}) {
  const sources = [
    ...draft.inputs.map(v => ({id:v.name, title:v.label||v.name, kind:v.distribution==='constant'?'constant':'input'})),
    ...(draft.relations||[]).map(v => ({id:v.name, title:v.label||v.name, kind:'formula'})),
  ]
  const chain = [
    {id:'formula', depth:1, title:'Model output', kind:'formula'},
    {id:'event', depth:2, title:'Threshold event', kind:'event'},
    {id:'metric', depth:3, title:'Event probability', kind:'metric'},
  ]
  return <div className="bd-setup">
    <section className="bd-setup-sec">
      <h3 className="bd-setup-h"><Settings2 size={14}/> Project settings</h3>
      <div className="bd-setup-node bd-setup-project"><div className="bd-setup-node-body"><NodeEditor draft={draft} selected="question" change={change} select={select}/></div></div>
    </section>
    <section className="bd-setup-sec">
      <h3 className="bd-setup-h">Model hierarchy</h3>
      {sources.map((n, i) => <SetupNode key={n.id} id={n.id} kind={n.kind} title={n.title} depth={0} glyph={i === sources.length-1 ? '└─' : '├─'} draft={draft} change={change} select={select}/>)}
      {chain.map(n => <SetupNode key={n.id} id={n.id} kind={n.kind} title={n.title} depth={n.depth} glyph="└─" draft={draft} change={change} select={select}/>)}
    </section>
  </div>
}

export function ResultsPanel({run, stale, open, onToggle, height, onResizeStart, onResizeMove, onResizeEnd}) {
  return <section className={'bd-panel bd-results-bottom'+(open?' bd-results-open':'')} style={open && height ? {height:height+'px'} : undefined}>
    {open && <div className="bd-resize-handle" onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} onPointerCancel={onResizeEnd}/>}
    <header className="bd-panel-head"><h2><ChartNoAxesColumnIncreasing size={17}/> Experiment results</h2>
      <div className="bd-tools"><button onClick={onToggle} aria-label={open?'Hide results':'Show results'} title={open?'Hide results':'Show results'}>{open ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}</button></div></header>
    {open && <div className="bd-pad bd-results-body"><Results run={run} stale={stale}/></div>}
  </section>
}
export function Issues({issues}) {
  return issues.length ? <ul className="bd-issues">{issues.map((m,i) => <li key={i}>{m}</li>)}</ul> : <p className="bd-valid">Model validated. Ready to run.</p>
}
export function ExportPanel({run, issues, exportFile, working}) {
  const r = run?.result
  const items = [
    {id:'notebook',label:'Colab Notebook',ext:'.ipynb',hint:'Open in Jupyter or Google Colab',needsValid:true},
    {id:'python',label:'Python Script',ext:'.py',hint:'NumPy / SciPy compatible',needsValid:true},
    {id:'r',label:'R Script',ext:'.R',hint:'Base R stats package',needsValid:true},
    {id:'project',label:'Project File',ext:'.json',hint:'Full model and recorded run'},
    {id:'csv',label:'Sample Table',ext:'.csv',hint:'All captured replications',needsRun:true},
    {id:'chart',label:'Convergence Chart',ext:'.svg',hint:'Running mean over replications',needsRun:true},
    {id:'zip',label:'Run Bundle',ext:'.zip',hint:'Reproducible package with notebook',needsRun:true},
  ]
  return <>
    <div className="bd-export-grid">
      {items.map(({id,label,ext,hint,needsRun,needsValid}) => {
        const disabled = needsRun ? !r?.n || working : needsValid ? !!issues.length : working
        return <button key={id} className="bd-export-card" disabled={disabled} onClick={() => exportFile(id)}>
          <div className="bd-export-card-head"><strong>{label}</strong><code>{ext}</code></div>
          <small>{hint}</small>
        </button>
      })}
    </div>
    {r?.n ? <p className="bd-hint">Recorded run · seed {run.model.seed} · {r.n} replications{r.status!=='complete'?' (partial)':''}.</p> : <p className="bd-hint">Run the model to unlock CSV, chart and ZIP exports.</p>}
    {!!issues.length && <Issues issues={issues}/>}
  </>
}
export function Dialog({title, close, children}) {
  const dialog = useRef(null)
  useEffect(() => { const d = dialog.current; d.showModal(); return () => d.close() }, [])
  return <dialog ref={dialog} className="bd-dialog" aria-label={title} onCancel={e => {e.preventDefault();close()}}>
    <header className="bd-panel-head"><h2>{title}</h2><button onClick={close} aria-label="Close dialog"><X size={16}/></button></header>
    <div className="bd-pad">{children}</div></dialog>
}
export function Wizard({close, finish}) {
  const [draft,setDraft] = useState(() => createProject(true))
  const [step,setStep] = useState(0)
  const update = patch => setDraft(v => ({...v,...patch}))
  const labels = ['Question','Inputs','Formula','Experiment']
  return <Dialog title="New simulation" close={close}>
    <div className="bd-tabs">{labels.map((s,i) => <button key={s} onClick={() => setStep(i)} aria-pressed={i === step}>{i+1}. {s}</button>)}</div>
    {step === 0 && <><ModelQuestion draft={draft} change={update}/><p className="bd-hint">Define the inputs and calculation that will answer your question in the next steps.</p>
      <div className="bd-tools"><button onClick={() => finish(draft)}>Open blank canvas</button></div><h3>Start from a template</h3><div className="bd-project-list">{[['budget','Project budget'],['revenue','Product revenue'],['rare','Rare equipment loss']].map(([id,title])=><button key={id} onClick={()=>finish(template(id))}><strong>{title}</strong><small>{template(id).question}</small></button>)}</div></>}
    {step === 1 && <><p>Specify independent inputs and their units. Choose Constant for a fixed value.</p>
      {draft.inputs.map((v,i) => <fieldset key={v.name}><legend>{v.name}</legend><InputFields input={v} change={p => update({inputs:draft.inputs.map((o,j) => i === j ? {...o,...p} : o)})}/></fieldset>)}
      <button disabled={draft.inputs.length >= 32} onClick={() => update({inputs:[...draft.inputs,newInput(draft.inputs,draft.unit)]})}><Plus size={14}/> Add input</button></>}
    {step === 2 && <><Expression draft={draft} change={update}/><EventFields draft={draft} change={update}/></>}
    {step === 3 && <><Settings draft={draft} change={update}/><Issues issues={issuesFor(draft)}/></>}
    <div className="bd-dialog-footer">{step > 0 && <button onClick={() => setStep(step-1)}>Back</button>}
      {step < 3 ? <button className="bd-primary" onClick={() => setStep(step+1)}>Continue</button> : <button className="bd-primary" onClick={() => finish(draft)}>Create model</button>}</div>
  </Dialog>
}
