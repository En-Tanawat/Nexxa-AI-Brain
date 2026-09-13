/**
 * REXZA AI ROBOT - SPEECH RECOGNITION & STRICT WAKE GATING
 * -------------------------------------------------------------
 * รับฟังเสียงตลอดเวลา ควบคุมการปลุก (Strict Wake Gating) และหน้าต่าง 15 วินาที
 */

let recognition = null;
let isRecognizing = false;

function startWakeTimer(withChime = true) {
    clearWakeTimer();
    isAwake = true;
    updateWakeVisual(true, isQAMode);
    if (withChime) playWakeChime('activate');
    logInfo("NEXXA LISTENING", "Nexxa พร้อมรับฟัง! กำลังรอรับคำสั่งภายใน 15 วินาที...", "#10b981");
    wakeTimeoutTimer = setTimeout(() => {
        if (isAwake && !isQAMode) {
            isAwake = false;
            updateWakeVisual(false);
            playWakeChime('dismiss');
            logInfo("NEXXA TIMEOUT", "ไม่ได้ยินคำสั่งภายใน 15 วินาที -> กลับสู่สถานะ Standby ปกติ เท่านั้น", "#94a3b8");
        }
    }, WAKE_TIMEOUT_MS);
}

function clearWakeTimer() {
    if (wakeTimeoutTimer) {
        clearTimeout(wakeTimeoutTimer);
        wakeTimeoutTimer = null;
    }
}

function resetToStandby(silent = false) {
    clearWakeTimer();
    isAwake = false;
    isQAMode = false;
    updateWakeVisual(false);
    if (!silent) playWakeChime('dismiss');
    logInfo("STANDBY", "สิ้นสุดการทำงาน -> กลับสู่โหมดสแตนด์บายปกติ รอการปลุกเพื่อเริ่ม Action ถัดไป", "#94a3b8");
}

function normalizeSpeechPhonetics(text) {
    if (!text) return '';
    let t = text;
    // 1. แก้ไขคำเพี้ยนของชื่อหุ่นยนต์ Nexxa และคำทักทาย
    t = t.replace(/(เนกซ่า|เน็กซา|เนกซา|เด็กซ่า|เร็กซ่า|เล็กซ่า|เอ็กซ่า|เน็กต้า|เน็ตซ่า|เม็กซ่า|เน็กซ์|เน็ค|nex\b|nexa\b|nexsa\b|rexza\b)/gi, 'เน็กซ่า');
    t = t.replace(/(ฮาโหล|เฮลโล|เฮ้|ฮัลโล)\s*เน็กซ่า/gi, 'hello nexxa');

    // 2. แก้ไขคำเพี้ยนของคำสั่งกลับฐาน
    t = t.replace(/(กับฐาน|กลับถ่าน|กับถ่าน|กลับทาง|กับทาง|กับทาน|กลับบ้าน)/gi, 'กลับฐาน');

    // 3. แก้ไขคำเพี้ยนของคำสั่งหยิบของ
    t = t.replace(/ไปยิบ/g, 'ไปหยิบ').replace(/ช่วยยิบ/g, 'ช่วยหยิบ');

    // 4. แก้ไขคำเพี้ยนของคำสั่งหยุด
    t = t.replace(/\b(ยุ|ยุด|หยุ)\b/gi, 'หยุด');

    // 5. แก้ไขคำเพี้ยนของคำสั่งเช็คสถานะ
    t = t.replace(/(เช็คสะถานะ|ตรวจสะถานะ|เช็คสถา(?!นะ))/gi, 'เช็คสถานะ');

    return t;
}

