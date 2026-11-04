(function (PixelFarm) {
  "use strict";

  PixelFarm.createSurface = function ({ config, window, document }) {
    const view = { width:240, height:160, worldHeight:144, scaleX:3, scaleY:3, camera:{ x:0, y:0 } };
    const el = id => document.getElementById(id);
    var sc = document.createElement('canvas'); sc.width = view.width; sc.height = view.height;
    var ctx = sc.getContext('2d'); ctx.imageSmoothingEnabled = false;
    var disp = document.getElementById('game');
    var dctx = disp.getContext('2d'); dctx.imageSmoothingEnabled = false;
    if (document.fonts && document.fonts.load){ document.fonts.load('24px "DotGothic16"'); document.fonts.load('27px "DotGothic16"'); }
    var textQueue = [];
    function drawFit(img, cx, cy, h, flip){
      if (!img || !img.complete || !img.naturalWidth) return;
      var w = h * img.naturalWidth / img.naturalHeight;
      ctx.save();
      if (flip){ ctx.translate(cx, 0); ctx.scale(-1, 1); cx = 0; }
      ctx.drawImage(img, cx - w/2, cy - h, w, h);
      ctx.restore();
    }

    function drawTile(img, c, r){
      if (!img || !img.complete || !img.naturalWidth) return;
      ctx.drawImage(img, c*config.TILE - 1, r*config.TILE - 1, config.TILE + 2, config.TILE + 2);
    }

    function drawTileFlat(img, c, r){
      if (!img || !img.complete || !img.naturalWidth) return;
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var ix = Math.round(iw * 0.09), iy = Math.round(ih * 0.09);
      ctx.drawImage(img, ix, iy, iw - ix * 2, ih - iy * 2, c*config.TILE - 1, r*config.TILE - 1, config.TILE + 2, config.TILE + 2);
    }

    function px(x, y, w, h, color){ ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

    function txt(s, x, y, color, align){
      var m = /(\d+(?:\.\d+)?)px/.exec(ctx.font || '');
      var tr = ctx.getTransform ? ctx.getTransform() : null;
      var dx = tr ? x * tr.a + tr.e : x;
      var dy = tr ? y * tr.d + tr.f : y;
      textQueue.push({ s: String(s), x: dx, y: dy, color: color, align: align || 'left',
        size: m ? parseFloat(m[1]) : 9, bold: /bold/.test(ctx.font || '') });
    }

    function flushText(){
      for (var i = 0; i < textQueue.length; i++){
        var t = textQueue[i];
        dctx.font = (t.bold ? 'bold ' : '') + (t.size * view.scaleY) + 'px "DotGothic16","PingFang TC","Microsoft JhengHei",sans-serif';
        dctx.fillStyle = t.color; dctx.textAlign = t.align;
        dctx.fillText(t.s, t.x * view.scaleX, t.y * view.scaleY);
      }
      textQueue.length = 0;
    }

    function fitScreen(){
      var stage = el('stage'), scr = el('screen');
      var aw = stage.clientWidth, ah = stage.clientHeight;
      if (!aw || !ah || !scr) return;
      scr.style.width = aw + 'px';
      scr.style.height = ah + 'px';
      var aspect = aw / ah;
      if (aspect >= 1){
        view.height = 160; view.width = Math.round(view.height * aspect);
        if (view.width > 336){ view.width = 336; view.height = Math.round(view.width / aspect); }
      } else {
        view.width = 176; view.height = Math.round(view.width / aspect);
        if (view.height > 400){ view.height = 400; view.width = Math.round(view.height * aspect); }
      }
      view.worldHeight = view.height - 16;
      if (sc.width !== view.width) sc.width = view.width;
      if (sc.height !== view.height) sc.height = view.height;
      ctx.imageSmoothingEnabled = false;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      disp.width = Math.round(aw * dpr);
      disp.height = Math.round(ah * dpr);
      dctx.imageSmoothingEnabled = false;
      view.scaleX = disp.width / view.width; view.scaleY = disp.height / view.height;
    }

    return { drawFit, drawTile, drawTileFlat, px, txt, flushText, fitScreen, view, ctx, dctx, sceneCanvas: sc, canvas: disp, textQueue };
  };
})(window.PixelFarm);
