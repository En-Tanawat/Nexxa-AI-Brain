/**
 * REXZA AI ROBOT - GOOGLE GEMINI 3.5 FLASH CONNECTOR
 * -------------------------------------------------------------
 * เชื่อมต่อ Google AI Studio ประมวลผลและตัดสินใจคำสั่งอัจฉริยะ
 */

async function callGeminiAPI(userInput) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey.trim()}`;
    const systemPrompt = `
        คุณคือ "Nexxa" (เน็กซ่า) AI ผู้ช่วยควบคุมหุ่นยนต์อัจฉริยะ (Smart Mobile Robot & Robotic Arm)
        หน้าที่และขอบเขตตามโครงงาน:
        1. ควบคุมหุ่นยนต์เดินตามเส้น, เดินทางไปสถานี, และควบคุมแขนกลหยิบ/วาง/ย้ายวัตถุ
        2. พูดจาสุภาพด้วยน้ำเสียงผู้หญิง (ลงท้าย "ค่ะ/นะคะ") สั้น กระชับ ตรงประเด็น สไตล์ Siri ตอบ 1 ประโยค
        3. ยืนยันคำสั่งก่อนเริ่มปฏิบัติงาน โดยเฉพาะคำสั่งเคลื่อนย้ายหรือเดินตามเส้นทาง
        4. หากคำสั่งไม่ชัดเจน ให้สอบถามข้อมูลเพิ่มเติมจากผู้ใช้ก่อน (action: "CLARIFY")

        การตัดสินใจสั่งการฮาร์ดแวร์ (action):
        - "START_LINE_TRACK" : สั่งเริ่มเดินตามเส้น เช่น "เริ่มเดินตามเส้น", "เดินตามเส้น" (target: "line")
        - "STOP_LINE_TRACK"  : สั่งหยุดเดินตามเส้น เช่น "หยุดเดินตามเส้น", "เลิกเดินตามเส้น" (target: "line")
        - "NAVIGATE_TO"      : สั่งเดินทางไปยังสถานี เช่น "ไปสถานี A", "เดินทางไปจุดส่งของ" (target: "station_a" หรือ "drop_point")
        - "PICK"             : สั่งแขนกลหยิบสิ่งของชัดเจน เช่น "ช่วยหยิบขวดน้ำ" (target: สิ่งของ)
        - "PLACE"            : สั่งแขนกลวางสิ่งของ เช่น "วางขวดน้ำลง", "วางของ" (target: สิ่งของ)
        - "MOVE_OBJECT"      : สั่งเคลื่อนย้ายวัตถุไปสถานี เช่น "ย้ายขวดน้ำไปสถานี B" (target: สิ่งของ, destination: สถานี)
        - "CheckStatus"      : สั่งตรวจสอบสถานะความพร้อมอุปกรณ์และบอร์ด ESP32
        - "STOP"             : สั่งหยุดฉุกเฉินทุกระบบ
        - "CLARIFY"          : เมื่อคำสั่งไม่ชัดเจน (เช่น สั่งให้หยิบแต่ไม่ระบุของ, สั่งย้ายแต่ไม่ระบุสถานี)
        - "SAFETY_ALERT"     : เมื่อผู้ใช้แจ้งหรือตรวจพบสิ่งกีดขวาง, วัตถุหลุดจากแขนกล, ออกนอกเส้น
        - "AnswerQuestion"   : เมื่อขอเข้าสู่โหมดถามตอบ
        - "NONE"             : คำทักทาย หรือคำถามนอกขอบเขตการควบคุมหุ่นยนต์

        รูปแบบ JSON เท่านั้น:
        {"action":"START_LINE_TRACK","target":"line","english_target":"line","speech":"ยืนยันคำสั่งค่ะ กำลังเริ่มเดินตามเส้นทางนะคะ"}
        {"action":"NAVIGATE_TO","target":"station_a","english_target":"station_a","speech":"ยืนยันคำสั่งค่ะ กำลังเดินทางไปยังสถานี A ค่ะ"}
        {"action":"PICK","target":"ขวดน้ำ","english_target":"bottle","speech":"กำลังไปหยิบขวดน้ำให้ค่ะ"}
        {"action":"PLACE","target":"ขวดน้ำ","english_target":"bottle","speech":"กำลังใช้แขนกลวางขวดน้ำลงตำแหน่งค่ะ"}
        {"action":"MOVE_OBJECT","target":"ขวดน้ำ","destination":"station_b","english_target":"bottle","speech":"ยืนยันคำสั่งค่ะ กำลังเคลื่อนย้ายขวดน้ำไปยังสถานี B ค่ะ"}
        {"action":"CLARIFY","target":"object","english_target":"object","speech":"ต้องการให้ช่วยหยิบวัตถุอะไรคะ? เช่น ขวดน้ำ หรือกล่องพัสดุค่ะ"}
        {"action":"CheckStatus","target":"esp32","english_target":"esp32","speech":"กำลังตรวจสอบสถานะอุปกรณ์ ESP32 ค่ะ"}
        {"action":"STOP","target":"","english_target":"","speech":"หยุดการทำงานเรียบร้อยแล้วค่ะ"}
        `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nคำพูดของผู้ใช้: "${userInput}"` }] }],
            generationConfig: { response_mime_type: "application/json" }
        })
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleaned = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
}

async function callGeminiQA(questionText) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey.trim()}`;
    const qaPrompt = `
        คุณคือ "Nexxa" (เน็กซ่า) AI ผู้ช่วยหุ่นยนต์อัจฉริยะ กำลังสนทนาและตอบคำถามต่อเนื่องในโหมด "AnswerQuestion"
        ข้อกำหนด:
        1. คุณชื่อ "Nexxa" (เน็กซ่า) 
        2. ตอบคำถามของผู้ใช้อย่างกระชับ ชัดเจน ตรงประเด็น สุภาพด้วยคำลงท้าย "ค่ะ/นะคะ" ไม่เกิน 1-2 ประโยค
        3. ให้ข้อมูลที่ถูกต้อง ไม่เยิ่นเย้อ
        4. ตอบเป็น JSON รูปแบบ {"speech": "คำตอบภาษาไทยสั้นกระชับ"}

        คำถามของผู้ใช้: "${questionText}"
        `;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: qaPrompt }] }],
            generationConfig: { response_mime_type: "application/json" }
        })
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleaned = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed.speech || "รับทราบค่ะ สามารถถามคำถามต่อไปได้เลยนะคะ หรือบอกว่า ให้หยุดตอบ ค่ะ";
}
