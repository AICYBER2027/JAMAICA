// Renders studio shots and a 360° turntable sequence from a real GLB model, in headless Chromium.
// Usage: node scripts/render-model.mjs <model.glb> <out-prefix> [--frames 36] [--variant name] [--yaw 0.6]
//   writes public/catalog/<out-prefix>-1.jpg, -2.jpg, -3.jpg (front-ish, side, three-quarter)
//   and, with --frames N, public/catalog/360/<out-prefix>/NN.webp
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const [model, prefix, ...rest] = process.argv.slice(2);
if (!model || !prefix) {
  console.error("usage: node scripts/render-model.mjs <model.glb> <out-prefix> [--frames 36] [--variant name] [--yaw 0.6]");
  process.exit(1);
}
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : fallback;
};
const frames = Number(opt("frames", 0));
const variant = opt("variant", "");
const yaw = Number(opt("yaw", "0.6"));
const pitch = Number(opt("pitch", "0.18"));

const root = resolve(".");
const types = { ".js": "text/javascript", ".glb": "model/gltf-binary", ".html": "text/html", ".wasm": "application/wasm" };
const html = `<!doctype html><html><body style="margin:0;background:#eceeec">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
const W = 1200, H = 1500;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color("#eceeec");
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const key = new THREE.DirectionalLight("#ffffff", 1.6); key.position.set(2, 4, 3); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); scene.add(key);
const camera = new THREE.PerspectiveCamera(28, W / H, 0.001, 100);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.loadAsync("/model.glb");
const wanted = ${JSON.stringify(variant)};
if (wanted) {
  const names = (gltf.parser.json.extensions?.KHR_materials_variants?.variants ?? []).map((v) => v.name);
  const index = names.indexOf(wanted);
  if (index < 0) throw new Error("unknown variant " + wanted + "; model has: " + names.join(", "));
  const jobs = [];
  gltf.scene.traverse((o) => {
    const mappings = o.userData?.gltfExtensions?.KHR_materials_variants?.mappings;
    const hit = mappings?.find((m) => m.variants.includes(index));
    if (o.isMesh && hit) jobs.push(gltf.parser.getDependency("material", hit.material).then((m) => { o.material = m; }));
  });
  await Promise.all(jobs);
}
const obj = gltf.scene;
obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
const box = new THREE.Box3().setFromObject(obj);
const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
const pivot = new THREE.Group(); obj.position.sub(center); pivot.add(obj); scene.add(pivot);
const radius = size.length() / 2;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(radius * 20, radius * 20), new THREE.ShadowMaterial({ opacity: 0.18 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -size.y / 2; ground.receiveShadow = true; scene.add(ground);
key.shadow.camera.left = key.shadow.camera.bottom = -radius * 2; key.shadow.camera.right = key.shadow.camera.top = radius * 2;
key.target = pivot;
function shoot(angle, w = W, h = H, elev = ${pitch}) {
  renderer.setSize(w, h); camera.aspect = w / h;
  const half = Math.min((camera.fov * Math.PI) / 360, Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect));
  const fit = (radius / Math.sin(half)) * 0.88;
  camera.position.set(Math.sin(angle) * fit * Math.cos(elev), Math.sin(elev) * fit, Math.cos(angle) * fit * Math.cos(elev));
  camera.near = fit / 100; camera.far = fit * 10; camera.updateProjectionMatrix(); camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}
window.shootJpeg = (a) => { shoot(a); return renderer.domElement.toDataURL("image/jpeg", 0.9); };
window.shootFrame = (a) => { shoot(a, 900, 900); return renderer.domElement.toDataURL("image/webp", 0.86); };
window.ready = true;
</script></body></html>`;

const server = createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (url === "/") return res.writeHead(200, { "content-type": "text/html" }).end(html);
  const file = url === "/model.glb" ? resolve(model) : join(root, url);
  if (!file.startsWith(root) && url !== "/model.glb") return res.writeHead(403).end();
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
page.on("console", (m) => m.type() === "error" && console.error("page:", m.text()));
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });

const save = (path, dataUrl) => writeFileSync(path, Buffer.from(dataUrl.split(",")[1], "base64"));
mkdirSync("public/catalog", { recursive: true });
const shots = [yaw, yaw + Math.PI / 2, yaw + Math.PI];
for (let i = 0; i < shots.length; i++) {
  save(`public/catalog/${prefix}-${i + 1}.jpg`, await page.evaluate((a) => window.shootJpeg(a), shots[i]));
}
if (frames > 0) {
  const dir = `public/catalog/360/${prefix}`;
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < frames; i++) {
    const a = (i / frames) * Math.PI * 2;
    save(`${dir}/${String(i).padStart(2, "0")}.webp`, await page.evaluate((x) => window.shootFrame(x), a));
  }
}
console.log(`rendered ${prefix}${frames ? ` + ${frames} frames` : ""}`);
await browser.close();
server.close();
