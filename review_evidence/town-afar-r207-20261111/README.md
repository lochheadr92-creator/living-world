# Rules 207 — 80×80, 100-person observation

Owner request: watch a larger population from afar to see whether more behaviours occur naturally.

Execution is on the owner's Windows machine, THEWEAPON, under C:\dev. No cloud simulation was used.

The initial runs in this folder started at clean b4ea977c562b328fe747a1068626775dcda6f16b. Another work stream changed tracked simulation/tooling files during the run. The observer's source-unchanged guard rejected the Normal result; Town was stopped. These are provisional artifacts, not the final comparison.

The retained isolated rerun uses a selective git archive of that exact commit (src, scripts, package manifests, Vite config and index). Its local root is:

`C:\dev\living-world-reports\town-afar-r207-20261111\runtime`

Its observation artifacts are in `review_evidence\town-afar-r207-20261111` beneath that root. Both five-day saves match the provisional runs byte for byte. Follow the report there for final results and limitations.

No production code or rules were changed by this observation. The files added here are the observer and a local checkpoint viewer. Existing tracked changes in the shared checkout belong to another work stream.
