const bootstrapLog = (level, message, error) => {
  const entry = { timestamp: new Date().toISOString(), level, service: 'litepuff-bootstrap', message };
  if (error) Object.assign(entry, { error: error.message, code: error.code, stack: error.stack });
  (level === 'error' ? console.error : console.info)(JSON.stringify(entry));
};

process.on('uncaughtException', (error) => {
  bootstrapLog('error', 'process.uncaught-exception', error);
  process.exitCode = 1;
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  bootstrapLog('error', 'process.unhandled-rejection', error);
  process.exitCode = 1;
});

bootstrapLog('info', 'startup.loading-environment');

try {
  await import('./server.js');
} catch (error) {
  bootstrapLog('error', 'startup.failed', error);
  process.exitCode = 1;
}
