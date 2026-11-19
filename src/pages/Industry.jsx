import { Workflow } from 'lucide-react'
import { itModels, openModel } from '../itModels'

const levels = ['Beginner', 'Intermediate', 'Advanced']

export default function Industry() {
  return <div className="overview">
    <h1>Simulation Examples</h1>
    <p className="intro">{itModels.length} ready-to-run Monte Carlo models for budgets, revenue, risk and IT operations — arranged from beginner to advanced. Open one in the Builder to explore its assumptions, tweak the inputs and run it.</p>

    {levels.map(level => {
      const models = itModels.filter(m => m.level === level)
      if (!models.length) return null
      return <section key={level} className="home-section">
        <h2 className="home-section-heading">{level}</h2>
        <div className="it-model-grid">
          {models.map(m => <article className="it-model-card" key={m.id}>
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
    })}
  </div>
}
