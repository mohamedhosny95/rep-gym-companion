// Local visual and behavior certification. All health values are synthetic fixtures.
import '../src/client/compatibility.js';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createReadStream,existsSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import axe from 'axe-core';
const root=fileURLToPath(new URL('../dist/client/',import.meta.url));
const captures=process.env.AWJ_REDESIGN_CAPTURE_DIR||fileURLToPath(new URL('../work/redesign-evidence/',import.meta.url));
mkdirSync(captures,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4'};
const server=http.createServer((request,response)=>{
  const path=new URL(request.url,'http://localhost').pathname;
  if(path.startsWith('/api/')){response.setHeader('content-type','application/json');response.end(JSON.stringify({ok:true,configured:false,entries:[],queue:[],status:'local-test'}));return;}
  const file=resolve(root,'.'+(path==='/'?'/index.html':decodeURIComponent(path)));
  if(!file.startsWith(root.endsWith(sep)?root:root+sep)||!existsSync(file)||statSync(file).isDirectory()){response.writeHead(404);response.end();return;}
  response.setHeader('content-type',types[extname(file)]||'application/octet-stream');createReadStream(file).pipe(response);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:existsSync('/Applications/Google Chrome.app')?'chrome':undefined});
const failures=[],results=[];
const profiles=[{name:'phone',width:393,height:852},{name:'narrow',width:320,height:667},{name:'landscape',width:852,height:393},{name:'tablet',width:768,height:1024},{name:'desktop',width:1440,height:1000}];
function record(ok,label){results.push({ok,label});if(!ok)failures.push(label);}
async function settle(page){await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(animation=>Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation=>animation.finished.catch(()=>{})));});}
async function accessibility(page,label){await settle(page);const result=await page.evaluate(async()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}}));const violations=result.violations.filter(row=>['critical','serious'].includes(row.impact));record(!violations.length,`${label}: accessibility`);if(violations.length)console.log(JSON.stringify(violations.map(row=>({id:row.id,nodes:row.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),null,2));}
async function navigationGeometry(page,label){
  const result=await page.evaluate(()=>{
    const nav=document.querySelector('.app-tabs'),bounds=nav.getBoundingClientRect(),buttons=[...nav.querySelectorAll('button')];
    const boxes=buttons.map(button=>button.getBoundingClientRect());
    return {selected:buttons.filter(button=>button.getAttribute('aria-current')==='page').length,contained:boxes.every(box=>box.left>=bounds.left&&box.right<=bounds.right+.5&&box.top>=bounds.top&&box.bottom<=bounds.bottom+.5),target:boxes.every(box=>box.width>=44&&box.height>=44),highlight:buttons.filter(button=>{const color=getComputedStyle(button).backgroundColor;return color!=='rgba(0, 0, 0, 0)'&&color!=='transparent';}).map(button=>button.dataset.appTab),current:buttons.find(button=>button.getAttribute('aria-current')==='page')?.dataset.appTab,overflow:document.documentElement.scrollWidth-window.innerWidth};
  });
  record(result.selected===1&&result.contained&&result.target&&result.highlight.length===1&&result.highlight[0]===result.current&&result.overflow<=1,`${label}: selected highlight stays inside the correct target`);
}
try{
  for(const profile of profiles){
    const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:profile.width<900,hasTouch:profile.width<900,timezoneId:'Africa/Cairo'});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(({key})=>{
      if(localStorage.getItem(key))return;
      const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      const shift=offset=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
      const sleepLogs=[],recoveryCheckins=[],activeEnergy={},healthMetrics={};
      for(let offset=-21;offset<=0;offset++){
        const day=shift(offset),importedAt=new Date().toISOString();
        sleepLogs.push({date:day,hours:offset===0?7.4:7.2+(offset%3)*.1,hrv:offset===0?62:57,rhr:offset===0?54:56,resp:14.2,source:'Apple Health',importedAt});
        recoveryCheckins.push({dateKey:day,createdAt:importedAt,energy:4,soreness:2,stress:2,sleep:7.4,pain:false});
        activeEnergy[day]=offset===0?325:350+Math.abs(offset)*15;
        healthMetrics[day]={date:day,source:'Apple Health',importedAt,steps:6800,active_energy_kcal:activeEnergy[day]};
      }
      localStorage.setItem(key,JSON.stringify({version:22,sleepLogs,recoveryCheckins,activeEnergy,healthMetrics,lastVitalsImportAt:new Date().toISOString(),lastVitalsImportDate:date,preferences:{appearanceVersion:1,themeMode:'oled',language:'en'},onboarding:{completedAt:new Date().toISOString()},history:[],daily:{habits:{[date]:{checked:{sleep:true,fajr:true,workout:true,water:true}}}},water:{[date]:1800},foodEntries:[{id:'visual-fixture',date:new Date().toISOString(),food_name:'Illustrative meal',calories:1420,protein_g:100}]}));
    },{key:AWJ_COMPAT.stateKey});
    await page.addInitScript({content:axe.source});
    await page.goto(origin+'/#/today');await page.waitForSelector('html[data-app-ready="true"]');
    assert.equal(await page.locator('.health-ring-link').count(),3);
    const home=await page.locator('[data-health-value]').allTextContents();
    const fixture=await page.evaluate(()=>({sleepLogs:state.sleepLogs,recoveryCheckins:state.recoveryCheckins,history:state.history,activeEnergy:state.activeEnergy,healthMetrics:state.healthMetrics}));
    const order=await page.evaluate(()=>{const vitals=document.querySelector('.core-vitals').getBoundingClientRect(),workout=document.querySelector('[data-today-start]').getBoundingClientRect();return vitals.bottom<workout.top;});
    record(order,`${profile.name}: circles and core vitals precede workout`);
    if(profile.name==='phone')record(await page.evaluate(()=>document.querySelector('[data-today-start]').getBoundingClientRect().bottom<document.querySelector('.app-tabs').getBoundingClientRect().top),'Phone: workout action is fully clear of bottom navigation');
    await settle(page);
    if(['phone','desktop'].includes(profile.name)){await page.screenshot({path:resolve(captures,`awj-${profile.name}-dark.png`),fullPage:true});if(profile.name==='phone')await page.screenshot({path:resolve(captures,'awj-home-dark.png')});}
    for(const tab of ['home','train','food','wellbeing','insights']){
      await page.click(`[data-app-tab="${tab}"]`);await settle(page);await navigationGeometry(page,`${profile.name}/${tab}`);
      if(profile.name==='phone'){
        await accessibility(page,`phone/${tab}/dark`);
        if(tab!=='home')await page.screenshot({path:resolve(captures,`awj-phone-${tab}-dark.png`)});
      }
    }
    await page.click('[data-app-tab="home"]');
    for(const [index,id] of ['sleep','recovery','strain'].entries()){
      await page.locator(`.health-ring-link[href="#/wellbeing/${id}"]`).click();await page.waitForURL(`**/#/wellbeing/${id}`);await settle(page);
      record(await page.locator(`[data-health-value="${id}"]`).textContent()===home[index],`${profile.name}/${id}: Home and detail values agree`);
      record(await page.locator('[data-app-tab="wellbeing"]').getAttribute('aria-current')==='page',`${profile.name}/${id}: Wellbeing stays selected`);
      record(await page.locator('.health-trend').isVisible()&&await page.locator('.health-quality-summary').isVisible()&&await page.locator('.long-term-card').isVisible(),`${profile.name}/${id}: health information is visible without opening setup`);
      if(profile.name==='phone'&&id==='recovery')await page.screenshot({path:resolve(captures,'awj-phone-recovery-dark.png'),fullPage:true});
      if(profile.name==='phone')await accessibility(page,`phone/${id}`);
      await page.goBack();await page.waitForURL('**/#/today');
    }
    if(profile.name==='phone'){
      await accessibility(page,'phone/Home');
      // Pure data assertions are repeated in the browser to check rendered missing/zero states.
      await page.evaluate(()=>{state.sleepLogs=[];state.recoveryCheckins=[];state.history=[];state.activeEnergy={};state.healthMetrics={};renderOverview();});
      record((await page.locator('[data-health-value]').allTextContents()).every(value=>value==='—'),'Empty profile: all rings show unavailable');
      await page.evaluate(()=>{state.activeEnergy[isoDay()]=0;state.healthMetrics[isoDay()]={steps:0};renderOverview();});
      record((await page.locator('[data-health-value="strain"]').textContent()).trim()==='0.0','Explicit zero energy: zero strain remains visible');
      await page.locator('.health-ring-link[href="#/wellbeing/strain"]').click();
      await page.fill('[data-active-energy-input]','0');await page.locator('[data-active-energy-form] button').click();
      record(page.url().endsWith('#/wellbeing/strain')&&await page.locator('[data-health-value="strain"]').textContent()==='0.0','Zero energy logging keeps the strain route and value');
      record(await page.locator('[data-active-energy-form]').isVisible(),'Energy logging remains usable after saving');
      record(await page.locator('[data-product-photos]').count()===1,'Optional encrypted progress vault remains available');
      await page.locator('[data-recovery-checkin]').click();
      await page.locator('.awj-modal-sheet .sheet-close').focus();await page.keyboard.press('Shift+Tab');
      record(await page.locator('[data-morning-checkin] button[type="submit"]').evaluate(element=>element===document.activeElement),'Recovery sheet wraps keyboard focus inside the dialog');
      await page.keyboard.press('Escape');await page.waitForSelector('.awj-modal-backdrop',{state:'detached'});
      await page.emulateMedia({reducedMotion:'reduce'});await page.click('[data-app-tab="home"]');
      await settle(page);
      record(await page.evaluate(()=>!document.getAnimations().some(animation=>animation.playState==='running')),'Reduced motion avoids route and ring animations');
      await context.setOffline(true);await page.reload();await page.waitForSelector('html[data-app-ready="true"]');
      record(await page.locator('.health-rings').isVisible(),'Offline reload keeps the health summary usable');await context.setOffline(false);
    }
    if(profile.name==='phone')await page.evaluate(data=>{Object.assign(state,data);persist();renderOverview();},fixture);
    // Change theme through the real preference UI and verify it survives hydration.
    await page.click('#settingsButton');await page.click('[data-theme-mode="default"]');await page.click('[data-app-tab="home"]');
    record(await page.locator('html').getAttribute('data-theme')==='light',`${profile.name}: light theme applied`);
    if(['phone','desktop'].includes(profile.name)){await page.reload();await page.waitForSelector('html[data-app-ready="true"]');record(await page.locator('html').getAttribute('data-theme')==='light',`${profile.name}: light choice survives reload`);await settle(page);await page.screenshot({path:resolve(captures,`awj-${profile.name}-light.png`),fullPage:true});await accessibility(page,`${profile.name}/light`);if(profile.name==='phone'){await page.locator('.health-ring-link[href="#/wellbeing/recovery"]').click();await accessibility(page,'phone/recovery/light');await page.screenshot({path:resolve(captures,'awj-phone-recovery-light.png'),fullPage:true});await page.click('[data-app-tab="home"]');}}
    if(profile.name==='phone'){
      for(const tab of ['home','train','food','wellbeing','insights']){
        await page.click(`[data-app-tab="${tab}"]`);await accessibility(page,`phone/${tab}/light`);
        if(tab!=='home')await page.screenshot({path:resolve(captures,`awj-phone-${tab}-light.png`)});
      }
      await page.click('#settingsButton');await accessibility(page,'phone/settings/light');
      await page.screenshot({path:resolve(captures,'awj-phone-settings-light.png')});
    }
    await page.click('#settingsButton');await page.click('[data-language="ar"]');await page.click('[data-app-tab="home"]');
    for(const tab of ['home','train','food','wellbeing','insights']){await page.click(`[data-app-tab="${tab}"]`);await settle(page);await navigationGeometry(page,`${profile.name}/RTL/${tab}`);}
    if(profile.name==='desktop'){await page.click('[data-app-tab="home"]');await page.screenshot({path:resolve(captures,'awj-desktop-rtl-light.png')});await page.setViewportSize({width:720,height:500});record(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Desktop at 200% equivalent layout: no horizontal overflow');}
    record(errors.length===0,`${profile.name}: no runtime errors${errors.length?': '+errors.join(', '):''}`);
    await context.close();
  }
}finally{await browser.close();server.close();writeFileSync(resolve(captures,'redesign-checks.json'),JSON.stringify({fixture:'Synthetic demonstration data; not personal health readings',checks:results.length,failures,results},null,2));}
console.log(`${results.length-failures.length}/${results.length} redesign checks passed. Evidence: ${captures}`);
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
