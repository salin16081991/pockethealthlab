# Cardio Kit Phase A — Wiring

All modules run at **3.3 V**. Never feed 5 V to the AD8232 or MAX30102 breakouts'
3.3 V pins (some breakouts have onboard regulators — check yours).

## AD8232 (ECG) → ESP32-S3

| AD8232 pin | ESP32-S3 pin |
|---|---|
| 3.3V | 3V3 |
| GND | GND |
| OUTPUT | GPIO 4 (ADC1_CH3) |
| LO+ | GPIO 5 |
| LO- | GPIO 6 |
| SDN | 3V3 (always on) |

(Classic ESP32 DevKit V1: OUTPUT→GPIO34, LO+→GPIO32, LO-→GPIO33.)

## MAX30102 (PPG) and MAX30205 (temp) → ESP32-S3 (shared I2C bus)

| Module pin | ESP32-S3 pin |
|---|---|
| VIN / VCC | 3V3 |
| GND | GND |
| SDA | GPIO 8 |
| SCL | GPIO 9 |

(Classic ESP32: SDA→GPIO21, SCL→GPIO22 — the firmware auto-selects the
default Wire pins for your board.)

I2C addresses: MAX30102 = 0x57, MAX30205 = 0x48 (A0/A1/A2 low). They coexist
on one bus.

## Power

- Flashing/debug: USB from laptop, **no electrodes attached**.
- Measuring: USB **power bank** only (Phase A) or LiPo (Phase B).

## Sanity checks before first ECG

1. Power on → module console shows temperature changing when you touch MAX30205.
2. Finger on MAX30102 → red glow visible, PPG numbers pulse.
3. Only then attach electrodes (battery power!) → QRS spikes on the trace.
