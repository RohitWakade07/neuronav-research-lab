# NeuroNav Final Architecture and Execution Plan

Source document: `A:/website-active1/SNN ON FPGA/SNN_FPGA_Synopsis_EDAI (1).pdf`

Date: 2026-09-23

## 1. Ground Truth From The Provided Synopsis

The provided synopsis defines the project as:

- Project title: **NeuroNav - Event driven FPGA SNN for Low powered reactive Navigation**
- Project area: Artificial Intelligence / Embedded Systems
- Core technical goal: design, train, quantize, map, and simulate a Spiking Neural Network for FPGA-compatible inference.
- Initial benchmark: a standard image-classification dataset such as MNIST.
- Candidate neuron model: Leaky Integrate-and-Fire (LIF).
- Candidate spike encodings: rate encoding and/or temporal encoding.
- Candidate learning methods: surrogate-gradient backpropagation and/or STDP.
- Hardware focus: FPGA-compatible architecture, RTL neuron/synapse modules, simulation and verification.
- Required evaluation axes: classification accuracy, latency, throughput, FPGA resource utilization, and comparison against existing SNN software/hardware implementations.

Important correction: the synopsis title says reactive navigation, but the detailed scope currently describes benchmark classification, especially MNIST. Therefore, the first publishable prototype should not claim real robot navigation unless a navigation dataset, task definition, or sensor interface is added later.

## 2. Validated External Ground Truth

The following items are validated against public primary or near-primary sources:

- MNIST is available as 60,000 training examples and 10,000 test examples of normalized handwritten digits from Yann LeCun's MNIST page: https://yann.lecun.org/exdb/mnist/
- snnTorch supports surrogate-gradient training by overriding the non-differentiable spike gradient; this is suitable for a PyTorch-based SNN baseline: https://snntorch.readthedocs.io/en/latest/snntorch.surrogate.html
- snnTorch includes spike generation utilities and MNIST tutorial material, making it a practical baseline framework for Colab: https://github.com/jeshraghian/snntorch/blob/master/docs/tutorials/tutorial_1.rst
- Tonic supports neuromorphic/event datasets and transforms, including N-MNIST, where samples are events with x, y, time, and polarity fields: https://tonic.readthedocs.io/en/develop/getting_started/nmnist.html
- N-MNIST is an event-based version of MNIST and is available through Tonic's dataset API: https://tonic.readthedocs.io/en/develop/autoapi/tonic/datasets/nmnist/
- cocotb is an open-source Python co-simulation testbench framework for verifying VHDL/SystemVerilog RTL: https://docs.cocotb.org/en/stable/
- Verilator is an open-source SystemVerilog simulator/lint tool that compiles HDL into C++/SystemC simulation models: https://verilator.org/guide/latest/exe_verilator.html
- Yosys is an open-source RTL synthesis framework; it can support resource-estimation workflows when a target flow is available: https://yosyshq.net/yosys/documentation.html

## 3. Research Claim Boundary

### Claims allowed after the 40% prototype

The project may claim:

- A reproducible SNN software baseline exists for MNIST classification.
- The trained model can be converted to fixed-point weights.
- A Python digital twin can emulate the intended fixed-point LIF inference behavior.
- RTL-level neuron/synapse blocks can be simulated on PC without physical FPGA hardware.
- Accuracy, spike activity, quantization loss, simulated cycle count, and estimated throughput can be measured.

### Claims not allowed yet

The project must not claim:

- Actual FPGA power consumption, unless measured on a real FPGA board.
- Real FPGA timing closure, unless synthesized/place-and-routed for a specific FPGA.
- Real robot navigation capability, unless a navigation task, sensors, controller, and evaluation route are implemented.
- Patentable novelty, unless prior-art and patent searches show a specific technical difference.
- Superiority over published accelerators, unless benchmarks use comparable datasets, network sizes, precision, hardware assumptions, and metrics.

## 4. Recommended Final Architecture

### 4.1 System Layers

1. Dataset and input layer

   Use MNIST for the first prototype because it directly matches the synopsis and has stable public availability. Use N-MNIST only as an extension if event-native data is required.

2. Spike encoding layer

   Baseline: rate encoding of MNIST pixels into spike trains across `T` time steps.

   Extension: latency or time-to-first-spike encoding for lower spike count and lower simulated energy.

3. SNN inference layer

   Baseline network:

   - Input: 784 encoded pixel spike streams.
   - Hidden: one LIF dense layer, 100 to 256 neurons.
   - Output: 10 LIF neurons.
   - Readout: spike-count winner-take-all over the output layer.

   Reason: one hidden layer is small enough for a first FPGA-compatible architecture and large enough to show meaningful SNN behavior on MNIST.

