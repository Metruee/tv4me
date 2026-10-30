// @name 音乐听书聚合(合并)
// @version 2.20261030.1
// @description 自动同步：音乐听书
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-音乐听书.js
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


_load(0, "275听书", function (module, exports, require) {
// @name 275听书
// @author
// @description 275听书网有声小说源
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/听书/275听书.js

/**
 * OmniBox 听书源脚本：275听书
 *
 * 由 Python 版迁移为 OmniBox 标准五方法：home/category/search/detail/play。
 * 站点播放页依赖 PHP 会话，因此脚本会保存 Set-Cookie，并在直接播放时先初始化会话。
 */

const OmniBox = require("omnibox_sdk");

const SITE = "https://www.i275.com";
const SITE_HOST = new URL(SITE).hostname;
const DEFAULT_COVER = `${SITE}/uploads/bookcover.png`;
const PAGE_LIMIT = 20;
const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

const DEFAULT_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Referer: `${SITE}/`,
};

const CATEGORIES = [
  { type_id: "latest", type_name: "最近上架" },
  { type_id: "xuanhuan", type_name: "玄幻" },
  { type_id: "xiuxian", type_name: "修仙" },
  { type_id: "dushi", type_name: "都市" },
  { type_id: "yanqing", type_name: "言情" },
  { type_id: "chuanyue", type_name: "穿越" },
  { type_id: "chongsheng", type_name: "重生" },
  { type_id: "xuanyi", type_name: "悬疑" },
  { type_id: "lingyi", type_name: "灵异" },
  { type_id: "lishi", type_name: "历史" },
  { type_id: "wuxia", type_name: "武侠" },
  { type_id: "kehuan", type_name: "科幻" },
  { type_id: "wangyou", type_name: "网游" },
  { type_id: "guanchang", type_name: "官场" },
  { type_id: "junshi", type_name: "军事" },
  { type_id: "pingshu", type_name: "评书" },
  { type_id: "ertong", type_name: "儿童" },
  { type_id: "xiangsheng", type_name: "相声" },
  { type_id: "guangboju", type_name: "广播剧" },
  { type_id: "qita", type_name: "其他" },
];

const CATEGORY_QUERIES = {
  xuanhuan: "玄幻",
  xiuxian: "修仙",
  dushi: "都市",
  yanqing: "言情",
  chuanyue: "穿越",
  chongsheng: "重生",
  xuanyi: "悬疑",
  lingyi: "灵异",
  lishi: "历史",
  wuxia: "武侠",
  kehuan: "科幻",
  wangyou: "网游",
  guanchang: "官场",
  junshi: "军事",
  pingshu: "评书",
  ertong: "儿童",
  xiangsheng: "相声",
  guangboju: "广播剧",
  qita: "其他",
};

const cookieJar = {};
const searchCache = new Map();

function log(level, message) {
  try {
    OmniBox.log(level, `[275听书] ${message}`);
  } catch (_) {}
}

function pageNumber(value) {
  const page = parseInt(String(value || 1), 10);
  return Number.isNaN(page) ? 1 : Math.max(1, page);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function absoluteUrl(value, base = `${SITE}/`) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    return new URL(text, base).toString();
  } catch (_) {
    return text;
  }
}

