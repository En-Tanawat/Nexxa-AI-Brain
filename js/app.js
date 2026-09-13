/**
 * REXZA AI ROBOT - MAIN APPLICATION COORDINATOR
 * -------------------------------------------------------------
 * ประสานงาน State Machine, จัดการคีย์ลัด, โหมด Q&A และวงรอบการทำงาน
 */

async function processCommandWithAI(commandText) {
    logInfo("ANALYZING", `กำลังวิเคราะห์คำสั่ง: "${commandText}"...`, "#f59e0b");

    if (aiMode === 'local' || !geminiKey || geminiKey.trim().length < 15) {
        logInfo("LOCAL NLP", "ประมวลผลด้วย Smart Local NLP (ออฟไลน์)", "#38bdf8");
        const decision = parseWithLocalNLP(commandText);
        executeDecision(decision);
        return;
    }

    try {
        logInfo("GEMINI BRAIN", `ส่งให้ Google AI Studio (Gemini) ตัดสินใจ: "${commandText}"`, "#a855f7");
        const geminiDecision = await callGeminiAPI(commandText);
        logInfo("GEMINI DECISION", `Action=${geminiDecision.action || 'NONE'} | เสียงตอบ: "${geminiDecision.speech}"`, "#10b981");
        executeDecision(geminiDecision);
    } catch (err) {
        logInfo("GEMINI FALLBACK", `Gemini API ขัดข้อง (${err.message}) -> สลับใช้ Smart NLP สำรอง`, "#f59e0b");
        const fallbackDecision = parseWithLocalNLP(commandText);
        executeDecision(fallbackDecision);
    }
}

function executeDecision(decision) {
    const action = decision.action || 'NONE';
    logInfo("EXECUTING", `Action=${action} | Target=${decision.target || '-'}`, "#10b981");

    // 1. Action CheckStatus
    if (action === 'CheckStatus') {
        checkESP32Status();
        return;
    }

    // 2. Action AnswerQuestion (โหมดถาม-ตอบต่อเนื่อง จนกว่าจะมีคำว่า "ให้หยุดตอบ")
    if (action === 'AnswerQuestion' || action === 'Answer Question') {
        isQAMode = true;
        isAwake = true;
        clearWakeTimer();
        updateWakeVisual(true, true);
        logInfo("QA MODE ACTIVE", 'เข้าสู่โหมดตอบคำถามต่อเนื่อง (ถามได้เรื่อยๆ จนกว่าจะสั่ง "ให้หยุดตอบ")', "#a855f7");
        const reply = decision.speech || "เข้าสู่โหมดตอบคำถามแล้วค่ะ ถามคำถามได้เลยค่ะ";
        speakAI(reply);
        return;
    }

    // 2.5 Action StopQA
    if (action === 'StopQA') {
        isQAMode = false;
        if (decision.speech) {
            speakAI(decision.speech, () => {
                resetToStandby(true);
            });
        } else {
            resetToStandby(true);
        }
        return;
    }

    // 3. Action สั่งการฮาร์ดแวร์ ESP32 (ขอบเขตข้อ 2, 3, 7)
    const hardwareActions = [
        'PICK', 'HOME', 'STOP',
        'START_LINE_TRACK', 'STOP_LINE_TRACK',
        'NAVIGATE_TO', 'PLACE', 'MOVE_OBJECT', 'SAFETY_ALERT'
    ];
    if (hardwareActions.includes(action)) {
        const payloadTarget = decision.destination
            ? `${decision.target || ''}:${decision.destination}`
            : (decision.english_target || decision.target || '');
        sendToESP32(action, payloadTarget);
    }

    if (decision.speech) {
        speakAI(decision.speech, () => {
            // คงสถานะตื่นและเปิดเวลารอรับคำสั่งถัดไป 15 วินาที (ไม่ต้องเรียกปลุกซ้ำ)
            if (typeof startWakeTimer === 'function') {
                startWakeTimer(false);
                logInfo("READY FOR NEXT COMMAND", "ทำตามคำสั่งเรียบร้อยแล้ว ยังคงพร้อมรับคำสั่งถัดไปภายใน 15 วินาที...", "#10b981");
            } else {
                resetToStandby(true);
            }
        });
    } else {
        if (typeof startWakeTimer === 'function') {
            startWakeTimer(false);
        } else {
            resetToStandby(true);
        }
    }
}

