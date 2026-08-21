# Sirony Module Standard (SMS)

**Version:** 0.1 draft
**Status:** Working draft — defines how any manufacturer builds an SPHL-compatible module
**Date:** 21 August 2026

---

## 1. Purpose

The Sirony Module Standard lets researchers, universities and manufacturers
build hardware modules that the free SPHL app recognizes automatically —
without modifying the core app. Certification is what separates a
*compatible* module from a *Certified Measurement* module.

## 2. Certification tiers

| Tier | Label in app | Requirements |
|---|---|---|
| **T0 — Experimental** | "Experimental — not for medical use" | Implements the protocol; self-declared |
| **T1 — Verified** | "Verified signal" | Passes Sirony bench tests: signal fidelity, calibration stability, electrical safety, secure identity |
| **T2 — Certified Measurement** | "Certified Measurement" | T1 + clinical validation against reference method + regulatory clearance for the intended use and market |

The app always displays the tier with the measurement. Tier is enforced
cryptographically (see §6), not by trusting the module's self-description.

## 3. Physical + transport layer

Modules connect via one of:

- **USB-C** (data + power; preferred for the Analysis Dock)
- **BLE** (GATT profile below; battery-powered modules)

## 4. Discovery and identity

Every module carries a **Module Descriptor** (signed, read-only):

```json
{
  "sms_version": "0.1",
  "vendor_id": "0x5352",
  "vendor_name": "Sirony",
  "product_id": "0x0001",
  "product_name": "SPHL Cardio Kit",
  "serial": "SPHL-C-000123",
  "hw_revision": "A2",
  "fw_version": "1.4.0",
  "tier": "T2",
  "capabilities": ["ecg_1lead", "ppg_red_ir", "spo2", "skin_temp"],
  "calibration": {
    "last_calibrated": "2026-06-01",
    "valid_until": "2027-06-01",
    "cert_ref": "CAL-2026-0456"
  },
  "certificate": "<X.509 chain rooted at Sirony Module CA>"
}
```

Rules:

- `capabilities` values come from the **SPHL Capability Registry** (a
  published, versioned list). Unknown capabilities load as T0.
- The app verifies the certificate chain before granting T1/T2 labeling.
- Expired calibration automatically downgrades the display label.

## 5. Data contract

Modules stream **raw signals + metadata**; interpretation happens on the
phone/AI side. Every sample stream declares:

```json
{
  "stream": "ecg_1lead",
  "sample_rate_hz": 250,
  "resolution_bits": 24,
  "units": "uV",
  "t0_sync": "phone_monotonic_ns",
  "lead_config": "I",
  "quality_channels": ["lead_off", "saturation"]
}
```

Requirements:

- Timestamps synchronized to phone monotonic clock (≤ 5 ms skew) so
  multi-sensor fusion (e.g. ECG+PPG pulse transit time) is possible.
- Every stream must include at least one hardware quality channel
  (lead-off, saturation, contact detection…).
- Raw signal must be exportable — no interpretation-only modules.

Each derived measurement produced from a module stream conforms to
[specs/measurement-schema.json](../specs/measurement-schema.json),
including evidence class (A/B/C), tier, signal quality and confidence.

## 6. Security requirements

- Signed firmware; secure OTA update path
- Per-device key pair provisioned at manufacture; identity attestation on connect
- Encrypted BLE (LE Secure Connections) / authenticated USB session
- No module may request phone data — the data flow is module → app only

## 7. Certification test battery (T1)

1. **Signal fidelity** — against calibrated simulators (ECG simulator, SpO₂ tester, blackbody source, reference solutions per capability)
2. **Calibration stability** — drift across temperature, humidity, battery level, 12-month accelerated aging
3. **Electrical safety** — applicable IEC 60601-1 requirements for body-contact parts
4. **Interoperability** — protocol conformance suite (published, automated)
5. **Security audit** — identity, firmware signing, communications

## 8. Clinical validation (T2)

Per capability, versus accepted reference methods, across the diversity
matrix in blueprint §35 (age, sex, skin tone, BMI, perfusion, devices,
environment). Intended use, target market regulatory clearance (CDSCO,
FDA, CE… as applicable) and post-market surveillance plan are required.

## 9. Governance

- Registry, conformance suite and this standard are published openly.
- Sirony runs the Module CA and the certification lab (or accredits labs).
- Standard is versioned; modules declare `sms_version`; the app maintains
  backward compatibility within a major version.

## 10. Open questions (to resolve before v0.2)

- [ ] Fee structure for third-party certification
- [ ] Whether T0 experimental modules are allowed in release builds or dev-mode only
- [ ] Cartridge (consumable) identity: per-lot barcode + dock attestation vs per-cartridge crypto
- [ ] Reference implementation hardware (open-source dev kit) scope
