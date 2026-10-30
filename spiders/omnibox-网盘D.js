// @name 网盘影视D(合并2源)
// @version 3.20261030.1223
// @description 自动同步：网盘聚合
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-网盘D.js
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


_load(0, "欧哥", function (module, exports, require) {
// @name 欧哥
// @author 
// @description 刮削：支持，弹幕：支持，播放记录：支持
// @dependencies: axios, cheerio
// @version 1.0.7
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/网盘/欧哥.js

// 引入 OmniBox SDK
const OmniBox = require("omnibox_sdk");
// 引入 cheerio(用于 HTML 解析)
let cheerio;
try {
  cheerio = require("cheerio");
} catch (error) {
  throw new Error("cheerio 模块未找到,请先安装:npm install cheerio");
}
let axios;
try {
  axios = require("axios");
} catch (error) {
  throw new Error("axios 模块未找到,请先安装:npm install axios");
}
const https = require("https");
const fs = require("fs");

// ==================== 配置区域 ====================
function splitConfigList(value) {
  return String(value || "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// 网站地址(可以通过环境变量配置,支持多个域名用逗号/分号分割)
const WEB_SITE_CONFIG = process.env.WEB_SITE_OUGE || "https://woog.nxog.eu.org;";
const WEB_SITES = splitConfigList(WEB_SITE_CONFIG);
// 读取环境变量:支持多个网盘类型,用逗号/分号分割
const DRIVE_TYPE_CONFIG = splitConfigList(process.env.DRIVE_TYPE_CONFIG || "quark;uc");
// 读取环境变量:线路名称和顺序,用逗号/分号分割
const SOURCE_NAMES_CONFIG = splitConfigList(process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连");
// 是否开启外网服务器代理（默认关闭）
const EXTERNAL_SERVER_PROXY_ENABLED = String(process.env.EXTERNAL_SERVER_PROXY_ENABLED || "false").toLowerCase() === "true";
// 读取环境变量:详情页播放线路的网盘排序顺序。仅作用于 detail() 里的播放线路，不作用于搜索结果。
const DRIVE_ORDER = splitConfigList(process.env.DRIVE_ORDER || "baidu;tianyi;quark;uc;115;xunlei;ali;123pan").map(s => s.toLowerCase());
// 详情链路缓存时间（秒），默认 12 小时
const MUOU_CACHE_EX_SECONDS = Number(process.env.MUOU_CACHE_EX_SECONDS || 43200);
const MUOU_VERBOSE_DETAIL = String(process.env.MUOU_VERBOSE_DETAIL || "0") === "1";
// ==================== 配置区域结束 ====================

/**
 * 作用: 从线路名推断网盘类型，用于 detail 播放线路排序。
 * 注意: 这里只识别常见网盘关键字，不改变原脚本其他业务逻辑。
 */
function inferDriveTypeFromSourceName(name = "") {
  const raw = String(name || '').toLowerCase();
  if (raw.includes('百度')) return 'baidu';
  if (raw.includes('天翼')) return 'tianyi';
  if (raw.includes('夸克')) return 'quark';
  if (raw === 'uc' || raw.includes('uc')) return 'uc';
  if (raw.includes('115')) return '115';
  if (raw.includes('迅雷')) return 'xunlei';
  if (raw.includes('阿里')) return 'ali';
  if (raw.includes('123')) return '123pan';
  return raw;
}

/**
 * 作用: 仅对 detail() 中已构建完成的 playSources 做排序。
 * 规则: 按 DRIVE_ORDER 优先级排序；未命中的线路保持在后面。
 */
function sortPlaySourcesByDriveOrder(playSources = []) {
  if (!Array.isArray(playSources) || playSources.length <= 1 || DRIVE_ORDER.length === 0) {
    return playSources;
  }
  const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
  return [...playSources].sort((a, b) => {
    const aType = inferDriveTypeFromSourceName(a?.name || '');
    const bType = inferDriveTypeFromSourceName(b?.name || '');
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
  } catch (error) {
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
    OmniBox.log("info", "来源为网页端，已过滤掉\"本地代理\"线路");
  } else if (callerSource === "emby") {
    if (allowServerProxy) {
      filtered = filtered.filter((name) => name === "服务端代理");
      OmniBox.log("info", "来源为 emby，网盘多线路仅保留\"服务端代理\"");
    } else {
      filtered = filtered.filter((name) => name !== "服务端代理");
      OmniBox.log("info", "来源为 emby 但当前为外网环境且未开启外网代理，已屏蔽\"服务端代理\"线路");
    }
  } else if (callerSource === "uz") {
    filtered = filtered.filter((name) => name !== "本地代理");
    OmniBox.log("info", "来源为 uz，已屏蔽\"本地代理\"线路");
  }

  if (!allowServerProxy) {
    filtered = filtered.filter((name) => name !== "服务端代理");
  }

  return filtered.length > 0 ? filtered : ["直连"];
}

function resolveRouteType(flag = "", callerSource = "", context = {}) {
  const allowServerProxy = canUseServerProxy(context);
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

  if (!allowServerProxy && routeType === "服务端代理") {
    routeType = "直连";
  }

  if (callerSource === "uz" && routeType === "本地代理") {
    routeType = "直连";
  }

  return routeType;
}

if (WEB_SITES.length === 0) {
  throw new Error("WEB_SITE 配置不能为空");
}

OmniBox.log("info", `配置了 ${WEB_SITES.length} 个域名: ${WEB_SITES.join(', ')}`);

const INSECURE_HTTPS_AGENT = new https.Agent({
  rejectUnauthorized: false,
});

async function httpRequest(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  const response = await axios({
    url,
    method,
    headers: options.headers || {},
    data: options.body,
    timeout: options.timeout,
    httpsAgent: INSECURE_HTTPS_AGENT,
    validateStatus: () => true,
  });

  let body = response.data;
  if (typeof body !== "string") {
    body = body === undefined || body === null ? "" : JSON.stringify(body);
  }

  return {
    statusCode: response.status,
    body,
    headers: response.headers || {},
  };
}

function isBlockedHtml(body = "") {
  if (!body || typeof body !== "string") {
    return false;
  }
  const lower = body.toLowerCase();
  return (
    lower.includes("just a moment") ||
    lower.includes("cf-browser-verification") ||
    lower.includes("captcha") ||
    lower.includes("访问验证")
  );
}

function buildCacheKey(prefix, value) {
  return `${prefix}:${value}`;
}

function logDetailDebug(message) {
  if (MUOU_VERBOSE_DETAIL) {
    OmniBox.log("info", message);
  }
}

async function getCachedJSON(key) {
  try {
    return await OmniBox.getCache(key);
  } catch (error) {
    OmniBox.log("warn", `读取缓存失败: key=${key}, error=${error.message}`);
    return null;
  }
}

async function setCachedJSON(key, value, exSeconds) {
  try {
    await OmniBox.setCache(key, value, exSeconds);
  } catch (error) {
    OmniBox.log("warn", `写入缓存失败: key=${key}, error=${error.message}`);
  }
}

/**
 * 带容灾的请求函数
 */
async function requestWithFailover(path, options = {}) {
  let lastError = null;
  const perDomainTimeout = Math.max(1000, Math.floor(30000 / WEB_SITES.length));

  for (let i = 0; i < WEB_SITES.length; i++) {
    const baseUrl = removeTrailingSlash(WEB_SITES[i]);
    const fullUrl = path.startsWith('http') ? path : baseUrl + path;

    try {
      OmniBox.log("info", `尝试请求域名 ${i + 1}/${WEB_SITES.length}: ${fullUrl}, timeout=${options.timeout ?? perDomainTimeout}ms`);

      const response = await httpRequest(fullUrl, {
        ...options,
        method: options.method || "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...(options.headers || {}),
        },
        timeout: options.timeout ?? perDomainTimeout,
      });

      if (response.statusCode === 200 && response.body) {
        if (isBlockedHtml(response.body)) {
          OmniBox.log("warn", `域名 ${baseUrl} 命中风控页,切换下一个域名`);
          lastError = new Error("命中风控页面");
          continue;
        }
        OmniBox.log("info", `域名 ${baseUrl} 请求成功`);
        return { response, baseUrl };
      } else {
        OmniBox.log("warn", `域名 ${baseUrl} 返回非200状态码: ${response.statusCode}`);
        lastError = new Error(`HTTP ${response.statusCode}`);
      }
    } catch (error) {
      OmniBox.log("warn", `域名 ${baseUrl} 请求失败: ${error.message}`);
      lastError = error;

      if (i < WEB_SITES.length - 1) {
        continue;
      }
    }
  }

  throw lastError || new Error("所有域名请求均失败");
}

function getBaseUrl() {
  return removeTrailingSlash(WEB_SITES[0]);
}

function removeTrailingSlash(url) {
  if (!url) return "";
  return url.replace(/\/+$/, "");
}

// ==================== 自动筛选提取 ====================
const FILTER_KEY_NAME_MAP = {
  class: "类型",
  area: "地区",
  lang: "语言",
  year: "年份",
  letter: "字母",
  by: "排序",
  sort: "排序",
  id: "分类"
};

let autoFiltersCache = {
  data: null,
  expiresAt: 0,
};

function normalizeFilterValueItem(item) {
  if (!item) return null;
  const name = String(item.n || item.name || "").trim();
  const value = String(item.v ?? item.value ?? "").trim();
  if (!name && !value) return null;
  return { name, value };
}

function normalizeFilterGroup(group) {
  if (!group) return null;
  const key = String(group.key || "").trim();
  const name = String(group.n || group.name || "").trim();
  const valuesRaw = Array.isArray(group.v) ? group.v : (Array.isArray(group.value) ? group.value : []);
  const values = valuesRaw.map(normalizeFilterValueItem).filter(Boolean);
  if (!key || values.length === 0) return null;

  return {
    key,
    name: name || FILTER_KEY_NAME_MAP[key] || key,
    init: String(group.init ?? ""),
    value: values,
  };
}

function extractFilterKeyFromHref(href = "") {
  if (!href) return null;
  for (const key of Object.keys(FILTER_KEY_NAME_MAP)) {
    if (href.includes(`${key}/`)) {
      return key;
    }
  }
  if (href.includes("id/")) {
    return "id";
  }
  return null;
}

function extractFilterValueFromHref(href = "", key = "") {
  if (!href || !key) return "";
  const marker = `${key}/`;
  const idx = href.indexOf(marker);
  if (idx < 0) return "";
  const rest = href.substring(idx + marker.length);
  return decodeURIComponent((rest.split('/')[0] || "").split('.')[0] || "");
}

function parseFiltersFromHtml(html = "") {
  if (!html) return [];
  const $ = cheerio.load(html);
  const groups = [];

  const libraryBoxes = $(".library-box.scroll-box").slice(1);
  libraryBoxes.each((_, element) => {
    const links = $(element).find(".library-list a");
    if (!links || links.length === 0) return;

    const firstHref = links.first().attr("href") || "";
    const key = extractFilterKeyFromHref(firstHref);
    if (!key) return;

    const values = [{ name: "全部", value: "" }];
    const dedupe = new Set(["__ALL__"]);

    links.each((__, a) => {
      const href = $(a).attr("href") || "";
      if (!href) return;
      const value = extractFilterValueFromHref(href, key);
      const name = ($(a).text() || "").trim();
      const dedupeKey = `${name}::${value}`;
      if (!name && !value) return;
      if (dedupe.has(dedupeKey)) return;
      dedupe.add(dedupeKey);
      values.push({ name, value });
    });

    if (values.length > 1) {
      groups.push({
        key,
        name: FILTER_KEY_NAME_MAP[key] || key,
        init: "",
        value: values,
      });
    }
  });

  return groups;
}

async function getAutoFiltersByCategory(categoryId) {
  if (!categoryId) return [];
  try {
    const path = `/index.php/vod/show/id/${categoryId}.html`;
    const { response } = await requestWithFailover(path);
    if (response.statusCode !== 200 || !response.body) {
      return [];
    }
    return parseFiltersFromHtml(response.body);
  } catch (error) {
    OmniBox.log("warn", `自动提取分类筛选失败: categoryId=${categoryId}, err=${error.message}`);
    return [];
  }
}

function normalizeStaticFilters(rawFilters) {
  const result = {};
  if (!rawFilters || typeof rawFilters !== "object") return result;

  for (const typeId of Object.keys(rawFilters)) {
    const groups = Array.isArray(rawFilters[typeId]) ? rawFilters[typeId] : [];
    const normalizedGroups = groups.map(normalizeFilterGroup).filter(Boolean);
    if (normalizedGroups.length > 0) {
      result[typeId] = normalizedGroups;
    }
  }
  return result;
}

async function getPreferredFilters(classes = []) {
  const now = Date.now();
  if (autoFiltersCache.data && now < autoFiltersCache.expiresAt) {
    return autoFiltersCache.data;
  }

  const staticFilters = normalizeStaticFilters(await getDynamicFilters());

  let merged = staticFilters;

  // 静态配置为空时才执行自动抓取
  if (Object.keys(staticFilters).length === 0) {
    const autoFilters = {};
    for (const cls of classes) {
      const typeId = String(cls?.type_id || "").trim();
      if (!typeId) continue;
      const groups = await getAutoFiltersByCategory(typeId);
      if (groups.length > 0) {
        autoFilters[typeId] = groups;
      }
    }

    if (Object.keys(autoFilters).length > 0) {
      OmniBox.log("info", `静态配置为空，自动提取筛选成功: ${Object.keys(autoFilters).length} 个分类`);
      merged = autoFilters;
    } else {
      OmniBox.log("warn", "静态配置和自动提取筛选均为空");
    }
  } else {
    OmniBox.log("info", `使用静态配置筛选: ${Object.keys(staticFilters).length} 个分类`);
  }

  autoFiltersCache = {
    data: merged,
    expiresAt: now + 10 * 60 * 1000,
  };

  return merged;
}

function isVideoFile(file) {
  if (!file || !file.file_name) {
    return false;
  }

  const fileName = file.file_name.toLowerCase();
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

async function getAllVideoFiles(shareURL, files, errors = []) {
  if (!files || !Array.isArray(files)) {
    return [];
  }

  const tasks = files.map(async (file) => {
    if (file.file && isVideoFile(file)) {
      return [file];
    } else if (file.dir) {
      const startTime = performance.now();

      try {
        const subFileList = await OmniBox.getDriveFileList(shareURL, file.fid);
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);

        OmniBox.log("info", `获取目录 [${file.name || file.fid}] 耗时: ${duration}ms`);

        if (subFileList?.files && Array.isArray(subFileList.files)) {
          return await getAllVideoFiles(shareURL, subFileList.files, errors);
        }
        return [];
      } catch (error) {
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);

        const errorInfo = {
          path: file.name || file.fid,
          fid: file.fid,
          message: error.message,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        };
        errors.push(errorInfo);
        OmniBox.log("warn", `获取子目录失败 [${file.name || file.fid}] 耗时: ${duration}ms, 错误: ${error.message}`);
        return [];
      }
    }
    return [];
  });

  const results = await Promise.all(tasks);
  return results.flat();
}

function formatFileSize(size) {
  if (!size || size <= 0) {
    return "";
  }

  const unit = 1024;
  const units = ["B", "K", "M", "G", "T", "P"];

  if (size < unit) {
    return `${size}B`;
  }

  let exp = 0;
  let sizeFloat = size;
  while (sizeFloat >= unit && exp < units.length - 1) {
    sizeFloat /= unit;
    exp++;
  }

  if (sizeFloat === Math.floor(sizeFloat)) {
    return `${Math.floor(sizeFloat)}${units[exp]}`;
  }
  return `${sizeFloat.toFixed(2)}${units[exp]}`;
}

async function home(params) {
  try {
    OmniBox.log("info", "获取首页数据");

    let classes = [];
    let list = [];

    try {
      const { response, baseUrl } = await requestWithFailover('/');

      if (response.statusCode === 200 && response.body) {
        const $ = cheerio.load(response.body);

        const tabItems = $(".module-tab-items .module-tab-item");
        tabItems.each((_, element) => {
          const $item = $(element);
          const typeId = $item.attr("data-id");
          const typeName = $item.attr("data-name");

          if (typeId && typeId !== "0" && typeName) {
            classes.push({
              type_id: typeId,
              type_name: typeName.trim(),
            });
          }
        });

        OmniBox.log("info", `从首页导航提取到 ${classes.length} 个分类`);

        const firstModule = $(".module");

        if (firstModule.length > 0) {
          const moduleItems = firstModule.find(".module-item");

          moduleItems.each((_, element) => {
            const $item = $(element);
            const href = $item.find(".module-item-pic a").attr("href") || $item.find(".module-item-title").attr("href");
            const vodName = $item.find(".module-item-pic img").attr("alt") || $item.find(".module-item-title").attr("title") || $item.find(".module-item-title").text().trim();

            let vodPic = $item.find(".module-item-pic img").attr("data-src") || $item.find(".module-item-pic img").attr("src");
            if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
              vodPic = baseUrl + vodPic;
            }

            const vodRemarks = $item.find(".module-item-text").text().trim();
            const vodYear = $item.find(".module-item-caption span").first().text().trim();

            if (href && vodName) {
              list.push({
                vod_id: href,
                vod_name: vodName,
                vod_pic: vodPic || "",
                type_id: "",
                type_name: "",
                vod_remarks: vodRemarks || "",
                vod_year: vodYear || "",
              });
            }
          });

          OmniBox.log("info", `从首页提取到 ${list.length} 个影片`);
        }
      }
    } catch (error) {
      OmniBox.log("warn", `从首页提取数据失败: ${error.message}`);
    }

    const currentFilters = await getPreferredFilters(classes);
    return {
      class: classes,
      list: list,
      filters: currentFilters,
    };
  } catch (error) {
    OmniBox.log("error", `获取首页数据失败: ${error.message}`);
  }
}

async function category(params) {
  try {
    const categoryId = params.categoryId || params.type_id || "";
    const page = parseInt(params.page || "1", 10);
    const filters = params.filters || {};

    OmniBox.log("info", `获取分类数据: categoryId=${categoryId}, page=${page}`);

    if (!categoryId) {
      OmniBox.log("warn", "分类ID为空");
      return {
        list: [],
        page: 1,
        pagecount: 0,
        total: 0,
      };
    }

    let url = '/index.php/vod/show';
    if (filters.area) {
      url += `/area/${filters.area}`;
    }
    const sortValue = filters.sort || filters.by;
    if (sortValue) {
      url += `/by/${sortValue}`;
    }
    if (filters.class) {
      url += `/class/${filters.class}`;
    }
    if (filters.lang) {
      url += `/lang/${filters.lang}`;
    }
    if (filters.letter) {
      url += `/letter/${filters.letter}`;
    }
    if (filters.year) {
      url += `/year/${filters.year}`;
    }
    const tidValue = filters.tid || filters.id;
    if (tidValue) {
      url += `/id/${tidValue}.html`;
    } else {
      url += `/id/${categoryId}/page/${page}.html`;
    }

    const { response, baseUrl } = await requestWithFailover(url);

    if (response.statusCode !== 200 || !response.body) {
      OmniBox.log("error", `请求失败: HTTP ${response.statusCode}`);
      return {
        list: [],
        page: page,
        pagecount: 0,
        total: 0,
      };
    }

    const $ = cheerio.load(response.body);
    const videos = [];

    const vodItems = $("#main .module-item");
    vodItems.each((_, e) => {
      const $item = $(e);
      const href = $item.find(".module-item-pic a").attr("href");
      const vodName = $item.find(".module-item-pic img").attr("alt");
      let vodPic = $item.find(".module-item-pic img").attr("data-src");
      if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
        vodPic = baseUrl + vodPic;
      }
      const vodRemarks = $item.find(".module-item-text").text();
      const vodYear = $item.find(".module-item-caption span").first().text();

      if (href && vodName) {
        videos.push({
          vod_id: href,
          vod_name: vodName,
          vod_pic: vodPic || "",
          type_id: categoryId,
          type_name: "",
          vod_remarks: vodRemarks || "",
          vod_year: vodYear || "",
        });
      }
    });

    OmniBox.log("info", `解析完成,找到 ${videos.length} 个视频`);

    const autoFilters = parseFiltersFromHtml(response.body);
    let categoryFilters = autoFilters;

    if (categoryFilters.length === 0) {
      const preferredFilters = await getPreferredFilters([{ type_id: categoryId, type_name: "" }]);
      categoryFilters = preferredFilters[categoryId] || [];
    }

    const result = {
      list: videos,
      page: page,
      pagecount: 0,
      total: videos.length,
    };

    if (page === 1 && categoryFilters.length > 0) {
      result.filters = categoryFilters;
    }

    return result;
  } catch (error) {
    OmniBox.log("error", `获取分类数据失败: ${error.message}`);
    return {
      list: [],
      page: params.page || 1,
      pagecount: 0,
      total: 0,
    };
  }
}

function buildScrapedFileName(scrapeData, mapping, originalFileName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalFileName;
  }

  if (scrapeData && scrapeData.episodes && Array.isArray(scrapeData.episodes)) {
    for (const episode of scrapeData.episodes) {
      if (episode.episodeNumber === mapping.episodeNumber && episode.seasonNumber === mapping.seasonNumber) {
        if (episode.name) {
          return `${episode.episodeNumber}.${episode.name}`;
        }
        break;
      }
    }
  }

  return originalFileName;
}

function normalizeEpisodeName(name = "") {
  return String(name || "")
    .replace(/\.[^.]+$/g, "")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function encodePlayMeta(obj = {}) {
  try {
    const raw = JSON.stringify(obj || {});
    return Buffer.from(raw, "utf8").toString("base64");
  } catch {
    return "";
  }
}

function decodePlayMeta(str = "") {
  try {
    if (!str) return {};
    const raw = Buffer.from(str, "base64").toString("utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

async function getDetailPageCached(videoId) {
  const detailCacheKey = buildCacheKey("muou:detailHtml", videoId);
  let detailPage = await getCachedJSON(detailCacheKey);
  if (!detailPage) {
    detailPage = await requestWithFailover(videoId);
    if (detailPage && detailPage.response && detailPage.response.statusCode === 200 && detailPage.response.body) {
      await setCachedJSON(detailCacheKey, detailPage, MUOU_CACHE_EX_SECONDS);
    }
  } else {
    logDetailDebug(`命中详情页缓存: ${videoId}`);
  }
  return detailPage;
}

async function getDriveInfoCached(shareURL) {
  const cacheKey = buildCacheKey("muou:driveInfo", shareURL);
  let driveInfo = await getCachedJSON(cacheKey);
  if (!driveInfo) {
    driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
    await setCachedJSON(cacheKey, driveInfo, MUOU_CACHE_EX_SECONDS);
  }
  return driveInfo;
}

async function getRootFileListCached(shareURL) {
  const cacheKey = buildCacheKey("muou:rootFiles", shareURL);
  let fileList = await getCachedJSON(cacheKey);
  if (!fileList) {
    fileList = await OmniBox.getDriveFileList(shareURL, "0");
    if (fileList && fileList.files && Array.isArray(fileList.files)) {
      await setCachedJSON(cacheKey, fileList, MUOU_CACHE_EX_SECONDS);
    }
  } else {
    logDetailDebug(`命中根目录文件列表缓存: ${shareURL}`);
  }
  return fileList;
}

async function getAllVideoFilesCached(shareURL, rootFiles) {
  const cacheKey = buildCacheKey("muou:videoFiles", shareURL);
  let allVideoFiles = await getCachedJSON(cacheKey);
  if (!Array.isArray(allVideoFiles) || allVideoFiles.length === 0) {
    allVideoFiles = await getAllVideoFiles(shareURL, rootFiles, "0");
    if (Array.isArray(allVideoFiles) && allVideoFiles.length > 0) {
      await setCachedJSON(cacheKey, allVideoFiles, MUOU_CACHE_EX_SECONDS);
    }
  } else {
    logDetailDebug(`命中视频文件缓存: ${shareURL}, 数量: ${allVideoFiles.length}`);
  }
  return allVideoFiles;
}

function buildMergedVideoFilesForScraping(panUrlResults, videoId) {
  const mergedVideoFilesForScraping = [];
  for (const result of panUrlResults) {
    const { shareURL, allVideoFiles } = result;
    for (const file of allVideoFiles) {
      const fileId = file.fid || file.file_id || "";
      const formattedFileId = fileId ? `${shareURL}|${fileId}|${videoId}` : fileId;
      mergedVideoFilesForScraping.push({
        ...file,
        fid: formattedFileId,
        file_id: formattedFileId,
        _shareURL: shareURL,
      });
    }
  }
  return mergedVideoFilesForScraping;
}

async function getMergedMetadataCached(videoId, vodName, mergedVideoFilesForScraping) {
  const metadataCacheKey = buildCacheKey("muou:metadata", videoId);
  const metadataRefreshLockKey = buildCacheKey("muou:metadataRefreshLock", videoId);

  let scrapeData = null;
  let videoMappings = [];
  let scrapeType = "";
  const cachedMetadata = await getCachedJSON(metadataCacheKey);

  if (cachedMetadata) {
    scrapeData = cachedMetadata.scrapeData || null;
    videoMappings = cachedMetadata.videoMappings || [];
    scrapeType = cachedMetadata.scrapeType || "";
    logDetailDebug(`命中统一元数据缓存: ${videoId}, 映射数量: ${videoMappings.length}`);
  }

  const refreshMetadataInBackground = async () => {
    const refreshLock = await getCachedJSON(metadataRefreshLockKey);
    if (refreshLock) return;
    await setCachedJSON(metadataRefreshLockKey, { refreshing: true }, MUOU_CACHE_EX_SECONDS);

    try {
      logDetailDebug(`后台统一刷新元数据: ${videoId}`);
      await OmniBox.processScraping(videoId, vodName, vodName, mergedVideoFilesForScraping);
      const metadata = await OmniBox.getScrapeMetadata(videoId);
      await setCachedJSON(metadataCacheKey, {
        scrapeData: metadata?.scrapeData || null,
        videoMappings: metadata?.videoMappings || [],
        scrapeType: metadata?.scrapeType || "",
      }, MUOU_CACHE_EX_SECONDS);
    } catch (error) {
      OmniBox.log("warn", `后台统一刷新元数据失败: ${error.message}`);
    }
  };

  if (!cachedMetadata && mergedVideoFilesForScraping.length > 0) {
    try {
      OmniBox.log("info", `未命中统一元数据缓存，开始同步刮削: ${videoId}, 文件数: ${mergedVideoFilesForScraping.length}`);
      await OmniBox.processScraping(videoId, vodName, vodName, mergedVideoFilesForScraping);
      const metadata = await OmniBox.getScrapeMetadata(videoId);
      scrapeData = metadata?.scrapeData || null;
      videoMappings = metadata?.videoMappings || [];
      scrapeType = metadata?.scrapeType || "";
      await setCachedJSON(metadataCacheKey, {
        scrapeData,
        videoMappings,
        scrapeType,
      }, MUOU_CACHE_EX_SECONDS);
      if (scrapeData) {
        OmniBox.log("info", `同步统一获取元数据成功, 标题: ${scrapeData.title || "未知"}, 映射数量: ${videoMappings.length}`);
      }
    } catch (error) {
      OmniBox.log("error", `同步统一获取元数据失败: ${error.message}`);
      if (error.stack) {
        OmniBox.log("error", `同步统一获取元数据错误堆栈: ${error.stack}`);
      }
    }
  } else if (cachedMetadata) {
    refreshMetadataInBackground().catch((error) => {
      OmniBox.log("warn", `异步统一刷新元数据失败: ${error.message}`);
    });
  }

  return {
    scrapeData,
    videoMappings,
    scrapeType,
    cachedMetadata,
  };
}

function parseVodBaseInfo($, baseUrl) {
  let vodName = $(".page-title")[0]?.children?.[0]?.data || "";
  let vodPic = $($(".mobile-play")).find(".lazyload")[0]?.attribs?.["data-src"] || "";
  if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
    vodPic = baseUrl + vodPic;
  }

  let vodYear = "";
  let vodDirector = "";
  let vodActor = "";
  let vodContent = "";

  const videoItems = $(".video-info-itemtitle");
  for (const item of videoItems) {
    const key = $(item).text();
    const vItems = $(item).next().find("a");
    const value = vItems
      .map((i, el) => {
        const text = $(el).text().trim();
        return text ? text : null;
      })
      .get()
      .filter(Boolean)
      .join(", ");

    if (key.includes("剧情")) {
      vodContent = $(item).next().find("p").text().trim();
    } else if (key.includes("导演")) {
      vodDirector = value.trim();
    } else if (key.includes("主演")) {
      vodActor = value.trim();
    }
  }

  return {
    vodName,
    vodPic,
    vodYear,
    vodDirector,
    vodActor,
    vodContent,
  };
}

function extractPanUrls($) {
  const panUrls = [];
  const items = $(".module-row-info");
  for (const item of items) {
    const shareUrl = $(item).find("p")[0]?.children?.[0]?.data;
    if (shareUrl) {
      panUrls.push(shareUrl.trim());
    }
  }
  return panUrls;
}

async function collectDriveTypeCountMap(panUrls = []) {
  const driveTypeCountMap = {};
  for (const shareURL of panUrls) {
    try {
      const driveInfo = await getDriveInfoCached(shareURL);
      const displayName = driveInfo?.displayName || "未知网盘";
      driveTypeCountMap[displayName] = (driveTypeCountMap[displayName] || 0) + 1;
    } catch (error) {
      OmniBox.log("warn", `统计网盘类型失败: ${shareURL}, error=${error.message}`);
    }
  }
  return driveTypeCountMap;
}

/**
 * 获取视频详情
 */
async function detail(params, context) {
  try {
    const videoId = params.videoId || "";

    if (!videoId) {
      throw new Error("视频ID不能为空");
    }

    const source = params.source || "";
    OmniBox.log("info", `获取视频详情: videoId=${videoId}, source=${source}`);

    const detailPage = await getDetailPageCached(videoId);
    const { response, baseUrl } = detailPage;

    if (response.statusCode !== 200 || !response.body) {
      throw new Error(`请求失败: HTTP ${response.statusCode}`);
    }

    const $ = cheerio.load(response.body);
    const {
      vodName,
      vodPic,
      vodYear,
      vodDirector,
      vodActor,
      vodContent,
    } = parseVodBaseInfo($, baseUrl);

    const panUrls = extractPanUrls($);
    logDetailDebug(`解析完成,网盘链接数=${panUrls.length}`);

    let playSources = [];

    const driveTypeCountMap = await collectDriveTypeCountMap(panUrls);
    const driveTypeCurrentIndexMap = {};

    // ==================== 并行处理网盘链接（方案 A：先收集所有文件，再统一刮削一次） ====================
    const panUrlTasks = panUrls.map(async (shareURL) => {
      try {
        logDetailDebug(`处理网盘链接: ${shareURL}`);

        const driveInfo = await getDriveInfoCached(shareURL);
        let displayName = driveInfo.displayName || "未知网盘";

        const totalCount = driveTypeCountMap[displayName] || 0;
        if (totalCount > 1) {
          driveTypeCurrentIndexMap[displayName] = (driveTypeCurrentIndexMap[displayName] || 0) + 1;
          displayName = `${displayName}${driveTypeCurrentIndexMap[displayName]}`;
        }

        logDetailDebug(`网盘类型: ${displayName}, driveType: ${driveInfo.driveType}`);

        const fileList = await getRootFileListCached(shareURL);

        if (!fileList || !fileList.files || !Array.isArray(fileList.files)) {
          OmniBox.log("warn", `获取文件列表失败: ${shareURL}`);
          return null;
        }

        logDetailDebug(`从分享链接 ${shareURL} 获取文件列表成功,文件数量: ${fileList.files.length}`);

        const allVideoFiles = await getAllVideoFilesCached(shareURL, fileList.files);

        if (!allVideoFiles || allVideoFiles.length === 0) {
          OmniBox.log("warn", `未找到视频文件: ${shareURL}`);
          return null;
        }

        logDetailDebug(`递归获取视频文件完成,视频文件数量: ${allVideoFiles.length}`);

        return {
          shareURL,
          displayName,
          driveInfo,
          allVideoFiles,
        };
      } catch (error) {
        OmniBox.log("error", `处理网盘链接失败: ${shareURL}, 错误: ${error.message}`);
        return null;
      }
    });

    const panUrlResults = (await Promise.all(panUrlTasks)).filter(Boolean);
    OmniBox.log("info", `方案A: 有效网盘结果数量=${panUrlResults.length}`);

    const mergedVideoFilesForScraping = buildMergedVideoFilesForScraping(panUrlResults, videoId);
    OmniBox.log("info", `方案A: 合并用于刮削的视频文件数量=${mergedVideoFilesForScraping.length}`);

    const {
      scrapeData,
      videoMappings,
      scrapeType,
    } = await getMergedMetadataCached(videoId, vodName, mergedVideoFilesForScraping);
    logDetailDebug(`方案A: 当前统一元数据映射数量=${videoMappings.length}, scrapeType=${scrapeType || "unknown"}`);

    // 处理结果并构建播放源
    for (const result of panUrlResults) {
      const { shareURL, displayName, driveInfo, allVideoFiles } = result;

      let sourceNames = [displayName];
      const targetDriveTypes = DRIVE_TYPE_CONFIG;
      const configSourceNames = SOURCE_NAMES_CONFIG;

      if (targetDriveTypes.includes(driveInfo.driveType)) {
        sourceNames = [...configSourceNames];
        OmniBox.log("info", `${displayName} 匹配成功,初始线路设置为: ${sourceNames.join(", ")}`);
        sourceNames = filterSourceNamesForCaller(sourceNames, source, context);
        OmniBox.log("info", `来源=${source || "unknown"},最终线路设置为: ${sourceNames.join(", ")}`);
      }

      for (const sourceName of sourceNames) {
        const episodes = [];
        for (const file of allVideoFiles) {
          let fileName = file.file_name || "";
          const fileId = file.fid || "";
          const fileSize = file.size || file.file_size || 0;

          if (!fileName || !fileId) {
            continue;
          }

          const formattedFileId = fileId ? `${shareURL}|${fileId}|${videoId}` : "";

          let matchedMapping = null;
          if (scrapeData && videoMappings && Array.isArray(videoMappings) && videoMappings.length > 0) {
            for (const mapping of videoMappings) {
              if (mapping && mapping.fileId === formattedFileId) {
                matchedMapping = mapping;
                const newFileName = buildScrapedFileName(scrapeData, mapping, fileName);
                if (newFileName && newFileName !== fileName) {
                  fileName = newFileName;
                  OmniBox.log("info", `应用刮削文件名: ${file.file_name} -> ${fileName}`);
                }
                break;
              }
            }
          }

          const normalizedOriginalEpisodeName = normalizeEpisodeName(file.file_name || fileName);
          const playMeta = encodePlayMeta({
            sid: videoId,
            fid: fileId ? `${shareURL}|${fileId}` : "",
            v: vodName || "",
            t: vodName,
            e: normalizedOriginalEpisodeName,
          });
          const basePlayId = fileId ? `${shareURL}|${fileId}` : "";

          let displayFileName = fileName;
          if (fileSize > 0) {
            const fileSizeStr = formatFileSize(fileSize);
            if (fileSizeStr) {
              displayFileName = `[${fileSizeStr}] ${fileName}`;
            }
          }

          const episode = {
            name: displayFileName,
            playId: playMeta ? `${basePlayId}|${playMeta}` : basePlayId,
            size: fileSize > 0 ? fileSize : undefined,
            rawName: file.file_name || "",
          };

          if (matchedMapping) {
            if (matchedMapping.seasonNumber !== undefined && matchedMapping.seasonNumber !== null) {
              episode._seasonNumber = matchedMapping.seasonNumber;
            }
            if (matchedMapping.episodeNumber !== undefined && matchedMapping.episodeNumber !== null) {
              episode._episodeNumber = matchedMapping.episodeNumber;
            }
            if (matchedMapping.episodeName) {
              episode.episodeName = matchedMapping.episodeName;
            }
            if (matchedMapping.episodeOverview) {
              episode.episodeOverview = matchedMapping.episodeOverview;
            }
            if (matchedMapping.episodeAirDate) {
              episode.episodeAirDate = matchedMapping.episodeAirDate;
            }
            if (matchedMapping.episodeStillPath) {
              episode.episodeStillPath = matchedMapping.episodeStillPath;
            }
            if (matchedMapping.episodeVoteAverage !== undefined && matchedMapping.episodeVoteAverage !== null) {
              episode.episodeVoteAverage = matchedMapping.episodeVoteAverage;
            }
            if (matchedMapping.episodeRuntime !== undefined && matchedMapping.episodeRuntime !== null) {
              episode.episodeRuntime = matchedMapping.episodeRuntime;
            }
          }

          if (!episode.episodeName) {
            episode.episodeName = normalizedOriginalEpisodeName || file.file_name || fileName;
          }

          if (episode.name && episode.playId) {
            episodes.push(episode);
          }
        }

        if (scrapeData && episodes.length > 0) {
          const hasEpisodeNumber = episodes.some((ep) => ep._episodeNumber !== undefined);
          if (hasEpisodeNumber) {
            OmniBox.log("info", `检测到刮削数据，按 episodeNumber 排序剧集列表，共 ${episodes.length} 集`);
            episodes.sort((a, b) => {
              const seasonA = a._seasonNumber !== undefined ? a._seasonNumber : 0;
              const seasonB = b._seasonNumber !== undefined ? b._seasonNumber : 0;
              if (seasonA !== seasonB) return seasonA - seasonB;
              const episodeA = a._episodeNumber !== undefined ? a._episodeNumber : 0;
              const episodeB = b._episodeNumber !== undefined ? b._episodeNumber : 0;
              if (episodeA !== episodeB) return episodeA - episodeB;
              return a.name.localeCompare(b.name, 'zh-CN');
            });
          }
        }

        OmniBox.log("info", `方案A: shareURL=${shareURL}, sourceName=${sourceName}, episodes=${episodes.length}`);
        if (episodes.length > 0) {
          const lineName = targetDriveTypes.includes(driveInfo.driveType)
            ? `${displayName}-${sourceName}`
            : displayName;
          playSources.push({
            name: lineName,
            episodes,
          });
        }
      }
    }
    OmniBox.log("info", `方案A: 最终线路数=${playSources.length}`);
    if (Array.isArray(playSources) && playSources.length > 1 && DRIVE_ORDER.length > 0) {
      playSources = sortPlaySourcesByDriveOrder(playSources);
      OmniBox.log("info", `[detail] 按 DRIVE_ORDER 排序后线路顺序: ${playSources.map(item => item.name).join(' | ')}`);
    }

    const vodDetail = {
      vod_id: videoId,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_year: vodYear,
      vod_director: vodDirector,
      vod_actor: vodActor,
      vod_content: vodContent || `网盘资源,共${panUrls.length}个网盘链接`,
      vod_play_sources: playSources.length > 0 ? playSources : undefined,
      vod_remarks: "",
    };

    return {
      list: [vodDetail],
    };
  } catch (error) {
    OmniBox.log("error", `获取视频详情失败: ${error.message}`);
    return {
      list: [],
    };
  }
}

/**
 * 搜索视频
 */
async function search(params) {
  try {
    const keyword = params.keyword || "";
    const page = parseInt(params.page || "1", 10);

    OmniBox.log("info", `搜索视频: keyword=${keyword}, page=${page}`);

    if (!keyword) {
      OmniBox.log("warn", "搜索关键词为空");
      return {
        list: [],
        page: 1,
        pagecount: 0,
        total: 0,
      };
    }

    const searchPath = `/index.php/vod/search/page/${page}/wd/${keyword}.html`;
    const { response, baseUrl } = await requestWithFailover(searchPath);

    if (response.statusCode !== 200 || !response.body) {
      OmniBox.log("error", `请求失败: HTTP ${response.statusCode}`);
      return {
        list: [],
        page: page,
        pagecount: 0,
        total: 0,
      };
    }

    const $ = cheerio.load(response.body);
    const videos = [];

    const items = $(".module-search-item");
    for (const item of items) {
      const $item = $(item);
      const videoSerial = $item.find(".video-serial")[0];
      const vodPicImg = $item.find(".module-item-pic > img")[0];

      if (videoSerial && videoSerial.attribs) {
        const vodId = videoSerial.attribs.href || "";
        const vodName = videoSerial.attribs.title || "";
        let vodPic = vodPicImg?.attribs?.["data-src"] || "";
        if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
          vodPic = baseUrl + vodPic;
        }
        const vodRemarks = $($item.find(".video-serial")[0]).text() || "";

        if (vodId && vodName) {
          videos.push({
            vod_id: vodId,
            vod_name: vodName,
            vod_pic: vodPic,
            type_id: "",
            type_name: "",
            vod_remarks: vodRemarks,
          });
        }
      }
    }

    OmniBox.log("info", `搜索完成,找到 ${videos.length} 个结果`);

    return {
      list: videos,
      page: page,
      pagecount: 0,
      total: videos.length,
    };
  } catch (error) {
    OmniBox.log("error", `搜索视频失败: ${error.message}`);
    return {
      list: [],
      page: params.page || 1,
      pagecount: 0,
      total: 0,
    };
  }
}

async function play(params, context) {
  try {
    const flag = params.flag || "";
    const playId = params.playId || "";
    const source = resolveCallerSource(params, context);

    OmniBox.log("info", `获取播放地址: flag=${flag}, playId=${playId}`);

    if (!playId) {
      throw new Error("播放参数不能为空");
    }

    const idParts = playId.split("|");
    if (idParts.length < 2) {
      throw new Error("播放参数格式错误,应为:分享链接|文件ID");
    }

    let playMeta = {};
    let coreParts = [...idParts];
    if (coreParts.length >= 3) {
      const possibleMeta = coreParts[coreParts.length - 1] || "";
      try {
        playMeta = decodePlayMeta(possibleMeta);
        if (playMeta && typeof playMeta === "object" && (playMeta.v || playMeta.e || playMeta.fid || playMeta.sid || playMeta.t)) {
          coreParts = coreParts.slice(0, -1);
        } else {
          playMeta = {};
        }
      } catch (_) {
        playMeta = {};
      }
    }

    const shareURL = coreParts[0] || "";
    const fileId = coreParts[1] || "";
    const videoId = playMeta.sid || coreParts[2] || "";

    if (!shareURL || !fileId) {
      throw new Error("分享链接或文件ID不能为空");
    }

    OmniBox.log("info", `解析参数: shareURL=${shareURL}, fileId=${fileId}`);

    const routeType = resolveRouteType(flag, source, context);
    OmniBox.log("info", `使用线路: ${routeType}`);

    // 并行: 主链路(播放地址) + 辅链路(刮削元数据/弹幕)
    const playInfoPromise = OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);
    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: null,
        episodeName: params.episodeName || playMeta.e || "",
      };

      if (!videoId) return result;

      try {
        const metadata = await OmniBox.getScrapeMetadata(videoId);
        if (!metadata || !metadata.scrapeData || !Array.isArray(metadata.videoMappings)) {
          return result;
        }

        const formattedFileId = `${shareURL}|${fileId}|${videoId}`;
        const matchedMapping = metadata.videoMappings.find((mapping) => mapping && mapping.fileId === formattedFileId);
        if (!matchedMapping) {
          return result;
        }

        const scrapeData = metadata.scrapeData;
        result.scrapeTitle = scrapeData.title || "";
        if (scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
        }

        if (matchedMapping.episodeNumber) {
          result.episodeNumber = matchedMapping.episodeNumber;
        }
        if (matchedMapping.episodeName && !result.episodeName) {
          result.episodeName = matchedMapping.episodeName;
        }

        let fileName = "";
        const scrapeType = metadata.scrapeType || "";
        if (scrapeType === "movie") {
          fileName = scrapeData.title || "";
        } else {
          const title = scrapeData.title || "";
          const seasonAirYear = scrapeData.seasonAirYear || "";
          const seasonNumber = matchedMapping.seasonNumber || 1;
          const episodeNum = matchedMapping.episodeNumber || 1;
          fileName = `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
        }

        if (fileName) {
          OmniBox.log("info", `生成fileName用于弹幕匹配: ${fileName}`);
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
          if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
            result.danmakuList = matchedDanmaku;
            OmniBox.log("info", `弹幕匹配成功,找到 ${matchedDanmaku.length} 条弹幕`);
          }
        }
      } catch (error) {
        OmniBox.log("warn", `弹幕匹配失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);

    if (playInfoResult.status !== "fulfilled") {
      throw new Error(playInfoResult.reason && playInfoResult.reason.message ? playInfoResult.reason.message : "无法获取播放地址");
    }

    const playInfo = playInfoResult.value;
    if (!playInfo || !playInfo.url || !Array.isArray(playInfo.url) || playInfo.url.length === 0) {
      throw new Error("无法获取播放地址");
    }

    let danmakuList = [];
    let scrapeTitle = "";
    let scrapePic = "";
    let episodeNumber = null;
    let episodeName = params.episodeName || "";

    if (metadataResult.status === "fulfilled" && metadataResult.value) {
      danmakuList = metadataResult.value.danmakuList || [];
      scrapeTitle = metadataResult.value.scrapeTitle || "";
      scrapePic = metadataResult.value.scrapePic || "";
      episodeNumber = metadataResult.value.episodeNumber || null;
      episodeName = metadataResult.value.episodeName || episodeName;
    } else if (metadataResult.status === "rejected") {
      OmniBox.log("warn", `获取元数据失败(不影响播放): ${metadataResult.reason && metadataResult.reason.message ? metadataResult.reason.message : metadataResult.reason}`);
    }

    try {
      const sourceId = context.sourceId;
      if (sourceId) {
        const title = params.title || scrapeTitle || shareURL;
        const pic = params.pic || scrapePic || "";

        OmniBox.addPlayHistory({
          vodId: videoId,
          title: title,
          pic: pic,
          episode: playId,
          sourceId: sourceId,
          episodeNumber: episodeNumber,
          episodeName: episodeName,
        })
          .then((added) => {
            if (added) {
              OmniBox.log("info", `已添加观看记录: ${title}`);
            } else {
              OmniBox.log("info", `观看记录已存在,跳过添加: ${title}`);
            }
          })
          .catch((error) => {
            OmniBox.log("warn", `添加观看记录失败: ${error.message}`);
          });
      }
    } catch (error) {
      OmniBox.log("warn", `添加观看记录失败: ${error.message}`);
    }

    const urlList = playInfo.url || [];
    const urlsResult = [];
    for (const item of urlList) {
      urlsResult.push({
        name: item.name || "播放",
        url: item.url,
      });
    }

    const header = playInfo.header || {};
    const finalDanmakuList = danmakuList && danmakuList.length > 0 ? danmakuList : playInfo.danmaku || [];

    return {
      urls: urlsResult,
      header: header,
      parse: 0,
      danmaku: finalDanmakuList};
  } catch (error) {
    OmniBox.log("error", `播放接口失败: ${error.message}`);
    return {
      urls: [],
      header: {},
      danmaku: []};
  }
}

async function getDynamicFilters() {
  return {
    "1": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部剧情",
            "value": ""
          },
          {
            "name": "喜剧",
            "value": "喜剧"
          },
          {
            "name": "爱情",
            "value": "爱情"
          },
          {
            "name": "恐怖",
            "value": "恐怖"
          },
          {
            "name": "动作",
            "value": "动作"
          },
          {
            "name": "科幻",
            "value": "科幻"
          },
          {
            "name": "剧情",
            "value": "剧情"
          },
          {
            "name": "战争",
            "value": "战争"
          },
          {
            "name": "警匪",
            "value": "警匪"
          },
          {
            "name": "犯罪",
            "value": "犯罪"
          },
          {
            "name": "古装",
            "value": "古装"
          },
          {
            "name": "奇幻",
            "value": "奇幻"
          },
          {
            "name": "武侠",
            "value": "武侠"
          },
          {
            "name": "冒险",
            "value": "冒险"
          },
          {
            "name": "枪战",
            "value": "枪战"
          },
          {
            "name": "悬疑",
            "value": "悬疑"
          },
          {
            "name": "惊悚",
            "value": "惊悚"
          },
          {
            "name": "经典",
            "value": "经典"
          },
          {
            "name": "青春",
            "value": "青春"
          },
          {
            "name": "文艺",
            "value": "文艺"
          },
          {
            "name": "微电影",
            "value": "微电影"
          },
          {
            "name": "历史",
            "value": "历史"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部地区",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "大陆",
            "value": "大陆"
          },
          {
            "name": "中国香港",
            "value": "中国香港"
          },
          {
            "name": "香港",
            "value": "香港"
          },
          {
            "name": "中国台湾",
            "value": "中国台湾"
          },
          {
            "name": "台湾",
            "value": "台湾"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "西班牙",
            "value": "西班牙"
          },
          {
            "name": "法国",
            "value": "法国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "韩国",
            "value": "韩国"
          },
          {
            "name": "泰国",
            "value": "泰国"
          },
          {
            "name": "德国",
            "value": "德国"
          },
          {
            "name": "印度",
            "value": "印度"
          },
          {
            "name": "意大利",
            "value": "意大利"
          },
          {
            "name": "加拿大",
            "value": "加拿大"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "lang",
        "name": "语言",
        "init": "",
        "value": [
          {
            "name": "全部语言",
            "value": ""
          },
          {
            "name": "国语",
            "value": "国语"
          },
          {
            "name": "英语",
            "value": "英语"
          },
          {
            "name": "粤语",
            "value": "粤语"
          },
          {
            "name": "闽南语",
            "value": "闽南语"
          },
          {
            "name": "韩语",
            "value": "韩语"
          },
          {
            "name": "日语",
            "value": "日语"
          },
          {
            "name": "法语",
            "value": "法语"
          },
          {
            "name": "德语",
            "value": "德语"
          },
          {
            "name": "其它",
            "value": "其它"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部时间",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          },
          {
            "name": "2009",
            "value": "2009"
          },
          {
            "name": "2008",
            "value": "2008"
          },
          {
            "name": "2007",
            "value": "2007"
          },
          {
            "name": "2006",
            "value": "2006"
          },
          {
            "name": "2005",
            "value": "2005"
          },
          {
            "name": "2004",
            "value": "2004"
          },
          {
            "name": "2003",
            "value": "2003"
          },
          {
            "name": "2002",
            "value": "2002"
          },
          {
            "name": "2001",
            "value": "2001"
          },
          {
            "name": "2000",
            "value": "2000"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "字母查找",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "时间排序",
            "value": ""
          },
          {
            "name": "人气排序",
            "value": "hits"
          },
          {
            "name": "评分排序",
            "value": "score"
          }
        ]
      }
    ],
    "2": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部剧情",
            "value": ""
          },
          {
            "name": "喜剧",
            "value": "喜剧"
          },
          {
            "name": "爱情",
            "value": "爱情"
          },
          {
            "name": "恐怖",
            "value": "恐怖"
          },
          {
            "name": "动作",
            "value": "动作"
          },
          {
            "name": "科幻",
            "value": "科幻"
          },
          {
            "name": "剧情",
            "value": "剧情"
          },
          {
            "name": "战争",
            "value": "战争"
          },
          {
            "name": "警匪",
            "value": "警匪"
          },
          {
            "name": "犯罪",
            "value": "犯罪"
          },
          {
            "name": "古装",
            "value": "古装"
          },
          {
            "name": "奇幻",
            "value": "奇幻"
          },
          {
            "name": "武侠",
            "value": "武侠"
          },
          {
            "name": "冒险",
            "value": "冒险"
          },
          {
            "name": "枪战",
            "value": "枪战"
          },
          {
            "name": "悬疑",
            "value": "悬疑"
          },
          {
            "name": "惊悚",
            "value": "惊悚"
          },
          {
            "name": "经典",
            "value": "经典"
          },
          {
            "name": "青春",
            "value": "青春"
          },
          {
            "name": "文艺",
            "value": "文艺"
          },
          {
            "name": "微电影",
            "value": "微电影"
          },
          {
            "name": "历史",
            "value": "历史"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部地区",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "大陆",
            "value": "大陆"
          },
          {
            "name": "中国香港",
            "value": "中国香港"
          },
          {
            "name": "香港",
            "value": "香港"
          },
          {
            "name": "中国台湾",
            "value": "中国台湾"
          },
          {
            "name": "台湾",
            "value": "台湾"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "西班牙",
            "value": "西班牙"
          },
          {
            "name": "法国",
            "value": "法国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "韩国",
            "value": "韩国"
          },
          {
            "name": "泰国",
            "value": "泰国"
          },
          {
            "name": "德国",
            "value": "德国"
          },
          {
            "name": "印度",
            "value": "印度"
          },
          {
            "name": "意大利",
            "value": "意大利"
          },
          {
            "name": "加拿大",
            "value": "加拿大"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "lang",
        "name": "语言",
        "init": "",
        "value": [
          {
            "name": "全部语言",
            "value": ""
          },
          {
            "name": "国语",
            "value": "国语"
          },
          {
            "name": "英语",
            "value": "英语"
          },
          {
            "name": "粤语",
            "value": "粤语"
          },
          {
            "name": "闽南语",
            "value": "闽南语"
          },
          {
            "name": "韩语",
            "value": "韩语"
          },
          {
            "name": "日语",
            "value": "日语"
          },
          {
            "name": "其它",
            "value": "其它"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部时间",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          },
          {
            "name": "2009",
            "value": "2009"
          },
          {
            "name": "2008",
            "value": "2008"
          },
          {
            "name": "2007",
            "value": "2007"
          },
          {
            "name": "2006",
            "value": "2006"
          },
          {
            "name": "2005",
            "value": "2005"
          },
          {
            "name": "2004",
            "value": "2004"
          },
          {
            "name": "2003",
            "value": "2003"
          },
          {
            "name": "2002",
            "value": "2002"
          },
          {
            "name": "2001",
            "value": "2001"
          },
          {
            "name": "2000",
            "value": "2000"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "字母查找",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "时间排序",
            "value": ""
          },
          {
            "name": "人气排序",
            "value": "hits"
          },
          {
            "name": "评分排序",
            "value": "score"
          }
        ]
      }
    ],
    "3": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部剧情",
            "value": ""
          },
          {
            "name": "情感",
            "value": "情感"
          },
          {
            "name": "科幻",
            "value": "科幻"
          },
          {
            "name": "热血",
            "value": "热血"
          },
          {
            "name": "推理",
            "value": "推理"
          },
          {
            "name": "搞笑",
            "value": "搞笑"
          },
          {
            "name": "冒险",
            "value": "冒险"
          },
          {
            "name": "萝莉",
            "value": "萝莉"
          },
          {
            "name": "校园",
            "value": "校园"
          },
          {
            "name": "动作",
            "value": "动作"
          },
          {
            "name": "机战",
            "value": "机战"
          },
          {
            "name": "运动",
            "value": "运动"
          },
          {
            "name": "战争",
            "value": "战争"
          },
          {
            "name": "少年",
            "value": "少年"
          },
          {
            "name": "少女",
            "value": "少女"
          },
          {
            "name": "社会",
            "value": "社会"
          },
          {
            "name": "原创",
            "value": "原创"
          },
          {
            "name": "亲子",
            "value": "亲子"
          },
          {
            "name": "益智",
            "value": "益智"
          },
          {
            "name": "励志",
            "value": "励志"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部地区",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "大陆",
            "value": "大陆"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "西班牙",
            "value": "西班牙"
          },
          {
            "name": "法国",
            "value": "法国"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "lang",
        "name": "语言",
        "init": "",
        "value": [
          {
            "name": "全部语言",
            "value": ""
          },
          {
            "name": "国语",
            "value": "国语"
          },
          {
            "name": "英语",
            "value": "英语"
          },
          {
            "name": "粤语",
            "value": "粤语"
          },
          {
            "name": "闽南语",
            "value": "闽南语"
          },
          {
            "name": "韩语",
            "value": "韩语"
          },
          {
            "name": "日语",
            "value": "日语"
          },
          {
            "name": "其它",
            "value": "其它"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部时间",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          },
          {
            "name": "2009",
            "value": "2009"
          },
          {
            "name": "2008",
            "value": "2008"
          },
          {
            "name": "2007",
            "value": "2007"
          },
          {
            "name": "2006",
            "value": "2006"
          },
          {
            "name": "2005",
            "value": "2005"
          },
          {
            "name": "2004",
            "value": "2004"
          },
          {
            "name": "2003",
            "value": "2003"
          },
          {
            "name": "2002",
            "value": "2002"
          },
          {
            "name": "2001",
            "value": "2001"
          },
          {
            "name": "2000",
            "value": "2000"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "字母查找",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "时间排序",
            "value": ""
          },
          {
            "name": "人气排序",
            "value": "hits"
          },
          {
            "name": "评分排序",
            "value": "score"
          }
        ]
      }
    ],
    "5": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部剧情",
            "value": ""
          },
          {
            "name": "男频",
            "value": "男频"
          },
          {
            "name": "女频",
            "value": "女频"
          },
          {
            "name": "都市",
            "value": "都市"
          },
          {
            "name": "甜宠",
            "value": "甜宠"
          },
          {
            "name": "年代",
            "value": "年代"
          },
          {
            "name": "穿越",
            "value": "穿越"
          },
          {
            "name": "古装",
            "value": "古装"
          },
          {
            "name": "亲情",
            "value": "亲情"
          },
          {
            "name": "奇幻",
            "value": "奇幻"
          },
          {
            "name": "萌宝",
            "value": "萌宝"
          },
          {
            "name": "重生",
            "value": "重生"
          },
          {
            "name": "冒险",
            "value": "冒险"
          },
          {
            "name": "逆袭",
            "value": "逆袭"
          },
          {
            "name": "虐恋",
            "value": "虐恋"
          },
          {
            "name": "鉴宝",
            "value": "鉴宝"
          },
          {
            "name": "复仇",
            "value": "复仇"
          },
          {
            "name": "修仙",
            "value": "修仙"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部时间",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "字母查找",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "时间排序",
            "value": ""
          },
          {
            "name": "人气排序",
            "value": "hits"
          },
          {
            "name": "评分排序",
            "value": "score"
          }
        ]
      }
    ],
    "4": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部类型",
            "value": ""
          },
          {
            "name": "真人秀",
            "value": "真人秀"
          },
          {
            "name": "脱口秀",
            "value": "脱口秀"
          },
          {
            "name": "选秀",
            "value": "选秀"
          },
          {
            "name": "音乐",
            "value": "音乐"
          },
          {
            "name": "情感",
            "value": "情感"
          },
          {
            "name": "竞技",
            "value": "竞技"
          },
          {
            "name": "访谈",
            "value": "访谈"
          },
          {
            "name": "文化",
            "value": "文化"
          },
          {
            "name": "益智",
            "value": "益智"
          },
          {
            "name": "美食",
            "value": "美食"
          },
          {
            "name": "亲子",
            "value": "亲子"
          },
          {
            "name": "旅行",
            "value": "旅行"
          },
          {
            "name": "观察",
            "value": "观察"
          },
          {
            "name": "剧情",
            "value": "剧情"
          },
          {
            "name": "晚会",
            "value": "晚会"
          },
          {
            "name": "生活",
            "value": "生活"
          },
          {
            "name": "职业",
            "value": "职业"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部地区",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "大陆",
            "value": "大陆"
          },
          {
            "name": "中国台湾",
            "value": "中国台湾"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "法国",
            "value": "法国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "韩国",
            "value": "韩国"
          }
        ]
      },
      {
        "key": "lang",
        "name": "语言",
        "init": "",
        "value": [
          {
            "name": "全部语言",
            "value": ""
          },
          {
            "name": "国语",
            "value": "国语"
          },
          {
            "name": "英语",
            "value": "英语"
          },
          {
            "name": "粤语",
            "value": "粤语"
          },
          {
            "name": "闽南语",
            "value": "闽南语"
          },
          {
            "name": "韩语",
            "value": "韩语"
          },
          {
            "name": "日语",
            "value": "日语"
          },
          {
            "name": "其它",
            "value": "其它"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部时间",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          },
          {
            "name": "2009",
            "value": "2009"
          },
          {
            "name": "2008",
            "value": "2008"
          },
          {
            "name": "2007",
            "value": "2007"
          },
          {
            "name": "2006",
            "value": "2006"
          },
          {
            "name": "2005",
            "value": "2005"
          },
          {
            "name": "2004",
            "value": "2004"
          },
          {
            "name": "2003",
            "value": "2003"
          },
          {
            "name": "2002",
            "value": "2002"
          },
          {
            "name": "2001",
            "value": "2001"
          },
          {
            "name": "2000",
            "value": "2000"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "字母查找",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "时间排序",
            "value": ""
          },
          {
            "name": "人气排序",
            "value": "hits"
          },
          {
            "name": "评分排序",
            "value": "score"
          }
        ]
      }
    ],
    "21": [
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "字母查找",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "时间排序",
            "value": ""
          },
          {
            "name": "人气排序",
            "value": "hits"
          },
          {
            "name": "评分排序",
            "value": "score"
          }
        ]
      }
    ]
  };
}

