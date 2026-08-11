import rough from "roughjs";
import gsap from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import type { Renderable, SerializedFilm, SerializedNode, SerializedScene } from "../core/types.js";
import { pathFromPoints, anchorPoint } from "../core/geometry.js";
import { mountLit3D } from "./renderer3d.js";
import { roughOptionsFor, strokeWidthOf, effectiveFillStyle } from "./style.js";
import {
  SVG_NS,
  nextUid,
  type BoilTarget,
  type BuildContext,
  type DrawTarget,
  type PendingConnector,
  type PendingParticleEmitter,
  type PendingSpring,
  type SoundEvent,
} from "./internal.js";
import { BOIL_VARIANTS, applyBoilAt } from "./boil.js";
import { applyTextureFilter } from "./textures.js";
import { applyBackground, buildShapeGradient } from "./background.js";
import { applyCameraLayers } from "./camera.js";
import { collectSprings, buildSprings } from "./springs.js";
import { collectConnector, buildConnectors } from "./connectors.js";
import { collectParticles, buildParticles } from "./particles.js";
import { buildMesh3D } from "./mesh3d.js";
import { buildLimb } from "./limb.js";
import { HAND_DRAWN_EASE, applyDrawOn } from "./drawon.js";
import { applyMorphTo } from "./morph.js";
import { computeNodeBBox } from "./scene-query.js";

gsap.registerPlugin(MorphSVGPlugin, MotionPathPlugin);

export type { SoundEvent } from "./internal.js";

export interface MountResult {
  svg: SVGSVGElement;
  timeline: gsap.core.Timeline;
  seekTo: (t: number) => void;
  totalDuration: () => number;
  // Every sketch.sound() in the renderable, `at` already resolved to this timeline's own
  // master clock. Empty for a scene under "lit3d"/"toon3d" — that pipeline doesn't collect
  // sound events yet (see renderer3d.ts's own doc comment).
  soundEvents: SoundEvent[];
}

/** Dispatches on `renderable.kind` (scene vs. film) and, for a scene, on `look` — the one
 * entry point the browser harness calls, and the one place that picks which rendering
 * pipeline runs at all. `look: "lit3d"`/`"toon3d"` are a genuinely separate pipeline
 * (WebGL/Three.js, not SVG/rough.js), not another branch inside this file's own builders —
 * see renderer3d.ts's own doc comment for why (toon3d is a shading variant of the same
 * mountLit3D, not a second WebGL pipeline). */
export function mountRenderable(renderable: Renderable, container: HTMLElement): MountResult {
  if (renderable.kind === "film") return mountFilm(renderable, container);
  if (renderable.look === "lit3d" || renderable.look === "toon3d") return mountLit3D(renderable, container);
  return mount(renderable, container);
}

export function mount(scene: SerializedScene, container: HTMLElement): MountResult {
  const svg = document.createElementNS(SVG_NS, "svg");
  // The output frame — the whole world (scene.width/height) unless a smaller viewport
  // was set for the camera to pan/zoom within. buildSceneInto still sizes the background
  // and positions content against scene.width/height (the world); only the visible frame
  // changes here.
  svg.setAttribute("width", String(scene.viewportWidth));
  svg.setAttribute("height", String(scene.viewportHeight));
  svg.setAttribute("viewBox", `0 0 ${scene.viewportWidth} ${scene.viewportHeight}`);

  const defs = document.createElementNS(SVG_NS, "defs");
  svg.appendChild(defs);

  const look = scene.look ?? "ink";
  applyTextureFilter(scene.texture, svg, defs);

  container.innerHTML = "";
  container.appendChild(svg);

  const rc = rough.svg(svg);
  const tl = gsap.timeline({ paused: true });
  const boilTargets: BoilTarget[] = [];
  const soundEvents: SoundEvent[] = [];

  const postSeek = buildSceneInto(scene, svg, rc, tl, boilTargets, soundEvents);

  return {
    svg,
    timeline: tl,
    soundEvents,
    // Block body deliberately: tl.seek() returns the Timeline itself, and callers invoke
    // this through Playwright's page.evaluate() — an implicit return would hand the whole
    // GSAP timeline object graph back for CDP serialization, which never completes.
    seekTo: (t: number) => {
      // "clay" holds each pose for a stop-motion cadence instead of tweening
      // continuously — quantizing the seek time itself, rather than anything per-shape,
      // so every downstream system (camera, drawOn, IK) just sees time move in discrete
      // jumps and needs no look-specific handling of its own.
      const st = look === "clay" ? Math.floor(t / CLAY_FRAME_HOLD) * CLAY_FRAME_HOLD : t;
      tl.seek(st, false);
      applyBoilAt(boilTargets, st);
      // Runs strictly after the seek has fully resolved every other tween — see
      // postSeek's own comment for why camera.follow can't safely read a moving
      // target's live position from inside the same seek pass.
      postSeek(st);
    },
    totalDuration: () => tl.duration(),
  };
}

