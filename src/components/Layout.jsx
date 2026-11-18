import {setTheme,useTheme} from './preferences'
import { useState } from 'react'
import { ChevronRight, Monitor, Moon, Sun, House } from 'lucide-react'
import Navigation from './Navigation'
import '../App.css'

export default function Layout({children,active,title}) {
  const [collapsed,setCollapsed]=useState(false)
  const theme=useTheme()
  const Icon=theme==='dark'?Moon:theme==='light'?Sun:Monitor
  return <div className="lab-shell">
    <a className="skip-link" href="#workspace" onClick={e=>{e.preventDefault();document.querySelector('#workspace').focus()}}>Skip to workspace</a>
    <Navigation active={active} collapsed={collapsed} toggle={()=>setCollapsed(!collapsed)}/>
    <div className="work-area">
      <header className="workspace-bar">
        <div>
          {active!=='overview'&&<a className="home-btn" href="#/overview" title="Go to home" aria-label="Home"><House size={15}/></a>}
          {active!=='overview'&&<ChevronRight size={14}/>}
          <b>{title}</b>
        </div>
        <label className="theme-choice"><Icon size={16}/><select aria-label="Color theme" value={theme} onChange={e=>setTheme(e.target.value)}><option value="system">System theme</option><option value="light">Light theme</option><option value="dark">Dark theme</option></select></label>
      </header>
      <main id="workspace" tabIndex="-1" className="workspace-main">{children}</main>
    </div>
  </div>
}