4. Training layer

   Primary path: surrogate-gradient training in snnTorch.

   Secondary path: STDP only after the surrogate-gradient baseline is stable. STDP should not be the first training route because it adds research risk and may reduce classification accuracy without careful tuning.

5. Quantization layer

   Convert trained floating-point weights to signed fixed-point formats:

   - First candidate: Q1.7 or signed int8 for weights.
   - Membrane state: int16 or Q6.10-like range depending on observed membrane values.
   - Threshold and decay: fixed-point constants.

   Quantization must be evaluated by measuring accuracy drop from floating point to quantized simulation.

6. Digital twin layer

   Implement a Python/Numpy fixed-point simulator that uses the same integer equations intended for RTL:

   ```
   membrane[t+1] = leak * membrane[t] + weighted_spike_sum[t]
   spike[t+1] = membrane[t+1] >= threshold
   membrane[t+1] = reset_value after spike
   ```

   This becomes the golden model for RTL verification.

7. RTL simulation layer

   Implement minimal synthesizable Verilog/SystemVerilog modules:

   - LIF neuron core.
   - Synapse accumulator / weighted spike sum.
   - Output spike counter.
   - Top-level single-layer or time-multiplexed inference block.

   Verify using cocotb against the Python digital twin. Use Verilator or Icarus Verilog locally/Colab depending on compatibility.

8. FPGA mapping layer

   Until a physical FPGA is available, the work should stop at:

   - RTL simulation.
   - Linting.
   - Optional open-source synthesis estimates with Yosys for generic cell/resource trends.
   - Optional Vivado synthesis only if a target Xilinx part is selected and the tool is available.

## 5. Dataset Decision

### Use MNIST for the 40% prototype

MNIST is relevant for the current synopsis because the document explicitly names MNIST-like benchmark classification. It is also practical for Colab training, repeatable, and widely used for SNN baselines.

Limitations:

- MNIST is not event-native.
- MNIST does not prove reactive navigation.
- High MNIST accuracy alone is not a publishable contribution unless paired with hardware-aware design, quantization, or simulation evidence.

### Use N-MNIST for the research extension

N-MNIST is more relevant to event-driven SNN research because it contains event streams rather than static frames. It is useful after the MNIST pipeline works.

Limitations:

- It is still digit classification, not robot navigation.
- It may require event batching and time-bin preprocessing.

### If navigation data is required

A valid navigation dataset must include at least:

- Input stream: event camera, frame camera, lidar, ultrasonic, or simulated sensor stream.
- Output label/control: steering class, obstacle-avoidance command, velocity command, or reactive action.
- Timing: timestamps sufficient to evaluate latency.
- Evaluation environment: routes, obstacles, or simulated scenarios.

Possible data paths:

- Simulated collection: Webots, Gazebo/Ignition, CARLA, or a simple grid/maze simulator with event-like frame-difference encoding.
- Physical collection later: low-cost robot with camera/ultrasonic sensors, synchronized action labels.
- Synthetic event conversion: convert frame sequences into event-like deltas, but clearly label this as synthetic, not neuromorphic sensor data.

For the first 40% prototype, navigation should be treated as future work unless such data exists.

## 6. Definition Of A Valid 40% Working Prototype

A 40% prototype should be considered complete only when all of the following are demonstrated:

1. Reproducible training notebook

   - Runs in Google Colab.
   - Downloads MNIST through a standard library.
   - Trains an SNN with LIF neurons.
   - Saves model weights and configuration.

2. Baseline metrics

   Minimum acceptable display metrics:

   - Test accuracy reported on the MNIST test set.
   - Confusion matrix.
   - Average output spike count per sample.
   - Number of time steps.
   - Parameter count.

   Target range for a credible demo:

   - Floating-point SNN accuracy: at least 90% on MNIST for first demo.
   - Quantized digital twin accuracy: no more than 3 to 5 percentage points below floating-point baseline.

   These are prototype targets, not paper claims.

3. Quantized inference path

   - Export weights to int8 or fixed-point arrays.
   - Run a Python fixed-point digital twin.
   - Compare floating-point SNN predictions vs fixed-point predictions.

4. PC-based FPGA digital twin

   - Simulate the same LIF update equation planned for RTL.
   - Produce cycle estimates:
     - cycles per time step,
     - cycles per inference,
     - estimated inferences per second for assumed clock rates.
   - Clearly label throughput as simulated/estimated.

5. RTL proof block

   - At least one LIF neuron module or small neuron array implemented in Verilog/SystemVerilog.
   - Testbench compares RTL outputs against Python digital twin for fixed input vectors.
   - Waveform or logged pass/fail result available.

