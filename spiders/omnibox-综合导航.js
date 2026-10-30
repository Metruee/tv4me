// @name 综合导航(合并)
// @version 3.20261030.1219
// @description 自动同步：综合导航
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-综合导航.js
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


_load(0, "MakkaPakka聚合导航", function (module, exports, require) {
// @name MakkaPakka聚合导航
// @author 梦
// @description 基于 AstrBot Widget 通用桥接的 OmniBox 导航源，动态读取远端 Widget Metadata 与模块函数，支持顶部集中配置与详细外部请求日志
// @indexs 1
// @dependencies: cheerio
// @version 1.1.3
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/导航/MakkaPakka聚合导航.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const vm = require("vm");
const cheerio = require("cheerio");

/* ==================== 配置区域开始 ====================
 * 说明：
 * 1. 所有可配置项统一前置，便于快速维护。
 * 2. 支持环境变量覆盖的配置优先放最前面，部署时可直接修改环境变量而无需改脚本。
 * 3. 若未设置环境变量，则自动回退到本文件内的默认值。
 * 4. 下方“固定默认配置”通常无需频繁修改，仅在结构或展示策略调整时再改。
 * ==================== 配置区域结束 ==================== */

// ===== 支持环境变量覆盖的配置（优先级最高） =====
// Widget 源地址：支持环境变量覆盖，默认走 gh-proxy 直链，避免 raw 域名在部分环境下不稳定。
const WIDGET_URL =
  process.env.MAKKA_WIDGET_URL ||
  "https://gh-proxy.org/raw.githubusercontent.com/MakkaPakka518/FW/refs/heads/main/widgets/mk-2.0/MakkaPakka-ALL.js";
// Widget 请求超时时间（毫秒）。
const REQUEST_TIMEOUT_MS = parseInt(process.env.MAKKA_WIDGET_TIMEOUT_MS || "20000", 10);
// Widget 源缓存 TTL（毫秒）。
const CACHE_TTL_MS = parseInt(process.env.MAKKA_WIDGET_CACHE_MS || "1800000", 10);
// TMDB API 基础地址。
const TMDB_API_BASE_URL =
  process.env.TMDB_API_BASE_URL ||
  "https://api.tmdb.org/3";
// TMDB 令牌 / Key：按兼容优先级依次读取。
const TMDB_BEARER_TOKEN = (process.env.TMDB_BEARER_TOKEN || "").trim();
const TMDB_AUTH_TOKEN = (process.env.TMDB_AUTH_TOKEN || "").trim();
const TMDB_ACCESS_TOKEN = (process.env.TMDB_ACCESS_TOKEN || "").trim();
const TMDB_API_KEY = (process.env.TMDB_API_KEY || "").trim();
const TMDB_KEY = (process.env.TMDB_KEY || "").trim();
// 外部请求日志里 body 预览的最大长度。
const EXTERNAL_LOG_BODY_LIMIT = parseInt(process.env.MAKKA_EXTERNAL_LOG_BODY_LIMIT || "400", 10);
// 是否打印更详细的外部响应体预览：1 开启，0 关闭。
const ENABLE_VERBOSE_EXTERNAL_LOG =
  String(process.env.MAKKA_VERBOSE_EXTERNAL_LOG || "1") === "1";

// ===== 固定默认配置 =====
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "text/plain,application/javascript,application/json,text/html,*/*",
};

// ===== 配置区域结束 =====

const state = {
  loadedAt: 0,
  scriptText: "",
  widgetMetadata: null,
  sandbox: null,
};

module.exports = {
  home,
  category,
};

runner.run(module.exports);

async function home(params, context) {
  await safeLog("info", `Makka导航 home 开始: params=${safeJson(params)}`);

  try {
    const widget = await loadWidgetRuntime();
    const modules = getModules(widget.widgetMetadata);
    await safeLog("info", `Makka导航 home 模块数: ${modules.length}`);

    const classes = modules.map((mod, index) => ({
      type_id: mod.functionName || `module_${index + 1}`,
      type_name: stripEmoji(mod.title || mod.functionName || `栏目${index + 1}`),
    }));

    const filters = {};
    for (const mod of modules) {
      const categoryId = mod.functionName;
      const paramDefs = normalizeParamDefs(mod.params || []);
      const filterList = [];
      for (const param of paramDefs) {
        if (param.type === "page") continue;
        if (param.type !== "enumeration" && param.type !== "input") continue;
        if (!param.name) continue;

        const filterItem = {
          key: param.name,
          name: buildFilterName(param),
          init: param.value !== undefined ? String(param.value) : "",
          value: [],
        };

        if (param.type === "enumeration") {
          const options = Array.isArray(param.enumOptions) ? param.enumOptions : [];
          filterItem.value = options.map((item) => ({
            name: String(item.title || item.name || item.value || ""),
            value: String(item.value ?? item.title ?? item.name ?? ""),
          }));
        } else {
          filterItem.value = [
            {
              name: String(param.title || param.name),
              value: filterItem.init,
            },
          ];
        }

        filterList.push(filterItem);
      }
      filters[categoryId] = filterList;
    }

    let list = [];
    for (const mod of modules) {
      const categoryId = mod.functionName;
      const initialParams = buildModuleParams(mod, 1, {});
      await safeLog("info", `Makka导航 home 模块尝试: categoryId=${categoryId} callParams=${safeJson(initialParams)}`);
      const items = await callWidgetModule(widget, categoryId, initialParams);
      const mapped = mapWidgetItemsToOmniBox(items, categoryId, mod, context);
      await safeLog(
        "info",
        `Makka导航 home 模块结果: categoryId=${categoryId} raw=${Array.isArray(items) ? items.length : 0} mapped=${mapped.length}`,
      );
      if (mapped.length > 0) {
        list = mapped;
        break;
      }
    }

    return {
      class: classes,
      filters,
      list,
    };
  } catch (error) {
    await logErrorWithStack("Makka导航 home 失败", error);
    return {
      class: [],
      filters: {},
      list: [
        buildTextVod({
          title: "导航初始化失败",
          description: error.message,
          typeName: "提示",
        }),
      ],
    };
  }
}

async function category(params, context) {
  const page = toPositiveInt(params.page, 1);
  const categoryId = String(params.categoryId || "").trim();
  const filterValues = normalizeFilters(params.filters);

  await safeLog(
    "info",
    `Makka导航 category 开始: categoryId=${categoryId} page=${page} filters=${safeJson(filterValues)}`,
  );

  try {
    const widget = await loadWidgetRuntime();
    const moduleDef = getModules(widget.widgetMetadata).find(
      (item) => item.functionName === categoryId,
    );

    if (!moduleDef) {
      await safeLog("warn", `Makka导航 category 未找到栏目: categoryId=${categoryId}`);
      return {
        page,
        pagecount: 0,
        total: 0,
        list: [
          buildTextVod({
            title: "未找到对应栏目",
            description: `categoryId=${categoryId}`,
            typeName: "提示",
          }),
        ],
      };
    }

    const callParams = buildModuleParams(moduleDef, page, filterValues);
    await safeLog("info", `Makka导航 category 调用模块: categoryId=${categoryId} callParams=${safeJson(callParams)}`);

    const items = await callWidgetModule(widget, categoryId, callParams);
    const list = mapWidgetItemsToOmniBox(items, categoryId, moduleDef, context);

    const pagecount = list.length < DEFAULT_PAGE_SIZE ? page : page + 1;
    const total = (page - 1) * DEFAULT_PAGE_SIZE + list.length;

    await safeLog(
      "info",
      `Makka导航 category 完成: categoryId=${categoryId} raw=${Array.isArray(items) ? items.length : 0} mapped=${list.length} pagecount=${pagecount} total=${total}`,
    );

    return {
      page,
      pagecount,
      total,
      list,
    };
  } catch (error) {
    await logErrorWithStack(`Makka导航 category 失败(${categoryId})`, error);
    return {
      page,
      pagecount: 0,
      total: 0,
      list: [
        buildTextVod({
          title: "加载失败",
          description: error.message,
          typeName: stripEmoji(categoryId || "提示"),
        }),
      ],
    };
  }
}

async function loadWidgetRuntime(force = false) {
  const now = Date.now();
  if (
    !force &&
    state.sandbox &&
    state.widgetMetadata &&
    state.scriptText &&
    now - state.loadedAt < CACHE_TTL_MS
  ) {
    await safeLog("info", `Makka导航 Widget 命中缓存: ageMs=${now - state.loadedAt} ttlMs=${CACHE_TTL_MS}`);
    return {
      sandbox: state.sandbox,
      widgetMetadata: state.widgetMetadata,
      scriptText: state.scriptText,
    };
  }

  await safeLog("info", `Makka导航 开始拉取 Widget 脚本: url=${WIDGET_URL}`);
  const response = await requestWithLogging("widget-script", WIDGET_URL, {
    method: "GET",
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      ...DEFAULT_HEADERS,
      Referer: "https://github.com/",
    },
  });

  if (response.statusCode !== 200 || !response.body) {
    throw new Error(`拉取 Widget 源失败: HTTP ${response.statusCode}`);
  }

  const scriptText = typeof response.body === "string" ? response.body : String(response.body);
  await safeLog("info", `Makka导航 Widget 脚本长度: ${scriptText.length}`);

  const sandbox = createWidgetSandbox();
  vm.createContext(sandbox);
  try {
    vm.runInContext(scriptText, sandbox, {
      filename: "MakkaPakka-ALL.js",
      timeout: REQUEST_TIMEOUT_MS,
    });
  } catch (error) {
    await logErrorWithStack("Makka导航 Widget 脚本执行失败", error);
    throw error;
  }

  const widgetMetadata = sandbox.WidgetMetadata;
  if (!widgetMetadata || !Array.isArray(widgetMetadata.modules)) {
    throw new Error("WidgetMetadata.modules 缺失或格式异常");
  }

  await safeLog(
    "info",
    `Makka导航 Widget 加载完成: modules=${widgetMetadata.modules.length} title=${widgetMetadata.title || ""}`,
  );

  state.loadedAt = now;
  state.scriptText = scriptText;
  state.sandbox = sandbox;
  state.widgetMetadata = widgetMetadata;

  return { sandbox, widgetMetadata, scriptText };
}

