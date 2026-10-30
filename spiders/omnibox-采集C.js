// @name 影视采集C(合并13源)
// @version 2.20261030.3
// @description 自动同步：采集聚合
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-采集C.js
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

_load(3, "PPnix", function (module, exports, require) {
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

_load(4, "iKanBot", function (module, exports, require) {
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

_load(5, "七味", function (module, exports, require) {
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

_load(6, "在线之家", function (module, exports, require) {
// @name 在线之家
// @author @PFR001, @lucky_TJQ
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: axios, cheerio
// @version 1.2.6
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/在线之家.js

/**
 * ============================================================================
 * 在线之家 (ZXZJ)
 * https://www.zxzjhd.com
 * 
 * 功能特性：
 * - 刮削：支持 (集成 TMDB 元数据)
 * - 弹幕：支持 (通过弹幕 API 匹配)
 * - 嗅探：支持 (智能视频地址提取)
 * ============================================================================
 */
const axios = require("axios");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const host = 'https://www.zxzjhd.com';

// 弹幕 API 地址 (优先使用环境变量)
const DANMU_API = process.env.DANMU_API || "";

// 基础 Headers (用于列表页等普通请求)
const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': host + '/',
    'Origin': host,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
};

const axiosInstance = axios.create({
    timeout: 15000,
    headers: baseHeaders,
    validateStatus: status => true
});

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    OmniBox.log("info", `[ZXZJ-DEBUG] ${output}`);
};

const logError = (message, error) => {
    OmniBox.log("error", `[ZXZJ-DEBUG] ${message}: ${error.message || error}`);
};

/**
 * 修复 HTML 被 JSON 包裹的反爬响应
 */
const fixJsonWrappedHtml = (html) => {
    if (!html || typeof html !== "string") return html;
    const trimmed = html.trim();
    if (trimmed.startsWith("<") || trimmed.startsWith("<!DOCTYPE")) return trimmed;
    if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (typeof parsed === "string" && parsed.trim().startsWith("<")) {
                return parsed.trim();
            }
        } catch { }
    }
    return trimmed;
};

/**
 * 元数据编解码 (用于透传参数)
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
 * 标准化 URL
 */
const fixUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    return url.startsWith('/') ? `${host}${url}` : `${host}/${url}`;
};

/**
 * 处理图片 URL，如果是外部 URL 则通过代理
 * @param {string} imageUrl - 原始图片 URL
 * @param {string} baseURL - 代理服务器基础 URL
 * @param {string} referer - 图片来源的 Referer (默认取 imageUrl 的域名)
 * @returns {string} 处理后的图片 URL
 */
const processImageUrl = (imageUrl, baseURL = "", referer = "") => {
    if (!imageUrl) return '';

    // 标准化 URL
    let url = fixUrl(imageUrl);

    // 检查是否是外部 URL（不是当前 host 的 URL）
    const isExternalUrl = !url.includes(host) && url.startsWith('http');

    // 如果是外部 URL 且有 baseURL，则通过代理
    if (isExternalUrl && baseURL) {
        try {
            // 如果没有指定 referer，从 imageUrl 的域名提取
            let finalReferer = referer;
            if (!finalReferer) {
                try {
                    const urlObj = new URL(url);
                    finalReferer = `${urlObj.protocol}//${urlObj.host}`;
                } catch (e) {
                    finalReferer = host;
                }
            }

            // 构建带 headers 的 URL 格式: url@Referer=value
            const urlWithHeaders = `${url}@Referer=${finalReferer}`;
            // 编码 URL 参数
            const encodedUrl = encodeURIComponent(urlWithHeaders);
            // 返回代理 URL
            return `${baseURL}/api/proxy/image?url=${encodedUrl}`;
        } catch (error) {
            logError("处理图片 URL 失败", error);
            return url;
        }
    }

    return url;
};

/**
 * 统一请求 HTML
 */
const requestHtml = async (url, options = {}) => {
    try {
        const res = await axiosInstance.get(url, {
            headers: {
                ...baseHeaders,
                ...(options.headers || {})
            },
            responseType: "text",
            ...options
        });
        return fixJsonWrappedHtml(res.data);
    } catch (e) {
        logError("请求失败", e);
        return "";
    }
};

// ========== 解密算法 ==========
const DecryptTools = {
    decrypt: function (encryptedData) {
        try {
            // 1. 翻转字符串
            const reversed = encryptedData.split('').reverse().join('');
            // 2. Hex 转 String
            let hexDecoded = '';
            for (let i = 0; i < reversed.length; i += 2) {
                hexDecoded += String.fromCharCode(parseInt(reversed.substr(i, 2), 16));
            }
            // 3. 移除中间混淆字符 (7位)
            const len = hexDecoded.length;
            const splitLen = Math.floor((len - 7) / 2);
            return hexDecoded.substring(0, splitLen) + hexDecoded.substring(splitLen + 7);
        } catch (e) {
            logError("解密失败", e);
            return null;
        }
    }
};

/**
 * 判断网盘线路名称
 */
const isPanLineName = (name) => {
    if (!name) return false;
    const n = String(name);
    return n.includes("网盘") || n.includes("百度") || n.includes("夸克") || n.includes("UC") || n.includes("阿里") || n.includes("迅雷") || n.includes("天翼") || n.includes("115") || n.includes("123");
};

/**
 * 判断是否为网盘分享链接
 */
const isPanUrl = (url) => {
    if (!url) return false;
    const u = url.toLowerCase();
    return u.includes("pan.baidu.com") || u.includes("quark.cn") || u.includes("pan.quark.cn") || u.includes("drive.uc.cn") || u.includes("aliyundrive.com") || u.includes("alipan.com") || u.includes("xunlei.com") || u.includes("cloud.189.cn") || u.includes("115.com") || u.includes("123pan.com");
};

const normalizeShareUrl = (url) => {
    if (!url) return "";
    let u = String(url).trim();
    if (u.startsWith("push://")) {
        u = u.slice("push://".length);
    }
    if (u.startsWith("push:")) {
        u = u.slice("push:".length);
    }
    return u.trim();
};

/**
 * 从播放页提取网盘链接
 */
const extractPanUrlFromPage = async (playPageUrl) => {
    const html = await requestHtml(playPageUrl, {});
    if (!html) return "";

    const playerMatch = html.match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i);
    if (!playerMatch) return "";

    try {
        const cleanStr = playerMatch[1]
            .replace(/\\"/g, "\u0001")
            .replace(/\"/g, "\"")
            .replace(/\u0001/g, "\"")
            .replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)))
            .replace(/\\\//g, "/");

        const playerData = JSON.parse(cleanStr);
        return playerData.url || "";
    } catch (e) {
        logInfo(`解析 player_aaaa 失败: ${e.message}`);
        return "";
    }
};

/**
 * 判断是否为视频文件
 */
const isVideoFile = (file) => {
    if (!file || !file.file_name) return false;
    const fileName = String(file.file_name).toLowerCase();
    const videoExtensions = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];
    for (const ext of videoExtensions) {
        if (fileName.endsWith(ext)) return true;
    }
    if (file.format_type) {
        const formatType = String(file.format_type).toLowerCase();
        if (formatType.includes("video") || formatType.includes("mpeg") || formatType.includes("h264")) return true;
    }
    return false;
};

const getFileId = (file) => file?.fid || file?.file_id || "";
const getFileName = (file) => file?.file_name || file?.name || "";

/**
 * 递归获取所有视频文件
 */
const getAllVideoFiles = async (shareURL, files) => {
    const videoFiles = [];
    for (const file of files || []) {
        if (file.file && isVideoFile(file)) {
            videoFiles.push(file);
        } else if (file.dir) {
            try {
                const subFileId = getFileId(file);
                if (!subFileId) continue;
                const subFileList = await OmniBox.getDriveFileList(shareURL, subFileId);
                if (subFileList && Array.isArray(subFileList.files)) {
                    const subVideoFiles = await getAllVideoFiles(shareURL, subFileList.files);
                    videoFiles.push(...subVideoFiles);
                }
            } catch (error) {
                logInfo(`获取子目录文件失败: ${error.message}`);
            }
        }
    }
    return videoFiles;
};

/**
 * 获取网盘分享的文件列表（带缓存）
 */
const panShareCache = new Map();

