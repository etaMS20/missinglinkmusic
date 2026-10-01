// Living room PA and DJ gear, built from primitives. Every model: origin at its bottom center, front facing +z, sizes in meters.
import * as THREE from 'three';
import { group, labelTexture, mat, mesh, type V3 } from './build';

const PI = Math.PI;
const black = mat('#151515', { roughness: 0.7 });
const rubber = mat('#0a0a0a', { roughness: 0.95 });
const chrome = mat('#d6d6d6', { roughness: 0.15, metalness: 0.7 });
const silver = mat('#a6a6aa', { roughness: 0.35, metalness: 0.6 });
const coneMat = mat('#262626', { roughness: 0.9, side: THREE.DoubleSide });
const hidden = new THREE.MeshBasicMaterial({ visible: false });

// loudspeaker cone (or square horn) sunk into the baffle, pos = its center on the baffle
function driver(parent: THREE.Object3D, r: number, pos: V3, horn = false) {
    const g = group(parent, pos);
    const depth = r * (horn ? 1.2 : 0.6);
    mesh(g, new THREE.ConeGeometry(r, depth, horn ? 4 : 24, 1, true, PI / 4), coneMat, [0, 0, -depth / 2], [-PI / 2, 0, 0]);
    if (horn) return;
    mesh(g, new THREE.TorusGeometry(r, r * 0.05, 6, 24), rubber);
    mesh(g, new THREE.SphereGeometry(r * 0.25, 12, 6, 0, PI * 2, 0, PI / 2), rubber, [0, 0, -r * 0.45], [PI / 2, 0, 0]);
}

// Funktion-One cabinets: navy shell with an open front, panels and horns set into it
const navy = mat('#26244a', { roughness: 0.85 });
const navyInside = mat('#2e2c56', { roughness: 0.9, side: THREE.BackSide });
const hornGrey = mat('#c4c6cc', { roughness: 0.6, side: THREE.DoubleSide });
const throatMat = mat('#0e0e12', { roughness: 0.9 });
const corners = (x: number, y: number, w: number, h: number, chamfer = 0) => [
    new THREE.Vector2(x - w / 2, y - h / 2),
    new THREE.Vector2(x + w / 2, y - h / 2),
    ...(chamfer ? [new THREE.Vector2(x + w / 2, y + h / 2 - chamfer), new THREE.Vector2(x + w / 2 - chamfer, y + h / 2), new THREE.Vector2(x - w / 2 + chamfer, y + h / 2), new THREE.Vector2(x - w / 2, y + h / 2 - chamfer)] : [new THREE.Vector2(x + w / 2, y + h / 2), new THREE.Vector2(x - w / 2, y + h / 2)]),
];
// w×h×d box with no front face, plus its front baffle cut around the openings
function shell(g: THREE.Group, w: number, h: number, d: number, openings: THREE.Vector2[][]) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [navy, navy, navy, navy, hidden, navy]);
    box.position.y = h / 2;
    g.add(box);
    const front = new THREE.Shape(corners(0, h / 2, w, h));
    front.holes.push(...openings.map((pts) => new THREE.Path(pts)));
    mesh(g, new THREE.ShapeGeometry(front), navy, [0, 0, d / 2]);
}
// recessed box seen from inside through its open front: w×h opening at pos, depth deep
function cavity(g: THREE.Group, w: number, h: number, depth: number, pos: V3, back = true) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), [navyInside, navyInside, navyInside, navyInside, hidden, back ? navyInside : hidden]);
    box.position.set(pos[0], pos[1], pos[2] - depth / 2);
    g.add(box);
}
// rectangular horn flaring from its throat (fraction of the mouth) to a w×h mouth at pos
function horn(g: THREE.Group, w: number, h: number, depth: number, throat: number, pos: V3) {
    const m = mesh(g, new THREE.CylinderGeometry(1, throat, 1, 4, 1, true, PI / 4), hornGrey, [pos[0], pos[1], pos[2] - depth / 2], [PI / 2, 0, 0]);
    m.scale.set(w / Math.SQRT2, depth, h / Math.SQRT2);
    mesh(g, new THREE.PlaneGeometry(w * throat, h * throat), throatMat, [pos[0], pos[1], pos[2] - depth + 0.002]);
}

