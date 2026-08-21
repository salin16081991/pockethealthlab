"use strict";
// =====================================================================
// SPHL Core v0.3 — the full phone-native measurement set (blueprint
// Phase 1 / §43 MVP): heart (camera PPG), breathing (chest motion),
// tremor, gait, balance, reaction time, finger tapping, voice, cough,
// skin/wound/eye photo documentation, sleep log, health report with
// personal baselines, data export, SOS.
// Every measurement: signal-quality gated, class-B/A tagged, versioned.
// =====================================================================
const APP_VERSION = "0.4.0";
// Typical resting adult reference ranges (population context, NOT diagnosis)
const RANGES = {
  heart_rate: [60, 100], respiratory_rate: [12, 20], reaction_time: [180, 380],
  tap_count: [40, 80], sleep_hours: [7, 9], gait_cadence: [90, 125],
  voice_pitch: [85, 255]
};
const PPG_ALGO = "0.2.2", RESP_ALGO = "0.1.0", MOTION_ALGO = "0.1.0",
      AUDIO_ALGO = "0.1.0";
const MIN_IBI_MS = 333, MAX_IBI_MS = 1500;   // 40–180 bpm
const MIN_BR_MS = 1500, MAX_BR_MS = 12000;   // 5–40 breaths/min
const FS_TARGET = 30, STILL_THRESH = 0.45;

