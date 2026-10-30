// @name 影视采集E(合并7源)
// @version 3.20261030.1219
// @description 自动同步：采集聚合
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-采集E.js
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


_load(0, "PPnix", function (module, exports, require) {
// @name PPnix
// @author 梦
// @description 刮削：暂不支持，弹幕：暂不支持，分类筛选：支持，播放链：兼容 TVBox，优先返回已重写的内联 m3u8 以规避代理链路问题
// @dependencies: axios, cheerio
// @version 1.7.4
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/PPnix.js

const OmniBox = require("omnibox_sdk");
const cheerio = require("cheerio");
const axios = require("axios");
const runner = require("spider_runner");
const { execFile } = require("child_process");
const { promisify } = require("util");

const BASE_URL = process.env.PPNIX_HOST || "https://www.ppnix.com";
const BASE_PATH = process.env.PPNIX_LANG_PATH || "/cn";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";

const CATEGORIES = [
  { type_id: "movie", type_name: "电影" },
  { type_id: "tv", type_name: "电视剧" },
];

function normalizeBasePath(path = "") {
  const p = String(path || "").trim();
  if (!p) return "/cn";
  return p.startsWith("/") ? p.replace(/\/+$/, "") : `/${p.replace(/\/+$/, "")}`;
}

const LANG_PATH = normalizeBasePath(BASE_PATH);

const PPNIX_SEGMENT_HOST = process.env.PPNIX_SEGMENT_HOST || "https://1.ppnix.com";
const PPNIX_REWRITE_M3U8 = process.env.PPNIX_REWRITE_M3U8 === "1";
const PPNIX_CF_COOKIE = process.env.PPNIX_CF_COOKIE || process.env.PPNIX_COOKIE || "";
const PPNIX_CF_AUTO = process.env.PPNIX_CF_AUTO !== "0";
const PPNIX_CF_CACHE_KEY = process.env.PPNIX_CF_CACHE_KEY || "ppnix:cf_clearance";
const PPNIX_CF_MAX_AGE_SECONDS = parseInt(process.env.PPNIX_CF_MAX_AGE_SECONDS || "21600", 10) || 21600;
const PPNIX_CF_TIMEOUT_MS = parseInt(process.env.PPNIX_CF_TIMEOUT_MS || "45000", 10) || 45000;
// FlareSolverr 服务地址，优先读取站点专用变量，其次回退通用 FLARESOLVERR_URL。
// 项目地址：https://github.com/FlareSolverr/FlareSolverr
const PPNIX_FLARESOLVERR_URL = process.env.PPNIX_FLARESOLVERR_URL || process.env.FLARESOLVERR_URL || "http://192.168.50.50:8191/v1";
// FlareSolverr 会话名，用于复用已过验证的浏览器会话。
const PPNIX_FLARESOLVERR_SESSION = process.env.PPNIX_FLARESOLVERR_SESSION || "";
// FlareSolverr 单次请求最大等待时间（毫秒），默认沿用 CF 自动处理超时配置。
const PPNIX_FLARESOLVERR_TIMEOUT_MS = parseInt(process.env.PPNIX_FLARESOLVERR_TIMEOUT_MS || String(PPNIX_CF_TIMEOUT_MS), 10) || PPNIX_CF_TIMEOUT_MS;
const PPNIX_ENABLE_SUBTITLES = process.env.PPNIX_ENABLE_SUBTITLES === "1";
const execFileAsync = promisify(execFile);

const SORT_MAP = {
  time: "newstime",
  hits: "onclick",
  score: "rating",
  newstime: "newstime",
  onclick: "onclick",
  rating: "rating",
};

function joinUrl(path = "") {
  const raw = String(path || "").trim();
  if (!raw) return `${BASE_URL}${LANG_PATH}/`;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${BASE_URL}${raw}`;
  return `${BASE_URL}/${raw}`;
}

function buildCookieHeader(cookie = "") {
  const value = text(cookie);
  return value ? { Cookie: value } : {};
}

function toCookieString(cookieMap = {}) {
  return Object.entries(cookieMap || {})
    .map(([k, v]) => [text(k), text(v)])
    .filter(([k, v]) => k && v)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function cookiesArrayToString(cookies = []) {
  return (Array.isArray(cookies) ? cookies : [])
    .map((item) => ({ name: text(item?.name || ""), value: text(item?.value || "") }))
    .filter((item) => item.name && item.value)
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
}

async function getCachedCfCookie() {
  if (text(PPNIX_CF_COOKIE)) return text(PPNIX_CF_COOKIE);
  try {
    const cached = await OmniBox.getCache(PPNIX_CF_CACHE_KEY);
    return text(cached || "");
  } catch (error) {
    OmniBox.log("warn", `[cf] 读取缓存失败: ${error.message}`);
    return "";
  }
}

async function setCachedCfCookie(cookie) {
  const value = text(cookie);
  if (!value || text(PPNIX_CF_COOKIE)) return;
  try {
    await OmniBox.setCache(PPNIX_CF_CACHE_KEY, value, PPNIX_CF_MAX_AGE_SECONDS);
  } catch (error) {
    OmniBox.log("warn", `[cf] 写入缓存失败: ${error.message}`);
  }
}

async function fetchCfClearanceWithFlareSolverr(targetUrl = `${BASE_URL}${LANG_PATH}/`) {
  const endpoint = text(PPNIX_FLARESOLVERR_URL);
  if (!endpoint) {
    throw new Error("未配置 FlareSolverr 地址");
  }

  const payload = {
    cmd: "request.get",
    url: targetUrl,
    maxTimeout: PPNIX_FLARESOLVERR_TIMEOUT_MS,
  };
  if (text(PPNIX_FLARESOLVERR_SESSION)) {
    payload.session = text(PPNIX_FLARESOLVERR_SESSION);
  }

  const res = await axios.post(endpoint, payload, {
    timeout: PPNIX_FLARESOLVERR_TIMEOUT_MS + 5000,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    validateStatus: () => true,
  });

  if (res.status !== 200 || !res.data || res.data.status !== "ok") {
    throw new Error(`FlareSolverr HTTP ${res.status}`);
  }

  const solution = res.data.solution || {};
  const cookies = Array.isArray(solution.cookies) ? solution.cookies : [];
  const cookie = cookiesArrayToString(cookies);
  const cf = cookies.find((item) => text(item?.name) === "cf_clearance" && /ppnix\.com$/i.test(text(item?.domain || "ppnix.com")));

  if (!cf?.value) {
    throw new Error(`FlareSolverr 未返回 cf_clearance，message=${text(res.data.message || "") || "unknown"}`);
  }

  OmniBox.log("info", `[cf] FlareSolverr 已返回 cookies=${cookies.length}, ua=${text(solution.userAgent || "")}`);
  return cookie;
}

async function fetchCfClearanceWithBrowser() {
  const script = String.raw`
const { execFile } = require("child_process");
const { promisify } = require("util");
const http = require("http");
const execFileAsync = promisify(execFile);
const BASE_URL = process.env.PPNIX_BASE_URL;
const USER_AGENT = process.env.PPNIX_USER_AGENT;
const timeoutMs = Number(process.env.PPNIX_CF_TIMEOUT_MS || 45000);

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
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

async function readCookies(wsUrl) {
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
  const res = await send("Storage.getCookies", {});
  ws.close();
  return (res.result && res.result.cookies) || [];
}

(async () => {
  const port = 9223 + Math.floor(Math.random() * 200);
  const userDataDir = await execFileAsync("mktemp", ["-d", "/tmp/ppnix-cf-XXXXXX"]);
  const profileDir = String(userDataDir.stdout || "").trim();
  const chrome = ["/snap/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/chromium"];
  const bin = chrome.find(Boolean);
  if (!bin) throw new Error("未找到 Chromium");

  const child = execFile(bin, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--user-data-dir=" + profileDir,
    "--remote-debugging-port=" + port,
    "--user-agent=" + USER_AGENT,
    BASE_URL + "/cn/"
  ], { stdio: "ignore" });

  try {
    const deadline = Date.now() + timeoutMs;
    const version = await waitForDebugger(port, deadline);
    while (Date.now() < deadline) {
      const cookies = await readCookies(version.webSocketDebuggerUrl);
      const hit = cookies.find((c) => c && c.name === "cf_clearance" && String(c.domain || "").includes("ppnix.com"));
      if (hit && hit.value) {
        process.stdout.write("cf_clearance=" + hit.value);
        return;
      }
      await delay(1200);
    }
    throw new Error("未在时限内获取到 cf_clearance");
  } finally {
    try { child.kill("SIGKILL"); } catch (_) {}
  }
})().catch((error) => {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
});`;

  const { stdout, stderr } = await execFileAsync("node", ["-e", script], {
    timeout: PPNIX_CF_TIMEOUT_MS,
    env: {
      ...process.env,
      PPNIX_BASE_URL: BASE_URL,
      PPNIX_USER_AGENT: USER_AGENT,
      PPNIX_CF_TIMEOUT_MS: String(PPNIX_CF_TIMEOUT_MS),
    },
    maxBuffer: 1024 * 1024,
  });

  const cookie = text(stdout || "");
  if (!/^cf_clearance=/.test(cookie)) {
    throw new Error(text(stderr || "未获取到 cf_clearance"));
  }
  return cookie;
}

async function ensureCfCookie(forceRefresh = false, targetUrl = `${BASE_URL}${LANG_PATH}/`) {
  if (text(PPNIX_CF_COOKIE)) return text(PPNIX_CF_COOKIE);
  if (!forceRefresh) {
    const cached = await getCachedCfCookie();
    if (cached) return cached;
  }
  if (!PPNIX_CF_AUTO) return "";

  let cookie = "";
  try {
    OmniBox.log("info", `[cf] 开始通过 FlareSolverr 自动获取 cf_clearance`);
    cookie = await fetchCfClearanceWithFlareSolverr(targetUrl);
  } catch (error) {
    OmniBox.log("warn", `[cf] FlareSolverr 获取失败，回退 headless Chromium: ${error.message}`);
    cookie = await fetchCfClearanceWithBrowser();
  }

  if (cookie) {
    await setCachedCfCookie(cookie);
    OmniBox.log("info", `[cf] 已自动获取 cf_clearance，长度=${cookie.length}`);
  }
  return cookie;
}

async function requestPage(path) {
  const url = joinUrl(path);
  OmniBox.log("info", `[request] ${url}`);
  let cookie = await getCachedCfCookie();
  let res = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent": USER_AGENT,
      "Referer": `${BASE_URL}${LANG_PATH}/`,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...buildCookieHeader(cookie),
    },
    validateStatus: () => true,
  });

  if ((res.status === 403 || res.status === 503) && PPNIX_CF_AUTO) {
    cookie = await ensureCfCookie(!cookie, url);
    res = await axios.get(url, {
      timeout: 20000,
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": `${BASE_URL}${LANG_PATH}/`,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...buildCookieHeader(cookie),
      },
      validateStatus: () => true,
    });
  }

  if (res.status !== 200 || !res.data) {
    throw new Error(`HTTP ${res.status}`);
  }

  return {
    url,
    html: typeof res.data === "string" ? res.data : String(res.data || ""),
  };
}

function text(v) {
  return String(v == null ? "" : v).trim();
}

function fixImage(url) {
  const u = text(url);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `${BASE_URL}${u}`;
  return `${BASE_URL}/${u}`;
}

function stripTags(s = "") {
  return text(String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function decodeHtmlEntity(str = "") {
  return text(str)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function mapListItems($, scope, typeId = "") {
  const list = [];
  const seen = new Set();
  $(scope).each((_, el) => {
    const $el = $(el);
    const $a = $el.find("a.thumbnail, h2 a, a").first();
    const href = $a.attr("href") || $el.find("h2 a").attr("href") || "";
    const vodId = text(href);
    if (!vodId || seen.has(vodId)) return;
    seen.add(vodId);

    const vodName = text($el.find("img.thumb").attr("alt") || $el.find("h2 a").text() || $a.text());
    const vodPic = fixImage($el.find("img.thumb").attr("src") || $el.find("img.thumb").attr("data-src") || "");
    const vodRemarks = text($el.find("footer .rate").text() || $el.find("footer").text());

    if (!vodName) return;

    list.push({
      vod_id: vodId,
      vod_name: vodName,
      vod_pic: vodPic,
      type_id: typeId,
      type_name: typeId === "movie" ? "电影" : typeId === "tv" ? "电视剧" : "",
      vod_remarks: vodRemarks,
    });
  });
  return list;
}

function parseM3u8List(html = "") {
  const infoId = (html.match(/infoid\s*=\s*(\d+)/) || [])[1] || "";
  const m = html.match(/m3u8\s*=\s*\[(.*?)\]/s);
  if (!m) return { infoId, items: [] };
  const items = [];
  const re = /'([^']*)'|"([^"]*)"/g;
  let mm;
  while ((mm = re.exec(m[1])) !== null) {
    const value = text(mm[1] || mm[2] || "");
    if (value) items.push(value);
  }
  return { infoId, items };
}

function buildPlayId(meta) {
  const infoId = text(meta.infoId || "");
  const param = encodeURIComponent(text(meta.param || ""));
  const referer = encodeURIComponent(text(meta.referer || ""));
  const name = encodeURIComponent(text(meta.name || ""));
  const episodeName = encodeURIComponent(text(meta.episodeName || ""));
  return `${infoId}|${param}|${referer}|${name}|${episodeName}`;
}

function parsePlayId(playId) {
  const parts = String(playId || "").split("|");
  return {
    infoId: text(parts[0] || ""),
    param: decodeURIComponent(parts[1] || ""),
    referer: decodeURIComponent(parts[2] || ""),
    name: decodeURIComponent(parts[3] || ""),
    episodeName: decodeURIComponent(parts[4] || ""),
  };
}

async function fetchText(url, headers = {}) {
  let cookie = await getCachedCfCookie();
  let res = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent": USER_AGENT,
      ...headers,
      ...buildCookieHeader(cookie),
    },
    validateStatus: () => true,
  });
  if ((res.status === 403 || res.status === 503) && PPNIX_CF_AUTO) {
    cookie = await ensureCfCookie(!cookie, url);
    res = await axios.get(url, {
      timeout: 20000,
      headers: {
        "User-Agent": USER_AGENT,
        ...headers,
        ...buildCookieHeader(cookie),
      },
      validateStatus: () => true,
    });
  }
  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status}`);
  }
  return typeof res.data === "string" ? res.data : String(res.data || "");
}

