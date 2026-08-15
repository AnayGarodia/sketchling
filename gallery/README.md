# gallery

A curated set of original sketchling scenes, plus the twelve best of them exported as seamless
looping clips and a static page to show them on.

```
gallery/
  scenes/         48 scenes, one file each — the actual work
  clips/          the twelve picks as <name>.mp4 + <name>.gif (committed output)
  index.html      the static page: twelve autoplaying loops in a grid
  curate.md       the scoring pass over all 48, and why these twelve
  picks.txt       the twelve, one name per line — the single source of truth for what gets exported
  loop.mjs        the loop window's numbers (also read by the shell scripts)
  lib.ts          the loop contract + the cyclic-motion helpers every scene is built from
  build.sh        regenerates everything
  check-loop.sh   proves a scene's loop actually closes
  work/           scratch: stills, contact sheets, intermediate video (git-ignored)
```

## Regenerating everything

From the repository root, with `ffmpeg` on `PATH`:

```sh
npm install                       # once
npx playwright install chromium   # once — the renderer is a real headless browser
./gallery/build.sh                # ~15 minutes: build, 48 stills, 12 clips, rewrite index.html
```

Then open `gallery/index.html` in a browser, or serve the directory
(`python3 -m http.server` from `gallery/`) — it is plain HTML with no build step.

Subcommands, for when you don't need all of it:

```sh
./gallery/build.sh stills   # re-render every scene to gallery/work/stills/ (JOBS=4 in parallel)
./gallery/build.sh clips    # re-export just the twelve in picks.txt, and rewrite index.html
./gallery/build.sh page     # rewrite index.html's grid from picks.txt alone
./gallery/build.sh sheets   # a 6-frame contact sheet per pick, for reviewing motion rather than one frame
JOBS=8 ./gallery/build.sh stills   # more concurrent Chromium instances
```

`stills` is the check that every scene still renders: a scene that throws, or fails validation,
leaves a `gallery/work/stills/<name>.err` behind and fails the build.

## The loop window

Every scene is two phases on one timeline, and the numbers are a contract rather than a
per-scene decision (`gallery/loop.mjs`, re-exported by `lib.ts`):

| | |
|---|---|
| `[0s, 3.0s)` | the reveal — strokes drawing themselves on |
| `[3.0s, 6.3s)` | the loop — cyclic motion that ends in exactly the state it started in |

`build.sh clips` renders each scene's whole timeline to a raw `.y4m`, then cuts frames 90..188
out of it — one 3.3s loop at 30fps, 99 frames, encoded once. 3.3s is not arbitrary: it is a
whole multiple of the renderer's 0.33s line-boil period AND of the `clay` look's 0.1s
stop-motion hold AND of the frame interval, so the loop's last frame lands on the same phase of
every one of those cycles as its first.

## Adding a scene

Copy the shape of an existing one — `scenes/koi-pond.ts` is representative — then:

```sh
node bin/sketchling.js render gallery/scenes/<name>.ts --at 4.1 --out /tmp/<name>.png  # and LOOK at it
./gallery/check-loop.sh gallery/scenes/<name>.ts    # must print "loop closes"
npx eslint gallery/scenes/<name>.ts
```

`check-loop.sh` renders the first frame of the loop window and the frame one full loop later and
compares them. Renders are deterministic, so byte-identical is an available guarantee and is
what a correct scene hits; the script's own header explains the one sub-pixel exception it
tolerates and why.

Helpers in `lib.ts` (`swayRotate`, `pulseScale`, `pulseSquash`, `pulseFade`, `spin`, `ripple`,
`driftOnce`/`fallLoop`, `lapAlong`, `ringPath`, `blink`, `drawIn`, `appearIn`, `beats`, `rng`)
all return to their own resting state by construction. Hand-authored ops in the loop window can
too, but read the "ONE RULE" comment at the top of `lib.ts` first — the state on the loop's
first frame is the state *before* any loop op has run, which is not always the state the first
op appears to start from.

Scenes deliberately avoid `sketch.particles`, `springTo`, `sketch.connector`, `sketch.walk` and
`scene.camera()`: each of them is a good tool that cannot come back to its own first frame
inside a fixed window (a particle emitter fires once, a spring is still settling, a gait
translates the body permanently).

## Changing the twelve

Edit `picks.txt` and run `./gallery/build.sh clips`. It re-exports exactly the names listed
there and rewrites the grid in `index.html` between its two `<!-- CLIPS -->` markers; nothing
else in the page is generated. Old clips of dropped scenes are not deleted for you.
