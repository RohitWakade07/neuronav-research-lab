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
