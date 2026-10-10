(async function(){
  // Chromium can resize its layout viewport for the keyboard; WebKit uses VisualViewport.
  if('virtualKeyboard' in navigator){const viewport=document.querySelector('meta[name="viewport"]');if(viewport&&!viewport.content.includes('interactive-widget'))viewport.content+=', interactive-widget=resizes-content';}

  const version=window.AWJ_BUILD_VERSION||"43e781159ae7";
  const pendingScripts=new Map();
  const load=src=>{
    if(pendingScripts.has(src))return pendingScripts.get(src);
    const promise=new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src=`${src}?v=${version}`;
    const cleanup=()=>window.removeEventListener('error',runtimeError);
    const fail=error=>{cleanup();pendingScripts.delete(src);script.remove();reject(error);};
    const runtimeError=event=>{if(event.filename===script.src){event.preventDefault();fail(Error(`Could not initialize ${src}: ${event.message}`));}};
    window.addEventListener('error',runtimeError);
    script.onload=()=>{cleanup();resolve();};
    script.onerror=()=>fail(Error(`Could not load ${src}`));
    document.head.appendChild(script);
    });
    pendingScripts.set(src,promise);
    return promise;
  };
  const extras=["command-palette.js","heart-rate-monitor.js","audio-coach.js","barcode-scanner.js","muscle-heatmap.js"];
  async function loadExtras(sources=extras){
    const results=await Promise.allSettled(sources.map(load));
    const failed=sources.filter((_,index)=>results[index].status==="rejected");
    let retry=document.querySelector("#retryExtraTools");
    if(failed.length){
      if(!retry){retry=document.createElement("button");retry.type="button";retry.id="retryExtraTools";retry.className="top-more-item";retry.textContent="Retry extra tools";document.querySelector("#topMoreMenu")?.append(retry);}
      retry.onclick=()=>loadExtras(failed);
    }else retry?.remove();
  }
  try{
    window.AWJ_HYDRATED_STATE=await window.AWJ_STORE?.hydrate(AWJ_COMPAT.stateKey);
    await Promise.all([
      load("store.js"),
      load("offline-nutrition.js"),
      load("importer.js"),
      load("report-card.js"),
      load("sync-outbox.js"),
      load("telemetry.js"),
      load("recovery-map.js"),
      load("plate-calculator.js")
    ]);
    await load("media-manifest.js");
    await load("media-contract.js");
    await load("motion.js");
    await load("exercise-catalog.js");
    await load("training-preferences.js");
    await load("media-player.js");
    await load("technique-guides.js");
    await load("workout-media.js");
    await load("app.js");
    await Promise.all([
      load("sync.js"),
      load("sync-center.js"),
      load("custom-workouts.js")
    ]);
    await load("enhancements.js");
    await load("habits.js");
    await load("health-ui.js");
    await load("performance-ui.js");
    await load("product-suite-ui.js");
    await load("app-shell.js");
    document.querySelector("#commandPaletteButton")?.addEventListener("click",()=>load("command-palette.js").then(()=>window.AWJ_COMMAND_PALETTE?.open()).catch(()=>loadExtras(["command-palette.js"])));
    document.documentElement.dataset.appReady="true";
    document.querySelector('#app')?.setAttribute('aria-busy','false');
    delete window.AWJ_HYDRATED_STATE;
    loadExtras();
  }catch(error){
    document.documentElement.dataset.appReady="true";
    const app=document.querySelector("#app");
    if(app){
      app.replaceChildren();
      const section=document.createElement("section"),title=document.createElement("strong"),message=document.createElement("p"),retry=document.createElement("button");
      section.className="startup-error";title.textContent="AWJ could not start.";message.textContent=String(error.message||error);retry.textContent="Retry";retry.addEventListener("click",()=>location.reload());
      section.append(title,message,retry);app.append(section);
      app.setAttribute('aria-busy','false');
    }
  }
})();
