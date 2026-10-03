"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NgoService = void 0;
const client_1 = require("@prisma/client");
const ngo_repository_1 = require("../repositories/ngo.repository");
const prisma = new client_1.PrismaClient();
const ngoRepo = new ngo_repository_1.NgoRepository();
class NgoService {
    async getAvailableSurplus(user) {
        let surpluses = await ngoRepo.findAvailableSurplus();
        if (user && user.role === 'NGO_STAFF' && user.organizationId) {
            const ngo = await prisma.nGO.findFirst({ where: { organizationId: user.organizationId } });
            if (ngo && ngo.latitude && ngo.longitude) {
                // AI Matching Algorithm (Heuristic based on distance)
                surpluses = surpluses.map(surplus => {
                    let distance = 999;
                    if (surplus.kitchen?.latitude && surplus.kitchen?.longitude) {
                        distance = this.getDistanceFromLatLonInKm(ngo.latitude, ngo.longitude, surplus.kitchen.latitude, surplus.kitchen.longitude);
                    }
                    return { ...surplus, matchScore: distance };
                }).sort((a, b) => a.matchScore - b.matchScore);
            }
        }
        return surpluses;
    }
    getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    async getDashboardStats(user) {
        if (user.role !== 'NGO_STAFF') {
            throw new Error('Unauthorized');
        }
        if (!user.organizationId) {
            throw new Error('NGO not found');
        }
        const ngo = await prisma.nGO.findFirst({ where: { organizationId: user.organizationId } });
        if (!ngo)
            throw new Error('NGO not found');
        return ngoRepo.getDashboardStats(ngo.id);
    }
    async acceptSurplus(user, input) {
        if (user.role !== 'NGO_STAFF') {
            throw new Error('Unauthorized');
        }
        if (!user.organizationId) {
            throw new Error('NGO not found');
        }
        const ngo = await prisma.nGO.findFirst({ where: { organizationId: user.organizationId } });
        if (!ngo)
            throw new Error('NGO not found');
        return ngoRepo.acceptSurplusTransaction(input.surplusId, input.quantityRequested, ngo.id);
    }
}
exports.NgoService = NgoService;
//# sourceMappingURL=ngo.service.js.map