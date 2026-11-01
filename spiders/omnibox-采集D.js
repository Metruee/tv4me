// @name 影视采集D(合并6源)
// @version 3.20261101.2127
// @description 自动同步：采集聚合
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-采集D.js
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


_load(0, "两个BT", function (module, exports, require) {
// @name 两个BT
// @author 
// @description 刮削：支持，弹幕：支持，嗅探：支持
// @dependencies: axios, cheerio
// @version 1.0.8
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/采集/两个BT.js
/**
 * ============================================================================
 * 两个BT资源 - OmniBox 爬虫脚本
 * ============================================================================
 */
const axios = require("axios");
const http = require("http");
const https = require("https");
const cheerio = require("cheerio");
const OmniBox = require("omnibox_sdk");

// ========== 全局配置 ==========
const host = "https://www.bttwoo.com";
const def_headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  Referer: "https://www.bttwoo.com/",
};

const axiosInstance = axios.create({
  timeout: 15000,
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  httpAgent: new http.Agent({ keepAlive: true }),
});

const PAGE_LIMIT = 20;

/**
 * 日志工具函数
 */
const logInfo = (message, data = null) => {
  const output = data ? `${message}: ${JSON.stringify(data)}` : message;
  OmniBox.log("info", `[两个BT-DEBUG] ${output}`);
};

const logError = (message, error) => {
  OmniBox.log("error", `[两个BT-DEBUG] ${message}: ${error.message || error}`);
};

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
 * 图像地址修复
 */
const fixPicUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  return url.startsWith("/") ? `${host}${url}` : `${host}/${url}`;
};

const cleanText = (text) => (text || "").replace(/\s+/g, " ").trim();

const isBadPic = (url) => {
  if (!url) return true;
  return (
    url.includes("placeholder") ||
    url.includes("blank.gif") ||
    url.includes("base64") ||
    url.includes("/static/icons/") ||
    url.includes("favicon") ||
    url.includes("logo.png")
  );
};

