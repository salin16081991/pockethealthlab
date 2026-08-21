# SPHL Cardio Kit — BLE GATT Profile v0.1

Implements the Sirony Module Standard (SMS) v0.1 transport for the Cardio Kit
at tier **T0 Experimental**. All values little-endian.

## Advertising

- Device name: `SPHL-CARDIO`
- Advertised service: `a5b40001-9b1b-4b6e-8f6a-535048434b00`

## Service `a5b40001-9b1b-4b6e-8f6a-535048434b00` — SPHL Cardio

| Characteristic | UUID (`a5b4xxxx-9b1b-4b6e-8f6a-535048434b00`) | Props | Payload |
|---|---|---|---|
| Module Descriptor | `0002` | Read | UTF-8 JSON (SMS descriptor, chunk ≤ 512 B) |
| ECG Stream | `0003` | Notify | `uint16 seq` + 8 × `int16` ADC samples @ 250 Hz |
| PPG Stream | `0004` | Notify | `uint16 seq` + `uint32 red` + `uint32 ir` (latest, 10 Hz) |
| Temperature | `0005` | Notify | `int16` = °C × 100 (1 Hz) |
| Status | `0006` | Notify | `uint8` bitfield: b0 = ECG lead-off, b1 = PPG finger absent |

### ECG Stream

- 250 Hz sampling, 12-bit ADC (0–4095), centered ~2048.
- 8 samples per notification → ~31 notifications/s, 18-byte payload (fits the
  default 23-byte MTU; larger MTU is negotiated when available).
- `seq` increments per packet; gaps = dropped packets (app must surface this
  as a signal-quality event, not silently interpolate).

### PPG Stream

- MAX30102 in SpO₂ mode (red + IR), 50 Hz internally; the notification carries
  the most recent sample pair at 10 Hz — enough for waveform display and HR.
  Full-rate FIFO streaming is a Phase B upgrade.
- **The app must not compute or display SpO₂ % from these values until a
  calibration against a reference oximeter exists** (ratio-of-ratios constants
  are device-specific). Display raw waveforms and HR only.

### Module Descriptor (example)

```json
{
  "sms_version": "0.1",
  "vendor_name": "Sirony",
  "product_name": "SPHL Cardio Kit ProtoA",
  "serial": "PROTO-A-001",
  "fw_version": "0.1.0",
  "tier": "T0",
  "capabilities": ["ecg_1lead", "ppg_red_ir", "skin_temp"]
}
```

T0 = the app labels every derived value "Experimental — not for medical use".
Certificate chain fields are omitted at T0; they become mandatory at T1.

## Client (app) behaviour

1. Scan for the service UUID or name prefix `SPHL`.
2. Read descriptor → verify `sms_version`, show tier badge.
3. Subscribe to Status, ECG, PPG, Temperature.
4. Timestamp packets on arrival against `seq` for gap detection.
5. On lead-off / finger-absent status bits: pause interpretation, guide user.

Reference client: `/module.html` on the SPHL web app (Web Bluetooth — works in
Chrome on Android and desktop; iOS Safari has no Web Bluetooth, which is one
more reason the native app track exists).