module.exports = {
  home,
  category,
  search,
  detail,
  play,
};

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(1, "玩偶聚合-非分组", function (module, exports, require) {
// @name 玩偶聚合-非分组
// @author @Tao_XG
// @description 聚合玩偶、木偶、蜡笔、闪电、至臻、二小、虎斑、快映、欧哥、多多、蜗牛4K等网盘站点；支持刮削、弹幕、多线路、二级分类筛选、翻页、网盘排序
// @dependencies axios,cheerio
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/网盘/玩偶聚合-非分组.js

const OmniBox = require("omnibox_sdk");
const cheerio = require("cheerio");
const axios = require("axios");
const https = require("https");
const runner = require("spider_runner");

// 先导出再交给 runner
module.exports = {
  home,
  category,
  search,
  detail,
  play,
  login,
  logout,
  getLoginStatus,
  setCookies: setCookiesFromString,
};
runner.run(module.exports);

// ==================== 配置区域 ====================
const FILTER_CONFIG_BASE_URL = "https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/%E9%85%8D%E7%BD%AE/%E7%AD%9B%E9%80%89";

// 网盘线路优先级（从高到低），可用环境变量 PAN_DRIVE_ORDER 覆盖（分号/逗号分隔，如 115;baidu;quark;uc）
// 注意：内部 key 为 baidu/quark/a139/a189/a123/a115/xunlei/ali/uc，环境变量里可写 115/189/123/139 简写
const LINE_ORDER_ALIAS = { "115": "a115", "189": "a189", "123": "a123", "139": "a139" };
const LINE_ORDER = (process.env.PAN_DRIVE_ORDER || "baidu;a139;a189;a123;a115;quark;xunlei;ali;uc")
  .split(/[;,]/)
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)
  .map((s) => LINE_ORDER_ALIAS[s] || s);

// 详情页线路排序同网盘 key 别名一起处理（DRIVE_ORDER 完全跟随 PAN_DRIVE_ORDER）
const DRIVE_ORDER_ALIAS = LINE_ORDER_ALIAS;

// 网站排序优先级（站点 id，如 wanou;muou;labi;zhizhen;erxiao;huban;kuaiying;shandian;ouge;duoduo;woniu4k）
// 可用环境变量 PAN_SITE_ORDER 覆盖；留空则按站点配置顺序
const PAN_SITE_ORDER = (process.env.PAN_SITE_ORDER || "")
  .split(/[;,]/)
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// 详情页播放线路显示排序：始终跟随 PAN_DRIVE_ORDER（即 LINE_ORDER），不单独用 DRIVE_ORDER 覆盖
const DRIVE_ORDER = LINE_ORDER.join(";")
  .split(/[;,]/)
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)
  .map((s) => DRIVE_ORDER_ALIAS[s] || s);

