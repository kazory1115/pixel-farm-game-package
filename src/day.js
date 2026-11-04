(function (PixelFarm) {
  "use strict";

  PixelFarm.createDayCycle = function ({ config, store, animals, audio, dialogue, goals, persistence, document, setTimeout }) {
    const el = id => document.getElementById(id);
    function sleep(){
      if (store.sleeping) return;
      persistence.save();
      store.sleeping = true; store.menu.open = false; store.dialogue.active = false; audio.sfx.sleep();
      el('nightText').textContent = '第 ' + (store.farm.day + 1) + ' 天';
      el('nightfade').className = 'nightfade on';
      setTimeout(function(){
        store.farm.day++;
        store.farm.rainy = Math.random() < 0.28;
        for (var k in store.plots){
          var p = store.plots[k];
          if (p.crop && (p.watered || store.farm.rainy)){
            if (p.growth < config.CROPS[p.crop].days) p.growth++;
          }
          p.watered = store.farm.rainy && !!p.crop;
        }
        if (Math.random() < 0.7) animals.layEgg();
        el('nightfade').className = 'nightfade';
        store.sleeping = false;
        dialogue.say(store.farm.rainy ? '第 ' + store.farm.day + ' 天：下雨了！作物自動澆水' : '第 ' + store.farm.day + ' 天：又是適合種田的好天氣');
        goals.checkGoals();
        persistence.save();
      }, 1500);
    }


    return { sleep };
  };
})(window.PixelFarm);
