import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import fs from "node:fs";
function pixelStats(buffer) {
  const png = PNG.sync.read(buffer);
  let lit = 0;
  const colors = new Set();
  for (let i = 0; i < png.data.length; i += 4) {
    if (
      png.data[i + 3] > 0 &&
      (png.data[i] > 35 || png.data[i + 1] > 45 || png.data[i + 2] > 35)
    )
      lit++;
    colors.add(
      `${png.data[i] >> 3},${png.data[i + 1] >> 3},${png.data[i + 2] >> 3}`,
    );
  }
  return { lit, colors: colors.size };
}
async function frame(canvas) {
  return Buffer.from(
    (await canvas.evaluate((c) => c.toDataURL("image/png"))).split(",")[1],
    "base64",
  );
}
for (const [name, width, height] of [
  ["desktop", 1440, 1000],
  ["mobile", 390, 844],
  ["wide", 1920, 1080],
])
  test(`${name}: real 3D scene, responsive content, working lab`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "NeuroNav",
    );
    const canvas = page.locator(".scene canvas");
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1500);
    const first = await frame(canvas);
    const stats = pixelStats(first);
    expect(stats.lit).toBeGreaterThan(1000);
    expect(stats.colors).toBeGreaterThan(30);
    await page.waitForTimeout(500);
    const second = await frame(canvas);
    expect(Buffer.compare(first, second)).not.toBe(0);
    await page
      .getByRole("button", { name: "Pause scene animation", exact: true })
      .click();
    await page.waitForTimeout(400);
    const paused = await frame(canvas);
    await page.waitForTimeout(300);
    expect(Buffer.compare(paused, await frame(canvas))).toBe(0);
    const bounds = await canvas.boundingBox();
    await page.mouse.move(
      bounds.x + bounds.width * 0.65,
      bounds.y + bounds.height * 0.65,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width * 0.65 + 45,
      bounds.y + bounds.height * 0.65 + 20,
      { steps: 8 },
    );
    await page.mouse.up();
    await page.waitForTimeout(500);
    expect(Buffer.compare(paused, await frame(canvas))).not.toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    fs.mkdirSync("test-results", { recursive: true });
    await page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
    await page.getByRole("tab", { name: "Architecture", exact: true }).click();
    await expect(
      page.locator(".metric").filter({ hasText: "Latency estimate" }),
    ).toContainText("3.245");
    await page.getByLabel("Assumed clock").fill("100");
    await expect(
      page.locator(".metric").filter({ hasText: "Latency estimate" }),
    ).toContainText("1.623");
    await page.getByRole("tab", { name: "Neuron dynamics" }).click();
    await page.getByLabel("Input current", { exact: true }).fill("0");
    await expect(
      page
        .locator(".metric")
        .filter({ hasText: "Output spikes" })
        .locator("strong"),
    ).toHaveText("0");
    await page.getByRole("button", { name: "Reset neuron parameters" }).click();
    await expect(page.getByLabel("Input current", { exact: true })).toHaveValue(
      "38",
    );
    const promise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export simulation JSON" }).click();
    const file = await promise;
    const report = JSON.parse(fs.readFileSync(await file.path(), "utf8"));
    expect(report.rows).toHaveLength(100);
    expect(report.kind).toBe("software-simulation");
    await page.locator("input[type=file]").setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{}"),
    });
    await expect(page.getByRole("alert")).toContainText("Expected schema");
    await page.locator("input[type=file]").setInputFiles({
      name: "test-fixture.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          schema: "neuronav-evidence-v1",
          dataset: "MNIST",
          split: "test",
          samples: 1,
          floatAccuracy: 0,
          fixedAccuracy: 0,
          runId: "AUTOMATED-TEST-FIXTURE",
          checkpointSha256: "a".repeat(64),
        }),
      ),
    });
    await expect(page.getByRole("status")).toContainText(
      "not independently verified",
    );
    await page.getByRole("button", { name: "Clear report" }).click();
    await expect(page.getByRole("status")).toHaveCount(0);
    for (const path of [
      "/downloads/RESEARCH_TECHNICAL_GUIDE.md",
      "/downloads/01_snn_mnist_training_colab.ipynb",
      "/downloads/02_fpga_digital_twin_simulation_colab.ipynb",
    ]) {
      const res = await page.request.get(path);
      expect(res.status()).toBe(200);
      expect(await res.text()).not.toContain("<!doctype html>");
    }
    if (name === "mobile") {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page
        .getByRole("navigation")
        .getByRole("link", { name: "Research" })
        .click();
      await expect(page.getByRole("navigation")).not.toBeVisible();
    }
    expect(errors).toEqual([]);
  });
test("reduced motion keeps scene still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const canvas = page.locator(".scene canvas");
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(600);
  const first = await canvas.screenshot();
  await page.waitForTimeout(400);
  expect(Buffer.compare(first, await canvas.screenshot())).toBe(0);
});
test("navigation twin runs, exposes telemetry, and responds to controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#twin");
  const section = page.locator("#twin");
  await expect(
    section.getByRole("heading", { name: "See a spike change the route." }),
  ).toBeVisible();
  const canvas = section.locator(".nav-scene canvas");
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1200);
  const pixels = pixelStats(await frame(canvas));
  expect(pixels.lit).toBeGreaterThan(1000);
  expect(pixels.colors).toBeGreaterThan(30);
  await section.getByLabel("Obstacle behavior").selectOption("crossing");
  await section.getByLabel("Simulation speed").fill("2");
  await expect(section.getByText(/events$/).first()).toBeVisible();
  await section
    .getByRole("button", { name: "Pause navigation simulation" })
    .click();
  await expect(
    section.getByRole("button", { name: "Run navigation simulation" }),
  ).toBeVisible();
  await section
    .getByRole("button", { name: "Reset navigation simulation" })
    .click();
});