async function processQAQuestion(questionText) {
    logInfo("QA THINKING", `กำลังคิดคำตอบ: "${questionText}"...`, "#a855f7");

    if (aiMode === 'local' || !geminiKey || geminiKey.trim().length < 15) {
        const answer = answerQuestionLocally(questionText);
        logInfo("LOCAL QA", `ตอบ: "${answer}"`, "#38bdf8");
        speakAI(answer);
        return;
    }

    try {
        const answer = await callGeminiQA(questionText);
        logInfo("GEMINI QA", `ตอบ: "${answer}"`, "#10b981");
        speakAI(answer);
    } catch (err) {
        logInfo("GEMINI QA FALLBACK", `Gemini ขัดข้อง (${err.message}) -> สลับใช้ Local QA`, "#f59e0b");
        const answer = answerQuestionLocally(questionText);
        speakAI(answer);
    }
}

function answerQuestionLocally(text) {
    const lower = text.toLowerCase();
    if (lower.includes('เวลา') || lower.includes('กี่โมง')) {
        const d = new Date();
        return `ขณะนี้เวลา ${d.getHours()} นาฬิกา ${d.getMinutes()} นาทีค่ะ`;
    }
    if (lower.includes('วันที่') || lower.includes('วันอะไร')) {
        const d = new Date();
        return `วันนี้คือวันที่ ${d.getDate()} เดือน ${d.getMonth() + 1} ค่ะ`;
    }
    if (lower.includes('ชื่ออะไร') || lower.includes('ใครคือคุณ') || lower.includes('คุณเป็นใคร')) {
        return "เน็กซ่าค่ะ (Nexxa) หนูคือ AI ผู้ช่วยหุ่นยนต์ พร้อมตอบคำถามค่ะ";
    }
    if (lower.includes('ทำอะไรได้บ้าง')) {
        return "เน็กซ่าสามารถหยิบของ กลับฐาน หยุดการทำงาน เช็คสถานะ ESP32 และตอบคำถามได้ค่ะ";
    }
    if (lower.includes('บวก') || lower.includes('ลบ') || lower.includes('คูณ') || lower.includes('หาร') || lower.includes('+')) {
        return "เน็กซ่าสามารถคิดเลขและตอบคำถามได้ค่ะ ถามคำถามต่อไปได้เลยนะคะ หรือพูดว่า ให้หยุดตอบ ค่ะ";
    }
    return "รับทราบคำถามค่ะ สามารถถามคำถามต่อไปได้เลยนะคะ หรือบอกว่า ให้หยุดตอบ เมื่อต้องการออกจากโหมดนี้ค่ะ";
}


// Auto-activation, Audio & Screen Wake Lock (Zero-Click Ready)
let wakeLock = null;
let systemReady = false;

async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            logInfo("WAKE LOCK", "เปิด Screen Wake Lock ป้องกันหน้าจอดับแล้ว", "#10b981");
        } catch (err) {}
    }
}

function initZeroClickExperience() {
    if (systemReady) return;
    systemReady = true;

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const tempCtx = new AudioCtx();
            tempCtx.resume();
        }
        // Unlock HTML5 Audio playback immediately
        const dummyAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        dummyAudio.volume = 0.001;
        dummyAudio.play().catch(() => {});
    } catch (e) {}

    requestWakeLock();

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            logInfo("MIC ACCESS", "ไมโครโฟนพร้อมรับฟังคำสั่งเสียงทันที (Zero-Click Ready)", "#10b981");
            stream.getTracks().forEach(t => t.stop());
        }).catch(err => {
            logInfo("MIC PERMISSION", `การเข้าถึงไมโครโฟน: ${err.message}`, "#ef4444");
        });
    }

    if (window.resumeRecognition) window.resumeRecognition();
    logInfo("READY", "เข้าหน้า UI พร้อมทำงานทันที 100% โดยไม่ต้องแตะหน้าจอ", "#10b981");
}

