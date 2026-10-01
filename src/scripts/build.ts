// Small three.js builders shared by the gallery scene and the item models.
import * as THREE from 'three';

export type V3 = [number, number, number];

export const mat = (color: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, ...o });

export function group(parent?: THREE.Object3D, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0]) {
    const g = new THREE.Group();
    g.position.set(...pos);
    g.rotation.set(...rot);
    parent?.add(g);
    return g;
}

export function mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], shadow?: 'cast' | 'receive') {
    const m = new THREE.Mesh(geo, material);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.castShadow = shadow === 'cast';
    m.receiveShadow = shadow === 'receive';
    parent.add(m);
    return m;
}

export function pointLight(parent: THREE.Object3D, color: string, intensity: number, distance: number, pos: V3, castShadow = false) {
    const l = new THREE.PointLight(color, intensity, distance);
    l.position.set(...pos);
    l.castShadow = castShadow;
    parent.add(l);
    return l;
}

// plaque text drawn to a canvas instead of shipping a font engine
export function labelTexture(text: string, color = '#ffd700') {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.font = '40px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 48, 496);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}
