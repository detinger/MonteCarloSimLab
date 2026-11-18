import {setPrecision,setTheme,usePrecision,useTheme} from '../components/preferences'
import '../styles/analysis.css'

export default function Settings(){
  const theme=useTheme(),precision=usePrecision()
  return <div className="research-page help-page"><h1>Settings</h1><p className="intro">Choose how experiments appear in this browser.</p><section className="research-panel">
    <h2>Display preferences</h2>
    <label>Color mode<select value={theme} onChange={e=>setTheme(e.target.value)}><option value="system">Follow system</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
    <label>Numeric result precision<select value={precision} onChange={e=>setPrecision(e.target.value)}><option value="default">Experiment default</option>{[4,6,8].map(d=><option key={d} value={d}>{d} significant digits</option>)}</select></label>
    <p>Precision applies to estimates in the simulation and Builder results. Exports retain the underlying values.</p>
  </section></div>
}