// Funktion-One Evo 2 (spec sheet: 780 × 520 × 450 mm): grey mid/high horn panel above an open bass horn
export function evo2() {
    const g = group();
    const [w, h, d] = [0.52, 0.78, 0.45];
    const f = d / 2;
    const panel = corners(0, 0.53, 0.47, 0.44, 0.08);
    const bass = corners(0, 0.155, 0.47, 0.25);
    shell(g, w, h, d, [panel, bass]);
    const hf = corners(0, 0.67, 0.2, 0.09);
    const mid = corners(0, 0.46, 0.4, 0.24);
    const plate = new THREE.Shape(panel);
    plate.holes.push(new THREE.Path(hf), new THREE.Path(mid));
    mesh(g, new THREE.ShapeGeometry(plate), hornGrey, [0, 0, f + 0.001]);
    horn(g, 0.2, 0.09, 0.18, 0.35, [0, 0.67, f]);
    horn(g, 0.4, 0.24, 0.3, 0.25, [0, 0.46, f]);
    // phase plug sticking out of the mid horn
    const plug = mesh(g, new THREE.ConeGeometry(1, 1, 4, 1, false, PI / 4), hornGrey, [0, 0.46, f - 0.07], [PI / 2, 0, 0]);
    plug.scale.set(0.13 * Math.SQRT2, 0.18, 0.04 * Math.SQRT2);
    cavity(g, 0.47, 0.25, 0.38, [0, 0.155, f]);
    driver(g, 0.1, [-0.1, 0.155, f - 0.38 + 0.002]);
    mesh(g, new THREE.BoxGeometry(0.025, 0.27, 0.025), navy, [0.03, 0.155, f - 0.05], [0, 0, -0.25]);
    return g;
}

// tiling hex perforation drawn to a canvas; hole null punches the holes through (use with alphaTest)
const perforations = new Map<string, THREE.Texture>();
function perforated(metal: string, hole: string | null, rx: number, ry: number) {
    const key = [metal, hole, rx, ry].join();
    if (perforations.has(key)) return perforations.get(key)!;
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = metal;
    ctx.fillRect(0, 0, 32, 32);
    if (hole) ctx.fillStyle = hole;
    else ctx.globalCompositeOperation = 'destination-out';
    for (const [x, y] of [[8, 8], [24, 8], [0, 24], [16, 24], [32, 24]]) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, PI * 2);
        ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(rx, ry);
    perforations.set(key, tex);
    return tex;
}

// Funktion-One F118 MKII (672 × 723 × 496 mm): single 18" behind a curved grille in an open-fronted box
export function f118() {
    const g = group();
    const [w, h, d] = [0.723, 0.672, 0.496];
    const f = d / 2;
    const [iw, ih, id] = [w - 0.05, h - 0.05, d - 0.05];
    shell(g, w, h, d, [corners(0, h / 2, iw, ih)]);
    cavity(g, iw, ih, id, [0, h / 2, f]);
    const r = 0.13;
    mesh(g, new THREE.CylinderGeometry(r, r, ih, 24, 1, true, PI / 2, PI), mat('#ffffff', { map: perforated('#c8c8cc', '#16161c', 5, 14), roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide }), [0.07, h / 2, f - id + r]);
    mesh(g, new THREE.BoxGeometry(0.035, ih, 0.06), navy, [0.056, h / 2, f - 0.04]);
    mesh(g, new THREE.BoxGeometry(iw / 2 - 0.056, 0.025, 0.3), navy, [(0.056 + iw / 2) / 2, h / 2, f - 0.17]);
    return g;
}

