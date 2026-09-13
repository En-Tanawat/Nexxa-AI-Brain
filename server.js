const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const os = require('os');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 8000;
const START_TIME = Date.now();
const BASE_DIR = __dirname;
const CACHE_DIR = path.join(BASE_DIR, 'tts_cache');

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Neural Thai voices (Microsoft Edge TTS)
const VOICES = {
    'female': 'th-TH-PremwadeeNeural',
    'male': 'th-TH-NiwatNeural',
};
const DEFAULT_VOICE = 'female';

const WARMUP_PHRASES = [
    "สวัสดีค่ะ เน็กซ่าพร้อมรับคำสั่งค่ะ",
    "สวัสดีค่ะ พร้อมช่วยแล้วค่ะ มีอะไรให้ช่วยไหมคะ",
    "รับทราบค่ะ",
    "ค่ะ",
    "ว่าไงคะ",
    "กำลังฟังอยู่ค่ะ",
    "มีอะไรให้ช่วยไหมคะ",
    "พร้อมค่ะ บอกมาได้เลย",
    "กำลังไปหยิบขวดน้ำให้ค่ะ",
    "กำลังกลับไปที่ฐานค่ะ",
    "หยุดการทำงานเรียบร้อยแล้วค่ะ",
    "กำลังตรวจสอบสถานะอุปกรณ์ ESP32 ค่ะ",
    "เข้าสู่โหมดตอบคำถามแล้วค่ะ ถามคำถามได้เลยค่ะ",
    "รับทราบค่ะ หยุดตอบคำถามแล้วค่ะ",
    "ยกเลิกแล้วค่ะ"
];

// Load Edge TTS
let EdgeTTS = null;
try {
    const pkg = require('@andresaya/edge-tts');
    EdgeTTS = pkg.EdgeTTS;
    console.log('[*] Microsoft Edge Neural TTS: พร้อมใช้งาน');
} catch (e) {
    console.warn('[!] ไม่พบ @andresaya/edge-tts -> จะใช้ Google Translate TTS แทน');
}

// Telemetry & Event Stream for Live Dashboard
const EVENT_HISTORY = [];
const MAX_EVENTS = 120;
const SSE_CLIENTS = new Set();

function broadcastEvent(event) {
    if (!event) return;
    event.id = Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    event.timestamp = event.timestamp || new Date().toISOString();
    EVENT_HISTORY.unshift(event);
    if (EVENT_HISTORY.length > MAX_EVENTS) EVENT_HISTORY.pop();

    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of SSE_CLIENTS) {
        try {
            client.write(data);
        } catch (e) {
            SSE_CLIENTS.delete(client);
        }
    }
}

// Load Native Windows Audio via winmm.dll (koffi)
class SystemAudioPlayer {
    constructor() {
        this.available = process.platform === 'win32';
        this.alias = 'rexza_snd';
        this.mciSendStringA = null;

        if (this.available) {
            try {
                const koffi = require('koffi');
                const winmm = koffi.load('winmm.dll');
                this.mciSendStringA = winmm.func('int __stdcall mciSendStringA(str lpstrCommand, _Out_ uint8 *lpstrReturnString, uint uReturnLength, intptr_t hwndCallback)');
                console.log('[*] Windows Native Audio (winmm.dll via koffi): พร้อมใช้งาน');
            } catch (e) {
                console.warn('[!] ไม่สามารถโหลด koffi -> จะใช้ PowerShell เล่นเสียงแทน');
            }
        }
    }

    _mci(command) {
        if (!this.mciSendStringA) return { code: -1, str: '' };
        const buf = Buffer.alloc(256);
        const code = this.mciSendStringA(command, buf, 256, 0);
        const str = buf.toString('utf8').replace(/\0.*$/, '').trim();
        return { code, str };
    }

