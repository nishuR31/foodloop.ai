import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import split from 'split2';

import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import routes from './routes';
import authPlugin from './plugins/auth';
import { setupSocket, getIO } from './socket';

const logStream = split((line: string) => {
  try {
    const logObj = JSON.parse(line);
    const msg = `[${new Date(logObj.time || Date.now()).toISOString()}] ${logObj.level >= 40 ? 'ERROR' : 'INFO'}: ${logObj.msg || ''}`;
    const io = getIO();
    if (io) {
      io.emit('syslog', msg);
    }
    process.stdout.write(line + '\n');
  } catch (e) {
    process.stdout.write(line + '\n');
  }
});

const server = fastify({ logger: { stream: logStream, level: 'info' }, bodyLimit: 15 * 1024 * 1024 });
const prisma = new PrismaClient();

server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

server.register(helmet, { global: true, contentSecurityPolicy: false });

server.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];
    if (allowed.includes(origin) || origin.startsWith('http://localhost:') || origin.endsWith('.vercel.app')) {
      return cb(null, true);
    }
    cb(null, false);
  },
  credentials: true
});

server.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'my-cookie-secret',
  hook: 'onRequest'
});

server.register(compress, { global: true });

server.register(multipart, {
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  }
});

server.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'FoodLoop AI API Documentation',
      description: 'OpenAPI documentation for FoodLoop AI Backend endpoints',
      version: '1.0.0'
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Local Backend Server' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  }
});

server.register(fastifySwaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  }
});

server.get('/swagger', async (request, reply) => {
  return reply.redirect('/docs');
});

server.addHook('onSend', (request, reply, payload, done) => {
  if (request.method === 'GET' && !request.url.startsWith('/documentation')) {
    reply.header('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=59');
  }
  done();
});

server.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecret',
  cookie: {
    cookieName: 'accessToken',
    signed: false
  }
});

server.register(authPlugin);

server.register(routes, { prefix: '/api' });

// Health check routes
server.get('/', async (request, reply) => {
  return { status: 'ok', service: 'FoodLoop Backend API', timestamp: new Date() };
});

server.get('/ping', async (request, reply) => {
  return { ping: 'pong', timestamp: new Date() };
});

server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date() };
});

server.get('/api/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date() };
});

// Global error handler
server.setErrorHandler((error: any, request, reply) => {
  server.log.error(error);

  if (error instanceof z.ZodError) {
    return reply.status(400).send({
      success: false,
      message: 'Validation Error',
      errors: error.issues
    });
  }

  if (error.validation) {
    return reply.status(400).send({
      success: false,
      message: 'Validation Error',
      errors: error.validation
    });
  }

  let statusCode = error.statusCode || 500;
  if (!error.statusCode) {
    const msg = error.message || '';
    if (msg.includes('Invalid credentials') || msg.includes('Unauthorized') || msg.includes('expired token')) statusCode = 401;
    else if (msg.includes('Forbidden')) statusCode = 403;
    else if (msg.includes('not found') || msg.includes('Not found')) statusCode = 404;
    else if (msg.includes('already exists')) statusCode = 409;
    else if (msg.includes('Validation')) statusCode = 400;
  }

  reply.status(statusCode).send({
    success: false,
    error: { message: statusCode === 500 ? 'Internal Server Error' : error.message },
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

const start = async () => {
  try {
    setupSocket(server);
    await server.ready();
    await server.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' });
    server.log.info(`Server running on port ${process.env.PORT || 3001}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
