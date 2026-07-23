import { notificationService } from '../services/NotificationService.js';
import { ok } from '../utils/apiResponse.js';

export async function listNotifications(request, response) {
  ok(response, await notificationService.list(request.customer.id, request.query), 'Notifications loaded.');
}

export async function readNotification(request, response) {
  ok(response, { notification: await notificationService.markRead(request.customer.id, request.params.id) }, 'Notification marked as read.');
}

export async function readAllNotifications(request, response) {
  ok(response, { updated: await notificationService.markAllRead(request.customer.id) }, 'Notifications marked as read.');
}
