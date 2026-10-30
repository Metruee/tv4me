// @name 影视采集A(合并11源)
// @version 2.20261030.1
// @description 自动同步：采集聚合
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-采集A.js
// @dependencies axios,cheerio,crypto-js
// @note 由 tv4me 自动生成 · 聚合自 Silent1566/OmniBox-Spider，仅供个人使用

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const SUBS = [];

function _load(i, name, fn) {
  const mod = { exports: {} };
  let captured = null;
  const fakeRunner = { run: function (h) { captured = h; } };
  const fakeRequire = function (n) { return n === "spider_runner" ? fakeRunner : require(n); };
  try {
    fn(mod, mod.exports, fakeRequire);
    SUBS[i] = { name: name, h: captured || mod.exports };
  } catch (e) {
    SUBS[i] = { name: name, h: null, err: String((e && e.message) || e) };
  }
}

function _pfx(i, id) { return String(i) + ":" + String(id == null ? "" : id); }
function _split(id) {
  const s = String(id == null ? "" : id);
  const c = s.indexOf(":");
  if (c < 0) return [0, s];
  return [parseInt(s.slice(0, c), 10) || 0, s.slice(c + 1)];
}
function _timeout(p, ms) {
  let t;
  const to = new Promise(function (_, rej) { t = setTimeout(function () { rej(new Error("timeout")); }, ms); });
  return Promise.race([p, to]).finally(function () { clearTimeout(t); });
}
function _empty() { return { page: 1, pagecount: 1, total: 0, list: [] }; }
function _subOk(s, k) { return s && s.h && typeof s.h[k] === "function"; }

async function home(params, context) {
  const results = await Promise.allSettled(SUBS.map(function (s, i) {
    if (!_subOk(s, "home")) return Promise.resolve(null);
    return _timeout(Promise.resolve().then(function () { return s.h.home(params, context); }), 4500).then(function (v) { return { i: i, v: v }; });
  }));
  const cls = [], list = [];
  results.forEach(function (r) {
    if (r.status !== "fulfilled" || !r.value || !r.value.v) return;
    const i = r.value.i, v = r.value.v;
    (v.class || []).forEach(function (c) { cls.push({ type_id: _pfx(i, c.type_id), type_name: c.type_name }); });
    (v.list || []).slice(0, 20).forEach(function (x) { x.vod_id = _pfx(i, x.vod_id); list.push(x); });
  });
  return { class: cls, list: list.slice(0, 200) };
}

async function category(params, context) {
  const parts = _split(params.categoryId);
  const sub = SUBS[parts[0]];
  if (!_subOk(sub, "category")) return _empty();
  const p = Object.assign({}, params, { categoryId: parts[1] });
  try {
    const r = await _timeout(sub.h.category(p, context), 15000);
    if (r && r.list) r.list.forEach(function (x) { x.vod_id = _pfx(parts[0], x.vod_id); });
    return r;
  } catch (e) { return _empty(); }
}

async function search(params, context) {
  const kw = params.keyword || "";
  if (!kw) return _empty();
  const results = await Promise.allSettled(SUBS.map(function (s, i) {
    if (!_subOk(s, "search")) return Promise.resolve(null);
    return _timeout(Promise.resolve().then(function () { return s.h.search(params, context); }), 9000).then(function (v) { return { i: i, v: v }; });
  }));
  const list = [];
  results.forEach(function (r) {
    if (r.status !== "fulfilled" || !r.value || !r.value.v) return;
    const i = r.value.i;
    (r.value.v.list || []).forEach(function (x) { x.vod_id = _pfx(i, x.vod_id); list.push(x); });
  });
  return { page: 1, pagecount: 1, total: list.length, list: list };
}

async function detail(params, context) {
  const parts = _split(params.videoId);
  const sub = SUBS[parts[0]];
  if (!_subOk(sub, "detail")) return { list: [] };
  const p = Object.assign({}, params, { videoId: parts[1] });
  try {
    const r = await _timeout(sub.h.detail(p, context), 20000);
    if (r && r.list) r.list.forEach(function (v) {
      v.vod_id = _pfx(parts[0], v.vod_id);
      (v.vod_play_sources || []).forEach(function (src) {
        (src.episodes || []).forEach(function (ep) { ep.playId = _pfx(parts[0], ep.playId); });
      });
    });
    return r;
  } catch (e) { return { list: [] }; }
}

async function play(params, context) {
  const parts = _split(params.playId);
  const sub = SUBS[parts[0]];
  if (!_subOk(sub, "play")) return { urls: [] };
  const p = Object.assign({}, params, { playId: parts[1] });
  try { return await _timeout(sub.h.play(p, context), 25000); }
  catch (e) { return { urls: [] }; }
}

module.exports = { home, category, detail, search, play };
runner.run(module.exports);


_load(0, "3Q影视", function (module, exports, require) {
// @name 3Q影视
// @author W.Q, @wujiwanmei, @lucky_TJQ, tcxp, @shortai, 梦
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: axios, crypto
// @version 1.1.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/3Q影视.js

/**
 * ============================================================================
 * 多多追剧 (https://duoduozhuiju.com/ 发布页)
 * 刮削：支持
 * 弹幕：支持
 * 嗅探：支持
 * 
 * 特色功能：
 * - WASM Protobuf 解码加密播放地址
 * - 支持站内蓝光线路 + 站外聚合线路
 * - 完整的筛选器配置（类型/地区/年份）
 * - 集成 TMDB 刮削元数据
 * - 自动匹配弹幕
 * ============================================================================
 */

const axios = require("axios");
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
const DUODUO_RELEASE_URL = 'https://duoduozhuiju.com';
const HOST_CANDIDATES = ['https://dduotv01.top', 'https://323433ssdfd.top', 'https://xds2435u23422342342u.top'];
const HOST_CACHE_KEY = 'duoduo:active_host';
const HOST_CACHE_TTL = 60 * 60 * 24 * 30;
const HOST_PROBE_TIMEOUT = 8000;
let ACTIVE_HOST = HOST_CANDIDATES[0];
let ensureActiveHostPromise = null;

const config = {
    wasmCacheFile: 'duoduo.wasm',
    headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
        'X-Client': '8f3d2a1c7b6e5d4c9a0b1f2e3d4c5b6a',
        'web-sign': 'ddtvf65f3a83d6d9ad6f',
        'accept-language': 'zh-CN,zh;q=0.9'
    }
};

// 弹幕 API 地址(优先使用环境变量)
const DANMU_API = process.env.DANMU_API || "";

// HTTP 客户端实例
const _http = axios.create({
    timeout: 15 * 1000,
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
    httpAgent: new http.Agent({ keepAlive: true }),
});

// 播放请求头
const PLAY_HEADERS = {
    "User-Agent": UA,
    "Referer": `${ACTIVE_HOST}/`,
    "Origin": ACTIVE_HOST
};

const normalizeHost = (url = "") => {
    const value = String(url || "").trim();
    if (!value) return "";
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
        const target = new URL(withProtocol);
        return `${target.protocol}//${target.host}`;
    } catch {
        return withProtocol.replace(/\/+$/, "");
    }
};

const isHttpUrl = (u) => u && (u.startsWith('http://') || u.startsWith('https://'));
const needsParser = (u) => /(iqiyi\.com|v\.qq\.com|youku\.com|mgtv\.com|bilibili\.com)/.test(String(u || ""));
const isDirectPlayable = (u) => /\.(m3u8|mp4|flv|avi|mkv|ts)(?:\?|#|$)/i.test(String(u || ""));
const shouldAppendSourceCode = (code, name) => {
    const sourceCode = String(code || "").trim();
    const sourceName = String(name || "").trim();
    if (!sourceCode) return false;
    if (!sourceName) return true;
    if (sourceCode.toLowerCase().startsWith("site")) return false;
    return sourceCode.toLowerCase() !== sourceName.toLowerCase();
};
const buildLineDisplayName = (name, code) => {
    const sourceName = String(name || "").trim() || String(code || "").trim() || "多多追剧";
    const sourceCode = String(code || "").trim();
    if (shouldAppendSourceCode(sourceCode, sourceName)) {
        return `${sourceName} (${sourceCode})`;
    }
    return sourceName;
};

async function requestTextAbsolute(url, options = {}) {
    const response = await _http.get(url, {
        timeout: options.timeout || HOST_PROBE_TIMEOUT,
        headers: options.headers || {},
        maxRedirects: options.maxRedirects || 3,
        responseType: options.responseType
    });
    return response.data;
}

async function fetchReleaseHosts() {
    const releaseHost = normalizeHost(DUODUO_RELEASE_URL);
    const found = [];
    const pushHost = (value) => {
        const normalized = normalizeHost(value);
        if (!normalized) return;
        const host = new URL(normalized).host;
        if (host === new URL(releaseHost).host) return;
        if (/duoduozhuiju\.com$|dduotv01\.top$|umm\.dduotv01\.top$/i.test(host)) return;
        found.push(normalized);
    };

    let html = "";
    try {
        html = await requestTextAbsolute(`${releaseHost}/`, {
            timeout: HOST_PROBE_TIMEOUT,
            hostForHeaders: releaseHost
        });
    } catch (error) {
        logInfo('读取发布页域名失败', { release: DUODUO_RELEASE_URL, error: error.message });
        return [];
    }

    const scriptSrcs = [...String(html).matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map((m) => m[1]);
    const configSrc = scriptSrcs.find((src) => /(?:^|\/)config(?:\.min)?\.js(?:[?#]|$)/i.test(src));
    if (configSrc) {
        const configUrl = configSrc.startsWith('http') ? configSrc : `${releaseHost}/${configSrc.replace(/^\/+/, '')}`;
        try {
            const configText = await requestTextAbsolute(configUrl, {
                timeout: HOST_PROBE_TIMEOUT,
                hostForHeaders: releaseHost
            });
            const hostRegex = /(?:host|domain)\s*:\s*['"]([^'"]+)['"]|lines\s*:\s*\[([\s\S]*?)\]/gi;
            let match;
            while ((match = hostRegex.exec(configText))) {
                pushHost(match[1] || "");
                (String(match[2] || '').match(/host\s*:\s*['"]([^'"]+)['"]/gi) || [])
                    .forEach((item) => pushHost(item.replace(/^.*host\s*:\s*['"]([^'"]+)['"].*$/i, '$1')));
            }
        } catch (error) {
            logInfo('发布页 config.js 获取失败', { url: configUrl, error: error.message });
        }
    }

    const domainRegex = /https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::\d+)?/g;
    const hrefRegex = /href=["']([^"']+)["']/g;
    let match;
    while ((match = domainRegex.exec(html))) pushHost(match[0]);
    while ((match = hrefRegex.exec(html))) {
        const href = String(match[1] || '').trim();
        if (/^https?:\/\//i.test(href)) pushHost(href);
    }

    const unique = found.filter((item, index, arr) => arr.indexOf(item) === index);
    logInfo('发布页候选域名', { count: unique.length, hosts: unique.slice(0, 12) });
    return unique;
}

async function probeHost(host) {
    try {
        const text = await requestTextAbsolute(`${host}/api.php/web/index/home`, {
            timeout: HOST_PROBE_TIMEOUT,
            hostForHeaders: host,
            headers: config.headers
        });
        const json = typeof text === 'string' ? JSON.parse(text) : text;
        if (json && json.data) return true;
        logInfo('域名探测返回非 JSON', { host });
        return false;
    } catch (error) {
        logInfo('域名探测失败', { host, error: error.message });
        return false;
    }
}

async function readActiveHostCache() {
    try {
        const cached = await OmniBox.getCache(HOST_CACHE_KEY);
        const normalized = normalizeHost(cached || "");
        if (normalized) {
            logInfo('命中域名缓存', { host: normalized });
            return normalized;
        }
    } catch (error) {
        logInfo('读取域名缓存失败', { error: error.message });
    }
    return "";
}

async function saveActiveHostCache(host) {
    const normalized = normalizeHost(host);
    if (!normalized) return;
    try {
        await OmniBox.setCache(HOST_CACHE_KEY, normalized, HOST_CACHE_TTL);
        logInfo('写入域名缓存', { host: normalized });
    } catch (error) {
        logInfo('写入域名缓存失败', { host: normalized, error: error.message });
    }
}

async function ensureActiveHost(preferredHost = "") {
    if (ensureActiveHostPromise) return ensureActiveHostPromise;
    ensureActiveHostPromise = (async () => {
        const preferred = normalizeHost(preferredHost);
        const cachedHost = await readActiveHostCache();
        const quickList = [preferred, cachedHost, getCurrentHost(), ...HOST_CANDIDATES]
            .filter(Boolean)
            .filter((item, index, arr) => arr.indexOf(item) === index);
        for (const host of quickList) {
            if (await probeHost(host)) {
                ACTIVE_HOST = host;
                await saveActiveHostCache(host);
                return ACTIVE_HOST;
            }
        }

        const releaseHosts = await fetchReleaseHosts();
        const ordered = [...releaseHosts, ...HOST_CANDIDATES]
            .filter(Boolean)
            .filter((item, index, arr) => arr.indexOf(item) === index);
        for (const host of ordered) {
            if (await probeHost(host)) {
                logInfo('发布页域名可用', { to: host });
                ACTIVE_HOST = host;
                await saveActiveHostCache(host);
                return ACTIVE_HOST;
            }
        }
        throw new Error(`未找到可用域名: ${[...quickList, ...ordered].join(', ')}`);
    })();
    try {
        return await ensureActiveHostPromise;
    } finally {
        ensureActiveHostPromise = null;
    }
}

function getCurrentHost() {
    return ACTIVE_HOST || HOST_CANDIDATES[0];
}

async function apiGet(url) {
    if (/^https?:\/\//i.test(url)) {
        const response = await _http.get(url, { headers: { ...config.headers, referer: `${getCurrentHost()}/` } });
        if (response?.data?.code === 408) {
            response.data = { code: 200, msg: response.data.msg || 'success', data: [] };
        }
        return response;
    }

    let lastError = null;
    for (const host of [getCurrentHost(), ...HOST_CANDIDATES]) {
        try {
            ACTIVE_HOST = normalizeHost(host);
            await ensureActiveHost(ACTIVE_HOST);
            const target = url.startsWith('/') ? `${ACTIVE_HOST}${url}` : `${ACTIVE_HOST}/${url}`;
            const response = await _http.get(target, { headers: { ...config.headers, referer: `${ACTIVE_HOST}/` } });
            if (response?.data?.code === 408) {
                response.data = { code: 200, msg: response.data.msg || 'success', data: [] };
            }
            return response;
        } catch (error) {
            lastError = error;
            logInfo('候选域名请求失败', { host, url, error: error.message });
        }
    }
    throw lastError || new Error(`请求失败: ${url}`);
}

async function sniffPlayUrl(playUrl) {
    try {
        const sniffed = await OmniBox.sniffVideo(playUrl);
        if (sniffed && sniffed.url) {
            return {
                url: sniffed.url,
                header: sniffed.header || PLAY_HEADERS,
            };
        }
    } catch (error) {
        logInfo(`嗅探失败，回退原始地址: ${error.message}`);
    }
    return null;
}

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    OmniBox.log("info", `[多多追剧] ${output}`);
};

const logError = (message, error) => {
    OmniBox.log("error", `[多多追剧] ${message}: ${error.message || error}`);
};

/**
 * 编码/解码元数据（用于透传参数）
 */
const encodeMeta = (obj) => {
    try {
        return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64");
    } catch {
        return "";
    }
};

const decodeMeta = (str) => {
    try {
        const raw = Buffer.from(str || "", "base64").toString("utf8");
        return JSON.parse(raw || "{}");
    } catch {
        return {};
    }
};

/**
 * Promise 超时包装，避免接口长时间阻塞
 * @param {Promise<any>} promise - 原始 Promise
 * @param {number} ms - 超时时间（毫秒）
 * @param {string} label - 超时标签
 * @returns {Promise<any>}
 */
const withTimeout = (promise, ms, label = "operation") =>
    Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
        }),
    ]);

// ========== 筛选器配置 ==========

/**
 * 动态生成年份筛选器
 * @param {string} typeName - 分类名称（电影/剧集/动漫/综艺）
 * @returns {Array} 年份选项数组
 */
const generateYears = (typeName) => {
    const currentYear = new Date().getFullYear();
    const years = [{ "name": "全部", "value": "" }];

    if (typeName === '电影') {
        // 电影：当前年份到2016年，然后是年代区间
        for (let y = currentYear; y >= 2016; y--) {
            years.push({ "name": String(y), "value": String(y) });
        }
        ['2015-2011', '2010-2000', '90年代', '80年代', '更早'].forEach(i => {
            years.push({ "name": i, "value": i });
        });
    } else if (typeName === '剧集') {
        // 剧集：当前年份到2021年，然后是年代区间
        for (let y = currentYear; y >= 2021; y--) {
            years.push({ "name": String(y), "value": String(y) });
        }
        ['2020-2016', '2015-2011', '2010-2000', '更早'].forEach(i => {
            years.push({ "name": i, "value": i });
        });
    } else {
        // 动漫/综艺：当前年份到2011年
        for (let y = currentYear; y >= 2011; y--) {
            years.push({ "name": String(y), "value": String(y) });
        }
        years.push({ "name": "更早", "value": "更早" });
    }

    return years;
};

/**
 * 筛选器数据配置
 * 包含电影、剧集、动漫、综艺的类型、地区、年份筛选
 */
const filterData = {
    "电影": [
        {
            "key": "class",
            "name": "类型",
            "value": [
                { "name": "全部", "value": "" },
                ...["动作", "喜剧", "爱情", "科幻", "恐怖", "悬疑", "犯罪", "战争", "动画", "冒险", "历史", "灾难", "纪录", "剧情"].map(i => ({ "name": i, "value": i }))
            ]
        },
        {
            "key": "area",
            "name": "地区",
            "value": [
                { "name": "全部", "value": "" },
                ...["大陆", "香港", "台湾", "美国", "日本", "韩国", "泰国", "印度", "英国", "法国", "德国", "加拿大", "西班牙", "意大利", "澳大利亚"].map(i => ({ "name": i, "value": i }))
            ]
        },
        {
            "key": "year",
            "name": "年份",
            "value": generateYears('电影')
        }
    ],
    "剧集": [
        {
            "key": "class",
            "name": "类型",
            "value": [
                { "name": "全部", "value": "" },
                ...["爱情", "古装", "武侠", "历史", "家庭", "喜剧", "悬疑", "犯罪", "战争", "奇幻", "科幻", "恐怖"].map(i => ({ "name": i, "value": i }))
            ]
        },
        {
            "key": "area",
            "name": "地区",
            "value": [
                { "name": "全部", "value": "" },
                ...["大陆", "香港", "台湾", "美国", "日本", "韩国", "泰国", "英国"].map(i => ({ "name": i, "value": i }))
            ]
        },
        {
            "key": "year",
            "name": "年份",
            "value": generateYears('剧集')
        }
    ],
    "动漫": [
        {
            "key": "class",
            "name": "类型",
            "value": [
                { "name": "全部", "value": "" },
                ...["冒险", "奇幻", "科幻", "武侠", "悬疑"].map(i => ({ "name": i, "value": i }))
            ]
        },
        {
            "key": "area",
            "name": "地区",
            "value": [
                { "name": "全部", "value": "" },
                ...["大陆", "日本", "欧美"].map(i => ({ "name": i, "value": i }))
            ]
        },
        {
            "key": "year",
            "name": "年份",
            "value": generateYears('动漫')
        }
    ],
    "综艺": [
        {
            "key": "class",
            "name": "类型",
            "value": [
                { "name": "全部", "value": "" },
                ...["真人秀", "音乐", "脱口秀", "歌舞", "爱情"].map(i => ({ "name": i, "value": i }))
            ]
        },
        {
            "key": "area",
            "name": "地区",
            "value": [
                { "name": "全部", "value": "" },
                ...["大陆", "香港", "台湾", "美国", "日本", "韩国"].map(i => ({ "name": i, "value": i }))
            ]
        },
        {
            "key": "year",
            "name": "年份",
            "value": generateYears('综艺')
        }
    ]
};

/**
 * 画质优先级配置
 * 用于多线路排序，优先显示高画质线路
 */
const QUALITY_PRIORITY = [
    { keywords: ['8K', '8k'], score: 200 },
    { keywords: ['4K', '4k', '超清4K'], score: 190 },
    { keywords: ['蓝光4K', '蓝光HDR'], score: 180 },
    { keywords: ['AE', '蓝光'], score: 170 },
    { keywords: ['1080P蓝光', '1080PHDR'], score: 160 },
    { keywords: ['1080P', '1080p', '超清'], score: 150 },
    { keywords: ['720P', '720p', '高清'], score: 140 },
    { keywords: ['480P', '480p', '标清'], score: 130 },
    { keywords: ['360P', '360p', '流畅'], score: 120 }
];

/**
 * 计算线路画质评分
 * @param {string} showCode - 线路代码
 * @param {string} lineName - 线路名称
 * @returns {number} 画质评分
 */
const calculateQualityScore = (showCode, lineName) => {
    const fullText = `${showCode}${lineName}`.toLowerCase();
    for (const rule of QUALITY_PRIORITY) {
        if (rule.keywords.some(k => fullText.includes(k.toLowerCase()))) {
            return rule.score;
        }
    }
    return 50; // 默认评分
};

/**
 * 转换视频数据为标准格式
 * @param {Array} arr - 原始视频数据数组
 * @returns {Array} 标准化后的视频数组
 */
const json2vods = (arr) => (arr || []).map(i => ({
    vod_id: i.vod_id.toString(),
    vod_name: i.vod_name,
    vod_pic: i.vod_pic,
    vod_remarks: i.vod_remarks,
    type_name: i.vod_class ? `${i.type_name},${i.vod_class}` : i.type_name,
    vod_year: i.vod_year.toString()
}));

// ============================================================
// WASM 解码模块 - 用于解密多多追剧加密播放地址
// 该模块使用 Protobuf + WASM 技术解码加密的视频 URL
// ============================================================

let wasmModule = null;
let wasmMemView = null;
let wasmD = 0;
const wasmTextEnc = new TextEncoder();
const wasmTextDec = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
const wasmExtTable = new Map();
let wasmExtCounter = 4;

/**
 * 获取 WASM 内存视图
 */
function wasmGetMem() {
    if (!wasmMemView || wasmMemView.byteLength === 0)
        wasmMemView = new Uint8Array(wasmModule.exports.memory.buffer);
    return wasmMemView;
}

/**
 * 从 WASM 内存读取字节数组
 */
function wasmReadBytes(p, l) {
    return wasmGetMem().subarray(p >>> 0, (p >>> 0) + l);
}

/**
 * 从 WASM 内存读取字符串
 */
function wasmReadStr(p, l) {
    return wasmTextDec.decode(wasmGetMem().subarray(p >>> 0, (p >>> 0) + l));
}

/**
 * 向 WASM 内存写入字节数组
 */
function wasmWriteBytes(data, malloc) {
    const p = malloc(data.length, 1) >>> 0;
    wasmGetMem().set(data, p);
    wasmD = data.length;
    return p;
}

/**
 * 向 WASM 内存写入字符串
 */
function wasmWriteStr(s, malloc, realloc) {
    if (!realloc) {
        const e = wasmTextEnc.encode(s);
        const p = malloc(e.length, 1) >>> 0;
        wasmGetMem().subarray(p, p + e.length).set(e);
        wasmD = e.length;
        return p;
    }
    let n = s.length, p = malloc(n, 1) >>> 0;
    const m = wasmGetMem();
    let o = 0;
    for (; o < n; o++) {
        const c = s.charCodeAt(o);
        if (c > 127) break;
        m[p + o] = c;
    }
    if (o !== n) {
        const r = s.slice(o);
        p = realloc(p, n, n = o + r.length * 3, 1) >>> 0;
        const sub = wasmGetMem().subarray(p + o, p + n);
        const res = wasmTextEnc.encodeInto(r, sub);
        o += res.written;
        p = realloc(p, n, o, 1) >>> 0;
    }
    wasmD = o;
    return p;
}

/**
 * WASM 外部引用表管理
 */
function wasmExtAlloc(v) {
    const i = wasmExtCounter++;
    wasmExtTable.set(i, v);
    return i;
}

function wasmExtGet(i) {
    return wasmExtTable.get(i);
}

function wasmExtDealloc(i) {
    const v = wasmExtTable.get(i);
    wasmExtTable.delete(i);
    return v;
}

/**
 * WASM 异常捕获包装器
 */
function wasmTryCatch(fn, args) {
    try {
        return fn.apply(null, args);
    } catch (e) {
        wasmModule.exports.__wbindgen_exn_store(wasmExtAlloc(e));
    }
}

/**
 * 构建 WASM 导入对象
 * 包含所有 WASM 模块需要的 JavaScript 绑定函数
 */
function wasmBuildImports() {
    return {
        "./web_app_wasm_bg.js": {
            __wbg___wbindgen_is_function_0095a73b8b156f76: (e) => typeof wasmExtGet(e) === 'function',
            __wbg___wbindgen_is_object_5ae8e5880f2c1fbd: (e) => { const r = wasmExtGet(e); return typeof r === 'object' && r !== null; },
            __wbg___wbindgen_is_string_cd444516edc5b180: (e) => typeof wasmExtGet(e) === 'string',
            __wbg___wbindgen_is_undefined_9e4d92534c42d778: (e) => wasmExtGet(e) === undefined,
            __wbg___wbindgen_throw_be289d5034ed271b: (e, r) => { throw new Error(wasmReadStr(e, r)); },
            __wbg_call_389efe28435a9388: function () { return wasmTryCatch((e, r) => wasmExtAlloc(wasmExtGet(e).call(wasmExtGet(r))), arguments); },
            __wbg_call_4708e0c13bdc8e95: function () { return wasmTryCatch((e, r, n) => wasmExtAlloc(wasmExtGet(e).call(wasmExtGet(r), wasmExtGet(n))), arguments); },
            __wbg_crypto_86f2631e91b51511: (e) => wasmExtAlloc(crypto),
            __wbg_getRandomValues_b3f15fcbfabb0f8b: function () { return wasmTryCatch((e, r) => { crypto.randomFillSync(wasmExtGet(r)); }, arguments); },
            __wbg_length_32ed9a279acd054c: (e) => wasmExtGet(e).length,
            __wbg_msCrypto_d562bbe83e0d4b91: (e) => 0,
            __wbg_new_no_args_1c7c842f08d00ebb: (e, r) => wasmExtAlloc(new Function(wasmReadStr(e, r))),
            __wbg_new_with_length_a2c39cbe88fd8ff1: (e) => wasmExtAlloc(new Uint8Array(e >>> 0)),
            __wbg_node_e1f24f89a7336c2e: (e) => wasmExtAlloc(process),
            __wbg_now_a3af9a2f4bbaa4d1: () => Date.now(),
            __wbg_process_3975fd6c72f520aa: (e) => wasmExtAlloc(process),
            __wbg_prototypesetcall_bdcdcc5842e4d77d: (e, r, n) => { wasmReadBytes(e, r).set(wasmExtGet(n)); },
            __wbg_randomFillSync_f8c153b79f285817: function () { return wasmTryCatch((e, r) => { crypto.randomFillSync(wasmExtGet(r)); }, arguments); },
            __wbg_require_b74f47fc2d022fd6: function () { return wasmTryCatch(() => wasmExtAlloc(require), arguments); },
            __wbg_static_accessor_GLOBAL_12837167ad935116: () => wasmExtAlloc(global),
            __wbg_static_accessor_GLOBAL_THIS_e628e89ab3b1c95f: () => wasmExtAlloc(globalThis),
            __wbg_static_accessor_SELF_a621d3dfbb60d0ce: () => 0,
            __wbg_static_accessor_WINDOW_f8727f0cf888e0bd: () => 0,
            __wbg_subarray_a96e1fef17ed23cb: (e, r, n) => wasmExtAlloc(wasmExtGet(e).subarray(r >>> 0, n >>> 0)),
            __wbg_versions_4e31226f5e8dc909: (e) => wasmExtAlloc(process.versions),
            __wbindgen_cast_0000000000000001: (e, r) => wasmExtAlloc(wasmReadBytes(e, r)),
            __wbindgen_cast_0000000000000002: (e, r) => wasmExtAlloc(wasmReadStr(e, r)),
            __wbindgen_init_externref_table: () => {
                const t = wasmModule.exports.__wbindgen_externrefs;
                if (t && t.grow) {
                    const b = t.grow(4);
                    t.set(0, undefined); t.set(b, undefined);
                    t.set(b + 1, null); t.set(b + 2, true); t.set(b + 3, false);
                }
            }
        }
    };
}

let wasmReady = false;
let wasmInitPromise = null;

/**
 * 初始化 WASM 解码模块
 * 尝试从本地加载或从远程下载 WASM 文件
 * @returns {Promise<boolean>} 初始化是否成功
 */
async function initWasm() {
    if (wasmReady) return true;
    if (wasmInitPromise) return wasmInitPromise;

    wasmInitPromise = (async () => {
        try {
            // 尝试多个可能的 WASM 文件路径
            const possiblePaths = [
                path.join(__dirname, config.wasmCacheFile),
                '/www/wwwroot/vodspider/vod/routes/duoduo.wasm',
                '/tmp/duoduo.wasm'
            ];

            let wasmBuf = null;

            // 尝试从本地加载
            for (const p of possiblePaths) {
                try {
                    wasmBuf = fs.readFileSync(p);
                    logInfo(`WASM 文件从本地加载: ${p}`);
                    break;
                } catch (e) { }
            }

            // 如果本地没有，从远程下载
            if (!wasmBuf) {
                logInfo('本地未找到 WASM 文件，开始从远程下载...');
                await ensureActiveHost();
                wasmBuf = Buffer.from(await requestTextAbsolute(
                    `${ACTIVE_HOST}/assets/web_app_wasm_bg-Bxwbrgev.wasm`,
                    { timeout: 30000, responseType: 'arraybuffer' }
                ));
                try {
                    fs.writeFileSync(path.join(__dirname, config.wasmCacheFile), wasmBuf);
                    logInfo('WASM 文件已缓存到本地');
                } catch (e) {
                    logError('WASM 文件缓存失败', e);
                }
            }

            // 实例化 WASM 模块
            const { instance } = await WebAssembly.instantiate(wasmBuf, wasmBuildImports());
            wasmModule = instance;
            wasmMemView = null;

            // 启动 WASM 模块
            if (wasmModule.exports.__wbindgen_start) {
                wasmModule.exports.__wbindgen_start();
            }

            wasmReady = true;
            logInfo('WASM 解码模块加载成功');
            return true;
        } catch (e) {
            logError('WASM 初始化失败', e);
            wasmInitPromise = null;
            return false;
        }
    })();

    return wasmInitPromise;
}

/**
 * 创建解码请求数据（Protobuf 格式）
 * @param {string} url - 加密的播放地址
 * @param {string} vodFrom - 线路代码
 * @returns {Uint8Array} Protobuf 编码的请求数据
 */
function wasmCreateDecodeRequest(url, vodFrom) {
    const e = wasmModule.exports;
    const up = wasmWriteStr(url, e.__wbindgen_malloc, e.__wbindgen_realloc);
    const ul = wasmD;
    const fp = wasmWriteStr(vodFrom, e.__wbindgen_malloc, e.__wbindgen_realloc);
    const fl = wasmD;
    const r = e.create_decode_request(up, ul, fp, fl);
    const data = wasmGetMem().slice(r[0], r[0] + r[1]);
    e.__wbindgen_free(r[0], r[1], 1);
    return new Uint8Array(data);
}

/**
 * 解析解码响应数据（Protobuf 格式）
 * @param {Buffer} body - 响应体数据
 * @returns {Object} 解码结果 { code, data, msg }
 */
function wasmParseDecodeResponse(body) {
    const e = wasmModule.exports;
    const bp = wasmWriteBytes(body, e.__wbindgen_malloc);
    const bl = wasmD;
    const r = e.parse_decode_response(bp, bl);

    if (r[2]) throw wasmExtDealloc(r[1]) || new Error('parse failed');

    const ptr = r[0];
    const code = e.decoderesult_code(ptr);
    const dd = e.decoderesult_data(ptr);
    const data = dd[0] ? wasmReadStr(dd[0], dd[1]) : '';
    const dm = e.decoderesult_msg(ptr);
    const msg = dm[0] ? wasmReadStr(dm[0], dm[1]) : '';
    e.__wbg_decoderesult_free(ptr, 0);

    return { code, data, msg };
}

/**
 * 获取签名请求头
 * 用于 Protobuf API 请求的身份验证
 * @returns {Object} 签名请求头对象
 */
function wasmGetSignatureHeaders() {
    const e = wasmModule.exports;
    const r = e.get_signature_headers();

    const aid = e.signatureheaders_aid(r);
    const aidStr = aid[0] ? wasmReadStr(aid[0], aid[1]) : '';

    const ave = e.signatureheaders_ave(r);
    const aveStr = ave[0] ? wasmReadStr(ave[0], ave[1]) : '';

    const nonc = e.signatureheaders_nonc(r);
    const noncStr = nonc[0] ? wasmReadStr(nonc[0], nonc[1]) : '';

    const sign = e.signatureheaders_sign(r);
    const signStr = sign[0] ? wasmReadStr(sign[0], sign[1]) : '';

    const time = e.signatureheaders_time(r);
    const timeStr = time[0] ? wasmReadStr(time[0], time[1]) : '';

    e.__wbg_signatureheaders_free(r, 0);

    return {
        'X-App-Id': aidStr,
        'X-App-Ve': aveStr,
        'X-Nonc': noncStr,
        'X-Sign': signStr,
        'X-Time': timeStr
    };
}

/**
 * 发送 Protobuf POST 请求
 * @param {string} url - 请求 URL
 * @param {Uint8Array} data - Protobuf 数据
 * @param {Object} extraHeaders - 额外的请求头
 * @returns {Promise<Object>} 响应对象 { status, body }
 */
async function postProtobuf(url, data, extraHeaders = {}) {
    await ensureActiveHost();
    const target = url.startsWith('/') ? `${ACTIVE_HOST}${url}` : `${ACTIVE_HOST}/${url}`;
    const response = await _http.post(target, Buffer.from(data), {
        timeout: 10000,
        headers: {
            'Content-Type': 'application/x-protobuf',
            'Accept': 'application/x-protobuf',
            'User-Agent': UA,
            'Referer': `${ACTIVE_HOST}/`,
            'Origin': ACTIVE_HOST,
            ...extraHeaders
        },
        responseType: 'arraybuffer'
    });
    return { status: response.status, body: Buffer.from(response.data || []) };
}

/**
 * API GET 请求（使用 X-Client + web-sign 认证）
 * @param {string} url - 请求 URL
 * @returns {Promise} axios 响应对象
 */
/**
 * 使用 WASM 解码加密的播放地址
 * @param {string} rawUrl - 加密的 URL
 * @param {string} vodFrom - 线路代码
 * @returns {Promise<string|null>} 解密后的真实播放地址
 */
async function decodeEncryptedUrl(rawUrl, vodFrom) {
    // 确保 WASM 模块已初始化
    if (!wasmReady) {
        const ok = await initWasm();
        if (!ok) {
            logError('WASM 模块未就绪', new Error('初始化失败'));
            return null;
        }
    }

    try {
        // 1. 创建解码请求数据
        const reqData = wasmCreateDecodeRequest(rawUrl, vodFrom);

        // 2. 获取签名请求头
        const sigHeaders = wasmGetSignatureHeaders();

        // 3. 发送 Protobuf 请求
        const resp = await postProtobuf(
            `/api.php/web/decode/url`,
            reqData,
            sigHeaders
        );

        // 4. 检查响应状态
        if (resp.status !== 200) {
            logError('解码请求失败', new Error(`HTTP ${resp.status}`));
            return null;
        }

        // 5. 解析响应数据
        const result = wasmParseDecodeResponse(new Uint8Array(resp.body));

        // 6. 验证解码结果
        if (result.code === 1 && result.data && result.data.startsWith('http')) {
            logInfo(`解码成功: ${vodFrom} -> ${result.data.substring(0, 80)}...`);
            return result.data;
        }

        logError('解码失败', new Error(`code=${result.code}, msg=${result.msg}`));
        return null;
    } catch (e) {
        logError('解码过程异常', e);
        return null;
    }
}

// ========== 刮削和弹幕辅助函数 ==========

/**
 * 预处理标题，去掉常见干扰项
 * @param {string} title - 原始标题
 * @returns {string} 清理后的标题
 */
function preprocessTitle(title) {
    if (!title) return "";
    return title
        .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]|1280x720|1920x1080/g, " ")
        .replace(/[hH]\.?26[45]/g, " ")
        .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
        .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ");
}

/**
 * 将中文数字转换为阿拉伯数字
 * @param {string} cn - 中文数字
 * @returns {number|string} 阿拉伯数字或原值
 */
function chineseToArabic(cn) {
    const map = {
        '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
        '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
    };
    if (!isNaN(cn)) return parseInt(cn);
    if (cn.length === 1) return map[cn] || cn;
    if (cn.length === 2) {
        if (cn[0] === '十') return 10 + map[cn[1]];
        if (cn[1] === '十') return map[cn[0]] * 10;
    }
    if (cn.length === 3) return map[cn[0]] * 10 + map[cn[2]];
    return cn;
}

/**
 * 从标题中提取集数数字
 * @param {string} title - 集数标题
 * @returns {string} 提取的集数数字
 */
function extractEpisode(title) {
    if (!title) return "";

    const processedTitle = preprocessTitle(title).trim();

    // 1. S01E03 格式
    const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
    if (seMatch) return seMatch[1];

    // 2. 中文格式：第XX集/话
    const cnMatch = processedTitle.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
    if (cnMatch) return String(chineseToArabic(cnMatch[1]));

    // 3. EP/E 格式
    const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
    if (epMatch) return epMatch[1];

    // 4. 括号格式 [03]
    const bracketMatch = processedTitle.match(/[\[\(【（](\d{1,3})[\]\)】）]/);
    if (bracketMatch) {
        const num = bracketMatch[1];
        // 排除常见分辨率
        if (!["720", "1080", "480"].includes(num)) return num;
    }

    // 5. 独立的数字 (排除常见的视频参数)
    const standaloneMatches = processedTitle.match(/(?:^|[\s\-\._\[\]])(\d{1,3})(?![0-9pP])/g);
    if (standaloneMatches) {
        const candidates = standaloneMatches
            .map(m => m.match(/\d+/)[0])
            .filter(num => {
                const n = parseInt(num);
                return n > 0 && n < 300 && !["720", "480", "264", "265"].includes(num);
            });

        if (candidates.length > 0) {
            // 优先取 1-99 之间的
            const normalEp = candidates.find(n => parseInt(n) < 100);
            return normalEp || candidates[0];
        }
    }

    return "";
}

