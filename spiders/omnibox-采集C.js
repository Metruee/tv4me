// @name 影视采集C(合并11源)
// @version 2.20261030.1
// @description 合并可用采集站 11 个
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

_load(3, "小黑米", function (module, exports, require) {
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

_load(4, "影猫仓库", function (module, exports, require) {
// @name 影猫仓库
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持，并发：安全
// @description 03 + 开心 + 真狼 (并发解析)
// @dependencies: axios, crypto, cheerio, http, https
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/影猫仓库.js

const axios = require("axios");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");
const crypto = require("crypto");
const http = require("http");
const https = require("https");

// ==================== 全局配置 ====================
const HOST = "https://www.ymck.pro";
const PAGE_LIMIT = 20;
const DANMU_API = process.env.DANMU_API || "";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
  "Referer": `${HOST}/`,
};

const axiosInstance = axios.create({ 
    timeout: 15000,
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false })
});

// ==================== 日志工具 ====================
const logInfo = (message, data = null) => {
  OmniBox.log("info", `[影猫] ${message}${data ? ': ' + JSON.stringify(data) : ''}`);
};
const logWarn = (message, error = null) => {
  OmniBox.log("warn", `[影猫] ⚠️ ${message}${error ? ': ' + (error.message || error) : ''}`);
};
const logError = (message, error) => {
  OmniBox.log("error", `[影猫] ❌ ${message}: ${error?.message || error}`);
};

// ==================== 辅助工具函数 ====================
function d64(text) {
  try { return Buffer.from(String(text || ""), "base64").toString("utf8"); } catch { return ""; }
}

const encodeMeta = (obj) => {
  try { return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64"); } catch { return ""; }
};
const decodeMeta = (str) => {
  try { return JSON.parse(Buffer.from(str || "", "base64").toString("utf8")); } catch { return {}; }
};

function safeDecode(str) {
  try { return decodeURIComponent(str); } catch (e) { return unescape(str); }
}

function toAbsUrl(url, base = HOST) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function fetchWithCookieRedirect(url, customHeaders = {}, timeoutMs = 4000) {
  let headers = { "User-Agent": DEFAULT_HEADERS["User-Agent"], ...customHeaders };
  
  let res = await axiosInstance.get(url, {
    headers: headers,
    timeout: timeoutMs,
    maxRedirects: 0,
    validateStatus: status => status >= 200 && status < 400
  });

  if (res.status === 301 || res.status === 302) {
    const cookies = res.headers['set-cookie'];
    const location = res.headers['location'];
    
    let baseUrl = url;
    try { baseUrl = new URL(url).origin; } catch (e) {}
    const nextUrl = location ? toAbsUrl(location, baseUrl) : url;
    
    if (cookies) {
      headers["Cookie"] = cookies.map(c => c.split(';')[0]).join('; ');
    }
    res = await axiosInstance.get(nextUrl, { headers: headers, timeout: timeoutMs, maxRedirects: 0 });
  }
  return res;
}

// ==================== 刮削与弹幕辅助模块 ====================
const RE_CLEAN_1 = /4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]|1280x720|1920x1080/g;
const RE_CLEAN_2 = /[hH]\.?26[45]/g;
const RE_CLEAN_3 = /BluRay|WEB-DL|HDR|REMUX/gi;
const RE_CLEAN_4 = /\.mp4|\.mkv|\.avi|\.flv/gi;
const RE_SE = /[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i;
const RE_CN = /第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/;
const RE_EP = /\b(?:EP|E)[-._\s]*(\d{1,3})\b/i;
const RE_STANDALONE = /(?:^|[\s\-\._\[\]])(\d{1,3})(?![0-9pP])/g;

function preprocessTitle(title) {
    if (!title) return "";
    return title
        .replace(RE_CLEAN_1, " ")
        .replace(RE_CLEAN_2, " ")
        .replace(RE_CLEAN_3, " ")
        .replace(RE_CLEAN_4, " ");
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
    const seMatch = processedTitle.match(RE_SE);
    if (seMatch) return seMatch[1];
    const cnMatch = processedTitle.match(RE_CN);
    if (cnMatch) return String(chineseToArabic(cnMatch[1]));
    const epMatch = processedTitle.match(RE_EP);
    if (epMatch) return epMatch[1];
    const standaloneMatches = processedTitle.match(RE_STANDALONE);
    if (standaloneMatches) {
        const candidates = standaloneMatches.map(m => m.match(/\d+/)[0]).filter(n => parseInt(n) > 0 && parseInt(n) < 300);
        if (candidates.length > 0) return candidates[0];
    }
    return "";
}

function extractSeason(title) {
    if (!title) return 1;
    const cnMatch = title.match(/第\s*([零一二三四五六七八九十0-9]+)\s*季/);
    if (cnMatch) return chineseToArabic(cnMatch[1]);
    const enMatch = title.match(/Season\s*(\d+)/i) || title.match(/S(\d+)/i);
    if (enMatch) return parseInt(enMatch[1]);
    return 1;
}

function buildFileNameForDanmu(vodName, episodeTitle, seasonNum, episodeNum) {
    if (!vodName) return "";
    if (!episodeTitle || episodeTitle === '正片' || episodeTitle === '播放') return vodName;
    
    let s = seasonNum > 0 ? seasonNum : 1;
    let e = episodeNum;

    if (e === undefined || e === null) {
        const digits = extractEpisode(episodeTitle);
        if (digits) e = parseInt(digits, 10);
    }

    if (e > 0) {
        const sStr = s < 10 ? `S0${s}` : `S${s}`;
        const eStr = e < 10 ? `E0${e}` : `E${e}`;
        return `${vodName} ${sStr}${eStr}`;
    }
    return vodName;
}

const buildScrapedEpisodeName = (scrapeData, mapping, originalName) => {
    if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
        return originalName;
    }
    if (mapping.episodeName) {
        return `${mapping.episodeNumber}.${mapping.episodeName}`;
    }
    if (scrapeData && Array.isArray(scrapeData.episodes)) {
        const hit = scrapeData.episodes.find(
            ep => ep.episodeNumber === mapping.episodeNumber && ep.seasonNumber === mapping.seasonNumber
        );
        if (hit?.name) {
            return `${hit.episodeNumber}.${hit.name}`;
        }
    }
    return originalName;
};

async function matchDanmu(fileName) {
    if (!DANMU_API || !fileName) return [];
    try {
        const matchUrl = `${DANMU_API}/api/v2/match`;
        const response = await OmniBox.request(matchUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": DEFAULT_HEADERS["User-Agent"] },
            body: JSON.stringify({ fileName: fileName }),
        });
        if (response.statusCode !== 200) return [];
        const matchData = JSON.parse(response.body);
        if (!matchData.isMatched || !matchData.matches || matchData.matches.length === 0) return [];
        
        const firstMatch = matchData.matches[0];
        const episodeId = firstMatch.episodeId;
        const danmakuName = firstMatch.animeTitle && firstMatch.episodeTitle ? `${firstMatch.animeTitle} - ${firstMatch.episodeTitle}` : (firstMatch.animeTitle || firstMatch.episodeTitle || "弹幕");
        
        if (!episodeId) return [];
        return [{ name: danmakuName, url: `${DANMU_API}/api/v2/comment/${episodeId}?format=xml` }];
    } catch (error) {
        return [];
    }
}