function handleVoicePipeline(rawText) {
    const normalizedText = normalizeSpeechPhonetics(rawText);
    const trimmed = normalizedText.trim();
    if (!trimmed || trimmed.length < 2) return;

    const lower = trimmed.toLowerCase();

    // ป้องกันเสียงสะท้อนจากลำโพงตัดเสียงตัวเอง (Echo Cancellation & Strict Barge-In)
    if (typeof isSpeakingNow !== 'undefined' && isSpeakingNow) {
        const stopKeywords = ['หยุด', 'stop', 'พอแล้ว', 'ยกเลิก', 'nexxa', 'เน็กซ่า', 'เนกซ่า'];
        const isExplicitInterrupt = stopKeywords.some(kw => lower.includes(kw));

        if (!isExplicitInterrupt) {
            // หากไม่ใช่คำสั่งสั่งหยุดหรือคำปลุกชัดเจน ให้มองข้ามเสียงแทรก/เสียงสะท้อนเพื่อไม่ให้ตัดเสียงพูดของหุ่นยนต์
            return;
        }

        // ผู้ใช้สั่งหยุดหรือปลุกแทรกจริง -> หยุดเสียงทันที (Barge-In)
        if (typeof stopAudioPlayback === 'function') {
            stopAudioPlayback();
        } else if (typeof window !== 'undefined' && typeof window.stopAudioPlayback === 'function') {
            window.stopAudioPlayback();
        }
    }

    // 0. โหมดตอบคำถามต่อเนื่อง (AnswerQuestion Mode)
    if (isQAMode) {
        logInfo("QA LISTENING", `ได้ยินในโหมดตอบคำถาม: "${trimmed}"`, "#a855f7");

        // ตรวจจับคำสั่งออกจากโหมดตอบคำถาม (ครอบคลุมทั้งคำว่า หยุด, พอแล้ว, ไม่ต้องตอบแล้ว, พอ, เลิกตอบ, cancel, exit, stop qa ฯลฯ)
        const stopQAKeywords = [
            'หยุด', 'stop', 'พอแล้ว', 'พอ', 'พอแค่นี้',
            'ให้หยุดตอบ', 'หยุดตอบคำถาม', 'หยุดตอบ', 'เลิกตอบ', 'เลิกถาม',
            'หยุดถามตอบ', 'พอแล้วหยุดตอบ', 'หยุดพูด', 'ไม่ต้องตอบ', 'ไม่ต้องตอบแล้ว',
            'ไม่มีคำถามแล้ว', 'ไม่ถามแล้ว', 'ไม่เอาแล้ว', 'จบ', 'ออก', 'ออกจากโหมด',
            'ยกเลิก', 'ไม่เป็นไร', 'cancel', 'exit', 'quit', 'bye', 'บาย',
            'stop answering', 'stop qa'
        ];
        const isStopQA = stopQAKeywords.some(kw => lower.includes(kw));

        if (isStopQA) {
            logInfo("STOP QA", `ผู้ใช้สั่งออกจากโหมดถามตอบ ("${trimmed}") -> กลับสู่โหมดรอรับคำสั่งปกติ`, "#10b981");
            isQAMode = false;
            speakAI("รับทราบค่ะ หยุดตอบคำถามแล้วค่ะ", () => {
                resetToStandby();
            });
            return;
        }

        processQAQuestion(trimmed);
        return;
    }

    // 1. ตรวจสอบคำปลุก (Strict Wake Keywords)
    // เงื่อนไข: ถ้าจะเริ่ม action ใดๆ จะต้องมีการเรียกหรือปลุกก่อน จะข้ามขั้นตอนไม่ได้!
    let foundWake = UNIQUE_WAKE_KEYWORDS.find(w => lower.includes(w));

    if (!foundWake) {
        // รูปแบบเสียงพูดภาษาไทยที่ใกล้เคียงคำว่า Nexxa หรือคำทักทายมาตรฐาน
        const phoneticWakePatterns = [
            /\b(nex|nexx|nexa|nexxa|rexza|rexa|lexa)\b/i,
            /(เน็ก|เนก|เน็กซ|เนกซ|เน็ค|เร็ก|เล็ก|เอ็ก)[ซ์์]?[ซสศษ]?[า่าะ]?/,
            /(ฮัล|ฮา|เฮล)โหล/,
            /สวัสดี/,
            /ตื่น/
        ];
        for (const p of phoneticWakePatterns) {
            const m = lower.match(p);
            if (m) {
                foundWake = m[0];
                break;
            }
        }
    }

    if (foundWake) {
        logInfo("WAKE WORD", `ตรวจพบคำปลุก: "${foundWake}"`, "#10b981");

        // ตัดคำปลุกออกเพื่อดูว่ามีคำสั่งพ่วงมาในประโยคเดียวกันหรือไม่ (Single-Sentence Command)
        let remaining = lower;
        for (const w of UNIQUE_WAKE_KEYWORDS) {
            remaining = remaining.replace(new RegExp(w, 'gi'), '');
        }
        if (foundWake) {
            remaining = remaining.replace(new RegExp(foundWake, 'gi'), '');
        }
        remaining = remaining.replace(/[.,!?:;\s]+/g, ' ').trim();

        // ตรวจสอบว่าเป็นคำปลุกเดี่ยว หรือคำปลุกที่มีคำลงท้ายสุภาพ (เช่น "เน็กซ่าครับ", "nexxa please", "เน็กซ่าค่ะ")
        const isPoliteOnly = /^(ครับ|ค่ะ|คะ|จ๋า|ฮะ|จ๊ะ|นะ|หน่อยครับ|หน่อยค่ะ|หน่อย|please|\s)+$/i.test(remaining);
        const isWakeOnly = remaining.length < 2 || isPoliteOnly;

        // 1.1 พูดแค่คำปลุกอย่างเดียว เช่น "hello nexxa", "nexxa", "เน็กซ่า", "เน็กซ่าครับ"
        if (isWakeOnly) {
            isAwake = true;
            updateWakeVisual(true, isQAMode);
            playWakeChime('activate');
            clearWakeTimer();
            startWakeTimer(false);
            const greeting = nexxaGreetings[Math.floor(Math.random() * nexxaGreetings.length)];
            logInfo("NEXXA PROMPT", `Nexxa ตอบรับ: "${greeting}" (เปิดเวลารอรับคำสั่ง 15 วินาที)`, "#10b981");
            speakAI(greeting, () => {
                startWakeTimer(false);
            });
            return;
        } else {
            // 1.2 พูดคำปลุกพร้อมคำสั่งในประโยคเดียว เช่น "hello nexxa ไปหยิบขวดน้ำ", "nexxa ครับ เช็คสถานะ"
            let cleanCommand = remaining.replace(/^(ครับ|ค่ะ|คะ|จ๋า|ฮะ|จ๊ะ|นะ|หน่อย|please)\s*/i, '').trim();
            if (!cleanCommand) cleanCommand = remaining;
            isAwake = true;
            updateWakeVisual(true);
            playWakeChime('activate');
            clearWakeTimer();
            logInfo("DIRECT COMMAND", `คำสั่งตรง: "${cleanCommand}"`, "#00f0ff");
            processCommandWithAI(cleanCommand);
            return;
        }
    }

    // 2. ถ้าไม่มีคำปลุก ตรวจสอบสถานะการตื่น (STRICT WAKE GATING)
    if (!isAwake) {
        logInfo("SLEEPING / LOCKED", `ข้ามขั้นตอนไม่ได้! ต้องปลุกด้วย "nexxa" ก่อนเริ่ม Action ใดๆ (ได้ยิน: "${trimmed}")`, "#94a3b8");
        return; // ห้ามทำงาน Action ใดๆ โดยเด็ดขาดจนกว่าจะถูกปลุก
    }

    // 3. อยู่ในหน้าต่างเวลา 15 วินาที
    clearWakeTimer();

    // คำสั่งยกเลิก (Cancel / Dismiss)
    if (lower.includes('ยกเลิก') || lower.includes('ไม่เป็นไร') || lower.includes('พอแล้ว') || lower.includes('ช่างมัน') || lower.includes('cancel')) {
        logInfo("CANCEL", "ผู้ใช้สั่งยกเลิกคำสั่ง", "#ef4444");
        speakAI("ยกเลิกแล้วค่ะ", () => {
            resetToStandby();
        });
        return;
    }

    // ประมวลผลคำสั่งขณะตื่น
    logInfo("PROCESSING", `ประมวลผลคำสั่ง: "${trimmed}"`, "#00f0ff");
    processCommandWithAI(trimmed);
}

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        logInfo("SPEECH WARN", "เบราว์เซอร์นี้ไม่รองรับ Web Speech API", "#ef4444");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        isRecognizing = true;
        logInfo("LISTENING", "Continuous Speech Recognition: พร้อมฟังคำปลุกตลอดเวลา", "#10b981");
    };

    recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result && (result.isFinal || result.isFinal === undefined)) {
                const transcript = result[0].transcript;
                logInfo("HEARD", `"${transcript}"`, "#38bdf8");
                if (typeof sendTelemetry === 'function') {
                    sendTelemetry({
                        type: 'USER_INPUT',
                        direction: 'INCOMING',
                        badge: 'USER INPUT (เสียงพูด)',
                        message: transcript.trim(),
                        transcript: transcript.trim()
                    });
                }
                handleVoicePipeline(transcript);
            }
        }
    };

    recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
            logInfo("MIC ERROR", event.error, "#f59e0b");
            if (event.error === 'not-allowed') {
                const tapPrompt = document.getElementById('tapPrompt');
                if (tapPrompt) {
                    tapPrompt.innerText = 'กรุณากดอนุญาตการใช้ไมโครโฟนบนเบราว์เซอร์';
                    tapPrompt.style.opacity = '1';
                    tapPrompt.style.color = '#ef4444';
                }
            }
        }
    };

    recognition.onend = () => {
        isRecognizing = false;
        if (!isSpeakingNow) {
            try { recognition.start(); } catch (e) {}
        }
    };

    window.pauseRecognition = () => {
        if (recognition && isRecognizing) {
            try { recognition.stop(); } catch (e) {}
        }
    };

    window.resumeRecognition = () => {
        if (recognition && !isRecognizing && !isSpeakingNow) {
            try { recognition.start(); } catch (e) {}
        }
    };

    try { recognition.start(); } catch (e) {}
}