// Tap-to-wake: แตะหน้าจอเพื่อปลุกหุ่นยนต์ได้ทันทีเมื่ออยู่ในโหมดหลับ/สแตนด์บาย (เป็นทางเลือกเสริม)
document.addEventListener('click', (e) => {
    initZeroClickExperience();
    if (typeof isAwake !== 'undefined' && !isAwake) {
        if (e.target && ['INPUT', 'BUTTON', 'A', 'TEXTAREA'].includes(e.target.tagName)) return;
        logInfo("TAP TO WAKE", 'แตะหน้าจอปลุก Nexxa สำเร็จ (เปิดเวลารอคำสั่ง 15 วินาที)', "#10b981");
        if (typeof sendTelemetry === 'function') {
            sendTelemetry({
                type: 'USER_INPUT',
                direction: 'INCOMING',
                badge: 'TAP INPUT (แตะหน้าจอ)',
                transcript: 'nexxa',
                message: 'nexxa'
            });
        }
        handleVoicePipeline("nexxa");
    }
});

// Keyboard simulation shortcuts
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    const sendKeyInput = (text, badge = 'KEYBOARD INPUT') => {
        if (typeof sendTelemetry === 'function') {
            sendTelemetry({
                type: 'USER_INPUT',
                direction: 'INCOMING',
                badge: badge,
                transcript: text,
                message: text
            });
        }
        handleVoicePipeline(text);
    };

    if (key === 'n' || key === ' ') {
        logInfo("SIMULATE", 'กดปุ่ม [N / Space] ปลุก "nexxa" (เปิดเวลา 15 วิ)', "#10b981");
        sendKeyInput("nexxa");
    } else if (key === 'w') {
        logInfo("SIMULATE", 'กดปุ่ม [W] จำลองปลุก+สั่งทันที "hello nexxa ไปหยิบขวดน้ำ"', "#00f0ff");
        sendKeyInput("hello nexxa ไปหยิบขวดน้ำ");
    } else if (key === 't') {
        logInfo("SIMULATE", 'กดปุ่ม [T] จำลองปลุก+เช็คสถานะ "hello nexxa เช็คสถานะ" (CheckStatus)', "#38bdf8");
        sendKeyInput("hello nexxa เช็คสถานะ");
    } else if (key === 'q') {
        logInfo("SIMULATE", 'กดปุ่ม [Q] จำลองปลุก+ถามตอบ "hello nexxa ตอบคำถามหน่อย" (AnswerQuestion)', "#a855f7");
        sendKeyInput("hello nexxa ตอบคำถามหน่อย");
    } else if (key === 'z' || key === 'escape') {
        logInfo("SIMULATE", 'กดปุ่ม [Z / Escape] ออกจากโหมดถามตอบ (Exit QA Mode)', "#ef4444");
        sendKeyInput("หยุดตอบ");
    } else if (key === 'p') {
        logInfo("SIMULATE", 'กดปุ่ม [P] จำลองพูด "ไปหยิบขวดน้ำให้หน่อย"', "#00f0ff");
        sendKeyInput("ไปหยิบขวดน้ำให้หน่อย");
    } else if (key === 'h') {
        logInfo("SIMULATE", 'กดปุ่ม [H] จำลองพูด "กลับฐาน"', "#38bdf8");
        sendKeyInput("กลับฐาน");
    } else if (key === 'x') {
        logInfo("SIMULATE", 'กดปุ่ม [X] จำลองพูด "หยุดเดี๋ยวนี้"', "#ef4444");
        sendKeyInput("หยุดเดี๋ยวนี้");
    } else if (key === 'k') {
        logInfo("SIMULATE", 'กดปุ่ม [K] จำลองพูด "ยกเลิก" (Dismiss / Standby)', "#ef4444");
        sendKeyInput("ยกเลิก");
    } else if (key === 'd') {
        logInfo("DASHBOARD", 'กดปุ่ม [D] เปิดหน้า Live Telemetry Dashboard', "#00f0ff");
        window.open('/dashboard.html', '_blank');
    }
});

