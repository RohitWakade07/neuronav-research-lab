export const VERSION = "neuro-nav-lif-v1";
export function simulate({
  current = 38,
  beta = 243,
  threshold = 128,
  steps = 100,
  pattern = "constant",
} = {}) {
  let fixed = 0,
    floating = 0;
  return Array.from({ length: steps }, (_, t) => {
    const input =
      pattern === "burst"
        ? t % 24 < 8
          ? current
          : 0
        : pattern === "pulse"
          ? t % 12 === 0
            ? current * 4
            : 0
          : current;
    const raw = Math.floor((beta * fixed) / 256) + input;
    const pre = Math.max(-32768, Math.min(32767, raw));
    const floatPre = (beta / 256) * floating + input;
    const spike = pre >= threshold,
      floatSpike = floatPre >= threshold;
    fixed = spike ? 0 : pre;
    floating = floatSpike ? 0 : floatPre;
    return {
      t,
      input,
      pre,
      membrane: fixed,
      spike: Number(spike),
      floatPre,
      floatMembrane: floating,
      floatSpike: Number(floatSpike),
      saturated: raw !== pre,
    };
  });
}
export function navigationStep({
  distance,
  membrane = 0,
  beta = 224,
  threshold = 150,
}) {
  const proximity = Math.max(0, Math.min(1, (18 - distance) / 14));
  const events = Math.round(proximity * 32);
  const current = events * 8;
  const raw = Math.floor((beta * membrane) / 256) + current;
  const pre = Math.max(-32768, Math.min(32767, raw));
  const spike = pre >= threshold;
  return {
    proximity,
    events,
    current,
    pre,
    membrane: spike ? 0 : pre,
    spike: Number(spike),
  };
}
export const CITY_ROUTE_START = 32;
export const CITY_ROUTE_END = -184;
export const CITY_OBSTACLES = [
  { id: 0, z: -7, phase: 0 },
  { id: 1, z: -55, phase: 1.8 },
  { id: 2, z: -103, phase: 3.6 },
  { id: 3, z: -151, phase: 5.4 },
];

export function obstacleX(mode, time, phase = 0) {
  if (mode === "crossing") return Math.sin(time * 0.72 + phase) * 3.7;
  return mode === "offset" ? 2.9 : 0;
}

export function createCityState() {
  return {
    x: 0, z: CITY_ROUTE_START, time: 0, membrane: 0,
    spikes: 0, avoids: 0, collisions: 0, completed: 0,
    activeId: -1, lane: 0, decision: "FORWARD",
    distance: 32, events: 0, pre: 0,
  };
}

function overlaps(x, z, obstacleXValue, obstacleZ, margin = 0) {
  return Math.abs(x - obstacleXValue) < 2.05 + margin &&
    Math.abs(z - obstacleZ) < 2.55 + margin;
}

