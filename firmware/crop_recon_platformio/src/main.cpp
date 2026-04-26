#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

const char *ssid = "ULTRONV2-2 5664";
const char *password = "password21";
const char *mqtt_broker = "4e3aab3d947e4ce89c4d749601ec552e.s1.eu.hivemq.cloud";

const int csPin = 7;
const int resetPin = 0;
const int irqPin = 1;

const char *MQTT_USER = "broncohacks26";
const char *MQTT_PASS = "Broncohacks26";

unsigned long lastMsg = 0;
const long interval = 5000;

WiFiClientSecure espClient;
PubSubClient client(espClient);

// =========================
// Queue structure
// =========================
struct SensorData {
  String nodeId;
  float temp;
  float humidity;
  float pressure;
};

const int QUEUE_SIZE = 20;
SensorData dataQueue[QUEUE_SIZE];
int queueFront = 0;
int queueRear = 0;
int queueCount = 0;

// Add item to queue
bool enqueue(SensorData data) {
  if (queueCount >= QUEUE_SIZE) {
    Serial.println("Queue full, dropping oldest data.");
    queueFront = (queueFront + 1) % QUEUE_SIZE;
    queueCount--;
  }

  dataQueue[queueRear] = data;
  queueRear = (queueRear + 1) % QUEUE_SIZE;
  queueCount++;
  return true;
}

// Remove item from queue
bool dequeue(SensorData &data) {
  if (queueCount == 0) {
    return false;
  }

  data = dataQueue[queueFront];
  queueFront = (queueFront + 1) % QUEUE_SIZE;
  queueCount--;
  return true;
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi Connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESPClient";

    if (client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  while (!Serial);
  delay(1000);

  Serial.println("LoRa Receiver & MQTT Publisher with Queue");

  setup_wifi();
  espClient.setInsecure();
  client.setServer(mqtt_broker, 8883);
  client.setBufferSize(8192);

  LoRa.setPins(csPin, resetPin, irqPin);

  if (!LoRa.begin(433E6)) {
    Serial.println("Starting LoRa failed!");
    while (1);
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // =========================
  // 1. RECEIVE AND QUEUE LORA PACKETS
  // Expected format:
  // nodeId,temp,humidity,pressure
  // Example:
  // Node_01,24.5,60.0,1013.2
  // =========================
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String incomingData = "";

    while (LoRa.available()) {
      incomingData += (char)LoRa.read();
    }

    Serial.print("Received LoRa Packet: ");
    Serial.println(incomingData);

    int firstComma = incomingData.indexOf(',');
    int secondComma = incomingData.indexOf(',', firstComma + 1);
    int thirdComma = incomingData.indexOf(',', secondComma + 1);

    if (firstComma > 0 && secondComma > 0 && thirdComma > 0) {
      SensorData newData;
      newData.nodeId = incomingData.substring(0, firstComma);
      newData.temp = incomingData.substring(firstComma + 1, secondComma).toFloat();
      newData.humidity = incomingData.substring(secondComma + 1, thirdComma).toFloat();
      newData.pressure = incomingData.substring(thirdComma + 1).toFloat();

      enqueue(newData);

      Serial.print("Queued data from: ");
      Serial.print(newData.nodeId);
      Serial.print(" | Queue count: ");
      Serial.println(queueCount);
    } else {
      Serial.println("Error: Malformed LoRa packet.");
    }
  }

  // =========================
  // 2. EVERY 5 SECONDS, PUBLISH ALL QUEUED ITEMS
  // =========================
  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;

    if (queueCount == 0) {
      Serial.println("Queue empty, nothing to publish.");
    } else {
      Serial.print("Publishing all queued packets. Count: ");
      Serial.println(queueCount);

      SensorData dataToSend;

      while (dequeue(dataToSend)) {
        JsonDocument doc;
        doc["nodeId"] = dataToSend.nodeId;
        doc["temp"] = dataToSend.temp;
        doc["humidity"] = dataToSend.humidity;
        doc["pressure"] = dataToSend.pressure;

        char jsonBuffer[256];
        serializeJson(doc, jsonBuffer);

        Serial.print("Publishing to MQTT: ");
        Serial.println(jsonBuffer);

        if (client.publish("farm/data", jsonBuffer)) {
          Serial.println("Publish successful");
        } else {
          Serial.println("Publish failed");
        }

        delay(100); // small spacing between publishes
        client.loop();
      }

      Serial.println("Finished publishing queued packets.");
    }
  }
}