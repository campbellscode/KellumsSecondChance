/**
 * Generates the placeholder photography set for Kellum's Second Chance Renovations.
 *
 * These are architectural SVG renderings, not grey boxes: each scene is drawn with
 * wall/floor planes, daylight and room-appropriate millwork so layouts can be judged
 * with realistic tonal weight before real project photography exists.
 *
 * BEFORE renderings are cooler, dimmer and carry wear (cracks, staining, dated fixtures).
 * AFTER renderings are warmer, brighter and cleanly detailed.
 *
 * Run:  node scripts/generate-placeholder-media.mjs
 * Out:  public/media/**.svg
 *
 * Replacing with real photography: drop real files into public/media using the same
 * paths, or edit src/content/media.ts to point at the new files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'media');

/* ------------------------------------------------------------------ utils */

/** Deterministic PRNG so regeneration is byte-stable. */
function makeRandom(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0 || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
}

const round = (n) => Math.round(n * 100) / 100;

function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/* --------------------------------------------------------------- palettes */

const PALETTES = {
  after: {
    sky: '#dfe7ec', ceiling: '#f6f2ec', wallBack: '#efe8de', wallSide: '#e2d9cd',
    wallShadow: '#d4c9ba', floor: '#b98f60', floorDark: '#966c43', floorLight: '#d3ac7d',
    cabinet: '#2b2f31', cabinetLight: '#3a3f42', counter: '#e9e5df', counterEdge: '#cfc8bd',
    metal: '#b8895c', metalBright: '#d8a877', tile: '#e8e2d8', grout: '#cec5b8',
    accent: '#b25e2c', glass: '#f7fbfd', light: '#fff6e6', trim: '#faf7f2',
    fabric: '#8a8478', plant: '#5d7360',
  },
  before: {
    sky: '#c3c8ca', ceiling: '#ddd9d1', wallBack: '#c8c4b7', wallSide: '#b4b1a5',
    wallShadow: '#9d9a8f', floor: '#8e8375', floorDark: '#6f665b', floorLight: '#a49887',
    cabinet: '#8b7c63', cabinetLight: '#9c8d73', counter: '#b9b3a6', counterEdge: '#9b9587',
    metal: '#9a978e', metalBright: '#adaaa1', tile: '#c6c2b6', grout: '#a9a599',
    accent: '#7f7a70', glass: '#d9dfe1', light: '#eae5da', trim: '#cfcabd',
    fabric: '#8d887d', plant: '#77796b',
  },
};

/* ------------------------------------------------------- shared scaffolds */

function defs(id, p, state) {
  const warm = state === 'after';
  return `
  <defs>
    <linearGradient id="g-ceil-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${mix(p.ceiling, '#ffffff', warm ? 0.5 : 0.2)}"/>
      <stop offset="1" stop-color="${mix(p.ceiling, p.wallShadow, 0.55)}"/>
    </linearGradient>
    <linearGradient id="g-back-${id}" x1="0" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="${mix(p.wallBack, p.light, warm ? 0.4 : 0.1)}"/>
      <stop offset="0.62" stop-color="${p.wallBack}"/>
      <stop offset="1" stop-color="${mix(p.wallBack, p.wallShadow, 0.7)}"/>
    </linearGradient>
    <linearGradient id="g-side-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${mix(p.wallSide, p.wallShadow, 0.8)}"/>
      <stop offset="1" stop-color="${mix(p.wallSide, p.light, warm ? 0.28 : 0.05)}"/>
    </linearGradient>
    <linearGradient id="g-floor-${id}" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="${mix(p.floor, p.light, warm ? 0.34 : 0.08)}"/>
      <stop offset="0.55" stop-color="${p.floor}"/>
      <stop offset="1" stop-color="${p.floorDark}"/>
    </linearGradient>
    <linearGradient id="g-shaft-${id}" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${p.light}" stop-opacity="${warm ? 0.52 : 0.2}"/>
      <stop offset="1" stop-color="${p.light}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="g-glass-${id}" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="${mix(p.glass, '#ffffff', 0.6)}"/>
      <stop offset="1" stop-color="${mix(p.glass, p.sky, 0.85)}"/>
    </linearGradient>
    <linearGradient id="g-counter-${id}" x1="0" y1="0" x2="1" y2="0.4">
      <stop offset="0" stop-color="${mix(p.counter, '#ffffff', warm ? 0.5 : 0.15)}"/>
      <stop offset="1" stop-color="${p.counter}"/>
    </linearGradient>
    <linearGradient id="g-sky-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${mix(p.sky, '#ffffff', 0.35)}"/>
      <stop offset="1" stop-color="${mix(p.sky, p.light, 0.5)}"/>
    </linearGradient>
    <radialGradient id="g-vig-${id}" cx="0.5" cy="0.44" r="0.78">
      <stop offset="0.45" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#100d0a" stop-opacity="${warm ? 0.3 : 0.42}"/>
    </radialGradient>
    <filter id="f-grain-${id}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" result="n"/>
      <feColorMatrix type="saturate" values="0" in="n" result="d"/>
      <feComponentTransfer in="d"><feFuncA type="linear" slope="${warm ? 0.11 : 0.17}"/></feComponentTransfer>
    </filter>
    <filter id="f-soft-${id}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${warm ? 16 : 10}"/>
    </filter>
  </defs>`;
}

