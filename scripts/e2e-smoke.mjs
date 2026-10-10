import '../src/client/compatibility.js';
// Headless end-to-end smoke test for the deployed static app. Serves dist/client
// on a local port, drives it with Playwright, and fails the run (non-zero exit)
// on any assertion failure or any console/page error encountered along the way.
// Run with: node scripts/e2e-smoke.mjs
import { chromium, webkit } from "playwright";
import axe from "axe-core";
import http from "node:http";
import { createReadStream, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "dist", "client");
const port = 8934;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".mp4": "video/mp4" };

let originUnavailable=false;
const server = http.createServer((req, res) => {
  if(originUnavailable){req.socket.destroy();return;}
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  let filePath = normalize(join(root, urlPath === "/" ? "/index.html" : urlPath));
  if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end("not found"); return;
  }
  if(req.url.endsWith('?partial-demo')){res.writeHead(206,{'content-type':'video/mp4','content-range':'bytes 0-15/1000','content-length':16});res.end(Buffer.alloc(16));return;}
  if(req.url.endsWith('?interrupted-demo')){setTimeout(()=>{if(res.destroyed)return;res.writeHead(200,{'content-type':'video/mp4','content-length':statSync(filePath).size});createReadStream(filePath).pipe(res);},200);return;}
  const length=statSync(filePath).size,headers={"content-type":MIME[extname(filePath)]||"application/octet-stream","accept-ranges":"bytes"};
  const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||"");
  if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),length-1):length-1;if(start>=length||end<start){res.writeHead(416,{...headers,"content-range":`bytes */${length}`});res.end();return;}res.writeHead(206,{...headers,"content-range":`bytes ${start}-${end}/${length}`,"content-length":end-start+1});createReadStream(filePath,{start,end}).pipe(res);return;}
  res.writeHead(200,{...headers,"content-length":length});if(req.method==="HEAD")res.end();else createReadStream(filePath).pipe(res);
});

