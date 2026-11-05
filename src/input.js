(function (PixelFarm) {
  "use strict";

  PixelFarm.createInput = function ({ config, store, surface, panels, player, farming, tools, menu, commerce, dialogue, audio, window, document }) {
    const view = surface.view;
    const el = id => document.getElementById(id);
    let heldNavigation = null;
    let gesture = null;
    const keyboardDirections = { arrowup:'up', w:'up', arrowdown:'down', s:'down', arrowleft:'left', a:'left', arrowright:'right', d:'right' };

    // Keyboard and touch directions share the same modal navigation rules.
    function navigate(direction){
      const vertical = direction === 'up' || direction === 'down';
      const delta = direction === 'up' || direction === 'left' ? -1 : 1;
      if (store.shop.open || store.market.open){
        const panel = store.shop.open ? store.shop : store.market;
        const rows = store.shop.open ? commerce.shopGoods() : commerce.marketRows();
        if (vertical){
          if (rows.length) panel.idx = (panel.idx + delta + rows.length) % rows.length;
          audio.sfx.cursor();
        }
        return true;
      }
      if (store.menu.open){
        if (vertical){
          const count = menu.menuItems().length;
          store.menu.idx = (store.menu.idx + delta + count) % count;
        } else {
          store.menu.tab = (store.menu.tab + delta + config.MENU_TABS.length) % config.MENU_TABS.length;
          store.menu.idx = 0;
          store.menu.top = 0;
        }
        audio.sfx.cursor();
        return true;
      }
      return false;
    }

    function update(dt){
      if (!heldNavigation) return;
      if (store.sleeping || !(store.menu.open || store.shop.open || store.market.open)){
        heldNavigation = null;
        return;
      }
      heldNavigation.elapsed += dt;
      while (heldNavigation.elapsed >= heldNavigation.next){
        navigate(heldNavigation.direction);
        heldNavigation.next += 0.12;
      }
    }

    function point(event){
      const rect = surface.canvas.getBoundingClientRect();
      return { x:(event.clientX - rect.left) / rect.width * view.width,
               y:(event.clientY - rect.top) / rect.height * view.height };
    }
    function shopClick(gx, gy){
      var G = panels.panelGeom(), X = G.X, Y = G.Y, W = G.W, H = G.H;
      if (gx < X || gx > X + W || gy < Y || gy > Y + H){ store.shop.open = false; return; }
      var i = Math.floor((gy - (Y + 18)) / 12);
      var g = commerce.shopGoods();
      if (i >= 0 && i < g.length){ store.shop.idx = i; commerce.shopBuy(); }
    }
    function marketClick(gx, gy){
      var G = panels.panelGeom(), X = G.X, Y = G.Y, W = G.W, H = G.H;
      if (gx < X || gx > X + W || gy < Y || gy > Y + H){ store.market.open = false; return; }
      var i = Math.floor((gy - (Y + 18)) / 12);
      var rows = commerce.marketRows();
      if (i >= 0 && i < rows.length){ store.market.idx = i; commerce.marketActivate(); }
    }

    /* ---------------- 按鍵：A / B ---------------- */
    function pressA(){
      if (store.sleeping) return;
      if (store.shop.open){ commerce.shopBuy(); return; }
      if (store.market.open){ commerce.marketActivate(); return; }
      if (store.menu.open){ menu.menuActivate(); return; }
      if (store.dialogue.active){
        dialogue.advance();
        return;
      }
      var f = player.facedTile();
      farming.interact(f.c, f.r);
    }
    function pressB(){
      if (store.shop.open){ store.shop.open = false; return; }
      if (store.market.open){ store.market.open = false; return; }
      if (store.menu.open){ store.menu.open = false; return; }
      if (store.dialogue.active){ store.dialogue.active = false; }
    }

    /* ---------------- 輸入 ---------------- */
    function bind(){
      window.addEventListener('keydown', function(e){
        var k = e.key.toLowerCase();
        if (['arrowup','arrowdown','arrowleft','arrowright',' '].indexOf(k) >= 0) e.preventDefault();
        store.input.keys[k] = true;
        if(k==='m' && !e.repeat && !store.sleeping){
          if(store.menu.open && store.menu.tab===5) store.menu.open=false;
          else { store.shop.open=store.market.open=false; store.dialogue.active=false; store.menu.open=true; store.menu.tab=5; store.menu.idx=store.menu.top=0; }
          return;
        }
        const direction = keyboardDirections[k];
        if (direction && navigate(direction)) return;
        if (direction) player.faceDirection(direction);
        if (store.shop.open){
          if ((k === 'z' || k === ' ' || k === 'e') && !e.repeat){ commerce.shopBuy(); }
          else if (k === 'x' || k === 'escape' || k === 'enter'){ store.shop.open = false; }
          return;
        }
        if (store.market.open){
          if ((k === 'z' || k === ' ' || k === 'e') && !e.repeat){ commerce.marketActivate(); }
          else if (k === 'x' || k === 'escape' || k === 'enter'){ store.market.open = false; }
          return;
        }
        if (store.menu.open){
          if ((k === 'z' || k === ' ' || k === 'e') && !e.repeat){ menu.menuActivate(); }
          else if (k === 'x' || k === 'escape' || k === 'enter'){ store.menu.open = false; }
          return;
        }
        if (e.repeat) return;
        if (k === 'enter'){ menu.toggleMenu(); }
        else if (k === 'shift'){ tools.cycleTool(); }
        else if (k === 'z' || k === ' ' || k === 'e'){ pressA(); }
        else if (k === 'x' || k === 'escape'){ pressB(); }
        else {
          var num = parseInt(k, 10);
          if (num >= 1 && num <= config.TOOL_CYCLE.length && !store.dialogue.active){ tools.applyToolOpt(config.TOOL_CYCLE[num - 1]); audio.sfx.plant(); }
        }
      });
      window.addEventListener('keyup', function(e){
        var k=e.key.toLowerCase(); store.input.keys[k]=false; player.releaseDirection(keyboardDirections[k]);
      });
      document.querySelectorAll('.dpad button').forEach(function(b){
        var d = b.getAttribute('data-dir');
        var on = function(e){
          e.preventDefault();
          if (store.sleeping) return;
          if (navigate(d)){
            store.input.touchDir = null;
            heldNavigation = { direction:d, elapsed:0, next:0.3 };
          } else { player.faceDirection(d); store.input.touchDir = d; }
        };
        var off = function(){
          if (store.input.touchDir === d){ store.input.touchDir = null; player.releaseDirection(d); }
          if (heldNavigation?.direction === d) heldNavigation = null;
        };
        b.addEventListener('pointerdown', on);
        b.addEventListener('pointerup', off);
        b.addEventListener('pointerleave', off);
        b.addEventListener('pointercancel', off);
      });
      el('btnA').addEventListener('click', pressA);
      el('btnB').addEventListener('click', pressB);
      el('btnStart').addEventListener('click', menu.toggleMenu);
      el('btnSelect').addEventListener('click', tools.cycleTool);
      surface.canvas.addEventListener('pointerdown', function(e){
        // Canvas taps belong to open panels. World interactions must go through
        // pressA(), which always resolves the tile the player is facing.
        if (store.sleeping || !(store.menu.open || store.shop.open || store.market.open)) return;
        const { x:gx, y:gy } = point(e);
        if (store.menu.open){
          const G = panels.panelGeom();
          const inList = gx >= G.X && gx <= G.X + G.W && gy >= G.Y + 18 && gy < G.Y + G.H - 10;
          if ((e.pointerType === 'touch' || e.pointerType === 'pen') && inList){
            gesture = { id:e.pointerId, tab:store.menu.tab, x:e.clientX, y:e.clientY, gy, top:store.menu.top, moved:false };
            surface.canvas.setPointerCapture?.(e.pointerId);
          } else menuClick(gx, gy);
          return;
        }
        if (store.shop.open){ shopClick(gx, gy); return; }
        if (store.market.open){ marketClick(gx, gy); return; }
      });
      surface.canvas.addEventListener('pointermove', function(e){
        if (!gesture || gesture.id !== e.pointerId) return;
        if (!store.menu.open || store.menu.tab !== gesture.tab){ gesture = null; return; }
        if (Math.abs(e.clientX - gesture.x) > 10 || Math.abs(e.clientY - gesture.y) > 10) gesture.moved = true;
        if (!gesture.moved) return;
        const rowH = panels.menuRowHeight();
        const visible = Math.max(1, Math.floor((panels.panelGeom().H - 28) / rowH));
        const maximum = Math.max(0, menu.menuItems().length - visible);
        const delta = Math.trunc((gesture.gy - point(e).y) / rowH);
        store.menu.top = Math.max(0, Math.min(maximum, gesture.top + delta));
        store.menu.idx = Math.max(store.menu.top, Math.min(store.menu.idx, store.menu.top + visible - 1));
      });
      surface.canvas.addEventListener('pointerup', function(e){
        if (!gesture || gesture.id !== e.pointerId) return;
        const tap = !gesture.moved && store.menu.open && store.menu.tab === gesture.tab;
        gesture = null;
        if (tap){ const p = point(e); menuClick(p.x, p.y); }
      });
      const cancelGesture = function(e){ if (gesture?.id === e.pointerId) gesture = null; };
      surface.canvas.addEventListener('pointercancel', cancelGesture);
      surface.canvas.addEventListener('lostpointercapture', cancelGesture);
    }
    function menuClick(gx, gy){
      var G = panels.panelGeom(), X = G.X, Y = G.Y, W = G.W, H = G.H;
      if (gx < X || gx > X + W || gy < Y || gy > Y + H){ store.menu.open = false; return; }
      if (gy < Y + 18){ store.menu.tab = Math.max(0, Math.min(config.MENU_TABS.length - 1, Math.floor((gx - X - 2) / ((W - 4) / config.MENU_TABS.length)))); store.menu.idx = 0; store.menu.top = 0; audio.sfx.cursor(); return; }
      var items = menu.menuItems();
      var rowH = panels.menuRowHeight();
      var i = store.menu.top + Math.floor((gy - (Y + 18)) / rowH);
      var VIS = Math.max(1, Math.floor((H - 28) / rowH));
      if (i >= store.menu.top && i < Math.min(items.length, store.menu.top + VIS)){ store.menu.idx = i; menu.menuActivate(); }
    }


    return { bind, update, pressA, pressB };
  };
})(window.PixelFarm);
