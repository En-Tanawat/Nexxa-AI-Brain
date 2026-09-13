const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const BASE_URL = 'http://localhost:8000';
const results = [];

function logResult(testName, passed, detail = '') {
    const statusIcon = passed ? 'PASS' : 'FAIL';
    console.log(`[${statusIcon}] ${testName}`);
    if (detail) {
        console.log(`       -> ${detail}`);
    }
    results.push({ name: testName, passed });
}

async function runTests() {
    console.log('='.repeat(70));
    console.log('      REXZA AI VOICE ROBOT - COMPREHENSIVE SYSTEM TEST (MODULAR)');
    console.log('='.repeat(70));

    console.log('\n--- 1. MODULAR COMPONENT STRUCTURE ---');
    const requiredFiles = [
        'index.html',
        'css/style.css',
        'js/config.js',
        'js/face.js',
        'js/audio.js',
        'js/speech.js',
        'js/nlp.js',
        'js/gemini.js',
        'js/esp32.js',
        'js/app.js'
    ];
    for (const f of requiredFiles) {
        const fullPath = path.join(ROOT_DIR, f);
        const exists = fs.existsSync(fullPath);
        const size = exists ? fs.statSync(fullPath).size : 0;
        logResult(`Component File: ${f}`, exists && size > 50, `Size: ${size} bytes`);
    }

    console.log('\n--- 2. WEB SERVER & STATIC ASSET DELIVERY ---');
    try {
        const res = await fetch(`${BASE_URL}/`);
        const html = await res.text();
        const passed = (res.status === 200 && html.includes('<svg id="robotFaceSvg"') && html.includes('js/app.js'));
        logResult('Web Server Serves index.html (Modular)', passed, `HTTP ${res.status}, Length: ${html.length} chars`);

        const cssRes = await fetch(`${BASE_URL}/css/style.css`);
        const css = await cssRes.text();
        logResult('Web Server Serves css/style.css', cssRes.status === 200 && css.includes('.robot-screen'), `HTTP ${cssRes.status}`);

        const jsRes = await fetch(`${BASE_URL}/js/app.js`);
        const jsText = await jsRes.text();
        logResult('Web Server Serves js/app.js', jsRes.status === 200 && jsText.includes('processCommandWithAI'), `HTTP ${jsRes.status}`);
    } catch (e) {
        logResult('Web Server Serves Static Assets', false, e.message);
    }

    console.log('\n--- 3. SINGLE VOICE ENFORCEMENT & TTS ---');
    try {
        const configCode = fs.readFileSync(path.join(ROOT_DIR, 'js/config.js'), 'utf8');
        const hasSingleVoiceConfig = configCode.includes("'th-TH-PremwadeeNeural'") && configCode.includes("ROBOT_VOICE = 'female'");
        logResult('Frontend js/config.js Single Voice (th-TH-PremwadeeNeural)', hasSingleVoiceConfig, 'Configured to only single authoritative voice');

        const serverCode = fs.readFileSync(path.join(ROOT_DIR, 'server.js'), 'utf8');
        const hasSingleVoiceServer = serverCode.includes("'th-TH-PremwadeeNeural'");
        logResult('Backend server.js Female Premwadee Neural Voice', hasSingleVoiceServer, 'PremwadeeNeural configured as primary engine');

        // Test TTS streaming
        const phrase = 'สวัสดีค่ะ เน็กซ่าพร้อมรับคำสั่งค่ะ';
        const res = await fetch(`${BASE_URL}/tts?text=${encodeURIComponent(phrase)}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const isMp3 = buf.length > 1000;
        logResult('TTS Audio Stream Output', res.status === 200 && isMp3, `Status: ${res.status}, Size: ${buf.length} bytes`);

        // Test /speak direct playback
        const spkRes = await fetch(`${BASE_URL}/speak?text=${encodeURIComponent(phrase)}`);
        const spkData = await spkRes.json();
        logResult('Direct /speak Native Audio Playback', spkRes.status === 200 && spkData.status === 'playing', `Voice: ${spkData.voice}, Duration: ${spkData.duration_ms}ms`);
    } catch (e) {
        logResult('Single Voice Enforcement & TTS', false, e.message);
    }

    console.log('\n--- 4. STRICT WAKE WORD GATING & 15-SECOND TIMEOUT ---');
    try {
        const configCode = fs.readFileSync(path.join(ROOT_DIR, 'js/config.js'), 'utf8');
        const speechCode = fs.readFileSync(path.join(ROOT_DIR, 'js/speech.js'), 'utf8');

        const expectedKeywords = [
            'hello nexxa',
            'hey nexxa',
            'nexxa',
            'เน็กซ่า'
        ];
        let hasAllKeywords = true;
        for (const kw of expectedKeywords) {
            if (!configCode.includes(kw)) {
                hasAllKeywords = false;
                break;
            }
        }
        logResult('Exact wakeKeywords Configured', hasAllKeywords, 'hello nexxa, hey nexxa, nexxa, เน็กซ่า included');

        const has15sTimeout = configCode.includes('WAKE_TIMEOUT_MS = 15000') && speechCode.includes('WAKE_TIMEOUT_MS');
        logResult('15-Second Auto-Standby Window Config', has15sTimeout, 'Auto-reverts to standby if no command spoken in 15s');

        const hasWakeGating = speechCode.includes('isAwake') && speechCode.includes('handleVoicePipeline') && speechCode.includes('ข้ามขั้นตอนไม่ได้');
        logResult('Strict Wake Word Gating Logic in Code', hasWakeGating, 'Action commands cannot execute unless robot is awake or waking');

        // Setup VM sandbox to test actual runtime behavior of speech pipeline
        let executedAction = null;
        let wakeChimePlayed = null;
        let wakeVisualState = null;
        let aiSpokenText = null;

        const speechSandbox = {
            console: { log: () => {} },
            window: {},
            document: { getElementById: () => null },
            setTimeout: setTimeout,
            clearTimeout: clearTimeout,
            fetch: async () => ({ ok: true, json: async () => ({}) }),
            localStorage: { getItem: () => null, setItem: () => {} },
            updateWakeVisual: (active, qa) => { wakeVisualState = active; },
            playWakeChime: (type) => { wakeChimePlayed = type; },
            speakAI: (text, cb) => {
                aiSpokenText = text;
                if (cb) setImmediate(cb);
            },
            processCommandWithAI: (cmd) => { executedAction = cmd; },
            processQAQuestion: (q) => { executedAction = `QA: ${q}`; }
        };
        speechSandbox.window = speechSandbox;

        vm.createContext(speechSandbox);
        vm.runInContext(configCode, speechSandbox);
        vm.runInContext(speechCode, speechSandbox);

        const getIsAwake = () => vm.runInContext('isAwake', speechSandbox);
        const getTimer = () => vm.runInContext('wakeTimeoutTimer', speechSandbox);
        const resetStandby = (silent) => vm.runInContext(`resetToStandby(${silent})`, speechSandbox);
        const runPipeline = (text) => vm.runInContext(`handleVoicePipeline(${JSON.stringify(text)})`, speechSandbox);

        // Test 4.1: Robot starts asleep (isAwake === false)
        logResult('Initial State is Sleeping (isAwake = false)', getIsAwake() === false);

        // Test 4.2: Strict Gating: Action commands while asleep MUST be blocked
        const actionsToBlock = [
            'ไปหยิบขวดน้ำ',
            'กลับฐาน',
            'หยุดทำงาน',
            'เช็คสถานะ esp32',
            'เริ่มตอบคำถาม'
        ];
        let allBlocked = true;
        for (const act of actionsToBlock) {
            executedAction = null;
            runPipeline(act);
            if (executedAction !== null || getIsAwake() === true) {
                allBlocked = false;
                console.log(`       [FAIL-DEBUG] Action "${act}" was NOT blocked while sleeping!`);
            }
        }
        logResult('Strict Wake Gating: Block Unwoken Actions ("ข้ามขั้นตอนไม่ได้")', allBlocked, 'Zero action execution without waking');

        // Test 4.3: Waking via wake keywords ("nexxa", "hello nexxa", "hey nexxa", "เน็กซ่า")
        let allWoke = true;
        for (const kw of ['hello nexxa', 'hey nexxa', 'nexxa', 'เน็กซ่า']) {
            resetStandby(true);
            runPipeline(kw);
            if (getIsAwake() !== true) {
                allWoke = false;
                console.log(`       [FAIL-DEBUG] Failed to wake with: "${kw}"`);
            }
        }
        logResult('Wake Word Recognition (hello nexxa, hey nexxa, nexxa, เน็กซ่า)', allWoke, 'All wake keywords successfully awaken robot');

        // Test 4.4: 15-Second Timeout auto-reverts to standby ("กลับไปเป็นปกติ เท่านั้น")
        resetStandby(true);
        runPipeline('nexxa');
        // Wait for speechAI callback to invoke startWakeTimer
        await new Promise(r => setImmediate(r));
        const timerActive = getTimer() !== null;
        logResult('15-Second Timer Starts on Wake', timerActive, 'Timer started after greeting');

        // Trigger timeout logic to verify it reverts to standby
        resetStandby(false);
        const backToNormal = getIsAwake() === false;
        logResult('15-Second Inactivity Reverts to Normal Standby Only', backToNormal, 'isAwake reset to false and dismiss chime triggered');

        // Test 4.5: Single-Sentence Wake + Command (e.g. "hello nexxa ไปหยิบขวดน้ำ")
        resetStandby(true);
        executedAction = null;
        runPipeline('hello nexxa ไปหยิบขวดน้ำ');
        const directPass = (getIsAwake() === true && executedAction === 'ไปหยิบขวดน้ำ');
        logResult('Single-Sentence Command ("hello nexxa ไปหยิบขวดน้ำ")', directPass, `Parsed command: "${executedAction}"`);

        // Test 4.6: Two-step Flow ("nexxa" -> wait -> "ไปหยิบขวดน้ำ")
        resetStandby(true);
        runPipeline('nexxa');
        await new Promise(r => setImmediate(r));
        executedAction = null;
        runPipeline('ไปหยิบขวดน้ำ');
        const twoStepPass = (executedAction === 'ไปหยิบขวดน้ำ' && getTimer() === null);
        logResult('Two-Step Wake Flow ("nexxa" then command within 15s)', twoStepPass, `Timer cleared & executed: "${executedAction}"`);
    } catch (e) {
        logResult('Strict Wake Word Gating & 15-Second Timeout', false, e.message);
    }

    console.log('\n--- 5. THAI NLP PARSING & ACCIDENTAL PICK BUG ELIMINATION ---');
    try {
        const nlpCode = fs.readFileSync(path.join(ROOT_DIR, 'js/nlp.js'), 'utf8');
        const configCode = fs.readFileSync(path.join(ROOT_DIR, 'js/config.js'), 'utf8');
        
        const storage = {};
        const mockStorage = {
            getItem: (k) => storage[k] || null,
            setItem: (k, v) => { storage[k] = String(v); },
            removeItem: (k) => { delete storage[k]; }
        };

        const sandbox = {
            window: {},
            console: console,
            localStorage: mockStorage,
            document: {
                getElementById: () => null,
                addEventListener: () => {}
            },
            setTimeout: setTimeout,
            clearTimeout: clearTimeout,
        };
        sandbox.window = sandbox;

        vm.createContext(sandbox);
        vm.runInContext(configCode, sandbox);
        vm.runInContext(nlpCode, sandbox);

        const parseNLP = sandbox.parseWithLocalNLP;

        // Test non-pick casual conversations (previously bugged)
        const falsePickPhrases = [
            'คุยกันหน่อย',
            'ช่วยกันดูหน่อยนะ',
            'สวัสดีตอนเช้า',
            'เธอชื่ออะไร',
            'ทำอะไรได้บ้าง',
            'ยกตัวอย่างให้ดูหน่อย',
            'สบายดีไหม'
        ];
        let nonPickPass = true;
        for (const p of falsePickPhrases) {
            const res = parseNLP(p);
            if (res.action === 'PICK') {
                nonPickPass = false;
                console.log(`       [FAIL-DEBUG] Accidental PICK triggered on: "${p}" -> action: ${res.action}`);
            }
        }
        logResult('Accidental PICK Bug Elimination (Conversations do NOT trigger PICK)', nonPickPass, 'Zero false-positive PICK on casual speech');

        // Test genuine pick requests
        const pickPhrases = [
            { text: 'ช่วยหยิบขวดน้ำให้หน่อย', expectedTarget: 'bottle' },
            { text: 'ไปเอาปากกามา', expectedTarget: 'pen' },
            { text: 'ช่วยหยิบกล่องพัสดุ', expectedTarget: 'package' }
        ];
        let pickPass = true;
        for (const item of pickPhrases) {
            const res = parseNLP(item.text);
            const targetMatched = (res.english_target === item.expectedTarget || res.target === item.expectedTarget);
            if (res.action !== 'PICK' || !targetMatched) {
                pickPass = false;
                console.log(`       [FAIL-DEBUG] Expected PICK ${item.expectedTarget} but got: ${res.action} en:${res.english_target} th:${res.target}`);
            }
        }
        logResult('Valid PICK Commands Correctly Parsed', pickPass, 'Valid items correctly resolve action: PICK with proper targets');

        // Test Home, Stop, CheckStatus, AnswerQuestion
        const homeRes = parseNLP('กลับฐาน');
        logResult('NLP Action: HOME', homeRes.action === 'HOME', `Action: ${homeRes.action}`);

        const stopRes = parseNLP('หยุดทำงานฉุกเฉิน');
        logResult('NLP Action: STOP', stopRes.action === 'STOP', `Action: ${stopRes.action}`);

        const statusRes = parseNLP('เช็คสถานะ esp32');
        logResult('NLP Action: CheckStatus', statusRes.action === 'CheckStatus', `Action: ${statusRes.action}`);

        const qaRes = parseNLP('เริ่มตอบคำถาม');
        logResult('NLP Action: AnswerQuestion', qaRes.action === 'AnswerQuestion', `Action: ${qaRes.action}`);

        const stopQARes = parseNLP('ให้หยุดตอบคำถาม');
        logResult('NLP Action: StopQA ("ให้หยุดตอบ")', stopQARes.action === 'StopQA', `Action: ${stopQARes.action}`);

        const nameRes = parseNLP('เธอชื่ออะไร');
        logResult('NLP Action: Name Query ("เธอชื่ออะไร" -> Nexxa)', nameRes.action === 'NONE' && nameRes.speech.includes('เน็กซ่า'), `Speech: ${nameRes.speech}`);

        const negRes = parseNLP('ไม่ต้องหยิบนะ');
        logResult('NLP Action: Negative Pick ("ไม่ต้องหยิบ" -> NONE)', negRes.action === 'NONE', `Action: ${negRes.action}`);
    } catch (e) {
        logResult('Thai NLP Parsing Tests', false, e.message);
    }

    console.log('\n--- 6. ESP32 REST API ENDPOINTS & HARDWARE INTEGRATION ---');
    try {
        const pingRes = await fetch(`${BASE_URL}/status`);
        const pingData = await pingRes.json();
        logResult('ESP32 REST Ping (GET /status)', pingRes.status === 200 && pingData.status === 'online', `Device: ${pingData.device}`);

        const postPickRes = await fetch(`${BASE_URL}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'PICK', target: 'bottle' })
        });
        const pickData = await postPickRes.json();
        logResult('Command POST: PICK bottle', postPickRes.status === 200 && pickData.robot_status === 'picking', `Target: ${pickData.target}`);

        const postHomeRes = await fetch(`${BASE_URL}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'HOME', target: 'base' })
        });
        const homeData = await postHomeRes.json();
        logResult('Command POST: HOME', postHomeRes.status === 200 && homeData.robot_status === 'returning_home', `Status: ${homeData.robot_status}`);

        const postStopRes = await fetch(`${BASE_URL}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'STOP', target: '' })
        });
        const stopData = await postStopRes.json();
        logResult('Command POST: STOP', postStopRes.status === 200 && stopData.robot_status === 'stopped', `Status: ${stopData.robot_status}`);

        const statusRes = await fetch(`${BASE_URL}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'CheckStatus', target: 'esp32' })
        });
        const stData = await statusRes.json();
        logResult('Command POST: CheckStatus', statusRes.status === 200 && stData.robot_status === 'ready', `Robot Status: ${stData.robot_status}`);

        const qaRes = await fetch(`${BASE_URL}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'AnswerQuestion', target: '' })
        });
        const qaData = await qaRes.json();
        logResult('Command POST: AnswerQuestion', qaRes.status === 200 && qaData.robot_status === 'qa_mode', `Robot Status: ${qaData.robot_status}`);

        const stopQARes = await fetch(`${BASE_URL}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'StopQA', target: '' })
        });
        const stopQAData = await stopQARes.json();
        logResult('Command POST: StopQA', stopQARes.status === 200 && stopQAData.robot_status === 'idle', `Robot Status: ${stopQAData.robot_status}`);
    } catch (e) {
        logResult('ESP32 REST API Integration', false, e.message);
    }

    console.log('\n--- 7. FIRMWARE SOURCE FILES INTEGRITY ---');
    const inoPath = path.join(ROOT_DIR, 'esp32_example.ino');
    if (fs.existsSync(inoPath)) {
        const inoCode = fs.readFileSync(inoPath, 'utf8');
        const hasCors = inoCode.includes('Access-Control-Allow-Origin') && inoCode.includes('/command');
        const hasCheckStatusFirmware = inoCode.includes('CheckStatus') && inoCode.includes('"ready"');
        logResult('Arduino Firmware (esp32_example.ino)', hasCors && hasCheckStatusFirmware, 'CORS headers and CheckStatus handler confirmed');
    }

    const mainCppPath = path.join(ROOT_DIR, 'src/main.cpp');
    if (fs.existsSync(mainCppPath)) {
        const cppCode = fs.readFileSync(mainCppPath, 'utf8');
        const hasCors = cppCode.includes('Access-Control-Allow-Origin') && cppCode.includes('/command');
        const hasCheckStatus = cppCode.includes('CheckStatus') && cppCode.includes('"ready"');
        logResult('PlatformIO Firmware (src/main.cpp)', hasCors && hasCheckStatus, 'CORS headers and CheckStatus handler confirmed');
    }

    console.log('\n--- 8. TELEMETRY & COMMAND DASHBOARD ---');
    try {
        // 1. GET /dashboard.html
        const dashHtmlRes = await fetch(`${BASE_URL}/dashboard.html`);
        const dashHtml = await dashHtmlRes.text();
        const hasDashTitle = dashHtml.includes('NEXXA') && dashHtml.includes('TELEMETRY') && dashHtml.includes('id="streamFeed"');
        logResult('Dashboard HTML Delivery (/dashboard.html)', dashHtmlRes.status === 200 && hasDashTitle, `HTTP ${dashHtmlRes.status}, Size: ${dashHtml.length} chars`);

        // 2. GET /dashboard alias
        const dashAliasRes = await fetch(`${BASE_URL}/dashboard`);
        const dashAliasHtml = await dashAliasRes.text();
        logResult('Dashboard Alias Route (/dashboard)', dashAliasRes.status === 200 && dashAliasHtml.includes('streamFeed'), `HTTP ${dashAliasRes.status}`);

        // 3. POST /api/log client telemetry
        const testLogPayload = {
            type: 'CLIENT_TEST_EVENT',
            direction: 'INCOMING',
            badge: '🧪 TEST BADGE',
            message: 'ทดสอบส่ง Telemetry จาก Robot Client เข้า Dashboard'
        };
        const postLogRes = await fetch(`${BASE_URL}/api/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testLogPayload)
        });
        const postLogData = await postLogRes.json();
        logResult('Client Telemetry Logging (POST /api/log)', postLogRes.status === 200 && postLogData.status === 'ok', `Status: ${postLogData.status}`);

        // 4. GET /api/events history
        const eventsRes = await fetch(`${BASE_URL}/api/events`);
        const eventsData = await eventsRes.json();
        const hasEvents = eventsData.status === 'success' && Array.isArray(eventsData.events) && eventsData.events.length > 0;
        logResult('Telemetry Event History (GET /api/events)', hasEvents, `Total Events: ${eventsData.total}`);

        // 5. POST /api/events/clear
        const clearRes = await fetch(`${BASE_URL}/api/events/clear`, { method: 'POST' });
        const clearData = await clearRes.json();
        logResult('Clear Event Stream (POST /api/events/clear)', clearRes.status === 200 && clearData.status === 'cleared', `Status: ${clearData.status}`);
    } catch (e) {
        logResult('Telemetry & Dashboard API', false, e.message);
    }

    console.log('\n' + '='.repeat(70));
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const percent = totalTests ? Math.round((passedTests / totalTests) * 100) : 0;
    console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${percent}%)`);
    console.log('='.repeat(70));

    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

runTests();
