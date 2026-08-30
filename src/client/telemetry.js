(function(){
  const STORAGE_KEY="rep-rum-v1",BUDGETS={lcpMs:2500,cls:0.1,interactionMs:200,longTaskMs:200,mediaLoadMs:1200,mediaDecodeMs:120};
  const metrics={build:String(window.REP_BUILD_VERSION||"unknown").slice(0,16),path:location.pathname,recordedAt:new Date().toISOString(),lcpMs:0,cls:0,longTaskMs:0,interactionMs:0};
  const media={loads:0,preloads:0,failures:0,bytes:0,maxLoadMs:0,maxDecodeMs:0};
  const numeric=value=>Number.isFinite(value)?Math.round(value*1000)/1000:0;
  function observe(type,callback){try{new PerformanceObserver(list=>list.getEntries().forEach(callback)).observe({type,buffered:true});}catch{}}
  observe("largest-contentful-paint",entry=>{metrics.lcpMs=Math.max(metrics.lcpMs,numeric(entry.startTime));});
  observe("layout-shift",entry=>{if(!entry.hadRecentInput)metrics.cls=numeric(metrics.cls+entry.value);});
  observe("longtask",entry=>{metrics.longTaskMs=Math.max(metrics.longTaskMs,numeric(entry.duration));});
  observe("event",entry=>{metrics.interactionMs=Math.max(metrics.interactionMs,numeric(entry.duration));});
  function recordMedia(sample={}){const preload=sample.stage==="next-preload";if(preload)media.preloads+=1;else media.loads+=1;if(sample.ok===false)media.failures+=1;media.bytes+=Math.max(0,Number(sample.bytes)||0);media.maxLoadMs=Math.max(media.maxLoadMs,numeric(Number(sample.loadMs)||0));media.maxDecodeMs=Math.max(media.maxDecodeMs,numeric(Number(sample.decodeMs)||0));}
  function snapshot(){const navigation=performance.getEntriesByType("navigation")[0];return {...metrics,loadMs:numeric(navigation?.loadEventEnd||performance.now()),media:{...media},withinBudget:{lcp:!metrics.lcpMs||metrics.lcpMs<=BUDGETS.lcpMs,cls:metrics.cls<=BUDGETS.cls,interaction:metrics.interactionMs<=BUDGETS.interactionMs,longTask:metrics.longTaskMs<=BUDGETS.longTaskMs,mediaLoad:media.maxLoadMs<=BUDGETS.mediaLoadMs,mediaDecode:media.maxDecodeMs<=BUDGETS.mediaDecodeMs}};}
  function persist(){try{const history=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"),next=[snapshot(),...(Array.isArray(history)?history:[])].slice(0,20);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{}}
  async function report(){persist();if(!navigator.onLine||!window.REP_AUTH?.isPaired?.())return;try{await window.REP_AUTH.fetch("/api/telemetry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(snapshot())});}catch{}}
  addEventListener("pagehide",persist,{once:true});
  addEventListener("load",()=>setTimeout(report,3000),{once:true});
  window.REP_TELEMETRY={BUDGETS,snapshot,recordMedia};
})();
