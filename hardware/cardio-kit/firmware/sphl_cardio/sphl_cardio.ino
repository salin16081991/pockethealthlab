/*
 * SPHL Cardio Kit — Phase A firmware v0.1.0
 * ESP32 / ESP32-S3 + AD8232 (ECG) + MAX30102 (PPG) + MAX30205 (temp)
 *
 * Implements the SPHL Cardio BLE GATT profile v0.1
 * (docs/03-cardio-kit-gatt.md). Tier T0 Experimental.
 *
 * Board package: "esp32 by Espressif Systems" (Arduino IDE).
 * No external libraries required (Wire + BLE are bundled).
 *
 * SAFETY: battery / power-bank power ONLY while electrodes are attached.
 */

#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ---------------- pins ----------------
#if CONFIG_IDF_TARGET_ESP32S3
  #define PIN_ECG_OUT 4
  #define PIN_LO_PLUS 5
  #define PIN_LO_MINUS 6
  #define PIN_SDA 8
  #define PIN_SCL 9
#else  // classic ESP32 DevKit V1
  #define PIN_ECG_OUT 34
  #define PIN_LO_PLUS 32
  #define PIN_LO_MINUS 33
  #define PIN_SDA 21
  #define PIN_SCL 22
#endif

// Set to 1 if using MLX90614 IR thermometer instead of MAX30205
#define USE_MLX90614 0

// ---------------- I2C addresses ----------------
#define ADDR_MAX30102 0x57
#define ADDR_MAX30205 0x48
#define ADDR_MLX90614 0x5A

// ---------------- BLE UUIDs (GATT profile v0.1) ----------------
#define UUID_SVC   "a5b40001-9b1b-4b6e-8f6a-535048434b00"
#define UUID_DESC  "a5b40002-9b1b-4b6e-8f6a-535048434b00"
#define UUID_ECG   "a5b40003-9b1b-4b6e-8f6a-535048434b00"
#define UUID_PPG   "a5b40004-9b1b-4b6e-8f6a-535048434b00"
#define UUID_TEMP  "a5b40005-9b1b-4b6e-8f6a-535048434b00"
#define UUID_STAT  "a5b40006-9b1b-4b6e-8f6a-535048434b00"

static const char MODULE_DESCRIPTOR[] =
  "{\"sms_version\":\"0.1\",\"vendor_name\":\"Sirony\","
  "\"product_name\":\"SPHL Cardio Kit ProtoA\",\"serial\":\"PROTO-A-001\","
  "\"fw_version\":\"0.1.0\",\"tier\":\"T0\","
  "\"capabilities\":[\"ecg_1lead\",\"ppg_red_ir\",\"skin_temp\"]}";

// ---------------- state ----------------
BLECharacteristic *chEcg, *chPpg, *chTemp, *chStat;
volatile bool clientConnected = false;

// ECG: 250 Hz timer sampling into a small ring, notify every 8 samples
hw_timer_t *ecgTimer = nullptr;
volatile int16_t ecgBuf[8];
volatile uint8_t ecgFill = 0;
volatile bool ecgReady = false;
int16_t ecgOut[8];
uint16_t ecgSeq = 0, ppgSeq = 0;

bool max30102ok = false, tempok = false;

// ---------------- I2C helpers ----------------
bool i2cWrite(uint8_t addr, uint8_t reg, uint8_t val) {
  Wire.beginTransmission(addr);
  Wire.write(reg); Wire.write(val);
  return Wire.endTransmission() == 0;
}
int i2cReadBytes(uint8_t addr, uint8_t reg, uint8_t *buf, uint8_t n) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return -1;
  uint8_t got = Wire.requestFrom(addr, n);
  for (uint8_t i = 0; i < got; i++) buf[i] = Wire.read();
  return got;
}

