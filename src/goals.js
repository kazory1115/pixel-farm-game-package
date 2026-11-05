(function (PixelFarm) {
  "use strict";

  PixelFarm.createGoals = function ({ config, store, audio, dialogue }) {
    const bundleCrops = ['wheat','carrot','cabbage'];
    const donationKey = id => 'bundle_' + id;
    function bundleReady(){
      return bundleCrops.every(id => store.farm.goalsDone[donationKey(id)]) && store.farm.totalEarned >= 300;
    }
    function bundleRows(){
      const done = store.farm.goalsDone.bundleReward;
      const delivered = bundleCrops.filter(id => store.farm.goalsDone[donationKey(id)]).length;
      return [{ label:'田園出貨套組', meta:done ? '已完成' : delivered + '/3', info:true }]
        .concat(bundleCrops.map(function(id){
          const sent = store.farm.goalsDone[donationKey(id)];
          return { label:(sent ? '✓ ' : '交付 ') + config.CROPS[id].name,
            meta:sent ? '已交付' : '需1 · 有' + store.farm.produce[id],
            action:'donate', crop:id, disabled:!!sent || store.farm.produce[id] < 1 };
        }))
        .concat([
          { label:'出貨收入里程碑', meta:Math.min(300,store.farm.totalEarned) + '/300金', info:true },
          { label:done ? '✓ 套組獎勵已領取' : '領取套組獎勵', action:'bundleReward', disabled:!!done || !bundleReady() },
          { label:'獎勵：灑水器＋番茄種子×3', info:true }
        ]);
    }
    function donate(id){
      if (!bundleCrops.includes(id) || store.farm.goalsDone[donationKey(id)] || store.farm.produce[id] < 1) return false;
      store.farm.produce[id]--;
      store.farm.goalsDone[donationKey(id)] = true;
      audio.sfx.coin();
      return true;
    }
    function claimBundle(){
      if (!bundleReady() || store.farm.goalsDone.bundleReward) return false;
      store.farm.goalsDone.bundleReward = true;
      store.farm.sprinkler = true;
      store.farm.seeds.tomato += 3;
      store.menu.open = false;
      audio.sfx.goal();
      dialogue.say('田園出貨套組完成！獲得灑水器與 3 包番茄種子。灑水器已裝備，澆水時連相鄰四格一起照顧！');
      return true;
    }
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


    return { items: GOALS, checkGoals, bundleRows, donate, claimBundle };
  };
})(window.PixelFarm);
