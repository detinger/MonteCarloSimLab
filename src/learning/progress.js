let database
function open() {
  if(!database) database=new Promise((resolve,reject)=>{
    const req=indexedDB.open('mc-learning',1)
    req.onupgradeneeded=()=>req.result.createObjectStore('progress',{keyPath:'id'})
    req.onsuccess=()=>resolve(req.result)
    req.onerror=()=>reject(req.error)
  })
  return database
}

export async function allProgress() {
  const db=await open()
  return new Promise((resolve,reject)=>{
    const req=db.transaction('progress').objectStore('progress').getAll()
    req.onsuccess=()=>resolve(Object.fromEntries(req.result.map(r=>[r.id,r])))
    req.onerror=()=>reject(req.error)
  })
}

export async function updateProgress(id,patch,attempt) {
  const db=await open()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('progress','readwrite')
    const store=tx.objectStore('progress'),req=store.get(id)
    let record
    req.onsuccess=()=>{
      record={id,version:1,attempts:[],...req.result,...patch}
      if(attempt) {
        record.attempts=[...record.attempts,{...attempt,at:new Date().toISOString(),graderVersion:1}]
        record.completed=!!(record.completed||attempt.passed)
      }
      store.put(record)
    }
    tx.oncomplete=()=>resolve(record)
    tx.onabort=()=>reject(tx.error)
    tx.onerror=()=>reject(tx.error)
  })
}
