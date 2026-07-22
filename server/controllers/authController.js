import { customerBusinessService } from '../services/business/CustomerService.js';
import { clearAuthCookies, refreshTokenFrom, setAuthCookies } from '../utils/authCookies.js';
import { ok } from '../utils/apiResponse.js';
import { authService } from '../services/auth/AuthService.js';

export async function getMe(request, response) { ok(response, { customer: customerBusinessService.publicIdentity(request.customerRecord) }, 'Authenticated customer loaded.'); }
export async function getSession(request, response) { ok(response, { session: authService.sessions.publicSession(request.auth.session) }, 'Session loaded.'); }
export async function refresh(request, response) {
  const token = refreshTokenFrom(request);
  try {
    const tokens = await authService.refresh(token);
    setAuthCookies(response, tokens);
    ok(response, { session: { id: tokens.sessionId, expiresAt: tokens.expiresAt } }, 'Session refreshed.');
  } catch (error) {
    clearAuthCookies(response);
    throw error;
  }
}
export async function logout(request, response) {
  await authService.logout({ sessionId: request.auth?.sessionId, refreshToken: refreshTokenFrom(request) }); clearAuthCookies(response); ok(response, {}, 'Signed out.');
}
export async function logoutAll(request, response) { const count = await authService.logoutAll(request.auth.customerId); clearAuthCookies(response); ok(response, { terminatedSessions: count }, 'Signed out from all devices.'); }
const metadata = (request) => ({ userAgent: request.get('user-agent') || '', ipAddress: request.ip || '' });
export async function sendEmailOtp(request, response) { const result = await authService.requestEmailOtp(request.body); ok(response, result, 'Verification code sent.'); }
export async function signupEmail(request, response) { const result = await authService.signup(request.body); ok(response, result, 'Verification code sent.'); }
export async function loginEmail(request, response) { const result = await authService.login(request.body); ok(response, result, 'Verification code sent.'); }
export async function resendEmailOtp(request, response) { const result = await authService.resendEmailOtp(request.body); ok(response, result, 'Verification code resent.'); }
export async function verifyEmailOtp(request, response) { const result = await authService.verifyEmailOtp(request.body, metadata(request)); setAuthCookies(response, result.tokens); ok(response, { customer: result.customer, session: result.session }, 'Email verified and signed in.'); }
export async function sendWhatsAppOtp(request, response) { const result = await authService.requestWhatsAppOtp(request.body); ok(response, result, 'Verification code sent.'); }
export async function signupWhatsApp(request, response) { const result = await authService.signupWhatsApp(request.body); ok(response, result, 'Verification code sent.'); }
export async function loginWhatsApp(request, response) { const result = await authService.loginWhatsApp(request.body); ok(response, result, 'Verification code sent.'); }
export async function resendWhatsAppOtp(request, response) { const result = await authService.resendWhatsAppOtp(request.body); ok(response, result, 'Verification code resent.'); }
export async function verifyWhatsAppOtp(request, response) { const result = await authService.verifyWhatsAppOtp(request.body, metadata(request)); setAuthCookies(response, result.tokens); ok(response, { customer: result.customer, session: result.session }, 'Phone verified and signed in.'); }
