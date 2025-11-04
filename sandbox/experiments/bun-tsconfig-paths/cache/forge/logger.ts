// Simulates the CACHED version of forge (from git clone)
const instanceId = 'CACHED-' + Math.random().toString(36).substring(7);

export const log = {
  info: (msg: string) => console.log(`[CACHED LOG ${instanceId}] ${msg}`),
  instanceId,
};

console.log(`CACHED Logger instance created: ${instanceId}`);