// ---------------------------------------------------------------- i18n
const I18N = {
en: {
  voice: "en-IN",
  history_title: "My measurements", start: "Start", back: "Back", cancel: "Stop",
  again: "Measure again", done: "Done", save: "Save", export: "Export my data",
  result_title: "Your result", quality: "Measurement quality",
  q_good: "Good", q_fair: "Okay", q_poor: "Poor",
  measuring: "Measuring…", hold_still: "Hold still",
  disclaimer: "Experimental — not a medical device. Not for medical decisions.",
  baseline_none: "Your normal ranges appear after 3 good measurements of each type.",
  r_normal: "Within your normal range.",
  r_first: "Saved. Measure 3 times on different days to learn your normal range.",
  r_dev: "Different from your normal. Rest for 5 minutes and measure again. If you feel unwell, see a health worker.",
  v_welcome: "Welcome to Sirony Pocket Health Lab.",
  v_done_normal: "This is within your normal range.",
  v_done_dev: "This is different from your normal. Please rest and measure again. If you feel unwell, see a health worker.",
  v_finger_lost: "Finger not found. Slide your fingertip to the next camera circle until I say good.",
  v_finger_ok: "Good. Hold still.",
  v_move: "Too much movement. Please stay still.",
  v_still_ok: "Good. Stay like this.",
  // tests
  heart_name: "Heart", heart_unit: "heartbeats per minute", hrv: "Heart rhythm variation (ms)",
  heart_guide: "The light on the back will turn ON — leave it open, do not cover it. Cover only ONE camera circle fully with your fingertip. If the phone says finger not found, slide your finger to the next camera circle until it says Good.",
  heart_vstart: "Measuring. Keep your finger still for thirty seconds.",
  heart_fail: "Could not measure. Try again in bright light — near a lamp or window. Cover one camera circle fully and keep your hand very still.",
  heart_vres: v => `Done. Your heart rate is ${v} beats per minute.`,
  breath_name: "Breathing", breath_unit: "breaths per minute", breaths_counted: "Breaths counted",
  breath_guide: "Sit back or lie down. Place the phone flat on your chest, screen up. Breathe normally. Stay still for 45 seconds.",
  breath_vstart: "Measuring your breathing. Stay still and breathe normally.",
  breath_fail: "Could not measure. Place the phone flat on your chest, stay very still, and try again.",
  breath_vres: v => `Done. You are breathing ${v} times per minute.`,
  tremor_name: "Tremor", tremor_unit: "shake level", tremor_freq: "Shake speed (per second)",
  tremor_guide: "Hold the phone in your outstretched hand, arm straight in front of you. Hold it steady for 15 seconds.",
  tremor_vstart: "Measuring. Hold your arm straight and steady.",
  tremor_fail: "Could not measure. Hold the phone in your outstretched hand and try again.",
  tremor_vres: v => `Done. Your shake level is ${v}.`,
  gait_name: "Walking", gait_unit: "steps per minute", steps_counted: "Steps counted",
  gait_guide: "Hold the phone in your hand or pocket and walk normally in a straight line for 30 seconds.",
  gait_vstart: "Start walking normally. I will count your steps.",
  gait_fail: "Could not measure. Walk normally for the full time and try again.",
  gait_vres: v => `Done. Your walking pace is ${v} steps per minute.`,
  balance_name: "Balance", balance_unit: "sway level", balance_extra: "Stillness",
  balance_guide: "Stand with feet together. Hold the phone flat against your chest with both hands. Stand as still as you can for 20 seconds.",
  balance_vstart: "Stand still. Hold the phone against your chest.",
  balance_fail: "Could not measure. Stand still with the phone held to your chest and try again.",
  balance_vres: v => `Done. Your sway level is ${v}.`,
  react_name: "Reaction speed", react_unit: "milliseconds", react_best: "Fastest (ms)",
  react_guide: "When the screen turns GREEN, tap it as fast as you can. 5 rounds.",
  react_wait: "Wait for green…", react_go: "TAP NOW!", react_early: "Too early! Wait for green.",
  react_tapstart: "Tap to begin",
  react_fail: "Test not completed. Try again.",
  react_vres: v => `Done. Your reaction speed is ${v} milliseconds.`,
  taps_name: "Finger tapping", taps_unit: "taps in 10 seconds", taps_rhythm: "Rhythm steadiness",
  taps_guide: "Tap the big area with one finger as fast as you can for 10 seconds.",
  taps_tapstart: "Tap to begin",
  taps_fail: "Test not completed. Try again.",
  taps_vres: v => `Done. You tapped ${v} times.`,
  voice_name: "Voice", voice_unit: "voice pitch (Hz)", voice_steady: "Voice steadiness",
  voice_guide: "Hold the phone near your mouth. Take a breath and say aaaa in one steady tone for 6 seconds.",
  voice_vstart: "Say aaaa. Keep it steady.",
  voice_fail: "Could not hear a steady voice. Hold the phone closer and say aaaa without stopping.",
  voice_vres: v => `Done. Your voice pitch is ${v} hertz.`,
  cough_name: "Cough check", cough_unit: "coughs heard", cough_loud: "Loudest burst",
  cough_guide: "Hold the phone near your mouth. Cough naturally a few times during the next 15 seconds. If you have no cough, stay quiet.",
  cough_vstart: "Listening. Cough naturally if you need to.",
  cough_fail: "Recording failed. Try again.",
  cough_vres: v => `Done. I heard ${v} coughs.`,
  photo_name: "Body photo", photo_skin: "Skin", photo_wound: "Wound", photo_eye: "Eye",
  photo_tip: "Fill the frame with the area. Use good light. Hold steady.",
  photo_take: "Take photo", photo_saved: "Photo saved for comparison over time.",
  gallery_title: "My photos", gallery_none: "No photos yet.",
  sleep_name: "Sleep log", sleep_bed: "When did you go to sleep?", sleep_wake: "When did you wake up?",
  sleep_unit: "hours of sleep", sleep_vres: v => `Saved. You slept ${v} hours.`,
  report_name: "Health report", report_none: "No measurements yet. Start with the heart check.",
  rep_cardio: "Heart", rep_resp: "Breathing", rep_neuro: "Nerves & movement",
  rep_voice: "Voice & cough", rep_sleep: "Sleep", rep_photos: "Photos",
  rep_latest: "latest", rep_baseline: "normal",
  sos_name: "Emergency", sos_call: "Call 112",
  sos_text: "If someone is very unwell — severe chest pain, cannot breathe, collapsed — call emergency services now. Do not wait for app measurements.",
  tile_report: "Health report", tile_photos: "My photos", tile_sos: "EMERGENCY",
  assess_name: "Full check",
  assess_guide: "Three tests, one after another: heart, breathing, and voice. About two minutes. Follow the voice instructions.",
  assess_ok: "Full check complete. No significant deviation detected. Measurement quality noted with each result.",
  assess_dev: n => `Full check complete. ${n} result${n > 1 ? "s" : ""} deviate from your normal or the typical range. Rest 5 minutes and repeat the check. If you feel unwell, see a health worker.`,
  not_measured: "Not measured",
  typical: "Typical adult range",
  range_in: "In the typical adult range. Your personal normal builds after 3 measurements.",
  range_out: "Outside the typical adult range. This alone is not a diagnosis — rest, measure again, and if it repeats, mention it to a health worker.",
  share: "Share report", share_head: "My SPHL health summary", copied: "Copied — paste it anywhere.",
},
hi: {
  voice: "hi-IN",
  history_title: "मेरी जाँचें", start: "शुरू करें", back: "वापस", cancel: "रोकें",
  again: "फिर से जाँचें", done: "पूरा हुआ", save: "सहेजें", export: "मेरा डेटा निर्यात करें",
  result_title: "आपका परिणाम", quality: "जाँच की गुणवत्ता",
  q_good: "अच्छी", q_fair: "ठीक", q_poor: "खराब",
  measuring: "जाँच हो रही है…", hold_still: "स्थिर रहें",
  disclaimer: "प्रायोगिक — यह चिकित्सा उपकरण नहीं है। इलाज के फैसले के लिए नहीं।",
  baseline_none: "हर जाँच 3 बार अच्छी होने पर आपकी सामान्य सीमा दिखेगी।",
  r_normal: "आपकी सामान्य सीमा में।",
  r_first: "सहेजा गया। सामान्य सीमा जानने के लिए अलग-अलग दिन 3 बार जाँचें।",
  r_dev: "आपकी सामान्य सीमा से अलग। 5 मिनट आराम करके फिर जाँचें। तबीयत ठीक न लगे तो स्वास्थ्य कर्मी से मिलें।",
  v_welcome: "सिरोनी पॉकेट हेल्थ लैब में आपका स्वागत है।",
  v_done_normal: "यह आपकी सामान्य सीमा में है।",
  v_done_dev: "यह आपकी सामान्य सीमा से अलग है। आराम करके फिर जाँचें। तबीयत ठीक न लगे तो स्वास्थ्य कर्मी से मिलें।",
  v_finger_lost: "उंगली नहीं मिली। उंगली को अगले कैमरे के गोले पर खिसकाएँ जब तक मैं कहूँ बहुत अच्छा।",
  v_finger_ok: "बहुत अच्छा। स्थिर रहें।",
  v_move: "बहुत हिल रहे हैं। कृपया स्थिर रहें।",
  v_still_ok: "बहुत अच्छा। ऐसे ही रहें।",
  heart_name: "दिल", heart_unit: "धड़कन प्रति मिनट", hrv: "धड़कन में बदलाव (ms)",
  heart_guide: "पीछे की लाइट जल जाएगी — लाइट को न ढकें। सिर्फ एक कैमरे के गोले को उंगली से पूरा ढकें। अगर फोन कहे उंगली नहीं मिली, तो उंगली अगले गोले पर खिसकाएँ जब तक फोन कहे बहुत अच्छा।",
  heart_vstart: "जाँच शुरू। तीस सेकंड तक उंगली स्थिर रखें।",
  heart_fail: "जाँच नहीं हो सकी। तेज रोशनी में — लैंप या खिड़की के पास — फिर कोशिश करें। एक गोले को पूरा ढकें और हाथ बिल्कुल स्थिर रखें।",
  heart_vres: v => `हो गया। आपकी धड़कन ${v} प्रति मिनट है।`,
  breath_name: "साँस", breath_unit: "साँस प्रति मिनट", breaths_counted: "गिनी गई साँसें",
  breath_guide: "आराम से बैठें या लेट जाएँ। फोन को छाती पर सीधा रखें, स्क्रीन ऊपर। सामान्य साँस लें। 45 सेकंड स्थिर रहें।",
  breath_vstart: "साँस की जाँच शुरू। स्थिर रहें और सामान्य साँस लेते रहें।",
  breath_fail: "जाँच नहीं हो सकी। फोन को छाती पर सीधा रखें, बिल्कुल स्थिर रहें, और फिर कोशिश करें।",
  breath_vres: v => `हो गया। आप एक मिनट में ${v} बार साँस ले रहे हैं।`,
  tremor_name: "कंपन", tremor_unit: "कंपन स्तर", tremor_freq: "कंपन गति (प्रति सेकंड)",
  tremor_guide: "फोन को फैले हुए हाथ में पकड़ें, बाँह सीधी सामने। 15 सेकंड स्थिर रखें।",
  tremor_vstart: "जाँच शुरू। बाँह सीधी और स्थिर रखें।",
  tremor_fail: "जाँच नहीं हो सकी। फोन को फैले हाथ में पकड़कर फिर कोशिश करें।",
  tremor_vres: v => `हो गया। आपका कंपन स्तर ${v} है।`,
  gait_name: "चाल", gait_unit: "कदम प्रति मिनट", steps_counted: "गिने गए कदम",
  gait_guide: "फोन हाथ में या जेब में रखें और 30 सेकंड सीधी रेखा में सामान्य चलें।",
  gait_vstart: "सामान्य चलना शुरू करें। मैं आपके कदम गिनूँगा।",
  gait_fail: "जाँच नहीं हो सकी। पूरे समय सामान्य चलें और फिर कोशिश करें।",
  gait_vres: v => `हो गया। आपकी चाल ${v} कदम प्रति मिनट है।`,
  balance_name: "संतुलन", balance_unit: "डगमगाहट स्तर", balance_extra: "स्थिरता",
  balance_guide: "पैर मिलाकर खड़े हों। फोन को दोनों हाथों से छाती पर पकड़ें। 20 सेकंड जितना हो सके स्थिर खड़े रहें।",
  balance_vstart: "स्थिर खड़े रहें। फोन छाती पर पकड़ें।",
  balance_fail: "जाँच नहीं हो सकी। फोन छाती पर पकड़कर स्थिर खड़े रहें और फिर कोशिश करें।",
  balance_vres: v => `हो गया। आपका डगमगाहट स्तर ${v} है।`,
  react_name: "प्रतिक्रिया गति", react_unit: "मिलीसेकंड", react_best: "सबसे तेज (ms)",
  react_guide: "जब स्क्रीन हरी हो, जितनी जल्दी हो सके टैप करें। 5 बार।",
  react_wait: "हरे का इंतज़ार करें…", react_go: "अभी टैप करें!", react_early: "बहुत जल्दी! हरे का इंतज़ार करें।",
  react_tapstart: "शुरू करने के लिए टैप करें",
  react_fail: "टेस्ट पूरा नहीं हुआ। फिर कोशिश करें।",
  react_vres: v => `हो गया। आपकी प्रतिक्रिया गति ${v} मिलीसेकंड है।`,
  taps_name: "उंगली टैपिंग", taps_unit: "10 सेकंड में टैप", taps_rhythm: "लय की स्थिरता",
  taps_guide: "बड़े हिस्से को एक उंगली से 10 सेकंड जितनी तेजी से हो सके टैप करें।",
  taps_tapstart: "शुरू करने के लिए टैप करें",
  taps_fail: "टेस्ट पूरा नहीं हुआ। फिर कोशिश करें।",
  taps_vres: v => `हो गया। आपने ${v} बार टैप किया।`,
  voice_name: "आवाज़", voice_unit: "आवाज़ की पिच (Hz)", voice_steady: "आवाज़ की स्थिरता",
  voice_guide: "फोन मुँह के पास रखें। साँस लेकर 6 सेकंड एक सुर में आआआ बोलें।",
  voice_vstart: "आआआ बोलें। सुर स्थिर रखें।",
  voice_fail: "स्थिर आवाज़ नहीं सुनाई दी। फोन पास रखें और बिना रुके आआआ बोलें।",
  voice_vres: v => `हो गया। आपकी आवाज़ की पिच ${v} हर्ट्ज़ है।`,
  cough_name: "खाँसी जाँच", cough_unit: "सुनी गई खाँसी", cough_loud: "सबसे तेज़",
  cough_guide: "फोन मुँह के पास रखें। अगले 15 सेकंड में स्वाभाविक खाँसें। खाँसी न हो तो चुप रहें।",
  cough_vstart: "सुन रहा हूँ। ज़रूरत हो तो स्वाभाविक खाँसें।",
  cough_fail: "रिकॉर्डिंग नहीं हो सकी। फिर कोशिश करें।",
  cough_vres: v => `हो गया। मैंने ${v} खाँसी सुनी।`,
  photo_name: "शरीर की फोटो", photo_skin: "त्वचा", photo_wound: "घाव", photo_eye: "आँख",
  photo_tip: "हिस्से को फ्रेम में भरें। अच्छी रोशनी में। स्थिर रखें।",
  photo_take: "फोटो लें", photo_saved: "फोटो सहेजी गई — समय के साथ तुलना के लिए।",
  gallery_title: "मेरी फोटो", gallery_none: "अभी कोई फोटो नहीं।",
  sleep_name: "नींद का रिकॉर्ड", sleep_bed: "आप कब सोए?", sleep_wake: "आप कब उठे?",
  sleep_unit: "घंटे की नींद", sleep_vres: v => `सहेजा गया। आप ${v} घंटे सोए।`,
  report_name: "स्वास्थ्य रिपोर्ट", report_none: "अभी कोई जाँच नहीं। दिल की जाँच से शुरू करें।",
  rep_cardio: "दिल", rep_resp: "साँस", rep_neuro: "नसें और गति",
  rep_voice: "आवाज़ और खाँसी", rep_sleep: "नींद", rep_photos: "फोटो",
  rep_latest: "ताज़ा", rep_baseline: "सामान्य",
  sos_name: "आपातकाल", sos_call: "112 पर कॉल करें",
  sos_text: "अगर कोई बहुत बीमार है — तेज़ सीने में दर्द, साँस नहीं ले पा रहे, बेहोश — तुरंत आपातकालीन सेवा को कॉल करें। ऐप की जाँच का इंतज़ार न करें।",
  tile_report: "स्वास्थ्य रिपोर्ट", tile_photos: "मेरी फोटो", tile_sos: "आपातकाल",
  assess_name: "पूरी जाँच",
  assess_guide: "तीन जाँचें एक के बाद एक: दिल, साँस और आवाज़। लगभग दो मिनट। आवाज़ के निर्देशों का पालन करें।",
  assess_ok: "पूरी जाँच हो गई। कोई खास बदलाव नहीं मिला। हर परिणाम के साथ जाँच की गुणवत्ता दी गई है।",
  assess_dev: n => `पूरी जाँच हो गई। ${n} परिणाम आपकी सामान्य या आम सीमा से अलग हैं। 5 मिनट आराम करके फिर जाँचें। तबीयत ठीक न लगे तो स्वास्थ्य कर्मी से मिलें।`,
  not_measured: "जाँच नहीं हुई",
  typical: "आम वयस्क सीमा",
  range_in: "आम वयस्क सीमा में। 3 जाँच के बाद आपकी अपनी सामान्य सीमा बनेगी।",
  range_out: "आम वयस्क सीमा से बाहर। यह अकेले कोई बीमारी नहीं बताता — आराम करके फिर जाँचें, बार-बार हो तो स्वास्थ्य कर्मी को बताएँ।",
  share: "रिपोर्ट भेजें", share_head: "मेरा SPHL स्वास्थ्य सारांश", copied: "कॉपी हो गया — कहीं भी पेस्ट करें।",
}
};
let LANG = localStorage.getItem("sphl_lang");
const T = () => I18N[LANG] || I18N.en;
const $ = id => document.getElementById(id);
function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const v = T()[el.dataset.i18n];
    if (typeof v === "string") el.textContent = v;
  });
  document.documentElement.lang = LANG || "en";
}

