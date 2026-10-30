// @name 影视采集A(合并2源)
// @version 3.20261030.1219
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

_load(1, "LIBVIO", function (module, exports, require) {
// @name LIBVIO
// @author 梦
// @description 刮削：已接入，弹幕：已接入，播放记录：已接入，嗅探：不需要（直链优先，支持网盘线路展开）
// @dependencies
// @version 1.5.7
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/LIBVIO.js

const http = require("http");
const https = require("https");
const crypto = require("crypto");
const { URL } = require("url");
const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const HOST_CANDIDATES = [
    "https://www.libvio.lat",
    "https://www.libvios.com",
    "https://libvio.run",
    "https://www.libvio.mov",
    "https://www.libhd.com",
].map((item) => normalizeHost(item)).filter(Boolean);
const LIBVIO_RELEASE_URL = "https://www.libvio.app";
const HOST_CACHE_KEY = "libvio:active_host";
const HOST_CACHE_TTL = 60 * 60 * 24 * 30;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
let ACTIVE_HOST = HOST_CANDIDATES[0];

const DEFAULT_PAGE_SIZE = 12;
const HOME_CACHE_TTL = 60 * 15;
const CATEGORY_CACHE_TTL = 60 * 10;
const SEARCH_CACHE_TTL = 60 * 10;
const DETAIL_CACHE_TTL = 60 * 20;
const FILTER_CACHE_TTL = 60 * 20;
const PAN_SHARE_CACHE_TTL = 60 * 60;
const PLAY_CACHE_TTL = 60 * 3;
const DRIVE_TYPE_CONFIG = (process.env.DRIVE_TYPE_CONFIG || "quark;uc").split(";").map((t) => t.trim().toLowerCase()).filter(Boolean);
const SOURCE_NAMES_CONFIG = (process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连").split(";").map((s) => s.trim()).filter(Boolean);
const DRIVE_ORDER = (process.env.DRIVE_ORDER || "baidu;tianyi;quark;uc;115;xunlei;ali;123pan").split(";").map((s) => s.trim().toLowerCase()).filter(Boolean);
const panShareCache = new Map();

// 分类映射（根据实际页面结构更新）
const CLASS_LIST = [
    { type_id: "1", type_name: "电影" },
    { type_id: "2", type_name: "电视剧" }, // 原 "剧集" → "电视剧" 兼容新版页面
    { type_id: "4", type_name: "动漫" },
    { type_id: "15", type_name: "日韩剧" },
    { type_id: "16", type_name: "欧美剧" }
];

const FILTERS = {
    "1": {
        genre: ["喜剧", "爱情", "恐怖", "动作", "科幻", "剧情", "战争", "警匪", "犯罪", "动画", "奇幻", "武侠", "冒险", "枪战", "悬疑", "惊悚", "经典", "青春", "文艺", "微电影", "古装", "历史", "运动", "农村", "儿童", "网络电影"],
        area: ["大陆", "香港", "台湾", "美国", "法国", "英国", "日本", "韩国", "德国", "泰国", "印度", "意大利", "西班牙", "加拿大", "其他"],
        lang: ["国语", "英语", "粤语", "闽南语", "韩语", "日语", "其它"]
    },
    "2": {
        genre: ["喜剧", "科幻", "悬疑", "欧美", "剧情", "奇幻", "古装", "动作", "犯罪", "冒险", "惊悚", "恐怖", "历史", "爱情", "音乐", "家庭", "国产", "运动", "动画", "西部", "战争", "传记", "灾难", "纪录片", "短片", "海外", "真人秀"],
        area: ["美国", "韩国", "英国", "日本", "大陆", "台湾", "德国", "哥伦比亚", "意大利", "西班牙", "丹麦", "挪威", "法国", "香港", "泰国", "其它"],
        lang: ["国语", "英语", "粤语", "闽南语", "韩语", "日语", "其它"]
    },
    "4": {
        genre: ["情感", "科幻", "热血", "推理", "搞笑", "冒险", "萝莉", "校园", "动作", "机战", "运动", "战争", "少年", "少女", "社会", "原创", "亲子", "益智", "励志", "其他"],
        area: ["中国大陆", "日本", "欧美", "其他"],
        lang: ["国语", "英语", "粤语", "闽南语", "韩语", "日语", "其它"]
    },
    "15": {
        genre: ["悬疑", "爱情", "科幻", "青春", "偶像", "喜剧", "古装", "武侠", "家庭", "犯罪", "动作", "奇幻", "剧情", "历史", "经典", "乡村", "情景", "商战", "网剧", "其他"],
        area: ["韩国", "日本", "其他"],
        lang: ["国语", "英语", "粤语", "闽南语", "韩语", "日语", "其它"]
    },
    "16": {
        genre: ["悬疑", "科幻", "青春", "偶像", "喜剧", "犯罪", "动作", "奇幻", "剧情", "历史", "经典", "乡村", "情景", "商战", "网剧", "其他"],
        area: ["美国", "英国", "泰国", "其他"],
        lang: ["国语", "英语", "粤语", "闽南语", "韩语", "日语", "其它"]
    }
};

const SORT_OPTIONS = [
    { name: "最新", value: "time" },
    { name: "人气", value: "hits" },
    { name: "评分", value: "score" }
];

function normalizeHost(url = "") {
    const value = String(url || "").trim();
    if (!value) return "";
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
        const target = new URL(withProtocol);
        return `${target.protocol}//${target.host}`;
    } catch {
        return withProtocol.replace(/\/+$/, "");
    }
}

function getCurrentHost() {
    return ACTIVE_HOST || HOST_CANDIDATES[0];
}

async function saveActiveHostCache(host) {
    const normalized = normalizeHost(host);
    if (!normalized) return;
    try {
        await OmniBox.setCache(HOST_CACHE_KEY, normalized, HOST_CACHE_TTL);
        logInfo("写入域名缓存", { host: normalized, ttl: HOST_CACHE_TTL });
    } catch (error) {
        logInfo("写入域名缓存失败", { host: normalized, error: error.message });
    }
}

async function readActiveHostCache() {
    try {
        const cached = await OmniBox.getCache(HOST_CACHE_KEY);
        const normalized = normalizeHost(cached || "");
        if (normalized) {
            logInfo("命中域名缓存", { host: normalized });
            return normalized;
        }
    } catch (error) {
        logInfo("读取域名缓存失败", { error: error.message });
    }
    return "";
}

async function fetchReleaseHosts() {
    const html = await requestTextAbsolute(LIBVIO_RELEASE_URL, {
        timeout: 12000,
        hostForHeaders: normalizeHost(LIBVIO_RELEASE_URL),
    });
    const found = [];
    const pushHost = (value) => {
        const normalized = normalizeHost(value);
        if (!normalized) return;
        if (/libvio\.app$/i.test(new URL(normalized).host)) return;
        found.push(normalized);
    };

    const domainRegex = /https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::\d+)?/g;
    const hrefRegex = /href=["']([^"']+)["']/g;

    let m;
    while ((m = domainRegex.exec(html))) pushHost(m[0]);
    while ((m = hrefRegex.exec(html))) {
        const href = String(m[1] || "").trim();
        if (/^https?:\/\//i.test(href)) pushHost(href);
    }

    const unique = found.filter((item, idx, arr) => arr.indexOf(item) === idx);
    logInfo("发布页候选域名", { release: LIBVIO_RELEASE_URL, count: unique.length, hosts: unique.slice(0, 12) });
    return unique;
}

function buildHeadersForHost(host, extra = {}) {
    return {
        "User-Agent": UA,
        "Referer": `${host}/`,
        "Origin": host,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        ...extra,
    };
}

async function requestTextAbsolute(url, options = {}) {
    const target = new URL(url);
    const lib = target.protocol === "https:" ? https : http;
    const hostForHeaders = normalizeHost(options.hostForHeaders || `${target.protocol}//${target.host}`);
    const headers = buildHeadersForHost(hostForHeaders, options.headers || {});

    return await new Promise((resolve, reject) => {
        const req = lib.request(target, {
            method: options.method || "GET",
            headers,
            timeout: options.timeout || 15000,
        }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                const body = Buffer.concat(chunks).toString("utf8");
                const statusCode = Number(res.statusCode || 0);
                if (statusCode < 200 || statusCode >= 400) {
                    reject(new Error(`请求失败: ${statusCode} ${target.href}`));
                    return;
                }
                resolve(body);
            });
        });

        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy(new Error(`请求超时: ${target.href}`));
        });
        req.end();
    });
}

async function probeHost(host) {
    try {
        await requestTextAbsolute(`${host}/`, { timeout: 8000, hostForHeaders: host });
        return true;
    } catch (error) {
        logInfo("域名探测失败", { host, error: error.message });
        return false;
    }
}

async function ensureActiveHost(preferredHost = "") {
    const preferred = normalizeHost(preferredHost);
    const cachedHost = await readActiveHostCache();

    let releaseHosts = [];
    try {
        releaseHosts = await fetchReleaseHosts();
    } catch (error) {
        logInfo("读取发布页域名失败", { release: LIBVIO_RELEASE_URL, error: error.message });
    }

    const ordered = [
        preferred,
        cachedHost,
        getCurrentHost(),
        ...releaseHosts,
        ...HOST_CANDIDATES,
    ].filter(Boolean).filter((item, idx, arr) => arr.indexOf(item) === idx);

    for (const host of ordered) {
        if (await probeHost(host)) {
            if (ACTIVE_HOST !== host) {
                logInfo("切换可用域名", { from: ACTIVE_HOST, to: host });
            }
            ACTIVE_HOST = host;
            await saveActiveHostCache(host);
            return ACTIVE_HOST;
        }
    }
    throw new Error(`未找到可用域名: ${ordered.join(", ")}`);
}

