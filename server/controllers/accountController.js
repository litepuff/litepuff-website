import { accountService } from '../services/account/AccountService.js';
import { clearAuthCookies, setAuthCookies } from '../utils/authCookies.js';
import { ok } from '../utils/apiResponse.js';

const metadata = (request) => ({ userAgent: request.get('user-agent') || '', ipAddress: request.ip || '', trusted: true });
export async function getAccountProfile(request, response) { ok(response, { profile: await accountService.profile(request.auth.customerId) }, 'Profile loaded.'); }
export async function updateAccountProfile(request, response) { ok(response, { profile: await accountService.updateProfile(request.auth.customerId, request.body) }, 'Profile updated.'); }
export async function changeEmail(request, response) { const result = await accountService.changeEmail(request.auth.customerId, request.body, request.auth.sessionId); ok(response, result, result.verified ? 'Email changed.' : 'Verification code sent.'); }
export async function changePhone(request, response) { const result = await accountService.changePhone(request.auth.customerId, request.body, request.auth.sessionId); ok(response, result, result.verified ? 'Phone changed.' : 'Verification code sent.'); }
export async function recoverAccount(request, response) { const result = await accountService.recover(request.body, metadata(request)); if (result.tokens) setAuthCookies(response, result.tokens); const { tokens, ...data } = result; ok(response, data, result.recovered ? 'Account recovered.' : 'Recovery code sent.'); }
export async function deleteAccount(request, response) { const result = await accountService.deleteAccount(request.auth.customerId, request.body?.reason); clearAuthCookies(response); ok(response, result, 'Account deleted.'); }
export async function listSessions(request, response) { ok(response, { sessions: await accountService.sessionsFor(request.auth.customerId, request.auth.sessionId) }, 'Active sessions loaded.'); }
export async function logoutDevice(request, response) { await accountService.logoutDevice(request.auth.customerId, request.body?.sessionId); const current = request.body?.sessionId === request.auth.sessionId; if (current) clearAuthCookies(response); ok(response, { currentSessionTerminated: current }, 'Device signed out.'); }
export async function logoutAllDevices(request, response) { const count = await accountService.logoutAll(request.auth.customerId); clearAuthCookies(response); ok(response, { terminatedSessions: count }, 'Signed out from all devices.'); }
