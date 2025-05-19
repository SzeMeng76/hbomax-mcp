import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { createLogger } from './logger.js';

// 设置日志记录器
const log = createLogger('max-price');

// --- 常量定义 ---
const MAX_URL = "https://www.max.com";

// 静态区域映射：国家代码 -> 多语言 URL 路径列表
const REGION_PATHS = {
    "my": ["/my/en", "/my/zh", "/my/ms"],
    "hk": ["/hk/en", "/hk/zh"],
    "ph": ["/ph/en", "/ph/tl"],
    "tw": ["/tw/en", "/tw/zh"],
    "id": ["/id/en", "/id/id"],
    "sg": ["/sg/en", "/sg/ms"],
    "th": ["/th/en", "/th/th"],
    "co": ["/co/es"], "cr": ["/cr/es"], "gt": ["/gt/es"], "pe": ["/pe/es"],
    "uy": ["/uy/es"], "mx": ["/mx/es"], "hn": ["/hn/es"], "ni": ["/ni/es"],
    "pa": ["/pa/es"], "ar": ["/ar/es"], "bo": ["/bo/es"], "do": ["/do/es"],
    "ec": ["/ec/es"], "sv": ["/sv/es"], "py": ["/py/es"], "cl": ["/cl/es"],
    "br": ["/br/pt"],
    "jm": ["/jm/en"], "ms": ["/ms/en"], "ai": ["/ai/en"], "ag": ["/ag/en"],
    "aw": ["/aw/en"], "bs": ["/bs/en"], "bb": ["/bb/en"], "bz": ["/bz/en"],
    "vg": ["/vg/en"], "ky": ["/ky/en"], "cw": ["/cw/en"], "dm": ["/dm/en"],
    "gd": ["/gd/en"], "gy": ["/gy/en"], "ht": ["/ht/en"], "kn": ["/kn/en"],
    "lc": ["/lc/en"], "vc": ["/vc/en"], "sr": ["/sr/en"], "tt": ["/tt/en"],
    "tc": ["/tc/en"],
    "us": ["/us/en", "/us/es"],
    "au": ["/au/en"],
    "ad": ["/ad/en", "/ad/es"],
    "ba": ["/ba/en", "/ba/hr"],
    "bg": ["/bg/en", "/bg/bg"],
    "hr": ["/hr/en", "/hr/hr"],
    "cz": ["/cz/en", "/cz/cs"],
    "hu": ["/hu/en", "/hu/hu"],
    "mk": ["/mk/en", "/mk/mk"],
    "md": ["/md/en", "/md/ro"],
    "me": ["/me/en", "/me/sr"],
    "ro": ["/ro/en", "/ro/ro"],
    "rs": ["/rs/en", "/rs/sr"],
    "sk": ["/sk/en", "/sk/sk"],
    "si": ["/si/en", "/si/sl"],
    "dk": ["/dk/en", "/dk/da"],
    "fi": ["/fi/en", "/fi/fi"],
    "no": ["/no/en", "/no/no"],
    "se": ["/se/en", "/se/sv"],
    "es": ["/es/en", "/es/es"],
    "fr": ["/fr/en", "/fr/fr"],
    "be": ["/be/en", "/be/nl", "/be/fr"],
    "pt": ["/pt/en", "/pt/pt"],
    "nl": ["/nl/en", "/nl/nl"],
    "pl": ["/pl/pl"],
    "tr": ["/tr/en", "/tr/tr"],
};

// 请求头
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/110.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/110.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/110.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; x64) AppleWebKit/537.36 Edg/110.0"
];

const BASE_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Upgrade-Insecure-Requests": "1",
    "DNT": "1",
    "Sec-GPC": "1"
};

// 代理 API 模板
const PROXY_API_TEMPLATE = "http://api.mooproxy.xyz/v1/gen?user=Domo_lee&country={country}&pass=UNuYSniZ8D";

/**
 * 获取代理
 * @param {string} countryCode 国家代码
 * @returns {Promise<Object|null>} 代理配置或null
 */
async function getProxy(countryCode) {
    const url = PROXY_API_TEMPLATE.replace("{country}", countryCode);
    try {
        log.info(`尝试获取代理: ${url}`);
        const resp = await fetch(url, { timeout: 25000 })
            .catch(err => {
                throw new Error(`代理API请求失败: ${err.message}`);
            });
            
        log.info(`代理 API 状态码: ${resp.status}`);
        
        if (!resp.ok) {
            throw new Error(`HTTP Error: ${resp.status}`);
        }
        
        const data = await resp.json();
        const plist = data.proxies || [];
        
        if (!plist.length) {
            throw new Error("代理列表为空");
        }
        
        const parts = plist[0].split(":");
        const host = parts[0];
        const port = parts[1];
        const user = parts[2];
        const password = parts.slice(3).join(":");
        
        if (isNaN(parseInt(port))) {
            throw new Error("端口号无效");
        }
        
        const full = `http://${user}:${password}@${host}:${port}`;
        log.info(`成功解析代理: ${host}:${port}`);
        
        return { 
            proxy: full,
            host,
            port: parseInt(port),
            user,
            password
        };
    } catch (error) {
        log.error(`获取代理失败: ${error.message}`);
        log.debug(error.stack);
        return null;
    }
}

