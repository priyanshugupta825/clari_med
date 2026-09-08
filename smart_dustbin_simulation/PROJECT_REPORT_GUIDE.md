# Smart Dustbin Monitoring System - Project & Viva Guide

**Project Title:** Smart Dustbin Monitoring System: An IoT Based Smart Waste Management Solution  
**Subject:** Internet of Things (IoT) – Project Based Learning (PBL)  
**Department:** Computer Science & Engineering  
**Team Members:**
- Tushar Hari (Roll No: 24)
- Priyanshu Gupta (Roll No: 20)
- Abhishek Kr Mandal (Roll No: 59)
- Sandeep Kumar (Roll No: 44)

---

## 1. System Architecture & Block Diagram

```
                 +-----------------------+
                 |     5V Power Supply   |
                 +-----------+-----------+
                             |
    [Inputs / Sensors]       v          [Outputs / Actuators]
+-------------------------+      +---------------------------+
| HC-SR04 Ultrasonic      | ---> | NodeMCU ESP8266           | ---> SG90 Servo Motor (Lid)
| (Measures garbage level)|      | (Main Microcontroller     | ---> Active Buzzer & Red LED
+-------------------------+      |  & Wi-Fi Engine)          | ---> Green Status LED
+-------------------------+      |                           | ---> Wi-Fi / Cloud Telemetry
| IR Proximity Sensor     | ---> |                           |      (ThingSpeak / Blynk)
| (Detects approaching hand)     +---------------------------+
+-------------------------+
```

---

## 2. Working Principle & Mathematical Formulation

### A. Touch-Free Lid Automation (IR Sensor + Servo Motor)
1. The **Infrared (IR) Sensor** continuously emits infrared radiation through an IR LED.
2. When a user approaches their hand near the dustbin opening, the infrared rays bounce off the hand and hit the photodiode receiver.
3. The onboard operational amplifier (LM393 comparator) detects the voltage change and transitions the `OUT` pin from `HIGH` to `LOW`.
4. The NodeMCU detects this falling edge on `PIN_IR (D5)` and commands the **SG90 Servo Motor** on `D4` to rotate from $0^\circ$ (Closed position) to $90^\circ$ (Open position).
5. A non-blocking software timer (`millis()`) holds the lid open for $3\text{ seconds}$. If no further obstacle is detected, the servo returns to $0^\circ$, avoiding physical contact with bacteria/germs.

### B. Garbage Level Measurement (HC-SR04 Ultrasonic Sensor)
1. Mounted facing downwards under the bin lid, the **HC-SR04** transmits an ultrasonic burst of 8 cycles at $40\text{ kHz}$ when triggered with a $10\ \mu\text{s}$ pulse on `TRIG (D1)`.
2. The sound waves travel downward, reflect off the uppermost surface of the trash, and return to the receiver cylinder.
3. The duration $t$ (in microseconds) that `ECHO (D2)` stays `HIGH` is measured by the NodeMCU using `pulseIn()`.

**Mathematical Calculation:**
$$\text{Speed of Sound in Air } (v) = 340\text{ m/s} = 0.0343\text{ cm/}\mu\text{s}$$
$$\text{Distance to Garbage Surface } (D) = \frac{t \times 0.0343}{2}\quad (\text{cm})$$

**Garbage Fill Percentage:**
$$\text{Effective Height } (H_{\text{eff}}) = H_{\text{total}} - H_{\text{sensor\_offset}} = 30\text{ cm} - 4\text{ cm} = 26\text{ cm}$$
$$\text{Filled Height } (H_{\text{filled}}) = H_{\text{total}} - D$$
$$\text{Fill Percentage } (\%) = \left( \frac{H_{\text{filled}}}{H_{\text{eff}}} \right) \times 100$$

### C. Threshold Alerting & IoT Telemetry
- If $\text{Fill Percentage} \ge 85\%$:
  - NodeMCU triggers the **Buzzer** (2000 Hz tone) and turns on the **Red Alert LED**.
  - NodeMCU formats an HTTP POST request and transmits the real-time bin status, fill level, and GPS/bin ID to the **ThingSpeak / Blynk IoT Cloud**.
  - The municipal/campus sanitation crew receives an instant push notification on their mobile dashboard to empty the bin.

---

## 3. Hardware Cost Breakdown

| Component | Function | Quantity | Approx Cost (₹) |
| :--- | :--- | :--- | :--- |
| **NodeMCU ESP8266** | Master controller & Wi-Fi module | 1 | ₹350 |
| **Ultrasonic Sensor (HC-SR04)** | Waste height measurement | 1 | ₹120 |
| **IR Proximity Sensor** | Hand detection for touch-free lid | 1 | ₹60 |
| **SG90 Micro Servo Motor** | Physical lid opening mechanism | 1 | ₹150 |
| **Piezo Buzzer & 5mm LEDs** | Local acoustic and optical warnings | 1 set | ₹30 |
| **Jumper Wires, Resistors, 5V Adapter** | Wiring & power supply | - | ₹300 |
| **Total Estimated Cost** | | | **₹1,010** |

