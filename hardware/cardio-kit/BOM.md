# Cardio Kit Phase A — Bill of Materials (India sourcing)

Approximate prices, Aug 2026. Sources: robu.in, electronicscomp.com, amazon.in.

| # | Part | Purpose | Approx ₹ |
|---|---|---|---|
| 1 | **ESP32-S3 DevKitC** (or ESP32 DevKit V1) | MCU + BLE | 600–900 |
| 2 | **AD8232 ECG module** (SparkFun-style breakout with 3.5 mm jack) | Single-lead ECG front end | 350–700 |
| 3 | **3-electrode ECG cable** (3.5 mm jack, snap connectors) — usually bundled with #2 | Electrode leads | 150–300 |
| 4 | **Gel snap ECG electrodes**, pack of 50 | Skin contact | 250–450 |
| 5 | **MAX30102 module** | PPG red+IR (SpO₂-class optics) | 250–450 |
| 6 | **MAX30205 module** | Clinical-grade skin temp (±0.1 °C) | 350–600 |
| 7 | Breadboard (full size) + jumper wires (M-M, M-F) | Assembly | 250–400 |
| 8 | **Power bank** (any small USB one you already own) | SAFE isolated power | 0 |
| 9 | (Phase B) LiPo 3.7 V 1000 mAh + TP4056 charge board + slide switch | Portable power | 350–500 |
| 10 | (Phase B) Project box or 3D-printed enclosure | Case | 200–400 |

**Phase A total: roughly ₹1,800–3,200.**

Notes:
- If MAX30205 is hard to find, an **MLX90614** IR temp module (~₹500) works;
  firmware has a build flag for it.
- Buy 2× of the AD8232 and MAX30102 — breakouts are occasionally DOA.
- For Phase C (custom PCB): TI **ADS1292R** (2-ch ECG + respiration impedance),
  **MAX32664/MAX86141** optical AFE, **nRF52840** — that's the certifiable path,
  do not start there.
