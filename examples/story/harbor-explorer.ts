import { sketch, type Group, type Limb, type NodeStyle, type Scene, type Stroke } from "../../src/index.js";

// A young explorer arrives by steamship at a bustling foreign harbor, wades through dock
// chaos (porters, cranes, cargo), follows a discovered map to a meeting, and watches the
// ship depart — six scenes cut together with sketch.film(), built entirely in look: "flat"
// for a crisp ligne-claire/Tintin-adjacent register instead of the repo's more common
// look: "ink". One of the diversity batch's five look/texture proof pieces; see AGENTS.md's
// Look and texture section for what "flat" actually changes.

const W = 640;
const H = 420;
const INK = "#17212b";
const SKY = "#83c9df";
const SEA = "#2386a8";
const SEA_DARK = "#17627d";
const CREAM = "#f7e7ba";
const DOCK = "#c88f55";
const DOCK_DARK = "#8b5a35";
const CORAL = "#e85d4a";
const GOLD = "#f1bd3f";
const TEAL = "#168f8a";
const COBALT = "#2862a8";
const GREEN = "#4c9b63";
const SKIN = "#d99864";
const HAIR = "#8b3f2c";
const WHITE = "#fff7de";
const SHADOW = "#33485a";

const solid = (color: string, weight: NodeStyle["weight"] = "bold"): NodeStyle => ({
  color: INK,
  weight,
  looseness: 0,
  energy: "calm",
  smooth: false,
  fill: { color, style: "solid" },
});

const line = (color = INK, weight: NodeStyle["weight"] = "bold"): NodeStyle => ({
  color,
  weight,
  looseness: 0,
  energy: "calm",
});

function rect(x: number, y: number, width: number, height: number, color: string, weight: NodeStyle["weight"] = "bold") {
  return sketch.loop([[x, y], [x + width, y], [x + width, y + height], [x, y + height]], solid(color, weight)).lintIgnore("overlap");
}

function crate(x: number, y: number, width = 70, height = 55, color = GOLD) {
  const box = rect(x, y, width, height, color);
  const braceA = sketch.stroke([[x + 7, y + 7], [x + width - 7, y + height - 7]], line(DOCK_DARK, "confident")).lintIgnore("overlap");
  const braceB = sketch.stroke([[x + width - 7, y + 7], [x + 7, y + height - 7]], line(DOCK_DARK, "confident")).lintIgnore("overlap");
  return sketch.group([box, braceA, braceB]);
}

function addWater(scene: Scene, y: number, width = W) {
  scene.add(rect(-20, y, width + 40, H - y + 30, SEA).named("harbor-water")).appear({ at: 0, duration: 0.35 });
  for (let i = 0; i < 6; i++) {
    const wave = sketch.stroke([[20 + i * 105, y + 34 + (i % 2) * 20], [65 + i * 105, y + 30 + (i % 2) * 20], [95 + i * 105, y + 34 + (i % 2) * 20]], line(WHITE, "light")).named(`water-highlight-${i}`);
    scene.add(wave).drawOn({ at: 0.4 + i * 0.15, duration: 0.5 });
    wave.moveBy(18, 0, { at: 3 + i * 0.2, duration: 3.2, ease: "sine.inOut" });
    wave.moveBy(-18, 0, { at: 6.2 + i * 0.2, duration: 3.2, ease: "sine.inOut" });
  }
}

function addDock(scene: Scene, y: number, width = W) {
  scene.add(rect(-20, y, width + 40, H - y + 30, DOCK).named("wooden-dock")).appear({ at: 0, duration: 0.3 });
  for (let x = 10; x < width; x += 92) {
    scene.add(sketch.stroke([[x, y + 6], [x, H + 8]], line(DOCK_DARK, "light")).named(`dock-plank-${x}`)).appear({ at: 0, duration: 0.2 });
  }
  scene.add(sketch.stroke([[0, y + 20], [width, y + 20]], line(DOCK_DARK, "confident")).named("dock-edge")).appear({ at: 0, duration: 0.2 });
}

function addHarborBuildings(scene: Scene, groundY: number, worldWidth = W) {
  const colors = [CREAM, CORAL, TEAL, GOLD, COBALT, GREEN];
  for (let x = 7, i = 0; x <= worldWidth - 133; x += 145, i++) {
    const height = 105 + (i % 3) * 24;
    const building = rect(x, groundY - height, 126, height, colors[i % colors.length]).named(`harbor-building-${i}`);
    scene.add(building).appear({ at: 0, duration: 0.35 });
    const roof = sketch.loop([[x - 7, groundY - height], [x + 63, groundY - height - 30], [x + 133, groundY - height]], solid(i % 2 ? CORAL : COBALT)).named(`harbor-roof-${i}`).lintIgnore("overlap");
    scene.add(roof).appear({ at: 0, duration: 0.35 });
    for (let w = 0; w < 3; w++) {
      scene.add(rect(x + 17 + w * 36, groundY - height + 30, 19, 26, SKY, "confident").named(`building-window-${i}-${w}`).lintIgnore("overlap")).appear({ at: 0, duration: 0.25 });
    }
  }
}

