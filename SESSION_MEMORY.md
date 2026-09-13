# 🧠 Nexxa AI Robot - Project Session Memory & History

**Last Updated:** September 2026  
**Status:** Production Ready / 100% Automated Test Pass (50/50)

---

## 1. Project Mission & Objectives
Develop an end-to-end voice-controlled robot assistant named **"Nexxa" (เน็กซ่า)** integrating:
1. **OLED Robot Face**: Aesthetic cyber-blue OLED face modeled faithfully after `ai_ui.png`.
2. **Always-On Thai Voice Control**: Zero-click listening pipeline recognizing Thai speech and wake words.
3. **Google AI Studio (Gemini 3.5 Flash Lite)**: Dynamic intelligent decision-maker producing action commands and natural Thai voice responses.
4. **Hardware REST API**: Direct command dispatching to an ESP32 robot (`PICK`, `HOME`, `STOP`).
5. **High-Fidelity Multi-Voice Output**: Natural Thai neural voices with 0-latency playback through Windows PC speakers, bypassing browser autoplay limitations.

---

## 2. Key Architecture & File Roles

| File | Role & Technology |
| :--- | :--- |
| `index.html` | Frontend UI. OLED Robot SVG (`#leftEyeGroup`, `#rightEyeGroup`, `#robotMouth`), Web Speech API continuous listener, Gemini API caller, lipsync animation loop, keyboard bindings (`B, C, S, P, H, X, V`). |
| `server.js` | Native Node.js server. Provides `/speak` (Windows `winmm.dll` audio via `koffi`), `/tts` (Edge Neural TTS via `@andresaya/edge-tts` & MP3 cache), `/command` (ESP32 mock REST API), and static web serving. |
| `run_web.bat` | Launcher batch script. Starts `node server.js` and opens Google Chrome/Edge with `--autoplay-policy=no-user-gesture-required`. |
| `test_system.js` | Automated test suite in Node.js validating 31 criteria across web serving, audio, API, Gemini, speech recognition, and firmware syntax. |
| `run_background.vbs` | Background launcher running `node server.js` without CMD popups. |
| `stop_server.bat` | Script to stop the Node.js server gracefully. |
| `package.json` | Node.js project manifest and dependency definitions. |
| `esp32_example.ino` | ESP32 Arduino firmware implementing WiFi, WebServer, REST endpoints, and motor/servo pin actuation. |
| `src/main.cpp` | PlatformIO version of the ESP32 firmware with CORS support. |
| `GEMINI.md` | Antigravity persistent context and project rules. |
| `SESSION_MEMORY.md` | Project session memory and history. |

---

## 3. Major Milestones & Solved Challenges

### Milestone 1: Zero-Click Always-On Audio & Autoplay Bypass
- **Challenge**: Modern browsers (Chrome, Edge) strictly enforce the Autoplay Policy, blocking `Audio.play()` and `speechSynthesis.speak()` without a user gesture, throwing `NotAllowedError`.
- **Solution**: Implemented direct system audio playback via Windows Multimedia API (`winmm.dll` `mciSendStringW`) inside `server.py` on the `/speak` endpoint. When the web client receives speech from Gemini, it triggers `fetch('/speak?text=...')`, playing the audio directly through the PC speakers with 0 browser restrictions.

### Milestone 2: Transition to Natural Neural Thai Voices
- **Challenge**: Standard browser Web Speech API voices and basic Google Translate TTS sound robotic and artificial.
- **Solution**: Integrated Microsoft Edge Neural TTS (`edge-tts`) supporting:
  - `th-TH-PremwadeeNeural` (Female: soft, clear, natural)
  - `th-TH-NiwatNeural` (Male: confident, warm, natural)
  - Fallback to Google Translate TTS for low-bandwidth or offline environments.
  - Added on-the-fly voice cycling via **`V`** key, voice commands, and DevTools Console.

### Milestone 3: Server Threading Bottleneck
- **Challenge**: `http.server.SimpleHTTPRequestHandler` is single-threaded. When `edge-tts` downloaded audio in an `asyncio` event loop, the server blocked incoming HTTP requests, freezing the web client.
- **Solution**: Converted server to `ThreadingHTTPServer` (`socketserver.ThreadingMixIn, http.server.HTTPServer`), allowing concurrent audio generation, static file serving, and REST API handling.

### Milestone 4: Gemini 3.5 Flash Decision Making
- **Challenge**: Static regex and hardcoded rule engines lacked conversational flexibility.
- **Solution**: Wired all incoming speech to Google AI Studio Gemini 3.5 Flash Lite (`response_mime_type: "application/json"`). Gemini analyzes intent, extracts physical targets into standard actions (`PICK`, `HOME`, `STOP`, `NONE`), and synthesizes warm Thai speech responses. Built-in Smart Local NLP serves as an automatic fallback if network drops.

### Milestone 5: Strict Minimalist OLED UI Constraint
- **Constraint**: The user requested that the screen strictly retain only the OLED robot face without visible control buttons or widgets.
- **Solution**: Removed all screen buttons, controls, and chips. Exposed all testing and configuration functions via:
  - Intuitive single-key keyboard shortcuts (`B`, `C`, `S`, `P`, `H`, `X`, `V`, `N`, `W`).
  - Natural Thai voice commands.
  - Clean DevTools Console logging and functions (`setVoice`, `setEsp32Url`, `setAiMode`, `setGeminiKey`).

### Milestone 6: Wake Word Gating (Nexxa) & Smart NLP Action Correction
- **Challenge 1**: Actions (`PICK`, `HOME`, `STOP`) were executable at any time without wake-up, leading to accidental trigger. Additionally, if the user didn't speak within 7 seconds of waking, there was no auto-standby mechanism.
- **Challenge 2**: Any unrecognized phrase or chat was defaulting to `action: "PICK"`, causing the robot to mistakenly command hardware to pick an item for almost every utterance.
- **Solution**:
  - **Strict Wake Gating**: Implemented `isAwake` state lock. Actions CANNOT be skipped or triggered without waking up first using:
    `const wakeKeywords = ["hello nexxa", "hey nexxa", "nexxa", "nexxa", "เน็กซ่า", "nexxa"];`
  - **7-Second Auto Timeout**: Once woken up, a 7000ms timer starts. If no command is received within 7 seconds, the robot automatically reverts to Standby (`isAwake = false`).
  - **Single-Sentence Wake+Command Support**: e.g., `"hello nexxa ไปหยิบขวดน้ำ"` immediately wakes and dispatches the action, then cleanly resets to Standby.
  - **NLP Action Correction**: Refactored `parseWithLocalNLP` and Gemini prompt. `action: "PICK"` is now strictly gated behind explicit pick intent verbs (`หยิบ`, `เอา`, `นำ`, `ยก`, `ถือ`, `ช่วยหยิบ`, `ไปหยิบ`, `เก็บ`). All other conversations and inquiries safely return `action: "NONE"`.