/**
 * 获取Max页面
 * @param {string} countryCode 国家代码
 * @param {Object} proxy 代理配置
 * @returns {Promise<string|null>} HTML内容或null
 */
async function fetchMaxPage(countryCode, proxy) {
    const cc = countryCode.toLowerCase();
    const headers = { ...BASE_HEADERS, 'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] };
    const proxyUrl = proxy ? proxy.proxy : null;
    let proxyOpts = { headers };
    
    if (proxyUrl) {
        try {
            proxyOpts.agent = new HttpsProxyAgent(proxyUrl);
        } catch (error) {
            log.error(`代理配置失败: ${error.message}`);
            // 继续执行，但没有代理
        }
    }
    
    // 从静态映射中获取路径
    const paths = REGION_PATHS[cc];
    
    // 优先静态映射
    if (paths) {
        for (const path of paths) {
            const url = MAX_URL + path;
            try {
                log.info(`尝试访问: ${url}`);
                const response = await fetch(url, {
                    ...proxyOpts,
                    redirect: 'follow',
                    timeout: 45000
                })
                .catch(error => {
                    throw new Error(`请求失败: ${error.message}`);
                });
                
                log.info(`响应 ${response.status} -> ${response.url}`);
                
                if (!response.ok) {
                    continue;
                }
                
                return await response.text();
            } catch (error) {
                log.error(`访问失败: ${error.message}`);
                continue;
            }
        }
        return null;
    }
    
    // 无映射，则使用通用逻辑
    const defaultUrl = `${MAX_URL}/${cc}/`;
    try {
        log.info(`尝试访问: ${defaultUrl}`);
        const response = await fetch(defaultUrl, {
            ...proxyOpts,
            redirect: 'follow',
            timeout: 45000
        })
        .catch(error => {
            throw new Error(`请求失败: ${error.message}`);
        });
        
        log.info(`响应 ${response.status} -> ${response.url}`);
        
        if (!response.ok) {
            // 404 时回退西班牙语
            if (response.status === 404) {
                const fallbackUrl = `${MAX_URL}/${cc}/es`;
                try {
                    log.info(`西语回退: ${fallbackUrl}`);
                    const fallbackResponse = await fetch(fallbackUrl, {
                        ...proxyOpts,
                        redirect: 'follow',
                        timeout: 30000
                    })
                    .catch(error => {
                        throw new Error(`回退请求失败: ${error.message}`);
                    });
                    
                    log.info(`回退响应 ${fallbackResponse.status} -> ${fallbackResponse.url}`);
                    
                    if (fallbackResponse.ok) {
                        return await fallbackResponse.text();
                    }
                } catch (fallbackError) {
                    log.error(`回退访问失败: ${fallbackError.message}`);
                }
            }
            return null;
        }
        
        return await response.text();
    } catch (error) {
        log.error(`访问出错: ${error.message}`);
        log.debug(error.stack);
        return null;
    }
}

/**
 * 解析Max价格
 * @param {string} html HTML内容
 * @param {string} countryCode 国家代码
 * @returns {Promise<[Array<Object>, string]>} [结构化数据, 文本输出]
 */
async function parseMaxPrices(html, countryCode) {
    if (!html) {
        const err = `❌ 无法获取页面内容 (${countryCode})`;
        return [[], err];
    }
    
    try {
        const dom = new JSDOM(html);
        const document = dom.window.document;
        const sections = document.querySelectorAll('section[data-plan-group]');
        const plans = [];
        const seen = new Set();
        
        if (sections.length) {
            for (const sec of sections) {
                const p = sec.getAttribute('data-plan-group');
                const label = p === 'monthly' ? '每月' : '每年';
                
                for (const card of sec.querySelectorAll('.max-plan-picker-group__card')) {
                    const name = card.querySelector('h3')?.textContent?.trim();
                    const price = card.querySelector('h4')?.textContent?.trim();
                    
                    if (!name || !price) continue;
                    
                    const key = `${p}-${name}-${price}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    
                    plans.push({
                        plan_group: p,
                        label,
                        name,
                        price
                    });
                }
            }
            
            // 构建文本输出
            const out = [`**Max ${countryCode} 订阅价格:**`];
            for (const item of plans) {
                out.push(`✅ ${item.name} (${item.label}): **${item.price}**`);
            }
            
            return [plans, out.join('\n')];
        } else {
            // 尝试另一种选择器
            const planCards = document.querySelectorAll('.max-plan-picker-group__card, .plan-card');
            if (planCards.length) {
                for (const card of planCards) {
                    const nameEl = card.querySelector('h3, .plan-name');
                    const priceEl = card.querySelector('h4, .plan-price');
                    
                    if (!nameEl || !priceEl) continue;
                    
                    const name = nameEl.textContent.trim();
                    const price = priceEl.textContent.trim();
                    const planGroup = card.closest('[data-plan-group]')?.getAttribute('data-plan-group') || 'monthly';
                    const label = planGroup === 'monthly' ? '每月' : '每年';
                    
                    const key = `${planGroup}-${name}-${price}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    
                    plans.push({
                        plan_group: planGroup,
                        label,
                        name,
                        price
                    });
                }
                
                // 构建文本输出
                const out = [`**Max ${countryCode} 订阅价格:**`];
                for (const item of plans) {
                    out.push(`✅ ${item.name} (${item.label}): **${item.price}**`);
                }
                
                return [plans, out.join('\n')];
            }
        }
    } catch (error) {
        log.error(`解析失败: ${error.message}`);
        log.debug(error.stack);
        const err = `❌ 解析出错: ${error.message}`;
        return [[], err];
    }
    
    return [[], "❌ 未解析到任何价格。"];
}

/**
 * 主函数：获取MAX价格
 * @param {string} countryCode 国家代码
 * @returns {Promise<Object>} 结果
 */
async function getMaxPrice(countryCode) {
    log.info(`开始获取 ${countryCode} 的MAX价格...`);
    
    try {
        // 获取代理
        const proxy = await getProxy(countryCode);
        if (!proxy) {
            return {
                success: false,
                message: `❌ 代理获取失败 (${countryCode})`,
                data: null
            };
        }
        
        log.info(`✅ 代理: ${proxy.host}:${proxy.port}`);
        log.info(`⏳ 访问 max (${countryCode})...`);
        
        // 获取页面
        const html = await fetchMaxPage(countryCode, proxy);
        if (!html) {
            return {
                success: false,
                message: `❌ 无法访问 max (${countryCode})`,
                data: null
            };
        }
        
        log.info("✅ 获取成功，解析中...");
        
        // 解析价格
        const [data, resultText] = await parseMaxPrices(html, countryCode);
        
        return {
            success: data.length > 0,
            message: resultText,
            data: data.length > 0 ? {
                country: countryCode,
                timestamp: new Date().toISOString(),
                plans: data
            } : null
        };
    } catch (error) {
        log.error(`处理错误: ${error.message}`);
        log.debug(error.stack);
        return {
            success: false,
            message: `❌ 内部错误: ${error.message}`,
            data: null
        };
    }
}

/**
 * 主入口函数
 */
export async function start() {
    try {
        log.info('启动 Max Price MCP 服务器...');
        
        // 创建MCP服务器
        const server = new McpServer({
            name: 'max-price',
            version: '1.0.0',
        });

        // 注册获取Max价格工具
        server.tool(
            'get-max-price',
            'Get Max subscription prices by country code',
            {
                country_code: z.string().min(2).max(2).describe('Two-letter country code (e.g., SG, US, HK)'),
            },
            async ({ country_code }) => {
                try {
                    log.info(`处理请求: country_code=${country_code}`);
                    const upperCountryCode = country_code.toUpperCase();
                    const result = await getMaxPrice(upperCountryCode);
                    
                    // 使用适当的响应结构
                    return {
                        content: [
                            {
                                type: 'text',
                                text: result.message,
                            },
                            result.data ? {
                                type: 'json',
                                json: result.data
                            } : null
                        ].filter(Boolean),
                    };
                } catch (error) {
                    log.error(`工具执行错误: ${error.message}`);
                    log.debug(error.stack);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `❌ 内部错误: ${error.message}`,
                            }
                        ],
                    };
                }
            },
        );
        
        // 使用标准输入/输出传输
        const transport = new StdioServerTransport();
        
        // 连接服务器
        await server.connect(transport);
        log.info('Max Price MCP Server 正在运行 (stdio)');
        
        // 保持进程运行
        process.on('SIGINT', () => {
            log.info('收到 SIGINT 信号，正在关闭服务器...');
            process.exit(0);
        });
    } catch (error) {
        log.error(`启动失败: ${error.message}`);
        log.debug(error.stack);
        process.exit(1);
    }
}

// 直接调用启动函数
if (require.main === module) {
    start().catch(err => {
        console.error('启动出错:', err);
        process.exit(1);
    });
}