// ------------------------------------------------------------- speech
let voicesReady = [];
if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => { voicesReady = speechSynthesis.getVoices(); };
  voicesReady = speechSynthesis.getVoices();
}
function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const langTag = T().voice;
  u.lang = langTag;
  const v = voicesReady.find(v => v.lang === langTag) ||
            voicesReady.find(v => v.lang && v.lang.startsWith(langTag.split("-")[0]));
  if (v) u.voice = v;
  u.rate = 0.95;
  speechSynthesis.speak(u);
}
function shutup() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }
function buzz(p) { if (navigator.vibrate) navigator.vibrate(p); }
function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
}

// ---------------------------------------------------------------- DSP
function movingAverage(arr, w) {
  const out = new Array(arr.length); let acc = 0;
  for (let i = 0; i < arr.length; i++) {
    acc += arr[i]; if (i >= w) acc -= arr[i - w];
    out[i] = acc / Math.min(i + 1, w);
  }
  return out;
}
function bandpass(values, fs, slowSec, fastSec) {
  const w = Math.max(3, Math.round(fs * slowSec));
  const ma1 = movingAverage(values, w);
  let det = values.map((v, i) => v - ma1[i]);
  const ma2 = movingAverage(det, w);
  det = det.map((v, i) => v - ma2[i]);
  return movingAverage(det, Math.max(2, Math.round(fs * fastSec)));
}
function detectPeaks(sig, times, minGapMs, thrFactor) {
  const peaks = [];
  const amp = Math.sqrt(sig.reduce((a, v) => a + v * v, 0) / sig.length);
  const thr = amp * thrFactor;
  let lastPeakT = -Infinity;
  for (let i = 2; i < sig.length - 2; i++) {
    if (sig[i] > thr && sig[i] >= sig[i-1] && sig[i] >= sig[i+1] &&
        sig[i] > sig[i-2] && sig[i] > sig[i+2]) {
      if (times[i] - lastPeakT >= minGapMs) { peaks.push(times[i]); lastPeakT = times[i]; }
    }
  }
  return peaks;
}
function intervalStats(ibis) {
  const sorted = [...ibis].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const mean = ibis.reduce((a, v) => a + v, 0) / ibis.length;
  const cv = Math.sqrt(ibis.reduce((a, v) => a + (v - mean) ** 2, 0) / ibis.length) / mean;
  return { med, mean, cv };
}
function rmsOf(a) { return Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length); }
// Autocorrelation with local-peak requirement (boundary maxima = noise/drift)
function autocorrPeriod(sig, fs, minLagMs, maxLagMs, minStrength) {
  const n = sig.length;
  const mean = sig.reduce((a, v) => a + v, 0) / n;
  const x = sig.map(v => v - mean);
  const e0 = x.reduce((a, v) => a + v * v, 0);
  if (e0 === 0) return null;
  const minLag = Math.max(2, Math.round(fs * minLagMs / 1000));
  const maxLag = Math.min(Math.round(fs * maxLagMs / 1000), n - 3);
  if (maxLag <= minLag + 1) return null;
  const lo = minLag - 1, hi = maxLag + 1;
  const r = new Array(hi + 1).fill(0);
  for (let lag = lo; lag <= hi; lag++) {
    let s = 0;
    for (let i = 0; i < n - lag; i++) s += x[i] * x[i + lag];
    r[lag] = (s / (n - lag)) / (e0 / n);
  }
  let bestLag = -1, bestR = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (r[lag] > r[lag - 1] && r[lag] >= r[lag + 1] && r[lag] > bestR) {
      bestR = r[lag]; bestLag = lag;
    }
  }
  if (bestLag < 0 || bestR < minStrength) return null;
  const dbl = bestLag * 2;
  if (dbl >= minLag && dbl <= maxLag && r[dbl] > r[dbl-1] && r[dbl] >= r[dbl+1] &&
      r[dbl] > bestR * 0.85) { bestLag = dbl; bestR = r[dbl]; }
  const denom = r[bestLag-1] - 2*r[bestLag] + r[bestLag+1];
  const frac = denom !== 0 ? 0.5 * (r[bestLag-1] - r[bestLag+1]) / denom : 0;
  const lagRef = bestLag + Math.max(-0.5, Math.min(0.5, frac));
  return { periodMs: 1000 * lagRef / fs, strength: bestR };
}

// ------------------------------------------------------- storage layer
function loadHistory() {
  try { return JSON.parse(localStorage.getItem("sphl_history")) || []; }
  catch (_) { return []; }
}
function saveRecord(rec) {
  const hist = loadHistory();
  hist.push(rec);
  while (hist.length > 400) hist.shift();
  localStorage.setItem("sphl_history", JSON.stringify(hist));
}
function makeRecord(type, value, unit, source, algo, quality, extra) {
  return Object.assign({
    measurement_id: crypto.randomUUID(),
    measurement_type: type, value, unit, source,
    evidence_class: source === "camera_photo" || source === "manual" ? "A" : "B",
    tier: "T0",
    signal_quality: +quality.toFixed(2),
    confidence: +Math.min(1, quality * 1.05).toFixed(2),
    algorithm_version: algo, timestamp: new Date().toISOString()
  }, extra || {});
}
function baseline(hist, type) {
  const vals = hist.filter(h => h.measurement_type === type &&
      (type !== "heart_rate" || h.algorithm_version === PPG_ALGO) &&
      h.signal_quality >= (type === "heart_rate" ? 0.6 : 0.4))
      .map(h => h.value);
  if (vals.length < 3) return null;
  const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
  return { mean, sd: Math.max(sd, mean * 0.04 + 0.5) };
}
function loadPhotos() {
  try { return JSON.parse(localStorage.getItem("sphl_photos")) || []; }
  catch (_) { return []; }
}
function savePhoto(p) {
  const ph = loadPhotos();
  ph.push(p);
  while (ph.length > 12) ph.shift();  // localStorage budget
  try { localStorage.setItem("sphl_photos", JSON.stringify(ph)); }
  catch (_) { ph.shift(); localStorage.setItem("sphl_photos", JSON.stringify(ph)); }
}