function buildUrl(base, params = {}) {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(value) {
  const withoutTags = String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeHtml(withoutTags).replace(/[ \t\r\f\v]+/g, " ").trim();
}

function safeEpisodeName(value) {
  return String(value || "").replace(/\$/g, "￥").replace(/#/g, "﹟");
}

function getHeader(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === "function") {
    return headers.get(name) || headers.get(name.toLowerCase());
  }
  const wanted = String(name).toLowerCase();
  const key = Object.keys(headers).find((item) => item.toLowerCase() === wanted);
  return key ? headers[key] : undefined;
}

function splitSetCookie(value) {
  return String(value || "")
    .split(/,(?=\s*[^;,=\s]+=[^;,]*)/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function rememberCookies(headers, url) {
  if (new URL(url).hostname !== SITE_HOST) return;
  const raw = getHeader(headers, "set-cookie");
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  values.flatMap(splitSetCookie).forEach((item) => {
    const first = item.split(";", 1)[0];
    const index = first.indexOf("=");
    if (index <= 0) return;
    const name = first.slice(0, index).trim();
    const value = first.slice(index + 1).trim();
    if (name) cookieJar[name] = value;
  });
}

function currentCookie(url) {
  if (new URL(url).hostname !== SITE_HOST) return "";
  return Object.entries(cookieJar)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function requestText(path, options = {}) {
  const url = absoluteUrl(path);
  let lastResponse = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const cookie = currentCookie(url);
    const headers = {
      ...DEFAULT_HEADERS,
      ...(options.headers || {}),
      ...(cookie ? { Cookie: cookie } : {}),
    };

    const response = await OmniBox.request(url, {
      method: options.method || "GET",
      headers,
      timeout: options.timeout || 20000,
      ...(options.body !== undefined ? { body: options.body } : {}),
    });
    lastResponse = response;
    rememberCookies(response?.headers, url);

    const statusCode = Number(response?.statusCode || 0);
    if ((statusCode === 403 || statusCode === 429) && attempt === 0) {
      await delay(1100);
      continue;
    }
    if (statusCode !== 200) {
      throw new Error(`HTTP ${statusCode || "unknown"}: ${url}`);
    }
    return String(response?.body || "");
  }

  throw new Error(`HTTP ${lastResponse?.statusCode || "unknown"}: ${url}`);
}

function parseBooks(pageHtml) {
  const videos = [];
  const seen = new Set();
  const anchorPattern = /<a\s+href=["']\/book\/(\d+)\.html["'][^>]*>([\s\S]*?)<\/a>/gi;
  let anchorMatch;

  while ((anchorMatch = anchorPattern.exec(String(pageHtml || ""))) !== null) {
    const bookId = anchorMatch[1];
    const block = anchorMatch[2];
    const imageMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (!imageMatch || seen.has(bookId)) continue;

    const titleMatch =
      block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) ||
      block.match(/<div class=["']font-medium text-sm[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const altMatch = block.match(/<img[^>]+alt=["']([^"']+)["']/i);
    const title = cleanText(titleMatch?.[1] || altMatch?.[1] || "");
    if (!title) continue;

    const speakerMatch =
      block.match(/>演播<\/span>\s*([^<\r\n]+)/i) ||
      block.match(/<div class=["']text-xs text-gray-500[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

    seen.add(bookId);
    videos.push({
      vod_id: bookId,
      vod_name: title,
      vod_pic: absoluteUrl(decodeHtml(imageMatch[1])),
      vod_remarks: cleanText(speakerMatch?.[1] || ""),
    });
  }

  return videos;
}

function field(pageHtml, label) {
  const pattern = new RegExp(
    `<p>\\s*${String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}：\\s*<span[^>]*>([\\s\\S]*?)<\\/span>`,
    "i",
  );
  return cleanText(String(pageHtml || "").match(pattern)?.[1] || "");
}

function firstText(pageHtml, pattern) {
  return cleanText(String(pageHtml || "").match(pattern)?.[1] || "");
}

function extractCover(pageHtml) {
  const html = String(pageHtml || "");
  const imageMatch =
    html.match(/<div class=["']w-32 h-44[\s\S]*?<img[^>]+src=["']([^"']+)/i) ||
    html.match(/<img[^>]+src=["']([^"']*\/uploads\/[^"']+)["']/i);
  if (!imageMatch) return "";
  const picture = absoluteUrl(decodeHtml(imageMatch[1]));
  return picture.includes("bookcover.png") ? "" : picture;
}

function bookIdFrom(value) {
  const text = String(value || "");
  return text.match(/\/book\/(\d+)\.html/i)?.[1] || text.match(/\d+/)?.[0] || "";
}

function bookReferer(playUrl) {
  const bookId = String(playUrl || "").match(/\/play\/(\d+)\//)?.[1];
  return bookId ? `${SITE}/book/${bookId}.html` : `${SITE}/`;
}

async function resolveLrts(token) {
  const parts = String(token || "").split("#");
  const entityMatch = parts[0]?.match(/^lrts\$(\d+)$/);
  if (!entityMatch || parts.length < 3 || !/^\d+$/.test(parts[1]) || !/^\d+$/.test(parts[2])) {
    throw new Error("懒人听书资源标识格式错误");
  }

  const params = {
    entityId: entityMatch[1],
    entityType: 3,
    opType: 1,
    sections: `[${parts[2]}]`,
    type: 0,
    id: parts[1],
    section: parts[2],
  };
  let lastMessage = "";

  for (const endpoint of ["getPlayPath", "getListenPath"]) {
    const text = await requestText(
      buildUrl(`https://m.lrts.me/ajax/${endpoint}`, params),
      { headers: { Referer: "https://m.lrts.me/" } },
    );
    const payload = JSON.parse(text || "{}");
    const audioUrl = endpoint === "getPlayPath"
      ? payload?.list?.[0]?.path || ""
      : payload?.data?.path || "";
    if (Number(payload?.status) === 0 && /^https?:\/\//i.test(audioUrl)) {
      return audioUrl;
    }
    lastMessage = payload?.msg || lastMessage;
  }

  throw new Error(lastMessage || "懒人听书音频解析失败");
}

async function home() {
  try {
    const pageHtml = await requestText("/");
    return { class: CATEGORIES, list: parseBooks(pageHtml) };
  } catch (error) {
    log("error", `首页获取失败: ${error?.message || error}`);
    return { class: CATEGORIES, list: [] };
  }
}

async function category(params) {
  const categoryId = String(params?.categoryId || params?.typeId || params?.tid || "");
  const page = pageNumber(params?.page);
  const empty = { page, pagecount: 1, total: 0, limit: PAGE_LIMIT, list: [] };

  if (!CATEGORIES.some((item) => item.type_id === categoryId)) return empty;

  try {
    const pageHtml = categoryId === "latest"
      ? await requestText("/")
      : await requestText(buildUrl(`${SITE}/search.php`, {
          q: CATEGORY_QUERIES[categoryId] || categoryId,
        }));
    const list = parseBooks(pageHtml);
    return { page, pagecount: 1, total: list.length, limit: PAGE_LIMIT, list };
  } catch (error) {
    log("error", `分类获取失败 categoryId=${categoryId}: ${error?.message || error}`);
    return empty;
  }
}

async function search(params) {
  const keyword = String(params?.keyword || params?.wd || "").trim();
  const page = pageNumber(params?.page);
  const empty = { page, pagecount: 1, total: 0, limit: 50, list: [] };
  if (!keyword || page > 1) return empty;

  const cacheKey = `${keyword}\n${page}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < 60000) return cached.result;

  try {
    const pageHtml = await requestText(buildUrl(`${SITE}/search.php`, { q: keyword }));
    const list = parseBooks(pageHtml);
    const totalMatch = pageHtml.match(/的结果\s*\((\d+)\)/);
    const result = {
      page,
      pagecount: 1,
      total: totalMatch ? Number(totalMatch[1]) : list.length,
      limit: 50,
      list,
    };
    searchCache.set(cacheKey, { cachedAt: Date.now(), result });
    return result;
  } catch (error) {
    log("error", `搜索失败 keyword=${keyword}: ${error?.message || error}`);
    return cached?.result || empty;
  }
}

async function detail(params) {
  const bookId = bookIdFrom(params?.videoId || params?.id || "");
  if (!bookId) return { list: [] };

  try {
    const pageHtml = await requestText(`/book/${bookId}.html`);
    const title = firstText(
      pageHtml,
      /<h1 class=["']text-2xl font-bold text-gray-800["']>([\s\S]*?)<\/h1>/i,
    );
    const picture = extractCover(pageHtml);
    const author = field(pageHtml, "作者");
    const speaker = field(pageHtml, "演播");
    const status = field(pageHtml, "状态");
    const count = pageHtml.match(/正文目录\s*\((\d+)\)/)?.[1] || "";
    const description = firstText(
      pageHtml,
      />作品简介<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/i,
    );

    const episodes = [];
    const chapterPattern =
      /href=["']\/play\/(\d+)\/(\d+)\.html["'][\s\S]*?<span class=["']text-sm text-gray-700 truncate["']>([\s\S]*?)<\/span>/gi;
    let chapterMatch;
    while ((chapterMatch = chapterPattern.exec(pageHtml)) !== null) {
      episodes.push({
        name: safeEpisodeName(cleanText(chapterMatch[3])),
        playId: `/play/${chapterMatch[1]}/${chapterMatch[2]}.html`,
      });
    }

    return {
      list: [
        {
          vod_id: bookId,
          vod_name: title || `书籍 ${bookId}`,
          vod_pic: picture || DEFAULT_COVER,
          type_name: "有声小说",
          vod_year: "",
          vod_area: "",
          vod_remarks: [status, count ? `${count}集` : ""].filter(Boolean).join(" · "),
          vod_actor: speaker,
          vod_director: author,
          vod_content: description,
          vod_play_sources: episodes.length
            ? [{ name: "275听书", episodes }]
            : [],
        },
      ],
    };
  } catch (error) {
    log("error", `详情获取失败 bookId=${bookId}: ${error?.message || error}`);
    return { list: [] };
  }
}

async function play(params) {
  const rawPlayId = String(params?.playId || params?.id || "").trim();
  const playUrl = absoluteUrl(rawPlayId).replace(
    /^http:\/\/www\.i275\.com/i,
    SITE,
  );
  let parsedPlayUrl;
  try {
    parsedPlayUrl = new URL(playUrl);
  } catch (_) {
    return { urls: [], parse: 1, header: {} };
  }
  if (
    !rawPlayId ||
    parsedPlayUrl.origin !== SITE ||
    !/^\/play\/\d+\/\d+\.html$/.test(parsedPlayUrl.pathname)
  ) {
    return { urls: [], parse: 1, header: {} };
  }

  try {
    if (!cookieJar.PHPSESSID) {
      await requestText("/");
      await delay(1050);
    }

    const pageHtml = await requestText(playUrl, {
      headers: { Referer: bookReferer(playUrl) },
    });
    const audioMatch = pageHtml.match(
      /\baudio\s*:\s*\[\s*\{[\s\S]*?\burl\s*:\s*["']([^"']+)["']/i,
    );
    if (!audioMatch) throw new Error("播放页没有音频地址");

    let audioUrl = decodeHtml(audioMatch[1]);
    let audioReferer = playUrl;
    if (audioUrl.startsWith("lrts$")) {
      audioUrl = await resolveLrts(audioUrl);
      audioReferer = "https://m.lrts.me/";
    }
    audioUrl = audioUrl.replace(/^http:\/\//i, "https://");
    if (!/^https:\/\//i.test(audioUrl)) {
      throw new Error("播放地址不是有效的 HTTPS 音频链接");
    }

    return {
      urls: [{ name: "275听书", url: audioUrl }],
      parse: 0,
      header: { "User-Agent": USER_AGENT, Referer: audioReferer },
    };
  } catch (error) {
    log("error", `播放解析失败 playId=${rawPlayId}: ${error?.message || error}`);
    const fallbackHeader = {
      "User-Agent": USER_AGENT,
      Referer: bookReferer(playUrl),
    };
    const cookie = currentCookie(playUrl);
    if (cookie) fallbackHeader.Cookie = cookie;
    return {
      urls: [{ name: "播放页", url: playUrl }],
      parse: 1,
      header: fallbackHeader,
    };
  }
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(1, "博看听书", function (module, exports, require) {
// @name 博看听书
// @author 
// @description 
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/听书/博看听书.js

/**
 * OmniBox 听书源脚本：博看听书
 *
 * 说明：
 * 1. 本脚本将原 T4 路由式写法改造为 OmniBox 标准 5 方法：home/category/search/detail/play
 * 2. 数据来源为博看官方接口，主要包含分类浏览、关键词搜索、专辑详情与章节直链播放
 * 3. 风格与注释结构参照采集站模板，便于后续复用和维护
 */

const OmniBox = require("omnibox_sdk");

// ==================== 站点配置区域 ====================
// 主 API（分类列表、专辑章节等）
const API_HOST = "https://api.bookan.com.cn";

// 搜索 API（ES 检索服务）
const SEARCH_HOST = "https://es.bookan.com.cn";

// 博看实例 ID（当前脚本固定使用该实例）
const INSTANCE_ID = "25304";

// 默认请求头
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36",
  "Accept": "application/json, text/plain, */*",
};

// 固定分类（按你原脚本配置保留）
const CATEGORY_CONFIG = {
  class: [
    { type_id: "1305", type_name: "少年读物" },
    { type_id: "1304", type_name: "儿童文学" },
    { type_id: "1320", type_name: "国学经典" },
    { type_id: "1306", type_name: "文艺少年" },
    { type_id: "1309", type_name: "育儿心经" },
    { type_id: "1310", type_name: "心理哲学" },
    { type_id: "1307", type_name: "青春励志" },
    { type_id: "1312", type_name: "历史小说" },
    { type_id: "1303", type_name: "故事会" },
    { type_id: "1317", type_name: "音乐戏剧" },
    { type_id: "1319", type_name: "相声评书" },
  ],
  // 首页分类排序（仅影响 class 展示顺序）
  forceOrder: [
    "相声评书",
    "国学经典",
    "故事会",
    "历史小说",
    "音乐戏剧",
    "青春励志",
    "少年读物",
    "儿童文学",
    "文艺少年",
    "育儿心经",
    "心理哲学",
  ],
};
// ==================== 配置区域结束 ====================

/**
 * 输出 info 日志
 * @param {string} message 日志文本
 * @param {Object|null} data 附带数据
 */
function logInfo(message, data = null) {
  const text = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[博看听书] ${text}`);
}

/**
 * 输出 error 日志
 * @param {string} message 日志文本
 * @param {any} error 错误对象
 */
function logError(message, error) {
  OmniBox.log("error", `[博看听书] ${message}: ${error?.message || String(error)}`);
}

/**
 * 安全转换为整数
 * @param {any} value 输入值
 * @param {number} defaultValue 默认值
 * @returns {number}
 */
function toInt(value, defaultValue = 0) {
  const num = parseInt(String(value ?? ""), 10);
  return Number.isNaN(num) ? defaultValue : num;
}

/**
 * 构建 URL 查询串
 * @param {string} baseURL 基础地址
 * @param {Object} params 查询参数
 * @returns {string}
 */
function buildURL(baseURL, params = {}) {
  const url = new URL(baseURL);
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value));
    }
  });
  return url.toString();
}

/**
 * 通用 GET 请求（返回 JSON）
 * @param {string} url 完整请求地址
 * @returns {Promise<Object|null>}
 */
async function requestJSON(url) {
  try {
    const response = await OmniBox.request(url, {
      method: "GET",
      headers: DEFAULT_HEADERS,
    });

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}`);
    }

    return JSON.parse(response.body || "{}");
  } catch (error) {
    logError(`请求失败 ${url}`, error);
    return null;
  }
}

/**
 * 将博看列表项格式化为 OmniBox 通用视频结构
 * @param {Object} item 博看原始条目
 * @param {string} fallbackRemark 备注回退值
 * @returns {Object|null}
 */
function formatBookItem(item, fallbackRemark = "") {
  if (!item || typeof item !== "object") {
    return null;
  }

  const vodId = String(item.id || "");
  if (!vodId) {
    return null;
  }

  return {
    vod_id: vodId,
    vod_name: String(item.name || item.title || ""),
    vod_pic: String(item.cover || ""),
    vod_remarks: String(item.author || fallbackRemark || ""),
  };
}

/**
 * 获取某分类下的专辑列表
 * @param {string} categoryId 分类 ID
 * @param {number} page 页码
 * @param {number} limit 每页条数
 * @returns {Promise<Array>}
 */
async function fetchCategoryBooks(categoryId, page = 1, limit = 24) {
  const url = buildURL(`${API_HOST}/voice/book/list`, {
    instance_id: INSTANCE_ID,
    page,
    category_id: categoryId,
    num: limit,
  });

  const data = await requestJSON(url);
  const rawList = data?.data?.list;
  return Array.isArray(rawList) ? rawList : [];
}

/**
 * 获取某专辑全部章节（自动分页）
 * @param {string} albumId 专辑 ID
 * @returns {Promise<Array>}
 */
async function fetchAllAlbumUnits(albumId) {
  const perPage = 200;
  const firstURL = buildURL(`${API_HOST}/voice/album/units`, {
    album_id: albumId,
    page: 1,
    num: perPage,
    order: 1,
  });

  const firstData = await requestJSON(firstURL);
  const firstList = Array.isArray(firstData?.data?.list) ? firstData.data.list : [];
  const total = toInt(firstData?.data?.total, firstList.length);

  if (total <= perPage) {
    return firstList;
  }

  const pageCount = Math.ceil(total / perPage);
  const allUnits = [...firstList];

  for (let page = 2; page <= pageCount; page += 1) {
    const pageURL = buildURL(`${API_HOST}/voice/album/units`, {
      album_id: albumId,
      page,
      num: perPage,
      order: 1,
    });

    const pageData = await requestJSON(pageURL);
    const pageList = Array.isArray(pageData?.data?.list) ? pageData.data.list : [];
    allUnits.push(...pageList);
  }

  return allUnits;
}

/**
 * 获取专辑详情信息
 * @param {string} albumId 专辑 ID
 * @returns {Promise<{success:boolean,data:Object|null}>}
 */
async function fetchAlbumInfo(albumId) {
  try {
    const url = buildURL(`${API_HOST}/voice/album/get`, {
      album_id: albumId,
    });
    const data = await requestJSON(url);
    const album = data?.data;
    if (!album || typeof album !== "object") {
      return { success: false, data: null };
    }

    return {
      success: true,
      data: {
        vod_name: String(album.title || album.name || "未知标题"),
        vod_pic: String(album.cover || ""),
        vod_author: String(album.author || ""),
        vod_desc: String(album.description || "暂无简介"),
        created_at: String(album.created_at || ""),
        updated_at: String(album.updated_at || ""),
      },
    };
  } catch (error) {
    logError(`获取专辑信息失败 ${albumId}`, error);
    return { success: false, data: null };
  }
}

/**
 * 从分类列表中定位专辑信息（用于修正详情标题）
 * @param {string} albumId 专辑 ID
 * @returns {Promise<{vod_name:string,vod_pic:string,vod_author:string,found:boolean}>}
 */
async function findAlbumFromCategories(albumId) {
  const classes = Array.isArray(CATEGORY_CONFIG.class) ? CATEGORY_CONFIG.class : [];
  const maxPages = 5;
  const perPage = 24;

  const result = {
    vod_name: "",
    vod_pic: "",
    vod_author: "",
    found: false,
  };

  for (const cls of classes) {
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages && !result.found) {
      const books = await fetchCategoryBooks(cls.type_id, page, perPage);
      if (!Array.isArray(books) || books.length === 0) {
        break;
      }

      const hit = books.find((item) => String(item?.id || "") === albumId);
      if (hit) {
        result.vod_name = String(hit.name || hit.title || "");
        result.vod_pic = String(hit.cover || "");
        result.vod_author = String(hit.author || "");
        result.found = true;
        break;
      }

      if (books.length < perPage) {
        hasMore = false;
      }
      page += 1;
    }

    if (result.found) {
      break;
    }
  }

  return result;
}

/**
 * 对分类数组按 forceOrder 排序
 * @param {Array} classes 分类数组
 * @returns {Array}
 */
function sortClassesByForceOrder(classes) {
  const order = CATEGORY_CONFIG.forceOrder || [];
  if (!Array.isArray(order) || order.length === 0) {
    return classes;
  }

  const orderMap = new Map();
  order.forEach((name, index) => orderMap.set(name, index));

  return [...classes].sort((a, b) => {
    const aIndex = orderMap.has(a.type_name) ? orderMap.get(a.type_name) : Number.MAX_SAFE_INTEGER;
    const bIndex = orderMap.has(b.type_name) ? orderMap.get(b.type_name) : Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

/**
 * 首页
 *
 * 返回：
 * 1. class 分类列表（按 forceOrder 排序）
 * 2. list  首页推荐（从所有分类抓取并合并）
 */
async function home(params) {
  try {
    const page = toInt(params?.page, 1);
    const classes = sortClassesByForceOrder(CATEGORY_CONFIG.class || []);
    const allBooks = [];

    for (const cls of classes) {
      const books = await fetchCategoryBooks(cls.type_id, page, 24);
      for (const item of books) {
        const formatted = formatBookItem(item, cls.type_name);
        if (formatted) {
          // 首页保留“作者 + 分类”的备注可读性
          const author = String(item?.author || "").trim();
          formatted.vod_remarks = `${author} ${cls.type_name}`.trim();
          allBooks.push(formatted);
        }
      }
    }

    logInfo("首页数据获取成功", { classCount: classes.length, itemCount: allBooks.length });
    return {
      class: classes,
      list: allBooks,
    };
  } catch (error) {
    logError("首页数据获取失败", error);
    return {
      class: sortClassesByForceOrder(CATEGORY_CONFIG.class || []),
      list: [],
    };
  }
}

/**
 * 分类列表
 * @param {Object} params
 * @param {string} params.categoryId 分类 ID
 * @param {number|string} params.page 页码
 */
async function category(params) {
  const categoryId = String(params?.categoryId || "");
  const page = toInt(params?.page, 1);

  try {
    if (!categoryId) {
      throw new Error("分类ID不能为空");
    }

    const categoryObj = (CATEGORY_CONFIG.class || []).find((c) => c.type_id === categoryId);
    const books = await fetchCategoryBooks(categoryId, page, 24);
    const list = books
      .map((item) => formatBookItem(item, categoryObj?.type_name || ""))
      .filter(Boolean);

    logInfo("分类数据获取成功", { categoryId, page, count: list.length });
    return {
      page,
      pagecount: 9999,
      total: 999999,
      list,
    };
  } catch (error) {
    logError("分类数据获取失败", error);
    return {
      page,
      pagecount: 1,
      total: 0,
      list: [],
    };
  }
}

/**
 * 搜索
 * @param {Object} params
 * @param {string} params.keyword 关键词
 * @param {string} params.wd 兼容字段
 * @param {number|string} params.page 页码
 */
async function search(params) {
  const keyword = String(params?.keyword || params?.wd || "").trim();
  const page = toInt(params?.page, 1);
  const limit = 20;

  try {
    if (!keyword) {
      return { page: 1, pagecount: 0, total: 0, list: [] };
    }

    const url = buildURL(`${SEARCH_HOST}/api/v3/voice/book`, {
      instanceId: INSTANCE_ID,
      keyword,
      pageNum: page,
      limitNum: limit,
    });

    const data = await requestJSON(url);
    const rawList = Array.isArray(data?.data?.list) ? data.data.list : [];
    const total = toInt(data?.data?.total, rawList.length);
    const list = rawList.map((item) => formatBookItem(item)).filter(Boolean);

    logInfo("搜索成功", { keyword, page, count: list.length, total });
    return {
      page,
      pagecount: Math.max(1, Math.ceil(total / limit)),
      total,
      list,
    };
  } catch (error) {
    logError("搜索失败", error);
    return {
      page,
      pagecount: 1,
      total: 0,
      list: [],
    };
  }
}

/**
 * 详情
 *
 * 说明：
 * - 将章节转换为 vod_play_sources 格式
 * - 每个章节的音频 file 作为 playId
 */
async function detail(params) {
  const videoId = String(params?.videoId || "").trim();

  try {
    if (!videoId) {
      throw new Error("视频ID不能为空");
    }

    const categoryInfo = await findAlbumFromCategories(videoId);
    const albumInfo = await fetchAlbumInfo(videoId);
    const units = await fetchAllAlbumUnits(videoId);
    if (!Array.isArray(units) || units.length === 0) {
      return { list: [] };
    }

    const first = units[0] || {};
    const episodes = [];

    units.forEach((chapter, index) => {
      const playId = String(chapter?.file || "").trim();
      if (!playId) {
        return;
      }

      const title = String(chapter?.title || `第${index + 1}集`).trim();
      episodes.push({
        name: `${index + 1}.${title}`,
        playId,
      });
    });

    const playSources = episodes.length
      ? [
          {
            name: "博看听书",
            episodes,
          },
        ]
      : [];

    let vodName = "未知标题";
    if (categoryInfo.found && categoryInfo.vod_name) {
      vodName = categoryInfo.vod_name;
    } else if (albumInfo.success && albumInfo.data?.vod_name) {
      vodName = albumInfo.data.vod_name;
    } else if (first?.album_title) {
      vodName = String(first.album_title);
    } else if (first?.title) {
      vodName = String(first.title);
    }

    let vodPic = "";
    if (categoryInfo.found && categoryInfo.vod_pic) {
      vodPic = categoryInfo.vod_pic;
    } else if (albumInfo.success && albumInfo.data?.vod_pic) {
      vodPic = albumInfo.data.vod_pic;
    } else if (first?.cover) {
      vodPic = String(first.cover);
    }

    let vodAuthor = "";
    if (categoryInfo.found && categoryInfo.vod_author) {
      vodAuthor = categoryInfo.vod_author;
    } else if (albumInfo.success && albumInfo.data?.vod_author) {
      vodAuthor = albumInfo.data.vod_author;
    }

    const createdAt = albumInfo.success
      ? String(albumInfo.data?.created_at || "")
      : String(first?.created_at || "");
    const updatedAt = albumInfo.success
      ? String(albumInfo.data?.updated_at || "")
      : String(first?.updated_at || "");
    const albumDesc = albumInfo.success
      ? String(albumInfo.data?.vod_desc || "暂无简介")
      : String(first?.description || "暂无简介");

    const detailItem = {
      vod_id: videoId,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_remarks: `${vodAuthor ? `${vodAuthor} ` : ""}共${episodes.length}集`,
      vod_content: albumDesc,
      vod_actor: createdAt ? `▶️创建于 ${createdAt}` : "",
      vod_director: updatedAt ? `▶️更新于 ${updatedAt}` : "",
      vod_year: createdAt ? `${createdAt.split("-")[0]}年` : "",
      vod_play_sources: playSources,
    };

    logInfo("详情获取成功", { videoId, episodeCount: episodes.length });
    return { list: [detailItem] };
  } catch (error) {
    logError("详情获取失败", error);
    return { list: [] };
  }
}

/**
 * 播放
 *
 * 博看听书章节即音频直链：
 * - parse 固定为 0
 * - 直接返回 playId
 */
async function play(params) {
  try {
    const playId = String(params?.playId || "").trim();
    if (!playId) {
      throw new Error("播放ID不能为空");
    }

    return {
      urls: [{ name: "博看听书", url: playId }],
      parse: 0,
      header: {
        "User-Agent": DEFAULT_HEADERS["User-Agent"],
      },
    };
  } catch (error) {
    logError("播放地址获取失败", error);
    return {
      urls: [],
      parse: 0,
      header: {},
    };
  }
}

// 导出标准方法
module.exports = {
  home,
  category,
  search,
  detail,
  play,
};

// 交给公共 runner 托管标准输入输出
const runner = require("spider_runner");
runner.run(module.exports);

});

_load(2, "酷我听书", function (module, exports, require) {
// @name 酷我听书
// @author @lucky_TJQ
// @description 
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/听书/酷我听书.js

/**
 * OmniBox 听书源脚本：酷我听书
 *
 * 改造说明：
 * 1. 将原 不夜 T4 路由式写法转换为 OmniBox 标准五方法：home/category/search/detail/play
 * 2. 保留原站点核心逻辑：分类筛选、强制翻页、搜索、专辑详情、章节播放
 * 3. 注释和结构风格参照模板脚本，便于统一维护
 */

const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const API_HOST = "http://tingshu.kuwo.cn";
const SEARCH_HOST = "http://search.kuwo.cn";
const PLAY_HOST = "http://mobi.kuwo.cn";

const USER_AGENT = "kwplayer_ar_9.1.8.1_tvivo.apk";
const PAGE_SIZE = 21;

// 固定分类
const CLASS_LIST = [
  { type_id: "2", type_name: "有声小说" },
  { type_id: "37", type_name: "音乐金曲" },
  { type_id: "5", type_name: "相声评书" },
  { type_id: "62", type_name: "影视原声" },
];

// 强制翻页配置（用于 VIP/排序筛选后补齐结果）
const FORCE_PAGE_CONFIG = {
  enabled: true,
  maxPage: 10,
  pageSize: 21,
};

// 分类筛选（保留原脚本）
const CLASS_FILTERS = {
  "2": [
    {
      key: "class",
      name: "类型",
      init: "42",
      value: [
        { n: "都市传说", v: "42" },
        { n: "玄幻奇幻", v: "44" },
        { n: "武侠仙侠", v: "48" },
        { n: "穿越架空", v: "52" },
        { n: "科幻竞技", v: "57" },
        { n: "幻想言情", v: "169" },
        { n: "独家定制", v: "170" },
        { n: "古代言情", v: "207" },
        { n: "影视原著", v: "213" },
        { n: "悬疑推理", v: "45" },
        { n: "历史军事", v: "56" },
        { n: "现代言情", v: "41" },
        { n: "青春校园", v: "55" },
        { n: "文学名著", v: "61" },
      ],
    },
  ],
  "5": [
    {
      key: "class",
      name: "类型",
      init: "220",
      value: [
        { n: "评书大全", v: "220" },
        { n: "小品合辑", v: "221" },
        { n: "单口相声", v: "219" },
        { n: "热门相声", v: "218" },
        { n: "相声名家", v: "290" },
        { n: "粤语评书", v: "320" },
        { n: "相声新人", v: "222" },
        { n: "张少佐", v: "313" },
        { n: "刘立福", v: "314" },
        { n: "刘兰芳", v: "309" },
        { n: "连丽如", v: "311" },
        { n: "田占义", v: "317" },
        { n: "袁阔成", v: "310" },
        { n: "孙一", v: "315" },
        { n: "王玥波", v: "316" },
        { n: "单田芳", v: "217" },
        { n: "关永超", v: "325" },
        { n: "马长辉", v: "326" },
        { n: "赵维莉", v: "327" },
        { n: "单口相声", v: "1536" },
        { n: "潮剧", v: "1718" },
        { n: "沪剧", v: "1719" },
        { n: "晋剧", v: "1720" },
      ],
    },
  ],
  "37": [
    {
      key: "class",
      name: "类型",
      init: "253",
      value: [
        { n: "抖音神曲", v: "253" },
        { n: "怀旧老歌", v: "252" },
        { n: "创作翻唱", v: "248" },
        { n: "催眠", v: "254" },
        { n: "古风", v: "255" },
        { n: "博客周刊", v: "1423" },
        { n: "民谣", v: "1409" },
        { n: "纯音乐", v: "1408" },
        { n: "3D电音", v: "1407" },
        { n: "音乐课程", v: "1380" },
        { n: "音乐推荐", v: "250" },
        { n: "音乐故事", v: "247" },
        { n: "情感推荐", v: "246" },
        { n: "儿童音乐", v: "249" },
      ],
    },
  ],
  "62": [
    {
      key: "class",
      name: "类型",
      init: "1485",
      value: [
        { n: "影视广播", v: "1485" },
        { n: "影视解读", v: "1483" },
        { n: "影视原著", v: "1486" },
        { n: "陪你追剧", v: "1398" },
        { n: "经典原声", v: "1482" },
      ],
    },
  ],
};

// VIP 筛选
const VIP_FILTER = {
  key: "vip",
  name: "权限",
  init: "",
  value: [
    { n: "全部权限", v: "" },
    { n: "免费权限", v: "0" },
    { n: "会员权限", v: "1" },
  ],
};

// 排序筛选
const SORT_FILTER = {
  key: "sort",
  name: "排序",
  init: "tsScore",
  value: [
    { n: "综合排序", v: "tsScore" },
    { n: "最新上架", v: "pubDate" },
    { n: "按总播放", v: "playCnt" },
  ],
};
// ==================== 配置区域结束 ====================

/**
 * Info 日志
 */
function logInfo(message, data = null) {
  const text = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[酷我听书] ${text}`);
}

