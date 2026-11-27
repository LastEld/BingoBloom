// The v3 model uses a fixed 250 × 310 frame. Bloom widths are measured across
// the corolla, including the outer florets, even on a head with a long pedicel.
export const shootProfiles = {
  daisy:      {bloom: [18, 36], stem: [145, 193], leaf: [38, 64], branches: 4, reach: 47},
  cornflower: {bloom: [26, 48], stem: [155, 194], leaf: [49, 78], branches: 2, reach: 37},
  poppy:      {bloom: [33, 59], stem: [142, 180], leaf: [42, 68], branches: 2, reach: 45},
  clover:     {bloom: [24, 43], stem: [125, 165], leaf: [34, 55], branches: 2, reach: 40}
};

// Each tuple is a socket in source PNG pixels (x, y), the direction into the
// organ in degrees from vertical, and the width of its petiole at the socket.
// The socket on a frontal corolla sits inside the opaque portion of the head.
const sockets = {
  daisy: {
    heads: [[111,170,0,5],[134,190,-11,8],[76,243,19,13]],
    buds: [[36,128,-11,10],[21,100,0,7],[33,107,0,9]],
    leaves: [[136,249,-40,12],[71,228,-11,9],[45,246,27,11],[97,198,-17,9]]
  },
  cornflower: {
    heads: [[116,176,0,5],[116,234,-9,11],[126,240,-11,11]],
    buds: [[38,165,8,14],[118,269,-8,12]],
    leaves: [[52,363,-22,12],[45,360,-25,13],[25,330,-18,11],[28,289,2,8]]
  },
  poppy: {
    heads: [[119,172,0,5],[98,282,-2,10],[140,204,3,10]],
    buds: [[110,234,3,10],[16,228,3,10]],
    leaves: [[131,372,-23,11],[122,327,-28,11],[34,289,27,8]]
  },
  clover: {
    heads: [[105,169,0,5],[72,232,17,13],[108,248,-17,14],[190,289,0,5]],
    buds: [[42,131,-14,11],[52,163,12,11],[36,114,-6,9],[59,462,-2,17],[153,462,28,15],[162,462,-3,24],[94,316,-13,2]],
    leaves: [[147,232,-39,11],[135,264,-22,9],[55,198,32,9],[116,172,-41,10],[16,350,46,11],[223,424,-25,17],[224,422,-21,14],[223,390,-28,13],[168,380,14,9],[106,392,33,6],[220,413,-27,17],[167,384,21,17],[170,375,17,13]]
  }
};

const mix = ([low, high], t) => low + (high - low) * t;
const radians = angle => angle * Math.PI / 180;
const degrees = angle => angle * 180 / Math.PI;

function attach(part, base, x, y, height, angle, flip) {
  const [kind, organ, number] = part.file.split('-');
  const [px, py, lean, thickness] = sockets[kind][organ][parseInt(number, 10) - 1];
  const direction = radians(angle + flip * lean);
  const handle = Math.hypot(x - base.x, y - base.y) * .38;
  return {
    part, base, x, y, height, angle, flip,
    anchorX: (px + .5) / part.width, anchorY: (py + .5) / part.height,
    control1: {x: base.x + base.dx * handle, y: base.y + base.dy * handle},
    control2: {x: x - Math.sin(direction) * handle, y: y + Math.cos(direction) * handle},
    thickness: Math.max(.85, Math.min(2.4, thickness * height / part.height))
  };
}