// ------------------------------------------------ test registry / tiles
// kind: ppg | motion | audio | react | taps | photo | sleep | report | gallery | sos
const TESTS = [
  { id: "assess", em: "🩺", kind: "assess" },
  { id: "heart",  em: "❤️", kind: "ppg" },
  { id: "breath", em: "🫁", kind: "motion", secs: 45,
    band: [6.0, 0.5], gapMs: MIN_BR_MS, maxMs: MAX_BR_MS, type: "respiratory_rate",
    unitKey: "breath_unit", extraKey: "breaths_counted" },
  { id: "tremor", em: "🤲", kind: "motion", secs: 15, type: "tremor_amplitude",
    unitKey: "tremor_unit", extraKey: "tremor_freq" },
  { id: "gait",   em: "🚶", kind: "motion", secs: 30, type: "gait_cadence",
    unitKey: "gait_unit", extraKey: "steps_counted" },
  { id: "balance",em: "🧍", kind: "motion", secs: 20, type: "balance_sway",
    unitKey: "balance_unit", extraKey: "balance_extra" },
  { id: "react",  em: "⚡", kind: "react" },
  { id: "taps",   em: "👆", kind: "taps" },
  { id: "voice",  em: "🎙️", kind: "audio", secs: 6, type: "voice_pitch",
    unitKey: "voice_unit", extraKey: "voice_steady" },
  { id: "cough",  em: "🤧", kind: "audio", secs: 15, type: "cough_count",
    unitKey: "cough_unit", extraKey: "cough_loud" },
  { id: "photo",  em: "📷", kind: "photo" },
  { id: "sleep",  em: "😴", kind: "sleep" },
  { id: "report", em: "📄", kind: "report" },
];
function buildTiles() {
  const grid = $("tiles");
  grid.innerHTML = "";
  for (const t of TESTS) {
    const b = document.createElement("button");
    b.className = "tile";
    const nameKey = { photo: "photo_name", report: "tile_report" }[t.id] || (t.id + "_name");
    b.innerHTML = `<span class="em">${t.em}</span>${T()[nameKey] || t.id}`;
    b.addEventListener("click", () => openTest(t));
    grid.appendChild(b);
  }
  const g = document.createElement("button");
  g.className = "tile";
  g.innerHTML = `<span class="em">🖼️</span>${T().tile_photos}`;
  g.addEventListener("click", () => { renderGallery(); show("scr-gallery"); });
  grid.appendChild(g);
  const s = document.createElement("button");
  s.className = "tile wide sos";
  s.innerHTML = `<span class="em">🆘</span>${T().tile_sos}`;
  s.addEventListener("click", () => show("scr-sos"));
  grid.appendChild(s);
}

// -------------------------------------------------------- shared state
let CUR = null;          // current test def
let running = false, rafId = null, tickTimer = null, startTime = 0, lastResult = null;
let lastCueState = null, lastCueAt = 0;
const waveCanvas = $("wave"), waveCtx = waveCanvas.getContext("2d");
const RING_LEN = 597;

// ---- full assessment flow (blueprint's 3-minute multimodal example) ----
let ASSESS = { active: false, queue: [], results: [] };
function openTest(t) {
  CUR = t;
  shutup();
  if (t.kind === "assess") {
    ASSESS = { active: true, queue: ["breath", "voice"], results: [] };
    speak(T().assess_guide);
    openTest(TESTS.find(x => x.id === "heart"));
    return;
  }
  if (t.kind === "react") { reactInit(); show("scr-react"); speak(T().react_guide); return; }
  if (t.kind === "taps") { tapsInit(); show("scr-taps"); speak(T().taps_guide); return; }
  if (t.kind === "photo") { photoInit(); show("scr-photo"); return; }
  if (t.kind === "sleep") { show("scr-sleep"); speak(T().sleep_bed); return; }
  if (t.kind === "report") { renderReport(); show("scr-report"); return; }
  // guided sensor tests
  $("guideTitle").textContent = T()[t.id + "_name"];
  $("guideText").textContent = T()[t.id + "_guide"];
  $("illusHeart").style.display = t.id === "heart" ? "" : "none";
  $("illusBreath").style.display = t.id === "breath" ? "" : "none";
  $("illusEmoji").style.display = (t.id !== "heart" && t.id !== "breath") ? "" : "none";
  $("illusEmojiChar").textContent = t.em;
  show("scr-guide");
  speak(T()[t.id + "_guide"]);
}

function updatePill(ok, text, now) {
  const pill = $("contactPill");
  pill.className = "contact-pill " + (ok ? "ok" : "no");
  $("contactText").textContent = text;
  if (ok !== lastCueState && now - lastCueAt > 4000) {
    speak(text);
    if (!ok) buzz([120, 80, 120]);
    lastCueState = ok; lastCueAt = now;
  }
}
function progressTick(now, secs) {
  const elapsed = (now - startTime) / 1000;
  $("ringProg").style.strokeDashoffset = Math.max(0, RING_LEN * (1 - elapsed / secs));
  if (elapsed >= secs) finishSensorTest();
}
function drawWave(sig, color) {
  const W = waveCanvas.width = waveCanvas.clientWidth * devicePixelRatio;
  const H = waveCanvas.height = 64 * devicePixelRatio;
  waveCtx.clearRect(0, 0, W, H);
  const view = sig.slice(-Math.floor(sig.length * 0.6));
  if (view.length < 2) return;
  let mn = Infinity, mx = -Infinity;
  for (const v of view) { if (v < mn) mn = v; if (v > mx) mx = v; }
  const span = (mx - mn) || 1;
  waveCtx.beginPath();
  waveCtx.strokeStyle = color; waveCtx.lineWidth = 2 * devicePixelRatio;
  view.forEach((v, i) => {
    const x = (i / (view.length - 1)) * W;
    const y = H - ((v - mn) / span) * (H * 0.8) - H * 0.1;
    i ? waveCtx.lineTo(x, y) : waveCtx.moveTo(x, y);
  });
  waveCtx.stroke();
}

// -------------------------------------------------------- camera PPG
const video = $("video");
const grab = document.createElement("canvas");
grab.width = 64; grab.height = 48;
const grabCtx = grab.getContext("2d", { willReadFrequently: true });
let stream = null, track = null, samples = [];

