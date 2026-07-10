const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = levels[LOG_LEVEL as keyof typeof levels] || 1;

export const logger = {
  debug: (message: string, data?: unknown) => {
    if (currentLevel <= levels.debug) {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  info: (message: string, data?: unknown) => {
    if (currentLevel <= levels.info) {
      console.log(`[INFO] ${message}`, data);
    }
  },
  warn: (message: string, data?: unknown) => {
    if (currentLevel <= levels.warn) {
      console.warn(`[WARN] ${message}`, data);
    }
  },
  error: (message: string, data?: unknown) => {
    if (currentLevel <= levels.error) {
      console.error(`[ERROR] ${message}`, data);
    }
  },
};
