import { useEffect, useRef, useState } from 'react'
import { Activity, Binary, ChartLine, ChartNoAxesColumnIncreasing, ChevronDown, ChevronUp, Copy, Download, Equal, FileArchive, FileCode, FileJson, FileSpreadsheet, FunctionSquare, NotebookText, Plus, Settings2, Trash2, X } from 'lucide-react'
import {slotKeys,isListLaw} from '../../engine/inputLaws.js'
import {comparators} from '../../engine/index.js'
import { createProject, families, issuesFor, newInput, template } from './project'
import Results from './Results.jsx'

export function Field({ title, ...props }) {
  return <label className="bd-field"><span>{title}</span><input {...props}/></label>
}
const RESERVED = new Set(['abs','sqrt','log','exp','min','max','pi','e','sin','cos','tan','if'])
// Callers key this by `name`, so a rename elsewhere remounts it with fresh state.
function IdentifierInput({ name, rename, usedNames=[] }) {
  const [value, setValue] = useState(name)
  const [error, setError] = useState('')
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
  return <><input className="bd-cell bd-cell-mono" aria-label="Identifier" value={value} maxLength={40}
      onChange={e => { setValue(e.target.value); setError('') }}
      onBlur={commit}
      onKeyDown={e => { if (e.key==='Enter') e.target.blur(); if (e.key==='Escape') { setValue(name); setError('') } }}/>
    {error && <p className="bd-hint bd-field-error">{error}</p>}</>
}
function IdentifierField(props) {
  return <div className="bd-field"><span>Identifier</span><IdentifierInput key={props.name} {...props}/></div>
}
export function InputFields({ input, change, rename, usedNames }) {
  return <div className="bd-form">
    <Field title="Display name" value={input.label} maxLength={80} onChange={e => change({label:e.target.value})}/>
    {rename
      ? <IdentifierField name={input.name} rename={rename} usedNames={usedNames}/>
      : <div className="bd-field"><span>Identifier</span><code className="bd-sheet-id">{input.name}</code></div>}
    <label className="bd-field"><span>Distribution</span>
      <select value={input.distribution} onChange={e => change(distributionPatch(e.target.value))}>{Object.entries(families).map(([key,v]) => <option key={key} value={key}>{v.title}</option>)}</select>
    </label>
    <Field title="Input unit" value={input.unit ?? ''} maxLength={40} onChange={e => change({unit:e.target.value})}/>
    <div className="bd-field bd-wide"><span>Parameters</span><div className="bd-form-params"><ParamCells input={input} change={change}/></div></div>
  </div>
}
export function Expression({ draft, change, source=draft.expression, write=value=>change({expression:value}), exclude, label='Output formula' }) {
  const names=[...draft.inputs,...(draft.relations||[])].map(v=>v.name).filter(n=>n!==exclude)
  return <div className="bd-expr">
    <label className="bd-field"><span>{label}</span><input className="bd-cell-mono" value={source} maxLength={512} onChange={e => write(e.target.value)} placeholder="input1 + input2"/></label>
    {names.length > 0 && <div className="bd-chips"><span className="bd-hint">Insert:</span>{names.map(n => <button key={n} onClick={() => write((source + ' ' + n).trim())} title={'Insert ' + n}>{n}</button>)}</div>}
    <p className="bd-hint">Use + − × (*) ÷ (/), powers (^), abs, sqrt, log, exp, min or max. Each identifier takes one value per replication.</p>
  </div>
}
const comparatorNames={'>':'Greater than (>)','>=':'At least (≥)','<':'Less than (<)','<=':'At most (≤)'}
function EventFields({draft,change}) {
  const comparator=draft.comparator ?? '>'
  return <div className="bd-event-wrap">
    <div className="bd-sheet-event">
      <span>Count a replication when the output is</span>
      <select aria-label="Count an event when the output is" value={comparator} onChange={e => change({comparator:e.target.value})}>
        {comparators.map(op => <option key={op} value={op}>{comparatorNames[op]}</option>)}</select>
      <span className="bd-event-value"><input aria-label={'Threshold ('+(draft.unit || 'output units')+')'} inputMode="decimal" value={draft.threshold} onChange={e => change({threshold:e.target.value})}/>
        {draft.unit && <span>{draft.unit}</span>}</span>
    </div>
    <p className="bd-hint">{comparator.includes('=')?'An output equal to the threshold counts as an event.':'An output equal to the threshold falls outside the event.'}</p>
  </div>
}
export function Settings({ draft, change }) {
  return <div className="bd-params"><Field title="Replications" inputMode="numeric" value={draft.samples} onChange={e => change({samples:e.target.value})}/>
    <Field title="Seed" inputMode="numeric" value={draft.seed} onChange={e => change({seed:e.target.value})}/></div>
}
export function ModelQuestion({draft, change}) {
  return <div className="bd-form bd-form-question">
    <Field title="Project name" maxLength={120} value={draft.title} onChange={e => change({title:e.target.value})}/>
    <Field title="Output unit" placeholder="e.g. EUR, days" value={draft.unit} maxLength={40} onChange={e => change({unit:e.target.value})}/>
    <label className="bd-field bd-wide"><span>Decision question</span><textarea rows={2} maxLength={1000} value={draft.question} onChange={e => change({question:e.target.value})}/></label>
    <label className="bd-field bd-wide"><span>Model assumptions</span><textarea rows={2} maxLength={2000} value={draft.assumptions} onChange={e => change({assumptions:e.target.value})}/></label>
  </div>
}

