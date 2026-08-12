(async function(){
  const version=window.REP_BUILD_VERSION||"28f3e0c4ac19";
  const load=src=>new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src=`${src}?v=${version}`;
    script.onload=resolve;
    script.onerror=()=>reject(Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
  try{
    window.REP_HYDRATED_STATE=await window.REP_STORE?.hydrate("rep-gym-companion-v1");
    await load("app.js");
    await Promise.all([load("sync.js"),load("sync-center.js")]);
    await load("enhancements.js");
    await load("health-ui.js");
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