function steamship(cx = 320, cy = 190) {
  const hull = sketch.loop([[cx - 240, cy + 30], [cx + 230, cy + 30], [cx + 190, cy + 112], [cx - 175, cy + 112], [cx - 225, cy + 72]], solid(COBALT)).named("steamship-hull").lintIgnore("overlap");
  const stripe = rect(cx - 195, cy + 42, 370, 18, WHITE, "confident").named("steamship-stripe");
  const deck = rect(cx - 145, cy - 42, 270, 72, CREAM).named("steamship-deckhouse");
  const roof = rect(cx - 160, cy - 58, 300, 18, CORAL).named("steamship-roof");
  const bridge = rect(cx + 55, cy - 104, 92, 62, WHITE).named("steamship-bridge");
  const funnelA = rect(cx - 95, cy - 126, 38, 68, CORAL).named("steamship-funnel-a");
  const funnelB = rect(cx - 25, cy - 126, 38, 68, CORAL).named("steamship-funnel-b");
  const funnelBandA = rect(cx - 95, cy - 126, 38, 15, INK, "confident").named("funnel-band-a");
  const funnelBandB = rect(cx - 25, cy - 126, 38, 15, INK, "confident").named("funnel-band-b");
  const mast = sketch.stroke([[cx + 118, cy - 104], [cx + 118, cy - 190]], line(INK, "bold")).named("steamship-mast");
  const pennant = sketch.loop([[cx + 118, cy - 188], [cx + 176, cy - 170], [cx + 118, cy - 158]], solid(GOLD)).named("steamship-pennant").lintIgnore("overlap");
  const rail = sketch.stroke([[cx - 190, cy + 18], [cx - 190, cy - 8], [cx + 190, cy - 8], [cx + 190, cy + 18]], line(INK, "confident")).named("steamship-rail");
  const windows = sketch.group();
  for (let i = 0; i < 6; i++) windows.add(sketch.ellipse(cx - 112 + i * 48, cy - 10, 11, 11, solid(SKY, "confident")).named(`steamship-porthole-${i}`).lintIgnore("overlap"));
  return sketch.group([hull, stripe, deck, roof, bridge, funnelA, funnelB, funnelBandA, funnelBandB, mast, pennant, rail, windows]).named("steamship");
}

type Walker = { group: Group; legL: Limb; legR: Limb; armL: Limb; armR: Limb };

function explorer(): Walker {
  const legL = sketch.limb(-11, -52, 46, 46, line(INK, "bold"), { bend: 1, capRadius: 7, capColor: DOCK_DARK }).named("explorer-left-leg");
  const legR = sketch.limb(11, -52, 46, 46, line(INK, "bold"), { bend: -1, capRadius: 7, capColor: DOCK_DARK }).named("explorer-right-leg");
  legL.restAt(-11, 0);
  legR.restAt(11, 0);
  const backpack = rect(-39, -111, 27, 53, GREEN).named("explorer-backpack").lintIgnore("overlap");
  const torso = sketch.loop([[-25, -112], [22, -112], [28, -50], [-28, -50]], solid(GOLD)).named("explorer-jacket").lintIgnore("overlap");
  const scarf = sketch.loop([[-23, -109], [19, -109], [12, -95], [-16, -95]], solid(CORAL, "confident")).named("explorer-scarf").lintIgnore("overlap");
  const armL = sketch.limb(-22, -103, 24, 25, line(INK, "bold"), { bend: 1, capRadius: 6, capColor: SKIN }).named("explorer-left-arm");
  const armR = sketch.limb(20, -103, 24, 25, line(INK, "bold"), { bend: -1, capRadius: 6, capColor: SKIN }).named("explorer-right-arm");
  armL.restAt(-28, -58);
  armR.restAt(28, -58);
  armL.pivotAt(-22, -103);
  armR.pivotAt(20, -103);
  const head = sketch.ellipse(0, -139, 21, 24, solid(SKIN)).named("explorer-head").lintIgnore("overlap");
  const hair = sketch.loop([[-18, -149], [-9, -165], [7, -166], [19, -151], [10, -153], [2, -146], [-8, -153]], solid(HAIR, "confident")).named("explorer-hair").lintIgnore("overlap");
  const cap = sketch.loop([[-22, -159], [-8, -177], [12, -176], [23, -157]], solid(TEAL)).named("explorer-cap").lintIgnore("overlap");
  const brim = sketch.stroke([[8, -157], [31, -154]], line(INK, "bold")).named("explorer-cap-brim").lintIgnore("overlap");
  const eye = sketch.ellipse(8, -137, 2.5, 3, solid(INK, "light")).named("explorer-eye").lintIgnore("overlap");
  const group = sketch.group([backpack, legL, legR, torso, scarf, armL, armR, head, hair, cap, brim, eye]).named("young-explorer");
  return { group, legL, legR, armL, armR };
}

