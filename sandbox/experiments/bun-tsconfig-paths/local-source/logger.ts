// Simulates the LOCAL source version (should NOT be used)
const instanceId = 'LOCAL-' + Math.random().toString(36).substring(7);

export const log = {
  info: (msg: string) => console.log(`[LOCAL LOG ${instanceId}] ${msg}`),
  instanceId,
};

console.log(`LOCAL Logger instance created: ${instanceId}`);
