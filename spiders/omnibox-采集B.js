// @name 影视采集B(合并3源)
// @version 3.20261101.2127
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


_load(0, "七味", function (module, exports, require) {
// @name 七味
// @author https://github.com/hjdhnx/drpy-node/blob/main/spider/js/%E4%B8%83%E5%91%B3%5B%E4%BC%98%5D.js
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: axios, cheerio
// @version 1.3.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/七味.js

/**
 * ============================================================================
 * 七味 (QW)
 * 站点族：pcmp4 / qwnull / qwmkv / qwfilm / qnmp4 / qnnull / qnhot
 *
 * 说明：
 * - 由旧版 drpy rule 脚本转换为 OmniBox 标准五接口格式
 * - 保留原站分类筛选 URL 规则与详情页播放线路解析逻辑
 * - 增强日志输出，便于排查线路、解析和故障切换问题
 * ============================================================================
 */

const axios = require("axios");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");

// 弹幕接口地址；留空表示不启用弹幕匹配；示例：https://danmu.example.com
const DANMU_API = process.env.DANMU_API || "";
function splitConfigList(value) {
    return String(value || "")
        .split(/[;,]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

// 单个网盘链接最多生成多少条可用路线；同时也作为同一种网盘最多处理多少个成功分享的阈值；正整数；默认 3
const MAX_PAN_VALID_ROUTES = (() => {
    const raw = String(process.env.MAX_PAN_VALID_ROUTES || "3").trim();
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 3;
})();
// 需要展开“本地代理/服务端代理/直连”多路线的网盘类型；分号或逗号分隔；示例：quark;uc
const DRIVE_TYPE_CONFIG = splitConfigList(process.env.DRIVE_TYPE_CONFIG || "quark;uc");
// 可供网盘检测与播放使用的路线名称；分号或逗号分隔；示例：本地代理;服务端代理;直连
const SOURCE_NAMES_CONFIG = splitConfigList(process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连");
// 是否允许外网地址使用服务端代理；填 true 或 false；默认 false
const EXTERNAL_SERVER_PROXY_ENABLED = String(process.env.EXTERNAL_SERVER_PROXY_ENABLED || "false").toLowerCase() === "true";
// 网盘线路排序优先级；分号或逗号分隔；示例：baidu;tianyi;quark;uc;115;xunlei;ali;123pan
const DRIVE_ORDER = splitConfigList(process.env.DRIVE_ORDER || "baidu;tianyi;quark;uc;115;xunlei;ali;123pan").map((s) => s.toLowerCase());
// 七味网盘文件与刮削元数据缓存时长，单位秒；默认 43200（12 小时）
const QIWEI_CACHE_EX_SECONDS = Number(process.env.QIWEI_CACHE_EX_SECONDS || 43200);
const PAN_ROUTE_NAMES = SOURCE_NAMES_CONFIG.slice(0, MAX_PAN_VALID_ROUTES);

// ==================== 全局配置 ====================
const HOSTS = [
    "https://www.pcmp4.com",
    "https://www.qwnull.com",
    "https://www.qwmkv.com",
    "https://www.qwfilm.com",
    "https://www.qnmp4.com",
    "https://www.qnnull.com",
    "https://www.qnhot.com",
];

let currentHostIndex = 0;

const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Connection": "keep-alive",
};

const CLASSES = [
    { type_id: "1", type_name: "电影" },
    { type_id: "2", type_name: "剧集" },
    { type_id: "3", type_name: "综艺" },
    { type_id: "4", type_name: "动漫" },
    { type_id: "30", type_name: "短剧" },
];

const FULL_TYPE_OPTIONS = [
    "剧情", "科幻", "动作", "喜剧", "爱情", "冒险", "儿童", "歌舞", "音乐", "奇幻", "动画", "恐怖", "惊悚", "丧尸", "战争", "传记", "纪录", "犯罪", "悬疑", "西部", "灾难", "古装", "武侠", "家庭", "短片", "校园", "文艺", "运动", "青春", "同性", "励志", "人性", "美食", "女性", "治愈", "历史",
];
const FULL_YEAR_OPTIONS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015", "2014", "2013", "2012", "2011", "2010"];
const FULL_AREA_OPTIONS = ["大陆", "香港", "台湾", "日本", "韩国", "泰国", "美国", "英国", "法国", "德国", "印度", "丹麦", "瑞典", "荷兰", "加拿大", "俄罗斯", "意大利", "比利时", "西班牙", "澳大利亚", "其他"];
const FULL_LANG_OPTIONS = ["国语", "粤语", "英语", "法语", "日语", "韩语", "泰语", "德语", "俄语", "闽南语", "丹麦语", "波兰语", "瑞典语", "印地语", "挪威语", "意大利语", "西班牙语", "无对白", "其他"];
const FULL_SORT_OPTIONS = [
    { name: "按时间", value: "time" },
    { name: "按人气", value: "hits" },
    { name: "按评分", value: "score" },
];

function buildFilterOptionList(list = []) {
    return [{ name: "全部", value: "" }, ...list.map((item) => ({ name: item, value: item }))];
}

function buildCategoryFilters({ includeType = true, includeYear = true, includeArea = true, includeLang = true } = {}) {
    const filters = [
        {
            key: "sort",
            name: "排序",
            init: "time",
            value: FULL_SORT_OPTIONS,
        },
    ];
    if (includeType) {
        filters.push({
            key: "type",
            name: "类型",
            init: "",
            value: buildFilterOptionList(FULL_TYPE_OPTIONS),
        });
    }
    if (includeYear) {
        filters.push({
            key: "year",
            name: "年代",
            init: "",
            value: buildFilterOptionList(FULL_YEAR_OPTIONS),
        });
    }
    if (includeArea) {
        filters.push({
            key: "area",
            name: "地区",
            init: "",
            value: buildFilterOptionList(FULL_AREA_OPTIONS),
        });
    }
    if (includeLang) {
        filters.push({
            key: "lang",
            name: "语言",
            init: "",
            value: buildFilterOptionList(FULL_LANG_OPTIONS),
        });
    }
    return filters;
}

const FILTERS = {
    "1": buildCategoryFilters(),
    "2": buildCategoryFilters(),
    "3": buildCategoryFilters({ includeYear: false, includeArea: false, includeLang: false }),
    "4": buildCategoryFilters({ includeArea: false, includeLang: false }),
    "30": buildCategoryFilters({ includeArea: false, includeLang: false }),
};

const axiosInstance = axios.create({
    timeout: 15000,
    validateStatus: (status) => status >= 200 && status < 500,
    responseType: "text",
});

// ==================== 日志工具 ====================
function logInfo(message, data = null) {
    const suffix = data == null ? "" : `: ${JSON.stringify(data)}`;
    OmniBox.log("info", `[七味] ${message}${suffix}`);
}

function logWarn(message, data = null) {
    const suffix = data == null ? "" : `: ${JSON.stringify(data)}`;
    OmniBox.log("warn", `[七味] ${message}${suffix}`);
}

function logError(message, error) {
    OmniBox.log("error", `[七味] ${message}: ${error?.message || error}`);
}

function encodeMeta(obj) {
    try {
        return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64");
    } catch {
        return "";
    }
}

function decodeMeta(str) {
    try {
        const raw = Buffer.from(str || "", "base64").toString("utf8");
        return JSON.parse(raw || "{}");
    } catch {
        return {};
    }
}

function extractEpisode(title) {
    if (!title) return "";
    const processedTitle = title.trim();
    const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
    if (seMatch) return seMatch[1];
    const cnMatch = processedTitle.match(/第\s*([0-9]+)\s*[集话章节回期]/);
    if (cnMatch) return cnMatch[1];
    const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
    if (epMatch) return epMatch[1];
    const bracketMatch = processedTitle.match(/[\[\(【（](\d{1,3})[\]\)】）]/);
    if (bracketMatch) {
        const num = bracketMatch[1];
        if (!["720", "1080", "480"].includes(num)) return num;
    }
    return "";
}

function buildFileNameForDanmu(vodName, episodeTitle) {
    if (!vodName) return "";
    if (!episodeTitle || episodeTitle === "正片" || episodeTitle === "播放") {
        return vodName;
    }
    const digits = extractEpisode(episodeTitle);
    if (digits) {
        const epNum = parseInt(digits, 10);
        if (epNum > 0) {
            return `${vodName} S01E${String(epNum).padStart(2, "0")}`;
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

function isPanSourceName(name = "") {
    const value = String(name || "");
    if (!value) return false;
    return ["百度", "天翼", "夸克", "UC", "115", "迅雷", "阿里", "123"].some((keyword) => value.includes(keyword));
}

function sortPlaySourcesByDriveOrder(playSources = []) {
    if (!Array.isArray(playSources) || playSources.length <= 1) {
        return playSources;
    }
    const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
    return [...playSources].sort((a, b) => {
        const aIsPan = isPanSourceName(a?.name || "");
        const bIsPan = isPanSourceName(b?.name || "");
        if (aIsPan !== bIsPan) {
            return aIsPan ? 1 : -1;
        }
        if (!aIsPan && !bIsPan) {
            return 0;
        }
        if (DRIVE_ORDER.length === 0) {
            return 0;
        }
        const aType = inferDriveTypeFromSourceName(a?.name || "");
        const bType = inferDriveTypeFromSourceName(b?.name || "");
        const aOrder = orderMap.has(aType) ? orderMap.get(aType) : Number.MAX_SAFE_INTEGER;
        const bOrder = orderMap.has(bType) ? orderMap.get(bType) : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return 0;
    });
}

function resolveCallerSource(params = {}, context = {}) {
    return String(context?.from || params?.source || "").toLowerCase();
}

function getBaseURLHost(context = {}) {
    const baseURL = String(context?.baseURL || "").trim();
    if (!baseURL) return "";
    try {
        return new URL(baseURL).hostname.toLowerCase();
    } catch {
        return baseURL.toLowerCase();
    }
}

function isPrivateHost(hostname = "") {
    const host = String(hostname || "").toLowerCase();
    if (!host) return false;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return true;
    if (/^(10\.|192\.168\.|169\.254\.)/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
    if (host.endsWith(".local") || host.endsWith(".lan") || host.endsWith(".internal") || host.endsWith(".intra")) return true;
    if (host.includes(":")) return host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80");
    return false;
}

function canUseServerProxy(context = {}) {
    if (EXTERNAL_SERVER_PROXY_ENABLED) return true;
    return isPrivateHost(getBaseURLHost(context));
}

function filterSourceNamesForCaller(sourceNames = [], callerSource = "", context = {}) {
    let filtered = Array.isArray(sourceNames) ? [...sourceNames] : [];
    const allowServerProxy = canUseServerProxy(context);

    if (callerSource === "web") {
        filtered = filtered.filter((name) => name !== "本地代理");
    } else if (callerSource === "emby") {
        if (allowServerProxy) {
            filtered = filtered.filter((name) => name === "服务端代理");
        } else {
            filtered = filtered.filter((name) => name !== "服务端代理");
        }
    } else if (callerSource === "uz") {
        filtered = filtered.filter((name) => name !== "本地代理");
    }

    if (!allowServerProxy) {
        filtered = filtered.filter((name) => name !== "服务端代理");
    }

    return filtered.length > 0 ? filtered : ["直连"];
}

function resolveRouteType(flag = "", callerSource = "", context = {}) {
    const allowServerProxy = canUseServerProxy(context);
    const validRouteTypes = new Set(["本地代理", "服务端代理", "直连"]);
    let routeType = "直连";

    if (callerSource === "web" || callerSource === "emby") {
        routeType = allowServerProxy ? "服务端代理" : "直连";
    }

    if (flag) {
        if (flag.includes("-")) {
            const flagParts = flag.split("-");
            routeType = flagParts[flagParts.length - 1];
        } else {
            routeType = flag;
        }
    }

    if (!validRouteTypes.has(routeType)) {
        routeType = "直连";
    }

    if (!allowServerProxy && routeType === "服务端代理") {
        routeType = "直连";
    }

    if (callerSource === "uz" && routeType === "本地代理") {
        routeType = "直连";
    }

    return routeType;
}

async function matchDanmu(fileName) {
    if (!DANMU_API || !fileName) {
        return [];
    }

    try {
        logInfo("匹配弹幕", { fileName });
        const response = await OmniBox.request(`${DANMU_API}/api/v2/match`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: JSON.stringify({ fileName }),
        });

        if (response.statusCode !== 200) {
            logWarn("弹幕匹配失败", { statusCode: response.statusCode });
            return [];
        }

        const data = JSON.parse(response.body || "{}");
        if (!data.isMatched) {
            return [];
        }

        const first = (data.matches || [])[0] || {};
        if (!first.episodeId) {
            return [];
        }

        const animeTitle = first.animeTitle || "";
        const episodeTitle = first.episodeTitle || "";
        let danmakuName = "弹幕";
        if (animeTitle && episodeTitle) {
            danmakuName = `${animeTitle} - ${episodeTitle}`;
        } else if (animeTitle) {
            danmakuName = animeTitle;
        } else if (episodeTitle) {
            danmakuName = episodeTitle;
        }

        return [{ name: danmakuName, url: `${DANMU_API}/api/v2/comment/${first.episodeId}?format=xml` }];
    } catch (error) {
        logWarn("弹幕匹配异常", { error: error.message || String(error) });
        return [];
    }
}

// ==================== 基础工具 ====================
function getCurrentHost() {
    return HOSTS[currentHostIndex] || HOSTS[0];
}

function rotateHost() {
    currentHostIndex = (currentHostIndex + 1) % HOSTS.length;
    return getCurrentHost();
}

function fixJsonWrappedHtml(html) {
    if (html == null) {
        return "";
    }
    if (typeof html === "object") {
        try {
            return JSON.stringify(html);
        } catch {
            return "";
        }
    }
    const raw = String(html);
    const trimmed = raw.trim();
    if (!trimmed) {
        return "";
    }
    if (trimmed.startsWith("<") || trimmed.startsWith("<!DOCTYPE")) {
        return trimmed;
    }
    if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (typeof parsed === "string") {
                return parsed.trim();
            }
        } catch {
            return trimmed;
        }
    }
    return trimmed;
}

function safeJsonParse(value, fallback = null) {
    if (value == null || value === "") {
        return fallback;
    }
    if (typeof value === "object") {
        return value;
    }
    try {
        return JSON.parse(String(value));
    } catch {
        return fallback;
    }
}

function isAbsoluteUrl(url) {
    return /^https?:\/\//i.test(String(url || ""));
}

function fixUrl(url, host = getCurrentHost()) {
    const value = String(url || "").trim();
    if (!value) {
        return "";
    }
    if (isAbsoluteUrl(value)) {
        return value;
    }
    if (value.startsWith("//")) {
        return `https:${value}`;
    }
    if (value.startsWith("/")) {
        return `${host}${value}`;
    }
    return `${host}/${value}`;
}

function normalizeImage(url, host = getCurrentHost()) {
    const normalized = fixUrl(url, host);
    return normalized || "";
}

function parsePage(value, fallback = 1) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseFilters(params = {}) {
    const merged = {};
    const candidates = [params.filters, params.extend, params.ext];
    for (const item of candidates) {
        if (!item) {
            continue;
        }
        if (typeof item === "object") {
            Object.assign(merged, item);
            continue;
        }
        if (typeof item === "string") {
            try {
                const parsed = JSON.parse(item);
                if (parsed && typeof parsed === "object") {
                    Object.assign(merged, parsed);
                }
            } catch {
                // ignore invalid filter json
            }
        }
    }
    const normalized = {};
    for (const [key, value] of Object.entries(merged)) {
        if (!["sort", "type", "area", "lang", "year"].includes(key)) {
            continue;
        }
        normalized[key] = String(value || "").trim();
    }
    if (!FULL_SORT_OPTIONS.some((item) => item.value === normalized.sort)) {
        normalized.sort = "time";
    }
    return normalized;
}

async function requestHtml(url, options = {}) {
    const response = await axiosInstance.get(url, {
        ...options,
        headers: {
            ...DEFAULT_HEADERS,
            Referer: `${getCurrentHost()}/`,
            Origin: getCurrentHost(),
            ...(options.headers || {}),
        },
    });
    return fixJsonWrappedHtml(response.data || "");
}

/**
 * 按 host 列表自动重试。
 * - 绝对 URL：直接请求一次
 * - 相对 URL：按当前 host 开始轮询，成功即返回
 */
async function requestHtmlWithFailover(pathOrUrl, options = {}) {
    if (isAbsoluteUrl(pathOrUrl)) {
        return requestHtml(pathOrUrl, options);
    }

    let lastError = null;
    const startIndex = currentHostIndex;

    for (let i = 0; i < HOSTS.length; i++) {
        const host = HOSTS[currentHostIndex];
        const url = fixUrl(pathOrUrl, host);
        try {
            logInfo("请求页面", { host, path: pathOrUrl });
            const html = await requestHtml(url, {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    Referer: `${host}/`,
                    Origin: host,
                },
            });

            if (html) {
                const trimmed = String(html).trim();
                const isHtml = trimmed.includes("<html") || trimmed.startsWith("<!DOCTYPE");
                const isJson = trimmed.startsWith("{") || trimmed.startsWith("[");
                if (isHtml || isJson) {
                    if (i > 0) {
                        logInfo("站点切换成功", { from: HOSTS[startIndex], to: host });
                    }
                    return { html, host };
                }
            }

            lastError = new Error("empty or invalid html");
            logWarn("页面内容异常，切换下一个 host", { host });
        } catch (error) {
            lastError = error;
            logWarn("请求失败，切换下一个 host", { host, error: error.message || String(error) });
        }

        rotateHost();
    }

    throw lastError || new Error("all hosts failed");
}

// ==================== 列表解析 ====================
function pickFirstText($root, selectors = []) {
    for (const selector of selectors) {
        const value = $root.find(selector).first().text().trim();
        if (value) {
            return value;
        }
    }
    return "";
}

function pickFirstAttr($root, selectors = [], attrName = "href") {
    for (const selector of selectors) {
        const value = $root.find(selector).first().attr(attrName);
        if (value) {
            return String(value).trim();
        }
    }
    return "";
}

function parsePosterItem($, element, host) {
    const $item = $(element);

    const title =
        pickFirstAttr($item, ["h3 a", ".title a", ".li-img a", "a"], "title") ||
        pickFirstText($item, ["h3 a", ".title a", "a"]);

    if (!title) {
        return null;
    }

    const desc = pickFirstText($item, [".tag", ".label", ".remark"]);
    const img = pickFirstAttr($item, [".li-img img", "img"], "src");
    const href = pickFirstAttr($item, ["h3 a", ".title a", ".li-img a", "a"], "href");

    if (!href) {
        return null;
    }

    return {
        vod_id: fixUrl(href, host),
        vod_name: title,
        vod_pic: normalizeImage(img, host),
        vod_remarks: desc || "",
    };
}

function parseVideoList(html, host) {
    const $ = cheerio.load(html || "");
    const nodes = $(".content-list li");
    const list = [];
    nodes.each((_, element) => {
        const item = parsePosterItem($, element, host);
        if (item) {
            list.push(item);
        }
    });
    return list;
}

function buildCategoryPath(categoryId, page, filters = {}) {
    const area = encodeURIComponent(String(filters.area || "").trim());
    const sort = String(filters.sort || "time").trim() || "time";
    const type = encodeURIComponent(String(filters.type || "").trim());
    const lang = encodeURIComponent(String(filters.lang || "").trim());
    const year = encodeURIComponent(String(filters.year || "").trim());
    return `/ms/${categoryId}-${area}-${sort}-${type}-${lang}-------${year}.html?page=${page}`;
}

function parsePanTypeKey(url) {
    const source = String(url || "").toLowerCase();
    if (!source) {
        return "";
    }
    const mapping = {
        "pan.baidu.com": "baidu",
        "pan.baiduimg.com": "baidu",
        "pan.quark.cn": "quark",
        "drive.uc.cn": "uc",
        "cloud.189.cn": "tianyi",
        "yun.139.com": "mobile",
        "alipan.com": "ali",
        "pan.aliyun.com": "ali",
        "115.com": "115",
        "115cdn.com": "115",
    };

    for (const [key, type] of Object.entries(mapping)) {
        if (source.includes(key)) {
            return type;
        }
    }
    return "";
}

function parsePanType(url) {
    const typeKey = parsePanTypeKey(url);
    const typeMap = {
        baidu: "百度",
        quark: "夸克",
        uc: "UC",
        tianyi: "天翼",
        mobile: "移动",
        ali: "阿里",
        115: "115",
    };
    return typeMap[typeKey] || "其他";
}

function isPanUrl(url) {
    const source = String(url || "");
    if (!source) {
        return false;
    }
    return [
        "pan.baidu.com",
        "pan.baiduimg.com",
        "pan.quark.cn",
        "drive.uc.cn",
        "cloud.189.cn",
        "yun.139.com",
        "alipan.com",
        "pan.aliyun.com",
        "115.com",
        "115cdn.com",
    ].some((key) => source.includes(key));
}

function isDirectVideoUrl(url) {
    if (!url) {
        return false;
    }
    return /\.(m3u8|mp4|flv|avi|mkv|ts|mov|webm)(\?|$)/i.test(String(url));
}

function normalizeShareUrl(url) {
    if (!url) {
        return "";
    }
    let value = String(url).trim();
    if (value.startsWith("push://")) {
        value = value.slice("push://".length);
    }
    if (value.startsWith("push:")) {
        value = value.slice("push:".length);
    }
    const dnIndex = value.toLowerCase().indexOf("&dn=");
    if (dnIndex !== -1) {
        value = value.slice(0, dnIndex);
    }
    return value.trim();
}

function isVideoFile(file) {
    if (!file || !file.file_name) {
        return false;
    }
    const fileName = String(file.file_name).toLowerCase();
    const videoExtensions = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];
    for (const ext of videoExtensions) {
        if (fileName.endsWith(ext)) {
            return true;
        }
    }
    if (file.format_type) {
        const formatType = String(file.format_type).toLowerCase();
        if (formatType.includes("video") || formatType.includes("mpeg") || formatType.includes("h264")) {
            return true;
        }
    }
    return false;
}

function getFileId(file) {
    return file?.fid || file?.file_id || "";
}

function getFileName(file) {
    return file?.file_name || file?.name || "";
}

async function getAllVideoFiles(shareURL, files) {
    const videoFiles = [];
    for (const file of files || []) {
        if (file.file && isVideoFile(file)) {
            videoFiles.push(file);
        } else if (file.dir) {
            try {
                const subFileId = getFileId(file);
                if (!subFileId) {
                    continue;
                }
                const subFileList = await OmniBox.getDriveFileList(shareURL, subFileId);
                if (subFileList && Array.isArray(subFileList.files)) {
                    const subVideos = await getAllVideoFiles(shareURL, subFileList.files);
                    videoFiles.push(...subVideos);
                }
            } catch (error) {
                logWarn("获取网盘子目录文件失败", { shareURL, fileId: getFileId(file), error: error.message || String(error) });
            }
        }
    }
    return videoFiles;
}

function buildCacheKey(prefix, value) {
    return `${prefix}:${String(value || "")}`;
}

async function getCachedJSON(key) {
    try {
        return await OmniBox.getCache(key);
    } catch (error) {
        logWarn("读取缓存失败", { key, error: error.message || String(error) });
        return null;
    }
}

async function setCachedJSON(key, value, exSeconds = QIWEI_CACHE_EX_SECONDS) {
    try {
        await OmniBox.setCache(key, value, exSeconds);
    } catch (error) {
        logWarn("写入缓存失败", { key, error: error.message || String(error) });
    }
}

async function getDriveInfoCached(shareURL) {
    const cacheKey = buildCacheKey("qiwei:driveInfo", shareURL);
    let driveInfo = await getCachedJSON(cacheKey);
    if (!driveInfo) {
        driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
        if (driveInfo) {
            await setCachedJSON(cacheKey, driveInfo);
        }
    } else {
        logInfo("命中网盘信息缓存", { shareURL });
    }
    return driveInfo;
}

async function getRootFileListCached(shareURL) {
    const cacheKey = buildCacheKey("qiwei:rootFiles", shareURL);
    let fileList = await getCachedJSON(cacheKey);
    if (!fileList) {
        fileList = await OmniBox.getDriveFileList(shareURL, "0");
        if (fileList && Array.isArray(fileList.files)) {
            await setCachedJSON(cacheKey, fileList);
        }
    } else {
        logInfo("命中网盘根目录缓存", { shareURL, count: Array.isArray(fileList?.files) ? fileList.files.length : 0 });
    }
    return fileList;
}

async function getAllVideoFilesCached(shareURL, rootFiles = []) {
    const cacheKey = buildCacheKey("qiwei:videoFiles", shareURL);
    let videos = await getCachedJSON(cacheKey);
    if (!Array.isArray(videos) || videos.length === 0) {
        videos = await getAllVideoFiles(shareURL, rootFiles);
        if (Array.isArray(videos) && videos.length > 0) {
            await setCachedJSON(cacheKey, videos);
        }
    } else {
        logInfo("命中网盘视频文件缓存", { shareURL, count: videos.length });
    }
    return Array.isArray(videos) ? videos : [];
}

async function getMergedMetadataCached(videoId, vodName, scrapeCandidates = []) {
    const metadataCacheKey = buildCacheKey("qiwei:metadata", videoId);
    const metadataRefreshLockKey = buildCacheKey("qiwei:metadataRefreshLock", videoId);

    let scrapeData = null;
    let videoMappings = [];
    let scrapeType = "";
    const cachedMetadata = await getCachedJSON(metadataCacheKey);

    if (cachedMetadata) {
        scrapeData = cachedMetadata.scrapeData || null;
        videoMappings = Array.isArray(cachedMetadata.videoMappings) ? cachedMetadata.videoMappings : [];
        scrapeType = cachedMetadata.scrapeType || "";
        logInfo("命中刮削元数据缓存", { videoId, mappingCount: videoMappings.length, scrapeType });
    }

    const refreshMetadataInBackground = async () => {
        const refreshLock = await getCachedJSON(metadataRefreshLockKey);
        if (refreshLock || scrapeCandidates.length === 0) {
            return;
        }
        await setCachedJSON(metadataRefreshLockKey, { refreshing: true }, QIWEI_CACHE_EX_SECONDS);
        try {
            logInfo("后台刷新刮削元数据", { videoId, candidateCount: scrapeCandidates.length });
            await OmniBox.processScraping(String(videoId || ""), vodName || "", vodName || "", scrapeCandidates);
            const metadata = await OmniBox.getScrapeMetadata(String(videoId || ""));
            await setCachedJSON(metadataCacheKey, {
                scrapeData: metadata?.scrapeData || null,
                videoMappings: metadata?.videoMappings || [],
                scrapeType: metadata?.scrapeType || "",
            }, QIWEI_CACHE_EX_SECONDS);
        } catch (error) {
            logWarn("后台刷新刮削元数据失败", { videoId, error: error.message || String(error) });
        }
    };

    if (!cachedMetadata && scrapeCandidates.length > 0) {
        try {
            logInfo("未命中刮削元数据缓存，开始同步刮削", { videoId, candidateCount: scrapeCandidates.length });
            const scrapingResult = await OmniBox.processScraping(String(videoId || ""), vodName || "", vodName || "", scrapeCandidates);
            logInfo("刮削处理完成", { videoId, length: JSON.stringify(scrapingResult || {}).length });
            const metadata = await OmniBox.getScrapeMetadata(String(videoId || ""));
            scrapeData = metadata?.scrapeData || null;
            videoMappings = metadata?.videoMappings || [];
            scrapeType = metadata?.scrapeType || "";
            await setCachedJSON(metadataCacheKey, {
                scrapeData,
                videoMappings,
                scrapeType,
            }, QIWEI_CACHE_EX_SECONDS);
            logInfo("刮削元数据读取完成", { videoId, hasScrapeData: !!scrapeData, mappingCount: videoMappings.length, scrapeType });
        } catch (error) {
            logWarn("刮削处理失败", { videoId, error: error.message || String(error) });
        }
    } else if (cachedMetadata) {
        refreshMetadataInBackground().catch((error) => {
            logWarn("异步刷新刮削元数据失败", { videoId, error: error.message || String(error) });
        });
    }

    return {
        scrapeData,
        videoMappings,
        scrapeType,
        cachedMetadata,
    };
}

const panRouteCache = new Map();

async function loadPanFiles(shareURL) {
    if (!shareURL) {
        return null;
    }
    try {
        await getDriveInfoCached(shareURL);
        const fileList = await getRootFileListCached(shareURL);
        const files = Array.isArray(fileList?.files) ? fileList.files : [];
        const videos = await getAllVideoFilesCached(shareURL, files);
        return { videos };
    } catch (error) {
        logWarn("读取网盘文件失败", { shareURL, error: error.message || String(error) });
        return null;
    }
}

function extractRouteTypeFromFlag(flag) {
    const value = String(flag || "").trim();
    if (!value) {
        return "";
    }
    if (value.includes("-")) {
        const last = value.split("-").pop();
        return String(last || "").trim();
    }
    return value;
}

function hasValidPlayUrls(playInfo) {
    return Array.isArray(playInfo?.url) && playInfo.url.some((item) => item?.url);
}

async function detectValidPanRoutes(shareURL, videos = [], callerSource = "", context = {}, maxNeeded = MAX_PAN_VALID_ROUTES) {
    const routeLimit = Math.max(1, Math.min(MAX_PAN_VALID_ROUTES, parseInt(maxNeeded, 10) || MAX_PAN_VALID_ROUTES));
    const filteredCandidates = filterSourceNamesForCaller(PAN_ROUTE_NAMES.length > 0 ? PAN_ROUTE_NAMES : ["直连"], callerSource, context);
    const cacheKey = `${shareURL}::${callerSource || "default"}::${routeLimit}::${filteredCandidates.join(",")}`;
    if (panRouteCache.has(cacheKey)) {
        return panRouteCache.get(cacheKey);
    }

    const sample = (videos || []).find((x) => getFileId(x));
    if (!sample) {
        const fallback = filteredCandidates.length > 0 ? filteredCandidates : ["直连"];
        const result = fallback.slice(0, routeLimit);
        panRouteCache.set(cacheKey, result);
        return result;
    }

    const sampleFileId = getFileId(sample);
    const validRoutes = [];

    for (const routeName of filteredCandidates.slice(0, routeLimit)) {
        try {
            const playInfo = await OmniBox.getDriveVideoPlayInfo(shareURL, sampleFileId, routeName);
            if (hasValidPlayUrls(playInfo)) {
                validRoutes.push(routeName);
            }
        } catch (error) {
            logWarn("网盘线路有效性检测失败", { shareURL, routeName, error: error.message || String(error) });
        }
    }

    const result = validRoutes.slice(0, routeLimit);
    panRouteCache.set(cacheKey, result);
    logInfo("网盘线路有效性检测完成", {
        shareURL,
        callerSource,
        candidates: filteredCandidates,
        validRoutes: result,
        routeLimit,
    });
    return result;
}

function isBlockedLineName(name) {
    if (!name) {
        return false;
    }
    return String(name).includes("磁力");
}

// ==================== 标准接口 ====================
async function home(params) {
    try {
        const { html, host } = await requestHtmlWithFailover("/");
        const list = parseVideoList(html, host);
        logInfo("首页加载完成", { host, count: list.length });
        return {
            class: CLASSES,
            filters: FILTERS,
            list,
        };
    } catch (error) {
        logError("首页加载失败", error);
        return {
            class: CLASSES,
            filters: FILTERS,
            list: [],
        };
    }
}

async function category(params) {
    const categoryId = String(params.categoryId || "1");
    const page = parsePage(params.page, 1);
    const filters = parseFilters(params);

    try {
        const path = buildCategoryPath(categoryId, page, filters);
        const { html, host } = await requestHtmlWithFailover(path);
        const list = parseVideoList(html, host);
        logInfo("分类加载完成", { categoryId, page, host, count: list.length, filters });
        return {
            page,
            pagecount: list.length >= 20 ? page + 1 : page,
            total: list.length,
            list,
        };
    } catch (error) {
        logError("分类加载失败", error);
        return {
            page,
            pagecount: page,
            total: 0,
            list: [],
        };
    }
}

async function search(params) {
    const keyword = String(params.keyword || params.wd || "").trim();
    const page = parsePage(params.page, 1);

    if (!keyword) {
        logWarn("搜索关键词为空");
        return {
            page,
            pagecount: page,
            total: 0,
            list: [],
        };
    }

    try {
        const path = `/index.php/ajax/suggest?mid=1&limit=20&wd=${encodeURIComponent(keyword)}`;
        const { html, host } = await requestHtmlWithFailover(path, {
            headers: {
                Accept: "application/json, text/plain, */*",
                "X-Requested-With": "XMLHttpRequest",
                Referer: `${getCurrentHost()}/`,
            },
        });
        const data = safeJsonParse(html, {});
        const items = Array.isArray(data?.list) ? data.list : [];
        const list = items.map((item) => {
            const vodId = String(item?.id || "").trim();
            const pic = normalizeImage(item?.pic || "", host);
            return {
                vod_id: vodId,
                vod_name: String(item?.name || "").trim(),
                vod_pic: pic,
                vod_remarks: "",
            };
        }).filter((item) => item.vod_id && item.vod_name);
        const pageCount = Number(data?.pagecount) || (list.length >= 20 ? page + 1 : page);
        const total = Number(data?.total) || list.length;
        logInfo("搜索完成", { keyword, page, host, count: list.length, api: path, total, pageCount });
        return {
            page,
            pagecount: pageCount,
            total,
            list,
        };
    } catch (error) {
        logError("搜索失败", error);
        return {
            page,
            pagecount: page,
            total: 0,
            list: [],
        };
    }
}

function parseDetailInfo(html, host) {
    const $ = cheerio.load(html || "");

    const title =
        $(".main-ui-meta h1").first().clone().children("span").remove().end().text().trim() ||
        $(".detail-title").first().text().trim() ||
        "";

    let typeName = "";
    const typeBox = html.match(/<div><span>类型：<\/span>[\s\S]*?<\/div>/);
    if (typeBox && typeBox[0]) {
        const names = [...typeBox[0].matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => m[1]);
        typeName = [...new Set(names)].join("/");
    }

    let area = "";
    const areaBox = html.match(/<div><span>地区：<\/span>[\s\S]*?<\/div>/);
    if (areaBox && areaBox[0]) {
        const names = [...areaBox[0].matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => m[1]);
        area = [...new Set(names)].join("/");
    }

    const showContent = $(".movie-introduce .zkjj_a").first().text().replace(/\s*\[展开全部\]/g, "").trim();
    const hideContent = $(".movie-introduce .sqjj_a").first().text().replace(/\s*\[收起部分\]/g, "").trim();

    const directorMatch = html.match(/<div>[\s\S]*?导演：[\s\S]*?<\/div>/);
    const director = directorMatch?.[0]?.match(/<a[^>]*>([^<]+)<\/a>/)?.[1] || "";

    return {
        vod_name: title,
        type_name: typeName || $(".main-ui-meta div:nth-child(9) a").first().text().trim(),
        vod_pic: normalizeImage($(".img img").first().attr("src"), host),
        vod_content: hideContent || showContent || $(".detail-content").first().text().trim() || "",
        vod_remarks: $(".otherbox").first().text().trim() || "",
        vod_year: ($(".main-ui-meta h1 span.year").first().text() || "").replace(/[()]/g, "").trim(),
        vod_area: area || $(".main-ui-meta div:nth-child(11) a").first().text().trim(),
        vod_actor: ($(".main-ui-meta div.text-overflow").first().text() || "").replace(/^主演：/, "").trim(),
        vod_director: director,
    };
}

function normalizeCollectLineName(name = "") {
    return String(name || "")
        .replace(/[\u00a0\u2000-\u200f\u2028-\u202f\u205f\u3000]/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\s+(\d+)$/u, "")
        .trim();
}

function formatPanSourceName(type = "", index = 0) {
    const baseName = String(type || "").trim() || "网盘";
    const suffix = index > 0 ? ` ${index + 1}` : "";
    return `${baseName}${suffix}`;
}

async function parsePlaySources(html, videoId, host, callerSource = "", context = {}) {
    const $ = cheerio.load(html || "");
    const playSources = [];

    const tabItems = $(".py-tabs li").toArray();
    const episodeContainers = $(".bd ul.player").toArray();
    const normalizedLineNames = tabItems.map((tab, index) => {
        const rawName = $(tab).text().trim();
        const normalizedName = normalizeCollectLineName(rawName);
        return normalizedName || `线路${index + 1}`;
    });
    const lineNameCounter = normalizedLineNames.reduce((acc, name) => {
        acc.set(name, (acc.get(name) || 0) + 1);
        return acc;
    }, new Map());
    const lineNameSeen = new Map();

    const lineCount = Math.min(tabItems.length, episodeContainers.length);
    for (let i = 0; i < lineCount; i++) {
        const baseLineName = normalizedLineNames[i] || `线路${i + 1}`;
        const duplicatedCount = lineNameCounter.get(baseLineName) || 0;
        const currentIndex = (lineNameSeen.get(baseLineName) || 0) + 1;
        lineNameSeen.set(baseLineName, currentIndex);
        const lineName = duplicatedCount > 1 ? `${baseLineName} ${currentIndex}` : baseLineName;

        if (isBlockedLineName(lineName)) {
            continue;
        }

        const episodes = [];
        $(episodeContainers[i])
            .find("a")
            .each((idx, node) => {
                const name = $(node).text().trim() || `第${idx + 1}集`;
                const fid = `${videoId}#${i}#${idx}`;
                episodes.push({
                    name,
                    playId: `${videoId}|${i}|${idx}|||${encodeMeta({ sid: String(videoId || ""), fid, e: name })}`,
                    _fid: fid,
                    _rawName: name,
                });
            });

        if (episodes.length === 0) {
            const fid = `${videoId}#${i}#0`;
            episodes.push({
                name: "正片",
                playId: `${videoId}|${i}|0|||${encodeMeta({ sid: String(videoId || ""), fid, e: "正片" })}`,
                _fid: fid,
                _rawName: "正片",
            });
        }

        playSources.push({
            name: lineName,
            episodes,
        });
    }

    // 网盘链接
    const panRegex = /https?:\/\/(pan\.baidu\.com|pan\.quark\.cn|drive\.uc\.cn|cloud\.189\.cn|yun\.139\.com|alipan\.com|pan\.aliyun\.com|115\.com|115cdn\.com)\/[^"'\s>]+/g;
    const htmlPanLinks = html.match(panRegex) || [];
    const anchorPanLinks = $("a")
        .toArray()
        .flatMap((a) => {
            const links = [];
            const href = $(a).attr("href") || "";
            const clipboard = $(a).attr("data-clipboard-text") || "";
            if (isPanUrl(href)) {
                links.push(href);
            }
            if (isPanUrl(clipboard)) {
                links.push(clipboard);
            }
            return links;
        });

    const allPanLinks = [...new Set([...htmlPanLinks, ...anchorPanLinks])];
    const grouped = {};

    for (const link of allPanLinks) {
        const type = parsePanType(link);
        if (type === "其他") {
            continue;
        }
        if (!grouped[type]) {
            grouped[type] = [];
        }
        grouped[type].push(link);
    }

    for (const [type, links] of Object.entries(grouped)) {
        const maxRoutesPerLink = Math.max(1, MAX_PAN_VALID_ROUTES);
        const maxShareCount = maxRoutesPerLink;
        let builtShareCount = 0;

        for (let index = 0; index < links.length; index++) {
            if (builtShareCount >= maxShareCount) {
                logInfo("已达到同类网盘分享阈值，跳过后续分享", { type, maxShareCount, skipped: links.length - index });
                break;
            }

            const link = links[index];
            const shareURL = normalizeShareUrl(link);
            if (!isPanUrl(shareURL)) {
                continue;
            }

            const sourceName = formatPanSourceName(type, builtShareCount);
            const driveTypeKey = parsePanTypeKey(shareURL);
            const multiRouteEnabled = driveTypeKey && DRIVE_TYPE_CONFIG.includes(driveTypeKey);

            const panInfo = await loadPanFiles(shareURL);
            const files = panInfo?.videos || [];
            if (!files.length) {
                logInfo("网盘分享未解析到有效视频文件，跳过当前分享", { type, shareURL });
                continue;
            }

            const panEpisodes = [];

            for (const file of files) {
                const fileId = getFileId(file);
                if (!fileId) {
                    continue;
                }
                const fileName = getFileName(file) || sourceName;
                const fid = `${videoId}#pan#${builtShareCount}#${fileId}`;
                const combinedId = `${shareURL}|${fileId}|||${encodeMeta({ sid: String(videoId || ""), fid, e: fileName })}`;
                panEpisodes.push({
                    name: fileName,
                    playId: combinedId,
                    _fid: fid,
                    _rawName: fileName,
                });
            }

            if (panEpisodes.length === 0) {
                logInfo("网盘分享视频文件缺少可用 fileId，跳过当前分享", { type, shareURL, files: files.length });
                continue;
            }

            if (!multiRouteEnabled) {
                playSources.push({
                    name: sourceName,
                    episodes: panEpisodes.map((ep) => ({
                        name: ep.name,
                        playId: ep.playId,
                        _fid: ep._fid,
                        _rawName: ep._rawName,
                    })),
                });
                builtShareCount += 1;
                continue;
            }

            const validRoutes = await detectValidPanRoutes(shareURL, files, callerSource, context, maxRoutesPerLink);
            if (validRoutes.length === 0) {
                logInfo("网盘分享未检测到有效播放路线，跳过当前分享", { type, shareURL });
                continue;
            }

            for (const routeName of validRoutes.slice(0, maxRoutesPerLink)) {
                playSources.push({
                    name: `${sourceName} ${routeName}`,
                    episodes: panEpisodes.map((ep) => ({
                        name: ep.name,
                        playId: ep.playId,
                        _fid: ep._fid,
                        _rawName: ep._rawName,
                    })),
                });
            }
            builtShareCount += 1;
        }
    }

    if (playSources.length === 0) {
        playSources.push({
            name: "默认线路",
            episodes: [
                {
                    name: "正片",
                    playId: `${videoId}|0|0|||${encodeMeta({ sid: String(videoId || ""), fid: `${videoId}#0#0`, e: "正片" })}`,
                    _fid: `${videoId}#0#0`,
                    _rawName: "正片",
                },
            ],
        });
    }

    logInfo("解析播放线路完成", { host, lines: playSources.length });
    return playSources;
}

function extractVideoId(urlOrId) {
    const value = String(urlOrId || "");
    const match = value.match(/\/mv\/(\d+)\.html/);
    return match ? match[1] : value;
}

async function detail(params, context = {}) {
    const inputId = params.videoId || "";
    const videoId = extractVideoId(inputId);

    if (!videoId) {
        logWarn("详情请求缺少有效 videoId", { inputId });
        return { list: [] };
    }

    const path = `/mv/${videoId}.html`;

    try {
        const { html, host } = await requestHtmlWithFailover(path);
        const info = parseDetailInfo(html, host);
        const callerSource = resolveCallerSource(params, context);
        let playSources = await parsePlaySources(html, videoId, host, callerSource, context);

        let scrapeData = null;
        let videoMappings = [];
        let scrapeType = "";
        const scrapeCandidates = [];
        const seenFids = new Set();

        for (const source of playSources) {
            for (const ep of source.episodes || []) {
                if (!ep._fid) continue;
                if (seenFids.has(ep._fid)) continue;
                seenFids.add(ep._fid);
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
            ({ scrapeData, videoMappings, scrapeType } = await getMergedMetadataCached(
                String(videoId || ""),
                info.vod_name || "",
                scrapeCandidates
            ));
        }

        for (const source of playSources) {
            for (const ep of source.episodes || []) {
                const mapping = videoMappings.find((m) => m?.fileId === ep._fid);
                if (!mapping) continue;
                const newName = buildScrapedEpisodeName(scrapeData, mapping, ep.name);
                if (newName && newName !== ep.name) {
                    logInfo("应用刮削后源文件名", { old: ep.name, new: newName });
                    ep.name = newName;
                }
                ep._seasonNumber = mapping.seasonNumber;
                ep._episodeNumber = mapping.episodeNumber;
            }

            const hasEpisodeNumber = (source.episodes || []).some((ep) => ep._episodeNumber !== undefined && ep._episodeNumber !== null);
            if (hasEpisodeNumber) {
                source.episodes.sort((a, b) => {
                    const sa = a._seasonNumber || 0;
                    const sb = b._seasonNumber || 0;
                    if (sa !== sb) return sa - sb;
                    const ea = a._episodeNumber || 0;
                    const eb = b._episodeNumber || 0;
                    return ea - eb;
                });
            }
        }

        const normalizedPlaySources = sortPlaySourcesByDriveOrder(playSources).map((source) => ({
            name: source.name,
            episodes: (source.episodes || []).map((ep) => ({
                name: ep.name,
                playId: ep.playId,
            })),
        }));

        const vod = {
            vod_id: videoId,
            ...info,
            vod_play_sources: normalizedPlaySources,
        };

        if (scrapeData) {
            vod.vod_name = scrapeData.title || vod.vod_name;
            if (scrapeData.posterPath) {
                vod.vod_pic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
            }
            if (scrapeData.overview) {
                vod.vod_content = scrapeData.overview;
            }
            if (scrapeData.releaseDate) {
                vod.vod_year = String(scrapeData.releaseDate).substring(0, 4) || vod.vod_year || "";
            }
            const actors = (scrapeData.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(",");
            if (actors) {
                vod.vod_actor = actors;
            }
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

        return {
            list: [vod],
        };
    } catch (error) {
        logError("详情解析失败", error);
        return { list: [] };
    }
}

async function play(params, context = {}) {
    let playId = String(params.playId || "").trim();
    const flag = String(params.flag || "").trim();
    const callerSource = resolveCallerSource(params, context);
    let playMeta = {};

    logInfo("开始播放解析", { playId, flag });

    if (!playId) {
        return {
            urls: [{ name: "解析失败", url: "" }],
            parse: 1,
            header: {
                ...DEFAULT_HEADERS,
                Referer: `${getCurrentHost()}/`,
            },
        };
    }

    if (playId.includes("|||")) {
        const [mainPlayId, metaB64] = playId.split("|||");
        playId = mainPlayId;
        playMeta = decodeMeta(metaB64 || "");
        logInfo("解析透传信息", { sid: playMeta.sid || "", fid: playMeta.fid || "", e: playMeta.e || "" });
    }

    if (playId && playId.includes("|")) {
        const [rawShareURL, fileId] = playId.split("|");
        const shareURL = normalizeShareUrl(rawShareURL);
        if (shareURL && fileId && isPanUrl(shareURL)) {
            try {
                const routeType = resolveRouteType(flag, callerSource, context);
                logInfo("网盘播放路线解析", { shareURL, fileId, flag, callerSource, routeType });
                const playInfoPromise = OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);
                const metadataPromise = (async () => {
                    const result = {
                        danmakuList: [],
                        scrapeTitle: "",
                        scrapePic: "",
                        episodeNumber: null,
                        episodeName: String(params.episodeName || playMeta.e || "").trim(),
                    };

                    const videoIdForScrape = String(params.vodId || playMeta.sid || "").trim();
                    if (!videoIdForScrape) {
                        return result;
                    }

                    try {
                        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                        if (!metadata || !metadata.scrapeData || !Array.isArray(metadata.videoMappings)) {
                            return result;
                        }

                        const formattedFileId = `${shareURL}|${fileId}|${videoIdForScrape}`;
                        const mapping = metadata.videoMappings.find((m) => m?.fileId === formattedFileId);
                        if (!mapping) {
                            return result;
                        }

                        const scrapeData = metadata.scrapeData;
                        result.scrapeTitle = scrapeData.title || "";
                        if (scrapeData.posterPath) {
                            result.scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
                        }
                        if (mapping.episodeNumber) {
                            result.episodeNumber = mapping.episodeNumber;
                        }
                        if (mapping.episodeName && !result.episodeName) {
                            result.episodeName = mapping.episodeName;
                        }

                        const fileName = buildScrapedDanmuFileName(
                            scrapeData,
                            metadata.scrapeType || "",
                            mapping,
                            String(params.vodName || playMeta.v || scrapeData.title || "").trim(),
                            result.episodeName
                        );
                        if (fileName) {
                            const matchedDanmaku = typeof OmniBox.getDanmakuByFileName === "function"
                                ? await OmniBox.getDanmakuByFileName(fileName)
                                : await matchDanmu(fileName);
                            if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
                                result.danmakuList = matchedDanmaku;
                            }
                        }
                    } catch (error) {
                        logWarn("读取网盘弹幕元数据失败", { error: error.message || String(error) });
                    }

                    return result;
                })();

                const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);
                if (playInfoResult.status !== "fulfilled") {
                    throw playInfoResult.reason || new Error("无法获取播放地址");
                }

                const playInfo = playInfoResult.value;
                const urlList = Array.isArray(playInfo?.url) ? playInfo.url : [];
                logInfo("网盘播放信息返回", {
                    shareURL,
                    fileId,
                    flag,
                    callerSource,
                    routeType,
                    urlCount: urlList.length,
                    routeFlags: urlList.map((item) => item?.name || "播放").filter(Boolean),
                    hasHeader: !!playInfo?.header && Object.keys(playInfo.header || {}).length > 0,
                });
                const urlsResult = urlList.map((item) => ({
                    name: item.name || "播放",
                    url: item.url,
                }));
                if (urlsResult.length > 0) {
                    const header = playInfo?.header || {};
                    const shareURLLower = String(shareURL || "").toLowerCase();
                    const isUcDrive = shareURLLower.includes("drive.uc.cn") || shareURLLower.includes("pc-api.uc.cn") || shareURLLower.includes("uc.cn/s/");
                    logInfo("网盘播放结果出参", {
                        shareURL,
                        fileId,
                        flag,
                        callerSource,
                        routeType,
                        isUcDrive,
                        headerKeys: Object.keys(header || {}),
                        urlsPreview: urlsResult.map((item) => ({ name: item.name, url: String(item.url || "").slice(0, 160) })),
                    });

                    const metadataValue = metadataResult.status === "fulfilled" ? metadataResult.value : null;
                    const finalDanmaku = metadataValue?.danmakuList?.length ? metadataValue.danmakuList : (playInfo?.danmaku || []);

                    return {
                        urls: urlsResult,
                        header,
                        parse: 0,
                        danmaku: finalDanmaku};
                }
            } catch (error) {
                logWarn("网盘文件播放失败，回退 push", { shareURL, fileId, flag, callerSource, error: error.message || String(error) });
                const pushUrl = shareURL.startsWith("push://") ? shareURL : `push://${shareURL}`;
                return {
                    urls: [{ name: "网盘资源", url: pushUrl }],
                    parse: 0,
                    header: {},
                };
            }
        }
    }

    // 磁力直出
    if (playId.startsWith("magnet:")) {
        return {
            urls: [{ name: "磁力资源", url: playId }],
            parse: 0,
            header: {
                ...DEFAULT_HEADERS,
                Referer: `${getCurrentHost()}/`,
            },
        };
    }

    // 网盘走 push
    if (isPanUrl(playId)) {
        const pushUrl = playId.startsWith("push://") ? playId : `push://${playId}`;
        return {
            urls: [{ name: "网盘资源", url: pushUrl }],
            parse: 0,
            header: {},
        };
    }

    // 常规剧集 ID: videoId|lineIndex|episodeIndex
    let resolvedPlayUrl = "";
    const parts = playId.split("|");
    if (parts.length === 3 && parts.every((x) => x !== "")) {
        const videoId = parts[0];
        const lineIndex = parseInt(parts[1], 10);
        const episodeIndex = parseInt(parts[2], 10);

        if (Number.isFinite(lineIndex) && Number.isFinite(episodeIndex)) {
            resolvedPlayUrl = `${getCurrentHost()}/py/${videoId}-${lineIndex + 1}-${episodeIndex + 1}.html`;
        }
    }

    if (!resolvedPlayUrl) {
        resolvedPlayUrl = fixUrl(playId, getCurrentHost());
    }

    const defaultHeader = {
        ...DEFAULT_HEADERS,
        Referer: `${getCurrentHost()}/`,
        Origin: getCurrentHost(),
    };

    // 直接视频地址不再二次嗅探
    if (isDirectVideoUrl(resolvedPlayUrl)) {
        logInfo("检测到直链视频，直接返回", { url: resolvedPlayUrl });
        return {
            urls: [{ name: "默认线路", url: resolvedPlayUrl }],
            parse: 0,
            header: defaultHeader,
        };
    }

    // 非视频后缀：走嗅探提取真实地址
    try {
        logInfo("检测到非视频格式，开始嗅探", { url: resolvedPlayUrl });
        const sniffed = await OmniBox.sniffVideo(resolvedPlayUrl);
        if (sniffed && sniffed.url) {
            logInfo("嗅探成功", { url: sniffed.url });

            let danmaku = [];
            if (DANMU_API) {
                let vodName = String(params.vodName || "").trim();
                let episodeName = String(params.episodeName || playMeta.e || "").trim();
                let scrapedDanmuFileName = "";

                try {
                    const videoIdFromParam = params.vodId ? String(params.vodId) : "";
                    const videoIdFromMeta = playMeta?.sid ? String(playMeta.sid) : "";
                    const videoIdForScrape = videoIdFromParam || videoIdFromMeta;
                    if (videoIdForScrape) {
                        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                        if (metadata && metadata.scrapeData) {
                            const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === playMeta?.fid);
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
                    logWarn("读取刮削元数据失败", { error: error.message || String(error) });
                }

                const fileName = scrapedDanmuFileName || buildFileNameForDanmu(vodName, episodeName);
                if (fileName) {
                    danmaku = await matchDanmu(fileName);
                    if (danmaku.length > 0) {
                        logInfo("弹幕匹配成功", { count: danmaku.length, fileName });
                    }
                }
            }

            return {
                urls: [{ name: "嗅探线路", url: sniffed.url }],
                parse: 0,
                header: sniffed.header || defaultHeader,
                danmaku,
            };
        }
        logWarn("嗅探未返回有效直链，回退解析页", { url: resolvedPlayUrl });
    } catch (error) {
        logWarn("嗅探失败，回退解析页", { error: error.message || String(error) });
    }

    return {
        urls: [{ name: "默认线路", url: resolvedPlayUrl }],
        parse: 1,
        header: defaultHeader,
    };
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(1, "布布影视2", function (module, exports, require) {
// @name 布布影视2
// @author W.Q, @wujiwanmei, @lucky_TJQ, tcxp, @shortai, 梦
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: axios, crypto
// @version 1.0.4
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/布布影视2.js

/**
 * ============================================================================
 * 哔哔影视 (bbys.app)
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
const config = {
    host: 'https://bbys.app',
    wasmUrl: 'https://bbys.app/assets/web_app_wasm_bg-DaFtKBCq.wasm',
    wasmCacheFile: 'bbys.wasm',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'X-Client': '8f3d2a1c7b6e5d4c9a0b1f2e3d4c5b6a',
        'web-sign': 'f65f3a83d6d9ad6f',
        'accept-language': 'zh-CN,zh;q=0.9',
        'referer': 'https://bbys.app/'
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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    "Referer": "https://bbys.app/",
    "Origin": "https://bbys.app"
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
    const sourceName = String(name || "").trim() || String(code || "").trim() || "布布影视2";
    const sourceCode = String(code || "").trim();
    if (shouldAppendSourceCode(sourceCode, sourceName)) {
        return `${sourceName} (${sourceCode})`;
    }
    return sourceName;
};

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
    OmniBox.log("info", `[哔哔影视] ${output}`);
};

const logError = (message, error) => {
    OmniBox.log("error", `[哔哔影视] ${message}: ${error.message || error}`);
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
// WASM 解码模块 - 用于解密 bbys.app 的加密播放地址
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
                '/www/wwwroot/vodspider/vod/routes/bbys.wasm',
                '/tmp/bbys.wasm'
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
                wasmBuf = await new Promise((resolve, reject) => {
                    https.get(config.wasmUrl, (res) => {
                        const chunks = [];
                        res.on('data', c => chunks.push(c));
                        res.on('end', () => {
                            const buf = Buffer.concat(chunks);
                            // 保存到本地缓存
                            try {
                                fs.writeFileSync(path.join(__dirname, config.wasmCacheFile), buf);
                                logInfo('WASM 文件已缓存到本地');
                            } catch (e) {
                                logError('WASM 文件缓存失败', e);
                            }
                            resolve(buf);
                        });
                    }).on('error', reject);
                });
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
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-protobuf',
                'Accept': 'application/x-protobuf',
                'Content-Length': data.length,
                'User-Agent': config.headers['User-Agent'],
                'Referer': `${config.host}/`,
                'Origin': config.host,
                ...extraHeaders
            }
        }, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
        req.write(data);
        req.end();
    });
}

/**
 * API GET 请求（使用 X-Client + web-sign 认证）
 * @param {string} url - 请求 URL
 * @returns {Promise} axios 响应对象
 */
async function apiGet(url) {
    return _http.get(url, { headers: config.headers });
}

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
            `${config.host}/api.php/web/decode/url`,
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
            name: line.lineName || '布布影视2',
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
        const res = await apiGet(`${config.host}/api.php/web/index/home`);
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
        let url = `${config.host}/api.php/web/filter/vod?type_name=${encodeURIComponent(categoryId)}&page=${pg}&limit=${PAGE_SIZE}`;

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
        const res = await apiGet(`${config.host}/api.php/web/vod/get_detail?vod_id=${videoId}`);
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
            vod_area: data.vod_area || '',
            vod_actor: data.vod_actor || '',
            vod_director: data.vod_director || '',
            type_name: data.type_name || ''
        };

        logInfo(`视频标题: ${vod.vod_name}`);

        // 解析播放线路
        const rawShows = data.vod_play_from.split('$$$');
        const rawUrlsList = data.vod_play_url.split('$$$');
        const validLines = [];
        const pushLine = (lineName, playUrls, order, sourceCode = "") => {
            if (!playUrls) return;
            validLines.push({ lineName, playUrls, order, sourceCode: String(sourceCode || "").trim() });
        };

        rawShows.forEach((showCode, index) => {
            const playerInfo = vodplayer.find(p => p.from === showCode);
            if (!playerInfo) return;

            const lineName = buildLineDisplayName(playerInfo.show, showCode);

            const rawUrls = String(rawUrlsList[index] || "");
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

        try {
            const aggregateRes = await apiGet(`${config.host}/api.php/web/internal/search_aggregate?vod_id=${videoId}`);
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
        const res = await apiGet(`${config.host}/api.php/web/search/index?wd=${encodeURIComponent(wd)}&page=${pg}&limit=50`);
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
                    urls: [{ name: "哔哔影视", url: "" }],
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
            urls: [{ name: "哔哔影视", url: finalUrl }],
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
            urls: [{ name: "哔哔影视", url: "" }],
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

_load(2, "电影天堂", function (module, exports, require) {
// @name 电影天堂
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @version 1.0.6
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/电影天堂.js
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
// 采集站 API 地址（优先使用环境变量，如果没有则使用默认值）
// 例如：https://example.com/api.php/provide/vod/
const SITE_API = process.env.SITE_API || "https://caiji.dyttzyapi.com/api.php/provide/vod";
// 弹幕 API 地址（优先使用环境变量，如果没有则使用默认值）
// 例如：https://danmu.example.com
// 如果为空，则不启用弹幕功能
const DANMU_API = process.env.DANMU_API || "";

// EXCLUDE_CLASS_NAMES 环境变量（分类屏蔽关键词）
// 支持 3 种写法：
// 1) JSON 数组（推荐）：["伦理片","情色"]
// 2) 逗号分隔：伦理片,情色
// 3) 竖线分隔：伦理片|情色
// 行为说明：
// - 未设置该环境变量：使用 DEFAULT_EXCLUDE_CLASS_NAMES
// - 显式设置为空字符串：不屏蔽任何分类（返回 []）
const EXCLUDE_CLASS_NAMES_ENV = process.env.EXCLUDE_CLASS_NAMES || "伦理片";
// ==================== 配置区域结束 ====================

function parseExcludeClassNamesFromEnv() {
    const raw = EXCLUDE_CLASS_NAMES_ENV;

    const text = raw.trim();
    // 环境变量显式留空时，表示不屏蔽任何分类
    if (!text) {
        return [];
    }

    let values = [];

    // 优先支持 JSON 数组格式: ["伦理片","其他"]
    if (text.startsWith("[") && text.endsWith("]")) {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                values = parsed;
            }
        } catch (error) {
            OmniBox.log("warn", `EXCLUDE_CLASS_NAMES 环境变量 JSON 解析失败: ${error.message}`);
        }
    }

    // 兼容逗号/竖线分隔格式: 伦理片,情色片 或 伦理片|情色片
    if (values.length === 0) {
        values = text.split(/[,，|]/g);
    }

    const normalized = Array.from(
        new Set(
            values
                .map((item) => String(item || "").trim())
                .filter(Boolean)
        )
    );

    return normalized;
}

const EXCLUDE_CLASS_NAMES = parseExcludeClassNamesFromEnv();

function shouldExcludeClassName(name) {
    const className = String(name || "").trim();
    if (!className || EXCLUDE_CLASS_NAMES.length === 0) {
        return false;
    }
    return EXCLUDE_CLASS_NAMES.some((keyword) => className.includes(keyword));
}

function getEffectiveCategoryGroup(group) {
    const allIds = Array.isArray(group?.allIds) ? group.allIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
    const types = Array.isArray(group?.types) ? group.types : [];

    if (types.length === 0) {
        return {
            ...group,
            allIds,
            types,
        };
    }

    const excludedTypeIds = new Set();
    const filteredTypes = types.filter((item) => {
        if (!item || typeof item !== "object") {
            return false;
        }
        const value = String(item.value || "").trim();
        const name = String(item.name || "").trim();
        if (value && value !== "all" && shouldExcludeClassName(name)) {
            excludedTypeIds.add(value);
            return false;
        }
        return true;
    });

    const filteredAllIds = allIds.filter((id) => !excludedTypeIds.has(id));

    return {
        ...group,
        allIds: filteredAllIds,
        types: filteredTypes,
    };
}

// 自定义分类配置
// 格式: { "顶层分类ID": { name: "显示名称", allIds: ["子分类ID1", "子分类ID2", ...], types: [筛选项] } }
const CATEGORY_CONFIG = {
    "1": {
        name: "电影",
        allIds: ["6", "7", "8", "9", "10", "11", "12", "20", "37", "34"],
        types: [
            { name: "全部", value: "all" },
            { name: "动作片", value: "6" },
            { name: "喜剧片", value: "7" },
            { name: "爱情片", value: "8" },
            { name: "科幻片", value: "9" },
            { name: "恐怖片", value: "10" },
            { name: "剧情片", value: "11" },
            { name: "战争片", value: "12" },
            { name: "记录片", value: "20" },
            { name: "动画片", value: "37" },
            { name: "伦理片", value: "34" },
        ],
    },
    "2": {
        name: "电视剧",
        allIds: ["13", "16", "15", "22", "24", "14", "21", "23"],
        types: [
            { name: "全部", value: "all" },
            { name: "国产剧", value: "13" },
            { name: "欧美剧", value: "16" },
            { name: "韩剧", value: "15" },
            { name: "日剧", value: "22" },
            { name: "泰剧", value: "24" },
            { name: "港剧", value: "14" },
            { name: "台剧", value: "21" },
            { name: "海外剧", value: "23" },
        ],
    },
    "3": {
        name: "动漫",
        allIds: ["29", "30", "31", "32", "33"],
        types: [
            { name: "全部", value: "all" },
            { name: "国产动漫", value: "29" },
            { name: "日韩动漫", value: "30" },
            { name: "欧美动漫", value: "31" },
            { name: "欧美动漫", value: "31" },
            { name: "港台动漫", value: "32" },
            { name: "海外动漫", value: "33" },
        ],
    },
    "4": {
        name: "综艺",
        allIds: ["25", "26", "27", "28"],
        types: [
            { name: "全部", value: "all" },
            { name: "大陆综艺", value: "25" },
            { name: "港台综艺", value: "26" },
            { name: "日韩综艺", value: "27" },
            { name: "欧美综艺", value: "28" },
        ],
    },
    "5": {
        name: "短剧",
        allIds: ["36"],
        types: [],
    },
};

function buildHomeFiltersFromCategoryConfig() {
    const filters = {};
    for (const [typeId, config] of Object.entries(CATEGORY_CONFIG)) {
        const effectiveGroup = getEffectiveCategoryGroup(config);
        const types = Array.isArray(effectiveGroup?.types) ? effectiveGroup.types : [];
        if (types.length === 0) {
            continue;
        }
        const values = types
            .map((item) => {
                if (!item || typeof item !== "object") {
                    return null;
                }
                const name = String(item.name || "").trim();
                const value = String(item.value || "").trim();
                if (!name && !value) {
                    return null;
                }
                return {
                    name: name || value,
                    value: value,
                };
            })
            .filter(Boolean);

        if (values.length > 0) {
            filters[typeId] = [
                {
                    key: "cate",
                    name: "类型",
                    init: "all",
                    value: values,
                },
            ];
        }
    }
    return filters;
}

function parseCategoryFilterParams(params = {}) {
    const result = {};

    if (params.filters && typeof params.filters === "object") {
        Object.assign(result, params.filters);
    } else if (typeof params.filters === "string" && params.filters.trim()) {
        try {
            const parsed = JSON.parse(params.filters);
            if (parsed && typeof parsed === "object") {
                Object.assign(result, parsed);
            }
        } catch (error) {
            OmniBox.log("warn", `解析 filters 参数失败: ${error.message}`);
        }
    }

    if (params.extend) {
        try {
            const decodedStr = Buffer.from(String(params.extend), "base64").toString("utf-8");
            const extObj = JSON.parse(decodedStr);
            if (extObj && typeof extObj === "object") {
                Object.assign(result, extObj);
            }
        } catch (error) {
            OmniBox.log("warn", `解析 extend 参数失败: ${error.message}`);
        }
    }

    return result;
}

// 全局参数
const PAGE_LIMIT = 20; // 每页数量
const PER_TYPE_PAGE = 3; // 合并时每个子分类抓取的页数

// ==================== 配置区域结束 ====================

/**
 * 发送 HTTP 请求到采集站
 * @param {Object} params - 查询参数对象
 * @returns {Promise<Object>} API 响应数据
 */
async function requestSiteAPI(params = {}) {
    if (!SITE_API) {
        throw new Error("请配置采集站 API 地址（SITE_API 环境变量）");
    }
    const url = new URL(SITE_API);
    // 添加全局分页限制
    if (!params.pagesize) {
        params.pagesize = PAGE_LIMIT;
    }
    if (!params.limit) {
        params.limit = PAGE_LIMIT;
    }
    Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
            url.searchParams.append(key, params[key]);
        }
    });
    OmniBox.log("info", `请求采集站: ${url.toString()}`);
    try {
        const response = await OmniBox.request(url.toString(), {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });
        if (response.statusCode !== 200) {
            throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
        }
        const data = JSON.parse(response.body);
        return data;
    } catch (error) {
        OmniBox.log("error", `请求采集站失败: ${error.message}`);
        throw error;
    }
}

/**
 * 安全转换为整数
 * @param {*} value - 要转换的值
 * @returns {number} 整数
 */
function toInt(value) {
    if (typeof value === "number") {
        return Math.floor(value);
    }
    if (typeof value === "string") {
        const num = parseInt(value, 10);
        return isNaN(num) ? 0 : num;
    }
    return 0;
}

/**
 * 格式化视频数据
 * @param {Array} list - 原始视频列表
 * @returns {Array} 格式化后的视频列表
 */
function formatVideos(list) {
    if (!Array.isArray(list)) {
        return [];
    }
    return list
        .map((item) => {
            if (typeof item !== "object" || item === null) {
                return null;
            }
            const vodId = String(item.vod_id || item.VodID || "");
            let vodPlayFrom = String(item.vod_play_from || item.VodPlayFrom || "");
            // 处理多线路播放源
            if (vodPlayFrom && vodId && vodPlayFrom.includes("$$$")) {
                const lines = vodPlayFrom.split("$$$");
                const processedLines = lines
                    .map((line) => {
                        const trimmedLine = line.trim();
                        if (trimmedLine) {
                            return `${trimmedLine}-${vodId}`;
                        }
                        return trimmedLine;
                    })
                    .filter((line) => line);
                vodPlayFrom = processedLines.join("$$$");
            } else if (vodPlayFrom && vodId) {
                vodPlayFrom = `${vodPlayFrom}-${vodId}`;
            }
            return {
                vod_id: vodId,
                vod_name: String(item.vod_name || item.VodName || ""),
                vod_pic: String(item.vod_pic || item.VodPic || ""),
                type_id: String(item.type_id || item.TypeID || ""),
                type_name: String(item.type_name || item.TypeName || ""),
                vod_year: String(item.vod_year || item.VodYear || ""),
                vod_remarks: String(item.vod_remarks || item.VodRemarks || ""),
                vod_time: String(item.vod_time || item.VodTime || ""),
                vod_play_from: vodPlayFrom,
                vod_play_url: String(item.vod_play_url || item.VodPlayURL || ""),
                vod_douban_score: String(item.vod_douban_score || item.VodDoubanScore || ""),
            };
        })
        .filter((item) => item !== null && item.vod_id);
}

/**
 * 将旧格式的播放源转换为新格式（vod_play_sources）
 * ... (此处省略 convertToPlaySources, formatDetailVideos, formatClasses, enrichVideosWithDetails 函数，它们与原文件相同) ...
 */
function convertToPlaySources(vodPlayFrom, vodPlayUrl, vodId, detailVodName = "") {
    const playSources = [];
    if (!vodPlayFrom || !vodPlayUrl) {
        return playSources;
    }
    const sourceNames = vodPlayFrom
        .split("$$$")
        .map((name) => name.trim())
        .filter((name) => name);
    const sourceUrls = vodPlayUrl
        .split("$$$")
        .map((url) => url.trim())
        .filter((url) => url);
    const maxLength = Math.max(sourceNames.length, sourceUrls.length);
    for (let i = 0; i < maxLength; i++) {
        const sourceName = sourceNames[i] || `线路${i + 1}`;
        const sourceUrl = sourceUrls[i] || "";
        let cleanSourceName = sourceName;
        if (vodId && sourceName.endsWith(`-${vodId}`)) {
            cleanSourceName = sourceName.substring(0, sourceName.length - `-${vodId}`.length);
        }
        const episodes = [];
        if (sourceUrl) {
            const episodeSegments = sourceUrl
                .split("#")
                .map((seg) => seg.trim())
                .filter((seg) => seg);
            for (let epIndex = 0; epIndex < episodeSegments.length; epIndex++) {
                const segment = episodeSegments[epIndex];
                const parts = segment.split("$");
                const fid = `${vodId}#${i}#${epIndex}`;
                if (parts.length >= 2) {
                    const episodeName = parts[0].trim();
                    const playId = parts.slice(1).join("$").trim();
                    if (episodeName && playId) {
                        episodes.push({
                            name: episodeName,
                            playId: `${playId}|||${encodeMeta({ value: detailVodName, e: episodeName, sid: vodId, fid: fid })}`,
                            _fid: fid,
                            _rawName: episodeName,
                        });
                    }
                } else if (parts.length === 1 && parts[0]) {
                    const episodeName = `第${episodes.length + 1}集`;
                    episodes.push({
                        name: episodeName,
                        playId: `${parts[0].trim()}|||${encodeMeta({ value: detailVodName, e: episodeName, sid: vodId, fid: fid })}`,
                        _fid: fid,
                        _rawName: episodeName,
                    });
                }
            }
        }
        if (episodes.length > 0) {
            playSources.push({
                name: cleanSourceName,
                episodes: episodes,
            });
        }
    }
    return playSources;
}

function formatDetailVideos(list) {
    if (!Array.isArray(list)) {
        return [];
    }
    return list
        .map((item) => {
            if (typeof item !== "object" || item === null) {
                return null;
            }
            const content = String(item.vod_content || item.VodContent || "").trim();
            const vodId = String(item.vod_id || item.VodID || "");
            let vodPlayFrom = String(item.vod_play_from || item.VodPlayFrom || "");
            if (vodPlayFrom && vodId && vodPlayFrom.includes("$$$")) {
                const lines = vodPlayFrom.split("$$$");
                const processedLines = lines
                    .map((line) => {
                        const trimmedLine = line.trim();
                        if (trimmedLine) {
                            return `${trimmedLine}-${vodId}`;
                        }
                        return trimmedLine;
                    })
                    .filter((line) => line);
                vodPlayFrom = processedLines.join("$$$");
            } else if (vodPlayFrom && vodId) {
                vodPlayFrom = `${vodPlayFrom}-${vodId}`;
            }
            const vodPlayUrl = String(item.vod_play_url || item.VodPlayURL || "");
            const detailVodName = String(item.vod_name || item.VodName || "");
            const vodPlaySources = convertToPlaySources(vodPlayFrom, vodPlayUrl, vodId, detailVodName);
            return {
                vod_id: vodId,
                vod_name: detailVodName,
                vod_pic: String(item.vod_pic || item.VodPic || ""),
                type_name: String(item.type_name || item.TypeName || ""),
                vod_year: String(item.vod_year || item.VodYear || ""),
                vod_area: String(item.vod_area || item.VodArea || ""),
                vod_remarks: String(item.vod_remarks || item.VodRemarks || ""),
                vod_actor: String(item.vod_actor || item.VodActor || ""),
                vod_director: String(item.vod_director || item.VodDirector || ""),
                vod_content: content,
                vod_play_sources: vodPlaySources.length > 0 ? vodPlaySources : undefined,
                vod_douban_score: String(item.vod_douban_score || item.VodDoubanScore || ""),
            };
        })
        .filter((item) => item !== null && item.vod_id);
}

function encodeMeta(obj) {
    try {
        return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64");
    } catch (error) {
        return "";
    }
}

function decodeMeta(str) {
    try {
        const raw = Buffer.from(str || "", "base64").toString("utf8");
        return JSON.parse(raw || "{}");
    } catch (error) {
        return {};
    }
}

function preprocessTitle(title) {
    if (!title) return "";
    return String(title)
        .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]/g, " ")
        .replace(/[hH]\\.?26[45]/g, " ")
        .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
        .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ")
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
    const processedTitle = preprocessTitle(title);

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
        const hit = scrapeData.episodes.find((ep) => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber);
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

function formatClasses(classes) {
    if (!Array.isArray(classes)) {
        return [];
    }
    const seen = new Set();
    const result = [];
    for (const cls of classes) {
        if (typeof cls !== "object" || cls === null) {
            continue;
        }
        const typeId = String(cls.type_id || cls.TypeID || "");
        const typePid = String(cls.type_pid || cls.TypePID || "");
        const typeName = String(cls.type_name || cls.TypeName || "").trim();
        if (!typeId || seen.has(typeId)) {
            continue;
        }
        seen.add(typeId);
        result.push({
            type_id: typeId,
            type_pid: typePid,
            type_name: typeName,
        });
    }
    return result;
}

async function enrichVideosWithDetails(videos) {
    if (!Array.isArray(videos) || videos.length === 0) {
        return videos;
    }
    const videoIDs = [];
    const videoMap = new Map();
    for (const video of videos) {
        if (!video.vod_pic || video.vod_pic === "<nil>" || !video.vod_year || video.vod_year === "<nil>" || !video.vod_douban_score || video.vod_douban_score === "<nil>") {
            videoIDs.push(video.vod_id);
            videoMap.set(video.vod_id, video);
        }
    }
    if (videoIDs.length === 0) {
        return videos;
    }
    const batchSize = 20;
    for (let i = 0; i < videoIDs.length; i += batchSize) {
        const end = Math.min(i + batchSize, videoIDs.length);
        const batchIDs = videoIDs.slice(i, end);
        try {
            const response = await requestSiteAPI({
                ac: "detail",
                ids: batchIDs.join(","),
            });
            if (Array.isArray(response.list)) {
                for (const item of response.list) {
                    if (typeof item !== "object" || item === null) {
                        continue;
                    }
                    const vodId = String(item.vod_id || item.VodID || "");
                    const originalVod = videoMap.get(vodId);
                    if (originalVod) {
                        const pic = String(item.vod_pic || item.VodPic || "");
                        if (pic && pic !== "<nil>") {
                            originalVod.vod_pic = pic;
                        }
                        const year = String(item.vod_year || item.VodYear || "");
                        if (year && year !== "<nil>") {
                            originalVod.vod_year = year;
                        }
                        const score = String(item.vod_douban_score || item.VodDoubanScore || "");
                        if (score && score !== "<nil>") {
                            originalVod.vod_douban_score = score;
                        }
                        const en = String(item.vod_en || item.VodEn || "");
                        if (en && en !== "<nil>") {
                            originalVod.vod_en = en;
                        }
                        const time = String(item.vod_time || item.VodTime || "");
                        if (time && time !== "<nil>") {
                            originalVod.vod_time = time;
                        }
                        const playFrom = String(item.vod_play_from || item.VodPlayFrom || "");
                        if (playFrom && playFrom !== "<nil>") {
                            originalVod.vod_play_from = playFrom;
                        }
                    }
                }
            }
        } catch (error) {
            OmniBox.log("warn", `批量获取详情失败: ${error.message}`);
        }
    }
    return videos;
}

// ==================== 新增：合并分页与数据处理函数 ====================
/**
 * 获取单个子分类的多页数据
 * @param {string} typeId - 子分类ID
 * @param {number} maxPage - 最大页数
 * @returns {Promise<Array>} 视频列表
 */
async function fetchTypePages(typeId, maxPage) {
    const tasks = [];
    for (let pg = 1; pg <= maxPage; pg++) {
        tasks.push(
            requestSiteAPI({
                ac: "videolist",
                t: typeId,
                pg: String(pg),
            })
                .then((r) => r.list || [])
                .catch(() => [])
        );
    }
    return (await Promise.all(tasks)).flat();
}

/**
 * 获取并合并一个顶层分类下的所有子分类数据
 * @param {Object} group - 分类配置对象
 * @param {number} page - 请求的页码
 * @returns {Promise<Object>} 格式化的响应对象
 */
async function fetchAllMerged(group, page) {
    // 并行获取所有子分类的数据
    const raw = (
        await Promise.all(
            group.allIds.map((id) => fetchTypePages(id, PER_TYPE_PAGE))
        )
    ).flat();

    // 屏蔽不需要的分类
    const filtered = raw.filter(
        (item) =>
            item &&
            !shouldExcludeClassName(item.type_name)
    );

    // 按时间倒序排序
    filtered.sort((a, b) => {
        const timeA = new Date(a.vod_time || a.vod_addtime || a.vod_pubdate || "").getTime();
        const timeB = new Date(b.vod_time || b.vod_addtime || b.vod_pubdate || "").getTime();
        return isNaN(timeB) ? -1 : isNaN(timeA) ? 1 : timeB - timeA;
    });

    // 分页切片
    const startIndex = (page - 1) * PAGE_LIMIT;
    const endIndex = page * PAGE_LIMIT;
    const slice = filtered.slice(startIndex, endIndex);

    // 格式化返回
    const formattedList = formatVideos(slice);
    const total = filtered.length;
    const pagecount = Math.ceil(total / PAGE_LIMIT);

    return {
        page: page,
        pagecount: pagecount,
        total: total,
        list: formattedList,
    };
}

// ==================== 重写 home 和 category 函数 ====================
/**
 * 获取首页数据 (重写)
 * 现在返回自定义的分类列表，并且首页视频列表留空或按需实现
 * @param {Object} params - 参数对象
 * @returns {Object} 返回分类列表
 */
async function home(params) {
    try {
        OmniBox.log("info", "获取首页数据 (使用自定义分类)");
        // 构建自定义分类
        const classes = Object.entries(CATEGORY_CONFIG).map(([type_id, config]) => ({
            type_id: type_id,
            type_name: config.name,
        }));

        const response = await requestSiteAPI({
            ac: "videolist",
            pg: "1",
            pagesize: 100,
            limit: 100,
        });
        const videos = formatVideos(response.list || []);
        const filters = buildHomeFiltersFromCategoryConfig();
        return {
            class: classes,
            list: videos,
            filters: filters,
        };
    } catch (error) {
        OmniBox.log("error", `获取首页数据失败: ${error.message}`);
        return { class: [], list: [], filters: {} };
    }
}

/**
 * 获取分类数据 (重写)
 * 支持自定义分类、筛选和数据合并
 * @param {Object} params - 参数对象
 * - categoryId: 顶层分类ID（必填）
 * - page: 页码（必填，默认1）
 * - extend: 筛选项（JSON字符串，Base64编码）
 * @returns {Object} 返回视频列表
 */
async function category(params) {
    try {
        const categoryId = params.categoryId;
        const page = toInt(params.page) || 1;

        if (!categoryId) {
            throw new Error("分类ID不能为空");
        }

        const group = CATEGORY_CONFIG[categoryId];
        if (!group) {
            // 如果不是自定义分类，回退到原始逻辑
            OmniBox.log("info", `分类 ${categoryId} 未在自定义配置中，使用原始API`);
            const response = await requestSiteAPI({
                ac: "videolist",
                t: categoryId,
                pg: String(page),
            });
            const videos = formatVideos(response.list || []);
            return {
                page: toInt(response.page),
                pagecount: toInt(response.pagecount),
                total: toInt(response.total),
                list: videos,
            };
        }

        const effectiveGroup = getEffectiveCategoryGroup(group);

        OmniBox.log("info", `获取自定义分类数据: categoryId=${categoryId}, page=${page}`);

        const extObj = parseCategoryFilterParams(params);
        const selectedSubType = String(extObj.cate || extObj.class || "").trim();
        if (selectedSubType && selectedSubType !== "all" && effectiveGroup.allIds.includes(selectedSubType)) {
            // 如果有子分类筛选，直接请求该子分类
            const response = await requestSiteAPI({
                ac: "videolist",
                t: selectedSubType,
                pg: String(page),
            });
            const videos = formatVideos(response.list || []);
            return {
                page: toInt(response.page),
                pagecount: toInt(response.pagecount),
                total: toInt(response.total),
                list: videos,
            };
        } else {
            // 否则，合并所有子分类数据
            return await fetchAllMerged(effectiveGroup, page);
        }
    } catch (error) {
        OmniBox.log("error", `获取分类数据失败: ${error.message}`);
        return { page: 1, pagecount: 0, total: 0, list: [] };
    }
}

// 导出接口（用于模块化引用）
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

// ==================== 保留原有的其他函数 ====================
/**
 * 获取视频详情
 * ... (search, detail, play, matchDanmu, inferFileNameFromURL, extractDigits, extractVideoIdFromFlag 函数保持不变) ...
 */
async function detail(params) {
    try {
        const videoId = params.videoId;
        if (!videoId) {
            throw new Error("视频ID不能为空");
        }
        OmniBox.log("info", `获取视频详情: videoId=${videoId}`);
        const response = await requestSiteAPI({ ac: "detail", ids: videoId });
        const videos = formatDetailVideos(response.list || []);

        for (const vod of videos) {
            const sourceCandidates = [];
            const playSources = Array.isArray(vod.vod_play_sources) ? vod.vod_play_sources : [];
            for (const source of playSources) {
                for (const ep of source.episodes || []) {
                    const meta = ep.playId && ep.playId.includes("|||") ? decodeMeta(ep.playId.split("|||")[1]) : {};
                    const fid = ep._fid || meta.fid;
                    const rawName = ep._rawName || ep.name || "正片";
                    if (!fid) continue;
                    sourceCandidates.push({
                        fid: fid,
                        file_id: fid,
                        file_name: rawName,
                        name: rawName,
                        format_type: "video",
                    });
                }
            }

            if (sourceCandidates.length > 0) {
                try {
                    const videoIdForScrape = String(vod.vod_id || videoId);
                    const scrapingResult = await OmniBox.processScraping(videoIdForScrape, vod.vod_name || "", vod.vod_name || "", sourceCandidates);
                    OmniBox.log("info", `刮削处理完成,结果: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);

                    const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                    const scrapeData = metadata?.scrapeData || null;
                    const videoMappings = metadata?.videoMappings || [];

                    if (scrapeData) {
                        vod.vod_name = scrapeData.title || vod.vod_name;
                        if (scrapeData.posterPath) {
                            vod.vod_pic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
                        }
                        if (scrapeData.releaseDate) {
                            vod.vod_year = String(scrapeData.releaseDate).substring(0, 4) || vod.vod_year;
                        }
                        if (scrapeData.overview) {
                            vod.vod_content = scrapeData.overview;
                        }
                        const actors = (scrapeData.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(",");
                        if (actors) {
                            vod.vod_actor = actors;
                        }
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

                    for (const source of playSources) {
                        for (const ep of source.episodes || []) {
                            const meta = ep.playId && ep.playId.includes("|||") ? decodeMeta(ep.playId.split("|||")[1]) : {};
                            const fid = ep._fid || meta.fid;
                            const mapping = videoMappings.find((m) => m?.fileId === fid);
                            if (!mapping) continue;
                            const oldName = ep.name;
                            const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
                            if (newName && newName !== oldName) {
                                ep.name = newName;
                                OmniBox.log("info", `应用刮削后源文件名: ${oldName} -> ${newName}`);
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

                    // 清理内部字段
                    for (const source of playSources) {
                        source.episodes = (source.episodes || []).map((ep) => ({
                            name: ep.name,
                            playId: ep.playId,
                        }));
                    }
                    vod.vod_play_sources = playSources;
                } catch (error) {
                    OmniBox.log("warn", `刮削处理失败: ${error.message}`);
                }
            }
        }

        return { list: videos };
    } catch (error) {
        OmniBox.log("error", `获取视频详情失败: ${error.message}`);
        return { list: [] };
    }
}

async function search(params) {
    try {
        const keyword = params.keyword || params.wd || "";
        const page = params.page || 1;
        if (!keyword) {
            return { page: 1, pagecount: 0, total: 0, list: [] };
        }
        OmniBox.log("info", `搜索视频: keyword=${keyword}, page=${page}`);
        const response = await requestSiteAPI({ ac: "list", wd: keyword, pg: String(page) });
        let videos = formatVideos(response.list || []);
        if (videos.length > 0 && (!videos[0].vod_pic || videos[0].vod_pic === "")) {
            try {
                const videoIDs = videos.map((v) => v.vod_id);
                const detailResponse = await requestSiteAPI({ ac: "detail", ids: videoIDs.join(",") });
                videos = formatVideos(detailResponse.list || []);
            } catch (error) {
                OmniBox.log("warn", `获取搜索结果详情失败: ${error.message}`);
            }
        }
        return {
            page: toInt(response.page),
            pagecount: toInt(response.pagecount),
            total: toInt(response.total),
            list: videos,
        };
    } catch (error) {
        OmniBox.log("error", `搜索视频失败: ${error.message}`);
        return { page: 1, pagecount: 0, total: 0, list: [] };
    }
}

async function matchDanmu(fileName) {
    if (!DANMU_API || !fileName) {
        return [];
    }
    try {
        OmniBox.log("info", `匹配弹幕: fileName=${fileName}`);
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
            OmniBox.log("warn", `弹幕匹配失败: HTTP ${response.statusCode}`);
            return [];
        }
        const matchData = JSON.parse(response.body);
        if (!matchData.isMatched) {
            OmniBox.log("info", "弹幕未匹配到");
            return [];
        }
        const matches = matchData.matches || [];
        if (matches.length === 0) {
            return [];
        }
        const firstMatch = matches[0];
        const episodeId = firstMatch.episodeId;
        const animeTitle = firstMatch.animeTitle || "";
        const episodeTitle = firstMatch.episodeTitle || "";
        if (!episodeId) {
            return [];
        }
        let danmakuName = "弹幕";
        if (animeTitle && episodeTitle) {
            danmakuName = `${animeTitle} - ${episodeTitle}`;
        } else if (animeTitle) {
            danmakuName = animeTitle;
        } else if (episodeTitle) {
            danmakuName = episodeTitle;
        }
        const danmakuURL = `${DANMU_API}/api/v2/comment/${episodeId}?format=xml`;
        OmniBox.log("info", `弹幕匹配成功: ${danmakuName} (episodeId: ${episodeId})`);
        return [{ name: danmakuName, url: danmakuURL }];
    } catch (error) {
        OmniBox.log("warn", `弹幕匹配失败: ${error.message}`);
        return [];
    }
}

function inferFileNameFromURL(url) {
    try {
        const urlObj = new URL(url);
        let base = urlObj.pathname.split("/").pop() || "";
        const dotIndex = base.lastIndexOf(".");
        if (dotIndex > 0) {
            base = base.substring(0, dotIndex);
        }
        base = base.replace(/[_-]/g, " ").replace(/\./g, " ").trim();
        return base || url;
    } catch (error) {
        return url;
    }
}

function extractDigits(str) {
    if (typeof str !== "string") {
        return "";
    }
    return str.replace(/\D/g, "");
}

function extractVideoIdFromFlag(flag) {
    if (!flag) {
        return "";
    }
    if (flag.includes("-")) {
        const parts = flag.split("-");
        const videoId = parts[parts.length - 1];
        if (/^\d+$/.test(videoId)) {
            return videoId;
        }
    }
    if (/^\d+$/.test(flag)) {
        return flag;
    }
    return "";
}

async function play(params) {
    try {
        const rawPlayId = params.playId;
        const flag = params.flag || "";
        if (!rawPlayId) {
            throw new Error("播放地址ID不能为空");
        }
        let playId = rawPlayId;
        let vodName = "";
        let episodeName = "";
        if (rawPlayId.includes("|||")) {
            const [mainPlayId, metaB64] = rawPlayId.split("|||");
            playId = mainPlayId;
            const meta = decodeMeta(metaB64 || "");
            vodName = meta.v || "";
            episodeName = meta.e || "";
        }
        const videoId = extractVideoIdFromFlag(flag);
        OmniBox.log("info", `获取播放地址: playId=${playId}, flag=${flag}, videoId=${videoId}`);

        let scrapedDanmuFileName = "";
        try {
            const sourceVideoId = params.vodId || videoId || (rawPlayId.includes("|||") ? (decodeMeta(rawPlayId.split("|||")[1] || "").sid || "") : "");
            if (sourceVideoId) {
                const metadata = await OmniBox.getScrapeMetadata(String(sourceVideoId));
                if (metadata && metadata.scrapeData) {
                    const meta = rawPlayId.includes("|||") ? decodeMeta(rawPlayId.split("|||")[1] || "") : {};
                    const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === meta.fid);
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
            OmniBox.log("warn", `读取刮削元数据失败: ${error.message}`);
        }

        // 参考两个BT，增加播放地址嗅探逻辑：
        // 1) 直链资源直接播放
        // 2) 非直链尝试 OmniBox.sniffVideo 嗅探真实媒体地址
        let resolvedUrl = playId;
        let resolvedHeader = {};
        let parse = 1;

        const isDirectPlayable = /\.(m3u8|mp4|flv|avi|mkv|ts)(?:\?|#|$)/i.test(playId || "");
        if (isDirectPlayable) {
            parse = 0;
        } else if (/^https?:\/\//i.test(playId || "")) {
            try {
                const sniffResult = await OmniBox.sniffVideo(playId);
                if (sniffResult && sniffResult.url) {
                    resolvedUrl = sniffResult.url;
                    resolvedHeader = sniffResult.header || {};
                    parse = 0;
                    OmniBox.log("info", `嗅探成功: ${resolvedUrl}`);
                }
            } catch (sniffError) {
                OmniBox.log("warn", `嗅探失败，回退原始地址: ${sniffError.message}`);
            }
        }

        let urlsResult = [{ name: "播放", url: resolvedUrl }];
        let playResponse = { urls: urlsResult, header: resolvedHeader, parse: parse };
        if (DANMU_API) {
            let fileName = "";
            if (vodName) {
                fileName = scrapedDanmuFileName || buildFileNameForDanmu(vodName, episodeName);
            } else if (videoId) {
                try {
                    const detailResponse = await requestSiteAPI({ ac: "detail", ids: videoId });
                    if (detailResponse.list && detailResponse.list.length > 0) {
                        const video = detailResponse.list[0];
                        const videoName = video.vod_name || video.VodName || "";
                        const playURL = video.vod_play_url || video.VodPlayURL || "";
                        if (videoName && playURL) {
                            const segments = playURL.split("#").filter((s) => s.trim());
                            if (segments.length === 1) {
                                fileName = videoName;
                            } else {
                                let epNum = 0;
                                for (let idx = 0; idx < segments.length; idx++) {
                                    const seg = segments[idx];
                                    const parts = seg.split("$");
                                    if (parts.length >= 2) {
                                        const epLabel = parts[0].trim();
                                        const epURL = parts[1].trim();
                                        if (epURL === playId || epURL.includes(playId) || playId.includes(epURL)) {
                                            const digits = extractEpisode(epLabel);
                                            if (digits) {
                                                epNum = parseInt(digits, 10);
                                            } else {
                                                epNum = idx + 1;
                                            }
                                            break;
                                        }
                                    }
                                }
                                if (epNum > 0) {
                                    fileName = epNum < 10 ? `${videoName} S01E0${epNum}` : `${videoName} S01E${epNum}`;
                                } else {
                                    fileName = videoName;
                                }
                            }
                        }
                    }
                } catch (error) {
                    OmniBox.log("warn", `获取详情失败，无法推断集数: ${error.message}`);
                }
            }
            if (!fileName) {
                fileName = inferFileNameFromURL(playId);
            }
            if (fileName) {
                const danmakuList = await matchDanmu(fileName);
                if (danmakuList.length > 0) {
                    playResponse.danmaku = danmakuList;
                }
            }
        }
        return playResponse;
    } catch (error) {
        OmniBox.log("error", `获取播放地址失败: ${error.message}`);
        return { urls: [], header: {} };
    }
}

});