// 播放线路名称（可由环境变量覆盖）
const SOURCE_NAMES_CONFIG = (process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

// 多线路网盘类型（可由环境变量覆盖，仅这些类型生成多条播放线路）
const DRIVE_TYPE_CONFIG = (process.env.DRIVE_TYPE_CONFIG || "quark;uc")
  .split(";")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// 刮削开关（默认开启，设置环境变量 ENABLE_SCRAPE=0 关闭）
const ENABLE_SCRAPE = process.env.ENABLE_SCRAPE !== "0";

// 详情链路缓存时间（秒），默认 12 小时
const WANOU_CACHE_EX_SECONDS = Number(process.env.WANOU_CACHE_EX_SECONDS || 43200);

const PAGE_SIZE = 20;
const REQUEST_TIMEOUT = 15000;

// ==================== 搜索合并模式 ====================
// 搜索时只抓取各站剧名并合并去重（不解析网盘），点击剧名后在详情页才解析并展示各网盘来源。
const MERGE_PREFIX = "__merge__";
// 单次搜索整体耗时预算（毫秒），默认 6 秒，避免 app 超时
const SEARCH_TIMEOUT_BUDGET_MS = Number(process.env.SEARCH_TIMEOUT_BUDGET_MS || 6000);
// 单次详情整体耗时预算（毫秒），默认 25 秒，避免 app 超时
const DETAIL_TIMEOUT_BUDGET_MS = Number(process.env.DETAIL_TIMEOUT_BUDGET_MS || 25000);
// 合并时使用的最多站点数（默认全部）
const MERGE_MAX_SITES = parseInt(process.env.MERGE_MAX_SITES || "0", 10) || 0;

// 每种网盘类型在聚合详情里最多解析的分享链接数（默认 3，0 表示不限制），减少盘检/刮削耗时
const PAN_MAX_LINKS_PER_DRIVE = parseInt(process.env.PAN_MAX_LINKS_PER_DRIVE || "3", 10) || 0;
// 蜗牛网盘 API 请求限流（毫秒），避免触发风控
const WONIU4K_DRIVE_API_DELAY_MS = Math.max(0, parseInt(process.env.WONIU4K_DRIVE_DELAY || "1500", 10));
const WONIU4K_USERNAME = String(process.env.WONIU4K_USERNAME || process.env.WONIU4K_USER || "").trim();
const WONIU4K_PASSWORD = String(process.env.WONIU4K_PASSWORD || process.env.WONIU4K_PASS || "").trim();
const WONIU4K_COOKIE = String(process.env.WONIU4K_COOKIE || process.env.WONIU4K_COOKIES || "").trim();

// ==================== 站点域名配置 ====================
const WOGG_SITES = splitSites(process.env.WEB_SITE_WOGG || "https://wogg.xxooo.cf;https://wogg.333232.xyz;https://www.wogg.net;");
const MUOU_SITES = splitSites(process.env.WEB_SITE_MUOU || "https://www.muou.site;https://www.muou.asia;https://666.666291.xyz;");
const LABI_SITES = splitSites(process.env.WEB_SITE_LABI || "http://fmao.shop;");
const ZHIZHEN_SITES = splitSites(process.env.WEB_SITE_ZHIZHEN || "http://www.miqk.cc;https://www.mihdr.top;https://mihdr.top;");
const ERXIAO_SITES = splitSites(process.env.WEB_SITE_ERXIAO || "https://www.2xiaopan.top;https://www.erixaopan.fun;https://2xiaopan.top;https://www.wexwp.cc;");
const HUBAN_SITES = splitSites(process.env.WEB_SITE_HUBAN || "http://38.76.197.172:16969;http://154.222.27.33:20720;http://xhban.xyz:20720;http://103.45.162.207:20720;");
const KUAIYING_SITES = splitSites(process.env.WEB_SITE_XIAOBAN || " http://38.76.197.172:12521;http://154.201.83.50:12512;http://xsayang.fun:12512;");
const SHANDIAN_SITES = splitSites(process.env.WEB_SITE_SHANDIAN || "https://sd.sduc.site;");
const OUGE_SITES = splitSites(process.env.WEB_SITE_OUGE || "https://woog.nxog.eu.org;");
const DUODUO_SITES = splitSites(process.env.WEB_SITE_DUODUO || "https://tv.yydsys.top;https://tv.214521.xyz;https://tv.yydsys.cc;https://yydsys.de5.net;https://duo.hidns.vip;");
const WONIU4K_SITES = splitSites(process.env.WEB_SITE_WONIU4K || "https://zmi.kdns.fr;");

const SITES = [];

pushSiteIfAny({
  id: "wanou",
  name: "玩偶",
  filterFiles: ["wogg.json"],
  domains: WOGG_SITES,
  listSelector: ".module-item",
  detailPanSelector: ".module-row-info p",
  categoryUrl: "/vodshow/{categoryId}--------{page}---.html",
  categoryUrlWithFilters: "/vodshow/{categoryId}-{area}-{by}-{class}-----{page}---{year}.html",
  searchUrl: "/vodsearch/-------------.html?wd={keyword}&page={page}",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "音乐", "6": "短剧", "44": "臻彩", "46": "纪录片" },
});

