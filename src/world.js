(function (PixelFarm) {
  "use strict";

  PixelFarm.createWorld = function ({ config, store }) {
    function isPlot(c, r){ return c >= config.PLOT_C0 && c <= config.PLOT_C1 && r >= config.PLOT_R0 && r <= config.PLOT_R1; }
    /* 池塘 cols 14-18 rows 11-13 */
    function isPond(c, r){ return c >= 14 && c <= 18 && r >= 11 && r <= 13; }
    /* 圍欄 cols 13-18 rows 3-7，門在 (13,5) */
    function isFence(c, r){
      if (c === config.PEN.gate.c && r === config.PEN.gate.r) return false;
      var onX = (r === config.PEN.r0 || r === config.PEN.r1) && c >= config.PEN.c0 && c <= config.PEN.c1;
      var onY = (c === config.PEN.c0 || c === config.PEN.c1) && r >= config.PEN.r0 && r <= config.PEN.r1;
      return onX || onY;
    }
    /* 小屋 cols 2-5 rows 1-3（門口在 (3,4)） */
    function isHouse(c, r){ return c >= config.HOUSE.c0 && c <= config.HOUSE.c1 && r >= config.HOUSE.r0 && r <= config.HOUSE.r1; }
    /* 商店 cols 10-13 rows 0-2（門口在 (11,3)，走進去是室內場景） */
    function isShop(c, r){ return c >= config.SHOP.c0 && c <= config.SHOP.c1 && r >= config.SHOP.r0 && r <= config.SHOP.r1; }
    /* 市集攤位 row 11（兩攤）與行情招牌 (8,11) */
    function isStall(c, r){ return config.STALLS.some(function(s){ return s.c === c && s.r === r; }); }
    function isTree(c, r){ return config.TREES.some(function(t){ return t.c === c && t.r === r; }); }
    function isPath(c, r){
      if (r === 5 && c >= 1 && c <= 12) return true;   /* 橫向石板路 */
      if (c === 10 && r >= 5 && r <= 10) return true;  /* 縱向石板路 */
      if (c === 3 && r === 4) return true;             /* 門前 */
      if (c === 11 && r >= 3 && r <= 4) return true;   /* 商店門前小路 */
      return false;
    }
    function isSand(c, r){
      if (r === 4 && c >= 1 && c <= 7) return true;    /* 小屋前 */
      if (r === 10 && c >= 13 && c <= 18) return true; /* 池塘邊沙地 */
      if (r === 12 && c >= 1 && c <= 8) return true;   /* 市集廣場 */
      return false;
    }
    function isSolid(c, r){
      if (c < 0 || r < 0 || c >= config.COLS || r >= config.ROWS) return true;
      return isPond(c, r) || isFence(c, r) || isHouse(c, r) || isShop(c, r) || isStall(c, r) || isTree(c, r) ||
             (c === config.SIGN.c && r === config.SIGN.r) ||
             (c === config.SCARECROW.c && r === config.SCARECROW.r) ||
             (c === config.WELL.c && r === config.WELL.r);
    }
    function isSolidShop(c, r){
      if (c < 0 || r < 0 || c >= 15 || r >= 9) return true;
      if (r <= 2) return true;                                /* 牆、貨架（圖高 40 垂到 row 3 上緣）與櫃台後方：不讓人走到櫃台後面像站在桌上 */
      if (c === 0 || c === 14) return true;                   /* 左右牆 */
      if (r === 8) return c !== 7;                            /* 底牆，門在正中間 */
      if (r === 3 && c >= 4 && c <= 10) return true;          /* 櫃台本體 */
      if (r >= 5 && r <= 7 && c >= 2 && c <= 3) return true;  /* 種子袋堆（圖寬約 29、高 24，垂到 row 7） */
      if (r >= 6 && r <= 7 && c === 1) return true;           /* 盆栽（圖寬約 18、高 20） */
      if (r === 5 && c >= 12) return true;                    /* 木箱堆上排（圖寬約 46、高 34，從 row 5 垂到 row 7） */
      if (r >= 6 && r <= 7 && c >= 11) return true;           /* 木箱堆下排 */
      return false;
    }
    function solidAt(c, r){ return store.scene === 'shop' ? isSolidShop(c, r) : isSolid(c, r); }
    function hash2(c, r){ var x = Math.sin(c * 127.1 + r * 311.7) * 43758.5453; return x - Math.floor(x); }

    return { isPlot, isPond, isFence, isHouse, isShop, isStall, isTree, isPath, isSand, isSolid, isSolidShop, solidAt, hash2 };
  };
})(window.PixelFarm);
