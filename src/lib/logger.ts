/* src/lib/logger.ts */

const isDev = import.meta.env.DEV;

export const debug = (...args: any[]) => {
  if (isDev) {
    console.debug('[DEBUG]', ...args);
  }
};

export const info = (...args: any[]) => {
  console.info('[INFO]', ...args);
};

export const warn = (...args: any[]) => {
  console.warn('[WARN]', ...args);
};

export const error = (...args: any[]) => {
  console.error('[ERROR]', ...args);
}; 