async function requestText(url, options = {}) {
    const raw = String(url || "").trim();
    if (!raw) throw new Error("请求地址为空");

    if (/^https?:\/\//i.test(raw)) {
        return await requestTextAbsolute(raw, options);
    }

    const hosts = [getCurrentHost(), ...HOST_CANDIDATES].filter(Boolean).filter((item, idx, arr) => arr.indexOf(item) === idx);
    let lastError = null;
    for (const host of hosts) {
        try {
            await ensureActiveHost(host);
            const absoluteUrl = raw.startsWith("/") ? `${ACTIVE_HOST}${raw}` : `${ACTIVE_HOST}/${raw}`;
            return await requestTextAbsolute(absoluteUrl, { ...options, hostForHeaders: ACTIVE_HOST });
        } catch (error) {
            lastError = error;
            logInfo("候选域名请求失败", { host, url: raw, error: error.message });
        }
    }
    throw lastError || new Error(`请求失败: ${raw}`);
}

function md5Short(input = "") {
    return crypto.createHash("md5").update(String(input || "")).digest("hex").slice(0, 16);
}

function buildCacheKey(prefix = "", ...parts) {
    const rawParts = parts
        .flat()
        .map((item) => item === undefined || item === null ? "" : String(item))
        .filter((item) => item !== "");
    const raw = rawParts.join("|");
    const short = raw ? md5Short(raw) : "empty";
    return `${prefix}:${short}`;
}

async function getCachedText(cacheKey, ttl, producer) {
    try {
        const cached = await OmniBox.getCache(cacheKey);
        if (cached) return String(cached);
    } catch (error) {
        logInfo("读取文本缓存失败", { cacheKey, error: error.message });
    }
    const text = String(await producer());
    try {
        await OmniBox.setCache(cacheKey, text, ttl);
    } catch (error) {
        logInfo("写入文本缓存失败", { cacheKey, error: error.message });
    }
    return text;
}

async function getCachedJson(cacheKey, ttl, producer) {
    try {
        const cached = await OmniBox.getCache(cacheKey);
        if (cached) return JSON.parse(String(cached));
    } catch (error) {
        logInfo("读取 JSON 缓存失败", { cacheKey, error: error.message });
    }
    const value = await producer();
    try {
        await OmniBox.setCache(cacheKey, JSON.stringify(value), ttl);
    } catch (error) {
        logInfo("写入 JSON 缓存失败", { cacheKey, error: error.message });
    }
    return value;
}

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

function logInfo(message, data = null) {
    OmniBox.log("info", `[LIBVIO] ${data ? `${message}: ${safeJson(data)}` : message}`);
}

function logError(message, error) {
    OmniBox.log("error", `[LIBVIO] ${message}: ${error?.message || error}`);
}

function safeJson(data) {
    try {
        return JSON.stringify(data);
    } catch {
        return String(data);
    }
}

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

