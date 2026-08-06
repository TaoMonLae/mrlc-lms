// Periodic table reference data for the Periodic Table game module.
//
// Scope and sourcing notes:
// - Categories use the common ten-bucket scheme (alkali metal, alkaline
//   earth metal, transition metal, post-transition metal, metalloid,
//   nonmetal, halogen, noble gas, lanthanide, actinide) used by most
//   classroom periodic tables.
// - Atomic masses are standard conventional atomic weights; for elements
//   with no stable isotope (technetium, promethium, polonium and heavier)
//   the mass of the most stable known isotope is shown instead, matching
//   the number printed on typical classroom wall charts.
// - Phase is the physical state at room temperature (~25 degC). For
//   synthetic superheavy elements (104+) the phase has never been
//   observed directly; "solid" is shown as the standard textbook
//   simplification, except the noble gas Og which follows its group.
// - Electron shell distribution is computed on demand with the simple
//   2/8/8/18/18/32 Bohr-style filling model used in introductory
//   chemistry (see `electronShells` below) rather than hand-authored per
//   element, so it is always internally consistent and never mistyped.

export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth'
  | 'transition-metal'
  | 'post-transition-metal'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide';

export type ElementPhase = 'solid' | 'liquid' | 'gas';
export type ElementBlock = 's' | 'p' | 'd' | 'f';

export interface PeriodicElement {
  number: number;
  symbol: string;
  name: string;
  mass: number;
  category: ElementCategory;
  /** 1-7, the row of the main table this element belongs to. */
  period: number;
  /** 1-18 for main-table elements; null for lanthanides/actinides, shown in the f-block strip instead. */
  group: number | null;
  block: ElementBlock;
  phase: ElementPhase;
  /** 1-15 position within the lanthanide/actinide strip, only set when group is null. */
  seriesIndex?: number;
}

export const CATEGORY_LABELS: Record<ElementCategory, string> = {
  'alkali-metal': 'Alkali metal',
  'alkaline-earth': 'Alkaline earth metal',
  'transition-metal': 'Transition metal',
  'post-transition-metal': 'Post-transition metal',
  metalloid: 'Metalloid',
  nonmetal: 'Nonmetal',
  halogen: 'Halogen',
  'noble-gas': 'Noble gas',
  lanthanide: 'Lanthanide',
  actinide: 'Actinide',
};

// Tailwind classes per category, used for both the main table tiles and any
// legend/chip that needs to match. Kept as plain class strings (rather than
// inline styles) so dark-mode variants apply automatically.
export const CATEGORY_STYLES: Record<ElementCategory, { bg: string; text: string; border: string }> = {
  'alkali-metal': { bg: 'bg-rose-200 dark:bg-rose-500/30', text: 'text-rose-950 dark:text-rose-100', border: 'border-rose-400 dark:border-rose-500/50' },
  'alkaline-earth': { bg: 'bg-orange-200 dark:bg-orange-500/30', text: 'text-orange-950 dark:text-orange-100', border: 'border-orange-400 dark:border-orange-500/50' },
  'transition-metal': { bg: 'bg-amber-200 dark:bg-amber-500/30', text: 'text-amber-950 dark:text-amber-100', border: 'border-amber-400 dark:border-amber-500/50' },
  'post-transition-metal': { bg: 'bg-lime-200 dark:bg-lime-500/30', text: 'text-lime-950 dark:text-lime-100', border: 'border-lime-400 dark:border-lime-500/50' },
  metalloid: { bg: 'bg-teal-200 dark:bg-teal-500/30', text: 'text-teal-950 dark:text-teal-100', border: 'border-teal-400 dark:border-teal-500/50' },
  nonmetal: { bg: 'bg-sky-200 dark:bg-sky-500/30', text: 'text-sky-950 dark:text-sky-100', border: 'border-sky-400 dark:border-sky-500/50' },
  halogen: { bg: 'bg-cyan-200 dark:bg-cyan-500/30', text: 'text-cyan-950 dark:text-cyan-100', border: 'border-cyan-400 dark:border-cyan-500/50' },
  'noble-gas': { bg: 'bg-violet-200 dark:bg-violet-500/30', text: 'text-violet-950 dark:text-violet-100', border: 'border-violet-400 dark:border-violet-500/50' },
  lanthanide: { bg: 'bg-fuchsia-200 dark:bg-fuchsia-500/30', text: 'text-fuchsia-950 dark:text-fuchsia-100', border: 'border-fuchsia-400 dark:border-fuchsia-500/50' },
  actinide: { bg: 'bg-pink-200 dark:bg-pink-500/30', text: 'text-pink-950 dark:text-pink-100', border: 'border-pink-400 dark:border-pink-500/50' },
};

