(function (PixelFarm) {
  "use strict";

  PixelFarm.createFarming = function ({ config, store, world, commerce, regions, day, audio, dialogue, goals }) {
    const waterEffects = [];
    function water(p,c,r){
      store.notice=null;
      p.watered = true;
      waterEffects.push({c:c,r:r,started:Date.now()});
      if (waterEffects.length > 32) waterEffects.shift();
    }
    function interact(c, r){
      if (store.scene === 'shop'){ commerce.shopInteract(c, r); return; }
      if (regions.interact(c,r)) return;
      if (c===config.FARM_EXIT.c && r===config.FARM_EXIT.r){ regions.enterMarket(); return; }
      if (store.player.tx === config.SHOP_DOOR.c && store.player.ty === config.SHOP_DOOR.r){ commerce.enterShop(); return; }
      if (store.player.tx === config.DOOR.c && store.player.ty === config.DOOR.r){ day.sleep(); return; }
      if (c === config.DOOR.c && r === config.DOOR.r){ day.sleep(); return; }
      if (c === config.SCARECROW.c && r === config.SCARECROW.r){ dialogue.notify('稻草人阿伯今天也認真站崗中。'); return; }
      if (c === config.WELL.c && r === config.WELL.r){ dialogue.notify('井水冰冰涼涼的，光看著就消暑。'); return; }
      if (world.isStall(c, r)){ commerce.openMarket(); return; }
      if (c === config.SIGN.c && r === config.SIGN.r){ dialogue.notify(commerce.priceBoardText()); return; }
      for (var i = 0; i < store.eggs.length; i++){
        if (store.eggs[i].c === c && store.eggs[i].r === r){
          store.eggs.splice(i, 1); store.farm.produce.egg++; store.farm.eggsCollected++;
          audio.sfx.egg(); dialogue.notify('撿到一顆雞蛋！'); goals.checkGoals(); return;
        }
      }
      if (!world.isPlot(c, r)){
        if (world.isPond(c, r)) dialogue.notify('池塘的水很清澈，鴨子在裡面游來游去。');
        return;
      }
      var p = store.plotAt(c, r);
      if (p.crop && p.growth >= config.CROPS[p.crop].days){
        var id = p.crop;
        store.farm.produce[id]++; store.farm.totalHarvest++;
        p.crop = null; p.growth = 0; p.watered = false;
        audio.sfx.harvest(); dialogue.notify(config.CROPS[id].name + ' +1');
        goals.checkGoals(); return;
      }
      if (store.farm.tool === 'hoe'){
        if (!p.tilled){ store.notice=null; p.tilled = true; audio.sfx.hoe();  }
        else if (p.crop){ p.crop = null; p.growth = 0; p.watered = false; audio.sfx.hoe();  }
        else dialogue.notify('這塊土已經翻好了');
      } else if (store.farm.tool === 'seed'){
        var cid = store.farm.seedCrop;
        if (!p.tilled){ dialogue.notify('先用鋤頭翻土才能播種'); audio.sfx.error(); }
        else if (p.crop){ dialogue.notify('這格已經種了' + config.CROPS[p.crop].name); audio.sfx.error(); }
        else if (store.farm.seeds[cid] <= 0){
          dialogue.notify(config.CROPS[cid].name + '種子用完了，去北邊的商店買吧'); audio.sfx.error();
        } else {
          store.notice=null; store.farm.seeds[cid]--; p.crop = cid; p.growth = 0; p.watered = store.farm.rainy;
          if (cid === 'pumpkin') store.farm.goalsDone.pumpkinPlanted = true;
          audio.sfx.plant();
          goals.checkGoals();
        }
      } else if (store.farm.tool === 'can'){
        if (!p.crop){ dialogue.notify('這格還沒種東西'); audio.sfx.error(); }
        else if (p.watered){ dialogue.notify('今天已經澆過水了'); }
        else {
          water(p,c,r);
          var splashed = 0;
          if (store.farm.sprinkler){
            [[0,-1],[0,1],[-1,0],[1,0]].forEach(function(v){
              var nc = c + v[0], nr = r + v[1];
              if (world.isPlot(nc, nr)){ var np = store.plotAt(nc, nr); if (np.crop && !np.watered){ water(np,nc,nr); splashed++; } }
            });
          }
          audio.sfx.water();
        }
      } else if (store.farm.tool === 'fertilizer'){
        if (!p.crop){ dialogue.notify('這格還沒種東西，肥料要用在長著的作物上'); audio.sfx.error(); }
        else if (p.growth >= config.CROPS[p.crop].days){ dialogue.notify('已經成熟了，快用收成籃收成吧'); }
        else if (store.farm.fertilizer <= 0){ dialogue.notify('沒有肥料了，去北邊的商店買'); audio.sfx.error(); }
        else { store.farm.fertilizer--; p.growth++; p.watered = true; audio.sfx.plant(); dialogue.notify(config.CROPS[p.crop].name + ' 生長 +1 天'); }
      } else if (store.farm.tool === 'basket'){
        if (p.crop) dialogue.notify(config.CROPS[p.crop].name + '還沒成熟（已長 ' + p.growth + '/' + config.CROPS[p.crop].days + ' 天）');
        else dialogue.notify('這格沒有可以收成的作物');
      }
    }

    return { interact, waterEffects };
  };
})(window.PixelFarm);
