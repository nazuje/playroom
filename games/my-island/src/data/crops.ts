export type CropId = 'carrot' | 'strawberry' | 'tomato' | 'corn' | 'pumpkin' | 'melon';

export interface Crop {
  id: CropId;
  emoji: string;
  /** The Island Level that opens this seed. */
  level: number;
  /** Seconds of play to ripen once watered. A plant nobody waters still grows, at half speed. */
  growSeconds: number;
  /** Colours of the ripe fruit and its leaves, for the toy model. */
  fruit: number;
  leaf: number;
}

export const CROPS: readonly Crop[] = [
  { id: 'carrot', emoji: '🥕', level: 1, growSeconds: 45, fruit: 0xff8a1f, leaf: 0x37b34a },
  { id: 'strawberry', emoji: '🍓', level: 1, growSeconds: 50, fruit: 0xf03a4d, leaf: 0x2fa84f },
  { id: 'tomato', emoji: '🍅', level: 2, growSeconds: 55, fruit: 0xe5372a, leaf: 0x3da546 },
  { id: 'corn', emoji: '🌽', level: 3, growSeconds: 60, fruit: 0xffd23c, leaf: 0x64bb3c },
  { id: 'pumpkin', emoji: '🎃', level: 5, growSeconds: 65, fruit: 0xff9d2e, leaf: 0x2f9e44 },
  { id: 'melon', emoji: '🍉', level: 8, growSeconds: 70, fruit: 0x2fb36b, leaf: 0x278a4c },
];

export const cropById = (id: CropId): Crop => {
  const found = CROPS.find((crop) => crop.id === id);
  if (!found) throw new Error(`Unknown crop ${id}`);
  return found;
};

export const isCrop = (id: string): id is CropId => CROPS.some((crop) => crop.id === id);