function porter(coat = CORAL, cargo = GOLD) {
  const legL = sketch.limb(-10, -48, 40, 40, line(INK, "bold"), { bend: 1, capRadius: 7, capColor: DOCK_DARK });
  const legR = sketch.limb(10, -48, 40, 40, line(INK, "bold"), { bend: -1, capRadius: 7, capColor: DOCK_DARK });
  legL.restAt(-10, 0);
  legR.restAt(10, 0);
  const body = sketch.loop([[-24, -108], [24, -108], [28, -46], [-28, -46]], solid(coat)).lintIgnore("overlap");
  const head = sketch.ellipse(0, -134, 19, 22, solid(SKIN)).lintIgnore("overlap");
  const cap = sketch.loop([[-20, -145], [-9, -158], [14, -155], [22, -143]], solid(COBALT)).lintIgnore("overlap");
  const load = crate(-38, -105, 76, 53, cargo);
  const group = sketch.group([legL, legR, body, head, cap, load]);
  return { group, legL, legR };
}

function courier() {
  const legL = sketch.limb(-9, -49, 29, 31, line(INK, "bold"), { bend: 1, capRadius: 7, capColor: INK }).named("courier-left-leg");
  const legR = sketch.limb(9, -49, 29, 31, line(INK, "bold"), { bend: -1, capRadius: 7, capColor: INK }).named("courier-right-leg");
  legL.restAt(-9, 0);
  legR.restAt(9, 0);
  const coat = sketch.loop([[-24, -112], [24, -112], [34, -45], [-34, -45]], solid(COBALT)).named("courier-cobalt-coat").lintIgnore("overlap");
  const arm = sketch.limb(-20, -101, 24, 26, line(INK, "bold"), { bend: 1, capRadius: 6, capColor: SKIN }).named("courier-arm");
  arm.restAt(-33, -61);
  arm.pivotAt(-20, -101);
  const head = sketch.ellipse(0, -140, 20, 23, solid(SKIN)).named("courier-head").lintIgnore("overlap");
  const hat = sketch.loop([[-25, -154], [-12, -174], [17, -171], [26, -151]], solid(CORAL)).named("courier-red-hat").lintIgnore("overlap");
  const brim = sketch.stroke([[-31, -151], [31, -151]], line(INK, "bold")).named("courier-hat-brim").lintIgnore("overlap");
  const group = sketch.group([legL, legR, coat, arm, head, hat, brim]).named("mysterious-courier");
  return { group, legL, legR, arm };
}

function crane(scene: Scene, x: number, groundY: number, startAt: number, name: string) {
  const tower = rect(x - 20, groundY - 180, 40, 180, GOLD).named(`${name}-tower`);
  const crossA = sketch.stroke([[x - 16, groundY - 165], [x + 16, groundY - 115], [x - 16, groundY - 65], [x + 16, groundY - 15]], line(INK, "confident")).named(`${name}-tower-brace-a`).lintIgnore("overlap");
  const crossB = sketch.stroke([[x + 16, groundY - 165], [x - 16, groundY - 115], [x + 16, groundY - 65], [x - 16, groundY - 15]], line(INK, "confident")).named(`${name}-tower-brace-b`).lintIgnore("overlap");
  const boom = sketch.group([
    sketch.stroke([[x, groundY - 180], [x + 190, groundY - 250]], line(INK, "bold")).lintIgnore("overlap"),
    sketch.stroke([[x, groundY - 180], [x + 184, groundY - 228]], line(INK, "confident")).lintIgnore("overlap"),
    sketch.stroke([[x + 30, groundY - 190], [x + 55, groundY - 231], [x + 85, groundY - 208], [x + 115, groundY - 244], [x + 145, groundY - 220], [x + 184, groundY - 250]], line(INK, "light")).lintIgnore("overlap"),
  ]).named(`${name}-boom`);
  boom.pivotAt(x, groundY - 180);
  const load = sketch.group([
    sketch.stroke([[x + 165, groundY - 238], [x + 165, groundY - 90]], line(INK, "confident")),
    crate(x + 125, groundY - 90, 80, 62, CORAL),
  ]).named(`${name}-swinging-load`);
  load.pivotAt(x + 165, groundY - 238);
  scene.add(tower).appear({ at: 0, duration: 0.3 });
  scene.add(crossA).appear({ at: 0, duration: 0.3 });
  scene.add(crossB).appear({ at: 0, duration: 0.3 });
  scene.add(boom).appear({ at: 0, duration: 0.3 });
  scene.add(load).appear({ at: startAt, duration: 0.3 });
  boom.rotateTo(-5, { at: startAt, duration: 2.2, ease: "sine.inOut" });
  boom.rotateTo(4, { at: startAt + 2.2, duration: 2.2, ease: "sine.inOut" });
  boom.rotateTo(-2, { at: startAt + 4.4, duration: 2.2, ease: "sine.inOut" });
  load.rotateTo(8, { at: startAt, duration: 2.2, ease: "sine.inOut" });
  load.rotateTo(-7, { at: startAt + 2.2, duration: 2.2, ease: "sine.inOut" });
  load.rotateTo(3, { at: startAt + 4.4, duration: 2.2, ease: "sine.inOut" });
}

