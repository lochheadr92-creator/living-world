$ErrorActionPreference='Stop'
$source='C:\dev\Claude Experiment\living-world-hearth-check2'
Set-Location -LiteralPath $source
& "$source\scripts\run_longruns.ps1" -Source $source -OutputRoot 'C:\dev\Claude Experiment\living-world-integrate\survival_evidence\hearth-check2\ordinary' -Seeds @('forest','river') -Checks @('production') -Days 25 -BudgetSeconds 1800

