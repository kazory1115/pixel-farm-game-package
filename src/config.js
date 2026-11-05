(function (PixelFarm) {
  "use strict";

  var CROPS = {
    wheat:   { name:'小麥',   seed:10, sell:26,  days:2, color:'#d9a92c' },
    carrot:  { name:'胡蘿蔔', seed:15, sell:42,  days:3, color:'#e07b2a' },
    cabbage: { name:'高麗菜', seed:20, sell:58,  days:3, color:'#6fae4e' },
    tomato:  { name:'番茄',   seed:30, sell:88,  days:4, color:'#d93a2b' },
    pumpkin: { name:'南瓜',   seed:45, sell:150, days:5, color:'#e07b2a' }
  };
  var CROP_IDS = ['wheat','carrot','cabbage','tomato','pumpkin'];
  var EGG_SELL = 16;
  var FERTILIZER_PRICE = 25, SPRINKLER_PRICE = 180;
  var PRICE_KEYS = CROP_IDS.concat(['egg']);
  var PLOT_C0 = 1, PLOT_C1 = 7, PLOT_R0 = 7, PLOT_R1 = 10;
  var PEN = { c0:13, c1:18, r0:3, r1:7, gate:{ c:13, r:5 } };
  var HOUSE = { c0:2, c1:5, r0:1, r1:3 };
  var DOOR = { c:3, r:4 };
  var SHOP = { c0:10, c1:13, r0:0, r1:2 };
  var SHOP_DOOR = { c:11, r:3 };
  var STALLS = [ {c:2, r:11}, {c:3, r:11}, {c:5, r:11}, {c:6, r:11} ];
  var SIGN = { c:8, r:11 };
  var SCARECROW = { c:8, r:8 };
  var WELL = { c:12, r:9 };
  var SUNFLOWERS = [ {c:9, r:3}, {c:12, r:6}, {c:1, r:12}, {c:12, r:12} ];
  var TREES = [ {c:19, r:1}, {c:0, r:13}, {c:19, r:10}, {c:10, r:12}, {c:22,r:12}, {c:25,r:11}, {c:21,r:15}, {c:24,r:15}, {c:26,r:2} ];
  var TILE = 16, COLS = 28, ROWS = 18;
  var FARM_EXIT = { c:27, r:5 };
  var TOWN = { cols:24, rows:16, exit:{c:0,r:8}, board:{c:10,r:10},
    stalls:[{c:6,r:5},{c:7,r:5},{c:12,r:5},{c:13,r:5},{c:17,r:5},{c:18,r:5}] };
  var NPCS = [
    {id:'gardener',name:'阿禾',scene:'farm',c:21,r:7,sprite:'farmer_down_1',role:'園丁',
      crop:'wheat',count:2,reward:45,seed:'cabbage',greeting:'新開的東邊步道通往河畔市集！我正在整理花圃，需要 2 份小麥作種。'},
    {id:'cook',name:'阿梅',scene:'market',c:8,r:8,sprite:'shopkeeper_wave',role:'料理人',
      crop:'carrot',count:2,reward:65,seed:'tomato',greeting:'今天想煮一鍋蔬菜湯，可以幫我帶 2 根胡蘿蔔嗎？'},
    {id:'ranger',name:'林叔',scene:'market',c:15,r:10,sprite:'farmer_left_1',role:'巡林員',
      crop:'egg',count:2,reward:50,seed:'pumpkin',greeting:'巡林前需要補充體力，帶 2 顆雞蛋來，我拿南瓜種子跟你交換。'},
    {id:'host',name:'小滿',scene:'market',c:17,r:8,sprite:'shopkeeper',role:'市集嚮導',
      greeting:'河畔市集每天 08:00–18:00 營業。看看告示板，也可以到河邊找找每天漂來的小禮物！'}
  ];
  var SPEED = 54; /* px/s，約 0.3 秒走一格 */
  var DIRS = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
  var ANIMAL_SIZE = { chicken:15, cow:26, cat:15, dog:16, duck:17 };
  var MENU_TABS = ['道具', '背包', '目標', '說明', '其他', '地圖'];
  var TOOL_CYCLE = [ { tool:'hoe' }, { tool:'can' }, { tool:'basket' } ]
    .concat(CROP_IDS.map(function(id){ return { tool:'seed', crop:id }; }))
    .concat([ { tool:'fertilizer' } ]);

  PixelFarm.config = Object.freeze({ TILE, COLS, ROWS, FARM_EXIT, TOWN, NPCS, CROPS, CROP_IDS, EGG_SELL, FERTILIZER_PRICE, SPRINKLER_PRICE, PRICE_KEYS, PLOT_C0, PLOT_C1, PLOT_R0, PLOT_R1, PEN, HOUSE, DOOR, SHOP, SHOP_DOOR, STALLS, SIGN, SCARECROW, WELL, SUNFLOWERS, TREES, SPEED, DIRS, ANIMAL_SIZE, TOOL_CYCLE, MENU_TABS });
})(window.PixelFarm);