async function startCapture() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 640 }, frameRate: { ideal: FS_TARGET } },
      audio: false
    });
  } catch (e) { alert("Camera access failed: " + e.message); return false; }
  video.srcObject = stream;
  track = stream.getVideoTracks()[0];
  try {
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    if (caps.torch) await track.applyConstraints({ advanced: [{ torch: true }] });
  } catch (_) {}
  return true;
}
function stopCapture() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null; track = null;
}
function scheduleFrame() {
  if ("requestVideoFrameCallback" in HTMLVideoElement.prototype)
    video.requestVideoFrameCallback(() => sampleFrame());
  else rafId = requestAnimationFrame(sampleFrame);
}
function sampleFrame() {
  if (!running || CUR.id !== "heart") return;
  grabCtx.drawImage(video, 0, 0, grab.width, grab.height);
  const d = grabCtx.getImageData(16, 12, 32, 24).data;
  let r = 0, g = 0, b = 0, n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; }
  r /= n; g /= n; b /= n;
  const t = performance.now();
  samples.push({ t, r, g, b });
  while (samples.length && samples[0].t < t - 30000) samples.shift();
  heartTick(t);
  scheduleFrame();
}
function fingerDetected(s) { return s.r > 60 && s.r > s.g * 1.4 && s.r > s.b * 1.4; }
function analyseHeart() {
  const use = samples.filter(s => s.t >= startTime + 5000);
  if (use.length < FS_TARGET * 4) return null;
  const times = use.map(s => s.t);
  const dur = (times[times.length - 1] - times[0]) / 1000;
  const fs = use.length / dur;
  let sig = null, ac = null;
  for (const ch of ["r", "g"]) {
    const s2 = bandpass(use.map(s => s[ch]), fs, 1.2, 0.12);
    const a2 = autocorrPeriod(s2, fs, MIN_IBI_MS, MAX_IBI_MS, 0.35);
    if (a2 && (!ac || a2.strength > ac.strength)) { ac = a2; sig = s2; }
  }
  if (!ac) return { sig, value: null, quality: 0 };
  const hr = 60000 / ac.periodMs;
  const peaks = detectPeaks(sig, times, MIN_IBI_MS, 0.6);
  const ibis = [];
  for (let i = 1; i < peaks.length; i++) {
    const ibi = peaks[i] - peaks[i - 1];
    if (ibi >= MIN_IBI_MS && ibi <= MAX_IBI_MS) ibis.push(ibi);
  }
  let agreement = 0, regularity = 0, rmssd = null, cv = 1;
  if (ibis.length >= 4) {
    const st = intervalStats(ibis);
    cv = st.cv;
    const hrP = 60000 / st.med;
    agreement = Math.max(0, 1 - Math.abs(hr - hrP) / hr / 0.12);
    regularity = Math.max(0, 1 - cv * 2.2);
    let ss = 0;
    for (let i = 1; i < ibis.length; i++) ss += (ibis[i] - ibis[i - 1]) ** 2;
    rmssd = Math.sqrt(ss / (ibis.length - 1));
  }
  const contact = use.filter(fingerDetected).length / use.length;
  const strengthNorm = Math.min(1, ac.strength / 0.6);
  let quality = Math.max(0, Math.min(1,
    0.35 * strengthNorm + 0.25 * agreement + 0.15 * regularity + 0.25 * contact));
  if (ibis.length < 4 || agreement < 0.5) quality = Math.min(quality, 0.4);
  if (hr > 165 && (ac.strength < 0.6 || cv > 0.12)) quality = Math.min(quality, 0.4);
  const hrvOk = quality > 0.7 && cv < 0.2 && rmssd !== null && rmssd < 150;
  return { sig, value: hr, rmssd: hrvOk ? rmssd : null, quality };
}
let lastAnalyseAt = 0;
function heartTick(now) {
  const s = samples[samples.length - 1];
  const ok = fingerDetected(s);
  updatePill(ok, ok ? T().v_finger_ok : T().v_finger_lost, now);
  // Full analysis is heavy; run it at 2 Hz, keep frame capture at full rate
  if (now - lastAnalyseAt > 500) { lastResult = analyseHeart(); lastAnalyseAt = now; }
  const res = lastResult;
  $("hrLive").textContent = (res && res.value && res.quality > 0.35) ? Math.round(res.value) : "--";
  $("measureTitle").textContent = (res && res.value) ? T().hold_still : T().measuring;
  if (res && res.sig) drawWave(res.sig, "#ff5d73");
  progressTick(now, 30);
}

// ------------------------------------------------------- motion engine
let msamples = [];
function onMotion(e) {
  const a = e.accelerationIncludingGravity;
  if (!a || a.x === null) return;
  const t = performance.now();
  msamples.push({ t, x: a.x, y: a.y, z: a.z });
  while (msamples.length && msamples[0].t < t - 70000) msamples.shift();
}
async function startMotion() {
  if (typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function") {
    try {
      const p = await DeviceMotionEvent.requestPermission();
      if (p !== "granted") { alert("Motion sensor permission is needed."); return false; }
    } catch (e) { alert("Motion sensor unavailable: " + e.message); return false; }
  }
  msamples = [];
  window.addEventListener("devicemotion", onMotion);
  return true;
}
function stopMotion() { window.removeEventListener("devicemotion", onMotion); }
function motionSeries() {
  const use = msamples.filter(s => s.t >= startTime);
  if (use.length < 40) return null;
  const times = use.map(s => s.t);
  const dur = (times[times.length-1] - times[0]) / 1000;
  if (dur < 5) return null;
  return { use, times, dur, fs: use.length / dur };
}
function stillness(windowMs) {
  const t1 = performance.now(), t0 = t1 - windowMs;
  const win = msamples.filter(s => s.t >= t0);
  if (win.length < 10) return { still: true, rms: 0 };
  const mags = win.map(s => Math.sqrt(s.x*s.x + s.y*s.y + s.z*s.z));
  const smooth = movingAverage(mags, Math.max(3, Math.round(win.length / 8)));
  let acc = 0;
  for (let i = 0; i < mags.length; i++) acc += (mags[i] - smooth[i]) ** 2;
  const rms = Math.sqrt(acc / mags.length);
  return { still: rms < STILL_THRESH, rms };
}
function bestAxisSig(m, slowSec, fastSec) {
  let best = null, bestRms = -1;
  for (const axis of ["x", "y", "z"]) {
    const sig = bandpass(m.use.map(s => s[axis]), m.fs, slowSec, fastSec);
    const rms = rmsOf(sig);
    if (rms > bestRms) { bestRms = rms; best = sig; }
  }
  return best;
}
// Per-test motion analysers → {sig, value, extra, quality}
const MOTION_ANALYSE = {
  breath(m) {
    const sig = bestAxisSig(m, 6.0, 0.5);
    const peaks = detectPeaks(sig, m.times, MIN_BR_MS, 0.5);
    const ibis = [];
    for (let i = 1; i < peaks.length; i++) {
      const d = peaks[i] - peaks[i-1];
      if (d >= MIN_BR_MS && d <= MAX_BR_MS) ibis.push(d);
    }
    if (ibis.length < 3) return { sig, value: null, quality: 0 };
    const { med, mean, cv } = intervalStats(ibis);
    const regularity = Math.max(0, 1 - cv * 1.8);
    const coverage = Math.min(1, (ibis.length * mean) / (m.dur * 1000));
    const stillFrac = 1 - Math.min(1, stillness(m.dur * 1000).rms / (STILL_THRESH * 2));
    return { sig, value: 60000 / med, extra: ibis.length + 1,
      quality: Math.max(0, Math.min(1, 0.45*regularity + 0.30*coverage + 0.25*stillFrac)) };
  },
  tremor(m) {
    // 3–12 Hz band; amplitude (RMS mm/s² -> display index) + dominant frequency
    const sig = bestAxisSig(m, 0.33, 0.02);
    const amp = rmsOf(sig);
    const ac = autocorrPeriod(sig, m.fs, 1000/12, 1000/3, 0.2);
    const value = Math.round(amp * 1000) / 10;   // shake index (m/s² ×100)
    const freq = ac ? Math.round(10000 / ac.periodMs) / 10 : null;
    const quality = Math.min(1, 0.5 + (ac ? 0.5 * Math.min(1, ac.strength / 0.5) : 0));
    return { sig, value, extra: freq !== null ? freq : "--", quality };
  },
  gait(m) {
    const mags = m.use.map(s => Math.sqrt(s.x*s.x + s.y*s.y + s.z*s.z));
    const sig = bandpass(mags, m.fs, 1.6, 0.08);
    const peaks = detectPeaks(sig, m.times, 280, 0.5);
    if (peaks.length < 10) return { sig, value: null, quality: 0 };
    const ibis = [];
    for (let i = 1; i < peaks.length; i++) {
      const d = peaks[i] - peaks[i-1];
      if (d >= 280 && d <= 1600) ibis.push(d);
    }
    if (ibis.length < 8) return { sig, value: null, quality: 0 };
    const { med, cv } = intervalStats(ibis);
    const regularity = Math.max(0, 1 - cv * 1.6);
    return { sig, value: 60000 / med, extra: peaks.length,
      quality: Math.max(0, Math.min(1, 0.5 * regularity + 0.5 * Math.min(1, peaks.length / 30))) };
  },
  balance(m) {
    const mags = m.use.map(s => Math.sqrt(s.x*s.x + s.y*s.y + s.z*s.z));
    const sig = bandpass(mags, m.fs, 3.0, 0.15);
    const sway = rmsOf(sig);
    const value = Math.round(sway * 1000) / 10;  // sway index
    const stillPct = Math.round(100 * Math.max(0, 1 - sway / 1.5));
    return { sig, value, extra: stillPct + "%", quality: 0.8 };
  }
};
function motionTick() {
  if (!running || !CUR || CUR.kind !== "motion") return;
  const now = performance.now();
  const st = stillness(2500);
  const needStill = CUR.id !== "gait";
  updatePill(needStill ? st.still : !st.still,
    needStill ? (st.still ? T().v_still_ok : T().v_move)
              : (!st.still ? T().v_still_ok : T()[CUR.id + "_vstart"]), now);
  const m = motionSeries();
  const res = m ? MOTION_ANALYSE[CUR.id](m) : null;
  lastResult = res;
  const showLive = res && res.value !== null && (now - startTime) > 12000;
  $("hrLive").textContent = showLive ? Math.round(res.value) : "--";
  $("measureTitle").textContent = T().measuring;
  if (res && res.sig) drawWave(res.sig, "#4aa3ff");
  progressTick(now, CUR.secs);
}