    play(filePath) {
        if (!this.available) return 0;
        const normalized = path.resolve(filePath).replace(/\\/g, '/');

        if (this.mciSendStringA) {
            this._mci(`close ${this.alias}`);
            const openRes = this._mci(`open "${normalized}" type mpegvideo alias ${this.alias}`);
            if (openRes.code !== 0) return 0;
            const lenRes = this._mci(`status ${this.alias} length`);
            this._mci(`play ${this.alias}`);
            const duration = parseInt(lenRes.str, 10);
            return !isNaN(duration) && duration > 0 ? duration : 2500;
        }

        // PowerShell Fallback
        try {
            const ps = `
                $w = Add-Type -MemberDefinition '[DllImport("winmm.dll")] public static extern int mciSendStringW(string a, System.Text.StringBuilder b, int c, IntPtr d);' -Name 'W' -Namespace 'M' -PassThru;
                $b = New-Object System.Text.StringBuilder 256;
                [void]$w::mciSendStringW('close rexza_snd', $b, 256, [IntPtr]::Zero);
                [void]$w::mciSendStringW('open "${normalized}" type mpegvideo alias rexza_snd', $b, 256, [IntPtr]::Zero);
                [void]$w::mciSendStringW('play rexza_snd', $b, 256, [IntPtr]::Zero);
                `;
            spawn('powershell', ['-NoProfile', '-Command', ps], { windowsHide: true });
            return 2500;
        } catch (e) {
            return 0;
        }
    }

    stop() {
        if (this.mciSendStringA) {
            this._mci(`close ${this.alias}`);
        } else if (this.available) {
            try {
                spawn('powershell', ['-NoProfile', '-Command', `
                $w = Add-Type -MemberDefinition '[DllImport("winmm.dll")] public static extern int mciSendStringW(string a, System.Text.StringBuilder b, int c, IntPtr d);' -Name 'WS' -Namespace 'MS' -PassThru;
                [void]$w::mciSendStringW('close rexza_snd', $null, 0, [IntPtr]::Zero);
`], { windowsHide: true });
            } catch (e) {}
        }
    }
}

const PLAYER = new SystemAudioPlayer();

function normalizeVoice(voice) {
    voice = (voice || '').toLowerCase().trim();
    return (voice in VOICES) ? voice : DEFAULT_VOICE;
}

async function googleTTS(text) {
    const encoded = encodeURIComponent(text);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encoded}`;
    const res = await fetch(ttsUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    if (!res.ok) throw new Error(`Google TTS failed: HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

async function edgeNeuralTTS(text, voiceId) {
    if (!EdgeTTS) throw new Error('EdgeTTS not available');
    const tts = new EdgeTTS({ voice: voiceId });
    await tts.synthesize(text, voiceId);
    return tts.toBuffer();
}

const IN_FLIGHT_TTS = new Map();

async function getTTSFile(text, voice) {
    voice = normalizeVoice(voice);
    const hash = crypto.createHash('md5').update(`${voice}|${text}`, 'utf8').digest('hex');
    const filePath = path.join(CACHE_DIR, `${voice}_${hash}.mp3`);

    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
        return filePath;
    }

    if (IN_FLIGHT_TTS.has(hash)) {
        return await IN_FLIGHT_TTS.get(hash);
    }

    const ttsPromise = (async () => {
        try {
            const voiceId = VOICES[voice];
            let audioBuffer = null;

            if (voiceId && EdgeTTS) {
                try {
                    audioBuffer = await edgeNeuralTTS(text, voiceId);
                } catch (err) {
                    console.warn(`[TTS Warning] Edge Neural TTS ล้มเหลว (${err.message}) -> ใช้ Google TTS แทน`);
                }
            }

            if (!audioBuffer || audioBuffer.length === 0) {
                audioBuffer = await googleTTS(text);
            }

            if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
                try {
                    fs.writeFileSync(filePath, audioBuffer);
                } catch (writeErr) {
                    if (!fs.existsSync(filePath)) {
                        console.error('[TTS Write Error]', writeErr.message);
                    }
                }
            }
            return filePath;
        } finally {
            IN_FLIGHT_TTS.delete(hash);
        }
    })();

    IN_FLIGHT_TTS.set(hash, ttsPromise);
    return await ttsPromise;
}

async function warmTTSCache() {
    for (const phrase of WARMUP_PHRASES) {
        try {
            await getTTSFile(phrase, DEFAULT_VOICE);
        } catch (e) {}
    }
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, payload, status = 200) {
    const body = Buffer.from(JSON.stringify(payload), 'utf8');
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': body.length,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
    });
    res.end(body);
}

