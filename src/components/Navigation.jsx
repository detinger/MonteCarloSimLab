import { GraduationCap, Trophy, SlidersHorizontal, Activity, BookOpen, LayoutDashboard, Workflow, FlaskConical, Building2, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import {createElement} from 'react'

export default function Navigation({active, collapsed, toggle}) {
  const link = (id, label, icon) => <a key={id} href={'#/'+id} className={'side-link '+(active===id?'selected':'')} aria-current={active===id?'page':undefined} title={label}>{createElement(icon,{size:17})}<span>{label}</span></a>
  return <aside className={'rail '+(collapsed?'collapsed':'')}>
    <a className="brand" href="#/overview" aria-label="Monte Carlo Lab overview"><span className="brand-mark"><Activity size={23}/></span><b>Monte Carlo Lab</b></a>
    <nav aria-label="Main navigation">
      {link('overview','Home',LayoutDashboard)}
      <h2>Learning</h2>
      {link('theory','Theory & Concepts',BookOpen)}
      {link('lessons','Lessons',GraduationCap)}
      {link('labs','Examples',FlaskConical)}
      {link('challenges','Challenges',Trophy)}
      <h2>Workspace</h2>
      {link('builder','Simulation Builder',Workflow)}
      {link('industry','IT Models',Building2)}
      {link('distributions','Distribution Studio',SlidersHorizontal)}
    </nav>
    <button className="collapse-control" onClick={toggle} title={collapsed?'Expand navigation':'Collapse navigation'} aria-label={collapsed?'Expand navigation':'Collapse navigation'}>{collapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}<span>Collapse sidebar</span></button>
  </aside>
}
