// Port of the retro-art-gallery R3F scene to plain three.js.
import * as THREE from 'three';
import { group, labelTexture, mat, mesh, pointLight, type V3 } from './build';
import { ITEMS, setFill, STARTER_ITEMS, type ItemId } from './items';

const PI = Math.PI;
const MOVE_SPEED = 3;
const SPRINT = 1.8; // speed multiplier while Shift is held
const EYE = 1.6; // eye height above the feet
const GRAVITY = 20;
const JUMP_V = 6.3; // ~1m jump, enough for the couch backrest
const STEP = 0.15; // ledges this low are walked onto without jumping
const PAINTING_MAX = 1.6; // longest side of a canvas, frames follow the image ratio
const REACH = 3.5; // how far the crosshair can interact
const PLAYER_R = 0.3;
const DOOR_W = 1.6; // doorway and corridor width
const DOOR_H = 2.6;
const CORRIDOR_LEN = 12;
const CORRIDOR_END = 5 + CORRIDOR_LEN;

const artworks = [
    { title: 'Sternennacht', artist: 'Vincent van Gogh', year: '1889', description: 'Ein ikonisches Meisterwerk des Post-Impressionismus, das den Nachthimmel über Saint-Rémy-de-Provence zeigt.', position: [-4.9, 2, 0], rotation: [0, PI / 2, 0], image: '/art/starry-night.jpg' },
    { title: 'Der Schrei', artist: 'Edvard Munch', year: '1893', description: 'Ein expressionistisches Werk, das existenzielle Angst und die Entfremdung des modernen Menschen darstellt.', position: [4.9, 2, 0], rotation: [0, -PI / 2, 0], image: '/art/the-scream.jpg' },
    { title: 'Mona Lisa', artist: 'Leonardo da Vinci', year: '1503-1519', description: 'Das berühmteste Porträt der Welt, bekannt für das geheimnisvolle Lächeln der Dargestellten.', position: [0, 2, -4.9], rotation: [0, 0, 0], image: '/art/mona-lisa.jpg' },
    { title: 'Die Beständigkeit der Erinnerung', artist: 'Salvador Dalí', year: '1931', description: 'Dalís surrealistisches Meisterwerk mit den berühmten schmelzenden Uhren.', position: [-2.5, 2, -4.9], rotation: [0, 0, 0], image: '/art/persistence-of-memory.jpg' },
    { title: 'Die Große Welle', artist: 'Katsushika Hokusai', year: '1831', description: 'Der berühmte japanische Holzschnitt zeigt eine riesige Welle vor dem Berg Fuji.', position: [2.5, 2, -4.9], rotation: [0, 0, 0], image: '/art/great-wave.jpg' },
    { title: 'Collage1', artist: 'Wisoir', year: 'unbekannt', description: '', position: [-4.9, 2, -2.5], rotation: [0, PI / 2, 0], image: '/art/willy1.jpg' },
] as { title: string; artist: string; year: string; description: string; position: V3; rotation: V3; image: string }[];
type Artwork = (typeof artworks)[number];

const lampPositions: V3[] = [[3.5, 0, 3.5], [-3.5, 0, 3.5], [3.5, 0, -3.5], [-3.5, 0, -3.5]];

const $ = (id: string) => document.getElementById(id)!;

// --- scene ----------------------------------------------------------------

const nextFrame = () => new Promise(requestAnimationFrame);
function loadingStatus(text: string, percent: number) {
    $('loading-text').textContent = text;
    $('loading-bar').style.width = `${percent}%`;
}

