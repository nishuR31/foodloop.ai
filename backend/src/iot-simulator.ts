import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateIoT() {
  console.log('Starting IoT Storage Condition Simulator...');
  
  // Get an inventory item to monitor
  const items = await prisma.inventoryItem.findMany({ take: 5 });
  
  if (items.length === 0) {
    console.log('No inventory items found. Exiting.');
    return;
  }

  const { SensorsService } = await import('./services/sensors.service');
  const sensorsSvc = new SensorsService();

  setInterval(async () => {
    // 1. Refrigerator cold storage simulation
    for (const item of items) {
      const currentTemp = (Math.random() * 10).toFixed(1);
      const isAlert = parseFloat(currentTemp) > 5;
      
      console.log(`[Cold Storage Sensor] Item: ${item.productName} | Temp: ${currentTemp}°C | Status: ${isAlert ? 'ALERT [WARN]' : 'OK'}`);

      if (isAlert) {
        await prisma.notification.create({
          data: {
            userId: item.kitchenId,
            title: 'Storage Temperature Alert',
            message: `Temperature for ${item.productName} has exceeded safe limits (${currentTemp}°C).`,
            read: false,
          }
        }).catch(() => null);
      }
    }

    // 2. ESP32 Food Freshness & Spoilage Node simulation (DHT22 + MQ-2 + MQ-3)
    const simulatedTemp = +(22 + Math.random() * 4).toFixed(1);
    const simulatedHum = +(50 + Math.random() * 8).toFixed(1);
    const simulatedMq2 = Math.floor(400 + Math.random() * 60);
    const simulatedMq3 = Math.floor(370 + Math.random() * 50);

    const { saved, detection } = await sensorsSvc.ingestSensorData({
      device_id: 'ESP32_FOOD_001',
      temperature_c: simulatedTemp,
      humidity_pct: simulatedHum,
      mq2_raw: simulatedMq2,
      mq2_mv: +((simulatedMq2 / 4095.0) * 3300.0).toFixed(1),
      mq3_raw: simulatedMq3,
      mq3_mv: +((simulatedMq3 / 4095.0) * 3300.0).toFixed(1),
    });

    console.log(`[ESP32 IoT Node] Node: ESP32_FOOD_001 | Spoilage: ${detection.spoilageScore.toFixed(1)}/100 | Status: ${detection.status} | LED: ${detection.ledCommand}`);
  }, 5000); // Pulse every 5 seconds like the physical ESP32
}

simulateIoT()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