### Milestone 7: Siri iOS Role Model Architecture
- **Objective**: Adopt the interaction paradigm, audio-visual feedback, and communication style of Apple's iOS Siri assistant.
- **Implementation**:
  - **Siri Earcon Chimes**: Built-in Web Audio API dual-harmonic sine synthesizer creating zero-latency Siri activation (`C5 -> G5`) and soft dismiss chimes (`659Hz -> 440Hz`).
  - **Apple Intelligence Edge Aura**: Pulsing neon border glow (`.siri-active`) dynamically surrounding the OLED display when listening.
  - **Siri Thai Persona**: Refactored Local NLP and Gemini 3.5 Flash system prompt to emulate Siri's polite, concise, single-sentence response style (e.g., `"กำลังไปหยิบ[ของ]ให้ครับ"`, `"กำลังกลับไปที่ฐานครับ"`, `"หยุดการทำงานเรียบร้อยแล้วครับ"`).
  - **Siri Instant Dismiss / Cancel**: Saying `"ยกเลิก"`, `"ไม่เป็นไร"`, `"พอแล้ว"`, `"ช่างมัน"`, or `"cancel"` triggers immediate Siri dismissal and returns to Standby.
  - **Wake Aliases**: Seamlessly supports `"Hey Nexxa"`, and `"Nexxa"`.

### Milestone 8: Hardware Health & Continuous Q&A Actions
- **CheckStatus Action**:
  - Checks ESP32 board health and readiness via REST ping (`/status`) or command (`/command` with `action: "CheckStatus"`).
  - Arduino & PlatformIO firmware handlers return `{"status":"success","robot_status":"ready"}`.
  - Speech feedback: `"กำลังตรวจสอบสถานะอุปกรณ์ ESP32 ค่ะ... ระบบพร้อมใช้งานค่ะ"`.
- **AnswerQuestion Mode**:
  - Continuous Q&A conversation mode using Gemini 3.5 Flash or Local NLP.
  - Activated by `"ตอบคำถาม"`, `"มีคำถาม"`, or Hotkey `Q`.
  - Display switches to Violet & Neon Cyan pulsing edge aura (`.qa-active`).
  - Stays continuously in Q&A mode until the user explicitly speaks `"ให้หยุดตอบ"` (or Hotkey `Z`).

### Milestone 9: Strict Wake Gating, Substring Collision Fix, Single Neural Voice & Modular Architecture
- **Root Cause & Fix for Accidental PICK Bug**:
  - In Thai unspaced text, compound phrases such as `"คุยกัน"` or `"ช่วยกัน"` ended in `ย` and started with `ก`, creating the character sequence `ยก` (`ย+ก`). Single character/word regex matching `'ยก'` collided with everyday conversations.
  - When matching without an explicit object in the dictionary, `parseWithLocalNLP` had defaulted `target = "สิ่งของ"` and returned `action: "PICK"`.
  - Fix: Replaced loose single verbs with multi-word verbal compounds (`['ไปหยิบ', 'ช่วยหยิบ', 'หยิบ', 'ช่วยเอา', 'ไปเอา', 'เอามาให้', 'ช่วยยก', 'ไปยก']`), added exclusion rules (`คุยกัน`, `ช่วยกัน`), and strictly enforced that `action: "PICK"` requires both an explicit pick intent verb AND a recognized physical object. All conversational speech returns `action: "NONE"`.
- **Strict Wake Word Gating & 7-Second Timeout**:
  - Exact `wakeKeywords` array enforced:
    ```javascript
    const wakeKeywords = [
        "hello nexxa", "hey nexxa",
        "nexxa", "nexxa", "เน็กซ่า", "nexxa",
    ];
    ```
  - State machine blocks execution of any action unless the robot is awakened first (`isAwake = true`).
  - 7000ms countdown timer automatically reverts the robot back to Standby if no command is spoken within 7 seconds.
- **Single Neural Voice**:
  - Standardized on Microsoft Edge Neural TTS: `th-TH-PremwadeeNeural` across both backend (`server.js`) and frontend (`js/config.js`, `js/audio.js`).
  - Removed multi-voice toggles and male voice to ensure uniform robot personality.
- **Modular Component Architecture**:
  - Deconstructed monolithic 1400+ line `index.html` into semantic modules:
    - `index.html`: Clean skeleton loading CSS and JS modules.
    - `css/style.css`: OLED display, responsive layout, Siri/QA border auras.
    - `js/config.js`: Central configuration, wake keywords, timeouts, voice constants.
    - `js/face.js`: SVG OLED face animations, blinking, lipsync loop.
    - `js/audio.js`: Web Audio API Siri Chime synthesizers, Edge Neural TTS player.
    - `js/speech.js`: Continuous Speech Recognition, strict wake gating, 7s timeout window.
    - `js/nlp.js`: Collision-free Thai Local NLP parser.
    - `js/gemini.js`: Google AI Studio Gemini 3.5 Flash connector & Q&A prompt.
    - `js/esp32.js`: ESP32 REST API client & CheckStatus verification.
    - `js/app.js`: Main coordinator, Q&A state machine, keyboard hotkeys.

### Milestone 10: Real-time Telemetry & Command Dashboard (หน้า Dashboard รับ-ส่งข้อมูล)
- **Objective**: Create a real-time monitor and command center (`dashboard.html`) for visualizing incoming and outgoing telemetry without cluttering the minimalist robot OLED face (`index.html`).
- **Features Implemented**:
  - **Live Server-Sent Events (SSE)**: Streaming endpoint `GET /api/events/stream` and historical JSON endpoint `GET /api/events` with circular ring buffer memory (120 events).
  - **Client Telemetry Ingestion**: Robot frontend (`index.html`) automatically forwards all voice recognitions, wake transitions, AI decisions, and audio status to `POST /api/log`.
  - **KPI Metrics Cards**:
    - Robot State (`STANDBY`, `WAKING 7s`, `PICKING`, `QA_MODE`, `STOPPED`)
    - ESP32 REST Gateway status, uptime, and latency ping (~2ms)
    - AI Engine details (Gemini 3.5 Flash & Smart Local NLP)
    - Single Neural Voice status (`th-TH-PremwadeeNeural`)
    - Total event counters (Incoming, Outgoing, Audio)
  - **Hardware Command Dispatcher**: Direct REST action buttons for all 6 actions (`PICK` with chips for quick items, `HOME`, `STOP`, `CheckStatus`, `AnswerQuestion`, `StopQA`).
  - **Voice & Speech Tester**: Real-time test tools for `/speak` (PC speaker) and `/tts` (browser audio streaming).
  - **Voice Pipeline Simulation**: Simulate speech inputs to test strict wake gating and AI parsing.
  - **Interactive Stream Feed**: Direction badges (`INCOMING ⬇️`, `OUTGOING 📡`, `AI BRAIN 🧠`, `AUDIO 🔊`), JSON inspector, filter toolbar, auto-scroll toggle, clear stream, and JSON export.
  - **Shortcut [D]**: Pressing `D` on the robot screen opens the dashboard in a new tab.
  - **Refined Siri-Style Phrasing (เสียงเปรมวดี สำนวนเดิม)**: Restored concise, natural Siri-style responses ending in "ค่ะ/นะคะ" across `js/config.js`, `js/nlp.js`, `js/gemini.js`, and `js/speech.js` (e.g., `"ค่ะ"`, `"ว่าไงคะ"`, `"กำลังฟังอยู่ค่ะ"`, `"มีอะไรให้ช่วยไหมคะ"`, `"พร้อมค่ะ บอกมาได้เลย"`).

