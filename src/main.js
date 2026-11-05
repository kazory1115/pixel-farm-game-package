(function (PixelFarm) {
  "use strict";

  // Composition root: services receive explicit dependencies; nothing starts here.
  PixelFarm.createGame = function ({ window, document }) {
    const config = PixelFarm.config;
    const store = PixelFarm.createStore(config);
    const assets = PixelFarm.createAssets({ ImageType:window.Image, setTimeout:window.setTimeout.bind(window), clearTimeout:window.clearTimeout.bind(window) });
    const images = assets.images;
    const world = PixelFarm.createWorld({ config, store });
    const audio = PixelFarm.createAudio({ store, window });
    const surface = PixelFarm.createSurface({ config, window, document });
    const dialogue = PixelFarm.createDialogue({ store, audio, view: surface.view });
    const goals = PixelFarm.createGoals({ store, audio, dialogue });
    const tools = PixelFarm.createTools({ config, store, audio });
    const animals = PixelFarm.createAnimals({ config, store, world });
    const persistence = PixelFarm.createPersistence({ config, store, world, window, document });
    const commerce = PixelFarm.createCommerce({ config, store, world, audio, dialogue, goals });
    const player = PixelFarm.createPlayer({ config, store, world, animals, commerce, audio, dialogue, goals });
    const day = PixelFarm.createDayCycle({ config, store, animals, audio, dialogue, goals, persistence, document, setTimeout: window.setTimeout.bind(window) });
    const farming = PixelFarm.createFarming({ config, store, world, commerce, day, audio, dialogue, goals });
    const menu = PixelFarm.createMenu({ config, store, tools, day, audio, goals, persistence, window, document });
    const worldView = PixelFarm.createWorldView({ config, store, world, surface, images });
    const panels = PixelFarm.createPanels({ config, store, surface, images, tools, menu, commerce, dialogue });
    const renderer = PixelFarm.createRenderer({ config, store, world, player, surface, worldView, panels, images });
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
        surface.fitScreen();
        const restored = persistence.load();
        persistence.bind();
        dialogue.say(restored ? '歡迎回來！已接續第 ' + store.farm.day + ' 天的農場進度' : welcomeText);
        lastTime = window.performance.now();
        window.requestAnimationFrame(loop);
        return true;
      }).catch(function (error) {
        startup.fail(error);
        return false;
      });
      return pendingStart;
    }

    return { start, store, world, audio, dialogue, goals, tools, animals, commerce, player, day, farming, menu, surface, panels, renderer, input, startup, persistence };
  };
})(window.PixelFarm);
