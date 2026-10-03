import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.schema';

const authService = new AuthService();
const auditService = new AuditService();

export class AuthController {
  
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body);
      const user = await authService.registerUser(data);
      
      await auditService.logAction({
        entityId: user.id,
        entityType: 'USER',
        action: 'REGISTER',
        actorId: user.id,
        details: { email: user.email, role: user.role }
      });

      const fastify = request.server;
      const accessToken = fastify.jwt.sign({ id: user.id, role: user.role, organizationId: user.organizationId }, { expiresIn: '15m' });
      const refreshToken = await authService.createRefreshToken(user.id);
      
      const isProd = process.env.NODE_ENV === 'production';
      const cookieOpts = {
        path: '/',
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? ('none' as const) : ('lax' as const),
      };

      reply.setCookie('accessToken', accessToken, {
        ...cookieOpts,
        maxAge: 15 * 60,
      });
      reply.setCookie('refreshToken', refreshToken, {
        ...cookieOpts,
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.status(201).send({
        success: true,
        data: { user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId } }
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { message: err.message || 'Registration failed' }
      });
    }
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, password } = loginSchema.parse(request.body);
      const user = await authService.validateUser(email, password);

      await auditService.logAction({
        entityId: user.id,
        entityType: 'USER',
        action: 'LOGIN',
        actorId: user.id,
        details: { email: user.email }
      });

      const fastify = request.server;
      const accessToken = fastify.jwt.sign({ id: user.id, role: user.role, organizationId: user.organizationId }, { expiresIn: '15m' });
      const refreshToken = await authService.createRefreshToken(user.id);

      const isProd = process.env.NODE_ENV === 'production';
      const cookieOpts = {
        path: '/',
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? ('none' as const) : ('lax' as const),
      };

      reply.setCookie('accessToken', accessToken, {
        ...cookieOpts,
        maxAge: 15 * 60,
      });
      reply.setCookie('refreshToken', refreshToken, {
        ...cookieOpts,
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.send({
        success: true,
        data: { user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId } }
      });
    } catch (err: any) {
      return reply.status(401).send({
        success: false,
        error: { message: err.message || 'Invalid credentials' }
      });
    }
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
      const err = new Error('No refresh token');
      (err as any).statusCode = 401;
      throw err;
    }

    const user = await authService.refreshTokens(refreshToken);
    const fastify = request.server;
    const accessToken = fastify.jwt.sign({ id: user.id, role: user.role, organizationId: user.organizationId }, { expiresIn: '15m' });
    
    const isProd = process.env.NODE_ENV === 'production';
    reply.setCookie('accessToken', accessToken, {
      path: '/',
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 15 * 60,
    });

    return reply.send({ success: true, message: 'Token refreshed' });
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = request.cookies.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    reply.clearCookie('accessToken', { path: '/' });
    reply.clearCookie('refreshToken', { path: '/' });
    return reply.send({ success: true, message: 'Logged out' });
  }

  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    const { email } = forgotPasswordSchema.parse(request.body);
    await authService.forgotPassword(email);
    return reply.send({ success: true, message: 'If email exists, reset link sent' });
  }

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    const { token, newPassword } = resetPasswordSchema.parse(request.body);
    await authService.resetPassword(token, newPassword);
    return reply.send({ success: true, message: 'Password updated' });
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as any;
    const user = await authService.getUserById(userPayload.id);
    return reply.send({ success: true, data: user });
  }
}
