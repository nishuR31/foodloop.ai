import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NgoRepository {
  async findAvailableSurplus() {
    return prisma.surplus.findMany({
      where: { status: 'AVAILABLE' },
      include: { kitchen: true }
    });
  }

  async getDashboardStats(ngoId: string) {
    const [accepted, pending] = await Promise.all([
      prisma.redistribution.count({
        where: { ngoId, status: 'ACCEPTED' }
      }),
      prisma.delivery.count({
        where: { redistribution: { ngoId }, status: 'IN_TRANSIT' }
      })
    ]);
    return { acceptedToday: accepted, pendingArrival: pending };
  }

  async acceptSurplusTransaction(surplusId: string, quantityRequested: number, ngoId: string) {
    return prisma.$transaction(async (tx) => {
      const surplus = await tx.surplus.findUnique({ where: { id: surplusId } });
      if (!surplus || surplus.status !== 'AVAILABLE') throw new Error('Surplus not available');

      if (quantityRequested > surplus.quantitySurplus) {
        throw new Error('Requested quantity exceeds available surplus');
      }

      const newRedistribution = await tx.redistribution.create({
        data: {
          surplusId: surplus.id,
          ngoId: ngoId,
          quantityMatched: quantityRequested,
          status: 'ACCEPTED'
        }
      });

      if (quantityRequested < surplus.quantitySurplus) {
        await tx.surplus.update({
          where: { id: surplus.id },
          data: { quantitySurplus: surplus.quantitySurplus - quantityRequested }
        });
      } else {
        await tx.surplus.update({
          where: { id: surplus.id },
          data: { status: 'MATCHED', quantitySurplus: 0 }
        });
      }

      // Auto-assign a random driver for hackathon demo
      const driver = await tx.driver.findFirst({ where: { isAvailable: true }});
      if (driver) {
        await tx.delivery.create({
          data: {
            redistributionId: newRedistribution.id,
            driverId: driver.id,
            status: 'PENDING'
          }
        });
      } else {
         await tx.delivery.create({
          data: {
            redistributionId: newRedistribution.id,
            status: 'PENDING'
          }
        });
      }

      return newRedistribution;
    });
  }
}