function awning(scene: Scene, x: number, y: number, width: number, label: string) {
  scene.add(rect(x, y, width, 116, CREAM).named(`${label}-stall`)).appear({ at: 0, duration: 0.3 });
  const stripes = sketch.group();
  const stripeWidth = width / 6;
  for (let i = 0; i < 6; i++) stripes.add(rect(x + i * stripeWidth, y - 30, stripeWidth, 32, i % 2 ? WHITE : CORAL, "confident").lintIgnore("overlap"));
  scene.add(stripes.named(`${label}-awning`)).appear({ at: 0, duration: 0.3 });
  scene.add(rect(x - 8, y + 75, width + 16, 24, TEAL).named(`${label}-counter`)).appear({ at: 0, duration: 0.3 });
  for (let i = 0; i < 5; i++) scene.add(sketch.ellipse(x + 25 + i * 33, y + 62 - (i % 2) * 8, 11, 9, solid(i % 2 ? GOLD : GREEN, "confident")).named(`${label}-market-goods-${i}`)).appear({ at: 0, duration: 0.25 });
}

function compass(cx: number, cy: number, radius: number) {
  const ring = sketch.ellipse(cx, cy, radius, radius, solid(WHITE, "confident")).named("compass-ring");
  const north = sketch.loop([[cx, cy - radius + 4], [cx + 7, cy], [cx, cy + 6], [cx - 7, cy]], solid(CORAL, "confident")).named("compass-north").lintIgnore("overlap");
  const south = sketch.loop([[cx, cy + radius - 4], [cx + 7, cy], [cx, cy - 6], [cx - 7, cy]], solid(COBALT, "confident")).named("compass-south").lintIgnore("overlap");
  return sketch.group([ring, north, south]).named("compass-emblem");
}

const scene1 = sketch.scene({ width: W, height: H, background: SKY, seed: "harbor-explorer-arrival", look: "flat" }).duration(14);
addWater(scene1, 245);
const skyline1 = scene1.layer(0.45);
for (let i = 0; i < 7; i++) skyline1.add(rect(i * 92, 175 - (i % 3) * 18, 76, 70 + (i % 3) * 18, i % 2 ? CREAM : CORAL, "confident"));
const quay1 = rect(470, 250, 190, 170, DOCK).named("arrival-quay");
scene1.add(quay1).appear({ at: 0, duration: 0.3 });
const ship1 = steamship();
ship1.initial({ x: -195 });
scene1.add(ship1).appear({ at: 0.4, duration: 0.5 });
ship1.moveBy(120, 0, { at: 0.5, duration: 8.5, ease: "sine.out" });
scene1.add(sketch.particles(30, 58, { color: WHITE }, { count: 30, angle: -90, spread: 70, speedMin: 15, speedMax: 38, gravity: -8, lifetime: 2.8, duration: 7.8, at: 0.8, sizeMin: 5, sizeMax: 12, moveTo: { x: 150, y: 58, duration: 8.5, ease: "sine.out" } }).named("arrival-steam-smoke"));
crane(scene1, 465, 365, 3.2, "arrival-crane");
const portSign = sketch.text("port azur", 430, 92, line(INK, "bold"), { size: 25 }).named("port-name");
scene1.add(portSign).stagger(0.12, { at: 8.8, duration: 0.4, effect: "drawOn" });
scene1.camera().panTo(320, 210, { at: 0, duration: 14, ease: "sine.inOut" });
scene1.add(sketch.sound("D2", { at: 0, duration: 13.8, instrument: "pad", velocity: 0.26, pan: -0.2 }));
scene1.add(sketch.sound("A2", { at: 0.2, duration: 13.5, instrument: "pad", velocity: 0.2, pan: 0.2 }));
scene1.add(sketch.sound("C2", { at: 7.6, duration: 2.3, instrument: "strings", velocity: 0.82, pan: -0.35 }));
scene1.add(sketch.sound("G2", { at: 7.8, duration: 2.1, instrument: "strings", velocity: 0.68, pan: -0.25 }));