pushSiteIfAny({
  id: "muou",
  name: "木偶",
  filterFiles: ["mogg.json"],
  domains: MUOU_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "纪录片", "25": "臻选", "29": "综艺", "30": "原盘" },
});

pushSiteIfAny({
  id: "labi",
  name: "蜡笔",
  filterFiles: ["labi.json"],
  domains: LABI_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "24": "蜡笔4K", "29": "臻彩" },
});

pushSiteIfAny({
  id: "zhizhen",
  name: "至臻",
  filterFiles: ["zhizhen.json"],
  domains: ZHIZHEN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "24": "老剧", "44": "臻彩" },
});

pushSiteIfAny({
  id: "erxiao",
  name: "二小",
  filterFiles: ["erxiao.json"],
  domains: ERXIAO_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "臻彩", "21": "综艺" },
});

pushSiteIfAny({
  id: "huban",
  name: "虎斑",
  filterFiles: ["huban.json"],
  domains: HUBAN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "5": "短剧", "6": "臻彩", "30": "115网盘" },
});

pushSiteIfAny({
  id: "kuaiying",
  name: "快映",
  filterFiles: ["xiaoban.json"],
  domains: KUAIYING_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "5": "臻彩", "6": "短剧", "30": "115", "35": "123", "36": "天移迅" },
});

pushSiteIfAny({
  id: "shandian",
  name: "闪电",
  filterFiles: ["shandian.json"],
  domains: SHANDIAN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "30": "短剧" },
});

pushSiteIfAny({
  id: "ouge",
  name: "欧哥",
  filterFiles: ["ouge.json"],
  domains: OUGE_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "21": "综合" },
});

pushSiteIfAny({
  id: "duoduo",
  name: "多多",
  filterFiles: ["duoduo.json"],
  domains: DUODUO_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "多多电影", "2": "多多剧集", "3": "综艺", "4": "动漫", "5": "短剧", "20": "记录" },
});

// 蜗牛4K：MacCMS mxone 伪静态，主推 115（含 115cdn/anxia）
pushSiteIfAny({
  id: "woniu4k",
  name: "蜗牛4K",
  filterFiles: [],
  domains: WONIU4K_SITES,
  listSelector: ".module-item,a.video-card",
  detailPanSelector: ".module-row-info",
  categoryUrl: "/vodtype/{categoryId}/",
  categoryUrlPage: "/vodtype/{categoryId}-{page}/",
  searchUrl: "/vodsearch/{keyword}-------------/",
  searchUrlPage: "/vodsearch/{keyword}----------{page}---/",
  searchListSelector: ".module-search-item,.module-item,a.video-card",
  panExtractMode: "mxone",
  defaultCategories: { "1": "电影", "2": "连续剧", "3": "综艺", "4": "动漫" },
});

if (SITES.length === 0) {
  throw new Error("至少需要一个站点配置，请检查环境变量配置");
}

for (const site of SITES) {
  OmniBox.log("info", `[init] 站点 ${site.name} 域名数=${site.domains.length}`);
}

const INSECURE_HTTPS_AGENT = new https.Agent({ rejectUnauthorized: false });

// 仅保存蜗牛站点会话，避免聚合内其他站点互相污染 Cookie。
let cookieStore = {};

function getHostname(value = "") {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return String(value || "").trim().toLowerCase();
  }
}

function isWoniuURL(url = "") {
  const hostname = getHostname(url);
  return Boolean(hostname) && WONIU4K_SITES.some((siteUrl) => getHostname(siteUrl) === hostname);
}

function setCookiesFromHeaders(setCookieHeaders, baseUrl) {
  if (!isWoniuURL(baseUrl) || !setCookieHeaders || (!Array.isArray(setCookieHeaders) && typeof setCookieHeaders !== "string")) return;
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  const domain = getHostname(baseUrl);
  if (!cookieStore[domain]) cookieStore[domain] = {};
  for (const raw of list) {
    const pair = String(raw).split(";")[0];
    const index = pair.indexOf("=");
    if (index < 0) continue;
    const key = pair.substring(0, index).trim();
    const value = pair.substring(index + 1).trim();
    if (key) cookieStore[domain][key] = value;
  }
}

function setCookiesFromString(cookieString, domain) {
  if (!cookieString) return;
  const domains = domain ? [getHostname(domain)] : WONIU4K_SITES.map(getHostname).filter(Boolean);
  for (const targetDomain of domains) {
    if (!cookieStore[targetDomain]) cookieStore[targetDomain] = {};
    for (const part of String(cookieString).split(/[;,]/)) {
      const index = part.indexOf("=");
      if (index < 0) continue;
      const key = part.substring(0, index).trim();
      const value = part.substring(index + 1).trim();
      if (key) cookieStore[targetDomain][key] = value;
    }
  }
}

