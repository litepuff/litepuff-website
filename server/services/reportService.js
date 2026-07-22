import ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
import { getRows } from './googleSheets.js';

const ALLOWED_REPORTS = {
  orders: 'ORDERS',
  customers: 'CUSTOMERS',
  products: 'PRODUCTS',
  reviews: 'REVIEWS',
  newsletter: 'NEWSLETTER',
  support: 'CONTACT_MESSAGES',
  revenue: 'ORDERS'
};

function filterByDate(rows, from, to) {
  if (!from && !to) return rows;
  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;
  return rows.filter((row) => {
    const value = row.CreatedAt || row.OrderDate || row.SubscribedAt || row.PublishedDate || '';
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return true;
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });
}

export async function reportRows(type, query = {}) {
  const sheet = ALLOWED_REPORTS[type];
  if (!sheet) {
    const error = new Error('Unknown report type.');
    error.status = 400;
    throw error;
  }
  const rows = filterByDate(await getRows(sheet), query.from, query.to);
  if (type !== 'revenue') return rows.map(({ _row, ...row }) => row);
  return rows.map((row) => ({
    OrderID: row.OrderID,
    OrderNumber: row.OrderNumber,
    CreatedAt: row.CreatedAt,
    Subtotal: row.Subtotal,
    ProductDiscount: row.ProductDiscount,
    FirstOrderDiscount: row.FirstOrderDiscount,
    CouponDiscount: row.CouponDiscount,
    Discount: row.Discount,
    Shipping: row.Shipping,
    Tax: row.Tax,
    GrandTotal: row.GrandTotal,
    PaymentStatus: row.PaymentStatus,
    OrderStatus: row.OrderStatus
  }));
}

export async function csvReport(type, query) {
  const rows = await reportRows(type, query);
  return new Parser().parse(rows);
}

export async function excelReport(type, query) {
  const rows = await reportRows(type, query);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(type);
  const columns = Object.keys(rows[0] || { Empty: '' });
  worksheet.columns = columns.map((key) => ({ header: key, key, width: 22 }));
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
}
