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

// bottle radius in photo px, bottom to lip, evenly spaced over 536 px of height
const FAUST_PROFILE = [40, 79, 86, 88, 89, 86, 86, 86, 86, 86, 86, 86, 86, 86, 86, 86, 86, 86, 86, 86, 86, 87, 87, 87, 89, 90, 88, 84, 79, 72, 64, 56, 49, 43, 38, 36, 36, 40, 38, 40];
let faustTex: THREE.Texture | undefined;
const faustTexture = () => {
    faustTex ??= new THREE.TextureLoader().load('/img/items/faust-pils.jpg');
    faustTex.colorSpace = THREE.SRGBColorSpace;
    faustTex.wrapS = THREE.RepeatWrapping;
    faustTex.repeat.x = 2; // the photo only shows the front, so it wraps around twice
    return faustTex;
};

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
        lyingY: 0.047,
        shard: '#8a4a10',
        build() {
            // 0,33 l Euroflasche: profile and texture traced off the product photo
            const g = group();
            g.scale.setScalar(0.15);
            const pts = FAUST_PROFILE.map((r, i) => new THREE.Vector2(r * 0.00345, -0.6 + (i * 536 * 0.00345) / (FAUST_PROFILE.length - 1)));
            mesh(g, new THREE.LatheGeometry(pts, 48, -Math.PI / 2), mat('#ffffff', { map: faustTexture(), roughness: 0.2, side: THREE.DoubleSide })); // inside shows through the open neck
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
