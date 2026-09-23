import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export default function Scene({ paused = false }) {
  const host = useRef(null),
    pause = useRef(paused);
  const [failed, setFailed] = useState(false);
  pause.current = paused;
  useEffect(() => {
    const el = host.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x111715, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D conceptual FPGA chip and spike pathways",
    );
    renderer.domElement.setAttribute("role", "img");
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(9, 10, 12);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.autoRotate = false;
    scene.add(new THREE.AmbientLight(0xcde0d9, 2));
    const light = new THREE.DirectionalLight(0xffffff, 5);
    light.position.set(2, 8, 4);
    scene.add(light);
    const rim = new THREE.PointLight(0xbdfa68, 60);
    rim.position.set(-4, 3, -2);
    scene.add(rim);
    const group = new THREE.Group();
    scene.add(group);
    group.rotation.y = -0.3;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x243a31,
      metalness: 0.8,
      roughness: 0.4,
    });
    function box(w, h, d, x, y, z, material) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    }
    box(
      7.6,
      0.15,
      7.6,
      0,
      -0.5,
      0,
      new THREE.MeshStandardMaterial({
        color: 0x18271f,
        metalness: 0.6,
        roughness: 0.55,
      }),
    );
    const metal = new THREE.MeshStandardMaterial({
      color: 0x8eaaa0,
      metalness: 0.9,
      roughness: 0.24,
    });
    for (let i = 0; i < 22; i++) {
      const pos = (i - 10.5) * 0.23;
      for (const s of [-1, 1]) {
        box(0.105, 0.12, 0.7, pos, -0.22, s * 2.83, metal);
        box(0.7, 0.12, 0.105, s * 2.83, -0.22, pos, metal);
      }
    }
    box(5.2, 0.45, 5.2, 0, -0.06, 0, mat);
    box(
      4.7,
      0.09,
      4.7,
      0,
      0.22,
      0,
      new THREE.MeshStandardMaterial({
        color: 0x101b16,
        metalness: 0.7,
        roughness: 0.28,
      }),
    );
    const paths = [];
    const points = [];
    for (let i = 0; i < 26; i++) {
      const side = i % 4,
        a = (Math.floor(i / 4) - 3) * 0.48;
      let coordinates;
      if (side < 2) {
        const s = side === 0 ? 1 : -1;
        coordinates = [
          new THREE.Vector3(a, 0.3, s * 2),
          new THREE.Vector3(a, 0.3, s * 1.45),
          new THREE.Vector3(a * 0.6, 0.3, s * 0.85),
        ];
      } else {
        const s = side === 2 ? 1 : -1;
        coordinates = [
          new THREE.Vector3(s * 2, 0.3, a),
          new THREE.Vector3(s * 1.45, 0.3, a),
          new THREE.Vector3(s * 0.85, 0.3, a * 0.6),
        ];
      }
      const curve = new THREE.CatmullRomCurve3(coordinates);
      paths.push(curve);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)),
        new THREE.LineBasicMaterial({
          color: 0x64885a,
          transparent: true,
          opacity: 0.6,
        }),
      );
      group.add(line);
      const point = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 8, 8),
        new THREE.MeshBasicMaterial({
          color: i % 3 === 0 ? 0xe8d6a5 : 0xc6f36b,
        }),
      );
      points.push(point);
      group.add(point);
    }
    const core = box(
      1.4,
      0.13,
      1.4,
      0,
      0.32,
      0,
      new THREE.MeshStandardMaterial({
        color: 0xa2d85c,
        emissive: 0x3c6416,
        emissiveIntensity: 0.45,
        metalness: 0.8,
        roughness: 0.3,
      }),
    );
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 512;
    labelCanvas.height = 512;
    const ctx = labelCanvas.getContext("2d");
    ctx.fillStyle = "#bfe981";
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "#263526";
    ctx.textAlign = "center";
    ctx.font = "bold 105px monospace";
    ctx.fillText("N / N", 256, 280);
    ctx.font = "25px monospace";
    ctx.fillText("SPIKING CORE", 256, 350);
    const texture = new THREE.CanvasTexture(labelCanvas);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.32, 1.32),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    label.rotation.x = -Math.PI / 2;
    label.position.y = 0.39;
    group.add(label);
    for (let x = -3; x <= 3; x += 0.5)
      for (let z = -3; z <= 3; z += 0.5) {
        if (Math.abs(x) > 2.7 || Math.abs(z) > 2.7)
          box(0.06, 0.02, 0.06, x, -0.41, z, metal);
      }
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.position.set(
        w < 600 ? 11 : 9,
        w < 600 ? 13 : 10,
        w < 600 ? 17 : 12,
      );
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let frame,
      time = 0,
      last = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function animate(now) {
      frame = requestAnimationFrame(animate);
      const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
      last = now;
      if (!pause.current && !reduced) {
        time += dt;
        group.position.y = Math.sin(time * 0.7) * 0.07;
        points.forEach((p, i) =>
          p.position.copy(paths[i].getPoint((time * 0.32 + i / 26) % 1)),
        );
        core.material.emissiveIntensity = 0.4 + Math.sin(time * 2) * 0.15;
      }
      controls.update();
      renderer.render(scene, camera);
    }
    points.forEach((p, i) => p.position.copy(paths[i].getPoint(i / 26)));
    animate(performance.now());
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
        }
      });
      texture.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);
  return (
    <div className="scene" ref={host}>
      {failed && (
        <div className="scene-fallback">
          N / N<br />
          <small>
            3D requires WebGL. The simulation lab is available below.
          </small>
        </div>
      )}
    </div>
  );
}