function createWidgetSandbox() {
  const sandbox = {
    console,
    Date,
    Math,
    JSON,
    Promise,
    URL,
    Buffer,
    setTimeout,
    clearTimeout,
    encodeURIComponent,
    decodeURIComponent,
    parseInt,
    parseFloat,
    isNaN,
    process: { env: process.env },
  };

  sandbox.Widget = {
    http: {
      get: async (url, options = {}) => {
        const headers = normalizeHeaders(options.headers || {});
        const res = await requestWithLogging("widget-http-get", url, {
          method: "GET",
          timeout: REQUEST_TIMEOUT_MS,
          headers,
        });
        return {
          status: res.statusCode,
          statusCode: res.statusCode,
          data: typeof res.body === "string" ? res.body : String(res.body || ""),
          body: typeof res.body === "string" ? res.body : String(res.body || ""),
          headers: res.headers || {},
        };
      },
    },
    html: {
      load: (html) => cheerio.load(html || ""),
    },
    tmdb: {
      get: async (endpoint, options = {}) => {
        return await tmdbGet(endpoint, options.params || {});
      },
    },
  };

  return sandbox;
}

async function tmdbGet(endpoint, params = {}) {
  const url = new URL(`${TMDB_API_BASE_URL.replace(/\/$/, "")}/${String(endpoint || "").replace(/^\//, "")}`);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const headers = {
    Accept: "application/json",
    "User-Agent": DEFAULT_HEADERS["User-Agent"],
  };

  const bearer = TMDB_BEARER_TOKEN || TMDB_AUTH_TOKEN || TMDB_ACCESS_TOKEN;
  const apiKey = TMDB_API_KEY || TMDB_KEY;

  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  } else if (apiKey) {
    url.searchParams.set("api_key", apiKey);
  } else {
    throw new Error("TMDB 未配置：请设置 TMDB_API_KEY/TMDB_KEY 或 TMDB_BEARER_TOKEN");
  }

  const res = await requestWithLogging("tmdb", url.toString(), {
    method: "GET",
    timeout: REQUEST_TIMEOUT_MS,
    headers,
  });

  if (res.statusCode !== 200 || !res.body) {
    throw new Error(`TMDB 请求失败: HTTP ${res.statusCode}`);
  }

  const text = typeof res.body === "string" ? res.body : String(res.body);
  try {
    return JSON.parse(text);
  } catch (error) {
    await safeLog("error", `TMDB 返回 JSON 解析失败: url=${url.toString()} bodyPreview=${clipText(text)}`);
    throw error;
  }
}

function getModules(widgetMetadata) {
  const modules = Array.isArray(widgetMetadata?.modules) ? widgetMetadata.modules.slice() : [];
  const shouldMoveLast = (item) => {
    const title = String(item?.title || "").trim();
    const functionName = String(item?.functionName || "").trim();
    return title.includes("动漫全境聚合") || functionName.includes("动漫全境聚合");
  };

  return modules.sort((a, b) => {
    const aLast = shouldMoveLast(a) ? 1 : 0;
    const bLast = shouldMoveLast(b) ? 1 : 0;
    return aLast - bLast;
  });
}

function normalizeParamDefs(params) {
  return Array.isArray(params) ? params : [];
}

function buildFilterName(param) {
  const title = String(param.title || param.name || "筛选");
  if (param.belongTo && param.belongTo.paramName) {
    return `${title}(${param.belongTo.paramName})`;
  }
  return title;
}

function normalizeFilters(filters) {
  if (!filters || typeof filters !== "object") return {};
  const result = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    result[key] = typeof value === "string" ? value : String(value);
  }
  return result;
}

function buildModuleParams(moduleDef, page, filters) {
  const result = {};
  const params = normalizeParamDefs(moduleDef.params || []);

  for (const param of params) {
    if (!param || !param.name) continue;
    if (param.type === "page") {
      result[param.name] = page;
      continue;
    }

    const filterValue = filters[param.name];
    if (filterValue !== undefined && filterValue !== null && filterValue !== "") {
      result[param.name] = filterValue;
      continue;
    }

    if (param.value !== undefined) {
      result[param.name] = param.value;
    }
  }

  if (!Object.prototype.hasOwnProperty.call(result, "page")) {
    result.page = page;
  }

  return result;
}

async function callWidgetModule(widget, functionName, callParams) {
  const fn = widget.sandbox[functionName];
  if (typeof fn !== "function") {
    throw new Error(`Widget 函数不存在: ${functionName}`);
  }

  await safeLog("info", `Makka导航 调用 Widget 函数: functionName=${functionName} params=${safeJson(callParams)}`);

  let result;
  try {
    result = await fn(callParams || {});
  } catch (error) {
    await logErrorWithStack(`Makka导航 Widget 函数执行异常(${functionName})`, error);
    throw error;
  }

  const normalized = Array.isArray(result)
    ? result
    : result && Array.isArray(result.list)
      ? result.list
      : result && Array.isArray(result.items)
        ? result.items
        : [];

  await safeLog(
    "info",
    `Makka导航 Widget 函数完成: functionName=${functionName} resultType=${detectType(result)} normalizedLength=${normalized.length}`,
  );

  return normalized;
}

function mapWidgetItemsToOmniBox(items, categoryId, moduleDef, context) {
  if (!Array.isArray(items)) return [];
  const typeName = stripEmoji(moduleDef?.title || categoryId || "导航");
  return items.map((item, index) => mapSingleItem(item, index, typeName, context)).filter(Boolean);
}

function mapSingleItem(item, index, typeName, context) {
  if (!item || typeof item !== "object") {
    return buildTextVod({
      title: `无效条目 ${index + 1}`,
      description: "返回项不是对象",
      typeName,
    });
  }

  if (String(item.type || "") === "text") {
    return buildTextVod({
      title: item.title || `提示 ${index + 1}`,
      description: item.description || item.desc || "",
      typeName,
    });
  }

  const mediaType = String(item.mediaType || item.type || "");
  const title = String(item.title || item.name || `未命名${index + 1}`);
  const releaseDate = String(item.releaseDate || item.date || "");
  const yearMatch = releaseDate.match(/^(\d{4})/);
  const year = yearMatch ? yearMatch[1] : "";
  const posterPath = normalizePoster(item.posterPath || item.poster || item.vod_pic || "", context);
  const genreTitle = String(item.genreTitle || item.genre || "").trim();
  const subTitle = String(item.subTitle || "").trim();
  const description = String(item.description || item.desc || "").trim();

  let remarks = subTitle || genreTitle || year || "";
  if (!remarks && mediaType) {
    remarks = mediaType === "tv" ? "剧集" : mediaType === "movie" ? "电影" : mediaType;
  }

  return {
    // 保留原始 id / tmdbId，并通过 search 提示宿主走搜索跳转。
    vod_id: String(item.tmdbId || item.id || `${typeName}_${index + 1}`),
    vod_name: title,
    vod_pic: posterPath,
    type_id: String(mediaType || "widget"),
    type_name: typeName,
    vod_year: year,
    vod_remarks: remarks,
    vod_subtitle: genreTitle || subTitle || "",
    vod_content: description,
    vod_douban_score: normalizeScore(item.rating),
    search: true,
    link: buildSearchLink(title),
  };
}

function normalizePoster(url, context) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) return value;
  return value;
}

function buildSearchLink(title) {
  return `https://www.themoviedb.org/search?query=${encodeURIComponent(String(title || ""))}`;
}

function normalizeScore(score) {
  if (score === undefined || score === null || score === "") return "";
  const num = Number(score);
  if (!Number.isFinite(num)) return String(score);
  return num.toFixed(num % 1 === 0 ? 0 : 1);
}

function buildTextVod({ title, description, typeName }) {
  return {
    vod_id: `text_${simpleHash(`${title}|${description}`)}`,
    vod_name: String(title || "提示"),
    vod_pic: "",
    type_id: "text",
    type_name: String(typeName || "提示"),
    vod_year: "",
    vod_remarks: "提示",
    vod_subtitle: "",
    vod_content: String(description || ""),
    search: false,
  };
}

