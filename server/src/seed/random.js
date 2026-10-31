
import { faker } from "@faker-js/faker";

// Fixed seed makes generated data reproducible
const SEED = 42;

let state = SEED;

// Mulberry32 pseudorandom number generator
export function rand() {
  state |= 0;
  state = (state + 0x6D2B79F5) | 0;

  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Reset both random generators before each seed run
export function resetRandom() {
  state = SEED;
  faker.seed(SEED);
}

// Random integer between min and max (inclusive)
export function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

// Pick one random element from an array
export function pick(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cannot pick from an empty array");
  }

  return items[randInt(0, items.length - 1)];
}

// Generate approximately normally distributed values
export function normal(mean = 0, standardDeviation = 1) {
  // Box-Muller transform
  const u1 = Math.max(rand(), Number.EPSILON);
  const u2 = rand();

  const z = Math.sqrt(-2 * Math.log(u1)) *
    Math.cos(2 * Math.PI * u2);

  return mean + z * standardDeviation;
}

// Faker is used only for generating synthetic names
export function fakeName() {
  return faker.person.fullName();
}

resetRandom();
