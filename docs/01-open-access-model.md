# SPHL Open Access Model (v2 Strategy)

**Status:** Adopted strategic direction — supersedes the pure-product framing in the v1 blueprint
**Date:** 21 August 2026
**Owner:** Sirony LLP

---

## 1. The core decision

SPHL is split into two clearly separated halves:

| Half | Access | Quality control |
|---|---|---|
| **SPHL Core** (software platform) | Open / free for everyone | Open protocols, open measurement standards |
| **SPHL Certified Modules** (hardware) | Sold by Sirony and third parties | Strict certification: technical, calibration, safety, clinical validation |

The software platform stays globally accessible; anything that makes a medical
measurement passes through a certification gate before the app labels it a
**Certified Measurement**.

## 2. Free for everyone

- SPHL mobile application
- Phone-only measurements (camera PPG, respiratory acoustics, voice, motion/gait/tremor, skin/wound/eye imaging)
- Personal health dashboard
- Longitudinal health record
- Basic AI analysis (signal quality, baseline, trend deviation)
- Standard measurement protocols
- Data export
- Emergency/SOS integration
- Community/research features

## 3. Optional hardware modules

The same free app recognizes whichever module is connected.

| Module | Measurements |
|---|---|
| ❤️ Cardio Kit | ECG + PPG + SpO₂ + temperature |
| 🫁 Respiratory Kit | Lung/airflow + acoustic analysis |
| 🩸 Blood Kit | Glucose, Hb, ketones, lactate, etc. |
| 🧪 Lab Kit | Multi-analyte cartridge |
| 👁️ Eye Kit | Magnification + controlled illumination |
| 🌡️ Thermal Kit | IR/thermal measurements |
| 🩹 Skin/Wound Kit | Calibrated imaging |
| 🧠 Neuro Kit | Tremor, gait, reaction, neurological testing |
| 🫀 Advanced Cardio Kit | Multi-lead ECG + vascular measurements |

## 4. Platform architecture

```text
                 SIRONY POCKET HEALTH LAB
                           │
                    FREE CORE APP
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   PHONE SENSORS      SIRONY MODULES     THIRD-PARTY MODULES
        │                  │                  │
     Camera             Cardio             Future
     Microphone         Respiratory        certified
     Motion             Blood              modules
     GPS                Thermal
     Depth              Eye
        │                  │
        └──────────────────┼──────────────────┘
                           │
                    SENSOR FUSION
                           │
                     AI HEALTH ENGINE
                           │
              PERSONAL HEALTH PROFILE
```

## 5. Flagship hardware: the SPHL Analysis Dock

Instead of manufacturing a separate device for every test, the flagship
hardware is a **universal Analysis Dock** — one platform, many cartridges
and attachments.

Dock contents:

- USB-C interface + BLE
- Optical detector / photodiode
- Controlled LEDs
- ECG interface
- Temperature sensor
- Electrical measurement interface
- Cartridge reader
- Calibration system
- Secure module identification

Configurations:

```text
Dock + ECG electrodes      → ECG
Dock + SpO₂ finger clip    → SpO₂
Dock + blood cartridge     → glucose / Hb / etc.
Dock + mouthpiece          → respiratory analysis
Dock + optical attachment  → eye / skin analysis
```

This is a much stronger long-term architecture than a collection of
unrelated gadgets: one certified analog front end, one calibration story,
one secure identity system, many cheap attachments.

## 6. The Sirony Module Standard

Publish an open standard (see [02-sphl-module-standard.md](02-sphl-module-standard.md)):
any manufacturer can build a compatible SPHL module, but it must pass
Sirony's technical, calibration, safety and validation requirements before
the app grants it **Certified Measurement** status.

Design consequence: researchers, universities and manufacturers can create
new modules **without modifying the core app**. This is the most powerful
part of the idea — SPHL becomes an Android-like ecosystem for portable
health sensing, not another health app.

## 7. Where AI fits

| Layer | AI role |
|---|---|
| 📷 Camera | PPG, skin, wound, eye analysis |
| ❤️ ECG | Rhythm classification, waveform analysis, anomaly detection |
| 🩸 PPG | HR, HRV, pulse morphology, research BP estimation |
| 🫁 Microphone | Cough, breathing, wheeze, respiratory patterns |
| 🎙️ Voice | Voice biomarkers and longitudinal changes |
| 🧍 Motion | Gait, tremor, balance, falls |
| 🧪 Lab cartridges | Interpret optical/electrochemical assay signals |
| 🧠 Sensor fusion | Combine multiple measurements |
| 📊 Longitudinal AI | Detect deviations from the person's baseline |
| 🚨 Risk engine | Decide when to repeat or escalate a measurement |
| 🤖 Health assistant | Explain results in understandable language |

Not one giant model — a **Sirony Health AI stack**:

```text
                 SIRONY HEALTH AI
                       │
          ┌────────────┴────────────┐
          │                         │
   SENSOR AI MODELS          CLINICAL AI MODELS
   (ECG, PPG, Vision,        (Cardiac, Respiratory,
    Voice, Motion)            Metabolic, Neurological)
          │                         │
          └────────────┬────────────┘
                       │
                 SENSOR FUSION AI
                       │
               PERSONAL BASELINE
                       │
              LONGITUDINAL AI
                       │
                RISK ENGINE
                       │
              HEALTH ASSISTANT
```

### Worked example

A 3-minute SPHL assessment returns: ECG normal-morphology, HR 91, HRV
decreased from baseline, SpO₂ 94%, respiratory rate increased, temperature
slightly elevated, cough detected, activity substantially reduced.

Individually these numbers mean little. The multimodal engine reports:

> "Several measurements have deviated from your normal baseline.
> Measurement quality is good. Repeat the assessment and consider medical
> evaluation if symptoms are present or the deviation persists."

That is more useful than showing seven numbers — and it stays inside the
safety architecture (deviation + recommendation, never diagnosis).

### Plug-and-play intelligence

When a new module connects:

```text
AI detects module → identifies sensor → calibrates → validates signal
→ runs appropriate model → adds measurement to health profile
```

## 8. The hard limit

**AI interprets and integrates validated measurements. It never invents
measurements the hardware cannot capture.** Every AI output carries
uncertainty, and every medically-used output needs validation and
regulatory classification (see blueprint §4 evidence classes, §25, §36).
