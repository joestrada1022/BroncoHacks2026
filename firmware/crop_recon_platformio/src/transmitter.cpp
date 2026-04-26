// #include <SPI.h>
// #include <LoRa.h>

// int counter = 0;
// const int csPin = 7;          // LoRa radio chip select
// const int resetPin = 0;        // LoRa radio reset
// const int irqPin = 1;          // change for your board; must be a hardware interrupt pin

// void setup() {
//   Serial.begin(9600);
//   while (!Serial);
//   sleep(1);

//   Serial.println("LoRa Sender");

//   if (!LoRa.begin(433E6)) {
//     Serial.println("Starting LoRa failed!");
//     while (1);
//   }
//   LoRa.dumpRegisters(Serial);
// }

// void loop() {
//   Serial.print("Sending packet: ");
//   Serial.println(counter);

//   // send packet
//   LoRa.beginPacket();
//   LoRa.print("hello ");
//   LoRa.print(counter);
//   LoRa.endPacket();

//   counter++;

//   delay(5000);
// }