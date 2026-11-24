// The lab can remove trade preferences and practice without modifying a save.
let enabled = true;
export function setTrades(on: boolean) { enabled = on; }
export const tradesOn = () => enabled;
