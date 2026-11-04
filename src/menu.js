(function (PixelFarm) {
  "use strict";

  PixelFarm.createMenu = function ({ config, store, tools, day, audio, goals, window, document }) {
    const controlSizes = [80, 100, 120, 140];
    const storageKey = 'pixelFarm.controlSize';
    let controlSizeIndex = 1;
    try {
      const saved = Number(window.localStorage?.getItem(storageKey));
      const index = controlSizes.indexOf(saved);
      if (index >= 0) controlSizeIndex = index;
    } catch (_) { /* 私密模式或本機檔案可能不允許儲存 */ }
    function applyControlSize(){
      document.getElementById('padbar').style.setProperty('--control-scale', String(controlSizes[controlSizeIndex] / 100));
    }
    applyControlSize();

    function menuItems(){
      if (store.menu.tab === 0){
        return config.TOOL_CYCLE.map(function(o){
          var meta = '';
          if (o.tool === 'seed') meta = '有' + store.farm.seeds[o.crop] + ' 包';
          else if (o.tool === 'fertilizer') meta = '有' + store.farm.fertilizer + ' 包';
          if (tools.sameOpt(o, tools.currentOpt())) meta = meta ? meta + ' · 使用中' : '使用中';
          return { label: tools.toolName(o), meta: meta, opt: o };
        });
      }
      if (store.menu.tab === 1){
        var rows = [], any = false;
        config.CROP_IDS.forEach(function(id){
          if (store.farm.produce[id] > 0){ any = true; rows.push({ label: config.CROPS[id].name, meta: '×' + store.farm.produce[id], info: true }); }
        });
        if (store.farm.produce.egg > 0){ any = true; rows.push({ label:'雞蛋', meta:'×' + store.farm.produce.egg, info: true }); }
        if (store.farm.fertilizer > 0) rows.push({ label:'肥料', meta:'×' + store.farm.fertilizer, info: true });
        if (store.farm.sprinkler) rows.push({ label:'灑水器', meta:'已裝備', info: true });
        if (!rows.length) rows.push({ label:'（背包是空的）', info: true });
        if (any) rows.push({ label:'（拿到南邊市集才賣得掉）', info: true });
        return rows;
      }
      if (store.menu.tab === 2){
        return goals.items.map(function(g){
          return { label: (store.farm.goalsDone[g.id] || g.test() ? '✓ ' : '・') + g.text, info: true };
        });
      }
      if (store.menu.tab === 3){
        return [
          '移動：方向鍵 / WASD',
          'A 互動：Z / 空白鍵',
          'B 取消：X',
          '換工具：Shift / SELECT',
          '選單：Enter / START',
          '數字鍵直接換工具',
          '手機：按畫面上的按鈕',
          '流程：翻土→播種→澆水',
          '睡一覺長大→收成',
          '種子：去北邊商店買',
          '賣貨：去南邊市集賣',
          '市集價格每天不一樣',
          '招牌可看今日行情',
          '肥料可讓作物提早長大',
          '雨天自動澆水，不必澆',
          '雞會下蛋，撿蛋也能賣'
        ].map(function(s){ return { label: s, info: true }; });
      }
      return [
        { label:'回小屋睡覺', action:'sleep' },
        { label:'音效：' + (store.soundOn ? '開' : '關'), action:'sound' },
        { label:'按鈕大小：' + controlSizes[controlSizeIndex] + '%', action:'controlSize' },
        { label:'關閉選單', action:'close' }
      ];
    }
    function menuActivate(){
      var items = menuItems();
      var it = items[store.menu.idx];
      if (!it) return;
      if (it.disabled || it.info){ audio.sfx.error(); return; }
      if (store.menu.tab === 0 && it.opt){
        tools.applyToolOpt(it.opt); audio.sfx.plant(); store.menu.open = false;
        return;
      }
      if (it.action === 'sleep'){ store.menu.open = false; day.sleep(); }
      else if (it.action === 'sound'){ audio.setSound(!store.soundOn); }
      else if (it.action === 'controlSize'){
        controlSizeIndex = (controlSizeIndex + 1) % controlSizes.length;
        applyControlSize();
        try { window.localStorage?.setItem(storageKey, String(controlSizes[controlSizeIndex])); }
        catch (_) { /* 仍可在這次遊戲期間調整 */ }
      }
      else if (it.action === 'close'){ store.menu.open = false; }
    }
    function toggleMenu(){
      if (store.sleeping) return;
      if (store.shop.open){ store.shop.open = false; return; }
      if (store.market.open){ store.market.open = false; return; }
      store.menu.open = !store.menu.open;
      if (store.menu.open){ store.menu.tab = 0; store.menu.idx = 0; store.menu.top = 0; store.dialogue.active = false; audio.sfx.cursor(); }
    }

    return { menuItems, menuActivate, toggleMenu };
  };
})(window.PixelFarm);
