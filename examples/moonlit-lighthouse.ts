import { sketch } from "../src/index.js";

// A lighthouse keeping watch through a blue night. The beam is laid behind the
// structure, then sweeps from its lantern pivot after the illustration is drawn.
const scene = sketch.scene({
  width: 640,
  height: 440,
  background: "#17243a",
  seed: "moonlit-lighthouse",
});

const ink = "#f2ead8";
const nightLine = "#9bb7c7";
const stone = "#d9d2c2";
const coral = "#c85d52";
const gold = "#f2c66d";
const sea = "#315a6b";

// The beam is added first so it stays behind the lighthouse.
const beam = sketch
  .loop(
    [
      [414, 162],
      [92, 94],
      [92, 218],
      [414, 181],
    ],
    {
      color: gold,
      weight: "light",
      looseness: 0.2,
      energy: "calm",
      smooth: false,
      fill: { color: gold, style: "hachure", density: 0.22, angle: 8 },
    }
  )
  .pivotAt(420, 172);
scene.add(beam).drawOn({ at: 0.0, duration: 0.9 });
beam
  .rotateTo(-7, { at: 5.9, duration: 0.8, ease: "sine.inOut" })
  .rotateTo(5, { at: 6.7, duration: 0.9, ease: "sine.inOut" })
  .rotateTo(0, { at: 7.6, duration: 0.6, ease: "sine.inOut" });

const moon = sketch.blob(
  103,
  76,
  38,
  {
    color: ink,
    weight: "confident",
    looseness: 0.18,
    energy: "calm",
    fill: { color: "#f6dda0", style: "dots", density: 0.5 },
  },
  16
);
scene.add(moon).drawOn({ at: 1.05, duration: 0.5 });
moon
  .scaleTo(1.06, { at: 5.7, duration: 1.0, ease: "sine.inOut" })
  .scaleTo(1.0, { at: 6.7, duration: 1.0, ease: "sine.inOut" });

const stars = sketch.group([
  sketch.blob(190, 62, 9, { color: gold, weight: "light", looseness: 0.3, fill: { color: gold, style: "solid" } }, 8),
  sketch.blob(268, 105, 10, { color: gold, weight: "light", looseness: 0.3, fill: { color: gold, style: "solid" } }, 8),
  sketch.blob(555, 70, 9, { color: gold, weight: "light", looseness: 0.3, fill: { color: gold, style: "solid" } }, 8),
]);
scene.add(stars);
stars.stagger(0.16, { at: 1.7, duration: 0.22, effect: "drawOn" });

const lighthouse = sketch.group();
scene.add(lighthouse);

const island = sketch.loop(
  [
    [248, 406],
    [282, 370],
    [330, 350],
    [382, 356],
    [430, 344],
    [486, 354],
    [522, 380],
    [552, 406],
  ],
  {
    color: ink,
    weight: "bold",
    looseness: 0.32,
    energy: "quick",
    smooth: true,
    fill: { color: sea, style: "cross-hatch", density: 0.5, angle: 32 },
  }
);
lighthouse.add(island).drawOn({ at: 2.35, duration: 0.72 });

const tower = sketch.loop(
  [
    [365, 358],
    [474, 358],
    [450, 183],
    [391, 183],
  ],
  {
    color: ink,
    weight: "bold",
    looseness: 0.18,
    energy: "calm",
    smooth: false,
    fill: { color: stone, style: "hachure", density: 0.3, angle: 68 },
  }
);
lighthouse.add(tower).drawOn({ at: 3.2, duration: 0.82 });

const stripeTop = sketch.loop(
  [
    [386, 224],
    [456, 224],
    [461, 260],
    [381, 260],
  ],
  {
    color: coral,
    weight: "confident",
    looseness: 0.14,
    energy: "quick",
    smooth: false,
    fill: { color: coral, style: "solid" },
  }
);
lighthouse.add(stripeTop).drawOn({ at: 4.16, duration: 0.38 });

const stripeBottom = sketch.loop(
  [
    [374, 302],
    [468, 302],
    [473, 338],
    [369, 338],
  ],
  {
    color: coral,
    weight: "confident",
    looseness: 0.14,
    energy: "quick",
    smooth: false,
    fill: { color: coral, style: "solid" },
  }
);
lighthouse.add(stripeBottom).drawOn({ at: 4.65, duration: 0.4 });

const lanternRoom = sketch.loop(
  [
    [385, 145],
    [456, 145],
    [449, 183],
    [392, 183],
  ],
  {
    color: ink,
    weight: "bold",
    looseness: 0.16,
    energy: "calm",
    smooth: false,
    fill: { color: gold, style: "cross-hatch", density: 0.34, angle: 45 },
  }
);
lighthouse.add(lanternRoom).drawOn({ at: 5.2, duration: 0.45 });

const roof = sketch.loop(
  [
    [373, 145],
    [420, 111],
    [468, 145],
  ],
  {
    color: ink,
    weight: "bold",
    looseness: 0.25,
    energy: "quick",
    smooth: false,
    fill: { color: coral, style: "solid" },
  }
);
lighthouse.add(roof).drawOn({ at: 5.78, duration: 0.36 });

const door = sketch.loop(
  [
    [404, 315],
    [438, 315],
    [438, 358],
    [404, 358],
  ],
  {
    color: ink,
    weight: "confident",
    looseness: 0.2,
    energy: "calm",
    smooth: false,
    fill: { color: "#24384a", style: "solid" },
  }
);
lighthouse.add(door).drawOn({ at: 6.28, duration: 0.32 });

const waves = sketch.group([
  sketch.stroke(
    [
      [42, 380],
      [96, 370],
      [150, 382],
      [210, 371],
    ],
    { color: nightLine, weight: "confident", looseness: 0.36, energy: "quick", smooth: true }
  ),
  sketch.stroke(
    [
      [68, 410],
      [126, 400],
      [184, 413],
      [236, 402],
    ],
    { color: nightLine, weight: "light", looseness: 0.4, energy: "quick", smooth: true }
  ),
  sketch.stroke(
    [
      [492, 418],
      [536, 408],
      [582, 419],
      [620, 412],
    ],
    { color: nightLine, weight: "light", looseness: 0.4, energy: "quick", smooth: true }
  ),
]);
scene.add(waves);
waves.stagger(0.22, { at: 6.72, duration: 0.44, effect: "drawOn" });
waves
  .moveBy(8, 0, { at: 7.4, duration: 0.4, ease: "sine.inOut" })
  .moveBy(-8, 0, { at: 7.8, duration: 0.4, ease: "sine.inOut" });

export default scene;
