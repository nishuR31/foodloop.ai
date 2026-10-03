import { DeliveryRepository } from '../repositories/delivery.repository';
import { DeliveryStatusInput } from '../schemas/delivery.schema';
import { getIO } from '../socket';
import { AuditService } from './audit.service';

const deliveryRepo = new DeliveryRepository();
const auditService = new AuditService();

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; // Distance in km
  return d;
}

export class DeliveryService {
  async getDeliveries(user: any) {
    let deliveries: any[] = [];
    
    if (user.role === 'DRIVER') {
      const driver = await deliveryRepo.findDriverByUserId(user.id);
      if (!driver) throw new Error('Driver profile not found');
      deliveries = await deliveryRepo.findDeliveriesByDriverId(driver.id);
    } else if (user.role === 'NGO_STAFF') {
      deliveries = await deliveryRepo.findDeliveriesByNgoId(user.id);
    } else if (user.role === 'KITCHEN_MANAGER') {
      deliveries = await deliveryRepo.findDeliveriesByKitchenId(user.id);
    } else if (user.role === 'ADMIN') {
       deliveries = []; // Admin might need all, but returning empty for now if not implemented
    } else {
      throw new Error('Unauthorized');
    }

    return deliveries.map(d => {
      let distanceKm = 12; // Default mock
      let timeMins = 25;

      const kitchenLat = d.redistribution?.surplus?.kitchen?.latitude;
      const kitchenLng = d.redistribution?.surplus?.kitchen?.longitude;
      const ngoLat = d.redistribution?.ngo?.latitude;
      const ngoLng = d.redistribution?.ngo?.longitude;

      if (kitchenLat && kitchenLng && ngoLat && ngoLng) {
        distanceKm = Math.round(getDistanceFromLatLonInKm(kitchenLat, kitchenLng, ngoLat, ngoLng) * 10) / 10;
        timeMins = Math.round(distanceKm * 2); 
      }

      return {
        ...d,
        calculatedRoute: {
          distanceText: `${distanceKm} km`,
          durationText: `${timeMins} mins`
        }
      };
    });
  }

  async getAvailableDeliveries() {
    const deliveries = await deliveryRepo.findAvailableDeliveries();
    return deliveries.map(d => {
      let distanceKm = 12; // Default mock
      let timeMins = 25;

      const kitchenLat = d.redistribution?.surplus?.kitchen?.latitude;
      const kitchenLng = d.redistribution?.surplus?.kitchen?.longitude;
      const ngoLat = d.redistribution?.ngo?.latitude;
      const ngoLng = d.redistribution?.ngo?.longitude;

      if (kitchenLat && kitchenLng && ngoLat && ngoLng) {
        distanceKm = Math.round(getDistanceFromLatLonInKm(kitchenLat, kitchenLng, ngoLat, ngoLng) * 10) / 10;
        timeMins = Math.round(distanceKm * 2); 
      }

      return {
        ...d,
        calculatedRoute: {
          distanceText: `${distanceKm} km`,
          durationText: `${timeMins} mins`
        }
      };
    });
  }

  async claimDelivery(deliveryId: string, user: any) {
    if (user.role !== 'DRIVER') throw new Error('Unauthorized');
    const driver = await deliveryRepo.findDriverByUserId(user.id);
    if (!driver) throw new Error('Driver profile not found');
    
    const result = await deliveryRepo.claimDelivery(deliveryId, driver.id);

    await auditService.logAction({
      entityId: deliveryId,
      entityType: 'DELIVERY',
      action: 'CLAIMED',
      actorId: user.id,
      details: { driverId: driver.id }
    });

    const io = getIO();
    if (io) {
      io.emit('delivery_updated', { deliveryId, status: 'ASSIGNED' });
    }
    
    return result;
  }

  async updateDeliveryStatus(deliveryId: string, input: DeliveryStatusInput) {
    const result = await deliveryRepo.updateDeliveryStatusTransaction(deliveryId, input.status);
    
    await auditService.logAction({
      entityId: deliveryId,
      entityType: 'DELIVERY',
      action: 'UPDATE_STATUS',
      actorId: 'driver', // could pass user.id if available
      details: { status: input.status }
    });

    const io = getIO();
    if (io) {
      io.emit('delivery_updated', { deliveryId, status: input.status });
      io.to('role_ADMIN').emit('notification', { 
        title: 'Logistics Update', 
        message: `Delivery ${deliveryId.substring(0, 8)} status changed to ${input.status}` 
      });
      io.to('role_NGO_STAFF').emit('notification', { 
        title: 'Delivery Update', 
        message: `Your incoming delivery status changed to ${input.status}` 
      });
    }
    
    return result;
  }
}