// Funktion-One BR218 (1020 × 580 × 594 mm, stood on end): two 18" stacked behind a black hex grille
export function br218() {
    const g = group();
    const [w, h, d] = [0.58, 1.02, 0.594];
    const f = d / 2;
    const [iw, ih] = [w - 0.08, h - 0.08];
    shell(g, w, h, d, [corners(0, h / 2, iw, ih)]);
    // drivers sit on a baffle a little behind the grille
    const inset = 0.08;
    cavity(g, iw, ih, inset, [0, h / 2, f], false);
    const baffle = new THREE.Shape(corners(0, h / 2, iw, ih));
    for (const y of [h / 2 - 0.24, h / 2 + 0.24]) {
        baffle.holes.push(new THREE.Path().absarc(0, y, 0.22, 0, PI * 2));
        driver(g, 0.22, [0, y, f - inset]);
    }
    mesh(g, new THREE.ShapeGeometry(baffle, 24), navy, [0, 0, f - inset]);
    mesh(g, new THREE.PlaneGeometry(iw, ih), mat('#ffffff', { map: perforated('#1b1b20', null, 20, 38), alphaTest: 0.5, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide }), [0, h / 2, f - 0.01]);
    return g;
}

// USM Haller table: chrome tube frame with ball joints under a laminate top
export function usmHaller(w: number, d: number, h: number) {
    const g = group();
    const r = 0.0125;
    const ball = 0.0175;
    const xc = w / 2 - 0.04;
    const zc = d / 2 - 0.04;
    const fy = h - 0.02 - ball; // height of the ball joints
    const legGeo = new THREE.CylinderGeometry(r, r, fy, 12);
    const ballGeo = new THREE.SphereGeometry(ball, 16, 12);
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            mesh(g, legGeo, chrome, [sx * xc, fy / 2, sz * zc]);
            mesh(g, ballGeo, chrome, [sx * xc, fy, sz * zc]);
        }
        mesh(g, new THREE.CylinderGeometry(r, r, 2 * xc, 12), chrome, [0, fy, sx * zc], [0, 0, PI / 2]);
        mesh(g, new THREE.CylinderGeometry(r, r, 2 * zc, 12), chrome, [sx * xc, fy, 0], [PI / 2, 0, 0]);
    }
    mesh(g, new THREE.BoxGeometry(w, 0.02, d), mat('#ecebe6', { roughness: 0.45 }), [0, h - 0.01, 0]);
    return g;
}