const CLAY_FRAME_HOLD = 1 / 10; // ~10fps — a stop-motion cadence, not a continuous tween

/**
 * A Film is several scenes cut together into one render — each scene keeps its own local
 * timeline (built exactly like a standalone `mount`), nested into one master timeline via
 * GSAP's timeline composition (`masterTl.add(childTl, offset)`) rather than by threading a
 * time offset through every animation call. Scenes render at whatever size they declare;
 * each gets scaled and centered into the film's own canvas (a static transform, not
 * animated) so mismatched scene sizes still cut together cleanly.
 */
export function mountFilm(film: SerializedFilm, container: HTMLElement): MountResult {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(film.width));
  svg.setAttribute("height", String(film.height));
  svg.setAttribute("viewBox", `0 0 ${film.width} ${film.height}`);

  const defs = document.createElementNS(SVG_NS, "defs");
  svg.appendChild(defs);

  const filmBg = document.createElementNS(SVG_NS, "rect");
  filmBg.setAttribute("width", String(film.width));
  filmBg.setAttribute("height", String(film.height));
  filmBg.setAttribute("fill", film.background);
  svg.appendChild(filmBg);

  container.innerHTML = "";
  container.appendChild(svg);

  const rc = rough.svg(svg);
  const masterTl = gsap.timeline({ paused: true });
  const allBoilTargets: BoilTarget[] = [];
  const scenePostSeeks: Array<{ postSeek: (t: number) => void; enterAt: number }> = [];
  const soundEvents: SoundEvent[] = [];

  let cursor = 0;
  let prevWrapper: SVGGElement | null = null;
  // Index range into `soundEvents` for whichever entry is currently `prevWrapper` — lets the
  // NEXT entry's own iteration reach back and attach an outgoing gainRamp once it knows
  // whether it itself is a fade (and therefore what window the crossfade actually spans),
  // without re-walking the whole array to find them.
  let prevEntrySoundRange: [number, number] | null = null;

  film.entries.forEach((entry) => {
    const { scene, transition, transitionDuration, hold } = entry;
    // Scale/center against the scene's own OUTPUT FRAME (viewportWidth/Height — equal to
    // width/height unless scene.camera() is panning/zooming within a bigger world), not its
    // world size. A standalone render already draws this distinction (see cli.ts's
    // outputSize) — scaling by the world instead shrinks a wide-camera-world scene by
    // however much bigger its world is than its own viewport, which reads as the scene
    // rendering tiny and mis-positioned the instant it uses a camera inside a Film (a real
    // bug this fixes, not a style choice).
    const scale = Math.min(film.width / scene.viewportWidth, film.height / scene.viewportHeight);
    const offsetX = (film.width - scene.viewportWidth * scale) / 2;
    const offsetY = (film.height - scene.viewportHeight * scale) / 2;

    const wrapper = document.createElementNS(SVG_NS, "g");
    wrapper.setAttribute("transform", `translate(${offsetX}, ${offsetY}) scale(${scale})`);
    gsap.set(wrapper, { opacity: 0 });
    // A standalone render gets its camera-viewport crop for free from the outer <svg>'s own
    // viewBox (sized to viewportWidth/Height, which naturally clips anything the camera pans
    // out of view). A Film has one shared <svg> across every entry, so each wrapper needs
    // its own clip to the same viewportWidth/Height rect — without it, content a camera scene
    // pans away from is still in the DOM and still visible, spilling past the frame instead
    // of being cropped out of it.
    const clipId = nextUid("sk-film-clip");
    const clipPath = document.createElementNS(SVG_NS, "clipPath");
    clipPath.setAttribute("id", clipId);
    const clipRect = document.createElementNS(SVG_NS, "rect");
    clipRect.setAttribute("width", String(scene.viewportWidth));
    clipRect.setAttribute("height", String(scene.viewportHeight));
    clipPath.appendChild(clipRect);
    defs.appendChild(clipPath);
    wrapper.setAttribute("clip-path", `url(#${clipId})`);
    // Scoped to this one entry's own wrapper, not the whole film canvas — a texture on
    // scene A doesn't bleed into scene B's own (possibly texture-less, or differently
    // textured) frame. This is the fix for the pre-existing gap SceneTexture's own doc
    // comment mentions: watercolor/grain previously only applied in a standalone mount(),
    // never inside a Film at all.
    applyTextureFilter(scene.texture, wrapper, defs);
    svg.appendChild(wrapper);

    // Deliberately NOT `{ paused: true }`: a child timeline created paused stays inert
    // even after being nested into masterTl via .add() below — its tweens never advance
    // when the (paused) master seeks, so every shape in every scene after the first stays
    // stuck at its initial state. The master alone being paused is what keeps this whole
    // film seek-driven rather than auto-playing.
    const sceneTl = gsap.timeline();
    const sceneBoilTargets: BoilTarget[] = [];
    const entrySoundEvents: SoundEvent[] = [];
    const scenePostSeek = buildSceneInto(scene, wrapper, rc, sceneTl, sceneBoilTargets, entrySoundEvents);
    allBoilTargets.push(...sceneBoilTargets);

    const contentDuration = sceneTl.duration();
    const isFade = transition === "fade";
    const fadeDur = isFade ? Math.min(transitionDuration, Math.max(0.05, contentDuration / 2)) : 0;

    // A fading scene starts slightly before the previous one's slot ends, so the two
    // overlap and genuinely crossfade rather than each animating opacity in isolation.
    const enterAt = Math.max(0, cursor - fadeDur);

    masterTl.add(sceneTl, enterAt);
    scenePostSeeks.push({ postSeek: scenePostSeek, enterAt });
    // Same offset its visual timeline already gets via masterTl.add(sceneTl, enterAt) above
    // — a sound authored at `at: 2` in a scene entering the film at enterAt=5 actually plays
    // at master time 7, exactly like a moveTo at that scene-local time actually happens then.
    const entrySoundStart = soundEvents.length;
    for (const s of entrySoundEvents) soundEvents.push({ ...s, at: s.at + enterAt });
    const entrySoundEnd = soundEvents.length;

    if (isFade) {
      masterTl.fromTo(wrapper, { opacity: 0 }, { opacity: 1, duration: fadeDur, ease: "sine.inOut" }, enterAt);
      // Incoming half of the crossfade: this entry's own sound ramps in over the same
      // [enterAt, enterAt+fadeDur] window the visual fade-in already spans. Merged onto
      // whatever's already on the event (spread first), not overwritten — a middle entry's
      // sound still needs to keep this fadeIn when the NEXT entry later attaches its fadeOut.
      for (let i = entrySoundStart; i < entrySoundEnd; i++) {
        soundEvents[i] = { ...soundEvents[i], fadeIn: { at: enterAt, duration: fadeDur } };
      }
    } else {
      masterTl.set(wrapper, { opacity: 1 }, enterAt);
    }

    if (prevWrapper) {
      const hideAt = enterAt + fadeDur;
      masterTl.set(prevWrapper, { opacity: 0 }, hideAt);
      // Outgoing half: only for an actual fade (fadeDur > 0) — a cut transition keeps
      // today's flat-gain behavior on both sides, per SoundEvent's own doc comment. Merged
      // (spread first) so a middle entry's own fadeIn from its own iteration above survives.
      if (isFade && prevEntrySoundRange) {
        const [prevStart, prevEnd] = prevEntrySoundRange;
        for (let i = prevStart; i < prevEnd; i++) {
          soundEvents[i] = { ...soundEvents[i], fadeOut: { at: enterAt, duration: fadeDur } };
        }
      }
    }

    cursor = enterAt + contentDuration + hold;
    prevWrapper = wrapper;
    prevEntrySoundRange = [entrySoundStart, entrySoundEnd];
  });

  return {
    svg,
    timeline: masterTl,
    soundEvents,
    seekTo: (t: number) => {
      masterTl.seek(t, false);
      applyBoilAt(allBoilTargets, t);
      // Each scene's camera.follow reads happen after the FULL master seek resolves,
      // in the scene's own local time (its camera ops' `at` values are scene-relative,
      // not film-relative).
      for (const { postSeek, enterAt } of scenePostSeeks) postSeek(t - enterAt);
    },
    totalDuration: () => masterTl.duration(),
  };
}