### Milestone 11: True 7-Second Window & Strict Wake Enforcement
- **True 7-Second Listening Window**:
  - `startWakeTimer(false)` is initiated directly inside `speakAI(greeting, onComplete)` completion callback.
  - The 7000ms countdown timer begins at the exact moment the greeting finishes speaking and the microphone unpauses, guaranteeing the user gets the true, full 7.0 seconds of listening time.
- **Strict Wake Gating ("ข้ามขั้นตอนไม่ได้")**:
  - Any voice utterance spoken while `isAwake === false` that does not contain a wake keyword (`hello nexxa`, `hey nexxa`, `nexxa`, `เน็กซ่า`) is strictly rejected and logged with `💤 SLEEPING / LOCKED: ข้ามขั้นตอนไม่ได้! ต้องปลุกด้วย "nexxa" ก่อนเริ่ม Action ใดๆ`.
  - No action (`PICK`, `HOME`, `STOP`, `CheckStatus`, `AnswerQuestion`) can ever execute without prior waking.
- **Strict Standby Timeout ("กลับไปเป็นปกติ เท่านั้น")**:
  - If 7 seconds expire without a command, the timeout callback resets `isAwake = false`, deactivates the face aura/visuals, plays the soft dismiss chime, and logs `💤 NEXXA TIMEOUT: ไม่ได้ยินคำสั่งภายใน 7 วินาที -> กลับสู่สถานะ Standby ปกติ เท่านั้น`.
- **Automated Verification**:
  - `node test_system.js` expanded to 50 automated tests with 100% pass rate.

---

## 4. REST API Reference

| Endpoint | Method | Params / Body | Description |
| :--- | :--- | :--- | :--- |
| `/command` | POST | `{"action": "...", "target": "..."}` | **Primary standard** for controlling robot hardware (`PICK`, `HOME`, `STOP`, `CheckStatus`). |
| `/command` | GET | `action`, `target` | Query-based command endpoint (fallback / browser test). |
| `/speak` | GET | `text` | Plays TTS audio out of PC speakers and returns duration JSON (Single voice: `th-TH-PremwadeeNeural`). |
| `/tts` | GET | `text` | Streams MP3 audio data directly to client. |
| `/status`, `/ping` | GET | None | Health check returning uptime and device mock status. |
| `/api/events/stream` | GET | None | Server-Sent Events (SSE) live telemetry stream. |
| `/api/events` | GET | None | Fetches recent telemetry event history (JSON). |
| `/api/log` | POST | `{"type":"...", "direction":"...", ...}` | Ingests client-side events into telemetry stream. |
| `/api/events/clear` | POST | None | Clears in-memory telemetry event history. |
| `/dashboard`, `/dashboard.html` | GET | None | Serves the interactive Telemetry & Command Dashboard. |

---

## 5. Verification Checklist
- [x] Web server runs on `http://localhost:8000`
- [x] Zero-clutter OLED face display matching `ai_ui.png`
- [x] Synchronized lipsync mouth animation and eye bounce during speech
- [x] Single neural voice (`th-TH-PremwadeeNeural`) standardized across frontend & backend
- [x] Google AI Studio (Gemini 3.5 Flash) dynamic reasoning
- [x] ESP32 REST command processing (`PICK`, `HOME`, `STOP`, `CheckStatus`, `AnswerQuestion`, `StopQA`)
- [x] Action `CheckStatus`: Verifies ESP32 board health and readiness
- [x] Action `AnswerQuestion`: Continuous Q&A mode until "ให้หยุดตอบ"
- [x] Strict Wake Gating: Cannot execute action without `wakeKeywords` ("ข้ามขั้นตอนไม่ได้")
- [x] True 7-second auto-standby countdown starting right after greeting speech finishes ("กลับไปเป็นปกติ เท่านั้น")
- [x] Fixed "All inputs trigger PICK" bug: Zero accidental PICK on general conversation
- [x] 100% modular frontend architecture (`css/`, `js/`)
- [x] Real-time Telemetry & Command Dashboard (`dashboard.html`)
- [x] Live SSE event stream & client telemetry forwarding (`/api/log`)
- [x] Comprehensive Dashboard Audit: Enter key shortcuts, Blob JSON export, scope chip selection, live robot simulation sync
- [x] 50/50 tests passed (100%) in `test_system.js`

### Milestone 14: Multi-Command Continuous Session & Zero-Latency Wake Flow
- **Problem**:
  1. เมื่อพูดคำปลุก (Wake Word เช่น "nexxa") หุ่นยนต์พูดตอบรับประโยคยาว โดยฟังก์ชัน `speakAI` สั่งหยุดการทำงานของไมโครโฟน (`pauseRecognition`), ทำให้เกิดช่วง Dead Zone ประมาณ 1-2 วินาที หากผู้ใช้สั่ง "ไปหยิบขวดน้ำ" ทันที คำสั่งจะหลุดหาย ทำให้ต้องพูดคำปลุกซ้ำ
  2. เมื่อหุ่นยนต์ทำ Action เสร็จ (เช่น หยิบขวดน้ำ หรือเช็คสถานะ) ระบบเดิมจะสั่ง `resetToStandby(true)` ทันที ทำให้หุ่นยนต์หลับทันทีหลังพูดจบ ผู้ใช้จึงไม่สามารถสั่งคำสั่งต่อเนื่อง เช่น "กลับฐาน" หรือ "หยุดเดี๋ยวนี้" ได้โดยไม่ต้องปลุกใหม่
