/**
 * Lightweight structured logger for PAMS.
 * Levels: error, warn, info, debug. Debug is suppressed in production.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function currentLevel() {
  if (process.env.LOG_LEVEL) {
    return LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;
  }
  return process.env.NODE_ENV === 'production' ? LEVELS.warn : LEVELS.info;
}

function log(level, message, meta) {
  if (LEVELS[level] > currentLevel()) return;

  const entry = {
    level,
    time: new Date().toISOString(),
    msg: message,
  };

  if (meta !== undefined) {
    if (meta instanceof Error) {
      entry.err = { name: meta.name, message: meta.message };
      if (process.env.NODE_ENV !== 'production') {
        entry.err.stack = meta.stack;
      }
    } else if (typeof meta === 'object' && meta !== null) {
      Object.assign(entry, meta);
    } else {
      entry.meta = meta;
    }
  }

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

module.exports = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