function handleRobotCommand(res, action, target, fromDashboard = false, fromRobotUI = false) {
    const uptime = Math.floor((Date.now() - START_TIME) / 1000);
    console.log('\n' + '='.repeat(50));
    console.log('[ESP32 REST API] ได้รับคำสั่งควบคุม:');
    console.log(`   -> Action: ${action}`);
    console.log(`   -> Target: ${target}`);
    console.log(`   -> Source: ${fromDashboard ? 'DASHBOARD' : (fromRobotUI ? 'ROBOT_UI' : 'EXTERNAL')}`);

    let statusMsg = 'idle';
    if (action === 'PICK' || action.startsWith('PICK')) {
        console.log(`   >> กำลังสั่งฮาร์ดแวร์: แขนกลเคลื่อนที่ไปหยิบ '${target}'...`);
        statusMsg = 'picking';
    } else if (action === 'PLACE' || action.startsWith('PLACE')) {
        console.log(`   >> กำลังสั่งฮาร์ดแวร์: แขนกลวางวัตถุ '${target}'...`);
        statusMsg = 'placing';
    } else if (action === 'MOVE_OBJECT') {
        console.log(`   >> กำลังสั่งฮาร์ดแวร์: เคลื่อนย้ายวัตถุ '${target}'...`);
        statusMsg = 'moving_object';
    } else if (action === 'START_LINE_TRACK') {
        console.log('   >> กำลังสั่งฮาร์ดแวร์: เริ่มต้นการเดินตามเส้น (Line Tracking)...');
        statusMsg = 'line_tracking';
    } else if (action === 'STOP_LINE_TRACK') {
        console.log('   >> กำลังสั่งฮาร์ดแวร์: หยุดการเดินตามเส้น...');
        statusMsg = 'line_tracking_stopped';
    } else if (action === 'NAVIGATE_TO') {
        console.log(`   >> กำลังสั่งฮาร์ดแวร์: นำทางไปยังสถานี '${target}'...`);
        statusMsg = 'navigating';
    } else if (action === 'SAFETY_ALERT') {
        console.log(`   >> [SAFETY ALERT] แจ้งเตือนความปลอดภัยฮาร์ดแวร์: '${target}'!`);
        PLAYER.stop();
        statusMsg = 'safety_alert';
    } else if (action === 'CLARIFY') {
        console.log(`   >> สอบถามข้อมูลเพิ่มเติม: '${target}'`);
        statusMsg = 'clarifying';
    } else if (action === 'HOME') {
        console.log('   >> กำลังสั่งฮาร์ดแวร์: เคลื่อนที่กลับจุดเริ่มต้น (HOME)...');
        statusMsg = 'returning_home';
    } else if (action === 'STOP') {
        console.log('   >> หยุดการทำงานฉุกเฉิน (STOP)!');
        PLAYER.stop();
        statusMsg = 'stopped';
    } else if (action === 'CheckStatus') {
        console.log('   >> ตรวจสอบสถานะหุ่นยนต์ (CheckStatus): พร้อมใช้งาน');
        statusMsg = 'ready';
    } else if (action === 'AnswerQuestion') {
        console.log('   >> เข้าสู่โหมดตอบคำถาม (AnswerQuestion)...');
        statusMsg = 'qa_mode';
    } else if (action === 'StopQA') {
        console.log('   >> ออกจากโหมดตอบคำถาม (StopQA): กลับสู่ Standby');
        statusMsg = 'idle';
    } else {
        console.log(`   >> คำสั่งอื่นๆ: ${action}`);
        statusMsg = 'unknown';
    }
    console.log('='.repeat(50) + '\n');

    broadcastEvent({
        type: 'HARDWARE_COMMAND',
        direction: 'OUTGOING',
        action: action,
        target: target,
        robot_status: statusMsg,
        device: 'NEXXA-ESP32-SERVER-MOCK',
        uptime_sec: uptime,
        fromDashboard: Boolean(fromDashboard),
        fromRobotUI: Boolean(fromRobotUI)
    });

    sendJson(res, {
        status: 'success',
        received_action: action,
        target: target,
        robot_status: statusMsg,
        device: 'NEXXA-ESP32-SERVER-MOCK',
        uptime_sec: uptime,
        fromDashboard: Boolean(fromDashboard),
        fromRobotUI: Boolean(fromRobotUI),
        timestamp: Date.now()
    });
}

