# MCP Max Price

一个用于查询Max流媒体服务在不同国家/地区价格的MCP工具。

## 安装

### 全局安装

```bash
npm install -g mcp-max-price
```

### 通过npx直接使用

无需安装，直接使用npx命令运行：

```bash
npx mcp-max-price
```

## 集成到MCP客户端

在你的MCP客户端配置中，可以这样使用：

```javascript
// 配置示例
const ENV = {
  MCP_CONFIG: {
    "max-price": {
      type: "stdio",
      command: "npx",
      args: ["mcp-max-price"],
      env: { LOG_LEVEL: "info" }
    }
  }
};

// 初始化MCP客户端
await initializeMcp();

// 获取Max价格
const mcp = await getMcp();
const result = await mcp["max-price"]["get-max-price"]({ country_code: "US" });
console.log(result);
```

## 可用工具

### get-max-price

获取指定国家代码的Max流媒体服务价格信息。

**参数:**
- `country_code`: 两位国家代码（例如：SG, US, HK）

**返回:**
- 文本格式的价格信息摘要
- JSON格式的详细价格数据

## 环境变量

- `LOG_LEVEL`: 设置日志级别（默认：info）。可选值：error, warn, info, debug

## 许可证

MIT
