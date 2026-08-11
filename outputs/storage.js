(function(){
  const DB_NAME="health-os-state-v1",STORE="records",LARGE_KEYS=["history","foodEntries","sleepLogs","recoveryCheckins","bodyWeights","syncQueue","daily","logs","completed"];
  let pendingTimer=null,pendingWrite=null;
  function open(){return new Promise((resolve,reject)=>{if(!indexedDB)return reject(Error("IndexedDB is unavailable."));const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
  async function get(key){const db=await open();return new Promise((resolve,reject)=>{const request=db.transaction(STORE).objectStore(STORE).get(key);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});}
  async function put(key,value){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
  function split(payload){const local={...payload},durable={};for(const key of LARGE_KEYS){if(key in local){durable[key]=local[key];delete local[key];}}return {local,durable};}
  async function hydrate(storageKey){
    let local={};try{local=JSON.parse(localStorage.getItem(storageKey)||"{}");}catch{}
    try{const durable=await get("state");if(durable&&typeof durable==="object")local={...local,...durable};}catch{}
    localStorage.setItem(storageKey,JSON.stringify(local));return local;
  }
  function persist(storageKey,payload){
    const {local,durable}=split(payload);localStorage.setItem(storageKey,JSON.stringify(local));pendingWrite=durable;
    clearTimeout(pendingTimer);pendingTimer=setTimeout(()=>{const next=pendingWrite;pendingWrite=null;put("state",next).catch(()=>{});},120);
  }
  async function flush(){clearTimeout(pendingTimer);if(!pendingWrite)return;const next=pendingWrite;pendingWrite=null;await put("state",next).catch(()=>{});}
  async function replace(storageKey,payload){const {local,durable}=split(payload);localStorage.setItem(storageKey,JSON.stringify(local));pendingWrite=null;clearTimeout(pendingTimer);await put("state",durable);}
  async function clear(){const db=await open();return new Promise(resolve=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).clear();tx.oncomplete=tx.onerror=()=>resolve();});}
  window.REP_STORE={hydrate,persist,flush,replace,clear,dbName:DB_NAME,largeKeys:[...LARGE_KEYS]};
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flush();});
  addEventListener("pagehide",()=>flush());
})();
