#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
// #include "config.h"

const char *ssid = "ULTRONV2-2 5664";
const char *password = "password21";
const char *mqtt_broker = "4e3aab3d947e4ce89c4d749601ec552e.s1.eu.hivemq.cloud";



const int csPin = 7;          // LoRa radio chip select
const int resetPin = 0;        // LoRa radio reset
const int irqPin = 1;          // change for your board; must be a hardware interrupt pin

const char *MQTT_USER = "broncohacks26";
const char *MQTT_PASS = "Broncohacks26";

unsigned long lastMsg = 0;
const long interval = 5000; // Publish every 5 seconds

void setup_wifi()
{
  delay(10);

  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi Connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

WiFiClientSecure espClient;
PubSubClient client(espClient);

void reconnect()
{
  while (!client.connected())
  {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESPClient";
    if (client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS))
    {
      Serial.println("connected");
    }
    else
    {
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

  Serial.println("LoRa Receiver");

  // connect to wifi
  setup_wifi();
  espClient.setInsecure(); // Disable SSL certificate verification
  client.setServer(mqtt_broker, 8883);
  client.setBufferSize(8192);

  LoRa.setPins(csPin, resetPin, irqPin);

  if (!LoRa.begin(433E6)) {
    Serial.println("Starting LoRa failed!");
    while (1);
  }

  LoRa.dumpRegisters(Serial);
}

void loop() {
  if (!client.connected())
  {
    reconnect();
    Serial.println("MQTT Connected");
  }
  client.loop();

  // Publish a message every 5 seconds (non-blocking)
    unsigned long now = millis();
    if (now - lastMsg > interval) {
        lastMsg = now;
        
        // Create a simple payload
        String payload = "Hello from ESP32! Uptime: " + String(now / 1000) + "s";
        
        Serial.print("Publishing message: ");
        Serial.println(payload);
        
        // Publish to the topic "esp32/status"
        client.publish("farm/data", payload.c_str());
    }

  // try to parse packet
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    // received a packet
    Serial.print("Received packet '");

    // read packet
    while (LoRa.available()) {
      Serial.print((char)LoRa.read());
    }

    // print RSSI of packet
    Serial.print("' with RSSI ");
    Serial.println(LoRa.packetRssi());
  }
}