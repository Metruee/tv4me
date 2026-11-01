// @name 影视采集G(合并9源)
// @version 3.20261101.2127
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

_load(1, "88看球", function (module, exports, require) {
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

_load(2, "乌云影视", function (module, exports, require) {
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

_load(3, "人人影视PRO", function (module, exports, require) {
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

_load(5, "影视大全", function (module, exports, require) {
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

_load(6, "毒舌影视", function (module, exports, require) {
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

_load(7, "袋鼠影视", function (module, exports, require) {
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

_load(8, "韩小圈", function (module, exports, require) {
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