function getCookieHeader(url) {
  if (!isWoniuURL(url)) return "";
  const cookies = cookieStore[getHostname(url)];
  if (!cookies) return "";
  return Object.entries(cookies)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function clearCookies() {
  cookieStore = {};
}

if (WONIU4K_COOKIE) {
  setCookiesFromString(WONIU4K_COOKIE);
  OmniBox.log("info", "[woniu4k] 已从 WONIU4K_COOKIE 加载 Cookie");
}

// ==================== 缓存 ====================
const driveParseCache = new Map();
const siteFilterCache = new Map();
const playHistoryDedupeCache = new Map();
const CACHE_TTL = { drive: 60 * 60 * 1000, filter: 6 * 60 * 1000 };

function buildCacheKey(prefix, value) {
  return `${prefix}:${value}`;
}

async function getCachedJSON(key) {
  try {
    return await OmniBox.getCache(key);
  } catch (error) {
    await OmniBox.log("warn", `[cache] 读取缓存失败: key=${key}, err=${error.message}`);
    return null;
  }
}

async function setCachedJSON(key, value, exSeconds) {
  try {
    await OmniBox.setCache(key, value, exSeconds);
  } catch (error) {
    await OmniBox.log("warn", `[cache] 写入缓存失败: key=${key}, err=${error.message}`);
  }
}

async function getDriveInfoCached(shareURL) {
  const cacheKey = buildCacheKey("wanou:driveInfo", shareURL);
  let driveInfo = await getCachedJSON(cacheKey);
  if (!driveInfo) {
    driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
    await setCachedJSON(cacheKey, driveInfo, WANOU_CACHE_EX_SECONDS);
  }
  return driveInfo;
}

async function getRootFileListCached(shareURL) {
  const cacheKey = buildCacheKey("wanou:rootFiles", shareURL);
  let fileList = await getCachedJSON(cacheKey);
  if (!fileList) {
    fileList = await OmniBox.getDriveFileList(shareURL, "0");
    if (Array.isArray(fileList?.files) && fileList.files.length > 0) {
      await setCachedJSON(cacheKey, fileList, WANOU_CACHE_EX_SECONDS);
    }
  }
  return fileList;
}

async function getAllVideoFilesCached(shareURL, rootFiles) {
  const cacheKey = buildCacheKey("wanou:videoFiles", shareURL);
  let allVideoFiles = await getCachedJSON(cacheKey);
  if (!Array.isArray(allVideoFiles) || allVideoFiles.length === 0) {
    allVideoFiles = await getAllVideoFiles(shareURL, rootFiles);
    if (Array.isArray(allVideoFiles) && allVideoFiles.length > 0) {
      await setCachedJSON(cacheKey, allVideoFiles, WANOU_CACHE_EX_SECONDS);
    }
  }
  return allVideoFiles;
}

function splitSites(raw) {
  return String(raw || "")
    .split(";")
    .map((url) => url.trim())
    .filter(Boolean);
}

function pushSiteIfAny(site) {
  if (Array.isArray(site.domains) && site.domains.length > 0) {
    SITES.push(site);
  }
}

// ==================== 网络请求 ====================
async function httpRequest(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = {
    Accept: "*/*",
    ...(options.headers || {}),
  };
  const cookieHeader = getCookieHeader(url);
  if (cookieHeader) headers.Cookie = cookieHeader;

  const response = await axios({
    url,
    method,
    headers,
    data: options.body,
    timeout: options.timeout || REQUEST_TIMEOUT,
    httpsAgent: INSECURE_HTTPS_AGENT,
    validateStatus: () => true,
  });

  const setCookie = response.headers?.["set-cookie"];
  if (setCookie) setCookiesFromHeaders(setCookie, url);

  let body = response.data;
  if (typeof body !== "string") {
    body = body == null ? "" : JSON.stringify(body);
  }

  return {
    statusCode: response.status,
    body,
    headers: response.headers || {},
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBlockedHtml(body = "") {
  const lower = String(body || "").toLowerCase();
  return lower.includes("just a moment") || lower.includes("cf-browser-verification") || lower.includes("captcha") || lower.includes("访问验证");
}

function removeTrailingSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

async function requestWithFailover(domains, path, options = {}) {
  let lastError = null;
  const { budgetMs, ...requestOptions } = options;
  const effectiveBudget = Number.isFinite(budgetMs) && budgetMs > 0 ? budgetMs : 30000;
  const perDomainTimeout = Math.max(1000, Math.floor(effectiveBudget / Math.max(1, domains.length)));

  for (let i = 0; i < domains.length; i++) {
    const baseUrl = removeTrailingSlash(domains[i]);
    const fullUrl = path.startsWith("http") ? path : baseUrl + path;

    try {
      await OmniBox.log("info", `[request] try ${i + 1}/${domains.length} ${fullUrl}`);
      const response = await httpRequest(fullUrl, {
        ...requestOptions,
        method: requestOptions.method || "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...(requestOptions.headers || {}),
        },
        timeout: requestOptions.timeout ?? perDomainTimeout,
      });

      if (response.statusCode === 200 && response.body) {
        if (isBlockedHtml(response.body)) {
          await OmniBox.log("warn", `[request] blocked by ${baseUrl}`);
          lastError = new Error("命中风控页面");
          continue;
        }
        await OmniBox.log("info", `[request] success ${baseUrl}`);
        return { response, baseUrl };
      }

      await OmniBox.log("warn", `[request] non-200 ${response.statusCode} @ ${baseUrl}`);
      lastError = new Error(`HTTP ${response.statusCode}`);
    } catch (error) {
      await OmniBox.log("warn", `[request] fail ${baseUrl}: ${error.message}`);
      lastError = error;
    }
  }

  throw lastError || new Error("所有域名请求均失败");
}

// ==================== 通用辅助 ====================
function formatFileSize(size) {
  if (!size || size <= 0) return "";
  const unit = 1024;
  const units = ["B", "K", "M", "G", "T", "P"];
  if (size < unit) return `${size}B`;
  let exp = 0;
  let n = size;
  while (n >= unit && exp < units.length - 1) {
    n /= unit;
    exp++;
  }
  return Number.isInteger(n) ? `${n}${units[exp]}` : `${n.toFixed(2)}${units[exp]}`;
}

function isVideoFile(file) {
  if (!file || !file.file_name) return false;
  const fileName = String(file.file_name).toLowerCase();
  const exts = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];
  if (exts.some((ext) => fileName.endsWith(ext))) return true;
  const formatType = String(file.format_type || "").toLowerCase();
  return formatType.includes("video") || formatType.includes("mpeg") || formatType.includes("h264");
}

async function getAllVideoFiles(shareURL, files, errors = []) {
  if (!Array.isArray(files)) return [];
  const tasks = files.map(async (file) => {
    if (file.file && isVideoFile(file)) return [file];
    if (file.dir) {
      try {
        const subFileList = await OmniBox.getDriveFileList(shareURL, file.fid);
        if (Array.isArray(subFileList?.files)) {
          return await getAllVideoFiles(shareURL, subFileList.files, errors);
        }
      } catch (error) {
        errors.push({ path: file.name || file.fid, fid: file.fid, message: error.message, timestamp: new Date().toISOString() });
      }
    }
    return [];
  });
  const results = await Promise.all(tasks);
  return results.flat();
}

// ==================== 筛选器 ====================
function normalizeFilterOption(option) {
  if (!option || typeof option !== "object") return null;
  const name = option.n ?? option.name;
  const value = option.v ?? option.value;
  if (name === undefined || value === undefined) return null;
  return { name: String(name), value: String(value) };
}

function normalizeFilterGroup(group) {
  if (!group || typeof group !== "object" || !group.key) return null;
  const rawValues = Array.isArray(group.value) ? group.value : [];
  const values = rawValues.map(normalizeFilterOption).filter(Boolean);
  if (values.length === 0) return null;
  return {
    key: String(group.key),
    name: String(group.name || group.key),
    init: group.init !== undefined ? String(group.init) : "",
    value: values,
  };
}

function normalizeFilterConfigByCategory(config) {
  if (!config || typeof config !== "object") return null;
  const normalized = {};
  for (const [categoryId, groups] of Object.entries(config)) {
    if (!Array.isArray(groups)) continue;
    const normalizedGroups = groups.map(normalizeFilterGroup).filter(Boolean);
    if (normalizedGroups.length > 0) normalized[categoryId] = normalizedGroups;
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function mergeFilterGroups(groups) {
  const mergedMap = new Map();
  for (const group of groups) {
    const normalized = normalizeFilterGroup(group);
    if (!normalized || normalized.key === "categoryId") continue;
    if (!mergedMap.has(normalized.key)) {
      mergedMap.set(normalized.key, { key: normalized.key, name: normalized.name, init: normalized.init, valueMap: new Map() });
    }
    const bucket = mergedMap.get(normalized.key);
    for (const item of normalized.value) {
      if (!bucket.valueMap.has(item.value)) {
        bucket.valueMap.set(item.value, item.name);
      }
    }
  }

  return Array.from(mergedMap.values()).map((group) => {
    const values = Array.from(group.valueMap.entries()).map(([value, name]) => ({ name, value }));
    if (!values.some((item) => item.value === "") && values.length > 0) {
      values.unshift({ name: "全部", value: "" });
    }
    return {
      key: group.key,
      name: group.name,
      init: group.init || (values[0]?.value ?? ""),
      value: values,
    };
  });
}

function buildCategoryFilterGroup(site) {
  const categories = Object.entries(site.defaultCategories || {});
  return {
    key: "categoryId",
    name: "分类",
    init: categories[0]?.[0] || "",
    value: [{ name: "全部", value: "" }, ...categories.map(([id, name]) => ({ name, value: id }))],
  };
}

function buildSiteFilters(site, externalFilterConfig) {
  const categoryFilter = buildCategoryFilterGroup(site);
  if (!externalFilterConfig || typeof externalFilterConfig !== "object" || Object.keys(externalFilterConfig).length === 0) {
    return [categoryFilter];
  }
  const allGroups = [];
  for (const groups of Object.values(externalFilterConfig)) {
    if (Array.isArray(groups)) allGroups.push(...groups);
  }
  return [categoryFilter, ...mergeFilterGroups(allGroups)];
}

async function fetchExternalFilterConfig(site) {
  const cache = siteFilterCache.get(site.id);
  if (cache && Date.now() - cache.time < CACHE_TTL.filter) return cache.data;

  const files = Array.isArray(site.filterFiles) ? site.filterFiles : [];
  if (files.length === 0) {
    siteFilterCache.set(site.id, { data: null, time: Date.now() });
    return null;
  }

  for (const file of files) {
    const url = `${FILTER_CONFIG_BASE_URL}/${file}`;
    try {
      const response = await httpRequest(url, { timeout: 10000 });
      if (response.statusCode !== 200 || !response.body) continue;
      const parsed = JSON.parse(response.body);
      const normalizedConfig = normalizeFilterConfigByCategory(parsed);
      siteFilterCache.set(site.id, { data: normalizedConfig, time: Date.now() });
      await OmniBox.log("info", `[filter] ${site.name} loaded ${file}`);
      return normalizedConfig;
    } catch (error) {
      await OmniBox.log("warn", `[filter] ${site.name} load fail ${file}: ${error.message}`);
    }
  }

  siteFilterCache.set(site.id, { data: null, time: Date.now() });
  return null;
}

function encodeFilterSegment(value) {
  return encodeURIComponent(String(value ?? "").trim());
}

function hasSecondaryFilters(filters = {}) {
  return Object.keys(filters).some((key) => key !== "categoryId" && filters[key] !== undefined && filters[key] !== null && filters[key] !== "");
}

function buildCategoryUrl(site, categoryId, page = 1, filters = {}) {
  const safeFilters = filters || {};
  const byValue = safeFilters.by || safeFilters.sort || "";
  const pg = Math.max(1, parseInt(page || "1", 10) || 1);

  if (hasSecondaryFilters(safeFilters)) {
    if (site.categoryUrlWithFilters) {
      let url = site.categoryUrlWithFilters;
      const replacements = {
        categoryId: categoryId || "",
        page: pg,
        class: encodeFilterSegment(safeFilters.class),
        area: encodeFilterSegment(safeFilters.area),
        year: encodeFilterSegment(safeFilters.year),
        by: encodeFilterSegment(byValue),
        letter: encodeFilterSegment(safeFilters.letter),
      };
      for (const [key, value] of Object.entries(replacements)) {
        url = url.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
      }
      return url;
    }

    const segments = [];
    for (const [key, rawValue] of Object.entries(safeFilters)) {
      if (key === "categoryId" || rawValue == null || rawValue === "") continue;
      const mappedKey = key === "sort" ? "by" : key;
      segments.push(`/${mappedKey}/${encodeFilterSegment(rawValue)}`);
    }
    return `/index.php/vod/show/id/${categoryId}${segments.join("")}/page/${pg}.html`;
  }

  // mxone 伪静态：第 1 页 /vodtype/1/，后续 /vodtype/1-2/
  if (site.categoryUrlPage && pg > 1) {
    return site.categoryUrlPage
      .replace(/\{categoryId\}/g, categoryId)
      .replace(/\{page\}/g, String(pg));
  }

  if (site.categoryUrl) {
    return site.categoryUrl
      .replace(/\{categoryId\}/g, categoryId)
      .replace(/\{page\}/g, String(pg));
  }

  return `/index.php/vod/show/id/${categoryId}/page/${pg}.html`;
}

function buildSearchUrl(site, keyword, page = 1) {
  const enc = encodeURIComponent(String(keyword || "").trim());
  const pg = Math.max(1, parseInt(page || "1", 10) || 1);

  if (site.searchUrlPage && pg > 1) {
    return site.searchUrlPage
      .replace(/\{keyword\}/g, enc)
      .replace(/\{page\}/g, String(pg));
  }

  if (site.searchUrl) {
    return site.searchUrl
      .replace(/\{keyword\}/g, enc)
      .replace(/\{page\}/g, String(pg));
  }

  return `/index.php/vod/search/page/${pg}/wd/${enc}.html`;
}

function normalizeShareUrl(url) {
  let u = String(url || "").trim().replace(/&amp;/g, "&");
  if (!u) return "";
  u = u.replace(/^https?:\/\/(?:www\.)?115cdn\.com\//i, "https://115.com/");
  u = u.replace(/^https?:\/\/(?:www\.)?anxia\.com\//i, "https://115.com/");
  return u.replace(/[),.;]+$/, "");
}

function extractPanUrl(raw) {
  const s = String(raw || "").replace(/&amp;/g, "&").trim();
  const m = s.match(/https?:\/\/[^\s"'<>]+/i);
  return m ? normalizeShareUrl(m[0]) : "";
}

function isPanShareUrl(url = "") {
  return /115|quark|aliyun|alipan|baidu|uc\.cn|123pan|189\.cn|xunlei|anxia/i.test(String(url || ""));
}

function extractPanUrlsFromDetail($, site) {
  const panUrls = [];
  const seen = new Set();
  const pushUrl = (raw) => {
    const url = extractPanUrl(raw);
    if (!url || !/^https?:\/\//i.test(url) || !isPanShareUrl(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    panUrls.push(url);
  };

  // mxone / 蜗牛：clipboard、a 标签、p/i/span 文本
  if (site.panExtractMode === "mxone") {
    $(".module-row-info").each((_, el) => {
      $(el).find("[data-clipboard-text]").each((__, n) => pushUrl($(n).attr("data-clipboard-text")));
      $(el).find('a[href^="http"]').each((__, a) => pushUrl($(a).attr("href")));
      $(el).find("i,p,span").each((__, p) => pushUrl($(p).text().trim()));
      const firstP = $(el).find("p")[0]?.children?.[0]?.data;
      if (firstP) pushUrl(firstP);
    });

    $(".pan-link-item[data-pan-item]").each((_, el) => {
      $(el).find("[data-copy]").each((__, n) => pushUrl($(n).attr("data-copy")));
      $(el).find('a[href^="http"]').each((__, a) => pushUrl($(a).attr("href")));
      $(el).find(".pan-link-meta").each((__, meta) => pushUrl($(meta).text().trim()));
    });
  } else {
    const selector = site.detailPanSelector || ".module-row-info p";
    $(selector).each((_, p) => pushUrl($(p).text().trim()));
  }

  // 兜底：整页扫描分享链接（含 115cdn/anxia）
  if (panUrls.length === 0) {
    const html = $.html() || "";
    const re =
      /https?:\/\/(?:115cdn\.com|115\.com|anxia\.com|pan\.quark\.cn|www\.aliyundrive\.com|www\.alipan\.com|pan\.baidu\.com|drive\.uc\.cn|cloud\.189\.cn|www\.123pan\.com|pan\.xunlei\.com)\/[^\s"'<>]+/gi;
    let m;
    while ((m = re.exec(html))) {
      pushUrl(m[0]);
    }
  }

  return panUrls;
}

function parseTotalPages($) {
  let totalPages = 1;
  const pageSelectors = [".page-numbers:not(.next):not(.prev)", ".pagination a", ".page a", ".pages a", ".module-page a"];
  for (const selector of pageSelectors) {
    const pageLinks = $(selector);
    if (pageLinks.length > 0) {
      let maxPage = 1;
      pageLinks.each((_, el) => {
        const pageNum = parseInt($(el).text().trim(), 10);
        if (!Number.isNaN(pageNum) && pageNum > maxPage) maxPage = pageNum;
        const href = $(el).attr("href") || "";
        const mType = href.match(/\/vodtype\/\d+-(\d+)\/?/i);
        if (mType) maxPage = Math.max(maxPage, parseInt(mType[1], 10) || 1);
        const mSearch = href.match(/\/vodsearch\/[^/]*?----------+(\d+)---+\/?/i);
        if (mSearch) maxPage = Math.max(maxPage, parseInt(mSearch[1], 10) || 1);
      });
      if (maxPage > 1) {
        totalPages = maxPage;
        break;
      }
    }
  }

  // mxone 兜底：扫描全页分页链接
  $("a[href*='/vodtype/'],a[href*='/vodsearch/']").each((_, a) => {
    const href = $(a).attr("href") || "";
    let m = href.match(/\/vodtype\/\d+-(\d+)\/?/i);
    if (m) totalPages = Math.max(totalPages, parseInt(m[1], 10) || 1);
    m = href.match(/\/vodsearch\/[^/]*?----------+(\d+)---+\/?/i);
    if (m) totalPages = Math.max(totalPages, parseInt(m[1], 10) || 1);
  });

  const pageText = $(".page-text, .page_info, .page-count").text();
  const pageMatch = pageText.match(/共\s*(\d+)\s*页/);
  if (pageMatch) totalPages = Math.max(totalPages, parseInt(pageMatch[1], 10) || 1);
  return totalPages;
}

// ==================== 网盘解析 ====================
async function getDriveParseWithCache(url, driveKey, drives, source = "") {
  const cacheKey = `${driveKey}_${url}`;
  const cached = driveParseCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL.drive) {
    return { data: cached.data, fromCache: true };
  }

  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("驱动超时")), 8000));
  try {
    const result = await Promise.race([getEpisodesFromDrive(url, driveKey, drives, source), timeoutPromise]);
    driveParseCache.set(cacheKey, { data: result, time: Date.now() });
    return { data: result, fromCache: false };
  } catch (error) {
    await OmniBox.log("info", `[drive] parse fail ${driveKey}, source=${source}, err=${error.message}`);
    return { data: null, fromCache: false, error: error.message };
  }
}

async function getEpisodesFromDrive(url, driveKey, drives, source = "") {
  const drive = drives.find((d) => d.key === driveKey);
  if (!drive) {
    await OmniBox.log("info", `[drive] missing driver ${driveKey}`);
    return null;
  }

  try {
    if (!drive.matchShare || !drive.matchShare(url)) {
      await OmniBox.log("info", `[drive] unmatched share ${driveKey}`);
      return null;
    }
    const vod = await drive.getVod(url);
    if (!vod) return null;

    let isValid = true;
    if (vod.vod_play_url) {
      const parts = vod.vod_play_url.split("#");
      if (parts.length === 1) {
        const [name] = parts[0].split("$");
        if (["播放", "全集", "点击播放", "立即播放"].includes(name)) isValid = false;
      }
    } else {
      isValid = false;
    }

    if (!isValid) return null;

    return {
      playFrom: vod.vod_play_from || driveKey,
      playUrl: vod.vod_play_url,
      vodPic: vod.vod_pic || "",
      vodContent: vod.vod_content || "",
      vodActor: vod.vod_actor || "",
      vodDirector: vod.vod_director || "",
    };
  } catch (error) {
    await OmniBox.log("info", `[drive] error ${driveKey}: ${error.message}`);
    return null;
  }
}

// ==================== 站点抓取 ====================
async function fetchSiteSearch(site, keyword, page = 1, options = {}) {
  const searchUrl = buildSearchUrl(site, keyword, page);

  try {
    const { response, baseUrl } = await requestWithFailover(site.domains, searchUrl, { budgetMs: options.budgetMs });
    const $ = cheerio.load(response.body);
    const itemSelector = site.searchListSelector || ".module-search-item";
    const items = $(itemSelector);
    const videos = [];
    const seen = new Set();

    items.each((_, el) => {
      const $item = $(el);
      const href =
        $item.attr("href") ||
        $item.find(".video-serial").attr("href") ||
        $item.find(".module-item-pic a").attr("href") ||
        $item.find('a[href*="/voddetail/"]').attr("href") ||
        $item.find('a[href*="/vod/detail/"]').attr("href") ||
        $item.find(".module-item-title").attr("href");
      const vodName = (
        $item.attr("title") ||
        $item.find(".video-title").text() ||
        $item.find(".video-serial").attr("title") ||
        $item.find(".module-item-pic img").attr("alt") ||
        $item.find(".module-item-title").attr("title") ||
        $item.find(".module-poster-item-title").text() ||
        $item.find(".module-item-title").text() ||
        $item.find("h3,h4").first().text() ||
        ""
      )
        .replace(/\s+/g, " ")
        .replace(/^立刻播放|^下载/g, "")
        .trim();
      let vodPic =
        $item.find(".module-item-pic img").attr("data-src") ||
        $item.find(".module-item-pic img").attr("data-original") ||
        $item.find(".module-item-pic img").attr("src") ||
        $item.find("img").first().attr("data-src") ||
        $item.find("img").first().attr("data-original") ||
        $item.find("img").first().attr("src");
      if (vodPic && vodPic.includes("loading.gif")) {
        vodPic =
          $item.find("img").first().attr("data-src") ||
          $item.find("img").first().attr("data-original") ||
          "";
      }
      if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;
      const vodRemarks =
        $item.find(".module-item-text").text().trim() ||
        $item.find(".module-item-note").text().trim() ||
        $item.find(".module-poster-item-note").text().trim() ||
        $item.find(".video-episode").text().trim() ||
        $item.find(".video-serial").text().trim() ||
        "";
      const vodYear = $item.find(".module-item-caption span").first().text().trim();

      if (href && vodName) {
        const vodId = `${site.id}_${href}`;
        if (seen.has(vodId)) return;
        seen.add(vodId);
        videos.push({
          vod_id: vodId,
          vod_name: `[${site.name}] ${vodName}`,
          vod_pic: vodPic || "",
          type_id: "",
          type_name: "",
          vod_remarks: vodRemarks || "",
          vod_year: vodYear || "",
          _source: site.name,
          _site_id: site.id,
          _href: href,
          _original_name: vodName,
        });
      }
    });

    await OmniBox.log("info", `[search] site=${site.name}, page=${page}, hit=${videos.length}`);
    return videos;
  } catch (error) {
    await OmniBox.log("error", `[search] site=${site.name} fail: ${error.message}`);
    return [];
  }
}

// ==================== 搜索合并（多站剧名聚合）====================
// 归一化剧名，用于跨站合并去重。去掉分辨率、年份、备注、季数等干扰后缀。
const MERGE_STRIP_RE = /(第\s*[一二三四五六七八九十百\d]+\s*[季部集]|全\s*\d+\s*集|全集|高清|超清|蓝光|4K|1080P|720P|1080|HD|国语|粤语|中字|中文字幕|英语|日语|韩语|无删减|完整版|抢先版|抢先|TC|BD|WEB.?DL|WEB|DVDRip|HDR|HDR10|修复版|加长版|纪念版|重制版|上译|导演剪辑版|杜比|全景声|无水印)/gi;

// 版本标识词（可用环境变量 MERGE_VERSION_WORDS 扩展，如 “臻彩;杜比”）。
// 聚合时只分两组：不含版本词 => 显示“剧名”；含版本词 => 显示“剧名(版本词)”。
const MERGE_VERSION_WORDS = (process.env.MERGE_VERSION_WORDS || "臻彩,真彩")
  .split(/[;,]/)
  .map((s) => s.trim())
  .filter(Boolean);

function findVersionMarker(title) {
  const s = String(title || "");
  for (const w of MERGE_VERSION_WORDS) {
    if (s.includes(w)) return w;
  }
  return "";
}

// 从字符串中移除所有版本词（如“臻彩”），因为版本词由 #后缀 单独标识
function stripVersionWords(s) {
  let out = String(s || "");
  for (const w of MERGE_VERSION_WORDS) {
    out = out.split(w).join(" ");
  }
  return out;
}

// 用于合并 key：先把所有括号内容、年份、分辨率等噪声及版本词全部去掉得到基础剧名；
// 再根据是否含版本词（如“臻彩”）分成本组 key，保证“江海潮生”与“江海潮生(臻彩)”各成一组
function normalizeMergeTitle(title) {
  let base = String(title || "")
    .replace(/\s+/g, " ")
    .replace(/[（【〔]/g, "(")
    .replace(/[）】〕]/g, ")")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(MERGE_STRIP_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  base = stripVersionWords(base);
  return base.toLowerCase().replace(/\s+/g, "");
}

// 统一展示：所有不含版本词的，不管原名怎么写，一律显示为基础“剧名”；
// 所有包含版本词的，不管原名怎么写，统一显示为“剧名(版本词)”
function cleanMergeDisplayName(title) {
  let base = String(title || "")
    .replace(/\s+/g, " ")
    .replace(/[（【〔]/g, "(")
    .replace(/[）】〕]/g, ")")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(MERGE_STRIP_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  base = stripVersionWords(base);
  // 含任一版本词的统一显示为“剧名(第一个版本词)”，如 MERGE_VERSION_WORDS=臻彩,真彩 => 一律显示 (臻彩)
  const hasVersion = findVersionMarker(title);
  return hasVersion ? `${base}(${MERGE_VERSION_WORDS[0] || "臻彩"})` : base;
}

// 分组展示排序：不带版本标识（无括号）的剧名排前，带版本标识的（如 剧名(臻彩)）排后
function compareMergeDisplayName(a, b) {
  const aHasSuffix = a.vod_name.includes("(");
  const bHasSuffix = b.vod_name.includes("(");
  if (aHasSuffix !== bHasSuffix) return aHasSuffix ? 1 : -1;
  return 0;
}

function b64UrlEncode(str) {
  return Buffer.from(String(str), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64UrlDecode(str) {
  let base64 = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  return Buffer.from(base64 + pad, "base64").toString("utf8");
}

function encodeMergeId(matches) {
  const payload = matches.map((m) => [m.siteId, m.href]);
  return MERGE_PREFIX + b64UrlEncode(JSON.stringify(payload));
}

function decodeMergeId(vodId) {
  if (!String(vodId || "").startsWith(MERGE_PREFIX)) return null;
  try {
    const encoded = String(vodId).slice(MERGE_PREFIX.length);
    const payload = JSON.parse(b64UrlDecode(encoded));
    if (!Array.isArray(payload)) return null;
    const matches = payload
      .map(([siteId, href]) => ({ siteId: String(siteId || ""), href: String(href || "") }))
      .filter((m) => m.siteId && m.href);
    return matches.length > 0 ? matches : null;
  } catch (error) {
    return null;
  }
}

// 把各站点搜索结果按归一化剧名合并去重，只返回剧名，并携带所有匹配站点的详情地址
function mergeSearchResults(resultsArrays) {
  const mergedMap = new Map();
  const orderedKeys = [];

for (const arr of resultsArrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const titleRaw = item._original_name || item.vod_name || "";
      if (!titleRaw) continue;
      const marker = findVersionMarker(titleRaw);
      // 含任一版本词的归为同一组（后缀固定，不区分具体是哪个版本词）
      const key = normalizeMergeTitle(titleRaw) + (marker ? "#v" : "");
      if (!key) continue;
      const match = { siteId: item._site_id || "", siteName: item._source || "", href: item._href || "" };
      if (!match.siteId || !match.href) continue;

      if (!mergedMap.has(key)) {
        mergedMap.set(key, { vod_name: cleanMergeDisplayName(titleRaw), vod_pic: item.vod_pic || "", vod_year: item.vod_year || "", matches: [], seenMatch: new Set() });
        orderedKeys.push(key);
      }
      const entry = mergedMap.get(key);
      const dedupeKey = `${match.siteId}|${match.href}`;
      if (entry.seenMatch.has(dedupeKey)) continue;
      entry.seenMatch.add(dedupeKey);
      entry.matches.push(match);
      if (!entry.vod_pic && item.vod_pic) entry.vod_pic = item.vod_pic;
      if (!entry.vod_year && item.vod_year) entry.vod_year = item.vod_year;
    }
  }

  const list = [];
  for (const key of orderedKeys) {
    const entry = mergedMap.get(key);
    if (entry.matches.length === 0) continue;
    const matches = MERGE_MAX_SITES > 0 ? entry.matches.slice(0, MERGE_MAX_SITES) : entry.matches;
    list.push({
      vod_id: encodeMergeId(matches),
      vod_name: entry.vod_name,
      vod_pic: entry.vod_pic || "",
      type_id: "",
      type_name: "",
      vod_remarks: `聚合${matches.length}个网站`,
      vod_year: entry.vod_year || "",
    });
  }
  // 展顺序稳定：无版本标识剧名在前，带“(版本)”在后
  list.sort(compareMergeDisplayName);
  return list;
}

function getSiteOrderIndex(siteId) {
  if (PAN_SITE_ORDER.length > 0) {
    const idx = PAN_SITE_ORDER.indexOf(String(siteId || "").toLowerCase());
    return idx === -1 ? 1e9 : idx;
  }
  const idx = SITES.findIndex((s) => s.id === siteId);
  return idx === -1 ? 1e9 : idx;
}

// 网盘链接先按网盘类型排序，再按站点顺序排序（对应“115#木偶,115#玩偶,百度#木偶,百度#多多”）
function compareDriveSitePan(a, b) {
  const idxA = LINE_ORDER.indexOf(a.driveKey);
  const idxB = LINE_ORDER.indexOf(b.driveKey);
  const oa = idxA === -1 ? 1e9 : idxA;
  const ob = idxB === -1 ? 1e9 : idxB;
  if (oa !== ob) return oa - ob;
  return getSiteOrderIndex(a.siteId) - getSiteOrderIndex(b.siteId);
}

async function fetchSiteCategoryList(site, categoryId, page = 1, filters = {}) {
  const url = buildCategoryUrl(site, categoryId, page, filters);
  await OmniBox.log("info", `[category] site=${site.name}, cid=${categoryId}, page=${page}, url=${url}`);

  const { response, baseUrl } = await requestWithFailover(site.domains, url);
  const $ = cheerio.load(response.body);
  const videos = [];

  $(site.listSelector).each((_, el) => {
    const $item = $(el);
    const href =
      $item.attr("href") ||
      $item.find(".module-item-pic a").attr("href") ||
      $item.find('a[href*="/voddetail/"]').attr("href") ||
      $item.find('a[href*="/vod/detail/"]').attr("href") ||
      $item.find(".module-item-title").attr("href");
    const vodName = (
      $item.attr("title") ||
      $item.find(".video-title").text() ||
      $item.find(".module-item-pic img").attr("alt") ||
      $item.find(".module-item-title").attr("title") ||
      $item.find(".module-poster-item-title").text() ||
      $item.find(".module-item-title").text() ||
      $item.find("h3,h4").first().text() ||
      ""
    )
      .replace(/\s+/g, " ")
      .replace(/^立刻播放|^下载/g, "")
      .trim();
    let vodPic =
      $item.find(".module-item-pic img").attr("data-src") ||
      $item.find(".module-item-pic img").attr("data-original") ||
      $item.find(".module-item-pic img").attr("src") ||
      $item.find("img").first().attr("data-src") ||
      $item.find("img").first().attr("data-original") ||
      $item.find("img").first().attr("src");
    if (vodPic && vodPic.includes("loading.gif")) {
      vodPic =
        $item.find("img").first().attr("data-src") ||
        $item.find("img").first().attr("data-original") ||
        "";
    }
    if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;
    const vodRemarks =
      $item.find(".module-item-text").text().trim() ||
      $item.find(".module-item-note").text().trim() ||
      $item.find(".module-poster-item-note").text().trim() ||
      $item.find(".video-episode").text().trim() ||
      $item.find(".video-serial").text().trim() ||
      "";
    const vodYear = $item.find(".module-item-caption span").first().text().trim();

    if (href && vodName) {
      videos.push({
        vod_id: `${site.id}_${href}`,
        vod_name: vodName,
        vod_pic: vodPic || "",
        type_id: categoryId,
        type_name: site.defaultCategories[categoryId] || "",
        vod_remarks: vodRemarks || "",
        vod_year: vodYear || "",
      });
    }
  });

  const totalPages = parseTotalPages($);
  const total = videos.length > 0 ? videos.length * totalPages : 0;
  await OmniBox.log("info", `[category] site=${site.name}, list=${videos.length}, pages=${totalPages}`);
  return { list: videos, total, page, totalPages };
}

async function fetchSiteDetail(site, videoId, options = {}) {
  const { response, baseUrl } = await requestWithFailover(site.domains, videoId, { budgetMs: options.budgetMs });
  const $ = cheerio.load(response.body);

  let vodName =
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    $(".page-title").text().replace(/\s+/g, " ").trim() ||
    $(".video-info-header h1").first().text().replace(/\s+/g, " ").trim() ||
    $(".module-info-heading h1").first().text().replace(/\s+/g, " ").trim() ||
    $(".mobile-detail-title").first().text().replace(/\s+/g, " ").trim() ||
    $(".premium-title").first().text().replace(/\s+/g, " ").trim() ||
    "";
  let vodPic =
    $(".mobile-play .lazyload").attr("data-src") ||
    $(".module-item-pic img,.module-info-poster img,.video-cover img,img.lazyload,img.lazy,.premium-poster img")
      .first()
      .attr("data-src") ||
    $(".module-item-pic img,.module-info-poster img,.video-cover img,img.lazyload,img.lazy,.premium-poster img")
      .first()
      .attr("data-original") ||
    $(".module-item-pic img,.module-info-poster img,.video-cover img,img.lazyload,img.lazy,.premium-poster img")
      .first()
      .attr("src") ||
    "";
  if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;

  let vodYear = "";
  let vodDirector = "";
  let vodActor = "";
  let vodContent = "";

  $(".video-info-itemtitle").each((_, item) => {
    const key = $(item).text();
    const value = $(item).next().find("a").map((_, a) => $(a).text().trim()).get().filter(Boolean).join(", ");
    if (key.includes("剧情")) vodContent = $(item).next().find("p").text().trim();
    else if (key.includes("导演")) vodDirector = value;
    else if (key.includes("主演")) vodActor = value;
    else if (key.includes("年代") || key.includes("年份") || key.includes("上映")) {
      const yearText = $(item).next().text().trim() || value;
      const m = yearText.match(/(19|20)\d{2}/);
      if (m) vodYear = m[0];
    }
  });

  if (!vodContent) {
    vodContent = (
      $(".vod_content,.module-info-introduction,.video-info-content,.module-info-main .module-info-item-content,.detail-desc-text,.premium-plot")
        .last()
        .text() || ""
    )
      .replace(/收起|展开全部|内详/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const infoText = $(".video-info,.module-info-main,.module-info,.premium-meta-grid,.detail-info-premium").text() || "";
  if (!vodYear) {
    const match = infoText.match(/(?:年代|年份|上映)[:：]?\s*(\d{4})/) || infoText.match(/\b(19|20)\d{2}\b/);
    if (match) vodYear = String(match[1] || match[0]).replace(/\D/g, "").slice(0, 4);
  }
  if (!vodDirector) {
    const match = infoText.match(/导演[:：]?\s*([^\n]+?)\s*(主演|年代|备注|剧情|$)/);
    if (match) vodDirector = match[1].replace(/^\/\s*/, "").trim();
  }
  if (!vodActor) {
    const match = infoText.match(/主演[:：]?\s*([^\n]+?)\s*(年代|备注|剧情|导演|$)/);
    if (match) vodActor = match[1].replace(/^\/\s*/, "").trim();
  }

  if (!vodDirector || !vodActor || !vodYear) {
    $(".premium-meta-grid .meta-item").each((_, el) => {
      const label = $(el).find(".m-label").text().trim();
      const value = $(el).find(".m-val").text().trim();
      if (!label || !value) return;
      if (!vodDirector && label.includes("导演")) vodDirector = value;
      if (!vodActor && label.includes("主演")) vodActor = value;
      if (!vodYear && (label.includes("年代") || label.includes("年份") || label.includes("上映"))) {
        const match = value.match(/(19|20)\d{2}/);
        if (match) vodYear = match[0];
      }
    });
  }

  if (!vodYear) {
    $(".premium-tags-top .p-tag").each((_, el) => {
      const match = $(el).text().trim().match(/^(19|20)\d{2}$/);
      if (match) vodYear = match[0];
    });
  }

  const panUrls = extractPanUrlsFromDetail($, site);

  await OmniBox.log("info", `[detail] site=${site.name}, panUrls=${panUrls.length}`);
  return { vodName, vodPic, vodYear, vodDirector, vodActor, vodContent, panUrls };
}

async function processDriveShareURL(shareURL, { vodId, vodName, takeWoniuSlot } = {}) {
  try {
    if (typeof takeWoniuSlot === "function") {
      const requestIndex = takeWoniuSlot();
      if (requestIndex > 0 && WONIU4K_DRIVE_API_DELAY_MS > 0) {
        await sleep(WONIU4K_DRIVE_API_DELAY_MS);
      }
    }

    await OmniBox.log("info", `[detail] 处理网盘链接: ${shareURL}`);

    const driveInfo = await getDriveInfoCached(shareURL);
    const displayName = driveInfo.displayName || "未知网盘";
    await OmniBox.log("info", `[detail] 网盘类型: ${displayName}, driveType: ${driveInfo.driveType}`);

    const fileList = await getRootFileListCached(shareURL);
    if (!Array.isArray(fileList?.files) || fileList.files.length === 0) {
      await OmniBox.log("warn", `[detail] 获取文件列表失败: ${shareURL}`);
      return null;
    }

    await OmniBox.log("info", `[detail] 从分享链接 ${shareURL} 获取文件列表成功,文件数量: ${fileList.files.length}`);

    const allVideoFiles = await getAllVideoFilesCached(shareURL, fileList.files);
    if (allVideoFiles.length === 0) {
      await OmniBox.log("warn", `[detail] 未找到视频文件: ${shareURL}`);
      return null;
    }

    await OmniBox.log("info", `[detail] 递归获取视频文件完成,视频文件数量: ${allVideoFiles.length}`);

    // ==================== 刮削处理（参考木偶.js）====================
    const scrapeKey = `${vodId}@@${encodeURIComponent(shareURL)}`;
    if (ENABLE_SCRAPE) {
      try {
        await OmniBox.log("info", `[detail] 开始执行刮削处理, scrapeKey=${scrapeKey}, 资源名: ${vodName}, 视频文件数: ${allVideoFiles.length}`);

        const videoFilesForScraping = allVideoFiles.map((file) => {
          const fileId = file.fid || file.file_id || "";
          const formattedFileId = fileId ? `${shareURL}|${fileId}|${scrapeKey}` : fileId;
          return {
            ...file,
            fid: formattedFileId,
            file_id: formattedFileId,
          };
        });

        await OmniBox.log("info", `[detail] 文件ID格式转换完成,示例: ${videoFilesForScraping[0]?.fid || "N/A"}`);

        const scrapingResult = await OmniBox.processScraping(scrapeKey, vodName, vodName, videoFilesForScraping);
        await OmniBox.log("info", `[detail] 刮削处理完成,结果: ${JSON.stringify(scrapingResult).substring(0, 200)}`);
      } catch (error) {
        await OmniBox.log("error", `[detail] 刮削处理失败: ${error.message}`);
        if (error.stack) {
          await OmniBox.log("error", `[detail] 刮削错误堆栈: ${error.stack}`);
        }
      }
    }

    // 获取刮削后的元数据（使用独立 scrapeKey，避免多个网盘互相覆盖）
    let scrapeData = null;
    let videoMappings = [];
    let scrapeType = "";

    try {
      await OmniBox.log("info", `[detail] 开始获取元数据, scrapeKey: ${scrapeKey}`);
      const metadata = await OmniBox.getScrapeMetadata(scrapeKey);
      await OmniBox.log("info", `[detail] 获取元数据响应: ${JSON.stringify(metadata).substring(0, 500)}`);

      scrapeData = metadata.scrapeData || null;
      videoMappings = metadata.videoMappings || [];
      scrapeType = metadata.scrapeType || "";

      if (scrapeData) {
        await OmniBox.log("info", `[detail] 获取到刮削数据,标题: ${scrapeData.title || "未知"}, 类型: ${scrapeType || "未知"}, 映射数量: ${videoMappings.length}`);
      } else {
        await OmniBox.log("warn", `[detail] 未获取到刮削数据,映射数量: ${videoMappings.length}`);
      }
    } catch (error) {
      await OmniBox.log("error", `[detail] 获取元数据失败: ${error.message}`);
      if (error.stack) {
        await OmniBox.log("error", `[detail] 获取元数据错误堆栈: ${error.stack}`);
      }
    }

    return { shareURL, displayName, driveInfo, allVideoFiles, scrapeData, videoMappings, scrapeType, scrapeKey };
  } catch (error) {
    await OmniBox.log("error", `[detail] 处理网盘链接失败: ${shareURL}, 错误: ${error.message}`);
    return null;
  }
}

// 把单个网盘链接的文件组装成播放集（线路名使用 displayLabel）
function buildEpisodesForLabel(result, displayLabel, effectiveSourceNamesConfig) {
  const { shareURL, driveInfo, allVideoFiles, scrapeData, videoMappings, scrapeKey } = result;
  const sourceOut = [];

  let sourceNames = [displayLabel];
  if (DRIVE_TYPE_CONFIG.includes(driveInfo.driveType)) {
    sourceNames = [...effectiveSourceNamesConfig];
    OmniBox.log("info", `${displayLabel} 匹配成功,线路设置为: ${sourceNames.join(", ")}`);
  }

  for (const sourceName of sourceNames) {
    const episodes = [];
    for (const file of allVideoFiles) {
      let fileName = file.file_name || "";
      const fileId = file.fid || "";
      const fileSize = file.size || file.file_size || 0;
      if (!fileName || !fileId) continue;

      const formattedFileId = `${shareURL}|${fileId}|${scrapeKey}`;
      let matchedMapping = null;

      if (scrapeData && Array.isArray(videoMappings) && videoMappings.length) {
        for (const mapping of videoMappings) {
          if (mapping && mapping.fileId === formattedFileId) {
            matchedMapping = mapping;
            const newFileName = buildScrapedFileName(scrapeData, mapping, fileName);
            if (newFileName && newFileName !== fileName) {
              fileName = newFileName;
            }
            break;
          }
        }
      }

      let displayFileName = fileName;
      if (fileSize > 0) {
        const sizeStr = formatFileSize(fileSize);
        if (sizeStr) displayFileName = `[${sizeStr}] ${fileName}`;
      }

      const encodedDanmakuName = encodeURIComponent(fileName);
      const episode = { name: displayFileName, playId: `${formattedFileId}|${encodedDanmakuName}` };
      if (fileSize > 0) episode.size = fileSize;
      if (matchedMapping) {
        if (matchedMapping.seasonNumber !== undefined) episode._seasonNumber = matchedMapping.seasonNumber;
        if (matchedMapping.episodeNumber !== undefined) episode._episodeNumber = matchedMapping.episodeNumber;
        if (matchedMapping.episodeName) episode.episodeName = matchedMapping.episodeName;
        if (matchedMapping.episodeOverview) episode.episodeOverview = matchedMapping.episodeOverview;
        if (matchedMapping.episodeAirDate) episode.episodeAirDate = matchedMapping.episodeAirDate;
        if (matchedMapping.episodeStillPath) episode.episodeStillPath = matchedMapping.episodeStillPath;
        if (matchedMapping.episodeVoteAverage !== undefined) episode._episodeVoteAverage = matchedMapping.episodeVoteAverage;
        if (matchedMapping.episodeRuntime !== undefined) episode._episodeRuntime = matchedMapping.episodeRuntime;
      }
      episodes.push(episode);
    }

    if (scrapeData && episodes.some((ep) => ep._episodeNumber !== undefined)) {
      episodes.sort((a, b) => {
        const seasonA = a._seasonNumber ?? 0;
        const seasonB = b._seasonNumber ?? 0;
        if (seasonA !== seasonB) return seasonA - seasonB;
        return (a._episodeNumber ?? 0) - (b._episodeNumber ?? 0);
      });
    }

    if (episodes.length > 0) {
      let finalSourceName = sourceName;
      if (DRIVE_TYPE_CONFIG.includes(driveInfo.driveType)) {
        finalSourceName = `${displayLabel}-${sourceName}`;
      }
      sourceOut.push({ name: finalSourceName, episodes });
    }
  }
  return sourceOut;
}

// 用刮削元数据补充详情字段
function applyScrapeMetadataToDetail(target, scrapeData) {
  if (!scrapeData) return;
  if (scrapeData.title) target.vodName = scrapeData.title;
  if (scrapeData.posterPath) target.vodPic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
  if (scrapeData.releaseDate) target.vodYear = scrapeData.releaseDate.substring(0, 4);
  if (scrapeData.overview) target.vodContent = scrapeData.overview;
  if (scrapeData.credits) {
    if (Array.isArray(scrapeData.credits.cast) && scrapeData.credits.cast.length) {
      target.vodActor = scrapeData.credits.cast.slice(0, 5).map((c) => c.name).filter(Boolean).join(",");
    }
    if (Array.isArray(scrapeData.credits.crew) && scrapeData.credits.crew.length) {
      const directors = scrapeData.credits.crew.filter((c) => c.job === "Director" || c.department === "Directing");
      if (directors.length) target.vodDirector = directors.slice(0, 3).map((d) => d.name).filter(Boolean).join(",");
    }
  }
}

async function handleSiteDetail(vodId, drives, context) {
  const parts = String(vodId).split("_");
  const siteId = parts[0];
  const rawId = parts.slice(1).join("_");
  const site = SITES.find((s) => s.id === siteId);
  if (!site) return null;

  const { vodName, vodPic, vodYear, vodDirector, vodActor, vodContent, panUrls } = await fetchSiteDetail(site, rawId);

  const panItems = panUrls.map((panUrl) => ({ url: panUrl, driveKey: detectDriveKey(panUrl) }));
  panItems.sort((a, b) => compareDriveKeyOrder(a.driveKey, b.driveKey));

  let playSources = [];
  const driveTypeCountMap = {};
  for (const { url: shareURL } of panItems) {
    const driveInfo = await getDriveInfoCached(shareURL);
    const displayName = driveInfo.displayName || "未知网盘";
    driveTypeCountMap[displayName] = (driveTypeCountMap[displayName] || 0) + 1;
  }

  // ==================== 限并发处理网盘链接 ====================
  const detailConcurrency = site.id === "woniu4k" ? 1 : 4;
  let woniuRequestIndex = 0;
  const driveResults = await runWithConcurrency(panItems.map(item => item.url), detailConcurrency, (shareURL) =>
    processDriveShareURL(shareURL, {
      vodId,
      vodName,
      takeWoniuSlot: site.id === "woniu4k" ? () => woniuRequestIndex++ : null,
    })
  );

  // 同网盘类型多个链接时加序号（115 / 1152），再拼上站点名 => “115#玩偶”
  const driveTypeCurrentIndexMap = {};
  const labeledResults = driveResults.map((result) => {
    if (!result) return null;
    const total = driveTypeCountMap[result.displayName] || 0;
    let displayName = result.displayName;
    if (total > 1) {
      driveTypeCurrentIndexMap[result.displayName] = (driveTypeCurrentIndexMap[result.displayName] || 0) + 1;
      displayName = `${result.displayName}${driveTypeCurrentIndexMap[result.displayName]}`;
    }
    return { ...result, displayName };
  });

  const metadata = { vodName, vodPic, vodYear, vodDirector, vodActor, vodContent };

  // 播放线路与 SOURCE_NAMES_CONFIG 完全一致（夸克/UC 等多线路网盘按该变量生成线路，不再因 web 过滤）
  const effectiveSourceNamesConfig = [...SOURCE_NAMES_CONFIG];

  for (const result of labeledResults) {
    if (!result) continue;
    const displayLabel = `${result.displayName}#${site.name}`;
    playSources.push(...buildEpisodesForLabel(result, displayLabel, effectiveSourceNamesConfig));
    applyScrapeMetadataToDetail(metadata, result.scrapeData);
  }

  // 按网盘类型优先级排序播放源
  if (Array.isArray(playSources) && playSources.length > 1 && DRIVE_ORDER.length > 0) {
    const sortedSources = sortPlaySourcesByDriveOrder(playSources);
    await OmniBox.log("info", `[detail] 按 DRIVE_ORDER 排序后线路顺序: ${sortedSources.map(item => item.name).join(' | ')}`);
    playSources = sortedSources;
  }

  await OmniBox.log("info", `[detail] 构建播放源完成,网盘数量: ${playSources.length}`);

  return {
    vod_id: vodId,
    vod_name: metadata.vodName,
    vod_pic: metadata.vodPic,
    vod_year: metadata.vodYear,
    vod_director: metadata.vodDirector,
    vod_actor: metadata.vodActor,
    vod_content: metadata.vodContent || `网盘资源,共${panUrls.length}个网盘链接`,
    vod_play_sources: playSources.length > 0 ? playSources : undefined,
  };
}

async function handleMergedDetail(vodId, drives, context) {
  const matches = decodeMergeId(vodId);
  if (!matches || matches.length === 0) return null;

  // ==================== 并行抓取所有匹配站点的详情，收集网盘链接 ====================
  const panItems = [];
  const matchedSites = [];
  const metadata = { vodName: "", vodPic: "", vodYear: "", vodDirector: "", vodActor: "", vodContent: "" };
  let totalPanCount = 0;

  const siteDetailResults = await Promise.all(
    matches.map(async (match) => {
      const site = SITES.find((s) => s.id === match.siteId);
      if (!site) return null;
      try {
        return { site, detailData: await fetchSiteDetail(site, match.href, { budgetMs: DETAIL_TIMEOUT_BUDGET_MS }) };
      } catch (error) {
        await OmniBox.log("warn", `[merged-detail] ${site.name} 详情抓取失败: ${error.message}`);
        return null;
      }
    })
  );

  for (const res of siteDetailResults) {
    if (!res || !res.detailData) continue;
    const { site, detailData } = res;
    matchedSites.push(site);
    if (!metadata.vodName) metadata.vodName = detailData.vodName;
    if (!metadata.vodPic) metadata.vodPic = detailData.vodPic;
    if (!metadata.vodYear) metadata.vodYear = detailData.vodYear;
    if (!metadata.vodDirector) metadata.vodDirector = detailData.vodDirector;
    if (!metadata.vodActor) metadata.vodActor = detailData.vodActor;
    if (!metadata.vodContent) metadata.vodContent = detailData.vodContent;

    for (const panUrl of detailData.panUrls) {
      panItems.push({ url: panUrl, driveKey: detectDriveKey(panUrl), siteId: site.id, siteName: site.name });
      totalPanCount++;
    }
  }

  if (totalPanCount === 0 || panItems.length === 0) {
    await OmniBox.log("warn", `[merged-detail] 未找到网盘链接, vodId=${vodId}`);
    return null;
  }

  // 网盘先分类、网站再分类
  panItems.sort(compareDriveSitePan);

  // ==================== 网盘链接去重 ====================
  // 相同分享链接（规范化后）只保留其排序位置靠前的那一个网站，不重复解析、不重复展示其他网站。
  const seenUrl = new Set();
  const dedupedPanItems = [];
  let dedupedPanCount = 0;
  for (const item of panItems) {
    if (seenUrl.has(item.url)) continue;
    seenUrl.add(item.url);
    dedupedPanItems.push(item);
    dedupedPanCount++;
  }
  await OmniBox.log("info", `[merged-detail] 网盘链接去重: ${totalPanCount} -> ${dedupedPanCount}`);

  if (dedupedPanCount === 0) return null;

  // ==================== 限并发解析网盘文件（每种网盘最多保留前 N 条有效链接）====================
  // PAN_MAX_LINKS_PER_DRIVE（默认 3）：某种网盘一旦解析出 N 条有效链接（有视频），
  // 该网盘剩余链接直接跳过不再盘检/刮削，减少耗时；线路也按“每种网盘前 N 条有效”展示。
  const detailConcurrency = matchedSites.some((s) => s.id === "woniu4k") ? 1 : 4;
  let woniuRequestIndex = 0;
  const driveResults = await runWithConcurrencyPerDriveCap(dedupedPanItems, detailConcurrency, PAN_MAX_LINKS_PER_DRIVE, (item) =>
    processDriveShareURL(item.url, {
      vodId,
      vodName: metadata.vodName,
      takeWoniuSlot: item.siteId === "woniu4k" ? () => woniuRequestIndex++ : null,
    })
  );

  // 组装线路名：网盘#网站（同一网盘+同一网站存在多个链接时加序号）=> “115#木偶”
  const labelCountMap = new Map();
  const labeledResults = driveResults.map((result, index) => {
    if (!result) return null;
    const item = dedupedPanItems[index];
    const key = `${result.displayName}\u0000${item.siteName}`;
    const count = (labelCountMap.get(key) || 0) + 1;
    labelCountMap.set(key, count);
    const label = count === 1 ? `${result.displayName}#${item.siteName}` : `${result.displayName}#${item.siteName}${count}`;
    return { ...result, displayName: label };
  });

  let playSources = [];
  // 播放线路与 SOURCE_NAMES_CONFIG 完全一致（夸克/UC 等多线路网盘按该变量生成线路）
  const effectiveSourceNamesConfig = [...SOURCE_NAMES_CONFIG];

  for (const result of labeledResults) {
    if (!result) continue;
    playSources.push(...buildEpisodesForLabel(result, result.displayName, effectiveSourceNamesConfig));
    applyScrapeMetadataToDetail(metadata, result.scrapeData);
  }

  // 按网盘类型优先级排序播放源
  if (Array.isArray(playSources) && playSources.length > 1 && DRIVE_ORDER.length > 0) {
    const sortedSources = sortPlaySourcesByDriveOrder(playSources);
    await OmniBox.log("info", `[merged-detail] 按 DRIVE_ORDER 排序后线路顺序: ${sortedSources.map(item => item.name).join(' | ')}`);
    playSources = sortedSources;
  }

  await OmniBox.log("info", `[merged-detail] 完成, sites=${matchedSites.length}, panLinks=${dedupedPanCount}, sources=${playSources.length}`);

  return {
    vod_id: vodId,
    vod_name: metadata.vodName,
    vod_pic: metadata.vodPic,
    vod_year: metadata.vodYear,
    vod_director: metadata.vodDirector,
    vod_actor: metadata.vodActor,
    vod_content: metadata.vodContent || `聚合${matchedSites.length}个网站,共${dedupedPanCount}个网盘链接`,
    vod_play_sources: playSources.length > 0 ? playSources : undefined,
  };
}

function detectDriveKey(panUrl) {
  const url = String(panUrl || "").toLowerCase();
  if (url.includes("pan.baidu.com")) return "baidu";
  if (url.includes("quark.cn")) return "quark";
  if (url.includes("115.com") || url.includes("115cdn.com") || url.includes("anxia.com")) return "a115";
  if (url.includes("123pan.com")) return "a123";
  if (url.includes("189.cn")) return "a189";
  if (url.includes("139.com")) return "a139";
  if (url.includes("aliyundrive.com") || url.includes("alipan.com")) return "ali";
  if (url.includes("xunlei.com")) return "xunlei";
  if (url.includes("uc.cn")) return "uc";
  return "other";
}

function inferDriveTypeFromSourceName(name = "") {
  const raw = String(name || "").toLowerCase();
  if (raw.includes("百度")) return "baidu";
  if (raw.includes("139")) return "a139";
  if (raw.includes("天翼") || raw.includes("189")) return "a189";
  if (raw.includes("123")) return "a123";
  if (raw.includes("115")) return "a115";
  if (raw.includes("夸克")) return "quark";
  if (raw.includes("迅雷")) return "xunlei";
  if (raw.includes("阿里")) return "ali";
  if (raw === "uc" || raw.includes("uc")) return "uc";
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
    if (aOrder !== bOrder) return aOrder - bOrder;
    return 0;
  });
}

function compareDriveKeyOrder(a, b) {
  const indexA = LINE_ORDER.indexOf(a);
  const indexB = LINE_ORDER.indexOf(b);
  if (indexA === -1 && indexB === -1) return 0;
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
}

/**
 * 工具: 限并发执行任务，避免 detail 中网盘链接过多时瞬时并发过高。
 */
async function runWithConcurrency(items, limit, taskFn) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];

  const results = new Array(list.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= list.length) break;
      results[current] = await taskFn(list[current], current);
    }
  }

  const workerCount = Math.max(1, Math.min(limit || 1, list.length));
  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

/**
 * 工具: 按网盘类型（item.driveKey）限制“有效”结果数量，各网盘组并行处理。
 * 组内顺序解析，成功解析出 perDriveCap 条（有返回结果即视为有效）后停止该网盘剩余链接。
 * 保证每种网盘只保留“前 perDriveCap 条有效链接”；perDriveCap <= 0 时不限制。
 */
async function runWithConcurrencyPerDriveCap(items, limit, perDriveCap, taskFn) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];

  const results = new Array(list.length);

  if (!(perDriveCap > 0)) {
    return runWithConcurrency(list, limit, taskFn);
  }

  // 按网盘分组（保持原顺序）
  const driveOrder = [];
  const driveMap = new Map();
  for (const item of list) {
    const key = item?.driveKey || "";
    if (!driveMap.has(key)) {
      driveMap.set(key, []);
      driveOrder.push(key);
    }
    driveMap.get(key).push(item);
  }

  // 各网盘组并行；组内顺序解析，达到有效上限即停
  await Promise.all(
    driveOrder.map(async (driveKey) => {
      const group = driveMap.get(driveKey);
      let validCount = 0;
      for (let i = 0; i < group.length; i++) {
        if (validCount >= perDriveCap) break;
        const item = group[i];
        const globalIndex = list.indexOf(item);
        const result = await taskFn(item, globalIndex);
        results[globalIndex] = result || null;
        if (result) validCount += 1;
      }
    })
  );

  return results;
}

/**
 * 构建刮削后的文件名（参考木偶.js）
 */
function buildScrapedFileName(scrapeData, mapping, originalFileName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalFileName;
  }

  if (scrapeData && scrapeData.episodes && Array.isArray(scrapeData.episodes)) {
    for (const episode of scrapeData.episodes) {
      if (episode.episodeNumber === mapping.episodeNumber && episode.seasonNumber === mapping.seasonNumber) {
        if (episode.name) {
          return `${episode.episodeNumber}.${episode.name}`;
        }
        break;
      }
    }
  }

  return originalFileName;
}

function buildDanmakuCandidates({ scrapeData, scrapeType = "", matchedMapping = null, fallbackDanmakuFileName = "" }) {
  const candidates = [];
  const seen = new Set();

  const pushCandidate = (value) => {
    const text = String(value || "").trim();
    if (!text) return;
    if (seen.has(text)) return;
    seen.add(text);
    candidates.push(text);
  };

  if (scrapeData) {
    if (scrapeType === "movie") {
      pushCandidate(scrapeData.title || "");
      if (scrapeData.title && scrapeData.releaseDate) {
        pushCandidate(`${scrapeData.title}.${String(scrapeData.releaseDate).slice(0, 4)}`);
      }
    } else if (matchedMapping) {
      const title = scrapeData.title || "";
      const seasonAirYear = scrapeData.seasonAirYear || "";
      const seasonNumber = matchedMapping.seasonNumber || 1;
      const episodeNum = matchedMapping.episodeNumber || 1;
      pushCandidate(`${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`);
      pushCandidate(`${title}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`);
      if (matchedMapping.episodeName) {
        pushCandidate(`${title}.${matchedMapping.episodeName}`);
      }
    }
  }

  if (fallbackDanmakuFileName) {
    pushCandidate(decodeURIComponent(fallbackDanmakuFileName));
  }

  return candidates;
}

async function matchDanmakuByCandidates(candidates = []) {
  for (const fileName of candidates) {
    try {
      const danmakuList = await OmniBox.getDanmakuByFileName(fileName);
      if (Array.isArray(danmakuList) && danmakuList.length > 0) {
        await OmniBox.log("info", `[danmaku] matched ${fileName}, count=${danmakuList.length}`);
        return danmakuList;
      }
    } catch (error) {
      await OmniBox.log("warn", `[danmaku] candidate fail ${fileName}: ${error.message}`);
    }
  }
  return [];
}

// ==================== OmniBox handlers ====================
// ==================== 蜗牛4K 登录 ====================

function getWoniuBaseUrl() {
  return removeTrailingSlash(WONIU4K_SITES[0] || "");
}

function resolveSiteUrl(value, baseUrl) {
  if (!value) return "";
  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return "";
  }
}

