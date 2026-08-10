# Feedback: building "The Late Set" with `texture: "grain"` (+ `look: "ink"`)

Piece: `examples/story/late-set.ts` — a jazz trio in a basement club, three scenes cut
with `sketch.film()`, ~80s, full synthesized score (walking bass on `"pluck"`, comping on
`"piano"`, swing time on `"brush"`/`"thud"`).

**Grain itself was the easiest part of the whole build.** One field on `sketch.scene()`,
zero authoring changes, and it did exactly what the docs promise: over a warm-on-dark
palette it reads as pushed film stock rather than a noise layer sitting on top. The
`feBlend "overlay"` design genuinely shows — the grain is most visible inside the lamp
cone and the sign glow (highlights) and nearly disappears into the blacks, which is how
real grain behaves and is what makes it feel photographic instead of decal-like. It also
survives `sketch.film()` composition with no caveats, as documented. I compared
`"ink"`+grain against `"flat"`+grain as stills of the same frame before committing: flat
was cleaner and more poster-like, but ink's line boil suits live music — nothing on a
bandstand sits perfectly still — so ink won on subject, not by default.

**What I'd wish different:**

- Grain intensity isn't tunable. For this palette the default level was right, but I got
  it right by luck; a `texture: { kind: "grain", amount: 0.5 }` form would have let me
  push it toward heavier stock for the exterior shots without a library change.
- The interaction between ink's render jitter and *very small* filled shapes cost more
  iteration than the grain did: 1–2px stars rendered as visible scribbles until they were
  shrunk and dimmed, and opaque particle dots read as popcorn until I put alpha in the
  particle color. Neither is a bug — but a note in AGENTS.md's particles/ink sections
  ("give haze/smoke particles a translucent color, not a solid one") would have saved two
  render loops.
- `sketch.text()`'s dot glyphs (`i`, `j`) are point-like strokes, so any small lettered
  sign tripped the Tier 0 degenerate-shape warning through no fault of the scene. I made
  the check respect a per-node `.lintIgnore("degenerate")` (small change in
  `src/lint/lint.ts`, with a unit test) rather than renaming the club to avoid dotted
  letters.
- The camera-bounds lint doesn't know about zoom: a `panTo` a few pixels off center
  during a `zoomTo(1.22)` push-in is provably safe (the framed region shrinks) but still
  warns when world == viewport. I dropped the pan and kept the zoom; a zoom-aware check
  would allow the nicer off-center solo framing.

**What worked great besides grain:** scheduling music and gesture off the same beat
constants (`BEAT`/`BAR`, one helper per instrument that emits the `sketch.sound()` *and*
the matching arm tween) made sync trivial; the tween-conflict linter caught my first
draft of the pluck-arm flick before I ever rendered it; and the radial-gradient-to-
transparent fill pattern from the docs carried the entire lighting story (bulb glow, lamp
cone, floor pool, sign glow, doorway leak) with no special-case machinery.
