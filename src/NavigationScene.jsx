import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { navigationStep } from "./engine";

export default function NavigationScene({
  running,
  speed,
  obstacle,
  onFrame,
  resetToken,
}) {
  const host = useRef(null);
  const state = useRef({ running, speed, obstacle, onFrame });
  Object.assign(state.current, { running, speed, obstacle, onFrame });

  useEffect(() => {
    const el = host.current;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(0x101714);
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D reactive-navigation digital model",
    );
    renderer.domElement.setAttribute("role", "img");

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x101714, 20, 62);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(12, 10, 15);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, -4);
    controls.enableDamping = true;
    controls.maxDistance = 30;
    controls.minDistance = 8;
    scene.add(new THREE.HemisphereLight(0xdde9df, 0x18231b, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.set(8, 14, 7);
    sun.castShadow = true;
    scene.add(sun);

    const verge = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 100),
      new THREE.MeshStandardMaterial({ color: 0x253629, roughness: 1 }),
    );
    verge.rotation.x = -Math.PI / 2;
    verge.position.set(0, -0.03, -25);
    scene.add(verge);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 80),
      new THREE.MeshStandardMaterial({ color: 0x27302c, roughness: 0.92 }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = -22;
    road.receiveShadow = true;
    scene.add(road);
    for (let z = 14; z > -62; z -= 5) {
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.015, 2.5),
        new THREE.MeshBasicMaterial({ color: 0xb4c0af }),
      );
      dash.position.set(0, 0.02, z);
      scene.add(dash);
    }
    for (const x of [-5.8, 5.8]) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.02, 80),
        new THREE.MeshBasicMaterial({ color: 0xa3b696 }),
      );
      line.position.set(x, 0.03, -22);
      scene.add(line);
    }
    for (let i = 0; i < 36; i++) {
      const x = (i % 2 ? 1 : -1) * (7 + (i % 5) * 1.2);
      const z = 15 - i * 2.2;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 1.5, 7),
        new THREE.MeshStandardMaterial({ color: 0x5a4936 }),
      );
      trunk.position.set(x, 0.75, z);
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(0.8 + (i % 3) * 0.12, 2.4, 8),
        new THREE.MeshStandardMaterial({ color: i % 2 ? 0x34543a : 0x426544 }),
      );
      crown.position.set(x, 2.35, z);
      scene.add(trunk, crown);
    }

    const car = new THREE.Group();
    scene.add(car);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.45, 3),
      new THREE.MeshStandardMaterial({
        color: 0xc6f36b,
        metalness: 0.45,
        roughness: 0.3,
      }),
    );
    body.position.y = 0.55;
    body.castShadow = true;
    car.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.55, 1.35),
      new THREE.MeshStandardMaterial({
        color: 0x182522,
        metalness: 0.5,
        roughness: 0.15,
      }),
    );
    cabin.position.set(0, 1, 0.15);
    car.add(cabin);
    for (const x of [-0.9, 0.9])
      for (const z of [-0.9, 0.9]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 0.18, 16),
          new THREE.MeshStandardMaterial({ color: 0x080b0a }),
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.35, z);
        car.add(wheel);
      }
    const sensor = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.17, 0.25),
      new THREE.MeshStandardMaterial({
        color: 0xdfffa0,
        emissive: 0x78a83a,
        emissiveIntensity: 1,
      }),
    );
    sensor.position.set(0, 1.36, -0.48);
    car.add(sensor);

    const obstacleMesh = new THREE.Group();
    scene.add(obstacleMesh);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0xa06e43,
      roughness: 0.7,
    });
    for (let x = -0.55; x <= 0.55; x += 1.1)
      for (let y = 0; y < 2; y++) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), crateMat);
        crate.position.set(x, 0.5 + y, 0);
        crate.castShadow = true;
        obstacleMesh.add(crate);
      }

    const rayGeo = new THREE.BufferGeometry();
    const rayMat = new THREE.LineBasicMaterial({
      color: 0xc6f36b,
      transparent: true,
      opacity: 0.45,
    });
    const rays = new THREE.LineSegments(rayGeo, rayMat);
    scene.add(rays);
    const pulses = [];
    for (let i = 0; i < 18; i++) {
      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xdfff8c }),
      );
      scene.add(pulse);
      pulses.push(pulse);
    }

    let simTime = 0,
      membrane = 0,
      spikes = 0,
      avoids = 0;
    let last = performance.now(),
      lastUi = 0,
      frame;
    car.position.set(0, 0, 7);
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    function loop(now) {
      frame = requestAnimationFrame(loop);
      const dt = Math.max(0, Math.min(0.04, (now - last) / 1000));
      last = now;
      const cfg = state.current;
      obstacleMesh.position.set(
        cfg.obstacle === "crossing"
          ? Math.sin(simTime * 0.65) * 3.6
          : cfg.obstacle === "near"
            ? 0
            : 2.6,
        -0.02,
        -8,
      );
      const distance = Math.max(
        0.5,
        car.position.distanceTo(obstacleMesh.position) - 1.2,
      );
      const result = navigationStep({ distance, membrane });
      if (cfg.running) {
        simTime += dt * cfg.speed;
        membrane = result.membrane;
        spikes += result.spike;
        if (result.spike && result.proximity > 0.3) avoids++;
        const targetX =
          result.proximity > 0.35
            ? obstacleMesh.position.x >= car.position.x
              ? -3.25
              : 3.25
            : 0;
        car.position.x += (targetX - car.position.x) * dt * 2.2;
        car.position.z -= dt * (2.2 + cfg.speed * 0.6);
        if (car.position.z < -30) car.position.set(0, 0, 7);
        car.rotation.y = (targetX - car.position.x) * -0.07;
      }
      const origin = new THREE.Vector3(
        car.position.x,
        1.15,
        car.position.z - 1.4,
      );
      const target = obstacleMesh.position.clone();
      target.y = 1;
      const vertices = [];
      for (let i = -3; i <= 3; i++)
        vertices.push(
          origin.x,
          origin.y,
          origin.z,
          target.x + i * 0.25,
          target.y,
          target.z,
        );
      rayGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      rayMat.color.setHex(result.proximity > 0.45 ? 0xffb45d : 0xc6f36b);
      pulses.forEach((pulse, i) => {
        const t = (simTime * 0.6 + i / pulses.length) % 1;
        pulse.position.lerpVectors(origin, target, t);
        pulse.visible = i < Math.max(2, Math.round(result.events / 2));
      });
      if (now - lastUi > 100) {
        lastUi = now;
        cfg.onFrame?.({
          distance,
          events: result.events,
          membrane: result.pre,
          spikes,
          avoids,
          decision: result.proximity > 0.35 ? "AVOID" : "FORWARD",
          x: car.position.x,
        });
      }
      controls.update();
      renderer.render(scene, camera);
    }
    loop(performance.now());
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (object.material)
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((m) => m.dispose());
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [resetToken]);
  return <div className="nav-scene" ref={host} />;
}