function stripEmoji(text) {
  return String(text || "")
    .replace(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toPositiveInt(value, fallback) {
  const num = parseInt(value, 10);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function simpleHash(input) {
  const text = String(input || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

async function requestWithLogging(tag, url, options = {}) {
  const requestUrl = String(url || "");
  const requestOptions = {
    ...options,
    headers: normalizeHeaders(options.headers || {}),
  };

  await safeLog(
    "info",
    `Makka导航 外部请求开始[${tag}]: url=${requestUrl} method=${requestOptions.method || "GET"} timeout=${requestOptions.timeout || ""} headers=${safeJson(requestOptions.headers)}`,
  );

  try {
    const res = await OmniBox.request(requestUrl, requestOptions);
    const bodyText = typeof res.body === "string" ? res.body : String(res.body || "");
    const contentType = res.headers?.["content-type"] || res.headers?.["Content-Type"] || "";

    if (ENABLE_VERBOSE_EXTERNAL_LOG) {
      await safeLog(
        "info",
        `Makka导航 外部请求完成[${tag}]: url=${requestUrl} status=${res.statusCode} contentType=${contentType} bodyPreview=${clipText(bodyText)}`,
      );
    } else {
      await safeLog(
        "info",
        `Makka导航 外部请求完成[${tag}]: url=${requestUrl} status=${res.statusCode} contentType=${contentType} bodyLength=${bodyText.length}`,
      );
    }

    return res;
  } catch (error) {
    await safeLog(
      "error",
      `Makka导航 外部请求异常[${tag}]: url=${requestUrl} error=${error?.message || String(error)} stack=${clipText(error?.stack || "")}`,
    );
    throw error;
  }
}

function normalizeHeaders(headers) {
  return {
    ...DEFAULT_HEADERS,
    ...(headers || {}),
  };
}

function clipText(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  if (value.length <= EXTERNAL_LOG_BODY_LIMIT) return value;
  return `${value.slice(0, EXTERNAL_LOG_BODY_LIMIT)}...<truncated>`;
}

function detectType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch (_) {
    return '"[unserializable]"';
  }
}

async function logErrorWithStack(prefix, error) {
  await safeLog(
    "error",
    `${prefix}: ${error?.message || String(error)} stack=${clipText(error?.stack || "")}`,
  );
}

async function safeLog(level, message) {
  try {
    await OmniBox.log(level, message);
  } catch (_) {}
}

});

_load(1, "豆瓣推荐", function (module, exports, require) {
// @name 豆瓣推荐
// @indexs 1
// @author lampon
// @description 豆瓣推荐爬虫脚本
// @version 1.0.8
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/导航/豆瓣推荐.js

const OmniBox = require("omnibox_sdk");

// 导出接口
module.exports = {
  home,
  category,
};

// 使用公共 runner 处理标准输入/输出
const runner = require("spider_runner");
runner.run(module.exports);

function buildDoubanSubjectLink(vodId) {
  return `https://movie.douban.com/subject/${vodId}`;
}


/**
 * 获取首页数据
 * @param {Object} params - 参数对象
 * @returns {Object} 返回分类列表和推荐视频列表
 */
async function home(params, context) {
  const sites = await OmniBox.getAnalyzeSites();
  try {
    // 构建分类列表
    const classes = [
      { type_id: "movie", type_name: "选电影" },
      { type_id: "tv", type_name: "选剧集" },
      { type_id: "show", type_name: "选综艺" },
      { type_id: "movie_filter", type_name: "电影筛选" },
      { type_id: "tv_filter", type_name: "电视剧筛选" },
      { type_id: "show_filter", type_name: "综艺筛选" },
    ];

    // 获取Banner数据（直接请求腾讯接口）
    let banner = [];
    try {
      const baseURL = context.baseURL || "";
      const tencentBannerUrl = "https://pbaccess.video.qq.com/trpc.vector_layout.page_view.PageService/getPage?video_appid=3000010&vversion_platform=2";

      // 构建请求体
      const requestData = {
        page_params: {
          page_type: "channel",
          page_id: "100113",
          scene: "channel",
          new_mark_label_enabled: "1",
          vl_to_mvl: "",
          free_watch_trans_info: "{\"ad_frequency_control_time_list\":{}}",
          ad_exp_ids: "100000",
          ams_cookies: "lv_play_index=26; o_minduid=CpGFdExDeM8uP-XHCyma_0PzurMADpcf; appuser=83C1297D3AE9DEFF",
          ad_trans_data: "{\"game_sessions\":[]}",
          skip_privacy_types: "0",
          support_click_scan: "1",
        },
        page_bypass_params: {
          params: {
            platform_id: "2",
            caller_id: "3000010",
            data_mode: "default",
            user_mode: "default",
            specified_strategy: "",
            page_type: "channel",
            page_id: "100113",
            scene: "channel",
            new_mark_label_enabled: "1",
          },
          scene: "channel",
          app_version: "",
          abtest_bypass_id: "aa836e91e1411155",
        },
        page_context: null,
      };

      const tencentBannerResponse = await OmniBox.request(tencentBannerUrl, {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      if (tencentBannerResponse.statusCode === 200 && tencentBannerResponse.body) {
        let tencentBannerBodyStr = typeof tencentBannerResponse.body === "string" ? tencentBannerResponse.body : String(tencentBannerResponse.body);
        const tencentBannerData = JSON.parse(tencentBannerBodyStr);

        // 解析腾讯响应数据，提取轮播图卡片
        if (tencentBannerData.data && tencentBannerData.data.CardList && Array.isArray(tencentBannerData.data.CardList)) {
          for (const cardList of tencentBannerData.data.CardList) {
            // 只处理轮播图类型的卡片
            if (cardList.type === "pc_carousel" && cardList.children_list && cardList.children_list.list && cardList.children_list.list.cards) {
              const cards = cardList.children_list.list.cards;

              for (const card of cards) {
                // 只提取有背景图片的内容（pic_ori_2880x900）
                if (card.params && card.params.pic_ori_2880x900) {
                  // 处理背景图片URL
                  let backgroundImage = card.params.pic_ori_2880x900 || card.params.image_url || "";

                  // 如果图片URL是外部URL，需要通过代理
                  if (backgroundImage && baseURL && !backgroundImage.includes(baseURL) && backgroundImage.startsWith("http")) {
                    const urlWithHeaders = `${backgroundImage}@Referer=https://v.qq.com`;
                    const encodedUrl = encodeURIComponent(urlWithHeaders);
                    backgroundImage = `${baseURL}/api/proxy/image?url=${encodedUrl}`;
                  }

                  // 解析演员信息（从topic_label中提取）
                  let actors = "";
                  if (card.params.topic_label) {
                    const topicLabel = card.params.topic_label;
                    // topic_label格式可能是 "演员1 / 演员2" 或类似格式
                    const parts = topicLabel.split(" / ");
                    if (parts.length > 1) {
                      // 通常演员信息在后面的部分
                      actors = parts.slice(1).join(" / ");
                    } else {
                      actors = topicLabel;
                    }
                  }

                  banner.push({
                    title: card.params.title || card.params.title_pc || "",
                    subtitle: card.params.stitle_pc || card.params.material_video_subtitle || "",
                    backgroundImage: backgroundImage,
                    genre: card.params.main_genre || "",
                    actors: actors,
                    description: card.params.rec_normal_reason || "",
                  });

                  // 最多取5个
                  if (banner.length >= 5) {
                    break;
                  }
                }
              }

              // 如果已经取够5个，跳出外层循环
              if (banner.length >= 5) {
                break;
              }
            }
          }
        }
      }
    } catch (bannerError) {
      // Banner获取失败不影响首页数据返回
      await OmniBox.log("warn", `获取Banner数据失败: ${bannerError.message}`);
    }

    // 构建筛选条件
    // 选电影分类的筛选器
    const filters = {
      movie: [
        // 类型筛选器（category）
        {
          key: "category",
          name: "类型",
          init: "热门", // 默认值
          value: [
            { name: "热门", value: "热门" },
            { name: "最新", value: "最新" },
            { name: "豆瓣高分", value: "豆瓣高分" },
            { name: "冷门佳片", value: "冷门佳片" },
          ],
        },
        // 地区筛选器（type）
        {
          key: "type",
          name: "地区",
          init: "全部", // 默认值
          value: [
            { name: "全部", value: "全部" },
            { name: "华语", value: "华语" },
            { name: "欧美", value: "欧美" },
            { name: "韩国", value: "韩国" },
            { name: "日本", value: "日本" },
          ],
        },
      ],
      // 选剧集的筛选器
      tv: [
        {
          key: "type",
          name: "类型",
          init: "tv", // 默认值：国产剧
          value: [
            { name: "综合", value: "tv" },
            { name: "国产剧", value: "tv_domestic" },
            { name: "欧美剧", value: "tv_american" },
            { name: "日剧", value: "tv_japanese" },
            { name: "韩剧", value: "tv_korean" },
            { name: "动漫", value: "tv_animation" },
            { name: "纪录片", value: "tv_documentary" },
          ],
        },
      ],
      // 选综艺的筛选器
      show: [
        {
          key: "type",
          name: "类型",
          init: "show", // 默认值：综合
          value: [
            { name: "综合", value: "show" },
            { name: "国内", value: "show_domestic" },
            { name: "国外", value: "show_foreign" },
          ],
        },
      ],
      // 电影筛选的筛选器
      movie_filter: [
        // 类型筛选器
        {
          key: "genre",
          name: "类型",
          init: "", // 默认值：全部（空字符串）
          value: [
            { name: "全部", value: "" },
            { name: "喜剧", value: "喜剧" },
            { name: "爱情", value: "爱情" },
            { name: "动作", value: "动作" },
            { name: "科幻", value: "科幻" },
            { name: "动画", value: "动画" },
            { name: "悬疑", value: "悬疑" },
            { name: "犯罪", value: "犯罪" },
            { name: "惊悚", value: "惊悚" },
            { name: "冒险", value: "冒险" },
            { name: "音乐", value: "音乐" },
            { name: "历史", value: "历史" },
            { name: "奇幻", value: "奇幻" },
            { name: "恐怖", value: "恐怖" },
            { name: "战争", value: "战争" },
            { name: "传记", value: "传记" },
            { name: "歌舞", value: "歌舞" },
            { name: "武侠", value: "武侠" },
            { name: "情色", value: "情色" },
            { name: "灾难", value: "灾难" },
            { name: "西部", value: "西部" },
            { name: "纪录片", value: "纪录片" },
            { name: "短片", value: "短片" },
          ],
        },
        // 地区筛选器
        {
          key: "region",
          name: "地区",
          init: "", // 默认值：全部（空字符串）
          value: [
            { name: "全部", value: "" },
            { name: "华语", value: "华语" },
            { name: "欧美", value: "欧美" },
            { name: "韩国", value: "韩国" },
            { name: "日本", value: "日本" },
            { name: "中国大陆", value: "中国大陆" },
            { name: "美国", value: "美国" },
            { name: "中国香港", value: "中国香港" },
            { name: "中国台湾", value: "中国台湾" },
            { name: "英国", value: "英国" },
            { name: "法国", value: "法国" },
            { name: "德国", value: "德国" },
            { name: "意大利", value: "意大利" },
            { name: "西班牙", value: "西班牙" },
            { name: "印度", value: "印度" },
            { name: "泰国", value: "泰国" },
            { name: "俄罗斯", value: "俄罗斯" },
            { name: "加拿大", value: "加拿大" },
            { name: "澳大利亚", value: "澳大利亚" },
            { name: "爱尔兰", value: "爱尔兰" },
            { name: "瑞典", value: "瑞典" },
            { name: "巴西", value: "巴西" },
            { name: "丹麦", value: "丹麦" },
          ],
        },
        // 年代筛选器
        {
          key: "year",
          name: "年代",
          init: "", // 默认值：全部（空字符串）
          value: [
            { name: "全部", value: "" },
            { name: "2026", value: "2026" },
            { name: "2025", value: "2025" },
            { name: "2024", value: "2024" },
            { name: "2023", value: "2023" },
            { name: "2022", value: "2022" },
            { name: "2021", value: "2021" },
            { name: "2020", value: "2020" },
            { name: "2019", value: "2019" },
            { name: "2020年代", value: "2020年代" },
            { name: "2010年代", value: "2010年代" },
            { name: "2000年代", value: "2000年代" },
            { name: "90年代", value: "90年代" },
            { name: "80年代", value: "80年代" },
            { name: "70年代", value: "70年代" },
            { name: "60年代", value: "60年代" },
            { name: "更早", value: "更早" },
          ],
        },
        // 排序筛选器
        {
          key: "sort",
          name: "排序",
          init: "U", // 默认值：热度
          value: [
            { name: "热度", value: "U" },
            { name: "评分", value: "S" },
            { name: "时间", value: "R" },
          ],
        },
      ],
      // 电视剧筛选的筛选器
      tv_filter: [
        // 类型筛选器
        {
          key: "genre",
          name: "类型",
          init: "", // 默认值：全部（空字符串）
          value: [
            { name: "全部", value: "" },
            { name: "喜剧", value: "喜剧" },
            { name: "爱情", value: "爱情" },
            { name: "悬疑", value: "悬疑" },
            { name: "动画", value: "动画" },
            { name: "武侠", value: "武侠" },
            { name: "古装", value: "古装" },
            { name: "家庭", value: "家庭" },
            { name: "犯罪", value: "犯罪" },
            { name: "科幻", value: "科幻" },
            { name: "恐怖", value: "恐怖" },
            { name: "历史", value: "历史" },
            { name: "战争", value: "战争" },
            { name: "动作", value: "动作" },
            { name: "冒险", value: "冒险" },
            { name: "传记", value: "传记" },
            { name: "剧情", value: "剧情" },
            { name: "奇幻", value: "奇幻" },
            { name: "惊悚", value: "惊悚" },
            { name: "灾难", value: "灾难" },
            { name: "歌舞", value: "歌舞" },
            { name: "音乐", value: "音乐" },
          ],
        },
        // 地区筛选器
        {
          key: "region",
          name: "地区",
          init: "", // 默认值：全部（空字符串）
          value: [
            { name: "全部", value: "" },
            { name: "华语", value: "华语" },
            { name: "欧美", value: "欧美" },
            { name: "国外", value: "国外" },
            { name: "韩国", value: "韩国" },
            { name: "日本", value: "日本" },
            { name: "中国大陆", value: "中国大陆" },
            { name: "中国香港", value: "中国香港" },
            { name: "美国", value: "美国" },
            { name: "英国", value: "英国" },
            { name: "泰国", value: "泰国" },
            { name: "中国台湾", value: "中国台湾" },
            { name: "意大利", value: "意大利" },
            { name: "法国", value: "法国" },
            { name: "德国", value: "德国" },
            { name: "西班牙", value: "西班牙" },
            { name: "俄罗斯", value: "俄罗斯" },
            { name: "瑞典", value: "瑞典" },
            { name: "巴西", value: "巴西" },
            { name: "丹麦", value: "丹麦" },
            { name: "印度", value: "印度" },
            { name: "加拿大", value: "加拿大" },
            { name: "爱尔兰", value: "爱尔兰" },
            { name: "澳大利亚", value: "澳大利亚" },
          ],
        },
        // 年代筛选器
        {
          key: "year",
          name: "年代",
          init: "", // 默认值：全部（空字符串）
          value: [
            { name: "全部", value: "" },
            { name: "2026", value: "2026" },
            { name: "2025", value: "2025" },
            { name: "2024", value: "2024" },
            { name: "2023", value: "2023" },
            { name: "2022", value: "2022" },
            { name: "2021", value: "2021" },
            { name: "2020", value: "2020" },
            { name: "2019", value: "2019" },
            { name: "2020年代", value: "2020年代" },
            { name: "2010年代", value: "2010年代" },
            { name: "2000年代", value: "2000年代" },
            { name: "90年代", value: "90年代" },
            { name: "80年代", value: "80年代" },
            { name: "70年代", value: "70年代" },
            { name: "60年代", value: "60年代" },
            { name: "更早", value: "更早" },
          ],
        },
        // 平台筛选器
        {
          key: "platform",
          name: "平台",
          init: "", // 默认值：全部（空字符串）
          value: [
            { name: "全部", value: "" },
            { name: "腾讯视频", value: "腾讯视频" },
            { name: "爱奇艺", value: "爱奇艺" },
            { name: "优酷", value: "优酷" },
            { name: "湖南卫视", value: "湖南卫视" },
            { name: "Netflix", value: "Netflix" },
            { name: "HBO", value: "HBO" },
            { name: "BBC", value: "BBC" },
            { name: "NHK", value: "NHK" },
            { name: "CBS", value: "CBS" },
            { name: "NBC", value: "NBC" },
            { name: "tvN", value: "tvN" },
          ],
        },
        // 排序筛选器
        {
          key: "sort",
          name: "排序",
          init: "U", // 默认值：热度
          value: [
            { name: "热度", value: "U" },
            { name: "评分", value: "S" },
            { name: "时间", value: "R" },
          ],
        },
      ],
      // 综艺筛选的筛选器
      show_filter: [
        // 类型筛选器（只有4个选项）
        {
          key: "genre",
          name: "类型",
          init: "", // 默认值：全部（空字符串）
          value: [
            { name: "全部", value: "" },
            { name: "真人秀", value: "真人秀" },
            { name: "脱口秀", value: "脱口秀" },
            { name: "音乐", value: "音乐" },
            { name: "歌舞", value: "歌舞" },
          ],
        },
        // 地区筛选器（和电视剧筛选一样）
        {
          key: "region",
          name: "地区",
          init: "", // 默认值：全部（空字符串）
          value: [
            { name: "全部", value: "" },
            { name: "华语", value: "华语" },
            { name: "欧美", value: "欧美" },
            { name: "国外", value: "国外" },
            { name: "韩国", value: "韩国" },
            { name: "日本", value: "日本" },
            { name: "中国大陆", value: "中国大陆" },
            { name: "中国香港", value: "中国香港" },
            { name: "美国", value: "美国" },
            { name: "英国", value: "英国" },
            { name: "泰国", value: "泰国" },
            { name: "中国台湾", value: "中国台湾" },
            { name: "意大利", value: "意大利" },
            { name: "法国", value: "法国" },
            { name: "德国", value: "德国" },
            { name: "西班牙", value: "西班牙" },
            { name: "俄罗斯", value: "俄罗斯" },
            { name: "瑞典", value: "瑞典" },
            { name: "巴西", value: "巴西" },
            { name: "丹麦", value: "丹麦" },
            { name: "印度", value: "印度" },
            { name: "加拿大", value: "加拿大" },
            { name: "爱尔兰", value: "爱尔兰" },
            { name: "澳大利亚", value: "澳大利亚" },
          ],
        },
        // 年代筛选器（和电视剧筛选一样）
        {
          key: "year",
          name: "年代",
          init: "", // 默认值：全部（空字符串）
          value: [
            { name: "全部", value: "" },
            { name: "2026", value: "2026" },
            { name: "2025", value: "2025" },
            { name: "2024", value: "2024" },
            { name: "2023", value: "2023" },
            { name: "2022", value: "2022" },
            { name: "2021", value: "2021" },
            { name: "2020", value: "2020" },
            { name: "2019", value: "2019" },
            { name: "2020年代", value: "2020年代" },
            { name: "2010年代", value: "2010年代" },
            { name: "2000年代", value: "2000年代" },
            { name: "90年代", value: "90年代" },
            { name: "80年代", value: "80年代" },
            { name: "70年代", value: "70年代" },
            { name: "60年代", value: "60年代" },
            { name: "更早", value: "更早" },
          ],
        },
        // 平台筛选器（和电视剧筛选一样）
        {
          key: "platform",
          name: "平台",
          init: "", // 默认值：全部（空字符串）
          value: [
            { name: "全部", value: "" },
            { name: "腾讯视频", value: "腾讯视频" },
            { name: "爱奇艺", value: "爱奇艺" },
            { name: "优酷", value: "优酷" },
            { name: "湖南卫视", value: "湖南卫视" },
            { name: "Netflix", value: "Netflix" },
            { name: "HBO", value: "HBO" },
            { name: "BBC", value: "BBC" },
            { name: "NHK", value: "NHK" },
            { name: "CBS", value: "CBS" },
            { name: "NBC", value: "NBC" },
            { name: "tvN", value: "tvN" },
          ],
        },
        // 排序筛选器（和电视剧筛选一样）
        {
          key: "sort",
          name: "排序",
          init: "U", // 默认值：热度
          value: [
            { name: "热度", value: "U" },
            { name: "评分", value: "S" },
            { name: "时间", value: "R" },
          ],
        },
      ],
    };

    // 获取首页推荐列表（选剧集的综合数据）
    let list = [];
    try {
      const tvListUrl = "https://m.douban.com/rexxar/api/v2/subject/recent_hot/tv?start=0&limit=20&category=tv&type=tv";
      const tvListResponse = await OmniBox.request(tvListUrl, {
        method: "GET",
        headers: {
          "Accept": "*/*",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "referer": "https://movie.douban.com/tv/",
        },
      });

      if (tvListResponse.statusCode === 200 && tvListResponse.body) {
        let tvListBodyStr = typeof tvListResponse.body === "string" ? tvListResponse.body : String(tvListResponse.body);
        const tvListData = JSON.parse(tvListBodyStr);

        if (tvListData.items && Array.isArray(tvListData.items)) {
          const baseURL = context.baseURL || "";

          list = tvListData.items.map((item) => {
            // 从 card_subtitle 提取年份信息
            let vod_year = "";
            const cardSubtitle = item.card_subtitle || "";
            const yearMatch = cardSubtitle.match(/^(\d{4})/);
            if (yearMatch) {
              vod_year = yearMatch[1];
            }

            // 构建备注信息
            let vod_remarks = "";
            if (item.episodes_info && item.episodes_info.trim()) {
              vod_remarks = item.episodes_info.trim();
            } else if (item.is_new) {
              vod_remarks = "新剧";
            }


            // 处理图片URL
            let vod_pic = item.pic?.large || item.pic?.normal || "";
            if (vod_pic) {
              const urlWithHeaders = `${vod_pic}@Referer=https://m.douban.com`;
              if (baseURL) {
                const encodedUrl = encodeURIComponent(urlWithHeaders);
                vod_pic = `${baseURL}/api/proxy/image?url=${encodedUrl}`;
              } else {
                vod_pic = urlWithHeaders;
              }
            }

            // 构建副标题（从card_subtitle提取，去除年份部分）
            let vod_subtitle = "";
            if (cardSubtitle) {
              const parts = cardSubtitle.split(" / ");
              if (parts.length > 1) {
                vod_subtitle = parts.slice(1).join(" / ");
              } else {
                vod_subtitle = cardSubtitle;
              }
            }

            return {
              vod_id: item.id || `douban_${item.uri}`,
              link: buildDoubanSubjectLink(item.id || `douban_${item.uri}`),
              vod_name: item.title || "",
              vod_pic: vod_pic,
              type_id: "tv",
              search: true,
              type_name: "选剧集",
              vod_remarks: vod_remarks,
              vod_year: vod_year,
              vod_douban_score: item.rating?.value ? item.rating.value.toString() : "",
              vod_subtitle: vod_subtitle,
            };
          });
        }
      }
    } catch (listError) {
      // 列表获取失败不影响首页数据返回
      await OmniBox.log("warn", `获取首页列表数据失败: ${listError.message}`);
    }

    return {
      class: classes,
      list: list, // 返回选剧集的综合数据
      filters: filters,
      banner: banner, // 返回Banner数据
    };
  } catch (error) {
    return {
      class: [],
      list: [],
      filters: {},
    };
  }
}

/**
 * 获取分类数据
 * @param {Object} params - 参数对象
 *   - categoryId: 分类ID（必填，movie、tv 或 show）
 *   - page: 页码（必填，默认1）
 *   - filters: 筛选条件（可选，JSON对象）
 *     格式：{ "category": "热门", "type": "全部" } 或 { "type": "tv_domestic" }
 * @returns {Object} 返回视频列表
 *   - list: 视频列表
 *   - page: 当前页码
 *   - pagecount: 总页数
 *   - total: 总记录数
 */
async function category(params, context) {
  try {
    const categoryId = params.categoryId || "movie";
    const page = params.page || 1;
    const filters = params.filters || {};
    const limit = 20; // 每页数量
    const start = (page - 1) * limit;
    let url = "";
    let referer = "";

    // 根据分类ID构建不同的请求URL和referer
    if (categoryId === "movie") {
      // 电影分类
      const category = filters.category || "热门";
      const type = filters.type || "全部";
      url = `https://m.douban.com/rexxar/api/v2/subject/recent_hot/movie?start=${start}&limit=${limit}&category=${encodeURIComponent(category)}&type=${encodeURIComponent(type)}`;
      referer = "https://movie.douban.com/explore";
    } else if (categoryId === "tv" || categoryId === "show") {
      // 剧集和综艺使用同一个接口，但category参数不同
      const category = categoryId; // tv 或 show
      const type = filters.type || (categoryId === "tv" ? "tv_domestic" : "show");
      url = `https://m.douban.com/rexxar/api/v2/subject/recent_hot/tv?start=${start}&limit=${limit}&category=${encodeURIComponent(category)}&type=${encodeURIComponent(type)}`;
      referer = categoryId === "tv" ? "https://movie.douban.com/tv/" : "https://movie.douban.com/tv/";
    } else if (categoryId === "movie_filter") {
      // 电影筛选分类
      const genre = filters.genre || ""; // 类型，全部为空字符串
      const region = filters.region || ""; // 地区，全部为空字符串
      const year = filters.year || ""; // 年代，全部为空字符串
      const sort = filters.sort || "U"; // 排序，默认热度

      // 构建 selected_categories JSON
      const selectedCategories = {};
      if (genre) selectedCategories["类型"] = genre;
      if (region) selectedCategories["地区"] = region;
      const selectedCategoriesStr = JSON.stringify(selectedCategories);

      // 构建 tags 参数（逗号分隔：类型,地区,年份）
      const tagsArray = [];
      if (genre) tagsArray.push(genre);
      if (region) tagsArray.push(region);
      if (year) tagsArray.push(year);
      const tags = tagsArray.join(",");

      // 构建完整URL
      url = `https://m.douban.com/rexxar/api/v2/movie/recommend?refresh=0&start=${start}&count=${limit}&selected_categories=${encodeURIComponent(selectedCategoriesStr)}&uncollect=false&score_range=0,10&tags=${encodeURIComponent(tags)}&sort=${sort}`;
      referer = "https://movie.douban.com/explore";
    } else if (categoryId === "tv_filter") {
      // 电视剧筛选分类
      const genre = filters.genre || ""; // 类型，全部为空字符串
      const region = filters.region || ""; // 地区，全部为空字符串
      const year = filters.year || ""; // 年代，全部为空字符串
      const platform = filters.platform || ""; // 平台，全部为空字符串
      const sort = filters.sort || "U"; // 排序，默认热度

      // 构建 selected_categories JSON（形式固定为"电视剧"）
      const selectedCategories = { "形式": "电视剧" };
      if (genre) selectedCategories["类型"] = genre;
      if (region) selectedCategories["地区"] = region;
      const selectedCategoriesStr = JSON.stringify(selectedCategories);

      // 构建 tags 参数（逗号分隔：类型,地区,年份,平台）
      const tagsArray = [];
      if (genre) tagsArray.push(genre);
      if (region) tagsArray.push(region);
      if (year) tagsArray.push(year);
      if (platform) tagsArray.push(platform);
      const tags = tagsArray.join(",");

      // 构建完整URL
      url = `https://m.douban.com/rexxar/api/v2/tv/recommend?refresh=0&start=${start}&count=${limit}&selected_categories=${encodeURIComponent(selectedCategoriesStr)}&uncollect=false&score_range=0,10&tags=${encodeURIComponent(tags)}&sort=${sort}`;
      referer = "https://movie.douban.com/tv/";
    } else if (categoryId === "show_filter") {
      // 综艺筛选分类（使用和电视剧筛选相同的接口）
      const genre = filters.genre || ""; // 类型，全部为空字符串
      const region = filters.region || ""; // 地区，全部为空字符串
      const year = filters.year || ""; // 年代，全部为空字符串
      const platform = filters.platform || ""; // 平台，全部为空字符串
      const sort = filters.sort || "U"; // 排序，默认热度

      // 构建 selected_categories JSON（形式固定为"综艺"）
      const selectedCategories = { "形式": "综艺" };
      if (genre) selectedCategories["类型"] = genre;
      if (region) selectedCategories["地区"] = region;
      const selectedCategoriesStr = JSON.stringify(selectedCategories);

      // 构建 tags 参数（逗号分隔：类型,地区,年份,平台）
      const tagsArray = [];
      if (genre) tagsArray.push(genre);
      if (region) tagsArray.push(region);
      if (year) tagsArray.push(year);
      if (platform) tagsArray.push(platform);
      const tags = tagsArray.join(",");

      // 构建完整URL（使用和电视剧筛选相同的接口）
      url = `https://m.douban.com/rexxar/api/v2/tv/recommend?refresh=0&start=${start}&count=${limit}&selected_categories=${encodeURIComponent(selectedCategoriesStr)}&uncollect=false&score_range=0,10&tags=${encodeURIComponent(tags)}&sort=${sort}`;
      referer = "https://movie.douban.com/tv/";
    } else {
      throw new Error(`未知的分类ID: ${categoryId}`);
    }
    // 发送请求
    // SDK 现在支持自动解压 gzip/br 压缩数据
    const response = await OmniBox.request(url, {
      method: "GET",
      headers: {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "referer": referer,
      },
    });

    // 检查响应状态
    if (response.statusCode !== 200) {
      throw new Error(`HTTP请求失败: ${response.statusCode}`);
    }

    // 检查响应体
    if (!response.body) {
      throw new Error("响应体为空");
    }

    // SDK 已自动处理 gzip/br/deflate 解压，response.body 应该是字符串
    let bodyStr = typeof response.body === "string" ? response.body : String(response.body);

    // 尝试解析响应数据
    let data;
    try {
      data = JSON.parse(bodyStr);
    } catch (parseError) {
      throw new Error(`JSON解析失败: ${parseError.message}`);
    }

    // 检查数据格式（movie_filter和tv_filter返回的字段名是items，其他是items）
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error("API返回数据格式错误");
    }

    // 根据分类ID确定分类名称
    const categoryNames = {
      movie: "选电影",
      tv: "选剧集",
      show: "选综艺",
      movie_filter: "电影筛选",
      tv_filter: "电视剧筛选",
      show_filter: "综艺筛选",
    };
    const typeName = categoryNames[categoryId] || "未知分类";

    // 转换数据格式
    const list = data.items.map((item) => {
      // 从 card_subtitle 提取年份信息
      // 格式示例: "2025 / 中国香港 中国大陆 / 剧情 犯罪 / 麦浚龙 / 金城武 刘青云"
      // 或: "2026 / 中国大陆 / 剧情 / 孙皓 / 赵丽颖 黄晓明"
      let vod_year = "";
      const cardSubtitle = item.card_subtitle || "";
      const yearMatch = cardSubtitle.match(/^(\d{4})/);
      if (yearMatch) {
        vod_year = yearMatch[1];
      }

      // 构建备注信息
      let vod_remarks = "";

      // 对于剧集和综艺，优先显示集数信息
      if (item.episodes_info && item.episodes_info.trim()) {
        vod_remarks = item.episodes_info.trim();
      } else if (item.is_new) {
        vod_remarks = categoryId === "movie" ? "新片" : "新剧";
      }


      // 处理图片URL，使用通用图片代理接口
      // 通过环境变量获取baseURL（脚本执行时会自动注入）
      const baseURL = context.baseURL || "";
      let vod_pic = item.pic?.large || item.pic?.normal || "";
      if (vod_pic) {
        // 构建带headers的URL格式: url@Referer=value
        const urlWithHeaders = `${vod_pic}@Referer=https://m.douban.com`;

        // 如果有baseURL，拼接完整的代理接口地址
        if (baseURL) {
          // 编码URL参数
          const encodedUrl = encodeURIComponent(urlWithHeaders);
          vod_pic = `${baseURL}/api/proxy/image?url=${encodedUrl}`;
        } else {
          // 如果没有baseURL，返回带headers的原始格式（兼容旧版本）
          vod_pic = urlWithHeaders;
        }
      }

      // 构建副标题（从card_subtitle提取，去除年份部分）
      let vod_subtitle = "";
      if (cardSubtitle) {
        // 格式: "2025 / 中国香港 中国大陆 / 剧情 犯罪 / 麦浚龙 / 金城武 刘青云"
        // 副标题：去除年份，保留其他信息
        const parts = cardSubtitle.split(" / ");
        if (parts.length > 1) {
          vod_subtitle = parts.slice(1).join(" / ");
        } else {
          // 如果没有年份，直接使用整个card_subtitle
          vod_subtitle = cardSubtitle;
        }
      }

      return {
        vod_id: item.id || `douban_${item.uri}`,
        link: buildDoubanSubjectLink(item.id || `douban_${item.uri}`),
        vod_name: item.title || "",
        search: true,
        vod_pic: vod_pic,
        type_id: categoryId,
        type_name: typeName,
        vod_remarks: vod_remarks,
        vod_year: vod_year,
        vod_douban_score: item.rating?.value ? item.rating.value.toString() : "",
        vod_subtitle: vod_subtitle, // 添加副标题
      };
    });

    // 计算总页数（movie_filter和tv_filter返回的字段名是total，其他可能不同）
    const total = data.total || data.count || list.length;
    const pagecount = Math.ceil(total / limit);
    return {
      page: page,
      pagecount: pagecount,
      total: total,
      list: list,
    };
  } catch (error) {
    return {
      page: params.page || 1,
      pagecount: 0,
      total: 0,
      list: [],
    };
  }
}

});

_load(2, "哔哩大全", function (module, exports, require) {
// @name 哔哩大全
// @author 
// @description 弹幕：支持
// @dependencies: axios, crypto
// @version 1.2.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/综合/哔哩大全.js

/**
 * 哔哩大全 - OmniBox 爬虫脚本（模板化版本）
 */
const axios = require("axios");
const crypto = require("crypto");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const BILI_COOKIE = process.env.BILI_COOKIE || "";
const DANMU_API = process.env.DANMU_API || "";

const BILI_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://www.bilibili.com",
  Origin: "https://www.bilibili.com",
  "Sec-Fetch-Site": "same-site",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
  ...(BILI_COOKIE ? { Cookie: BILI_COOKIE } : {}),
};

const isLoggedIn = () => Boolean(BILI_COOKIE && BILI_COOKIE.includes("SESSDATA="));

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 17, 6, 28,
];

function getMixinKey(raw) {
  return MIXIN_KEY_ENC_TAB.map((n) => raw[n]).join("").substring(0, 32);
}

let _wbiKeysCache = null;
let _searchHeadersCache = null;

function generateBuvid3() {
  const now = Date.now();
  const rand = Math.random().toString(16).substring(2, 10);
  const ts = now.toString(16);
  return `${ts}${rand}`;
}

function generateBuvid4() {
  const now = Date.now();
  const rand = Math.random().toString(16).substring(2, 14);
  const ts = now.toString(16);
  return `X${ts}${rand}`;
}

async function initSearchHeaders() {
  if (_searchHeadersCache) return _searchHeadersCache;
  let cookie = BILI_COOKIE || "";
  if (!cookie.includes("buvid3")) {
    cookie += `${cookie ? "; " : ""}buvid3=${generateBuvid3()}`;
  }
  if (!cookie.includes("buvid4")) {
    cookie += `; buvid4=${generateBuvid4()}`;
  }
  _searchHeadersCache = {
    "User-Agent": BILI_HEADERS["User-Agent"],
    Referer: "https://search.bilibili.com/all?keyword=1",
    Origin: "https://search.bilibili.com",
    Cookie: cookie,
  };
  return _searchHeadersCache;
}

async function getWbiKeys() {
  if (_wbiKeysCache) return _wbiKeysCache;
  try {
    const navHeaders = await initSearchHeaders();
    const { data } = await axios.get("https://api.bilibili.com/x/web-interface/nav", {
      headers: navHeaders,
    });
    logInfo(`nav接口 code: ${data?.code}, message: ${data?.message}`);
    const { wbi_img: { img_url, sub_url } = {} } = data?.data || {};
    const imgKey = (img_url || "").split("/").pop().split(".")[0] || "";
    const subKey = (sub_url || "").split("/").pop().split(".")[0] || "";
    logInfo(`获取WbiKeys imgKey: ${imgKey}, subKey: ${subKey}`);
    if (!imgKey || !subKey) {
      logInfo(`nav data.data keys: ${JSON.stringify(data?.data ? Object.keys(data.data) : []).substring(0, 300)}`);
      logInfo(`wbi_img: ${JSON.stringify(data?.data?.wbi_img).substring(0, 300)}`);
    }
    _wbiKeysCache = { imgKey, subKey };
    return _wbiKeysCache;
  } catch (err) {
    logError("获取WbiKeys失败", err);
    return { imgKey: "", subKey: "" };
  }
}

async function signWbiParams(params) {
  const { imgKey, subKey } = await getWbiKeys();
  const mixinKey = getMixinKey(imgKey + subKey);
  const wts = Math.floor(Date.now() / 1000);
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((obj, key) => {
      if (params[key] !== undefined && params[key] !== null) {
        obj[key] = params[key];
      }
      return obj;
    }, {});
  sortedParams.wts = wts;
  const query = Object.entries(sortedParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const w_rid = crypto.createHash("md5").update(query + mixinKey).digest("hex");
  return { ...sortedParams, w_rid };
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value) {
  return `<![CDATA[${String(value ?? "").replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function dashBaseUrl(item) {
  return item?.base_url || item?.baseUrl || "";
}

function selectBestDashVideo(videos = []) {
  let targetVideos = videos.filter((v) => v.codecid === 7 || (v.codecs && v.codecs.startsWith("avc")));
  if (targetVideos.length === 0) targetVideos = videos;

  return [...targetVideos].sort((a, b) => {
    if ((b.id || 0) !== (a.id || 0)) return (b.id || 0) - (a.id || 0);
    if ((b.bandwidth || 0) !== (a.bandwidth || 0)) return (b.bandwidth || 0) - (a.bandwidth || 0);
    return (b.width || 0) - (a.width || 0);
  })[0];
}

function buildMpd(dash) {
  const duration = Number(dash?.duration || 0);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011" type="static" minBufferTime="PT1.5S" mediaPresentationDuration="PT${xmlEscape(duration)}S">`,
    "  <Period>",
  ];

  const bestVideo = selectBestDashVideo(dash?.video || []);
  const videos = bestVideo ? [bestVideo] : [];
  if (videos.length) {
    lines.push('    <AdaptationSet mimeType="video/mp4" contentType="video" subsegmentAlignment="true" subsegmentStartsWithSAP="1">');
    for (const video of videos) {
      lines.push(
        `      <Representation id="${xmlEscape(video.id)}" codecs="${xmlEscape(video.codecs || "avc1.64001E")}" bandwidth="${xmlEscape(video.bandwidth || 0)}" width="${xmlEscape(video.width || 0)}" height="${xmlEscape(video.height || 0)}" frameRate="${xmlEscape(video.frame_rate || "")}">`,
      );
      lines.push(`        <BaseURL>${cdata(dashBaseUrl(video))}</BaseURL>`);
      if (video.SegmentBase?.Initialization) {
        lines.push(`        <SegmentBase indexRange="${xmlEscape(video.SegmentBase.indexRange || "")}">`);
        lines.push(`          <Initialization range="${xmlEscape(video.SegmentBase.Initialization)}"/>`);
        lines.push("        </SegmentBase>");
      }
      lines.push("      </Representation>");
    }
    lines.push("    </AdaptationSet>");
  }

  const audios = Array.isArray(dash?.audio) ? dash.audio : [];
  if (audios.length) {
    lines.push('    <AdaptationSet mimeType="audio/mp4" contentType="audio" subsegmentAlignment="true" subsegmentStartsWithSAP="1">');
    for (const audio of audios) {
      lines.push(
        `      <Representation id="${xmlEscape(audio.id)}" codecs="${xmlEscape(audio.codecs || "mp4a.40.2")}" bandwidth="${xmlEscape(audio.bandwidth || 0)}">`,
      );
      lines.push(`        <BaseURL>${cdata(dashBaseUrl(audio))}</BaseURL>`);
      if (audio.SegmentBase?.Initialization) {
        lines.push(`        <SegmentBase indexRange="${xmlEscape(audio.SegmentBase.indexRange || "")}">`);
        lines.push(`          <Initialization range="${xmlEscape(audio.SegmentBase.Initialization)}"/>`);
        lines.push("        </SegmentBase>");
      }
      lines.push("      </Representation>");
    }
    lines.push("    </AdaptationSet>");
  }

  lines.push("  </Period>");
  lines.push("</MPD>");
  return lines.join("\n");
}

function getRuntimeContext(params = {}, context = {}) {
  return context && Object.keys(context).length ? context : params?.context || {};
}

function buildDashProxyUrl(params = {}, context = {}, avid, cid) {
  const ids = `${avid}_${cid}`;
  const runtimeContext = getRuntimeContext(params, context);
  const baseURL = String(runtimeContext?.baseURL || params?.baseURL || "").replace(/\/+$/, "");
  const sourceId = String(runtimeContext?.sourceId || params?.sourceId || "");
  const template = process.env.BILI_DASH_PROXY_URL || "";

  if (template) {
    return template
      .replaceAll("{baseURL}", baseURL)
      .replaceAll("{sourceId}", encodeURIComponent(sourceId))
      .replaceAll("{ids}", encodeURIComponent(ids))
      .replaceAll("{avid}", encodeURIComponent(avid))
      .replaceAll("{cid}", encodeURIComponent(cid))
      .replaceAll("{qn}", "127")
      .replaceAll("{fnval}", "4048")
      .replaceAll("{fourk}", "1");
  }

  return "";
}

function buildDashDataUrl(dash) {
  const mpd = buildMpd(dash);
  return `data:application/dash+xml;base64,${Buffer.from(mpd, "utf8").toString("base64")}`;
}

const CLASSES = [
  { type_id: "沙雕仙逆", type_name: "傻屌仙逆" },
  { type_id: "沙雕动画", type_name: "沙雕动画" },
  { type_id: "纪录片超清", type_name: "纪录片" },
  { type_id: "演唱会超清", type_name: "演唱会" },
  { type_id: "音乐超清", type_name: "流行音乐" },
  { type_id: "美食超清", type_name: "美食" },
  { type_id: "食谱", type_name: "食谱" },
  { type_id: "体育超清", type_name: "体育" },
  { type_id: "球星", type_name: "球星" },
  { type_id: "中小学教育", type_name: "教育" },
  { type_id: "幼儿教育", type_name: "幼儿教育" },
  { type_id: "旅游", type_name: "旅游" },
  { type_id: "风景4K", type_name: "风景" },
  { type_id: "说案", type_name: "说案" },
  { type_id: "知名UP主", type_name: "知名UP主" },
  { type_id: "探索发现超清", type_name: "探索发现" },
  { type_id: "鬼畜", type_name: "鬼畜" },
  { type_id: "搞笑超清", type_name: "搞笑" },
  { type_id: "儿童超清", type_name: "儿童" },
  { type_id: "动物世界超清", type_name: "动物世界" },
  { type_id: "相声小品超清", type_name: "相声小品" },
  { type_id: "戏曲", type_name: "戏曲" },
  { type_id: "解说", type_name: "解说" },
  { type_id: "演讲", type_name: "演讲" },
  { type_id: "小姐姐超清", type_name: "小姐姐" },
  { type_id: "荒野求生超清", type_name: "荒野求生" },
  { type_id: "健身", type_name: "健身" },
  { type_id: "帕梅拉", type_name: "帕梅拉" },
  { type_id: "太极拳", type_name: "太极拳" },
  { type_id: "广场舞", type_name: "广场舞" },
  { type_id: "舞蹈", type_name: "舞蹈" },
  { type_id: "音乐", type_name: "音乐" },
  { type_id: "歌曲", type_name: "歌曲" },
  { type_id: "MV4K", type_name: "MV" },
  { type_id: "舞曲超清", type_name: "舞曲" },
  { type_id: "4K", type_name: "4K" },
  { type_id: "电影", type_name: "电影" },
  { type_id: "电视剧", type_name: "电视剧" },
  { type_id: "白噪音超清", type_name: "白噪音" },
  { type_id: "考公考证", type_name: "考公考证" },
  { type_id: "平面设计教学", type_name: "平面设计教学" },
  { type_id: "软件教程", type_name: "软件教程" },
  { type_id: "Windows", type_name: "Windows" },
];

const QUALITY_NAME_MAP = {
  127: "8K 超高清",
  126: "杜比视界",
  125: "HDR 真彩色",
  120: "4K 超清",
  116: "1080P60 高帧率",
  112: "1080P+ 高码率",
  80: "1080P 高清",
  74: "720P60 高帧率",
  64: "720P 高清",
  32: "480P 清晰",
  16: "360P 流畅",
};

function logInfo(msg) {
  OmniBox.log("info", `[BILI-ALL] ${msg}`);
}

function logError(msg, err) {
  OmniBox.log("error", `[BILI-ALL] ${msg}: ${err?.message || err}`);
}

function fixCover(url) {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function formatDuration(seconds) {
  const sec = parseInt(seconds, 10) || 0;
  if (sec <= 0) return "00:00";
  const minutes = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatSearchDuration(duration) {
  if (!duration || typeof duration !== "string") return "00:00";
  const parts = duration.split(":");
  return parts.length === 2 ? duration : "00:00";
}

function preprocessTitle(title) {
  if (!title) return "";
  return String(title)
    .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]|1280x720|1920x1080/g, " ")
    .replace(/[hH]\.?26[45]/g, " ")
    .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
    .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ")
    .trim();
}

function chineseToArabic(cn) {
  const map = {
    零: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };
  if (!Number.isNaN(Number(cn))) return parseInt(cn, 10);
  if (cn.length === 1) return map[cn] ?? cn;
  if (cn.length === 2) {
    if (cn[0] === "十") return 10 + (map[cn[1]] || 0);
    if (cn[1] === "十") return (map[cn[0]] || 0) * 10;
  }
  if (cn.length === 3) return (map[cn[0]] || 0) * 10 + (map[cn[2]] || 0);
  return cn;
}

function extractEpisode(title) {
  if (!title) return "";
  const processed = preprocessTitle(title);

  const seMatch = processed.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
  if (seMatch) return seMatch[1];

  const cnMatch = processed.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
  if (cnMatch) return String(chineseToArabic(cnMatch[1]));

  const epMatch = processed.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
  if (epMatch) return epMatch[1];

  const bracketMatch = processed.match(/[\[\(【（](\d{1,3})[\]\)】）]/);
  if (bracketMatch && !["720", "1080", "480"].includes(bracketMatch[1])) {
    return bracketMatch[1];
  }

  return "";
}

function buildFileNameForDanmu(vodName, episodeTitle) {
  if (!vodName) return "";
  if (!episodeTitle || episodeTitle === "正片" || episodeTitle === "播放") return vodName;

  const digits = extractEpisode(episodeTitle);
  if (!digits) return vodName;

  const epNum = parseInt(digits, 10);
  if (!epNum || epNum <= 0) return vodName;
  return epNum < 10 ? `${vodName} S01E0${epNum}` : `${vodName} S01E${epNum}`;
}

function inferFileNameFromURL(url) {
  try {
    const urlObj = new URL(url);
    let base = urlObj.pathname.split("/").pop() || "";
    const dotIndex = base.lastIndexOf(".");
    if (dotIndex > 0) base = base.substring(0, dotIndex);
    base = base.replace(/[_-]/g, " ").replace(/\./g, " ").trim();
    return base || url;
  } catch {
    return url;
  }
}

async function matchDanmu(fileName, cid) {
  // 优先沿用原有 B 站弹幕逻辑
  if (cid) {
    return [{ name: "B站弹幕", url: `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}` }];
  }

  // 可选：如果配置 DANMU_API，兼容 4KVM 风格匹配
  if (!DANMU_API || !fileName) return [];

  try {
    const matchUrl = `${DANMU_API}/api/v2/match`;
    const response = await OmniBox.request(matchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": BILI_HEADERS["User-Agent"],
      },
      body: JSON.stringify({ fileName }),
    });

    if (response.statusCode !== 200) return [];

    const matchData = JSON.parse(response.body || "{}");
    if (!matchData.isMatched || !Array.isArray(matchData.matches) || matchData.matches.length === 0) {
      return [];
    }

    const firstMatch = matchData.matches[0];
    const episodeId = firstMatch.episodeId;
    if (!episodeId) return [];

    const animeTitle = firstMatch.animeTitle || "";
    const episodeTitle = firstMatch.episodeTitle || "";
    const name = animeTitle && episodeTitle ? `${animeTitle} - ${episodeTitle}` : animeTitle || episodeTitle || "弹幕";

    return [{ name, url: `${DANMU_API}/api/v2/comment/${episodeId}?format=xml` }];
  } catch (error) {
    logError("匹配弹幕失败", error);
    return [];
  }
}

async function home(params) {
  try {
    const url = "https://api.bilibili.com/x/web-interface/popular?ps=20&pn=1";
    const { data } = await axios.get(url, { headers: BILI_HEADERS });

    const list = (data?.data?.list || []).map((item) => ({
      vod_id: String(item.aid || ""),
      vod_name: String(item.title || "").replace(/<[^>]*>/g, ""),
      vod_pic: fixCover(item.pic),
      vod_remarks: formatDuration(item.duration),
    }));

    return {
      class: CLASSES,
      list,
    };
  } catch (error) {
    logError("首页获取失败", error);
    return { class: CLASSES, list: [] };
  }
}

async function category(params) {
  const keyword = params.categoryId || "";
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  if (!keyword) {
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }

  try {
    const rawParams = {
      search_type: "video",
      keyword,
      page,
    };
    const signedParams = await signWbiParams(rawParams);
    logInfo(`签名参数: ${JSON.stringify(signedParams)}`);
    const searchHeaders = await initSearchHeaders();
    logInfo(`搜索Cookie(含buvid): ${searchHeaders.Cookie?.substring(0, 120)}`);
    const { data } = await axios.get("https://api.bilibili.com/x/web-interface/search/type", {
      headers: searchHeaders,
      params: signedParams,
    });
    logInfo(`搜索响应 code: ${data?.code}, message: ${data?.message}`);
    logInfo(`搜索结果数量: ${(data?.data?.result || []).length}, numResults: ${data?.data?.numResults}`);
    if (data?.code !== 0) {
      logInfo(`搜索响应完整: ${JSON.stringify(data).substring(0, 500)}`);
    }

    const list = (data?.data?.result || [])
      .filter((item) => item.type === "video")
      .map((item) => ({
        vod_id: String(item.aid || ""),
        vod_name: String(item.title || "").replace(/<[^>]*>/g, ""),
        vod_pic: fixCover(item.pic),
        vod_remarks: formatSearchDuration(item.duration),
      }));

    return {
      page,
      pagecount: data?.data?.numPages || 1,
      total: data?.data?.numResults || list.length,
      list,
    };
  } catch (error) {
    logError("分类获取失败", error);
    return { page, pagecount: 0, total: 0, list: [] };
  }
}

async function search(params) {
  return category({
    categoryId: params.keyword || params.wd || "",
    page: params.page,
  });
}

async function detail(params) {
  const videoId = params.videoId;
  if (!videoId) return { list: [] };

  try {
    const { data } = await axios.get(`https://api.bilibili.com/x/web-interface/view?aid=${videoId}`, {
      headers: BILI_HEADERS,
    });

    const video = data?.data;
    if (!video) return { list: [] };

    const episodes = (video.pages || []).map((p, i) => {
      const part = p.part || `第${i + 1}集`;
      return {
        name: part,
        playId: `${videoId}_${p.cid}|${video.title || ""}|${part}`,
      };
    });

    return {
      list: [
        {
          vod_id: String(videoId),
          vod_name: String(video.title || "").replace(/<[^>]*>/g, ""),
          vod_pic: fixCover(video.pic),
          vod_content: String(video.desc || ""),
          vod_play_sources: [
            {
              name: "B站视频",
              episodes,
            },
          ],
        },
      ],
    };
  } catch (error) {
    logError("详情获取失败", error);
    return { list: [] };
  }
}

async function play(params, context = {}) {
  let playId = params.playId || "";
  const flag = params.flag || "";

  if (!playId) {
    return { urls: [], parse: 1, header: {} };
  }

  let vodName = "";
  let episodeName = "";

  if (playId.includes("|")) {
    const parts = playId.split("|");
    playId = parts[0] || "";
    vodName = parts[1] || "";
    episodeName = parts[2] || "";
  }

  const idParts = playId.split("_");
  if (idParts.length < 2) {
    return {
      urls: [{ name: "播放", url: playId }],
      parse: /\.(m3u8|mp4|flv)$/i.test(playId) ? 0 : 1,
      header: {}
  };
  }

  const avid = idParts[0];
  const cid = idParts[1];
  const loggedIn = isLoggedIn();
  const dashProxyUrl = loggedIn ? buildDashProxyUrl(params, context, avid, cid) : "";

  const qualityList = loggedIn
    ? [127, 126, 125, 120, 116, 112, 80, 74, 64, 32, 16]
    : [80, 64, 32, 16];

  const headers = {
    ...BILI_HEADERS,
    Referer: `https://www.bilibili.com/video/av${avid}`,
    Origin: "https://www.bilibili.com",
  };

  const qualitySet = new Set();
  const availableQualities = [];
  let dashProxyAdded = false;

  if (dashProxyUrl) {
    availableQualities.push({
      name: "DASH(代理)",
      url: dashProxyUrl,
      qn: 1000,
      isDashProxy: true,
      audioUrl: "",
    });
    dashProxyAdded = true;
  }

  for (const qn of qualityList) {
    const useDash = qn > 116;
    try {
      const { data } = await axios.get("https://api.bilibili.com/x/player/playurl", {
        headers,
        params: {
          avid,
          cid,
          qn,
          fnval: useDash ? 4048 : 1,
          fourk: qn >= 120 ? 1 : 0,
          ...(!loggedIn ? { try_look: 1 } : {}),
        },
      });

      if (data?.code !== 0 || !data?.data) continue;

      const payload = data.data;
      const actualQn = payload.quality || qn;
      if (qualitySet.has(actualQn)) continue;
      qualitySet.add(actualQn);

      if (payload.dash?.video?.length) {
        if (loggedIn && !dashProxyAdded) {
          availableQualities.push({
            name: "DASH(代理)",
            url: buildDashDataUrl(payload.dash),
            qn: 1000,
            isDashProxy: true,
            audioUrl: "",
          });
          dashProxyAdded = true;
        }

        const bestVideo = [...payload.dash.video].sort((a, b) => {
          if ((b.id || 0) !== (a.id || 0)) return (b.id || 0) - (a.id || 0);
          if ((b.bandwidth || 0) !== (a.bandwidth || 0)) return (b.bandwidth || 0) - (a.bandwidth || 0);
          return (b.width || 0) - (a.width || 0);
        })[0];

        const bestAudio = [...(payload.dash.audio || [])].sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0))[0];

        if (bestVideo) {
          availableQualities.push({
            name: QUALITY_NAME_MAP[actualQn] || `DASH ${bestVideo.width || "?"}p`,
            url: bestVideo.base_url || bestVideo.baseUrl,
            qn: actualQn,
            audioUrl: bestAudio?.base_url || bestAudio?.baseUrl || "",
          });
        }
      } else if (payload.durl?.[0]?.url) {
        availableQualities.push({
          name: QUALITY_NAME_MAP[actualQn] || `画质${actualQn}`,
          url: payload.durl[0].url,
          qn: actualQn,
          audioUrl: "",
        });
      }
    } catch {
      // 忽略单个画质异常，继续尝试其他画质
    }
  }

  if (availableQualities.length === 0) {
    return {
      urls: [{ name: "播放", url: playId }],
      parse: 1,
      header: headers};
  }

  availableQualities.sort((a, b) => b.qn - a.qn);

  const urls = availableQualities.map((q) => ({
    name: q.name,
    url: q.url,
  }));

  const response = {
    urls,
    parse: 0,
    header: {
      "User-Agent": headers["User-Agent"],
      Referer: headers.Referer,
      Origin: headers.Origin
    }};

  // 兼容保留：如果是 DASH，带上最佳音轨供支持方使用
  if (availableQualities[0]?.audioUrl) {
    response.extra = { audio: availableQualities[0].audioUrl };
  }

  // 弹幕：优先 B 站原有逻辑；无 cid 时回退 4KVM 风格匹配
  let fileName = buildFileNameForDanmu(vodName || params.vodName || "", episodeName || params.episodeName || "");
  if (!fileName && urls[0]?.url) {
    fileName = inferFileNameFromURL(urls[0].url);
  }
  const danmaku = await matchDanmu(fileName, cid);
  if (danmaku.length > 0) {
    response.danmaku = danmaku;
  }

  return response;
}

async function proxy(params = {}) {
  const ids = params.ids || params.playId || params.id || "";
  const idParts = String(ids).split("_");
  if (idParts.length < 2) return "";

  const avid = idParts[0];
  const cid = idParts[1];
  const qn = parseInt(params.qn, 10) || 127;
  const headers = {
    ...BILI_HEADERS,
    Referer: `https://www.bilibili.com/video/av${avid}`,
    Origin: "https://www.bilibili.com",
  };

  try {
    const { data } = await axios.get("https://api.bilibili.com/x/player/playurl", {
      headers,
      params: {
        avid,
        cid,
        qn,
        fnval: parseInt(params.fnval, 10) || 4048,
        fourk: params.fourk == null ? 1 : params.fourk,
        ...(!isLoggedIn() ? { try_look: 1 } : {}),
      },
    });

    if (data?.code === 0 && data?.data?.dash) {
      return buildMpd(data.data.dash);
    }
    return "";
  } catch (error) {
    logError("DASH代理获取失败", error);
    return "";
  }
}

module.exports = {
  home,
  category,
  search,
  detail,
  play,
  proxy,
};

const runner = require("spider_runner");
runner.run(module.exports);

});
