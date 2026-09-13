/**
 * REXZA AI ROBOT - ESP32 HARDWARE REST CLIENT
 * -------------------------------------------------------------
 * สื่อสารกับบอร์ด ESP32 ผ่าน REST API และตรวจสอบสถานะ (CheckStatus)
 */

async function checkESP32Status() {
    logInfo("CHECK STATUS", "กำลังตรวจสอบความพร้อมของอุปกรณ์ ESP32...", "#38bdf8");
    const base = esp32Url.replace(/\/+$/, '');
    const directUrl = `${base}/command?action=CheckStatus`;
    const serverRelay = `${window.location.origin}/status`;
    let isReady = false;
    let detail = "";

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(directUrl, { signal: controller.signal, mode: 'cors' });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            isReady = true;
            detail = data.robot_status || data.device || "online";
        }
    } catch (e) {
        try {
            const controller2 = new AbortController();
            const timeoutId2 = setTimeout(() => controller2.abort(), 2000);
            const res2 = await fetch(serverRelay, { signal: controller2.signal });
            clearTimeout(timeoutId2);
            if (res2.ok) {
                const data2 = await res2.json().catch(() => ({}));
                isReady = true;
                detail = data2.device || "Server Mock ESP32";
            }
        } catch (err) {
            isReady = false;
        }
    }

    if (isReady) {
        logInfo("ESP32 READY", `อุปกรณ์ ESP32 พร้อมใช้งาน (${detail})`, "#10b981");
        sendToESP32('CheckStatus', 'esp32');
        speakAI("อุปกรณ์ ESP32 พร้อมใช้งานค่ะ สถานะออนไลน์ปกติค่ะ", () => {
            if (typeof startWakeTimer === 'function') {
                startWakeTimer(false);
                logInfo("READY FOR NEXT COMMAND", "เช็คสถานะเรียบร้อยแล้ว ยังคงพร้อมรับคำสั่งถัดไปภายใน 15 วินาที...", "#10b981");
            } else {
                resetToStandby(true);
            }
        });
    } else {
        logInfo("ESP32 NOT READY", "ไม่สามารถเชื่อมต่อกับ ESP32 ได้", "#ef4444");
        speakAI("ไม่สามารถเชื่อมต่อกับอุปกรณ์ ESP32 ได้ค่ะ กรุณาตรวจสอบการเชื่อมต่อค่ะ", () => {
            if (typeof startWakeTimer === 'function') {
                startWakeTimer(false);
            } else {
                resetToStandby(true);
            }
        });
    }
}

function sendToESP32(action, target) {
    const base = esp32Url.replace(/\/+$/, '');
    const targetUrl = `${base}/command`;
    const serverRelay = `${window.location.origin}/command`;
    const payload = { action: action, target: target, fromRobotUI: true };

    logInfo("ESP32 REST (POST)", `กำลังยิงคำสั่ง: [${action}] ${target} -> ${targetUrl}`, "#38bdf8");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify(payload),
        signal: controller.signal
    })
    .then(res => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
        return res.json().catch(() => res.text());
    })
    .then(data => {
        const resStr = typeof data === 'object' ? JSON.stringify(data) : data;
        logInfo("ESP32 OK", `บอร์ดตอบรับสำเร็จ: ${resStr}`, "#10b981");
    })
    .catch(err => {
        clearTimeout(timeoutId);
        if (targetUrl !== serverRelay) {
            logInfo("RELAY", `ส่งผ่านเซิร์ฟเวอร์แทน -> ${serverRelay}`, "#f59e0b");
            fetch(serverRelay, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(r => r.json())
            .then(d => logInfo("RELAY OK", "เซิร์ฟเวอร์รับคำสั่งสำเร็จ", "#10b981"))
            .catch(e => logInfo("ESP32 WARN", `ไม่สามารถเชื่อมต่อได้ (${e.message})`, "#f59e0b"));
        } else {
            logInfo("ESP32 WARN", `ไม่สามารถเชื่อมต่อ ESP32 ได้ (${err.message})`, "#f59e0b");
        }
    });
}
