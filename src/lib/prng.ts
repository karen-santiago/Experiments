// mulberry32. All layout randomness must go through a PRNG seeded from the
// scene config — never Math.random() — so the same seed always produces the
// same layout, in preview, export, and across app restarts.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, maxExclusive: number): number;
  pick<T>(arr: T[]): T;
  shuffle<T>(arr: T[]): T[];
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, maxExclusive) {
      return Math.floor(min + next() * (maxExclusive - min));
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    shuffle(arr) {
      const copy = arr.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}