function showActionBanner(text, icon = '') {
    const banner = document.getElementById('actionBanner');
    if (!banner) return;
    const iconHtml = icon ? `<span style="font-size: 0.85rem; font-weight: 700; opacity: 0.85;">[${icon}]</span> ` : '';
    banner.innerHTML = `${iconHtml}<span>${text}</span>`;
    banner.classList.add('show');
    if (window._bannerTimer) clearTimeout(window._bannerTimer);
    window._bannerTimer = setTimeout(() => {
        banner.classList.remove('show');
    }, 4500);
}

function handleDashboardActionCommand(ev) {
    const action = ev.action || '';
    const target = ev.target || '';

    logInfo("DASHBOARD ACTION", `รับคำสั่ง Action Dashboard: [${action}] ${target ? `(${target})` : ''} -> แสดงผลบนหน้าจอ UI และเริ่มโต้ตอบทันที`, "#00f0ff");

    // ปลุกหน้าจอ OLED Face ให้ตื่นและแสดงแสงนีออนทันที
    isAwake = true;
    if (action === 'AnswerQuestion') {
        isQAMode = true;
        if (typeof clearWakeTimer === 'function') clearWakeTimer();
        updateWakeVisual(true, true);
    } else {
        updateWakeVisual(true, isQAMode);
    }
    playWakeChime('activate');

    if (action === 'PICK' || action.startsWith('PICK')) {
        const item = target || 'ขวดน้ำ';
        showActionBanner(`คำสั่งหยิบสิ่งของ: ${item}`, 'PICK');
        const speech = `กำลังไปหยิบ${item}ให้ค่ะ`;
        speakAI(speech, () => {
            if (typeof startWakeTimer === 'function') {
                startWakeTimer(false);
                logInfo("READY FOR NEXT COMMAND", "ทำตามคำสั่ง Dashboard เรียบร้อยแล้ว พร้อมรับคำสั่งถัดไปภายใน 15 วินาที...", "#10b981");
            }
        });
        return;
    }

    if (action === 'HOME') {
        showActionBanner('กลับสู่ฐานชาร์จ (HOME)', 'HOME');
        speakAI("กำลังกลับไปที่ฐานค่ะ", () => {
            if (typeof startWakeTimer === 'function') {
                startWakeTimer(false);
            }
        });
        return;
    }

    if (action === 'STOP') {
        showActionBanner('หยุดการทำงานฉุกเฉิน (STOP)', 'STOP');
        stopAudioPlayback();
        speakAI("หยุดการทำงานเรียบร้อยแล้วค่ะ", () => {
            resetToStandby(true);
        });
        return;
    }

    if (action === 'START_LINE_TRACK') {
        showActionBanner('เริ่มต้นเดินตามเส้นทาง (Line Tracking)', 'TRACK');
        speakAI("ยืนยันคำสั่งค่ะ กำลังเริ่มเดินตามเส้นทางนะคะ", () => {
            if (typeof startWakeTimer === 'function') startWakeTimer(false);
        });
        return;
    }

    if (action === 'STOP_LINE_TRACK') {
        showActionBanner('หยุดการเดินตามเส้นทาง', 'STOP');
        speakAI("รับทราบค่ะ หยุดการเดินตามเส้นทางแล้วค่ะ", () => {
            if (typeof startWakeTimer === 'function') startWakeTimer(false);
        });
        return;
    }

    if (action === 'NAVIGATE_TO') {
        const dest = target || 'สถานีปลายทาง';
        showActionBanner(`นำทางไปยัง: ${dest}`, 'NAV');
        speakAI(`ยืนยันคำสั่งค่ะ กำลังเดินทางไปยัง${dest}ค่ะ`, () => {
            if (typeof startWakeTimer === 'function') startWakeTimer(false);
        });
        return;
    }

    if (action === 'PLACE' || action.startsWith('PLACE')) {
        const item = target || 'วัตถุ';
        showActionBanner(`แขนกลวางวัตถุ: ${item}`, 'PLACE');
        speakAI(`กำลังใช้แขนกลวาง${item}ลงตำแหน่งค่ะ`, () => {
            if (typeof startWakeTimer === 'function') startWakeTimer(false);
        });
        return;
    }

    if (action === 'MOVE_OBJECT') {
        const item = target || 'วัตถุ';
        showActionBanner(`เคลื่อนย้ายวัตถุ: ${item}`, 'MOVE');
        speakAI(`ยืนยันคำสั่งค่ะ กำลังเคลื่อนย้าย${item}ค่ะ`, () => {
            if (typeof startWakeTimer === 'function') startWakeTimer(false);
        });
        return;
    }

    if (action === 'SAFETY_ALERT') {
        const reason = target || 'เหตุขัดข้อง';
        showActionBanner(`แจ้งเตือนความปลอดภัย: ${reason}`, 'ALERT');
        stopAudioPlayback();
        let alertSpeech = "แจ้งเตือนความปลอดภัย! ตรวจพบความผิดปกติ ระบบหยุดการทำงานแล้วค่ะ";
        if (target === 'obstacle') alertSpeech = "ตรวจพบสิ่งกีดขวางด้านหน้า! ระบบหยุดการทำงานฉุกเฉินเพื่อความปลอดภัยค่ะ";
        if (target === 'object_dropped') alertSpeech = "แจ้งเตือน! วัตถุหลุดจากแขนกล ระบบหยุดการทำงานชั่วคราวค่ะ";
        if (target === 'line_off_track') alertSpeech = "แจ้งเตือน! หุ่นยนต์ออกนอกเส้นทาง ระบบหยุดการเคลื่อนที่เรียบร้อยแล้วค่ะ";
        speakAI(alertSpeech, () => {
            resetToStandby(true);
        });
        return;
    }

    if (action === 'CLARIFY') {
        showActionBanner('สอบถามข้อมูลเพิ่มเติมจากผู้ใช้', 'CLARIFY');
        const clarifySpeech = target || "ต้องการข้อมูลเพิ่มเติมก่อนเริ่มปฏิบัติงานค่ะ";
        speakAI(clarifySpeech, () => {
            if (typeof startWakeTimer === 'function') startWakeTimer(false);
        });
        return;
    }

    if (action === 'CheckStatus') {
        showActionBanner('ตรวจสอบสถานะอุปกรณ์ ESP32: ออนไลน์พร้อมใช้งาน', 'STATUS');
        speakAI("อุปกรณ์ ESP32 พร้อมใช้งานค่ะ สถานะออนไลน์ปกติค่ะ", () => {
            if (typeof startWakeTimer === 'function') {
                startWakeTimer(false);
            }
        });
        return;
    }

    if (action === 'AnswerQuestion') {
        isQAMode = true;
        if (typeof clearWakeTimer === 'function') clearWakeTimer();
        updateWakeVisual(true, true);
        showActionBanner('เข้าสู่โหมดตอบคำถามต่อเนื่อง (Q&A Mode)', 'QA');
        speakAI("เข้าสู่โหมดตอบคำถามแล้วค่ะ ถามคำถามได้เลยค่ะ");
        return;
    }

    if (action === 'StopQA') {
        isQAMode = false;
        showActionBanner('ออกจากโหมดถามตอบ (Stop QA)', 'STOP');
        speakAI("รับทราบค่ะ หยุดตอบคำถามแล้วค่ะ", () => {
            resetToStandby(true);
        });
        return;
    }

    // คำสั่งอื่นๆ ที่อาจเพิ่มเติมในอนาคต
    showActionBanner(`คำสั่ง: ${action}`, 'ACTION');
    speakAI(`รับทราบคำสั่ง ${action} ค่ะ`, () => {
        if (typeof startWakeTimer === 'function') {
            startWakeTimer(false);
        }
    });
}