// ---------------- MAX30102 (minimal driver) ----------------
bool max30102Init() {
  uint8_t part;
  if (i2cReadBytes(ADDR_MAX30102, 0xFF, &part, 1) != 1 || part != 0x15) return false;
  i2cWrite(ADDR_MAX30102, 0x09, 0x40);          // reset
  delay(50);
  i2cWrite(ADDR_MAX30102, 0x08, 0x4F);          // FIFO: avg 4, rollover, almost-full 15
  i2cWrite(ADDR_MAX30102, 0x09, 0x03);          // mode: SpO2 (red + IR)
  i2cWrite(ADDR_MAX30102, 0x0A, 0x27);          // SPO2: 4096 nA range, 100 Hz, 411 us
  i2cWrite(ADDR_MAX30102, 0x0C, 0x24);          // red LED ~7 mA
  i2cWrite(ADDR_MAX30102, 0x0D, 0x24);          // IR LED ~7 mA
  i2cWrite(ADDR_MAX30102, 0x04, 0x00);          // FIFO write ptr
  i2cWrite(ADDR_MAX30102, 0x05, 0x00);          // overflow
  i2cWrite(ADDR_MAX30102, 0x06, 0x00);          // FIFO read ptr
  return true;
}
bool max30102Read(uint32_t &red, uint32_t &ir) {
  uint8_t b[6];
  if (i2cReadBytes(ADDR_MAX30102, 0x07, b, 6) != 6) return false;
  red = ((uint32_t)(b[0] & 0x03) << 16) | ((uint32_t)b[1] << 8) | b[2];
  ir  = ((uint32_t)(b[3] & 0x03) << 16) | ((uint32_t)b[4] << 8) | b[5];
  return true;
}

// ---------------- temperature ----------------
bool tempInit() {
#if USE_MLX90614
  uint8_t b[3];
  return i2cReadBytes(ADDR_MLX90614, 0x07, b, 3) == 3;
#else
  uint8_t b[2];
  return i2cReadBytes(ADDR_MAX30205, 0x00, b, 2) == 2;
#endif
}
// returns °C ×100, or INT16_MIN on failure
int16_t tempReadC100() {
#if USE_MLX90614
  uint8_t b[3];
  if (i2cReadBytes(ADDR_MLX90614, 0x07, b, 3) != 3) return INT16_MIN;
  uint16_t raw = ((uint16_t)b[1] << 8) | b[0];
  float c = raw * 0.02f - 273.15f;
  return (int16_t)(c * 100.0f);
#else
  uint8_t b[2];
  if (i2cReadBytes(ADDR_MAX30205, 0x00, b, 2) != 2) return INT16_MIN;
  int16_t raw = ((int16_t)b[0] << 8) | b[1];
  return (int16_t)((raw / 256.0f) * 100.0f);
#endif
}

// ---------------- ECG timer ISR (250 Hz) ----------------
void IRAM_ATTR onEcgTimer() {
  if (ecgReady) return;                    // previous batch not consumed yet
  ecgBuf[ecgFill++] = (int16_t)analogRead(PIN_ECG_OUT);
  if (ecgFill >= 8) { ecgFill = 0; ecgReady = true; }
}

// ---------------- BLE callbacks ----------------
class SrvCb : public BLEServerCallbacks {
  void onConnect(BLEServer *s) override { clientConnected = true; }
  void onDisconnect(BLEServer *s) override {
    clientConnected = false;
    s->getAdvertising()->start();
  }
};