const getPlaySlug = (url) => {
  if (!url) return "";
  const match = String(url).match(/\/play\/([^/?#"' ]+)/);
  return match ? match[1] : "";
};

const getPlayPath = (url) => {
  const slug = getPlaySlug(url);
  return slug ? `/play/${slug}` : "";
};

const getDetailField = ($, label) => {
  let value = "";
  $("div").each((_, elem) => {
    const $elem = $(elem);
    if (cleanText($elem.text()) !== label) return;
    const text = cleanText($elem.next().text());
    if (text) {
      value = text;
      return false;
    }
  });
  return value;
};

const CLASS_LIST = [
  { type_id: "movie", type_name: "电影" },
  { type_id: "tv", type_name: "电视剧" },
  { type_id: "anime", type_name: "动漫" },
  { type_id: "variety", type_name: "综艺" },
];

const makeFilterValues = (items) => [
  { name: "全部", value: "" },
  ...items.map(([value, name]) => ({ name, value })),
];

const AREA_VALUES = makeFilterValues([
  ["5", "美国"],
  ["6", "法国"],
  ["7", "中国"],
  ["9", "unknown"],
  ["11", "日本"],
  ["12", "韩国"],
  ["14", "中国香港"],
  ["16", "俄罗斯"],
  ["17", "波兰"],
  ["18", "德国"],
  ["19", "意大利"],
  ["21", "中国台湾"],
  ["22", "澳大利亚"],
  ["24", "西班牙"],
  ["30", "英国"],
  ["32", "加拿大"],
  ["33", "泰国"],
  ["34", "印度"],
  ["41", "丹麦"],
  ["52", "中国大陆"],
  ["65", "马来西亚"],
  ["74", "菲律宾"],
  ["78", "其他"],
  ["79", "瑞典"],
  ["80", "挪威"],
  ["81", "阿根廷"],
  ["82", "冰岛"],
  ["83", "保加利亚"],
]);

const TYPE_VALUES = makeFilterValues([
  ["1", "剧情"],
  ["2", "悬疑"],
  ["3", "恐怖"],
  ["4", "惊悚"],
  ["5", "喜剧"],
  ["6", "爱情"],
  ["9", "犯罪"],
  ["10", "动作"],
  ["11", "动画"],
  ["12", "奇幻"],
  ["13", "音乐"],
  ["14", "科幻"],
  ["15", "历史"],
  ["16", "战争"],
  ["18", "冒险"],
  ["19", "家庭"],
  ["20", "纪录"],
  ["23", "西部"],
  ["24", "电视电影"],
  ["25", "情色"],
  ["26", "真人秀"],
  ["27", "古装"],
  ["28", "传记"],
  ["29", "同性"],
  ["30", "运动"],
  ["31", "武侠"],
  ["32", "歌舞"],
  ["33", "纪录片"],
  ["34", "灾难"],
  ["35", "短片"],
]);

const YEAR_VALUES = makeFilterValues([
  ["1", "2026"], ["3", "2025"], ["4", "2024"], ["56", "2023"], ["13", "2022"],
  ["2", "2021"], ["6", "2020"], ["8", "2019"], ["9", "2018"], ["12", "2017"],
  ["11", "2016"], ["14", "2015"], ["15", "2014"], ["22", "2013"], ["10", "2012"],
  ["17", "2011"], ["25", "2010"], ["20", "2009"], ["23", "2008"], ["30", "2007"],
  ["31", "2006"], ["7", "2005"], ["24", "2004"], ["28", "2003"], ["19", "2002"],
  ["29", "2001"], ["43", "2000"], ["45", "1999"], ["33", "1998"], ["34", "1997"],
  ["37", "1996"], ["21", "1995"], ["27", "1994"], ["26", "1993"], ["35", "1992"],
  ["18", "1991"], ["42", "1990"], ["44", "1989"], ["60", "1988"], ["73", "1987"],
  ["32", "1986"], ["40", "1985"], ["63", "1984"], ["59", "1983"], ["36", "1982"],
  ["5", "1981"], ["39", "1980"], ["61", "1979"], ["66", "1978"], ["48", "1977"],
  ["38", "1976"], ["57", "1975"], ["62", "1974"], ["53", "1973"], ["54", "1972"],
  ["51", "1971"], ["41", "1969"], ["58", "1965"], ["46", "1963"], ["65", "1962"],
  ["71", "1961"], ["75", "1960"], ["16", "1959"], ["67", "1958"], ["50", "1957"],
  ["49", "1956"], ["47", "1955"], ["68", "1954"], ["72", "1952"], ["70", "1949"],
  ["64", "1948"], ["52", "1938"], ["55", "1931"], ["69", "1925"], ["74", "1921"],
]);

const TAG_VALUES = makeFilterValues([
  ["1", "4k"],
  ["36", "院线"],
]);

const SORT_VALUES = [
  { name: "最新上映", value: "update_time:desc" },
  { name: "最受欢迎", value: "hits:desc" },
  { name: "评分最高", value: "score:desc" },
];

const buildCategoryFilterList = () => [
  { key: "areas", name: "地区", value: AREA_VALUES },
  { key: "types", name: "类型", value: TYPE_VALUES },
  { key: "years", name: "年份", value: YEAR_VALUES },
  { key: "tags", name: "标签", value: TAG_VALUES },
  { key: "sort", name: "排序", value: SORT_VALUES },
];

const FILTERS = CLASS_LIST.reduce((filters, item) => {
  filters[item.type_id] = buildCategoryFilterList();
  return filters;
}, {});

const CATEGORY_BASE_FILTERS = {
  movie: { classify: "1" },
  tv: { classify: "2" },
  anime: { classify: "3" },
  variety: { classify: "4" },
  zgjun: { classify: "2", areas: "7,52" },
  meiju: { classify: "2", areas: "5" },
  jpsrtv: { classify: "2", areas: "11,12" },
  gf: { sort_by: "score", order: "desc" },
};

const appendQuery = (url, params = {}) => {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  if (parts.length === 0) return url;
  return url + (url.includes("?") ? "&" : "?") + parts.join("&");
};

const parseFilterObject = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value !== "string") return {};

  try {
    return JSON.parse(value);
  } catch {
    try {
      return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    } catch {
      return {};
    }
  }
};

const getRequestFilters = (params = {}) => ({
  ...parseFilterObject(params.filters),
  ...parseFilterObject(params.extend),
  ...parseFilterObject(params.ext),
  ...parseFilterObject(params.filter),
});

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

/**
 * 检查搜索结果相关性
 */
const isRelevantSearchResult = (title, searchKey) => {
  if (!title || !searchKey) return false;

  const titleLower = title.toLowerCase();
  const searchKeyLower = searchKey.toLowerCase();

  if (titleLower.includes(searchKeyLower)) {
    return true;
  }

  const searchChars = new Set(searchKeyLower.replace(/\s+/g, ""));
  const titleChars = new Set(titleLower.replace(/\s+/g, ""));

  if (searchChars.size > 0) {
    const intersection = new Set([...searchChars].filter((x) => titleChars.has(x)));
    const matchRatio = intersection.size / searchChars.size;
    if (matchRatio >= 0.6) {
      return true;
    }
  }

  if (searchKeyLower.length <= 2) {
    return titleLower.includes(searchKeyLower);
  }

  return false;
};

/**
 * 从HTML提取视频列表
 */
const extractVideoList = ($, keyword = null) => {
  const list = [];
  const seenIds = new Set();

  $('a[href*="/play/"], li:has(a[href*="/movie/"]), .item li:has(a[href*="/movie/"])').each((i, elem) => {
    const $elem = $(elem);

    const link = $elem.is("a") ? $elem.attr("href") : $elem.find('a[href*="/play/"], a[href*="/movie/"]').attr("href");
    if (!link) return;

    const playSlug = getPlaySlug(link);
    const oldVodIdMatch = link.match(/\/movie\/(\d+)\.html/);
    if (!playSlug && !oldVodIdMatch) return;

    const vodId = playSlug || oldVodIdMatch[1];
    if (seenIds.has(vodId)) return;

    let title = "";
    const titleSelectors = ["[data-title]", "h3 a", "h3", "h2", "a[title]", ".title", ".name", "img[alt]"];

    for (const selector of titleSelectors) {
      const titleElem = $elem.find(selector);
      if (titleElem.length > 0) {
        title =
          cleanText(titleElem.first().attr("data-title")) ||
          cleanText(titleElem.first().attr("title")) ||
          cleanText(titleElem.first().attr("alt")) ||
          cleanText(titleElem.first().text());
        if (title && title.length > 1) break;
      }
    }

    if (!title) return;

    // 搜索时检查相关性
    if (keyword && !isRelevantSearchResult(title, keyword)) {
      return;
    }

    seenIds.add(vodId);

    let pic = "";
    const picSelectors = ["img[data-original]", "img[data-src]", "img[src]"];

    for (const selector of picSelectors) {
      const img = $elem.find(selector);
      if (img.length > 0) {
        for (let j = 0; j < img.length; j++) {
          const item = img.eq(j);
          const imgUrl = item.attr("data-original") || item.attr("data-src") || item.attr("src");
          if (!isBadPic(imgUrl)) {
            pic = imgUrl;
            break;
          }
        }
        if (pic) break;
      }
    }

    const rating = cleanText($elem.find("[data-rating]").first().attr("data-rating"));
    const text = cleanText($elem.text());
    const remarkMatch = text.match(/(4k|4K|1080p|1080P|HD|更新至\s*\d+|第\s*\d+\s*集|\d+(?:\.\d)?分)/);
    const remarks = rating ? `${rating}分` : remarkMatch ? remarkMatch[1] : "";

    list.push({
      vod_id: vodId,
      vod_name: title,
      vod_pic: fixPicUrl(pic),
      vod_remarks: remarks || "",
    });
  });

  return list;
};

/**
 * 解析播放源为 OmniBox 格式
 */
const parsePlaySources = ($, vodId) => {
  try {
    logInfo("开始解析播放源");
    const sourceMap = new Map();
    const lineNames = {};
    const episodeManager = ($.html().match(/episodeManager\([^[]*\[([\s\S]*?)\]\)/) || [])[1] || "";

    episodeManager.replace(/lineName:\s*['"]([^'"]+)['"]/g, (_, name) => {
      const idx = Object.keys(lineNames).length + 1;
      lineNames[String(idx)] = name;
      return "";
    });

    const addEpisode = (line, ep) => {
      const lineId = String(line || "1");
      if (!sourceMap.has(lineId)) {
        sourceMap.set(lineId, {
          name: lineNames[lineId] || (lineId === "1" ? "默认播放" : `线路${lineId}`),
          episodes: [],
          seen: new Set(),
        });
      }

      const source = sourceMap.get(lineId);
      if (source.seen.has(ep.playId)) return;
      source.seen.add(ep.playId);
      source.episodes.push(ep);
    };

    $('a[href*="/play/"]').each((i, elem) => {
      const $elem = $(elem);
      if (!$elem.attr("dataid") && !$elem.attr("data-episode")) return;

      const epUrl = $elem.attr("href");
      const playPath = getPlayPath(epUrl);
      if (!playPath) return;

      const dataEpisode = $elem.attr("data-episode") || "";
      const dataLine = $elem.attr("data-line") || "1";
      const dataId = $elem.attr("dataid") || "";
      const rawTitle = cleanText($elem.text());
      const epTitle = rawTitle || (dataEpisode ? `第${dataEpisode}集` : "正片");
      const normalizedTitle = /^\d+$/.test(epTitle) ? `第${epTitle}集` : epTitle;
      const fid = dataId || `${vodId}#${dataLine}#${dataEpisode || i}`;

      addEpisode(dataLine, {
        name: normalizedTitle,
        playId: `${playPath}|||${encodeMeta({ sid: String(vodId || ""), fid, e: normalizedTitle, dataid: dataId })}`,
        _fid: fid,
        _rawName: normalizedTitle,
        _episodeIndex: Number(dataEpisode) || i,
      });
    });

    $('a[href*="/v_play/"]').each((i, elem) => {
      const $elem = $(elem);
      const epTitle = cleanText($elem.text());
      const epUrl = $elem.attr("href");

      if (epTitle && epUrl) {
        const playIdMatch = epUrl.match(/\/v_play\/([^.]+)\.html/);
        if (playIdMatch) {
          const fid = `${vodId}#0#${i}`;
          addEpisode("1", {
            name: epTitle,
            playId: `${playIdMatch[1]}|||${encodeMeta({ sid: String(vodId || ""), fid, e: epTitle })}`,
            _fid: fid,
            _rawName: epTitle,
            _episodeIndex: i,
          });
        }
      }
    });

    const playSources = [...sourceMap.values()].map((source) => ({
      name: source.name,
      episodes: source.episodes.sort((a, b) => {
        const episodeA = a._episodeIndex || Number((a._fid || "").match(/#(\d+)$/)?.[1] || 0);
        const episodeB = b._episodeIndex || Number((b._fid || "").match(/#(\d+)$/)?.[1] || 0);
        return episodeA - episodeB;
      }),
    }));

    if (playSources.length === 0) {
      const currentPath = getPlayPath($('link[rel="canonical"]').attr("href")) || "";
      const fallbackPath = currentPath || `/play/${vodId}`;
      playSources.push({
        name: "默认播放",
        episodes: [
          {
            name: "正片",
            playId: `${fallbackPath}|||${encodeMeta({ sid: String(vodId || ""), fid: `${vodId}#1#1`, e: "正片" })}`,
            _fid: `${vodId}#1#1`,
            _rawName: "正片",
            _episodeIndex: 1,
          },
        ],
      });
    }

    if (playSources.length > 0) {
      playSources.forEach((source) => {
        delete source.seen;
      });
    } else {
      playSources.push({
        name: "默认播放",
        episodes: [{ name: "第1集", playId: "bXZfMTM0NTY4LW5tXzE=" }],
      });
    }

    logInfo("播放源解析结果", playSources);
    return playSources;
  } catch (e) {
    logError("解析播放源失败", e);
    return [{ name: "默认播放", episodes: [{ name: "第1集", playId: "bXZfMTM0NTY4LW5tXzE=" }] }];
  }
};

/**
 * 构建URL
 */
const buildUrl = (tid, pg, extend = {}) => {
  try {
    const tidStr = String(tid || "movie");
    const query = { ...(CATEGORY_BASE_FILTERS[tidStr] || (/^\d+$/.test(tidStr) ? { classify: tidStr } : { classify: "1" })) };

    const setFilter = (targetKey, sourceKeys) => {
      for (const key of sourceKeys) {
        if (!hasOwn(extend, key)) continue;
        const value = extend[key];
        if (value === "" || value === undefined || value === null) {
          delete query[targetKey];
        } else {
          query[targetKey] = String(value);
        }
        return;
      }
    };

    setFilter("classify", ["classify"]);
    setFilter("areas", ["areas", "area"]);
    setFilter("types", ["types", "type", "class"]);
    setFilter("years", ["years", "year"]);
    setFilter("tags", ["tags", "tag"]);

    if (hasOwn(extend, "sort") || hasOwn(extend, "by") || hasOwn(extend, "sort_by") || hasOwn(extend, "order")) {
      const rawSort = String(extend.sort || extend.by || "");
      if (rawSort) {
        const [field, order] = rawSort.split(/[:|,]/);
        query.sort_by = field;
        query.order = order || query.order || "desc";
      } else if (hasOwn(extend, "sort") || hasOwn(extend, "by")) {
        delete query.sort_by;
        delete query.order;
      }

      if (extend.sort_by) {
        query.sort_by = String(extend.sort_by);
        query.order = String(extend.order || query.order || "desc");
      } else if (hasOwn(extend, "sort_by") && !extend.sort_by) {
        delete query.sort_by;
        delete query.order;
      }

      if (extend.order) {
        query.order = String(extend.order);
      }
    }

    if (pg && Number(pg) > 1) {
      query.page = String(pg);
    }

    return appendQuery(`${host}/filter`, query);
  } catch (error) {
    logError("构建URL错误", error);
    return host + "/filter";
  }
};

// ========== 接口实现 ==========

async function home(params) {
  logInfo("进入首页");
  const result = {
    class: CLASS_LIST,
    filters: FILTERS,
    list: [],
  };

  try {
    const url = host;
    logInfo(`首页URL: ${url}`);
    const res = await axiosInstance.get(url, { headers: def_headers });
    const $ = cheerio.load(res.data);
    const list = extractVideoList($);
    logInfo(`首页获取到 ${list.length} 个项目`);
    result.list = list;
  } catch (e) {
    logError("首页请求失败", e);
  }

  return result;
}

async function category(params) {
  const categoryId = params.categoryId || params.type_id || params.tid || "movie";
  const filters = getRequestFilters(params);
  const pg = parseInt(params.page) || 1;
  logInfo(`请求分类: ${categoryId}, 页码: ${pg}, 筛选: ${JSON.stringify(filters)}`);

  try {
    const url = buildUrl(categoryId, pg, filters);
    logInfo(`分类URL: ${url}`);

    const res = await axiosInstance.get(url, { headers: def_headers });
    const $ = cheerio.load(res.data);

    const list = extractVideoList($);

    logInfo(`分类 ${categoryId} 第 ${pg} 页获取到 ${list.length} 个项目`);

    return {
      list: list,
      page: pg,
      pagecount: list.length >= PAGE_LIMIT ? pg + 1 : pg,
      filters: FILTERS[String(categoryId)] || [],
    };
  } catch (e) {
    logError("分类请求失败", e);
    return { list: [], page: pg, pagecount: 0 };
  }
}

async function search(params) {
  const wd = params.keyword || params.wd || "";
  const pg = parseInt(params.page) || 1;
  logInfo(`搜索关键词: ${wd}, 页码: ${pg}`);

  try {
    let searchUrl = `${host}/search?q=${encodeURIComponent(wd)}`;
    if (pg && pg !== 1) {
      searchUrl += `&page=${pg}`;
    }

    logInfo(`搜索URL: ${searchUrl}`);

    const res = await axiosInstance.get(searchUrl, { headers: def_headers });
    const $ = cheerio.load(res.data);

    const list = extractVideoList($, wd);

    logInfo(`搜索 "${wd}" 找到 ${list.length} 个结果`);

    return {
      list: list,
      page: pg,
      pagecount: list.length >= PAGE_LIMIT ? pg + 1 : pg,
    };
  } catch (e) {
    logError("搜索失败", e);
    return { list: [], page: pg, pagecount: 0 };
  }
}

async function detail(params) {
  const videoId = params.videoId;
  logInfo(`请求详情 ID: ${videoId}`);

  try {
    let detailUrl = String(videoId || "");
    if (detailUrl.includes("://")) {
      detailUrl = detailUrl;
    } else if (detailUrl.startsWith("/play/") || detailUrl.startsWith("/movie/")) {
      detailUrl = host + detailUrl;
    } else if (detailUrl.startsWith("play/") || detailUrl.startsWith("movie/")) {
      detailUrl = host + "/" + detailUrl;
    } else if (/^\d+$/.test(detailUrl)) {
      detailUrl = `${host}/movie/${detailUrl}.html`;
    } else {
      detailUrl = `${host}/play/${detailUrl}`;
    }

    logInfo(`详情URL: ${detailUrl}`);

    const res = await axiosInstance.get(detailUrl, { headers: def_headers });
    const $ = cheerio.load(res.data);
    const detailVodId = getPlaySlug(detailUrl) || String(videoId || "");

    let title = "";
    const titleSelectors = ["h1", "h2", "title"];
    for (const selector of titleSelectors) {
      const titleElem = $(selector);
      if (titleElem.length > 0) {
        title = cleanText(titleElem.text());
        if (title) break;
      }
    }

    let pic = "";
    pic = $(".video-player[data-poster]").first().attr("data-poster") || "";
    const picSelectors = [".movie-poster img", ".video-player img", "main img[data-src]", "main img[src]", "img[src]"];
    if (!pic) {
      for (const selector of picSelectors) {
        const img = $(selector);
        if (img.length > 0) {
          for (let i = 0; i < img.length; i++) {
            const item = img.eq(i);
            const imgUrl = item.attr("data-original") || item.attr("data-src") || item.attr("src");
            const alt = cleanText(item.attr("alt"));
            if (!isBadPic(imgUrl) && (!title || !alt || title.includes(alt) || alt.includes(title))) {
              pic = imgUrl;
              break;
            }
          }
          if (pic) break;
        }
      }
    }

    if (!pic) {
      for (const selector of picSelectors) {
        const img = $(selector);
        if (img.length > 0) {
          for (let i = 0; i < img.length; i++) {
            const item = img.eq(i);
            const imgUrl = item.attr("data-original") || item.attr("data-src") || item.attr("src");
            if (!isBadPic(imgUrl)) {
              pic = imgUrl;
              break;
            }
          }
          if (pic) break;
        }
      }
    }

    let desc = "";
    const descSelectors = ['h3:contains("剧情简介")', 'h3:contains("简介")', ".intro", ".description", ".desc"];
    for (const selector of descSelectors) {
      const descElem = $(selector);
      if (descElem.length > 0) {
        desc = selector.startsWith("h3")
          ? cleanText(descElem.first().parent().find("p").first().text())
          : cleanText(descElem.first().text());
        if (desc) break;
      }
    }

    let actor = getDetailField($, "主演");
    const actorSelectors = ['li:contains("主演")', 'span:contains("主演") + span'];
    for (const selector of actorSelectors) {
      if (actor) break;
      const actorElem = $(selector);
      if (actorElem.length > 0) {
        actor = actorElem
          .text()
          .trim()
          .replace(/主演[:：]?/g, "")
          .trim();
        if (actor) break;
      }
    }

    let director = getDetailField($, "导演");
    const directorSelectors = ['li:contains("导演")', 'span:contains("导演") + span'];
    for (const selector of directorSelectors) {
      if (director) break;
      const directorElem = $(selector);
      if (directorElem.length > 0) {
        director = directorElem
          .text()
          .trim()
          .replace(/导演[:：]?/g, "")
          .trim();
        if (director) break;
      }
    }

    const playSources = parsePlaySources($, detailVodId);

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
        const videoIdForScrape = String(detailVodId || videoId || "");
        const scrapingResult = await OmniBox.processScraping(videoIdForScrape, title || "", title || "", scrapeCandidates);
        OmniBox.log("info", `[两个BT-DEBUG] 刮削处理完成,结果: ${JSON.stringify(scrapingResult || {}).substring(0, 200)}`);

        const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
        scrapeData = metadata?.scrapeData || null;
        videoMappings = metadata?.videoMappings || [];
        scrapeType = metadata?.scrapeType || "";
        logInfo("刮削元数据读取完成", { hasScrapeData: !!scrapeData, mappingCount: videoMappings.length, scrapeType });
      } catch (e) {
        logError("刮削处理失败", e);
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
          OmniBox.log("info", `[两个BT-DEBUG] 应用刮削后源文件名: ${oldName} -> ${newName}`);
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

    logInfo("详情接口返回数据");

    return {
      list: [
        {
          vod_id: String(detailVodId || videoId),
          vod_name: scrapeData?.title || title || "未知标题",
          vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : fixPicUrl(pic),
          vod_content: scrapeData?.overview || desc || "",
          vod_play_sources: normalizedPlaySources,
          vod_year: "",
          vod_area: "",
          vod_actor: (scrapeData?.credits?.cast || []).slice(0, 5).map((c) => c?.name).filter(Boolean).join(",") || actor || "",
          vod_director:
            (scrapeData?.credits?.crew || [])
              .filter((c) => c?.job === "Director" || c?.department === "Directing")
              .slice(0, 3)
              .map((c) => c?.name)
              .filter(Boolean)
              .join(",") ||
            director ||
            "",
          type_name: "",
        },
      ],
    };
  } catch (e) {
    logError("详情获取失败", e);
    return { list: [] };
  }
}

async function play(params) {
  const rawPlayId = params.playId;
  logInfo(`准备播放 ID: ${rawPlayId}`);

  try {
    let playUrl = rawPlayId;
    let playMeta = {};
    if (rawPlayId && rawPlayId.includes("|||")) {
      const [mainPlayId, metaB64] = rawPlayId.split("|||");
      playUrl = mainPlayId;
      playMeta = decodeMeta(metaB64 || "");
    }

    const legacyCandidate =
      playUrl &&
      !playUrl.includes("://") &&
      !playUrl.startsWith("/") &&
      !playUrl.startsWith("play/") &&
      !playUrl.startsWith("v_play/") &&
      /^[A-Za-z0-9+/=]{10,}$/.test(playUrl);
    let legacyDecoded = "";
    if (legacyCandidate) {
      try {
        legacyDecoded = Buffer.from(playUrl, "base64").toString("utf-8");
      } catch {
        legacyDecoded = "";
      }
    }
    const isLegacyPlayId = legacyCandidate && /(mv_|nm_|v_play)/.test(legacyDecoded);

    // 旧版是 Base64 播放 ID，新版是 /play/slug 页面。
    if (isLegacyPlayId) {
      logInfo(`解码播放ID: ${legacyDecoded}`);
      playUrl = `${host}/v_play/${playUrl}.html`;
    } else if (
      playUrl &&
      !playUrl.includes("://") &&
      !playUrl.startsWith("/") &&
      !playUrl.startsWith("play/") &&
      !playUrl.startsWith("v_play/") &&
      !playUrl.match(/\.(m3u8|mp4|flv|avi|mkv|ts)(?:\?|$)/i)
    ) {
      playUrl = `/play/${playUrl}`;
    }

    try {
      const videoIdFromParam = params.vodId ? String(params.vodId) : "";
      const videoIdFromMeta = playMeta?.sid ? String(playMeta.sid) : "";
      const videoIdForScrape = videoIdFromParam || videoIdFromMeta;
      if (videoIdForScrape) {
        await OmniBox.getScrapeMetadata(videoIdForScrape);
      }
    } catch (e) {
      logInfo(`读取刮削元数据失败: ${e.message}`);
    }

    // 确保URL格式正确
    if (playUrl && !playUrl.startsWith("http")) {
      playUrl = playUrl.startsWith("/") ? host + playUrl : host + "/" + playUrl;
    }

    logInfo(`处理后的播放URL: ${playUrl}`);

    // 检查是否是直接播放链接
    const isDirectPlayable = playUrl.match(/\.(m3u8|mp4|flv|avi|mkv|ts)/i);

    if (isDirectPlayable) {
      logInfo(`直接播放地址`);
      return {
        urls: [{ name: "默认线路", url: playUrl }],
        parse: 0,
        header: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Referer: host + "/",
          Origin: host,
        },
      };
    } else {
      logInfo(`需要解析的播放页`);
      const { url, header } = await OmniBox.sniffVideo(playUrl);
      // 返回播放页URL，让播放器解析
      return {
        urls: [{ name: "默认线路", url: url }],
        parse: 0,
        header: header,
      };
    }
  } catch (e) {
    logError("解析播放地址失败", e);
    // 错误时也构建完整URL
    const fallbackMain = String(rawPlayId || "").split("|||")[0];
    const fallbackUrl = fallbackMain.startsWith("/play/")
      ? host + fallbackMain
      : fallbackMain.startsWith("play/")
        ? host + "/" + fallbackMain
        : `${host}/v_play/${fallbackMain}.html`;
    return {
      urls: [{ name: "默认线路", url: fallbackUrl }],
      parse: 1,
      header: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: host + "/",
        Origin: host,
      },
    };
  }
}

module.exports = { home, category, search, detail, play };

const runner = require("spider_runner");
runner.run(module.exports);

});

_load(1, "影猫仓库", function (module, exports, require) {
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

_load(2, "枝枝影视", function (module, exports, require) {
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

_load(3, "枫叶", function (module, exports, require) {
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

_load(4, "歪比巴卜", function (module, exports, require) {
/**
 * @name 歪比巴卜
 * @key wbbb
 * @type 4
 * @api /video/wbbb
 * @searchable 1
 * @quickSearch 1
 * @changeable 0
 * @version 1.0.7
 * @downloadURL https://github.com/Silent1566/OmniBox-Spider/raw/main/影视/采集/歪比巴卜.js
 */

let OmniBox;
try {
  OmniBox = require('omnibox_sdk');
} catch (_) {
  OmniBox = {
    log(level, message) {
      console.log(`[${level}] ${message}`);
    },
  };
}
let runner;
try {
  runner = require('spider_runner');
} catch (_) {
  runner = { run() {} };
}
const axios = require('axios');
const http = require('http');
const https = require('https');
const CryptoJS = require('crypto-js');

const SITE = {
  key: 'wbbb',
  name: '歪比巴卜',
  api: '/video/wbbb',
  host: 'https://wbbb1.com',
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  timeout: 20000,
};

const CATS = [
  { type_id: '1', type_name: '电影' },
  { type_id: '2', type_name: '剧集' },
  { type_id: '3', type_name: '动漫' },
  { type_id: '4', type_name: '综艺' },
];

const LINE_DIRECT_RE = /^(?:lzm3u8|bfzym3u8)$/i;

const httpClient = axios.create({
  timeout: SITE.timeout,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
  maxRedirects: 0,
  validateStatus: () => true,
  headers: {
    'User-Agent': SITE.ua,
    'Referer': `${SITE.host}/`,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Upgrade-Insecure-Requests': '1',
  },
});

const siteCookies = new Map();

function mergeCookies(setCookie) {
  const items = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
  for (const raw of items) {
    const pair = String(raw || '').split(';')[0].trim();
    const pos = pair.indexOf('=');
    if (pos <= 0) continue;
    const name = pair.slice(0, pos).trim();
    const value = pair.slice(pos + 1).trim();
    if (name) siteCookies.set(name, value);
  }
}

function cookieHeader() {
  return [...siteCookies.entries()]
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function looksLikeCookieChallenge(html = '') {
  const text = String(html || '');
  return text.length <= 1024 && /window\.location\.href\s*=\s*["'](?:https?:\/\/wbbb1\.com)?\//i.test(text);
}

function looksLikeSlideChallenge(html = '') {
  const text = String(html || '');
  return /<title>\s*滑动验证\s*<\/title>/i.test(text)
    && /src=["'][^"']*\/huadong_[^"']*\.js(?:\?[^"']*)?["']/i.test(text);
}

function extractSlideChallengeToken(html) {
  const src = pickMatch(html, /src=["']([^"']*\/huadong_[^"']*\.js(?:\?[^"']*)?)["']/i, 1, '');
  if (!src) return null;
  const path = src.startsWith('/') ? src : `/${src}`;
  const jsUrl = absUrl(path);
  const id = pickMatch(jsUrl, /[?&]id=([0-9]+)/i, 1, '');
  if (!id) return null;
  const key = pickMatch(jsUrl, /([0-9a-f]{8})_([0-9a-f]{32})\.js/i, 2, '');
  if (!key) return null;
  return { jsUrl, id, key };
}

function slideChallengeSignature(value) {
  let text = '';
  for (let i = 0; i <= String(value || '').length - 1; i++) {
    text += String(String(value || '').charCodeAt(i) + 1);
  }
  return CryptoJS.MD5(text).toString();
}

async function resolveSlideChallenge(fullUrl) {
  const firstRes = await httpClient.get(fullUrl, { headers: { Cookie: cookieHeader() } });
  lastStatus = firstRes.status;
  mergeCookies(firstRes.headers?.['set-cookie']);
  if (!looksLikeSlideChallenge(firstRes.data)) return firstRes;

  const token = extractSlideChallengeToken(firstRes.data);
  if (!token) throw new Error('slide challenge token missing');

  const scriptRes = await httpClient.get(token.jsUrl, { headers: { Cookie: cookieHeader(), Referer: fullUrl } });
  lastStatus = scriptRes.status;
  mergeCookies(scriptRes.headers?.['set-cookie']);
  const scriptValue = pickMatch(scriptRes.data, /key=["']([^"']*)["']\s*,\s*value=["']([^"']*)["']/i, 2, '');
  if (!scriptValue) throw new Error('slide challenge value missing');

  const verifyUrl = `https://wbbb1.com/a20be899_96a6_40b2_88ba_32f1f75f1552_yanzheng_huadong.php?type=ad82060c2e67cc7e2cc47552a4fc1242&key=${encodeURIComponent(token.key)}&value=${encodeURIComponent(slideChallengeSignature(scriptValue))}`;
  const verifyRes = await httpClient.get(verifyUrl, { headers: { Cookie: cookieHeader(), Referer: fullUrl } });
  lastStatus = verifyRes.status;
  mergeCookies(verifyRes.headers?.['set-cookie']);

  return await httpClient.get(fullUrl, { headers: { Cookie: cookieHeader(), Referer: `${SITE.host}/` } });
}

async function getHtml(url) {
  const full = /^https?:\/\//.test(url) ? url : `${SITE.host}${url}`;
  let lastStatus = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const cookie = cookieHeader();
    const res = await httpClient.get(full, cookie ? { headers: { Cookie: cookie } } : undefined);
    lastStatus = res.status;
    mergeCookies(res.headers?.['set-cookie']);
    if (res.status >= 200 && res.status < 300 && !looksLikeCookieChallenge(res.data)) {
      return res.data || '';
    }
    if (res.status === 403 && looksLikeSlideChallenge(res.data)) {
      OmniBox.log('info', `[wbbb][html][slide-challenge] url=${redactSensitive(full)}, attempt=${attempt + 1}`);
      const retryRes = await resolveSlideChallenge(full);
      mergeCookies(retryRes.headers?.['set-cookie']);
      if (retryRes.status >= 200 && retryRes.status < 300 && !looksLikeSlideChallenge(retryRes.data)) {
        return retryRes.data || '';
      }
      break;
    }
    if (res.status !== 403 || !cookieHeader()) break;
    OmniBox.log('info', `[wbbb][html][cookie-retry] url=${redactSensitive(full)}, attempt=${attempt + 1}, htmlLength=${String(res.data || '').length}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`HTTP ${lastStatus || 'request failed'}`);
}

function pickMatch(str, reg, idx = 1, def = '') {
  const m = str.match(reg);
  return m ? (m[idx] || def) : def;
}

function stripTags(str = '') {
  return String(str)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSlashText(str = '') {
  return stripTags(str)
    .replace(/\s*\/\s*/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .trim();
}

function escapeRegExp(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toProtocolRelativeUrl(url = '') {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (raw.startsWith('//')) return raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      return `//${u.host}${u.pathname}${u.search}${u.hash}`;
    } catch (_) {}
  }
  if (raw.startsWith('/')) {
    try {
      return `//${new URL(SITE.host).host}${raw}`;
    } catch (_) {}
  }
  return raw;
}

function redactSensitive(value = '') {
  return String(value == null ? '' : value)
    .replace(/([?&](?:url|key|vkey|ckey|token|play|player|auth|sign)=)([^&]+)/ig, '$1[REDACTED]')
    .replace(/(cookie\s*[:=]\s*)([^;\n]+)/ig, '$1[REDACTED]')
    .replace(/[A-Za-z0-9+/=_-]{32,}/g, (token) => `[REDACTED:${token.length}]`);
}

function redactJson(value) {
  try {
    return redactSensitive(JSON.stringify(value));
  } catch (_) {
    return redactSensitive(String(value || ''));
  }
}

function buildCookieHeader(setCookie) {
  return (Array.isArray(setCookie) ? setCookie : [])
    .map((item) => String(item || '').split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

function isInvalidWbbbLineName(name = '') {
  const value = stripTags(String(name || '')).replace(/\s+/g, '').trim();
  return !value || /^(?:排序|选择播放源|切换播放源|更多|展开|收起)$/i.test(value);
}

function buildWbbbEpisode(item = '') {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const playUrl = absUrl(item.playUrl || item.playId || item.url || item.id || '');
    const name = stripTags(item.name || '').trim();
    if (!playUrl || !name) return null;
    return { name, id: playUrl, playId: playUrl, playUrl, url: playUrl };
  }
  const text = String(item || '').trim();
  if (!text) return null;
  const sep = text.indexOf('$');
  if (sep < 0) return null;
  const name = text.slice(0, sep).trim();
  const playUrl = absUrl(text.slice(sep + 1).trim());
  if (!name || !playUrl) return null;
  return { name, id: playUrl, playId: playUrl, playUrl, url: playUrl };
}

function buildWbbbPlaySource(lineName, items, idx = 0) {
  if (isInvalidWbbbLineName(lineName)) return null;
  const name = stripTags(String(lineName || '')).replace(/\s+/g, ' ').trim() || `线路${idx + 1}`;
  const seen = new Set();
  const episodes = [];
  for (const item of Array.isArray(items) ? items : []) {
    const episode = buildWbbbEpisode(item);
    if (!episode || seen.has(episode.playId)) continue;
    seen.add(episode.playId);
    episodes.push(episode);
  }
  if (!episodes.length) return null;
  return {
    name,
    url: episodes.map((episode) => `${episode.name}$${episode.playUrl}`).join('#'),
    episodes,
  };
}

function extractCurrentEpisodeName(html = '', vodName = '') {
  const activeText = stripTags(pickMatch(html, /<a[^>]+module-play-list-link[^"']*active[^"']*[^>]*>([\s\S]*?)<\/a>/i, 1, ''));
  const fallbackText = stripTags(pickMatch(html, /(?:正在播放|当前播放)[^：:]*[：:]\s*([\s\S]*?)(?:<|$)/i, 1, ''));
  let episodeName = activeText || fallbackText;
  if (vodName && episodeName) {
    episodeName = episodeName.replace(new RegExp(`^${escapeRegExp(vodName)}\s*`), '').trim();
    episodeName = episodeName.replace(new RegExp(`^《?${escapeRegExp(vodName)}》?\s*`), '').trim();
  }
  return episodeName.trim();
}

function buildWbbbResolveTitle(html = '', player = {}) {
  const vodName = String(player?.vod_data?.vod_name || '').trim();
  const episodeName = extractCurrentEpisodeName(html, vodName);
  const title = `在线播放${vodName}${episodeName ? ` ${episodeName}` : ''}`.trim();
  return title || vodName || '在线播放';
}

function absUrl(url = '') {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${SITE.host}${url}`;
  return `${SITE.host}/${url}`;
}

function normalizeVodFromCard(block) {
  const vod_id = pickMatch(block, /href="\/detail\/(\d+)\.html"/, 1, '');
  const vod_name = stripTags(pickMatch(block, /<div class="module-(?:poster-item-title|card-item-title)">([\s\S]*?)<\/div>/, 1, '')) || pickMatch(block, /alt="([^"]+)"/, 1, '');
  const vod_pic = absUrl(pickMatch(block, /(?:data-original|data-src|src)="([^"]+)"/, 1, ''));
  const vod_remarks = stripTags(pickMatch(block, /<div class="module-item-note">([\s\S]*?)<\/div>/, 1, ''));
  return { vod_id, vod_name, vod_pic, vod_remarks };
}

function parseCards(html) {
  const list = [];
  const reg = /<a href="\/detail\/(\d+)\.html" title="([^"]+)" class="module-poster-item module-item">([\s\S]*?)<\/a>/g;
  let m;
  while ((m = reg.exec(html)) !== null) {
    const block = m[0];
    list.push({
      vod_id: m[1],
      vod_name: m[2],
      vod_pic: absUrl(pickMatch(block, /(?:data-original|data-src|src)="([^"]+)"/, 1, '')),
      vod_remarks: stripTags(pickMatch(block, /<div class="module-item-note">([\s\S]*?)<\/div>/, 1, '')),
    });
  }
  if (list.length) return list;

  const reg2 = /<div class="module-card-item module-item">([\s\S]*?)<\/div>\s*<\/div>/g;
  while ((m = reg2.exec(html)) !== null) {
    const vod = normalizeVodFromCard(m[1]);
    if (vod.vod_id && vod.vod_name) list.push(vod);
  }
  return list;
}

/**
 * 解析播放标签（线路）名称。
 *
 * 原实现只匹配了两种特定的 HTML 结构，导致在页面结构略有变化时返回空数组，
 * 从而使得后续的播放线路名全部回退为默认的 "线路N"，甚至导致播放列表
 * 完全为空。这里改用更宽松的正则捕获所有带有 `module-tab-item` 类的 div，
 * 优先读取 `data-dropdown-value`，没有则取标签内部文字（去除 HTML）。
 */
function parseTabs(detailHtml) {
  const tabs = [];
  // 捕获包含 class="module-tab-item"（或其它组合） 的 div 块
  const reg = /<div[^>]*class=["'][^"'>]*\bmodule-tab-item\b[^"'>]*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = reg.exec(detailHtml)) !== null) {
    const block = m[0];
    // 先尝试 data-dropdown-value 属性
    const value = pickMatch(block, /data-dropdown-value\s*=\s*['"]([^'"]+)['"]/i, 1, '').trim();
    if (value) {
      if (!isInvalidWbbbLineName(value)) tabs.push(value);
      continue;
    }
    // 否则提取块内部的文字作为名称（去除标签）
    const inner = stripTags(m[1] || '').trim();
    if (inner && !isInvalidWbbbLineName(inner)) tabs.push(inner);
  }
  // 若仍未解析到任何线路，保持空数组，后续逻辑会使用兜底方案
  return tabs;
}

function parsePlayGroups(detailHtml) {
  const groups = [];
  const blockReg = /<div class="module-play-list-content[^\"]*">([\s\S]*?)<\/div>/g;
  let m;
  while ((m = blockReg.exec(detailHtml)) !== null) {
    const block = m[1];
    const items = [];
    const aReg = /<a[^>]+class="module-play-list-link[^\"]*"[^>]+href="([^\"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let a;
    while ((a = aReg.exec(block)) !== null) {
      const href = absUrl(a[1]);
      const label = stripTags(a[2]).trim();
      if (!href || !label) continue;
      items.push(`${label}$${href}`);
    }
    if (items.length) groups.push(items);
  }

  if (groups.length) return groups;

  const hrefOnly = [...detailHtml.matchAll(/<a[^>]+href="([^\"]*\/(?:vplay|play)\/[^\"#]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  if (hrefOnly.length) {
    return [hrefOnly.map((mm) => `${stripTags(mm[2]).trim() || '播放'}$${absUrl(mm[1])}`)];
  }
  return groups;
}

function parsePlayer(html) {
  const patterns = [
    /var\s+player_aaaa\s*=\s*(\{.*?\})<\/script>/s,
    /var\s+player_.*?=\s*(\{.*?\})<\/script>/s,
    /player_aaaa\s*=\s*(\{.*?\})\s*;/s,
    /player_data\s*=\s*(\{.*?\})\s*;/s,
  ];
  for (const reg of patterns) {
    const m = html.match(reg);
    if (!m) continue;
    try { return JSON.parse(m[1]); } catch (_) {}
  }
  return null;
}

function decodePlayUrl(raw, encrypt) {
  let url = String(raw || '').trim();
  const enc = String(encrypt || '').trim();
  if (enc === '1') {
    try { url = unescape(url); } catch (_) {}
  } else if (enc === '2') {
    try { url = Buffer.from(url, 'base64').toString('utf8'); } catch (_) {}
    try { url = unescape(url); } catch (_) {}
  }
  if (url.startsWith('//')) url = `https:${url}`;
  else if (url.startsWith('/')) url = absUrl(url);
  return url;
}

function isDirectMediaUrl(url, fromOrType) {
  const value = String(url || '').trim();
  const hint = String(fromOrType || '').trim();
  if (!value) return false;
  if (/\.(?:m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)(?:[?#]|$)/i.test(value)) return true;
  if (/^(?:m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)$/i.test(hint) && /^https?:\/\//i.test(value)) return true;
  if (LINE_DIRECT_RE.test(hint)) return true;
  try {
    const u = new URL(value);
    return /\.(?:m3u8|mp4|m4v|m4a|mp3|flv|avi|mkv|mov|webm)(?:$|\?)/i.test(u.pathname + u.search);
  } catch (_) {
    return false;
  }
}

function decodeAesMaybeBase64(value = '') {
  const text = String(value || '').trim();
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(text) && text.length % 4 === 0) {
    try { return CryptoJS.enc.Base64.parse(text); } catch (_) {}
  }
  return CryptoJS.enc.Utf8.parse(text);
}

function rc4b64(key, data) {
  const S = [];
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0, x;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key.charCodeAt(i % key.length)) & 255;
    x = S[i]; S[i] = S[j]; S[j] = x;
  }
  let i = 0; j = 0;
  const bytes = Buffer.from(data, 'utf8');
  const res = [];
  for (let c of bytes) {
    i = (i + 1) & 255;
    j = (j + S[i]) & 255;
    x = S[i]; S[i] = S[j]; S[j] = x;
    res.push(c ^ S[(S[i] + S[j]) & 255]);
  }
  return Buffer.from(res).toString('base64');
}

async function resolveWbbbPlayerUrl(playerToken, nextUrl, title, urlNextToken, linkNext) {
  const host = 'xn--qvr2v.850088.xyz';
  const salt = 'stray';
  const urlParam = String(playerToken || '').trim();
  if (!urlParam) throw new Error('playerToken missing');

  const domainNext = String(linkNext || '').trim()
    ? `//wbbb1.com${linkNext}`
    : String(urlNextToken || '').trim() || toProtocolRelativeUrl(nextUrl);
  const parsePageUrl = `https://${host}/player/?url=${encodeURIComponent(urlParam)}&next=${encodeURIComponent(domainNext)}&title=${encodeURIComponent(title || '')}`;

  const parseRes = await httpClient.get(parsePageUrl, {
    headers: { 'User-Agent': SITE.ua, 'Referer': `${SITE.host}/` },
  });
  const parserCookie = buildCookieHeader(parseRes.headers?.['set-cookie']);

  const t = String(Math.floor(Date.now() / 1000));
  const md5 = (s) => CryptoJS.MD5(String(s)).toString();
  const rc4key = (md5(urlParam) + ' P').slice(-22);

  const formPayload = {
    url: urlParam,
    key: rc4b64(rc4key, md5(urlParam + salt)),
    vkey: rc4b64(rc4key, t + md5(rc4key + salt)),
    ckey: rc4b64(rc4key, md5(host + salt)),
  };

  const apiUrl = `https://${host}/player/api.php`;
  const formData = new URLSearchParams(formPayload).toString();
  const apiRes = await httpClient.post(apiUrl, formData, {
    headers: {
      'User-Agent': SITE.ua,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': parsePageUrl,
      'Origin': `https://${host}`,
      ...(parserCookie ? { Cookie: parserCookie } : {}),
    },
  });

  const payload = typeof apiRes.data === 'string' ? JSON.parse(apiRes.data) : apiRes.data;
  if (!payload || !payload.url) {
    throw new Error(payload && payload.msg ? payload.msg : 'parse api failed');
  }

  const key = CryptoJS.enc.Utf8.parse('OddfJktEbGu7gCv9');
  const iv = CryptoJS.enc.Utf8.parse('okjutU3RjGpWqB8Z');
  const decryptResult = CryptoJS.AES.decrypt(payload.url, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const finalUrl = (decryptResult.toString(CryptoJS.enc.Utf8) || '').trim();

  if (!finalUrl) throw new Error('decrypt failed');
  let resultUrl = finalUrl;
  if (finalUrl.startsWith('//')) resultUrl = `https:${finalUrl}`;
  else if (finalUrl.startsWith('/')) resultUrl = `${SITE.host}${finalUrl}`;
  return { url: resultUrl, type: payload.type || '', parsePageUrl, cookie: parserCookie };
}

async function home(params = {}) {
  OmniBox.log('info', `[wbbb][home] params=${JSON.stringify(params)}`);
  try {
    const html = await getHtml('/');
    const list = parseCards(html).slice(0, 40);
    return { class: CATS, list };
  } catch (e) {
    OmniBox.log('error', `[wbbb][home] error=${e.message}`);
    return { class: CATS, list: [], error: e.message || String(e) };
  }
}

async function category(params = {}) {
  OmniBox.log('info', `[wbbb][category] params=${JSON.stringify(params)}`);
  try {
    const id = params.id || params.t || params.type_id || params.categoryId || '1';
    const page = parseInt(params.page || params.pg || '1', 10) || 1;
    const path = page > 1 ? `/show/${id}--------${page}---.html` : `/show/${id}-----------.html`;
    OmniBox.log('info', `[wbbb][category] url=${SITE.host}${path}`);
    const html = await getHtml(path);
    const list = parseCards(html);
    OmniBox.log('info', `[wbbb][category] id=${id} page=${page} count=${list.length}`);
    const hasNext = html.includes('title="下一页"');
    return { list, page, pagecount: hasNext ? page + 1 : page, total: list.length };
  } catch (e) {
    OmniBox.log('error', `[wbbb][category] error=${e.message}`);
    const page = parseInt(params.page || params.pg || '1', 10) || 1;
    return { list: [], page, pagecount: page, total: 0, error: e.message || String(e) };
  }
}

async function detail(params = {}) {
  OmniBox.log('info', `[wbbb][detail][01] 入口参数 params=${JSON.stringify(params)}`);
  try {
    OmniBox.log('info', '[wbbb][detail][02] 开始解析视频 ID');
    let ids = [];
    if (Array.isArray(params.id)) ids = params.id;
    else if (Array.isArray(params.ids)) ids = params.ids;
    else if (params.ids) ids = String(params.ids).split(',').map((s) => s.trim()).filter(Boolean);
    else if (params.id) ids = String(params.id).split(',').map((s) => s.trim()).filter(Boolean);
    else if (params.vod_id) ids = String(params.vod_id).split(',').map((s) => s.trim()).filter(Boolean);
    else if (params.videoId) ids = String(params.videoId).split(',').map((s) => s.trim()).filter(Boolean);
    else if (params.video_id) ids = String(params.video_id).split(',').map((s) => s.trim()).filter(Boolean);
    OmniBox.log('info', `[wbbb][detail][03] 解析到 ids=${JSON.stringify(ids)}`);

    if (!ids.length) {
      OmniBox.log('warn', '[wbbb][detail][04] 未解析到任何视频 ID，直接返回空列表');
      return { list: [] };
    }

    const list = [];
    for (const rawId of ids) {
      const mediaId = String(rawId).trim();
      const detailPath = `/detail/${mediaId}.html`;
      OmniBox.log('info', `[wbbb][detail][05] 准备请求详情页 mediaId=${mediaId}, url=${SITE.host}${detailPath}`);
      const html = await getHtml(detailPath);
      OmniBox.log('info', `[wbbb][detail][06] 详情页请求完成 mediaId=${mediaId}, htmlLength=${String(html || '').length}, hasVplay=${String(html || '').includes('/vplay/')}`);

      OmniBox.log('info', '[wbbb][detail][07] 开始解析基础信息：标题/封面/简介/标签/导演/主演');
      const vod_name = stripTags(pickMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/, 1, ''));
      const vod_pic = absUrl(pickMatch(html, /<div class="module-item-pic">[\s\S]*?<img[^>]+data-original="([^\"]+)"/, 1, ''))
        || absUrl(pickMatch(html, /<div class="module-item-pic">[\s\S]*?<img[^>]+(?:data-src|src)="([^\"]+)"/, 1, ''));
      const vod_content = stripTags(pickMatch(html, /<div class="module-info-introduction-content[^>]*>([\s\S]*?)<\/div>/, 1, ''));
      const tagLinks = [...html.matchAll(/<div class="module-info-tag-link">([\s\S]*?)<\/div>/g)].map(x => x[1]);
      const vod_year = stripTags(tagLinks[0] || '');
      const vod_area = stripTags(tagLinks[1] || '');
      const vod_type = cleanSlashText(tagLinks[2] || '');
      const vod_remarks = stripTags(pickMatch(html, /<div class="module-item-note">([\s\S]*?)<\/div>/, 1, '')) || stripTags(pickMatch(html, /\u66f4\u65b0\u81f3[^<\s]+/, 0, ''));
      const vod_director = cleanSlashText(pickMatch(html, /\u5bfc\u6f14：[\s\S]*?<div[^>]*class="module-info-item-content">([\s\S]*?)<\/div>/, 1, ''));
      const vod_actor = cleanSlashText(pickMatch(html, /\u4e3b\u6f14：[\s\S]*?<div[^>]*class="module-info-item-content">([\s\S]*?)<\/div>/, 1, ''));
      OmniBox.log('info', `[wbbb][detail][08] 基础信息完成 mediaId=${mediaId}, name=${vod_name || '空'}, pic=${vod_pic ? '有' : '空'}, contentLen=${vod_content.length}, tags=${tagLinks.length}`);

      OmniBox.log('info', '[wbbb][detail][09] 开始解析播放线路 tabs');
      const tabs = parseTabs(html);
      OmniBox.log('info', `[wbbb][detail][10] tabs 解析完成 count=${tabs.length}, tabs=${tabs.join(' / ') || '空'}`);

      OmniBox.log('info', '[wbbb][detail][11] 开始解析播放分组 groups');
      const groups = parsePlayGroups(html);
      OmniBox.log('info', `[wbbb][detail][12] groups 解析完成 count=${groups.length}, episodeCounts=${groups.map(g => g.length).join('/') || '空'}`);

      let playSources = [];
      OmniBox.log('info', '[wbbb][detail][13] 开始组装 vod_play_from / vod_play_url');
      groups.forEach((items, idx) => {
        const lineName = tabs[idx] || `线路${idx + 1}`;
        const source = buildWbbbPlaySource(lineName, items, idx);
        if (!source) {
          OmniBox.log('warn', `[wbbb][detail][13-${idx}] 跳过无效播放组 idx=${idx}, lineName=${lineName}, itemCount=${Array.isArray(items) ? items.length : 0}`);
          return;
        }
        playSources.push(source);
      });
      // 如果结构化分组解析失败，再直接抓取页面中所有 /vplay/ 或 /play/ 链接作为单线路兜底。
      if (playSources.length === 0) {
        const seenFallback = new Set();
        const fallbackItems = [...html.matchAll(/<a[^>]+href=["']([^"']*\/(?:vplay|play)\/[^"']+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi)]
          .map((m, index) => {
            const href = absUrl(m[1]);
            const name = stripTags(m[2]).trim() || `第${index + 1}集`;
            if (!href || seenFallback.has(href)) return '';
            seenFallback.add(href);
            return `${name}$${href}`;
          })
          .filter(Boolean);
        const fallbackSource = buildWbbbPlaySource(tabs[0] || '播放线路', fallbackItems, 0);
        if (fallbackSource) {
          playSources = [fallbackSource];
          OmniBox.log('info', `[wbbb][detail][fallback] 结构化线路为空，捕获到 ${fallbackSource.episodes.length} 条 vplay/play 链接作为兜底线路`);
        }
      }
      const playFrom = playSources.map((source) => source.name);
      const playUrl = playSources.map((source) => source.url);
      const vodPlayFrom = playFrom.join('$$$');
      const vodPlayUrl = playUrl.join('$$$');
      OmniBox.log('info', `[wbbb][detail][14] 播放字段组装完成 fromCount=${playFrom.length}, urlGroupCount=${playUrl.length}, vod_play_url_length=${vodPlayUrl.length}, firstLine=${playFrom[0] || '空'}, firstEpisode=${playSources[0]?.episodes?.[0]?.playId || '空'}`);

      const vod = {
        videoId: mediaId,
        id: mediaId,
        vod_id: mediaId,
        vod_name,
        vod_pic,
        type_name: vod_type,
        vod_year,
        vod_area,
        vod_remarks,
        vod_actor,
        vod_director,
        vod_content,
        vod_play_from: vodPlayFrom,
        vod_play_url: vodPlayUrl,
        vod_play_list: playSources.map((source) => ({
          name: source.name,
          url: source.url,
          episodes: source.episodes.map((episode) => ({ ...episode })),
        })),
        vod_play_sources: playSources.map((source) => ({
          name: source.name,
          episodes: source.episodes.map((episode) => ({ ...episode })),
        })),
      };
      OmniBox.log('info', `[wbbb][detail][15] 结果对象完成 mediaId=${mediaId}, has_vod_play_from=${!!vod.vod_play_from}, has_vod_play_url=${!!vod.vod_play_url}, vod_play_list_count=${vod.vod_play_list.length}, vod_play_sources_count=${vod.vod_play_sources.length}`);
      OmniBox.log('info', `[wbbb][detail][final] 完整返回数据: ${JSON.stringify(vod, null, 2)}`);
      if (!vod.vod_play_url) {
        OmniBox.log('warn', `[wbbb][detail][16] 未生成 vod_play_url：htmlLength=${html.length}, hasVplay=${html.includes('/vplay/')}, tabs=${tabs.length}, groups=${groups.length}`);
      }
      list.push(vod);
    }
    OmniBox.log('info', `[wbbb][detail][17] 即将返回 list，总数=${list.length}, firstName=${list[0]?.vod_name || '空'}, firstPlayFrom=${list[0]?.vod_play_from || '空'}, firstPlayUrlLen=${list[0]?.vod_play_url?.length || 0}`);
    return { list };
  } catch (e) {
    OmniBox.log('error', `[wbbb][detail][ERR] error=${e.message}, stack=${e.stack || ''}`);
    return { list: [], error: e.message || String(e) };
  }
}

async function search(params = {}) {
  OmniBox.log('info', `[wbbb][search] params=${JSON.stringify(params)}`);
  try {
    const wd = params.wd || params.keyword || params.key || '';
    const page = parseInt(params.page || params.pg || '1', 10) || 1;
    if (!wd) return { list: [], page, pagecount: page, total: 0 };
    const path = page > 1 ? `/search/-------------.html?wd=${encodeURIComponent(wd)}&page=${page}` : `/search/-------------.html?wd=${encodeURIComponent(wd)}`;
    OmniBox.log('info', `[wbbb][search] url=${SITE.host}${path}`);
    const html = await getHtml(path);
    const list = parseCards(html);
    return { list, page, pagecount: list.length >= 20 ? page + 1 : page, total: list.length };
  } catch (e) {
    const page = parseInt(params.page || params.pg || '1', 10) || 1;
    OmniBox.log('error', `[wbbb][search] error=${e.message}`);
    return { list: [], page, pagecount: page, total: 0, error: e.message || String(e) };
  }
}

function buildPlayHeaders(extra = {}) {
  const headers = {
    'User-Agent': SITE.ua,
    Referer: `${SITE.host}/`,
    Origin: SITE.host,
  };
  return Object.assign(headers, extra || {});
}

function buildAppSniffFallback(sniffUrl, headers = {}) {
  const finalHeaders = buildPlayHeaders(headers);
  return {
    parse: 1,
    jx: 1,
    url: sniffUrl,
    playId: sniffUrl,
    urls: [{ name: '嗅探线路', url: sniffUrl, playId: sniffUrl }],
    header: finalHeaders,
  };
}

async function play(params = {}) {
  OmniBox.log('info', `[wbbb][play][start] raw params=${JSON.stringify(params)}`);
  const rawId = params.id || params.playId || params.play || params.url || (typeof params === 'string' ? params : '');
  if (!rawId) {
    OmniBox.log('error', '[wbbb][play][ERR] No identifier provided in params');
    return { parse: 1, jx: 1, url: '', playId: '', error: 'Missing playback identifier' };
  }
  const id = /^https?:\/\//i.test(rawId) ? rawId : absUrl(rawId);
  OmniBox.log('info', `[wbbb][play][id] rawId=${String(rawId).slice(0, 120)}, normalized=${id}`);
  try {
    const html = await getHtml(id);
    const player = parsePlayer(html);
    OmniBox.log('info', `[wbbb][play] player url=${redactSensitive(player?.url || '')} from=${player?.from || ''}`);
    // If player parsing fails, try SDK sniff directly on the vplay page
    if (!player) {
      if (typeof OmniBox.sniffVideo === 'function') {
        try {
          const sniffed = await OmniBox.sniffVideo(id, { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` });
          if (sniffed?.url) {
            return { parse: 0, jx: 0, url: sniffed.url, playId: sniffed.url, header: sniffed.header || { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
          }
        } catch (e) {
          await OmniBox.log('warn', `[wbbb][play] sdk sniff failed: ${e.message || e}`);
        }
      }
      // final fallback: app sniff format
      const fallback = { parse: 0, jx: 0, url: id, playId: id, header: { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
      OmniBox.log('info', `[wbbb][play][fallback] ${redactJson(fallback)}`);
      return fallback;
    }
    // Attempt direct media URL
    const from = String(player.from || '').trim();
    const title = buildWbbbResolveTitle(html, player);
    OmniBox.log('info', `[wbbb][play][resolve-meta] current=${redactSensitive(id)}, from=${from}, title=${title}`);

    // 尝试通过静态 playerconfig.js 获取解析地址（在 SDK 嗅探前）
    const parseCandidates = [
      '/static/js/playerconfig.js',
      `/static/player/${from}.js`,
      '/static/player/config.js',
      '/js/playerconfig.js',
      '/player/config.js',
    ];
    for (const p of parseCandidates) {
      try {
        const conf = await getHtml(p);
        const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regs = [
          new RegExp(`player_list\\s*\\[\\s*['\"]${escapedFrom}['\"]\\s*\\]\\s*=\\s*\\{[\\s\\S]*?parse\\s*[:=]\\s*['\"]([^'\"]+)['\"]`, 'i'),
          new RegExp(`${escapedFrom}[\\s\\S]*?parse\\s*[:=]\\s*['\"]([^'\"]+)['\"]`, 'i'),
          new RegExp(`"${escapedFrom}"\\s*:\\s*\\{[\\s\\S]*?"parse"\\s*[:=]\\s*"([^\"]*)"`, 'i'),
          /MacPlayerConfig[\s\S]*?parse['"]?\s*[:=]\s*['"]([^'\"]+)['"]/i,
        ];
        for (const reg of regs) {
          const m = conf.match(reg);
          if (m && typeof m[1] === 'string') {
            const prefix = m[1].trim();
            if (prefix) {
              const jump = /^https?:\/\//i.test(prefix)
                ? `${prefix}${encodeURIComponent(player.url)}`
                : absUrl(`${prefix}${encodeURIComponent(player.url)}`);
              if (isDirectMediaUrl(jump, from)) {
                return { parse: 0, jx: 0, url: jump, playId: jump, header: { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
              }
              // otherwise continue to other fallback mechanisms
            }
          }
        }
      } catch (_) {}
    }
    const directUrl = decodePlayUrl(player.url, player.encrypt);
    if (isDirectMediaUrl(directUrl, from)) {
      return { parse: 0, jx: 0, url: directUrl, playId: directUrl, header: { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
    }
    // parse API handling
    const parseApi = String(player.parse || player.jx || '').trim();
    if (parseApi) {
      const jump = /^https?:\/\//i.test(parseApi)
        ? `${parseApi}${encodeURIComponent(directUrl)}`
        : absUrl(`${parseApi}${encodeURIComponent(directUrl)}`);
      return { parse: 0, jx: 0, url: jump, playId: jump, header: { 'User-Agent': SITE.ua, Referer: `${SITE.host}/` } };
    }
    // Resolve via external service
    let resolved = null;
    try {
      resolved = await resolveWbbbPlayerUrl(String(player.url || ''), '', title, String(player.url_next || '').trim(), String(player.link_next || '').trim());
    } catch (_) {}
    // If we got a resolved URL, prefer direct media return for tvbox/非 sniff 宿主
    if (resolved && resolved.url) {
      const resolvedUrl = String(resolved.url || '').trim();
      const resolvedType = String(resolved.type || '').trim();
      const resolvedHeaders = buildPlayHeaders({
        Referer: resolved.parsePageUrl || `${SITE.host}/`,
        ...(resolved.cookie ? { Cookie: resolved.cookie } : {}),
      });
      OmniBox.log('info', `[wbbb][play][resolved] url=${redactSensitive(resolvedUrl)}, type=${resolvedType || 'unknown'}, parsePage=${redactSensitive(resolved.parsePageUrl || '')}, hasCookie=${!!resolved.cookie}`);
      if (isDirectMediaUrl(resolvedUrl, resolvedType)) {
        return { parse: 0, jx: 0, url: resolvedUrl, playId: resolvedUrl, header: resolvedHeaders };
      }
      if (typeof OmniBox.sniffVideo === 'function') {
        try {
          const sniffed = await OmniBox.sniffVideo(resolvedUrl, resolvedHeaders);
          if (sniffed?.url) {
            return { parse: 0, jx: 0, url: sniffed.url, playId: sniffed.url, header: sniffed.header || resolvedHeaders };
          }
        } catch (e) {
          await OmniBox.log('warn', `[wbbb][play] sdk sniff on resolved failed: ${e.message || e}`);
        }
      }
      // fallback on resolved URL
      return buildAppSniffFallback(resolvedUrl, resolvedHeaders);
    }
    // No resolved URL – final fallback on original id
    if (typeof OmniBox.sniffVideo === 'function') {
      try {
        const fallbackHeaders = buildPlayHeaders();
        const sniffed = await OmniBox.sniffVideo(id, fallbackHeaders);
        if (sniffed?.url) {
          return { parse: 0, jx: 0, url: sniffed.url, playId: sniffed.url, header: sniffed.header || fallbackHeaders };
        }
      } catch (e) {
        await OmniBox.log('warn', `[wbbb][play] final sdk sniff failed: ${e.message || e}`);
      }
    }
    const fallback = { parse: 0, jx: 0, url: id, playId: id, header: buildPlayHeaders() };
    OmniBox.log('info', `[wbbb][play][fallback] ${redactJson(fallback)}`);
    return fallback;
  } catch (e) {
    return { parse: 1, jx: 1, url: id, playId: id, error: e.message || String(e) };
  }
}

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

});

_load(5, "毒舌03", function (module, exports, require) {
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
