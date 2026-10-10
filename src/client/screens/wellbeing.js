import {healthOverviewMarkup,healthSummary,detailMarkup,healthTrendMarkup,healthQualityMarkup,healthSourceMarkup,vitalsMarkup} from './health.js';
/* Health observations stay visible; tools and logging keep their existing handlers. */
export function createWellbeingScreens(ui){
  const {enter,heading,readinessMarkup,saveStatus,bindSaveStatus,route,checkin,core}=ui;
  function wellbeing(){
    enter('wellbeing','wellbeing');const data=healthSummary();
    app.innerHTML=AWJ_SAFE_DOM.sanitize(`${heading('Wellbeing','Your health and daily practices.')}${healthOverviewMarkup(data)}${healthQualityMarkup(data)}<section class="more-menu">${[['Recovery & health','Sleep, check-ins and measurements','health-vitals'],['Daily practices','Habits, hygiene and journal','health-wellness']].map(([title,detail,id])=>`<button data-more-route="${id}"><strong>${title}</strong><span>${detail}</span><b aria-hidden="true">→</b></button>`).join('')}</section><section data-daily-routines></section>${saveStatus()}`);
    app.querySelectorAll('[data-more-route]').forEach(button=>button.onclick=()=>route(button.dataset.moreRoute));
    window.AWJ_HABITS.mount();bindSaveStatus();
  }
  function healthDetail(id){
    enter('vitals','vitals');core.vitals();
    const old=document.createElement('div');while(app.firstChild)old.append(app.firstChild);
    const data=healthSummary(),title={sleep:'Sleep',recovery:'Recovery',strain:'Strain'}[id];
    app.innerHTML=AWJ_SAFE_DOM.sanitize(`${heading(title,new Date(`${data.date}T12:00:00`).toLocaleDateString(state.preferences?.language==='ar'?'ar-EG':'en-GB',{weekday:'long',day:'numeric',month:'long'}))}<button class="health-back" data-more-back>← Wellbeing</button><nav class="health-detail-tabs" aria-label="Health details">${[['sleep','Sleep'],['recovery','Recovery'],['strain','Strain']].map(([key,label])=>`<a href="#/wellbeing/${key}" aria-current="${id===key?'page':'false'}">${label}</a>`).join('')}</nav>${detailMarkup(id,data)}${healthSourceMarkup(data)}${vitalsMarkup(data)}<div class="health-detail-grid">${healthTrendMarkup(id,data)}${healthQualityMarkup(data)}</div>${readinessMarkup()}<nav class="quick-actions"><button data-recovery-checkin>Quick check-in</button><button data-recovery-measurements>Measurements</button></nav><section class="health-baselines">${window.AWJ_HEALTH_UI.trendMarkup()}</section><section class="health-extra"></section><details class="recovery-sleep" ${id==='sleep'?'open':''}><summary>Log sleep</summary></details><section class="health-energy-log"></section><details class="supporting-details recovery-data"><summary>Connections, imports & setup</summary><section data-health-tools></section>${window.AWJ_HEALTH_UI.chargingMarkup()}</details><section class="health-journal"></section>${saveStatus()}`);
    const move=(selector,target)=>old.querySelectorAll(selector).forEach(node=>{node.hidden=false;app.querySelector(target).append(node);});
    move('.sleep-card','.recovery-sleep');
    move('.active-energy-card','.health-energy-log');
    move('.vitals-import-card','.recovery-data');
    move('.recovery-card.wide:not(.sleep-card):not(.journal-card)','.health-extra');
    move('.journal-card','.health-journal');
    app.querySelector('[data-more-back]').onclick=()=>route('wellbeing');
    app.querySelector('[data-recovery-checkin]').onclick=checkin;
    app.querySelector('[data-recovery-measurements]').onclick=()=>app.querySelector('[data-body-measurement]')?.scrollIntoView({block:'center'});
    window.AWJ_HEALTH_UI.bind({onMeasurementSaved:()=>{healthDetail(id);app.querySelector('[data-body-measurement]')?.scrollIntoView({block:'center'});showToast('Measurements saved on device.');}});
    if(state.vitalsDraft)app.querySelector('.recovery-data').open=true;
    window.AWJ_PRODUCT_UI.mount();bindSaveStatus();updatePrimaryTabs();
  }
  const recovery=()=>healthDetail('recovery'),sleep=()=>healthDetail('sleep'),strain=()=>healthDetail('strain');
  function routines(){enter('care','care');core.wellness();const oldHead=app.querySelector('.module-head,.recovery-head');if(oldHead)oldHead.innerHTML=AWJ_SAFE_DOM.sanitize(heading('Daily routines','Your existing hygiene, wellness and journal routines.'));const back=document.createElement('button');back.dataset.moreBack='true';back.textContent='← Wellbeing';back.onclick=()=>route('wellbeing');app.prepend(back);window.AWJ_HABITS.mount();window.AWJ_PRODUCT_UI.mount();updatePrimaryTabs();}
  return {wellbeing,recovery,sleep,strain,routines};
}
