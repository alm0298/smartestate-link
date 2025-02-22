/* supabase/functions/logger.ts */

export const debug = (...args: any[]) => {
  console.debug('[DEBUG]', ...args);
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