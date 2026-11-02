/** Quests finished to reach each Island Level. The list's first entry is level 1. */
export const LEVEL_STEPS: readonly number[] = [0, 3, 6, 9, 12, 15, 18, 21, 25, 30];
export const TOP_LEVEL = LEVEL_STEPS.length;

export const BRIDGE_LEVEL = 4;
export const BOAT_LEVEL = 7;

/** Island Level at which each extra row of garden beds opens. */
export const PLOTS_BY_LEVEL: readonly { level: number; plots: number }[] = [
  { level: 1, plots: 6 },
  { level: 3, plots: 8 },
  { level: 5, plots: 10 },
  { level: 7, plots: 12 },
];
