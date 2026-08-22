import fs from 'fs';
import { ok, created } from '../utils/apiResponse.js';
import { getRows } from '../services/googleSheets.js';
import { generateInvoice, getInvoiceData } from '../services/invoiceService.js';
import { createShipment, fetchLiveTracking } from '../services/shippingService.js';
import { csvReport, excelReport } from '../services/reportService.js';
import { backupPath, createBackup, listBackups } from '../services/backupService.js';
import { logAdminAction } from '../services/activityLogService.js';

function canAccessOrder(request, order) {
  return request.admin || order.CustomerID === request.customer?.id;
}

export async function downloadInvoice(request, response) {
  const invoiceData = await getInvoiceData(request.params.id);
  if (!canAccessOrder(request, invoiceData.order)) return response.status(403).json({ success: false, message: 'You cannot access this invoice.' });
  const { filePath, fileName } = await generateInvoice(request.params.id, invoiceData);
  response.download(filePath, fileName);
}

export function refundPlaceholder(request, response) {
  response.status(501).json({
    success: false,
    code: 'REFUND_NOT_IMPLEMENTED',
    message: 'Online refund initiation is not configured. Review the order and process any approved refund through the payment provider before updating its status.'
  });
}

export async function getAdminPaymentController(request, response) {
  const payment = (await getRows('PAYMENTS')).find((row) => row.PaymentID === request.params.id || row.OrderID === request.params.id || row.RazorpayPaymentID === request.params.id);
  if (!payment) return response.status(404).json({ success: false, message: 'Payment not found.' });
  const { RazorpaySignature, Remarks, _row, ...safePayment } = payment;
  ok(response, { payment: safePayment });
}

export async function createShipmentController(request, response) {
  const order = (await getRows('ORDERS')).find((row) => row.OrderID === request.params.orderId || row.OrderNumber === request.params.orderId);
  if (!order) return response.status(404).json({ success: false, message: 'Order not found.' });
  const shipment = await createShipment(order);
  await logAdminAction(request, 'Ready for Dispatch', 'Orders', { orderId: order.OrderID, trackingId: shipment.trackingId });
  created(response, { shipment }, 'Order marked ready for manual dispatch.');
}

export async function liveTrackingController(request, response) {
  ok(response, await fetchLiveTracking(request.params.orderId, request.customer.id), 'Tracking loaded.');
}

export async function exportReportController(request, response) {
  const type = request.params.type;
  const format = request.query.format || 'csv';
  if (format === 'xlsx') {
    const buffer = await excelReport(type, request.query);
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', `attachment; filename="${type}-report.xlsx"`);
    return response.send(Buffer.from(buffer));
  }
  const csv = await csvReport(type, request.query);
  response.setHeader('Content-Type', 'text/csv');
  response.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
  response.send(csv);
}

export async function backupController(request, response) {
  const backup = await createBackup(request.admin?.email);
  await logAdminAction(request, 'Backup Created', 'Backups', backup);
  created(response, { backup }, 'Backup created.');
}

export async function listBackupsController(request, response) {
  ok(response, { backups: await listBackups() });
}

export async function downloadBackupController(request, response) {
  const fileName = request.params.fileName;
  const filePath = backupPath(fileName);
  if (!fs.existsSync(filePath)) return response.status(404).json({ success: false, message: 'Backup not found.' });
  response.download(filePath, fileName);
}

export function restoreBackupController(request, response) {
  ok(response, { status: 'manual_review' }, 'Restore is intentionally gated for safety. Download the backup and confirm restore separately before overwriting Google Sheets.');
}
