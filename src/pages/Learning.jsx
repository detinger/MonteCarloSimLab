import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Download, Lightbulb, Search, Trophy } from 'lucide-react'
import { Latex } from '../components/ui/Latex'
import { labs } from '../catalog'
import { curriculum } from '../learning/curriculum.js'
import { assessFields, checkedNotebook, checkModelRecord, coinTrace, demonstration, factoryTrials, tasks } from '../learning/activities.js'
import { allProgress,updateProgress } from '../learning/progress.js'
import { defaults } from '../domains/newExamples.js'
import { portable } from '../domains/newExports.js'
import { compile,download,loadProjects } from './builder/project.js'
import '../styles/learning.css'

const formulae=[
 'E[H]=np','F(x)=P(X\\leq x)','\\hat\\pi=4k/n','\\hat I=(b-a)\\overline{f(X)}',
 '\\hat p=k/n','P(\\mathrm{switch\\ wins})=1-P(\\mathrm{initial\\ win})',
 'E[R_N^2]=N','S_T=S_0 e^{(\\mu-\\sigma^2/2)T+\\sigma\\sqrt{T}Z}',
 'T=\\max(T_1,T_2)+T_3','R_{series}=\\prod_i R_i',
 '\\hat p=\\frac{1}{n}\\sum_i \\mathbf{1}(C_i>B)','\\overline{\\Delta}=\\frac{1}{n}\\sum_i (C_{i,A}-C_{i,B})'
]
const checks=[
 ['Which replay preserves the first twelve flips?','Same model, seed and engine','Same number of displayed charts','Any seed with a fair coin',0,'A fixed seed and unchanged generator reproduce the stream.'],
 ['Which function reports P(duration ≤ 4)?','Probability density','Cumulative distribution','A histogram bin height',1,'The CDF accumulates all probability at and below the cutoff.'],
 ['When more darts are added, what happens?','Error always shrinks','Every run ends at π','Typical sampling fluctuations decrease',2,'Convergence permits temporary movements away from the reference.'],
 ['How should negative function values enter the estimate?','With their original signs','As absolute values','As zeros',0,'A signed integral subtracts area below the horizontal axis.'],
 ['What does a 95% confidence interval describe?','The range of 95% of all coin flips','Repeated-sampling coverage of a fixed parameter','A guarantee for this interval',1,'Coverage is a property of the interval procedure over repeated independent experiments.'],
 ['When does switching win?','Whenever the initial choice was right','For either initial choice equally often','Whenever the initial choice was wrong',2,'The informed reveal eliminates the only other goat when the first choice was a goat.'],
 ['Which data estimate endpoint spread?','Final positions of independent walks','Frames of one stationary drawing','A single walker’s initial position',0,'Each independent completed path contributes one endpoint.'],
 ['Which measures model outcome spread?','Standard error of mean price','Quantiles of terminal prices','The number of time steps',1,'Terminal quantiles describe variation across modeled paths.'],
 ['When can a task with two required predecessors start?','At the average of their finish dates','When either task starts','Once both tasks finish',2,'The latest predecessor finish determines the earliest start.'],
 ['Which assumption supports multiplying component reliabilities?','Independent survival events','Identical labels','Equal sample counts',0,'Independence factorizes the joint survival probability.'],
 ['What if a formula references one cost twice?','Two independent costs are drawn','Both references share one draw','The second reference is ignored',1,'A named random input is sampled once per replication.'],
 ['How should paired inventory costs be compared?','Compare the first two days only','Ignore the demand path','Average within-path cost differences',2,'Pairing aligns the demand shocks that affect the two policies.'],
]
const labName=id=>id==='builder'?'Simulation Builder':labs.find(v=>v.id===id)?.name || id
function selector(mode) {
  const [base,id]=(window.location.hash.slice(1)||window.location.pathname).replace(/^\//,'').split('/')
  return base===mode ? id || '' : ''
}
function Links({lesson}) {
  return <div className="learn-links">{lesson.labs.map(id=><a key={id} href={'#/'+id}>{labName(id)} <ArrowRight size={13}/></a>)}</div>
}
function Knowledge({entry,index,record,save}) {
  const q=checks[index], [choice, setChoice]=useState(record?.choice ?? '')
  const [feedback,setFeedback]=useState(null)
  return <section className="learn-card"><h2>Knowledge check</h2><fieldset><legend>{q[0]}</legend>{q.slice(1,4).map((v,i)=><label key={v} className="learn-option"><input type="radio" name={entry.id} checked={choice===String(i)} onChange={()=>{setChoice(String(i));setFeedback(null)}}/>{v}</label>)}</fieldset>
    <button disabled={choice===''} onClick={()=>{const passed=choice===String(q[4]);setFeedback(passed);save({choice},{passed,answers:{choice}})}}>Check answer</button>
    {feedback!==null&&<p role="status" className={feedback?'learn-correct':'learn-revise'}>{feedback?'Correct. ':'Review your choice. '}{q[5]}</p>}</section>
}
function Lesson({entry,index,record,save}) {
  const [value,setValue]=useState(record?.control ?? String(entry.control.initial))
  const [note,setNote]=useState(record?.reflection ?? '')
  const [noteSaved,setNoteSaved]=useState(false)
  const {label,min,max}=entry.control
  const valid=value.trim()!==''&&Number.isInteger(Number(value))&&Number(value)>=min&&Number(value)<=max
  return <div className="learn-article"><section className="learn-card"><h2>Why it matters</h2><p>{entry.theory}</p><div className="learn-formula"><Latex math={formulae[index]}/></div><h3>Worked example</h3><p>{entry.worked}</p></section>
    <section className="learn-card"><h2>Try it</h2><label className="learn-field">{label}<input type="number" value={value} min={min} max={max} onChange={e=>setValue(e.target.value)} onBlur={()=>save({control:value})}/></label>
      <output className="learn-observed">{valid?demonstration(entry.id,Number(value)):'Enter a whole number between '+min+' and '+max+'.'}</output><Links lesson={entry}/></section>
    <section className="learn-card"><h2>Common mistake</h2><p>{entry.mistake}</p><h3>Reflection</h3><label className="learn-field">{entry.reflection}<textarea value={note} maxLength={1500} onChange={e=>{setNote(e.target.value);setNoteSaved(false)}}/></label>
      <button onClick={async()=>{if(await save({reflection:note}))setNoteSaved(true)}}>Save reflection</button>{noteSaved&&<small role="status">Reflection saved locally.</small>}</section>
    <Knowledge entry={entry} index={index} record={record} save={save}/>
    <a className="learn-next" href={'#/challenges/'+entry.challengeId}><Trophy size={17}/>{entry.challenge}<ArrowRight size={16}/></a></div>
}
function Challenge({entry,index,record,save}) {
  const spec=tasks[index]
  const [answers,setAnswers]=useState(record?.answers || {})
  const [feedback,setFeedback]=useState(null)
  const [hints,setHints]=useState(0)
  const [seeds,setSeeds]=useState(['42','43'])
  const [traces,setTraces]=useState([null,null])
  const [factory,setFactory]=useState(null)
  const [projects,setProjects]=useState([])
  const [recordId,setRecordId]=useState('')
  const [point,setPoint]=useState('18')
  const [notebook,setNotebook]=useState(null)
  const [error,setError]=useState('')
  const p={...defaults('inventory'),alternate:Number(point),samples:100}
  const pointOK=point.trim()!==''&&Number.isInteger(p.alternate)&&p.alternate>=0&&p.alternate<=40&&p.alternate!==p.point
  useEffect(()=>{
    if(index!==10)return
    let active=true
    const refresh=()=>loadProjects().then(rows=>{if(active)setProjects(rows.filter(r=>r.run?.result.status==='complete'))}).catch(e=>{if(active)setError(e.message)})
    refresh();window.addEventListener('mc-project-change',refresh)
    return ()=>{active=false;window.removeEventListener('mc-project-change',refresh)}
  },[index])
  function edit(key,value){
    const next={...answers,[key]:value};setAnswers(next);setFeedback(null);save({answers:next})
  }
  async function grade() {
    setError('')
    const result=assessFields(spec.fields,answers)
    const evidence={}
    if(index===0) {
      const [a,b]=traces
      result.push({ok:!!a&&!!b&&a.seed===b.seed&&a.trace===b.trace,text:'Run both 12-flip experiments with identical seeds and traces.'})
      evidence.traces=traces
    }
    if(index===9){
      result.push({ok:!!factory && factory.alternative>=factory.baseline&&factory.alternative<=100,text:'Run the paired 1,000-day factory comparison and inspect its output.'})
      evidence.factory=factory
    }
    if(index===10){
      const row=projects.find(r=>r.id===recordId)
      let valid=false
      try { valid=!!row&&JSON.stringify(compile(row.project))===JSON.stringify(row.run.model)&&checkModelRecord(row) }catch{valid=false}
      result.push({ok:valid,text:valid?'Verified the saved model, 10,000 replication replay and trace.':'Select a current, completed EUR model summing three distinct random costs, with threshold 200000 and 10,000 replications.'})
      evidence.projectId=recordId
    }
    if(index===11){
      result.push({ok:pointOK&&!!notebook&&checkedNotebook(notebook,portable(p).ipynb,p),text:'Match the inventory model, changed reorder point and successful notebook outputs.'})
      evidence.point=p.alternate;evidence.notebookVerified=result.at(-1).ok
    }
    const passed=result.every(r=>r.ok)
    setFeedback(result);await save({answers},{passed,answers:{...answers,...evidence}})
  }
  function reset() {
    setAnswers({});setFeedback(null);setHints(0);setTraces([null,null]);setSeeds(['42','43']);setError('');setFactory(null);setPoint('18');setNotebook(null);setRecordId('');save({answers:{}})
  }
  return <div className="learn-article"><section className="learn-card"><h2>Your task</h2><p>{spec.task}</p><Links lesson={entry}/></section>
    <section className="learn-card"><h2>Experiment and assessment</h2>
      {index===0&&<div className="learn-traces">{seeds.map((s,i)=><div key={i}><label className="learn-field">{i===0?'First seed':'Replay seed'}<input type="number" value={s} onChange={e=>{setSeeds(seeds.map((x,j)=>i===j?e.target.value:x));setTraces(traces.map((x,j)=>i===j?null:x));setFeedback(null)}}/></label><button disabled={s.trim()===''||!Number.isInteger(Number(s))||Number(s)<0||Number(s)>4294967295} onClick={()=>setTraces(traces.map((x,j)=>i===j?{seed:Number(s),trace:coinTrace(Number(s))}:x))}>Run {i===0?'first':'replay'} experiment</button>{traces[i]&&<output>{traces[i].trace}</output>}</div>)}</div>}
      {index===9&&<><button onClick={()=>setFactory(factoryTrials())}>Compare 1,000 paired days</button>{factory&&<output>Baseline {factory.baseline.toFixed(2)} · Alternative {factory.alternative.toFixed(2)} good units/day</output>}</>}
      {index===10&&<label className="learn-field">Saved project<select value={recordId} onChange={e=>{setRecordId(e.target.value);setFeedback(null)}}><option value="">Select a completed project</option>{projects.map(r=><option key={r.id} value={r.id}>{r.project.title} · Seed {r.run.model.seed}</option>)}</select></label>}
      {index===11&&<><label className="learn-field">Alternative reorder point (0–40 units)<input type="number" value={point} onChange={e=>{setPoint(e.target.value);setFeedback(null);setNotebook(null)}}/></label>
        {pointOK?<output>{demonstration('L12',p.alternate)}</output>:<p>Choose a whole-number alternative from 0 to 40 that differs from the 10-unit baseline.</p>}
        <button disabled={!pointOK} onClick={()=>download('inventory-challenge.ipynb',portable(p).ipynb)}><Download size={15}/> Download inventory notebook</button>
        <label className="learn-field">Executed notebook<input type="file" accept=".ipynb" onChange={async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>12000000)throw Error('Use a notebook under 12 MB.');setNotebook(JSON.parse(await file.text()));setError('');setFeedback(null)}catch(err){setNotebook(null);setError(err.message)}}}/></label></>}
      {spec.fields.map(f=><label key={f.key} className="learn-field">{f.label}{f.options?<select value={answers[f.key]??''} onChange={e=>edit(f.key,e.target.value)}><option value="">Choose an answer</option>{f.options.map((v,i)=><option key={v} value={i}>{v}</option>)}</select>:<input value={answers[f.key]??''} inputMode="decimal" onChange={e=>edit(f.key,e.target.value)}/>}</label>)}
      <div className="learn-actions"><button className="learn-primary" onClick={grade}>Check my model</button><button onClick={reset}>Reset exercise</button></div>
      {error&&<p role="alert">{error}</p>}
      {feedback&&<div role="status" className={feedback.every(v=>v.ok)?'learn-correct':'learn-revise'}><strong>{feedback.every(v=>v.ok)?'Challenge completed':'Review your model'}</strong><ul>{feedback.map(v=><li key={v.text}>{v.ok?'Pass':'Revise'} · {v.text}</li>)}</ul></div>}</section>
    <section className="learn-card"><h2>Assessment criteria</h2><ul>{spec.rubric.map(s=><li key={s}>{s}</li>)}</ul>
      <button disabled={hints===3} onClick={()=>setHints(hints+1)}><Lightbulb size={15}/>{hints===3?'All hints shown':'Show hint '+(hints+1)+' of 3'}</button>
      {hints>0&&<ol>{spec.hints.slice(0,hints).map(h=><li key={h}>{h}</li>)}</ol>}</section>
    <a className="learn-next" href={'#/lessons/'+entry.id}><BookOpen size={17}/>{entry.title}<ArrowRight size={16}/></a></div>
}
export default function Learning({mode='lessons'}) {
  const isLesson=mode==='lessons',title=isLesson?'Lessons':'Challenges'
  const key=isLesson?'id':'challengeId'
  const [id,setId]=useState(()=>selector(mode))
  const [progress,setProgress]=useState({})
  const [ready,setReady]=useState(false)
  const [error,setError]=useState('')
  const [query,setQuery]=useState('')
  const [level,setLevel]=useState('')
  useEffect(()=>{
    let active=true
    const hash=()=>setId(selector(mode))
    const sync=()=>allProgress().then(x=>{if(active)setProgress(x)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setReady(true)})
    sync();hash()
    window.addEventListener('hashchange',hash);window.addEventListener('mc-learning-change',sync)
    return ()=>{active=false;window.removeEventListener('hashchange',hash);window.removeEventListener('mc-learning-change',sync)}
  },[mode])
  const index=curriculum.findIndex(v=>v[key]===id),entry=curriculum[index]
  const count=curriculum.filter(v=>progress[v[key]]?.completed).length
  async function save(patch,attempt){
    try{const record=await updateProgress(id,patch,attempt);setProgress(prev=>({...prev,[id]:record}));window.dispatchEvent(new Event('mc-learning-change'));return true}
    catch{setError('Progress could not be saved to local device storage.');return false}
  }
  if(entry) return <article className="learning"><a href={'#/'+mode} className="learn-back"><ArrowLeft size={14}/> All {mode}</a>
    <header><small>{entry[key]} · {entry.level}{isLesson?' · About 15 minutes':''}</small><h1>{isLesson?entry.title:entry.challenge}</h1><p>{entry.outcome}</p></header>
    {error&&<p role="status">{error}</p>}
    {ready&&(isLesson?<Lesson key={id} entry={entry} index={index} record={progress[id]} save={save}/>:<Challenge key={id} entry={entry} index={index} record={progress[id]} save={save}/>)}
    {!!progress[id]?.attempts.length&&<details className="learn-card"><summary>Attempt history ({progress[id].attempts.length})</summary><ol>{progress[id].attempts.slice().reverse().map((a,i)=><li key={i}>{new Date(a.at).toLocaleString()} · {a.passed?'Passed':'Needs revision'}</li>)}</ol></details>}</article>
  const filtered=curriculum.filter(v=>(!level||v.level===level)&&[v[key],v.title,v.challenge,v.outcome,...v.labs.map(labName)].join(' ').toLowerCase().includes(query.toLowerCase()))
  return <article className="learning"><header className="learning-head"><h1>{title}</h1><p className="learning-intro">{isLesson?'Explore probability and simulation through worked examples and editable experiments.':'Test your modeling decisions against reproducible experiments and analytical checks.'}</p></header>
    <div className="learn-filters"><label><Search size={15}/><input aria-label={'Search '+mode} type="search" placeholder={'Search '+mode} value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <select aria-label="Difficulty" value={level} onChange={e=>setLevel(e.target.value)}><option value="">All levels</option>{['intro','intermediate','advanced'].map(v=><option key={v}>{v}</option>)}</select><span>{count} of 12 complete</span></div>
    {error&&<p role="alert">{error}</p>}
    <div className="learn-grid">{filtered.map(v=><a className="learn-item" href={'#/'+mode+'/'+v[key]} key={v.id}><small>{v[key]} · {v.level}</small><h2>{isLesson?v.title:v.challenge}</h2><p>{v.outcome}</p><span>{progress[v[key]]?.completed?<><Check size={14}/> Completed</>:<>{isLesson?'Open lesson':'Open challenge'} <ArrowRight size={14}/></>}</span></a>)}</div>
    {!filtered.length&&<p>No {mode} match these filters.</p>}</article>
}