const scene2 = sketch.scene({ width: W, height: H, background: SKY, seed: "harbor-explorer-gangplank", look: "flat" }).duration(13);
addWater(scene2, 300);
scene2.add(rect(-30, 70, 330, 250, COBALT).named("ship-side-closeup")).appear({ at: 0, duration: 0.3 });
scene2.add(rect(-20, 108, 310, 25, WHITE).named("ship-side-stripe").lintIgnore("overlap")).appear({ at: 0, duration: 0.3 });
for (let i = 0; i < 4; i++) scene2.add(sketch.ellipse(55 + i * 66, 175, 16, 16, solid(SKY, "confident")).named(`close-porthole-${i}`)).appear({ at: 0, duration: 0.25 });
addDock(scene2, 344);
const gangway = sketch.group([
  sketch.loop([[205, 205], [422, 335], [414, 350], [195, 218]], solid(CORAL)).named("gangplank-ramp").lintIgnore("overlap"),
  sketch.stroke([[210, 190], [427, 320]], line(INK, "bold")).named("gangplank-rail").lintIgnore("overlap"),
]);
scene2.add(gangway.named("gangplank")).appear({ at: 0.4, duration: 0.45 });
const explorer2 = explorer();
explorer2.group.initial({ x: 205, y: 205, scale: 0.86 });
scene2.add(explorer2.group).appear({ at: 1.0, duration: 0.4 });
explorer2.group.moveBy(214, 139, { at: 1.5, duration: 5.0, ease: "sine.inOut" });
for (let i = 0; i < 4; i++) {
  const at = 1.5 + i * 1.2;
  const lead = i % 2 === 0 ? explorer2.legL : explorer2.legR;
  lead.ikTo(i % 2 === 0 ? -5 : 5, -18, { at, duration: 0.55, ease: "sine.out" });
  lead.ikTo(i % 2 === 0 ? -11 : 11, 0, { at: at + 0.55, duration: 0.55, ease: "sine.in" });
}
explorer2.group.squashTo(1.08, 0.91, { at: 6.5, duration: 0.25, ease: "power2.out" });
explorer2.group.squashTo(1, 1, { at: 6.75, duration: 0.35, ease: "back.out(1.8)" });
sketch.walk({ body: explorer2.group, legs: [{ limb: explorer2.legL, hipX: -11 }, { limb: explorer2.legR, hipX: 11 }], arms: [{ node: explorer2.armL, swingAngle: 15 }, { node: explorer2.armR, swingAngle: 15 }], steps: 3, stepLength: 43, groundY: 0, stepDuration: 0.82, liftHeight: 19, bodyBob: 4, at: 7.4 });
const porter2 = porter(GREEN, CORAL);
porter2.group.initial({ x: 610, y: 344, scale: 0.82 });
scene2.add(porter2.group).appear({ at: 0.8, duration: 0.3 });
sketch.walk({ body: porter2.group, legs: [{ limb: porter2.legL, hipX: -10 }, { limb: porter2.legR, hipX: 10 }], steps: 7, stepLength: -48, groundY: 0, stepDuration: 0.82, liftHeight: 17, bodyBob: 4, at: 2.2 });
scene2.camera().panTo(320, 210, { at: 0, duration: 13, ease: "sine.inOut" });
scene2.add(sketch.sound("E3", { at: 0, duration: 12.8, instrument: "pad", velocity: 0.24 }));
for (let i = 0; i < 5; i++) scene2.add(sketch.sound(null, { at: 2.2 + i * 1.2, duration: 0.12, instrument: "thud", velocity: 0.2 + i * 0.025, pan: 0.1 }));
scene2.add(sketch.sound("G4", { at: 6.6, duration: 0.45, instrument: "pluck", velocity: 0.55 }));

const WORLD3 = 1900;
const scene3 = sketch.scene({ width: WORLD3, height: H, viewport: { width: W, height: H }, background: SKY, seed: "harbor-explorer-dock-chaos", look: "flat" }).duration(22);
const backdrop3 = scene3.layer(0.52);
for (let x = 5, i = 0; x <= WORLD3 - 131; x += 145, i++) {
  const height = 116 + (i % 4) * 18;
  backdrop3.add(rect(x, 290 - height, 126, height, [CREAM, CORAL, TEAL, GOLD][i % 4], "confident"));
  backdrop3.add(sketch.loop([[x - 5, 290 - height], [x + 63, 260 - height], [x + 131, 290 - height]], solid(i % 2 ? COBALT : CORAL, "confident")).lintIgnore("overlap"));
}
addDock(scene3, 300, WORLD3);
for (let x = 80; x < WORLD3; x += 230) {
  const stack = sketch.group([crate(x, 254, 62, 46, x % 460 ? GOLD : CORAL), crate(x + 66, 244, 74, 56, x % 460 ? TEAL : GREEN)]).named(`crate-stack-${x}`);
  scene3.add(stack).appear({ at: 0, duration: 0.25 });
}
crane(scene3, 650, 300, 2.2, "dock-crane-a");
crane(scene3, 1320, 300, 9.0, "dock-crane-b");
awning(scene3, 1580, 180, 210, "spice-market");
const explorer3 = explorer();
explorer3.group.initial({ x: 300, y: 346, scale: 0.82 });
scene3.add(explorer3.group).appear({ at: 0.5, duration: 0.35 });
const explorerWalk3 = sketch.walk({ body: explorer3.group, legs: [{ limb: explorer3.legL, hipX: -11 }, { limb: explorer3.legR, hipX: 11 }], arms: [{ node: explorer3.armL, swingAngle: 18 }, { node: explorer3.armR, swingAngle: 18 }], steps: 16, stepLength: 62, groundY: 0, stepDuration: 1.03, liftHeight: 20, bodyBob: 4, at: 2.0 });
const porter3a = porter(CORAL, GOLD);
porter3a.group.named("westbound-porter").initial({ x: 1050, y: 346, scale: 0.78 });
scene3.add(porter3a.group).appear({ at: 1.0, duration: 0.3 });
sketch.walk({ body: porter3a.group, legs: [{ limb: porter3a.legL, hipX: -10 }, { limb: porter3a.legR, hipX: 10 }], steps: 8, stepLength: -55, groundY: 0, stepDuration: 0.9, liftHeight: 17, bodyBob: 4, at: 3.2 });
const porter3b = porter(TEAL, CORAL);
porter3b.group.named("eastbound-porter").initial({ x: 880, y: 350, scale: 0.72 });
scene3.add(porter3b.group).appear({ at: 4.0, duration: 0.3 });
sketch.walk({ body: porter3b.group, legs: [{ limb: porter3b.legL, hipX: -10 }, { limb: porter3b.legR, hipX: 10 }], steps: 9, stepLength: 50, groundY: 0, stepDuration: 0.88, liftHeight: 17, bodyBob: 4, at: 5.0 });
const handcart3 = sketch.group([
  rect(0, -36, 145, 38, GREEN).named("handcart-bed"),
  sketch.ellipse(26, 12, 19, 19, solid(DOCK_DARK)).named("handcart-wheel-a"),
  sketch.ellipse(122, 12, 19, 19, solid(DOCK_DARK)).named("handcart-wheel-b"),
  crate(38, -91, 68, 55, GOLD),
]).named("moving-handcart");
handcart3.initial({ x: 1500, y: 340, scale: 0.8 });
scene3.add(handcart3).appear({ at: 2.0, duration: 0.3 });
handcart3.moveBy(-680, 0, { at: 4.5, duration: 9.5, ease: "none" });
const courier3 = courier();
courier3.group.initial({ x: 1510, y: 348, scale: 0.76 });
scene3.add(courier3.group).appear({ at: 16.2, duration: 0.5 });
courier3.arm.rotateTo(-45, { at: 17.2, duration: 0.7, ease: "sine.out" });
const envelope3 = rect(1480, 228, 35, 22, CORAL).named("distant-red-envelope");
scene3.add(envelope3).appear({ at: 17.5, duration: 0.35 });
envelope3.moveBy(0, 38, { at: 18.0, duration: 1.0, ease: "sine.in" });
explorer3.group.rotateTo(-4, { at: explorerWalk3.endAt, duration: 0.55, ease: "sine.out" });
const cam3 = scene3.camera();
cam3.panTo(320, 210, { at: 0, duration: 0 });
cam3.panTo(1292, 210, { at: 2.0, duration: 16.48, ease: "none" });
scene3.add(sketch.sound("D3", { at: 0, duration: 21.8, instrument: "pad", velocity: 0.2 }));
for (let i = 0; i < 16; i++) scene3.add(sketch.sound(null, { at: 2.45 + i * 1.03, duration: 0.08, instrument: "brush", velocity: 0.14, pan: (i % 3 - 1) * 0.45 }));
scene3.add(sketch.sound("A4", { at: 17.6, duration: 0.5, instrument: "pluck", velocity: 0.7, pan: 0.4 }));
scene3.add(sketch.sound("E5", { at: 18.1, duration: 0.8, instrument: "pluck", velocity: 0.62, pan: 0.35 }));

