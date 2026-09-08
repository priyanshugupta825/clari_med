# How to Run the Smart Dustbin Simulation on Wokwi

[Wokwi](https://wokwi.com/) is a free, browser-based hardware simulator for Arduino, ESP8266, and ESP32 microcontrollers. You can run your entire Smart Dustbin circuit with real virtual components in your web browser.

---

## Quick Setup (Under 1 Minute)

### Option 1: Direct Web Simulator (Fastest)
1. In this folder, simply double-click or open **`index.html`** in any web browser (Chrome, Edge, Firefox, Safari).
2. It runs immediately without any installation or internet connection required.

---

### Option 2: Run Circuit on Wokwi.com

1. **Open Wokwi**: Go to [https://wokwi.com/projects/new/esp8266](https://wokwi.com/projects/new/esp8266) (or choose NodeMCU ESP8266).
2. **Copy the Source Code**:
   - Open [`smart_dustbin.ino`](smart_dustbin.ino) in any text editor.
   - Copy all lines and paste them into the code editor tab (`sketch.ino`) on Wokwi.
3. **Copy the Circuit Diagram**:
   - On the Wokwi page, click the **`diagram.json`** tab in the top tab bar.
   - Open [`diagram.json`](diagram.json) from this folder.
   - Paste the contents into Wokwi's `diagram.json`.
4. **Click the Green Play Button (▶ Start Simulation)**:
   - The virtual NodeMCU ESP8266 will boot up.
   - The Serial Monitor on the right side will display boot messages and sensor readings at `115200 baud`.

---

## Interacting with the Wokwi Simulation

- **Trigger Automatic Lid**: Click on the PIR / IR Motion Sensor to simulate a hand approaching $\to$ the SG90 servo motor will rotate to $90^\circ$ and open the lid, then return to $0^\circ$ after 3 seconds.
- **Adjust Garbage Level**: Click on the HC-SR04 Ultrasonic sensor $\to$ a slider will appear showing distance in centimeters. Move the slider closer (e.g., $< 5\text{ cm}$) to simulate a full dustbin.
- **Alert Testing**: When the distance corresponds to $\ge 85\%$ fill level:
  - The virtual Buzzer will emit sound.
  - The Red LED will light up.
  - Telemetry will show critical status in the Serial Monitor.

---

## Circuit Pin Connection Reference

| Component | Component Pin | NodeMCU ESP8266 Pin | GPIO Pin | Description |
| :--- | :--- | :--- | :--- | :--- |
| **HC-SR04 Ultrasonic** | `VCC` | `3V3` or `VIN` | - | Power |
| | `GND` | `GND` | - | Ground |
| | `TRIG` | `D1` | GPIO 5 | Trigger pulse output |
| | `ECHO` | `D2` | GPIO 4 | Echo pulse input |
| **SG90 Servo Motor** | `V+` (Red) | `VIN` (5V) | - | Motor power |
| | `GND` (Brown/Black) | `GND` | - | Common ground |
| | `PWM` (Orange) | `D4` | GPIO 2 | PWM signal for rotation |
| **IR Proximity Sensor**| `VCC` | `3V3` | - | Power |
| | `GND` | `GND` | - | Ground |
| | `OUT` | `D5` | GPIO 14 | Object detection signal |
| **Active Buzzer** | `Positive (+)` | `D6` | GPIO 12 | Audio alert signal |
| | `Negative (-)` | `GND` | - | Ground |
| **Red Alert LED** | `Anode (+)` | `D7` (via 220Ω) | GPIO 13 | Full alert indicator |
| **Green Status LED** | `Anode (+)` | `D8` (via 220Ω) | GPIO 15 | Normal status indicator |
