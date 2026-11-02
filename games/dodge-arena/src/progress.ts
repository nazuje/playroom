import { STAGES } from './stages.ts';

export const FAILS_BEFORE_SKIP = 5;

export interface Progress {
  /** Which order of stages the lists follow, so saves from before a reorder can be moved. */
  order: number;
  /** Best endless time, in seconds. */
  best: number;
  /** By stage, 0 means not finished. */
  stars: number[];
  /** Failed tries since the stage was last finished. */
  fails: number[];
  /** Stages passed with the skip button. */
  skipped: number[];
}

const STAGE_ORDER = 2;

/** Order 1 taught beams and rings at stages 3 and 4, before bars and slime. Old stage id to new. */
const ORDER_1_MOVES: Readonly<Record<number, number>> = { 3: 5, 4: 6, 5: 3, 6: 4 };

const zeros = (): number[] => STAGES.map(() => 0);

export const emptyProgress = (): Progress => ({ order: STAGE_ORDER, best: 0, stars: zeros(), fails: zeros(), skipped: [] });

const wholeList = (value: unknown): number[] =>
  STAGES.map((_, at) => {
    const item = Array.isArray(value) ? Number(value[at]) : 0;
    return Number.isFinite(item) && item > 0 ? Math.floor(item) : 0;
  });

/** Saved data can be old, hand-edited or broken, and must never stop the game. */
export function cleanProgress(saved: unknown): Progress {
  if (typeof saved !== 'object' || saved === null) return emptyProgress();
  const { order, best, stars, fails, skipped } = saved as Partial<Record<keyof Progress, unknown>>;
  const moved = order === STAGE_ORDER ? (id: number) => id : (id: number) => ORDER_1_MOVES[id] ?? id;
  const byStage = (list: number[]): number[] => {
    const result = zeros();
    list.forEach((count, at) => {
      result[moved(at + 1) - 1] = count;
    });
    return result;
  };
  return {
    order: STAGE_ORDER,
    best: typeof best === 'number' && Number.isFinite(best) && best > 0 ? best : 0,
    stars: byStage(wholeList(stars).map((count) => Math.min(count, 3))),
    fails: byStage(wholeList(fails)),
    skipped: Array.isArray(skipped)
      ? skipped.filter((id): id is number => typeof id === 'number' && STAGES.some((stage) => stage.id === id)).map(moved)
      : [],
  };
}

const passed = (progress: Progress, id: number): boolean => (progress.stars[id - 1] ?? 0) > 0 || progress.skipped.includes(id);

/** Stages open in order. */
export const isOpen = (progress: Progress, id: number): boolean => id === 1 || passed(progress, id - 1);

/** The stage to play next, or null when all are done. */
export function nextStage(progress: Progress): number | null {
  return STAGES.find(({ id }) => !passed(progress, id))?.id ?? null;
}

export const totalStars = (progress: Progress): number => progress.stars.reduce((sum, count) => sum + count, 0);

export const canSkip = (progress: Progress, id: number): boolean => (progress.fails[id - 1] ?? 0) >= FAILS_BEFORE_SKIP && !passed(progress, id);

/** Stars never go down, and a finish clears the tries. */
export function addFinish(progress: Progress, id: number, stars: number): Progress {
  return {
    ...progress,
    stars: progress.stars.map((count, at) => (at === id - 1 ? Math.max(count, stars) : count)),
    fails: progress.fails.map((count, at) => (at === id - 1 ? 0 : count)),
  };
}

export const addFail = (progress: Progress, id: number): Progress => ({
  ...progress,
  fails: progress.fails.map((count, at) => (at === id - 1 ? count + 1 : count)),
});

export const addSkip = (progress: Progress, id: number): Progress =>
  progress.skipped.includes(id) ? progress : { ...progress, skipped: [...progress.skipped, id] };

export const addBest = (progress: Progress, seconds: number): Progress => (seconds > progress.best ? { ...progress, best: seconds } : progress);
