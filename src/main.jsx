import React, { useMemo, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  Cpu,
  Download,
  ExternalLink,
  FlaskConical,
  CodeXml as Github,
  Menu,
  Pause,
  Play,
  RotateCcw,
  Upload,
  X,
  FileText,
  Layers,
  Workflow,
} from "lucide-react";
import Scene from "./Scene";
import {
  simulate,
  estimate,
  validateEvidence,
  download,
  VERSION,
} from "./engine";
import "./style.css";
const fmt = (n) => n.toLocaleString("en-US");
const sources = [
  [
    "MNIST",
    "Official Torchvision dataset loader",
    "https://docs.pytorch.org/vision/stable/generated/torchvision.datasets.MNIST.html",
  ],
  [
    "snnTorch",
    "LIF dynamics and surrogate gradients",
    "https://snntorch.readthedocs.io/en/latest/snn.neurons_leaky.html",
  ],
  [
    "N-MNIST / Tonic",
    "Event-stream dataset extension",
    "https://tonic.readthedocs.io/en/develop/autoapi/tonic/datasets/nmnist/",
  ],
  [
    "cocotb",
    "Python-based RTL verification",
    "https://docs.cocotb.org/en/stable/",
  ],
  [
    "Verilator",
    "SystemVerilog simulation and linting",
    "https://verilator.org/guide/latest/",
  ],
  [
    "Yosys",
    "Open-source synthesis framework",
    "https://yosyshq.readthedocs.io/projects/yosys/en/latest/",
  ],
];
function IconButton({ title, children, ...props }) {
  return (
    <button className="icon-button" title={title} aria-label={title} {...props}>
      {children}
    </button>
  );
}
function Slider({ label, value, min, max, step = 1, onChange, suffix = "" }) {
  return (
    <label className="slider-label">
      <span>
        {label}
        <b>
          {value}
          {suffix}
        </b>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
function Trace({ rows, threshold }) {
  const max = Math.max(
      threshold * 1.3,
      ...rows.map((r) => Math.max(r.pre, r.floatPre)),
    ),
    y = (n) => 180 - (n / max) * 150;
  return (
    <svg
      className="trace"
      viewBox="0 0 760 225"
      role="img"
      aria-label="Floating-point and integer membrane potentials, with output spikes"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="grid" width="76" height="45" patternUnits="userSpaceOnUse">
          <path d="M76 0H0V45" fill="none" stroke="#dce3dc" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="760" height="180" fill="url(#grid)" />
      <line
        x1="0"
        x2="760"
        y1={y(threshold)}
        y2={y(threshold)}
        stroke="#a4753d"
        strokeDasharray="5 5"
      />
      <polyline
        fill="none"
        stroke="#999eae"
        strokeWidth="2"
        points={rows
          .map((r, i) => `${(i * 760) / (rows.length - 1)},${y(r.floatPre)}`)
          .join(" ")}
      />
      <polyline
        fill="none"
        stroke="#3e7550"
        strokeWidth="2.2"
        points={rows
          .map((r, i) => `${(i * 760) / (rows.length - 1)},${y(r.pre)}`)
          .join(" ")}
      />
      {rows
        .filter((r) => r.spike)
        .map((r) => (
          <line
            key={r.t}
            x1={(r.t * 760) / (rows.length - 1)}
            x2={(r.t * 760) / (rows.length - 1)}
            y1="195"
            y2="215"
            stroke="#65972f"
            strokeWidth="3"
          />
        ))}
    </svg>
  );
}
function Lab() {
  const [tab, setTab] = useState("neuron"),
    [current, setCurrent] = useState(38),
    [beta, setBeta] = useState(243),
    [threshold, setThreshold] = useState(128),
    [pattern, setPattern] = useState("constant"),
    [hidden, setHidden] = useState(128),
    [steps, setSteps] = useState(25),
    [lanes, setLanes] = useState(16),
    [clock, setClock] = useState(50),
    [bits, setBits] = useState(8);
  const rows = useMemo(
    () => simulate({ current, beta, threshold, pattern }),
    [current, beta, threshold, pattern],
  );
  const result = estimate({ hidden, steps, lanes, clock, bits });
  const config = { current, beta, threshold, pattern };
  const spikeCount = rows.reduce((a, r) => a + r.spike, 0),
    mismatches = rows.filter((r) => r.spike !== r.floatSpike).length;
  const exportRun = () =>
    download(
      "neuronav-run.json",
      JSON.stringify(
        {
          schema: "neuronav-simulation-v1",
          engine: VERSION,
          createdAt: new Date().toISOString(),
          kind: "software-simulation",
          config,
          rows,
          architecture: { hidden, steps, lanes, clock, bits },
          estimate: result,
          limitations: [
            "Analytical cycle model; not RTL timing",
            "No trained classifier loaded",
            "No physical FPGA measurements",
          ],
        },
        null,
        2,
      ),
    );
  return (
    <section id="lab" className="lab-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">01 / INTERACTIVE LABORATORY</p>
          <h2>From a spike to a system.</h2>
        </div>
        <span className="status">
          <span />
          Browser simulation
        </span>
      </div>
      <div className="lab-toolbar">
        <div className="tabs" role="tablist" aria-label="Laboratory views">
          <button
            role="tab"
            aria-selected={tab === "neuron"}
            onClick={() => setTab("neuron")}
          >
            <Activity size={16} />
            Neuron dynamics
          </button>
          <button
            role="tab"
            aria-selected={tab === "architecture"}
            onClick={() => setTab("architecture")}
          >
            <Cpu size={16} />
            Architecture
          </button>
        </div>
        <IconButton title="Export simulation JSON" onClick={exportRun}>
          <Download size={18} />
        </IconButton>
      </div>
      {tab === "neuron" ? (
        <div className="lab-grid">
          <aside className="controls">
            <div className="control-title">
              <h3>LIF neuron</h3>
              <IconButton
                title="Reset neuron parameters"
                onClick={() => {
                  setCurrent(38);
                  setBeta(243);
                  setThreshold(128);
                  setPattern("constant");
                }}
              >
                <RotateCcw size={15} />
              </IconButton>
            </div>
            <label className="field">
              Input stimulus
              <select
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
              >
                <option value="constant">Constant current</option>
                <option value="burst">Burst train</option>
                <option value="pulse">Periodic pulses</option>
              </select>
            </label>
            <Slider
              label="Input current"
              value={current}
              min={0}
              max={100}
              onChange={setCurrent}
            />
            <Slider
              label="Decay coefficient"
              value={beta}
              min={0}
              max={255}
              onChange={setBeta}
              suffix=" / 256"
            />
            <Slider
              label="Firing threshold"
              value={threshold}
              min={32}
              max={512}
              step={16}
              onChange={setThreshold}
            />
            <div className="technical-note">
              <span>ARITHMETIC CONTRACT</span>
              <code>v = floor(βq × v / 256) + I</code>
              <p>
                Signed 16-bit saturation. Immediate reset to zero at threshold.
              </p>
            </div>
          </aside>
          <div className="plot-area">
            <div className="plot-heading">
              <div>
                <h3>Membrane potential</h3>
                <p>100 discrete time steps · pre-reset state</p>
              </div>
              <span className="small-badge">LIVE CALCULATION</span>
            </div>
            <div className="legend">
              <span className="green">Integer</span>
              <span className="gray">Floating reference</span>
              <span className="ochre">Threshold</span>
            </div>
            <Trace rows={rows} threshold={threshold} />
            <div className="axis">
              <span>t = 0</span>
              <span>Output spikes</span>
              <span>t = 99</span>
            </div>
            <div className="lab-metrics">
              <Metric
                label="Output spikes"
                value={spikeCount}
                note="Integer neuron / 100 steps"
              />
              <Metric
                label="Spike disagreements"
                value={mismatches}
                note="Integer vs floating reference"
              />
              <Metric
                label="Decay retention"
                value={(beta / 256).toFixed(4)}
                note="Dimensionless / per step"
              />
            </div>
            <p className="fineprint">
              This trace evaluates the specified neuron equation. Classifier
              accuracy and hardware timing require separate experiments.
            </p>
          </div>
        </div>
      ) : (
        <div className="lab-grid">
          <aside className="controls">
            <h3>Dense SNN configuration</h3>
            <label className="field">
              Hidden neurons
              <select
                value={hidden}
                onChange={(e) => setHidden(+e.target.value)}
              >
                {[64, 128, 256].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <Slider
              label="Time steps"
              value={steps}
              min={1}
              max={100}
              onChange={setSteps}
            />
            <label className="field">
              Parallel accumulation lanes
              <select value={lanes} onChange={(e) => setLanes(+e.target.value)}>
                {[1, 4, 8, 16, 32, 64].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <Slider
              label="Assumed clock"
              value={clock}
              min={10}
              max={200}
              step={10}
              onChange={setClock}
              suffix=" MHz"
            />
            <label className="field">
              Weight storage precision
              <select value={bits} onChange={(e) => setBits(+e.target.value)}>
                {[4, 8, 16].map((v) => (
                  <option key={v} value={v}>
                    {v} bit
                  </option>
                ))}
              </select>
            </label>
          </aside>
          <div className="plot-area">
            <div className="plot-heading">
              <div>
                <h3>Architecture budget</h3>
                <p>Serialized dense layers · optimistic on-chip memory model</p>
              </div>
              <span className="small-badge">ESTIMATED</span>
            </div>
            <div className="network">
              <div>
                <span>INPUT</span>
                <strong>784</strong>
                <small>spike streams</small>
              </div>
              <ArrowRight />
              <div>
                <span>HIDDEN</span>
                <strong>{hidden}</strong>
                <small>LIF neurons</small>
              </div>
              <ArrowRight />
              <div>
                <span>OUTPUT</span>
                <strong>10</strong>
                <small>spike counters</small>
              </div>
            </div>
            <div className="lab-metrics">
              <Metric
                label="Latency estimate"
                value={result.latencyMs.toFixed(3)}
                note="ms / inference"
              />
              <Metric
                label="Cycle estimate"
                value={fmt(result.cycles)}
                note={`${fmt(result.cyclesPerStep)} per time step`}
              />
              <Metric
                label="Weight storage"
                value={result.weightKiB.toFixed(2)}
                note={`KiB · ${fmt(result.weights)} weights`}
              />
            </div>
            <div className="estimate-line">
              <span>Serial inference throughput</span>
              <b>{result.throughput.toFixed(1)} / s</b>
            </div>
            <p className="fineprint">
              Excludes memory stalls, pipeline fill, routing, I/O and control
              overhead. Clock frequency is an assumption. Weight precision
              changes storage only; this panel does not evaluate quantized
              accuracy.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
function Metric({ label, value, note }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function Evidence() {
  const [evidence, setEvidence] = useState(null),
    [error, setError] = useState("");
  const input = useRef();
  async function upload(e) {
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 100000) throw new Error("File exceeds the 100 KB limit.");
      setEvidence(validateEvidence(JSON.parse(await file.text())));
      setError("");
    } catch (err) {
      setError(err.message);
    }
    e.target.value = "";
  }
  return (
    <section id="evidence" className="evidence-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">02 / RESEARCH EVIDENCE</p>
          <h2>Every claim needs a result.</h2>
        </div>
        <a
          className="text-link"
          href="/downloads/RESEARCH_TECHNICAL_GUIDE.md"
          download
        >
          Research guide <ArrowUpRight size={17} />
        </a>
      </div>
      <div className="evidence-summary">
        <div>
          <span className="small-badge">CURRENT RESEARCH STATE</span>
          <h3>
            Software prototype.
            <br />
            Hardware validation ahead.
          </h3>
          <p>
            The lab is operational. MNIST training, full-network fixed-point
            validation and RTL equivalence remain experimental milestones.
          </p>
          <button className="button dark" onClick={() => input.current.click()}>
            <Upload size={16} />
            Import experiment
          </button>
          <input
            ref={input}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={upload}
          />
          <a
            className="template-link"
            href="/downloads/evidence-template.json"
            download
          >
            Evidence schema template <Download size={14} />
          </a>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {evidence && (
            <div className="imported" role="status">
              <b>Imported report · {evidence.runId}</b>
              <p>
                User-supplied, not independently verified.{" "}
                {fmt(evidence.samples)} MNIST test samples.
              </p>
              <p>
                Float: {(evidence.floatAccuracy * 100).toFixed(2)}% · Fixed:{" "}
                {(evidence.fixedAccuracy * 100).toFixed(2)}%
              </p>
              <button className="text-link" onClick={() => setEvidence(null)}>
                Clear report <X size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="evidence-table">
          <div className="table-header">
            <span>MEASURE</span>
            <span>EVIDENCE STATUS</span>
          </div>
          {[
            ["Neuron trace", "Computed in browser", "ready"],
            ["Architecture latency", "Analytical estimate", "estimate"],
            [
              "MNIST test accuracy",
              evidence ? "Report imported" : "Awaiting measured run",
              "pending",
            ],
            ["Full-network quantization", "Awaiting validation", "pending"],
            ["RTL equivalence", "Awaiting simulator run", "pending"],
            ["FPGA power / utilization", "No board measurements", "pending"],
          ].map(([a, b, c]) => (
            <div className="evidence-row" key={a}>
              <span>{a}</span>
              <span className={`evidence-tag ${c}`}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="milestone">
        <span>40% research milestone</span>
        <p>
          Acceptance requires trained-model metrics, a validated integer network
          and passing RTL comparison. A polished interface alone does not
          establish research completion.
        </p>
        <a
          href="/downloads/NeuroNav_Final_Architecture_Execution_Plan.md"
          download
          aria-label="Download original architecture plan"
        >
          <ArrowUpRight />
        </a>
      </div>
    </section>
  );
}
function App() {
  const [paused, setPaused] = useState(false),
    [menu, setMenu] = useState(false);
  return (
    <>
      <header>
        <a className="brand" href="#">
          <Activity size={23} />
          <span>
            neuro<span>nav</span>
          </span>
        </a>
        <nav className={menu ? "open" : ""} aria-label="Main navigation">
          {[
            ["The laboratory", "#lab"],
            ["Architecture", "#architecture"],
            ["Research", "#evidence"],
          ].map(([a, b]) => (
            <a href={b} key={b} onClick={() => setMenu(false)}>
              {a}
            </a>
          ))}
        </nav>
        <a className="header-cta" href="#lab">
          Launch lab <ArrowUpRight size={16} />
        </a>
        <IconButton
          title={menu ? "Close menu" : "Open menu"}
          className="menu-button icon-button"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </IconButton>
      </header>
      <main>
        <section className="hero">
          <Scene paused={paused} />
          <div className="hero-content">
            <p className="eyebrow">
              <span className="live-dot" /> NEUROMORPHIC COMPUTING / RESEARCH
              PREVIEW
            </p>
            <h1>
              NeuroNav
              <span>
                Intelligence,
                <br />
                one spike at a time.
              </span>
            </h1>
            <p className="hero-copy">
              Exploring event-driven intelligence.
              <br />
              From spiking neurons to FPGA-ready architectures.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#lab">
                Enter the laboratory <ArrowUpRight size={18} />
              </a>
              <a className="hero-link" href="#evidence">
                Explore the research <ArrowRight size={16} />
              </a>
            </div>
          </div>
          <div className="scene-label">
            <span className="crosshair">+</span>
            <div>
              NEURON PROCESSING CORE<small>CONCEPTUAL FPGA VISUALIZATION</small>
            </div>
          </div>
          <div className="hero-bottom">
            <span>01 / SOFTWARE RESEARCH PROTOTYPE</span>
            <a href="#lab" aria-label="Scroll to laboratory">
              <ChevronDown size={20} />
            </a>
            <IconButton
              title={
                paused ? "Resume scene animation" : "Pause scene animation"
              }
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </IconButton>
          </div>
        </section>
        <div className="spec-band">
          <div>
            <Cpu size={22} />
            <span>
              FPGA-oriented<strong>Fixed-point design</strong>
            </span>
          </div>
          <div>
            <Activity size={22} />
            <span>
              Neuron model<strong>Leaky integrate-and-fire</strong>
            </span>
          </div>
          <div>
            <Layers size={22} />
            <span>
              Baseline architecture<strong>784 → 128 → 10</strong>
            </span>
          </div>
          <div>
            <FlaskConical size={22} />
            <span>
              Validation environment<strong>PC-based simulation</strong>
            </span>
          </div>
        </div>
        <Lab />
        <section id="architecture" className="architecture-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE RESEARCH PIPELINE</p>
              <h2>One architecture. Traceable steps.</h2>
            </div>
            <p className="section-description">
              A path from benchmark data to verified hardware behavior, with
              evidence at each stage.
            </p>
          </div>
          <div className="pipeline">
            {[
              [
                Layers,
                "01",
                "Encode",
                "MNIST pixels become temporal spike trains.",
                "DATASET BENCHMARK",
              ],
              [
                Activity,
                "02",
                "Learn",
                "Surrogate-gradient training with LIF neurons.",
                "COLAB NOTEBOOK",
              ],
              [
                Cpu,
                "03",
                "Quantize",
                "Calibrate weights, thresholds and state ranges.",
                "VALIDATION REQUIRED",
              ],
              [
                Workflow,
                "04",
                "Verify",
                "Compare integer traces against RTL simulation.",
                "HARDWARE GATE",
              ],
            ].map(([Icon, n, title, desc, status]) => (
              <article key={n}>
                <div>
                  <Icon size={25} />
                  <span>{n}</span>
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
                <small>{status}</small>
              </article>
            ))}
          </div>
          <div className="notebooks">
            <span>Research workbench</span>
            <a href="/downloads/01_snn_mnist_training_colab.ipynb" download>
              <FileText size={17} />
              Training notebook
              <Download size={16} />
            </a>
            <a
              href="/downloads/02_fpga_digital_twin_simulation_colab.ipynb"
              download
            >
              <FileText size={17} />
              Digital model notebook
              <Download size={16} />
            </a>
            <span className="notebook-note">
              Unexecuted templates · see guide corrections
            </span>
          </div>
        </section>
        <Evidence />
        <section className="sources-section">
          <div>
            <p className="eyebrow">BUILT ON OPEN RESEARCH</p>
            <h2>Sources, not shortcuts.</h2>
            <p>Primary documentation supporting the methodology.</p>
          </div>
          <div className="sources">
            {sources.map(([a, b, c]) => (
              <a href={c} key={a} target="_blank" rel="noreferrer">
                <span>
                  <b>{a}</b>
                  <small>{b}</small>
                </span>
                <ArrowUpRight size={18} />
              </a>
            ))}
          </div>
        </section>
        <section className="closing">
          <span className="eyebrow">THE NEXT EXPERIMENT STARTS HERE</span>
          <h2>Make the behavior visible.</h2>
          <a className="button primary" href="#lab">
            Open the laboratory <ArrowUpRight size={18} />
          </a>
        </section>
      </main>
      <footer>
        <a className="brand" href="#">
          <Activity size={22} />
          <span>
            neuro<span>nav</span>
          </span>
        </a>
        <p>Research prototype · September 2026</p>
        <a
          href="https://github.com/RohitWakade07/neuronav-research-lab"
          target="_blank"
          rel="noreferrer"
        >
          <Github size={16} />
          Source code <ExternalLink size={13} />
        </a>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