const kindNames = {input:'Random variable', constant:'Constant', formula:'Formula', output:'Model output', event:'Threshold event', metric:'Metric', question:'Project'}
function nodeKind(draft, selected) {
  const input = draft.inputs.find(v => v.name === selected)
  if (input) return input.distribution === 'constant' ? 'constant' : 'input'
  if (draft.relations?.some(v => v.name === selected)) return 'formula'
  return {formula:'output', event:'event', metric:'metric'}[selected] || 'question'
}
function nodeTitle(draft, selected) {
  const input = draft.inputs.find(v => v.name === selected)
  const derived = draft.relations?.find(v => v.name === selected)
  const names = {formula:'Output formula',event:'Threshold event',metric:'Event probability',question:'Project settings'}
  return input?.label || derived?.label || names[selected] || 'Project settings'
}

// Per-node editor shown in the diagram popup.
export function NodeEditor({draft, selected, change, select, close}) {
  const input = draft.inputs.find(v => v.name === selected)
  const derived = draft.relations?.find(v => v.name === selected)
  const relations = draft.relations || []
  const editInput = patch => change({inputs:draft.inputs.map(v => v === input ? {...v,...patch} : v)})
  const editDerived = patch => change({relations:relations.map(v => v === derived ? {...v,...patch} : v)})
  const usedNames = [...draft.inputs,...relations].filter(v => v !== input).map(v => v.name)
  const renameInput = (oldName, newName) => { change(renamePatch(draft, oldName, newName)); select(newName) }
  const removeNode = patch => { change(patch); select('formula'); close?.() }
  const done = close && <button className="bd-primary" onClick={close}>Done</button>
  if (input) return <>
    <InputFields input={input} change={editInput} rename={renameInput} usedNames={usedNames}/>
    <footer className="bd-dialog-actions">
      <button disabled={draft.inputs.length >= 32} onClick={() => {
        const copy = {...input, name:newInput([...draft.inputs,...relations]).name, label:input.label + ' copy'}
        change({inputs:[...draft.inputs,copy]}); select(copy.name)
      }}><Copy size={14}/> Duplicate</button>
      <button className="bd-danger" onClick={() => removeNode({inputs:draft.inputs.filter(v => v !== input)})}><Trash2 size={14}/> Remove</button>
      {done}
    </footer>
  </>
  if (derived) return <>
    <div className="bd-form">
      <Field title="Formula name" value={derived.label} onChange={e=>editDerived({label:e.target.value})}/>
      <div className="bd-field"><span>Identifier</span><code className="bd-sheet-id">{derived.name}</code></div>
      <div className="bd-wide"><Expression draft={draft} label="Expression" source={derived.expression} exclude={derived.name} write={expression=>editDerived({expression})}/></div>
      <Field title="Formula unit" value={derived.unit ?? ''} onChange={e=>editDerived({unit:e.target.value})}/>
    </div>
    <footer className="bd-dialog-actions">
      <button className="bd-danger" onClick={()=>removeNode({relations:relations.filter(v=>v!==derived)})}><Trash2 size={14}/> Remove formula</button>
      {done}
    </footer>
  </>
  const footer = done && <footer className="bd-dialog-actions">{done}</footer>
  if (selected === 'formula') return <><Expression draft={draft} change={change}/>{footer}</>
  if (selected === 'event') return <><EventFields draft={draft} change={change}/>{footer}</>
  if (selected === 'metric') return <><p className="bd-note">The event probability is the fraction of independent replications meeting the threshold condition, reported with a 95% Wilson interval. It uses {draft.samples || '—'} replications with seed {draft.seed || '—'}; change them in the toolbar.</p>{footer}</>
  return <><ModelQuestion draft={draft} change={change}/><Settings draft={draft} change={change}/>{footer}</>
}