/**
 * 构建用于弹幕匹配的文件名
 * @param {string} vodName - 视频名称
 * @param {string} episodeTitle - 集数标题
 * @returns {string} 标准化的文件名
 */
function buildFileNameForDanmu(vodName, episodeTitle) {
    if (!vodName) return "";

    // 如果没有集数信息，直接返回视频名（电影）
    if (!episodeTitle || episodeTitle === '正片' || episodeTitle === '播放') {
        return vodName;
    }

    // 提取集数
    const digits = extractEpisode(episodeTitle);
    if (digits) {
        const epNum = parseInt(digits, 10);
        if (epNum > 0) {
            // 构建标准格式：视频名 S01E01
            if (epNum < 10) {
                return `${vodName} S01E0${epNum}`;
            } else {
                return `${vodName} S01E${epNum}`;
            }
        }
    }

    // 无法提取集数，返回视频名
    return vodName;
}

/**
 * 构建刮削后的集数名称
 * @param {Object} scrapeData - 刮削数据
 * @param {Object} mapping - 集数映射
 * @param {string} originalName - 原始名称
 * @returns {string} 刮削后的名称
 */
const buildScrapedEpisodeName = (scrapeData, mapping, originalName) => {
    if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
        return originalName;
    }
    if (mapping.episodeName) {
        const epName = mapping.episodeNumber + "." + mapping.episodeName;
        return epName;
    }
    if (scrapeData && Array.isArray(scrapeData.episodes)) {
        const hit = scrapeData.episodes.find(
            (ep) => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber
        );
        if (hit?.name) {
            return `${hit.episodeNumber}.${hit.name}`;
        }
    }
    return originalName;
};

/**
 * 从映射中提取文件ID（兼容不同字段名）
 * @param {Object} mapping - 刮削映射对象
 * @returns {string} 文件ID
 */
const getMappingFileId = (mapping) => {
    if (!mapping || typeof mapping !== "object") return "";
    return String(mapping.fileId || mapping.file_id || mapping.fid || "");
};

/**
 * 从 fid 提取集索引（sid#line#epIndex -> epIndex）
 * @param {string} fid - 文件ID
 * @returns {string} 集索引
 */
const getFidEpisodeIndex = (fid) => {
    const parts = String(fid || "").split("#");
    if (parts.length < 3) return "";
    return String(parts[parts.length - 1] || "");
};

/**
 * 规范化集数名称
 * @param {string} name - 集数名称
 * @returns {string} 规范化后的名称
 */
const normalizeEpisodeName = (name) => String(name || "").trim().toLowerCase();

/**
 * 根据 fid 查找刮削映射（兼容 fileId/file_id/fid）
 * @param {Array} videoMappings - 映射数组
 * @param {string} fid - 文件ID
 * @param {string} fallbackEpisodeName - 备用集数名
 * @returns {Object|null} 匹配到的映射
 */
const findMappingByFid = (videoMappings, fid, fallbackEpisodeName = "") => {
    const target = String(fid || "");
    if (!target || !Array.isArray(videoMappings) || videoMappings.length === 0) {
        return null;
    }

    // 1. 优先按完整 fid 精确匹配
    const directMapping = videoMappings.find((m) => getMappingFileId(m) === target);
    if (directMapping) return directMapping;

    // 2. 兼容仅刮削首线路的情况：按 epIndex 回退匹配
    const targetEpisodeIndex = getFidEpisodeIndex(target);
    if (targetEpisodeIndex) {
        const indexMatched = videoMappings.find((m) => getFidEpisodeIndex(getMappingFileId(m)) === targetEpisodeIndex);
        if (indexMatched) return indexMatched;
    }

    // 3. 兜底：按集数名称匹配
    const normalizedName = normalizeEpisodeName(fallbackEpisodeName);
    if (normalizedName) {
        const nameMatched = videoMappings.find((m) => {
            const mappingEpisodeName = normalizeEpisodeName(m?.episodeName);
            const mappingFileName = normalizeEpisodeName(m?.file_name || m?.name);
            return mappingEpisodeName === normalizedName || mappingFileName === normalizedName;
        });
        if (nameMatched) return nameMatched;
    }

    return null;
};

/**
 * 构建刮削后的弹幕文件名
 * @param {Object} scrapeData - 刮削数据
 * @param {string} scrapeType - 刮削类型（movie/tv）
 * @param {Object} mapping - 集数映射
 * @param {string} fallbackVodName - 备用视频名
 * @param {string} fallbackEpisodeName - 备用集数名
 * @returns {string} 弹幕文件名
 */
const buildScrapedDanmuFileName = (scrapeData, scrapeType, mapping, fallbackVodName, fallbackEpisodeName) => {
    if (!scrapeData) {
        return buildFileNameForDanmu(fallbackVodName, fallbackEpisodeName);
    }
    if (scrapeType === "movie") {
        return scrapeData.title || fallbackVodName;
    }
    const title = scrapeData.title || fallbackVodName;
    const seasonAirYear = scrapeData.seasonAirYear || "";
    const seasonNumber = mapping?.seasonNumber || 1;
    const episodeNumber = mapping?.episodeNumber || 1;
    return `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
};

/**
 * 匹配弹幕
 * @param {string} fileName - 文件名
 * @returns {Promise<Array>} 弹幕列表
 */
async function matchDanmu(fileName) {
    if (!DANMU_API || !fileName) {
        return [];
    }

    try {
        logInfo(`匹配弹幕: ${fileName}`);

        const matchUrl = `${DANMU_API}/api/v2/match`;
        const response = await OmniBox.request(matchUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: JSON.stringify({ fileName: fileName }),
        });

        if (response.statusCode !== 200) {
            logInfo(`弹幕匹配失败: HTTP ${response.statusCode}`);
            return [];
        }

        const matchData = JSON.parse(response.body);

        // 检查是否匹配成功
        if (!matchData.isMatched) {
            logInfo("弹幕未匹配到");
            return [];
        }

        // 获取matches数组
        const matches = matchData.matches || [];
        if (matches.length === 0) {
            return [];
        }

        // 取第一个匹配项
        const firstMatch = matches[0];
        const episodeId = firstMatch.episodeId;
        const animeTitle = firstMatch.animeTitle || "";
        const episodeTitle = firstMatch.episodeTitle || "";

        if (!episodeId) {
            return [];
        }

        // 构建弹幕名称
        let danmakuName = "弹幕";
        if (animeTitle && episodeTitle) {
            danmakuName = `${animeTitle} - ${episodeTitle}`;
        } else if (animeTitle) {
            danmakuName = animeTitle;
        } else if (episodeTitle) {
            danmakuName = episodeTitle;
        }

        // 构建弹幕URL
        const danmakuURL = `${DANMU_API}/api/v2/comment/${episodeId}?format=xml`;

        logInfo(`弹幕匹配成功: ${danmakuName}`);

        return [
            {
                name: danmakuName,
                url: danmakuURL,
            },
        ];
    } catch (error) {
        logInfo(`弹幕匹配失败: ${error.message}`);
        return [];
    }
}

/**
 * 构建播放源（按线路分组）
 * @param {Array} lines - 线路数组
 * @param {string} vodName - 视频名称
 * @param {string} videoId - 视频ID
 * @returns {Array} vod_play_sources 格式数组
 */
const buildPlaySourcesFromLines = (lines, vodName, videoId = "") => {
    if (!Array.isArray(lines) || lines.length === 0) return [];

    return lines.map((line, lineIndex) => {
        const playLinks = (line.playUrls || "").split('#').filter(Boolean);
        const episodes = playLinks.map((link, epIndex) => {
            const parts = link.split('$');
            const episodeName = parts[0] || '正片';
            const actualUrl = parts[1] || parts[0];
            const fid = `${videoId}#${lineIndex}#${epIndex}`;
            const combinedId = `${actualUrl}|||${encodeMeta({
                sid: String(videoId || ""),
                fid,
                v: vodName || "",
                e: episodeName
            })}`;

            return {
                name: episodeName,
                playId: combinedId,
                _fid: fid,
                _rawName: episodeName,
            };
        }).filter(e => e.playId);

        return {
            name: line.lineName || '多多追剧',
            episodes
        };
    }).filter(source => source.episodes && source.episodes.length > 0);
};

// ========== 主要接口函数 ==========

/**
 * 首页 - 获取分类列表和筛选器
 * @param {Object} params - 参数对象
 * @returns {Promise<Object>} 返回分类和筛选器配置
 */
async function home(params) {
    logInfo("进入首页");

    try {
        // 请求首页获取分类数据
        const res = await apiGet(`/api.php/web/index/home`);
        const list = [];
        const homeData = res.data.data || {};

        const categories = Array.isArray(homeData.categories) ? homeData.categories : [];
        const classList = categories.map(i => ({
            type_id: i.type_name,
            type_name: i.type_name
        }));

        const recommendBuckets = [];
        if (Array.isArray(homeData.recommend)) recommendBuckets.push(...homeData.recommend);
        categories.forEach(i => {
            if (Array.isArray(i.videos)) recommendBuckets.push(...i.videos);
        });

        const seen = new Set();
        recommendBuckets.forEach(k => {
            const vodId = String(k.vod_id || "").trim();
            if (!vodId || seen.has(vodId)) return;
            seen.add(vodId);
            k.vod_id = vodId;
            list.push(k);
        });

        logInfo(`分类获取完成，共 ${classList.length} 个`);

        logInfo(`首页响应：${JSON.stringify(list)}`);

        return {
            class: classList,
            filters: filterData,
            list
        };
    } catch (e) {
        logError('首页获取失败', e);
        // 返回默认分类
        return {
            class: [
                { type_id: '电影', type_name: '电影' },
                { type_id: '剧集', type_name: '剧集' },
                { type_id: '动漫', type_name: '动漫' },
                { type_id: '综艺', type_name: '综艺' }
            ],
            filters: filterData
        };
    }
}

/**
 * 分类 - 获取分类视频列表
 * @param {Object} params - 参数对象 { categoryId, page, filters }
 * @returns {Promise<Object>} 返回视频列表和分页信息
 */
async function category(params) {
    const { categoryId, page, filters } = params;
    const pg = parseInt(page) || 1;
    logInfo(`请求分类: ${categoryId}, 页码: ${pg}, 筛选: ${JSON.stringify(filters || {})}`);

    try {
        const PAGE_SIZE = 24;

        // 构建请求 URL
        let url = `/api.php/web/filter/vod?type_name=${encodeURIComponent(categoryId)}&page=${pg}&limit=${PAGE_SIZE}`;

        // 添加筛选参数
        const extend = filters || {};
        if (extend.class) {
            url += `&class=${encodeURIComponent(extend.class)}`;
        }
        if (extend.area) {
            url += `&area=${encodeURIComponent(extend.area)}`;
        }
        if (extend.year) {
            url += `&year=${encodeURIComponent(extend.year)}`;
        }

        // 默认按人气排序
        url += `&sort=hits`;

        logInfo(`请求 URL: ${url}`);

        // 发送请求
        const res = await apiGet(url);
        const items = res.data.data || [];

        // API 的 pageCount 不可靠，根据返回数量判断是否有下一页
        const hasMore = items.length >= PAGE_SIZE;

        logInfo(`获取到 ${items.length} 个视频`);

        const list = json2vods(items);

        logInfo(`list: ${JSON.stringify(list)}`);

        return {
            list: list,
            page: pg,
            pagecount: hasMore ? pg + 1 : pg
        };
    } catch (e) {
        logError('分类请求失败', e);
        return {
            list: [],
            page: pg,
            pagecount: 0
        };
    }
}

/**
 * 详情 - 获取视频详细信息和播放源
 * @param {Object} params - 参数对象 { videoId }
 * @returns {Promise<Object>} 返回视频详情
 */
