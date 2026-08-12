/* Reusable progressive-disclosure primitives shared by feature layers. */
(function(){
  function tabs({label,items,active,onChange,className="workflow-nav"}){
    const nav=document.createElement("nav");nav.className=className;nav.setAttribute("aria-label",label);
    for(const item of items){const button=document.createElement("button");button.type="button";button.dataset.workflow=item.id;button.classList.toggle("is-active",item.id===active);button.setAttribute("aria-current",item.id===active?"page":"false");button.textContent=item.label;button.addEventListener("click",()=>onChange(item.id));nav.append(button);}
    return nav;
  }
  function disclose(element,{label,className="compact-disclosure",open=false}={}){
    if(!element||element.closest(`.${className}`))return null;
    const details=document.createElement("details");details.className=className;details.open=open;
    const summary=document.createElement("summary");summary.textContent=label;details.append(summary);element.before(details);details.append(element);return details;
  }
  function showOnly(elements,active){for(const [element,view] of elements)if(element)element.hidden=view!==active;}
  window.REP_UI_SHELL=Object.freeze({tabs,disclose,showOnly});
})();
