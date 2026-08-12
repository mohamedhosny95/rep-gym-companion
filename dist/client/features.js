window.REP_FEATURES=(function(){
  const encoder=new TextEncoder(),decoder=new TextDecoder();
  const DB_NAME="rep-device-vault-v1",STORE="vault";
  const b64=bytes=>{let text="";for(const byte of bytes)text+=String.fromCharCode(byte);return btoa(text);};
  const unb64=text=>{const raw=atob(String(text||"")),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;};
  function openVault(){return new Promise((resolve,reject)=>{if(!indexedDB)return reject(Error("Device backup is unavailable."));const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
  async function vaultGet(key){const db=await openVault();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readonly"),request=tx.objectStore(STORE).get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close();});}
  async function vaultPut(key,value){const db=await openVault();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(value,key);tx.oncomplete=()=>{db.close();resolve(value);};tx.onerror=()=>{db.close();reject(tx.error);};});}
  async function deviceKey(){let key=await vaultGet("device-key");if(key)return key;key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);await vaultPut("device-key",key);return key;}
  async function createDeviceSnapshot(data){const key=await deviceKey(),iv=crypto.getRandomValues(new Uint8Array(12)),plain=encoder.encode(JSON.stringify(data)),cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain),record={version:1,createdAt:new Date().toISOString(),iv:b64(iv),ciphertext:b64(new Uint8Array(cipher))},history=await vaultGet("snapshots")||[];history.unshift(record);await vaultPut("snapshots",history.slice(0,5));await vaultPut("latest",record);return record;}
  async function restoreDeviceSnapshot(index=0){const history=await vaultGet("snapshots")||[],record=history[index]||await vaultGet("latest");if(!record)throw Error("No automatic device backup is available yet.");const key=await deviceKey(),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(record.iv)},key,unb64(record.ciphertext));return {data:JSON.parse(decoder.decode(plain)),createdAt:record.createdAt};}
  async function backupHistory(){try{const history=await vaultGet("snapshots")||[],latest=await vaultGet("latest");return (history.length?history:(latest?[latest]:[])).map(record=>record.createdAt);}catch{return [];}}
  async function backupStatus(){return (await backupHistory())[0]||null;}
  let snapshotTimer=null,lastSnapshotAt=Number(localStorage.getItem("rep-last-device-snapshot-at")||0);
  function scheduleSnapshot(data){
    const minimumInterval=6*60*60*1000;
    if(Date.now()-lastSnapshotAt<minimumInterval)return;
    clearTimeout(snapshotTimer);
    const run=()=>createDeviceSnapshot(data).then(()=>{lastSnapshotAt=Date.now();localStorage.setItem("rep-last-device-snapshot-at",String(lastSnapshotAt));}).catch(()=>{});
    snapshotTimer=setTimeout(()=>{if("requestIdleCallback" in window)requestIdleCallback(run,{timeout:3000});else run();},1500);
  }
  async function passphraseKey(passphrase,salt,usage){const material=await crypto.subtle.importKey("raw",encoder.encode(passphrase),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:250000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,usage);}
  async function encryptExport(data,passphrase){if(String(passphrase).length<8)throw Error("Use a passphrase with at least 8 characters.");const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await passphraseKey(passphrase,salt,["encrypt"]),plain=encoder.encode(JSON.stringify(data)),cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain);return {app:"Rep Gym Companion",schema:4,encrypted:true,cipher:"AES-256-GCM",kdf:"PBKDF2-SHA256",iterations:250000,createdAt:new Date().toISOString(),salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(cipher))};}
  async function decryptExport(payload,passphrase){if(!payload?.encrypted||payload?.schema!==4)throw Error("This is not a supported encrypted Rep backup.");const key=await passphraseKey(passphrase,unb64(payload.salt),["decrypt"]);try{const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(payload.iv)},key,unb64(payload.ciphertext));return JSON.parse(decoder.decode(plain));}catch{throw Error("The passphrase is incorrect or the backup is damaged.");}}
  function downloadJson(payload,filename){const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);}
  function localDay(date){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");}
  function dayKeys(count=7){const days=[];for(let i=count-1;i>=0;i--){const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()-i);days.push(localDay(date));}return days;}
  return {createDeviceSnapshot,restoreDeviceSnapshot,backupStatus,backupHistory,scheduleSnapshot,encryptExport,decryptExport,downloadJson,dayKeys};
})();
