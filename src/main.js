(function (PixelFarm) {
  "use strict";

  // Composition root: services receive explicit dependencies; nothing starts here.
  PixelFarm.createGame = function ({ window, document }) {
    const config = PixelFarm.config;
    const store = PixelFarm.createStore(config);
    const images = PixelFarm.createAssets(window.Image);
    const world = PixelFarm.createWorld({ config, store });
    const audio = PixelFarm.createAudio({ store, window });
    const surface = PixelFarm.createSurface({ config, window, document });
    const dialogue = PixelFarm.createDialogue({ store, audio, view: surface.view });
    const goals = PixelFarm.createGoals({ store, audio, dialogue });
    const tools = PixelFarm.createTools({ config, store, audio });
    const animals = PixelFarm.createAnimals({ config, store, world });
    const commerce = PixelFarm.createCommerce({ config, store, world, audio, dialogue, goals });
    const player = PixelFarm.createPlayer({ config, store, world, commerce, audio, dialogue, goals });
    const day = PixelFarm.createDayCycle({ config, store, animals, audio, dialogue, goals, document, setTimeout: window.setTimeout.bind(window) });
    const farming = PixelFarm.createFarming({ config, store, world, commerce, day, audio, dialogue, goals });
    const menu = PixelFarm.createMenu({ config, store, tools, day, audio, goals });
    const worldView = PixelFarm.createWorldView({ config, store, world, surface, images });
    const panels = PixelFarm.createPanels({ config, store, surface, images, tools, menu, commerce, dialogue });
    const renderer = PixelFarm.createRenderer({ config, store, world, player, surface, worldView, panels, images });
    const input = PixelFarm.createInput({ config, store, surface, panels, player, farming, tools, menu, commerce, dialogue, audio, window, document });
    let started = false;
    let lastTime;

    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      input.update(dt);
      if (!store.sleeping) {
        if (store.menu.open || store.shop.open || store.market.open) { /* 世界暫停 */ }
        else if (store.dialogue.active) dialogue.updateDialog(dt);
        else {
          player.updatePlayer(dt);
          if (store.scene === 'farm') animals.updateAnimals(dt);
        }
      }
      renderer.draw();
      window.requestAnimationFrame(loop);
    }

    function start() {
      if (started) return;
      started = true;
      lastTime = window.performance.now();
      input.bind();
      window.addEventListener('resize', surface.fitScreen);
      window.addEventListener('orientationchange', surface.fitScreen);
      if (window.visualViewport) window.visualViewport.addEventListener('resize', surface.fitScreen);
      surface.fitScreen();
      dialogue.say('歡迎來到像素農場！北邊有商店、南邊有市集，按 START 看說明');
      window.requestAnimationFrame(loop);
    }

    return { start, store, world, audio, dialogue, goals, tools, animals, commerce, player, day, farming, menu, surface, panels, renderer, input };
  };
})(window.PixelFarm);