function stripTags(text = "") {
    return String(text)
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeText(text = "") {
    return stripTags(String(text || ""))
        .normalize("NFKC")
        .replace(/[【】\[\]()（）]/g, " ")
        .replace(/[·•・]/g, " ")
        .replace(/[：:]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function buildMappingPreview(mappings = [], limit = 3) {
    return ensureArray(mappings)
        .slice(0, limit)
        .map((item) => `${item?.fileId || "<empty>"}=>${item?.episodeName || item?.name || "<empty>"}`)
        .join(" | ");
}

function buildScrapedEpisodeName(scrapeData, mapping, fallbackName = "") {
    const fallback = normalizeText(fallbackName || "") || String(fallbackName || "").trim() || "正片";
    if (!mapping) return fallback;
    const seasonNumber = mapping.seasonNumber;
    const episodeNumber = mapping.episodeNumber;
    const rawEpisodeName = normalizeText(mapping.episodeName || "");
    const title = normalizeText(scrapeData?.title || "");
    const episodeTitle = rawEpisodeName && rawEpisodeName !== title ? rawEpisodeName : "";

    if (episodeNumber !== undefined && episodeNumber !== null && episodeNumber !== "") {
        const epLabel = `第${episodeNumber}集`;
        if (episodeTitle) {
            return seasonNumber ? `S${seasonNumber}E${episodeNumber} ${episodeTitle}` : `${epLabel} ${episodeTitle}`;
        }
        return seasonNumber ? `S${seasonNumber}E${episodeNumber}` : epLabel;
    }

    if (episodeTitle) return episodeTitle;
    return fallback;
}

function buildDanmakuFileName(vodName = "", episodeName = "") {
    const title = normalizeText(vodName || "");
    if (!title) return "";
    const episode = normalizeText(episodeName || "");
    return episode ? `${title} ${episode}` : title;
}

function buildHistoryEpisode(playId, episodeNumber, episodeName) {
    if (episodeNumber !== undefined && episodeNumber !== null && episodeNumber !== "") {
        return `${playId || ""}@@${episodeNumber}`;
    }
    return `${playId || ""}@@${normalizeText(episodeName || "正片") || "正片"}`;
}

function sortEpisodesByMeta(episodes = []) {
    if (!Array.isArray(episodes) || episodes.length <= 1) return episodes;
    const items = episodes.map((ep, index) => {
        const meta = decodePlayId(String(ep?.playId || "").split("|||")[1] || "");
        const season = Number(meta?.s);
        const episode = Number(meta?.n);
        return {
            ep,
            index,
            hasSeason: Number.isFinite(season) && season > 0,
            hasEpisode: Number.isFinite(episode) && episode > 0,
            season: Number.isFinite(season) ? season : Number.MAX_SAFE_INTEGER,
            episode: Number.isFinite(episode) ? episode : Number.MAX_SAFE_INTEGER,
        };
    });
    const hasSortable = items.some((item) => item.hasEpisode);
    if (!hasSortable) return episodes;
    items.sort((a, b) => {
        if (a.hasEpisode !== b.hasEpisode) return a.hasEpisode ? -1 : 1;
        if (a.season !== b.season) return a.season - b.season;
        if (a.episode !== b.episode) return a.episode - b.episode;
        return a.index - b.index;
    });
    return items.map((item) => item.ep);
}

function fixUrl(url = "") {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("//")) return `https:${url}`;
    const host = getCurrentHost();
    return url.startsWith("/") ? `${host}${url}` : `${host}/${url}`;
}

function encodePlayId(payload) {
    return Buffer.from(JSON.stringify(payload || {}), "utf8").toString("base64");
}

function decodePlayId(playId = "") {
    const input = String(playId || "").trim();
    if (!input) return {};

    // 1) 标准 base64 JSON
    try {
        const text = Buffer.from(input, "base64").toString("utf8").trim();
        if (text.startsWith("{") && text.endsWith("}")) {
            return JSON.parse(text);
        }
    } catch {}

    // 2) URL-safe base64 JSON（-/_）
    try {
        const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
        const text = Buffer.from(padded, "base64").toString("utf8").trim();
        if (text.startsWith("{") && text.endsWith("}")) {
            return JSON.parse(text);
        }
    } catch {}

    // 3) 直接 JSON 字符串
    try {
        if (input.startsWith("{") && input.endsWith("}")) {
            return JSON.parse(input);
        }
    } catch {}

    return {};
}

function resolveCollectPlayPageUrl(rawPlayId = "", meta = {}) {
    const raw = String(rawPlayId || "").trim();

    // 优先用编码后的 meta.url
    const metaUrl = fixUrl(String(meta?.url || "").trim());
    if (/^https?:\/\//i.test(metaUrl)) return metaUrl;

    // raw 已是绝对/相对路径
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^\//.test(raw)) return fixUrl(raw);
    if (/^[^\s]+\.html?(\?.*)?$/i.test(raw)) return fixUrl(`/${raw}`);

    // raw 可能本身是 base64/json 打包过的 playId
    const nested = decodePlayId(raw);
    const nestedUrl = fixUrl(String(nested?.url || "").trim());
    if (/^https?:\/\//i.test(nestedUrl)) return nestedUrl;

    return "";
}

function buildFilterList(categoryId) {
    const preset = FILTERS[String(categoryId)] || {};
    const list = [];
    if (preset.genre?.length) {
        list.push({
            key: "genre",
            name: "剧情",
            init: "",
            value: [{ name: "全部", value: "" }, ...preset.genre.map((item) => ({ name: item, value: item }))]
        });
    }
    if (preset.area?.length) {
        list.push({
            key: "area",
            name: "地区",
            init: "",
            value: [{ name: "全部", value: "" }, ...preset.area.map((item) => ({ name: item, value: item }))]
        });
    }
    list.push({
        key: "year",
        name: "年份",
        init: "",
        value: [{ name: "全部", value: "" }, ...buildYearOptions()]
    });
    if (preset.lang?.length) {
        list.push({
            key: "lang",
            name: "语言",
            init: "",
            value: [{ name: "全部", value: "" }, ...preset.lang.map((item) => ({ name: item, value: item }))]
        });
    }
    list.push({
        key: "sort",
        name: "排序",
        init: "time",
        value: SORT_OPTIONS.map((item) => ({ name: item.name, value: item.value }))
    });
    return list;
}

function buildFilterListFromHtml(html = "", categoryId = "") {
    const groups = parseFilterGroups(html);
    const list = [];
    for (const group of groups) {
        const key = mapFilterTitleToKey(group.title);
        if (!key || !Array.isArray(group.items) || !group.items.length) continue;
        const title = String(group.title || "").replace(/^按/, "").replace(/[：:]\s*$/u, "").trim();
        const values = group.items.map((item) => ({
            name: item.name,
            value: item.name,
        })).filter((item) => item.name);
        if (!values.length) continue;
        list.push({
            key,
            name: title,
            init: key === "sort" ? "time" : "",
            value: key === "sort" ? SORT_OPTIONS.map((item) => ({ name: item.name, value: item.value })) : values,
        });
    }
    return list.length ? list : buildFilterList(categoryId);
}

function buildYearOptions() {
    const current = new Date().getFullYear();
    const list = [];
    for (let year = current; year >= 1998; year -= 1) {
        list.push({ name: String(year), value: String(year) });
    }
    return list;
}

function getCategoryBasePath(categoryId, page = 1) {
    const cid = encodeURIComponent(String(categoryId));
    return page > 1 ? `/type/${cid}-${page}.html` : `/type/${cid}.html`;
}

function parseFilterGroups(html = "") {
    const groups = [];
    const text = String(html || "").replace(/<!--[\s\S]*?-->/g, "");
    const ulRegex = /<ul class="clearfix">([\s\S]*?)<\/ul>/g;
    let match;
    while ((match = ulRegex.exec(text))) {
        const block = match[1] || "";
        const title = stripTags(block.match(/<li[^>]*>\s*<span[^>]*>\s*([\s\S]*?)\s*<\/span>\s*<\/li>/)?.[1] || "")
            .replace(/[：:]\s*$/u, "")
            .trim();
        if (!title) continue;
        const items = [...block.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((item) => ({
            name: stripTags(item[2]),
            href: fixUrl(item[1]),
        })).filter((item) => item.name && item.href);
        if (items.length) groups.push({ title, items });
    }
    return groups;
}

function mapFilterTitleToKey(title = "") {
    const text = String(title || "").trim();
    if (text.includes("剧情") || text.includes("类型")) return "genre";
    if (text.includes("地区")) return "area";
    if (text.includes("年份")) return "year";
    if (text.includes("语言")) return "lang";
    if (text.includes("排序") || text.includes("时间") || text.includes("人气") || text.includes("评分")) return "sort";
    return "";
}

function normalizeFilterValue(key, value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (key === "sort") {
        if (["最新", "时间", "time"].includes(raw)) return "time";
        if (["人气", "热门", "hits"].includes(raw)) return "hits";
        if (["评分", "高分", "score"].includes(raw)) return "score";
    }
    return raw;
}

function resolveFilterHref(groups, key, value) {
    const normalizedValue = normalizeFilterValue(key, value);
    const targetNames = new Set();
    if (!normalizedValue) {
        targetNames.add("全部");
        if (key === "sort") {
            targetNames.add("时间");
            targetNames.add("最新");
        }
    } else if (key === "sort") {
        if (normalizedValue === "time") {
            targetNames.add("时间");
            targetNames.add("最新");
        } else if (normalizedValue === "hits") {
            targetNames.add("人气");
            targetNames.add("热门");
        } else if (normalizedValue === "score") {
            targetNames.add("评分");
            targetNames.add("高分");
        }
    } else {
        targetNames.add(normalizedValue);
    }

    for (const group of groups) {
        if (mapFilterTitleToKey(group.title) !== key) continue;
        const found = group.items.find((item) => targetNames.has(item.name));
        if (found?.href) return found.href;
    }
    return "";
}

function parseObjectParam(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    const text = String(value || "").trim();
    if (!text) return {};
    try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function pickFilterValue(source = {}, keys = []) {
    for (const key of keys) {
        const value = source?.[key];
        if (value === 0 || value === "0") return "0";
        if (typeof value === "string" && value.trim()) return value.trim();
        if (value !== undefined && value !== null && value !== "" && typeof value !== "object") {
            return String(value).trim();
        }
    }
    return "";
}

function normalizeCategoryFilters(params = {}) {
    const merged = {
        ...parseObjectParam(params?.ext),
        ...parseObjectParam(params?.filter),
        ...parseObjectParam(params?.extend),
        ...parseObjectParam(params?.filters),
    };
    return {
        genre: normalizeFilterValue("genre", pickFilterValue(merged, ["genre", "class", "type", "cate", "subType", "subtype", "剧情", "类型"])),
        area: normalizeFilterValue("area", pickFilterValue(merged, ["area", "region", "地区"])),
        year: normalizeFilterValue("year", pickFilterValue(merged, ["year", "年份"])),
        lang: normalizeFilterValue("lang", pickFilterValue(merged, ["lang", "language", "语言"])),
        sort: normalizeFilterValue("sort", pickFilterValue(merged, ["sort", "by", "order", "排序"])),
    };
}

function findCategoryPageHref(html = "", targetPage = 1) {
    const text = String(html || "");
    if (targetPage <= 1) return "";
    const exact = text.match(new RegExp(`<a[^>]*href="([^"]+)"[^>]*>\\s*${targetPage}\\s*<\\/a>`, "i"))?.[1];
    if (exact) return fixUrl(exact);
    return "";
}

async function resolveCategoryPageUrl(baseUrl, targetPage = 1) {
    if (targetPage <= 1) return fixUrl(baseUrl);
    let currentUrl = fixUrl(baseUrl);
    let currentPage = 1;
    while (currentPage < targetPage) {
        const html = await fetchHtml(currentUrl, { ttl: FILTER_CACHE_TTL });
        const directHref = findCategoryPageHref(html, targetPage);
        if (directHref) return directHref;
        const nextHref = findCategoryPageHref(html, currentPage + 1)
            || (targetPage === currentPage + 1 ? fixUrl(html.match(/<a[^>]*href="([^"]+)"[^>]*>\s*下一页\s*<\/a>/)?.[1] || "") : "");
        if (!nextHref || nextHref === currentUrl) {
            logInfo("category 分页到达末页", { baseUrl: currentUrl.replace(getCurrentHost(), ""), targetPage, currentPage });
            return "";
        }
        currentUrl = nextHref;
        currentPage += 1;
    }
    return currentUrl;
}

async function resolveCategoryUrl(categoryId, page, filters = {}) {
    const normalizedFilters = normalizeCategoryFilters({ filters });
    const filterKey = buildCacheKey("libvio:category-filter-url", categoryId, page, JSON.stringify(normalizedFilters));
    return await getCachedText(filterKey, FILTER_CACHE_TTL, async () => {
        let currentUrl = fixUrl(getCategoryBasePath(categoryId, 1));
        const order = ["genre", "area", "year", "lang", "sort"];

        for (const key of order) {
            if (!normalizedFilters[key]) continue;
            const html = await fetchHtml(currentUrl, { ttl: FILTER_CACHE_TTL });
            const groups = parseFilterGroups(html);
            const targetHref = resolveFilterHref(groups, key, normalizedFilters[key]);
            if (targetHref) currentUrl = targetHref;
        }

        return await resolveCategoryPageUrl(currentUrl, page);
    });
}

function buildSearchPath(keyword, page = 1) {
    const pageSeg = page > 1 ? String(page) : "";
    return `/search/------------${pageSeg}---.html?wd=${encodeURIComponent(keyword)}`;
}

async function fetchHtml(url, options = {}) {
    const ttl = Number(options?.ttl || 0);
    if (ttl > 0) {
        const cacheKey = buildCacheKey("libvio:html", url);
        return await getCachedText(cacheKey, ttl, async () => String(await requestText(url, options)));
    }
    return String(await requestText(url, options));
}

function parseVodList(html = "") {
    const text = String(html || "");
    const candidates = [];

    const patterns = [
        /<li[^>]*>[\s\S]*?<a[^>]*href="([^"]*\/detail\/\d+\.html)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<\/li>/g,
        /<a[^>]*href="([^"]*\/detail\/\d+\.html)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?(?:<\/a>)/g,
    ];

    for (const regex of patterns) {
        let match;
        while ((match = regex.exec(text))) {
            const whole = match[0] || "";
            const href = fixUrl(match[1] || "");
            const title = stripTags(match[2] || "");
            if (!href || !title) continue;
            const pic = fixUrl(
                whole.match(/data-original="([^"]+)"/)?.[1]
                || whole.match(/data-src="([^"]+)"/)?.[1]
                || whole.match(/src="([^"]+)"/)?.[1]
                || ""
            );
            const remark = stripTags(
                whole.match(/<span class="pic-text[^>]*">([\s\S]*?)<\/span>/)?.[1]
                || whole.match(/<span class="jidi[^>]*">([\s\S]*?)<\/span>/)?.[1]
                || whole.match(/<p class="remarks[^>]*">([\s\S]*?)<\/p>/)?.[1]
                || ""
            );
            const score = stripTags(
                whole.match(/<span class="pic-tag[^>]*">([\s\S]*?)<\/span>/)?.[1]
                || whole.match(/<span class="score[^>]*">([\s\S]*?)<\/span>/)?.[1]
                || ""
            );
            candidates.push({
                vod_id: href,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remark || score,
                vod_score: score,
            });
        }
        if (candidates.length >= 12) break;
    }

    const dedup = [];
    const seen = new Set();
    for (const item of candidates) {
        const key = `${item.vod_id}@@${item.vod_name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dedup.push(item);
    }
    return dedup;
}

function normalizePanSourceName(name = "") {
    const text = stripTags(name);
    if (/UC/i.test(text)) return "UC网盘";
    if (/百度/i.test(text)) return "百度网盘";
    if (/夸克/i.test(text)) return "夸克网盘";
    if (/天翼/i.test(text)) return "天翼网盘";
    if (/115/i.test(text)) return "115网盘";
    if (/迅雷/i.test(text)) return "迅雷网盘";
    if (/阿里|ALi|Ali/i.test(text)) return "阿里网盘";
    if (/123/i.test(text)) return "123网盘";
    const match = text.match(/\(([^()]+)\)/);
    if (match?.[1]) return match[1].trim();
    return text.replace(/^视频下载\s*/u, "").trim() || text;
}

function splitNetdiskPanels(html = "") {
    const text = String(html || "");
    const panels = [];

    // LIBVIO 详情页常见结构：<div class="stui-vodlist__head"><h3>UC网盘</h3></div><ul>...</ul>
    // 标题与 ul 之间有 </div>，不能只匹配 h3 后紧跟 ul。
    const regex = /<div class="stui-vodlist__head"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?(?:网盘|视频下载)[\s\S]*?)<\/h3>[\s\S]*?<\/div>\s*<ul[^>]*>([\s\S]*?)<\/ul>/gi;
    let match;
    while ((match = regex.exec(text))) {
        panels.push(`<h3>${match[1] || "网盘"}</h3><ul>${match[2] || ""}</ul>`);
    }

    logInfo("detail 网盘面板提取", { count: panels.length, titles: panels.map((panel) => stripTags(panel.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] || "")).join(" | ") });
    return panels;
}

function isCollectPlayHref(url = "") {
    return /\/play\/[^/?#]+\.html(?:[?#].*)?$/i.test(String(url || "").trim());
}

function extractPlaylistSources(html = "", videoId = "", vodName = "") {
    const text = String(html || "");
    const sources = [];
    const seenSources = new Set();
    const patterns = [
        /<div class="stui-vodlist__head"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/div>\s*<ul class="stui-content__playlist[^"]*"[^>]*>([\s\S]*?)<\/ul>/g,
        /<div class="playlist-panel(?:\s+netdisk-panel)?"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/g,
        /<div class="module-tab-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div class="module-play-list[^"]*"[^>]*>([\s\S]*?)<\/div>/g,
    ];

    for (const regex of patterns) {
        let match;
        while ((match = regex.exec(text))) {
            const sourceName = stripTags(match[1] || "播放").replace(/^播放线路[：:]?/u, "").trim();
            if (!sourceName || /猜你喜欢|相关推荐/i.test(sourceName)) continue;
            const listHtml = match[2] || "";
            const episodes = [];
            const seenEpisodes = new Set();

            for (const item of listHtml.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
                const playUrl = fixUrl(item[1] || "");
                if (!isCollectPlayHref(playUrl)) continue;
                const episodeName = stripTags(item[2] || "") || `第${episodes.length + 1}集`;
                const dedupeKey = `${playUrl}@@${episodeName}`;
                if (seenEpisodes.has(dedupeKey)) continue;
                seenEpisodes.add(dedupeKey);
                const episodeIndex = episodes.length;
                const fid = `${videoId}#${sourceName}#${episodeIndex}`;
                const meta = {
                    mode: "collect",
                    url: playUrl,
                    flag: sourceName,
                    name: episodeName,
                    v: vodName,
                    e: episodeName,
                    sid: videoId,
                    fid,
                    t: sourceName,
                    i: episodeIndex,
                };
                episodes.push({
                    name: episodeName,
                    playId: `${playUrl}|||${encodePlayId(meta)}`,
                    _fid: fid,
                    _rawName: episodeName,
                });
            }

            if (!episodes.length) continue;
            const sourceKey = `${sourceName}@@${episodes.map((ep) => ep.playId).join("|")}`;
            if (seenSources.has(sourceKey)) continue;
            seenSources.add(sourceKey);
            sources.push({ name: sourceName, episodes });
        }
    }

    return sources;
}

