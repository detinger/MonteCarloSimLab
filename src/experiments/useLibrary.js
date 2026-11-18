import {useEffect,useState} from 'react'
import {library,presets} from './library.js'
import {runsChanged} from './snapshots.js'

export function useLibrary(){
  const [data,setData]=useState(()=>({entries:presets(),warnings:[],loading:true}))
  useEffect(()=>{
    let generation=0
    const refresh=async()=>{
      const ticket=++generation
      try{
        const fresh=await library()
        if(ticket===generation)setData({...fresh,loading:false})
      }catch(error){if(ticket===generation)setData(old=>({...old,loading:false,warnings:[error.message]}))}
    }
    refresh()
    const events=[runsChanged,'mc-project-change','focus','hashchange']
    events.forEach(name=>window.addEventListener(name,refresh))
    return ()=>{generation++;events.forEach(name=>window.removeEventListener(name,refresh))}
  },[])
  return data
}
