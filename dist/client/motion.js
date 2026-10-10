/* Explicit, cancellable transitions. Logging mutations never trigger page animation. */
(function(){
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
  const reduced=()=>motionPreference.matches;
  motionPreference.addEventListener?.('change',event=>{if(event.matches)document.getAnimations?.().forEach(animation=>animation.cancel());});
  const animations=new WeakMap();
  function cancel(){const root=document.querySelector('#app');animations.get(root)?.cancel();if(root)animations.delete(root);}
  function animate(element,kind='page',direction=1){
    if(!element||reduced()||!element.animate)return Promise.resolve();
    animations.get(element)?.cancel();
    const durations={page:180,exercise:220,sheet:240,media:160,set:160},distance=kind==='exercise'?12:kind==='media'||kind==='set'?0:8;
    const animation=element.animate([{opacity:.4,transform:`translate${kind==='exercise'?'X':'Y'}(${distance*direction}px)`},{opacity:1,transform:'translate(0,0)'}],{duration:durations[kind]||180,easing:'cubic-bezier(.22,.75,.24,1)'});animations.set(element,animation);
    return animation.finished.catch(()=>{}).finally(()=>{if(animations.get(element)===animation)animations.delete(element);});
  }
  function transition(update,{element=document.querySelector('#app'),kind='page',direction=1}={}){
    cancel();
    if(reduced()){update();return;}
    // Commit before animation so snapshot work never delays a tab's first paint.
    update();animate(element,kind,direction);
  }
  function bindSheet(node){if(node.dataset.motionSheet)return;node.dataset.motionSheet='true';window.dispatchEvent(new CustomEvent('awj:dialog-open'));animate(node.querySelector('.awj-modal-sheet,.workout-choice-sheet,.workout-preflight-panel')||node,'sheet');}
  const dismissing=new WeakMap();
  function dismiss(node){
    if(!node)return Promise.resolve();if(dismissing.has(node))return dismissing.get(node);
    if(reduced()||!node.animate||node.dataset.motionClosing==='done'){node.remove();return Promise.resolve();}
    const surface=node.querySelector('.awj-modal-sheet,.workout-choice-sheet,.workout-preflight-panel')||node;animations.get(surface)?.cancel();
    node.style.pointerEvents='none';
    const fading=node.animate([{opacity:1},{opacity:0}],{duration:240,easing:'ease'});
    if(surface!==node)surface.animate([{transform:'translateY(0)'},{transform:'translateY(8px)'}],{duration:240,easing:'ease'});
    const finished=fading.finished.catch(()=>{}).then(()=>{node.remove();dismissing.delete(node);});dismissing.set(node,finished);return finished;
  }
  if(typeof MutationObserver!=='undefined')new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes)if(node.nodeType===1&&node.matches('.timed-mode,.exit-confirm,.awj-modal-backdrop,.workout-choice-backdrop'))bindSheet(node);}).observe(document.body,{childList:true});
  const closing=new WeakSet();
  document.addEventListener('click',event=>{const button=event.target.closest?.('[data-timed-close],[data-tempo-close],[data-choice-close],[data-builder-close],[data-builder-cancel],[data-stay],.timed-close,.dialog-close,.sheet-close');const sheet=button?.closest('.timed-mode,.exit-confirm,.awj-modal-backdrop,.workout-choice-backdrop');if(!sheet||reduced()||sheet.dataset.motionClosing==='done')return;event.preventDefault();event.stopImmediatePropagation();if(closing.has(sheet))return;closing.add(sheet);dismiss(sheet).then(()=>{sheet.dataset.motionClosing='done';button.click();});},true);
  window.AWJ_MOTION=Object.freeze({animate,transition,dismiss,cancel,reduced});
})();