async function login(params) {
  const username = String(params?.username || WONIU4K_USERNAME || "").trim();
  const password = String(params?.password || WONIU4K_PASSWORD || "").trim();
  const captchaCode = String(params?.captcha || params?.verify || "").trim();
  const baseUrl = getWoniuBaseUrl();

  if (!baseUrl) return { code: -1, msg: "蜗牛4K 站点未配置" };
  if (!username || !password) {
    await OmniBox.log("warn", "[woniu4k] 登录失败: 请设置 WONIU4K_USERNAME / WONIU4K_PASSWORD");
    return { code: -1, msg: "用户名或密码未配置" };
  }

  try {
    const loginPage = await httpRequest(`${baseUrl}/user/login/`, { timeout: 15000 });
    const $ = cheerio.load(loginPage.body || "");
    const hasVerify = $("#verify").length > 0 || $("#verify_img").length > 0;
    if (hasVerify && !captchaCode) {
      const verifyUrl = resolveSiteUrl($("#verify_img").attr("src") || "", baseUrl);
      return { code: -2, msg: "需要验证码", verifyUrl, verifyImg: verifyUrl };
    }

    const formData = new URLSearchParams();
    formData.append("user_name", username);
    formData.append("user_pwd", password);
    if (captchaCode) formData.append("verify", captchaCode);

    const response = await httpRequest(`${baseUrl}/user/login.html`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${baseUrl}/user/login/`,
      },
      body: formData.toString(),
      timeout: 15000,
    });

    try {
      return JSON.parse(response.body || "{}");
    } catch {
      return { code: 0, msg: "登录响应解析失败" };
    }
  } catch (error) {
    await OmniBox.log("error", `[woniu4k] 登录异常: ${error.message}`);
    return { code: -1, msg: error.message };
  }
}

async function logout() {
  const baseUrl = getWoniuBaseUrl();
  if (!baseUrl) return { code: -1, msg: "蜗牛4K 站点未配置" };
  try {
    await httpRequest(`${baseUrl}/user/logout.html`, { timeout: 10000 });
    clearCookies();
    return { code: 1, msg: "已退出" };
  } catch (error) {
    clearCookies();
    return { code: -1, msg: error.message };
  }
}

async function getLoginStatus() {
  const baseUrl = getWoniuBaseUrl();
  if (!baseUrl) return { loggedIn: false, username: "" };
  try {
    const response = await httpRequest(`${baseUrl}/user/index.html`, { timeout: 10000 });
    const $ = cheerio.load(response.body || "");
    const selector = ".user-name, .user-info-name, .header-user-name";
    const loggedIn = response.body.includes("退出登录") || $(selector).length > 0;
    const username = loggedIn ? ($(selector).first().text().trim() || "已登录") : "";
    return { loggedIn, username };
  } catch {
    return { loggedIn: false, username: "" };
  }
}

// ==================== 接口函数 ====================

async function home(params, context) {
  try {
    await OmniBox.log("info", `[home] start, sites=${SITES.length}`);

    const classList = SITES.map((site) => ({ type_id: `site_${site.id}`, type_name: site.name }));

    const filters = {};
    const filterResults = await Promise.all(
      SITES.map(async (site) => ({ siteId: site.id, filters: buildSiteFilters(site, await fetchExternalFilterConfig(site)) }))
    );
    for (const item of filterResults) {
      filters[`site_${item.siteId}`] = item.filters;
    }

    const recommendResults = await Promise.all(
      SITES.slice(0, 3).map(async (site) => {
        try {
          const firstCategory = Object.keys(site.defaultCategories)[0] || "1";
          const result = await fetchSiteCategoryList(site, firstCategory, 1);
          return result.list.slice(0, 4);
        } catch (error) {
          await OmniBox.log("warn", `[home] recommend fail ${site.name}: ${error.message}`);
          return [];
        }
      })
    );

    const recommendList = recommendResults.flat().slice(0, 12);
    await OmniBox.log("info", `[home] class=${classList.length}, recommend=${recommendList.length}`);
    return { class: classList, list: recommendList, filters };
  } catch (error) {
    await OmniBox.log("error", `[home] ${error.message}`);
    return { class: [], list: [], filters: {} };
  }
}

async function category(params, context) {
  try {
    const typeId = params.categoryId || "";
    const page = parseInt(params.page || "1", 10);
    const filters = params.filters || {};
    await OmniBox.log("info", `[category] typeId=${typeId}, page=${page}, filters=${JSON.stringify(filters)}`);

    if (!typeId.startsWith("site_")) {
      return { list: [], page: 1, pagecount: 0, total: 0 };
    }

    const siteId = typeId.replace("site_", "");
    const site = SITES.find((s) => s.id === siteId);
    if (!site) {
      return { list: [], page: 1, pagecount: 0, total: 0 };
    }

    const externalFilterConfig = await fetchExternalFilterConfig(site);
    const siteFilters = buildSiteFilters(site, externalFilterConfig);

    let categoryId = filters.categoryId || "";
    const categories = Object.keys(site.defaultCategories);
    if (!categoryId && categories.length > 0) {
      categoryId = categories[0];
      await OmniBox.log("info", `[category] default categoryId=${categoryId}`);
    }
    if (!categoryId) {
      return { list: [], page: 1, pagecount: 0, total: 0, filters: siteFilters };
    }

    const categoryFilters = { ...filters };
    delete categoryFilters.categoryId;
    const result = await fetchSiteCategoryList(site, categoryId, page, categoryFilters);
    const pagecount = result.totalPages || Math.ceil(result.total / PAGE_SIZE) || 1;
    await OmniBox.log("info", `[category] return page=${page}, pagecount=${pagecount}, total=${result.total}`);
    return { list: result.list, page, pagecount, total: result.total, filters: siteFilters };
  } catch (error) {
    await OmniBox.log("error", `[category] ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0 };
  }
}

