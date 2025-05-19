import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { HttpsProxyAgent } from 'https-proxy-agent';

// 简单日志函数
const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  debug: (msg) => process.env.LOG_LEVEL === 'debug' ? console.debug(`[DEBUG] ${msg}`) : null
};

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
        
        const resp = await fetch(url, { 
            timeout: 25000,
            headers: {
                'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
            } 
        });
        
        log.info(`代理 API 状态码: ${resp.status}`);
        
        if (!resp.ok) {
            return null;
        }
        
        const data = await resp.json();
        const plist = data.proxies || [];
        
        if (!plist.length) {
            return null;
        }
        
        const parts = plist[0].split(":");
        if (parts.length < 4) {
            return null;
        }
        
        const host = parts[0];
        const port = parts[1];
        const user = parts[2];
        const password = parts.slice(3).join(":");
        
        if (isNaN(parseInt(port))) {
            return null;
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
    const headers = { 
        ...BASE_HEADERS, 
        'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] 
    };
    
    let proxyOpts = { headers };
    let proxyAgent = null;
    
    try {
        if (proxy && proxy.proxy) {
            proxyAgent = new HttpsProxyAgent(proxy.proxy);
            proxyOpts.agent = proxyAgent;
        }
    } catch (error) {
        log.error(`代理设置失败: ${error.message}`);
        // 继续使用无代理方式
    }
    
    // 从静态映射中获取路径
    const paths = REGION_PATHS[cc];
    
    // 优先静态映射
    if (paths) {
        for (const path of paths) {
            try {
                const url = MAX_URL + path;
                log.info(`尝试访问: ${url}`);
                
                const response = await fetch(url, {
                    ...proxyOpts,
                    redirect: 'follow',
                    timeout: 45000
                });
                
                if (response.ok) {
                    return await response.text();
                }
            } catch (error) {
                log.error(`访问失败: ${path} - ${error.message}`);
                continue;
            }
        }
    }
    
    // 无映射或所有路径失败，尝试通用路径
    try {
        const defaultUrl = `${MAX_URL}/${cc}/`;
        log.info(`尝试访问默认URL: ${defaultUrl}`);
        
        const response = await fetch(defaultUrl, {
            ...proxyOpts,
            redirect: 'follow',
            timeout: 45000
        });
        
        if (response.ok) {
            return await response.text();
        }
        
        // 404 时尝试西班牙语路径
        if (response.status === 404) {
            try {
                const fallbackUrl = `${MAX_URL}/${cc}/es`;
                log.info(`尝试西语回退: ${fallbackUrl}`);
                
                const fallbackResponse = await fetch(fallbackUrl, {
                    ...proxyOpts,
                    redirect: 'follow',
                    timeout: 30000
                });
                
                if (fallbackResponse.ok) {
                    return await fallbackResponse.text();
                }
            } catch (error) {
                log.error(`西语回退失败: ${error.message}`);
            }
        }
    } catch (error) {
        log.error(`访问默认URL失败: ${error.message}`);
    }
    
    return null;
}

/**
 * 解析Max价格
 * @param {string} html HTML内容
 * @param {string} countryCode 国家代码
 * @returns {[Array<Object>, string]} [结构化数据, 文本输出]
 */