/** Floor planks converging toward a vanishing point. */
function floorPlanks(p, w, h, horizon, vpx, count, rand) {
  let out = '';
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const x = -w * 0.55 + t * (w * 2.1);
    const op = 0.16 + rand() * 0.16;
    out += `<path d="M${round(vpx)} ${round(horizon)} L${round(x)} ${h}" stroke="${p.floorDark}" stroke-opacity="${round(op)}" stroke-width="1.5" fill="none"/>`;
  }
  for (let i = 1; i <= 7; i += 1) {
    const t = Math.pow(i / 8, 1.75);
    const y = horizon + t * (h - horizon);
    out += `<path d="M0 ${round(y)} L${w} ${round(y)}" stroke="${p.floorDark}" stroke-opacity="0.13" stroke-width="1.4" fill="none"/>`;
  }
  return out;
}

function tileGrid(p, x, y, w, h, cell, opacity = 0.55) {
  let out = `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="${p.tile}"/>`;
  for (let gx = x; gx <= x + w + 0.5; gx += cell) {
    out += `<path d="M${round(gx)} ${round(y)} V${round(y + h)}" stroke="${p.grout}" stroke-opacity="${opacity}" stroke-width="1.4"/>`;
  }
  for (let gy = y; gy <= y + h + 0.5; gy += cell) {
    out += `<path d="M${round(x)} ${round(gy)} H${round(x + w)}" stroke="${p.grout}" stroke-opacity="${opacity}" stroke-width="1.4"/>`;
  }
  return out;
}

