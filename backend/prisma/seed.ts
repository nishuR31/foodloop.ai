import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.foodSpoilageSensorData.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.impactMetric.deleteMany();
  await prisma.aIRecommendation.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.route.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.redistribution.deleteMany();
  await prisma.demandPrediction.deleteMany();
  await prisma.surplus.deleteMany();
  await prisma.consumptionRecord.deleteMany();
  await prisma.productionRecord.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.nGO.deleteMany();
  await prisma.kitchen.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passkey.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const passwordHash = await bcrypt.hash('Qwertyui12345678@', 10);

  // Orgs
  const adminOrg = await prisma.organization.create({ data: { name: 'FoodLoop Admin', type: 'ADMIN' }});
  const kitchenOrg1 = await prisma.organization.create({ data: { name: 'City University', type: 'KITCHEN' }});
  const kitchenOrg2 = await prisma.organization.create({ data: { name: 'Corporate Cafe', type: 'KITCHEN' }});
  const ngoOrg1 = await prisma.organization.create({ data: { name: 'Hope Food Bank', type: 'NGO' }});
  const ngoOrg2 = await prisma.organization.create({ data: { name: 'Community Care', type: 'NGO' }});

  // ─── Primary demo users (both short and foodloop.ai aliases) ────────────────
  const adminUser = await prisma.user.create({
    data: { email: 'admin@admin.com', name: 'Super Admin', passwordHash, role: 'ADMIN', organizationId: adminOrg.id }
  });
  await prisma.user.create({
    data: { email: 'admin@foodloop.ai', name: 'FoodLoop Admin', passwordHash, role: 'ADMIN', organizationId: adminOrg.id }
  });

  const kitchenManager = await prisma.user.create({
    data: { email: 'kitchen@kitchen.com', name: 'Kitchen Manager', passwordHash, role: 'KITCHEN_MANAGER', organizationId: kitchenOrg1.id }
  });
  await prisma.user.create({
    data: { email: 'kitchen@foodloop.ai', name: 'Chef Kitchen', passwordHash, role: 'KITCHEN_MANAGER', organizationId: kitchenOrg1.id }
  });
  await prisma.user.create({
    data: { email: 'manager@cityuni.edu', name: 'John Kitchen', passwordHash, role: 'KITCHEN_MANAGER', organizationId: kitchenOrg1.id }
  });

  const ngoStaff = await prisma.user.create({
    data: { email: 'ngo@ngo.com', name: 'NGO Staff', passwordHash, role: 'NGO_STAFF', organizationId: ngoOrg1.id }
  });
  await prisma.user.create({
    data: { email: 'ngo@foodloop.ai', name: 'Hope NGO Staff', passwordHash, role: 'NGO_STAFF', organizationId: ngoOrg1.id }
  });
  await prisma.user.create({
    data: { email: 'staff@hopefoodbank.org', name: 'Sarah NGO', passwordHash, role: 'NGO_STAFF', organizationId: ngoOrg1.id }
  });

  const driverUser = await prisma.user.create({
    data: { email: 'driver@foodloop.ai', name: 'Mike Driver', passwordHash, role: 'DRIVER' }
  });
  await prisma.user.create({
    data: { email: 'driver@driver.com', name: 'Alex Rider', passwordHash, role: 'DRIVER' }
  });

  // Entities
  const kitchen1 = await prisma.kitchen.create({
    data: { name: 'Main Campus Kitchen', location: '123 University Ave', latitude: 34.0522, longitude: -118.2437, organizationId: kitchenOrg1.id }
  });

  const ngo1 = await prisma.nGO.create({
    data: { name: 'Hope Food Bank - Downtown', location: '456 Charity St', latitude: 34.0550, longitude: -118.2400, capacity: 500, organizationId: ngoOrg1.id }
  });

  const ngo2 = await prisma.nGO.create({
    data: { name: 'Community Care Center', location: '789 Hope Blvd', latitude: 34.0610, longitude: -118.2350, capacity: 350, organizationId: ngoOrg2.id }
  });

  const driver1 = await prisma.driver.create({
    data: { userId: driverUser.id, vehicleNo: 'FL-1001', isAvailable: true }
  });

  // Inventory
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  await prisma.inventoryItem.createMany({
    data: [
      { kitchenId: kitchen1.id, productName: 'Tomatoes', category: 'Vegetables', quantity: 50, unit: 'kg', expiryDate: nextWeek, status: 'SAFE' },
      { kitchenId: kitchen1.id, productName: 'Rice', category: 'Grains', quantity: 200, unit: 'kg', status: 'SAFE' },
      { kitchenId: kitchen1.id, productName: 'Milk', category: 'Dairy', quantity: 20, unit: 'L', expiryDate: new Date(today.getTime() + 86400000 * 2), status: 'EXPIRING_SOON' },
      { kitchenId: kitchen1.id, productName: 'Fresh Bread', category: 'Bakery', quantity: 30, unit: 'loaves', expiryDate: new Date(today.getTime() + 86400000 * 3), status: 'SAFE' }
    ]
  });

  // Predictions & Surplus
  await prisma.demandPrediction.create({
    data: {
      kitchenId: kitchen1.id, targetDate: today, predictedDemand: 850, recommendedProduction: 870, expectedSurplus: 20, confidence: 0.91,
      aiReasoning: "Historical data suggests 850 meals for a typical Tuesday. Added small buffer."
    }
  });

  await prisma.productionRecord.create({
    data: { kitchenId: kitchen1.id, date: today, foodItem: 'Mixed Meals', quantityProduced: 900, unit: 'meals' }
  });

  await prisma.consumptionRecord.create({
    data: { kitchenId: kitchen1.id, date: today, foodItem: 'Mixed Meals', quantityConsumed: 820, unit: 'meals' }
  });

  // 1. Matched surplus with delivery assigned to driver1
  const surplus1 = await prisma.surplus.create({
    data: { kitchenId: kitchen1.id, date: today, foodItem: 'Steamed Rice & Lentils', quantitySurplus: 80, unit: 'meals', status: 'MATCHED' }
  });

  const redistribution1 = await prisma.redistribution.create({
    data: { surplusId: surplus1.id, ngoId: ngo1.id, quantityMatched: 70, status: 'ACCEPTED' }
  });

  await prisma.delivery.create({
    data: { redistributionId: redistribution1.id, driverId: driver1.id, status: 'ASSIGNED' }
  });

  // 2. Available delivery for driver to claim (PENDING status, no driver assigned yet)
  const surplus2 = await prisma.surplus.create({
    data: { kitchenId: kitchen1.id, date: today, foodItem: 'Vegetable Biryani & Salads', quantitySurplus: 45, unit: 'meals', status: 'MATCHED' }
  });

  const redistribution2 = await prisma.redistribution.create({
    data: { surplusId: surplus2.id, ngoId: ngo2.id, quantityMatched: 45, status: 'ACCEPTED' }
  });

  await prisma.delivery.create({
    data: { redistributionId: redistribution2.id, driverId: null, status: 'PENDING' }
  });

  // 3. Available Surplus for NGO Marketplace to claim
  await prisma.surplus.createMany({
    data: [
      { kitchenId: kitchen1.id, date: today, foodItem: 'Fresh Garden Salad Bowls', quantitySurplus: 30, unit: 'portions', status: 'AVAILABLE' },
      { kitchenId: kitchen1.id, date: today, foodItem: 'Whole Wheat Loaves', quantitySurplus: 25, unit: 'loaves', status: 'AVAILABLE' }
    ]
  });

  // Impact
  await prisma.impactMetric.create({
    data: { date: today, wastePreventedKg: 35, mealsSaved: 70, co2eAvoidedKg: 87.5, waterSavedLiters: 4200, moneySaved: 140 }
  });

  // Sensors and Cold Storage
  const sensor = await prisma.sensor.create({
    data: { kitchenId: kitchen1.id, name: 'Cold Storage A', type: 'TEMPERATURE', location: 'Main Refrigerator', status: 'ACTIVE' }
  });

  await prisma.sensorReading.createMany({
    data: [
      { sensorId: sensor.id, value: 4.2, timestamp: new Date(today.getTime() - 3600000), isAlertTriggered: false },
      { sensorId: sensor.id, value: 11.8, timestamp: today, isAlertTriggered: true }
    ]
  });

  await prisma.alert.create({
    data: { title: 'High Temperature Detected', message: 'Cold Storage A is at 11.8°C (Threshold 5°C)', severity: 'CRITICAL' }
  });

  // ─── ESP32 Food Spoilage Sensor Node Readings (Live Node Data) ──────────────
  await prisma.foodSpoilageSensorData.createMany({
    data: [
      {
        deviceId: 'ESP32_FOOD_001',
        temperature: 23.4,
        humidity: 54.0,
        mq2Raw: 410,
        mq2Mv: 330.4,
        mq3Raw: 385,
        mq3Mv: 310.2,
        gasIndex: 12.8,
        temperatureIndex: 10.0,
        humidityIndex: 10.0,
        spoilageScore: 13.9,
        status: 'GOOD',
        createdAt: new Date(today.getTime() - 15000),
      },
      {
        deviceId: 'ESP32_FOOD_001',
        temperature: 23.8,
        humidity: 53.5,
        mq2Raw: 420,
        mq2Mv: 338.5,
        mq3Raw: 390,
        mq3Mv: 314.2,
        gasIndex: 13.3,
        temperatureIndex: 10.0,
        humidityIndex: 10.0,
        spoilageScore: 14.3,
        status: 'GOOD',
        createdAt: new Date(today.getTime() - 10000),
      },
      {
        deviceId: 'ESP32_FOOD_001',
        temperature: 24.1,
        humidity: 52.8,
        mq2Raw: 425,
        mq2Mv: 342.5,
        mq3Raw: 395,
        mq3Mv: 318.3,
        gasIndex: 13.7,
        temperatureIndex: 10.0,
        humidityIndex: 10.0,
        spoilageScore: 14.6,
        status: 'GOOD',
        createdAt: today,
      }
    ]
  });

  // AI Recommendations
  await prisma.aIRecommendation.createMany({
    data: [
      { title: 'Reduce Lunch Production', description: 'Reduce tomorrow\'s lunch production by 8% based on historical drop off.', createdAt: today },
      { title: 'Expiring Inventory', description: '20L of Milk expiring in 2 days. Prioritize use.', createdAt: today }
    ]
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      { userId: kitchenManager.id, title: 'Surplus Matched', message: 'Your surplus of 80 meals has been matched with Hope Food Bank.', read: false },
      { userId: kitchenManager.id, title: 'IoT Alert', message: 'Cold Storage A temperature critical: 11.8°C.', read: false },
      { userId: adminUser.id, title: 'System Alert', message: 'New user registered for Community Care.', read: false }
    ]
  });

  console.log("Database seeded successfully!");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
