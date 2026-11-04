(function (PixelFarm) {
  "use strict";

  PixelFarm.createAudio = function ({ store, window }) {
    var audioCtx = null;
    function beep(freq, dur, type, vol, when){
      if (!store.soundOn) return;
      try{
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        var t = audioCtx.currentTime + (when || 0);
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = type || 'square'; o.frequency.value = freq;
        g.gain.setValueAtTime(vol || 0.05, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t); o.stop(t + dur);
      }catch(e){}
    }
    var SFX = {
      hoe:     function(){ beep(140, .09, 'square', .06); },
      plant:   function(){ beep(520, .07, 'square', .05); beep(700, .08, 'square', .05, .06); },
      water:   function(){ beep(300, .16, 'sine', .07); beep(380, .14, 'sine', .05, .08); },
      harvest: function(){ beep(660, .07, 'square', .05); beep(880, .09, 'square', .05, .07); },
      coin:    function(){ beep(990, .06, 'square', .05); beep(1320, .12, 'square', .05, .06); },
      egg:     function(){ beep(780, .08, 'triangle', .07); },
      error:   function(){ beep(160, .12, 'square', .06); },
      cursor:  function(){ beep(880, .04, 'square', .035); },
      sleep:   function(){ beep(440, .25, 'sine', .05); beep(349, .3, 'sine', .05, .22); beep(294, .4, 'sine', .05, .48); },
      goal:    function(){ [523,659,784,1046].forEach(function(f,i){ beep(f, .12, 'square', .05, i*.09); }); }
    };
    function setSound(v){
      store.soundOn = v;
      if (store.soundOn) SFX.plant();
    }

    return { beep, setSound, sfx: SFX };
  };
})(window.PixelFarm);
