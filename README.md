# Max Price MCP

这是一个基于Model Context Protocol (MCP)的工具，用于获取Max流媒体服务在不同国家/地区的订阅价格。

## 功能

- 根据国家代码查询Max订阅价格
- 自动获取代理以访问对应国家/地区的Max网站
- 支持多种语言路径和区域映射
- 解析并格式化订阅价格信息

## 安装

```bash
# 从NPM安装
npm install -g max-price-mcp

# 或者本地安装
npm install
```

## 使用方法

### 作为命令行工具

```bash
# 通过npx运行
npx max-price-mcp

# 或者安装后运行
max-price-mcp
```

### 在MCP兼容的环境中使用

此工具可与支持MCP的应用程序或AI助手一起使用。API包含以下工具:

- `get-max-price`: 根据国家代码获取Max订阅价格
  - 参数: `country_code` - 两字母国家代码(例如SG, US, HK)

## 示例

```
# 查询新加坡的Max订阅价格
get-max-price country_code=SG

# 查询美国的Max订阅价格
get-max-price country_code=US
```

## 输出示例

```
**max SG 订阅价格:**
✅ Basic (每月): **S$9.99**
✅ Standard (每月): **S$13.99**
✅ Premium (每月): **S$19.99**
✅ Basic (每年): **S$99.90**
✅ Standard (每年): **S$139.90**
✅ Premium (每年): **S$199.90**
```

## 依赖项

- @modelcontextprotocol/sdk: MCP服务器实现
- jsdom: HTML解析
- node-fetch: HTTP请求
- https-proxy-agent: 代理支持
- zod: 参数验证

## 注意事项

- 需要互联网连接
- 使用了第三方代理API(mooproxy.xyz)
- 某些国家/地区可能需要多次尝试才能成功获取价格信息
