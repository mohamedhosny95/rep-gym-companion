/* Central, URL-backed navigation for primary tabs and nested mobile views. */
(function(){
  const routes=new Map();
  const paths=new Map();
  let currentId="";
  let started=false;
  let tabResolver=null;

  function normalizePath(value){
    const raw=String(value||"").trim().replace(/^#/,"");
    if(!raw)return "";
    return `/${raw.replace(/^\/+|\/+$/g,"")}`;
  }

  function register(definitions=[]){
    for(const definition of definitions){
      if(!definition?.id||typeof definition.activate!=="function")continue;
      const route={...definition,path:normalizePath(definition.path||definition.id)};
      routes.set(route.id,route);
      paths.set(route.path,route.id);
      for(const alias of route.aliases||[])paths.set(normalizePath(alias),route.id);
    }
  }

  function routeFromLocation(){
    return paths.get(normalizePath(location.hash))||"";
  }

  function routeUrl(route){
    return `${location.pathname}${location.search}#${route.path}`;
  }

  function activate(id,{focus=true,scroll=true}={}){
    const route=routes.get(id);
    if(!route)return false;
    route.activate();
    currentId=id;
    document.documentElement.dataset.route=id;
    if(route.title)document.title=`${route.title} · Health OS`;
    if(scroll)window.scrollTo({top:0,left:0,behavior:"auto"});
    if(focus)requestAnimationFrame(()=>window.focusViewHeading?.());
    window.dispatchEvent(new CustomEvent("rep:navigation",{detail:{id,path:route.path}}));
    return true;
  }

  function navigate(id,{replace=false,focus=true,scroll=true}={}){
    const route=routes.get(id);
    if(!route)return false;
    if(currentId===id&&routeFromLocation()===id)return activate(id,{focus,scroll});
    const prior=history.state&&typeof history.state==="object"?history.state:{};
    const depth=replace?Number(prior.repRouteDepth)||0:(Number(prior.repRouteDepth)||0)+1;
    history[replace?"replaceState":"pushState"]({...prior,repRoute:id,repRouteDepth:depth},"",routeUrl(route));
    return activate(id,{focus,scroll});
  }

  function dispatch(){
    const id=routeFromLocation()||history.state?.repRoute;
    if(!routes.has(id)||id===currentId)return false;
    return activate(id,{focus:true,scroll:false});
  }

  function start({fallback="today"}={}){
    if(started)return dispatch();
    started=true;
    window.addEventListener("popstate",dispatch);
    window.addEventListener("hashchange",dispatch);
    const requested=routeFromLocation();
    if(requested){
      const prior=history.state&&typeof history.state==="object"?history.state:{};
      history.replaceState({...prior,repRoute:requested,repRouteDepth:Number(prior.repRouteDepth)||0},"",routeUrl(routes.get(requested)));
      return activate(requested,{focus:false,scroll:false});
    }
    return navigate(routes.has(fallback)?fallback:[...routes.keys()][0],{replace:true,focus:false,scroll:false});
  }

  function back(fallback="today"){
    if(Number(history.state?.repRouteDepth)>0)history.back();
    else navigate(fallback,{replace:true});
  }

  function navigateTab(tab){
    if(typeof tabResolver!=="function")return false;
    return navigate(tabResolver(tab));
  }

  window.REP_NAVIGATION={register,navigate,navigateTab,back,start,dispatch,setTabResolver:resolver=>{tabResolver=resolver;},has:id=>routes.has(id),current:()=>currentId,pathFor:id=>routes.get(id)?.path||""};
})();
