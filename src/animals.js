(function (PixelFarm) {
  "use strict";

  PixelFarm.createAnimals = function ({ config, store, world }) {
    let passage = null;
    const yielding = new WeakMap();
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
      if (a.zone === 'pen' && (c <= config.PEN.c0 || c >= config.PEN.c1 || r <= config.PEN.r0 || r >= config.PEN.r1)) return false;
      if (a.zone === 'farm' && world.isPlot(c, r)) return false;
      return !world.isSolid(c, r);
    }
    function positionOK(a, x, y, allowEscape){
      var radius = world.animalRadius(a);
      var width = world.animalWidth(a);
      if (a.zone !== 'pond' && world.overlapsPlayer(x,y,radius,width)){
        if (!allowEscape || world.playerClearance(x,y,radius,width) <= world.playerClearance(a.x,a.y,radius,width)) return false;
      }
      if (store.animals.some(function(other){
        if (other === a || other.zone === 'pond' || a.zone === 'pond' || !world.animalsOverlap(a,x,y,other)) return false;
        var rx=world.animalWidth(a)+world.animalWidth(other)+1, ry=radius+world.animalRadius(other)+1;
        return !allowEscape || Math.hypot((x-other.x)/rx,(y-other.y)/ry) <= Math.hypot((a.x-other.x)/rx,(a.y-other.y)/ry);
      })) return false;
      for (var r = Math.floor((y - radius) / config.TILE); r <= Math.floor((y + radius) / config.TILE); r++){
        for (var c = Math.floor((x - width) / config.TILE); c <= Math.floor((x + width) / config.TILE); c++){
          var nearX = Math.max(c * config.TILE, Math.min(x, (c + 1) * config.TILE));
          var nearY = Math.max(r * config.TILE, Math.min(y, (r + 1) * config.TILE));
          if (Math.hypot((x-nearX)/width,(y-nearY)/radius) < 1 && !tileOK(a, c, r)) return false;
        }
      }
      return true;
    }
    function clearRoute(a, x, y){
      var steps = Math.ceil(Math.hypot(x - a.x, y - a.y) / 3);
      for (var i = 1; i <= steps; i++){
        if (!positionOK(a, a.x + (x - a.x) * i / steps, a.y + (y - a.y) * i / steps, true)) return false;
      }
      return true;
    }
    function onPassage(a, x, y){
      return passage && world.animalIntersectsSegment(a,x,y,passage.x0,passage.y0,passage.x1,passage.y1,5);
    }
    function travelLane(x, y){
      var c = Math.floor(x / config.TILE), r = Math.floor(y / config.TILE);
      return world.isPath(c,r) || (r === config.PEN.gate.r && c <= config.PEN.c0 + 2 && c > config.PEN.c0);
    }
    function makeRoom(a){
      if (!passage || a.zone === 'pond' || !onPassage(a,a.x,a.y)) return;
      if (yielding.get(a) === passage && !onPassage(a,a.tx,a.ty) && clearRoute(a,a.tx,a.ty)) return;
      var dx = passage.x1 - passage.x0, dy = passage.y1 - passage.y0;
      var length = Math.hypot(dx,dy) || 1;
      dx /= length; dy /= length;
      var directions = [[-dy,dx],[dy,-dx],[dx,dy],[-dx,-dy],[-dy+dx,dx+dy],[dy+dx,-dx+dy],[-dy-dx,dx-dy],[dy-dx,-dx-dy]];
      var best = null, score = Infinity;
      [12,16,20,28].forEach(function(distance){
        directions.forEach(function(v){
          var scale = distance / Math.hypot(v[0],v[1]);
          var x = a.x + v[0] * scale, y = a.y + v[1] * scale;
          if (onPassage(a,x,y) || !clearRoute(a,x,y)) return;
          if (store.animals.some(function(other){ return other !== a && other.zone !== 'pond' && Math.hypot(x-other.x,y-other.y) < world.animalRadius(a) + world.animalRadius(other) + 1; })) return;
          var cost = distance + (travelLane(x,y) ? 20 : 0);
          if (cost < score){ best={x:x,y:y}; score=cost; }
        });
      });
      if (best){ a.tx=best.x; a.ty=best.y; a.wait=0; yielding.set(a,passage); }
    }
    function yieldForPlayer(c, r){
      if (store.scene !== 'farm') return;
      if (!passage || passage.c !== c || passage.r !== r){
        passage={c:c,r:r,x0:store.player.px+8,y0:store.player.py+8,x1:c*config.TILE+8,y1:r*config.TILE+8,remaining:1.2};
      }
      passage.remaining=1.2;
      store.animals.forEach(makeRoom);
    }
    function pickTarget(a){
      for (var t = 0; t < 10; t++){
        var c, r;
        if (a.zone === 'pen'){ c = config.PEN.c0 + 1 + Math.random() * (config.PEN.c1 - config.PEN.c0 - 1); r = config.PEN.r0 + 1 + Math.random() * (config.PEN.r1 - config.PEN.r0 - 1); }
        else if (a.zone === 'pond'){ c = 14.3 + Math.random() * 4.4; r = 11.3 + Math.random() * 2.4; }
        else { c = Math.max(0.5,Math.min(config.COLS - 0.5,a.x / config.TILE + (Math.random() - 0.5) * 5)); r = Math.max(2.4,Math.min(config.ROWS - 0.5,a.y / config.TILE + (Math.random() - 0.5) * 5)); }
        var x = c * config.TILE, y = r * config.TILE;
        if (positionOK(a, x, y) && !travelLane(x,y) && clearRoute(a,x,y)) return { x:x, y:y };
      }
      return { x:a.x, y:a.y };
    }
    function updateAnimals(dt){
      if (passage){ passage.remaining -= dt; if (passage.remaining <= 0) passage=null; }
      store.eggTimer += dt * 1000;
      if (store.eggTimer > 16000){ store.eggTimer = 0; if (Math.random() < 0.75) layEgg(); }
      store.animals.forEach(function(a){
        makeRoom(a);
        a.frameT += dt * 1000;
        var dx = a.tx - a.x, dy = a.ty - a.y, dist = Math.hypot(dx, dy);
        var makingRoom = passage && yielding.get(a) === passage;
        if (dist < (makingRoom ? 0.5 : 3)){
          a.wait = travelLane(a.x,a.y) ? 0 : a.wait - dt * 1000;
          if (a.wait <= 0){
            var t = pickTarget(a); a.tx = t.x; a.ty = t.y;
            a.wait = 600 + Math.random() * 2200;
          }
        } else {
          var sp = Math.min(dist, (makingRoom ? 38 : a.kind === 'cow' ? 10 : a.kind === 'duck' ? 12 : 16) * dt);
          var vx = dx / dist * sp, vy = dy / dist * sp;
          if (Math.abs(vx) > 0.2) a.dir = vx < 0 ? -1 : 1;
          var ox = a.x, oy = a.y;
          if (positionOK(a,ox+vx,oy+vy,true)){ a.x=ox+vx; a.y=oy+vy; }
          else { a.tx=ox; a.ty=oy; a.wait=300; }
          if (a.frameT > 380){ a.frameT = 0; a.frame = 1 - a.frame; }
        }
      });
    }
    function reconcilePositions(){
      // Older saves may contain stacked animals or positions too close to fences.
      store.animals.forEach(function(a){
        if (positionOK(a,a.x,a.y)) return;
        var candidates=[];
        for (var y=4; y<config.ROWS*config.TILE; y+=4)
          for (var x=4; x<config.COLS*config.TILE; x+=4)
            candidates.push({x:x,y:y,d:Math.hypot(x-a.x,y-a.y)});
        candidates.sort(function(m,n){ return m.d-n.d; });
        var safe=candidates.find(function(p){ return positionOK(a,p.x,p.y); });
        if (safe){ a.x=a.tx=safe.x; a.y=a.ty=safe.y; }
      });
    }
    function layEgg(){
      if (store.eggs.length >= 4) return;
      var c = config.PEN.c0 + 1 + Math.floor(Math.random() * (config.PEN.c1 - config.PEN.c0 - 1));
      var r = config.PEN.r0 + 1 + Math.floor(Math.random() * (config.PEN.r1 - config.PEN.r0 - 1));
      for (var i = 0; i < store.eggs.length; i++) if (store.eggs[i].c === c && store.eggs[i].r === r) return;
      store.eggs.push({ c:c, r:r });
    }


    return { updateAnimals, layEgg, yieldForPlayer, reconcilePositions };
  };
})(window.PixelFarm);