const failures = [];
let checks = 0;
function assertTrue(condition, label) {
  checks++;
  if (!condition) failures.push(label);
  console.log(`${condition ? "PASS" : "FAIL"}: ${label}`);
}
async function assertAccessibleView(page,label){
  const result=await page.locator("main").evaluate(main=>{
    const visible=element=>{const style=getComputedStyle(element),box=element.getBoundingClientRect();return !element.hidden&&style.display!=="none"&&style.visibility!=="hidden"&&box.width>0&&box.height>0;};
    const unnamed=[...main.querySelectorAll("button,a[href]")].filter(visible).filter(element=>!(element.getAttribute("aria-label")||element.textContent||"").trim()).length;
    const unlabeled=[...main.querySelectorAll("input:not([type=hidden]),textarea,select")].filter(visible).filter(element=>!element.getAttribute("aria-label")&&!element.closest("label")&&!element.id).length;
    return {unnamed,unlabeled,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
  });
  assertTrue(result.unnamed===0,`${label} has no unnamed visible actions`);
  assertTrue(result.unlabeled===0,`${label} has no unlabeled visible form controls`);
  assertTrue(result.overflow<=1,`${label} has no horizontal viewport overflow`);
}
async function assertAxe(page,label){
  // Check the usable settled state, independently of optional screenshot delays.
  await page.evaluate(async()=>{const running=document.getAnimations().filter(animation=>animation.playState==='running'&&Number.isFinite(animation.effect?.getComputedTiming().endTime));await Promise.race([Promise.all(running.map(animation=>animation.finished.catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,360))]);});
  // Finish the UI's next paint before axe begins its own expensive DOM scan.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.evaluate(p => { if(window.__awjVitals) window.__awjVitals.phase = "axe:" + p; }, label);
  const result=await page.evaluate(async()=>window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa"]}}));
  await page.evaluate(() => { if(window.__awjVitals) window.__awjVitals.phase = "post-axe"; });
  const serious=result.violations.filter(violation=>["serious","critical"].includes(violation.impact));
  if(serious.length)console.log(JSON.stringify(serious.map(violation=>({id:violation.id,nodes:violation.nodes.slice(0,12).map(node=>({target:node.target,summary:node.failureSummary}))})),null,2));
  assertTrue(serious.length===0,`${label} has no serious or critical axe violations${serious.length?`: ${serious.map(item=>item.id).join(", ")}`:""}`);
}

await new Promise(resolve => server.listen(port, resolve));
const baseUrl = `http://localhost:${port}`;

const webkitMode=process.env.AWJ_E2E_BROWSER==="webkit";
const browser = process.env.AWJ_E2E_CDP_URL?await chromium.connectOverCDP(process.env.AWJ_E2E_CDP_URL):webkitMode?await webkit.launch():await chromium.launch({
  channel: process.env.AWJ_E2E_BROWSER_CHANNEL||(existsSync("/Applications/Google Chrome.app") ? "chrome" : undefined),
  args: ["--no-sandbox"]
});
const consoleErrors = [],expectedNetworkDiagnostics=[];let testingNetworkFailure=false,reportMetrics=null;
try {
  const capture=process.env.AWJ_E2E_CAPTURE_DIR;if(capture)mkdirSync(capture,{recursive:true});
  const context = await browser.newContext({ viewport: { width: 390, height: 844 },hasTouch:true,isMobile:true,...(capture?{recordVideo:{dir:capture,size:{width:390,height:844}}}:{}) });
  const page = await context.newPage();
  const captureScreen=async name=>{if(capture){await page.waitForTimeout(320);await page.screenshot({path:join(capture,name+".png")});}};
  await page.addInitScript(()=>{
    window.__awjVitals={lcp:0,cls:0,interactionMs:0,interactions:[],longTask:0,appLongTask:0,longTasks:[],phase:"init"};
    try{new PerformanceObserver(list=>list.getEntries().forEach(entry=>{if(!entry.interactionId)return;window.__awjVitals.interactionMs=Math.max(window.__awjVitals.interactionMs,entry.duration);if(entry.duration>100)window.__awjVitals.interactions.push({name:entry.name,duration:entry.duration,phase:window.__awjVitals.phase,target:entry.target?`${entry.target.tagName.toLowerCase()}#${entry.target.id}.${String(entry.target.className||'')}`:'unknown',inputDelay:entry.processingStart-entry.startTime,processing:entry.processingEnd-entry.processingStart});})).observe({type:"event",durationThreshold:16,buffered:true});}catch{}
    try{new PerformanceObserver(list=>list.getEntries().forEach(entry=>window.__awjVitals.lcp=Math.max(window.__awjVitals.lcp,entry.startTime))).observe({type:"largest-contentful-paint",buffered:true});}catch{}
    try{new PerformanceObserver(list=>list.getEntries().forEach(entry=>{if(!entry.hadRecentInput)window.__awjVitals.cls+=entry.value;})).observe({type:"layout-shift",buffered:true});}catch{}
    try{new PerformanceObserver(list=>list.getEntries().forEach(entry=>{
      window.__awjVitals.longTask=Math.max(window.__awjVitals.longTask,entry.duration);
      if(!window.__awjVitals.phase?.startsWith("axe:")&&window.__awjVitals.phase!=="post-axe"){
        window.__awjVitals.appLongTask=Math.max(window.__awjVitals.appLongTask,entry.duration);
      }
      window.__awjVitals.longTasks.push({
        phase: window.__awjVitals.phase,
        startTime: Math.round(entry.startTime),
        duration: Math.round(entry.duration),
        name: entry.name,
        attribution: (entry.attribution||[]).map(a=>({name:a.name,containerType:a.containerType,containerSrc:a.containerSrc,containerId:a.containerId}))
      });
    })).observe({type:"longtask",buffered:true});}catch{}
  });
  await page.addInitScript({content:axe.source});
  page.on("pageerror", err => {consoleErrors.push(`pageerror: ${err.message}`);console.log(`BROWSER ERROR: ${err.stack||err.message}`);});
  page.on("console",msg=>{if(msg.type()!=="error")return;const text=msg.text();if(webkitMode&&testingNetworkFailure&&/^Failed to load resource:.*(network connection was lost|connection terminated unexpectedly|cancelled)/i.test(text)){expectedNetworkDiagnostics.push(text);return;}consoleErrors.push(`console.error: ${text}`);});

  await page.goto(baseUrl,{waitUntil:"load"});
  await page.waitForSelector('html[data-app-ready="true"]');
  assertTrue(await page.locator('.onboarding-backdrop').count()===1,'Setup opens on a fresh profile');
  await page.click('[data-onboarding-next]');await page.click('[data-onboarding-next]');await page.click('[data-onboarding-next]');
  await page.waitForSelector('.onboarding-backdrop',{state:'detached'});
  if(process.env.AWJ_E2E_THEME==='light')await page.evaluate(()=>{state.preferences.themeMode='default';applyThemeSettings();persist();});
  await page.evaluate(()=>{state.preferences.schedule[currentDay()]={morning:true,focus:'gym'};renderOverview();});
  assertTrue(await page.locator('main h1').textContent()==='Today','Today has one clear screen title');
  assertTrue(await page.locator('[data-today-start]').textContent()==='Start workout','Today exposes the scheduled workout directly');
  assertTrue((await page.locator('.core-vitals').boundingBox()).y<(await page.locator('[data-today-start]').boundingBox()).y,'Home vitals appear before the workout');
  await captureScreen('today');
  assertTrue(await page.locator('.readiness-note').count()===1,'Today has one readiness recommendation');
  assertTrue(!await page.locator('.habit-tracker').evaluate(x=>x.open),'Daily practices start as a compact summary on Today');
  await page.locator('.habits-summary').click();
  await page.click('[data-habit-id="sleep"]');
  await page.evaluate(()=>AWJ_STORE.flush());await page.reload();await page.waitForSelector('html[data-app-ready="true"]');
  assertTrue(await page.locator('[data-habit-id="sleep"][aria-pressed="true"]').count()===1,'Habit records survive reload');
  await page.click('[data-today-checkin]');await page.waitForSelector('[data-morning-checkin]');
  await page.selectOption('[data-morning-checkin] [name="energy"]','4');await page.selectOption('[data-morning-checkin] [name="soreness"]','2');
  await page.locator('.awj-modal-sheet .sheet-close').focus();await page.keyboard.press('Shift+Tab');assertTrue(await page.locator('[data-morning-checkin] button[type="submit"]').evaluate(el=>el===document.activeElement),'Check-in sheet keeps keyboard focus inside');
  await page.waitForTimeout(260);await assertAxe(page,'Recovery check-in');await page.locator('[data-morning-checkin] button[type="submit"]').click();await page.waitForSelector('.awj-modal-backdrop',{state:'detached'});
  assertTrue(await page.evaluate(()=>state.recoveryCheckins[0].energy)===4,'Quick check-in saves the existing recovery record');
  await page.click('[data-today-checkin]');await page.check('[data-morning-checkin] [name="illness"]');await page.locator('[data-morning-checkin] button[type="submit"]').click();await page.waitForSelector('.awj-modal-backdrop',{state:'detached'});
  assertTrue(await page.locator('[data-today-start]').textContent()==='Review recovery','Illness keeps the existing pause recommendation on Today');
  await page.evaluate(()=>showSessionPreview('gym'));await page.click('[data-start-session]');await page.waitForSelector('[data-review-recovery]');
  assertTrue(await page.locator('[data-acknowledge-workout]').count()===1,'A workout started from the library retains the symptom warning');await page.click('[data-review-recovery]');await page.waitForSelector('.awj-modal-backdrop',{state:'detached'});
  await page.evaluate(()=>{state.recoveryCheckins=[];AWJ_HEALTH_COVERAGE.invalidateCache(state);AWJ_HEALTH_ENGINE.invalidateCache(state);AWJ_NAVIGATION.navigate('today');});
  const destinations=[['home','Today','/today'],['train','Train','/train'],['food','Nutrition','/nutrition/today'],['wellbeing','Wellbeing','/wellbeing'],['insights','Progress','/progress']];
  for(const [tab,title,path] of destinations){await page.click(`[data-app-tab="${tab}"]`);await page.waitForFunction(t=>document.querySelector('main h1')?.textContent===t,title);assertTrue(page.url().endsWith('#'+path),title+' has a stable route');await captureScreen(tab);await assertAccessibleView(page,title);await assertAxe(page,title);}
  await page.goBack();await page.waitForSelector('.more-menu');assertTrue(page.url().endsWith('#/wellbeing'),'Browser Back restores Wellbeing');
  await page.goForward();await page.waitForSelector('.progress-overview');assertTrue(page.url().endsWith('#/progress'),'Browser Forward restores Progress');
  await page.click('[data-app-tab="wellbeing"]');await page.waitForSelector('.more-menu');
  await page.click('[data-habit-id="fajr"]');
  assertTrue(page.url().endsWith('#/wellbeing')&&await page.locator('main h1').textContent()==='Wellbeing','Checking a habit keeps the Wellbeing route and screen together');
  await page.click('[data-more-route="health-vitals"]');await page.waitForSelector('.recovery-sleep');
  assertTrue(await page.locator('.health-subnav,.health-workflow-nav').count()===0,'Recovery does not stack navigation layers');
  await page.locator('.recovery-sleep>summary').click();await page.fill('[data-sleep-bedtime]','22:15');await page.fill('[data-sleep-wake]','06:15');await page.click('[data-sleep-form] button[type="submit"]');
  await page.waitForSelector('.recovery-sleep');assertTrue(await page.evaluate(()=>state.sleepLogs.some(x=>x.hours===8)),'Existing sleep logic stays connected to Recovery');
  await page.click('[data-more-back]');await page.click('#settingsButton');await page.waitForSelector('[data-reminder-time="bedtime"]');
  assertTrue(await page.locator('[data-app-tab][aria-current="page"]').count()===0,'Settings keeps the primary tabs unselected');
  await page.click('[data-language="ar"]');assertTrue(await page.locator('html[dir="rtl"][lang="ar"]').count()===1,'Arabic selection applies RTL direction');
  assertTrue(await page.locator('[data-app-tab="wellbeing"] span').textContent()==='العافية','Primary navigation uses Arabic labels');
  await page.click('[data-language="en"]');assertTrue(await page.locator('html[dir="ltr"][lang="en"]').count()===1,'English selection restores LTR direction');
  await page.click('[data-settings-tab="coach"]');await page.waitForSelector('[data-health-profile="wakeTime"]');await page.click('[data-settings-back]');await page.waitForSelector('[data-reminder-time="bedtime"]');
  await page.click('[data-app-tab="food"]');await page.waitForSelector('.nutrition-actions');await page.click('[data-nutrition-log]');
  await page.fill('[data-food-note]','plain eggs and toast');await page.click('[data-manual-food]');await page.waitForSelector('[data-save-food]');await page.click('[data-save-food]');
  await page.waitForSelector('.nutrition-actions');assertTrue(await page.evaluate(()=>state.foodEntries.length>0),'Manual food entry works without AI setup');
  await page.click('[data-nutrition-water]');await page.waitForSelector('.water-card:visible');await page.click('[data-water-delta="250"]');
  assertTrue(await page.evaluate(()=>state.water[isoDay()])===250,'Water tracking stays connected');
    await page.click('#settingsButton');await page.waitForSelector('[data-reminder-time="bedtime"]');
  const reminder=await page.evaluate(()=>({windDown:document.querySelector('[data-reminder-time="bedtime"]').value,bedtime:AWJ_HEALTH_ENGINE.bedtime(state,isoDay(),state.healthProfile).time,enabled:[...document.querySelectorAll('[data-reminder-enabled]')].some(x=>x.checked)}));
  const [bedHour,bedMinute]=reminder.bedtime.split(':').map(Number),windDown=(bedHour*60+bedMinute-30+1440)%1440;
  assertTrue(reminder.windDown===`${String(Math.floor(windDown/60)).padStart(2,'0')}:${String(windDown%60).padStart(2,'0')}`&&!reminder.enabled,'Existing calculated reminders remain opt-in');
  await page.click('[data-settings-tab="sync"]');await page.waitForSelector('.sync-center');assertTrue(await page.locator('[data-sync-all]').count()===1&&await page.locator('[data-sync-retry-all]').count()===1,'Connections preserves sync and retry controls');
await page.click('[data-app-tab="train"]');await page.waitForSelector('.exercise-library');
  await page.click('[data-train-jump="library"]');assertTrue(await page.locator('[data-library-search]').evaluate(el=>el===document.activeElement),'Find exercise shortcut focuses the existing search');
  await page.fill('[data-library-search]','lateral');assertTrue((await page.locator('[data-library-exercise]').allTextContents()).every(x=>/lateral/i.test(x)),'Exercise search uses canonical exercise names');
  await page.selectOption('[data-library-equipment]','machines');assertTrue(!(await page.locator('[data-library-results]').textContent()).includes('Dumbbell Lateral Raise'),'Equipment filtering removes incompatible exercises');
  await page.fill('[data-library-search]','');await page.selectOption('[data-library-equipment]','all');
  await page.click('[data-routine-favourite="gym"]');await page.evaluate(()=>AWJ_STORE.flush());await page.reload();await page.waitForSelector('html[data-app-ready="true"]');
  assertTrue(await page.locator('[data-routine-favourite="gym"][aria-pressed="true"]').count()===1,'Routine favourites survive a reload');
  await page.click('[data-create-new-routine]');await page.fill('[data-routine-title]','QA Saved Circuit');
  const option=await page.locator('[data-add-ex-select]').evaluate(x=>[...x.options].find(o=>o.textContent.includes('Dumbbell Lateral Raise')).value);await page.selectOption('[data-add-ex-select]',option);
  assertTrue(await page.locator('[data-routine-title]').inputValue()==='QA Saved Circuit','Adding exercises preserves the routine draft');
  await page.click('[data-save-routine]');await page.evaluate(()=>AWJ_STORE.flush());await page.reload();await page.waitForSelector('html[data-app-ready="true"]');
  assertTrue(await page.locator('[data-routine-card]').filter({hasText:'QA Saved Circuit'}).count()===1,'Custom routines survive a full reload');
  await page.click('[data-app-tab="home"]');await page.waitForSelector('[data-today-start]');
  await page.evaluate(()=>{state.sleepLogs=[];state.recoveryCheckins=[];state.healthMetrics={};AWJ_HEALTH_COVERAGE.invalidateCache(state);AWJ_HEALTH_ENGINE.invalidateCache(state);renderOverview();});await page.click('[data-today-start]');await page.waitForSelector('.workout-player');
  assertTrue(await page.locator('.workout-preflight-panel').count()===0,'Missing wearable data does not block manual workout logging');
  assertTrue(await page.locator('.workout-identity h1').textContent()==='Stationary Bike','Scheduled session starts at the correct exercise');
  assertTrue(await page.locator('.exercise-hero-stage [data-media-play]:visible').count()===0,'A static exercise has no fabricated playback controls');
  await page.click('[data-exercise-timer]');await page.waitForSelector('.workout-timed-mode');await page.click('[data-timed-pause]');assertTrue(await page.locator('.workout-timed-mode.is-paused').count()===1,'The existing timed exercise can pause');await page.click('[data-timed-add]');assertTrue((await page.locator('[data-timed-total]').textContent()).includes('5:15'),'Timed exercise extension changes the real total');await page.click('[data-timed-close]');await page.waitForSelector('.workout-timed-mode',{state:'detached'});
  await page.locator('.set-log-panel>summary').click();await page.click('.simple-set-history [data-set="0"]');assertTrue(await page.evaluate(()=>state.completed['gym-0'].includes(0)),'Timed and warm-up sets have editable history rows');await page.waitForTimeout(310);await page.click('.simple-set-history [data-set="0"]');assertTrue(await page.evaluate(()=>state.completed['gym-0'].length)===0,'A completed timed set can be corrected from its history');await page.locator('.set-log-panel>summary').click();await page.waitForTimeout(310);

  await page.click('[data-next]');await page.waitForTimeout(310);await page.click('[data-next]');await page.waitForFunction(()=>document.querySelector('.workout-identity h1')?.textContent==='Leg Press');
  for(const [width,height] of [[390,844],[360,780],[320,667]]){await page.setViewportSize({width,height});const layout=await page.evaluate(()=>{const button=document.querySelector('[data-next]'),input=document.querySelector('[data-live-log][data-log="reps"]'),media=document.querySelector('.exercise-hero-stage');return {button:button.getBoundingClientRect().bottom,input:input.getBoundingClientRect().bottom,media:media.getBoundingClientRect().height,overflow:document.documentElement.scrollWidth-innerWidth};});assertTrue(layout.button<=height&&layout.input<height-70,`Inputs and Log Set are visible at ${width} × ${height}`);assertTrue(layout.media<=240&&layout.overflow<=1,`Compact media and no overflow at ${width}px`);}
  await page.setViewportSize({width:320,height:667});await page.locator('.set-log-panel>summary').click();
  const setRows=await page.locator('.set-log-panel').evaluate(panel=>({overflow:panel.scrollWidth-panel.clientWidth,fields:[...panel.querySelectorAll('.set-input-wrap input')].map(el=>({width:el.getBoundingClientRect().width,font:parseFloat(getComputedStyle(el).fontSize)})),targets:[...panel.querySelectorAll('button')].map(el=>Math.min(el.getBoundingClientRect().width,el.getBoundingClientRect().height))}));
  assertTrue(setRows.overflow<=1&&setRows.fields.every(x=>x.width>=55&&x.font>=16),'Set-history fields remain readable at 320px');assertTrue(setRows.targets.every(x=>x>=44),'Set-history actions have 44px touch targets');await page.locator('.set-log-panel').scrollIntoViewIfNeeded();await captureScreen('mobile-set-history');await page.locator('.set-log-panel>summary').click();
  await page.setViewportSize({width:852,height:393});await page.evaluate(()=>window.scrollTo(0,0));await assertAccessibleView(page,'Landscape workout');await captureScreen('mobile-landscape');
  await page.setViewportSize({width:390,height:844});await captureScreen('workout');await assertAxe(page,'Workout current set');assertTrue(await page.locator('.exercise-hero-stage video').count()===0,'Photographed positions are never morphed into motion');assertTrue(await page.locator('[data-live-log][data-log="weight"]').inputValue()==='','No starting weight is invented');
  await page.locator('[data-live-log][data-log="weight"]').focus();await page.keyboard.press('Enter');assertTrue(await page.locator('[data-live-log][data-log="reps"]').evaluate(el=>el===document.activeElement),'Keyboard Next moves from weight to reps without logging');await page.keyboard.press('Enter');await page.keyboard.press('Enter');assertTrue(await page.evaluate(()=>!(state.completed['gym-1']||[]).length),'Keyboard Done does not complete an unlogged set');
  await page.locator('[data-live-log][data-log="reps"]').focus();await page.setViewportSize({width:390,height:480});await page.waitForFunction(()=>document.body.classList.contains('is-keyboard-open'));
  const keyboard=await page.evaluate(()=>({button:document.querySelector('[data-next]').getBoundingClientRect().bottom,input:document.querySelector('[data-live-log][data-log="reps"]').getBoundingClientRect().bottom,height:visualViewport.height,focus:document.activeElement.dataset.log}));
  assertTrue(keyboard.button<=keyboard.height+1&&keyboard.input<keyboard.button&&keyboard.focus==='reps','Resized-keyboard layout keeps the input and Log Set reachable');await captureScreen('mobile-keyboard');await page.click('[data-keyboard-dismiss]');await page.waitForFunction(()=>!document.body.classList.contains('is-keyboard-open'));await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));
  await page.locator('[data-live-log][data-log="reps"]').focus();
  await page.evaluate(()=>{const viewport=visualViewport;window.__viewportMock={height:480,scale:1};Object.defineProperty(viewport,'height',{configurable:true,get:()=>__viewportMock.height});Object.defineProperty(viewport,'scale',{configurable:true,get:()=>__viewportMock.scale});viewport.dispatchEvent(new Event('resize'));});
  await page.waitForFunction(()=>document.body.classList.contains('is-keyboard-open'));
  assertTrue(await page.locator('[data-next]').evaluate(el=>el.getBoundingClientRect().bottom<=480),'Overlay-keyboard geometry raises Log Set above the obscured area');
  await page.evaluate(()=>{__viewportMock.scale=2;visualViewport.dispatchEvent(new Event('resize'));});await page.waitForFunction(()=>!document.body.classList.contains('is-keyboard-open'));
  assertTrue(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--keyboard-bottom'))==='0px','Pinch zoom is not mistaken for an open keyboard');
  await page.evaluate(()=>{delete visualViewport.height;delete visualViewport.scale;document.activeElement.blur();visualViewport.dispatchEvent(new Event('resize'));});await page.evaluate(()=>window.scrollTo(0,0));
  await page.fill('[data-live-log][data-log="weight"]','40');await page.fill('[data-live-log][data-log="reps"]','10');await page.fill('[data-live-log][data-log="rpe"]','7');
  const inputClarity=await page.locator('[data-live-log][data-log="reps"]').evaluate(el=>{const box=el.getBoundingClientRect(),context=document.createElement('canvas').getContext('2d');context.font=getComputedStyle(el).font;return {width:el.clientWidth,needed:context.measureText(el.value).width,exposed:document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)===el};});assertTrue(inputClarity.width>=inputClarity.needed+8&&inputClarity.exposed,'Current reps are legible and not covered by an overlay');
  await page.evaluate(()=>{document.querySelector('[data-live-log][data-log="reps"]').focus();Object.defineProperty(visualViewport,'height',{configurable:true,value:480});visualViewport.dispatchEvent(new Event('resize'));});await page.waitForFunction(()=>document.body.classList.contains('is-keyboard-open'));
  await page.waitForTimeout(310);await page.locator('[data-next]').dispatchEvent('click');await page.locator('[data-next]').dispatchEvent('click');assertTrue(await page.evaluate(()=>state.completed['gym-1'].length)===1,'Rapid double taps cannot log two sets');assertTrue(await page.locator('#timerDock:not(.is-hidden)').count()===1,'Logging enters the rest state');assertTrue(!(await page.locator('.workout-action-band').isVisible()),'Rest and logging do not overlap');await page.waitForFunction(()=>!document.body.classList.contains('is-keyboard-open'));assertTrue(await page.evaluate(()=>!document.activeElement.matches('[data-log]')),'Logging a set dismisses the editor before rest');await page.evaluate(()=>{delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'));});
  await page.waitForTimeout(320);await captureScreen('rest');await assertAxe(page,'Rest state');const restLayout=await page.locator('#timerDock').evaluate(el=>{const box=el.getBoundingClientRect();return {left:box.left,right:box.right,bottom:box.bottom};});assertTrue(restLayout.left>=0&&restLayout.right<=390&&restLayout.bottom<=844,'The rest dock stays fully within the phone viewport');assertTrue(await page.locator('#timerAdd').isVisible()&&await page.locator('#timerSkip').isVisible(),'Rest shows +15 seconds and Skip together');const restTarget=await page.evaluate(()=>state.timer.targetEndTime);await page.evaluate(()=>AWJ_NAVIGATION.navigate('today'));await page.waitForSelector('[data-today-start]');assertTrue(await page.locator('#timerDock').isVisible()===false,'Browsing Today hides workout rest controls');await page.click('[data-today-start]');await page.waitForSelector('.workout-player');assertTrue(await page.evaluate(()=>state.timer.targetEndTime)===restTarget,'Returning to the workout preserves the absolute rest target');await page.click('#timerPause');const pausedRemaining=await page.evaluate(()=>state.timer.remaining);await page.evaluate(()=>AWJ_NAVIGATION.navigate('today'));await page.waitForSelector('[data-today-start]');await page.click('[data-today-start]');await page.waitForSelector('.workout-player');assertTrue(await page.evaluate(()=>state.timer.paused),'Paused rest stays paused when returning to the workout');await page.click('#timerPause');await page.waitForFunction(previous=>state.timer.remaining<previous,pausedRemaining,{timeout:2500});assertTrue(await page.evaluate(()=>Boolean(state.timer.interval)),'A restored paused timer resumes a working countdown');await page.locator('.undo-bar button').click();assertTrue(await page.evaluate(()=>state.completed['gym-1'].length)===0,'Undo restores the previous completion state');assertTrue(await page.evaluate(()=>state.timer)===null,'Undo restores the preceding timer state');assertTrue(await page.locator('.current-set-card .workout-undo').count()===0,'Undo clears its local set control');
  for(let attempt=0;attempt<8&&await page.evaluate(()=>state.index===1);attempt++){if(await page.locator('#timerDock:not(.is-hidden)').count())await page.click('#timerSkip');await page.waitForTimeout(310);await page.click('[data-next]');}
  await page.waitForFunction(()=>state.index===2);await page.locator('.workout-advanced>summary').click();await page.click('[data-jump-exercise]');await page.waitForFunction(()=>state.index===3);
  await page.click('[data-swap-modal]');await page.click('[data-select-swap="Push-ups"]');await page.waitForSelector('.workout-identity h1');await page.waitForFunction(()=>document.querySelector('.workout-identity h1')?.textContent==='Push-ups');
  assertTrue(await page.evaluate(()=>state.exerciseSubstitutions['Chest Press']||null)===null,'A session swap does not edit saved routine preferences');
  await page.locator('[data-media-expand]').click();await page.selectOption('[data-media-rate]','0.5');await page.click('[data-media-replay]');await page.waitForFunction(()=>document.querySelector('.exercise-hero-stage video')?.currentTime>0.1);
  const continuity=await page.evaluate(()=>{const v=document.querySelector('.exercise-hero-stage video'),time=v.currentTime,input=document.querySelector('[data-live-log][data-log="reps"]');input.focus();input.value='12';input.dispatchEvent(new Event('input',{bubbles:true}));renderExercise();return {same:v===document.querySelector('.exercise-hero-stage video'),position:v.currentTime>=time,focus:input===document.activeElement,rate:v.playbackRate};});
  assertTrue(continuity.same&&continuity.position&&continuity.focus&&continuity.rate===0.5,'Logging preserves player, position, speed and focus');
  const nativeMode=await page.evaluate(async()=>{const video=document.querySelector('.exercise-hero-stage video');video.dispatchEvent(new Event('webkitbeginfullscreen'));const entered=video.getAttribute('src').includes('-1080-');video.dispatchEvent(new Event('webkitendfullscreen'));return {entered,restored:video.getAttribute('src').includes('-720-'),same:video===document.querySelector('.exercise-hero-stage video')};});assertTrue(nativeMode.entered&&nativeMode.restored&&nativeMode.same,'Native fullscreen events select HD then restore phone quality without replacing the player');
  await captureScreen('expanded-demo');await page.selectOption('[data-media-quality]','1080');assertTrue(await page.evaluate(()=>state.mediaQuality)==='1080','Video quality preference saves');await page.locator('[data-media-expand]').click();
  await page.evaluate(()=>AWJ_STORE.flush());await page.reload();await page.waitForSelector('html[data-app-ready="true"]');await page.click('[data-app-tab="home"]');await page.waitForSelector('[data-today-start]');
  assertTrue(await page.locator('[data-today-start]').textContent()==='Resume workout','Today offers the active session after reload');await page.click('[data-today-start]');await page.waitForFunction(()=>document.querySelector('.workout-identity h1')?.textContent==='Push-ups');
  assertTrue(await page.evaluate(()=>state.logs['Push-ups'].sets[0].reps)==='12','Resume preserves the logged fields and session swap');
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{state.index=2;renderExercise();state.index=3;renderExercise();});assertTrue(await page.locator('video').evaluate(x=>x.paused),'Reduced motion keeps the demonstration paused');await page.emulateMedia({reducedMotion:'no-preference'});
  const asset=await page.evaluate(async()=>{const a=AWJ_MEDIA_PLAYER.assets({name:'Push-ups'},{allQualities:true});await AWJ_WORKOUT_MEDIA.download(a);return a.find(x=>x.type==='video').src;});await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));testingNetworkFailure=true;if(webkitMode)originUnavailable=true;else await context.setOffline(true);const range=await page.evaluate(async src=>{const r=await fetch(src,{headers:{Range:'bytes=0-15'}});return {status:r.status,length:(await r.arrayBuffer()).byteLength};},asset);assertTrue(range.status===206&&range.length===16,webkitMode?'Cached video ranges work with the origin unavailable':'Offline videos provide actual byte ranges');
  await page.reload();await page.waitForSelector('html[data-app-ready="true"]');assertTrue(await page.locator('[data-app-tab]').count()===5,webkitMode?'Cold reload restores the shell with the origin unavailable':'Offline cold reload restores the shell');if(webkitMode)originUnavailable=false;else await context.setOffline(false);
  const interruptedSrc=asset+'?interrupted-demo';
  const interrupted=await page.evaluate(async src=>{const control=new AbortController();setTimeout(()=>control.abort(),30);const result=await AWJ_WORKOUT_MEDIA.download([{src,type:'video',bytes:1}],()=>{},{signal:control.signal});return {result,inspection:await AWJ_WORKOUT_MEDIA.inspect([{src,type:'video',bytes:1}])};},interruptedSrc);
  assertTrue(interrupted.result.aborted&&!interrupted.inspection.complete,'Interrupted downloads are not marked complete');
  const partialSrc=asset+'?partial-demo';
  const partial=await page.evaluate(async src=>{const result=await AWJ_WORKOUT_MEDIA.download([{src,type:'video',bytes:1000}]);return {result,inspection:await AWJ_WORKOUT_MEDIA.inspect([{src,type:'video',bytes:1000}])};},partialSrc);
  assertTrue(!partial.result.complete&&!partial.inspection.complete,'A partial 206 response cannot become a complete offline video');testingNetworkFailure=false;
  await page.click('[data-app-tab="home"]');await page.waitForSelector('[data-today-start]');await page.click('[data-today-start]');await page.waitForFunction(()=>document.querySelector('.workout-identity h1')?.textContent==='Push-ups');
  await page.waitForTimeout(310);await page.click('[data-next]');await page.click('#timerSkip');await page.click('[data-swap-modal]');await page.click('[data-select-swap=""]');await page.waitForFunction(()=>document.querySelector('.workout-identity h1')?.textContent==='Chest Press');
  await page.locator('.set-log-panel>summary').click();await page.fill('[data-log="reps"][data-log-set="0"][data-log-exercise="Push-ups"]','11');
  assertTrue(await page.evaluate(()=>state.logs['Push-ups'].sets[0].reps)==='11','Editing a completed swapped set updates the performed exercise');
  await page.fill('[data-live-log][data-log="weight"]','42');await page.fill('[data-live-log][data-log="reps"]','10');
  for(let attempt=0;attempt<50&&await page.locator('[data-finish-workout]').count()===0;attempt++){if(await page.locator('#timerDock:not(.is-hidden)').count())await page.click('#timerSkip');await page.waitForTimeout(310);await page.click('[data-next]');}
  await page.waitForSelector('[data-finish-workout]');await captureScreen('completion');
  const completed=await page.evaluate(()=>({record:state.history[0],swaps:state.sessionSubstitutions}));assertTrue(completed.record.entries.some(x=>x.exercise==='Push-ups'&&x.reps==='11')&&completed.record.entries.some(x=>x.exercise==='Chest Press'&&x.weight==='42'),'Completion records each exercise actually performed');assertTrue(completed.swaps===null,'Session substitutions expire when the workout ends');
  assertTrue((await page.locator('[data-finish-workout]').boundingBox()).y<844,'Finish stays in the first completion viewport');await assertAccessibleView(page,'Completion');await assertAxe(page,'Completion');
  await page.locator('.completion-next details>summary').click();await page.click('[data-accept-progression]');assertTrue(await page.evaluate(()=>Boolean(state.trainingTargets['Chest Press'].acceptedAt)),'Next-session targets use the existing accepted-target state');
  await page.click('[data-finish-workout]');await page.waitForSelector('[data-today-start]');assertTrue(await page.locator('[data-today-start]').textContent()!=='Resume workout','Finish returns to Today without a stale resume');
  await page.click('[data-app-tab="insights"]');await page.waitForSelector('.progress-history');assertTrue(await page.locator('.progress-overview,.exercise-progress,.next-step').count()===3,'Progress answers the three intended questions');assertTrue(await page.locator('[data-ask-data]').count()===1,'Detailed analytics remains reachable in Progress');await page.click('[data-open-weekly]');assertTrue(await page.locator('.progress-analysis').evaluate(el=>el.open),'Weekly report opens directly from the Progress shortcut');await page.locator('.progress-analysis>summary').click();assertTrue(await page.locator('[data-accept-progression]').count()===1,'Accepted next-session targets remain visible in Progress');assertTrue(await page.locator('[data-product-weekly]').count()===1&&await page.locator('[data-product-experiments]').count()===1,'The weekly report and experiment tools remain available');
  await page.locator('.progress-analysis>summary').click();await page.locator('.performance-analytics .insights-more>summary').click();await page.fill('#askDataQuestion','How consistent is my protein?');await page.click('[data-ask-data] button');assertTrue(await page.locator('.data-answer details span').count()>0,'Detailed analytics returns inspectable evidence');assertTrue(await page.locator('.local-only').textContent()==='No upload','Existing data analysis remains local');

  await page.fill('[data-history-search]','missing exercise');assertTrue((await page.locator('[data-history-results]').textContent()).includes('No')||(await page.locator('[data-history-results]').textContent()).includes('first workout'),'History search has an honest empty state');
  await page.evaluate(()=>{state.sessionStartedAt=null;state.history.push({session:'gym',date:new Date().toISOString(),duration:1200,sets:1,entries:[{exercise:'Chest Press',weight:'40',reps:'10'}]});renderInsights();});await page.fill('[data-history-search]','Chest Press');assertTrue((await page.locator('[data-history-results]').textContent()).includes('Chest Press'),'History searches exercise records');
  await page.evaluate(()=>{AWJ_NAVIGATION.navigate('training-program');AWJ_NAVIGATION.navigate('nutrition-today');AWJ_NAVIGATION.navigate('wellbeing');});await page.waitForSelector('.more-menu');assertTrue(page.url().endsWith('#/wellbeing'),'Rapid navigation commits only the winning screen');
  for(const width of [320,360,375,390,414,430]){await page.setViewportSize({width,height:844});for(const [tab,title] of destinations){await page.click(`[data-app-tab="${tab}"]`);await page.waitForFunction(t=>document.querySelector('main h1')?.textContent===t,title);await assertAccessibleView(page,`${title} ${width}px`);const navSize=await page.locator('#appTabs').evaluate(el=>Math.min(...[...el.querySelectorAll('button')].map(b=>Math.min(b.getBoundingClientRect().width,b.getBoundingClientRect().height))));assertTrue(navSize>=44,`${title} navigation targets remain 44px at ${width}px`);}}
  await page.setViewportSize({width:932,height:430});await page.click('[data-app-tab="home"]');await page.waitForSelector('[data-today-start]');assertTrue(await page.locator('#appTabs').evaluate(el=>{const box=el.getBoundingClientRect();return box.width>box.height&&box.bottom<=innerHeight;}),'Wide touch phones keep bottom navigation in landscape');
  await page.setViewportSize({width:852,height:393});await page.click('[data-app-tab="home"]');await page.waitForSelector('[data-today-start]');await assertAccessibleView(page,'Landscape Today');
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const rows=[...document.querySelectorAll('main *,#appTabs *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);for(const [el,size] of rows)el.style.fontSize=`${size*2}px`;});await assertAccessibleView(page,'Text scaling');await page.evaluate(()=>document.querySelectorAll('main *,#appTabs *').forEach(el=>el.style.fontSize=''));
  const vitals=await page.evaluate(()=>__awjVitals);if(vitals.lcp>0)assertTrue(vitals.lcp<=2500,`LCP within budget (${Math.round(vitals.lcp)} ms)`);assertTrue(vitals.cls<=0.1,`CLS within budget (${vitals.cls.toFixed(3)})`);
  if(vitals.interactionMs>200)console.log(JSON.stringify({slowInteractions:vitals.interactions},null,2));
  if(await page.evaluate(()=>PerformanceObserver.supportedEntryTypes.includes('event')))assertTrue(vitals.interactionMs<=200,`Observed interaction duration within 200 ms (${Math.round(vitals.interactionMs)} ms)`);
  reportMetrics={build:await page.evaluate(()=>AWJ_BUILD_VERSION),lcpMs:vitals.lcp||null,cls:await page.evaluate(()=>PerformanceObserver.supportedEntryTypes.includes('layout-shift'))?vitals.cls:null,maxObservedInteractionMs:await page.evaluate(()=>PerformanceObserver.supportedEntryTypes.includes('event'))?vitals.interactionMs:null,longTaskMs:vitals.appLongTask,browser:(webkitMode?'WebKit':'Chrome')+' with touch/mobile emulation; no physical device certification',networkTest:webkitMode?'Local server forcibly disconnects requests; offline-emulation bug microsoft/playwright#42775':'BrowserContext offline mode',expectedNetworkDiagnostics};
  if(capture)writeFileSync(join(capture,'metrics.json'),JSON.stringify(reportMetrics,null,2));
  await context.close();
  assertTrue(consoleErrors.length===0,`No console/page errors (${consoleErrors.length})`);if(consoleErrors.length)console.log(consoleErrors.join('\n'));

} finally {
  await browser.close();
  server.close();
}

if(process.env.AWJ_E2E_REPORT){mkdirSync(dirname(process.env.AWJ_E2E_REPORT),{recursive:true});writeFileSync(process.env.AWJ_E2E_REPORT,JSON.stringify({...reportMetrics,checks,passed:checks-failures.length,failures},null,2)+'\n');}
console.log(`\n${checks - failures.length}/${checks} checks passed.`);
if (failures.length) {
  console.error("\nFAILED:\n" + failures.map(f => `  - ${f}`).join("\n"));
  process.exit(1);
}