async function detail(params) {
    const videoId = params.videoId;
    logInfo(`请求详情 ID: ${videoId}`);

    try {
        // 请求详情数据
        const res = await apiGet(`/api.php/web/vod/get_detail?vod_id=${videoId}`);
        const data = res.data.data[0];
        const vodplayer = Array.isArray(res.data.vodplayer) ? res.data.vodplayer : [];

        // 构建基本信息
        const vod = {
            vod_id: data.vod_id.toString(),
            vod_name: data.vod_name,
            vod_pic: data.vod_pic,
            vod_remarks: data.vod_remarks,
            vod_content: data.vod_content,
            vod_year: data.vod_year.toString() || '',
            vod_area: Array.isArray(data.vod_area) ? data.vod_area.join(',') : (data.vod_area || ''),
            vod_actor: Array.isArray(data.vod_actor) ? data.vod_actor.join(',') : (data.vod_actor || ''),
            vod_director: Array.isArray(data.vod_director) ? data.vod_director.join(',') : (data.vod_director || ''),
            type_name: data.type_name || ''
        };
        logInfo(`视频标题: ${vod.vod_name}`);

        // 解析播放线路
        const rawShows = String(data.vod_play_from || '').split('$$$');
        const rawUrlsList = String(data.vod_play_url || '').split('$$$');
        const validLines = [];
        const pushLine = (lineName, playUrls, order, sourceCode = "") => {
            if (!playUrls) return;
            validLines.push({ lineName, playUrls, order, sourceCode: String(sourceCode || "").trim() });
        };

        const missingPlayerLines = [];
        rawShows.forEach((showCode, index) => {
            const rawUrls = String(rawUrlsList[index] || "");

            const playerInfo = vodplayer.find(p => p.from === showCode);
            if (!playerInfo) {
                if (rawUrls) missingPlayerLines.push({ showCode, rawUrls });
                return;
            }

            const lineName = buildLineDisplayName(playerInfo.show, showCode);

            const urls = rawUrls.split('#').map(urlItem => {
                if (urlItem.includes('$')) {
                    const [episode, url] = urlItem.split('$');
                    return `${episode}$${showCode}@${playerInfo.decode_status}@${url}`;
                }
                return null;
            }).filter(Boolean);

            if (urls.length > 0) {
                const order = 1000 + (rawShows.length - 1 - index);
                pushLine(lineName, urls.join('#'), order, showCode);
            }
        });

        // 新站偶发缺失 vodplayer 元数据，兼容按直连兜底解析播放线路
        if (validLines.length === 0 && missingPlayerLines.length > 0) {
            missingPlayerLines.forEach(({ showCode, rawUrls }, lineIndex) => {
                const urls = rawUrls.split('#').map(urlItem => {
                    if (!urlItem || !urlItem.includes('$')) return null;
                    const [episode, url] = urlItem.split('$');
                    return `${episode}$${showCode}@0@${url}`;
                }).filter(Boolean);

                if (urls.length > 0) {
                    pushLine(buildLineDisplayName(showCode, showCode), urls.join('#'), lineIndex, showCode);
                }
            });
        }

        try {
            const aggregateRes = await apiGet(`/api.php/web/internal/search_aggregate?vod_id=${videoId}`);
            const aggregateItems = Array.isArray(aggregateRes?.data?.data) ? aggregateRes.data.data : [];
            aggregateItems.forEach((item, idx) => {
                const rawPlayUrl = String(item?.vod_play_url || "").trim();
                if (!rawPlayUrl) return;
                const sourceKey = String(item?.site_key || item?.vod_play_from || `external_${idx}`).trim();
                const decodeStatus = String(item?.decode_status ?? '').trim();
                const sourceName = String(item?.site_name || item?.vod_play_from || sourceKey || `站外线路${idx + 1}`).trim();
                const lineName = buildLineDisplayName(sourceName, sourceKey);
                const urls = rawPlayUrl.split('#').map(urlItem => {
                    if (!urlItem || !urlItem.includes('$')) return null;
                    const [episode, url] = urlItem.split('$');
                    if (!episode || !url) return null;
                    return `${episode}$${sourceKey}@${decodeStatus}@${url}`;
                }).filter(Boolean);
                if (!urls.length) return;
                const sortScore = Number(item?.sort);
                const order = Number.isFinite(sortScore) ? sortScore : idx;
                pushLine(lineName, urls.join('#'), order, sourceKey);
            });
        } catch (aggregateError) {
            logInfo(`聚合线路获取失败: ${aggregateError.message}`);
        }

        if (validLines.length === 0) {
            logError('没有可用的播放线路', new Error('validLines is empty'));
            return { list: [] };
        }

        // 指定蓝光线路固定前置，其余线路保持原有顺序
        const priorityLineOrder = ["JD4K", "JD2K", "BBA", "YYNB", "NBY"];
        const getPriorityRank = (line) => {
            const code = String(line?.sourceCode || "").trim().toUpperCase();
            const idx = priorityLineOrder.indexOf(code);
            return idx >= 0 ? idx : priorityLineOrder.length;
        };
        validLines.sort((a, b) => {
            const rankA = getPriorityRank(a);
            const rankB = getPriorityRank(b);
            if (rankA !== rankB) return rankA - rankB;
            if (rankA < priorityLineOrder.length) return 0;
            return (a.order || 0) - (b.order || 0);
        });

        const seenLineNames = new Set();
        const dedupedLines = [];
        validLines.forEach((line) => {
            const key = `${line.lineName}:::${line.playUrls}`;
            if (seenLineNames.has(key)) return;
            seenLineNames.add(key);
            dedupedLines.push(line);
        });

        logInfo(`找到 ${dedupedLines.length} 条播放线路`, {
            lineOrder: dedupedLines.map((line) => line.lineName)
        });

        // 转换为标准格式（按线路分组）
        const videoIdForScrape = String(videoId || "");
        const playSources = buildPlaySourcesFromLines(dedupedLines, vod.vod_name, videoIdForScrape);

        // ========== 刮削处理 ==========
        let scrapeData = null;
        let videoMappings = [];
        let scrapeType = "";
        const scrapeCandidates = [];

        // 准备刮削候选数据
        for (const source of playSources) {
            for (const ep of source.episodes || []) {
                if (!ep._fid) continue;
                scrapeCandidates.push({
                    fid: ep._fid,
                    file_id: ep._fid,
                    file_name: ep._rawName || ep.name || "正片",
                    name: ep._rawName || ep.name || "正片",
                    format_type: "video",
                });
            }
        }

        // 执行刮削
        if (scrapeCandidates.length > 0) {
            logInfo("准备刮削候选", {
                candidateCount: scrapeCandidates.length,
                candidatePreview: scrapeCandidates.slice(0, 5).map((item) => `${item.file_id}=>${item.file_name}`)
            });
            try {
                // 先快速读取已有刮削缓存，避免阻塞详情页返回
                const metadata = await withTimeout(OmniBox.getScrapeMetadata(videoIdForScrape), 300, "getScrapeMetadata(cache)");
                scrapeData = metadata?.scrapeData || null;
                videoMappings = metadata?.videoMappings || [];
                scrapeType = metadata?.scrapeType || "";
                logInfo(`刮削缓存读取完成`, {
                    hasScrapeData: !!scrapeData,
                    mappingCount: videoMappings.length,
                    scrapeType,
                    mappingPreview: videoMappings.slice(0, 5).map((m) => `${getMappingFileId(m) || "<empty>"}=>${m?.episodeName || m?.file_name || m?.name || ""}`)
                });
            } catch (error) {
                logInfo(`刮削缓存读取失败: ${error.message}`);
            }

            // 后台触发完整刮削，不阻塞详情页
            OmniBox.processScraping(
                    videoIdForScrape,
                    vod.vod_name || "",
                    vod.vod_name || "",
                    scrapeCandidates
                )
                .then((scrapingResult) => {
                    logInfo(`后台刮削处理完成: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);
                    return OmniBox.getScrapeMetadata(videoIdForScrape);
                })
                .then((metadata) => {
                    logInfo("后台刮削元数据更新完成", {
                        hasScrapeData: !!metadata?.scrapeData,
                        mappingCount: (metadata?.videoMappings || []).length,
                        scrapeType: metadata?.scrapeType || "",
                        mappingPreview: (metadata?.videoMappings || []).slice(0, 5).map((m) => `${getMappingFileId(m) || "<empty>"}=>${m?.episodeName || m?.file_name || m?.name || ""}`)
                    });
                })
                .catch((bgError) => {
                    logInfo(`后台刮削失败: ${bgError.message}`);
                });
        }

        let renameCount = 0;
        let mappingHitCount = 0;
        const mappingMissPreview = [];

        // 应用刮削结果到集数名称
        for (const source of playSources) {
            for (const ep of source.episodes || []) {
                const mapping = findMappingByFid(videoMappings, ep._fid, ep._rawName || ep.name || "");
                if (!mapping) {
                    if (mappingMissPreview.length < 5) {
                        mappingMissPreview.push({
                            fid: ep._fid,
                            episodeName: ep._rawName || ep.name || "",
                        });
                    }
                    continue;
                }

                mappingHitCount += 1;
                const oldName = ep.name;
                const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
                if (newName && newName !== oldName) {
                    ep.name = newName;
                    renameCount += 1;
                    logInfo(`应用刮削后集数名: ${oldName} -> ${newName}`);
                }
                ep._seasonNumber = mapping.seasonNumber;
                ep._episodeNumber = mapping.episodeNumber;
            }

            // 按季数和集数排序
            const hasEpisodeNumber = (source.episodes || []).some(
                (ep) => ep._episodeNumber !== undefined && ep._episodeNumber !== null
            );
            if (hasEpisodeNumber) {
                source.episodes.sort((a, b) => {
                    const seasonA = a._seasonNumber || 0;
                    const seasonB = b._seasonNumber || 0;
                    if (seasonA !== seasonB) return seasonA - seasonB;
                    const episodeA = a._episodeNumber || 0;
                    const episodeB = b._episodeNumber || 0;
                    return episodeA - episodeB;
                });
            }
        }

        logInfo("详情刮削改名统计", {
            sourceCount: playSources.length,
            mappingCount: videoMappings.length,
            mappingHitCount,
            renameCount,
            mappingMissPreview,
        });

        // 构建最终的播放源数据
        vod.vod_play_sources = playSources.map((source) => ({
            name: source.name,
            episodes: (source.episodes || []).map((ep) => ({
                name: ep.name,
                playId: ep.playId,
            })),
        }));

        // 应用刮削元数据到视频信息
        if (scrapeData) {
            vod.vod_name = scrapeData.title || vod.vod_name;
            if (scrapeData.posterPath) {
                vod.vod_pic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
            }
            if (scrapeData.overview) {
                vod.vod_content = scrapeData.overview;
            }
            if (scrapeData.releaseDate) {
                vod.vod_year = String(scrapeData.releaseDate).substring(0, 4) || vod.vod_year;
            }

            // 演员信息
            const actors = (scrapeData.credits?.cast || [])
                .slice(0, 5)
                .map((c) => c?.name)
                .filter(Boolean)
                .join(",");
            if (actors) {
                vod.vod_actor = actors;
            }

            // 导演信息
            const directors = (scrapeData.credits?.crew || [])
                .filter((c) => c?.job === "Director" || c?.department === "Directing")
                .slice(0, 3)
                .map((c) => c?.name)
                .filter(Boolean)
                .join(",");
            if (directors) {
                vod.vod_director = directors;
            }
        }

        OmniBox.log("info", `详情处理完成，播放源数: ${JSON.stringify(vod)}`);

        return {
            list: [vod]
        };
    } catch (e) {
        logError('详情获取失败', e);
        return { list: [] };
    }
}

/**
 * 搜索 - 搜索视频
 * @param {Object} params - 参数对象 { keyword, page }
 * @returns {Promise<Object>} 返回搜索结果
 */
async function search(params) {
    const wd = params.keyword || params.wd || "";
    const pg = parseInt(params.page) || 1;
    logInfo(`搜索关键词: ${wd}, 页码: ${pg}`);

    try {
        const res = await apiGet(`/api.php/web/search/index?wd=${encodeURIComponent(wd)}&page=${pg}&limit=50`);
        const items = res.data.data || [];
        const hasMore = items.length >= 50;

        logInfo(`搜索到 ${items.length} 个结果`);

        return {
            list: json2vods(items),
            page: pg,
            pagecount: hasMore ? pg + 1 : pg
        };
    } catch (e) {
        logError('搜索失败', e);
        return {
            list: [],
            page: pg,
            pagecount: 0
        };
    }
}

/**
 * 播放 - 解析播放地址
 * @param {Object} params - 参数对象 { playId, flag, vodId, vodName, episodeName }
 * @returns {Promise<Object>} 返回播放信息
 */
async function play(params) {
    let playId = params.playId;
    const flag = params.flag || "";
    logInfo(`准备播放 ID: ${playId}, flag: ${flag}`);

    let vodName = "";
    let episodeName = "";
    let playMeta = {};

    // 解析透传参数
    if (playId && playId.includes("|||")) {
        const [mainPlayId, metaB64] = playId.split("|||");
        playId = mainPlayId;
        playMeta = decodeMeta(metaB64 || "");
        vodName = playMeta.v || "";
        episodeName = playMeta.e || "";
        logInfo(`解析透传信息 - 视频: ${vodName}, 集数: ${episodeName}`);
    }

    // 读取刮削元数据（用于弹幕匹配）
    let scrapedDanmuFileName = "";
    try {
        const videoIdFromParam = params.vodId ? String(params.vodId) : "";
        const videoIdFromMeta = playMeta?.sid ? String(playMeta.sid) : "";
        const videoIdForScrape = videoIdFromParam || videoIdFromMeta;

        if (videoIdForScrape) {
            const metadata = await withTimeout(OmniBox.getScrapeMetadata(videoIdForScrape), 1800, "getScrapeMetadata(play)");
            if (metadata && metadata.scrapeData) {
                const mapping = findMappingByFid(metadata.videoMappings || [], playMeta?.fid, playMeta?.e || episodeName || "");
                scrapedDanmuFileName = buildScrapedDanmuFileName(
                    metadata.scrapeData,
                    metadata.scrapeType || "",
                    mapping,
                    vodName,
                    episodeName
                );
                if (metadata.scrapeData.title) {
                    vodName = metadata.scrapeData.title;
                }
                if (mapping?.episodeName) {
                    episodeName = mapping.episodeName;
                }
            }
        }
    } catch (error) {
        logInfo(`读取刮削元数据失败: ${error.message}`);
    }

    try {
        // 解析播放参数：线路代码@解码状态@URL
        const parts = playId.split('@');
        const play_from = parts[0];              // 线路代码 (NBY, BBA, YYNB, JD4K...)
        const decode_status = parts[1];          // 是否需要解码 (0=直连, 1=加密)
        const raw_url = parts.slice(2).join('@'); // URL 本身可能含 @

        logInfo(`播放参数 - 线路: ${play_from}, 解码状态: ${decode_status}, URL: ${raw_url.substring(0, 50)}...`);

        let finalUrl = raw_url;
        let parseFlag = 0;
        let playHeader = PLAY_HEADERS;

        // 1. 如果已经是 HTTP URL
        if (isHttpUrl(raw_url)) {
            finalUrl = raw_url;
            parseFlag = needsParser(raw_url) ? 1 : 0;
            logInfo(`直连 URL: ${finalUrl.substring(0, 80)}...`);
        }
        // 2. 如果是加密 URL，使用 WASM 解码
        else if (decode_status === '1' || !isHttpUrl(raw_url)) {
            const decoded = await decodeEncryptedUrl(raw_url, play_from);
            if (decoded && isHttpUrl(decoded)) {
                finalUrl = decoded;
                parseFlag = needsParser(decoded) ? 1 : 0;
                logInfo(`解码成功: ${play_from} -> ${finalUrl.substring(0, 80)}...`);
            } else {
                logError('解码失败', new Error(`无法解码 ${play_from}: ${raw_url.substring(0, 40)}...`));
                // 解码失败，返回空地址
                return {
                    urls: [{ name: "多多追剧", url: "" }],
                    parse: 0,
                    header: PLAY_HEADERS
                };
            }
        }

        // 3. 非直链尝试嗅探真实视频地址
        if (isHttpUrl(finalUrl) && !isDirectPlayable(finalUrl)) {
            const sniffed = await sniffPlayUrl(finalUrl);
            if (sniffed && sniffed.url) {
                finalUrl = sniffed.url;
                playHeader = sniffed.header || PLAY_HEADERS;
                parseFlag = 0;
                logInfo(`嗅探成功: ${finalUrl.substring(0, 80)}...`);
            } else if (!needsParser(finalUrl)) {
                parseFlag = 1;
            }
        }

        // 构建播放响应
        const playResponse = {
            urls: [{ name: "多多追剧", url: finalUrl }],
            parse: parseFlag,
            header: playHeader
        };

        // ========== 弹幕匹配 ========== 
        if (DANMU_API && (vodName || params.vodName)) {
            const finalVodName = vodName || params.vodName;
            const finalEpisodeName = episodeName || params.episodeName || '';

            const fileName = scrapedDanmuFileName || buildFileNameForDanmu(finalVodName, finalEpisodeName);
            logInfo(`尝试匹配弹幕文件名: ${fileName}`);

            if (fileName) {
                const danmakuList = await matchDanmu(fileName);
                if (danmakuList && danmakuList.length > 0) {
                    playResponse.danmaku = danmakuList;
                    logInfo(`弹幕匹配成功，共 ${danmakuList.length} 条`);
                }
            }
        }

        return playResponse;
    } catch (error) {
        logError("播放解析失败", error);
        return {
            urls: [{ name: "多多追剧", url: "" }],
            parse: 0,
            header: PLAY_HEADERS
        };
    }
}

// ========== 导出模块 ==========

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(1, "88看球", function (module, exports, require) {
// @name 88看球
// @dependencies: axios, cheerio, crypto-js
// @version 1.1.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/88看球.js
/**
 * 刮削：不支持
 * 弹幕：不支持
 * 嗅探：不支持
 *
 * 说明：
 * 1. 本脚本由 `本地调试/88看球.js` 转换为 OmniBox 标准模板结构。
 * 2. 接口包含：`home` / `category` / `search` / `detail` / `play`。
 * 3. 详情接口将旧式 `vod_play_from + vod_play_url` 转换为 `vod_play_sources`。
 * 4. `playId` 使用 Base64(JSON) 透传，播放阶段解码后按原逻辑返回 `parse=1`。
 *
 * 变更记录：
 * - v1.1.0：网站改版，分类由4大类改为24子类，移除无效筛选；play-url API 改为 /source
 *
 * 环境变量：
 * - `KANQIU_HOST`：88看球域名，默认 `http://www.88kanqiu.cc`
 */

const axios = require("axios");
const http = require("http");
const https = require("https");
const cheerio = require("cheerio");
const CryptoJS = require("crypto-js");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const HOST = process.env.KANQIU_HOST || "http://www.88kanqiu.cc";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const DEFAULT_PIC = "https://pic.imgdb.cn/item/657673d6c458853aeff94ab9.jpg";

const DEFAULT_HEADERS = {
  "User-Agent": UA,
  Referer: `${HOST}/`,
};

const axiosInstance = axios.create({
  timeout: 60 * 1000,
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  httpAgent: new http.Agent({ keepAlive: true }),
});

// ==================== 日志工具 ====================
function logInfo(message, data = null) {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[88看球] ${output}`);
}

function logError(message, error) {
  OmniBox.log("error", `[88看球] ${message}: ${error?.message || error}`);
}

// ==================== 编解码工具 ====================
function e64(text) {
  try {
    return CryptoJS.enc.Utf8.parse(String(text || "")).toString(CryptoJS.enc.Base64);
  } catch {
    return "";
  }
}

function d64(encodedText) {
  try {
    return CryptoJS.enc.Base64.parse(String(encodedText || "")).toString(CryptoJS.enc.Utf8);
  } catch {
    return "";
  }
}

/**
 * 兼容多种 id 格式，提取真实详情 URL 与展示名称
 * 支持：
 * 1) 新格式：Base64(JSON.stringify({ gameId, playUrl, name }))
 * 2) 旧格式：Base64(JSON.stringify({ vid, name }))
 * 3) 旧格式：`${vid}###${encodeURIComponent(name)}`
 * 4) 兜底：直接把入参当 URL
 */
function parseVodId(rawId) {
  const idText = String(rawId || "");
  let realId = idText;
  let displayName = "赛事直播";
  let gameId = "";
  let playUrl = "";

  const jsonText = d64(idText);
  if (jsonText && (jsonText.startsWith("{") || jsonText.startsWith("["))) {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed?.gameId || parsed?.playUrl) {
        realId = String(parsed.playUrl || parsed.vid || "");
        displayName = String(parsed.name || displayName);
        gameId = String(parsed.gameId || "");
        playUrl = String(parsed.playUrl || "");
        return { realId, displayName, gameId, playUrl };
      }
      if (parsed?.vid) {
        realId = String(parsed.vid);
        displayName = String(parsed.name || displayName);
        const match = realId.match(/\/live\/(\d+)\//);
        if (match) gameId = match[1];
        playUrl = realId;
        return { realId, displayName, gameId, playUrl };
      }
    } catch {
      // 忽略，继续尝试旧格式
    }
  }

  if (idText.includes("###")) {
    const parts = idText.split("###", 2);
    realId = parts[0] || "";
    displayName = decodeURIComponent(parts[1] || "赛事直播");
    const match = realId.match(/\/live\/(\d+)\//);
    if (match) gameId = match[1];
    playUrl = realId;
    return { realId, displayName, gameId, playUrl };
  }

  const m = idText.match(/\/live\/(\d+)\//);
  if (m) gameId = m[1];
  playUrl = idText;
  return { realId, displayName, gameId, playUrl };
}

/**
 * 从 `-url` 接口返回中提取 links，兼容不同返回形态
 */
function parseLinksFromPlayApiResponse(responseData) {
  const raw = responseData?.data;

  if (Array.isArray(raw?.links)) {
    return raw.links;
  }

  if (typeof raw === "object" && Array.isArray(raw?.links)) {
    return raw.links;
  }

  if (typeof raw !== "string") {
    return [];
  }

  const candidates = [
    raw,
    raw.substring(6, Math.max(6, raw.length - 2)),
  ].filter(Boolean);

  for (const item of candidates) {
    // 尝试直接 JSON
    try {
      const direct = JSON.parse(item);
      if (Array.isArray(direct?.links)) return direct.links;
    } catch {
      // ignore
    }

    // 尝试 Base64(JSON)
    try {
      const decoded = Buffer.from(item, "base64").toString();
      const parsed = JSON.parse(decoded || "{}");
      if (Array.isArray(parsed?.links)) return parsed.links;
    } catch {
      // ignore
    }
  }

  return [];
}

// ==================== 业务工具 ====================
function getClasses() {
  return [
    { type_id: "", type_name: "全部直播" },
    { type_id: "1", type_name: "NBA" },
    { type_id: "2", type_name: "CBA" },
    { type_id: "20", type_name: "WNBA" },
    { type_id: "4", type_name: "篮球综合" },
    { type_id: "3", type_name: "世界杯" },
    { type_id: "8", type_name: "英超" },
    { type_id: "9", type_name: "西甲" },
    { type_id: "10", type_name: "意甲" },
    { type_id: "14", type_name: "德甲" },
    { type_id: "15", type_name: "法甲" },
    { type_id: "12", type_name: "欧冠" },
    { type_id: "13", type_name: "欧联" },
    { type_id: "7", type_name: "中超" },
    { type_id: "11", type_name: "亚冠" },
    { type_id: "27", type_name: "足总杯" },
    { type_id: "26", type_name: "美职联" },
    { type_id: "31", type_name: "中甲" },
    { type_id: "23", type_name: "足球综合" },
    { type_id: "21", type_name: "体育电视台" },
    { type_id: "29", type_name: "网球" },
    { type_id: "25", type_name: "NFL" },
    { type_id: "19", type_name: "羽毛球" },
    { type_id: "38", type_name: "棒球" },
  ];
}

function getFilters() {
  return {};
}

/**
 * 获取分类列表
 * @param {string} type 分类 ID
 * @param {Object} extend 扩展筛选
 * @returns {Promise<{list:Array,page:number,pagecount:number,limit:number}>}
 */
async function getCategoryList(type, extend = {}) {
  try {
    const cateId = extend?.cateId || type || "";
    const path = cateId ? `/match/${cateId}/live` : "";
    const url = `${HOST}${path}`;

    const response = await axiosInstance.get(url, { headers: { ...DEFAULT_HEADERS } });
    const $ = cheerio.load(response.data || "");

    const list = [];
    $(".list-group-item.group-game-item").each((_, element) => {
      const $el = $(element);
      const time = $el.find(".category-game-time").text()?.trim() || "";
      const gameType = $el.find(".game-type").text()?.trim() || "";
      const teamNames = $el.find(".team-name");
      const homeTeam = teamNames.length > 0 ? teamNames.first().text().trim() : "";
      const awayTeam = teamNames.length > 1 ? teamNames.last().text().trim() : "";

      const name = `${time} ${gameType} ${homeTeam} vs ${awayTeam}`.trim();
      if (!name || name === "vs") return;

      const payBtn = $el.find(".pay-btn");
      const gameId = payBtn.attr("data-id") || "";

      const btnPrimary = $el.find(".btn.btn-primary");
      const btnDefault = $el.find(".btn.btn-default");
      const btn = btnPrimary.length > 0 ? btnPrimary : btnDefault;

      let playUrl = "";
      let remark = "暂无";
      if (btn.length > 0) {
        playUrl = `${HOST}${btn.attr("href") || ""}`;
        remark = btn.text().trim().replace(/\s+/g, " ") || "暂无";
      }

      const imgs = $el.find("img.team-logo");
      let pic = imgs.length > 0 ? imgs.first().attr("data-src") || imgs.first().attr("src") || "" : "";
      if (!pic) pic = DEFAULT_PIC;
      if (!String(pic).startsWith("http")) pic = `${HOST}${pic}`;

      if (!gameId && !playUrl) return;

      const encodedId = e64(JSON.stringify({ gameId, playUrl, name }));
      list.push({
        vod_id: encodedId,
        vod_name: name,
        vod_pic: pic,
        vod_remarks: remark,
      });
    });

    return {
      list,
      page: 1,
      pagecount: 1,
      limit: list.length,
    };
  } catch (error) {
    logError("获取分类列表失败", error);
    return { list: [], page: 1, pagecount: 1, limit: 0 };
  }
}

/**
 * 拉取详情并转换播放源
 * @param {string} rawId 列表中的 vod_id
 * @returns {Promise<Object|null>}
 */
async function getDetailById(rawId) {
  try {
    const { realId, displayName, gameId, playUrl } = parseVodId(rawId);

    if (!realId && !gameId) {
      return null;
    }

    const gid = gameId || realId.match(/\/live\/(\d+)\//)?.[1] || "";
    const pageUrl = playUrl || realId;

    if (gid) {
      const playUrlApi = `${HOST}/live/${gid}/source`;
      try {
        const response = await axiosInstance.get(playUrlApi, {
          headers: {
            ...DEFAULT_HEADERS,
            Referer: `${HOST}/live/${gid}/play`,
          },
        });

        const links = parseLinksFromPlayApiResponse(response?.data);

        if (links && links.length > 0) {
          const episodes = links
            .filter((it) => it?.url)
            .map((it, index) => {
              const playData = {
                url: String(it.url || "").replace(/\*\*\*/g, "#"),
                headers: {
                  ...DEFAULT_HEADERS,
                  Referer: `${HOST}/live/${gid}/play`,
                },
                name: String(it.name || `直播源${index + 1}`),
              };
              return {
                name: String(it.name || `直播源${index + 1}`),
                playId: e64(JSON.stringify(playData)),
              };
            });

          return {
            vod_id: realId || gid,
            vod_name: displayName,
            vod_pic: "",
            vod_content: "实时体育直播",
            vod_play_sources: [
              {
                name: "88看球",
                episodes,
              },
            ],
          };
        }
      } catch (apiError) {
        logError("source 接口失败，回退到页面直链", apiError);
      }
    }

    if (pageUrl && pageUrl.startsWith("http")) {
      const playData = {
        url: pageUrl,
        headers: {
          ...DEFAULT_HEADERS,
        },
        name: "直播页",
      };
      return {
        vod_id: realId || gid,
        vod_name: displayName,
        vod_pic: "",
        vod_content: "实时体育直播",
        vod_play_sources: [
          {
            name: "88看球",
            episodes: [
              {
                name: "直播页",
                playId: e64(JSON.stringify(playData)),
              },
            ],
          },
        ],
      };
    }

    return null;
  } catch (error) {
    logError("获取详情失败", error);
    return null;
  }
}

// ==================== 标准接口：home ====================
/**
 * 首页数据（分类 + 筛选 + 推荐）
 */
async function home(params) {
  try {
    const classes = getClasses();
    const result = await getCategoryList("");

    return {
      class: classes,
      filters: getFilters(),
      list: result.list || [],
      page: 1,
      pagecount: 1,
      total: (result.list || []).length,
      limit: result.limit || (result.list || []).length,
    };
  } catch (error) {
    logError("home 失败", error);
    return {
      class: getClasses(),
      filters: getFilters(),
      list: [],
      page: 1,
      pagecount: 1,
      total: 0,
      limit: 0,
    };
  }
}

// ==================== 标准接口：category ====================
/**
 * 分类列表
 */
async function category(params) {
  try {
    const type = params?.id || params?.categoryId || params?.tid || "";
    const extend = params?.extend || params?.filters || {};
    const result = await getCategoryList(type, extend);

    return {
      list: result.list || [],
      page: 1,
      pagecount: 1,
      total: (result.list || []).length,
      limit: result.limit || (result.list || []).length,
    };
  } catch (error) {
    logError("category 失败", error);
    return {
      list: [],
      page: 1,
      pagecount: 1,
      total: 0,
      limit: 0,
    };
  }
}

// ==================== 标准接口：detail ====================
/**
 * 视频详情
 */
async function detail(params) {
  try {
    const id = params?.id || params?.videoId || "";
    const vod = await getDetailById(id);
    return {
      list: vod ? [vod] : [],
    };
  } catch (error) {
    logError("detail 失败", error);
    return { list: [] };
  }
}

// ==================== 标准接口：search ====================
/**
 * 搜索（源站暂无关键词搜索能力）
 */
async function search(params) {
  return {
    list: [],
    page: Number(params?.page || 1),
    pagecount: 1,
    total: 0,
    limit: 0,
  };
}

// ==================== 标准接口：play ==================== 
/**
 * 播放解析
 */
async function play(params) {
  try {
    const encoded = params?.id || params?.playId || "";
    const decoded = d64(encoded);
    const playData = JSON.parse(decoded || "{}");

    if (!playData?.url) {
      return {
        parse: 1,
        url: "",
        header: { ...DEFAULT_HEADERS },
      };
    }

    return {
      parse: 1,
      url: playData.url,
      header: {
        ...DEFAULT_HEADERS,
        ...(playData.headers || {}),
      },
    };
  } catch (error) {
    logError("play 失败", error);
    return {
      parse: 1,
      url: "",
      header: { ...DEFAULT_HEADERS },
    };
  }
}

module.exports = {
  home,
  category,
  detail,
  search,
  play,
};

const runner = require("spider_runner");
runner.run(module.exports);


});

_load(2, "iKanBot", function (module, exports, require) {
// @name iKanBot
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: axios, cheerio
// @version 1.0.3
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/iKanBot.js


/**
 * ============================================================================
 * iKanBot资源 - OmniBox 爬虫脚本
 * ============================================================================
 */
const axios = require("axios");
const cheerio = require("cheerio");
const http = require("http");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const ikanbotConfig = {
    host: "https://www1.ikanbot.com",
    headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1"
    }
};
const DANMU_API = process.env.DANMU_API || "";

const axiosInstance = axios.create({
    timeout: 15000,
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
    httpAgent: new http.Agent({ keepAlive: true })
});

const PAGE_LIMIT = 20;

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    OmniBox.log("info", `[iKanBot-DEBUG] ${output}`);
};

const logError = (message, error) => {
    OmniBox.log("error", `[iKanBot-DEBUG] ${message}: ${error.message || error}`);
};

const encodeMeta = (obj) => {
    try {
        return Buffer.from(JSON.stringify(obj || {}), 'utf8').toString('base64');
    } catch {
        return '';
    }
};

const decodeMeta = (str) => {
    try {
        const raw = Buffer.from(str || '', 'base64').toString('utf8');
        return JSON.parse(raw || '{}');
    } catch {
        return {};
    }
};

/**
 * 图像地址修复 - 保留原版复杂逻辑
 */
const fixImageUrl = (imageUrl, baseURL = "", referer = "") => {
    if (!imageUrl) return '';

    let url = '';

    if (imageUrl.startsWith('http')) {
        url = imageUrl;
    } else if (imageUrl.startsWith('//')) {
        url = 'https:' + imageUrl;
    } else if (imageUrl.startsWith('/')) {
        url = ikanbotConfig.host + imageUrl;
    } else {
        url = ikanbotConfig.host + '/' + imageUrl.replace(/^\.?\//, '');
    }

    const isExternalUrl = !url.includes(ikanbotConfig.host) && url.startsWith('http');
    const isDouban = url.includes('doubanio.com');

    if (isDouban) {
        try {
            const finalReferer = referer || 'https://movie.douban.com';
            const urlWithHeaders = `${url}@Referer=${finalReferer}`;
            const encodedUrl = encodeURIComponent(urlWithHeaders);
            const proxyUrl = `${baseURL}/api/proxy/image?url=${encodedUrl}`;
            // logInfo("图片分组: 豆瓣代理", { input: imageUrl, finalUrl: url, referer: finalReferer, result: proxyUrl });
            return proxyUrl;
        } catch (error) {
            logError("处理豆瓣图片失败", error);
            return url;
        }
    }

    if (isExternalUrl) {
        try {
            let finalReferer = referer;
            if (!finalReferer) {
                try {
                    const urlObj = new URL(url);
                    finalReferer = `${urlObj.protocol}//${urlObj.host}`;
                } catch {
                    finalReferer = ikanbotConfig.host;
                }
            }
            const urlWithHeaders = `${url}@Referer=${finalReferer}`;
            const encodedUrl = encodeURIComponent(urlWithHeaders);
            const proxyUrl = `${baseURL}/api/proxy/image?url=${encodedUrl}`;
            // logInfo("图片分组: 外部代理", { input: imageUrl, finalUrl: url, referer: finalReferer, result: proxyUrl });
            return proxyUrl;
        } catch (error) {
            logError("处理图片 URL 失败", error);
            return url;
        }
    }

    // logInfo("图片分组: 直连", { input: imageUrl, finalUrl: url, result: url });
    return url;
};

// ========== 弹幕工具函数 ==========
const preprocessTitle = (title) => {
    if (!title) return "";
    return title
        .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]/g, " ")
        .replace(/[hH]\\.?26[45]/g, " ")
        .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
        .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ");
};

const chineseToArabic = (cn) => {
    const map = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
    if (!isNaN(cn)) return parseInt(cn, 10);
    if (cn.length === 1) return map[cn] || cn;
    if (cn.length === 2) {
        if (cn[0] === '十') return 10 + map[cn[1]];
        if (cn[1] === '十') return map[cn[0]] * 10;
    }
    if (cn.length === 3) return map[cn[0]] * 10 + map[cn[2]];
    return cn;
};

const extractEpisode = (title) => {
    if (!title) return "";
    const processedTitle = preprocessTitle(title).trim();

    const cnMatch = processedTitle.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
    if (cnMatch) return String(chineseToArabic(cnMatch[1]));

    const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
    if (seMatch) return seMatch[1];

    const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
    if (epMatch) return epMatch[1];

    const bracketMatch = processedTitle.match(/[\[\(【(](\d{1,3})[\]\)】)]/);
    if (bracketMatch) {
        const num = bracketMatch[1];
        if (!["720", "1080", "480"].includes(num)) return num;
    }

    return "";
};

const buildFileNameForDanmu = (vodName, episodeTitle) => {
    if (!vodName) return "";
    if (!episodeTitle || episodeTitle === '正片' || episodeTitle === '播放') return vodName;

    const digits = extractEpisode(episodeTitle);
    if (digits) {
        const epNum = parseInt(digits, 10);
        if (epNum > 0) {
            if (epNum < 10) return `${vodName} S01E0${epNum}`;
            return `${vodName} S01E${epNum}`;
        }
    }
    return vodName;
};

const buildScrapedEpisodeName = (scrapeData, mapping, originalName) => {
    if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
        return originalName;
    }
    if (mapping.episodeName) {
        const epName = mapping.episodeNumber + "." + mapping.episodeName;
        return epName;
    }
    if (scrapeData && Array.isArray(scrapeData.episodes)) {
        const hit = scrapeData.episodes.find((ep) => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber);
        if (hit?.name) {
            return `${hit.episodeNumber}.${hit.name}`;
        }
    }
    return originalName;
};

const buildScrapedDanmuFileName = (scrapeData, scrapeType, mapping, fallbackVodName, fallbackEpisodeName) => {
    if (!scrapeData) {
        return buildFileNameForDanmu(fallbackVodName, fallbackEpisodeName);
    }
    if (scrapeType === 'movie') {
        return scrapeData.title || fallbackVodName;
    }
    const title = scrapeData.title || fallbackVodName;
    const seasonAirYear = scrapeData.seasonAirYear || '';
    const seasonNumber = mapping?.seasonNumber || 1;
    const episodeNumber = mapping?.episodeNumber || 1;
    return `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;
};

const matchDanmu = async (fileName) => {
    if (!DANMU_API || !fileName) return [];

    try {
        logInfo(`匹配弹幕: ${fileName}`);
        const matchUrl = `${DANMU_API}/api/v2/match`;
        const response = await OmniBox.request(matchUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: JSON.stringify({ fileName }),
        });

        if (response.statusCode !== 200) {
            logInfo(`弹幕匹配失败: HTTP ${response.statusCode}`);
            return [];
        }

        const matchData = JSON.parse(response.body);
        if (!matchData.isMatched) {
            logInfo("弹幕未匹配到");
            return [];
        }

        const matches = matchData.matches || [];
        if (matches.length === 0) return [];

        const firstMatch = matches[0];
        const episodeId = firstMatch.episodeId;
        const animeTitle = firstMatch.animeTitle || "";
        const episodeTitle = firstMatch.episodeTitle || "";
        if (!episodeId) return [];

        let danmakuName = "弹幕";
        if (animeTitle && episodeTitle) {
            danmakuName = `${animeTitle} - ${episodeTitle}`;
        } else if (animeTitle) {
            danmakuName = animeTitle;
        } else if (episodeTitle) {
            danmakuName = episodeTitle;
        }

        return [{
            name: danmakuName,
            url: `${DANMU_API}/api/v2/comment/${episodeId}?format=xml`,
        }];
    } catch (error) {
        logInfo(`弹幕匹配失败: ${error.message}`);
        return [];
    }
};

/**
 * 获取HTML内容
 */
const getHtml = async (url, headers = ikanbotConfig.headers) => {
    try {
        const response = await axiosInstance.get(url, { headers });
        return response.data;
    } catch (error) {
        logError(`获取HTML失败: ${url}`, error);
        return null;
    }
};

/**
 * 提取token逻辑 - 保留原版算法
 */
const extractToken = ($) => {
    const currentId = $('#current_id').val();
    let eToken = $('#e_token').val();
    if (!currentId || !eToken) return '';
    
    const idLength = currentId.length;
    const subId = currentId.substring(idLength - 4, idLength);
    let keys = [];
    
    for (let i = 0; i < subId.length; i++) {
        const curInt = parseInt(subId[i]);
        const splitPos = curInt % 3 + 1;
        keys[i] = eToken.substring(splitPos, splitPos + 8);
        eToken = eToken.substring(splitPos + 8, eToken.length);
    }
    
    return keys.join('');
};

/**
 * 解析播放源 - 适配 OmniBox 格式
 */
const parsePlaySourcesFromIkan = (playFrom, playList, vodName = '', videoId = '') => {
    // logInfo("开始解析iKanBot播放源", { from: playFrom, list: playList });
    
    const playSources = [];
    if (!playFrom || !playList) return playSources;
    
    const froms = playFrom.split('$$$');
    const urls = playList.split('$$$');
    
    for (let i = 0; i < froms.length; i++) {
        const sourceName = froms[i] || `线路${i + 1}`;
        const sourceItems = urls[i] ? urls[i].split('#') : [];
        
        const episodes = sourceItems.map((item, epIndex) => {
            const parts = item.split('$');
            const episodeName = parts[0] || '正片';
            const actualPlayId = parts[1] || parts[0];
            const fid = `${videoId}#${i}#${epIndex}`;
            return {
                name: episodeName,
                playId: `${actualPlayId}|||${encodeMeta({ sid: videoId, fid, v: vodName || '', e: episodeName })}`,
                _fid: fid,
                _rawName: episodeName,
            };
        }).filter(e => e.playId);
        
        if (episodes.length > 0) {
            playSources.push({
                name: sourceName,
                episodes: episodes
            });
        }
    }
    
    // logInfo("播放源解析结果", playSources);
    return playSources;
};

// ========== 接口实现 ==========

/**
 * 首页
 */
async function home(params, context) {
    logInfo("进入首页");
    
    try {
        const baseURL = params?.context?.baseURL || params?.baseURL || "";
        // 获取分类
        const classes = [];
        
        // 电影分类
        const movieHtml = await getHtml(ikanbotConfig.host + "/hot/index-movie-热门.html");
        if (movieHtml) {
            const $ = cheerio.load(movieHtml);
            const title = $('title:first').text().split('-')[0].substring(2);
            classes.push({
                type_id: "/hot/index-movie-热门.html",
                type_name: title
            });
        }
        
        // 电视剧分类
        const tvHtml = await getHtml(ikanbotConfig.host + "/hot/index-tv-热门.html");
        if (tvHtml) {
            const $ = cheerio.load(tvHtml);
            const title = $('title:first').text().split('-')[0].substring(2);
            classes.push({
                type_id: "/hot/index-tv-热门.html",
                type_name: title
            });
        }
        
        // 获取首页推荐
        const html = await getHtml(ikanbotConfig.host);
        const list = [];
        
        if (html) {
            const $ = cheerio.load(html);
            const items = $('div.v-list a.item');
            
            items.each((_, item) => {
                const img = $(item).find('img:first');
                const imgSrc = img.attr('data-src') || img.attr('src') || '';
                
                list.push({
                    vod_id: $(item).attr('href'),
                    vod_name: img.attr('alt') || $(item).find('.title').text() || '未知标题',
                    vod_pic: fixImageUrl(imgSrc, context.baseURL),
                    vod_remarks: $(item).find('.label').text() || ''
                });
            });
        }
        
        return {
            class: classes,
            list: list.slice(0, 20)
        };
    } catch (e) {
        logError("首页获取失败", e);
        return { class: [], list: [] };
    }
}

/**
 * 分类列表
 */
async function category(params, context) {
    const { categoryId, page } = params;
    const pg = parseInt(page) || 1;
    const baseURL = context?.baseURL || params?.baseURL || "";
    
    logInfo(`请求分类: ${categoryId}, 页码: ${pg}`);
    
    try {
        const link = ikanbotConfig.host + categoryId.replace('.html', pg > 1 ? `-p-${pg}.html` : '.html');
        const html = await getHtml(link);
        
        if (!html) {
            return { list: [], page: pg, pagecount: 1 };
        }
        
        const $ = cheerio.load(html);
        const items = $('div.v-list a.item');
        const list = [];
        
        items.each((_, item) => {
            const img = $(item).find('img:first');
            const imgSrc = img.attr('data-src') || img.attr('src') || '';
            
            list.push({
                vod_id: $(item).attr('href'),
                vod_name: img.attr('alt') || $(item).text().trim(),
                vod_pic: fixImageUrl(imgSrc, baseURL),
                vod_remarks: $(item).find('.label').text() || ''
            });
        });
        
        return {
            list: list,
            page: pg,
            pagecount: list.length >= PAGE_LIMIT ? pg + 1 : pg
        };
    } catch (e) {
        logError("分类请求失败", e);
        return { list: [], page: pg, pagecount: 0 };
    }
}

/**
 * 详情页
 */
async function detail(params, context) {
    const videoId = params.videoId;
    const baseURL = context?.baseURL || params?.baseURL || "";
    logInfo(`请求详情 ID: ${videoId}`);
    
    try {
        const html = await getHtml(ikanbotConfig.host + videoId);
        if (!html) return { list: [] };
        
        const $ = cheerio.load(html);
        const detail = $('div.detail');
        
        // 获取封面图片
        const coverImg = $('div.item-root > img');
        const coverSrc = coverImg.attr('data-src') || coverImg.attr('src') || '';
        
        // 提取token
        const token = extractToken($);
        const pureVideoId = videoId.substring(videoId.lastIndexOf('/') + 1);
        
        // 获取播放资源
        const resUrl = ikanbotConfig.host + '/api/getResN?videoId=' + pureVideoId + '&mtype=2&token=' + token;
        const resResponse = await axiosInstance.get(resUrl, {
            headers: {
                ...ikanbotConfig.headers,
                'Referer': ikanbotConfig.host
            }
        });
        
        const resData = resResponse.data;
        const apiList = resData.data?.list || [];
        
        let playlist = {};
        let arr = [];
        
        // 解析播放源
        for (const l of apiList) {
            try {
                const flagData = JSON.parse(l.resData);
                for (const f of flagData) {
                    const from = f.flag;
                    const urls = f.url;
                    if (!from || !urls) continue;
                    if (playlist[from]) continue;
                    playlist[from] = urls;
                }
            } catch (e) {
                logError('解析播放源失败', e);
            }
        }
        
        // 排序播放源
        for (const key in playlist) {
            if ('kuaikan' === key) {
                arr.push({ flag: '快看', url: playlist[key], sort: 1 });
            } else if ('bfzym3u8' === key) {
                arr.push({ flag: '暴风', url: playlist[key], sort: 2 });
            } else if ('ffm3u8' === key) {
                arr.push({ flag: '非凡', url: playlist[key], sort: 3 });
            } else if ('lzm3u8' === key) {
                arr.push({ flag: '量子', url: playlist[key], sort: 4 });
            } else {
                arr.push({ flag: key, url: playlist[key], sort: 5 });
            }
        }
        
        arr.sort((a, b) => a.sort - b.sort);
        
        // 获取影片基本信息
        const title = $(detail).find('h2').text().trim();
        const actor = $(detail).find('h3:nth-child(5)').text();
        const director = $(detail).find('h3:nth-child(4)').text() || '';

        const playFrom = arr.map(val => val.flag).join("$$$");
        const playList = arr.map(val => val.url).join("$$$");
        
        // 解析为 OmniBox 格式
        const playSources = parsePlaySourcesFromIkan(playFrom, playList, title, String(videoId || ''));

        // 刮削处理
        let scrapeData = null;
        let videoMappings = [];
        let scrapeType = '';
        const scrapeCandidates = [];

        for (const source of playSources) {
            for (const ep of source.episodes || []) {
                if (!ep._fid) continue;
                scrapeCandidates.push({
                    fid: ep._fid,
                    file_id: ep._fid,
                    file_name: ep._rawName || ep.name || '正片',
                    name: ep._rawName || ep.name || '正片',
                    format_type: 'video',
                });
            }
        }

        if (scrapeCandidates.length > 0) {
            try {
                const videoIdForScrape = String(videoId || '');
                const scrapingResult = await OmniBox.processScraping(videoIdForScrape, title || '', title || '', scrapeCandidates);
                OmniBox.log('info', `[iKanBot-DEBUG] 刮削处理完成,结果: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);

                const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                scrapeData = metadata?.scrapeData || null;
                videoMappings = metadata?.videoMappings || [];
                scrapeType = metadata?.scrapeType || '';
            } catch (e) {
                logError('刮削处理失败', e);
            }
        }

        for (const source of playSources) {
            for (const ep of source.episodes || []) {
                const mapping = videoMappings.find((m) => m?.fileId === ep._fid);
                if (!mapping) continue;
                const oldName = ep.name;
                const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
                if (newName && newName !== oldName) {
                    ep.name = newName;
                    OmniBox.log('info', `[iKanBot-DEBUG] 应用刮削后源文件名: ${oldName} -> ${newName}`);
                }
                ep._seasonNumber = mapping.seasonNumber;
                ep._episodeNumber = mapping.episodeNumber;
            }

            const hasEpisodeNumber = (source.episodes || []).some((ep) => ep._episodeNumber !== undefined && ep._episodeNumber !== null);
            if (hasEpisodeNumber) {
                source.episodes.sort((a, b) => {
                    const seasonA = a._seasonNumber || 0;
                    const seasonB = b._seasonNumber || 0;
                    if (seasonA !== seasonB) return seasonA - seasonB;
                    const episodeA = a._episodeNumber || 0;
                    const episodeB = b._episodeNumber || 0;
                    return episodeA - episodeB;
                });
            }
        }

        const normalizedPlaySources = playSources.map((source) => ({
            name: source.name,
            episodes: (source.episodes || []).map((ep) => ({
                name: ep.name,
                playId: ep.playId,
            })),
        }));
        
        const fixedRemarks = '(线路利用网络爬虫技术获取,各线路的版本、清晰度、播放速度等存在差异请自行切换。建议避开晚上高峰时段。)';
        
        return {
            list: [{
                vod_id: videoId,
                vod_name: scrapeData?.title || title,
                vod_pic: scrapeData?.posterPath ? fixImageUrl(`https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`, baseURL) : fixImageUrl(coverSrc, baseURL),
                vod_content: fixedRemarks,
                vod_actor: (scrapeData?.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(',') || actor,
                vod_director: (scrapeData?.credits?.crew || []).filter((c) => c?.job === 'Director' || c?.department === 'Directing').slice(0, 3).map((c) => c?.name).filter(Boolean).join(',') || director,
                vod_remarks: '',
                vod_play_sources: normalizedPlaySources
            }]
        };
    } catch (e) {
        logError("详情获取失败", e);
        return { list: [] };
    }
}

/**
 * 搜索 - 保留严格匹配逻辑
 */
async function search(params, context) {
    const wd = params.keyword || params.wd || "";
    const pg = parseInt(params.page) || 1;
    const baseURL = context?.baseURL || params?.baseURL || "";
    
    logInfo(`搜索关键词: ${wd}, 页码: ${pg}`);
    
    try {
        const link = pg === 1
            ? ikanbotConfig.host + '/search?q=' + encodeURIComponent(wd)
            : ikanbotConfig.host + '/search?q=' + encodeURIComponent(wd) + '&p=' + pg;
        
        const html = await getHtml(link);
        if (!html) return { list: [], page: pg, pagecount: 1 };
        
        const $ = cheerio.load(html);
        const items = $('div.media');
        
        // 获取所有结果
        const allResults = [];
        items.each((_, item) => {
            const a = $(item).find('a:first');
            const img = $(item).find('img:first');
            const imgSrc = img.attr('data-src') || img.attr('src') || '';
            const remarks = $(item).find('span.label').first().text().trim();
            const title = img.attr('alt') || a.text().trim();
            
            allResults.push({
                vod_id: a.attr('href'),
                vod_name: title,
                vod_pic: fixImageUrl(imgSrc, baseURL),
                vod_remarks: remarks || '',
                originalTitle: title
            });
        });
        
        // 严格过滤:检查标题是否包含完整的搜索关键字
        const lowerKeyword = wd.toLowerCase().trim();
        const filteredList = allResults.filter(item => {
            const lowerTitle = item.vod_name.toLowerCase();
            
            // 1. 完全包含关键字
            if (lowerTitle.includes(lowerKeyword)) {
                return true;
            }
            
            // 2. 处理可能的关键字分割
            if (lowerKeyword.length >= 2) {
                const cleanTitle = lowerTitle.replace(/[·\-_:()()《》【】\s]/g, '');
                const cleanKeyword = lowerKeyword.replace(/[·\-_:()()《》【】\s]/g, '');
                
                if (cleanTitle.includes(cleanKeyword)) {
                    return true;
                }
                
                // 如果是中文,尝试字符级别匹配
                if (/[\u4e00-\u9fa5]/.test(lowerKeyword)) {
                    const keywordChars = cleanKeyword.split('');
                    return keywordChars.every(char => cleanTitle.includes(char));
                }
            }
            
            return false;
        });
        
        // 移除用于过滤的字段
        const finalList = filteredList.map(({ originalTitle, ...rest }) => rest);
        
        return {
            list: finalList,
            page: pg,
            pagecount: finalList.length >= PAGE_LIMIT ? pg + 1 : pg
        };
    } catch (e) {
        logError("搜索失败", e);
        return { list: [], page: pg, pagecount: 0 };
    }
}

/**
 * 播放
 */
async function play(params) {
    let playId = params.playId;
    logInfo(`准备播放 ID: ${playId}`);
    let vodName = "";
    let episodeName = "";
    let playMeta = {};
    let scrapedDanmuFileName = "";

    if (playId && playId.includes('|||')) {
        const [mainPlayId, metaB64] = playId.split('|||');
        playId = mainPlayId || '';
        playMeta = decodeMeta(metaB64 || '');
        vodName = playMeta.v || '';
        episodeName = playMeta.e || '';
        logInfo(`解析透传信息 - 视频: ${vodName}, 集数: ${episodeName}`);
    } else if (playId && playId.includes('|')) {
        const parts = playId.split('|');
        playId = parts.shift() || '';
        vodName = parts.shift() || '';
        episodeName = parts.join('|') || '';
        logInfo(`解析旧透传信息 - 视频: ${vodName}, 集数: ${episodeName}`);
    }

    try {
        const sourceVideoId = String(params.vodId || playMeta.sid || '');
        if (sourceVideoId) {
            const metadata = await OmniBox.getScrapeMetadata(sourceVideoId);
            if (metadata && metadata.scrapeData) {
                const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === playMeta?.fid);
                scrapedDanmuFileName = buildScrapedDanmuFileName(
                    metadata.scrapeData,
                    metadata.scrapeType || '',
                    mapping,
                    vodName,
                    episodeName
                );
                if (metadata.scrapeData.title) {
                    vodName = metadata.scrapeData.title;
                }
                if (mapping?.episodeName) {
                    episodeName = mapping.episodeName;
                }
            }
        }
    } catch (e) {
        logInfo(`读取刮削元数据失败: ${e.message}`);
    }
    
    // iKanBot 播放地址处理，支持嗅探
    let playUrl = playId;
    if (playUrl && !playUrl.startsWith('http')) {
        playUrl = playUrl.startsWith('/') ? ikanbotConfig.host + playUrl : ikanbotConfig.host + '/' + playUrl;
    }

    const isDirectPlayable = playUrl && playUrl.match(/\.(m3u8|mp4|flv|avi|mkv|ts)/i);
    let finalUrl = playUrl;
    let finalHeader = { ...ikanbotConfig.headers, Referer: ikanbotConfig.host };

    if (!isDirectPlayable && playUrl) {
        try {
            const sniffResult = await OmniBox.sniffVideo(playUrl);
            if (sniffResult && sniffResult.url) {
                finalUrl = sniffResult.url;
                finalHeader = sniffResult.header || finalHeader;
                logInfo("嗅探成功", { url: finalUrl });
            } else {
                logInfo("嗅探未返回有效地址");
            }
        } catch (e) {
            logInfo(`嗅探失败: ${e.message}`);
        }
    }

    const playResponse = {
        urls: [{ name: "默认", url: finalUrl }],
        parse: 0,
        header: finalHeader
    };

    if (DANMU_API && vodName) {
        const fileName = scrapedDanmuFileName || buildFileNameForDanmu(vodName, episodeName);
        logInfo(`尝试匹配弹幕文件名: ${fileName}`);
        if (fileName) {
            const danmakuList = await matchDanmu(fileName);
            if (danmakuList.length > 0) {
                playResponse.danmaku = danmakuList;
                logInfo("弹幕已添加到播放响应");
            }
        }
    } else if (!DANMU_API) {
        logInfo("DANMU_API 未配置，跳过弹幕匹配");
    }

    return playResponse;
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(3, "凡客TV", function (module, exports, require) {
// @name 凡客TV
// @author 梦
// @description 刮削：已接入，弹幕：未接入，嗅探：官方 playback_v2 直链优先（失败时页面回退）；适配新版 /ysapi 接口
// @dependencies crypto-js
// @version 1.4.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/凡客TV.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const CryptoJS = require("crypto-js");
const https = require("https");

const BASE_URL = "https://fktv.me";
const API_BASE = `${BASE_URL}/ysapi`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0";
const API_KEY = "9ed1a661a6ab787a";
const DEVICE_ID = "57nTmEknMZ146xw4KXGHDCHk1MjshRyY";
const PAGE_SIZE = 32;

const CATEGORIES = [
  { type_id: "movie", type_name: "电影" },
  { type_id: "tv", type_name: "电视剧" },
  { type_id: "comic", type_name: "动漫" },
  { type_id: "zy", type_name: "综艺" },
  { type_id: "short_tv", type_name: "短剧" },
  { type_id: "jlp", type_name: "纪录片" },
  { type_id: "js", type_name: "电影解说" }
];
const POSITION_NAMES = Object.fromEntries(CATEGORIES.map((it) => [it.type_id, it.type_name]));
const LEGACY_POSITIONS = {
  "1": "movie",
  "2": "tv",
  "3": "zy",
  "4": "comic",
  "5": "tv",
  "6": "jlp",
  "7": "js",
  "8": "short_tv"
};

function _json(data) {
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

async function _log(level, message, extra) {
  const suffix = typeof extra === "undefined" ? "" : ` | ${_json(extra)}`;
  await OmniBox.log(level, `[FKTV] ${message}${suffix}`);
}

function _safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function _normalizePagination(page, pageSize, total, pagecount) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 100) : 20;
  const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;
  const safePagecount = Number.isFinite(pagecount) && pagecount > 0
    ? pagecount
    : (safeTotal > 0 ? Math.ceil(safeTotal / safePageSize) : (safePage > 1 ? safePage : 1));
  return { page: safePage, pagecount: safePagecount, limit: safePageSize, total: safeTotal };
}

function _apiTime() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

function _encryptPayload(data, referer) {
  const outer = {
    deviceId: DEVICE_ID,
    token: "",
    domain: "fktv.me",
    referer: referer || `${BASE_URL}/`,
    user_agent: UA,
    shareCode: "",
    channel: "",
    ip: "",
    data: data || {}
  };
  const key = CryptoJS.enc.Utf8.parse(API_KEY);
  return CryptoJS.AES.encrypt(JSON.stringify(outer), key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString();
}

function _decryptResponse(text) {
  const value = String(text || "").trim();
  if (!value) throw new Error("接口返回为空");
  if (value.startsWith("{") || value.startsWith("[")) return _safeJsonParse(value, null);
  const key = CryptoJS.enc.Utf8.parse(API_KEY);
  const plain = CryptoJS.AES.decrypt(value, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString(CryptoJS.enc.Utf8);
  return _safeJsonParse(plain, null);
}

function _httpsPost(url, body, referer, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = Buffer.from(body, "utf8");
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: `${u.pathname}${u.search}`,
      method: "POST",
      rejectUnauthorized: false,
      timeout,
      headers: {
        "accept": "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        "content-type": "application/octet-stream",
        "content-length": String(data.length),
        "origin": BASE_URL,
        "referer": referer || `${BASE_URL}/`,
        "user-agent": UA,
        "deviceType": "pc",
        "version": "1.0",
        "time": _apiTime()
      }
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("timeout", () => req.destroy(new Error("请求超时")));
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function _apiPost(endpoint, data = {}, referer = `${BASE_URL}/`) {
  const url = `${API_BASE}/${endpoint}`;
  const body = _encryptPayload(data, referer);
  let res;
  try {
    res = await _httpsPost(url, body, referer);
  } catch (e) {
    await _log("warn", "HTTPS 调用接口失败，回退 OmniBox.request", { endpoint, message: e.message });
    res = await OmniBox.request(url, {
      method: "POST",
      headers: {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/octet-stream",
        "origin": BASE_URL,
        "referer": referer || `${BASE_URL}/`,
        "user-agent": UA,
        "deviceType": "pc",
        "version": "1.0",
        "time": _apiTime()
      },
      body,
      timeout: 20000
    });
    const raw = res && res.body ? res.body : res;
    res = { status: res?.statusCode || 200, body: Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw || "") };
  }

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`接口 HTTP ${res.status}: ${endpoint}`);
  }
  const json = _decryptResponse(res.body);
  if (!json || json.status !== "y") {
    throw new Error(json?.error || `接口返回异常: ${endpoint}`);
  }
  return json.data;
}

function _normalizePosition(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (POSITION_NAMES[raw]) return raw;
  if (LEGACY_POSITIONS[raw]) return LEGACY_POSITIONS[raw];
  const lowered = raw.toLowerCase();
  if (POSITION_NAMES[lowered]) return lowered;
  return Object.entries(POSITION_NAMES).find(([, name]) => name === raw)?.[0] || "";
}

function _absUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${BASE_URL}${value}`;
  return `${BASE_URL}/${value}`;
}

function _movieDetailUrl(item) {
  const id = String(item?.id || item?.movie_id || "").trim();
  const slug = String(item?.seo_slug || item?.slug || "").trim();
  return slug ? `${BASE_URL}/movie/${id}/${slug}` : `${BASE_URL}/movie/detail/${id}`;
}

function _mapVod(item, typeId = "") {
  const id = String(item?.id || item?.movie_id || "").trim();
  const name = String(item?.name || item?.movie_name || "").trim();
  if (!id || !name) return null;
  const position = _normalizePosition(item.position || typeId);
  const pic = _absUrl(item.img_y_source || item.img_x_source || item.img_y || item.img_x || "");
  const remarks = [
    item.area,
    item.language,
    item.release_at,
    item.child_title || item.category || POSITION_NAMES[position]
  ].filter(Boolean).join(" | ");
  return {
    vod_id: id,
    vod_name: name,
    vod_pic: pic,
    vod_url: _absUrl(item.canonical_path) || _movieDetailUrl(item),
    type_id: position,
    type_name: POSITION_NAMES[position] || item.child_title || item.category || "",
    vod_remarks: remarks
  };
}

function _dedupVodList(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).filter((it) => {
    if (!it || !it.vod_id || seen.has(it.vod_id)) return false;
    seen.add(it.vod_id);
    return true;
  });
}

async function _fetchMovieList(payload, referer) {
  const data = await _apiPost("movie/search", payload, referer);
  const rows = Array.isArray(data?.data) ? data.data : [];
  return {
    list: _dedupVodList(rows.map((row) => _mapVod(row, payload.position))),
    total: Number(data?.total) || rows.length,
    page: Number(data?.current_page) || Number(payload.page) || 1,
    pagecount: Number(data?.last_page) || 0
  };
}

function _pickEpisodeName(item, index = 0) {
  return String(item?.name || item?.title || `第${index + 1}集`).trim() || `第${index + 1}集`;
}

function _encodePlayId(meta) {
  return JSON.stringify({
    movie_id: meta.movie_id || "",
    link_id: meta.link_id || "",
    line_id: meta.line_id || "",
    line_name: meta.line_name || "",
    episode_name: meta.episode_name || "",
    page: meta.page || ""
  });
}

function _normalizeLegacyLinks(links) {
  return (Array.isArray(links) ? links : []).map((item) => {
    const url = item?.m3u8_url || item?.preview_m3u8_url || "";
    if (!url) return null;
    return { name: item.name || item.id || "线路", url: _absUrl(url), lineId: item.id || "" };
  }).filter(Boolean);
}

function _normalizePlayback(playback) {
  if (!playback || playback.version !== 2) return [];
  const rows = Array.isArray(playback.video_lines) ? playback.video_lines : [];
  return rows.map((line) => {
    const media = line?.h264 || line?.hevc;
    const path = media?.url || playback.play_url;
    if (!path) return null;
    return {
      lineId: String(line.line || ""),
      name: String(line.name || line.line || "线路"),
      url: _absUrl(path)
    };
  }).filter((it) => it && it.url);
}

function _buildDirectResult(urls, referer) {
  const mapped = urls.map((it) => ({ name: it.name, url: it.url }));
  const headers = {
    "User-Agent": UA,
    "Referer": referer || `${BASE_URL}/`,
    "Origin": BASE_URL
  };
  return {
    parse: 0,
    url: mapped.length === 1 ? mapped[0].url : undefined,
    urls: mapped,
    header: headers,
    headers
  };
}

function _buildFallback(pageUrl, name = "FKTV 接口未返回可播地址") {
  const headers = {
    "User-Agent": UA,
    "Referer": pageUrl,
    "Origin": BASE_URL
  };
  return {
    parse: 1,
    url: pageUrl,
    urls: [{ name, url: pageUrl }],
    header: headers,
    headers
  };
}

async function home() {
  const payload = { page: 1, page_size: PAGE_SIZE, is_hot: "y", order: "new" };
  let result;
  try {
    result = await _fetchMovieList(payload, `${BASE_URL}/`);
  } catch (e) {
    await _log("warn", "home 热门列表失败，回退最新列表", { message: e.message });
    result = await _fetchMovieList({ page: 1, page_size: PAGE_SIZE }, `${BASE_URL}/`);
  }
  await _log("info", "home 解析结果", { count: result.list.length, first: result.list[0] || null });
  return { class: CATEGORIES, list: result.list.slice(0, 24) };
}

async function category(params) {
  const page = params.page ? Number(params.page) : 1;
  const pageSize = params.page_size ? Number(params.page_size) : PAGE_SIZE;
  const position = _normalizePosition(params.type_id || params.cat_id || params.typeId || params.type || params.categoryId);
  const payload = { page, page_size: pageSize };
  if (position) payload.position = position;

  await _log("info", "category 入参", { params, payload });
  const result = await _fetchMovieList(payload, `${BASE_URL}/channel/${position || "movie"}`);
  await _log("info", "category 解析结果", { count: result.list.length, first: result.list[0] || null });
  return { ..._normalizePagination(result.page, pageSize, result.total, result.pagecount), list: result.list };
}

async function detail(params) {
  const id = String(params.videoId || params.vod_id || params.id || "").trim();
  await _log("info", "detail 入参", params);
  if (!id) return { list: [] };

  const movieId = (id.match(/([0-9a-f]{16})/i) || [])[1] || id;
  const pageUrl = id.startsWith("http") ? id : _movieDetailUrl({ id: movieId, seo_slug: "" });
  const data = await _apiPost("movie/detail", { id: movieId, link_id: "", is_simple: "y" }, pageUrl);
  const links = Array.isArray(data.links) ? data.links : [];
  const fallbackLink = data.link_id || links.find((it) => it.is_selected === "y")?.id || links[0]?.id || "";
  const episodes = (links.length ? links : (fallbackLink ? [{ id: fallbackLink, name: "正片" }] : [])).map((item, index) => ({
    name: _pickEpisodeName(item, index),
    playId: _encodePlayId({
      movie_id: data.id || movieId,
      link_id: item.id || fallbackLink,
      line_id: "",
      line_name: "",
      episode_name: _pickEpisodeName(item, index),
      page: _movieDetailUrl(data)
    })
  }));

  const playSources = episodes.length ? [{ name: "默认线路", episodes }] : [];
  const remarks = [
    data.area,
    data.language,
    data.release_at,
    data.child_title || data.category,
    data.play_error_type && data.play_error_type !== "none" ? data.play_error : ""
  ].filter(Boolean).join(" | ");
  const vod = {
    vod_id: data.id || movieId,
    vod_name: data.name || movieId,
    vod_pic: _absUrl(data.img_y_source || data.img_x_source || data.img_y || data.img_x || ""),
    vod_url: _movieDetailUrl(data),
    vod_content: data.description || "",
    vod_actor: data.actor || "",
    vod_director: data.director || "",
    vod_area: data.area || "",
    vod_year: data.release_at || "",
    vod_remarks: remarks,
    vod_play_from: "FKTV",
    vod_play_url: episodes.map((it) => `${it.name}$${it.playId}`).join("#"),
    vod_play_sources: playSources
  };

  await _log("info", "detail 解析结果", {
    id: vod.vod_id,
    name: vod.vod_name,
    episodeCount: episodes.length,
    playErrorType: data.play_error_type,
    playbackV2: !!data.playback_v2
  });
  return { list: [vod] };
}

async function _requestPlayDetail(meta) {
  const movieId = String(meta.movie_id || "").trim();
  const linkId = String(meta.link_id || "").trim();
  const pageUrl = meta.page || _movieDetailUrl({ id: movieId });
  const payload = { id: movieId, link_id: linkId, is_simple: "y" };
  const data = await _apiPost("movie/detail", payload, pageUrl);
  const selectedLink = linkId
    || data.link_id
    || (Array.isArray(data.links) && (data.links.find((it) => it.is_selected === "y")?.id || data.links[0]?.id))
    || "";
  let urls = _normalizePlayback(data.playback_v2);
  if (meta.line_id) {
    const picked = urls.filter((it) => it.lineId === meta.line_id);
    if (picked.length) urls = picked;
  }
  if (!urls.length) urls = _normalizeLegacyLinks(data.play_links);
  return { data, urls, pageUrl, selectedLink };
}

async function play(params) {
  try {
    await _log("info", "play 入参", params);
    const raw = String(params.playId || params.play_id || params.url || "").trim();
    if (!raw) throw new Error("播放标识为空");

    if (/\.(m3u8|mp4|flv)(\?|$)/i.test(raw)) {
      return _buildDirectResult([{ name: "直链播放", url: raw }], BASE_URL);
    }

    let meta = _safeJsonParse(raw, null);
    if (!meta && /^[0-9a-f]{32}$/i.test(raw)) meta = { movie_id: "", link_id: raw, page: "" };
    if (!meta?.movie_id && !meta?.link_id && /^https?:\/\//i.test(raw)) {
      const fallback = _buildFallback(raw);
      await _log("warn", "play 仅收到页面地址，回退嗅探页", fallback);
      return fallback;
    }
    if (meta.movie_id && !meta.page) meta.page = _movieDetailUrl({ id: meta.movie_id });
    await _log("info", "play 解析后的 playId", meta);

    const result = await _requestPlayDetail(meta);
    await _log("info", "play 接口结果", {
      movieId: meta.movie_id,
      requestedLinkId: meta.link_id,
      selectedLink: result.selectedLink,
      playErrorType: result.data.play_error_type,
      urls: result.urls
    });

    if (result.urls.length) return _buildDirectResult(result.urls, result.pageUrl);

    if (["need_vip", "captcha"].includes(result.data.play_error_type)) {
      const fallback = _buildFallback(result.pageUrl, result.data.play_error || "站点播放受限");
      await _log("warn", "play 官方接口受限，回退页面", { playErrorType: result.data.play_error_type, fallback });
      return fallback;
    }

    try {
      const sniff = await OmniBox.sniffVideo(result.pageUrl, { "User-Agent": UA, "Referer": result.pageUrl });
      if (sniff?.url) {
        const direct = _buildDirectResult([{ name: "嗅探播放", url: sniff.url }], result.pageUrl);
        direct.header = sniff.header || direct.header;
        direct.headers = sniff.header || direct.headers;
        await _log("info", "play 使用 sniff 结果返回", direct);
        return direct;
      }
    } catch (e) {
      await _log("warn", "play sniffVideo 失败", { message: e.message, sniffUrl: result.pageUrl });
    }

    return _buildFallback(result.pageUrl, "FKTV 接口未返回当前剧集可播地址");
  } catch (e) {
    await _log("error", "play 异常", { message: e.message, stack: e.stack });
    return { parse: 0, urls: [], url: "", header: {}, headers: {} };
  }
}

async function search(params) {
  const keyword = String(params.keyword || params.key || params.wd || "").trim();
  const page = params.page ? Number(params.page) : 1;
  const pageSize = params.page_size ? Number(params.page_size) : 20;
  await _log("info", "search 入参", params);
  if (!keyword) return { ..._normalizePagination(page, pageSize, 0), list: [] };

  const payload = { keywords: keyword, page, page_size: pageSize, is_search: "y" };
  const result = await _fetchMovieList(payload, `${BASE_URL}/movie/search`);
  await _log("info", "search 解析结果", { keyword, count: result.list.length, first: result.list[0] || null });
  return { ..._normalizePagination(result.page, pageSize, result.total, result.pagecount), list: result.list };
}

runner.run({ home, category, detail, search, play });

});

_load(4, "枝枝影视", function (module, exports, require) {
// @name 枝枝影视
// @description 页面解析：https://zzoc.cc，支持CF处理、首页、筛选分类、搜索、详情、多线路播放和嗅探兜底；依赖 axios
// @version 1.1.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/枝枝影视.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const axios = require("axios");
// ==================== CF 盾绕过配置 ====================
// 项目地址：https://github.com/FlareSolverr/FlareSolverr
// 优先读取站点专用变量，其次回退通用 FLARESOLVERR_URL；设置 ZHIZHI_CF_AUTO=0 可关闭自动处理。
const ZHIZHI_CF_COOKIE = process.env.ZHIZHI_CF_COOKIE || process.env.ZHIZHI_COOKIE || "";
const ZHIZHI_CF_AUTO = process.env.ZHIZHI_CF_AUTO !== "0";
const ZHIZHI_CF_CACHE_KEY = process.env.ZHIZHI_CF_CACHE_KEY || "zhizhi:cf_clearance";
const ZHIZHI_CF_MAX_AGE_SECONDS = parseInt(process.env.ZHIZHI_CF_MAX_AGE_SECONDS || "21600", 10) || 21600;
const ZHIZHI_CF_TIMEOUT_MS = parseInt(process.env.ZHIZHI_CF_TIMEOUT_MS || "45000", 10) || 45000;
const ZHIZHI_FLARESOLVERR_URL = process.env.ZHIZHI_FLARESOLVERR_URL || process.env.FLARESOLVERR_URL || "http://192.168.50.50:8191/v1";
const ZHIZHI_FLARESOLVERR_SESSION = process.env.ZHIZHI_FLARESOLVERR_SESSION || "";
const ZHIZHI_FLARESOLVERR_TIMEOUT_MS = parseInt(process.env.ZHIZHI_FLARESOLVERR_TIMEOUT_MS || String(ZHIZHI_CF_TIMEOUT_MS), 10) || ZHIZHI_CF_TIMEOUT_MS;
const ZHIZHI_CHROMIUM_BIN = process.env.ZHIZHI_CHROMIUM_BIN || "";
const ZHIZHI_BROWSER_DEBUGGING = process.env.ZHIZHI_BROWSER_DEBUGGING === "1";
let ZHIZHI_BROWSER_UA = text(process.env.ZHIZHI_BROWSER_UA || "");
const { promisify } = require("util");
const execFileAsync = promisify(require("child_process").execFile);

const HOST = String(process.env.ZHIZHI_HOST || "https://zzoc.cc").replace(/\/+$/, "");
const UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  Referer: `${HOST}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Upgrade-Insecure-Requests": "1",
};
const CLASS_LIST = [
  { type_id: "1", type_name: "电影" },
  { type_id: "2", type_name: "电视剧" },
  { type_id: "3", type_name: "综艺" },
  { type_id: "4", type_name: "动漫" },
];
const FILTER_VALUES = [
  {
    key: "area",
    name: "地区",
    value: ["", "大陆", "香港", "台湾", "美国", "日本", "韩国"]
      .map((value) => ({ name: value || "全部", value })),
  },
  {
    key: "year",
    name: "年份",
    value: ["", "2026", "2025", "2024", "2023", "2022", "2021", "2020"]
      .map((value) => ({ name: value || "全部", value })),
  },
];
const FILTERS = Object.fromEntries(CLASS_LIST.map((item) => [item.type_id, FILTER_VALUES]));

module.exports = { home, category, search, detail, play };
runner.run(module.exports);

function getBodyText(response) {
  const body = response && typeof response === "object"
    ? ("body" in response ? response.body : ("data" in response ? response.data : response))
    : response;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return body.toString();
  return String(body || "");
}

function cookiesFromSetCookie(values) {
  return (Array.isArray(values) ? values : [values])
    .map((item) => String(item || "").split(";")[0])
    .filter(Boolean);
}

function mergeCookies(current, incoming) {
  const map = new Map();
  const append = (value) => {
    String(value || "").split(/;\s*/).forEach((pair) => {
      const index = pair.indexOf("=");
      if (index <= 0) return;
      map.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    });
  };
  append(current);
  append(incoming);
  return [...map.entries()].filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join("; ");
}

function text(value) {
  return String(value ?? "").trim();
}

function buildCookieHeader(cookie = "") {
  const value = text(cookie);
  return value ? { Cookie: value } : {};
}

function cookiesArrayToString(cookies = []) {
  return (Array.isArray(cookies) ? cookies : [])
    .map((item) => ({ name: text(item?.name || ""), value: text(item?.value || "") }))
    .filter((item) => item.name && item.value)
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
}

async function getCachedCfCookie() {
  if (text(ZHIZHI_CF_COOKIE)) return text(ZHIZHI_CF_COOKIE);
  try {
    return text((await OmniBox.getCache(ZHIZHI_CF_CACHE_KEY)) || "");
  } catch (error) {
    OmniBox.log("warn", `[cf] 读取缓存失败: ${error.message}`);
    return "";
  }
}

async function setCachedCfCookie(cookie) {
  const value = text(cookie);
  if (!value || text(ZHIZHI_CF_COOKIE)) return;
  try {
    await OmniBox.setCache(ZHIZHI_CF_CACHE_KEY, value, ZHIZHI_CF_MAX_AGE_SECONDS);
  } catch (error) {
    OmniBox.log("warn", `[cf] 写入缓存失败: ${error.message}`);
  }
}

async function requestWithFlareSolverr(targetUrl) {
  const endpoint = text(ZHIZHI_FLARESOLVERR_URL);
  if (!endpoint) throw new Error("未配置 FlareSolverr 地址");
  const payload = {
    cmd: "request.get",
    url: targetUrl,
    maxTimeout: ZHIZHI_FLARESOLVERR_TIMEOUT_MS,
  };
  if (text(ZHIZHI_FLARESOLVERR_SESSION)) payload.session = text(ZHIZHI_FLARESOLVERR_SESSION);
  const res = await axios.post(endpoint, payload, {
    timeout: ZHIZHI_FLARESOLVERR_TIMEOUT_MS + 5000,
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    validateStatus: () => true,
  });
  if (res.status !== 200 || !res.data || res.data.status !== "ok") {
    throw new Error(`FlareSolverr HTTP ${res.status}${res.data?.message ? `: ${res.data.message}` : ""}`);
  }
  const solution = res.data.solution || {};
  const cookies = Array.isArray(solution.cookies) ? solution.cookies : [];
  return {
    cookie: cookiesArrayToString(cookies),
    html: String(solution.response || ""),
    statusCode: Number(solution.status || 200),
    headers: solution.headers || {},
    userAgent: text(solution.userAgent || ""),
  };
}

async function fetchCfClearanceWithFlareSolverr(targetUrl = `${HOST}/`) {
  const solved = await requestWithFlareSolverr(targetUrl);
  if (!/cf_clearance=/.test(solved.cookie)) {
    throw new Error("FlareSolverr 未返回 cf_clearance");
  }
  return solved.cookie;
}

async function fetchCfClearanceWithBrowser(targetUrl = `${HOST}/`) {
  const script = String.raw`
const { execFile } = require("child_process");
const { promisify } = require("util");
const http = require("http");
const fs = require("fs");
const execFileAsync = promisify(execFile);
const BASE_URL = process.env.ZHIZHI_HOST;
const USER_AGENT = process.env.ZHIZHI_BROWSER_USER_AGENT;
const timeoutMs = Number(process.env.ZHIZHI_CF_TIMEOUT_MS || 45000);

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (error) { reject(error); }
      });
    }).on("error", reject);
  });
}

