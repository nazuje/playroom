// The solver. It knows every simple rule a player might see in a row of things and asks, for each rule, which
// thing it singles out: the one whose removal leaves every other thing keeping the rule. A fair puzzle has exactly
// one thing singled out by any rule at all, and that is the answer. It never looks at the rule the generator meant.
import { GROUPS, PICS } from './pics.ts';
import { SHAPES, TURNS, type Thing } from './things.ts';

export type Feature =
  | 'group'
  | 'flies'
  | 'water'
  | 'wheels'
  | 'big'
  | 'hue'
  | 'shape'
  | 'color'
  | 'size'
  | 'fill'
  | 'sides'
  | 'curvy'
  | 'symmetric'
  | 'handed'
  | 'turn'
  | 'upright'
  | 'dots'
  | 'parity'
  | 'sidesMatch'
  | 'numeral'
  | 'honest'
  | 'row'
  | 'col';

/**
 * The rules. "same": all share one value. "pair": one feature decides another, both ways, in groups of two or
 * more ("the big ones are red, the small ones blue"). "step": in reading order a number goes up or down by the
 * same amount each time, round the circle for turns. "alternate": in reading order two values take turns.
 */
export type Rule =
  | { kind: 'same'; feature: Feature }
  | { kind: 'pair'; a: Feature; b: Feature }
  | { kind: 'step'; feature: Feature }
  | { kind: 'alternate'; feature: Feature };

type Value = number | string | null;

/**
 * Where each thing sits on the pond, as a row and a column, so things side by side can look like a group. Four sit
 * in a square on a phone (and a row on a tablet, where no group of places can form), five like the dots of a dice,
 * and six in two rows of three on every screen. view/fit.ts lays them out the same way.
 */
export function placeOf(at: number, count: number): { row: number; col: number } {
  if (count === 5) return [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 2 }][at];
  const across = count === 6 ? 3 : 2;
  return { row: Math.floor(at / across), col: at % across };
}

/** A feature of a thing at a place in the row. Null where it doesn't apply, which is a look of its own. */
export function featureOf(thing: Thing, feature: Feature, at: number, count: number): Value {
  if (feature === 'row' || feature === 'col') return placeOf(at, count)[feature];
  if (thing.pic !== null) {
    const pic = PICS[thing.pic];
    if (feature === 'group') return GROUPS.indexOf(pic.group);
    if (feature === 'hue') return pic.hue;
    if (feature === 'flies' || feature === 'water' || feature === 'wheels' || feature === 'big') return pic[feature] ? 1 : 0;
    return null;
  }
  const shape = SHAPES[thing.shape];
  switch (feature) {
    case 'shape':
      return thing.shape;
    case 'color':
      return thing.color;
    case 'size':
      return thing.size;
    case 'fill':
      return thing.fill;
    case 'sides':
      return shape.sides;
    case 'curvy':
      return shape.curvy;
    case 'symmetric':
      return shape.symmetric ? 1 : 0;
    case 'handed':
      return shape.symmetric ? null : thing.flip;
    case 'turn':
      return shape.turnable ? thing.turn : null;
    case 'upright':
      return shape.turnable ? (thing.turn === 0 ? 1 : 0) : null;
    case 'dots':
      return thing.dots;
    case 'parity':
      return thing.dots > 0 ? thing.dots % 2 : null;
    case 'sidesMatch':
      return shape.sides !== null && thing.dots > 0 ? (shape.sides === thing.dots ? 1 : 0) : null;
    case 'numeral':
      return thing.numeral;
    case 'honest':
      return thing.numeral === null ? null : thing.numeral === thing.dots ? 1 : 0;
    default:
      return null;
  }
}

const PIC_SAME: readonly Feature[] = ['group', 'flies', 'water', 'wheels', 'big', 'hue'];
const DRAWN_SAME: readonly Feature[] = [
  'shape',
  'color',
  'size',
  'fill',
  'sides',
  'curvy',
  'symmetric',
  'handed',
  'turn',
  'upright',
  'dots',
  'parity',
  'sidesMatch',
  'numeral',
  'honest',
];
const PAIRED: readonly Feature[] = ['shape', 'color', 'size', 'fill', 'dots', 'row', 'col'];
const STEPPED: readonly Feature[] = ['dots', 'size', 'turn', 'sides', 'numeral'];
const ALTERNATING: readonly Feature[] = ['color', 'shape', 'size', 'fill', 'dots', 'turn'];

/** Every rule the game knows for pictures or for drawn things. */
export function rulesFor(things: readonly Thing[]): Rule[] {
  if (things.every((thing) => thing.pic !== null)) return PIC_SAME.map((feature) => ({ kind: 'same', feature }));
  const rules: Rule[] = DRAWN_SAME.map((feature) => ({ kind: 'same', feature }));
  PAIRED.forEach((a, at) => PAIRED.slice(at + 1).forEach((b) => rules.push({ kind: 'pair', a, b })));
  for (const feature of STEPPED) rules.push({ kind: 'step', feature });
  // Taking turns reads along the rows, which in two rows of three makes a checkerboard. Five sit like a dice, where
  // reading order is no sequence, so there it would only be a coincidence of places, which "pair" with rows and
  // columns already covers.
  if (things.length % 2 === 0) for (const feature of ALTERNATING) rules.push({ kind: 'alternate', feature });
  return rules;
}

const valuesOf = (things: readonly Thing[], feature: Feature): Value[] => things.map((thing, at) => featureOf(thing, feature, at, things.length));

