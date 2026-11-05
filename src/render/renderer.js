(function (PixelFarm) {
  "use strict";

  PixelFarm.createRenderer = function ({ config, store, world, player, farming, surface, worldView, panels, images }) {
    const view = surface.view;
    function draw(){
      surface.textQueue.length = 0;
      if (store.scene === 'shop'){
        surface.px(0, 0, view.width, view.height, '#3a2a18'); /* 先鋪滿深木色：室內置中後四周不留殘影/空白 */
        surface.px(0, 0, view.width, 16, '#20242c');
        worldView.drawShopInterior();
        surface.present(true);
        surface.ctx.clearRect(0, 0, view.width, view.height);
        panels.drawHUD();
      panels.drawNotice();
        if (store.menu.open) panels.drawMenu();
        else if (store.shop.open) panels.drawShopPanel();
        else if (store.dialogue.active) panels.drawDialog();
        surface.present();
        return;
      }
      worldView.computeCam();
      surface.px(0, 0, view.width, 16, '#20242c');
      surface.ctx.save();
      surface.ctx.beginPath(); surface.ctx.rect(0, 16, view.width, view.worldHeight); surface.ctx.clip();
      surface.ctx.translate(-view.camera.x, 16 - view.camera.y);
      surface.px(view.camera.x, view.camera.y, view.width, view.worldHeight, '#79a83e');
      var c0 = Math.floor(view.camera.x / config.TILE), c1 = Math.floor((view.camera.x + view.width) / config.TILE);
      var r0 = Math.floor(view.camera.y / config.TILE), r1 = Math.floor((view.camera.y + view.worldHeight) / config.TILE);
      for (var r = r0; r <= r1; r++){
        for (var c = c0; c <= c1; c++){
          if (c < 0 || c >= config.COLS || r < 0 || r >= config.ROWS){
            /* 世界邊界外：延伸草地（同 2×2 區塊換紋理），視野再大也不露空 */
            if (world.hash2(Math.floor(c / 2), Math.floor(r / 2)) > 0.5) surface.drawTileFlat(images.tile_grass, c, r);
            else surface.drawTileFlat(images.tile_grass2, c, r);
            continue;
          }
          if (world.isPond(c, r)){ surface.drawTileFlat(images.tile_water, c, r); continue; }
          if (world.isPlot(c, r)){
            var p = store.plotAt(c, r);
            worldView.drawPlot(c, r, p);
            continue;
          }
          if (world.isPath(c, r) || (r === 12 && c >= 1 && c <= 8)){ surface.drawTile(images.tile_stone, c, r); continue; } /* 石板路與市集廣場：原本的岩石地板 */
          if (world.isSand(c, r)){ surface.drawTileFlat(images.tile_sand, c, r); continue; }
          var h = world.hash2(c, r);
          if (h > 0.93) surface.drawTileFlat(images.tile_flower, c, r);
          /* 草地以 2×2 區塊為單位換紋理，不要逐格跳色，才不會像棋盤 */
          else if (world.hash2(Math.floor(c / 2), Math.floor(r / 2)) > 0.5) surface.drawTileFlat(images.tile_grass, c, r);
          else surface.drawTileFlat(images.tile_grass2, c, r);
        }
      }
      for (var r2 = config.PLOT_R0; r2 <= config.PLOT_R1; r2++)
        for (var c2 = config.PLOT_C0; c2 <= config.PLOT_C1; c2++){
          var pp = store.plotAt(c2, r2);
          if (pp.crop){
            worldView.drawCropPlant(c2, r2, pp);
            worldView.drawWaterStatus(c2, r2, pp);
          }
        }
      var f = player.facedTile();
      if (world.isPlot(f.c, f.r) || (f.c === config.DOOR.c && f.r === config.DOOR.r) ||
          (f.c === config.SHOP_DOOR.c && f.r === config.SHOP_DOOR.r) || world.isStall(f.c, f.r)){
        surface.ctx.strokeStyle = 'rgba(255,255,255,.9)'; surface.ctx.lineWidth = 1.5;
        surface.ctx.strokeRect(f.c * config.TILE + 1.5, f.r * config.TILE + 1.5, config.TILE - 3, config.TILE - 3);
      }
      worldView.drawHouse();
      worldView.drawShopBuilding();
      worldView.drawMarket();
      worldView.drawFences();
      store.eggs.forEach(function(e){ surface.drawFit(images.item_egg, e.c * config.TILE + 8, e.r * config.TILE + 15, 11); });
      var ents = store.animals.map(function(a){ return { y: a.y, a: a }; });
      ents.push({ y: store.player.py + 8, p: true });
      ents.push({ y: (config.SCARECROW.r + 1) * config.TILE, deco: 'deco_scarecrow', c: config.SCARECROW.c, r: config.SCARECROW.r, h: 24 });
      ents.push({ y: (config.WELL.r + 1) * config.TILE, deco: 'deco_well', c: config.WELL.c, r: config.WELL.r, h: 24 });
      config.SUNFLOWERS.forEach(function(s){ ents.push({ y: (s.r + 1) * config.TILE, deco: 'deco_sunflower', c: s.c, r: s.r, h: 20 }); });
      config.TREES.forEach(function(t){ ents.push({ y: (t.r + 1) * config.TILE, tree: t }); });
      ents.sort(function(m, n){ return m.y - n.y; });
      ents.forEach(function(e){
        if (e.p){
          var frames = [0, 1, 2, 1];
          var fi = store.player.moving ? frames[store.player.step] : 1;
          surface.drawFit(images['farmer_' + store.player.dir + '_' + fi], store.player.px + 8, store.player.py + 15, 22);
        } else if (e.tree){
          worldView.drawTree(e.tree.c, e.tree.r);
        } else if (e.deco){
          surface.drawFit(images[e.deco], e.c * config.TILE + 8, (e.r + 1) * config.TILE, e.h);
        } else {
          var a = e.a;
          if (a.kind === 'duck'){
            var bob = Math.round(Math.sin(Date.now() / 280 + a.x / 10));
            surface.drawFit(images.deco_duck, a.x, a.y + 9 + bob, config.ANIMAL_SIZE.duck, a.dir > 0);
          } else {
            surface.drawFit(images['animal_' + a.kind + '_' + a.frame], a.x, a.y + config.ANIMAL_SIZE[a.kind] / 2, config.ANIMAL_SIZE[a.kind], a.dir < 0);
          }
        }
      });
      for (var wi=farming.waterEffects.length-1; wi>=0; wi--){
        var effect=farming.waterEffects[wi], age=(Date.now()-effect.started)/650;
        if (age>=1){ farming.waterEffects.splice(wi,1); continue; }
        var wx=effect.c*config.TILE+8, wy=effect.r*config.TILE+8;
        for (var drop=0; drop<6; drop++){
          var angle=drop*Math.PI/3;
          surface.px(Math.round(wx+Math.cos(angle)*(2+age*8)),Math.round(wy+Math.sin(angle)*(2+age*5)-Math.sin(age*Math.PI)*4),1,2,'#d4f4ff');
        }
      }
      if (store.farm.rainy){
        surface.ctx.strokeStyle = 'rgba(190,220,255,.55)'; surface.ctx.lineWidth = 1;
        var t = Date.now() / 14;
        surface.ctx.beginPath();
        for (var i = 0; i < 55; i++){
          var rx = view.camera.x + ((i * 47 + t * 5) % view.width), ry = view.camera.y + ((i * 31 + t * 16) % view.worldHeight);
          surface.ctx.moveTo(rx, ry); surface.ctx.lineTo(rx - 1, ry + 4);
        }
        surface.ctx.stroke();
      }
      surface.ctx.restore();
      surface.px(0, 16, view.width, view.worldHeight, 'rgba(255,166,66,.05)'); /* 農場整體罩一層暖色，跟商店室內的暖木色調統一 */
      surface.present(true);
      surface.ctx.clearRect(0, 0, view.width, view.height);
      panels.drawHUD();
      panels.drawNotice();
      if (store.menu.open) panels.drawMenu();
      else if (store.market.open) panels.drawMarketPanel();
      else if (store.dialogue.active) panels.drawDialog();
      surface.present();
    }

    return { draw };
  };
})(window.PixelFarm);
