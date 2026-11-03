// The colours the 3D stage and the page share. Every layer of blocks has its own sweet colour, so a block's
// colour says how high it sits, and the map cards colour each column by its top block in the same way.

/** Bottom layer first: mint, sunflower, bubblegum, lilac, tangerine. */
export const LAYER_COLOURS: readonly number[] = [0x2ec4b6, 0xffc93c, 0xff6f91, 0x9d7bff, 0xff9a3c, 0x7ed957];

export const layerColour = (layer: number): number => LAYER_COLOURS[Math.max(0, layer) % LAYER_COLOURS.length];

export const cssColour = (hex: number): string => `#${hex.toString(16).padStart(6, '0')}`;

/** New blocks that fill the box are cream sugar cubes, so they stand apart from the ones already there. */
export const FILL_COLOUR = 0xfff1d0;

export const NIGHT = 0x26133d;
export const VELVET = 0xef476f;
export const VELVET_DARK = 0xa8284f;
export const GOLD = 0xffcf5a;
export const GOLD_DARK = 0xc98d1f;
export const BOARDS = 0x6e3b2f;
export const BOARDS_LIGHT = 0x83493a;
/** The peg at the front left corner, and the matching dot on every map card. */
export const PEG = 0xff4fa3;
