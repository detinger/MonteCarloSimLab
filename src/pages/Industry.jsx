import { ArrowRight, Workflow, Trophy } from 'lucide-react'
import { itModels, buildModel } from '../itModels'
import { saveProject } from './builder/project'

async function openModel(m) {
  const draft = buildModel(m)
  const record = { id: draft.id, project: draft, run: null, updatedAt: new Date().toISOString() }
  try {
    await saveProject(record, null)
    window.dispatchEvent(new Event('mc-project-change'))
    sessionStorage.setItem('mc-builder-open', draft.id)
  } catch { /* storage unavailable — the Builder opens a blank model instead */ }
  window.dispatchEvent(new CustomEvent('mc-builder-open', { detail: draft.id }))
  window.location.assign('#/builder')
}

export default function Industry() {
  return <div className="overview">
    <h1>IT Industry Models</h1>
    <p className="intro">Ten ready-to-run Monte Carlo models for cloud, delivery, security and IT operations. Open one in the Builder to explore its assumptions, tweak the inputs and run it.</p>

    <section className="home-section">
      <h2 className="home-section-heading">Models</h2>
      <div className="it-model-grid">
        {itModels.map(m => <article className="it-model-card" key={m.id}>
          <div className="it-model-head">
            <div className="it-model-icon"><m.icon size={20}/></div>
            <div><small>{m.code} · {m.field}</small><h3>{m.name}</h3></div>
          </div>
          <p>{m.description}</p>
          <p className="it-model-q">{m.question}</p>
          <button className="action-primary" onClick={() => openModel(m)}><Workflow size={15}/> Open in Builder</button>
        </article>)}
      </div>
    </section>

    <section className="home-section">
      <h2 className="home-section-heading"><Trophy size={18}/> Challenges</h2>
      <p className="intro">Each model comes with a challenge. Open it, make the change and re-run to check the probability.</p>
      <div className="it-challenge-list">
        {itModels.map(m => <div className="it-challenge" key={m.id}>
          <div className="it-challenge-icon"><m.icon size={17}/></div>
          <div className="it-challenge-body"><small>{m.code} · {m.name}</small><p>{m.challenge}</p></div>
          <button onClick={() => openModel(m)}>Try it <ArrowRight size={14}/></button>
        </div>)}
      </div>
    </section>
  </div>
}
