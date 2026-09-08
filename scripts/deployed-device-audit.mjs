// Audits the deployed PWA at the two primary device sizes. Override the target
// with REP_DEVICE_AUDIT_URL when validating staging or a preview deployment.
import {chromium} from "playwright";

const target=process.env.REP_DEVICE_AUDIT_URL||"https://rep-gym-companion.mohamedahmedhosny95.workers.dev";
const profiles=[
  {name:"Honor 20 Pro portrait",width:360,height:780,mobile:true},
  {name:"iPhone 15 Pro portrait",width:393,height:852,mobile:true},
  {name:"Honor 20 Pro landscape",width:780,height:360,mobile:true,landscape:true},
  {name:"iPhone 15 Pro landscape",width:852,height:393,mobile:true,landscape:true}
];
const failures=[];
const browser=await chromium.launch({headless:true});

for(const profile of profiles){
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:true,hasTouch:true,deviceScaleFactor:profile.name.startsWith("iPhone")?3:2.625});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
  await page.addInitScript(()=>{
    window.__deviceAudit={lcp:0,cls:0,longTask:0};
    try{new PerformanceObserver(list=>list.getEntries().forEach(entry=>window.__deviceAudit.lcp=Math.max(window.__deviceAudit.lcp,entry.startTime))).observe({type:"largest-contentful-paint",buffered:true});}catch{}
    try{new PerformanceObserver(list=>list.getEntries().forEach(entry=>{if(!entry.hadRecentInput)window.__deviceAudit.cls+=entry.value;})).observe({type:"layout-shift",buffered:true});}catch{}
    try{new PerformanceObserver(list=>list.getEntries().forEach(entry=>window.__deviceAudit.longTask=Math.max(window.__deviceAudit.longTask,entry.duration))).observe({type:"longtask",buffered:true});}catch{}
  });
  const started=Date.now();
  const response=await page.goto(`${target.replace(/\/$/,"")}/#/today`,{waitUntil:"load",timeout:30000});
  await page.waitForSelector('html[data-app-ready="true"]',{timeout:15000});
  if(await page.locator("[data-onboarding-skip]").count())await page.click("[data-onboarding-skip]");
  await page.waitForTimeout(1200);
  const result=await page.evaluate(()=>{
    const nav=document.querySelector(".app-tabs"),navBox=nav.getBoundingClientRect(),buttons=[...nav.querySelectorAll("button")],timing=performance.getEntriesByType("navigation")[0];
    return {...window.__deviceAudit,readyMs:Math.round(timing?.domContentLoadedEventEnd||0),loadMs:Math.round(timing?.loadEventEnd||0),overflow:document.documentElement.scrollWidth-window.innerWidth,minTarget:Math.min(...buttons.map(button=>Math.min(button.getBoundingClientRect().width,button.getBoundingClientRect().height))),navBottom:window.innerHeight-navBox.bottom,direction:getComputedStyle(buttons[0]).flexDirection,safeAreaRules:["--safe-top","--safe-right","--safe-bottom","--safe-left"].every(name=>getComputedStyle(document.documentElement).getPropertyValue(name).trim()!=="")};
  });
  const checks=[
    [response?.ok(),`HTTP ${response?.status()||"failure"}`],
    [errors.length===0,errors.join(" | ")||"no console errors"],
    [result.overflow<=1,`horizontal overflow ${result.overflow}px`],
    [result.minTarget>=44,`smallest primary target ${Math.round(result.minTarget)}px`],
    [result.navBottom>=-1,`navigation bottom ${Math.round(result.navBottom)}px`],
    [result.safeAreaRules,"four-sided safe-area variables present"],
    [!profile.landscape||result.direction==="row",`landscape direction ${result.direction}`],
    [result.lcp>0&&result.lcp<=2500,`LCP ${Math.round(result.lcp)}ms`],
    [result.cls<=0.1,`CLS ${result.cls.toFixed(3)}`],
    [result.longTask<=200,`longest task ${Math.round(result.longTask)}ms`]
  ];
  for(const [ok,detail] of checks){console.log(`${ok?"PASS":"FAIL"}: ${profile.name} · ${detail}`);if(!ok)failures.push(`${profile.name}: ${detail}`);}
  console.log(`INFO: ${profile.name} · wall ${Date.now()-started}ms · DOM ready ${result.readyMs}ms · load ${result.loadMs}ms`);
  await context.close();
}

await browser.close();
if(failures.length){console.error(`\n${failures.length} deployed-device checks failed:\n- ${failures.join("\n- ")}`);process.exit(1);}
console.log("\nAll deployed-device checks passed.");