---

## 4. Top 15 Viva Questions & Answers for PBL Evaluation

### Q1: Why did you choose NodeMCU ESP8266 instead of a standard Arduino Uno?
> **Answer:** The Arduino Uno lacks built-in wireless connectivity. To transmit fill data to an IoT cloud or send mobile alerts from an Uno, we would need to purchase and wire an external ESP8266 or GSM shield, which increases circuit complexity and cost. The NodeMCU ESP8266 has integrated 802.11 b/g/n Wi-Fi, a faster 32-bit Tensilica processor running at 80 MHz, and more memory at a lower overall price (₹350).

### Q2: Why divide the ultrasonic calculation by 2?
> **Answer:** The pulse emitted by the HC-SR04 travels to the surface of the garbage and then reflects back to the sensor. The time measured by the Echo pin represents the **round-trip** journey. Dividing by 2 gives the one-way distance to the garbage surface.

### Q3: What happens if transparent or sound-absorbing materials (like cloth or sponge) are disposed in the dustbin?
> **Answer:** Ultrasonic waves can suffer dispersion or absorption on porous or soft surfaces like clothes or sponges, which can lead to slight distance inaccuracies. In production environments, this can be mitigated through sensor fusion (e.g., combining ultrasonic time-of-flight with a weight-sensing load cell at the base of the bin).

### Q4: What is the operating voltage of the components? Is there any voltage incompatibility?
> **Answer:** NodeMCU GPIO pins operate at $3.3\text{V}$ logic levels. The SG90 servo motor requires $5\text{V}$ for sufficient mechanical torque, which is supplied from the NodeMCU's `VIN` pin (when powered by USB or $5\text{V}$ adapter). The HC-SR04 Echo pin outputs a $5\text{V}$ signal; in a permanent physical circuit, a simple two-resistor voltage divider ($1\text{k}\Omega$ and $2\text{k}\Omega$) is recommended on the Echo line to step down $5\text{V} \to 3.3\text{V}$ to protect the ESP8266 GPIO.

### Q5: How do you prevent the lid from constantly opening and closing if someone stands near the bin?
> **Answer:** In software, we implement a non-blocking debounce and hold timer (`millis()`). Once triggered, the lid remains open for at least 3 seconds. The timer is refreshed if the hand is continuously detected, and only closes when the sensor reports clear for 3 consecutive seconds.

### Q6: How does the system communicate with the cloud?
> **Answer:** The NodeMCU connects to local Wi-Fi and issues HTTP POST or REST API requests to an IoT cloud platform such as ThingSpeak or Blynk. The payload contains JSON or query parameters: `field1=fill_percentage`, `field2=distance_cm`, and `field3=alert_status`.

### Q7: What is the difference between an IR sensor and an Ultrasonic sensor? Why not use ultrasonic for both?
> **Answer:** 
> - The **IR sensor** is used for proximity detection (hand approach) because it has a fast response time (< 5ms), short detection cone (2-10 cm), and lower power consumption.
> - The **Ultrasonic sensor** is used for fill level measurement because it has a longer range (2 cm to 400 cm) and is not affected by trash color, transparency, or ambient lighting conditions inside the bin.

### Q8: What if the Wi-Fi connection drops? Does the system stop working?
> **Answer:** No. Our firmware uses non-blocking logic. If Wi-Fi fails or disconnects, the touch-free lid (IR + Servo) and the local alerting mechanisms (Buzzer + Red LED) continue to function autonomously. When Wi-Fi reconnects, cloud telemetry resumes automatically.

### Q9: How can this project be scaled up for a Smart City implementation?
> **Answer:** For city-wide deployment:
> 1. Replace Wi-Fi with **LoRaWAN** or **NB-IoT** for long-range (up to 10-15 km) low-power communication without relying on local routers.
> 2. Implement **GPS modules** on each bin so sanitation trucks can compute the optimal travel route using Dijkstra's algorithm or Traveling Salesperson Problem (TSP), collecting only bins that are $\ge 80\%$ full.
> 3. Add **solar panels** and a Li-ion battery charging circuit for complete off-grid operation.

### Q10: What is the purpose of the 220Ω resistor connected with the LEDs?
> **Answer:** It acts as a current-limiting resistor to prevent excessive current from damaging both the LED and the NodeMCU GPIO pin.
