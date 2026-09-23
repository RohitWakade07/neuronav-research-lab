# NeuroNav Engineering Validation

Date: 23 September 2026

## Local Results

- Numeric unit tests: 7 passed. Includes threshold equality, zero current, positive trace, negative floor rounding, saturation, architecture math and malformed report rejection.
- Production Vite build: passed. The Three.js chunk triggers the build's size advisory; it is approximately 139 KB gzipped. No build errors remain.
- Desktop browser workflow: passed at 1440 x 1000.
- Mobile browser workflow: passed at 390 x 844.
- Wide browser workflow: passed at 1920 x 1080.
- Reduced-motion test: passed.
- Browser tests checked actual canvas pixels, frame changes, pause, pointer orbit, horizontal overflow, sliders, architecture calculations, JSON export, report import/rejection/clearing and notebook/guide downloads.
- Desktop and mobile full-page screenshots were visually inspected.
- Dependency installation audit: zero vulnerabilities reported for the installed dependency tree at build time. This is not a comprehensive security audit.

Tests ran in local Chromium through Playwright, using software WebGL rendering. Mobile coverage is viewport emulation, not a physical-device test. The mobile frame test reads the canvas pixel buffer directly because clipped, partially offscreen canvas screenshots were not a reliable animation check. The same pixel-buffer check is used across desktop, mobile and wide layouts.

## Issues Found and Resolved

- Updated icon import to an available library export.
- Updated Vite chunk configuration to the installed bundler's supported function form.
- Added stable accessible names to numeric sliders.
- Clamped startup frame delta to zero to prevent negative curve parameters from a timestamp ordering edge case.

## Production Verification

- Public URL: https://neuronav-research-lab.vercel.app
- GitHub: https://github.com/RohitWakade07/neuronav-research-lab (private).
- Vercel reported production deployment state READY and connected the GitHub repository.
- GitHub Actions Verify run 35842582645 completed successfully.
- All four Playwright browser tests passed against the public production URL in one run (48.7 seconds), including desktop, mobile, wide and reduced-motion tests.
- Tested application source commit: `e0e6bd01a9f801e95d5c305c5696fe2ed96ec200`. A subsequent documentation/source-link update records these results; numerical and interaction code is unchanged.

## Scientific Validation Still Required

No model training, MNIST test evaluation, full-network quantization comparison, RTL simulation, FPGA synthesis, device timing or power experiment was executed as part of this web-app delivery. The included notebooks are unexecuted templates. Scientific acceptance criteria and known template mismatches are documented in the research guide.

Unit and browser tests establish application behavior only. They must not be cited as proof of classifier performance, completed 40% research acceptance, navigation capability or FPGA equivalence.
