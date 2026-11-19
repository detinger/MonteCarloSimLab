import { ArrowRight } from 'lucide-react'
import { itModels, openModel } from '../itModels'

const challenges = itModels.filter(m => m.challenge)
const levels = ['Beginner', 'Intermediate', 'Advanced']

export default function SimChallenges() {
  return <div className="overview">
    <h1>Simulation Challenges</h1>
    <p className="intro">{challenges.length} what-if exercises built on the Simulation Examples. Open a model in the Builder, make the change described, re-run it and check the probability.</p>

    {levels.map(level => {
      const group = challenges.filter(m => m.level === level)
      if (!group.length) return null
      return <section key={level} className="home-section">
        <h2 className="home-section-heading">{level}</h2>
        <div className="it-challenge-list">
          {group.map(m => <div className="it-challenge" key={m.id}>
            <div className="it-challenge-icon"><m.icon size={17}/></div>
            <div className="it-challenge-body"><small>{m.code} · {m.name}</small><p>{m.challenge}</p></div>
            <button onClick={() => openModel(m)}>Try it <ArrowRight size={14}/></button>
          </div>)}
        </div>
      </section>
    })}
  </div>
}
