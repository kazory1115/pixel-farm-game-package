(function(PixelFarm){
  'use strict';
  PixelFarm.createClock=function({store}){
    function update(dt){ store.journey.minute=Math.min(1320,store.journey.minute+dt*2); }
    function reset(){ store.journey.minute=360; }
    function label(){
      const minute=Math.floor(store.journey.minute/10)*10;
      return String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
    }
    function marketOpen(){ return store.journey.minute>=480 && store.journey.minute<1080; }
    function tint(){
      const minute=store.journey.minute;
      if(minute<420) return {color:'#405479',alpha:.15*(420-minute)/60};
      if(minute<1020) return {color:'#ed9850',alpha:0};
      if(minute<1140) return {color:'#b46b57',alpha:.20*(minute-1020)/120};
      return {color:'#152544',alpha:.20+.36*Math.min(1,(minute-1140)/120)};
    }
    return {update,reset,label,marketOpen,tint};
  };
})(window.PixelFarm);