// The world's backdrop sits at the farthest-back depth by convention — an "infinitely
// distant" plane that barely pans with the camera (see applyCameraLayers' parallax math),
// distinct from depth 1 (the default plane everything else without an explicit
// scene.layer() lives on).
const BACKDROP_DEPTH = 0;
const DEFAULT_LAYER_DEPTH = 1;

function buildSceneInto(
  scene: SerializedScene,
  container: SVGElement,
  rc: ReturnType<typeof rough.svg>,
  tl: gsap.core.Timeline,
  boilTargets: BoilTarget[],
  soundEvents: SoundEvent[]
): (t: number) => void {
  const look = scene.look ?? "ink";

  // Every depth in use gets its own group, appended in ascending depth order so farther
  // (smaller-depth) layers land behind nearer ones in the SVG paint order. A scene that
  // never calls scene.layer() ends up with exactly two groups (backdrop + the depth-1
  // default plane) — the same structure as before this existed, just named.
  const depths = new Set<number>([BACKDROP_DEPTH, DEFAULT_LAYER_DEPTH]);
  for (const node of scene.children) {
    depths.add(node.type === "group" && node.depth !== undefined ? node.depth : DEFAULT_LAYER_DEPTH);
  }
  const layerGroups = new Map<number, SVGGElement>();
  for (const depth of Array.from(depths).sort((a, b) => a - b)) {
    const g = document.createElementNS(SVG_NS, "g");
    container.appendChild(g);
    layerGroups.set(depth, g);
  }

  applyBackground(scene, layerGroups.get(BACKDROP_DEPTH)!);

  const ctx: BuildContext = {
    rc,
    tl,
    sceneSeed: scene.seed,
    look,
    boilTargets,
    pendingSprings: [] as PendingSpring[],
    pendingConnectors: [] as PendingConnector[],
    pendingParticles: [] as PendingParticleEmitter[],
    soundEvents,
  };
  for (const node of scene.children) {
    const depth = node.type === "group" && node.depth !== undefined ? node.depth : DEFAULT_LAYER_DEPTH;
    buildNode(node, layerGroups.get(depth)!, ctx);
  }

  const springsPostSeek = buildSprings(ctx.pendingSprings, scene, tl, container);
  // Connectors read a target's live resolved position the same way buildSprings' own
  // drivers do — runs after springsPostSeek specifically so a connector tracking a
  // springTo'd node sees that spring's position already resolved for this frame, not last
  // frame's stale one.
  const connectorsPostSeek = buildConnectors(ctx.pendingConnectors, scene, container, rc, look);
  // Particles depend on no other node's state (pure function of t and each particle's own
  // fixed params), so ordering relative to the others doesn't matter.
  const particlesPostSeek = buildParticles(ctx.pendingParticles, rc, tl, look);
  const cameraPostSeek = applyCameraLayers(layerGroups, scene, tl, container);

  // Same reservation particles needed for the same reason: a sketch.sound() is never
  // itself a tl.to() call, so nothing naturally extends the timeline to cover it — without
  // this, tl.duration() (and Film's own per-entry contentDuration, which reads this same
  // number) stops at the last visual animation and every note past that point gets muxed
  // into audio.wav but never actually reached by a --video export or a Film cut's timing.
  let desiredEnd = tl.duration();
  for (const s of soundEvents) desiredEnd = Math.max(desiredEnd, s.at + s.duration);
  if (desiredEnd > tl.duration()) tl.set({}, {}, desiredEnd);

  return (t: number) => {
    cameraPostSeek(t);
    springsPostSeek(t);
    connectorsPostSeek(t);
    particlesPostSeek(t);
  };
}