// Technics SL-1200MK2; the caller spins the returned platter
export function technics1200() {
    const g = group();
    const top = 0.14;
    for (const x of [-0.19, 0.19]) for (const z of [-0.14, 0.14]) mesh(g, new THREE.CylinderGeometry(0.035, 0.04, 0.04, 12), rubber, [x, 0.02, z]);
    mesh(g, new THREE.BoxGeometry(0.453, 0.1, 0.353), silver, [0, 0.09, 0]);
    const platter = group(g, [-0.045, top, 0.005]);
    mesh(platter, new THREE.CylinderGeometry(0.166, 0.166, 0.02, 48), silver, [0, 0.01, 0]);
    mesh(platter, new THREE.CylinderGeometry(0.15, 0.15, 0.004, 48), mat('#0c0c0c', { roughness: 0.25 }), [0, 0.022, 0]); // record on its slipmat
    // two-tone label, so the spin shows
    for (const [color, start] of [['#c8102e', 0], ['#f2f2f2', PI]] as const) mesh(platter, new THREE.CircleGeometry(0.05, 24, start, PI), mat(color, { roughness: 0.6 }), [0, 0.0245, 0], [-PI / 2, 0, 0]);
    mesh(platter, new THREE.CylinderGeometry(0.0036, 0.0036, 0.03, 8), chrome, [0, 0.03, 0]);
    // tonearm, needle down on the record
    const base = group(g, [0.16, top, -0.1]);
    mesh(base, new THREE.CylinderGeometry(0.032, 0.032, 0.012, 24), silver, [0, 0.006, 0]);
    mesh(base, new THREE.CylinderGeometry(0.008, 0.008, 0.035, 8), chrome, [0, 0.018, 0]);
    const [dx, dz] = [-0.12, 0.18]; // pivot to needle
    const len = Math.hypot(dx, dz);
    const arm = group(base, [0, 0.035, 0], [0, Math.atan2(dx, dz), 0]);
    mesh(arm, new THREE.CylinderGeometry(0.004, 0.004, len, 8), chrome, [0, 0, len / 2], [PI / 2, 0, 0]);
    mesh(arm, new THREE.BoxGeometry(0.018, 0.006, 0.045), black, [0, -0.002, len]);
    mesh(arm, new THREE.CylinderGeometry(0.018, 0.018, 0.035, 16), silver, [0, 0, -0.04], [PI / 2, 0, 0]);
    // pitch fader, start/stop, strobe
    mesh(g, new THREE.BoxGeometry(0.012, 0.002, 0.11), rubber, [0.19, top + 0.001, 0.09]);
    mesh(g, new THREE.BoxGeometry(0.028, 0.012, 0.014), black, [0.19, top + 0.006, 0.09]);
    mesh(g, new THREE.BoxGeometry(0.045, 0.01, 0.032), black, [-0.185, top + 0.005, 0.145]);
    mesh(g, new THREE.CylinderGeometry(0.008, 0.008, 0.01, 12), new THREE.MeshBasicMaterial({ color: '#ff2a1a' }), [-0.2, top + 0.005, -0.15]);
    return { g, platter };
}

// Allen & Heath Xone:92: four channels, two filter sections, LED meters. The panel glows while aimed at.
export function xone92() {
    const g = group();
    const panel = mat('#2b2b2e', { roughness: 0.5, metalness: 0.3, emissive: '#ffd700', emissiveIntensity: 0 });
    mesh(g, new THREE.BoxGeometry(0.32, 0.1, 0.42), panel, [0, 0.05, 0]);
    const y = 0.1;
    const grey = mat('#d9d9d9', { roughness: 0.4 });
    const knob = new THREE.CylinderGeometry(0.009, 0.01, 0.016, 12);
    const cap = new THREE.BoxGeometry(0.014, 0.012, 0.022);
    const slot = (x: number, z: number, w: number, d: number) => mesh(g, new THREE.BoxGeometry(w, 0.001, d), rubber, [x, y + 0.0005, z]);
    for (const [i, x] of [-0.1, -0.04, 0.04, 0.1].entries()) {
        for (let k = 0; k < 7; k++) mesh(g, knob, grey, [x, y + 0.008, -0.18 + k * 0.034]);
        slot(x, 0.13, 0.004, 0.08);
        mesh(g, cap, grey, [x, y + 0.006, [0.1, 0.14, 0.11, 0.155][i]]);
    }
    slot(0, 0.195, 0.09, 0.004);
    mesh(g, cap, grey, [0, y + 0.006, 0.195], [0, PI / 2, 0]);
    // filter sections
    const filterKnob = new THREE.CylinderGeometry(0.014, 0.015, 0.02, 16);
    const orange = mat('#ff8c1a', { roughness: 0.4 });
    for (const sx of [-1, 1]) {
        for (const z of [-0.16, -0.1, -0.04]) mesh(g, filterKnob, orange, [sx * 0.145, y + 0.01, z]);
        for (const z of [0.03, 0.08]) mesh(g, knob, grey, [sx * 0.145, y + 0.008, z]);
    }
    // stereo LED meter between the channels
    const led = new THREE.BoxGeometry(0.008, 0.002, 0.01);
    const leds = ['#3cff6a', '#ffd23c', '#ff3c3c'].map((color) => new THREE.MeshBasicMaterial({ color }));
    for (const x of [-0.008, 0.008]) for (let k = 0; k < 10; k++) mesh(g, led, leds[k < 6 ? 0 : k < 8 ? 1 : 2], [x, y + 0.001, 0.02 - k * 0.016]);
    return { g, panel };
}

