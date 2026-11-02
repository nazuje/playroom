import { CROPS, cropById, isCrop, type Crop, type CropId } from '../data/crops.ts';
import { islandLevel, plotsForLevel, recordEvent } from './quests.ts';
import type { Island, PlotState } from './state.ts';

/** A harvest gives this many, so one carrot plant is enough for a muffin and a spare. */
export const HARVEST_YIELD = 2;
/** A plant nobody waters still grows, only slower. Nothing ever wilts. */
export const DRY_SPEED = 0.5;

export type PlotStage = 'empty' | 'seed' | 'sprout' | 'leafy' | 'ripe';

export function plotStage(plot: PlotState): PlotStage {
  if (!plot.crop) return 'empty';
  if (plot.growth >= 1) return 'ripe';
  if (plot.growth < 0.2) return 'seed';
  return plot.growth < 0.6 ? 'sprout' : 'leafy';
}

export const cropsOpen = (level: number): Crop[] => CROPS.filter((crop) => crop.level <= level);
export const cropOpen = (island: Island, crop: CropId): boolean => cropById(crop).level <= islandLevel(island);

/** Adds the garden beds the current Island Level allows. Beds are never taken away. */
export function openPlots(island: Island): void {
  const wanted = plotsForLevel(islandLevel(island));
  while (island.plots.length < wanted) island.plots.push({ crop: null, growth: 0, watered: false });
}

export function growGarden(island: Island, seconds: number): void {
  for (const plot of island.plots) {
    if (!plot.crop || !isCrop(plot.crop) || plot.growth >= 1) continue;
    const speed = (plot.watered ? 1 : DRY_SPEED) / cropById(plot.crop).growSeconds;
    plot.growth = Math.min(1, plot.growth + speed * seconds);
  }
}

export function plant(island: Island, index: number, crop: CropId): boolean {
  const plot = island.plots[index];
  if (!plot || plot.crop || !cropOpen(island, crop)) return false;
  island.plots[index] = { crop, growth: 0, watered: false };
  recordEvent(island, { type: 'plant', crop });
  return true;
}

export function water(island: Island, index: number): boolean {
  const plot = island.plots[index];
  if (!plot || !plot.crop || plot.watered || plot.growth >= 1) return false;
  plot.watered = true;
  recordEvent(island, { type: 'water' });
  return true;
}

/** Rain waters every growing plant, as a gift. It doesn't count as the child's watering. */
export function rainOnGarden(island: Island): void {
  for (const plot of island.plots) if (plot.crop && plot.growth < 1) plot.watered = true;
}

export function harvest(island: Island, index: number): CropId | null {
  const plot = island.plots[index];
  if (!plot || !plot.crop || plot.growth < 1 || !isCrop(plot.crop)) return null;
  const crop = plot.crop;
  island.bag[crop] = (island.bag[crop] ?? 0) + HARVEST_YIELD;
  island.plots[index] = { crop: null, growth: 0, watered: false };
  recordEvent(island, { type: 'harvest', crop });
  return crop;
}
