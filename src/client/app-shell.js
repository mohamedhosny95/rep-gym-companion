import {createTodayScreen} from './screens/today.js';
import {createTrainingScreen} from './screens/training.js';
import {createNutritionScreen} from './screens/nutrition.js';
import {createProgressScreen} from './screens/progress.js';
import {createWellbeingScreens} from './screens/wellbeing.js';
import {createScreenRegistry} from './screens/registry.ts';
import {createSettingsScreen} from './screens/settings.js';
import {applyLocale,localizeText} from './screens/locale.js';
/* Explicit screen composition. Domain logic and durable data stay in their existing modules. */
(function(){
  const nav=window.AWJ_NAVIGATION,core=window.AWJ_CORE_PAGES,preferences=window.AWJ_TRAINING_PREFERENCES;
  const route=id=>nav.navigate(id),date=()=>isoDay();
  preferences.normalize(state);
  const arabicCopy={Today:'اليوم',Train:'التمرين',Nutrition:'التغذية',Wellbeing:'العافية',Progress:'التقدم',Recovery:'التعافي','Daily routines':'العادات اليومية','Your planned sessions, favourite routines and exercise library.':'جلساتك المخططة وتمارينك المفضلة ومكتبة الحركات.','Daily practices and recovery in one place.':'عاداتك اليومية وتعافيك في مكان واحد.','Sleep and recovery inputs support your training.':'يساعد النوم والتعافي على توجيه تمرينك.','Your existing hygiene, wellness and journal routines.':'عاداتك الصحية واليومية وملاحظاتك.','Consistency, performance, and your next step.':'الاستمرار والأداء وخطوتك التالية.','Daily practices':'العادات اليومية','Habits, hygiene and journal':'العادات والعناية اليومية والملاحظات','Recovery & health':'التعافي والصحة','Sleep, check-ins and measurements':'النوم والمتابعة والقياسات','Today’s focus':'تركيز اليوم','Recovery day':'يوم للتعافي','Review recovery':'راجع التعافي','View routines':'عرض التمارين','Start workout':'ابدأ التمرين','Resume workout':'استأنف التمرين'};
  const tr=value=>state.preferences?.language==='ar'?(arabicCopy[value]||value):value;
  function enter(view,tab){stopExerciseClock();stopSessionClock();document.body.classList.remove('workout-mode','workout-complete-mode','rest-mode-active');timerDock.classList.add('is-hidden');timerDock.setAttribute('inert','');if(state.timer?.interval){clearInterval(state.timer.interval);state.timer.interval=null;}state.view=view;state.activeTab=tab;persistDebounced();updatePrimaryTabs();}
  function heading(title,description=''){return `<header class="page-heading"><h1>${esc(tr(title))}</h1>${description?`<p>${esc(tr(description))}</p>`:''}</header>`;}
  function sheet(title,content,bind=()=>{}){
    const overlay=document.createElement('div');overlay.className='awj-modal-backdrop';overlay.dataset.dialogReady='true';overlay.tabIndex=-1;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',title);
    overlay.innerHTML=AWJ_SAFE_DOM.sanitize(`<section class="awj-modal-sheet"><header class="sheet-header"><h2>${esc(title)}</h2><button class="sheet-close" aria-label="Close">×</button></header>${content}</section>`);
    const previous=document.activeElement;let closing=false;
    const close=async()=>{if(closing)return;closing=true;await window.AWJ_MOTION.dismiss(overlay);if(previous?.isConnected)previous.focus();};
    overlay.querySelector('.sheet-close').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close();};
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const controls=[...overlay.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});
    document.body.append(overlay);bind(overlay,close);overlay.querySelector('button,input')?.focus();return overlay;
  }
  function readiness(){
    const engine=window.AWJ_HEALTH_ENGINE,value=engine.readiness(state,date(),state.healthProfile),advice=engine.trainingRecommendation(state,date(),state.healthProfile,value);
    const imported=state.lastVitalsImportDate,age=daysSinceVitalsImport();
    return {value,advice,age,source:imported?`Health data ${age===0?'today':`${age} day${age===1?'':'s'} ago`}`:'No imported health data',confidence:value.confidence||'low'};
  }
  function readinessMarkup(){const r=readiness();return `<section class="readiness-note"><details><summary><span class="eyebrow">TODAY’S GUIDANCE</span><strong>${esc(r.advice.title)}</strong><span class="guidance-prompt" aria-label="Why this recommendation?">↗</span></summary><p>${esc(r.advice.detail||r.advice.message||'Use your warm-up as the final check.')}</p><p>${esc(r.source)} · ${esc(r.confidence)} confidence</p><p>${r.value.score===null?'More recovery observations are needed.':`AWJ estimate: ${r.value.score}%`}</p><p>${esc((r.value.reasons||[]).map(x=>typeof x==='string'?x:x.detail||x.label||'').filter(Boolean).join(' '))}</p></details></section>`;}
  function saveStatus(){const queued=window.AWJ_SYNC_OUTBOX?.summary(state.syncQueue)?.total||0,storage=window.AWJ_STORE?.saveStatus;const label=storage==='failed'?'Save needs attention · open backups':storage==='saving'?'Saving on device…':queued?`Saved on device · ${queued} waiting to sync`:state.lastSyncedAt?'Saved on device · records synced':'Saved on device';return `<button type="button" class="save-status ${queued?'has-pending':''} ${storage==='failed'?'save-failed':''}" data-save-status>${label}</button>`;}
  function bindSaveStatus(){document.querySelector('[data-save-status]')?.addEventListener('click',()=>route(window.AWJ_STORE?.saveStatus==='failed'?'settings-security':'settings-sync'));}
  window.addEventListener('awj:storage-status',event=>{
    const button=document.querySelector('[data-save-status]');
    if(button){const holder=document.createElement('div');holder.innerHTML=AWJ_SAFE_DOM.sanitize(saveStatus());const fresh=holder.firstElementChild;if(fresh){button.replaceWith(fresh);bindSaveStatus();}}
    document.querySelector('.awj-save-warning')?.remove();
    if(event.detail.status!=='failed')return;
    const warning=document.createElement('div'),message=document.createElement('span'),action=document.createElement('button');
    warning.className='awj-save-warning';warning.setAttribute('role','alert');
    message.textContent='Could not save on this device. Keep AWJ open and check available storage.';
    action.type='button';action.textContent='Backups and recovery';action.addEventListener('click',()=>route('settings-security'));
    warning.append(message,action);document.body.append(warning);
  });

  function checkin(){sheet('Quick recovery check-in',window.AWJ_HEALTH_UI.checkinMarkup(),(_root,close)=>window.AWJ_HEALTH_UI.bind({onSaved:()=>{close();screenRegistry.update();showToast('Check-in saved on device.');}}));}

  function guardStart(id,proceed){
    if(AWJ_TRAINING_SESSION.isResumableWorkout(state,sessions)&&state.session!==id){sheet('Workout in progress','<p>Resume or explicitly end the current workout before starting another.</p><button class="primary-action" data-resume-active>Resume current workout</button>',(root,close)=>root.querySelector('[data-resume-active]').onclick=()=>{close();startSession(state.session,{acknowledgeWarnings:true});});return true;}
    const r=readiness();if(r.advice.mode==='pause'){sheet('Review your recovery warning',`<p>${esc(r.advice.detail||r.advice.message||r.advice.title)}</p><button class="primary-action" data-review-recovery>Review recovery</button><button data-acknowledge-workout>Record a modified workout</button>`,(root,close)=>{root.querySelector('[data-review-recovery]').onclick=()=>{close();route('health-vitals');};root.querySelector('[data-acknowledge-workout]').onclick=()=>{close();proceed();};});return true;}return false;
  }
  const ui={enter,heading,readinessMarkup,saveStatus,bindSaveStatus,route,checkin,core,preferences,sheet,date,tr,readiness};
  const {today}=createTodayScreen(ui),{train}=createTrainingScreen(ui),{nutrition}=createNutritionScreen(ui),{progress}=createProgressScreen(ui),{wellbeing,recovery,sleep,strain,routines}=createWellbeingScreens(ui);
  window.AWJ_LOCALE=Object.freeze({apply:applyLocale,text:localizeText});
  const lifecycle=mount=>({mount(){mount();applyLocale();},update(){mount();applyLocale();},destroy(){document.querySelectorAll('.awj-modal-backdrop').forEach(node=>node.remove());}});
  const screenRegistry=createScreenRegistry({today:lifecycle(today),train:lifecycle(train),nutrition:lifecycle(nutrition),progress:lifecycle(progress),wellbeing:lifecycle(wellbeing),recovery:lifecycle(recovery),sleep:lifecycle(sleep),strain:lifecycle(strain),routines:lifecycle(routines),settings:createSettingsScreen()});
  const show=id=>()=>screenRegistry.show(id);
  window.AWJ_TRAINING_UI=Object.freeze({today:show('today'),train:show('train'),nutrition:show('nutrition'),progress:show('progress'),wellbeing:show('wellbeing'),more:show('wellbeing'),recovery:()=>['recovery','sleep','strain'].includes(screenRegistry.current())?screenRegistry.update():nav.navigate('health-vitals'),routines:show('routines'),refresh:()=>screenRegistry.update(),checkin,sheet,guardStart});
  document.body.classList.add('training-first-app');
  nav.register([{id:'today',path:'/today',title:'Today',activate:show('today')},{id:'training-program',path:'/train',aliases:['/training/program','/training/today','/program-active'],title:'Train',activate:show('train')},{id:'training-today',path:'/training/today',title:'Today',activate:show('today')},{id:'insights',path:'/progress',aliases:['/insights'],title:'Progress',activate:show('progress')},{id:'training-history',path:'/progress/history',aliases:['/training/history'],title:'History',activate:show('progress')},{id:'wellbeing',path:'/wellbeing',title:'Wellbeing',activate:show('wellbeing')},{id:'more',path:'/more',title:'Wellbeing',activate:show('wellbeing')},{id:'health-vitals',path:'/wellbeing/recovery',aliases:['/more/recovery','/health/vitals'],title:'Recovery',activate:show('recovery')},{id:'health-wellness',path:'/wellbeing/routines',aliases:['/more/routines','/health/wellness'],title:'Daily routines',activate:show('routines')}]);
  nav.register([
    {id:'health-sleep',path:'/wellbeing/sleep',title:'Sleep',activate:show('sleep')},
    {id:'health-strain',path:'/wellbeing/strain',title:'Strain',activate:show('strain')},
    ...['today','log','plan'].map(view=>({id:'nutrition-'+view,path:'/nutrition/'+view,title:'Nutrition',activate:()=>{state.nutritionView=view;screenRegistry.show('nutrition');}})),
    ...['general','schedule','targets','coach','sync','security'].map(section=>({id:'settings-'+section,path:'/settings/'+section,title:'Settings',activate:()=>{state.settingsSection=section;screenRegistry.show('settings');}}))
  ]);
  nav.setTabResolver(tab=>({home:'today',train:'training-program',food:'nutrition-today',wellbeing:'wellbeing',insights:'insights',more:'wellbeing',health:'health-vitals',vitals:'health-vitals',care:'health-wellness'}[tab]||tab));
  window.addEventListener('awj:navigation',()=>{updatePrimaryTabs();if(['vitals','care'].includes(state.activeTab)&&!app.querySelector('[data-more-back]')){const back=document.createElement('button');back.dataset.moreBack='true';back.textContent='← Wellbeing';back.onclick=()=>route('wellbeing');app.prepend(back);}});
  let lastRingRoute='';
  window.addEventListener('awj:navigation',event=>{
    if(event.detail.id===lastRingRoute)return;lastRingRoute=event.detail.id;
    if(window.AWJ_MOTION.reduced())return;
    app.querySelectorAll('.ring-value').forEach(circle=>circle.animate([{strokeDashoffset:100},{strokeDashoffset:Number(circle.getAttribute('stroke-dashoffset'))}],{duration:360,easing:'ease-out'}));
  });
  nav.start({fallback:'today'});
  // Both overlay keyboards (iOS) and resized layouts (Android) use the same controls.
  const viewport=window.visualViewport;
  let baselineHeight=window.innerHeight,lastWidth=window.innerWidth,viewportFrame=0;
  const editable=element=>element?.matches?.('textarea,input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=button]):not([type=submit])')&&!element.readOnly&&!element.disabled;
  function updateViewport(){
    viewportFrame=0;
    const scale=viewport?.scale||1,zoomed=Math.abs(scale-1)>.05,editing=editable(document.activeElement);
    const height=viewport?.height||window.innerHeight,top=viewport?.offsetTop||0;
    if(Math.abs(window.innerWidth-lastWidth)>80){baselineHeight=window.innerHeight;lastWidth=window.innerWidth;}
    if(!editing&&!zoomed)baselineHeight=window.innerHeight;
    const inset=Math.max(0,window.innerHeight-height-top);
    const open=Boolean(editing&&!zoomed&&(inset>100||baselineHeight-height>120));
    document.body.classList.toggle('is-keyboard-open',open);
    const style=document.documentElement.style;
    style.setProperty('--keyboard-bottom',`${open?Math.round(inset):0}px`);
    style.setProperty('--visible-height',`${Math.round(height)}px`);
    style.setProperty('--visible-top',`${Math.round(top)}px`);
    if(open)requestAnimationFrame(()=>{
      const input=document.activeElement;if(!editable(input))return;
      const bounds=input.getBoundingClientRect(),action=app.querySelector('.workout-action-band');
      const footer=action?.getClientRects().length?action.getBoundingClientRect().height+16:16;
      if(bounds.top<top+12||bounds.bottom>top+height-footer)input.scrollIntoView({block:'center',behavior:'instant'});
    });
  }
  const scheduleViewport=()=>{if(!viewportFrame)viewportFrame=requestAnimationFrame(updateViewport);};
  viewport?.addEventListener('resize',scheduleViewport);viewport?.addEventListener('scroll',scheduleViewport);
  window.addEventListener('resize',scheduleViewport);
  document.addEventListener('focusin',scheduleViewport);document.addEventListener('focusout',()=>setTimeout(scheduleViewport,0));
  document.addEventListener('keydown',event=>{if(event.key!=='Enter'||!event.target.matches('[data-live-log]'))return;event.preventDefault();const fields=[...app.querySelectorAll('[data-live-log]')],next=fields[fields.indexOf(event.target)+1];if(next)next.focus();else event.target.blur();});
  document.addEventListener('pointerdown',event=>{if(event.target.closest('[data-keyboard-dismiss]')){event.preventDefault();document.activeElement?.blur();scheduleViewport();}});
  document.addEventListener('click',event=>{if(event.target.closest('[data-keyboard-dismiss]')){document.activeElement?.blur();scheduleViewport();}});
  updateViewport();

})();
