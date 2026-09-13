/**
 * REXZA AI ROBOT - COMPREHENSIVE PRODUCTION SPEECH & VOICE TEST SUITE
 * ====================================================================
 * Suite test ครอบคลุมการพูดและโต้ตอบทุกมิติ เพื่อการันตีความเสถียร 100% บน Production:
 * 1. Deep Thai NLP Parsing & Intent Extraction (100+ Test Cases)
 * 2. Negative Command Denial (Zero Accidental Pick)
 * 3. Strict Wake Word Gating & Multi-dialect Phonetics
 * 4. Single-Sentence & Two-Step Wake Conversational Flows
 * 5. Q&A Mode Continuous Flow & Natural Exit Triggers
 * 6. Echo Cancellation & Audio Barge-In Protection
 * 7. Server TTS & /speak High-Concurrency Stress Testing
 */

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

async function runProductionSpeechTests() {
    console.log('='.repeat(75));
    console.log('   REXZA AI VOICE ROBOT - PRODUCTION SPEECH & NLP HARDENING SUITE');
    console.log('='.repeat(75));

    // Load source modules
    const nlpCode = fs.readFileSync(path.join(ROOT_DIR, 'js/nlp.js'), 'utf8');
    const configCode = fs.readFileSync(path.join(ROOT_DIR, 'js/config.js'), 'utf8');
    const speechCode = fs.readFileSync(path.join(ROOT_DIR, 'js/speech.js'), 'utf8');

    // -------------------------------------------------------------------------
    // Setup Shared VM Sandbox for NLP Testing
    // -------------------------------------------------------------------------
    const nlpSandbox = {
        console: { log: () => {} },
        window: {},
        localStorage: { getItem: () => null, setItem: () => {} }
    };
    nlpSandbox.window = nlpSandbox;
    vm.createContext(nlpSandbox);
    vm.runInContext(configCode, nlpSandbox);
    vm.runInContext(nlpCode, nlpSandbox);
    const parseNLP = nlpSandbox.parseWithLocalNLP;

    // =========================================================================
    // 1. INTENT: PICK - DICTIONARY AND REGEX FALLBACK (40+ Test Cases)
    // =========================================================================
    console.log('\n--- 1. INTENT: PICK (VALID COMMANDS & TARGET EXTRACTION) ---');
    const pickTestCases = [
        // Standard items
        { text: 'ช่วยหยิบขวดน้ำให้หน่อย', expectedTarget: 'bottle', desc: 'ขวดน้ำ' },
        { text: 'ไปหยิบขวดน้ำ', expectedTarget: 'bottle', desc: 'ไปหยิบขวดน้ำ' },
        { text: 'ช่วยเอาขวดมาให้ที', expectedTarget: 'bottle', desc: 'ช่วยเอาขวด' },
        { text: 'ช่วยหยิบน้ำเปล่า', expectedTarget: 'water', desc: 'น้ำเปล่า' },
        { text: 'ไปหยิบน้ำมาให้หน่อย', expectedTarget: 'water', desc: 'น้ำ' },
        { text: 'ช่วยไปหยิบแก้วกาแฟหน่อย', expectedTarget: 'coffee_cup', desc: 'แก้วกาแฟ' },
        { text: 'ช่วยหยิบแก้วน้ำ', expectedTarget: 'glass', desc: 'แก้วน้ำ' },
        { text: 'หยิบปากกาให้หน่อยครับ', expectedTarget: 'pen', desc: 'ปากกา (พร้อมครับ)' },
        { text: 'ไปเอาดินสอมา', expectedTarget: 'pencil', desc: 'ดินสอ' },
        { text: 'ช่วยหยิบหนังสือ', expectedTarget: 'book', desc: 'หนังสือ' },
        { text: 'ไปหยิบสมุดให้หน่อย', expectedTarget: 'notebook', desc: 'สมุด' },
        { text: 'ช่วยหยิบกล่องพัสดุหน่อยค่ะ', expectedTarget: 'package', desc: 'กล่องพัสดุ (พร้อมค่ะ)' },
        { text: 'ไปเอากล่องมา', expectedTarget: 'box', desc: 'กล่อง' },
        { text: 'ช่วยหยิบโทรศัพท์ให้หน่อย', expectedTarget: 'phone', desc: 'โทรศัพท์' },
        { text: 'ไปเอามือถือมาที', expectedTarget: 'mobile', desc: 'มือถือ' },
        { text: 'ช่วยหยิบกุญแจ', expectedTarget: 'key', desc: 'กุญแจ' },
        { text: 'ช่วยหยิบยา', expectedTarget: 'medicine', desc: 'ยา' },
        { text: 'ไปหยิบแว่นตา', expectedTarget: 'glasses', desc: 'แว่นตา' },
        { text: 'ช่วยหยิบขนมปัง', expectedTarget: 'bread', desc: 'ขนมปัง' },
        { text: 'ช่วยหยิบขนม', expectedTarget: 'snack', desc: 'ขนม' },
        { text: 'ช่วยหยิบเอกสารให้หน่อย', expectedTarget: 'document', desc: 'เอกสาร' },
        { text: 'ไปเอาเอกสารมา', expectedTarget: 'document', desc: 'เอกสาร (ไปเอา)' },
        { text: 'ช่วยหยิบกระดาษ', expectedTarget: 'paper', desc: 'กระดาษ' },
        { text: 'ช่วยหยิบกระเป๋า', expectedTarget: 'bag', desc: 'กระเป๋า' },
        { text: 'ช่วยหยิบไฟฉาย', expectedTarget: 'flashlight', desc: 'ไฟฉาย' },
        { text: 'ช่วยหยิบร่ม', expectedTarget: 'umbrella', desc: 'ร่ม' },
        { text: 'ไปหยิบร่มมา', expectedTarget: 'umbrella', desc: 'ร่ม (ไปหยิบ)' },
        { text: 'ช่วยหยิบรีโมททีวี', expectedTarget: 'remote', desc: 'รีโมท' },
        { text: 'ช่วยหยิบรีโมต', expectedTarget: 'remote', desc: 'รีโมต' },
        { text: 'ช่วยหยิบกระดาษทิชชู่หน่อย', expectedTarget: 'tissue', desc: 'กระดาษทิชชู่ (ต้องไม่เป็น paper)' },
        { text: 'ช่วยหยิบทิชชู่', expectedTarget: 'tissue', desc: 'ทิชชู่' },
        { text: 'ช่วยหยิบหน้ากากอนามัย', expectedTarget: 'mask', desc: 'หน้ากาก' },
        { text: 'ช่วยหยิบแมส', expectedTarget: 'mask', desc: 'แมส' },
        { text: 'ช่วยหยิบสายชาร์จ', expectedTarget: 'charger', desc: 'สายชาร์จ' },
        { text: 'ช่วยหยิบที่ชาร์จ', expectedTarget: 'charger', desc: 'ที่ชาร์จ' },
        { text: 'ช่วยหยิบกรรไกร', expectedTarget: 'scissors', desc: 'กรรไกร' },
        { text: 'ช่วยหยิบแฟ้มงาน', expectedTarget: 'folder', desc: 'แฟ้ม' },
        { text: 'ช่วยหยิบจานข้าว', expectedTarget: 'plate', desc: 'จาน' },
        { text: 'ช่วยหยิบช้อน', expectedTarget: 'spoon', desc: 'ช้อน' },
        { text: 'ช่วยหยิบส้อม', expectedTarget: 'fork', desc: 'ส้อม' },
        // Regex Fallbacks for items outside dictionary
        { text: 'ช่วยไปเอาพัดลม', expectedTarget: 'พัดลม', desc: 'พัดลม (Regex Fallback)' },
        { text: 'ช่วยหยิบลำโพงมาให้หน่อย', expectedTarget: 'ลำโพง', desc: 'ลำโพง (Regex Fallback)' },
        { text: 'ไปหยิบหมวก', expectedTarget: 'หมวก', desc: 'หมวก (Regex Fallback)' }
    ];

    let allPickPassed = true;
    for (const tc of pickTestCases) {
        const res = parseNLP(tc.text);
        const match = (res.action === 'PICK' && (res.english_target === tc.expectedTarget || res.target === tc.expectedTarget));
        if (!match) {
            allPickPassed = false;
            console.log(`   [FAIL-PICK] "${tc.text}" -> Got Action: ${res.action}, Target: ${res.target}/${res.english_target} (Expected: ${tc.expectedTarget})`);
        }
    }
    logResult(`PICK Intent Parsing Coverage (${pickTestCases.length} real-world variations)`, allPickPassed, 'All items and fallback extractions matched correctly');

    // =========================================================================
    // 2. NEGATIVE COMMANDS & DENIAL (Strictly Block Accidental PICK)
    // =========================================================================
    console.log('\n--- 2. NEGATIVE COMMANDS & DENIAL (ZERO ACCIDENTAL PICK) ---');
    const negativeTestCases = [
        'ไม่ต้องหยิบ',
        'อย่าหยิบนะ',
        'อย่าเพิ่งหยิบขวดน้ำ',
        'ยังไม่ต้องหยิบกล่อง',
        'ห้ามหยิบอะไรทั้งนั้น',
        'ไม่ต้องไปหยิบปากกา',
        'ไม่ต้องช่วยหยิบ',
        'ยกเลิกคำสั่งหยิบ',
        'ไม่ให้หยิบ',
        'ไม่ต้องเอาขวดน้ำ',
        'อย่าเอาของมา',
        'ยังไม่เอา',
        'ห้ามเอา',
        'ไม่ต้องไปเอา',
        'อย่าเพิ่งเอานะ',
        'ไม่เอาแล้วขวดน้ำ',
        'ไม่ต้องหยิบอะไรเลย'
    ];

    let allNegPassed = true;
    for (const neg of negativeTestCases) {
        const res = parseNLP(neg);
        if (res.action === 'PICK') {
            allNegPassed = false;
            console.log(`   [FAIL-NEG] Negative phrase triggered PICK: "${neg}"`);
        }
    }
    logResult(`Negative Intent Filtering (${negativeTestCases.length} denial variations)`, allNegPassed, 'Zero accidental PICK on negative/cancellation commands');

    // =========================================================================
    // 3. CASUAL CHIT-CHAT & NON-PICK COMMANDS (Accidental PICK Elimination)
    // =========================================================================
    console.log('\n--- 3. CASUAL CHIT-CHAT & PHRASES (ZERO FALSE POSITIVES) ---');
    const casualPhrases = [
        'คุยกันหน่อย',
        'ช่วยกันดูหน่อยนะ',
        'สวัสดีตอนเช้า',
        'สบายดีไหม',
        'อากาศวันนี้เป็นอย่างไร',
        'กินข้าวหรือยัง',
        'ทำอะไรได้บ้าง',
        'ช่วยอธิบายหน่อย',
        'ใครสร้างคุณ',
        '1 2 3 เทสเสียง',
        'ยกตัวอย่างให้ดูหน่อย',
        'ไปเที่ยวกันไหม',
        'ช่วยสอนการบ้านหน่อย',
        'วันนี้วันอะไร',
        'ฮัลโหล เป็นไงบ้าง',
        'เธอทำอะไรอยู่'
    ];

    let allCasualPassed = true;
    for (const cas of casualPhrases) {
        const res = parseNLP(cas);
        if (res.action === 'PICK') {
            allCasualPassed = false;
            console.log(`   [FAIL-CASUAL] Casual phrase triggered PICK: "${cas}"`);
        }
    }
    logResult(`Casual Speech Non-Action Immunity (${casualPhrases.length} chit-chat phrases)`, allCasualPassed, 'Zero false-positive PICK on casual conversation');

    // =========================================================================
    // 4. OTHER SYSTEM INTENTS (HOME, STOP, CheckStatus, AnswerQuestion, StopQA)
    // =========================================================================
    console.log('\n--- 4. OTHER INTENTS: HOME, STOP, STATUS, QA MODES ---');
    const intentTests = [
        // HOME
        { text: 'กลับฐาน', expected: 'HOME' },
        { text: 'กลับจุดเริ่มต้น', expected: 'HOME' },
        { text: 'ไปชาร์จแบต', expected: 'HOME' },
        { text: 'กลับบ้านได้แล้ว', expected: 'HOME' },
        { text: 'go home', expected: 'HOME' },
        { text: 'return home', expected: 'HOME' },
        { text: 'dock', expected: 'HOME' },
        { text: 'กลับแท่นชาร์จ', expected: 'HOME' },
        { text: 'เข้าที่ชาร์จ', expected: 'HOME' },
        { text: 'กับฐาน', expected: 'HOME' },
        { text: 'กลับถ่าน', expected: 'HOME' },

        // STOP
        { text: 'หยุด', expected: 'STOP' },
        { text: 'stop', expected: 'STOP' },
        { text: 'พอแล้ว', expected: 'STOP' },
        { text: 'หยุดทำงานฉุกเฉิน', expected: 'STOP' },
        { text: 'เบรกเดี๋ยวนี้', expected: 'STOP' },
        { text: 'จอดตรงนี้', expected: 'STOP' },
        { text: 'ฉุกเฉิน', expected: 'STOP' },
        { text: 'emergency', expected: 'STOP' },
        { text: 'halt', expected: 'STOP' },
        { text: 'pause', expected: 'STOP' },
        { text: 'ยกเลิก', expected: 'STOP' },
        { text: 'ช่างมัน', expected: 'STOP' },

        // CheckStatus
        { text: 'เช็คสถานะ', expected: 'CheckStatus' },
        { text: 'ตรวจสถานะ', expected: 'CheckStatus' },
        { text: 'ตรวจสอบสถานะอุปกรณ์', expected: 'CheckStatus' },
        { text: 'สถานะหุ่นยนต์', expected: 'CheckStatus' },
        { text: 'สถานะบอร์ด', expected: 'CheckStatus' },
        { text: 'เช็คบอร์ด', expected: 'CheckStatus' },
        { text: 'เช็ค esp', expected: 'CheckStatus' },
        { text: 'esp32 พร้อมไหม', expected: 'CheckStatus' },
        { text: 'บอร์ดพร้อมไหม', expected: 'CheckStatus' },
        { text: 'เช็คความพร้อม', expected: 'CheckStatus' },
        { text: 'check status', expected: 'CheckStatus' },
        { text: 'robot status', expected: 'CheckStatus' },
        { text: 'system status', expected: 'CheckStatus' },

        // AnswerQuestion (Enter QA mode)
        { text: 'เข้าสู่โหมดตอบคำถาม', expected: 'AnswerQuestion' },
        { text: 'เข้าสู่โหมดถามตอบ', expected: 'AnswerQuestion' },
        { text: 'เริ่มตอบคำถาม', expected: 'AnswerQuestion' },
        { text: 'ถามคำถามหน่อย', expected: 'AnswerQuestion' },
        { text: 'เปิดโหมดถามตอบ', expected: 'AnswerQuestion' },
        { text: 'อยากถามคำถาม', expected: 'AnswerQuestion' },
        { text: 'qa mode', expected: 'AnswerQuestion' },
        { text: 'start qa', expected: 'AnswerQuestion' },

        // StopQA (Exit QA mode)
        { text: 'ให้หยุดตอบ', expected: 'StopQA' },
        { text: 'หยุดตอบคำถาม', expected: 'StopQA' },
        { text: 'หยุดตอบ', expected: 'StopQA' },
        { text: 'เลิกตอบ', expected: 'StopQA' },
        { text: 'เลิกถาม', expected: 'StopQA' },
        { text: 'หยุดถามตอบ', expected: 'StopQA' },
        { text: 'พอแล้วหยุดตอบ', expected: 'StopQA' },
        { text: 'ไม่ต้องตอบแล้ว', expected: 'StopQA' },
        { text: 'ไม่มีคำถามแล้ว', expected: 'StopQA' },
        { text: 'ไม่ถามแล้ว', expected: 'StopQA' },
        { text: 'ออกจากโหมดถามตอบ', expected: 'StopQA' },
        { text: 'stop qa', expected: 'StopQA' },
        { text: 'stop answering', expected: 'StopQA' },
        { text: 'exit qa', expected: 'StopQA' }
    ];

    let allIntentsPassed = true;
    for (const it of intentTests) {
        const res = parseNLP(it.text);
        if (res.action !== it.expected) {
            allIntentsPassed = false;
            console.log(`   [FAIL-INTENT] "${it.text}" -> Got: ${res.action} (Expected: ${it.expected})`);
        }
    }
    logResult(`System Intents Coverage (${intentTests.length} variations: HOME, STOP, Status, QA, StopQA)`, allIntentsPassed, 'All hardware and interaction intents matched 100%');

    // =========================================================================
    // 5. WAKE GATING & TIMING STATE MACHINE (Sandbox Runtime Pipeline)
    // =========================================================================
    console.log('\n--- 5. STRICT WAKE GATING & 15-SECOND TIME WINDOW ---');
    let executedAction = null;
    let wakeChimePlayed = null;
    let wakeVisualActive = null;
    let aiSpokenPrompt = null;
    let qaQuestionReceived = null;

    const runtimeSandbox = {
        console: { log: () => {} },
        window: {},
        document: { getElementById: () => null },
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        fetch: async () => ({ ok: true, json: async () => ({}) }),
        localStorage: { getItem: () => null, setItem: () => {} },
        updateWakeVisual: (active, qa) => { wakeVisualActive = active; },
        playWakeChime: (type) => { wakeChimePlayed = type; },
        speakAI: (text, cb) => {
            aiSpokenPrompt = text;
            if (cb) setImmediate(cb);
        },
        processCommandWithAI: (cmd) => { executedAction = cmd; },
        processQAQuestion: (q) => { qaQuestionReceived = q; }
    };
    runtimeSandbox.window = runtimeSandbox;
    vm.createContext(runtimeSandbox);
    vm.runInContext(configCode, runtimeSandbox);
    vm.runInContext(speechCode, runtimeSandbox);

    const getAwake = () => vm.runInContext('isAwake', runtimeSandbox);
    const getQAMode = () => vm.runInContext('isQAMode', runtimeSandbox);
    const setQAMode = (v) => vm.runInContext(`isQAMode = ${v}`, runtimeSandbox);
    const getTimer = () => vm.runInContext('wakeTimeoutTimer', runtimeSandbox);
    const resetToStandby = (s) => vm.runInContext(`resetToStandby(${s})`, runtimeSandbox);
    const runVoice = (text) => vm.runInContext(`handleVoicePipeline(${JSON.stringify(text)})`, runtimeSandbox);

    // 5.1 Strict Denial of unwoken commands
    resetToStandby(true);
    const unwokenToBlock = [
        'ไปหยิบขวดน้ำ',
        'ช่วยไปเอาสมุด',
        'กลับฐาน',
        'หยุด',
        'เช็คสถานะ esp32',
        'เริ่มตอบคำถาม',
        'คุยกันหน่อย'
    ];
    let allUnwokenBlocked = true;
    for (const cmd of unwokenToBlock) {
        executedAction = null;
        runVoice(cmd);
        if (executedAction !== null || getAwake() === true) {
            allUnwokenBlocked = false;
            console.log(`   [FAIL-UNWOKEN] Unwoken command executed while asleep: "${cmd}"`);
        }
    }
    logResult('Strict Wake Gating: Block Unwoken Actions ("ข้ามขั้นตอนไม่ได้")', allUnwokenBlocked, 'Zero action triggers without explicit wake word');

    // 5.2 Wake Word & Polite Particle Variants (Treated as Wake-Only -> Reply "ค่ะ" & Start 15s Timer)
    const wakePhrases = [
        'nexxa',
        'hello nexxa',
        'hey nexxa',
        'เน็กซ่า',
        'เนกซ่า',
        'เน็กซ่าครับ',
        'เน็กซ่าค่ะ',
        'เน็กซ่าคะ',
        'nexxa please',
        'ฮัลโหล เน็กซ่า',
        'เฮลโลเน็กซ่า',
        'สวัสดีเน็กซ่า',
        'ตื่นได้แล้ว'
    ];
    let allWakePassed = true;
    for (const w of wakePhrases) {
        resetToStandby(true);
        executedAction = null;
        aiSpokenPrompt = null;
        runVoice(w);
        await new Promise(r => setImmediate(r));
        if (getAwake() !== true || executedAction !== null || !aiSpokenPrompt) {
            allWakePassed = false;
            console.log(`   [FAIL-WAKE] Phrase failed wake-only test: "${w}" (Awake: ${getAwake()}, Action: ${executedAction}, Prompt: ${aiSpokenPrompt})`);
        }
    }
    logResult(`Wake Word & Polite Greeting Recognition (${wakePhrases.length} variants)`, allWakePassed, 'All wake words cleanly enter wake state, reply greeting, and start timer without premature action');

    // 5.3 Single-Sentence Wake + Command (Combined in one utterance)
    const directCommands = [
        { spoken: 'nexxa ไปหยิบขวดน้ำ', expectedCmd: 'ไปหยิบขวดน้ำ' },
        { spoken: 'hello nexxa กลับฐาน', expectedCmd: 'กลับฐาน' },
        { spoken: 'เน็กซ่าครับ ช่วยหยิบปากกาให้หน่อย', expectedCmd: 'ช่วยหยิบปากกาให้หน่อย' },
        { spoken: 'เน็กซ่า เช็คสถานะ', expectedCmd: 'เช็คสถานะ' },
        { spoken: 'hey nexxa หยุดทำงาน', expectedCmd: 'หยุดทำงาน' }
    ];
    let allDirectPassed = true;
    for (const dc of directCommands) {
        resetToStandby(true);
        executedAction = null;
        runVoice(dc.spoken);
        if (getAwake() !== true || executedAction !== dc.expectedCmd) {
            allDirectPassed = false;
            console.log(`   [FAIL-DIRECT] "${dc.spoken}" -> Got Action: "${executedAction}" (Expected: "${dc.expectedCmd}")`);
        }
    }
    logResult(`Single-Sentence Wake + Command Flow (${directCommands.length} compound phrases)`, allDirectPassed, 'Immediate command dispatch with wake word and polite particles stripped');

    // 5.4 Two-Step Conversation Flow (Wake -> Greeting -> Command within 15s)
    resetToStandby(true);
    runVoice('เน็กซ่า');
    await new Promise(r => setImmediate(r));
    const step1Awake = getAwake() === true;
    const step1Timer = getTimer() !== null;
    executedAction = null;
    runVoice('ช่วยหยิบกล่องพัสดุ');
    const step2Passed = (executedAction === 'ช่วยหยิบกล่องพัสดุ' && getTimer() === null);
    logResult('Two-Step Conversation Flow (Wake -> 15s window -> Command)', step1Awake && step1Timer && step2Passed, `Timer cleanly handled and dispatched "${executedAction}"`);

    // =========================================================================
    // 6. Q&A MODE CONTINUOUS CONVERSATION & NATURAL STOP TRIGGERS
    // =========================================================================
    console.log('\n--- 6. Q&A CONTINUOUS CONVERSATION & NATURAL STOP TRIGGERS ---');
    setQAMode(true);

    // 6.1 Asking a question in QA mode (Passes directly to Gemini without wake word)
    qaQuestionReceived = null;
    runVoice('ดวงอาทิตย์อยู่ห่างจากโลกเท่าไร');
    const qaQPassed = (qaQuestionReceived === 'ดวงอาทิตย์อยู่ห่างจากโลกเท่าไร' && getQAMode() === true);
    logResult('Q&A Mode Continuous Flow: Direct Question Dispatch', qaQPassed, `Received Question: "${qaQuestionReceived}"`);

    // 6.2 All natural exit keywords in QA mode
    const qaExitPhrases = [
        'หยุด',
        'stop',
        'พอแล้ว',
        'พอ',
        'พอแค่นี้',
        'ให้หยุดตอบ',
        'หยุดตอบคำถาม',
        'หยุดตอบ',
        'เลิกตอบ',
        'เลิกถาม',
        'หยุดถามตอบ',
        'พอแล้วหยุดตอบ',
        'หยุดพูด',
        'ไม่ต้องตอบ',
        'ไม่ต้องตอบแล้ว',
        'ไม่มีคำถามแล้ว',
        'ไม่ถามแล้ว',
        'ไม่เอาแล้ว',
        'จบ',
        'ออก',
        'ออกจากโหมด',
        'ยกเลิก',
        'ไม่เป็นไร',
        'cancel',
        'exit',
        'quit',
        'bye',
        'บาย',
        'stop qa'
    ];

    let allQAExitPassed = true;
    for (const exitKw of qaExitPhrases) {
        setQAMode(true);
        runVoice(exitKw);
        await new Promise(r => setImmediate(r));
        if (getQAMode() !== false) {
            allQAExitPassed = false;
            console.log(`   [FAIL-QA-EXIT] Failed to exit QA mode on phrase: "${exitKw}"`);
        }
    }
    logResult(`Q&A Continuous Mode Natural Exit (${qaExitPhrases.length} exit phrases)`, allQAExitPassed, 'Every Thai & English exit phrase successfully exits Q&A mode to Standby');

    // =========================================================================
    // 7. ECHO CANCELLATION & AUDIO BARGE-IN PROTECTION
    // =========================================================================
    console.log('\n--- 7. ECHO CANCELLATION & AUDIO BARGE-IN PROTECTION ---');
    let stopAudioCalled = false;
    vm.runInContext('isSpeakingNow = true;', runtimeSandbox);
    runtimeSandbox.stopAudioPlayback = () => { stopAudioCalled = true; };
    runtimeSandbox.window.stopAudioPlayback = () => { stopAudioCalled = true; };

    // 7.1 Casual / Ambient noise while speaking -> MUST BE IGNORED
    const noiseWhileSpeaking = [
        'สวัสดีค่ะ',
        'กำลังไปหยิบ',
        'เสียงลม',
        'เสียงแอร์',
        'เอ่ออออ',
        'อืมมมม',
        'ได้ยินไหม'
    ];
    let allNoiseIgnored = true;
    for (const noise of noiseWhileSpeaking) {
        stopAudioCalled = false;
        runVoice(noise);
        if (stopAudioCalled) {
            allNoiseIgnored = false;
            console.log(`   [FAIL-ECHO] Robot audio cut off by ambient noise: "${noise}"`);
        }
    }
    logResult(`Echo Cancellation: Ambient Noise Ignored (${noiseWhileSpeaking.length} noises)`, allNoiseIgnored, 'Microphone noise & self-echo do not cut off active speech');

    // 7.2 Explicit Interruption / Barge-in while speaking -> MUST HALT AUDIO IMMEDIATELY
    const bargeInKeywords = ['หยุด', 'stop', 'พอแล้ว', 'ยกเลิก', 'nexxa', 'เน็กซ่า'];
    let allBargeInPassed = true;
    for (const bKw of bargeInKeywords) {
        stopAudioCalled = false;
        runVoice(bKw);
        if (!stopAudioCalled) {
            allBargeInPassed = false;
            console.log(`   [FAIL-BARGE-IN] Barge-in failed to stop audio on keyword: "${bKw}"`);
        }
    }
    logResult(`Audio Barge-In: Explicit Stop Halts Speech (${bargeInKeywords.length} interruption keywords)`, allBargeInPassed, 'Explicit user stop commands immediately halt audio playback');
    vm.runInContext('isSpeakingNow = false;', runtimeSandbox);

    // =========================================================================
    // 8. SERVER TTS & /speak HIGH-CONCURRENCY STRESS TEST
    // =========================================================================
    console.log('\n--- 8. SERVER TTS & /speak HIGH-CONCURRENCY STRESS TEST ---');
    try {
        // 8.1 20 Concurrent /tts requests
        const ttsProms = [];
        const testPhrases = [
            'สวัสดีค่ะ เน็กซ่าพร้อมรับคำสั่งค่ะ',
            'กำลังไปหยิบขวดน้ำให้ค่ะ',
            'กำลังกลับไปที่ฐานค่ะ',
            'หยุดการทำงานเรียบร้อยแล้วค่ะ',
            'กำลังตรวจสอบสถานะอุปกรณ์ ESP32 ค่ะ'
        ];
        for (let i = 0; i < 20; i++) {
            const p = testPhrases[i % testPhrases.length];
            ttsProms.push(fetch(`${BASE_URL}/tts?text=${encodeURIComponent(p)}`));
        }
        const ttsResponses = await Promise.all(ttsProms);
        let allTtsOk = true;
        for (const r of ttsResponses) {
            if (r.status !== 200) allTtsOk = false;
            const buf = await r.arrayBuffer();
            if (buf.byteLength < 500) allTtsOk = false;
        }
        logResult('High-Concurrency TTS Stream (20 parallel requests)', allTtsOk, 'Zero EPERM/file-locking errors, all returned valid MP3');

        // 8.2 10 Concurrent /speak requests
        const spkProms = [];
        for (let i = 0; i < 10; i++) {
            const p = testPhrases[i % testPhrases.length];
            spkProms.push(fetch(`${BASE_URL}/speak?text=${encodeURIComponent(p)}`));
        }
        const spkResponses = await Promise.all(spkProms);
        let allSpkOk = true;
        for (const r of spkResponses) {
            if (r.status !== 200) allSpkOk = false;
            const data = await r.json();
            if (data.status !== 'playing' || data.voice !== 'female') allSpkOk = false;
        }
        logResult('High-Concurrency /speak Playback (10 parallel requests)', allSpkOk, 'All requests processed with authoritative female neural voice');
    } catch (e) {
        logResult('Server Concurrency Stress Testing', false, e.message);
    }

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log('\n' + '='.repeat(75));
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const percent = totalTests ? Math.round((passedTests / totalTests) * 100) : 0;
    console.log(`PRODUCTION SPEECH SUITE SUMMARY: ${passedTests}/${totalTests} PASSED (${percent}%)`);
    console.log('='.repeat(75));

    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

runProductionSpeechTests();
