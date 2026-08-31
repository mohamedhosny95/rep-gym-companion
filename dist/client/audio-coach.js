/* Hands-Free Audio Voice Coach & Spoken Rest Timers for Health OS.
   Provides real-time spoken coaching, set completion feedback, and rest countdowns. */

(function(){
  const coachState = {
    enabled: true,
    volume: 1.0,
    pitch: 1.0,
    rate: 1.05,
    voicesLoaded: false,
    selectedVoice: null
  };

  function initVoices(){
    if(!("speechSynthesis" in window)) return;
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if(voices.length > 0) coachState.voicesLoaded = true;
    };
    load();
    if(window.speechSynthesis.onvoiceschanged !== undefined){
      window.speechSynthesis.onvoiceschanged = load;
    }
  }
  initVoices();

  function getBestVoice(){
    if(!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if(!voices.length) return null;
    return voices.find(v => v.lang === "en-US" && (v.name.includes("Natural") || v.name.includes("Siri") || v.name.includes("Samantha") || v.name.includes("Google"))) ||
           voices.find(v => v.lang.startsWith("en-") && !v.name.includes("Bad")) ||
           voices.find(v => v.lang.startsWith("en")) ||
           null;
  }

  function speak(text, options = {}){
    if(!coachState.enabled || !("speechSynthesis" in window) || !text) return;
    try {
      window.speechSynthesis.cancel(); // Stop prior queue for real-time responsiveness
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.volume = options.volume ?? coachState.volume;
      utter.rate = options.rate ?? coachState.rate;
      utter.pitch = options.pitch ?? coachState.pitch;
      const voice = getBestVoice();
      if(voice) utter.voice = voice;
      window.speechSynthesis.speak(utter);
    } catch(e){}
  }

  // Web Audio Synth Chimes
  function playTone(freq = 880, type = "sine", duration = 0.15){
    try {
      const ctx = window._repAudioCtx || (window._repAudioCtx = new (window.AudioContext || window.webkitAudioContext)());
      if(ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch(e){}
  }

  function announceSetComplete(setIndex, weight, reps, rpe, advice){
    playTone(587, "sine", 0.1);
    setTimeout(() => playTone(880, "sine", 0.2), 100);

    const wText = weight ? ( `${weight} kg`) : "";
    const rText = reps ? ( `${reps} reps`) : "";
    const setNum = setIndex + 1;

    let msg = `Set ${setNum} complete. ${wText ? `${wText} for ` : ""}${rText}.`;
    if(advice) msg += ` ${advice}`;
    speak(msg);
  }

  function announceRestCountdown(remainingSeconds){
    if(remainingSeconds === 30){
      playTone(440, "sine", 0.15);
      speak( "30 seconds rest remaining");
    } else if(remainingSeconds === 10){
      playTone(660, "triangle", 0.2);
      speak( "10 seconds, get ready");
    } else if(remainingSeconds === 3){
      playTone(880, "sine", 0.1);
      speak( "Three");
    } else if(remainingSeconds === 2){
      playTone(880, "sine", 0.1);
      speak( "Two");
    } else if(remainingSeconds === 1){
      playTone(880, "sine", 0.1);
      speak( "One");
    } else if(remainingSeconds === 0){
      playTone(1174, "sine", 0.35);
      speak( "Next set, go!");
    }
  }

  function announceExercise(exerciseName, prescription){
    const msg =  `Next exercise: ${exerciseName}. ${prescription || ""}`;
    speak(msg);
  }

  window.REP_AUDIO_COACH = {
    speak,
    playTone,
    announceSetComplete,
    announceRestCountdown,
    announceExercise,
    toggle: (enabled) => { coachState.enabled = enabled; },
    isEnabled: () => coachState.enabled
  };
})();
