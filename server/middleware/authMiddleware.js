import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { jwtService } from '../services/auth/JwtService.js';
import { sessionService } from '../services/auth/SessionService.js';
import { customerBusinessService } from '../services/business/CustomerService.js';
import { accessTokenFrom } from '../utils/authCookies.js';
import { AUTH_ROLES } from '../config/auth.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { authorizationService } from '../services/security/AuthorizationService.js';
import { auditLogService } from '../services/security/AuditLogService.js';
import { resourceOwnershipService } from '../services/security/ResourceOwnershipService.js';

export function protectAdminRoute(request, response, next) {
  const authHeader = request.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) return next(new AppError('Admin token is required.', { status: 401, code: 'AUTHENTICATION_REQUIRED' }));

  try {
    request.admin = jwt.verify(token, env.jwtSecret);
    if (request.admin.role !== 'admin') throw new AppError('Admin role is invalid.', { status: 403, code: 'INVALID_ROLE_ACCESS' });
    next();
  } catch (error) { logger.warn('auth.admin.unauthorized', { requestId: request.id, code: error.code || 'INVALID_ADMIN_TOKEN' }); next(error instanceof AppError ? error : new AppError('Invalid or expired admin token.', { status: 401, code: 'INVALID_ADMIN_TOKEN' })); }
}

export function createAuthorizationMiddleware({ authorization = authorizationService, audit = auditLogService, ownership = resourceOwnershipService } = {}) {
  const requirePermission = (permission) => (request, response, next) => { const actor = authorization.actorFrom(request); try { authorization.requirePermission(actor, permission); audit.recordSafe({ request, actor, event: 'permission.checked', permission, resource: request.baseUrl, action: request.method, decision: 'granted' }); next(); } catch (error) { audit.recordSafe({ request, actor, event: 'permission.denied', permission, resource: request.baseUrl, action: request.method, decision: 'denied' }); next(error); } };
  const authorize = requirePermission;
  const requireRole = (...roles) => (request, response, next) => { const actor = authorization.actorFrom(request); try { authorization.requireRole(actor, roles); next(); } catch (error) { audit.recordSafe({ request, actor, event: 'role.denied', resource: request.baseUrl, action: request.method, decision: 'denied', metadata: { requiredRoles: roles.join(',') } }); next(error); } };
  const requireOwnership = (resource, idResolver = (request) => request.params.id, options = {}) => async (request, response, next) => { const actor = authorization.actorFrom(request); try { const { ownerId, row } = await ownership.owner(resource, idResolver(request)); authorization.requireOwnership(actor, ownerId, options); request.ownedResource = row; next(); } catch (error) { audit.recordSafe({ request, actor, event: 'ownership.denied', resource, action: request.method, decision: 'denied' }); next(error); } };
  const denyGuests = (request, response, next) => { const actor = authorization.actorFrom(request); return actor.role === 'guest' || !actor.id ? next(new AppError('Authenticated account access is required.', { status: 401, code: 'GUEST_ACCESS_DENIED' })) : next(); };
  return { authorize, requirePermission, requireRole, requireOwnership, denyGuests };
}
const authorizationMiddleware = createAuthorizationMiddleware();
export const { authorize, requirePermission, requireOwnership, denyGuests } = authorizationMiddleware;

export function createAuthMiddleware({ jwt = jwtService, sessions = sessionService, customers = customerBusinessService, authorization = authorizationMiddleware } = {}) {
  const authenticate = async (request, response, next) => { const token = accessTokenFrom(request); if (!token) return next(); try { const payload = jwt.verifyAccess(token); const session = await sessions.requireActive(payload.sessionId); if (session.CustomerID !== payload.customerId || session.Role !== payload.role) throw new AppError('Token does not match this session.', { status: 401, code: 'INVALID_ACCESS_TOKEN' }); const currentAgent = String(request.get?.('user-agent') || ''); const securitySignals = []; if (session.UserAgent && currentAgent && session.UserAgent !== currentAgent) securitySignals.push('user-agent-changed'); request.auth = { customerId: payload.customerId, role: payload.role, sessionId: payload.sessionId, session, securitySignals, requiresStepUp: securitySignals.length > 0 }; if (securitySignals.length) logger.warn('auth.session.risk-detected', { requestId: request.id, signals: securitySignals }); return next(); } catch (error) { logger.warn('auth.unauthorized', { requestId: request.id, code: error.code || 'INVALID_ACCESS_TOKEN' }); return next(error); } };
  const requireAuthentication = (request, response, next) => request.auth ? next() : next(new AppError('Authentication is required.', { status: 401, code: 'AUTHENTICATION_REQUIRED' }));
  const requireRole = (...roles) => authorization.requireRole(...roles);
  const requireAuthorization = (permission) => authorization.requirePermission(permission);
  const requireActiveCustomer = async (request, response, next) => { try { const row = await customers.requireActive(request.auth.customerId); request.customerRecord = row; request.customer = { id: row.CustomerID, role: row.Role || AUTH_ROLES.CUSTOMER }; next(); } catch (error) { next(error); } };
  const protectCustomerRoute = async (request, response, next) => authenticate(request, response, (error) => { if (error) return next(error); requireAuthentication(request, response, (authError) => { if (authError) return next(authError); requireActiveCustomer(request, response, next); }); });
  return { authenticate, requireAuthentication, requireRole, requireAuthorization, requireActiveCustomer, requireAdmin: requireRole(AUTH_ROLES.ADMIN), protectCustomerRoute };
}
const authCore = createAuthMiddleware();
export const { authenticate, requireAuthentication, requireRole, requireAuthorization, requireActiveCustomer, requireAdmin, protectCustomerRoute } = authCore;
