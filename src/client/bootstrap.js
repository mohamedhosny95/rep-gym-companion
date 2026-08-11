(async function(){
  const version="64",load=src=>new Promise((resolve,reject)=>{const script=document.createElement("script");script.src=`${src}?v=${version}`;script.onload=resolve;script.onerror=()=>reject(Error(`Could not load ${src}`));document.head.appendChild(script);});
  try{await window.REP_STORE?.hydrate("rep-gym-companion-v1");await load("app.js");await load("sync.js");await load("sync-center.js");await load("enhancements.js");document.documentElement.dataset.appReady="true";}
  catch(error){const app=document.querySelector("#app");if(app)app.innerHTML=`<section class="startup-error"><strong>Health OS could not start.</strong><p>${String(error.message||error)}</p><button onclick="location.reload()">Retry</button></section>`;}
})();
