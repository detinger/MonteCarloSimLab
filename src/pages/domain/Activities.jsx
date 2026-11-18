import {durationFamilies,sequentialActivities} from '../../engine/schedule.js'

const familyDefaults={constant:[10],lognormal:[10,.2],triangular:[5,10,20],pert:[5,10,20],truncated:[10,2]}
export default function Activities({draft,patch}){
  const tasks=draft.activities
  if(!tasks)return <button onClick={()=>patch('activities',sequentialActivities(draft.params))}>Edit activities and dependencies</button>
  const change=(id,update)=>patch('activities',tasks.map(t=>t.id===id?{...t,...update}:t))
  function add(){
    let i=1
    while(tasks.some(t=>t.id==='task'+i))i++
    patch('activities',[...tasks,{id:'task'+i,label:'Activity '+i,distribution:'constant',a:10,dependsOn:[]}])
  }
  return <div className="schedule-editor">
    {tasks.map(t=><details key={t.id} open={tasks.length<=3}><summary>{t.label||t.id} · {t.dependsOn.length?'after '+t.dependsOn.join(', '):'starts at day 0'}</summary>
      <label>Activity name<input value={t.label} maxLength={100} onChange={e=>change(t.id,{label:e.target.value})}/></label>
      <label>Duration distribution<select value={t.distribution} onChange={e=>{
        const distribution=e.target.value,[a,b,c]=familyDefaults[distribution]
        change(t.id,{distribution,a,b,c})
      }}>{Object.entries(durationFamilies).map(([k,[label]])=><option key={k} value={k}>{label}</option>)}</select></label>
      {durationFamilies[t.distribution][1].map((label,i)=>{
        const key='abc'[i]
        return <label key={key}>{label}<input inputMode="decimal" value={t[key]} onChange={e=>change(t.id,{[key]:e.target.value})}/></label>
      })}
      <strong>Starts after</strong>
      {tasks.filter(pred=>pred.id!==t.id).map(pred=><label key={pred.id} className="schedule-pred"><input type="checkbox" checked={t.dependsOn.includes(pred.id)} onChange={e=>change(t.id,{dependsOn:e.target.checked?[...t.dependsOn,pred.id]:t.dependsOn.filter(id=>id!==pred.id)})}/>{pred.label} ({pred.id})</label>)}
      <button disabled={tasks.length===1} onClick={()=>patch('activities',tasks.filter(other=>other.id!==t.id).map(other=>({...other,dependsOn:other.dependsOn.filter(id=>id!==t.id)})))}>Remove activity</button>
    </details>)}
    <button disabled={tasks.length>=32} onClick={add}>Add activity</button>
  </div>
}
