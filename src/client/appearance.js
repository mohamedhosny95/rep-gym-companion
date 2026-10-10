/* A one-time appearance migration; stored unit, language and custom settings survive. */
globalThis.AWJ_APPEARANCE=Object.freeze({
  version:1,
  normalize(value={}){
    return {...value,appearanceVersion:1,themeMode:Number(value.appearanceVersion)>=1&&value.themeMode==='default'?'default':'oled'};
  }
});