const scene4 = sketch.scene({ width: W, height: H, background: CREAM, seed: "harbor-explorer-red-envelope", look: "flat" }).duration(15);
addHarborBuildings(scene4, 305);
addDock(scene4, 305);
awning(scene4, 360, 165, 220, "compass-stall");
const courier4 = courier();
courier4.group.initial({ x: 490, y: 350, scale: 0.88 });
scene4.add(courier4.group).appear({ at: 0.5, duration: 0.4 });
const explorer4 = explorer();
explorer4.group.initial({ x: 42, y: 350, scale: 0.86 });
scene4.add(explorer4.group).appear({ at: 0.7, duration: 0.4 });
sketch.walk({ body: explorer4.group, legs: [{ limb: explorer4.legL, hipX: -11 }, { limb: explorer4.legR, hipX: 11 }], arms: [{ node: explorer4.armL, swingAngle: 16 }, { node: explorer4.armR, swingAngle: 16 }], steps: 5, stepLength: 43, groundY: 0, stepDuration: 0.9, liftHeight: 18, bodyBob: 4, at: 1.5 });
const envelope4 = rect(457, 225, 48, 30, CORAL).named("red-envelope");
scene4.add(envelope4).appear({ at: 2.0, duration: 0.35 });
envelope4.moveBy(0, 55, { at: 3.0, duration: 1.2, ease: "sine.inOut" });
courier4.arm.rotateTo(-62, { at: 2.5, duration: 0.7, ease: "sine.out" });
courier4.arm.rotateTo(0, { at: 4.3, duration: 0.7, ease: "sine.inOut" });
const emblem4 = compass(481, 295, 15);
emblem4.initial({ scale: 0.2, opacity: 0 });
scene4.add(emblem4);
emblem4.appear({ at: 6.4, duration: 0.3 });
emblem4.scaleTo(1, { at: 6.4, duration: 0.7, ease: "back.out(1.8)" });
const rayGroup4 = sketch.group();
for (let i = 0; i < 8; i++) {
  const a = i * Math.PI / 4;
  rayGroup4.add(sketch.stroke([[481 + Math.cos(a) * 24, 295 + Math.sin(a) * 24], [481 + Math.cos(a) * 39, 295 + Math.sin(a) * 39]], line(GOLD, "confident")));
}
scene4.add(rayGroup4.named("compass-glint")).stagger(0.08, { at: 7.1, duration: 0.25, effect: "drawOn" });
explorer4.group.rotateTo(-5, { at: 6.5, duration: 0.5, ease: "sine.out" });
envelope4.moveTo(286, 218, { at: 9.0, duration: 1.5, ease: "sine.inOut" });
envelope4.rotateTo(-8, { at: 9.0, duration: 1.5, ease: "sine.inOut" });
courier4.group.moveBy(120, 0, { at: 10.5, duration: 2.2, ease: "sine.in" });
scene4.camera().zoomTo(1.08, { at: 6.0, duration: 8.8, ease: "sine.inOut" });
scene4.camera().panTo(320, 210, { at: 0, duration: 14.8, ease: "sine.inOut" });
scene4.add(sketch.sound("F3", { at: 0, duration: 14.8, instrument: "pad", velocity: 0.2 }));
scene4.add(sketch.sound("C5", { at: 6.5, duration: 0.55, instrument: "piano", velocity: 0.68 }));
scene4.add(sketch.sound("F5", { at: 7.05, duration: 0.8, instrument: "piano", velocity: 0.64 }));
scene4.add(sketch.sound("A5", { at: 7.6, duration: 1.0, instrument: "strings", velocity: 0.42 }));