// ==================== 详情页并发解析策略 ====================

async function parse03yySource(url) {
  const res = await fetchWithCookieRedirect(url, { "Referer": "https://www.03yy.live/" }, 4000);
  const $$ = cheerio.load(res.data);
  const tabs = [];
  const sources = [];
  $$("#playlist li").each((_, el) => { tabs.push($$(el).text().replace(/[\uE000-\uF8FF]/g, '').trim()); });

  $$(".play-box .play_list").each((index, el) => {
    const episodes = [];
    $$(el).find("ul li a").each((_, a) => {
      episodes.push({ name: $$(a).text().trim(), playId: toAbsUrl($$(a).attr("href"), "https://www.03yy.live") });
    });
    if (episodes.length > 0) sources.push({ name: `03影院 - ${tabs[index] || '线路'+(index+1)}`, episodes });
  });
  
  if (sources.length === 0) throw new Error("03yy未匹配到任何剧集");
  return { type: '03yy', sources };
}

// 【核心修复】增强版真狼解析器，增加 URL 去重，防止集数重复
async function parseZhenlangSource(url) {
  const res = await fetchWithCookieRedirect(url, { "Referer": "https://www.zhenlang.cc/" }, 4000);
  const $$ = cheerio.load(res.data);
  const sources = [];

  // 1. 尝试通用 MacCMS 结构抓取线路名称
  const tabs = [];
  $$(".nav-tabs li a, .stui-vodlist__head h3, .myui-panel__head h3, .module-tab-item, .play_source_tab a").each((_, el) => {
     let text = $$(el).text().replace(/[\uE000-\uF8FF]/g, '').trim();
     if (text) tabs.push(text);
  });

  // 2. 尝试通用 MacCMS 结构抓取播放列表
  const lists = $$(".stui-content__playlist, .myui-content__list, .module-play-list-content, .content_playlist, [id^='playlist']");
  lists.each((index, el) => {
    const episodes = [];
    const seenUrls = new Set(); // 【新增】用于记录已经提取过的链接，防止重复

    $$(el).find("a").each((_, a) => {
      const href = $$(a).attr("href");
      if (href && (href.includes("/play") || href.includes("/vodplay") || href.includes("vod-play"))) {
        const playId = toAbsUrl(href, "https://www.zhenlang.cc");
        
        // 【核心修复】如果这个链接还没被提取过，才加入列表
        if (!seenUrls.has(playId)) {
            seenUrls.add(playId);
            let epName = $$(a).text().trim() || "播放";
            // 清理可能存在的多余换行符
            epName = epName.replace(/\s+/g, ' '); 
            episodes.push({ name: epName, playId: playId });
        }
      }
    });
    
    if (episodes.length > 0) {
        let tabName = tabs[index] || `线路${index + 1}`;
        sources.push({ name: `真狼 - ${tabName}`, episodes });
    }
  });

  // 3. 尝试旧版结构兜底
  if (sources.length === 0) {
    $$(".play_list_box").each((index, el) => {
      let tabName = `线路${index + 1}`;
      const tipMatch = ($$(el).find(".player_infotip").text() || "").match(/当前资源由(.*?)提供/);
      if (tipMatch && tipMatch[1]) tabName = tipMatch[1].trim();

      const episodes = [];
      const seenUrls = new Set(); // 旧版结构也加上去重

      $$(el).find(".content_playlist a").each((_, a) => {
        const href = $$(a).attr("href");
        if (href) {
            const playId = toAbsUrl(href, "https://www.zhenlang.cc");
            if (!seenUrls.has(playId)) {
                seenUrls.add(playId);
                episodes.push({ name: $$(a).text().trim(), playId: playId });
            }
        }
      });
      if (episodes.length > 0) sources.push({ name: `真狼 - ${tabName}`, episodes });
    });
  }

  if (sources.length === 0) throw new Error("真狼网页结构变更，未匹配到任何剧集");
  
  return { type: 'zhenlang', sources };
}