function rewritePpnixM3u8(m3u8Text, referer) {
  const keyUrl = `${BASE_URL}/info/m3u8/key`;
  return String(m3u8Text || "")
    .replace(/URI="\.\.\/key"/g, `URI="${keyUrl}"`)
    .replace(/https:\/\/ipfs\.ppnix\.com\/ipfs\//g, `${PPNIX_SEGMENT_HOST}/ipfs/`);
}

function buildSubtitleSelector(infoId, param, langs = ["cn", "tw", "en"]) {
  const items = [];
  for (const lang of langs) {
    const code = text(lang);
    if (!code) continue;
    items.push({
      name: code,
      url: `${BASE_URL}/info/subtitle/${infoId}/${encodeURIComponent(param)}/${code}.srt`,
    });
  }
  return items;
}

function uniqValues(values = []) {
  return [...new Set(values.map((v) => text(v)).filter(Boolean))];
}

function normalizeCategoryFilters(raw = {}) {
  const filters = raw && typeof raw === "object" ? raw : {};
  return {
    class: text(filters.class || filters.type || filters.cate || ""),
    area: text(filters.area || ""),
    year: text(filters.year || ""),
    by: text(filters.by || filters.sort || "newstime") || "newstime",
  };
}

function buildFilterPath(categoryId, page = 1, rawFilters = {}) {
  const filters = normalizeCategoryFilters(rawFilters);
  const genre = filters.class;
  const area = filters.area;
  const year = filters.year;
  const sort = SORT_MAP[filters.by] || "newstime";
  const pagePart = page <= 1 ? "" : `${page - 1}`;
  return `${LANG_PATH}/${categoryId}/${genre}-${area}-${year}-${pagePart}-${sort}.html`;
}

function extractFilterValues($, root, currentText = "") {
  const values = [];
  $(root).find("a").each((_, el) => {
    const name = text($(el).text());
    if (!name || name === currentText) return;
    values.push(name);
  });
  return uniqValues(values);
}

function buildCategoryFilters($) {
  const groups = [];
  const dls = $(".lists-content.filter dl");
  if (!dls.length) return groups;

  const typeValues = extractFilterValues($, dls.eq(0), "全部");
  if (typeValues.length) {
    groups.push({
      key: "class",
      name: "类型",
      init: "",
      value: [{ name: "全部", value: "" }, ...typeValues.map((v) => ({ name: v, value: v }))],
    });
  }

  const areaValues = extractFilterValues($, dls.eq(1), "全部");
  if (areaValues.length) {
    groups.push({
      key: "area",
      name: "地区",
      init: "",
      value: [{ name: "全部", value: "" }, ...areaValues.map((v) => ({ name: v, value: v }))],
    });
  }

  const yearValues = extractFilterValues($, dls.eq(2), "全部");
  if (yearValues.length) {
    groups.push({
      key: "year",
      name: "年份",
      init: "",
      value: [{ name: "全部", value: "" }, ...yearValues.map((v) => ({ name: v, value: v }))],
    });
  }

  groups.push({
    key: "by",
    name: "排序",
    init: "newstime",
    value: [
      { name: "按时间", value: "newstime" },
      { name: "按人气", value: "onclick" },
      { name: "按评分", value: "rating" },
    ],
  });

  return groups;
}

function buildM3u8DataUrl(m3u8Text) {
  return `data:application/vnd.apple.mpegurl;base64,${Buffer.from(String(m3u8Text || ""), "utf8").toString("base64")}`;
}

function rewritePpnixM3u8LikeWeb(m3u8Text) {
  const keyUrl = `${BASE_URL}/info/m3u8/key`;
  return String(m3u8Text || "")
    .replace(/URI="\.\.\/key"/g, `URI="${keyUrl}"`);
}

function rewritePpnixM3u8ForTvbox(m3u8Text) {
  const keyUrl = `${BASE_URL}/info/m3u8/key`;
  return String(m3u8Text || "")
    .replace(/URI="\.\.\/key"/g, `URI="${keyUrl}"`)
    .replace(/https:\/\/ipfs\.ppnix\.com\/ipfs\//g, `${PPNIX_SEGMENT_HOST}/ipfs/`);
}

async function home(params, context) {
  try {
    const [homePage, moviePage, tvPage] = await Promise.all([
      requestPage(`${LANG_PATH}/`),
      requestPage(buildFilterPath("movie", 1, {})),
      requestPage(buildFilterPath("tv", 1, {})),
    ]);

    const $home = cheerio.load(homePage.html);
    const $movie = cheerio.load(moviePage.html);
    const $tv = cheerio.load(tvPage.html);

    const blocks = $home(".lists-content ul");
    const movieList = blocks.eq(0).length ? mapListItems($home, blocks.eq(0).find("li"), "movie") : [];
    const tvList = blocks.eq(1).length ? mapListItems($home, blocks.eq(1).find("li"), "tv") : [];
    const list = [...movieList, ...tvList].slice(0, 30);

    const filters = {
      movie: buildCategoryFilters($movie),
      tv: buildCategoryFilters($tv),
    };

    OmniBox.log("info", `[home] 分类=${CATEGORIES.length}, 推荐=${list.length}, movieFilters=${filters.movie?.length || 0}, tvFilters=${filters.tv?.length || 0}`);
    return {
      class: CATEGORIES,
      filters,
      list,
    };
  } catch (error) {
    OmniBox.log("error", `[home] 失败: ${error.message}`);
    return { class: CATEGORIES, filters: {}, list: [] };
  }
}

async function category(params, context) {
  try {
    const categoryId = text(params.categoryId || params.type_id || "movie");
    const page = parseInt(params.page || "1", 10) || 1;
    const rawFilters = params.filters || params.extend || {};
    const path = buildFilterPath(categoryId, page, rawFilters);
    const { html } = await requestPage(path);
    const $ = cheerio.load(html);

    const list = mapListItems($, ".lists-content > ul > li, .lists .lists-content ul li", categoryId)
      .filter((item) => item.vod_id.includes(`/${categoryId}/`));

    let pagecount = page;
    const pagerHtml = $(".pagination, .pages, .pagenavi").html() || "";
    const matches = [...pagerHtml.matchAll(/---(\d+)-\.html/g)].map((m) => Number(m[1]) + 1);
    if (matches.length > 0) {
      pagecount = Math.max(page, ...matches);
    }

    const categoryFilters = buildCategoryFilters($);
    OmniBox.log("info", `[category] categoryId=${categoryId}, page=${page}, path=${path}, list=${list.length}, pagecount=${pagecount}`);
    return {
      list,
      page,
      pagecount,
      total: list.length,
      filters: categoryFilters.length ? { [categoryId]: categoryFilters } : {},
    };
  } catch (error) {
    OmniBox.log("error", `[category] 失败: ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0, filters: {} };
  }
}

async function detail(params, context) {
  try {
    const videoId = text(params.videoId || "");
    if (!videoId) return { list: [] };

    const { html, url } = await requestPage(videoId);
    const $ = cheerio.load(html);

    const titleRaw = text($("h1.product-title").text());
    const vodName = titleRaw.replace(/\s*\([^)]*\)\s*$/, "").trim() || text($("title").text()).replace(/\s*\([^)]*\).*/, "");
    const vodPic = fixImage($("header.product-header img.thumb").attr("src") || "");
    const vodContent = text($(".product-excerpt").filter((_, el) => $(el).text().includes("简介：")).text()).replace(/^简介：/, "").trim();
    const vodDirector = text($(".product-excerpt").filter((_, el) => $(el).text().includes("导演：")).find("span").text());
    const vodActor = text($(".product-excerpt").filter((_, el) => $(el).text().includes("主演：")).find("span").text()).replace(/\s*\/\s*/g, ",");
    const vodYear = ((titleRaw.match(/\((\d{4})\)/) || [])[1]) || "";

    const { infoId, items } = parseM3u8List(html);
    const episodes = items.map((item, idx) => ({
      name: item,
      playId: buildPlayId({
        infoId: infoId || ((videoId.match(/(\d+)\.html/) || [])[1] || ""),
        param: item,
        referer: url,
        name: vodName,
        episodeName: item,
        subtitleBase: `${BASE_URL}/info/subtitle/${infoId || ((videoId.match(/(\d+)\.html/) || [])[1] || "")}/${item}`,
      }),
    }));

    const vod = {
      vod_id: videoId,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_year: vodYear,
      vod_director: vodDirector,
      vod_actor: vodActor,
      vod_content: vodContent,
      vod_play_sources: episodes.length ? [{ name: "PPnix", episodes }] : undefined,
    };

    OmniBox.log("info", `[detail] infoId=${infoId}, episodes=${episodes.length}`);
    return { list: [vod] };
  } catch (error) {
    OmniBox.log("error", `[detail] 失败: ${error.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = text(params.keyword || params.wd || "");
    const page = parseInt(params.page || "1", 10) || 1;
    if (!keyword) return { list: [], page: 1, pagecount: 0, total: 0 };

    const encoded = encodeURIComponent(keyword);
    const sortSuffix = page <= 1 ? "" : `-page-${page}`;
    const path = `${LANG_PATH}/search/${encoded}--.html${sortSuffix}`;
    const { html } = await requestPage(path);
    const $ = cheerio.load(html);

    const list = mapListItems($, ".lists-content > ul > li, .lists .lists-content ul li")
      .filter((item) => /\/(movie|tv)\/\d+\.html/.test(item.vod_id));

    OmniBox.log("info", `[search] keyword=${keyword}, page=${page}, list=${list.length}`);
    return {
      list,
      page,
      pagecount: page,
      total: list.length,
    };
  } catch (error) {
    OmniBox.log("error", `[search] 失败: ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0 };
  }
}

async function play(params, context) {
  try {
    const meta = parsePlayId(params.playId || "");
    const infoId = text(meta.infoId || "");
    const param = text(meta.param || "");
    if (!infoId || !param) {
      throw new Error("playId 参数不完整");
    }

    const referer = text(meta.referer || `${BASE_URL}${LANG_PATH}/`);
    const from = text(context?.from || "") || "unknown";
    const shouldUseLeanHeader = from === "tvbox";
    const cfCookie = shouldUseLeanHeader ? "" : await ensureCfCookie(false, referer);
    const header = shouldUseLeanHeader ? {} : {
      Referer: referer,
      Origin: BASE_URL,
      "User-Agent": USER_AGENT,
      ...buildCookieHeader(cfCookie),
    };

    const sourceUrl = `${BASE_URL}/info/m3u8/${infoId}/${encodeURIComponent(param)}.m3u8`;
    const episodeName = text(meta.episodeName || param || "播放");
    const subtitles = PPNIX_ENABLE_SUBTITLES ? buildSubtitleSelector(infoId, param) : [];

    if (from === "tvbox") {
      try {
        const rawM3u8 = await fetchText(sourceUrl, {});
        const rewritten = rewritePpnixM3u8ForTvbox(rawM3u8);
        const finalUrl = buildM3u8DataUrl(rewritten);
        OmniBox.log("info", `[play] 返回 tvbox 专用内联 m3u8: infoId=${infoId}, param=${param}, from=${from}, leanHeader=${shouldUseLeanHeader ? "yes" : "no"}, cookie=${cfCookie ? "yes" : "no"}, subtitles=${subtitles.length}`);
        return {
          urls: [{ name: episodeName, url: finalUrl }],
          header,
          parse: 0,
          danmaku: [],
          subtitles};
      } catch (error) {
        OmniBox.log("warn", `[play] tvbox 内联 m3u8 失败，回退原始地址: ${error.message}`);
      }
    }

    if (PPNIX_REWRITE_M3U8) {
      try {
        const rawM3u8 = await fetchText(sourceUrl, header);
        const rewritten = rewritePpnixM3u8LikeWeb(rawM3u8);
        const finalUrl = buildM3u8DataUrl(rewritten);
        OmniBox.log("info", `[play] 返回重写 data-url: infoId=${infoId}, param=${param}, from=${from}, leanHeader=${shouldUseLeanHeader ? "yes" : "no"}, cookie=${cfCookie ? "yes" : "no"}, subtitles=${subtitles.length}`);
        return {
          urls: [{ name: episodeName, url: finalUrl }],
          header,
          parse: 0,
          danmaku: [],
          subtitles};
      } catch (error) {
        OmniBox.log("warn", `[play] 官网链路重写失败，回退原始地址: ${error.message}`);
      }
    }

    OmniBox.log("info", `[play] 返回原始 m3u8: infoId=${infoId}, param=${param}, from=${from}, leanHeader=${shouldUseLeanHeader ? "yes" : "no"}, cookie=${cfCookie ? "yes" : "no"}, subtitles=${subtitles.length}`);
    return {
      urls: [{ name: episodeName, url: sourceUrl }],
      header,
      parse: 0,
      danmaku: [],
      subtitles};
  } catch (error) {
    OmniBox.log("error", `[play] 失败: ${error.message}`);
    return { urls: [], header: {}, parse: 1, danmaku: [] };
  }
}

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

});

_load(1, "乐兔", function (module, exports, require) {
// @name 乐兔
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持，广告：有
// @dependencies: axios, cheerio
// @version 1.1.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/乐兔.js

const axios = require("axios");
const http = require("http");
const https = require("https");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const HOST = process.env.LETU_HOST || process.env.QQYS_HOST || "https://www.qqys01.com";
const DANMU_API = process.env.DANMU_API || "";
const PAGE_LIMIT = 20;

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
  Referer: `${HOST}/`,
};

const axiosInstance = axios.create({
  timeout: 15000, // 正向优化：将 60s 超时缩短为 15s，防止网络不佳时 App 长时间卡死
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false, family: 4 }),
  httpAgent: new http.Agent({ keepAlive: true }),
});

// ==================== 日志工具 ====================
function logInfo(message, data = null) {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[乐兔] ${output}`);
}

function logError(message, error) {
  OmniBox.log("error", `[乐兔] ${message}: ${error?.message || error}`);
}

// ==================== 通用工具 ====================
function e64(text) {
  try { return Buffer.from(String(text || ""), "utf8").toString("base64"); } catch { return ""; }
}

function d64(text) {
  try { return Buffer.from(String(text || ""), "base64").toString("utf8"); } catch { return ""; }
}

function encodeMeta(obj) {
  try { return e64(JSON.stringify(obj || {})); } catch { return ""; }
}

function decodeMeta(str) {
  try { return JSON.parse(d64(str || "") || "{}"); } catch { return {}; }
}

function toAbsUrl(pathOrUrl) {
  const v = String(pathOrUrl || "");
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `${HOST}${v.startsWith("/") ? "" : "/"}${v}`;
}

function getClasses() {
  return [
    { type_id: "1", type_name: "电影" },
    { type_id: "2", type_name: "电视剧" },
    { type_id: "3", type_name: "综艺" },
    { type_id: "4", type_name: "动漫" },
    // 新站分类只有 1-4，5 是资讯页，不能作为影视分类
  ];
}

function getFilters() {
  return {};
}

function normalizeVodId(href) {
  const value = String(href || "");
  const match = value.match(/\/voddetail(\d+)\.html/);
  return match ? `/voddetail${match[1]}.html` : value;
}

function normalizePicUrl(value) {
  const pic = String(value || "");
  return pic ? toAbsUrl(pic) : "";
}

function parseCardList(html) {
  const $ = cheerio.load(html || "");
  const list = [];
  const seen = new Set();

  $(".module-poster-item, .module-card-item").each((_, element) => {
    const $el = $(element);
    const $link = $el.is("a") ? $el : $el.find("a").first();
    const href = normalizeVodId($link.attr("href"));
    const name = ($el.attr("title") || $link.attr("title") || $el.find(".module-poster-item-title").first().text() ||
      $el.find(".module-card-item-title strong").first().text() || $link.find("strong").first().text()).trim();
    const pic = normalizePicUrl($el.find("img[data-original]").first().attr("data-original") || $el.find("img").first().attr("src"));
    const remark = $el.find(".module-item-note").first().text().trim() ||
      ($el.find(".module-info-item-content").first().text().trim() ? $el.find(".module-info-item-content").first().text().trim().split("/")[0].trim() : "");

    if (name && href && !seen.has(href)) {
      seen.add(href);
      list.push({
        vod_id: href,
        vod_name: name,
        vod_pic: pic,
        vod_remarks: remark,
      });
    }
  });

  return list;
}

function parsePageCount($, fallbackPage = 1) {
  const pages = [fallbackPage];
  $(".page-number").each((_, element) => {
    const page = parseInt($(element).text().trim(), 10);
    if (page > 0) pages.push(page);
  });
  const tail = $(".page-next[title='尾页']").attr("href") || "";
  const tailMatch = tail.match(/(?:page\/|-)(\d+)(?:\.html)?(?:---\d+)?\.html?$/);
  if (tailMatch) pages.push(parseInt(tailMatch[1], 10));
  return Math.max(...pages);
}

function convertToPlaySources($, vodName = "", videoId = "") {
  const sourceNames = $(".module-tab-items .module-tab-item")
    .map((_, element) => ($(element).attr("data-dropdown-value") || $(element).text().trim() || `线路${_ + 1}`).trim())
    .get();

  const sourcePanels = $(".module-list.sort-list.tab-list").toArray();

  return sourcePanels
    .map((panel, sourceIndex) => {
      const sourceName = sourceNames[sourceIndex] || `线路${sourceIndex + 1}`;
      const episodes = $(panel).find("a.module-play-list-link").toArray()
        .map((element, episodeIndex) => {
          const $link = $(element);
          const href = $link.attr("href") || "";
          if (!href) return null;
          const epName = ($link.attr("title") || $link.text() || `第${episodeIndex + 1}集`)
            .replace(/^播放/, "")
            .trim();
          const fid = `${videoId}#${sourceIndex}#${episodeIndex}`;
          const playData = { id: href, v: vodName, e: epName, sid: String(videoId || ""), fid };
          return {
            name: epName,
            playId: `${href}|||${e64(JSON.stringify(playData))}`,
            _fid: fid,
            _rawName: epName,
          };
        })
        .filter(Boolean);

      return episodes.length ? { name: sourceName, episodes } : null;
    })
    .filter(Boolean);
}

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

async function sniffLetuPlay(playUrl) {
  if (!playUrl) return null;
  try {
    logInfo("尝试嗅探播放页", playUrl);
    const sniffed = await OmniBox.sniffVideo(playUrl);
    if (sniffed && sniffed.url) {
      logInfo("嗅探成功", { sniffUrl: sniffed.url?.slice(0, 120) });
      return {
        urls: [{ name: "嗅探线路", url: sniffed.url }],
        parse: 0,
        header: sniffed.header || { ...DEFAULT_HEADERS, Referer: playUrl },
      };
    }
  } catch (error) {
    logInfo(`嗅探失败: ${error.message}`);
  }
  return null;
}

async function matchDanmu(fileName) {
  if (!DANMU_API || !fileName) return [];

  try {
    const response = await OmniBox.request(`${DANMU_API}/api/v2/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({ fileName }),
    });

    if (response.statusCode !== 200) return [];
    const matchData = JSON.parse(response.body);
    if (!matchData.isMatched) return [];

    const matches = matchData.matches || [];
    if (matches.length === 0) return [];

    const firstMatch = matches[0];
    const episodeId = firstMatch.episodeId;
    if (!episodeId) return [];

    const animeTitle = firstMatch.animeTitle || "";
    const episodeTitle = firstMatch.episodeTitle || "";
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
    return [];
  }
}

async function getCategoryList(type, page = 1) {
  try {
    const tid = type || "1";
    const pg = page || 1;
    const url = `${HOST}/vodshow/${tid}--------${pg}---1.html`;
    const fallbackUrl = pg === 1 ? `${HOST}/vodtype/${tid}.html` : url;

    logInfo("获取分类列表", { type: tid, page: pg, url });
    let response;
    try {
      response = await axiosInstance.get(url, { headers: DEFAULT_HEADERS });
    } catch (error) {
      if (pg === 1) {
        logInfo("分类分页请求失败，尝试备用页", fallbackUrl);
        response = await axiosInstance.get(fallbackUrl, { headers: DEFAULT_HEADERS });
      } else {
        throw error;
      }
    }

    const $ = cheerio.load(response.data || "");
    const list = parseCardList(response.data);
    const pagecount = parsePageCount($, pg);
    logInfo("分类列表获取成功", { count: list.length, page: pg, pagecount });

    return {
      list,
      page: parseInt(pg, 10),
      pagecount,
      limit: PAGE_LIMIT,
      total: pagecount * PAGE_LIMIT,
    };
  } catch (error) {
    logError("获取分类失败", error);
    return { list: [], page: 1, pagecount: 1, limit: PAGE_LIMIT, total: 0 };
  }
}

async function getDetailById(id) {
  try {
    const detailUrl = toAbsUrl(id);
    logInfo("获取详情页", { detailUrl });
    const response = await axiosInstance.get(detailUrl, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(response.data || "");

    const vodName = $("h1").first().text().trim();
    const vodPic = normalizePicUrl($(".module-info-poster img[data-original]").first().attr("data-original") ||
      $(".module-info-poster img").first().attr("src") || $("img").first().attr("src"));

    const metadataTitles = $(".module-info-item-title").map((_, element) => $(element).text().trim()).get();
    const metadataContents = $(".module-info-item-content").map((_, element) => $(element).text().trim()).get();
    const findMeta = (...names) => {
      for (const name of names) {
        const index = metadataTitles.findIndex((title) => title.startsWith(name));
        if (index >= 0 && metadataContents[index]) return metadataContents[index];
      }
      return "";
    };
    const vodDirector = findMeta("导演", "導演");
    const vodActor = findMeta("主演", "主演");
    const vodArea = findMeta("地区", "地區");
    const vodRemarks = findMeta("备注", "備註");
    const vodYear = ($(".module-info-tag-link a").first().attr("title") || "").trim();
    const vodTypeName = $(".module-info-tag-link a").map((_, element) => $(element).text().trim()).get().filter(Boolean).slice(2).join(",");
    const vodContent = $(".module-info-introduction-content").last().text().trim();

    const videoIdForScrape = String(id || "");
    const playSources = convertToPlaySources($, vodName, videoIdForScrape);

    let scrapeData = null;
    let videoMappings = [];
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
        const scrapingResult = await OmniBox.processScraping(videoIdForScrape, vodName || "", vodName || "", scrapeCandidates);
        logInfo("刮削处理完成", { count: scrapeCandidates.length, result: JSON.stringify(scrapingResult || {}).slice(0, 120) });
        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
        scrapeData = metadata?.scrapeData || null;
        videoMappings = metadata?.videoMappings || [];
      } catch (error) {
        logError("刮削处理失败", error);
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

    const normalizedPlaySources = playSources.map((source) => ({
      name: source.name,
      episodes: (source.episodes || []).map((ep) => ({
        name: ep.name,
        playId: ep.playId,
      })),
    }));

    return {
      vod_id: id,
      vod_name: scrapeData?.title || vodName,
      vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : vodPic,
      vod_type: vodTypeName || findMeta("类型", "類型"),
      vod_year: vodYear,
      vod_remarks: vodRemarks,
      vod_area: vodArea,
      vod_actor:
        (scrapeData?.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(",") || vodActor,
      vod_director:
        (scrapeData?.credits?.crew || [])
          .filter((c) => c?.job === "Director" || c?.department === "Directing")
          .slice(0, 3)
          .map((c) => c?.name)
          .filter(Boolean)
          .join(",") || vodDirector,
      vod_content: scrapeData?.overview || vodContent,
      vod_play_sources: normalizedPlaySources,
    };
  } catch (error) {
    logError("获取详情失败", error);
    return null;
  }
}

async function getPlay(playId, vodName = "", episodeName = "", vodId = "") {
  try {
    let realPlayId = playId;
    let playMeta = {};
    let scrapedDanmuFileName = "";

    if (typeof playId === "string" && playId.includes("|||")) {
      const [rawPlayId, metaB64] = playId.split("|||");
      realPlayId = rawPlayId || playId;
      const passedMeta = decodeMeta(metaB64 || "");
      if (passedMeta && typeof passedMeta === "object") {
        playMeta = { ...passedMeta, ...playMeta };
        vodName = passedMeta.v || vodName;
        episodeName = passedMeta.e || episodeName;
      }
    }

    try {
      const sourceVideoId = String(vodId || playMeta.sid || "");
      if (sourceVideoId) {
        const metadata = await OmniBox.getScrapeMetadata(sourceVideoId);
        if (metadata && metadata.scrapeData) {
          const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === playMeta?.fid);
          scrapedDanmuFileName = buildScrapedDanmuFileName(
            metadata.scrapeData,
            metadata.scrapeType || "",
            mapping,
            vodName,
            episodeName
          );
          if (metadata.scrapeData.title) vodName = metadata.scrapeData.title;
          if (mapping?.episodeName) episodeName = mapping.episodeName;
        }
      }
    } catch (error) {}

    const playPageUrl = toAbsUrl(realPlayId);
    const response = await axiosInstance.get(playPageUrl, { headers: DEFAULT_HEADERS });
    const html = String(response.data || "");

    let directVideoUrl = "";

    try {
      const playerMatch = html.match(/var\s+player_data\s*=\s*(\{[\s\S]*?\})\s*<\/script>/i) ||
        html.match(/player_\w+\s*=\s*(\{[\s\S]*?\})\s*[;,]/i);
      if (playerMatch && playerMatch[1]) {
        const conf = JSON.parse(playerMatch[1].replace(/'/g, '"'));
        let videoUrl = conf.url || "";

        if (String(conf.encrypt) === "1") {
          videoUrl = decodeURIComponent(videoUrl);
        } else if (String(conf.encrypt) === "2") {
          try {
            videoUrl = decodeURIComponent(Buffer.from(videoUrl, "base64").toString("utf8"));
          } catch {
            try {
              videoUrl = Buffer.from(decodeURIComponent(videoUrl), "base64").toString("utf8");
            } catch {
              videoUrl = Buffer.from(videoUrl, "base64").toString("utf8");
            }
          }
        }

        if (videoUrl.startsWith("rose_")) {
          try {
            videoUrl = Buffer.from(decodeURIComponent(videoUrl.substring(5)), "base64").toString("utf8");
          } catch {
            videoUrl = Buffer.from(videoUrl.substring(5), "base64").toString("utf8");
          }
        }

        if (videoUrl && !/^https?:\/\//i.test(videoUrl) && videoUrl.startsWith("/")) {
          videoUrl = toAbsUrl(videoUrl);
        }

        if (videoUrl && (/^https?:\/\//i.test(videoUrl) || videoUrl.match(/\.(m3u8|mp4|flv|avi|mkv|ts)(?:$|\?)/i))) {
          directVideoUrl = videoUrl;
        } else if (videoUrl) {
          logInfo("播放配置未得到直链", videoUrl.slice(0, 160));
        }
      }
    } catch (error) {
      logInfo("解析播放配置失败", error?.message || error);
    }

    if (!directVideoUrl) {
      const linkMatch = html.match(/(?:data-src|data-url|src)\s*=\s*["']([^"']*\.(?:m3u8|mp4|flv|avi|mkv|ts)[^"']*)["']/i);
      if (linkMatch) directVideoUrl = linkMatch[1].startsWith("/") ? toAbsUrl(linkMatch[1]) : linkMatch[1];
    }

    if (directVideoUrl) {
      const playResponse = {
        urls: [{ name: "播放", url: directVideoUrl }],
        parse: 0,
        header: {
          ...DEFAULT_HEADERS,
          Referer: `${HOST}/`,
        },
      };

      if (DANMU_API && vodName) {
        const fileName = scrapedDanmuFileName || buildFileNameForDanmu(vodName, episodeName);
        if (fileName) {
          const danmakuList = await matchDanmu(fileName);
          if (danmakuList.length > 0) playResponse.danmaku = danmakuList;
        }
      }
      return playResponse;
    }

    const sniffResult = await sniffLetuPlay(playPageUrl);
    if (sniffResult) return sniffResult;

    return {
      urls: [{ name: "解析", url: playPageUrl }],
      parse: 1,
      header: { ...DEFAULT_HEADERS, Referer: `${HOST}/` },
    };
  } catch (error) {
    const fallbackPlayUrl = toAbsUrl(playId.split("|||")[0]);
    const sniffResult = await sniffLetuPlay(fallbackPlayUrl);
    if (sniffResult) return sniffResult;

    return {
      urls: [{ name: "解析", url: fallbackPlayUrl }],
      parse: 1,
      header: { ...DEFAULT_HEADERS, Referer: `${HOST}/` },
    };
  }
}

// ==================== 核心修复：搜索功能 ====================
async function getSearch(keyword, page = 1) {
  try {
    const pg = page || 1;
    const wd = encodeURIComponent(String(keyword || "").trim());
    
    // 新站表单为 /vodsearch.html?wd=...，查询式结果更精确
    const url = pg > 1
      ? `${HOST}/vodsearch/page/${pg}.html?wd=${wd}`
      : `${HOST}/vodsearch.html?wd=${wd}`;
    const backupUrl = `${HOST}/vodsearch/${wd}----------${pg}---.html`;

    logInfo("执行搜索", { keyword, page: pg, url });

    let response;
    try {
      response = await axiosInstance.get(url, { headers: DEFAULT_HEADERS });
    } catch (e) {
      logInfo("Query 搜索失败，尝试伪静态形式", backupUrl);
      response = await axiosInstance.get(backupUrl, { headers: DEFAULT_HEADERS });
    }

    const html = response.data;
    const $ = cheerio.load(html);
    const list = parseCardList(html);
    const pagecount = parsePageCount($, pg);

    logInfo("搜索完成", { keyword, count: list.length, page: pg, pagecount });

    return {
      list,
      page: parseInt(pg, 10),
      pagecount,
      limit: PAGE_LIMIT,
      total: pagecount * PAGE_LIMIT,
    };
  } catch (error) {
    logError("搜索失败", error);
    return { list: [], page: 1, pagecount: 1, limit: PAGE_LIMIT, total: 0 };
  }
}

// ==================== 标准接口 ====================
async function home(params) {
  const classes = getClasses();
  const result = await getCategoryList("1", 1);

  return {
    class: classes,
    filters: getFilters(),
    list: result.list || [],
    page: 1,
    pagecount: result.pagecount || 1,
    total: result.total || 0,
    limit: result.limit || PAGE_LIMIT,
  };
}

async function category(params) {
  const type = params?.categoryId || params?.id || "1";
  const page = parseInt(params?.page, 10) || 1;
  return getCategoryList(type, page);
}

async function detail(params) {
  try {
    const id = params?.videoId || params?.id || "";
    if (!id) return { list: [] };
    const vod = await getDetailById(id);
    return { list: vod ? [vod] : [] };
  } catch (error) {
    logError("detail 失败", error);
    return { list: [] };
  }
}

async function search(params) {
  const wd = params?.keyword || params?.wd || "";
  const page = parseInt(params?.page, 10) || 1;
  if (!wd) return { list: [], page: 1, pagecount: 1, limit: PAGE_LIMIT, total: 0 };
  return getSearch(wd, page);
}

async function play(params) {
  const playId = params?.playId || params?.id || "";
  const vodName = params?.vodName || "";
  const episodeName = params?.episodeName || "";
  const vodId = params?.vodId || "";
  if (!playId) {
    return {
      urls: [{ name: "解析", url: "" }],
      parse: 1,
      header: DEFAULT_HEADERS,
    };
  }
  return getPlay(playId, vodName, episodeName, vodId);
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

_load(2, "如意资源", function (module, exports, require) {
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

_load(3, "新韩剧网", function (module, exports, require) {
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

_load(4, "柯南影视", function (module, exports, require) {
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

_load(5, "热播", function (module, exports, require) {
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

_load(6, "独播库", function (module, exports, require) {
// @name 独播库
// @author @caipeibin
// @description 
// @dependencies: axios
// @version 1.1.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/独播库.js


/** 
 * OmniBox 爬虫脚本 - 独播库
 * 
 * 说明：
 * 1. 基于原始 TVBox T4 脚本逻辑转换为 OmniBox 标准 JS 模板。
 * 2. 实现了 `home` / `category` / `search` / `detail` / `play` 五个标准接口。
 * 3. 保留了原脚本的签名 (`sign`, `token`, `ssid`) 和 Base64 解码逻辑。
 */

const axios = require("axios");
const http = require("http");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const HOST = "https://api.dbokutv.com";
const REFERER_HOST = "https://www.duboku.tv";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
    "User-Agent": UA,
    "Content-Type": "application/json",
    "Referer": `${REFERER_HOST}/`,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive"
};

const DANMU_API = process.env.DANMU_API || "";

const axiosInstance = axios.create({
    timeout: 15 * 1000,
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
    httpAgent: new http.Agent({ keepAlive: true }),
});

// ==================== 日志工具 ====================
function logInfo(message, data = null) {
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    OmniBox.log("info", `[独播库] ${output}`);
}
function logError(message, error) {
    OmniBox.log("error", `[独播库] ${message}: ${error?.message || error}`);
}

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

// ==================== 辅助函数 ====================
const decodeDubokuData = (data) => {
    if (!data || typeof data !== 'string') return '';
    const strippedStr = data.trim().replace(/['"]/g, '');
    if (!strippedStr) return '';
    const segmentLength = 10;
    try {
        let processedBase64 = '';
        for (let i = 0; i < strippedStr.length; i += segmentLength) {
            const segment = strippedStr.slice(i, i + segmentLength);
            processedBase64 += segment.split('').reverse().join('');
        }
        processedBase64 = processedBase64.replace(/\./g, '=');
        const paddingNeeded = 4 - (processedBase64.length % 4);
        if (paddingNeeded !== 4) {
            processedBase64 += '='.repeat(paddingNeeded);
        }
        const decodedBytes = Buffer.from(processedBase64, 'base64');
        return decodedBytes.toString('utf-8');
    } catch (error) {
        logError('解码错误', error);
        return '';
    }
};

const generateRandomString = (length) => {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
};

const interleaveStrings = (str1, str2) => {
    const result = [];
    const minLength = Math.min(str1.length, str2.length);
    for (let i = 0; i < minLength; i++) {
        result.push(str1[i]);
        result.push(str2[i]);
    }
    result.push(str1.slice(minLength));
    result.push(str2.slice(minLength));
    return result.join('');
};

const generateSignature = (url) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const randomNumber = Math.floor(Math.random() * 800000000);
    const valueA = randomNumber + 100000000;
    const valueB = 900000000 - randomNumber;
    const interleaved = interleaveStrings(`${valueA}${valueB}`, timestamp.toString());
    const ssid = Buffer.from(interleaved).toString('base64').replace(/=/g, '.');
    const sign = generateRandomString(60);
    const token = generateRandomString(38);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}sign=${sign}&token=${token}&ssid=${ssid}`;
};

const isDirectVideoUrl = (url) => {
    if (!url) return false;
    return /\.(m3u8|mp4|flv|avi|mkv|ts)(\?|$)/i.test(url);
};

const sniffDubokuPlay = async (playUrl) => {
    if (!playUrl) return null;
    try {
        logInfo("尝试嗅探播放页", playUrl);
        const sniffed = await OmniBox.sniffVideo(playUrl);
        if (sniffed && sniffed.url) {
            logInfo("嗅探成功", sniffed.url);
            return {
                urls: [{ name: "嗅探线路", url: sniffed.url }],
                parse: 0,
                header: sniffed.header || {
                    "User-Agent": UA,
                    "Referer": playUrl
                }
            };
        }
    } catch (error) {
        logInfo(`嗅探失败: ${error.message || error}`);
    }
    return null;
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
        const hit = scrapeData.episodes.find(
            (ep) => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber
        );
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
    if (scrapeType === "movie") {
        return scrapeData.title || fallbackVodName;
    }
    const title = scrapeData.title || fallbackVodName;
    const seasonAirYear = scrapeData.seasonAirYear || "";
    const seasonNumber = mapping?.seasonNumber || 1;
    const episodeNumber = mapping?.episodeNumber || 1;
    return `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
};

function preprocessTitle(title) {
    if (!title) return "";
    return title
        .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]|1280x720|1920x1080/g, " ")
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
    const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
    if (seMatch) return seMatch[1];
    const cnMatch = processedTitle.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
    if (cnMatch) return String(chineseToArabic(cnMatch[1]));
    const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
    if (epMatch) return epMatch[1];
    const bracketMatch = processedTitle.match(/[\[\(【（](\d{1,3})[\]\)】）]/);
    if (bracketMatch) {
        const num = bracketMatch[1];
        if (!["720", "1080", "480"].includes(num)) return num;
    }
    const standaloneMatches = processedTitle.match(/(?:^|[\s\-\._\[\]])(\d{1,3})(?![0-9pP])/g);
    if (standaloneMatches) {
        const candidates = standaloneMatches
            .map(m => m.match(/\d+/)[0])
            .filter(num => {
                const n = parseInt(num);
                return n > 0 && n < 300 && !["720", "480", "264", "265"].includes(num);
            });
        if (candidates.length > 0) {
            const normalEp = candidates.find(n => parseInt(n) < 100);
            return normalEp || candidates[0];
        }
    }
    return "";
}

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
            }
            return `${vodName} S01E${epNum}`;
        }
    }
    return vodName;
}

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
                "User-Agent": UA
            },
            body: JSON.stringify({ fileName: fileName })
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
        const danmakuURL = `${DANMU_API}/api/v2/comment/${episodeId}?format=xml`;
        logInfo(`弹幕匹配成功: ${danmakuName}`);
        return [{ name: danmakuName, url: danmakuURL }];
    } catch (error) {
        logInfo(`弹幕匹配失败: ${error.message || error}`);
        return [];
    }
}

// ==================== OmniBox 标准接口实现 ====================
async function home(params) {
    const classes = [
        { type_id: "2", type_name: "连续剧" },
        { type_id: "3", type_name: "综艺" },
        { type_id: "1", type_name: "电影" },
        { type_id: "4", type_name: "动漫" }
    ];
    const filters = {}; // 独播库无筛选

    try {
        const url = generateSignature(`${HOST}/home`);
        logInfo("获取首页推荐", { url });
        const response = await axiosInstance.get(url, { headers: DEFAULT_HEADERS });
        const data = response.data;
        const list = [];
        if (Array.isArray(data)) {
            data.forEach(category => {
                const vodList = category.VodList || [];
                vodList.forEach(vod => {
                    const vodId = vod.DId || vod.DuId || '';
                    const vodPic = vod.TnId || '';
                    list.push({
                        vod_id: decodeDubokuData(vodId),
                        vod_name: vod.Name || '',
                        vod_pic: decodeDubokuData(vodPic),
                        vod_remarks: vod.Tag || ''
                    });
                });
            });
        }
        logInfo(`获取到 ${list.length} 个首页推荐`);
        return { class: classes, filters, list: list.slice(0, 20) };
    } catch (error) {
        logError("获取首页数据失败", error);
        return { class: classes, filters, list: [] };
    }
}

async function category(params) {
    const categoryId = params.categoryId;
    const page = parseInt(params.page, 10) || 1;

    try {
        const pageStr = page === 1 ? '' : page.toString();
        const path = `/vodshow/${categoryId}--------${pageStr}---`;
        const url = generateSignature(HOST + path);
        logInfo(`获取分类列表: ${categoryId} 第 ${page} 页`, { url });
        const response = await axiosInstance.get(url, { headers: DEFAULT_HEADERS });
        const data = response.data;
        const list = [];

        if (data && data.VodList && Array.isArray(data.VodList)) {
            data.VodList.forEach(vod => {
                const vodId = vod.DId || vod.DuId || '';
                const vodPic = vod.TnId || '';
                list.push({
                    vod_id: decodeDubokuData(vodId),
                    vod_name: vod.Name || '',
                    vod_pic: decodeDubokuData(vodPic),
                    vod_remarks: vod.Tag || ''
                });
            });
        }

        // 简化分页，假设总页数很大
        return { list, page, pagecount: 9999, limit: 20, total: 999999 };
    } catch (error) {
        logError("获取分类数据失败", error);
        return { list: [], page: 1, pagecount: 0, limit: 0, total: 0 };
    }
}

async function search(params) {
    const keyword = params.keyword || "";
    const page = parseInt(params.page, 10) || 1;

    try {
        const baseUrl = generateSignature(`${HOST}/vodsearch`);
        const url = `${baseUrl}&wd=${encodeURIComponent(keyword)}`;
        logInfo(`搜索 "${keyword}"`, { url });
        const response = await axiosInstance.get(url, { headers: DEFAULT_HEADERS });
        const data = response.data;
        const list = [];
        if (Array.isArray(data)) {
            data.forEach(vod => {
                const vodId = vod.DId || vod.DuId || '';
                const vodPic = vod.TnId || '';
                list.push({
                    vod_id: decodeDubokuData(vodId),
                    vod_name: vod.Name || '',
                    vod_pic: decodeDubokuData(vodPic),
                    vod_remarks: vod.Tag || '',
                    vod_actor: vod.Actor || '',
                    vod_score: vod.Rating || ''
                });
            });
        }
        logInfo(`搜索 "${keyword}" 找到 ${list.length} 个结果`);
        return { list, page, pagecount: 1, limit: list.length, total: list.length };
    } catch (error) {
        logError("搜索失败", error);
        return { list: [], page: 1, pagecount: 0, limit: 0, total: 0 };
    }
}

async function detail(params) {
    const vodId = params.videoId;

    try {
        let detailPath = vodId.startsWith('/') ? vodId : '/' + vodId;
        const url = generateSignature(HOST + detailPath);
        logInfo("获取详情", { url });
        const response = await axiosInstance.get(url, { headers: DEFAULT_HEADERS });
        const data = response.data;
        if (!data) return { list: [] };

        let vod_play_url = '';
        const playList = [];
        let vod_play_sources = [];
        if (data.Playlist && Array.isArray(data.Playlist)) {
            data.Playlist.forEach(episode => {
                const episodeName = episode.EpisodeName || `第${playList.length + 1}集`;
                const videoId = decodeDubokuData(episode.VId || '');
                if (videoId) {
                    playList.push(`${episodeName}$${videoId}`);
                }
            });
            vod_play_url = playList.join('#');
            const videoIdForScrape = String(vodId || vod_id || "");
            vod_play_sources = [
                {
                    name: '独播库',
                    episodes: playList.map((item, epIndex) => {
                        const parts = item.split('$');
                        const episodeName = parts[0] || '播放';
                        const actualUrl = parts[1] || parts[0];
                        const fid = `${videoIdForScrape}#0#${epIndex}`;
                        const combinedId = `${actualUrl}|||${encodeMeta({ sid: String(videoIdForScrape || ""), fid, v: data.Name || "", e: episodeName })}`;
                        return {
                            name: episodeName,
                            playId: combinedId,
                            _fid: fid,
                            _rawName: episodeName
                        };
                    }).filter(ep => ep.playId)
                }
            ];
        }

        const vod_pic = decodeDubokuData(data.TnId || '');
        const vod_id = decodeDubokuData(data.DId || data.DuId || '') || vodId;
        const detail = {
            vod_id: vod_id,
            vod_name: data.Name || '',
            vod_pic: vod_pic || '',
            vod_remarks: data.Tag ? `评分：${data.Rating || '暂无'}` : '',
            vod_year: data.ReleaseYear || '',
            vod_area: data.Region || '',
            vod_actor: Array.isArray(data.Actor) ? data.Actor.join(',') : data.Actor || '',
            vod_director: data.Director || '',
            vod_content: data.Description || '',
            vod_play_from: '独播库',
            vod_play_url: vod_play_url,
            vod_play_sources: vod_play_sources,
            type_name: `${data.Genre || ''},${data.Scenario || ''},${data.Language || ''}`
        };

        if (vod_play_sources.length > 0) {
            const scrapeCandidates = [];
            for (const source of vod_play_sources) {
                for (const ep of source.episodes || []) {
                    if (!ep._fid) continue;
                    scrapeCandidates.push({
                        fid: ep._fid,
                        file_id: ep._fid,
                        file_name: ep._rawName || ep.name || "正片",
                        name: ep._rawName || ep.name || "正片",
                        format_type: "video"
                    });
                }
            }

            if (scrapeCandidates.length > 0) {
                try {
                    const videoIdForScrape = String(vod_id || "");
                    await OmniBox.processScraping(videoIdForScrape, detail.vod_name || "", detail.vod_name || "", scrapeCandidates);
                    const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                    const scrapeData = metadata?.scrapeData || null;
                    const videoMappings = metadata?.videoMappings || [];
                    const scrapeType = metadata?.scrapeType || "";
                    logInfo("刮削元数据读取完成", { hasScrapeData: !!scrapeData, mappingCount: videoMappings.length, scrapeType });

                    for (const source of vod_play_sources) {
                        for (const ep of source.episodes || []) {
                            const mapping = videoMappings.find((m) => m?.fileId === ep._fid);
                            if (!mapping) continue;
                            const oldName = ep.name;
                            const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
                            if (newName && newName !== oldName) {
                                ep.name = newName;
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

                    detail.vod_play_sources = vod_play_sources.map((source) => ({
                        name: source.name,
                        episodes: (source.episodes || []).map((ep) => ({
                            name: ep.name,
                            playId: ep.playId
                        }))
                    }));

                    if (scrapeData) {
                        detail.vod_name = scrapeData.title || detail.vod_name;
                        if (scrapeData.posterPath) {
                            detail.vod_pic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
                        }
                        if (scrapeData.overview) {
                            detail.vod_content = scrapeData.overview;
                        }
                        if (scrapeData.releaseDate) {
                            detail.vod_year = String(scrapeData.releaseDate).substring(0, 4) || detail.vod_year;
                        }
                        const actors = (scrapeData.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(",");
                        if (actors) {
                            detail.vod_actor = actors;
                        }
                        const directors = (scrapeData.credits?.crew || [])
                            .filter((c) => c?.job === "Director" || c?.department === "Directing")
                            .slice(0, 3)
                            .map((c) => c?.name)
                            .filter(Boolean)
                            .join(",");
                        if (directors) {
                            detail.vod_director = directors;
                        }
                    }
                } catch (error) {
                    logError("刮削处理失败", error);
                }
            }
        }

        logInfo(`详情获取成功，找到 ${playList.length} 个剧集`);
        return { list: [detail] };
    } catch (error) {
        logError("获取详情失败", error);
        return { list: [] };
    }
}

async function play(params) {
    let playUrl = params.playId;
    let vodName = "";
    let episodeName = "";
    let playMeta = {};

    try {
        if (playUrl && playUrl.includes("|||")) {
            const [mainPlayId, metaB64] = playUrl.split("|||");
            playUrl = mainPlayId;
            playMeta = decodeMeta(metaB64 || "");
            vodName = playMeta.v || "";
            episodeName = playMeta.e || "";
        }
        logInfo('处理播放URL', { playUrl });
        let finalUrl = playUrl;
        if (!playUrl.startsWith('http')) {
            if (playUrl.startsWith('/')) {
                finalUrl = HOST + playUrl;
            } else {
                finalUrl = HOST + '/' + playUrl;
            }
        }
        const signedUrl = generateSignature(finalUrl);
        logInfo('签名后的播放URL', { signedUrl });

        const response = await axiosInstance.get(signedUrl, { headers: DEFAULT_HEADERS });
        const data = response.data;
        if (!data || !data.HId) {
            logInfo('未找到播放地址，回退 parse=1');
            return {
                urls: [{ name: "回退", url: playUrl }],
                parse: 1,
                header: {
                    "User-Agent": UA,
                    "Referer": REFERER_HOST + "/",
                    "Origin": REFERER_HOST
                }
            };
        }

        const videoUrl = decodeDubokuData(data.HId);
        if (!videoUrl) {
            logInfo('视频地址解码失败，回退 parse=1');
            return {
                urls: [{ name: "回退", url: playUrl }],
                parse: 1,
                header: {
                    "User-Agent": UA,
                    "Referer": REFERER_HOST + "/",
                    "Origin": REFERER_HOST
                }
            };
        }

        logInfo('解码后的视频地址', { videoUrl });
        let playResponse = {
            urls: [{ name: "播放", url: videoUrl }],
            parse: isDirectVideoUrl(videoUrl) ? 0 : 1,
            header: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept-Encoding": "gzip, deflate",
                "origin": "https://w.duboku.io",
                "referer": "https://w.duboku.io/",
                "priority": "u=1, i"
            }
        };

        if (playResponse.parse === 1 && playResponse.urls[0]?.url) {
            const sniffResult = await sniffDubokuPlay(playResponse.urls[0].url);
            if (sniffResult) {
                playResponse = sniffResult;
            }
        }

        if (DANMU_API && (vodName || params.vodName)) {
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
                            vodName || params.vodName,
                            episodeName || params.episodeName
                        );
                    }
                }
            } catch (error) {
                logInfo(`读取刮削元数据失败: ${error.message || error}`);
            }

            const finalVodName = vodName || params.vodName;
            const finalEpisodeName = episodeName || params.episodeName || '';
            const fileName = scrapedDanmuFileName || buildFileNameForDanmu(finalVodName, finalEpisodeName);
            if (fileName) {
                const danmakuList = await matchDanmu(fileName);
                if (danmakuList && danmakuList.length > 0) {
                    playResponse.danmaku = danmakuList;
                }
            }
        }

        return playResponse;
    } catch (error) {
        logError("播放解析失败", error);
        const fallbackSniff = await sniffDubokuPlay(playUrl);
        if (fallbackSniff) {
            return fallbackSniff;
        }
        return {
            urls: [{ name: "回退", url: playUrl }],
            parse: 1,
            header: {
                "User-Agent": UA,
                "Referer": REFERER_HOST + "/",
                "Origin": REFERER_HOST
            }
        };
    }
}

module.exports = { home, category, search, detail, play };
const runner = require("spider_runner");
runner.run(module.exports);

});
