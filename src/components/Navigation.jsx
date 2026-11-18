import { Settings, Download, ListChecks, CircleHelp, FolderOpen, GraduationCap, Trophy, SlidersHorizontal, ChartColumn, GitCompareArrows, Activity, BookOpen, LayoutDashboard, Workflow, FlaskConical, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import {createElement} from 'react'
import { labs } from '../catalog'

export default function Navigation({active, collapsed, toggle}) {
  const link = (id, label, icon) => <a key={id} href={'#/'+id} className={'side-link '+(active===id?'selected':'')} aria-current={active===id?'page':undefined} title={label}>{createElement(icon,{size:17})}<span>{label}</span></a>
  return <aside className={'rail '+(collapsed?'collapsed':'')}>
    <a className="brand" href="#/overview" aria-label="Monte Carlo Lab overview"><span className="brand-mark"><Activity size={23}/></span><b>Monte Carlo Lab</b></a>
    <nav aria-label="Main navigation">
      <h2>Workspace</h2>
      {link('overview','Overview',LayoutDashboard)}
      {link('builder','Simulation Builder',Workflow)}
      {link('labs','Simulation Lab',FlaskConical)}
      {link('distributions','Distribution Studio',SlidersHorizontal)}
      {link('experiments','Experiment Runner',ListChecks)}
      {link('analysis','Analysis',ChartColumn)}
      {link('compare','Compare',GitCompareArrows)}
      {link('projects','Saved projects',FolderOpen)}
      {link('exports','Export center',Download)}
      <h2>Learning</h2>
      {link('lessons','Lessons',GraduationCap)}
      {link('challenges','Challenges',Trophy)}
      {link('theory','Theory & Concepts',BookOpen)}
      {link('help','Lab guide',CircleHelp)}
      {link('settings','Settings',Settings)}
      <h2>Original simulations</h2>
      {labs.slice(0,7).map(l=>link(l.id,l.name.replace(' (GBM)','').replace(' & Risk','').replace(' Quality Control',' Quality'),l.icon))}
    </nav>
    <button className="collapse-control" onClick={toggle} title={collapsed?'Expand navigation':'Collapse navigation'} aria-label={collapsed?'Expand navigation':'Collapse navigation'}>{collapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}<span>Collapse sidebar</span></button>
  </aside>
}
