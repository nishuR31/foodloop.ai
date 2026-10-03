import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DeliveryRepository {
  async findDriverByUserId(userId: string) {
    return prisma.driver.findUnique({ where: { userId } });
  }

  async findDeliveriesByDriverId(driverId: string) {
    return prisma.delivery.findMany({
      where: { driverId },
      include: {
        redistribution: {
          include: { surplus: { include: { kitchen: true } }, ngo: true }
        }
      }
    });
  }

  async findDeliveriesByNgoId(userId: string) {
    return prisma.delivery.findMany({
      where: {
        redistribution: {
          ngo: {
            organization: {
              users: {
                some: { id: userId }
              }
            }
          }
        }
      },
      include: {
        redistribution: {
          include: { surplus: { include: { kitchen: true } }, ngo: true }
        }
      }
    });
  }

  async findDeliveriesByKitchenId(userId: string) {
    return prisma.delivery.findMany({
      where: {
        redistribution: {
          surplus: {
            kitchen: {
              organization: {
                users: {
                  some: { id: userId }
                }
              }
            }
          }
        }
      },
      include: {
        redistribution: {
          include: { surplus: { include: { kitchen: true } }, ngo: true }
        }
      }
    });
  }

  async findAvailableDeliveries() {
    return prisma.delivery.findMany({
      where: { driverId: null, status: 'PENDING' },
      include: {
        redistribution: {
          include: { surplus: { include: { kitchen: true } }, ngo: true }
        }
      }
    });
  }

  async claimDelivery(deliveryId: string, driverId: string) {
    return prisma.delivery.update({
      where: { id: deliveryId },
      data: { driverId, status: 'ASSIGNED' }
    });
  }

  async updateDeliveryStatusTransaction(deliveryId: string, status: string) {
    return prisma.$transaction(async (tx) => {
      const currentDelivery = await tx.delivery.findUnique({ where: { id: deliveryId } });
      if (!currentDelivery) throw new Error('Delivery not found');

      const validTransitions: Record<string, string[]> = {
        'PENDING': ['ASSIGNED', 'IN_TRANSIT'],
        'ASSIGNED': ['PICKED_UP', 'IN_TRANSIT'],
        'PICKED_UP': ['IN_TRANSIT'],
        'IN_TRANSIT': ['DELIVERED']
      };

      const allowed = validTransitions[currentDelivery.status];
      if (!allowed || !allowed.includes(status)) {
        throw new Error(`Invalid status transition from ${currentDelivery.status} to ${status}`);
      }

      const delivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: { status }
      });

      if (status === 'PICKED_UP') {
        await tx.redistribution.update({
          where: { id: delivery.redistributionId },
          data: { status: 'PICKED_UP' }
        });
      } else if (status === 'DELIVERED') {
        await tx.redistribution.update({
          where: { id: delivery.redistributionId },
          data: { status: 'DELIVERED' }
        });

        const completedRedistribution = await tx.redistribution.findUnique({
          where: { id: delivery.redistributionId }
        });

        if (completedRedistribution) {
          // Deterministic Impact Calculation
          // Assumption: 1kg = 2 meals, 1kg waste = 2.5kg CO2e, 1kg waste = 120L water
          const kgSaved = completedRedistribution.quantityMatched; 
          await tx.impactMetric.create({
            data: {
              date: new Date(),
              wastePreventedKg: kgSaved,
              mealsSaved: kgSaved * 2,
              co2eAvoidedKg: kgSaved * 2.5,
              waterSavedLiters: kgSaved * 120,
              moneySaved: kgSaved * 5 // Assume $5 per kg saved
            }
          });
        }
      }

      return delivery;
    });
  }
}
