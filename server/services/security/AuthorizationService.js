import { AUTH_ROLES, PERMISSIONS, ROLE_ALIASES, ROLE_PERMISSIONS } from '../../config/auth.js';
import { AppError } from '../../utils/AppError.js';

export class AuthorizationService {
  constructor({ roles = ROLE_PERMISSIONS, permissions = PERMISSIONS, aliases = ROLE_ALIASES } = {}) { this.roles = roles; this.permissionRegistry = new Set(Object.values(permissions)); this.aliases = aliases; }
  normalizeRole(role) { const normalized = String(role || '').trim().toLowerCase(); return this.aliases[normalized] || normalized; }
  validateRole(role) { const normalized = this.normalizeRole(role); if (!this.roles[normalized]) throw new AppError('Role is invalid.', { status: 422, code: 'INVALID_ROLE' }); return normalized; }
  validatePermission(permission) { if (!this.permissionRegistry.has(permission)) throw new AppError('Permission is invalid.', { status: 500, code: 'INVALID_PERMISSION' }); return permission; }
  permissionsFor(role) { return this.roles[this.validateRole(role)] || []; }
  hasPermission(role, permission) { this.validatePermission(permission); const permissions = this.permissionsFor(role); return permissions.includes('*') || permissions.includes(permission); }
  actorFrom(request) { if (request.auth) return { id: request.auth.customerId, role: this.normalizeRole(request.auth.role), type: 'customer' }; if (request.admin) return { id: request.admin.id || 'admin', role: this.normalizeRole(request.admin.adminRole || AUTH_ROLES.ADMIN), type: 'admin' }; return { id: '', role: 'guest', type: 'guest' }; }
  decide(actor, permission) { if (!actor?.id || actor.role === 'guest') return { allowed: false, reason: 'unauthenticated' }; return { allowed: this.hasPermission(actor.role, permission), reason: this.hasPermission(actor.role, permission) ? 'granted' : 'missing-permission' }; }
  requirePermission(actor, permission) { const decision = this.decide(actor, permission); if (!decision.allowed) throw new AppError('Required permission is missing.', { status: actor?.id ? 403 : 401, code: actor?.id ? 'MISSING_PERMISSION' : 'AUTHENTICATION_REQUIRED', details: actor?.id ? { permission } : {} }); return true; }
  requireRole(actor, roles) { const allowed = roles.map((role) => this.validateRole(role)); if (!actor?.id) throw new AppError('Authentication is required.', { status: 401, code: 'AUTHENTICATION_REQUIRED' }); if (!allowed.includes(this.normalizeRole(actor.role))) throw new AppError('Role is not authorized.', { status: 403, code: 'INVALID_ROLE_ACCESS' }); return true; }
  requireOwnership(actor, ownerId, { bypassPermission } = {}) { if (!actor?.id) throw new AppError('Authentication is required.', { status: 401, code: 'AUTHENTICATION_REQUIRED' }); if (String(actor.id) === String(ownerId)) return true; if (bypassPermission && this.hasPermission(actor.role, bypassPermission)) return true; throw new AppError('Resource ownership is required.', { status: 403, code: 'OWNERSHIP_REQUIRED' }); }
}
export const authorizationService = new AuthorizationService();