export function growV3(parts, form, pigment, mounting) {
  const pick = list => list[Math.floor(form() * list.length)];
  const range = (low, high) => mix([low, high], form());
  const stem = pick(parts.stems), kind = stem.file.split('-')[0], profile = shootProfiles[kind];
  const size = (form() + form()) / 2, maturity = form();
  const mainWidth = mix(profile.bloom, size);
  const stemH = mix(profile.stem, .7 * size + .3 * form()), stemW = stem.width / stem.height * stemH;
  const x = 125 - stemW * stem.anchorX, y = 273 - stemH * stem.anchorY;
  const nodes = stem.growthNodes.map(([nx, ny]) => ({x: x + nx * stemW, y: y + ny * stemH}));
  function junction(position) {
    // Sample the measured centreline at its source pixels, including on the
    // irregular or branched stems where interpolating a chord can leave it.
    const i = Math.round(position * (nodes.length - 1));
    const above = nodes[Math.max(0, i - 1)], below = nodes[Math.min(nodes.length - 1, i + 1)];
    const dx = above.x - below.x, dy = above.y - below.y, length = Math.hypot(dx, dy);
    return {...nodes[i], dx: dx / length, dy: dy / length};
  }
  const flowers = [], leaves = [];
  const hand = form() < .5 ? -1 : 1;
  const branchCount = Math.floor((.7 * form() + .3 * maturity) * (profile.branches + 1));
  const leafCount = 2 + Math.floor(form() * 4);
  for (let i = 0; i <= branchCount; i++) {
    const side = i % 2 ? hand : -hand;
    const base = junction(i ? .13 + (i - 1) * .14 + range(0, .08) : 0);
    const bud = i > 0 && form() < (kind === 'poppy' ? .92 : .80) - .42 * maturity;
    const part = pick(bud ? parts.buds : parts.heads);
    const width = i ? mainWidth * range(.63, .85) : mainWidth;
    const height = bud ? mainWidth * range(.47, .77) : width * part.height / part.width;
    const reach = i ? side * profile.reach * range(.55, 1.12) : base.dx * 4;
    const rise = i ? range(20, 42) : 6;
    const angle = side * (i ? range(6, 25) : range(-10, 10));
    flowers.push(attach(part, base, base.x + reach, base.y - rise, height, angle, form() < .5 ? -1 : 1));
  }
  // These two clover sprites depict a twig or heavily folded leaf. Expanded
  // leaf nodes use the existing complete trifoliate sprites.
  const blades = kind === 'clover' ? parts.leaves.filter(p => !/leaves-(5|10)\.png$/.test(p.file)) : parts.leaves;
  for (let i = 0; i < leafCount; i++) {
    const tier = (i + range(.2, .75)) / leafCount;
    const base = junction(.26 + .66 * tier), side = i % 2 ? -hand : hand;
    const part = pick(blades), flip = form() < .5 ? -1 : 1;
    const naturalLean = degrees(Math.atan2(flip * (.5 - part.anchorX) * part.width, part.anchorY * part.height));
    const angle = side * range(27, 62) - naturalLean;
    const height = mix(profile.leaf, size) * range(.85, 1.12);
    leaves.push(attach(part, base, base.x + side * range(3, 8), base.y - range(3, 8), height, angle, flip));
  }
  const tilt = range(-8, 8), pressAngle = range(-10, 10);
  const tapeRange = (a, b) => mix([a, b], mounting());
  const tapes = [], petals = [];
  const tapeCount = 1 + Math.floor(2 * mounting());
  for (let i = 0; i < tapeCount; i++) {
    const base = junction(i ? tapeRange(.30, .52) : tapeRange(.62, .85));
    tapes.push({x: base.x, y: base.y, width: tapeRange(27, 39), angle: tapeRange(-17, 17)});
  }
  const fallen = mounting() < .23 ? 1 : 0;
  for (let i = 0; i < fallen; i++) {
    const part = parts.petals[Math.floor(mounting() * parts.petals.length)];
    petals.push({part, x: 125 + (i % 2 ? 1 : -1) * tapeRange(44, 75), y: tapeRange(177, 247),
      height: tapeRange(11, 20), angle: tapeRange(-75, 75), flip: 1});
  }
  return {version: 3, stem, x, y, stemW, stemH, flowers, leaves, tapes, petals, tilt, pressAngle,
    hue: mix([-4, 4], pigment()), light: mix([.97, 1.04], pigment())};
}
