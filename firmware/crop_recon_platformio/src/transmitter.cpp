#include <SPI.h>
#include <LoRa.h>
#include <BME280I2C.h>
#include <Wire.h>

int counter = 0;

const int csPin = 7;
const int resetPin = 0;
const int irqPin = 1;

const char* nodeId = "node2";

BME280I2C bme;

void onTxDone();
boolean runEvery(unsigned long interval);
void sendBME280Data();
void printBME280Data(Stream* client);

void setup() {
  Serial.begin(9600);
  while (!Serial);

  Serial.println("LoRa Sender non-blocking Callback");

  Wire.begin();

  while (!bme.begin()) {
    Serial.println("Could not find BME280 sensor!");
    delay(1000);
  }

  switch (bme.chipModel()) {
    case BME280::ChipModel_BME280:
      Serial.println("Found BME280 sensor! Success.");
      break;
    case BME280::ChipModel_BMP280:
      Serial.println("Found BMP280 sensor! No Humidity available.");
      break;
    default:
      Serial.println("Found UNKNOWN sensor! Error!");
      break;
  }

  LoRa.setPins(csPin, resetPin, irqPin);

  if (!LoRa.begin(433E6)) {
    Serial.println("Starting LoRa failed!");
    while (1);
  }

  LoRa.onTxDone(onTxDone);
}

void loop() {
  if (runEvery(5000)) {
    Serial.print("Sending packet non-blocking: ");
    Serial.println(counter);

    sendBME280Data();
    counter++;
  }
}

void sendBME280Data() {
  float temp(NAN), hum(NAN), pres(NAN);

  BME280::TempUnit tempUnit(BME280::TempUnit_Celsius);
  BME280::PresUnit presUnit(BME280::PresUnit_Pa);

  bme.read(pres, temp, hum, tempUnit, presUnit);

  // Optional: round values to integers for format like "node1,67,10,34"
  int tempInt = (int)round(temp);
  int humInt = (int)round(hum);
  int presInt = (int)round(pres);

  // Serial output
  Serial.print(nodeId);
  Serial.print(",");
  Serial.print(tempInt);
  Serial.print(",");
  Serial.print(humInt);
  Serial.print(",");
  Serial.println(presInt);

  // LoRa output
  LoRa.beginPacket();
  LoRa.print(nodeId);
  LoRa.print(",");
  LoRa.print(tempInt);
  LoRa.print(",");
  LoRa.print(humInt);
  LoRa.print(",");
  LoRa.print(presInt);
  LoRa.endPacket(true);
}

void onTxDone() {
  Serial.println("TxDone");
}

boolean runEvery(unsigned long interval) {
  static unsigned long previousMillis = 0;
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    return true;
  }
  return false;
}