function buildNode(node: SerializedNode, parent: SVGElement, ctx: BuildContext): void {
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("data-id", node.id);
  applyInitialTransform(g, node);
  parent.appendChild(g);
  collectSprings(node, g, ctx.pendingSprings);

  if (node.type === "sound") {
    // No visual footprint at all — not even the usual artGroup/applyAnimations dance the
    // other build-time-fixed node types (particles, connector) go through, since there's
    // nothing on screen for moveTo/fadeTo/etc. to mean anything against. `at` is collected
    // as authored here; a Film shifts it by that entry's own cut offset afterward (see
    // mountFilm), the same way its visual timeline already gets offset.
    ctx.soundEvents.push({
      pitch: node.soundPitch ?? null,
      at: node.soundAt ?? 0,
      duration: node.soundDuration ?? 0.4,
      instrument: node.soundInstrument ?? "piano",
      velocity: node.soundVelocity ?? 0.8,
      pan: node.soundPan ?? 0,
    });
    return;
  }

  if (node.type === "particles") {
    collectParticles(node, g, ctx);
    // Same reasoning as connector/mesh3d/limb: moveTo/moveBy/rotateTo/scaleTo/fadeTo/
    // squashTo still animate `g`'s own flat transform normally (moving the whole emitter);
    // the particles' own positions are computed separately, in buildParticles' postSeek.
    applyAnimations(g, node, ctx, null);
    return;
  }

  if (node.type === "connector") {
    collectConnector(node, g, ctx);
    // Same reasoning as mesh3d/limb below: moveTo/moveBy/rotateTo/scaleTo/fadeTo/squashTo
    // still animate `g`'s own flat transform normally — the connector's actual path
    // geometry (anchor-to-target) is rebuilt separately, in buildConnectors' postSeek.
    applyAnimations(g, node, ctx, null);
    return;
  }

  if (node.type === "mesh3d") {
    buildMesh3D(node, g, ctx);
    // Still runs moveTo/moveBy/rotateTo/scaleTo/fadeTo/squashTo — those animate `g`'s own
    // flat transform exactly like any other node; only spin3d (handled above, inside
    // buildMesh3D) is mesh-specific. applyAnimations' switch no-ops on "spin3d" so it's
    // safe to iterate the same animations array a second time here.
    applyAnimations(g, node, ctx, null);
    return; // mesh3d has no 2D points/children of its own kind — nothing else below applies
  }

  if (node.type === "limb") {
    buildLimb(node, g, ctx);
    // Same reasoning as mesh3d above: moveTo/moveBy/rotateTo/scaleTo/fadeTo/squashTo still
    // animate `g`'s own flat transform (placing/orienting the whole chain); only ikTo
    // (handled inside buildLimb) is limb-specific, and applyAnimations no-ops on it.
    applyAnimations(g, node, ctx, null);
    return;
  }

  let draw: DrawTarget | null = null;

  if (node.type === "stroke" && node.points) {
    const smooth = node.style?.smooth ?? true;
    const d = pathFromPoints(node.points, !!node.closed, smooth);
    const baseSeed = ctx.sceneSeed ^ node.seed;

    // A node that will later morphTo() gets a single static rendering instead of the usual
    // boil variants — cycling to an un-morphed variant mid-boil would make the morphed
    // shape visibly snap back to its original geometry every ~0.1s. A non-"ink" look has
    // no jitter to re-roll in the first place (roughness/bowing are already 0), so it gets
    // a single static rendering too — extra boil variants of an identical path are wasted
    // DOM, not a visual difference.
    const hasMorph = node.animations.some((a) => a.kind === "morphTo");
    const variantCount = hasMorph || ctx.look !== "ink" ? 1 : BOIL_VARIANTS;

    // A gradient fill.color only renders as a real gradient when the effective fillStyle
    // is "solid" (hachure/cross-hatch/zigzag/dots are procedural line strokes with no
    // continuous area to gradient across — roughOptionsFor already degrades those to the
    // gradient's first stop on its own). Built once, shared across every boil variant
    // below, not rebuilt per variant.
    let styleForFill = node.style;
    if (
      node.closed &&
      node.style?.fill &&
      typeof node.style.fill.color !== "string" &&
      effectiveFillStyle(node.style, ctx.look) === "solid"
    ) {
      const defs = g.ownerSVGElement?.querySelector("defs");
      const gradUrl = buildShapeGradient(defs, node.style.fill.color);
      styleForFill = { ...node.style, fill: { ...node.style.fill, color: gradUrl } };
    }

    // Wrapped in its own group so drawOn can mask the whole rendered shape (stroke pass(es)
    // AND fill/hachure alike) as one unit, rather than needing to classify rough.js's
    // sub-elements by stroke vs. fill — which breaks for hachure/cross-hatch fills, since
    // rough.js renders those as *stroked* line segments too.
    const artGroup = document.createElementNS(SVG_NS, "g");
    const variants: SVGGElement[] = [];
    for (let i = 0; i < variantCount; i++) {
      const opts = roughOptionsFor(styleForFill ?? {}, baseSeed + i * 7919, !!node.closed, ctx.look);
      const rendered = ctx.rc.path(d, opts);
      const variantWrap = document.createElementNS(SVG_NS, "g");
      variantWrap.appendChild(rendered);
      variantWrap.style.opacity = i === 0 ? "1" : "0";
      artGroup.appendChild(variantWrap);
      variants.push(variantWrap);
    }
    g.appendChild(artGroup);
    if (!hasMorph) ctx.boilTargets.push({ variants });

    draw = {
      cleanPathD: d,
      strokeWidthPx: strokeWidthOf(node.style?.weight),
      closed: !!node.closed,
      points: node.points,
    };
  }

  if (node.children) {
    for (const child of node.children) {
      buildNode(child, g, ctx);
    }
  }

  applyAnimations(g, node, ctx, draw);
}

