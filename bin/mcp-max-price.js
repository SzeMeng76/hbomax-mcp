#!/usr/bin/env node
// bin/mcp-max-price.js
import { start } from '../src/index.js';

// 启动服务器
start().catch(err => {
  console.error('启动出错:', err);
  process.exit(1);
});