// -------------------------------------------------------- audio engine
let audioStream = null, audioCtx = null, analyser = null, audioTimer = null;
let aframes = [];  // {t, rms, pitchMs}
async function startAudio() {
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (e) { alert("Microphone access failed: " + e.message); return false; }
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const srcNode = audioCtx.createMediaStreamSource(audioStream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 4096;
  srcNode.connect(analyser);
  aframes = [];
  const buf = new Float32Array(analyser.fftSize);
  audioTimer = setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    const arr = Array.from(buf);
    const rms = rmsOf(arr);
    // pitch 75–400 Hz via autocorrelation on the frame
    let pitchMs = null;
    if (rms > 0.01) {
      const p = autocorrPeriod(arr, audioCtx.sampleRate, 1000/400, 1000/75, 0.4);
      if (p) pitchMs = p.periodMs;
    }
    aframes.push({ t: performance.now(), rms, pitchMs });
  }, 50);
  return true;
}
function stopAudio() {
  if (audioTimer) { clearInterval(audioTimer); audioTimer = null; }
  if (audioStream) { audioStream.getTracks().forEach(t => t.stop()); audioStream = null; }
  if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
}
const AUDIO_ANALYSE = {
  voice() {
    const use = aframes.filter(f => f.t >= startTime + 500);
    if (use.length < 20) return null;
    const voiced = use.filter(f => f.pitchMs);
    const voicedFrac = voiced.length / use.length;
    if (voiced.length < 12) return { sig: use.map(f => f.rms), value: null, quality: voicedFrac * 0.5 };
    const periods = voiced.map(f => f.pitchMs).sort((a, b) => a - b);
    const medP = periods[Math.floor(periods.length / 2)];
    const meanP = voiced.reduce((a, f) => a + f.pitchMs, 0) / voiced.length;
    const jitter = Math.sqrt(voiced.reduce((a, f) => a + (f.pitchMs - meanP) ** 2, 0) / voiced.length) / meanP;
    const steadiness = Math.round(100 * Math.max(0, 1 - jitter * 5));
    return { sig: use.map(f => f.rms), value: 1000 / medP, extra: steadiness + "%",
      quality: Math.min(1, 0.3 + 0.7 * voicedFrac) };
  },
  cough() {
    const use = aframes.filter(f => f.t >= startTime + 300);
    if (use.length < 20) return null;
    const rmsArr = use.map(f => f.rms);
    const sorted = [...rmsArr].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)] || 0.001;
    const thr = Math.max(med * 4, 0.03);
    let count = 0, lastT = -Infinity, maxBurst = 0;
    for (const f of use) {
      if (f.rms > maxBurst) maxBurst = f.rms;
      if (f.rms > thr && f.t - lastT > 300) { count++; lastT = f.t; }
    }
    return { sig: rmsArr, value: count, extra: Math.round(maxBurst * 100) / 100,
      quality: 0.8 };
  }
};
function audioTick() {
  if (!running || !CUR || CUR.kind !== "audio") return;
  const now = performance.now();
  const res = AUDIO_ANALYSE[CUR.id]();
  lastResult = res;
  const last = aframes[aframes.length - 1];
  const hearing = last && last.rms > 0.01;
  updatePill(hearing, hearing ? T().v_still_ok : T()[CUR.id + "_vstart"], now);
  $("hrLive").textContent = res && res.value !== null && CUR.id === "voice"
    ? Math.round(res.value) : (CUR.id === "cough" && res ? res.value : "--");
  $("measureTitle").textContent = T().measuring;
  if (res && res.sig) drawWave(res.sig, "#ffc857");
  progressTick(now, CUR.secs);
}

// ------------------------------------------------ sensor test lifecycle
async function startSensorTest() {
  $("startBtn").disabled = true;
  let ok = false;
  if (CUR.kind === "ppg") ok = await startCapture();
  else if (CUR.kind === "motion") ok = await startMotion();
  else if (CUR.kind === "audio") ok = await startAudio();
  if (!ok) { $("startBtn").disabled = false; return; }
  running = true; startTime = performance.now();
  lastCueState = null; lastCueAt = 0; lastResult = null;
  samples = [];
  $("ringProg").style.strokeDashoffset = RING_LEN;
  $("ringProg").setAttribute("stroke",
    CUR.kind === "ppg" ? "#ff5d73" : CUR.kind === "audio" ? "#ffc857" : "#4aa3ff");
  $("unitLive").textContent = T()[CUR.kind === "ppg" ? "heart_unit" : CUR.unitKey] || "";
  $("hrLive").textContent = "--";
  show("scr-measure");
  $("startBtn").disabled = false;
  speak(T()[CUR.id + "_vstart"]);
  if (CUR.kind === "ppg") scheduleFrame();
  else if (CUR.kind === "motion") tickTimer = setInterval(motionTick, 250);
  else tickTimer = setInterval(audioTick, 250);
}
function teardown() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  stopCapture(); stopMotion(); stopAudio();
}
function cancelMeasurement() { teardown(); shutup(); ASSESS.active = false; show("scr-home"); }
function assessNext(entry) {
  ASSESS.results.push(entry);
  if (ASSESS.queue.length) {
    const nid = ASSESS.queue.shift();
    setTimeout(() => openTest(TESTS.find(x => x.id === nid)), 400);
  } else {
    ASSESS.active = false;
    renderAssess();
  }
}
function deviates(type, value, hist) {
  const base = baseline(hist, type);
  if (base) return Math.abs(value - base.mean) / base.sd >= 2;
  const rng = RANGES[type];
  return rng ? (value < rng[0] || value > rng[1]) : false;
}
function renderAssess() {
  const hist = loadHistory();
  let dev = 0;
  $("assessList").innerHTML = ASSESS.results.map(e => {
    if (e.value === null)
      return `<div class="rep-row"><span>${e.em} ${T()[e.id + "_name"]}</span><span class="muted">${T().not_measured}</span></div>`;
    const bad = deviates(e.type, e.value, hist);
    if (bad) dev++;
    return `<div class="rep-row"><span>${e.em} <b>${e.value}</b> ${e.unit}</span>
      <span class="badge ${bad ? "warn" : "good"}">${bad ? "!" : "✓"}</span></div>`;
  }).join("");
  const msg = dev === 0 ? T().assess_ok : T().assess_dev(dev);
  $("assessMsg").textContent = msg;
  renderHistory();
  show("scr-assess");
  buzz(dev ? [250, 100, 250] : [80, 60, 80]);
  speak(msg);
}

const ICON_OK = '<svg width="84" height="84" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="rgba(61,220,151,0.15)"/><path d="M7 12.5l3.2 3.2L17 9" stroke="#3ddc97" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_RETRY = '<svg width="84" height="84" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="rgba(255,200,87,0.15)"/><path d="M12 6.5V4l-3.2 3 3.2 3V7.7a4.3 4.3 0 1 1-4.3 4.3H6a6 6 0 1 0 6-5.5z" fill="#ffc857"/></svg>';

function finishSensorTest() {
  if (CUR.kind === "ppg") lastResult = analyseHeart();  // final full-window pass
  const res = lastResult;
  teardown();
  const t = CUR;
  const isHeart = t.kind === "ppg";
  const type = isHeart ? "heart_rate" : t.type;
  const unitKey = isHeart ? "heart_unit" : t.unitKey;
  const extraKey = isHeart ? "hrv" : t.extraKey;
  $("unitResult").textContent = T()[unitKey];
  $("rExtraLabel").textContent = T()[extraKey] || "";
  const minQ = isHeart ? 0.5 : t.id === "breath" ? 0.25 : 0.3;
  // cough with 0 coughs is a VALID result (quiet recording)
  const invalid = !res || res.value === null || (res.quality < minQ && t.id !== "cough");
  if (invalid) {
    if (ASSESS.active) { assessNext({ id: t.id, em: t.em || "❤️", value: null }); return; }
    $("resultIcon").innerHTML = ICON_RETRY;
    $("rHr").textContent = "--";
    $("rExtra").textContent = "--"; $("rQual").textContent = T().q_poor;
    $("rRange").textContent = "";
    $("rMsg").textContent = T()[t.id + "_fail"];
    show("scr-result");
    speak(T()[t.id + "_fail"]);
    buzz([300]);
    return;
  }
  const rounded = t.id === "tremor" || t.id === "balance"
    ? Math.round(res.value * 10) / 10 : Math.round(res.value);
  const quality = res.quality;
  const source = isHeart ? "camera_ppg" : t.kind === "motion" ? "accelerometer" : "microphone";
  const algo = isHeart ? PPG_ALGO : t.kind === "motion" ? MOTION_ALGO : AUDIO_ALGO;
  const unitMap = { heart_rate: "bpm", respiratory_rate: "breaths/min", tremor_amplitude: "index",
    gait_cadence: "steps/min", balance_sway: "index", voice_pitch: "Hz", cough_count: "count" };
  const extra = {};
  if (isHeart && res.rmssd !== null) extra.hrv_rmssd_ms = Math.round(res.rmssd);
  const hist = loadHistory();
  const base = baseline(hist, type);
  saveRecord(makeRecord(type, rounded, unitMap[type], source, algo, quality, extra));
  if (ASSESS.active) {
    assessNext({ id: t.id, em: t.em || "❤️", value: rounded, unit: unitMap[type], type });
    return;
  }

  $("rHr").textContent = rounded;
  $("rExtra").textContent = isHeart ? (res.rmssd !== null ? Math.round(res.rmssd) : "--")
    : (res.extra !== undefined ? res.extra : "--");
  $("rQual").textContent = quality > 0.7 ? T().q_good : quality > 0.4 ? T().q_fair : T().q_poor;

  let msg, vmsg = "", ok = true;
  const rng = RANGES[type];
  if (base) {
    const dev = Math.abs(rounded - base.mean) / base.sd;
    if (dev < 2) { msg = T().r_normal; vmsg = T().v_done_normal; }
    else { msg = T().r_dev; vmsg = T().v_done_dev; ok = false; }
  } else if (rng) {
    if (rounded >= rng[0] && rounded <= rng[1]) { msg = T().range_in; vmsg = T().v_done_normal; }
    else { msg = T().range_out; ok = false; }
  } else { msg = T().r_first; }
  $("rRange").textContent = rng ? `${T().typical}: ${rng[0]}–${rng[1]}` : "";
  $("resultIcon").innerHTML = ok ? ICON_OK : ICON_RETRY;
  $("rMsg").textContent = msg;
  renderHistory();
  show("scr-result");
  buzz(ok ? [80, 60, 80] : [250, 100, 250]);
  speak(T()[t.id + "_vres"](rounded) + " " + vmsg);
}

