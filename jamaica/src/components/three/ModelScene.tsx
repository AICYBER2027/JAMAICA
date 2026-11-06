"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type Props = {
  url: string;
  /** Name of a KHR_materials_variants variant to show, if the model has them. */
  variant?: string | null;
  /** Hero mode: no zoom, slow turn until touched, bigger object. */
  hero?: boolean;
  autoRotate?: boolean;
  tilt?: number;
  onReady?: () => void;
  onInteract?: () => void;
  zoomSignal?: number;
  resetSignal?: number;
};

type Loaded = { scene: THREE.Group; parser: { json: unknown; getDependency: (type: string, index: number) => Promise<THREE.Material> } };

function useVariant(gltf: Loaded, target: THREE.Object3D, variant?: string | null) {
  useEffect(() => {
    const json = (gltf.parser as { json: { extensions?: { KHR_materials_variants?: { variants: { name: string }[] } } } }).json;
    const names = json.extensions?.KHR_materials_variants?.variants.map((v) => v.name) ?? [];
    if (!names.length) return;
    const index = variant ? names.indexOf(variant) : 0;
    if (index < 0) return;
    let cancelled = false;
    target.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const ext = mesh.userData?.gltfExtensions?.KHR_materials_variants as { mappings: { material: number; variants: number[] }[] } | undefined;
      if (!mesh.isMesh || !ext) return;
      if (!mesh.userData.originalMaterial) mesh.userData.originalMaterial = mesh.material;
      const hit = ext.mappings.find((m) => m.variants.includes(index));
      if (!hit) {
        mesh.material = mesh.userData.originalMaterial;
        return;
      }
      gltf.parser.getDependency("material", hit.material).then((m) => {
        if (!cancelled) mesh.material = m;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [gltf, target, variant]);
}

function Model({ url, variant, hero, tilt = 0, onReady }: Props) {
  const gltf = useGLTF(url, false, true) as unknown as Loaded;
  const { object, size } = useMemo(() => {
    // Clone: the loaded scene is cached and shared, so each viewer gets its own node tree
    // (geometry and materials stay shared).
    const root = gltf.scene.clone(true);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(root);
    const s = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const scale = 1 / Math.max(s.x, s.y, s.z);
    const group = new THREE.Group();
    const inner = new THREE.Group();
    inner.add(root);
    root.position.set(-c.x, -c.y, -c.z);
    inner.scale.setScalar(scale);
    group.add(inner);
    return { object: group, size: s.multiplyScalar(scale) };
  }, [gltf]);
  useVariant(gltf, object, variant);

  useEffect(() => {
    onReady?.();
  }, [object, onReady]);

  return (
    <group rotation={[0, 0, tilt]}>
      <primitive object={object} />
      <ContactShadows position={[0, -size.y / 2 - 0.002, 0]} opacity={hero ? 0.55 : 0.4} scale={2.4} blur={2.6} far={1} resolution={512} color="#000000" />
    </group>
  );
}

function CameraRig({ hero, zoomSignal = 0, resetSignal = 0 }: { hero?: boolean; zoomSignal?: number; resetSignal?: number }) {
  const { camera, size } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  useEffect(() => {
    // Keep the whole object in frame on narrow screens: back the camera off as the view narrows.
    const base = hero ? 1.55 : 2.1;
    const dist = base / Math.min(1, aspect / (hero ? (aspect < 1 ? 1.05 : 1.45) : 1.15));
    camera.position.set(0, hero ? 0.1 : 0.28, dist);
    camera.lookAt(0, 0, 0);
  }, [camera, resetSignal, aspect, hero]);
  useEffect(() => {
    if (!zoomSignal) return;
    const dir = camera.position.clone().normalize();
    const dist = camera.position.length();
    const next = THREE.MathUtils.clamp(dist * (zoomSignal > 0 ? 0.8 : 1.25), 0.45, 6);
    camera.position.copy(dir.multiplyScalar(next));
  }, [camera, zoomSignal]);
  return null;
}

function Idle({ controls, enabled }: { controls: React.RefObject<OrbitControlsImpl | null>; enabled: boolean }) {
  useFrame(() => {
    if (controls.current) controls.current.autoRotate = enabled;
  });
  return null;
}

export default function ModelScene(props: Props) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [touched, setTouched] = useState(false);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const spinning = (props.autoRotate ?? true) && !touched && !reduced;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      camera={{ fov: props.hero ? 30 : 32, near: 0.01, far: 20, position: [0, 0.2, 1.6] }}
      style={{ touchAction: props.hero ? "pan-y" : "none" }}
      frameloop="always"
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 4, 3]} intensity={1.6} castShadow />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 3, 2]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-3, 1, -1]} rotation-y={Math.PI / 2} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[3, 1, -1]} rotation-y={-Math.PI / 2} scale={[3, 2, 1]} />
        <Lightformer form="ring" color="#c3a35e" intensity={0.6} position={[0, 0.5, -3]} scale={2} />
      </Environment>
      <Suspense fallback={null}>
        <Model {...props} />
      </Suspense>
      <CameraRig hero={props.hero} zoomSignal={props.zoomSignal} resetSignal={props.resetSignal} />
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableZoom={!props.hero}
        minDistance={0.45}
        maxDistance={6}
        minPolarAngle={props.hero ? Math.PI / 2.6 : 0.15}
        maxPolarAngle={props.hero ? Math.PI / 1.9 : Math.PI - 0.15}
        autoRotateSpeed={0.9}
        enableDamping
        dampingFactor={0.08}
        onStart={() => {
          setTouched(true);
          props.onInteract?.();
        }}
      />
      <Idle controls={controls} enabled={spinning} />
    </Canvas>
  );
}