function initRobotDashboardSync() {
    if (!window.EventSource) return;
    try {
        const es = new EventSource('/api/events/stream');
        es.onmessage = (e) => {
            if (!e.data || !e.data.trim().startsWith('{')) return;
            try {
                const ev = JSON.parse(e.data);
                // 1. รับเสียงจำลองจาก Voice Simulator บน Dashboard
                if (ev.type === 'SIMULATED_VOICE' && ev.transcript && ev.fromDashboard) {
                    logInfo("DASHBOARD SIMULATION", `รับคำสั่งเสียงจำลองจากแดชบอร์ด: "${ev.transcript}"`, "#00f0ff");
                    handleVoicePipeline(ev.transcript);
                    return;
                }

                // 2. รับคำสั่ง Action จาก Action Dashboard (PICK, HOME, STOP, CheckStatus, Q&A ฯลฯ)
                if (ev.type === 'HARDWARE_COMMAND' && !ev.fromRobotUI) {
                    handleDashboardActionCommand(ev);
                }

                // 3. รับรายงานผลลัพธ์จากฮาร์ดแวร์จริง ESP32 (ROBOT_TASK_RESULT: success / failed)
                if (ev.type === 'ROBOT_TASK_RESULT') {
                    handleRobotTaskResult(ev);
                }
            } catch (err) {}
        };
    } catch (e) {}
}