/** Wear marks for BEFORE frames: hairline cracks + damp staining. */
function wear(rand, w, h, amount = 1) {
  let out = '<g opacity="0.5">';
  for (let i = 0; i < 3 * amount; i += 1) {
    let cx = rand() * w;
    let cy = rand() * h * 0.55;
    let d = `M${round(cx)} ${round(cy)}`;
    for (let s = 0; s < 6; s += 1) {
      cx += (rand() - 0.45) * 46;
      cy += rand() * 40;
      d += ` L${round(cx)} ${round(cy)}`;
    }
    out += `<path d="${d}" stroke="#5f584e" stroke-opacity="0.34" stroke-width="${round(0.9 + rand())}" fill="none" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < 2 * amount; i += 1) {
    out += `<ellipse cx="${round(rand() * w)}" cy="${round(rand() * h * 0.6)}" rx="${round(60 + rand() * 90)}" ry="${round(40 + rand() * 60)}" fill="#6b6155" opacity="0.13"/>`;
  }
  return `${out}</g>`;
}

function cabinetRun(p, x, y, w, h, doors, state) {
  const dw = w / doors;
  let out = `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="${p.cabinet}"/>`;
  for (let i = 0; i < doors; i += 1) {
    const dx = x + i * dw;
    out += `<rect x="${round(dx + 5)}" y="${round(y + 5)}" width="${round(Math.max(dw - 10, 2))}" height="${round(Math.max(h - 10, 2))}" fill="none" stroke="${p.cabinetLight}" stroke-width="2"/>`;
    out += state === 'after'
      ? `<rect x="${round(dx + dw * 0.5 - 2)}" y="${round(y + h * 0.16)}" width="4" height="${round(h * 0.24)}" rx="2" fill="${p.metalBright}"/>`
      : `<circle cx="${round(dx + dw * 0.5)}" cy="${round(y + h * 0.2)}" r="6" fill="${p.metal}"/>`;
  }
  return out;
}

/* ----------------------------------------------------------------- scenes */

const SCENES = {
  kitchen(p, s, rand, w, h, id) {
    const horizon = h * 0.52;
    const backTop = h * 0.14;
    const backLeft = w * 0.2;
    const backRight = w * 0.84;
    let g = '';
    g += `<rect width="${w}" height="${h}" fill="${p.wallSide}"/>`;
    g += `<polygon points="0,0 ${w},0 ${round(backRight)},${round(backTop)} ${round(backLeft)},${round(backTop)}" fill="url(#g-ceil-${id})"/>`;
    g += `<polygon points="0,0 ${round(backLeft)},${round(backTop)} ${round(backLeft)},${round(horizon)} 0,${h}" fill="url(#g-side-${id})"/>`;
    g += `<polygon points="${w},0 ${round(backRight)},${round(backTop)} ${round(backRight)},${round(horizon)} ${w},${h}" fill="url(#g-side-${id})" opacity="0.82"/>`;
    g += `<rect x="${round(backLeft)}" y="${round(backTop)}" width="${round(backRight - backLeft)}" height="${round(horizon - backTop)}" fill="url(#g-back-${id})"/>`;
    g += `<polygon points="0,${h} ${round(backLeft)},${round(horizon)} ${round(backRight)},${round(horizon)} ${w},${h}" fill="url(#g-floor-${id})"/>`;
    g += floorPlanks(p, w, h, horizon, w * 0.5, 22, rand);

    const wx = backLeft + (backRight - backLeft) * 0.06;
    const wy = backTop + (horizon - backTop) * 0.12;
    const ww = (backRight - backLeft) * 0.24;
    const wh = (horizon - backTop) * 0.42;
    g += `<rect x="${round(wx)}" y="${round(wy)}" width="${round(ww)}" height="${round(wh)}" fill="url(#g-glass-${id})"/>`;
    g += `<rect x="${round(wx)}" y="${round(wy)}" width="${round(ww)}" height="${round(wh)}" fill="none" stroke="${p.trim}" stroke-width="7"/>`;
    g += `<path d="M${round(wx + ww / 2)} ${round(wy)} V${round(wy + wh)}" stroke="${p.trim}" stroke-width="5"/>`;
    g += `<polygon points="${round(wx)},${round(wy + wh)} ${round(wx + ww)},${round(wy + wh)} ${round(w * 0.78)},${h} ${round(w * 0.04)},${h}" fill="url(#g-shaft-${id})"/>`;

    const bsY = backTop + (horizon - backTop) * 0.4;
    g += tileGrid(p, backLeft + (backRight - backLeft) * 0.38, bsY, (backRight - backLeft) * 0.6, (horizon - backTop) * 0.26, s === 'after' ? 30 : 46);
    g += cabinetRun(p, backLeft + (backRight - backLeft) * 0.38, backTop + (horizon - backTop) * 0.06, (backRight - backLeft) * 0.6, (horizon - backTop) * 0.32, 4, s);

    const baseY = horizon - h * 0.02;
    g += cabinetRun(p, backLeft, baseY - h * 0.12, backRight - backLeft, h * 0.12, 6, s);
    g += `<rect x="${round(backLeft - 6)}" y="${round(baseY - h * 0.135)}" width="${round(backRight - backLeft + 12)}" height="${round(h * 0.022)}" fill="url(#g-counter-${id})"/>`;

    const ix = w * 0.16;
    const iy = h * 0.66;
    const iw = w * 0.46;
    const ih = h * 0.2;
    g += cabinetRun(p, ix, iy, iw, ih, 3, s);
    g += `<rect x="${round(ix - 14)}" y="${round(iy - h * 0.028)}" width="${round(iw + 28)}" height="${round(h * 0.032)}" rx="2" fill="url(#g-counter-${id})"/>`;
    g += `<rect x="${round(ix - 14)}" y="${round(iy + h * 0.002)}" width="${round(iw + 28)}" height="4" fill="${p.counterEdge}"/>`;

    for (let i = 0; i < 2; i += 1) {
      const px = ix + iw * (0.3 + i * 0.42);
      g += `<path d="M${round(px)} ${round(h * 0.1)} V${round(h * 0.34)}" stroke="${p.metal}" stroke-width="2.5"/>`;
      g += s === 'after'
        ? `<path d="M${round(px - 30)} ${round(h * 0.4)} L${round(px + 30)} ${round(h * 0.4)} L${round(px + 17)} ${round(h * 0.34)} L${round(px - 17)} ${round(h * 0.34)} Z" fill="${p.metalBright}"/><ellipse cx="${round(px)}" cy="${round(h * 0.43)}" rx="46" ry="26" fill="${p.light}" opacity="0.5" filter="url(#f-soft-${id})"/>`
        : `<ellipse cx="${round(px)}" cy="${round(h * 0.37)}" rx="22" ry="16" fill="${p.metal}"/>`;
    }

    g += `<polygon points="${round(w * 0.6)},${round(backTop + 10)} ${round(w * 0.74)},${round(backTop + 10)} ${round(w * 0.71)},${round(h * 0.33)} ${round(w * 0.63)},${round(h * 0.33)}" fill="${s === 'after' ? p.metalBright : p.cabinetLight}" opacity="0.9"/>`;

    if (s === 'after') {
      g += `<rect x="${round(w * 0.24)}" y="${round(iy - h * 0.062)}" width="26" height="${round(h * 0.034)}" rx="3" fill="${p.plant}"/>`;
      g += `<circle cx="${round(w * 0.253)}" cy="${round(iy - h * 0.072)}" r="18" fill="${p.plant}" opacity="0.85"/>`;
    } else {
      g += wear(rand, w, h, 1);
    }
    return g;
  },

  bathroom(p, s, rand, w, h, id) {
    const horizon = h * 0.62;
    const backTop = h * 0.1;
    const backLeft = w * 0.16;
    const backRight = w * 0.88;
    let g = '';
    g += `<rect width="${w}" height="${h}" fill="${p.wallSide}"/>`;
    g += `<polygon points="0,0 ${w},0 ${round(backRight)},${round(backTop)} ${round(backLeft)},${round(backTop)}" fill="url(#g-ceil-${id})"/>`;
    g += `<polygon points="0,0 ${round(backLeft)},${round(backTop)} ${round(backLeft)},${round(horizon)} 0,${h}" fill="url(#g-side-${id})"/>`;
    g += `<rect x="${round(backLeft)}" y="${round(backTop)}" width="${round(backRight - backLeft)}" height="${round(horizon - backTop)}" fill="url(#g-back-${id})"/>`;
    g += `<polygon points="${w},0 ${round(backRight)},${round(backTop)} ${round(backRight)},${round(horizon)} ${w},${h}" fill="url(#g-side-${id})" opacity="0.8"/>`;
    g += `<polygon points="0,${h} ${round(backLeft)},${round(horizon)} ${round(backRight)},${round(horizon)} ${w},${h}" fill="url(#g-floor-${id})"/>`;
    g += tileGrid(p, 0, horizon, w, h - horizon, s === 'after' ? 54 : 76, 0.32);

    const shX = backLeft + (backRight - backLeft) * 0.56;
    const shW = (backRight - backLeft) * 0.44;
    g += tileGrid(p, shX, backTop, shW, horizon - backTop, s === 'after' ? 34 : 52, 0.5);
    g += `<rect x="${round(shX)}" y="${round(backTop)}" width="${round(shW)}" height="${round(horizon - backTop)}" fill="url(#g-glass-${id})" opacity="0.24"/>`;
    g += `<rect x="${round(shX)}" y="${round(backTop)}" width="${round(shW)}" height="${round(horizon - backTop)}" fill="none" stroke="${s === 'after' ? p.metalBright : p.metal}" stroke-width="6"/>`;
    g += `<path d="M${round(shX + shW * 0.5)} ${round(backTop)} V${round(horizon)}" stroke="${s === 'after' ? p.metalBright : p.metal}" stroke-width="4"/>`;
    g += `<circle cx="${round(shX + shW * 0.25)}" cy="${round(backTop + (horizon - backTop) * 0.2)}" r="13" fill="${s === 'after' ? p.metalBright : p.metal}"/>`;

    const vX = backLeft + (backRight - backLeft) * 0.04;
    const vW = (backRight - backLeft) * 0.44;
    const vY = horizon - (horizon - backTop) * 0.34;
    g += cabinetRun(p, vX, vY, vW, (horizon - backTop) * 0.34, 2, s);
    g += `<rect x="${round(vX - 8)}" y="${round(vY - 14)}" width="${round(vW + 16)}" height="16" rx="2" fill="url(#g-counter-${id})"/>`;
    g += `<ellipse cx="${round(vX + vW * 0.5)}" cy="${round(vY - 6)}" rx="${round(vW * 0.2)}" ry="9" fill="${mix(p.counter, '#ffffff', 0.4)}"/>`;
    g += `<path d="M${round(vX + vW * 0.5)} ${round(vY - 20)} v-28 q0 -14 20 -14" stroke="${s === 'after' ? p.metalBright : p.metal}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    const mH = (horizon - backTop) * 0.34;
    g += s === 'after'
      ? `<rect x="${round(vX + vW * 0.14)}" y="${round(backTop + 40)}" width="${round(vW * 0.72)}" height="${round(mH)}" rx="${round(vW * 0.36)}" fill="url(#g-glass-${id})" stroke="${p.metalBright}" stroke-width="5"/>`
      : `<rect x="${round(vX)}" y="${round(backTop + 30)}" width="${round(vW)}" height="${round(mH)}" fill="url(#g-glass-${id})" stroke="${p.metal}" stroke-width="4"/>`;

    if (s === 'after') {
      g += `<circle cx="${round(vX + vW * 0.5)}" cy="${round(backTop + 26)}" r="52" fill="${p.light}" opacity="0.5" filter="url(#f-soft-${id})"/>`;
    } else {
      g += wear(rand, w, h, 1);
    }
    return g;
  },

  basement(p, s, rand, w, h, id) {
    const horizon = h * 0.6;
    const backTop = h * 0.16;
    const backLeft = w * 0.12;
    const backRight = w * 0.88;
    let g = '';
    g += `<rect width="${w}" height="${h}" fill="${p.wallSide}"/>`;
    g += `<polygon points="0,0 ${w},0 ${round(backRight)},${round(backTop)} ${round(backLeft)},${round(backTop)}" fill="url(#g-ceil-${id})"/>`;
    g += `<polygon points="0,0 ${round(backLeft)},${round(backTop)} ${round(backLeft)},${round(horizon)} 0,${h}" fill="url(#g-side-${id})"/>`;
    g += `<polygon points="${w},0 ${round(backRight)},${round(backTop)} ${round(backRight)},${round(horizon)} ${w},${h}" fill="url(#g-side-${id})" opacity="0.85"/>`;
    g += `<rect x="${round(backLeft)}" y="${round(backTop)}" width="${round(backRight - backLeft)}" height="${round(horizon - backTop)}" fill="url(#g-back-${id})"/>`;
    g += `<polygon points="0,${h} ${round(backLeft)},${round(horizon)} ${round(backRight)},${round(horizon)} ${w},${h}" fill="url(#g-floor-${id})"/>`;
    g += floorPlanks(p, w, h, horizon, w * 0.46, 20, rand);

    if (s === 'after') {
      for (let i = 0; i < 5; i += 1) {
        const cx = w * (0.2 + i * 0.15);
        const cy = backTop * (0.42 + (i % 2) * 0.1);
        g += `<ellipse cx="${round(cx)}" cy="${round(cy)}" rx="17" ry="7" fill="${p.metalBright}"/>`;
        g += `<ellipse cx="${round(cx)}" cy="${round(cy + 14)}" rx="46" ry="20" fill="${p.light}" opacity="0.4" filter="url(#f-soft-${id})"/>`;
      }
      const bx = backLeft + (backRight - backLeft) * 0.28;
      const bw = (backRight - backLeft) * 0.44;
      g += `<rect x="${round(bx)}" y="${round(backTop + 30)}" width="${round(bw)}" height="${round((horizon - backTop) * 0.78)}" fill="${mix(p.wallBack, p.trim, 0.6)}"/>`;
      for (let i = 0; i < 9; i += 1) {
        const yy = backTop + 30 + (i * (horizon - backTop) * 0.78) / 9;
        g += `<path d="M${round(bx)} ${round(yy)} H${round(bx + bw)}" stroke="${p.wallShadow}" stroke-opacity="0.4" stroke-width="2"/>`;
      }
      g += `<rect x="${round(bx + bw * 0.14)}" y="${round(backTop + (horizon - backTop) * 0.18)}" width="${round(bw * 0.72)}" height="${round((horizon - backTop) * 0.3)}" rx="4" fill="#1b1e20"/>`;
      g += cabinetRun(p, bx, horizon - (horizon - backTop) * 0.2, bw, (horizon - backTop) * 0.2, 3, s);
      g += `<rect x="${round(w * 0.2)}" y="${round(h * 0.68)}" width="${round(w * 0.44)}" height="${round(h * 0.16)}" rx="10" fill="${p.fabric}"/>`;
      g += `<rect x="${round(w * 0.2)}" y="${round(h * 0.64)}" width="${round(w * 0.44)}" height="${round(h * 0.07)}" rx="10" fill="${mix(p.fabric, '#ffffff', 0.16)}"/>`;
    } else {
      for (let i = 0; i < 8; i += 1) {
        const yy = backTop * (0.2 + i * 0.1);
        g += `<path d="M0 ${round(yy)} H${w}" stroke="${p.floorDark}" stroke-opacity="0.4" stroke-width="9"/>`;
      }
      for (let r = 0; r < 7; r += 1) {
        for (let c = 0; c < 10; c += 1) {
          const bx = backLeft + (c * (backRight - backLeft)) / 10 + (r % 2 ? 14 : 0);
          const by = backTop + (r * (horizon - backTop)) / 7;
          g += `<rect x="${round(bx)}" y="${round(by)}" width="${round((backRight - backLeft) / 10 - 4)}" height="${round((horizon - backTop) / 7 - 4)}" fill="none" stroke="${p.grout}" stroke-opacity="0.55" stroke-width="1.6"/>`;
        }
      }
      g += `<path d="M${round(w * 0.5)} ${round(backTop * 0.3)} V${round(h * 0.3)}" stroke="${p.metal}" stroke-width="2"/>`;
      g += `<circle cx="${round(w * 0.5)}" cy="${round(h * 0.32)}" r="14" fill="${p.light}" opacity="0.8"/>`;
      g += `<rect x="${round(w * 0.62)}" y="${round(h * 0.44)}" width="${round(w * 0.14)}" height="${round(h * 0.18)}" fill="${p.cabinetLight}" opacity="0.7"/>`;
      g += wear(rand, w, h, 2);
    }
    return g;
  },

  living(p, s, rand, w, h, id) {
    const horizon = h * 0.6;
    const backTop = h * 0.11;
    const backLeft = w * 0.14;
    const backRight = w * 0.86;
    let g = '';
    g += `<rect width="${w}" height="${h}" fill="${p.wallSide}"/>`;
    g += `<polygon points="0,0 ${w},0 ${round(backRight)},${round(backTop)} ${round(backLeft)},${round(backTop)}" fill="url(#g-ceil-${id})"/>`;
    g += `<polygon points="0,0 ${round(backLeft)},${round(backTop)} ${round(backLeft)},${round(horizon)} 0,${h}" fill="url(#g-side-${id})"/>`;
    g += `<polygon points="${w},0 ${round(backRight)},${round(backTop)} ${round(backRight)},${round(horizon)} ${w},${h}" fill="url(#g-side-${id})" opacity="0.84"/>`;
    g += `<rect x="${round(backLeft)}" y="${round(backTop)}" width="${round(backRight - backLeft)}" height="${round(horizon - backTop)}" fill="url(#g-back-${id})"/>`;
    g += `<polygon points="0,${h} ${round(backLeft)},${round(horizon)} ${round(backRight)},${round(horizon)} ${w},${h}" fill="url(#g-floor-${id})"/>`;
    g += floorPlanks(p, w, h, horizon, w * 0.52, 24, rand);

    for (let i = 0; i < 2; i += 1) {
      const wx = backLeft + (backRight - backLeft) * (i === 0 ? 0.05 : 0.72);
      const ww = (backRight - backLeft) * 0.23;
      const wy = backTop + (horizon - backTop) * 0.1;
      const wh = (horizon - backTop) * 0.62;
      g += `<rect x="${round(wx)}" y="${round(wy)}" width="${round(ww)}" height="${round(wh)}" fill="url(#g-glass-${id})"/>`;
      g += `<rect x="${round(wx)}" y="${round(wy)}" width="${round(ww)}" height="${round(wh)}" fill="none" stroke="${p.trim}" stroke-width="8"/>`;
      g += `<path d="M${round(wx + ww / 2)} ${round(wy)} V${round(wy + wh)}" stroke="${p.trim}" stroke-width="5"/>`;
      g += `<path d="M${round(wx)} ${round(wy + wh * 0.42)} H${round(wx + ww)}" stroke="${p.trim}" stroke-width="5"/>`;
    }
    const fx = backLeft + (backRight - backLeft) * 0.34;
    const fw = (backRight - backLeft) * 0.32;
    g += `<rect x="${round(fx)}" y="${round(backTop + (horizon - backTop) * 0.06)}" width="${round(fw)}" height="${round((horizon - backTop) * 0.94)}" fill="${mix(p.wallBack, p.wallShadow, s === 'after' ? 0.3 : 0.55)}"/>`;
    g += `<rect x="${round(fx + fw * 0.2)}" y="${round(horizon - (horizon - backTop) * 0.46)}" width="${round(fw * 0.6)}" height="${round((horizon - backTop) * 0.34)}" fill="#191614"/>`;
    if (s === 'after') {
      g += `<rect x="${round(fx + fw * 0.22)}" y="${round(horizon - (horizon - backTop) * 0.42)}" width="${round(fw * 0.56)}" height="${round((horizon - backTop) * 0.26)}" fill="${p.accent}" opacity="0.55"/>`;
      g += `<rect x="${round(fx - 14)}" y="${round(horizon - (horizon - backTop) * 0.54)}" width="${round(fw + 28)}" height="14" rx="3" fill="${p.floorLight}"/>`;
    }
    g += `<rect x="${round(w * 0.22)}" y="${round(h * 0.7)}" width="${round(w * 0.4)}" height="${round(h * 0.15)}" rx="12" fill="${p.fabric}"/>`;
    g += `<rect x="${round(w * 0.22)}" y="${round(h * 0.66)}" width="${round(w * 0.4)}" height="${round(h * 0.07)}" rx="12" fill="${mix(p.fabric, '#ffffff', 0.18)}"/>`;
    g += `<rect x="${round(w * 0.66)}" y="${round(h * 0.72)}" width="${round(w * 0.13)}" height="${round(h * 0.1)}" rx="8" fill="${mix(p.fabric, p.floorDark, 0.4)}"/>`;
    if (s !== 'after') g += wear(rand, w, h, 2);
    return g;
  },

  exterior(p, s, rand, w, h, id) {
    const groundY = h * 0.7;
    let g = '';
    g += `<rect width="${w}" height="${h}" fill="url(#g-sky-${id})"/>`;
    let tree = `M0 ${round(groundY - h * 0.1)}`;
    for (let x = 0; x <= w; x += w / 26) {
      tree += ` L${round(x)} ${round(groundY - h * 0.1 - rand() * h * 0.11)}`;
    }
    tree += ` L${w} ${round(groundY)} L0 ${round(groundY)} Z`;
    g += `<path d="${tree}" fill="${p.plant}" opacity="${s === 'after' ? 0.45 : 0.32}"/>`;

    const hy = h * 0.06;
    const hw = w * 0.42;
    g += `<rect x="0" y="${round(hy)}" width="${round(hw)}" height="${round(groundY - hy)}" fill="${mix(p.wallSide, p.trim, s === 'after' ? 0.5 : 0.12)}"/>`;
    for (let i = 0; i < 22; i += 1) {
      g += `<path d="M0 ${round(hy + (i * (groundY - hy)) / 22)} H${round(hw)}" stroke="${p.wallShadow}" stroke-opacity="0.4" stroke-width="2"/>`;
    }
    g += `<rect x="${round(hw * 0.42)}" y="${round(hy + (groundY - hy) * 0.2)}" width="${round(hw * 0.44)}" height="${round((groundY - hy) * 0.68)}" fill="url(#g-glass-${id})" stroke="${p.trim}" stroke-width="9"/>`;
    g += `<path d="M${round(hw * 0.64)} ${round(hy + (groundY - hy) * 0.2)} V${round(hy + (groundY - hy) * 0.88)}" stroke="${p.trim}" stroke-width="6"/>`;

    g += `<polygon points="${round(hw * 0.1)},${round(groundY)} ${w},${round(groundY - h * 0.02)} ${w},${h} 0,${h}" fill="url(#g-floor-${id})"/>`;
    for (let i = 0; i <= 16; i += 1) {
      const t = i / 16;
      g += `<path d="M${round(hw * 0.1 + t * (w - hw * 0.1))} ${round(groundY)} L${round(-w * 0.3 + t * w * 1.7)} ${h}" stroke="${p.floorDark}" stroke-opacity="0.2" stroke-width="2"/>`;
    }
    const railY = groundY - h * 0.16;
    g += `<rect x="${round(hw * 0.4)}" y="${round(railY)}" width="${round(w - hw * 0.4)}" height="10" rx="3" fill="${s === 'after' ? p.floorLight : p.floorDark}"/>`;
    for (let i = 0; i < 20; i += 1) {
      g += `<rect x="${round(hw * 0.4 + (i * (w - hw * 0.4)) / 20)}" y="${round(railY + 8)}" width="5" height="${round(groundY - railY - 4)}" fill="${s === 'after' ? p.metal : p.floorDark}" opacity="${s === 'after' ? 0.9 : 0.6}"/>`;
    }
    if (s === 'after') {
      g += `<rect x="${round(w * 0.6)}" y="${round(h * 0.76)}" width="${round(w * 0.2)}" height="${round(h * 0.09)}" rx="8" fill="${p.fabric}"/>`;
      g += `<circle cx="${round(w * 0.88)}" cy="${round(h * 0.8)}" r="${round(h * 0.06)}" fill="${p.plant}" opacity="0.85"/>`;
    } else {
      g += wear(rand, w, h, 2);
    }
    return g;
  },

  flooring(p, s, rand, w, h, id) {
    const horizon = h * 0.3;
    let g = '';
    g += `<rect width="${w}" height="${h}" fill="url(#g-back-${id})"/>`;
    g += `<rect x="0" y="${round(horizon - 30)}" width="${w}" height="5" fill="${mix(p.trim, p.wallShadow, 0.4)}"/>`;
    g += `<rect x="0" y="${round(horizon - 26)}" width="${w}" height="26" fill="${p.trim}"/>`;
    g += `<polygon points="0,${round(horizon)} ${w},${round(horizon)} ${w},${h} 0,${h}" fill="url(#g-floor-${id})"/>`;
    const rows = 12;
    for (let r = 0; r < rows; r += 1) {
      const t0 = Math.pow(r / rows, 1.7);
      const t1 = Math.pow((r + 1) / rows, 1.7);
      const y0 = horizon + t0 * (h - horizon);
      const y1 = horizon + t1 * (h - horizon);
      g += `<rect x="0" y="${round(y0)}" width="${w}" height="${round(y1 - y0)}" fill="${rand() > 0.5 ? p.floorLight : p.floorDark}" opacity="${round(0.03 + rand() * 0.06)}"/>`;
      g += `<path d="M0 ${round(y0)} H${w}" stroke="${p.floorDark}" stroke-opacity="0.28" stroke-width="1.8"/>`;
      const seg = 5 + r;
      for (let c = 0; c <= seg; c += 1) {
        const jitter = (c / seg + (r % 2 ? 0.5 / seg : 0)) * w;
        g += `<path d="M${round(jitter)} ${round(y0)} L${round(jitter + (jitter - w / 2) * 0.06)} ${round(y1)}" stroke="${p.floorDark}" stroke-opacity="0.22" stroke-width="1.6"/>`;
      }
    }
    g += `<polygon points="${round(w * 0.1)},${round(horizon)} ${round(w * 0.42)},${round(horizon)} ${round(w * 0.72)},${h} ${round(-w * 0.05)},${h}" fill="url(#g-shaft-${id})"/>`;
    if (s !== 'after') g += wear(rand, w, h, 2);
    return g;
  },

  carpentry(p, s, rand, w, h, id) {
    let g = '';
    g += `<rect width="${w}" height="${h}" fill="url(#g-back-${id})"/>`;
    g += `<rect x="0" y="0" width="${w}" height="${round(h * 0.07)}" fill="${p.trim}"/>`;
    g += `<path d="M0 ${round(h * 0.07)} H${w}" stroke="${p.wallShadow}" stroke-opacity="0.5" stroke-width="3"/>`;
    g += `<path d="M0 ${round(h * 0.045)} H${w}" stroke="${p.wallShadow}" stroke-opacity="0.3" stroke-width="2"/>`;
    const panelTop = h * 0.34;
    const panelBottom = h * 0.86;
    g += `<rect x="0" y="${round(panelTop)}" width="${w}" height="${round(panelBottom - panelTop)}" fill="${mix(p.wallBack, p.trim, s === 'after' ? 0.7 : 0.2)}"/>`;
    g += `<rect x="0" y="${round(panelTop - 14)}" width="${w}" height="16" fill="${p.trim}"/>`;
    const cols = 5;
    for (let i = 0; i < cols; i += 1) {
      const px = w * 0.04 + (i * w * 0.92) / cols;
      const pw = (w * 0.92) / cols - w * 0.03;
      g += `<rect x="${round(px)}" y="${round(panelTop + 26)}" width="${round(pw)}" height="${round(panelBottom - panelTop - 62)}" fill="none" stroke="${p.wallShadow}" stroke-opacity="${s === 'after' ? 0.42 : 0.28}" stroke-width="4"/>`;
      g += `<rect x="${round(px + 9)}" y="${round(panelTop + 35)}" width="${round(pw - 18)}" height="${round(panelBottom - panelTop - 80)}" fill="none" stroke="${p.wallShadow}" stroke-opacity="0.2" stroke-width="2"/>`;
    }
    g += `<rect x="0" y="${round(panelBottom)}" width="${w}" height="${round(h * 0.05)}" fill="${p.trim}"/>`;
    g += `<rect x="0" y="${round(panelBottom + h * 0.05)}" width="${w}" height="${round(h * 0.09)}" fill="url(#g-floor-${id})"/>`;
    g += `<rect x="${round(w * 0.72)}" y="${round(h * 0.09)}" width="${round(w * 0.24)}" height="${round(h * 0.77)}" fill="${mix(p.wallSide, '#000000', s === 'after' ? 0.08 : 0.16)}"/>`;
    g += `<rect x="${round(w * 0.7)}" y="${round(h * 0.07)}" width="${round(w * 0.28)}" height="${round(h * 0.79)}" fill="none" stroke="${p.trim}" stroke-width="16"/>`;
    if (s === 'after') {
      g += `<circle cx="${round(w * 0.2)}" cy="${round(h * 0.2)}" r="${round(h * 0.16)}" fill="${p.light}" opacity="0.34" filter="url(#f-soft-${id})"/>`;
    } else {
      g += wear(rand, w, h, 2);
    }
    return g;
  },

  laundry(p, s, rand, w, h, id) {
    const horizon = h * 0.66;
    let g = '';
    g += `<rect width="${w}" height="${h}" fill="url(#g-back-${id})"/>`;
    g += `<polygon points="0,${round(horizon)} ${w},${round(horizon)} ${w},${h} 0,${h}" fill="url(#g-floor-${id})"/>`;
    g += tileGrid(p, 0, horizon, w, h - horizon, s === 'after' ? 60 : 84, 0.3);
    g += cabinetRun(p, w * 0.06, h * 0.1, w * 0.5, h * 0.22, 3, s);
    g += `<rect x="${round(w * 0.06)}" y="${round(horizon - h * 0.04)}" width="${round(w * 0.88)}" height="${round(h * 0.026)}" fill="url(#g-counter-${id})"/>`;
    for (let i = 0; i < 2; i += 1) {
      const ax = w * (0.1 + i * 0.24);
      g += `<rect x="${round(ax)}" y="${round(horizon - h * 0.26)}" width="${round(w * 0.2)}" height="${round(h * 0.22)}" rx="6" fill="${s === 'after' ? mix(p.metal, '#ffffff', 0.55) : p.metal}"/>`;
      g += `<circle cx="${round(ax + w * 0.1)}" cy="${round(horizon - h * 0.15)}" r="${round(h * 0.07)}" fill="${mix(p.glass, p.wallShadow, 0.4)}" stroke="${p.counterEdge}" stroke-width="5"/>`;
    }
    for (let i = 0; i < 2; i += 1) {
      g += `<rect x="${round(w * 0.62)}" y="${round(h * (0.14 + i * 0.13))}" width="${round(w * 0.32)}" height="10" rx="2" fill="${s === 'after' ? p.floorLight : p.floorDark}"/>`;
    }
    if (s !== 'after') g += wear(rand, w, h, 1);
    return g;
  },
};

