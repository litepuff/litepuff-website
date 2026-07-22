import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { getRows } from './googleSheets.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const invoiceDir = path.join(__dirname, '..', 'invoices');
const logoPath = path.join(__dirname, '..', '..', 'src', 'assets', 'images', 'logo.png');

fs.mkdirSync(invoiceDir, { recursive: true });

const rupee = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

export async function getInvoiceData(orderId) {
  const [orders, items, customers, addresses, payments] = await Promise.all([
    getRows('ORDERS'),
    getRows('ORDER_ITEMS'),
    getRows('CUSTOMERS'),
    getRows('ADDRESSES'),
    getRows('PAYMENTS')
  ]);
  const order = orders.find((row) => row.OrderID === orderId || row.OrderNumber === orderId);
  if (!order) {
    const error = new Error('Order not found.');
    error.status = 404;
    throw error;
  }
  return {
    order,
    items: items.filter((row) => row.OrderID === order.OrderID),
    customer: customers.find((row) => row.CustomerID === order.CustomerID) || {},
    address: addresses.find((row) => row.AddressID === order.AddressID) || {},
    payment: payments.find((row) => row.OrderID === order.OrderID) || {}
  };
}

export async function generateInvoice(orderId) {
  const { order, items, customer, address, payment } = await getInvoiceData(orderId);
  const fileName = `invoice-${order.OrderNumber || order.OrderID}.pdf`;
  const filePath = path.join(invoiceDir, fileName);

  if (fs.existsSync(filePath)) return { filePath, fileName, order };

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    if (fs.existsSync(logoPath)) doc.image(logoPath, 48, 38, { fit: [92, 54] });
    doc.fontSize(24).fillColor('#1E4D3A').text('LitePuff', 155, 48, { continued: true }).fontSize(10).fillColor('#53635c').text('  Premium roasted snacks');
    doc.moveDown();
    doc.fontSize(18).fillColor('#0f2b21').text('Tax Invoice');
    doc.fontSize(10).fillColor('#53635c').text(`Invoice Number: INV-${order.OrderNumber || order.OrderID}`);
    doc.text(`Order Number: ${order.OrderNumber}`);
    doc.text(`Internal Tracking ID: ${order.TrackingNumber}`);
    doc.text(`Order Date: ${String(order.CreatedAt || '').slice(0, 10)}`);
    doc.text(`Invoice Date: ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown();

    doc.fillColor('#0f2b21').fontSize(12).text('Company Details');
    doc.fillColor('#53635c').fontSize(10).text(env.businessAddress || env.companyName);
    if (env.gstNumber) doc.text(`GSTIN: ${env.gstNumber}`);
    doc.text(`Email: ${env.supportEmail} | Phone: ${env.supportPhone}`);
    doc.moveDown();

    doc.fillColor('#0f2b21').fontSize(12).text('Customer & Shipping');
    doc.fillColor('#53635c').fontSize(10).text(`${customer.FirstName || ''} ${customer.LastName || ''}`.trim() || address.FullName || 'Customer');
    doc.text(customer.Email || '');
    doc.text([address.AddressLine1, address.AddressLine2, address.Landmark, address.City, address.State, address.Pincode, address.Country].filter(Boolean).join(', '));
    doc.moveDown();

    doc.fillColor('#0f2b21').fontSize(12).text('Products');
    doc.moveDown(0.4);
    items.forEach((item) => {
      doc.fillColor('#53635c').fontSize(10).text(`${item.ProductName}  x ${item.Quantity}`, { continued: true }).text(rupee(item.Total), { align: 'right' });
    });
    doc.moveDown();
    [['Subtotal', order.Subtotal], [`Coupon${order.CouponCode ? ` (${order.CouponCode})` : ''}`, order.Discount], ['Shipping', order.Shipping], ['Tax', order.Tax], ['Grand Total', order.GrandTotal]].forEach(([label, value]) => {
      doc.fillColor(label === 'Grand Total' ? '#1E4D3A' : '#53635c').fontSize(label === 'Grand Total' ? 13 : 10).text(label, { continued: true }).text(rupee(value), { align: 'right' });
    });
    doc.moveDown();
    doc.fillColor('#53635c').fontSize(10).text(`Payment Method: ${order.PaymentMethod || payment.PaymentMethod}`);
    doc.text(`Payment Status: ${order.PaymentStatus || payment.Status}`);
    doc.text(`Transaction ID: ${payment.TransactionReference || payment.RazorpayPaymentID || 'N/A'}`);
    doc.text(`Gateway: ${payment.Gateway || 'Razorpay'}`);
    doc.text(`Status: ${payment.Status || order.PaymentStatus || 'Paid'}`);
    doc.moveDown();
    doc.fillColor('#1E4D3A').fontSize(12).text('Thank you for choosing LitePuff.');
    doc.fillColor('#53635c').fontSize(9).text('This is a computer-generated invoice.');
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filePath, fileName, order };
}
