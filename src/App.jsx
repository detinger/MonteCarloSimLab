import { lazy, Suspense, useEffect, useState } from 'react'
import {usePrecision} from './components/preferences'
import Layout from './components/Layout'
import Overview, { Catalog } from './pages/Overview'
import RelatedLearning from './components/RelatedLearning'
import { labs } from './catalog'

const Learning=lazy(()=>import('./pages/Learning'))
const AdditionalLab=lazy(()=>import('./pages/AdditionalLab'))
const ModelAnalysis=lazy(()=>import('./pages/ModelAnalysis'))
const pages = {
  settings:lazy(()=>import('./pages/Settings')),
  help:lazy(()=>import('./pages/Help')),
  experiments:lazy(()=>import('./pages/Experiments')), exports:lazy(()=>import('./pages/ExportCenter')),
  projects:lazy(()=>import('./pages/Projects')),
  distributions:lazy(()=>import('./pages/DistributionStudio')),
  analysis:ModelAnalysis, compare:ModelAnalysis, lessons:Learning, challenges:Learning,
  ...Object.fromEntries(labs.slice(7).map(lab=>[lab.id,AdditionalLab])),
  overview: Overview, labs: Catalog, builder: lazy(()=>import('./pages/Builder')),
  theory: lazy(()=>import('./pages/Theory')), pi: lazy(()=>import('./pages/PiEstimation')),
  integration: lazy(()=>import('./pages/Integration')), montyhall: lazy(()=>import('./pages/MontyHall')),
  randomwalk: lazy(()=>import('./pages/RandomWalk')), stock: lazy(()=>import('./pages/StockPrediction')),
  projectmgmt: lazy(()=>import('./pages/ProjectManagement')), manufacturing: lazy(()=>import('./pages/Manufacturing')),
}
const titles = {overview:'Overview',labs:'Simulation Lab',builder:'Simulation Builder',theory:'Theory & Concepts',distributions:'Distribution Studio',analysis:'Analysis',compare:'Compare',lessons:'Lessons',challenges:'Challenges',projects:'Saved projects',help:'Lab guide',settings:'Settings',experiments:'Experiment Runner',exports:'Export center',...Object.fromEntries(labs.map(l=>[l.id,l.name]))}
function currentPage() {
  const path = (location.hash.slice(1) || location.pathname).replace(/^\/|\/$/g,'')
  const match = /^examples\/EX(0[1-9]|1[0-2])$/i.exec(path)
  const id = match ? labs[Number(match[1])-1].id : path.split('/')[0]
  return Object.hasOwn(pages,id) ? id : 'overview'
}
export default function App() {
  usePrecision()
  const [session,setSession]=useState(()=>({active:currentPage(),visited:[currentPage()]}))
  useEffect(()=>{
    function navigate() {
      const id=currentPage()
      setSession(s=>({active:id,visited:s.visited.includes(id)?s.visited:[...s.visited,id]}))
      document.querySelector('#workspace')?.scrollTo(0,0)
      window.scrollTo(0,0)
      document.querySelector('#workspace')?.focus({preventScroll:true})
    }
    window.addEventListener('hashchange',navigate)
    return ()=>window.removeEventListener('hashchange',navigate)
  },[])
  useEffect(()=>{ document.title=titles[session.active]+' · Monte Carlo Simulation Lab' },[session.active])
  return <Layout active={session.active} title={titles[session.active]}>
    {session.visited.map(id=>{
      const Page=pages[id]
      return <section key={id} hidden={session.active!==id} className={'screen screen-'+id}><Suspense fallback={<p role="status">Loading workspace…</p>}><Page id={id} mode={id}/>{labs.some(l=>l.id===id)&&<RelatedLearning id={id}/>}</Suspense></section>
    })}
  </Layout>
}
