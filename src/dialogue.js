(function (PixelFarm) {
  "use strict";

  PixelFarm.createDialogue = function ({ store, audio, view }) {
    function say(text){
      store.dialogue.text = text;
      store.dialogue.shown = 0;
      store.dialogue.pageStart = 0;
      store.dialogue.t = 0;
      store.dialogue.active = true;
    }

    // Keep an absolute text offset so a resize never skips unread text.
    function currentPage(){
      const dlg = store.dialogue;
      const per = Math.max(8, Math.floor((view.width - 24) / 9));
      const characters = Array.from(dlg.text.slice(dlg.pageStart)).slice(0, per * 2);
      const end = dlg.pageStart + characters.join('').length;
      const visible = Array.from(dlg.text.slice(dlg.pageStart, Math.min(dlg.shown, end)).replace(/[\uD800-\uDBFF]$/, ''));
      return { per, end, lines:[visible.slice(0, per).join(''), visible.slice(per).join('')] };
    }

    function advance(){
      const dlg = store.dialogue;
      const page = currentPage();
      if (dlg.shown < page.end) dlg.shown = page.end;
      else if (page.end < dlg.text.length){
        dlg.pageStart = page.end;
        dlg.shown = page.end;
        dlg.t = 0;
      } else dlg.active = false;
    }

    function updateDialog(dt){
      const end = currentPage().end;
      if (store.dialogue.shown < end){
        store.dialogue.t += dt;
        while (store.dialogue.t > 0.02 && store.dialogue.shown < end){
          store.dialogue.t -= 0.02;
          store.dialogue.shown++;
          if (store.dialogue.shown % 3 === 0) audio.beep(1250, .015, 'square', .012);
        }
      }
    }

    return { say, updateDialog, currentPage, advance };
  };
})(window.PixelFarm);
