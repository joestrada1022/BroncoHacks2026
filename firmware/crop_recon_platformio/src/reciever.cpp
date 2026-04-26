// #include <SPI.h>
// #include <LoRa.h>

// const int csPin = 7;          // LoRa radio chip select
// const int resetPin = 0;        // LoRa radio reset
// const int irqPin = 1;          // change for your board; must be a hardware interrupt pin

// void setup() {
//   Serial.begin(9600);
//   while (!Serial);
//   sleep(1);

//   Serial.println("LoRa Receiver");

//   LoRa.setPins(csPin, resetPin, irqPin);

//   if (!LoRa.begin(433E6)) {
//     Serial.println("Starting LoRa failed!");
//     while (1);
//   }

//   LoRa.dumpRegisters(Serial);
// }

// void loop() {
//   // try to parse packet
//   int packetSize = LoRa.parsePacket();
//   if (packetSize) {
//     // received a packet
//     Serial.print("Received packet '");

//     // read packet
//     while (LoRa.available()) {
//       Serial.print((char)LoRa.read());
//     }

//     // print RSSI of packet
//     Serial.print("' with RSSI ");
//     Serial.println(LoRa.packetRssi());
//   }
// }