const scene5 = sketch.scene({ width: W, height: H, background: SKY, seed: "harbor-explorer-map-reveal", look: "flat" }).duration(14);
const table5 = rect(-20, 300, 680, 140, DOCK).named("map-table");
scene5.add(table5).appear({ at: 0, duration: 0.3 });
const map5 = rect(145, 62, 350, 240, CREAM).named("unfolded-harbor-map");
map5.initial({ scale: 0.18, rotation: -8, opacity: 0 });
scene5.add(map5);
map5.appear({ at: 0.6, duration: 0.35 });
map5.scaleTo(1, { at: 0.6, duration: 1.4, ease: "back.out(1.5)" });
map5.rotateTo(0, { at: 0.6, duration: 1.4, ease: "sine.out" });
const coast5 = sketch.stroke([[180, 246], [226, 214], [248, 173], [300, 153], [346, 116], [440, 90]], line(SEA_DARK, "bold")).named("map-coastline");
scene5.add(coast5).drawOn({ at: 2.2, duration: 2.1, ease: "sine.inOut" });
const route5 = sketch.stroke([[200, 255], [262, 230], [286, 190], [350, 177], [405, 132], [456, 112]], { ...line(CORAL, "bold"), smooth: true }).named("map-route").lintIgnore("overlap");
scene5.add(route5).drawOn({ at: 4.5, duration: 2.4, ease: "sine.inOut" });
const compass5 = compass(213, 105, 28);
compass5.initial({ scale: 0.2, opacity: 0 });
scene5.add(compass5);
compass5.appear({ at: 3.2, duration: 0.3 });
compass5.scaleTo(1, { at: 3.2, duration: 0.8, ease: "back.out(1.7)" });
for (let i = 0; i < 4; i++) {
  const marker = sketch.ellipse(286 + i * 55, 190 - i * 25, 8, 8, solid(i === 3 ? CORAL : GOLD, "confident")).named(`map-marker-${i}`);
  marker.initial({ scale: 0.1, opacity: 0 });
  scene5.add(marker);
  marker.appear({ at: 5.4 + i * 0.55, duration: 0.25 });
  marker.scaleTo(1, { at: 5.4 + i * 0.55, duration: 0.45, ease: "back.out(2)" });
}
const gateLabel5 = sketch.text("north gate", 330, 226, line(INK, "confident"), { size: 24 }).named("north-gate-label");
scene5.add(gateLabel5).stagger(0.11, { at: 7.7, duration: 0.35, effect: "drawOn" });
const explorerHand5 = sketch.stroke([[92, 350], [142, 282], [205, 257]], line(INK, "bold")).named("explorer-pointing-hand");
scene5.add(explorerHand5).drawOn({ at: 8.0, duration: 0.7 });
const courierHand5 = sketch.stroke([[558, 348], [516, 266], [455, 115]], line(INK, "bold")).named("courier-pointing-hand");
scene5.add(courierHand5).drawOn({ at: 9.0, duration: 0.9 });
scene5.add(sketch.sound("D3", { at: 0, duration: 13.8, instrument: "pad", velocity: 0.22 }));
scene5.add(sketch.sound("A3", { at: 1.0, duration: 12.5, instrument: "pad", velocity: 0.16 }));
const mapNotes: [string, number][] = [["D4", 2.2], ["F4", 4.5], ["A4", 5.4], ["C5", 6.5], ["D5", 7.6], ["A5", 9.2]];
for (const [pitch, at] of mapNotes) scene5.add(sketch.sound(pitch, { at, duration: 0.65, instrument: "pluck", velocity: 0.48 }));

