import { orderReconciliationService } from '../server/services/orderReconciliationService.js';

const args = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/, '').split('=');
  return [key, rest.length ? rest.join('=') : true];
}));

try {
  const report = await orderReconciliationService.run({
    paymentId: typeof args['payment-id'] === 'string' ? args['payment-id'] : '',
    razorpayOrderId: typeof args['razorpay-order-id'] === 'string' ? args['razorpay-order-id'] : '',
    dryRun: Boolean(args['dry-run']),
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.results.some((result) => result.error)) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ error: error.message, code: error.code || 'RECONCILIATION_FAILED' }, null, 2));
  process.exitCode = 1;
}
