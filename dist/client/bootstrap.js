(async function(){
  const version=window.REP_BUILD_VERSION||"5d242dffd43b";
  const load=src=>new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src=`${src}?v=${version}`;
    script.onload=resolve;
    script.onerror=()=>reject(Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
  try{
    window.REP_HYDRATED_STATE=await window.REP_STORE?.hydrate("rep-gym-companion-v1");
    await Promise.all([
      load("store.js"),
      load("offline-nutrition.js"),
      load("importer.js"),
      load("report-card.js"),
      load("command-palette.js"),
      load("sync-outbox.js"),
      load("telemetry.js"),
      load("recovery-map.js"),
      load("plate-calculator.js"),
      load("heart-rate-monitor.js"),
      load("audio-coach.js"),
      load("barcode-scanner.js"),
      load("muscle-heatmap.js")
    ]);
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
    document.querySelector("#commandPaletteButton")?.addEventListener("click",()=>window.REP_COMMAND_PALETTE?.open());
    document.documentElement.dataset.appReady="true";
    delete window.REP_HYDRATED_STATE;
  }catch(error){
    const app=document.querySelector("#app");
    if(app){
      app.replaceChildren();
      const section=document.createElement("section"),title=document.createElement("strong"),message=document.createElement("p"),retry=document.createElement("button");
      section.className="startup-error";title.textContent="Health OS could not start.";message.textContent=String(error.message||error);retry.textContent="Retry";retry.addEventListener("click",()=>location.reload());
      section.append(title,message,retry);app.append(section);
    }
  }
})();