// ----------------------------------------------------------- reaction
let reactState = null;
function reactInit() {
  reactState = { round: 0, results: [], phase: "idle", timer: null };
  $("reactRound").textContent = T().react_guide;
  $("reactText").textContent = T().react_tapstart;
  $("reactMs").textContent = "";
  $("reactArea").className = "bigarea";
}
function reactAdvance() {
  const rs = reactState;
  if (rs.phase === "idle" || rs.phase === "shown") {
    rs.phase = "waiting";
    $("reactArea").className = "bigarea waitState";
    $("reactText").textContent = T().react_wait;
    $("reactMs").textContent = "";
    rs.timer = setTimeout(() => {
      rs.phase = "go"; rs.goAt = performance.now();
      $("reactArea").className = "bigarea goState";
      $("reactText").textContent = T().react_go;
      buzz([40]);
    }, 1500 + Math.random() * 2500);
  } else if (rs.phase === "waiting") {
    clearTimeout(rs.timer);
    $("reactText").textContent = T().react_early;
    $("reactArea").className = "bigarea";
    rs.phase = "idle";
  } else if (rs.phase === "go") {
    const ms = Math.round(performance.now() - rs.goAt);
    rs.results.push(ms);
    rs.round++;
    $("reactMs").textContent = ms + " ms";
    $("reactText").textContent = rs.round < 5 ? T().react_tapstart : "";
    $("reactArea").className = "bigarea";
    $("reactRound").textContent = rs.round + " / 5";
    rs.phase = "shown";
    if (rs.round >= 5) reactFinish();
  }
}
function reactFinish() {
  const rs = reactState;
  const sorted = [...rs.results].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const best = sorted[0];
  saveRecord(makeRecord("reaction_time", median, "ms", "touchscreen", MOTION_ALGO, 0.9, { best_ms: best }));
  $("unitResult").textContent = T().react_unit;
  $("rExtraLabel").textContent = T().react_best;
  $("rHr").textContent = median;
  $("rExtra").textContent = best;
  $("rQual").textContent = T().q_good;
  const rrng = RANGES.reaction_time;
  const rok = median >= rrng[0] && median <= rrng[1];
  $("rRange").textContent = `${T().typical}: ${rrng[0]}–${rrng[1]}`;
  $("resultIcon").innerHTML = rok ? ICON_OK : ICON_RETRY;
  $("rMsg").textContent = rok ? T().range_in : T().range_out;
  CUR = TESTS.find(t => t.id === "react");
  renderHistory();
  show("scr-result");
  speak(T().react_vres(median));
}

// --------------------------------------------------------------- taps
let tapsState = null;
function tapsInit() {
  tapsState = { started: false, count: 0, times: [], endTimer: null };
  $("tapsInfo").textContent = T().taps_guide;
  $("tapsText").textContent = T().taps_tapstart;
  $("tapsCount").textContent = "";
}
function tapsTap() {
  const ts = tapsState;
  const now = performance.now();
  if (!ts.started) {
    ts.started = true; ts.startAt = now;
    ts.endTimer = setTimeout(tapsFinish, 10000);
  }
  ts.count++; ts.times.push(now);
  $("tapsCount").textContent = ts.count;
  $("tapsText").textContent = Math.max(0, Math.ceil(10 - (now - ts.startAt) / 1000)) + "s";
}
function tapsFinish() {
  const ts = tapsState;
  const ivs = [];
  for (let i = 1; i < ts.times.length; i++) ivs.push(ts.times[i] - ts.times[i-1]);
  let rhythm = "--";
  if (ivs.length > 5) {
    const { cv } = intervalStats(ivs);
    rhythm = Math.round(100 * Math.max(0, 1 - cv)) + "%";
  }
  saveRecord(makeRecord("tap_count", ts.count, "taps/10s", "touchscreen", MOTION_ALGO, 0.9, {}));
  $("unitResult").textContent = T().taps_unit;
  $("rExtraLabel").textContent = T().taps_rhythm;
  $("rHr").textContent = ts.count;
  $("rExtra").textContent = rhythm;
  $("rQual").textContent = T().q_good;
  const trng = RANGES.tap_count;
  const tok = ts.count >= trng[0] && ts.count <= trng[1];
  $("rRange").textContent = `${T().typical}: ${trng[0]}–${trng[1]}`;
  $("resultIcon").innerHTML = tok ? ICON_OK : ICON_RETRY;
  $("rMsg").textContent = tok ? T().range_in : T().range_out;
  CUR = TESTS.find(t => t.id === "taps");
  renderHistory();
  show("scr-result");
  speak(T().taps_vres(ts.count));
}

// -------------------------------------------------------------- photo
let photoType = null, photoStream = null;
function photoInit() {
  photoType = null;
  $("photoTitle").textContent = T().photo_name;
  $("photoTypes").style.display = "";
  $("photoCam").style.display = "none";
}
async function photoOpenCam(type) {
  photoType = type;
  try {
    photoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false
    });
  } catch (e) { alert("Camera access failed: " + e.message); return; }
  $("photoVideo").srcObject = photoStream;
  $("photoTypes").style.display = "none";
  $("photoCam").style.display = "";
  $("photoTitle").textContent = T()["photo_" + type];
  speak(T().photo_tip);
}
function photoCloseCam() {
  if (photoStream) { photoStream.getTracks().forEach(t => t.stop()); photoStream = null; }
}
function photoSnap() {
  const v = $("photoVideo");
  if (!v.videoWidth) return;
  const c = document.createElement("canvas");
  const scale = Math.min(1, 512 / v.videoWidth);
  c.width = Math.round(v.videoWidth * scale);
  c.height = Math.round(v.videoHeight * scale);
  c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL("image/jpeg", 0.65);
  savePhoto({ type: photoType, dataUrl, ts: new Date().toISOString() });
  saveRecord(makeRecord("photo_" + photoType, 1, "photo", "camera_photo", "doc-0.1", 0.9, {}));
  photoCloseCam();
  buzz([60]);
  speak(T().photo_saved);
  renderGallery();
  show("scr-gallery");
}
function renderGallery() {
  const ph = loadPhotos();
  const el = $("galleryList");
  if (!ph.length) { el.innerHTML = `<div class="step-sub">${T().gallery_none}</div>`; return; }
  const groups = {};
  for (const p of ph) (groups[p.type] = groups[p.type] || []).push(p);
  el.innerHTML = Object.keys(groups).map(type =>
    `<div class="rep-domain">${T()["photo_" + type] || type}</div>
     <div class="gallery">${groups[type].slice().reverse().map(p =>
       `<div class="gitem"><img src="${p.dataUrl}"><br>${new Date(p.ts).toLocaleDateString()}</div>`).join("")}
     </div>`).join("");
}

