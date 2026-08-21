# Sirony Pocket Health Lab (SPHL)

> **Sirony Pocket Health Lab turns a smartphone into a modular personal
> health measurement platform** — free core app, phone-native sensing,
> certified hardware modules, and an AI engine that interprets validated
> measurements against your personal baseline.

**Live prototype:** https://pockethealthlab.sirony.in
**Company:** Sirony LLP · **Status:** Phase 1 (phone-only MVP) in progress

---

## Repository layout

| Path | Contents |
|---|---|
| [docs/00-master-blueprint-v1.md](docs/00-master-blueprint-v1.md) | Full v1 product/tech/clinical/commercial blueprint (69 sections) |
| [docs/01-open-access-model.md](docs/01-open-access-model.md) | v2 strategy: free SPHL Core + certified modules + Analysis Dock + AI stack |
| [docs/02-sphl-module-standard.md](docs/02-sphl-module-standard.md) | Sirony Module Standard v0.1 draft — how third parties build certified modules |
| [specs/measurement-schema.json](specs/measurement-schema.json) | Canonical measurement record (evidence class, tier, quality, confidence) |
| [prototypes/sphl-core-web/](prototypes/sphl-core-web/) | Working camera-PPG heart-rate prototype (single-file web app) |

## The three products (blueprint §63)

1. **Product A — SPHL App**: phone-native measurements, free for everyone
2. **Product B — SPHL Cardio**: ECG + PPG + SpO₂ + temperature module
3. **Product C — SPHL Lab**: Analysis Dock + disposable biochemical cartridges

All three share one app and one health-data engine.

## Prototype: SPHL Core Web (v0.1)

First item of the Phase 1 MVP: **camera PPG → heart rate + HRV**, with
signal-quality gating, conservative interpretation and a personal baseline —
the full measurement philosophy of the blueprint in miniature:

- Finger over rear camera + flash → red-channel pulse waveform
- Band-pass filtering, peak detection, median-IBI heart rate, RMSSD
- Signal quality score; poor-quality results are **rejected, not displayed**
- Personal baseline forms after 3 good measurements; deviations compared to *your* normal
- Every stored record carries evidence class (B), tier (T0), quality, confidence, algorithm version
- All data stays on-device (localStorage)

Run locally:

```bash
python3 -m http.server 8000 --directory prototypes/sphl-core-web
```

Then open http://localhost:8000. On a phone, use the deployed HTTPS site —
browsers only allow camera access over HTTPS.

> ⚠️ **Experimental — not a medical device.** For research and development
> only. See blueprint §2.4 and §26 for the safety architecture.

## Deployment

The prototype is served by GitHub Pages from the `gh-pages` branch at the
custom domain `pockethealthlab.sirony.in` (CNAME → `salin16081991.github.io`).

## Development rules (blueprint §58)

1. Never claim a measurement before proving the measurement.
2. Never use AI to hide poor sensor quality.
3. Never train and test on overlapping patient data.
4. Always compare against a reference standard.
5. Validate across diverse populations.
6. Store algorithm versions.
7. Treat uncertainty as first-class data.
8. Design regulatory requirements before commercialization.
9. Start narrow.
10. Build the architecture so additional tests can be added later.