/** Whether a set of places keeps a rule, given every value. */
function keeps(rule: Rule, things: readonly Thing[], places: readonly number[]): boolean {
  if (rule.kind === 'same') {
    // A feature that doesn't apply to any of them is no rule they share.
    const values = valuesOf(things, rule.feature);
    return values[places[0]] !== null && places.every((at) => values[at] === values[places[0]]);
  }
  if (rule.kind === 'pair') return pairs(valuesOf(things, rule.a), valuesOf(things, rule.b), places);
  if (rule.kind === 'step') return predicted(rule.feature, valuesOf(things, rule.feature), places) !== null;
  return alternates(valuesOf(things, rule.feature), places) !== null;
}

/** One feature decides the other and back, in at least two groups of at least two. */
function pairs(a: readonly Value[], b: readonly Value[], places: readonly number[]): boolean {
  if (places.some((at) => a[at] === null || b[at] === null)) return false;
  const forward = new Map<Value, Value>();
  const back = new Map<Value, Value>();
  const sizes = new Map<Value, number>();
  for (const at of places) {
    if (forward.has(a[at]) && forward.get(a[at]) !== b[at]) return false;
    if (back.has(b[at]) && back.get(b[at]) !== a[at]) return false;
    forward.set(a[at], b[at]);
    back.set(b[at], a[at]);
    sizes.set(a[at], (sizes.get(a[at]) ?? 0) + 1);
  }
  return sizes.size >= 2 && [...sizes.values()].every((size) => size >= 2);
}

/** Whether a pairing seen in some places still holds with one more thing added. */
function pairsWith(a: readonly Value[], b: readonly Value[], places: readonly number[], extra: number): boolean {
  const forward = places.find((at) => a[at] === a[extra]);
  const back = places.find((at) => b[at] === b[extra]);
  return (forward === undefined || b[forward] === b[extra]) && (back === undefined || a[back] === a[extra]);
}

/**
 * The value a step rule seen in some places expects at every place, or null when those places don't step. It
 * needs three places at least, and a step that isn't zero.
 */
function predicted(feature: Feature, values: readonly Value[], places: readonly number[]): ((at: number) => number) | null {
  if (places.length < 3 || places.some((at) => typeof values[at] !== 'number')) return null;
  const [first, second] = places;
  const v1 = values[first] as number;
  const v2 = values[second] as number;
  if (feature === 'turn') {
    for (let step = 1; step < TURNS; step += 1) {
      const start = (((v1 - first * step) % TURNS) + TURNS) % TURNS;
      const at = (place: number) => (start + place * step) % TURNS;
      if (places.every((place) => values[place] === at(place))) return at;
    }
    return null;
  }
  const step = (v2 - v1) / (second - first);
  if (step === 0 || !Number.isInteger(step)) return null;
  const at = (place: number) => v1 + (place - first) * step;
  return places.every((place) => values[place] === at(place)) ? at : null;
}

/** The two values that take turns in some places, or null when they don't. */
function alternates(values: readonly Value[], places: readonly number[]): [Value, Value] | null {
  if (places.length < 3 || places.some((at) => values[at] === null)) return null;
  const even = places.filter((at) => at % 2 === 0).map((at) => values[at]);
  const odd = places.filter((at) => at % 2 === 1).map((at) => values[at]);
  // Two of each at least, or a lone value could be a coincidence.
  if (even.length < 2 || odd.length < 2) return null;
  if (even.some((value) => value !== even[0]) || odd.some((value) => value !== odd[0]) || even[0] === odd[0]) return null;
  return [even[0], odd[0]];
}

/** The things a rule singles out: every other thing keeps it, and all of them together don't. */
export function singledBy(rule: Rule, things: readonly Thing[]): number[] {
  const all = things.map((_, at) => at);
  if (things.length < 4) return [];
  return all.filter((odd) => {
    const rest = all.filter((at) => at !== odd);
    if (!keeps(rule, things, rest)) return false;
    if (rule.kind === 'pair') return !pairsWith(valuesOf(things, rule.a), valuesOf(things, rule.b), rest, odd);
    return !keeps(rule, things, all);
  });
}

/** Every thing that some rule singles out. A fair puzzle has exactly one. */
export function oddOnes(things: readonly Thing[]): number[] {
  const found = new Set<number>();
  for (const rule of rulesFor(things)) for (const at of singledBy(rule, things)) found.add(at);
  return [...found].sort((a, b) => a - b);
}

/** The rules that single out a given thing. */
export const rulesSingling = (things: readonly Thing[], odd: number): Rule[] => rulesFor(things).filter((rule) => singledBy(rule, things).includes(odd));

/** What a rule is about, in the things the generator sets, so a puzzle can be checked to be about one idea. */
export function aboutOf(rule: Rule): string[] {
  const of = (feature: Feature): string[] => {
    if (PIC_SAME.includes(feature)) return ['pic'];
    if (feature === 'sides' || feature === 'curvy' || feature === 'symmetric') return ['shape'];
    if (feature === 'handed') return ['flip'];
    if (feature === 'upright') return ['turn'];
    if (feature === 'parity') return ['dots'];
    if (feature === 'sidesMatch') return ['shape', 'dots'];
    if (feature === 'honest') return ['numeral', 'dots'];
    return [feature];
  };
  return rule.kind === 'pair' ? [...new Set([...of(rule.a), ...of(rule.b)])] : of(rule.feature);
}

/** The answer, worked out from the things alone, or null when the puzzle isn't fair. */
export function solve(things: readonly Thing[]): number | null {
  const found = oddOnes(things);
  return found.length === 1 ? found[0] : null;
}

export const ruleKey = (rule: Rule): string => (rule.kind === 'pair' ? `pair:${rule.a}:${rule.b}` : `${rule.kind}:${rule.feature}`);
