/* Small, durable UI-only state. Domain records remain in the main app store. */
(function(){
  const KEY="rep-ui-preferences-v1";
  const defaults=Object.freeze({healthWorkflow:"summary",nutritionDisclosure:false});
  function read(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")};}catch{return {...defaults};}}
  let value=read();
  function get(key){return key?value[key]:{...value};}
  function set(key,next){value={...value,[key]:next};try{localStorage.setItem(KEY,JSON.stringify(value));}catch{}return next;}
  function reset(){value={...defaults};try{localStorage.removeItem(KEY);}catch{}}
  window.REP_UI_STATE=Object.freeze({get,set,reset});
})();
