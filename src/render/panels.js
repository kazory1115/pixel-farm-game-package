(function (PixelFarm) {
  "use strict";

  PixelFarm.createPanels = function ({ config, store, surface, images, tools, menu, commerce, dialogue }) {
    const view = surface.view;
    function panel(x, y, w, h){
      surface.px(x, y, w, h, '#28283c');
      surface.px(x + 2, y + 2, w - 4, h - 4, '#f8f8f0');
    }

    function panelGeom(){
      var W = Math.min(188, view.width - 12);
      var H = Math.min(128, view.height - 28);
      return { X: Math.round((view.width - W) / 2), Y: Math.round(16 + (view.worldHeight - H) / 2), W: W, H: H };
    }

    function drawHUD(){
      surface.px(0, 0, view.width, 16, '#20242c');
      surface.px(0, 15, view.width, 1, '#0d0f13');
      surface.ctx.font = '9px "PingFang TC","Microsoft JhengHei",sans-serif';
      surface.px(5, 5, 7, 7, '#f2c230'); surface.px(6, 6, 5, 5, '#d9a92c');
      surface.txt(String(store.farm.coins), 16, 12, '#f8f8f0');
      var dayStr = '第' + store.farm.day + '天';
      surface.txt(dayStr, 58, 12, '#f8f8f0');
      surface.txt(store.farm.rainy ? '雨天' : '晴天', 64 + dayStr.length * 9, 12, store.farm.rainy ? '#9fd8ff' : '#ffd98a');
      /* 工具組靠右：名稱、圖示、數量由右往左排，窄畫面也不出界 */
      surface.txt(tools.toolName(tools.currentOpt()), view.width - 38, 12, '#f8f8f0', 'right');
      if (store.farm.tool === 'fertilizer'){
        surface.px(view.width - 34, 4, 10, 10, '#e8e4da'); surface.px(view.width - 34, 4, 10, 3, '#57a047'); surface.px(view.width - 31, 9, 4, 3, '#57a047');
        surface.txt('×' + store.farm.fertilizer, view.width - 4, 12, '#f8f8f0', 'right');
      } else {
        surface.drawFit(images[tools.toolImg()], view.width - 27, 15, 13);
        if (store.farm.tool === 'seed') surface.txt('×' + store.farm.seeds[store.farm.seedCrop], view.width - 4, 12, '#f8f8f0', 'right');
      }
    }

    function drawDialog(){
      // The lower corners belong to the touch controls at every button size.
      var W = view.width - 8, Y = 20;
      panel(4, Y, W, 40);
      surface.ctx.font = '9px "PingFang TC","Microsoft JhengHei",sans-serif';
      var page = dialogue.currentPage();
      surface.txt(page.lines[0], 10, Y + 16, '#28283c');
      if (page.lines[1]) surface.txt(page.lines[1], 10, Y + 29, '#28283c');
      if (store.dialogue.shown >= page.end && Math.floor(Date.now() / 400) % 2 === 0){
        surface.txt('▼', view.width - 18, Y + 34, '#28283c');
      }
    }

    function drawMenu(){
      surface.ctx.fillStyle = 'rgba(16,18,28,.45)'; surface.ctx.fillRect(0, 16, view.width, view.worldHeight);
      var G = panelGeom(), X = G.X, Y = G.Y, W = G.W, H = G.H;
      panel(X, Y, W, H);
      surface.ctx.font = '9px "PingFang TC","Microsoft JhengHei",sans-serif';
      var tabW = (W - 4) / config.MENU_TABS.length;
      for (var i = 0; i < config.MENU_TABS.length; i++){
        var tx0 = X + 2 + i * tabW;
        if (i === store.menu.tab){ surface.px(tx0, Y + 2, tabW - 2, 14, '#28283c'); surface.txt(config.MENU_TABS[i], tx0 + tabW / 2, Y + 12, '#f8f8f0', 'center'); }
        else surface.txt(config.MENU_TABS[i], tx0 + tabW / 2, Y + 12, '#28283c', 'center');
      }
      var items = menu.menuItems();
      var rowH = menuRowHeight();
      var VIS = Math.max(1, Math.floor((H - 28) / rowH));
      if (store.menu.idx < store.menu.top) store.menu.top = store.menu.idx;
      if (store.menu.idx >= store.menu.top + VIS) store.menu.top = store.menu.idx - VIS + 1;
      if (store.menu.top > Math.max(0, items.length - VIS)) store.menu.top = Math.max(0, items.length - VIS);
      items.slice(store.menu.top, store.menu.top + VIS).forEach(function(it, j){
        var i = store.menu.top + j;
        var ry = Y + 18 + j * rowH, base = ry + 9;
        if (i === store.menu.idx){
          surface.px(X + 3, ry, W - 6, rowH, '#e3ddc2');
          surface.txt('▶', X + 6, base, '#28283c');
        }
        surface.txt(it.label, X + 15, base, it.disabled ? '#9a958a' : '#28283c');
        if (it.meta) surface.txt(it.meta, X + W - 6, base, '#6a675a', 'right');
      });
      surface.ctx.font = '8px "PingFang TC","Microsoft JhengHei",sans-serif';
      var hint = items.length > VIS
        ? '↑↓ 捲動 ' + (store.menu.top + 1) + '–' + Math.min(items.length, store.menu.top + VIS) + '/' + items.length + ' · B 關閉'
        : 'A 決定 · B 關閉 · ←→ 換頁';
      surface.txt(hint, X + W / 2, Y + H - 5, '#6a675a', 'center');
    }

    function menuRowHeight(){ return store.menu.tab === 0 ? 11 : 12; }

    function drawShopPanel(){
      surface.ctx.fillStyle = 'rgba(16,18,28,.45)'; surface.ctx.fillRect(0, 16, view.width, view.worldHeight);
      var G = panelGeom(), X = G.X, Y = G.Y, W = G.W, H = G.H;
      panel(X, Y, W, H);
      surface.ctx.font = '9px "PingFang TC","Microsoft JhengHei",sans-serif';
      surface.txt('種子商店', X + 8, Y + 12, '#28283c');
      surface.txt('金幣 ' + store.farm.coins, X + W - 8, Y + 12, '#6a675a', 'right');
      var g = commerce.shopGoods();
      if (store.shop.idx >= g.length) store.shop.idx = g.length - 1;
      g.forEach(function(it, i){
        var ry = Y + 18 + i * 12, base = ry + 9;
        if (i === store.shop.idx){ surface.px(X + 3, ry, W - 6, 12, '#e3ddc2'); surface.txt('▶', X + 6, base, '#28283c'); }
        surface.txt(it.label, X + 15, base, '#28283c');
        surface.txt(it.meta, X + W - 6, base, '#6a675a', 'right');
      });
      surface.ctx.font = '8px "PingFang TC","Microsoft JhengHei",sans-serif';
      surface.txt(store.shop.msg || 'A 購買 · B 離開', X + W / 2, Y + H - 5, store.shop.msg ? '#a4443c' : '#6a675a', 'center');
    }

    function drawMarketPanel(){
      surface.ctx.fillStyle = 'rgba(16,18,28,.45)'; surface.ctx.fillRect(0, 16, view.width, view.worldHeight);
      var G = panelGeom(), X = G.X, Y = G.Y, W = G.W, H = G.H;
      panel(X, Y, W, H);
      surface.ctx.font = '9px "PingFang TC","Microsoft JhengHei",sans-serif';
      surface.txt('市集攤位', X + 8, Y + 12, '#28283c');
      surface.txt('金幣 ' + store.farm.coins, X + W - 8, Y + 12, '#6a675a', 'right');
      var rows = commerce.marketRows();
      if (!rows.length) surface.txt('背包是空的，先去收成再來賣吧', X + W / 2, Y + 64, '#6a675a', 'center');
      if (store.market.idx >= rows.length) store.market.idx = Math.max(0, rows.length - 1);
      rows.forEach(function(it, i){
        var ry = Y + 18 + i * 12, base = ry + 9;
        if (i === store.market.idx){ surface.px(X + 3, ry, W - 6, 12, '#e3ddc2'); surface.txt('▶', X + 6, base, '#28283c'); }
        surface.txt(it.label, X + 15, base, '#28283c');
        surface.txt(it.all ? '共 ' + it.total + ' 金' : '今日 ' + it.price + '金 · 有' + it.n, X + W - 6, base, '#6a675a', 'right');
      });
      surface.ctx.font = '8px "PingFang TC","Microsoft JhengHei",sans-serif';
      surface.txt(store.market.msg || 'A 賣出 · B 離開 · 價格每天會變', X + W / 2, Y + H - 5, store.market.msg ? '#a4443c' : '#6a675a', 'center');
    }

    return { panel, panelGeom, menuRowHeight, drawHUD, drawDialog, drawMenu, drawShopPanel, drawMarketPanel };
  };
})(window.PixelFarm);
