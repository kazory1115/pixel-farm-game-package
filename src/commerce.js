(function (PixelFarm) {
  "use strict";

  PixelFarm.createCommerce = function ({ config, store, world, audio, dialogue, goals }) {
    function basePrice(id){ return id === 'egg' ? config.EGG_SELL : config.CROPS[id].sell; }

    function todayPrice(id){
      var i = config.PRICE_KEYS.indexOf(id);
      var h = world.hash2(store.farm.day * 13 + i * 29, 41 + i * 3);
      return Math.max(1, Math.round(basePrice(id) * (0.75 + h * 0.6)));
    }

    function priceBoardText(){
      var parts = config.PRICE_KEYS.map(function(id){ return (id === 'egg' ? '雞蛋' : config.CROPS[id].name) + todayPrice(id); });
      return '今日市集行情（金）：' + parts.join('、');
    }

    function enterShop(){
      store.scene = 'shop';
      store.player.tx = 7; store.player.ty = 7; store.player.px = 7 * config.TILE; store.player.py = 7 * config.TILE;
      store.player.dir = 'up'; store.player.moving = false;
      audio.sfx.cursor();
      dialogue.say('歡迎光臨種子商店！走到櫃台前按 A 買東西，往南走回門口就能出去');
    }

    function exitShop(){
      store.scene = 'farm';
      store.player.tx = config.SHOP_DOOR.c; store.player.ty = config.SHOP_DOOR.r;
      store.player.px = config.SHOP_DOOR.c * config.TILE; store.player.py = config.SHOP_DOOR.r * config.TILE;
      store.player.dir = 'down'; store.player.moving = false;
      audio.sfx.cursor();
    }

    function shopInteract(c, r){
      if (r === 3 && c >= 4 && c <= 10){ store.shop.open = true; store.shop.idx = 0; store.shop.msg = ''; audio.sfx.cursor(); return; }
      if (c === 7 && r === 8){ exitShop(); return; }
    }

    function shopGoods(){
      var g = config.CROP_IDS.map(function(id){
        return { kind:'seed', id:id, label:config.CROPS[id].name + '種子', short:config.CROPS[id].name + '種子',
                 price:config.CROPS[id].seed, meta:config.CROPS[id].seed + '金 · 有' + store.farm.seeds[id] + '包' };
      });
      g.push({ kind:'fertilizer', label:'肥料（作物提早長大一天）', short:'肥料',
               price:config.FERTILIZER_PRICE, meta:config.FERTILIZER_PRICE + '金 · 有' + store.farm.fertilizer + '包' });
      g.push({ kind:'sprinkler', label:'灑水器（澆水連鄰格）', short:'灑水器',
               price:config.SPRINKLER_PRICE, meta: store.farm.sprinkler ? '已擁有' : config.SPRINKLER_PRICE + '金', soldOut: store.farm.sprinkler });
      return g;
    }

    function shopBuy(){
      var it = shopGoods()[store.shop.idx];
      if (!it) return;
      if (it.soldOut){ store.shop.msg = '灑水器已經買過了'; audio.sfx.error(); return; }
      if (store.farm.coins < it.price){ store.shop.msg = '金幣不夠！（要 ' + it.price + ' 金）'; audio.sfx.error(); return; }
      store.farm.coins -= it.price;
      if (it.kind === 'seed') store.farm.seeds[it.id]++;
      else if (it.kind === 'fertilizer') store.farm.fertilizer++;
      else if (it.kind === 'sprinkler') store.farm.sprinkler = true;
      audio.sfx.coin();
      store.shop.msg = '買了' + it.short + '（-' + it.price + '金）';
    }

    function marketRows(){
      var rows = [];
      config.PRICE_KEYS.forEach(function(id){
        var n = store.farm.produce[id];
        if (n > 0) rows.push({ id:id, label: id === 'egg' ? '雞蛋' : config.CROPS[id].name, price: todayPrice(id), n:n });
      });
      if (rows.length){
        var total = rows.reduce(function(s, r){ return s + r.price * r.n; }, 0);
        rows.push({ all:true, label:'全部賣出', total:total });
      }
      return rows;
    }

    function marketActivate(){
      var rows = marketRows();
      if (!rows.length){ store.market.open = false; return; }
      if (store.market.idx >= rows.length) store.market.idx = rows.length - 1;
      var it = rows[store.market.idx];
      if (it.all){
        store.farm.coins += it.total; store.farm.totalEarned += it.total;
        config.PRICE_KEYS.forEach(function(id){ store.farm.produce[id] = 0; });
        store.market.msg = '全部賣出，一共 +' + it.total + ' 金！';
        store.market.idx = 0;
      } else {
        store.farm.produce[it.id]--; store.farm.coins += it.price; store.farm.totalEarned += it.price;
        store.market.msg = '賣出' + it.label + ' +' + it.price + ' 金';
      }
      audio.sfx.coin(); goals.checkGoals();
    }

    return { basePrice, todayPrice, priceBoardText, enterShop, exitShop, shopInteract, shopGoods, shopBuy, marketRows, marketActivate };
  };
})(window.PixelFarm);
