(function (PixelFarm) {
  "use strict";

  PixelFarm.createPersistence = function ({ config, store, world, window, document }) {
    const key = 'pixelFarm.save.v1';
    let ready = false, elapsed = 0, lastSaved = '', status = '尚未存檔';
    const count = n => Number.isSafeInteger(n) && n >= 0 && n <= 1e12;
    const finite = n => Number.isFinite(n) && Math.abs(n) <= 1e9;
    const object = value => value && typeof value === 'object' && !Array.isArray(value);
    const clone = value => JSON.parse(JSON.stringify(value));

    function snapshot(){
      return {
        farm:store.farm, plots:store.plots,
        player:{ c:store.player.tx, r:store.player.ty, dir:store.player.dir },
        scene:store.scene, animals:store.animals, eggs:store.eggs,
        eggTimer:store.eggTimer, soundOn:store.soundOn
      };
    }

    function valid(data){
      if (!object(data) || !object(data.farm) || !object(data.plots) || !object(data.player)) return false;
      const f = data.farm;
      if (!['day','coins','fertilizer','totalHarvest','totalEarned','eggsCollected'].every(k => count(f[k])) || f.day < 1) return false;
      if (typeof f.rainy !== 'boolean' || typeof f.sprinkler !== 'boolean' || typeof data.soundOn !== 'boolean') return false;
      if (!config.TOOL_CYCLE.some(o => o.tool === f.tool) || !config.CROP_IDS.includes(f.seedCrop)) return false;
      if (!object(f.seeds) || !object(f.produce) || !object(f.goalsDone)) return false;
      if (!config.CROP_IDS.every(id => count(f.seeds[id])) || !config.PRICE_KEYS.every(id => count(f.produce[id]))) return false;
      if (!Object.entries(f.goalsDone).every(([k,v]) => ['g1','g2','g3','g4','allDone','pumpkinPlanted'].includes(k) && typeof v === 'boolean')) return false;
      for (const [position,p] of Object.entries(data.plots)){
        if (!/^\d+,\d+$/.test(position)) return false;
        const [c,r] = position.split(',').map(Number);
        if (!world.isPlot(c,r) || !object(p) || typeof p.tilled !== 'boolean' || typeof p.watered !== 'boolean') return false;
        if (p.crop !== null && !config.CROP_IDS.includes(p.crop)) return false;
        if (!count(p.growth) || (p.crop && (!p.tilled || p.growth > config.CROPS[p.crop].days))) return false;
      }
      const p = data.player;
      if (!Number.isInteger(p.c) || !Number.isInteger(p.r) || !Object.hasOwn(config.DIRS,p.dir)) return false;
      if (data.scene !== 'farm' && data.scene !== 'shop') return false;
      if ((data.scene === 'shop' ? world.isSolidShop : world.isSolid)(p.c,p.r)) return false;
      if (!Array.isArray(data.eggs) || data.eggs.length > 4) return false;
      if (!data.eggs.every(e => object(e) && Number.isInteger(e.c) && Number.isInteger(e.r)
        && e.c > config.PEN.c0 && e.c < config.PEN.c1 && e.r > config.PEN.r0 && e.r < config.PEN.r1)) return false;
      if (new Set(data.eggs.map(e => e.c + ',' + e.r)).size !== data.eggs.length) return false;
      if (!finite(data.eggTimer) || data.eggTimer < 0) return false;
      if (!Array.isArray(data.animals) || data.animals.length !== store.animals.length) return false;
      return data.animals.every((a,i) => {
        const original = store.animals[i];
        if (!object(a) || a.kind !== original.kind || a.zone !== original.zone) return false;
        if (!['x','y','tx','ty','wait','frameT'].every(k => finite(a[k]))) return false;
        if (![1,-1].includes(a.dir) || ![0,1].includes(a.frame)) return false;
        return [[a.x,a.y],[a.tx,a.ty]].every(([x,y]) => {
          const c = Math.floor(x / config.TILE), r = Math.floor(y / config.TILE);
          if (a.zone === 'pond') return world.isPond(c,r);
          if (a.zone === 'pen') return c > config.PEN.c0 && c < config.PEN.c1 && r > config.PEN.r0 && r < config.PEN.r1;
          return !world.isSolid(c,r) && !world.isPlot(c,r);
        });
      });
    }

    function load(){
      let restored = false;
      try {
        const raw = window.localStorage?.getItem(key);
        if (raw){
          const save = JSON.parse(raw);
          if (save.version !== 1 || !valid(save.data)) throw new Error('invalid save');
          const data = save.data;
          // Only known fields enter the live store; panels and held keys never resume.
          for (const k of Object.keys(store.farm)) store.farm[k] = clone(data.farm[k]);
          for (const k of Object.keys(store.plots)) delete store.plots[k];
          Object.assign(store.plots,data.plots);
          Object.assign(store.player,{tx:data.player.c,ty:data.player.r,px:data.player.c*config.TILE,py:data.player.r*config.TILE,
            dir:data.player.dir,moving:false,step:0,stepT:0});
          store.scene=data.scene; store.animals=data.animals; store.eggs=data.eggs;
          store.eggTimer=data.eggTimer; store.soundOn=data.soundOn;
          lastSaved=JSON.stringify(snapshot()); status='已儲存'; restored=true;
        }
      } catch (_) { status='無法讀取存檔'; }
      ready=true;
      return restored;
    }

    function save(){
      // A night transition always saves its completed morning, never half a day.
      if (!ready || store.sleeping) return false;
      try {
        if (!window.localStorage) throw new Error('storage unavailable');
        const data=JSON.stringify(snapshot());
        if (data !== lastSaved){
          window.localStorage.setItem(key,JSON.stringify({version:1,savedAt:new Date().toISOString(),data:JSON.parse(data)}));
          lastSaved=data;
        }
        status='已儲存'; return true;
      } catch (_) { status='無法存檔'; return false; }
    }

    function update(dt){
      elapsed += dt;
      if (elapsed >= 1){ elapsed=0; save(); }
    }
    function bind(){
      window.addEventListener('pagehide',save);
      window.addEventListener('beforeunload',save);
      document.addEventListener?.('visibilitychange',function(){ if (document.visibilityState === 'hidden') save(); });
    }

    return { load, save, update, bind, get status(){ return status; } };
  };
})(window.PixelFarm);