const loadPanFiles = async (shareURL) => {
    if (!shareURL) return null;
    if (panShareCache.has(shareURL)) return panShareCache.get(shareURL);
    try {
        const driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
        const fileList = await OmniBox.getDriveFileList(shareURL, "0");
        const files = Array.isArray(fileList?.files) ? fileList.files : [];
        const videos = await getAllVideoFiles(shareURL, files);
        const result = { driveInfo, videos };
        panShareCache.set(shareURL, result);
        return result;
    } catch (error) {
        logInfo(`读取网盘文件失败: ${error.message}`);
        return null;
    }
};

/**
 * 嗅探播放页，兜底提取真实视频地址
 */
const sniffZxzjPlay = async (playUrl) => {
    if (!playUrl) return null;
    try {
        logInfo("尝试嗅探播放页", playUrl);
        const sniffed = await OmniBox.sniffVideo(playUrl);
        if (sniffed && sniffed.url) {
            logInfo("嗅探成功", sniffed.url);
            return {
                urls: [{ name: "嗅探线路", url: sniffed.url }],
                parse: 0,
                header: sniffed.header || baseHeaders
            };
        }
    } catch (error) {
        logInfo(`嗅探失败: ${error.message}`);
    }
    return null;
};

/**
 * 从标题中提取集数
 */
function extractEpisode(title) {
    if (!title) return "";

    const processedTitle = title.trim();

    // 1. S01E03 格式
    const seMatch = processedTitle.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
    if (seMatch) return seMatch[1];

    // 2. 中文格式：第XX集/话
    const cnMatch = processedTitle.match(/第\s*([0-9]+)\s*[集话章节回期]/);
    if (cnMatch) return cnMatch[1];

    // 3. EP/E 格式
    const epMatch = processedTitle.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
    if (epMatch) return epMatch[1];

    // 4. 括号格式 [03]
    const bracketMatch = processedTitle.match(/[\[\(【（](\d{1,3})[\]\)】）]/);
    if (bracketMatch) {
        const num = bracketMatch[1];
        if (!["720", "1080", "480"].includes(num)) return num;
    }

    return "";
}

/**
 * 构建用于弹幕匹配的文件名
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

/**
 * 匹配弹幕
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

// ========== 列表解析逻辑 ==========
/**
 * 解析视频列表
 * @param {Object} $ - cheerio 实例
 * @param {string} baseURL - 代理服务器基础 URL
 * @returns {Array} 视频列表
 */