/**
 * Error 日志
 */
function logError(message, error) {
  OmniBox.log("error", `[酷我听书] ${message}: ${error?.message || String(error)}`);
}

/**
 * 安全整数转换
 */
function toInt(value, defaultValue = 0) {
  const num = parseInt(String(value ?? ""), 10);
  return Number.isNaN(num) ? defaultValue : num;
}

/**
 * 构建 URL
 */
function buildURL(base, params = {}) {
  const url = new URL(base);
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value));
    }
  });
  return url.toString();
}

/**
 * 通用 GET 请求
 * - 某些搜索接口返回单引号伪 JSON，这里兼容解析
 */
async function requestJSON(url, refererHost = API_HOST, tryFixSingleQuotes = false) {
  const response = await OmniBox.request(url, {
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT,
      Referer: refererHost,
    },
  });

  if (response.statusCode !== 200) {
    throw new Error(`HTTP ${response.statusCode}`);
  }

  const body = String(response.body || "").trim();
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (_) {
    if (tryFixSingleQuotes) {
      try {
        return JSON.parse(body.replace(/'/g, '"'));
      } catch (err2) {
        throw new Error(`JSON解析失败: ${err2.message}`);
      }
    }
    // 如果内容本身不是 JSON，直接返回字符串
    return body;
  }
}

/**
 * 格式化播放量
 */
function formatPlayCnt(cnt) {
  const n = Number(cnt || 0);
  if (!n) return "0";
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}

/**
 * 根据 type_id 获取分类名称
 */
function getCategoryName(typeId) {
  const target = CLASS_LIST.find((c) => c.type_id === String(typeId));
  return target ? target.type_name : "";
}

/**
 * 将分类接口项映射为标准列表结构
 */
function mapAlbumItemToVod(item, categoryName = "") {
  const vipTag = Number(item?.vip) === 1 ? "会员" : "免费";
  const playCnt = formatPlayCnt(item?.playCnt);
  return {
    vod_id: String(item?.albumId || ""),
    vod_name: String(item?.albumName || ""),
    vod_pic: String(item?.coverImg || ""),
    vod_remarks: `${vipTag} | ${playCnt}次播放 | ${categoryName || item?.artist || ""}`.trim(),
  };
}

/**
 * 获取分类筛选默认 class 值
 */
function getDefaultClassifyId(typeId) {
  const cfg = CLASS_FILTERS[String(typeId)];
  if (Array.isArray(cfg) && cfg[0] && cfg[0].init) {
    return String(cfg[0].init);
  }
  return "44";
}

/**
 * 构建酷我分类筛选请求 URL
 */
function buildCategoryURL({ typeId, classifyId, sortType, page, pageSize }) {
  return buildURL(`${API_HOST}/v2/api/search/filter/albums`, {
    classifyId,
    notrace: 0,
    source: "kwplayer_ar_9.1.8.1_tvivo.apk",
    platform: 1,
    uid: 2511482006,
    sortType,
    loginUid: 540339516,
    bksource: "kwbook_ar_9.1.8.1_tvivo.apk",
    rn: pageSize,
    categoryId: typeId,
    pn: page,
  });
}

/**
 * 获取首页推荐（每个顶级分类取一页）
 */
async function fetchHomeList(page = 1) {
  const all = [];

  for (const cls of CLASS_LIST) {
    const url = buildCategoryURL({
      typeId: cls.type_id,
      classifyId: getDefaultClassifyId(cls.type_id),
      sortType: SORT_FILTER.init,
      page,
      pageSize: 12,
    });

    try {
      const data = await requestJSON(url, API_HOST, false);
      const rawList = Array.isArray(data?.data?.data) ? data.data.data : [];
      for (const item of rawList) {
        all.push(mapAlbumItemToVod(item, cls.type_name));
      }
    } catch (error) {
      logError(`首页分类获取失败 ${cls.type_name}`, error);
    }
  }

  return all;
}

/**
 * 分类强制翻页
 * - 当开启 VIP 筛选且当前页过滤后为空时，自动向后翻页
 */
async function fetchCategoryWithForcePage(typeId, classifyId, sortType, vipFilterValue, targetPage) {
  const categoryName = getCategoryName(typeId);
  let currentPage = toInt(targetPage, 1);
  let attempts = 0;

  while (attempts < FORCE_PAGE_CONFIG.maxPage) {
    const url = buildCategoryURL({
      typeId,
      classifyId,
      sortType,
      page: currentPage,
      pageSize: FORCE_PAGE_CONFIG.pageSize,
    });

    const data = await requestJSON(url, API_HOST, false);
    const rawList = Array.isArray(data?.data?.data) ? data.data.data : [];

    if (rawList.length === 0) {
      attempts += 1;
      currentPage += 1;
      continue;
    }

    let filtered = rawList;
    const vipValue = String(vipFilterValue ?? "");
    if (vipValue !== "") {
      filtered = rawList.filter((it) => Number(it?.vip) === Number(vipValue));
    }

    if (filtered.length > 0 || vipValue === "") {
      return {
        items: filtered.map((it) => mapAlbumItemToVod(it, categoryName)),
        hasMore: rawList.length >= FORCE_PAGE_CONFIG.pageSize,
      };
    }

    attempts += 1;
    currentPage += 1;
  }

  return { items: [], hasMore: false };
}

/**
 * 搜索
 */
async function fetchSearchList(keyword, page = 1) {
  const wd = String(keyword || "").trim();
  const pg = toInt(page, 1);
  if (!wd) {
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }

  // 酷我搜索页码从 0 开始
  const pn = Math.max(0, pg - 1);
  const url = buildURL(`${SEARCH_HOST}/r.s`, {
    client: "kt",
    all: wd,
    ft: "album",
    newsearch: 1,
    itemset: "web_2013",
    cluster: 0,
    pn,
    rn: PAGE_SIZE,
    rformat: "json",
    encoding: "utf8",
    show_copyright_off: 1,
    vipver: "MUSIC_8.0.3.0_BCS75",
    show_series_listen: 1,
    version: "9.1.8.1",
  });

  const data = await requestJSON(url, SEARCH_HOST, true);
  const albumList = Array.isArray(data?.albumlist) ? data.albumlist : [];
  const total = toInt(data?.TOTAL, albumList.length);

  const list = albumList.map((item) => {
    const vipTag = Number(item?.vip) === 1 ? "会员" : "免费";
    return {
      vod_id: String(item?.DC_TARGETID || ""),
      vod_name: String(item?.name || ""),
      vod_pic: String(item?.img || ""),
      vod_remarks: `${vipTag} | ${item?.artist || ""}`.trim(),
    };
  });

  return {
    page: pg,
    pagecount: Math.min(100, Math.max(1, Math.ceil(total / PAGE_SIZE))),
    total,
    list,
  };
}

/**
 * 获取专辑详情 + 章节
 */
async function fetchDetailInfo(albumId) {
  const id = String(albumId || "").trim();
  if (!id) return null;

  const url = buildURL(`${SEARCH_HOST}/r.s`, {
    stype: "albuminfo",
    user: "8d378d72qw28f5f4",
    uid: 2511552006,
    loginUid: 540129516,
    loginSid: 958467960,
    prod: "kwplayer_ar_9.1.8.1",
    bkprod: "kwbook_ar_9.1.8.1",
    source: "kwplayer_ar_9.1.8.1_tvivo.apk",
    bksource: "kwbook_ar_9.1.8.1_tvivo.apk",
    corp: "kuwo",
    albumid: id,
    pn: 0,
    rn: 5000,
    show_copyright_off: 1,
    vipver: "MUSIC_8.2.0.0_BCS17",
    mobi: 1,
    iskwbook: 1,
  });

  const data = await requestJSON(url, SEARCH_HOST, true);
  const albumInfo = data?.albuminfo || {};
  const musicList = Array.isArray(data?.musiclist) ? data.musiclist : [];
  if (musicList.length === 0) {
    return null;
  }

  const episodes = musicList.map((track, index) => {
    const playUrl = buildURL(`${PLAY_HOST}/mobi.s`, {
      f: "web",
      source: "kwplayerhd_ar_4.3.0.8_tianbao_T1A_qirui.apk",
      type: "convert_url_with_sign",
      rid: track?.musicrid,
      br: "320kmp3",
    });
    return {
      name: `${index + 1}.${String(track?.name || "")}`,
      playId: playUrl,
    };
  });

  const vipTag = Number(albumInfo?.vip) === 1 ? "会员" : "免费";
  const releaseDate = String(albumInfo?.releaseDate || "");
  const year = releaseDate.includes("-") ? `${releaseDate.split("-")[0]}年` : "";

  return {
    vod_id: id,
    vod_name: String(albumInfo?.name || musicList[0]?.album || "未知专辑"),
    vod_pic: String(albumInfo?.img || musicList[0]?.web_albumpic_short || ""),
    vod_remarks: `${vipTag} | 共${musicList.length}集`,
    vod_content: String(albumInfo?.info || data?.intro || "暂无简介"),
    vod_actor: String(albumInfo?.artist || data?.artist || "未知"),
    vod_director: `播放量: ${formatPlayCnt(albumInfo?.playcnt)}`,
    vod_year: year,
    vod_play_sources: [
      {
        name: "酷我听书",
        episodes,
      },
    ],
  };
}

/**
 * 解析播放地址
 */
async function resolvePlay(playId) {
  const id = String(playId || "").trim();
  if (!id) {
    return { urls: [], parse: 0, header: {} };
  }

  try {
    const data = await requestJSON(id, PLAY_HOST, false);

    if (data?.data?.url) {
      return {
        urls: [{ name: "酷我听书", url: String(data.data.url) }],
        parse: 0,
        header: {
          "User-Agent": USER_AGENT,
          Referer: API_HOST,
        },
      };
    }

    if (typeof data === "string" && /^https?:\/\//i.test(data)) {
      return {
        urls: [{ name: "酷我听书", url: data }],
        parse: 0,
        header: {
          "User-Agent": USER_AGENT,
          Referer: API_HOST,
        },
      };
    }

    return {
      urls: [{ name: "酷我听书", url: id }],
      parse: 0,
      header: {
        "User-Agent": USER_AGENT,
      },
    };
  } catch (error) {
    logError("播放地址解析失败", error);
    return {
      urls: [{ name: "酷我听书", url: id }],
      parse: 0,
      header: {
        "User-Agent": USER_AGENT,
      },
    };
  }
}

/**
 * 首页
 */
async function home(params) {
  try {
    const page = toInt(params?.page, 1);
    const list = await fetchHomeList(page);

    // 为每个分类拼装筛选器（类型 + VIP + 排序）
    const filters = {};
    for (const cls of CLASS_LIST) {
      const typeFilters = Array.isArray(CLASS_FILTERS[cls.type_id]) ? CLASS_FILTERS[cls.type_id] : [];
      filters[cls.type_id] = [...typeFilters, VIP_FILTER, SORT_FILTER];
    }

    logInfo("首页获取成功", { classCount: CLASS_LIST.length, listCount: list.length });
    return {
      class: CLASS_LIST,
      filters,
      list,
    };
  } catch (error) {
    logError("首页获取失败", error);
    return {
      class: CLASS_LIST,
      filters: {},
      list: [],
    };
  }
}

/**
 * 分类
 */
async function category(params) {
  try {
    const typeId = String(params?.categoryId || "").trim();
    const page = toInt(params?.page, 1);
    if (!typeId || !CLASS_LIST.some((c) => c.type_id === typeId)) {
      return { page, pagecount: 1, total: 0, list: [] };
    }

    const ext = params?.extend || {};
    const classifyId = String(ext?.class || getDefaultClassifyId(typeId));
    const vip = ext?.vip !== undefined ? String(ext.vip) : String(VIP_FILTER.init);
    const sort = String(ext?.sort || SORT_FILTER.init);

    const result = FORCE_PAGE_CONFIG.enabled
      ? await fetchCategoryWithForcePage(typeId, classifyId, sort, vip, page)
      : await (async () => {
          const url = buildCategoryURL({
            typeId,
            classifyId,
            sortType: sort,
            page,
            pageSize: PAGE_SIZE,
          });
          const data = await requestJSON(url, API_HOST, false);
          const rawList = Array.isArray(data?.data?.data) ? data.data.data : [];
          const items = rawList.map((it) => mapAlbumItemToVod(it, getCategoryName(typeId)));
          return { items, hasMore: rawList.length >= PAGE_SIZE };
        })();

    return {
      page,
      pagecount: result.hasMore ? 9999 : page,
      total: result.hasMore ? 999999 : result.items.length,
      list: result.items,
    };
  } catch (error) {
    logError("分类获取失败", error);
    return {
      page: 1,
      pagecount: 1,
      total: 0,
      list: [],
    };
  }
}

/**
 * 搜索
 */
async function search(params) {
  try {
    const keyword = String(params?.keyword || params?.wd || "").trim();
    const page = toInt(params?.page, 1);
    const result = await fetchSearchList(keyword, page);

    logInfo("搜索完成", { keyword, page, count: result.list.length });
    return result;
  } catch (error) {
    logError("搜索失败", error);
    return {
      page: 1,
      pagecount: 1,
      total: 0,
      list: [],
    };
  }
}

/**
 * 详情
 */
async function detail(params) {
  try {
    const videoId = String(params?.videoId || "").trim();
    if (!videoId) {
      throw new Error("视频ID不能为空");
    }

    const item = await fetchDetailInfo(videoId);
    return {
      list: item ? [item] : [],
    };
  } catch (error) {
    logError("详情获取失败", error);
    return { list: [] };
  }
}

/**
 * 播放
 */
async function play(params) {
  try {
    const playId = String(params?.playId || "").trim();
    if (!playId) {
      throw new Error("播放ID不能为空");
    }
    return await resolvePlay(playId);
  } catch (error) {
    logError("播放失败", error);
    return { urls: [], parse: 0, header: {} };
  }
}

// 导出标准方法
module.exports = {
  home,
  category,
  search,
  detail,
  play,
};

// 使用公共 runner 执行
const runner = require("spider_runner");
runner.run(module.exports);


});