// Patch that switches an input to another distribution with its default parameters.
function distributionPatch(distribution) {
  return {distribution,...Object.fromEntries(slotKeys.map((key,i)=>[key,families[distribution].defaults[i]?.toString()]))}
}
// Patch that renames an input and rewrites every formula that refers to it.
function renamePatch(draft, oldName, newName) {
  const sub = expr => expr?.replace(new RegExp(`\\b${oldName}\\b`,'g'), newName)
  return {inputs:draft.inputs.map(v => v.name === oldName ? {...v,name:newName} : v),
    expression:sub(draft.expression),relations:draft.relations?.map(r=>({...r,expression:sub(r.expression)}))}
}

function Step({n, title, hint, action, children}) {
  return <section className="bd-sheet-step">
    <header className="bd-sheet-step-head">
      <span className="bd-sheet-num">{n}</span>
      <div><h3>{title}</h3>{hint && <p className="bd-hint">{hint}</p>}</div>
      {action && <div className="bd-sheet-step-action">{action}</div>}
    </header>
    {children}
  </section>
}

// Compact column labels for the table; the full label stays as tooltip and accessible name.
const shortLabel = label => label.replace(/standard deviation/i, 'SD').replace(/^Success probability$/, 'Success prob.')
function ParamCells({input, change, short}) {
  const list = isListLaw(input.distribution)
  return <div className={'bd-sheet-params'+(list?' bd-sheet-params-list':'')}>{families[input.distribution].fields.map((label,i) =>
    <label key={label} className="bd-sheet-param" title={label}><span>{list ? 'Values' : short ? shortLabel(label) : label}</span>
      <input inputMode={list?'text':'decimal'} maxLength={list?8192:128} aria-label={label} placeholder={list ? String(families[input.distribution].defaults[0]) : undefined}
        value={input[slotKeys[i]] ?? ''} onChange={e => change({[slotKeys[i]]: e.target.value})}/></label>)}</div>
}