async function parseKaixinSource(url) {
  const res = await axiosInstance.get(url, { headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"] }, timeout: 4000 });
  const $$ = cheerio.load(res.data);
  const tabs = [];
  const sources = [];
  
  $$("ul.nav-tabs li a").each((_, el) => {
    const tabName = $$(el).text().replace(/\s*\d+$/, '').trim();
    const targetId = $$(el).attr("href");
    if (tabName && targetId) tabs.push({ name: tabName, id: targetId });
  });

  tabs.forEach(tab => {
    if (!tab.id || !tab.id.startsWith('#')) return;
    try {
      const episodes = [];
      $$(tab.id).find(".btn-group a").each((_, a) => {
        episodes.push({ name: $$(a).text().trim(), playId: toAbsUrl($$(a).attr("href"), "https://www.kxyytv.com") });
      });
      if (episodes.length > 0) sources.push({ name: `开心 - ${tab.name}`, episodes });
    } catch (e) {}
  });
  
  if (sources.length === 0) throw new Error("开心未匹配到任何剧集");
  return { type: 'kaixin', sources };
}

// ==================== 核心接口 ====================

async function home(params) {
  const classes = [
    { type_id: "1", type_name: "电影" },
    { type_id: "2", type_name: "电视剧" },
    { type_id: "5", type_name: "综艺" },
    { type_id: "4", type_name: "动漫" },
    { type_id: "3", type_name: "纪录片" }
  ];
  
  const filters = {
    "1": [{ key: "cateId", name: "类型", value: [{ n: "最新", v: "1", name: "最新", value: "1" }, { n: "动作", v: "6", name: "动作", value: "6" }, { n: "喜剧", v: "7", name: "喜剧", value: "7" }, { n: "爱情", v: "8", name: "爱情", value: "8" }, { n: "科幻", v: "9", name: "科幻", value: "9" }, { n: "恐怖", v: "10", name: "恐怖", value: "10" }, { n: "剧情", v: "11", name: "剧情", value: "11" }, { n: "战争", v: "12", name: "战争", value: "12" }] }],
    "2": [{ key: "cateId", name: "类型", value: [{ n: "最新", v: "2", name: "最新", value: "2" }, { n: "国产剧", v: "13", name: "国产剧", value: "13" }, { n: "港台剧", v: "14", name: "港台剧", value: "14" }, { n: "日韩剧", v: "15", name: "日韩剧", value: "15" }, { n: "海外剧", v: "16", name: "海外剧", value: "16" }] }],
    "4": [{ key: "cateId", name: "类型", value: [{ n: "最新", v: "4", name: "最新", value: "4" }, { n: "国产动漫", v: "24", name: "国产动漫", value: "24" }, { n: "日韩动漫", v: "25", name: "日韩动漫", value: "25" }, { n: "港台动漫", v: "26", name: "港台动漫", value: "26" }, { n: "欧美动漫", v: "27", name: "欧美动漫", value: "27" }] }],
    "5": [{ key: "cateId", name: "类型", value: [{ n: "最新", v: "5", name: "最新", value: "5" }, { n: "大陆综艺", v: "17", name: "大陆综艺", value: "17" }, { n: "港台综艺", v: "18", name: "港台综艺", value: "18" }, { n: "日韩综艺", v: "20", name: "日韩综艺", value: "20" }, { n: "欧美综艺", v: "21", name: "欧美综艺", value: "21" }] }],
    "3": [{ key: "cateClass", name: "类型", value: [{ n: "最新", v: "", name: "最新", value: "" }, { n: "记录", v: "记录", name: "记录", value: "记录" }, { n: "传记", v: "传记", name: "传记", value: "传记" }, { n: "历史", v: "历史", name: "历史", value: "历史" }, { n: "音乐", v: "音乐", name: "音乐", value: "音乐" }, { n: "运动", v: "运动", name: "运动", value: "运动" }, { n: "犯罪", v: "犯罪", name: "犯罪", value: "犯罪" }, { n: "情", v: "情", name: "情", value: "情" }, { n: "战争", v: "战争", name: "战争", value: "战争" }, { n: "冒险", v: "冒险", name: "冒险", value: "冒险" }, { n: "灾难", v: "灾难", name: "灾难", value: "灾难" }] }]
  };

  try {
    const url = `${HOST}/api.php/xiao/vod?page=1&limit=20`;
    const res = await axiosInstance.get(url, { 
        headers: { ...DEFAULT_HEADERS, "X-Requested-With": "XMLHttpRequest" } 
    });
    
    let list = [];
    if (res.data && res.data.list) {
        list = res.data.list.map(item => ({
            vod_id: item.vod_id.toString(),
            vod_name: item.vod_name,
            vod_pic: item.vod_pic,
            vod_remarks: parseFloat(item.vod_score) > 0 ? item.vod_score.toString() : ""
        }));
    }
    
    return { class: classes, filters: filters, list: list, page: 1, pagecount: res.data.pagecount || 99, limit: 20, total: res.data.total || 999 };
  } catch (e) { 
    return { class: classes, filters: filters, list: [], page: 1, pagecount: 1 }; 
  }
}


async function category(params) {
  let tid = params?.categoryId || params?.id || "1";
  const pg = params?.page || 1;
  let filterClass = "";

  if (params?.filters) {
      if (params.filters.cateId) {
          tid = params.filters.cateId;
      }
      if (params.filters.cateClass) {
          filterClass = encodeURIComponent(params.filters.cateClass);
      }
  }

  try {
    let url = `${HOST}/api.php/xiao/vod?type=${tid}&page=${pg}&limit=20`;
    if (filterClass) {
        url += `&class=${filterClass}`;
    }

    const res = await axiosInstance.get(url, { 
        headers: { 
            ...DEFAULT_HEADERS, 
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest" 
        } 
    });
    
    const data = res.data;
    let list = [];
    
    if (data && data.list) {
        list = data.list.map(item => ({
            vod_id: item.vod_id.toString(),
            vod_name: item.vod_name,
            vod_pic: item.vod_pic,
            vod_remarks: parseFloat(item.vod_score) > 0 ? item.vod_score.toString() : ""
        }));
    }

    return { 
        list: list, 
        page: parseInt(data.page || pg), 
        pagecount: parseInt(data.pagecount || 99), 
        limit: 20, 
        total: parseInt(data.total || 999) 
    };
  } catch (e) { 
    return { list: [], page: 1, pagecount: 1 }; 
  }
}

async function search(params) {
  const wd = params?.keyword || params?.wd || "";
  const pg = params?.page || 1;
  
  if (pg > 1) return { list: [], page: pg, pagecount: 1 };

  try {
    const apiUrl = `${HOST}/API/v2.php?q=${encodeURIComponent(wd)}&size=50`;
    const apiRes = await axiosInstance.get(apiUrl, { headers: { ...DEFAULT_HEADERS, "Accept": "*/*" } });
    
    let apiData = [];
    try {
        const parsed = JSON.parse(d64(apiRes.data));
        apiData = Array.isArray(parsed) ? parsed : (parsed.data || []);
    } catch (e) {
        logWarn("搜索API数据解析失败", e);
    }

    const groups = {};
    for (let i = 0; i < apiData.length; i++) {
        const item = apiData[i];
        if (typeof item === 'object' && item.text && item.url) {
            const title = item.text.trim();
            if (!groups[title]) {
                groups[title] = {
                    vod_id: `search_${title}`, 
                    vod_name: title,
                    vod_pic: "https://www.ymck.pro/upload/site/20230825-1/5c00fbcfb4ff0737d3c8320d30b2d1de.png", 
                    vod_remarks: "全网聚合"
                };
            }
        }
    }

    const list = Object.values(groups);
    return { list: list, page: 1, pagecount: 1, limit: 50, total: list.length };
  } catch (e) { 
    return { list: [], page: 1, pagecount: 1 }; 
  }
}

async function detail(params) {
  const t0 = Date.now();
  const id = params?.videoId || params?.id || "";
  if (!id) return { list: [] };

  try {
    let vodName = "";
    let vodPic = "";
    let vodContent = "";
    let vodYear = "";
    let vodActor = "";
    let vodDirector = "";

    if (id.startsWith("search_")) {
        vodName = id.replace("search_", "");
        vodPic = "https://www.ymck.pro/upload/site/20230825-1/5c00fbcfb4ff0737d3c8320d30b2d1de.png";
        vodContent = "全网聚合搜索结果，正在通过 TMDB 刮削获取详细信息...";
    } else {
        let targetUrl = id;
        if (/^\d+$/.test(id)) {
            targetUrl = `${HOST}/movie/${id}.html`;
        } else if (!id.startsWith("http")) {
            targetUrl = toAbsUrl(id);
        }

        const res = await axiosInstance.get(targetUrl, { headers: DEFAULT_HEADERS });
        const $ = cheerio.load(res.data);

        vodName = $(".movie-title").first().text().trim().replace(/影片信息$/, "").trim();
        if (!vodName) return { list: [] };
        
        vodPic = toAbsUrl($(".poster img").attr("src"));
        vodContent = $(".summary.detailsTxt").last().text().replace("简介：", "").trim();
    }

    let playSources = [];
    let parsedFlags = { '03yy': false, 'zhenlang': false, 'kaixin': false };

    const tApi = Date.now();
    const apiUrl = `${HOST}/API/v2.php?q=${encodeURIComponent(vodName)}&size=50`;
    try {
      const apiRes = await axiosInstance.get(apiUrl, { headers: { ...DEFAULT_HEADERS, "Accept": "*/*" } });
      
      let apiData = [];
      try {
          const parsed = JSON.parse(d64(apiRes.data));
          apiData = Array.isArray(parsed) ? parsed : (parsed.data || []);
      } catch (e) {
          logWarn("聚合API数据解析失败", e);
      }

      const target03yy = apiData.find(item => item && item.url && item.url.includes("03yy.live"));
      const targetZhenlang = apiData.find(item => item && item.url && item.url.includes("zhenlang.cc"));
      const targetKaixin = apiData.find(item => item && item.url && item.url.includes("kxyytv.com"));

      const tSource = Date.now();
      const tasks = [];

      const wrapTask = async (name, taskPromise) => {
          const tStart = Date.now();
          try {
              const res = await taskPromise;
              return { name, status: '成功', time: Date.now() - tStart, data: res };
          } catch (e) {
              return { name, status: '失败', time: Date.now() - tStart };
          }
      };

      if (target03yy) tasks.push(wrapTask('03影院', parse03yySource(target03yy.url)));
      if (targetZhenlang) tasks.push(wrapTask('真狼', parseZhenlangSource(targetZhenlang.url)));
      if (targetKaixin) tasks.push(wrapTask('开心', parseKaixinSource(targetKaixin.url)));

      if (tasks.length > 0) {
        const results = await Promise.all(tasks);
        
        let logDetails = [];
        results.forEach(r => {
            // 【核心修复】必须确保 sources 里面真的有数据，才算真正成功
            if (r.status === '成功' && r.data && r.data.sources && r.data.sources.length > 0) {
                logDetails.push(`${r.name}:成功(${r.time}ms)`);
                playSources.push(...r.data.sources);
                parsedFlags[r.data.type] = true;
            } else {
                logDetails.push(`${r.name}:无数据/失败(${r.time}ms)`);
            }
        });
        logInfo(`源站解析完成, 耗时: ${Date.now() - tSource}ms, 详情: [ ${logDetails.join(' | ')} ]`);
      }

      const fallbackEpisodes = [];
      for (let i = 0; i < apiData.length; i++) {
        const item = apiData[i];
        if (item && item.website && item.url) {
          if (parsedFlags['03yy'] && item.url.includes("03yy.live")) continue;
          if (parsedFlags['zhenlang'] && item.url.includes("zhenlang.cc")) continue;
          if (parsedFlags['kaixin'] && item.url.includes("kxyytv.com")) continue;
          fallbackEpisodes.push({ name: `${item.website} (需嗅探)`, playId: item.url });
        }
      }
      if (fallbackEpisodes.length > 0) playSources.push({ name: "全网聚合备用源", episodes: fallbackEpisodes });

    } catch (e) {
      logWarn("聚合API请求失败", e);
    }

    // ================= 2. 刮削处理 =================
    const tScrape = Date.now();
    let scrapeData = null;
    let videoMappings = [];
    const scrapeCandidates = [];

    const currentSeason = extractSeason(vodName);
    const sStr = currentSeason < 10 ? `S0${currentSeason}` : `S${currentSeason}`;

    playSources.forEach((source, sIdx) => {
        source.episodes.forEach((ep, eIdx) => {
            const fid = `${id}_${sIdx}_${eIdx}`;
            ep._fid = fid; 
            
            const epNumStr = extractEpisode(ep.name);
            let fileNameForScrape = `${vodName} ${ep.name}`; 
            
            if (epNumStr) {
                const epNum = parseInt(epNumStr, 10);
                const eStr = epNum < 10 ? `E0${epNum}` : `E${epNum}`;
                fileNameForScrape = `${vodName} ${sStr}${eStr}`;
            }

            scrapeCandidates.push({
                fid: fid, 
                file_id: fid, 
                file_name: fileNameForScrape, 
                name: ep.name, 
                format_type: "video"
            });
        });
    });

    if (scrapeCandidates.length > 0) {
        try {
            await OmniBox.processScraping(id, vodName, vodName, scrapeCandidates);
            const metadata = await OmniBox.getScrapeMetadata(id);
            scrapeData = metadata?.scrapeData || null;
            videoMappings = metadata?.videoMappings || [];
            
            if (scrapeData) {
                vodName = scrapeData.title || vodName;
                if (scrapeData.posterPath) vodPic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
                if (scrapeData.overview) vodContent = scrapeData.overview;
                if (scrapeData.releaseDate) vodYear = String(scrapeData.releaseDate).substring(0, 4);
                const actors = (scrapeData.credits?.cast || []).slice(0, 5).map(c => c?.name).filter(Boolean).join(",");
                if (actors) vodActor = actors;
                const directors = (scrapeData.credits?.crew || []).filter(c => c?.job === "Director").slice(0, 3).map(c => c?.name).filter(Boolean).join(",");
                if (directors) vodDirector = directors;
            }

            playSources.forEach(source => {
                source.episodes.forEach(ep => {
                    let meta = { fid: ep._fid, v: vodName, e: ep.name };
                    const mapping = videoMappings.find(m => m?.fileId === ep._fid);
                    
                    if (mapping) {
                        const newName = buildScrapedEpisodeName(scrapeData, mapping, ep.name);
                        if (newName && newName !== ep.name) ep.name = newName;
                        meta.s = mapping.seasonNumber;
                        meta.n = mapping.episodeNumber;
                        meta.e = ep.name;
                        
                        ep._s = mapping.seasonNumber;
                        ep._n = mapping.episodeNumber;
                    }
                    ep.playId = `${ep.playId}|||${encodeMeta(meta)}`;
                });

                const hasEpisodeNumber = source.episodes.some(ep => ep._n !== undefined);
                
                if (hasEpisodeNumber) {
                    source.episodes.sort((a, b) => {
                        const seasonA = a._s || 0;
                        const seasonB = b._s || 0;
                        if (seasonA !== seasonB) return seasonA - seasonB;
                        const episodeA = a._n || 0;
                        const episodeB = b._n || 0;
                        return episodeA - episodeB;
                    });
                }
            });
        } catch (e) {}
    }

    logInfo(`详情页加载完成, 影片: ${vodName}, 刮削耗时: ${Date.now() - tScrape}ms, 总耗时: ${Date.now() - t0}ms`);

    return { 
        list: [{ 
            vod_id: id, vod_name: vodName, vod_pic: vodPic, vod_content: vodContent, 
            vod_year: vodYear, vod_actor: vodActor, vod_director: vodDirector,
            vod_play_sources: playSources 
        }] 
    };
  } catch (e) { 
    return { list: [] }; 
  }
}

// ==================== 播放页策略模式解析器 ====================

async function play03yy(url, baseResult) {
  try {
    logInfo(`[03影院] 开始解析播放页: ${url}`);
    const res = await fetchWithCookieRedirect(url, { "Referer": "https://www.03yy.live/" }, 5000);
    const html = res.data;

    const nowMatch = html.match(/var now=base64decode\("([^"]+)"\)/);
    const pnMatch = html.match(/var pn="([^"]+)"/);

    if (nowMatch && nowMatch[1]) {
      const nowStr = d64(nowMatch[1]);
      const pn = pnMatch ? pnMatch[1] : "未知";
      
      logInfo(`[03影院] 提取参数成功 -> pn: ${pn}, now: ${nowStr}`);

      if (pn === "btiyikk" || pn === "03yyhd") {
        logInfo(`[03影院] 匹配为【高速线路】(${pn}), 准备请求 btiyikk 接口...`);
        const apiUrl = `https://www.03yy.live/api/btiyikk.php?url=${encodeURIComponent(nowStr)}&ref=${encodeURIComponent(url)}`;
        const apiRes = await fetchWithCookieRedirect(apiUrl, { "Referer": url }, 5000);
        const videoMatch = apiRes.data.match(/const videoUrl\s*=\s*"([^"]+)"/);
        
        if (videoMatch && videoMatch[1]) {
          const finalUrl = videoMatch[1].replace(/\\\//g, '/');
          logInfo(`[03影院] 高速线路解析成功: ${finalUrl}`);
          baseResult.urls = [{ name: "03高速直链", url: finalUrl }];
          return baseResult;
        }
      } 
            else if (pn === "qq") {
        logInfo(`[03影院] 匹配为【高清备用】(${pn}), 准备请求 playlink 接口...`);
        const apiUrl = `https://www.03yy.live/api/playlink.php?url=${encodeURIComponent(nowStr)}`;
        const apiRes = await fetchWithCookieRedirect(apiUrl, { "Referer": url }, 5000);
        const videoMatch = apiRes.data.match(/const videoUrl\s*=\s*"([^"]+)"/);
        
        if (videoMatch && videoMatch[1]) {
          const finalUrl = videoMatch[1].replace(/\\\//g, '/');
          logInfo(`[03影院] 高清备用解析成功: ${finalUrl}`);
          baseResult.urls = [{ name: "03高清备用", url: finalUrl }];
          baseResult.header = { "Referer": "https://www.03yy.live/", "User-Agent": DEFAULT_HEADERS["User-Agent"] };
          return baseResult;
        }
      }
      else if (pn === "1080zyk") {
        logInfo(`[03影院] 匹配为【普通线路】(${pn}), 准备请求 e1080 接口...`);
        const apiUrl = `https://www.03yy.live/api/e1080.php?url=${encodeURIComponent(nowStr)}`;
        const apiRes = await fetchWithCookieRedirect(apiUrl, { "Referer": url }, 5000);
        const videoMatch = apiRes.data.match(/var videoUrl\s*=\s*"([^"]+)"/);
        
        if (videoMatch && videoMatch[1]) {
          const finalUrl = videoMatch[1].replace(/\\\//g, '/');
          logInfo(`[03影院] 普通线路解析成功: ${finalUrl}`);
          baseResult.urls = [{ name: "03普线直链", url: finalUrl }];
          baseResult.header = { "Referer": "https://www.03yy.live/", "User-Agent": DEFAULT_HEADERS["User-Agent"] };
          return baseResult;
        }
      } 
      else {
        logInfo(`[03影院] 未知的线路标识 pn: ${pn}，尝试原生直链兜底`);
      }

      if (nowStr.includes(".m3u8") || nowStr.includes(".mp4")) {
        logInfo(`[03影院] 触发原生直链兜底成功: ${nowStr}`);
        baseResult.urls = [{ name: "03原生直链", url: nowStr }];
        return baseResult;
      }
    } else {
      logWarn(`[03影院] 网页源码中未找到 now 变量，可能网页结构已改变`);
    }
  } catch (e) {
    logWarn(`[03影院] 播放解析发生代码异常: ${e.message}`);
  }
  
  logInfo(`[03影院] 所有直链尝试均失败，交由外层嗅探器处理`);
  return null; 
}

async function playKaixin(url, baseResult) {
  try {
    const res = await axiosInstance.get(url, { headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"] }, timeout: 5000 });
    const playerMatch = res.data.match(/var player_data\s*=\s*(\{[\s\S]+?\})\s*;?\s*</);
    if (playerMatch && playerMatch[1]) {
      const playerObj = JSON.parse(playerMatch[1]);
      let targetUrl = playerObj.url;
      let encrypt = playerObj.encrypt || 0;
      if (encrypt === 1) targetUrl = safeDecode(targetUrl);
      else if (encrypt === 2) targetUrl = safeDecode(Buffer.from(targetUrl, "base64").toString("utf8"));
      if (targetUrl) {
        baseResult.urls = [{ name: "直链秒播", url: targetUrl }];
        return baseResult;
      }
    }
  } catch (e) {}
  return null;
}

async function playZhenlang(url, baseResult) {
  try {
    const res = await axiosInstance.get(url, { headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"] }, timeout: 5000 });
    let targetUrl = "";
    let encrypt = 0;
    const playerMatch = res.data.match(/var player_aaaa\s*=\s*(\{[\s\S]+?\})\s*;?\s*</);
    if (playerMatch && playerMatch[1]) {
      try {
        const playerObj = JSON.parse(playerMatch[1]);
        targetUrl = playerObj.url;
        encrypt = playerObj.encrypt;
      } catch (e) {
        const uMatch = playerMatch[1].match(/"url":"([^"]+)"/);
        const eMatch = playerMatch[1].match(/"encrypt":(\d)/);
        if (uMatch) targetUrl = uMatch[1];
        if (eMatch) encrypt = parseInt(eMatch[1]);
      }
    }
    
    if (targetUrl) {
      if (encrypt === 1) targetUrl = safeDecode(targetUrl);
      else if (encrypt === 2) targetUrl = safeDecode(Buffer.from(targetUrl, "base64").toString("utf8"));
      
      if (targetUrl.includes(".m3u8") || targetUrl.includes(".mp4")) {
        baseResult.urls = [{ name: "直链秒播", url: targetUrl }];
        return baseResult;
      }

      try {
        const sniffUrl = `https://super.playr.top/?url=${encodeURIComponent(targetUrl)}`;
        const playerRes = await axiosInstance.get(sniffUrl, { headers: { "Referer": "https://www.zhenlang.cc/" }, timeout: 5000 });
        const keyMatch = playerRes.data.match(/var\s+precomputedKey\s*=\s*['"]([^'"]+)['"]/);
        const ivMatch = playerRes.data.match(/var\s+precomputedIv\s*=\s*['"]([^'"]+)['"]/);
        
        if (keyMatch && ivMatch) {
          const dynamicKey = keyMatch[1];
          const dynamicIv = ivMatch[1];
          const tokenRes = await axiosInstance.get(`https://super.playr.top/token.php?url=${encodeURIComponent(targetUrl)}`, { headers: { "Referer": "https://www.zhenlang.cc/" }, timeout: 5000 });
          if (tokenRes.data && tokenRes.data.code === 0) {
            const apiRes = await axiosInstance.get(`https://super.playr.top/api.php?url=${encodeURIComponent(targetUrl)}&token=${tokenRes.data.token}&t=${tokenRes.data.t}`, { headers: { "Referer": "https://www.zhenlang.cc/" }, timeout: 5000 });
            if (apiRes.data && apiRes.data.e === 1 && apiRes.data.d) {
              const decipher = crypto.createDecipheriv("aes-128-cbc", Buffer.from(dynamicKey), Buffer.from(dynamicIv));
              let decrypted = decipher.update(apiRes.data.d, "base64", "utf8");
              decrypted += decipher.final("utf8");
              const parsedData = JSON.parse(decrypted);
              if (parsedData.url) {
                baseResult.urls = [{ name: "逆向秒播", url: parsedData.url }];
                return baseResult;
              }
            } else if (apiRes.data && apiRes.data.url) {
              baseResult.urls = [{ name: "逆向秒播", url: apiRes.data.url }];
              return baseResult;
            }
          }
        }
      } catch (crackErr) {}

      const sniffUrl = `https://super.playr.top/?url=${encodeURIComponent(targetUrl)}`;
      const sniffResult = await OmniBox.sniffVideo(sniffUrl);
      if (sniffResult && sniffResult.url) {
          baseResult.urls = [{ name: "嗅探线路", url: sniffResult.url }];
          baseResult.header = sniffResult.header || DEFAULT_HEADERS;
          return baseResult;
      }
    }
  } catch (e) {}
  return null;
}

async function play(params) {
  const t0 = Date.now();
  const playId = params?.playId || params?.id || "";
  if (!playId) return { urls: [] };

  let rawPlayId = playId;
  let playMeta = {};
  if (playId.includes('|||')) {
      const parts = playId.split('|||');
      rawPlayId = parts[0];
      playMeta = decodeMeta(parts[1] || "");
  }

  let playResult = { urls: [], parse: 0, header: DEFAULT_HEADERS };

  let danmakuPromise = Promise.resolve([]);
  if (DANMU_API) {
      let vodName = params.vodName || playMeta.v || "";
      let episodeName = params.episodeName || playMeta.e || "";
      const fileName = buildFileNameForDanmu(vodName, episodeName, playMeta.s, playMeta.n);
      if (fileName) danmakuPromise = matchDanmu(fileName).catch(() => []);
  }

  let specificResultPromise = Promise.resolve(null);
  if (rawPlayId.includes("03yy.live")) specificResultPromise = play03yy(rawPlayId, playResult);
  else if (rawPlayId.includes("kxyytv.com")) specificResultPromise = playKaixin(rawPlayId, playResult);
  else if (rawPlayId.includes("zhenlang.cc")) specificResultPromise = playZhenlang(rawPlayId, playResult);

  const [specificResult, danmakuList] = await Promise.all([specificResultPromise, danmakuPromise]);

  if (danmakuList && danmakuList.length > 0) {
      if (specificResult) specificResult.danmaku = danmakuList;
      playResult.danmaku = danmakuList;
  }

  if (specificResult && specificResult.urls.length > 0) {
      logInfo(`播放解析完成 (直链), 耗时: ${Date.now() - t0}ms`);
      return specificResult;
  }

  try {
    const sniffResult = await OmniBox.sniffVideo(rawPlayId);
    if (sniffResult && sniffResult.url) {
      playResult.urls = [{ name: "嗅探线路", url: sniffResult.url }];
      playResult.header = sniffResult.header || DEFAULT_HEADERS;
      logInfo(`播放解析完成 (嗅探), 耗时: ${Date.now() - t0}ms`);
      return playResult;
    }
  } catch (e) {}

  playResult.urls = [{ name: "网页解析", url: rawPlayId }];
  playResult.parse = 1;
  logInfo(`播放解析完成 (交由播放器), 耗时: ${Date.now() - t0}ms`);
  return playResult;
}

module.exports = { home, category, detail, search, play };
const runner = require("spider_runner");
runner.run(module.exports);

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

_load(7, "爱奇艺资源站", function (module, exports, require) {
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

_load(8, "瓜子", function (module, exports, require) {
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

_load(9, "电影天堂", function (module, exports, require) {
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
