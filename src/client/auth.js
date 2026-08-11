(function(){
  const storageKey="rep-notion-pairing-key-v1",cookieMarker="cookie",channelName="rep-auth-v1";
  const channel=typeof BroadcastChannel!=="undefined"?new BroadcastChannel(channelName):null;
  const listeners=new Set();
  function emit(type){for(const listener of listeners)try{listener(type);}catch{};}
  function announce(type){channel?.postMessage({type});emit(type);}
  function credential(){const value=localStorage.getItem(storageKey);return value&&value!==cookieMarker?value:"";}
  function headers(extra={}){const result={...extra},value=credential();if(value)result["x-rep-sync-key"]=value;return result;}
  function request(input,init={}){return fetch(input,{...init,credentials:"same-origin",headers:headers(init.headers||{})});}
  function markPaired(){localStorage.setItem(storageKey,cookieMarker);announce("paired");}
  function clear(){localStorage.removeItem(storageKey);announce("disconnected");}
  function isPaired(){return Boolean(localStorage.getItem(storageKey));}
  function onChange(listener){listeners.add(listener);return()=>listeners.delete(listener);}
  channel?.addEventListener("message",event=>emit(event.data?.type||"changed"));
  addEventListener("storage",event=>{if(event.key===storageKey)emit(event.newValue?"paired":"disconnected");});
  window.REP_AUTH={storageKey,cookieMarker,headers,fetch:request,markPaired,clear,isPaired,onChange};
})();