async function waitForDebugger(port, deadline) {
  while (Date.now() < deadline) {
    try {
      const info = await getJson("http://127.0.0.1:" + port + "/json/version");
      if (info && info.webSocketDebuggerUrl) return info;
    } catch (_) {}
    await delay(500);
  }
  throw new Error("等待 Chromium 调试端口超时");
}

async function waitForCfCookie(wsUrl, baseUrl, deadline) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const host = new URL(baseUrl).hostname;
  try {
    while (Date.now() < deadline) {
      const cookies = (await send("Storage.getCookies", {})).result?.cookies || [];
      const hit = cookies.find((item) => item.name === "cf_clearance" && String(item.domain || "").includes(host));
      if (hit && hit.value) return "cf_clearance=" + hit.value;
      await delay(1200);
    }
    throw new Error("未在时限内获取到 cf_clearance");
  } finally {
    ws.close();
  }
}

(async () => {
  const port = 9400 + Math.floor(Math.random() * 200);
  const profile = (await execFileAsync("mktemp", ["-d", "/tmp/zhizhi-cf-XXXXXX"])).stdout.trim();
  const candidates = process.env.ZHIZHI_CHROMIUM_BIN
    ? [process.env.ZHIZHI_CHROMIUM_BIN]
    : ["/snap/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/chromium"];
  const bin = candidates.find((item) => item && fs.existsSync(item));
  if (!bin) throw new Error("未找到 Chromium，可设置 ZHIZHI_CHROMIUM_BIN");
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--user-data-dir=" + profile,
    "--remote-debugging-port=" + port,
    "--user-agent=" + USER_AGENT,
    BASE_URL + "/"
  ];
  if (process.env.ZHIZHI_BROWSER_DEBUGGING === "1") args.push("--remote-allow-origins=*");
  const child = execFile(bin, args, { stdio: "ignore" });
  try {
    const deadline = Date.now() + timeoutMs;
    const version = await waitForDebugger(port, deadline);
    process.stdout.write(await waitForCfCookie(version.webSocketDebuggerUrl, BASE_URL, deadline));
  } finally {
    try { child.kill("SIGKILL"); } catch (_) {}
  }
})().catch((error) => {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
});`;

  const { stdout, stderr } = await execFileAsync(process.execPath, ["-e", script], {
    timeout: ZHIZHI_CF_TIMEOUT_MS + 5000,
    env: {
      ...process.env,
      ZHIZHI_HOST: HOST,
      ZHIZHI_BROWSER_USER_AGENT: ZHIZHI_BROWSER_UA || UA,
      ZHIZHI_CF_TIMEOUT_MS: String(ZHIZHI_CF_TIMEOUT_MS),
      ZHIZHI_CHROMIUM_BIN: ZHIZHI_CHROMIUM_BIN,
      ZHIZHI_BROWSER_DEBUGGING: ZHIZHI_BROWSER_DEBUGGING ? "1" : "0",
    },
    maxBuffer: 1024 * 1024,
  });
  const cookie = text(stdout);
  if (!/^cf_clearance=/.test(cookie)) {
    throw new Error(text(stderr) || "未获取到 cf_clearance");
  }
  return cookie;
}

async function ensureCfCookie(forceRefresh = false, targetUrl = `${HOST}/`) {
  if (text(ZHIZHI_CF_COOKIE)) return text(ZHIZHI_CF_COOKIE);
  if (!forceRefresh) {
    const cached = await getCachedCfCookie();
    if (cached) return cached;
  }
  if (!ZHIZHI_CF_AUTO) return "";
  let cookie = "";
  try {
    OmniBox.log("info", `[cf] 开始通过 FlareSolverr 自动获取 cf_clearance`);
    cookie = await fetchCfClearanceWithFlareSolverr(targetUrl);
  } catch (error) {
    OmniBox.log("warn", `[cf] FlareSolverr 获取失败，回退 headless Chromium: ${error.message}`);
    cookie = await fetchCfClearanceWithBrowser(targetUrl);
  }
  if (cookie) {
    await setCachedCfCookie(cookie);
    OmniBox.log("info", `[cf] 已自动获取 cf_clearance，长度=${cookie.length}`);
  }
  return cookie;
}

function isBlockedHtml(body = "") {
  const lower = String(body || "").toLowerCase();
  return lower.includes("just a moment")
    || lower.includes("cf-browser-verification")
    || lower.includes("cf_chl_opt")
    || lower.includes("enable javascript and cookies to continue")
    || (lower.includes("captcha") && !lower.includes('name="cf-turnstile-response"'));
}

async function requestText(url, options = {}) {
  const referer = options.referer || options.headers?.Referer || `${HOST}/`;
  const cookie = await getCachedCfCookie();
  const headers = {
    ...HEADERS,
    ...(options.headers || {}),
    Referer: referer,
    ...buildCookieHeader(cookie),
  };
  const response = await OmniBox.request(url, {
    method: options.method || "GET",
    headers,
    timeout: options.timeout || 30000,
    body: options.body,
  });
  const statusCode = Number(response?.statusCode || 200);
  const body = getBodyText(response);
  if (statusCode >= 200 && statusCode < 400 && body && !isBlockedHtml(body)) return body;
  if (!ZHIZHI_CF_AUTO) throw new Error(`HTTP ${statusCode || "unknown"} @ ${url}`);

  OmniBox.log("warn", `[cf] ${url} 被CF盾拦截，尝试自动处理`);
  const solved = await requestWithFlareSolverr(url).catch(() => null);
  let solvedCookie = solved?.cookie || "";
  if (!solvedCookie && solved?.statusCode >= 200 && solved?.statusCode < 400 && solved?.html && !isBlockedHtml(solved.html)) {
    solvedCookie = mergeCookies(solvedCookie, cookiesFromSetCookie(solved.headers?.["set-cookie"]));
  }
  let solvedHtml = solved?.html || "";
  if ((!solvedHtml || isBlockedHtml(solvedHtml)) && ZHIZHI_FLARESOLVERR_URL) {
    OmniBox.log("warn", `[cf] FlareSolverr 结果无效，尝试刷新 cf_clearance`);
    const refreshed = await ensureCfCookie(true, url).catch(() => "");
    solvedCookie = refreshed;
    solvedHtml = "";
  }
  if (!solvedHtml && ZHIZHI_FLARESOLVERR_URL) {
    const retry = await requestWithFlareSolverr(url).catch(() => null);
    if (retry?.html && !isBlockedHtml(retry.html)) {
      solvedCookie = retry.cookie || solvedCookie;
      solvedHtml = retry.html;
    }
  }
  if (!solvedHtml && !ZHIZHI_FLARESOLVERR_URL) {
    const refreshed = await ensureCfCookie(true, url).catch(() => "");
    if (refreshed) {
      const retryResponse = await OmniBox.request(url, {
        method: options.method || "GET",
        headers: { ...headers, ...buildCookieHeader(refreshed) },
        timeout: options.timeout || 30000,
        body: options.body,
      });
      const retryStatus = Number(retryResponse?.statusCode || 200);
      const retryBody = getBodyText(retryResponse);
      if (retryStatus >= 200 && retryStatus < 400 && retryBody && !isBlockedHtml(retryBody)) {
        solvedCookie = refreshed;
        solvedHtml = retryBody;
      }
    }
  }
  if (solvedCookie) {
    await setCachedCfCookie(solvedCookie);
    const solvedUa = text(solved?.userAgent || "");
    if (solvedUa && !text(ZHIZHI_BROWSER_UA)) ZHIZHI_BROWSER_UA = solvedUa;
  }
  if (solvedHtml && !isBlockedHtml(solvedHtml)) return solvedHtml;
  throw new Error(`Cloudflare challenge unresolved @ ${url}`);
}

function decodeHtml(text) {
  return String(text || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(text) {
  return decodeHtml(
    String(text || "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

function absUrl(url, base = HOST) {
  let value = decodeHtml(String(url || "").trim()).replace(/^['"]|['"]$/g, "").replace(/\\\//g, "/");
  if (!value || /^data:/i.test(value)) return "";
  if (value.startsWith("//")) value = `https:${value}`;
  try {
    return new URL(value, base).toString();
  } catch (_) {
    return value;
  }
}

function getAttribute(attrs, name) {
  const match = String(attrs || "").match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  return match ? decodeHtml(match[2]).trim() : "";
}

function parseCards(html) {
  const parts = String(html || "").split(/<div\s+class=["']myui-vodbox-content["']>/i);
  const videos = [];
  const seen = new Set();

  for (const part of parts.slice(1)) {
    const idMatch = part.match(/href=["']\/voddetail\/(\d+)\.html["']/i);
    if (!idMatch || seen.has(idMatch[1])) continue;
    const videoId = idMatch[1];
    const block = part.slice(0, 5000);
    let name = cleanText((block.match(/\balt=["']([^"']+)["']/i) || [])[1] || "");
    if (!name) name = cleanText((block.match(/<div[^>]*class=["']title["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "");
    if (!name) continue;

    let pic = String((block.match(/<img\b[^>]*src=["']([^"']+)["']/i) || [])[1] || "");
    if (/load\.gif/i.test(pic)) {
      pic = String((block.match(/<!--\s*<img\b[^>]*src=["']([^"']+)["']/i) || [])[1] || pic);
    }
    const remarkMatch = block.match(/<div[^>]*class=["'][^"']*tag[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
      || block.match(/<div[^>]*class=["']score["'][^>]*>([\s\S]*?)<\/div>/i);

    seen.add(videoId);
    videos.push({
      vod_id: videoId,
      vod_name: name,
      vod_pic: absUrl(pic),
      vod_remarks: cleanText(remarkMatch ? remarkMatch[1] : ""),
    });
  }
  return videos;
}

function parsePageCount(html, currentPage) {
  const values = [];
  const patterns = [
    /\/vodshow\/\d+-[^"']*?(\d+)---\.html/gi,
    /\/vodsearch\/[^"']*?----------(\d+)---\.html/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(String(html || ""))) !== null) values.push(Number(match[1]) || 0);
  }
  return values.length ? Math.max(...values) : (currentPage + 1);
}

function normalizeFilters(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function extractMeta(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(new RegExp(`<meta[^>]*property=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"))
    || String(html || "").match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${escaped}["']`, "i"));
  return cleanText(match ? match[1] : "");
}

function extractField(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(new RegExp(`${escaped}\\s*[：:]\\s*([\\s\\S]*?)(?:<\\/div>|<\\/li>)`, "i"));
  return cleanText(match ? match[1] : "");
}

function extractNestedField(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(
    new RegExp(`<div[^>]*>[\\s\\S]*?<div[^>]*class=["']name["'][^>]*>\\s*${escaped}\\s*[：:]\\s*<\\/div>([\\s\\S]*?)<\\/div>`, "i"),
  );
  return cleanText(match ? match[1] : "");
}

