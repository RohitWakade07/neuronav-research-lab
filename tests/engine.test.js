import test from "node:test";
import assert from "node:assert/strict";
import {
  simulate,
  estimate,
  validateEvidence,
  navigationStep,
  obstacleX,
  createCityState,
  advanceCityState,
  CITY_OBSTACLES,
} from "../src/engine.js";
test("threshold equality spikes and resets immediately", () =>
  assert.deepEqual(simulate({ current: 128, steps: 1 })[0], {
    t: 0,
    input: 128,
    pre: 128,
    membrane: 0,
    spike: 1,
    floatPre: 128,
    floatMembrane: 0,
    floatSpike: 1,
    saturated: false,
  }));
test("zero input stays at rest", () =>
  assert.ok(
    simulate({ current: 0 }).every((r) => r.membrane === 0 && r.spike === 0),
  ));
test("known integer trace and negative arithmetic floor", () => {
  assert.deepEqual(
    simulate({ current: 38, steps: 4 }).map((r) => r.pre),
    [38, 74, 108, 140],
  );
  assert.equal(simulate({ current: -1, steps: 2 })[1].pre, -2);
});
test("saturates before comparison", () =>
  assert.equal(simulate({ current: 40000, steps: 1 })[0].pre, 32767));
test("architecture estimate follows explicit serialized schedule", () => {
  const r = estimate();
  assert.equal(r.weights, 101632);
  assert.equal(r.cycles, 162250);
  assert.equal(r.weightKiB, 99.25);
  assert.equal(r.latencyMs, 3.245);
});
test("more lanes reduce cycles; clock does not change cycles", () => {
  assert.ok(estimate({ lanes: 32 }).cycles < estimate().cycles);
  assert.equal(estimate({ clock: 100 }).cycles, estimate().cycles);
});
test("rejects malformed evidence", () => {
  assert.throws(() => validateEvidence({}));
  assert.throws(() =>
    validateEvidence({
      schema: "neuronav-evidence-v1",
      dataset: "MNIST",
      split: "test",
      samples: 10000,
      floatAccuracy: 98,
      fixedAccuracy: 0.9,
    }),
  );
});
test("navigation sensor is quiet at range and spikes near an obstacle", () => {
  const far = navigationStep({ distance: 20 });
  assert.equal(far.events, 0);
  assert.equal(far.spike, 0);
  const near = navigationStep({ distance: 4 });
  assert.ok(near.events > 0);
  assert.equal(near.spike, 1);
});
for (const mode of ["near", "crossing", "offset"]) {
  for (const speed of [0.5, 1, 2]) {
    test(`city route avoids contact over repeated runs: ${mode} at ${speed}x`, () => {
      let state = createCityState();
      let brakes = 0;
      for (let tick = 0; tick < 20000 && state.completed < 2; tick++) {
        state = advanceCityState(state, { mode, speed, dt: 0.02 });
        brakes += Number(state.decision === "BRAKE");
        for (const item of CITY_OBSTACLES) {
          if (Math.abs(state.z - item.z) < 2.55) {
            assert.ok(
              Math.abs(state.x - obstacleX(mode, state.time, item.phase)) >= 2.05,
              `contact at tick ${tick}, obstacle ${item.id}`,
            );
          }
        }
      }
      assert.equal(state.completed, 2, `route stalled after ${brakes} brake ticks`);
      assert.equal(state.collisions, 0);
      assert.ok(state.avoids >= 8);
    });
  }
}
