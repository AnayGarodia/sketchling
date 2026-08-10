# Feedback: working with `texture: "pixel"`

Notes from building `examples/story/candy-cave.ts` (an 8-bit adventurer exploring a
candy-colored cave, ~61s, `look: "flat"` + `texture: "pixel"`), written cold from
AGENTS.md + the examples.

**What worked great.** The pixel post-process is the cheapest register swap in the
library: nothing about authoring changes, and because it applies to `--out` stills and
`contact-sheet` too (not just `--video`), the whole iteration loop happens in the final
look — I never had to guess how a frame would pixelate. The 8px cell also *hides* an
entire class of imperfection: rough joint caps, slightly-off stroke endpoints, and IK
knee angles all melt into chunky blocks that read as intentional game art. `look: "flat"`
under it is the right default pairing, exactly as `pixel-look.ts` suggests.

**What I had to discover by rendering.** The cell size (8 output px, `PIXEL_CELL` in
`src/cli.ts`) isn't in AGENTS.md — it matters a lot for authoring. Anything under ~a cell
(thin strokes, small text, a 6px eye) either dithers into mush or vanishes; the font at
`size: 46+` with numeric weight 4-5 is about the legibility floor, and my hero's eye had
to be a full cell. A one-line note in the texture docs ("details below ~8px won't
survive; text wants size ≥48") would save the first blind iteration. Also worth saying:
the area-averaged downsample softens hard pixel edges into slightly blurred blocks — it
reads more "CRT capture of a retro game" than "true indexed-palette pixel art". That was
fine for this piece, but a nearest-neighbor downsample option (or a configurable cell
size) would widen the register.

**Things adjacent to pixel that bit me.** (1) A later `zoomTo` silently *supersedes* a
running `camera.follow` — AGENTS.md's camera section reads as if zoom and follow compose
("both can run at once"), but any later pan/zoom takes over pan control entirely; my
discovery zoom stranded the camera a screenful behind the hero until I made the final
framing an explicit `panTo`+`zoomTo`. (2) An un-pivoted `squashTo` on a plain blob scaled
around the SVG origin, not the shape's center — a mid-jiggle gumdrop teleported ~150px
until I gave it a `pivotAt` at its base (which also looks better anyway). Neither is a
pixel issue, but both only showed up on rendered mid-motion frames, which vindicates the
"render at a genuinely mid-motion `--at`" advice hard.

**Small delight.** Deterministic renders + pixel stills made verification genuinely
cheap: six contact-sheet cells told me everything a 1,869-frame video would have.
