import fp from 'fastify-plugin';
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';

declare module 'fastify' {
  export interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRoles: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify({ onlyCookie: true });
    } catch (err) {
      reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
  });

  fastify.decorate('requireRoles', (roles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify({ onlyCookie: true });
        const user: any = request.user;
        if (!roles.includes(user.role)) {
          reply.status(403).send({ success: false, error: { message: 'Forbidden: Insufficient role' } });
          return;
        }
      } catch (err) {
        reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
      }
    };
  });
});
