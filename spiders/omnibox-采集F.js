// @name 影视采集F(合并11源)
// @version 3.20261030.1219
// @description 自动同步：采集聚合
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-采集F.js
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


_load(0, "movie360", function (module, exports, require) {
// @name 360影视
// @author 梦
// @description 360影视 OmniBox 源；解析接口通过全局环境变量 PARSE_APIS 配置，按顺序循环尝试
// @version 1.0.3
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/解析/movie360.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

const UA = "Mozilla/5.0 (Linux; Android 10; MI 8 Build/QKQ1.190828.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.101 Mobile Safari/537.36 bsl/1.0;webank/h5face;webank/2.0";
const REFERER = "https://www.360kan.com";
const DETAIL_API = "https://api.web.360kan.com/v1/detail";

// ===== 配置区域开始 =====
// 线路显示优先级：未列出的站点自动排在后面。
const SITE_PRIORITY = ["qq", "imgo", "qiyi", "youku", "leshi", "cntv", "douyin", "bilibili1", "xigua", "sohu"];

// 全局解析接口环境变量名：支持换行 / 逗号 / 分号 / 竖线分隔多个地址。
// 支持两种写法：
// 1. 纯接口地址： https://jx.example.com/?url=
// 2. 自定义名称： 摸鱼@http://zhuimi.moyu666666.top/moyu/zhuimi?token=xxx&url=
const PARSE_API_ENV = "PARSE_APIS";

// 默认解析源：当未配置 PARSE_APIS 时，按以下顺序补足并循环尝试。
const DEFAULT_PARSE_APIS = [
  "https://jx.m3u8.tv/jiexi/?url=",
  "https://yparse.ik9.cc/index.php?url=",
  "https://im1907.top/?jx=",
  "https://jx.xymp4.cc/?url=",
  "https://jx.xmflv.com/?url=",
  "https://www.pouyun.com/?url=",
  "https://jx.playerjy.com/?url=",
];
// ===== 配置区域结束 =====

function parseApiList() {
  const parseEntry = (item, idx) => {
    const at = item.indexOf("@");
    if (at > 0) {
      const name = item.slice(0, at).trim();
      const url = item.slice(at + 1).trim();
      return { name: name || `线路${idx + 1}`, url };
    }
    return { name: `线路${idx + 1}`, url: item };
  };

  const configured = String(process.env[PARSE_API_ENV] || "")
    .split(/[\n,;|]/)
    .map(s => s.trim())
    .filter(Boolean)
    .map((item, idx) => parseEntry(item, idx + 1))
    .filter(item => item.url);

  const merged = [];
  const seen = new Set();

  for (const item of configured) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    merged.push(item);
  }

  for (let i = 0; i < DEFAULT_PARSE_APIS.length; i++) {
    const item = parseEntry(DEFAULT_PARSE_APIS[i], merged.length + 1);
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    merged.push(item);
  }

  return merged.map((item, idx) => ({
    name: item.name || `线路${idx + 1}`,
    url: item.url,
  }));
}

function sortSites(sites = []) {
  return [...sites].sort((a, b) => {
    let ia = SITE_PRIORITY.indexOf(a);
    let ib = SITE_PRIORITY.indexOf(b);
    if (ia === -1) ia = 999;
    if (ib === -1) ib = 999;
    return ia - ib;
  });
}

function normalizePic(url) {
  const pic = String(url || "").trim();
  if (!pic) return "";
  if (/^https?:\/\//i.test(pic)) return pic;
  if (pic.startsWith("//")) return `https:${pic}`;
  return pic;
}

function getSiteKeyByUrl(url) {
  try {
    const host = new URL(url).hostname;
    if (host.includes("qq.com")) return "qq";
    if (host.includes("mgtv.com")) return "imgo";
    if (host.includes("youku.com")) return "youku";
    if (host.includes("iqiyi.com")) return "qiyi";
    if (host.includes("douyin.com")) return "douyin";
    if (host.includes("ixigua.com")) return "xigua";
    if (host.includes("bilibili.com")) return "bilibili1";
    if (host.includes("sohu.com")) return "sohu";
    if (host.includes("cctv.com")) return "cntv";
    if (host.includes("le.com")) return "leshi";
  } catch {}
  return "";
}

async function requestJson(url, params = {}, extraHeaders = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
  ).toString();
  const fullUrl = qs ? `${url}?${qs}` : url;
  await OmniBox.log("info", `[movie360][request] ${fullUrl}`);
  const res = await OmniBox.request(fullUrl, {
    method: "GET",
    headers: {
      "user-agent": UA,
      referer: REFERER,
      ...extraHeaders,
    },
    timeout: 15000,
  });
  if (!res || Number(res.statusCode) !== 200) {
    throw new Error(`HTTP ${res?.statusCode || "unknown"} @ ${fullUrl}`);
  }
  const data = JSON.parse(res.body || "{}");
  if (data.errno !== undefined && Number(data.errno) !== 0) {
    throw new Error(data.msg || `errno=${data.errno}`);
  }
  return data;
}

async function getCached(key, ttlSeconds, producer) {
  try {
    const cached = await OmniBox.getCache(key);
    if (cached) return JSON.parse(cached);
  } catch {}
  const value = await producer();
  try {
    await OmniBox.setCache(key, JSON.stringify(value), ttlSeconds);
  } catch {}
  return value;
}

function makeVodId(cat, id) {
  return `${cat}_${id}`;
}

function splitVodId(vodId) {
  const [cat, id] = String(vodId || "").split("_", 2);
  return { cat, id };
}

async function home(params, context) {
  try {
    const ret = await getCached("movie360:home", 3600, () =>
      requestJson("https://api.web.360kan.com/v1/rank", { cat: 1, size: 8 })
    );
    const list = [];
    for (const v of ret.data || []) {
      list.push({
        vod_id: makeVodId(v.cat, v.ent_id),
        vod_name: String(v.title || ""),
        vod_pic: normalizePic(v.cover),
        vod_remarks: String(v.upinfo || ""),
        vod_content: String(v.description || ""),
      });
    }
    return {
      class: [
        { type_id: "2", type_name: "电视剧" },
        { type_id: "1", type_name: "电影" },
        { type_id: "4", type_name: "动漫" },
        { type_id: "3", type_name: "综艺" },
      ],
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[movie360][home] ${e.message}`);
    return { class: [], list: [] };
  }
}

async function category(params, context) {
  try {
    const page = Number(params.page || 1) || 1;
    const categoryId = String(params.categoryId || params.type_id || params.id || "1");
    const size = 21;
    const ret = await getCached(`movie360:category:${categoryId}:${page}`, 1800, () =>
      requestJson("https://api.web.360kan.com/v1/filter/list", { catid: categoryId, size, pageno: page })
    );
    const data = ret.data || {};
    const list = [];
    for (const v of data.movies || []) {
      list.push({
        vod_id: makeVodId(categoryId, v.id),
        vod_name: String(v.title || ""),
        vod_pic: normalizePic(v.cdncover || v.cover || ""),
        vod_remarks: String(v.doubanscore || v.comment || ""),
      });
    }
    const total = Number(data.total || 0);
    return {
      page,
      pagecount: Math.ceil(total / size) || page,
      total,
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[movie360][category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function fetchEpisodesBySite(baseParams, site, totalEp) {
  let episodes = [];
  try {
    const siteRet = await requestJson(DETAIL_API, { ...baseParams, site, start: 1, end: 50 });
    episodes = siteRet.data?.allepidetail?.[site] || [];
  } catch (e) {
    await OmniBox.log("warn", `[movie360][detail] 获取站点 ${site} 首批分集失败: ${e.message}`);
  }

  if (episodes.length < totalEp && totalEp > 50) {
    const pageSize = 50;
    for (let page = 1; page < Math.ceil(totalEp / pageSize); page++) {
      const start = page * pageSize + 1;
      let end = start + pageSize - 1;
      if (end > totalEp) end = totalEp;
      try {
        const nextRet = await requestJson(DETAIL_API, { ...baseParams, site, start, end });
        const more = nextRet.data?.allepidetail?.[site] || [];
        episodes = episodes.concat(more);
      } catch (e) {
        await OmniBox.log("warn", `[movie360][detail] 站点 ${site} 分页 ${start}-${end} 失败: ${e.message}`);
      }
    }
  }
  return episodes;
}

async function detail(params, context) {
  try {
    const videoId = String(params.videoId || params.id || params.vod_id || "").trim();
    if (!videoId) return { list: [] };
    const { cat, id } = splitVodId(videoId);
    const ret = await getCached(`movie360:detail:${videoId}`, 1800, () => requestJson(DETAIL_API, { cat, id }));
    const data = ret.data || {};

    const vod = {
      vod_id: videoId,
      vod_name: String(data.title || ""),
      vod_pic: normalizePic(data.cdncover || data.cover || ""),
      type_name: data.moviecategory ? String(data.moviecategory.slice(-1)[0] || "") : "",
      vod_year: String(data.pubdate || ""),
      vod_area: Array.isArray(data.area) ? data.area.join(" / ") : String(data.area || ""),
      vod_remarks: String(data.doubanscore || ""),
      vod_actor: Array.isArray(data.actor) ? data.actor.join(" / ") : String(data.actor || ""),
      vod_director: Array.isArray(data.director) ? data.director.join(" / ") : String(data.director || ""),
      vod_content: String(data.description || ""),
      vod_play_sources: [],
    };

    const smartEpisodes = {};
    const sites = sortSites(data.playlink_sites || Object.keys(data.playlinksdetail || {}));

    for (const site of sites) {
      let episodes = data.allepidetail?.[site] || [];
      const totalEp = Number(data.allupinfo?.[site] || 0);

      if (episodes.length === 0 && totalEp > 0) {
        episodes = await fetchEpisodesBySite({ cat, id }, site, totalEp);
      }

      const lineEpisodes = [];
      if (episodes.length > 0) {
        for (const ep of episodes) {
          const playNum = String(ep.playlink_num || "").trim();
          const playUrl = String(ep.url || "").trim();
          if (!playNum || !playUrl) continue;
          lineEpisodes.push({ name: playNum, playId: playUrl });
          if (!smartEpisodes[playNum]) smartEpisodes[playNum] = [];
          if (!smartEpisodes[playNum].includes(playUrl)) smartEpisodes[playNum].push(playUrl);
        }
      }

      if (lineEpisodes.length === 0 && data.playlinksdetail?.[site]?.default_url) {
        const directUrl = String(data.playlinksdetail[site].default_url || "").trim();
        if (directUrl) {
          lineEpisodes.push({ name: "正片", playId: directUrl });
          if (!smartEpisodes["1"]) smartEpisodes["1"] = [];
          if (!smartEpisodes["1"].includes(directUrl)) smartEpisodes["1"].push(directUrl);
        }
      }

      if (lineEpisodes.length > 0) {
        const parseApis = parseApiList();
        for (const parser of parseApis) {
          const parserEpisodes = lineEpisodes.map((ep) => ({
            name: ep.name,
            playId: JSON.stringify({ targetUrl: ep.playId, parserUrl: parser.url, parserName: parser.name, site }),
          }));
          vod.vod_play_sources.push({ name: `${site}-${parser.name}`, episodes: parserEpisodes });
        }
      }
    }

    const smartKeys = Object.keys(smartEpisodes).sort((a, b) => parseFloat(a) - parseFloat(b));
    if (smartKeys.length > 0) {
      const episodes = smartKeys.map((k) => ({ name: k, playId: smartEpisodes[k].join("|||") }));
      vod.vod_play_sources.unshift({ name: "智能线路", episodes });
    }

    await OmniBox.log("info", `[movie360][detail] id=${videoId}, sourceCount=${vod.vod_play_sources.length}`);
    return { list: [vod] };
  } catch (e) {
    await OmniBox.log("error", `[movie360][detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params.keyword || params.key || params.wd || "").trim();
    if (!keyword) return { page: 1, pagecount: 0, total: 0, list: [] };
    const ret = await requestJson("https://api.so.360kan.com/index", { kw: keyword });
    const list = [];
    const rows = ret.data?.longData?.rows || [];
    for (const row of rows) {
      list.push({
        vod_id: makeVodId(row.cat_id, row.en_id),
        vod_name: String(row.titleTxt || ""),
        vod_pic: normalizePic(row.cover || ""),
        vod_remarks: String(row.coverInfo?.txt || ""),
        vod_year: String(row.year || ""),
      });
    }
    return { page: 1, pagecount: 1, total: list.length, list };
  } catch (e) {
    await OmniBox.log("error", `[movie360][search] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

function isDirectMediaUrl(url) {
  return /\.(m3u8|mp4|rmvb|avi|wmv|flv|mkv|webm|mov|m3u)(?!\w)/i.test(String(url || ""));
}

async function tryParseApi(api, targetUrl, flag) {
  const params = { flag, url: targetUrl };
  const useQueryMode = /[?&](url|jx)=$/.test(api) || /[?&](url|jx)=/i.test(api);
  const fullUrl = useQueryMode ? `${api}${encodeURIComponent(targetUrl)}` : api;

  await OmniBox.log("info", `[movie360][request] ${useQueryMode ? fullUrl : `${api}?flag=${encodeURIComponent(flag || '')}&url=${encodeURIComponent(targetUrl)}`}`);
  const res = await OmniBox.request(fullUrl, {
    method: "GET",
    headers: {
      "user-agent": UA,
      referer: REFERER,
    },
    timeout: 15000,
  });
  if (!res || Number(res.statusCode) !== 200) {
    throw new Error(`HTTP ${res?.statusCode || "unknown"} @ ${fullUrl}`);
  }

  let json = null;
  const body = String(res.body || "").trim();
  const contentType = String(res.headers?.["content-type"] || res.headers?.["Content-Type"] || "").toLowerCase();
  const looksJson = contentType.includes("application/json") || /^[\[{]/.test(body);

  if (!useQueryMode) {
    try {
      const ret = await requestJson(api, params, { referer: REFERER });
      json = ret;
    } catch {
      json = null;
    }
  } else if (looksJson) {
    try {
      json = JSON.parse(body || "{}");
    } catch {
      json = null;
    }
  }

  if (json && json.url && (json.parse === 0 || json.jx === 0 || isDirectMediaUrl(json.url))) {
    const result = {
      parse: 0,
      url: json.url,
      urls: [{ name: "播放", url: json.url }],
    };
    if (json.header || json.headers) {
      result.header = json.header || json.headers;
      result.headers = json.header || json.headers;
    }
    return result;
  }

  if (!json) {
    try {
      await OmniBox.log("info", `[movie360][play] 非 JSON 解析页，开始嗅探: ${fullUrl}`);
      const sniffed = await OmniBox.sniffVideo(fullUrl, { Referer: REFERER, "User-Agent": UA });
      if (sniffed && sniffed.url) {
        return {
          parse: 0,
          url: sniffed.url,
          urls: [{ name: "播放", url: sniffed.url }],
          header: sniffed.headers || {},
          headers: sniffed.headers || {},
        };
      }
    } catch (e) {
      await OmniBox.log("warn", `[movie360][play] 嗅探失败 url=${fullUrl}, message=${e.message}`);
    }
  }

  return {
    parse: 1,
    url: targetUrl,
    urls: [{ name: "播放页", url: targetUrl }],
    header: {},
    headers: {},
  };
}

async function resolvePlay(targetUrl, flag, parserEntry) {
  if (!targetUrl) return { parse: 0, urls: [], header: {} };
  if (isDirectMediaUrl(targetUrl)) {
    return {
      parse: 0,
      url: targetUrl,
      urls: [{ name: "播放", url: targetUrl }],
      header: {},
      headers: {},
    };
  }

  const apis = parserEntry ? [parserEntry] : parseApiList();
  await OmniBox.log("info", `[movie360][play] 解析源数量=${apis.length}, 来源=${parserEntry ? 'PLAY_ID_BIND' : (process.env[PARSE_API_ENV] ? PARSE_API_ENV : 'DEFAULT_PARSE_APIS')}`);
  for (const api of apis) {
    try {
      await OmniBox.log("info", `[movie360][play] 尝试解析 api=${api.url}, flag=${flag}, url=${targetUrl}`);
      const parsed = await tryParseApi(api.url, targetUrl, flag);
      if (parsed?.url) return parsed;
    } catch (e) {
      await OmniBox.log("warn", `[movie360][play] 解析失败 api=${api.url}, message=${e.message}`);
    }
  }

  return {
    parse: 1,
    url: targetUrl,
    urls: [{ name: "播放页", url: targetUrl }],
    header: {},
    headers: {},
  };
}

async function play(params, context) {
  try {
    const flag = String(params.flag || "").trim();
    const playId = String(params.playId || params.play_id || "").trim();
    if (!playId) return { parse: 0, urls: [], header: {} };

    if (flag === "智能线路" && playId.includes("|||")) {
      for (const candidate of playId.split("|||").map(s => s.trim()).filter(Boolean)) {
        const siteKey = getSiteKeyByUrl(candidate);
        await OmniBox.log("info", `[movie360][play] 智能线路尝试 site=${siteKey || 'unknown'}, url=${candidate}`);
        const res = await resolvePlay(candidate, flag);
        if (res?.url || (Array.isArray(res?.urls) && res.urls.length)) return res;
      }
      return { parse: 1, url: playId.split("|||")[0], urls: [{ name: "播放页", url: playId.split("|||")[0] }] };
    }

    if (playId.startsWith("{")) {
      const payload = JSON.parse(playId);
      if (payload?.targetUrl) {
        return await resolvePlay(payload.targetUrl, flag, payload.parserUrl ? { name: payload.parserName || '线路', url: payload.parserUrl } : null);
      }
    }

    return await resolvePlay(playId, flag);
  } catch (e) {
    await OmniBox.log("error", `[movie360][play] ${e.message}`);
    return { parse: 0, urls: [] };
  }
}

});

_load(1, "4KMP", function (module, exports, require) {
// @name 4KMP
// @author 梦
// @description 4k-av.com：支持首页、分类、搜索、详情与直链播放，站点请求使用苹果 Safari UA
// @dependencies cheerio
// @version 1.0.2
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/4KMP.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const BASE_URL = "https://4k-av.com";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15";
const REQUEST_TIMEOUT = Number(process.env.KMP_TIMEOUT || 20000);

const CLASS_LIST = [
  { type_id: "movie", type_name: "电影" },
  { type_id: "tv", type_name: "电视剧" },
];

const YEAR_VALUES = [
  { name: "全部", value: "" },
  { name: "2026", value: "2026" },
  { name: "2025", value: "2025" },
  { name: "2024", value: "2024" },
  { name: "2023", value: "2023" },
  { name: "2022", value: "2022" },
  { name: "2021", value: "2021" },
  { name: "2020", value: "2020" },
  { name: "2019", value: "2019" },
];

const TAG_VALUES = [
  { name: "全部", value: "" },
  { name: "动作", value: "动作" },
  { name: "剧情", value: "剧情" },
  { name: "冒险", value: "冒险" },
  { name: "喜剧", value: "喜剧" },
  { name: "科幻", value: "科幻" },
  { name: "悬疑", value: "悬疑" },
  { name: "惊悚", value: "惊悚" },
  { name: "恐怖", value: "恐怖" },
  { name: "战争", value: "战争" },
  { name: "犯罪", value: "犯罪" },
  { name: "动画", value: "动画" },
  { name: "纪录片", value: "纪录片" },
  { name: "国产剧", value: "国产剧" },
  { name: "美剧", value: "美剧" },
  { name: "韩剧", value: "韩剧" },
];

const FILTERS = {
  movie: [
    { key: "year", name: "年份", init: "", value: YEAR_VALUES },
    { key: "tag", name: "标签", init: "", value: TAG_VALUES },
  ],
  tv: [
    { key: "year", name: "年份", init: "", value: YEAR_VALUES },
    { key: "tag", name: "标签", init: "", value: TAG_VALUES },
  ],
};

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

function getBodyText(res) {
  const body = res && typeof res === "object" && "body" in res ? res.body : res;
  if (Buffer.isBuffer(body)) return body.toString("utf8");
  if (body instanceof Uint8Array) return Buffer.from(body).toString("utf8");
  return String(body || "");
}

function cleanText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#183;/g, "·")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function absUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${BASE_URL}${value}`;
  return `${BASE_URL}/${value.replace(/^\.\//, "")}`;
}

function buildHeaders(referer = `${BASE_URL}/`, extra = {}) {
  return {
    "User-Agent": UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: referer || `${BASE_URL}/`,
    ...extra,
  };
}

function buildPlayHeaders(referer = `${BASE_URL}/`) {
  return {
    "User-Agent": UA,
    Referer: referer || `${BASE_URL}/`,
    Origin: BASE_URL,
  };
}

async function fetchText(url, options = {}) {
  const finalUrl = absUrl(url);
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    await OmniBox.log("info", `[4KMP][request] ${finalUrl}`);
    const res = await OmniBox.request(finalUrl, {
      method: options.method || "GET",
      headers: buildHeaders(options.referer, options.headers || {}),
      body: options.body,
      timeout: options.timeout || REQUEST_TIMEOUT,
    });
    const statusCode = Number(res?.statusCode || 0);
    if (res && statusCode === 200) return getBodyText(res);

    lastError = String(res?.statusCode || "unknown");
    await OmniBox.log("warn", `[4KMP][request] attempt ${attempt + 1} HTTP ${lastError} @ ${finalUrl}`);
  }
  throw new Error(`HTTP ${lastError} @ ${finalUrl}`);
}

function dedupeById(list) {
  const seen = new Set();
  return (list || []).filter((item) => {
    const key = item?.vod_id || item?.playId || item?.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectTypeId(href) {
  const value = String(href || "");
  if (/\/tv\//i.test(value)) return "tv";
  if (/\/movie\//i.test(value)) return "movie";
  return "";
}

function pickLabels($, $box) {
  const map = {};
  $box.find(".resyear label, #MainContent_videodetail label, #MainContent_videodetail span").each((_, el) => {
    const $el = $(el);
    const title = cleanText($el.attr("title") || "");
    const text = cleanText($el.text());
    if (title) map[title] = text.replace(new RegExp(`^${title}[:：]\\s*`), "");
    else if (/分辨率/.test(text)) map["分辨率"] = text.replace(/^分辨率[:：]\s*/, "");
    else if (/片长/.test(text)) map["片长"] = text.replace(/^片长[:：]\s*/, "");
    else if (/年份/.test(text)) map["年份"] = text.replace(/^年份[:：]\s*/, "");
  });
  return map;
}

function mapVodCard($, el) {
  const $box = $(el);
  const $titleLink = $box.find(".title a[href*='/movie/'], .title a[href*='/tv/'], a[href*='/movie/'], a[href*='/tv/']").first();
  const href = $titleLink.attr("href") || "";
  const name = cleanText($titleLink.attr("title") || $titleLink.find("h2").text() || $titleLink.text());
  if (!href || !name) return null;

  const labels = pickLabels($, $box);
  const tags = [];
  $box.find(".tags span").each((_, tag) => {
    const text = cleanText($(tag).text());
    if (text && text !== "标签:") tags.push(text);
  });

  const subtitle = cleanText($box.find(".info h3").first().text());
  const content = cleanText($box.find(".videodesc").first().text());
  const pic = absUrl(
    $box.find(".poster img").first().attr("src") ||
    $box.find(".poster img").first().attr("data-src") ||
    $box.find(".screenshot img").first().attr("src") ||
    $box.find("img").first().attr("src") ||
    ""
  );

  return {
    vod_id: absUrl(href),
    vod_name: name,
    vod_pic: pic,
    vod_url: absUrl(href),
    vod_remarks: labels["分辨率"] || "",
    vod_year: labels["年份"] || "",
    vod_subtitle: subtitle,
    vod_content: content,
    type_id: detectTypeId(href),
    type_name: tags.join(" / "),
  };
}

function parseVodList(html, selector = "#MainContent_newestlist .NTMitem") {
  const $ = cheerio.load(html || "", { decodeEntities: false });
  const list = [];
  $(selector).each((_, el) => {
    const item = mapVodCard($, el);
    if (item) list.push(item);
  });

  if (!list.length) {
    $("#recommlist .RTMitem").each((_, el) => {
      const item = mapVodCard($, el);
      if (item) list.push(item);
    });
  }

  return dedupeById(list);
}

function parsePageCount(html) {
  const textMatch = String(html || "").match(/页次\s*\d+\s*\/\s*(\d+)/);
  if (textMatch) {
    const count = Number(textMatch[1]);
    if (Number.isFinite(count) && count > 0) return count;
  }

  let maxPage = 1;
  const regex = /page-(\d+)\.html/gi;
  let match;
  while ((match = regex.exec(String(html || "")))) {
    const page = Number(match[1]);
    if (Number.isFinite(page) && page > maxPage) maxPage = page;
  }
  return maxPage;
}

function normalizeExtend(params) {
  return params?.extend || params?.filters || {};
}

function buildCategoryBasePath(typeId, extend = {}) {
  const year = String(extend.year || "").trim();
  const tag = String(extend.tag || "").trim();
  if (tag) return `/tag/${encodeURIComponent(tag)}/`;
  if (year) return `/${encodeURIComponent(year)}/`;

  const id = String(typeId || "movie").trim();
  if (id === "tv" || id === "movie") return `/${id}/`;
  if (/^\/.+\/$/.test(id)) return id;
  if (/^tag[:/]/i.test(id)) {
    const tagName = id.replace(/^tag[:/]/i, "").replace(/^\/|\/$/g, "");
    return `/tag/${encodeURIComponent(tagName)}/`;
  }
  if (/^(19|20)\d{2}$/.test(id)) return `/${id}/`;
  return "/movie/";
}

function buildPagedPath(basePath, sourcePage, pageCount) {
  const path = basePath.endsWith("/") ? basePath : `${basePath}/`;
  if (!sourcePage || sourcePage <= 1) return path;
  return `${path}page-${sourcePage}.html`;
}

function buildPlayId(meta) {
  return JSON.stringify(meta || {});
}

function parseMediaSources($, pageUrl) {
  const list = [];
  $("video source[src], source[src]").each((_, el) => {
    const $el = $(el);
    const src = $el.attr("src") || "";
    if (!src) return;
    const url = absUrl(src);
    const quality = cleanText($el.attr("label") || $el.attr("title") || "");
    list.push({
      name: quality || "直链",
      url,
      header: buildPlayHeaders(pageUrl),
    });
  });
  return dedupeById(list);
}

function extractDetailInfo(html, pageUrl) {
  const $ = cheerio.load(html || "", { decodeEntities: false });
  const labels = pickLabels($, $.root());
  const vodName = cleanText(
    $("#MainContent_titleh12 > div").first().attr("title") ||
    $("#MainContent_titleh12 > div").first().text() ||
    $("#tophead h1").first().attr("title") ||
    $("#tophead h1").first().text() ||
    $("title").first().text().split(" - ")[0]
  );
  const vodPic = absUrl(
    $("#MainContent_poster img").first().attr("src") ||
    $("#MainContent_poster a").first().attr("href") ||
    $("meta[property='og:image']").attr("content") ||
    ""
  );
  const vodSubtitle = cleanText($("#MainContent_titleh12 h2").first().text());
  const vodContent = cleanText($("#MainContent_videodesc .videodesc").first().text() || $("meta[name='description']").attr("content"));
  const tags = [];
  $("#MainContent_tags a").each((_, el) => {
    const text = cleanText($(el).text());
    if (text) tags.push(text);
  });

  const mediaSources = parseMediaSources($, pageUrl);
  const episodes = [];

  $("#rtlist li").each((_, el) => {
    const $li = $(el);
    const $a = $li.find("a[href*='/tv/'], a[href*='/movie/']").first();
    const href = $a.attr("href") || pageUrl;
    const title = cleanText(
      $li.find("span").first().text() ||
      $a.attr("title") ||
      $li.find("img").first().attr("title") ||
      $li.find("img").first().attr("alt") ||
      vodName
    );
    if (!href) return;
    const episodePage = absUrl(href);
    episodes.push({
      name: title || vodName || "播放",
      playId: buildPlayId({
        page: episodePage,
        title: title || vodName || "播放",
        vodName,
        pic: vodPic,
      }),
    });
  });

  if (!episodes.length) {
    episodes.push({
      name: labels["分辨率"] || "正片",
      playId: buildPlayId({
        page: pageUrl,
        title: labels["分辨率"] || "正片",
        direct: mediaSources[0]?.url || "",
        vodName,
        pic: vodPic,
      }),
    });
  }

  const playSources = [{
    name: "4KMP",
    episodes: dedupeById(episodes),
  }];

  return {
    vod_id: pageUrl,
    vod_name: vodName,
    vod_pic: vodPic,
    vod_content: vodContent,
    vod_subtitle: vodSubtitle,
    vod_year: labels["年份"] || "",
    vod_remarks: [labels["分辨率"], labels["片长"]].filter(Boolean).join(" / "),
    type_id: detectTypeId(pageUrl),
    type_name: tags.join(" / "),
    vod_play_sources: playSources,
  };
}

function normalizeKeyword(value) {
  return String(value || "")
    .replace(/[\s\-_—–·•:：,，.。!?！？'"“”‘’()（）\[\]【】{}]/g, "")
    .toLowerCase();
}

function scoreSearchResult(vodName, keyword) {
  const name = normalizeKeyword(vodName);
  const key = normalizeKeyword(keyword);
  if (!name || !key) return 0;
  if (name === key) return 1000 + key.length;
  if (name.startsWith(key)) return 800 + key.length;
  if (name.includes(key)) return 600 + key.length;
  if (key.includes(name) && name.length >= 2) return 400 + name.length;
  return 0;
}

function refineSearchResults(list, keyword) {
  const scored = (list || []).map((item, index) => ({
    item,
    index,
    score: scoreSearchResult(item.vod_name, keyword),
  }));
  const matched = scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
  return matched.length ? matched : list;
}

function parseRawPlayId(raw) {
  const value = String(raw || "").trim();
  if (!value) return {};
  if (value.startsWith("{")) {
    try {
      return JSON.parse(value);
    } catch (_) {}
  }
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return { page: absUrl(value), title: "播放" };
  return { page: value, title: "播放" };
}

function looksLikeMedia(url) {
  return /\.(m3u8|mp4|m4v|mov|flv)(\?|#|$)/i.test(String(url || ""));
}

async function home(params, context) {
  try {
    const html = await fetchText(`${BASE_URL}/`);
    const list = parseVodList(html).slice(0, 36);
    await OmniBox.log("info", `[4KMP][home] list=${list.length}`);
    return {
      class: CLASS_LIST.map((item) => ({ ...item })),
      filters: FILTERS,
      list,
    };
  } catch (error) {
    await OmniBox.log("error", `[4KMP][home] ${error.message}`);
    return { class: CLASS_LIST.map((item) => ({ ...item })), filters: FILTERS, list: [] };
  }
}

async function category(params, context) {
  const page = Math.max(1, Number(params?.page || params?.pg || 1) || 1);
  try {
    const typeId = params?.type_id || params?.categoryId || params?.tid || "movie";
    const extend = normalizeExtend(params);
    const basePath = buildCategoryBasePath(typeId, extend);
    const firstHtml = await fetchText(basePath);
    const pageCount = parsePageCount(firstHtml);
    const sourcePage = Math.max(1, pageCount - page + 1);
    const html = page <= 1 ? firstHtml : await fetchText(buildPagedPath(basePath, sourcePage, pageCount), { referer: absUrl(basePath) });
    const list = parseVodList(html);
    await OmniBox.log("info", `[4KMP][category] type=${typeId} page=${page} sourcePage=${sourcePage} list=${list.length}`);
    return {
      page,
      pagecount: pageCount,
      total: pageCount * Math.max(list.length, 24),
      list,
    };
  } catch (error) {
    await OmniBox.log("error", `[4KMP][category] ${error.message}`);
    return { page, pagecount: page, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const vodId = String(params?.vod_id || params?.videoId || params?.id || "").trim();
    if (!vodId) return { list: [] };
    const pageUrl = absUrl(vodId);
    const html = await fetchText(pageUrl);
    const info = extractDetailInfo(html, pageUrl);
    await OmniBox.log("info", `[4KMP][detail] ${info.vod_name} episodes=${info.vod_play_sources?.[0]?.episodes?.length || 0}`);
    return { list: [info] };
  } catch (error) {
    await OmniBox.log("error", `[4KMP][detail] ${error.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  const page = Math.max(1, Number(params?.page || params?.pg || 1) || 1);
  try {
    const keyword = String(params?.keyword || params?.key || params?.wd || "").trim();
    if (!keyword) return { page, pagecount: 0, total: 0, list: [] };
    const url = `${BASE_URL}/s?y=${encodeURIComponent(keyword)}`;
    const html = await fetchText(url);
    const list = refineSearchResults(parseVodList(html), keyword);
    await OmniBox.log("info", `[4KMP][search] keyword=${keyword} list=${list.length}`);
    return {
      page,
      pagecount: 1,
      total: list.length,
      list,
    };
  } catch (error) {
    await OmniBox.log("error", `[4KMP][search] ${error.message}`);
    return { page, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const raw = String(params?.playId || params?.play_id || params?.id || "").trim();
    const meta = parseRawPlayId(raw);
    const pageUrl = meta.page ? absUrl(meta.page) : "";
    const direct = meta.direct ? absUrl(meta.direct) : "";
    const headers = buildPlayHeaders(pageUrl || `${BASE_URL}/`);

    if (direct && looksLikeMedia(direct)) {
      return {
        parse: 0,
        jx: 0,
        url: direct,
        urls: [{ name: meta.title || "直链", url: direct }],
        header: headers,
        headers};
    }

    if (!pageUrl) {
      return { parse: 0, jx: 0, url: "", urls: [], header: {}, headers: {} };
    }

    const html = await fetchText(pageUrl, { referer: `${BASE_URL}/` });
    const $ = cheerio.load(html || "", { decodeEntities: false });
    const mediaSources = parseMediaSources($, pageUrl);
    const firstUrl = mediaSources[0]?.url || "";
    if (firstUrl) {
      const playHeaders = buildPlayHeaders(pageUrl);
      return {
        parse: 0,
        jx: 0,
        url: firstUrl,
        urls: mediaSources.map((item) => ({ name: item.name, url: item.url })),
        header: playHeaders,
        headers: playHeaders};
    }

    if (typeof OmniBox.sniffVideo === "function") {
      try {
        const sniffed = await OmniBox.sniffVideo(pageUrl, headers);
        const sniffUrl = sniffed?.url || sniffed?.playUrl || sniffed?.src || "";
        if (sniffUrl) {
          return {
            parse: 0,
            jx: 0,
            url: sniffUrl,
            urls: [{ name: meta.title || "嗅探线路", url: sniffUrl }],
            header: sniffed.header || sniffed.headers || headers,
            headers: sniffed.header || sniffed.headers || headers};
        }
      } catch (error) {
        await OmniBox.log("warn", `[4KMP][play] sniffVideo failed: ${error.message}`);
      }
    }

    return {
      parse: 1,
      jx: 1,
      url: pageUrl,
      urls: [{ name: meta.title || "播放页", url: pageUrl }],
      header: headers,
      headers};
  } catch (error) {
    await OmniBox.log("error", `[4KMP][play] ${error.message}`);
    return { parse: 0, jx: 0, url: "", urls: [], header: {}, headers: {} };
  }
}

});

_load(2, "HDmoli", function (module, exports, require) {
// @name HDmoli
// @version 1.0.8
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/HDmoli.js
// @dependencies cheerio

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const BASE_URL = (process.env.HDMOLI_HOST || "https://www.hdmoli.me").replace(/\/$/, "");
const USER_AGENT = process.env.HDMOLI_UA || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT = Number(process.env.HDMOLI_TIMEOUT || 20000);

const CLASS_LIST = [
  { type_id: "1", type_name: "电影", url: "/show/1-----------.html" },
  { type_id: "2", type_name: "剧集", url: "/show/2-----------.html" },
  { type_id: "4", type_name: "动画", url: "/show/4-----------.html" },
  { type_id: "3", type_name: "综艺", url: "/show/3-----------.html" },
  { type_id: "5", type_name: "纪录片", url: "/show/5-----------.html" },
  { type_id: "6", type_name: "动作", url: "/show/6-----------.html" },
  { type_id: "7", type_name: "喜剧", url: "/show/7-----------.html" },
  { type_id: "8", type_name: "爱情", url: "/show/8-----------.html" },
  { type_id: "9", type_name: "科幻", url: "/show/9-----------.html" },
  { type_id: "10", type_name: "剧情", url: "/show/10-----------.html" },
  { type_id: "11", type_name: "悬疑", url: "/show/11-----------.html" },
  { type_id: "12", type_name: "惊悚", url: "/show/12-----------.html" },
];

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

async function request(url, extra = {}, redirectCount = 0) {
  const finalUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  const headers = {
    "User-Agent": USER_AGENT,
    Referer: BASE_URL + "/",
    ...extra.headers,
  };

  await OmniBox.log("info", `[request] ${finalUrl}`);
  const res = await OmniBox.request(finalUrl, {
    method: extra.method || "GET",
    headers,
    timeout: REQUEST_TIMEOUT,
  });

  const statusCode = Number(res.statusCode || 0);
  const responseHeaders = res.headers || {};
  const location = responseHeaders.location || responseHeaders.Location || responseHeaders["LOCATION"] || "";
  if ([301, 302, 303, 307, 308].includes(statusCode)) {
    if (redirectCount >= 5) throw new Error(`重定向次数过多 @ ${finalUrl}`);
    if (!location) throw new Error(`HTTP ${statusCode} 未返回 Location @ ${finalUrl}`);
    const nextUrl = absoluteUrl(location, finalUrl);
    await OmniBox.log("info", `[redirect] ${finalUrl} -> ${nextUrl}`);
    return request(nextUrl, extra, redirectCount + 1);
  }

  if (statusCode !== 200) throw new Error(`HTTP ${statusCode} @ ${finalUrl}`);

  return res.body || "";
}

function getClassById(categoryId) {
  return CLASS_LIST.find(item => item.type_id === String(categoryId));
}

function buildPageUrl(basePath, page = 1) {
  if (!basePath) return "/";
  if (page <= 1) return basePath;
  return basePath.replace(/-{11}\.html$/, `--------${page}---.html`);
}

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(url, currentUrl = BASE_URL) {
  if (!url) return "";
  const value = String(url).trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  try {
    return new URL(value, currentUrl).toString();
  } catch {
    return `${BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
  }
}

function extractIdFromPath(path) {
  const match = String(path || "").match(/\/([a-z]+)\/index(\d+)\.html/i);
  if (!match) return "";
  return `${match[1]}:${match[2]}`;
}

function splitVideoId(videoId) {
  const [prefix, id] = String(videoId || "").split(":");
  return { prefix: prefix || "movie", id: id || "" };
}

function buildDetailUrlFromPlay(playUrl) {
  const match = String(playUrl || "").match(/\/play\/(\d+)-(\d+)-(\d+)\.html/i);
  if (!match) return BASE_URL + "/";
  return `${BASE_URL}/movie/index${match[1]}.html`;
}

function mapListItem($, el) {
  const box = $(el);
  const linkEl = box.find("a.myui-vodlist__thumb").first();
  const titleEl = box.find("h4.title a").first();
  const href = linkEl.attr("href") || titleEl.attr("href") || "";
  const pic = linkEl.attr("data-original") || linkEl.find("img").attr("data-original") || linkEl.attr("src") || linkEl.find("img").attr("src") || "";
  const remarks = normalizeText(linkEl.find(".pic-text").first().text() || box.find(".pic-text").first().text());
  const score = normalizeText(linkEl.find(".pic-tag-right").first().text());
  const meta = normalizeText(box.find("p.text").first().text());
  const looksLikeMetadata = /^[0-9]{4}\s*\//.test(meta);
  let parts = looksLikeMetadata ? meta.split("/").map(s => normalizeText(s)).filter(Boolean) : [];

  if (!parts.length) {
    const info = normalizeText(box.find("p").filter((_, p) => $(p).text().includes("分类：")).first().text());
    const typeMatch = info.match(/分类：([^地]*?)地区：/);
    const areaMatch = info.match(/地区：([^年]*?)年份：/);
    const yearMatch = info.match(/年份：([0-9]{4})/);
    parts = [
      yearMatch ? yearMatch[1] : "",
      areaMatch ? areaMatch[1].trim() : "",
      typeMatch ? typeMatch[1].trim() : "",
    ].filter(Boolean);
  }

  return {
    vod_id: extractIdFromPath(href),
    vod_name: normalizeText(titleEl.text() || linkEl.attr("title")),
    vod_pic: absoluteUrl(pic),
    vod_remarks: remarks || score,
    vod_year: parts[0] || "",
    vod_area: parts[1] || "",
    type_name: parts.slice(2).join("/") || "",
    vod_douban_score: score.replace(/分$/, ""),
  };
}

function parseListPage(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const list = [];
  // 针对该站点的 col- 布局和 myui-vodlist 混合结构进行匹配
  $("ul.myui-vodlist li, ul.myui-vodlist__bd li, #searchList li, li[class*='col-'], li.clearfix").each((_, el) => {
    const box = $(el);
    // 必须包含链接和标题，且不是广告或菜单项
    if (box.find("a[href*='/movie/index']").length > 0 || box.find("a[href*='/juji/index']").length > 0) {
        const item = mapListItem($, el);
        if (item.vod_id && item.vod_name) list.push(item);
    }
  });
  // 去重
  const seen = new Set();
  return list.filter(item => {
    if (seen.has(item.vod_id)) return false;
    seen.add(item.vod_id);
    return true;
  });
}

function parsePageCount(html) {
  const nums = new Set();
  const regex = /--------(\d+)---\.html/g;
  let match;
  while ((match = regex.exec(html))) {
    nums.add(Number(match[1]));
  }
  const maxPage = Math.max(1, ...nums);
  return Number.isFinite(maxPage) ? maxPage : 1;
}

function decodeHexString(input) {
  const hex = String(input || "").replace(/[^0-9a-f]/gi, "");
  if (!hex || hex.length % 2 !== 0) return "";
  try {
    return Buffer.from(hex, "hex").toString("utf8");
  } catch {
    return "";
  }
}

function decodePlayerUrl(rawUrl, encrypt) {
  let value = String(rawUrl || "").trim();
  if (!value) return "";

  if (encrypt === 1) {
    try { value = unescape(value); } catch {}
    try { value = decodeURIComponent(value); } catch {}
    return value;
  }

  if (encrypt === 2) {
    try {
      value = Buffer.from(value, "base64").toString("utf8");
    } catch {}
    try { value = unescape(value); } catch {}
    try { value = decodeURIComponent(value); } catch {}
    return value;
  }

  if (encrypt === 3) {
    const hexDecoded = decodeHexString(value);
    if (hexDecoded) value = hexDecoded;
    try { value = unescape(value); } catch {}
    try { value = decodeURIComponent(value); } catch {}
    return value;
  }

  return value;
}

function parsePlaySources($) {
  const tabs = [];
  $(".nav-tabs li a[href^='#playlist']").each((index, el) => {
    const tab = $(el);
    tabs.push({
      target: tab.attr("href") || `#playlist${index + 1}`,
      name: normalizeText(tab.text()) || `线路${index + 1}`,
    });
  });

  if (!tabs.length) {
    $("div[id^='playlist']").each((index, el) => {
      tabs.push({ target: `#${$(el).attr("id")}`, name: `线路${index + 1}` });
    });
  }

  return tabs.map(tab => {
    const episodes = [];
    $(tab.target).find(".myui-content__list a").each((_, a) => {
      const node = $(a);
      const href = node.attr("href") || "";
      const name = normalizeText(node.text()) || "播放";
      if (!href) return;
      episodes.push({
        name,
        playId: JSON.stringify({
          source: tab.name,
          playUrl: absoluteUrl(href),
          referer: buildDetailUrlFromPlay(absoluteUrl(href)),
        }),
      });
    });
    return { name: tab.name, episodes };
  }).filter(item => item.episodes.length > 0);
}

function parseDownloadLinks($) {
  const links = [];
  $(".myui-panel_bd p.text-muted a[title]").each((_, el) => {
    const node = $(el);
    const href = node.attr("href") || "";
    const title = normalizeText(node.closest("p").find("b").text()).replace(/[:：]/g, "") || normalizeText(node.attr("title"));
    if (/pan\.quark\.cn|pan\.baidu\.com|drive\.uc\.cn/i.test(href)) {
      links.push({ name: title || "网盘", url: href });
    }
  });
  return links;
}

function filterOutDriveSources(playSources = []) {
  const driveKeywordRegex = /(夸克|百度|阿里|UC|网盘|迅雷盘|115|123云盘|天翼)/i;
  return playSources.filter(source => {
    const sourceName = String(source?.name || "");
    if (driveKeywordRegex.test(sourceName)) return false;
    const episodes = Array.isArray(source?.episodes) ? source.episodes : [];
    const hasDriveEpisode = episodes.some(ep => {
      const rawPlayId = String(ep?.playId || "");
      return /pan\.quark\.cn|pan\.baidu\.com|drive\.uc\.cn/i.test(rawPlayId);
    });
    return !hasDriveEpisode;
  });
}

async function home(params, context) {
  try {
    await OmniBox.log("info", `[home] from=${context?.from || "web"}`);
    const html = await request("/");
    const list = parseListPage(html).slice(0, 24);
    await OmniBox.log("info", `[home] list=${list.length}`);
    return { class: CLASS_LIST.map(({ type_id, type_name }) => ({ type_id, type_name })), list };
  } catch (error) {
    await OmniBox.log("error", `[home] ${error.message}`);
    return { class: CLASS_LIST.map(({ type_id, type_name }) => ({ type_id, type_name })), list: [] };
  }
}

async function category(params, context) {
  try {
    const categoryId = String(params?.categoryId || "1");
    const page = Number(params?.page || 1) || 1;
    const category = getClassById(categoryId);
    if (!category) return { page, pagecount: 0, total: 0, list: [] };

    const url = buildPageUrl(category.url, page);
    await OmniBox.log("info", `[category] categoryId=${categoryId} page=${page} url=${url}`);
    const html = await request(url);
    const list = parseListPage(html);
    const pagecount = Math.max(page, parsePageCount(html));
    await OmniBox.log("info", `[category] list=${list.length} pagecount=${pagecount}`);
    return {
      page,
      pagecount,
      total: pagecount * Math.max(list.length, 24),
      list,
    };
  } catch (error) {
    await OmniBox.log("error", `[category] ${error.message}`);
    return { page: Number(params?.page || 1) || 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const { prefix, id } = splitVideoId(params?.videoId);
    if (!id) return { list: [] };

    const detailUrl = `/${prefix}/index${id}.html`;
    await OmniBox.log("info", `[detail] videoId=${params?.videoId} url=${detailUrl}`);
    const html = await request(detailUrl);
    const $ = cheerio.load(html, { decodeEntities: false });

    const title = normalizeText($(".myui-content__detail h1.title").clone().children().remove().end().text() || $("title").text().replace(/\s*-\s*HDmoli.*$/, ""));
    const remarks = normalizeText($(".myui-content__detail h1.title font").text());
    const pic = absoluteUrl($(".myui-content__thumb img").attr("data-original") || $(".myui-content__thumb img").attr("src"));
    const score = normalizeText($("#rating .branch").text()).replace(/分$/, "");
    const content = normalizeText($(".myui-panel p.text-muted").first().text().replace(/^剧情简介：/, ""));

    let vodArea = "";
    let vodYear = "";
    let vodActor = "";
    let vodDirector = "";
    let typeName = "";

    $(".myui-content__detail p.data").each((_, el) => {
      const text = normalizeText($(el).text());
      if (text.startsWith("分类：")) typeName = text.replace(/^分类：/, "").split("地区：")[0].trim();
      if (text.includes("地区：")) {
        const m = text.match(/地区：([^\s]+)/);
        if (m) vodArea = m[1].trim();
      }
      if (text.includes("年份：")) {
        const m = text.match(/年份：([^\s]+)/);
        if (m) vodYear = m[1].trim();
      }
      if (text.startsWith("演员：")) vodActor = text.replace(/^演员：/, "").trim();
      if (text.startsWith("导演：")) vodDirector = text.replace(/^导演：/, "").trim();
    });

    let vod_play_sources = parsePlaySources($);
    const downloadLinks = parseDownloadLinks($);

    if (downloadLinks.length) {
      await OmniBox.log("info", `[detail] hide drive links=${downloadLinks.length}`);
    }

    vod_play_sources = filterOutDriveSources(vod_play_sources);

    await OmniBox.log("info", `[detail] sources=${vod_play_sources.length}`);
    return {
      list: [{
        vod_id: `${prefix}:${id}`,
        vod_name: title,
        vod_pic: pic,
        vod_content: content,
        vod_actor: vodActor,
        vod_director: vodDirector,
        vod_area: vodArea,
        vod_year: vodYear,
        vod_remarks: remarks,
        vod_douban_score: score,
        type_name: typeName,
        vod_play_sources,
      }],
    };
  } catch (error) {
    await OmniBox.log("error", `[detail] ${error.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params?.keyword || params?.wd || "").trim();
    const page = Number(params?.page || 1) || 1;
    if (!keyword) return { page: 1, pagecount: 0, total: 0, list: [] };

    let url = `/search/-------------.html?wd=${encodeURIComponent(keyword)}`;
    if (page > 1) {
      url = `/search/----------${page}---.html?wd=${encodeURIComponent(keyword)}`;
    }
    await OmniBox.log("info", `[search] keyword=${keyword} page=${page} url=${url}`);
    const html = await request(url);
    const list = parseListPage(html);
    const pagecount = Math.max(page, parsePageCount(html));
    await OmniBox.log("info", `[search] list=${list.length} pagecount=${pagecount}`);
    return {
      page,
      pagecount,
      total: pagecount * Math.max(list.length, 20),
      list,
    };
  } catch (error) {
    await OmniBox.log("error", `[search] ${error.message}`);
    return { page: Number(params?.page || 1) || 1, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const raw = String(params?.playId || "");
    if (!raw) throw new Error("playId 不能为空");

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { directUrl: raw, source: params?.flag || "play" };
    }

    if (payload.directUrl) {
      const directUrl = String(payload.directUrl || "").trim();
      const sniff = !/\.(m3u8|mp4|flv)(\?|$)/i.test(directUrl);
      await OmniBox.log("info", `[play] direct source=${payload.source} sniff=${sniff} url=${directUrl}`);
      return {
        urls: [{ name: payload.source || "播放", url: directUrl }],
        header: {},
        parse: sniff ? 1 : 0};
    }

    if (payload.sniffUrl) {
      const sniffHeaders = {
        Referer: payload.referer || BASE_URL + "/",
        "User-Agent": USER_AGENT,
      };
      await OmniBox.log("info", `[play] sdk sniff source=${payload.source} sniffUrl=${payload.sniffUrl}`);
      try {
        const sniffed = await OmniBox.sniffVideo(payload.sniffUrl, sniffHeaders);
        const sniffedUrl = String(sniffed?.url || "").trim();
        if (sniffedUrl) {
          await OmniBox.log("info", `[play] sdk sniff success url=${sniffedUrl}`);
          return {
            urls: [{ name: payload.source || "播放", url: sniffedUrl }],
            header: sniffed?.header || {},
            parse: 0};
        }
      } catch (sniffError) {
        await OmniBox.log("warn", `[play] sdk sniff failed: ${sniffError.message}`);
      }

      return {
        urls: [{ name: payload.source || "播放", url: payload.sniffUrl }],
        header: sniffHeaders,
        parse: 1};
    }

    if (!payload.playUrl) throw new Error("缺少 playUrl");

    await OmniBox.log("info", `[play] source=${payload.source} playUrl=${payload.playUrl}`);
    const html = await request(payload.playUrl, {
      headers: {
        Referer: payload.referer || BASE_URL + "/",
      },
    });

    const match = html.match(/var\s+player_aaaa\s*=\s*(\{.*?\})\s*<\/script>/s);
    if (!match) throw new Error("未找到 player_aaaa");

    const player = JSON.parse(match[1]);
    const encrypt = Number(player.encrypt || 0);
    const finalUrl = decodePlayerUrl(player.url || "", encrypt);

    if (!finalUrl) throw new Error("播放器未给出 url");

    const isDirectMedia = /\.(m3u8|mp4|flv)(\?|$)/i.test(finalUrl);
    const finalHeaders = {};
    if (player.from && !isDirectMedia) {
      finalHeaders.Referer = payload.playUrl;
      finalHeaders["User-Agent"] = USER_AGENT;
    }

    await OmniBox.log("info", `[play] from=${player.from} encrypt=${encrypt} direct=${isDirectMedia} sniff=${!isDirectMedia} url=${finalUrl}`);

    if (!isDirectMedia) {
      try {
        const sniffed = await OmniBox.sniffVideo(payload.playUrl, {
          Referer: payload.referer || BASE_URL + "/",
          "User-Agent": USER_AGENT,
        });
        const sniffedUrl = String(sniffed?.url || "").trim();
        if (sniffedUrl) {
          await OmniBox.log("info", `[play] sdk sniff success from player page url=${sniffedUrl}`);
          return {
            urls: [{ name: payload.source || player.from || "播放", url: sniffedUrl }],
            header: sniffed?.header || {},
            parse: 0};
        }
      } catch (sniffError) {
        await OmniBox.log("warn", `[play] sdk sniff from player page failed: ${sniffError.message}`);
      }

      return {
        urls: [{ name: payload.source || player.from || "播放", url: payload.playUrl }],
        header: {
          Referer: payload.referer || BASE_URL + "/",
          "User-Agent": USER_AGENT
        },
        parse: 1};
    }

    return {
      urls: [{ name: payload.source || player.from || "播放", url: finalUrl }],
      header: finalHeaders,
      parse: 0};
  } catch (error) {
    await OmniBox.log("error", `[play] ${error.message}`);
    return {
      urls: [],
      header: {},
      parse: 0};
  }
}

});

_load(3, "乌云影视", function (module, exports, require) {
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

_load(4, "凡客TV", function (module, exports, require) {
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

_load(5, "太二影视", function (module, exports, require) {
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

_load(6, "小黑米", function (module, exports, require) {
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

_load(8, "莫小影", function (module, exports, require) {
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

_load(9, "袋鼠影视", function (module, exports, require) {
// @name 袋鼠影视
// @author 梦
// @description 影视站：https://dsystv.com ，支持首页、分类、详情、搜索与播放
// @dependencies cheerio
// @version 1.0.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/袋鼠影视.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const BASE_URL = "https://dsystv.com";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const LIST_CACHE_TTL = Number(process.env.DAISHU_LIST_CACHE_TTL || 900);
const DETAIL_CACHE_TTL = Number(process.env.DAISHU_DETAIL_CACHE_TTL || 1800);
const SEARCH_CACHE_TTL = Number(process.env.DAISHU_SEARCH_CACHE_TTL || 600);

const CATEGORY_CONFIG = [
  { id: "1", name: "电影" },
  { id: "2", name: "电视剧" },
  { id: "3", name: "综艺" },
  { id: "4", name: "动漫" },
];

const FILTERS = {
  "1": [
    { key: "tid", name: "类型", value: [{ name: "全部", value: "1" }, { name: "动作片", value: "5" }, { name: "喜剧片", value: "10" }, { name: "爱情片", value: "6" }, { name: "科幻片", value: "7" }, { name: "恐怖片", value: "8" }, { name: "战争片", value: "9" }, { name: "剧情片", value: "12" }, { name: "动画片", value: "41" }, { name: "纪录片", value: "11" }] },
    { key: "area", name: "地区", value: [{ name: "全部", value: "" }, { name: "大陆", value: "大陆" }, { name: "香港", value: "香港" }, { name: "台湾", value: "台湾" }, { name: "日本", value: "日本" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }, { name: "英国", value: "英国" }, { name: "印度", value: "印度" }, { name: "法国", value: "法国" }, { name: "泰国", value: "泰国" }] },
    { key: "year", name: "年份", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }, { name: "2021", value: "2021" }, { name: "2020", value: "2020" }] },
  ],
  "2": [
    { key: "tid", name: "类型", value: [{ name: "全部", value: "2" }, { name: "国产剧", value: "13" }, { name: "港台剧", value: "14" }, { name: "欧美剧", value: "15" }, { name: "日韩剧", value: "16" }] },
    { key: "area", name: "地区", value: [{ name: "全部", value: "" }, { name: "大陆", value: "大陆" }, { name: "香港", value: "香港" }, { name: "台湾", value: "台湾" }, { name: "日本", value: "日本" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }, { name: "英国", value: "英国" }] },
    { key: "year", name: "年份", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }] },
  ],
  "3": [
    { key: "area", name: "地区", value: [{ name: "全部", value: "" }, { name: "大陆", value: "大陆" }, { name: "日本", value: "日本" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }] },
    { key: "year", name: "年份", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }] },
  ],
  "4": [
    { key: "area", name: "地区", value: [{ name: "全部", value: "" }, { name: "大陆", value: "大陆" }, { name: "日本", value: "日本" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }] },
    { key: "year", name: "年份", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }] },
  ],
};

const FILTER_DEF = {
  "1": { tid: "1", area: "", year: "" },
  "2": { tid: "2", area: "", year: "" },
  "3": { tid: "3", area: "", year: "" },
  "4": { tid: "4", area: "", year: "" },
};

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

async function requestText(url, options = {}, redirectCount = 0) {
  await OmniBox.log("info", `[袋鼠影视][request] ${options.method || "GET"} ${url}`);
  const res = await OmniBox.request(url, {
    method: options.method || "GET",
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
  if ([301, 302, 303, 307, 308].includes(statusCode) && redirectCount < 5) {
    const location = res?.headers?.location || res?.headers?.Location || res?.headers?.LOCATION;
    if (location) {
      const nextUrl = absoluteUrl(location);
      await OmniBox.log("info", `[袋鼠影视][redirect] ${url} -> ${nextUrl}`);
      return requestText(nextUrl, options, redirectCount + 1);
    }
  }
  if (!res || statusCode !== 200) {
    throw new Error(`HTTP ${statusCode || "unknown"} @ ${url}`);
  }
  return String(res.body || "");
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
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/&emsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePageCount($) {
  let max = 1;
  $(".hy-page a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/[?&]page=(\d+)/);
    if (match) max = Math.max(max, Number(match[1] || 1));
  });
  return max;
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

function parseCardFromThumb($, anchor) {
  const node = $(anchor);
  const href = node.attr("href") || "";
  const title = normalizeText(node.attr("title") || node.find("img").attr("alt") || node.closest(".item, dt").siblings(".title,.head").find("a,h3,h5").first().text());
  const pic = node.attr("data-original") || node.find("img").attr("data-original") || node.find("img").attr("src") || "";
  const remarks = normalizeText(node.find(".note").first().text() || node.closest("dt").find(".note").first().text() || node.closest(".item").find(".note").first().text());
  return {
    vod_id: absoluteUrl(href),
    vod_name: title,
    vod_pic: absoluteUrl(pic),
    vod_remarks: remarks,
  };
}

function parseHomeList(htmlText) {
  const $ = cheerio.load(htmlText);
  const list = [];
  $(".swiper-container.hy-slide a.videopic[href]").each((_, el) => {
    list.push(parseCardFromThumb($, el));
  });
  $(".hy-video-list .item a.videopic[href]").each((_, el) => {
    list.push(parseCardFromThumb($, el));
  });
  return dedupeVodList(list).filter((item) => item.vod_id && item.vod_name);
}

function parseCategoryList(htmlText) {
  const $ = cheerio.load(htmlText);
  const list = [];
  $(".hy-video-list .item a.videopic[href]").each((_, el) => {
    list.push(parseCardFromThumb($, el));
  });
  $(".hy-video-details .item dl.content").each((_, el) => {
    const box = $(el);
    const anchor = box.find("dt a.videopic[href]").first();
    const href = anchor.attr("href") || "";
    const title = normalizeText(box.find("dd .head a, dd .head h3, dd .head h5").first().text());
    const picStyle = anchor.attr("style") || "";
    const pic = anchor.attr("data-original") || anchor.find("img").attr("src") || ((picStyle.match(/url\(([^)]+)\)/) || [])[1] || "");
    const remarks = normalizeText(anchor.find(".note").first().text());
    list.push({
      vod_id: absoluteUrl(href),
      vod_name: title,
      vod_pic: absoluteUrl(pic.replace(/^['"]|['"]$/g, "")),
      vod_remarks: remarks,
      vod_actor: normalizeText(box.find("li:contains('主演')").first().text().replace(/^主演：/, "")),
      vod_director: normalizeText(box.find("li:contains('导演')").first().text().replace(/^导演：/, "")),
      vod_area: normalizeText(box.find("li:contains('地区')").first().text().replace(/^地区：/, "")),
      vod_lang: normalizeText(box.find("li:contains('语言')").first().text().replace(/^语言：/, "")),
      vod_year: normalizeText(box.find("li:contains('年份')").first().text().replace(/^年份：/, "")),
      vod_douban_score: normalizeText(box.find("li:contains('豆瓣')").first().text().replace(/^豆瓣：/, "")),
    });
  });
  return {
    list: dedupeVodList(list).filter((item) => item.vod_id && item.vod_name),
    pagecount: parsePageCount($),
  };
}

function parseSearchList(htmlText) {
  return parseCategoryList(htmlText);
}

function parseDetail(htmlText, detailUrl) {
  const $ = cheerio.load(htmlText);
  const title = normalizeText($("h1.h4, h1").first().text());
  const detailAnchor = $(".hy-video-details .content dt a.videopic").first();
  const pic = detailAnchor.find("img").attr("src") || detailAnchor.attr("data-original") || "";
  const remarks = normalizeText(detailAnchor.find(".note").first().text());
  const actor = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("主演：")).first();
  const director = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("导演：")).first();
  const year = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("年份：")).first();
  const area = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("地区：")).first();
  const typeLi = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("类型：")).first();
  const lang = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("语言：")).first();
  const alias = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("又名：")).first();
  const douban = $(".hy-video-details li").filter((_, el) => normalizeText($(el).text()).startsWith("豆瓣：")).first();
  const content = normalizeText($(".video-plot[data-video-plot]").html() || $("#list3 .plot").html() || $(".plot").html() || "");

  const playSources = [];
  $("#playlist .panel").each((_, panel) => {
    const sourceName = normalizeText($(panel).find("a.option").first().attr("title") || $(panel).find("a.option").first().clone().children().remove().end().text()) || `线路${playSources.length + 1}`;
    const episodes = [];
    $(panel).find(".playlist a[href]").each((__, a) => {
      const href = $(a).attr("href") || "";
      const epName = normalizeText($(a).attr("title") || $(a).text());
      if (!href || !epName) return;
      episodes.push({ name: epName, playId: absoluteUrl(href) });
    });
    if (episodes.length) playSources.push({ name: sourceName, episodes });
  });

  return {
    list: [{
      vod_id: detailUrl,
      vod_name: title,
      vod_pic: absoluteUrl(pic),
      type_name: normalizeText(typeLi.text().replace(/^类型：/, "")),
      vod_remarks: remarks,
      vod_actor: normalizeText(actor.text().replace(/^主演：/, "")),
      vod_director: normalizeText(director.text().replace(/^导演：/, "")),
      vod_year: normalizeText(year.text().replace(/^年份：/, "")),
      vod_area: normalizeText(area.text().replace(/^地区：/, "")),
      vod_lang: normalizeText(lang.text().replace(/^语言：/, "")),
      vod_douban_score: normalizeText(douban.text().replace(/^豆瓣：/, "")),
      vod_content: content,
      vod_play_sources: playSources,
      other: normalizeText(alias.text().replace(/^又名：/, "")),
    }],
  };
}

function buildCategoryUrl(categoryId, page, filters = {}) {
  const baseFilter = FILTER_DEF[String(categoryId)] || { tid: String(categoryId) };
  const merged = { ...baseFilter, ...(filters || {}) };
  const tid = String(merged.tid || categoryId || "1");
  const params = new URLSearchParams({ searchtype: "5", tid, page: String(page || 1) });
  if (merged.area) params.set("area", String(merged.area));
  if (merged.year) params.set("year", String(merged.year));
  return `${BASE_URL}/search.php?${params.toString()}`;
}

async function home(params, context) {
  try {
    const html = await getCachedText("daishu:home", LIST_CACHE_TTL, async () => requestText(`${BASE_URL}/`));
    return {
      class: CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name })),
      filters: FILTERS,
      list: parseHomeList(html),
    };
  } catch (e) {
    await OmniBox.log("error", `[袋鼠影视][home] ${e.message}`);
    return { class: CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name })), filters: FILTERS, list: [] };
  }
}

async function category(params, context) {
  try {
    const categoryId = String(params.categoryId || params.type_id || "1");
    const page = Math.max(1, Number(params.page || 1));
    const filters = params.extend || params.filters || params.ext || {};
    const url = buildCategoryUrl(categoryId, page, filters);
    const html = await getCachedText(`daishu:category:${url}`, LIST_CACHE_TTL, async () => requestText(url));
    const parsed = parseCategoryList(html);
    const pagecount = parsed.pagecount || (parsed.list.length >= 20 ? page + 1 : page);
    return {
      page,
      pagecount,
      total: pagecount * Math.max(parsed.list.length, 1),
      list: parsed.list,
    };
  } catch (e) {
    await OmniBox.log("error", `[袋鼠影视][category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const videoId = String(params.videoId || params.id || "").trim();
    if (!videoId) return { list: [] };
    const url = /^https?:\/\//.test(videoId) ? videoId : absoluteUrl(videoId);
    const html = await getCachedText(`daishu:detail:${url}`, DETAIL_CACHE_TTL, async () => requestText(url));
    return parseDetail(html, url);
  } catch (e) {
    await OmniBox.log("error", `[袋鼠影视][detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const wd = String(params.keyword || params.wd || params.key || "").trim();
    const page = Math.max(1, Number(params.page || 1));
    if (!wd) return { page, pagecount: 0, total: 0, list: [] };
    const body = `searchword=${encodeURIComponent(wd)}`;
    const html = await getCachedText(`daishu:search:${wd}:${page}`, SEARCH_CACHE_TTL, async () => requestText(`${BASE_URL}/search.php?page=${page}`, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      referer: `${BASE_URL}/search.php`,
    }));
    const parsed = parseSearchList(html);
    const totalMatch = html.match(/相关的.{0,40}“(\d+)”.{0,20}条结果/);
    const total = totalMatch ? Number(totalMatch[1] || 0) : parsed.list.length;
    return {
      page,
      pagecount: parsed.pagecount || page,
      total,
      list: parsed.list,
    };
  } catch (e) {
    await OmniBox.log("error", `[袋鼠影视][search] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const playId = String(params.playId || params.id || "").trim();
    if (!playId) return { parse: 1, url: "", urls: [], header: {} };
    const url = absoluteUrl(playId);
    const html = await requestText(url, { referer: url });
    const match = html.match(/var\s+now\s*=\s*"([^"]+)"/);
    const directUrl = match ? String(match[1] || "").trim() : "";
    if (directUrl) {
      return {
        parse: 0,
        url: directUrl,
        urls: [{ name: "播放", url: directUrl }],
        header: {
          "User-Agent": UA,
          Referer: url,
        },
      };
    }
    return {
      parse: 1,
      url,
      urls: [{ name: "播放页", url }],
      header: {
        "User-Agent": UA,
        Referer: url,
      },
    };
  } catch (e) {
    await OmniBox.log("error", `[袋鼠影视][play] ${e.message}`);
    return { parse: 1, url: String(params.playId || params.id || ""), urls: [], header: {} };
  }
}

});

_load(10, "金牌", function (module, exports, require) {
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
