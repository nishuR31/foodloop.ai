import { PrismaClient } from '@prisma/client';
import { NgoRepository } from '../repositories/ngo.repository';
import { AcceptSurplusInput } from '../schemas/ngo.schema';

const prisma = new PrismaClient();
const ngoRepo = new NgoRepository();

export class NgoService {
  async getAvailableSurplus(user?: any) {
    let surpluses = await ngoRepo.findAvailableSurplus();
    
    if (user && user.role === 'NGO_STAFF' && user.organizationId) {
      const ngo = await prisma.nGO.findFirst({ where: { organizationId: user.organizationId } });
      if (ngo && ngo.latitude && ngo.longitude) {
        // AI Matching Algorithm (Heuristic based on distance)
        surpluses = surpluses.map(surplus => {
          let distance = 999;
          if (surplus.kitchen?.latitude && surplus.kitchen?.longitude) {
            distance = this.getDistanceFromLatLonInKm(
              ngo.latitude!, ngo.longitude!,
              surplus.kitchen.latitude, surplus.kitchen.longitude
            );
          }
          return { ...surplus, matchScore: distance };
        }).sort((a: any, b: any) => a.matchScore - b.matchScore);
      }
    }
    return surpluses;
  }

  private getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c; 
  }

  async getDashboardStats(user: any) {
    if (user.role !== 'NGO_STAFF') {
      throw new Error('Unauthorized');
    }

    if (!user.organizationId) {
      throw new Error('NGO not found');
    }

    const ngo = await prisma.nGO.findFirst({ where: { organizationId: user.organizationId }});
    if (!ngo) throw new Error('NGO not found');

    return ngoRepo.getDashboardStats(ngo.id);
  }

  async acceptSurplus(user: any, input: AcceptSurplusInput) {
    if (user.role !== 'NGO_STAFF') {
      throw new Error('Unauthorized');
    }

    if (!user.organizationId) {
      throw new Error('NGO not found');
    }

    const ngo = await prisma.nGO.findFirst({ where: { organizationId: user.organizationId }});
    if (!ngo) throw new Error('NGO not found');

    return ngoRepo.acceptSurplusTransaction(input.surplusId, input.quantityRequested, ngo.id);
  }
}
