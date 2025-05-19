/**
 * 简化版日志记录器
 * 不依赖Winston或其他库，减少依赖问题
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1, 
  info: 2,
  debug: 3
};

/**
 * 获取当前时间戳
 * @returns {string} 格式化的时间戳
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString();
}

/**
 * 创建一个命名的日志记录器
 * @param {string} namespace 日志命名空间
 * @returns {object} 日志实例
 */
export function createLogger(namespace) {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const currentLevelValue = LOG_LEVELS[logLevel.toLowerCase()] || LOG_LEVELS.info;
  
  function shouldLog(level) {
    const levelValue = LOG_LEVELS[level];
    return levelValue <= currentLevelValue;
  }
  
  function formatLog(level, message) {
    return `${getTimestamp()} [${namespace}] ${level.toUpperCase()}: ${message}`;
  }
  
  return {
    error: (message) => {
      if (shouldLog('error')) {
        console.error(formatLog('error', message));
      }
    },
    warn: (message) => {
      if (shouldLog('warn')) {
        console.warn(formatLog('warn', message));
      }
    },
    info: (message) => {
      if (shouldLog('info')) {
        console.info(formatLog('info', message));
      }
    },
    debug: (message) => {
      if (shouldLog('debug')) {
        console.debug(formatLog('debug', message));
      }
    }
  };
}
