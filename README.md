# Free AI Video Studio (Android-first starter)

An open-source, no-paid-API-required starter for organizing Bible-story / animation projects on Android.

## What works in this starter
- Character reference library (images + fixed appearance notes)
- Scene-by-scene project builder
- Reusable prompt generator with strict character-reference consistency rules
- Tamil dialogue preview using the Android device's installed Text-to-Speech engine
- Optional ComfyUI API connection using an imported API-format workflow
- Local project metadata storage on the phone

## Important limits
This is a **starter project**, not a finished Google Flow/Veo replacement.
- The phone app does not run Wan/LTX video diffusion models locally.
- Video generation requires a separate machine or a temporary/free GPU runtime running ComfyUI.
- Free GPU runtimes are limited, may disconnect, may queue jobs, and may change their free quotas. There is no reliable unlimited-free cloud GPU.
- The current app submits a ComfyUI job and displays the job ID. It does not yet download/render the resulting MP4 inside the app.
- Tamil voice preview uses Android TTS; the installed Tamil voice and quality vary by device. It is not a generated MP3 export.
- Lip-sync is not implemented in this starter. It needs a compatible open model/workflow (for example MuseTalk/LatentSync) running on a GPU host.
- Image upload into ComfyUI is not wired yet; the character reference library is currently local prompt context. Add an image-upload node workflow adapter before image-to-video.
- A ComfyUI API workflow is model-specific. Do not expect one JSON workflow to work unchanged with every Wan/LTX release.

## Free architecture
1. Android client: Expo / React Native.
2. Local persistence: AsyncStorage (metadata; images remain in the device media location).
3. Voice preview: Android Text-to-Speech via Expo Speech.
4. AI orchestration: ComfyUI API adapter.
5. Video model host: self-hosted open-source models (best control) or a temporary free GPU notebook/runtime (availability/quotas not guaranteed).
6. Candidate model families: Wan 2.x or LTX family for video; MuseTalk or LatentSync for lip-sync; FFmpeg for muxing/editing. Check each model's current license, model card, hardware needs and commercial-use terms before distribution.

## Run on Android
Install Node.js on a computer once to build/run the app:
```bash
npm install
npx expo start
```
Install Expo Go on Android, scan the QR code while phone and computer are on the same Wi-Fi.
For a standalone APK, use an Android build environment / EAS Build; cloud build availability and account limits can change. The source itself is free.

## ComfyUI connection
1. Install ComfyUI on a GPU machine or a free GPU runtime.
2. Create a workflow and export it in **API format**.
3. Put `{{PROMPT}}` in the positive text input in the workflow JSON, or configure the positive prompt node ID in the app.
4. Paste the JSON into AI Connect.
5. Set the server URL reachable from the phone.
6. If the request fails, check the server URL, network access, CORS, workflow node IDs, and ComfyUI logs.

The adapter currently sends a text workflow to `/prompt`. It does not upload reference images or retrieve MP4 output yet.

## Security
Do not expose a ComfyUI server directly to the public internet without authentication and network restrictions. Do not paste private credentials into workflow JSON. Use HTTPS and a protected reverse proxy for remote access.

## License
MIT starter code. This license applies to this app source only, not to third-party models, weights, voices, or datasets.