const parseVideoList = ($, baseURL = "") => {
    const list = [];
    const items = $('.stui-vodlist__item, .stui-vodlist li, .v-item, .public-list-box');
    items.each((_, element) => {
        const $item = $(element);
        const $link = $item.find('a.stui-vodlist__thumb, a.v-thumb, a.public-list-exp');
        if ($link.length === 0) return;

        const title = $link.attr('title') || $item.find('.title a').text().trim();
        const href = $link.attr('href');
        let pic = $link.attr('data-original') || $link.attr('data-src') || $link.attr('src');

        // 处理背景图样式
        if (!pic) {
            const style = $link.attr('style') || '';
            const match = style.match(/url\((['"]?)(.*?)\1\)/);
            if (match) pic = match[2];
        }

        const remarks = $item.find('.pic-text, .v-remarks, .public-list-prb').text().trim();

        if (title && href) {
            list.push({
                vod_id: href,
                vod_name: title,
                vod_pic: processImageUrl(pic, baseURL),
                vod_remarks: remarks || ''
            });
        }
    });
    return list;
};

// ========== 分类与筛选配置 ==========
const CLASS_LIST = [
    { type_id: '1', type_name: '电影' },
    { type_id: '2', type_name: '美剧' },
    { type_id: '3', type_name: '韩剧' },
    { type_id: '4', type_name: '日剧' },
    { type_id: '5', type_name: '泰剧' },
    { type_id: '6', type_name: '动漫' }
];

const buildFilterOptions = (values = [], allName = "全部") => [
    { name: allName, value: "" },
    ...values.filter(Boolean).map((item) => ({ name: item, value: item }))
];

const buildYearOptions = () => {
    const currentYear = Math.max(new Date().getFullYear(), 2026);
    const years = [];
    for (let year = currentYear; year >= 2000; year--) {
        years.push(String(year));
    }
    return buildFilterOptions(years);
};

const buildFilterList = ({ classes = [], areas = [], includeClass = true, includeArea = true } = {}) => {
    const list = [];
    if (includeClass && classes.length > 0) {
        list.push({ key: "class", name: "按剧情", init: "", value: buildFilterOptions(classes) });
    }
    if (includeArea && areas.length > 0) {
        list.push({ key: "area", name: "按地区", init: "", value: buildFilterOptions(areas) });
    }
    list.push({ key: "year", name: "按年份", init: "", value: buildYearOptions() });
    return list;
};

const DRAMA_CLASSES = ["剧情", "喜剧", "爱情", "动作", "悬疑", "恐怖", "奇幻", "惊悚", "犯罪", "科幻", "音乐", "其他"];

const FILTERS = {
    "1": buildFilterList({
        classes: ["喜剧", "爱情", "恐怖", "动作", "科幻", "剧情", "战争", "警匪", "犯罪", "动画", "奇幻", "冒险", "悬疑", "惊悚", "青春", "情色"],
        areas: ["大陆", "香港", "台湾", "欧美", "韩国", "日本", "泰国", "印度", "俄罗斯", "其他"]
    }),
    "2": buildFilterList({ classes: DRAMA_CLASSES, areas: ["欧美"] }),
    "3": buildFilterList({ classes: DRAMA_CLASSES, areas: ["韩国"] }),
    "4": buildFilterList({ classes: DRAMA_CLASSES, areas: ["日本"] }),
    "5": buildFilterList({ includeClass: false, includeArea: false }),
    "6": buildFilterList({
        classes: ["情感", "科幻", "热血", "推理", "搞笑", "冒险", "萝莉", "校园", "动作", "机战", "运动", "战争", "少年", "少女", "社会", "原创", "亲子", "益智", "励志", "其他"],
        areas: ["国产", "日本", "欧美", "其他"]
    })
};

const parseFilters = (filters) => {
    if (!filters) return {};
    if (typeof filters === "object") return filters;
    if (typeof filters === "string") {
        try {
            const parsed = JSON.parse(filters);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    }
    return {};
};

const normalizeFilters = (...sources) => Object.assign({}, ...sources.map(parseFilters));

const getFilterValue = (filters, keys = []) => {
    for (const key of keys) {
        const value = filters?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return String(value).trim();
        }
    }
    return "";
};

const encodeVodshowPart = (value) => encodeURIComponent(String(value || "").trim());

const buildCategoryUrl = (categoryId, page, filters = {}) => {
    const tid = encodeVodshowPart(categoryId || "1");
    const area = encodeVodshowPart(getFilterValue(filters, ["area"]));
    const by = encodeVodshowPart(getFilterValue(filters, ["by", "sort"]));
    const genre = encodeVodshowPart(getFilterValue(filters, ["class", "type", "genre"]));
    const year = encodeVodshowPart(getFilterValue(filters, ["year"]));
    const pg = Math.max(1, parseInt(page) || 1);
    return `${host}/vodshow/${tid}-${area}-${by}-${genre}-----${pg}---${year}.html`;
};

// ========== 核心功能函数 ==========

/**
 * 首页
 */
async function home(params, context) {
    logInfo("进入首页");

    const baseURL = context?.baseURL || "";
    const url = `${host}`;
    const html = await requestHtml(url);
    const $ = cheerio.load(html || "");
    const list = parseVideoList($, baseURL);

    logInfo(`获取到 ${list.length} 个视频`);
    return {
        list: list,
        class: CLASS_LIST,
        filters: FILTERS
    };
}

/**
 * 分类
 */
async function category(params, context) {
    const categoryId = String(params.categoryId || params.type_id || "1");
    const filters = normalizeFilters(params.extend, params.ext, params.filter, params.filters);
    const { page } = params;
    const pg = parseInt(page) || 1;
    const baseURL = context?.baseURL || "";
    logInfo(`请求分类: ${categoryId}, 页码: ${pg}, 筛选: ${JSON.stringify(filters)}`);

    try {
        const url = buildCategoryUrl(categoryId, pg, filters);
        const html = await requestHtml(url);
        const $ = cheerio.load(html || "");
        const list = parseVideoList($, baseURL);

        logInfo(`获取到 ${list.length} 个视频`);
        return { list: list, page: pg, pagecount: list.length >= 12 ? pg + 1 : pg, filters: FILTERS[categoryId] || [] };
    } catch (e) {
        logError("分类请求失败", e);
        return { list: [], page: pg, pagecount: 0, filters: FILTERS[categoryId] || [] };
    }
}

/**
 * 搜索
 */
async function search(params, context) {
    const wd = params.keyword || params.wd || "";
    const pg = parseInt(params.page) || 1;
    const baseURL = context?.baseURL || "";
    logInfo(`搜索关键词: ${wd}, 页码: ${pg}`);

    try {
        const url = `${host}/vodsearch/${encodeURIComponent(wd)}----------${pg}---.html`;
        const html = await requestHtml(url);
        const $ = cheerio.load(html || "");
        const list = parseVideoList($, baseURL);

        logInfo(`搜索到 ${list.length} 个结果`);
        return { list: list, page: pg, pagecount: list.length >= 20 ? pg + 1 : pg };
    } catch (e) {
        logError("搜索失败", e);
        return { list: [], page: pg, pagecount: 0 };
    }
}

/**
 * 详情
 */
async function detail(params, context) {
    const videoId = params.videoId;
    const url = fixUrl(videoId);
    const baseURL = context?.baseURL || "";
    logInfo(`请求详情 ID: ${videoId}`);

    try {
        const html = await requestHtml(url);
        const $ = cheerio.load(html);

        // 兼容多种详情页布局
        const title = $('h1.title').text().trim() || $('.stui-content__detail .title').text().trim() || $('title').text().split('-')[0].trim();
        let pic = $('.stui-content__thumb img').attr('data-original') || $('.stui-content__thumb img').attr('src') || '';
        const desc = $('.stui-content__detail .desc').text().trim() || $('meta[name="description"]').attr('content') || '';

        // 处理图片 URL
        pic = processImageUrl(pic, baseURL);

        const playSources = [];
        const $playlists = $(".stui-content__playlist, .stui-pannel__data ul, .playlist");

        const playlistTasks = [];
        const playlistResults = [];

        $playlists.each((index, listElem) => {
            let sourceName = "默认线路";
            const $prevHead = $(listElem).prev(".stui-vodlist__head, .stui-pannel__head");
            if ($prevHead.length > 0) {
                sourceName = $prevHead.find("h3").text().trim() || sourceName;
            }

            const isPanLine = isPanLineName(sourceName);
            const $links = $(listElem).find("li a");

            playlistTasks.push(
                (async () => {
                    const episodes = [];

                    if (isPanLine) {
                        const panTasks = [];
                        $links.each((idx, a) => {
                            const $a = $(a);
                            const episodeName = $a.text().trim() || `第${idx + 1}集`;
                            const href = $a.attr("href") || "";
                            const playPageUrl = fixUrl(href);
                            panTasks.push(
                                (async () => {
                                    const panUrl = await extractPanUrlFromPage(playPageUrl);
                                    if (!panUrl) return null;

                                    const shareURL = normalizeShareUrl(panUrl);
                                    if (!isPanUrl(shareURL)) {
                                        return null;
                                    }

                                    const panInfo = await loadPanFiles(shareURL);
                                    const files = panInfo?.videos || [];

                                    if (!files.length) {
                                        const pushUrl = shareURL.startsWith("push://") ? shareURL : `push://${shareURL}`;
                                        const fid = `${videoId}#pan#${idx}`;
                                        const combinedId = `${pushUrl}|||${encodeMeta({ sid: String(videoId || ""), fid, v: title || "", e: episodeName })}`;
                                        return [{
                                            name: episodeName,
                                            playId: combinedId,
                                            _fid: fid,
                                            _rawName: episodeName
                                        }];
                                    }

                                    const seriesEpisodes = [];
                                    for (const file of files) {
                                        const fileId = getFileId(file);
                                        if (!fileId) continue;
                                        const fileName = getFileName(file) || episodeName;
                                        const filePlayId = `${shareURL}|${fileId}`;
                                        const fid = `${videoId}#pan#${fileId}`;
                                        const combinedId = `${filePlayId}|||${encodeMeta({ sid: String(videoId || ""), fid, v: title || "", e: fileName })}`;
                                        seriesEpisodes.push({
                                            name: fileName,
                                            playId: combinedId,
                                            _fid: fid,
                                            _rawName: fileName
                                        });
                                    }

                                    return seriesEpisodes.length ? seriesEpisodes : null;
                                })()
                            );
                        });

                        const panEpisodes = await Promise.all(panTasks);
                        panEpisodes.filter(Boolean).forEach((batch) => {
                            if (Array.isArray(batch)) {
                                batch.forEach((ep) => episodes.push(ep));
                            } else if (batch) {
                                episodes.push(batch);
                            }
                        });
                    } else {
                        $links.each((idx, a) => {
                            const $a = $(a);
                            const episodeName = $a.text().trim() || `第${idx + 1}集`;
                            const playId = $a.attr("href") || "";
                            const fid = `${videoId}#0#${episodes.length}`;
                            const combinedId = `${playId}|||${encodeMeta({ sid: String(videoId || ""), fid, v: title || "", e: episodeName })}`;
                            episodes.push({
                                name: episodeName,
                                playId: combinedId,
                                _fid: fid,
                                _rawName: episodeName
                            });
                        });
                    }

                    if (episodes.length > 0) {
                        playlistResults[index] = { name: sourceName, episodes: episodes };
                    }
                })()
            );
        });

        if (playlistTasks.length > 0) {
            await Promise.all(playlistTasks);
            for (const item of playlistResults) {
                if (item && item.episodes && item.episodes.length > 0) {
                    playSources.push(item);
                }
            }
        }

        logInfo(`视频标题: ${title}, 播放链接数: ${playSources.length}`);

        // 准备刮削候选项
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

        let scrapeData = null;
        let videoMappings = [];
        let scrapeType = "";

        // 执行刮削
        if (scrapeCandidates.length > 0) {
            try {
                const videoIdForScrape = String(videoId || "");
                const scrapingResult = await OmniBox.processScraping(videoIdForScrape, title || "", title || "", scrapeCandidates);
                logInfo(`刮削处理完成`, { resultLength: JSON.stringify(scrapingResult || {}).length });

                const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
                scrapeData = metadata?.scrapeData || null;
                videoMappings = metadata?.videoMappings || [];
                scrapeType = metadata?.scrapeType || "";
                logInfo("刮削元数据读取完成", { hasScrapeData: !!scrapeData, mappingCount: videoMappings.length, scrapeType });
            } catch (error) {
                logError("刮削处理失败", error);
            }
        }

        // 应用刮削结果
        for (const source of playSources) {
            for (const ep of source.episodes || []) {
                const mapping = videoMappings.find((m) => m?.fileId === ep._fid);
                if (!mapping) continue;
                const oldName = ep.name;
                const newName = buildScrapedEpisodeName(scrapeData, mapping, oldName);
                if (newName && newName !== oldName) {
                    ep.name = newName;
                    logInfo(`应用刮削后源文件名: ${oldName} -> ${newName}`);
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

        const vod = {
            vod_id: videoId,
            vod_name: title,
            vod_pic: pic,
            vod_content: desc,
            vod_play_sources: playSources.map((source) => ({
                name: source.name,
                episodes: (source.episodes || []).map((ep) => ({
                    name: ep.name,
                    playId: ep.playId,
                })),
            }))
        };

        // 应用刮削元数据
        if (scrapeData) {
            vod.vod_name = scrapeData.title || vod.vod_name;
            if (scrapeData.posterPath) {
                // 处理 TMDB 图片 URL (referer 自动从 URL 域名提取)
                vod.vod_pic = processImageUrl(`https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`, baseURL);
            }
            if (scrapeData.overview) {
                vod.vod_content = scrapeData.overview;
            }
            if (scrapeData.releaseDate) {
                vod.vod_year = String(scrapeData.releaseDate).substring(0, 4) || "";
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
            list: [vod]
        };
    } catch (e) {
        logError("详情获取失败", e);
        return { list: [] };
    }
}

// ========== 播放解析 (核心) ==========
/**
 * 播放解析
 * 支持：直接解密、嗅探、弹幕匹配
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

    let scrapedDanmuFileName = "";
    let scrapeType = "";
    try {
        const videoIdFromParam = params.vodId ? String(params.vodId) : "";
        const videoIdFromMeta = playMeta?.sid ? String(playMeta.sid) : "";
        const videoIdForScrape = videoIdFromParam || videoIdFromMeta;

        if (videoIdForScrape) {
            const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
            if (metadata && metadata.scrapeData) {
                const mapping = (metadata.videoMappings || []).find((m) => m?.fileId === playMeta?.fid);
                scrapeType = metadata.scrapeType || "";
                scrapedDanmuFileName = buildScrapedDanmuFileName(
                    metadata.scrapeData,
                    scrapeType,
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
        if (playId && playId.includes("|")) {
            const [rawShareURL, fileId] = playId.split("|");
            const shareURL = normalizeShareUrl(rawShareURL);
            if (shareURL && fileId) {
                try {
                    const playInfo = await OmniBox.getDriveVideoPlayInfo(shareURL, fileId, flag || "");
                    const urlList = Array.isArray(playInfo?.url) ? playInfo.url : [];
                    const urlsResult = urlList.map((item) => ({
                        name: item.name || "播放",
                        url: item.url
                    }));
                    return {
                        urls: urlsResult,
                        header: playInfo?.header || {},
                        parse: 0,
                        danmaku: playInfo?.danmaku || []
                    };
                } catch (error) {
                    logInfo(`网盘播放失败: ${error.message}`);
                }
            }
        }

        if (playId && playId.startsWith("push://")) {
            return {
                urls: [{ name: "网盘资源", url: playId }],
                parse: 0,
                header: {}
            };
        }

        if (isPanUrl(playId)) {
            const shareURL = normalizeShareUrl(playId);
            const pushUrl = shareURL.startsWith("push://") ? shareURL : `push://${shareURL}`;
            return {
                urls: [{ name: "网盘资源", url: pushUrl }],
                parse: 0,
                header: {}
            };
        }

        if (flag && isPanLineName(flag) && playId) {
            const shareURL = normalizeShareUrl(playId);
            const pushUrl = shareURL.startsWith("push://") ? shareURL : `push://${shareURL}`;
            return {
                urls: [{ name: "网盘资源", url: pushUrl }],
                parse: 0,
                header: {}
            };
        }

        const playPageUrl = fixUrl(playId);

        // 1. 请求播放页
        const html = await requestHtml(playPageUrl);

        // 2. 提取中间页 URL
        const urlMatch = html.match(/"url"\s*:\s*"(https:[^"]*?jx\.zxzj[^"]*?)"/);

        if (urlMatch && urlMatch[1]) {
            const targetUrl = urlMatch[1].replace(/\\/g, '');
            logInfo(`提取中间页 URL: ${targetUrl}`);

            // 3. 构造严格匹配的 Headers (关键!)
            const sniffHeaders = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Referer": host + "/",
                "Sec-Fetch-Dest": "iframe",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "same-site",
                "Upgrade-Insecure-Requests": "1"
            };

            // 4. 请求中间页获取源码
            try {
                const iframeHtml = await requestHtml(targetUrl, { headers: sniffHeaders });

                // 5. 提取 result_v2 并解密
                const v2Match = iframeHtml.match(/var\s+result_v2\s*=\s*(\{[\s\S]*?\});/);
                if (v2Match && v2Match[1]) {
                    const v2Json = JSON.parse(v2Match[1]);
                    const encryptedData = v2Json.data || v2Json.url;

                    if (encryptedData) {
                        const decrypted = DecryptTools.decrypt(encryptedData);
                        if (decrypted && decrypted.startsWith("http")) {
                            logInfo(`解密成功: ${decrypted.substring(0, 50)}...`);

                            // 弹幕匹配
                            let danmakuList = [];
                            if (DANMU_API && (vodName || params.vodName)) {
                                const finalVodName = vodName || params.vodName;
                                const finalEpisodeName = episodeName || params.episodeName || '';
                                const fileName = scrapedDanmuFileName || buildFileNameForDanmu(finalVodName, finalEpisodeName);

                                logInfo(`尝试匹配弹幕文件名: ${fileName}`);
                                if (fileName) {
                                    danmakuList = await matchDanmu(fileName);
                                }
                            }

                            const result = {
                                urls: [{ name: "极速直连", url: decrypted }],
                                parse: 0,
                                header: sniffHeaders
                            };

                            if (danmakuList && danmakuList.length > 0) {
                                result.danmaku = danmakuList;
                            }

                            return result;
                        }
                    }
                }
            } catch (innerErr) {
                logInfo(`中间页解析失败: ${innerErr.message}`);
            }

            // 6. 兜底方案：智能嗅探
            logInfo("尝试智能嗅探");
            const sniffRes = await sniffZxzjPlay(targetUrl);
            if (sniffRes) {
                // 弹幕匹配
                if (DANMU_API && (vodName || params.vodName)) {
                    const finalVodName = vodName || params.vodName;
                    const finalEpisodeName = episodeName || params.episodeName || '';
                    const fileName = scrapedDanmuFileName || buildFileNameForDanmu(finalVodName, finalEpisodeName);

                    logInfo(`尝试匹配弹幕文件名: ${fileName}`);
                    if (fileName) {
                        const danmakuList = await matchDanmu(fileName);
                        if (danmakuList && danmakuList.length > 0) {
                            sniffRes.danmaku = danmakuList;
                        }
                    }
                }
                return sniffRes;
            }
        }

    } catch (e) {
        logError("播放解析失败", e);
    }

    // 7. 最后的失败回退
    logInfo("使用回退方案");
    return {
        urls: [{ name: "解析失败", url: fixUrl(playId) }],
        parse: 1,
        header: baseHeaders
    };
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(7, "影视大全", function (module, exports, require) {
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

_load(8, "枝枝影视", function (module, exports, require) {
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

_load(9, "毒舌03", function (module, exports, require) {
// @name 毒舌03
// @author 梦
// @description 影视站：https://www.dushe03.com/ ，支持首页、分类、详情、搜索与播放
// @dependencies cheerio
// @version 1.0.8
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/毒舌03.js

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");
const crypto = require("crypto");

const BASE_URL = (process.env.DUSHE03_HOST || "https://www.dushe03.com").replace(/\/$/, "");
const UA = process.env.DUSHE03_UA || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";
const HOME_CACHE_TTL = Number(process.env.DUSHE03_HOME_CACHE_TTL || 900);
const CATEGORY_CACHE_TTL = Number(process.env.DUSHE03_CATEGORY_CACHE_TTL || 900);
const DETAIL_CACHE_TTL = Number(process.env.DUSHE03_DETAIL_CACHE_TTL || 1800);
const SEARCH_CACHE_TTL = Number(process.env.DUSHE03_SEARCH_CACHE_TTL || 600);
const PLAY_CACHE_TTL = Number(process.env.DUSHE03_PLAY_CACHE_TTL || 900);

const CATEGORY_CONFIG = [
  { id: "1", name: "电影" },
  { id: "2", name: "剧集" },
  { id: "3", name: "综艺" },
  { id: "4", name: "动漫" },
  { id: "6", name: "短剧" },
];

const CLASS_LIST = CATEGORY_CONFIG.map((item) => ({ type_id: item.id, type_name: item.name }));
const CATEGORY_SHOW_PATH = Object.fromEntries(CATEGORY_CONFIG.map((item) => [item.id, `/show/${item.id}------.html`]));
const STATIC_HOST = process.env.DUSHE03_STATIC_HOST || "https://vres.bavdxfg.cn";
const PIC_HEADERS = {
  Referer: `${BASE_URL}/`,
  Origin: BASE_URL,
  "User-Agent": UA,
};
const FILTERS = {
  "1": [
    { key: "type", name: "类型", init: "", value: [{ name: "全部", value: "" }, { name: "剧情", value: "剧情" }, { name: "爱情", value: "爱情" }, { name: "喜剧", value: "喜剧" }, { name: "动作", value: "动作" }, { name: "恐怖", value: "恐怖" }, { name: "科幻", value: "科幻" }, { name: "悬疑", value: "悬疑" }, { name: "惊悚", value: "惊悚" }, { name: "犯罪", value: "犯罪" }, { name: "冒险", value: "冒险" }, { name: "动画", value: "动画" }, { name: "奇幻", value: "奇幻" }, { name: "武侠", value: "武侠" }] },
    { key: "area", name: "地区", init: "", value: [{ name: "地区", value: "" }, { name: "大陆", value: "中国大陆" }, { name: "香港", value: "中国香港" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }, { name: "日本", value: "日本" }, { name: "法国", value: "法国" }, { name: "英国", value: "英国" }, { name: "德国", value: "德国" }, { name: "台湾", value: "中国台湾" }, { name: "泰国", value: "泰国" }, { name: "印度", value: "印度" }, { name: "其他", value: "其他" }] },
    { key: "lang", name: "语言", init: "", value: [{ name: "全部", value: "" }, { name: "国语", value: "国语" }, { name: "粤语", value: "粤语" }, { name: "英语", value: "英语" }, { name: "日语", value: "日语" }, { name: "韩语", value: "韩语" }, { name: "法语", value: "法语" }, { name: "其他", value: "其他" }] },
    { key: "year", name: "年份", init: "", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }, { name: "2021", value: "2021" }, { name: "2020", value: "2020" }, { name: "10年代", value: "2010_2019" }, { name: "00年代", value: "2000_2009" }, { name: "90年代", value: "1990_1999" }, { name: "80年代", value: "1980_1989" }, { name: "更早", value: "0_1979" }] },
    { key: "by", name: "排序", init: "3", value: [{ name: "综合", value: "1" }, { name: "最新", value: "2" }, { name: "最热", value: "3" }, { name: "评分", value: "4" }] },
  ],
  "2": [
    { key: "type", name: "类型", init: "", value: [{ name: "全部", value: "" }, { name: "剧情", value: "剧情" }, { name: "爱情", value: "爱情" }, { name: "喜剧", value: "喜剧" }, { name: "犯罪", value: "犯罪" }, { name: "悬疑", value: "悬疑" }, { name: "古装", value: "古装" }, { name: "动作", value: "动作" }, { name: "家庭", value: "家庭" }, { name: "惊悚", value: "惊悚" }, { name: "奇幻", value: "奇幻" }, { name: "美剧", value: "美剧" }, { name: "科幻", value: "科幻" }, { name: "历史", value: "历史" }, { name: "战争", value: "战争" }, { name: "韩剧", value: "韩剧" }, { name: "武侠", value: "武侠" }, { name: "言情", value: "言情" }, { name: "恐怖", value: "恐怖" }, { name: "冒险", value: "冒险" }, { name: "都市", value: "都市" }, { name: "职场", value: "职场" }] },
    { key: "area", name: "地区", init: "", value: [{ name: "地区", value: "" }, { name: "大陆", value: "中国大陆" }, { name: "香港", value: "中国香港" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }, { name: "日本", value: "日本" }, { name: "法国", value: "法国" }, { name: "英国", value: "英国" }, { name: "德国", value: "德国" }, { name: "台湾", value: "中国台湾" }, { name: "泰国", value: "泰国" }, { name: "印度", value: "印度" }, { name: "其他", value: "其他" }] },
    { key: "lang", name: "语言", init: "", value: [{ name: "全部", value: "" }, { name: "国语", value: "国语" }, { name: "粤语", value: "粤语" }, { name: "英语", value: "英语" }, { name: "日语", value: "日语" }, { name: "韩语", value: "韩语" }, { name: "法语", value: "法语" }, { name: "其他", value: "其他" }] },
    { key: "year", name: "年份", init: "", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }, { name: "2021", value: "2021" }, { name: "2020", value: "2020" }, { name: "10年代", value: "2010_2019" }, { name: "00年代", value: "2000_2009" }, { name: "90年代", value: "1990_1999" }, { name: "80年代", value: "1980_1989" }, { name: "更早", value: "0_1979" }] },
    { key: "by", name: "排序", init: "3", value: [{ name: "综合", value: "1" }, { name: "最新", value: "2" }, { name: "最热", value: "3" }, { name: "评分", value: "4" }] },
  ],
  "3": [
    { key: "type", name: "类型", init: "", value: [{ name: "全部", value: "" }, { name: "真人秀", value: "真人秀" }, { name: "脱口秀", value: "脱口秀" }, { name: "选秀", value: "选秀" }, { name: "美食", value: "美食" }, { name: "旅游", value: "旅游" }, { name: "晚会", value: "晚会" }, { name: "音乐", value: "音乐" }, { name: "纪实", value: "纪实" }] },
    { key: "area", name: "地区", init: "", value: [{ name: "地区", value: "" }, { name: "大陆", value: "中国大陆" }, { name: "香港", value: "中国香港" }, { name: "韩国", value: "韩国" }, { name: "美国", value: "美国" }, { name: "日本", value: "日本" }, { name: "台湾", value: "中国台湾" }, { name: "泰国", value: "泰国" }, { name: "其他", value: "其他" }] },
    { key: "lang", name: "语言", init: "", value: [{ name: "全部", value: "" }, { name: "国语", value: "国语" }, { name: "粤语", value: "粤语" }, { name: "英语", value: "英语" }, { name: "日语", value: "日语" }, { name: "韩语", value: "韩语" }, { name: "其他", value: "其他" }] },
    { key: "year", name: "年份", init: "", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }, { name: "2021", value: "2021" }, { name: "2020", value: "2020" }, { name: "10年代", value: "2010_2019" }, { name: "00年代", value: "2000_2009" }, { name: "90年代", value: "1990_1999" }, { name: "80年代", value: "1980_1989" }, { name: "更早", value: "0_1979" }] },
    { key: "by", name: "排序", init: "3", value: [{ name: "综合", value: "1" }, { name: "最新", value: "2" }, { name: "最热", value: "3" }, { name: "评分", value: "4" }] },
  ],
  "4": [
    { key: "type", name: "类型", init: "", value: [{ name: "全部", value: "" }, { name: "热血", value: "热血" }, { name: "搞笑", value: "搞笑" }, { name: "冒险", value: "冒险" }, { name: "奇幻", value: "奇幻" }, { name: "恋爱", value: "恋爱" }, { name: "校园", value: "校园" }, { name: "科幻", value: "科幻" }, { name: "战斗", value: "战斗" }] },
    { key: "area", name: "地区", init: "", value: [{ name: "地区", value: "" }, { name: "大陆", value: "中国大陆" }, { name: "日本", value: "日本" }, { name: "美国", value: "美国" }, { name: "韩国", value: "韩国" }, { name: "其他", value: "其他" }] },
    { key: "lang", name: "语言", init: "", value: [{ name: "全部", value: "" }, { name: "国语", value: "国语" }, { name: "日语", value: "日语" }, { name: "英语", value: "英语" }, { name: "其他", value: "其他" }] },
    { key: "year", name: "年份", init: "", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }, { name: "2021", value: "2021" }, { name: "2020", value: "2020" }, { name: "10年代", value: "2010_2019" }, { name: "00年代", value: "2000_2009" }, { name: "90年代", value: "1990_1999" }, { name: "80年代", value: "1980_1989" }, { name: "更早", value: "0_1979" }] },
    { key: "by", name: "排序", init: "3", value: [{ name: "综合", value: "1" }, { name: "最新", value: "2" }, { name: "最热", value: "3" }, { name: "评分", value: "4" }] },
  ],
  "6": [
    { key: "type", name: "类型", init: "", value: [{ name: "全部", value: "" }, { name: "爱情", value: "爱情" }, { name: "都市", value: "都市" }, { name: "逆袭", value: "逆袭" }, { name: "悬疑", value: "悬疑" }, { name: "古装", value: "古装" }, { name: "穿越", value: "穿越" }, { name: "甜宠", value: "甜宠" }] },
    { key: "area", name: "地区", init: "", value: [{ name: "地区", value: "" }, { name: "大陆", value: "中国大陆" }, { name: "台湾", value: "中国台湾" }, { name: "香港", value: "中国香港" }, { name: "其他", value: "其他" }] },
    { key: "lang", name: "语言", init: "", value: [{ name: "全部", value: "" }, { name: "国语", value: "国语" }, { name: "粤语", value: "粤语" }, { name: "其他", value: "其他" }] },
    { key: "year", name: "年份", init: "", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }, { name: "2022", value: "2022" }, { name: "2021", value: "2021" }, { name: "2020", value: "2020" }, { name: "10年代", value: "2010_2019" }, { name: "00年代", value: "2000_2009" }, { name: "90年代", value: "1990_1999" }, { name: "80年代", value: "1980_1989" }, { name: "更早", value: "0_1979" }] },
    { key: "by", name: "排序", init: "3", value: [{ name: "综合", value: "1" }, { name: "最新", value: "2" }, { name: "最热", value: "3" }, { name: "评分", value: "4" }] },
  ],
};

let cdndefendCookie = "";

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

function absUrl(raw = "") {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/vod1/")) {
    return new URL(value, `${STATIC_HOST}/`).toString();
  }
  try {
    return new URL(value, `${BASE_URL}/`).toString();
  } catch (_) {
    return value;
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

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function encodeSegment(value) {
  return encodeURIComponent(String(value || "").trim());
}

function summarizeImageCandidates($, root, selectors = []) {
  const scope = root && typeof root.find === "function" ? root : $(root);
  const summary = [];
  for (const selector of selectors) {
    const nodes = scope.find(selector).toArray().slice(0, 3);
    for (const el of nodes) {
      const wrapped = $(el);
      summary.push({
        selector,
        self: {
          dataOriginal: String(wrapped.attr("data-original") || ""),
          dataSrc: String(wrapped.attr("data-src") || ""),
          src: String(wrapped.attr("src") || ""),
        },
        parentA: {
          dataOriginal: String(wrapped.parent("a").attr("data-original") || ""),
          dataSrc: String(wrapped.parent("a").attr("data-src") || ""),
          src: String(wrapped.parent("a").attr("src") || ""),
        },
        closestA: {
          dataOriginal: String(wrapped.closest("a").attr("data-original") || ""),
          dataSrc: String(wrapped.closest("a").attr("data-src") || ""),
          src: String(wrapped.closest("a").attr("src") || ""),
        },
      });
      if (summary.length >= 4) return summary;
    }
  }
  return summary;
}

function pickImage($, root, selectors = []) {
  const scope = root && typeof root.find === "function" ? root : $(root);
  for (const selector of selectors) {
    const nodes = scope.find(selector).toArray();
    for (const el of nodes) {
      const wrapped = $(el);
      const candidateGroups = [
        [wrapped.attr("data-original"), wrapped.attr("data-src"), wrapped.attr("src"), wrapped.attr("data-url"), wrapped.attr("data-lazy-src"), wrapped.attr("original")],
        [wrapped.parent("a").attr("data-original"), wrapped.parent("a").attr("data-src"), wrapped.parent("a").attr("src")],
        [wrapped.closest("a").attr("data-original"), wrapped.closest("a").attr("data-src"), wrapped.closest("a").attr("src")],
      ];
      for (const candidates of candidateGroups) {
        for (const raw of candidates.map((item) => String(item || "").trim()).filter(Boolean)) {
          if (/logo_placeholder|noneCoverImg|blank\.gif|base64|avatar\.png|empty-box/i.test(raw)) continue;
          return raw;
        }
      }
    }
  }
  return "";
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

function dedupeEpisodes(episodes) {
  const out = [];
  const seen = new Set();
  for (const ep of Array.isArray(episodes) ? episodes : []) {
    const name = cleanText(ep?.name || "");
    const playId = String(ep?.playId || "").trim();
    const key = `${name}|${playId}`;
    if (!name || !playId || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...ep, name, playId });
  }
  return out;
}

function encodeSearchToken(keyword) {
  return "";
}

function extractSearchToken(html) {
  const text = String(html || "");
  const match = text.match(/<input[^>]+name=["']t["'][^>]*value=["']([^"']+)["']/i);
  return decodeHtmlEntities(match?.[1] || "").trim();
}

function getCdndefendCookie(challengeHtml = "") {
  if (cdndefendCookie) return cdndefendCookie;
  const text = String(challengeHtml || "");
  const prefix = (
    process.env.DUSHE03_CDNDEFEND_PREFIX
    || (text.match(/\['([A-F0-9]{40})','cdndefend_js_cookie='/i)?.[1])
    || (text.match(/const\s+[a-zA-Z0-9_$]+\s*=\s*\['([A-F0-9]{40})','cdndefend_js_cookie='/i)?.[1])
    || ""
  ).trim();
  if (!prefix) return "";
  const idx = parseInt(prefix[0], 16);
  let counter = 0;
  while (counter < 5_000_000) {
    const candidate = `${prefix}${counter}`;
    const digest = crypto.createHash("sha1").update(candidate).digest();
    if (digest[idx] === 0xb0 && digest[idx + 1] === 0x0b) {
      cdndefendCookie = candidate;
      return candidate;
    }
    counter += 1;
  }
  return "";
}

async function requestText(url, options = {}) {
  const method = options.method || "GET";
  const retry850 = options.retry850 !== false;
  await OmniBox.log("info", `[毒舌03][request] ${method} ${url}`);
  const headers = {
    "User-Agent": UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: options.referer || `${BASE_URL}/`,
    "Upgrade-Insecure-Requests": "1",
    ...(options.headers || {}),
  };
  const res = await OmniBox.request(url, {
    method,
    headers,
    body: options.body,
    timeout: options.timeout || 20000,
  });
  const statusCode = Number(res?.statusCode || 0);
  const body = res?.body;
  const text = typeof body === "string" ? body : Buffer.isBuffer(body) ? body.toString() : String(body || "");

  if (statusCode === 850 && retry850) {
    const cookie = getCdndefendCookie(text);
    if (cookie) {
      const retryHeaders = {
        ...headers,
        Cookie: [headers.Cookie, `cdndefend_js_cookie=${cookie}`].filter(Boolean).join("; "),
      };
      await OmniBox.log("warn", `[毒舌03][request] HTTP 850, retry with cdndefend cookie: ${url}`);
      const retryRes = await OmniBox.request(url, {
        method,
        headers: retryHeaders,
        body: options.body,
        timeout: options.timeout || 20000,
      });
      const retryStatus = Number(retryRes?.statusCode || 0);
      const retryBody = retryRes?.body;
      const retryText = typeof retryBody === "string" ? retryBody : Buffer.isBuffer(retryBody) ? retryBody.toString() : String(retryBody || "");
      if (retryStatus === 200) return retryText;
      throw new Error(`HTTP ${retryStatus || 850} @ ${url}`);
    }
  }

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

function extractYearFromTitle(title) {
  const match = String(title || "").match(/^(.*?)\s*-\s*.*?(\d{4})年最新/);
  return match?.[2] || "";
}

function buildCard($, el, options = {}) {
  const node = $(el);
  const anchor = node.find("a[href]").first();
  const href = anchor.attr("href") || "";
  const imageNodes = node.find("img");
  const images = imageNodes.toArray();
  const poster = images.length > 1 ? $(images[1]) : $(images[0] || []);
  const title = cleanText(
    node.find(".v-item-title:not([style*='display: none'])").first().text()
      || poster.attr("alt")
      || anchor.attr("title")
      || ""
  );
  const picSelectors = [
    "a[href]",
    ".v-item-cover img:not(#noneCoverImg)",
    ".v-item-main img:not(#noneCoverImg)",
    "img:not(#noneCoverImg)",
  ];
  const pic = pickImage($, node, picSelectors);
  if (options.logImageDebug) {
    const debug = summarizeImageCandidates($, node, picSelectors);
    options.logImageDebug({ title, href, pic, debug });
  }
  const remarks = cleanText(node.find(".v-item-bottom span").first().text());
  const score = cleanText(node.find(".v-item-top-left span").first().text());
  return {
    vod_id: absUrl(href),
    vod_name: title,
    vod_pic: absUrl(pic),
    vod_pic_headers: { ...PIC_HEADERS },
    vod_remarks: remarks || score,
    vod_douban_score: score.replace(/^豆瓣[:：]?/, ""),
  };
}

function parseModuleList(html, options = {}) {
  const $ = cheerio.load(html);
  const list = [];
  $(".module-item").each((_, el) => list.push(buildCard($, el, options)));
  return dedupeVodList(list).filter((item) => item.vod_id && item.vod_name);
}

function parseSearchList(html) {
  const $ = cheerio.load(html);
  const list = [];
  $(".search-result-item[href]").each((_, el) => {
    const node = $(el);
    const href = node.attr("href") || "";
    const title = cleanText(node.find(".title").first().text());
    const pic = pickImage($, node, [
      ".search-result-item-pic img:not(#noneCoverImg)",
      ".search-result-item-side img:not(#noneCoverImg)",
      "img:not(#noneCoverImg)",
    ]);
    const tags = node.find(".tags span").map((__, span) => cleanText($(span).text())).get().filter(Boolean);
    const actor = cleanText(node.find(".actors span").first().text());
    const desc = cleanText(node.find(".desc").first().text());
    list.push({
      vod_id: absUrl(href),
      vod_name: title,
      vod_pic: absUrl(pic),
      vod_pic_headers: { ...PIC_HEADERS },
      vod_remarks: tags.join("/") || actor,
      vod_actor: actor,
      vod_content: desc,
    });
  });
  return dedupeVodList(list).filter((item) => item.vod_id && item.vod_name);
}

function parsePageCount(html, currentPage) {
  const text = String(html || "");
  let pagecount = Math.max(1, Number(currentPage || 1));
  const patterns = [
    /href=["'][^"']*channel\/\d+\.html\?page=(\d+)/gi,
    /href=["'][^"']*channel\/\d+-(\d+)\.html["']/gi,
    /href=["'][^"']*search\?[^"']*page=(\d+)/gi,
    /href=["'][^"']*show\/\d+-[^"']*-([1-4])-(\d+)\.html["']/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const n = Number(match[2] || match[1] || 1);
      if (Number.isFinite(n)) pagecount = Math.max(pagecount, n);
    }
  }
  return pagecount;
}

function parseDetailRows($) {
  const map = {};
  $(".detail-info-row").each((_, row) => {
    const label = cleanText($(row).find(".detail-info-row-side").first().text()).replace(/[：:]$/, "");
    const value = cleanText($(row).find(".detail-info-row-main").first().text());
    if (label && value) map[label] = value;
  });
  return map;
}

function parseDetailSources($) {
  const sourceNames = $(".source-list-box-main .source-item .source-item-label")
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean);
  const episodeLists = $(".episode-list-box-main .episode-list").toArray();
  const sources = [];
  episodeLists.forEach((listNode, index) => {
    const episodes = [];
    $(listNode).find("a[href]").each((__, a) => {
      const href = $(a).attr("href") || "";
      const name = cleanText($(a).text());
      if (!href || !name) return;
      episodes.push({ name, playId: absUrl(href) });
    });
    if (episodes.length) {
      sources.push({
        name: sourceNames[index] || `线路${index + 1}`,
        episodes: dedupeEpisodes(episodes),
      });
    }
  });
  return sources;
}

function parseDetail(html, detailUrl, options = {}) {
  const $ = cheerio.load(html);
  const title = cleanText($(".detail-title strong").eq(1).text() || $("title").text().replace(/-.*$/, ""));
  const picSelectors = [
    "img:not(#noneCoverImg)",
    "img[data-original]",
    "img[data-src]",
    "img[src]",
  ];
  const pic = absUrl(pickImage($, $(".detail-box-side").first(), picSelectors));
  if (options.logImageDebug) {
    options.logImageDebug({
      title,
      href: detailUrl,
      pic,
      debug: summarizeImageCandidates($, $(".detail-box-side").first(), picSelectors),
    });
  }
  const tags = $(".detail-tags .detail-tags-item").map((_, el) => cleanText($(el).text())).get().filter(Boolean);
  const meta = parseDetailRows($);
  const desc = cleanText($(".detail-desc").first().text() || $("meta[name='description']").attr("content") || "");
  const remarks = meta["备注"] || meta["状态"] || "";
  const vod_play_sources = parseDetailSources($);
  return {
    vod_id: String(detailUrl || ""),
    vod_name: title,
    vod_pic: pic,
    vod_pic_headers: { ...PIC_HEADERS },
    vod_remarks: remarks,
    vod_year: meta["首映"] ? String(meta["首映"]).slice(0, 4) : tags.find((tag) => /^\d{4}$/.test(tag)) || "",
    vod_area: tags.find((tag) => /中国|美国|日本|韩国|英国|香港|台湾|泰国|法国|德国|印度/.test(tag)) || "",
    type_name: tags.filter((tag) => !/^\d{4}$/.test(tag) && !/中国|美国|日本|韩国|英国|香港|台湾|泰国|法国|德国|印度/.test(tag)).join(","),
    vod_actor: meta["演员"] || "",
    vod_director: meta["导演"] || "",
    vod_lang: meta["语言"] || "",
    vod_content: desc,
    vod_play_sources,
  };
}

function decodeUnicodeEscapes(value) {
  return String(value || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function resolvePlayUrl(rawUrl) {
  let playUrl = decodeUnicodeEscapes(String(rawUrl || "")).replace(/\\\//g, "/").replace(/\\/g, "").trim();
  if (!playUrl) return "";
  if (/^https?:\/\//i.test(playUrl)) return playUrl;
  if (playUrl.startsWith("//")) return `https:${playUrl}`;
  return absUrl(playUrl);
}

function extractPlaySource(html) {
  const text = String(html || "");
  const match = text.match(/const\s+playSource\s*=\s*\{([\s\S]*?)\};/i);
  if (!match) return { url: "", type: "" };
  const body = decodeUnicodeEscapes(match[1]);
  const urlMatch = body.match(/['"]src['"]\s*:\s*['"]([^'"]+)['"]/i);
  const typeMatch = body.match(/['"]type['"]\s*:\s*['"]([^'"]+)['"]/i);
  return {
    url: resolvePlayUrl(urlMatch?.[1] || ""),
    type: decodeUnicodeEscapes(typeMatch?.[1] || ""),
  };
}

async function resolvePlayPage(playPageUrl, referer) {
  const html = await requestText(playPageUrl, { referer });
  const source = extractPlaySource(html);
  if (source.url) return source;
  return { url: "", type: "" };
}

async function trySniffVideo(sniffUrl, headers = {}) {
  if (!sniffUrl || typeof OmniBox.sniffVideo !== "function") return null;
  try {
    await OmniBox.log("info", `[毒舌03][play] sniffVideo start url=${sniffUrl} headers=${JSON.stringify(headers)}`);
    const sniffed = await OmniBox.sniffVideo(sniffUrl, headers);
    await OmniBox.log("info", `[毒舌03][play] sniffVideo result=${JSON.stringify(sniffed || null)}`);
    if (sniffed?.url) {
      return {
        parse: 0,
        url: sniffed.url,
        urls: [{ name: "嗅探线路", url: sniffed.url }],
        header: sniffed.header || headers,
      };
    }
  } catch (e) {
    await OmniBox.log("warn", `[毒舌03][play] sniffVideo failed: ${e.message || e}`);
  }
  return null;
}

function buildAppSniffFallback(sniffUrl, headers = {}) {
  return {
    parse: 1,
    url: sniffUrl,
    urls: [{ name: "嗅探线路", url: sniffUrl }],
    header: headers,
  };
}

function buildShowUrl(tid, ext = {}) {
  const type = encodeSegment(ext.type || "");
  const area = encodeSegment(ext.area || "");
  const lang = encodeSegment(ext.lang || "");
  const year = encodeSegment(ext.year || "");
  const by = encodeSegment(ext.by || "3");
  const page = Math.max(1, Number(ext.page || 1));
  return `${BASE_URL}/show/${encodeURIComponent(String(tid || "1"))}-${type}-${area}-${lang}-${year}-${by}-${page}.html`;
}

async function home() {
  try {
    const html = await getCachedText("dushe03:home", HOME_CACHE_TTL, () => requestText(`${BASE_URL}/`));
    let imageDebugLogged = 0;
    const list = parseModuleList(html, {
      logImageDebug: ({ title, href, pic, debug }) => {
        if (imageDebugLogged >= 2) return;
        imageDebugLogged += 1;
        OmniBox.log("info", `[毒舌03][image][home] title=${title} href=${href} picked=${pic} abs=${absUrl(pic)} headers=${JSON.stringify(PIC_HEADERS)} debug=${JSON.stringify(debug)}`);
      },
    }).slice(0, 24);
    await OmniBox.log("info", `[毒舌03][home] count=${list.length}`);
    return { class: CLASS_LIST, filters: FILTERS, list };
  } catch (e) {
    await OmniBox.log("error", `[毒舌03][home] failed: ${e.message || e}`);
    return { class: CLASS_LIST, filters: FILTERS, list: [] };
  }
}

async function category(params = {}) {
  try {
    const tid = String(params.type_id || params.categoryId || params.tid || "1");
    const page = Math.max(1, Number(params.page || params.pg || 1));
    const extend = params.filters || params.extend || params.ext || {};
    const hasFilter = ["type", "area", "lang", "year"].some((key) => String(extend[key] || "").length > 0) || String(extend.by || "") !== "";
    const url = hasFilter || page > 1
      ? buildShowUrl(tid, { ...extend, by: extend.by || "3", page })
      : `${BASE_URL}${CATEGORY_SHOW_PATH[tid] || `/channel/${encodeURIComponent(tid)}.html`}`;
    const html = await getCachedText(`dushe03:category:${tid}:${JSON.stringify(extend)}:${page}`, CATEGORY_CACHE_TTL, () => requestText(url));
    let imageDebugLogged = 0;
    const list = parseModuleList(html, {
      logImageDebug: ({ title, href, pic, debug }) => {
        if (imageDebugLogged >= 2) return;
        imageDebugLogged += 1;
        OmniBox.log("info", `[毒舌03][image][category] title=${title} href=${href} picked=${pic} abs=${absUrl(pic)} headers=${JSON.stringify(PIC_HEADERS)} debug=${JSON.stringify(debug)}`);
      },
    });
    const pagecount = parsePageCount(html, page);
    await OmniBox.log("info", `[毒舌03][category] tid=${tid} page=${page} filters=${JSON.stringify(extend)} url=${url.replace(BASE_URL, "")} count=${list.length} pagecount=${pagecount}`);
    return {
      page,
      pagecount,
      limit: list.length,
      total: list.length,
      filters: FILTERS[tid] || [],
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[毒舌03][category] failed: ${e.message || e}`);
    return {
      page: Number(params.page || params.pg || 1) || 1,
      pagecount: 1,
      limit: 0,
      total: 0,
      filters: FILTERS[String(params.type_id || params.categoryId || params.tid || "1")] || [],
      list: [],
    };
  }
}

async function detail(params = {}) {
  try {
    const vodId = absUrl(params.vod_id || params.videoId || params.id || "");
    if (!vodId) return { list: [] };
    const html = await getCachedText(`dushe03:detail:${vodId}`, DETAIL_CACHE_TTL, () => requestText(vodId));
    const vod = parseDetail(html, vodId, {
      logImageDebug: ({ title, href, pic, debug }) => {
        OmniBox.log("info", `[毒舌03][image][detail] title=${title} href=${href} picked=${pic} abs=${absUrl(pic)} headers=${JSON.stringify(PIC_HEADERS)} debug=${JSON.stringify(debug)}`);
      },
    });
    await OmniBox.log("info", `[毒舌03][detail] vod=${vod.vod_name || vodId} sources=${vod.vod_play_sources?.length || 0}`);
    return { list: [vod] };
  } catch (e) {
    await OmniBox.log("error", `[毒舌03][detail] failed: ${e.message || e}`);
    return { list: [] };
  }
}

async function search(params = {}) {
  try {
    const wd = String(params.wd || params.keyword || "").trim();
    const page = Math.max(1, Number(params.page || 1));
    if (!wd) return { page, pagecount: 1, limit: 0, total: 0, list: [] };
    const homeHtml = await getCachedText("dushe03:home", HOME_CACHE_TTL, () => requestText(`${BASE_URL}/`));
    const token = encodeURIComponent(extractSearchToken(homeHtml) || encodeSearchToken(wd));
    const url = page > 1
      ? `${BASE_URL}/search?k=${encodeURIComponent(wd)}&t=${token}&page=${page}`
      : `${BASE_URL}/search?k=${encodeURIComponent(wd)}&t=${token}`;
    const html = await getCachedText(`dushe03:search:${wd}:${page}`, SEARCH_CACHE_TTL, () => requestText(url, { referer: `${BASE_URL}/` }));
    const list = parseSearchList(html);
    const pagecount = parsePageCount(html, page);
    await OmniBox.log("info", `[毒舌03][search] wd=${wd} page=${page} count=${list.length}`);
    return {
      page,
      pagecount,
      limit: list.length,
      total: list.length,
      list,
    };
  } catch (e) {
    await OmniBox.log("error", `[毒舌03][search] failed: ${e.message || e}`);
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

    const absolutePlayId = absUrl(playId);
    const sniffHeaders = { "User-Agent": UA, Referer: absolutePlayId || `${BASE_URL}/`, Origin: BASE_URL };
    const cacheKey = `dushe03:play:${playId}`;
    const resolved = await getCachedText(cacheKey, PLAY_CACHE_TTL, async () => {
      if (/\/play\//.test(absolutePlayId)) {
        const source = await resolvePlayPage(absolutePlayId, `${BASE_URL}/`);
        return JSON.stringify({ ...source, pageUrl: absolutePlayId });
      }
      if (/\/detail\//.test(absolutePlayId)) {
        const detailHtml = await requestText(absolutePlayId);
        const vod = parseDetail(detailHtml, absolutePlayId);
        const first = vod?.vod_play_sources?.[0]?.episodes?.[0]?.playId || "";
        if (first && first !== absolutePlayId) {
          if (/\.(m3u8|mp4)(\?|#|$)/i.test(first)) return JSON.stringify({ url: resolvePlayUrl(first), type: "", pageUrl: absolutePlayId });
          if (/\/play\//.test(first)) {
            const source = await resolvePlayPage(first, absolutePlayId);
            return JSON.stringify({ ...source, pageUrl: absUrl(first) });
          }
          return JSON.stringify({ url: first, type: "", pageUrl: absolutePlayId });
        }
      }
      return JSON.stringify({ url: "", type: "", pageUrl: absolutePlayId });
    });

    const parsed = (() => {
      try {
        return JSON.parse(String(resolved || "{}"));
      } catch (_) {
        return { url: String(resolved || ""), pageUrl: absolutePlayId };
      }
    })();

    if (parsed?.url) {
      const url = resolvePlayUrl(parsed.url);
      const pageUrl = absUrl(parsed.pageUrl || absolutePlayId);
      const directHeaders = /\.(m3u8|mp4)(\?|#|$)/i.test(url) ? { Referer: pageUrl || `${BASE_URL}/`, Origin: BASE_URL, "User-Agent": UA } : {};
      await OmniBox.log("info", `[毒舌03][play] resolved type=${parsed.type || "unknown"} url=${url} pageUrl=${pageUrl}`);
      if (/\.(m3u8|mp4)(\?|#|$)/i.test(url)) {
        return { parse: 0, url, urls: [{ name: "播放", url }], header: directHeaders };
      }
      const sniffResult = await trySniffVideo(url, { ...sniffHeaders, Referer: pageUrl || url, Origin: BASE_URL });
      if (sniffResult) return sniffResult;
      await OmniBox.log("warn", `[毒舌03][play] sdk sniff failed, fallback parse=1 url=${url}`);
      return buildAppSniffFallback(url, { ...sniffHeaders, Referer: pageUrl || url, Origin: BASE_URL });
    }

    const sniffResult = await trySniffVideo(absolutePlayId, sniffHeaders);
    if (sniffResult) return sniffResult;

    await OmniBox.log("warn", `[毒舌03][play] final fallback parse=1 url=${absolutePlayId}`);
    return buildAppSniffFallback(absolutePlayId, sniffHeaders);
  } catch (e) {
    await OmniBox.log("error", `[毒舌03][play] failed: ${e.message || e}`);
    return { parse: 0, url: "", urls: [], header: {} };
  }
}

});

_load(10, "毒舌影视", function (module, exports, require) {
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

_load(11, "热播", function (module, exports, require) {
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

_load(12, "电影天堂", function (module, exports, require) {
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