function findPlaylistBlock(html, playlistId) {
  const text = String(html || "");
  const startMatch = text.match(new RegExp(`<div\\s+id=["']playlist${playlistId}["'][^>]*>`, "i"));
  if (!startMatch) return "";
  const start = startMatch.index;
  const rest = text.slice(start + startMatch[0].length);
  const next = rest.search(/<div\s+id=["']playlist\d+["']/i);
  return next >= 0 ? text.slice(start, start + startMatch[0].length + next) : text.slice(start, start + 20000);
}

function parsePlaySources(html) {
  const sources = [];
  const tabRegex = /<li[^>]*class=["'][^"']*player_name[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']#playlist(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = tabRegex.exec(String(html || ""))) !== null) {
    const playlistId = match[1];
    const name = cleanText(match[2]) || `线路${playlistId}`;
    const block = findPlaylistBlock(html, playlistId);
    const episodes = [];
    const episodeRegex = /<a\b[^>]*href=["']([^"']*\/vodplay\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let episodeMatch;
    while ((episodeMatch = episodeRegex.exec(block)) !== null) {
      const episodeName = cleanText(episodeMatch[2]) || "播放";
      const playId = absUrl(episodeMatch[1]);
      if (playId) episodes.push({ name: episodeName, playId });
    }
    if (episodes.length) sources.push({ name, episodes });
  }
  return sources;
}

function decodePlayerUrl(value, encrypt) {
  const raw = String(value || "").replace(/\\\//g, "/");
  if (!raw) return "";
  try {
    if (String(encrypt) === "2") return decodeURIComponent(Buffer.from(raw, "base64").toString("utf8"));
    if (String(encrypt) === "1") {
      const decoded = decodeURIComponent(raw);
      if (decoded !== raw || /^https?:\/\//i.test(decoded)) return decoded;
      if (/^[A-Za-z0-9+/=]+$/.test(raw)) return Buffer.from(raw, "base64").toString("utf8");
    }
  } catch (_) {}
  return raw;
}

function isDirectMedia(url) {
  return /\.(?:m3u8|mp4|flv|mkv|avi)(?:$|[?#])/i.test(String(url || ""));
}

function normalizeSniffUrls(result, defaultName) {
  const urls = [];
  const seen = new Set();
  const append = (item) => {
    const value = typeof item === "string" ? item : (item?.url || item?.playUrl || item?.src || "");
    const url = String(value || "").trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push({ name: String(item?.name || defaultName || "嗅探线路"), url });
  };
  if (Array.isArray(result?.urls)) result.urls.forEach(append);
  if (!urls.length) append(result);
  return urls;
}

function directPlayResult(url, referer, name = "播放", extras = {}) {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  return { parse: 0, jx: 0, url, urls: [{ name, url }], header, headers: header, ...extras };
}

function browserSniffResult(url, referer, name = "播放页") {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  return { parse: 1, jx: 1, url, urls: [{ name, url }], header, headers: header };
}

async function serverSniffOrBrowserFallback(targetUrl, referer, name = "播放") {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  if (typeof OmniBox.sniffVideo === "function") {
    try {
      const sniffed = await OmniBox.sniffVideo(targetUrl, header);
      const urls = normalizeSniffUrls(sniffed, name);
      if (urls.length) {
        const playHeader = sniffed?.header || sniffed?.headers || header;
        await OmniBox.log("info", `[枝枝影视][play] 服务端嗅探成功 urls=${urls.length}`);
        return {
          parse: 0,
          jx: 0,
          url: urls[0].url,
          urls,
          header: playHeader,
          headers: playHeader,
          danmaku: sniffed?.danmaku || [],
        };
      }
      await OmniBox.log("warn", "[枝枝影视][play] 服务端嗅探无结果，转浏览器嗅探");
    } catch (error) {
      await OmniBox.log("warn", `[枝枝影视][play] 服务端嗅探失败，转浏览器嗅探: ${error.message}`);
    }
  }
  return browserSniffResult(targetUrl, referer, name);
}

async function resolveM3u8Child(url, referer) {
  try {
    const text = await requestText(url, { referer, timeout: 20000 });
    if (!text.includes("#EXTM3U") || !text.includes("#EXT-X-STREAM-INF")) return url;
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (let index = 0; index < lines.length; index += 1) {
      if (!lines[index].startsWith("#EXT-X-STREAM-INF")) continue;
      const child = lines.slice(index + 1).find((line) => !line.startsWith("#"));
      if (child) return absUrl(child, url);
    }
  } catch (_) {}
  return url;
}

async function home() {
  const results = await Promise.allSettled(CLASS_LIST.map((item) => requestText(`${HOST}/vodshow/${item.type_id}-----------.html`, { timeout: 30000 })));
  const list = [];
  const seen = new Set();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const video of parseCards(result.value)) {
      if (seen.has(video.vod_id)) continue;
      seen.add(video.vod_id);
      list.push(video);
    }
  }
  if (!list.length) {
    try {
      for (const video of parseCards(await requestText(`${HOST}/`))) {
        if (seen.has(video.vod_id)) continue;
        seen.add(video.vod_id);
        list.push(video);
      }
    } catch (error) {
      await OmniBox.log("error", `[枝枝影视][home] ${error.message}`);
    }
  }
  return { class: CLASS_LIST, filters: FILTERS, list: list.slice(0, 72) };
}

async function category(params) {
  const page = Math.max(1, parseInt(params.page || 1, 10));
  try {
    const categoryId = String(params.categoryId || params.type_id || "1").trim() || "1";
    const filters = normalizeFilters(params.extend || params.filters || params.ext);
    const area = String(filters.area || "").trim();
    const year = String(filters.year || "").trim();
    let url;
    if (area || year) {
      url = `${HOST}/vodshow/${categoryId}-${encodeURIComponent(area)}-------${page}---${encodeURIComponent(year)}.html`;
    } else {
      url = page === 1
        ? `${HOST}/vodshow/${categoryId}-----------.html`
        : `${HOST}/vodshow/${categoryId}--------${page}---.html`;
    }
    const html = await requestText(url);
    const list = parseCards(html);
    return { page, pagecount: parsePageCount(html, page), limit: list.length || 20, total: 999999, list };
  } catch (error) {
    await OmniBox.log("error", `[枝枝影视][category] ${error.message}`);
    return { page, pagecount: 0, limit: 0, total: 0, list: [] };
  }
}

async function detail(params) {
  try {
    const input = String(params.videoId || params.id || params.categoryId || "").trim();
    const idMatch = input.match(/\/voddetail\/(\d+)\.html/i) || input.match(/^(\d+)$/);
    const videoId = idMatch ? idMatch[1] : "";
    if (!videoId) return { list: [] };
    const html = await requestText(`${HOST}/voddetail/${videoId}.html`);
    let name = extractMeta(html, "og:title").replace(/-高清.*$/u, "").trim();
    if (!name) name = cleanText((html.match(/<title>([\s\S]*?)-/i) || [])[1] || "");
    let content = extractMeta(html, "og:description");
    if (content.includes("剧情介绍：")) content = content.split("剧情介绍：", 2)[1];
    const yearMatch = html.match(/<div[^>]*class=["']right["'][^>]*>\s*(\d{4})\s*<\/div>/i);
    const remarkMatch = html.match(/<div[^>]*class=["'][^"']*tag[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

    return {
      list: [{
        vod_id: videoId,
        vod_name: name,
        vod_pic: absUrl(extractMeta(html, "og:image")),
        type_name: "",
        vod_year: yearMatch ? yearMatch[1] : "",
        vod_area: extractField(html, "地区"),
        vod_remarks: cleanText(remarkMatch ? remarkMatch[1] : ""),
        vod_actor: extractNestedField(html, "主演") || extractField(html, "主演"),
        vod_director: extractNestedField(html, "导演") || extractField(html, "导演"),
        vod_content: content || "暂无简介",
        vod_play_sources: parsePlaySources(html),
      }],
    };
  } catch (error) {
    await OmniBox.log("error", `[枝枝影视][detail] ${error.message}`);
    return { list: [] };
  }
}

async function search(params) {
  const page = Math.max(1, parseInt(params.page || 1, 10));
  try {
    const keyword = String(params.keyword || params.wd || params.key || "").trim();
    if (!keyword) return { page, pagecount: 0, total: 0, list: [] };
    const encoded = encodeURIComponent(keyword);
    const url = page === 1
      ? `${HOST}/vodsearch/${encoded}-------------.html`
      : `${HOST}/vodsearch/${encoded}----------${page}---.html`;
    const html = await requestText(url, { timeout: 60000 });
    const list = parseCards(html);
    return { page, pagecount: parsePageCount(html, page), limit: list.length || 20, total: 999999, list };
  } catch (error) {
    await OmniBox.log("error", `[枝枝影视][search] ${error.message}`);
    return { page, pagecount: 0, limit: 0, total: 0, list: [] };
  }
}

async function play(params) {
  const input = String(params.playId || params.id || params.url || params.input || "").trim();
  if (!input) return { parse: 0, jx: 0, url: "", urls: [], header: {}, headers: {} };
  const flag = String(params.flag || "");
  if (isDirectMedia(input)) return directPlayResult(absUrl(input), `${HOST}/`, flag || "播放");
  const playUrl = absUrl(input);

  let html = "";
  try {
    html = await requestText(playUrl, { referer: `${HOST}/`, timeout: 30000 });
  } catch (error) {
    await OmniBox.log("warn", `[枝枝影视][play] 播放页请求失败，尝试嗅探: ${error.message}`);
    return await serverSniffOrBrowserFallback(playUrl, playUrl, flag || "枝枝播放");
  }

  let realUrl = "";
  let jxFrom = "";
  const playerMatch = html.match(/var\s+player_[a-zA-Z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i)
    || html.match(/var\s+player_[a-zA-Z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;/i);
  if (playerMatch) {
    try {
      const data = JSON.parse(playerMatch[1]);
      realUrl = decodePlayerUrl(data.url, data.encrypt);
      jxFrom = String(data.from || "");
    } catch (error) {
      await OmniBox.log("warn", `[枝枝影视][play] player 数据解析失败: ${error.message}`);
    }
  }

  let sniffTarget = playUrl;
  if (!realUrl) {
    const iframeMatch = html.match(/<iframe\b[^>]*src=["']([^"']+)["']/i);
    if (iframeMatch) {
      const iframeUrl = absUrl(iframeMatch[1], playUrl);
      sniffTarget = iframeUrl || playUrl;
      try {
        const iframeHtml = await requestText(iframeUrl, { referer: playUrl, timeout: 30000 });
        realUrl = String((iframeHtml.match(/["']url["']\s*:\s*["']([^"']+)["']/i) || [])[1] || "").replace(/\\\//g, "/");
        if (!realUrl) {
          realUrl = String((iframeHtml.match(/src=["']([^"']+\.(?:m3u8|mp4|flv)(?:\?[^"']*)?)["']/i) || [])[1] || "");
        }
      } catch (error) {
        await OmniBox.log("warn", `[枝枝影视][play] iframe 解析失败: ${error.message}`);
      }
    }
  }

  if (!realUrl) {
    const directMatch = html.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4|flv|mkv|avi)(?:\?[^"']*)?)["']/i);
    realUrl = directMatch ? directMatch[1].replace(/\\\//g, "/") : "";
  }

  if (isDirectMedia(realUrl)) {
    const mediaUrl = /\.m3u8(?:$|[?#])/i.test(realUrl) ? await resolveM3u8Child(realUrl, playUrl) : realUrl;
    return directPlayResult(mediaUrl, playUrl, flag || "播放", jxFrom ? { jxFrom } : {});
  }
  if (realUrl) return await serverSniffOrBrowserFallback(absUrl(realUrl, playUrl), playUrl, flag || "枝枝播放");
  return await serverSniffOrBrowserFallback(sniffTarget, playUrl, flag || "枝枝播放");
}

});

_load(5, "柯南影视", function (module, exports, require) {
// @name 柯南影视
// @description 接口解析：https://www.knvod.com，支持首页、分类、搜索、详情与播放解析
// @version 1.0.2
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/柯南影视.js
// @dependencies crypto-js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const CryptoJS = require("crypto-js");

const HOST = "https://www.knvod.com";
const PARSER_HOST = "https://xn--ewr.211997.xyz";
const BFQ_HOST = "https://bfq.txnp.cn";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  Referer: `${HOST}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Upgrade-Insecure-Requests": "1",
};

const siteCookies = new Map();

const CLASS_LIST = [
  { type_id: "1", type_name: "电影" },
  { type_id: "2", type_name: "电视剧" },
  { type_id: "3", type_name: "动漫" },
  { type_id: "4", type_name: "综艺" },
];

const UNSTABLE_LINES = new Set(["推荐", "推荐2", "超快③", "超快l", "超快I", "超快Ⅰ"]);

module.exports = { home, category, search, detail, play };
runner.run(module.exports);

function getBodyText(response) {
  const body = response && typeof response === "object"
    ? ("body" in response ? response.body : ("data" in response ? response.data : response))
    : response;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return body.toString();
  return String(body || "");
}

function getHeader(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === "function") return headers.get(name) || headers.get(name.toLowerCase());
  const wanted = String(name).toLowerCase();
  const key = Object.keys(headers).find((item) => item.toLowerCase() === wanted);
  return key ? headers[key] : undefined;
}

function mergeCookies(setCookie) {
  const items = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
  for (const item of items) {
    const pair = String(item || "").split(";", 1)[0].trim();
    const index = pair.indexOf("=");
    if (index <= 0) continue;
    siteCookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
}

function currentCookie() {
  return [...siteCookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, options = {}) {
  const headers = {
    ...HEADERS,
    ...(options.headers || {}),
    Referer: options.referer || options.headers?.Referer || `${HOST}/`,
  };
  const attempts = Math.max(2, Number(options.retries === undefined ? 3 : Number(options.retries)) + 1);
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const cookie = currentCookie();
    const requestHeaders = cookie ? { ...headers, Cookie: cookie } : headers;
    try {
      const response = await OmniBox.request(url, {
        method: options.method || "GET",
        headers: requestHeaders,
        timeout: options.timeout || 30000,
        body: options.body,
      });
      mergeCookies(getHeader(response?.headers, "set-cookie"));
      const statusCode = Number(response?.statusCode || 200);
      if ((statusCode === 403 || statusCode === 429 || statusCode === 520) && attempt + 1 < attempts) {
        await delay(1100);
        continue;
      }
      if (statusCode < 200 || statusCode >= 400) {
        const error = new Error(`HTTP ${statusCode || "unknown"} @ ${url}`);
        error.retryable = false;
        throw error;
      }
      return getBodyText(response);
    } catch (error) {
      lastError = error;
      if (error?.retryable === false || attempt + 1 >= attempts) break;
    }
  }

  throw lastError || new Error(`请求失败 @ ${url}`);
}

function md5(text) {
  return CryptoJS.MD5(String(text || "")).toString();
}

async function apiVodList(body = {}, options = {}) {
  const time = Math.ceil(Date.now() / 1000);
  const payload = {
    type: "",
    class: "",
    area: "",
    lang: "",
    version: "",
    state: "",
    letter: "",
    ...body,
    page: Math.max(1, Number(body.page || options.page || 1) || 1),
    time,
    key: md5(`DS${time}DCC147D11943AF75`),
  };
  const encoded = Object.entries(payload)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value ?? ""))}`)
    .join("&");
  const text = await fetchText(`${HOST}/index.php/api/vod`, {
    ...options,
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      ...(options.headers || {}),
    },
    body: encoded,
  });
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    throw new Error(`API响应解析失败 @ ${HOST}/index.php/api/vod`);
  }
  if (Number(data.code) !== 1) throw new Error(`API错误 ${data.msg || data.code || "unknown"}`);
  const list = Array.isArray(data.list) ? data.list.map((item) => ({
    vod_id: String(item.vod_id || ""),
    vod_name: String(item.vod_name || "").trim(),
    vod_pic: fixPicUrl(item.vod_pic || item.vod_pic_thumb || ""),
    vod_remarks: String(item.vod_remarks || item.vod_serial || "").trim(),
  })).filter((item) => item.vod_id && item.vod_name) : [];
  return {
    list,
    page: Math.max(1, Number(data.page) || 1),
    pagecount: Math.max(0, Number(data.pagecount) || 0),
    total: Math.max(0, Number(data.total) || list.length),
  };
}

function decodeHtml(text) {
  return String(text || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(text) {
  return decodeHtml(String(text || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function absUrl(url, base = HOST) {
  let value = decodeHtml(String(url || "").trim()).replace(/^['"]|['"]$/g, "");
  if (!value || /^data:/i.test(value)) return "";
  if (value.startsWith("//")) value = `https:${value}`;
  try {
    return new URL(value, base).toString();
  } catch (_) {
    return value;
  }
}

function fixPicUrl(url) {
  let value = absUrl(url);
  const proxy = "https://xn--wcsw84d.921080.xyz/?url=";
  if (/^http:\/\//i.test(value)) value = value.replace(/^http:\/\//i, "https://");
  if (/\.(?:jpg|jpeg|png|webp|gif)(?:$|[?#])/i.test(value) && /(?:doubanio\.com|douban\.com)/i.test(value)) {
    return `${proxy}${encodeURIComponent(value)}`;
  }
  return value;
}

function getAttribute(attrs, name) {
  const match = String(attrs || "").match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  return match ? decodeHtml(match[2]).trim() : "";
}

function lastCaptured(text, pattern) {
  let value = "";
  let match;
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  while ((match = regex.exec(text)) !== null) {
    value = match[1] || "";
    if (match[0] === "") regex.lastIndex += 1;
  }
  return value;
}

function extractVideos(html) {
  const text = String(html || "");
  const videos = [];
  const seen = new Set();
  const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(text)) !== null) {
    const attrs = match[1] || "";
    if (!/\bpublic-list-exp\b/i.test(getAttribute(attrs, "class"))) continue;

    const href = getAttribute(attrs, "href");
    const idMatch = href.match(/\/vdetail\/(\d+)\.html/i);
    const vodId = idMatch ? idMatch[1] : "";
    if (!vodId || seen.has(vodId)) continue;

    const inner = match[2] || "";
    const before = text.slice(Math.max(0, match.index - 800), match.index);
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 600);
    const context = `${before}${match[0]}${after}`;

    const stylePicPattern = /\bstyle\s*=\s*["'][^"']*url\(\s*["']?([^)'"\s]+)["']?\s*\)[^"']*["']/i;
    let vodPic = lastCaptured(inner, /\bdata-src\s*=\s*["']([^"']+)["']/i);
    if (!vodPic) vodPic = lastCaptured(inner, stylePicPattern);
    if (!vodPic) vodPic = lastCaptured(before, stylePicPattern);
    if (!vodPic) vodPic = lastCaptured(before, /\bdata-src\s*=\s*["']([^"']+)["']/i);
    if (!vodPic) vodPic = lastCaptured(context, /\bsrc\s*=\s*["']([^"']+)["']/i);

    let vodName = cleanText(getAttribute(attrs, "title"));
    if (!vodName) {
      const alt = lastCaptured(inner, /\balt\s*=\s*["']([^"']+)["']/i);
      vodName = cleanText(alt).replace(/封面图$/u, "").trim();
    }
    if (!vodName) continue;

    let vodRemarks = "";
    const remarkMatch = inner.match(/public-list-prb[^>]*>([\s\S]*?)<\/span>/i)
      || after.match(/public-list-prb[^>]*>([\s\S]*?)<\/span>/i);
    if (remarkMatch) vodRemarks = cleanText(remarkMatch[1]);

    seen.add(vodId);
    videos.push({
      vod_id: vodId,
      vod_name: vodName,
      vod_pic: fixPicUrl(vodPic),
      vod_remarks: vodRemarks,
    });
  }

  if (videos.length) return videos;

  const looseRegex = /href=["']\/vdetail\/(\d+)\.html["']/gi;
  while ((match = looseRegex.exec(text)) !== null) {
    const vodId = match[1];
    if (seen.has(vodId)) continue;
    const context = text.slice(Math.max(0, match.index - 500), match.index + 500);
    const title = lastCaptured(context, /\btitle\s*=\s*["']([^"']+)["']/i);
    const alt = lastCaptured(context, /\balt\s*=\s*["']([^"']+)["']/i);
    const pic = lastCaptured(context, /\bdata-src\s*=\s*["']([^"']+)["']/i)
      || lastCaptured(context, /url\(\s*["']?([^)'"\s]+)["']?\s*\)/i);
    const vodName = cleanText(title || alt).replace(/封面图$/u, "").trim();
    if (!vodName) continue;
    seen.add(vodId);
    videos.push({ vod_id: vodId, vod_name: vodName, vod_pic: fixPicUrl(pic), vod_remarks: "" });
  }

  return videos;
}

function parsePageCount(html, currentPage, listLength) {
  const match = String(html || "").match(/\d+\s*(?:&nbsp;|\s)*\/\s*(?:&nbsp;|\s)*(\d+)\s*页/i);
  if (match) return Math.max(1, Number(match[1]) || 1);
  return listLength > 0 ? currentPage + 1 : currentPage;
}

function extractLabeledBlock(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(
    new RegExp(`<(?:em|strong)[^>]*>\\s*${escaped}\\s*[：:]?\\s*<\\/(?:em|strong)>([\\s\\S]*?)(?:<\\/li>|<\\/div>)`, "i"),
  );
  return match ? match[1] : "";
}

function extractPeople(html, label) {
  const block = extractLabeledBlock(html, label);
  if (!block) return "";
  const people = [];
  const linkRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(block)) !== null) {
    const name = cleanText(match[1]);
    if (name) people.push(name);
  }
  return people.length ? people.join(" ") : cleanText(block);
}

function parsePlaySources(html) {
  const text = String(html || "");
  const tabStart = text.search(/\banthology-tab\b/i);
  const listStart = tabStart >= 0 ? text.slice(tabStart).search(/\banthology-list\b/i) : -1;
  const tabHtml = tabStart >= 0 && listStart > 0 ? text.slice(tabStart, tabStart + listStart) : "";
  const sourceNames = [];
  const sourceRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = sourceRegex.exec(tabHtml)) !== null) {
    if (!/\bswiper-slide\b/i.test(getAttribute(match[1], "class"))) continue;
    const withoutBadge = match[2].replace(/<span\b[^>]*class=["'][^"']*badge[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, "");
    const name = cleanText(withoutBadge).replace(/\d+\s*集?$/u, "").trim();
    if (name) sourceNames.push(name);
  }

  const playSources = [];
  const nameCounts = new Map();
  const listRegex = /<ul\b[^>]*class=["'][^"']*anthology-list-play[^"']*["'][^>]*>([\s\S]*?)<\/ul>/gi;
  let index = 0;

  while ((match = listRegex.exec(text)) !== null) {
    const originalName = sourceNames[index] || `线路${index + 1}`;
    index += 1;
    if (UNSTABLE_LINES.has(originalName)) continue;

    const episodes = [];
    const episodeRegex = /<a\b[^>]*href=["'](\/vplay\/\d+-\d+-\d+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let episodeMatch;
    while ((episodeMatch = episodeRegex.exec(match[1])) !== null) {
      const name = cleanText(episodeMatch[2]);
      if (name) episodes.push({ name, playId: absUrl(episodeMatch[1]) });
    }
    if (!episodes.length) continue;
    episodes.reverse();

    const count = (nameCounts.get(originalName) || 0) + 1;
    nameCounts.set(originalName, count);
    const sourceName = count > 1 ? `${originalName}${count}` : originalName;
    playSources.push({ name: sourceName, episodes });
  }

  const rank = (name) => {
    if (name.startsWith("超稳")) return 0;
    if (name.startsWith("蓝光") || name.startsWith("移动")) return 1;
    return 2;
  };
  playSources.sort((a, b) => rank(a.name) - rank(b.name));
  return playSources;
}

function isDirectMedia(url) {
  return /\.(?:m3u8|mp4|flv|mkv)(?:$|[?#])/i.test(String(url || ""));
}

function isOfficialSource(url) {
  const value = String(url || "").toLowerCase();
  if (isDirectMedia(value)) return false;
  return [
    "mgtv.com", "youku.com", "iqiyi.com", "qiyi.com", "v.qq.com", "qq.com",
    "bilibili.com", "le.com", "sohu.com", "pptv.com", "1905.com",
  ].some((host) => value.includes(host));
}

function decodePlayerUrl(value, encrypt) {
  let url = String(value || "").replace(/\\\//g, "/");
  try {
    if (String(encrypt) === "1") return decodeURIComponent(url);
    if (String(encrypt) === "2") {
      url = Buffer.from(url, "base64").toString("utf8");
      return decodeURIComponent(url);
    }
  } catch (_) {}
  return url;
}

function decryptBfqResult(cipherText) {
  const value = String(cipherText || "");
  if (value.length <= 32) return null;
  try {
    const key = CryptoJS.enc.Utf8.parse(value.slice(-32, -16));
    const iv = CryptoJS.enc.Utf8.parse(value.slice(-16));
    const ciphertext = CryptoJS.enc.Base64.parse(value.slice(0, -32));
    const decrypted = CryptoJS.AES.decrypt({ ciphertext }, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (_) {
    return null;
  }
}

async function resolveM3u8Child(url, referer) {
  try {
    const text = await fetchText(url, { referer: referer || `${HOST}/`, timeout: 20000, retries: 0 });
    if (!text.includes("#EXTM3U") || !text.includes("#EXT-X-STREAM-INF")) return url;
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (let index = 0; index < lines.length; index += 1) {
      if (!lines[index].startsWith("#EXT-X-STREAM-INF")) continue;
      const child = lines.slice(index + 1).find((line) => !line.startsWith("#"));
      if (child) return absUrl(child, url);
    }
  } catch (_) {}
  return url;
}

async function resolveOfficialSource(sourceUrl) {
  if (!isOfficialSource(sourceUrl)) return "";
  const encoded = encodeURIComponent(sourceUrl);
  const pageUrl = `${BFQ_HOST}/player?url=${encoded}`;
  const referer = `${BFQ_HOST}/excessive?url=${encoded}`;
  const html = await fetchText(pageUrl, { referer, timeout: 20000, retries: 0 });
  const match = html.match(/let\s+result\s*=\s*["']([^"']+)["']/i);
  const data = decryptBfqResult(match ? match[1] : "");
  let mediaUrl = String(data?.video_info?.video?.url || "").replace(/\\\//g, "/");
  if (mediaUrl && isDirectMedia(mediaUrl) && /\.m3u8(?:$|[?#])/i.test(mediaUrl)) {
    mediaUrl = await resolveM3u8Child(mediaUrl, pageUrl);
  }
  return isDirectMedia(mediaUrl) ? mediaUrl : "";
}

function buildParserUrl(playUrl, nextLink, title) {
  if (!playUrl) return "";
  let url = `${PARSER_HOST}/ppy.php?url=${playUrl}`;
  if (nextLink) {
    const next = String(nextLink);
    if (next.startsWith("//")) url += `&next=${next}`;
    else if (/^https?:\/\//i.test(next)) url += `&next=//${next.replace(/^https?:\/\//i, "")}`;
    else url += `&next=//www.knvod.com/${next.replace(/^\/+/, "")}`;
  }
  if (title) url += `&title=${encodeURIComponent(title)}`;
  return url;
}

function directPlayResult(url, referer) {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  return {
    parse: 0,
    jx: 0,
    url,
    urls: [{ name: "播放", url }],
    header,
    headers: header,
  };
}

function sniffPlayResult(url, referer, name = "播放页") {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  return {
    parse: 1,
    jx: 1,
    url,
    urls: [{ name, url }],
    header,
    headers: header,
  };
}

function normalizeSniffUrls(result, defaultName) {
  const urls = [];
  const seen = new Set();
  const append = (item) => {
    const value = typeof item === "string" ? item : (item?.url || item?.playUrl || item?.src || "");
    const url = String(value || "").trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push({ name: String(item?.name || defaultName || "嗅探线路"), url });
  };

  if (Array.isArray(result?.urls)) result.urls.forEach(append);
  if (!urls.length) append(result);
  return urls;
}

async function serverSniffOrBrowserFallback(targetUrl, referer, name = "播放") {
  const fallbackHeader = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  if (typeof OmniBox.sniffVideo === "function") {
    try {
      const sniffed = await OmniBox.sniffVideo(targetUrl, fallbackHeader);
      const urls = normalizeSniffUrls(sniffed, name);
      if (urls.length) {
        const header = sniffed?.header || sniffed?.headers || fallbackHeader;
        await OmniBox.log("info", `[柯南影视][play] 服务端嗅探成功 sniffed=${JSON.stringify(sniffed)}`);
        return {
          parse: 0,
          jx: 0,
          url: urls[0].url,
          urls,
          header,
          headers: header,
          danmaku: sniffed?.danmaku || [],
        };
      }
      await OmniBox.log("warn", "[柯南影视][play] 服务端嗅探无结果，转浏览器嗅探");
    } catch (error) {
      await OmniBox.log("warn", `[柯南影视][play] 服务端嗅探失败，转浏览器嗅探: ${error.message}`);
    }
  }
  return sniffPlayResult(targetUrl, referer, name);
}

async function home() {
  const list = [];
  const seen = new Set();

  try {
    const pages = await Promise.allSettled([
      apiVodList({ page: 1 }),
      apiVodList({ page: 2 }),
      apiVodList({ page: 3 }),
    ]);
    for (const result of pages) {
      if (result.status === "fulfilled") list.push(...result.value.list);
    }
    if (!list.length && pages[0].status === "rejected") {
      await OmniBox.log("warn", `[柯南影视][home] api ${pages[0].reason.message}`);
    }
  } catch (error) {
    await OmniBox.log("warn", `[柯南影视][home] api ${error.message}`);
  }

  if (!list.length) {
    for (const item of CLASS_LIST) {
      try {
        const html = await fetchText(`${HOST}/vshow/${item.type_id}-----------.html`);
        for (const video of extractVideos(html)) {
          if (seen.has(video.vod_id)) continue;
          seen.add(video.vod_id);
          list.push(video);
        }
        if (list.length >= 72) break;
      } catch (error) {
        await OmniBox.log("warn", `[柯南影视][home] tid=${item.type_id} ${error.message}`);
      }
    }
  }

  if (!list.length) {
    try {
      const html = await fetchText(`${HOST}/`);
      for (const video of extractVideos(html)) {
        if (seen.has(video.vod_id)) continue;
        seen.add(video.vod_id);
        list.push(video);
      }
    } catch (error) {
      await OmniBox.log("warn", `[柯南影视][home] ${error.message}`);
    }
  }

  return { class: CLASS_LIST, filters: {}, list: list.slice(0, 72) };
}

async function category(params) {
  const page = Math.max(1, parseInt(params.page || 1, 10));
  try {
    const tid = String(params.categoryId || params.type_id || "1").trim();
    try {
      return await apiVodList({ type: tid, page });
    } catch (error) {
      await OmniBox.log("warn", `[柯南影视][category] api ${error.message}`);
    }
    const url = `${HOST}/vshow/${tid}--------${page}---.html`;
    const html = await fetchText(url);
    const list = extractVideos(html);
    return {
      page,
      pagecount: parsePageCount(html, page, list.length),
      total: list.length,
      list,
    };
  } catch (error) {
    await OmniBox.log("error", `[柯南影视][category] ${error.message}`);
    return { page, pagecount: 0, total: 0, list: [] };
  }
}

async function search(params) {
  const page = Math.max(1, parseInt(params.page || 1, 10));
  try {
    const keyword = String(params.keyword || params.wd || params.key || "").trim();
    if (!keyword) return { page, pagecount: 0, total: 0, list: [] };
    const url = `${HOST}/search/${encodeURIComponent(keyword)}-------------.html`;
    try {
      const html = await fetchText(url);
      const list = extractVideos(html);
      if (list.length) return { page, pagecount: 1, total: list.length, list };
    } catch (error) {
      await OmniBox.log("warn", `[柯南影视][search] page ${error.message}`);
    }
    try {
      return await apiVodList({ wd: keyword, tag: "", page });
    } catch (error) {
      await OmniBox.log("warn", `[柯南影视][search] api ${error.message}`);
    }
    const html = await fetchText(url);
    const list = extractVideos(html);
    return { page, pagecount: list.length ? 1 : 0, total: list.length, list };
  } catch (error) {
    await OmniBox.log("error", `[柯南影视][search] ${error.message}`);
    return { page, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params) {
  try {
    const input = String(params.videoId || params.id || params.categoryId || "").trim();
    const idMatch = input.match(/\/vdetail\/(\d+)\.html/i) || input.match(/^(\d+)$/);
    const vodId = idMatch ? idMatch[1] : "";
    if (!vodId) return { list: [] };

    const html = await fetchText(`${HOST}/vdetail/${vodId}.html`);
    const titleMatch = html.match(/<h3\b[^>]*class=["'][^"']*slide-info-title[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)
      || html.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
    const picMatch = html.match(/detail-pic[\s\S]*?<img\b[^>]*(?:data-src|src)=["']([^"']+)["']/i)
      || html.match(/slide-time-img2[\s\S]*?<img\b[^>]*(?:data-src|src)=["']([^"']+)["']/i);
    const contentMatch = html.match(/id=["']height_limit["'][^>]*>([\s\S]*?)<\/div>/i);
    const typeBlock = extractLabeledBlock(html, "类型");
    const areaBlock = extractLabeledBlock(html, "地区");
    const yearBlock = extractLabeledBlock(html, "年份");
    const playSources = parsePlaySources(html);

    return {
      list: [{
        vod_id: vodId,
        vod_name: cleanText(titleMatch ? titleMatch[1] : ""),
        vod_pic: fixPicUrl(picMatch ? picMatch[1] : ""),
        type_name: cleanText(typeBlock),
        vod_year: cleanText(yearBlock),
        vod_area: cleanText(areaBlock),
        vod_remarks: "",
        vod_actor: extractPeople(html, "主演"),
        vod_director: extractPeople(html, "导演"),
        vod_content: cleanText(contentMatch ? contentMatch[1] : ""),
        vod_play_sources: playSources,
      }],
    };
  } catch (error) {
    await OmniBox.log("error", `[柯南影视][detail] ${error.message}`);
    return { list: [] };
  }
}

async function play(params) {
  try {
    const input = String(params.playId || params.id || params.url || params.input || "").trim();
    if (!input) return { parse: 0, jx: 0, url: "", urls: [], header: {} };

    const playUrl = absUrl(input);
    if (isOfficialSource(playUrl)) {
      const officialUrl = await resolveOfficialSource(playUrl);
      if (officialUrl) return directPlayResult(officialUrl, `${BFQ_HOST}/`);
    }
    if (isDirectMedia(playUrl)) return directPlayResult(playUrl, `${HOST}/`);

    const html = await fetchText(playUrl, { referer: `${HOST}/`, timeout: 20000, retries: 0 });
    const iframeRegex = /<iframe\b[^>]*src=["']([^"']+)["']/gi;
    let iframeMatch;
    while ((iframeMatch = iframeRegex.exec(html)) !== null) {
      const iframeUrl = absUrl(iframeMatch[1], playUrl);
      if (isDirectMedia(iframeUrl)) return directPlayResult(iframeUrl, playUrl);
    }

    const playerMatch = html.match(/var\s+player_[a-zA-Z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i)
      || html.match(/var\s+player_[a-zA-Z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;/i);
    if (playerMatch) {
      let playerData;
      try {
        playerData = JSON.parse(playerMatch[1]);
      } catch (_) {
        playerData = null;
      }

      if (playerData) {
        let mediaUrl = decodePlayerUrl(playerData.url, playerData.encrypt);
        if (isDirectMedia(mediaUrl)) {
          if (/\.m3u8(?:$|[?#])/i.test(mediaUrl)) mediaUrl = await resolveM3u8Child(mediaUrl, playUrl);
          return directPlayResult(mediaUrl, `${HOST}/`);
        }
        if (isOfficialSource(mediaUrl)) {
          const officialUrl = await resolveOfficialSource(mediaUrl);
          if (officialUrl) return directPlayResult(officialUrl, `${BFQ_HOST}/`);
        }
        if (mediaUrl) {
          const parserUrl = buildParserUrl(mediaUrl, playerData.link_next, playerData.vod_data?.vod_name);
          return await serverSniffOrBrowserFallback(parserUrl, `${PARSER_HOST}/`, playerData.vod_data?.vod_name || "播放");
        }
      }
    }

    const directMatch = html.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4|flv|mkv)(?:\?[^"']*)?)["']/i);
    if (directMatch) return directPlayResult(decodeHtml(directMatch[1]).replace(/\\\//g, "/"), `${HOST}/`);
    return await serverSniffOrBrowserFallback(playUrl, `${HOST}/`, "播放");
  } catch (error) {
    await OmniBox.log("error", `[柯南影视][play] ${error.message}`);
    return { parse: 0, jx: 0, url: "", urls: [], header: {} };
  }
}

});

_load(6, "歪比巴卜", function (module, exports, require) {
/**
 * @name 歪比巴卜
 * @key wbbb
 * @type 4
 * @api /video/wbbb
 * @searchable 1
 * @quickSearch 1
 * @changeable 0
 * @version 1.0.7
 * @downloadURL https://github.com/Silent1566/OmniBox-Spider/raw/main/影视/采集/歪比巴卜.js
 */

let OmniBox;
try {
  OmniBox = require('omnibox_sdk');
} catch (_) {
  OmniBox = {
    log(level, message) {
      console.log(`[${level}] ${message}`);
    },
  };
}
let runner;
try {
  runner = require('spider_runner');
} catch (_) {
  runner = { run() {} };
}
const axios = require('axios');
const http = require('http');
const https = require('https');
const CryptoJS = require('crypto-js');

const SITE = {
  key: 'wbbb',
  name: '歪比巴卜',
  api: '/video/wbbb',
  host: 'https://wbbb1.com',
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  timeout: 20000,
};

const CATS = [
  { type_id: '1', type_name: '电影' },
  { type_id: '2', type_name: '剧集' },
  { type_id: '3', type_name: '动漫' },
  { type_id: '4', type_name: '综艺' },
];

const LINE_DIRECT_RE = /^(?:lzm3u8|bfzym3u8)$/i;

const httpClient = axios.create({
  timeout: SITE.timeout,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  maxRedirects: 0,
  validateStatus: () => true,
  headers: {
    'User-Agent': SITE.ua,
    'Referer': `${SITE.host}/`,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Upgrade-Insecure-Requests': '1',
  },
});

const siteCookies = new Map();

function mergeCookies(setCookie) {
  const items = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
  for (const raw of items) {
    const pair = String(raw || '').split(';')[0].trim();
    const pos = pair.indexOf('=');
    if (pos <= 0) continue;
    const name = pair.slice(0, pos).trim();
    const value = pair.slice(pos + 1).trim();
    if (name) siteCookies.set(name, value);
  }
}

function cookieHeader() {
  return [...siteCookies.entries()]
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function looksLikeCookieChallenge(html = '') {
  const text = String(html || '');
  return text.length <= 1024 && /window\.location\.href\s*=\s*["'](?:https?:\/\/wbbb1\.com)?\//i.test(text);
}

function looksLikeSlideChallenge(html = '') {
  const text = String(html || '');
  return /<title>\s*滑动验证\s*<\/title>/i.test(text)
    && /src=["'][^"']*\/huadong_[^"']*\.js(?:\?[^"']*)?["']/i.test(text);
}

function extractSlideChallengeToken(html) {
  const src = pickMatch(html, /src=["']([^"']*\/huadong_[^"']*\.js(?:\?[^"']*)?)["']/i, 1, '');
  if (!src) return null;
  const path = src.startsWith('/') ? src : `/${src}`;
  const jsUrl = absUrl(path);
  const id = pickMatch(jsUrl, /[?&]id=([0-9]+)/i, 1, '');
  if (!id) return null;
  const key = pickMatch(jsUrl, /([0-9a-f]{8})_([0-9a-f]{32})\.js/i, 2, '');
  if (!key) return null;
  return { jsUrl, id, key };
}

function slideChallengeSignature(value) {
  let text = '';
  for (let i = 0; i <= String(value || '').length - 1; i++) {
    text += String(String(value || '').charCodeAt(i) + 1);
  }
  return CryptoJS.MD5(text).toString();
}

async function resolveSlideChallenge(fullUrl) {
  const firstRes = await httpClient.get(fullUrl, { headers: { Cookie: cookieHeader() } });
  lastStatus = firstRes.status;
  mergeCookies(firstRes.headers?.['set-cookie']);
  if (!looksLikeSlideChallenge(firstRes.data)) return firstRes;

  const token = extractSlideChallengeToken(firstRes.data);
  if (!token) throw new Error('slide challenge token missing');

  const scriptRes = await httpClient.get(token.jsUrl, { headers: { Cookie: cookieHeader(), Referer: fullUrl } });
  lastStatus = scriptRes.status;
  mergeCookies(scriptRes.headers?.['set-cookie']);
  const scriptValue = pickMatch(scriptRes.data, /key=["']([^"']*)["']\s*,\s*value=["']([^"']*)["']/i, 2, '');
  if (!scriptValue) throw new Error('slide challenge value missing');

  const verifyUrl = `https://wbbb1.com/a20be899_96a6_40b2_88ba_32f1f75f1552_yanzheng_huadong.php?type=ad82060c2e67cc7e2cc47552a4fc1242&key=${encodeURIComponent(token.key)}&value=${encodeURIComponent(slideChallengeSignature(scriptValue))}`;
  const verifyRes = await httpClient.get(verifyUrl, { headers: { Cookie: cookieHeader(), Referer: fullUrl } });
  lastStatus = verifyRes.status;
  mergeCookies(verifyRes.headers?.['set-cookie']);

  return await httpClient.get(fullUrl, { headers: { Cookie: cookieHeader(), Referer: `${SITE.host}/` } });
}

async function getHtml(url) {
  const full = /^https?:\/\//.test(url) ? url : `${SITE.host}${url}`;
  let lastStatus = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const cookie = cookieHeader();
    const res = await httpClient.get(full, cookie ? { headers: { Cookie: cookie } } : undefined);
    lastStatus = res.status;
    mergeCookies(res.headers?.['set-cookie']);
    if (res.status >= 200 && res.status < 300 && !looksLikeCookieChallenge(res.data)) {
      return res.data || '';
    }
    if (res.status === 403 && looksLikeSlideChallenge(res.data)) {
      OmniBox.log('info', `[wbbb][html][slide-challenge] url=${redactSensitive(full)}, attempt=${attempt + 1}`);
      const retryRes = await resolveSlideChallenge(full);
      mergeCookies(retryRes.headers?.['set-cookie']);
      if (retryRes.status >= 200 && retryRes.status < 300 && !looksLikeSlideChallenge(retryRes.data)) {
        return retryRes.data || '';
      }
      break;
    }
    if (res.status !== 403 || !cookieHeader()) break;
    OmniBox.log('info', `[wbbb][html][cookie-retry] url=${redactSensitive(full)}, attempt=${attempt + 1}, htmlLength=${String(res.data || '').length}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`HTTP ${lastStatus || 'request failed'}`);
}

function pickMatch(str, reg, idx = 1, def = '') {
  const m = str.match(reg);
  return m ? (m[idx] || def) : def;
}

function stripTags(str = '') {
  return String(str)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSlashText(str = '') {
  return stripTags(str)
    .replace(/\s*\/\s*/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .trim();
}

function escapeRegExp(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toProtocolRelativeUrl(url = '') {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (raw.startsWith('//')) return raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      return `//${u.host}${u.pathname}${u.search}${u.hash}`;
    } catch (_) {}
  }
  if (raw.startsWith('/')) {
    try {
      return `//${new URL(SITE.host).host}${raw}`;
    } catch (_) {}
  }
  return raw;
}

function redactSensitive(value = '') {
  return String(value == null ? '' : value)
    .replace(/([?&](?:url|key|vkey|ckey|token|play|player|auth|sign)=)([^&]+)/ig, '$1[REDACTED]')
    .replace(/(cookie\s*[:=]\s*)([^;\n]+)/ig, '$1[REDACTED]')
    .replace(/[A-Za-z0-9+/=_-]{32,}/g, (token) => `[REDACTED:${token.length}]`);
}

function redactJson(value) {
  try {
    return redactSensitive(JSON.stringify(value));
  } catch (_) {
    return redactSensitive(String(value || ''));
  }
}

function buildCookieHeader(setCookie) {
  return (Array.isArray(setCookie) ? setCookie : [])
    .map((item) => String(item || '').split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

function isInvalidWbbbLineName(name = '') {
  const value = stripTags(String(name || '')).replace(/\s+/g, '').trim();
  return !value || /^(?:排序|选择播放源|切换播放源|更多|展开|收起)$/i.test(value);
}

function buildWbbbEpisode(item = '') {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const playUrl = absUrl(item.playUrl || item.playId || item.url || item.id || '');
    const name = stripTags(item.name || '').trim();
    if (!playUrl || !name) return null;
    return { name, id: playUrl, playId: playUrl, playUrl, url: playUrl };
  }
  const text = String(item || '').trim();
  if (!text) return null;
  const sep = text.indexOf('$');
  if (sep < 0) return null;
  const name = text.slice(0, sep).trim();
  const playUrl = absUrl(text.slice(sep + 1).trim());
  if (!name || !playUrl) return null;
  return { name, id: playUrl, playId: playUrl, playUrl, url: playUrl };
}

function buildWbbbPlaySource(lineName, items, idx = 0) {
  if (isInvalidWbbbLineName(lineName)) return null;
  const name = stripTags(String(lineName || '')).replace(/\s+/g, ' ').trim() || `线路${idx + 1}`;
  const seen = new Set();
  const episodes = [];
  for (const item of Array.isArray(items) ? items : []) {
    const episode = buildWbbbEpisode(item);
    if (!episode || seen.has(episode.playId)) continue;
    seen.add(episode.playId);
    episodes.push(episode);
  }
  if (!episodes.length) return null;
  return {
    name,
    url: episodes.map((episode) => `${episode.name}$${episode.playUrl}`).join('#'),
    episodes,
  };
}

function extractCurrentEpisodeName(html = '', vodName = '') {
  const activeText = stripTags(pickMatch(html, /<a[^>]+module-play-list-link[^"']*active[^"']*[^>]*>([\s\S]*?)<\/a>/i, 1, ''));
  const fallbackText = stripTags(pickMatch(html, /(?:正在播放|当前播放)[^：:]*[：:]\s*([\s\S]*?)(?:<|$)/i, 1, ''));
  let episodeName = activeText || fallbackText;
  if (vodName && episodeName) {
    episodeName = episodeName.replace(new RegExp(`^${escapeRegExp(vodName)}\s*`), '').trim();
    episodeName = episodeName.replace(new RegExp(`^《?${escapeRegExp(vodName)}》?\s*`), '').trim();
  }
  return episodeName.trim();
}

function buildWbbbResolveTitle(html = '', player = {}) {
  const vodName = String(player?.vod_data?.vod_name || '').trim();
  const episodeName = extractCurrentEpisodeName(html, vodName);
  const title = `在线播放${vodName}${episodeName ? ` ${episodeName}` : ''}`.trim();
  return title || vodName || '在线播放';
}

function absUrl(url = '') {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${SITE.host}${url}`;
  return `${SITE.host}/${url}`;
}

function normalizeVodFromCard(block) {
  const vod_id = pickMatch(block, /href="\/detail\/(\d+)\.html"/, 1, '');
  const vod_name = stripTags(pickMatch(block, /<div class="module-(?:poster-item-title|card-item-title)">([\s\S]*?)<\/div>/, 1, '')) || pickMatch(block, /alt="([^"]+)"/, 1, '');
  const vod_pic = absUrl(pickMatch(block, /(?:data-original|data-src|src)="([^"]+)"/, 1, ''));
  const vod_remarks = stripTags(pickMatch(block, /<div class="module-item-note">([\s\S]*?)<\/div>/, 1, ''));
  return { vod_id, vod_name, vod_pic, vod_remarks };
}

function parseCards(html) {
  const list = [];
  const reg = /<a href="\/detail\/(\d+)\.html" title="([^"]+)" class="module-poster-item module-item">([\s\S]*?)<\/a>/g;
  let m;
  while ((m = reg.exec(html)) !== null) {
    const block = m[0];
    list.push({
      vod_id: m[1],
      vod_name: m[2],
      vod_pic: absUrl(pickMatch(block, /(?:data-original|data-src|src)="([^"]+)"/, 1, '')),
      vod_remarks: stripTags(pickMatch(block, /<div class="module-item-note">([\s\S]*?)<\/div>/, 1, '')),
    });
  }
  if (list.length) return list;

  const reg2 = /<div class="module-card-item module-item">([\s\S]*?)<\/div>\s*<\/div>/g;
  while ((m = reg2.exec(html)) !== null) {
    const vod = normalizeVodFromCard(m[1]);
    if (vod.vod_id && vod.vod_name) list.push(vod);
  }
  return list;
}

/**
 * 解析播放标签（线路）名称。
 *
 * 原实现只匹配了两种特定的 HTML 结构，导致在页面结构略有变化时返回空数组，
 * 从而使得后续的播放线路名全部回退为默认的 "线路N"，甚至导致播放列表
 * 完全为空。这里改用更宽松的正则捕获所有带有 `module-tab-item` 类的 div，
 * 优先读取 `data-dropdown-value`，没有则取标签内部文字（去除 HTML）。
 */
function parseTabs(detailHtml) {
  const tabs = [];
  // 捕获包含 class="module-tab-item"（或其它组合） 的 div 块
  const reg = /<div[^>]*class=["'][^"'>]*\bmodule-tab-item\b[^"'>]*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = reg.exec(detailHtml)) !== null) {
    const block = m[0];
    // 先尝试 data-dropdown-value 属性
    const value = pickMatch(block, /data-dropdown-value\s*=\s*['"]([^'"]+)['"]/i, 1, '').trim();
    if (value) {
      if (!isInvalidWbbbLineName(value)) tabs.push(value);
      continue;
    }
    // 否则提取块内部的文字作为名称（去除标签）
    const inner = stripTags(m[1] || '').trim();
    if (inner && !isInvalidWbbbLineName(inner)) tabs.push(inner);
  }
  // 若仍未解析到任何线路，保持空数组，后续逻辑会使用兜底方案
  return tabs;
}

function parsePlayGroups(detailHtml) {
  const groups = [];
  const blockReg = /<div class="module-play-list-content[^\"]*">([\s\S]*?)<\/div>/g;
  let m;
  while ((m = blockReg.exec(detailHtml)) !== null) {
    const block = m[1];
    const items = [];
    const aReg = /<a[^>]+class="module-play-list-link[^\"]*"[^>]+href="([^\"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let a;
    while ((a = aReg.exec(block)) !== null) {
      const href = absUrl(a[1]);
      const label = stripTags(a[2]).trim();
      if (!href || !label) continue;
      items.push(`${label}$${href}`);
    }
    if (items.length) groups.push(items);
  }

  if (groups.length) return groups;

  const hrefOnly = [...detailHtml.matchAll(/<a[^>]+href="([^\"]*\/(?:vplay|play)\/[^\"#]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  if (hrefOnly.length) {
    return [hrefOnly.map((mm) => `${stripTags(mm[2]).trim() || '播放'}$${absUrl(mm[1])}`)];
  }
  return groups;
}

function parsePlayer(html) {
  const patterns = [
    /var\s+player_aaaa\s*=\s*(\{.*?\})<\/script>/s,
    /var\s+player_.*?=\s*(\{.*?\})<\/script>/s,
    /player_aaaa\s*=\s*(\{.*?\})\s*;/s,
    /player_data\s*=\s*(\{.*?\})\s*;/s,
  ];
  for (const reg of patterns) {
    const m = html.match(reg);
    if (!m) continue;
    try { return JSON.parse(m[1]); } catch (_) {}
  }
  return null;
}

function decodePlayUrl(raw, encrypt) {
  let url = String(raw || '').trim();
  const enc = String(encrypt || '').trim();
  if (enc === '1') {
    try { url = unescape(url); } catch (_) {}
  } else if (enc === '2') {
    try { url = Buffer.from(url, 'base64').toString('utf8'); } catch (_) {}
    try { url = unescape(url); } catch (_) {}
  }
  if (url.startsWith('//')) url = `https:${url}`;
  else if (url.startsWith('/')) url = absUrl(url);
  return url;
}

function isDirectMediaUrl(url, fromOrType) {
  const value = String(url || '').trim();
  const hint = String(fromOrType || '').trim();
  if (!value) return false;
  if (/\.(?:m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)(?:[?#]|$)/i.test(value)) return true;
  if (/^(?:m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)$/i.test(hint) && /^https?:\/\//i.test(value)) return true;
  if (LINE_DIRECT_RE.test(hint)) return true;
  try {
    const u = new URL(value);
    return /\.(?:m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)(?:$|\?)/i.test(u.pathname + u.search);
  } catch (_) {
    return false;
  }
}

function decodeAesMaybeBase64(value = '') {
  const text = String(value || '').trim();
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(text) && text.length % 4 === 0) {
    try { return CryptoJS.enc.Base64.parse(text); } catch (_) {}
  }
  return CryptoJS.enc.Utf8.parse(text);
}

function rc4b64(key, data) {
  const S = [];
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0, x;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key.charCodeAt(i % key.length)) & 255;
    x = S[i]; S[i] = S[j]; S[j] = x;
  }
  let i = 0; j = 0;
  const bytes = Buffer.from(data, 'utf8');
  const res = [];
  for (let c of bytes) {
    i = (i + 1) & 255;
    j = (j + S[i]) & 255;
    x = S[i]; S[i] = S[j]; S[j] = x;
    res.push(c ^ S[(S[i] + S[j]) & 255]);
  }
  return Buffer.from(res).toString('base64');
}

async function resolveWbbbPlayerUrl(playerToken, nextUrl, title, urlNextToken, linkNext) {
  const host = 'xn--qvr2v.850088.xyz';
  const salt = 'stray';
  const urlParam = String(playerToken || '').trim();
  if (!urlParam) throw new Error('playerToken missing');

  const domainNext = String(linkNext || '').trim()
    ? `//wbbb1.com${linkNext}`
    : String(urlNextToken || '').trim() || toProtocolRelativeUrl(nextUrl);
  const parsePageUrl = `https://${host}/player/?url=${encodeURIComponent(urlParam)}&next=${encodeURIComponent(domainNext)}&title=${encodeURIComponent(title || '')}`;

  const parseRes = await httpClient.get(parsePageUrl, {
    headers: { 'User-Agent': SITE.ua, 'Referer': `${SITE.host}/` },
  });
  const parserCookie = buildCookieHeader(parseRes.headers?.['set-cookie']);

  const t = String(Math.floor(Date.now() / 1000));
  const md5 = (s) => CryptoJS.MD5(String(s)).toString();
  const rc4key = (md5(urlParam) + ' P').slice(-22);

  const formPayload = {
    url: urlParam,
    key: rc4b64(rc4key, md5(urlParam + salt)),
    vkey: rc4b64(rc4key, t + md5(rc4key + salt)),
    ckey: rc4b64(rc4key, md5(host + salt)),
  };

  const apiUrl = `https://${host}/player/api.php`;
  const formData = new URLSearchParams(formPayload).toString();
  const apiRes = await httpClient.post(apiUrl, formData, {
    headers: {
      'User-Agent': SITE.ua,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': parsePageUrl,
      'Origin': `https://${host}`,
      ...(parserCookie ? { Cookie: parserCookie } : {}),
    },
  });

  const payload = typeof apiRes.data === 'string' ? JSON.parse(apiRes.data) : apiRes.data;
  if (!payload || !payload.url) {
    throw new Error(payload && payload.msg ? payload.msg : 'parse api failed');
  }

  const key = CryptoJS.enc.Utf8.parse('OddfJktEbGu7gCv9');
  const iv = CryptoJS.enc.Utf8.parse('okjutU3RjGpWqB8Z');
  const decryptResult = CryptoJS.AES.decrypt(payload.url, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const finalUrl = (decryptResult.toString(CryptoJS.enc.Utf8) || '').trim();

  if (!finalUrl) throw new Error('decrypt failed');
  let resultUrl = finalUrl;
  if (finalUrl.startsWith('//')) resultUrl = `https:${finalUrl}`;
  else if (finalUrl.startsWith('/')) resultUrl = `${SITE.host}${finalUrl}`;
  return { url: resultUrl, type: payload.type || '', parsePageUrl, cookie: parserCookie };
}

async function home(params = {}) {
  OmniBox.log('info', `[wbbb][home] params=${JSON.stringify(params)}`);
  try {
    const html = await getHtml('/');
    const list = parseCards(html).slice(0, 40);
    return { class: CATS, list };
  } catch (e) {
    OmniBox.log('error', `[wbbb][home] error=${e.message}`);
    return { class: CATS, list: [], error: e.message || String(e) };
  }
}

async function category(params = {}) {
  OmniBox.log('info', `[wbbb][category] params=${JSON.stringify(params)}`);
  try {
    const id = params.id || params.t || params.type_id || params.categoryId || '1';
    const page = parseInt(params.page || params.pg || '1', 10) || 1;
    const path = page > 1 ? `/show/${id}--------${page}---.html` : `/show/${id}-----------.html`;
    OmniBox.log('info', `[wbbb][category] url=${SITE.host}${path}`);
    const html = await getHtml(path);
    const list = parseCards(html);
    OmniBox.log('info', `[wbbb][category] id=${id} page=${page} count=${list.length}`);
    const hasNext = html.includes('title="下一页"');
    return { list, page, pagecount: hasNext ? page + 1 : page, total: list.length };
  } catch (e) {
    OmniBox.log('error', `[wbbb][category] error=${e.message}`);
    const page = parseInt(params.page || params.pg || '1', 10) || 1;
    return { list: [], page, pagecount: page, total: 0, error: e.message || String(e) };
  }
}

async function detail(params = {}) {
  OmniBox.log('info', `[wbbb][detail][01] 入口参数 params=${JSON.stringify(params)}`);
  try {
    OmniBox.log('info', '[wbbb][detail][02] 开始解析视频 ID');
    let ids = [];
    if (Array.isArray(params.id)) ids = params.id;
    else if (Array.isArray(params.ids)) ids = params.ids;
    else if (params.ids) ids = String(params.ids).split(',').map((s) => s.trim()).filter(Boolean);
    else if (params.id) ids = String(params.id).split(',').map((s) => s.trim()).filter(Boolean);
    else if (params.vod_id) ids = String(params.vod_id).split(',').map((s) => s.trim()).filter(Boolean);
    else if (params.videoId) ids = String(params.videoId).split(',').map((s) => s.trim()).filter(Boolean);
    else if (params.video_id) ids = String(params.video_id).split(',').map((s) => s.trim()).filter(Boolean);
    OmniBox.log('info', `[wbbb][detail][03] 解析到 ids=${JSON.stringify(ids)}`);

    if (!ids.length) {
      OmniBox.log('warn', '[wbbb][detail][04] 未解析到任何视频 ID，直接返回空列表');
      return { list: [] };
    }

    const list = [];
    for (const rawId of ids) {
      const mediaId = String(rawId).trim();
      const detailPath = `/detail/${mediaId}.html`;
      OmniBox.log('info', `[wbbb][detail][05] 准备请求详情页 mediaId=${mediaId}, url=${SITE.host}${detailPath}`);
      const html = await getHtml(detailPath);
      OmniBox.log('info', `[wbbb][detail][06] 详情页请求完成 mediaId=${mediaId}, htmlLength=${String(html || '').length}, hasVplay=${String(html || '').includes('/vplay/')}`);

      OmniBox.log('info', '[wbbb][detail][07] 开始解析基础信息：标题/封面/简介/标签/导演/主演');
      const vod_name = stripTags(pickMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/, 1, ''));
      const vod_pic = absUrl(pickMatch(html, /<div class="module-item-pic">[\s\S]*?<img[^>]+data-original="([^\"]+)"/, 1, ''))
        || absUrl(pickMatch(html, /<div class="module-item-pic">[\s\S]*?<img[^>]+(?:data-src|src)="([^\"]+)"/, 1, ''));
      const vod_content = stripTags(pickMatch(html, /<div class="module-info-introduction-content[^>]*>([\s\S]*?)<\/div>/, 1, ''));
      const tagLinks = [...html.matchAll(/<div class="module-info-tag-link">([\s\S]*?)<\/div>/g)].map(x => x[1]);
      const vod_year = stripTags(tagLinks[0] || '');
      const vod_area = stripTags(tagLinks[1] || '');
      const vod_type = cleanSlashText(tagLinks[2] || '');
      const vod_remarks = stripTags(pickMatch(html, /<div class="module-item-note">([\s\S]*?)<\/div>/, 1, '')) || stripTags(pickMatch(html, /\u66f4\u65b0\u81f3[^<\s]+/, 0, ''));
      const vod_director = cleanSlashText(pickMatch(html, /\u5bfc\u6f14：[\s\S]*?<div[^>]*class="module-info-item-content">([\s\S]*?)<\/div>/, 1, ''));
      const vod_actor = cleanSlashText(pickMatch(html, /\u4e3b\u6f14：[\s\S]*?<div[^>]*class="module-info-item-content">([\s\S]*?)<\/div>/, 1, ''));
      OmniBox.log('info', `[wbbb][detail][08] 基础信息完成 mediaId=${mediaId}, name=${vod_name || '空'}, pic=${vod_pic ? '有' : '空'}, contentLen=${vod_content.length}, tags=${tagLinks.length}`);

      OmniBox.log('info', '[wbbb][detail][09] 开始解析播放线路 tabs');
      const tabs = parseTabs(html);
      OmniBox.log('info', `[wbbb][detail][10] tabs 解析完成 count=${tabs.length}, tabs=${tabs.join(' / ') || '空'}`);

      OmniBox.log('info', '[wbbb][detail][11] 开始解析播放分组 groups');
      const groups = parsePlayGroups(html);
      OmniBox.log('info', `[wbbb][detail][12] groups 解析完成 count=${groups.length}, episodeCounts=${groups.map(g => g.length).join('/') || '空'}`);

      let playSources = [];
      OmniBox.log('info', '[wbbb][detail][13] 开始组装 vod_play_from / vod_play_url');
      groups.forEach((items, idx) => {
        const lineName = tabs[idx] || `线路${idx + 1}`;
        const source = buildWbbbPlaySource(lineName, items, idx);
        if (!source) {
          OmniBox.log('warn', `[wbbb][detail][13-${idx}] 跳过无效播放组 idx=${idx}, lineName=${lineName}, itemCount=${Array.isArray(items) ? items.length : 0}`);
          return;
        }
        playSources.push(source);
      });
      // 如果结构化分组解析失败，再直接抓取页面中所有 /vplay/ 或 /play/ 链接作为单线路兜底。
      if (playSources.length === 0) {
        const seenFallback = new Set();
        const fallbackItems = [...html.matchAll(/<a[^>]+href=["']([^"']*\/(?:vplay|play)\/[^"']+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi)]
          .map((m, index) => {
            const href = absUrl(m[1]);
            const name = stripTags(m[2]).trim() || `第${index + 1}集`;
            if (!href || seenFallback.has(href)) return '';
            seenFallback.add(href);
            return `${name}$${href}`;
          })
          .filter(Boolean);
        const fallbackSource = buildWbbbPlaySource(tabs[0] || '播放线路', fallbackItems, 0);
        if (fallbackSource) {
          playSources = [fallbackSource];
          OmniBox.log('info', `[wbbb][detail][fallback] 结构化线路为空，捕获到 ${fallbackSource.episodes.length} 条 vplay/play 链接作为兜底线路`);
        }
      }
      const playFrom = playSources.map((source) => source.name);
      const playUrl = playSources.map((source) => source.url);
      const vodPlayFrom = playFrom.join('$$$');
      const vodPlayUrl = playUrl.join('$$$');
      OmniBox.log('info', `[wbbb][detail][14] 播放字段组装完成 fromCount=${playFrom.length}, urlGroupCount=${playUrl.length}, vod_play_url_length=${vodPlayUrl.length}, firstLine=${playFrom[0] || '空'}, firstEpisode=${playSources[0]?.episodes?.[0]?.playId || '空'}`);

      const vod = {
        videoId: mediaId,
        id: mediaId,
        vod_id: mediaId,
        vod_name,
        vod_pic,
        type_name: vod_type,
        vod_year,
        vod_area,
        vod_remarks,
        vod_actor,
        vod_director,
        vod_content,
        vod_play_from: vodPlayFrom,
        vod_play_url: vodPlayUrl,
        vod_play_list: playSources.map((source) => ({
          name: source.name,
          url: source.url,
          episodes: source.episodes.map((episode) => ({ ...episode })),
        })),
        vod_play_sources: playSources.map((source) => ({
          name: source.name,
          episodes: source.episodes.map((episode) => ({ ...episode })),
        })),
      };
      OmniBox.log('info', `[wbbb][detail][15] 结果对象完成 mediaId=${mediaId}, has_vod_play_from=${!!vod.vod_play_from}, has_vod_play_url=${!!vod.vod_play_url}, vod_play_list_count=${vod.vod_play_list.length}, vod_play_sources_count=${vod.vod_play_sources.length}`);
      OmniBox.log('info', `[wbbb][detail][final] 完整返回数据: ${JSON.stringify(vod, null, 2)}`);
      if (!vod.vod_play_url) {
        OmniBox.log('warn', `[wbbb][detail][16] 未生成 vod_play_url：htmlLength=${html.length}, hasVplay=${html.includes('/vplay/')}, tabs=${tabs.length}, groups=${groups.length}`);
      }
      list.push(vod);
    }
    OmniBox.log('info', `[wbbb][detail][17] 即将返回 list，总数=${list.length}, firstName=${list[0]?.vod_name || '空'}, firstPlayFrom=${list[0]?.vod_play_from || '空'}, firstPlayUrlLen=${list[0]?.vod_play_url?.length || 0}`);
    return { list };
  } catch (e) {
    OmniBox.log('error', `[wbbb][detail][ERR] error=${e.message}, stack=${e.stack || ''}`);
    return { list: [], error: e.message || String(e) };
  }
}

async function search(params = {}) {
  OmniBox.log('info', `[wbbb][search] params=${JSON.stringify(params)}`);
  try {
    const wd = params.wd || params.keyword || params.key || '';
    const page = parseInt(params.page || params.pg || '1', 10) || 1;
    if (!wd) return { list: [], page, pagecount: page, total: 0 };
    const path = page > 1 ? `/search/-------------.html?wd=${encodeURIComponent(wd)}&page=${page}` : `/search/-------------.html?wd=${encodeURIComponent(wd)}`;
    OmniBox.log('info', `[wbbb][search] url=${SITE.host}${path}`);
    const html = await getHtml(path);
    const list = parseCards(html);
    return { list, page, pagecount: list.length >= 20 ? page + 1 : page, total: list.length };
  } catch (e) {
    const page = parseInt(params.page || params.pg || '1', 10) || 1;
    OmniBox.log('error', `[wbbb][search] error=${e.message}`);
    return { list: [], page, pagecount: page, total: 0, error: e.message || String(e) };
  }
}

function buildPlayHeaders(extra = {}) {
  const headers = {
    'User-Agent': SITE.ua,
    Referer: `${SITE.host}/`,
    Origin: SITE.host,
  };
  return Object.assign(headers, extra || {});
}

function buildAppSniffFallback(sniffUrl, headers = {}) {
  const finalHeaders = buildPlayHeaders(headers);
  return {
    parse: 1,
    jx: 1,
    url: sniffUrl,
    playId: sniffUrl,
    urls: [{ name: '嗅探线路', url: sniffUrl, playId: sniffUrl }],
    header: finalHeaders,
  };
}

async function play(params = {}) {
  OmniBox.log('info', `[wbbb][play][start] raw params=${JSON.stringify(params)}`);
  const rawId = params.id || params.playId || params.play || params.url || (typeof params === 'string' ? params : '');
  if (!rawId) {
    OmniBox.log('error', '[wbbb][play][ERR] No identifier provided in params');
    return { parse: 1, jx: 1, url: '', playId: '', error: 'Missing playback identifier' };
  }
  const id = /^https?:\/\//i.test(rawId) ? rawId : absUrl(rawId);
  OmniBox.log('info', `[wbbb][play][id] rawId=${String(rawId).slice(0, 120)}, normalized=${id}`);
  try {
    const html = await getHtml(id);
    const player = parsePlayer(html);
    OmniBox.log('info', `[wbbb][play] player url=${redactSensitive(player?.url || '')} from=${player?.from || ''}`);
    // If player parsing fails, try SDK sniff directly on the vplay page
    if (!player) {
      if (typeof OmniBox.sniffVideo === 'function') {
        try {
          const sniffed = await OmniBox.sniffVideo(id, { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` });
          if (sniffed?.url) {
            return { parse: 0, jx: 0, url: sniffed.url, playId: sniffed.url, header: sniffed.header || { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
          }
        } catch (e) {
          await OmniBox.log('warn', `[wbbb][play] sdk sniff failed: ${e.message || e}`);
        }
      }
      // final fallback: app sniff format
      const fallback = { parse: 0, jx: 0, url: id, playId: id, header: { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
      OmniBox.log('info', `[wbbb][play][fallback] ${redactJson(fallback)}`);
      return fallback;
    }
    // Attempt direct media URL
    const from = String(player.from || '').trim();
    const title = buildWbbbResolveTitle(html, player);
    OmniBox.log('info', `[wbbb][play][resolve-meta] current=${redactSensitive(id)}, from=${from}, title=${title}`);

    // 尝试通过静态 playerconfig.js 获取解析地址（在 SDK 嗅探前）
    const parseCandidates = [
      '/static/js/playerconfig.js',
      `/static/player/${from}.js`,
      '/static/player/config.js',
      '/js/playerconfig.js',
      '/player/config.js',
    ];
    for (const p of parseCandidates) {
      try {
        const conf = await getHtml(p);
        const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regs = [
          new RegExp(`player_list\\s*\\[\\s*['\"]${escapedFrom}['\"]\\s*\\]\\s*=\\s*\\{[\\s\\S]*?parse\\s*[:=]\\s*['\"]([^'\"]+)['\"]`, 'i'),
          new RegExp(`${escapedFrom}[\\s\\S]*?parse\\s*[:=]\\s*['\"]([^'\"]+)['\"]`, 'i'),
          new RegExp(`"${escapedFrom}"\\s*:\\s*\\{[\\s\\S]*?"parse"\\s*[:=]\\s*"([^\"]*)"`, 'i'),
          /MacPlayerConfig[\s\S]*?parse['"]?\s*[:=]\s*['"]([^'\"]+)['"]/i,
        ];
        for (const reg of regs) {
          const m = conf.match(reg);
          if (m && typeof m[1] === 'string') {
            const prefix = m[1].trim();
            if (prefix) {
              const jump = /^https?:\/\//i.test(prefix)
                ? `${prefix}${encodeURIComponent(player.url)}`
                : absUrl(`${prefix}${encodeURIComponent(player.url)}`);
              if (isDirectMediaUrl(jump, from)) {
                return { parse: 0, jx: 0, url: jump, playId: jump, header: { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
              }
              // otherwise continue to other fallback mechanisms
            }
          }
        }
      } catch (_) {}
    }
    const directUrl = decodePlayUrl(player.url, player.encrypt);
    if (isDirectMediaUrl(directUrl, from)) {
      return { parse: 0, jx: 0, url: directUrl, playId: directUrl, header: { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
    }
    // parse API handling
    const parseApi = String(player.parse || player.jx || '').trim();
    if (parseApi) {
      const jump = /^https?:\/\//i.test(parseApi)
        ? `${parseApi}${encodeURIComponent(directUrl)}`
        : absUrl(`${parseApi}${encodeURIComponent(directUrl)}`);
      return { parse: 0, jx: 0, url: jump, playId: jump, header: { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
    }
    // Resolve via external service
    let resolved = null;
    try {
      resolved = await resolveWbbbPlayerUrl(String(player.url || ''), '', title, String(player.url_next || '').trim(), String(player.link_next || '').trim());
    } catch (_) {}
    // If we got a resolved URL, prefer direct media return for tvbox/非 sniff 宿主
    if (resolved && resolved.url) {
      const resolvedUrl = String(resolved.url || '').trim();
      const resolvedType = String(resolved.type || '').trim();
      const resolvedHeaders = buildPlayHeaders({
        Referer: resolved.parsePageUrl || `${SITE.host}/`,
        ...(resolved.cookie ? { Cookie: resolved.cookie } : {}),
      });
      OmniBox.log('info', `[wbbb][play][resolved] url=${redactSensitive(resolvedUrl)}, type=${resolvedType || 'unknown'}, parsePage=${redactSensitive(resolved.parsePageUrl || '')}, hasCookie=${!!resolved.cookie}`);
      if (isDirectMediaUrl(resolvedUrl, resolvedType)) {
        return { parse: 0, jx: 0, url: resolvedUrl, playId: resolvedUrl, header: resolvedHeaders };
      }
      if (typeof OmniBox.sniffVideo === 'function') {
        try {
          const sniffed = await OmniBox.sniffVideo(resolvedUrl, resolvedHeaders);
          if (sniffed?.url) {
            return { parse: 0, jx: 0, url: sniffed.url, playId: sniffed.url, header: sniffed.header || resolvedHeaders };
          }
        } catch (e) {
          await OmniBox.log('warn', `[wbbb][play] sdk sniff on resolved failed: ${e.message || e}`);
        }
      }
      // fallback on resolved URL
      return buildAppSniffFallback(resolvedUrl, resolvedHeaders);
    }
    // No resolved URL – final fallback on original id
    if (typeof OmniBox.sniffVideo === 'function') {
      try {
        const fallbackHeaders = buildPlayHeaders();
        const sniffed = await OmniBox.sniffVideo(id, fallbackHeaders);
        if (sniffed?.url) {
          return { parse: 0, jx: 0, url: sniffed.url, playId: sniffed.url, header: sniffed.header || fallbackHeaders };
        }
      } catch (e) {
        await OmniBox.log('warn', `[wbbb][play] final sdk sniff failed: ${e.message || e}`);
      }
    }
    const fallback = { parse: 0, jx: 0, url: id, playId: id, header: buildPlayHeaders() };
    OmniBox.log('info', `[wbbb][play][fallback] ${redactJson(fallback)}`);
    return fallback;
  } catch (e) {
    return { parse: 1, jx: 1, url: id, playId: id, error: e.message || String(e) };
  }
}

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

});

_load(7, "毒舌影视", function (module, exports, require) {
// @name 毒舌影视
// @author 梦
// @description 影视站：https://www.xnhrsb.com/ ，支持首页、分类、详情、搜索与播放
// @dependencies cheerio
// @version 1.0.3
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/毒舌影视.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const BASE_URL = (process.env.DUSHE_HOST || "https://m.xnhrsb.com").replace(/\/$/, "");
const UA = process.env.DUSHE_UA || "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const HOME_CACHE_TTL = Number(process.env.DUSHE_HOME_CACHE_TTL || 900);
const CATEGORY_CACHE_TTL = Number(process.env.DUSHE_CATEGORY_CACHE_TTL || 900);
const DETAIL_CACHE_TTL = Number(process.env.DUSHE_DETAIL_CACHE_TTL || 1800);
const SEARCH_CACHE_TTL = Number(process.env.DUSHE_SEARCH_CACHE_TTL || 600);
const PLAY_CACHE_TTL = Number(process.env.DUSHE_PLAY_CACHE_TTL || 900);

const CATEGORY_CONFIG = [
  { id: "1", name: "电影" },
  { id: "2", name: "电视剧" },
  { id: "3", name: "综艺" },
  { id: "4", name: "动漫" },
  { id: "5", name: "短剧" },
  { id: "duoban", name: "豆瓣" },
];

const CLASS_LIST = CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name }));
const FILTERS = Object.fromEntries(
  CATEGORY_CONFIG.map((item) => [
    item.id,
    [
      {
        key: "type",
        name: "分类",
        value: [{ name: "全部", value: item.id }],
      },
    ],
  ])
);

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

function absUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  try {
    return new URL(raw, `${BASE_URL}/`).toString();
  } catch (_) {
    return raw;
  }
}

function cleanText(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function dedupeVodList(list) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(list) ? list : []) {
    const key = String(item?.vod_id || item?.vod_name || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function requestText(url, options = {}) {
  const method = options.method || "GET";
  await OmniBox.log("info", `[毒舌影视][request] ${method} ${url}`);
  const res = await OmniBox.request(url, {
    method,
    headers: {
      "User-Agent": UA,
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      Referer: options.referer || `${BASE_URL}/`,
      ...(options.headers || {}),
    },
    body: options.body,
    timeout: options.timeout || 20000,
  });
  const statusCode = Number(res?.statusCode || 0);
  const body = res?.body;
  const text = typeof body === "string" ? body : String(body || "");
  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode || "unknown"} @ ${url}`);
  }
  return text;
}

async function getCachedText(cacheKey, ttl, producer) {
  try {
    const cached = await OmniBox.getCache(cacheKey);
    if (cached) return String(cached);
  } catch (_) {}
  const text = String(await producer());
  try {
    await OmniBox.setCache(cacheKey, text, ttl);
  } catch (_) {}
  return text;
}

function buildCard($, li) {
  const node = $(li);
  const anchor = node.find("a[href]").first();
  const titleAnchor = node.find(".dytit a[href]").first();
  const href = titleAnchor.attr("href") || anchor.attr("href") || "";
  const img = node.find("img").first();
  const title = cleanText(titleAnchor.text() || img.attr("alt") || anchor.attr("title") || "");
  const pic = img.attr("data-original") || img.attr("src") || "";
  const remarks = cleanText(node.find(".hdinfo,.jidi,.bz").first().text());
  const actor = cleanText(node.find(".inzhuy").first().text().replace(/^主演[:：]?/, ""));
  return {
    vod_id: absUrl(href),
    vod_name: title,
    vod_pic: absUrl(pic),
    vod_remarks: remarks,
    vod_actor: actor,
  };
}

function parseHomeList(html) {
  const $ = cheerio.load(html);
  const list = [];
  $(".bt_img ul li").each((_, li) => list.push(buildCard($, li)));
  return dedupeVodList(list).filter((item) => item.vod_id && item.vod_name);
}

function parseCategoryList(html) {
  const $ = cheerio.load(html);
  const list = [];
  $(".bt_img ul li").each((_, li) => list.push(buildCard($, li)));

  let pagecount = 1;
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") || "";
    const matches = [...href.matchAll(/-(\d+)---\.html/g)];
    for (const m of matches) {
      const n = Number(m[1] || 1);
      if (Number.isFinite(n)) pagecount = Math.max(pagecount, n);
    }
  });

  return {
    list: dedupeVodList(list).filter((item) => item.vod_id && item.vod_name),
    pagecount,
  };
}

function parseMetaByLabel($, labels) {
  const needle = Array.isArray(labels) ? labels : [labels];
  let found = "";
  $("li,p,span,div").each((_, el) => {
    if (found) return;
    const text = cleanText($(el).text());
    if (!text) return;
    for (const label of needle) {
      const normalized = String(label || "");
      if (text.startsWith(normalized)) {
        found = text.replace(new RegExp(`^${normalized}`), "").trim();
        return;
      }
    }
  });
  return found;
}

function parseDetailSources($, detailUrl) {
  const sources = [];

  $(".mi_paly_box, .play_source, .playlist, .stui-content__playlist").each((_, box) => {
    const node = $(box);
    const sourceName = cleanText(
      node.find(".ypxingq_t,.option,.nav-tabs li.active,a.active,li.active,span.active,h3,h4").first().text()
    ) || `线路${sources.length + 1}`;
    const episodes = [];
    node.find(".paly_list_btn a[href], .playlist a[href], li a[href], a[href]").each((__, a) => {
      const href = $(a).attr("href") || "";
      const name = cleanText($(a).attr("title") || $(a).text());
      if (!href || !name) return;
      episodes.push({ name, playId: absUrl(href) });
    });
    if (episodes.length) sources.push({ name: sourceName, episodes });
  });

  if (!sources.length) {
    const episodes = [];
    $("a[href]").each((_, a) => {
      const href = $(a).attr("href") || "";
      const name = cleanText($(a).attr("title") || $(a).text());
      if (!/\/dsshiyipy\//.test(href)) return;
      if (!name) return;
      episodes.push({ name, playId: absUrl(href) });
    });
    if (episodes.length) {
      sources.push({ name: "在线播放", episodes: dedupeEpisodes(episodes) });
    }
  }

  if (!sources.length && detailUrl) {
    sources.push({
      name: "在线播放",
      episodes: [{ name: "立即播放", playId: String(detailUrl) }],
    });
  }

  return sources.map((source) => ({ ...source, episodes: dedupeEpisodes(source.episodes) }));
}

function shouldKeepEpisodeName(name) {
  const text = cleanText(name || "");
  if (!text) return false;
  if (text.includes("APP秒播")) return false;
  return true;
}

function dedupeEpisodes(episodes) {
  const out = [];
  const seen = new Set();
  for (const ep of Array.isArray(episodes) ? episodes : []) {
    const name = cleanText(ep?.name || "");
    const playId = String(ep?.playId || "").trim();
    const key = `${name}|${playId}`;
    if (!name || !playId || !shouldKeepEpisodeName(name) || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...ep, name, playId });
  }
  return out;
}

function parseDetail(html, detailUrl) {
  const $ = cheerio.load(html);
  const title = cleanText($("h1").first().text() || $("title").text().replace(/[-_].*$/, ""));
  const pic = absUrl($("div.dyimg img, .dyimg img, .thumb img, .poster img, img.thumb").first().attr("src") || $("img[data-original]").first().attr("data-original") || "");
  const remarks = parseMetaByLabel($, ["状态：", "备注：", "更新："]);
  const year = parseMetaByLabel($, ["年份：", "年代："]);
  const area = parseMetaByLabel($, ["地区："]);
  const typeName = parseMetaByLabel($, ["类型："]);
  const actor = parseMetaByLabel($, ["主演："]);
  const director = parseMetaByLabel($, ["导演："]);
  const lang = parseMetaByLabel($, ["语言："]);
  const douban = parseMetaByLabel($, ["豆瓣：", "评分："]);
  const content = cleanText($(".yp_context,.moviedteail_content,.content,.jianjie,.vod_content").first().html() || $("meta[name='description']").attr("content") || "");
  const vod_play_sources = parseDetailSources($, detailUrl);

  return {
    vod_id: String(detailUrl || ""),
    vod_name: title,
    vod_pic: pic,
    vod_remarks: remarks,
    vod_year: year,
    vod_area: area,
    type_name: typeName,
    vod_actor: actor,
    vod_director: director,
    vod_lang: lang,
    vod_douban_score: douban,
    vod_content: content,
    vod_play_sources,
  };
}

function resolvePlayUrl(rawUrl) {
  let playUrl = String(rawUrl || "").trim();
  if (!playUrl) return "";
  playUrl = playUrl.replace(/\\\//g, "/").replace(/\\/g, "");
  if (/^https?:\/\//i.test(playUrl)) return playUrl;
  if (playUrl.startsWith("//")) return `https:${playUrl}`;
  return absUrl(playUrl);
}

function extractJsonUrl(text) {
  const raw = String(text || "");
  const patterns = [
    /player_aaaa\s*=\s*([^;]+);/i,
    /MacPlayerConfig\.player_aaaa\s*=\s*([^;]+);/i,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (!match) continue;
    try {
      const data = JSON.parse(String(match[1]).replace(/'/g, '"'));
      const url = data?.url || data?.src || "";
      if (url) return url;
    } catch (_) {}
  }

  const directPatterns = [
    /["']url["']\s*[,:=]\s*["']([^"']+\.(?:m3u8|mp4)(?:[^"']*)?)["']/i,
    /["']src["']\s*[,:=]\s*["']([^"']+\.(?:m3u8|mp4)(?:[^"']*)?)["']/i,
    /sourceUrl\s*[=:]\s*["']?([^"'\s]+)["']?/i,
    /video\.src\s*=\s*["']?([^"'\s]+)["']?/i,
    /playUrl\s*[=:]\s*["']?([^"'\s]+)["']?/i,
  ];
  for (const pattern of directPatterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

async function resolvePlayPage(playPageUrl, referer) {
  const html = await requestText(playPageUrl, { referer });
  let playUrl = extractJsonUrl(html);
  if (playUrl) return resolvePlayUrl(playUrl);

  const apiMatch = html.match(/\$\.getJSON\(['"]([^'"]+)['"]/i);
  if (apiMatch?.[1]) {
    try {
      const apiUrl = absUrl(apiMatch[1]);
      const body = await requestText(apiUrl, { referer: playPageUrl });
      try {
        const json = JSON.parse(body);
        const nested = json?.url || json?.data?.url || json?.data?.src || "";
        if (nested) return resolvePlayUrl(nested);
      } catch (_) {}
    } catch (_) {}
  }

  const $ = cheerio.load(html);
  const iframeSrc = $("iframe").first().attr("src") || "";
  if (iframeSrc) {
    const iframeUrl = absUrl(iframeSrc);
    try {
      const iframeHtml = await requestText(iframeUrl, { referer: playPageUrl });
      playUrl = extractJsonUrl(iframeHtml);
      if (playUrl) return resolvePlayUrl(playUrl);
    } catch (_) {}
  }

  return "";
}

async function home() {
  try {
    const html = await getCachedText("dushe:home", HOME_CACHE_TTL, () => requestText(`${BASE_URL}/`));
    const list = parseHomeList(html).slice(0, 24);
    await OmniBox.log("info", `[毒舌影视][home] count=${list.length}`);
    return {
      class: CLASS_LIST,
      filters: FILTERS,
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[毒舌影视][home] failed: ${e.message || e}`);
    return {
      class: CLASS_LIST,
      filters: FILTERS,
      list: [],
    };
  }
}

async function category(params = {}) {
  try {
    const tid = String(params.type_id || params.categoryId || params.tid || "1");
    const page = Math.max(1, Number(params.page || params.pg || 1));
    const url = `${BASE_URL}/dsshiyisw/${encodeURIComponent(tid)}--------${page}---.html`;
    const html = await getCachedText(`dushe:category:${tid}:${page}`, CATEGORY_CACHE_TTL, () => requestText(url));
    const parsed = parseCategoryList(html);
    await OmniBox.log("info", `[毒舌影视][category] tid=${tid} page=${page} count=${parsed.list.length} pagecount=${parsed.pagecount}`);
    return {
      page,
      pagecount: parsed.pagecount || page,
      limit: parsed.list.length,
      total: parsed.list.length,
      filters: FILTERS[tid] || {},
      list: parsed.list,
    };
  } catch (e) {
    await OmniBox.log("error", `[毒舌影视][category] failed: ${e.message || e}`);
    return {
      page: Number(params.page || params.pg || 1) || 1,
      pagecount: 1,
      limit: 0,
      total: 0,
      filters: FILTERS[String(params.type_id || params.categoryId || params.tid || "1")] || {},
      list: [],
    };
  }
}

async function detail(params = {}) {
  try {
    const vodId = absUrl(params.vod_id || params.videoId || params.id || "");
    if (!vodId) {
      await OmniBox.log("warn", `[毒舌影视][detail] empty id params=${JSON.stringify(params || {})}`);
      return { list: [] };
    }
    const html = await getCachedText(`dushe:detail:${vodId}`, DETAIL_CACHE_TTL, () => requestText(vodId));
    const vod = parseDetail(html, vodId);
    await OmniBox.log("info", `[毒舌影视][detail] vod=${vod.vod_name || vodId} sources=${vod.vod_play_sources?.length || 0}`);
    return { list: [vod] };
  } catch (e) {
    await OmniBox.log("error", `[毒舌影视][detail] failed: ${e.message || e}`);
    return { list: [] };
  }
}

async function search(params = {}) {
  try {
    const wd = String(params.wd || params.keyword || "").trim();
    const page = Math.max(1, Number(params.page || 1));
    if (!wd) {
      return { page, pagecount: 1, limit: 0, total: 0, list: [] };
    }
    const url = `${BASE_URL}/dsshiyisc/${encodeURIComponent(wd)}----------${page}---.html`;
    const html = await getCachedText(`dushe:search:${wd}:${page}`, SEARCH_CACHE_TTL, () => requestText(url, { referer: `${BASE_URL}/` }));
    const parsed = parseCategoryList(html);
    await OmniBox.log("info", `[毒舌影视][search] wd=${wd} page=${page} count=${parsed.list.length}`);
    return {
      page,
      pagecount: parsed.pagecount || page,
      limit: parsed.list.length,
      total: parsed.list.length,
      list: parsed.list,
    };
  } catch (e) {
    await OmniBox.log("error", `[毒舌影视][search] failed: ${e.message || e}`);
    return {
      page: Number(params.page || 1) || 1,
      pagecount: 1,
      limit: 0,
      total: 0,
      list: [],
    };
  }
}

async function play(params = {}) {
  try {
    const playId = String(params.playId || params.id || "").trim();
    if (!playId) return { parse: 0, url: "", urls: [], header: {} };

    if (/\.(m3u8|mp4)(\?|#|$)/i.test(playId)) {
      const url = resolvePlayUrl(playId);
      return { parse: 0, url, urls: [{ name: "播放", url }], header: {} };
    }

    const cacheKey = `dushe:play:${playId}`;
    const resolved = await getCachedText(cacheKey, PLAY_CACHE_TTL, async () => {
      const absolutePlayId = absUrl(playId);
      if (/\/dsshiyipy\//.test(absolutePlayId)) {
        const url = await resolvePlayPage(absolutePlayId, `${BASE_URL}/`);
        return url || "";
      }
      if (/\/dsshiyidt\//.test(absolutePlayId)) {
        const detailHtml = await requestText(absolutePlayId);
        const vod = parseDetail(detailHtml, absolutePlayId);
        const first = vod?.vod_play_sources?.[0]?.episodes?.[0]?.playId || "";
        if (first && first !== absolutePlayId) {
          if (/\.(m3u8|mp4)(\?|#|$)/i.test(first)) return resolvePlayUrl(first);
          if (/\/dsshiyipy\//.test(first)) {
            const url = await resolvePlayPage(first, absolutePlayId);
            return url || first;
          }
          return first;
        }
      }
      return "";
    });

    if (resolved) {
      const url = resolvePlayUrl(resolved);
      await OmniBox.log("info", `[毒舌影视][play] parse=0 url=${url}`);
      return { parse: 0, url, urls: [{ name: "播放", url }], header: {} };
    }

    const fallback = absUrl(playId);
    await OmniBox.log("warn", `[毒舌影视][play] fallback parse=1 url=${fallback}`);
    return { parse: 1, url: fallback, urls: [{ name: "播放", url: fallback }], header: {} };
  } catch (e) {
    await OmniBox.log("error", `[毒舌影视][play] failed: ${e.message || e}`);
    return { parse: 0, url: "", urls: [], header: {} };
  }
}

});

_load(8, "热播", function (module, exports, require) {
// @name 热播
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: axios, crypto-js
// @version 1.0.3
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/热播.js

/**
 * OmniBox 爬虫脚本 - 热播（APP 接口）
 *
 * 说明：
 * 1. 本脚本基于 `本地调试/热播.js` 逻辑转换为 OmniBox 标准 JS 模板结构。
 * 2. 接口包含：`home` / `category` / `search` / `detail` / `play`。
 * 3. 详情接口将旧式播放数据转换为 `vod_play_sources`，供播放器直接识别。
 * 4. `playId` 使用 Base64(JSON) 透传，播放阶段再解码并按原逻辑解析。
 *
 * 环境变量：
 * - `REBANG_HOST`：站点 Host，默认 `http://v.rbotv.cn`
 *
 * 兼容说明：
 * - 保留了原脚本签名算法（`sign + timestamp`）与 multipart/form-data 请求体构造。
 * - 保留了原脚本的解析回退逻辑：解析接口失败时返回 `parse=1`。
 */

const axios = require("axios");
const http = require("http");
const https = require("https");
const CryptoJS = require("crypto-js");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const HOST = process.env.REBANG_HOST || "http://v.rbotv.cn";
const DANMU_API = process.env.DANMU_API || "";
const UA = "okhttp-okgo/jeasonlzy";
const FORM_BOUNDARY = "18a7affc-a82a-4dc2-a848-7b0658d7665c";

const DEFAULT_HEADERS = {
  "User-Agent": UA,
  "Accept-Language": "zh-CN,zh;q=0.8",
  Referer: HOST,
};

const PLAY_HEADERS = {
  "User-Agent": UA,
  Referer: HOST,
};

const axiosInstance = axios.create({
  timeout: 20 * 1000,
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  httpAgent: new http.Agent({ keepAlive: true }),
  headers: DEFAULT_HEADERS,
  responseType: "json",
});

// ==================== 日志工具 ====================
function logInfo(message, data = null) {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[热播] ${output}`);
}

function logError(message, error) {
  OmniBox.log("error", `[热播] ${message}: ${error?.message || error}`);
}

// ==================== 编解码与签名工具 ====================
/**
 * UTF8 -> Base64
 * @param {string} text 文本
 * @returns {string}
 */
function e64(text) {
  try {
    return CryptoJS.enc.Utf8.parse(String(text || "")).toString(CryptoJS.enc.Base64);
  } catch {
    return "";
  }
}

/**
 * Base64 -> UTF8
 * @param {string} encodedText Base64 文本
 * @returns {string}
 */
function d64(encodedText) {
  try {
    return CryptoJS.enc.Base64.parse(String(encodedText || "")).toString(CryptoJS.enc.Utf8);
  } catch {
    return "";
  }
}

/**
 * 生成 POST 请求体（multipart/form-data），沿用原站签名算法。
 * @param {Object} params 业务参数
 * @returns {{ body: string, headers: Object }}
 */
function buildSignedMultipartBody(params = {}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signStr = `7gp0bnd2sr85ydii2j32pcypscoc4w6c7g5spl${timestamp}`;
  const sign = CryptoJS.MD5(signStr).toString();

  let body = "";
  for (const [key, value] of Object.entries(params)) {
    body += `--${FORM_BOUNDARY}\r\n`;
    body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
    body += `${value}\r\n`;
  }

  body += `--${FORM_BOUNDARY}\r\n`;
  body += `Content-Disposition: form-data; name="sign"\r\n\r\n`;
  body += `${sign}\r\n`;
  body += `--${FORM_BOUNDARY}\r\n`;
  body += `Content-Disposition: form-data; name="timestamp"\r\n\r\n`;
  body += `${timestamp}\r\n`;
  body += `--${FORM_BOUNDARY}--\r\n`;

  return {
    body,
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": `multipart/form-data; boundary=${FORM_BOUNDARY}`,
    },
  };
}

/**
 * 请求热播接口
 * @param {string} url 接口地址
 * @param {string} method 请求方法
 * @param {Object} params 参数
 * @returns {Promise<Object|null>}
 */
async function requestApi(url, method = "GET", params = {}) {
  try {
    const options = {
      method,
      headers: { ...DEFAULT_HEADERS },
    };

    if (method.toUpperCase() === "POST") {
      const multipart = buildSignedMultipartBody(params);
      options.data = multipart.body;
      options.headers = { ...multipart.headers };
    }

    const response = await axiosInstance(url, options);
    return response.data;
  } catch (error) {
    logError(`请求失败: ${url}`, error);
    return null;
  }
}

// ==================== 数据转换工具 ====================
/**
 * 将接口列表数据转成 OmniBox 标准视频列表结构。
 * @param {Array} videos 原始数组
 * @returns {Array}
 */
function formatVideoList(videos) {
  return (videos || []).map((vod) => ({
    vod_id: String(vod.vod_id || ""),
    vod_name: vod.vod_name || "",
    vod_pic: vod.vod_pic || vod.vod_pic_thumb || "",
    vod_remarks: vod.vod_remarks || "",
    vod_year: vod.tag || "",
  }));
}

// ==================== 弹幕工具 ====================
function preprocessTitle(title) {
  if (!title) return "";
  return title
    .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]/g, " ")
    .replace(/[hH]\.?26[45]/g, " ")
    .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
    .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ");
}

function chineseToArabic(cn) {
  const map = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (!isNaN(cn)) return parseInt(cn, 10);
  if (cn.length === 1) return map[cn] || cn;
  if (cn.length === 2) {
    if (cn[0] === "十") return 10 + map[cn[1]];
    if (cn[1] === "十") return map[cn[0]] * 10;
  }
  if (cn.length === 3) return map[cn[0]] * 10 + map[cn[2]];
  return cn;
}

function extractEpisode(title) {
  if (!title) return "";
  const processedTitle = preprocessTitle(title).trim();

  const cnMatch = processedTitle.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
  if (cnMatch) return String(chineseToArabic(cnMatch[1]));

  const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
  if (seMatch) return seMatch[1];

  const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
  if (epMatch) return epMatch[1];

  const bracketMatch = processedTitle.match(/[\[\(【(](\d{1,3})[\]\)】)]/);
  if (bracketMatch) {
    const num = bracketMatch[1];
    if (!["720", "1080", "480"].includes(num)) return num;
  }

  return "";
}

function buildFileNameForDanmu(vodName, episodeTitle) {
  if (!vodName) return "";
  if (!episodeTitle || episodeTitle === "正片" || episodeTitle === "播放") return vodName;

  const digits = extractEpisode(episodeTitle);
  if (digits) {
    const epNum = parseInt(digits, 10);
    if (epNum > 0) {
      if (epNum < 10) return `${vodName} S01E0${epNum}`;
      return `${vodName} S01E${epNum}`;
    }
  }
  return vodName;
}

function buildScrapedEpisodeName(scrapeData, mapping, originalName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalName;
  }

  if (mapping.episodeName) {
    const epName = mapping.episodeNumber + "." + mapping.episodeName;
    return epName;
  }

  if (scrapeData && Array.isArray(scrapeData.episodes)) {
    const hit = scrapeData.episodes.find(
      (ep) => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber
    );
    if (hit?.name) {
      return `${hit.episodeNumber}.${hit.name}`;
    }
  }

  return originalName;
}

function buildScrapedDanmuFileName(scrapeData, scrapeType, mapping, fallbackVodName, fallbackEpisodeName) {
  if (!scrapeData) {
    return buildFileNameForDanmu(fallbackVodName, fallbackEpisodeName);
  }

  if (scrapeType === "movie") {
    return scrapeData.title || fallbackVodName;
  }

  const title = scrapeData.title || fallbackVodName;
  const seasonAirYear = scrapeData.seasonAirYear || "";
  const seasonNumber = mapping?.seasonNumber || 1;
  const episodeNumber = mapping?.episodeNumber || 1;
  return `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
}

async function matchDanmu(fileName) {
  if (!DANMU_API || !fileName) return [];

  try {
    const matchUrl = `${DANMU_API}/api/v2/match`;
    const response = await OmniBox.request(matchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({ fileName }),
    });

    if (response.statusCode !== 200) {
      logInfo(`弹幕匹配失败: HTTP ${response.statusCode}`);
      return [];
    }

    const matchData = JSON.parse(response.body);
    if (!matchData.isMatched) return [];

    const matches = matchData.matches || [];
    if (matches.length === 0) return [];

    const firstMatch = matches[0];
    const episodeId = firstMatch.episodeId;
    const animeTitle = firstMatch.animeTitle || "";
    const episodeTitle = firstMatch.episodeTitle || "";
    if (!episodeId) return [];

    let danmakuName = "弹幕";
    if (animeTitle && episodeTitle) {
      danmakuName = `${animeTitle} - ${episodeTitle}`;
    } else if (animeTitle) {
      danmakuName = animeTitle;
    } else if (episodeTitle) {
      danmakuName = episodeTitle;
    }

    return [{
      name: danmakuName,
      url: `${DANMU_API}/api/v2/comment/${episodeId}?format=xml`,
    }];
  } catch (error) {
    logInfo(`弹幕匹配失败: ${error.message}`);
    return [];
  }
}

/**
 * 嗅探播放页，兜底提取真实视频地址
 */
async function sniffRebangPlay(playUrl) {
  if (!playUrl) return null;
  try {
    logInfo("尝试嗅探播放页", playUrl);
    const sniffed = await OmniBox.sniffVideo(playUrl);
    if (sniffed && sniffed.url) {
      logInfo("嗅探成功", sniffed.url);
      return {
        urls: [{ name: "嗅探线路", url: sniffed.url }],
        parse: 0,
        header: sniffed.header || { ...PLAY_HEADERS, Referer: playUrl },
      };
    }
  } catch (error) {
    logInfo(`嗅探失败: ${error.message}`);
  }
  return null;
}

/**
 * 将旧数据中的 `vod_play_list` 转换为 `vod_play_sources`。
 *
 * 每个剧集 `playId` 存储为 Base64(JSON)：
 * {
 *   url: 实际播放地址,
 *   p: 解析接口列表,
 *   r: Referer,
 *   u: User-Agent
 * }
 *
 * @param {Array} vodPlayList 原始播放列表
 * @returns {Array}
 */
function convertVodPlayListToSources(vodPlayList, vodName = "", videoId = "") {
  const playSources = [];

  (vodPlayList || []).forEach((line, index) => {
    const episodes = [];

    (line.urls || []).forEach((item, epIndex) => {
      const fid = `${videoId}#${index}#${epIndex}`;
      const playData = {
        url: item.url,
        p: line.parse_urls,
        r: line.referer,
        u: line.ua,
        v: vodName,
        e: item.name || `第${episodes.length + 1}集`,
        sid: videoId,
        fid,
      };

      episodes.push({
        name: item.name || `第${episodes.length + 1}集`,
        playId: e64(JSON.stringify(playData)),
        _fid: fid,
        _rawName: item.name || `第${episodes.length + 1}集`,
      });
    });

    if (episodes.length > 0) {
      playSources.push({
        name: `线路${index + 1}${line.flag ? `(${line.flag})` : ""}`,
        episodes,
      });
    }
  });

  return playSources;
}

/**
 * 解析筛选配置（来自 `top_type`）
 * @param {Array} typeList 类型列表
 * @returns {{ classes: Array, filters: Object }}
 */
function buildClassesAndFilters(typeList) {
  const classes = [];
  const filters = {};

  (typeList || []).forEach((item) => {
    const typeId = String(item.type_id || "");
    if (!typeId) return;

    classes.push({
      type_id: typeId,
      type_name: item.type_name || typeId,
    });

    const fts = [];

    if (Array.isArray(item.extend) && item.extend.length > 0) {
      const value = item.extend
        .filter((v) => v && v !== "全部")
        .map((v) => ({ name: v, value: v }));
      if (value.length > 0) {
        fts.push({ key: "class", name: "类型", init: "", value: [{ name: "全部", value: "" }, ...value] });
      }
    }

    if (Array.isArray(item.area) && item.area.length > 0) {
      const value = item.area
        .filter((v) => v && v !== "全部")
        .map((v) => ({ name: v, value: v }));
      if (value.length > 0) {
        fts.push({ key: "area", name: "地区", init: "", value: [{ name: "全部", value: "" }, ...value] });
      }
    }

    if (Array.isArray(item.lang) && item.lang.length > 0) {
      const value = item.lang
        .filter((v) => v && v !== "全部")
        .map((v) => ({ name: v, value: v }));
      if (value.length > 0) {
        fts.push({ key: "lang", name: "语言", init: "", value: [{ name: "全部", value: "" }, ...value] });
      }
    }

    if (Array.isArray(item.year) && item.year.length > 0) {
      const value = item.year
        .filter((v) => v && v !== "全部")
        .map((v) => ({ name: v, value: v }));
      if (value.length > 0) {
        fts.push({ key: "year", name: "年份", init: "", value: [{ name: "全部", value: "" }, ...value] });
      }
    }

    fts.push({
      key: "by",
      name: "排序",
      init: "time",
      value: [
        { name: "按时间", value: "time" },
        { name: "按人气", value: "hits" },
        { name: "按评分", value: "score" },
      ],
    });

    if (fts.length > 0) {
      filters[typeId] = fts;
    }
  });

  return { classes, filters };
}

// ==================== OmniBox 标准接口实现 ====================
/**
 * 获取首页数据
 * @param {Object} params 参数对象
 * @returns {Promise<{class:Array,filters:Object,list:Array}>}
 */
async function home(params) {
  try {
    logInfo("获取首页数据");

    const [typeData, homeVodData] = await Promise.all([
      requestApi(`${HOST}/v3/type/top_type`, "POST", { "": "" }),
      requestApi(`${HOST}/v3/type/tj_vod`, "POST", { "": "" }),
    ]);

    const { classes, filters } = buildClassesAndFilters(typeData?.data?.list || []);
    const allVideos = [...(homeVodData?.data?.cai || []), ...(homeVodData?.data?.loop || [])];
    const list = formatVideoList(allVideos.filter((i) => i.vod_id && String(i.vod_id) !== "0"));

    return { class: classes, filters, list };
  } catch (error) {
    logError("获取首页数据失败", error);
    return { class: [], filters: {}, list: [] };
  }
}

/**
 * 获取分类数据
 * @param {Object} params 参数对象
 * @returns {Promise<{list:Array,page:number,pagecount:number,limit:number,total:number}>}
 */
async function category(params) {
  try {
    const categoryId = params.categoryId;
    const page = parseInt(params.page, 10) || 1;
    const ext = params.filters || {};

    if (!categoryId) {
      return { list: [], page: 1, pagecount: 0, limit: 0, total: 0 };
    }

    const requestParams = {
      type_id: categoryId,
      limit: "12",
      page,
    };

    for (const [k, v] of Object.entries(ext)) {
      const key = k === "extend" ? "class" : k;
      requestParams[key] = v;
    }

    const data = await requestApi(`${HOST}/v3/home/type_search`, "POST", requestParams);
    const list = formatVideoList((data?.data?.list || []).filter((i) => i.vod_id && String(i.vod_id) !== "0"));

    return {
      list,
      page,
      pagecount: 9999,
      limit: 90,
      total: 999999,
    };
  } catch (error) {
    logError("获取分类数据失败", error);
    return { list: [], page: 1, pagecount: 0, limit: 0, total: 0 };
  }
}

/**
 * 获取视频详情
 * @param {Object} params 参数对象
 * @returns {Promise<{list:Array}>}
 */
async function detail(params) {
  try {
    const ids = Array.isArray(params.videoId) ? params.videoId : [params.videoId];
    const result = [];

    for (const vodId of ids) {
      if (!vodId) continue;

      const videoIdForScrape = String(vodId || "");
      const data = await requestApi(`${HOST}/v3/home/vod_details`, "POST", { vod_id: vodId });
      const v = data?.data;
      if (!v) continue;

      const playSources = convertVodPlayListToSources(v.vod_play_list || [], v.vod_name || "", videoIdForScrape);

      let scrapeData = null;
      let videoMappings = [];
      let scrapeType = "";

      const scrapeCandidates = [];
      for (const source of playSources) {
        for (const ep of source.episodes || []) {
          if (!ep._fid) continue;
          scrapeCandidates.push({
            fid: ep._fid,
            file_id: ep._fid,
            file_name: ep._rawName || ep.name || "正片",
            name: ep._rawName || ep.name || "正片",
            format_type: "video",
          });
        }
      }

      if (scrapeCandidates.length > 0) {
        try {
          const scrapingResult = await OmniBox.processScraping(videoIdForScrape, v.vod_name || "", v.vod_name || "", scrapeCandidates);
          OmniBox.log("info", `[热播] 刮削处理完成,结果: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);

          const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
          scrapeData = metadata?.scrapeData || null;
          videoMappings = metadata?.videoMappings || [];
          scrapeType = metadata?.scrapeType || "";
          logInfo("刮削元数据读取完成", { mappingCount: videoMappings.length, hasScrapeData: !!scrapeData, scrapeType });
        } catch (error) {
          logError("刮削处理失败", error);
        }
      }

      if (videoMappings.length > 0) {
        for (const source of playSources) {
          for (const ep of source.episodes || []) {
            const mapping = videoMappings.find((m) => m?.fileId === ep._fid);
            if (!mapping) continue;
            const oldName = ep.name;
            const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
            if (newName && newName !== oldName) {
              ep.name = newName;
              OmniBox.log("info", `[热播] 应用刮削后源文件名: ${oldName} -> ${newName}`);
            }
            ep._seasonNumber = mapping.seasonNumber;
            ep._episodeNumber = mapping.episodeNumber;
          }

          const hasEpisodeNumber = (source.episodes || []).some(
            (ep) => ep._episodeNumber !== undefined && ep._episodeNumber !== null
          );
          if (hasEpisodeNumber) {
            source.episodes.sort((a, b) => {
              const seasonA = a._seasonNumber || 0;
              const seasonB = b._seasonNumber || 0;
              if (seasonA !== seasonB) return seasonA - seasonB;
              const episodeA = a._episodeNumber || 0;
              const episodeB = b._episodeNumber || 0;
              return episodeA - episodeB;
            });
          }
        }
      }

      const normalizedPlaySources = playSources.map((source) => ({
        name: source.name,
        episodes: (source.episodes || []).map((ep) => ({
          name: ep.name,
          playId: ep.playId,
        })),
      }));

      const vod = {
        vod_id: videoIdForScrape,
        vod_name: scrapeData?.title || v.vod_name || "",
        vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : (v.vod_pic || ""),
        type_name: v.type_name || "",
        vod_year: scrapeData?.releaseDate ? String(scrapeData.releaseDate).substring(0, 4) : (v.vod_year || ""),
        vod_area: v.vod_area || "",
        vod_remarks: v.vod_remarks || "",
        vod_actor: (scrapeData?.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(",") || v.vod_actor || "",
        vod_director:
          (scrapeData?.credits?.crew || [])
            .filter((c) => c?.job === "Director" || c?.department === "Directing")
            .slice(0, 3)
            .map((c) => c?.name)
            .filter(Boolean)
            .join(",") ||
          v.vod_director ||
          "",
        vod_content: scrapeData?.overview || v.vod_content || "无",
        vod_play_sources: normalizedPlaySources,
      };

      result.push(vod);
    }

    return { list: result };
  } catch (error) {
    logError("获取详情失败", error);
    return { list: [] };
  }
}

/**
 * 搜索视频
 * @param {Object} params 参数对象
 * @returns {Promise<{list:Array,page:number,pagecount:number,limit:number,total:number}>}
 */
async function search(params) {
  try {
    const keyword = params.keyword || params.wd || "";
    const page = parseInt(params.page, 10) || 1;

    if (!keyword) {
      return { list: [], page: 1, pagecount: 0, limit: 0, total: 0 };
    }

    const data = await requestApi(`${HOST}/v3/home/search`, "POST", {
      limit: "12",
      page,
      keyword,
    });

    const list = formatVideoList((data?.data?.list || []).filter((i) => i.vod_id && String(i.vod_id) !== "0"));

    return {
      list,
      page,
      pagecount: 9999,
      limit: list.length,
      total: 999999,
    };
  } catch (error) {
    logError("搜索失败", error);
    return { list: [], page: 1, pagecount: 0, limit: 0, total: 0 };
  }
}

/**
 * 解析播放地址
 * @param {Object} params 参数对象
 * @returns {Promise<{urls:Array,parse:number,header:Object}>}
 */
async function play(params) {
  const playId = params.playId || "";
  if (!playId) {
    return { urls: [], parse: 1, header: {} };
  }

  try {
    const decoded = d64(playId);
    const ids = JSON.parse(decoded);
    const headers = {};
    let vodName = ids.v || "";
    let episodeName = ids.e || "";
    let scrapedDanmuFileName = "";

    try {
      const videoIdFromParam = params.vodId ? String(params.vodId) : "";
      const videoIdFromMeta = ids.sid ? String(ids.sid) : "";
      const videoIdForScrape = videoIdFromParam || videoIdFromMeta;

      if (videoIdForScrape) {
        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
        if (metadata && metadata.scrapeData) {
          const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === ids.fid);
          scrapedDanmuFileName = buildScrapedDanmuFileName(
            metadata.scrapeData,
            metadata.scrapeType || "",
            mapping,
            vodName,
            episodeName
          );
          if (metadata.scrapeData.title) {
            vodName = metadata.scrapeData.title;
          }
          if (mapping?.episodeName) {
            episodeName = mapping.episodeName;
          }
        }
      }
    } catch (error) {
      logInfo(`读取刮削元数据失败: ${error.message}`);
    }

    let playResponse;

    if (ids.r) headers.Referer = ids.r;
    if (ids.u) headers["User-Agent"] = ids.u;

    if (Array.isArray(ids.p) && ids.p.length > 0) {
      const parseUrl = ids.p[0] + encodeURIComponent(ids.url);

      try {
        const response = await axiosInstance({
          url: parseUrl,
          method: "GET",
          headers,
          responseType: "text",
        });

        if (!response?.data) {
          throw new Error("解析请求无响应内容");
        }

        const parseData = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
        const parsedUrl = parseData.url || parseData?.data?.url;

        if (!parsedUrl) {
          throw new Error("解析接口未返回播放地址");
        }

        if (parseData.UA) {
          headers["User-Agent"] = parseData.UA;
        }

        playResponse = {
          urls: [{ name: "播放", url: parsedUrl }],
          parse: 0,
          header: headers,
        };
      } catch (parseError) {
        logError("解析接口调用失败，尝试嗅探", parseError);
        const sniffResult = await sniffRebangPlay(ids.url || parseUrl);
        if (sniffResult) {
          playResponse = sniffResult;
        } else {
          playResponse = {
            urls: [{ name: "解析", url: parseUrl }],
            parse: 1,
            header: headers,
          };
        }
      }
    } else {
      if (ids.url && ids.url.startsWith("http")) {
        playResponse = {
          urls: [{ name: "直连", url: ids.url }],
          parse: 0,
          header: headers,
        };
      } else {
        const sniffResult = await sniffRebangPlay(ids.url);
        playResponse =
          sniffResult ||
          {
            urls: [{ name: "直连", url: ids.url }],
            parse: 0,
            header: headers,
          };
      }
    }

    if (DANMU_API && vodName) {
      const fileName = scrapedDanmuFileName || buildFileNameForDanmu(vodName, episodeName);
      if (fileName) {
        const danmakuList = await matchDanmu(fileName);
        if (danmakuList.length > 0) {
          playResponse.danmaku = danmakuList;
        }
      }
    }

    return playResponse;
  } catch (error) {
    logError("播放解析失败", error);
    const fallbackSniff = await sniffRebangPlay(playId);
    if (fallbackSniff) {
      return fallbackSniff;
    }
    return {
      urls: [{ name: "回退", url: playId }],
      parse: 1,
      header: {},
    };
  }
}

// ==================== 模块导出 ====================
module.exports = {
  home,
  category,
  search,
  detail,
  play,
};

// 使用公共 runner 处理标准输入/输出
const runner = require("spider_runner");
runner.run(module.exports);


});

_load(9, "荐片", function (module, exports, require) {
// @name 荐片APP
// @author 
// @description 刮削：支持，弹幕：支持，播放记录：支持，嗅探：支持
// @version 1.1.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/荐片.js
/**
 * ============================================================================
 * 荐片APP - OmniBox 爬虫脚本
 * ============================================================================
 *
 * 功能说明:
 * - 提供荐片视频APP源的 OmniBox 格式接口
 * - 支持分类浏览、搜索、详情、播放等功能
 * - 集成 Netflix 分类(放在分类列表最后)
 * - 自动屏蔽 FTP/边下边播线路,保留其他线路
 * - 搜索过滤功能,精准匹配搜索结果
 *
 * 主要特性:
 * 1. 分类支持:电影、电视剧、动漫、综艺、短剧、纪录片、Netflix
 * 2. 筛选功能:支持类型、地区、年份、排序等筛选条件
 * 3. 线路过滤:自动过滤包含"FTP"、"边下边播"、"VIP"关键字的线路
 * 4. 图片域名:自动处理图片 URL,支持多域名
 * 5. 搜索过滤:精准匹配结果,删除多余无关条目
 *
 * 日期:2025.02.27
 * ============================================================================
 */

const OmniBox = require("omnibox_sdk");

/**
 * 配置信息
 */
const jpConfig = {
  // 主 API 域名
  host: "https://h5.jianpianips1.com",
  // 图片域名
  imgHost: "https://img.ztfgh.com",
  // 请求头
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Origin': 'https://h5.jianpianips1.com',
    'Referer': 'https://h5.jianpianips1.com/'
  },
  // 超时时间(毫秒)
  timeout: 10000
};

// 播放请求头
const PLAY_HEADERS = {
  'User-Agent': jpConfig.headers['User-Agent'],
  'Referer': jpConfig.host,
  'Origin': jpConfig.host
};

// 弹幕API配置(目前仅预留)
const DANMU_API = process.env.DANMU_API || "";

/**
 * 分类映射表
 */
const categoryMap = {
  '1': '电影',
  '2': '电视剧',
  '3': '动漫',
  '4': '综艺',
  '67': '短剧',
  '50': '纪录片',
  'netflix': 'Netflix'
};

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
  if (data) {
    OmniBox.log("info", `[荐片APP] ${message}: ${JSON.stringify(data)}`);
  } else {
    OmniBox.log("info", `[荐片APP] ${message}`);
  }
};

const logError = (message, error) => {
  OmniBox.log("error", `[荐片APP] ${message}: ${error.message || error}`);
};

const logWarn = (message) => {
  OmniBox.log("warn", `[荐片APP] ${message}`);
};

/**
 * 元数据编解码，用于透传刮削/弹幕信息
 */
const encodeMeta = (obj) => {
  try {
    return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64");
  } catch {
    return "";
  }
};

const decodeMeta = (str) => {
  try {
    const raw = Buffer.from(str || "", "base64").toString("utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
};

/**
 * 预处理标题,去掉常见干扰项
 */
function preprocessTitle(title) {
  if (!title) return "";
  return title
    .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]/g, " ")
    .replace(/[hH]\.?26[45]/g, " ")
    .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
    .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ");
}

/**
 * 将中文数字转换为阿拉伯数字
 */
function chineseToArabic(cn) {
  const map = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
  if (!isNaN(cn)) return parseInt(cn);
  if (cn.length === 1) return map[cn] || cn;
  if (cn.length === 2) {
    if (cn[0] === '十') return 10 + map[cn[1]];
    if (cn[1] === '十') return map[cn[0]] * 10;
  }
  if (cn.length === 3) return map[cn[0]] * 10 + map[cn[2]];
  return cn;
}

/**
 * 从标题中提取集数数字
 */
function extractEpisode(title) {
  if (!title) return "";

  const processedTitle = preprocessTitle(title).trim();

  // 1. 中文格式:第XX集/话
  const cnMatch = processedTitle.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
  if (cnMatch) return String(chineseToArabic(cnMatch[1]));

  // 2. S01E03 格式
  const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
  if (seMatch) return seMatch[1];

  // 3. EP/E 格式
  const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
  if (epMatch) return epMatch[1];

  // 4. 括号格式 [03]
  const bracketMatch = processedTitle.match(/[\[\(【(](\d{1,3})[\]\)】)]/);
  if (bracketMatch) {
    const num = bracketMatch[1];
    if (!["720", "1080", "480"].includes(num)) return num;
  }

  return "";
}

/**
 * 构建用于弹幕匹配的文件名(后续扩展)
 */
function buildFileNameForDanmu(vodName, episodeTitle) {
  if (!vodName) return "";

  if (!episodeTitle || episodeTitle === '正片' || episodeTitle === '播放') {
    return vodName;
  }

  const digits = extractEpisode(episodeTitle);
  if (digits) {
    const epNum = parseInt(digits, 10);
    if (epNum > 0) {
      if (epNum < 10) {
        return `${vodName} S01E0${epNum}`;
      } else {
        return `${vodName} S01E${epNum}`;
      }
    }
  }

  return vodName;
}

function buildScrapedEpisodeName(scrapeData, mapping, originalName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalName;
  }
  const prefix = mapping.episodeNumber ? `第${mapping.episodeNumber}集 ` : "";
  if (mapping.episodeName) {
    const epName = `${prefix}${mapping.episodeName}`.trim();
    return epName;
  }
  if (scrapeData && Array.isArray(scrapeData.episodes)) {
    const hit = scrapeData.episodes.find(
      (ep) => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber
    );
    if (hit?.name) {
      return `${prefix}${hit.name}`.trim();
    }
  }
  return originalName;
}

function buildHistoryEpisode(playId, episodeNumber, episodeName) {
  if (episodeNumber !== undefined && episodeNumber !== null && episodeNumber !== "") {
    return `${playId || ""}@@${episodeNumber}`;
  }
  if (episodeName) {
    return `${playId || ""}@@${episodeName}`;
  }
  return playId || "";
}

/**
 * 发送HTTP请求
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 响应数据
 */
async function request(url, options = {}) {
  try {
    const response = await OmniBox.request(url, {
      method: options.method || "GET",
      headers: options.headers || jpConfig.headers,
      timeout: options.timeout || jpConfig.timeout,
      body: options.body
    });

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
    }

    return JSON.parse(response.body);
  } catch (error) {
    logError(`请求失败: ${url}`, error);
    throw error;
  }
}

/**
 * 获取完整图片 URL
 * @param {string} path - 图片路径
 * @returns {string} 完整图片 URL
 */
const getPicUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  return `${jpConfig.imgHost}${normalizedPath}`;
};

/**
 * 格式化视频列表数据
 * @param {Array} data - 原始数据
 * @returns {Array} 格式化后的列表
 */
const formatList = (data) => {
  if (!Array.isArray(data)) {
    logWarn('formatList 接收到的数据不是数组: ' + typeof data);
    return [];
  }

  return data.filter(i => i.id && String(i.id) !== '0').map(i => {
    const picPath = i.path || i.tvimg || i.tagimg || '';
    return {
      vod_id: String(i.id),
      vod_name: i.title || '未知标题',
      vod_pic: getPicUrl(picPath),
      vod_remarks: i.mask || (i.score ? `评分:${i.score}` : '')
    };
  });
};

/* ============================================================================
 * Netflix 相关功能
 * ============================================================================ */

/**
 * Netflix API 地址映射表
 */
const netflixApiMap = {
  hot_movie: 'https://api.zxfmj.com/api/dyTag/tpl1_data?id=70&page=',
  hot_tv: 'https://api.zxfmj.com/api/dyTag/tpl1_data?id=73&page=',
  hot_love: 'https://api.zxfmj.com/api/dyTag/tpl2_data?id=74&page=',
  hot_thriller: 'https://api.zxfmj.com/api/dyTag/tpl2_data?id=76&page=',
  hot_action: 'https://api.zxfmj.com/api/dyTag/tpl1_data?id=71&page=',
  top_movie: 'https://api.zxfmj.com/api/dyTag/tpl1_data?id=72&page=',
  classic_movie: 'https://api.zxfmj.com/api/special/detail?id=134',
  classic_tv: 'https://api.zxfmj.com/api/special/detail?id=131'
};

/**
 * 获取 Netflix 分类列表
 * @param {string} subType - 子分类类型
 * @param {number} page - 页码
 * @returns {Object} 列表数据
 */
const getNetflixList = async (subType, page = 1) => {
  try {
    logInfo('获取Netflix列表', { subType, page });

    const url = netflixApiMap[subType];
    if (!url) {
      logWarn(`未知的Netflix子类型: ${subType}`);
      return { list: [], page, pagecount: 1, total: 0 };
    }

    let fullUrl = url + page;
    // 经典分类不需要分页参数
    if (subType.startsWith('classic')) fullUrl = url;

    const res = await request(fullUrl);

    let data = res.data || [];
    if (!Array.isArray(data) && data.list) data = data.list;

    const list = data.map(item => ({
      vod_id: (item.id || item._id?.$oid)?.toString() + '@netflix',
      vod_name: item.title,
      vod_pic: getPicUrl(item.tvimg || item.path),
      vod_remarks: (item.mask || '') + (item.score ? ` ⭐${item.score}` : '')
    }));

    logInfo('Netflix列表获取成功', { count: list.length });

    return {
      list,
      page: parseInt(page),
      pagecount: list.length ? parseInt(page) + 1 : parseInt(page),
      limit: list.length,
      total: list.length ? 9999 : 0
    };
  } catch (e) {
    logError('Netflix列表获取失败', e);
    return { list: [], page: parseInt(page), pagecount: 1, limit: 0, total: 0 };
  }
};

/* ============================================================================
 * 首页和分类功能
 * ============================================================================ */

/**
 * 获取首页内容和分类
 * @returns {Object} 分类和筛选数据
 */
const getHomeContent = async () => {
  try {
    logInfo('========== 开始获取首页分类 ==========');

    const res = await request(`${jpConfig.host}/api/v2/settings/homeCategory`);

    if (res.code !== 1) {
      throw new Error(res.msg || '获取分类失败');
    }

    OmniBox.log('info', `[荐片APP] 分类数据: ${JSON.stringify({
      code: res.code,
      dataLength: res.data?.length
    })}`);

    const classes = [];
    const filters = {};

    // 先添加普通分类
    for (const item of res.data) {
      if (item.id === 88 || item.id === 99) continue;

      const tid = String(item.id);
      const tName = categoryMap[tid] || item.name;

      classes.push({ type_id: tid, type_name: tName });

      // 获取该分类的筛选选项
      try {
        OmniBox.log('info', `\n[荐片APP] ===== 获取分类[${tName}(${tid})]筛选选项 =====`);

        const filterUrl = `${jpConfig.host}/api/crumb/filterOptions?fcate_pid=${tid}`;
        OmniBox.log('info', `[荐片APP] 请求URL: ${filterUrl}`);

        const filterRes = await request(filterUrl);

        OmniBox.log('info', `[荐片APP] 响应code: ${filterRes.code}, hasData: ${!!filterRes.data}`);

        if (filterRes.code === 1 && filterRes.data && Array.isArray(filterRes.data)) {
          OmniBox.log('info', `[荐片APP] 筛选数据keys: ${JSON.stringify(filterRes.data.map(f => f.key))}`);

          const fts = [];
          const filterData = filterRes.data;

          // 类型筛选
          const typeFilter = filterData.find(f => f.key === 'type');
          if (typeFilter && typeFilter.data && Array.isArray(typeFilter.data)) {
            const options = typeFilter.data
              .map(t => ({ name: t.name, value: String(t.id) }))  // 改为 name/value
              .filter(t => t.name !== '全部');
            options.unshift({ name: '全部', value: '' });
            fts.push({
              name: '类型',
              key: 'type',
              init: '',  // 添加默认值
              value: options
            });
          }

          // 地区筛选
          const areaFilter = filterData.find(f => f.key === 'area');
          if (areaFilter && areaFilter.data && Array.isArray(areaFilter.data)) {
            const options = areaFilter.data
              .map(a => ({ name: a.name, value: String(a.id) }))  // 改为 name/value
              .filter(a => a.name !== '全部');
            options.unshift({ name: '全部', value: '' });
            fts.push({
              name: '地区',
              key: 'area',
              init: '',  // 添加默认值
              value: options
            });
          }

          // 年份筛选
          const yearFilter = filterData.find(f => f.key === 'year');
          if (yearFilter && yearFilter.data && Array.isArray(yearFilter.data)) {
            const options = yearFilter.data
              .map(y => ({ name: y.name, value: String(y.id) }))  // 改为 name/value
              .filter(y => y.name !== '全部');
            options.unshift({ name: '全部', value: '' });
            fts.push({
              name: '年份',
              key: 'year',
              init: '',  // 添加默认值
              value: options
            });
          }

          // 排序筛选
          const sortFilter = filterData.find(f => f.key === 'sort');
          if (sortFilter && sortFilter.data && Array.isArray(sortFilter.data)) {
            const options = sortFilter.data
              .map(s => ({ name: s.name, value: String(s.id) }))  // 改为 name/value
              .filter(s => s.name !== '全部');
            options.unshift({ name: '默认', value: '' });
            fts.push({
              name: '排序',
              key: 'sort',
              init: '',  // 添加默认值
              value: options
            });
          }

          if (fts.length > 0) {
            filters[tid] = fts;
            OmniBox.log('info', `[荐片APP] ✅ 分类[${tName}]筛选项已添加: ${fts.length}个`);
          }
        }
      } catch (e) {
        OmniBox.log('error', `[荐片APP] ❌ 获取分类[${tName}]筛选失败: ${e.message}`);
      }
    }

    // Netflix 分类
    classes.push({ type_id: 'netflix', type_name: 'Netflix' });
    filters['netflix'] = [{
      key: "cateId",
      name: "Netflix分类",
      value: [
        { n: "热播电影", v: "hot_movie" },
        { n: "热播电视剧", v: "hot_tv" },
        { n: "热播爱情片", v: "hot_love" },
        { n: "热播惊悚片", v: "hot_thriller" },
        { n: "热播动作片", v: "hot_action" },
        { n: "高分电影", v: "top_movie" },
        { n: "经典电影", v: "classic_movie" },
        { n: "经典电视剧", v: "classic_tv" }
      ]
    }];

    OmniBox.log('info', `[荐片APP] ========== 首页获取完成 ==========`);
    OmniBox.log('info', `[荐片APP] 分类数: ${classes.length}, 筛选项数: ${Object.keys(filters).length}`);

    return { class: classes, filters: filters };
  } catch (e) {
    OmniBox.log('error', `[荐片APP] ❌ 获取首页失败: ${e.message}`);
    return { class: [], filters: {} };
  }
};

/**
 * 获取首页数据
 */
async function home(params) {
  try {
    logInfo('处理首页请求');
    const homeData = await getHomeContent();
    const recommendList = await getRecommendList();

    OmniBox.log('info', `[荐片APP] 首页数据: classes=${homeData.class.length}, filters=${Object.keys(homeData.filters).length}, list=${recommendList.length}`);

    return {
      class: homeData.class,
      filters: homeData.filters,
      list: recommendList
    };
  } catch (error) {
    logError('获取首页数据失败', error);
    return {
      class: [],
      filters: {},
      list: []
    };
  }
}


/**
 * 获取分类视频列表
 * @param {string} tid - 分类 ID
 * @param {number} pg - 页码
 * @param {Object} extend - 扩展筛选参数
 * @returns {Object} 视频列表
 */
const getCategoryList = async (tid, pg = 1, extend = {}) => {
  try {
    logInfo('获取分类列表', { tid, pg, extend });

    const params = new URLSearchParams();
    params.append('fcate_pid', tid);
    params.append('page', pg);
    params.append('category_id', extend.type || '');
    params.append('area', extend.area || '');
    params.append('year', extend.year || '');
    params.append('type', '');
    params.append('sort', extend.sort || '');

    const res = await request(`${jpConfig.host}/api/crumb/list?${params.toString()}`);

    if (res.code !== 1) {
      throw new Error(res.msg || '获取列表失败');
    }

    const list = formatList(res.data);
    const hasMore = list.length >= 15;

    if (list.length > 0) {
      logInfo('列表首条数据图片', {
        name: list[0].vod_name,
        pic: list[0].vod_pic.substring(0, 80) + '...'
      });
    }

    logInfo('分类列表获取成功', { count: list.length, page: pg });

    return {
      list: list,
      page: parseInt(pg),
      pagecount: hasMore ? parseInt(pg) + 1 : parseInt(pg),
      limit: 15
    };
  } catch (e) {
    logError('获取分类列表失败', e);
    return { list: [], page: pg, pagecount: pg, limit: 15 };
  }
};

/**
 * 获取首页推荐视频
 * @returns {Array} 推荐视频列表
 */
const getRecommendList = async () => {
  try {
    logInfo('正在获取首页推荐');

    const res = await request(`${jpConfig.host}/api/dyTag/hand_data?category_id=88`);

    if (res.code !== 1 || !res.data) {
      logWarn('获取推荐数据失败或为空');
      return [];
    }

    let list = [];
    for (const key in res.data) {
      if (Array.isArray(res.data[key])) {
        list = list.concat(res.data[key]);
      }
    }

    const formatted = formatList(list);

    if (formatted.length > 0) {
      logInfo('推荐首条数据图片', {
        name: formatted[0].vod_name,
        pic: formatted[0].vod_pic.substring(0, 80) + '...'
      });
    }

    logInfo('首页推荐获取成功', { count: formatted.length });
    return formatted;
  } catch (e) {
    logError('获取首页推荐失败', e);
    return [];
  }
};

/**
 * 搜索视频
 * @param {string} wd - 搜索关键词
 * @param {number} pg - 页码
 * @returns {Object} 搜索结果
 */
const searchVod = async (wd, pg = 1) => {
  try {
    logInfo('执行搜索', { keyword: wd, page: pg });

    const params = new URLSearchParams();
    params.append('keyword', wd);
    params.append('page', pg);

    const res = await request(`${jpConfig.host}/api/v2/search/videoV2?key=${params.toString()}`);

    if (res.code !== 1) {
      logWarn('搜索接口返回错误: ' + res.msg);
      return { list: [], page: pg, pagecount: pg };
    }

    // 原始格式化
    let list = formatList(res.data);

    // =========================
    // 🔍 搜索词二次过滤(核心)
    // =========================
    const keyword = String(wd).trim().toLowerCase();

    list = list.filter(item => {
      const name = (item.vod_name || item.name || item.title || '').toLowerCase();
      return name.includes(keyword);
    });

    const hasMore = list.length >= 15;

    logInfo('搜索完成(已过滤)', {
      keyword: wd,
      count: list.length
    });

    return {
      list,
      page: parseInt(pg),
      pagecount: hasMore ? parseInt(pg) + 1 : parseInt(pg)
    };
  } catch (e) {
    logError('搜索失败', e);
    return { list: [], page: pg, pagecount: pg };
  }
};

/* ============================================================================
 * 详情和播放功能
 * ============================================================================ */

/**
 * 检查线路是否需要屏蔽
 * 屏蔽包含 VIP、FTP、常规 关键字的线路
 * @param {string} sourceName - 线路名称
 * @returns {boolean} 是否屏蔽
 */
const shouldBlockSource = (sourceName) => {
  if (!sourceName) return false;
  const name = sourceName.toLowerCase();
  return name.includes('vip') ||
    name.includes('ftp') ||
    name === '常规线路' ||
    name === '常规';
};

/**
 * 将旧格式的播放源转换为新格式(vod_play_sources)
 * @param {Array} sourceListSource - 原始播放源列表
 * @param {string} vodId - 视频ID
 * @returns {Array} 新格式的播放源列表
 */
function convertToPlaySources(sourceListSource, vodId, vodName = "") {
  const playSources = [];

  if (!sourceListSource || !Array.isArray(sourceListSource)) {
    return playSources;
  }

  for (const source of sourceListSource) {
    // 跳过需要屏蔽的线路
    if (shouldBlockSource(source.name)) {
      logInfo(`屏蔽线路: ${source.name}`);
      continue;
    }

    if (source.source_list && source.source_list.length > 0) {
      const episodes = source.source_list.map((item, index) => {
        const episodeName = item.source_name || `第${index + 1}集`;
        const fid = `${vodId}#${source.name || "线路"}#${index}`;
        const safeUrl = encodeURIComponent(item.url || "");
        const playId = `${safeUrl}|||${encodeMeta({ sid: vodId, fid, v: vodName || "", e: episodeName })}`;
        return {
          name: episodeName,
          playId
        };
      });

      playSources.push({
        name: source.name,
        episodes: episodes
      });
    }
  }

  return playSources;
}

/**
 * 嗅探播放页，兜底提取真实视频地址
 */
const sniffJianpianPlay = async (playUrl) => {
  if (!playUrl) return null;
  try {
    logInfo("尝试嗅探播放页", playUrl);
    const sniffed = await OmniBox.sniffVideo(playUrl);
    if (sniffed && sniffed.url) {
      logInfo("嗅探成功", sniffed.url);
      return {
        urls: [{ name: "嗅探线路", url: sniffed.url }],
        parse: 0,
        header: sniffed.header || { ...PLAY_HEADERS, "Referer": playUrl }
      };
    }
  } catch (error) {
    logInfo(`嗅探失败: ${error.message}`);
  }
  return null;
};

/**
 * 获取视频详情
 * @param {string} ids - 视频 ID(可能包含 @netflix 后缀)
 * @returns {Object} 详情数据
 */
const getDetail = async (ids) => {
  try {
    logInfo('获取详情', { id: ids });

    // 处理 Netflix 类型的详情(移除 @netflix 后缀)
    const realId = ids.replace('@netflix', '');

    const res = await request(`${jpConfig.host}/api/video/detailv2?id=${realId}`);

    if (res.code !== 1 || !res.data) {
      throw new Error(res.msg || '获取详情失败');
    }

    const v = res.data;

    const picPath = v.tvimg || v.thumbnail || v.path || '';
    const fullPicUrl = getPicUrl(picPath);

    logInfo('详情图片处理', {
      original: picPath.substring(0, 50),
      full: fullPicUrl.substring(0, 80)
    });

    // 转换为新格式的播放源
    const vodPlaySources = convertToPlaySources(v.source_list_source, realId, v.title || "");

    // 刮削处理
    let scrapeData = null;
    let videoMappings = [];
    let scrapeType = "";
    const scrapeCandidates = [];
    for (const source of vodPlaySources) {
      for (const ep of source.episodes || []) {
        const metaPart = (ep.playId || "").split('|||')[1] || "";
        const meta = decodeMeta(metaPart);
        const fid = meta?.fid || ep.playId;
        if (!fid) continue;
        scrapeCandidates.push({
          fid,
          file_id: fid,
          file_name: ep.name || "正片",
          name: ep.name || "正片",
          format_type: "video"
        });
      }
    }

    if (scrapeCandidates.length > 0) {
      try {
        const scrapingResult = await OmniBox.processScraping(realId, v.title || "", v.title || "", scrapeCandidates);
        OmniBox.log("info", `[荐片APP] 刮削处理完成,结果: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);
        const metadata = await OmniBox.getScrapeMetadata(realId);
        scrapeData = metadata?.scrapeData || null;
        videoMappings = metadata?.videoMappings || [];
        scrapeType = metadata?.scrapeType || "";
      } catch (error) {
        logError("刮削处理失败", error);
      }
    }

    for (const source of vodPlaySources) {
      for (const ep of source.episodes || []) {
        const metaPart = (ep.playId || "").split('|||')[1] || "";
        const meta = decodeMeta(metaPart);
        const fid = meta?.fid;
        if (!fid) continue;
        const mapping = videoMappings.find((m) => m?.fileId === fid);
        if (!mapping) continue;
        const oldName = ep.name;
        const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
        if (newName && newName !== oldName) {
          ep.name = newName;
          OmniBox.log("info", `[荐片APP] 应用刮削后源文件名: ${oldName} -> ${newName}`);
        }
        meta.e = ep.name;
        meta.s = mapping.seasonNumber;
        meta.n = mapping.episodeNumber;
        ep.playId = `${(ep.playId || "").split('|||')[0]}|||${encodeMeta(meta)}`;
      }

      const hasEpisodeNumber = (source.episodes || []).some(
        (ep) => {
          const metaPart = (ep.playId || "").split('|||')[1] || "";
          const meta = decodeMeta(metaPart);
          return meta?.n !== undefined && meta?.n !== null;
        }
      );
      if (hasEpisodeNumber) {
        source.episodes.sort((a, b) => {
          const metaA = decodeMeta((a.playId || "").split('|||')[1] || "");
          const metaB = decodeMeta((b.playId || "").split('|||')[1] || "");
          const seasonA = metaA?.s || 0;
          const seasonB = metaB?.s || 0;
          if (seasonA !== seasonB) return seasonA - seasonB;
          const episodeA = metaA?.n || 0;
          const episodeB = metaB?.n || 0;
          return episodeA - episodeB;
        });
      }
    }

    logInfo('详情获取成功', {
      name: v.title,
      pic: fullPicUrl.substring(0, 50) + '...',
      sourcesCount: vodPlaySources.length
    });

    return {
      list: [{
        vod_id: ids,
        vod_name: scrapeData?.title || v.title || '未知标题',
        vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : fullPicUrl,
        vod_content: scrapeData?.overview || v.description || '',
        vod_play_sources: vodPlaySources.length > 0 ? vodPlaySources : undefined,
        vod_remarks: v.mask || (v.score ? `评分:${v.score}` : ''),
        vod_year: v.year || '',
        vod_area: v.area || '',
        vod_actor: v.actors ? v.actors.map(a => a.name).join(' ') : '',
        vod_douban_score: v.score || ''
      }]
    };
  } catch (e) {
    logError('获取详情失败', e);
    return { list: [] };
  }
};

/**
 * 处理播放请求
 * @param {string} playId - 播放地址
 * @returns {Object} 播放信息
 */
const handlePlay = async (playId, vodId = "", context = {}) => {
  try {
    logInfo('处理播放请求', { url: playId.substring(0, 50) + '...' });

    const from = context?.from || "web";
    const isWeb = from === "web";

    let rawPlayId = playId;
    let playMeta = {};
    let vodName = "";
    let episodeName = "";

    // 解析透传参数
    if (rawPlayId && rawPlayId.includes('|||')) {
      const [mainPlayId, metaB64] = rawPlayId.split('|||');
      rawPlayId = mainPlayId;
      playMeta = decodeMeta(metaB64 || "");
      vodName = playMeta.v || "";
      episodeName = playMeta.e || "";
      logInfo(`解析透传信息 - 视频: ${vodName}, 集数: ${episodeName}`);
    }

    try {
      rawPlayId = decodeURIComponent(rawPlayId || "");
    } catch (error) {
      logInfo(`playId 解码失败，按原值继续: ${error.message}`);
    }

    const videoIdForScrape = vodId ? String(vodId).replace('@netflix', '') : (playMeta?.sid ? String(playMeta.sid) : "");

    const playInfoPromise = (async () => {
      const isDirectPlayable = rawPlayId && rawPlayId.match(/\.(m3u8|mp4|flv|avi|mkv|ts)/i);
      if (isDirectPlayable) {
        return {
          urls: [{ name: "直接播放", url: rawPlayId }],
          parse: 0,
          header: isWeb ? {} : PLAY_HEADERS
        };
      }

      const sniffResult = await sniffJianpianPlay(rawPlayId);
      if (sniffResult) {
        if (isWeb) {
          return {
            ...sniffResult,
            header: {}
          };
        }
        return sniffResult;
      }

      return {
        urls: [{ name: "播放", url: rawPlayId }],
        parse: 1,
        header: isWeb ? {} : PLAY_HEADERS
      };
    })();

    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: playMeta?.n ?? null,
        episodeName: episodeName || ""
      };

      if (!videoIdForScrape) {
        logInfo("播放增强链路跳过: videoIdForScrape 为空");
        return result;
      }

      try {
        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
        if (!metadata || !metadata.scrapeData) {
          logInfo(`播放增强链路跳过: metadata 不完整, videoId=${videoIdForScrape}`);
          return result;
        }

        result.scrapeTitle = metadata.scrapeData.title || "";
        if (metadata.scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${metadata.scrapeData.posterPath}`;
        }

        const mappings = Array.isArray(metadata.videoMappings) ? metadata.videoMappings : [];
        logInfo(`播放增强链路读取元数据成功: videoId=${videoIdForScrape}, mappings=${mappings.length}, scrapeType=${metadata.scrapeType || "unknown"}`);
        const mapping = mappings.find((m) => m?.fileId === playMeta?.fid);
        if (mapping) {
          if (mapping.episodeName) {
            result.episodeName = buildScrapedEpisodeName(metadata.scrapeData, mapping, result.episodeName || episodeName || "");
          }
          if (mapping.episodeNumber !== undefined && mapping.episodeNumber !== null) {
            result.episodeNumber = mapping.episodeNumber;
          }
        } else if (mappings.length > 0) {
          logInfo(`播放增强链路未命中 mapping: fid=${playMeta?.fid || ""}`);
        }

        vodName = result.scrapeTitle || vodName;
        episodeName = result.episodeName || episodeName;
        const scrapedDanmuFileName = buildFileNameForDanmu(vodName, episodeName);
        if (scrapedDanmuFileName && typeof OmniBox.getDanmakuByFileName === "function") {
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(scrapedDanmuFileName);
          const count = Array.isArray(matchedDanmaku) ? matchedDanmaku.length : 0;
          logInfo(`播放增强链路弹幕匹配结果: fileName=${scrapedDanmuFileName}, count=${count}`);
          if (count > 0) {
            result.danmakuList = matchedDanmaku;
          }
        }
      } catch (error) {
        logInfo(`读取刮削元数据失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);

    if (playInfoResult.status !== "fulfilled") {
      throw playInfoResult.reason || new Error("播放主链路失败");
    }

    const playResult = playInfoResult.value || { urls: [], parse: 0, header: {} };

    let danmakuList = [];
    let scrapeTitle = "";
    let scrapePic = "";
    let episodeNumber = playMeta?.n ?? null;
    if (metadataResult.status === "fulfilled" && metadataResult.value) {
      danmakuList = metadataResult.value.danmakuList || [];
      scrapeTitle = metadataResult.value.scrapeTitle || "";
      scrapePic = metadataResult.value.scrapePic || "";
      if (metadataResult.value.episodeNumber !== undefined && metadataResult.value.episodeNumber !== null) {
        episodeNumber = metadataResult.value.episodeNumber;
      }
      episodeName = metadataResult.value.episodeName || episodeName;
      vodName = scrapeTitle || vodName;
    } else if (metadataResult.status === "rejected") {
      logInfo(`播放增强链路失败(不影响播放): ${metadataResult.reason?.message || metadataResult.reason}`);
    }

    if (videoIdForScrape && context?.sourceId && typeof OmniBox.addPlayHistory === "function") {
      const historyPayload = {
        vodId: videoIdForScrape,
        title: scrapeTitle || vodName || playMeta.v || "荐片视频",
        pic: scrapePic || "",
        episode: buildHistoryEpisode(rawPlayId, episodeNumber, episodeName),
        sourceId: context.sourceId,
        episodeNumber: episodeNumber,
        episodeName: episodeName || ""
      };
      OmniBox.addPlayHistory(historyPayload)
        .then((added) => {
          if (added) {
            logInfo(`已添加播放记录: ${historyPayload.title}`);
          } else {
            logInfo(`播放记录已存在，跳过添加: ${historyPayload.title}`);
          }
        })
        .catch((error) => {
          logInfo(`添加播放记录失败: ${error.message}`);
        });
    } else {
      logInfo(`跳过播放记录: sourceId=${context?.sourceId || ""}, hasApi=${typeof OmniBox.addPlayHistory === "function"}`);
    }

    if (danmakuList.length > 0) {
      playResult.danmaku = danmakuList;
    }

    return playResult;
  } catch (e) {
    logError('处理播放失败', e);
    return {
      urls: [],
      parse: 0,
      header: {}
    };
  }
};

/* ============================================================================
 * OmniBox 接口实现
 * ============================================================================ */

/**
 * 获取首页数据
 * @param {Object} params - 参数对象
 * @returns {Object} 返回分类列表和推荐视频列表
 */
async function home(params) {
  try {
    logInfo('处理首页请求');
    const homeData = await getHomeContent();
    const recommendList = await getRecommendList();

    logInfo('首页数据组装完成', {
      classCount: homeData.class.length,
      recommendCount: recommendList.length
    });

    return {
      class: homeData.class,
      filters: homeData.filters,
      list: recommendList
    };
  } catch (error) {
    logError('获取首页数据失败', error);
    return {
      class: [],
      filters: {},
      list: []
    };
  }
}

/**
 * 获取分类数据
 */
async function category(params) {
  try {
    const categoryId = params.categoryId;
    const page = params.page || 1;
    const filters = params.filters || {};

    if (!categoryId) {
      throw new Error("分类ID不能为空");
    }

    logInfo(`获取分类数据: categoryId=${categoryId}, page=${page}`);

    // 处理 Netflix 分类
    if (categoryId === 'netflix') {
      let subType = filters.cateId || 'hot_movie';
      const result = await getNetflixList(subType, page);

      // 只在第一页返回筛选选项
      if (page === 1) {
        result.filters = [
          {
            key: "cateId",
            name: "Netflix分类",
            value: [
              { n: "热播电影", v: "hot_movie" },
              { n: "热播电视剧", v: "hot_tv" },
              { n: "热播爱情片", v: "hot_love" },
              { n: "热播惊悚片", v: "hot_thriller" },
              { n: "热播动作片", v: "hot_action" },
              { n: "高分电影", v: "top_movie" },
              { n: "经典电影", v: "classic_movie" },
              { n: "经典电视剧", v: "classic_tv" }
            ]
          }
        ];
      }

      return result;
    }

    // 处理普通分类
    const result = await getCategoryList(categoryId, page, filters);

    return result;
  } catch (error) {
    logError('获取分类数据失败', error);
    return {
      page: 1,
      pagecount: 0,
      total: 0,
      list: []
    };
  }
}

/**
 * 获取视频详情
 * @param {Object} params - 参数对象
 *   - videoId: 视频ID(必填)
 * @returns {Object} 返回视频详情
 */
async function detail(params) {
  try {
    const videoId = params.videoId;

    if (!videoId) {
      throw new Error("视频ID不能为空");
    }

    logInfo(`获取视频详情: videoId=${videoId}`);

    return await getDetail(videoId);
  } catch (error) {
    logError('获取视频详情失败', error);
    return {
      list: []
    };
  }
}

/**
 * 搜索视频
 * @param {Object} params - 参数对象
 *   - keyword: 搜索关键词(必填)
 *   - page: 页码(可选,默认1)
 * @returns {Object} 返回搜索结果
 */
async function search(params) {
  try {
    const keyword = params.keyword || params.wd || "";
    const page = params.page || 1;

    if (!keyword) {
      return {
        page: 1,
        pagecount: 0,
        total: 0,
        list: []
      };
    }

    logInfo(`搜索视频: keyword=${keyword}, page=${page}`);

    return await searchVod(keyword, page);
  } catch (error) {
    logError('搜索视频失败', error);
    return {
      page: 1,
      pagecount: 0,
      total: 0,
      list: []
    };
  }
}

/**
 * 获取播放地址
 * @param {Object} params - 参数对象
 *   - playId: 播放地址ID(必填)
 *   - flag: 播放源标识(可选)
 * @returns {Object} 返回播放地址信息
 */
async function play(params, context) {
  try {
    const playId = params.playId;
    const vodId = params.vodId || "";

    if (!playId) {
      throw new Error("播放地址ID不能为空");
    }

    logInfo(`获取播放地址: playId=${playId}`);

    return await handlePlay(playId, vodId, context);
  } catch (error) {
    logError('获取播放地址失败', error);
    return {
      urls: [],
      parse: 0,
      header: {}
    };
  }
}

// 导出接口
module.exports = {
  home,
  category,
  search,
  detail,
  play
};

// 使用 OmniBox runner
const runner = require("spider_runner");
runner.run(module.exports);

});

_load(10, "莫小影", function (module, exports, require) {
// @name 莫小影
// @description 莫小影（现千千影视）页面解析，支持首页、分类、搜索、详情、多线路播放与嗅探兜底
// @version 1.0.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/莫小影.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const HOST = String(process.env.QQYS_HOST || process.env.MOXY_HOST || "https://www.qqys01.com").replace(/\/+$/, "");
const SITE_ORIGIN = new URL(HOST).origin;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  Referer: `${HOST}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9",
};
const CLASS_LIST = [
  { type_id: "1", type_name: "电影" },
  { type_id: "2", type_name: "连续剧" },
  { type_id: "3", type_name: "综艺" },
  { type_id: "4", type_name: "动漫" },
  { type_id: "5", type_name: "短剧" },
];
const CATEGORY_IDS = new Set(CLASS_LIST.map((item) => item.type_id));
const AREA_NAMES = new Set([
  "中国大陆", "大陆", "中国", "香港", "中国香港", "台湾", "中国台湾",
  "美国", "日本", "韩国", "英国", "法国", "德国", "泰国", "印度",
  "加拿大", "西班牙", "意大利", "澳大利亚", "俄罗斯", "其他",
]);

module.exports = { home, category, search, detail, play };
runner.run(module.exports);

function getBodyText(response) {
  const body = response && typeof response === "object"
    ? ("body" in response ? response.body : ("data" in response ? response.data : response))
    : response;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return Buffer.from(body).toString("utf8");
  return String(body || "");
}

async function requestText(url, options = {}) {
  const response = await OmniBox.request(url, {
    method: options.method || "GET",
    headers: {
      ...HEADERS,
      ...(options.headers || {}),
      Referer: options.referer || options.headers?.Referer || `${HOST}/`,
    },
    timeout: options.timeout || 30000,
    body: options.body,
  });
  const statusCode = Number(response?.statusCode || 200);
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`HTTP ${statusCode || "unknown"} @ ${url}`);
  }
  return getBodyText(response);
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (entity, code) => {
      const number = Number(code);
      return Number.isInteger(number) && number >= 0 && number <= 0x10FFFF ? String.fromCodePoint(number) : entity;
    })
    .replace(/&#x([0-9a-f]+);/gi, (entity, code) => {
      const number = parseInt(code, 16);
      return Number.isInteger(number) && number >= 0 && number <= 0x10FFFF ? String.fromCodePoint(number) : entity;
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(value) {
  return decodeHtml(
    String(value || "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

function absUrl(value, base = HOST) {
  let url = decodeHtml(String(value || "").trim())
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\\//g, "/");
  if (!url || /^data:/i.test(url)) return "";
  if (url.startsWith("//")) url = `https:${url}`;
  try {
    return new URL(url, base).toString();
  } catch (_) {
    return url;
  }
}

function getAttribute(attrs, name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(attrs || "").match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  return match ? decodeHtml(match[2]).trim() : "";
}

function findAttribute(html, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(html || "").match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
    if (match && match[2]) return decodeHtml(match[2]).trim();
  }
  return "";
}

function parseCards(html) {
  const text = String(html || "");
  const list = [];
  const seen = new Set();
  const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(text)) !== null) {
    const attrs = match[1] || "";
    const inner = match[2] || "";
    const href = getAttribute(attrs, "href");
    const idMatch = href.match(/\/voddetail\/?(\d+)\.html/i);
    if (!idMatch || seen.has(idMatch[1])) continue;

    const className = getAttribute(attrs, "class");
    if (!/module-(?:poster-item|card-item-poster)/i.test(className) && !/<img\b/i.test(inner)) continue;

    let name = cleanText(getAttribute(attrs, "title"));
    if (!name) name = cleanText(findAttribute(inner, ["alt", "title"]));
    if (!name) {
      const titleMatch = inner.match(/<div[^>]*class=["'][^"']*module-(?:poster|card)-item-title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      name = cleanText(titleMatch ? titleMatch[1] : "");
    }
    if (!name) continue;

    const pic = findAttribute(inner, ["data-original", "data-src", "src"]);
    const remarkMatch = inner.match(/<div[^>]*class=["'][^"']*module-item-note[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

    seen.add(idMatch[1]);
    list.push({
      vod_id: idMatch[1],
      vod_name: name,
      vod_pic: absUrl(pic),
      vod_remarks: cleanText(remarkMatch ? remarkMatch[1] : ""),
    });
  }

  return list;
}

function parsePageCount(html, currentPage) {
  const pages = [Math.max(1, Number(currentPage) || 1)];
  const regex = /\/vod(?:show|search)\/[^"'?#]*?(\d+)---\.html/gi;
  let match;
  while ((match = regex.exec(String(html || ""))) !== null) {
    const page = Number(match[1]);
    if (Number.isFinite(page) && page > 0 && page <= 100000) pages.push(page);
  }
  return Math.max(...pages);
}

function getInfoTagValues(html) {
  const text = String(html || "");
  const start = text.search(/class=["'][^"']*module-info-tag[^"']*["']/i);
  if (start < 0) return [];
  const tail = text.slice(start, start + 5000);
  const end = tail.search(/class=["'][^"']*module-(?:mobile-play|info-content)[^"']*["']/i);
  const block = end > 0 ? tail.slice(0, end) : tail;
  const values = [];
  const seen = new Set();
  const anchorRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(block)) !== null) {
    const value = cleanText(match[1]);
    if (value && !seen.has(value)) {
      seen.add(value);
      values.push(value);
    }
  }
  return values;
}

function extractInfoItem(html, label) {
  const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(new RegExp(
    `<span[^>]*class=["'][^"']*module-info-item-title[^"']*["'][^>]*>\\s*${escaped}\\s*[：:]?\\s*<\\/span>\\s*<div[^>]*class=["'][^"']*module-info-item-content[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`,
    "i",
  ));
  return cleanText(match ? match[1] : "");
}

function normalizePeople(value) {
  return String(value || "").replace(/(?:\s*\/\s*)+$/g, "").trim();
}

function extractDescription(html) {
  const match = String(html || "").match(
    /<div[^>]*class=["'][^"']*module-info-introduction-content[^"']*["'][^>]*>\s*(?:<p[^>]*>)?([\s\S]*?)(?:<\/p>)?\s*<\/div>/i,
  );
  return cleanText(match ? match[1] : "");
}

function extractPoster(html) {
  const text = String(html || "");
  const start = text.search(/class=["'][^"']*module-info-poster[^"']*["']/i);
  const block = start >= 0 ? text.slice(start, start + 2500) : text;
  return absUrl(findAttribute(block, ["data-original", "data-src", "src"]));
}

function parsePlaySources(html) {
  const text = String(html || "");
  const sourceNames = [];
  const sourceNameRegex = /data-dropdown-value\s*=\s*(["'])([\s\S]*?)\1/gi;
  let match;
  while ((match = sourceNameRegex.exec(text)) !== null) {
    const name = cleanText(match[2]);
    if (name && !sourceNames.includes(name)) sourceNames.push(name);
  }

  const sources = [];
  const listRegex = /<div\b[^>]*class=["'][^"']*module-play-list-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let sourceIndex = 0;
  while ((match = listRegex.exec(text)) !== null) {
    const episodes = [];
    const seen = new Set();
    const episodeRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    let episodeMatch;
    while ((episodeMatch = episodeRegex.exec(match[1])) !== null) {
      const href = getAttribute(episodeMatch[1], "href");
      if (!/\/vodplay\//i.test(href)) continue;
      const playId = absUrl(href);
      if (!playId || seen.has(playId)) continue;
      const title = cleanText(episodeMatch[2]) || cleanText(getAttribute(episodeMatch[1], "title")) || "播放";
      seen.add(playId);
      episodes.push({ name: title, playId });
    }
    const sourceName = sourceNames[sourceIndex] || `线路${sourceIndex + 1}`;
    sourceIndex += 1;
    if (episodes.length) sources.push({ name: sourceName, episodes });
  }
  return sources;
}

function toLegacyPlayFields(sources) {
  const safeName = (value) => String(value || "").replace(/[$#]/g, " ").trim();
  return {
    vod_play_from: sources.map((source) => safeName(source.name)).join("$$$"),
    vod_play_url: sources
      .map((source) => source.episodes.map((episode) => `${safeName(episode.name)}$${episode.playId}`).join("#"))
      .join("$$$"),
  };
}

function extractPlayerData(html) {
  const match = String(html || "").match(
    /(?:(?:var|let|const)\s+)?player_[A-Za-z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;?/i,
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (_) {
    return null;
  }
}

function safeDecodeURIComponent(value) {
  let result = String(value || "");
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(result);
      if (decoded === result) break;
      result = decoded;
    } catch (_) {
      break;
    }
  }
  return result;
}

function decodePlayerUrl(value, encrypt) {
  const raw = String(value || "").trim().replace(/\\\//g, "/");
  if (!raw) return "";
  try {
    if (String(encrypt) === "2") {
      const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      return safeDecodeURIComponent(Buffer.from(padded, "base64").toString("utf8"));
    }
    if (String(encrypt) === "1") return safeDecodeURIComponent(raw);
  } catch (_) {}
  return raw;
}

function isDirectMedia(url) {
  return /\.(?:m3u8|mp4|flv|m4s|mpd|mkv|avi)(?:$|[?#])/i.test(String(url || ""));
}

function directPlayResult(url, referer, name = "播放") {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  return { parse: 0, jx: 0, url, urls: [{ name, url }], header, headers: header };
}

function browserSniffResult(url, referer, name = "播放页") {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  return { parse: 1, jx: 1, url, urls: url ? [{ name, url }] : [], header, headers: header };
}

function emptyPlayResult() {
  return { parse: 0, jx: 0, url: "", urls: [], header: {}, headers: {} };
}

function isHttpUrl(url) {
  try {
    const protocol = new URL(String(url || "")).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch (_) {
    return false;
  }
}

function isSitePlayPage(url) {
  try {
    const parsed = new URL(String(url || ""));
    return isHttpUrl(parsed.toString())
      && parsed.origin === SITE_ORIGIN
      && /\/vodplay\//i.test(parsed.pathname);
  } catch (_) {
    return false;
  }
}

function normalizeSniffUrls(result, defaultName) {
  const urls = [];
  const seen = new Set();
  const append = (item) => {
    const url = String(typeof item === "string" ? item : (item?.url || item?.playUrl || item?.src || "")).trim();
    if (!isHttpUrl(url) || seen.has(url)) return;
    seen.add(url);
    urls.push({ name: String(item?.name || defaultName || "嗅探线路"), url });
  };
  if (Array.isArray(result?.urls)) result.urls.forEach(append);
  if (!urls.length) append(result);
  return urls;
}

async function sniffOrBrowserFallback(targetUrl, referer, name) {
  if (!isHttpUrl(targetUrl)) return emptyPlayResult();
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  if (typeof OmniBox.sniffVideo === "function") {
    try {
      const sniffed = await OmniBox.sniffVideo(targetUrl, header);
      const urls = normalizeSniffUrls(sniffed, name);
      if (urls.length) {
        const playHeader = sniffed?.header || sniffed?.headers || header;
        return { parse: 0, jx: 0, url: urls[0].url, urls, header: playHeader, headers: playHeader };
      }
    } catch (error) {
      await OmniBox.log("warn", `[莫小影][play] 服务端嗅探失败: ${error.message}`);
    }
  }
  return browserSniffResult(targetUrl, referer, name);
}

async function home() {
  try {
    const html = await requestText(`${HOST}/`);
    return { class: CLASS_LIST, filters: {}, list: parseCards(html).slice(0, 60) };
  } catch (error) {
    await OmniBox.log("error", `[莫小影][home] ${error.message}`);
    return { class: CLASS_LIST, filters: {}, list: [] };
  }
}

async function category(params = {}) {
  const page = Math.max(1, parseInt(params.page || 1, 10) || 1);
  try {
    const requestedId = String(params.categoryId || params.type_id || params.tid || "1").trim();
    const categoryId = CATEGORY_IDS.has(requestedId) ? requestedId : "1";
    const url = page === 1
      ? `${HOST}/vodshow/${categoryId}-----------.html`
      : `${HOST}/vodshow/${categoryId}--------${page}---.html`;
    const html = await requestText(url);
    const list = parseCards(html);
    const limit = list.length || 20;
    const pagecount = parsePageCount(html, page);
    return { page, pagecount, limit, total: pagecount * limit, list };
  } catch (error) {
    await OmniBox.log("error", `[莫小影][category] ${error.message}`);
    return { page, pagecount: page, limit: 0, total: 0, list: [] };
  }
}

async function search(params = {}) {
  const page = Math.max(1, parseInt(params.page || 1, 10) || 1);
  try {
    const keyword = String(params.keyword || params.wd || params.key || "").trim();
    if (!keyword) return { page, pagecount: 0, limit: 0, total: 0, list: [] };
    const encoded = encodeURIComponent(keyword);
    const url = page === 1
      ? `${HOST}/vodsearch/${encoded}-------------.html`
      : `${HOST}/vodsearch/${encoded}----------${page}---.html`;
    const html = await requestText(url, { timeout: 60000 });
    const list = parseCards(html);
    const limit = list.length || 20;
    const pagecount = parsePageCount(html, page);
    return { page, pagecount, limit, total: pagecount * limit, list };
  } catch (error) {
    await OmniBox.log("error", `[莫小影][search] ${error.message}`);
    return { page, pagecount: page, limit: 0, total: 0, list: [] };
  }
}

async function detail(params = {}) {
  try {
    const input = String(params.videoId || params.id || params.vod_id || params.categoryId || "").trim();
    const idMatch = input.match(/\/voddetail\/?(\d+)\.html/i) || input.match(/^(\d+)$/);
    const videoId = idMatch ? idMatch[1] : "";
    if (!videoId) return { list: [] };

    const html = await requestText(`${HOST}/voddetail${videoId}.html`);
    const name = cleanText((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "")
      || cleanText((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").split("-")[0].trim();
    const tags = getInfoTagValues(html);
    const year = tags.find((value) => /^\d{4}$/.test(value)) || "";
    const area = tags.find((value) => AREA_NAMES.has(value)) || (year && tags[tags.indexOf(year) + 1]) || "";
    const vodClass = tags.find((value) => value !== year && value !== area) || "";
    const playSources = parsePlaySources(html);
    const legacy = toLegacyPlayFields(playSources);

    return {
      list: [{
        vod_id: videoId,
        vod_name: name,
        vod_pic: extractPoster(html),
        vod_year: year,
        vod_area: area,
        vod_class: vodClass,
        vod_director: normalizePeople(extractInfoItem(html, "导演")),
        vod_actor: normalizePeople(extractInfoItem(html, "主演")),
        vod_content: extractDescription(html) || "暂无简介",
        vod_remarks: extractInfoItem(html, "集数") || extractInfoItem(html, "备注") || extractInfoItem(html, "更新"),
        vod_play_sources: playSources,
        ...legacy,
      }],
    };
  } catch (error) {
    await OmniBox.log("error", `[莫小影][detail] ${error.message}`);
    return { list: [] };
  }
}

async function play(params = {}) {
  const input = String(params.playId || params.id || params.url || params.input || "").trim();
  const flag = String(params.flag || "播放").trim() || "播放";
  if (!input) return browserSniffResult("", `${HOST}/`, flag);

  const playUrl = absUrl(input);
  if (isDirectMedia(playUrl)) {
    return isHttpUrl(playUrl) ? directPlayResult(playUrl, `${HOST}/`, flag) : emptyPlayResult();
  }

  if (!isSitePlayPage(playUrl)) {
    await OmniBox.log("warn", `[莫小影][play] 拒绝非本站播放页: ${playUrl}`);
    return emptyPlayResult();
  }
  try {
    const html = await requestText(playUrl, { referer: `${HOST}/`, timeout: 30000 });
    const player = extractPlayerData(html);
    const decoded = decodePlayerUrl(player?.url, player?.encrypt);
    const realUrl = decoded ? absUrl(decoded, playUrl) : "";
    const from = String(player?.from || "").toLowerCase();

    if (isHttpUrl(realUrl) && (isDirectMedia(realUrl) || /m3u8|mp4|flv/.test(from))) {
      return directPlayResult(realUrl, playUrl, flag);
    }
    if (isHttpUrl(realUrl)) return await sniffOrBrowserFallback(realUrl, playUrl, flag);

    const iframeMatch = html.match(/<iframe\b[^>]*src=["']([^"']+)["']/i);
    const sniffTarget = iframeMatch ? absUrl(iframeMatch[1], playUrl) : playUrl;
    return await sniffOrBrowserFallback(sniffTarget, playUrl, flag);
  } catch (error) {
    await OmniBox.log("error", `[莫小影][play] ${error.message}`);
    return await sniffOrBrowserFallback(playUrl, playUrl, flag);
  }
}
});
