import type { FriendId } from '../data/friends.ts';

/** Something a tap can be about. */
export type Target =
  | { kind: 'ground'; x: number; z: number }
  | { kind: 'friend'; id: FriendId }
  | { kind: 'plot'; index: number }
  | { kind: 'place'; id: string }
  | { kind: 'find'; uid: number }
  | { kind: 'pet'; index: number }
  /** A button on screen rather than a spot in the world, such as the one for decorating outside. */
  | { kind: 'button'; id: 'decor' };

export function sameTarget(a: Target | null, b: Target | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function targetId(target: Target): string {
  switch (target.kind) {
    case 'ground':
      return `ground:${target.x},${target.z}`;
    case 'friend':
    case 'place':
    case 'button':
      return `${target.kind}:${target.id}`;
    case 'plot':
    case 'pet':
      return `${target.kind}:${target.index}`;
    case 'find':
      return `find:${target.uid}`;
    default:
      return 'none';
  }
}

export function parseTarget(id: string): Target | null {
  const [kind, rest = ''] = id.split(':');
  switch (kind) {
    case 'friend':
      return { kind, id: rest as FriendId };
    case 'place':
      return { kind, id: rest };
    case 'plot':
    case 'pet':
      return { kind, index: Number(rest) };
    case 'find':
      return { kind, uid: Number(rest) };
    default:
      return null;
  }
}
