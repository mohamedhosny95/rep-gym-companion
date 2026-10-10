/* nutrition screen composition; calculations and persistence stay in domain modules. */
export function createNutritionScreen(ui){
  const {enter,heading,route,core}=ui;

function nutrition(){
    enter('nutrition','food');core.nutrition();window.AWJ_ENHANCEMENTS_UI.nutrition();
    const head=app.querySelector('.food-head'),disclosure=app.querySelector('.nutrition-disclosure');if(head)head.innerHTML=AWJ_SAFE_DOM.sanitize(heading('Nutrition','Today’s food, water, and quick meal entry.'));
    app.querySelector('.connection-banner')?.remove();
    const composer=app.querySelector('.meal-composer'),dashboard=app.querySelector('.macro-dashboard');
    const summary=document.createElement('section');summary.className='nutrition-summary';const totals=foodTotals(todayFoodEntries()),profile=foodProfile(),water=Number(state.water[isoDay()])||0;
    summary.innerHTML=AWJ_SAFE_DOM.sanitize(`<h2>Logged today</h2><dl><div><dt>Energy logged</dt><dd>${Math.round(totals.calories)}<span>/ ${profile.calories} kcal</span></dd></div><div><dt>Protein logged</dt><dd>${Math.round(totals.protein_g)}<span>/ ${profile.protein} g</span></dd></div><div><dt>Water logged</dt><dd>${esc(window.waterDisplay(water))}<span>/ ${esc(window.waterDisplay(profile.water))}</span></dd></div></dl>`);
    head?.after(summary);
    const shortcut=document.createElement('nav');shortcut.className='nutrition-actions';shortcut.setAttribute('aria-label','Nutrition actions');shortcut.innerHTML=AWJ_SAFE_DOM.sanitize('<button class="primary-action" data-nutrition-log>Log meal</button><button data-nutrition-water>Water</button>');summary.after(shortcut);
    shortcut.querySelector('[data-nutrition-log]').onclick=()=>route('nutrition-log');shortcut.querySelector('[data-nutrition-water]').onclick=()=>{state.nutritionView='today';nutrition();app.querySelector('.water-card')?.scrollIntoView({block:'center'});};
    if(state.nutritionView==='today'){
      const navSection=app.querySelector('[data-nav-for="nutrition"]'),recent=app.querySelector('.food-log');
      if(recent&&navSection)navSection.after(recent);
      if(dashboard){const details=document.createElement('details');details.className='nutrition-details';details.innerHTML=AWJ_SAFE_DOM.sanitize('<summary>Targets and nutrition breakdown</summary>');dashboard.replaceWith(details);details.append(dashboard);}
      const reminder=app.querySelector('.reminder-strip');if(reminder){const details=document.createElement('details');details.className='nutrition-details';details.innerHTML=AWJ_SAFE_DOM.sanitize('<summary>Nutrition routine and supplements</summary>');reminder.replaceWith(details);details.append(reminder);}
    }
    if(composer){composer.querySelector('.estimate-pill').textContent='Optional AI estimate';if(disclosure)composer.append(disclosure);}
    const connection=document.createElement('button');connection.className='quiet-action';connection.dataset.nutritionConnect='true';connection.textContent='Set up nutrition connections';connection.onclick=()=>route('settings-sync');app.append(connection);
    if(state.nutritionView==='log')composer?.scrollIntoView({block:'start'});
    app.querySelectorAll('[data-food-text],[data-food-macro]').forEach(input=>input.addEventListener('input',()=>{
      if(!state.foodDraft)return;
      if(input.dataset.foodText)state.foodDraft[input.dataset.foodText]=String(input.value||'').slice(0,2000);
      if(input.dataset.foodMacro)state.foodDraft[input.dataset.foodMacro]=Math.max(0,Number(input.value)||0);
      persistDebounced();
    }));
  }
  return {nutrition};
}