async function detail(params, context) {
  try {
    const videoId = params.videoId || "";
    const drives = context?.drives || [];
    await OmniBox.log("info", `[detail] videoId=${videoId}`);
    if (!videoId) return { list: [] };
    const data = String(videoId).startsWith(MERGE_PREFIX)
      ? await handleMergedDetail(videoId, drives, context)
      : await handleSiteDetail(videoId, drives, context);
    return { list: data ? [data] : [] };
  } catch (error) {
    await OmniBox.log("error", `[detail] ${error.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = params.keyword || "";
    const page = parseInt(params.page || "1", 10);
    await OmniBox.log("info", `[search] keyword=${keyword}, page=${page}`);
    if (!keyword) return { list: [], page: 1, pagecount: 0, total: 0 };

    const resultsArrays = await Promise.all(
      SITES.map((site) => fetchSiteSearch(site, keyword, page, { budgetMs: SEARCH_TIMEOUT_BUDGET_MS }))
    );
    const allResults = mergeSearchResults(resultsArrays);
    await OmniBox.log("info", `[search] mergedTotal=${allResults.length}`);
    return { list: allResults, page, pagecount: 1, total: allResults.length };
  } catch (error) {
    await OmniBox.log("error", `[search] ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0 };
  }
}

async function play(params, context) {
  try {
    const playId = params.playId || "";
    const flag = params.flag || "";
    const from = context?.from || "web";
    const drives = context?.drives || [];
    await OmniBox.log("info", `[play] flag=${flag}, playId=${playId}`);

    if (!playId) return { urls: [], header: {}, danmaku: [] };

    if (playId.startsWith("link://")) {
      const baseId = playId.split("?")[0];
      const match = baseId.match(/^link:\/\/([^/]+)\/(.+)$/);
      if (match) {
        const [, driveKey, encodedUrl] = match;
        const url = decodeURIComponent(encodedUrl);
        const drive = drives.find((o) => o.key === driveKey);
        if (drive) {
          try {
            return await drive.play(url, flag);
          } catch (error) {
            return { error: `播放失败: ${error.message}` };
          }
        }
      }
    }

    const parts = playId.split("|");
    if (parts.length < 2) return { urls: [], header: {}, danmaku: [] };

    const shareURL = parts[0];
    const fileId = parts[1];
    const rawScrapeKey = parts[2] || "";
    const fallbackDanmakuFileName = parts[3] ? decodeURIComponent(parts[3]) : "";
    const scrapeKey = rawScrapeKey ? `${rawScrapeKey.split("@@")[0]}@@${encodeURIComponent(shareURL)}` : "";
    
    let routeType = from === "web" ? "服务端代理" : "直连";
    if (flag.includes("-")) {
      const flagParts = flag.split("-");
      routeType = flagParts[flagParts.length - 1];
    }
    await OmniBox.log("info", `[play] 使用线路: ${routeType}`);

    // ==================== 并行处理：主链路(播放地址) + 辅链路(刮削元数据/弹幕) ====================
    const playInfoPromise = OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);
    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: null,
        episodeName: params.episodeName || "",
      };

      if (!scrapeKey) return result;

      try {
        const metadata = await OmniBox.getScrapeMetadata(scrapeKey);
        if (!metadata || !metadata.scrapeData || !Array.isArray(metadata.videoMappings)) {
          await OmniBox.log("warn", `[play] 未获取到有效的刮削元数据`);
          return result;
        }

        const formattedFileId = `${shareURL}|${fileId}|${scrapeKey}`;
        const matchedMapping = metadata.videoMappings.find((mapping) => mapping && mapping.fileId === formattedFileId);
        if (!matchedMapping) {
          await OmniBox.log("warn", `[play] 未找到文件映射: ${formattedFileId}`);
          return result;
        }

        const scrapeData = metadata.scrapeData;
        result.scrapeTitle = scrapeData.title || "";
        if (scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
        }

        if (matchedMapping.episodeNumber) {
          result.episodeNumber = matchedMapping.episodeNumber;
        }
        if (matchedMapping.episodeName && !result.episodeName) {
          result.episodeName = matchedMapping.episodeName;
        }

        // 生成 fileName 用于弹幕匹配（参考木偶.js）
        let fileName = "";
        const scrapeType = metadata.scrapeType || "";
        if (scrapeType === "movie") {
          fileName = scrapeData.title || "";
        } else {
          const title = scrapeData.title || "";
          const seasonAirYear = scrapeData.seasonAirYear || "";
          const seasonNumber = matchedMapping.seasonNumber || 1;
          const episodeNum = matchedMapping.episodeNumber || 1;
          fileName = `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
        }

        if (fileName) {
          await OmniBox.log("info", `[play] 生成fileName用于弹幕匹配: ${fileName}`);
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
          if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
            result.danmakuList = matchedDanmaku;
            await OmniBox.log("info", `[play] 弹幕匹配成功,找到 ${matchedDanmaku.length} 条弹幕`);
          }
        }
      } catch (error) {
        await OmniBox.log("warn", `[play] 弹幕匹配失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);

    if (playInfoResult.status !== "fulfilled") {
      throw new Error(playInfoResult.reason && playInfoResult.reason.message ? playInfoResult.reason.message : "无法获取播放地址");
    }

    const playInfo = playInfoResult.value;
    if (!playInfo || !playInfo.url || !Array.isArray(playInfo.url) || playInfo.url.length === 0) {
      throw new Error("无法获取播放地址");
    }

    let danmakuList = [];
    let scrapeTitle = "";
    let scrapePic = "";
    let episodeNumber = null;
    let episodeName = params.episodeName || "";

    if (metadataResult.status === "fulfilled" && metadataResult.value) {
      danmakuList = metadataResult.value.danmakuList || [];
      scrapeTitle = metadataResult.value.scrapeTitle || "";
      scrapePic = metadataResult.value.scrapePic || "";
      episodeNumber = metadataResult.value.episodeNumber || null;
      episodeName = metadataResult.value.episodeName || episodeName;
    } else if (metadataResult.status === "rejected") {
      await OmniBox.log("warn", `[play] 获取元数据失败(不影响播放): ${metadataResult.reason && metadataResult.reason.message ? metadataResult.reason.message : metadataResult.reason}`);
    }

    // ==================== 添加观看记录（参考木偶.js）====================
    try {
      const sourceId = context.sourceId;
      if (sourceId) {
        const dedupeKey = `${sourceId}|${playId}`;
        const now = Date.now();
        const lastAdded = playHistoryDedupeCache.get(dedupeKey);
        if (lastAdded && now - lastAdded < 2000) {
          await OmniBox.log("info", `[play] 跳过重复观看记录: ${dedupeKey}`);
        } else {
          playHistoryDedupeCache.set(dedupeKey, now);
          const title = params.title || scrapeTitle || shareURL;
          const pic = params.pic || scrapePic || "";

          OmniBox.addPlayHistory({
            vodId: scrapeKey,
            title: title,
            pic: pic,
            episode: playId,
            sourceId: sourceId,
            episodeNumber: episodeNumber,
            episodeName: episodeName,
          })
            .then((added) => {
              if (added) {
                OmniBox.log("info", `[play] 已添加观看记录: ${title}`);
              } else {
                OmniBox.log("info", `[play] 观看记录已存在,跳过添加: ${title}`);
              }
            })
            .catch((error) => {
              OmniBox.log("warn", `[play] 添加观看记录失败: ${error.message}`);
            });
        }
      }
    } catch (error) {
      await OmniBox.log("warn", `[play] 添加观看记录失败: ${error.message}`);
    }

    const urls = playInfo.url.map((item) => ({ name: item.name || "播放", url: item.url }));
    const header = playInfo.header || {};
    const finalDanmakuList = danmakuList.length > 0 ? danmakuList : playInfo.danmaku || [];

    await OmniBox.log("info", `[play] urls=${urls.length}, danmaku=${finalDanmakuList.length}, scrape=${ENABLE_SCRAPE ? "on" : "off"}`);
    return {
      urls,
      header: header,
      parse: 0,
      danmaku: finalDanmakuList};
  } catch (error) {
    await OmniBox.log("error", `[play] ${error.message}`);
    return { urls: [], header: {}, danmaku: [] };
  }
}

});
