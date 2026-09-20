(function(){
  const DB_NAME="health-os-state-v1",STORE="records",LARGE_KEYS=["history","foodEntries","sleepLogs","recoveryCheckins","bodyWeights","bodyMeasurements","syncQueue","outbox","daily","logs","completed","healthMetrics","launchEvents","customExperiments","experimentCheckins","weekOverrides"];
  const serialized=new Map();
  const baseSnapshots=new Map();
  const recordedConflicts=[];
  let currentGeneration=0;
  let pendingTimer=null,pendingWrite=null;
  let writeChain=Promise.resolve();

  function isPlainObject(val){
    return val!==null&&typeof val==="object"&&!Array.isArray(val);
  }

  function clone(val){
    if(val===null||typeof val!=="object")return val;
    if(typeof structuredClone==="function"){
      try{return structuredClone(val);}catch{}
    }
    return JSON.parse(JSON.stringify(val));
  }

  function deepEqual(a,b){
    if(a===b)return true;
    if(a===null||b===null||typeof a!=="object"||typeof b!=="object")return false;
    if(Array.isArray(a)!==Array.isArray(b))return false;
    if(Array.isArray(a)){
      if(a.length!==b.length)return false;
      for(let i=0;i<a.length;i++){
        if(!deepEqual(a[i],b[i]))return false;
      }
      return true;
    }
    const keysA=Object.keys(a),keysB=Object.keys(b);
    if(keysA.length!==keysB.length)return false;
    for(const k of keysA){
      if(!Object.prototype.hasOwnProperty.call(b,k))return false;
      if(!deepEqual(a[k],b[k]))return false;
    }
    return true;
  }

  function getEntityKey(item){
    if(item===null||item===undefined)return null;
    if(typeof item!=="object")return `primitive:${JSON.stringify(item)}`;
    if(item.id!==undefined&&item.id!==null&&item.id!=="")return `id:${item.id}`;
    if(item.item?.id!==undefined&&item.item.id!==null&&item.item.id!=="")return `id:${item.item.id}`;
    if(item.uuid!==undefined&&item.uuid!==null&&item.uuid!=="")return `uuid:${item.uuid}`;
    if(item.notionPageId!==undefined&&item.notionPageId!==null&&item.notionPageId!=="")return `notion:${item.notionPageId}`;
    if(item.week!==undefined&&item.week!==null&&item.week!=="")return `week:${item.week}`;
    if(item.session!==undefined&&item.date!==undefined)return `session:${item.session}@${item.date}`;
    if(item.date!==undefined&&item.date!==null&&item.date!=="")return `date:${item.date}`;
    if(item.dateKey!==undefined&&item.dateKey!==null&&item.dateKey!=="")return `date:${item.dateKey}`;
    if(item.day!==undefined&&item.day!==null&&item.day!=="")return `date:${item.day}`;
    if(item.key!==undefined&&item.key!==null&&item.key!=="")return `key:${item.key}`;
    if(item.name!==undefined&&item.name!==null&&item.name!=="")return `name:${item.name}`;
    return `json:${JSON.stringify(item)}`;
  }

  function getItemRevision(item){
    if(!item||typeof item!=="object")return null;
    const r=item.revision??item.version??item.rev??item.item?.revision??item.item?.version;
    if(r!==undefined&&r!==null&&r!==""){
      const num=Number(r);
      if(Number.isFinite(num))return num;
    }
    return null;
  }

  function isOutboxPath(path){
    if(!path)return false;
    return /(?:^|[.[\]:])(?:outbox|syncQueue)(?:$|[.[\]:])/i.test(path);
  }

  function isSetArrayPath(path){
    if(!path)return false;
    return /(?:^|[.[\]:])(?:sets|previousSets)(?:$|[.[\]:])/i.test(path);
  }

  function isDatedOrWeekRecord(item){
    if(!item||typeof item!=="object")return false;
    if(item.date!==undefined&&item.date!==null&&item.date!=="")return true;
    if(item.dateKey!==undefined&&item.dateKey!==null&&item.dateKey!=="")return true;
    if(item.week!==undefined&&item.week!==null&&item.week!=="")return true;
    if(item.day!==undefined&&item.day!==null&&item.day!=="")return true;
    if(item.session!==undefined&&item.session!==null&&item.session!=="")return true;
    return false;
  }

  function isAnonymousSetObject(item,isExplicitPath=false){
    if(!item||typeof item!=="object"||Array.isArray(item))return false;
    if(isDatedOrWeekRecord(item))return false;
    if(item.id!==undefined&&item.id!==null&&item.id!=="")return false;
    if(item.uuid!==undefined&&item.uuid!==null&&item.uuid!=="")return false;
    if(item.notionPageId!==undefined&&item.notionPageId!==null&&item.notionPageId!=="")return false;
    if(item.key!==undefined&&item.key!==null&&item.key!=="")return false;
    if(item.name!==undefined&&item.name!==null&&item.name!=="")return false;
    if(isExplicitPath){
      return ("weight" in item || "reps" in item || "rpe" in item || "set" in item || "repsCompleted" in item || "note" in item || Object.keys(item).length===0);
    }
    return ("reps" in item || "rpe" in item || "set" in item || "repsCompleted" in item);
  }

  function isAnonymousSetArray(base,local,durable,path){
    const isExplicit=isSetArrayPath(path);
    const all=[...(Array.isArray(base)?base:[]),...(Array.isArray(local)?local:[]),...(Array.isArray(durable)?durable:[])];
    if(!all.length)return isExplicit;
    return all.every(item=>isAnonymousSetObject(item,isExplicit));
  }

  function indexArray(arr,isSets=false){
    const map=new Map(),counts=new Map();
    for(let i=0;i<arr.length;i++){
      const item=arr[i];
      let rawKey;
      if(isSets&&isAnonymousSetObject(item,isSets)){
        rawKey=(item.set!==undefined&&item.set!==null&&item.set!=="")?`set:${item.set}`:`set:${i}`;
      }else{
        rawKey=getEntityKey(item)||`idx:${i}`;
      }
      const count=counts.get(rawKey)||0;
      counts.set(rawKey,count+1);
      const key=`${rawKey}#${count}`;
      map.set(key,{item,index:i,rawKey});
    }
    return map;
  }

  function recordConflict(c){
    const conflict={
      timestamp:new Date().toISOString(),
      ...c
    };
    recordedConflicts.push(conflict);
    if(typeof window?.REP_STORE?.onConflict==="function"){
      try{window.REP_STORE.onConflict(conflict);}catch{}
    }
    if(typeof window!=="undefined"&&typeof window.dispatchEvent==="function"){
      try{
        let evt=null;
        if(typeof CustomEvent==="function"){
          evt=new CustomEvent("rep:storage-conflict",{detail:conflict});
        }else if(typeof Event==="function"){
          evt=new Event("rep:storage-conflict");
          evt.detail=conflict;
        }
        if(evt)window.dispatchEvent(evt);
      }catch{}
    }
  }

  function mergeObject(baseObj,localObj,durableObj,path=""){
    const base=(baseObj&&typeof baseObj==="object"&&!Array.isArray(baseObj))?baseObj:{};
    const local=(localObj&&typeof localObj==="object"&&!Array.isArray(localObj))?localObj:{};
    const durable=(durableObj&&typeof durableObj==="object"&&!Array.isArray(durableObj))?durableObj:{};

    const merged={};
    const conflicts=[];
    const allKeys=new Set([...Object.keys(base),...Object.keys(local),...Object.keys(durable)]);

    for(const k of allKeys){
      const hasB=Object.prototype.hasOwnProperty.call(base,k);
      const hasL=Object.prototype.hasOwnProperty.call(local,k);
      const hasD=Object.prototype.hasOwnProperty.call(durable,k);
      const bVal=base[k];
      const lVal=local[k];
      const dVal=durable[k];
      const fieldPath=path?`${path}.${k}`:k;

      if(hasL&&!hasD){
        if(!hasB){
          merged[k]=clone(lVal);
        }else{
          if(deepEqual(bVal,lVal)){
            // Local didn't modify; durable deleted it -> keep deleted
          }else{
            // Conflict: durable deleted, local modified -> preserve durable deletion
            conflicts.push({
              path:fieldPath,
              base:bVal,
              durable:undefined,
              local:lVal,
              reason:"Property deleted in durable store but modified in local tab; preserved durable deletion"
            });
          }
        }
      }else if(!hasL&&hasD){
        if(!hasB){
          // Added concurrently in durable
          merged[k]=clone(dVal);
        }else{
          if(deepEqual(bVal,dVal)){
            // Durable didn't modify; local intentionally deleted -> keep deleted
          }else{
            // Conflict: local deleted, durable modified -> preserve durable modification
            merged[k]=clone(dVal);
            conflicts.push({
              path:fieldPath,
              base:bVal,
              durable:dVal,
              local:undefined,
              reason:"Property modified in durable store but deleted in local tab; preserved durable modification"
            });
          }
        }
      }else if(hasL&&hasD){
        if(!hasB){
          if(deepEqual(lVal,dVal)){
            merged[k]=clone(dVal);
          }else if(isPlainObject(lVal)&&isPlainObject(dVal)){
            const sub=mergeObject({},lVal,dVal,fieldPath);
            merged[k]=sub.merged;
            conflicts.push(...sub.conflicts);
          }else if(Array.isArray(lVal)&&Array.isArray(dVal)){
            const sub=mergeArray([],lVal,dVal,fieldPath);
            merged[k]=sub.merged;
            conflicts.push(...sub.conflicts);
          }else{
            merged[k]=clone(dVal);
            conflicts.push({
              path:fieldPath,
              base:undefined,
              durable:dVal,
              local:lVal,
              reason:"Conflicting additions for property; preserved newer durable value"
            });
          }
        }else{
          if(deepEqual(bVal,lVal)){
            merged[k]=clone(dVal);
          }else if(deepEqual(bVal,dVal)){
            merged[k]=clone(lVal);
          }else if(deepEqual(lVal,dVal)){
            merged[k]=clone(dVal);
          }else{
            if(isPlainObject(lVal)&&isPlainObject(dVal)){
              const sub=mergeObject(bVal,lVal,dVal,fieldPath);
              merged[k]=sub.merged;
              conflicts.push(...sub.conflicts);
            }else if(Array.isArray(lVal)&&Array.isArray(dVal)){
              const sub=mergeArray(bVal,lVal,dVal,fieldPath);
              merged[k]=sub.merged;
              conflicts.push(...sub.conflicts);
            }else{
              merged[k]=clone(dVal);
              conflicts.push({
                path:fieldPath,
                base:bVal,
                durable:dVal,
                local:lVal,
                reason:"Conflicting modification for property; preserved newer durable value"
              });
            }
          }
        }
      }
    }

    return {merged,conflicts};
  }

  function mergeArray(baseArr,localArr,durableArr,path=""){
    const base=Array.isArray(baseArr)?baseArr:[];
    const local=Array.isArray(localArr)?localArr:[];
    const durable=Array.isArray(durableArr)?durableArr:[];

    const isOutbox=isOutboxPath(path);
    const isSets=isAnonymousSetArray(base,local,durable,path);
    const baseIndexed=indexArray(base,isSets);
    const localIndexed=indexArray(local,isSets);
    const durableIndexed=indexArray(durable,isSets);

    const keptItemsMap=new Map();
    const conflicts=[];
    const allKeys=new Set([...baseIndexed.keys(),...localIndexed.keys(),...durableIndexed.keys()]);

    for(const k of allKeys){
      const hasB=baseIndexed.has(k);
      const hasL=localIndexed.has(k);
      const hasD=durableIndexed.has(k);
      const bItem=baseIndexed.get(k)?.item;
      const lItem=localIndexed.get(k)?.item;
      const dItem=durableIndexed.get(k)?.item;
      const itemPath=path?`${path}[${k}]`:k;

      const lRev=getItemRevision(lItem);
      const dRev=getItemRevision(dItem);
      const bRev=getItemRevision(bItem);

      if(hasL&&!hasD){
        if(!hasB){
          keptItemsMap.set(k,clone(lItem));
        }else{
          if(isOutbox&&lRev!==null&&bRev!==null&&lRev>bRev){
            // Schema-aware outbox merge: durable deleted/acknowledged older revision,
            // but local tab has concurrently newer revision. Newer revision survives.
            keptItemsMap.set(k,clone(lItem));
          }else if(deepEqual(bItem,lItem)||(isOutbox&&lRev!==null&&bRev!==null&&lRev<=bRev)){
            // Local didn't modify or deletion observed local revision -> keep deleted
          }else{
            // Conflict: durable deleted, local modified -> preserve durable deletion
            conflicts.push({
              path:itemPath,
              base:bItem,
              durable:undefined,
              local:lItem,
              reason:"Item deleted in durable store but modified in local tab; preserved durable deletion"
            });
          }
        }
      }else if(!hasL&&hasD){
        if(!hasB){
          keptItemsMap.set(k,clone(dItem));
        }else{
          if(isOutbox&&dRev!==null&&bRev!==null&&dRev>bRev){
            // Schema-aware outbox merge: local tab deleted/acknowledged older revision,
            // but durable store has concurrently newer revision. Newer revision survives.
            keptItemsMap.set(k,clone(dItem));
          }else if(deepEqual(bItem,dItem)||(isOutbox&&dRev!==null&&bRev!==null&&dRev<=bRev)){
            // Local intentionally deleted observed revision -> keep deleted
          }else{
            // Conflict: local deleted, durable modified -> preserve durable item
            keptItemsMap.set(k,clone(dItem));
            conflicts.push({
              path:itemPath,
              base:bItem,
              durable:dItem,
              local:undefined,
              reason:"Item modified in durable store but deleted in local tab; preserved durable item"
            });
          }
        }
      }else if(hasL&&hasD){
        if(isOutbox&&lRev!==null&&dRev!==null){
          if(lRev>dRev){
            keptItemsMap.set(k,clone(lItem));
          }else if(dRev>lRev){
            keptItemsMap.set(k,clone(dItem));
          }else{
            if(deepEqual(lItem,dItem)){
              keptItemsMap.set(k,clone(dItem));
            }else if(isPlainObject(lItem)&&isPlainObject(dItem)){
              const sub=mergeObject(bItem||{},lItem,dItem,itemPath);
              keptItemsMap.set(k,sub.merged);
              conflicts.push(...sub.conflicts);
            }else{
              keptItemsMap.set(k,clone(dItem));
            }
          }
        }else if(!hasB){
          if(deepEqual(lItem,dItem)){
            keptItemsMap.set(k,clone(dItem));
          }else if(isPlainObject(lItem)&&isPlainObject(dItem)){
            const sub=mergeObject({},lItem,dItem,itemPath);
            keptItemsMap.set(k,sub.merged);
            conflicts.push(...sub.conflicts);
          }else{
            keptItemsMap.set(k,clone(dItem));
            conflicts.push({
              path:itemPath,
              base:undefined,
              durable:dItem,
              local:lItem,
              reason:"Conflicting additions for item; preserved newer durable value"
            });
          }
        }else{
          if(deepEqual(bItem,lItem)){
            keptItemsMap.set(k,clone(dItem));
          }else if(deepEqual(bItem,dItem)){
            keptItemsMap.set(k,clone(lItem));
          }else if(deepEqual(lItem,dItem)){
            keptItemsMap.set(k,clone(dItem));
          }else{
            if(isPlainObject(lItem)&&isPlainObject(dItem)){
              const sub=mergeObject(bItem,lItem,dItem,itemPath);
              keptItemsMap.set(k,sub.merged);
              conflicts.push(...sub.conflicts);
            }else{
              keptItemsMap.set(k,clone(dItem));
              conflicts.push({
                path:itemPath,
                base:bItem,
                durable:dItem,
                local:lItem,
                reason:"Conflicting modification for item; preserved newer durable value"
              });
            }
          }
        }
      }
    }

    const result=[];
    const seen=new Set();

    // 1. Maintain local items in their relative local order
    for(const [k] of localIndexed){
      if(keptItemsMap.has(k)){
        result.push(keptItemsMap.get(k));
        seen.add(k);
      }
    }

    // 2. Insert concurrent durable additions using sibling anchors
    for(const [k] of durableIndexed){
      if(keptItemsMap.has(k)&&!seen.has(k)){
        const itemToInsert=keptItemsMap.get(k);
        let insertIdx=-1;
        let foundNext=false;
        let passedSelf=false;

        for(const [dk] of durableIndexed){
          if(dk===k){
            passedSelf=true;
            continue;
          }
          if(passedSelf&&seen.has(dk)){
            const idx=result.indexOf(keptItemsMap.get(dk));
            if(idx!==-1){
              insertIdx=idx;
              foundNext=true;
              break;
            }
          }
        }

        if(foundNext){
          result.splice(insertIdx,0,itemToInsert);
        }else{
          let prevKey=null;
          for(const [dk] of durableIndexed){
            if(dk===k)break;
            if(seen.has(dk))prevKey=dk;
          }
          if(prevKey&&keptItemsMap.has(prevKey)){
            const idx=result.indexOf(keptItemsMap.get(prevKey));
            if(idx!==-1){
              result.splice(idx+1,0,itemToInsert);
            }else{
              result.push(itemToInsert);
            }
          }else{
            result.push(itemToInsert);
          }
        }
        seen.add(k);
      }
    }

    return {merged:result,conflicts};
  }

  function mergeValues(key,baseVal,localVal,durableVal){
    if(deepEqual(localVal,baseVal)){
      return {merged:clone(durableVal),conflicts:[]};
    }
    if(deepEqual(durableVal,baseVal)){
      return {merged:clone(localVal),conflicts:[]};
    }
    if(deepEqual(localVal,durableVal)){
      return {merged:clone(durableVal),conflicts:[]};
    }
    if(durableVal===undefined||durableVal===null){
      return {merged:clone(localVal),conflicts:[]};
    }
    if(localVal===undefined||localVal===null){
      return {merged:clone(durableVal),conflicts:[]};
    }

    if(Array.isArray(localVal)&&Array.isArray(durableVal)){
      return mergeArray(baseVal,localVal,durableVal,key);
    }

    if(isPlainObject(localVal)&&isPlainObject(durableVal)){
      return mergeObject(baseVal,localVal,durableVal,key);
    }

    return {
      merged:clone(durableVal),
      conflicts:[{
        key,
        path:key,
        base:baseVal,
        durable:durableVal,
        local:localVal,
        reason:"Ambiguous scalar conflict; preserved newer durable value"
      }]
    };
  }

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

  function writeDurable(values,gen=currentGeneration){
    const run=async()=>{
      if(gen!==currentGeneration)return;
      await executeWriteDurable(values,gen);
    };
    writeChain=writeChain.then(run,run);
    return writeChain;
  }

  async function executeWriteDurable(values,gen){
    if(gen!==currentGeneration)return;
    const changed=[];
    for(const [key,value] of Object.entries(values||{})){
      const next=JSON.stringify(value);
      if(serialized.get(key)!==next)changed.push([key,clone(value),next]);
    }
    if(!changed.length)return;
    const db=await open();
    if(gen!==currentGeneration){
      db.close();
      return;
    }
    const successfulWrites=new Map();
    try{
      await new Promise((resolve,reject)=>{
        if(gen!==currentGeneration){
          resolve();
          return;
        }
        const tx=db.transaction(STORE,"readwrite"),store=tx.objectStore(STORE);
        let hasError=false;

        function fail(err){
          if(hasError)return;
          hasError=true;
          reject(err);
        }

        tx.onerror=()=>fail(tx.error);

        for(const [key,localVal,next] of changed){
          const req=store.get(`state:${key}`);
          req.onerror=()=>fail(req.error);
          req.onsuccess=()=>{
            if(hasError||gen!==currentGeneration)return;
            const durableVal=req.result;
            const baseVal=baseSnapshots.get(key);
            const {merged,conflicts}=mergeValues(key,baseVal,localVal,durableVal);

            if(conflicts&&conflicts.length){
              for(const c of conflicts){
                recordConflict({key,...c});
              }
            }

            store.put(merged,`state:${key}`);
            successfulWrites.set(key,{localVal,next});
          };
        }

        tx.oncomplete=()=>{
          if(!hasError)resolve();
        };
      });
    }finally{
      db.close();
    }

    if(gen!==currentGeneration)return;

    for(const [key,{localVal,next}] of successfulWrites){
      baseSnapshots.set(key,clone(localVal));
      serialized.set(key,next);
    }
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
    for(const key of LARGE_KEYS){
      if(durable[key]!==undefined){
        baseSnapshots.set(key,clone(durable[key]));
        if(!(key in legacy.durable)){
          serialized.set(key,JSON.stringify(durable[key]));
        }
      }
    }
    if(Object.keys(legacy.durable).length)writeDurable(legacy.durable).catch(()=>{});
    return {...legacy.local,...durable};
  }

  function scheduleWrite(){
    clearTimeout(pendingTimer);
    const scheduledGen=currentGeneration;
    pendingTimer=setTimeout(async()=>{
      if(scheduledGen!==currentGeneration){
        pendingWrite=null;
        return;
      }
      const next=pendingWrite;
      pendingWrite=null;
      if(next)await writeDurable(next,scheduledGen).catch(()=>{});
    },0);
  }

  function persist(storageKey,payload){
    const {local,durable}=split(payload);
    localStorage.setItem(storageKey,JSON.stringify(local));
    pendingWrite={...(pendingWrite||{}),...durable};
    scheduleWrite();
  }

  async function flush(){
    clearTimeout(pendingTimer);
    const flushGen=currentGeneration;
    const next=pendingWrite;
    pendingWrite=null;
    if(next)await writeDurable(next,flushGen).catch(()=>{});
    await writeChain.catch(()=>{});
  }

  async function replace(storageKey,payload){
    const {local,durable}=split(payload);
    localStorage.setItem(storageKey,JSON.stringify(local));
    clearTimeout(pendingTimer);
    pendingWrite=null;
    const opGen=++currentGeneration;

    serialized.clear();
    baseSnapshots.clear();

    const run=async()=>{
      if(opGen!==currentGeneration)return;
      const db=await open();
      try{
        await new Promise((resolve,reject)=>{
          const tx=db.transaction(STORE,"readwrite"),store=tx.objectStore(STORE);
          store.clear();
          for(const [key,value] of Object.entries(durable))store.put(value,`state:${key}`);
          tx.oncomplete=resolve;
          tx.onerror=()=>reject(tx.error);
        });
      }finally{
        db.close();
      }
      if(opGen!==currentGeneration)return;
      for(const [key,value] of Object.entries(durable)){
        baseSnapshots.set(key,clone(value));
        serialized.set(key,JSON.stringify(value));
      }
    };

    writeChain=writeChain.then(run,run);
    await writeChain.catch(()=>{});
  }

  async function clear(storageKey){
    clearTimeout(pendingTimer);
    pendingWrite=null;
    const opGen=++currentGeneration;

    serialized.clear();
    baseSnapshots.clear();
    recordedConflicts.length=0;
    if(storageKey&&typeof localStorage!=="undefined"&&localStorage.removeItem){
      try{localStorage.removeItem(storageKey);}catch{}
    }

    const run=async()=>{
      if(opGen!==currentGeneration)return;
      const db=await open();
      try{
        await new Promise(resolve=>{
          const tx=db.transaction(STORE,"readwrite");
          tx.objectStore(STORE).clear();
          tx.oncomplete=tx.onerror=resolve;
        });
      }finally{
        db.close();
      }
    };

    writeChain=writeChain.then(run,run);
    await writeChain.catch(()=>{});
  }

  window.REP_STORE={
    hydrate,
    persist,
    flush,
    replace,
    clear,
    dbName:DB_NAME,
    largeKeys:[...LARGE_KEYS],
    get conflicts(){return [...recordedConflicts];},
    getConflicts:()=>[...recordedConflicts],
    clearConflicts:()=>{recordedConflicts.length=0;},
    onConflict:null
  };

  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flush();});
  addEventListener("pagehide",()=>flush());
})();
