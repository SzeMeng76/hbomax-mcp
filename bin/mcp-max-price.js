// 防止进程意外退出的处理
process.on('unhandledRejection', (reason) => {
  console.error(`未处理的Promise拒绝: ${reason}`);
});

process.on('uncaughtException', (error) => {
  console.error(`未捕获的异常: ${error}`);
});

// 导入主函数并执行
import { main } from '../src/index.js';

main().catch(error => {
  console.error(`严重错误: ${error}`);
  process.exit(1);
});
