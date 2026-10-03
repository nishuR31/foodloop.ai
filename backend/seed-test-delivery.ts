import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const surplus = await prisma.surplus.findFirst();
  const ngo = await prisma.nGO.findFirst();
  if (surplus && ngo) {
    const redis = await prisma.redistribution.create({
      data: {
        surplusId: surplus.id,
        ngoId: ngo.id,
        quantityMatched: 5,
        status: "MATCHED"
      }
    });
    await prisma.delivery.create({
      data: {
        redistributionId: redis.id,
        status: "PENDING",
      }
    });
    console.log("Created test delivery!");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
