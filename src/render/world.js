(function (PixelFarm) {
  "use strict";

  PixelFarm.createWorldView = function ({ config, store, world, surface, images }) {
    const view = surface.view;
    function drawFigure(cx, by, cap, body){
      surface.px(cx - 4, by - 15, 8, 6, '#f2c894');            /* 臉 */
      surface.px(cx - 5, by - 18, 10, 4, cap);                 /* 帽子 */
      surface.px(cx - 5, by - 9, 10, 6, body);                 /* 身體 */
      surface.px(cx - 5, by - 3, 4, 3, '#4a3826'); surface.px(cx + 1, by - 3, 4, 3, '#4a3826'); /* 腳 */
    }

    function drawShopBuilding(){
      var img = images.shop_house;
      if (img && img.complete && img.naturalWidth){
        /* 生成素材：木屋＋空白招牌＋門前土堆；門對齊 col 11，底部落在商店列下緣 */
        surface.ctx.drawImage(img, config.SHOP.c0 * config.TILE - 7, config.SHOP.r0 * config.TILE - 3, 62, 53);
        surface.ctx.font = 'bold 8px "PingFang TC","Microsoft JhengHei",sans-serif';
        if (!store.menu.open && !store.market.open) surface.txt('商店', config.SHOP.c0 * config.TILE + 24, 28, '#5a3410', 'center');
      }
    }

    function drawMarket(){
      [2, 5].forEach(function(c0){
        var x = c0 * config.TILE, y = 11 * config.TILE;
        surface.px(x + 1, y + 2, 3, 14, '#7a4a21'); surface.px(x + 28, y + 2, 3, 14, '#7a4a21'); /* 柱子 */
        if (c0 === 2) drawFigure(x + 24, y + 13, '#b03a2e', '#c9862b');          /* 攤販 */
        surface.px(x, y + 10, 32, 3, '#a4713a'); surface.px(x, y + 13, 32, 3, '#8a5a2b');        /* 攤台 */
        for (var i = 0; i < 4; i++) surface.px(x + i * 8, y - 3, 8, 5, i % 2 ? '#f5f0e6' : '#d9534a'); /* 棚布 */
      });
      surface.drawFit(images.item_wheat, 2 * config.TILE + 8, 11 * config.TILE + 11, 10);
      surface.drawFit(images.item_tomato, 5 * config.TILE + 8, 11 * config.TILE + 11, 10);
      surface.drawFit(images.item_carrot, 6 * config.TILE + 8, 11 * config.TILE + 11, 10);
      /* 行情招牌 */
      var sx = config.SIGN.c * config.TILE, sy = config.SIGN.r * config.TILE;
      surface.px(sx + 7, sy + 4, 2, 12, '#7a4a21');
      surface.px(sx - 2, sy - 4, 20, 10, '#7a4a21');
      surface.ctx.font = 'bold 8px "PingFang TC","Microsoft JhengHei",sans-serif';
      if (!store.menu.open && !store.market.open) surface.txt('市集', sx + 8, sy + 3, '#ffe9a8', 'center');
    }

    function drawShopInterior(){
      surface.ctx.save();
      surface.ctx.beginPath(); surface.ctx.rect(0, 16, view.width, view.worldHeight); surface.ctx.clip();
      /* 室內固定 240×144，置中放進目前視野；多出來的四周鋪同色系木地板，不露邊 */
      var ox = (view.width - 240) / 2, oy = (view.worldHeight - 144) / 2;
      surface.ctx.translate(ox, 16 + oy);
      surface.px(-ox, -oy, view.width, view.worldHeight, '#ac7f4a');
      for (var r = 0; r < 9; r++){
        for (var c = 0; c < 15; c++){
          var x = c * config.TILE, y = r * config.TILE;
          if (r <= 1){ surface.px(x, y, config.TILE, config.TILE, '#6e4a2c'); surface.px(x, y + 13, config.TILE, 3, '#59391f'); }
          else { surface.px(x, y, config.TILE, config.TILE, (c + r) % 2 ? '#b0864f' : '#ac7f4a'); surface.px(x, y + 15, config.TILE, 1, 'rgba(90,60,25,.35)'); }
        }
      }
      /* 貨架（生成素材，左右各一座靠牆） */
      surface.drawFit(images.shop_shelf, 40, 48, 40);
      surface.drawFit(images.shop_shelf, 200, 48, 40);
      surface.ctx.font = 'bold 9px "PingFang TC","Microsoft JhengHei",sans-serif';
      if (!store.menu.open) surface.txt('種 子 商 店', 120, 13, '#ffe9a8', 'center');
      /* 地毯 */
      surface.px(6 * config.TILE + 2, 5 * config.TILE + 2, 3 * config.TILE - 4, 2 * config.TILE - 4, '#a4443c');
      surface.px(6 * config.TILE + 6, 5 * config.TILE + 6, 3 * config.TILE - 12, 2 * config.TILE - 12, '#c05a4a');
      /* 店員（櫃台後，生成素材；開購物面板時換揮手姿勢） */
      surface.drawFit(store.shop.open ? images.shopkeeper_wave : images.shopkeeper, 7 * config.TILE + 8, 3 * config.TILE, 30);
      /* 櫃台（生成素材）＋收銀機與檯面商品 */
      if (images.shop_counter && images.shop_counter.complete && images.shop_counter.naturalWidth)
        surface.ctx.drawImage(images.shop_counter, 4 * config.TILE, 3 * config.TILE - 4, 7 * config.TILE, 24);
      surface.drawFit(images.shop_register, 10 * config.TILE + 6, 3 * config.TILE - 3, 15);
      surface.drawFit(images.item_seeds, 5 * config.TILE + 8, 3 * config.TILE - 3, 11);
      surface.drawFit(images.item_pumpkin, 9 * config.TILE + 8, 3 * config.TILE - 2, 12);
      /* 木箱堆、種子袋與盆栽（生成素材） */
      surface.drawFit(images.shop_crates, 13 * config.TILE - 4, 7 * config.TILE, 34);
      surface.drawFit(images.shop_sacks, 3 * config.TILE + 6, 7 * config.TILE, 24);
      surface.drawFit(images.shop_plant, 1 * config.TILE + 8, 7 * config.TILE, 20);
      /* 出口門 */
      surface.px(7 * config.TILE - 2, 8 * config.TILE, 20, 16, '#5f3a18');
      surface.px(7 * config.TILE + 2, 8 * config.TILE + 3, 12, 13, '#7a4a21');
      if (!store.shop.open && !store.menu.open) surface.txt('出口', 7 * config.TILE + 8, 8 * config.TILE - 3, '#fff2cf', 'center');
      /* 玩家 */
      var frames = [0, 1, 2, 1];
      var fi = store.player.moving ? frames[store.player.step] : 1;
      surface.drawFit(images['farmer_' + store.player.dir + '_' + fi], store.player.px + 8, store.player.py + 15, 22);
      surface.ctx.restore();
    }

    function computeCam(){
      var ww = config.COLS * config.TILE, wh = config.ROWS * config.TILE;
      /* 視野比世界小：攝影機跟隨玩家並夾在世界內；視野比世界大：世界置中，邊界外由草地延伸填滿 */
      view.camera.x = view.width >= ww ? (ww - view.width) / 2 : Math.max(0, Math.min(ww - view.width, store.player.px + 8 - view.width / 2));
      view.camera.y = view.worldHeight >= wh ? (wh - view.worldHeight) / 2 : Math.max(0, Math.min(wh - view.worldHeight, store.player.py + 8 - view.worldHeight / 2));
    }

    function drawHouse(){
      var x = config.HOUSE.c0 * config.TILE, y = config.HOUSE.r0 * config.TILE;
      var img = images.player_house;
      if (img && img.complete && img.naturalWidth){
        /* 生成素材：木屋＋門廊＋右下圍籬菜園；門對齊 col 3，階梯底落在 row 3 下緣，
           菜園垂到 row 4 沙地；煙囪在素材右上，動畫煙改從煙囪口冒 */
        surface.ctx.drawImage(img, x - 12, y - 16, 71, 76);
        var t = Date.now() / 1000;
        surface.ctx.fillStyle = 'rgba(255,255,255,.7)';
        for (var i = 0; i < 3; i++){
          var ph = (t * 0.45 + i / 3) % 1;
          surface.ctx.fillRect(x + 40 + Math.sin(ph * 6) * 1.5, y - 11 - ph * 5, 1.5 + ph * 2, 1.5 + ph * 1.5);
        }
        return;
      }
      /* 屋頂 */
      surface.px(x + 2, y + 14, 60, 7, '#a44a2a');
      surface.px(x + 8, y + 8, 48, 6, '#b8552f');
      surface.px(x + 16, y + 2, 32, 6, '#c65f33');
      /* 煙囪 + 煙 */
      surface.px(x + 48, y - 2, 6, 9, '#8d8578');
      var t = Date.now() / 1000;
      surface.ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (var i = 0; i < 3; i++){
        var ph = (t * 0.45 + i / 3) % 1;
        surface.ctx.fillRect(x + 49 + Math.sin(ph * 6) * 2, y - 4 - ph * 9, 2 + ph * 3, 2 + ph * 2);
      }
      /* 牆 */
      surface.px(x + 4, y + 21, 56, 27, '#f3dfba');
      surface.px(x + 4, y + 21, 56, 3, '#e0c491');
      /* 門（col 3） */
      surface.px(x + 22, y + 30, 12, 18, '#7a4a21');
      surface.px(x + 22, y + 30, 12, 2, '#5f3a18');
      surface.px(x + 31, y + 39, 2, 2, '#f2c230');
      /* 窗 */
      surface.px(x + 8, y + 28, 9, 9, '#a8d4e8'); surface.px(x + 8, y + 28, 9, 1, '#7a4a21'); surface.px(x + 12, y + 28, 1, 9, '#7a4a21');
      surface.px(x + 46, y + 28, 9, 9, '#a8d4e8'); surface.px(x + 46, y + 28, 9, 1, '#7a4a21'); surface.px(x + 50, y + 28, 1, 9, '#7a4a21');
    }

    function drawTree(c, r){
      var x = c * config.TILE, y = r * config.TILE;
      surface.px(x + 7, y + 10, 3, 6, '#7a4a21');
      surface.px(x + 2, y + 4, 12, 7, '#3f7028');
      surface.px(x + 4, y + 1, 8, 4, '#4c8432');
      surface.px(x + 4, y + 6, 3, 2, '#5d9a40'); surface.px(x + 10, y + 8, 2, 2, '#5d9a40');
      surface.px(x + 5, y + 3, 2, 2, '#e2543e'); surface.px(x + 10, y + 6, 2, 2, '#e2543e');
    }

    function drawFences(){
      var x0 = config.PEN.c0 * config.TILE, x1 = (config.PEN.c1 + 1) * config.TILE;
      var yt = config.PEN.r0 * config.TILE + 8, yb = config.PEN.r1 * config.TILE + 8;
      var xl = config.PEN.c0 * config.TILE + 8, xr = config.PEN.c1 * config.TILE + 8;
      function hrail(x, y, len){ surface.px(x, y - 3, len, 2, '#96622f'); surface.px(x, y + 2, len, 2, '#7a4a21'); }
      function vrail(x, y, len){ surface.px(x - 3, y, 2, len, '#96622f'); surface.px(x + 2, y, 2, len, '#7a4a21'); }
      function post(x, y){ surface.px(x - 1, y - 5, 3, 11, '#7a4a21'); surface.px(x - 1, y - 5, 3, 2, '#96622f'); }
      hrail(x0, yt, x1 - x0); hrail(x0, yb, x1 - x0);
      vrail(xr, config.PEN.r0 * config.TILE, (config.PEN.r1 + 1 - config.PEN.r0) * config.TILE);
      vrail(xl, config.PEN.r0 * config.TILE, (config.PEN.gate.r - config.PEN.r0) * config.TILE);
      vrail(xl, (config.PEN.gate.r + 1) * config.TILE, (config.PEN.r1 - config.PEN.gate.r) * config.TILE);
      for (var c = config.PEN.c0; c <= config.PEN.c1 + 1; c++){ post(c * config.TILE, yt); post(c * config.TILE, yb); }
      post(xr, config.PEN.r0 * config.TILE); post(xr, (config.PEN.gate.r + 1) * config.TILE); post(xr, (config.PEN.r1 + 1) * config.TILE);
      post(xl, config.PEN.r0 * config.TILE); post(xl, config.PEN.gate.r * config.TILE); post(xl, (config.PEN.gate.r + 1) * config.TILE); post(xl, (config.PEN.r1 + 1) * config.TILE);
    }

    function drawCropPlant(c, r, p){
      var crop = config.CROPS[p.crop];
      var cx = c * config.TILE + config.TILE / 2, by = (r + 1) * config.TILE - 1;
      var frac = p.growth / crop.days;
      if (frac >= 1){ surface.drawFit(images['item_' + p.crop], cx, by + 1, 15); return; }
      var s = 0.5 + frac * 0.6;
      surface.ctx.save(); surface.ctx.translate(cx, by); surface.ctx.scale(s, s);
      surface.px(-1, -6, 2, 6, '#3e7d2c');
      surface.px(-5, -8, 5, 3, '#57a047'); surface.px(0, -9, 5, 3, '#57a047');
      surface.px(-4, -11, 4, 3, '#6cb457'); surface.px(1, -12, 4, 3, '#6cb457');
      if (frac > 0.55) surface.px(-1.5, -14, 3, 3, crop.color);
      surface.ctx.restore();
      if (!p.watered && !store.farm.rainy){
        surface.px(cx - 1, r * config.TILE + 2, 2, 2, '#8fd0f0');
        surface.px(cx - 2, r * config.TILE + 4, 4, 2, '#5aa8dd');
      }
    }

    return { drawFigure, drawShopBuilding, drawMarket, drawShopInterior, computeCam, drawHouse, drawTree, drawFences, drawCropPlant };
  };
})(window.PixelFarm);