// Spreadsheet-style setup: the whole model on one page, in the order it is evaluated.
export function SetupTable({draft, change, selected, select, add, addFormula}) {
  const relations = draft.relations || []
  const names = [...draft.inputs,...relations].map(v => v.name)
  const editInput = (input, patch) => change({inputs:draft.inputs.map(v => v === input ? {...v,...patch} : v)})
  const editDerived = (derived, patch) => change({relations:relations.map(v => v === derived ? {...v,...patch} : v)})
  const removed = name => { if (selected === name) select('formula') }
  return <div className="bd-sheet">
    <Step n={1} title="Question" hint="What decision should this simulation inform?">
      <div className="bd-sheet-card bd-sheet-pad"><ModelQuestion draft={draft} change={change}/></div>
    </Step>

    <Step n={2} title="Inputs" hint="Each uncertain quantity gets a fresh random value in every replication. Use Constant for fixed values."
      action={<button className="bd-add bd-add-input" disabled={draft.inputs.length >= 32} onClick={add}><Plus size={14}/> Add input</button>}>
      <div className="bd-sheet-card bd-sheet-table-wrap">
        {draft.inputs.length ? <table className="bd-sheet-table">
          <thead><tr><th>Name</th><th>Identifier</th><th>Distribution</th><th>Parameters</th><th>Unit</th><th><span className="bd-sr">Actions</span></th></tr></thead>
          <tbody>{draft.inputs.map(input => <tr key={input.name} className={(selected === input.name ? 'bd-row-selected ' : '') + (input.distribution === 'constant' ? 'bd-row-constant' : 'bd-row-input')} onFocus={() => select(input.name)}>
            <td><input className="bd-cell" aria-label="Display name" maxLength={80} value={input.label} onChange={e => editInput(input,{label:e.target.value})}/></td>
            <td><IdentifierInput key={input.name} name={input.name} usedNames={names.filter(n => n !== input.name)} rename={(from,to) => { change(renamePatch(draft,from,to)); select(to) }}/></td>
            <td><select className="bd-cell" aria-label="Distribution" value={input.distribution} onChange={e => editInput(input,distributionPatch(e.target.value))}>
              {Object.entries(families).map(([key,v]) => <option key={key} value={key}>{v.title}</option>)}</select></td>
            <td><ParamCells short input={input} change={patch => editInput(input,patch)}/></td>
            <td><input className="bd-cell bd-cell-unit" aria-label="Input unit" maxLength={40} value={input.unit ?? ''} onChange={e => editInput(input,{unit:e.target.value})}/></td>
            <td className="bd-sheet-actions">
              <button aria-label={'Duplicate '+input.label} title="Duplicate" disabled={draft.inputs.length >= 32} onClick={() => {
                const copy = {...input, name:newInput([...draft.inputs,...relations]).name, label:input.label + ' copy'}
                change({inputs:[...draft.inputs,copy]}); select(copy.name)
              }}><Copy size={14}/></button>
              <button aria-label={'Remove '+input.label} title="Remove" onClick={() => { change({inputs:draft.inputs.filter(v => v !== input)}); removed(input.name) }}><Trash2 size={14}/></button>
            </td>
          </tr>)}</tbody>
        </table> : <p className="bd-empty">No inputs yet. Add one to describe an uncertain quantity.</p>}
      </div>
    </Step>

    <Step n={3} title="Calculation" hint="Combine inputs into the output. Intermediate formulas are optional named steps you can reuse."
      action={<button className="bd-add bd-add-formula" disabled={relations.length >= 24} onClick={addFormula}><Plus size={14}/> Add formula</button>}>
      {relations.length > 0 && <div className="bd-sheet-card bd-sheet-table-wrap">
        <table className="bd-sheet-table">
          <thead><tr><th>Name</th><th>Identifier</th><th>Expression</th><th>Unit</th><th><span className="bd-sr">Actions</span></th></tr></thead>
          <tbody>{relations.map(derived => <tr key={derived.name} className={(selected === derived.name ? 'bd-row-selected ' : '') + 'bd-row-formula'} onFocus={() => select(derived.name)}>
            <td><input className="bd-cell" aria-label="Formula name" value={derived.label} onChange={e => editDerived(derived,{label:e.target.value})}/></td>
            <td><code className="bd-sheet-id">{derived.name}</code></td>
            <td><input className="bd-cell bd-cell-mono bd-cell-expr" aria-label={'Expression for '+derived.label} maxLength={512} value={derived.expression} onChange={e => editDerived(derived,{expression:e.target.value})}/></td>
            <td><input className="bd-cell bd-cell-unit" aria-label="Formula unit" value={derived.unit ?? ''} onChange={e => editDerived(derived,{unit:e.target.value})}/></td>
            <td className="bd-sheet-actions"><button aria-label={'Remove '+derived.label} title="Remove" onClick={() => { change({relations:relations.filter(v => v !== derived)}); removed(derived.name) }}><Trash2 size={14}/></button></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <div className="bd-sheet-card bd-sheet-pad"><Expression draft={draft} change={change}/></div>
    </Step>

    <Step n={4} title="Event" hint="The simulation estimates how often this happens.">
      <div className="bd-sheet-card bd-sheet-pad"><EventFields draft={draft} change={change}/></div>
      <p className="bd-hint">Result: the event probability with a 95% Wilson interval, from {draft.samples || '—'} replications with seed {draft.seed || '—'} (set both in the toolbar).</p>
    </Step>
  </div>
}

export function ResultsPanel({run, stale, open, onToggle, height, onResizeStart, onResizeMove, onResizeEnd}) {
  return <section className={'bd-panel bd-results-bottom'+(open?' bd-results-open':'')} style={open && height && run ? {height:height+'px'} : undefined}>
    {open && run && <div className="bd-resize-handle" onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} onPointerCancel={onResizeEnd}/>}
    <header className="bd-panel-head"><h2><ChartNoAxesColumnIncreasing size={17}/> Experiment results</h2>
      <div className="bd-tools"><button onClick={onToggle} aria-label={open?'Hide results':'Show results'} title={open?'Hide results':'Show results'}>{open ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}</button></div></header>
    {open && <div className="bd-pad bd-results-body"><Results run={run} stale={stale}/></div>}
  </section>
}
export function Issues({issues}) {
  return issues.length ? <ul className="bd-issues">{issues.map((m,i) => <li key={i}>{m}</li>)}</ul> : <p className="bd-valid">Model validated. Ready to run.</p>
}
const exportGroups = [
  {title:'Code', hint:'Re-run the model outside the lab.', items:[
    {id:'notebook',label:'Notebook',ext:'.ipynb',hint:'Jupyter or Google Colab',icon:NotebookText,needsValid:true},
    {id:'python',label:'Python script',ext:'.py',hint:'NumPy / SciPy',icon:FileCode,needsValid:true},
    {id:'r',label:'R script',ext:'.R',hint:'Base R stats package',icon:FileCode,needsValid:true},
  ]},
  {title:'Project', hint:'Back up the model or move it to another device.', items:[
    {id:'project',label:'Project file',ext:'.json',hint:'Model and recorded run; open it with Import',icon:FileJson},
  ]},
  {title:'Run data', hint:'Results of the recorded run.', items:[
    {id:'csv',label:'Sample table',ext:'.csv',hint:'Captured replications',icon:FileSpreadsheet,needsRun:true},
    {id:'chart',label:'Convergence chart',ext:'.svg',hint:'Running mean over replications',icon:ChartLine,needsRun:true},
    {id:'zip',label:'Run bundle',ext:'.zip',hint:'Reproducible package with notebook',icon:FileArchive,needsRun:true},
  ]},
]
export function ExportPanel({run, issues, exportFile, working}) {
  const r = run?.result
  return <div className="bd-export">
    <p className="bd-export-status">{r?.n ? <>Recorded run · seed {run.model.seed} · {r.n.toLocaleString()} replications{r.status!=='complete'?' (partial)':''}</> : 'No recorded run yet. Run the model to unlock run data.'}</p>
    {exportGroups.map(group => <section key={group.title} className="bd-export-group">
      <header><h3>{group.title}</h3><p>{group.hint}</p></header>
      <div className="bd-export-list">{group.items.map(item => {
        const {id,label,ext,hint,needsRun,needsValid} = item
        const blocked = needsRun ? !r?.n : needsValid ? issues.length > 0 : false
        const reason = needsRun ? 'Run the model first' : 'Fix validation issues first'
        return <button key={id} className="bd-export-row" disabled={blocked || working} onClick={() => exportFile(id)}>
          <span className="bd-export-icon"><item.icon size={17}/></span>
          <span className="bd-export-text"><strong>{label}</strong><small>{blocked ? reason : hint}</small></span>
          <code>{ext}</code>
          <Download size={15} className="bd-export-dl" aria-hidden="true"/>
        </button>
      })}</div>
    </section>)}
    {!!issues.length && <Issues issues={issues}/>}
  </div>
}
const kindIcons = {input:Activity, constant:Equal, formula:FunctionSquare, output:FunctionSquare, event:Binary, metric:ChartNoAxesColumnIncreasing, question:Settings2}
export function Dialog({title, kind, close, children}) {
  const Icon = kindIcons[kind]
  const dialog = useRef(null)
  useEffect(() => { const d = dialog.current; d.showModal(); return () => d.close() }, [])
  return <dialog ref={dialog} className="bd-dialog" aria-label={title} onCancel={e => {e.preventDefault();close()}}>
    <header className={'bd-panel-head bd-dialog-head' + (kind ? ' bd-kind-' + kind : '')}>
      <div>{kind && <small className="bd-dialog-kind"><Icon size={13}/> {kindNames[kind]}</small>}<h2>{title}</h2></div>
      <button className="bd-dialog-close" onClick={close} aria-label="Close dialog"><X size={16}/></button></header>
    <div className="bd-pad">{children}</div></dialog>
}
export function NodeDialog({draft, selected, change, select, close}) {
  return <Dialog title={nodeTitle(draft, selected)} kind={nodeKind(draft, selected)} close={close}>
    <NodeEditor draft={draft} selected={selected} change={change} select={select} close={close}/></Dialog>
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
