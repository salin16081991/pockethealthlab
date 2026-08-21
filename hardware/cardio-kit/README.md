# SPHL Cardio Kit — Prototype A

**Status:** Phase A (breadboard prototype, tier T0 Experimental)
**Goal:** ECG + PPG/SpO₂ + skin temperature streaming to the SPHL app over BLE,
implementing the [Sirony Module Standard](../../docs/02-sphl-module-standard.md).

> ⚠️ **SAFETY — read before touching electrodes**
> This is an experimental, non-certified device (T0). It must be powered ONLY
> from its own battery or a power bank during any measurement with body
> contact. **NEVER attach ECG electrodes while the circuit is connected to a
> mains-powered laptop or charger.** The AD8232 is a low-voltage instrument
> front end, but mains leakage through a charger is a real electrocution
> hazard. Battery power only. No exceptions.

## Three build phases

| Phase | What | Time |
|---|---|---|
| **A — Breadboard** | Off-the-shelf breakout boards + ESP32, jumper wires | a weekend |
| **B — Perfboard + enclosure** | Same circuit soldered, 3D-printed case, LiPo battery | 1–2 weeks |
| **C — Custom PCB** | Dedicated PCB (KiCad), better AFE (ADS1292R), nRF52840, production path | after A/B validates |

## Architecture (Phase A)

```text
 3× ECG electrode cable        finger clip / sensor window
        │                              │
   [AD8232 ECG AFE] ──analog──┐   [MAX30102 PPG red+IR] ──I2C──┐
        │ LO+/LO- lead-off    │                                │
        └────digital──────────┤   [MAX30205 skin temp] ──I2C───┤
                              │                                │
                        [ESP32-S3 DevKit]
                              │  ADC 250 Hz (ECG)
                              │  I2C 50 Hz (PPG), 1 Hz (temp)
                              │
                         BLE GATT (SPHL Cardio service)
                              │
                    Phone → SPHL app module console
                    https://pockethealthlab.sirony.in/module.html
                    (Web Bluetooth: Android Chrome / desktop Chrome)
```

## Firmware

[`firmware/sphl_cardio/sphl_cardio.ino`](firmware/sphl_cardio/sphl_cardio.ino) —
Arduino IDE, board package "esp32 by Espressif". No external libraries
(uses built-in `Wire` and `BLEDevice`). Flash, open the module console,
tap Connect.

BLE protocol: [`../../docs/03-cardio-kit-gatt.md`](../../docs/03-cardio-kit-gatt.md)

## Wiring

See [WIRING.md](WIRING.md). Shopping list: [BOM.md](BOM.md).

## Electrode placement (single-lead prototype)

3-snap cable on the AD8232:
- **RA (red/right)** — right collarbone area or right wrist
- **LA (yellow/left)** — left collarbone area or left wrist
- **RL (green/leg)** — right lower rib or right ankle (reference)

Gel snap electrodes give a far cleaner trace than dry contact.

## What "done" means for Phase A (blueprint §61)

- [ ] ECG trace visibly shows QRS complexes on the module console
- [ ] Lead-off detection works (removing an electrode is flagged)
- [ ] PPG red/IR values pulse with the finger on the sensor
- [ ] Temperature reads ±0.3 °C against a reference thermometer
- [ ] 10 minutes of streaming without BLE drops
- [ ] Raw signals exportable from the console

Then: validate HR against the Apple Watch / a reference pulse oximeter,
and only after that discuss SpO₂ math (ratio-of-ratios needs calibration —
the module streams raw red/IR; the app must NOT display an SpO₂ % until
calibrated against a reference oximeter).
