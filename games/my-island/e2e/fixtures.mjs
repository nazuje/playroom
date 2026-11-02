// Saves for the bots, made with the game's own rules so they are always valid islands.
import { COLLECTION } from '../src/data/collection.ts';
import { FURNITURE, ROOM } from '../src/data/furniture.ts';
import { PETS } from '../src/data/pets.ts';
import { theWorld } from '../src/rules/island.ts';
import { buyItem, putNear, startPlay } from '../src/rules/play.ts';
import { SAVE_VERSION } from '../src/rules/save.ts';
import { MOST_PLOTS, SPAWN, newIsland } from '../src/rules/state.ts';

const file = (island) => ({ version: SAVE_VERSION, revision: 1, island });

function placeMany(play, room, ids, spots) {
  let placed = 0;
  for (const [x, z] of spots) {
    const id = ids[placed % ids.length];
    play.island.shells += 100;
    buyItem(play, id);
    if (putNear(play, room, id, x, z).uid !== null) placed += 1;
  }
  return placed;
}

/** Halfway up the ladder with a ripe plot, ingredients and shells, so every activity can be tried at once. */
export function midSave() {
  const island = newIsland(2, undefined, 5);
  island.quests = { done: 12, stage: 'offered', count: 0 };
  island.shells = 80;
  island.bag = { carrot: 3, strawberry: 4, corn: 3, tomato: 2, pumpkin: 1 };
  island.pets = [{ kind: 'kitten', hearts: 2, following: false }];
  island.plots = Array.from({ length: 10 }, (_, index) => ({ crop: index === 0 ? 'carrot' : null, growth: index === 0 ? 1 : 0, watered: index === 0 }));
  island.book = { 'shell-swirl': 1 };
  return file(island);
}

/** Every quest done, every pet, a full book, and as much furniture as fits indoors and out. */
export function heavySave() {
  const island = newIsland(5, undefined, 9);
  island.quests = { done: 30, stage: 'offered', count: 0 };
  island.shells = 999;
  island.pets = PETS.map((pet, index) => ({ kind: pet.id, hearts: 12, following: index < 3 }));
  // The last two plots stay empty, so there is always somewhere to plant.
  island.plots = Array.from({ length: MOST_PLOTS }, (_, index) =>
    index < MOST_PLOTS - 2 ? { crop: ['carrot', 'melon', 'pumpkin', 'corn'][index % 4], growth: (index % 5) / 4, watered: index % 2 === 0 } : { crop: null, growth: 0, watered: false },
  );
  island.book = Object.fromEntries(COLLECTION.map((entry) => [entry.id, 2]));
  island.bag = { carrot: 9, strawberry: 9, corn: 9, pumpkin: 9, melon: 9, tomato: 9, cake: 2, pie: 3, cookie: 4 };
  const play = startPlay(island, theWorld());
  const homeIds = FURNITURE.filter((item) => item.room === 'home').map((item) => item.id);
  const outdoorIds = FURNITURE.filter((item) => item.room === 'outdoor').map((item) => item.id);
  const indoor = [];
  for (let z = 0; z < ROOM.depth; z += 2) for (let x = 0; x < ROOM.width; x += 2) indoor.push([x, z]);
  const outdoor = [];
  for (let ring = 2; ring <= 14; ring += 3) {
    for (let step = 0; step < 12; step += 1) {
      const angle = (step / 12) * Math.PI * 2;
      outdoor.push([Math.round(SPAWN.x + Math.cos(angle) * ring), Math.round(SPAWN.z - 6 + Math.sin(angle) * ring)]);
    }
  }
  const home = placeMany(play, 'home', homeIds, indoor);
  const outside = placeMany(play, 'outdoor', outdoorIds, outdoor);
  island.shells = 999;
  return { save: file(island), home, outside };
}
