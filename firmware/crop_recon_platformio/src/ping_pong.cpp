// #include <SPI.h>
// #include <LoRa.h>

// #define MAX_PACKET_LEN 64
// #define RX_DEBOUNCE_MS 500   // ignore repeats within 500 ms

// int counter = 0;

// const int csPin = 7;
// const int resetPin = 0;
// const int irqPin = 1;

// bool runEvery(unsigned long interval);
// void onReceive(int packetSize);

// unsigned long lastRxTime = 0;

// void setup() {
//   Serial.begin(9600);
//   while (!Serial) {}

//   Serial.println("LoRa Sender non-blocking Callback");

//   LoRa.setPins(csPin, resetPin, irqPin);

//   if (!LoRa.begin(433E6)) {
//     Serial.println("Starting LoRa failed!");
//     while (1) {}
//   }

//   LoRa.onReceive(onReceive);
//   LoRa.receive();
// }

// void loop() {
//   if (runEvery(5000)) {
//     Serial.print("Sending packet non-blocking: ");
//     Serial.println(counter);

//     LoRa.beginPacket();
//     LoRa.print("hello from TX2! ");
//     LoRa.print(counter);
//     LoRa.endPacket(true);
//     LoRa.receive();

//     counter++;
//   }
// }

// void onReceive(int packetSize) {
//   if (packetSize <= 0) return;

//   unsigned long now = millis();
//   if (now - lastRxTime < RX_DEBOUNCE_MS) {
//     // flush repeated packet and ignore it
//     while (LoRa.available()) {
//       LoRa.read();
//     }
//     LoRa.receive();
//     return;
//   }
//   lastRxTime = now;

//   char buff[MAX_PACKET_LEN + 1];
//   int len = 0;

//   Serial.print("Received packet '");

//   while (LoRa.available() && len < MAX_PACKET_LEN) {
//     char c = (char)LoRa.read();
//     Serial.print(c);
//     buff[len++] = c;
//   }
//   buff[len] = '\0';

//   while (LoRa.available()) {
//     LoRa.read();
//   }

//   Serial.print("' with RSSI ");
//   Serial.println(LoRa.packetRssi());

//   LoRa.beginPacket();
//   LoRa.print(buff);
//   LoRa.print(" ");
//   LoRa.print(counter);
//   LoRa.endPacket(true);
//   LoRa.receive();
// }

// bool runEvery(unsigned long interval) {
//   static unsigned long previousMillis = 0;
//   unsigned long currentMillis = millis();

//   if (currentMillis - previousMillis >= interval) {
//     previousMillis = currentMillis;
//     return true;
//   }
//   return false;
// }