type Row = [number, string, string, number, ElementCategory, number, number | null, ElementBlock, ElementPhase, number?];

// number, symbol, name, mass, category, period, group, block, phase, seriesIndex
const ROWS: Row[] = [
  [1, 'H', 'Hydrogen', 1.008, 'nonmetal', 1, 1, 's', 'gas'],
  [2, 'He', 'Helium', 4.0026, 'noble-gas', 1, 18, 's', 'gas'],

  [3, 'Li', 'Lithium', 6.94, 'alkali-metal', 2, 1, 's', 'solid'],
  [4, 'Be', 'Beryllium', 9.0122, 'alkaline-earth', 2, 2, 's', 'solid'],
  [5, 'B', 'Boron', 10.81, 'metalloid', 2, 13, 'p', 'solid'],
  [6, 'C', 'Carbon', 12.011, 'nonmetal', 2, 14, 'p', 'solid'],
  [7, 'N', 'Nitrogen', 14.007, 'nonmetal', 2, 15, 'p', 'gas'],
  [8, 'O', 'Oxygen', 15.999, 'nonmetal', 2, 16, 'p', 'gas'],
  [9, 'F', 'Fluorine', 18.998, 'halogen', 2, 17, 'p', 'gas'],
  [10, 'Ne', 'Neon', 20.180, 'noble-gas', 2, 18, 'p', 'gas'],

  [11, 'Na', 'Sodium', 22.990, 'alkali-metal', 3, 1, 's', 'solid'],
  [12, 'Mg', 'Magnesium', 24.305, 'alkaline-earth', 3, 2, 's', 'solid'],
  [13, 'Al', 'Aluminium', 26.982, 'post-transition-metal', 3, 13, 'p', 'solid'],
  [14, 'Si', 'Silicon', 28.085, 'metalloid', 3, 14, 'p', 'solid'],
  [15, 'P', 'Phosphorus', 30.974, 'nonmetal', 3, 15, 'p', 'solid'],
  [16, 'S', 'Sulfur', 32.06, 'nonmetal', 3, 16, 'p', 'solid'],
  [17, 'Cl', 'Chlorine', 35.45, 'halogen', 3, 17, 'p', 'gas'],
  [18, 'Ar', 'Argon', 39.948, 'noble-gas', 3, 18, 'p', 'gas'],

  [19, 'K', 'Potassium', 39.098, 'alkali-metal', 4, 1, 's', 'solid'],
  [20, 'Ca', 'Calcium', 40.078, 'alkaline-earth', 4, 2, 's', 'solid'],
  [21, 'Sc', 'Scandium', 44.956, 'transition-metal', 4, 3, 'd', 'solid'],
  [22, 'Ti', 'Titanium', 47.867, 'transition-metal', 4, 4, 'd', 'solid'],
  [23, 'V', 'Vanadium', 50.942, 'transition-metal', 4, 5, 'd', 'solid'],
  [24, 'Cr', 'Chromium', 51.996, 'transition-metal', 4, 6, 'd', 'solid'],
  [25, 'Mn', 'Manganese', 54.938, 'transition-metal', 4, 7, 'd', 'solid'],
  [26, 'Fe', 'Iron', 55.845, 'transition-metal', 4, 8, 'd', 'solid'],
  [27, 'Co', 'Cobalt', 58.933, 'transition-metal', 4, 9, 'd', 'solid'],
  [28, 'Ni', 'Nickel', 58.693, 'transition-metal', 4, 10, 'd', 'solid'],
  [29, 'Cu', 'Copper', 63.546, 'transition-metal', 4, 11, 'd', 'solid'],
  [30, 'Zn', 'Zinc', 65.38, 'transition-metal', 4, 12, 'd', 'solid'],
  [31, 'Ga', 'Gallium', 69.723, 'post-transition-metal', 4, 13, 'p', 'solid'],
  [32, 'Ge', 'Germanium', 72.630, 'metalloid', 4, 14, 'p', 'solid'],
  [33, 'As', 'Arsenic', 74.922, 'metalloid', 4, 15, 'p', 'solid'],
  [34, 'Se', 'Selenium', 78.971, 'nonmetal', 4, 16, 'p', 'solid'],
  [35, 'Br', 'Bromine', 79.904, 'halogen', 4, 17, 'p', 'liquid'],
  [36, 'Kr', 'Krypton', 83.798, 'noble-gas', 4, 18, 'p', 'gas'],

  [37, 'Rb', 'Rubidium', 85.468, 'alkali-metal', 5, 1, 's', 'solid'],
  [38, 'Sr', 'Strontium', 87.62, 'alkaline-earth', 5, 2, 's', 'solid'],
  [39, 'Y', 'Yttrium', 88.906, 'transition-metal', 5, 3, 'd', 'solid'],
  [40, 'Zr', 'Zirconium', 91.224, 'transition-metal', 5, 4, 'd', 'solid'],
  [41, 'Nb', 'Niobium', 92.906, 'transition-metal', 5, 5, 'd', 'solid'],
  [42, 'Mo', 'Molybdenum', 95.95, 'transition-metal', 5, 6, 'd', 'solid'],
  [43, 'Tc', 'Technetium', 98, 'transition-metal', 5, 7, 'd', 'solid'],
  [44, 'Ru', 'Ruthenium', 101.07, 'transition-metal', 5, 8, 'd', 'solid'],
  [45, 'Rh', 'Rhodium', 102.91, 'transition-metal', 5, 9, 'd', 'solid'],
  [46, 'Pd', 'Palladium', 106.42, 'transition-metal', 5, 10, 'd', 'solid'],
  [47, 'Ag', 'Silver', 107.87, 'transition-metal', 5, 11, 'd', 'solid'],
  [48, 'Cd', 'Cadmium', 112.41, 'transition-metal', 5, 12, 'd', 'solid'],
  [49, 'In', 'Indium', 114.82, 'post-transition-metal', 5, 13, 'p', 'solid'],
  [50, 'Sn', 'Tin', 118.71, 'post-transition-metal', 5, 14, 'p', 'solid'],
  [51, 'Sb', 'Antimony', 121.76, 'metalloid', 5, 15, 'p', 'solid'],
  [52, 'Te', 'Tellurium', 127.60, 'metalloid', 5, 16, 'p', 'solid'],
  [53, 'I', 'Iodine', 126.90, 'halogen', 5, 17, 'p', 'solid'],
  [54, 'Xe', 'Xenon', 131.29, 'noble-gas', 5, 18, 'p', 'gas'],

  [55, 'Cs', 'Caesium', 132.91, 'alkali-metal', 6, 1, 's', 'solid'],
  [56, 'Ba', 'Barium', 137.33, 'alkaline-earth', 6, 2, 's', 'solid'],
  [57, 'La', 'Lanthanum', 138.91, 'lanthanide', 6, null, 'f', 'solid', 1],
  [58, 'Ce', 'Cerium', 140.12, 'lanthanide', 6, null, 'f', 'solid', 2],
  [59, 'Pr', 'Praseodymium', 140.91, 'lanthanide', 6, null, 'f', 'solid', 3],
  [60, 'Nd', 'Neodymium', 144.24, 'lanthanide', 6, null, 'f', 'solid', 4],
  [61, 'Pm', 'Promethium', 145, 'lanthanide', 6, null, 'f', 'solid', 5],
  [62, 'Sm', 'Samarium', 150.36, 'lanthanide', 6, null, 'f', 'solid', 6],
  [63, 'Eu', 'Europium', 151.96, 'lanthanide', 6, null, 'f', 'solid', 7],
  [64, 'Gd', 'Gadolinium', 157.25, 'lanthanide', 6, null, 'f', 'solid', 8],
  [65, 'Tb', 'Terbium', 158.93, 'lanthanide', 6, null, 'f', 'solid', 9],
  [66, 'Dy', 'Dysprosium', 162.50, 'lanthanide', 6, null, 'f', 'solid', 10],
  [67, 'Ho', 'Holmium', 164.93, 'lanthanide', 6, null, 'f', 'solid', 11],
  [68, 'Er', 'Erbium', 167.26, 'lanthanide', 6, null, 'f', 'solid', 12],
  [69, 'Tm', 'Thulium', 168.93, 'lanthanide', 6, null, 'f', 'solid', 13],
  [70, 'Yb', 'Ytterbium', 173.05, 'lanthanide', 6, null, 'f', 'solid', 14],
  [71, 'Lu', 'Lutetium', 174.97, 'lanthanide', 6, null, 'f', 'solid', 15],
  [72, 'Hf', 'Hafnium', 178.49, 'transition-metal', 6, 4, 'd', 'solid'],
  [73, 'Ta', 'Tantalum', 180.95, 'transition-metal', 6, 5, 'd', 'solid'],
  [74, 'W', 'Tungsten', 183.84, 'transition-metal', 6, 6, 'd', 'solid'],
  [75, 'Re', 'Rhenium', 186.21, 'transition-metal', 6, 7, 'd', 'solid'],
  [76, 'Os', 'Osmium', 190.23, 'transition-metal', 6, 8, 'd', 'solid'],
  [77, 'Ir', 'Iridium', 192.22, 'transition-metal', 6, 9, 'd', 'solid'],
  [78, 'Pt', 'Platinum', 195.08, 'transition-metal', 6, 10, 'd', 'solid'],
  [79, 'Au', 'Gold', 196.97, 'transition-metal', 6, 11, 'd', 'solid'],
  [80, 'Hg', 'Mercury', 200.59, 'transition-metal', 6, 12, 'd', 'liquid'],
  [81, 'Tl', 'Thallium', 204.38, 'post-transition-metal', 6, 13, 'p', 'solid'],
  [82, 'Pb', 'Lead', 207.2, 'post-transition-metal', 6, 14, 'p', 'solid'],
  [83, 'Bi', 'Bismuth', 208.98, 'post-transition-metal', 6, 15, 'p', 'solid'],
  [84, 'Po', 'Polonium', 209, 'post-transition-metal', 6, 16, 'p', 'solid'],
  [85, 'At', 'Astatine', 210, 'halogen', 6, 17, 'p', 'solid'],
  [86, 'Rn', 'Radon', 222, 'noble-gas', 6, 18, 'p', 'gas'],

  [87, 'Fr', 'Francium', 223, 'alkali-metal', 7, 1, 's', 'solid'],
  [88, 'Ra', 'Radium', 226, 'alkaline-earth', 7, 2, 's', 'solid'],
  [89, 'Ac', 'Actinium', 227, 'actinide', 7, null, 'f', 'solid', 1],
  [90, 'Th', 'Thorium', 232.04, 'actinide', 7, null, 'f', 'solid', 2],
  [91, 'Pa', 'Protactinium', 231.04, 'actinide', 7, null, 'f', 'solid', 3],
  [92, 'U', 'Uranium', 238.03, 'actinide', 7, null, 'f', 'solid', 4],
  [93, 'Np', 'Neptunium', 237, 'actinide', 7, null, 'f', 'solid', 5],
  [94, 'Pu', 'Plutonium', 244, 'actinide', 7, null, 'f', 'solid', 6],
  [95, 'Am', 'Americium', 243, 'actinide', 7, null, 'f', 'solid', 7],
  [96, 'Cm', 'Curium', 247, 'actinide', 7, null, 'f', 'solid', 8],
  [97, 'Bk', 'Berkelium', 247, 'actinide', 7, null, 'f', 'solid', 9],
  [98, 'Cf', 'Californium', 251, 'actinide', 7, null, 'f', 'solid', 10],
  [99, 'Es', 'Einsteinium', 252, 'actinide', 7, null, 'f', 'solid', 11],
  [100, 'Fm', 'Fermium', 257, 'actinide', 7, null, 'f', 'solid', 12],
  [101, 'Md', 'Mendelevium', 258, 'actinide', 7, null, 'f', 'solid', 13],
  [102, 'No', 'Nobelium', 259, 'actinide', 7, null, 'f', 'solid', 14],
  [103, 'Lr', 'Lawrencium', 266, 'actinide', 7, null, 'f', 'solid', 15],
  [104, 'Rf', 'Rutherfordium', 267, 'transition-metal', 7, 4, 'd', 'solid'],
  [105, 'Db', 'Dubnium', 268, 'transition-metal', 7, 5, 'd', 'solid'],
  [106, 'Sg', 'Seaborgium', 271, 'transition-metal', 7, 6, 'd', 'solid'],
  [107, 'Bh', 'Bohrium', 272, 'transition-metal', 7, 7, 'd', 'solid'],
  [108, 'Hs', 'Hassium', 270, 'transition-metal', 7, 8, 'd', 'solid'],
  [109, 'Mt', 'Meitnerium', 276, 'transition-metal', 7, 9, 'd', 'solid'],
  [110, 'Ds', 'Darmstadtium', 281, 'transition-metal', 7, 10, 'd', 'solid'],
  [111, 'Rg', 'Roentgenium', 282, 'transition-metal', 7, 11, 'd', 'solid'],
  [112, 'Cn', 'Copernicium', 285, 'transition-metal', 7, 12, 'd', 'solid'],
  [113, 'Nh', 'Nihonium', 286, 'post-transition-metal', 7, 13, 'p', 'solid'],
  [114, 'Fl', 'Flerovium', 289, 'post-transition-metal', 7, 14, 'p', 'solid'],
  [115, 'Mc', 'Moscovium', 290, 'post-transition-metal', 7, 15, 'p', 'solid'],
  [116, 'Lv', 'Livermorium', 293, 'post-transition-metal', 7, 16, 'p', 'solid'],
  [117, 'Ts', 'Tennessine', 294, 'halogen', 7, 17, 'p', 'solid'],
  [118, 'Og', 'Oganesson', 294, 'noble-gas', 7, 18, 'p', 'gas'],
];