// -------------------------------------------------------------- sleep
function sleepSave() {
  const bed = $("sleepBed").value, wake = $("sleepWake").value;
  if (!bed || !wake) return;
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  const hours = Math.round(mins / 6) / 10;
  saveRecord(makeRecord("sleep_hours", hours, "h", "manual", "log-0.1", 1, { bed, wake }));
  renderHistory();
  buzz([60]);
  speak(T().sleep_vres(hours));
  show("scr-home");
}

// ------------------------------------------------------------- report
const REPORT_DOMAINS = [
  { key: "rep_cardio", types: [["heart_rate", "❤️"]] },
  { key: "rep_resp",   types: [["respiratory_rate", "🫁"], ["cough_count", "🤧"]] },
  { key: "rep_neuro",  types: [["tremor_amplitude", "🤲"], ["gait_cadence", "🚶"],
                               ["balance_sway", "🧍"], ["reaction_time", "⚡"], ["tap_count", "👆"]] },
  { key: "rep_voice",  types: [["voice_pitch", "🎙️"]] },
  { key: "rep_sleep",  types: [["sleep_hours", "😴"]] },
];
function sparkline(vals) {
  if (vals.length < 2) return "";
  const w = 64, h = 20;
  let mn = Math.min(...vals), mx = Math.max(...vals);
  if (mx - mn < 1e-9) { mn -= 1; mx += 1; }
  const pts = vals.map((v, i) =>
    `${(i / (vals.length - 1) * (w - 4) + 2).toFixed(1)},${(h - 3 - (v - mn) / (mx - mn) * (h - 6)).toFixed(1)}`).join(" ");
  return `<svg width="${w}" height="${h}" style="vertical-align:middle"><polyline points="${pts}" fill="none" stroke="#4aa3ff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function renderReport() {
  const hist = loadHistory();
  const el = $("reportBody");
  if (!hist.length) { el.innerHTML = `<div class="step-sub">${T().report_none}</div>`; return; }
  let html = "";
  for (const dom of REPORT_DOMAINS) {
    const rows = [];
    for (const [type, em] of dom.types) {
      const recs = hist.filter(h => h.measurement_type === type);
      if (!recs.length) continue;
      const last = recs[recs.length - 1];
      const base = baseline(hist, type);
      let flag = "";
      if (base) {
        const dev = Math.abs(last.value - base.mean) / base.sd;
        flag = dev >= 2 ? ` <span class="badge warn">!</span>` : ` <span class="badge good">✓</span>`;
        flag += ` <span class="muted" style="font-size:0.75rem">${T().rep_baseline} ${Math.round(base.mean * 10) / 10}</span>`;
      } else if (RANGES[type]) {
        const [lo, hi] = RANGES[type];
        flag = (last.value < lo || last.value > hi)
          ? ` <span class="badge warn">!</span>` : ` <span class="badge good">✓</span>`;
        flag += ` <span class="muted" style="font-size:0.75rem">${lo}–${hi}</span>`;
      }
      const trend = sparkline(recs.slice(-10).map(r => r.value));
      rows.push(`<div class="rep-row"><span>${em} <b>${last.value}</b> ${last.unit}${flag}</span>
        <span>${trend} <span class="muted" style="font-size:0.72rem">${new Date(last.timestamp).toLocaleDateString()}</span></span></div>`);
    }
    if (rows.length) html += `<div class="rep-domain">${T()[dom.key]}</div>` + rows.join("");
  }
  const nPhotos = loadPhotos().length;
  if (nPhotos) html += `<div class="rep-domain">${T().rep_photos}</div><div class="rep-row"><span>🖼️ ${nPhotos}</span></div>`;
  el.innerHTML = html || `<div class="step-sub">${T().report_none}</div>`;
}
function shareReport() {
  const hist = loadHistory();
  const lines = [T().share_head, new Date().toLocaleDateString(), ""];
  for (const dom of REPORT_DOMAINS) {
    for (const [type, em] of dom.types) {
      const recs = hist.filter(h => h.measurement_type === type);
      if (!recs.length) continue;
      const last = recs[recs.length - 1];
      lines.push(`${em} ${last.value} ${last.unit} (${new Date(last.timestamp).toLocaleDateString()})`);
    }
  }
  lines.push("", T().disclaimer, "https://pockethealthlab.sirony.in");
  const text = lines.join("\n");
  if (navigator.share) navigator.share({ text }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => alert(T().copied));
}
function exportData() {
  const payload = {
    app: "Sirony Pocket Health Lab", version: APP_VERSION,
    exported: new Date().toISOString(),
    note: "Experimental data — not a medical record.",
    measurements: loadHistory(),
    photos: loadPhotos().map(p => ({ type: p.type, ts: p.ts }))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sphl-export-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ------------------------------------------------------------ history
function renderHistory() {
  const hist = loadHistory();
  const el = $("history");
  const EMOJI = { heart_rate: "❤️", respiratory_rate: "🫁", tremor_amplitude: "🤲",
    gait_cadence: "🚶", balance_sway: "🧍", reaction_time: "⚡", tap_count: "👆",
    voice_pitch: "🎙️", cough_count: "🤧", sleep_hours: "😴" };
  el.innerHTML = hist.length
    ? hist.slice(-6).reverse().map(h => {
        const em = EMOJI[h.measurement_type] || "📷";
        return `<div class="entry"><div><b>${h.value}</b> ${em}
         <span class="badge ${h.signal_quality > 0.7 ? "good" : h.signal_quality > 0.4 ? "warn" : "bad"}">${
           h.signal_quality > 0.7 ? T().q_good : h.signal_quality > 0.4 ? T().q_fair : T().q_poor}</span></div>
         <div class="t">${new Date(h.timestamp).toLocaleDateString()}</div></div>`;
      }).join("")
    : "";
  const bHr = baseline(hist, "heart_rate");
  const bBr = baseline(hist, "respiratory_rate");
  const lines = [];
  if (bHr) lines.push(`❤️ ${Math.round(bHr.mean)} ± ${Math.round(bHr.sd)}`);
  if (bBr) lines.push(`🫁 ${Math.round(bBr.mean)} ± ${Math.round(bBr.sd)}`);
  $("baselineLine").textContent = lines.length ? lines.join(" · ") : T().baseline_none;
}

// -------------------------------------------------------------- wiring
document.querySelectorAll("#scr-lang [data-lang]").forEach(btn =>
  btn.addEventListener("click", () => {
    LANG = btn.dataset.lang;
    localStorage.setItem("sphl_lang", LANG);
    applyI18n(); buildTiles(); renderHistory();
    show("scr-home");
    speak(T().v_welcome);
  })
);
$("langSwitch").addEventListener("click", () => show("scr-lang"));
$("guideBack").addEventListener("click", () => { shutup(); show("scr-home"); });
$("startBtn").addEventListener("click", startSensorTest);
$("stopBtn").addEventListener("click", cancelMeasurement);
$("againBtn").addEventListener("click", () => openTest(CUR));
$("doneBtn").addEventListener("click", () => { shutup(); show("scr-home"); });
$("reactArea").addEventListener("pointerdown", reactAdvance);
$("reactCancel").addEventListener("click", () => {
  if (reactState && reactState.timer) clearTimeout(reactState.timer);
  shutup(); show("scr-home");
});
$("tapsArea").addEventListener("pointerdown", tapsTap);
$("tapsCancel").addEventListener("click", () => {
  if (tapsState && tapsState.endTimer) clearTimeout(tapsState.endTimer);
  shutup(); show("scr-home");
});
document.querySelectorAll("#photoTypes [data-ptype]").forEach(b =>
  b.addEventListener("click", () => photoOpenCam(b.dataset.ptype)));
$("photoBack1").addEventListener("click", () => { shutup(); show("scr-home"); });
$("photoBack2").addEventListener("click", () => { photoCloseCam(); photoInit(); });
$("photoSnap").addEventListener("click", photoSnap);
$("galleryBack").addEventListener("click", () => show("scr-home"));
$("sleepSave").addEventListener("click", sleepSave);
$("sleepBack").addEventListener("click", () => { shutup(); show("scr-home"); });
$("reportBack").addEventListener("click", () => show("scr-home"));
$("exportBtn").addEventListener("click", exportData);
$("shareBtn").addEventListener("click", shareReport);
$("assessShare").addEventListener("click", shareReport);
$("assessDone").addEventListener("click", () => { shutup(); show("scr-home"); });
$("sosBack").addEventListener("click", () => show("scr-home"));

// PWA
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// boot
$("verLine").textContent = "SPHL web v" + APP_VERSION;
if (LANG && I18N[LANG]) { applyI18n(); buildTiles(); renderHistory(); show("scr-home"); }
else { show("scr-lang"); }
