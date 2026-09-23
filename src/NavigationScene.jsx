import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CITY_OBSTACLES,
  CITY_ROUTE_START,
  advanceCityState,
  createCityState,
  obstacleX,
} from "./engine";

export default function NavigationScene({
  running,
  speed,
  obstacle,
  hwTwin,
  onFrame,
  resetToken,
}) {
  const host = useRef(null);
  const state = useRef({ running, speed, obstacle, hwTwin, onFrame });
  Object.assign(state.current, { running, speed, obstacle, hwTwin, onFrame });

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
    scene.fog = new THREE.Fog(0x101714, 45, 115);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
    camera.position.set(16, 13, CITY_ROUTE_START + 15);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, CITY_ROUTE_START - 8);
    controls.enableDamping = true;
    controls.maxDistance = 38;
    controls.minDistance = 8;
    scene.add(new THREE.HemisphereLight(0xdde9df, 0x18231b, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.set(8, 14, 7);
    sun.castShadow = true;
    scene.add(sun);

    const verge = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 310),
      new THREE.MeshStandardMaterial({ color: 0x242c28, roughness: 1 }),
    );
    verge.rotation.x = -Math.PI / 2;
    verge.position.set(0, -0.03, -90);
    scene.add(verge);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 270),
      new THREE.MeshStandardMaterial({ color: 0x27302c, roughness: 0.92 }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = -92;
    road.receiveShadow = true;
    scene.add(road);
    for (let z = 44; z > -228; z -= 5) {
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.015, 2.5),
        new THREE.MeshBasicMaterial({ color: 0xb4c0af }),
      );
      dash.position.set(0, 0.02, z);
      scene.add(dash);
    }
    for (const x of [-5.8, 5.8]) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.02, 270),
        new THREE.MeshBasicMaterial({ color: 0xa3b696 }),
      );
      line.position.set(x, 0.03, -92);
      scene.add(line);
    }
    for (let i = 0; i < 86; i++) {
      const x = (i % 2 ? 1 : -1) * (13 + (i % 5) * 1.5);
      const z = 43 - i * 3.2;
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

    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x767f79, roughness: 1 });
    const buildingPalette = [0x6a7a83, 0x826e6c, 0x9a937e, 0x4f6870, 0x72806b];
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xb7d2c1 });
    for (const side of [-1, 1]) {
      const pavement = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.18, 270), sidewalkMat);
      pavement.position.set(side * 9.1, 0.06, -92);
      scene.add(pavement);
      for (let index = 0; index < 23; index++) {
        const z = 38 - index * 11.6;
        if (index % 4 === 0) continue;
        const height = 5 + ((index * 7 + (side + 1) * 3) % 11);
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(5.5, height, 7.8),
          new THREE.MeshStandardMaterial({ color: buildingPalette[(index + (side + 1)) % buildingPalette.length], roughness: 0.78 }),
        );
        building.position.set(side * 15.4, height / 2, z);
        building.castShadow = true;
        scene.add(building);
        for (let level = 1; level < height - 1; level += 2.2) {
          for (const offset of [-2.4, 0, 2.4]) {
            const window = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.95, 0.04), windowMat);
            window.position.set(side * 15.4 + offset, level, z + 3.94);
            scene.add(window);
          }
        }
      }
    }
    for (const crossing of CITY_OBSTACLES) {
      for (let stripe = -5; stripe <= 5; stripe++) {
        const paint = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.025, 1.3),
          new THREE.MeshBasicMaterial({ color: 0xd4ddd1 }),
        );
        paint.position.set(stripe, 0.05, crossing.z + 7);
        scene.add(paint);
      }
      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 4.5, 8), new THREE.MeshStandardMaterial({ color: 0x536559 }));
        pole.position.set(side * 6.2, 2.25, crossing.z + 7);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.2, 0.45), new THREE.MeshStandardMaterial({ color: 0x25332a }));
        lamp.position.set(side * 6.2, 4.2, crossing.z + 7);
        const signal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xe0b06b }));
        signal.position.set(side * 6.2, 4.35, crossing.z + 7.24);
        scene.add(pole, lamp, signal);
      }
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

    const crateMat = new THREE.MeshStandardMaterial({
      color: 0xa06e43,
      roughness: 0.7,
    });
    const obstacleMeshes = CITY_OBSTACLES.map((item) => {
      const group = new THREE.Group();
      group.position.z = item.z;
      scene.add(group);
      for (let x = -0.55; x <= 0.55; x += 1.1)
        for (let y = 0; y < 2; y++) {
          const crate = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), crateMat);
          crate.position.set(x, 0.5 + y, 0);
          crate.castShadow = true;
          group.add(crate);
        }
      return group;
    });

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

    let simulation = createCityState();
    let accumulator = 0;
    let last = performance.now(),
      lastUi = 0,
      frame;
    car.position.set(0, 0, CITY_ROUTE_START);
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

    function getObstaclePhase(simState, cfg) {
      return CITY_OBSTACLES.find((item) => item.z < simState.z + 2.55)?.phase || 0;
    }
    function getObstacleZ(simState) {
      return CITY_OBSTACLES.find((item) => item.z < simState.z + 2.55)?.z || 0;
    }

    let loopRunning = false;
    async function loop(now) {
      if (loopRunning) return;
      loopRunning = true;
      
      const dt = Math.max(0, Math.min(0.04, (now - last) / 1000));
      last = now;
      const cfg = state.current;
      if (cfg.running) {
        accumulator += dt;
        while (accumulator >= 0.02) {
          let hwNeuron = null;
          if (cfg.hwTwin) {
            // Compute distance manually as advanceCityState would
            const dz = simulation.z - getObstacleZ(simulation);
            const sensedDistance = Math.max(0.5, Math.hypot(simulation.x - obstacleX(cfg.obstacle, simulation.time, getObstaclePhase(simulation, cfg)), dz) - 1.2);
            
            // Replicate navigationStep current generation
            const proximity = Math.max(0, Math.min(1, (18 - sensedDistance) / 14));
            const events = Math.round(proximity * 32);
            const inputCurrent = events * 8;
            
            try {
              const res = await fetch("/step", {
                method: "POST",
                body: JSON.stringify({ input_current: inputCurrent }),
                headers: { "Content-Type": "application/json" }
              });
              if (res.ok) {
                const data = await res.json();
                hwNeuron = {
                  membrane: data.mem_out,
                  pre: data.pre,
                  spike: data.spike,
                  events: events
                };
              }
            } catch (e) {
              console.error("Twin step failed:", e);
            }
          }
          
          simulation = advanceCityState(simulation, {
            mode: cfg.obstacle,
            speed: cfg.speed,
            dt: 0.02,
            hwNeuron
          });
          accumulator -= 0.02;
        }
      }
      car.position.set(simulation.x, 0, simulation.z);
      car.rotation.y = (simulation.lane - simulation.x) * -0.045;
      obstacleMeshes.forEach((mesh, i) => {
        mesh.position.x = obstacleX(cfg.obstacle, simulation.time, CITY_OBSTACLES[i].phase);
      });
      const nearest = CITY_OBSTACLES.find((item) => item.z < simulation.z + 2.55) || CITY_OBSTACLES.at(-1);
      const obstacleMesh = obstacleMeshes[nearest.id];
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
      rayMat.color.setHex(simulation.decision === "BRAKE" ? 0xff6d68 : simulation.decision === "AVOID" ? 0xffb45d : 0xc6f36b);
      pulses.forEach((pulse, i) => {
        const t = (simulation.time * 0.6 + i / pulses.length) % 1;
        pulse.position.lerpVectors(origin, target, t);
        pulse.visible = i < Math.max(2, Math.round(simulation.events / 2));
      });
      const cameraTarget = new THREE.Vector3(simulation.x, 0, simulation.z - 7);
      const shift = cameraTarget.sub(controls.target).multiplyScalar(Math.min(1, dt * 2.4));
      camera.position.add(shift);
      controls.target.add(shift);
      if (now - lastUi > 100) {
        lastUi = now;
        cfg.onFrame?.({
          distance: simulation.distance,
          events: simulation.events,
          membrane: simulation.pre,
          spikes: simulation.spikes,
          avoids: simulation.avoids,
          collisions: simulation.collisions,
          completed: simulation.completed,
          decision: simulation.decision,
          x: simulation.x,
        });
      }
      controls.update();
      renderer.render(scene, camera);
      
      loopRunning = false;
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);
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