function applyInitialTransform(g: SVGGElement, node: SerializedNode): void {
  const t = node.transform;
  const props: Record<string, string | number> = {
    x: t.x,
    y: t.y,
    scale: t.scale,
    rotation: t.rotation,
    opacity: t.opacity,
  };
  // svgOrigin (not transformOrigin) takes a point in the SVG's own coordinate system rather
  // than a percentage of the element's bbox — what a pivot away from the shape's own center
  // needs (e.g. a limb rotating from a shoulder point outside its own bounds). Critically,
  // that coordinate system is the node's own PRE-TRANSLATE local space (the same space its
  // authored points live in), not the post-translate canvas position — GSAP computes
  // svgOrigin before applying x/y. `pivotAt`'s own doc comment calls it an "absolute canvas
  // point", which only happens to hold when t.x/t.y are 0 (every existing example pivots
  // either an untranslated node, or sets the pivot before any moveBy/initial({x,y}) lands on
  // the same node) — subtract the translate here so it's actually true in general. Caught by
  // a walker rig that combined `.initial({x,y})` with `.pivotAt()` on the same group: without
  // this, a small rotation flung the whole shape off-canvas.
  if (t.pivot) {
    props.svgOrigin = `${t.pivot[0] - t.x} ${t.pivot[1] - t.y}`;
  } else {
    // Percentage transformOrigin resolves against Chromium's default SVG transform-box
    // (the nearest viewport), not the element's own bbox — a `<g>` with no geometry of its
    // own (a Group is just a container) has no box for "50% 50%" to mean "my own center"
    // against, so it silently fell back to the canvas/viewport origin. Two independent
    // diverse-style sessions hit this the same way: squashTo/rotateTo on a plain Group with
    // no .pivotAt() scaled/rotated around the SVG origin instead of the group's own bbox
    // center. Compute that center explicitly, in the same pre-translate local space as the
    // explicit-pivot branch above, instead of leaning on the browser's default box.
    const bbox = computeNodeBBox(node);
    if (bbox) {
      const [cx, cy] = anchorPoint(bbox, "center");
      props.svgOrigin = `${cx - t.x} ${cy - t.y}`;
    } else {
      props.transformOrigin = "50% 50%";
    }
  }
  gsap.set(g, props);
}