// ---------------- setup ----------------
void setup() {
  Serial.begin(115200);
  pinMode(PIN_LO_PLUS, INPUT);
  pinMode(PIN_LO_MINUS, INPUT);
  analogReadResolution(12);

  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(400000);
  max30102ok = max30102Init();
  tempok = tempInit();
  Serial.printf("MAX30102: %s  TEMP: %s\n",
    max30102ok ? "ok" : "MISSING", tempok ? "ok" : "MISSING");

  BLEDevice::init("SPHL-CARDIO");
  BLEDevice::setMTU(64);
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new SrvCb());
  BLEService *svc = server->createService(UUID_SVC);

  BLECharacteristic *chDesc = svc->createCharacteristic(
    UUID_DESC, BLECharacteristic::PROPERTY_READ);
  chDesc->setValue((uint8_t*)MODULE_DESCRIPTOR, strlen(MODULE_DESCRIPTOR));

  chEcg = svc->createCharacteristic(UUID_ECG, BLECharacteristic::PROPERTY_NOTIFY);
  chEcg->addDescriptor(new BLE2902());
  chPpg = svc->createCharacteristic(UUID_PPG, BLECharacteristic::PROPERTY_NOTIFY);
  chPpg->addDescriptor(new BLE2902());
  chTemp = svc->createCharacteristic(UUID_TEMP, BLECharacteristic::PROPERTY_NOTIFY);
  chTemp->addDescriptor(new BLE2902());
  chStat = svc->createCharacteristic(UUID_STAT, BLECharacteristic::PROPERTY_NOTIFY);
  chStat->addDescriptor(new BLE2902());

  svc->start();
  BLEAdvertising *adv = server->getAdvertising();
  adv->addServiceUUID(UUID_SVC);
  adv->setScanResponse(true);
  adv->start();
  Serial.println("SPHL-CARDIO advertising");

  // 250 Hz ECG sampling timer (1 MHz base, alarm every 4000 ticks)
  ecgTimer = timerBegin(1000000);
  timerAttachInterrupt(ecgTimer, &onEcgTimer);
  timerAlarm(ecgTimer, 4000, true, 0);
}

// ---------------- loop ----------------
uint32_t lastPpgMs = 0, lastTempMs = 0, lastStatMs = 0;

void loop() {
  // ECG batch → notify
  if (ecgReady) {
    memcpy(ecgOut, (const void*)ecgBuf, sizeof(ecgOut));
    ecgReady = false;
    if (clientConnected) {
      uint8_t pkt[18];
      pkt[0] = ecgSeq & 0xFF; pkt[1] = ecgSeq >> 8;
      for (int i = 0; i < 8; i++) {
        pkt[2 + i*2] = ecgOut[i] & 0xFF;
        pkt[3 + i*2] = (ecgOut[i] >> 8) & 0xFF;
      }
      chEcg->setValue(pkt, sizeof(pkt));
      chEcg->notify();
      ecgSeq++;
    }
  }

  uint32_t now = millis();

  // PPG at 10 Hz
  if (max30102ok && clientConnected && now - lastPpgMs >= 100) {
    lastPpgMs = now;
    uint32_t red, ir;
    if (max30102Read(red, ir)) {
      uint8_t pkt[10];
      pkt[0] = ppgSeq & 0xFF; pkt[1] = ppgSeq >> 8;
      pkt[2] = red & 0xFF; pkt[3] = (red >> 8) & 0xFF;
      pkt[4] = (red >> 16) & 0xFF; pkt[5] = 0;
      pkt[6] = ir & 0xFF; pkt[7] = (ir >> 8) & 0xFF;
      pkt[8] = (ir >> 16) & 0xFF; pkt[9] = 0;
      chPpg->setValue(pkt, sizeof(pkt));
      chPpg->notify();
      ppgSeq++;
    }
  }

  // temperature at 1 Hz
  if (tempok && clientConnected && now - lastTempMs >= 1000) {
    lastTempMs = now;
    int16_t c100 = tempReadC100();
    if (c100 != INT16_MIN) {
      uint8_t pkt[2] = { (uint8_t)(c100 & 0xFF), (uint8_t)((c100 >> 8) & 0xFF) };
      chTemp->setValue(pkt, sizeof(pkt));
      chTemp->notify();
    }
  }

  // status at 2 Hz: lead-off + finger-absent
  if (clientConnected && now - lastStatMs >= 500) {
    lastStatMs = now;
    uint8_t st = 0;
    if (digitalRead(PIN_LO_PLUS) == HIGH || digitalRead(PIN_LO_MINUS) == HIGH) st |= 0x01;
    if (max30102ok) {
      uint32_t red, ir;
      if (max30102Read(red, ir) && ir < 5000) st |= 0x02;  // no finger on sensor
    }
    chStat->setValue(&st, 1);
    chStat->notify();
  }

  delay(1);
}