export const PERIODIC_ELEMENTS: PeriodicElement[] = ROWS.map(
  ([number, symbol, name, mass, category, period, group, block, phase, seriesIndex]) => ({
    number, symbol, name, mass, category, period, group, block, phase, seriesIndex,
  }),
);

export const ELEMENT_BY_NUMBER: Map<number, PeriodicElement> = new Map(
  PERIODIC_ELEMENTS.map((element) => [element.number, element]),
);

export const ELEMENT_BY_SYMBOL: Map<string, PeriodicElement> = new Map(
  PERIODIC_ELEMENTS.map((element) => [element.symbol, element]),
);

/**
 * Simplified Bohr-model shell filling used by introductory "build an atom"
 * style games. This intentionally does not reproduce the handful of real
 * quantum-mechanical exceptions (e.g. chromium, copper) -- it is a teaching
 * model, not a subshell configuration.
 *
 * The classic 2/8/8/18/18/32 capacities only sum to 106, which silently
 * dropped electrons for every element from bohrium (107) to oganesson
 * (118). A 7th shell (also capped at 32, rather than the strict 2n^2=98)
 * closes the gap so all 118 elements are fully and correctly accounted for.
 */
export function electronShells(electronCount: number): number[] {
  const capacities = [2, 8, 8, 18, 18, 32, 32];
  const shells: number[] = [];
  let remaining = Math.max(0, Math.floor(electronCount));
  for (const capacity of capacities) {
    if (remaining <= 0) break;
    const filled = Math.min(capacity, remaining);
    shells.push(filled);
    remaining -= filled;
  }
  return shells;
}

/** Neutron count for the isotope whose mass is shown above (round(mass) - protons). */
export function typicalNeutronCount(element: PeriodicElement): number {
  return Math.max(0, Math.round(element.mass) - element.number);
}

export function randomElements(count: number, exclude: Set<number> = new Set()): PeriodicElement[] {
  const pool = PERIODIC_ELEMENTS.filter((element) => !exclude.has(element.number));
  const picked: PeriodicElement[] = [];
  const used = new Set<number>();
  while (picked.length < count && picked.length < pool.length) {
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (used.has(candidate.number)) continue;
    used.add(candidate.number);
    picked.push(candidate);
  }
  return picked;
}