function handleRobotTaskResult(ev) {
    const action = (ev.action || '').toUpperCase();
    const status = (ev.status || '').toLowerCase();
    const target = ev.target || 'วัตถุ';
    const isSuccess = (status === 'success' || status === 'completed');

    logInfo("HARDWARE FEEDBACK", `รับผลการทำงานจาก ESP32: Action=${action} | Status=${status} | Target=${target}`, isSuccess ? "#10b981" : "#ef4444");

    // ปลุกหน้าจอ OLED Face ให้ตื่นและแสดงออร่า
    isAwake = true;
    updateWakeVisual(true, isQAMode);

    if (action === 'PICK' || action.startsWith('PICK')) {
        if (isSuccess) {
            showActionBanner(`แขนกลหยิบ${target}สำเร็จเรียบร้อยค่ะ`, 'SUCCESS');
            if (typeof setFaceExpression === 'function') setFaceExpression('happy');
            speakAI(`หยิบ${target}เรียบร้อยแล้วค่ะ`, () => {
                if (typeof startWakeTimer === 'function') startWakeTimer(false);
            });
        } else {
            showActionBanner(`ไม่สามารถหยิบ${target}ได้ค่ะ`, 'FAILED');
            if (typeof setFaceExpression === 'function') setFaceExpression('confused');
            speakAI(`เกิดข้อผิดพลาด ไม่สามารถหยิบ${target}ได้ค่ะ`, () => {
                if (typeof startWakeTimer === 'function') startWakeTimer(false);
            });
        }
        return;
    }

    if (action === 'PLACE') {
        if (isSuccess) {
            showActionBanner(`แขนกลวาง${target}ลงตำแหน่งเรียบร้อยค่ะ`, 'SUCCESS');
            if (typeof setFaceExpression === 'function') setFaceExpression('happy');
            speakAI(`วาง${target}ลงตำแหน่งเรียบร้อยแล้วค่ะ`, () => {
                if (typeof startWakeTimer === 'function') startWakeTimer(false);
            });
        } else {
            showActionBanner(`ไม่สามารถวาง${target}ได้ค่ะ`, 'FAILED');
            if (typeof setFaceExpression === 'function') setFaceExpression('confused');
            speakAI(`เกิดข้อผิดพลาด ไม่สามารถวาง${target}ได้ค่ะ`, () => {
                if (typeof startWakeTimer === 'function') startWakeTimer(false);
            });
        }
        return;
    }

    if (action === 'NAVIGATE_TO') {
        if (isSuccess) {
            showActionBanner(`หุ่นยนต์เดินทางถึง${target}เรียบร้อยแล้วค่ะ`, 'SUCCESS');
            if (typeof setFaceExpression === 'function') setFaceExpression('happy');
            speakAI(`เดินทางถึง${target} เรียบร้อยแล้วค่ะ`, () => {
                if (typeof startWakeTimer === 'function') startWakeTimer(false);
            });
        } else {
            showActionBanner(`เดินทางไปยัง${target}ไม่สำเร็จค่ะ`, 'FAILED');
            if (typeof setFaceExpression === 'function') setFaceExpression('confused');
            speakAI(`เกิดข้อผิดพลาด ไม่สามารถเดินทางไปยังสถานีได้ค่ะ`, () => {
                if (typeof startWakeTimer === 'function') startWakeTimer(false);
            });
        }
        return;
    }

    if (action === 'START_LINE_TRACK') {
        if (isSuccess) {
            showActionBanner(`เดินตามเส้นทางเสร็จสิ้นเรียบร้อยค่ะ`, 'SUCCESS');
            if (typeof setFaceExpression === 'function') setFaceExpression('happy');
            speakAI(`เดินตามเส้นทางเสร็จสิ้นเรียบร้อยแล้วค่ะ`, () => {
                if (typeof startWakeTimer === 'function') startWakeTimer(false);
            });
        } else {
            showActionBanner(`แจ้งเตือน หุ่นยนต์หลุดออกนอกเส้นทางค่ะ`, 'ALERT');
            if (typeof setFaceExpression === 'function') setFaceExpression('confused');
            speakAI(`แจ้งเตือน หุ่นยนต์หลุดออกนอกเส้นทางค่ะ`, () => {
                if (typeof startWakeTimer === 'function') startWakeTimer(false);
            });
        }
        return;
    }

    if (action === 'MOVE_OBJECT') {
        if (isSuccess) {
            showActionBanner(`เคลื่อนย้าย${target}สำเร็จเรียบร้อยค่ะ`, 'SUCCESS');
            if (typeof setFaceExpression === 'function') setFaceExpression('happy');
            speakAI(`เคลื่อนย้าย${target}เรียบร้อยแล้วค่ะ`, () => {
                if (typeof startWakeTimer === 'function') startWakeTimer(false);
            });
        } else {
            showActionBanner(`เคลื่อนย้าย${target}ไม่สำเร็จค่ะ`, 'FAILED');
            if (typeof setFaceExpression === 'function') setFaceExpression('confused');
            speakAI(`เกิดข้อผิดพลาด ไม่สามารถเคลื่อนย้าย${target}ได้ค่ะ`, () => {
                if (typeof startWakeTimer === 'function') startWakeTimer(false);
            });
        }
        return;
    }

    // กรณีอื่นๆ ทั่วไป
    if (isSuccess) {
        showActionBanner(`ปฏิบัติภารกิจ ${action} สำเร็จเรียบร้อยค่ะ`, 'SUCCESS');
        speakAI(`ปฏิบัติภารกิจ ${action} เรียบร้อยแล้วค่ะ`);
    } else {
        showActionBanner(`ภารกิจ ${action} เกิดข้อผิดพลาด`, 'FAILED');
        speakAI(`เกิดข้อผิดพลาดในการปฏิบัติงานค่ะ`);
    }
}

// เริ่มต้นระบบเมื่อโหลดหน้าเสร็จ พร้อมทำงานทันที 100% โดยไม่ต้องแตะหน้าจอ
window.addEventListener('DOMContentLoaded', () => {
    initZeroClickExperience();
    initSpeechRecognition();
    initRobotDashboardSync();
    logInfo("SYSTEM INITIALIZED", "Nexxa AI Robot พร้อมใช้งานทันที 100% (Single Voice: เปรมวดี Neural)", "#10b981");
});
