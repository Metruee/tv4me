// @name 影视采集G(合并4源)
// @version 3.20261030.1219
// @description 自动同步：采集聚合
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-采集G.js
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


_load(0, "88看球", function (module, exports, require) {
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

_load(1, "人人影视PRO", function (module, exports, require) {
// @name 人人影视PRO
// @author 梦
// @description 页面解析：首页/分类/播放页已接入；播放页直接解析 Artplayer 的 m3u8 地址与剧集列表
// @dependencies cheerio
// @version 1.1.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/人人影视PRO.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const BASE_URL = "https://www.renren.pro";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

const CLASS_LIST = [
  { type_id: "all", type_name: "影视库" }
];

const CATEGORY_PATH = {
  all: "/list/all"
};

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

function getBodyText(res) {
  const body = res && typeof res === "object" && "body" in res ? res.body : res;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return body.toString();
  return String(body || "");
}

function absUrl(url, base = BASE_URL) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  try {
    return new URL(value, /^https?:\/\//i.test(base) ? base : `${BASE_URL}/`).toString();
  } catch {
    if (value.startsWith("/")) return `${BASE_URL}${value}`;
    return `${BASE_URL}/${value.replace(/^\/+/, "")}`;
  }
}

function stripHtml(text) {
  return String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function dedupeBy(list, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of list || []) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function fetchText(url, options = {}) {
  const res = await OmniBox.request(url, {
    method: options.method || "GET",
    headers: {
      "User-Agent": UA,
      Referer: options.referer || `${BASE_URL}/`,
      ...(options.headers || {})
    },
    timeout: options.timeout || 20000,
    body: options.body
  });

  if (!res || Number(res.statusCode) < 200 || Number(res.statusCode) >= 400) {
    throw new Error(`HTTP ${res?.statusCode || "unknown"} @ ${url}`);
  }

  return getBodyText(res);
}

function parseVodCards(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const list = [];

  $("a[href^='/play/']").each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href") || "";
    if (!/^\/play\//.test(href)) return;

    const title = $a.attr("title") || stripHtml($a.text()) || stripHtml($a.find(".module-poster-item-title, .module-item-title, .title").first().text());
    if (!title) return;

    const card = $a.closest(".module-item, .module-item-cover, .module-list-item, .vod-item, .video-item");
    const img = card.find("img").first().length ? card.find("img").first() : $a.find("img").first();
    const pic = img.attr("data-src") || img.attr("data-original") || img.attr("src") || "";
    const remarks = stripHtml(card.find(".module-item-note, .remarks, .video-serial, .public-list-prb, .module-item-text").first().text());
    const vodId = href.replace(/^\//, "");

    list.push({
      vod_id: vodId,
      vod_name: title,
      vod_pic: absUrl(pic),
      vod_remarks: remarks
    });
  });

  return dedupeBy(list, (item) => item.vod_id);
}

async function resolvePosterByPlayId(playId) {
  const normalizedId = String(playId || "").replace(/^https?:\/\/[^/]+\//, "").replace(/^\//, "");
  if (!normalizedId) return "";

  const pages = [`${BASE_URL}/`, `${BASE_URL}/list/all`];
  for (const url of pages) {
    try {
      const html = await fetchText(url);
      const cards = parseVodCards(html);
      const hit = cards.find((item) => item.vod_id === normalizedId && item.vod_pic);
      if (hit?.vod_pic) return hit.vod_pic;
    } catch (e) {
      await OmniBox.log("warn", `[人人影视][poster] url=${url} message=${e.message}`);
    }
  }
  return "";
}

function parseEpisodeLinks(html, pageUrl) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const list = [];
  $(".module-blocklist a[href^='/play/']").each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href") || "";
    const name = stripHtml($a.text()) || stripHtml($a.attr("title") || "");
    if (!href || !name) return;
    list.push({ name, playId: absUrl(href, pageUrl) });
  });
  return dedupeBy(list, (item) => item.playId);
}

function extractPlayUrl(html) {
  const raw = String(html || "");
  const hit = raw.match(/url:\s*"([^"]+\.m3u8[^"]*)"/i) || raw.match(/url":"([^"]+\.m3u8[^"]*)"/i);
  if (!hit) return "";
  return String(hit[1] || "").replace(/\\\//g, "/").trim();
}

async function home(params, context) {
  try {
    const html = await fetchText(`${BASE_URL}/`);
    const list = parseVodCards(html).slice(0, 40);
    await OmniBox.log("info", `[人人影视][home] list=${list.length}`);
    return { class: CLASS_LIST, list };
  } catch (e) {
    await OmniBox.log("error", `[人人影视][home] ${e.message}`);
    return { class: CLASS_LIST, list: [] };
  }
}

async function category(params, context) {
  try {
    const categoryId = String(params?.categoryId || "all").trim();
    const page = Math.max(1, Number(params?.page || 1) || 1);
    const basePath = CATEGORY_PATH[categoryId] || CATEGORY_PATH.all;
    const url = page > 1 ? `${absUrl(basePath)}?page=${page}` : absUrl(basePath);
    const html = await fetchText(url);
    const list = parseVodCards(html);
    const pageNums = [...html.matchAll(/[?&]page=(\d+)/g)].map((m) => Number(m[1]));
    const pagecount = Math.max(page, ...(pageNums.length ? pageNums : [page]));
    await OmniBox.log("info", `[人人影视][category] category=${categoryId} page=${page} list=${list.length} pagecount=${pagecount}`);
    return { page, pagecount, total: list.length, list };
  } catch (e) {
    await OmniBox.log("error", `[人人影视][category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const videoId = String(params?.videoId || "").trim();
    if (!videoId) return { list: [] };

    const detailUrl = /^https?:\/\//i.test(videoId) ? videoId : `${BASE_URL}/${videoId.replace(/^\//, "")}`;
    const html = await fetchText(detailUrl);
    const $ = cheerio.load(html, { decodeEntities: false });

    const pageTitle = stripHtml($("title").first().text());
    const vodName = stripHtml($(".title-link").first().text()) || pageTitle.replace(/\s*-\s*第\d+集.*$/, "").replace(/\s*-\s*免费在线观看.*$/, "").trim();
    const poster = $(".video-cover img, .module-item-pic img, img").first();
    let vodPic = absUrl(poster.attr("data-src") || poster.attr("src") || "");
    if (!vodPic || /\/public\/statics\/images\/renren\.png$/i.test(vodPic) || /\/public\/.+\.gif$/i.test(vodPic)) {
      vodPic = await resolvePosterByPlayId(videoId);
    }
    const tagList = $(".video-info-aux .tag-link").map((_, el) => stripHtml($(el).text())).get().filter(Boolean);
    const typeName = tagList[0] || "";
    const vodLang = tagList[1] || "";
    const vodArea = tagList[2] || "";
    const sideTitle = stripHtml($(".title-info").first().text());
    const metaDesc = stripHtml($("meta[name='description']").attr("content") || "");
    const headings = $("h1, h2, h3, h4").map((_, el) => stripHtml($(el).text())).get().filter(Boolean);
    const episodeMatch = (pageTitle.match(/第\d+集/) || [])[0] || (headings.find((t) => /第\d+集/.test(t)) || "");
    const remarks = [typeName, vodLang, vodArea, episodeMatch].filter(Boolean).join(" · ");
    const vodContent = [sideTitle, metaDesc].filter(Boolean).join("\n");
    const yearMatch = html.match(/20\d{2}/);
    const vodYear = yearMatch ? yearMatch[0] : "";

    const episodes = parseEpisodeLinks(html, detailUrl);
    const vodPlaySources = episodes.length ? [{ name: "在线播放", episodes }] : [];

    await OmniBox.log("info", `[人人影视][detail] videoId=${videoId} episodes=${episodes.length}`);
    return {
      list: [
        {
          vod_id: videoId.replace(/^https?:\/\/[^/]+\//, ""),
          vod_name: vodName,
          vod_pic: vodPic,
          type_name: typeName,
          vod_area: vodArea,
          vod_year: vodYear,
          vod_subtitle: vodLang,
          vod_content: vodContent,
          vod_remarks: remarks,
          vod_play_sources: vodPlaySources
        }
      ]
    };
  } catch (e) {
    await OmniBox.log("error", `[人人影视][detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params?.keyword || params?.wd || "").trim();
    const page = Math.max(1, Number(params?.page || 1) || 1);
    if (!keyword) return { page, pagecount: 0, total: 0, list: [] };

    const url = `${BASE_URL}/search?wd=${encodeURIComponent(keyword)}`;
    const html = await fetchText(url);
    const list = parseVodCards(html);
    await OmniBox.log("info", `[人人影视][search] keyword=${keyword} list=${list.length}`);
    return { page, pagecount: 1, total: list.length, list };
  } catch (e) {
    await OmniBox.log("error", `[人人影视][search] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const playId = String(params?.playId || "").trim();
    if (!playId) return { urls: [], parse: 0, header: {} };

    const html = await fetchText(playId, { referer: `${BASE_URL}/` });
    const playUrl = extractPlayUrl(html);
    await OmniBox.log("info", `[人人影视][play] playId=${playId} url=${playUrl}`);

    if (!/^https?:\/\//i.test(playUrl)) {
      return {
        urls: [{ name: "播放页", url: playId }],
        parse: 1,
        header: { "User-Agent": UA, Referer: playId }
      };
    }

    return {
      urls: [{ name: "默认线路", url: playUrl }],
      parse: 0,
      header: { "User-Agent": UA, Referer: playId }
    };
  } catch (e) {
    await OmniBox.log("error", `[人人影视][play] ${e.message}`);
    return { urls: [], parse: 0, header: {} };
  }
}

});

_load(2, "影视大全", function (module, exports, require) {
// @name 影视大全
// @author 梦
// @description 影视站：https://www.iysdq.tv ，支持首页、分类、搜索、详情与播放解析
// @version 1.0.2
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/影视大全.js
// @dependencies cheerio

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const HOST = "https://www.iysdq.tv";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const HEADERS = { "User-Agent": UA, Referer: `${HOST}/` };

const CLASS_LIST = [
  { type_id: "1", type_name: "电影" },
  { type_id: "2", type_name: "电视剧" },
  { type_id: "3", type_name: "综艺" },
  { type_id: "4", type_name: "动漫" },
  { type_id: "5", type_name: "短剧" },
];

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

function getBodyText(res) {
  const body = res && typeof res === "object" && "body" in res ? res.body : res;
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return body.toString();
  return String(body || "");
}

function absUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${HOST}${value}`;
  return `${HOST}/${value.replace(/^\/+/, "")}`;
}

function cleanText(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fetchText(url, options = {}) {
  return OmniBox.request(url, {
    method: options.method || "GET",
    headers: {
      ...HEADERS,
      ...(options.headers || {}),
      Referer: options.referer || `${HOST}/`,
    },
    timeout: options.timeout || 20000,
    body: options.body,
  }).then((res) => {
    if (!res || Number(res.statusCode) < 200 || Number(res.statusCode) >= 400) {
      throw new Error(`HTTP ${res?.statusCode || "unknown"} @ ${url}`);
    }
    return getBodyText(res);
  });
}

function extractVideos(html) {
  const $ = cheerio.load(html);
  const videos = [];
  const seen = new Set();

  $("a.public-list-exp[href*='/voddetail/']").each((_, el) => {
    const a = $(el);
    const href = String(a.attr("href") || "").trim();
    const m = href.match(/\/voddetail\/(\d+)\.html/);
    const vodId = m ? m[1] : "";
    const vodName = cleanText(a.attr("title") || a.text());
    if (!vodId || !vodName || seen.has(vodId)) return;
    seen.add(vodId);

    const block = a.parent().html() || a.closest(".public-list-box").html() || a.html() || "";
    let vodPic = absUrl(a.find("img").attr("data-src") || a.find("img").attr("src") || "");
    if (!vodPic) {
      const img = block.match(/<img[^>]*(?:data-src|src)="([^"]*)"/i);
      vodPic = absUrl(img ? img[1] : "");
    }
    let vodRemarks = cleanText(a.find(".public-list-prb").text());
    if (!vodRemarks) vodRemarks = cleanText(a.find(".public-list-subtitle").text());

    videos.push({
      vod_id: vodId,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_remarks: vodRemarks,
      vod_content: "",
    });
  });

  return videos;
}

function extractHomeVideos(html) {
  const sections = [
    "最新热播",
    "最新Netflix",
    "最新电影",
    "最新连续剧",
    "最新资讯",
    "最新动漫",
    "最新综艺",
    "最新纪录片",
  ];
  for (const sectionName of sections) {
    const idx = html.indexOf(sectionName);
    if (idx < 0) continue;
    const slice = html.slice(idx, idx + 50000);
    const videos = extractVideos(slice);
    if (videos.length) return videos;
  }
  return extractVideos(html);
}

function buildDetailFromHtml(html, vodId) {
  const $ = cheerio.load(html);
  let vodName = cleanText($(".this-desc-title").first().text());
  if (!vodName) vodName = cleanText($("h1").first().text());

  let vodPic = absUrl($("img").first().attr("data-src") || $("img").first().attr("src") || "");
  if (!vodPic) {
    const pm = html.match(/<img[^>]*(?:data-src|src)="([^"]*(?:upload|cover|vod)[^"]*)"/i);
    vodPic = absUrl(pm ? pm[1] : "");
  }

  let vodContent = cleanText($("meta[name='description']").attr("content") || "");
  if (vodContent) {
    vodContent = vodContent.replace(/^.*?(?:剧情|简介)[：:]\s*/g, "").replace(/^.*?(?:在线|免费观看)[，,]?\s*/g, "");
    vodContent = `【by：轻狂书生】\n${vodContent}`;
  } else {
    vodContent = "【by：轻狂书生】";
  }

  const sourceNames = [];
  $(".anthology-tab a.swiper-slide").each((_, el) => {
    let text = cleanText($(el).text()).replace(/\d+\s*$/, "").trim();
    if (text && !text.includes("下载")) sourceNames.push(text);
  });

  const vodPlaySources = [];

  const boxes = $(".anthology-list-box");
  if (boxes.length) {
    boxes.each((idx, el) => {
      if (sourceNames.length && idx >= sourceNames.length) return;
      const srcName = sourceNames[idx] || `线路${idx + 1}`;
      const episodes = [];
      $(el)
        .find('a[href*="/vodplay/"]')
        .each((_, ael) => {
          const a = $(ael);
          const epName = cleanText(a.text());
          const epUrl = absUrl(a.attr("href") || "");
          if (epName && epUrl) episodes.push({ name: epName, playId: epUrl });
        });
      if (episodes.length) {
        vodPlaySources.push({ name: srcName, episodes });
      }
    });
  }

  if (!vodPlaySources.length) {
    const listBox = $(".anthology-list-play").first();
    if (listBox.length) {
      const episodes = [];
      listBox.find('a[href*="/vodplay/"]').each((_, ael) => {
        const a = $(ael);
        const epName = cleanText(a.text());
        const epUrl = absUrl(a.attr("href") || "");
        if (epName && epUrl) episodes.push({ name: epName, playId: epUrl });
      });
      if (episodes.length) {
        vodPlaySources.push({ name: sourceNames[0] || "默认", episodes });
      }
    }
  }

  return {
    vod_id: String(vodId || ""),
    vod_name: vodName,
    vod_pic: vodPic,
    vod_content: vodContent,
    vod_play_sources: vodPlaySources,
  };
}

async function home(params, context) {
  try {
    const html = await fetchText(`${HOST}/`);
    const list = extractHomeVideos(html);
    return { class: CLASS_LIST, filters: {}, list };
  } catch (e) {
    await OmniBox.log("error", `[影视大全][home] ${e.message}`);
    return { class: CLASS_LIST, filters: {}, list: [] };
  }
}

async function category(params, context) {
  try {
    const tid = String(params.categoryId || params.type_id || "1");
    const page = Math.max(1, parseInt(params.page || 1, 10));
    const url = `${HOST}/vodshow/${tid}--time------${page}---.html`;
    const html = await fetchText(url);
    const list = extractVideos(html);
    let total = 0;
    const totalMatch = html.match(/\$\('\.hl-total'\)\.html\('(\d+)'\)/);
    if (totalMatch) total = parseInt(totalMatch[1], 10) || 0;
    const pagecount = total > 0 ? Math.max(1, Math.ceil(total / 40)) : page + (list.length >= 40 ? 1 : 0);
    return { page, pagecount, total, list };
  } catch (e) {
    await OmniBox.log("error", `[影视大全][category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const id = String(params.videoId || params.id || params.categoryId || "").trim();
    if (!id) return { list: [] };
    const vodId = id.includes("/") ? (id.match(/(\d+)/) || ["", id])[1] : id;
    const html = await fetchText(`${HOST}/voddetail/${vodId}.html`);
    const vod = buildDetailFromHtml(html, vodId);
    return { list: [vod] };
  } catch (e) {
    await OmniBox.log("error", `[影视大全][detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params.keyword || params.wd || params.key || "").trim();
    const page = Math.max(1, parseInt(params.page || 1, 10));
    if (!keyword) return { page, pagecount: 0, total: 0, list: [] };

    const url = `${HOST}/index.php/ajax/suggest?mid=1&wd=${encodeURIComponent(keyword)}&page=${page}`;
    const text = await fetchText(url);
    let data = {};
    try {
      data = JSON.parse(text || "{}");
    } catch (_) {
      data = {};
    }

    const list = [];
    for (const item of data.list || []) {
      const pic = absUrl(item.pic || "");
      list.push({
        vod_id: String(item.id || ""),
        vod_name: String(item.name || ""),
        vod_pic: pic,
        vod_remarks: "",
        vod_content: "",
      });
    }
    return {
      page,
      pagecount: Number(data.pagecount || 1),
      total: Number(data.total || list.length),
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[影视大全][search] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const input = String(params.playId || params.url || params.input || "").trim();
    await OmniBox.log("info", `[影视大全][play] input=${input}`);
    if (!input) return { parse: 0, jx: 0, url: "", header: {} };

    const playUrl = input.startsWith("http") ? input : absUrl(input);
    await OmniBox.log("info", `[影视大全][play] playUrl=${playUrl}`);
    const html = await fetchText(playUrl, { referer: `${HOST}/` });
    await OmniBox.log("info", `[影视大全][play] htmlLen=${html.length}`);

    // 1) 直接解析 player_aaaa JSON
    let videoUrl = "";
    let playerRaw = "";
    const m = html.match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\})\s*<\/script>/i)
      || html.match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\})\s*;/i)
      || html.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})\s*<\/script>/i)
      || html.match(/player_aaaa\s*=\s*(\{[\s\S]*?\})\s*;/i);

    if (m) {
      playerRaw = m[1] || "";
      await OmniBox.log("info", `[影视大全][play] player_aaaa matched len=${playerRaw.length}`);
      try {
        const data = JSON.parse(playerRaw);
        videoUrl = String(data.url || "").trim();
        await OmniBox.log("info", `[影视大全][play] player_url=${videoUrl}`);
      } catch (err) {
        await OmniBox.log("error", `[影视大全][play] player json parse fail: ${err.message}`);
        videoUrl = "";
      }
    } else {
      await OmniBox.log("info", `[影视大全][play] player_aaaa not matched`);
    }

    // 2) 兜底：页面里直接找 m3u8/mp4
    if (!videoUrl) {
      const m2 = html.match(/https?:\/\/[^\"'\s>]+\.(?:m3u8|mp4)(?:\?[^\"'\s>]*)?/i);
      if (m2) {
        videoUrl = m2[0];
        await OmniBox.log("info", `[影视大全][play] fallback_url=${videoUrl}`);
      } else {
        await OmniBox.log("info", `[影视大全][play] fallback_url=none`);
      }
    }

    if (!videoUrl) {
      return { parse: 0, jx: 0, url: "", header: {} };
    }

    return {
      parse: 0,
      jx: 0,
      url: videoUrl,
      header: {
        "User-Agent": UA,
        Referer: `${HOST}/`,
      },
    };
  } catch (e) {
    await OmniBox.log("error", `[影视大全][play] ${e.message}`);
    return { parse: 0, jx: 0, url: "", header: {} };
  }
}

});

_load(3, "韩小圈", function (module, exports, require) {
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
