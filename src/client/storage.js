(function(){
  const DB_NAME="health-os-state-v1",STORE="records",LARGE_KEYS=["history","foodEntries","sleepLogs","recoveryCheckins","bodyWeights","bodyMeasurements","syncQueue","outbox","daily","logs","completed","healthMetrics","launchEvents","customExperiments","experimentCheckins","weekOverrides"];
  const serialized=new Map();
  let pendingTimer=null,pendingWrite=null;

  function open(){
    return new Promise((resolve,reject)=>{
      if(!indexedDB)return reject(Error("IndexedDB is unavailable."));
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  async function readDurable(){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE),store=tx.objectStore(STORE),result={};
      let remaining=LARGE_KEYS.length+1,legacy=null;
      const done=()=>{if(--remaining)return;if(legacy&&typeof legacy==="object")for(const key of LARGE_KEYS)if(result[key]===undefined&&legacy[key]!==undefined)result[key]=legacy[key];db.close();resolve(result);};
      for(const key of LARGE_KEYS){const request=store.get(`state:${key}`);request.onsuccess=()=>{if(request.result!==undefined)result[key]=request.result;done();};request.onerror=()=>reject(request.error);}
      const old=store.get("state");old.onsuccess=()=>{legacy=old.result;done();};old.onerror=()=>reject(old.error);
    });
  }
  async function writeDurable(values){
    const changed=[];
    for(const [key,value] of Object.entries(values||{})){const next=JSON.stringify(value);if(serialized.get(key)!==next)changed.push([key,value,next]);}
    if(!changed.length)return;
    const db=await open();
    try{
      await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite"),store=tx.objectStore(STORE);for(const [key,value] of changed)store.put(value,`state:${key}`);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
    }finally{db.close();}
    for(const [key,,next] of changed)serialized.set(key,next);
  }
  function split(payload){
    const local={...payload},durable={};
    for(const key of LARGE_KEYS){if(key in local){durable[key]=local[key];delete local[key];}}
    return {local,durable};
  }
  async function hydrate(storageKey){
    let parsed={};try{parsed=JSON.parse(localStorage.getItem(storageKey)||"{}");}catch{}
    const legacy=split(parsed),indexed=await readDurable().catch(()=>({})),durable={...legacy.durable,...indexed};
    localStorage.setItem(storageKey,JSON.stringify(legacy.local));
    if(Object.keys(legacy.durable).length)writeDurable(legacy.durable).catch(()=>{});
    return {...legacy.local,...durable};
  }
  function scheduleWrite(){
    clearTimeout(pendingTimer);
    pendingTimer=setTimeout(async()=>{const next=pendingWrite;pendingWrite=null;if(next)await writeDurable(next).catch(()=>{});},0);
  }
  function persist(storageKey,payload){
    const {local,durable}=split(payload);
    localStorage.setItem(storageKey,JSON.stringify(local));
    pendingWrite={...(pendingWrite||{}),...durable};
    scheduleWrite();
  }
  async function flush(){
    clearTimeout(pendingTimer);
    const next=pendingWrite;pendingWrite=null;
    if(next)await writeDurable(next).catch(()=>{});
  }
  async function replace(storageKey,payload){
    const {local,durable}=split(payload);
    localStorage.setItem(storageKey,JSON.stringify(local));
    pendingWrite=null;clearTimeout(pendingTimer);serialized.clear();
    await writeDurable(durable);
  }
  async function clear(){
    const db=await open();
    await new Promise(resolve=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).clear();tx.oncomplete=tx.onerror=resolve;});
    db.close();serialized.clear();
  }
  window.REP_STORE={hydrate,persist,flush,replace,clear,dbName:DB_NAME,largeKeys:[...LARGE_KEYS]};
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flush();});
  addEventListener("pagehide",()=>flush());
})();
