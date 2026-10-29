# Zoom-aware speech and viewer readability

2026-10-29, programme WS15. Based on `953eb90` / rules 53. Presentation only:
no speech generation, duration, conversation outcome, world settings, save schema,
RNG or simulation rules change. The active main checkout's uncommitted rules-54
relocation work is deliberately outside this isolated branch.

## Contract and ownership

`src/render/speech_layout.ts` owns the named `SPEECH_ZOOM_POLICY`, measured wrapping,
content hysteresis, bounded nearby placement and a 256-entry reconstructible text
cache. `renderer.ts` owns priority and the single shared collision budget for speech,
names and intentions. `overlays.ts` draws that same measured geometry, including a
leader to the actual speaker. The renderer keeps diagnostic rectangles, content
levels and layout time outside World. None is persisted or read by the simulation.

At zoom 0.3 ordinary speech is a small marker. Content changes to a two-line preview
above 0.62 and full text above 1.5. Returning thresholds are 0.48 and 1.3, preventing
flicker around a boundary. Font, padding, line spacing, outline, tail and clearance
grow together; geometry is measured at 0.01 zoom resolution (less than 0.1px font
change). Normal text ranges from 10.5px at marker scale to 14.5px at zoom 3.2;
visible previews begin above 11px. Larger text adds 20% on the map and 18% in panels.
Full bubbles are at most 300 × 156 CSS pixels, six lines, and 1,024 input code units.
Long tokens wrap; omitted content ends with an ellipsis. The full current message
remains unabridged in the selected person's existing panel, including long tokens.

Selected/followed speech comes first, then warnings/anger, questions and ordinary
speech, with stable person-ID tie breaking. The selected name and body have reserved
space. Other names and intention badges use remaining space. Placement tries a
fixed set of nearby positions and retains a successful position relative to the
speaker as they move. When a full bubble cannot fit it becomes a marker; if even a
marker cannot fit it is omitted. Nothing is pushed into an unlimited upward stack.
Warnings have an exclamation marker and a stripe on expanded text, as well as colour.
Actual visible panel rectangles, including narrow inspectors and the View menu,
are excluded; transparent dock space is not excluded wholesale.

`src/app/viewer.ts` owns validated observation preferences; `prefs.ts` persists them
in the existing local preference record. `ui/viewer.ts` supplies native labelled
selects and a checkbox, reachable by keyboard and touch:

- **Automatic** (default): prioritize selected speech and warnings within available space.
- **Selected person only**: only that person's speech, including their warnings.
- **Hidden**: all map speech, including warnings, is hidden. The person panel remains available.
- **Text size**, **Contrast**, **Reduce motion**: independent of map zoom. System reduced
  motion is also respected for DOM transitions. No new bubble animation was added.

The full workshop feed no longer loses the identity of events grouped in All:
each grouped row can expand to the exact original messages, people, positions and
ticks, and the Workshops filter lists individual events. Urgent events are never
grouped. N / Shift+N inspect the next/previous living person in stable ID order.

## Diagnosis and critical review

The old bubble used a fixed 12px font and 170px wrapping width; its `scale` affected
only shadow blur. Placement guessed 30px height and text-length width instead of
measuring the drawn text. The retained wide screenshot shows the resulting overlap.

Review finding 1: protecting every person-shaped rectangle suppressed priority
speech in a crowded close view. Fixed by reserving the selected person and each
bubble's own speaker, while giving selected speech first choice of the remaining
area. Browser assertions now require a full selected bubble at close zoom.

Review finding 2: a long staged-scene banner with large text covered the inspector's
header on a phone. The narrow inspector now follows the banner's measured bottom;
an expanded banner is scrollable and bounded to one quarter of viewport height.

Review finding 3: an expiring speech slot could remain cached after its speaker left
the screen. Slots are pruned to active visible speech each frame; measurement cache
is capped and both caches reset on world replacement.

## Evidence

`scripts/browser/speech_zoom_check.mjs` creates an explicitly labelled staged scene,
pauses at tick zero, and uses the same seven messages and physical positions for
before and after. Original and final `fixture.json` have the same SHA-256:
`449bacf1471a3b4a32596feb16b94344b29fd8d7f9deca4f92696ea832ceb38c`.
Screenshots and machine-readable checks are in `viewer_evidence/before/` and
`viewer_evidence/after/`. Main comparisons use 1440 × 900 at zoom .3, .9, 1.8 and 3.2.
The additional layouts use 1024 × 768 at device scale 1.25, 390 × 844 at scale 2,
and 900 × 500 at scale 1, with large text/high contrast and an open inspector.

The browser checks full panel speech, intended selected-bubble content level,
non-overlap among names/icons/bubbles, preference persistence and warning semantics,
wheel/keyboard/two-pointer pinch input, following, canvas and panel bounds, exact
unchanged serialized state, and absence of runtime exceptions. Screenshots are
inspected visually; DOM text alone is not the readability evidence. These are actual
Chromium CDP input paths, not physical touch-device or human usability evidence.

`tests/speech_layout.test.ts` tests meaningful geometry, bounds, hysteresis, nearby
placement, cache limits and preference migration. `tests/viewer_purity.test.ts`
compares full saved-state equality through all modes/zooms and subsequent same-runtime
continuation with an unviewed restored world. `tests/feed_rows.test.ts` preserves
underlying event identity and urgent events. Existing controller tests cover rendering
through running worlds. Exact commands and current results are in the programme log.

## Limits and next work

Content-level changes and line rewrapping are discrete; geometry grows in small
bounded increments and content-level hysteresis prevents threshold chatter. This is
not a claim of continuously animated text reflow. Crowded low-priority messages may
become markers or be omitted. A narrow open inspector can occupy almost all available
world space; speech remains in the inspector. Marker tails may cross terrain or other
unselected people. Dense scenes do not promise every person's name simultaneously.

Entrance/occupant/work/carried-goods presentation and per-chain causal explanations
still require the programme's scenario-specific checks. No aggregate simulation
benefit, human comprehension improvement or physical-device accessibility certification
is claimed by these viewer checks.
