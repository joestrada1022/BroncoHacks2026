// #include <SPI.h>
// #include <LoRa.h>

// int counter = 0;

// const int csPin = 7;          // LoRa radio chip select
// const int resetPin = 0;        // LoRa radio reset
// const int irqPin = 1;          // change for your board; must be a hardware interrupt pin

// void onTxDone();
// boolean runEvery(unsigned long interval);
// void onReceive(int packetSize);

// void setup() {
//   Serial.begin(9600);
//   while (!Serial);

//   Serial.println("LoRa Sender non-blocking Callback");

//   LoRa.setPins(csPin, resetPin, irqPin);

//   if (!LoRa.begin(433E6)) {
//     Serial.println("Starting LoRa failed!");
//     while (1);
//   }

//   LoRa.onTxDone(onTxDone);
//   LoRa.onReceive(onReceive);

//   LoRa.receive();
// }

// void loop() {
//   if (runEvery(5000)) { // repeat every 5000 millis

//     Serial.print("Sending packet non-blocking: ");
//     Serial.println(counter);

//     // send in async / non-blocking mode
//     LoRa.beginPacket();
//     LoRa.print("hello from TX2! ");
//     LoRa.print(counter);
//     LoRa.endPacket(true); // true = async / non-blocking mode

//     counter++;
//   }
// }

// void onTxDone() {
//   Serial.println("TxDone");
//   LoRa.receive();
// }

// void onReceive(int packetSize) {
//   // received a packet
//   Serial.print("Received packet '");

//   // read packet
//   for (int i = 0; i < packetSize; i++) {
//     Serial.print((char)LoRa.read());
//   }

//   // print RSSI of packet
//   Serial.print("' with RSSI ");
//   Serial.println(LoRa.packetRssi());
// }

// boolean runEvery(unsigned long interval)
// {
//   static unsigned long previousMillis = 0;
//   unsigned long currentMillis = millis();
//   if (currentMillis - previousMillis >= interval)
//   {
//     previousMillis = currentMillis;
//     return true;
//   }
//   return false;
// }