/* ----------------------------------------------------------------- render */

function renderScene({ scene, state, width, height, seed }) {
  const p = PALETTES[state];
  const rand = makeRandom(`${seed}:${scene}:${state}`);
  const id = `${scene}${state}${Math.floor(rand() * 100000)}`;
  const body = SCENES[scene](p, state, rand, width, height, id);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="presentation" preserveAspectRatio="xMidYMid slice">
${defs(id, p, state)}
  <g>${body}</g>
  <rect width="${width}" height="${height}" filter="url(#f-grain-${id})" opacity="0.55" style="mix-blend-mode:multiply"/>
  <rect width="${width}" height="${height}" fill="url(#g-vig-${id})"/>
</svg>
`;
}

/* --------------------------------------------------------------- manifest */

const LANDSCAPE = { width: 1600, height: 1067 };
const PORTRAIT = { width: 1000, height: 1250 };
const WIDE = { width: 1920, height: 960 };

const PROJECTS = [
  { slug: 'maple-street-kitchen', scene: 'kitchen', extra: ['flooring', 'carpentry'] },
  { slug: 'harborview-primary-bath', scene: 'bathroom', extra: ['carpentry', 'flooring'] },
  { slug: 'oakridge-basement', scene: 'basement', extra: ['living', 'flooring'] },
  { slug: 'brookfield-living-room', scene: 'living', extra: ['carpentry', 'flooring'] },
  { slug: 'cedar-lane-deck', scene: 'exterior', extra: ['carpentry'] },
  { slug: 'rental-turnover-duplex', scene: 'laundry', extra: ['flooring', 'kitchen'] },
];

const SERVICE_SCENES = {
  'kitchen-remodeling': 'kitchen',
  'bathroom-renovations': 'bathroom',
  'basement-finishing': 'basement',
  'interior-renovations': 'living',
  flooring: 'flooring',
  'drywall-and-painting': 'carpentry',
  'carpentry-and-trim': 'carpentry',
  'doors-and-windows': 'living',
  'decks-and-exteriors': 'exterior',
  'repair-and-restoration': 'laundry',
  'rental-property-turnovers': 'laundry',
  'custom-renovation-projects': 'kitchen',
};

function write(relPath, contents) {
  const full = path.join(outDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents, 'utf8');
}

fs.rmSync(outDir, { recursive: true, force: true });

let count = 0;

write('hero/hero-before.svg', renderScene({ scene: 'kitchen', state: 'before', ...WIDE, seed: 'hero' }));
write('hero/hero-after.svg', renderScene({ scene: 'kitchen', state: 'after', ...WIDE, seed: 'hero' }));
write('hero/hero-detail.svg', renderScene({ scene: 'carpentry', state: 'after', ...PORTRAIT, seed: 'hero-detail' }));
count += 3;

for (const project of PROJECTS) {
  write(`projects/${project.slug}/cover.svg`, renderScene({ scene: project.scene, state: 'after', ...LANDSCAPE, seed: project.slug }));
  write(`projects/${project.slug}/before.svg`, renderScene({ scene: project.scene, state: 'before', ...LANDSCAPE, seed: project.slug }));
  write(`projects/${project.slug}/after.svg`, renderScene({ scene: project.scene, state: 'after', ...LANDSCAPE, seed: project.slug }));
  count += 3;
  project.extra.forEach((scene, i) => {
    const box = i % 2 === 0 ? PORTRAIT : LANDSCAPE;
    write(`projects/${project.slug}/gallery-${i + 1}.svg`, renderScene({ scene, state: 'after', ...box, seed: `${project.slug}-g${i}` }));
    count += 1;
  });
}

for (const [slug, scene] of Object.entries(SERVICE_SCENES)) {
  write(`services/${slug}.svg`, renderScene({ scene, state: 'after', ...LANDSCAPE, seed: `service-${slug}` }));
  count += 1;
}

write('editorial/story.svg', renderScene({ scene: 'carpentry', state: 'after', ...LANDSCAPE, seed: 'story' }));
write('editorial/story-portrait.svg', renderScene({ scene: 'living', state: 'after', ...PORTRAIT, seed: 'story-portrait' }));
write('editorial/about.svg', renderScene({ scene: 'kitchen', state: 'after', ...WIDE, seed: 'about' }));
write('editorial/process.svg', renderScene({ scene: 'basement', state: 'after', ...LANDSCAPE, seed: 'process' }));
write('editorial/service-area.svg', renderScene({ scene: 'exterior', state: 'after', ...LANDSCAPE, seed: 'service-area' }));
write('editorial/cta.svg', renderScene({ scene: 'living', state: 'after', ...WIDE, seed: 'cta' }));
write('editorial/reviews.svg', renderScene({ scene: 'bathroom', state: 'after', ...LANDSCAPE, seed: 'reviews' }));
write('editorial/contact.svg', renderScene({ scene: 'flooring', state: 'after', ...LANDSCAPE, seed: 'contact' }));
write('og/kellums-second-chance-og.svg', renderScene({ scene: 'kitchen', state: 'after', width: 1200, height: 630, seed: 'og' }));
count += 9;

console.log(`Generated ${count} placeholder renderings in public/media`);
