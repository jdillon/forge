// Simulates the INSTALLED version of the logger
const instanceId = 'INSTALLED-' + Math.random().toString(36).substring(7);

export const log = {
  info: (msg: string) => console.log(`[INSTALLED LOG ${instanceId}] ${msg}`),
  debug: (msg: string) => console.log(`[INSTALLED DEBUG ${instanceId}] ${msg}`),
  error: (msg: string) => console.error(`[INSTALLED ERROR ${instanceId}] ${msg}`),
  instanceId,
};

console.log(`INSTALLED Logger instance created: ${instanceId}`);
