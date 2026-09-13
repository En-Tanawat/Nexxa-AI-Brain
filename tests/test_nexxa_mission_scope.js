/**
 * NEXXA AI ROBOT - FORMAL MISSION OBJECTIVES & SCOPE TEST SUITE
 * =========================================================================
 * ตรวจสอบความถูกต้องสมบูรณ์ตามวัตถุประสงค์และขอบเขตโครงงาน 100%:
 * วัตถุประสงค์:
 * 1. รับคำสั่งและตอบโต้กับผู้ใช้อย่างเหมาะสม
 * 2. สั่งงานหุ่นยนต์: เดินตามเส้น, หยุด, เคลื่อนย้ายวัตถุ, สั่งแขนกลหยิบและวาง
 * 3. รายงานสถานะ ผลการปฏิบัติงาน และข้อผิดพลาด
 * 4. ควบคุมสะดวก ปลอดภัย และเข้าใจง่าย
 * ขอบเขต:
 * 1. สื่อสารผ่านข้อความ และคำสั่งเสียง
 * 2. AI วิเคราะห์และแปลงคำสั่งควบคุมตามขอบเขต
 * 3. คำสั่งพื้นฐาน: เริ่ม/หยุดเดินตามเส้น, ไปยังสถานี, หยิบ/ย้าย/วาง, ตรวจสอบสถานะ, หยุดฉุกเฉิน
 * 4. AI ตอบยืนยันคำสั่งก่อนเริ่มปฏิบัติงาน
 * 5. แจ้งสถานะ: กำลังเดินทาง, ถึงจุดหมาย, กำลังหยิบ/วาง, สำเร็จ, ไม่สามารถดำเนินการได้
 * 6. ถามข้อมูลเพิ่มเติมเมื่อคำสั่งไม่ชัดเจน (Clarification)
 * 7. ตรวจพบสิ่งกีดขวาง, วัตถุหลุดจากแขนกล, ออกนอกเส้น -> หยุดและแจ้งเตือนทันที
 * 8. ควบคุมเฉพาะคำสั่งและสถานการณ์ในโครงงาน (Scoped Control)
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

async function runMissionScopeTests() {
    console.log('='.repeat(75));
    console.log('    NEXXA AI ROBOT - FORMAL OBJECTIVES & SCOPE VERIFICATION SUITE');
    console.log('='.repeat(75));

    // -------------------------------------------------------------------------
    // Setup Shared VM Sandbox for Local NLP Engine
    // -------------------------------------------------------------------------
    const nlpCode = fs.readFileSync(path.join(ROOT_DIR, 'js/nlp.js'), 'utf8');
    const configCode = fs.readFileSync(path.join(ROOT_DIR, 'js/config.js'), 'utf8');

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
    // 1. SCOPE 3: LINE TRACKING (เริ่มและหยุดเดินตามเส้น)
    // =========================================================================
    console.log('\n--- 1. SCOPE 3: LINE TRACKING (เริ่มและหยุดเดินตามเส้น) ---');
    const startLineTests = [
        'เริ่มเดินตามเส้น',
        'เดินตามเส้น',
        'วิ่งตามเส้น',
        'เริ่มตามเส้นทาง',
        'start line track',
        'follow line'
    ];
    let startLinePass = true;
    for (const phrase of startLineTests) {
        const res = parseNLP(phrase);
        if (res.action !== 'START_LINE_TRACK' || !res.speech.includes('ยืนยันคำสั่ง')) {
            startLinePass = false;
            console.log(`   [FAIL] START_LINE_TRACK failed on "${phrase}": got ${res.action}, speech: ${res.speech}`);
        }
    }
    logResult(`Line Tracking: Start Line Track (${startLineTests.length} phrases)`, startLinePass, 'Action: START_LINE_TRACK with safety confirmation');

    const stopLineTests = [
        'หยุดเดินตามเส้น',
        'เลิกเดินตามเส้น',
        'หยุดตามเส้น',
        'stop line track'
    ];
    let stopLinePass = true;
    for (const phrase of stopLineTests) {
        const res = parseNLP(phrase);
        if (res.action !== 'STOP_LINE_TRACK') {
            stopLinePass = false;
            console.log(`   [FAIL] STOP_LINE_TRACK failed on "${phrase}": got ${res.action}`);
        }
    }
    logResult(`Line Tracking: Stop Line Track (${stopLineTests.length} phrases)`, stopLinePass, 'Action: STOP_LINE_TRACK correctly separated from general STOP');

    // =========================================================================
    // 2. SCOPE 3: STATION NAVIGATION (เดินทางไปยังสถานีที่กำหนด)
    // =========================================================================
    console.log('\n--- 2. SCOPE 3: STATION NAVIGATION (เดินทางไปยังสถานีที่กำหนด) ---');
    const navTests = [
        { text: 'ไปสถานี A', expectedTarget: 'station_a', label: 'สถานี A' },
        { text: 'เดินทางไปสถานี B', expectedTarget: 'station_b', label: 'สถานี B' },
        { text: 'ไปจุดรับของ', expectedTarget: 'pickup_point', label: 'จุดรับของ' },
        { text: 'เดินทางไปจุดส่งของ', expectedTarget: 'drop_point', label: 'จุดส่งของ' },
        { text: 'ไปยังสถานี 1', expectedTarget: 'station_1', label: 'สถานี 1' },
        { text: 'navigate to station a', expectedTarget: 'station_a', label: 'Station A (EN)' }
    ];
    let navPass = true;
    for (const t of navTests) {
        const res = parseNLP(t.text);
        if (res.action !== 'NAVIGATE_TO' || res.target !== t.expectedTarget || !res.speech.includes('ยืนยันคำสั่ง')) {
            navPass = false;
            console.log(`   [FAIL] NAVIGATE_TO failed on "${t.text}": got action=${res.action}, target=${res.target}`);
        }
    }
    logResult(`Station Navigation: Route to Defined Stations (${navTests.length} stations)`, navPass, 'Action: NAVIGATE_TO with station targets and confirmation');

    // =========================================================================
    // 3. SCOPE 3: ROBOTIC ARM - PICK, PLACE & MOVE OBJECTS
    // =========================================================================
    console.log('\n--- 3. SCOPE 3: ROBOTIC ARM - PICK, PLACE & MOVE OBJECTS ---');
    // 3.1 PICK
    const pickRes = parseNLP('ช่วยหยิบขวดน้ำ');
    const pickPass = (pickRes.action === 'PICK' && pickRes.english_target === 'bottle');
    logResult('Robotic Arm: PICK Object ("ช่วยหยิบขวดน้ำ")', pickPass, `Target: ${pickRes.target}/${pickRes.english_target}`);

    // 3.2 PLACE
    const placeTests = [
        { text: 'วางขวดน้ำลง', expected: 'ขวดน้ำ' },
        { text: 'ช่วยวางกล่องพัสดุ', expected: 'กล่องพัสดุ' },
        { text: 'วางของลง', expected: 'ของ' },
        { text: 'ปล่อยของ', expected: 'วัตถุ' }
    ];
    let placePass = true;
    for (const pt of placeTests) {
        const res = parseNLP(pt.text);
        if (res.action !== 'PLACE' || !res.speech.includes('วาง')) {
            placePass = false;
            console.log(`   [FAIL] PLACE failed on "${pt.text}": got ${res.action}`);
        }
    }
    logResult(`Robotic Arm: PLACE Object (${placeTests.length} variations)`, placePass, 'Action: PLACE with arm placement feedback');

    // 3.3 MOVE_OBJECT (Transfer item to station)
    const moveTests = [
        { text: 'ย้ายขวดน้ำไปสถานี B', expectedItem: 'ขวดน้ำ', expectedDest: 'station_b' },
        { text: 'นำกล่องพัสดุไปส่งที่สถานี A', expectedItem: 'กล่องพัสดุ', expectedDest: 'station_a' },
        { text: 'ช่วยย้ายเอกสารไปจุดส่งของ', expectedItem: 'เอกสาร', expectedDest: 'drop_point' },
        { text: 'เคลื่อนย้ายแก้วน้ำไปสถานี 2', expectedItem: 'แก้วน้ำ', expectedDest: 'station_2' }
    ];
    let movePass = true;
    for (const mt of moveTests) {
        const res = parseNLP(mt.text);
        if (res.action !== 'MOVE_OBJECT' || res.target !== mt.expectedItem || res.destination !== mt.expectedDest || !res.speech.includes('ยืนยันคำสั่ง')) {
            movePass = false;
            console.log(`   [FAIL] MOVE_OBJECT failed on "${mt.text}": got action=${res.action}, target=${res.target}, dest=${res.destination}`);
        }
    }
    logResult(`Robotic Arm: MOVE_OBJECT (${moveTests.length} multi-parameter commands)`, movePass, 'Action: MOVE_OBJECT with object and destination station parsing');

    // =========================================================================
    // 4. SCOPE 4: COMMAND CONFIRMATION BEFORE EXECUTION
    // =========================================================================
    console.log('\n--- 4. SCOPE 4: COMMAND CONFIRMATION BEFORE EXECUTION ---');
    const confirmationPhrases = [
        'เริ่มเดินตามเส้น',
        'ไปสถานี B',
        'ย้ายขวดน้ำไปสถานี B'
    ];
    let allConfirmed = true;
    for (const cp of confirmationPhrases) {
        const res = parseNLP(cp);
        if (!res.speech.startsWith('ยืนยันคำสั่งค่ะ')) {
            allConfirmed = false;
            console.log(`   [FAIL] Safety confirmation missing in speech for: "${cp}" -> "${res.speech}"`);
        }
    }
    logResult(`Safety Confirmation Before Task Execution (${confirmationPhrases.length} operations)`, allConfirmed, 'All hazardous tasks begin with clear verbal confirmation');

    // =========================================================================
    // 5. SCOPE 6: AMBIGUITY CLARIFICATION (สอบถามข้อมูลเพิ่มเติมเมื่อคำสั่งไม่ชัดเจน)
    // =========================================================================
    console.log('\n--- 5. SCOPE 6: AMBIGUITY CLARIFICATION (สอบถามข้อมูลเพิ่มเติม) ---');
    const clarifyTests = [
        { text: 'ช่วยหยิบหน่อย', targetKind: 'pick_object', desc: 'สั่งหยิบแต่ไม่ระบุของ' },
        { text: 'ช่วยหยิบให้หน่อย', targetKind: 'pick_object', desc: 'สั่งหยิบให้หน่อย' },
        { text: 'ช่วยย้ายของ', targetKind: 'move_destination', desc: 'สั่งย้ายแต่ไม่ระบุสถานี' },
        { text: 'ย้ายสิ่งของ', targetKind: 'move_destination', desc: 'ย้ายสิ่งของ' },
        { text: 'เดินทางไปหน่อย', targetKind: 'station', desc: 'สั่งเดินทางแต่ไม่ระบุสถานี' },
        { text: 'ช่วยไปส่งหน่อย', targetKind: 'station', desc: 'ช่วยไปส่งหน่อย' },
        { text: 'ช่วยวางหน่อย', targetKind: 'place_position', desc: 'สั่งวางแต่ไม่ระบุตำแหน่ง' }
    ];
    let clarifyPass = true;
    for (const ct of clarifyTests) {
        const res = parseNLP(ct.text);
        if (res.action !== 'CLARIFY' || res.target !== ct.targetKind || !res.speech.includes('?')) {
            clarifyPass = false;
            console.log(`   [FAIL] CLARIFY failed on "${ct.text}": got action=${res.action}, target=${res.target}, speech=${res.speech}`);
        }
    }
    logResult(`Ambiguity Clarification Questions (${clarifyTests.length} underspecified inputs)`, clarifyPass, 'Action: CLARIFY with targeted clarification questions before robotic action');

    // =========================================================================
    // 6. SCOPE 7: SAFETY FAULT ALERTS & EMERGENCY STOP
    // =========================================================================
    console.log('\n--- 6. SCOPE 7: SAFETY FAULT ALERTS & EMERGENCY STOP ---');
    const faultTests = [
        { text: 'เจอสิ่งกีดขวาง', expectedFault: 'obstacle', keyword: 'สิ่งกีดขวาง' },
        { text: 'มีสิ่งกีดขวางด้านหน้า', expectedFault: 'obstacle', keyword: 'สิ่งกีดขวาง' },
        { text: 'วัตถุหลุดจากแขนกล', expectedFault: 'object_dropped', keyword: 'หลุดจากแขนกล' },
        { text: 'ของหลุด', expectedFault: 'object_dropped', keyword: 'หลุดจากแขนกล' },
        { text: 'หุ่นยนต์ออกนอกเส้น', expectedFault: 'line_off_track', keyword: 'ออกนอกเส้นทาง' },
        { text: 'หลุดเส้นทาง', expectedFault: 'line_off_track', keyword: 'ออกนอกเส้นทาง' }
    ];
    let faultPass = true;
    for (const ft of faultTests) {
        const res = parseNLP(ft.text);
        if (res.action !== 'SAFETY_ALERT' || res.target !== ft.expectedFault || !res.speech.includes(ft.keyword)) {
            faultPass = false;
            console.log(`   [FAIL] SAFETY_ALERT failed on "${ft.text}": got action=${res.action}, target=${res.target}`);
        }
    }
    logResult(`Safety Alerts & Fault Detection (${faultTests.length} scenarios)`, faultPass, 'Obstacle, dropped object, and line-off-track halt system and emit alert');

    // Emergency Stop
    const emgRes = parseNLP('หยุดฉุกเฉิน');
    const emgPass = (emgRes.action === 'STOP' && emgRes.speech.includes('หยุดการทำงานเรียบร้อยแล้วค่ะ'));
    logResult('Emergency Stop Action ("หยุดฉุกเฉิน")', emgPass, 'Action: STOP immediately halt all motors and systems');

    // =========================================================================
    // 7. SCOPE 8: SCOPED CONTROL BOUNDARIES
    // =========================================================================
    console.log('\n--- 7. SCOPE 8: SCOPED CONTROL BOUNDARIES ---');
    const outOfScopePhrases = [
        'ซื้อหุ้นตัวไหนดี',
        'เล่นเกมกันเถอะ',
        'เปิดหนังให้ดูหน่อย',
        'ทำกับข้าวให้กินหน่อย'
    ];
    let scopePass = true;
    for (const oos of outOfScopePhrases) {
        const res = parseNLP(oos);
        if (res.action !== 'NONE' || !res.speech.includes('AI ควบคุมหุ่นยนต์')) {
            scopePass = false;
            console.log(`   [FAIL] Out of scope boundary failed on "${oos}": action=${res.action}, speech=${res.speech}`);
        }
    }
    logResult(`Mission Scope Boundary Enforcement (${outOfScopePhrases.length} non-robot inputs)`, scopePass, 'Safely answers with robot mission scope without erratic hardware triggers');

    // =========================================================================
    // 8. SCOPE 1 & ESP32 SERVER REST API ENDPOINTS
    // =========================================================================
    console.log('\n--- 8. SCOPE 1 & ESP32 SERVER REST API ENDPOINTS ---');
    try {
        // Test POST /command for START_LINE_TRACK
        const postLineRes = await fetch(`${BASE_URL}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'START_LINE_TRACK', target: 'line' })
        });
        const lineData = await postLineRes.json();
        logResult('REST Command: START_LINE_TRACK', postLineRes.status === 200 && lineData.robot_status === 'line_tracking', `Status: ${lineData.robot_status}`);

        // Test POST /command for STOP_LINE_TRACK
        const postStopLineRes = await fetch(`${BASE_URL}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'STOP_LINE_TRACK', target: 'line' })
        });
        const stopLineData = await postStopLineRes.json();
        logResult('REST Command: STOP_LINE_TRACK', postStopLineRes.status === 200 && stopLineData.robot_status === 'line_tracking_stopped', `Status: ${stopLineData.robot_status}`);

        // Test POST /command for NAVIGATE_TO
        const postNavRes = await fetch(`${BASE_URL}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'NAVIGATE_TO', target: 'station_a' })
        });
        const navData = await postNavRes.json();
        logResult('REST Command: NAVIGATE_TO station_a', postNavRes.status === 200 && navData.robot_status === 'navigating', `Status: ${navData.robot_status}`);

        // Test POST /command for PLACE
        const postPlaceRes = await fetch(`${BASE_URL}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'PLACE', target: 'bottle' })
        });
        const placeData = await postPlaceRes.json();
        logResult('REST Command: PLACE bottle', postPlaceRes.status === 200 && placeData.robot_status === 'placing', `Status: ${placeData.robot_status}`);

        // Test POST /command for MOVE_OBJECT
        const postMoveRes = await fetch(`${BASE_URL}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'MOVE_OBJECT', target: 'bottle:station_b' })
        });
        const moveData = await postMoveRes.json();
        logResult('REST Command: MOVE_OBJECT bottle:station_b', postMoveRes.status === 200 && moveData.robot_status === 'moving_object', `Status: ${moveData.robot_status}`);

        // Test POST /command for SAFETY_ALERT
        const postAlertRes = await fetch(`${BASE_URL}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'SAFETY_ALERT', target: 'obstacle' })
        });
        const alertData = await postAlertRes.json();
        logResult('REST Command: SAFETY_ALERT obstacle', postAlertRes.status === 200 && alertData.robot_status === 'safety_alert', `Status: ${alertData.robot_status}`);

        // Test Text Chat Communication via POST /api/log
        const chatLogRes = await fetch(`${BASE_URL}/api/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'USER_INPUT',
                direction: 'INCOMING',
                badge: '💬 USER CHAT (ข้อความ)',
                message: 'เริ่มเดินตามเส้นทาง',
                transcript: 'เริ่มเดินตามเส้นทาง'
            })
        });
        const chatData = await chatLogRes.json();
        logResult('Text Communication via API (ขอบเขตข้อ 1)', chatLogRes.status === 200 && chatData.status === 'ok', 'Bidirectional Text Chat stream verified');
    } catch (e) {
        logResult('Server API Mission Scope Integration', false, e.message);
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n' + '='.repeat(75));
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const percent = totalTests ? Math.round((passedTests / totalTests) * 100) : 0;
    console.log(`NEXXA MISSION SCOPE SUMMARY: ${passedTests}/${totalTests} PASSED (${percent}%)`);
    console.log('='.repeat(75));

    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

runMissionScopeTests();