// high-end power amp: black glass front with blue-lit meters
export function amp() {
    const g = group();
    const [w, h, d] = [0.445, 0.2, 0.5];
    const front = d / 2;
    mesh(g, new THREE.BoxGeometry(w, h, d), black, [0, h / 2, 0]);
    mesh(g, new THREE.BoxGeometry(w, h - 0.01, 0.01), mat('#050508', { roughness: 0.05, metalness: 0.3 }), [0, h / 2, front + 0.005]);
    const meter = new THREE.MeshBasicMaterial({ color: '#3f8cff' });
    const needle = new THREE.MeshBasicMaterial({ color: '#000000' });
    for (const sx of [-1, 1]) {
        mesh(g, new THREE.PlaneGeometry(0.13, 0.065), meter, [sx * 0.085, 0.125, front + 0.011]);
        mesh(g, new THREE.PlaneGeometry(0.002, 0.05), needle, [sx * 0.085 + 0.01, 0.12, front + 0.012], [0, 0, -0.4]);
        // rack handles
        const hx = sx * (w / 2 - 0.015);
        mesh(g, new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8), chrome, [hx, h / 2, front + 0.04]);
        for (const hy of [0.03, 0.17]) mesh(g, new THREE.CylinderGeometry(0.006, 0.006, 0.04, 8), chrome, [hx, hy, front + 0.02], [PI / 2, 0, 0]);
    }
    for (const x of [-0.15, -0.05, 0.05, 0.15]) mesh(g, new THREE.CylinderGeometry(0.012, 0.012, 0.015, 16), chrome, [x, 0.045, front + 0.017], [PI / 2, 0, 0]);
    mesh(g, new THREE.PlaneGeometry(0.16, 0.03), new THREE.MeshBasicMaterial({ map: labelTexture('MISSING LINK', '#7fc4ff'), transparent: true }), [0, 0.075, front + 0.011]);
    return g;
}

// tiling canvas texture, `size` meters per tile; use on geometry whose UVs run in meters (see meterPlane)
function canvasTexture(px: number, size: [number, number], draw: (ctx: CanvasRenderingContext2D) => void) {
    const c = document.createElement('canvas');
    c.width = c.height = px;
    draw(c.getContext('2d')!);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1 / size[0], 1 / size[1]);
    tex.anisotropy = 4;
    return tex;
}

// polished concrete: mottled grey with a saw-cut joint every 3 m
export const concreteTexture = () =>
    canvasTexture(512, [3, 3], (ctx) => {
        ctx.fillStyle = '#7d7b78';
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 400; i++) {
            const shade = 100 + Math.random() * 40;
            ctx.fillStyle = `rgba(${shade}, ${shade - 2}, ${shade - 5}, 0.08)`;
            ctx.beginPath();
            ctx.arc(Math.random() * 512, Math.random() * 512, 10 + Math.random() * 60, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = '#4a4846';
        ctx.fillRect(0, 0, 512, 2);
        ctx.fillRect(0, 0, 2, 512);
    });

// red brick in running bond: 4 bricks across 1 m, 16 courses up 1.2 m
export const brickTexture = () =>
    canvasTexture(512, [1, 1.2], (ctx) => {
        ctx.fillStyle = '#9a9188'; // mortar
        ctx.fillRect(0, 0, 512, 512);
        const bw = 128;
        const bh = 32;
        for (let row = 0; row < 16; row++) {
            for (let x = row % 2 ? -bw / 2 : 0; x < 512; x += bw) {
                ctx.fillStyle = `hsl(${10 + Math.random() * 12} ${35 + Math.random() * 20}% ${24 + Math.random() * 12}%)`;
                ctx.fillRect(x + 3, row * bh + 3, bw - 6, bh - 6);
            }
        }
    });
