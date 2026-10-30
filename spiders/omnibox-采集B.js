// @name 影视采集B(合并13源)
// @version 2.20261030.3
// @description 自动同步：采集聚合
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-采集B.js
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

_load(1, "乌云影视", function (module, exports, require) {
// @name 乌云影视
// @author 梦
// @description 刮削：未接入，弹幕：站内弹幕接口，嗅探：不需要
// @dependencies
// @version 1.1.2
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/乌云影视.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const SITE = "https://wooyun.tv";
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_HOME_LIMIT = 12;

const SORT_OPTIONS = [
  { name: "默认", value: "default" },
  { name: "最新", value: "latest" },
  { name: "最热", value: "hot" },
  { name: "评分", value: "score" },
];

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

async function home(params, context) {
  try {
    await logInfo(`[home] params=${safeJson(params)} from=${context?.from || "web"}`);

    const [menu, homeBlocks] = await Promise.all([
      fetchJson("/movie/category/menu"),
      fetchJson(`/movie/media/home/custom/classify/1/3?limit=${DEFAULT_HOME_LIMIT}`),
    ]);

    const classes = buildClasses(menu);
    const list = extractHomeList(homeBlocks).slice(0, DEFAULT_HOME_LIMIT).map(mapVod);
    const filters = buildFilters(menu, classes);

    await logInfo(`[home] class=${classes.length} list=${list.length}`);
    return { class: classes, filters, list };
  } catch (error) {
    await logError(`[home] 失败: ${error.message}`);
    return { class: [], filters: {}, list: [] };
  }
}

async function category(params, context) {
  try {
    const categoryId = String(params?.categoryId || "movie");
    const page = Number(params?.page || 1);
    const filters = params?.filters || {};
    await logInfo(`[category] categoryId=${categoryId} page=${page} filters=${safeJson(filters)} from=${context?.from || "web"}`);

    const body = buildCategoryBody(categoryId, page, filters);
    const data = await postJson("/movie/media/search", body);
    const list = ensureArray(data?.records).map(mapVod);
    const total = Number(data?.total || 0);
    const pagecount = Number(data?.pages || Math.ceil(total / DEFAULT_PAGE_SIZE) || (list.length ? page : 0));
    const currentFilters = buildCategoryReturnFilters(categoryId, filters);

    await logInfo(`[category] total=${total} pagecount=${pagecount} list=${list.length}`);
    return {
      page,
      pagecount,
      total,
      filters: currentFilters,
      list,
    };
  } catch (error) {
    await logError(`[category] 失败: ${error.message}`);
    return { page: Number(params?.page || 1), pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const videoId = String(params?.videoId || "").trim();
    if (!videoId) return { list: [] };

    await logInfo(`[detail] videoId=${videoId} from=${context?.from || "web"}`);
    const [baseDetail, detailData, seasonData] = await Promise.all([
      fetchJson(`/movie/media/base/detail?mediaId=${encodeURIComponent(videoId)}`),
      fetchJson(`/movie/media/detail?mediaId=${encodeURIComponent(videoId)}`),
      fetchJson(`/movie/media/video/list?mediaId=${encodeURIComponent(videoId)}&lineName=&resolutionCode=`),
    ]);

    const detail = detailData || baseDetail || {};
    const seasonList = ensureArray(seasonData);
    const sources = buildPlaySources(seasonList, videoId);

    const vod = {
      vod_id: String(detail.id || videoId),
      vod_name: String(detail.title || ""),
      vod_pic: pickPoster(detail),
      type_id: String(detail.mediaType?.code || ""),
      type_name: String(detail.mediaType?.name || ""),
      vod_remarks: String(detail.episodeStatus || ""),
      vod_year: stringify(detail.releaseYear),
      vod_area: String(detail.region || ""),
      vod_actor: joinText(detail.actors),
      vod_director: joinText(detail.directors),
      vod_content: String(detail.overview || detail.description || ""),
      vod_douban_score: stringify(detail.rating),
      vod_play_sources: sources,
    };

    await logInfo(`[detail] sources=${sources.length} episodes=${sources.reduce((n, item) => n + ensureArray(item.episodes).length, 0)}`);
    return { list: [vod] };
  } catch (error) {
    await logError(`[detail] 失败: ${error.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params?.keyword || "").trim();
    const page = Number(params?.page || 1);
    if (!keyword) return emptyPage(page);

    await logInfo(`[search] keyword=${keyword} page=${page} quick=${params?.quick ? 1 : 0} from=${context?.from || "web"}`);
    const data = await postJson("/movie/media/search", {
      menuCodeList: [],
      pageIndex: String(page),
      pageSize: DEFAULT_PAGE_SIZE,
      searchKey: keyword,
      sortCode: "",
      topCode: "",
    });

    const list = ensureArray(data?.records).map(mapVod);
    const total = Number(data?.total || 0);
    const pagecount = Number(data?.pages || Math.ceil(total / DEFAULT_PAGE_SIZE) || (list.length ? page : 0));

    await logInfo(`[search] total=${total} pagecount=${pagecount} list=${list.length}`);
    return {
      page,
      pagecount,
      total,
      list,
    };
  } catch (error) {
    await logError(`[search] 失败: ${error.message}`);
    return emptyPage(Number(params?.page || 1));
  }
}

async function play(params, context) {
  try {
    const playId = String(params?.playId || "").trim();
    const flag = String(params?.flag || "乌云影视");
    if (!playId) return emptyPlay(flag);

    await logInfo(`[play] playId=${playId} flag=${flag} from=${context?.from || "web"}`);
    const payload = decodePlayId(playId);
    const mediaId = payload.mediaId;
    const videoId = payload.videoId;
    const seasonNo = payload.seasonNo;
    const epNo = payload.epNo;
    const directUrl = payload.playUrl;

    let finalUrl = directUrl;
    if (!finalUrl && mediaId) {
      const seasonData = await fetchJson(`/movie/media/video/list?mediaId=${encodeURIComponent(mediaId)}&lineName=&resolutionCode=`);
      finalUrl = findPlayUrl(ensureArray(seasonData), { videoId, seasonNo, epNo });
    }

    if (!finalUrl) {
      await logWarn(`[play] 未找到播放地址 playId=${playId}`);
      return emptyPlay(flag);
    }

    await logInfo(`[play] resolved=${finalUrl}`);
    return {
      parse: 0,
      header: {
        Referer: `${SITE}/`,
        Origin: SITE,
        "User-Agent": UA
      },
      urls: [{ name: payload.name || "播放", url: finalUrl }]};
  } catch (error) {
    await logError(`[play] 失败: ${error.message}`);
    return emptyPlay(String(params?.flag || "乌云影视"));
  }
}

function buildClasses(menu) {
  const yearGroup = ensureArray(menu).find((item) => item?.nameEn === "year");
  const yearChildren = ensureArray(yearGroup?.children);
  const lastYear = yearChildren.find((item) => item?.code === "LAST_YEAR");
  const thisYear = yearChildren.find((item) => item?.code === "THIS_YEAR");

  const rootMenus = extractRootMenus(menu);
  const preferredCodes = ["movie", "tv_series", "animation", "variety", "short_drama"];
  const fallbackNames = {
    movie: "电影",
    tv_series: "电视剧",
    animation: "动画",
    variety: "综艺",
    short_drama: "短剧",
  };

  const classes = preferredCodes.map((code) => {
    const found = rootMenus.find((item) => item?.code === code);
    return found
      ? { type_id: String(found.code), type_name: String(found.name || found.nameEn || code) }
      : { type_id: code, type_name: fallbackNames[code] || code };
  });

  if (thisYear) classes.push({ type_id: thisYear.code, type_name: thisYear.name || "今年" });
  if (lastYear) classes.push({ type_id: lastYear.code, type_name: lastYear.name || "去年" });
  return classes;
}

function buildFilters(menu, classes) {
  const optionMap = buildFilterValueMap(menu);
  const result = {};

  for (const cls of ensureArray(classes)) {
    result[String(cls.type_id)] = buildFilterArrayForClass(String(cls.type_id), optionMap);
  }

  return result;
}

function buildFilterArrayForClass(categoryId, optionMap) {
  const list = [];

  if (optionMap.year.length) {
    list.push({
      key: "year",
      name: "年份",
      init: "",
      value: [{ name: "全部", value: "" }, ...optionMap.year],
    });
  }

  if (optionMap.region.length) {
    list.push({
      key: "region",
      name: "地区",
      init: "",
      value: [{ name: "全部", value: "" }, ...optionMap.region],
    });
  }

  if (optionMap.genre.length && ["movie", "tv_series", "animation", "variety", "short_drama"].includes(categoryId)) {
    list.push({
      key: "genre",
      name: "类型",
      init: "",
      value: [{ name: "全部", value: "" }, ...optionMap.genre],
    });
  }

  if (optionMap.language.length) {
    list.push({
      key: "lang",
      name: "语言",
      init: "",
      value: [{ name: "全部", value: "" }, ...optionMap.language],
    });
  }

  list.push({
    key: "sort",
    name: "排序",
    init: "default",
    value: SORT_OPTIONS,
  });

  return list;
}

function buildFilterValueMap(menu) {
  const groups = ensureArray(menu);
  const result = {
    genre: [],
    region: [],
    year: [],
    language: [],
    other: [],
  };

  for (const group of groups) {
    const nameEn = String(group?.nameEn || "");
    const values = ensureArray(group?.children)
      .map((item) => ({
        name: String(item?.name || item?.nameEn || item?.code || ""),
        value: String(item?.code || ""),
      }))
      .filter((item) => item.name && item.value && !["THIS_YEAR", "LAST_YEAR"].includes(item.value));

    if (nameEn === "genre") result.genre = values;
    else if (nameEn === "region") result.region = values;
    else if (nameEn === "year") result.year = values;
    else if (nameEn === "language") result.language = values;
    else if (nameEn === "other") result.other = values;
  }

  return result;
}

function buildCategoryBody(categoryId, page, filters) {
  const body = {
    menuCodeList: [],
    pageIndex: String(page),
    pageSize: DEFAULT_PAGE_SIZE,
    searchKey: "",
    sortCode: filters?.sort && filters.sort !== "default" ? String(filters.sort) : "",
    topCode: mapTopCode(categoryId),
  };

  const menuCodeList = [];
  if (!["movie", "tv_series", "animation", "variety", "short_drama"].includes(categoryId)) {
    menuCodeList.push(categoryId);
  }

  for (const item of [filters?.genre, filters?.region, filters?.year, filters?.lang, filters?.other]) {
    if (item && !menuCodeList.includes(String(item))) menuCodeList.push(String(item));
  }

  body.menuCodeList = menuCodeList;
  return body;
}

function buildCategoryReturnFilters(categoryId, filters) {
  return {
    categoryId,
    ...Object.fromEntries(
      Object.entries({
        genre: filters?.genre || "",
        region: filters?.region || "",
        year: filters?.year || "",
        lang: filters?.lang || "",
        other: filters?.other || "",
        sort: filters?.sort || "default",
      }).filter(([, value]) => value !== undefined)
    ),
  };
}

function mapTopCode(categoryId) {
  const topCodeMap = {
    movie: "movie",
    tv_series: "tv_series",
    animation: "animation",
    variety: "variety",
    short_drama: "short_drama",
    THIS_YEAR: "movie",
    LAST_YEAR: "movie",
  };

  return topCodeMap[categoryId] || "movie";
}

function extractRootMenus(menu) {
  if (Array.isArray(menu) && menu.length && menu[0] && Object.prototype.hasOwnProperty.call(menu[0], "code")) {
    return ensureArray(menu).filter((item) => item && typeof item === "object");
  }

  return [];
}

function extractHomeList(homeBlocks) {
  const blocks = ensureArray(homeBlocks?.records || homeBlocks);
  const result = [];
  const seen = new Set();

  for (const block of blocks) {
    for (const item of ensureArray(block?.mediaResources)) {
      const id = String(item?.id || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      result.push(item);
    }
  }

  return result;
}

function buildPlaySources(seasons, mediaId) {
  const seasonList = ensureArray(seasons);
  const multipleSeason = seasonList.length > 1;
  return seasonList
    .map((season, seasonIndex) => {
      const seasonNo = season?.seasonNo ?? seasonIndex + 1;
      const videoList = ensureArray(season?.videoList);
      const episodes = videoList.map((video, videoIndex) => {
        const epNo = Number(video?.epNo ?? videoIndex + 1);
        const name = formatEpisodeName(video, videoIndex, multipleSeason);
        return {
          name,
          playId: encodePlayId({
            mediaId,
            seasonNo,
            epNo,
            videoId: video?.id,
            playUrl: video?.playUrl,
            name,
          }),
        };
      });

      return {
        name: multipleSeason ? `第${seasonNo}季` : (season?.lineName || season?.title || "乌云影视"),
        episodes,
      };
    })
    .filter((item) => item.episodes.length > 0);
}

function formatEpisodeName(video, index, multipleSeason) {
  const epNo = Number(video?.epNo ?? index + 1);
  const remark = String(video?.remark || "").trim();
  if (epNo <= 0) return remark || "正片";
  const prefix = multipleSeason ? `第${epNo}集` : `第${epNo}集`;
  return remark ? `${prefix} ${remark}` : prefix;
}

function mapVod(item) {
  return {
    vod_id: String(item?.id || ""),
    vod_name: String(item?.title || ""),
    vod_pic: pickPoster(item),
    type_id: String(item?.mediaType?.code || ""),
    type_name: String(item?.mediaType?.name || ""),
    vod_remarks: String(item?.episodeStatus || item?.remark || ""),
    vod_year: stringify(item?.releaseYear),
    vod_douban_score: stringify(item?.rating),
    vod_actor: joinText(item?.actors),
    vod_director: joinText(item?.directors),
  };
}

function pickPoster(item) {
  return String(item?.posterUrlS3 || item?.posterUrl || item?.thumbUrlS3 || item?.thumbUrl || "");
}

function findPlayUrl(seasons, target) {
  for (const season of ensureArray(seasons)) {
    if (target?.seasonNo != null && Number(season?.seasonNo) !== Number(target.seasonNo)) continue;
    for (const video of ensureArray(season?.videoList)) {
      if (target?.videoId != null && Number(video?.id) === Number(target.videoId)) return String(video?.playUrl || "");
      if (target?.epNo != null && Number(video?.epNo) === Number(target.epNo)) return String(video?.playUrl || "");
    }
  }

  const firstSeason = ensureArray(seasons)[0];
  const firstVideo = ensureArray(firstSeason?.videoList)[0];
  return String(firstVideo?.playUrl || "");
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchJson(path) {
  const url = path.startsWith("http") ? path : `${SITE}${path}`;
  const res = await OmniBox.request(url, {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      Referer: `${SITE}/`,
      Origin: SITE,
      "User-Agent": UA,
    },
  });

  if (res.statusCode !== 200) {
    throw new Error(`GET ${path} => HTTP ${res.statusCode}`);
  }

  const json = JSON.parse(res.body || "{}");
  if (json && json.code && json.code !== 200 && json.isSuccess === false) {
    throw new Error(`GET ${path} => ${json.resultMsg || json.code}`);
  }

  return json?.data;
}

async function postJson(path, body) {
  const url = `${SITE}${path}`;
  const res = await OmniBox.request(url, {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      Referer: `${SITE}/`,
      Origin: SITE,
      "User-Agent": UA,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.statusCode !== 200) {
    throw new Error(`POST ${path} => HTTP ${res.statusCode}`);
  }

  const json = JSON.parse(res.body || "{}");
  if (json && json.code && json.code !== 200 && json.isSuccess === false) {
    throw new Error(`POST ${path} => ${json.resultMsg || json.code}`);
  }

  return json?.data;
}

function encodePlayId(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePlayId(playId) {
  try {
    return JSON.parse(Buffer.from(playId, "base64url").toString("utf8"));
  } catch (_) {
    return { mediaId: playId };
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function stringify(value) {
  return value == null ? "" : String(value);
}

function joinText(value) {
  return ensureArray(value).filter(Boolean).join("/");
}

function emptyPage(page) {
  return { page, pagecount: 0, total: 0, list: [] };
}

function emptyPlay(flag) {
  return { parse: 0, urls: [] };
}

function safeJson(value) {
  try {
    return JSON.stringify(value || {});
  } catch (_) {
    return "{}";
  }
}

async function logInfo(msg) {
  await OmniBox.log("info", msg);
}

async function logWarn(msg) {
  await OmniBox.log("warn", msg);
}

async function logError(msg) {
  await OmniBox.log("error", msg);
}

});

_load(2, "太二影视", function (module, exports, require) {
// @name 太二影视
// @description 太二追剧页面解析，支持首页、分类、搜索、详情、多线路播放和嗅探兜底
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/太二影视.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const HOST = String(process.env.TAI2_HOST || "https://v.tai2.lol").replace(/\/+$/, "");
const UA = "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  Referer: `${HOST}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9",
};
const CLASS_LIST = [
  { type_id: "21", type_name: "剧集" },
  { type_id: "22", type_name: "综艺" },
];

module.exports = { home, category, search, detail, play };
runner.run(module.exports);

function getBodyText(response) {
  const body = response && typeof response === "object"
    ? ("body" in response ? response.body : ("data" in response ? response.data : response))
    : response;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return body.toString();
  return String(body || "");
}

async function requestText(url, options = {}) {
  const headers = {
    ...HEADERS,
    ...(options.headers || {}),
    Referer: options.referer || options.headers?.Referer || `${HOST}/`,
  };
  const attempts = options.retries === undefined ? 2 : Math.max(1, Number(options.retries) + 1);
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await OmniBox.request(url, {
        method: options.method || "GET",
        headers,
        timeout: options.timeout || 30000,
        body: options.body,
      });
      const statusCode = Number(response?.statusCode || 200);
      if (statusCode === 520 && attempt + 1 < attempts) continue;
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
  let value = decodeHtml(String(url || "").trim()).replace(/^['"]|['"]$/g, "");
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

function lastCaptured(text, pattern) {
  let value = "";
  let match;
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  while ((match = regex.exec(String(text || ""))) !== null) {
    value = match[1] || "";
    if (!match[0]) regex.lastIndex += 1;
  }
  return value;
}

function parseCards(html) {
  const text = String(html || "");
  const videos = [];
  const seen = new Set();
  const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(text)) !== null) {
    const attrs = match[1] || "";
    const href = getAttribute(attrs, "href");
    const idMatch = href.match(/\/vod\/detail\/id\/(\d+)\.html/i);
    if (!idMatch) continue;
    const videoId = idMatch[1];
    if (seen.has(videoId)) continue;

    const inner = match[2] || "";
    const before = text.slice(Math.max(0, match.index - 700), match.index);
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 700);
    let vodName = cleanText(getAttribute(attrs, "title"));
    if (!vodName) {
      const alt = lastCaptured(inner, /\balt\s*=\s*["']([^"']+)["']/i);
      vodName = cleanText(alt).replace(/封面图$/u, "").trim();
    }
    if (!vodName) {
      const titleMatch = after.match(/class=["'][^"']*time-title[^"']*["'][^>]*[^>]*title=["']([^"']+)["']/i);
      vodName = cleanText(titleMatch ? titleMatch[1] : "");
    }
    if (!vodName) continue;

    let vodPic = lastCaptured(inner, /\bdata-src\s*=\s*["']([^"']+)["']/i);
    if (!vodPic) vodPic = lastCaptured(inner, /\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!vodPic) vodPic = lastCaptured(before, /\bdata-src\s*=\s*["']([^"']+)["']/i);
    const remarkMatch = inner.match(/public-list-prb[^>]*>([\s\S]*?)<\/span>/i)
      || after.match(/public-list-prb[^>]*>([\s\S]*?)<\/span>/i);

    seen.add(videoId);
    videos.push({
      vod_id: videoId,
      vod_name: vodName,
      vod_pic: absUrl(vodPic),
      vod_remarks: cleanText(remarkMatch ? remarkMatch[1] : ""),
    });
  }

  return videos;
}

function extractPeopleBlock(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(
    new RegExp(`<div[^>]*class=["'][^"']*slide-info[^"']*["'][^>]*>[\\s\\S]*?<strong[^>]*>\\s*${escaped}\\s*[：:]?\\s*<\\/strong>([\\s\\S]*?)<\\/div>`, "i"),
  );
  if (!match) return "";
  const names = [];
  const linkRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(match[1])) !== null) {
    const name = cleanText(linkMatch[1]);
    if (name) names.push(name);
  }
  return names.length ? names.join(" ") : cleanText(match[1]);
}

function extractParameter(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(
    new RegExp(`<li[^>]*>[\\s\\S]*?<em[^>]*>\\s*${escaped}\\s*[：:]\\s*<\\/em>([\\s\\S]*?)<\\/li>`, "i"),
  );
  return cleanText(match ? match[1] : "");
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
    const name = cleanText(withoutBadge);
    if (name) sourceNames.push(name);
  }

  const sources = [];
  const listRegex = /<ul\b[^>]*class=["'][^"']*anthology-list-play[^"']*["'][^>]*>([\s\S]*?)<\/ul>/gi;
  let index = 0;
  while ((match = listRegex.exec(text)) !== null) {
    const episodes = [];
    const episodeRegex = /<a\b[^>]*href=["']([^"']*\/vod\/play\/id\/\d+\/sid\/\d+\/nid\/\d+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let episodeMatch;
    while ((episodeMatch = episodeRegex.exec(match[1])) !== null) {
      const name = cleanText(episodeMatch[2]);
      const playId = absUrl(episodeMatch[1]);
      if (name && playId) episodes.push({ name, playId });
    }
    if (episodes.length) sources.push({ name: sourceNames[index] || `线路${index + 1}`, episodes });
    index += 1;
  }
  return sources;
}

function decodePlayerUrl(value, encrypt) {
  let url = String(value || "").replace(/\\\//g, "/");
  try {
    if (String(encrypt) === "1") return decodeURIComponent(url);
    if (String(encrypt) === "2") return decodeURIComponent(Buffer.from(url, "base64").toString("utf8"));
  } catch (_) {}
  return url;
}

function isDirectMedia(url) {
  return /\.(?:m3u8|mp4|flv|mkv)(?:$|[?#])/i.test(String(url || ""));
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

function directPlayResult(url, referer, name = "播放") {
  const header = { "User-Agent": UA, Referer: referer || `${HOST}/` };
  return { parse: 0, jx: 0, url, urls: [{ name, url }], header, headers: header };
}

function browserSniffResult(url, referer, name = "播放页") {
  const header = { "User-Agent": UA, Referer: referer || url || `${HOST}/` };
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
        await OmniBox.log("info", `[太二影视][play] 服务端嗅探成功 urls=${urls.length}`);
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
      await OmniBox.log("warn", "[太二影视][play] 服务端嗅探无结果，转浏览器嗅探");
    } catch (error) {
      await OmniBox.log("warn", `[太二影视][play] 服务端嗅探失败，转浏览器嗅探: ${error.message}`);
    }
  }
  return browserSniffResult(targetUrl, referer, name);
}

async function resolveM3u8Child(url, referer) {
  try {
    const text = await requestText(url, { referer, timeout: 20000, retries: 0 });
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
  let list = [];
  try {
    list = parseCards(await requestText(`${HOST}/`));
  } catch (error) {
    await OmniBox.log("warn", `[太二影视][home] 首页请求失败: ${error.message}`);
  }
  if (!list.length) {
    const results = await Promise.allSettled(CLASS_LIST.map((item) => requestText(`${HOST}/index.php/vod/type/id/${item.type_id}.html`)));
    const seen = new Set();
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const video of parseCards(result.value)) {
        if (seen.has(video.vod_id)) continue;
        seen.add(video.vod_id);
        list.push(video);
      }
    }
  }
  return { class: CLASS_LIST, filters: {}, list: list.slice(0, 72) };
}

async function category(params) {
  const page = Math.max(1, parseInt(params.page || 1, 10));
  try {
    const categoryId = String(params.categoryId || params.type_id || "21").trim() || "21";
    const pagePath = page > 1 ? `/page/${page}` : "";
    const url = `${HOST}/index.php/vod/type/id/${categoryId}${pagePath}.html`;
    const list = parseCards(await requestText(url));
    return { page, pagecount: 1, total: list.length, list };
  } catch (error) {
    await OmniBox.log("error", `[太二影视][category] ${error.message}`);
    return { page, pagecount: 0, total: 0, list: [] };
  }
}

async function search(params) {
  const page = Math.max(1, parseInt(params.page || 1, 10));
  const keyword = String(params.keyword || params.wd || params.key || "").trim();
  if (!keyword) return { page, pagecount: 0, total: 0, list: [] };
  const encoded = encodeURIComponent(keyword);
  const urls = [
    `${HOST}/index.php/vod/search.html?wd=${encoded}&page=${page}`,
    `${HOST}/vodsearch/${encoded}----------${page}.html`,
    `${HOST}/search.html?wd=${encoded}&page=${page}`,
  ];
  for (const url of urls) {
    try {
      const list = parseCards(await requestText(url));
      if (list.length) return { page, pagecount: 1, total: list.length, list };
    } catch (error) {
      await OmniBox.log("warn", `[太二影视][search] ${url} ${error.message}`);
    }
  }
  return { page, pagecount: 0, total: 0, list: [] };
}

async function detail(params) {
  try {
    const input = String(params.videoId || params.id || params.categoryId || "").trim();
    const idMatch = input.match(/\/vod\/detail\/id\/(\d+)\.html/i) || input.match(/^(\d+)$/);
    const videoId = idMatch ? idMatch[1] : "";
    if (!videoId) return { list: [] };
    const html = await requestText(`${HOST}/index.php/vod/detail/id/${videoId}.html`);
    const titleMatch = html.match(/<h3\b[^>]*class=["'][^"']*slide-info-title[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)
      || html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    const picMatch = html.match(/detail-pic[\s\S]*?<img\b[^>]*(?:data-src|src)=["']([^"']+)["']/i);
    const contentMatch = html.match(/id=["']height_limit["'][^>]*>([\s\S]*?)<\/div>/i);
    const remarkMatch = html.match(/slide-info-remarks[^>]*>([\s\S]*?)<\/span>/i);
    const playSources = parsePlaySources(html);

    return {
      list: [{
        vod_id: videoId,
        vod_name: cleanText(titleMatch ? titleMatch[1] : ""),
        vod_pic: absUrl(picMatch ? picMatch[1] : ""),
        type_name: extractPeopleBlock(html, "类型"),
        vod_year: extractParameter(html, "年份") || cleanText((html.match(/vod\/search\/year\/(\d{4})\.html/i) || [])[1] || ""),
        vod_area: extractParameter(html, "地区"),
        vod_remarks: cleanText(remarkMatch ? remarkMatch[1] : ""),
        vod_actor: extractPeopleBlock(html, "演员") || extractParameter(html, "主演"),
        vod_director: extractPeopleBlock(html, "导演") || extractParameter(html, "导演"),
        vod_content: cleanText(contentMatch ? contentMatch[1] : "") || "暂无简介",
        vod_play_sources: playSources,
      }],
    };
  } catch (error) {
    await OmniBox.log("error", `[太二影视][detail] ${error.message}`);
    return { list: [] };
  }
}

async function play(params) {
  const input = String(params.playId || params.id || params.url || params.input || "").trim();
  if (!input) return { parse: 0, jx: 0, url: "", urls: [], header: {}, headers: {} };
  if (isDirectMedia(input)) return directPlayResult(absUrl(input), `${HOST}/`);
  const playUrl = absUrl(input);

  let html = "";
  try {
    html = await requestText(playUrl, { referer: `${HOST}/`, timeout: 30000 });
  } catch (error) {
    await OmniBox.log("warn", `[太二影视][play] 播放页请求失败，尝试嗅探: ${error.message}`);
    return await serverSniffOrBrowserFallback(playUrl, playUrl, "太二播放");
  }

  const playerMatch = html.match(/var\s+player_[a-zA-Z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i)
    || html.match(/var\s+player_[a-zA-Z0-9_$]+\s*=\s*(\{[\s\S]*?\})\s*;/i);
  if (playerMatch) {
    try {
      const playerData = JSON.parse(playerMatch[1]);
      let realUrl = decodePlayerUrl(playerData.url, playerData.encrypt);
      if (isDirectMedia(realUrl)) {
        if (/\.m3u8(?:$|[?#])/i.test(realUrl)) realUrl = await resolveM3u8Child(realUrl, playUrl);
        return directPlayResult(realUrl, playUrl);
      }
      if (realUrl) return await serverSniffOrBrowserFallback(absUrl(realUrl, playUrl), playUrl, playerData.vod_data?.vod_name || "播放");
    } catch (error) {
      await OmniBox.log("warn", `[太二影视][play] player 数据解析失败: ${error.message}`);
    }
  }

  let sniffTarget = playUrl;
  const iframeMatch = html.match(/<iframe\b[^>]*src=["']([^"']+)["']/i);
  if (iframeMatch) {
    const iframeUrl = absUrl(iframeMatch[1], playUrl);
    sniffTarget = iframeUrl || playUrl;
    try {
      const iframeHtml = await requestText(iframeUrl, { referer: playUrl, timeout: 30000, retries: 0 });
      const iframePlayer = iframeHtml.match(/["']url["']\s*:\s*["']([^"']+)["']/i);
      let iframeMedia = decodeHtml(iframePlayer ? iframePlayer[1] : "").replace(/\\\//g, "/");
      if (!iframeMedia) {
        const mediaMatch = iframeHtml.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4|flv|mkv)(?:\?[^"']*)?)["']/i);
        iframeMedia = mediaMatch ? mediaMatch[1] : "";
      }
      if (isDirectMedia(iframeMedia)) {
        if (/\.m3u8(?:$|[?#])/i.test(iframeMedia)) iframeMedia = await resolveM3u8Child(iframeMedia, iframeUrl);
        return directPlayResult(iframeMedia, iframeUrl);
      }
      if (iframeMedia) return await serverSniffOrBrowserFallback(absUrl(iframeMedia, iframeUrl), iframeUrl, "播放");
    } catch (error) {
      await OmniBox.log("warn", `[太二影视][play] iframe 解析失败: ${error.message}`);
    }
  }

  const directMatch = html.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4|flv|mkv)(?:\?[^"']*)?)["']/i);
  if (directMatch) return directPlayResult(directMatch[1].replace(/\\\//g, "/"), playUrl);
  return await serverSniffOrBrowserFallback(sniffTarget, playUrl, "太二播放");
}

});

_load(3, "如意资源", function (module, exports, require) {
// @name 如意资源
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持，类型筛选：支持
// @version 1.0.2
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/如意资源.js

const OmniBox = require("omnibox_sdk");

/**
 * 配置信息
 */
const ruyiConfig = {
  apiUrls: [
    "https://cj.rycjapi.com/api.php/provide/vod",
    "https://cj.rytvapi.com/api.php/provide/vod",
    "https://bycj.rytvapi.com/api.php/provide/vod"
  ],
  imgHosts: ["https://ps.ryzypics.com", "https://ry-pic.com", "https://img.lzzyimg.com"],
  danmuApi: process.env.DANMU_API || "",
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': 'https://cj.rycjapi.com/'
  },
  timeout: 15000,
  batchSize: 20
};

// 硬编码的分类数据
const HARDCODED_CLASSES = [
  { type_id: "1", type_name: "电影片" },
  { type_id: "2", type_name: "连续剧" },
  { type_id: "3", type_name: "综艺片" },
  { type_id: "4", type_name: "动漫片" },
  { type_id: "35", type_name: "电影解说" },
  { type_id: "36", type_name: "体育" }
];

// 硬编码的子分类映射
const HARDCODED_SUB_CLASS_MAP = new Map([
  ["1", ["7", "6", "8", "9", "10", "11", "12", "20", "34", "45", "47"]],  // 电影片
  ["2", ["13", "14", "15", "16", "21", "22", "23", "24", "46"]],           // 连续剧
  ["3", ["25", "26", "27", "28"]],                                          // 综艺片
  ["4", ["29", "30", "31", "32", "33"]],                                    // 动漫片
  ["35", []],  // 电影解说
  ["36", ["37", "38", "39", "40"]]                                          // 体育
]);

// 硬编码的类型选项
const HARDCODED_TYPE_OPTIONS = {
  "1": [  // 电影片
    { name: "动作片", value: "7" },
    { name: "喜剧片", value: "8" },
    { name: "爱情片", value: "9" },
    { name: "科幻片", value: "10" },
    { name: "恐怖片", value: "11" },
    { name: "剧情片", value: "12" },
    { name: "战争片", value: "6" },
    { name: "记录片", value: "20" },
    { name: "伦理片", value: "34" },
    { name: "预告片", value: "45" },
    { name: "动画电影", value: "47" }
  ],
  "2": [  // 连续剧
    { name: "国产剧", value: "13" },
    { name: "香港剧", value: "14" },
    { name: "韩国剧", value: "15" },
    { name: "欧美剧", value: "16" },
    { name: "台湾剧", value: "21" },
    { name: "日本剧", value: "22" },
    { name: "海外剧", value: "23" },
    { name: "泰国剧", value: "24" },
    { name: "短剧", value: "46" }
  ],
  "3": [  // 综艺片
    { name: "大陆综艺", value: "25" },
    { name: "港台综艺", value: "26" },
    { name: "日韩综艺", value: "27" },
    { name: "欧美综艺", value: "28" }
  ],
  "4": [  // 动漫片
    { name: "国产动漫", value: "29" },
    { name: "日韩动漫", value: "30" },
    { name: "欧美动漫", value: "31" },
    { name: "港台动漫", value: "32" },
    { name: "海外动漫", value: "33" }
  ],
  "35": [],  // 电影解说
  "36": [    // 体育
    { name: "足球", value: "37" },
    { name: "篮球", value: "38" },
    { name: "网球", value: "39" },
    { name: "斯诺克", value: "40" }
  ]
};

const PLAY_URL_PATTERNS = [
  (vodId) => `https://www.ryzyw.com/index.php/vod/play/id/${vodId}.html`,
  (vodId) => `https://cj.rycjapi.com/play/${vodId}.html`
];

// ========== 缓存 ==========
let initialized = false;
let classes = null;
let filters = null;
let subClassMap = null;
const detailCache = new Map();

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
  if (data) OmniBox.log("info", `[如意资源] ${message}: ${JSON.stringify(data)}`);
  else OmniBox.log("info", `[如意资源] ${message}`);
};

const logError = (message, error) => {
  OmniBox.log("error", `[如意资源] ${message}: ${error.message || error}`);
};

const logWarn = (message) => {
  OmniBox.log("warn", `[如意资源] ${message}`);
};

/**
 * 元数据编解码
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
 * 发送HTTP请求
 */
async function request(url, options = {}) {
  if (url && url.startsWith('http')) {
    try {
      const response = await OmniBox.request(url, {
        method: options.method || "GET",
        headers: options.headers || ruyiConfig.headers,
        timeout: options.timeout || ruyiConfig.timeout,
        body: options.body
      });
      if (response.statusCode !== 200) throw new Error(`HTTP ${response.statusCode}`);
      return JSON.parse(response.body);
    } catch (error) {
      logError(`请求失败: ${url}`, error);
      throw error;
    }
  }
  
  let lastError = null;
  for (let i = 0; i < ruyiConfig.apiUrls.length; i++) {
    const apiUrl = ruyiConfig.apiUrls[i];
    try {
      let requestUrl = apiUrl;
      if (options.params) {
        const params = new URLSearchParams(options.params);
        requestUrl = `${apiUrl}?${params.toString()}`;
      }
      
      const response = await OmniBox.request(requestUrl, {
        method: options.method || "GET",
        headers: options.headers || ruyiConfig.headers,
        timeout: options.timeout || ruyiConfig.timeout,
        body: options.body
      });
      if (response.statusCode !== 200) throw new Error(`HTTP ${response.statusCode}`);
      const data = JSON.parse(response.body);
      if (i > 0) logInfo(`切换到备用API: ${apiUrl}`);
      return data;
    } catch (error) {
      lastError = error;
      logWarn(`API ${apiUrl} 请求失败: ${error.message}`);
      continue;
    }
  }
  throw lastError || new Error("所有API都请求失败");
}

/**
 * 获取完整图片 URL
 */
const getPicUrl = (path) => {
  if (!path) return '';
  if (path === '<nil>' || path === 'nil' || path === 'null') return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${ruyiConfig.imgHosts[0]}${path}`;
  return path;
};

/**
 * 格式化视频列表数据
 */
const formatList = (data) => {
  if (!Array.isArray(data)) return [];

  return data.filter(i => i && i.vod_id && String(i.vod_id) !== '0').map(i => ({
    vod_id: String(i.vod_id),
    vod_name: i.vod_name || '未知标题',
    vod_pic: '',
    vod_remarks: i.vod_remarks || (i.vod_year ? `${i.vod_year}` : ''),
    vod_year: i.vod_year || '',
    type_id: String(i.type_id || '')
  }));
};

/**
 * 批量获取视频封面
 */
async function batchGetCovers(videoIds) {
  if (!videoIds || videoIds.length === 0) return new Map();
  
  const resultMap = new Map();
  const uncachedIds = [];
  
  for (const id of videoIds) {
    if (detailCache.has(id)) {
      resultMap.set(id, detailCache.get(id));
    } else {
      uncachedIds.push(id);
    }
  }
  
  if (uncachedIds.length === 0) return resultMap;
  
  for (let i = 0; i < uncachedIds.length; i += ruyiConfig.batchSize) {
    const batch = uncachedIds.slice(i, i + ruyiConfig.batchSize);
    try {
      const res = await request('', { params: { ac: 'videolist', ids: batch.join(',') } });
      
      if (Array.isArray(res.list)) {
        for (const item of res.list) {
          if (!item || typeof item !== 'object') continue;
          const vodId = String(item.vod_id);
          
          let pic = '';
          if (item.vod_pic && item.vod_pic !== '<nil>') pic = getPicUrl(item.vod_pic);
          else if (item.vod_img && item.vod_img !== '<nil>') pic = getPicUrl(item.vod_img);
          else if (item.pic && item.pic !== '<nil>') pic = getPicUrl(item.pic);
          
          detailCache.set(vodId, pic);
          resultMap.set(vodId, pic);
        }
      }
    } catch (error) {
      logError(`批量获取封面失败`, error);
    }
  }
  
  return resultMap;
}

/**
 * 补全视频封面
 */
async function enrichCovers(videos) {
  if (!Array.isArray(videos) || videos.length === 0) return videos;
  
  const needCoverIds = [];
  const videoMap = new Map();
  
  for (const video of videos) {
    if (!video.vod_pic || video.vod_pic === '') {
      needCoverIds.push(video.vod_id);
      videoMap.set(video.vod_id, video);
    }
  }
  
  if (needCoverIds.length === 0) return videos;
  
  const coversMap = await batchGetCovers(needCoverIds);
  
  for (const [vodId, pic] of coversMap) {
    const video = videoMap.get(vodId);
    if (video && pic) {
      video.vod_pic = pic;
    }
  }
  
  return videos;
}

/**
 * 解析播放源
 */
const parsePlaySources = (vodItem) => {
  const playSources = [];
  const vodId = vodItem.vod_id;
  const vodName = vodItem.vod_name;
  const playFrom = vodItem.vod_play_from || '默认线路';
  const playUrl = vodItem.vod_play_url || '';
  
  if (playUrl) {
    const episodes = playUrl.split('#').map((item, index) => {
      const parts = item.split('$');
      const episodeName = parts[0] || `第${index + 1}集`;
      const directUrl = parts[1] || '';
      const fid = `${vodId}#${index}`;
      const playMeta = { sid: vodId, fid: fid, v: vodName, e: index + 1, url: directUrl, isDirect: true };
      return {
        name: episodeName,
        playId: `${directUrl}|||${encodeMeta(playMeta)}`,
        _fid: fid,
        _rawName: episodeName
      };
    }).filter(ep => ep.playId);
    
    if (episodes.length > 0) {
      const sources = playFrom.split(',');
      for (const source of sources) {
        playSources.push({ name: source.trim(), episodes: episodes });
      }
    }
  }
  return playSources;
};

async function getPlayPageUrlSmart(vodId) {
  for (const pattern of PLAY_URL_PATTERNS) {
    try {
      const testUrl = pattern(vodId);
      const headResponse = await OmniBox.request(testUrl, { method: 'HEAD', timeout: 3000 }).catch(() => null);
      if (headResponse && headResponse.statusCode === 200) return testUrl;
    } catch (e) {}
  }
  return `https://www.ryzyw.com/index.php/vod/play/id/${vodId}.html`;
}

/* ============================================================================
 * 辅助函数
 * ============================================================================ */

function preprocessTitle(title) {
  if (!title) return "";
  return title.replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]/g, " ")
    .replace(/[hH]\.?26[45]/g, " ")
    .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
    .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ");
}

function chineseToArabic(cn) {
  const map = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
  if (!isNaN(cn)) return parseInt(cn, 10);
  if (cn.length === 1) return map[cn] || cn;
  if (cn.length === 2) {
    if (cn[0] === '十') return 10 + map[cn[1]];
    if (cn[1] === '十') return map[cn[0]] * 10;
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
  return "";
}

function buildFileNameForDanmu(vodName, episodeTitle) {
  if (!vodName) return "";
  if (!episodeTitle || episodeTitle === '正片' || episodeTitle === '播放') return vodName;
  const digits = extractEpisode(episodeTitle);
  if (digits) {
    const epNum = parseInt(digits, 10);
    if (epNum > 0) return epNum < 10 ? `${vodName} S01E0${epNum}` : `${vodName} S01E${epNum}`;
  }
  return vodName;
}

function buildScrapedEpisodeName(scrapeData, mapping, originalName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) return originalName;
  if (mapping.episodeName) return mapping.episodeName;
  if (scrapeData && Array.isArray(scrapeData.episodes)) {
    const hit = scrapeData.episodes.find(ep => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber);
    if (hit?.name) return `${hit.episodeNumber}.${hit.name}`;
  }
  return originalName;
}

function buildScrapedDanmuFileName(scrapeData, scrapeType, mapping, fallbackVodName, fallbackEpisodeName) {
  if (!scrapeData) return buildFileNameForDanmu(fallbackVodName, fallbackEpisodeName);
  if (scrapeType === 'movie') return scrapeData.title || fallbackVodName;
  const title = scrapeData.title || fallbackVodName;
  const seasonAirYear = scrapeData.seasonAirYear || '';
  const seasonNumber = mapping?.seasonNumber || 1;
  const episodeNumber = mapping?.episodeNumber || 1;
  return `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;
}

async function matchDanmu(fileName) {
  if (!ruyiConfig.danmuApi || !fileName) return [];
  try {
    const matchUrl = `${ruyiConfig.danmuApi}/api/v2/match`;
    const response = await OmniBox.request(matchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': ruyiConfig.headers['User-Agent'] },
      body: JSON.stringify({ fileName })
    });
    if (response.statusCode !== 200) return [];
    const matchData = JSON.parse(response.body || '{}');
    if (!matchData.isMatched) return [];
    const episodeId = matchData.matches?.[0]?.episodeId;
    if (!episodeId) return [];
    return [{ name: '弹幕', url: `${ruyiConfig.danmuApi}/api/v2/comment/${episodeId}?format=xml` }];
  } catch (error) {
    return [];
  }
}

/* ============================================================================
 * 初始化函数（使用硬编码数据，无API请求）
 * ============================================================================ */

const initialize = () => {
  if (initialized) {
    return { classes, filters, subClassMap };
  }
  
  logInfo('初始化分类数据');
  
  // 使用硬编码的分类数据
  classes = HARDCODED_CLASSES;
  subClassMap = HARDCODED_SUB_CLASS_MAP;
  
  // 构建筛选器
  filters = {};
  for (const cls of classes) {
    const tid = cls.type_id;
    const typeOptions = HARDCODED_TYPE_OPTIONS[tid] || [];
    if (typeOptions.length > 0) {
      filters[tid] = [{ name: '类型', key: 'type', init: typeOptions[0]?.value || '', value: typeOptions }];
    }
  }
  
  initialized = true;
  logInfo(`初始化完成，获取到 ${classes.length} 个主分类`);
  
  return { classes, filters, subClassMap };
};

/* ============================================================================
 * 首页和分类功能
 * ============================================================================ */

const getHomeContent = () => {
  const { classes, filters } = initialize();
  return { class: classes, filters: filters };
};

/**
 * 获取分类视频列表
 */
const getCategoryList = async (tid, pg = 1, extend = {}) => {
  try {
    logInfo('获取分类列表', { tid, pg, extend });
    
    const { subClassMap } = initialize();
    const subClassIds = subClassMap.get(tid) || [];
    
    let targetTypeId = tid;
    
    if (extend.type && extend.type !== '') {
      targetTypeId = extend.type;
    } else if (subClassIds.length > 0) {
      targetTypeId = subClassIds[0];
    }
    
    const params = { ac: 'list', t: targetTypeId, pg: pg, pagesize: 20 };
    const res = await request('', { params });
    
    let list = formatList(res.list || []);
    list = await enrichCovers(list);
    
    logInfo('分类列表获取成功', { count: list.length, page: pg, totalPages: res.pagecount });
    
    return {
      list: list,
      page: parseInt(pg),
      pagecount: res.pagecount || 1,
      limit: 20
    };
  } catch (e) {
    logError('获取分类列表失败', e);
    return { list: [], page: pg, pagecount: pg, limit: 20 };
  }
};

const getRecommendList = async () => {
  try {
    const res = await request('', { params: { ac: 'list', pg: 1, pagesize: 20 } });
    let list = formatList(res.list || []);
    list = await enrichCovers(list);
    logInfo('首页推荐获取成功', { count: list.length });
    return list;
  } catch (e) {
    logError('获取首页推荐失败', e);
    return [];
  }
};

/* ============================================================================
 * 刮削相关函数
 * ============================================================================ */

async function batchGetVideoDetailsForScraping(videoIds) {
  if (!videoIds || videoIds.length === 0) return new Map();
  
  const resultMap = new Map();
  const uncachedIds = [];
  
  for (const id of videoIds) {
    if (detailCache.has(id)) {
      resultMap.set(id, detailCache.get(id));
    } else {
      uncachedIds.push(id);
    }
  }
  
  if (uncachedIds.length === 0) return resultMap;
  
  for (let i = 0; i < uncachedIds.length; i += ruyiConfig.batchSize) {
    const batch = uncachedIds.slice(i, i + ruyiConfig.batchSize);
    try {
      const res = await request('', { params: { ac: 'videolist', ids: batch.join(',') } });
      
      if (Array.isArray(res.list)) {
        for (const item of res.list) {
          if (!item || typeof item !== 'object') continue;
          const vodId = String(item.vod_id);
          
          const detail = {
            vod_pic: getPicUrl(item.vod_pic),
            vod_year: item.vod_year || '',
            vod_area: item.vod_area || '',
            type_name: item.type_name || '',
            type_id: String(item.type_id || ''),
            vod_actor: item.vod_actor || '',
            vod_director: item.vod_director || '',
            vod_content: item.vod_content || ''
          };
          
          detailCache.set(vodId, detail);
          resultMap.set(vodId, detail);
        }
      }
    } catch (error) {
      logError(`批量获取详情失败`, error);
    }
  }
  return resultMap;
}

/* ============================================================================
 * OmniBox 接口实现
 * ============================================================================ */

async function home(params) {
  try {
    const homeData = getHomeContent();
    const recommendList = await getRecommendList();
    return { class: homeData.class, filters: homeData.filters, list: recommendList };
  } catch (error) {
    logError('获取首页数据失败', error);
    return { class: [], filters: {}, list: [] };
  }
}

async function category(params) {
  try {
    const categoryId = params.categoryId;
    const page = params.page || 1;
    const filters = params.filters || {};
    
    if (!categoryId) throw new Error("分类ID不能为空");
    
    const result = await getCategoryList(categoryId, page, filters);
    
    if (page === 1) {
      const { filters: allFilters } = initialize();
      result.filters = allFilters[categoryId] || [];
    }
    
    return result;
  } catch (error) {
    logError('获取分类数据失败', error);
    return { page: 1, pagecount: 0, list: [] };
  }
}

async function search(params) {
  try {
    const keyword = params.keyword || params.wd || "";
    const page = params.page || 1;
    
    if (!keyword) return { page: 1, pagecount: 0, list: [] };
    
    const res = await request('', { params: { ac: 'list', wd: keyword, pg: page, pagesize: 30 } });
    let list = formatList(res.list || []);
    
    const searchKeyword = keyword.trim().toLowerCase();
    list = list.filter(item => (item.vod_name || '').toLowerCase().includes(searchKeyword));
    list = await enrichCovers(list);
    
    return {
      list: list.slice(0, 20),
      page: parseInt(page),
      pagecount: res.pagecount || 1,
      total: res.total || 0
    };
  } catch (error) {
    logError('搜索视频失败', error);
    return { page: 1, pagecount: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const videoId = params.videoId;
    if (!videoId) throw new Error("视频ID不能为空");
    
    const res = await request('', { params: { ac: 'videolist', ids: videoId } });
    
    let vod = null;
    if (res.list && res.list.length > 0) {
      const item = res.list[0];
      vod = {
        vod_id: String(item.vod_id || ''),
        vod_name: String(item.vod_name || ''),
        vod_pic: getPicUrl(item.vod_pic),
        type_name: String(item.type_name || ''),
        vod_year: String(item.vod_year || ''),
        vod_area: String(item.vod_area || ''),
        vod_remarks: String(item.vod_remarks || ''),
        vod_actor: String(item.vod_actor || ''),
        vod_director: String(item.vod_director || ''),
        vod_content: String(item.vod_content || '').trim(),
        vod_play_sources: parsePlaySources(item)
      };
    }
    
    if (!vod) return { list: [] };
    
    // 刮削处理
    const sourceCandidates = [];
    const playSources = Array.isArray(vod.vod_play_sources) ? vod.vod_play_sources : [];
    
    for (const source of playSources) {
      for (const ep of source.episodes || []) {
        const meta = ep.playId && ep.playId.includes('|||') ? decodeMeta(ep.playId.split('|||')[1]) : {};
        const fid = ep._fid || meta.fid;
        const rawName = ep._rawName || ep.name || '正片';
        if (!fid) continue;
        sourceCandidates.push({ fid, file_id: fid, file_name: rawName, name: rawName, format_type: 'video' });
      }
    }
    
    if (sourceCandidates.length > 0 && vod.vod_name) {
      try {
        const sourceId = `spider_source_${context.sourceId}_${videoId}`;
        await OmniBox.processScraping(sourceId, vod.vod_name, vod.vod_name, sourceCandidates);
        const metadata = await OmniBox.getScrapeMetadata(sourceId);
        const scrapeData = metadata?.scrapeData || null;
        const videoMappings = metadata?.videoMappings || [];
        
        if (scrapeData) {
          vod.vod_name = scrapeData.title || scrapeData.name || vod.vod_name;
          if (scrapeData.poster_path) vod.vod_pic = `https://image.tmdb.org/t/p/w500${scrapeData.poster_path}`;
          vod.vod_year = scrapeData.releaseDate ? String(scrapeData.releaseDate).substring(0, 4) : vod.vod_year;
          vod.vod_content = scrapeData.overview || vod.vod_content;
          
          if (scrapeData.credits?.cast) vod.vod_actor = scrapeData.credits.cast.slice(0, 5).map(c => c.name).join(',');
          if (scrapeData.credits?.crew) {
            const directors = scrapeData.credits.crew.filter(c => c.job === 'Director').slice(0, 3).map(c => c.name).join(',');
            if (directors) vod.vod_director = directors;
          }
          
          for (const source of playSources) {
            for (const ep of source.episodes || []) {
              const meta = ep.playId && ep.playId.includes('|||') ? decodeMeta(ep.playId.split('|||')[1]) : {};
              const fid = ep._fid || meta.fid;
              const mapping = videoMappings.find(m => m?.fileId === fid);
              if (!mapping) continue;
              
              const oldName = ep.name;
              const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
              if (newName && newName !== oldName) ep.name = newName;
              ep._seasonNumber = mapping.seasonNumber;
              ep._episodeNumber = mapping.episodeNumber;
            }
            
            const hasEpisodeNumber = (source.episodes || []).some(ep => ep._episodeNumber !== undefined);
            if (hasEpisodeNumber) {
              source.episodes.sort((a, b) => {
                const seasonA = a._seasonNumber || 0;
                const seasonB = b._seasonNumber || 0;
                if (seasonA !== seasonB) return seasonA - seasonB;
                return (a._episodeNumber || 0) - (b._episodeNumber || 0);
              });
            }
            
            source.episodes = source.episodes.map(ep => ({ name: ep.name, playId: ep.playId }));
          }
          
          vod.vod_play_sources = playSources;
        }
      } catch (error) {
        logError("刮削处理失败", error);
      }
    }
    
    return { list: [vod] };
  } catch (error) {
    logError('获取视频详情失败', error);
    return { list: [] };
  }
}

async function play(params, context) {
  try {
    const rawPlayId = params.playId || '';
    const flag = params.flag || '';
    const vodId = params.vodId || '';
    
    let playUrl = rawPlayId;
    let vodName = '';
    let episodeName = '';
    let isDirectAddress = false;
    
    if (rawPlayId.includes('|||')) {
      const [mainPlayId, metaB64] = rawPlayId.split('|||');
      const meta = decodeMeta(metaB64 || '');
      vodName = meta.v || '';
      episodeName = meta.e || '';
      isDirectAddress = meta.isDirect || false;
      
      if (isDirectAddress) {
        playUrl = mainPlayId;
      } else if (mainPlayId.startsWith('need_resolve:')) {
        const resolveVodId = mainPlayId.split(':')[1] || meta.sid;
        if (resolveVodId) {
          const playPageUrl = await getPlayPageUrlSmart(resolveVodId);
          playUrl = playPageUrl;
        }
      } else {
        playUrl = mainPlayId;
      }
    }
    
    let scrapedDanmuFileName = '';
    try {
      const sourceVideoId = vodId || (rawPlayId.includes('|||') ? (decodeMeta(rawPlayId.split('|||')[1] || '').sid || '') : '');
      if (sourceVideoId) {
        const sourceId = `spider_source_${context.sourceId}_${sourceVideoId}`;
        const metadata = await OmniBox.getScrapeMetadata(sourceId);
        
        if (metadata && metadata.scrapeData) {
          const meta = rawPlayId.includes('|||') ? decodeMeta(rawPlayId.split('|||')[1] || '') : {};
          const mapping = (metadata.videoMappings || []).find(m => m?.fileId === meta.fid);
          
          scrapedDanmuFileName = buildScrapedDanmuFileName(metadata.scrapeData, metadata.scrapeType || '', mapping, vodName, episodeName);
          if (metadata.scrapeData.title) vodName = metadata.scrapeData.title;
          if (mapping?.episodeName) episodeName = mapping.episodeName;
        }
      }
    } catch (error) {}
    
    let resolvedUrl = playUrl;
    let resolvedHeader = {};
    let parse = 1;
    
    const isDirectPlayable = /\.(m3u8|mp4|flv|avi|mkv|ts)(?:\?|#|$)/i.test(playUrl || '');
    
    if (isDirectPlayable || isDirectAddress) {
      parse = 0;
    } else if (/^https?:\/\//i.test(playUrl || '')) {
      try {
        const sniffResult = await OmniBox.sniffVideo(playUrl);
        if (sniffResult && sniffResult.url) {
          resolvedUrl = sniffResult.url;
          resolvedHeader = sniffResult.header || {};
          parse = 0;
        }
      } catch (sniffError) {}
    }
    
    const response = { urls: [{ name: '默认线路', url: resolvedUrl }], header: resolvedHeader, parse: parse };
    
    if (ruyiConfig.danmuApi) {
      let fileName = '';
      if (vodName) fileName = scrapedDanmuFileName || buildFileNameForDanmu(vodName, episodeName);
      if (fileName) {
        const danmakuList = await matchDanmu(fileName);
        if (danmakuList && danmakuList.length > 0) response.danmaku = danmakuList;
      }
    }
    
    return response;
  } catch (error) {
    logError('获取播放地址失败', error);
    return { urls: [], parse: 0, header: {} };
  }
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(4, "小黑米", function (module, exports, require) {
// @name 小黑米
// @author 梦
// @description 影视站：https://xiaoheimi.cc/ ，支持首页、分类、详情、搜索与播放（直链提取）
// @dependencies cheerio
// @version 1.0.2
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/小黑米.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const BASE_URL = (process.env.XIAOHEIMI_HOST || "https://xiaoheimi.cc").replace(/\/$/, "");
const UA = process.env.XIAOHEIMI_UA || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";
const HOME_CACHE_TTL = Number(process.env.XIAOHEIMI_HOME_CACHE_TTL || 900);
const CATEGORY_CACHE_TTL = Number(process.env.XIAOHEIMI_CATEGORY_CACHE_TTL || 900);
const DETAIL_CACHE_TTL = Number(process.env.XIAOHEIMI_DETAIL_CACHE_TTL || 1800);
const SEARCH_CACHE_TTL = Number(process.env.XIAOHEIMI_SEARCH_CACHE_TTL || 600);
const PLAY_CACHE_TTL = Number(process.env.XIAOHEIMI_PLAY_CACHE_TTL || 1800);

const CLASS_LIST = [
  { type_id: "7", type_name: "电影" },
  { type_id: "6", type_name: "电视剧" },
  { type_id: "5", type_name: "动漫" },
  { type_id: "3", type_name: "综艺" },
  { type_id: "21", type_name: "纪录片" },
  { type_id: "64", type_name: "短剧" },
];

const FILTERS = Object.fromEntries(
  CLASS_LIST.map((item) => [
    item.type_id,
    [
      {
        key: "type",
        name: "分类",
        value: [{ name: "全部", value: item.type_id }],
      },
      {
        key: "by",
        name: "排序",
        value: [
          { name: "最新", value: "time" },
          { name: "人气", value: "hits" },
          { name: "评分", value: "score" },
        ],
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

function uniqueBy(list, keyFn) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(list) ? list : []) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function pickAttr(node, names) {
  for (const name of names) {
    const value = node.attr(name);
    if (value) return value;
  }
  return "";
}

async function requestText(url, options = {}) {
  const method = options.method || "GET";
  await OmniBox.log("info", `[小黑米][request] ${method} ${url}`);
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
  const body = typeof res?.body === "string" ? res.body : String(res?.body || "");
  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode || "unknown"} @ ${url}`);
  }
  return body;
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
  const anchor = node.find("a[href*='/vod/detail/id/']").first();
  const href = anchor.attr("href") || "";
  const title = cleanText(anchor.attr("title") || node.find(".title,.text-333,.myui-vodlist__title").first().text() || anchor.text());
  const img = node.find("img").first();
  const pic = pickAttr(anchor, ["data-original", "data-src", "src"]) || pickAttr(img, ["data-original", "data-src", "src"]);
  const remarks = cleanText(node.find(".pic-text,.text-right,.fed-list-remarks,.myui-vodlist__thumb .tag,.myui-vodlist__text,.module-item-note").first().text());
  return {
    vod_id: absUrl(href),
    vod_name: title,
    vod_pic: absUrl(pic),
    vod_remarks: remarks,
  };
}

function parseListFromHtml(html, options = {}) {
  const $ = cheerio.load(html);
  const list = [];
  const seenHref = new Set();
  const container = options.containerSelector ? $(options.containerSelector).first() : $.root();
  container.find("a[href*='/vod/detail/id/']").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href || seenHref.has(href)) return;
    seenHref.add(href);
    const cardNode = $(el).closest("li, .myui-vodlist__box, .myui-vodlist__item, .module-item, .public-list-box");
    const card = buildCard($, cardNode.length ? cardNode : el);
    if (card.vod_id && card.vod_name) list.push(card);
  });
  return uniqueBy(list, (item) => item.vod_id);
}

function parsePageCount($) {
  let pagecount = 1;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const matches = [...href.matchAll(/\/page\/(\d+)\.html/g)];
    for (const match of matches) {
      const num = Number(match[1] || 1);
      if (Number.isFinite(num)) pagecount = Math.max(pagecount, num);
    }
  });
  return pagecount;
}

function parseInfoList($) {
  const info = {};
  $("li.data, li").each((_, el) => {
    const text = cleanText($(el).text());
    if (!text) return;
    if (text.startsWith("地区：")) info.area = text.replace(/^地区：/, "").trim();
    if (text.startsWith("年份：")) info.year = text.replace(/^年份：/, "").trim();
    if (text.startsWith("主演：")) info.actor = text.replace(/^主演：/, "").trim();
    if (text.startsWith("导演：")) info.director = text.replace(/^导演：/, "").trim();
    if (text.startsWith("类型：")) info.type_name = text.replace(/^类型：/, "").trim();
    if (text.startsWith("更新：")) info.remarks = text.replace(/^更新：/, "").trim();
  });
  return info;
}

function dedupeEpisodes(episodes) {
  return uniqueBy(
    (Array.isArray(episodes) ? episodes : []).map((ep) => ({
      ...ep,
      name: cleanText(ep?.name || ""),
      playId: String(ep?.playId || "").trim(),
    })),
    (item) => `${item.name}|${item.playId}`
  ).filter((item) => item.name && item.playId);
}

function parseDetailSources($, detailUrl) {
  const sourceNames = {};
  $("a[data-toggle='tab'][href^='#playlist']").each((_, el) => {
    const target = ($(el).attr("href") || "").replace(/^#/, "");
    const name = cleanText($(el).text());
    if (target) sourceNames[target] = name || target;
  });

  const sources = [];
  $("div[id^='playlist']").each((_, box) => {
    const node = $(box);
    const playlistId = node.attr("id") || "";
    const sourceName = sourceNames[playlistId] || `线路${sources.length + 1}`;
    const episodes = [];
    node.find("a[href*='/vod/play/id/']").each((__, a) => {
      const href = $(a).attr("href") || "";
      const name = cleanText($(a).attr("title") || $(a).text());
      if (!href || !name) return;
      episodes.push({ name, playId: absUrl(href) });
    });
    const deduped = dedupeEpisodes(episodes);
    if (deduped.length) sources.push({ name: sourceName, episodes: deduped });
  });

  if (!sources.length && detailUrl) {
    sources.push({ name: "在线播放", episodes: [{ name: "立即播放", playId: String(detailUrl) }] });
  }
  return sources;
}

function parseDetail(html, detailUrl) {
  const $ = cheerio.load(html);
  const title = cleanText($("h1").first().text() || $("title").text().replace(/\s*-\s*小宝影院.*$/, ""));
  const poster = $(".myui-content__thumb img, .detail-pic img, .vod-detail-pic img, img.lazyload").first();
  const pic = absUrl(pickAttr(poster, ["data-original", "data-src", "src"]));
  const info = parseInfoList($);
  const desc = cleanText($(".desc,.data-more,.content,.vod_content,.tab-pane.active .content").first().html() || $("meta[name='description']").attr("content") || "");
  const vod_play_sources = parseDetailSources($, detailUrl);
  return {
    vod_id: detailUrl,
    vod_name: title,
    vod_pic: pic,
    vod_remarks: info.remarks || "",
    vod_year: info.year || "",
    vod_area: info.area || "",
    vod_actor: info.actor || "",
    vod_director: info.director || "",
    type_name: info.type_name || "",
    vod_content: desc,
    vod_play_sources,
  };
}

function extractPlayerData(html) {
  const match = html.match(/player_aaaa\s*=\s*(\{.*?\})\s*<\/script>/s) || html.match(/player_aaaa=(\{.*?\});/s);
  if (!match) throw new Error("未找到 player_aaaa 数据");
  const raw = match[1].replace(/\\\//g, "/");
  return JSON.parse(raw);
}

function decodePlayerUrl(url, encrypt) {
  const raw = String(url || "").trim();
  const mode = Number(encrypt || 0);
  if (!raw) return "";
  try {
    if (mode === 1) return unescape(raw);
    if (mode === 2) return unescape(Buffer.from(raw, "base64").toString("utf8"));
  } catch (_) {}
  return raw;
}

async function home(params, context) {
  try {
    await OmniBox.log("info", `[小黑米][home] from=${context?.from || "web"}`);
    const html = await getCachedText(`xiaoheimi:home`, HOME_CACHE_TTL, () => requestText(`${BASE_URL}/`));
    const list = parseListFromHtml(html).slice(0, 60);
    await OmniBox.log("info", `[小黑米][home] 推荐数量=${list.length}`);
    return { class: CLASS_LIST, filters: FILTERS, list };
  } catch (error) {
    await OmniBox.log("error", `[小黑米][home] 失败: ${error.message || error}`);
    return { class: CLASS_LIST, filters: FILTERS, list: [] };
  }
}

async function category(params, context) {
  try {
    const categoryId = String(params?.categoryId || "7");
    const page = Math.max(1, Number(params?.page || 1));
    const by = String(params?.filters?.by || "time").trim() || "time";
    const url = page > 1
      ? `${BASE_URL}/index.php/vod/show/by/${encodeURIComponent(by)}/id/${encodeURIComponent(categoryId)}/page/${page}.html`
      : `${BASE_URL}/index.php/vod/show/by/${encodeURIComponent(by)}/id/${encodeURIComponent(categoryId)}.html`;
    await OmniBox.log("info", `[小黑米][category] categoryId=${categoryId}, page=${page}, by=${by}`);
    const html = await getCachedText(`xiaoheimi:category:${categoryId}:${page}:${by}`, CATEGORY_CACHE_TTL, () => requestText(url));
    const $ = cheerio.load(html);
    const list = parseListFromHtml(html);
    const pagecount = parsePageCount($);
    await OmniBox.log("info", `[小黑米][category] 数量=${list.length}, pagecount=${pagecount}`);
    return {
      page,
      pagecount,
      total: pagecount > 1 ? pagecount * Math.max(list.length, 24) : list.length,
      list,
    };
  } catch (error) {
    await OmniBox.log("error", `[小黑米][category] 失败: ${error.message || error}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const videoId = String(params?.videoId || "").trim();
    if (!videoId) return { list: [] };
    await OmniBox.log("info", `[小黑米][detail] videoId=${videoId}`);
    const html = await getCachedText(`xiaoheimi:detail:${videoId}`, DETAIL_CACHE_TTL, () => requestText(videoId));
    const vod = parseDetail(html, videoId);
    await OmniBox.log("info", `[小黑米][detail] 线路数=${Array.isArray(vod.vod_play_sources) ? vod.vod_play_sources.length : 0}`);
    return { list: [vod] };
  } catch (error) {
    await OmniBox.log("error", `[小黑米][detail] 失败: ${error.message || error}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params?.keyword || params?.wd || "").trim();
    const page = Math.max(1, Number(params?.page || 1));
    if (!keyword) return { page: 1, pagecount: 0, total: 0, list: [] };
    const url = page > 1
      ? `${BASE_URL}/index.php/vod/search/page/${page}/wd/${encodeURIComponent(keyword)}.html`
      : `${BASE_URL}/index.php/vod/search.html?wd=${encodeURIComponent(keyword)}`;
    await OmniBox.log("info", `[小黑米][search] keyword=${keyword}, page=${page}`);
    const html = await getCachedText(`xiaoheimi:search:${keyword}:${page}`, SEARCH_CACHE_TTL, () => requestText(url));
    const $ = cheerio.load(html);
    const list = parseListFromHtml(html, { containerSelector: "#searchList" });
    const pagecount = parsePageCount($);
    await OmniBox.log("info", `[小黑米][search] 数量=${list.length}, pagecount=${pagecount}`);
    return {
      page,
      pagecount,
      total: pagecount > 1 ? pagecount * Math.max(list.length, 20) : list.length,
      list,
    };
  } catch (error) {
    await OmniBox.log("error", `[小黑米][search] 失败: ${error.message || error}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const playId = String(params?.playId || "").trim();
    const flag = String(params?.flag || "play").trim() || "play";
    if (!playId) throw new Error("playId 不能为空");
    await OmniBox.log("info", `[小黑米][play] playId=${playId}, flag=${flag}`);
    const html = await getCachedText(`xiaoheimi:play:${playId}`, PLAY_CACHE_TTL, () => requestText(playId, { referer: playId }));
    const player = extractPlayerData(html);
    const realUrl = decodePlayerUrl(player?.url, player?.encrypt);
    if (!realUrl) throw new Error("未提取到播放地址");
    await OmniBox.log("info", `[小黑米][play] from=${player?.from || "unknown"}, encrypt=${player?.encrypt || 0}`);
    return {
      urls: [{ name: "播放", url: realUrl }],
      header: {
        Referer: `${BASE_URL}/`,
        "User-Agent": UA
      },
      parse: /\.(m3u8|mp4)(\?|$)/i.test(realUrl) ? 0 : 1};
  } catch (error) {
    await OmniBox.log("error", `[小黑米][play] 失败: ${error.message || error}`);
    return { urls: [], header: {}, parse: 1 };
  }
}

});

_load(5, "新韩剧网", function (module, exports, require) {
// @name 新韩剧网
// @author Monica
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: cheerio, crypto-js
// @version 1.1.2
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/新韩剧网.js

const OmniBox = require("omnibox_sdk");
const cheerio = require("cheerio");
const CryptoJS = require("crypto-js");

const hanjuConfig = {
    host: "https://www.9hanju.com",
    headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Referer": "https://www.hanju7.com/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Cache-Control": "max-age=0",
        "Upgrade-Insecure-Requests": "1"
    }
};

const DEFAULT_PIC = "https://youke2.picui.cn/s1/2025/12/21/694796745c0c6.png";
const DANMU_API = process.env.DANMU_API || "";

// ==========================================================================
// 日志工具
// ==========================================================================
const logInfo = (message, data = null) => {
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    OmniBox.log("info", `[新韩剧网-DEBUG] ${output}`);
};

const logError = (message, error) => {
    OmniBox.log("error", `[新韩剧网-DEBUG] ${message}: ${error?.message || error}`);
};

// ============================================================================
// 刮削与弹幕辅助函数
// ============================================================================
const encodeMeta = (obj) => {
    try { return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64"); } 
    catch { return ""; }
};

const decodeMeta = (str) => {
    try { return JSON.parse(Buffer.from(str || "", "base64").toString("utf8") || "{}"); } 
    catch { return {}; }
};

function preprocessTitle(title) {
    if (!title) return "";
    return title
        .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]/g, " ")
        .replace(/[hH]\.?26[45]/g, " ")
        .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
        .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ");
}

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
    if (!episodeTitle || episodeTitle === '正片' || episodeTitle === '播放') return vodName;
    const digits = extractEpisode(episodeTitle);
    if (digits) {
        const epNum = parseInt(digits, 10);
        if (epNum > 0) {
            return epNum < 10 ? `${vodName} S01E0${epNum}` : `${vodName} S01E${epNum}`;
        }
    }
    return vodName;
}

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
        if (hit?.name) return `${hit.episodeNumber}.${hit.name}`;
    }
    return originalName;
}

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

// ============================================================================
// 网络请求与核心逻辑
// ============================================================================
const fetchHtml = async (url, options = {}) => {
    try {
        const res = await OmniBox.request(url, {
            method: options.method || "GET",
            headers: options.headers || hanjuConfig.headers,
            body: options.body,
            timeout: 10000,
            gzip: true 
        });
        if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`);
        return cheerio.load(res.body);
    } catch (e) {
        logError(`请求失败: ${url}`, e);
        throw e;
    }
};

const getClasses = () => {
    return [
        { type_id: "1", type_name: "韩剧" },
        { type_id: "3", type_name: "韩国电影" },
        { type_id: "4", type_name: "韩国综艺" },
        { type_id: "hot", type_name: "排行榜" },
        { type_id: "new", type_name: "最新更新" }
    ];
};

const getCleanText = (el) => {
    let text = "";
    el.contents().each((_, node) => {
        if (node.type === 'text') text += node.data;
    });
    return text.trim();
};

const normalizePic = (pic) => {
    const value = String(pic || "").trim();
    if (!value) return "";
    if (value.startsWith("//")) return `https:${value}`;
    if (/^https?:\/\//i.test(value)) return value;
    try { return new URL(value, hanjuConfig.host).toString(); }
    catch { return value; }
};

const getPicFromDetail = async (id) => {
    try {
        const detailUrl = /^https?:\/\//i.test(String(id || "")) ? String(id) : `${hanjuConfig.host}${id}`;
        const $ = await fetchHtml(detailUrl);
        const pic = $("div.detail div.pic img").attr("data-original") || $("div.detail div.pic img").attr("src") || "";
        return normalizePic(pic) || DEFAULT_PIC;
    } catch (error) {
        logInfo(`详情封面获取失败: ${id}: ${error.message}`);
        return DEFAULT_PIC;
    }
};

const mapWithConcurrency = async (items, limit, mapper) => {
    const values = Array.from(items || []);
    const results = new Array(values.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(Math.max(1, limit), values.length) }, async () => {
        while (cursor < values.length) {
            const index = cursor++;
            results[index] = await mapper(values[index], index);
        }
    });
    await Promise.all(workers);
    return results;
};

const normalizeSniffUrls = (result, defaultName = "嗅探线路") => {
    const urls = [];
    const seen = new Set();
    const append = (item) => {
        const value = typeof item === "string" ? item : (item?.url || item?.playUrl || item?.src || "");
        const url = String(value || "").trim();
        if (!url || seen.has(url)) return;
        seen.add(url);
        urls.push({ name: String(item?.name || defaultName), url });
    };
    if (Array.isArray(result?.urls)) result.urls.forEach(append);
    if (!urls.length) append(result);
    return urls;
};

async function home(params) {
    try {
        logInfo("进入首页");
        const $ = await fetchHtml(`${hanjuConfig.host}`);
        const list = [];
        $("div.list ul li").slice(0, 100).each((_, el) => {
            const a = $(el).find("a");
            const href = a.attr("href");
            if (href) {
                list.push({
                    vod_id: href,
                    vod_name: getCleanText(a) || a.attr("title"),
                    vod_pic: normalizePic(a.attr("data-original")) || DEFAULT_PIC,
                    vod_remarks: $(el).find("span").first().text() || ""
                });
            }
        });
        logInfo(`首页获取到 ${list.length} 个项目`);
        return { class: getClasses(), filters: {}, list: list };
    } catch (e) {
        logError("首页请求失败", e);
        return { class: getClasses(), filters: {}, list: [] };
    }
}

async function category(params) {
    const tid = params.categoryId;
    const pg = Math.max(1, parseInt(params.page || 1));

    try {
        logInfo(`请求分类: ${tid}, 页码: ${pg}`);
        if (["hot", "new"].includes(tid)) {
            const $ = await fetchHtml(`${hanjuConfig.host}/${tid}.html`);
            const allItems = $("div.txt ul li, div.list_txt ul li").get();
            const pageSize = 20;
            const total = allItems.length;
            const pageCount = Math.max(1, Math.ceil(total / pageSize));
            const pageItems = allItems.slice((pg - 1) * pageSize, pg * pageSize);
            const list = await mapWithConcurrency(pageItems, 5, async (el) => {
                const a = $(el).find("a").first();
                const href = a.attr("href");
                if (!href) return null;
                return {
                    vod_id: href,
                    vod_name: getCleanText(a) || a.attr("title") || "",
                    vod_pic: await getPicFromDetail(href),
                    vod_remarks: $(el).find("#actor, span").first().text().trim(),
                };
            });
            const filtered = list.filter(Boolean);
            logInfo(`分类 ${tid} 第 ${pg} 页获取到 ${filtered.length} 个项目`);
            return { list: filtered, page: pg, pagecount: pageCount, limit: pageSize, total };
        }

        const $ = await fetchHtml(`${hanjuConfig.host}/list/${tid}---${pg - 1}.html`);
        const list = [];
        $("div.list ul li").each((_, el) => {
            const a = $(el).find("a.tu").first();
            const href = a.attr("href");
            if (!href) return;
            list.push({
                vod_id: href,
                vod_name: a.attr("title") || getCleanText(a),
                vod_pic: normalizePic(a.attr("data-original")) || DEFAULT_PIC,
                vod_remarks: $(el).find("span.tip").text().trim(),
            });
        });
        logInfo(`分类 ${tid} 第 ${pg} 页获取到 ${list.length} 个项目`);
        return { list, page: pg, pagecount: 100, limit: list.length, total: 9999 };
    } catch (e) {
        logError("分类请求失败", e);
        return { list: [], page: pg, pagecount: pg, limit: 0, total: 0 };
    }
}

async function search(params) {
    const keyword = params.keyword || params.wd || "";
    if (!keyword) return { list: [], page: 1, pagecount: 0, total: 0 };

    try {
        logInfo(`搜索关键词: ${keyword}`);
        const formData = `show=searchkey&keyboard=${encodeURIComponent(keyword)}`;
        let searchRes = await OmniBox.request(`${hanjuConfig.host}/search/`, {
            method: "POST",
            headers: {
                ...hanjuConfig.headers,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData,
            timeout: 15000,
            gzip: true,
        });

        if (Number(searchRes?.statusCode) >= 300 && Number(searchRes?.statusCode) < 400) {
            const location = searchRes?.headers?.location || searchRes?.headers?.Location || "";
            if (!location) return { list: [], page: 1, pagecount: 0, total: 0 };
            const redirectUrl = new URL(location, `${hanjuConfig.host}/search/`).toString();
            const redirectHeaders = { ...hanjuConfig.headers };
            const cookie = searchRes?.headers?.["set-cookie"] || searchRes?.headers?.["Set-Cookie"];
            if (cookie) redirectHeaders.Cookie = Array.isArray(cookie) ? cookie.join("; ") : String(cookie);
            searchRes = await OmniBox.request(redirectUrl, {
                method: "GET",
                headers: redirectHeaders,
                timeout: 15000,
                gzip: true,
            });
        }

        if (Number(searchRes?.statusCode || 200) !== 200) throw new Error(`HTTP ${searchRes?.statusCode || "unknown"}`);
        const $ = cheerio.load(searchRes.body || "");
        const items = $("div.txt ul li").filter((_, el) => $(el).attr("id") !== "t").get();
        const list = await mapWithConcurrency(items, 5, async (el) => {
            const a = $(el).find("p#name a, a").first();
            const href = a.attr("href");
            if (!href) return null;
            return {
                vod_id: href,
                vod_name: a.text().trim().replace(/\(\d+\)$/, ""),
                vod_pic: await getPicFromDetail(href),
                vod_remarks: $(el).find("p#actor, #actor").first().text().trim(),
            };
        });
        const filtered = list.filter(Boolean);
        logInfo(`搜索 "${keyword}" 找到 ${filtered.length} 个结果`);
        return { list: filtered, page: 1, pagecount: 1, total: filtered.length };
    } catch (e) {
        logError("搜索失败", e);
        return { list: [], page: 1, pagecount: 0, total: 0 };
    }
}

async function detail(params) {
    const videoId = params.videoId;

    try {
        logInfo(`请求详情 ID: ${videoId}`);
        const $ = await fetchHtml(hanjuConfig.host + videoId);
        
        const episodes = [];
        $("div.play ul li a").each((_, el) => {
            const name = $(el).text();
            const onclick = $(el).attr("onclick") || "";
            const match = onclick.match(/'(.*?)'/);
            if (match) {
                episodes.push({
                    name: name,
                    playId: match[1] 
                });
            }
        });

        const vodPlaySources = episodes.length > 0 ? [{
            name: $("#playlist").text() || "新韩剧线路",
            episodes: episodes
        }] : [];

        let pic = $("div.detail div.pic img").attr("data-original") || "";
        if (pic && !pic.startsWith("http")) pic = "https:" + pic;
        
        let vodName = $("div.detail div.info dl:eq(0) dd").text();
        let vodContent = $("div.juqing").text().trim();

        // ============================================================================
        // 刮削处理逻辑
        // ============================================================================
        let scrapeData = null;
        let videoMappings = [];
        let scrapeType = "";
        const scrapeCandidates = [];
        
        for (const source of vodPlaySources) {
            for (const ep of source.episodes) {
                const fid = ep.playId;
                if (!fid) continue;
                scrapeCandidates.push({
                    fid: fid,
                    file_id: fid,
                    file_name: ep.name || "正片",
                    name: ep.name || "正片",
                    format_type: "video"
                });
            }
        }

        if (scrapeCandidates.length > 0) {
            try {
                const scrapingResult = await OmniBox.processScraping(videoId, vodName, vodName, scrapeCandidates);
                logInfo("刮削处理完成", { result: scrapingResult || {} });
                const metadata = await OmniBox.getScrapeMetadata(videoId);
                scrapeData = metadata?.scrapeData || null;
                videoMappings = metadata?.videoMappings || [];
                scrapeType = metadata?.scrapeType || "";
                logInfo("刮削元数据读取完成", { hasScrapeData: !!scrapeData, mappingCount: videoMappings.length, scrapeType });
            } catch (error) {
                logError("刮削处理失败", error);
            }
        }

        for (const source of vodPlaySources) {
            for (const ep of source.episodes) {
                const fid = ep.playId;
                const mapping = videoMappings.find((m) => m?.fileId === fid);
                
                let newName = ep.name;
                let seasonNum = 0;
                let episodeNum = 0;
                
                if (mapping) {
                    newName = buildScrapedEpisodeName(scrapeData, mapping, ep.name);
                    seasonNum = mapping.seasonNumber || 0;
                    episodeNum = mapping.episodeNumber || 0;
                    if (newName !== ep.name) {
                        const oldName = ep.name;
                        ep.name = newName;
                        logInfo(`应用刮削后源文件名: ${oldName} -> ${newName}`);
                    }
                }
                
                const meta = { sid: videoId, fid: fid, v: vodName, e: ep.name, s: seasonNum, n: episodeNum };
                ep.playId = `${fid}|||${encodeMeta(meta)}`;
            }

            const hasEpisodeNumber = source.episodes.some(ep => {
                const metaPart = (ep.playId || "").split('|||')[1] || "";
                const meta = decodeMeta(metaPart);
                return meta?.n !== undefined && meta?.n !== 0;
            });
            
            if (hasEpisodeNumber) {
                source.episodes.sort((a, b) => {
                    const metaA = decodeMeta((a.playId || "").split('|||')[1] || "");
                    const metaB = decodeMeta((b.playId || "").split('|||')[1] || "");
                    if (metaA.s !== metaB.s) return metaA.s - metaB.s;
                    return metaA.n - metaB.n;
                });
            }
        }

        logInfo("详情接口返回数据");
        return {
            list: [{
                vod_id: videoId,
                vod_name: scrapeData?.title || vodName,
                vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : pic,
                vod_play_sources: vodPlaySources,
                vod_remarks: $("div.detail div.info dl:eq(4) dd").text(),
                vod_year: $("div.detail div.info dl:eq(5) dd").text(),
                vod_actor: $("div.detail div.info dl:eq(1) dd").text(),
                vod_content: scrapeData?.overview || vodContent
            }]
        };
    } catch (e) {
        logError("详情获取失败", e);
        return { list: [] };
    }
}

async function play(params) {
    const rawPlayIdParam = params.playId;
    const vodId = params.vodId || "";

    let playId = rawPlayIdParam;
    let playMeta = {};
    let vodName = "";
    let episodeName = "";

    if (rawPlayIdParam && rawPlayIdParam.includes("|||")) {
        const parts = rawPlayIdParam.split("|||");
        playId = parts[0];
        playMeta = decodeMeta(parts[1] || "");
        vodName = playMeta.v || "";
        episodeName = playMeta.e || "";
    }
    if (!playId) return { parse: 0, url: "", urls: [], header: {}, headers: {} };

    logInfo(`准备播放 ID: ${playId}`);
    let scrapedDanmuFileName = "";
    let scrapeType = "";
    try {
        const videoIdForScrape = vodId || (playMeta?.sid ? String(playMeta.sid) : "");
        if (videoIdForScrape) {
            const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
            if (metadata?.scrapeData) {
                const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === playMeta?.fid);
                if (metadata.scrapeData.title) vodName = metadata.scrapeData.title;
                if (mapping?.episodeName) episodeName = mapping.episodeName;
                scrapeType = metadata?.scrapeType || "";
                scrapedDanmuFileName = buildScrapedDanmuFileName(metadata.scrapeData, scrapeType, mapping, vodName, episodeName);
            }
        }
    } catch (error) {
        logInfo(`读取刮削元数据失败: ${error.message}`);
    }

    try {
        const res = await OmniBox.request(`${hanjuConfig.host}/u/u1.php?ud=${encodeURIComponent(playId)}`, {
            headers: hanjuConfig.headers,
            timeout: 15000,
            gzip: true,
        });
        if (Number(res?.statusCode || 200) !== 200) throw new Error(`HTTP ${res?.statusCode || "unknown"}`);

        const key = CryptoJS.enc.Utf8.parse("my-to-newhan-2025\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0");
        const base64Data = CryptoJS.enc.Base64.parse(String(res.body || "").trim());
        const iv = CryptoJS.lib.WordArray.create(base64Data.words.slice(0, 4));
        const ciphertext = CryptoJS.lib.WordArray.create(base64Data.words.slice(4));
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext },
            key,
            { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
        );
        const realUrl = decrypted.toString(CryptoJS.enc.Utf8).trim();
        if (!realUrl) throw new Error("播放地址解密为空");

        let playResponse;
        if (/\.(?:m3u8|mp4|flv|avi|mkv|ts)(?:$|[?#])/i.test(realUrl)) {
            playResponse = {
                parse: 0,
                jx: 0,
                url: realUrl,
                urls: [{ name: "直接播放", url: realUrl }],
                header: hanjuConfig.headers,
                headers: hanjuConfig.headers,
            };
        } else {
            let sniffed = null;
            if (typeof OmniBox.sniffVideo === "function") {
                try { sniffed = await OmniBox.sniffVideo(realUrl, hanjuConfig.headers); }
                catch (error) { logInfo(`服务端嗅探失败: ${error.message}`); }
            }
            const sniffUrls = normalizeSniffUrls(sniffed);
            if (sniffUrls.length) {
                const header = sniffed?.header || sniffed?.headers || hanjuConfig.headers;
                playResponse = {
                    parse: 0,
                    jx: 0,
                    url: sniffUrls[0].url,
                    urls: sniffUrls,
                    header,
                    headers: header,
                };
            } else {
                playResponse = {
                    parse: 1,
                    jx: 1,
                    url: realUrl,
                    urls: [{ name: "浏览器嗅探", url: realUrl }],
                    header: hanjuConfig.headers,
                    headers: hanjuConfig.headers,
                };
            }
        }

        if (DANMU_API && (vodName || params.vodName)) {
            const fallbackFileName = buildFileNameForDanmu(vodName || params.vodName || "", episodeName);
            const danmuFileName = scrapedDanmuFileName || fallbackFileName;
            const danmakuList = await matchDanmu(danmuFileName);
            if (danmakuList.length) playResponse.danmaku = danmakuList;
        }
        return playResponse;
    } catch (e) {
        logError("解析播放失败", e);
        return { parse: 0, jx: 0, url: "", urls: [], header: {}, headers: {} };
    }
}

module.exports = {
    home,
    category,
    search,
    detail,
    play
};

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(6, "枫叶", function (module, exports, require) {
// @name 枫叶
// @author 梦
// @description 影视站：支持首页、分类、详情、搜索与播放，补齐刮削、弹幕与播放记录，基于 https://www.budaichuchen.net
// @dependencies cheerio
// @version 1.2.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/枫叶.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");
const https = require("https");
const http = require("http");

const BASE_URL = "https://www.budaichuchen.net";
const UA = "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36";
const PAGE_LIMIT = 20;
const LIST_CACHE_TTL = Number(process.env.FENGYE_LIST_CACHE_TTL || 900);
const DETAIL_CACHE_TTL = Number(process.env.FENGYE_DETAIL_CACHE_TTL || 1800);
const SEARCH_CACHE_TTL = Number(process.env.FENGYE_SEARCH_CACHE_TTL || 600);

function encodeMeta(meta = {}) {
  try {
    return Buffer.from(JSON.stringify(meta), "utf8").toString("base64url");
  } catch (_) {
    return "";
  }
}

function decodeMeta(encoded = "") {
  try {
    if (!encoded) return {};
    return JSON.parse(Buffer.from(String(encoded), "base64url").toString("utf8"));
  } catch (_) {
    return {};
  }
}

function buildScrapedEpisodeName(scrapeData, mapping, originalName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalName;
  }
  if (mapping.episodeName) {
    return `${mapping.episodeNumber}.${mapping.episodeName}`;
  }
  if (scrapeData && Array.isArray(scrapeData.episodes)) {
    const hit = scrapeData.episodes.find(
      (ep) => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber,
    );
    if (hit?.name) {
      return `${hit.episodeNumber}.${hit.name}`;
    }
  }
  return originalName;
}

function preprocessTitle(title) {
  if (!title) return "";
  return String(title)
    .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]/g, " ")
    .replace(/[hH]\.?26[45]/g, " ")
    .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
    .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  const processed = preprocessTitle(title);
  const cnMatch = processed.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
  if (cnMatch) return String(chineseToArabic(cnMatch[1]));
  const seMatch = processed.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
  if (seMatch) return seMatch[1];
  const epMatch = processed.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
  if (epMatch) return epMatch[1];
  const bracketMatch = processed.match(/[\[\(【(](\d{1,3})[\]\)】)]/);
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
      return epNum < 10 ? `${vodName} S01E0${epNum}` : `${vodName} S01E${epNum}`;
    }
  }
  return vodName;
}

function buildScrapedDanmuFileName(scrapeData, scrapeType, mapping, fallbackVodName, fallbackEpisodeName) {
  if (!scrapeData) return buildFileNameForDanmu(fallbackVodName, fallbackEpisodeName);
  if (scrapeType === "movie") {
    return scrapeData.title || fallbackVodName;
  }
  const title = scrapeData.title || fallbackVodName;
  const seasonAirYear = scrapeData.seasonAirYear || "";
  const seasonNumber = mapping?.seasonNumber || 1;
  const episodeNumber = mapping?.episodeNumber || 1;
  return `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
}

function buildHistoryEpisode(playId, episodeNumber, episodeName) {
  if (episodeNumber !== undefined && episodeNumber !== null && episodeNumber !== "") {
    if (episodeName) return `第${episodeNumber}集 ${episodeName}`;
    return `第${episodeNumber}集`;
  }
  return episodeName || playId || "播放";
}

const CATEGORY_CONFIG = [
  { id: "1", name: "电影" },
  { id: "2", name: "电视剧" },
  { id: "3", name: "综艺" },
  { id: "4", name: "动漫" },
  { id: "5", name: "短剧" },
];

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

async function requestText(url, options = {}, redirectCount = 0) {
  await OmniBox.log("info", `[枫叶][request] ${options.method || "GET"} ${url}`);
  const res = await OmniBox.request(url, {
    method: options.method || "GET",
    headers: {
      "User-Agent": UA,
      Referer: BASE_URL + "/",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      ...(options.headers || {}),
    },
    body: options.body,
    timeout: options.timeout || 20000,
  });
  const statusCode = Number(res?.statusCode || 0);
  if ([301, 302, 303, 307, 308].includes(statusCode) && redirectCount < 5) {
    const location = res?.headers?.location || res?.headers?.Location || res?.headers?.LOCATION;
    if (location) return requestText(absoluteUrl(location), options, redirectCount + 1);
  }
  if (!res || statusCode !== 200) {
    throw new Error(`HTTP ${res?.statusCode || "unknown"} @ ${url}`);
  }
  return String(res.body || "");
}

async function requestTextNative(url, options = {}) {
  await OmniBox.log("info", `[枫叶][native-request] ${options.method || "GET"} ${url}`);
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const body = options.body == null ? "" : String(options.body);
    const headers = {
      "User-Agent": UA,
      Referer: BASE_URL + "/",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      ...(options.headers || {}),
    };
    if (body && headers["Content-Length"] == null && headers["content-length"] == null) {
      headers["Content-Length"] = Buffer.byteLength(body);
    }
    const transport = requestUrl.protocol === "http:" ? http : https;
    const req = transport.request({
      protocol: requestUrl.protocol,
      hostname: requestUrl.hostname,
      port: requestUrl.port || (requestUrl.protocol === "http:" ? 80 : 443),
      path: `${requestUrl.pathname}${requestUrl.search}`,
      method: options.method || "GET",
      headers,
      timeout: options.timeout || 20000,
    }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        const statusCode = Number(res.statusCode || 0);
        if (statusCode !== 200) {
          reject(new Error(`HTTP ${statusCode} @ ${url}`));
          return;
        }
        resolve(String(data || ""));
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error(`timeout @ ${url}`));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getCachedText(cacheKey, ttl, producer) {
  try {
    const cached = await OmniBox.getCache(cacheKey);
    if (cached) return String(cached);
  } catch (_) {}
  const value = String(await producer());
  try {
    await OmniBox.setCache(cacheKey, value, ttl);
  } catch (_) {}
  return value;
}

function absoluteUrl(url) {
  try {
    return new URL(String(url || ""), BASE_URL).toString();
  } catch (_) {
    return String(url || "");
  }
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function categoryNameById(categoryId) {
  return CATEGORY_CONFIG.find((item) => item.id === String(categoryId))?.name || "影视";
}

function extractVodId(href) {
  const match = String(href || "").match(/detail\/(.*?)\.html/i);
  return match?.[1] || "";
}

function extractPlayId(href) {
  const match = String(href || "").match(/play\/(.*?)\.html/i);
  return match?.[1] || "";
}

function buildVodCard($, el) {
  const box = $(el);
  const a = box.find(".public-list-exp").first();
  const href = a.attr("href") || "";
  const vodId = extractVodId(href);
  if (!vodId) return null;
  const pic = box.find("img").first().attr("data-src") || box.find("img").first().attr("src") || "";
  return {
    vod_id: vodId,
    vod_name: normalizeText(a.attr("title") || ""),
    vod_pic: absoluteUrl(pic),
    vod_remarks: normalizeText(box.find(".public-list-prb").first().text()),
  };
}

function parseHomeList(htmlText) {
  const $ = cheerio.load(htmlText);
  const list = [];
  const seen = new Set();
  $(".public-list-box").each((_, el) => {
    const item = buildVodCard($, el);
    if (!item?.vod_id || seen.has(item.vod_id)) return;
    seen.add(item.vod_id);
    list.push(item);
  });
  return list;
}

function parseSearchList(htmlText) {
  const $ = cheerio.load(htmlText);
  const list = [];
  const seen = new Set();
  $(".search-box").each((_, el) => {
    const box = $(el);
    const a = box.find(".public-list-exp").first();
    const href = a.attr("href") || "";
    const vodId = extractVodId(href);
    if (!vodId || seen.has(vodId)) return;
    seen.add(vodId);
    const pic = a.find("img").first().attr("data-src") || a.find("img").first().attr("src") || "";
    list.push({
      vod_id: vodId,
      vod_name: normalizeText(box.find(".thumb-txt a").first().text()),
      vod_pic: absoluteUrl(pic),
      vod_remarks: normalizeText(a.find(".public-list-prb").first().text()),
    });
  });
  return list;
}

function parseDetail(htmlText, videoId) {
  const $ = cheerio.load(htmlText);
  const vodName = normalizeText($(".slide-info-title").first().text());
  const vodPic = absoluteUrl($(".detail-pic img").first().attr("data-src") || $(".detail-pic img").first().attr("src") || "");
  const vodContent = normalizeText($("#height_limit").first().text());

  const sourceNames = [];
  $(".anthology-tab a").each((_, el) => {
    const name = normalizeText($(el).text()).replace(/\s/g, "").replace(/\(\d+\)/g, "");
    if (name) sourceNames.push(name);
  });

  const playSources = [];
  $(".anthology-list-box").each((idx, el) => {
    const lineName = sourceNames[idx] || `线路${idx + 1}`;
    const episodes = [];
    $(el).find("ul li a").each((epIdx, a) => {
      const name = normalizeText($(a).text()) || `第${epIdx + 1}集`;
      const rawPlayId = extractPlayId($(a).attr("href") || "");
      if (!rawPlayId) return;
      const fid = `${videoId}#${lineName}#${epIdx}`;
      const meta = {
        sid: String(videoId || ""),
        fid,
        v: vodName || "",
        e: name,
        t: lineName,
        i: epIdx,
      };
      episodes.push({ name, playId: `${rawPlayId}|||${encodeMeta(meta)}`, _fid: fid, _rawName: name });
    });
    episodes.reverse();
    if (episodes.length) {
      playSources.push({ name: lineName, episodes });
    }
  });

  if (!playSources.length) {
    const episodes = [];
    $(".anthology-list-play a").each((epIdx, a) => {
      const name = normalizeText($(a).attr("title") || $(a).text()) || `第${epIdx + 1}集`;
      const rawPlayId = extractPlayId($(a).attr("href") || "");
      if (!rawPlayId) return;
      const fid = `${videoId}#播放列表#${epIdx}`;
      const meta = {
        sid: String(videoId || ""),
        fid,
        v: vodName || "",
        e: name,
        t: "播放列表",
        i: epIdx,
      };
      episodes.push({ name, playId: `${rawPlayId}|||${encodeMeta(meta)}`, _fid: fid, _rawName: name });
    });
    if (episodes.length) {
      playSources.push({ name: "播放列表", episodes });
    }
  }

  const normalizedPlaySources = playSources.map((source) => ({
    name: source.name,
    episodes: (source.episodes || []).map((ep) => ({ name: ep.name, playId: ep.playId })),
  }));

  return {
    list: [{
      vod_id: String(videoId || ""),
      vod_name: vodName,
      vod_pic: vodPic,
      vod_content: vodContent,
      vod_play_sources: normalizedPlaySources,
    }],
    _play_sources_for_scrape: playSources,
  };
}

async function parsePlayPage(playUrl, html) {
  try {
    const playerMatch = html.match(/player_.*?=([^]*?)</);
    if (playerMatch?.[1]) {
      try {
        const config = JSON.parse(playerMatch[1]);
        const rawUrl = String(config.url || "");
        const from = String(config.from || "").toUpperCase();

        if (rawUrl.startsWith("http") && (rawUrl.includes(".m3u8") || rawUrl.includes(".mp4"))) {
          await OmniBox.log("info", `[枫叶][play] player config direct url=${rawUrl}`);
          return rawUrl;
        }

        if (from.includes("JD") || rawUrl.startsWith("JD-")) {
          const jxHost = "https://fgsrg.hzqingshan.com";
          const playPageUrl = `${jxHost}/player/?url=${encodeURIComponent(rawUrl)}`;
          const playPageHtml = await requestTextNative(playPageUrl, {
            headers: {
              Referer: playUrl,
              Origin: BASE_URL,
            },
          });
          const tokenMatch = playPageHtml.match(/data-te="([^"]+)"/);
          const token = tokenMatch?.[1] || "";
          if (token) {
            const params = new URLSearchParams();
            params.set("url", rawUrl);
            params.set("token", token);
            const apiRaw = await requestTextNative(`${jxHost}/player/mplayer.php`, {
              method: "POST",
              headers: {
                Accept: "application/json, text/javascript, */*; q=0.01",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
                Origin: jxHost,
                Referer: playPageUrl,
              },
              body: params.toString(),
            });
            const apiJson = JSON.parse(apiRaw || "{}");
            if (Number(apiJson.code) === 200 && apiJson.url) {
              await OmniBox.log("info", `[枫叶][play] JD parse success url=${apiJson.url}`);
              return String(apiJson.url);
            }
          }
        }
      } catch (e) {
        await OmniBox.log("warn", `[枫叶][play] parse player config failed: ${e.message}`);
      }
    }

    const m3u8Patterns = [
      /['"]((?:https?:)?\/\/[^'"]+\.m3u8[^'"]*)['"]/gi,
      /var\s+url\s*=\s*['"]([^'"]+)['"]/i,
      /url\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i,
    ];

    for (const pattern of m3u8Patterns) {
      const matches = html.match(pattern);
      if (!matches) continue;
      for (const match of matches) {
        const urlMatch = match.match(/['"]?(https?:\/\/[^'"]+\.(?:m3u8|mp4)[^'"]*)['"]?/i);
        if (urlMatch?.[1]) {
          let realUrl = urlMatch[1];
          if (realUrl.startsWith("//")) realUrl = `https:${realUrl}`;
          await OmniBox.log("info", `[枫叶][play] regex found url=${realUrl}`);
          return realUrl;
        }
      }
    }
    return "";
  } catch (error) {
    await OmniBox.log("warn", `[枫叶][play] parse play page failed: ${error.message}`);
    return "";
  }
}

async function home() {
  try {
    const html = await getCachedText("fengye:home", LIST_CACHE_TTL, () => requestText(`${BASE_URL}/`));
    const list = parseHomeList(html).slice(0, 40);
    await OmniBox.log("info", `[枫叶][home] list=${list.length}`);
    return {
      class: CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name })),
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[枫叶][home] ${e.message}`);
    return { class: CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name })), list: [] };
  }
}

async function category(params = {}) {
  try {
    const categoryId = String(params.categoryId || params.type_id || params.id || "1");
    const page = Math.max(1, Number(params.page) || 1);
    const extend = params.extend || params.filters || {};
    const area = String(extend.area || "");
    const by = String(extend.by || "time");
    const clazz = String(extend.class || "");
    const year = String(extend.year || "");
    const lang = String(extend.lang || "");
    const letter = String(extend.letter || "");
    const url = `${BASE_URL}/index.php/ajax/data?mid=1&tid=${encodeURIComponent(categoryId)}&page=${page}&limit=20${area ? `&area=${encodeURIComponent(area)}` : ""}${by !== "time" ? `&by=${encodeURIComponent(by)}` : ""}${clazz ? `&class=${encodeURIComponent(clazz)}` : ""}${year ? `&year=${encodeURIComponent(year)}` : ""}${lang ? `&lang=${encodeURIComponent(lang)}` : ""}`;
    const html = await requestText(url);
    const list = parseData(html);
    await OmniBox.log("info", `[枫叶][category] category=${categoryId} page=${page} count=${list.length}`);
    return {
      page,
      pagecount: list.length >= PAGE_LIMIT ? page + 1 : page,
      total: page * list.length + (list.length ? 1 : 0),
      list: list.map((item) => ({ ...item, type_name: categoryNameById(categoryId) })),
    };
  } catch (e) {
    await OmniBox.log("error", `[枫叶][category] ${e.message}`);
    return { page: Number(params.page) || 1, pagecount: Number(params.page) || 1, total: 0, list: [] };
  }
}

async function search(params = {}) {
  try {
    const wd = normalizeText(params.wd || params.keyword || params.key || "");
    const page = Math.max(1, Number(params.page) || 1);
    if (!wd) return { list: [] };
    const url = `${BASE_URL}/index.php/ajax/suggest?mid=1&wd=${encodeURIComponent(wd)}&limit=30`;
    const html = await requestText(url);
    const list = parseSuggest(html);
    await OmniBox.log("info", `[枫叶][search] wd=${wd} page=${page} count=${list.length}`);
    return {
      page,
      pagecount: list.length >= PAGE_LIMIT ? page + 1 : page,
      total: list.length,
      list,
    };
  } catch (e) {
    await OmniBox.log("warn", `[枫叶][search] ${e.message}`);
    return { page: Number(params.page) || 1, pagecount: Number(params.page) || 1, total: 0, list: [] };
  }
}

async function detail(params = {}) {
  try {
    const videoId = String(params.videoId || params.id || params.vod_id || "");
    if (!videoId) return { list: [] };
    const url = `${BASE_URL}/detail/${videoId}.html`;
    const html = await getCachedText(`fengye:detail:${videoId}`, DETAIL_CACHE_TTL, () => requestText(url));
    const result = parseDetail(html, videoId);
    const vod = result.list?.[0];
    const scrapePlaySources = Array.isArray(result._play_sources_for_scrape) ? result._play_sources_for_scrape : vod?.vod_play_sources || [];

    if (vod && Array.isArray(scrapePlaySources) && scrapePlaySources.length > 0 && typeof OmniBox.processScraping === "function" && typeof OmniBox.getScrapeMetadata === "function") {
      let scrapeData = null;
      let videoMappings = [];
      let scrapeType = "";
      const scrapeCandidates = [];

      for (const source of scrapePlaySources) {
        for (const ep of source.episodes || []) {
          const fid = ep._fid || decodeMeta(String(ep.playId || "").split("|||")[1] || "")?.fid || ep.playId;
          if (!fid) continue;
          scrapeCandidates.push({
            fid,
            file_id: fid,
            file_name: ep._rawName || ep.name || "正片",
            name: ep._rawName || ep.name || "正片",
            format_type: "video",
          });
        }
      }

      await OmniBox.log("info", `[枫叶][detail] 刮削候选 videoId=${videoId} count=${scrapeCandidates.length} preview=${scrapeCandidates.slice(0, 3).map((item) => `${item.fid}=>${item.file_name}`).join(" | ")}`);
      if (scrapeCandidates.length > 0) {
        try {
          const scrapeKeyword = normalizeText(vod.vod_name || "");
          const scrapingResult = await OmniBox.processScraping(videoId, scrapeKeyword, scrapeKeyword, scrapeCandidates);
          await OmniBox.log("info", `[枫叶][detail] 刮削完成 videoId=${videoId} keyword=${scrapeKeyword} result=${JSON.stringify(scrapingResult || {}).slice(0, 200)}`);
          const metadata = await OmniBox.getScrapeMetadata(videoId);
          scrapeData = metadata?.scrapeData || null;
          videoMappings = Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [];
          scrapeType = metadata?.scrapeType || "";
          await OmniBox.log("info", `[枫叶][detail] 刮削元数据 videoId=${videoId} hasScrapeData=${!!scrapeData} mappings=${videoMappings.length} scrapeType=${scrapeType}`);
        } catch (error) {
          await OmniBox.log("warn", `[枫叶][detail] 刮削失败 videoId=${videoId}: ${error.message}`);
        }
      }

      if (scrapeData) {
        vod.vod_name = scrapeData.title || vod.vod_name;
        if (scrapeData.posterPath) {
          vod.vod_pic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
        }
        if (scrapeData.overview) {
          vod.vod_content = scrapeData.overview;
        }
      }

      for (const source of vod.vod_play_sources || []) {
        for (const ep of source.episodes || []) {
          const parts = String(ep.playId || "").split("|||");
          const meta = decodeMeta(parts[1] || "");
          const fid = meta?.fid;
          if (!fid) continue;
          const mapping = videoMappings.find((item) => item?.fileId === fid);
          if (!mapping) continue;
          const oldName = ep.name;
          const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
          if (newName && newName !== oldName) {
            ep.name = newName;
            await OmniBox.log("info", `[枫叶][detail] 应用刮削分集名 ${oldName} -> ${newName}`);
          }
          meta.e = ep.name;
          meta.s = mapping.seasonNumber;
          meta.n = mapping.episodeNumber;
          ep.playId = `${parts[0]}|||${encodeMeta(meta)}`;
        }
      }
    }

    await OmniBox.log("info", `[枫叶][detail] id=${videoId} sources=${result.list?.[0]?.vod_play_sources?.length || 0}`);
    return result;
  } catch (e) {
    await OmniBox.log("error", `[枫叶][detail] ${e.message}`);
    return { list: [] };
  }
}

async function play(params = {}, context = {}) {
  try {
    let rawPlayId = String(params.id || params.playId || "");
    let playMeta = {};
    let vodName = "";
    let episodeName = "";

    if (rawPlayId.includes("|||")) {
      const [mainPlayId, metaB64] = rawPlayId.split("|||");
      rawPlayId = mainPlayId;
      playMeta = decodeMeta(metaB64 || "");
      vodName = playMeta.v || "";
      episodeName = playMeta.e || "";
      await OmniBox.log("info", `[枫叶][play] 解析透传信息 vod=${vodName} episode=${episodeName} fid=${playMeta.fid || ""}`);
    }

    const playId = String(rawPlayId || "");
    if (!playId) return { parse: 1, url: "", urls: [], header: {} };
    const playUrl = `${BASE_URL}/play/${playId}.html`;

    const playInfoPromise = (async () => {
      const html = await requestText(playUrl);
      const realVideoUrl = await parsePlayPage(playUrl, html);
      const finalHeaders = {
        "User-Agent": UA,
        Referer: `${BASE_URL}/`,
        Origin: BASE_URL,
      };

      if (realVideoUrl) {
        await OmniBox.log("info", `[枫叶][play] direct success playId=${playId} url=${realVideoUrl}`);
        return {
          parse: 0,
          url: realVideoUrl,
          urls: [{ name: "播放", url: realVideoUrl }],
          header: finalHeaders,
          headers: finalHeaders,
          danmaku: []};
      }

      await OmniBox.log("warn", `[枫叶][play] fallback parse=1 playId=${playId}`);
      return {
        parse: 1,
        url: playUrl,
        urls: [{ name: "播放页", url: playUrl }],
        header: finalHeaders,
        headers: finalHeaders,
        danmaku: []};
    })();

    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: playMeta?.n ?? null,
        episodeName: episodeName || "",
        scrapeType: "",
        mapping: null,
      };

      const videoIdForScrape = String(playMeta?.sid || params.videoId || params.vod_id || "");
      if (!videoIdForScrape || typeof OmniBox.getScrapeMetadata !== "function") {
        await OmniBox.log("info", `[枫叶][play] 播放增强链路跳过 videoId=${videoIdForScrape || ""}`);
        return result;
      }

      try {
        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
        if (!metadata || !metadata.scrapeData) {
          await OmniBox.log("info", `[枫叶][play] 播放增强链路跳过: metadata 不完整 videoId=${videoIdForScrape}`);
          return result;
        }

        result.scrapeTitle = metadata.scrapeData.title || "";
        if (metadata.scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${metadata.scrapeData.posterPath}`;
        }
        result.scrapeType = metadata.scrapeType || "";

        const mappings = Array.isArray(metadata.videoMappings) ? metadata.videoMappings : [];
        await OmniBox.log("info", `[枫叶][play] 读取刮削元数据成功 videoId=${videoIdForScrape} mappings=${mappings.length} scrapeType=${result.scrapeType || "unknown"}`);
        const mapping = mappings.find((item) => item?.fileId === playMeta?.fid);
        result.mapping = mapping || null;
        if (mapping) {
          if (mapping.episodeName) {
            result.episodeName = buildScrapedEpisodeName(metadata.scrapeData, mapping, result.episodeName || episodeName || "");
          }
          if (mapping.episodeNumber !== undefined && mapping.episodeNumber !== null) {
            result.episodeNumber = mapping.episodeNumber;
          }
        } else if (mappings.length > 0) {
          await OmniBox.log("info", `[枫叶][play] 播放增强链路未命中 mapping fid=${playMeta?.fid || ""}`);
        }

        vodName = result.scrapeTitle || vodName;
        episodeName = result.episodeName || episodeName;
        const fileName = buildScrapedDanmuFileName(metadata.scrapeData, result.scrapeType, mapping, vodName, episodeName);
        if (fileName && typeof OmniBox.getDanmakuByFileName === "function") {
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
          const count = Array.isArray(matchedDanmaku) ? matchedDanmaku.length : 0;
          await OmniBox.log("info", `[枫叶][play] 弹幕匹配结果 fileName=${fileName} count=${count}`);
          if (count > 0) {
            result.danmakuList = matchedDanmaku;
          }
        }
      } catch (error) {
        await OmniBox.log("warn", `[枫叶][play] 读取刮削元数据失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);
    if (playInfoResult.status !== "fulfilled") {
      throw playInfoResult.reason || new Error("播放主链路失败");
    }

    const playResult = playInfoResult.value || { urls: [], parse: 0, header: {}, danmaku: [] };
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
      await OmniBox.log("warn", `[枫叶][play] 播放增强链路失败(不影响播放): ${metadataResult.reason?.message || metadataResult.reason}`);
    }

    playResult.danmaku = danmakuList.length > 0 ? danmakuList : (playResult.danmaku || []);

    const videoIdForScrape = String(playMeta?.sid || params.videoId || params.vod_id || "");
    if (videoIdForScrape && context?.sourceId && typeof OmniBox.addPlayHistory === "function") {
      const historyPayload = {
        vodId: videoIdForScrape,
        title: scrapeTitle || vodName || playMeta.v || "枫叶视频",
        pic: scrapePic || "",
        episode: buildHistoryEpisode(playId, episodeNumber, episodeName),
        sourceId: context.sourceId,
        episodeNumber,
        episodeName: episodeName || "",
      };
      OmniBox.addPlayHistory(historyPayload)
        .then((added) => {
          if (added) {
            OmniBox.log("info", `[枫叶][play] 已添加播放记录: ${historyPayload.title}`);
          } else {
            OmniBox.log("info", `[枫叶][play] 播放记录已存在，跳过添加: ${historyPayload.title}`);
          }
        })
        .catch((error) => {
          OmniBox.log("warn", `[枫叶][play] 添加播放记录失败: ${error.message}`);
        });
    }

    return playResult;
  } catch (e) {
    await OmniBox.log("error", `[枫叶][play] ${e.message}`);
    return { parse: 1, url: "", urls: [], header: {}, danmaku: [] };
  }
}


function parseData(htmlText) {
  try {
    const data = JSON.parse(htmlText);
    const arr = data && Array.isArray(data.list) ? data.list : [];
    return arr
      .map(function (it) {
        return {
          vod_id: String(it.vod_id),
          vod_name: normalizeText(it.vod_name || ''),
          vod_pic: fixPic(it.vod_pic || ''),
          vod_remarks: normalizeText(it.vod_remarks || ''),
        };
      })
      .filter(function (it) { return !!it.vod_id; });
  } catch (e) {
    return [];
  }
}

function parseSuggest(htmlText) {
  try {
    const data = JSON.parse(htmlText);
    const arr = data && Array.isArray(data.list) ? data.list : [];
    return arr
      .map(function (it) {
        return {
          vod_id: String(it.id),
          vod_name: normalizeText(it.name || ''),
          vod_pic: fixPic(it.pic || ''),
          vod_remarks: normalizeText(it.remarks || ''),
        };
      })
      .filter(function (it) { return !!it.vod_id; });
  } catch (e) {
    return [];
  }
}
function fixPic(u) {
  if (!u) return "";
  u = String(u).replace(/&amp;/g, "&");
  if (u.indexOf("//") === 0) return "https:" + u;
  if (u.indexOf("/") === 0) return absoluteUrl(u);
  return u;
}

});

_load(7, "歪比巴卜", function (module, exports, require) {
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

_load(8, "爱奇艺资源站", function (module, exports, require) {
// @name 爱奇艺资源站(MacCMS API)-增强版
// @author OpenClaw Bingbu + 梦
// @description 刮削：支持，弹幕：支持，嗅探：支持，观看记录：支持，广告：菠菜
// @dependencies: axios
// @version 1.1.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/爱奇艺资源站.js

/**
 * ============================================================================
 * 爱奇艺资源站 OmniBox 站源（增强版）
 * 站点: https://iqiyizyapi.com
 * 接口: /api.php/provide/vod
 *
 * 新增能力：
 * - 支持 TMDB 刮削（detail 阶段触发 processScraping）
 * - 支持弹幕匹配（play 阶段通过 getDanmakuByFileName 获取）
 * - 支持观看记录（play 阶段 addPlayHistory）
 * - 保留原有：一级主类聚合、二级筛选、分类屏蔽、嗅探兼容
 *
 * 分类屏蔽配置：
 * - 环境变量 IQIYIZY_BLOCKED_MAIN
 * - 例："39" 或 "39,9"（按一级分类ID）
 * ============================================================================
 */

const axios = require("axios");
const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const HOST = "https://iqiyizy.cc";
const API = `${HOST}/api.php/provide/vod`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";

const MAIN_CATEGORIES = [
  { type_id: "7", type_name: "电影" },
  { type_id: "8", type_name: "连续剧" },
  { type_id: "9", type_name: "综艺" },
  { type_id: "40", type_name: "动漫" },
  { type_id: "39", type_name: "伦理片" }
];

const MAIN_CHILDREN_FALLBACK = {
  "7": [
    { type_id: "5", type_name: "动漫电影" },
    { type_id: "10", type_name: "动作片" },
    { type_id: "11", type_name: "喜剧片" },
    { type_id: "12", type_name: "爱情片" },
    { type_id: "13", type_name: "科幻片" },
    { type_id: "14", type_name: "恐怖片" },
    { type_id: "15", type_name: "剧情片" },
    { type_id: "16", type_name: "战争片" },
    { type_id: "17", type_name: "惊悚片" },
    { type_id: "18", type_name: "家庭片" },
    { type_id: "19", type_name: "古装片" },
    { type_id: "20", type_name: "历史片" },
    { type_id: "21", type_name: "悬疑片" },
    { type_id: "22", type_name: "犯罪片" },
    { type_id: "23", type_name: "灾难片" },
    { type_id: "24", type_name: "记录片" },
    { type_id: "25", type_name: "短片" }
  ],
  "8": [
    { type_id: "26", type_name: "国产剧" },
    { type_id: "27", type_name: "香港剧" },
    { type_id: "28", type_name: "韩国剧" },
    { type_id: "29", type_name: "欧美剧" },
    { type_id: "30", type_name: "台湾剧" },
    { type_id: "31", type_name: "日本剧" },
    { type_id: "32", type_name: "海外剧" },
    { type_id: "33", type_name: "泰国剧" },
    { type_id: "38", type_name: "短剧" }
  ],
  "9": [
    { type_id: "34", type_name: "大陆综艺" },
    { type_id: "35", type_name: "港台综艺" },
    { type_id: "36", type_name: "日韩综艺" },
    { type_id: "37", type_name: "欧美综艺" }
  ],
  "40": [
    { type_id: "1", type_name: "国产动漫" },
    { type_id: "2", type_name: "日韩动漫" },
    { type_id: "3", type_name: "欧美动漫" },
    { type_id: "4", type_name: "港台动漫" },
    { type_id: "6", type_name: "里番动漫" }
  ],
  "39": []
};

const DEFAULT_BLOCKED_MAIN = ["39"];

const http = axios.create({
  timeout: 20000,
  headers: {
    "User-Agent": UA,
    "Accept": "application/json,text/plain,*/*",
    "Referer": `${HOST}/`
  },
  validateStatus: () => true
});

const CLASS_CACHE = {
  list: [],
  mapById: {},
  childMap: {}
};

function safeJson(input, fallback = {}) {
  if (!input) return fallback;
  if (typeof input === "object") return input;
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}

function text(v) {
  return String(v == null ? "" : v).trim();
}

function fixUrl(url) {
  const u = text(url);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `${HOST}${u}`;
  return `${HOST}/${u}`;
}

function b64Encode(obj) {
  try {
    return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64");
  } catch {
    return "";
  }
}

function b64Decode(str) {
  try {
    return JSON.parse(Buffer.from(String(str || ""), "base64").toString("utf8"));
  } catch {
    return {};
  }
}

function getBlockedMainSet() {
  const env = text(process.env.IQIYIZY_BLOCKED_MAIN);
  const raw = env ? env.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_BLOCKED_MAIN;
  return new Set(raw);
}

function updateClassCache(classList) {
  const classes = Array.isArray(classList)
    ? classList.map((c) => ({
        type_id: text(c.type_id),
        type_pid: text(c.type_pid),
        type_name: text(c.type_name)
      })).filter((c) => c.type_id && c.type_name)
    : [];

  if (!classes.length) return;

  const mapById = {};
  const childMap = {};
  classes.forEach((c) => {
    mapById[c.type_id] = c;
    const pid = c.type_pid || "0";
    if (!childMap[pid]) childMap[pid] = [];
    childMap[pid].push(c);
  });

  CLASS_CACHE.list = classes;
  CLASS_CACHE.mapById = mapById;
  CLASS_CACHE.childMap = childMap;
}

async function fetchApi(params = {}) {
  try {
    const res = await http.get(API, { params });
    const data = safeJson(res.data, {});
    if (Array.isArray(data.class)) updateClassCache(data.class);
    return data;
  } catch (error) {
    await OmniBox.log("warn", `fetchApi 失败: ${error.message}`);
    return {};
  }
}

async function ensureClassCache() {
  if (Array.isArray(CLASS_CACHE.list) && CLASS_CACHE.list.length > 0) return;
  await fetchApi({ ac: "list", pg: 1 });
}

function resolveMainTypeId(typeId, fallbackMain = "") {
  const t = text(typeId);
  if (!t) return text(fallbackMain);
  if (MAIN_CATEGORIES.some((m) => m.type_id === t)) return t;

  const mapById = CLASS_CACHE.mapById || {};
  let cur = mapById[t];
  let guard = 0;
  while (cur && guard < 10) {
    guard += 1;
    if (MAIN_CATEGORIES.some((m) => m.type_id === cur.type_id)) return cur.type_id;
    if (!cur.type_pid || cur.type_pid === cur.type_id) break;
    cur = mapById[cur.type_pid];
  }

  return text(fallbackMain);
}

function isMainBlocked(mainTypeId) {
  return getBlockedMainSet().has(text(mainTypeId));
}

function mapListItem(item) {
  const typeId = text(item.type_id || "");
  const mainTypeId = resolveMainTypeId(typeId, item.type_id_1 || "");
  return {
    vod_id: text(item.vod_id),
    vod_name: text(item.vod_name),
    vod_pic: fixUrl(item.vod_pic),
    vod_remarks: text(item.vod_remarks || item.type_name || ""),
    type_id: typeId,
    type_name: text(item.type_name || ""),
    main_type_id: mainTypeId,
    vod_year: text(item.vod_year || ""),
    vod_douban_score: text(item.vod_douban_score || "")
  };
}

function buildResourceId(vodId) {
  // 注意：OmniBox 刮削系统要求 resourceId 直接使用裸 videoId，不能加前缀
  // 参考瓜子.js: processScraping(videoId, ...) / getScrapeMetadata(videoId)
  return text(vodId);
}

function buildEpisodeFileId(vodId, flag, epName, idx) {
  // fileId 格式与瓜子.js 保持一致: `${videoId}#${index}`
  // index 从 1 开始，多线路时加上 flag 区分，避免重复
  return `${text(vodId)}#${text(flag)}#${idx}`;
}

function parsePlaySources(vodPlayFrom, vodPlayUrl, vodId, vodName = "") {
  // 这里做两件事：
  // 1) 把资源站返回的旧格式 vod_play_from / vod_play_url 转成 OmniBox 推荐的新格式 vod_play_sources
  // 2) 同时构造一份 videoFiles，供 processScraping(resourceId, keyword, resourceName, videoFiles) 使用
  //
  // 为什么要额外构造 videoFiles？
  // 因为本源不是网盘源，没有天然的 fileId，刮削系统依赖 fileId 把“某一集”映射到 TMDB 的某一集。
  // 所以这里人为构造一个稳定 fileId：iqiyizy:{vodId}:{flag}:{idx}:{epName}
  // detail 阶段用它去刮削，play 阶段再把同一个 fileId 塞回 playId，这样就能在播放时找回映射关系。
  const fromArr = text(vodPlayFrom).split("$$$").map((s) => s.trim()).filter(Boolean);
  const urlArr = text(vodPlayUrl).split("$$$").map((s) => s.trim()).filter(Boolean);
  const sourceCount = Math.max(fromArr.length, urlArr.length);
  const sources = [];
  const videoFiles = [];

  for (let i = 0; i < sourceCount; i += 1) {
    const flag = fromArr[i] || `线路${i + 1}`;
    const group = urlArr[i] || "";
    const episodesRaw = group.split("#").map((s) => s.trim()).filter(Boolean);

    const episodes = episodesRaw.map((item, idx) => {
      let epName = `第${idx + 1}集`;
      let epUrl = item;
      const cut = item.indexOf("$");
      if (cut > -1) {
        epName = text(item.slice(0, cut)) || epName;
        epUrl = text(item.slice(cut + 1));
      }

      const fileId = buildEpisodeFileId(vodId, flag, epName, idx + 1);
      videoFiles.push({
        fid: fileId,
        file_id: fileId,
        file_name: epName,
        name: epName,
        format_type: "video"
      });

      const playId = b64Encode({
        resourceId: buildResourceId(vodId),
        vodId: text(vodId),
        name: vodName,
        flag,
        epName,
        episodeIndex: idx + 1,
        fileId,
        url: epUrl
      });

      return { name: epName, playId, _fileId: fileId };
    });

    if (episodes.length > 0) {
      sources.push({ name: flag, episodes });
    }
  }

  return { sources, videoFiles };
}

async function enrichPlaySourcesWithMetadata(playSources, resourceId) {
  // 这里只负责“把刮削结果回填到剧集列表里”，不负责触发刮削。
  // 典型调用顺序：
  //   detail -> processScraping(...) -> getScrapeMetadata(...) -> enrichPlaySourcesWithMetadata(...)
  //
  // 注意：即使这里成功拿到了 metadata，页面上也不一定会“看起来变化很大”。
  // 因为前端主要展示 vod_name / vod_pic / 简介 / 剧集名称等字段；
  // 如果站点原始数据已经比较完整，或者前端没有展示 enrich 字段，就会产生“刮削似乎没生效”的错觉。
  // 所以这里额外加详细日志，帮助判断到底是：
  // - processScraping 没跑到
  // - getScrapeMetadata 没拿到数据
  // - videoMappings 没匹配上 fileId
  // - 还是拿到了但前端展示不明显
  try {
    await OmniBox.log("info", `[刮削回填] 开始读取元数据 resourceId=${resourceId}`);
    const metadata = await OmniBox.getScrapeMetadata(resourceId);
    const scrapeData = metadata?.scrapeData || null;
    const videoMappings = Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [];

    await OmniBox.log(
      "info",
      `[刮削回填] 元数据读取完成 resourceId=${resourceId}, hasScrapeData=${!!scrapeData}, mappingCount=${videoMappings.length}, playSourceCount=${playSources.length}`
    );

    if (scrapeData) {
      await OmniBox.log(
        "info",
        `[刮削回填] scrapeData 摘要 title=${text(scrapeData.title)}, releaseDate=${text(scrapeData.releaseDate)}, voteAverage=${text(scrapeData.voteAverage)}`
      );
    }

    if (!playSources.length || !videoMappings.length) {
      await OmniBox.log(
        "warn",
        `[刮削回填] 没有可回填的数据 playSources=${playSources.length}, videoMappings=${videoMappings.length}`
      );
      return { playSources, scrapeData, metadata };
    }

    const mappingMap = new Map();
    for (const m of videoMappings) {
      if (m?.fileId) mappingMap.set(String(m.fileId), m);
    }

    let matchedCount = 0;

    for (const source of playSources) {
      for (const ep of source.episodes || []) {
        const lookupKey = String(ep._fileId || "");
        const mapping = mappingMap.get(lookupKey);
        if (!mapping) {
          await OmniBox.log("info", `[刮削回填] 未命中映射 source=${source.name}, episode=${ep.name}, fileId=${lookupKey}`);
          continue;
        }

        matchedCount += 1;
        await OmniBox.log(
          "info",
          `[刮削回填] 命中映射 source=${source.name}, oldEpisode=${ep.name}, fileId=${lookupKey}, season=${mapping.seasonNumber ?? ""}, episode=${mapping.episodeNumber ?? ""}, tmdbEpisodeName=${text(mapping.episodeName)}`
        );

        if (mapping.episodeName) {
          const epName = mapping.episodeNumber + "." + mapping.episodeName;
          ep.episodeName = epName;
        }
        if (mapping.episodeOverview) ep.episodeOverview = mapping.episodeOverview;
        if (mapping.episodeAirDate) ep.episodeAirDate = mapping.episodeAirDate;
        if (mapping.episodeStillPath) ep.episodeStillPath = mapping.episodeStillPath;
        if (mapping.episodeVoteAverage != null) ep.episodeVoteAverage = mapping.episodeVoteAverage;
        if (mapping.episodeRuntime != null) ep.episodeRuntime = mapping.episodeRuntime;
        if (mapping.seasonNumber != null) ep._seasonNumber = mapping.seasonNumber;
        if (mapping.episodeNumber != null) ep._episodeNumber = mapping.episodeNumber;
        if (mapping.episodeName) {
          const epName = mapping.episodeNumber + "." + mapping.episodeName;
          ep.name = epName;
        }
      }

      const hasOrdering = (source.episodes || []).some((ep) => ep._episodeNumber != null);
      if (hasOrdering) {
        await OmniBox.log("info", `[刮削回填] 线路 ${source.name} 检测到剧集排序信息，按 season/episode 重排`);
        source.episodes.sort((a, b) => {
          const sa = Number(a._seasonNumber || 0);
          const sb = Number(b._seasonNumber || 0);
          if (sa !== sb) return sa - sb;
          return Number(a._episodeNumber || 0) - Number(b._episodeNumber || 0);
        });
      }

      for (const ep of source.episodes || []) {
        delete ep._seasonNumber;
        delete ep._episodeNumber;
        delete ep._fileId;
      }
    }

    await OmniBox.log("info", `[刮削回填] 完成 resourceId=${resourceId}, matchedEpisodeCount=${matchedCount}`);
    return { playSources, scrapeData, metadata };
  } catch (error) {
    await OmniBox.log("warn", `获取刮削元数据失败: ${error.message}`);
    for (const source of playSources) {
      for (const ep of source.episodes || []) delete ep._fileId;
    }
    return { playSources, scrapeData: null, metadata: null };
  }
}

function buildMainClasses() {
  return MAIN_CATEGORIES.filter((c) => !isMainBlocked(c.type_id));
}

function buildFiltersForMain(mainTypeId) {
  const key = text(mainTypeId);
  const cacheChildren = (CLASS_CACHE.childMap?.[key] || [])
    .filter((c) => c.type_id !== key)
    .map((c) => ({ type_id: c.type_id, type_name: c.type_name }));
  const children = (cacheChildren.length ? cacheChildren : (MAIN_CHILDREN_FALLBACK[key] || []))
    .sort((a, b) => String(a.type_id).localeCompare(String(b.type_id)));
  if (!children.length) return [];
  return [{
    key: "subtype",
    name: "子分类",
    init: "",
    value: [{ name: "全部", value: "" }, ...children.map((c) => ({ name: c.type_name, value: c.type_id }))]
  }];
}

function getChildTypeIds(mainTypeId) {
  const key = text(mainTypeId);
  const cacheChildren = (CLASS_CACHE.childMap?.[key] || [])
    .filter((c) => c.type_id && c.type_id !== key)
    .map((c) => c.type_id);
  if (cacheChildren.length) return cacheChildren;
  return (MAIN_CHILDREN_FALLBACK[key] || []).map((c) => c.type_id);
}

async function fetchMainAllByChildren(mainTypeId, page) {
  const childTypeIds = getChildTypeIds(mainTypeId);
  if (!childTypeIds.length) {
    const direct = await fetchApi({ ac: "list", t: text(mainTypeId), pg: page });
    const directList = (Array.isArray(direct.list) ? direct.list : [])
      .map(mapListItem)
      .filter((it) => !isMainBlocked(it.main_type_id || it.type_id));
    return {
      list: directList,
      page: Number(direct.page || page || 1),
      pagecount: Number(direct.pagecount || page || 1),
      total: Number(direct.total || directList.length || 0),
      limit: Number(direct.limit || 20)
    };
  }

  const results = await Promise.all(childTypeIds.map((tid) => fetchApi({ ac: "list", t: tid, pg: page })));
  const mergedRaw = [];
  let total = 0;
  let pagecount = 0;
  let limit = 20;

  results.forEach((data) => {
    const arr = Array.isArray(data.list) ? data.list : [];
    mergedRaw.push(...arr);
    total += Number(data.total || 0);
    pagecount = Math.max(pagecount, Number(data.pagecount || 0));
    if (Number(data.limit || 0) > 0) limit = Number(data.limit);
  });

  const seen = new Set();
  const merged = mergedRaw
    .map(mapListItem)
    .filter((it) => !isMainBlocked(it.main_type_id || it.type_id))
    .filter((it) => {
      if (!it.vod_id || seen.has(it.vod_id)) return false;
      seen.add(it.vod_id);
      return true;
    })
    .sort((a, b) => Number(b.vod_id || 0) - Number(a.vod_id || 0));

  return { list: merged, page, pagecount: pagecount || page, total: total || merged.length, limit };
}

function getFilterSubtype(params) {
  return text(params?.filters?.subtype || params?.filter?.subtype || params?.extend?.subtype || params?.ext?.subtype || "");
}

function isAllSelection(value) {
  const v = text(value).toLowerCase();
  return !v || v === "0" || v === "-1" || v === "all" || v === "全部";
}

function inferTypeName(mainTypeId, rawTypeName) {
  const hit = MAIN_CATEGORIES.find((m) => m.type_id === text(mainTypeId));
  return hit?.type_name || text(rawTypeName || "");
}

function buildScrapeKeyword(item) {
  // 只传片名，不加年份；加年份容易干扰 TMDB 搜索（如"你好1983 2026"）
  // 参考瓜子.js: processScraping(videoId, vod.vod_name, vod.vod_name, ...)
  return text(item.vod_name);
}

function buildDanmakuFileName(scrapeData, mapping, fallbackTitle, fallbackEpName) {
  if (!scrapeData) return `${fallbackTitle || ""} ${fallbackEpName || ""}`.trim();
  const title = text(scrapeData.title || fallbackTitle || "");
  const scrapeType = text(scrapeData.scrapeType || scrapeData.type || "").toLowerCase();
  const seasonAirYear = text(scrapeData.seasonAirYear || scrapeData.releaseDate || "").slice(0, 4);

  if (mapping && (mapping.episodeNumber != null || mapping.seasonNumber != null || scrapeType === "tv")) {
    const season = Number(mapping?.seasonNumber || 1);
    const episode = Number(mapping?.episodeNumber || 1);
    const yearPart = seasonAirYear ? `.${seasonAirYear}` : "";
    return `${title}${yearPart}.S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
  }

  return title || `${fallbackTitle || ""} ${fallbackEpName || ""}`.trim();
}

async function home(params, context) {
  const data = await fetchApi({ ac: "list", pg: 1 });
  const classes = buildMainClasses();
  const list = (Array.isArray(data.list) ? data.list : []).map(mapListItem).filter((it) => !isMainBlocked(it.main_type_id || it.type_id));
  const filters = {};
  classes.forEach((m) => {
    const f = buildFiltersForMain(m.type_id);
    if (f.length) filters[m.type_id] = f;
  });
  return { class: classes, filters, list };
}

async function category(params, context) {
  const page = parseInt(params?.page || "1", 10) || 1;
  const mainTypeId = text(params?.categoryId || params?.type_id || "");
  const subtype = getFilterSubtype(params);
  await ensureClassCache();

  if (isMainBlocked(mainTypeId)) {
    return { list: [], page, pagecount: 0, total: 0, limit: 20 };
  }

  let result;
  if (!isAllSelection(subtype)) {
    const data = await fetchApi({ ac: "list", t: subtype, pg: page });
    const list = (Array.isArray(data.list) ? data.list : []).map(mapListItem).filter((it) => !isMainBlocked(it.main_type_id || it.type_id));
    result = {
      list,
      page: Number(data.page || page || 1),
      pagecount: Number(data.pagecount || page || 1),
      total: Number(data.total || list.length || 0),
      limit: Number(data.limit || 20)
    };
  } else {
    result = await fetchMainAllByChildren(mainTypeId, page);
  }

  const f = buildFiltersForMain(mainTypeId);
  if (f.length && page === 1) result.filters = f;
  return result;
}

async function search(params, context) {
  const keyword = text(params?.keyword || params?.wd || "");
  const page = parseInt(params?.page || "1", 10) || 1;
  if (!keyword) return { list: [], page: 1, pagecount: 0, total: 0 };

  const data = await fetchApi({ ac: "list", wd: keyword, pg: page });
  const list = (Array.isArray(data.list) ? data.list : []).map(mapListItem).filter((it) => !isMainBlocked(it.main_type_id || it.type_id));
  return {
    list,
    page: Number(data.page || page || 1),
    pagecount: Number(data.pagecount || page || 1),
    total: Number(data.total || list.length || 0),
    limit: Number(data.limit || 20)
  };
}

async function detail(params, context) {
  try {
    const videoId = text(params?.videoId || "");
    if (!videoId) return { list: [] };

    await OmniBox.log("info", `[detail] 开始处理 videoId=${videoId}`);
    const data = await fetchApi({ ac: "detail", ids: videoId });
    const item = Array.isArray(data.list) && data.list.length ? data.list[0] : null;
    if (!item) {
      await OmniBox.log("warn", `[detail] 未获取到详情数据 videoId=${videoId}`);
      return { list: [] };
    }

    const mainTypeId = resolveMainTypeId(item.type_id, item.type_id_1 || "");
    if (isMainBlocked(mainTypeId)) {
      await OmniBox.log("warn", `[detail] 命中屏蔽主类 mainTypeId=${mainTypeId}, videoId=${videoId}`);
      return { list: [] };
    }

    const resourceId = buildResourceId(videoId);
    const { sources, videoFiles } = parsePlaySources(item.vod_play_from, item.vod_play_url, videoId, item.vod_name);

    await OmniBox.log(
      "info",
      `[detail] 播放数据已解析 videoId=${videoId}, resourceId=${resourceId}, sourceCount=${sources.length}, videoFileCount=${videoFiles.length}, vodName=${text(item.vod_name)}`
    );

    let scrapeData = null;
    if (videoFiles.length > 0) {
      const scrapeKeyword = buildScrapeKeyword(item);
      await OmniBox.log(
        "info",
        `[detail] 准备执行刮削 resourceId=${resourceId}, keyword=${scrapeKeyword}, resourceName=${text(item.vod_name)}, firstFile=${text(videoFiles[0]?.file_name)}`
      );
      try {
        // processScraping 在采集源中是同步阻塞的，等刮削完成后才返回
        // 调用完成后可立即读取元数据，不需要轮询
        const scrapingResult = await OmniBox.processScraping(resourceId, scrapeKeyword, text(item.vod_name), videoFiles);
        await OmniBox.log("info", `[detail] processScraping 调用完成 resourceId=${resourceId}, result=${JSON.stringify(scrapingResult || {}).substring(0, 300)}`);
      } catch (error) {
        await OmniBox.log("warn", `[detail] processScraping 失败 resourceId=${resourceId}, error=${error.message}`);
      }
    } else {
      await OmniBox.log("warn", `[detail] 未解析出任何 videoFiles，跳过刮削 resourceId=${resourceId}`);
    }

    const enriched = await enrichPlaySourcesWithMetadata(sources, resourceId);
    const playSources = enriched.playSources;
    scrapeData = enriched.scrapeData;

    await OmniBox.log(
      "info",
      `[detail] 刮削回填结束 resourceId=${resourceId}, hasScrapeData=${!!scrapeData}, finalSourceCount=${playSources.length}, totalEpisodeCount=${playSources.reduce((n, s) => n + ((s.episodes || []).length), 0)}`
    );

    const vod = {
      vod_id: text(item.vod_id),
      vod_name: text(scrapeData?.title || item.vod_name),
      vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : fixUrl(item.vod_pic),
      vod_remarks: text(item.vod_remarks),
      vod_year: text((scrapeData?.releaseDate || item.vod_year || "").slice?.(0, 4) || item.vod_year || ""),
      vod_area: text(item.vod_area),
      vod_lang: text(item.vod_lang),
      vod_director: text(item.vod_director || scrapeData?.credits?.crew?.filter?.((x) => x.job === "Director").map?.((x) => x.name).join(",") || ""),
      vod_actor: text(item.vod_actor || scrapeData?.credits?.cast?.slice?.(0, 8).map?.((x) => x.name).join(",") || ""),
      vod_class: text(item.vod_class || inferTypeName(mainTypeId, item.type_name || "")),
      vod_content: text(scrapeData?.overview || item.vod_content).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
      vod_play_sources: playSources,
      vod_douban_score: text(scrapeData?.voteAverage != null ? Number(scrapeData.voteAverage).toFixed(1) : (item.vod_douban_score || ""))
    };

    await OmniBox.log(
      "info",
      `[detail] 最终返回 videoId=${videoId}, vodName=${vod.vod_name}, vodYear=${vod.vod_year}, vodScore=${vod.vod_douban_score}, hasPoster=${!!vod.vod_pic}, hasContent=${!!vod.vod_content}`
    );

    return { list: [vod] };
  } catch (error) {
    await OmniBox.log("error", `detail 失败: ${error.message}`);
    return { list: [] };
  }
}

async function play(params, context) {
  try {
    const playId = text(params?.playId || "");
    const meta = b64Decode(playId);
    const url = fixUrl(meta.url || "");
    const resourceId = text(meta.resourceId || "");
    const fileId = text(meta.fileId || "");
    const vodId = text(meta.vodId || "");
    const title = text(meta.name || params?.title || "");
    const epName = text(meta.epName || "");

    await OmniBox.log(
      "info",
      `[play] 开始处理 vodId=${vodId}, resourceId=${resourceId}, fileId=${fileId}, title=${title}, epName=${epName}, hasUrl=${!!url}`
    );

    if (!url) {
      await OmniBox.log("warn", `[play] playId 无法解出有效 URL, playId=${playId.slice(0, 120)}`);
      return {
        urls: [],
        parse: 1,
        header: {
          "User-Agent": UA,
          "Referer": `${HOST}/`
        },
        danmaku: []
      };
    }

    let danmaku = [];
    let scrapeData = null;
    let mapping = null;

    if (resourceId && fileId) {
      try {
        await OmniBox.log("info", `[play] 开始读取刮削元数据 resourceId=${resourceId}, fileId=${fileId}`);
        const metadata = await OmniBox.getScrapeMetadata(resourceId);
        scrapeData = metadata?.scrapeData || null;
        const mappings = Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [];
        mapping = mappings.find((m) => String(m?.fileId || "") === fileId) || null;

        await OmniBox.log(
          "info",
          `[play] 元数据读取完成 resourceId=${resourceId}, hasScrapeData=${!!scrapeData}, mappingCount=${mappings.length}, mappingMatched=${!!mapping}`
        );

        const fileName = buildDanmakuFileName(scrapeData, mapping, title, epName);
        await OmniBox.log("info", `[play] 构造弹幕匹配文件名 fileName=${fileName}`);

        if (fileName) {
          danmaku = await OmniBox.getDanmakuByFileName(fileName);
          await OmniBox.log("info", `[play] 弹幕匹配完成 fileName=${fileName}, danmakuCount=${Array.isArray(danmaku) ? danmaku.length : 0}`);
        }
      } catch (error) {
        await OmniBox.log("warn", `[play] 弹幕匹配失败: ${error.message}`);
      }
    } else {
      await OmniBox.log("warn", `[play] 缺少 resourceId 或 fileId，跳过弹幕匹配 resourceId=${resourceId}, fileId=${fileId}`);
    }

    const parse = /\.(m3u8|mp4|flv|webm)(\?|$)/i.test(url) ? 0 : 1;
    const header = {
      "User-Agent": UA,
      "Referer": `${HOST}/`
    };

    await OmniBox.log("info", `[play] 播放地址已确定 parse=${parse}, url=${url.slice(0, 200)}`);

    try {
      const historyPayload = {
        vodId: vodId || resourceId || title,
        title: title || vodId,
        episode: playId,
        episodeName: mapping?.episodeName || epName || undefined,
        episodeNumber: mapping?.episodeNumber != null ? mapping.episodeNumber : undefined,
        pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : undefined,
        playUrl: url,
        playHeader: header
      };
      await OmniBox.log("info", `[play] 准备写入观看记录 vodId=${historyPayload.vodId}, episodeName=${historyPayload.episodeName || ""}, episodeNumber=${historyPayload.episodeNumber ?? ""}`);
      await OmniBox.addPlayHistory(historyPayload);
      await OmniBox.log("info", `[play] 观看记录写入完成 vodId=${historyPayload.vodId}`);
    } catch (error) {
      await OmniBox.log("warn", `[play] 添加观看记录失败: ${error.message}`);
    }

    return {
      urls: [{ name: epName || meta.flag || "播放", url }],
      parse,
      header,
      danmaku: Array.isArray(danmaku) ? danmaku : []
    };
  } catch (error) {
    await OmniBox.log("error", `play 失败: ${error.message}`);
    return {
      urls: [],
      parse: 1,
      header: {
        "User-Agent": UA,
        "Referer": `${HOST}/`
      },
      danmaku: []
    };
  }
}

module.exports = { home, category, search, detail, play };
runner.run(module.exports);

});

_load(9, "瓜子", function (module, exports, require) {
// @name 瓜子APP
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @version 1.1.0
// @dependencies: axios, crypto
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/瓜子.js

/**
 * ============================================================================
 * 瓜子APP - OmniBox 爬虫脚本
 * ============================================================================
 *
 * 对齐最新 Guazi 协议（2026-07）：动态 token + 新 AES/headers/多域名
 * ============================================================================
 */

const OmniBox = require("omnibox_sdk");
const crypto = require("crypto");
const axios = require("axios");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * 对齐最新 Guazi Java 源（2026-07）：动态 token + 新 AES/headers
 */
const API_HOSTS = [
    "https://apinew.uozvr.com",
    "https://api.w32z7vtd.com",
    "https://api.6a7nnf7.com",
    "https://api.umygrx3.com",
    "https://api.rmedphk.com",
];

const AES_KEY = "OITxa5OqAYjhswxx";
const AES_IV = "rCMNwZASNBKZ8mXV";
const DEVICE_OLD_KEY = "aLFBMWpxBrIDAD1Si/KVvm41";
const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDUM5+/y8sPsWkd1/RQS64X259E
UwxFXFE5HlA65MqrxnPs0JqoSRojSDy5QhwvROlaD6TwRQHKMY2OAZ6SnQeUJsCh
TEFIR9qUkwrs3/MVUMxjsv6JS6Oe/juclyJGTgVmDhB55EafXsD0SQYVj/QXXsxR
6ewR5E2kL52yAAD4yQIDAQAB
-----END PUBLIC KEY-----`;
const RSA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGAe6hKrWLi1zQmjTT1
ozbE4QdFeJGNxubxld6GrFGximxfMsMB6BpJhpcTouAqywAFppiKetUBBbXwYsYU
1wNr648XVmPmCMCy4rY8vdliFnbMUj086DU6Z+/oXBdWU3/b1G0DN3E9wULRSwcK
ZT3wj/cCI1vsCm3gj2R5SqkA9Y0CAwEAAQKBgAJH+4CxV0/zBVcLiBCHvSANm0l7
HetybTh/j2p0Y1sTXro4ALwAaCTUeqdBjWiLSo9lNwDHFyq8zX90+gNxa7c5EqcW
V9FmlVXr8VhfBzcZo1nXeNdXFT7tQ2yah/odtdcx+vRMSGJd1t/5k5bDd9wAvYdI
DblMAg+wiKKZ5KcdAkEA1cCakEN4NexkF5tHPRrR6XOY/XHfkqXxEhMqmNbB9U34
saTJnLWIHC8IXys6Qmzz30TtzCjuOqKRRy+FMM4TdwJBAJQZFPjsGC+RqcG5UvVM
iMPhnwe/bXEehShK86yJK/g/UiKrO87h3aEu5gcJqBygTq3BBBoH2md3pr/W+hUM
WBsCQQChfhTIrdDinKi6lRxrdBnn0Ohjg2cwuqK5zzU9p/N+S9x7Ck8wUI53DKm8
jUJE8WAG7WLj/oCOWEh+ic6NIwTdAkEAj0X8nhx6AXsgCYRql1klbqtVmL8+95KZ
K7PnLWG/IfjQUy3pPGoSaZ7fdquG8bq8oyf5+dzjE/oTXcByS+6XRQJAP/5ciy1b
L3NhUhsaOVy55MHXnPjdcTX0FaLi+ybXZIfIQ2P4rb19mVq1feMbCXhz+L1rG8oa
t5lYKfpe8k83ZA==
-----END PRIVATE KEY-----`;

const PLAY_UA = "Lavf/57.83.100";
const PLAY_REFERER = "http://WJiZxLXA2.com/";
const AUTH_FILE = process.env.GUAZI_AUTH_FILE || path.join(os.tmpdir(), "guazi_auth.json");
const DANMU_API = process.env.DANMU_API || "";

const state = {
    apiHost: API_HOSTS[0],
    token: "",
    tokenId: "",
    deviceId: "",
    deviceKey: "",
    registered: false,
    tokenReady: false,
    hostReady: false,
};

/**
 * 分类配置
 */
const CLASSES = [
    { type_id: "1", type_name: "电影" },
    { type_id: "2", type_name: "电视剧" },
    { type_id: "4", type_name: "动漫" },
    { type_id: "3", type_name: "综艺" },
    { type_id: "64", type_name: "短剧" }
];

/**
 * Java SUB_MAP
 */
const SUB_MAP = {
    "1": "5",
    "2": "12",
    "3": "30",
    "4": "22",
    "64": "",
    "5": "0",
};

/**
 * 筛选配置
 */
const FILTERS = {
    '1': [
        {
            key: 'year',
            name: '年份',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '2026', value: '2026' },
                { name: '2025', value: '2025' },
                { name: '2024', value: '2024' },
                { name: '2023', value: '2023' },
                { name: '2022', value: '2022' },
                { name: '2021', value: '2021' },
                { name: '2020', value: '2020' },
                { name: '2019', value: '2019' },
                { name: '2018', value: '2018' },
                { name: '2017', value: '2017' },
                { name: '2016', value: '2016' },
                { name: '2015', value: '2015' },
                { name: '2014', value: '2014' },
                { name: '2013', value: '2013' },
                { name: '2012', value: '2012' },
                { name: '2011', value: '2011' },
                { name: '2010', value: '2010' },
                { name: '2009', value: '2009' },
                { name: '2008', value: '2008' },
                { name: '2007', value: '2007' },
                { name: '2006', value: '2006' },
                { name: '2005', value: '2005' },
                { name: '更早', value: '2004' }
            ]
        },
        {
            key: 'area',
            name: '地区',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '大陆', value: '大陆' },
                { name: '香港', value: '香港' },
                { name: '台湾', value: '台湾' },
                { name: '美国', value: '美国' },
                { name: '韩国', value: '韩国' },
                { name: '日本', value: '日本' },
                { name: '英国', value: '英国' },
                { name: '法国', value: '法国' },
                { name: '泰国', value: '泰国' },
                { name: '印度', value: '印度' },
                { name: '其他', value: '其他' }
            ]
        },
        {
            key: 'sort',
            name: '排序',
            init: 'd_id',
            value: [
                { name: '最新', value: 'd_id' },
                { name: '最热', value: 'd_hits' },
                { name: '推荐', value: 'd_score' }
            ]
        }
    ],
    '2': [
        {
            key: 'year',
            name: '年份',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '2026', value: '2026' },
                { name: '2025', value: '2025' },
                { name: '2024', value: '2024' },
                { name: '2023', value: '2023' },
                { name: '2022', value: '2022' },
                { name: '2021', value: '2021' },
                { name: '2020', value: '2020' },
                { name: '2019', value: '2019' },
                { name: '2018', value: '2018' },
                { name: '2017', value: '2017' },
                { name: '2016', value: '2016' },
                { name: '2015', value: '2015' },
                { name: '2014', value: '2014' },
                { name: '2013', value: '2013' },
                { name: '2012', value: '2012' },
                { name: '2011', value: '2011' },
                { name: '2010', value: '2010' },
                { name: '2009', value: '2009' },
                { name: '2008', value: '2008' },
                { name: '2007', value: '2007' },
                { name: '2006', value: '2006' },
                { name: '2005', value: '2005' },
                { name: '更早', value: '2004' }
            ]
        },
        {
            key: 'area',
            name: '地区',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '大陆', value: '大陆' },
                { name: '香港', value: '香港' },
                { name: '台湾', value: '台湾' },
                { name: '美国', value: '美国' },
                { name: '韩国', value: '韩国' },
                { name: '日本', value: '日本' },
                { name: '英国', value: '英国' },
                { name: '法国', value: '法国' },
                { name: '泰国', value: '泰国' },
                { name: '印度', value: '印度' },
                { name: '其他', value: '其他' }
            ]
        },
        {
            key: 'sort',
            name: '排序',
            init: 'd_id',
            value: [
                { name: '最新', value: 'd_id' },
                { name: '最热', value: 'd_hits' },
                { name: '推荐', value: 'd_score' }
            ]
        }
    ],
    '4': [
        {
            key: 'year',
            name: '年份',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '2026', value: '2026' },
                { name: '2025', value: '2025' },
                { name: '2024', value: '2024' },
                { name: '2023', value: '2023' },
                { name: '2022', value: '2022' },
                { name: '2021', value: '2021' },
                { name: '2020', value: '2020' },
                { name: '2019', value: '2019' },
                { name: '2018', value: '2018' },
                { name: '2017', value: '2017' },
                { name: '2016', value: '2016' },
                { name: '2015', value: '2015' }
            ]
        },
        {
            key: 'area',
            name: '地区',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '大陆', value: '大陆' },
                { name: '日本', value: '日本' },
                { name: '美国', value: '美国' },
                { name: '其他', value: '其他' }
            ]
        },
        {
            key: 'sort',
            name: '排序',
            init: 'd_id',
            value: [
                { name: '最新', value: 'd_id' },
                { name: '最热', value: 'd_hits' },
                { name: '推荐', value: 'd_score' }
            ]
        }
    ],
    '3': [
        {
            key: 'year',
            name: '年份',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '2026', value: '2026' },
                { name: '2025', value: '2025' },
                { name: '2024', value: '2024' },
                { name: '2023', value: '2023' },
                { name: '2022', value: '2022' }
            ]
        },
        {
            key: 'area',
            name: '地区',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '大陆', value: '大陆' },
                { name: '台湾', value: '台湾' },
                { name: '韩国', value: '韩国' }
            ]
        },
        {
            key: 'sort',
            name: '排序',
            init: 'd_id',
            value: [
                { name: '最新', value: 'd_id' },
                { name: '最热', value: 'd_hits' },
                { name: '推荐', value: 'd_score' }
            ]
        }
    ],
    '64': [
        {
            key: 'year',
            name: '年份',
            init: '0',
            value: [
                { name: '全部', value: '0' },
                { name: '2026', value: '2026' },
                { name: '2025', value: '2025' },
                { name: '2024', value: '2024' },
                { name: '2023', value: '2023' }
            ]
        },
        {
            key: 'sort',
            name: '排序',
            init: 'd_id',
            value: [
                { name: '最新', value: 'd_id' },
                { name: '最热', value: 'd_hits' },
                { name: '推荐', value: 'd_score' }
            ]
        }
    ]
};

/**
 * API 路径
 */
const API_PATHS = {
    INDEX_LIST: '/App/IndexList/indexList',
    PLAY_INFO: '/App/IndexPlay/playInfo',
    VURL_SHOW: '/App/Resource/Vurl/show',
    VURL_DETAIL: '/App/Resource/VurlDetail/showOne',
    FIND_MORE: '/App/Index/findMoreVod',
    SIGN_UP: '/App/Authentication/Device/signUp',
    SIGN_IN: '/App/Authentication/Device/signIn',
    REFRESH: '/App/Authentication/Authenticator/refresh'
};

/**
 * 缓存管理
 */
const cache = {
    data: new Map(),
    ttl: {
        category: 300000,
        detail: 600000,
        play: 300000,
        search: 60000
    },
    get: (key) => {
        const item = cache.data.get(key);
        if (!item) return null;
        if (Date.now() > item.expire) {
            cache.data.delete(key);
            return null;
        }
        return item.data;
    },
    set: (key, data, type = 'category') => {
        cache.data.set(key, {
            data,
            expire: Date.now() + cache.ttl[type]
        });
        if (cache.data.size > 200) cache.data.clear();
    }
};

/**
 * 日志工具
 */
const logInfo = (message, data = null) => {
    if (data) {
        OmniBox.log("info", `[瓜子APP] ${message}: ${JSON.stringify(data)}`);
    } else {
        OmniBox.log("info", `[瓜子APP] ${message}`);
    }
};

const logError = (message, error) => {
    OmniBox.log("error", `[瓜子APP] ${message}: ${error.message || error}`);
};

const logWarn = (message) => {
    OmniBox.log("warn", `[瓜子APP] ${message}`);
};

function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    if (!value || typeof value !== "object") return JSON.stringify(value);
    return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(",")}}`;
}

function apiJsonStringify(value) {
    return JSON.stringify(value).replace(/[^\x00-\x7F]/g, (char) => {
        return `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
    });
}

function md5Upper(value) {
    return crypto.createHash("md5").update(String(value)).digest("hex").toUpperCase();
}

function aesEncryptHex(text, key = AES_KEY, iv = AES_IV) {
    const cipher = crypto.createCipheriv("aes-128-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
    cipher.setAutoPadding(true);
    return Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]).toString("hex").toUpperCase();
}

function aesDecryptHex(hexText, key, iv) {
    const decipher = crypto.createDecipheriv("aes-128-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
    decipher.setAutoPadding(true);
    return Buffer.concat([
        decipher.update(Buffer.from(String(hexText || ""), "hex")),
        decipher.final(),
    ]).toString("utf8");
}

function rsaEncrypt(data) {
    return crypto
        .publicEncrypt(
            { key: RSA_PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
            Buffer.from(String(data), "utf8")
        )
        .toString("base64");
}

function rsaDecrypt(encryptedText) {
    const encrypted = Buffer.from(String(encryptedText || ""), "base64");
    try {
        return crypto
            .privateDecrypt({ key: RSA_PRIVATE_KEY, padding: crypto.constants.RSA_PKCS1_PADDING }, encrypted)
            .toString("utf8");
    } catch (error) {
        if (!crypto.constants.RSA_NO_PADDING) throw error;
    }
    const raw = crypto.privateDecrypt({ key: RSA_PRIVATE_KEY, padding: crypto.constants.RSA_NO_PADDING }, encrypted);
    if (raw[0] !== 0x00 || raw[1] !== 0x02) throw new Error("响应密钥 RSA padding 不匹配");
    const split = raw.indexOf(0x00, 2);
    if (split < 10) throw new Error("响应密钥 RSA padding 无效");
    return raw.slice(split + 1).toString("utf8");
}

function loadAuth() {
    try {
        if (fs.existsSync(AUTH_FILE)) {
            const data = JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
            state.token = String(data.token || "");
            state.tokenId = String(data.tokenId || data.token_id || "");
            state.deviceId = String(data.deviceId || data.device_id || "");
            state.deviceKey = String(data.deviceKey || data.device_key || "");
            state.registered = !!data.registered || !!state.token;
        }
    } catch {}

    if (state.deviceId && state.deviceKey) return;

    state.deviceId = String(864150060000000 + Math.floor(Math.random() * 10000));
    state.deviceKey = crypto.randomBytes(20).toString("hex").toUpperCase();
    state.token = "";
    state.tokenId = "";
    state.registered = false;
    saveAuth();
}

function saveAuth() {
    try {
        fs.writeFileSync(
            AUTH_FILE,
            JSON.stringify(
                {
                    token: state.token,
                    tokenId: state.tokenId,
                    deviceId: state.deviceId,
                    deviceKey: state.deviceKey,
                    registered: state.registered,
                },
                null,
                2
            )
        );
    } catch (e) {
        logWarn(`保存认证信息失败: ${e.message}`);
    }
}

function getHeaders() {
    return {
        "User-Agent": PLAY_UA,
        code: "GZ0369",
        deviceId: state.deviceId || "",
        lang: "zh_cn",
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-www-form-urlencoded",
        Version: "2604028",
        PackageName: "com.ae06aebdbb.y286327f5a.ofe849883320260517",
        Ver: "3.0.3.2",
        "api-ver": "3.0.3.2",
    };
}

const client = axios.create({
    timeout: 22000,
    maxRedirects: 3,
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
    validateStatus: () => true,
});

async function findAvailableHost() {
    for (const host of API_HOSTS) {
        try {
            const res = await axios.head(host, {
                timeout: 3000,
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                validateStatus: () => true,
                headers: { "User-Agent": "Mozilla/5.0" },
            });
            if (res.status >= 200 && res.status < 500) {
                state.apiHost = host;
                state.hostReady = true;
                logInfo("选用 API 域名", { host });
                return host;
            }
        } catch {}
    }
    state.apiHost = API_HOSTS[0];
    state.hostReady = true;
    return state.apiHost;
}

async function ensureHost() {
    if (!state.hostReady) await findAvailableHost();
    return state.apiHost;
}

function applyAuth(result = {}) {
    const newToken = String(result.token || "");
    if (!newToken) throw new Error(`Token 获取失败: ${JSON.stringify(result)}`);
    state.token = newToken;
    const newTokenId = String(result.app_user_id || result.token_id || "");
    if (newTokenId) state.tokenId = newTokenId;
    saveAuth();
}

async function rawApiRequest(path, params = {}, retry = 0, options = {}) {
    const authPath = String(path).startsWith("/App/Authentication/");
    if (!authPath) await ensureToken();

    const host = await ensureHost();
    const requestParams = { ...(params || {}) };
    if (Object.prototype.hasOwnProperty.call(requestParams, "token")) requestParams.token = state.token;
    if (Object.prototype.hasOwnProperty.call(requestParams, "token_id")) requestParams.token_id = state.tokenId;

    const useCache = options.useCache === true && !authPath;
    const cacheKey = `${host}|${path}|${stableStringify(requestParams)}|${state.tokenId}`;
    if (useCache) {
        const cached = cache.get(cacheKey);
        if (cached) {
            logInfo("使用缓存数据", { path });
            return cached;
        }
    }

    const jsonParams = apiJsonStringify(requestParams);
    const requestKey = aesEncryptHex(jsonParams);
    const time = String(Math.floor(Date.now() / 1000));
    const keys = rsaEncrypt(JSON.stringify({ iv: AES_IV, key: AES_KEY }));
    const tokenForSign = state.token || "";
    const signStr =
        `token_id=,token=${tokenForSign},phone_type=1,request_key=${requestKey}` +
        `,app_id=1,time=${time},keys=${keys}*&zvdvdvddbfikkkumtmdwqppp?|4Y!s!2br`;
    const signature = md5Upper(signStr);

    const body = new URLSearchParams({
        token: tokenForSign,
        token_id: "",
        phone_type: "1",
        time,
        phone_model: "xiaomi-25031",
        keys,
        request_key: requestKey,
        signature,
        app_id: "1",
        ad_version: "1",
    }).toString();

    logInfo(`发送API请求`, { url: `${host}${path}`, retry });
    const res = await client.post(`${host}${path}`, body, { headers: getHeaders() });
    if (res.status < 200 || res.status >= 400) {
        throw new Error(`HTTP ${res.status} ${path}`);
    }

    const response = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    if (!response || typeof response !== "object") throw new Error(`空响应 ${path}`);

    if (response.code != null && Number(response.code) !== 200) {
        if (retry < 1 && !authPath) {
            state.tokenReady = false;
            await ensureToken(true);
            return rawApiRequest(path, params, retry + 1, options);
        }
        throw new Error(`请求失败: ${JSON.stringify(response)}`);
    }

    const encryptedData = response.data || {};
    if (!encryptedData.keys || !encryptedData.response_key) {
        throw new Error(`API 返回缺少加密数据: ${path}`);
    }
    const keyInfo = JSON.parse(rsaDecrypt(encryptedData.keys));
    const decrypted = aesDecryptHex(encryptedData.response_key, keyInfo.key, keyInfo.iv);
    const result = JSON.parse(decrypted);
    if (useCache) {
        const cacheType = options.cacheType || "category";
        cache.set(cacheKey, result, cacheType);
    }
    logInfo("API请求成功", { path });
    return result;
}

async function signUp() {
    const result = await rawApiRequest(API_PATHS.SIGN_UP, {
        new_key: state.deviceKey,
        old_key: DEVICE_OLD_KEY,
        phone_type: 1,
        code: "",
    });
    applyAuth(result);
    state.registered = true;
    saveAuth();
}

async function signIn() {
    const result = await rawApiRequest(API_PATHS.SIGN_IN, {
        new_key: state.deviceKey,
        old_key: DEVICE_OLD_KEY,
    });
    applyAuth(result);
}

async function ensureToken(force = false) {
    if (!force && state.tokenReady && state.token) return;
    loadAuth();
    if (!state.token) {
        if (state.registered) await signIn();
        else await signUp();
    }
    try {
        applyAuth(await rawApiRequest(API_PATHS.REFRESH, {}));
    } catch (error) {
        if (!state.registered) throw error;
        await signIn();
    }
    state.tokenReady = true;
}

/**
 * API 请求函数（兼容旧调用）
 */
const apiRequest = async (data, path, cacheType = "category", retries = 1) => {
    try {
        return await rawApiRequest(path, data, 0, {
            useCache: cacheType !== "none",
            cacheType: cacheType === "none" ? "category" : cacheType,
        });
    } catch (e) {
        if (retries > 0) {
            logWarn(`API请求失败，重试: ${e.message}`);
            try {
                return await rawApiRequest(path, data, 0, {
                    useCache: false,
                    cacheType: cacheType === "none" ? "category" : cacheType,
                });
            } catch (e2) {
                logError("API请求最终失败", e2);
                return null;
            }
        }
        logError("API请求最终失败", e);
        return null;
    }
};

/**
 * 获取分辨率分数（用于排序）
 */
const getResolutionScore = (res) => {
    const r = String(res || "").toLowerCase().replace("p", "");
    if (r === "8k") return 100;
    if (r === "4k" || r === "2160") return 90;
    if (r === "1440") return 80;
    if (r === "1080") return 70;
    if (r === "720") return 60;
    if (r === "超清") return 50;
    if (r === "高清") return 40;
    if (r === "标清") return 30;
    return 10;
};

function parseParamString(value) {
    const text = String(value || "").replace(/&amp;/g, "&").replace(/^\?/, "");
    const params = {};
    for (const [key, val] of new URLSearchParams(text)) {
        params[key === "vod_d_id" ? "vod_id" : key] = val;
    }
    return params;
}

/**
 * 弹幕工具函数
 */
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
    } catch (e) {
        logWarn(`弹幕匹配失败: ${e.message}`);
        return [];
    }
};

const encodeMeta = (obj) => {
    try {
        return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
    } catch {
        return '';
    }
};

const decodeMeta = (str) => {
    try {
        const raw = Buffer.from(str, 'base64').toString('utf8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

const extractVodIdForApi = (rawVideoId) => {
    const text = String(rawVideoId || '').trim();
    if (!text) return '';

    const decoded = decodeURIComponent(text);
    const pathMatch = decoded.match(/\/id\/(\d+)\.html/i);
    if (pathMatch?.[1]) return pathMatch[1];

    const firstPart = decoded.split('/')[0];
    if (/^\d+$/.test(firstPart)) return firstPart;

    const numMatch = decoded.match(/(\d+)/);
    return numMatch?.[1] || decoded;
};

/* ============================================================================
 * OmniBox 接口实现
 * ============================================================================ */

/**
 * 获取首页数据
 */
async function home(params) {
    try {
        logInfo('处理首页请求');

        const data = await apiRequest({
            area: '0',
            year: '0',
            pageSize: '100',
            sort: 'd_id',
            page: '1'
        }, API_PATHS.INDEX_LIST, 'category');

        let list = [];
        if (data?.list) {
            list = data.list.map(item => ({
                vod_id: `${item.vod_id}/${item.vod_continu || 0}`,
                vod_name: item.vod_name,
                vod_pic: item.vod_pic,
                vod_remarks: (item.vod_continu || 0) === 0 ? '电影' : `更新至${item.vod_continu}集`
            }));
        }

        return {
            class: CLASSES,
            filters: FILTERS,
            list
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

        const area = filters.area || '0';
        const year = filters.year || '0';
        const sort = filters.sort || 'd_id';
        const tid = String(categoryId);

        logInfo('获取分类列表', { categoryId, page, area, year, sort });

        const data = await apiRequest({
            area: area,
            year: year,
            pageSize: "20",
            sort: sort,
            page: page.toString(),
            tid: tid,
            sub: SUB_MAP[tid] != null ? SUB_MAP[tid] : "0",
        }, API_PATHS.INDEX_LIST, 'category');

        if (!data || !data.list) {
            logWarn('分类列表数据为空');
            return { list: [], page: page, pagecount: 0 };
        }

        const totalPage = parseInt(data.totalPage || 0);

        const list = data.list.map(item => ({
            vod_id: `${item.vod_id}/${item.vod_continu || 0}`,
            vod_name: item.vod_name,
            vod_pic: item.vod_pic,
            vod_remarks: (item.vod_continu || 0) === 0 ? '电影' : `更新至${item.vod_continu}集`
        }));

        logInfo('分类列表获取成功', { count: list.length });

        return {
            list: list,
            page: parseInt(page),
            pagecount: totalPage === 0 ? 999 : totalPage
        };
    } catch (error) {
        logError('获取分类数据失败', error);
        return {
            page: 1,
            pagecount: 0,
            list: []
        };
    }
}

/**
 * 搜索视频
 */
async function search(params) {
    try {
        const keyword = params.keyword || params.wd || "";
        const page = params.page || 1;

        if (!keyword) {
            return {
                page: 1,
                pagecount: 0,
                list: []
            };
        }

        logInfo('执行搜索', { keyword, page });

        const data = await apiRequest({
            keywords: keyword,
            order_val: "1",
            page: page.toString()
        }, API_PATHS.FIND_MORE, 'search');

        if (!data || !data.list) {
            logWarn('搜索结果为空');
            return { list: [], page: page, pagecount: 0 };
        }

        const totalPage = parseInt(data.totalPage || 0);

        const filteredList = data.list
            .filter(item => item.vod_name && item.vod_name.toLowerCase().includes(keyword.toLowerCase()))
            .map(item => ({
                vod_id: `${item.vod_id}/${item.vod_continu || 0}`,
                vod_name: item.vod_name,
                vod_pic: item.vod_pic,
                vod_remarks: (item.vod_continu || 0) === 0 ? '电影' : `更新至${item.vod_continu}集`
            }));

        logInfo('搜索完成(已过滤)', { keyword, count: filteredList.length });

        return {
            list: filteredList,
            page: parseInt(page),
            pagecount: totalPage === 0 ? 1 : totalPage
        };
    } catch (error) {
        logError('搜索视频失败', error);
        return {
            page: 1,
            pagecount: 0,
            list: []
        };
    }
}

/**
 * 获取视频详情
 */
async function detail(params) {
    try {
        const videoId = params.videoId;

        if (!videoId) {
            throw new Error("视频ID不能为空");
        }

        logInfo('获取视频详情', { videoId });

        const ids = Array.isArray(videoId) ? videoId : [videoId];
        const results = [];

        await Promise.all(ids.map(async (idStr) => {
            try {
                const videoIdForScrape = String(idStr || '');
                const vodId = extractVodIdForApi(idStr);

                await ensureToken();

                const [detailData, playData] = await Promise.all([
                    apiRequest({
                        token_id: state.tokenId,
                        vod_id: vodId,
                        mobile_time: Math.floor(Date.now() / 1000).toString(),
                        token: state.token
                    }, API_PATHS.PLAY_INFO, 'detail'),
                    apiRequest({
                        vurl_cloud_id: "2",
                        vod_d_id: vodId
                    }, API_PATHS.VURL_SHOW, 'detail')
                ]);

                if (!detailData?.vodInfo) {
                    logWarn(`视频${vodId}详情为空`);
                    return;
                }

                const vod = detailData.vodInfo;

                const vodPlaySources = [];
                const scrapeCandidates = [];
                if (playData?.list) {
                    playData.list.forEach((item, index) => {
                        if (!item.play) return;

                        const resolutions = [];
                        const params = [];

                        for (const [key, val] of Object.entries(item.play)) {
                            if (val.param) {
                                resolutions.push(key);
                                params.push(val.param);
                            }
                        }

                        if (params.length > 0) {
                            resolutions.sort((a, b) => getResolutionScore(b) - getResolutionScore(a));
                            const playName = playData.list.length === 1
                                ? (vod.vod_name || '正片')
                                : (item.name || (index + 1).toString());
                            const playUrl = `${params[0]}||${resolutions.join('@')}`;

                            if (vodPlaySources.length === 0) {
                                vodPlaySources.push({
                                    name: '瓜子专线',
                                    episodes: []
                                });
                            }

                            const playIdForSource = `${playUrl}|||${encodeMeta({ v: vod.vod_name || '', e: playName, sid: `${videoIdForScrape}#${index}`, fid: `${videoIdForScrape}#${index}` })}`;

                            vodPlaySources[0].episodes.push({
                                name: playName,
                                playId: playIdForSource
                            });

                            scrapeCandidates.push({
                                fid: `${videoIdForScrape}#${index}`,
                                file_id: `${videoIdForScrape}#${index}`,
                                file_name: playName,
                                name: playName,
                                format_type: 'video'
                            });
                        }
                    });
                }

                let scrapeData = null;
                let videoMappings = [];
                if (scrapeCandidates.length > 0) {
                    try {
                        const scrapingResult = await OmniBox.processScraping(videoId, vod.vod_name || '', vod.vod_name || '', scrapeCandidates);
                        OmniBox.log('info', `[瓜子APP] 刮削处理完成,结果: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);
                        const metadata = await OmniBox.getScrapeMetadata(videoId);
                        scrapeData = metadata?.scrapeData || null;
                        videoMappings = metadata?.videoMappings || [];
                        logInfo('刮削完成', { vodId, mappingCount: videoMappings.length, hasScrapeData: !!scrapeData });
                    } catch (e) {
                        logWarn(`刮削处理失败: ${e.message}`);
                    }
                }

                if (vodPlaySources.length > 0 && Array.isArray(vodPlaySources[0].episodes) && vodPlaySources[0].episodes.length > 0) {
                    vodPlaySources[0].episodes.forEach((ep) => {
                        const playIdRaw = ep.playId || '';
                        const metaRaw = playIdRaw.includes('|||') ? playIdRaw.split('|||')[1] : '';
                        const meta = decodeMeta(metaRaw || '');
                        const mapping = videoMappings.find((m) => m?.fileId === meta.fid);
                        if (mapping?.episodeName) {
                            const oldName = ep.name;
                            ep.name = mapping.episodeNumber + "." + mapping.episodeName;
                            if (oldName !== ep.name) {
                                OmniBox.log('info', `[瓜子APP] 应用刮削后源文件名: ${oldName} -> ${ep.name}`);
                            }
                        }
                    });

                    const hasEpisodeNumber = vodPlaySources[0].episodes.some((ep) => {
                        const playIdRaw = ep.playId || '';
                        const metaRaw = playIdRaw.includes('|||') ? playIdRaw.split('|||')[1] : '';
                        const meta = decodeMeta(metaRaw || '');
                        const mapping = videoMappings.find((m) => m?.fileId === meta.fid);
                        return mapping && mapping.episodeNumber !== undefined && mapping.episodeNumber !== null;
                    });

                    if (hasEpisodeNumber) {
                        vodPlaySources[0].episodes.sort((a, b) => {
                            const metaA = decodeMeta((a.playId || '').split('|||')[1] || '');
                            const metaB = decodeMeta((b.playId || '').split('|||')[1] || '');
                            const mapA = videoMappings.find((m) => m?.fileId === metaA.fid) || {};
                            const mapB = videoMappings.find((m) => m?.fileId === metaB.fid) || {};
                            const seasonA = mapA.seasonNumber || 0;
                            const seasonB = mapB.seasonNumber || 0;
                            if (seasonA !== seasonB) return seasonA - seasonB;
                            const epA = mapA.episodeNumber || 0;
                            const epB = mapB.episodeNumber || 0;
                            return epA - epB;
                        });
                    }
                }

                const video = {
                    vod_id: videoIdForScrape,
                    vod_name: scrapeData?.title || vod.vod_name,
                    vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : vod.vod_pic,
                    vod_year: scrapeData?.releaseDate ? String(scrapeData.releaseDate).substring(0, 4) : vod.vod_year,
                    vod_area: vod.vod_area,
                    vod_actor: (scrapeData?.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(',') || vod.vod_actor,
                    vod_director: (scrapeData?.credits?.crew || []).filter((c) => c?.job === 'Director' || c?.department === 'Directing').slice(0, 3).map((c) => c?.name).filter(Boolean).join(',') || '',
                    vod_content: (scrapeData?.overview || vod.vod_use_content || '').trim(),
                    vod_play_sources: vodPlaySources.length > 0 ? vodPlaySources : undefined
                };

                results.push(video);
            } catch (e) {
                logError(`获取视频${idStr}详情失败`, e);
            }
        }));

        logInfo('详情获取成功', { count: results.length });

        return { list: results };
    } catch (error) {
        logError('获取视频详情失败', error);
        return { list: [] };
    }
}

/**
 * 获取播放地址
 */
async function play(params) {
    try {
        let playId = params.playId;
        let vodName = '';
        let episodeName = '';
        let playMeta = {};

        if (!playId) {
            throw new Error("播放地址ID不能为空");
        }

        if (playId.includes('|||')) {
            const [mainPlayId, metaB64] = playId.split('|||');
            playId = mainPlayId;
            playMeta = decodeMeta(metaB64 || '');
            vodName = playMeta.v || '';
            episodeName = playMeta.e || '';
        }

        let scrapedDanmuFileName = '';
        try {
            const videoIdFromParam = params.vodId ? String(params.vodId) : '';
            const videoIdFromMeta = playMeta?.sid ? String(playMeta.sid).split('#')[0] : '';
            const videoId = videoIdFromParam || videoIdFromMeta;
            const sourceIdByVod = videoId;

            let metadata = null;
            if (sourceIdByVod) {
                metadata = await OmniBox.getScrapeMetadata(sourceIdByVod);
            }

            if (metadata && metadata.scrapeData) {
                const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === playMeta?.fid);
                scrapedDanmuFileName = buildScrapedDanmuFileName(metadata.scrapeData, metadata.scrapeType || '', mapping, vodName, episodeName);
                if (metadata.scrapeData.title) {
                    vodName = metadata.scrapeData.title;
                }
                if (mapping?.episodeName) {
                    episodeName = mapping.episodeName;
                }
            }
        } catch (e) {
            logWarn(`读取刮削元数据失败: ${e.message}`);
        }

        logInfo('获取播放地址', { playId: playId });

        const playHeader = {
            "User-Agent": PLAY_UA,
            Referer: PLAY_REFERER,
        };

        const parts = playId.split('||');
        let playResponse;
        if (parts.length < 2) {
            playResponse = {
                urls: [{ name: '播放', url: playId }],
                header: playHeader,
                parse: 0
            };
        } else {
            const paramStr = parts[0];
            const resolutions = parts[1].split('@');

            const requestParams = parseParamString(paramStr);

            if (resolutions.length > 0) {
                resolutions.sort((a, b) => getResolutionScore(b) - getResolutionScore(a));
                requestParams.resolution = resolutions[0];
            }

            const data = await apiRequest(requestParams, API_PATHS.VURL_DETAIL, 'none');

            const playUrl = data?.url || '';

            logInfo('播放地址获取成功', { url: playUrl });

            playResponse = {
                urls: [{ name: '播放', url: playUrl }],
                header: playHeader,
                parse: 0
            };
        }

        if (DANMU_API && vodName) {
            const fileName = scrapedDanmuFileName || buildFileNameForDanmu(vodName, episodeName);
            logInfo(`尝试匹配弹幕文件名: ${fileName}`);
            if (fileName) {
                const danmakuList = await matchDanmu(fileName);
                if (danmakuList.length > 0) {
                    playResponse.danmaku = danmakuList;
                    logInfo('弹幕已添加到播放响应');
                }
            }
        } else if (!DANMU_API) {
            logInfo('DANMU_API 未配置，跳过弹幕匹配');
        }

        return playResponse;
    } catch (error) {
        logError('获取播放地址失败', error);
        return {
            urls: [],
            parse: 0
        };
    }
}

/* ============================================================================
 * 导出模块
 * ============================================================================ */

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

_load(10, "荐片", function (module, exports, require) {
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

_load(11, "金牌", function (module, exports, require) {
// @name 金牌
// @author 梦
// @description API 站：https://m.jiabaide.cn，支持首页、分类、搜索、详情与播放解析
// @version 1.1.4
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/金牌.js
// @dependencies crypto-js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const CryptoJS = require("crypto-js");

const BASE_URL = process.env.JINPAI_HOST || "https://m.jiabaide.cn";
const MOBILE_UA = "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36";
const APP_KEY = process.env.JINPAI_APP_KEY || "cb808529bae6b6be45ecfab29a4889bc";
const BASE_HEADERS = { "User-Agent": MOBILE_UA, Referer: `${BASE_URL}/` };

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

const CLASS_NAME_MAP = {
  typeList: ["type", "类型"],
  plotList: ["class", "剧情"],
  districtList: ["area", "地区"],
  languageList: ["lang", "语言"],
  yearList: ["year", "年份"],
  serialList: ["by", "排序"],
};

const SORT_VALUES = [
  { name: "最近更新", value: "1" },
  { name: "添加时间", value: "2" },
  { name: "人气高低", value: "3" },
  { name: "评分高低", value: "4" },
];

function getBodyText(res) {
  const body = res && typeof res === "object" && "body" in res ? res.body : res;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return body.toString();
  return String(body || "");
}

function text(value) {
  return String(value == null ? "" : value).trim();
}

function stripHtml(value) {
  return text(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function objToForm(obj = {}) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

function getSignedHeaders(obj = {}) {
  const t = String(Date.now());
  const signObj = { ...obj, key: APP_KEY, t };
  const objStr = objToForm(signObj);
  const md5 = CryptoJS.MD5(objStr).toString();
  const sign = CryptoJS.SHA1(md5).toString();
  return {
    ...BASE_HEADERS,
    t,
    sign,
  };
}

async function fetchJson(path, params = {}) {
  const qs = objToForm(params);
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;
  const headers = getSignedHeaders(params);
  await OmniBox.log("info", `[金牌][request] ${url}`);
  const res = await OmniBox.request(url, {
    method: "GET",
    headers,
    timeout: 20000,
  });
  if (!res || Number(res.statusCode) < 200 || Number(res.statusCode) >= 400) {
    throw new Error(`HTTP ${res?.statusCode || "unknown"} @ ${url}`);
  }
  const textBody = getBodyText(res);
  const data = JSON.parse(textBody || "{}");
  if (Number(data.code) && Number(data.code) !== 200) {
    throw new Error(data.msg || `API code=${data.code}`);
  }
  return data;
}

function mapVod(v = {}) {
  const pubdate = String(v.vodPubdate || "");
  const year = pubdate ? pubdate.split("-")[0] : "";
  return {
    vod_id: String(v.vodId || ""),
    vod_name: String(v.vodName || ""),
    vod_pic: String(v.vodPic || ""),
    vod_remarks: [String(v.vodRemarks || "").trim(), String(v.vodDoubanScore || "").trim()].filter(Boolean).join("_"),
    vod_year: year,
    type_id: String(v.typeId || ""),
    type_name: String(v.typeName || ""),
  };
}

function buildEpisodePlayId({ vodId = "", nid = "", episodeName = "", sourceName = "", title = "" } = {}) {
  return JSON.stringify({
    vodId: text(vodId),
    nid: text(nid),
    episodeName: text(episodeName),
    sourceName: text(sourceName),
    title: text(title),
  });
}

function parseEpisodePlayId(value = "") {
  const raw = text(value);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        vodId: text(parsed.vodId),
        nid: text(parsed.nid),
        episodeName: text(parsed.episodeName),
        sourceName: text(parsed.sourceName),
        title: text(parsed.title),
      };
    }
  } catch (_) {}

  const legacy = raw.match(/^(.*?)@(.*)$/);
  if (legacy) {
    return {
      vodId: text(legacy[1]),
      nid: text(legacy[2]),
      episodeName: "",
      sourceName: "金牌线路",
      title: "",
    };
  }
  return null;
}

function buildScrapeCandidate(episode = {}, vodName = "", vodId = "") {
  const rawName = text(episode.name || episode.episodeName || episode.vodRemarks || "");
  const fileId = text(episode.nid || episode.episodeId || episode.id || "");
  return {
    fid: fileId,
    name: rawName || `${text(vodName) || "金牌资源"}_${fileId || text(vodId || "")}`,
    file_name: rawName || `${text(vodName) || "金牌资源"}_${fileId || text(vodId || "")}`,
    file_size: 0,
    file_id: fileId,
    format_type: "video",
  };
}

function normalizeMappingFileId(value = "") {
  const raw = text(value);
  if (!raw) return "";
  const parts = raw.split("|").map((item) => text(item)).filter(Boolean);
  if (parts.length === 0) return raw;
  return parts[parts.length - 1];
}

function findEpisodeMapping(mappings = [], candidates = []) {
  const expected = Array.isArray(candidates)
    ? candidates.map((item) => text(item)).filter(Boolean)
    : [text(candidates)].filter(Boolean);
  if (!expected.length || !Array.isArray(mappings) || mappings.length === 0) return null;
  return mappings.find((mapping) => {
    const rawFileId = text(mapping?.fileId || "");
    const normalizedFileId = normalizeMappingFileId(rawFileId);
    return expected.includes(rawFileId) || expected.includes(normalizedFileId);
  }) || null;
}

function buildMappingPreview(mappings = [], limit = 5) {
  if (!Array.isArray(mappings) || mappings.length === 0) return "";
  return mappings
    .slice(0, limit)
    .map((mapping) => `${text(mapping?.fileId || "<empty>")}=>${text(mapping?.episodeName || mapping?.episodeNumber || "")}`)
    .join("; ");
}

function pickEpisodeNumber(...values) {
  for (const value of values) {
    if (Number.isFinite(value) && value > 0) return value;
    const raw = text(value);
    if (!raw) continue;
    const direct = Number(raw);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const match = raw.match(/^(?:第\s*)?(\d+)\s*(?:集|话|期)?(?:[\s.、:_-].*)?$/);
    if (match) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return null;
}

function formatEpisodeDisplayName(name = "", episodeNumber = null) {
  const rawName = text(name);
  const prefixed = rawName.match(/^(?:第\s*(\d+)\s*(?:集|话|期)\s*|(\d+)\s*[.、:_-]\s*)(.*)$/);
  const prefixedNumber = prefixed ? Number(prefixed[1] || prefixed[2]) : null;
  const finalNumber = Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : prefixedNumber;
  const episodeName = prefixed ? text(prefixed[3]) : rawName;

  if (!finalNumber) {
    return episodeName;
  }
  if (!episodeName) {
    return `第${finalNumber}集`;
  }
  return `第${finalNumber}集 ${episodeName}`;
}

function summarizeScrapeCandidates(candidates = [], limit = 5) {
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  return candidates
    .slice(0, limit)
    .map((item) => `${text(item?.file_id || item?.fid || "<empty>")}=>${text(item?.file_name || item?.name || "")}`)
    .join("; ");
}

function pickScrapeTitle(metadata = {}, fallbackVodName = "") {
  const scrapeData = metadata?.scrapeData || null;
  return text(scrapeData?.title || fallbackVodName);
}

function pickScrapePic(metadata = {}, fallbackPic = "") {
  const posterPath = text(metadata?.scrapeData?.posterPath || "");
  return posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : text(fallbackPic);
}

function buildDanmakuFileName(metadata = {}, episodeMeta = {}, fallbackVodName = "") {
  const scrapeData = metadata?.scrapeData || null;
  const mapping = episodeMeta?.mapping || null;
  const episodeName = text(episodeMeta?.episodeName || mapping?.episodeName || "");
  const episodeNumber = Number.isFinite(mapping?.episodeNumber) ? mapping.episodeNumber : null;
  const seasonNumber = Number.isFinite(mapping?.seasonNumber) ? mapping.seasonNumber : 1;
  const scrapeType = text(metadata?.scrapeType || "").toLowerCase();
  const title = text(scrapeData?.title || fallbackVodName || episodeMeta?.title || "");
  const seasonAirYear = text(scrapeData?.seasonAirYear || scrapeData?.releaseDate || "").slice(0, 4);

  if (!title) return episodeName;
  if (scrapeType === "movie") return title;
  if (episodeNumber != null) {
    return `${title}.${seasonAirYear || ""}.S${String(seasonNumber || 1).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`.replace(/\.\.*/g, (match) => match.replace(/^\.+/, "."));
  }
  return episodeName ? `${title}.${episodeName}` : title;
}

function buildPlaybackUrlEntry(item = {}) {
  const url = text(item.url);
  if (!url) return null;
  return {
    name: text(item.name || item.resolution || item.title || "播放"),
    url,
  };
}

async function buildFilters() {
  const classes = [];
  const filters = {};

  const typeRes = await fetchJson("/api/mw-movie/anonymous/get/filer/type");
  const typeObj = typeRes.data || [];
  for (const item of typeObj) {
    classes.push({
      type_id: String(item.typeId),
      type_name: String(item.typeName),
    });
  }

  const filterRes = await fetchJson("/api/mw-movie/anonymous/v1/get/filer/list");
  const fDataObj = filterRes.data || {};

  for (const cls of classes) {
    const tid = cls.type_id;
    filters[tid] = [];

    for (const [rawKey, [key, name]] of Object.entries(CLASS_NAME_MAP)) {
      const values = [{ name: "全部", value: "" }];
      if (rawKey === "serialList") {
        values.push(...SORT_VALUES);
      } else {
        const items = (((fDataObj || {})[tid] || {})[rawKey]) || [];
        for (const it of items) {
          if (rawKey === "typeList") {
            values.push({ name: String(it.itemText || ""), value: String(it.itemValue || "") });
          } else {
            values.push({ name: String(it.itemText || ""), value: String(it.itemText || "") });
          }
        }
      }
      if (values.length > 1) {
        filters[tid].push({ key, name, value: values });
      }
    }
  }

  return { classes, filters };
}

async function home(params, context) {
  try {
    const { classes, filters } = await buildFilters();
    const homeRes = await fetchJson("/api/mw-movie/anonymous/home/hotSearch");
    const list = Array.isArray(homeRes.data) ? homeRes.data.map(mapVod) : [];
    await OmniBox.log("info", `[金牌][home] class=${classes.length} list=${list.length}`);
    return { class: classes, filters, list };
  } catch (e) {
    await OmniBox.log("error", `[金牌][home] ${e.message}`);
    return { class: [], filters: {}, list: [] };
  }
}

async function category(params, context) {
  try {
    const tid = String(params.categoryId || params.type_id || "1");
    const page = Math.max(1, parseInt(params.page || 1, 10));
    const f = params.filters || {};
    const body = {
      area: f.area || "",
      lang: f.lang || "",
      pageNum: String(page),
      pageSize: "30",
      sort: f.by || "1",
      sortBy: "1",
      type: f.type || "",
      type1: tid,
      v_class: f.class || "",
      year: f.year || "",
    };
    const res = await fetchJson("/api/mw-movie/anonymous/video/list", body);
    const list = (((res || {}).data || {}).list || []).map(mapVod);
    await OmniBox.log("info", `[金牌][category] tid=${tid} page=${page} list=${list.length}`);
    return {
      page,
      pagecount: page + (list.length >= 30 ? 1 : 0),
      total: page * 30 + (list.length >= 30 ? 1 : 0),
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[金牌][category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const id = text(params.videoId || params.id || "");
    if (!id) return { list: [] };

    const res = await fetchJson("/api/mw-movie/anonymous/video/detail", { id });
    const kvod = res.data || {};
    if (!Object.keys(kvod).length) return { list: [] };

    const kid = text(kvod.vodId || id);
    const sourceName = text(kvod.sourceName || "金牌线路");
    const rawEpisodeList = Array.isArray(kvod.episodeList) ? kvod.episodeList : [];
    const scrapeCandidates = rawEpisodeList.map((it) => buildScrapeCandidate(it, kvod.vodName, kid)).filter((it) => text(it.file_name));

    let scrapeMetadata = null;
    if (scrapeCandidates.length > 0) {
      await OmniBox.log("info", `[金牌][detail] 开始统一刮削 kid=${kid} candidates=${scrapeCandidates.length} preview=${summarizeScrapeCandidates(scrapeCandidates) || "<empty>"}`);
      try {
        const scrapeResult = await OmniBox.processScraping(kid, text(kvod.vodName), text(kvod.vodName), scrapeCandidates);
        await OmniBox.log("info", `[金牌][detail] processScraping 完成 kid=${kid} result=${JSON.stringify(scrapeResult || {}).slice(0, 300)}`);
        scrapeMetadata = await OmniBox.getScrapeMetadata(kid);
        await OmniBox.log("info", `[金牌][detail] 读取刮削元数据完成 kid=${kid} hasScrapeData=${!!scrapeMetadata?.scrapeData} mappings=${Array.isArray(scrapeMetadata?.videoMappings) ? scrapeMetadata.videoMappings.length : 0}`);
      } catch (error) {
        await OmniBox.log("warn", `[金牌][detail] 刮削失败 kid=${kid} error=${error.message}`);
      }
    } else {
      await OmniBox.log("warn", `[金牌][detail] 未提取到可刮削分集 kid=${kid}`);
    }

    const mappings = Array.isArray(scrapeMetadata?.videoMappings) ? scrapeMetadata.videoMappings : [];
    await OmniBox.log("info", `[金牌][detail] mappingPreview kid=${kid} preview=${buildMappingPreview(mappings) || "<empty>"}`);
    const episodes = rawEpisodeList.map((it, index) => {
      const nid = text(it.nid);
      const mapping = findEpisodeMapping(mappings, [nid]);
      const episodeNumber = pickEpisodeNumber(mapping?.episodeNumber, it.episodeNumber, it.name, index + 1);
      const episodeName = formatEpisodeDisplayName(mapping?.episodeName || it.name || `第${episodeNumber || nid || "1"}集`, episodeNumber);
      return {
        name: episodeName,
        playId: buildEpisodePlayId({
          vodId: kid,
          nid,
          episodeName,
          sourceName,
          title: text(kvod.vodName),
        }),
      };
    }).filter((it) => text(it.playId));

    const scrapeTitle = pickScrapeTitle(scrapeMetadata, kvod.vodName);
    const scrapePic = pickScrapePic(scrapeMetadata, kvod.vodPic);
    const scrapeContent = stripHtml(scrapeMetadata?.scrapeData?.overview || kvod.vodContent || "简介");
    const scrapeYear = text((scrapeMetadata?.scrapeData?.releaseDate || kvod.vodYear || "").slice?.(0, 4) || kvod.vodYear || "");
    const scrapeActors = text(
      kvod.vodActor || scrapeMetadata?.scrapeData?.credits?.cast?.slice?.(0, 8).map?.((x) => x.name).join(",") || "主演"
    );
    const scrapeDirector = text(
      kvod.vodDirector || scrapeMetadata?.scrapeData?.credits?.crew?.filter?.((x) => x.job === "Director").map?.((x) => x.name).join(",") || "导演"
    );

    await OmniBox.log("info", `[金牌][detail] kid=${kid} finalEpisodes=${episodes.length} hasScrape=${!!scrapeMetadata?.scrapeData}`);

    return {
      list: [{
        vod_id: kid,
        vod_name: scrapeTitle || text(kvod.vodName),
        vod_pic: scrapePic,
        type_name: text(kvod.vodClass || "类型"),
        vod_remarks: text(kvod.vodRemarks || "状态"),
        vod_year: scrapeYear || text(kvod.vodYear || "0000"),
        vod_area: text(kvod.vodArea || "地区"),
        vod_lang: text(kvod.vodLang || "语言"),
        vod_director: scrapeDirector,
        vod_actor: scrapeActors,
        vod_content: scrapeContent,
        vod_play_sources: episodes.length ? [{ name: sourceName, episodes }] : [],
      }],
    };
  } catch (e) {
    await OmniBox.log("error", `[金牌][detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params.keyword || params.wd || params.key || "").trim();
    const page = Math.max(1, parseInt(params.page || 1, 10));
    if (!keyword) return { page, pagecount: 0, total: 0, list: [] };

    const body = { keyword, pageNum: String(page), pageSize: "30" };
    const res = await fetchJson("/api/mw-movie/anonymous/video/searchByWordPageable", body);
    const list = (((res || {}).data || {}).list || []).map(mapVod);
    await OmniBox.log("info", `[金牌][search] keyword=${keyword} page=${page} list=${list.length}`);
    return {
      page,
      pagecount: page + (list.length >= 30 ? 1 : 0),
      total: page * 30 + (list.length >= 30 ? 1 : 0),
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[金牌][search] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const flag = text(params.flag || "");
    const rawPlayId = text(params.playId || params.id || "");
    const playMeta = parseEpisodePlayId(rawPlayId);
    if (!playMeta?.vodId || !playMeta?.nid) {
      throw new Error("播放参数格式错误，期望包含 vodId 与 nid");
    }

    const sid = playMeta.vodId;
    const nid = playMeta.nid;
    const episodeName = text(playMeta.episodeName || params.episodeName || "");
    const title = text(playMeta.title || params.title || "");
    const body = { clientType: "3", id: sid, nid };

    await OmniBox.log("info", `[金牌][play] start sid=${sid} nid=${nid} title=${title} episode=${episodeName}`);

    const playInfoPromise = fetchJson("/api/mw-movie/anonymous/v2/video/episode/url", body);
    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        mapping: null,
      };
      try {
        const metadata = await OmniBox.getScrapeMetadata(sid);
        const mappings = Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [];
        const mapping = findEpisodeMapping(mappings, [nid, `${sid}|${nid}`]);
        result.mapping = mapping;
        result.scrapeTitle = pickScrapeTitle(metadata, title);
        result.scrapePic = pickScrapePic(metadata, "");
        await OmniBox.log("info", `[金牌][play] 元数据读取完成 sid=${sid} mappings=${mappings.length} matched=${!!mapping} expected=${nid} preview=${buildMappingPreview(mappings) || "<empty>"}`);
        if (!mapping && mappings.length > 0) {
          await OmniBox.log("info", `[金牌][play] 首条映射原始数据 sample=${JSON.stringify(mappings.slice(0, 2)).slice(0, 400)}`);
        }
        const fileName = buildDanmakuFileName(metadata, { mapping, episodeName, title }, title);
        await OmniBox.log("info", `[金牌][play] 弹幕匹配文件名 fileName=${fileName}`);
        if (fileName) {
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
          result.danmakuList = Array.isArray(matchedDanmaku) ? matchedDanmaku : [];
          await OmniBox.log("info", `[金牌][play] 弹幕匹配完成 count=${result.danmakuList.length}`);
        }
      } catch (error) {
        await OmniBox.log("warn", `[金牌][play] 元数据/弹幕链路失败: ${error.message}`);
      }
      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);
    if (playInfoResult.status !== "fulfilled") {
      throw new Error(playInfoResult.reason?.message || "无法获取播放地址");
    }

    const playData = playInfoResult.value;
    const list = (((playData || {}).data || {}).list || []);
    const urls = list.map(buildPlaybackUrlEntry).filter(Boolean);
    if (!urls.length) {
      throw new Error("播放接口未返回有效地址");
    }

    let danmakuList = [];
    let scrapeTitle = title;
    let scrapePic = "";
    let mapping = null;
    if (metadataResult.status === "fulfilled" && metadataResult.value) {
      danmakuList = metadataResult.value.danmakuList || [];
      scrapeTitle = text(metadataResult.value.scrapeTitle || title);
      scrapePic = text(metadataResult.value.scrapePic || "");
      mapping = metadataResult.value.mapping || null;
    } else if (metadataResult.status === "rejected") {
      await OmniBox.log("warn", `[金牌][play] metadataPromise rejected: ${metadataResult.reason?.message || metadataResult.reason}`);
    }

    const header = { "User-Agent": MOBILE_UA };
    const historyEpisodeNumber = pickEpisodeNumber(mapping?.episodeNumber, episodeName);
    const historyEpisodeName = formatEpisodeDisplayName(mapping?.episodeName || episodeName, historyEpisodeNumber);
    const historyPayload = {
      vodId: sid,
      title: scrapeTitle || title || sid,
      pic: scrapePic || undefined,
      episode: rawPlayId,
      sourceId: context?.sourceId,
      episodeNumber: historyEpisodeNumber || undefined,
      episodeName: text(historyEpisodeName || undefined),
      playUrl: urls[0]?.url || "",
      playHeader: header,
    };

    try {
      if (historyPayload.sourceId && typeof OmniBox.addPlayHistory === "function") {
        OmniBox.addPlayHistory(historyPayload)
          .then((added) => {
            if (added) {
              OmniBox.log("info", `[金牌][play] 播放记录写入成功 sid=${sid} episode=${historyPayload.episodeName || ""}`);
            } else {
              OmniBox.log("info", `[金牌][play] 播放记录已存在 sid=${sid} episode=${historyPayload.episodeName || ""}`);
            }
          })
          .catch((error) => {
            OmniBox.log("warn", `[金牌][play] 播放记录写入失败: ${error.message}`);
          });
      } else {
        await OmniBox.log("info", `[金牌][play] 跳过播放记录 sourceId=${historyPayload.sourceId || ""} hasApi=${typeof OmniBox.addPlayHistory === "function"}`);
      }
    } catch (error) {
      await OmniBox.log("warn", `[金牌][play] 启动异步播放记录失败: ${error.message}`);
    }

    await OmniBox.log("info", `[金牌][play] success sid=${sid} nid=${nid} urls=${urls.length} danmaku=${danmakuList.length}`);
    return {
      parse: 0,
      urls,
      header,
      danmaku: danmakuList};
  } catch (e) {
    await OmniBox.log("error", `[金牌][play] ${e.message}`);
    return { parse: 0, urls: [], header: {}, danmaku: [] };
  }
}

});

_load(12, "韩小圈", function (module, exports, require) {
// @name 韩小圈
// @author 梦
// @description 影视站：支持首页、分类、详情、搜索与播放
// @dependencies cheerio
// @version 1.0.3
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/韩小圈.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const BASE_URL = "https://hanxiaoquan.hanju.workers.dev";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";
const LIST_CACHE_TTL = Number(process.env.HXQ_LIST_CACHE_TTL || 900);
const DETAIL_CACHE_TTL = Number(process.env.HXQ_DETAIL_CACHE_TTL || 1800);
const SEARCH_CACHE_TTL = Number(process.env.HXQ_SEARCH_CACHE_TTL || 600);
const SEARCH_PAGE_SIZE = 20;
const SEARCH_PREFETCH_PAGES = Math.min(5, Math.max(1, Number(process.env.HXQ_SEARCH_PREFETCH_PAGES || 3) || 3));

const CATEGORY_CONFIG = [
  { id: "0", name: "韩剧" },
  { id: "1", name: "韩影" },
  { id: "2", name: "日韩综" },
  { id: "3", name: "日韩漫" },
  { id: "100", name: "热门" },
];

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

async function requestApi(path, body, options = {}) {
  const url = `${BASE_URL}${path}`;
  await OmniBox.log("info", `[韩小圈][request] POST ${url} ${JSON.stringify(body || {})}`);
  const res = await OmniBox.request(url, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/json",
      "Accept": "application/json, text/plain, */*",
      "Origin": BASE_URL,
      "Referer": `${BASE_URL}/`,
      ...(options.headers || {}),
    },
    body: JSON.stringify(body || {}),
    timeout: options.timeout || 30000,
  });
  const statusCode = Number(res?.statusCode || 0);
  if (!res || statusCode !== 200) {
    throw new Error(`HTTP ${res?.statusCode || "unknown"} @ ${url}`);
  }
  const text = String(res.body || "");
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`JSON parse failed @ ${url}: ${err?.message || err}`);
  }
}

async function getCachedJson(cacheKey, ttl, producer) {
  try {
    const cached = await OmniBox.getCache(cacheKey);
    if (cached) return JSON.parse(String(cached));
  } catch (_) {}
  const value = await producer();
  try {
    await OmniBox.setCache(cacheKey, JSON.stringify(value || {}), ttl);
  } catch (_) {}
  return value;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(url) {
  try {
    return new URL(String(url || ""), BASE_URL).toString();
  } catch (_) {
    return String(url || "");
  }
}

function categoryNameById(categoryId) {
  return CATEGORY_CONFIG.find((item) => item.id === String(categoryId))?.name || "韩小圈";
}

function buildListItem(item) {
  return {
    vod_id: String(item?.vod_id || ""),
    vod_name: normalizeText(item?.vod_name || ""),
    vod_pic: absoluteUrl(item?.vod_pic || ""),
    vod_remarks: normalizeText(item?.vod_remarks || item?.vod_class || ""),
    vod_year: normalizeText(item?.vod_year || ""),
    vod_director: normalizeText(item?.vod_director || ""),
    vod_actor: normalizeText(item?.vod_actor || ""),
    vod_content: normalizeText(item?.vod_content || ""),
  };
}

function normalizeSearchKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[·•・\-—_:：,，.。'"“”‘’!?！？()（）\[\]【】《》<>]/g, "");
}

function buildSearchTokens(keyword) {
  const base = normalizeSearchKey(keyword);
  if (!base) return [];
  const tokens = new Set([base]);
  const cleaned = base.replace(/线上看|線上看|全集|韩剧|韓劇|韩国|韓國|电视剧|電視劇|连续剧|連續劇|电影|電影|动漫|動漫|动画|動畫|综艺|綜藝|中字|字幕|高清|hd/g, "");
  if (cleaned) tokens.add(cleaned);
  const noYear = cleaned.replace(/(19|20)\d{2}/g, "");
  if (noYear) tokens.add(noYear);
  const noSeason = cleaned.replace(/第?\d+[季部集]$/g, "").replace(/\d+$/g, "");
  if (noSeason) tokens.add(noSeason);
  return [...tokens].filter(Boolean).sort((a, b) => b.length - a.length);
}

function longestCommonSubsequenceLength(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (!left || !right) return 0;
  const previous = new Array(right.length + 1).fill(0);
  const current = new Array(right.length + 1).fill(0);
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = left[i - 1] === right[j - 1]
        ? previous[j - 1] + 1
        : Math.max(previous[j], current[j - 1]);
    }
    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j];
      current[j] = 0;
    }
  }
  return previous[right.length];
}

function scoreTitleToken(title, token) {
  if (!title || !token) return 0;
  if (title === token) return 10000 + token.length;
  if (title.startsWith(token)) return 8500 + token.length * 10 - title.length;
  const index = title.indexOf(token);
  if (index >= 0) return 7000 + token.length * 10 - index;

  if (token.length < 3) return 0;
  const lcs = longestCommonSubsequenceLength(title, token);
  const coverage = lcs / token.length;
  const minCoverage = token.length <= 4 ? 0.75 : 0.68;
  if (coverage < minCoverage) return 0;
  return 4500 + Math.round(coverage * 1000) - Math.min(title.length, 100);
}

function scoreContainsToken(value, token, baseScore) {
  if (!value || !token) return 0;
  if (value === token) return baseScore + token.length;
  const index = value.indexOf(token);
  if (index < 0) return 0;
  return baseScore - Math.min(index, 300);
}

function scoreSearchItem(item, keyword) {
  const tokens = buildSearchTokens(keyword);
  const name = normalizeSearchKey(item?.vod_name || "");
  const remarks = normalizeSearchKey(item?.vod_remarks || "");
  const actor = normalizeSearchKey(item?.vod_actor || "");
  const director = normalizeSearchKey(item?.vod_director || "");
  const content = normalizeSearchKey(item?.vod_content || "");
  if (!tokens.length) return 0;

  let score = 0;
  for (const token of tokens) {
    score = Math.max(score, scoreTitleToken(name, token));
    score = Math.max(score, scoreContainsToken(remarks, token, 2600));
    score = Math.max(score, scoreContainsToken(actor, token, 2200));
    score = Math.max(score, scoreContainsToken(director, token, 2000));
    if (token.length >= 3) {
      score = Math.max(score, scoreContainsToken(content, token, 700));
    }
  }
  return score;
}

function dedupeListItems(list) {
  const seen = new Set();
  const result = [];
  for (const item of list) {
    const key = item.vod_id || `${item.vod_name}|${item.vod_pic}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function refineSearchList(list, keyword) {
  return list
    .map((item, index) => ({ item, index, score: scoreSearchItem(item, keyword) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      const nameDiff = a.item.vod_name.localeCompare(b.item.vod_name, "zh-CN");
      return nameDiff || a.index - b.index;
    })
    .map((entry) => entry.item);
}

async function fetchSearchPage(keyword, page) {
  const pg = Math.max(1, Number(page || 1) || 1);
  const producer = () => requestApi("/api/search", { keyword, page: pg }, { timeout: 60000 });
  try {
    return await getCachedJson(`hxq:search:${keyword}:${pg}`, SEARCH_CACHE_TTL, producer);
  } catch (firstErr) {
    await OmniBox.log("info", `[韩小圈][search] page=${pg} first try failed, retry once: ${firstErr?.message || firstErr}`);
    return producer();
  }
}

async function collectSearchPages(keyword, page) {
  const targetPage = Math.max(1, Number(page || 1) || 1);
  const endPage = targetPage + SEARCH_PREFETCH_PAGES - 1;
  const raw = [];
  let hasMore = false;
  let fetchedPages = 0;

  for (let currentPage = 1; currentPage <= endPage; currentPage += 1) {
    const data = await fetchSearchPage(keyword, currentPage);
    const items = Array.isArray(data?.data) ? data.data : [];
    raw.push(...items);
    fetchedPages = currentPage;
    hasMore = items.length >= SEARCH_PAGE_SIZE;
    if (!hasMore) break;
  }

  return { raw, hasMore, fetchedPages };
}

function buildVodFromDetail(vod) {
  const playUrls = Array.isArray(vod?.vod_play_url) ? vod.vod_play_url : [];
  const episodes = playUrls
    .map((ep) => ({
      name: normalizeText(ep?.t || ep?.name || ""),
      playId: String(ep?.u || ep?.url || ""),
    }))
    .filter((ep) => ep.name && ep.playId);

  return {
    vod_id: String(vod?.vod_id || ""),
    vod_name: normalizeText(vod?.vod_name || ""),
    vod_pic: absoluteUrl(vod?.vod_pic || ""),
    vod_remarks: normalizeText(vod?.vod_remarks || vod?.vod_class || ""),
    vod_content: normalizeText(vod?.vod_content || ""),
    vod_year: normalizeText(vod?.vod_year || ""),
    vod_director: normalizeText(vod?.vod_director || ""),
    vod_actor: normalizeText(vod?.vod_actor || ""),
    vod_area: "韩国",
    vod_play_sources: episodes.length
      ? [{ name: "默认线路", episodes }]
      : [],
  };
}

async function home() {
  try {
    const data = await getCachedJson("hxq:home:hot:1", LIST_CACHE_TTL, () =>
      requestApi("/api/list", { c_id: "100", page: "1" }),
    );
    const list = Array.isArray(data?.data) ? data.data.slice(0, 20).map(buildListItem) : [];
    await OmniBox.log("info", `[韩小圈][home] list=${list.length}`);
    return {
      class: CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name })),
      filters: {},
      list,
    };
  } catch (err) {
    await OmniBox.log("error", `[韩小圈][home] ${err?.message || err}`);
    return {
      class: CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name })),
      filters: {},
      list: [],
    };
  }
}

async function category(params) {
  const tid = String(params?.categoryId || "0");
  const pg = String(Math.max(1, Number(params?.page || 1)));
  try {
    const data = await getCachedJson(`hxq:list:${tid}:${pg}`, LIST_CACHE_TTL, () =>
      requestApi("/api/list", { c_id: tid, page: pg }),
    );
    const raw = Array.isArray(data?.data) ? data.data : [];
    const list = raw.map(buildListItem).filter((item) => item.vod_id && item.vod_name);
    const hasMore = raw.length >= 20;
    await OmniBox.log("info", `[韩小圈][category] tid=${tid} pg=${pg} list=${list.length}`);
    return {
      page: Number(pg),
      pagecount: hasMore ? Number(pg) + 1 : Number(pg),
      limit: 20,
      total: hasMore ? Number(pg) * 20 + 1 : (Number(pg) - 1) * 20 + list.length,
      list,
    };
  } catch (err) {
    await OmniBox.log("error", `[韩小圈][category] tid=${tid} pg=${pg} ${err?.message || err}`);
    return {
      page: Number(pg),
      pagecount: Number(pg),
      limit: 20,
      total: 0,
      list: [],
    };
  }
}

async function detail(params) {
  const vodId = String(
    params?.videoId
    || params?.id
    || params?.vod_id
    || params?.categoryId
    || "",
  ).trim();
  if (!vodId) {
    await OmniBox.log("info", `[韩小圈][detail] missing id params=${JSON.stringify(params || {})}`);
    return { list: [] };
  }
  try {
    const data = await getCachedJson(`hxq:detail:${vodId}`, DETAIL_CACHE_TTL, () =>
      requestApi("/api/detail", { b_id: vodId }),
    );
    const vod = data?.data ? buildVodFromDetail(data.data) : null;
    await OmniBox.log("info", `[韩小圈][detail] id=${vodId} episodes=${vod?.vod_play_sources?.[0]?.episodes?.length || 0}`);
    return { list: vod ? [vod] : [] };
  } catch (err) {
    await OmniBox.log("error", `[韩小圈][detail] id=${vodId} ${err?.message || err}`);
    return { list: [] };
  }
}

async function search(params) {
  const keyword = normalizeText(params?.keyword || params?.wd || "");
  const pg = Math.max(1, Number(params?.page || 1) || 1);
  if (!keyword) {
    return { page: 1, pagecount: 1, limit: 20, total: 0, list: [] };
  }

  try {
    const { raw, hasMore, fetchedPages } = await collectSearchPages(keyword, pg);
    const allList = dedupeListItems(
      raw
        .map(buildListItem)
        .filter((item) => item.vod_id && item.vod_name),
    );
    const refinedList = refineSearchList(allList, keyword);
    const start = (pg - 1) * SEARCH_PAGE_SIZE;
    const list = refinedList.slice(start, start + SEARCH_PAGE_SIZE);
    const knownPageCount = Math.max(1, Math.ceil(refinedList.length / SEARCH_PAGE_SIZE));
    const pagecount = refinedList.length > 0
      ? (hasMore ? Math.max(pg + 1, knownPageCount) : Math.max(pg, knownPageCount))
      : pg;
    const total = refinedList.length + (hasMore && refinedList.length > 0 ? 1 : 0);
    await OmniBox.log("info", `[韩小圈][search] keyword=${keyword} pg=${pg} raw=${raw.length} refined=${refinedList.length} list=${list.length} pages=${fetchedPages} top=${list.slice(0, 5).map((item) => item.vod_name).join(" | ")}`);
    return {
      page: pg,
      pagecount,
      limit: SEARCH_PAGE_SIZE,
      total,
      list,
    };
  } catch (err) {
    await OmniBox.log("error", `[韩小圈][search] keyword=${keyword} pg=${pg} ${err?.message || err}`);
    return {
      page: pg,
      pagecount: pg,
      limit: SEARCH_PAGE_SIZE,
      total: 0,
      list: [],
    };
  }
}

async function play(params) {
  const playId = String(params?.id || params?.playId || params?.url || "").trim();
  if (!playId) {
    return { urls: [] };
  }
  await OmniBox.log("info", `[韩小圈][play] ${playId}`);
  return {
    parse: 0,
    header: {
      "User-Agent": UA,
      Referer: `${BASE_URL}/`,
      Origin: BASE_URL,
    },
    urls: [{ name: "播放", url: playId }],
  };
}

});
