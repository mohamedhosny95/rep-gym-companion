(function(){
  const STORAGE_KEY="rep-rum-v1",BUDGETS={lcpMs:2500,cls:0.1,interactionMs:200,longTaskMs:200};
  const metrics={build:String(window.REP_BUILD_VERSION||"unknown").slice(0,16),path:location.pathname,recordedAt:new Date().toISOString(),lcpMs:0,cls:0,longTaskMs:0,interactionMs:0};
  const numeric=value=>Number.isFinite(value)?Math.round(value*1000)/1000:0;
  function observe(type,callback){try{new PerformanceObserver(list=>list.getEntries().forEach(callback)).observe({type,buffered:true});}catch{}}
  observe("largest-contentful-paint",entry=>{metrics.lcpMs=Math.max(metrics.lcpMs,numeric(entry.startTime));});
  observe("layout-shift",entry=>{if(!entry.hadRecentInput)metrics.cls=numeric(metrics.cls+entry.value);});
  observe("longtask",entry=>{metrics.longTaskMs=Math.max(metrics.longTaskMs,numeric(entry.duration));});
  observe("event",entry=>{metrics.interactionMs=Math.max(metrics.interactionMs,numeric(entry.duration));});
  function snapshot(){const navigation=performance.getEntriesByType("navigation")[0];return {...metrics,loadMs:numeric(navigation?.loadEventEnd||performance.now()),withinBudget:{lcp:!metrics.lcpMs||metrics.lcpMs<=BUDGETS.lcpMs,cls:metrics.cls<=BUDGETS.cls,interaction:metrics.interactionMs<=BUDGETS.interactionMs,longTask:metrics.longTaskMs<=BUDGETS.longTaskMs}};}
  function persist(){try{const history=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"),next=[snapshot(),...(Array.isArray(history)?history:[])].slice(0,20);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{}}
  async function report(){persist();if(!navigator.onLine||!window.REP_AUTH?.isPaired?.())return;try{await window.REP_AUTH.fetch("/api/telemetry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(snapshot())});}catch{}}
  addEventListener("pagehide",persist,{once:true});
  addEventListener("load",()=>setTimeout(report,3000),{once:true});
  window.REP_TELEMETRY={BUDGETS,snapshot};
})();
