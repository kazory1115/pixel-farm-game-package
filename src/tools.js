(function (PixelFarm) {
  "use strict";

  PixelFarm.createTools = function ({ config, store, audio }) {
    function toolName(o){
      if (o.tool === 'seed') return config.CROPS[o.crop].name + '種子';
      return { hoe:'鋤頭', can:'澆水壺', basket:'收成籃', fertilizer:'肥料' }[o.tool];
    }

    function currentOpt(){ return store.farm.tool === 'seed' ? { tool:'seed', crop:store.farm.seedCrop } : { tool:store.farm.tool }; }

    function sameOpt(a, b){ return a.tool === b.tool && a.crop === b.crop; }

    function applyToolOpt(o){ store.farm.tool = o.tool; if (o.crop) store.farm.seedCrop = o.crop; }

    function toolImg(){
      if (store.farm.tool === 'seed') return 'item_' + store.farm.seedCrop;
      return { hoe:'item_hoe', can:'item_can', basket:'item_basket', fertilizer:'item_seeds' }[store.farm.tool];
    }

    function cycleTool(){
      if (store.menu.open || store.shop.open || store.market.open || store.dialogue.active || store.sleeping) return;
      var cur = currentOpt(), idx = 0;
      config.TOOL_CYCLE.forEach(function(o, i){ if (sameOpt(o, cur)) idx = i; });
      applyToolOpt(config.TOOL_CYCLE[(idx + 1) % config.TOOL_CYCLE.length]);
      audio.sfx.cursor();
    }

    return { toolName, currentOpt, sameOpt, applyToolOpt, toolImg, cycleTool };
  };
})(window.PixelFarm);