const server = http.createServer(async (req, res) => {
    // Handle CORS pre-flight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept',
        });
        res.end();
        return;
    }

    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;
    const query = parsed.query;
    const acceptHeader = req.headers['accept'] || '';

    if (pathname === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (pathname === '/status' || pathname === '/ping' || (pathname === '/' && acceptHeader.includes('application/json')) || 'format' in query) {
        const uptime = Math.floor((Date.now() - START_TIME) / 1000);
        sendJson(res, {
            status: 'online',
            device: 'NEXXA-ESP32-SERVER-MOCK',
            uptime_sec: uptime,
            free_heap: 234800,
            neural_tts: Boolean(EdgeTTS),
            voices: Object.keys(VOICES)
        });
        return;
    }

    // Direct Windows PC audio playback (/speak)
    if (pathname === '/speak' && req.method === 'GET') {
        const text = query.text || '';
        const voice = normalizeVoice(query.voice);
        if (!text.trim()) {
            sendJson(res, { status: 'error', error: 'missing text' }, 400);
            return;
        }

        try {
            const filePath = await getTTSFile(text, voice);
            const duration = PLAYER.play(filePath);
            console.log(`[SPEAK/${voice}] "${text}" (${duration} ms)`);
            broadcastEvent({
                type: 'AUDIO_SPEAK',
                direction: 'AUDIO',
                text: text,
                voice: voice,
                duration_ms: duration
            });
            sendJson(res, {
                status: 'playing',
                voice: voice,
                duration_ms: duration,
                text: text
            });
        } catch (err) {
            console.error('[SPEAK Error]', err.message);
            sendJson(res, { status: 'error', error: err.message }, 502);
        }
        return;
    }

    // MP3 Audio streaming (/tts)
    if (pathname === '/tts' && req.method === 'GET') {
        const text = query.text || '';
        const voice = normalizeVoice(query.voice);
        if (!text.trim()) {
            res.writeHead(400);
            res.end();
            return;
        }

        try {
            const filePath = await getTTSFile(text, voice);
            const audioData = fs.readFileSync(filePath);
            broadcastEvent({
                type: 'AUDIO_TTS_STREAM',
                direction: 'AUDIO',
                text: text,
                voice: voice,
                bytes: audioData.length
            });
            res.writeHead(200, {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioData.length,
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Accept',
            });
            res.end(audioData);
            console.log(`[TTS/${voice}] สร้างเสียงสำเร็จ: "${text}" (${audioData.length} bytes)`);
        } catch (err) {
            console.error('[TTS Warning] ไม่สามารถสร้างเสียง:', err.message);
            res.writeHead(502);
            res.end();
        }
        return;
    }

    // SSE Stream for Live Dashboard
    if (pathname === '/api/events/stream' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        });
        res.write(': connected\n\n');
        SSE_CLIENTS.add(res);
        req.on('close', () => SSE_CLIENTS.delete(res));
        return;
    }

    // Historical Events JSON for Dashboard
    if (pathname === '/api/events' && req.method === 'GET') {
        sendJson(res, {
            status: 'success',
            total: EVENT_HISTORY.length,
            events: EVENT_HISTORY
        });
        return;
    }

    // Client Telemetry Logging (from index.html or dashboard)
    if (pathname === '/api/log' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const ev = JSON.parse(body);
                broadcastEvent(ev);
                sendJson(res, { status: 'ok' });
            } catch (e) {
                sendJson(res, { status: 'error', error: e.message }, 400);
            }
        });
        return;
    }

    // Robot Task Result Feedback Endpoint (from real ESP32 or Dashboard simulator)
    if (pathname === '/api/robot_status') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const action = (data.action || 'UNKNOWN').toUpperCase();
                    const status = (data.status || 'success').toLowerCase();
                    const target = data.target || '';
                    const detail = data.detail || '';
                    const device = data.device || 'ESP32-HARDWARE';

                    console.log(`[ROBOT FEEDBACK] Action: ${action} | Status: ${status} | Target: ${target} | Detail: ${detail}`);

                    broadcastEvent({
                        type: 'ROBOT_TASK_RESULT',
                        direction: 'INCOMING',
                        action: action,
                        status: status,
                        target: target,
                        detail: detail,
                        device: device,
                        timestamp: new Date().toISOString()
                    });

                    sendJson(res, { status: 'ok', received: true, action, robot_status: status });
                } catch (e) {
                    sendJson(res, { status: 'error', error: e.message }, 400);
                }
            });
            return;
        } else if (req.method === 'GET') {
            const action = (query.action || 'UNKNOWN').toUpperCase();
            const status = (query.status || 'success').toLowerCase();
            const target = query.target || '';
            const detail = query.detail || '';
            const device = query.device || 'ESP32-HARDWARE';

            console.log(`[ROBOT FEEDBACK GET] Action: ${action} | Status: ${status} | Target: ${target}`);

            broadcastEvent({
                type: 'ROBOT_TASK_RESULT',
                direction: 'INCOMING',
                action: action,
                status: status,
                target: target,
                detail: detail,
                device: device,
                timestamp: new Date().toISOString()
            });

            sendJson(res, { status: 'ok', received: true, action, robot_status: status });
            return;
        }
    }

    // Clear Events
    if (pathname === '/api/events/clear' && req.method === 'POST') {
        EVENT_HISTORY.length = 0;
        broadcastEvent({
            type: 'SYSTEM_EVENT',
            direction: 'SYSTEM',
            message: 'ประวัติข้อมูลถูกล้างเรียบร้อยแล้ว'
        });
        sendJson(res, { status: 'cleared' });
        return;
    }

    // Stop Native Windows Audio
    if (pathname === '/stop_audio' || pathname === '/api/stop_audio') {
        PLAYER.stop();
        sendJson(res, { status: 'stopped' });
        return;
    }

    // ESP32 Command endpoint (GET)
    if (pathname === '/command' && req.method === 'GET') {
        const action = query.action || '';
        const target = query.target || '';
        const referer = req.headers['referer'] || '';
        const fromDashboard = query.fromDashboard === '1' || query.fromDashboard === 'true' || req.headers['x-from-dashboard'] === '1' || referer.includes('dashboard');
        const fromRobotUI = query.fromRobotUI === '1' || query.fromRobotUI === 'true';
        handleRobotCommand(res, action, target, fromDashboard, fromRobotUI);
        return;
    }

    // ESP32 Command endpoint (POST)
    if (pathname === '/command' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            let action = '';
            let target = '';
            const referer = req.headers['referer'] || '';
            let fromDashboard = query.fromDashboard === '1' || query.fromDashboard === 'true' || req.headers['x-from-dashboard'] === '1' || referer.includes('dashboard');
            let fromRobotUI = query.fromRobotUI === '1' || query.fromRobotUI === 'true';
            try {
                const data = JSON.parse(body);
                action = data.action || '';
                target = data.target || '';
                if (data.fromDashboard) fromDashboard = true;
                if (data.fromRobotUI) fromRobotUI = true;
            } catch (e) {
                const parsedBody = new URLSearchParams(body);
                action = parsedBody.get('action') || '';
                target = parsedBody.get('target') || '';
                if (parsedBody.get('fromDashboard') === '1' || parsedBody.get('fromDashboard') === 'true') fromDashboard = true;
                if (parsedBody.get('fromRobotUI') === '1' || parsedBody.get('fromRobotUI') === 'true') fromRobotUI = true;
            }
            handleRobotCommand(res, action, target, fromDashboard, fromRobotUI);
        });
        return;
    }

    // Serve static files
    let relPath = pathname === '/' ? '/index.html' : pathname;
    if (pathname === '/dashboard') {
        relPath = '/dashboard.html';
    }
    const safePath = path.normalize(path.join(BASE_DIR, relPath));
    if (!safePath.startsWith(BASE_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(safePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('File Not Found');
            return;
        }

        const ext = path.extname(safePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stats.size,
            'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(safePath).pipe(res);
    });
});

