import { GraduationCap, Trophy, SlidersHorizontal, BookOpen, LayoutDashboard, Workflow, FlaskConical, Building2, Target, Signpost, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import {createElement} from 'react'

export default function Navigation({active, collapsed, toggle}) {
  const link = (id, label, icon) => <a key={id} href={'#/'+id} className={'side-link '+(active===id?'selected':'')} aria-current={active===id?'page':undefined} title={label}>{createElement(icon,{size:17})}<span>{label}</span></a>
  return <aside className={'rail '+(collapsed?'collapsed':'')}>
    <a className="brand" href="#/overview" aria-label="Monte Carlo Lab overview"><img className="brand-mark" src={import.meta.env.BASE_URL+'favicon.svg'} alt="" width="30" height="30"/><b>Monte Carlo Lab</b></a>
    <nav aria-label="Main navigation">
      {link('overview','Home',LayoutDashboard)}
      <h2>Learning</h2>
      {link('theory','Theory & Concepts',BookOpen)}
      {link('lessons','Lessons',GraduationCap)}
      {link('labs','Examples',FlaskConical)}
      {link('challenges','Challenges',Trophy)}
      <h2>Workspace</h2>
      {link('builder','Simulation Builder',Workflow)}
      {link('industry','Simulation Examples',Building2)}
      {link('simchallenges','Simulation Challenges',Target)}
      <h2>Distributions</h2>
      {link('distributions','Distribution Studio',SlidersHorizontal)}
      {link('helper','Distribution Helper',Signpost)}
    </nav>
    <button className="collapse-control" onClick={toggle} title={collapsed?'Expand navigation':'Collapse navigation'} aria-label={collapsed?'Expand navigation':'Collapse navigation'}>{collapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}<span>Collapse sidebar</span></button>
  </aside>
}
