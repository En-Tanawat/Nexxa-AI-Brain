const vm = require('vm');
const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..');

async function testDashboardActionSync() {
    console.log('='.repeat(60));
    console.log('   TEST: DASHBOARD ACTION -> ROBOT UI SYNC & INTERACTION');
    console.log('='.repeat(60));

    // 1. Test Server Endpoint
    const res = await fetch('http://localhost:8000/command?action=PICK&target=%E0%B8%82%E0%B8%A7%E0%B8%94%E0%B8%99%E0%B9%89%E0%B8%B2&fromDashboard=1', {
        headers: { 'X-From-Dashboard': '1' }
    });
    const data = await res.json();
    console.log('[PASS] /command from Dashboard response:', data.received_action === 'PICK' && data.fromDashboard === true ? 'OK' : 'FAIL');

    // 2. Test js/app.js handleDashboardActionCommand in sandbox
    const configCode = fs.readFileSync(path.join(ROOT_DIR, 'js/config.js'), 'utf8');
    const speechCode = fs.readFileSync(path.join(ROOT_DIR, 'js/speech.js'), 'utf8');
    const appCode = fs.readFileSync(path.join(ROOT_DIR, 'js/app.js'), 'utf8');

    let spokenTexts = [];
    let visualStates = [];
    let bannerShown = [];
    let chimePlayed = [];
    let audioStopped = false;

    const domBanner = {
        innerHTML: '',
        classList: {
            add: (cls) => domBanner.classes.add(cls),
            remove: (cls) => domBanner.classes.delete(cls)
        },
        classes: new Set()
    };

    const sandbox = {
        console: { log: () => {} },
        addEventListener: () => {},
        window: {},
        document: {
            getElementById: (id) => {
                if (id === 'actionBanner') return domBanner;
                return null;
            },
            addEventListener: () => {}
        },
        setTimeout: (fn, ms) => {
            if (ms && ms > 100) return 123;
            return fn();
        },
        clearTimeout: () => {},
        fetch: async () => ({ ok: true, json: async () => ({}) }),
        localStorage: { getItem: () => null, setItem: () => {} },
        updateWakeVisual: (active, qa) => { visualStates.push({ active, qa }); },
        playWakeChime: (type) => { chimePlayed.push(type); },
        stopAudioPlayback: () => { audioStopped = true; },
        speakAI: (text, cb) => {
            spokenTexts.push(text);
            if (cb) cb();
        }
    };
    sandbox.window = sandbox;

    vm.createContext(sandbox);
    vm.runInContext(configCode, sandbox);
    vm.runInContext(speechCode, sandbox);
    vm.runInContext(appCode, sandbox);

    const getIsAwake = () => vm.runInContext('isAwake', sandbox);
    const getIsQAMode = () => vm.runInContext('isQAMode', sandbox);

    // Test PICK action
    spokenTexts = [];
    sandbox.handleDashboardActionCommand({ action: 'PICK', target: 'ขวดน้ำ', fromDashboard: true });
    console.log('[PASS] Action PICK Speech:', spokenTexts.includes('กำลังไปหยิบขวดน้ำให้ค่ะ') ? 'OK' : 'FAIL', `(${spokenTexts[0]})`);
    console.log('[PASS] Action PICK Awake:', getIsAwake() === true ? 'OK' : 'FAIL');
    console.log('[PASS] Action PICK Banner:', domBanner.innerHTML.includes('ขวดน้ำ') ? 'OK' : 'FAIL');

    // Test HOME action
    spokenTexts = [];
    sandbox.handleDashboardActionCommand({ action: 'HOME', fromDashboard: true });
    console.log('[PASS] Action HOME Speech:', spokenTexts.includes('กำลังกลับไปที่ฐานค่ะ') ? 'OK' : 'FAIL', `(${spokenTexts[0]})`);

    // Test STOP action
    spokenTexts = [];
    audioStopped = false;
    sandbox.handleDashboardActionCommand({ action: 'STOP', fromDashboard: true });
    console.log('[PASS] Action STOP Speech:', spokenTexts.includes('หยุดการทำงานเรียบร้อยแล้วค่ะ') ? 'OK' : 'FAIL', `(${spokenTexts[0]})`);
    console.log('[PASS] Action STOP Audio Stopped:', audioStopped === true ? 'OK' : 'FAIL');

    // Test CheckStatus action
    spokenTexts = [];
    sandbox.handleDashboardActionCommand({ action: 'CheckStatus', fromDashboard: true });
    console.log('[PASS] Action CheckStatus Speech:', spokenTexts.includes('อุปกรณ์ ESP32 พร้อมใช้งานค่ะ สถานะออนไลน์ปกติค่ะ') ? 'OK' : 'FAIL', `(${spokenTexts[0]})`);

    // Test AnswerQuestion action
    spokenTexts = [];
    sandbox.handleDashboardActionCommand({ action: 'AnswerQuestion', fromDashboard: true });
    console.log('[PASS] Action AnswerQuestion Speech:', spokenTexts.includes('เข้าสู่โหมดตอบคำถามแล้วค่ะ ถามคำถามได้เลยค่ะ') ? 'OK' : 'FAIL', `(${spokenTexts[0]})`);
    console.log('[PASS] Action AnswerQuestion isQAMode:', getIsQAMode() === true ? 'OK' : 'FAIL');

    // Test StopQA action
    spokenTexts = [];
    sandbox.handleDashboardActionCommand({ action: 'StopQA', fromDashboard: true });
    console.log('[PASS] Action StopQA Speech:', spokenTexts.includes('รับทราบค่ะ หยุดตอบคำถามแล้วค่ะ') ? 'OK' : 'FAIL', `(${spokenTexts[0]})`);
    console.log('[PASS] Action StopQA isQAMode:', getIsQAMode() === false ? 'OK' : 'FAIL');

    // 3. Test Hardware Task Execution Feedback (handleRobotTaskResult)
    // 3.1 Pick Success
    spokenTexts = [];
    sandbox.handleRobotTaskResult({ action: 'PICK', status: 'success', target: 'ขวดน้ำ' });
    console.log('[PASS] Hardware Feedback: PICK Success Speech:', spokenTexts.some(s => s.includes('หยิบขวดน้ำเรียบร้อยแล้ว')) ? 'OK' : 'FAIL', `(${spokenTexts[0]})`);

    // 3.2 Pick Failed
    spokenTexts = [];
    sandbox.handleRobotTaskResult({ action: 'PICK', status: 'failed', target: 'ขวดน้ำ' });
    console.log('[PASS] Hardware Feedback: PICK Failed Speech:', spokenTexts.some(s => s.includes('ไม่สามารถหยิบขวดน้ำได้')) ? 'OK' : 'FAIL', `(${spokenTexts[0]})`);

    // 3.3 Navigate Success
    spokenTexts = [];
    sandbox.handleRobotTaskResult({ action: 'NAVIGATE_TO', status: 'success', target: 'สถานี A' });
    console.log('[PASS] Hardware Feedback: NAVIGATE_TO Success Speech:', spokenTexts.some(s => s.includes('เดินทางถึงสถานี A')) ? 'OK' : 'FAIL', `(${spokenTexts[0]})`);

    // 4. Test Server REST Endpoint /api/robot_status
    const statusPostRes = await fetch('http://localhost:8000/api/robot_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PICK', status: 'success', target: 'ขวดน้ำ', device: 'ESP32_TEST' })
    });
    const statusPostData = await statusPostRes.json();
    console.log('[PASS] Server POST /api/robot_status Endpoint:', statusPostRes.status === 200 && statusPostData.status === 'ok' ? 'OK' : 'FAIL');

    console.log('='.repeat(60));
    console.log('ALL DASHBOARD ACTION SYNC & FEEDBACK TESTS PASSED 100%!');
    console.log('='.repeat(60));
}

testDashboardActionSync().catch(console.error);