async function start() {
    // let the loading screen paint before the synchronous scene build blocks the thread
    loadingStatus('Baue Galerie auf', 5);
    await nextFrame();
    const container = $('gallery');
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // R3F default, keeps the original look
    renderer.domElement.className = 'touch-none cursor-grab active:cursor-none';
    container.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#3a3a5a');
    scene.fog = new THREE.Fog('#3a3a5a', 15, 35);

    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 4);
    scene.add(camera);

    // global lights
    scene.add(new THREE.AmbientLight('#f5ebe0', 0.6));
    const hemi = new THREE.HemisphereLight('#fff8f0', '#4a3f5c', 0.5);
    hemi.position.set(0, 5, 0);
    scene.add(hemi);
    pointLight(scene, '#ffeaa7', 2, 0, [0, 4.5, 0], true);
    for (const [x, z, i] of [[-3, -3, 0.9], [3, -3, 0.9], [0, 3, 0.7], [-3, 3, 0.5], [3, 3, 0.5]]) pointLight(scene, '#fff5e6', i, 0, [x, 3, z]);
    pointLight(scene, '#ffcc80', 0.4, 0, [0, 0.5, 0]);

    // floor, ceiling, walls
    mesh(scene, new THREE.PlaneGeometry(10, 10, 20, 20), mat('#5c4033', { roughness: 0.7, metalness: 0.1 }), [0, 0, 0], [-PI / 2, 0, 0], 'receive');
    mesh(scene, new THREE.PlaneGeometry(10, 10), mat('#6b4c3a', { roughness: 0.8, transparent: true, opacity: 0.4 }), [0, 0.01, 0], [-PI / 2, 0, 0]);
    mesh(scene, new THREE.PlaneGeometry(10, 10), mat('#3d3d5c', { roughness: 0.9 }), [0, 5, 0], [PI / 2, 0, 0]);
    const wallGeo = new THREE.PlaneGeometry(10, 5);
    for (const [pos, rotY, color] of [[[0, 2.5, -5], 0, '#4a3f5c'], [[-5, 2.5, 0], PI / 2, '#524560'], [[5, 2.5, 0], -PI / 2, '#524560']] as [V3, number, string][]) {
        mesh(scene, wallGeo, mat(color, { roughness: 0.85 }), pos, [0, rotY, 0], 'receive');
    }
    // front wall, built around the doorway; double-sided so the corridor sees it too
    const frontMat = mat('#4a3f5c', { roughness: 0.85, side: THREE.DoubleSide });
    const sideW = 5 - DOOR_W / 2;
    for (const sx of [-1, 1]) mesh(scene, new THREE.PlaneGeometry(sideW, 5), frontMat, [sx * (DOOR_W / 2 + sideW / 2), 2.5, 5], [0, PI, 0], 'receive');
    mesh(scene, new THREE.PlaneGeometry(DOOR_W, 5 - DOOR_H), frontMat, [0, (5 + DOOR_H) / 2, 5], [0, PI, 0]);

    // wall trim, bottom and crown
    const trimGeo = new THREE.BoxGeometry(10, 0.3, 0.1);
    const trimMat = mat('#8b7355', { roughness: 0.4, metalness: 0.3 });
    for (const y of [0.15, 4.85]) {
        mesh(scene, trimGeo, trimMat, [0, y, -4.95]);
        mesh(scene, trimGeo, trimMat, [-4.95, y, 0], [0, PI / 2, 0]);
        mesh(scene, trimGeo, trimMat, [4.95, y, 0], [0, PI / 2, 0]);
    }

    // ceiling spotlight rails
    const brassGlow = mat('#c9a86c', { roughness: 0.3, metalness: 0.5, emissive: '#ffd700', emissiveIntensity: 0.3 });
    for (const x of [-3, 0, 3]) {
        const g = group(scene, [x, 4.8, 0]);
        mesh(g, new THREE.BoxGeometry(0.6, 0.15, 2.5), mat('#4a4a4a', { roughness: 0.6 }));
        pointLight(g, '#fff5e0', 0.8, 8, [0, -0.3, 0]);
        for (const z of [-0.8, 0, 0.8]) mesh(g, new THREE.CylinderGeometry(0.08, 0.12, 0.15, 8), brassGlow, [0, -0.1, z]);
    }

    // chandelier
    const chandelier = group(scene, [0, 4.5, 0]);
    mesh(chandelier, new THREE.CylinderGeometry(0.15, 0.3, 0.4, 8), mat('#c9a86c', { roughness: 0.3, metalness: 0.6 }));
    mesh(chandelier, new THREE.SphereGeometry(0.25, 16, 16), mat('#fffae6', { roughness: 0.2, emissive: '#ffeaa7', emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }), [0, -0.3, 0]);

    // pillars
    const marbleLight = mat('#d4c4a8', { roughness: 0.6 });
    const marble = mat('#c9b896', { roughness: 0.5 });
    for (const [x, z] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]]) {
        const g = group(scene, [x, 0, z]);
        mesh(g, new THREE.BoxGeometry(0.6, 0.4, 0.6), marbleLight, [0, 0.2, 0], undefined, 'cast');
        mesh(g, new THREE.CylinderGeometry(0.2, 0.25, 4.6, 12), marble, [0, 2.7, 0], undefined, 'cast');
        mesh(g, new THREE.BoxGeometry(0.55, 0.3, 0.55), marbleLight, [0, 4.8, 0], undefined, 'cast');
    }

    // collision. Walkable floor areas as [minX, maxX, minZ, maxZ], already shrunk by the player radius.
    const walkable = [
        [-4, 4, -4, 4],
        [-DOOR_W / 2 + PLAYER_R, DOOR_W / 2 - PLAYER_R, 3.9, CORRIDOR_END - 1], // stop short of the exit door so it stays in view
    ];
    const onFloor = (x: number, z: number, grow = 0) =>
        walkable.some(([x0, x1, z0, z1]) => x >= x0 - grow && x <= x1 + grow && z >= z0 - grow && z <= z1 + grow);
    // Furniture as boxes with a top height: blocks you unless you're above it, then you stand on it.
    type Box = { x0: number; x1: number; z0: number; z1: number; top: number };
    const boxes: Box[] = [];
    const box = (x: number, z: number, halfW: number, halfD: number, top: number) => boxes.push({ x0: x - halfW, x1: x + halfW, z0: z - halfD, z1: z + halfD, top });
    const over = (b: Box, x: number, z: number, margin: number) => x > b.x0 - margin && x < b.x1 + margin && z > b.z0 - margin && z < b.z1 + margin;
    const groundAt = (x: number, z: number, margin: number) => boxes.reduce((h, b) => (over(b, x, z, margin) ? Math.max(h, b.top) : h), 0);
    const free = (x: number, z: number, feet: number) => onFloor(x, z) && boxes.every((b) => !over(b, x, z, PLAYER_R) || b.top <= feet + STEP);

    // black leather couch facing the back wall
    const leather = mat('#141414', { roughness: 0.35, metalness: 0.15 });
    const darkWood = mat('#3b2a1e', { roughness: 0.6 });
    const couch = group(scene, [0, 0, 0.5]);
    mesh(couch, new THREE.BoxGeometry(2.2, 0.22, 0.9), leather, [0, 0.21, 0], undefined, 'cast');
    mesh(couch, new THREE.BoxGeometry(2.2, 0.6, 0.22), leather, [0, 0.6, 0.34], undefined, 'cast');
    for (const sx of [-1, 1]) {
        mesh(couch, new THREE.BoxGeometry(0.2, 0.5, 0.9), leather, [sx, 0.45, 0], undefined, 'cast');
        mesh(couch, new THREE.BoxGeometry(0.88, 0.16, 0.68), leather, [sx * 0.45, 0.4, -0.08]);
        mesh(couch, new THREE.BoxGeometry(0.88, 0.42, 0.16), leather, [sx * 0.45, 0.68, 0.16], [-0.15, 0, 0]);
        for (const sz of [-1, 1]) mesh(couch, new THREE.CylinderGeometry(0.035, 0.03, 0.1, 6), darkWood, [sx, 0.05, sz * 0.38]);
    }
    mesh(couch, new THREE.BoxGeometry(0.34, 0.34, 0.12), mat('#b8862b', { roughness: 0.9 }), [-0.68, 0.62, 0.02], [-0.2, 0.3, 0.1]);
    box(0, 0.5, 1.1, 0.45, 0.48); // seat
    box(0, 0.84, 1.1, 0.11, 0.9); // backrest
    for (const sx of [-1, 1]) box(sx, 0.5, 0.1, 0.45, 0.7); // armrests

    // doorway frame; the entry door stands open against the wall, the exit door is closed
    function door(z: number, open: boolean) {
        const g = group(scene, [0, 0, z]);
        for (const sx of [-1, 1]) mesh(g, new THREE.BoxGeometry(0.12, DOOR_H, 0.16), darkWood, [sx * (DOOR_W / 2 + 0.06), DOOR_H / 2, -0.05]);
        mesh(g, new THREE.BoxGeometry(DOOR_W + 0.24, 0.12, 0.16), darkWood, [0, DOOR_H + 0.06, -0.05]);
        const leafMat = mat('#5a3d2b', { roughness: 0.55, emissive: '#ffd700', emissiveIntensity: 0 });
        const hinge = group(g, [-DOOR_W / 2, 0, -0.06], [0, open ? PI * 0.95 : 0, 0]);
        mesh(hinge, new THREE.BoxGeometry(DOOR_W - 0.04, DOOR_H - 0.04, 0.06), leafMat, [DOOR_W / 2, DOOR_H / 2, 0]);
        for (const y of [0.75, 1.85]) mesh(hinge, new THREE.BoxGeometry(DOOR_W - 0.4, 0.8, 0.02), darkWood, [DOOR_W / 2, y, -0.035]);
        mesh(hinge, new THREE.SphereGeometry(0.05, 8, 8), mat('#c9a86c', { roughness: 0.3, metalness: 0.7 }), [DOOR_W - 0.15, 1.05, -0.06]);
        return { g, leafMat };
    }
    door(5, true);

    // corridor behind the front wall, exit door at its end
    const corridorMid = (5 + CORRIDOR_END) / 2;
    const CORRIDOR_H = 3;
    mesh(scene, new THREE.PlaneGeometry(DOOR_W, CORRIDOR_LEN), mat('#4a1c1c', { roughness: 0.95 }), [0, 0, corridorMid], [-PI / 2, 0, 0], 'receive');
    mesh(scene, new THREE.PlaneGeometry(DOOR_W, CORRIDOR_LEN), mat('#3d3d5c', { roughness: 0.9 }), [0, CORRIDOR_H, corridorMid], [PI / 2, 0, 0]);
    for (const sx of [-1, 1]) mesh(scene, new THREE.PlaneGeometry(CORRIDOR_LEN, CORRIDOR_H), mat('#524560', { roughness: 0.85 }), [sx * DOOR_W / 2, CORRIDOR_H / 2, corridorMid], [0, -sx * PI / 2, 0], 'receive');
    mesh(scene, new THREE.PlaneGeometry(DOOR_W, CORRIDOR_H), mat('#4a3f5c', { roughness: 0.85 }), [0, CORRIDOR_H / 2, CORRIDOR_END], [0, PI, 0]);
    for (const f of [0.3, 0.75]) {
        const z = 5 + CORRIDOR_LEN * f;
        mesh(scene, new THREE.BoxGeometry(0.5, 0.05, 0.5), mat('#fffae6', { emissive: '#ffeaa7', emissiveIntensity: 0.8 }), [0, CORRIDOR_H - 0.03, z]);
        pointLight(scene, '#ffe8c0', 1.2, 8, [0, CORRIDOR_H - 0.3, z]);
    }
    const exit = door(CORRIDOR_END, false);
    const exitDoor = { exit: true, leafMat: exit.leafMat };
    exit.g.userData.target = exitDoor;
    mesh(exit.g, new THREE.BoxGeometry(0.9, 0.25, 0.05), new THREE.MeshBasicMaterial({ color: '#0b3d1a' }), [0, DOOR_H + 0.3, -0.05]);
    mesh(exit.g, new THREE.PlaneGeometry(0.9, 0.17), new THREE.MeshBasicMaterial({ map: labelTexture('AUSGANG', '#4ade80'), transparent: true }), [0, DOOR_H + 0.3, -0.08], [0, PI, 0]);

    // central hanging lamp
    const hanging = group(scene, [0, 4.2, 0]);
    mesh(hanging, new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), mat('#8b7355', { metalness: 0.6, roughness: 0.4 }), [0, 0.4, 0]);
    mesh(hanging, new THREE.TorusGeometry(0.4, 0.03, 8, 24), mat('#c9a86c', { metalness: 0.7, roughness: 0.3 }));
    mesh(hanging, new THREE.SphereGeometry(0.35, 16, 16, 0, PI * 2, 0, PI / 2), mat('#fffae6', { transparent: true, opacity: 0.6, emissive: '#ffeaa7', emissiveIntensity: 0.4, side: THREE.DoubleSide }), [0, -0.15, 0]);
    pointLight(hanging, '#fff8e7', 2, 10, [0, -0.1, 0], true);

    // paintings
    // tracks every texture load so the loading screen knows when the scene is complete
    const manager = new THREE.LoadingManager();
    const loaded = new Promise<void>((resolve) => (manager.onLoad = resolve));
    manager.onProgress = (_url, done, total) => loadingStatus(`Lade Kunstwerke ${done}/${total}`, 10 + (60 * done) / total);
    const loader = new THREE.TextureLoader(manager);
    // unit-size geometry, scaled to the image's aspect ratio once it has loaded
    const frameGeo = new THREE.BoxGeometry(1, 1, 0.1);
    const canvasGeo = new THREE.PlaneGeometry(1, 1);
    const plaqueMat = mat('#1a1a2e', { roughness: 0.4, metalness: 0.5 });
    const paintings = artworks.map((artwork) => {
        const g = group(scene, artwork.position, artwork.rotation);
        const frame = mat('#3d3d3d', { roughness: 0.3, metalness: 0.6, emissive: '#ffd700', emissiveIntensity: 0 });
        const frameMesh = mesh(g, frameGeo, frame, undefined, undefined, 'cast');
        const art = mesh(g, canvasGeo, mat('#ffffff', { roughness: 0.7, metalness: 0 }), [0, 0, 0.06]);
        const spot = new THREE.SpotLight('#fff8e7', 0.8, 0, 0.5, 0.5);
        spot.position.set(0, 1.5, 1);
        g.add(spot, spot.target); // target at the painting's center
        const plaque = mesh(g, new THREE.BoxGeometry(0.8, 0.15, 0.02), plaqueMat, [0, 0, 0.05]);
        const label = mesh(g, new THREE.PlaneGeometry(0.8, 0.15), new THREE.MeshBasicMaterial({ map: labelTexture(artwork.title), transparent: true }), [0, 0, 0.07]);
        const fit = (w: number, h: number) => {
            const k = PAINTING_MAX / Math.max(w, h);
            art.scale.set(w * k, h * k, 1);
            frameMesh.scale.set(w * k + 0.3, h * k + 0.3, 1);
            plaque.position.y = label.position.y = -(h * k + 0.3) / 2 - 0.25;
        };
        fit(1.5, 1.1); // placeholder until the image arrives
        loader.load(artwork.image, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = tex.magFilter = THREE.NearestFilter; // pixelated retro look
            (art.material as THREE.MeshStandardMaterial).map = tex;
            (art.material as THREE.MeshStandardMaterial).needsUpdate = true;
            fit(tex.image.width, tex.image.height);
        });
        const painting = { artwork, frame, spot };
        g.userData.target = painting;
        return painting;
    });

    // floor lamps
    const glowMat = new THREE.MeshBasicMaterial({ color: '#ffd700', side: THREE.BackSide, transparent: true, depthWrite: false, fog: false });
    const lamps = lampPositions.map((p) => {
        const g = group(scene, p);
        mesh(g, new THREE.CylinderGeometry(0.2, 0.25, 0.2, 8), mat('#2a2a2a', { roughness: 0.6, metalness: 0.4 }), [0, 0.1, 0]);
        mesh(g, new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), mat('#c9a86c', { roughness: 0.3, metalness: 0.6 }), [0, 0.9, 0]);
        const shade = mat('#f5e6d3', { roughness: 0.9, side: THREE.DoubleSide, emissive: '#ffeaa7', emissiveIntensity: 0.3 });
        mesh(g, new THREE.ConeGeometry(0.3, 0.4, 8, 1, true), shade, [0, 1.8, 0]);
        const bulb = mat('#fff8e7', { emissive: '#ffeaa7', emissiveIntensity: 1.2, roughness: 0.3 });
        mesh(g, new THREE.SphereGeometry(0.1, 8, 8), bulb, [0, 1.65, 0]);
        // intensity 0 instead of removing the light, avoids a shader recompile on toggle
        const light = pointLight(g, '#fff5e0', 0.9, 6, [0, 1.7, 0]);
        // glow outline: slightly larger back-face shell, shown while aimed at
        const glow = group(g);
        glow.visible = false;
        mesh(glow, new THREE.CylinderGeometry(0.24, 0.29, 0.26, 8), glowMat, [0, 0.1, 0]);
        mesh(glow, new THREE.CylinderGeometry(0.07, 0.07, 1.62, 8), glowMat, [0, 0.9, 0]);
        mesh(glow, new THREE.ConeGeometry(0.35, 0.48, 8), glowMat, [0, 1.8, 0]);
        box(p[0], p[2], 0.25, 0.25, 2.1);
        const lamp = { on: true, shade, bulb, light, glow };
        g.userData.target = lamp;
        return lamp;
    });

    function toggleLamp(lamp: (typeof lamps)[number]) {
        const on = (lamp.on = !lamp.on);
        lamp.shade.color.set(on ? '#f5e6d3' : '#8a7a6a');
        lamp.shade.emissiveIntensity = on ? 0.3 : 0;
        lamp.bulb.color.set(on ? '#fff8e7' : '#3a3a3a');
        lamp.bulb.emissiveIntensity = on ? 1.2 : 0;
        lamp.light.intensity = on ? 0.9 : 0;
    }

    // held item and blocky hand, attached to the camera
    const item = group(camera);
    const holder = group(item);
    const models = new Map<ItemId, THREE.Group>();
    const inventory: ItemId[] = [...STARTER_ITEMS];
    let equipped: ItemId = inventory[0];
    function showItem(id: ItemId) {
        holder.clear();
        if (!models.has(id)) models.set(id, ITEMS[id].build());
        const model = models.get(id)!;
        setFill(model, 1);
        holder.add(model);
        equipped = id;
    }
    showItem(equipped);
    const hand = group(item, [0, -0.08, 0.02]);
    hand.scale.setScalar(0.12);
    const skin = mat('#d4a574', { roughness: 0.8 });
    const finger = mat('#c99a64', { roughness: 0.8 });
    mesh(hand, new THREE.BoxGeometry(0.35, 1.2, 0.35), mat('#2a2a4a', { roughness: 0.9 }), [0.8, -1.2, 0.3], [0.2, 0, -0.6]);
    mesh(hand, new THREE.BoxGeometry(0.32, 0.9, 0.32), mat('#3d3d5c', { roughness: 0.9 }), [0.3, -0.4, 0.15], [0.3, 0, -0.3]);
    mesh(hand, new THREE.BoxGeometry(0.28, 0.25, 0.28), skin, [0.1, -0.05, 0.08], [0.1, 0, -0.1]);
    mesh(hand, new THREE.BoxGeometry(0.6, 0.3, 0.4), skin);
    mesh(hand, new THREE.BoxGeometry(0.15, 0.25, 0.2), skin, [0.35, 0.05, 0]);
    mesh(hand, new THREE.BoxGeometry(0.5, 0.15, 0.35), finger, [0, 0.2, 0]);
    mesh(hand, new THREE.BoxGeometry(0.12, 0.12, 0.3), finger, [-0.15, 0.32, 0]);
    mesh(hand, new THREE.BoxGeometry(0.12, 0.12, 0.3), finger, [0.15, 0.32, 0]);

    // --- controls & UI ----------------------------------------------------

    const canvas = renderer.domElement;
    const modal = $('modal');
    const hint = $('hint');
    const crosshair = $('crosshair');
    const inventoryEl = $('inventory');
    const overlayOpen = () => !modal.hidden || !inventoryEl.hidden;
    let paused = false;
    const keys = new Set<string>();
    const held = (...codes: string[]) => codes.some((c) => keys.has(c));
    type Lamp = (typeof lamps)[number];
    type Painting = (typeof paintings)[number];
    let aimed: Lamp | Painting | typeof exitDoor | undefined;
    const raycaster = new THREE.Raycaster(undefined, undefined, 0, REACH);
    const screenCenter = new THREE.Vector2();
    // walls and pillars block the ray, the held glass doesn't
    const solids = scene.children.filter((o) => o !== camera);

    function openModal(a: Artwork) {
        ($('modal-img') as HTMLImageElement).src = a.image;
        ($('modal-img') as HTMLImageElement).alt = a.title;
        $('modal-title').textContent = a.title;
        $('modal-meta').textContent = `${a.artist}, ${a.year}`;
        $('modal-desc').textContent = a.description;
        $('modal-desc').hidden = !a.description;
        modal.hidden = false;
    }
    const closeModal = () => (modal.hidden = true);

    // drag to look around, FPS-style (drag right = look right), 1:1 with the field of view.
    // A mouse drag holds a pointer lock so the cursor stays put and reappears where it was;
    // touch (no pointer lock) follows the finger instead.
    const radPerPx = () => THREE.MathUtils.degToRad(camera.fov) / canvas.clientHeight;
    const look = new THREE.Euler(0, 0, 0, 'YXZ');
    let drag: { x: number; y: number } | null = null;
    canvas.addEventListener('pointerdown', (e) => {
        drag = { x: e.clientX, y: e.clientY };
        if (e.pointerType === 'mouse') canvas.requestPointerLock()?.catch(() => {}); // refused lock falls back to client deltas
        else canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const locked = document.pointerLockElement === canvas;
        const dx = locked ? e.movementX : e.clientX - drag.x;
        const dy = locked ? e.movementY : e.clientY - drag.y;
        look.setFromQuaternion(camera.quaternion);
        look.y -= dx * radPerPx();
        look.x = THREE.MathUtils.clamp(look.x - dy * radPerPx(), -PI / 2 + 0.01, PI / 2 - 0.01);
        camera.quaternion.setFromEuler(look);
        drag = { x: e.clientX, y: e.clientY };
    });
    for (const type of ['pointerup', 'pointercancel']) {
        canvas.addEventListener(type, () => {
            drag = null;
            if (document.pointerLockElement === canvas) document.exitPointerLock();
        });
    }

    // --- item animations: keyframed poses of the hand+item, relative to the camera
    type Pose = { pos: V3; rot: V3 };
    const REST: Pose = { pos: [0.35, -0.35, -0.5], rot: [0.05, 0, 0.1] };
    const MOUTH: Pose = { pos: [0.08, -0.16, -0.32], rot: [0.7, 0, 0.2] };
    const MOUTH_TILTED: Pose = { pos: [0.08, -0.13, -0.3], rot: [1.5, 0, 0.25] };
    const WINDUP: Pose = { pos: [0.45, -0.12, -0.45], rot: [-0.4, 0, -0.2] };
    const THROWN: Pose = { pos: [0.25, -0.2, -0.75], rot: [0.6, 0, 0.3] };
    const POCKET: Pose = { pos: [0.4, -1.0, -0.4], rot: [0.3, 0, 0.4] };
    const ANIMS = {
        // drink it empty, toss it, pull a fresh one out of the pocket
        drink: { keys: [[0, REST], [0.35, MOUTH], [1.05, MOUTH_TILTED], [1.25, WINDUP], [1.4, THROWN], [1.75, POCKET], [2.25, REST]] as [number, Pose][], drain: [0.35, 1.05], release: 1.33, swap: 1.75 },
        // switch to another item from the inventory
        swap: { keys: [[0, REST], [0.35, POCKET], [0.85, REST]] as [number, Pose][], drain: null, release: null, swap: 0.35 },
    };
    let anim: { kind: keyof typeof ANIMS; t: number; next: ItemId; released: boolean; swapped: boolean } | null = null;
    const smooth = (x: number) => x * x * (3 - 2 * x);
    function animPose(keyframes: [number, Pose][], t: number): Pose {
        let i = 1;
        while (i < keyframes.length - 1 && t > keyframes[i][0]) i++;
        const [t0, a] = keyframes[i - 1];
        const [t1, b] = keyframes[i];
        const k = smooth(THREE.MathUtils.clamp((t - t0) / (t1 - t0), 0, 1));
        const mix = (u: V3, v: V3) => u.map((n, j) => n + (v[j] - n) * k) as V3;
        return { pos: mix(a.pos, b.pos), rot: mix(a.rot, b.rot) };
    }

    // tossed items fly with gravity and stay where they land
    const thrownItems: { obj: THREE.Object3D; v: THREE.Vector3; spin: THREE.Vector3; lyingY: number; resting: boolean }[] = [];
    function toss() {
        const obj = ITEMS[equipped].build();
        setFill(obj, 0);
        holder.children[0].getWorldPosition(obj.position);
        holder.children[0].getWorldQuaternion(obj.quaternion);
        scene.add(obj);
        const dir = camera.getWorldDirection(new THREE.Vector3());
        const v = dir.multiplyScalar(4.5).add(new THREE.Vector3(0, 2.5, 0)).addScaledVector(right, 0.6);
        const spin = new THREE.Vector3(Math.random() * 10 - 5, Math.random() * 6 - 3, Math.random() * 10 - 5);
        thrownItems.push({ obj, v, spin, lyingY: ITEMS[equipped].lyingY, resting: false });
        // ponytail: oldest tossed items vanish past 12, raise the cap if a messier floor is wanted
        if (thrownItems.length > 12) {
            const old = thrownItems.shift()!.obj;
            scene.remove(old);
            old.traverse((o) => {
                if (o instanceof THREE.Mesh) {
                    o.geometry.dispose();
                    (o.material as THREE.Material).dispose();
                }
            });
        }
    }

    // --- inventory menu (Tab)
    function renderInventory() {
        const list = $('inventory-list');
        list.replaceChildren(
            ...inventory.map((id, i) => {
                const li = document.createElement('li');
                const btn = document.createElement('button');
                btn.className = 'flex w-full items-center gap-3 rounded border px-3 py-2 text-left hover:border-(--primary) ' + (id === equipped ? 'border-(--primary) bg-(--primary)/15' : 'border-(--border)');
                btn.textContent = `[${i + 1}] ${ITEMS[id].icon} ${ITEMS[id].name}${id === equipped ? '  ·  in der Hand' : ''}`;
                btn.addEventListener('click', () => equip(id));
                li.append(btn);
                return li;
            }),
        );
    }
    function toggleInventory(open = inventoryEl.hidden) {
        if (open) renderInventory();
        inventoryEl.hidden = !open;
    }
    function equip(id: ItemId) {
        toggleInventory(false);
        if (anim || id === equipped) return;
        anim = { kind: 'swap', t: 0, next: id, released: false, swapped: false };
    }

    // --- pause back to the start screen (Escape)
    function pause() {
        paused = true;
        keys.clear();
        renderer.setAnimationLoop(null);
        $('start-btn').textContent = 'WEITER';
        $('start').hidden = false;
    }
    function resume() {
        paused = false;
        last = performance.now();
        renderer.setAnimationLoop(loop);
    }

    for (const el of document.querySelectorAll('[data-close]')) el.addEventListener('click', closeModal);
    addEventListener('keydown', (e) => {
        if (paused) return;
        if (['Space', 'Tab'].includes(e.code)) e.preventDefault(); // no page scroll / focus jump
        keys.add(e.code);
        if (e.repeat) return;
        if (e.code === 'Escape') {
            if (!modal.hidden) closeModal();
            else if (!inventoryEl.hidden) toggleInventory(false);
            else pause();
        } else if (e.code === 'Tab' && modal.hidden) {
            toggleInventory();
        } else if (!inventoryEl.hidden && /^Digit[1-9]$/.test(e.code)) {
            const id = inventory[Number(e.code.slice(5)) - 1];
            if (id) equip(id);
        } else if (overlayOpen()) {
            return;
        } else if (e.code === 'Space' && onGround) {
            vy = JUMP_V;
            onGround = false;
        } else if (e.code === 'KeyE') {
            if (!aimed) {
                if (!anim) anim = { kind: 'drink', t: 0, next: equipped, released: false, swapped: false };
            } else if ('glow' in aimed) toggleLamp(aimed);
            else if ('artwork' in aimed) openModal(aimed.artwork);
            else location.href = '/';
        }
    });
    addEventListener('keyup', (e) => keys.delete(e.code));
    addEventListener('blur', () => keys.clear());
    addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const step = new THREE.Vector3();
    let last = 0;
    let time = 0;
    let feet = 0; // height of the player's feet
    let vy = 0;
    let onGround = true;
    let landDip = 0; // camera dip after landing
    let stride = 0; // walk cycle phase for head and item bob
    let sprintBlend = 0; // 0 walking .. 1 sprinting, eased
    const loading = $('loading');
    await loaded;
    loadingStatus('Bereite Shader vor', 75);
    await nextFrame();
    await renderer.compileAsync(scene, camera); // compile shaders up front, no stutter on the first frames
    loadingStatus('Rendere Szene', 95);
    function loop(t: number) {
        const dt = Math.min((t - last) / 1000, 0.1);
        last = t;
        time += dt;

        let walking = false;
        let sprinting = false;
        camera.getWorldDirection(forward).setY(0).normalize();
        right.crossVectors(forward, camera.up);
        if (!overlayOpen()) {
            const f = Number(held('KeyW', 'ArrowUp')) - Number(held('KeyS', 'ArrowDown'));
            const r = Number(held('KeyD', 'ArrowRight')) - Number(held('KeyA', 'ArrowLeft'));
            walking = f !== 0 || r !== 0;
            sprinting = walking && held('ShiftLeft', 'ShiftRight');
            const speed = MOVE_SPEED * (sprinting ? SPRINT : 1) * dt;
            step.set(0, 0, 0).addScaledVector(forward, f * speed).addScaledVector(right, r * speed);
            // per axis, so you slide along walls and furniture instead of sticking
            const { x, z } = camera.position;
            if (free(x + step.x, z, feet)) camera.position.x += step.x;
            if (free(camera.position.x, z + step.z, feet)) camera.position.z += step.z;
        }

        // gravity, jumping and standing on furniture
        vy -= GRAVITY * dt;
        feet += vy * dt;
        const ground = groundAt(camera.position.x, camera.position.z, PLAYER_R / 2);
        if (feet <= ground) {
            if (!onGround && vy < -3) landDip = Math.min(0.12, -vy * 0.015);
            feet = ground;
            vy = 0;
            onGround = true;
        } else onGround = false;

        // sprint feel: faster stride, wider FOV, item lowered
        sprintBlend += ((sprinting ? 1 : 0) - sprintBlend) * Math.min(1, dt * 8);
        const fov = 60 + sprintBlend * 8;
        if (Math.abs(camera.fov - fov) > 0.01) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
        }
        if (walking && onGround) stride += dt * (9 + sprintBlend * 5);
        const bobAmp = walking && onGround ? 0.025 + sprintBlend * 0.025 : 0;
        landDip *= Math.exp(-dt * 10);
        camera.position.y = feet + EYE + Math.sin(stride * 2) * bobAmp - landDip;

        // tossed items
        for (const th of thrownItems) {
            if (th.resting) continue;
            th.v.y -= GRAVITY * dt;
            const { x, z } = th.obj.position;
            th.obj.position.addScaledVector(th.v, dt);
            if (!onFloor(th.obj.position.x, th.obj.position.z, 0.75)) {
                th.obj.position.x = x; // hit a wall: drop straight down
                th.obj.position.z = z;
                th.v.x = th.v.z = 0;
            }
            th.obj.rotation.x += th.spin.x * dt;
            th.obj.rotation.y += th.spin.y * dt;
            th.obj.rotation.z += th.spin.z * dt;
            const floorY = groundAt(th.obj.position.x, th.obj.position.z, 0) + th.lyingY;
            if (th.obj.position.y <= floorY) {
                th.obj.position.y = floorY;
                th.obj.rotation.set(0, 0, 0);
                th.obj.rotateY(Math.random() * PI * 2);
                th.obj.rotateX(PI / 2); // on its side
                th.resting = true;
            }
        }

        // whatever the crosshair points at first, if it's interactive
        raycaster.setFromCamera(screenCenter, camera);
        let o: THREE.Object3D | null = raycaster.intersectObjects(solids)[0]?.object ?? null;
        while (o && !o.userData.target) o = o.parent;
        aimed = overlayOpen() ? undefined : o?.userData.target;

        for (const p of paintings) {
            const on = p === aimed;
            p.frame.emissiveIntensity += ((on ? 0.3 : 0) - p.frame.emissiveIntensity) * 0.1;
            p.spot.intensity = on ? 1.5 : 0.8;
        }
        for (const l of lamps) l.glow.visible = l === aimed;
        exitDoor.leafMat.emissiveIntensity += ((aimed === exitDoor ? 0.25 : 0) - exitDoor.leafMat.emissiveIntensity) * 0.1;
        glowMat.opacity = 0.35 + Math.sin(time * 4) * 0.15;

        const text = !aimed ? '' : 'glow' in aimed ? `Lampe ${aimed.on ? 'ausschalten' : 'einschalten'}` : 'artwork' in aimed ? 'Ansehen' : 'Galerie verlassen';
        if (hint.dataset.text !== text) {
            hint.dataset.text = $('hint-text').textContent = text;
            hint.hidden = !text;
            crosshair.classList.toggle('aimed', !!text);
        }

        // held item: keyframed animation, else rest pose with walk bob / idle sway
        if (anim) {
            const a = ANIMS[anim.kind];
            anim.t += dt;
            const pose = animPose(a.keys, anim.t);
            item.position.set(...pose.pos);
            item.rotation.set(...pose.rot);
            if (a.drain && !anim.released) setFill(holder.children[0], 1 - THREE.MathUtils.clamp((anim.t - a.drain[0]) / (a.drain[1] - a.drain[0]), 0, 1));
            if (a.release !== null && !anim.released && anim.t >= a.release) {
                anim.released = true;
                toss();
                holder.visible = false;
            }
            if (!anim.swapped && anim.t >= a.swap) {
                anim.swapped = true;
                showItem(anim.next);
                holder.visible = true;
            }
            if (anim.t >= a.keys[a.keys.length - 1][0]) anim = null;
        } else {
            const moving = walking && onGround;
            const bob = moving ? Math.sin(stride * 2) * (0.02 + sprintBlend * 0.02) : Math.sin(time * 1.5) * 0.005;
            const sway = moving ? Math.sin(stride) * (0.015 + sprintBlend * 0.02) : Math.sin(time) * 0.003;
            item.position.set(0.35 + sway + sprintBlend * 0.05, -0.35 + bob - sprintBlend * 0.08, -0.5 + sprintBlend * 0.05);
            item.rotation.set(0.05 - sprintBlend * 0.3, sprintBlend * 0.2, 0.1 + (moving ? Math.sin(stride) * 0.05 : 0) + sprintBlend * 0.35);
        }

        renderer.render(scene, camera);
        if (!loading.hidden) loading.hidden = true; // after the first frame is drawn
    }
    renderer.setAnimationLoop(loop);
    return { resume };
}

let game: { resume: () => void } | undefined;
$('start-btn').addEventListener('click', async () => {
    $('start').hidden = true;
    if (game) return game.resume();
    $('loading').hidden = false;
    game = await start();
});
