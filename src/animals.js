(function (PixelFarm) {
  "use strict";

  PixelFarm.createAnimals = function ({ config, store, world }) {
    function mkAnimal(kind, x, y, zone){
      return { kind:kind, x:x, y:y, dir:1, frame:0, frameT: Math.random()*300,
               tx:x, ty:y, wait: 800 + Math.random()*1800, zone: zone };
    }
    store.animals = [
      mkAnimal('chicken', 14.6*config.TILE, 4.6*config.TILE, 'pen'),
      mkAnimal('chicken', 16.8*config.TILE, 5.4*config.TILE, 'pen'),
      mkAnimal('cow',     16.2*config.TILE, 4.4*config.TILE, 'pen'),
      mkAnimal('duck',    15.5*config.TILE, 12.0*config.TILE, 'pond'),
      mkAnimal('cat',      9.4*config.TILE, 3.4*config.TILE, 'farm'),
      mkAnimal('dog',      6.3*config.TILE, 6.3*config.TILE, 'farm')
    ];
    function tileOK(a, c, r){
      if (a.zone === 'pond') return world.isPond(c, r);
      return !world.isSolid(c, r);
    }
    function pickTarget(a){
      for (var t = 0; t < 10; t++){
        var c, r;
        if (a.zone === 'pen'){ c = config.PEN.c0 + 1 + Math.random() * (config.PEN.c1 - config.PEN.c0 - 1); r = config.PEN.r0 + 1 + Math.random() * (config.PEN.r1 - config.PEN.r0 - 1); }
        else if (a.zone === 'pond'){ c = 14.3 + Math.random() * 4.4; r = 11.3 + Math.random() * 2.4; }
        else { c = 0.5 + Math.random() * (config.COLS - 1); r = 2.4 + Math.random() * (config.ROWS - 2.9); }
        var x = c * config.TILE, y = r * config.TILE;
        if (tileOK(a, Math.floor(x / config.TILE), Math.floor(y / config.TILE))) return { x:x, y:y };
      }
      return { x:a.x, y:a.y };
    }
    function updateAnimals(dt){
      store.eggTimer += dt * 1000;
      if (store.eggTimer > 16000){ store.eggTimer = 0; if (Math.random() < 0.75) layEgg(); }
      store.animals.forEach(function(a){
        a.frameT += dt * 1000;
        var dx = a.tx - a.x, dy = a.ty - a.y, dist = Math.hypot(dx, dy);
        if (dist < 3){
          a.wait -= dt * 1000;
          if (a.wait <= 0){
            var t = pickTarget(a); a.tx = t.x; a.ty = t.y;
            a.wait = 600 + Math.random() * 2200;
          }
        } else {
          var sp = (a.kind === 'cow' ? 10 : a.kind === 'duck' ? 12 : 16) * dt;
          var vx = dx / dist * sp, vy = dy / dist * sp;
          if (Math.abs(vx) > 0.2) a.dir = vx < 0 ? -1 : 1;
          var ox = a.x, oy = a.y;
          a.x += vx; a.y += vy;
          if (!tileOK(a, Math.floor(a.x / config.TILE), Math.floor(a.y / config.TILE))){ a.x = ox; a.y = oy; a.tx = ox; a.ty = oy; a.wait = 300; }
          if (a.frameT > 380){ a.frameT = 0; a.frame = 1 - a.frame; }
        }
      });
    }
    function layEgg(){
      if (store.eggs.length >= 4) return;
      var c = config.PEN.c0 + 1 + Math.floor(Math.random() * (config.PEN.c1 - config.PEN.c0 - 1));
      var r = config.PEN.r0 + 1 + Math.floor(Math.random() * (config.PEN.r1 - config.PEN.r0 - 1));
      for (var i = 0; i < store.eggs.length; i++) if (store.eggs[i].c === c && store.eggs[i].r === r) return;
      store.eggs.push({ c:c, r:r });
    }


    return { updateAnimals, layEgg };
  };
})(window.PixelFarm);