- **Implementation & Solution**:
  1. **Non-Blocking Continuous Microphone**: ยกเลิกการปิดไมโครโฟนระหว่างเล่นเสียงพูด ช่วยให้เบราว์เซอร์รับฟังเสียงต่อเนื่องโดยไม่มี Dead Zone
  2. **Speaker Echo Cancellation & Instant Barge-In**: ตรวจจับเสียงสะท้อนจากลำโพงเพื่อกรองทิ้ง และหากผู้ใช้พูดคำสั่งแทรก (Barge-In) ระบบจะหยุดเสียงเดิมทันที (`stopAudioPlayback`) และประมวลผลคำสั่งของผู้ใช้ได้ทันที
  3. **Ultra-Snappy Wake Greeting**: ปรับคำตอบรับให้กระชับ ("ค่ะ", "ว่าไงคะ", "พร้อมค่ะ") และเริ่มเปิดเวลารับคำสั่ง 7 วินาที (`startWakeTimer(false)`) ทันทีที่ตรวจพบคำปลุก
  4. **Multi-Command Active Session**: หลังจบการสั่งการและการตอบรับของหุ่นยนต์ในแต่ละ Action (`PICK`, `HOME`, `CheckStatus`, `STOP`, `NONE`) ระบบจะรีเซ็ตเวลารอรับคำสั่ง 7 วินาทีใหม่อัตโนมัติ ทำให้ผู้ใช้สามารถสั่งคำสั่งต่อเนื่องได้ทันที:
     - `"ไปหยิบขวดน้ำ"` (หรือ `"ไปหยิบขวด"`)
     - `"เช็คสถานะ"`
     - `"ตอบคำถามหน่อย"`
     - `"กลับฐาน"`
     - `"หยุดเดี๋ยวนี้"`
     โดยไม่ต้องพูดคำปลุกซ้ำทุกรอบ! หากไม่มีคำสั่งเพิ่มเติมภายใน 7 วินาที หุ่นยนต์จะกลับสู่ Standby ปกติโดยอัตโนมัติ
  5. **Extended Dictionary**: เพิ่มคำว่า `"ขวด"` (`bottle`) ในพจนานุกรมของ `js/nlp.js`
- **Verification**: ผ่านการทดสอบครบ 50/50 ข้อ (100% Pass) ใน `test_system.js`.

### Milestone 12: Dashboard Functionality Audit & Real-time Robot Sync
- **Audited & Fixed Dashboard Functions**:
  1. `setFilter(type, btn)`: Resolved `event.target` scope issue (`ReferenceError: event is not defined`), added `data-filter` bindings, and expanded filter criteria for client-side `BRAIN` and `AUDIO` categories.
  2. `toggleJson(id, btn)`: Added dynamic toggle for arrow label (`▶ ดูข้อมูล JSON ละเอียด` <-> `▼ ซ่อนข้อมูล JSON`).
  3. `selectChip(el, name)`: Scoped `.active` class removal to the parent chip container rather than globally across all panels.
  4. `exportEventsJson()`: Migrated from `data:text/json` URI to standard `Blob` & `URL.createObjectURL(blob)` for unlimited export size and stability.
  5. `updateKPIs(ev)`: Added real-time tracking for `isAwake` (listening countdown 7s) and `isQAMode` alongside hardware states.
  6. `addEventToFeed(ev)`: Excluded background `SYSTEM_PING` polling from cluttering the live user stream, and added event deduplication by ID.
  7. `Enter Key Support`: Added `onkeydown` Enter key submission on `targetInput`, `ttsInput`, and `simVoiceInput`.
  8. `Live Robot Voice Simulation Sync`: Wired `initRobotDashboardSync()` via SSE to `js/app.js`, enabling `simulateVoiceInput()` from the dashboard to trigger real voice pipeline execution, face animations, and lipsync on the active robot screen.

