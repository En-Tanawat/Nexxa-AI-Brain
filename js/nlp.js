/**
 * REXZA SMART LOCAL NLP ENGINE
 * -------------------------------------------------------------
 * ป้องกันปัญหาข้อความทั่วไปหลุดเข้า Action PICK
 * Action PICK จะทำงานก็ต่อเมื่อมีคำกริยาสั่งหยิบที่ชัดเจนร่วมกับสิ่งของเท่านั้น
 */

function parseWithLocalNLP(text) {
    let t = (text || '').trim();
    // ปรับคำเพี้ยนจากการถอดเสียงภาษาไทย
    t = t.replace(/(เนกซ่า|เน็กซา|เนกซา|เด็กซ่า|เร็กซ่า|เล็กซ่า|เอ็กซ่า|เน็กต้า|เน็ตซ่า|เม็กซ่า|เน็กซ์|เน็ค)/gi, 'เน็กซ่า');
    t = t.replace(/(กับฐาน|กลับถ่าน|กับถ่าน|กลับทาง|กับทาง|กับทาน)/gi, 'กลับฐาน');
    t = t.replace(/ไปยิบ/g, 'ไปหยิบ').replace(/ช่วยยิบ/g, 'ช่วยหยิบ');
    t = t.replace(/\b(ยุ|ยุด|หยุ)\b/gi, 'หยุด');
    t = t.replace(/(เช็คสะถานะ|เช็คสถา|ตรวจสะถานะ)/gi, 'เช็คสถานะ');
    const lower = t.toLowerCase();

    // 0. คำสั่ง "ให้หยุดตอบ" (ออกจากโหมดตอบคำถาม กลับสู่การรอรับ Action ปกติ)
    const stopQAKeywords = [
        'ให้หยุดตอบ', 'หยุดตอบคำถาม', 'หยุดตอบ', 'เลิกตอบ', 'เลิกถาม',
        'หยุดถามตอบ', 'พอแล้วหยุดตอบ', 'หยุดพูด', 'ไม่ต้องตอบแล้ว', 'ไม่ต้องตอบ',
        'ไม่มีคำถามแล้ว', 'ไม่ถามแล้ว', 'ไม่เอาแล้ว', 'ออกจากโหมดถามตอบ', 'ปิดโหมดถามตอบ',
        'stop answering', 'stop qa', 'exit qa', 'quit qa', 'cancel qa'
    ];
    const isStopQA = stopQAKeywords.some(w => lower.includes(w)) && !lower.includes('เปิด') && !lower.includes('เริ่ม');
    if (isStopQA) {
        return {
            action: "StopQA",
            target: "",
            english_target: "",
            speech: "รับทราบค่ะ หยุดตอบคำถามแล้วค่ะ"
        };
    }

    // 0.5 ตรวจจับเหตุฉุกเฉินและข้อผิดพลาดความปลอดภัย (ขอบเขตข้อ 7)
    // ตรวจพบสิ่งกีดขวาง, วัตถุหลุดจากแขนกล, หุ่นยนต์ออกนอกเส้น -> หยุดและแจ้งเตือนทันที
    if (lower.includes('สิ่งกีดขวาง') || lower.includes('เจอสิ่งกีดขวาง') || lower.includes('มีสิ่งกีดขวาง') || lower.includes('ชนสิ่งกีดขวาง') || lower.includes('obstacle')) {
        return {
            action: "SAFETY_ALERT",
            target: "obstacle",
            english_target: "obstacle",
            speech: "ตรวจพบสิ่งกีดขวางด้านหน้า! ระบบหยุดการทำงานฉุกเฉินเพื่อความปลอดภัยค่ะ"
        };
    }
    if (lower.includes('หลุดจากแขนกล') || lower.includes('วัตถุหลุด') || lower.includes('ของหลุด') || lower.includes('ตกหล่น') || lower.includes('object dropped')) {
        return {
            action: "SAFETY_ALERT",
            target: "object_dropped",
            english_target: "object_dropped",
            speech: "แจ้งเตือน! วัตถุหลุดจากแขนกล ระบบหยุดการทำงานชั่วคราวค่ะ"
        };
    }
    if (lower.includes('ออกนอกเส้น') || lower.includes('หลุดเส้น') || lower.includes('ตกเส้น') || lower.includes('ไม่ตรงเส้น') || lower.includes('off track')) {
        return {
            action: "SAFETY_ALERT",
            target: "line_off_track",
            english_target: "line_off_track",
            speech: "แจ้งเตือน! หุ่นยนต์ออกนอกเส้นทาง ระบบหยุดการเคลื่อนที่เรียบร้อยแล้วค่ะ"
        };
    }

    // 1. สั่งหยุดการทำงาน / หยุดฉุกเฉิน (ขอบเขตข้อ 3)
    const emergencyStopKeywords = [
        'หยุด', 'stop', 'พอแล้ว', 'ยกเลิก', 'ช่างมัน',
        'เบรก', 'จอด', 'ฉุกเฉิน', 'emergency', 'halt', 'pause'
    ];
    // ตรวจสอบว่าไม่ใช่คำสั่งหยุดเดินตามเส้นเฉพาะเจาะจง
    const isLineStop = (lower.includes('หยุดเดินตามเส้น') || lower.includes('เลิกเดินตามเส้น') || lower.includes('หยุดตามเส้น') || lower.includes('stop line'));
    if (!isLineStop && emergencyStopKeywords.some(w => lower.includes(w))) {
        return {
            action: "STOP",
            target: "",
            english_target: "",
            speech: "หยุดการทำงานเรียบร้อยแล้วค่ะ"
        };
    }

    // 1.2 สั่งเดินตามเส้น / หยุดเดินตามเส้น (Line Tracking - ขอบเขตข้อ 3)
    if (isLineStop || lower.includes('stop line track') || lower.includes('stop line tracking')) {
        return {
            action: "STOP_LINE_TRACK",
            target: "line",
            english_target: "line",
            speech: "รับทราบค่ะ หยุดการเดินตามเส้นทางแล้วค่ะ"
        };
    }
    const startLineKeywords = [
        'เริ่มเดินตามเส้น', 'เดินตามเส้น', 'วิ่งตามเส้น', 'เริ่มตามเส้น',
        'เดินตามรอย', 'ตามเส้นทาง', 'start line track', 'start line tracking', 'follow line'
    ];
    if (startLineKeywords.some(w => lower.includes(w))) {
        return {
            action: "START_LINE_TRACK",
            target: "line",
            english_target: "line",
            speech: "ยืนยันคำสั่งค่ะ กำลังเริ่มเดินตามเส้นทางนะคะ"
        };
    }

    // รายชื่อสถานีปลายทางที่กำหนดไว้ในโครงงาน (Stations - ขอบเขตข้อ 3)
    const STATIONS = [
        { id: 'station_a', th: 'สถานี A', match: ['สถานี a', 'สถานีเอ', 'สถานี a', 'จุด a', 'จุดเอ', 'station a'] },
        { id: 'station_b', th: 'สถานี B', match: ['สถานี b', 'สถานีบี', 'จุด b', 'จุดบี', 'station b'] },
        { id: 'station_c', th: 'สถานี C', match: ['สถานี c', 'สถานีซี', 'จุด c', 'จุดซี', 'station c'] },
        { id: 'station_1', th: 'สถานี 1', match: ['สถานี 1', 'สถานีหนึ่ง', 'จุด 1', 'station 1'] },
        { id: 'station_2', th: 'สถานี 2', match: ['สถานี 2', 'สถานีสอง', 'จุด 2', 'station 2'] },
        { id: 'station_3', th: 'สถานี 3', match: ['สถานี 3', 'สถานีสาม', 'จุด 3', 'station 3'] },
        { id: 'pickup_point', th: 'จุดรับของ', match: ['จุดรับของ', 'จุดรับวัตถุ', 'จุดหยิบของ', 'จุดรับ', 'สถานีรับของ', 'pickup'] },
        { id: 'drop_point', th: 'จุดส่งของ', match: ['จุดส่งของ', 'จุดวางของ', 'จุดวางวัตถุ', 'จุดส่ง', 'สถานีส่งของ', 'drop'] }
    ];

    let matchedStation = null;
    for (const st of STATIONS) {
        if (st.match.some(m => lower.includes(m))) {
            matchedStation = st;
            break;
        }
    }

    // 1.5 คำสั่งสอบถามเพิ่มเติมเมื่อคำสั่งไม่ชัดเจน (Ambiguity Clarification - ขอบเขตข้อ 6)
    function isClarifyMatch(phrases) {
        return phrases.some(w => {
            if (lower === w) return true;
            if (lower.startsWith(w)) {
                const rest = lower.substring(w.length);
                return /^(ครับ|ค่ะ|คะ|นะ|จ๊ะ|จ้า|สิ|เลย|\s|$)/.test(rest);
            }
            return false;
        });
    }

    // - สั่งย้ายของ แต่ไม่ระบุสิ่งของหรือสถานี
    if (isClarifyMatch(['ช่วยย้ายหน่อย', 'ช่วยย้ายของ', 'ย้ายสิ่งของ', 'ช่วยขนของ', 'ย้ายของหน่อย'])) {
        if (!matchedStation) {
            return {
                action: "CLARIFY",
                target: "move_destination",
                english_target: "move_destination",
                speech: "ต้องการให้ย้ายวัตถุอะไร และไปส่งที่สถานีไหนคะ?"
            };
        }
    }
    // - สั่งให้ไปส่ง แต่ไม่ระบุสถานี
    if (isClarifyMatch(['เดินทางไปหน่อย', 'ช่วยไปส่งหน่อย', 'ไปส่งให้หน่อย', 'ช่วยไปส่งที', 'เดินทางไปที'])) {
        if (!matchedStation) {
            return {
                action: "CLARIFY",
                target: "station",
                english_target: "station",
                speech: "ต้องการให้เดินทางไปยังสถานีไหนคะ? เช่น สถานี A หรือสถานี B ค่ะ"
            };
        }
    }
    // - สั่งให้วาง แต่ไม่ระบุตำแหน่ง
    if (isClarifyMatch(['ช่วยวางหน่อย', 'วางของให้หน่อย', 'วางลงหน่อย', 'ช่วยวางที'])) {
        return {
            action: "CLARIFY",
            target: "place_position",
            english_target: "place_position",
            speech: "ต้องการให้วางวัตถุลงที่ตำแหน่งไหนคะ?"
        };
    }
    // - สั่งหยิบของ แต่ไม่ระบุวัตถุ
    if (isClarifyMatch(['ช่วยหยิบหน่อย', 'ช่วยหยิบให้หน่อย', 'ช่วยหยิบที', 'ไปหยิบของ', 'หยิบของให้หน่อย'])) {
        return {
            action: "CLARIFY",
            target: "pick_object",
            english_target: "pick_object",
            speech: "ต้องการให้ช่วยหยิบวัตถุอะไรคะ? เช่น ขวดน้ำ หรือกล่องพัสดุค่ะ"
        };
    }

    // 1.6 คำสั่งเคลื่อนย้ายวัตถุไปยังสถานี (Move Object - ขอบเขตข้อ 2, 3 & สรุปการทำงาน)
    const moveVerbs = ['ย้าย', 'เคลื่อนย้าย', 'นำไปส่ง', 'นำไปไว้', 'ขนย้าย', 'transfer', 'move'];
    const textWithoutStation = matchedStation ? lower.replace(matchedStation.th, '') : lower;
    const hasMoveVerb = moveVerbs.some(v => lower.includes(v)) ||
        (lower.includes('นำ') && (lower.includes('ไปส่ง') || lower.includes('ไปไว้') || lower.includes('ไปวาง'))) ||
        (textWithoutStation.includes('ส่ง') && !textWithoutStation.includes('ไปส่ง') && !textWithoutStation.includes('เดินทาง'));
    if (hasMoveVerb && matchedStation) {
        // ค้นหาชื่อสิ่งของที่ต้องการย้าย
        let moveItem = 'วัตถุ';
        const sampleItems = ['ขวดน้ำ', 'กล่องพัสดุ', 'กล่อง', 'แก้วกาแฟ', 'แก้วน้ำ', 'ปากกา', 'หนังสือ', 'เอกสาร', 'พัสดุ'];
        for (const it of sampleItems) {
            if (lower.includes(it)) {
                moveItem = it;
                break;
            }
        }
        return {
            action: "MOVE_OBJECT",
            target: moveItem,
            destination: matchedStation.id,
            english_target: moveItem,
            station_name: matchedStation.th,
            speech: `ยืนยันคำสั่งค่ะ กำลังเคลื่อนย้าย${moveItem}ไปยัง${matchedStation.th}ค่ะ`
        };
    }

    // 1.7 คำสั่งสั่งแขนกลวางวัตถุ (PLACE - ขอบเขตข้อ 2, 3)
    const placeVerbs = ['ช่วยวาง', 'ไปวาง', 'วางวัตถุ', 'วางของ', 'วางลง', 'ปล่อยของ', 'วาง', 'place', 'drop'];
    const hasPlaceVerb = placeVerbs.some(v => lower.includes(v));
    if (hasPlaceVerb) {
        let placeItem = 'วัตถุ';
        const sampleItems = ['ขวดน้ำ', 'กล่องพัสดุ', 'กล่อง', 'แก้วน้ำ', 'ปากกา', 'ของ'];
        for (const it of sampleItems) {
            if (lower.includes(it)) {
                placeItem = it;
                break;
            }
        }
        return {
            action: "PLACE",
            target: placeItem,
            english_target: placeItem,
            speech: `กำลังใช้แขนกลวาง${placeItem}ลงตำแหน่งค่ะ`
        };
    }

    // 1.8 คำสั่งเดินทางไปยังสถานีที่กำหนด (NAVIGATE_TO - ขอบเขตข้อ 3)
    const navVerbs = ['เดินทางไป', 'ไปยัง', 'ไปที่', 'ไปส่งที่', 'มุ่งหน้าไป', 'เคลื่อนที่ไป', 'navigate to', 'go to', 'ไป'];
    const hasNavVerb = navVerbs.some(v => lower.includes(v));
    if (hasNavVerb && matchedStation) {
        return {
            action: "NAVIGATE_TO",
            target: matchedStation.id,
            english_target: matchedStation.id,
            station_name: matchedStation.th,
            speech: `ยืนยันคำสั่งค่ะ กำลังเดินทางไปยัง${matchedStation.th}ค่ะ`
        };
    }

    // 2. สั่งกลับฐาน (ไม่รวมคำสั่งหยิบสายชาร์จ หรือ ที่ชาร์จ)
    const homeKeywords = [
        'กลับฐาน', 'กลับจุดเริ่มต้น', 'home', 'กลับบ้าน',
        'ไปชาร์จ', 'ชาร์จแบต', 'ชาร์จไฟ', 'กลับแท่นชาร์จ', 'เข้าที่ชาร์จ',
        'กลับ dock', 'go home', 'return home', 'dock'
    ];
    const isChargingCommand = (lower.includes('ไปชาร์จ') || lower.includes('ชาร์จแบต') || lower.includes('ชาร์จไฟ') ||
        (lower.includes('ชาร์จ') && !lower.includes('สายชาร์จ') && !lower.includes('ที่ชาร์จ')));
    if (homeKeywords.some(w => lower.includes(w)) || isChargingCommand) {
        return {
            action: "HOME",
            target: "base",
            english_target: "base",
            speech: "กำลังกลับไปที่ฐานค่ะ"
        };
    }

    // 3. ตรวจสอบสถานะความพร้อมอุปกรณ์ ESP32 (CheckStatus)
    const statusKeywords = [
        'เช็คสถานะ', 'ตรวจสถานะ', 'ตรวจสอบสถานะ', 'สถานะอุปกรณ์', 'สถานะหุ่นยนต์',
        'สถานะบอร์ด', 'เช็คบอร์ด', 'ตรวจบอร์ด', 'เช็ค esp', 'ตรวจ esp',
        'esp32 พร้อมไหม', 'บอร์ดพร้อมไหม', 'หุ่นยนต์พร้อมไหม', 'พร้อมใช้งานไหม',
        'เช็คความพร้อม', 'ตรวจสอบความพร้อม', 'เช็คระบบ', 'ตรวจระบบ', 'สถานะเป็นไง',
        'check status', 'status', 'robot status', 'system status'
    ];
    if (statusKeywords.some(w => lower.includes(w))) {
        return {
            action: "CheckStatus",
            target: "esp32",
            english_target: "esp32",
            speech: "กำลังตรวจสอบสถานะอุปกรณ์ ESP32 ค่ะ"
        };
    }

    // 4.5 เข้าสู่โหมดตอบคำถาม (AnswerQuestion)
    const qaKeywords = [
        'ตอบคำถาม', 'ถามคำถาม', 'เข้าสู่โหมดถามตอบ', 'เข้าสู่โหมดตอบคำถาม',
        'โหมดถามตอบ', 'โหมดตอบคำถาม', 'ช่วยตอบคำถาม', 'อยากถามคำถาม',
        'มีคำถาม', 'เริ่มถามคำถาม', 'เปิดโหมดถามตอบ', 'เปิดโหมดตอบคำถาม',
        'เริ่มตอบคำถาม', 'answer question', 'qa mode', 'start qa'
    ];
    if (qaKeywords.some(w => lower.includes(w))) {
        return {
            action: "AnswerQuestion",
            target: "",
            english_target: "",
            speech: "เข้าสู่โหมดตอบคำถามแล้วค่ะ ถามคำถามได้เลยค่ะ"
        };
    }

    // 4.8 ถามชื่อ / ตัวตนของ AI (Nexxa)
    const nameKeywords = ['ชื่ออะไร', 'เธอชื่ออะไร', 'คุณชื่ออะไร', 'แกชื่ออะไร', 'ใครคือคุณ', 'what is your name', 'who are you'];
    if (nameKeywords.some(w => lower.includes(w))) {
        return {
            action: "NONE",
            target: "",
            english_target: "",
            speech: "เน็กซ่าค่ะ (Nexxa) หนูคือ AI ผู้ช่วยหุ่นยนต์ พร้อมรับคำสั่งค่ะ"
        };
    }

    // 5. คำทักทายทั่วไป / ชวนคุย -> ตอบ Action "NONE" เสมอ
    const generalGreetings = [
        'ช่วยหน่อย', 'ช่วยที', 'ตื่นได้แล้ว', 'สวัสดี', 'เฮลโล', 'hello',
        'nexxa', 'เน็กซ่า', 'เนกซ่า', 'สบายดีไหม', 'เป็นไงบ้าง', 'ทำอะไรได้บ้าง',
        'ใครสร้างคุณ', 'กินข้าวหรือยัง', 'อากาศเป็นไง', 'ทำอะไรอยู่',
        'คุยกันหน่อย', 'ช่วยด้วย', 'เทส', '123'
    ];
    if (generalGreetings.some(w => lower.includes(w))) {
        return {
            action: "NONE",
            target: "",
            english_target: "",
            speech: "สวัสดีค่ะ พร้อมช่วยแล้วค่ะ มีอะไรให้ช่วยไหมคะ"
        };
    }

    // 6. ตรวจสอบ Action PICK (สั่งหยิบของ)
    // ตรวจจับคำปฏิเสธก่อน เพื่อป้องกันการหยิบผิดเมื่อผู้ใช้พูดว่า "อย่าเพิ่งหยิบ", "ห้ามหยิบ", ฯลฯ
    const negativeKeywords = [
        'ไม่เอา', 'ไม่ต้องหยิบ', 'อย่าหยิบ', 'ไม่หยิบ', 'ไม่ต้องการ',
        'อย่าเพิ่งหยิบ', 'ยังไม่ต้องหยิบ', 'ห้ามหยิบ', 'ไม่ต้องไปหยิบ',
        'ไม่ต้องช่วยหยิบ', 'ยกเลิกคำสั่งหยิบ', 'ไม่ให้หยิบ', 'ไม่ต้องเอา',
        'อย่าเอา', 'ยังไม่เอา', 'ห้ามเอา', 'ไม่ต้องไปเอา', 'อย่าเพิ่งเอา'
    ];
    if (negativeKeywords.some(w => lower.includes(w))) {
        return {
            action: "NONE",
            target: "",
            english_target: "",
            speech: "รับทราบค่ะ ยกเลิกคำสั่งเรียบร้อยค่ะ"
        };
    }

    // กริยาวลีที่ชัดเจนสำหรับการหยิบหรือนำสิ่งของ
    const explicitPickVerbs = [
        'ช่วยไปหยิบ', 'ช่วยไปเอา', 'ช่วยหยิบ', 'ไปหยิบ', 'หยิบ',
        'ช่วยเอา', 'ไปเอา', 'เอามาให้', 'ช่วยยก', 'ไปยก', 'ยกมาให้',
        'ช่วยนำ', 'ไปนำ', 'นำมาให้', 'ช่วยส่ง', 'ส่งของ'
    ];
    const hasExplicitPickVerb = explicitPickVerbs.some(verb => lower.includes(verb));

    // พจนานุกรมสิ่งของ (จัดเรียงคำที่มีความยาวมาก่อน เพื่อให้จับคำเจาะจงได้ถูกต้องเสมอ เช่น กระดาษทิชชู่ ก่อน กระดาษ)
    const rawDictionary = [
        { th: 'กระดาษทิชชู่', en: 'tissue' },
        { th: 'กล่องพัสดุ', en: 'package' },
        { th: 'แก้วกาแฟ', en: 'coffee_cup' },
        { th: 'สายชาร์จ', en: 'charger' },
        { th: 'ที่ชาร์จ', en: 'charger' },
        { th: 'น้ำเปล่า', en: 'water' },
        { th: 'ขวดน้ำ', en: 'bottle' },
        { th: 'แก้วน้ำ', en: 'glass' },
        { th: 'ขนมปัง', en: 'bread' },
        { th: 'โทรศัพท์', en: 'phone' },
        { th: 'ไฟฉาย', en: 'flashlight' },
        { th: 'แว่นตา', en: 'glasses' },
        { th: 'เอกสาร', en: 'document' },
        { th: 'กระดาษ', en: 'paper' },
        { th: 'กระเป๋า', en: 'bag' },
        { th: 'กรรไกร', en: 'scissors' },
        { th: 'รีโมท', en: 'remote' },
        { th: 'รีโมต', en: 'remote' },
        { th: 'ทิชชู่', en: 'tissue' },
        { th: 'หน้ากาก', en: 'mask' },
        { th: 'หนังสือ', en: 'book' },
        { th: 'กุญแจ', en: 'key' },
        { th: 'มือถือ', en: 'mobile' },
        { th: 'ดินสอ', en: 'pencil' },
        { th: 'ปากกา', en: 'pen' },
        { th: 'แฟ้ม', en: 'folder' },
        { th: 'กล่อง', en: 'box' },
        { th: 'สมุด', en: 'notebook' },
        { th: 'ขนม', en: 'snack' },
        { th: 'ช้อน', en: 'spoon' },
        { th: 'ส้อม', en: 'fork' },
        { th: 'จาน', en: 'plate' },
        { th: 'ขวด', en: 'bottle' },
        { th: 'แมส', en: 'mask' },
        { th: 'ร่ม', en: 'umbrella' },
        { th: 'น้ำ', en: 'water' },
        { th: 'ยา', en: 'medicine' }
    ];
    // Sort descending by length of Thai text
    const dictionary = rawDictionary.sort((a, b) => b.th.length - a.th.length);

    let matchedItem = null;
    for (const item of dictionary) {
        if (lower.includes(item.th)) {
            matchedItem = item;
            break;
        }
    }

    // เข้า Action PICK ก็ต่อเมื่อ:
    // 1) มีคำกริยาสั่งหยิบที่ชัดเจนร่วมกับสิ่งของในพจนานุกรม
    if (hasExplicitPickVerb && matchedItem) {
        return {
            action: "PICK",
            target: matchedItem.th,
            english_target: matchedItem.en,
            speech: `กำลังไปหยิบ${matchedItem.th}ให้ค่ะ`
        };
    }

    // 2) หรือมีโครงสร้างคำสั่งหยิบตามด้วยชื่อสิ่งของชัดเจน (Fallback สำหรับสิ่งของนอกพจนานุกรม)
    if (hasExplicitPickVerb) {
        let rest = t.replace(/^(?:ช่วยไปหยิบ|ช่วยไปเอา|ช่วยหยิบ|ไปหยิบ|หยิบ|ช่วยเอา|ไปเอา|ช่วยยก|ไปยก|ช่วยนำ|ไปนำ|นำ)\s*/, '').trim();
        // ตัดคำลงท้ายสุภาพและคำเชื่อมช่วยท้ายประโยคออก
        rest = rest.replace(/(หน่อยครับ|หน่อยค่ะ|หน่อยคะ|มาให้หน่อย|ไปให้หน่อย|ให้หน่อย|มาให้|ไปให้|ให้ที|มาที|หน่อย|ให้|มา|ที|ครับ|ค่ะ|คะ|จ๊ะ|นะ|ด้วย)+$/g, '').trim();
        const invalidTargets = ['หน่อย', 'ให้', 'มา', 'ที', 'หน่อยครับ', 'หน่อยค่ะ', 'กัน', 'ขึ้น', 'ครับ', 'ค่ะ', 'คะ', 'นะ', 'ด้วย'];
        if (rest.length >= 2 && !invalidTargets.includes(rest)) {
            return {
                action: "PICK",
                target: rest,
                english_target: rest,
                speech: `กำลังไปหยิบ${rest}ให้ค่ะ`
            };
        }
    }

    // 7. ข้อความอื่นๆ ที่ไม่ใช่คำสั่งควบคุมหุ่นยนต์ -> ตอบ Action "NONE" (ขอบเขตข้อ 8)
    return {
        action: "NONE",
        target: "",
        english_target: "",
        speech: "เน็กซ่าเป็น AI ควบคุมหุ่นยนต์ สามารถสั่งเริ่มเดินตามเส้น เคลื่อนย้ายวัตถุ ควบคุมแขนกลหยิบหรือวาง และตรวจสถานะได้ค่ะ"
    };
}
