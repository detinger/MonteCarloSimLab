import {curriculum} from '../learning/curriculum'
export default function RelatedLearning({id}) {
  const entries=curriculum.filter(e=>e.labs.includes(id))
  if(!entries.length) return null
  return <aside className="related-learning"><h2>Related learning</h2>{entries.map(e=><div key={e.id}><a href={'#/lessons/'+e.id}>{e.title}</a><a href={'#/challenges/'+e.challengeId}>{e.challenge} →</a></div>)}</aside>
}
