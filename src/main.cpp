/*
 * REXZA - ESP32 REST API Receiver for Robot Pick & Place
 * --------------------------------------------------------
 * โปรเจค PlatformIO สำหรับ VSCode
 * รับคำสั่ง REST API จากเว็บแอป ส่งควบคุมหุ่นยนต์
 * รองรับ CORS Header เพื่อให้ Web Browser ยิงคำสั่งเข้ามาได้
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// =============================================================
// ตั้งค่า WiFi - เปลี่ยนเป็นค่าจริงของคุณ
// =============================================================
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// IP ของคอมพิวเตอร์ที่รันระบบสมอง AI Nexxa (เปลี่ยนตาม IP เครื่อง เช่น 192.168.1.100)
const char* brain_server_ip = "192.168.1.100";
const int   brain_server_port = 8000;

// =============================================================
// สร้าง Web Server บน Port 80
// =============================================================
WebServer server(80);

// LED แสดงสถานะ (ใช้ LED บนบอร์ดเพื่อทดสอบ)
#define STATUS_LED 2  // GPIO2 = LED ในตัว ESP32 DevKit

// =============================================================
// ฟังก์ชันส่งรายงานผลลัพธ์กลับไปยัง AI Brain (Server)
// เมื่อแขนกลหรือหุ่นยนต์ปฏิบัติงานเสร็จสิ้น (สำเร็จ หรือ ล้มเหลว)
// =============================================================
void reportTaskResultToBrain(String action, String status, String target, String detail = "") {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[REPORT ERROR] WiFi not connected!");
    return;
  }

  HTTPClient http;
  String url = "http://" + String(brain_server_ip) + ":" + String(brain_server_port) + "/api/robot_status";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;
  doc["action"] = action;
  doc["status"] = status;   // "success" หรือ "failed"
  doc["target"] = target;
  doc["detail"] = detail;
  doc["device"] = "REAL-ESP32-ROBOT";

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  Serial.printf(">> [FEEDBACK TO AI] ส่งผลลัพธ์: %s (%s) -> HTTP Response: %d\n", action.c_str(), status.c_str(), httpCode);
  http.end();
}

// ฟังก์ชันเพิ่ม CORS Headers
void sendCorsHeader() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

// จัดการ Pre-flight OPTIONS request (จำเป็นสำหรับ Web Browser)
void handleOptions() {
  sendCorsHeader();
  server.send(204);
}

// ตรวจสอบสถานะการเชื่อมต่อ (Ping)
void handleRoot() {
  sendCorsHeader();
  
  JsonDocument doc;
  doc["status"] = "online";
  doc["device"] = "REXZA-ESP32";
  doc["uptime_sec"] = millis() / 1000;
  doc["free_heap"] = ESP.getFreeHeap();

  String output;
  serializeJson(doc, output);
  server.send(200, "application/json", output);
}

// =============================================================
// จัดการคำสั่งควบคุมหุ่นยนต์
// รองรับ:
//   GET:  /command?action=PICK&target=bottle
//   POST: /command  Body: {"action":"PICK","target":"bottle"}
// =============================================================
void handleCommand() {
  sendCorsHeader();

  String action = "";
  String target = "";

  // อ่านค่าจาก Query Parameters (GET)
  if (server.hasArg("action")) {
    action = server.arg("action");
    if (server.hasArg("target")) {
      target = server.arg("target");
    }
  }
  // อ่านค่าจาก JSON Body (POST)
  else if (server.hasArg("plain")) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, server.arg("plain"));
    if (!error) {
      action = doc["action"].as<String>();
      target = doc["target"].as<String>();
    } else {
      server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
      return;
    }
  }

  Serial.println("================================");
  Serial.printf("[COMMAND] Action: %s | Target: %s\n", action.c_str(), target.c_str());

  // --- ส่วนสั่งการฮาร์ดแวร์จริง ---
  // (เพิ่มโค้ดควบคุม Servo / Motor / แขนกล ตรงนี้)
  String statusMsg = "unknown_action";

  if (action == "PICK" || action.startsWith("PICK_")) {
    Serial.printf(">> แขนกลกำลังไปหยิบ '%s'...\n", target.c_str());
    digitalWrite(STATUS_LED, HIGH);
    statusMsg = "picking";
    
  } else if (action == "PLACE") {
    Serial.printf(">> แขนกลกำลังวาง '%s'...\n", target.c_str());
    digitalWrite(STATUS_LED, HIGH);
    statusMsg = "placing";

  } else if (action == "MOVE_OBJECT") {
    Serial.printf(">> กำลังเคลื่อนย้ายวัตถุ '%s'...\n", target.c_str());
    digitalWrite(STATUS_LED, HIGH);
    statusMsg = "moving_object";

  } else if (action == "START_LINE_TRACK") {
    Serial.println(">> เริ่มต้นการเดินตามเส้นทาง (Line Tracking)...");
    digitalWrite(STATUS_LED, HIGH);
    statusMsg = "line_tracking";

  } else if (action == "STOP_LINE_TRACK") {
    Serial.println(">> หยุดการเดินตามเส้นทาง...");
    digitalWrite(STATUS_LED, LOW);
    statusMsg = "line_tracking_stopped";

  } else if (action == "NAVIGATE_TO") {
    Serial.printf(">> กำลังเดินทางไปยังสถานี '%s'...\n", target.c_str());
    digitalWrite(STATUS_LED, HIGH);
    statusMsg = "navigating";

  } else if (action == "SAFETY_ALERT") {
    Serial.printf(">> ⚠️ เหตุขัดข้องความปลอดภัย: '%s' -> หยุดฉุกเฉินทันที!\n", target.c_str());
    digitalWrite(STATUS_LED, LOW);
    statusMsg = "safety_alert";

  } else if (action == "HOME") {
    Serial.println(">> กำลังกลับจุดเริ่มต้น (HOME)...");
    digitalWrite(STATUS_LED, LOW);
    statusMsg = "returning_home";
    
  } else if (action == "STOP") {
    Serial.println(">> หยุดการทำงานฉุกเฉิน (STOP)!");
    digitalWrite(STATUS_LED, LOW);
    statusMsg = "stopped";
    
  } else if (action == "CheckStatus") {
    Serial.println(">> ตรวจสอบสถานะอุปกรณ์ (CheckStatus)... พร้อมใช้งาน");
    digitalWrite(STATUS_LED, HIGH);
    delay(100);
    digitalWrite(STATUS_LED, LOW);
    statusMsg = "ready";

  } else {
    Serial.printf(">> ไม่รู้จักคำสั่ง: '%s'\n", action.c_str());
    statusMsg = "unknown_action";
  }

  // ส่ง JSON Response กลับ
  JsonDocument resDoc;
  resDoc["status"] = "success";
  resDoc["received_action"] = action;
  resDoc["target"] = target;
  resDoc["robot_status"] = statusMsg;
  resDoc["timestamp"] = millis();

  String response;
  serializeJson(resDoc, response);
  server.send(200, "application/json", response);
}

// =============================================================
// Setup
// =============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  // ตั้งค่า LED
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW);

  Serial.println("\n========================================");
  Serial.println("   REXZA ESP32 Robot Controller v1.0");
  Serial.println("========================================");
  Serial.printf("Connecting to WiFi: %s\n", ssid);

  WiFi.begin(ssid, password);
  
  // กระพริบ LED ระหว่างรอต่อ WiFi
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    Serial.print(".");
    attempts++;
    if (attempts > 40) {  // timeout 20 วินาที
      Serial.println("\n[ERROR] WiFi connection failed! Restarting...");
      ESP.restart();
    }
  }

  digitalWrite(STATUS_LED, LOW);
  Serial.println();
  Serial.println("WiFi Connected!");
  Serial.printf("IP Address: http://%s\n", WiFi.localIP().toString().c_str());
  Serial.println("นำ IP นี้ไปใส่ในหน้าเว็บแอปพลิเคชัน");
  Serial.println("----------------------------------------");

  // กำหนดเส้นทาง REST API
  server.on("/", HTTP_GET, handleRoot);
  server.on("/command", HTTP_OPTIONS, handleOptions);
  server.on("/command", HTTP_GET, handleCommand);
  server.on("/command", HTTP_POST, handleCommand);

  server.begin();
  Serial.println("REST API Server Started! Waiting for commands...");
}

// =============================================================
// Main Loop
// =============================================================
void loop() {
  server.handleClient();
}

