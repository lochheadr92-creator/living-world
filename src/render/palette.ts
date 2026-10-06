// Colours shared by the renderer and the DOM interface so the two always agree.

/** One accent colour per household: seen as a sash on clothing, in the inspector and on the minimap. */
export const HOUSEHOLD_COLORS = ['#e4572e', '#f3a712', '#9bc24f', '#3fb6ac', '#3f88c5', '#8a63c4', '#d86fc0', '#9a6b3f', '#5f7f94', '#cdbf4a'] as const;

export const SKIN = ['#f6d5b8', '#efc29b', '#d9a577', '#b9825a', '#8d5a3b', '#5f3b27'] as const;
export const HAIR = ['#2a211c', '#4a3226', '#7a5236', '#a8552b', '#d8b45c', '#c9c9c4'] as const;
export const SHIRT = ['#cf5b4c', '#d8a047', '#6fa25a', '#4f93b0', '#7d6bb5', '#c76ea0', '#8b6a49', '#5b7a68', '#c9b36a', '#8a97a6'] as const;
export const PANTS = ['#4a3f38', '#5c4a3a', '#3f4a58', '#6a5a46', '#42504a'] as const;

export const NEED_COLORS: Record<string, string> = {
  hunger: '#e9a23b',
  thirst: '#4fa8e0',
  energy: '#9d86d8',
  warmth: '#e8704a',
  safety: '#6dc08b',
  social: '#e07bb0',
};

export const ITEM_COLORS: Record<string, string> = {
  berries: '#a8294f',
  fruit: '#e0723a',
  fish: '#7fb4c9',
  smoked_fish: '#b98a4a',
  grain: '#d9b44a',
  seeds: '#9c7a45',
  water: '#4fa8e0',
  wood: '#9a6b3f',
  stone: '#9a9a96',
  axe: '#b8b8b0',
  pick: '#b8b8b0',
  hoe: '#b8b8b0',
  basket: '#b98a4f',
  bread: '#d79a4a',
  clay: '#d08a5a',
  ore: '#b6783a',
  planks: '#d9b57a',
  handles: '#c89a62',
  bricks: '#c4604a',
  charcoal: '#6a655f',
  iron: '#9aa3b4',
  flour: '#efe6d0',
  hammer: '#c8c8c0',
  saw: '#c8c8c0',
  jar: '#c98a5a',
  rod: '#8a6a44',
};

export const EVENT_COLORS: Record<string, string> = {
  survival: '#e9a23b',
  social: '#e07bb0',
  build: '#7fb069',
  farm: '#c9c05c',
  life: '#8ec5ff',
  nature: '#8fa8b8',
  danger: '#e5645c',
  trade: '#5fd0c0',
  conflict: '#e0825a',
  work: '#c79a62',
};
