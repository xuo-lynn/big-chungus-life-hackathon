"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Props = {
  src?: string;
  className?: string;
  height?: number;
};

export default function GLBViewer({ src = "/model.glb", className, height = 360 }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = null; // transparent background to blend into page

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // ensure clear with alpha

    const width = mount.clientWidth || 600;
    const heightPx = height;
    renderer.setSize(width, heightPx);
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 1000);
    camera.position.set(0.7, 0.05, 1.1); // zoom in slightly

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.minDistance = 0.4;
    controls.maxDistance = 10;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(2, 3, 5);
    scene.add(dir);

    const loader = new GLTFLoader();
    let object: THREE.Object3D | null = null;

    loader.load(
      src,
      (gltf: GLTF) => {
        object = gltf.scene;
        // Center and scale model to fit nicely
        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        object.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 1.2 / maxDim;
          object.scale.setScalar(scale);
        }
        // Aim orbit slightly below center to push model up
        controls.target.set(0, -0.35, 0);
        controls.update();

        scene.add(object);
      },
      undefined,
      (err: unknown) => {
        console.error("GLB load error", err);
      }
    );

    const onResize = () => {
      const w = mount.clientWidth || width;
      const h = heightPx;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (object) {
        object.traverse((child: THREE.Object3D) => {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose?.();
        });
      }
      scene.clear();
      while (mount.firstChild) mount.removeChild(mount.firstChild);
    };
  }, [src, height]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: "100%", height }}
      aria-label="3D Model Viewer"
    />
  );
}