6. Demo interface

   - A simple notebook or lightweight local UI where a user selects/draws an MNIST-like digit and sees:
     - encoded spikes,
     - predicted class,
     - output spike counts,
     - quantized/digital-twin prediction,
     - simulated latency estimate.

## 7. Metrics And Benchmarks

### Model metrics

- Test accuracy.
- Confusion matrix.
- Per-class accuracy.
- Spike count per layer per sample.
- Accuracy vs time steps.
- Accuracy vs weight precision.
- Quantization accuracy drop.

### Hardware simulation metrics

- Estimated cycles per inference.
- Estimated latency:

  ```
  latency_ms = cycles_per_inference / clock_hz * 1000
  ```

- Estimated throughput:

  ```
  inferences_per_second = clock_hz / cycles_per_inference
  ```

- Memory footprint:

  ```
  weight_bits = number_of_weights * bits_per_weight
  state_bits = number_of_neurons * bits_per_state
  ```

- RTL module pass/fail against golden model.
- Optional synthesized estimates:
  - LUTs,
  - flip-flops,
  - BRAM,
  - DSP blocks.

### Fair comparison rules

Compare only against papers or implementations that disclose:

- Dataset.
- Network size.
- Time steps.
- Precision.
- FPGA family or simulation assumptions.
- Accuracy.
- Latency/throughput/resource metrics.

If any field is missing, mark the comparison as partial.

## 8. Execution Plan For GPT Astra

### Phase 0 - Evidence lock

Inputs:

- Provided synopsis PDF.
- Public dataset/tool documentation.
- Literature spreadsheet.

Outputs:

- Requirement traceability table.
- Claim boundary table.
- Dataset decision note.

Decision gate:

- No implementation begins until every planned claim is classified as measured, estimated, literature-supported, or future work.

### Phase 1 - Baseline SNN training

Tasks:

- Build Colab notebook using PyTorch and snnTorch.
- Train MNIST LIF SNN.
- Log accuracy, loss, spike counts, and configuration.
- Save weights.

Outputs:

- `01_snn_mnist_training_colab.ipynb`
- `model_float.pt`
- `metrics_float.json`

Decision gate:

- Continue only if test accuracy reaches at least 90%, or document why the architecture failed.

### Phase 2 - Quantization and digital twin

Tasks:

- Export weights to fixed-point.
- Implement integer LIF simulator.
- Compare floating-point vs quantized predictions.
- Sweep bit widths and time steps.

Outputs:

- `weights_int8.npz`
- `metrics_quantized.json`
- bit-width comparison table.

Decision gate:

- Continue if quantized accuracy drop is within 3 to 5 percentage points for the demo model.

### Phase 3 - RTL block simulation

Tasks:

- Implement LIF neuron core.
- Implement small synapse accumulator.
- Generate deterministic test vectors from Python.
- Verify with cocotb/Verilator or Icarus Verilog.

Outputs:

- RTL source files.
- test vectors.
- pass/fail verification logs.
- optional waveforms.

Decision gate:

- Continue only if RTL output matches the Python digital twin on fixed test vectors.

### Phase 4 - System-level architecture estimate

Tasks:

- Estimate memory, cycles, and throughput for time-multiplexed architecture.
- Optionally run synthesis estimates with Yosys or vendor tools if available.
- Build comparison table against prior work.

Outputs:

- architecture diagram.
- resource/latency estimate sheet.
- benchmark table.

Decision gate:

- Claims remain "estimated" until physical FPGA or target synthesis data exists.

### Phase 5 - 40% demonstration

Tasks:

- Create a notebook or small UI demo.
- Show input image, spike encoding, prediction, spike counts, quantized prediction, and simulated latency.
- Include "what is real vs simulated" notes.

Outputs:

- demo notebook/UI.
- final progress report.
- presentation slides.

## 9. Publication Path

For a credible research paper, the likely publishable angle should be one of:

- Hardware-aware SNN quantization and digital-twin verification flow for FPGA deployment.
- Low-cost time-multiplexed LIF architecture for small SNN inference.
- Comparative study of rate vs temporal encoding under fixed-point FPGA constraints.
- PC-only reproducible methodology for pre-FPGA validation of SNN accelerators.

The project should not rely on "SNN on FPGA for MNIST" alone as novelty. That topic has existing prior work. The contribution must be sharper: quantization method, architecture trade-off, digital-twin validation workflow, or navigation-oriented extension.

## 10. Immediate Next Implementation Checklist

- Run the training notebook on Colab.
- Record floating-point MNIST accuracy.
- Export weights and metrics.
- Run fixed-point digital twin.
- Decide exact fixed-point formats from observed value ranges.
- Generate RTL test vectors.
- Implement and simulate LIF neuron RTL.
- Build a one-page metrics dashboard for the 40% demo.