function applyAnimations(g: SVGGElement, node: SerializedNode, ctx: BuildContext, draw: DrawTarget | null): void {
  const { tl } = ctx;
  for (const op of node.animations) {
    const at = op.at ?? 0;

    switch (op.kind) {
      case "drawOn":
        // Duration is intentionally NOT defaulted here — applyDrawOn derives it from the
        // path's actual length when omitted, rather than every shape sharing one flat pace.
        applyDrawOn(g, tl, at, op.duration, op.ease ?? HAND_DRAWN_EASE, draw, ctx.look);
        break;
      case "appear": {
        const duration = op.duration ?? 0.6;
        const ease = op.ease ?? "power2.out";
        gsap.set(g, { opacity: 0 });
        tl.to(g, { opacity: 1, duration, ease }, at);
        break;
      }
      case "moveTo": {
        const bbox = computeNodeBBox(node);
        const [refX, refY] = bbox ? anchorPoint(bbox, op.anchor) : [0, 0];
        tl.to(g, { x: op.x - refX, y: op.y - refY, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      }
      case "moveBy": {
        // Only the axes that actually move get a tween. That looks like a micro-optimization
        // and isn't: `x: "+=0"` is still a live tween on `x`, so a vertical bob authored as
        // its own overlapping `moveBy(0, -3)` used to fight the horizontal `moveBy(dx, 0)`
        // running underneath it — two tweens writing the same property, the later one pinning
        // it to whatever value it captured when it started. The symptom was silent and awful:
        // a hand-built walk cycle (body stride + body bob, the obvious way to write one)
        // covered roughly a tenth of the ground it should have, with no error anywhere.
        // Skipping the zero axis means the two compose instead of colliding.
        const vars: Record<string, string | number> = {
          duration: op.duration ?? 0.6,
          ease: op.ease ?? "power2.out",
        };
        if (op.dx !== 0) vars.x = `+=${op.dx}`;
        if (op.dy !== 0) vars.y = `+=${op.dy}`;
        // A genuine no-op still needs to occupy its window on the timeline, so callers can
        // use moveBy(0, 0) as a beat/hold without it collapsing to zero duration.
        if (op.dx === 0 && op.dy === 0) vars.x = "+=0";
        tl.to(g, vars, at);
        break;
      }
      case "scaleTo":
        tl.to(g, { scale: op.scale, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      case "rotateTo":
        tl.to(g, { rotation: op.degrees, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      case "rotateBy":
        // GSAP's own "+=" relative-value syntax resolves against whatever rotation is
        // actually live when this tween starts playing (mid-chain through an earlier
        // rotateTo/rotateBy included) — the same mechanism moveBy's "+=" already relies on
        // for position, so a repeated relative turn composes correctly without computing
        // an absolute target from the previous op's own end value by hand.
        tl.to(g, { rotation: `+=${op.degrees}`, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      case "fadeTo":
        tl.to(g, { opacity: op.opacity, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      case "morphTo":
        applyMorphTo(g, ctx, at, op.duration ?? 0.8, op.ease ?? "power2.inOut", op.points, node);
        break;
      case "squashTo":
        tl.to(
          g,
          { scaleX: op.scaleX, scaleY: op.scaleY, duration: op.duration ?? 0.3, ease: op.ease ?? "power2.out" },
          at
        );
        break;
      case "springTo":
        // Handled by collectSprings/buildSprings instead — its position can't be built as
        // a normal tween here, since it depends on precomputing the driver's whole
        // trajectory first (buildSprings also reserves this spring's own settle time on
        // `tl`, once it can see every other tween's natural end).
        break;
      case "moveAlong": {
        // op.points are authored in absolute canvas coordinates like every other point
        // in this library — MotionPathPlugin animates the same x/y transform moveTo
        // does, which is an *offset* from the node's own authored position, not an
        // absolute one. Re-anchor each point the same way moveTo re-anchors its target.
        const bbox = computeNodeBBox(node);
        const [refX, refY] = bbox ? anchorPoint(bbox, op.anchor) : [0, 0];
        const path = op.points.map(([x, y]) => ({ x: x - refX, y: y - refY }));
        tl.to(
          g,
          {
            motionPath: { path, autoRotate: !!op.rotate, curviness: 1.25 },
            duration: op.duration ?? 1.2,
            ease: op.ease ?? "power1.inOut",
          },
          at
        );
        break;
      }
    }
  }
}
