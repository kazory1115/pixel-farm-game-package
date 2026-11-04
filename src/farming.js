(function (PixelFarm) {
  "use strict";

  PixelFarm.createFarming = function ({ config, store, world, commerce, day, audio, dialogue, goals }) {
    function interact(c, r){
      if (store.scene === 'shop'){ commerce.shopInteract(c, r); return; }
      if (store.player.tx === config.SHOP_DOOR.c && store.player.ty === config.SHOP_DOOR.r){ commerce.enterShop(); return; }
      if (store.player.tx === config.DOOR.c && store.player.ty === config.DOOR.r){ day.sleep(); return; }
      if (c === config.DOOR.c && r === config.DOOR.r){ day.sleep(); return; }
      if (c === config.SCARECROW.c && r === config.SCARECROW.r){ dialogue.say('稻草人阿伯今天也認真站崗中。'); return; }
      if (c === config.WELL.c && r === config.WELL.r){ dialogue.say('井水冰冰涼涼的，光看著就消暑。'); return; }
      if (world.isStall(c, r)){ store.market.open = true; store.market.idx = 0; store.market.msg = ''; audio.sfx.cursor(); return; }
      if (c === config.SIGN.c && r === config.SIGN.r){ dialogue.say(commerce.priceBoardText()); return; }
      for (var i = 0; i < store.eggs.length; i++){
        if (store.eggs[i].c === c && store.eggs[i].r === r){
          store.eggs.splice(i, 1); store.farm.produce.egg++; store.farm.eggsCollected++;
          audio.sfx.egg(); dialogue.say('撿到一顆雞蛋！'); goals.checkGoals(); return;
        }
      }
      if (!world.isPlot(c, r)){
        if (world.isPond(c, r)) dialogue.say('池塘的水很清澈，鴨子在裡面游來游去。');
        return;
      }
      var p = store.plotAt(c, r);
      if (p.crop && p.growth >= config.CROPS[p.crop].days){
        var id = p.crop;
        store.farm.produce[id]++; store.farm.totalHarvest++;
        p.crop = null; p.growth = 0; p.watered = false;
        audio.sfx.harvest(); dialogue.say('收成了 1 株' + config.CROPS[id].name + '！放進背包了');
        goals.checkGoals(); return;
      }
      if (store.farm.tool === 'hoe'){
        if (!p.tilled){ p.tilled = true; audio.sfx.hoe(); dialogue.say('翻好土了，可以播種'); }
        else if (p.crop){ p.crop = null; p.growth = 0; p.watered = false; audio.sfx.hoe(); dialogue.say('清除了這株作物'); }
        else dialogue.say('這塊土已經翻好了');
      } else if (store.farm.tool === 'seed'){
        var cid = store.farm.seedCrop;
        if (!p.tilled){ dialogue.say('先用鋤頭翻土才能播種'); audio.sfx.error(); }
        else if (p.crop){ dialogue.say('這格已經種了' + config.CROPS[p.crop].name); audio.sfx.error(); }
        else if (store.farm.seeds[cid] <= 0){
          dialogue.say(config.CROPS[cid].name + '種子用完了，去北邊的商店買吧'); audio.sfx.error();
        } else {
          store.farm.seeds[cid]--; p.crop = cid; p.growth = 0; p.watered = store.farm.rainy;
          if (cid === 'pumpkin') store.farm.goalsDone.pumpkinPlanted = true;
          audio.sfx.plant(); dialogue.say('種下了' + config.CROPS[cid].name + (store.farm.rainy ? '（雨天已自動澆水）' : '，記得澆水'));
          goals.checkGoals();
        }
      } else if (store.farm.tool === 'can'){
        if (!p.crop){ dialogue.say('這格還沒種東西'); audio.sfx.error(); }
        else if (p.watered){ dialogue.say('今天已經澆過水了'); }
        else {
          p.watered = true;
          var splashed = 0;
          if (store.farm.sprinkler){
            [[0,-1],[0,1],[-1,0],[1,0]].forEach(function(v){
              var nc = c + v[0], nr = r + v[1];
              if (world.isPlot(nc, nr)){ var np = store.plotAt(nc, nr); if (np.crop && !np.watered){ np.watered = true; splashed++; } }
            });
          }
          audio.sfx.water(); dialogue.say(splashed ? '澆好水了，灑水器連鄰格一起澆了' : '澆好水了，睡一覺就會長大');
        }
      } else if (store.farm.tool === 'fertilizer'){
        if (!p.crop){ dialogue.say('這格還沒種東西，肥料要用在長著的作物上'); audio.sfx.error(); }
        else if (p.growth >= config.CROPS[p.crop].days){ dialogue.say('已經成熟了，快用收成籃收成吧'); }
        else if (store.farm.fertilizer <= 0){ dialogue.say('沒有肥料了，去北邊的商店買'); audio.sfx.error(); }
        else { store.farm.fertilizer--; p.growth++; p.watered = true; audio.sfx.plant(); dialogue.say(config.CROPS[p.crop].name + '長大了一天！（肥料剩 ' + store.farm.fertilizer + ' 包）'); }
      } else if (store.farm.tool === 'basket'){
        if (p.crop) dialogue.say(config.CROPS[p.crop].name + '還沒成熟（已長 ' + p.growth + '/' + config.CROPS[p.crop].days + ' 天）');
        else dialogue.say('這格沒有可以收成的作物');
      }
    }

    return { interact };
  };
})(window.PixelFarm);