function parseMaxPrices(html, countryCode) {
    if (!html) {
        const err = `❌ 无法获取页面内容 (${countryCode})`;
        return [[], err];
    }
    
    try {
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // 查找所有计划组
        const sections = document.querySelectorAll('section[data-plan-group]');
        const plans = [];
        const seen = new Set();
        
        // 处理找到的计划组
        if (sections.length) {
            for (const sec of sections) {
                const p = sec.getAttribute('data-plan-group');
                const label = p === 'monthly' ? '每月' : '每年';
                
                // 查找卡片
                for (const card of sec.querySelectorAll('.max-plan-picker-group__card')) {
                    const nameEl = card.querySelector('h3');
                    const priceEl = card.querySelector('h4');
                    
                    if (!nameEl || !priceEl) continue;
                    
                    const name = nameEl.textContent.trim();
                    const price = priceEl.textContent.trim();
                    
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
        } else {
            // 备用选择器
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
            }
        }
        
        // 构建输出
        if (plans.length > 0) {
            const out = [`**Max ${countryCode} 订阅价格:**`];
            for (const item of plans) {
                out.push(`✅ ${item.name} (${item.label}): **${item.price}**`);
            }
            return [plans, out.join('\n')];
        }
        
        return [[], "❌ 未解析到任何价格。"];
    } catch (error) {
        log.error(`解析错误: ${error.message}`);
        return [[], `❌ 解析出错: ${error.message}`];
    }
}

/**
 * 主函数：获取MAX价格
 * @param {string} countryCode 国家代码
 * @returns {Promise<Object>} 结果
 */
async function getMaxPrice(countryCode) {
    try {
        log.info(`开始获取 ${countryCode} 的MAX价格...`);
        
        // 无代理情况下也尝试请求
        let proxy = null;
        try {
            proxy = await getProxy(countryCode);
            if (proxy) {
                log.info(`✅ 代理: ${proxy.host}:${proxy.port}`);
            } else {
                log.info(`⚠️ 无法获取代理，将直接访问`);
            }
        } catch (error) {
            log.error(`代理获取异常: ${error.message}`);
        }
        
        log.info(`⏳ 访问 Max (${countryCode})...`);
        
        let html = null;
        try {
            html = await fetchMaxPage(countryCode, proxy);
        } catch (error) {
            log.error(`网页获取异常: ${error.message}`);
        }
        
        if (!html) {
            return {
                success: false,
                message: `❌ 无法访问 Max (${countryCode})`,
                data: null
            };
        }
        
        log.info(`✅ 获取成功，解析中...`);
        
        // 同步解析HTML
        const [data, resultText] = parseMaxPrices(html, countryCode);
        
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
        
        return {
            success: false,
            message: `❌ 内部错误: ${error.message}`,
            data: null
        };
    }
}

// 处理未捕获的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
    log.error(`未处理的Promise拒绝: ${reason}`);
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    log.error(`未捕获的异常: ${error.message}`);
    log.error(error.stack);
});

// 主入口函数
export async function main() {
    let server = null;
    
    try {
        log.info('启动 Max Price MCP 服务器...');
        
        // 创建MCP服务器
        server = new McpServer({
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
                    if (!country_code || typeof country_code !== 'string') {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: '❌ 国家代码无效',
                                }
                            ],
                        };
                    }
                    
                    log.info(`处理请求: country_code=${country_code}`);
                    const upperCountryCode = country_code.toUpperCase();
                    const result = await getMaxPrice(upperCountryCode);
                    
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
                    
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `❌ 内部错误: ${error.message}`,
                            }
                        ],
                    };
                }
            }
        );
        
        // 使用标准输入/输出传输
        const transport = new StdioServerTransport();
        
        // 连接服务器
        await server.connect(transport);
        log.info('Max Price MCP Server 正在运行 (stdio)');
        
        // 确保进程不会意外退出
        process.stdin.resume();
        
        // 处理退出信号
        process.on('SIGINT', () => {
            log.info('收到退出信号，正在关闭服务器...');
            if (server) {
                try {
                    // 可选的清理工作
                } catch (error) {
                    log.error(`关闭服务器时出错: ${error.message}`);
                }
            }
            process.exit(0);
        });
    } catch (error) {
        log.error(`启动失败: ${error.message}`);
        log.error(error.stack);
        process.exit(1);
    }
}

// 直接运行
if (typeof require !== 'undefined' && require.main === module) {
    main().catch(error => {
        console.error(`严重错误: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    });
} else {
    // 作为模块导入时导出start函数
    export const start = main;
}
