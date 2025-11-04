// Simulates forge's logger module
const instanceId = Math.random().toString(36).substring(7);

export const log = {
  info: (msg: string) => console.log(`[LOG ${instanceId}] ${msg}`),
  debug: (msg: string) => console.log(`[DEBUG ${instanceId}] ${msg}`),
  error: (msg: string) => console.error(`[ERROR ${instanceId}] ${msg}`),
  instanceId,
};

console.log(`Logger instance created: ${instanceId}`);
