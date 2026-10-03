import { FastifyInstance } from 'fastify';
import { NgoController } from '../controllers/ngo.controller';

const ngoController = new NgoController();

export default async function ngoRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', async (request, reply) => {
    console.log('COOKIES RECEIVED:', request.cookies);
    try { 
      await request.jwtVerify({ onlyCookie: true }); 
    } catch (err) { 
      console.error('JWT VERIFY ERROR:', err);
      reply.send(err); 
    }
  });

  fastify.get('/available-surplus', ngoController.getAvailableSurplus.bind(ngoController));
  fastify.get('/dashboard-stats', ngoController.getDashboardStats.bind(ngoController));
  fastify.post('/accept-surplus', ngoController.acceptSurplus.bind(ngoController));
}
