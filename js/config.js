/**
 * REXZA AI ROBOT - CONFIGURATION MODULE
 * -------------------------------------------------------------
 * กำหนดค่าคำปลุก (Strict Wake Keywords), เวลาหมดเวลา 15 วินาที,
 * เสียงสังเคราะห์มาตรฐานเดียว (เปรมวดี Neural), และการเชื่อมต่อ
 */

// คำปลุกตามข้อกำหนดระบุไว้โดยตรง พร้อมรูปแบบเสียงสะกดไทยที่พบบ่อยและคำทักทายมาตรฐาน:
const wakeKeywords = [
    "hello nexxa", "hey nexxa",
    "nexxa", "nexxa", "เน็กซ่า", "nexxa",
    "เนกซ่า", "เน็กซา", "เนกซา", "เน็กซัส", "เนกซัส",
    "ฮัลโหล เน็กซ่า", "ฮัลโหลเน็กซ่า", "เฮลโล เน็กซ่า", "เฮลโลเน็กซ่า", "เฮ้ เน็กซ่า", "เฮ้เน็กซ่า",
    "สวัสดี เน็กซ่า", "สวัสดีเน็กซ่า", "สวัสดี", "หวัดดี", "ฮัลโหล", "ฮาโหล", "เฮลโล", "เฮ้",
    "เน็ก", "เนก", "เน็กซ์", "เน็ค", "เร็กซ่า", "เล็กซ่า", "เอ็กซ่า", "ตื่น", "ตื่นได้แล้ว",
    "nexa", "nexsa", "nexus", "rexza", "rexa", "next"
];

// Cleaned list for matching (lowercase, trimmed, sorted by length descending so longer phrases match first)
const UNIQUE_WAKE_KEYWORDS = Array.from(new Set(wakeKeywords.map(w => w.trim().toLowerCase()))).sort((a, b) => b.length - a.length);

// หน้าต่างเวลารอคำสั่ง 15 วินาทีหลังถูกปลุก
const WAKE_TIMEOUT_MS = 15000;

// ระบบใช้เสียงเดียวมาตรฐาน (Microsoft Edge Neural: เปรมวดี)
const ROBOT_VOICE = 'female';
const ROBOT_VOICE_NAME = 'th-TH-PremwadeeNeural';

// สถานะและตัวแปรระบบ
let isAwake = false;
let isQAMode = false;
let wakeTimeoutTimer = null;
let isSpeakingNow = false;

// การตั้งค่า ESP32 และ Gemini AI
let esp32Url = localStorage.getItem('rexza_esp32_url') || 'http://192.168.1.100';
let aiMode = localStorage.getItem('rexza_ai_mode') || 'gemini';
let geminiKey = localStorage.getItem('rexza_gemini_key') || '';

// ตอบกลับเป็นเสียงเดียวและประโยคเดียวมาตรฐานเสมอ ("ค่ะ" เสียงเปรมวดี Neural สไตล์ Siri)
const nexxaGreetings = [
    "ค่ะ"
];
const siriGreetings = nexxaGreetings; // alias

// Helper ฟังก์ชันสำหรับ Console Logging และส่ง Telemetry เข้า Live Dashboard
function sendTelemetry(event) {
    if (typeof fetch === 'function') {
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        }).catch(() => {});
    }
}

function logInfo(badge, text, color = '#00f0ff') {
    console.log(`%c[${badge}] %c${text}`, `color: ${color}; font-weight: bold;`, 'color: #e2e8f0;');
}

// Global Console Commands
window.setEsp32Url = function(url) {
    esp32Url = url;
    localStorage.setItem('rexza_esp32_url', url);
    logInfo("ESP32 CONFIG", `เปลี่ยน URL เป็น: ${url}`, "#10b981");
};

window.setAiMode = function(mode) {
    if (['gemini', 'local'].includes(mode)) {
        aiMode = mode;
        localStorage.setItem('rexza_ai_mode', mode);
        logInfo("AI CONFIG", `เปลี่ยนโหมดสมองกลเป็น: ${mode}`, "#a855f7");
    }
};

window.setGeminiKey = function(key) {
    geminiKey = key;
    localStorage.setItem('rexza_gemini_key', key);
    logInfo("GEMINI KEY", "บันทึก API Key สำเร็จ", "#10b981");
};
