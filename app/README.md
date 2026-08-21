# SPHL Mobile App (Capacitor)

One codebase → web + iOS + Android. The web app in
[`../prototypes/sphl-core-web/`](../prototypes/sphl-core-web/) is the single
source of truth; it is copied into `www/` and wrapped by Capacitor.

## Sync web code into the app

```bash
npm run sync
```

## Build & run — Android

Requires [Android Studio](https://developer.android.com/studio).

```bash
npx cap open android    # then Run ▶ on a device/emulator
```

Or CLI: `npx cap run android`

## Build & run — iOS

Requires full **Xcode** from the Mac App Store (this machine currently has
only Command Line Tools), then:

```bash
sudo xcode-select -s /Applications/Xcode.app
npx cap open ios        # then Run ▶ on a device/simulator
```

Note: camera PPG needs a real device (simulators/emulators have no camera flash).

## Permissions already configured

- Android: `CAMERA` permission + camera/flash features (optional) in `AndroidManifest.xml`
- iOS: `NSCameraUsageDescription` in `Info.plist`

## Roadmap for the native shell

- Native camera plugin for guaranteed torch control + raw frame rate (replaces getUserMedia path)
- BLE plugin for Sirony Module Standard device discovery (`docs/02-sphl-module-standard.md`)
- On-device ML runtime (Core ML / TFLite) for signal-quality and rhythm models
- Secure local storage (SQLCipher) replacing localStorage
