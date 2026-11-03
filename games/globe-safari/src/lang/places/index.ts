import { SL_AFRICA } from './africa.ts';
import { SL_ASIA } from './asia.ts';
import { SL_EUROPE } from './europe.ts';
import { SL_NORTH_AMERICA } from './north-america.ts';
import { SL_OCEANIA } from './oceania.ts';
import { SL_OCEANS } from './oceans.ts';
import type { TranslatedPlace } from './place.ts';
import { SL_POLAR } from './polar.ts';
import { SL_SOUTH_AMERICA } from './south-america.ts';

/** Every wild place in Slovenian, keyed by region id, in the same order as REGIONS. */
export const SL_PLACES: Record<string, TranslatedPlace> = {
  ...SL_POLAR,
  ...SL_NORTH_AMERICA,
  ...SL_SOUTH_AMERICA,
  ...SL_AFRICA,
  ...SL_EUROPE,
  ...SL_ASIA,
  ...SL_OCEANIA,
  ...SL_OCEANS,
};
