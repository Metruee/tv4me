// @name 影视采集F(合并9源)
// @version 3.20261101.2127
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


_load(0, "4KMP", function (module, exports, require) {
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

_load(1, "HDmoli", function (module, exports, require) {
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

_load(2, "乐兔", function (module, exports, require) {
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

_load(3, "凡客TV", function (module, exports, require) {
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

_load(4, "太二影视", function (module, exports, require) {
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

_load(6, "热播", function (module, exports, require) {
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

_load(7, "莫小影", function (module, exports, require) {
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

_load(8, "金牌", function (module, exports, require) {
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
