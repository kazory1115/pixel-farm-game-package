(function (PixelFarm) {
  "use strict";

  PixelFarm.createGoals = function ({ store, audio, dialogue }) {
    var GOALS = [
      { id:'g1', text:'收成第一株作物',        test:function(){ return store.farm.totalHarvest >= 1; } },
      { id:'g2', text:'累積賺到 300 金幣',      test:function(){ return store.farm.totalEarned >= 300; } },
      { id:'g3', text:'撿到 5 顆雞蛋',          test:function(){ return store.farm.eggsCollected >= 5; } },
      { id:'g4', text:'買下並種下一顆南瓜種子',  test:function(){ return !!store.farm.goalsDone.pumpkinPlanted || anyPumpkin(); } }
    ];
    function anyPumpkin(){
      for (var k in store.plots) if (store.plots[k].crop === 'pumpkin') return true;
      return store.farm.produce.pumpkin > 0;
    }
    function checkGoals(){
      var newly = null, all = true;
      GOALS.forEach(function(g){
        if (g.test() && !store.farm.goalsDone[g.id]){ store.farm.goalsDone[g.id] = true; newly = g; }
        if (!store.farm.goalsDone[g.id]) all = false;
      });
      if (all && !store.farm.goalsDone.allDone){
        store.farm.goalsDone.allDone = true; audio.sfx.goal();
        dialogue.say('🎉 四個農場目標全部達成！你的小農場經營得有模有樣了');
        return;
      }
      if (newly){ audio.sfx.goal(); dialogue.say('🎯 目標達成：' + newly.text); }
    }


    return { items: GOALS, checkGoals };
  };
})(window.PixelFarm);
