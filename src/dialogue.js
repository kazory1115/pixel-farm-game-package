(function (PixelFarm) {
  "use strict";

  PixelFarm.createDialogue = function ({ store, audio, view, measureText }) {
    function notify(text){
      store.notice={text:text,until:Date.now()+1600};
      // Keep the last feedback available to accessibility/debugging consumers.
      store.dialogue.text=text;
      store.dialogue.shown=0; store.dialogue.pageStart=0; store.dialogue.t=0; store.dialogue.active=false;
    }
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
      const width = Math.max(9, view.width - 34);
      const lines = ['', ''];
      let end = dlg.pageStart;
      const visible = [];
      for (let row = 0; row < 2; row++){
        const start = end;
        for (const character of Array.from(dlg.text.slice(start))){
          if (lines[row] && measureText(lines[row] + character, 9) > width) break;
          lines[row] += character;
          end += character.length;
        }
        visible.push(dlg.text.slice(start, Math.min(dlg.shown, end)).replace(/[\uD800-\uDBFF]$/, ''));
      }
      return { end, lines:visible };
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

    return { say, notify, updateDialog, currentPage, advance };
  };
})(window.PixelFarm);
