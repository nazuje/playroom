/** Every number that shapes how the game plays, in world units and seconds. */
export const ARENA_RADIUS = 11.5;
/** The rules always run in steps this long, so a slow tablet plays the same game as a fast laptop. */
export const STEP = 1 / 60;

export const PLAYER_RADIUS = 0.42;
export const PLAYER_SPEED = 7;
export const PLAYER_GRIP = 16;
export const HEARTS = 3;
export const BLINK_SECONDS = 1.6;

/** The one button: a short hop that also throws you forwards. */
export const LEAP_SECONDS = 0.6;
export const LEAP_HEIGHT = 1.8;
export const LEAP_BOOST = 2.1;
export const LEAP_RECHARGE = 1.4;
/** A press this early still counts, so a child who is a moment too soon isn't punished. */
export const LEAP_BUFFER = 0.14;
/** Above this you clear anything low: rings, beams and slime. */
export const LOW_CLEARANCE = 0.45;
/** A ring or beam at the feet waits this long for a leap before it bonks, so a press a moment late still counts. Only the early stages are this kind. */
export const LATE_LEAP_EASY = 0.16;
/** From this difficulty on, there's no waiting at all. */
export const LATE_LEAP_UNTIL = 0.6;

/** Time from a danger first showing until it can touch you. Shrinks slowly, and never below the floor. */
export const WARN_EASY = 1.5;
export const WARN_HARD = 0.85;
export const WARN_FLOOR = 0.8;

export const METEOR_BLAST_SECONDS = 0.22;
export const SLIME_FUSE_SECONDS = 0.9;
export const SLIME_BURST_SECONDS = 0.22;
export const SLIME_BODY_RADIUS = 0.7;
export const SLIME_BURST_RADIUS = 2.2;
export const BEAM_SWEEP = 2;
export const BEAM_WIDTH = 0.3;
export const BAR_WIDTH = 0.5;
export const RING_WIDTH = 0.5;
/** Rings can't be run from, so two in a row always leave time for the button to recharge. */
export const RING_GAP = LEAP_SECONDS + LEAP_RECHARGE + 0.5;

export const SLOW_SECONDS = 5;
export const SLOW_SCALE = 0.45;
export const GOLDEN_SECONDS = 6;
export const SHIELD_SECONDS = 4.5;
export const UFO_ARRIVES = 1.6;
export const UFO_LEAVES = 3.2;
export const PICKUP_SECONDS = 8;
export const PICKUP_RADIUS = 1.1;
export const SURPRISE_FIRST = 28;
export const SURPRISE_MIN = 22;
export const SURPRISE_MAX = 38;
/** A moment to find your feet before anything can appear. */
export const GRACE_SECONDS = 0.9;