function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push({ name, address: iface.address });
            }
        }
    }
    return ips;
}

server.listen(PORT, () => {
    const engine = EdgeTTS ? 'Edge Neural TTS (เปรมวดี th-TH-PremwadeeNeural)' : 'Google Translate TTS';
    const localIPs = getLocalIPs();

    console.log('='.repeat(60));
    console.log('      NEXXA AI Voice Robot Controller & Server (Node.js)');
    console.log('='.repeat(60));
    console.log(`[*] เว็บแอปพลิเคชันพร้อมใช้งานที่: http://localhost:${PORT}`);

    if (localIPs.length > 0) {
        console.log('');
        console.log('[MOBILE] เปิดบนโทรศัพท์/แท็บเล็ต (เชื่อม WiFi เดียวกัน):');
        for (const ip of localIPs) {
            console.log(`   -> http://${ip.address}:${PORT}  (${ip.name})`);
        }
        console.log('');
    }

    console.log(`[*] ESP32 Mock REST API รันอยู่ที่: http://localhost:${PORT}/command`);
    console.log(`[*] เล่นเสียงออกลำโพง: http://localhost:${PORT}/speak?text=...`);
    console.log(`[*] สตรีม MP3:        http://localhost:${PORT}/tts?text=...`);
    console.log(`[*] หน้า Dashboard รับ-ส่งข้อมูล: http://localhost:${PORT}/dashboard.html`);
    console.log(`[*] เอนจิ้นเสียง (เสียงเดียว): ${engine}`);
    console.log('='.repeat(60));

    warmTTSCache().catch(() => {});
});
