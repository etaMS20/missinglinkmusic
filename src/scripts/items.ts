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
        name: 'Bierflasche',
        icon: '🍺',
        lyingY: 0.045,
        shard: '#5a3410',
        build() {
            const g = group();
            g.scale.setScalar(0.15);
            const brownGlass = mat('#4a2a0a', { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 });
            mesh(g, new THREE.CylinderGeometry(0.28, 0.28, 1.0, 16), brownGlass, [0, -0.1, 0]);
            mesh(g, new THREE.CylinderGeometry(0.1, 0.28, 0.3, 16), brownGlass, [0, 0.55, 0]);
            mesh(g, new THREE.CylinderGeometry(0.09, 0.1, 0.5, 16), brownGlass, [0, 0.95, 0]);
            mesh(g, new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16), brownGlass, [0, 1.22, 0]);
            mesh(g, new THREE.CylinderGeometry(0.285, 0.285, 0.45, 16, 1, true), mat('#e8d9a8', { roughness: 0.8 }), [0, -0.05, 0]);
            mesh(g, new THREE.CylinderGeometry(0.101, 0.101, 0.15, 16, 1, true), mat('#c9a86c', { roughness: 0.4, metalness: 0.5 }), [0, 1.0, 0]);
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
