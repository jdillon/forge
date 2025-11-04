// Mock logger to prove resolution worked
export const LOGGER_ID = 'MOCK_FORGE_LOGGER_VIA_TSCONFIG';

export function createLogger(name: string) {
  return {
    id: LOGGER_ID,
    name,
    info: (msg: string) => console.log(`[${name}] ${msg}`),
  };
}
