import { authorizationService } from './security/AuthorizationService.js';
import { auditLogService } from './security/AuditLogService.js';

export async function logAdminAction(request, action, module, metadata = {}) { return auditLogService.record({ request, actor: authorizationService.actorFrom(request), event: 'admin.action', resource: module, action, decision: 'completed', metadata }); }
export function activityLogger(action, module, metadataFactory = () => ({})) { return (request, response, next) => { response.on('finish', () => { if (response.statusCode < 400) logAdminAction(request, action, module, metadataFactory(request)).catch(() => {}); }); next(); }; }
export function auditEvent(event, resource, action = '') { return (request, response, next) => { response.on('finish', () => { if (response.statusCode < 400) auditLogService.recordSafe({ request, actor: authorizationService.actorFrom(request), event, resource, action: action || request.method, decision: 'completed' }); }); next(); }; }
