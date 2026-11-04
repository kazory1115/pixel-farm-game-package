(function (PixelFarm) {
  "use strict";

  PixelFarm.assetSources = {
  "tile_grass": "assets/game/tile_grass.png",
  "tile_grass2": "assets/game/tile_grass2.png",
  "tile_dirt": "assets/game/tile_dirt.png",
  "tile_soil": "assets/game/tile_soil.png",
  "tile_water": "assets/game/tile_water.png",
  "tile_stone": "assets/game/tile_stone.png",
  "tile_flower": "assets/game/tile_flower.png",
  "tile_sand": "assets/game/tile_sand.png",
  "tile_fence": "assets/game/tile_fence.png",
  "item_wheat": "assets/game/item_wheat.png",
  "item_cabbage": "assets/game/item_cabbage.png",
  "item_carrot": "assets/game/item_carrot.png",
  "item_tomato": "assets/game/item_tomato.png",
  "item_pumpkin": "assets/game/item_pumpkin.png",
  "item_egg": "assets/game/item_egg.png",
  "item_seeds": "assets/game/item_seeds.png",
  "item_hoe": "assets/game/item_hoe.png",
  "item_can": "assets/game/item_can.png",
  "item_crate": "assets/game/item_crate.png",
  "item_basket": "assets/game/item_basket.png",
  "animal_chicken_0": "assets/game/animal_chicken_0.png",
  "animal_chicken_1": "assets/game/animal_chicken_1.png",
  "animal_cow_0": "assets/game/animal_cow_0.png",
  "animal_cow_1": "assets/game/animal_cow_1.png",
  "animal_cat_0": "assets/game/animal_cat_0.png",
  "animal_cat_1": "assets/game/animal_cat_1.png",
  "animal_dog_0": "assets/game/animal_dog_0.png",
  "animal_dog_1": "assets/game/animal_dog_1.png",
  "deco_duck": "assets/game/deco_duck.png",
  "deco_scarecrow": "assets/game/deco_scarecrow.png",
  "deco_well": "assets/game/deco_well.png",
  "deco_sunflower": "assets/game/deco_sunflower.png",
  "farmer_down_0": "assets/game/farmer_down_0.png",
  "farmer_down_1": "assets/game/farmer_down_1.png",
  "farmer_down_2": "assets/game/farmer_down_2.png",
  "farmer_left_0": "assets/game/farmer_left_0.png",
  "farmer_left_1": "assets/game/farmer_left_1.png",
  "farmer_left_2": "assets/game/farmer_left_2.png",
  "farmer_right_0": "assets/game/farmer_right_0.png",
  "farmer_right_1": "assets/game/farmer_right_1.png",
  "farmer_right_2": "assets/game/farmer_right_2.png",
  "farmer_up_0": "assets/game/farmer_up_0.png",
  "farmer_up_1": "assets/game/farmer_up_1.png",
  "farmer_up_2": "assets/game/farmer_up_2.png",
  "shop_house": "assets/game/shop_house.png",
  "shopkeeper": "assets/game/shopkeeper.png",
  "shopkeeper_wave": "assets/game/shopkeeper_wave.png",
  "shop_shelf": "assets/game/shop_shelf.png",
  "shop_register": "assets/game/shop_register.png",
  "shop_plant": "assets/game/shop_plant.png",
  "shop_counter": "assets/game/shop_counter.png",
  "shop_crates": "assets/game/shop_crates.png",
  "shop_sacks": "assets/game/shop_sacks.png",
  "player_house": "assets/game/player_house.png"
};

  PixelFarm.createAssets = function (ImageType) {
    const images = {};
    Object.keys(PixelFarm.assetSources).forEach(function (name) {
      const image = new ImageType();
      image.src = PixelFarm.assetSources[name];
      images[name] = image;
    });
    return images;
  };
})(window.PixelFarm);