function buildLegacyPlayFields(playSources = []) {
    const sourceNames = [];
    const sourceUrls = [];
    for (const source of playSources || []) {
        const episodes = Array.isArray(source?.episodes) ? source.episodes : [];
        if (!episodes.length) continue;
        sourceNames.push(String(source.name || "播放").trim() || "播放");
        sourceUrls.push(episodes.map((ep, index) => {
            const episodeName = String(ep?.name || `第${index + 1}集`).replace(/[#$]/g, " ").trim() || `第${index + 1}集`;
            const playId = String(ep?.playId || "").trim();
            return playId ? `${episodeName}$${playId}` : "";
        }).filter(Boolean).join("#"));
    }
    return {
        vod_play_from: sourceNames.join("$$$"),
        vod_play_url: sourceUrls.join("$$$"),
    };
}

function parseMetaItems(html = "") {
    return ensureArray(html.match(/<span class="meta-item">([\s\S]*?)<\/span>/g)).map((item) => stripTags(item));
}

function isPanUrl(url = "") {
    const u = String(url || "").toLowerCase();
    return u.includes("pan.baidu.com") || u.includes("quark.cn") || u.includes("pan.quark.cn") || u.includes("drive.uc.cn") || u.includes("aliyundrive.com") || u.includes("alipan.com") || u.includes("xunlei.com") || u.includes("cloud.189.cn") || u.includes("115.com") || u.includes("123pan.com");
}

function normalizeShareUrl(url = "") {
    let value = String(url || "").trim();
    if (value.startsWith("push://")) value = value.slice("push://".length);
    if (value.startsWith("push:")) value = value.slice("push:".length);
    return value.trim();
}

function isVideoFile(file) {
    if (!file) return false;
    const fileName = String(file.file_name || file.name || "").toLowerCase();
    const exts = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];
    if (exts.some((ext) => fileName.endsWith(ext))) return true;
    const formatType = String(file.format_type || "").toLowerCase();
    return formatType.includes("video") || formatType.includes("mpeg") || formatType.includes("h264");
}

function getFileId(file) {
    return file?.fid || file?.file_id || "";
}

function getFileName(file) {
    return file?.file_name || file?.name || "";
}

async function getAllVideoFiles(shareURL, files) {
    const result = [];
    for (const file of files || []) {
        if (file?.file && isVideoFile(file)) {
            result.push(file);
            continue;
        }
        if (file?.dir) {
            try {
                const subFileId = getFileId(file);
                if (!subFileId) continue;
                const subFileList = await OmniBox.getDriveFileList(shareURL, subFileId);
                if (Array.isArray(subFileList?.files)) {
                    const subVideos = await getAllVideoFiles(shareURL, subFileList.files);
                    result.push(...subVideos);
                }
            } catch (error) {
                logInfo("获取网盘子目录失败", { shareURL, name: getFileName(file), error: error.message });
            }
        }
    }
    return result;
}

async function loadPanFiles(shareURL) {
    if (!shareURL) return null;
    if (panShareCache.has(shareURL)) return panShareCache.get(shareURL);
    const cacheKey = buildCacheKey("libvio:pan-share", shareURL);
    try {
        const result = await getCachedJson(cacheKey, PAN_SHARE_CACHE_TTL, async () => {
            const driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
            const fileList = await OmniBox.getDriveFileList(shareURL, "0");
            const files = Array.isArray(fileList?.files) ? fileList.files : [];
            const videos = await getAllVideoFiles(shareURL, files);
            return { driveInfo, videos };
        });
        panShareCache.set(shareURL, result);
        return result;
    } catch (error) {
        logInfo("读取网盘文件失败", { shareURL, error: error.message });
        return null;
    }
}

function inferDriveTypeFromSourceName(name = "") {
    const raw = String(name || "").toLowerCase();
    if (raw.includes("百度")) return "baidu";
    if (raw.includes("天翼")) return "tianyi";
    if (raw.includes("夸克")) return "quark";
    if (raw === "uc" || raw.includes("uc")) return "uc";
    if (raw.includes("115")) return "115";
    if (raw.includes("迅雷")) return "xunlei";
    if (raw.includes("阿里")) return "ali";
    if (raw.includes("123")) return "123pan";
    return raw;
}

function sortPlaySourcesByDriveOrder(playSources = []) {
    if (!Array.isArray(playSources) || playSources.length <= 1 || DRIVE_ORDER.length === 0) {
        return playSources;
    }
    const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
    return [...playSources].sort((a, b) => {
        const aType = inferDriveTypeFromSourceName(a?.name || "");
        const bType = inferDriveTypeFromSourceName(b?.name || "");
        const aOrder = orderMap.has(aType) ? orderMap.get(aType) : Number.MAX_SAFE_INTEGER;
        const bOrder = orderMap.has(bType) ? orderMap.get(bType) : Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
    });
}

function buildPanEpisodePlayId(shareURL, fileId, meta = {}) {
    return `${shareURL}|${fileId}|||${encodePlayId(meta)}`;
}

function decodeCombinedPlayId(playId = "") {
    if (!String(playId).includes("|||")) return { main: String(playId || ""), meta: {} };
    const [main, metaB64] = String(playId).split("|||");
    return { main, meta: decodePlayId(metaB64 || "") };
}

function expandPanSourcesWithRoutes(playSources = [], from = "web") {
    const result = [];
    for (const source of playSources) {
        const driveType = inferDriveTypeFromSourceName(source?.name || "");
        const shouldExpandRoutes = DRIVE_TYPE_CONFIG.length === 0 || !driveType || DRIVE_TYPE_CONFIG.includes(driveType);

        if (!shouldExpandRoutes) {
            result.push(source);
            continue;
        }

        let routeNames = [...SOURCE_NAMES_CONFIG];
        if (from === "web") {
            routeNames = routeNames.filter((name) => name !== "本地代理");
        }
        if (!routeNames.length) {
            result.push(source);
            continue;
        }

        for (const routeName of routeNames) {
            result.push({
                name: `${source.name}-${routeName}`,
                episodes: (source.episodes || []).map((ep) => {
                    const decoded = decodeCombinedPlayId(ep.playId);
                    const baseMeta = decoded.meta || {};
                    const fileId = String(baseMeta.fileId || baseMeta.fid || "").trim();
                    const shareUrl = String(baseMeta.shareUrl || baseMeta.shareURL || "").trim();
                    const fid = shareUrl && fileId ? `${shareUrl}|${fileId}` : fileId;
                    const meta = { ...(decoded.meta || {}), routeType: routeName, flag: `${source.name}-${routeName}`, fid: fid || baseMeta.fid || "" };
                    return {
                        name: ep.name,
                        playId: `${decoded.main}|||${encodePlayId(meta)}`
                    };
                })
            });
        }
    }
    return result;
}

function decodePlayerUrl(url = "", encrypt = 0) {
    let value = String(url || "").trim();
    const mode = Number(encrypt || 0);
    if (!value) return "";
    try {
        if (mode === 1) {
            value = unescape(value);
        } else if (mode === 2) {
            value = unescape(Buffer.from(value, "base64").toString("utf8"));
        }
    } catch (error) {
        logError("播放地址解码失败", error);
    }
    return value.replace(/\\\//g, "/");
}

function buildPlayUrl(rawUrl = "") {
    const value = String(rawUrl || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith("//")) return `https:${value}`;
    return fixUrl(value);
}

function isDirectMediaUrl(url = "") {
    const value = String(url || "").trim();
    if (!/^https?:\/\//i.test(value)) return false;
    try {
        const target = new URL(value);
        const pathname = target.pathname.toLowerCase();
        return /\.(m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)(?:$|\?)/i.test(pathname) || /\.(m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)$/i.test(value.toLowerCase());
    } catch {
        return /\.(m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)(?:$|\?)/i.test(value.toLowerCase());
    }
}

function buildProviderIframeUrl(player = {}) {
    const from = String(player?.from || '').trim();
    const rawUrl = String(player?.url || '').trim();
    const id = String(player?.id || '').trim();
    const nid = String(player?.nid || '').trim();
    const next = String(player?.link_next || '').trim();
    if (!from || !rawUrl) return "";

    if (from === 'ty_new1') {
        return `${getCurrentHost()}/vid/ty4.php?url=${encodeURIComponent(rawUrl)}&next=${encodeURIComponent(next)}&id=${encodeURIComponent(id)}&nid=${encodeURIComponent(nid)}`;
    }
    if (from === 'vr2') {
        return `${getCurrentHost()}/vid/plyr/vr2.php?url=${encodeURIComponent(rawUrl)}&next=${encodeURIComponent(next)}&id=${encodeURIComponent(id)}&nid=${encodeURIComponent(nid)}`;
    }
    return "";
}

function emptyPlay(flag = "LIBVIO") {
    return { parse: 0, urls: [] };
}

function emptyPage(page = 1) {
    return { page, pagecount: 0, total: 0, limit: DEFAULT_PAGE_SIZE, list: [] };
}

async function home(params, context) {
    try {
        logInfo("home 进入", { params, host: getCurrentHost(), from: context?.from || "web" });
        const html = await fetchHtml("/", { ttl: HOME_CACHE_TTL });
        let list = parseVodList(html).slice(0, 24);

        if (!list.length) {
            logInfo("home 主站首页解析为空，尝试分类页回退", { fallback: "/type/1.html" });
            const fallbackHtml = await fetchHtml("/type/1.html", { ttl: HOME_CACHE_TTL });
            list = parseVodList(fallbackHtml).slice(0, 24);
            logInfo("home 分类页回退完成", { fallbackListCount: list.length });
        }

        const classes = CLASS_LIST.map((item) => ({ ...item }));
        const filters = {};
        for (const item of classes) {
            filters[item.type_id] = buildFilterList(item.type_id);
        }
        logInfo("home 完成", { classCount: classes.length, listCount: list.length });
        return { class: classes, filters, list };
    } catch (error) {
        logError("home 失败", error);
        return { class: [], filters: {}, list: [] };
    }
}

async function category(params, context) {
    const categoryId = String(params?.categoryId || "1");
    const page = Number(params?.page || 1);
    const filters = normalizeCategoryFilters(params);
    try {
        const finalUrl = await resolveCategoryUrl(categoryId, page, filters);
        if (!finalUrl) {
            logInfo("category 无可用分页链接，返回空页", { categoryId, page });
            return { ...emptyPage(page - 1), filters: buildFilterList(categoryId) };
        }
        logInfo("category 请求", { categoryId, page, filters, rawFilters: { filters: params?.filters || {}, extend: params?.extend || {}, ext: params?.ext || {}, filter: params?.filter || {} }, host: getCurrentHost(), path: finalUrl.replace(getCurrentHost(), ""), from: context?.from || "web" });
        const html = await fetchHtml(finalUrl, { ttl: CATEGORY_CACHE_TTL });
        const list = parseVodList(html);
        const hasNext = Boolean(findCategoryPageHref(html, page + 1));
        const pagecount = list.length === DEFAULT_PAGE_SIZE && hasNext ? page + 1 : (page > 1 || list.length ? page : 0);
        logInfo("category 完成", { categoryId, page, listCount: list.length, pagecount });
        return {
            page,
            pagecount,
            total: pagecount ? pagecount * DEFAULT_PAGE_SIZE : list.length,
            limit: DEFAULT_PAGE_SIZE,
            filters: buildFilterList(categoryId),
            list
        };

    } catch (error) {


        logError("category 失败", error);
        return { ...emptyPage(page), filters: buildFilterList(categoryId) };
    }
}

async function detail(params, context) {
    const videoId = String(params?.videoId || "").trim();
    if (!videoId) return { list: [] };
    try {
        logInfo("detail 请求", { videoId, host: getCurrentHost(), from: context?.from || "web" });
        const html = await fetchHtml(videoId, { ttl: DETAIL_CACHE_TTL });
        const name = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || "");
        const poster = fixUrl(html.match(/class="lazyload"[^>]*data-original="([^"]+)"/)?.[1] || html.match(/data-original="([^"]+)"/)?.[1] || "");
        const intro = stripTags(html.match(/<span class="detail-content"[^>]*>([\s\S]*?)<\/span>/)?.[1] || "");
        const score = stripTags(html.match(/<span class="score">([^<]+)<\/span>/)?.[1] || "");
        const metaItems = parseMetaItems(html);
        const typeName = metaItems[0] || "";
        const area = metaItems[1] || "";
        const year = metaItems[2]?.replace(/[^\d]/g, "") || "";
        const remarks = metaItems[5] || html.match(/<span class="pic-text[^>]*">([\s\S]*?)<\/span>/)?.[1] || "";
        const actor = metaItems.find((item) => item.startsWith("主演："))?.replace(/^主演：/, "") || "";
        const director = metaItems.find((item) => item.startsWith("导演："))?.replace(/^导演：/, "") || "";

        const allCollectSources = extractPlaylistSources(html, videoId, name);

        const netdiskPanels = splitNetdiskPanels(html);
        const netdiskSources = [];
        const processedHrefs = new Set();
        for (const panelHtml of netdiskPanels) {
            const rawSourceTitle = stripTags(panelHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] || "网盘");
            if (!/(网盘|下载)/u.test(rawSourceTitle)) {
                logInfo("detail 跳过非网盘/下载线路", { sourceName: rawSourceTitle });
                continue;
            }
            const sourceName = normalizePanSourceName(rawSourceTitle);
            // 记录正在处理的网盘/下载线路（包括 UC）
            logInfo("detail 开始处理网盘线路", { sourceName, rawTitle: rawSourceTitle });
            const playLinks = [...panelHtml.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
            const episodes = [];
            for (const item of playLinks) {
                const href = fixUrl(item[1] || "");
                if (!/\/play\/[^\/]+\.html/i.test(href)) continue;
                if (processedHrefs.has(href)) continue;
                const label = stripTags(item[2] || "").trim() || "合集";
                const linkTextForPan = `${rawSourceTitle} ${label}`;
                if (!/(网盘|下载)/u.test(linkTextForPan)) continue;
                processedHrefs.add(href);
                const playPageHtml = await fetchHtml(href, { ttl: DETAIL_CACHE_TTL });
                const playerJson = playPageHtml.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})<\/script>/)?.[1];
                let episodeList = [];
                // 如果没有 playerJson 且是 UC 网盘，尝试直接用 href 作为分享链接解析
                if (!playerJson && /UC/i.test(sourceName)) {
                    // UC 的播放页本身不是网盘链接，尝试在页面源码里寻找真实的 UC 分享链接
                    const possibleUrls = [];
                    const ucUrlMatch = playPageHtml.match(/https?:\/\/[^\s'"<>]*drive\.uc\.cn[^\s'"<>]*/i);
                    if (ucUrlMatch) possibleUrls.push(ucUrlMatch[0]);
                    const ucAltMatch = playPageHtml.match(/https?:\/\/[^\s'"<>]*uc\.cn\/s\/[^\s'"<>]*/i);
                    if (ucAltMatch) possibleUrls.push(ucAltMatch[0]);
                    let found = false;
                    for (const shareUrl of possibleUrls) {
                        if (isPanUrl(shareUrl)) {
                            const panInfo = await loadPanFiles(shareUrl);
                            episodeList = Array.isArray(panInfo?.videos) ? panInfo.videos : [];
                            if (episodeList.length) {
                                logInfo("detail UC 网盘通过页面提取解析成功", { sourceName, href, shareUrl, episodeCount: episodeList.length });
                                found = true;
                                break;
                            } else {
                                logInfo("detail UC 网盘通过页面提取无文件", { sourceName, href, shareUrl });
                            }
                        }
                    }
                    if (!found) {
                        logInfo("detail UC 网盘未能提取有效分享链接", { sourceName, href });
                    }
                }
                if (playerJson) {
                    try {
                        const player = JSON.parse(playerJson);
                        const rawFrom = String(player.from || "").toLowerCase();
                        const isPan = rawFrom.includes("uc") || rawFrom.includes("pan") || rawFrom.includes("baidu") || rawFrom.includes("quark") || rawFrom.includes("ali");
                        if (isPan && player.url) {
                            const shareUrl = normalizeShareUrl(decodePlayerUrl(player.url, player.encrypt));
                            if (isPanUrl(shareUrl)) {
                                const panInfo = await loadPanFiles(shareUrl);
                                episodeList = Array.isArray(panInfo?.videos) ? panInfo.videos : [];
                            }
                        }
                    } catch (error) {
                        logInfo("detail 网盘播放页解析失败", { href, error: error.message });
                    }
                }

                if (episodeList.length > 0) {
                    for (const file of episodeList) {
                        const fileId = getFileId(file);
                        if (!fileId) continue;
                        const rawFileName = getFileName(file) || label || "网盘资源";
                        const episodeName = /第\d+集/.test(rawFileName) ? rawFileName : (rawFileName !== "合集" ? rawFileName : (remarks.match(/第\d+集/)?.[0] || rawFileName));
                        episodes.push({
                            name: episodeName,
                            playId: buildPanEpisodePlayId(normalizeShareUrl(decodePlayerUrl(playerJson ? JSON.parse(playerJson).url : "", playerJson ? JSON.parse(playerJson).encrypt : 0)), fileId, {
                                mode: "pan-file",
                                shareUrl: normalizeShareUrl(decodePlayerUrl(playerJson ? JSON.parse(playerJson).url : "", playerJson ? JSON.parse(playerJson).encrypt : 0)),
                                fileId,
                                flag: sourceName,
                                name: episodeName,
                                vodName: name,
                                vodId: String(videoId || "")
                            })
                        });
                    }
                } else {
                    // 没有展开到具体文件时，不要把“合集”当做一集；直接跳过这个网盘源
                    logInfo("detail 网盘线路无具体集数，跳过合集占位", { sourceName, href, label });
                }
            }
            if (episodes.length) {
                logInfo("detail 网盘线路解析完成", { sourceName, episodeCount: episodes.length });
                netdiskSources.push({ name: sourceName, episodes });
            } else {
                logInfo("detail 网盘线路解析失败，已排除", { sourceName, playLinkCount: playLinks.length });
            }
        }

        // 过滤掉已经展开的网盘线路以及 UC 网盘（目前不解析）
        const parsedNetdiskSourceNames = new Set(netdiskSources.map((source) => source.name));
        // 处理 UC 网盘可能被误放入 collectSources 的情况
        const ucCollectSources = allCollectSources.filter((src) => normalizePanSourceName(src?.name || "") === "UC网盘");
        for (const src of ucCollectSources) {
            const rawSourceTitle = src.name || "UC网盘";
            const sourceName = normalizePanSourceName(rawSourceTitle);
            logInfo("detail 开始处理 UC 网盘采集线路", { sourceName, rawSourceTitle });
            const episodes = [];
            for (const ep of src.episodes || []) {
                // ep.playId 在 collectSources 里是普通集合链接 (play page)
                const href = fixUrl((ep.playId || "").split("|||")[0] || "");
                if (!href) continue;
                const playPageHtml = await fetchHtml(href, { ttl: DETAIL_CACHE_TTL });
                // 首先尝试直接从 player_aaaa 中取分享链接（UC 典型）
                let resolvedShareUrl = "";
                try {
                    const playerJsonMatch = playPageHtml.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})<\/script>/);
                    if (playerJsonMatch) {
                        const player = JSON.parse(playerJsonMatch[1]);
                        if (player && typeof player.url === "string" && isPanUrl(player.url)) {
                            resolvedShareUrl = player.url;
                        }
                    }
                } catch (e) {
                    logInfo("detail UC 解析 player_aaaa 失败", { sourceName, href, error: e.message });
                }
                // 若未从 player_aaaa 取到，再尝试正则匹配普通 UC 分享链接
                const possibleUrls = [];
                if (resolvedShareUrl) {
                    possibleUrls.push(resolvedShareUrl);
                } else {
                    const ucUrlMatch = playPageHtml.match(/https?:\/\/[^\s'"<>]*drive\.uc\.cn[^\s'"<>]*/i);
                    if (ucUrlMatch) possibleUrls.push(ucUrlMatch[0]);
                    const ucAltMatch = playPageHtml.match(/https?:\/\/[^\s'"<>]*uc\.cn\/s\/[^\s'"<>]*/i);
                    if (ucAltMatch) possibleUrls.push(ucAltMatch[0]);
                }
                let found = false;
                for (const shareUrl of possibleUrls) {
                    if (!isPanUrl(shareUrl)) continue;
                    const panInfo = await loadPanFiles(shareUrl);
                    const videoList = panInfo?.videos || [];
                    if (videoList.length) {
                        for (const file of videoList) {
                            const fileId = getFileId(file);
                            const rawFileName = getFileName(file);
                            const episodeName = /第\d+集/.test(rawFileName) ? rawFileName : (rawFileName || ep.name);
                            episodes.push({
                                name: episodeName,
                                playId: buildPanEpisodePlayId(normalizeShareUrl(shareUrl), fileId, {
                                    mode: "pan-file",
                                    shareUrl: normalizeShareUrl(shareUrl),
                                    fileId,
                                    flag: sourceName,
                                    name: episodeName,
                                    vodName: name,
                                    vodId: videoId
                                })
                            });
                        }
                        logInfo("detail UC 网盘通过采集线路解析成功", { sourceName, href, shareUrl, episodeCount: videoList.length });
                        found = true;
                        break;
                    } else {
                        logInfo("detail UC 网盘通过采集线路解析无文件", { sourceName, href, shareUrl });
                    }
                }
                if (!found) {
                    logInfo("detail UC 网盘未能提取有效分享链接", { sourceName, href });
                }
            }
            if (episodes.length) {
                netdiskSources.push({ name: sourceName, episodes });
            } else {
                logInfo("detail UC 网盘解析失败，已排除", { sourceName });
            }
        }
        const collectSources = allCollectSources.filter((source) => {
            const normName = normalizePanSourceName(source?.name || "");
            // 已经在 netdiskSources 中的（已展开）
            if (parsedNetdiskSourceNames.has(normName)) return false;
            // 已经在 UC 处理后加入 netdiskSources 的也排除
            if (netdiskSources.some((s) => normalizePanSourceName(s.name) === normName)) return false;
            return true;
        });
        if (allCollectSources.length !== collectSources.length) {
            logInfo("detail 移除未展开或不支持的网盘线路", {
                videoId,
                removed: allCollectSources.length - collectSources.length,
                parsedNetdiskSources: Array.from(parsedNetdiskSourceNames).join(" | ")
            });
        }
        const sortedNetdiskSources = sortPlaySourcesByDriveOrder(netdiskSources);
        const expandedNetdiskSources = expandPanSourcesWithRoutes(sortedNetdiskSources, context?.from || "web");


        // --------- Unified scraping logic (replace previous per-source buckets) ---------
        // 1️⃣ 把所有已经展开的网盘线路（netdiskSources）和普通采集线路（collectSources）统一放进 allSources
        const allSources = [];
        // 2️⃣ 为每条 episode 计算唯一的 fid（shareUrl|fileId），并收集成一次性刮削候选列表
        const scrapeCandidates = [];
        // ---- 处理已展开的网盘线路 ----
        for (const src of netdiskSources) {
            if (Array.isArray(src?.episodes) && src.episodes.length) {
                src.episodes = src.episodes.map((ep) => {
                    const meta = decodeCombinedPlayId(ep.playId || "")?.meta || {};
                    const shareUrl = String(meta.shareUrl || meta.shareURL || "").trim();
                    const fileId = String(meta.fileId || meta.fid || "").trim();
                    const fid = shareUrl && fileId ? `${shareUrl}|${fileId}` : (fileId || ep.playId);
                    ep._fid = fid;
                    return ep;
                });
                allSources.push(src);
                for (const ep of src.episodes) {
                    if (!ep._fid) continue;
                    scrapeCandidates.push({
                        fid: ep._fid,
                        file_id: ep._fid,
                        file_name: ep.name || "正片",
                        name: ep.name || "正片",
                        format_type: "video",
                    });
                }
            }
        }
        // ---- 处理普通采集线路（如果有展开文件） ----
        for (const src of collectSources) {
            if (Array.isArray(src?.episodes) && src.episodes.length) {
                src.episodes = src.episodes.map((ep) => {
                    const meta = decodeCombinedPlayId(ep.playId || "")?.meta || {};
                    const shareUrl = String(meta.shareUrl || meta.shareURL || "").trim();
                    const fileId = String(meta.fileId || meta.fid || "").trim();
                    const fid = shareUrl && fileId ? `${shareUrl}|${fileId}` : (fileId || ep.playId);
                    ep._fid = fid;
                    return ep;
                });
                allSources.push(src);
                for (const ep of src.episodes) {
                    if (!ep._fid) continue;
                    scrapeCandidates.push({
                        fid: ep._fid,
                        file_id: ep._fid,
                        file_name: ep.name || "正片",
                        name: ep.name || "正片",
                        format_type: "video",
                    });
                }
            }
        }
        logInfo("detail 刮削候选", {
            videoId,
            count: scrapeCandidates.length,
            preview: scrapeCandidates.slice(0, 3).map((i) => `${String(i.fid || "").split("|").slice(-1)[0] || "unknown"}=>${i.file_name}`).join(" | ")
        });
        // --------- 一次统一刮削 ---------
        let scrapeData = null;
        let videoMappings = [];
        if (scrapeCandidates.length) {
            const keyword = normalizeText(name || "");
            try {
                await OmniBox.processScraping(videoId, keyword, keyword, scrapeCandidates);
                const metadata = await OmniBox.getScrapeMetadata(videoId);
                scrapeData = metadata?.scrapeData || null;
                videoMappings = Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [];
                logInfo("detail 刮削完成", { videoId, keyword, mappings: videoMappings.length });
            } catch (e) {
                logInfo("detail 刮削失败", { videoId, error: e.message });
            }
        } else {
            logInfo("detail 刮削候选为空，跳过刮削", { videoId });
        }
        // --------- 将刮削映射回填到每条 episode 上，并在回填后按集数排序 ---------
        const mappingMap = new Map();
        for (const mapping of videoMappings) {
            if (!mapping || typeof mapping !== "object") continue;
            const keys = [mapping.fileId, mapping.file_id, mapping.fid]
                .map((item) => String(item || "").trim())
                .filter(Boolean);
            for (const key of keys) {
                if (!mappingMap.has(key)) {
                    mappingMap.set(key, mapping);
                }
            }
        }
        for (const src of allSources) {
            for (const ep of src.episodes || []) {
                const fid = String(ep?._fid || "").trim();
                if (!fid) continue;
                const mapping = mappingMap.get(fid);
                const fidLog = fid.split("|").slice(-1)[0] || fid;
                if (!mapping) {
                    logInfo("detail 分集未命中刮削映射", { fid: fidLog, episodeName: ep.name });
                    continue;
                }
                const oldName = ep.name || "";
                const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
                if (newName && newName !== oldName) {
                    ep.name = newName;
                    logInfo("detail 应用刮削分集名", { fid: fidLog, from: oldName, to: newName });
                }
                const decoded = decodeCombinedPlayId(ep.playId || "");
                const meta = decoded?.meta || {};
                meta.fid = fid;
                meta.e = ep.name;
                meta.sid = meta.sid || videoId;
                meta.vodId = meta.vodId || videoId;
                meta.vodName = meta.vodName || name;
                if (mapping.seasonNumber !== undefined && mapping.seasonNumber !== null) meta.s = mapping.seasonNumber;
                if (mapping.episodeNumber !== undefined && mapping.episodeNumber !== null) meta.n = mapping.episodeNumber;
                ep.playId = `${decoded?.main || ""}|||${encodePlayId(meta)}`;
            }
            if (Array.isArray(src.episodes)) {
                src.episodes = sortEpisodesByMeta(src.episodes);
            }
        }

        // --------- 合并并去重所有来源 ---------
        const mergedPlaySourcesMap = new Map();
        for (const src of allSources) {
            const sourceName = String(src?.name || "").trim();
            if (!sourceName) continue;
            if (!mergedPlaySourcesMap.has(sourceName)) {
                mergedPlaySourcesMap.set(sourceName, { name: sourceName, episodes: [] });
            }
            const target = mergedPlaySourcesMap.get(sourceName);
            const seen = new Set(target.episodes.map((e) => e.playId));
            for (const ep of src.episodes || []) {
                if (!ep.playId || seen.has(ep.playId)) continue;
                target.episodes.push(ep);
                seen.add(ep.playId);
            }
            target.episodes = sortEpisodesByMeta(target.episodes);
        }
        const vod_play_sources = Array.from(mergedPlaySourcesMap.values()).filter((s) => s.episodes && s.episodes.length);

        // --------- 排序并展开线路（保持原有的 drive 排序、路由逻辑） ---------
        const sortedFinalPlaySources = sortPlaySourcesByDriveOrder(vod_play_sources);
        const expandedFinalPlaySources = expandPanSourcesWithRoutes(sortedFinalPlaySources, context?.from || "web");

        // --------- 刮削详情回填 ---------
        let finalName = name;
        let finalPoster = poster;
        let finalTypeName = typeName;
        let finalYear = year;
        let finalArea = area;
        let finalActor = actor;
        let finalDirector = director;
        let finalIntro = intro;
        let finalScore = score.replace(/分$/, "");
        const finalRemarks = stripTags(remarks);
        let finalVodClass = "";

        if (scrapeData && typeof scrapeData === "object") {
            if (scrapeData.title) {
                finalName = String(scrapeData.title).trim() || finalName;
            }
            if (scrapeData.posterPath) {
                finalPoster = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
            }
            const releaseDate = String(scrapeData.releaseDate || scrapeData.release_date || scrapeData.firstAirDate || scrapeData.first_air_date || scrapeData.seasonAirYear || "").trim();
            if (releaseDate) {
                finalYear = releaseDate.slice(0, 4) || finalYear;
            }
            if (scrapeData.overview) {
                finalIntro = String(scrapeData.overview).trim() || finalIntro;
            }
            const voteAverage = Number(scrapeData.voteAverage ?? scrapeData.vote_average);
            if (Number.isFinite(voteAverage) && voteAverage > 0) {
                finalScore = voteAverage.toFixed(1);
            }
            const genreNames = Array.isArray(scrapeData.genres)
                ? scrapeData.genres.map((item) => item?.name).filter(Boolean)
                : [];
            if (genreNames.length) {
                finalTypeName = genreNames.join("/") || finalTypeName;
                finalVodClass = genreNames.join(",");
            }
            const actorNames = Array.isArray(scrapeData.credits?.cast)
                ? scrapeData.credits.cast.slice(0, 5).map((item) => item?.name || item?.character || "").filter(Boolean)
                : [];
            if (actorNames.length) {
                finalActor = actorNames.join(",");
            } else if (scrapeData.actors) {
                finalActor = String(scrapeData.actors).trim() || finalActor;
            }
            const directorNames = Array.isArray(scrapeData.credits?.crew)
                ? scrapeData.credits.crew
                    .filter((item) => item?.job === "Director" || item?.department === "Directing")
                    .slice(0, 3)
                    .map((item) => item?.name || "")
                    .filter(Boolean)
                : [];
            if (directorNames.length) {
                finalDirector = directorNames.join(",");
            } else if (scrapeData.director) {
                finalDirector = String(scrapeData.director).trim() || finalDirector;
            }
            const areaNames = [
                ...(Array.isArray(scrapeData.productionCountries) ? scrapeData.productionCountries.map((item) => item?.name) : []),
                ...(Array.isArray(scrapeData.originCountry) ? scrapeData.originCountry : []),
                ...(Array.isArray(scrapeData.origin_country) ? scrapeData.origin_country : []),
            ].map((item) => String(item || "").trim()).filter(Boolean);
            if (areaNames.length) {
                finalArea = Array.from(new Set(areaNames)).slice(0, 3).join("/");
            }
        }

        // --------- 构建最终返回结构（不再使用 _play_sources_for_scrape） ---------
        const result = {
            list: [{
                vod_id: videoId,
                vod_name: finalName,
                vod_pic: finalPoster,
                type_name: finalTypeName,
                vod_class: finalVodClass,
                vod_year: finalYear,
                vod_area: finalArea,
                vod_actor: finalActor,
                vod_director: finalDirector,
                vod_content: finalIntro,
                vod_douban_score: finalScore,
                vod_remarks: finalRemarks,
                vod_play_sources: expandedFinalPlaySources
            }]
        };
        const vod = result.list?.[0];
        if (vod) {
            Object.assign(vod, buildLegacyPlayFields(vod.vod_play_sources || []));
        }
        logInfo("detail 完成", {
            videoId,
            sourceCount: vod_play_sources.length,
            episodeCount: vod_play_sources.reduce((n, item) => n + item.episodes.length, 0),
            scraped: !!scrapeData,
            actor: finalActor,
            director: finalDirector
        });
        return result;
    } catch (error) {
        logError("detail 失败", error);
        return { list: [] };
    }
}

async function search(params, context) {
    const keyword = String(params?.keyword || "").trim();
    const page = Number(params?.page || 1);
    if (!keyword) return emptyPage(page);
    try {
        const path = buildSearchPath(keyword, page);
        logInfo("search 请求", { keyword, page, host: getCurrentHost(), path, quick: params?.quick ? 1 : 0, from: context?.from || "web" });
        const html = await fetchHtml(path, { ttl: SEARCH_CACHE_TTL });
        const list = parseVodList(html);
        const pagecount = list.length === DEFAULT_PAGE_SIZE ? page + 1 : page;
        logInfo("search 完成", { keyword, page, listCount: list.length, pagecount });
        return {
            page,
            pagecount,
            total: list.length + (pagecount > page ? DEFAULT_PAGE_SIZE : 0),
            limit: DEFAULT_PAGE_SIZE,
            list
        };
    } catch (error) {
        logError("search 失败", error);
        return emptyPage(page);
    }
}

async function play(params, context) {
    const flag = String(params?.flag || "LIBVIO");
    const playId = String(params?.playId || "").trim();
    if (!playId) return emptyPlay(flag);
    try {
        const { main: rawPlayId, meta } = decodeCombinedPlayId(playId);
        const playPageUrl = resolveCollectPlayPageUrl(rawPlayId, meta);
        const playFlag = String(meta.flag || flag || "LIBVIO");
        if (!playPageUrl) {
            logInfo("play 无法解析播放页地址", { rawPlayId, flag: playFlag, meta });
            return emptyPlay(playFlag);
        }

        if (meta.mode === "pan-file") {
            const shareURL = normalizeShareUrl(meta.shareUrl || "");
            const fileId = String(meta.fileId || "");
            const routeType = String(meta.routeType || "").trim() || (context?.from === "web" ? "服务端代理" : "直连");
            if (shareURL && fileId) {
                const playInfoPromise = OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);
                const metadataPromise = (async () => {
                    const result = {
                        danmakuList: [],
                        scrapeTitle: "",
                        scrapePic: "",
                        episodeNumber: meta?.n ?? null,
                        episodeName: meta?.name || meta?.e || "",
                    };
                    if (!meta?.fid || typeof OmniBox.getScrapeMetadata !== "function") {
                        logInfo("play 网盘增强链路跳过", { shareURL, fid: meta?.fid || "" });
                        return result;
                    }
                    try {
                        const metadata = await OmniBox.getScrapeMetadata(String(meta.sid || meta.vodId || ""));
                        if (!metadata || !metadata.scrapeData) {
                            logInfo("play 网盘增强链路跳过: metadata 不完整", { shareURL, vodId: meta.sid || meta.vodId || "" });
                            return result;
                        }
                        result.scrapeTitle = metadata.scrapeData.title || "";
                        if (metadata.scrapeData.posterPath) {
                            result.scrapePic = `https://image.tmdb.org/t/p/w500${metadata.scrapeData.posterPath}`;
                        }
                        const mappings = Array.isArray(metadata.videoMappings) ? metadata.videoMappings : [];
                        const mapping = mappings.find((item) => item?.fileId === meta.fid);
                        if (mapping) {
                            result.episodeName = buildScrapedEpisodeName(metadata.scrapeData, mapping, result.episodeName || meta.name || "");
                            if (mapping.episodeNumber !== undefined && mapping.episodeNumber !== null) {
                                result.episodeNumber = mapping.episodeNumber;
                            }
                        }
                        const fileName = buildDanmakuFileName(result.scrapeTitle || meta.vodName || "", result.episodeName || meta.name || "");
                        if (fileName && typeof OmniBox.getDanmakuByFileName === "function") {
                            const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
                            if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
                                result.danmakuList = matchedDanmaku;
                            }
                            logInfo("play 网盘弹幕匹配", { fileName, count: Array.isArray(matchedDanmaku) ? matchedDanmaku.length : 0 });
                        }
                    } catch (error) {
                        logInfo("play 网盘增强链路失败", { shareURL, error: error.message });
                    }
                    return result;
                })();
                const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);
                if (playInfoResult.status === "fulfilled") {
                    const playInfo = playInfoResult.value || {};
                    const urlList = Array.isArray(playInfo?.url) ? playInfo.url : [];
                    const metadataValue = metadataResult.status === "fulfilled" ? metadataResult.value : {};
                    const danmakuList = metadataValue?.danmakuList?.length ? metadataValue.danmakuList : (playInfo?.danmaku || []);
                    if (meta?.fid && context?.sourceId && typeof OmniBox.addPlayHistory === "function") {
                        const historyPayload = {
                            vodId: String(meta.sid || meta.vodId || ""),
                            title: metadataValue?.scrapeTitle || meta.vodName || meta.name || "LIBVIO视频",
                            pic: metadataValue?.scrapePic || "",
                            episode: buildHistoryEpisode(playId, metadataValue?.episodeNumber, metadataValue?.episodeName || meta.name || meta.e || ""),
                            sourceId: context.sourceId,
                            episodeNumber: metadataValue?.episodeNumber,
                            episodeName: metadataValue?.episodeName || meta.name || meta.e || "",
                        };
                        OmniBox.addPlayHistory(historyPayload).then((added) => {
                            OmniBox.log("info", `[LIBVIO] play 网盘播放记录${added ? "已添加" : "已存在"}: ${historyPayload.title}`);
                        }).catch((error) => {
                            OmniBox.log("info", `[LIBVIO] play 网盘添加播放记录失败: ${error.message}`);
                        });
                    }
                    return {
                        urls: urlList.map((item) => ({ name: item.name || meta.name || "播放", url: item.url })),
                        header: playInfo?.header || {},
                        parse: 0,
                        danmaku: danmakuList};
                }
                logInfo("play 网盘直取失败", { shareURL, fileId, routeType, error: playInfoResult.reason?.message || String(playInfoResult.reason || "") });
                return {
                    parse: 0,
                    urls: [{ name: meta.name || "网盘资源", url: `push://${shareURL}` }]
                };
            }
        }

        const sniffHeaders = {
            Referer: `${getCurrentHost()}/`,
            Origin: getCurrentHost(),
            "User-Agent": UA
        };
        const playInfoPromise = (async () => {
            const cacheKey = buildCacheKey("libvio:play", playPageUrl, playFlag, context?.from || "web");
            return await getCachedJson(cacheKey, PLAY_CACHE_TTL, async () => {
                logInfo("play 请求", { playPageUrl, flag: playFlag, from: context?.from || "web" });
                const html = await fetchHtml(playPageUrl, { ttl: PLAY_CACHE_TTL });
                const playerJson = html.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})<\/script>/)?.[1];
                if (!playerJson) {
                    logInfo("play 未找到 player_aaaa", { playPageUrl });
                    return {
                        parse: 1,
                        header: sniffHeaders,
                        urls: [{ name: meta.name || "播放", url: playPageUrl }],
                        danmaku: []
                    };
                }

                const player = JSON.parse(playerJson);
                const realUrl = buildPlayUrl(decodePlayerUrl(player.url, player.encrypt));
                if (realUrl && isDirectMediaUrl(realUrl)) {
                    logInfo("play 直链完成", { playPageUrl, from: player.from, finalUrl: realUrl });
                    return {
                        parse: 0,
                        header: sniffHeaders,
                        urls: [{ name: meta.name || "播放", url: realUrl }],
                        danmaku: []
                    };
                }

                const iframeUrl = buildProviderIframeUrl(player);
                const sniffTarget = iframeUrl || playPageUrl;
                try {
                    const sniffResult = await OmniBox.sniffVideo(sniffTarget, sniffHeaders);
                    const sniffUrls = Array.isArray(sniffResult?.urls) ? sniffResult.urls.filter((item) => item?.url) : [];
                    if (!sniffUrls.length && sniffResult?.url) {
                        sniffUrls.push({ name: meta.name || "播放", url: sniffResult.url });
                    }
                    if (sniffUrls.length) {
                        logInfo("play SDK嗅探完成", { playPageUrl, from: player.from, sniffTarget, sniffCount: sniffUrls.length, first: sniffUrls[0] || null });
                        return {
                            parse: 0,
                            header: sniffResult?.header || sniffHeaders,
                            urls: sniffUrls.map((item) => ({ name: item.name || meta.name || "播放", url: item.url })),
                            danmaku: sniffResult?.danmaku || []
                        };
                    }
                    logInfo("play SDK嗅探无结果", { playPageUrl, from: player.from, sniffTarget, sniffResult: sniffResult || null });
                } catch (sniffError) {
                    logInfo("play SDK嗅探失败", { playPageUrl, from: player.from, sniffTarget, error: sniffError.message });
                }

                logInfo("play 使用嗅探兜底", { playPageUrl, decodedUrl: realUrl, iframeUrl, sniffTarget });
                return {
                    parse: 1,
                    header: sniffHeaders,
                    urls: [{ name: meta.name || "播放", url: sniffTarget }],
                    danmaku: []
                };
            });
        })();

        const metadataPromise = (async () => {
            const result = {
                danmakuList: [],
                scrapeTitle: "",
                scrapePic: "",
                episodeNumber: meta?.n ?? null,
                episodeName: meta?.e || meta?.name || "",
            };
            if (!meta?.fid || !meta?.sid || typeof OmniBox.getScrapeMetadata !== "function") {
                logInfo("play 播放增强链路跳过", { fid: meta?.fid || "", sid: meta?.sid || "" });
                return result;
            }
            try {
                const metadata = await OmniBox.getScrapeMetadata(String(meta.sid || ""));
                if (!metadata || !metadata.scrapeData) {
                    logInfo("play 播放增强链路跳过: metadata 不完整", { videoId: meta.sid || "" });
                    return result;
                }
                result.scrapeTitle = metadata.scrapeData.title || "";
                if (metadata.scrapeData.posterPath) {
                    result.scrapePic = `https://image.tmdb.org/t/p/w500${metadata.scrapeData.posterPath}`;
                }
                const mappings = Array.isArray(metadata.videoMappings) ? metadata.videoMappings : [];
                logInfo("play 播放增强元数据", { videoId: meta.sid || "", mappings: mappings.length, fid: meta.fid });
                const mapping = mappings.find((item) => item?.fileId === meta.fid);
                if (mapping) {
                    result.episodeName = buildScrapedEpisodeName(metadata.scrapeData, mapping, result.episodeName || meta.name || "");
                    if (mapping.episodeNumber !== undefined && mapping.episodeNumber !== null) {
                        result.episodeNumber = mapping.episodeNumber;
                    }
                } else if (mappings.length > 0) {
                    logInfo("play 播放增强未命中 mapping", { expected: meta.fid, preview: mappings.slice(0, 2).map((item) => `${item?.fileId || "<empty>"}=>${item?.episodeName || ""}`).join(" | ") });
                }
                const fileName = buildDanmakuFileName(result.scrapeTitle || meta.v || "", result.episodeName || meta.name || "");
                if (fileName && typeof OmniBox.getDanmakuByFileName === "function") {
                    const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
                    const count = Array.isArray(matchedDanmaku) ? matchedDanmaku.length : 0;
                    logInfo("play 弹幕匹配", { fileName, count });
                    if (count > 0) {
                        result.danmakuList = matchedDanmaku;
                    }
                }
            } catch (error) {
                logInfo("play 读取刮削元数据失败", { error: error.message, videoId: meta.sid || "" });
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
        let episodeNumber = meta?.n ?? null;
        let episodeName = meta?.e || meta?.name || "";
        if (metadataResult.status === "fulfilled" && metadataResult.value) {
            danmakuList = metadataResult.value.danmakuList || [];
            scrapeTitle = metadataResult.value.scrapeTitle || "";
            scrapePic = metadataResult.value.scrapePic || "";
            if (metadataResult.value.episodeNumber !== undefined && metadataResult.value.episodeNumber !== null) {
                episodeNumber = metadataResult.value.episodeNumber;
            }
            episodeName = metadataResult.value.episodeName || episodeName;
        } else if (metadataResult.status === "rejected") {
            logInfo("play 播放增强链路失败(不影响播放)", { error: metadataResult.reason?.message || String(metadataResult.reason || "") });
        }
        if (danmakuList.length > 0) {
            playResult.danmaku = danmakuList;
        }
        if (meta?.fid && context?.sourceId && typeof OmniBox.addPlayHistory === "function") {
            const historyPayload = {
                vodId: String(meta.sid || ""),
                title: scrapeTitle || meta.v || meta.name || "LIBVIO视频",
                pic: scrapePic || "",
                episode: buildHistoryEpisode(playId, episodeNumber, episodeName),
                sourceId: context.sourceId,
                episodeNumber,
                episodeName: episodeName || "",
            };
            OmniBox.addPlayHistory(historyPayload)
                .then((added) => {
                    OmniBox.log("info", `[LIBVIO] play 已${added ? "添加" : "跳过"}播放记录: ${historyPayload.title}`);
                })
                .catch((error) => {
                    OmniBox.log("info", `[LIBVIO] play 添加播放记录失败: ${error.message}`);
                });
        } else {
            logInfo("play 跳过播放记录", { sourceId: context?.sourceId || "", fid: meta?.fid || "", hasApi: typeof OmniBox.addPlayHistory === "function" });
        }
        return playResult;
    } catch (error) {
        logError("play 失败", error);
        return emptyPlay(flag);
    }
}

});
