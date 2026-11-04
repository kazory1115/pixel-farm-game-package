(function (PixelFarm) {
  "use strict";

  PixelFarm.createStore = function (config) {
    const farm = {
      day: 1, coins: 120, rainy: false,
      tool: 'hoe', seedCrop: 'wheat',
      seeds: { wheat:6, carrot:2, cabbage:0, tomato:0, pumpkin:0 },
      fertilizer: 0, sprinkler: false,
      produce: { wheat:0, carrot:0, cabbage:0, tomato:0, pumpkin:0, egg:0 },
      totalHarvest: 0, totalEarned: 0, eggsCollected: 0,
      goalsDone: {}
    };
    const plots = {};
    function plotAt(c, r) {
      const key = c + ',' + r;
      if (!plots[key]) plots[key] = { tilled: false, crop: null, growth: 0, watered: false };
      return plots[key];
    }
    return {
      farm, plots, plotAt,
      player: { tx:5, ty:6, px:5*config.TILE, py:6*config.TILE, dir:'down', moving:false, step:0, stepT:0 },
      dialogue: { text:'', shown:0, active:false, t:0, pageStart:0 },
      menu: { open:false, tab:0, idx:0, top:0 },
      shop: { open:false, idx:0, msg:'' },
      market: { open:false, idx:0, msg:'' },
      input: { keys:{}, touchDir:null, holdDir:null, holdT:0 },
      scene: 'farm', sleeping: false, soundOn: true,
      animals: [], eggs: [], eggTimer: 0
    };
  };
})(window.PixelFarm);
