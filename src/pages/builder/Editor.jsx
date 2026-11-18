import { useEffect, useRef, useState } from 'react'
import { Copy, Plus, Settings2, Trash2, X } from 'lucide-react'
import {slotKeys,isListLaw} from '../../engine/inputLaws.js'
import {comparators} from '../../engine/index.js'
import { createProject, families, issuesFor, newInput, template } from './project'

export function Field({ title, ...props }) {
  return <label className="bd-field"><span>{title}</span><input {...props}/></label>
}
export function InputFields({ input, change }) {
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
    <p className="bd-hint">Formula identifier <code>{input.name}</code></p>
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

export function Inspector({draft, selected, change, select, issues, run}) {
  const [tab, setTab] = useState('Configure')
  const input = draft.inputs.find(v => v.name === selected)
  const derived=draft.relations?.find(v=>v.name===selected)
  const editDerived=patch=>change({relations:draft.relations.map(v=>v===derived?{...v,...patch}:v)})
  const names = {formula:'Output formula',event:'Threshold event',metric:'Probability metric',question:'Project settings'}
  const editInput = patch => change({inputs:draft.inputs.map(v => v === input ? {...v,...patch} : v)})
  return <section className="bd-panel bd-inspector">
    <header className="bd-panel-head"><h2><Settings2 size={17}/> Inspector</h2>
      <button onClick={() => select('question')} aria-pressed={selected === 'question'}>Project</button></header>
    <div className="bd-pad"><h3>{input?.label || derived?.label || names[selected] || 'Project settings'}</h3>
      <div className="bd-tabs">{['Configure','Validate','Explain','Data'].map(t => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === 'Configure' && (input ? <>
        <InputFields input={input} change={editInput}/>
        <div className="bd-tools"><button disabled={draft.inputs.length >= 32} onClick={() => {
          const copy = {...input, name:newInput(draft.inputs).name, label:input.label + ' copy'}
          change({inputs:[...draft.inputs,copy]}); select(copy.name)
        }}><Copy size={14}/> Duplicate</button>
        <button onClick={() => {change({inputs:draft.inputs.filter(v => v !== input)});select('formula')}}><Trash2 size={14}/> Remove</button></div>
      </> : derived ? <>
        <Field title="Formula name" value={derived.label} onChange={e=>editDerived({label:e.target.value})}/>
        <Field title="Formula unit" value={derived.unit} onChange={e=>editDerived({unit:e.target.value})}/>
        <Expression draft={draft} source={derived.expression} exclude={derived.name} write={expression=>editDerived({expression})}/>
        <p className="bd-hint">Formula identifier <code>{derived.name}</code></p>
        <button onClick={()=>{change({relations:draft.relations.filter(v=>v!==derived)});select('formula')}}>Remove formula</button>
      </> : selected === 'formula' ? <Expression draft={draft} change={change}/> : selected === 'event' ?
        <EventFields draft={draft} change={change}/> :
        selected === 'metric' ? <><Settings draft={draft} change={change}/><p className="bd-hint">The event probability is the fraction of independent replications meeting the selected threshold condition.</p></> : <ModelQuestion draft={draft} change={change}/>)}
      {tab === 'Validate' && <Issues issues={issues}/>}
      {tab === 'Explain' && <p>{input ? input.distribution === 'constant' ? 'Every replication uses the same input value.' : 'The engine draws this input independently once per replication. Repeated references to its identifier use the same draw.' : selected === 'event' ? 'The threshold comparison determines whether outputs equal to the boundary are included.' : selected === 'metric' ? 'The Wilson interval measures sampling uncertainty in the event probability under the specified assumptions.' : 'The model evaluates the output formula for each set of inputs, then counts the outcomes meeting the threshold condition.'}</p>}
      {tab === 'Data' && <><p>{draft.assumptions || 'No assumptions recorded.'}</p><p className="bd-hint">Inputs are sampled independently. {run ? 'Inspect the saved run in the sample table below.' : 'Run the model to inspect sample values.'}</p></>}
    </div></section>
}
export function Issues({issues}) {
  return issues.length ? <ul className="bd-issues">{issues.map((m,i) => <li key={i}>{m}</li>)}</ul> : <p className="bd-valid">Model validated. Ready to run.</p>
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
