$ErrorActionPreference='Stop'
$root='C:\dev\_lw_daylength_20261117\double'
function ReplaceOnce([string]$file,[string]$before,[string]$after) {
  $path=Join-Path $root $file
  $body=[IO.File]::ReadAllText($path)
  $count=([regex]::Matches($body,[regex]::Escape($before))).Count
  if($count -ne 1){throw "Expected 1 match; found $count in $file : $before"}
  [IO.File]::WriteAllText($path,$body.Replace($before,$after),[Text.UTF8Encoding]::new($false))
}
Copy-Item -LiteralPath 'C:\dev\_lw_daylength_20261117\baseline\scripts\daylength_probe.ts' -Destination (Join-Path $root 'scripts\daylength_probe.ts')
foreach($pair in @(
 @('export const DAY = 2400;','export const DAY = 4800;'),
 @('export const HUNGER_RATE = 0.03;','export const HUNGER_RATE = 0.015;'),
 @('export const THIRST_RATE = 0.04;','export const THIRST_RATE = 0.02;'),
 @('export const ENERGY_RATE = 0.04;','export const ENERGY_RATE = 0.02;'),
 @('export const SLEEP_RECOVER = 0.115;','export const SLEEP_RECOVER = 0.0575;'),
 @('export const REST_RECOVER = 0.03;','export const REST_RECOVER = 0.015;'),
 @('export const SOCIAL_RATE = 0.017;','export const SOCIAL_RATE = 0.0085;'),
 @('export const FIRE_FUEL_PER_WOOD = 380;','export const FIRE_FUEL_PER_WOOD = 760;'),
 @('export const FIRE_MAX_FUEL = 2400;','export const FIRE_MAX_FUEL = 4800;')
)) {ReplaceOnce 'src\sim\constants.ts' $pair[0] $pair[1]}
ReplaceOnce 'src\sim\metabolism.ts' 'export const HUNGER_RATE_195 = 0.024;' 'export const HUNGER_RATE_195 = 0.012;'
ReplaceOnce 'src\sim\metabolism.ts' 'export const THIRST_RATE_195 = 0.032;' 'export const THIRST_RATE_195 = 0.016;'
foreach($pair in @(
 @('n.warmth += (target - n.warmth) * 0.006;','n.warmth += (target - n.warmth) * 0.003;'),
 @('n.safety += (safetyTarget - n.safety) * (safetyTarget < n.safety ? 0.08 : 0.02);','n.safety += (safetyTarget - n.safety) * (safetyTarget < n.safety ? 0.04 : 0.01);'),
 @('n.social += 0.0035 * Math.min(near, 3);','n.social += 0.00175 * Math.min(near, 3);'),
 @('dh -= 0.022*starvationFraction;','dh -= 0.011*starvationFraction;'),
 @('if (n.thirst <= 0) dh -= 0.05;','if (n.thirst <= 0) dh -= 0.025;'),
 @('if (n.warmth <= 6) dh -= 0.035;','if (n.warmth <= 6) dh -= 0.0175;'),
 @('if (n.energy <= 0) dh -= 0.01;','if (n.energy <= 0) dh -= 0.005;'),
 @('dh = sleeping ? 0.03 : resting ? 0.02 : 0.009;','dh = sleeping ? 0.015 : resting ? 0.01 : 0.0045;')
)) {ReplaceOnce 'src\sim\needs.ts' $pair[0] $pair[1]}
foreach($pair in @(
 @('const ONSET_BASE = 0.00003;','const ONSET_BASE = 0.000015;'),
 @('p.health - i.severity * (resting ? 0.5 : 1.3) * (n.hunger < 25 ? 2 : 1)','p.health - i.severity * (resting ? 0.5 : 1.3) * (n.hunger < 25 ? 2 : 1) * 0.5'),
 @('n.energy - 1.5 * i.severity','n.energy - 0.75 * i.severity')
)) {ReplaceOnce 'src\sim\illness.ts' $pair[0] $pair[1]}
foreach($pair in @(
 @('b.condition -= DECAY_PER_TICK[b.type] * stormy;','b.condition -= DECAY_PER_TICK[b.type] * stormy * 0.5;'),
 @('const rate = 0.011;','const rate = 0.0055;'),
 @('world.rng.next() < 0.04 * perishableOf(world, k) * spoilPile(world)','world.rng.next() < 0.02 * perishableOf(world, k) * spoilPile(world)')
)) {ReplaceOnce 'src\sim\world.ts' $pair[0] $pair[1]}
Set-Location -LiteralPath $root
Write-Host 'EXPERIMENT SOURCE DIFF'; git diff --stat; Write-Host 'CHANGED PATHS'; git status --short