### Milestone 13: iPad Dribbble UI Dashboard Redesign
- **Design Source**: Replicated modern Dribbble iPad dashboard (`https://cdn.dribbble.com/userupload/48572926/file/5a5aaa92e29a6bbb4e06b0aa4e4c5a80.png?resize=1200x900&vertical=center`).
- **Visual & Layout Features**:
  1. **Top Bar**: Minimalist dark monogram (`N`), dark pill active item (`Dashboard`), light pill links (`Robot View`, `Projects`, `Analytics`), live SSE status pill with green beacon, notification bell with badge, and user avatar.
  2. **Top Left Card (Projects Timeline & Activities)**:
     - Horizontal project milestone track with interconnected status nodes (`Done`, `Active`, `Queue`).
     - Robot State Card (White card with badge, battery bar, and active action badge).
     - Solid Blue Accent Card for Quick Hardware Commands (`HOME`, `STOP`, `CHECK HEALTH`, `Q&A`).
  3. **Top Right Card (Task Status & 3D Cylinder Progress Bars)**:
     - Prominent large percentage metric (`98% Task Accuracy`).
     - Three realistic 3D Cylindrical Capsule Bars (Blue, Mint Green, Amber) with 3D elliptical tops and lighting gradient.
     - Live KPI breakdown (Voice Success, NLP Gating, Command Execution).
  4. **Bottom Left Card (Project Progress Gauge)**:
     - Semi-circular SVG Gauge Chart with smooth gradient sweep.
     - Center display with `76% Overall System Efficiency`.
     - Sub-metrics: Completed Tasks (32), In Progress (12), Queued (4).
  5. **Bottom Center Card (Today's Live Activity Stream)**:
     - Modern activity timeline feed with circular category icons (`⚡ REST`, `🗣 VOICE`, `🧠 AI`, `🔊 AUDIO`, `📡 HARDWARE`).
     - Filter pill buttons (`All`, `Voice`, `Hardware`, `Brain`, `Audio`).
     - Collapsible formatted JSON payload viewer (`toggleJson`).
  6. **Bottom Right Card (Team Insights & Realtime Clock)**:
     - Equalizer histogram bars simulating voice frequency & latency.
     - Large Live Digital Clock (`HH:MM:SS`) with live session timer.
     - Voice & TTS Quick Test controls.
  7. **Floating Quick Command Modal**:
     - Modern glassmorphism modal triggered by `+ Add New Task`.
     - Target chip picker (`bottle`, `cup`, `glass`, `book`, `phone`, `box`).
     - Live Voice Simulator triggering real speech pipeline in `index.html`.
 ### Milestone 14: Lipsync Audio Synchronization & Anti-Cutoff Optimization
- **Identified Issues**:
  1. **Audio Cutoff / Muting**: When the robot spoke, the continuous microphone listener remained active. Ambient room noise or speaker feedback was received by Web Speech API, triggering `stopAudioPlayback()` (Barge-In) and abruptly killing the robot's voice mid-sentence.
  2. **Lipsync Desync ("ปากขยับไปแล้วแต่ไม่ได้ยินเสียง")**:
     - `playDirectlyInBrowser` was buffering the entire MP3 with `fetch(url).then(res => res.blob())` before creating `new Audio()`, causing a 1.5–3s delay.
     - When failing or rejected by autoplay, `playViaServer` reported `{ status: 'playing' }` even if `PLAYER.play` returned duration 0, starting the mouth animation without actual sound.
     - `beginTalking()` was called before sound actually played out of hardware (e.g. Bluetooth/USB DAC wake-up delay).
- **Solutions & Optimizations**:
  1. **Recognition Pause During Speech**: `speakAI()` now immediately calls `window.pauseRecognition()`, stopping mic feedback while the robot talks. `resumeRecognition()` is cleanly called on playback finish.
  2. **Strict Barge-In Filter**: Ambient noise and casual speech while `isSpeakingNow = true` are ignored. Only explicit interrupt keywords (`หยุด`, `stop`, `พอแล้ว`, `ยกเลิก`, `nexxa`) can stop active audio playback.
  3. **Direct Audio Streaming**: Migrated `new Audio(audioUrl)` to native direct streaming (no blob buffering delay).
  4. **Strict Lipsync Gating**: Mouth animation (`beginTalking()`) strictly starts ONLY when audio fires the `playing` event or `currentTime > 0.02`. If playback fails or is rejected, mouth remains static.
  5. **Pre-warmed Female Neural Voice**: Configured `DEFAULT_VOICE = 'female'` in `server.js` matching `th-TH-PremwadeeNeural`, pre-caching all warmup phrases for sub-millisecond response.
  6. **Autoplay Permission Unlock**: Added dummy audio unlock in `unlockMobileExperience` to permanently grant browser audio playback privileges.
### Milestone 15: Single Consistent Voice Lock & Effortless Multi-Modal Waking
- **User Feedback Addressed**:
  1. **"เสียงที่ตอบไม่เหมือนเดิมสักครั้ง ต้องการให้ตอบกลับมาเป็นเสียงเดียว"**:
     - Ensured 100% single authoritative voice: locked strictly to **`th-TH-PremwadeeNeural`** (Edge Neural Female) across all endpoints and components.
     - Normalized wake greeting phrase to a single, consistent, polite word: **`"ค่ะ"`** (`nexxaGreetings = ["ค่ะ"]`), eliminating random variations like "ว่าไงคะ" or "พร้อมค่ะ".
  2. **"พอจะปลุกยากมากเลย มีวิธีแก้ไขมั้ย"**:
     - **Phonetic & Regex Wake Matching**: Added fuzzy matching supporting natural Thai and English transliterations (`เน็กซ่า`, `เนกซ่า`, `เน็กซา`, `เน็กซ์`, `เน็ค`, `เร็กซ่า`, `เล็กซ่า`, `เอ็กซ่า`, `nexxa`, `nexa`, `nex`, `rexza`) and natural greetings (`สวัสดี`, `หวัดดี`, `ฮัลโหล`, `เฮลโล`, `เฮ้`, `ตื่น`).
     - **Tap-to-Wake**: Tapping/clicking anywhere on the screen immediately wakes the robot (`startWakeTimer(true)`), plays the Siri chime, and responds "ค่ะ" ready for 7s command window.
     - **Spacebar / N Key to Wake**: Pressing Spacebar or `N` on the keyboard wakes the robot instantly.
- **Verification**: 50/50 automated tests passed (100%) in `test_system.js`.

### Milestone 16: Zero-Click Immediate Ready State (No Tap Required)
- **User Feedback Addressed**:
  - *"ไม่ต้องการให้แตะจอเพื่อทำงานหรือเริ่มระบบ แค่เข้าหน้า UI ก็พร้อมทำงานแล้ว"*
- **Implementation**:
  1. **Removed Tap Prompt Overlay**: Completely removed `<div class="tap-prompt">แตะหน้าจอเพื่อเริ่มระบบ</div>` from `index.html`.
  2. **Automated Zero-Click Activation (`initZeroClickExperience`)**:
     - System automatically initializes audio context, unlocks HTML5 audio playback, requests Screen Wake Lock, and activates continuous Speech Recognition immediately on `DOMContentLoaded`.
     - User never needs to tap, touch, or click the screen to start the robot.
     - Just entering or opening the webpage (`http://localhost:8000`) puts the robot in 100% active listening state ready to respond to voice commands immediately.
- **Verification**: 50/50 automated tests passed (100%) in `test_system.js`.

### Milestone 18: Action Dashboard to Robot UI Sync & Real-Time Interaction
- **User Feedback Addressed**:
  - *"เเก้ไขหน้า action dashboard ถ้ามีการส่งกดaction ให้เข้ามาที่หน้า uiได้เเละต้องมีการโต้ตอบด้วย"*
- **Root Cause & Discovery**:
  - `dashboard.html` had action buttons (`sendActionCommand('PICK')`, `HOME`, `STOP`, `CheckStatus`, `AnswerQuestion`, `StopQA`) posting to `/command`.
  - Server broadcasted `ev.type === 'HARDWARE_COMMAND'`, but in `js/app.js` (`initRobotDashboardSync`), only `SIMULATED_VOICE` was being handled. `index.html` ignored all `HARDWARE_COMMAND` events, leaving the robot face silent and dormant when buttons on the dashboard were pressed.
- **Implementation**:
  1. **Source Tracking & Infinite Loop Prevention**:
     - `server.js` tracks `fromDashboard` and `fromRobotUI` flags in GET/POST `/command` and broadcasts them in SSE events.
     - `js/esp32.js` sends `fromRobotUI: true` so local actions don't re-trigger itself.
     - `dashboard.html` sends `&fromDashboard=1` and `X-From-Dashboard: 1`.
  2. **Robot UI Real-Time Interaction (`handleDashboardActionCommand` in `js/app.js`)**:
     - When an action is clicked on the dashboard:
       - **Awake & Aura**: Face immediately wakes up (`isAwake = true`), aura glows neon cyan/violet, and Siri earcon chime plays.
       - **Floating HUD Banner**: Shows sleek futuristic banner (`#actionBanner`) with action name and icon (e.g. `📦 คำสั่งหยิบสิ่งของ: ขวดน้ำ`, `🏠 กลับสู่ฐานชาร์จ (HOME)`).
       - **Spoken Voice Confirmation**: Speaks using the authoritative female neural voice (`th-TH-PremwadeeNeural`):
         - `PICK`: *"กำลังไปหยิบ[สิ่งของ]ให้ค่ะ"*
         - `HOME`: *"กำลังกลับไปที่ฐานค่ะ"*
         - `STOP`: *"หยุดการทำงานเรียบร้อยแล้วค่ะ"* (instantly halts audio)
         - `CheckStatus`: *"อุปกรณ์ ESP32 พร้อมใช้งานค่ะ สถานะออนไลน์ปกติค่ะ"*
         - `AnswerQuestion`: *"เข้าสู่โหมดตอบคำถามแล้วค่ะ ถามคำถามได้เลยค่ะ"* (activates continuous Q&A mode)
         - `StopQA`: *"รับทราบค่ะ หยุดตอบคำถามแล้วค่ะ"* (cleanly resets to standby)
       - **Lipsync Face Animation**: Mouth automatically animates with real-time SVG lipsync during speech.
  3. **Dashboard Quick Actions Enhancement**:
     - Added `StopQA (หยุดตอบ)` button to the Quick Actions card on `dashboard.html` for complete action symmetry.
- **Verification**:
  - 100% automated test pass in `test_dashboard_action_sync.js`.
  - 50/50 automated test pass in full regression suite `test_system.js`.

### Milestone 19: Top Navbar Removal from Dashboard
- **User Request**: *"เเละเอาnavbar ออก"*
- **Implementation**:
  - Completely removed `<header class="top-navbar">` from [`dashboard.html`](file:///D:/Nexxa/dashboard.html).
  - Integrated essential controls (`#streamStatusBadge`, `#streamStatusText`, `🤖 Robot Screen`, `🎙️ Voice Sim`, `⚡ Action Command`) directly into the header of the primary Projects Timeline card.
  - Added null-checks to `initEventStream` so SSE status updates remain stable and resilient.
- **Verification**:
  - 50/50 automated test pass in `test_system.js`.

### Milestone 20: Dedicated Stream Filtering for Incoming Input & Outgoing ESP32 Commands
- **User Request**: *"ต้องการเห้นเเค่ input ที่เข้ามาเเละที่ส่งออกไปให้ esp32"*
- **Implementation**:
  - **Eliminated Stream Noise**:
    - Disengaged internal debug logs (`CLIENT_VOICE_EVENT`) in `logInfo` from broadcasting to telemetry.
    - Updated `server.js` to tag audio playback (`AUDIO_SPEAK`, `AUDIO_TTS_STREAM`) as `direction: 'AUDIO'` instead of `'OUTGOING'`, reserving `'OUTGOING'` strictly for hardware commands sent to ESP32.
  - **Dedicated User Input Telemetry**:
    - Speech recognition (`recognition.onresult` in `js/speech.js`) and keyboard/tap simulations explicitly broadcast `type: 'USER_INPUT', direction: 'INCOMING'`.
  - **Dashboard Activity Feed Gating**:
    - Filter tabs updated to 3 clean categories: **ทั้งหมด (Input + ESP32)**, **⬇️ Input รับเข้า**, and **📡 ESP32 ส่งออก**.
    - `isInputOrEsp32(ev)` strictly admits only:
      1. Incoming human speech / user input (`USER_INPUT`, `SIMULATED_VOICE`)
      2. Outgoing hardware commands to ESP32 (`HARDWARE_COMMAND`)
    - Cards rendered in `streamFeed` cleanly display either `🗣️ INPUT (คำพูดรับเข้า)` with the speech transcript or `📡 ส่งคำสั่งฮาร์ดแวร์ ESP32` with action, target, and status.
    - KPI counter updated to display: `Input: X | ESP32: Y`.
- **Verification**:
  - 50/50 automated tests pass in `test_system.js`.
  - Verified live JSON payload and SSE stream filtering.

### Milestone 21: Comprehensive Production Speech & Voice Interaction Test Suite
- **User Request**:
  - `"/goal เพิ่มการเทสทดสอบพูดให้ครบคลุมเพื่อไม่ให้มันรวนเมื่อไปใช้งานจริงเเละให้ครอบคลุมที่สุดเมื่อขึ้นprodจริง"`
- **Goal Achieved**:
  - Built an exhaustive production-grade test suite ([`test_speech_production.js`](file:///D:/Nexxa/test_speech_production.js)) and hardened both [`js/nlp.js`](file:///D:/Nexxa/js/nlp.js) and [`js/speech.js`](file:///D:/Nexxa/js/speech.js) to guarantee 100% resilience against real-world Thai and English speech quirks, unspaced text, acoustic misrecognitions, and concurrency load.
- **Key Enhancements & Real-World Bug Fixes**:
  1. **Thai Unicode Substring Overlap Fix**:
     - *Bug Discovered*: In Thai orthography, vowel `เ` precedes consonants. Thus `"เปิดโหมดถามตอบ"` contains the substring `"ปิดโหมดถามตอบ"` (`เ-ป-ิ-ด` contains `ป-ิ-ด`). This caused `"เปิดโหมดถามตอบ"` (open Q&A) to mistakenly trigger `StopQA` (close Q&A).
     - *Fix*: Added affirmative intent guard (`!lower.includes('เปิด') && !lower.includes('เริ่ม')`) to `StopQA` check.
  2. **Charging Base vs. Charger Item Disambiguation**:
     - *Bug Discovered*: `"ช่วยหยิบสายชาร์จ"` and `"ช่วยหยิบที่ชาร์จ"` contained `"ชาร์จ"`, triggering `HOME` (return to dock) before reaching `PICK`.
     - *Fix*: Narrowed `HOME` charging intent to `"ไปชาร์จ"`, `"ชาร์จแบต"`, `"ชาร์จไฟ"`, and explicitly exempted `"สายชาร์จ"` and `"ที่ชาร์จ"` from base return.
  3. **Non-Latin Regex Character Class Fallback Fix**:
     - *Bug Discovered*: The regex `[^\sให้มาทีครับค่ะคะ]+` contained individual letters like `ม`, `ห`, and `า` in a negated character class. As a result, arbitrary words containing those letters (e.g. `พัดลม`, `หมวก`, `หน้ากาก`) were cut off or rejected.
     - *Fix*: Replaced negated character class with robust prefix verb matching and polite suffix stripping (`rest.replace(/(หน่อยครับ|หน่อยค่ะ|...)+$/g, '')`).
  4. **Phonetic Replacement Double-Suffix Fix**:
     - *Bug Discovered*: Replacing phonetic abbreviation `"เช็คสถา"` with `"เช็คสถานะ"` transformed `"เช็คสถานะ"` into `"เช็คสถานะนะ"`.
     - *Fix*: Added negative lookahead: `t.replace(/(เช็คสะถานะ|ตรวจสะถานะ|เช็คสถา(?!นะ))/gi, 'เช็คสถานะ')`.
  5. **Thai Polite Wake Gating without ASCII Word Boundaries**:
     - *Bug Discovered*: Regex `\b` fails on Thai non-ASCII characters. Calling `"เน็กซ่าครับ"` or `"เน็กซ่าค่ะ"` failed `\b` matching and fell through as an action.
     - *Fix*: Implemented Thai-compatible polite wake matcher `/^(ครับ|ค่ะ|คะ|จ๋า|ฮะ|จ๊ะ|นะ|หน่อยครับ|หน่อยค่ะ|หน่อย|please|\s)+$/i`. Polite wake calls now reliably reply `"ค่ะ"` and open the 7-second listening window.
  6. **Audio Barge-In & Echo Cancellation**:
     - Implemented `stopAudioPlayback()` in [`js/audio.js`](file:///D:/Nexxa/js/audio.js) and wired it into [`js/speech.js`](file:///D:/Nexxa/js/speech.js).
     - Ambient noise and speaker feedback while talking are strictly ignored, preventing audio stutter.
     - Explicit stop words (`หยุด`, `stop`, `พอแล้ว`, `ยกเลิก`, `nexxa`) instantly halt audio playback.
  7. **High Concurrency & Stress Verification**:
     - Fired 20 concurrent `/tts` streaming requests and 10 concurrent `/speak` native playback requests.
     - Verified zero EPERM / file-locking errors and 100% consistent `th-TH-PremwadeeNeural` single-voice delivery.
- **Verification**:
  - `test_speech_production.js`: **14/14 test groups passed (100%)**, covering 150+ real-world utterances.
  - `test_system.js`: **50/50 baseline tests passed (100%)**.

### Milestone 22: Formal Project Objectives & Mission Scope Full Implementation (100% Coverage)
- **User Specifications**:
  - **4 Objectives**:
    1. Develop AI to receive commands and interact appropriately with the user.
    2. User can command robot: start line tracking, stop, move objects, robotic arm pick and place.
    3. AI reports status, execution results, and errors to the user.
    4. Robot control must be convenient, safe, and intuitive.
  - **8 Scope Items**:
    1. Communication via text (Dashboard Chat) and voice (Always-On Listener).
    2. AI parses user intent into specific robot commands within defined scope.
    3. Core commands: `START_LINE_TRACK`, `STOP_LINE_TRACK`, `NAVIGATE_TO` (stations), `PICK`, `PLACE`, `MOVE_OBJECT`, `CheckStatus`, `STOP` (emergency).
    4. AI verbally confirms commands before starting execution, especially hazardous tasks (`"ยืนยันคำสั่งค่ะ กำลัง..."`).
    5. Real-time status reporting: moving, reached destination, picking, placing, task completed, or task failed.
    6. Clarify ambiguous commands: if user command is underspecified (e.g. "ช่วยหยิบหน่อย", "ช่วยย้ายของ", "ไปส่งหน่อย", "ช่วยวางหน่อย"), AI asks clarifying questions before operating.
    7. Safety fault detection: if obstacle, object dropped from arm, or line-off-track detected, halt immediately and alert user (`SAFETY_ALERT`).
    8. Scoped control: AI strictly manages project robot operations, answering out-of-scope queries with mission role boundary.
- **Key Implementations & Real-World Fixes**:
  1. **Local NLP Engine Expansion ([`js/nlp.js`](file:///D:/Nexxa/js/nlp.js))**:
     - Added `START_LINE_TRACK` & `STOP_LINE_TRACK` intent recognition.
     - Added `NAVIGATE_TO` with defined stations (`station_a`, `station_b`, `station_c`, `station_1`, `station_2`, `station_3`, `pickup_point`, `drop_point`).
     - Added robotic arm `PLACE` and multi-parameter `MOVE_OBJECT` (extracting item and destination station).
     - Added `CLARIFY` intent for underspecified pick, place, move, and station commands.
     - Added `SAFETY_ALERT` intent for obstacle, dropped object, and line-off-track faults.
     - Built `isClarifyMatch` helper with regex guard `/^(ครับ|ค่ะ|คะ|นะ|จ๊ะ|จ้า|สิ|เลย|\s|$)/` to eliminate Thai mai-ek vowel prefix collisions (e.g. `"ช่วยหยิบที"` falsely matching `"ช่วยหยิบที่ชาร์จ"`).
     - Fixed station name substring collision where `"เดินทางไปจุดส่งของ"` matched `'ส่ง'` in the station name.
  2. **Gemini 3.5 Flash Alignment ([`js/gemini.js`](file:///D:/Nexxa/js/gemini.js))**:
     - System prompt updated with formal objectives, all 9 hardware actions, safety confirmation requirement, and clarification behavior.
  3. **Backend Server REST Integration ([`server.js`](file:///D:/Nexxa/server.js))**:
     - Expanded `/command` dispatcher to handle `START_LINE_TRACK`, `STOP_LINE_TRACK`, `NAVIGATE_TO`, `PLACE`, `MOVE_OBJECT`, `SAFETY_ALERT`, and `CLARIFY`.
  4. **Firmware Updates ([`esp32_example.ino`](file:///D:/Nexxa/esp32_example.ino) & [`src/main.cpp`](file:///D:/Nexxa/src/main.cpp))**:
     - Added hardware handlers for all new actions, updating status strings and LED indicators.
  5. **Dashboard & UI Enhancements ([`dashboard.html`](file:///D:/Nexxa/dashboard.html) & [`js/app.js`](file:///D:/Nexxa/js/app.js))**:
     - Added interactive buttons for Line Tracking, Stations, Robotic Arm, Safety Alert simulators, and a live Text Chat box satisfying Scope Item 1.
     - Added HUD alerts and neural voice confirmation across all new actions.
- **Verification & Test Coverage**:
  - [`tests/test_nexxa_mission_scope.js`](file:///D:/Nexxa/tests/test_nexxa_mission_scope.js): **18/18 passed (100%)** covering all 8 scope items and 4 objectives.
  - [`tests/test_speech_production.js`](file:///D:/Nexxa/tests/test_speech_production.js): **14/14 passed (100%)**.
  - [`tests/test_system.js`](file:///D:/Nexxa/tests/test_system.js): **50/50 passed (100%)**.

### Milestone 23: Dedicated `tests/` Directory & Master Test Runner
- **User Request**: *"เเยก test เป็นอีก folder นึง"*
- **Implementation**:
  - Created dedicated `tests/` directory and migrated all test suites:
    1. [`tests/test_system.js`](file:///D:/Nexxa/tests/test_system.js): Full modular regression suite (50 tests).
    2. [`tests/test_nexxa_mission_scope.js`](file:///D:/Nexxa/tests/test_nexxa_mission_scope.js): Formal scope & objectives validation suite (18 tests).
    3. [`tests/test_speech_production.js`](file:///D:/Nexxa/tests/test_speech_production.js): Real-world speech hardening suite (14 groups).
    4. [`tests/test_dashboard_action_sync.js`](file:///D:/Nexxa/tests/test_dashboard_action_sync.js): Dashboard action & UI sync suite.
    5. [`tests/run_all.js`](file:///D:/Nexxa/tests/run_all.js): Master test runner executing all suites sequentially with formatted summary.
  - Updated all relative path references across all test scripts to resolve via `ROOT_DIR = path.resolve(__dirname, '..')`, allowing execution from any directory.
  - Updated [`package.json`](file:///D:/Nexxa/package.json) scripts:
    - `"test"`: `node tests/test_system.js`
    - `"test:all"`: `node tests/run_all.js`
    - `"test:scope"`: `node tests/test_nexxa_mission_scope.js`
    - `"test:speech"`: `node tests/test_speech_production.js`
    - `"test:dashboard"`: `node tests/test_dashboard_action_sync.js`
  - Cleaned up obsolete test files from the root workspace directory.
- **Verification**:
  - `node tests/run_all.js`: All 4 suites passed 100%.
  - `npm.cmd test`: 50/50 passed 100%.

### Milestone 24: Bidirectional ESP32 Hardware Task Feedback & 15-Second Wake Window
- **User Requests**:
  1. *"ถ้าฉันอยากเเก้ไข action หรือ pick ไปเเล้วรอดูสถานะว่าสามารถหยิบได้มั้ยทำยังไงดี"*
  2. *"ทำให้รองรับไว้เพื่อเเก้ไขในอนาคตเเละฉันทำเเค่หัวสมองการทำงานเท่านั้นเเละต้องเอาไปเชื่อมกับ esp32ตัวจริง ทำให้รองรับไว้หน่อย"*
  3. *"เปลี่ยน [⏳ NEXXA LISTENING] Nexxa พร้อมรับฟัง! กำลังรอรับคำสั่งภายใน 7 วินาที... เป็น 15 วิ"*
- **Implementation**:
  - **15-Second Listening Window**:
    - Updated `WAKE_TIMEOUT_MS = 15000;` in [`js/config.js`](file:///D:/Nexxa/js/config.js).
    - Updated all prompt logs, tap-to-wake logs, and keyboard shortcuts in [`js/speech.js`](file:///D:/Nexxa/js/speech.js) and [`js/app.js`](file:///D:/Nexxa/js/app.js) to 15 seconds.
    - Updated dashboard status pill and milestone badges to 15s in [`dashboard.html`](file:///D:/Nexxa/dashboard.html).
    - Updated all 4 test suites to assert and validate the 15,000 ms window.
  - **Bidirectional Hardware Feedback Loop**:
    - Server: Added `POST /api/robot_status` and `GET /api/robot_status` endpoints in [`server.js`](file:///D:/Nexxa/server.js) to receive `{status, action, target, error, battery}` from physical ESP32 and broadcast via SSE `ROBOT_TASK_RESULT`.
    - Client: Added `handleRobotTaskResult(ev)` in [`js/app.js`](file:///D:/Nexxa/js/app.js) triggering authoritative female voice feedback (e.g. *"หยิบขวดน้ำเรียบร้อยแล้วค่ะ"* on SUCCESS, *"เกิดข้อผิดพลาด ไม่สามารถหยิบขวดน้ำได้ค่ะ"* on FAILED).
    - Firmware: Implemented `reportTaskResultToBrain()` in both [`esp32_example.ino`](file:///D:/Nexxa/esp32_example.ino) and [`src/main.cpp`](file:///D:/Nexxa/src/main.cpp) using `HTTPClient`.
    - Dashboard: Added Section 3.5 "จำลองสถานะตอบกลับจาก ESP32" for testing feedback without physical hardware.
- **Verification**:
  - `node tests/test_dashboard_action_sync.js`: Passed 100%.

### Milestone 25: Comprehensive MS Word Technical Integration Manual (.docx)
- **User Request**: *"/goal ทำเอกสารให้หน่อยเป็น ms word เช่นพวกการรับบค่าส่งค่าต้องละเเอียดคนอื่ยมาอ่านสามารถเอาไปปใช้งานได้เลย"*
- **Implementation**:
  - Generated professional Microsoft Word document: [`Nexxa_AI_Brain_ESP32_Integration_Manual.docx`](file:///D:/Nexxa/Nexxa_AI_Brain_ESP32_Integration_Manual.docx) (58+ KB).
  - Also generated companion Markdown reference: [`Nexxa_AI_Brain_ESP32_Integration_Manual.md`](file:///D:/Nexxa/Nexxa_AI_Brain_ESP32_Integration_Manual.md).
  - Designed specifically as an **Interface Control Document (ICD)** so external hardware engineers or new developers can immediately understand and integrate without guessing:
    1. **Architecture & Philosophy**: Brain (PC/Node.js) ⟷ REST/SSE ⟷ Physical Actuators (ESP32).
    2. **Network Topologies**: Local Wi-Fi router vs SoftAP, static IP, port 8000 & 80.
    3. **Sending Commands (Brain -> ESP32)**: `POST /command` full action dictionary (`START_LINE_TRACK`, `STOP_LINE_TRACK`, `NAVIGATE_TO`, `PICK`, `PLACE`, `MOVE_OBJECT`, `HOME`, `STOP`, `CheckStatus`), payload schemas, cURL examples.
    4. **Receiving Status Feedback (ESP32 -> Brain)**: `POST /api/robot_status` schema (`SUCCESS`, `FAILED`, `OBSTACLE`), AI voice reaction mapping table.
    5. **Real-Time SSE Streaming**: `/events` event dictionary (`ROBOT_COMMAND`, `ROBOT_TASK_RESULT`).
    6. **Hardware Pinout & Wiring**: ESP32 GPIO assignments for Motor Driver (L298N), Arm Servos (Base, Shoulder, Elbow, Gripper), TCRT5000 Line Sensors, and HC-SR04 Ultrasonic. Crucial Common Ground & separate power supply rules.
    7. **Production C++ Code**: Complete copy-paste ready Arduino C++ firmware with WiFi, WebServer, and `reportTaskResultToBrain()`.
    8. **Testing & Commissioning**: Dashboard simulators, cURL tests, end-to-end voice test checklist.
    9. **Troubleshooting & FAQs**: Brownout resets, IP mismatch, CORS, and audio feedback protection.
- **Verification**:
  - Validated docx generation via Python `docx` library and verified file integrity on disk.
  - All automated test suites continue to pass 100%.
