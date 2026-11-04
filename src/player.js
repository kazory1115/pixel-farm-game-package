(function (PixelFarm) {
  "use strict";

  PixelFarm.createPlayer = function ({ config, store, world, commerce, audio, dialogue, goals }) {
    function curDir(){
      if (store.input.keys['arrowup'] || store.input.keys['w'] || store.input.touchDir === 'up') return 'up';
      if (store.input.keys['arrowdown'] || store.input.keys['s'] || store.input.touchDir === 'down') return 'down';
      if (store.input.keys['arrowleft'] || store.input.keys['a'] || store.input.touchDir === 'left') return 'left';
      if (store.input.keys['arrowright'] || store.input.keys['d'] || store.input.touchDir === 'right') return 'right';
      return null;
    }

    function tryStep(d){
      var v = config.DIRS[d];
      store.player.dir = d;
      var nc = store.player.tx + v[0], nr = store.player.ty + v[1];
      if (world.solidAt(nc, nr)) return;
      store.player.tx = nc; store.player.ty = nr; store.player.moving = true;
    }

    function onArrive(){
      if (store.scene === 'shop'){
        if (store.player.tx === 7 && store.player.ty === 8) commerce.exitShop();
        return;
      }
      for (var i = store.eggs.length - 1; i >= 0; i--){
        if (store.eggs[i].c === store.player.tx && store.eggs[i].r === store.player.ty){
          store.eggs.splice(i, 1); store.farm.produce.egg++; store.farm.eggsCollected++;
          audio.sfx.egg(); dialogue.say('撿到一顆雞蛋！'); goals.checkGoals();
        }
      }
    }

    function updatePlayer(dt){
      var hd = curDir();
      if (hd && hd === store.input.holdDir) store.input.holdT += dt; else { store.input.holdDir = hd; store.input.holdT = 0; }
      if (store.player.moving){
        var txp = store.player.tx * config.TILE, typ = store.player.ty * config.TILE;
        var dx = txp - store.player.px, dy = typ - store.player.py;
        var dist = Math.abs(dx) + Math.abs(dy);
        var stepLen = config.SPEED * dt;
        if (stepLen >= dist){
          store.player.px = txp; store.player.py = typ; store.player.moving = false;
          onArrive();
          var d0 = curDir();
          if (d0 && store.input.holdT > 0.3) tryStep(d0);
        } else {
          store.player.px += Math.sign(dx) * stepLen;
          store.player.py += Math.sign(dy) * stepLen;
        }
        store.player.stepT += dt * 1000;
        if (store.player.stepT > 105){ store.player.stepT = 0; store.player.step = (store.player.step + 1) % 4; }
      } else {
        var d = curDir();
        if (d) tryStep(d);
      }
    }

    function facedTile(){
      var pc = Math.floor((store.player.px + 8) / config.TILE), pr = Math.floor((store.player.py + 8) / config.TILE);
      var d = config.DIRS[store.player.dir];
      return { c: pc + d[0], r: pr + d[1] };
    }

    return { updatePlayer, facedTile };
  };
})(window.PixelFarm);
