(function (PixelFarm) {
  "use strict";

  // Composition root: services receive explicit dependencies; nothing starts here.
  PixelFarm.createGame = function ({ window, document }) {
    const config = PixelFarm.config;
    const store = PixelFarm.createStore(config);
    const assets = PixelFarm.createAssets({ ImageType:window.Image, setTimeout:window.setTimeout.bind(window), clearTimeout:window.clearTimeout.bind(window) });
    const images = assets.images;
    const world = PixelFarm.createWorld({ config, store });
    const clock = PixelFarm.createClock({store});
    const audio = PixelFarm.createAudio({ store, window });
    const surface = PixelFarm.createSurface({ config, window, document });
    const dialogue = PixelFarm.createDialogue({ store, audio, view: surface.view, measureText:surface.measureText });
    const goals = PixelFarm.createGoals({ config, store, audio, dialogue });
    const tools = PixelFarm.createTools({ config, store, audio });
    const animals = PixelFarm.createAnimals({ config, store, world });
    const persistence = PixelFarm.createPersistence({ config, store, world, window, document });
    const commerce = PixelFarm.createCommerce({ config, store, world, clock, audio, dialogue, goals });
    const regions = PixelFarm.createRegions({config,store,clock,commerce,dialogue,audio});
    const player = PixelFarm.createPlayer({ config, store, world, animals, commerce, regions, audio, dialogue, goals });
    const day = PixelFarm.createDayCycle({ config, store, clock, regions, animals, audio, dialogue, goals, persistence, document, setTimeout: window.setTimeout.bind(window) });
    const farming = PixelFarm.createFarming({ config, store, world, commerce, regions, day, audio, dialogue, goals });
    const menu = PixelFarm.createMenu({ config, store, tools, day, regions, clock, audio, goals, persistence, window, document });
    const worldView = PixelFarm.createWorldView({ config, store, world, surface, images, regions });
    const panels = PixelFarm.createPanels({ config, store, surface, images, tools, menu, commerce, dialogue, clock, regions, world });
    const renderer = PixelFarm.createRenderer({ config, store, world, clock, player, farming, surface, worldView, panels, images });
    const input = PixelFarm.createInput({ config, store, surface, panels, player, farming, tools, menu, commerce, dialogue, audio, window, document });
    const startup = PixelFarm.createStartup({ window, document });
    const welcomeText = '歡迎來到像素農場！北邊有商店、南邊有市集，按 START 看說明';
    const firstFrameText = welcomeText + '0123456789第天晴雨商店市集ABSELECTSTART換工具選單' + config.TOOL_CYCLE.map(tools.toolName).join('');
    let pendingStart;
    let fontFamily;
    let lastTime;

    function loop(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      input.update(dt);
      if (!store.sleeping) {
        if (store.menu.open || store.shop.open || store.market.open) { player.cancelPendingStep(); }
        else if (store.dialogue.active){ player.cancelPendingStep(); dialogue.updateDialog(dt); }
        else {
          if(document.visibilityState !== 'hidden') clock.update(dt);
          player.updatePlayer(dt);
          if (store.scene === 'farm') animals.updateAnimals(dt);
        }
      }
      renderer.draw();
      persistence.update(dt);
      if (startup.phase === 'loading') startup.ready(fontFamily);
      window.requestAnimationFrame(loop);
    }

    function start() {
      if (pendingStart) return pendingStart;
      pendingStart = Promise.all([
        assets.load(startup.progress),
        startup.loadFont(firstFrameText)
      ]).then(function (results) {
        fontFamily = results[1];
        surface.setFontFamily(fontFamily);
        input.bind();
        window.addEventListener('resize', surface.fitScreen);
        window.addEventListener('orientationchange', surface.fitScreen);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', surface.fitScreen);
        if(window.ResizeObserver) new window.ResizeObserver(surface.fitScreen).observe(document.getElementById('stage'));
        surface.fitScreen();
        const restored = persistence.load();
        animals.reconcilePositions();
        persistence.bind();
        if(restored) dialogue.notify('歡迎回來！已接續第 '+store.farm.day+' 天的農場進度');
        else dialogue.say(welcomeText);
        lastTime = window.performance.now();
        window.requestAnimationFrame(loop);
        return true;
      }).catch(function (error) {
        startup.fail(error);
        return false;
      });
      return pendingStart;
    }

    return { start, store, world, clock, regions, audio, dialogue, goals, tools, animals, commerce, player, day, farming, menu, surface, panels, renderer, input, startup, persistence };
  };
})(window.PixelFarm);
