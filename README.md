# NeuroNav Research Lab

An interactive research prototype with a Three.js product page, integer/floating LIF laboratory, FPGA architecture estimates and attributed experiment evidence. Built with React and Vite for Vercel.

## Run

```sh
npm ci
npm run dev
```

## Verify

```sh
npm test
npx playwright install chromium
npx playwright test --workers=1
npm run build
```

Start the development server before browser tests. Use `TEST_BASE_URL` to test another URL.

## Research Integrity

This release contains no trained classifier, hardware measurements or navigation controller. The 3D chip is conceptual. Neuron traces are computed; architecture timings are analytical estimates. Imported experiments are user-reported and not independently verified. The 40% research milestone remains gated by measured model results and RTL equivalence.

Read the [research and technical guide](public/downloads/RESEARCH_TECHNICAL_GUIDE.md) for equations, assumptions, dataset decisions, notebook corrections, evaluation protocols and deployment instructions. Read [validation outcomes](public/downloads/VALIDATION_REPORT.md) for engineering checks.

The original Colab notebooks are unexecuted templates with known integration gaps documented in the guide. No license for redistribution of third-party datasets or dependencies is implied.
