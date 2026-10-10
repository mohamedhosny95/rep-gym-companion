/* Shared presentation: every number comes from the same health-summary contract. */
const routes={sleep:'/wellbeing/sleep',recovery:'/wellbeing/recovery',strain:'/wellbeing/strain'};
const labels={sleep:'Sleep',recovery:'Recovery',strain:'Strain',hrv:'HRV',rhr:'Resting HR',resp:'Breathing'};
const clean=value=>esc(String(value??''));
const format=(value,digits=0)=>value===null?'—':Number(value).toFixed(digits);
const hours=value=>value===null?'—':`${Math.floor(Math.round(value*60)/60)}h ${String(Math.round(value*60)%60).padStart(2,'0')}m`;
const dayLabel=date=>date?new Date(`${date}T12:00:00`).toLocaleDateString(document.documentElement.lang==='ar'?'ar-EG':'en-GB',{day:'numeric',month:'short'}):'No data';
export const healthSummary=()=>AWJ_HEALTH_SUMMARY.daily(state,isoDay());

export function ringMarkup(data,id,{large=false,linked=true}={}){
  const metric=data[id],value=id==='sleep'?metric.percent:metric.value,max=id==='strain'?21:100;
  const fraction=value===null?0:Math.max(0,Math.min(1,value/max));
  const tone=id==='recovery'?`recovery-${metric.band}`:id;
  const status=value===null?'No data':id==='sleep'?`${hours(metric.value)} / ${hours(metric.target)}`:id==='strain'?metric.partial?'Workout estimate':'AWJ estimate':metric.confidence==='low'?'Limited data':metric.calibrating?'Calibrating':({green:'Ready to train',yellow:'Take it steady',red:'Prioritize recovery'}[metric.band]||'AWJ estimate');
  const numeric=format(value,id==='strain'?1:0),unit=value===null?'':id==='strain'?'/ 21':'%';
  const contents=`<span class="health-ring ${tone} ${large?'is-large':''} ${value===null?'is-missing':''}" style="--ring-progress:${fraction}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="53"/><circle class="ring-value" cx="60" cy="60" r="53" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100-fraction*100}" ${fraction===0?'visibility="hidden"':''}/></svg><span class="ring-copy"><span class="ring-label">${labels[id]}</span><strong data-health-value="${id}">${numeric}<small>${id==='strain'?'':unit}</small></strong>${id==='strain'?'<span class="ring-scale">/ 21</span>':''}</span></span><span class="ring-description">${clean(status)}</span>`;
  return linked?`<a class="health-ring-link" href="#${routes[id]}" aria-label="${clean(`${labels[id]} ${numeric}${unit} · ${status}`)}">${contents}</a>`:`<div class="health-ring-detail">${contents}</div>`;
}

export function healthSourceMarkup(data){
  const imported=data.coverage.lastImport,valid=imported&&Number.isFinite(Date.parse(imported));
  const sources=[...new Set(data.vitals.filter(metric=>metric.date===data.date&&metric.source).map(metric=>metric.source))];
  const label=valid?`${data.coverage.staleHours>24?'Last health import':'Health updated'} ${new Date(imported).toLocaleString(document.documentElement.lang==='ar'?'ar-EG':'en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`:'No health import yet';
  return `<a class="health-source" href="#/settings/sync"><span class="status-dot ${data.coverage.staleHours!==null&&data.coverage.staleHours<=24?'is-current':''}" aria-hidden="true"></span><span>${clean(label)}${sources.length?` · ${clean(sources.join(', '))}`:''}</span><span aria-hidden="true">↗</span></a>`;
}

export function vitalsMarkup(data){
  const metadata=metric=>metric.value===null?'No data':`${clean(dayLabel(metric.date))} · ${clean(metric.source)}${metric.date!==data.date?' · Previous reading':''}`;
  const common=data.vitals.every(metric=>metadata(metric)===metadata(data.vitals[0]));
  return `<section class="core-vitals" aria-label="Core vitals">${data.vitals.map(metric=>`<article><h2>${labels[metric.id]}</h2><p><strong>${format(metric.value,metric.id==='resp'?1:0)}</strong> <span>${clean(metric.unit)}</span></p>${common?'':`<small>${metadata(metric)}</small>`}</article>`).join('')}${common?`<small class="vital-metadata">${metadata(data.vitals[0])}</small>`:''}</section>`;
}

export function healthOverviewMarkup(data=healthSummary()){
  return `<section class="health-overview" aria-label="Daily health"><div class="health-rings">${['sleep','recovery','strain'].map(id=>ringMarkup(data,id)).join('')}</div>${healthSourceMarkup(data)}</section>${vitalsMarkup(data)}`;
}

export function healthTrendMarkup(id,data=healthSummary()){
  const rows=AWJ_HEALTH_SUMMARY.series(state,id,data.date),mean=AWJ_HEALTH_SUMMARY.average(rows),max=id==='strain'?21:100;
  return `<section class="health-trend performance-card"><div class="card-heading"><h2>Last 7 days</h2><span>${mean===null?'No data':`Average ${format(mean,id==='strain'?1:0)}${id==='strain'?' / 21':'%'}`}</span></div><div class="health-bars ${id}" role="list" aria-label="${labels[id]} history">${rows.map(row=>`<div role="listitem" class="health-bar ${row.value===null?'is-missing':''}" aria-label="${clean(`${dayLabel(row.date)}: ${row.value===null?'No data':`${row.value}${id==='strain'?' / 21':'%'}`}`)}"><span class="bar-number">${format(row.value,id==='strain'?1:0)}</span><div class="bar-track">${row.value===null?'<span class="bar-gap">—</span>':`<i style="height:${Math.max(2,Math.min(100,row.value/max*100))}%" class="${row.value===0?'is-zero':''}"></i>`}</div><span>${clean(new Date(`${row.date}T12:00:00`).toLocaleDateString(document.documentElement.lang==='ar'?'ar-EG':'en-GB',{weekday:'narrow'}))}</span></div>`).join('')}</div></section>`;
}

export function healthQualityMarkup(data=healthSummary()){
  return `<section class="health-quality-summary performance-card"><div class="card-heading"><h2>Data completeness</h2><strong>${data.coverage.score}%</strong></div><p>${data.coverage.missing.length?`Missing: ${clean(data.coverage.missing.join(', '))}`:'All daily inputs available.'}</p><div class="quality-tags"><span>Recovery confidence: ${clean(data.recovery.confidence)}</span>${data.recovery.calibrating?'<span>Building your baseline</span>':''}</div><p class="muted">Completeness describes your available inputs. Recovery confidence also depends on your personal baseline.</p></section>`;
}

export function detailMarkup(id,data=healthSummary()){
  const metric=data[id],missing=metric.value===null;
  const description=id==='sleep'?`${hours(metric.target)} sleep need · ${metric.personalized?'Personal baseline':'Starting target'}`:id==='strain'?metric.inputs.length?metric.inputs.join(' + '):'Import active energy or log a workout to estimate strain.':data.advice.title;
  return `<section class="health-detail-hero performance-card">${ringMarkup(data,id,{large:true,linked:false})}<h2>${clean(missing?'Build your daily picture':description)}</h2>${id!=='sleep'?`<span class="estimate-badge">AWJ estimate${metric.partial?' · Partial data':''}${metric.confidence?` · ${metric.confidence} confidence`:''}</span>`:''}${missing?'<p>No data for this day. Add a log or connect your health source.</p>':''}</section>`;
}
