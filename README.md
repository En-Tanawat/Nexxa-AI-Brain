# Nexxa AI Brain (หุ่นยนต์ผู้ช่วยอัจฉริยะเน็กซ่า)

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg)](tests/)
[![Voice](https://img.shields.io/badge/TTS-Edge%20Neural%20(Premwadee)-blueviolet.svg)](#voice-synthesis)
[![AI Engine](https://img.shields.io/badge/AI-Gemini%203.5%20Flash%20Lite-orange.svg)](https://ai.google.dev/)

> **Nexxa AI Brain** คือระบบสมองกลปัญญาประดิษฐ์สั่งการด้วยเสียงภาษาไทยแบบเรียลไทม์ พร้อมหน้าจอแสดงผลใบหน้าหุ่นยนต์ OLED Cyber-Blue ออกแบบมาเพื่อทำหน้าที่เป็น **"ศูนย์กลางการประมวลผล (AI Central Brain)"** สื่อสารสองทิศทาง (Bidirectional REST & SSE) ควบคุมหุ่นยนต์ฮาร์ดแวร์กายภาพผ่านไมโครคอนโทรลเลอร์ **ESP32**

---

## คุณสมบัติเด่น (Key Features)

- **Always-On Zero-Click Voice Pipeline:** ระบบรับฟังเสียงภาษาไทยตลอดเวลา พร้อมทำงานทันทีเมื่อเปิดเบราว์เซอร์โดยไม่ต้องคลิกหน้าจอ
- **Strict Wake Word Gating (15s Window):** ป้องกันการสั่งงานโดยไม่ตั้งใจ ต้องปลุกด้วยคำว่า `"hello nexxa"`, `"nexxa"`, `"เน็กซ่า"` และเปิดหน้าต่างเวลารอรับคำสั่ง 15 วินาที
- **Cyber-Blue OLED Robot Face:** หน้าจอแสดงผลใบหน้าหุ่นยนต์ Responsive SVG ขยับตาและปากพูด (Lip-sync) สอดคล้องกับจังหวะเสียงสังเคราะห์
- **Authoritative Thai Neural Voice:** เปล่งเสียงพูดภาษาไทยสไตล์ธรรมชาติและน่าเชื่อถือด้วยเสียงเดี่ยวมาตรฐาน `th-TH-PremwadeeNeural` ผ่านระบบเสียงระบบปฏิบัติการ Windows (Bypass Browser Autoplay Restrictions)
- **Hybrid Intelligent Decision Making:** ถอดรหัสคำสั่งด้วย Google Gemini 3.5 Flash Lite พร้อมระบบ Local Smart NLP สำรองในกรณีออฟไลน์
- **Bidirectional Hardware Feedback Loop:** ส่งคำสั่งการเคลื่อนที่และแขนกลไปยัง ESP32 (`/command`) พร้อมรับรายงานผลลัพธ์ (`/api/robot_status`) เมื่อหยิบของสำเร็จหรือล้มเหลว เพื่อให้ AI พูดรายงานผู้ใช้โดยอัตโนมัติ
- **Real-Time Telemetry & Command Dashboard:** หน้าจอควบคุมและทดสอบระบบ (`dashboard.html`) พร้อมการสตรีมข้อมูลสดผ่าน Server-Sent Events (SSE)
- **100% Automated Test Coverage:** มีชุดทดสอบครอบคลุมทั้งระบบ Baseline, ขอบเขตภารกิจ (Mission Scope), สำเนียงเสียงพูด (Speech Hardening), และการซิงค์ข้อมูลฮาร์ดแวร์

---

## สถาปัตยกรรมระบบ (System Architecture)

```
[ ผู้ใช้งาน (User) ]
       │
       ▼ (1. ปลุกด้วย "เน็กซ่า" + สั่ง "ช่วยหยิบขวดน้ำ")
[ Web Speech API (Microphone) ]
       │
       ▼
[ Nexxa AI Brain (Node.js :8000) ]
       ├── (2. AI วิเคราะห์คำสั่ง: PICK -> ขวดน้ำ)
       ├── (3. สังเคราะห์เสียงตอบรับ: "กำลังไปหยิบขวดน้ำให้ค่ะ")
       │
       ▼ (4. ส่ง HTTP POST /command {"action":"PICK","target":"ขวดน้ำ"})
[ ESP32 Robot Hardware (:80) ]
       ├── (5. ควบคุมเซอร์โวกริปเปอร์หยิบขวดน้ำ)
       │
       ▼ (6. รายงานผล HTTP POST /api/robot_status {"status":"SUCCESS","action":"PICK","target":"ขวดน้ำ"})
[ Nexxa AI Brain (Node.js :8000) ]
       ├── (7. สังเคราะห์เสียงรายงานผลอัตโนมัติ: "หยิบขวดน้ำเรียบร้อยแล้วค่ะ")
       └── (8. รีเซ็ตเวลารอคำสั่งถัดไป 15 วินาที)
```

---

## โครงสร้างโฟลเดอร์โครงการ (Project Structure)

```text
Nexxa-AI-Brain/
├── index.html                   # หน้าจอหุ่นยนต์ OLED UI (SVG Face, Lipsync, Mic Listener)
├── dashboard.html               # แดชบอร์ดตรวจสอบสถานะและส่งคำสั่งทดสอบ (SSE Live Monitor)
├── server.js                    # Node.js Server (REST API, Native Audio /speak, Edge-TTS, SSE)
├── package.json                 # Node.js Dependencies & NPM Scripts
├── esp32_example.ino            # ซอร์สโค้ด Arduino C++ สำหรับ Flash ลงบอร์ด ESP32
├── src/main.cpp                 # ซอร์สโค้ด PlatformIO C++ พร้อม CORS
├── css/
│   └── style.css                # ดีไซน์สไตล์ Cyber-Blue OLED UI
├── js/
│   ├── config.js                # การตั้งค่าคำปลุก, เวลา 15s, เสียงเปรมวดี Neural
│   ├── face.js                  # ควบคุมแอนิเมชันตาและปากหุ่นยนต์ (OLED Face & Lipsync)
│   ├── audio.js                 # ระบบเล่นเสียง Chime และจัดการ Audio Buffer
│   ├── speech.js                # Web Speech API, Strict Wake Gating, 15s Timer
│   ├── nlp.js                   # Local NLP Regex Engine & Accidental Trigger Filters
│   ├── gemini.js                # Google AI Studio Gemini 3.5 Flash Integration
│   ├── esp32.js                 # HTTP Client สื่อสารกับ ESP32 Gateway
│   └── app.js                   # Main Controller เชื่อมประสานทุกโมดูลเข้าด้วยกัน
├── Nexxa_AI_Brain_ESP32_Integration_Manual.docx # คู่มือเชื่อมต่อระบบฉบับสมบูรณ์ (MS Word)
```

---

## เริ่มต้นใช้งาน (Getting Started)

### 1. ความต้องการของระบบ (Prerequisites)
- [Node.js](https://nodejs.org/) เวอร์ชัน 18.0.0 ขึ้นไป
- ระบบปฏิบัติการ Windows (สำหรับฟังก์ชัน Native Audio Playback ผ่าน `winmm.dll`)
- เว็บบราวเซอร์ Google Chrome หรือ Microsoft Edge
- บอร์ดไมโครคอนโทรลเลอร์ ESP32 (กรณีเชื่อมต่อกับหุ่นยนต์จริง)

### 2. การติดตั้ง (Installation)
```bash
# Clone repository
git clone https://github.com/En-Tanawat/Nexxa-AI-Brain.git
cd Nexxa-AI-Brain

# ติดตั้ง Dependencies
npm install
```

### 3. รันระบบ (Run the Brain)
```bash
# วิธีที่ 1: รันด้วยคำสั่ง Node
node server.js


## สเปกการส่ง-รับข้อมูลกับ ESP32 (API Specification)

ดูรายละเอียดฉบับเต็มพร้อมไดอะแกรมวงจรและตัวอย่างโค้ด C++ ได้ที่:
- [`Nexxa_AI_Brain_ESP32_Integration_Manual.md`](Nexxa_AI_Brain_ESP32_Integration_Manual.md) หรือไฟล์ MS Word [`Nexxa_AI_Brain_ESP32_Integration_Manual.docx`](Nexxa_AI_Brain_ESP32_Integration_Manual.docx)

### สรุปคำสั่งหลัก (Brain -> ESP32: `POST /command`):
- `START_LINE_TRACK`: สั่งให้หุ่นยนต์เริ่มเดินตามเส้น
- `STOP_LINE_TRACK`: สั่งให้หุ่นยนต์หยุดเดินตามเส้น
- `NAVIGATE_TO`: สั่งให้เดินทางไปยังสถานี (เช่น `station_a`, `station_b`)
- `PICK`: สั่งแขนกลหยิบวัตถุ (เช่น `ขวดน้ำ`, `กล่อง`)
- `PLACE`: สั่งแขนกลวางวัตถุ (เช่น `โต๊ะ`, `กล่อง`)
- `MOVE_OBJECT`: สั่งเคลื่อนย้ายวัตถุข้ามสถานี
- `HOME`: สั่งให้หุ่นยนต์เดินทางกลับแท่นชาร์จ
- `STOP`: สั่งหยุดฉุกเฉิน (Emergency Stop) ทันที
- `CheckStatus`: ตรวจสอบสถานะการเชื่อมต่อ

### สรุปการรายงานผล (ESP32 -> Brain: `POST /api/robot_status`):
```json
{
  "status": "SUCCESS",
  "action": "PICK",
  "target": "ขวดน้ำ",
  "battery": 88
}
```
*เมื่อสมองได้รับข้อความนี้ AI จะเปล่งเสียงสรุปให้ผู้ใช้ฟังทันที: `"หยิบขวดน้ำเรียบร้อยแล้วค่ะ"`*

---

## ใบอนุญาต (License)
โครงการนี้เผยแพร่ภายใต้ใบอนุญาต **MIT License**