export function advanceCityState(previous, { mode = "near", speed = 1, dt = 0.05, hwNeuron = null } = {}) {
  const step = Math.max(0, Math.min(0.05, dt));
  if (step === 0) return previous;
  const time = previous.time + step * speed;
  const travelRate = 4.1;
  const nextObstacle = CITY_OBSTACLES.find((item) => item.z < previous.z + 2.55);
  const obstacle = nextObstacle || CITY_OBSTACLES.at(-1);
  const dz = previous.z - obstacle.z;
  const projectedTime = time + Math.max(0, dz - 5) / travelRate;
  const predictedX = obstacleX(mode, projectedTime, obstacle.phase);
  const sensedDistance = Math.max(0.5, Math.hypot(previous.x - obstacleX(mode, time, obstacle.phase), dz) - 1.2);
  const neuron = hwNeuron || navigationStep({ distance: sensedDistance, membrane: previous.membrane });
  let lane = previous.lane;
  let activeId = previous.activeId;
  let avoids = previous.avoids;
  const activeObstacle = CITY_OBSTACLES.find((item) => item.id === activeId);
  if (activeObstacle && previous.z < activeObstacle.z - 3.4) {
    lane = 0;
    activeId = -1;
  }
  if (nextObstacle && nextObstacle.id !== activeId && dz < 23 && dz > -2.55) {
    activeId = nextObstacle.id;
    lane = predictedX >= 0 ? -3.45 : 3.45;
    avoids++;
  }
  const approach = Math.max(-3.45, Math.min(3.45, lane - previous.x));
  const candidateX = previous.x + Math.sign(approach) * Math.min(Math.abs(approach), 3.5 * step * speed);
  const candidateZ = previous.z - travelRate * step * speed;
  const activeObstacles = CITY_OBSTACLES.filter((item) => Math.abs(item.z - previous.z) < 9);
  const unsafe = activeObstacles.some((item) => {
    const currentX = obstacleX(mode, previous.time, item.phase);
    const futureX = obstacleX(mode, time, item.phase);
    const inCrossing = candidateZ < item.z + 2.85 && candidateZ > item.z - 2.85;
    const crossingTimeLeft = Math.max(0, (candidateZ - (item.z - 2.85)) / travelRate) + 0.05;
    const crossingWindowBlocked = mode === "crossing" && inCrossing &&
      (Math.abs(candidateX - lane) > 0.3 ||
        Array.from({ length: Math.ceil(crossingTimeLeft / 0.05) + 1 }, (_, index) => index * 0.05).some((ahead) =>
          Math.abs(candidateX - obstacleX(mode, time + ahead, item.phase)) < 2.3,
        ));
    // Substeps cover the swept motion of both the vehicle and a crossing object.
    return crossingWindowBlocked || [0.25, 0.5, 0.75, 1].some((fraction) =>
      overlaps(
        previous.x + (candidateX - previous.x) * fraction,
        previous.z + (candidateZ - previous.z) * fraction,
        currentX + (futureX - currentX) * fraction,
        item.z,
        0.2,
      ),
    );
  });
  const x = unsafe ? previous.x : candidateX;
  const z = unsafe ? previous.z : candidateZ;
  const completed = previous.completed + Number(z <= CITY_ROUTE_END);
  const decision = unsafe ? "BRAKE" : lane !== 0 ? "AVOID" : "FORWARD";
  return {
    x: completed > previous.completed ? 0 : x,
    z: completed > previous.completed ? CITY_ROUTE_START : z,
    time,
    membrane: neuron.membrane,
    pre: neuron.pre,
    spikes: previous.spikes + neuron.spike,
    avoids,
    collisions: previous.collisions,
    completed,
    activeId: completed > previous.completed ? -1 : activeId,
    lane: completed > previous.completed ? 0 : lane,
    decision,
    distance: sensedDistance,
    events: neuron.events,
  };
}
export function estimate({
  hidden = 128,
  steps = 25,
  lanes = 16,
  clock = 50,
  bits = 8,
} = {}) {
  const weights = 784 * hidden + hidden * 10;
  // Each layer is serialized: ceil(weights / lanes), then one state update per neuron.
  const cyclesPerStep =
    Math.ceil((784 * hidden) / lanes) +
    hidden +
    Math.ceil((hidden * 10) / lanes) +
    10;
  const cycles = steps * cyclesPerStep;
  return {
    weights,
    cyclesPerStep,
    cycles,
    latencyMs: cycles / (clock * 1000),
    throughput: (clock * 1e6) / cycles,
    weightKiB: (weights * bits) / 8192,
    stateKiB: ((hidden + 10) * 16) / 8192,
  };
}
export function validateEvidence(value) {
  if (!value || value.schema !== "neuronav-evidence-v1")
    throw new Error(
      "Expected schema neuronav-evidence-v1. Download the template for the required fields.",
    );
  if (
    value.dataset !== "MNIST" ||
    value.split !== "test" ||
    !Number.isInteger(value.samples) ||
    value.samples < 1 ||
    value.samples > 10000
  )
    throw new Error("Expected MNIST test split with 1 to 10,000 samples.");
  for (const k of ["floatAccuracy", "fixedAccuracy"])
    if (!Number.isFinite(value[k]) || value[k] < 0 || value[k] > 1)
      throw new Error(k + " must be a number between 0 and 1.");
  if (
    typeof value.runId !== "string" ||
    !value.runId.trim() ||
    typeof value.checkpointSha256 !== "string" ||
    !/^[a-f0-9]{64}$/i.test(value.checkpointSha256)
  )
    throw new Error(
      "Run ID and a 64-character checkpoint SHA-256 are required.",
    );
  return value;
}
export function download(name, content, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
