// Holdable items. Adding a new one = a new entry here; collecting it later = pushing its id into the inventory.
import * as THREE from 'three';
import { group, mat, mesh } from './build';

export type ItemId = 'wine' | 'beer';

export interface ItemDef {
    name: string;
    icon: string;
    lyingY: number; // height of the model's origin above the floor when it lies on its side
    shard: string; // glass color of the shards when it breaks
    build: () => THREE.Group; // origin = where the hand grips it, scaled for first-person view
}

export const STARTER_ITEMS: ItemId[] = ['wine', 'beer'];

export const ITEMS: Record<ItemId, ItemDef> = {
    wine: {
        name: 'Weinglas',
        icon: '🍷',
        lyingY: 0.07,
        shard: '#dfeff5',
        build() {
            const g = group();
            g.scale.setScalar(0.15);
            const clearGlass = mat('#ffffff', { transparent: true, opacity: 0.4, roughness: 0.1 });
            mesh(g, new THREE.CylinderGeometry(0.5, 0.3, 0.8, 16, 1, true), mat('#ffffff', { transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.1, side: THREE.DoubleSide }), [0, 0.8, 0]);
            const wine = mesh(g, new THREE.CylinderGeometry(0.42, 0.28, 0.5, 16), mat('#6b0f1a', { roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.9 }), [0, 0.6, 0]);
            g.userData.liquid = { mesh: wine, base: 0.35, height: 0.5 };
            mesh(g, new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), clearGlass);
            mesh(g, new THREE.CylinderGeometry(0.35, 0.4, 0.1, 16), clearGlass, [0, -0.45, 0]);
            mesh(g, new THREE.PlaneGeometry(0.08, 0.4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3 }), [0.15, 0.8, 0.2], [0, 0, 0.3]);
            return g;
        },
    },
    beer: {
        name: 'Faust Pils',
        icon: '🍺',
        lyingY: 0.048,
        shard: '#8a4a10',
        build() {
            // 0,33 l Euroflasche, profile traced off a product photo in px (radius, height above the base)
            const g = group();
            g.scale.setScalar(0.15);
            const K = 0.00345;
            const lathe = (pts: [number, number][], grow = 0) =>
                new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2((r + grow) * K, -0.6 + y * K)), 32);
            const shoulder: [number, number][] = [[90, 383], [88, 392], [80, 410], [65, 430], [55, 445]];
            const amber = mat('#8a4a10', { roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.9 });
            mesh(g, lathe([[0, 0], [85, 0], [90, 8], [90, 380], ...shoulder, [52, 450], [43, 470], [39, 485], [39, 505], [44, 510], [44, 522], [40, 527]]), amber);
            mesh(g, new THREE.CylinderGeometry(41 * K, 42 * K, 14 * K, 20), mat('#111111', { roughness: 0.4, metalness: 0.6 }), [0, -0.6 + 533 * K, 0]);

            const label = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
                const c = document.createElement('canvas');
                c.width = w;
                c.height = h;
                const ctx = c.getContext('2d')!;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                draw(ctx);
                const t = new THREE.CanvasTexture(c);
                t.colorSpace = THREE.SRGBColorSpace;
                return mat('#ffffff', { map: t, roughness: 0.6 });
            };
            const BLUE = '#2a56a8';
            // front motif sits at u = 0 (+z, towards the camera) and u = 0.5, so it reads from either side
            const fronts = (w: number) => [0, w / 2, w];

            const shoulderLabel = label(1024, 128, (ctx) => {
                ctx.fillStyle = BLUE;
                ctx.fillRect(0, 0, 1024, 128);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 56px sans-serif';
                for (const x of fronts(1024)) ctx.fillText('PILS', x, 72);
            });
            mesh(g, lathe(shoulder, 1.5), shoulderLabel);

            const bodyLabel = label(1150, 490, (ctx) => {
                ctx.fillStyle = '#141414';
                ctx.fillRect(0, 0, 1150, 490);
                for (const cx of fronts(1150)) {
                    const cy = 200;
                    const oval = (rx: number, ry: number, fill: string, dy = 0) => {
                        ctx.fillStyle = fill;
                        ctx.beginPath();
                        ctx.ellipse(cx, cy + dy, rx, ry, 0, 0, Math.PI * 2);
                        ctx.fill();
                    };
                    oval(190, 180, BLUE);
                    oval(176, 166, '#ffffff');
                    oval(170, 160, BLUE);
                    oval(128, 112, '#e9eef5', 25);
                    // brewery name along the top arc
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 26px serif';
                    const text = 'BRAUHAUS FAUST · ZU MILTENBERG';
                    [...text].forEach((ch, i) => {
                        const a = -Math.PI / 2 + (i - (text.length - 1) / 2) * 0.085;
                        ctx.save();
                        ctx.translate(cx + Math.cos(a) * 148, cy + Math.sin(a) * 140);
                        ctx.rotate(a + Math.PI / 2);
                        ctx.fillText(ch, 0, 0);
                        ctx.restore();
                    });
                    // crest
                    ctx.fillStyle = '#d9a520';
                    ctx.beginPath();
                    ctx.moveTo(cx - 32, cy - 55);
                    ctx.lineTo(cx + 32, cy - 55);
                    ctx.lineTo(cx + 32, cy - 15);
                    ctx.quadraticCurveTo(cx + 32, cy + 15, cx, cy + 25);
                    ctx.quadraticCurveTo(cx - 32, cy + 15, cx - 32, cy - 15);
                    ctx.fill();
                    ctx.fillStyle = BLUE;
                    ctx.fillRect(cx - 10, cy - 45, 20, 55);
                    // ribbon with the name, wider than the oval
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(cx - 236, cy + 36, 472, 92);
                    ctx.fillStyle = BLUE;
                    ctx.fillRect(cx - 230, cy + 42, 460, 80);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 78px serif';
                    ctx.fillText('FAUST', cx, cy + 84);
                    ctx.fillStyle = BLUE;
                    ctx.font = 'bold 44px serif';
                    ctx.fillText('1654', cx, cy + 152);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 60px sans-serif';
                    ctx.fillText('PILS', cx, 450);
                }
            });
            mesh(g, new THREE.CylinderGeometry(91.5 * K, 91.5 * K, 245 * K, 32, 1, true), bodyLabel, [0, -0.6 + 167.5 * K, 0]);
            return g;
        },
    },
};

// drain or refill an item's liquid, if it shows any (level 0..1)
export function setFill(model: THREE.Object3D, level: number) {
    const liquid = model.userData.liquid as { mesh: THREE.Mesh; base: number; height: number } | undefined;
    if (!liquid) return;
    liquid.mesh.visible = level > 0.02;
    liquid.mesh.scale.y = Math.max(level, 0.001);
    liquid.mesh.position.y = liquid.base + (liquid.height * level) / 2;
}
