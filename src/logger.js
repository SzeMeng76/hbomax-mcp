import { createLogger as createWinstonLogger, format, transports } from 'winston';
const { combine, timestamp, printf, colorize } = format;

/**
 * 创建自定义日志格式
 */
const customFormat = printf(({ level, message, timestamp, namespace }) => {
  return `${timestamp} [${namespace}] ${level}: ${message}`;
});

/**
 * 创建一个命名的日志记录器
 * @param {string} namespace 日志命名空间
 * @param {object} options 日志选项
 * @returns {object} 日志实例
 */
export function createLogger(namespace, options = {}) {
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  return createWinstonLogger({
    level: logLevel,
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      colorize(),
      format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'namespace'] }),
      format.label({ label: namespace }),
      format.timestamp(),
      customFormat
    ),
    defaultMeta: { namespace },
    transports: [
      new transports.Console({
        stderrLevels: ['error'],
      }),
    ],
    ...options
  });
}