const scene6 = sketch.scene({ width: W, height: H, background: SKY, seed: "harbor-explorer-departure", look: "flat" }).duration(15);
addWater(scene6, 245);
addDock(scene6, 324);
const gate6 = sketch.group([
  rect(470, 96, 142, 228, CREAM).named("city-gate-tower"),
  sketch.loop([[492, 324], [492, 220], [541, 176], [590, 220], [590, 324]], solid(SHADOW)).named("city-gate-arch").lintIgnore("overlap"),
  sketch.loop([[460, 96], [541, 52], [622, 96]], solid(CORAL)).named("city-gate-roof"),
]).named("north-gate");
scene6.add(gate6).appear({ at: 0, duration: 0.4 });
const ship6 = steamship();
ship6.initial({ x: -145, scale: 0.55 });
scene6.add(ship6).appear({ at: 0, duration: 0.4 });
ship6.moveBy(-430, -22, { at: 1.0, duration: 10.0, ease: "sine.in" });
ship6.scaleTo(0.34, { at: 1.0, duration: 10.0, ease: "sine.in" });
scene6.add(sketch.particles(122, 115, { color: WHITE }, { count: 28, angle: -110, spread: 65, speedMin: 13, speedMax: 30, gravity: -7, lifetime: 2.6, duration: 8.8, at: 1.1, sizeMin: 4, sizeMax: 10, moveTo: { x: -308, y: 93, duration: 10, ease: "sine.in" } }).named("departure-steam-smoke"));
const hornRingA = sketch.ellipse(92, 92, 18, 12, line(CORAL, "bold")).named("horn-wave-a").lintIgnore("overlap");
const hornRingB = sketch.ellipse(92, 92, 28, 19, line(GOLD, "confident")).named("horn-wave-b").lintIgnore("overlap");
hornRingA.initial({ scale: 0.2, opacity: 0 });
hornRingB.initial({ scale: 0.2, opacity: 0 });
scene6.add(hornRingA).appear({ at: 3.0, duration: 0.2 });
scene6.add(hornRingB).appear({ at: 3.2, duration: 0.2 });
hornRingA.scaleTo(2.4, { at: 3.0, duration: 1.5, ease: "sine.out" });
hornRingB.scaleTo(2.8, { at: 3.2, duration: 1.6, ease: "sine.out" });
hornRingA.fadeTo(0, { at: 4.2, duration: 0.4 });
hornRingB.fadeTo(0, { at: 4.5, duration: 0.4 });
const courier6 = courier();
courier6.group.initial({ x: 190, y: 350, scale: 0.8 });
scene6.add(courier6.group).appear({ at: 0.5, duration: 0.35 });
const explorer6 = explorer();
explorer6.group.initial({ x: 280, y: 350, scale: 0.82 });
scene6.add(explorer6.group).appear({ at: 0.5, duration: 0.35 });
courier6.arm.rotateTo(-68, { at: 2.1, duration: 0.55, ease: "back.out(1.6)" });
courier6.arm.rotateTo(-42, { at: 2.65, duration: 0.45, ease: "sine.inOut" });
courier6.arm.rotateTo(-68, { at: 3.1, duration: 0.45, ease: "sine.inOut" });
courier6.arm.rotateTo(0, { at: 4.0, duration: 0.7, ease: "sine.inOut" });
explorer6.armR.rotateTo(-72, { at: 2.2, duration: 0.55, ease: "back.out(1.6)" });
explorer6.armR.rotateTo(-46, { at: 2.75, duration: 0.45, ease: "sine.inOut" });
explorer6.armR.rotateTo(-72, { at: 3.2, duration: 0.45, ease: "sine.inOut" });
explorer6.armR.rotateTo(0, { at: 4.1, duration: 0.7, ease: "sine.inOut" });
const finalWalk6 = sketch.walk({ body: explorer6.group, legs: [{ limb: explorer6.legL, hipX: -11 }, { limb: explorer6.legR, hipX: 11 }], arms: [{ node: explorer6.armL, swingAngle: 16 }, { node: explorer6.armR, swingAngle: 16 }], steps: 5, stepLength: 47, groundY: 0, stepDuration: 0.9, liftHeight: 18, bodyBob: 4, at: 6.0 });
const closingText6 = sketch.text("the road opens", 80, 74, line(INK, "bold"), { size: 27 }).named("closing-title");
scene6.add(closingText6).stagger(0.09, { at: finalWalk6.endAt + 0.2, duration: 0.35, effect: "drawOn" });
scene6.camera().panTo(320, 210, { at: 0, duration: 14.8, ease: "sine.inOut" });
scene6.add(sketch.sound("D3", { at: 0, duration: 14.8, instrument: "pad", velocity: 0.25 }));
scene6.add(sketch.sound("A3", { at: 0.3, duration: 14.2, instrument: "pad", velocity: 0.17 }));
scene6.add(sketch.sound("C2", { at: 2.8, duration: 2.5, instrument: "strings", velocity: 0.92, pan: -0.55 }));
scene6.add(sketch.sound("G2", { at: 3.0, duration: 2.3, instrument: "strings", velocity: 0.76, pan: -0.45 }));
scene6.add(sketch.sound("D4", { at: 6.0, duration: 0.7, instrument: "piano", velocity: 0.55 }));
scene6.add(sketch.sound("F4", { at: 7.8, duration: 0.7, instrument: "piano", velocity: 0.55 }));
scene6.add(sketch.sound("A4", { at: 9.6, duration: 0.8, instrument: "piano", velocity: 0.58 }));
scene6.add(sketch.sound("D5", { at: 11.4, duration: 2.8, instrument: "strings", velocity: 0.52 }));

const film = sketch.film({ width: W, height: H, background: INK });
film
  .addScene(scene1, { hold: 0.5 })
  .addScene(scene2, { transition: "fade", transitionDuration: 0.7, hold: 0.4 })
  .addScene(scene3, { transition: "cut", hold: 0.5 })
  .addScene(scene4, { transition: "fade", transitionDuration: 0.7, hold: 0.4 })
  .addScene(scene5, { transition: "fade", transitionDuration: 0.8, hold: 0.5 })
  .addScene(scene6, { transition: "fade", transitionDuration: 0.9, hold: 0.8 });

export default film;
