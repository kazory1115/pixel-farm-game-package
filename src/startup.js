(function (PixelFarm) {
  "use strict";

  PixelFarm.createStartup = function ({ window, document }) {
    const overlay = document.getElementById('startup');
    const message = document.getElementById('loadMessage');
    const progressBar = document.getElementById('loadProgress');
    const retry = document.getElementById('retryLoad');
    const systemFont = '"PingFang TC","Microsoft JhengHei",sans-serif';
    const pixelFont = '"DotGothic16",' + systemFont;
    let phase = 'loading';

    retry.addEventListener('click', function () { window.location.reload(); });

    function progress(completed, total) {
      if (phase !== 'loading') return;
      progressBar.max = total;
      progressBar.value = completed;
      message.textContent = completed === total ? '正在準備畫面…' : '正在載入素材（' + completed + '/' + total + '）';
    }

    function loadFont(text) {
      if (!document.fonts || !document.fonts.load) return Promise.resolve(systemFont);
      // Loading the optional font stylesheet dynamically keeps a slow Google
      // Fonts connection from blocking the HTML, game scripts and loading UI.
      return new Promise(function (resolve) {
        const link = document.createElement('link');
        let settled = false;
        const finish = function (family) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          link.onload = null;
          link.onerror = null;
          if (family === systemFont) link.remove();
          resolve(family);
        };
        const timer = window.setTimeout(function () { finish(systemFont); }, 2500);
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=DotGothic16&display=swap';
        link.onload = function () {
          // The second argument is required for the Chinese Unicode subsets;
          // the default space character only preloads the Latin font faces.
          Promise.resolve().then(function () {
            return document.fonts.load('24px "DotGothic16"', text);
          }).then(function (faces) {
            finish(faces.length ? pixelFont : systemFont);
          }, function () { finish(systemFont); });
        };
        link.onerror = function () { finish(systemFont); };
        document.head.appendChild(link);
      });
    }

    function ready(family) {
      phase = 'ready';
      // Also pin the DOM controls to the fallback when font loading timed out,
      // so a late response cannot change their appearance after play begins.
      document.querySelectorAll('.abtn, .pill, .nightfade span').forEach(function (element) {
        element.style.fontFamily = family;
      });
      overlay.hidden = true;
    }

    function fail(error) {
      phase = 'error';
      message.textContent = '載入失敗，請重新載入。' + (error.message || '');
      retry.hidden = false;
    }

    return { progress, loadFont, ready, fail, get phase() { return phase; } };
  };
})(window.PixelFarm);