_load(3, "DJ音乐", function (module, exports, require) {
// @name DJ音乐[听] - OmniBox
// @version 1.0.7
// @author https://github.com/hjdhnx/drpy-node/blob/main/spider/js/DJ%E9%9F%B3%E4%B9%90%5B%E5%90%AC%5D.js
// @origin https://github.com/hjdhnx/drpy-node/blob/main/spider/js/DJ%E9%9F%B3%E4%B9%90%5B%E5%90%AC%5D.js
// @push 0
// @dependencies cheerio
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/音乐/DJ音乐.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

const HOST = "https://www.djuu.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CATEGORIES = [
  ["1", "迪高串烧"],
  ["2", "慢摇串烧"],
  ["3", "慢歌串烧"],
  ["4", "中文Remix"],
  ["5", "外文Remix"],
  ["6", "HOUSE"],
  ["7", "HOUSE2"],
  ["8", "霓虹风格"],
  ["9", "Mashup"],
  ["10", "中文DISCO"],
  ["11", "外文DISCO"],
].map(([type_id, type_name]) => ({ type_id, type_name }));

function abs(url) {
  if (!url) return "";
  try {
    return new URL(url, HOST).href;
  } catch {
    return url;
  }
}

function splitVodId(vodId = "") {
  const arr = String(vodId).split("@@");
  return {
    id: arr[0] || "",
    name: arr[1] || "",
    pic: arr[2] || "",
    remark: arr[3] || "",
  };
}

function makeVodId({ id = "", name = "", pic = "", remark = "" }) {
  return [id, name, pic, remark].map(v => String(v || "")).join("@@");
}

async function requestText(url) {
  const target = abs(url);
  await OmniBox.log("info", `[request] ${target}`);
  const res = await OmniBox.request(target, {
    method: "GET",
    headers: { "User-Agent": UA, Referer: HOST + "/" },
  });
  if (res.statusCode !== 200) {
    throw new Error(`HTTP ${res.statusCode} @ ${target}`);
  }
  return res.body || "";
}

function parseListFromHtml(html) {
  const $ = cheerio.load(html || "");
  const list = [];
  const rows = $(".list_musiclist tr").toArray().slice(1); // 去掉表头

  rows.forEach((tr) => {
    const $tr = $(tr);
    const a = $tr.find("a[title]").first();
    const name = (a.attr("title") || a.text() || "").trim();
    const href = abs(a.attr("href") || "");
    if (!name || !href) return;

    const pic = abs($tr.find("img").first().attr("src") || "");
    const remark = ($tr.find(".cor999").eq(1).text() || "").trim();

    list.push({
      vod_id: makeVodId({ id: href, name, pic, remark }),
      vod_name: name,
      vod_pic: pic,
      vod_remarks: remark,
      type_id: "music",
      type_name: "音乐",
    });
  });

  return list;
}

async function home(params, context) {
  try {
    const first = await category({ categoryId: "1", page: 1 }, context);
    await OmniBox.log("info", `[home] class=${CATEGORIES.length}, list=${(first.list || []).length}`);
    return {
      class: CATEGORIES,
      list: (first.list || []).slice(0, 12),
      filters: {},
    };
  } catch (e) {
    await OmniBox.log("error", `[home] ${e.message}`);
    return { class: CATEGORIES, list: [], filters: {} };
  }
}

async function category(params, context) {
  try {
    const categoryId = String(params?.categoryId || "1");
    const page = Number(params?.page || 1);
    const path = `/djlist/${categoryId}_${page}.html`;

    const html = await requestText(path);
    const list = parseListFromHtml(html);

    const hasNext = /下一页|next|尾页/.test(html);
    const pagecount = hasNext ? page + 1 : page;
    const total = hasNext ? page * 20 + 1 : (page - 1) * 20 + list.length;

    await OmniBox.log("info", `[category] tid=${categoryId}, page=${page}, list=${list.length}`);
    return { page, pagecount, total, list };
  } catch (e) {
    await OmniBox.log("error", `[category] ${e.message}`);
    return { page: Number(params?.page || 1), pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const { id, name, pic, remark } = splitVodId(params?.videoId || "");
    if (!id) return { list: [] };

    // 源站为音乐播放页，详情简化为单集播放
    const episodes = [{ name: name || "播放", playId: id }];
    const vod = {
      vod_id: params.videoId,
      vod_name: name || "DJ音乐",
      vod_pic: pic || "",
      vod_remarks: remark || "",
      type_id: "music",
      type_name: "音乐",
      vod_content: "DJ音乐源（播放链接在 play 中解析）",
      vod_play_sources: [{ name: "DJ专线", episodes }],
    };

    await OmniBox.log("info", `[detail] id=${id}`);
    return { list: [vod] };
  } catch (e) {
    await OmniBox.log("error", `[detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params?.keyword || "").trim();
    const page = Number(params?.page || 1);
    if (!keyword) return { page: 1, pagecount: 0, total: 0, list: [] };

    const html = await requestText(`/search?musicname=${encodeURIComponent(keyword)}`);
    let list = parseListFromHtml(html);

    // 兼容部分搜索页无 .list_musiclist 的情况：退化抓 a[title]
    if (!list.length) {
      const $ = cheerio.load(html || "");
      const seen = new Set();
      $("a[title]").each((_, el) => {
        const a = $(el);
        const name = (a.attr("title") || a.text() || "").trim();
        const href = abs(a.attr("href") || "");
        if (!name || !href || seen.has(href)) return;
        seen.add(href);
        list.push({
          vod_id: makeVodId({ id: href, name }),
          vod_name: name,
          vod_pic: "",
          vod_remarks: "",
          type_id: "music",
          type_name: "音乐",
        });
      });
    }

    await OmniBox.log("info", `[search] kw=${keyword}, page=${page}, list=${list.length}`);
    return { page, pagecount: 1, total: list.length, list };
  } catch (e) {
    await OmniBox.log("error", `[search] ${e.message}`);
    return { page: Number(params?.page || 1), pagecount: 0, total: 0, list: [] };
  }
}

function parseMusicObject(text) {
  const src = String(text || "");
  const patterns = [
    /var\s+music\s*=\s*(\{[\s\S]*?\})\s*[,;]/,
    /music\s*=\s*(\{[\s\S]*?\})\s*[,;]/,
  ];

  for (const reg of patterns) {
    const m = src.match(reg);
    if (!m) continue;
    let raw = m[1];
    raw = raw
      .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":')
      .replace(/'/g, '"')
      .replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(raw);
    } catch (e) {
      // 继续尝试下一个规则
    }
  }
  return null;
}

async function play(params, context) {
  try {
    const playId = String(params?.playId || "").trim();
    const flag = String(params?.flag || "DJ专线");
    if (!playId) throw new Error("playId 为空");

    const html = await requestText(playId);
    const tried = [];

    const music = parseMusicObject(html);
    if (music) {
      await OmniBox.log("info", `[play] music keys=${Object.keys(music).join(",")}`);
    } else {
      await OmniBox.log("warn", `[play] music object not found`);
    }

    if (music?.file) {
      const url = music.file;
      await OmniBox.log("info", `[play] hit music.file -> ${url}`);
      return {
        urls: [{ name: "播放", url }],
        header: { "User-Agent": UA, Referer: HOST + "/" },
        parse: 0,
      };
    }
    tried.push("music.file");

    const directM4a = html.match(new RegExp(String.raw`https?:\\/\\/[^"'\\s<>]+\\.(?:m4a|mp3)(?:\\?[^"'\\s<>]*)?`, "i"));
    if (directM4a?.[0]) {
      await OmniBox.log("info", `[play] hit direct media -> ${directM4a[0]}`);
      return {
        urls: [{ name: "播放", url: directM4a[0] }],
        header: { "User-Agent": UA, Referer: HOST + "/" },
        parse: 0,
      };
    }
    tried.push("direct media regex");

    const fileM = html.match(/file\s*[:=]\s*['\"]([^'\"]+)['\"]/i);
    if (fileM?.[1]) {
      const base = new URL(playId, HOST);
      const url = fileM[1].startsWith("http") ? fileM[1] : `${base.protocol}//mp4.djuu.com/${fileM[1].replace(/^\/+/, "")}.m4a`;
      await OmniBox.log("info", `[play] hit loose file -> ${url}`);
      return {
        urls: [{ name: "播放", url }],
        header: { "User-Agent": UA, Referer: HOST + "/" },
        parse: 0,
      };
    }
    tried.push("loose file regex");

    throw new Error(`未提取到播放地址，已尝试: ${tried.join(" | ")}`);
  } catch (e) {
    await OmniBox.log("error", `[play] ${e.message}`);
    return { urls: [], header: { "User-Agent": UA }, parse: 0 };
  }
}

});

_load(4, "世纪音乐", function (module, exports, require) {
// @name 世纪音乐
// @author 
// @description 
// @dependencies: axios, cheerio
// @version 1.0.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/音乐/世纪音乐.js

/**
 * OmniBox - 世纪音乐爬虫（JavaScript 版）
 *
 * 说明：
 * 1. 本脚本将 `本地调试/世纪音乐.py` 的核心能力迁移到 OmniBox JS 规范。
 * 2. 代码组织与注释风格参考 `模板/JavaScript/采集站模板.js`。
 * 3. 支持：首页、分类、搜索、详情、播放（含歌词多源获取）。
 */

const axios = require("axios");
const cheerio = require("cheerio");
const http = require("http");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================

/**
 * 主站地址
 */
const HOST = process.env.SJ_MUSIC_HOST || "https://www.4c44.com";

/**
 * 请求头
 */
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: `${HOST}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3",
};

/**
 * axios 实例（开启 keep-alive，增强稳定性）
 */
const httpClient = axios.create({
  timeout: 15000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  headers: DEFAULT_HEADERS,
  maxRedirects: 5,
  validateStatus: (status) => status >= 200 && status < 500,
});

// ==================== 运行时缓存 ====================

/**
 * 首页推荐缓存：key = vod_id, value = 推荐对象
 */
const homeRecommendCache = new Map();

/**
 * 歌词缓存：key = lrc_${songId}
 */
const lrcCache = new Map();

// ==================== 通用工具函数 ====================

function logInfo(message, data = null) {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[世纪音乐] ${output}`);
}

function logWarn(message) {
  OmniBox.log("warn", `[世纪音乐] ${message}`);
}

function logError(message, error) {
  OmniBox.log("error", `[世纪音乐] ${message}: ${error?.message || error}`);
}

/**
 * 绝对地址补全
 */
function absUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${HOST}${url}`;
  return `${HOST}/${url}`;
}

/**
 * 清理站点广告/装饰文本
 */
function cleanText(text) {
  if (!text) return "";
  return String(text)
    .replace(
      /(世纪音乐网|MP3免费下载|LRC动态歌词下载|高清MV|车载MV|夜店视频|热门榜单|全部歌曲|第\d+页|刷新|首页|免责声明|版权|非営利性|自动收录|联系邮箱|oeecc#foxmail\.com)/gi,
      ""
    )
    .trim();
}

/**
 * 清理歌曲名（去掉冗余连接符）
 */
function cleanSongName(name) {
  if (!name) return "";
  return String(name).replace(/\s*-\s*$/g, "").replace(/^\s*-\s*/g, "").replace(/\s+/g, " ").trim();
}

/**
 * 图片地址处理
 */
function getImage(url, options = {}) {
  const { isSinger = false, isMV = false } = options;
  if (!url) return "";
  let finalUrl = absUrl(url);
  if (isSinger) {
    finalUrl = finalUrl.replace("param=200y200", "param=500y500").replace("?param=200y200", "?param=500y500");
  }
  if (isMV) {
    finalUrl = finalUrl.replace("?imageView=1&thumbnail=800y", "?imageView=1&thumbnail=1280y720");
  }
  return finalUrl;
}

/**
 * 请求 HTML 并返回 cheerio 实例
 */
async function getDOM(pathOrUrl, retry = 2) {
  const targetUrl = absUrl(pathOrUrl);
  for (let i = 0; i <= retry; i += 1) {
    try {
      const response = await httpClient.get(targetUrl, {
        headers: {
          ...DEFAULT_HEADERS,
          Referer: `${HOST}/`,
        },
      });
      if (response.status === 200 && response.data) {
        return cheerio.load(response.data);
      }
      logWarn(`请求失败 status=${response.status}, url=${targetUrl}`);
    } catch (error) {
      logWarn(`请求异常(${i + 1}/${retry + 1}): ${targetUrl} => ${error.message}`);
    }
  }
  return cheerio.load("<html></html>");
}

/**
 * 通用分页“下一页”判断
 */
function hasNextPage($) {
  const nextLink = $(".pages a:contains('下一页'), .pagination a:contains('下一页'), .page a:contains('下一页')").first();
  if (nextLink && nextLink.length > 0) {
    const href = nextLink.attr("href") || "";
    if (href && href !== "#" && !/javascript:void/i.test(href)) return true;
  }
  return false;
}

/**
 * 生成标准播放源结构
 */
function buildPlaySource(name, episodes) {
  return {
    name: name || "默认线路",
    episodes: Array.isArray(episodes) ? episodes : [],
  };
}

// ==================== 首页分类 ====================

function getHomeClassesAndFilters() {
  const classes = [
    { type_name: "🏠 首页推荐", type_id: "home" },
    { type_name: "📊 排行榜", type_id: "rank_list" },
    { type_name: "📀 歌单", type_id: "playlist" },
    { type_name: "👤 歌手", type_id: "singer" },
    { type_name: "🎬 MV", type_id: "mv" },
  ];

  const filters = {
    singer: [
      {
        key: "sex",
        name: "👤 性别",
        value: [
          { n: "👩 女歌手", v: "girl" },
          { n: "👨 男歌手", v: "male" },
          { n: "🎭 乐队组合", v: "band" },
        ],
      },
      {
        key: "area",
        name: "🌏 地区",
        value: [
          { n: "🇨🇳 华语", v: "huayu" },
          { n: "🌍 欧美", v: "oumei" },
          { n: "🇰🇷 韩国", v: "hanguo" },
          { n: "🇯🇵 日本", v: "riben" },
        ],
      },
      {
        key: "char",
        name: "🔤 字母",
        value: [{ n: "🔤 全部", v: "index" }].concat(
          Array.from({ length: 26 }, (_, i) => {
            const c = String.fromCharCode(65 + i);
            return { n: c, v: c.toLowerCase() };
          })
        ),
      },
    ],
    mv: [
      {
        key: "area",
        name: "🌏 地区",
        value: [
          { n: "🌐 全部地区", v: "index" },
          { n: "🇨🇳 内地", v: "neidi" },
          { n: "🇭🇰 港台", v: "gangtai" },
          { n: "🌍 欧美", v: "oumei" },
          { n: "🇰🇷 韩国", v: "hanguo" },
          { n: "🇯🇵 日本", v: "riben" },
        ],
      },
      {
        key: "type",
        name: "🎬 类型",
        value: [
          { n: "🎬 全部类型", v: "index" },
          { n: "📀 官方版", v: "guanfang" },
          { n: "🎤 原声", v: "yuansheng" },
          { n: "🎸 现场版", v: "xianchang" },
          { n: "🎮 网易出品", v: "wangyi" },
        ],
      },
      {
        key: "sort",
        name: "📊 排序",
        value: [
          { n: "✨ 最新", v: "new" },
          { n: "🔥 最热", v: "hot" },
          { n: "📈 上升最快", v: "rise" },
        ],
      },
    ],
    playlist: [
      {
        key: "lang",
        name: "🌏 语种",
        value: [
          { n: "🌐 全部语种", v: "index" },
          { n: "🇨🇳 华语", v: "huayu" },
          { n: "🌍 欧美", v: "oumei" },
          { n: "🇯🇵 日语", v: "riyu" },
          { n: "🇰🇷 韩语", v: "hanyu" },
          { n: "🇭🇰 粤语", v: "yueyu" },
        ],
      },
      {
        key: "style",
        name: "🎵 风格",
        value: [
          { n: "🎵 流行", v: "liuxing" },
          { n: "🎸 摇滚", v: "yaogun" },
          { n: "🎤 民谣", v: "minyao" },
          { n: "⚡ 电子", v: "dianzi" },
          { n: "💃 舞曲", v: "wuqu" },
          { n: "🎤 说唱", v: "shuochang" },
          { n: "🎹 轻音乐", v: "qingyinle" },
          { n: "🎺 爵士", v: "jueshi" },
          { n: "🌾 乡村", v: "xiangcun" },
          { n: "🎭 R&B/Soul", v: "soul" },
          { n: "🎻 古典", v: "gudian" },
          { n: "🏯 古风", v: "gufeng" },
        ],
      },
    ],
  };

  return { classes, filters };
}

// ==================== 首页推荐 ====================

async function getHomeRecommendList() {
  const $ = await getDOM("/");
  const list = [];
  const seen = new Set();
  homeRecommendCache.clear();

  const pushMusicItem = (href, name, singer, pic, remarks) => {
    const vodId = absUrl(href);
    if (!vodId || seen.has(vodId)) return;
    seen.add(vodId);
    const songId = (href.split("/").pop() || "").replace(".html", "");
    const playUrl = `music://${HOST}/data/down.php?ac=music&id=${songId}`;
    const fullName = singer ? `${singer} - ${name}` : name;
    const item = {
      vod_id: vodId,
      vod_name: cleanText(fullName),
      vod_pic: getImage(pic) || "https://p2.music.126.net/xxx/song.jpg",
      vod_remarks: remarks,
      _type: "song",
      _song_id: songId,
      _play_url: playUrl,
      _singer: singer || "",
      _name: name || "",
    };
    homeRecommendCache.set(vodId, item);
    list.push({
      vod_id: item.vod_id,
      vod_name: item.vod_name,
      vod_pic: item.vod_pic,
      vod_remarks: item.vod_remarks,
    });
  };

  const pushMVItem = (href, name, pic, remarks) => {
    const vodId = absUrl(href);
    if (!vodId || seen.has(vodId)) return;
    seen.add(vodId);
    const mvId = (href.split("/").pop() || "").replace(".html", "");
    const playUrl = `${HOST}/data/down.php?ac=vplay&id=${mvId}&q=1080`;
    const item = {
      vod_id: vodId,
      vod_name: cleanText(name),
      vod_pic: getImage(pic, { isMV: true }) || "https://p2.music.126.net/xxx/mv_default.jpg",
      vod_remarks: remarks,
      _type: "mv",
      _mv_id: mvId,
      _play_url: playUrl,
    };
    homeRecommendCache.set(vodId, item);
    list.push({
      vod_id: item.vod_id,
      vod_name: item.vod_name,
      vod_pic: item.vod_pic,
      vod_remarks: item.vod_remarks,
    });
  };

  $("#datalist li, .lkmusic_list li, .layui-row.lkbj li").each((_, el) => {
    const node = $(el);
    const a = node.find(".name a.url, .name a, a").first();
    const href = a.attr("href") || "";
    if (!href.includes("/mp3/")) return;
    const name = a.text().trim();
    const singer = node.find(".singer, p a, .artist a, .author a").first().text().trim();
    const pic = node.find(".pic img, img").first().attr("src") || "";
    pushMusicItem(href, name, singer, pic, "🎵 正在播放");
  });

  $(".ilingkuplay_list li, .play_list li, .song_list li").each((_, el) => {
    const node = $(el);
    const a = node.find(".name a, a").first();
    const href = a.attr("href") || "";
    if (!href.includes("/mp3/")) return;
    const name = a.text().trim();
    pushMusicItem(href, name, "", "https://p2.music.126.net/xxx/new.jpg", "✨ 新歌推荐");
  });

  $(".video_list li, .ilingku_list li").each((_, el) => {
    const node = $(el);
    const a = node.find(".name a, a").first();
    const href = a.attr("href") || "";
    if (!href.includes("/mp4/")) return;
    const name = a.text().trim();
    const pic = node.find(".pic img, img").first().attr("src") || "";
    pushMVItem(href, name, pic, "🎬 MV推荐");
  });

  logInfo("首页推荐获取完成", { list: list.length, cache: homeRecommendCache.size });
  return list.slice(0, 60);
}

// ==================== 排行榜 ====================

const RANK_LIST = [
  ["rise", "🔥 音乐飙升榜"],
  ["new", "✨ 新歌排行榜"],
  ["original", "🎸 音乐原创榜"],
  ["top", "🎵 Top热歌榜"],
  ["douyin", "🎶 抖音热歌榜"],
  ["kuaishou", "📱 快手热歌榜"],
  ["zwdj", "💃 中文DJ榜"],
  ["hot", "🌐 网络热歌榜"],
  ["japan", "🗾 日本歌曲榜"],
  ["oumei", "🌍 欧美新歌榜"],
  ["korea", "🇰🇷 韩国音乐榜"],
  ["america", "🇺🇸 美国音乐榜"],
  ["acg", "🎮 ACG新歌榜"],
  ["acgyx", "🕹️ ACG游戏榜"],
  ["acgdm", "📺 ACG动画榜"],
  ["omtop", "🌎 欧美热歌榜"],
  ["dian", "⚡ 电子舞曲榜"],
  ["uktop", "🇬🇧 UK排行榜"],
  ["gudian", "🎻 古典音乐榜"],
  ["raptop", "🎤 RAP说唱榜"],
  ["dytop", "🔊 电音热歌榜"],
  ["qianli", "🚀 潜力热歌榜"],
  ["yytop", "🇭🇰 粤语金曲榜"],
  ["ystop", "🎬 影视金曲榜"],
  ["xyztop", "🌏 小语种热歌"],
  ["djtop", "🔄 串烧舞曲榜"],
  ["ktvtop", "🎤 KTV点唱榜"],
  ["chetop", "🚗 车载嗨曲榜"],
  ["aytop", "🌙 熬夜修仙榜"],
  ["sqtop", "😴 睡前放松榜"],
];

// ==================== 五大接口实现 ====================

async function home(params) {
  try {
    const { classes, filters } = getHomeClassesAndFilters();
    const list = await getHomeRecommendList();
    return { class: classes, filters, list };
  } catch (error) {
    logError("首页获取失败", error);
    return { class: [], list: [] };
  }
}

async function category(params) {
  const tid = String(params.categoryId || "");
  const pg = parseInt(params.page || "1", 10) || 1;
  const ext = params.extend || {};

  try {
    if (tid === "home") {
      return { list: await getHomeRecommendList(), page: 1, pagecount: 1, total: 60 };
    }

    if (tid === "rank_list") {
      const start = (pg - 1) * 30;
      const pageData = RANK_LIST.slice(start, start + 30);
      return {
        list: pageData.map(([id, name]) => ({
          vod_id: `rank_${id}`,
          vod_name: name,
          vod_pic: "https://p2.music.126.net/xxx/rank_default.jpg?param=500y500",
          vod_remarks: "📊 点击播放完整榜单",
          style: { type: "rect", ratio: 1.33 },
        })),
        page: pg,
        pagecount: Math.ceil(RANK_LIST.length / 30),
        total: RANK_LIST.length,
      };
    }

    if (tid === "playlist") {
      const lang = ext.lang || "index";
      const style = ext.style || "";
      let url = "/playlists/index.html";
      if (lang !== "index") url = `/playlists/${lang}.html`;
      else if (style) url = `/playlists/${style}.html`;
      if (pg > 1) url = url.replace(/\.html$/, `/${pg}.html`);

      const $ = await getDOM(url);
      const list = [];
      $(".video_list li, .ilingku_list li").each((_, el) => {
        const node = $(el);
        const a = node.find(".name a, a").first();
        const href = a.attr("href") || "";
        if (!href.includes("/playlist/")) return;
        list.push({
          vod_id: absUrl(href),
          vod_name: cleanText(a.text().trim()),
          vod_pic: getImage(node.find(".pic img, img").first().attr("src") || ""),
          vod_remarks: "📀 歌单",
          style: { type: "rect", ratio: 1.33 },
        });
      });
      return { list, page: pg, pagecount: hasNextPage($) ? pg + 1 : pg, total: 9999 };
    }

    if (tid === "singer") {
      const sex = ext.sex || "girl";
      const area = ext.area || "huayu";
      const ch = ext.char || "index";
      let url = "";
      if (ch !== "index") {
        url = pg > 1 ? `/singerlist/${area}/${sex}/${ch}/${pg}.html` : `/singerlist/${area}/${sex}/${ch}.html`;
      } else {
        url = pg > 1 ? `/singerlist/${area}/${sex}/index/${pg}.html` : `/singerlist/${area}/${sex}/index.html`;
      }
      const $ = await getDOM(url);
      const list = [];
      $(".singer_list li").each((_, el) => {
        const node = $(el);
        const picA = node.find(".pic a").first();
        const href = picA.attr("href") || "";
        if (!href) return;
        list.push({
          vod_id: absUrl(href),
          vod_name: cleanText(node.find(".name a").first().text().trim()),
          vod_pic: getImage(node.find("img").first().attr("src") || "", { isSinger: true }),
          vod_remarks: "👤 歌手",
          style: { type: "oval", ratio: 1 },
        });
      });
      return { list, page: pg, pagecount: hasNextPage($) ? pg + 1 : pg, total: 9999 };
    }

    if (tid === "mv") {
      const area = ext.area || "index";
      const type = ext.type || "index";
      const sort = ext.sort || "new";
      const mvUrl = pg === 1 ? `/mvlist/${area}/${type}/${sort}.html` : `/mvlist/${area}/${type}/${sort}/${pg}.html`;
      const $ = await getDOM(mvUrl);
      const list = [];
      $(".video_list li, .play_list li, .ilingku_list li").each((_, el) => {
        const node = $(el);
        const a = node.find(".name a, a.url, a.name, a").first();
        const href = a.attr("href") || "";
        if (!href.includes("/mp4/")) return;
        const rawName = a.text().trim();
        const pic = node.find(".pic img, img").first().attr("src") || "";
        const artist = node.find(".singer a, .artist a, .author a").first().text().trim();
        const mixId = `${absUrl(href)}@@mv@@area=${area}&type=${type}&sort=${sort}&page=${pg}`;
        list.push({
          vod_id: mixId,
          vod_name: cleanSongName(rawName),
          vod_pic: getImage(pic, { isMV: true }) || "https://p2.music.126.net/xxx/mv_default.jpg",
          vod_remarks: artist ? `🎬 MV · ${artist}` : "🎬 MV",
          style: { type: "rect", ratio: 1.78 },
        });
      });
      return { list, page: pg, pagecount: hasNextPage($) ? pg + 1 : pg, total: 9999 };
    }

    return { list: [], page: pg, pagecount: pg, total: 0 };
  } catch (error) {
    logError(`分类获取失败 tid=${tid}`, error);
    return { list: [], page: pg, pagecount: pg, total: 0 };
  }
}

async function search(params) {
  const keyword = (params.keyword || params.wd || "").trim();
  const pg = parseInt(params.page || "1", 10) || 1;
  if (!keyword) return { list: [], page: 1, pagecount: 0, total: 0 };

  try {
    const $ = await getDOM(`/so.php?wd=${encodeURIComponent(keyword)}&page=${pg}`);
    const list = [];
    $(".play_list li, .video_list li").each((_, el) => {
      const node = $(el);
      const a = node.find(".name a, a").first();
      const href = a.attr("href") || "";
      if (!href) return;
      const name = cleanText(a.text().trim());
      const pic = node.find("img").first().attr("src") || "";
      let remarks = "👤 歌手";
      let style = { type: "oval", ratio: 1 };
      if (href.includes("/mp3/")) {
        remarks = "🎵 歌曲";
        style = { type: "rect", ratio: 1.33 };
      } else if (href.includes("/mp4/")) {
        remarks = "🎬 MV";
        style = { type: "rect", ratio: 1.78 };
      } else if (href.includes("/playlist/")) {
        remarks = "📀 歌单";
        style = { type: "rect", ratio: 1.33 };
      }
      list.push({
        vod_id: absUrl(href),
        vod_name: name,
        vod_pic: getImage(pic, { isSinger: remarks === "👤 歌手", isMV: remarks === "🎬 MV" }),
        vod_remarks: remarks,
        style,
      });
    });
    return { list, page: pg, pagecount: hasNextPage($) ? pg + 1 : pg, total: 9999 };
  } catch (error) {
    logError("搜索失败", error);
    return { list: [], page: pg, pagecount: pg, total: 0 };
  }
}

async function detail(params) {
  const rawVideoId = String(params.videoId || "");
  if (!rawVideoId) return { list: [] };

  try {
    // 1) 排行榜详情
    if (rawVideoId.startsWith("rank_")) {
      const rankType = rawVideoId.replace("rank_", "");
      const $ = await getDOM(`/list/${rankType}.html`);
      const episodes = [];
      $(".play_list li").each((_, el) => {
        const a = $(el).find(".name a").first();
        const href = a.attr("href") || "";
        if (!href.includes("/mp3/")) return;
        const songId = (href.split("/").pop() || "").replace(".html", "");
        episodes.push({
          name: cleanSongName(a.text().trim()),
          playId: `music://${HOST}/data/down.php?ac=music&id=${songId}`,
        });
      });
      return {
        list: [
          {
            vod_id: rawVideoId,
            vod_name: `📊 ${rankType}`,
            vod_pic: "https://p2.music.126.net/xxx/rank_default.jpg?param=500y500",
            vod_content: `排行榜：${rankType}，共 ${episodes.length} 首`,
            vod_play_sources: [buildPlaySource("📊 排行榜", episodes)],
          },
        ],
      };
    }

    // 2) MV 分类混合 ID 解析
    let videoId = rawVideoId;
    if (rawVideoId.includes("@@mv@@")) {
      videoId = rawVideoId.split("@@mv@@")[0];
    }

    // 3) 首页缓存命中
    if (homeRecommendCache.has(videoId)) {
      const item = homeRecommendCache.get(videoId);
      const episodes = [{ name: item.vod_name, playId: item._play_url }];
      return {
        list: [
          {
            vod_id: videoId,
            vod_name: item.vod_name,
            vod_pic: item.vod_pic,
            vod_remarks: item.vod_remarks,
            vod_content: `首页推荐 · ${item.vod_name}`,
            vod_actor: item._singer || "",
            vod_play_sources: [buildPlaySource(item._type === "mv" ? "🎬 MV推荐" : "🎵 推荐歌曲", episodes)],
          },
        ],
      };
    }

    // 4) 通用详情页面
    const $ = await getDOM(videoId);
    const title = cleanText($("h1").first().text().trim() || ($("title").first().text() || "").split("_")[0]);
    const pic =
      $(".playhimg img, .djpic img, .video_list .pic img, .pic img")
        .first()
        .attr("src") || "";

    // 歌曲详情
    if (videoId.includes("/mp3/")) {
      const songId = (videoId.split("/").pop() || "").replace(".html", "");
      const singer = $(".play_singer .name a, .singer a, .artist a").first().text().trim();
      const displayName = singer ? `${singer} - ${cleanSongName(title)}` : cleanSongName(title);
      return {
        list: [
          {
            vod_id: videoId,
            vod_name: `🎵 ${cleanSongName(title)}`,
            vod_pic: getImage(pic),
            vod_actor: singer,
            vod_content: `🎵 歌曲 · ${singer || "未知歌手"}`,
            vod_play_sources: [
              buildPlaySource("🎵 歌曲播放列表", [
                {
                  name: displayName,
                  playId: `music://${HOST}/data/down.php?ac=music&id=${songId}`,
                },
              ]),
            ],
          },
        ],
      };
    }

    // MV 详情
    if (videoId.includes("/mp4/")) {
      const mvId = (videoId.split("/").pop() || "").replace(".html", "");
      const singer = $(".play_singer .name a, .singer_info .name a, .artist a").first().text().trim();
      const mvPlayUrl = `${HOST}/data/down.php?ac=vplay&id=${mvId}&q=1080`;
      return {
        list: [
          {
            vod_id: videoId,
            vod_name: `🎬 ${cleanSongName(title)}`,
            vod_pic: getImage(pic, { isMV: true }),
            vod_actor: singer,
            vod_content: `🎬 MV · ${singer || "未知歌手"}`,
            vod_play_sources: [buildPlaySource("🎬 MV播放列表", [{ name: cleanSongName(title), playId: mvPlayUrl }])],
          },
        ],
      };
    }

    // 歌单详情
    if (videoId.includes("/playlist/")) {
      const episodes = [];
      $(".play_list li").each((_, el) => {
        const a = $(el).find(".name a").first();
        const href = a.attr("href") || "";
        if (!href.includes("/mp3/")) return;
        const songId = (href.split("/").pop() || "").replace(".html", "");
        episodes.push({
          name: cleanSongName(a.text().trim()),
          playId: `music://${HOST}/data/down.php?ac=music&id=${songId}`,
        });
      });
      return {
        list: [
          {
            vod_id: videoId,
            vod_name: `📀 ${title}`,
            vod_pic: getImage(pic),
            vod_content: `📀 歌单 · 共 ${episodes.length} 首`,
            vod_play_sources: [buildPlaySource("📀 歌单", episodes)],
          },
        ],
      };
    }

    // 歌手详情
    if (videoId.includes("/singer/")) {
      const episodes = [];
      $(".play_list li").each((_, el) => {
        const a = $(el).find(".name a").first();
        const href = a.attr("href") || "";
        if (!href.includes("/mp3/")) return;
        const songId = (href.split("/").pop() || "").replace(".html", "");
        episodes.push({
          name: cleanSongName(a.text().trim()),
          playId: `music://${HOST}/data/down.php?ac=music&id=${songId}`,
        });
      });
      return {
        list: [
          {
            vod_id: videoId,
            vod_name: `👤 ${title}`,
            vod_pic: getImage(pic, { isSinger: true }),
            vod_content: $(".singer_info .info p").first().text().trim() || "世纪音乐网",
            vod_play_sources: [buildPlaySource(`🎵 歌手歌曲 · ${episodes.length}首`, episodes)],
          },
        ],
      };
    }

    return {
      list: [
        {
          vod_id: videoId,
          vod_name: title || "未知内容",
          vod_pic: getImage(pic),
          vod_content: "世纪音乐网",
          vod_play_sources: [],
        },
      ],
    };
  } catch (error) {
    logError("详情获取失败", error);
    return { list: [] };
  }
}

// ==================== 歌词相关 ====================

function filterLrcAds(lrcText) {
  if (!lrcText) return "";
  const adPatterns = [
    /欢迎访问/i,
    /欢迎来到/i,
    /本站/i,
    /广告/i,
    /QQ群/i,
    /微信/i,
    /www\./i,
    /http/i,
    /\.com/i,
    /\.cn/i,
    /\.net/i,
    /音乐网/i,
    /下载/i,
    /免费/i,
    /版权/i,
    /声明/i,
    /邮箱/i,
    /联系/i,
    /oeecc/i,
    /foxmail/i,
  ];

  return String(lrcText)
    .split(/\r?\n/)
    .filter((line) => {
      if (!line.trim()) return true;
      if (/^\[(ar|ti|al|by|offset|total|length):/i.test(line)) return true;
      if (!/^\[\d{2}:\d{2}/.test(line)) return true;
      return !adPatterns.some((re) => re.test(line));
    })
    .join("\n");
}

async function getLrcBySongId(songId) {
  if (!songId) return "";
  const cacheKey = `lrc_${songId}`;
  if (lrcCache.has(cacheKey)) return lrcCache.get(cacheKey);

  const tryUrls = [
    `${HOST}/down.php?ac=music&lk=txt&id=${songId}`,
    `${HOST}/data/lrc/${songId}.lrc`,
  ];

  for (const url of tryUrls) {
    try {
      const res = await httpClient.get(url, {
        responseType: "arraybuffer",
        headers: { ...DEFAULT_HEADERS, Referer: `${HOST}/` },
      });
      if (res.status !== 200 || !res.data) continue;
      const text = Buffer.from(res.data).toString("utf-8");
      if (/\[\d{2}:\d{2}/.test(text)) {
        const finalLrc = filterLrcAds(text);
        lrcCache.set(cacheKey, finalLrc);
        return finalLrc;
      }
    } catch (_) {
      // 单个源失败不影响继续尝试
    }
  }

  return "";
}

// ==================== 播放接口 ====================

async function play(params) {
  const playId = String(params.playId || "").trim();
  const flag = String(params.flag || "");

  try {
    if (!playId) throw new Error("playId 不能为空");

    let finalUrl = playId;
    let parse = 0;

    // 统一处理 music:// 协议
    if (finalUrl.startsWith("music://")) {
      finalUrl = finalUrl.replace("music://", "");
      if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`;
    }

    // 如果是详情页地址，转换成直链
    if (finalUrl.includes("/mp3/")) {
      const songId = (finalUrl.split("/").pop() || "").replace(".html", "");
      finalUrl = `${HOST}/data/down.php?ac=music&id=${songId}`;
    } else if (finalUrl.includes("/mp4/")) {
      const mvId = (finalUrl.split("/").pop() || "").replace(".html", "");
      finalUrl = `${HOST}/data/down.php?ac=vplay&id=${mvId}&q=1080`;
    }

    // 常见直链后缀可直接播放
    if (/\.(m3u8|mp4|mp3|flv|wav|aac|ogg|m4a)(\?|$)/i.test(finalUrl)) {
      parse = 0;
    }

    // 歌词增强：仅歌曲尝试加载
    let lrc = "";
    if (/ac=music/i.test(finalUrl)) {
      const match = /[?&]id=([^&]+)/i.exec(finalUrl);
      const songId = match ? match[1] : "";
      lrc = await getLrcBySongId(songId);
    }

    return {
      urls: [{ name: "播放", url: finalUrl }],
      parse,
      header: {
        "User-Agent": DEFAULT_HEADERS["User-Agent"],
        Referer: `${HOST}/`
      },
      ...(lrc ? { lrc } : {})};
  } catch (error) {
    logError("播放失败", error);
    return {
      urls: [],
      parse: 0,
      header: {}
  };
  }
}

// ==================== 导出与运行 ====================

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

_load(5, "枫叶音乐", function (module, exports, require) {
// @name 枫叶音乐
// @author 
// @description 
// @dependencies: axios
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/音乐/枫叶音乐.js

/**
 * ============================================================================
 * 枫叶音乐 - OmniBox 爬虫脚本
 * ============================================================================
 */
const axios = require("axios");
const http = require("http");
const https = require("https");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const host = 'https://fy-musicbox-api.mu-jie.cc';
const def_headers = {
    "Host": "fy-musicbox-api.mu-jie.cc",
    "Connection": "keep-alive",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
    "sec-ch-ua-platform": '"Windows"',
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
    "sec-ch-ua": '"Microsoft Edge";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
    "sec-ch-ua-mobile": "?0",
    "Accept": "*/*",
    "Origin": "https://mu-jie.cc",
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Referer": "https://mu-jie.cc/",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6"
};

const axiosInstance = axios.create({
    timeout: 15000,
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
    httpAgent: new http.Agent({ keepAlive: true })
});

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    OmniBox.log("info", `[枫叶音乐] ${output}`);
};

const logError = (message, error) => {
    OmniBox.log("error", `[枫叶音乐] ${message}: ${error.message || error}`);
};

/**
 * 首页 - 返回音乐分类
 */
async function home(params) {
    logInfo("进入首页，获取分类");
    try {
        const url = `${host}/getPlaylistCategory`;
        const response = await axiosInstance.get(url, { headers: def_headers });
        const data = response.data;

        const classes = [];
        if (data && Array.isArray(data) && data.length > 0) {
            const categories = data[0].category;
            
            for (const category of categories) {
                if (category.sub && Array.isArray(category.sub)) {
                    for (const subCategory of category.sub) {
                        classes.push({
                            type_id: subCategory.name || '',
                            type_name: subCategory.name || ''
                        });
                    }
                }
            }
        }

        logInfo("分类获取成功", { count: classes.length });
        return {
            class: classes,
            list: []
        };
    } catch (e) {
        logError("获取分类失败", e);
        return { class: [], list: [] };
    }
}

/**
 * 分类列表 - 获取歌单或歌曲列表
 */
async function category(params) {
    const { categoryId, page } = params;
    const pg = parseInt(page) || 1;
    logInfo(`请求分类: ${categoryId}, 页码: ${pg}`);

    try {
        // 判断是否为歌单ID（包含@符号）
        if (categoryId.includes('@')) {
            // 获取歌单内的歌曲列表
            const playlistId = categoryId.split('@')[0];
            const url = `${host}/meting/?server=netease&type=playlist&id=${playlistId}`;
            const response = await axiosInstance.get(url, { headers: def_headers });
            const data = response.data;

            const list = [];
            if (data && data.tracks && Array.isArray(data.tracks)) {
                data.tracks.forEach(track => {
                    list.push({
                        vod_id: track.url || '',
                        vod_name: track.name || '',
                        vod_pic: track.pic || '',
                        vod_remarks: track.artist || '',
                        vod_tag: 'music'
                    });
                });
            }

            logInfo("歌单歌曲获取成功", { count: list.length });
            return {
                list: list,
                page: pg,
                pagecount: 1
            };
        } else {
            // 获取分类下的歌单列表
            const url = `${host}/netease/playlist/category?type=${categoryId}&limit=60`;
            const response = await axiosInstance.get(url, { headers: def_headers });
            const data = response.data;

            const list = [];
            if (data && Array.isArray(data)) {
                data.forEach(playlist => {
                    list.push({
                        vod_id: `${playlist.id}@`,
                        vod_name: playlist.name || '',
                        vod_pic: playlist.coverImgUrl || '',
                        vod_remarks: `${playlist.playCount || 0} 播放量`,
                        vod_tag: 'folder'
                    });
                });
            }

            logInfo("歌单列表获取成功", { count: list.length });
            return {
                list: list,
                page: pg,
                pagecount: 1
            };
        }
    } catch (e) {
        logError("分类请求失败", e);
        return { list: [], page: pg, pagecount: 1 };
    }
}

/**
 * 搜索
 */
async function search(params) {
    const wd = params.keyword || params.wd || "";
    const pg = parseInt(params.page) || 1;
    logInfo(`搜索关键词: ${wd}, 页码: ${pg}`);

    try {
        const url = `${host}/netease/search/song/?keywords=${encodeURIComponent(wd)}&pn=${pg}&limit=20`;
        const response = await axiosInstance.get(url, { headers: def_headers });
        const data = response.data;

        const list = [];
        if (data && Array.isArray(data)) {
            data.forEach(song => {
                list.push({
                    vod_id: song.url || '',
                    vod_name: song.name || '',
                    vod_pic: song.pic || '',
                    vod_remarks: song.artist || '',
                    vod_tag: 'music'
                });
            });
        }

        logInfo("搜索成功", { count: list.length });
        return {
            list: list,
            page: pg,
            pagecount: 9999
        };
    } catch (e) {
        logError("搜索失败", e);
        return { list: [], page: pg, pagecount: 1 };
    }
}

/**
 * 详情 - 音乐详情
 */
async function detail(params) {
    const videoId = params.videoId;
    logInfo(`请求详情 ID: ${videoId}`);

    try {
        // 音乐直接使用URL作为播放源
        const playSources = [{
            name: '音乐专线',
            episodes: [{
                name: '播放',
                playId: videoId
            }]
        }];

        return {
            list: [{
                vod_id: videoId,
                vod_name: '音乐播放',
                vod_pic: '',
                vod_content: '点击播放音乐',
                vod_play_sources: playSources
            }]
        };
    } catch (e) {
        logError("详情获取失败", e);
        return { list: [] };
    }
}

/**
 * 播放 - 获取真实播放地址
 */
async function play(params) {
    const playId = params.playId;
    logInfo(`准备播放 ID: ${playId}`);

    let finalUrl = playId;

    try {
        // 获取重定向后的真实URL
        const response = await axiosInstance.get(playId, {
            headers: def_headers,
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });

        if (response.headers.location) {
            finalUrl = response.headers.location;
            logInfo("获取到重定向地址", { url: finalUrl });
        }
    } catch (e) {
        logError("获取播放地址失败，使用原始URL", e);
    }

    logInfo(`最终播放地址: ${finalUrl}`);

    return {
        urls: [{ name: "音乐专线", url: finalUrl }],
        parse: 0,
        header: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36'
        }
    };
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);
});

_load(6, "芸芸音乐", function (module, exports, require) {
// @name 芸芸音乐[听]
// @version 1.0.2
// @author Silent1566
// @origin repo.tvshare.cn/api/files/download/[REDACTED]
// @push 0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/音乐/芸芸音乐.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

const SOURCE_NAME = "芸芸音乐";
const GD_API = "https://music-api.gdstudio.xyz/api.php";
const NETEASE_HOST = "https://music.163.com";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1";

const CLASSES = [
  { type_id: "recommend", type_name: "推荐歌单" },
  { type_id: "toplist", type_name: "排行榜" },
  { type_id: "hot", type_name: "热门歌单" },
  { type_id: "artist", type_name: "热门歌手" },
];

const HOT_CATS = ["全部", "华语", "流行", "摇滚", "民谣", "电子", "轻音乐", "影视原声", "ACG", "欧美", "日语", "韩语", "粤语"];
const FILTERS = {
  recommend: [{ key: "area", name: "分类", value: CLASSES.map(c => ({ n: c.type_name, v: c.type_id })) }],
  toplist: [{ key: "area", name: "分类", value: CLASSES.map(c => ({ n: c.type_name, v: c.type_id })) }],
  hot: [
    { key: "area", name: "分类", value: CLASSES.map(c => ({ n: c.type_name, v: c.type_id })) },
    { key: "cat", name: "歌单标签", value: HOT_CATS.map(v => ({ n: v, v })) },
  ],
  artist: [{ key: "area", name: "分类", value: CLASSES.map(c => ({ n: c.type_name, v: c.type_id })) }],
};

function logInfo(message, data) {
  return OmniBox.log("info", `[芸芸音乐] ${message}${data ? `: ${JSON.stringify(data)}` : ""}`);
}

function logError(message, error) {
  return OmniBox.log("error", `[芸芸音乐] ${message}: ${error?.message || error}`);
}

function safeJSONParse(input, fallback = {}) {
  if (!input) return fallback;
  if (typeof input === "object") return input;
  try {
    return JSON.parse(String(input));
  } catch {
    return fallback;
  }
}

function getResponseBody(res) {
  if (!res) return "";
  if (typeof res === "string") return res;
  return res.body ?? res.content ?? res.data ?? "";
}

async function requestText(url, options = {}) {
  const headers = {
    "User-Agent": UA,
    Referer: "https://music.163.com/",
    Accept: "*/*",
    ...(options.headers || {}),
  };
  const res = await OmniBox.request(url, {
    method: options.method || "GET",
    headers,
    data: options.data,
    timeout: options.timeout || 12000,
  });
  const statusCode = res?.statusCode || res?.status || 200;
  if (statusCode >= 400) throw new Error(`HTTP ${statusCode} @ ${url}`);
  return getResponseBody(res);
}

async function requestJson(url, fallback = {}) {
  const body = await requestText(url);
  return safeJSONParse(body, fallback);
}

function getPicUrl(pic, size = "500y500") {
  if (!pic) return "";
  const clean = String(pic).replace(/\?param=\d+y\d+$/i, "");
  if (!/^https?:\/\//i.test(clean)) return clean;
  return `${clean}?param=${size}`;
}

function getSongPic(song = {}, defaultPic = "", size = "300y300") {
  return getPicUrl(song.al?.picUrl || song.album?.picUrl || song.picUrl || defaultPic, size);
}

function getArtistName(song = {}) {
  return song.ar?.map(a => a.name).filter(Boolean).join("/")
    || song.artists?.map(a => a.name).filter(Boolean).join("/")
    || song.artist
    || "";
}

function formatNumber(num) {
  const value = Number(num || 0);
  if (!value) return "0";
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
  return String(value);
}

function b64Encode(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

function b64Decode(text) {
  try {
    return JSON.parse(Buffer.from(String(text || ""), "base64").toString("utf8"));
  } catch {
    return {};
  }
}

function makePlayId(song, defaultPic = "") {
  const artist = getArtistName(song);
  const pic = getSongPic(song, defaultPic, "500y500");
  return `songplay:${b64Encode({
    id: String(song.id || song.songId || ""),
    name: song.name || "未知歌曲",
    artist,
    pic,
  })}`;
}

function decodePlayId(playId) {
  const id = String(playId || "");
  if (id.startsWith("songplay:")) return b64Decode(id.slice("songplay:".length));
  if (id.startsWith("song@")) return { id: id.slice("song@".length) };
  if (/^\d+$/.test(id)) return { id };
  return b64Decode(id);
}

function makeSongVod(song, defaultPic = "") {
  const artist = getArtistName(song);
  const name = song.name || "未知歌曲";
  const displayName = artist ? `${name} - ${artist}` : name;
  const pic = getSongPic(song, defaultPic, "300y300");
  return {
    vod_id: `song@${song.id}`,
    vod_name: displayName,
    vod_pic: pic,
    vod_remarks: song.al?.name || song.album?.name || artist || SOURCE_NAME,
    type_id: "music",
    type_name: "音乐",
    vod_tag: "music",
  };
}

function makeDetailVodId(type, id) {
  return `detail:${type}@${id}`;
}

function unwrapDetailVodId(videoId = "") {
  const raw = String(videoId || "");
  return raw.startsWith("detail:") ? raw.slice("detail:".length) : raw;
}

function isDetailVodId(videoId = "") {
  return /^(?:detail:)?(?:playlist|toplist|artist)@/.test(String(videoId || ""));
}

function buildEpisodes(tracks = [], defaultPic = "") {
  return tracks.filter(s => s?.id).map((song, index) => {
    const artist = getArtistName(song);
    const name = artist ? `${song.name} - ${artist}` : (song.name || `歌曲${index + 1}`);
    return { name, playId: makePlayId(song, defaultPic) };
  });
}

function buildLegacyPlayUrl(episodes = []) {
  return episodes.map(ep => `${String(ep.name || "播放").replace(/[$#]/g, " ")}$${ep.playId}`).join("#");
}

function getFilters(params = {}) {
  return params.filters || params.extend || params.ext || {};
}

async function getList(type, page, filters = {}) {
  const limit = 20;
  const offset = (Math.max(Number(page || 1), 1) - 1) * limit;
  const list = [];
  const area = filters.area || type;

  if (area && area !== type && ["recommend", "toplist", "hot", "artist"].includes(area)) {
    type = area;
  }

  await logInfo("分类请求", { type, page, filters });

  if (type === "recommend") {
    const json = await requestJson(`${NETEASE_HOST}/api/personalized/playlist?limit=${Math.max(limit, offset + limit)}`, {});
    (json.result || []).slice(offset, offset + limit).forEach(it => {
      list.push({
        vod_id: makeDetailVodId("playlist", it.id),
        vod_name: it.name || "推荐歌单",
        vod_pic: getPicUrl(it.picUrl, "300y300"),
        vod_remarks: `🎧${formatNumber(it.playCount)}`,
        vod_tag: "video",
        type_id: "music",
        type_name: "音乐",
      });
    });
  } else if (type === "toplist") {
    const json = await requestJson(`${NETEASE_HOST}/api/toplist`, {});
    (json.list || []).slice(offset, offset + limit).forEach(it => {
      list.push({
        vod_id: makeDetailVodId("toplist", it.id),
        vod_name: it.name || "排行榜",
        vod_pic: getPicUrl(it.coverImgUrl || it.picUrl, "300y300"),
        vod_remarks: it.updateFrequency || `${it.trackCount || 0}首`,
        vod_tag: "video",
        type_id: "music",
        type_name: "音乐",
      });
    });
  } else if (type === "artist") {
    const json = await requestJson(`${NETEASE_HOST}/api/artist/top?limit=${limit}&offset=${offset}`, {});
    (json.artists || []).forEach(it => {
      list.push({
        vod_id: makeDetailVodId("artist", it.id),
        vod_name: it.name || "歌手",
        vod_pic: getPicUrl(it.img1v1Url || it.picUrl, "300y300"),
        vod_remarks: `${it.albumSize || 0}张专辑`,
        vod_tag: "video",
        type_id: "music",
        type_name: "音乐",
      });
    });
  } else {
    const cat = filters.cat || "全部";
    const json = await requestJson(`${NETEASE_HOST}/api/playlist/list?cat=${encodeURIComponent(cat)}&limit=${limit}&offset=${offset}&order=hot`, {});
    (json.playlists || []).forEach(it => {
      list.push({
        vod_id: makeDetailVodId("playlist", it.id),
        vod_name: it.name || "热门歌单",
        vod_pic: getPicUrl(it.coverImgUrl, "300y300"),
        vod_remarks: it.playCount ? `🎧${formatNumber(it.playCount)}` : "热门歌单",
        vod_tag: "video",
        type_id: "music",
        type_name: "音乐",
      });
    });
  }

  return list;
}

async function home(params, context) {
  try {
    const listResult = await category({ categoryId: "recommend", page: 1 }, context);
    const list = (listResult.list || []).slice(0, 20);
    await logInfo("首页完成", { classCount: CLASSES.length, listCount: list.length });
    return { class: CLASSES, filters: FILTERS, list };
  } catch (e) {
    await logError("首页失败", e);
    return { class: CLASSES, filters: FILTERS, list: [] };
  }
}

async function category(params, context) {
  const page = Math.max(Number(params?.page || 1), 1);
  const categoryId = String(params?.categoryId || params?.type_id || "recommend");
  try {
    // 兼容部分宿主：即使列表项已标记为 video，仍可能把 playlist/toplist/artist 当 category 打开。
    // 这里直接返回详情里的歌曲列表，避免用户点击歌单后只是刷新推荐分组。
    if (isDetailVodId(categoryId)) {
      const detailResult = await detail({ videoId: categoryId }, context);
      const vod = detailResult?.list?.[0] || null;
      const episodes = vod?.vod_play_sources?.[0]?.episodes || [];
      const list = episodes.map((ep, index) => ({
        vod_id: `songplay:${String(ep.playId || "").replace(/^songplay:/, "")}`,
        vod_name: ep.name || `歌曲${index + 1}`,
        vod_pic: vod?.vod_play_pic?.split("#")?.[index] || vod?.vod_pic || "",
        vod_remarks: vod?.vod_name || SOURCE_NAME,
        type_id: "music",
        type_name: "音乐",
        vod_tag: "music",
      }));
      await logInfo("分类命中详情ID，已展开歌曲列表", { categoryId, page, listCount: list.length });
      return { page, pagecount: page, total: list.length, list };
    }

    const filters = getFilters(params);
    const list = await getList(categoryId, page, filters);
    await logInfo("分类完成", { categoryId, page, listCount: list.length });
    return {
      page,
      pagecount: list.length >= 20 ? page + 1 : page,
      total: list.length >= 20 ? page * 20 + 1 : (page - 1) * 20 + list.length,
      list,
    };
  } catch (e) {
    await logError("分类失败", e);
    return { page, pagecount: page, total: 0, list: [] };
  }
}

async function getSongDetail(songId) {
  const json = await requestJson(`${NETEASE_HOST}/api/song/detail?ids=[${encodeURIComponent(songId)}]`, {});
  return json.songs?.[0] || null;
}

async function detail(params, context) {
  const videoId = String(params?.videoId || "");
  try {
    await logInfo("详情入口", { videoId });
    const realVideoId = unwrapDetailVodId(videoId);
    const [type, ...rest] = realVideoId.split("@");
    const id = rest.join("@");
    if (!type || !id) return { list: [] };

    if (type === "song") {
      const song = await getSongDetail(id);
      if (!song) return { list: [] };
      const episodes = buildEpisodes([song]);
      const artist = getArtistName(song);
      const pic = getSongPic(song, "", "500y500");
      const vod = {
        vod_id: videoId,
        vod_name: artist ? `${song.name} - ${artist}` : song.name,
        vod_pic: pic,
        vod_actor: artist,
        type_id: "music",
        type_name: "音乐",
        vod_content: song.al?.name || song.album?.name || song.name,
        vod_play_sources: [{ name: SOURCE_NAME, episodes }],
        vod_play_from: SOURCE_NAME,
        vod_play_url: buildLegacyPlayUrl(episodes),
        vod_play_pic: pic,
        vod_play_pic_ratio: 1.0,
      };
      await logInfo("单曲详情完成", { songId: id, episodeCount: episodes.length });
      return { list: [vod] };
    }

    let json = {};
    let data = {};
    let tracks = [];
    if (type === "artist") {
      json = await requestJson(`${NETEASE_HOST}/api/artist/${encodeURIComponent(id)}`, {});
      data = json.artist || {};
      tracks = json.hotSongs || [];
    } else {
      json = await requestJson(`${NETEASE_HOST}/api/v6/playlist/detail?id=${encodeURIComponent(id)}`, {});
      data = json.playlist || json.result || {};
      tracks = data.tracks || [];
    }

    const defaultPic = getPicUrl(data.coverImgUrl || data.picUrl || data.img1v1Url, "500y500");
    const episodes = buildEpisodes(tracks, defaultPic);
    const vod = {
      vod_id: videoId,
      vod_name: data.name || (type === "artist" ? "未知歌手" : "未知歌单"),
      vod_pic: defaultPic,
      vod_actor: type === "artist" ? (data.name || "") : "",
      type_id: "music",
      type_name: "音乐",
      vod_remarks: type === "artist" ? `共${episodes.length}首` : `${formatNumber(data.playCount || 0)} | 共${episodes.length}首`,
      vod_content: data.description || data.briefDesc || data.name || "",
      vod_play_sources: [{ name: SOURCE_NAME, episodes }],
      vod_play_from: SOURCE_NAME,
      vod_play_url: buildLegacyPlayUrl(episodes),
      vod_play_pic: episodes.map(ep => decodePlayId(ep.playId.slice("songplay:".length))?.pic || "").join("#"),
      vod_play_pic_ratio: 1.0,
    };
    await logInfo("详情完成", { type, id, episodeCount: episodes.length });
    return { list: [vod] };
  } catch (e) {
    await logError("详情失败", e);
    return { list: [] };
  }
}

async function search(params, context) {
  const keyword = String(params?.keyword || params?.wd || "").trim();
  const page = Math.max(Number(params?.page || 1), 1);
  try {
    if (!keyword) return { page, pagecount: page, total: 0, list: [] };
    const json = await requestJson(`${NETEASE_HOST}/api/search/get?s=${encodeURIComponent(keyword)}&type=1&offset=${(page - 1) * 30}&limit=30`, {});
    const songs = json.result?.songs || json.songs || [];
    const list = songs.filter(s => s?.id).map(makeSongVod);
    await logInfo("搜索完成", { keyword, page, listCount: list.length });
    return {
      page,
      pagecount: list.length >= 30 ? page + 1 : page,
      total: list.length >= 30 ? page * 30 + 1 : (page - 1) * 30 + list.length,
      list,
    };
  } catch (e) {
    await logError("搜索失败", e);
    return { page, pagecount: page, total: 0, list: [] };
  }
}

async function gdGetUrl(songId, br) {
  const json = await requestJson(`${GD_API}?types=url&id=${encodeURIComponent(songId)}&source=netease&br=${br}`, null);
  return json;
}

async function getLyric(songId) {
  try {
    const json = await requestJson(`${NETEASE_HOST}/api/song/lyric?id=${encodeURIComponent(songId)}&lv=1&kv=1&tv=-1`, {});
    let lrc = json.lrc?.lyric || "";
    if (json.tlyric?.lyric) lrc += `\n\n【翻译】\n${json.tlyric.lyric}`;
    return lrc;
  } catch (e) {
    await logError("歌词获取失败", e);
    return "";
  }
}

async function play(params, context) {
  const playId = String(params?.playId || "").trim();
  const flag = String(params?.flag || SOURCE_NAME);
  try {
    const meta = decodePlayId(playId);
    const songId = String(meta.id || "").trim();
    if (!songId) throw new Error("songId 为空");

    const qualities = [
      { name: "FLAC无损", br: 2000 },
      { name: "HQ高品质", br: 320 },
      { name: "标准品质", br: 192 },
      { name: "AAC流畅", br: 128 },
    ];

    const urls = [];
    const seen = new Set();
    for (const q of qualities) {
      try {
        const res = await gdGetUrl(songId, q.br);
        const url = res?.url || res?.data?.url || "";
        if (url && /^https?:\/\//i.test(url) && !seen.has(url)) {
          seen.add(url);
          urls.push({ name: q.name, url });
        }
      } catch (e) {
        await logError(`音质地址获取失败 ${q.name}`, e);
      }
    }

    if (!urls.length) throw new Error("未获取到可播放地址");
    const [lrc, songInfo] = await Promise.all([
      getLyric(songId),
      meta.pic ? Promise.resolve(null) : getSongDetail(songId).catch(() => null),
    ]);
    const cover = meta.pic || getSongPic(songInfo || {}, "", "500y500");
    await logInfo("播放完成", { songId, urlCount: urls.length, hasLrc: !!lrc, hasCover: !!cover });
    return {
      urls,
      url: urls[0].url,
      parse: 0,
      header: { "User-Agent": UA, Referer: "https://music.163.com/" },
      pic: cover,
      cover,
      lrc,
      height: 720};
  } catch (e) {
    await logError("播放失败", e);
    return { urls: [], parse: 0, header: { "User-Agent": UA, Referer: "https://music.163.com/" } };
  }
}

});
