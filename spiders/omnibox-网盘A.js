// @name 网盘影视A(合并6源)
// @version 2.20261030.1
// @description 自动同步：网盘聚合
// @downloadURL https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/spiders/omnibox-网盘A.js
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


_load(0, "4K指南", function (module, exports, require) {
// @name 4K指南
// @author 梦
// @description 网盘资源站：https://4kzn.cc ，支持首页、分类、详情、搜索、网盘播放、刮削、弹幕、播放记录
// @version 1.2.3
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/网盘/4K指南.js
// @dependencies cheerio

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const cheerio = require("cheerio");

const HOST = process.env.K4ZN_HOST || "https://4kzn.cc";
const UA = process.env.K4ZN_UA || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": UA,
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Referer: `${HOST}/`,
};

const DRIVE_TYPE_CONFIG = splitConfigList(process.env.DRIVE_TYPE_CONFIG || "quark;uc");
const SOURCE_NAMES_CONFIG = splitConfigList(process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连");
const DRIVE_ORDER = splitConfigList(process.env.DRIVE_ORDER || "baidu;tianyi;quark;uc;115;xunlei;ali;123pan").map((s) => s.toLowerCase());
const EXTERNAL_SERVER_PROXY_ENABLED = String(process.env.EXTERNAL_SERVER_PROXY_ENABLED || "false").toLowerCase() === "true";

const VIDEO_EXTENSIONS = [
  ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".m4v", ".mpg", ".mpeg", ".rmvb", ".ts", ".m2ts", ".webm", ".iso",
];

const CLASS_LIST = [
  { type_id: "books/top250", type_name: "豆瓣TOP250" },
  { type_id: "books/zuixin", type_name: "最新" },
  { type_id: "books/zuixin-juji", type_name: "最新剧集" },
  { type_id: "books/xiliehj", type_name: "系列合集" },
  { type_id: "books/manwei", type_name: "漫威电影系列合集" },
  { type_id: "books/mztkn", type_name: "名侦探柯南剧场版合集" },
  { type_id: "books/hanniba", type_name: "汉尼拔合集" },
];

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

function splitConfigList(value) {
  return String(value || "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

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

function formatFileSize(size) {
  const n = Number(size || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n}B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(2)}KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)}MB`;
  if (n < 1024 ** 4) return `${(n / 1024 ** 3).toFixed(2)}GB`;
  return `${(n / 1024 ** 4).toFixed(2)}TB`;
}

function encodePlayMeta(meta) {
  try {
    return Buffer.from(JSON.stringify(meta || {}), "utf8").toString("base64");
  } catch (_) {
    return "";
  }
}

function decodePlayMeta(meta) {
  try {
    return JSON.parse(Buffer.from(String(meta || ""), "base64").toString("utf8") || "{}");
  } catch (_) {
    return {};
  }
}

function buildScrapedFileName(scrapeData, mapping, originalFileName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalFileName;
  }

  if (!scrapeData || !scrapeData.title) {
    return originalFileName;
  }

  if (scrapeData.type === "tv" || mapping.seasonNumber) {
    const seasonNum = mapping.seasonNumber || 1;
    const epNum = mapping.episodeNumber || 1;
    const seasonAirYear = scrapeData.seasonAirYear || "";
    let name = `${scrapeData.title}`;
    if (seasonAirYear) name += `.${seasonAirYear}`;
    name += `.S${String(seasonNum).padStart(2, "0")}E${String(epNum).padStart(2, "0")}`;
    return name;
  }

  return scrapeData.title || originalFileName;
}

function normalizeEpisodeName(episodeName) {
  if (!episodeName) return "";
  return String(episodeName)
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/（[^）]*）/g, " ")
    .replace(/第\s*([0-9一二三四五六七八九十百千零〇两]+)\s*[集话期]/g, "E$1")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFileNameForDanmu(vodName, episodeTitle) {
  const title = cleanText(vodName || "");
  const episode = normalizeEpisodeName(episodeTitle || "");
  if (!title) return episode;
  if (!episode || title.includes(episode)) return title;
  return `${title} ${episode}`;
}

function buildPlayHistoryPayload({ sourceId, vodId, title, pic, episode, episodeName, episodeNumber }) {
  if (!sourceId || !vodId) return null;
  return {
    vodId,
    title: title || "",
    pic: pic || "",
    episode,
    sourceId,
    episodeNumber: typeof episodeNumber === "number" ? episodeNumber : undefined,
    episodeName: episodeName || "",
  };
}

function getBaseURLHost(context = {}) {
  const baseURL = String(context?.baseURL || "").trim();
  if (!baseURL) return "";
  try {
    return new URL(baseURL).hostname.toLowerCase();
  } catch (_) {
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

function resolveCallerSource(params = {}, context = {}) {
  return String(context?.from || params?.source || "").toLowerCase();
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
      const parts = flag.split("-");
      routeType = parts[parts.length - 1];
    } else {
      routeType = flag;
    }
  }

  if (!validRouteTypes.has(routeType)) routeType = "直连";
  if (!allowServerProxy && routeType === "服务端代理") routeType = "直连";
  if (callerSource === "uz" && routeType === "本地代理") routeType = "直连";

  return routeType;
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

function sortPlaySourcesByDriveOrder(playSources = []) {
  if (!Array.isArray(playSources) || playSources.length <= 1 || DRIVE_ORDER.length === 0) return playSources;
  const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
  return [...playSources].sort((a, b) => {
    const aType = inferDriveTypeFromSourceName(a?.name || "");
    const bType = inferDriveTypeFromSourceName(b?.name || "");
    const aOrder = orderMap.has(aType) ? orderMap.get(aType) : Number.MAX_SAFE_INTEGER;
    const bOrder = orderMap.has(bType) ? orderMap.get(bType) : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return 0;
  });
}

function isVideoFile(file = {}) {
  const name = String(file.file_name || file.name || "").toLowerCase();
  const hasVideoExt = VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
  const sdkFileFlag = file.file === 1 || file.file === true || file.is_file === 1 || file.isFile === 1;
  return hasVideoExt || (sdkFileFlag && hasVideoExt);
}

function isFolderLike(file = {}) {
  if (
    file.is_dir === 1 || file.isDir === 1 || file.dir === 1 || file.dir === true ||
    file.folder === 1 || file.folder === true || file.is_folder === 1
  ) {
    return true;
  }
  const type = String(file.type || file.obj_type || file.category || file.file_type || "").toLowerCase();
  return type.includes("dir") || type.includes("folder");
}

async function getAllVideoFiles(shareURL, files, depth = 0, seen = new Set()) {
  if (!Array.isArray(files) || !files.length || depth > 8) return [];

  const videos = [];
  for (const file of files) {
    const fid = String(file.fid || file.file_id || file.id || "").trim();
    if (!fid) continue;

    if (isVideoFile(file)) {
      videos.push({
        fid,
        file_name: String(file.file_name || file.name || fid),
        size: Number(file.size || file.file_size || 0),
      });
      continue;
    }

    if (isFolderLike(file)) {
      const key = `${shareURL}|${fid}`;
      if (seen.has(key)) continue;
      seen.add(key);

      try {
        const subFileList = await OmniBox.getDriveFileList(shareURL, fid);
        const subFiles = Array.isArray(subFileList?.files) ? subFileList.files : Array.isArray(subFileList) ? subFileList : [];
        if (subFiles.length) {
          const nested = await getAllVideoFiles(shareURL, subFiles, depth + 1, seen);
          if (nested.length) videos.push(...nested);
        }
      } catch (e) {
        await OmniBox.log("warn", `[4K指南][detail] 读取子目录失败 share=${shareURL} fid=${fid}: ${e.message}`);
      }
    }
  }

  return videos;
}

function dedupeEpisodes(episodes = []) {
  const seen = new Set();
  const result = [];
  for (const ep of episodes) {
    const key = `${ep.playId}@@${ep.name}`;
    if (!ep.playId || seen.has(key)) continue;
    seen.add(key);
    result.push(ep);
  }
  return result;
}

async function requestText(url, options = {}) {
  const res = await OmniBox.request(url, {
    method: options.method || "GET",
    headers: {
      ...HEADERS,
      ...(options.headers || {}),
      Referer: options.referer || `${HOST}/`,
    },
    timeout: options.timeout || 20000,
    body: options.body,
  });
  const statusCode = Number(res?.statusCode || 0);
  const text = getBodyText(res);
  if (statusCode < 200 || statusCode >= 400) {
    throw new Error(`HTTP ${statusCode} @ ${url}`);
  }
  return text;
}

function extractItems(html) {
  const $ = cheerio.load(html);
  const list = [];
  const seen = new Set();

  $("article.posts-item.book-item, article.posts-item.sites-item, article.posts-item").each((_, el) => {
    const a = $(el).find("a.item-image, h3.item-title a, a[target='_blank']").first();
    const href = absUrl(a.attr("href") || "");
    const title = cleanText($(el).find(".item-title a").first().text() || a.text() || $(el).attr("data-title") || "");
    if (!href || !title || seen.has(href)) return;
    seen.add(href);

    const img = absUrl($(el).find("img").first().attr("data-src") || $(el).find("img").first().attr("src") || "");
    const desc = cleanText($(el).find(".line1.text-muted.text-xs, .book-info, .item-desc, .sub-title").first().text());

    list.push({
      vod_id: href,
      vod_name: title,
      vod_pic: img,
      vod_remarks: desc,
      vod_content: "",
    });
  });

  return list;
}

function extractPager(html) {
  const pagecountMatch = html.match(/\/books\/[^"']+\/page\/(\d+)/g);
  const pages = pagecountMatch ? pagecountMatch.map((s) => Number((s.match(/(\d+)$/) || [0, 1])[1] || 1)) : [];
  const maxPage = pages.length ? Math.max(...pages) : 1;
  const hasNext = /class="next-page[^>]*>\s*<a[^>]*href="[^"]+\/page\/\d+"/i.test(html);
  return { pagecount: Math.max(maxPage, hasNext ? maxPage + 1 : 1) };
}

async function home(params, context) {
  try {
    const html = await requestText(`${HOST}/`);
    const list = extractItems(html).slice(0, 24);
    return { class: CLASS_LIST, filters: {}, list };
  } catch (e) {
    await OmniBox.log("error", `[4K指南][home] ${e.message}`);
    return { class: CLASS_LIST, filters: {}, list: [] };
  }
}

async function category(params, context) {
  try {
    const tid = String(params.categoryId || params.type_id || "books/zuixin").replace(/^\/+/, "");
    const page = Math.max(1, parseInt(params.page || 1, 10));
    const url = page > 1 ? `${HOST}/${tid}/page/${page}` : `${HOST}/${tid}`;
    const html = await requestText(url);
    const list = extractItems(html);
    const { pagecount } = extractPager(html);
    return { page, pagecount, total: pagecount * Math.max(list.length, 1), list };
  } catch (e) {
    await OmniBox.log("error", `[4K指南][category] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params, context) {
  try {
    const id = String(params.videoId || params.id || params.url || "").trim();
    if (!id) return { list: [] };

    const source = resolveCallerSource(params, context);
    const detailUrl = /^https?:\/\//i.test(id) ? id : absUrl(id);
    const html = await requestText(detailUrl);
    const $ = cheerio.load(html);

    const title = cleanText($("h1, h2, .book-title").first().text()) || cleanText($("meta[property='og:title']").attr("content") || "");
    const pic = absUrl($(".book-cover img, meta[property='og:image']").first().attr("data-src") || $(".book-cover img, meta[property='og:image']").first().attr("content") || $(".book-cover img").first().attr("src") || "");
    const desc = cleanText($("meta[name='description']").attr("content") || $(".panel-body.single").text());

    const shareLinks = [];
    const seenLinks = new Set();
    $(".site-go a[target='_blank'], a[target='_blank'][href*='pan.quark.cn'], a[href*='quark.cn'], a[href*='uc.cn'], a[href*='aliyundrive.com'], a[href*='115.com']").each((_, el) => {
      const href = absUrl($(el).attr("href") || "");
      if (!href || seenLinks.has(href)) return;
      seenLinks.add(href);
      shareLinks.push(href);
    });

    if (!shareLinks.length) {
      const fallbackLink = $("a.external[href*='pan.quark.cn'], a[href*='pan.quark.cn'], a[href*='quark.cn']").first();
      const href = absUrl(fallbackLink.attr("href") || "");
      if (href) shareLinks.push(href);
    }

    const driveTypeCountMap = {};
    const rawDriveInfos = [];

    for (const shareURL of shareLinks) {
      let driveInfo = null;
      try {
        driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
      } catch (_) {
        driveInfo = null;
      }
      const displayName = driveInfo?.displayName || "网盘";
      driveTypeCountMap[displayName] = (driveTypeCountMap[displayName] || 0) + 1;
      rawDriveInfos.push({ shareURL, driveInfo, displayName });
    }

    const driveTypeCurrentIndexMap = {};
    const filesForScraping = [];
    let playSources = [];

    for (const item of rawDriveInfos) {
      const { shareURL, driveInfo } = item;
      let displayName = item.displayName;

      if ((driveTypeCountMap[displayName] || 0) > 1) {
        driveTypeCurrentIndexMap[displayName] = (driveTypeCurrentIndexMap[displayName] || 0) + 1;
        displayName = `${displayName}${driveTypeCurrentIndexMap[displayName]}`;
      }

      let allVideoFiles = [];
      try {
        const rootFileList = await OmniBox.getDriveFileList(shareURL, "0");
        const rootFiles = Array.isArray(rootFileList?.files) ? rootFileList.files : Array.isArray(rootFileList) ? rootFileList : [];
        allVideoFiles = await getAllVideoFiles(shareURL, rootFiles, 0, new Set());
        await OmniBox.log("info", `[4K指南][detail] share=${shareURL} rootFiles=${rootFiles.length} videoFiles=${allVideoFiles.length}`);
      } catch (e) {
        await OmniBox.log("warn", `[4K指南][detail] 扫描网盘文件失败: ${e.message}`);
      }

      const episodes = dedupeEpisodes(allVideoFiles.map((file) => {
        const sizeText = formatFileSize(file.size);
        const episodeName = cleanText(String(file.file_name || "资源").replace(/\.[^.]+$/, "")) || "资源";
        const displayFileName = sizeText ? `[${sizeText}] ${file.file_name}` : file.file_name;
        const playMeta = encodePlayMeta({
          sid: detailUrl,
          t: title,
          p: pic,
          e: episodeName,
        });
        const formattedFileId = `${shareURL}|${file.fid}`;
        if (file.fid && !filesForScraping.some((item) => item.fid === formattedFileId)) {
          filesForScraping.push({
            file_name: episodeName,
            fid: formattedFileId,
            file_id: formattedFileId,
          });
        }
        return {
          name: displayFileName,
          playId: playMeta ? `${shareURL}|${file.fid}|${playMeta}` : `${shareURL}|${file.fid}`,
        };
      }));

      if (!episodes.length) {
        episodes.push({
          name: "打开网盘链接",
          playId: `share|||${encodeURIComponent(shareURL)}`,
        });
      }

      let sourceNames = [displayName];
      const driveType = String(driveInfo?.driveType || "").toLowerCase();
      if (DRIVE_TYPE_CONFIG.includes(driveType)) {
        sourceNames = filterSourceNamesForCaller(SOURCE_NAMES_CONFIG, source, context);
      }

      for (const sourceName of sourceNames) {
        const lineName = DRIVE_TYPE_CONFIG.includes(driveType) ? `${displayName}-${sourceName}` : displayName;
        playSources.push({
          name: lineName,
          episodes,
        });
      }
    }

    if (playSources.length > 1) {
      playSources = sortPlaySourcesByDriveOrder(playSources);
    }

    const vodItem = {
      vod_id: detailUrl,
      vod_name: title,
      vod_pic: pic,
      vod_content: desc,
      vod_play_sources: playSources.length
        ? playSources
        : [{ name: "详情页", episodes: [{ name: "打开详情页", playId: `page|||${encodeURIComponent(detailUrl)}` }] }],
    };

    if (filesForScraping.length > 0) {
      try {
        await OmniBox.log("info", `[4K指南][detail] 开始统一刮削: vodId=${detailUrl}, files=${filesForScraping.length}`);
        await OmniBox.processScraping(detailUrl, title || "", title || "", filesForScraping);
        const metadata = await OmniBox.getScrapeMetadata(detailUrl);
        const scrapeData = metadata?.scrapeData || null;
        const videoMappings = Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [];

        if (scrapeData || videoMappings.length > 0) {
          for (const source of vodItem.vod_play_sources || []) {
            for (const episode of source.episodes || []) {
              const playIdParts = String(episode.playId || "").split("|");
              const formattedId = `${String(playIdParts[0] || "")}|${String(playIdParts[1] || "")}`;
              const matchedMapping = videoMappings.find((mapping) => mapping && mapping.fileId === formattedId);
              if (matchedMapping && scrapeData) {
                const newName = buildScrapedFileName(scrapeData, matchedMapping, String(episode.name || ""));
                if (newName && newName !== episode.name) {
                  episode.name = newName;
                }
              }
            }
          }

          if (scrapeData) {
            if (scrapeData.title) vodItem.vod_name = scrapeData.title;
            if (scrapeData.posterPath) vodItem.vod_pic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
            if (scrapeData.overview) vodItem.vod_content = scrapeData.overview;
            if (scrapeData.releaseDate) vodItem.vod_year = String(scrapeData.releaseDate).slice(0, 4);
            if (scrapeData.voteAverage) vodItem.vod_douban_score = Number(scrapeData.voteAverage).toFixed(1);
          }
          await OmniBox.log("info", `[4K指南][detail] 统一刮削完成: vodId=${detailUrl}, mappings=${videoMappings.length}, title=${vodItem.vod_name || title}`);
        } else {
          await OmniBox.log("info", `[4K指南][detail] 统一刮削无结果: vodId=${detailUrl}`);
        }
      } catch (error) {
        await OmniBox.log("warn", `[4K指南][detail] 统一刮削失败: ${error.message}`);
      }
    } else {
      await OmniBox.log("info", `[4K指南][detail] 跳过统一刮削: 未收集到可刮削文件`);
    }

    await OmniBox.log("info", `[4K指南][detail] url=${detailUrl} title=${vodItem.vod_name || title} shareLinks=${shareLinks.length} lines=${playSources.length}`);

    return {
      list: [vodItem],
    };
  } catch (e) {
    await OmniBox.log("error", `[4K指南][detail] ${e.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = String(params.keyword || params.wd || params.key || "").trim();
    const page = Math.max(1, parseInt(params.page || 1, 10));
    if (!keyword) return { page, pagecount: 0, total: 0, list: [] };

    const url = `${HOST}/?s=${encodeURIComponent(keyword)}`;
    const html = await requestText(url, { referer: `${HOST}/` });
    let list = extractItems(html);
    if (!list.length) {
      const $ = cheerio.load(html);
      list = [];
      $("a[href*='/book/'], a[href*='/sites/']").each((_, el) => {
        const a = $(el);
        const href = absUrl(a.attr("href") || "");
        const title = cleanText(a.text());
        if (!href || !title) return;
        if (!title.includes(keyword)) return;
        list.push({ vod_id: href, vod_name: title, vod_pic: "", vod_remarks: "", vod_content: "" });
      });
    }

    return { page, pagecount: 1, total: list.length, list };
  } catch (e) {
    await OmniBox.log("error", `[4K指南][search] ${e.message}`);
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }
}

async function play(params, context) {
  try {
    const playId = String(params.playId || params.url || params.input || "").trim();
    const flag = String(params.flag || "").trim();
    const source = resolveCallerSource(params, context);

    if (!playId) return { parse: 0, jx: 0, url: "", urls: [], header: {}, headers: {} };

    if (playId.startsWith("page|||")) {
      const pageUrl = decodeURIComponent(playId.slice("page|||".length));
      const header = { ...HEADERS, Referer: pageUrl };
      return { parse: 1, jx: 0, url: pageUrl, urls: [{ name: "详情页", url: pageUrl }], header, headers: header };
    }

    if (playId.startsWith("share|||")) {
      const shareUrl = decodeURIComponent(playId.slice("share|||".length));
      const header = { ...HEADERS, Referer: `${HOST}/` };
      return { parse: 1, jx: 0, url: shareUrl, urls: [{ name: "打开网盘", url: shareUrl }], header, headers: header };
    }

    const idParts = playId.split("|");
    const shareURL = idParts[0] || "";
    let fileId = idParts[1] || "";
    const playMeta = idParts.length >= 3 ? decodePlayMeta(idParts[2] || "") : {};

    if (!shareURL) {
      throw new Error("播放参数缺少分享链接");
    }

    const routeType = resolveRouteType(flag, source, context);

    if (!fileId) {
      const rootFileList = await OmniBox.getDriveFileList(shareURL, "0");
      const rootFiles = Array.isArray(rootFileList?.files) ? rootFileList.files : Array.isArray(rootFileList) ? rootFileList : [];
      const files = await getAllVideoFiles(shareURL, rootFiles, 0, new Set());
      if (files.length) {
        fileId = files[0].fid;
      }
    }

    if (!fileId) {
      const header = { ...HEADERS, Referer: `${HOST}/` };
      return { parse: 1, jx: 0, url: shareURL, urls: [{ name: "打开网盘", url: shareURL }], header, headers: header };
    }

    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: null,
        episodeName: playMeta.e || params.episodeName || "",
      };

      const vodId = String(playMeta.sid || params.vodId || params.videoId || "").trim();
      if (!vodId) return result;

      try {
        const metadata = await OmniBox.getScrapeMetadata(vodId);
        if (!metadata || !metadata.scrapeData || !Array.isArray(metadata.videoMappings)) {
          await OmniBox.log("info", `[4K指南][play] 弹幕匹配跳过: metadata 不完整, vodId=${vodId}`);
          return result;
        }

        const formattedFileId = `${shareURL}|${fileId}`;
        const matchedMapping = metadata.videoMappings.find((mapping) => mapping && mapping.fileId === formattedFileId);
        const scrapeData = metadata.scrapeData || {};
        result.scrapeTitle = scrapeData.title || "";
        if (scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
        }

        if (!matchedMapping) {
          await OmniBox.log("info", `[4K指南][play] 弹幕匹配未命中 mapping: ${formattedFileId}`);
          return result;
        }

        if (matchedMapping.episodeNumber) {
          result.episodeNumber = matchedMapping.episodeNumber;
        }
        if (matchedMapping.episodeName && !result.episodeName) {
          result.episodeName = matchedMapping.episodeName;
        }

        const fileName = buildScrapedFileName(scrapeData, matchedMapping, result.episodeName || "") || buildFileNameForDanmu(scrapeData.title || playMeta.t || "", result.episodeName || "");
        if (fileName) {
          await OmniBox.log("info", `[4K指南][play] 生成 fileName 用于弹幕匹配: ${fileName}`);
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
          if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
            result.danmakuList = matchedDanmaku;
            await OmniBox.log("info", `[4K指南][play] 弹幕匹配成功, count=${matchedDanmaku.length}`);
          }
        }
      } catch (error) {
        await OmniBox.log("warn", `[4K指南][play] 弹幕匹配失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([
      OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType),
      metadataPromise,
    ]);

    if (playInfoResult.status !== "fulfilled") {
      throw new Error(playInfoResult.reason && playInfoResult.reason.message ? playInfoResult.reason.message : "网盘直链解析失败");
    }

    const playInfo = playInfoResult.value;
    if (!playInfo || !Array.isArray(playInfo.url) || !playInfo.url.length) {
      throw new Error("网盘直链解析结果为空");
    }

    const urls = playInfo.url.map((item) => ({
      name: item.name || "播放",
      url: item.url,
    }));

    let danmakuList = Array.isArray(playInfo.danmaku) ? playInfo.danmaku : [];
    let scrapeTitle = "";
    let scrapePic = "";
    let episodeNumber = null;
    let episodeName = playMeta.e || params.episodeName || "";
    if (metadataResult.status === "fulfilled" && metadataResult.value) {
      danmakuList = metadataResult.value.danmakuList?.length ? metadataResult.value.danmakuList : danmakuList;
      scrapeTitle = metadataResult.value.scrapeTitle || "";
      scrapePic = metadataResult.value.scrapePic || "";
      episodeNumber = metadataResult.value.episodeNumber ?? null;
      episodeName = metadataResult.value.episodeName || episodeName;
    } else if (metadataResult.status === "rejected") {
      await OmniBox.log("warn", `[4K指南][play] 获取元数据失败(不影响播放): ${metadataResult.reason && metadataResult.reason.message ? metadataResult.reason.message : metadataResult.reason}`);
    }

    const historyPayload = buildPlayHistoryPayload({
      sourceId: context?.sourceId,
      vodId: String(playMeta.sid || params.vodId || params.videoId || shareURL),
      title: params.title || scrapeTitle || playMeta.t || shareURL,
      pic: params.pic || scrapePic || playMeta.p || "",
      episode: playId,
      episodeName,
      episodeNumber,
    });
    if (historyPayload) {
      OmniBox.addPlayHistory(historyPayload)
        .then((added) => {
          if (added) {
            OmniBox.log("info", `[4K指南][play] 已添加观看记录: ${historyPayload.title}`);
          } else {
            OmniBox.log("info", `[4K指南][play] 观看记录已存在,跳过添加: ${historyPayload.title}`);
          }
        })
        .catch((error) => {
          OmniBox.log("warn", `[4K指南][play] 添加观看记录失败: ${error.message}`);
        });
    }

    const header = playInfo.header || {};

    await OmniBox.log("info", `[4K指南][play] route=${routeType} share=${shareURL} fileId=${fileId} urls=${urls.length}`);

    return {
      urls,
      header,
      parse: 0,
      jx: 0,
      danmaku: danmakuList};
  } catch (e) {
    await OmniBox.log("error", `[4K指南][play] ${e.message}`);
    return { parse: 0, jx: 0, url: "", urls: [], header: {}, headers: {} };
  }
}

});

_load(1, "七味分组", function (module, exports, require) {
// @name 七味分组
// @author https://github.com/hjdhnx/drpy-node/blob/main/spider/js/%E4%B8%83%E5%91%B3%5B%E4%BC%98%5D.js
// @description 刮削：支持，弹幕：支持，嗅探：支持，仅保留七味网盘线路的分组版本
// @dependencies: axios, cheerio
// @version 1.6.22
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/网盘/七味分组.js

const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("crypto");
const OmniBox = require("omnibox_sdk");

const DANMU_API = process.env.DANMU_API || "";
const PANCHECK_API = process.env.PANCHECK_API || "";
const PANCHECK_ENABLED = String(process.env.PANCHECK_ENABLED || (PANCHECK_API ? "true" : "false")).toLowerCase() === "true";
const PANCHECK_PLATFORMS = process.env.PANCHECK_PLATFORMS || "quark,baidu,uc,pan123,tianyi,cmcc,aliyun,xunlei,115";
// 115 cookie 统一全局配置：与盘搜分组共用同一套环境变量
const GLOBAL_115_COOKIE = process.env.PAN_115_COOKIE || process.env.GLOBAL_115_COOKIE || process.env.QIWEI_115_COOKIE || process.env.WOOG_115_COOKIE || process.env['115_COOKIE'] || "";

function splitConfigList(value) {
    return String(value || "")
        .split(/[;,]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

const MAX_PAN_VALID_ROUTES = (() => {
    const raw = String(process.env.MAX_PAN_VALID_ROUTES || "3").trim();
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 3;
})();
const DRIVE_TYPE_CONFIG = splitConfigList(process.env.DRIVE_TYPE_CONFIG || "quark;uc");
const SOURCE_NAMES_CONFIG = splitConfigList(process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连");
const EXTERNAL_SERVER_PROXY_ENABLED = String(process.env.EXTERNAL_SERVER_PROXY_ENABLED || "false").toLowerCase() === "true";
const DRIVE_ORDER = splitConfigList(process.env.DRIVE_ORDER || "baidu;tianyi;quark;uc;115;xunlei;ali;123pan").map((s) => s.toLowerCase());
const QIWEI_CACHE_EX_SECONDS = Number(process.env.QIWEI_CACHE_EX_SECONDS || 43200);
const GLOBAL_115_MAGNET_CACHE_EX_SECONDS = Number(process.env.GLOBAL_115_MAGNET_CACHE_EX_SECONDS || process.env.QIWEI_115_MAGNET_CACHE_EX_SECONDS || 2592000);
const QIWEI_PAN_CACHE_VERSION = "v4";
const PAN_ROUTE_NAMES = SOURCE_NAMES_CONFIG.slice(0, MAX_PAN_VALID_ROUTES);

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

const panRouteCache = new Map();

function logInfo(message, data = null) {
    const suffix = data == null ? "" : `: ${JSON.stringify(data)}`;
    OmniBox.log("info", `[七味分组] ${message}${suffix}`);
}

function logWarn(message, data = null) {
    const suffix = data == null ? "" : `: ${JSON.stringify(data)}`;
    OmniBox.log("warn", `[七味分组] ${message}${suffix}`);
}

function logError(message, error) {
    OmniBox.log("error", `[七味分组] ${message}: ${error?.message || error}`);
}

function encodeMeta(obj) {
    try {
        return Buffer.from(JSON.stringify(obj || {}), "utf8").toString("base64");
    } catch {
        return "";
    }
}

function decodeMeta(value) {
    try {
        return JSON.parse(Buffer.from(String(value || ""), "base64").toString("utf8"));
    } catch {
        return {};
    }
}

function safeJsonParse(text, fallback = {}) {
    try {
        return JSON.parse(text);
    } catch {
        return fallback;
    }
}

function getCurrentHost() {
    return HOSTS[currentHostIndex] || HOSTS[0];
}

function fixUrl(url, host = getCurrentHost()) {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith("//")) return `https:${value}`;
    if (value.startsWith("/")) return `${host}${value}`;
    return `${host}/${value.replace(/^\.\//, "")}`;
}

function normalizeImage(url, host = getCurrentHost()) {
    const fixed = fixUrl(url, host);
    if (!fixed) return "";
    return fixed.replace(/\s+/g, "%20");
}

function parsePage(value, defaultValue = 1) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

function parseFilters(params = {}) {
    const merged = {};
    const candidates = [params.filters, params.extend, params.ext];
    for (const item of candidates) {
        if (!item) continue;
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
        if (!["sort", "type", "area", "lang", "year"].includes(key)) continue;
        normalized[key] = String(value || "").trim();
    }
    if (!FULL_SORT_OPTIONS.some((item) => item.value === normalized.sort)) {
        normalized.sort = "time";
    }
    return normalized;
}

function buildCategoryPath(categoryId, page, filters = {}) {
    const area = encodeURIComponent(String(filters.area || "").trim());
    const sort = String(filters.sort || "time").trim() || "time";
    const type = encodeURIComponent(String(filters.type || "").trim());
    const lang = encodeURIComponent(String(filters.lang || "").trim());
    const year = encodeURIComponent(String(filters.year || "").trim());
    return `/ms/${categoryId}-${area}-${sort}-${type}-${lang}-------${year}.html?page=${page}`;
}

async function requestWithHost(host, path, options = {}) {
    const url = /^https?:\/\//i.test(path) ? path : `${host}${path}`;
    const response = await axiosInstance.get(url, {
        headers: {
            ...DEFAULT_HEADERS,
            Referer: `${host}/`,
            Origin: host,
            ...(options.headers || {}),
        },
    });
    if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}`);
    }
    return {
        html: typeof response.data === "string" ? response.data : JSON.stringify(response.data || {}),
        host,
        url,
    };
}

async function requestHtmlWithFailover(path, options = {}) {
    let lastError = null;
    for (let offset = 0; offset < HOSTS.length; offset++) {
        const index = (currentHostIndex + offset) % HOSTS.length;
        const host = HOSTS[index];
        try {
            const result = await requestWithHost(host, path, options);
            currentHostIndex = index;
            return result;
        } catch (error) {
            lastError = error;
            logWarn("站点请求失败，尝试切换镜像", { host, path, error: error.message || String(error) });
        }
    }
    throw lastError || new Error("全部镜像请求失败");
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

function buildPanSearchEntryVod(video = {}, host = "") {
    const rawVideoId = extractVideoId(video?.vod_id || "");
    const folderVodId = buildPanRootFolderVodId(rawVideoId || video?.vod_id || "");
    return {
        vod_id: folderVodId,
        vod_name: String(video?.vod_name || "").trim(),
        vod_pic: normalizeImage(video?.vod_pic || "", host) || String(video?.vod_pic || "").trim(),
        vod_remarks: String(video?.vod_remarks || "点击查看网盘分组").trim() || "点击查看网盘分组",
        vod_tag: "folder",
        type_id: folderVodId,
        type_name: "剧集网盘分组",
    };
}

function paginateList(list = [], page = 1, pageSize = 20) {
    const normalizedPageSize = Math.max(1, parseInt(pageSize, 10) || 20);
    const normalizedPage = Math.max(1, parseInt(page, 10) || 1);
    const source = Array.isArray(list) ? list : [];
    const total = source.length;
    const pagecount = total > 0 ? Math.ceil(total / normalizedPageSize) : 1;
    const start = (normalizedPage - 1) * normalizedPageSize;
    return {
        page: normalizedPage,
        pagecount,
        total,
        list: source.slice(start, start + normalizedPageSize),
    };
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
        .replace(/^(?:collect|采集)\s*/iu, "")
        .replace(/^(?:线路|route)\s*/iu, "")
        .replace(/[：:：\-]+$/u, "")
        .replace(/\s+(\d+)$/u, "")
        .trim();
}

function extractVideoId(urlOrId) {
    const value = String(urlOrId || "");
    const match = value.match(/\/mv\/(\d+)\.html/);
    return match ? match[1] : value;
}

function isBlockedLineName(name) {
    if (!name) return false;
    return String(name).includes("磁力");
}

function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeSeedType(type = "", link = "") {
    const t = String(type || "").trim().toLowerCase();
    const u = String(link || "").trim().toLowerCase();
    if (u.startsWith("magnet:")) return "magnet";
    if (u.startsWith("ed2k://")) return "ed2k";
    if (/\.torrent($|\?)/i.test(u)) return "torrent";
    if (t === "magnet" || t === "magnet_url" || t === "magnet_link") return "magnet";
    if (t === "ed2k" || t === "ed2k_url" || t === "ed2k_link") return "ed2k";
    if (t === "torrent") return "torrent";
    return t || "other";
}

function isDirectPlayableSeedType(seedType = "") {
    const t = String(seedType || "").toLowerCase();
    return t !== "magnet" && t !== "ed2k";
}

function extractEpisodeNumber(name = "") {
    const text = String(name || "");
    const patterns = [
        /S\d{1,2}E(\d{1,3})/i,
        /第\s*(\d{1,3})\s*[集话]/,
        /\[(\d{1,3})\s*[集话]\]/,
        /(?:^|[^A-Z0-9])E[P]?(\d{1,3})(?:[^A-Z0-9]|$)/i,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (!match) continue;
        const episode = Number(match[1]);
        if (Number.isFinite(episode) && episode > 0) return episode;
    }
    return null;
}

function extractEpisodeRange(name = "") {
    const text = String(name || "");
    const patterns = [
        /\[第\s*(\d{1,3})\s*[-—~～至]\s*(\d{1,3})\s*[集话]\]/,
        /第\s*(\d{1,3})\s*[-—~～至]\s*(\d{1,3})\s*[集话]/,
        /\[(\d{1,3})\s*[-—~～至]\s*(\d{1,3})\s*[集话]\]/,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (!match) continue;
        const start = Number(match[1]);
        const end = Number(match[2]);
        if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start) {
            return { start, end };
        }
    }
    return null;
}

function formatEpisodeLabel(ep, fallbackTitle = "") {
    if (Number.isFinite(ep) && ep > 0) return `第${String(ep).padStart(2, "0")}集`;
    return fallbackTitle || "资源";
}

function formatEpisodeRangeLabel(range, fallbackTitle = "") {
    if (range && Number.isFinite(range.start) && Number.isFinite(range.end)) {
        return `第${String(range.start).padStart(2, "0")}-${String(range.end).padStart(2, "0")}集`;
    }
    return fallbackTitle || "资源";
}

function sortEpisodesByEpisodeNumber(episodes = []) {
    return [...episodes].sort((a, b) => {
        const aRangeStart = Number.isFinite(a?.episodeRangeStart) ? a.episodeRangeStart : null;
        const bRangeStart = Number.isFinite(b?.episodeRangeStart) ? b.episodeRangeStart : null;
        const aEpisode = Number.isFinite(a?.episodeNumber) ? a.episodeNumber : (aRangeStart ?? Number.MAX_SAFE_INTEGER);
        const bEpisode = Number.isFinite(b?.episodeNumber) ? b.episodeNumber : (bRangeStart ?? Number.MAX_SAFE_INTEGER);
        if (aEpisode !== bEpisode) return aEpisode - bEpisode;
        const aRangeEnd = Number.isFinite(a?.episodeRangeEnd) ? a.episodeRangeEnd : aEpisode;
        const bRangeEnd = Number.isFinite(b?.episodeRangeEnd) ? b.episodeRangeEnd : bEpisode;
        if (aRangeEnd !== bRangeEnd) return aRangeEnd - bRangeEnd;
        return String(a?.name || "").localeCompare(String(b?.name || ""), "zh-Hans-CN");
    });
}

function buildMagnetEpisode(item = {}, fallbackTitle = "", extra = {}) {
    const link = String(
        item?.link ||
        item?.zlink ||
        item?.magnet ||
        item?.magnet_url ||
        item?.magnet_link ||
        item?.ed2k ||
        item?.ed2k_url ||
        item?.ed2k_link ||
        item?.torrent ||
        extra.link ||
        ""
    ).trim();
    const seedType = normalizeSeedType(item?.type || extra.seedType || "", link);
    const rawTitle = normalizeText(item?.seed_name || item?.zname || item?.name || fallbackTitle || "资源");
    const quality = normalizeText(item?.zqxd || item?.definition_group || extra.quality || "");
    const size = normalizeText(item?.zsize || item?.size || extra.size || "");
    const createdAt = normalizeText(item?.created_at || item?.ezt || extra.createdAt || "");
    const remarkBits = [size, quality, createdAt].filter(Boolean);
    const episodeRange = extractEpisodeRange(rawTitle);
    const episodeNumber = episodeRange ? null : extractEpisodeNumber(rawTitle);
    const episodeLabel = (seedType === "magnet" || seedType === "ed2k" || seedType === "torrent")
        ? (episodeRange ? formatEpisodeRangeLabel(episodeRange, rawTitle) : formatEpisodeLabel(episodeNumber, rawTitle))
        : rawTitle;
    const displayName = remarkBits.length > 0 ? `${episodeLabel} [${remarkBits.join(" / ")}]` : episodeLabel;
    const simplePlayId = Boolean(extra.simplePlayId) && (seedType === "magnet" || seedType === "ed2k" || seedType === "torrent");
    const playMeta = {
        link,
        seedType,
        title: rawTitle,
        displayName,
        quality,
        size,
        createdAt,
        directPlayable: Boolean(extra.directPlayable ?? isDirectPlayableSeedType(seedType)),
    };
    return {
        name: episodeLabel,
        seedType,
        episodeNumber,
        episodeRangeStart: episodeRange?.start ?? null,
        episodeRangeEnd: episodeRange?.end ?? null,
        playId: simplePlayId ? link : JSON.stringify(playMeta),
        _displayName: displayName,
        _rawName: rawTitle,
    };
}

function formatFileSize(size) {
    if (!size || size <= 0) return "";
    const unit = 1024;
    const units = ["B", "K", "M", "G", "T", "P"];
    if (size < unit) return `${size}B`;
    let exp = 0;
    let sizeFloat = size;
    while (sizeFloat >= unit && exp < units.length - 1) {
        sizeFloat /= unit;
        exp++;
    }
    if (sizeFloat === Math.floor(sizeFloat)) {
        return `${Math.floor(sizeFloat)}${units[exp]}`;
    }
    return `${sizeFloat.toFixed(2)}${units[exp]}`;
}

function cleanPlayLabel(value = "", fallback = "") {
    const cleaned = normalizeText(value)
        .replace(/[#$]+/g, " ")
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return cleaned || fallback;
}

function stripEpisodeSerialSuffix(name = "", index = 0) {
    const value = cleanPlayLabel(name);
    const serial = String((parseInt(index, 10) || 0) + 1);
    if (!value || !serial) return value;
    const escaped = serial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return value
        .replace(new RegExp(`([\\]】）)])\\s*${escaped}$`, "u"), "$1")
        .replace(new RegExp(`(\\[[^\\]]{1,24}\\])\\s*${escaped}$`, "u"), "$1")
        .trim();
}

const PLAY_EPISODE_NAME_MAX_LENGTH = 32;

function truncatePlayLabel(value = "", maxLength = PLAY_EPISODE_NAME_MAX_LENGTH) {
    const raw = cleanPlayLabel(value);
    const limit = Math.max(8, Number(maxLength) || PLAY_EPISODE_NAME_MAX_LENGTH);
    if (!raw || raw.length <= limit) return raw;
    return `${raw.slice(0, limit - 1)}…`;
}

function buildEpisodeButtonName(ep = {}, index = 0, defaultPrefix = "资源") {
    const raw = cleanPlayLabel(ep?._displayName || ep?.name || ep?.episodeName || ep?._rawName || ep?.fileName || ep?.file_name || ep?.title || "");
    const rangeStart = Number.isFinite(ep?._episodeRangeStart) ? ep._episodeRangeStart : (Number.isFinite(ep?.episodeRangeStart) ? ep.episodeRangeStart : null);
    const rangeEnd = Number.isFinite(ep?._episodeRangeEnd) ? ep._episodeRangeEnd : (Number.isFinite(ep?.episodeRangeEnd) ? ep.episodeRangeEnd : null);
    if (rangeStart && rangeEnd) return formatEpisodeRangeLabel({ start: rangeStart, end: rangeEnd }, raw);
    const episodeNumber = Number.isFinite(ep?._episodeNumber) ? ep._episodeNumber : (Number.isFinite(ep?.episodeNumber) ? ep.episodeNumber : extractEpisodeNumber(raw));
    if (episodeNumber) return formatEpisodeLabel(episodeNumber, raw);
    return truncatePlayLabel(cleanPlayLabel(raw, `${defaultPrefix}${index + 1}`));
}

function pickEpisodeDisplayName(ep = {}, defaultPrefix = "资源", index = 0) {
    return truncatePlayLabel(buildEpisodeButtonName(ep, index, defaultPrefix));
}

function build115ButtonName(index = 0) {
    return `115资源${(parseInt(index, 10) || 0) + 1}`;
}

function build115EpisodeDisplayName(ep = {}, index = 0) {
    const rawName = cleanPlayLabel(ep?._rawName || ep?.fileName || ep?.file_name || ep?._displayName || ep?.name || "");
    return rawName || build115ButtonName(index);
}

function build115MagnetPlayId(meta = {}) {
    return Buffer.from(JSON.stringify({
        kind: "115magnetplay",
        magnet: String(meta.magnet || "").trim(),
        fileName: String(meta.fileName || "").trim(),
        fileId: String(meta.fileId || "").trim(),
        pickcode: String(meta.pickcode || "").trim(),
        sid: String(meta.sid || "").trim(),
        fid: String(meta.fid || "").trim(),
        v: String(meta.v || "").trim(),
        e: String(meta.e || "").trim(),
        s: String(meta.s || "").trim(),
        n: meta.n || "",
    }), "utf8").toString("base64");
}

function decode115MagnetPlayMeta(playId) {
    const raw = String(playId || "").trim();
    if (!raw) return {};
    const base64 = raw.replace(/^115magnet:/, "");
    try {
        const decoded = Buffer.from(base64, "base64").toString("utf8");
        const data = safeJsonParse(decoded, {}) || {};
        return data && typeof data === "object" ? data : {};
    } catch (_) {
        return {};
    }
}

function is115MagnetPlayId(playId, flag = "") {
    if (String(playId || "").trim().startsWith("115magnet:")) return true;
    if (String(flag || "").trim() === "115秒传") return true;
    return decode115MagnetPlayMeta(playId)?.kind === "115magnetplay";
}

function sanitizeLegacyPlayText(value) {
    return cleanPlayLabel(value).replace(/[#$]/g, " ").trim();
}

function buildLegacyPlayFields(playSources = []) {
    if (!Array.isArray(playSources) || playSources.length === 0) {
        return { vod_play_from: "", vod_play_url: "" };
    }
    const vodPlayFrom = [];
    const vodPlayUrl = [];
    for (const source of playSources) {
        const sourceName = sanitizeLegacyPlayText(source?.name || "默认线路") || "默认线路";
        const episodes = Array.isArray(source?.episodes) ? source.episodes : [];
        const episodeItems = episodes.map((episode, index) => {
            const epName = sanitizeLegacyPlayText(stripEpisodeSerialSuffix(pickEpisodeDisplayName(episode, "第", index), index)) || `第${index + 1}集`;
            const playId = String(episode?.playId || "").trim();
            if (!playId) return "";
            return `${epName}$${playId}`;
        }).filter(Boolean);
        if (episodeItems.length > 0) {
            vodPlayFrom.push(sourceName);
            vodPlayUrl.push(episodeItems.join("#"));
        }
    }
    return {
        vod_play_from: vodPlayFrom.join("$$$"),
        vod_play_url: vodPlayUrl.join("$$$"),
    };
}

function summarizePlaySourcesForLog(playSources = []) {
    return (Array.isArray(playSources) ? playSources : []).map((source) => {
        const episodes = Array.isArray(source?.episodes) ? source.episodes : [];
        return {
            name: source?.name || "",
            episodeCount: episodes.length,
            episodePreview: episodes.slice(0, 5).map((episode) => ({
                name: episode?.name || episode?.episodeName || episode?.title || "",
                playIdPreview: String(episode?.playId || "").slice(0, 160),
            })),
        };
    });
}

function summarizePlayResultForLog(result = {}) {
    const urls = Array.isArray(result?.urls) ? result.urls : [];
    return {
        keys: Object.keys(result || {}),
        parse: result?.parse,
        flag: result?.flag || "",
        urlCount: urls.length,
        urls: urls.map((item) => ({
            name: item?.name || "",
            urlPreview: String(item?.url || "").slice(0, 240),
        })),
        headerKeys: result?.header && typeof result.header === "object" ? Object.keys(result.header) : [],
        danmakuCount: Array.isArray(result?.danmaku) ? result.danmaku.length : 0,
    };
}

function buildCacheKey(prefix, value) {
    const normalizedPrefix = String(prefix || "").trim();
    const normalizedValue = String(value || "").trim();
    const directKey = `${normalizedPrefix}:${normalizedValue}`;
    if (Buffer.byteLength(directKey, "utf8") <= 256) {
        return directKey;
    }

    const digest = crypto.createHash("sha1").update(normalizedValue, "utf8").digest("hex");
    const compactKey = `${normalizedPrefix}:sha1:${digest}`;
    if (Buffer.byteLength(compactKey, "utf8") <= 256) {
        return compactKey;
    }

    return `qiwei-group:cache:sha1:${digest}`;
}

async function getCachedJSON(key) {
    try {
        return await OmniBox.getCache(key);
    } catch (error) {
        logWarn("读取缓存失败", { key, error: error.message || String(error) });
        return null;
    }
}

async function setCachedJSON(key, value, exSeconds) {
    try {
        await OmniBox.setCache(key, value, exSeconds);
    } catch (error) {
        logWarn("写入缓存失败", { key, error: error.message || String(error) });
    }
}

async function deleteCachedJSON(key) {
    if (!key || typeof OmniBox?.deleteCache !== "function") return false;
    try {
        await OmniBox.deleteCache(key);
        return true;
    } catch (error) {
        logWarn("删除缓存失败", { key, error: error.message || String(error) });
        return false;
    }
}

function build115MagnetCacheKey(magnet = "") {
    return buildCacheKey(`qiwei-group:115-magnet:${QIWEI_PAN_CACHE_VERSION}`, String(magnet || "").trim().toLowerCase());
}

function inferDriveTypeFromSourceName(name = "") {
    const raw = String(name || "").toLowerCase();
    if (raw.includes("百度")) return "baidu";
    if (raw.includes("天翼")) return "tianyi";
    if (raw.includes("夸克")) return "quark";
    if (raw === "uc" || raw.includes("uc")) return "uc";
    if (raw.includes("115")) return "115";
    if (raw.includes("迅雷")) return "xunlei";
    if (raw.includes("阿里")) return "aliyun";
    if (raw.includes("移动") || raw.includes("139") || raw.includes("cmcc")) return "cmcc";
    if (raw.includes("123")) return "pan123";
    return raw;
}

function normalizeDriveType(driveType = "") {
    const raw = String(driveType || "").toLowerCase();
    if (raw.includes("aliyun") || raw === "ali" || raw.includes("阿里")) return "aliyun";
    if (raw.includes("baidu") || raw.includes("百度")) return "baidu";
    if (raw.includes("tianyi") || raw.includes("天翼")) return "tianyi";
    if (raw.includes("quark") || raw.includes("夸克")) return "quark";
    if (raw === "uc" || raw.includes("uc")) return "uc";
    if (raw.includes("115")) return "115";
    if (raw.includes("xunlei") || raw.includes("迅雷")) return "xunlei";
    if (raw.includes("cmcc") || raw.includes("mobile") || raw.includes("139") || raw.includes("移动")) return "cmcc";
    if (raw.includes("pan123") || raw === "123" || raw.includes("123")) return "pan123";
    return raw;
}

function inferDriveTypeFromShareURL(shareURL = "") {
    const raw = String(shareURL || "").toLowerCase();
    if (!raw) return "";
    if (raw.includes("pan.quark.cn") || raw.includes("drive.quark.cn")) return "quark";
    if (raw.includes("drive.uc.cn") || raw.includes("fast.uc.cn")) return "uc";
    if (raw.includes("pan.baidu.com")) return "baidu";
    if (raw.includes("cloud.189.cn")) return "tianyi";
    if (raw.includes("yun.139.com")) return "cmcc";
    if (raw.includes("www.aliyundrive.com") || raw.includes("www.alipan.com") || raw.includes("aliyundrive.com") || raw.includes("alipan.com")) return "aliyun";
    if (raw.includes("pan.xunlei.com")) return "xunlei";
    if (raw.includes("115.com")) return "115";
    if (raw.includes("123684.com") || raw.includes("123865.com") || raw.includes("123912.com") || raw.includes("123pan.com")) return "pan123";
    return "";
}

function sortPlaySourcesByDriveOrder(playSources = []) {
    if (!Array.isArray(playSources) || playSources.length <= 1 || DRIVE_ORDER.length === 0) {
        return playSources;
    }
    const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
    return [...playSources].sort((a, b) => {
        const aType = inferDriveTypeFromSourceName(a?.name || "");
        const bType = inferDriveTypeFromSourceName(b?.name || "");
        const aOrder = orderMap.has(aType) ? orderMap.get(aType) : Number.MAX_SAFE_INTEGER;
        const bOrder = orderMap.has(bType) ? orderMap.get(bType) : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return 0;
    });
}

function sortGroupResultsByDriveOrder(results = []) {
    if (!Array.isArray(results) || results.length <= 1 || DRIVE_ORDER.length === 0) {
        return results;
    }
    const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
    return [...results].sort((a, b) => {
        const aType = normalizeDriveType(a?.panType || a?.vod_id || a?.vod_name || "");
        const bType = normalizeDriveType(b?.panType || b?.vod_id || b?.vod_name || "");
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
    let routeType = "直连";

    if (callerSource === "web" || callerSource === "emby") {
        routeType = allowServerProxy ? "服务端代理" : "直连";
    }

    if (flag) {
        if (flag.includes("-")) {
            const parts = flag.split("-");
            routeType = parts[parts.length - 1];
        } else {
            routeType = flag;
        }
    }

    if (!allowServerProxy && routeType === "服务端代理") {
        routeType = "直连";
    }

    if (callerSource === "uz" && routeType === "本地代理") {
        routeType = "直连";
    }

    return routeType;
}

function hasValidPlayUrls(playInfo) {
    return Array.isArray(playInfo?.url) && playInfo.url.some((item) => item?.url);
}

function isDirectVideoUrl(url) {
    if (!url) {
        return false;
    }
    return /\.(m3u8|mp4|flv|avi|mkv|ts|mov|webm)(\?|$)/i.test(String(url));
}

function normalizeShareUrl(url = "") {
    let value = String(url || "").trim();
    if (!value) return "";
    value = value.replace(/[)）】》,，。]+$/g, "");
    value = value.replace(/&amp;/gi, "&");
    value = value.replace(/((?:https?:\/\/)?(?:pan\.quark\.cn|drive\.uc\.cn)\/s\/[^?&#\s/]+)&dn=[^#\s]*/i, "$1");
    try {
        const parsed = new URL(value);
        if (parsed.hostname.includes("cloud.189.cn")) {
            const code = parsed.searchParams.get("code") || parsed.searchParams.get("shareCode") || "";
            if (code) {
                return `https://cloud.189.cn/web/share?code=${encodeURIComponent(code)}`;
            }
        }
        parsed.hash = "";
        parsed.pathname = String(parsed.pathname || "").replace(/&dn=[^/]*$/i, "");
        if (parsed.searchParams.has("dn")) parsed.searchParams.delete("dn");
        if (parsed.searchParams.has("displayName")) parsed.searchParams.delete("displayName");
        if (parsed.searchParams.has("filename")) parsed.searchParams.delete("filename");
        if (parsed.searchParams.has("title")) parsed.searchParams.delete("title");

        if (parsed.hostname.includes("pan.baidu.com")) {
            const pwd = parsed.searchParams.get("pwd") || "";
            return `https://pan.baidu.com${parsed.pathname}${pwd ? `?pwd=${encodeURIComponent(pwd)}` : ""}`;
        }
        if (parsed.hostname.includes("pan.quark.cn")) {
            const shareId = extractPanShareId(parsed.pathname);
            return shareId ? `https://pan.quark.cn/s/${shareId}` : `https://pan.quark.cn${parsed.pathname}`;
        }
        if (parsed.hostname.includes("drive.uc.cn")) {
            const shareId = extractPanShareId(parsed.pathname);
            return shareId ? `https://drive.uc.cn/s/${shareId}` : `https://drive.uc.cn${parsed.pathname}`;
        }
        return parsed.toString();
    } catch (error) {
        return value.replace(/([?&])dn=[^&#]*/ig, "$1").replace(/[?&]$/g, "");
    }
}

function extractPanShareId(pathname = "") {
    const normalizedPath = String(pathname || "").trim();
    if (!normalizedPath) return "";
    const match = normalizedPath.match(/\/s\/([A-Za-z0-9_-]+)/i);
    return match ? match[1] : "";
}

function normalizeShareDisplayName(name = "") {
    let value = String(name || "")
        .replace(/&nbsp;/gi, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!value) return "";

    value = value.replace(/\s*(?:最后更新于\s*)?(?:今天|昨天|前天|刚刚)\s*$/u, "").trim();
    value = value.replace(/\s*(?:最后更新于\s*)?\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\s*$/u, "").trim();
    value = value.replace(/\s*提取码[:：]?\s*[A-Za-z0-9]{0,8}\s*$/u, "").trim();
    value = value.replace(/[|｜、,，;；:：·•\-_]+$/u, "").trim();

    return value;
}

function cleanShareDisplayNameCandidate(name = "") {
    const value = normalizeShareDisplayName(name);
    if (!value) return "";

    const lower = value.toLowerCase();
    const invalidNames = new Set([
        "百度网盘",
        "夸克网盘",
        "uc网盘",
        "天翼云盘",
        "移动云盘",
        "阿里云盘",
        "123云盘",
        "迅雷网盘",
        "115网盘",
        "网盘下载",
        "点击下载",
        "立即下载",
        "复制链接",
        "下载",
        "baidu",
        "quark",
        "uc",
        "tianyi",
        "cmcc",
        "aliyun",
        "alipan",
        "123pan",
        "xunlei",
        "115",
    ]);
    if (invalidNames.has(lower)) {
        return "";
    }

    return value;
}

function scoreShareDisplayName(name = "") {
    const value = cleanShareDisplayNameCandidate(name);
    if (!value) return 0;

    let score = Math.min(value.length, 120);
    if (value.length <= 4) {
        score -= 24;
    } else if (value.length <= 8) {
        score -= 10;
    }
    if (/[【\[（(《]/u.test(value)) {
        score += 6;
    }
    if (/(4k|2160|1080|hdr|杜比|高码|全集|完结|更新|国语|中字|无水印|原盘|超前)/iu.test(value)) {
        score += 18;
    }
    if (/^(?:[\u4e00-\u9fa5]{2,6}|[a-z0-9 ._-]{2,12})$/iu.test(value)) {
        score -= 12;
    }

    return score;
}

function pickBetterShareDisplayName(...candidates) {
    let best = "";
    let bestScore = 0;

    for (const candidate of candidates) {
        const value = cleanShareDisplayNameCandidate(candidate);
        if (!value) continue;
        const score = scoreShareDisplayName(value);
        if (!best || score > bestScore || (score === bestScore && value.length > best.length)) {
            best = value;
            bestScore = score;
        }
    }

    return best;
}

function extractShareDisplayNameFromShareUrl(shareURL = "") {
    const raw = String(shareURL || "").trim().replace(/&amp;/gi, "&");
    if (!raw) return "";

    let value = "";
    try {
        const parsed = new URL(raw);
        value = parsed.searchParams.get("dn")
            || parsed.searchParams.get("displayName")
            || parsed.searchParams.get("filename")
            || parsed.searchParams.get("title")
            || "";
    } catch (error) {
        value = "";
    }

    if (!value) {
        const match = raw.match(/(?:[?&]dn=|[?&]displayName=|[?&]filename=|[?&]title=)([^&#]+)/i) || raw.match(/&dn=([^&#]+)/i);
        if (match) {
            value = match[1] || "";
        }
    }

    try {
        value = decodeURIComponent(value || "");
    } catch (error) {
        value = value || "";
    }

    return cleanShareDisplayNameCandidate(value);
}

function buildUniqueShareLinkMetas(links = []) {
    const rawLinks = Array.isArray(links) ? links : [];
    const hintMap = new Map();
    const seen = new Set();
    const metas = [];

    for (const rawLink of rawLinks) {
        const normalizedLink = normalizeShareUrl(rawLink);
        if (!normalizedLink) continue;
        const hint = extractShareDisplayNameFromShareUrl(rawLink);
        const betterHint = pickBetterShareDisplayName(hintMap.get(normalizedLink) || "", hint);
        if (betterHint) {
            hintMap.set(normalizedLink, betterHint);
        }
    }

    for (const rawLink of rawLinks) {
        const normalizedLink = normalizeShareUrl(rawLink);
        if (!normalizedLink || seen.has(normalizedLink)) continue;
        seen.add(normalizedLink);
        metas.push({
            shareURL: normalizedLink,
            rawShareURL: String(rawLink || "").trim(),
            shareNameHint: hintMap.get(normalizedLink) || "",
        });
    }

    return metas;
}

function extractDownloadSectionShareMetas($) {
    if (!$) return [];

    const metas = [];
    $(".down-link .down-list.tab-content li.down-list2").each((_, li) => {
        const row = $(li);
        const titleBlock = row.find("p.down-list3").first();
        const titleAnchor = titleBlock.find("a").first();
        const rowNameHint = pickBetterShareDisplayName(
            titleAnchor.attr("title") || "",
            titleAnchor.text() || "",
            titleBlock.text() || ""
        );
        const linkCandidates = row.find("a").toArray().flatMap((a) => {
            const anchor = $(a);
            return [
                anchor.attr("data-clipboard-text") || "",
                anchor.attr("href") || "",
            ];
        });

        for (const rawLink of linkCandidates) {
            if (!isPanUrl(rawLink)) continue;
            metas.push({
                url: rawLink,
                nameHint: rowNameHint,
            });
        }
    });

    return metas;
}

function isPanUrl(url = "") {
    return /(pan\.baidu\.com|pan\.quark\.cn|drive\.uc\.cn|cloud\.189\.cn|yun\.139\.com|alipan\.com|aliyundrive\.com|115\.com|115cdn\.com|123pan\.com|123684\.com|123865\.com|123912\.com|pan\.xunlei\.com)/i.test(String(url || ""));
}

function parsePanType(shareURL = "") {
    const key = parsePanTypeKey(shareURL);
    const names = {
        baidu: "百度网盘",
        quark: "夸克网盘",
        uc: "UC网盘",
        tianyi: "天翼云盘",
        cmcc: "移动云盘",
        aliyun: "阿里云盘",
        pan123: "123云盘",
        xunlei: "迅雷网盘",
        "115": "115网盘",
    };
    return names[key] || "其他";
}

function parsePanTypeKey(shareURL = "") {
    return inferDriveTypeFromShareURL(shareURL);
}

function extractDriveFiles(fileList) {
    if (Array.isArray(fileList)) return fileList;
    if (Array.isArray(fileList?.files)) return fileList.files;
    if (Array.isArray(fileList?.data?.files)) return fileList.data.files;
    if (Array.isArray(fileList?.list)) return fileList.list;
    if (Array.isArray(fileList?.data?.list)) return fileList.data.list;
    return [];
}

function getFileId(file = {}) {
    return String(file?.fid || file?.file_id || file?.fs_id || file?.id || "").trim();
}

function getFileName(file = {}) {
    return String(file?.file_name || file?.server_filename || file?.name || "").trim();
}

function getFileSize(file = {}) {
    return Number(file?.size || file?.file_size || file?.obj_size || "0") || 0;
}

function stripPanTypeSuffix(name = "") {
    const raw = String(name || "").trim();
    if (!raw) return "";
    const stripped = raw.replace(/\s*\[[^\]]*(?:网盘|夸克|百度|阿里|UC|115|天翼|迅雷|移动|123)[^\]]*\]\s*$/u, "").trim();
    return stripped || raw;
}

function isVideoFile(file = {}) {
    const name = getFileName(file).toLowerCase();
    const videoExtensions = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v", ".rmvb", ".mpg", ".mpeg"];
    if (name && videoExtensions.some((ext) => name.endsWith(ext))) {
        return true;
    }

    const type = [
        file?.format_type,
        file?.type,
        file?.mime,
        file?.mimetype,
        file?.category,
        file?.obj_category,
        file?.obj_type,
        file?.file_type,
    ].filter(Boolean).join(" ").toLowerCase();

    return type.includes("video") || type.includes("mpeg") || type.includes("h264") || type.includes("hevc");
}

function isDirectoryLike(file = {}) {
    if (
        file?.dir === true || file?.dir === 1 ||
        file?.is_dir === true || file?.is_dir === 1 ||
        file?.isdir === true || file?.isdir === 1 ||
        file?.folder === true || file?.folder === 1 ||
        file?.is_folder === true || file?.is_folder === 1
    ) {
        return true;
    }

    const type = String(file?.format_type || file?.type || file?.category || file?.obj_category || file?.obj_type || file?.file_type || "").toLowerCase();
    return type.includes("dir") || type.includes("folder");
}

async function getDriveInfoCached(shareURL) {
    const key = buildCacheKey("qiwei-group:driveInfo", shareURL);
    let driveInfo = await getCachedJSON(key);
    if (!driveInfo) {
        driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
        await setCachedJSON(key, driveInfo, QIWEI_CACHE_EX_SECONDS);
    }
    return driveInfo;
}

async function getRootFileListCached(shareURL) {
    const key = buildCacheKey("qiwei-group:rootFiles", shareURL);
    let fileList = await getCachedJSON(key);
    if (!fileList) {
        fileList = await OmniBox.getDriveFileList(shareURL, "0");
        if (Array.isArray(extractDriveFiles(fileList))) {
            await setCachedJSON(key, fileList, QIWEI_CACHE_EX_SECONDS);
        }
    }
    return fileList;
}

function extractShareDisplayName(fileList = {}, rootFiles = []) {
    const listTitle = cleanShareDisplayNameCandidate(String(fileList?.displayName || fileList?.display_name || "").trim());
    if (listTitle) return listTitle;

    const files = Array.isArray(rootFiles) ? rootFiles : extractDriveFiles(fileList);
    if (files.length === 1) {
        const singleName = cleanShareDisplayNameCandidate(getFileName(files[0]));
        if (singleName) return singleName;
    }

    const names = [...new Set(files.map((file) => cleanShareDisplayNameCandidate(getFileName(file))).filter(Boolean))];
    if (names.length === 1) {
        return names[0];
    }

    return "";
}

async function getShareDisplayNameCached(shareURL) {
    const key = buildShareNameCacheKey(shareURL);
    const cachedName = cleanShareDisplayNameCandidate(await getCachedJSON(key));
    if (cachedName) {
        return cachedName;
    }

    const urlHint = extractShareDisplayNameFromShareUrl(shareURL);
    if (urlHint) {
        await setCachedJSON(key, urlHint, QIWEI_CACHE_EX_SECONDS);
        return urlHint;
    }

    try {
        const fileList = await getRootFileListCached(shareURL);
        const rootFiles = extractDriveFiles(fileList);
        const shareName = cleanShareDisplayNameCandidate(extractShareDisplayName(fileList, rootFiles));
        if (shareName) {
            await setCachedJSON(key, shareName, QIWEI_CACHE_EX_SECONDS);
        }
        return shareName;
    } catch (error) {
        logWarn("读取分享名称失败", { shareURL, error: error.message || String(error) });
        return "";
    }
}

async function getAllVideoFiles(shareURL, files, depth = 0, seen = new Set()) {
    if (!Array.isArray(files) || files.length === 0 || depth > 8) {
        return [];
    }

    const result = [];
    for (const file of files || []) {
        const fileId = getFileId(file);
        if (isVideoFile(file)) {
            result.push(file);
            continue;
        }

        if (isDirectoryLike(file) && fileId) {
            const visitKey = `${shareURL}|${fileId}`;
            if (seen.has(visitKey)) continue;
            seen.add(visitKey);

            try {
                const subFileList = await OmniBox.getDriveFileList(shareURL, fileId);
                const subFiles = extractDriveFiles(subFileList);
                if (subFiles.length > 0) {
                    const subVideos = await getAllVideoFiles(shareURL, subFiles, depth + 1, seen);
                    result.push(...subVideos);
                }
            } catch (error) {
                logWarn("递归读取网盘子目录失败", { shareURL, fileId, error: error.message || String(error) });
            }
        }
    }
    return result;
}

async function getAllVideoFilesCached(shareURL, rootFiles = []) {
    const key = buildCacheKey("qiwei-group:videoFiles", shareURL);
    let videos = await getCachedJSON(key);
    if (!Array.isArray(videos) || videos.length === 0) {
        videos = await getAllVideoFiles(shareURL, rootFiles);
        if (Array.isArray(videos) && videos.length > 0) {
            await setCachedJSON(key, videos, QIWEI_CACHE_EX_SECONDS);
        }
    }
    return Array.isArray(videos) ? videos : [];
}

async function loadPanFiles(shareURL) {
    try {
        const driveInfo = await getDriveInfoCached(shareURL);
        const fileList = await getRootFileListCached(shareURL);
        const files = extractDriveFiles(fileList);
        const videos = await getAllVideoFilesCached(shareURL, files);
        const shareName = extractShareDisplayName(fileList, files);
        logInfo("读取网盘文件结果", {
            shareURL,
            driveType: String(driveInfo?.driveType || driveInfo?.type || ""),
            shareName,
            rootContainerKeys: fileList && typeof fileList === "object" && !Array.isArray(fileList) ? Object.keys(fileList).slice(0, 12) : [],
            rootCount: files.length,
            rootSample: files.slice(0, 3).map((file) => ({
                fileId: getFileId(file),
                fileName: getFileName(file),
                isDir: isDirectoryLike(file),
                isVideo: isVideoFile(file),
                keys: file && typeof file === "object" ? Object.keys(file).slice(0, 12) : [],
            })),
            videoCount: videos.length,
            sampleNames: videos.slice(0, 5).map((file) => getFileName(file)),
        });
        return { videos, driveInfo, rootFiles: files, shareName };
    } catch (error) {
        logWarn("读取网盘文件失败", { shareURL, error: error.message || String(error) });
        return null;
    }
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

function getPanCheckSelectedPlatforms() {
    return splitConfigList(PANCHECK_PLATFORMS)
        .map((p) => normalizeDriveType(p))
        .filter(Boolean);
}

function splitLinksByPanCheckPlatforms(links = []) {
    const allLinks = Array.isArray(links) ? links.filter(Boolean) : [];
    const selectedPlatforms = getPanCheckSelectedPlatforms();

    if (selectedPlatforms.length === 0) {
        return {
            selectedPlatforms: [],
            linksToCheck: allLinks,
            bypassLinks: [],
        };
    }

    const selectedPlatformSet = new Set(selectedPlatforms);
    const linksToCheck = [];
    const bypassLinks = [];

    for (const link of allLinks) {
        const driveType = inferDriveTypeFromShareURL(link) || normalizeDriveType(OmniBox.getDriveInfoByShareURL(link)?.driveType || "");
        if (selectedPlatformSet.has(driveType)) {
            linksToCheck.push(link);
        } else {
            bypassLinks.push(link);
        }
    }

    return {
        selectedPlatforms,
        linksToCheck,
        bypassLinks,
    };
}

async function checkLinksWithPanCheck(links = []) {
    if (!PANCHECK_ENABLED || !PANCHECK_API || links.length === 0) {
        return {
            invalidLinksSet: new Set(),
            stats: null,
        };
    }

    try {
        const normalizedLinks = [...new Set((Array.isArray(links) ? links : []).map((link) => normalizeShareUrl(link)).filter(Boolean))];
        if (normalizedLinks.length === 0) {
            return {
                invalidLinksSet: new Set(),
                stats: {
                    selectedPlatforms: getPanCheckSelectedPlatforms(),
                    inputPlatformStats: {},
                    checkedPlatformStats: {},
                    invalidPlatformStats: {},
                    validPlatformStats: {},
                    bypassPlatformStats: {},
                    totalInput: 0,
                    totalChecked: 0,
                    totalInvalid: 0,
                    totalValid: 0,
                    totalBypass: 0,
                    totalOutput: 0,
                },
            };
        }

        const { selectedPlatforms, linksToCheck, bypassLinks } = splitLinksByPanCheckPlatforms(normalizedLinks);
        const detectDriveType = (link) => inferDriveTypeFromShareURL(link) || normalizeDriveType(OmniBox.getDriveInfoByShareURL(link)?.driveType || "") || "unknown";
        const inputPlatformStats = {};

        for (const link of normalizedLinks) {
            const driveType = detectDriveType(link);
            inputPlatformStats[driveType] = (inputPlatformStats[driveType] || 0) + 1;
        }

        if (linksToCheck.length === 0) {
            logInfo("PanCheck 跳过：无命中待校验平台", {
                totalInput: normalizedLinks.length,
                selectedPlatforms,
                inputPlatformStats,
            });
            return {
                invalidLinksSet: new Set(),
                stats: {
                    selectedPlatforms,
                    inputPlatformStats,
                    checkedPlatformStats: {},
                    invalidPlatformStats: {},
                    validPlatformStats: {},
                    bypassPlatformStats: inputPlatformStats,
                    totalInput: normalizedLinks.length,
                    totalChecked: 0,
                    totalInvalid: 0,
                    totalValid: 0,
                    totalBypass: bypassLinks.length,
                    totalOutput: normalizedLinks.length,
                },
            };
        }

        const apiUrl = PANCHECK_API.replace(/\/$/, "");
        const checkURL = `${apiUrl}/api/v1/links/check`;
        const requestBody = { links: linksToCheck };
        if (selectedPlatforms.length > 0) {
            requestBody.selected_platforms = selectedPlatforms;
        }

        logInfo("PanCheck 请求开始", {
            checkURL,
            totalInput: normalizedLinks.length,
            totalChecked: linksToCheck.length,
            totalBypass: bypassLinks.length,
            selectedPlatforms,
            linksPreview: linksToCheck.slice(0, 5),
        });

        const response = await OmniBox.request(checkURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": DEFAULT_HEADERS["User-Agent"],
            },
            body: JSON.stringify(requestBody),
        });

        if (response.statusCode !== 200) {
            logWarn("PanCheck API 响应错误", {
                statusCode: response.statusCode,
                checkURL,
                responseBodyPreview: String(response.body || "").slice(0, 500),
            });
            return {
                invalidLinksSet: new Set(),
                stats: null,
            };
        }

        const data = safeJsonParse(response.body || "{}", {});
        const invalidLinks = Array.isArray(data.invalid_links) ? data.invalid_links.map((link) => normalizeShareUrl(link)).filter(Boolean) : [];
        const validLinks = Array.isArray(data.valid_links) ? data.valid_links.map((link) => normalizeShareUrl(link)).filter(Boolean) : [];
        const invalidLinksSet = new Set(invalidLinks);
        const checkedPlatformStats = {};
        const invalidPlatformStats = {};
        const validPlatformStats = {};
        const bypassPlatformStats = {};

        for (const link of linksToCheck) {
            const driveType = detectDriveType(link);
            checkedPlatformStats[driveType] = (checkedPlatformStats[driveType] || 0) + 1;
            if (invalidLinksSet.has(link)) {
                invalidPlatformStats[driveType] = (invalidPlatformStats[driveType] || 0) + 1;
            } else {
                validPlatformStats[driveType] = (validPlatformStats[driveType] || 0) + 1;
            }
        }

        for (const link of bypassLinks) {
            const driveType = detectDriveType(link);
            bypassPlatformStats[driveType] = (bypassPlatformStats[driveType] || 0) + 1;
        }

        logInfo("PanCheck 请求完成", {
            checkURL,
            invalidCount: invalidLinks.length,
            validCount: validLinks.length,
            invalidPreview: invalidLinks.slice(0, 5),
        });

        return {
            invalidLinksSet,
            stats: {
                selectedPlatforms,
                inputPlatformStats,
                checkedPlatformStats,
                invalidPlatformStats,
                validPlatformStats,
                bypassPlatformStats,
                totalInput: normalizedLinks.length,
                totalChecked: linksToCheck.length,
                totalInvalid: invalidLinks.length,
                totalValid: validLinks.length,
                totalBypass: bypassLinks.length,
                totalOutput: normalizedLinks.length - invalidLinks.length,
            },
        };
    } catch (error) {
        logWarn("PanCheck 链接检测失败", { error: error.message || String(error), api: PANCHECK_API });
        return {
            invalidLinksSet: new Set(),
            stats: null,
        };
    }
}

function normalizeGroupedShareLinks(grouped = {}) {
    const normalizedGrouped = {};
    for (const [panTypeKey, links] of Object.entries(grouped || {})) {
        const normalizedLinks = [...new Set((Array.isArray(links) ? links : []).map((item) => normalizeShareUrl(item)).filter(Boolean))];
        if (normalizedLinks.length > 0) {
            normalizedGrouped[panTypeKey] = normalizedLinks;
        }
    }
    return normalizedGrouped;
}

function serializeGroupedShareLinks(grouped = {}) {
    const normalized = normalizeGroupedShareLinks(grouped);
    const sorted = {};
    for (const key of Object.keys(normalized).sort()) {
        sorted[key] = normalized[key].slice().sort();
    }
    return JSON.stringify(sorted);
}

async function filterGroupedShareLinksBeforeEntry(videoId, grouped = {}) {
    const normalizedGrouped = normalizeGroupedShareLinks(grouped);
    const uniqueLinks = [...new Set(Object.values(normalizedGrouped).flat())];

    if (!PANCHECK_ENABLED || !PANCHECK_API || uniqueLinks.length === 0) {
        return {
            grouped: normalizedGrouped,
            changed: serializeGroupedShareLinks(grouped) !== serializeGroupedShareLinks(normalizedGrouped),
            stats: null,
            beforeCount: uniqueLinks.length,
            afterCount: uniqueLinks.length,
        };
    }

    const { invalidLinksSet, stats } = await checkLinksWithPanCheck(uniqueLinks);
    const filteredGrouped = {};
    for (const [panTypeKey, links] of Object.entries(normalizedGrouped)) {
        const validLinks = links.filter((link) => !invalidLinksSet.has(link));
        if (validLinks.length > 0) {
            filteredGrouped[panTypeKey] = validLinks;
        }
    }

    const beforeCount = uniqueLinks.length;
    const afterCount = Object.values(filteredGrouped).flat().length;
    logInfo("进入网盘分组前 PanCheck 过滤完成", {
        videoId,
        beforeCount,
        afterCount,
        groupedBefore: Object.fromEntries(Object.entries(normalizedGrouped).map(([key, links]) => [key, Array.isArray(links) ? links.length : 0])),
        groupedAfter: Object.fromEntries(Object.entries(filteredGrouped).map(([key, links]) => [key, Array.isArray(links) ? links.length : 0])),
        stats,
    });

    return {
        grouped: filteredGrouped,
        changed: serializeGroupedShareLinks(normalizedGrouped) !== serializeGroupedShareLinks(filteredGrouped),
        stats,
        beforeCount,
        afterCount,
    };
}

function buildSearchResultDetailCacheKey(videoId = "") {
    return buildCacheKey(`qiwei-group:detail:search-result:${QIWEI_PAN_CACHE_VERSION}`, String(videoId || "").trim());
}

function buildPanGroupDirectoryCacheKey(videoId = "") {
    return buildCacheKey(`qiwei-group:detail:pan-group:${QIWEI_PAN_CACHE_VERSION}`, String(videoId || "").trim());
}

function buildShareNameCacheKey(shareURL = "") {
    const normalizedShareURL = normalizeShareUrl(shareURL);
    const driveType = normalizeDriveType(inferDriveTypeFromShareURL(normalizedShareURL) || "unknown");
    let compactValue = normalizedShareURL;

    if (driveType === "baidu") {
        try {
            const parsed = new URL(normalizedShareURL);
            const pwd = parsed.searchParams.get("pwd") || "";
            const path = String(parsed.pathname || "").trim();
            compactValue = `baidu:${path}${pwd ? `?pwd=${pwd}` : ""}`;
        } catch {
            compactValue = normalizedShareURL;
        }
    } else {
        const shareId = extractPanShareId(normalizedShareURL);
        if (shareId) {
            compactValue = `${driveType}:${shareId}`;
        }
    }

    return buildCacheKey(`qiwei-group:shareName:${QIWEI_PAN_CACHE_VERSION}`, compactValue);
}

function encodePanFolderMeta(meta = {}) {
    try {
        return Buffer.from(JSON.stringify(meta || {}), "utf8").toString("base64");
    } catch (error) {
        logWarn("编码网盘文件夹元数据失败", { error: error.message || String(error) });
        return "";
    }
}

function decodePanFolderMeta(value = "") {
    const raw = String(value || "").trim();
    if (!raw) return null;
    try {
        const json = Buffer.from(raw, "base64").toString("utf8");
        const data = safeJsonParse(json, null);
        return data && typeof data === "object" ? data : null;
    } catch (error) {
        return null;
    }
}

function buildPanRootFolderVodId(videoId = "") {
    const normalizedVideoId = String(videoId || "").trim();
    return encodePanFolderMeta({
        kind: "panroot",
        videoId: normalizedVideoId,
    });
}

function buildSourceFolderVodId(videoId = "", sourceType = "") {
    const normalizedVideoId = String(videoId || "").trim();
    const normalizedSourceType = String(sourceType || "").trim().toLowerCase();
    return encodePanFolderMeta({
        kind: "sourcefolder",
        videoId: normalizedVideoId,
        sourceType: normalizedSourceType,
    });
}

function buildSourceLineFolderVodId(videoId = "", sourceType = "", lineIndex = 0) {
    const normalizedVideoId = String(videoId || "").trim();
    const normalizedSourceType = String(sourceType || "").trim().toLowerCase();
    const normalizedLineIndex = parseInt(lineIndex, 10) || 0;
    return encodePanFolderMeta({
        kind: "sourceline",
        videoId: normalizedVideoId,
        sourceType: normalizedSourceType,
        lineIndex: normalizedLineIndex,
    });
}

function buildPanGroupFolderVodId(videoId = "", panTypeKey = "") {
    const normalizedVideoId = String(videoId || "").trim();
    const normalizedPanType = normalizeDriveType(panTypeKey || "");
    return `${normalizedPanType}|${normalizedVideoId}`;
}

function buildPanShareFolderVodId(videoId = "", panTypeKey = "", shareIndex = 0) {
    const normalizedVideoId = String(videoId || "").trim();
    const normalizedPanType = normalizeDriveType(panTypeKey || "");
    const normalizedShareIndex = parseInt(shareIndex, 10) || 0;
    return encodePanFolderMeta({
        kind: "panfolder",
        videoId: normalizedVideoId,
        panTypeKey: normalizedPanType,
        isShareEntry: true,
        shareIndex: normalizedShareIndex,
    });
}

function parsePanFolderVodId(vodId = "") {
    const decoded = decodePanFolderMeta(vodId);
    if (decoded?.kind === "panroot") {
        const result = {
            videoId: String(decoded.videoId || "").trim(),
            panTypeKey: "",
            sourceType: "",
            lineIndex: -1,
            isShareEntry: false,
            shareIndex: -1,
            hasPrefix: true,
            isEncoded: true,
            isRootFolder: true,
            isSourceFolder: false,
            isSourceLineFolder: false,
        };
        logInfo("解析网盘目录ID(根目录)", {
            rawLength: String(vodId || "").length,
            videoId: result.videoId,
        });
        return result;
    }

    if (decoded?.kind === "sourcefolder") {
        const result = {
            videoId: String(decoded.videoId || "").trim(),
            panTypeKey: "",
            sourceType: String(decoded.sourceType || "").trim().toLowerCase(),
            lineIndex: -1,
            isShareEntry: false,
            shareIndex: -1,
            hasPrefix: true,
            isEncoded: true,
            isRootFolder: false,
            isSourceFolder: true,
            isSourceLineFolder: false,
        };
        logInfo("解析目录ID(线路根目录)", {
            rawLength: String(vodId || "").length,
            videoId: result.videoId,
            sourceType: result.sourceType,
        });
        return result;
    }

    if (decoded?.kind === "sourceline") {
        const result = {
            videoId: String(decoded.videoId || "").trim(),
            panTypeKey: "",
            sourceType: String(decoded.sourceType || "").trim().toLowerCase(),
            lineIndex: parseInt(decoded.lineIndex, 10) || 0,
            isShareEntry: false,
            shareIndex: -1,
            hasPrefix: true,
            isEncoded: true,
            isRootFolder: false,
            isSourceFolder: false,
            isSourceLineFolder: true,
        };
        logInfo("解析目录ID(线路详情目录)", {
            rawLength: String(vodId || "").length,
            videoId: result.videoId,
            sourceType: result.sourceType,
            lineIndex: result.lineIndex,
        });
        return result;
    }

    if (decoded?.kind === "panfolder") {
        const result = {
            videoId: String(decoded.videoId || "").trim(),
            panTypeKey: normalizeDriveType(decoded.panTypeKey || ""),
            sourceType: "",
            lineIndex: -1,
            isShareEntry: decoded.isShareEntry === true,
            shareIndex: decoded.isShareEntry ? (parseInt(decoded.shareIndex, 10) || 0) : -1,
            hasPrefix: true,
            isEncoded: true,
            isRootFolder: false,
            isSourceFolder: false,
            isSourceLineFolder: false,
        };
        logInfo("解析网盘目录ID(编码)", {
            rawLength: String(vodId || "").length,
            videoId: result.videoId,
            panTypeKey: result.panTypeKey,
            isShareEntry: result.isShareEntry,
            shareIndex: result.shareIndex,
        });
        return result;
    }

    const raw = String(vodId || "").trim();
    const pipeParts = raw.split("|");
    if (pipeParts.length >= 2) {
        const panTypeKey = normalizeDriveType(pipeParts[0] || "");
        const videoId = String(pipeParts.slice(1).join("|") || "").trim();
        if (panTypeKey && videoId) {
            const result = {
                videoId,
                panTypeKey,
                sourceType: "",
                lineIndex: -1,
                isShareEntry: false,
                shareIndex: -1,
                hasPrefix: false,
                isEncoded: false,
                isRootFolder: false,
                isSourceFolder: false,
                isSourceLineFolder: false,
            };
            logInfo("解析网盘目录ID(一级文件夹)", {
                raw: raw.slice(0, 120),
                videoId: result.videoId,
                panTypeKey: result.panTypeKey,
            });
            return result;
        }
    }

    const parts = raw.split("||");
    const hasPrefix = parts[0] === "panfolder";
    const isShareEntry = hasPrefix ? parts[3] === "share" : parts[2] === "share";
    const result = {
        videoId: hasPrefix ? (parts[1] || "") : (parts[0] || ""),
        panTypeKey: hasPrefix ? (parts[2] || "") : (parts[1] || ""),
        sourceType: "",
        lineIndex: -1,
        isShareEntry,
        shareIndex: isShareEntry ? parseInt(hasPrefix ? (parts[4] || "0") : (parts[3] || "0"), 10) || 0 : -1,
        hasPrefix,
        isEncoded: false,
        isRootFolder: false,
        isSourceFolder: false,
        isSourceLineFolder: false,
    };
    if (raw.includes("||") || result.panTypeKey) {
        logInfo("解析网盘目录ID(兼容)", {
            raw: raw.slice(0, 120),
            videoId: result.videoId,
            panTypeKey: result.panTypeKey,
            isShareEntry: result.isShareEntry,
            shareIndex: result.shareIndex,
        });
    }
    return result;
}

function buildPanGroupEntries(video = {}, grouped = {}) {
    const entries = [];
    const collectGroups = Array.isArray(grouped?.collect) ? grouped.collect : [];
    const magnetGroups = Array.isArray(grouped?.magnet) ? grouped.magnet : [];

    if (collectGroups.length > 0) {
        entries.push({
            vod_id: buildSourceFolderVodId(video.vod_id, "collect"),
            vod_name: "采集",
            vod_pic: String(video?.vod_pic || "").trim(),
            type_id: "source_category",
            type_name: "采集分组",
            vod_remarks: `${collectGroups.length}条线路`,
            vod_tag: "folder",
            sourceType: "collect",
        });
    }

    if (magnetGroups.length > 0) {
        if (magnetGroups.length === 1) {
            const onlyMagnetGroup = magnetGroups[0] || {};
            const onlyMagnetLineIndex = onlyMagnetGroup?.lineIndex ?? 0;
            const onlyMagnetEpisodeCount = Array.isArray(onlyMagnetGroup?.episodes) ? onlyMagnetGroup.episodes.length : 0;
            entries.push({
                vod_id: buildSourceLineFolderVodId(video.vod_id, "magnet", onlyMagnetLineIndex),
                vod_name: String(onlyMagnetGroup?.name || "磁力").trim() || "磁力",
                vod_pic: String(video?.vod_pic || "").trim(),
                type_id: "source_line",
                type_name: "磁力线路",
                vod_remarks: `${onlyMagnetEpisodeCount}条资源`,
                vod_tag: "video",
                sourceType: "magnet",
            });
        } else {
            entries.push({
                vod_id: buildSourceFolderVodId(video.vod_id, "magnet"),
                vod_name: "磁力",
                vod_pic: String(video?.vod_pic || "").trim(),
                type_id: "source_category",
                type_name: "磁力分组",
                vod_remarks: `${magnetGroups.length}条线路`,
                vod_tag: "folder",
                sourceType: "magnet",
            });
        }
    }

    const panEntries = sortGroupResultsByDriveOrder(
        Object.entries(grouped)
            .filter(([panTypeKey]) => panTypeKey !== "collect" && panTypeKey !== "magnet")
            .map(([panTypeKey, links]) => {
                const uniqueLinks = buildUniqueShareLinkMetas(links).map((item) => item.shareURL);
                if (uniqueLinks.length === 0) return null;
                const panTypeName = parsePanType(uniqueLinks[0]);
                return {
                    vod_id: buildPanGroupFolderVodId(video.vod_id, panTypeKey),
                    vod_name: panTypeName,
                    vod_pic: String(video?.vod_pic || "").trim(),
                    type_id: "pan_category",
                    type_name: "网盘分类",
                    vod_remarks: `${uniqueLinks.length}条结果`,
                    vod_tag: "folder",
                    panType: panTypeKey,
                    shareCount: uniqueLinks.length,
                };
            })
            .filter(Boolean)
    );

    entries.push(...panEntries);

    logInfo("构建网盘分组目录项", {
        videoId: String(video?.vod_id || "").trim(),
        groupCount: entries.length,
        groups: entries.map((item) => ({
            vod_name: item.vod_name,
            panType: item.panType,
            sourceType: item.sourceType,
            type_id: item.type_id,
            vod_tag: item.vod_tag,
            vod_id_preview: String(item.vod_id || "").slice(0, 80),
        })),
    });
    return entries;
}

function buildSourceLineEntries(video = {}, sourceType = "", groups = []) {
    const normalizedSourceType = String(sourceType || "").trim().toLowerCase();
    return (Array.isArray(groups) ? groups : []).map((group, index) => {
        const lineName = String(group?.name || `${normalizedSourceType}线路${index + 1}`).trim();
        const episodeCount = Array.isArray(group?.episodes) ? group.episodes.length : 0;
        return {
            vod_id: buildSourceLineFolderVodId(video.vod_id, normalizedSourceType, group?.lineIndex ?? index),
            vod_name: lineName,
            vod_pic: String(video?.vod_pic || "").trim(),
            vod_remarks: normalizedSourceType === "magnet" ? `${episodeCount}条资源` : `${episodeCount}集`,
            vod_tag: normalizedSourceType === "magnet" ? "video" : "folder",
            type_id: "source_line",
            type_name: normalizedSourceType === "magnet" ? "磁力线路" : "采集线路",
            sourceType: normalizedSourceType,
        };
    });
}

async function buildPanShareEntries(video = {}, detailInfo = {}, panTypeKey = "", links = []) {
    const linkMetas = buildUniqueShareLinkMetas(links);
    return await Promise.all(linkMetas.map(async ({ shareURL, shareNameHint }, index) => {
        if (shareNameHint) {
            await setCachedJSON(buildShareNameCacheKey(shareURL), shareNameHint, QIWEI_CACHE_EX_SECONDS);
        }
        const shareName = cleanShareDisplayNameCandidate(shareNameHint || await getShareDisplayNameCached(shareURL));
        const fallbackShareName = `分享 ${index + 1}`;
        const displayShareName = String(shareName || fallbackShareName).trim();
        return {
            vod_id: buildPanShareFolderVodId(video.vod_id, panTypeKey, index),
            vod_name: displayShareName,
            vod_pic: String(detailInfo?.vod_pic || video?.vod_pic || "").trim(),
            vod_remarks: String(parsePanType(shareURL) || panTypeKey || "网盘分享").trim(),
            vod_tag: "video",
            panType: panTypeKey,
            shareIndex: index,
            shareURL,
        };
    }));
}

async function extractPanLinksFromDetail(videoId) {
    const normalizedVideoId = extractVideoId(videoId);
    if (!normalizedVideoId) {
        logWarn("提取详情网盘链接失败：videoId 为空", { videoId });
        return { detailInfo: {}, grouped: {} };
    }

    const path = `/mv/${normalizedVideoId}.html`;
    const { html, host } = await requestHtmlWithFailover(path);
    const detailInfo = parseDetailInfo(html, host);
    const $ = cheerio.load(html || "");
    const panRegex = /https?:\/\/(pan\.baidu\.com|pan\.quark\.cn|drive\.uc\.cn|cloud\.189\.cn|yun\.139\.com|alipan\.com|aliyundrive\.com|pan\.aliyun\.com|115\.com|115cdn\.com|123pan\.com|123684\.com|123865\.com|123912\.com|pan\.xunlei\.com)\/[^"'\s>]+/g;
    const htmlPanLinks = html.match(panRegex) || [];
    const rowPanLinks = extractDownloadSectionShareMetas($);
    const anchorPanLinks = $("a")
        .toArray()
        .flatMap((a) => {
            const links = [];
            const anchor = $(a);
            const href = anchor.attr("href") || "";
            const clipboard = anchor.attr("data-clipboard-text") || "";
            const rowTitle = anchor.closest("li.down-list2").find("p.down-list3").first();
            const nameHint = pickBetterShareDisplayName(
                rowTitle.find("a").first().attr("title") || "",
                rowTitle.text() || "",
                anchor.attr("title") || "",
                anchor.text() || ""
            );
            if (isPanUrl(href)) links.push({ url: href, nameHint });
            if (isPanUrl(clipboard)) links.push({ url: clipboard, nameHint });
            return links;
        });

    const collectGroups = [];
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
        if (isBlockedLineName(lineName)) continue;

        const episodes = [];
        $(episodeContainers[i])
            .find("a")
            .each((idx, node) => {
                const name = $(node).text().trim() || `第${idx + 1}集`;
                const fid = `${normalizedVideoId}#${i}#${idx}`;
                episodes.push({
                    name,
                    playId: `${normalizedVideoId}|${i}|${idx}|||${encodeMeta({ sid: String(normalizedVideoId || ""), fid, e: name })}`,
                    _fid: fid,
                    _rawName: name,
                });
            });

        if (episodes.length === 0) {
            const fid = `${normalizedVideoId}#${i}#0`;
            episodes.push({
                name: "正片",
                playId: `${normalizedVideoId}|${i}|0|||${encodeMeta({ sid: String(normalizedVideoId || ""), fid, e: "正片" })}`,
                _fid: fid,
                _rawName: "正片",
            });
        }

        collectGroups.push({
            lineIndex: i,
            name: lineName,
            episodes,
        });
    }

    const magnetGroups = [];
    const magnetMetaMap = new Map();
    const upsertMagnetMeta = (rawLink = "", meta = {}) => {
        const link = String(rawLink || "").trim();
        if (!/^(magnet:\?xt=urn:btih:|ed2k:\/\/|https?:\/\/[^\s]+\.torrent(?:$|\?))/i.test(link)) return;
        const previous = magnetMetaMap.get(link) || {};
        magnetMetaMap.set(link, {
            ...previous,
            ...meta,
            link,
            zname: pickBetterShareDisplayName(meta?.zname || meta?.name || "", previous?.zname || previous?.name || "") || previous?.zname || previous?.name || meta?.zname || meta?.name || "",
            zsize: String(meta?.zsize || previous?.zsize || "").trim(),
            zqxd: String(meta?.zqxd || previous?.zqxd || "").trim(),
            ezt: String(meta?.ezt || previous?.ezt || "").trim(),
            type: normalizeSeedType(meta?.type || previous?.type || "", link),
        });
    };
    html.replace(/magnet:\?xt=urn:btih:[A-Za-z0-9]+[^"'\s<]*/gi, (match) => {
        upsertMagnetMeta(match, {});
        return match;
    });
    html.replace(/ed2k:\/\/[^"'\s<]+/gi, (match) => {
        upsertMagnetMeta(match, {});
        return match;
    });
    html.replace(/https?:\/\/[^"'\s<]+\.torrent(?:\?[^"'\s<]*)?/gi, (match) => {
        upsertMagnetMeta(match, {});
        return match;
    });
    $("a").each((_, a) => {
        const anchor = $(a);
        const href = String(anchor.attr("href") || "").trim();
        const clipboard = String(anchor.attr("data-clipboard-text") || "").trim();
        const title = pickBetterShareDisplayName(anchor.attr("title") || "", anchor.text() || "");
        const meta = { zname: title };
        upsertMagnetMeta(href, meta);
        upsertMagnetMeta(clipboard, meta);
    });
    Array.from(magnetMetaMap.values()).forEach((item, index) => {
        const fallbackTitle = pickBetterShareDisplayName(item?.zname || item?.name || "", `磁力资源${index + 1}`);
        const episode = buildMagnetEpisode(item, fallbackTitle, { simplePlayId: true, directPlayable: true });
        magnetGroups.push({
            lineIndex: index,
            name: `磁力线路${index + 1}`,
            episodes: [{
                name: episode.name,
                playId: episode.playId,
                _fid: `magnet#${index}`,
                _rawName: episode._rawName || episode.name,
                _displayName: episode._displayName || episode.name,
                _seedType: episode.seedType,
                _episodeNumber: episode.episodeNumber,
                _episodeRangeStart: episode.episodeRangeStart,
                _episodeRangeEnd: episode.episodeRangeEnd,
            }],
        });
    });

    const shareMetaMap = new Map();
    const upsertShareMeta = (rawLink = "", nameHint = "") => {
        const shareURL = normalizeShareUrl(rawLink);
        if (!shareURL) return;
        const normalizedNameHint = pickBetterShareDisplayName(nameHint, extractShareDisplayNameFromShareUrl(rawLink));
        const prev = shareMetaMap.get(shareURL) || { shareURL, nameHint: "" };
        const betterNameHint = pickBetterShareDisplayName(prev.nameHint || "", normalizedNameHint || "");
        if (betterNameHint) {
            prev.nameHint = betterNameHint;
        }
        shareMetaMap.set(shareURL, prev);
    };

    for (const item of rowPanLinks) {
        upsertShareMeta(item?.url || "", item?.nameHint || "");
    }
    for (const rawLink of htmlPanLinks) {
        upsertShareMeta(rawLink);
    }
    for (const item of anchorPanLinks) {
        upsertShareMeta(item?.url || "", item?.nameHint || "");
    }

    const allPanLinks = Array.from(shareMetaMap.keys());
    const grouped = {};
    for (const [link, meta] of shareMetaMap.entries()) {
        const panTypeKey = parsePanTypeKey(link);
        if (!panTypeKey) continue;
        if (meta?.nameHint) {
            await setCachedJSON(buildShareNameCacheKey(link), meta.nameHint, QIWEI_CACHE_EX_SECONDS);
        }
        if (!grouped[panTypeKey]) grouped[panTypeKey] = [];
        grouped[panTypeKey].push(link);
    }

    if (collectGroups.length > 0) {
        grouped.collect = collectGroups;
    }
    if (magnetGroups.length > 0) {
        grouped.magnet = magnetGroups;
    }

    logInfo("提取详情网盘链接完成", {
        videoId: normalizedVideoId,
        detailName: detailInfo.vod_name || "",
        rowMatchCount: rowPanLinks.length,
        htmlMatchCount: htmlPanLinks.length,
        anchorMatchCount: anchorPanLinks.length,
        collectCount: collectGroups.length,
        magnetCount: magnetGroups.length,
        totalUnique: allPanLinks.length,
        shareNameHints: Array.from(shareMetaMap.values()).slice(0, 8).map((item) => ({
            shareURL: String(item?.shareURL || "").slice(0, 120),
            nameHint: item?.nameHint || "",
        })),
        groupedStats: Object.fromEntries(Object.entries(grouped).map(([key, links]) => [key, Array.isArray(links) ? links.length : 0])),
    });

    return { detailInfo, grouped };
}

async function buildAndCacheVideoPanDetail(video = {}) {
    const videoId = String(video?.vod_id || "").trim();
    if (!videoId) return null;

    const panData = await extractPanLinksFromDetail(videoId);
    const detailInfo = panData?.detailInfo || {};
    const groupedRaw = panData?.grouped || {};
    logInfo("构建剧集网盘缓存详情", {
        videoId,
        detailName: detailInfo?.vod_name || "",
        groupedKeys: Object.keys(groupedRaw),
        groupedStats: Object.fromEntries(Object.entries(groupedRaw).map(([key, links]) => [key, Array.isArray(links) ? links.length : 0])),
        panCheckEnabled: PANCHECK_ENABLED,
        panCheckApiConfigured: !!PANCHECK_API,
        scrapeEnabled: typeof OmniBox?.processScraping === "function" && typeof OmniBox?.getScrapeMetadata === "function",
        danmuEnabled: typeof OmniBox?.getDanmakuByFileName === "function" || !!DANMU_API,
        playHistoryEnabled: typeof OmniBox?.addPlayHistory === "function",
    });
    const allLinks = [];
    for (const links of Object.values(groupedRaw)) {
        if (Array.isArray(links)) allLinks.push(...links);
    }
    const uniqueLinks = [...new Set(allLinks.map((item) => normalizeShareUrl(item)).filter(Boolean))];
    let validLinksSet = new Set(uniqueLinks);
    if (PANCHECK_ENABLED && PANCHECK_API && uniqueLinks.length > 0) {
        logInfo("构建缓存详情时触发 PanCheck", {
            videoId,
            totalLinks: uniqueLinks.length,
            platforms: getPanCheckSelectedPlatforms(),
            linksPreview: uniqueLinks.slice(0, 5),
        });
        const { invalidLinksSet, stats } = await checkLinksWithPanCheck(uniqueLinks);
        validLinksSet = new Set(uniqueLinks.filter((link) => !invalidLinksSet.has(link)));
        if (stats) {
            logInfo("PanCheck 分平台统计(七味分组详情)", stats);
        }
    } else {
        logWarn("构建缓存详情时未触发 PanCheck", {
            videoId,
            panCheckEnabled: PANCHECK_ENABLED,
            hasPanCheckApi: !!PANCHECK_API,
            totalLinks: uniqueLinks.length,
        });
    }

    const filteredGrouped = {};
    for (const [panTypeKey, links] of Object.entries(groupedRaw)) {
        if (panTypeKey === "collect" || panTypeKey === "magnet") {
            if (Array.isArray(links) && links.length > 0) {
                filteredGrouped[panTypeKey] = links;
            }
            continue;
        }
        const filteredLinks = (Array.isArray(links) ? links : [])
            .map((item) => normalizeShareUrl(item))
            .filter((item) => item && validLinksSet.has(item));
        if (filteredLinks.length > 0) {
            filteredGrouped[panTypeKey] = [...new Set(filteredLinks)];
        }
    }

    const payload = {
        video: {
            vod_id: videoId,
            vod_name: String(video?.vod_name || detailInfo?.vod_name || "").trim(),
            vod_pic: String(video?.vod_pic || detailInfo?.vod_pic || "").trim(),
            vod_remarks: String(video?.vod_remarks || detailInfo?.vod_remarks || "").trim(),
        },
        detailInfo,
        grouped: filteredGrouped,
    };

    await setCachedJSON(buildPanGroupDirectoryCacheKey(videoId), payload, QIWEI_CACHE_EX_SECONDS);
    await setCachedJSON(buildSearchResultDetailCacheKey(videoId), payload, QIWEI_CACHE_EX_SECONDS);
    return payload;
}

async function getCachedOrBuildVideoPanDetail(video = {}, options = {}) {
    const videoId = String(video?.vod_id || "").trim();
    if (!videoId) return null;
    const forceRefresh = options.forceRefresh === true;
    if (!forceRefresh) {
        let cached = await getCachedJSON(buildPanGroupDirectoryCacheKey(videoId));
        if (cached && cached.grouped) {
            return cached;
        }
        cached = await getCachedJSON(buildSearchResultDetailCacheKey(videoId));
        if (cached && cached.grouped) {
            await setCachedJSON(buildPanGroupDirectoryCacheKey(videoId), cached, QIWEI_CACHE_EX_SECONDS);
            return cached;
        }
    } else {
        logInfo("强制刷新详情分组缓存", { videoId, reason: options.reason || "force_refresh" });
    }
    return await buildAndCacheVideoPanDetail(video);
}

function buildScrapedEpisodeName(scrapeData, mapping, fallbackName, displayName = "") {
    if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
        return fallbackName;
    }
    const scrapedEpisodeName = String(mapping?.episodeName || "").trim();
    const episodeNumber = Number(mapping?.episodeNumber);
    const fallbackText = cleanPlayLabel(displayName || fallbackName || "", fallbackName || "");
    const sizePrefix = (fallbackText.match(/^\[[^\]]+\]\s*/) || [""])[0];
    let episodeLabel = "";
    const range = extractEpisodeRange(fallbackText || fallbackName || "");
    if (range) {
        episodeLabel = formatEpisodeRangeLabel(range);
    } else if (Number.isFinite(episodeNumber) && episodeNumber > 0) {
        episodeLabel = formatEpisodeLabel(episodeNumber);
    } else {
        const fallbackEpisodeNumber = extractEpisodeNumber(fallbackText || fallbackName || "");
        if (Number.isFinite(fallbackEpisodeNumber) && fallbackEpisodeNumber > 0) episodeLabel = formatEpisodeLabel(fallbackEpisodeNumber);
    }
    if (scrapedEpisodeName) {
        return cleanPlayLabel(`${sizePrefix}${episodeLabel ? `${episodeLabel} ` : ""}${scrapedEpisodeName}`, fallbackName);
    }
    return fallbackText || fallbackName;
}

function buildScrapedDanmuFileName(scrapeData, scrapeType, mapping, fallbackVodName = "", fallbackEpisodeName = "") {
    const title = String(scrapeData?.title || fallbackVodName || "").trim();
    if (!title) return "";
    if (scrapeType === "movie") {
        return title;
    }
    const seasonAirYear = String(scrapeData?.seasonAirYear || "").trim();
    const seasonNumber = Number(mapping?.seasonNumber || 1);
    const episodeNumber = Number(mapping?.episodeNumber || 1);
    const episodeName = String(mapping?.episodeName || fallbackEpisodeName || "").trim();
    const prefix = `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`;
    return episodeName ? `${prefix}.${episodeName}` : prefix;
}

function buildFileNameForDanmu(vodName = "", episodeName = "") {
    const title = String(vodName || "").trim();
    const ep = String(episodeName || "").trim();
    if (!title) return ep;
    return ep ? `${title}.${ep}` : title;
}

async function matchDanmu(fileName = "") {
    if (!DANMU_API || !fileName) {
        logWarn("跳过弹幕匹配", { fileName, hasDanmuApi: !!DANMU_API, reason: !fileName ? "empty_filename" : "missing_danmu_api" });
        return [];
    }
    try {
        const url = `${String(DANMU_API).replace(/\/$/, "")}/api/v1/match?keyword=${encodeURIComponent(fileName)}`;
        logInfo("开始弹幕匹配", { fileName, url });
        const response = await axiosInstance.get(url, { headers: DEFAULT_HEADERS });
        const data = typeof response.data === "string" ? safeJsonParse(response.data, {}) : response.data || {};
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.list) ? data.list : [];
        logInfo("弹幕匹配完成", { fileName, count: list.length });
        return list;
    } catch (error) {
        logWarn("弹幕匹配失败", { fileName, error: error.message || String(error) });
        return [];
    }
}

function rewritePlayIdMeta(playId = "", patchMeta = {}) {
    const raw = String(playId || "").trim();
    if (is115MagnetPlayId(raw, "115秒传")) {
        const data = decode115MagnetPlayMeta(raw);
        if (data?.kind === "115magnetplay") {
            return build115MagnetPlayId({ ...data, ...patchMeta });
        }
    }
    if (!raw.includes("|||")) return raw;
    const [main, metaB64] = raw.split("|||");
    const meta = decodeMeta(metaB64 || "");
    return `${main}|||${encodeMeta({ ...meta, ...patchMeta })}`;
}

function normalizeScrapeFileName(value = "") {
    return normalizeText(value)
        .split(/[\\/]/)
        .pop()
        .replace(/\.[a-z0-9]{2,5}$/i, "")
        .replace(/[._\-\[\]()【】（）]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function buildScrapeMappingByEpisode(metadata = {}) {
    const mappings = Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [];
    const byEpisode = new Map();
    for (const mapping of mappings) {
        const ep = Number(mapping?.episodeNumber);
        if (!Number.isFinite(ep) || ep <= 0) continue;
        if (!byEpisode.has(ep)) byEpisode.set(ep, mapping);
    }
    return byEpisode;
}

function findScrapeMapping(metadata = {}, candidates = [], episodeNumber = null, rawName = "") {
    const mappings = Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [];
    for (const key of candidates.map((item) => String(item || "").trim()).filter(Boolean)) {
        const mapping = mappings.find((item) => String(item?.fileId || "").trim() === key);
        if (mapping) return mapping;
    }
    const epNo = Number(episodeNumber);
    if (Number.isFinite(epNo) && epNo > 0) {
        const mapping = buildScrapeMappingByEpisode(metadata).get(epNo);
        if (mapping) return mapping;
    }
    const normalizedRawName = normalizeScrapeFileName(rawName);
    if (normalizedRawName) {
        const mapping = mappings.find((item) => {
            const mappingName = normalizeScrapeFileName(item?.fileName || item?.file_name || item?.name || item?.sourceFileName || item?.sourceName || "");
            return mappingName && (mappingName === normalizedRawName || mappingName.includes(normalizedRawName) || normalizedRawName.includes(mappingName));
        });
        if (mapping) return mapping;
    }
    return null;
}

function addPlayHistoryAsync(payload = {}) {
    if (typeof OmniBox?.addPlayHistory !== "function") return;
    const sourceId = String(payload.sourceId || "").trim();
    const vodId = String(payload.vodId || "").trim();
    const title = String(payload.title || "").trim();
    if (!sourceId || !vodId || !title) {
        logWarn("跳过播放记录", { reason: "missing_required_fields", hasSourceId: !!sourceId, vodId, title });
        return;
    }
    try {
        OmniBox.addPlayHistory({
            vodId,
            title,
            pic: String(payload.pic || "").trim(),
            episode: String(payload.episode || "").trim(),
            sourceId,
            episodeNumber: payload.episodeNumber || null,
            episodeName: String(payload.episodeName || "").trim(),
        }).then((added) => {
            logInfo(added ? "已添加播放记录" : "播放记录已存在，跳过添加", {
                vodId,
                title,
                episodeName: payload.episodeName || "",
                episodeNumber: payload.episodeNumber || null,
            });
        }).catch((error) => {
            logWarn("添加播放记录失败", { vodId, title, error: error.message || String(error) });
        });
    } catch (error) {
        logWarn("添加播放记录异常", { vodId, title, error: error.message || String(error) });
    }
}

async function getMergedMetadataCached(videoId, title, scrapeCandidates = []) {
    const cacheKey = buildCacheKey("qiwei-group:scrape", videoId);
    let cached = await getCachedJSON(cacheKey);
    if (cached && cached.scrapeData) {
        const cachedMappings = Array.isArray(cached.videoMappings) ? cached.videoMappings : [];
        const hasLegacyHashFileId = cachedMappings.some((item) => String(item?.fileId || "").includes("#"));
        if (hasLegacyHashFileId) {
            logWarn("刮削元数据缓存已过期，准备重建", {
                videoId,
                title,
                reason: "legacy_hash_fileId_format",
                mappingPreview: cachedMappings.slice(0, 3).map((item) => String(item?.fileId || "").slice(0, 160)),
            });
            try {
                await deleteCachedJSON(cacheKey);
            } catch (error) {
                logWarn("删除旧刮削元数据缓存失败", { videoId, cacheKey, error: error.message || String(error) });
            }
            cached = null;
        } else {
            logInfo("命中刮削元数据缓存", {
                videoId,
                title,
                candidateCount: Array.isArray(scrapeCandidates) ? scrapeCandidates.length : 0,
                mappingCount: cachedMappings.length,
                scrapeType: cached.scrapeType || "",
                mappingPreview: cachedMappings.slice(0, 3).map((item) => String(item?.fileId || "").slice(0, 160)),
            });
            return {
                scrapeData: cached.scrapeData || null,
                videoMappings: cachedMappings,
                scrapeType: cached.scrapeType || "",
            };
        }
    }

    if (!Array.isArray(scrapeCandidates) || scrapeCandidates.length === 0) {
        logWarn("跳过刮削元数据", { videoId, title, reason: "empty_scrape_candidates" });
        return { scrapeData: null, videoMappings: [], scrapeType: "" };
    }

    try {
        logInfo("开始刮削元数据", {
            videoId,
            title,
            candidateCount: scrapeCandidates.length,
            candidatePreview: scrapeCandidates.slice(0, 3).map((item) => ({
                fid: String(item?.fid || item?.file_id || "").slice(0, 120),
                file_name: item?.file_name || item?.name || "",
            })),
        });
        const scrapingResult = await OmniBox.processScraping(String(videoId || ""), title || "", title || "", scrapeCandidates);
        const metadata = await OmniBox.getScrapeMetadata(String(videoId || ""));
        const result = {
            scrapeData: metadata?.scrapeData || null,
            videoMappings: Array.isArray(metadata?.videoMappings) ? metadata.videoMappings : [],
            scrapeType: metadata?.scrapeType || "",
        };
        logInfo("刮削元数据完成", {
            videoId,
            hasScrapeData: !!result.scrapeData,
            mappingCount: result.videoMappings.length,
            scrapeType: result.scrapeType || "",
            title: result.scrapeData?.title || "",
            processResultKeys: scrapingResult && typeof scrapingResult === "object" ? Object.keys(scrapingResult).slice(0, 12) : [],
            mappingPreview: result.videoMappings.slice(0, 3).map((item) => ({
                fileId: String(item?.fileId || "").slice(0, 100),
                episodeNumber: item?.episodeNumber || null,
                episodeName: item?.episodeName || "",
            })),
        });
        await setCachedJSON(cacheKey, result, QIWEI_CACHE_EX_SECONDS);
        return result;
    } catch (error) {
        logWarn("刮削元数据失败", { videoId, title, error: error.message || String(error) });
        return { scrapeData: null, videoMappings: [], scrapeType: "" };
    }
}

async function ensureDetailCache(videoId, video = {}, options = {}) {
    const normalizedVideoId = String(videoId || video?.vod_id || "").trim();
    if (!normalizedVideoId) return null;
    const payload = await getCachedOrBuildVideoPanDetail({
        vod_id: normalizedVideoId,
        vod_name: video?.vod_name || "",
        vod_pic: video?.vod_pic || "",
        vod_remarks: video?.vod_remarks || "",
    }, options);
    if (!payload) return null;

    return {
        cacheValue: payload,
        cacheKey: buildPanGroupDirectoryCacheKey(normalizedVideoId),
        fromCache: options.forceRefresh === true ? false : true,
    };
}

async function home(params) {
    try {
        const { html, host } = await requestHtmlWithFailover("/");
        const list = parseVideoList(html, host).map((item) => buildPanSearchEntryVod(item, host)).filter((item) => item.vod_id && item.vod_name);
        logInfo("首页加载完成", { host, count: list.length });
        return { class: CLASSES, filters: FILTERS, list };
    } catch (error) {
        logError("首页加载失败", error);
        return { class: CLASSES, filters: FILTERS, list: [] };
    }
}

async function category(params, context = {}) {
    const categoryId = String(params.categoryId || params.type_id || "1").trim();
    const page = parsePage(params.page, 1);
    const filters = parseFilters(params);
    const parsed = parsePanFolderVodId(categoryId);
    const parsedVideoId = extractVideoId(parsed.videoId);
    const parsedPanType = normalizeDriveType(parsed.panTypeKey || "");
    const source = resolveCallerSource(params, context) || "category-folder";

    if (parsedVideoId && parsed.isRootFolder) {
        logInfo("分类命中剧集根文件夹", { categoryId, page, parsedVideoId, source });
        const ensuredDetailCache = await ensureDetailCache(parsedVideoId, { vod_id: parsedVideoId });
        const cachedDetail = ensuredDetailCache?.cacheValue || null;
        const grouped = cachedDetail?.grouped || {};
        const video = cachedDetail?.video || { vod_id: parsedVideoId };
        if (!cachedDetail || !Object.keys(grouped).length) {
            logWarn("根文件夹缓存构建失败", { categoryId, parsedVideoId, source });
            return { page, pagecount: page, total: 0, list: [] };
        }
        const list = buildPanGroupEntries(video, grouped);
        logInfo("分类返回剧集网盘分组文件夹页", {
            categoryId,
            videoId: parsedVideoId,
            page,
            count: list.length,
            source,
            listPreview: list.map((item) => ({
                vod_name: item.vod_name,
                type_id: item.type_id,
                vod_tag: item.vod_tag,
                panType: item.panType,
                sourceType: item.sourceType,
                vod_id_preview: String(item.vod_id || "").slice(0, 80),
            })),
        });
        return {
            page,
            pagecount: page,
            total: list.length,
            list,
        };
    }

    if (parsedVideoId && parsed.isSourceFolder) {
        logInfo("分类命中线路根分组", { categoryId, page, parsedVideoId, sourceType: parsed.sourceType, source });
        const ensuredDetailCache = await ensureDetailCache(parsedVideoId, { vod_id: parsedVideoId });
        const cachedDetail = ensuredDetailCache?.cacheValue || null;
        const sourceGroups = Array.isArray(cachedDetail?.grouped?.[parsed.sourceType]) ? cachedDetail.grouped[parsed.sourceType] : [];
        const video = cachedDetail?.video || { vod_id: parsedVideoId };
        if (!sourceGroups.length) {
            logWarn("线路根分组缓存构建失败", { categoryId, parsedVideoId, sourceType: parsed.sourceType, source });
            return { page, pagecount: page, total: 0, list: [] };
        }
        const fullList = buildSourceLineEntries(video, parsed.sourceType, sourceGroups);
        const paged = paginateList(fullList, page, 20);
        return {
            page: paged.page,
            pagecount: paged.page,
            total: paged.total,
            list: paged.list,
        };
    }

    if (parsedVideoId && parsed.isSourceLineFolder) {
        logInfo("分类命中线路详情目录，转详情链路", {
            categoryId,
            page,
            parsedVideoId,
            sourceType: parsed.sourceType,
            lineIndex: parsed.lineIndex,
            source,
        });
        return await detail({
            ...params,
            videoId: categoryId,
            page,
            source,
        }, context);
    }

    if (parsedVideoId && parsedPanType) {
        const forwardedVideoId = categoryId;
        logInfo("分类命中网盘目录，转详情链路", {
            categoryId,
            page,
            parsedVideoId,
            parsedPanType,
            isShareEntry: parsed.isShareEntry,
            source,
            forwardedVideoIdPreview: String(forwardedVideoId || "").slice(0, 120),
            mode: parsed.isShareEntry ? "share-detail" : "share-folder-list",
        });
        return await detail({
            ...params,
            videoId: forwardedVideoId,
            page,
            source,
        }, context);
    }

    try {
        const path = buildCategoryPath(categoryId, page, filters);
        logInfo("分类请求参数", { categoryId, page, filters, path });
        const { html, host } = await requestHtmlWithFailover(path);
        const list = parseVideoList(html, host).map((item) => buildPanSearchEntryVod(item, host)).filter((item) => item.vod_id && item.vod_name);
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
    logInfo("搜索入口", {
        keyword,
        page,
        source: params?.source || "",
        rawKeyword: params?.wd || params?.keyword || "",
    });

    if (!keyword) {
        return { page, pagecount: page, total: 0, list: [] };
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
            const videoId = String(item?.id || "").trim();
            const folderVodId = buildPanRootFolderVodId(videoId);
            return {
                vod_id: folderVodId,
                vod_name: String(item?.name || "").trim(),
                vod_pic: normalizeImage(item?.pic || "", host),
                vod_remarks: "点击查看网盘分组",
                vod_tag: "folder",
                type_id: folderVodId,
                type_name: "剧集网盘分组",
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

async function detail(params, context = {}) {
    const rawVideoId = String(params.videoId || "").trim();
    const parsed = parsePanFolderVodId(rawVideoId);
    const videoId = extractVideoId(parsed.videoId || rawVideoId);
    const targetPanType = normalizeDriveType(parsed.panTypeKey || "");
    const sourceType = String(parsed.sourceType || "").trim().toLowerCase();
    const page = parsePage(params.page, 1);
    logInfo("详情入口", {
        rawVideoId,
        parsedVideoId: parsed.videoId || "",
        videoId,
        targetPanType,
        sourceType,
        lineIndex: parsed.lineIndex,
        isShareEntry: parsed.isShareEntry,
        isEncoded: parsed.isEncoded,
        page,
        source: params?.source || context?.from || "",
    });

    if (!videoId) {
        logWarn("详情请求缺少 videoId", { rawVideoId });
        return { list: [] };
    }

    const isFolderMode = !!targetPanType || !!sourceType;

    try {
        if (!isFolderMode) {
            const path = `/mv/${videoId}.html`;
            const { html, host } = await requestHtmlWithFailover(path);
            const detailInfo = parseDetailInfo(html, host);
            const video = {
                vod_id: videoId,
                vod_name: detailInfo.vod_name || "",
                vod_pic: detailInfo.vod_pic || "",
                vod_remarks: detailInfo.vod_remarks || "",
            };
            const payload = await getCachedOrBuildVideoPanDetail(video);
            const grouped = payload?.grouped || {};
            logInfo("剧集详情网盘分组原始数据", {
                videoId,
                groupKeys: Object.keys(grouped),
                groupSizes: Object.fromEntries(Object.entries(grouped).map(([key, links]) => [key, Array.isArray(links) ? links.length : 0])),
                detailName: detailInfo.vod_name || "",
            });
            const list = buildPanGroupEntries(video, grouped);
            logInfo("详情首层仅用于预热缓存，不返回文件夹页", {
                videoId,
                count: list.length,
                nextCategoryPreview: list.map((item) => ({
                    vod_name: item.vod_name,
                    type_id: item.type_id,
                    vod_tag: item.vod_tag,
                    panType: item.panType,
                    vod_id_preview: String(item.vod_id || "").slice(0, 80),
                })),
                nextRootFolderVodId: buildPanRootFolderVodId(videoId).slice(0, 80),
            });
            return { list: [] };
        }

        const ensuredDetailCache = await ensureDetailCache(videoId, { vod_id: videoId });
        const cachedDetail = ensuredDetailCache?.cacheValue || null;
        if (!cachedDetail || !cachedDetail.grouped) {
            logWarn("详情缓存构建失败", { videoId, targetPanType });
            return { list: [] };
        }

        const detailInfo = cachedDetail.detailInfo || {};
        const video = cachedDetail.video || { vod_id: videoId };

        if (sourceType) {
            const sourceGroups = Array.isArray(cachedDetail.grouped?.[sourceType]) ? cachedDetail.grouped[sourceType] : [];
            const targetGroup = sourceGroups.find((group, index) => (group?.lineIndex ?? index) === parsed.lineIndex);
            if (!targetGroup) {
                logWarn("详情未找到指定线路分组", { videoId, sourceType, lineIndex: parsed.lineIndex });
                return { list: [] };
            }
            const rawEpisodes = Array.isArray(targetGroup?.episodes) ? targetGroup.episodes : [];
            const magnetEpisodeCount = rawEpisodes.filter((ep) => String(ep?.playId || "").trim().startsWith("magnet:")).length;
            logInfo("磁力/采集线路详情分集统计", {
                videoId,
                sourceType,
                lineIndex: parsed.lineIndex,
                rawEpisodeCount: rawEpisodes.length,
                magnetEpisodeCount,
            });
            const normalizeSourceEpisodes = (episodes, defaultPrefix) => {
                let list = (Array.isArray(episodes) ? episodes : []).map((ep, index) => {
                    const displayName = pickEpisodeDisplayName(ep, defaultPrefix, index);
                    const rawName = normalizeText(ep?._rawName || ep?.fileName || ep?.file_name || ep?.name || displayName);
                    return {
                        name: displayName,
                        playId: String(ep?.playId || "").trim(),
                        _fid: String(ep?._fid || "").trim(),
                        _displayName: displayName,
                        _rawName: rawName || displayName,
                        _seedType: String(ep?._seedType || "").trim(),
                        _episodeNumber: Number.isFinite(ep?._episodeNumber) ? ep._episodeNumber : null,
                        _episodeRangeStart: Number.isFinite(ep?._episodeRangeStart) ? ep._episodeRangeStart : null,
                        _episodeRangeEnd: Number.isFinite(ep?._episodeRangeEnd) ? ep._episodeRangeEnd : null,
                    };
                }).filter((ep) => ep.playId);
                if (sourceType === "magnet") {
                    list = sortEpisodesByEpisodeNumber(list.map((ep) => ({
                        ...ep,
                        name: ep._displayName || ep.name,
                        episodeNumber: ep._episodeNumber,
                        episodeRangeStart: ep._episodeRangeStart,
                        episodeRangeEnd: ep._episodeRangeEnd,
                    }))).map(({ episodeNumber, episodeRangeStart, episodeRangeEnd, _displayName, _rawName, _seedType, _episodeNumber, _episodeRangeStart, _episodeRangeEnd, ...rest }) => ({
                        ...rest,
                        _displayName,
                        _rawName,
                        _seedType,
                        _episodeNumber: _episodeNumber ?? episodeNumber ?? null,
                        _episodeRangeStart: _episodeRangeStart ?? episodeRangeStart ?? null,
                        _episodeRangeEnd: _episodeRangeEnd ?? episodeRangeEnd ?? null,
                    }));
                }
                return list;
            };
            const rawSourceName = String(targetGroup?.name || (sourceType === "magnet" ? "磁力" : "采集线路")).trim();
            const normalizedPlaySources = [];
            if (sourceType === "magnet") {
                const convertedEpisodes = [];
                const convertFailures = [];
                logInfo("磁力线路开始同步秒传115", {
                    videoId,
                    lineIndex: parsed.lineIndex,
                    has115Cookie: !!GLOBAL_115_COOKIE,
                    magnetEpisodeCount,
                });
                for (const ep of rawEpisodes) {
                    const magnetPlayId = String(ep?.playId || "").trim();
                    if (!magnetPlayId.startsWith("magnet:")) {
                        convertFailures.push({ name: ep?.name || "", reason: "not_magnet_play_id" });
                        continue;
                    }
                    const converted = await build115EpisodesFromMagnet(magnetPlayId, ep?.name || "115资源");
                    if (converted?.episodes?.length) {
                        convertedEpisodes.push(...converted.episodes.map((item, itemIndex) => ({
                            ...item,
                            _originName: ep?.name || "",
                            _originDisplayName: ep?._displayName || ep?.name || "",
                            _originIndex: itemIndex,
                        })));
                    } else {
                        convertFailures.push({ name: ep?.name || "", reason: converted?.reason || converted?.state || "no_115_episodes" });
                    }
                }
                const normalized115Episodes = normalizeSourceEpisodes(convertedEpisodes, "115资源");
                if (normalized115Episodes.length > 0) {
                    logInfo("磁力线路已秒传并生成115线路", {
                        videoId,
                        lineIndex: parsed.lineIndex,
                        magnetEpisodeCount,
                        episodeCount: normalized115Episodes.length,
                        failureCount: convertFailures.length,
                        episodeNamePreview: normalized115Episodes.slice(0, 3).map((ep) => ep._displayName || ep.name),
                    });
                    normalizedPlaySources.push({
                        name: "115秒传",
                        episodes: normalized115Episodes.map((ep, index) => {
                            const episodeName = build115EpisodeDisplayName(ep, index);
                            return {
                                name: episodeName,
                                episodeName,
                                title: episodeName,
                                playId: ep.playId,
                                _fid: ep._fid,
                                _rawName: ep._rawName || ep.fileName || episodeName,
                                _episodeNumber: Number.isFinite(ep._episodeNumber) ? ep._episodeNumber : extractEpisodeNumber(ep._rawName || ep.fileName || episodeName),
                            };
                        }),
                    });
                } else {
                    logWarn("磁力线路秒传115失败，仅返回原磁力线路", {
                        videoId,
                        lineIndex: parsed.lineIndex,
                        magnetEpisodeCount,
                        has115Cookie: !!GLOBAL_115_COOKIE,
                        failures: convertFailures.slice(0, 5),
                    });
                }
            }
            const normalizedMagnetEpisodes = normalizeSourceEpisodes(rawEpisodes, "磁力资源");
            if (normalizedMagnetEpisodes.length > 0) {
                normalizedPlaySources.push({
                    name: sourceType === "magnet" ? "磁力" : rawSourceName,
                    episodes: normalizedMagnetEpisodes.map((ep) => ({
                        name: ep._displayName || ep.name,
                        playId: ep.playId,
                        _fid: ep._fid,
                        _rawName: ep._rawName || ep.name,
                    })),
                });
            }
            const baseVodName = stripPanTypeSuffix(detailInfo.vod_name || video.vod_name || "七味资源");
            const scrapeCandidates = [];
            const seenSourceScrapeIds = new Set();
            for (const source of normalizedPlaySources) {
                for (const ep of source.episodes || []) {
                    const fid = String(ep._fid || "").trim();
                    const rawName = normalizeText(ep._rawName || ep.name || ep.episodeName || "");
                    if (!fid || !rawName) continue;
                    const key = `${fid}|${rawName}`;
                    if (seenSourceScrapeIds.has(key)) continue;
                    seenSourceScrapeIds.add(key);
                    scrapeCandidates.push({
                        fid,
                        file_id: fid,
                        file_name: rawName,
                        name: rawName,
                        format_type: "video",
                    });
                }
            }
            const { scrapeData, videoMappings, scrapeType } = await getMergedMetadataCached(videoId, baseVodName, scrapeCandidates);
            const mappingPreview = (videoMappings || []).slice(0, 3).map((item) => `${String(item?.fileId || "").slice(0, 80)}=>${item?.episodeName || ""}`);
            const mappingEpisodePreview = (videoMappings || []).slice(0, 5).map((item) => ({
                fileId: String(item?.fileId || "").slice(0, 80),
                seasonNumber: item?.seasonNumber || null,
                episodeNumber: item?.episodeNumber || null,
                episodeName: item?.episodeName || "",
            }));
            logInfo("磁力/采集线路刮削映射统计", {
                videoId,
                sourceType,
                scrapeCandidateCount: scrapeCandidates.length,
                mappingCount: Array.isArray(videoMappings) ? videoMappings.length : 0,
                mappingPreview,
                mappingEpisodePreview,
                scrapeType,
            });
            for (const source of normalizedPlaySources) {
                for (const ep of source.episodes || []) {
                    const epNo = Number.isFinite(ep._episodeNumber) ? ep._episodeNumber : extractEpisodeNumber(ep._rawName || ep.name);
                    const mapping = findScrapeMapping({ videoMappings }, [ep._fid], epNo, ep._rawName || ep.name);
                    if (!mapping) {
                        if (ep._fid) {
                            logWarn("磁力/采集分集未命中刮削映射", {
                                videoId,
                                sourceName: source.name,
                                fid: String(ep._fid || "").slice(0, 120),
                                rawName: ep._rawName || ep.name,
                                episodeNumber: epNo || null,
                                mappingPreview,
                                mappingEpisodePreview,
                            });
                        }
                        continue;
                    }
                    const newName = buildScrapedEpisodeName(scrapeData, mapping, ep._rawName || ep.name, ep._displayName || ep.name);
                    if (newName) {
                        logInfo("磁力/采集分集应用刮削名", { sourceName: source.name, from: ep.name, to: newName, fid: String(ep._fid || "").slice(0, 120) });
                        ep.name = newName;
                        ep.episodeName = newName;
                        ep.title = newName;
                    }
                    ep._seasonNumber = mapping.seasonNumber;
                    ep._episodeNumber = mapping.episodeNumber;
                    ep.playId = rewritePlayIdMeta(ep.playId, {
                        sid: String(videoId || ""),
                        fid: ep._fid,
                        v: baseVodName,
                        e: newName || ep.name,
                        s: mapping.seasonNumber || "",
                        n: mapping.episodeNumber || "",
                    });
                }
            }
            const fallbackSourceName = normalizedPlaySources[0]?.name || rawSourceName;
            const legacyPlayFields = buildLegacyPlayFields(normalizedPlaySources);
            logInfo("磁力/采集线路详情返回格式", {
                videoId,
                sourceType,
                sourceCount: normalizedPlaySources.length,
                sources: summarizePlaySourcesForLog(normalizedPlaySources),
                legacyFrom: legacyPlayFields.vod_play_from,
                legacyUrlLength: legacyPlayFields.vod_play_url.length,
                legacyUrlPreview: legacyPlayFields.vod_play_url.slice(0, 500),
            });
            const vod = {
                vod_id: rawVideoId,
                vod_name: scrapeData?.title ? stripPanTypeSuffix(scrapeData.title) : baseVodName,
                vod_pic: scrapeData?.posterPath ? `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}` : (detailInfo.vod_pic || video.vod_pic || ""),
                vod_content: scrapeData?.overview || detailInfo.vod_content || "",
                vod_remarks: detailInfo.vod_remarks || fallbackSourceName,
                type_name: detailInfo.type_name || fallbackSourceName,
                vod_year: scrapeData?.releaseDate ? String(scrapeData.releaseDate).substring(0, 4) : (detailInfo.vod_year || ""),
                vod_area: detailInfo.vod_area || "",
                vod_actor: detailInfo.vod_actor || "",
                vod_director: detailInfo.vod_director || "",
                vod_play_sources: normalizedPlaySources,
                vod_play_from: legacyPlayFields.vod_play_from,
                vod_play_url: legacyPlayFields.vod_play_url,
            };
            logInfo("磁力/采集线路详情最终输出", {
                topKeys: ["list"],
                listCount: 1,
                vodKeys: Object.keys(vod),
                vod_id: vod.vod_id,
                vod_name: vod.vod_name,
                vod_play_sources: summarizePlaySourcesForLog(vod.vod_play_sources),
                vod_play_from: vod.vod_play_from,
                vod_play_url_length: vod.vod_play_url.length,
                vod_play_url_preview: vod.vod_play_url.slice(0, 800),
            });
            return { list: [vod] };
        }

        const links = Array.isArray(cachedDetail.grouped?.[targetPanType]) ? cachedDetail.grouped[targetPanType] : [];
        if (links.length === 0) {
            logWarn("详情未找到指定网盘分组", { videoId, targetPanType });
            return { list: [] };
        }

        if (!parsed.isShareEntry) {
            const fullList = await buildPanShareEntries(video, detailInfo, targetPanType, links);
            const paged = paginateList(fullList, page, 20);
            logInfo("返回网盘分享文件夹页", {
                videoId,
                targetPanType,
                count: paged.list.length,
                total: paged.total,
                page: paged.page,
                listPreview: paged.list.map((item) => ({
                    vod_name: item.vod_name,
                    vod_remarks: item.vod_remarks,
                    vod_tag: item.vod_tag,
                    vod_id_preview: String(item.vod_id || "").slice(0, 80),
                })),
            });
            return {
                page: paged.page,
                pagecount: paged.page,
                total: paged.total,
                list: paged.list,
            };
        }

        const shareURL = normalizeShareUrl(links[parsed.shareIndex] || "");
        if (!shareURL || !isPanUrl(shareURL)) {
            logWarn("详情未找到指定分享链接", { videoId, targetPanType, shareIndex: parsed.shareIndex });
            return { list: [] };
        }

        const callerSource = resolveCallerSource(params, context);
        const panTypeName = parsePanType(shareURL);
        const playSources = [];
        const scrapeCandidates = [];
        const panInfo = await loadPanFiles(shareURL);
        const files = panInfo?.videos || [];
        if (!files.length) {
            logWarn("网盘分享未解析到有效视频文件", { videoId, targetPanType, shareURL });
            return { list: [] };
        }

        const sourceName = panTypeName;
        const panEpisodes = [];
        for (const file of files) {
            const fileId = getFileId(file);
            if (!fileId) continue;
            const fileName = getFileName(file) || sourceName;
            const fileSize = getFileSize(file);
            const formattedName = fileSize > 0 ? `[${formatFileSize(fileSize)}] ${fileName}` : fileName;
            const fid = `${shareURL}|${fileId}`;
            const combinedId = `${shareURL}|${fileId}|||${encodeMeta({ sid: String(videoId || ""), fid, e: fileName, v: detailInfo.vod_name || video.vod_name || "" })}`;
            panEpisodes.push({
                name: formattedName,
                playId: combinedId,
                _fid: fid,
                _rawName: fileName,
            });
            scrapeCandidates.push({
                fid,
                file_id: fid,
                file_name: fileName,
                name: fileName,
                format_type: "video",
            });
        }
        if (panEpisodes.length === 0) {
            logWarn("网盘分享视频文件缺少可用 fileId", { videoId, targetPanType, shareURL, files: files.length });
            return { list: [] };
        }

        const multiRouteEnabled = DRIVE_TYPE_CONFIG.includes(targetPanType);
        if (!multiRouteEnabled) {
            playSources.push({ name: sourceName, episodes: panEpisodes.map((ep) => ({ ...ep })) });
        } else {
            const validRoutes = await detectValidPanRoutes(shareURL, files, callerSource, context, Math.max(1, MAX_PAN_VALID_ROUTES));
            if (validRoutes.length === 0) {
                logWarn("网盘分享未检测到有效播放路线", { videoId, targetPanType, shareURL });
                return { list: [] };
            }
            for (const routeName of validRoutes.slice(0, Math.max(1, MAX_PAN_VALID_ROUTES))) {
                playSources.push({
                    name: `${sourceName} ${routeName}`,
                    episodes: panEpisodes.map((ep) => ({ ...ep })),
                });
            }
        }

        const uniqueScrapeCandidates = [];
        const seenScrapeIds = new Set();
        for (const item of scrapeCandidates) {
            const key = `${item.fid}|${item.file_name}`;
            if (seenScrapeIds.has(key)) continue;
            seenScrapeIds.add(key);
            uniqueScrapeCandidates.push(item);
        }

        const { scrapeData, videoMappings, scrapeType } = await getMergedMetadataCached(videoId, detailInfo.vod_name || video.vod_name || "", uniqueScrapeCandidates);
        const mappingKeys = new Set((videoMappings || []).map((item) => String(item?.fileId || "").trim()).filter(Boolean));
        logInfo("详情页刮削映射统计", {
            videoId,
            scrapeType,
            scrapeCandidateCount: uniqueScrapeCandidates.length,
            mappingCount: Array.isArray(videoMappings) ? videoMappings.length : 0,
            mappingPreview: Array.from(mappingKeys).slice(0, 3),
        });

        for (const source of playSources) {
            for (const ep of source.episodes || []) {
                const mapping = (videoMappings || []).find((m) => m?.fileId === ep._fid);
                if (!mapping) {
                    logWarn("详情页未命中刮削映射", {
                        videoId,
                        expectedFileId: ep._fid,
                        expectedRawName: ep._rawName || ep.name,
                    });
                    continue;
                }
                const newName = buildScrapedEpisodeName(scrapeData, mapping, ep._rawName || ep.name);
                if (newName) ep.name = newName;
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
            episodes: (source.episodes || []).map((ep, index) => {
                const episodeName = pickEpisodeDisplayName(ep, "资源", index);
                return { name: episodeName, episodeName, title: episodeName, playId: ep.playId };
            }),
        }));
        const legacyPlayFields = buildLegacyPlayFields(normalizedPlaySources);

        const baseVodName = stripPanTypeSuffix(detailInfo.vod_name || video.vod_name || "七味资源");
        const vod = {
            vod_id: rawVideoId,
            vod_name: baseVodName,
            vod_pic: detailInfo.vod_pic || video.vod_pic || "",
            vod_content: detailInfo.vod_content || "",
            vod_remarks: detailInfo.vod_remarks || panTypeName,
            type_name: detailInfo.type_name || panTypeName,
            vod_year: detailInfo.vod_year || "",
            vod_area: detailInfo.vod_area || "",
            vod_actor: detailInfo.vod_actor || "",
            vod_director: detailInfo.vod_director || "",
            vod_play_sources: normalizedPlaySources,
            vod_play_from: legacyPlayFields.vod_play_from,
            vod_play_url: legacyPlayFields.vod_play_url,
        };

        if (scrapeData) {
            vod.vod_name = stripPanTypeSuffix(scrapeData.title || vod.vod_name);
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
            if (actors) vod.vod_actor = actors;
            const directors = (scrapeData.credits?.crew || [])
                .filter((c) => c?.job === "Director" || c?.department === "Directing")
                .slice(0, 3)
                .map((c) => c?.name)
                .filter(Boolean)
                .join(",");
            if (directors) vod.vod_director = directors;
            if (scrapeType && !vod.type_name) vod.type_name = scrapeType;
        }

        logInfo("网盘分享详情最终输出", {
            topKeys: ["list"],
            listCount: 1,
            vodKeys: Object.keys(vod),
            vod_id: vod.vod_id,
            vod_name: vod.vod_name,
            vod_play_sources: summarizePlaySourcesForLog(vod.vod_play_sources),
            vod_play_from: vod.vod_play_from,
            vod_play_url_length: vod.vod_play_url.length,
            vod_play_url_preview: vod.vod_play_url.slice(0, 800),
        });
        return { list: [vod] };
    } catch (error) {
        logError("分组详情解析失败", error);
        return { list: [] };
    }
}

function normalize115OfflineFiles(files = []) {
    return (Array.isArray(files) ? files : [])
        .map((file, index) => ({
            id: String(file?.id || file?.fid || file?.file_id || file?.pickcode || file?.pick_code || index).trim(),
            name: String(file?.name || file?.file_name || file?.server_filename || `115文件${index + 1}`).trim(),
            size: Number(file?.size || file?.file_size || 0) || 0,
            pickcode: String(file?.pickcode || file?.pick_code || "").trim(),
        }))
        .filter((file) => file.id && file.name);
}

async function cache115MagnetResult(magnet, result) {
    const normalizedMagnet = String(magnet || "").trim();
    if (!normalizedMagnet || !result || !Array.isArray(result.files) || result.files.length === 0) return;
    await setCachedJSON(build115MagnetCacheKey(normalizedMagnet), result, GLOBAL_115_MAGNET_CACHE_EX_SECONDS);
}

async function pushMagnetTo115(magnet, options = {}) {
    const cookie = GLOBAL_115_COOKIE;
    const normalizedMagnet = String(magnet || "").trim();
    const useCache = options.useCache !== false;
    const pollIntervalMs = Number(options.pollIntervalMs || 1500);
    const pollMaxAttempts = Number(options.pollMaxAttempts || 4);
    if (!cookie) {
        logWarn("115秒传跳过: 未配置 GLOBAL_115_COOKIE");
        return { ok: false, state: "no_cookie", files: [], magnet: normalizedMagnet };
    }
    if (!normalizedMagnet.startsWith("magnet:")) {
        logWarn("115秒传跳过: 无效磁力链接");
        return { ok: false, state: "invalid_magnet", files: [], magnet: normalizedMagnet };
    }
    const cacheKey = build115MagnetCacheKey(normalizedMagnet);
    if (useCache) {
        const cached = await getCachedJSON(cacheKey);
        if (cached && Array.isArray(cached.files) && cached.files.length > 0) {
            logInfo("115秒传缓存命中", { magnet: normalizedMagnet.substring(0, 80), fileCount: cached.files.length });
            return { ...cached, ok: true, state: cached.state || "cached", magnet: normalizedMagnet, cached: true };
        }
    }
    try {
        const uidMatch = cookie.match(/UID=(\d+)/);
        const uid = uidMatch ? uidMatch[1] : "";
        if (!uid) {
            logWarn("115秒传失败: 无法从 cookie 提取 UID");
            return { ok: false, state: "missing_uid", files: [], magnet: normalizedMagnet };
        }
        const commonHeaders = {
            "User-Agent": DEFAULT_HEADERS["User-Agent"],
            "Cookie": cookie,
            "Origin": "https://115.com",
            "Referer": "https://115.com/web/lixian/",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest"
        };
        const httpsAgent = new (require("https").Agent)({ rejectUnauthorized: false });
        const spaceRes = await axios.get("https://115.com/?ct=offline&ac=space", {
            headers: commonHeaders,
            timeout: 10000,
            httpsAgent
        });
        const spaceJson = spaceRes.data;
        if (!spaceJson.state) {
            logWarn("115秒传失败: 获取签名失败", spaceJson);
            return { ok: false, state: "space_failed", files: [], magnet: normalizedMagnet, raw: spaceJson };
        }
        const sign = spaceJson.sign;
        const reqTime = spaceJson.time;
        if (!sign || !reqTime) {
            logWarn("115秒传失败: 签名数据不完整");
            return { ok: false, state: "space_invalid", files: [], magnet: normalizedMagnet, raw: spaceJson };
        }
        const addTask = async () => {
            const addRes = await axios.post("https://115.com/web/lixian/?ct=lixian&ac=add_task_url",
                `url=${encodeURIComponent(normalizedMagnet)}&uid=${uid}&sign=${sign}&time=${reqTime}`,
                {
                    headers: {
                        ...commonHeaders,
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    },
                    timeout: 15000,
                    httpsAgent
                }
            );
            return addRes.data || {};
        };
        const pollTaskUntilFiles = async (firstJson) => {
            let currentJson = firstJson || {};
            for (let attempt = 0; attempt < pollMaxAttempts; attempt++) {
                const currentFiles = normalize115OfflineFiles(currentJson?.files || []);
                if (currentFiles.length > 0) return { json: currentJson, files: currentFiles, attempts: attempt };
                await sleep(pollIntervalMs);
                currentJson = await addTask();
                const nextFiles = normalize115OfflineFiles(currentJson?.files || []);
                if (nextFiles.length > 0) return { json: currentJson, files: nextFiles, attempts: attempt + 1 };
                if (currentJson?.errcode === 10008) return { json: currentJson, files: nextFiles, attempts: attempt + 1 };
            }
            return { json: currentJson, files: normalize115OfflineFiles(currentJson?.files || []), attempts: pollMaxAttempts };
        };
        const addJson = await addTask();
        let files = normalize115OfflineFiles(addJson?.files || []);
        let finalJson = addJson;
        let pollAttempts = 0;
        if ((addJson.state || addJson.errcode === 0 || addJson.errcode === 10008) && files.length === 0) {
            const polled = await pollTaskUntilFiles(addJson);
            finalJson = polled.json || addJson;
            files = polled.files || [];
            pollAttempts = polled.attempts || 0;
        }
        if (finalJson.state || finalJson.errcode === 0 || finalJson.errcode === 10008) {
            const result = {
                ok: true,
                state: finalJson.errcode === 10008 ? "exists" : (files.length > 0 ? "submitted" : "submitted_waiting"),
                magnet: normalizedMagnet,
                infoHash: String(finalJson.info_hash || "").trim(),
                files,
                raw: finalJson,
            };
            logInfo(finalJson.errcode === 10008 ? "115任务已存在" : (files.length > 0 ? "115秒传成功" : "115秒传提交后轮询中"), {
                magnet: normalizedMagnet.substring(0, 80),
                fileCount: files.length,
                attempts: pollAttempts,
            });
            if (files.length > 0) await cache115MagnetResult(normalizedMagnet, result);
            return result;
        }
        logWarn("115秒传失败", finalJson);
        return { ok: false, state: "add_failed", files, magnet: normalizedMagnet, raw: finalJson };
    } catch (error) {
        logError("115秒传异常", error);
        return { ok: false, state: "exception", files: [], magnet: normalizedMagnet, error: error.message || String(error) };
    }
}

async function build115EpisodesFromMagnet(magnet, baseName = "115资源") {
    const result = await pushMagnetTo115(magnet);
    if (!result?.ok) {
        logWarn("115秒传未生成剧集", {
            magnet: String(magnet || "").slice(0, 100),
            state: result?.state || "unknown",
            error: result?.error || "",
            fileCount: Array.isArray(result?.files) ? result.files.length : 0,
        });
        return { episodes: [], reason: result?.state || "push_failed", state: result?.state || "" };
    }
    if (!Array.isArray(result.files) || result.files.length === 0) {
        logWarn("115秒传成功但未返回文件列表", {
            magnet: String(magnet || "").slice(0, 100),
            state: result?.state || "",
            rawKeys: result?.raw && typeof result.raw === "object" ? Object.keys(result.raw).slice(0, 12) : [],
        });
        return { episodes: [], reason: "empty_files", state: result?.state || "" };
    }
    const episodes = result.files.map((file, index) => {
        const rawName = cleanPlayLabel(file.name, `${baseName}${index + 1}`);
        const formattedName = file.size > 0 ? `[${formatFileSize(file.size)}] ${rawName}` : rawName;
        const episodeRange = extractEpisodeRange(rawName);
        const episodeNumber = episodeRange ? null : extractEpisodeNumber(rawName);
        const shortName = build115ButtonName(index);
        const displayName = cleanPlayLabel(formattedName, rawName || shortName);
        const playMeta = encodeMeta({ type: "115_magnet", magnet, fileName: rawName, fileId: file.id, pickcode: file.pickcode });
        return {
            name: shortName,
            title: shortName,
            episodeName: shortName,
            playId: build115MagnetPlayId({ magnet, fileName: rawName, fileId: file.id, pickcode: file.pickcode }),
            _fid: `115magnet:${result.infoHash || crypto.createHash("sha1").update(String(magnet || "")).digest("hex")}:${file.id}`,
            _rawName: rawName,
            _displayName: displayName,
            _seedType: "115",
            _episodeNumber: episodeNumber,
            _episodeRangeStart: episodeRange?.start ?? null,
            _episodeRangeEnd: episodeRange?.end ?? null,
            fileName: rawName,
        };
    });
    logInfo("115秒传文件分集生成完成", {
        magnet: String(magnet || "").slice(0, 100),
        episodeCount: episodes.length,
        episodeNamePreview: episodes.slice(0, 3).map((ep) => ep._displayName || ep.name),
    });
    return { name: "115网盘", episodes, result };
}

function build115Headers() {
    return {
        "User-Agent": DEFAULT_HEADERS["User-Agent"],
        "Cookie": GLOBAL_115_COOKIE,
        "Origin": "https://115.com",
        "Referer": "https://115.com/",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
    };
}

function same115FileName(a = "", b = "") {
    const basename = (value) => String(value || "").split(/[\\/]/).pop().trim();
    return basename(a) && basename(a) === basename(b);
}

async function find115FileByName(fileName = "") {
    const targetName = String(fileName || "").trim();
    if (!targetName || !GLOBAL_115_COOKIE) return null;
    const key = buildCacheKey("qiwei-group:115-file", targetName);
    const cached = await getCachedJSON(key);
    if (cached?.fid || cached?.pickcode) {
        logInfo("115文件搜索缓存命中", { fileName: targetName, fid: cached.fid || "", pickcode: cached.pickcode || "" });
        return cached;
    }

    const keyword = targetName.split(/[\\/]/).pop().replace(/\.[a-z0-9]{2,5}$/i, "").slice(0, 80);
    const url = `https://webapi.115.com/files/search?search_value=${encodeURIComponent(keyword)}&format=json&type=4&limit=50`;
    const res = await axios.get(url, {
        headers: build115Headers(),
        timeout: 10000,
        httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false }),
    });
    const json = res.data || {};
    const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json?.data?.list) ? json.data.list : (Array.isArray(json?.files) ? json.files : []));
    const normalized = list.map((item) => ({
        fid: String(item.fid || item.file_id || item.id || item.cid || "").trim(),
        name: String(item.n || item.name || item.file_name || item.server_filename || "").trim(),
        pickcode: String(item.pc || item.pickcode || item.pick_code || "").trim(),
        size: Number(item.s || item.size || item.file_size || 0) || 0,
    })).filter((item) => item.name && (item.fid || item.pickcode));
    const matched = normalized.find((item) => same115FileName(item.name, targetName)) || normalized[0] || null;
    logInfo("115文件搜索结果", { keyword, targetName, resultCount: normalized.length, matched: matched?.name || "" });
    if (matched) await setCachedJSON(key, matched, GLOBAL_115_MAGNET_CACHE_EX_SECONDS);
    return matched;
}

async function get115VideoPlayUrl(file) {
    const pickcode = String(file?.pickcode || file?.pc || "").trim();
    if (!pickcode) throw new Error("115真实文件缺少 pickcode，无法解析播放地址");
    const headers = build115Headers();
    const urls = [
        `https://115.com/api/video/m3u8/${encodeURIComponent(pickcode)}.m3u8`,
        `https://webapi.115.com/files/video?pickcode=${encodeURIComponent(pickcode)}`,
    ];
    let lastError = null;
    for (const url of urls) {
        try {
            const res = await axios.get(url, {
                headers,
                timeout: 10000,
                maxRedirects: 0,
                validateStatus: (status) => status >= 200 && status < 400,
                httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false }),
            });
            const location = res.headers?.location || "";
            if (location) return location;
            if (typeof res.data === "string" && res.data.includes("#EXTM3U")) return url;
            const data = res.data || {};
            const candidate = data?.data?.video_url || data?.data?.url || data?.video_url || data?.url || data?.data?.m3u8 || data?.m3u8 || "";
            if (candidate) return candidate;
        } catch (error) {
            lastError = error;
            logWarn("115视频地址解析尝试失败", { pickcode, url, error: error.message || String(error) });
        }
    }
    throw lastError || new Error("115未返回可播放地址");
}

async function resolve115MagnetPlay(playId, flag, callerSource, context, params = {}) {
    const data = typeof playId === "object" && playId
        ? playId
        : decode115MagnetPlayMeta(playId);
    const magnet = String(data.magnet || "").trim();
    const targetFileId = String(data.fileId || "").trim();
    const result = await pushMagnetTo115(magnet);
    const targetFile = (result.files || []).find((file) => String(file.id) === targetFileId) || (result.files || [])[0];
    if (!targetFile?.name) throw new Error("115秒传缓存未找到目标文件名");

    const realFile = await find115FileByName(targetFile.name);
    if (!realFile) throw new Error("115网盘内未搜索到真实文件");

    const metadataPromise = (async () => {
        const metaResult = {
            danmakuList: [],
            scrapeTitle: "",
            scrapePic: "",
            episodeNumber: data.n || null,
            episodeName: String(data.e || params.episodeName || "").trim(),
            mappingMatched: false,
            mappingFileId: "",
            danmuFileName: "",
        };
        const videoIdForScrape = String(params.vodId || data.sid || "").trim();
        if (!videoIdForScrape) {
            logWarn("115秒传弹幕跳过: 缺少视频ID", { fileId: targetFileId, fileName: targetFile.name || data.fileName || "" });
            return metaResult;
        }
        try {
            const metadata = await OmniBox.getScrapeMetadata(videoIdForScrape);
            if (!metadata || !metadata.scrapeData || !Array.isArray(metadata.videoMappings)) {
                logWarn("115秒传弹幕跳过: 无刮削元数据", { videoId: videoIdForScrape, hasMetadata: !!metadata });
                return metaResult;
            }
            const infoHash = result.infoHash || crypto.createHash("sha1").update(String(magnet || "")).digest("hex");
            const syntheticFid = `115magnet:${infoHash}:${targetFile.id}`;
            const epNo = Number(data.n || extractEpisodeNumber(data.e || targetFile.name || data.fileName || ""));
            const mapping = findScrapeMapping(
                metadata,
                [data.fid, syntheticFid, targetFile._fid].filter(Boolean),
                Number.isFinite(epNo) && epNo > 0 ? epNo : null,
                targetFile.name || data.fileName || ""
            );
            if (!mapping) {
                logWarn("115秒传弹幕未命中刮削映射", {
                    videoId: videoIdForScrape,
                    fid: data.fid || syntheticFid,
                    fileId: targetFileId,
                    fileName: targetFile.name || data.fileName || "",
                    mappingPreview: metadata.videoMappings.slice(0, 3).map((item) => String(item?.fileId || "").slice(0, 120)),
                });
                return metaResult;
            }

            const scrapeData = metadata.scrapeData;
            metaResult.mappingMatched = true;
            metaResult.mappingFileId = String(mapping.fileId || "");
            metaResult.scrapeTitle = scrapeData.title || "";
            if (scrapeData.posterPath) {
                metaResult.scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
            }
            if (mapping.episodeNumber) metaResult.episodeNumber = mapping.episodeNumber;
            if (mapping.episodeName) metaResult.episodeName = buildScrapedEpisodeName(scrapeData, mapping, targetFile.name || data.fileName || "", data.e || "") || mapping.episodeName;

            const fileName = buildScrapedDanmuFileName(
                scrapeData,
                metadata.scrapeType || "",
                mapping,
                String(params.vodName || data.v || scrapeData.title || "").trim(),
                metaResult.episodeName
            );
            metaResult.danmuFileName = fileName;
            if (fileName) {
                const matchedDanmaku = typeof OmniBox.getDanmakuByFileName === "function"
                    ? await OmniBox.getDanmakuByFileName(fileName)
                    : await matchDanmu(fileName);
                if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
                    metaResult.danmakuList = matchedDanmaku;
                }
                logInfo("115秒传弹幕匹配完成", {
                    videoId: videoIdForScrape,
                    fileName,
                    mappingFileId: metaResult.mappingFileId,
                    danmakuCount: metaResult.danmakuList.length,
                });
            }
        } catch (error) {
            logWarn("读取115秒传弹幕元数据失败", { error: error.message || String(error) });
        }
        return metaResult;
    })();

    const [playUrlResult, metadataResult] = await Promise.allSettled([
        get115VideoPlayUrl(realFile),
        metadataPromise,
    ]);
    if (playUrlResult.status !== "fulfilled") {
        throw playUrlResult.reason || new Error("115未返回可播放地址");
    }
    const playUrl = playUrlResult.value;
    const metadataValue = metadataResult.status === "fulfilled" ? metadataResult.value : null;
    const finalDanmaku = Array.isArray(metadataValue?.danmakuList) ? metadataValue.danmakuList : [];
    const playResult = {
        urls: [{ name: "115播放", url: playUrl }],
        flag: "115网盘",
        header: {
            "User-Agent": DEFAULT_HEADERS["User-Agent"],
            "Referer": "https://115.com/",
            "Cookie": GLOBAL_115_COOKIE,
        },
        parse: 0,
        danmaku: finalDanmaku,
    };
    addPlayHistoryAsync({
        sourceId: context?.sourceId || "七味分组-115秒传",
        vodId: String(params.vodId || data.sid || magnet || targetFileId || realFile.fid || playUrl).trim(),
        title: String(metadataValue?.scrapeTitle || params.vodName || data.v || data.title || data.fileName || targetFile.name || "115秒传资源").trim(),
        pic: metadataValue?.scrapePic || "",
        episode: String(metadataValue?.episodeName || data.e || realFile.name || targetFile.name || "").trim(),
        episodeName: String(metadataValue?.episodeName || data.e || realFile.name || targetFile.name || "").trim(),
        episodeNumber: metadataValue?.episodeNumber || data.n || null,
    });
    logInfo("115磁力文件播放地址返回", {
        fid: realFile.fid || "",
        pickcode: realFile.pickcode || "",
        fileName: realFile.name || targetFile.name,
        mappingMatched: !!metadataValue?.mappingMatched,
        episodeNumber: metadataValue?.episodeNumber || data.n || null,
        danmakuCount: finalDanmaku.length,
        output: summarizePlayResultForLog(playResult),
    });
    return playResult;
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

    if (is115MagnetPlayId(playId, flag)) {
        const magnetMeta = decode115MagnetPlayMeta(playId);
        try {
            logInfo("识别为115秒传播放，直接走115网盘解析", {
                flag,
                hasPrefix: playId.startsWith("115magnet:"),
                kind: magnetMeta.kind || "",
                fileName: magnetMeta.fileName || "",
                fileId: magnetMeta.fileId || "",
            });
            return await resolve115MagnetPlay(playId, flag, callerSource, context, params);
        } catch (error) {
            logWarn("115磁力播放失败，回退磁力", { error: error.message || String(error), fileName: magnetMeta.fileName || playMeta.fileName || "" });
            if (magnetMeta.magnet) playId = magnetMeta.magnet;
            else if (playMeta.magnet) playId = playMeta.magnet;
            else throw error;
        }
    }

    if (playId.startsWith("magnet:")) {
        const pushed = await pushMagnetTo115(playId);
        const displayName = pushed?.ok ? "磁力资源（已提交115）" : "磁力资源";
        addPlayHistoryAsync({
            sourceId: context?.sourceId || "七味分组-磁力",
            vodId: String(params.vodId || playMeta.sid || playId).trim(),
            title: String(params.vodName || playMeta.v || playMeta.e || displayName).trim(),
            episode: String(params.episodeName || playMeta.e || displayName).trim(),
            episodeName: String(params.episodeName || playMeta.e || displayName).trim(),
            episodeNumber: playMeta.n || null,
        });
        return {
            urls: [{ name: displayName, url: playId }],
            parse: 0,
            header: {
                ...DEFAULT_HEADERS,
                Referer: `${getCurrentHost()}/`,
            },
        };
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

                        const formattedFileId = `${shareURL}|${fileId}`;
                        const mapping = metadata.videoMappings.find((m) => m?.fileId === formattedFileId || m?.fileId === `${formattedFileId}|${videoIdForScrape}` || m?.fileId === playMeta.fid);
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
                    const metadataValue = metadataResult.status === "fulfilled" ? metadataResult.value : null;
                    const finalDanmaku = metadataValue?.danmakuList?.length ? metadataValue.danmakuList : (playInfo?.danmaku || []);

                    addPlayHistoryAsync({
                        sourceId: context?.sourceId || `七味分组-${parsePanType(shareURL) || "网盘"}`,
                        vodId: String(params.vodId || playMeta.sid || shareURL).trim(),
                        title: String(metadataValue?.scrapeTitle || params.vodName || playMeta.v || playMeta.e || "网盘资源").trim(),
                        pic: metadataValue?.scrapePic || "",
                        episode: String(metadataValue?.episodeName || params.episodeName || playMeta.e || fileId).trim(),
                        episodeName: String(metadataValue?.episodeName || params.episodeName || playMeta.e || fileId).trim(),
                        episodeNumber: metadataValue?.episodeNumber || playMeta.n || null,
                    });
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

    if (isPanUrl(playId)) {
        const pushUrl = playId.startsWith("push://") ? playId : `push://${playId}`;
        return {
            urls: [{ name: "网盘资源", url: pushUrl }],
            parse: 0,
            header: {},
        };
    }

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

    if (isDirectVideoUrl(resolvedPlayUrl)) {
        logInfo("检测到直链视频，直接返回", { url: resolvedPlayUrl });
        return {
            urls: [{ name: "默认线路", url: resolvedPlayUrl }],
            parse: 0,
            header: defaultHeader,
        };
    }

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

            addPlayHistoryAsync({
                sourceId: context?.sourceId || `七味分组-${flag || "采集"}`,
                vodId: String(params.vodId || playMeta.sid || playId).trim(),
                title: String(vodName || params.vodName || playMeta.v || playMeta.e || "七味资源").trim(),
                pic: "",
                episode: String(episodeName || params.episodeName || playMeta.e || "").trim(),
                episodeName: String(episodeName || params.episodeName || playMeta.e || "").trim(),
                episodeNumber: playMeta.n || null,
            });
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

_load(2, "玩偶", function (module, exports, require) {
// @name 玩偶
// @author
// @description 刮削：支持，弹幕：支持，播放记录：支持
// @dependencies: axios, cheerio
// @version 1.2.1
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/网盘/玩偶.js

// 引入 OmniBox SDK
const OmniBox = require("omnibox_sdk");
// 引入 cheerio(用于 HTML 解析)
let cheerio;
try {
  cheerio = require("cheerio");
} catch (error) {
  throw new Error("cheerio 模块未找到,请先安装:npm install cheerio");
}
let axios;
try {
  axios = require("axios");
} catch (error) {
  throw new Error("axios 模块未找到,请先安装:npm install axios");
}
const https = require("https");
const fs = require("fs");

// ==================== 配置区域 ====================
// 网站地址(可以通过环境变量配置，支持多个域名用;分割)
const WEB_SITE_CONFIG = process.env.WEB_SITE_WOGG || "https://wogg.xxooo.cf;https://wogg.333232.xyz;https://www.wogg.net;";
const WEB_SITES = WEB_SITE_CONFIG.split(";")
  .map((url) => url.trim())
  .filter((url) => url);
// 读取环境变量：支持多个网盘类型，用分号分割
const DRIVE_TYPE_CONFIG = (process.env.DRIVE_TYPE_CONFIG || "quark;uc")
  .split(";")
  .map((t) => t.trim())
  .filter((t) => t);
// 读取环境变量：线路名称和顺序，用分号分割
const SOURCE_NAMES_CONFIG = (process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连")
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s);
// 读取环境变量：详情页播放线路的网盘排序顺序。仅作用于 detail() 里的播放线路，不作用于搜索结果。
const DRIVE_ORDER = (process.env.DRIVE_ORDER || "baidu;tianyi;quark;uc;115;xunlei;ali;123pan").split(";").map((s) => s.trim().toLowerCase()).filter(Boolean);
// 详情链路缓存时间（秒），默认 12 小时
const WOGG_CACHE_EX_SECONDS = Number(process.env.WOGG_CACHE_EX_SECONDS || 43200);
const WOGG_VERBOSE_DETAIL = String(process.env.WOGG_VERBOSE_DETAIL || "0") === "1";
// ==================== CF 盾绕过配置（FlareSolverr）====================
// 项目地址：https://github.com/FlareSolverr/FlareSolverr
// 优先读取站点专用变量，其次回退通用 FLARESOLVERR_URL；仅在有值时才启用 CF 绕过逻辑。
const WOOG_FLARESOLVERR_URL = process.env.WOOG_FLARESOLVERR_URL || process.env.FLARESOLVERR_URL || "";
const WOOG_FLARESOLVERR_SESSION = process.env.WOOG_FLARESOLVERR_SESSION || "wogg";
const WOOG_FLARESOLVERR_TIMEOUT_MS = parseInt(process.env.WOOG_FLARESOLVERR_TIMEOUT_MS || "45000", 10) || 45000;
// 手动指定 cf_clearance cookie（设置后跳过自动获取）
const WOOG_CF_COOKIE = process.env.WOOG_CF_COOKIE || "";
// 是否启用自动 CF 绕过（设为 0 可关闭）
const WOOG_CF_AUTO = process.env.WOOG_CF_AUTO !== "0";
// CF cookie 缓存相关
const WOOG_CF_CACHE_KEY = process.env.WOOG_CF_CACHE_KEY || "wogg:cf_clearance";
const WOOG_CF_MAX_AGE_SECONDS = parseInt(process.env.WOOG_CF_MAX_AGE_SECONDS || "21600", 10) || 21600;

// 域名会话缓存（复用 FlareSolverr 的完整请求头 + cookie 绕过同一域名下其他 URL），默认 1800 秒
const WOOG_CF_SESSION_CACHE_TTL = parseInt(process.env.WOOG_CF_SESSION_CACHE_TTL || "1800", 10) || 1800;
const WOOG_CF_SESSION_CACHE_KEY_PREFIX = (process.env.WOOG_CF_SESSION_CACHE_KEY_PREFIX || "wogg:session:").trim();
// ==================== CF 盾绕过配置结束 ====================
// ==================== 配置区域结束 ====================

if (WEB_SITES.length === 0) {
  throw new Error("WEB_SITE 配置不能为空");
}

OmniBox.log("info", `配置了 ${WEB_SITES.length} 个域名: ${WEB_SITES.join(", ")}`);

const INSECURE_HTTPS_AGENT = new https.Agent({
  rejectUnauthorized: false,
});

function buildCacheKey(prefix, value) {
  return `${prefix}:${value}`;
}

function logDetailDebug(message) {
  if (WOGG_VERBOSE_DETAIL) {
    OmniBox.log("info", message);
  }
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

function sortPlaySourcesByDriveOrder(playSources = []) {
  if (!Array.isArray(playSources) || playSources.length <= 1 || DRIVE_ORDER.length === 0) {
    return playSources;
  }
  const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
  return [...playSources].sort((a, b) => {
    const aType = inferDriveTypeFromSourceName(a?.name || "");
    const bType = inferDriveTypeFromSourceName(b?.name || "");
    const aOrder = orderMap.has(aType) ? orderMap.get(aType) : Number.MAX_SAFE_INTEGER;
    const bOrder = orderMap.has(bType) ? orderMap.get(bType) : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return 0;
  });
}

async function getCachedJSON(key) {
  try {
    return await OmniBox.getCache(key);
  } catch (error) {
    OmniBox.log("warn", `[cache] 读取缓存失败: key=${key}, err=${error.message}`);
    return null;
  }
}

async function setCachedJSON(key, value, exSeconds) {
  try {
    await OmniBox.setCache(key, value, exSeconds);
  } catch (error) {
    OmniBox.log("warn", `[cache] 写入缓存失败: key=${key}, err=${error.message}`);
  }
}

async function getDetailPageCached(videoId) {
  const cacheKey = buildCacheKey("wogg:detailHtml", videoId);
  let detailPage = await getCachedJSON(cacheKey);
  if (!detailPage) {
    detailPage = await requestWithFailover(videoId);
    if (detailPage && detailPage.response && detailPage.response.statusCode === 200 && detailPage.response.body) {
      await setCachedJSON(cacheKey, detailPage, WOGG_CACHE_EX_SECONDS);
    }
  }
  return detailPage;
}

async function getDriveInfoCached(shareURL) {
  const cacheKey = buildCacheKey("wogg:driveInfo", shareURL);
  let driveInfo = await getCachedJSON(cacheKey);
  if (!driveInfo) {
    driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
    await setCachedJSON(cacheKey, driveInfo, WOGG_CACHE_EX_SECONDS);
  }
  return driveInfo;
}

async function getRootFileListCached(shareURL) {
  const cacheKey = buildCacheKey("wogg:rootFiles", shareURL);
  let fileList = await getCachedJSON(cacheKey);
  if (!fileList) {
    fileList = await OmniBox.getDriveFileList(shareURL, "0");
    if (fileList && fileList.files && Array.isArray(fileList.files)) {
      await setCachedJSON(cacheKey, fileList, WOGG_CACHE_EX_SECONDS);
    }
  }
  return fileList;
}

async function getAllVideoFilesCached(shareURL, rootFiles) {
  const cacheKey = buildCacheKey("wogg:videoFiles", shareURL);
  let allVideoFiles = await getCachedJSON(cacheKey);
  if (!Array.isArray(allVideoFiles) || allVideoFiles.length === 0) {
    allVideoFiles = await getAllVideoFiles(shareURL, rootFiles, "0");
    if (Array.isArray(allVideoFiles) && allVideoFiles.length > 0) {
      await setCachedJSON(cacheKey, allVideoFiles, WOGG_CACHE_EX_SECONDS);
    }
  } else {
    logDetailDebug(`命中视频文件缓存: ${shareURL}, 数量: ${allVideoFiles.length}`);
  }
  return allVideoFiles;
}

function buildMergedVideoFilesForScraping(panUrlResults, videoId) {
  const mergedVideoFilesForScraping = [];
  for (const result of panUrlResults) {
    const { shareURL, allVideoFiles } = result;
    for (const file of allVideoFiles) {
      const fileId = file.fid || file.file_id || "";
      const formattedFileId = fileId ? `${shareURL}|${fileId}|${videoId}` : fileId;
      mergedVideoFilesForScraping.push({
        ...file,
        fid: formattedFileId,
        file_id: formattedFileId,
        _shareURL: shareURL,
      });
    }
  }
  return mergedVideoFilesForScraping;
}

async function getMergedMetadataCached(videoId, vodName, mergedVideoFilesForScraping) {
  const metadataCacheKey = buildCacheKey("wogg:metadata", videoId);
  const metadataRefreshLockKey = buildCacheKey("wogg:metadataRefreshLock", videoId);

  let scrapeData = null;
  let videoMappings = [];
  let scrapeType = "";
  const cachedMetadata = await getCachedJSON(metadataCacheKey);

  if (cachedMetadata) {
    scrapeData = cachedMetadata.scrapeData || null;
    videoMappings = cachedMetadata.videoMappings || [];
    scrapeType = cachedMetadata.scrapeType || "";
    logDetailDebug(`命中统一元数据缓存: ${videoId}, 映射数量: ${videoMappings.length}`);
  }

  const refreshMetadataInBackground = async () => {
    const refreshLock = await getCachedJSON(metadataRefreshLockKey);
    if (refreshLock) return;
    await setCachedJSON(metadataRefreshLockKey, { refreshing: true }, WOGG_CACHE_EX_SECONDS);

    try {
      logDetailDebug(`后台统一刷新元数据: ${videoId}`);
      await OmniBox.processScraping(videoId, vodName, vodName, mergedVideoFilesForScraping);
      const metadata = await OmniBox.getScrapeMetadata(videoId);
      await setCachedJSON(metadataCacheKey, {
        scrapeData: metadata?.scrapeData || null,
        videoMappings: metadata?.videoMappings || [],
        scrapeType: metadata?.scrapeType || "",
      }, WOGG_CACHE_EX_SECONDS);
    } catch (error) {
      OmniBox.log("warn", `后台统一刷新元数据失败: ${error.message}`);
    }
  };

  if (!cachedMetadata && mergedVideoFilesForScraping.length > 0) {
    try {
      OmniBox.log("info", `未命中统一元数据缓存，开始同步刮削: ${videoId}, 文件数: ${mergedVideoFilesForScraping.length}`);
      await OmniBox.processScraping(videoId, vodName, vodName, mergedVideoFilesForScraping);
      const metadata = await OmniBox.getScrapeMetadata(videoId);
      scrapeData = metadata?.scrapeData || null;
      videoMappings = metadata?.videoMappings || [];
      scrapeType = metadata?.scrapeType || "";
      await setCachedJSON(metadataCacheKey, {
        scrapeData,
        videoMappings,
        scrapeType,
      }, WOGG_CACHE_EX_SECONDS);
    } catch (error) {
      OmniBox.log("error", `同步统一获取元数据失败: ${error.message}`);
      if (error.stack) {
        OmniBox.log("error", `同步统一获取元数据错误堆栈: ${error.stack}`);
      }
    }
  } else if (cachedMetadata) {
    refreshMetadataInBackground().catch((error) => {
      OmniBox.log("warn", `异步统一刷新元数据失败: ${error.message}`);
    });
  }

  return {
    scrapeData,
    videoMappings,
    scrapeType,
    cachedMetadata,
  };
}

async function collectDriveTypeCountMap(panUrls = []) {
  const driveTypeCountMap = {};
  for (const shareURL of panUrls) {
    try {
      const driveInfo = await getDriveInfoCached(shareURL);
      const displayName = driveInfo?.displayName || "未知网盘";
      driveTypeCountMap[displayName] = (driveTypeCountMap[displayName] || 0) + 1;
    } catch (error) {
      OmniBox.log("warn", `统计网盘类型失败: ${shareURL}, error=${error.message}`);
    }
  }
  return driveTypeCountMap;
}

async function httpRequest(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  // 携带已缓存的 CF cookie（首次请求时自动加载，重试时复用传入值）
  const currentCookie = options._cfCookie || (options._cfChecked ? "" : await getCachedCfCookie().catch(() => ""));
  const headers = {
    ...(options.headers || {}),
    ...(currentCookie ? { Cookie: currentCookie } : {}),
  };

  const response = await axios({
    url,
    method,
    headers,
    data: options.body,
    timeout: options.timeout,
    httpsAgent: INSECURE_HTTPS_AGENT,
    validateStatus: () => true,
  });

  let body = response.data;
  if (typeof body !== "string") {
    body = body === undefined || body === null ? "" : JSON.stringify(body);
  }

  // 检测 CF 盾拦截 → 直接调 FlareSolverr 绕过
  if (isBlockedHtml(body) && WOOG_FLARESOLVERR_URL) {
    OmniBox.log("warn", `[cf] ${url} 被CF盾拦截，通过 FlareSolverr 绕过`);
    try {
      const result = await fetchCfClearanceWithFlareSolverr(url);
      if (result && result.body) {
        OmniBox.log("info", `[cf] FlareSolverr 已返回页面内容: ${url}, status=${result.statusCode}, body长度=${result.body.length}`);
        return {
          statusCode: result.statusCode,
          body: result.body,
          headers: result.headers || {},
          _cfSource: "flaresolverr",
        };
      }
    } catch (err) {
      OmniBox.log("warn", `[cf] FlareSolverr 绕过失败: ${err.message}`);
    }
  }

  return {
    statusCode: response.status,
    body,
    headers: response.headers || {},
  };
}

function isBlockedHtml(body = "") {
  if (!body || typeof body !== "string") {
    return false;
  }
  const lower = body.toLowerCase();
  return lower.includes("just a moment") || lower.includes("cf-browser-verification") || lower.includes("captcha") || lower.includes("访问验证");
}

// ==================== CF 盾辅助函数 ====================

function cookiesArrayToString(cookies = []) {
  return (Array.isArray(cookies) ? cookies : [])
    .map((item) => ({ name: String(item?.name || "").trim(), value: String(item?.value || "").trim() }))
    .filter((item) => item.name && item.value)
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
}

async function getCachedCfCookie() {
  if (WOOG_CF_COOKIE) return WOOG_CF_COOKIE;
  try {
    const cached = await OmniBox.getCache(WOOG_CF_CACHE_KEY);
    return String(cached || "").trim();
  } catch (error) {
    OmniBox.log("warn", `[cf] 读取缓存失败: ${error.message}`);
    return "";
  }
}

async function setCachedCfCookie(cookie) {
  const value = String(cookie || "").trim();
  if (!value || WOOG_CF_COOKIE) return;
  try {
    await OmniBox.setCache(WOOG_CF_CACHE_KEY, value, WOOG_CF_MAX_AGE_SECONDS);
  } catch (error) {
    OmniBox.log("warn", `[cf] 写入缓存失败: ${error.message}`);
  }
}

// ==================== 域名会话缓存辅助函数 ====================
function extractDomain(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}

async function getCachedDomainContext(domain) {
  if (!domain) return null;
  try {
    const key = WOOG_CF_SESSION_CACHE_KEY_PREFIX + domain;
    return await OmniBox.getCache(key) || null;
  } catch (error) {
    OmniBox.log("warn", `[cf] 读取域名会话缓存失败: ${error.message}`);
    return null;
  }
}

async function setCachedDomainContext(domain, headers, ua, cookie) {
  if (!domain) return;
  try {
    const key = WOOG_CF_SESSION_CACHE_KEY_PREFIX + domain;
    const ctx = { headers: headers || {}, ua: String(ua || ""), cookie: String(cookie || "") };
    await OmniBox.setCache(key, ctx, WOOG_CF_SESSION_CACHE_TTL);
    OmniBox.log("info", `[cf] 已缓存域名会话: ${domain}, TTL=${WOOG_CF_SESSION_CACHE_TTL}s, ua=${(ctx.ua || "(无)").substring(0, 40)}, cookie长度=${ctx.cookie.length}`);
  } catch (error) {
    OmniBox.log("warn", `[cf] 写入域名会话缓存失败: ${error.message}`);
  }
}
// ==================== 域名会话缓存辅助函数结束 ====================

async function fetchCfClearanceWithFlareSolverr(targetUrl) {
  const endpoint = String(WOOG_FLARESOLVERR_URL || "").trim();
  if (!endpoint) {
    throw new Error("未配置 FlareSolverr 地址");
  }

  const payload = {
    cmd: "request.get",
    url: targetUrl,
    maxTimeout: WOOG_FLARESOLVERR_TIMEOUT_MS,
  };
  if (String(WOOG_FLARESOLVERR_SESSION || "").trim()) {
    payload.session = String(WOOG_FLARESOLVERR_SESSION).trim();
  }

  const res = await axios.post(endpoint, payload, {
    timeout: WOOG_FLARESOLVERR_TIMEOUT_MS + 5000,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    validateStatus: () => true,
  });

  if (res.status !== 200 || !res.data || res.data.status !== "ok") {
    throw new Error(`FlareSolverr HTTP ${res.status}`);
  }

  const solution = res.data.solution || {};
  const cookies = Array.isArray(solution.cookies) ? solution.cookies : [];
  const cookie = cookiesArrayToString(cookies);
  const cf = cookies.find((item) => String(item?.name) === "cf_clearance");

  if (!cf?.value) {
    throw new Error(`FlareSolverr 未返回 cf_clearance，message=${String(res.data.message || "").trim() || "unknown"}`);
  }

  const ua = String(solution.userAgent || "").trim();
  const cookiePreview = cookie.length > 80 ? cookie.substring(0, 80) + "..." : cookie;
  const execTime = solution.startTimestamp
    ? (new Date(solution.endTimestamp || Date.now()).getTime() - new Date(solution.startTimestamp).getTime()) + "ms"
    : "N/A";
  const flareBody = String(solution.response || "");
  OmniBox.log("info", `[cf] FlareSolverr 返回结果: status=${res.data.status || "?"}, cookies=${cookies.length}, cookie预览=${cookiePreview}, ua=${ua}, body长度=${flareBody.length}, message=${String(res.data.message || "").trim() || "(空)"}, 执行耗时=${execTime}`);
  return {
    cookie,
    body: flareBody,
    statusCode: solution.status || 200,
    headers: solution.headers || {},
    ua,
  };
}

async function ensureCfCookie(forceRefresh = false, targetUrl) {
  if (WOOG_CF_COOKIE) return { cookie: WOOG_CF_COOKIE, flareResult: null };
  if (!forceRefresh) {
    const cached = await getCachedCfCookie();
    if (cached) return { cookie: cached, flareResult: null };
  }
  if (!WOOG_CF_AUTO) return { cookie: "", flareResult: null };

  OmniBox.log("info", `[cf] 开始通过 FlareSolverr 自动获取 cf_clearance`);
  try {
    const flareResult = await fetchCfClearanceWithFlareSolverr(targetUrl);
    if (flareResult.cookie) {
      await setCachedCfCookie(flareResult.cookie);
      OmniBox.log("info", `[cf] 已自动获取 cf_clearance，长度=${flareResult.cookie.length}`);
    }
    return { cookie: flareResult.cookie, flareResult };
  } catch (error) {
    OmniBox.log("warn", `[cf] FlareSolverr 获取失败: ${error.message}`);
    return { cookie: "", flareResult: null };
  }
}

// ==================== CF 盾辅助函数结束 ====================

/**
 * 带容灾的请求函数
 * @param {string} path - 请求路径（相对路径）
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 返回响应对象，包含 response 和 baseUrl
 */
async function requestWithFailover(path, options = {}) {
  let lastError = null;
  const perDomainTimeout = Math.max(1000, Math.floor(30000 / WEB_SITES.length));

  for (let i = 0; i < WEB_SITES.length; i++) {
    const baseUrl = removeTrailingSlash(WEB_SITES[i]);
    const fullUrl = path.startsWith("http") ? path : baseUrl + path;

    try {
      OmniBox.log("info", `尝试请求域名 ${i + 1}/${WEB_SITES.length}: ${fullUrl}, timeout=${options.timeout ?? perDomainTimeout}ms`);

      const response = await httpRequest(fullUrl, {
        ...options,
        method: options.method || "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...(options.headers || {}),
        },
        timeout: options.timeout ?? perDomainTimeout,
      });

      if (response.statusCode === 200 && response.body) {
        if (isBlockedHtml(response.body)) {
          OmniBox.log("warn", `域名 ${baseUrl} 命中风控页,切换下一个域名`);
          lastError = new Error("命中风控页面");
          continue;
        }
        OmniBox.log("info", `域名 ${baseUrl} 请求成功`);
        return { response, baseUrl };
      } else {
        OmniBox.log("warn", `域名 ${baseUrl} 返回非200状态码: ${response.statusCode}`);
        lastError = new Error(`HTTP ${response.statusCode}`);
      }
    } catch (error) {
      OmniBox.log("warn", `域名 ${baseUrl} 请求失败: ${error.message}`);
      lastError = error;

      // 如果不是最后一个域名，继续尝试下一个
      if (i < WEB_SITES.length - 1) {
        continue;
      }
    }
  }

  // 所有域名都失败
  throw lastError || new Error("所有域名请求均失败");
}

/**
 * 获取可用的基础 URL（用于构建完整图片链接等）
 * @returns {string} 第一个配置的域名
 */
function getBaseUrl() {
  return removeTrailingSlash(WEB_SITES[0]);
}

/**
 * 移除 URL 末尾的斜杠
 */
function removeTrailingSlash(url) {
  if (!url) return "";
  return url.replace(/\/+$/, "");
}

/**
 * 判断是否为视频文件
 */
function isVideoFile(file) {
  if (!file || !file.file_name) {
    return false;
  }

  const fileName = file.file_name.toLowerCase();
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

/**
 * 递归获取所有视频文件
 */
async function getAllVideoFiles(shareURL, files, errors = []) {
  if (!files || !Array.isArray(files)) {
    return [];
  }

  const tasks = files.map(async (file) => {
    if (file.file && isVideoFile(file)) {
      return [file];
    } else if (file.dir) {
      try {
        const subFileList = await OmniBox.getDriveFileList(shareURL, file.fid);
        if (subFileList?.files && Array.isArray(subFileList.files)) {
          return await getAllVideoFiles(shareURL, subFileList.files, errors);
        }
        return [];
      } catch (error) {
        const errorInfo = {
          path: file.name || file.fid,
          fid: file.fid,
          message: error.message,
          timestamp: new Date().toISOString(),
        };
        errors.push(errorInfo);
        OmniBox.log("warn", `获取子目录失败: ${JSON.stringify(errorInfo)}`);
        return [];
      }
    }
    return [];
  });

  const results = await Promise.all(tasks);
  return results.flat();
}

/**
 * 格式化文件大小
 */
function formatFileSize(size) {
  if (!size || size <= 0) {
    return "";
  }

  const unit = 1024;
  const units = ["B", "K", "M", "G", "T", "P"];

  if (size < unit) {
    return `${size}B`;
  }

  let exp = 0;
  let sizeFloat = size;
  while (sizeFloat >= unit && exp < units.length - 1) {
    sizeFloat /= unit;
    exp++;
  }

  if (sizeFloat === Math.floor(sizeFloat)) {
    return `${Math.floor(sizeFloat)}${units[exp]}`;
  }
  return `${sizeFloat.toFixed(2)}${units[exp]}`;
}

/**
 * 获取首页数据
 */
async function home(params) {
  try {
    OmniBox.log("info", "获取首页数据");

    let classes = [];
    let list = [];

    try {
      // 使用容灾请求
      const { response, baseUrl } = await requestWithFailover("/");

      if (response.statusCode === 200 && response.body) {
        const $ = cheerio.load(response.body);

        // 从导航菜单中提取分类
        const tabItems = $(".module-tab-items .module-tab-item");
        tabItems.each((_, element) => {
          const $item = $(element);
          const typeId = $item.attr("data-id");
          const typeName = $item.attr("data-name");

          if (typeId && typeId !== "0" && typeName) {
            classes.push({
              type_id: typeId,
              type_name: typeName.trim(),
            });
          }
        });

        OmniBox.log("info", `从首页导航提取到 ${classes.length} 个分类`);

        // 提取首页影片列表
        const firstModule = $(".module");

        if (firstModule.length > 0) {
          const moduleItems = firstModule.find(".module-item");

          moduleItems.each((_, element) => {
            const $item = $(element);
            const href = $item.find(".module-item-pic a").attr("href") || $item.find(".module-item-title").attr("href");
            const vodName = $item.find(".module-item-pic img").attr("alt") || $item.find(".module-item-title").attr("title") || $item.find(".module-item-title").text().trim();

            let vodPic = $item.find(".module-item-pic img").attr("data-src") || $item.find(".module-item-pic img").attr("src");
            if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
              vodPic = baseUrl + vodPic;
            }

            const vodRemarks = $item.find(".module-item-text").text().trim();
            const vodYear = $item.find(".module-item-caption span").first().text().trim();

            if (href && vodName) {
              list.push({
                vod_id: href,
                vod_name: vodName,
                vod_pic: vodPic || "",
                type_id: "",
                type_name: "",
                vod_remarks: vodRemarks || "",
                vod_year: vodYear || "",
              });
            }
          });

          OmniBox.log("info", `从首页提取到 ${list.length} 个影片`);
        }
      }
    } catch (error) {
      OmniBox.log("warn", `从首页提取数据失败: ${error.message}`);
    }

    const currentFilters = await getDynamicFilters();
    return {
      class: classes,
      list: list,
      filters: currentFilters, // 使用动态获取的过滤器 [1]
    };
  } catch (error) {
    OmniBox.log("error", `获取首页数据失败: ${error.message}`);
  }
}

/**
 * 获取分类数据
 */
async function category(params) {
  try {
    const categoryId = params.categoryId || params.type_id || "";
    const page = parseInt(params.page || "1", 10);
    const filters = params.filters || {};

    OmniBox.log("info", `获取分类数据: categoryId=${categoryId}, page=${page}`);

    if (!categoryId) {
      OmniBox.log("warn", "分类ID为空");
      return {
        list: [],
        page: 1,
        pagecount: 0,
        total: 0,
      };
    }

    // 构建请求 URL
    const area = filters?.area || "";
    const sort = filters?.sort || "";
    const cls = filters?.class || "";
    const letter = filters?.letter || "";
    const year = filters?.year || "";

    const url = `/vodshow/${categoryId}-${area}-${sort}-${cls}--${letter}---${page}---${year}.html`;

    // 使用容灾请求
    const { response, baseUrl } = await requestWithFailover(url);

    if (response.statusCode !== 200 || !response.body) {
      OmniBox.log("error", `请求失败: HTTP ${response.statusCode}`);
      return {
        list: [],
        page: page,
        pagecount: 0,
        total: 0,
      };
    }

    // 解析 HTML
    const $ = cheerio.load(response.body);
    const videos = [];

    const vodItems = $("#main .module-item");
    vodItems.each((_, e) => {
      const $item = $(e);
      const href = $item.find(".module-item-pic a").attr("href");
      const vodName = $item.find(".module-item-pic img").attr("alt");
      let vodPic = $item.find(".module-item-pic img").attr("data-src");
      if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
        vodPic = baseUrl + vodPic;
      }
      const vodRemarks = $item.find(".module-item-text").text();
      const vodYear = $item.find(".module-item-caption span").first().text();

      if (href && vodName) {
        videos.push({
          vod_id: href,
          vod_name: vodName,
          vod_pic: vodPic || "",
          type_id: categoryId,
          type_name: "",
          vod_remarks: vodRemarks || "",
          vod_year: vodYear || "",
        });
      }
    });

    OmniBox.log("info", `解析完成,找到 ${videos.length} 个视频`);

    return {
      list: videos,
      page: page,
      pagecount: 0,
      total: videos.length,
    };
  } catch (error) {
    OmniBox.log("error", `获取分类数据失败: ${error.message}`);
    return {
      list: [],
      page: params.page || 1,
      pagecount: 0,
      total: 0,
    };
  }
}

/**
 * 构建刮削后的文件名
 * @param {Object} scrapeData - TMDB刮削数据
 * @param {Object} mapping - 视频映射关系
 * @param {string} originalFileName - 原始文件名
 * @returns {string} 刮削后的文件名
 */
function buildScrapedFileName(scrapeData, mapping, originalFileName) {
  // 如果无法解析集号(EpisodeNumber == 0)或置信度很低(< 0.5),使用原始文件名
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalFileName;
  }

  // 优先使用 scrapeData.episodes 中的正式剧集标题
  if (scrapeData && scrapeData.episodes && Array.isArray(scrapeData.episodes)) {
    for (const episode of scrapeData.episodes) {
      if (episode.episodeNumber === mapping.episodeNumber && episode.seasonNumber === mapping.seasonNumber) {
        if (episode.name) {
          return `${mapping.episodeNumber}.${episode.name}`;
        }
        break;
      }
    }
  }

  // 其次使用 mapping 自身带回的剧集标题
  if (mapping.episodeName) {
    return `${mapping.episodeNumber}.${mapping.episodeName}`;
  }

  // 最后至少补上集号,避免仍然只是 01.mkv / 02.mkv 这种原样返回
  return `${mapping.episodeNumber}.${originalFileName}`;
}

/**
 * 获取视频详情
 */
async function detail(params) {
  try {
    const videoId = params.videoId || "";

    if (!videoId) {
      throw new Error("视频ID不能为空");
    }

    const source = params.source || "";
    OmniBox.log("info", `获取视频详情: videoId=${videoId}, source=${source}`);

    const { response, baseUrl } = await getDetailPageCached(videoId);

    if (response.statusCode !== 200 || !response.body) {
      throw new Error(`请求失败: HTTP ${response.statusCode}`);
    }

    const $ = cheerio.load(response.body);

    let vodName = $(".page-title")[0]?.children?.[0]?.data || "";
    let vodPic = $($(".mobile-play")).find(".lazyload")[0]?.attribs?.["data-src"] || "";
    if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
      vodPic = baseUrl + vodPic;
    }

    let vodYear = "";
    let vodDirector = "";
    let vodActor = "";
    let vodContent = "";

    const videoItems = $(".video-info-itemtitle");
    for (const item of videoItems) {
      const key = $(item).text();
      const vItems = $(item).next().find("a");
      const value = vItems
        .map((i, el) => {
          const text = $(el).text().trim();
          return text ? text : null;
        })
        .get()
        .filter(Boolean)
        .join(", ");

      if (key.includes("剧情")) {
        vodContent = $(item).next().find("p").text().trim();
      } else if (key.includes("导演")) {
        vodDirector = value.trim();
      } else if (key.includes("主演")) {
        vodActor = value.trim();
      }
    }

    const panUrls = [];
    const items = $(".module-row-info");
    for (const item of items) {
      const shareUrl = $(item).find("p")[0]?.children?.[0]?.data;
      if (shareUrl) {
        panUrls.push(shareUrl.trim());
      }
    }

    OmniBox.log("info", `解析完成,找到 ${panUrls.length} 个网盘链接`);

    let playSources = [];
    const driveTypeCountMap = await collectDriveTypeCountMap(panUrls);
    const driveTypeCurrentIndexMap = {};

    const panUrlTasks = panUrls.map(async (shareURL) => {
      try {
        OmniBox.log("info", `处理网盘链接: ${shareURL}`);

        const driveInfo = await getDriveInfoCached(shareURL);
        let displayName = driveInfo.displayName || "未知网盘";

        const totalCount = driveTypeCountMap[displayName] || 0;
        if (totalCount > 1) {
          driveTypeCurrentIndexMap[displayName] = (driveTypeCurrentIndexMap[displayName] || 0) + 1;
          displayName = `${displayName}${driveTypeCurrentIndexMap[displayName]}`;
        }

        OmniBox.log("info", `网盘类型: ${displayName}, driveType: ${driveInfo.driveType}`);

        const fileList = await getRootFileListCached(shareURL);
        if (!fileList || !fileList.files || !Array.isArray(fileList.files)) {
          OmniBox.log("warn", `获取文件列表失败: ${shareURL}`);
          return null;
        }

        OmniBox.log("info", `获取文件列表成功,文件数量: ${fileList.files.length}`);

        const allVideoFiles = await getAllVideoFilesCached(shareURL, fileList.files);
        if (allVideoFiles.length === 0) {
          OmniBox.log("warn", `未找到视频文件: ${shareURL}`);
          return null;
        }

        OmniBox.log("info", `递归获取视频文件完成,视频文件数量: ${allVideoFiles.length}`);

        return {
          shareURL,
          displayName,
          driveInfo,
          allVideoFiles,
        };
      } catch (error) {
        OmniBox.log("error", `处理网盘链接失败: ${shareURL}, 错误: ${error.message}`);
        return null;
      }
    });

    const panUrlResults = (await Promise.all(panUrlTasks)).filter(Boolean);
    OmniBox.log("info", `方案A: 有效网盘结果数量=${panUrlResults.length}`);

    const mergedVideoFilesForScraping = buildMergedVideoFilesForScraping(panUrlResults, videoId);
    OmniBox.log("info", `方案A: 合并用于刮削的视频文件数量=${mergedVideoFilesForScraping.length}`);

    const {
      scrapeData,
      videoMappings,
      scrapeType,
    } = await getMergedMetadataCached(videoId, vodName, mergedVideoFilesForScraping);
    logDetailDebug(`方案A: 当前统一元数据映射数量=${videoMappings.length}, scrapeType=${scrapeType || "unknown"}`);

    for (const result of panUrlResults) {
      const { shareURL, displayName, driveInfo, allVideoFiles } = result;

      let sourceNames = [displayName];
      const targetDriveTypes = DRIVE_TYPE_CONFIG;
      const configSourceNames = SOURCE_NAMES_CONFIG;

      if (targetDriveTypes.includes(driveInfo.driveType)) {
        sourceNames = [...configSourceNames];
        OmniBox.log("info", `${displayName} 匹配成功,线路设置为: ${sourceNames.join(", ")}`);

        if (source === "web") {
          sourceNames = sourceNames.filter((name) => name !== "本地代理");
          OmniBox.log("info", `来源为网页端,已过滤线路`);
        }
      }

      for (const sourceName of sourceNames) {
        const episodes = [];
        for (const file of allVideoFiles) {
          let fileName = file.file_name || "";
          const fileId = file.fid || "";
          const fileSize = file.size || file.file_size || 0;

          if (!fileName || !fileId) {
            continue;
          }

          const formattedFileId = fileId ? `${shareURL}|${fileId}|${videoId}` : "";

          let matchedMapping = null;
          if (scrapeData && videoMappings && Array.isArray(videoMappings) && videoMappings.length > 0) {
            for (const mapping of videoMappings) {
              if (mapping && mapping.fileId === formattedFileId) {
                matchedMapping = mapping;
                const newFileName = buildScrapedFileName(scrapeData, mapping, fileName);
                if (newFileName && newFileName !== fileName) {
                  fileName = newFileName;
                  OmniBox.log("info", `应用刮削文件名: ${file.file_name} -> ${fileName}`);
                } else {
                  OmniBox.log("info", `刮削已命中但未改名: file=${file.file_name}, epNum=${mapping.episodeNumber ?? "N/A"}, epName=${mapping.episodeName || ""}, confidence=${mapping.confidence ?? "N/A"}, scrapeType=${scrapeType || "unknown"}`);
                }
                break;
              }
            }
          }

          let displayFileName = fileName;
          if (fileSize > 0) {
            const fileSizeStr = formatFileSize(fileSize);
            if (fileSizeStr) {
              displayFileName = `[${fileSizeStr}] ${fileName}`;
            }
          }

          const episode = {
            name: displayFileName,
            playId: `${shareURL}|${fileId}|${videoId}`,
            size: fileSize > 0 ? fileSize : undefined,
          };

          if (matchedMapping) {
            if (matchedMapping.seasonNumber !== undefined && matchedMapping.seasonNumber !== null) {
              episode._seasonNumber = matchedMapping.seasonNumber;
            }
            if (matchedMapping.episodeNumber !== undefined && matchedMapping.episodeNumber !== null) {
              episode._episodeNumber = matchedMapping.episodeNumber;
            }
            if (matchedMapping.episodeName) {
              episode.episodeName = matchedMapping.episodeName;
            }
            if (matchedMapping.episodeOverview) {
              episode.episodeOverview = matchedMapping.episodeOverview;
            }
            if (matchedMapping.episodeAirDate) {
              episode.episodeAirDate = matchedMapping.episodeAirDate;
            }
            if (matchedMapping.episodeStillPath) {
              episode.episodeStillPath = matchedMapping.episodeStillPath;
            }
            if (matchedMapping.episodeVoteAverage !== undefined && matchedMapping.episodeVoteAverage !== null) {
              episode.episodeVoteAverage = matchedMapping.episodeVoteAverage;
            }
            if (matchedMapping.episodeRuntime !== undefined && matchedMapping.episodeRuntime !== null) {
              episode.episodeRuntime = matchedMapping.episodeRuntime;
            }
          }

          episodes.push(episode);
        }

        if (scrapeData && episodes.length > 0) {
          const hasEpisodeNumber = episodes.some((ep) => ep._episodeNumber !== undefined);
          if (hasEpisodeNumber) {
            OmniBox.log("info", `检测到刮削数据,按 episodeNumber 排序剧集列表,共 ${episodes.length} 集`);
            episodes.sort((a, b) => {
              const seasonA = a._seasonNumber !== undefined ? a._seasonNumber : 0;
              const seasonB = b._seasonNumber !== undefined ? b._seasonNumber : 0;
              if (seasonA !== seasonB) {
                return seasonA - seasonB;
              }
              const episodeA = a._episodeNumber !== undefined ? a._episodeNumber : 0;
              const episodeB = b._episodeNumber !== undefined ? b._episodeNumber : 0;
              return episodeA - episodeB;
            });
          }
        }

        if (episodes.length > 0) {
          let finalSourceName = sourceName;
          if (targetDriveTypes.includes(driveInfo.driveType)) {
            finalSourceName = `${displayName}-${sourceName}`;
          }

          playSources.push({
            name: finalSourceName,
            episodes: episodes,
          });
        }
      }
    }

    if (scrapeData) {
      if (scrapeData.title) {
        vodName = scrapeData.title;
      }
      if (scrapeData.posterPath) {
        vodPic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
      }
      if (scrapeData.releaseDate) {
        vodYear = scrapeData.releaseDate.substring(0, 4) || vodYear;
      }
      if (scrapeData.overview) {
        vodContent = scrapeData.overview;
      }

      if (scrapeData.credits) {
        if (scrapeData.credits.cast && Array.isArray(scrapeData.credits.cast)) {
          const actors = scrapeData.credits.cast
            .slice(0, 5)
            .map((cast) => cast.name || "")
            .filter((name) => name)
            .join(",");
          if (actors) {
            vodActor = actors;
          }
        }
        if (scrapeData.credits.crew && Array.isArray(scrapeData.credits.crew)) {
          const directors = scrapeData.credits.crew.filter((crew) => crew.job === "Director" || crew.department === "Directing");
          if (directors.length > 0) {
            const directorNames = directors
              .slice(0, 3)
              .map((director) => director.name || "")
              .filter((name) => name)
              .join(",");
            if (directorNames) {
              vodDirector = directorNames;
            }
          }
        }
      }
    }

    OmniBox.log("info", `构建播放源完成,网盘数量: ${playSources.length}`);
    if (Array.isArray(playSources) && playSources.length > 1 && DRIVE_ORDER.length > 0) {
      playSources = sortPlaySourcesByDriveOrder(playSources);
      OmniBox.log("info", `[detail] 按 DRIVE_ORDER 排序后线路顺序: ${playSources.map((item) => item.name).join(" | ")}`);
    }

    const vodDetail = {
      vod_id: videoId,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_year: vodYear,
      vod_director: vodDirector,
      vod_actor: vodActor,
      vod_content: vodContent || `网盘资源,共${panUrls.length}个网盘链接`,
      vod_play_sources: playSources.length > 0 ? playSources : undefined,
      vod_remarks: "",
    };

    return {
      list: [vodDetail],
    };
  } catch (error) {
    OmniBox.log("error", `获取视频详情失败: ${error.message}`);
    return {
      list: [],
    };
  }
}
/**
 * 搜索视频
 */
async function search(params) {
  try {
    const keyword = params.keyword || "";
    const page = parseInt(params.page || "1", 10);

    OmniBox.log("info", `搜索视频: keyword=${keyword}, page=${page}`);

    if (!keyword) {
      OmniBox.log("warn", "搜索关键词为空");
      return {
        list: [],
        page: 1,
        pagecount: 0,
        total: 0,
      };
    }

    // 使用容灾请求
    const searchPath = `/vodsearch/-------------.html?wd=${keyword}`;
    const { response, baseUrl } = await requestWithFailover(searchPath);

    if (response.statusCode !== 200 || !response.body) {
      OmniBox.log("error", `请求失败: HTTP ${response.statusCode}`);
      return {
        list: [],
        page: page,
        pagecount: 0,
        total: 0,
      };
    }

    // 解析 HTML
    const $ = cheerio.load(response.body);
    const videos = [];

    const items = $(".module-search-item");
    for (const item of items) {
      const $item = $(item);
      const videoSerial = $item.find(".video-serial")[0];
      const vodPicImg = $item.find(".module-item-pic > img")[0];

      if (videoSerial && videoSerial.attribs) {
        const vodId = videoSerial.attribs.href || "";
        const vodName = videoSerial.attribs.title || "";
        let vodPic = vodPicImg?.attribs?.["data-src"] || "";
        if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
          vodPic = baseUrl + vodPic;
        }
        const vodRemarks = $($item.find(".video-serial")[0]).text() || "";

        if (vodId && vodName) {
          videos.push({
            vod_id: vodId,
            vod_name: vodName,
            vod_pic: vodPic,
            type_id: "",
            type_name: "",
            vod_remarks: vodRemarks,
          });
        }
      }
    }

    OmniBox.log("info", `搜索完成,找到 ${videos.length} 个结果`);

    return {
      list: videos,
      page: page,
      pagecount: 0,
      total: videos.length,
    };
  } catch (error) {
    OmniBox.log("error", `搜索视频失败: ${error.message}`);
    return {
      list: [],
      page: params.page || 1,
      pagecount: 0,
      total: 0,
    };
  }
}

/**
 * 获取播放地址
 */
async function play(params, context) {
  try {
    const flag = params.flag || "";
    const playId = params.playId || "";
    const source = params.source || "";

    OmniBox.log("info", `获取播放地址: flag=${flag}, playId=${playId}`);

    if (!playId) {
      throw new Error("播放参数不能为空");
    }

    const parts = playId.split("|");
    if (parts.length < 2) {
      throw new Error("播放参数格式错误,应为:分享链接|文件ID");
    }
    const shareURL = parts[0] || "";
    const fileId = parts[1] || "";
    const videoId = parts[2] || "";

    if (!shareURL || !fileId) {
      throw new Error("分享链接或文件ID不能为空");
    }

    OmniBox.log("info", `解析参数: shareURL=${shareURL}, fileId=${fileId}`);

    let routeType = source === "web" ? "服务端代理" : "直连";
    if (flag && flag.includes("-")) {
      const flagParts = flag.split("-");
      routeType = flagParts[flagParts.length - 1];
    }

    OmniBox.log("info", `使用线路: ${routeType}`);

    const playInfoPromise = OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);
    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: null,
        episodeName: params.episodeName || "",
      };

      if (!videoId) return result;

      try {
        const metadata = await OmniBox.getScrapeMetadata(videoId);
        if (!metadata || !metadata.scrapeData || !Array.isArray(metadata.videoMappings)) {
          return result;
        }

        const formattedFileId = `${shareURL}|${fileId}|${videoId}`;
        const matchedMapping = metadata.videoMappings.find((mapping) => mapping && mapping.fileId === formattedFileId);
        if (!matchedMapping) {
          return result;
        }

        const scrapeData = metadata.scrapeData;
        result.scrapeTitle = scrapeData.title || "";
        if (scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
        }

        if (matchedMapping.episodeNumber) {
          result.episodeNumber = matchedMapping.episodeNumber;
        }
        if (matchedMapping.episodeName && !result.episodeName) {
          result.episodeName = matchedMapping.episodeName;
        }

        let fileName = "";
        const scrapeType = metadata.scrapeType || "";
        if (scrapeType === "movie") {
          fileName = scrapeData.title || "";
        } else {
          const title = scrapeData.title || "";
          const seasonAirYear = scrapeData.seasonAirYear || "";
          const seasonNumber = matchedMapping.seasonNumber || 1;
          const episodeNum = matchedMapping.episodeNumber || 1;
          fileName = `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
        }

        if (fileName) {
          OmniBox.log("info", `生成fileName用于弹幕匹配: ${fileName}`);
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
          if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
            result.danmakuList = matchedDanmaku;
            OmniBox.log("info", `弹幕匹配成功,找到 ${matchedDanmaku.length} 条弹幕`);
          }
        }
      } catch (error) {
        OmniBox.log("warn", `弹幕匹配失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);

    if (playInfoResult.status !== "fulfilled") {
      throw new Error(playInfoResult.reason && playInfoResult.reason.message ? playInfoResult.reason.message : "无法获取播放地址");
    }

    const playInfo = playInfoResult.value;
    if (!playInfo || !playInfo.url || !Array.isArray(playInfo.url) || playInfo.url.length === 0) {
      throw new Error("无法获取播放地址");
    }

    let danmakuList = [];
    let scrapeTitle = "";
    let scrapePic = "";
    let episodeNumber = null;
    let episodeName = params.episodeName || "";

    if (metadataResult.status === "fulfilled" && metadataResult.value) {
      danmakuList = metadataResult.value.danmakuList || [];
      scrapeTitle = metadataResult.value.scrapeTitle || "";
      scrapePic = metadataResult.value.scrapePic || "";
      episodeNumber = metadataResult.value.episodeNumber || null;
      episodeName = metadataResult.value.episodeName || episodeName;
    } else if (metadataResult.status === "rejected") {
      OmniBox.log("warn", `获取元数据失败(不影响播放): ${metadataResult.reason && metadataResult.reason.message ? metadataResult.reason.message : metadataResult.reason}`);
    }

    try {
      const sourceId = context.sourceId;
      if (sourceId) {
        const vodId = params.vodId || videoId || shareURL;
        const title = params.title || scrapeTitle || shareURL;
        const pic = params.pic || scrapePic || "";

        OmniBox.addPlayHistory({
          vodId: vodId,
          title: title,
          pic: pic,
          episode: playId,
          sourceId: sourceId,
          episodeNumber: episodeNumber,
          episodeName: episodeName,
        })
          .then((added) => {
            if (added) {
              OmniBox.log("info", `已添加观看记录: ${title}`);
            } else {
              OmniBox.log("info", `观看记录已存在,跳过添加: ${title}`);
            }
          })
          .catch((error) => {
            OmniBox.log("warn", `添加观看记录失败: ${error.message}`);
          });
      }
    } catch (error) {
      OmniBox.log("warn", `添加观看记录失败: ${error.message}`);
    }

    const urlList = playInfo.url || [];
    const urlsResult = [];
    for (const item of urlList) {
      urlsResult.push({
        name: item.name || "播放",
        url: item.url,
      });
    }

    const header = playInfo.header || {};
    const finalDanmakuList = danmakuList && danmakuList.length > 0 ? danmakuList : playInfo.danmaku || [];

    return {
      urls: urlsResult,
      header: header,
      parse: 0,
      danmaku: finalDanmakuList};
  } catch (error) {
    OmniBox.log("error", `播放接口失败: ${error.message}`);
    return {
      urls: [],
      header: {},
      danmaku: []};
  }
}
/**
 * 筛选配置
 */
async function getDynamicFilters() {
  return {
    "1": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "喜剧",
            "value": "喜剧"
          },
          {
            "name": "爱情",
            "value": "爱情"
          },
          {
            "name": "恐怖",
            "value": "恐怖"
          },
          {
            "name": "动作",
            "value": "动作"
          },
          {
            "name": "科幻",
            "value": "科幻"
          },
          {
            "name": "剧情",
            "value": "剧情"
          },
          {
            "name": "战争",
            "value": "战争"
          },
          {
            "name": "警匪",
            "value": "警匪"
          },
          {
            "name": "犯罪",
            "value": "犯罪"
          },
          {
            "name": "古装",
            "value": "古装"
          },
          {
            "name": "奇幻",
            "value": "奇幻"
          },
          {
            "name": "武侠",
            "value": "武侠"
          },
          {
            "name": "冒险",
            "value": "冒险"
          },
          {
            "name": "枪战",
            "value": "枪战"
          },
          {
            "name": "悬疑",
            "value": "悬疑"
          },
          {
            "name": "惊悚",
            "value": "惊悚"
          },
          {
            "name": "经典",
            "value": "经典"
          },
          {
            "name": "青春",
            "value": "青春"
          },
          {
            "name": "文艺",
            "value": "文艺"
          },
          {
            "name": "微电影",
            "value": "微电影"
          },
          {
            "name": "历史",
            "value": "历史"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "中国香港",
            "value": "中国香港"
          },
          {
            "name": "中国台湾",
            "value": "中国台湾"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "西班牙",
            "value": "西班牙"
          },
          {
            "name": "法国",
            "value": "法国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "韩国",
            "value": "韩国"
          },
          {
            "name": "泰国",
            "value": "泰国"
          },
          {
            "name": "德国",
            "value": "德国"
          },
          {
            "name": "印度",
            "value": "印度"
          },
          {
            "name": "意大利",
            "value": "意大利"
          },
          {
            "name": "加拿大",
            "value": "加拿大"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "默认",
            "value": ""
          },
          {
            "name": "人气",
            "value": "hits"
          },
          {
            "name": "评分",
            "value": "score"
          }
        ]
      }
    ],
    "2": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "喜剧",
            "value": "喜剧"
          },
          {
            "name": "爱情",
            "value": "爱情"
          },
          {
            "name": "恐怖",
            "value": "恐怖"
          },
          {
            "name": "动作",
            "value": "动作"
          },
          {
            "name": "科幻",
            "value": "科幻"
          },
          {
            "name": "剧情",
            "value": "剧情"
          },
          {
            "name": "战争",
            "value": "战争"
          },
          {
            "name": "警匪",
            "value": "警匪"
          },
          {
            "name": "犯罪",
            "value": "犯罪"
          },
          {
            "name": "古装",
            "value": "古装"
          },
          {
            "name": "奇幻",
            "value": "奇幻"
          },
          {
            "name": "武侠",
            "value": "武侠"
          },
          {
            "name": "冒险",
            "value": "冒险"
          },
          {
            "name": "枪战",
            "value": "枪战"
          },
          {
            "name": "悬疑",
            "value": "悬疑"
          },
          {
            "name": "惊悚",
            "value": "惊悚"
          },
          {
            "name": "经典",
            "value": "经典"
          },
          {
            "name": "青春",
            "value": "青春"
          },
          {
            "name": "文艺",
            "value": "文艺"
          },
          {
            "name": "微电影",
            "value": "微电影"
          },
          {
            "name": "历史",
            "value": "历史"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "中国香港",
            "value": "中国香港"
          },
          {
            "name": "中国台湾",
            "value": "中国台湾"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "西班牙",
            "value": "西班牙"
          },
          {
            "name": "法国",
            "value": "法国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "韩国",
            "value": "韩国"
          },
          {
            "name": "泰国",
            "value": "泰国"
          },
          {
            "name": "德国",
            "value": "德国"
          },
          {
            "name": "印度",
            "value": "印度"
          },
          {
            "name": "意大利",
            "value": "意大利"
          },
          {
            "name": "加拿大",
            "value": "加拿大"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "默认",
            "value": ""
          },
          {
            "name": "人气",
            "value": "hits"
          },
          {
            "name": "评分",
            "value": "score"
          }
        ]
      }
    ],
    "44": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "喜剧",
            "value": "喜剧"
          },
          {
            "name": "爱情",
            "value": "爱情"
          },
          {
            "name": "恐怖",
            "value": "恐怖"
          },
          {
            "name": "动作",
            "value": "动作"
          },
          {
            "name": "科幻",
            "value": "科幻"
          },
          {
            "name": "剧情",
            "value": "剧情"
          },
          {
            "name": "战争",
            "value": "战争"
          },
          {
            "name": "警匪",
            "value": "警匪"
          },
          {
            "name": "犯罪",
            "value": "犯罪"
          },
          {
            "name": "古装",
            "value": "古装"
          },
          {
            "name": "奇幻",
            "value": "奇幻"
          },
          {
            "name": "武侠",
            "value": "武侠"
          },
          {
            "name": "冒险",
            "value": "冒险"
          },
          {
            "name": "枪战",
            "value": "枪战"
          },
          {
            "name": "悬疑",
            "value": "悬疑"
          },
          {
            "name": "惊悚",
            "value": "惊悚"
          },
          {
            "name": "经典",
            "value": "经典"
          },
          {
            "name": "青春",
            "value": "青春"
          },
          {
            "name": "文艺",
            "value": "文艺"
          },
          {
            "name": "微电影",
            "value": "微电影"
          },
          {
            "name": "历史",
            "value": "历史"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "中国香港",
            "value": "中国香港"
          },
          {
            "name": "中国台湾",
            "value": "中国台湾"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "西班牙",
            "value": "西班牙"
          },
          {
            "name": "法国",
            "value": "法国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "韩国",
            "value": "韩国"
          },
          {
            "name": "泰国",
            "value": "泰国"
          },
          {
            "name": "德国",
            "value": "德国"
          },
          {
            "name": "印度",
            "value": "印度"
          },
          {
            "name": "意大利",
            "value": "意大利"
          },
          {
            "name": "加拿大",
            "value": "加拿大"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "默认",
            "value": ""
          },
          {
            "name": "人气",
            "value": "hits"
          },
          {
            "name": "评分",
            "value": "score"
          }
        ]
      }
    ],
    "6": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "男频",
            "value": "男频"
          },
          {
            "name": "女频",
            "value": "女频"
          },
          {
            "name": "都市",
            "value": "都市"
          },
          {
            "name": "甜宠",
            "value": "甜宠"
          },
          {
            "name": "年代",
            "value": "年代"
          },
          {
            "name": "穿越",
            "value": "穿越"
          },
          {
            "name": "古装",
            "value": "古装"
          },
          {
            "name": "亲情",
            "value": "亲情"
          },
          {
            "name": "奇幻",
            "value": "奇幻"
          },
          {
            "name": "萌宝",
            "value": "萌宝"
          },
          {
            "name": "重生",
            "value": "重生"
          },
          {
            "name": "冒险",
            "value": "冒险"
          },
          {
            "name": "逆袭",
            "value": "逆袭"
          },
          {
            "name": "虐恋",
            "value": "虐恋"
          },
          {
            "name": "鉴宝",
            "value": "鉴宝"
          },
          {
            "name": "复仇",
            "value": "复仇"
          },
          {
            "name": "修仙",
            "value": "修仙"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "默认",
            "value": ""
          },
          {
            "name": "人气",
            "value": "hits"
          },
          {
            "name": "评分",
            "value": "score"
          }
        ]
      }
    ],
    "3": [
      {
        "key": "class",
        "name": "剧情",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "情感",
            "value": "情感"
          },
          {
            "name": "科幻",
            "value": "科幻"
          },
          {
            "name": "热血",
            "value": "热血"
          },
          {
            "name": "推理",
            "value": "推理"
          },
          {
            "name": "搞笑",
            "value": "搞笑"
          },
          {
            "name": "冒险",
            "value": "冒险"
          },
          {
            "name": "萝莉",
            "value": "萝莉"
          },
          {
            "name": "校园",
            "value": "校园"
          },
          {
            "name": "动作",
            "value": "动作"
          },
          {
            "name": "机战",
            "value": "机战"
          },
          {
            "name": "运动",
            "value": "运动"
          },
          {
            "name": "战争",
            "value": "战争"
          },
          {
            "name": "少年",
            "value": "少年"
          },
          {
            "name": "少女",
            "value": "少女"
          },
          {
            "name": "社会",
            "value": "社会"
          },
          {
            "name": "原创",
            "value": "原创"
          },
          {
            "name": "亲子",
            "value": "亲子"
          },
          {
            "name": "益智",
            "value": "益智"
          },
          {
            "name": "励志",
            "value": "励志"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "西班牙",
            "value": "西班牙"
          },
          {
            "name": "法国",
            "value": "法国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "默认",
            "value": ""
          },
          {
            "name": "人气",
            "value": "hits"
          },
          {
            "name": "评分",
            "value": "score"
          }
        ]
      }
    ],
    "4": [
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "中国台湾",
            "value": "中国台湾"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "法国",
            "value": "法国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "韩国",
            "value": "韩国"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "默认",
            "value": ""
          },
          {
            "name": "人气",
            "value": "hits"
          },
          {
            "name": "评分",
            "value": "score"
          }
        ]
      }
    ],
    "46": [
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "默认",
            "value": ""
          },
          {
            "name": "人气",
            "value": "hits"
          },
          {
            "name": "评分",
            "value": "score"
          }
        ]
      }
    ],
    "5": [
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "全部",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "默认",
            "value": ""
          },
          {
            "name": "人气",
            "value": "hits"
          },
          {
            "name": "评分",
            "value": "score"
          }
        ]
      }
    ]
  };
}

// 导出接口
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

_load(3, "玩偶聚合-非分组", function (module, exports, require) {
// @name 玩偶聚合-非分组
// @author @Tao_XG
// @description 聚合玩偶、木偶、蜡笔、闪电、至臻、二小、虎斑、快映、欧哥、多多、蜗牛4K等网盘站点；支持刮削、弹幕、多线路、二级分类筛选、翻页、网盘排序
// @dependencies axios,cheerio
// @version 1.0.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/网盘/玩偶聚合-非分组.js

const OmniBox = require("omnibox_sdk");
const cheerio = require("cheerio");
const axios = require("axios");
const https = require("https");
const runner = require("spider_runner");

// 先导出再交给 runner
module.exports = {
  home,
  category,
  search,
  detail,
  play,
  login,
  logout,
  getLoginStatus,
  setCookies: setCookiesFromString,
};
runner.run(module.exports);

// ==================== 配置区域 ====================
const FILTER_CONFIG_BASE_URL = "https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/%E9%85%8D%E7%BD%AE/%E7%AD%9B%E9%80%89";

// 网盘线路优先级（从高到低），可用环境变量 PAN_DRIVE_ORDER 覆盖（分号/逗号分隔，如 115;baidu;quark;uc）
// 注意：内部 key 为 baidu/quark/a139/a189/a123/a115/xunlei/ali/uc，环境变量里可写 115/189/123/139 简写
const LINE_ORDER_ALIAS = { "115": "a115", "189": "a189", "123": "a123", "139": "a139" };
const LINE_ORDER = (process.env.PAN_DRIVE_ORDER || "baidu;a139;a189;a123;a115;quark;xunlei;ali;uc")
  .split(/[;,]/)
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)
  .map((s) => LINE_ORDER_ALIAS[s] || s);

// 详情页线路排序同网盘 key 别名一起处理（DRIVE_ORDER 完全跟随 PAN_DRIVE_ORDER）
const DRIVE_ORDER_ALIAS = LINE_ORDER_ALIAS;

// 网站排序优先级（站点 id，如 wanou;muou;labi;zhizhen;erxiao;huban;kuaiying;shandian;ouge;duoduo;woniu4k）
// 可用环境变量 PAN_SITE_ORDER 覆盖；留空则按站点配置顺序
const PAN_SITE_ORDER = (process.env.PAN_SITE_ORDER || "")
  .split(/[;,]/)
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// 详情页播放线路显示排序：始终跟随 PAN_DRIVE_ORDER（即 LINE_ORDER），不单独用 DRIVE_ORDER 覆盖
const DRIVE_ORDER = LINE_ORDER.join(";")
  .split(/[;,]/)
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)
  .map((s) => DRIVE_ORDER_ALIAS[s] || s);

// 播放线路名称（可由环境变量覆盖）
const SOURCE_NAMES_CONFIG = (process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

// 多线路网盘类型（可由环境变量覆盖，仅这些类型生成多条播放线路）
const DRIVE_TYPE_CONFIG = (process.env.DRIVE_TYPE_CONFIG || "quark;uc")
  .split(";")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// 刮削开关（默认开启，设置环境变量 ENABLE_SCRAPE=0 关闭）
const ENABLE_SCRAPE = process.env.ENABLE_SCRAPE !== "0";

// 详情链路缓存时间（秒），默认 12 小时
const WANOU_CACHE_EX_SECONDS = Number(process.env.WANOU_CACHE_EX_SECONDS || 43200);

const PAGE_SIZE = 20;
const REQUEST_TIMEOUT = 15000;

// ==================== 搜索合并模式 ====================
// 搜索时只抓取各站剧名并合并去重（不解析网盘），点击剧名后在详情页才解析并展示各网盘来源。
const MERGE_PREFIX = "__merge__";
// 单次搜索整体耗时预算（毫秒），默认 6 秒，避免 app 超时
const SEARCH_TIMEOUT_BUDGET_MS = Number(process.env.SEARCH_TIMEOUT_BUDGET_MS || 6000);
// 单次详情整体耗时预算（毫秒），默认 25 秒，避免 app 超时
const DETAIL_TIMEOUT_BUDGET_MS = Number(process.env.DETAIL_TIMEOUT_BUDGET_MS || 25000);
// 合并时使用的最多站点数（默认全部）
const MERGE_MAX_SITES = parseInt(process.env.MERGE_MAX_SITES || "0", 10) || 0;

// 每种网盘类型在聚合详情里最多解析的分享链接数（默认 3，0 表示不限制），减少盘检/刮削耗时
const PAN_MAX_LINKS_PER_DRIVE = parseInt(process.env.PAN_MAX_LINKS_PER_DRIVE || "3", 10) || 0;
// 蜗牛网盘 API 请求限流（毫秒），避免触发风控
const WONIU4K_DRIVE_API_DELAY_MS = Math.max(0, parseInt(process.env.WONIU4K_DRIVE_DELAY || "1500", 10));
const WONIU4K_USERNAME = String(process.env.WONIU4K_USERNAME || process.env.WONIU4K_USER || "").trim();
const WONIU4K_PASSWORD = String(process.env.WONIU4K_PASSWORD || process.env.WONIU4K_PASS || "").trim();
const WONIU4K_COOKIE = String(process.env.WONIU4K_COOKIE || process.env.WONIU4K_COOKIES || "").trim();

// ==================== 站点域名配置 ====================
const WOGG_SITES = splitSites(process.env.WEB_SITE_WOGG || "https://wogg.xxooo.cf;https://wogg.333232.xyz;https://www.wogg.net;");
const MUOU_SITES = splitSites(process.env.WEB_SITE_MUOU || "https://www.muou.site;https://www.muou.asia;https://666.666291.xyz;");
const LABI_SITES = splitSites(process.env.WEB_SITE_LABI || "http://fmao.shop;");
const ZHIZHEN_SITES = splitSites(process.env.WEB_SITE_ZHIZHEN || "http://www.miqk.cc;https://www.mihdr.top;https://mihdr.top;");
const ERXIAO_SITES = splitSites(process.env.WEB_SITE_ERXIAO || "https://www.2xiaopan.top;https://www.erixaopan.fun;https://2xiaopan.top;https://www.wexwp.cc;");
const HUBAN_SITES = splitSites(process.env.WEB_SITE_HUBAN || "http://38.76.197.172:16969;http://154.222.27.33:20720;http://xhban.xyz:20720;http://103.45.162.207:20720;");
const KUAIYING_SITES = splitSites(process.env.WEB_SITE_XIAOBAN || " http://38.76.197.172:12521;http://154.201.83.50:12512;http://xsayang.fun:12512;");
const SHANDIAN_SITES = splitSites(process.env.WEB_SITE_SHANDIAN || "https://sd.sduc.site;");
const OUGE_SITES = splitSites(process.env.WEB_SITE_OUGE || "https://woog.nxog.eu.org;");
const DUODUO_SITES = splitSites(process.env.WEB_SITE_DUODUO || "https://tv.yydsys.top;https://tv.214521.xyz;https://tv.yydsys.cc;https://yydsys.de5.net;https://duo.hidns.vip;");
const WONIU4K_SITES = splitSites(process.env.WEB_SITE_WONIU4K || "https://zmi.kdns.fr;");

const SITES = [];

pushSiteIfAny({
  id: "wanou",
  name: "玩偶",
  filterFiles: ["wogg.json"],
  domains: WOGG_SITES,
  listSelector: ".module-item",
  detailPanSelector: ".module-row-info p",
  categoryUrl: "/vodshow/{categoryId}--------{page}---.html",
  categoryUrlWithFilters: "/vodshow/{categoryId}-{area}-{by}-{class}-----{page}---{year}.html",
  searchUrl: "/vodsearch/-------------.html?wd={keyword}&page={page}",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "音乐", "6": "短剧", "44": "臻彩", "46": "纪录片" },
});

pushSiteIfAny({
  id: "muou",
  name: "木偶",
  filterFiles: ["mogg.json"],
  domains: MUOU_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "纪录片", "25": "臻选", "29": "综艺", "30": "原盘" },
});

pushSiteIfAny({
  id: "labi",
  name: "蜡笔",
  filterFiles: ["labi.json"],
  domains: LABI_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "24": "蜡笔4K", "29": "臻彩" },
});

pushSiteIfAny({
  id: "zhizhen",
  name: "至臻",
  filterFiles: ["zhizhen.json"],
  domains: ZHIZHEN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "24": "老剧", "44": "臻彩" },
});

pushSiteIfAny({
  id: "erxiao",
  name: "二小",
  filterFiles: ["erxiao.json"],
  domains: ERXIAO_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "臻彩", "21": "综艺" },
});

pushSiteIfAny({
  id: "huban",
  name: "虎斑",
  filterFiles: ["huban.json"],
  domains: HUBAN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "5": "短剧", "6": "臻彩", "30": "115网盘" },
});

pushSiteIfAny({
  id: "kuaiying",
  name: "快映",
  filterFiles: ["xiaoban.json"],
  domains: KUAIYING_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "5": "臻彩", "6": "短剧", "30": "115", "35": "123", "36": "天移迅" },
});

pushSiteIfAny({
  id: "shandian",
  name: "闪电",
  filterFiles: ["shandian.json"],
  domains: SHANDIAN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "30": "短剧" },
});

pushSiteIfAny({
  id: "ouge",
  name: "欧哥",
  filterFiles: ["ouge.json"],
  domains: OUGE_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "21": "综合" },
});

pushSiteIfAny({
  id: "duoduo",
  name: "多多",
  filterFiles: ["duoduo.json"],
  domains: DUODUO_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "多多电影", "2": "多多剧集", "3": "综艺", "4": "动漫", "5": "短剧", "20": "记录" },
});

// 蜗牛4K：MacCMS mxone 伪静态，主推 115（含 115cdn/anxia）
pushSiteIfAny({
  id: "woniu4k",
  name: "蜗牛4K",
  filterFiles: [],
  domains: WONIU4K_SITES,
  listSelector: ".module-item,a.video-card",
  detailPanSelector: ".module-row-info",
  categoryUrl: "/vodtype/{categoryId}/",
  categoryUrlPage: "/vodtype/{categoryId}-{page}/",
  searchUrl: "/vodsearch/{keyword}-------------/",
  searchUrlPage: "/vodsearch/{keyword}----------{page}---/",
  searchListSelector: ".module-search-item,.module-item,a.video-card",
  panExtractMode: "mxone",
  defaultCategories: { "1": "电影", "2": "连续剧", "3": "综艺", "4": "动漫" },
});

if (SITES.length === 0) {
  throw new Error("至少需要一个站点配置，请检查环境变量配置");
}

for (const site of SITES) {
  OmniBox.log("info", `[init] 站点 ${site.name} 域名数=${site.domains.length}`);
}

const INSECURE_HTTPS_AGENT = new https.Agent({ rejectUnauthorized: false });

// 仅保存蜗牛站点会话，避免聚合内其他站点互相污染 Cookie。
let cookieStore = {};

function getHostname(value = "") {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return String(value || "").trim().toLowerCase();
  }
}

function isWoniuURL(url = "") {
  const hostname = getHostname(url);
  return Boolean(hostname) && WONIU4K_SITES.some((siteUrl) => getHostname(siteUrl) === hostname);
}

function setCookiesFromHeaders(setCookieHeaders, baseUrl) {
  if (!isWoniuURL(baseUrl) || !setCookieHeaders || (!Array.isArray(setCookieHeaders) && typeof setCookieHeaders !== "string")) return;
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  const domain = getHostname(baseUrl);
  if (!cookieStore[domain]) cookieStore[domain] = {};
  for (const raw of list) {
    const pair = String(raw).split(";")[0];
    const index = pair.indexOf("=");
    if (index < 0) continue;
    const key = pair.substring(0, index).trim();
    const value = pair.substring(index + 1).trim();
    if (key) cookieStore[domain][key] = value;
  }
}

function setCookiesFromString(cookieString, domain) {
  if (!cookieString) return;
  const domains = domain ? [getHostname(domain)] : WONIU4K_SITES.map(getHostname).filter(Boolean);
  for (const targetDomain of domains) {
    if (!cookieStore[targetDomain]) cookieStore[targetDomain] = {};
    for (const part of String(cookieString).split(/[;,]/)) {
      const index = part.indexOf("=");
      if (index < 0) continue;
      const key = part.substring(0, index).trim();
      const value = part.substring(index + 1).trim();
      if (key) cookieStore[targetDomain][key] = value;
    }
  }
}

function getCookieHeader(url) {
  if (!isWoniuURL(url)) return "";
  const cookies = cookieStore[getHostname(url)];
  if (!cookies) return "";
  return Object.entries(cookies)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function clearCookies() {
  cookieStore = {};
}

if (WONIU4K_COOKIE) {
  setCookiesFromString(WONIU4K_COOKIE);
  OmniBox.log("info", "[woniu4k] 已从 WONIU4K_COOKIE 加载 Cookie");
}

// ==================== 缓存 ====================
const driveParseCache = new Map();
const siteFilterCache = new Map();
const playHistoryDedupeCache = new Map();
const CACHE_TTL = { drive: 60 * 60 * 1000, filter: 6 * 60 * 1000 };

function buildCacheKey(prefix, value) {
  return `${prefix}:${value}`;
}

async function getCachedJSON(key) {
  try {
    return await OmniBox.getCache(key);
  } catch (error) {
    await OmniBox.log("warn", `[cache] 读取缓存失败: key=${key}, err=${error.message}`);
    return null;
  }
}

async function setCachedJSON(key, value, exSeconds) {
  try {
    await OmniBox.setCache(key, value, exSeconds);
  } catch (error) {
    await OmniBox.log("warn", `[cache] 写入缓存失败: key=${key}, err=${error.message}`);
  }
}

async function getDriveInfoCached(shareURL) {
  const cacheKey = buildCacheKey("wanou:driveInfo", shareURL);
  let driveInfo = await getCachedJSON(cacheKey);
  if (!driveInfo) {
    driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
    await setCachedJSON(cacheKey, driveInfo, WANOU_CACHE_EX_SECONDS);
  }
  return driveInfo;
}

async function getRootFileListCached(shareURL) {
  const cacheKey = buildCacheKey("wanou:rootFiles", shareURL);
  let fileList = await getCachedJSON(cacheKey);
  if (!fileList) {
    fileList = await OmniBox.getDriveFileList(shareURL, "0");
    if (Array.isArray(fileList?.files) && fileList.files.length > 0) {
      await setCachedJSON(cacheKey, fileList, WANOU_CACHE_EX_SECONDS);
    }
  }
  return fileList;
}

async function getAllVideoFilesCached(shareURL, rootFiles) {
  const cacheKey = buildCacheKey("wanou:videoFiles", shareURL);
  let allVideoFiles = await getCachedJSON(cacheKey);
  if (!Array.isArray(allVideoFiles) || allVideoFiles.length === 0) {
    allVideoFiles = await getAllVideoFiles(shareURL, rootFiles);
    if (Array.isArray(allVideoFiles) && allVideoFiles.length > 0) {
      await setCachedJSON(cacheKey, allVideoFiles, WANOU_CACHE_EX_SECONDS);
    }
  }
  return allVideoFiles;
}

function splitSites(raw) {
  return String(raw || "")
    .split(";")
    .map((url) => url.trim())
    .filter(Boolean);
}

function pushSiteIfAny(site) {
  if (Array.isArray(site.domains) && site.domains.length > 0) {
    SITES.push(site);
  }
}

// ==================== 网络请求 ====================
async function httpRequest(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = {
    Accept: "*/*",
    ...(options.headers || {}),
  };
  const cookieHeader = getCookieHeader(url);
  if (cookieHeader) headers.Cookie = cookieHeader;

  const response = await axios({
    url,
    method,
    headers,
    data: options.body,
    timeout: options.timeout || REQUEST_TIMEOUT,
    httpsAgent: INSECURE_HTTPS_AGENT,
    validateStatus: () => true,
  });

  const setCookie = response.headers?.["set-cookie"];
  if (setCookie) setCookiesFromHeaders(setCookie, url);

  let body = response.data;
  if (typeof body !== "string") {
    body = body == null ? "" : JSON.stringify(body);
  }

  return {
    statusCode: response.status,
    body,
    headers: response.headers || {},
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBlockedHtml(body = "") {
  const lower = String(body || "").toLowerCase();
  return lower.includes("just a moment") || lower.includes("cf-browser-verification") || lower.includes("captcha") || lower.includes("访问验证");
}

function removeTrailingSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

async function requestWithFailover(domains, path, options = {}) {
  let lastError = null;
  const { budgetMs, ...requestOptions } = options;
  const effectiveBudget = Number.isFinite(budgetMs) && budgetMs > 0 ? budgetMs : 30000;
  const perDomainTimeout = Math.max(1000, Math.floor(effectiveBudget / Math.max(1, domains.length)));

  for (let i = 0; i < domains.length; i++) {
    const baseUrl = removeTrailingSlash(domains[i]);
    const fullUrl = path.startsWith("http") ? path : baseUrl + path;

    try {
      await OmniBox.log("info", `[request] try ${i + 1}/${domains.length} ${fullUrl}`);
      const response = await httpRequest(fullUrl, {
        ...requestOptions,
        method: requestOptions.method || "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...(requestOptions.headers || {}),
        },
        timeout: requestOptions.timeout ?? perDomainTimeout,
      });

      if (response.statusCode === 200 && response.body) {
        if (isBlockedHtml(response.body)) {
          await OmniBox.log("warn", `[request] blocked by ${baseUrl}`);
          lastError = new Error("命中风控页面");
          continue;
        }
        await OmniBox.log("info", `[request] success ${baseUrl}`);
        return { response, baseUrl };
      }

      await OmniBox.log("warn", `[request] non-200 ${response.statusCode} @ ${baseUrl}`);
      lastError = new Error(`HTTP ${response.statusCode}`);
    } catch (error) {
      await OmniBox.log("warn", `[request] fail ${baseUrl}: ${error.message}`);
      lastError = error;
    }
  }

  throw lastError || new Error("所有域名请求均失败");
}

// ==================== 通用辅助 ====================
function formatFileSize(size) {
  if (!size || size <= 0) return "";
  const unit = 1024;
  const units = ["B", "K", "M", "G", "T", "P"];
  if (size < unit) return `${size}B`;
  let exp = 0;
  let n = size;
  while (n >= unit && exp < units.length - 1) {
    n /= unit;
    exp++;
  }
  return Number.isInteger(n) ? `${n}${units[exp]}` : `${n.toFixed(2)}${units[exp]}`;
}

function isVideoFile(file) {
  if (!file || !file.file_name) return false;
  const fileName = String(file.file_name).toLowerCase();
  const exts = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];
  if (exts.some((ext) => fileName.endsWith(ext))) return true;
  const formatType = String(file.format_type || "").toLowerCase();
  return formatType.includes("video") || formatType.includes("mpeg") || formatType.includes("h264");
}

async function getAllVideoFiles(shareURL, files, errors = []) {
  if (!Array.isArray(files)) return [];
  const tasks = files.map(async (file) => {
    if (file.file && isVideoFile(file)) return [file];
    if (file.dir) {
      try {
        const subFileList = await OmniBox.getDriveFileList(shareURL, file.fid);
        if (Array.isArray(subFileList?.files)) {
          return await getAllVideoFiles(shareURL, subFileList.files, errors);
        }
      } catch (error) {
        errors.push({ path: file.name || file.fid, fid: file.fid, message: error.message, timestamp: new Date().toISOString() });
      }
    }
    return [];
  });
  const results = await Promise.all(tasks);
  return results.flat();
}

// ==================== 筛选器 ====================
function normalizeFilterOption(option) {
  if (!option || typeof option !== "object") return null;
  const name = option.n ?? option.name;
  const value = option.v ?? option.value;
  if (name === undefined || value === undefined) return null;
  return { name: String(name), value: String(value) };
}

function normalizeFilterGroup(group) {
  if (!group || typeof group !== "object" || !group.key) return null;
  const rawValues = Array.isArray(group.value) ? group.value : [];
  const values = rawValues.map(normalizeFilterOption).filter(Boolean);
  if (values.length === 0) return null;
  return {
    key: String(group.key),
    name: String(group.name || group.key),
    init: group.init !== undefined ? String(group.init) : "",
    value: values,
  };
}

function normalizeFilterConfigByCategory(config) {
  if (!config || typeof config !== "object") return null;
  const normalized = {};
  for (const [categoryId, groups] of Object.entries(config)) {
    if (!Array.isArray(groups)) continue;
    const normalizedGroups = groups.map(normalizeFilterGroup).filter(Boolean);
    if (normalizedGroups.length > 0) normalized[categoryId] = normalizedGroups;
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function mergeFilterGroups(groups) {
  const mergedMap = new Map();
  for (const group of groups) {
    const normalized = normalizeFilterGroup(group);
    if (!normalized || normalized.key === "categoryId") continue;
    if (!mergedMap.has(normalized.key)) {
      mergedMap.set(normalized.key, { key: normalized.key, name: normalized.name, init: normalized.init, valueMap: new Map() });
    }
    const bucket = mergedMap.get(normalized.key);
    for (const item of normalized.value) {
      if (!bucket.valueMap.has(item.value)) {
        bucket.valueMap.set(item.value, item.name);
      }
    }
  }

  return Array.from(mergedMap.values()).map((group) => {
    const values = Array.from(group.valueMap.entries()).map(([value, name]) => ({ name, value }));
    if (!values.some((item) => item.value === "") && values.length > 0) {
      values.unshift({ name: "全部", value: "" });
    }
    return {
      key: group.key,
      name: group.name,
      init: group.init || (values[0]?.value ?? ""),
      value: values,
    };
  });
}

function buildCategoryFilterGroup(site) {
  const categories = Object.entries(site.defaultCategories || {});
  return {
    key: "categoryId",
    name: "分类",
    init: categories[0]?.[0] || "",
    value: [{ name: "全部", value: "" }, ...categories.map(([id, name]) => ({ name, value: id }))],
  };
}

function buildSiteFilters(site, externalFilterConfig) {
  const categoryFilter = buildCategoryFilterGroup(site);
  if (!externalFilterConfig || typeof externalFilterConfig !== "object" || Object.keys(externalFilterConfig).length === 0) {
    return [categoryFilter];
  }
  const allGroups = [];
  for (const groups of Object.values(externalFilterConfig)) {
    if (Array.isArray(groups)) allGroups.push(...groups);
  }
  return [categoryFilter, ...mergeFilterGroups(allGroups)];
}

async function fetchExternalFilterConfig(site) {
  const cache = siteFilterCache.get(site.id);
  if (cache && Date.now() - cache.time < CACHE_TTL.filter) return cache.data;

  const files = Array.isArray(site.filterFiles) ? site.filterFiles : [];
  if (files.length === 0) {
    siteFilterCache.set(site.id, { data: null, time: Date.now() });
    return null;
  }

  for (const file of files) {
    const url = `${FILTER_CONFIG_BASE_URL}/${file}`;
    try {
      const response = await httpRequest(url, { timeout: 10000 });
      if (response.statusCode !== 200 || !response.body) continue;
      const parsed = JSON.parse(response.body);
      const normalizedConfig = normalizeFilterConfigByCategory(parsed);
      siteFilterCache.set(site.id, { data: normalizedConfig, time: Date.now() });
      await OmniBox.log("info", `[filter] ${site.name} loaded ${file}`);
      return normalizedConfig;
    } catch (error) {
      await OmniBox.log("warn", `[filter] ${site.name} load fail ${file}: ${error.message}`);
    }
  }

  siteFilterCache.set(site.id, { data: null, time: Date.now() });
  return null;
}

function encodeFilterSegment(value) {
  return encodeURIComponent(String(value ?? "").trim());
}

function hasSecondaryFilters(filters = {}) {
  return Object.keys(filters).some((key) => key !== "categoryId" && filters[key] !== undefined && filters[key] !== null && filters[key] !== "");
}

function buildCategoryUrl(site, categoryId, page = 1, filters = {}) {
  const safeFilters = filters || {};
  const byValue = safeFilters.by || safeFilters.sort || "";
  const pg = Math.max(1, parseInt(page || "1", 10) || 1);

  if (hasSecondaryFilters(safeFilters)) {
    if (site.categoryUrlWithFilters) {
      let url = site.categoryUrlWithFilters;
      const replacements = {
        categoryId: categoryId || "",
        page: pg,
        class: encodeFilterSegment(safeFilters.class),
        area: encodeFilterSegment(safeFilters.area),
        year: encodeFilterSegment(safeFilters.year),
        by: encodeFilterSegment(byValue),
        letter: encodeFilterSegment(safeFilters.letter),
      };
      for (const [key, value] of Object.entries(replacements)) {
        url = url.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
      }
      return url;
    }

    const segments = [];
    for (const [key, rawValue] of Object.entries(safeFilters)) {
      if (key === "categoryId" || rawValue == null || rawValue === "") continue;
      const mappedKey = key === "sort" ? "by" : key;
      segments.push(`/${mappedKey}/${encodeFilterSegment(rawValue)}`);
    }
    return `/index.php/vod/show/id/${categoryId}${segments.join("")}/page/${pg}.html`;
  }

  // mxone 伪静态：第 1 页 /vodtype/1/，后续 /vodtype/1-2/
  if (site.categoryUrlPage && pg > 1) {
    return site.categoryUrlPage
      .replace(/\{categoryId\}/g, categoryId)
      .replace(/\{page\}/g, String(pg));
  }

  if (site.categoryUrl) {
    return site.categoryUrl
      .replace(/\{categoryId\}/g, categoryId)
      .replace(/\{page\}/g, String(pg));
  }

  return `/index.php/vod/show/id/${categoryId}/page/${pg}.html`;
}

function buildSearchUrl(site, keyword, page = 1) {
  const enc = encodeURIComponent(String(keyword || "").trim());
  const pg = Math.max(1, parseInt(page || "1", 10) || 1);

  if (site.searchUrlPage && pg > 1) {
    return site.searchUrlPage
      .replace(/\{keyword\}/g, enc)
      .replace(/\{page\}/g, String(pg));
  }

  if (site.searchUrl) {
    return site.searchUrl
      .replace(/\{keyword\}/g, enc)
      .replace(/\{page\}/g, String(pg));
  }

  return `/index.php/vod/search/page/${pg}/wd/${enc}.html`;
}

function normalizeShareUrl(url) {
  let u = String(url || "").trim().replace(/&amp;/g, "&");
  if (!u) return "";
  u = u.replace(/^https?:\/\/(?:www\.)?115cdn\.com\//i, "https://115.com/");
  u = u.replace(/^https?:\/\/(?:www\.)?anxia\.com\//i, "https://115.com/");
  return u.replace(/[),.;]+$/, "");
}

function extractPanUrl(raw) {
  const s = String(raw || "").replace(/&amp;/g, "&").trim();
  const m = s.match(/https?:\/\/[^\s"'<>]+/i);
  return m ? normalizeShareUrl(m[0]) : "";
}

function isPanShareUrl(url = "") {
  return /115|quark|aliyun|alipan|baidu|uc\.cn|123pan|189\.cn|xunlei|anxia/i.test(String(url || ""));
}

function extractPanUrlsFromDetail($, site) {
  const panUrls = [];
  const seen = new Set();
  const pushUrl = (raw) => {
    const url = extractPanUrl(raw);
    if (!url || !/^https?:\/\//i.test(url) || !isPanShareUrl(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    panUrls.push(url);
  };

  // mxone / 蜗牛：clipboard、a 标签、p/i/span 文本
  if (site.panExtractMode === "mxone") {
    $(".module-row-info").each((_, el) => {
      $(el).find("[data-clipboard-text]").each((__, n) => pushUrl($(n).attr("data-clipboard-text")));
      $(el).find('a[href^="http"]').each((__, a) => pushUrl($(a).attr("href")));
      $(el).find("i,p,span").each((__, p) => pushUrl($(p).text().trim()));
      const firstP = $(el).find("p")[0]?.children?.[0]?.data;
      if (firstP) pushUrl(firstP);
    });

    $(".pan-link-item[data-pan-item]").each((_, el) => {
      $(el).find("[data-copy]").each((__, n) => pushUrl($(n).attr("data-copy")));
      $(el).find('a[href^="http"]').each((__, a) => pushUrl($(a).attr("href")));
      $(el).find(".pan-link-meta").each((__, meta) => pushUrl($(meta).text().trim()));
    });
  } else {
    const selector = site.detailPanSelector || ".module-row-info p";
    $(selector).each((_, p) => pushUrl($(p).text().trim()));
  }

  // 兜底：整页扫描分享链接（含 115cdn/anxia）
  if (panUrls.length === 0) {
    const html = $.html() || "";
    const re =
      /https?:\/\/(?:115cdn\.com|115\.com|anxia\.com|pan\.quark\.cn|www\.aliyundrive\.com|www\.alipan\.com|pan\.baidu\.com|drive\.uc\.cn|cloud\.189\.cn|www\.123pan\.com|pan\.xunlei\.com)\/[^\s"'<>]+/gi;
    let m;
    while ((m = re.exec(html))) {
      pushUrl(m[0]);
    }
  }

  return panUrls;
}

function parseTotalPages($) {
  let totalPages = 1;
  const pageSelectors = [".page-numbers:not(.next):not(.prev)", ".pagination a", ".page a", ".pages a", ".module-page a"];
  for (const selector of pageSelectors) {
    const pageLinks = $(selector);
    if (pageLinks.length > 0) {
      let maxPage = 1;
      pageLinks.each((_, el) => {
        const pageNum = parseInt($(el).text().trim(), 10);
        if (!Number.isNaN(pageNum) && pageNum > maxPage) maxPage = pageNum;
        const href = $(el).attr("href") || "";
        const mType = href.match(/\/vodtype\/\d+-(\d+)\/?/i);
        if (mType) maxPage = Math.max(maxPage, parseInt(mType[1], 10) || 1);
        const mSearch = href.match(/\/vodsearch\/[^/]*?----------+(\d+)---+\/?/i);
        if (mSearch) maxPage = Math.max(maxPage, parseInt(mSearch[1], 10) || 1);
      });
      if (maxPage > 1) {
        totalPages = maxPage;
        break;
      }
    }
  }

  // mxone 兜底：扫描全页分页链接
  $("a[href*='/vodtype/'],a[href*='/vodsearch/']").each((_, a) => {
    const href = $(a).attr("href") || "";
    let m = href.match(/\/vodtype\/\d+-(\d+)\/?/i);
    if (m) totalPages = Math.max(totalPages, parseInt(m[1], 10) || 1);
    m = href.match(/\/vodsearch\/[^/]*?----------+(\d+)---+\/?/i);
    if (m) totalPages = Math.max(totalPages, parseInt(m[1], 10) || 1);
  });

  const pageText = $(".page-text, .page_info, .page-count").text();
  const pageMatch = pageText.match(/共\s*(\d+)\s*页/);
  if (pageMatch) totalPages = Math.max(totalPages, parseInt(pageMatch[1], 10) || 1);
  return totalPages;
}

// ==================== 网盘解析 ====================
async function getDriveParseWithCache(url, driveKey, drives, source = "") {
  const cacheKey = `${driveKey}_${url}`;
  const cached = driveParseCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL.drive) {
    return { data: cached.data, fromCache: true };
  }

  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("驱动超时")), 8000));
  try {
    const result = await Promise.race([getEpisodesFromDrive(url, driveKey, drives, source), timeoutPromise]);
    driveParseCache.set(cacheKey, { data: result, time: Date.now() });
    return { data: result, fromCache: false };
  } catch (error) {
    await OmniBox.log("info", `[drive] parse fail ${driveKey}, source=${source}, err=${error.message}`);
    return { data: null, fromCache: false, error: error.message };
  }
}

async function getEpisodesFromDrive(url, driveKey, drives, source = "") {
  const drive = drives.find((d) => d.key === driveKey);
  if (!drive) {
    await OmniBox.log("info", `[drive] missing driver ${driveKey}`);
    return null;
  }

  try {
    if (!drive.matchShare || !drive.matchShare(url)) {
      await OmniBox.log("info", `[drive] unmatched share ${driveKey}`);
      return null;
    }
    const vod = await drive.getVod(url);
    if (!vod) return null;

    let isValid = true;
    if (vod.vod_play_url) {
      const parts = vod.vod_play_url.split("#");
      if (parts.length === 1) {
        const [name] = parts[0].split("$");
        if (["播放", "全集", "点击播放", "立即播放"].includes(name)) isValid = false;
      }
    } else {
      isValid = false;
    }

    if (!isValid) return null;

    return {
      playFrom: vod.vod_play_from || driveKey,
      playUrl: vod.vod_play_url,
      vodPic: vod.vod_pic || "",
      vodContent: vod.vod_content || "",
      vodActor: vod.vod_actor || "",
      vodDirector: vod.vod_director || "",
    };
  } catch (error) {
    await OmniBox.log("info", `[drive] error ${driveKey}: ${error.message}`);
    return null;
  }
}

// ==================== 站点抓取 ====================
async function fetchSiteSearch(site, keyword, page = 1, options = {}) {
  const searchUrl = buildSearchUrl(site, keyword, page);

  try {
    const { response, baseUrl } = await requestWithFailover(site.domains, searchUrl, { budgetMs: options.budgetMs });
    const $ = cheerio.load(response.body);
    const itemSelector = site.searchListSelector || ".module-search-item";
    const items = $(itemSelector);
    const videos = [];
    const seen = new Set();

    items.each((_, el) => {
      const $item = $(el);
      const href =
        $item.attr("href") ||
        $item.find(".video-serial").attr("href") ||
        $item.find(".module-item-pic a").attr("href") ||
        $item.find('a[href*="/voddetail/"]').attr("href") ||
        $item.find('a[href*="/vod/detail/"]').attr("href") ||
        $item.find(".module-item-title").attr("href");
      const vodName = (
        $item.attr("title") ||
        $item.find(".video-title").text() ||
        $item.find(".video-serial").attr("title") ||
        $item.find(".module-item-pic img").attr("alt") ||
        $item.find(".module-item-title").attr("title") ||
        $item.find(".module-poster-item-title").text() ||
        $item.find(".module-item-title").text() ||
        $item.find("h3,h4").first().text() ||
        ""
      )
        .replace(/\s+/g, " ")
        .replace(/^立刻播放|^下载/g, "")
        .trim();
      let vodPic =
        $item.find(".module-item-pic img").attr("data-src") ||
        $item.find(".module-item-pic img").attr("data-original") ||
        $item.find(".module-item-pic img").attr("src") ||
        $item.find("img").first().attr("data-src") ||
        $item.find("img").first().attr("data-original") ||
        $item.find("img").first().attr("src");
      if (vodPic && vodPic.includes("loading.gif")) {
        vodPic =
          $item.find("img").first().attr("data-src") ||
          $item.find("img").first().attr("data-original") ||
          "";
      }
      if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;
      const vodRemarks =
        $item.find(".module-item-text").text().trim() ||
        $item.find(".module-item-note").text().trim() ||
        $item.find(".module-poster-item-note").text().trim() ||
        $item.find(".video-episode").text().trim() ||
        $item.find(".video-serial").text().trim() ||
        "";
      const vodYear = $item.find(".module-item-caption span").first().text().trim();

      if (href && vodName) {
        const vodId = `${site.id}_${href}`;
        if (seen.has(vodId)) return;
        seen.add(vodId);
        videos.push({
          vod_id: vodId,
          vod_name: `[${site.name}] ${vodName}`,
          vod_pic: vodPic || "",
          type_id: "",
          type_name: "",
          vod_remarks: vodRemarks || "",
          vod_year: vodYear || "",
          _source: site.name,
          _site_id: site.id,
          _href: href,
          _original_name: vodName,
        });
      }
    });

    await OmniBox.log("info", `[search] site=${site.name}, page=${page}, hit=${videos.length}`);
    return videos;
  } catch (error) {
    await OmniBox.log("error", `[search] site=${site.name} fail: ${error.message}`);
    return [];
  }
}

// ==================== 搜索合并（多站剧名聚合）====================
// 归一化剧名，用于跨站合并去重。去掉分辨率、年份、备注、季数等干扰后缀。
const MERGE_STRIP_RE = /(第\s*[一二三四五六七八九十百\d]+\s*[季部集]|全\s*\d+\s*集|全集|高清|超清|蓝光|4K|1080P|720P|1080|HD|国语|粤语|中字|中文字幕|英语|日语|韩语|无删减|完整版|抢先版|抢先|TC|BD|WEB.?DL|WEB|DVDRip|HDR|HDR10|修复版|加长版|纪念版|重制版|上译|导演剪辑版|杜比|全景声|无水印)/gi;

// 版本标识词（可用环境变量 MERGE_VERSION_WORDS 扩展，如 “臻彩;杜比”）。
// 聚合时只分两组：不含版本词 => 显示“剧名”；含版本词 => 显示“剧名(版本词)”。
const MERGE_VERSION_WORDS = (process.env.MERGE_VERSION_WORDS || "臻彩,真彩")
  .split(/[;,]/)
  .map((s) => s.trim())
  .filter(Boolean);

function findVersionMarker(title) {
  const s = String(title || "");
  for (const w of MERGE_VERSION_WORDS) {
    if (s.includes(w)) return w;
  }
  return "";
}

// 从字符串中移除所有版本词（如“臻彩”），因为版本词由 #后缀 单独标识
function stripVersionWords(s) {
  let out = String(s || "");
  for (const w of MERGE_VERSION_WORDS) {
    out = out.split(w).join(" ");
  }
  return out;
}

// 用于合并 key：先把所有括号内容、年份、分辨率等噪声及版本词全部去掉得到基础剧名；
// 再根据是否含版本词（如“臻彩”）分成本组 key，保证“江海潮生”与“江海潮生(臻彩)”各成一组
function normalizeMergeTitle(title) {
  let base = String(title || "")
    .replace(/\s+/g, " ")
    .replace(/[（【〔]/g, "(")
    .replace(/[）】〕]/g, ")")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(MERGE_STRIP_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  base = stripVersionWords(base);
  return base.toLowerCase().replace(/\s+/g, "");
}

// 统一展示：所有不含版本词的，不管原名怎么写，一律显示为基础“剧名”；
// 所有包含版本词的，不管原名怎么写，统一显示为“剧名(版本词)”
function cleanMergeDisplayName(title) {
  let base = String(title || "")
    .replace(/\s+/g, " ")
    .replace(/[（【〔]/g, "(")
    .replace(/[）】〕]/g, ")")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(MERGE_STRIP_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  base = stripVersionWords(base);
  // 含任一版本词的统一显示为“剧名(第一个版本词)”，如 MERGE_VERSION_WORDS=臻彩,真彩 => 一律显示 (臻彩)
  const hasVersion = findVersionMarker(title);
  return hasVersion ? `${base}(${MERGE_VERSION_WORDS[0] || "臻彩"})` : base;
}

// 分组展示排序：不带版本标识（无括号）的剧名排前，带版本标识的（如 剧名(臻彩)）排后
function compareMergeDisplayName(a, b) {
  const aHasSuffix = a.vod_name.includes("(");
  const bHasSuffix = b.vod_name.includes("(");
  if (aHasSuffix !== bHasSuffix) return aHasSuffix ? 1 : -1;
  return 0;
}

function b64UrlEncode(str) {
  return Buffer.from(String(str), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64UrlDecode(str) {
  let base64 = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  return Buffer.from(base64 + pad, "base64").toString("utf8");
}

function encodeMergeId(matches) {
  const payload = matches.map((m) => [m.siteId, m.href]);
  return MERGE_PREFIX + b64UrlEncode(JSON.stringify(payload));
}

function decodeMergeId(vodId) {
  if (!String(vodId || "").startsWith(MERGE_PREFIX)) return null;
  try {
    const encoded = String(vodId).slice(MERGE_PREFIX.length);
    const payload = JSON.parse(b64UrlDecode(encoded));
    if (!Array.isArray(payload)) return null;
    const matches = payload
      .map(([siteId, href]) => ({ siteId: String(siteId || ""), href: String(href || "") }))
      .filter((m) => m.siteId && m.href);
    return matches.length > 0 ? matches : null;
  } catch (error) {
    return null;
  }
}

// 把各站点搜索结果按归一化剧名合并去重，只返回剧名，并携带所有匹配站点的详情地址
function mergeSearchResults(resultsArrays) {
  const mergedMap = new Map();
  const orderedKeys = [];

for (const arr of resultsArrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const titleRaw = item._original_name || item.vod_name || "";
      if (!titleRaw) continue;
      const marker = findVersionMarker(titleRaw);
      // 含任一版本词的归为同一组（后缀固定，不区分具体是哪个版本词）
      const key = normalizeMergeTitle(titleRaw) + (marker ? "#v" : "");
      if (!key) continue;
      const match = { siteId: item._site_id || "", siteName: item._source || "", href: item._href || "" };
      if (!match.siteId || !match.href) continue;

      if (!mergedMap.has(key)) {
        mergedMap.set(key, { vod_name: cleanMergeDisplayName(titleRaw), vod_pic: item.vod_pic || "", vod_year: item.vod_year || "", matches: [], seenMatch: new Set() });
        orderedKeys.push(key);
      }
      const entry = mergedMap.get(key);
      const dedupeKey = `${match.siteId}|${match.href}`;
      if (entry.seenMatch.has(dedupeKey)) continue;
      entry.seenMatch.add(dedupeKey);
      entry.matches.push(match);
      if (!entry.vod_pic && item.vod_pic) entry.vod_pic = item.vod_pic;
      if (!entry.vod_year && item.vod_year) entry.vod_year = item.vod_year;
    }
  }

  const list = [];
  for (const key of orderedKeys) {
    const entry = mergedMap.get(key);
    if (entry.matches.length === 0) continue;
    const matches = MERGE_MAX_SITES > 0 ? entry.matches.slice(0, MERGE_MAX_SITES) : entry.matches;
    list.push({
      vod_id: encodeMergeId(matches),
      vod_name: entry.vod_name,
      vod_pic: entry.vod_pic || "",
      type_id: "",
      type_name: "",
      vod_remarks: `聚合${matches.length}个网站`,
      vod_year: entry.vod_year || "",
    });
  }
  // 展顺序稳定：无版本标识剧名在前，带“(版本)”在后
  list.sort(compareMergeDisplayName);
  return list;
}

function getSiteOrderIndex(siteId) {
  if (PAN_SITE_ORDER.length > 0) {
    const idx = PAN_SITE_ORDER.indexOf(String(siteId || "").toLowerCase());
    return idx === -1 ? 1e9 : idx;
  }
  const idx = SITES.findIndex((s) => s.id === siteId);
  return idx === -1 ? 1e9 : idx;
}

// 网盘链接先按网盘类型排序，再按站点顺序排序（对应“115#木偶,115#玩偶,百度#木偶,百度#多多”）
function compareDriveSitePan(a, b) {
  const idxA = LINE_ORDER.indexOf(a.driveKey);
  const idxB = LINE_ORDER.indexOf(b.driveKey);
  const oa = idxA === -1 ? 1e9 : idxA;
  const ob = idxB === -1 ? 1e9 : idxB;
  if (oa !== ob) return oa - ob;
  return getSiteOrderIndex(a.siteId) - getSiteOrderIndex(b.siteId);
}

async function fetchSiteCategoryList(site, categoryId, page = 1, filters = {}) {
  const url = buildCategoryUrl(site, categoryId, page, filters);
  await OmniBox.log("info", `[category] site=${site.name}, cid=${categoryId}, page=${page}, url=${url}`);

  const { response, baseUrl } = await requestWithFailover(site.domains, url);
  const $ = cheerio.load(response.body);
  const videos = [];

  $(site.listSelector).each((_, el) => {
    const $item = $(el);
    const href =
      $item.attr("href") ||
      $item.find(".module-item-pic a").attr("href") ||
      $item.find('a[href*="/voddetail/"]').attr("href") ||
      $item.find('a[href*="/vod/detail/"]').attr("href") ||
      $item.find(".module-item-title").attr("href");
    const vodName = (
      $item.attr("title") ||
      $item.find(".video-title").text() ||
      $item.find(".module-item-pic img").attr("alt") ||
      $item.find(".module-item-title").attr("title") ||
      $item.find(".module-poster-item-title").text() ||
      $item.find(".module-item-title").text() ||
      $item.find("h3,h4").first().text() ||
      ""
    )
      .replace(/\s+/g, " ")
      .replace(/^立刻播放|^下载/g, "")
      .trim();
    let vodPic =
      $item.find(".module-item-pic img").attr("data-src") ||
      $item.find(".module-item-pic img").attr("data-original") ||
      $item.find(".module-item-pic img").attr("src") ||
      $item.find("img").first().attr("data-src") ||
      $item.find("img").first().attr("data-original") ||
      $item.find("img").first().attr("src");
    if (vodPic && vodPic.includes("loading.gif")) {
      vodPic =
        $item.find("img").first().attr("data-src") ||
        $item.find("img").first().attr("data-original") ||
        "";
    }
    if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;
    const vodRemarks =
      $item.find(".module-item-text").text().trim() ||
      $item.find(".module-item-note").text().trim() ||
      $item.find(".module-poster-item-note").text().trim() ||
      $item.find(".video-episode").text().trim() ||
      $item.find(".video-serial").text().trim() ||
      "";
    const vodYear = $item.find(".module-item-caption span").first().text().trim();

    if (href && vodName) {
      videos.push({
        vod_id: `${site.id}_${href}`,
        vod_name: vodName,
        vod_pic: vodPic || "",
        type_id: categoryId,
        type_name: site.defaultCategories[categoryId] || "",
        vod_remarks: vodRemarks || "",
        vod_year: vodYear || "",
      });
    }
  });

  const totalPages = parseTotalPages($);
  const total = videos.length > 0 ? videos.length * totalPages : 0;
  await OmniBox.log("info", `[category] site=${site.name}, list=${videos.length}, pages=${totalPages}`);
  return { list: videos, total, page, totalPages };
}

async function fetchSiteDetail(site, videoId, options = {}) {
  const { response, baseUrl } = await requestWithFailover(site.domains, videoId, { budgetMs: options.budgetMs });
  const $ = cheerio.load(response.body);

  let vodName =
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    $(".page-title").text().replace(/\s+/g, " ").trim() ||
    $(".video-info-header h1").first().text().replace(/\s+/g, " ").trim() ||
    $(".module-info-heading h1").first().text().replace(/\s+/g, " ").trim() ||
    $(".mobile-detail-title").first().text().replace(/\s+/g, " ").trim() ||
    $(".premium-title").first().text().replace(/\s+/g, " ").trim() ||
    "";
  let vodPic =
    $(".mobile-play .lazyload").attr("data-src") ||
    $(".module-item-pic img,.module-info-poster img,.video-cover img,img.lazyload,img.lazy,.premium-poster img")
      .first()
      .attr("data-src") ||
    $(".module-item-pic img,.module-info-poster img,.video-cover img,img.lazyload,img.lazy,.premium-poster img")
      .first()
      .attr("data-original") ||
    $(".module-item-pic img,.module-info-poster img,.video-cover img,img.lazyload,img.lazy,.premium-poster img")
      .first()
      .attr("src") ||
    "";
  if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;

  let vodYear = "";
  let vodDirector = "";
  let vodActor = "";
  let vodContent = "";

  $(".video-info-itemtitle").each((_, item) => {
    const key = $(item).text();
    const value = $(item).next().find("a").map((_, a) => $(a).text().trim()).get().filter(Boolean).join(", ");
    if (key.includes("剧情")) vodContent = $(item).next().find("p").text().trim();
    else if (key.includes("导演")) vodDirector = value;
    else if (key.includes("主演")) vodActor = value;
    else if (key.includes("年代") || key.includes("年份") || key.includes("上映")) {
      const yearText = $(item).next().text().trim() || value;
      const m = yearText.match(/(19|20)\d{2}/);
      if (m) vodYear = m[0];
    }
  });

  if (!vodContent) {
    vodContent = (
      $(".vod_content,.module-info-introduction,.video-info-content,.module-info-main .module-info-item-content,.detail-desc-text,.premium-plot")
        .last()
        .text() || ""
    )
      .replace(/收起|展开全部|内详/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const infoText = $(".video-info,.module-info-main,.module-info,.premium-meta-grid,.detail-info-premium").text() || "";
  if (!vodYear) {
    const match = infoText.match(/(?:年代|年份|上映)[:：]?\s*(\d{4})/) || infoText.match(/\b(19|20)\d{2}\b/);
    if (match) vodYear = String(match[1] || match[0]).replace(/\D/g, "").slice(0, 4);
  }
  if (!vodDirector) {
    const match = infoText.match(/导演[:：]?\s*([^\n]+?)\s*(主演|年代|备注|剧情|$)/);
    if (match) vodDirector = match[1].replace(/^\/\s*/, "").trim();
  }
  if (!vodActor) {
    const match = infoText.match(/主演[:：]?\s*([^\n]+?)\s*(年代|备注|剧情|导演|$)/);
    if (match) vodActor = match[1].replace(/^\/\s*/, "").trim();
  }

  if (!vodDirector || !vodActor || !vodYear) {
    $(".premium-meta-grid .meta-item").each((_, el) => {
      const label = $(el).find(".m-label").text().trim();
      const value = $(el).find(".m-val").text().trim();
      if (!label || !value) return;
      if (!vodDirector && label.includes("导演")) vodDirector = value;
      if (!vodActor && label.includes("主演")) vodActor = value;
      if (!vodYear && (label.includes("年代") || label.includes("年份") || label.includes("上映"))) {
        const match = value.match(/(19|20)\d{2}/);
        if (match) vodYear = match[0];
      }
    });
  }

  if (!vodYear) {
    $(".premium-tags-top .p-tag").each((_, el) => {
      const match = $(el).text().trim().match(/^(19|20)\d{2}$/);
      if (match) vodYear = match[0];
    });
  }

  const panUrls = extractPanUrlsFromDetail($, site);

  await OmniBox.log("info", `[detail] site=${site.name}, panUrls=${panUrls.length}`);
  return { vodName, vodPic, vodYear, vodDirector, vodActor, vodContent, panUrls };
}

async function processDriveShareURL(shareURL, { vodId, vodName, takeWoniuSlot } = {}) {
  try {
    if (typeof takeWoniuSlot === "function") {
      const requestIndex = takeWoniuSlot();
      if (requestIndex > 0 && WONIU4K_DRIVE_API_DELAY_MS > 0) {
        await sleep(WONIU4K_DRIVE_API_DELAY_MS);
      }
    }

    await OmniBox.log("info", `[detail] 处理网盘链接: ${shareURL}`);

    const driveInfo = await getDriveInfoCached(shareURL);
    const displayName = driveInfo.displayName || "未知网盘";
    await OmniBox.log("info", `[detail] 网盘类型: ${displayName}, driveType: ${driveInfo.driveType}`);

    const fileList = await getRootFileListCached(shareURL);
    if (!Array.isArray(fileList?.files) || fileList.files.length === 0) {
      await OmniBox.log("warn", `[detail] 获取文件列表失败: ${shareURL}`);
      return null;
    }

    await OmniBox.log("info", `[detail] 从分享链接 ${shareURL} 获取文件列表成功,文件数量: ${fileList.files.length}`);

    const allVideoFiles = await getAllVideoFilesCached(shareURL, fileList.files);
    if (allVideoFiles.length === 0) {
      await OmniBox.log("warn", `[detail] 未找到视频文件: ${shareURL}`);
      return null;
    }

    await OmniBox.log("info", `[detail] 递归获取视频文件完成,视频文件数量: ${allVideoFiles.length}`);

    // ==================== 刮削处理（参考木偶.js）====================
    const scrapeKey = `${vodId}@@${encodeURIComponent(shareURL)}`;
    if (ENABLE_SCRAPE) {
      try {
        await OmniBox.log("info", `[detail] 开始执行刮削处理, scrapeKey=${scrapeKey}, 资源名: ${vodName}, 视频文件数: ${allVideoFiles.length}`);

        const videoFilesForScraping = allVideoFiles.map((file) => {
          const fileId = file.fid || file.file_id || "";
          const formattedFileId = fileId ? `${shareURL}|${fileId}|${scrapeKey}` : fileId;
          return {
            ...file,
            fid: formattedFileId,
            file_id: formattedFileId,
          };
        });

        await OmniBox.log("info", `[detail] 文件ID格式转换完成,示例: ${videoFilesForScraping[0]?.fid || "N/A"}`);

        const scrapingResult = await OmniBox.processScraping(scrapeKey, vodName, vodName, videoFilesForScraping);
        await OmniBox.log("info", `[detail] 刮削处理完成,结果: ${JSON.stringify(scrapingResult).substring(0, 200)}`);
      } catch (error) {
        await OmniBox.log("error", `[detail] 刮削处理失败: ${error.message}`);
        if (error.stack) {
          await OmniBox.log("error", `[detail] 刮削错误堆栈: ${error.stack}`);
        }
      }
    }

    // 获取刮削后的元数据（使用独立 scrapeKey，避免多个网盘互相覆盖）
    let scrapeData = null;
    let videoMappings = [];
    let scrapeType = "";

    try {
      await OmniBox.log("info", `[detail] 开始获取元数据, scrapeKey: ${scrapeKey}`);
      const metadata = await OmniBox.getScrapeMetadata(scrapeKey);
      await OmniBox.log("info", `[detail] 获取元数据响应: ${JSON.stringify(metadata).substring(0, 500)}`);

      scrapeData = metadata.scrapeData || null;
      videoMappings = metadata.videoMappings || [];
      scrapeType = metadata.scrapeType || "";

      if (scrapeData) {
        await OmniBox.log("info", `[detail] 获取到刮削数据,标题: ${scrapeData.title || "未知"}, 类型: ${scrapeType || "未知"}, 映射数量: ${videoMappings.length}`);
      } else {
        await OmniBox.log("warn", `[detail] 未获取到刮削数据,映射数量: ${videoMappings.length}`);
      }
    } catch (error) {
      await OmniBox.log("error", `[detail] 获取元数据失败: ${error.message}`);
      if (error.stack) {
        await OmniBox.log("error", `[detail] 获取元数据错误堆栈: ${error.stack}`);
      }
    }

    return { shareURL, displayName, driveInfo, allVideoFiles, scrapeData, videoMappings, scrapeType, scrapeKey };
  } catch (error) {
    await OmniBox.log("error", `[detail] 处理网盘链接失败: ${shareURL}, 错误: ${error.message}`);
    return null;
  }
}

// 把单个网盘链接的文件组装成播放集（线路名使用 displayLabel）
function buildEpisodesForLabel(result, displayLabel, effectiveSourceNamesConfig) {
  const { shareURL, driveInfo, allVideoFiles, scrapeData, videoMappings, scrapeKey } = result;
  const sourceOut = [];

  let sourceNames = [displayLabel];
  if (DRIVE_TYPE_CONFIG.includes(driveInfo.driveType)) {
    sourceNames = [...effectiveSourceNamesConfig];
    OmniBox.log("info", `${displayLabel} 匹配成功,线路设置为: ${sourceNames.join(", ")}`);
  }

  for (const sourceName of sourceNames) {
    const episodes = [];
    for (const file of allVideoFiles) {
      let fileName = file.file_name || "";
      const fileId = file.fid || "";
      const fileSize = file.size || file.file_size || 0;
      if (!fileName || !fileId) continue;

      const formattedFileId = `${shareURL}|${fileId}|${scrapeKey}`;
      let matchedMapping = null;

      if (scrapeData && Array.isArray(videoMappings) && videoMappings.length) {
        for (const mapping of videoMappings) {
          if (mapping && mapping.fileId === formattedFileId) {
            matchedMapping = mapping;
            const newFileName = buildScrapedFileName(scrapeData, mapping, fileName);
            if (newFileName && newFileName !== fileName) {
              fileName = newFileName;
            }
            break;
          }
        }
      }

      let displayFileName = fileName;
      if (fileSize > 0) {
        const sizeStr = formatFileSize(fileSize);
        if (sizeStr) displayFileName = `[${sizeStr}] ${fileName}`;
      }

      const encodedDanmakuName = encodeURIComponent(fileName);
      const episode = { name: displayFileName, playId: `${formattedFileId}|${encodedDanmakuName}` };
      if (fileSize > 0) episode.size = fileSize;
      if (matchedMapping) {
        if (matchedMapping.seasonNumber !== undefined) episode._seasonNumber = matchedMapping.seasonNumber;
        if (matchedMapping.episodeNumber !== undefined) episode._episodeNumber = matchedMapping.episodeNumber;
        if (matchedMapping.episodeName) episode.episodeName = matchedMapping.episodeName;
        if (matchedMapping.episodeOverview) episode.episodeOverview = matchedMapping.episodeOverview;
        if (matchedMapping.episodeAirDate) episode.episodeAirDate = matchedMapping.episodeAirDate;
        if (matchedMapping.episodeStillPath) episode.episodeStillPath = matchedMapping.episodeStillPath;
        if (matchedMapping.episodeVoteAverage !== undefined) episode._episodeVoteAverage = matchedMapping.episodeVoteAverage;
        if (matchedMapping.episodeRuntime !== undefined) episode._episodeRuntime = matchedMapping.episodeRuntime;
      }
      episodes.push(episode);
    }

    if (scrapeData && episodes.some((ep) => ep._episodeNumber !== undefined)) {
      episodes.sort((a, b) => {
        const seasonA = a._seasonNumber ?? 0;
        const seasonB = b._seasonNumber ?? 0;
        if (seasonA !== seasonB) return seasonA - seasonB;
        return (a._episodeNumber ?? 0) - (b._episodeNumber ?? 0);
      });
    }

    if (episodes.length > 0) {
      let finalSourceName = sourceName;
      if (DRIVE_TYPE_CONFIG.includes(driveInfo.driveType)) {
        finalSourceName = `${displayLabel}-${sourceName}`;
      }
      sourceOut.push({ name: finalSourceName, episodes });
    }
  }
  return sourceOut;
}

// 用刮削元数据补充详情字段
function applyScrapeMetadataToDetail(target, scrapeData) {
  if (!scrapeData) return;
  if (scrapeData.title) target.vodName = scrapeData.title;
  if (scrapeData.posterPath) target.vodPic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
  if (scrapeData.releaseDate) target.vodYear = scrapeData.releaseDate.substring(0, 4);
  if (scrapeData.overview) target.vodContent = scrapeData.overview;
  if (scrapeData.credits) {
    if (Array.isArray(scrapeData.credits.cast) && scrapeData.credits.cast.length) {
      target.vodActor = scrapeData.credits.cast.slice(0, 5).map((c) => c.name).filter(Boolean).join(",");
    }
    if (Array.isArray(scrapeData.credits.crew) && scrapeData.credits.crew.length) {
      const directors = scrapeData.credits.crew.filter((c) => c.job === "Director" || c.department === "Directing");
      if (directors.length) target.vodDirector = directors.slice(0, 3).map((d) => d.name).filter(Boolean).join(",");
    }
  }
}

async function handleSiteDetail(vodId, drives, context) {
  const parts = String(vodId).split("_");
  const siteId = parts[0];
  const rawId = parts.slice(1).join("_");
  const site = SITES.find((s) => s.id === siteId);
  if (!site) return null;

  const { vodName, vodPic, vodYear, vodDirector, vodActor, vodContent, panUrls } = await fetchSiteDetail(site, rawId);

  const panItems = panUrls.map((panUrl) => ({ url: panUrl, driveKey: detectDriveKey(panUrl) }));
  panItems.sort((a, b) => compareDriveKeyOrder(a.driveKey, b.driveKey));

  let playSources = [];
  const driveTypeCountMap = {};
  for (const { url: shareURL } of panItems) {
    const driveInfo = await getDriveInfoCached(shareURL);
    const displayName = driveInfo.displayName || "未知网盘";
    driveTypeCountMap[displayName] = (driveTypeCountMap[displayName] || 0) + 1;
  }

  // ==================== 限并发处理网盘链接 ====================
  const detailConcurrency = site.id === "woniu4k" ? 1 : 4;
  let woniuRequestIndex = 0;
  const driveResults = await runWithConcurrency(panItems.map(item => item.url), detailConcurrency, (shareURL) =>
    processDriveShareURL(shareURL, {
      vodId,
      vodName,
      takeWoniuSlot: site.id === "woniu4k" ? () => woniuRequestIndex++ : null,
    })
  );

  // 同网盘类型多个链接时加序号（115 / 1152），再拼上站点名 => “115#玩偶”
  const driveTypeCurrentIndexMap = {};
  const labeledResults = driveResults.map((result) => {
    if (!result) return null;
    const total = driveTypeCountMap[result.displayName] || 0;
    let displayName = result.displayName;
    if (total > 1) {
      driveTypeCurrentIndexMap[result.displayName] = (driveTypeCurrentIndexMap[result.displayName] || 0) + 1;
      displayName = `${result.displayName}${driveTypeCurrentIndexMap[result.displayName]}`;
    }
    return { ...result, displayName };
  });

  const metadata = { vodName, vodPic, vodYear, vodDirector, vodActor, vodContent };

  // 播放线路与 SOURCE_NAMES_CONFIG 完全一致（夸克/UC 等多线路网盘按该变量生成线路，不再因 web 过滤）
  const effectiveSourceNamesConfig = [...SOURCE_NAMES_CONFIG];

  for (const result of labeledResults) {
    if (!result) continue;
    const displayLabel = `${result.displayName}#${site.name}`;
    playSources.push(...buildEpisodesForLabel(result, displayLabel, effectiveSourceNamesConfig));
    applyScrapeMetadataToDetail(metadata, result.scrapeData);
  }

  // 按网盘类型优先级排序播放源
  if (Array.isArray(playSources) && playSources.length > 1 && DRIVE_ORDER.length > 0) {
    const sortedSources = sortPlaySourcesByDriveOrder(playSources);
    await OmniBox.log("info", `[detail] 按 DRIVE_ORDER 排序后线路顺序: ${sortedSources.map(item => item.name).join(' | ')}`);
    playSources = sortedSources;
  }

  await OmniBox.log("info", `[detail] 构建播放源完成,网盘数量: ${playSources.length}`);

  return {
    vod_id: vodId,
    vod_name: metadata.vodName,
    vod_pic: metadata.vodPic,
    vod_year: metadata.vodYear,
    vod_director: metadata.vodDirector,
    vod_actor: metadata.vodActor,
    vod_content: metadata.vodContent || `网盘资源,共${panUrls.length}个网盘链接`,
    vod_play_sources: playSources.length > 0 ? playSources : undefined,
  };
}

async function handleMergedDetail(vodId, drives, context) {
  const matches = decodeMergeId(vodId);
  if (!matches || matches.length === 0) return null;

  // ==================== 并行抓取所有匹配站点的详情，收集网盘链接 ====================
  const panItems = [];
  const matchedSites = [];
  const metadata = { vodName: "", vodPic: "", vodYear: "", vodDirector: "", vodActor: "", vodContent: "" };
  let totalPanCount = 0;

  const siteDetailResults = await Promise.all(
    matches.map(async (match) => {
      const site = SITES.find((s) => s.id === match.siteId);
      if (!site) return null;
      try {
        return { site, detailData: await fetchSiteDetail(site, match.href, { budgetMs: DETAIL_TIMEOUT_BUDGET_MS }) };
      } catch (error) {
        await OmniBox.log("warn", `[merged-detail] ${site.name} 详情抓取失败: ${error.message}`);
        return null;
      }
    })
  );

  for (const res of siteDetailResults) {
    if (!res || !res.detailData) continue;
    const { site, detailData } = res;
    matchedSites.push(site);
    if (!metadata.vodName) metadata.vodName = detailData.vodName;
    if (!metadata.vodPic) metadata.vodPic = detailData.vodPic;
    if (!metadata.vodYear) metadata.vodYear = detailData.vodYear;
    if (!metadata.vodDirector) metadata.vodDirector = detailData.vodDirector;
    if (!metadata.vodActor) metadata.vodActor = detailData.vodActor;
    if (!metadata.vodContent) metadata.vodContent = detailData.vodContent;

    for (const panUrl of detailData.panUrls) {
      panItems.push({ url: panUrl, driveKey: detectDriveKey(panUrl), siteId: site.id, siteName: site.name });
      totalPanCount++;
    }
  }

  if (totalPanCount === 0 || panItems.length === 0) {
    await OmniBox.log("warn", `[merged-detail] 未找到网盘链接, vodId=${vodId}`);
    return null;
  }

  // 网盘先分类、网站再分类
  panItems.sort(compareDriveSitePan);

  // ==================== 网盘链接去重 ====================
  // 相同分享链接（规范化后）只保留其排序位置靠前的那一个网站，不重复解析、不重复展示其他网站。
  const seenUrl = new Set();
  const dedupedPanItems = [];
  let dedupedPanCount = 0;
  for (const item of panItems) {
    if (seenUrl.has(item.url)) continue;
    seenUrl.add(item.url);
    dedupedPanItems.push(item);
    dedupedPanCount++;
  }
  await OmniBox.log("info", `[merged-detail] 网盘链接去重: ${totalPanCount} -> ${dedupedPanCount}`);

  if (dedupedPanCount === 0) return null;

  // ==================== 限并发解析网盘文件（每种网盘最多保留前 N 条有效链接）====================
  // PAN_MAX_LINKS_PER_DRIVE（默认 3）：某种网盘一旦解析出 N 条有效链接（有视频），
  // 该网盘剩余链接直接跳过不再盘检/刮削，减少耗时；线路也按“每种网盘前 N 条有效”展示。
  const detailConcurrency = matchedSites.some((s) => s.id === "woniu4k") ? 1 : 4;
  let woniuRequestIndex = 0;
  const driveResults = await runWithConcurrencyPerDriveCap(dedupedPanItems, detailConcurrency, PAN_MAX_LINKS_PER_DRIVE, (item) =>
    processDriveShareURL(item.url, {
      vodId,
      vodName: metadata.vodName,
      takeWoniuSlot: item.siteId === "woniu4k" ? () => woniuRequestIndex++ : null,
    })
  );

  // 组装线路名：网盘#网站（同一网盘+同一网站存在多个链接时加序号）=> “115#木偶”
  const labelCountMap = new Map();
  const labeledResults = driveResults.map((result, index) => {
    if (!result) return null;
    const item = dedupedPanItems[index];
    const key = `${result.displayName}\u0000${item.siteName}`;
    const count = (labelCountMap.get(key) || 0) + 1;
    labelCountMap.set(key, count);
    const label = count === 1 ? `${result.displayName}#${item.siteName}` : `${result.displayName}#${item.siteName}${count}`;
    return { ...result, displayName: label };
  });

  let playSources = [];
  // 播放线路与 SOURCE_NAMES_CONFIG 完全一致（夸克/UC 等多线路网盘按该变量生成线路）
  const effectiveSourceNamesConfig = [...SOURCE_NAMES_CONFIG];

  for (const result of labeledResults) {
    if (!result) continue;
    playSources.push(...buildEpisodesForLabel(result, result.displayName, effectiveSourceNamesConfig));
    applyScrapeMetadataToDetail(metadata, result.scrapeData);
  }

  // 按网盘类型优先级排序播放源
  if (Array.isArray(playSources) && playSources.length > 1 && DRIVE_ORDER.length > 0) {
    const sortedSources = sortPlaySourcesByDriveOrder(playSources);
    await OmniBox.log("info", `[merged-detail] 按 DRIVE_ORDER 排序后线路顺序: ${sortedSources.map(item => item.name).join(' | ')}`);
    playSources = sortedSources;
  }

  await OmniBox.log("info", `[merged-detail] 完成, sites=${matchedSites.length}, panLinks=${dedupedPanCount}, sources=${playSources.length}`);

  return {
    vod_id: vodId,
    vod_name: metadata.vodName,
    vod_pic: metadata.vodPic,
    vod_year: metadata.vodYear,
    vod_director: metadata.vodDirector,
    vod_actor: metadata.vodActor,
    vod_content: metadata.vodContent || `聚合${matchedSites.length}个网站,共${dedupedPanCount}个网盘链接`,
    vod_play_sources: playSources.length > 0 ? playSources : undefined,
  };
}

function detectDriveKey(panUrl) {
  const url = String(panUrl || "").toLowerCase();
  if (url.includes("pan.baidu.com")) return "baidu";
  if (url.includes("quark.cn")) return "quark";
  if (url.includes("115.com") || url.includes("115cdn.com") || url.includes("anxia.com")) return "a115";
  if (url.includes("123pan.com")) return "a123";
  if (url.includes("189.cn")) return "a189";
  if (url.includes("139.com")) return "a139";
  if (url.includes("aliyundrive.com") || url.includes("alipan.com")) return "ali";
  if (url.includes("xunlei.com")) return "xunlei";
  if (url.includes("uc.cn")) return "uc";
  return "other";
}

function inferDriveTypeFromSourceName(name = "") {
  const raw = String(name || "").toLowerCase();
  if (raw.includes("百度")) return "baidu";
  if (raw.includes("139")) return "a139";
  if (raw.includes("天翼") || raw.includes("189")) return "a189";
  if (raw.includes("123")) return "a123";
  if (raw.includes("115")) return "a115";
  if (raw.includes("夸克")) return "quark";
  if (raw.includes("迅雷")) return "xunlei";
  if (raw.includes("阿里")) return "ali";
  if (raw === "uc" || raw.includes("uc")) return "uc";
  return raw;
}

function sortPlaySourcesByDriveOrder(playSources = []) {
  if (!Array.isArray(playSources) || playSources.length <= 1 || DRIVE_ORDER.length === 0) {
    return playSources;
  }
  const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
  return [...playSources].sort((a, b) => {
    const aType = inferDriveTypeFromSourceName(a?.name || "");
    const bType = inferDriveTypeFromSourceName(b?.name || "");
    const aOrder = orderMap.has(aType) ? orderMap.get(aType) : Number.MAX_SAFE_INTEGER;
    const bOrder = orderMap.has(bType) ? orderMap.get(bType) : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return 0;
  });
}

function compareDriveKeyOrder(a, b) {
  const indexA = LINE_ORDER.indexOf(a);
  const indexB = LINE_ORDER.indexOf(b);
  if (indexA === -1 && indexB === -1) return 0;
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
}

/**
 * 工具: 限并发执行任务，避免 detail 中网盘链接过多时瞬时并发过高。
 */
async function runWithConcurrency(items, limit, taskFn) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];

  const results = new Array(list.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= list.length) break;
      results[current] = await taskFn(list[current], current);
    }
  }

  const workerCount = Math.max(1, Math.min(limit || 1, list.length));
  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

/**
 * 工具: 按网盘类型（item.driveKey）限制“有效”结果数量，各网盘组并行处理。
 * 组内顺序解析，成功解析出 perDriveCap 条（有返回结果即视为有效）后停止该网盘剩余链接。
 * 保证每种网盘只保留“前 perDriveCap 条有效链接”；perDriveCap <= 0 时不限制。
 */
async function runWithConcurrencyPerDriveCap(items, limit, perDriveCap, taskFn) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];

  const results = new Array(list.length);

  if (!(perDriveCap > 0)) {
    return runWithConcurrency(list, limit, taskFn);
  }

  // 按网盘分组（保持原顺序）
  const driveOrder = [];
  const driveMap = new Map();
  for (const item of list) {
    const key = item?.driveKey || "";
    if (!driveMap.has(key)) {
      driveMap.set(key, []);
      driveOrder.push(key);
    }
    driveMap.get(key).push(item);
  }

  // 各网盘组并行；组内顺序解析，达到有效上限即停
  await Promise.all(
    driveOrder.map(async (driveKey) => {
      const group = driveMap.get(driveKey);
      let validCount = 0;
      for (let i = 0; i < group.length; i++) {
        if (validCount >= perDriveCap) break;
        const item = group[i];
        const globalIndex = list.indexOf(item);
        const result = await taskFn(item, globalIndex);
        results[globalIndex] = result || null;
        if (result) validCount += 1;
      }
    })
  );

  return results;
}

/**
 * 构建刮削后的文件名（参考木偶.js）
 */
function buildScrapedFileName(scrapeData, mapping, originalFileName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalFileName;
  }

  if (scrapeData && scrapeData.episodes && Array.isArray(scrapeData.episodes)) {
    for (const episode of scrapeData.episodes) {
      if (episode.episodeNumber === mapping.episodeNumber && episode.seasonNumber === mapping.seasonNumber) {
        if (episode.name) {
          return `${episode.episodeNumber}.${episode.name}`;
        }
        break;
      }
    }
  }

  return originalFileName;
}

function buildDanmakuCandidates({ scrapeData, scrapeType = "", matchedMapping = null, fallbackDanmakuFileName = "" }) {
  const candidates = [];
  const seen = new Set();

  const pushCandidate = (value) => {
    const text = String(value || "").trim();
    if (!text) return;
    if (seen.has(text)) return;
    seen.add(text);
    candidates.push(text);
  };

  if (scrapeData) {
    if (scrapeType === "movie") {
      pushCandidate(scrapeData.title || "");
      if (scrapeData.title && scrapeData.releaseDate) {
        pushCandidate(`${scrapeData.title}.${String(scrapeData.releaseDate).slice(0, 4)}`);
      }
    } else if (matchedMapping) {
      const title = scrapeData.title || "";
      const seasonAirYear = scrapeData.seasonAirYear || "";
      const seasonNumber = matchedMapping.seasonNumber || 1;
      const episodeNum = matchedMapping.episodeNumber || 1;
      pushCandidate(`${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`);
      pushCandidate(`${title}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`);
      if (matchedMapping.episodeName) {
        pushCandidate(`${title}.${matchedMapping.episodeName}`);
      }
    }
  }

  if (fallbackDanmakuFileName) {
    pushCandidate(decodeURIComponent(fallbackDanmakuFileName));
  }

  return candidates;
}

async function matchDanmakuByCandidates(candidates = []) {
  for (const fileName of candidates) {
    try {
      const danmakuList = await OmniBox.getDanmakuByFileName(fileName);
      if (Array.isArray(danmakuList) && danmakuList.length > 0) {
        await OmniBox.log("info", `[danmaku] matched ${fileName}, count=${danmakuList.length}`);
        return danmakuList;
      }
    } catch (error) {
      await OmniBox.log("warn", `[danmaku] candidate fail ${fileName}: ${error.message}`);
    }
  }
  return [];
}

// ==================== OmniBox handlers ====================
// ==================== 蜗牛4K 登录 ====================

function getWoniuBaseUrl() {
  return removeTrailingSlash(WONIU4K_SITES[0] || "");
}

function resolveSiteUrl(value, baseUrl) {
  if (!value) return "";
  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return "";
  }
}

async function login(params) {
  const username = String(params?.username || WONIU4K_USERNAME || "").trim();
  const password = String(params?.password || WONIU4K_PASSWORD || "").trim();
  const captchaCode = String(params?.captcha || params?.verify || "").trim();
  const baseUrl = getWoniuBaseUrl();

  if (!baseUrl) return { code: -1, msg: "蜗牛4K 站点未配置" };
  if (!username || !password) {
    await OmniBox.log("warn", "[woniu4k] 登录失败: 请设置 WONIU4K_USERNAME / WONIU4K_PASSWORD");
    return { code: -1, msg: "用户名或密码未配置" };
  }

  try {
    const loginPage = await httpRequest(`${baseUrl}/user/login/`, { timeout: 15000 });
    const $ = cheerio.load(loginPage.body || "");
    const hasVerify = $("#verify").length > 0 || $("#verify_img").length > 0;
    if (hasVerify && !captchaCode) {
      const verifyUrl = resolveSiteUrl($("#verify_img").attr("src") || "", baseUrl);
      return { code: -2, msg: "需要验证码", verifyUrl, verifyImg: verifyUrl };
    }

    const formData = new URLSearchParams();
    formData.append("user_name", username);
    formData.append("user_pwd", password);
    if (captchaCode) formData.append("verify", captchaCode);

    const response = await httpRequest(`${baseUrl}/user/login.html`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${baseUrl}/user/login/`,
      },
      body: formData.toString(),
      timeout: 15000,
    });

    try {
      return JSON.parse(response.body || "{}");
    } catch {
      return { code: 0, msg: "登录响应解析失败" };
    }
  } catch (error) {
    await OmniBox.log("error", `[woniu4k] 登录异常: ${error.message}`);
    return { code: -1, msg: error.message };
  }
}

async function logout() {
  const baseUrl = getWoniuBaseUrl();
  if (!baseUrl) return { code: -1, msg: "蜗牛4K 站点未配置" };
  try {
    await httpRequest(`${baseUrl}/user/logout.html`, { timeout: 10000 });
    clearCookies();
    return { code: 1, msg: "已退出" };
  } catch (error) {
    clearCookies();
    return { code: -1, msg: error.message };
  }
}

async function getLoginStatus() {
  const baseUrl = getWoniuBaseUrl();
  if (!baseUrl) return { loggedIn: false, username: "" };
  try {
    const response = await httpRequest(`${baseUrl}/user/index.html`, { timeout: 10000 });
    const $ = cheerio.load(response.body || "");
    const selector = ".user-name, .user-info-name, .header-user-name";
    const loggedIn = response.body.includes("退出登录") || $(selector).length > 0;
    const username = loggedIn ? ($(selector).first().text().trim() || "已登录") : "";
    return { loggedIn, username };
  } catch {
    return { loggedIn: false, username: "" };
  }
}

// ==================== 接口函数 ====================

async function home(params, context) {
  try {
    await OmniBox.log("info", `[home] start, sites=${SITES.length}`);

    const classList = SITES.map((site) => ({ type_id: `site_${site.id}`, type_name: site.name }));

    const filters = {};
    const filterResults = await Promise.all(
      SITES.map(async (site) => ({ siteId: site.id, filters: buildSiteFilters(site, await fetchExternalFilterConfig(site)) }))
    );
    for (const item of filterResults) {
      filters[`site_${item.siteId}`] = item.filters;
    }

    const recommendResults = await Promise.all(
      SITES.slice(0, 3).map(async (site) => {
        try {
          const firstCategory = Object.keys(site.defaultCategories)[0] || "1";
          const result = await fetchSiteCategoryList(site, firstCategory, 1);
          return result.list.slice(0, 4);
        } catch (error) {
          await OmniBox.log("warn", `[home] recommend fail ${site.name}: ${error.message}`);
          return [];
        }
      })
    );

    const recommendList = recommendResults.flat().slice(0, 12);
    await OmniBox.log("info", `[home] class=${classList.length}, recommend=${recommendList.length}`);
    return { class: classList, list: recommendList, filters };
  } catch (error) {
    await OmniBox.log("error", `[home] ${error.message}`);
    return { class: [], list: [], filters: {} };
  }
}

async function category(params, context) {
  try {
    const typeId = params.categoryId || "";
    const page = parseInt(params.page || "1", 10);
    const filters = params.filters || {};
    await OmniBox.log("info", `[category] typeId=${typeId}, page=${page}, filters=${JSON.stringify(filters)}`);

    if (!typeId.startsWith("site_")) {
      return { list: [], page: 1, pagecount: 0, total: 0 };
    }

    const siteId = typeId.replace("site_", "");
    const site = SITES.find((s) => s.id === siteId);
    if (!site) {
      return { list: [], page: 1, pagecount: 0, total: 0 };
    }

    const externalFilterConfig = await fetchExternalFilterConfig(site);
    const siteFilters = buildSiteFilters(site, externalFilterConfig);

    let categoryId = filters.categoryId || "";
    const categories = Object.keys(site.defaultCategories);
    if (!categoryId && categories.length > 0) {
      categoryId = categories[0];
      await OmniBox.log("info", `[category] default categoryId=${categoryId}`);
    }
    if (!categoryId) {
      return { list: [], page: 1, pagecount: 0, total: 0, filters: siteFilters };
    }

    const categoryFilters = { ...filters };
    delete categoryFilters.categoryId;
    const result = await fetchSiteCategoryList(site, categoryId, page, categoryFilters);
    const pagecount = result.totalPages || Math.ceil(result.total / PAGE_SIZE) || 1;
    await OmniBox.log("info", `[category] return page=${page}, pagecount=${pagecount}, total=${result.total}`);
    return { list: result.list, page, pagecount, total: result.total, filters: siteFilters };
  } catch (error) {
    await OmniBox.log("error", `[category] ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0 };
  }
}

async function detail(params, context) {
  try {
    const videoId = params.videoId || "";
    const drives = context?.drives || [];
    await OmniBox.log("info", `[detail] videoId=${videoId}`);
    if (!videoId) return { list: [] };
    const data = String(videoId).startsWith(MERGE_PREFIX)
      ? await handleMergedDetail(videoId, drives, context)
      : await handleSiteDetail(videoId, drives, context);
    return { list: data ? [data] : [] };
  } catch (error) {
    await OmniBox.log("error", `[detail] ${error.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = params.keyword || "";
    const page = parseInt(params.page || "1", 10);
    await OmniBox.log("info", `[search] keyword=${keyword}, page=${page}`);
    if (!keyword) return { list: [], page: 1, pagecount: 0, total: 0 };

    const resultsArrays = await Promise.all(
      SITES.map((site) => fetchSiteSearch(site, keyword, page, { budgetMs: SEARCH_TIMEOUT_BUDGET_MS }))
    );
    const allResults = mergeSearchResults(resultsArrays);
    await OmniBox.log("info", `[search] mergedTotal=${allResults.length}`);
    return { list: allResults, page, pagecount: 1, total: allResults.length };
  } catch (error) {
    await OmniBox.log("error", `[search] ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0 };
  }
}

async function play(params, context) {
  try {
    const playId = params.playId || "";
    const flag = params.flag || "";
    const from = context?.from || "web";
    const drives = context?.drives || [];
    await OmniBox.log("info", `[play] flag=${flag}, playId=${playId}`);

    if (!playId) return { urls: [], header: {}, danmaku: [] };

    if (playId.startsWith("link://")) {
      const baseId = playId.split("?")[0];
      const match = baseId.match(/^link:\/\/([^/]+)\/(.+)$/);
      if (match) {
        const [, driveKey, encodedUrl] = match;
        const url = decodeURIComponent(encodedUrl);
        const drive = drives.find((o) => o.key === driveKey);
        if (drive) {
          try {
            return await drive.play(url, flag);
          } catch (error) {
            return { error: `播放失败: ${error.message}` };
          }
        }
      }
    }

    const parts = playId.split("|");
    if (parts.length < 2) return { urls: [], header: {}, danmaku: [] };

    const shareURL = parts[0];
    const fileId = parts[1];
    const rawScrapeKey = parts[2] || "";
    const fallbackDanmakuFileName = parts[3] ? decodeURIComponent(parts[3]) : "";
    const scrapeKey = rawScrapeKey ? `${rawScrapeKey.split("@@")[0]}@@${encodeURIComponent(shareURL)}` : "";
    
    let routeType = from === "web" ? "服务端代理" : "直连";
    if (flag.includes("-")) {
      const flagParts = flag.split("-");
      routeType = flagParts[flagParts.length - 1];
    }
    await OmniBox.log("info", `[play] 使用线路: ${routeType}`);

    // ==================== 并行处理：主链路(播放地址) + 辅链路(刮削元数据/弹幕) ====================
    const playInfoPromise = OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);
    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: null,
        episodeName: params.episodeName || "",
      };

      if (!scrapeKey) return result;

      try {
        const metadata = await OmniBox.getScrapeMetadata(scrapeKey);
        if (!metadata || !metadata.scrapeData || !Array.isArray(metadata.videoMappings)) {
          await OmniBox.log("warn", `[play] 未获取到有效的刮削元数据`);
          return result;
        }

        const formattedFileId = `${shareURL}|${fileId}|${scrapeKey}`;
        const matchedMapping = metadata.videoMappings.find((mapping) => mapping && mapping.fileId === formattedFileId);
        if (!matchedMapping) {
          await OmniBox.log("warn", `[play] 未找到文件映射: ${formattedFileId}`);
          return result;
        }

        const scrapeData = metadata.scrapeData;
        result.scrapeTitle = scrapeData.title || "";
        if (scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
        }

        if (matchedMapping.episodeNumber) {
          result.episodeNumber = matchedMapping.episodeNumber;
        }
        if (matchedMapping.episodeName && !result.episodeName) {
          result.episodeName = matchedMapping.episodeName;
        }

        // 生成 fileName 用于弹幕匹配（参考木偶.js）
        let fileName = "";
        const scrapeType = metadata.scrapeType || "";
        if (scrapeType === "movie") {
          fileName = scrapeData.title || "";
        } else {
          const title = scrapeData.title || "";
          const seasonAirYear = scrapeData.seasonAirYear || "";
          const seasonNumber = matchedMapping.seasonNumber || 1;
          const episodeNum = matchedMapping.episodeNumber || 1;
          fileName = `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
        }

        if (fileName) {
          await OmniBox.log("info", `[play] 生成fileName用于弹幕匹配: ${fileName}`);
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
          if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
            result.danmakuList = matchedDanmaku;
            await OmniBox.log("info", `[play] 弹幕匹配成功,找到 ${matchedDanmaku.length} 条弹幕`);
          }
        }
      } catch (error) {
        await OmniBox.log("warn", `[play] 弹幕匹配失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);

    if (playInfoResult.status !== "fulfilled") {
      throw new Error(playInfoResult.reason && playInfoResult.reason.message ? playInfoResult.reason.message : "无法获取播放地址");
    }

    const playInfo = playInfoResult.value;
    if (!playInfo || !playInfo.url || !Array.isArray(playInfo.url) || playInfo.url.length === 0) {
      throw new Error("无法获取播放地址");
    }

    let danmakuList = [];
    let scrapeTitle = "";
    let scrapePic = "";
    let episodeNumber = null;
    let episodeName = params.episodeName || "";

    if (metadataResult.status === "fulfilled" && metadataResult.value) {
      danmakuList = metadataResult.value.danmakuList || [];
      scrapeTitle = metadataResult.value.scrapeTitle || "";
      scrapePic = metadataResult.value.scrapePic || "";
      episodeNumber = metadataResult.value.episodeNumber || null;
      episodeName = metadataResult.value.episodeName || episodeName;
    } else if (metadataResult.status === "rejected") {
      await OmniBox.log("warn", `[play] 获取元数据失败(不影响播放): ${metadataResult.reason && metadataResult.reason.message ? metadataResult.reason.message : metadataResult.reason}`);
    }

    // ==================== 添加观看记录（参考木偶.js）====================
    try {
      const sourceId = context.sourceId;
      if (sourceId) {
        const dedupeKey = `${sourceId}|${playId}`;
        const now = Date.now();
        const lastAdded = playHistoryDedupeCache.get(dedupeKey);
        if (lastAdded && now - lastAdded < 2000) {
          await OmniBox.log("info", `[play] 跳过重复观看记录: ${dedupeKey}`);
        } else {
          playHistoryDedupeCache.set(dedupeKey, now);
          const title = params.title || scrapeTitle || shareURL;
          const pic = params.pic || scrapePic || "";

          OmniBox.addPlayHistory({
            vodId: scrapeKey,
            title: title,
            pic: pic,
            episode: playId,
            sourceId: sourceId,
            episodeNumber: episodeNumber,
            episodeName: episodeName,
          })
            .then((added) => {
              if (added) {
                OmniBox.log("info", `[play] 已添加观看记录: ${title}`);
              } else {
                OmniBox.log("info", `[play] 观看记录已存在,跳过添加: ${title}`);
              }
            })
            .catch((error) => {
              OmniBox.log("warn", `[play] 添加观看记录失败: ${error.message}`);
            });
        }
      }
    } catch (error) {
      await OmniBox.log("warn", `[play] 添加观看记录失败: ${error.message}`);
    }

    const urls = playInfo.url.map((item) => ({ name: item.name || "播放", url: item.url }));
    const header = playInfo.header || {};
    const finalDanmakuList = danmakuList.length > 0 ? danmakuList : playInfo.danmaku || [];

    await OmniBox.log("info", `[play] urls=${urls.length}, danmaku=${finalDanmakuList.length}, scrape=${ENABLE_SCRAPE ? "on" : "off"}`);
    return {
      urls,
      header: header,
      parse: 0,
      danmaku: finalDanmakuList};
  } catch (error) {
    await OmniBox.log("error", `[play] ${error.message}`);
    return { urls: [], header: {}, danmaku: [] };
  }
}

});

_load(4, "玩偶聚合", function (module, exports, require) {
// @name 玩偶聚合
// @author @lucky_TJQ
// @description 聚合玩偶、木偶、蜡笔、闪电、至臻、二小、虎斑、快映、欧哥、多多、蜗牛4K等网盘站点；支持刮削、弹幕、多线路、二级分类筛选、翻页、网盘排序
// @dependencies axios,cheerio
// @version 1.2.5
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/网盘/玩偶聚合.js

const OmniBox = require("omnibox_sdk");
const cheerio = require("cheerio");
const axios = require("axios");
const https = require("https");
const runner = require("spider_runner");

// 先导出再交给 runner
module.exports = {
  home,
  category,
  search,
  detail,
  play,
  login,
  logout,
  getLoginStatus,
  setCookies: setCookiesFromString,
};
runner.run(module.exports);

// ==================== 配置区域 ====================
const FILTER_CONFIG_BASE_URL = "https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/%E9%85%8D%E7%BD%AE/%E7%AD%9B%E9%80%89";

// 网盘线路优先级（从高到低）
const LINE_ORDER = ["baidu", "a139", "a189", "a123", "a115", "quark", "xunlei", "ali", "uc"];

// 详情页播放线路显示排序（参考木偶，可由环境变量覆盖）
const DRIVE_ORDER = (process.env.DRIVE_ORDER || "baidu;a139;a189;a123;a115;quark;xunlei;ali;uc")
  .split(";")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// 播放线路名称（可由环境变量覆盖）
const SOURCE_NAMES_CONFIG = (process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

// 多线路网盘类型（可由环境变量覆盖，仅这些类型生成多条播放线路）
const DRIVE_TYPE_CONFIG = (process.env.DRIVE_TYPE_CONFIG || "quark;uc")
  .split(";")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// 刮削开关（默认开启，设置环境变量 ENABLE_SCRAPE=0 关闭）
const ENABLE_SCRAPE = process.env.ENABLE_SCRAPE !== "0";

// 详情链路缓存时间（秒），默认 12 小时
const WANOU_CACHE_EX_SECONDS = Number(process.env.WANOU_CACHE_EX_SECONDS || 43200);

const PAGE_SIZE = 20;
const REQUEST_TIMEOUT = 15000;
// 蜗牛网盘 API 请求限流（毫秒），避免触发风控
const WONIU4K_DRIVE_API_DELAY_MS = Math.max(0, parseInt(process.env.WONIU4K_DRIVE_DELAY || "1500", 10));
const WONIU4K_USERNAME = String(process.env.WONIU4K_USERNAME || process.env.WONIU4K_USER || "").trim();
const WONIU4K_PASSWORD = String(process.env.WONIU4K_PASSWORD || process.env.WONIU4K_PASS || "").trim();
const WONIU4K_COOKIE = String(process.env.WONIU4K_COOKIE || process.env.WONIU4K_COOKIES || "").trim();

// ==================== 站点域名配置 ====================
const WOGG_SITES = splitSites(process.env.WEB_SITE_WOGG || "https://wogg.xxooo.cf;https://wogg.333232.xyz;https://www.wogg.net;");
const MUOU_SITES = splitSites(process.env.WEB_SITE_MUOU || "https://www.muou.site;https://www.muou.asia;https://666.666291.xyz;");
const LABI_SITES = splitSites(process.env.WEB_SITE_LABI || "http://fmao.shop;");
const ZHIZHEN_SITES = splitSites(process.env.WEB_SITE_ZHIZHEN || "http://www.miqk.cc;https://www.mihdr.top;https://mihdr.top;");
const ERXIAO_SITES = splitSites(process.env.WEB_SITE_ERXIAO || "https://www.2xiaopan.top;https://www.erixaopan.fun;https://2xiaopan.top;https://www.wexwp.cc;");
const HUBAN_SITES = splitSites(process.env.WEB_SITE_HUBAN || "http://38.76.197.172:16969;http://154.222.27.33:20720;http://xhban.xyz:20720;http://103.45.162.207:20720;");
const KUAIYING_SITES = splitSites(process.env.WEB_SITE_XIAOBAN || " http://38.76.197.172:12521;http://154.201.83.50:12512;http://xsayang.fun:12512;");
const SHANDIAN_SITES = splitSites(process.env.WEB_SITE_SHANDIAN || "https://sd.sduc.site;");
const OUGE_SITES = splitSites(process.env.WEB_SITE_OUGE || "https://woog.nxog.eu.org;");
const DUODUO_SITES = splitSites(process.env.WEB_SITE_DUODUO || "https://tv.yydsys.top;https://tv.214521.xyz;https://tv.yydsys.cc;https://yydsys.de5.net;https://duo.hidns.vip;");
const WONIU4K_SITES = splitSites(process.env.WEB_SITE_WONIU4K || "https://zmi.kdns.fr;");

const SITES = [];

pushSiteIfAny({
  id: "wanou",
  name: "玩偶",
  filterFiles: ["wogg.json"],
  domains: WOGG_SITES,
  listSelector: ".module-item",
  detailPanSelector: ".module-row-info p",
  categoryUrl: "/vodshow/{categoryId}--------{page}---.html",
  categoryUrlWithFilters: "/vodshow/{categoryId}-{area}-{by}-{class}-----{page}---{year}.html",
  searchUrl: "/vodsearch/-------------.html?wd={keyword}&page={page}",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "音乐", "6": "短剧", "44": "臻彩", "46": "纪录片" },
});

pushSiteIfAny({
  id: "muou",
  name: "木偶",
  filterFiles: ["mogg.json"],
  domains: MUOU_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "纪录片", "25": "臻选", "29": "综艺", "30": "原盘" },
});

pushSiteIfAny({
  id: "labi",
  name: "蜡笔",
  filterFiles: ["labi.json"],
  domains: LABI_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "24": "蜡笔4K", "29": "臻彩" },
});

pushSiteIfAny({
  id: "zhizhen",
  name: "至臻",
  filterFiles: ["zhizhen.json"],
  domains: ZHIZHEN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "24": "老剧", "44": "臻彩" },
});

pushSiteIfAny({
  id: "erxiao",
  name: "二小",
  filterFiles: ["erxiao.json"],
  domains: ERXIAO_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "臻彩", "21": "综艺" },
});

pushSiteIfAny({
  id: "huban",
  name: "虎斑",
  filterFiles: ["huban.json"],
  domains: HUBAN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "5": "短剧", "6": "臻彩", "30": "115网盘" },
});

pushSiteIfAny({
  id: "kuaiying",
  name: "快映",
  filterFiles: ["xiaoban.json"],
  domains: KUAIYING_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "5": "臻彩", "6": "短剧", "30": "115", "35": "123", "36": "天移迅" },
});

pushSiteIfAny({
  id: "shandian",
  name: "闪电",
  filterFiles: ["shandian.json"],
  domains: SHANDIAN_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "综艺", "4": "动漫", "30": "短剧" },
});

pushSiteIfAny({
  id: "ouge",
  name: "欧哥",
  filterFiles: ["ouge.json"],
  domains: OUGE_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "电影", "2": "电视剧", "3": "动漫", "4": "综艺", "5": "短剧", "21": "综合" },
});

pushSiteIfAny({
  id: "duoduo",
  name: "多多",
  filterFiles: ["duoduo.json"],
  domains: DUODUO_SITES,
  listSelector: "#main .module-item",
  detailPanSelector: ".module-row-info p",
  searchListSelector: ".module-search-item",
  defaultCategories: { "1": "多多电影", "2": "多多剧集", "3": "综艺", "4": "动漫", "5": "短剧", "20": "记录" },
});

// 蜗牛4K：MacCMS mxone 伪静态，主推 115（含 115cdn/anxia）
pushSiteIfAny({
  id: "woniu4k",
  name: "蜗牛4K",
  filterFiles: [],
  domains: WONIU4K_SITES,
  listSelector: ".module-item,a.video-card",
  detailPanSelector: ".module-row-info",
  categoryUrl: "/vodtype/{categoryId}/",
  categoryUrlPage: "/vodtype/{categoryId}-{page}/",
  searchUrl: "/vodsearch/{keyword}-------------/",
  searchUrlPage: "/vodsearch/{keyword}----------{page}---/",
  searchListSelector: ".module-search-item,.module-item,a.video-card",
  panExtractMode: "mxone",
  defaultCategories: { "1": "电影", "2": "连续剧", "3": "综艺", "4": "动漫" },
});

if (SITES.length === 0) {
  throw new Error("至少需要一个站点配置，请检查环境变量配置");
}

for (const site of SITES) {
  OmniBox.log("info", `[init] 站点 ${site.name} 域名数=${site.domains.length}`);
}

const INSECURE_HTTPS_AGENT = new https.Agent({ rejectUnauthorized: false });

// 仅保存蜗牛站点会话，避免聚合内其他站点互相污染 Cookie。
let cookieStore = {};

function getHostname(value = "") {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return String(value || "").trim().toLowerCase();
  }
}

function isWoniuURL(url = "") {
  const hostname = getHostname(url);
  return Boolean(hostname) && WONIU4K_SITES.some((siteUrl) => getHostname(siteUrl) === hostname);
}

function setCookiesFromHeaders(setCookieHeaders, baseUrl) {
  if (!isWoniuURL(baseUrl) || !setCookieHeaders || (!Array.isArray(setCookieHeaders) && typeof setCookieHeaders !== "string")) return;
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  const domain = getHostname(baseUrl);
  if (!cookieStore[domain]) cookieStore[domain] = {};
  for (const raw of list) {
    const pair = String(raw).split(";")[0];
    const index = pair.indexOf("=");
    if (index < 0) continue;
    const key = pair.substring(0, index).trim();
    const value = pair.substring(index + 1).trim();
    if (key) cookieStore[domain][key] = value;
  }
}

function setCookiesFromString(cookieString, domain) {
  if (!cookieString) return;
  const domains = domain ? [getHostname(domain)] : WONIU4K_SITES.map(getHostname).filter(Boolean);
  for (const targetDomain of domains) {
    if (!cookieStore[targetDomain]) cookieStore[targetDomain] = {};
    for (const part of String(cookieString).split(/[;,]/)) {
      const index = part.indexOf("=");
      if (index < 0) continue;
      const key = part.substring(0, index).trim();
      const value = part.substring(index + 1).trim();
      if (key) cookieStore[targetDomain][key] = value;
    }
  }
}

function getCookieHeader(url) {
  if (!isWoniuURL(url)) return "";
  const cookies = cookieStore[getHostname(url)];
  if (!cookies) return "";
  return Object.entries(cookies)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function clearCookies() {
  cookieStore = {};
}

if (WONIU4K_COOKIE) {
  setCookiesFromString(WONIU4K_COOKIE);
  OmniBox.log("info", "[woniu4k] 已从 WONIU4K_COOKIE 加载 Cookie");
}

// ==================== 缓存 ====================
const driveParseCache = new Map();
const siteFilterCache = new Map();
const playHistoryDedupeCache = new Map();
const CACHE_TTL = { drive: 60 * 60 * 1000, filter: 6 * 60 * 1000 };

function buildCacheKey(prefix, value) {
  return `${prefix}:${value}`;
}

async function getCachedJSON(key) {
  try {
    return await OmniBox.getCache(key);
  } catch (error) {
    await OmniBox.log("warn", `[cache] 读取缓存失败: key=${key}, err=${error.message}`);
    return null;
  }
}

async function setCachedJSON(key, value, exSeconds) {
  try {
    await OmniBox.setCache(key, value, exSeconds);
  } catch (error) {
    await OmniBox.log("warn", `[cache] 写入缓存失败: key=${key}, err=${error.message}`);
  }
}

async function getDriveInfoCached(shareURL) {
  const cacheKey = buildCacheKey("wanou:driveInfo", shareURL);
  let driveInfo = await getCachedJSON(cacheKey);
  if (!driveInfo) {
    driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
    await setCachedJSON(cacheKey, driveInfo, WANOU_CACHE_EX_SECONDS);
  }
  return driveInfo;
}

async function getRootFileListCached(shareURL) {
  const cacheKey = buildCacheKey("wanou:rootFiles", shareURL);
  let fileList = await getCachedJSON(cacheKey);
  if (!fileList) {
    fileList = await OmniBox.getDriveFileList(shareURL, "0");
    if (Array.isArray(fileList?.files) && fileList.files.length > 0) {
      await setCachedJSON(cacheKey, fileList, WANOU_CACHE_EX_SECONDS);
    }
  }
  return fileList;
}

async function getAllVideoFilesCached(shareURL, rootFiles) {
  const cacheKey = buildCacheKey("wanou:videoFiles", shareURL);
  let allVideoFiles = await getCachedJSON(cacheKey);
  if (!Array.isArray(allVideoFiles) || allVideoFiles.length === 0) {
    allVideoFiles = await getAllVideoFiles(shareURL, rootFiles);
    if (Array.isArray(allVideoFiles) && allVideoFiles.length > 0) {
      await setCachedJSON(cacheKey, allVideoFiles, WANOU_CACHE_EX_SECONDS);
    }
  }
  return allVideoFiles;
}

function splitSites(raw) {
  return String(raw || "")
    .split(";")
    .map((url) => url.trim())
    .filter(Boolean);
}

function pushSiteIfAny(site) {
  if (Array.isArray(site.domains) && site.domains.length > 0) {
    SITES.push(site);
  }
}

// ==================== 网络请求 ====================
async function httpRequest(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = {
    Accept: "*/*",
    ...(options.headers || {}),
  };
  const cookieHeader = getCookieHeader(url);
  if (cookieHeader) headers.Cookie = cookieHeader;

  const response = await axios({
    url,
    method,
    headers,
    data: options.body,
    timeout: options.timeout || REQUEST_TIMEOUT,
    httpsAgent: INSECURE_HTTPS_AGENT,
    validateStatus: () => true,
  });

  const setCookie = response.headers?.["set-cookie"];
  if (setCookie) setCookiesFromHeaders(setCookie, url);

  let body = response.data;
  if (typeof body !== "string") {
    body = body == null ? "" : JSON.stringify(body);
  }

  return {
    statusCode: response.status,
    body,
    headers: response.headers || {},
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBlockedHtml(body = "") {
  const lower = String(body || "").toLowerCase();
  return lower.includes("just a moment") || lower.includes("cf-browser-verification") || lower.includes("captcha") || lower.includes("访问验证");
}

function removeTrailingSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

async function requestWithFailover(domains, path, options = {}) {
  let lastError = null;
  const perDomainTimeout = Math.max(1000, Math.floor(30000 / Math.max(1, domains.length)));

  for (let i = 0; i < domains.length; i++) {
    const baseUrl = removeTrailingSlash(domains[i]);
    const fullUrl = path.startsWith("http") ? path : baseUrl + path;

    try {
      await OmniBox.log("info", `[request] try ${i + 1}/${domains.length} ${fullUrl}`);
      const response = await httpRequest(fullUrl, {
        ...options,
        method: options.method || "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...(options.headers || {}),
        },
        timeout: options.timeout ?? perDomainTimeout,
      });

      if (response.statusCode === 200 && response.body) {
        if (isBlockedHtml(response.body)) {
          await OmniBox.log("warn", `[request] blocked by ${baseUrl}`);
          lastError = new Error("命中风控页面");
          continue;
        }
        await OmniBox.log("info", `[request] success ${baseUrl}`);
        return { response, baseUrl };
      }

      await OmniBox.log("warn", `[request] non-200 ${response.statusCode} @ ${baseUrl}`);
      lastError = new Error(`HTTP ${response.statusCode}`);
    } catch (error) {
      await OmniBox.log("warn", `[request] fail ${baseUrl}: ${error.message}`);
      lastError = error;
    }
  }

  throw lastError || new Error("所有域名请求均失败");
}

// ==================== 通用辅助 ====================
function formatFileSize(size) {
  if (!size || size <= 0) return "";
  const unit = 1024;
  const units = ["B", "K", "M", "G", "T", "P"];
  if (size < unit) return `${size}B`;
  let exp = 0;
  let n = size;
  while (n >= unit && exp < units.length - 1) {
    n /= unit;
    exp++;
  }
  return Number.isInteger(n) ? `${n}${units[exp]}` : `${n.toFixed(2)}${units[exp]}`;
}

function isVideoFile(file) {
  if (!file || !file.file_name) return false;
  const fileName = String(file.file_name).toLowerCase();
  const exts = [".mp4", ".mkv", ".avi", ".flv", ".mov", ".wmv", ".m3u8", ".ts", ".webm", ".m4v"];
  if (exts.some((ext) => fileName.endsWith(ext))) return true;
  const formatType = String(file.format_type || "").toLowerCase();
  return formatType.includes("video") || formatType.includes("mpeg") || formatType.includes("h264");
}

async function getAllVideoFiles(shareURL, files, errors = []) {
  if (!Array.isArray(files)) return [];
  const tasks = files.map(async (file) => {
    if (file.file && isVideoFile(file)) return [file];
    if (file.dir) {
      try {
        const subFileList = await OmniBox.getDriveFileList(shareURL, file.fid);
        if (Array.isArray(subFileList?.files)) {
          return await getAllVideoFiles(shareURL, subFileList.files, errors);
        }
      } catch (error) {
        errors.push({ path: file.name || file.fid, fid: file.fid, message: error.message, timestamp: new Date().toISOString() });
      }
    }
    return [];
  });
  const results = await Promise.all(tasks);
  return results.flat();
}

// ==================== 筛选器 ====================
function normalizeFilterOption(option) {
  if (!option || typeof option !== "object") return null;
  const name = option.n ?? option.name;
  const value = option.v ?? option.value;
  if (name === undefined || value === undefined) return null;
  return { name: String(name), value: String(value) };
}

function normalizeFilterGroup(group) {
  if (!group || typeof group !== "object" || !group.key) return null;
  const rawValues = Array.isArray(group.value) ? group.value : [];
  const values = rawValues.map(normalizeFilterOption).filter(Boolean);
  if (values.length === 0) return null;
  return {
    key: String(group.key),
    name: String(group.name || group.key),
    init: group.init !== undefined ? String(group.init) : "",
    value: values,
  };
}

function normalizeFilterConfigByCategory(config) {
  if (!config || typeof config !== "object") return null;
  const normalized = {};
  for (const [categoryId, groups] of Object.entries(config)) {
    if (!Array.isArray(groups)) continue;
    const normalizedGroups = groups.map(normalizeFilterGroup).filter(Boolean);
    if (normalizedGroups.length > 0) normalized[categoryId] = normalizedGroups;
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function mergeFilterGroups(groups) {
  const mergedMap = new Map();
  for (const group of groups) {
    const normalized = normalizeFilterGroup(group);
    if (!normalized || normalized.key === "categoryId") continue;
    if (!mergedMap.has(normalized.key)) {
      mergedMap.set(normalized.key, { key: normalized.key, name: normalized.name, init: normalized.init, valueMap: new Map() });
    }
    const bucket = mergedMap.get(normalized.key);
    for (const item of normalized.value) {
      if (!bucket.valueMap.has(item.value)) {
        bucket.valueMap.set(item.value, item.name);
      }
    }
  }

  return Array.from(mergedMap.values()).map((group) => {
    const values = Array.from(group.valueMap.entries()).map(([value, name]) => ({ name, value }));
    if (!values.some((item) => item.value === "") && values.length > 0) {
      values.unshift({ name: "全部", value: "" });
    }
    return {
      key: group.key,
      name: group.name,
      init: group.init || (values[0]?.value ?? ""),
      value: values,
    };
  });
}

function buildCategoryFilterGroup(site) {
  const categories = Object.entries(site.defaultCategories || {});
  return {
    key: "categoryId",
    name: "分类",
    init: categories[0]?.[0] || "",
    value: [{ name: "全部", value: "" }, ...categories.map(([id, name]) => ({ name, value: id }))],
  };
}

function buildSiteFilters(site, externalFilterConfig) {
  const categoryFilter = buildCategoryFilterGroup(site);
  if (!externalFilterConfig || typeof externalFilterConfig !== "object" || Object.keys(externalFilterConfig).length === 0) {
    return [categoryFilter];
  }
  const allGroups = [];
  for (const groups of Object.values(externalFilterConfig)) {
    if (Array.isArray(groups)) allGroups.push(...groups);
  }
  return [categoryFilter, ...mergeFilterGroups(allGroups)];
}

async function fetchExternalFilterConfig(site) {
  const cache = siteFilterCache.get(site.id);
  if (cache && Date.now() - cache.time < CACHE_TTL.filter) return cache.data;

  const files = Array.isArray(site.filterFiles) ? site.filterFiles : [];
  if (files.length === 0) {
    siteFilterCache.set(site.id, { data: null, time: Date.now() });
    return null;
  }

  for (const file of files) {
    const url = `${FILTER_CONFIG_BASE_URL}/${file}`;
    try {
      const response = await httpRequest(url, { timeout: 10000 });
      if (response.statusCode !== 200 || !response.body) continue;
      const parsed = JSON.parse(response.body);
      const normalizedConfig = normalizeFilterConfigByCategory(parsed);
      siteFilterCache.set(site.id, { data: normalizedConfig, time: Date.now() });
      await OmniBox.log("info", `[filter] ${site.name} loaded ${file}`);
      return normalizedConfig;
    } catch (error) {
      await OmniBox.log("warn", `[filter] ${site.name} load fail ${file}: ${error.message}`);
    }
  }

  siteFilterCache.set(site.id, { data: null, time: Date.now() });
  return null;
}

function encodeFilterSegment(value) {
  return encodeURIComponent(String(value ?? "").trim());
}

function hasSecondaryFilters(filters = {}) {
  return Object.keys(filters).some((key) => key !== "categoryId" && filters[key] !== undefined && filters[key] !== null && filters[key] !== "");
}

function buildCategoryUrl(site, categoryId, page = 1, filters = {}) {
  const safeFilters = filters || {};
  const byValue = safeFilters.by || safeFilters.sort || "";
  const pg = Math.max(1, parseInt(page || "1", 10) || 1);

  if (hasSecondaryFilters(safeFilters)) {
    if (site.categoryUrlWithFilters) {
      let url = site.categoryUrlWithFilters;
      const replacements = {
        categoryId: categoryId || "",
        page: pg,
        class: encodeFilterSegment(safeFilters.class),
        area: encodeFilterSegment(safeFilters.area),
        year: encodeFilterSegment(safeFilters.year),
        by: encodeFilterSegment(byValue),
        letter: encodeFilterSegment(safeFilters.letter),
      };
      for (const [key, value] of Object.entries(replacements)) {
        url = url.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
      }
      return url;
    }

    const segments = [];
    for (const [key, rawValue] of Object.entries(safeFilters)) {
      if (key === "categoryId" || rawValue == null || rawValue === "") continue;
      const mappedKey = key === "sort" ? "by" : key;
      segments.push(`/${mappedKey}/${encodeFilterSegment(rawValue)}`);
    }
    return `/index.php/vod/show/id/${categoryId}${segments.join("")}/page/${pg}.html`;
  }

  // mxone 伪静态：第 1 页 /vodtype/1/，后续 /vodtype/1-2/
  if (site.categoryUrlPage && pg > 1) {
    return site.categoryUrlPage
      .replace(/\{categoryId\}/g, categoryId)
      .replace(/\{page\}/g, String(pg));
  }

  if (site.categoryUrl) {
    return site.categoryUrl
      .replace(/\{categoryId\}/g, categoryId)
      .replace(/\{page\}/g, String(pg));
  }

  return `/index.php/vod/show/id/${categoryId}/page/${pg}.html`;
}

function buildSearchUrl(site, keyword, page = 1) {
  const enc = encodeURIComponent(String(keyword || "").trim());
  const pg = Math.max(1, parseInt(page || "1", 10) || 1);

  if (site.searchUrlPage && pg > 1) {
    return site.searchUrlPage
      .replace(/\{keyword\}/g, enc)
      .replace(/\{page\}/g, String(pg));
  }

  if (site.searchUrl) {
    return site.searchUrl
      .replace(/\{keyword\}/g, enc)
      .replace(/\{page\}/g, String(pg));
  }

  return `/index.php/vod/search/page/${pg}/wd/${enc}.html`;
}

function normalizeShareUrl(url) {
  let u = String(url || "").trim().replace(/&amp;/g, "&");
  if (!u) return "";
  u = u.replace(/^https?:\/\/(?:www\.)?115cdn\.com\//i, "https://115.com/");
  u = u.replace(/^https?:\/\/(?:www\.)?anxia\.com\//i, "https://115.com/");
  return u.replace(/[),.;]+$/, "");
}

function extractPanUrl(raw) {
  const s = String(raw || "").replace(/&amp;/g, "&").trim();
  const m = s.match(/https?:\/\/[^\s"'<>]+/i);
  return m ? normalizeShareUrl(m[0]) : "";
}

function isPanShareUrl(url = "") {
  return /115|quark|aliyun|alipan|baidu|uc\.cn|123pan|189\.cn|xunlei|anxia/i.test(String(url || ""));
}

function extractPanUrlsFromDetail($, site) {
  const panUrls = [];
  const seen = new Set();
  const pushUrl = (raw) => {
    const url = extractPanUrl(raw);
    if (!url || !/^https?:\/\//i.test(url) || !isPanShareUrl(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    panUrls.push(url);
  };

  // mxone / 蜗牛：clipboard、a 标签、p/i/span 文本
  if (site.panExtractMode === "mxone") {
    $(".module-row-info").each((_, el) => {
      $(el).find("[data-clipboard-text]").each((__, n) => pushUrl($(n).attr("data-clipboard-text")));
      $(el).find('a[href^="http"]').each((__, a) => pushUrl($(a).attr("href")));
      $(el).find("i,p,span").each((__, p) => pushUrl($(p).text().trim()));
      const firstP = $(el).find("p")[0]?.children?.[0]?.data;
      if (firstP) pushUrl(firstP);
    });

    $(".pan-link-item[data-pan-item]").each((_, el) => {
      $(el).find("[data-copy]").each((__, n) => pushUrl($(n).attr("data-copy")));
      $(el).find('a[href^="http"]').each((__, a) => pushUrl($(a).attr("href")));
      $(el).find(".pan-link-meta").each((__, meta) => pushUrl($(meta).text().trim()));
    });
  } else {
    const selector = site.detailPanSelector || ".module-row-info p";
    $(selector).each((_, p) => pushUrl($(p).text().trim()));
  }

  // 兜底：整页扫描分享链接（含 115cdn/anxia）
  if (panUrls.length === 0) {
    const html = $.html() || "";
    const re =
      /https?:\/\/(?:115cdn\.com|115\.com|anxia\.com|pan\.quark\.cn|www\.aliyundrive\.com|www\.alipan\.com|pan\.baidu\.com|drive\.uc\.cn|cloud\.189\.cn|www\.123pan\.com|pan\.xunlei\.com)\/[^\s"'<>]+/gi;
    let m;
    while ((m = re.exec(html))) {
      pushUrl(m[0]);
    }
  }

  return panUrls;
}

function parseTotalPages($) {
  let totalPages = 1;
  const pageSelectors = [".page-numbers:not(.next):not(.prev)", ".pagination a", ".page a", ".pages a", ".module-page a"];
  for (const selector of pageSelectors) {
    const pageLinks = $(selector);
    if (pageLinks.length > 0) {
      let maxPage = 1;
      pageLinks.each((_, el) => {
        const pageNum = parseInt($(el).text().trim(), 10);
        if (!Number.isNaN(pageNum) && pageNum > maxPage) maxPage = pageNum;
        const href = $(el).attr("href") || "";
        const mType = href.match(/\/vodtype\/\d+-(\d+)\/?/i);
        if (mType) maxPage = Math.max(maxPage, parseInt(mType[1], 10) || 1);
        const mSearch = href.match(/\/vodsearch\/[^/]*?----------+(\d+)---+\/?/i);
        if (mSearch) maxPage = Math.max(maxPage, parseInt(mSearch[1], 10) || 1);
      });
      if (maxPage > 1) {
        totalPages = maxPage;
        break;
      }
    }
  }

  // mxone 兜底：扫描全页分页链接
  $("a[href*='/vodtype/'],a[href*='/vodsearch/']").each((_, a) => {
    const href = $(a).attr("href") || "";
    let m = href.match(/\/vodtype\/\d+-(\d+)\/?/i);
    if (m) totalPages = Math.max(totalPages, parseInt(m[1], 10) || 1);
    m = href.match(/\/vodsearch\/[^/]*?----------+(\d+)---+\/?/i);
    if (m) totalPages = Math.max(totalPages, parseInt(m[1], 10) || 1);
  });

  const pageText = $(".page-text, .page_info, .page-count").text();
  const pageMatch = pageText.match(/共\s*(\d+)\s*页/);
  if (pageMatch) totalPages = Math.max(totalPages, parseInt(pageMatch[1], 10) || 1);
  return totalPages;
}

// ==================== 网盘解析 ====================
async function getDriveParseWithCache(url, driveKey, drives, source = "") {
  const cacheKey = `${driveKey}_${url}`;
  const cached = driveParseCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL.drive) {
    return { data: cached.data, fromCache: true };
  }

  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("驱动超时")), 8000));
  try {
    const result = await Promise.race([getEpisodesFromDrive(url, driveKey, drives, source), timeoutPromise]);
    driveParseCache.set(cacheKey, { data: result, time: Date.now() });
    return { data: result, fromCache: false };
  } catch (error) {
    await OmniBox.log("info", `[drive] parse fail ${driveKey}, source=${source}, err=${error.message}`);
    return { data: null, fromCache: false, error: error.message };
  }
}

async function getEpisodesFromDrive(url, driveKey, drives, source = "") {
  const drive = drives.find((d) => d.key === driveKey);
  if (!drive) {
    await OmniBox.log("info", `[drive] missing driver ${driveKey}`);
    return null;
  }

  try {
    if (!drive.matchShare || !drive.matchShare(url)) {
      await OmniBox.log("info", `[drive] unmatched share ${driveKey}`);
      return null;
    }
    const vod = await drive.getVod(url);
    if (!vod) return null;

    let isValid = true;
    if (vod.vod_play_url) {
      const parts = vod.vod_play_url.split("#");
      if (parts.length === 1) {
        const [name] = parts[0].split("$");
        if (["播放", "全集", "点击播放", "立即播放"].includes(name)) isValid = false;
      }
    } else {
      isValid = false;
    }

    if (!isValid) return null;

    return {
      playFrom: vod.vod_play_from || driveKey,
      playUrl: vod.vod_play_url,
      vodPic: vod.vod_pic || "",
      vodContent: vod.vod_content || "",
      vodActor: vod.vod_actor || "",
      vodDirector: vod.vod_director || "",
    };
  } catch (error) {
    await OmniBox.log("info", `[drive] error ${driveKey}: ${error.message}`);
    return null;
  }
}

// ==================== 站点抓取 ====================
async function fetchSiteSearch(site, keyword, page = 1) {
  const searchUrl = buildSearchUrl(site, keyword, page);

  try {
    const { response, baseUrl } = await requestWithFailover(site.domains, searchUrl);
    const $ = cheerio.load(response.body);
    const itemSelector = site.searchListSelector || ".module-search-item";
    const items = $(itemSelector);
    const videos = [];
    const seen = new Set();

    items.each((_, el) => {
      const $item = $(el);
      const href =
        $item.attr("href") ||
        $item.find(".video-serial").attr("href") ||
        $item.find(".module-item-pic a").attr("href") ||
        $item.find('a[href*="/voddetail/"]').attr("href") ||
        $item.find('a[href*="/vod/detail/"]').attr("href") ||
        $item.find(".module-item-title").attr("href");
      const vodName = (
        $item.attr("title") ||
        $item.find(".video-title").text() ||
        $item.find(".video-serial").attr("title") ||
        $item.find(".module-item-pic img").attr("alt") ||
        $item.find(".module-item-title").attr("title") ||
        $item.find(".module-poster-item-title").text() ||
        $item.find(".module-item-title").text() ||
        $item.find("h3,h4").first().text() ||
        ""
      )
        .replace(/\s+/g, " ")
        .replace(/^立刻播放|^下载/g, "")
        .trim();
      let vodPic =
        $item.find(".module-item-pic img").attr("data-src") ||
        $item.find(".module-item-pic img").attr("data-original") ||
        $item.find(".module-item-pic img").attr("src") ||
        $item.find("img").first().attr("data-src") ||
        $item.find("img").first().attr("data-original") ||
        $item.find("img").first().attr("src");
      if (vodPic && vodPic.includes("loading.gif")) {
        vodPic =
          $item.find("img").first().attr("data-src") ||
          $item.find("img").first().attr("data-original") ||
          "";
      }
      if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;
      const vodRemarks =
        $item.find(".module-item-text").text().trim() ||
        $item.find(".module-item-note").text().trim() ||
        $item.find(".module-poster-item-note").text().trim() ||
        $item.find(".video-episode").text().trim() ||
        $item.find(".video-serial").text().trim() ||
        "";
      const vodYear = $item.find(".module-item-caption span").first().text().trim();

      if (href && vodName) {
        const vodId = `${site.id}_${href}`;
        if (seen.has(vodId)) return;
        seen.add(vodId);
        videos.push({
          vod_id: vodId,
          vod_name: `[${site.name}] ${vodName}`,
          vod_pic: vodPic || "",
          type_id: "",
          type_name: "",
          vod_remarks: vodRemarks || "",
          vod_year: vodYear || "",
          _source: site.name,
          _original_name: vodName,
        });
      }
    });

    await OmniBox.log("info", `[search] site=${site.name}, page=${page}, hit=${videos.length}`);
    return videos;
  } catch (error) {
    await OmniBox.log("error", `[search] site=${site.name} fail: ${error.message}`);
    return [];
  }
}

async function fetchSiteCategoryList(site, categoryId, page = 1, filters = {}) {
  const url = buildCategoryUrl(site, categoryId, page, filters);
  await OmniBox.log("info", `[category] site=${site.name}, cid=${categoryId}, page=${page}, url=${url}`);

  const { response, baseUrl } = await requestWithFailover(site.domains, url);
  const $ = cheerio.load(response.body);
  const videos = [];

  $(site.listSelector).each((_, el) => {
    const $item = $(el);
    const href =
      $item.attr("href") ||
      $item.find(".module-item-pic a").attr("href") ||
      $item.find('a[href*="/voddetail/"]').attr("href") ||
      $item.find('a[href*="/vod/detail/"]').attr("href") ||
      $item.find(".module-item-title").attr("href");
    const vodName = (
      $item.attr("title") ||
      $item.find(".video-title").text() ||
      $item.find(".module-item-pic img").attr("alt") ||
      $item.find(".module-item-title").attr("title") ||
      $item.find(".module-poster-item-title").text() ||
      $item.find(".module-item-title").text() ||
      $item.find("h3,h4").first().text() ||
      ""
    )
      .replace(/\s+/g, " ")
      .replace(/^立刻播放|^下载/g, "")
      .trim();
    let vodPic =
      $item.find(".module-item-pic img").attr("data-src") ||
      $item.find(".module-item-pic img").attr("data-original") ||
      $item.find(".module-item-pic img").attr("src") ||
      $item.find("img").first().attr("data-src") ||
      $item.find("img").first().attr("data-original") ||
      $item.find("img").first().attr("src");
    if (vodPic && vodPic.includes("loading.gif")) {
      vodPic =
        $item.find("img").first().attr("data-src") ||
        $item.find("img").first().attr("data-original") ||
        "";
    }
    if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;
    const vodRemarks =
      $item.find(".module-item-text").text().trim() ||
      $item.find(".module-item-note").text().trim() ||
      $item.find(".module-poster-item-note").text().trim() ||
      $item.find(".video-episode").text().trim() ||
      $item.find(".video-serial").text().trim() ||
      "";
    const vodYear = $item.find(".module-item-caption span").first().text().trim();

    if (href && vodName) {
      videos.push({
        vod_id: `${site.id}_${href}`,
        vod_name: vodName,
        vod_pic: vodPic || "",
        type_id: categoryId,
        type_name: site.defaultCategories[categoryId] || "",
        vod_remarks: vodRemarks || "",
        vod_year: vodYear || "",
      });
    }
  });

  const totalPages = parseTotalPages($);
  const total = videos.length > 0 ? videos.length * totalPages : 0;
  await OmniBox.log("info", `[category] site=${site.name}, list=${videos.length}, pages=${totalPages}`);
  return { list: videos, total, page, totalPages };
}

async function fetchSiteDetail(site, videoId) {
  const { response, baseUrl } = await requestWithFailover(site.domains, videoId);
  const $ = cheerio.load(response.body);

  let vodName =
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    $(".page-title").text().replace(/\s+/g, " ").trim() ||
    $(".video-info-header h1").first().text().replace(/\s+/g, " ").trim() ||
    $(".module-info-heading h1").first().text().replace(/\s+/g, " ").trim() ||
    $(".mobile-detail-title").first().text().replace(/\s+/g, " ").trim() ||
    $(".premium-title").first().text().replace(/\s+/g, " ").trim() ||
    "";
  let vodPic =
    $(".mobile-play .lazyload").attr("data-src") ||
    $(".module-item-pic img,.module-info-poster img,.video-cover img,img.lazyload,img.lazy,.premium-poster img")
      .first()
      .attr("data-src") ||
    $(".module-item-pic img,.module-info-poster img,.video-cover img,img.lazyload,img.lazy,.premium-poster img")
      .first()
      .attr("data-original") ||
    $(".module-item-pic img,.module-info-poster img,.video-cover img,img.lazyload,img.lazy,.premium-poster img")
      .first()
      .attr("src") ||
    "";
  if (vodPic && !vodPic.startsWith("http")) vodPic = baseUrl + vodPic;

  let vodYear = "";
  let vodDirector = "";
  let vodActor = "";
  let vodContent = "";

  $(".video-info-itemtitle").each((_, item) => {
    const key = $(item).text();
    const value = $(item).next().find("a").map((_, a) => $(a).text().trim()).get().filter(Boolean).join(", ");
    if (key.includes("剧情")) vodContent = $(item).next().find("p").text().trim();
    else if (key.includes("导演")) vodDirector = value;
    else if (key.includes("主演")) vodActor = value;
    else if (key.includes("年代") || key.includes("年份") || key.includes("上映")) {
      const yearText = $(item).next().text().trim() || value;
      const m = yearText.match(/(19|20)\d{2}/);
      if (m) vodYear = m[0];
    }
  });

  if (!vodContent) {
    vodContent = (
      $(".vod_content,.module-info-introduction,.video-info-content,.module-info-main .module-info-item-content,.detail-desc-text,.premium-plot")
        .last()
        .text() || ""
    )
      .replace(/收起|展开全部|内详/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const infoText = $(".video-info,.module-info-main,.module-info,.premium-meta-grid,.detail-info-premium").text() || "";
  if (!vodYear) {
    const match = infoText.match(/(?:年代|年份|上映)[:：]?\s*(\d{4})/) || infoText.match(/\b(19|20)\d{2}\b/);
    if (match) vodYear = String(match[1] || match[0]).replace(/\D/g, "").slice(0, 4);
  }
  if (!vodDirector) {
    const match = infoText.match(/导演[:：]?\s*([^\n]+?)\s*(主演|年代|备注|剧情|$)/);
    if (match) vodDirector = match[1].replace(/^\/\s*/, "").trim();
  }
  if (!vodActor) {
    const match = infoText.match(/主演[:：]?\s*([^\n]+?)\s*(年代|备注|剧情|导演|$)/);
    if (match) vodActor = match[1].replace(/^\/\s*/, "").trim();
  }

  if (!vodDirector || !vodActor || !vodYear) {
    $(".premium-meta-grid .meta-item").each((_, el) => {
      const label = $(el).find(".m-label").text().trim();
      const value = $(el).find(".m-val").text().trim();
      if (!label || !value) return;
      if (!vodDirector && label.includes("导演")) vodDirector = value;
      if (!vodActor && label.includes("主演")) vodActor = value;
      if (!vodYear && (label.includes("年代") || label.includes("年份") || label.includes("上映"))) {
        const match = value.match(/(19|20)\d{2}/);
        if (match) vodYear = match[0];
      }
    });
  }

  if (!vodYear) {
    $(".premium-tags-top .p-tag").each((_, el) => {
      const match = $(el).text().trim().match(/^(19|20)\d{2}$/);
      if (match) vodYear = match[0];
    });
  }

  const panUrls = extractPanUrlsFromDetail($, site);

  await OmniBox.log("info", `[detail] site=${site.name}, panUrls=${panUrls.length}`);
  return { vodName, vodPic, vodYear, vodDirector, vodActor, vodContent, panUrls };
}

async function handleSiteDetail(vodId, drives, context) {
  const parts = String(vodId).split("_");
  const siteId = parts[0];
  const rawId = parts.slice(1).join("_");
  const site = SITES.find((s) => s.id === siteId);
  if (!site) return null;

  const { vodName, vodPic, vodYear, vodDirector, vodActor, vodContent, panUrls } = await fetchSiteDetail(site, rawId);

  const panItems = panUrls.map((panUrl) => ({ url: panUrl, driveKey: detectDriveKey(panUrl) }));
  panItems.sort((a, b) => compareDriveKeyOrder(a.driveKey, b.driveKey));

  let playSources = [];
  const driveTypeCountMap = {};
  for (const { url: shareURL } of panItems) {
    const driveInfo = await getDriveInfoCached(shareURL);
    const displayName = driveInfo.displayName || "未知网盘";
    driveTypeCountMap[displayName] = (driveTypeCountMap[displayName] || 0) + 1;
  }

  const driveTypeCurrentIndexMap = {};

  // ==================== 限并发处理网盘链接 ====================
  const detailConcurrency = site.id === "woniu4k" ? 1 : 4;
  let woniuRequestIndex = 0;
  const panUrlResults = await runWithConcurrency(panItems.map(item => item.url), detailConcurrency, async (shareURL) => {
    try {
      if (site.id === "woniu4k") {
        const requestIndex = woniuRequestIndex++;
        if (requestIndex > 0 && WONIU4K_DRIVE_API_DELAY_MS > 0) {
          await sleep(WONIU4K_DRIVE_API_DELAY_MS);
        }
      }

      await OmniBox.log("info", `[detail] 处理网盘链接: ${shareURL}`);

      const driveInfo = await getDriveInfoCached(shareURL);
      let displayName = driveInfo.displayName || "未知网盘";
      const totalCount = driveTypeCountMap[displayName] || 0;
      if (totalCount > 1) {
        driveTypeCurrentIndexMap[displayName] = (driveTypeCurrentIndexMap[displayName] || 0) + 1;
        displayName = `${displayName}${driveTypeCurrentIndexMap[displayName]}`;
      }

      await OmniBox.log("info", `[detail] 网盘类型: ${displayName}, driveType: ${driveInfo.driveType}`);

      const fileList = await getRootFileListCached(shareURL);
      if (!Array.isArray(fileList?.files) || fileList.files.length === 0) {
        await OmniBox.log("warn", `[detail] 获取文件列表失败: ${shareURL}`);
        return null;
      }

      await OmniBox.log("info", `[detail] 从分享链接 ${shareURL} 获取文件列表成功,文件数量: ${fileList.files.length}`);

      const allVideoFiles = await getAllVideoFilesCached(shareURL, fileList.files);
      if (allVideoFiles.length === 0) {
        await OmniBox.log("warn", `[detail] 未找到视频文件: ${shareURL}`);
        return null;
      }

      await OmniBox.log("info", `[detail] 递归获取视频文件完成,视频文件数量: ${allVideoFiles.length}`);

      // ==================== 刮削处理（参考木偶.js）====================
      const scrapeKey = `${vodId}@@${encodeURIComponent(shareURL)}`;
      if (ENABLE_SCRAPE) {
        try {
          await OmniBox.log("info", `[detail] 开始执行刮削处理, scrapeKey=${scrapeKey}, 资源名: ${vodName}, 视频文件数: ${allVideoFiles.length}`);

          const videoFilesForScraping = allVideoFiles.map((file) => {
            const fileId = file.fid || file.file_id || "";
            const formattedFileId = fileId ? `${shareURL}|${fileId}|${scrapeKey}` : fileId;
            return {
              ...file,
              fid: formattedFileId,
              file_id: formattedFileId,
            };
          });

          await OmniBox.log("info", `[detail] 文件ID格式转换完成,示例: ${videoFilesForScraping[0]?.fid || "N/A"}`);

          const scrapingResult = await OmniBox.processScraping(scrapeKey, vodName, vodName, videoFilesForScraping);
          await OmniBox.log("info", `[detail] 刮削处理完成,结果: ${JSON.stringify(scrapingResult).substring(0, 200)}`);
        } catch (error) {
          await OmniBox.log("error", `[detail] 刮削处理失败: ${error.message}`);
          if (error.stack) {
            await OmniBox.log("error", `[detail] 刮削错误堆栈: ${error.stack}`);
          }
        }
      }

      // 获取刮削后的元数据（使用独立 scrapeKey，避免多个网盘互相覆盖）
      let scrapeData = null;
      let videoMappings = [];
      let scrapeType = "";

      try {
        await OmniBox.log("info", `[detail] 开始获取元数据, scrapeKey: ${scrapeKey}`);
        const metadata = await OmniBox.getScrapeMetadata(scrapeKey);
        await OmniBox.log("info", `[detail] 获取元数据响应: ${JSON.stringify(metadata).substring(0, 500)}`);

        scrapeData = metadata.scrapeData || null;
        videoMappings = metadata.videoMappings || [];
        scrapeType = metadata.scrapeType || "";

        if (scrapeData) {
          await OmniBox.log("info", `[detail] 获取到刮削数据,标题: ${scrapeData.title || "未知"}, 类型: ${scrapeType || "未知"}, 映射数量: ${videoMappings.length}`);
        } else {
          await OmniBox.log("warn", `[detail] 未获取到刮削数据,映射数量: ${videoMappings.length}`);
        }
      } catch (error) {
        await OmniBox.log("error", `[detail] 获取元数据失败: ${error.message}`);
        if (error.stack) {
          await OmniBox.log("error", `[detail] 获取元数据错误堆栈: ${error.stack}`);
        }
      }

      return { shareURL, displayName, driveInfo, allVideoFiles, scrapeData, videoMappings, scrapeType, scrapeKey };
    } catch (error) {
      await OmniBox.log("error", `[detail] 处理网盘链接失败: ${shareURL}, 错误: ${error.message}`);
      return null;
    }
  });

  let updatedVodName = vodName;
  let updatedVodPic = vodPic;
  let updatedVodYear = vodYear;
  let updatedVodActor = vodActor;
  let updatedVodDirector = vodDirector;
  let updatedVodContent = vodContent;

  const from = context?.from || "web";
  let effectiveSourceNamesConfig = [...SOURCE_NAMES_CONFIG];
  if (from === "web") {
    effectiveSourceNamesConfig = effectiveSourceNamesConfig.filter((name) => name !== "本地代理");
  }

  for (const result of panUrlResults) {
    if (!result) continue;
    const { shareURL, displayName, driveInfo, allVideoFiles, scrapeData, videoMappings, scrapeType, scrapeKey } = result;

    let sourceNames = [displayName];
    if (DRIVE_TYPE_CONFIG.includes(driveInfo.driveType)) {
      sourceNames = [...effectiveSourceNamesConfig];
      OmniBox.log("info", `${displayName} 匹配成功,线路设置为: ${sourceNames.join(", ")}`);
    }

    for (const sourceName of sourceNames) {
      const episodes = [];
      for (const file of allVideoFiles) {
        let fileName = file.file_name || "";
        const fileId = file.fid || "";
        const fileSize = file.size || file.file_size || 0;
        if (!fileName || !fileId) continue;

        const formattedFileId = `${shareURL}|${fileId}|${scrapeKey}`;
        let matchedMapping = null;

        if (scrapeData && Array.isArray(videoMappings) && videoMappings.length) {
          for (const mapping of videoMappings) {
            if (mapping && mapping.fileId === formattedFileId) {
              matchedMapping = mapping;
              const newFileName = buildScrapedFileName(scrapeData, mapping, fileName);
              if (newFileName && newFileName !== fileName) {
                fileName = newFileName;
                await OmniBox.log("info", `[detail] 应用刮削文件名: ${file.file_name} -> ${fileName}`);
              }
              break;
            }
          }
        }

        let displayFileName = fileName;
        if (fileSize > 0) {
          const sizeStr = formatFileSize(fileSize);
          if (sizeStr) displayFileName = `[${sizeStr}] ${fileName}`;
        }

        const encodedDanmakuName = encodeURIComponent(fileName);
        const episode = { name: displayFileName, playId: `${formattedFileId}|${encodedDanmakuName}` };
        if (fileSize > 0) episode.size = fileSize;
        if (matchedMapping) {
          if (matchedMapping.seasonNumber !== undefined) episode._seasonNumber = matchedMapping.seasonNumber;
          if (matchedMapping.episodeNumber !== undefined) episode._episodeNumber = matchedMapping.episodeNumber;
          if (matchedMapping.episodeName) episode.episodeName = matchedMapping.episodeName;
          if (matchedMapping.episodeOverview) episode.episodeOverview = matchedMapping.episodeOverview;
          if (matchedMapping.episodeAirDate) episode.episodeAirDate = matchedMapping.episodeAirDate;
          if (matchedMapping.episodeStillPath) episode.episodeStillPath = matchedMapping.episodeStillPath;
          if (matchedMapping.episodeVoteAverage !== undefined) episode._episodeVoteAverage = matchedMapping.episodeVoteAverage;
          if (matchedMapping.episodeRuntime !== undefined) episode._episodeRuntime = matchedMapping.episodeRuntime;
        }
        episodes.push(episode);
      }

      if (scrapeData && episodes.some((ep) => ep._episodeNumber !== undefined)) {
        await OmniBox.log("info", `[detail] 检测到刮削数据,按 episodeNumber 排序剧集列表,共 ${episodes.length} 集`);
        episodes.sort((a, b) => {
          const seasonA = a._seasonNumber ?? 0;
          const seasonB = b._seasonNumber ?? 0;
          if (seasonA !== seasonB) return seasonA - seasonB;
          return (a._episodeNumber ?? 0) - (b._episodeNumber ?? 0);
        });
      }

      if (episodes.length > 0) {
        let finalSourceName = sourceName;
        if (DRIVE_TYPE_CONFIG.includes(driveInfo.driveType)) {
          finalSourceName = `${displayName}-${sourceName}`;
        }
        playSources.push({ name: finalSourceName, episodes });
      }
    }

    if (scrapeData) {
      if (scrapeData.title) updatedVodName = scrapeData.title;
      if (scrapeData.posterPath) updatedVodPic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
      if (scrapeData.releaseDate) updatedVodYear = scrapeData.releaseDate.substring(0, 4);
      if (scrapeData.overview) updatedVodContent = scrapeData.overview;
      if (scrapeData.credits) {
        if (Array.isArray(scrapeData.credits.cast) && scrapeData.credits.cast.length) {
          updatedVodActor = scrapeData.credits.cast.slice(0, 5).map((c) => c.name).filter(Boolean).join(",");
        }
        if (Array.isArray(scrapeData.credits.crew) && scrapeData.credits.crew.length) {
          const directors = scrapeData.credits.crew.filter((c) => c.job === "Director" || c.department === "Directing");
          if (directors.length) updatedVodDirector = directors.slice(0, 3).map((d) => d.name).filter(Boolean).join(",");
        }
      }
    }
  }

  // 按网盘类型优先级排序播放源
  if (Array.isArray(playSources) && playSources.length > 1 && DRIVE_ORDER.length > 0) {
    const sortedSources = sortPlaySourcesByDriveOrder(playSources);
    await OmniBox.log("info", `[detail] 按 DRIVE_ORDER 排序后线路顺序: ${sortedSources.map(item => item.name).join(' | ')}`);
    playSources = sortedSources;
  }

  await OmniBox.log("info", `[detail] 构建播放源完成,网盘数量: ${playSources.length}`);

  return {
    vod_id: vodId,
    vod_name: updatedVodName,
    vod_pic: updatedVodPic,
    vod_year: updatedVodYear,
    vod_director: updatedVodDirector,
    vod_actor: updatedVodActor,
    vod_content: updatedVodContent || `网盘资源,共${panUrls.length}个网盘链接`,
    vod_play_sources: playSources.length > 0 ? playSources : undefined,
  };
}

function detectDriveKey(panUrl) {
  const url = String(panUrl || "").toLowerCase();
  if (url.includes("pan.baidu.com")) return "baidu";
  if (url.includes("quark.cn")) return "quark";
  if (url.includes("115.com") || url.includes("115cdn.com") || url.includes("anxia.com")) return "a115";
  if (url.includes("123pan.com")) return "a123";
  if (url.includes("189.cn")) return "a189";
  if (url.includes("139.com")) return "a139";
  if (url.includes("aliyundrive.com") || url.includes("alipan.com")) return "ali";
  if (url.includes("xunlei.com")) return "xunlei";
  if (url.includes("uc.cn")) return "uc";
  return "other";
}

function inferDriveTypeFromSourceName(name = "") {
  const raw = String(name || "").toLowerCase();
  if (raw.includes("百度")) return "baidu";
  if (raw.includes("139")) return "a139";
  if (raw.includes("天翼") || raw.includes("189")) return "a189";
  if (raw.includes("123")) return "a123";
  if (raw.includes("115")) return "a115";
  if (raw.includes("夸克")) return "quark";
  if (raw.includes("迅雷")) return "xunlei";
  if (raw.includes("阿里")) return "ali";
  if (raw === "uc" || raw.includes("uc")) return "uc";
  return raw;
}

function sortPlaySourcesByDriveOrder(playSources = []) {
  if (!Array.isArray(playSources) || playSources.length <= 1 || DRIVE_ORDER.length === 0) {
    return playSources;
  }
  const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
  return [...playSources].sort((a, b) => {
    const aType = inferDriveTypeFromSourceName(a?.name || "");
    const bType = inferDriveTypeFromSourceName(b?.name || "");
    const aOrder = orderMap.has(aType) ? orderMap.get(aType) : Number.MAX_SAFE_INTEGER;
    const bOrder = orderMap.has(bType) ? orderMap.get(bType) : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return 0;
  });
}

function compareDriveKeyOrder(a, b) {
  const indexA = LINE_ORDER.indexOf(a);
  const indexB = LINE_ORDER.indexOf(b);
  if (indexA === -1 && indexB === -1) return 0;
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
}

/**
 * 工具: 限并发执行任务，避免 detail 中网盘链接过多时瞬时并发过高。
 */
async function runWithConcurrency(items, limit, taskFn) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];

  const results = new Array(list.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= list.length) break;
      results[current] = await taskFn(list[current], current);
    }
  }

  const workerCount = Math.max(1, Math.min(limit || 1, list.length));
  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

/**
 * 构建刮削后的文件名（参考木偶.js）
 */
function buildScrapedFileName(scrapeData, mapping, originalFileName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalFileName;
  }

  if (scrapeData && scrapeData.episodes && Array.isArray(scrapeData.episodes)) {
    for (const episode of scrapeData.episodes) {
      if (episode.episodeNumber === mapping.episodeNumber && episode.seasonNumber === mapping.seasonNumber) {
        if (episode.name) {
          return `${episode.episodeNumber}.${episode.name}`;
        }
        break;
      }
    }
  }

  return originalFileName;
}

function buildDanmakuCandidates({ scrapeData, scrapeType = "", matchedMapping = null, fallbackDanmakuFileName = "" }) {
  const candidates = [];
  const seen = new Set();

  const pushCandidate = (value) => {
    const text = String(value || "").trim();
    if (!text) return;
    if (seen.has(text)) return;
    seen.add(text);
    candidates.push(text);
  };

  if (scrapeData) {
    if (scrapeType === "movie") {
      pushCandidate(scrapeData.title || "");
      if (scrapeData.title && scrapeData.releaseDate) {
        pushCandidate(`${scrapeData.title}.${String(scrapeData.releaseDate).slice(0, 4)}`);
      }
    } else if (matchedMapping) {
      const title = scrapeData.title || "";
      const seasonAirYear = scrapeData.seasonAirYear || "";
      const seasonNumber = matchedMapping.seasonNumber || 1;
      const episodeNum = matchedMapping.episodeNumber || 1;
      pushCandidate(`${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`);
      pushCandidate(`${title}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`);
      if (matchedMapping.episodeName) {
        pushCandidate(`${title}.${matchedMapping.episodeName}`);
      }
    }
  }

  if (fallbackDanmakuFileName) {
    pushCandidate(decodeURIComponent(fallbackDanmakuFileName));
  }

  return candidates;
}

async function matchDanmakuByCandidates(candidates = []) {
  for (const fileName of candidates) {
    try {
      const danmakuList = await OmniBox.getDanmakuByFileName(fileName);
      if (Array.isArray(danmakuList) && danmakuList.length > 0) {
        await OmniBox.log("info", `[danmaku] matched ${fileName}, count=${danmakuList.length}`);
        return danmakuList;
      }
    } catch (error) {
      await OmniBox.log("warn", `[danmaku] candidate fail ${fileName}: ${error.message}`);
    }
  }
  return [];
}

// ==================== OmniBox handlers ====================
// ==================== 蜗牛4K 登录 ====================

function getWoniuBaseUrl() {
  return removeTrailingSlash(WONIU4K_SITES[0] || "");
}

function resolveSiteUrl(value, baseUrl) {
  if (!value) return "";
  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return "";
  }
}

async function login(params) {
  const username = String(params?.username || WONIU4K_USERNAME || "").trim();
  const password = String(params?.password || WONIU4K_PASSWORD || "").trim();
  const captchaCode = String(params?.captcha || params?.verify || "").trim();
  const baseUrl = getWoniuBaseUrl();

  if (!baseUrl) return { code: -1, msg: "蜗牛4K 站点未配置" };
  if (!username || !password) {
    await OmniBox.log("warn", "[woniu4k] 登录失败: 请设置 WONIU4K_USERNAME / WONIU4K_PASSWORD");
    return { code: -1, msg: "用户名或密码未配置" };
  }

  try {
    const loginPage = await httpRequest(`${baseUrl}/user/login/`, { timeout: 15000 });
    const $ = cheerio.load(loginPage.body || "");
    const hasVerify = $("#verify").length > 0 || $("#verify_img").length > 0;
    if (hasVerify && !captchaCode) {
      const verifyUrl = resolveSiteUrl($("#verify_img").attr("src") || "", baseUrl);
      return { code: -2, msg: "需要验证码", verifyUrl, verifyImg: verifyUrl };
    }

    const formData = new URLSearchParams();
    formData.append("user_name", username);
    formData.append("user_pwd", password);
    if (captchaCode) formData.append("verify", captchaCode);

    const response = await httpRequest(`${baseUrl}/user/login.html`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${baseUrl}/user/login/`,
      },
      body: formData.toString(),
      timeout: 15000,
    });

    try {
      return JSON.parse(response.body || "{}");
    } catch {
      return { code: 0, msg: "登录响应解析失败" };
    }
  } catch (error) {
    await OmniBox.log("error", `[woniu4k] 登录异常: ${error.message}`);
    return { code: -1, msg: error.message };
  }
}

async function logout() {
  const baseUrl = getWoniuBaseUrl();
  if (!baseUrl) return { code: -1, msg: "蜗牛4K 站点未配置" };
  try {
    await httpRequest(`${baseUrl}/user/logout.html`, { timeout: 10000 });
    clearCookies();
    return { code: 1, msg: "已退出" };
  } catch (error) {
    clearCookies();
    return { code: -1, msg: error.message };
  }
}

async function getLoginStatus() {
  const baseUrl = getWoniuBaseUrl();
  if (!baseUrl) return { loggedIn: false, username: "" };
  try {
    const response = await httpRequest(`${baseUrl}/user/index.html`, { timeout: 10000 });
    const $ = cheerio.load(response.body || "");
    const selector = ".user-name, .user-info-name, .header-user-name";
    const loggedIn = response.body.includes("退出登录") || $(selector).length > 0;
    const username = loggedIn ? ($(selector).first().text().trim() || "已登录") : "";
    return { loggedIn, username };
  } catch {
    return { loggedIn: false, username: "" };
  }
}

// ==================== 接口函数 ====================

async function home(params, context) {
  try {
    await OmniBox.log("info", `[home] start, sites=${SITES.length}`);

    const classList = SITES.map((site) => ({ type_id: `site_${site.id}`, type_name: site.name }));

    const filters = {};
    const filterResults = await Promise.all(
      SITES.map(async (site) => ({ siteId: site.id, filters: buildSiteFilters(site, await fetchExternalFilterConfig(site)) }))
    );
    for (const item of filterResults) {
      filters[`site_${item.siteId}`] = item.filters;
    }

    const recommendResults = await Promise.all(
      SITES.slice(0, 3).map(async (site) => {
        try {
          const firstCategory = Object.keys(site.defaultCategories)[0] || "1";
          const result = await fetchSiteCategoryList(site, firstCategory, 1);
          return result.list.slice(0, 4);
        } catch (error) {
          await OmniBox.log("warn", `[home] recommend fail ${site.name}: ${error.message}`);
          return [];
        }
      })
    );

    const recommendList = recommendResults.flat().slice(0, 12);
    await OmniBox.log("info", `[home] class=${classList.length}, recommend=${recommendList.length}`);
    return { class: classList, list: recommendList, filters };
  } catch (error) {
    await OmniBox.log("error", `[home] ${error.message}`);
    return { class: [], list: [], filters: {} };
  }
}

async function category(params, context) {
  try {
    const typeId = params.categoryId || "";
    const page = parseInt(params.page || "1", 10);
    const filters = params.filters || {};
    await OmniBox.log("info", `[category] typeId=${typeId}, page=${page}, filters=${JSON.stringify(filters)}`);

    if (!typeId.startsWith("site_")) {
      return { list: [], page: 1, pagecount: 0, total: 0 };
    }

    const siteId = typeId.replace("site_", "");
    const site = SITES.find((s) => s.id === siteId);
    if (!site) {
      return { list: [], page: 1, pagecount: 0, total: 0 };
    }

    const externalFilterConfig = await fetchExternalFilterConfig(site);
    const siteFilters = buildSiteFilters(site, externalFilterConfig);

    let categoryId = filters.categoryId || "";
    const categories = Object.keys(site.defaultCategories);
    if (!categoryId && categories.length > 0) {
      categoryId = categories[0];
      await OmniBox.log("info", `[category] default categoryId=${categoryId}`);
    }
    if (!categoryId) {
      return { list: [], page: 1, pagecount: 0, total: 0, filters: siteFilters };
    }

    const categoryFilters = { ...filters };
    delete categoryFilters.categoryId;
    const result = await fetchSiteCategoryList(site, categoryId, page, categoryFilters);
    const pagecount = result.totalPages || Math.ceil(result.total / PAGE_SIZE) || 1;
    await OmniBox.log("info", `[category] return page=${page}, pagecount=${pagecount}, total=${result.total}`);
    return { list: result.list, page, pagecount, total: result.total, filters: siteFilters };
  } catch (error) {
    await OmniBox.log("error", `[category] ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0 };
  }
}

async function detail(params, context) {
  try {
    const videoId = params.videoId || "";
    const drives = context?.drives || [];
    await OmniBox.log("info", `[detail] videoId=${videoId}`);
    if (!videoId) return { list: [] };
    const data = await handleSiteDetail(videoId, drives, context);
    return { list: data ? [data] : [] };
  } catch (error) {
    await OmniBox.log("error", `[detail] ${error.message}`);
    return { list: [] };
  }
}

async function search(params, context) {
  try {
    const keyword = params.keyword || "";
    const page = parseInt(params.page || "1", 10);
    await OmniBox.log("info", `[search] keyword=${keyword}, page=${page}`);
    if (!keyword) return { list: [], page: 1, pagecount: 0, total: 0 };

    const resultsArrays = await Promise.all(SITES.map((site) => fetchSiteSearch(site, keyword, page)));
    const allResults = resultsArrays.flat();
    await OmniBox.log("info", `[search] total=${allResults.length}`);
    return { list: allResults, page, pagecount: 1, total: allResults.length };
  } catch (error) {
    await OmniBox.log("error", `[search] ${error.message}`);
    return { list: [], page: 1, pagecount: 0, total: 0 };
  }
}

async function play(params, context) {
  try {
    const playId = params.playId || "";
    const flag = params.flag || "";
    const from = context?.from || "web";
    const drives = context?.drives || [];
    await OmniBox.log("info", `[play] flag=${flag}, playId=${playId}`);

    if (!playId) return { urls: [], header: {}, danmaku: [] };

    if (playId.startsWith("link://")) {
      const baseId = playId.split("?")[0];
      const match = baseId.match(/^link:\/\/([^/]+)\/(.+)$/);
      if (match) {
        const [, driveKey, encodedUrl] = match;
        const url = decodeURIComponent(encodedUrl);
        const drive = drives.find((o) => o.key === driveKey);
        if (drive) {
          try {
            return await drive.play(url, flag);
          } catch (error) {
            return { error: `播放失败: ${error.message}` };
          }
        }
      }
    }

    const parts = playId.split("|");
    if (parts.length < 2) return { urls: [], header: {}, danmaku: [] };

    const shareURL = parts[0];
    const fileId = parts[1];
    const rawScrapeKey = parts[2] || "";
    const fallbackDanmakuFileName = parts[3] ? decodeURIComponent(parts[3]) : "";
    const scrapeKey = rawScrapeKey ? `${rawScrapeKey.split("@@")[0]}@@${encodeURIComponent(shareURL)}` : "";
    
    let routeType = from === "web" ? "服务端代理" : "直连";
    if (flag.includes("-")) {
      const flagParts = flag.split("-");
      routeType = flagParts[flagParts.length - 1];
    }
    await OmniBox.log("info", `[play] 使用线路: ${routeType}`);

    // ==================== 并行处理：主链路(播放地址) + 辅链路(刮削元数据/弹幕) ====================
    const playInfoPromise = OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);
    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: null,
        episodeName: params.episodeName || "",
      };

      if (!scrapeKey) return result;

      try {
        const metadata = await OmniBox.getScrapeMetadata(scrapeKey);
        if (!metadata || !metadata.scrapeData || !Array.isArray(metadata.videoMappings)) {
          await OmniBox.log("warn", `[play] 未获取到有效的刮削元数据`);
          return result;
        }

        const formattedFileId = `${shareURL}|${fileId}|${scrapeKey}`;
        const matchedMapping = metadata.videoMappings.find((mapping) => mapping && mapping.fileId === formattedFileId);
        if (!matchedMapping) {
          await OmniBox.log("warn", `[play] 未找到文件映射: ${formattedFileId}`);
          return result;
        }

        const scrapeData = metadata.scrapeData;
        result.scrapeTitle = scrapeData.title || "";
        if (scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
        }

        if (matchedMapping.episodeNumber) {
          result.episodeNumber = matchedMapping.episodeNumber;
        }
        if (matchedMapping.episodeName && !result.episodeName) {
          result.episodeName = matchedMapping.episodeName;
        }

        // 生成 fileName 用于弹幕匹配（参考木偶.js）
        let fileName = "";
        const scrapeType = metadata.scrapeType || "";
        if (scrapeType === "movie") {
          fileName = scrapeData.title || "";
        } else {
          const title = scrapeData.title || "";
          const seasonAirYear = scrapeData.seasonAirYear || "";
          const seasonNumber = matchedMapping.seasonNumber || 1;
          const episodeNum = matchedMapping.episodeNumber || 1;
          fileName = `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
        }

        if (fileName) {
          await OmniBox.log("info", `[play] 生成fileName用于弹幕匹配: ${fileName}`);
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
          if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
            result.danmakuList = matchedDanmaku;
            await OmniBox.log("info", `[play] 弹幕匹配成功,找到 ${matchedDanmaku.length} 条弹幕`);
          }
        }
      } catch (error) {
        await OmniBox.log("warn", `[play] 弹幕匹配失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);

    if (playInfoResult.status !== "fulfilled") {
      throw new Error(playInfoResult.reason && playInfoResult.reason.message ? playInfoResult.reason.message : "无法获取播放地址");
    }

    const playInfo = playInfoResult.value;
    if (!playInfo || !playInfo.url || !Array.isArray(playInfo.url) || playInfo.url.length === 0) {
      throw new Error("无法获取播放地址");
    }

    let danmakuList = [];
    let scrapeTitle = "";
    let scrapePic = "";
    let episodeNumber = null;
    let episodeName = params.episodeName || "";

    if (metadataResult.status === "fulfilled" && metadataResult.value) {
      danmakuList = metadataResult.value.danmakuList || [];
      scrapeTitle = metadataResult.value.scrapeTitle || "";
      scrapePic = metadataResult.value.scrapePic || "";
      episodeNumber = metadataResult.value.episodeNumber || null;
      episodeName = metadataResult.value.episodeName || episodeName;
    } else if (metadataResult.status === "rejected") {
      await OmniBox.log("warn", `[play] 获取元数据失败(不影响播放): ${metadataResult.reason && metadataResult.reason.message ? metadataResult.reason.message : metadataResult.reason}`);
    }

    // ==================== 添加观看记录（参考木偶.js）====================
    try {
      const sourceId = context.sourceId;
      if (sourceId) {
        const dedupeKey = `${sourceId}|${playId}`;
        const now = Date.now();
        const lastAdded = playHistoryDedupeCache.get(dedupeKey);
        if (lastAdded && now - lastAdded < 2000) {
          await OmniBox.log("info", `[play] 跳过重复观看记录: ${dedupeKey}`);
        } else {
          playHistoryDedupeCache.set(dedupeKey, now);
          const title = params.title || scrapeTitle || shareURL;
          const pic = params.pic || scrapePic || "";

          OmniBox.addPlayHistory({
            vodId: scrapeKey,
            title: title,
            pic: pic,
            episode: playId,
            sourceId: sourceId,
            episodeNumber: episodeNumber,
            episodeName: episodeName,
          })
            .then((added) => {
              if (added) {
                OmniBox.log("info", `[play] 已添加观看记录: ${title}`);
              } else {
                OmniBox.log("info", `[play] 观看记录已存在,跳过添加: ${title}`);
              }
            })
            .catch((error) => {
              OmniBox.log("warn", `[play] 添加观看记录失败: ${error.message}`);
            });
        }
      }
    } catch (error) {
      await OmniBox.log("warn", `[play] 添加观看记录失败: ${error.message}`);
    }

    const urls = playInfo.url.map((item) => ({ name: item.name || "播放", url: item.url }));
    const header = playInfo.header || {};
    const finalDanmakuList = danmakuList.length > 0 ? danmakuList : playInfo.danmaku || [];

    await OmniBox.log("info", `[play] urls=${urls.length}, danmaku=${finalDanmakuList.length}, scrape=${ENABLE_SCRAPE ? "on" : "off"}`);
    return {
      urls,
      header: header,
      parse: 0,
      danmaku: finalDanmakuList};
  } catch (error) {
    await OmniBox.log("error", `[play] ${error.message}`);
    return { urls: [], header: {}, danmaku: [] };
  }
}

});

_load(5, "闪电", function (module, exports, require) {
// @name 闪电
// @author
// @description 刮削：支持，弹幕：支持，播放记录：支持
// @dependencies: axios, cheerio
// @version 1.0.7
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/影视/网盘/闪电.js

// 引入 OmniBox SDK
const OmniBox = require("omnibox_sdk");
// 引入 cheerio(用于 HTML 解析)
let cheerio;
try {
  cheerio = require("cheerio");
} catch (error) {
  throw new Error("cheerio 模块未找到,请先安装:npm install cheerio");
}
let axios;
try {
  axios = require("axios");
} catch (error) {
  throw new Error("axios 模块未找到,请先安装:npm install axios");
}
const https = require("https");
const fs = require("fs");

// ==================== 配置区域 ====================
function splitConfigList(value) {
  return String(value || "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// 网站地址(可以通过环境变量配置,支持多个域名用逗号/分号分割)
const WEB_SITE_CONFIG = process.env.WEB_SITE_SHANDIAN || "https://sd.sduc.site;";
const WEB_SITES = splitConfigList(WEB_SITE_CONFIG);
// 读取环境变量:支持多个网盘类型,用逗号/分号分割
const DRIVE_TYPE_CONFIG = splitConfigList(process.env.DRIVE_TYPE_CONFIG || "quark;uc");
// 读取环境变量:线路名称和顺序,用逗号/分号分割
const SOURCE_NAMES_CONFIG = splitConfigList(process.env.SOURCE_NAMES_CONFIG || "本地代理;服务端代理;直连");
// 是否开启外网服务器代理（默认关闭）
const EXTERNAL_SERVER_PROXY_ENABLED = String(process.env.EXTERNAL_SERVER_PROXY_ENABLED || "false").toLowerCase() === "true";
// 读取环境变量:详情页播放线路的网盘排序顺序。仅作用于 detail() 里的播放线路，不作用于搜索结果。
const DRIVE_ORDER = splitConfigList(process.env.DRIVE_ORDER || "baidu;tianyi;quark;uc;115;xunlei;ali;123pan").map(s => s.toLowerCase());
// 详情链路缓存时间（秒），默认 12 小时
const MUOU_CACHE_EX_SECONDS = Number(process.env.MUOU_CACHE_EX_SECONDS || 43200);
const MUOU_VERBOSE_DETAIL = String(process.env.MUOU_VERBOSE_DETAIL || "0") === "1";
// ==================== 配置区域结束 ====================

/**
 * 作用: 从线路名推断网盘类型，用于 detail 播放线路排序。
 * 注意: 这里只识别常见网盘关键字，不改变原脚本其他业务逻辑。
 */
function inferDriveTypeFromSourceName(name = "") {
  const raw = String(name || '').toLowerCase();
  if (raw.includes('百度')) return 'baidu';
  if (raw.includes('天翼')) return 'tianyi';
  if (raw.includes('夸克')) return 'quark';
  if (raw === 'uc' || raw.includes('uc')) return 'uc';
  if (raw.includes('115')) return '115';
  if (raw.includes('迅雷')) return 'xunlei';
  if (raw.includes('阿里')) return 'ali';
  if (raw.includes('123')) return '123pan';
  return raw;
}

/**
 * 作用: 仅对 detail() 中已构建完成的 playSources 做排序。
 * 规则: 按 DRIVE_ORDER 优先级排序；未命中的线路保持在后面。
 */
function sortPlaySourcesByDriveOrder(playSources = []) {
  if (!Array.isArray(playSources) || playSources.length <= 1 || DRIVE_ORDER.length === 0) {
    return playSources;
  }
  const orderMap = new Map(DRIVE_ORDER.map((name, index) => [name, index]));
  return [...playSources].sort((a, b) => {
    const aType = inferDriveTypeFromSourceName(a?.name || '');
    const bType = inferDriveTypeFromSourceName(b?.name || '');
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
  } catch (error) {
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
    OmniBox.log("info", "来源为网页端，已过滤掉\"本地代理\"线路");
  } else if (callerSource === "emby") {
    if (allowServerProxy) {
      filtered = filtered.filter((name) => name === "服务端代理");
      OmniBox.log("info", "来源为 emby，网盘多线路仅保留\"服务端代理\"");
    } else {
      filtered = filtered.filter((name) => name !== "服务端代理");
      OmniBox.log("info", "来源为 emby 但当前为外网环境且未开启外网代理，已屏蔽\"服务端代理\"线路");
    }
  } else if (callerSource === "uz") {
    filtered = filtered.filter((name) => name !== "本地代理");
    OmniBox.log("info", "来源为 uz，已屏蔽\"本地代理\"线路");
  }

  if (!allowServerProxy) {
    filtered = filtered.filter((name) => name !== "服务端代理");
  }

  return filtered.length > 0 ? filtered : ["直连"];
}

function resolveRouteType(flag = "", callerSource = "", context = {}) {
  const allowServerProxy = canUseServerProxy(context);
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

  if (!allowServerProxy && routeType === "服务端代理") {
    routeType = "直连";
  }

  if (callerSource === "uz" && routeType === "本地代理") {
    routeType = "直连";
  }

  return routeType;
}

if (WEB_SITES.length === 0) {
  throw new Error("WEB_SITE 配置不能为空");
}

OmniBox.log("info", `配置了 ${WEB_SITES.length} 个域名: ${WEB_SITES.join(', ')}`);

const INSECURE_HTTPS_AGENT = new https.Agent({
  rejectUnauthorized: false,
});

async function httpRequest(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  const response = await axios({
    url,
    method,
    headers: options.headers || {},
    data: options.body,
    timeout: options.timeout,
    httpsAgent: INSECURE_HTTPS_AGENT,
    validateStatus: () => true,
  });

  let body = response.data;
  if (typeof body !== "string") {
    body = body === undefined || body === null ? "" : JSON.stringify(body);
  }

  return {
    statusCode: response.status,
    body,
    headers: response.headers || {},
  };
}

function isBlockedHtml(body = "") {
  if (!body || typeof body !== "string") {
    return false;
  }
  const lower = body.toLowerCase();
  return (
    lower.includes("just a moment") ||
    lower.includes("cf-browser-verification") ||
    lower.includes("captcha") ||
    lower.includes("访问验证")
  );
}

function buildCacheKey(prefix, value) {
  return `${prefix}:${value}`;
}

function logDetailDebug(message) {
  if (MUOU_VERBOSE_DETAIL) {
    OmniBox.log("info", message);
  }
}

async function getCachedJSON(key) {
  try {
    return await OmniBox.getCache(key);
  } catch (error) {
    OmniBox.log("warn", `读取缓存失败: key=${key}, error=${error.message}`);
    return null;
  }
}

async function setCachedJSON(key, value, exSeconds) {
  try {
    await OmniBox.setCache(key, value, exSeconds);
  } catch (error) {
    OmniBox.log("warn", `写入缓存失败: key=${key}, error=${error.message}`);
  }
}

/**
 * 带容灾的请求函数
 */
async function requestWithFailover(path, options = {}) {
  let lastError = null;
  const perDomainTimeout = Math.max(1000, Math.floor(30000 / WEB_SITES.length));

  for (let i = 0; i < WEB_SITES.length; i++) {
    const baseUrl = removeTrailingSlash(WEB_SITES[i]);
    const fullUrl = path.startsWith('http') ? path : baseUrl + path;

    try {
      OmniBox.log("info", `尝试请求域名 ${i + 1}/${WEB_SITES.length}: ${fullUrl}, timeout=${options.timeout ?? perDomainTimeout}ms`);

      const response = await httpRequest(fullUrl, {
        ...options,
        method: options.method || "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...(options.headers || {}),
        },
        timeout: options.timeout ?? perDomainTimeout,
      });

      if (response.statusCode === 200 && response.body) {
        if (isBlockedHtml(response.body)) {
          OmniBox.log("warn", `域名 ${baseUrl} 命中风控页,切换下一个域名`);
          lastError = new Error("命中风控页面");
          continue;
        }
        OmniBox.log("info", `域名 ${baseUrl} 请求成功`);
        return { response, baseUrl };
      } else {
        OmniBox.log("warn", `域名 ${baseUrl} 返回非200状态码: ${response.statusCode}`);
        lastError = new Error(`HTTP ${response.statusCode}`);
      }
    } catch (error) {
      OmniBox.log("warn", `域名 ${baseUrl} 请求失败: ${error.message}`);
      lastError = error;

      if (i < WEB_SITES.length - 1) {
        continue;
      }
    }
  }

  throw lastError || new Error("所有域名请求均失败");
}

function getBaseUrl() {
  return removeTrailingSlash(WEB_SITES[0]);
}

function removeTrailingSlash(url) {
  if (!url) return "";
  return url.replace(/\/+$/, "");
}

// ==================== 自动筛选提取 ====================
const FILTER_KEY_NAME_MAP = {
  class: "类型",
  area: "地区",
  lang: "语言",
  year: "年份",
  letter: "字母",
  by: "排序",
  sort: "排序",
  id: "分类"
};

let autoFiltersCache = {
  data: null,
  expiresAt: 0,
};

function normalizeFilterValueItem(item) {
  if (!item) return null;
  const name = String(item.n || item.name || "").trim();
  const value = String(item.v ?? item.value ?? "").trim();
  if (!name && !value) return null;
  return { name, value };
}

function normalizeFilterGroup(group) {
  if (!group) return null;
  const key = String(group.key || "").trim();
  const name = String(group.n || group.name || "").trim();
  const valuesRaw = Array.isArray(group.v) ? group.v : (Array.isArray(group.value) ? group.value : []);
  const values = valuesRaw.map(normalizeFilterValueItem).filter(Boolean);
  if (!key || values.length === 0) return null;

  return {
    key,
    name: name || FILTER_KEY_NAME_MAP[key] || key,
    init: String(group.init ?? ""),
    value: values,
  };
}

function extractFilterKeyFromHref(href = "") {
  if (!href) return null;
  for (const key of Object.keys(FILTER_KEY_NAME_MAP)) {
    if (href.includes(`${key}/`)) {
      return key;
    }
  }
  if (href.includes("id/")) {
    return "id";
  }
  return null;
}

function extractFilterValueFromHref(href = "", key = "") {
  if (!href || !key) return "";
  const marker = `${key}/`;
  const idx = href.indexOf(marker);
  if (idx < 0) return "";
  const rest = href.substring(idx + marker.length);
  return decodeURIComponent((rest.split('/')[0] || "").split('.')[0] || "");
}

function parseFiltersFromHtml(html = "") {
  if (!html) return [];
  const $ = cheerio.load(html);
  const groups = [];

  const libraryBoxes = $(".library-box.scroll-box").slice(1);
  libraryBoxes.each((_, element) => {
    const links = $(element).find(".library-list a");
    if (!links || links.length === 0) return;

    const firstHref = links.first().attr("href") || "";
    const key = extractFilterKeyFromHref(firstHref);
    if (!key) return;

    const values = [{ name: "全部", value: "" }];
    const dedupe = new Set(["__ALL__"]);

    links.each((__, a) => {
      const href = $(a).attr("href") || "";
      if (!href) return;
      const value = extractFilterValueFromHref(href, key);
      const name = ($(a).text() || "").trim();
      const dedupeKey = `${name}::${value}`;
      if (!name && !value) return;
      if (dedupe.has(dedupeKey)) return;
      dedupe.add(dedupeKey);
      values.push({ name, value });
    });

    if (values.length > 1) {
      groups.push({
        key,
        name: FILTER_KEY_NAME_MAP[key] || key,
        init: "",
        value: values,
      });
    }
  });

  return groups;
}

async function getAutoFiltersByCategory(categoryId) {
  if (!categoryId) return [];
  try {
    const path = `/index.php/vod/show/id/${categoryId}.html`;
    const { response } = await requestWithFailover(path);
    if (response.statusCode !== 200 || !response.body) {
      return [];
    }
    return parseFiltersFromHtml(response.body);
  } catch (error) {
    OmniBox.log("warn", `自动提取分类筛选失败: categoryId=${categoryId}, err=${error.message}`);
    return [];
  }
}

function normalizeStaticFilters(rawFilters) {
  const result = {};
  if (!rawFilters || typeof rawFilters !== "object") return result;

  for (const typeId of Object.keys(rawFilters)) {
    const groups = Array.isArray(rawFilters[typeId]) ? rawFilters[typeId] : [];
    const normalizedGroups = groups.map(normalizeFilterGroup).filter(Boolean);
    if (normalizedGroups.length > 0) {
      result[typeId] = normalizedGroups;
    }
  }
  return result;
}

async function getPreferredFilters(classes = []) {
  const now = Date.now();
  if (autoFiltersCache.data && now < autoFiltersCache.expiresAt) {
    return autoFiltersCache.data;
  }

  const staticFilters = normalizeStaticFilters(await getDynamicFilters());

  let merged = staticFilters;

  // 静态配置为空时才执行自动抓取
  if (Object.keys(staticFilters).length === 0) {
    const autoFilters = {};
    for (const cls of classes) {
      const typeId = String(cls?.type_id || "").trim();
      if (!typeId) continue;
      const groups = await getAutoFiltersByCategory(typeId);
      if (groups.length > 0) {
        autoFilters[typeId] = groups;
      }
    }

    if (Object.keys(autoFilters).length > 0) {
      OmniBox.log("info", `静态配置为空，自动提取筛选成功: ${Object.keys(autoFilters).length} 个分类`);
      merged = autoFilters;
    } else {
      OmniBox.log("warn", "静态配置和自动提取筛选均为空");
    }
  } else {
    OmniBox.log("info", `使用静态配置筛选: ${Object.keys(staticFilters).length} 个分类`);
  }

  autoFiltersCache = {
    data: merged,
    expiresAt: now + 10 * 60 * 1000,
  };

  return merged;
}

function isVideoFile(file) {
  if (!file || !file.file_name) {
    return false;
  }

  const fileName = file.file_name.toLowerCase();
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

async function getAllVideoFiles(shareURL, files, errors = []) {
  if (!files || !Array.isArray(files)) {
    return [];
  }

  const tasks = files.map(async (file) => {
    if (file.file && isVideoFile(file)) {
      return [file];
    } else if (file.dir) {
      const startTime = performance.now();

      try {
        const subFileList = await OmniBox.getDriveFileList(shareURL, file.fid);
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);

        OmniBox.log("info", `获取目录 [${file.name || file.fid}] 耗时: ${duration}ms`);

        if (subFileList?.files && Array.isArray(subFileList.files)) {
          return await getAllVideoFiles(shareURL, subFileList.files, errors);
        }
        return [];
      } catch (error) {
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);

        const errorInfo = {
          path: file.name || file.fid,
          fid: file.fid,
          message: error.message,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        };
        errors.push(errorInfo);
        OmniBox.log("warn", `获取子目录失败 [${file.name || file.fid}] 耗时: ${duration}ms, 错误: ${error.message}`);
        return [];
      }
    }
    return [];
  });

  const results = await Promise.all(tasks);
  return results.flat();
}

function formatFileSize(size) {
  if (!size || size <= 0) {
    return "";
  }

  const unit = 1024;
  const units = ["B", "K", "M", "G", "T", "P"];

  if (size < unit) {
    return `${size}B`;
  }

  let exp = 0;
  let sizeFloat = size;
  while (sizeFloat >= unit && exp < units.length - 1) {
    sizeFloat /= unit;
    exp++;
  }

  if (sizeFloat === Math.floor(sizeFloat)) {
    return `${Math.floor(sizeFloat)}${units[exp]}`;
  }
  return `${sizeFloat.toFixed(2)}${units[exp]}`;
}

async function home(params) {
  try {
    OmniBox.log("info", "获取首页数据");

    let classes = [];
    let list = [];

    try {
      const { response, baseUrl } = await requestWithFailover('/');

      if (response.statusCode === 200 && response.body) {
        const $ = cheerio.load(response.body);

        const tabItems = $(".module-tab-items .module-tab-item");
        tabItems.each((_, element) => {
          const $item = $(element);
          const typeId = $item.attr("data-id");
          const typeName = $item.attr("data-name");

          if (typeId && typeId !== "0" && typeName) {
            classes.push({
              type_id: typeId,
              type_name: typeName.trim(),
            });
          }
        });

        OmniBox.log("info", `从首页导航提取到 ${classes.length} 个分类`);

        const firstModule = $(".module");

        if (firstModule.length > 0) {
          const moduleItems = firstModule.find(".module-item");

          moduleItems.each((_, element) => {
            const $item = $(element);
            const href = $item.find(".module-item-pic a").attr("href") || $item.find(".module-item-title").attr("href");
            const vodName = $item.find(".module-item-pic img").attr("alt") || $item.find(".module-item-title").attr("title") || $item.find(".module-item-title").text().trim();

            let vodPic = $item.find(".module-item-pic img").attr("data-src") || $item.find(".module-item-pic img").attr("src");
            if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
              vodPic = baseUrl + vodPic;
            }

            const vodRemarks = $item.find(".module-item-text").text().trim();
            const vodYear = $item.find(".module-item-caption span").first().text().trim();

            if (href && vodName) {
              list.push({
                vod_id: href,
                vod_name: vodName,
                vod_pic: vodPic || "",
                type_id: "",
                type_name: "",
                vod_remarks: vodRemarks || "",
                vod_year: vodYear || "",
              });
            }
          });

          OmniBox.log("info", `从首页提取到 ${list.length} 个影片`);
        }
      }
    } catch (error) {
      OmniBox.log("warn", `从首页提取数据失败: ${error.message}`);
    }

    const currentFilters = await getPreferredFilters(classes);
    return {
      class: classes,
      list: list,
      filters: currentFilters,
    };
  } catch (error) {
    OmniBox.log("error", `获取首页数据失败: ${error.message}`);
  }
}

async function category(params) {
  try {
    const categoryId = params.categoryId || params.type_id || "";
    const page = parseInt(params.page || "1", 10);
    const filters = params.filters || {};

    OmniBox.log("info", `获取分类数据: categoryId=${categoryId}, page=${page}`);

    if (!categoryId) {
      OmniBox.log("warn", "分类ID为空");
      return {
        list: [],
        page: 1,
        pagecount: 0,
        total: 0,
      };
    }

    let url = '/index.php/vod/show';
    if (filters.area) {
      url += `/area/${filters.area}`;
    }
    const sortValue = filters.sort || filters.by;
    if (sortValue) {
      url += `/by/${sortValue}`;
    }
    if (filters.class) {
      url += `/class/${filters.class}`;
    }
    if (filters.lang) {
      url += `/lang/${filters.lang}`;
    }
    if (filters.letter) {
      url += `/letter/${filters.letter}`;
    }
    if (filters.year) {
      url += `/year/${filters.year}`;
    }
    const tidValue = filters.tid || filters.id;
    if (tidValue) {
      url += `/id/${tidValue}.html`;
    } else {
      url += `/id/${categoryId}/page/${page}.html`;
    }

    const { response, baseUrl } = await requestWithFailover(url);

    if (response.statusCode !== 200 || !response.body) {
      OmniBox.log("error", `请求失败: HTTP ${response.statusCode}`);
      return {
        list: [],
        page: page,
        pagecount: 0,
        total: 0,
      };
    }

    const $ = cheerio.load(response.body);
    const videos = [];

    const vodItems = $("#main .module-item");
    vodItems.each((_, e) => {
      const $item = $(e);
      const href = $item.find(".module-item-pic a").attr("href");
      const vodName = $item.find(".module-item-pic img").attr("alt");
      let vodPic = $item.find(".module-item-pic img").attr("data-src");
      if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
        vodPic = baseUrl + vodPic;
      }
      const vodRemarks = $item.find(".module-item-text").text();
      const vodYear = $item.find(".module-item-caption span").first().text();

      if (href && vodName) {
        videos.push({
          vod_id: href,
          vod_name: vodName,
          vod_pic: vodPic || "",
          type_id: categoryId,
          type_name: "",
          vod_remarks: vodRemarks || "",
          vod_year: vodYear || "",
        });
      }
    });

    OmniBox.log("info", `解析完成,找到 ${videos.length} 个视频`);

    const autoFilters = parseFiltersFromHtml(response.body);
    let categoryFilters = autoFilters;

    if (categoryFilters.length === 0) {
      const preferredFilters = await getPreferredFilters([{ type_id: categoryId, type_name: "" }]);
      categoryFilters = preferredFilters[categoryId] || [];
    }

    const result = {
      list: videos,
      page: page,
      pagecount: 0,
      total: videos.length,
    };

    if (page === 1 && categoryFilters.length > 0) {
      result.filters = categoryFilters;
    }

    return result;
  } catch (error) {
    OmniBox.log("error", `获取分类数据失败: ${error.message}`);
    return {
      list: [],
      page: params.page || 1,
      pagecount: 0,
      total: 0,
    };
  }
}

function buildScrapedFileName(scrapeData, mapping, originalFileName) {
  if (!mapping || mapping.episodeNumber === 0 || (mapping.confidence && mapping.confidence < 0.5)) {
    return originalFileName;
  }

  if (scrapeData && scrapeData.episodes && Array.isArray(scrapeData.episodes)) {
    for (const episode of scrapeData.episodes) {
      if (episode.episodeNumber === mapping.episodeNumber && episode.seasonNumber === mapping.seasonNumber) {
        if (episode.name) {
          return `${episode.episodeNumber}.${episode.name}`;
        }
        break;
      }
    }
  }

  return originalFileName;
}

function normalizeEpisodeName(name = "") {
  return String(name || "")
    .replace(/\.[^.]+$/g, "")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function encodePlayMeta(obj = {}) {
  try {
    const raw = JSON.stringify(obj || {});
    return Buffer.from(raw, "utf8").toString("base64");
  } catch {
    return "";
  }
}

function decodePlayMeta(str = "") {
  try {
    if (!str) return {};
    const raw = Buffer.from(str, "base64").toString("utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

async function getDetailPageCached(videoId) {
  const detailCacheKey = buildCacheKey("muou:detailHtml", videoId);
  let detailPage = await getCachedJSON(detailCacheKey);
  if (!detailPage) {
    detailPage = await requestWithFailover(videoId);
    if (detailPage && detailPage.response && detailPage.response.statusCode === 200 && detailPage.response.body) {
      await setCachedJSON(detailCacheKey, detailPage, MUOU_CACHE_EX_SECONDS);
    }
  } else {
    logDetailDebug(`命中详情页缓存: ${videoId}`);
  }
  return detailPage;
}

async function getDriveInfoCached(shareURL) {
  const cacheKey = buildCacheKey("muou:driveInfo", shareURL);
  let driveInfo = await getCachedJSON(cacheKey);
  if (!driveInfo) {
    driveInfo = await OmniBox.getDriveInfoByShareURL(shareURL);
    await setCachedJSON(cacheKey, driveInfo, MUOU_CACHE_EX_SECONDS);
  }
  return driveInfo;
}

async function getRootFileListCached(shareURL) {
  const cacheKey = buildCacheKey("muou:rootFiles", shareURL);
  let fileList = await getCachedJSON(cacheKey);
  if (!fileList) {
    fileList = await OmniBox.getDriveFileList(shareURL, "0");
    if (fileList && fileList.files && Array.isArray(fileList.files)) {
      await setCachedJSON(cacheKey, fileList, MUOU_CACHE_EX_SECONDS);
    }
  } else {
    logDetailDebug(`命中根目录文件列表缓存: ${shareURL}`);
  }
  return fileList;
}

async function getAllVideoFilesCached(shareURL, rootFiles) {
  const cacheKey = buildCacheKey("muou:videoFiles", shareURL);
  let allVideoFiles = await getCachedJSON(cacheKey);
  if (!Array.isArray(allVideoFiles) || allVideoFiles.length === 0) {
    allVideoFiles = await getAllVideoFiles(shareURL, rootFiles, "0");
    if (Array.isArray(allVideoFiles) && allVideoFiles.length > 0) {
      await setCachedJSON(cacheKey, allVideoFiles, MUOU_CACHE_EX_SECONDS);
    }
  } else {
    logDetailDebug(`命中视频文件缓存: ${shareURL}, 数量: ${allVideoFiles.length}`);
  }
  return allVideoFiles;
}

function buildMergedVideoFilesForScraping(panUrlResults, videoId) {
  const mergedVideoFilesForScraping = [];
  for (const result of panUrlResults) {
    const { shareURL, allVideoFiles } = result;
    for (const file of allVideoFiles) {
      const fileId = file.fid || file.file_id || "";
      const formattedFileId = fileId ? `${shareURL}|${fileId}|${videoId}` : fileId;
      mergedVideoFilesForScraping.push({
        ...file,
        fid: formattedFileId,
        file_id: formattedFileId,
        _shareURL: shareURL,
      });
    }
  }
  return mergedVideoFilesForScraping;
}

async function getMergedMetadataCached(videoId, vodName, mergedVideoFilesForScraping) {
  const metadataCacheKey = buildCacheKey("muou:metadata", videoId);
  const metadataRefreshLockKey = buildCacheKey("muou:metadataRefreshLock", videoId);

  let scrapeData = null;
  let videoMappings = [];
  let scrapeType = "";
  const cachedMetadata = await getCachedJSON(metadataCacheKey);

  if (cachedMetadata) {
    scrapeData = cachedMetadata.scrapeData || null;
    videoMappings = cachedMetadata.videoMappings || [];
    scrapeType = cachedMetadata.scrapeType || "";
    logDetailDebug(`命中统一元数据缓存: ${videoId}, 映射数量: ${videoMappings.length}`);
  }

  const refreshMetadataInBackground = async () => {
    const refreshLock = await getCachedJSON(metadataRefreshLockKey);
    if (refreshLock) return;
    await setCachedJSON(metadataRefreshLockKey, { refreshing: true }, MUOU_CACHE_EX_SECONDS);

    try {
      logDetailDebug(`后台统一刷新元数据: ${videoId}`);
      await OmniBox.processScraping(videoId, vodName, vodName, mergedVideoFilesForScraping);
      const metadata = await OmniBox.getScrapeMetadata(videoId);
      await setCachedJSON(metadataCacheKey, {
        scrapeData: metadata?.scrapeData || null,
        videoMappings: metadata?.videoMappings || [],
        scrapeType: metadata?.scrapeType || "",
      }, MUOU_CACHE_EX_SECONDS);
    } catch (error) {
      OmniBox.log("warn", `后台统一刷新元数据失败: ${error.message}`);
    }
  };

  if (!cachedMetadata && mergedVideoFilesForScraping.length > 0) {
    try {
      OmniBox.log("info", `未命中统一元数据缓存，开始同步刮削: ${videoId}, 文件数: ${mergedVideoFilesForScraping.length}`);
      await OmniBox.processScraping(videoId, vodName, vodName, mergedVideoFilesForScraping);
      const metadata = await OmniBox.getScrapeMetadata(videoId);
      scrapeData = metadata?.scrapeData || null;
      videoMappings = metadata?.videoMappings || [];
      scrapeType = metadata?.scrapeType || "";
      await setCachedJSON(metadataCacheKey, {
        scrapeData,
        videoMappings,
        scrapeType,
      }, MUOU_CACHE_EX_SECONDS);
      if (scrapeData) {
        OmniBox.log("info", `同步统一获取元数据成功, 标题: ${scrapeData.title || "未知"}, 映射数量: ${videoMappings.length}`);
      }
    } catch (error) {
      OmniBox.log("error", `同步统一获取元数据失败: ${error.message}`);
      if (error.stack) {
        OmniBox.log("error", `同步统一获取元数据错误堆栈: ${error.stack}`);
      }
    }
  } else if (cachedMetadata) {
    refreshMetadataInBackground().catch((error) => {
      OmniBox.log("warn", `异步统一刷新元数据失败: ${error.message}`);
    });
  }

  return {
    scrapeData,
    videoMappings,
    scrapeType,
    cachedMetadata,
  };
}

function parseVodBaseInfo($, baseUrl) {
  let vodName = $(".page-title")[0]?.children?.[0]?.data || "";
  let vodPic = $($(".mobile-play")).find(".lazyload")[0]?.attribs?.["data-src"] || "";
  if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
    vodPic = baseUrl + vodPic;
  }

  let vodYear = "";
  let vodDirector = "";
  let vodActor = "";
  let vodContent = "";

  const videoItems = $(".video-info-itemtitle");
  for (const item of videoItems) {
    const key = $(item).text();
    const vItems = $(item).next().find("a");
    const value = vItems
      .map((i, el) => {
        const text = $(el).text().trim();
        return text ? text : null;
      })
      .get()
      .filter(Boolean)
      .join(", ");

    if (key.includes("剧情")) {
      vodContent = $(item).next().find("p").text().trim();
    } else if (key.includes("导演")) {
      vodDirector = value.trim();
    } else if (key.includes("主演")) {
      vodActor = value.trim();
    }
  }

  return {
    vodName,
    vodPic,
    vodYear,
    vodDirector,
    vodActor,
    vodContent,
  };
}

function extractPanUrls($) {
  const panUrls = [];
  const items = $(".module-row-info");
  for (const item of items) {
    const shareUrl = $(item).find("p")[0]?.children?.[0]?.data;
    if (shareUrl) {
      panUrls.push(shareUrl.trim());
    }
  }
  return panUrls;
}

async function collectDriveTypeCountMap(panUrls = []) {
  const driveTypeCountMap = {};
  for (const shareURL of panUrls) {
    try {
      const driveInfo = await getDriveInfoCached(shareURL);
      const displayName = driveInfo?.displayName || "未知网盘";
      driveTypeCountMap[displayName] = (driveTypeCountMap[displayName] || 0) + 1;
    } catch (error) {
      OmniBox.log("warn", `统计网盘类型失败: ${shareURL}, error=${error.message}`);
    }
  }
  return driveTypeCountMap;
}

/**
 * 获取视频详情
 */
async function detail(params, context) {
  try {
    const videoId = params.videoId || "";

    if (!videoId) {
      throw new Error("视频ID不能为空");
    }

    const source = params.source || "";
    OmniBox.log("info", `获取视频详情: videoId=${videoId}, source=${source}`);

    const detailPage = await getDetailPageCached(videoId);
    const { response, baseUrl } = detailPage;

    if (response.statusCode !== 200 || !response.body) {
      throw new Error(`请求失败: HTTP ${response.statusCode}`);
    }

    const $ = cheerio.load(response.body);
    const {
      vodName,
      vodPic,
      vodYear,
      vodDirector,
      vodActor,
      vodContent,
    } = parseVodBaseInfo($, baseUrl);

    const panUrls = extractPanUrls($);
    logDetailDebug(`解析完成,网盘链接数=${panUrls.length}`);

    let playSources = [];

    const driveTypeCountMap = await collectDriveTypeCountMap(panUrls);
    const driveTypeCurrentIndexMap = {};

    // ==================== 并行处理网盘链接（方案 A：先收集所有文件，再统一刮削一次） ====================
    const panUrlTasks = panUrls.map(async (shareURL) => {
      try {
        logDetailDebug(`处理网盘链接: ${shareURL}`);

        const driveInfo = await getDriveInfoCached(shareURL);
        let displayName = driveInfo.displayName || "未知网盘";

        const totalCount = driveTypeCountMap[displayName] || 0;
        if (totalCount > 1) {
          driveTypeCurrentIndexMap[displayName] = (driveTypeCurrentIndexMap[displayName] || 0) + 1;
          displayName = `${displayName}${driveTypeCurrentIndexMap[displayName]}`;
        }

        logDetailDebug(`网盘类型: ${displayName}, driveType: ${driveInfo.driveType}`);

        const fileList = await getRootFileListCached(shareURL);

        if (!fileList || !fileList.files || !Array.isArray(fileList.files)) {
          OmniBox.log("warn", `获取文件列表失败: ${shareURL}`);
          return null;
        }

        logDetailDebug(`从分享链接 ${shareURL} 获取文件列表成功,文件数量: ${fileList.files.length}`);

        const allVideoFiles = await getAllVideoFilesCached(shareURL, fileList.files);

        if (!allVideoFiles || allVideoFiles.length === 0) {
          OmniBox.log("warn", `未找到视频文件: ${shareURL}`);
          return null;
        }

        logDetailDebug(`递归获取视频文件完成,视频文件数量: ${allVideoFiles.length}`);

        return {
          shareURL,
          displayName,
          driveInfo,
          allVideoFiles,
        };
      } catch (error) {
        OmniBox.log("error", `处理网盘链接失败: ${shareURL}, 错误: ${error.message}`);
        return null;
      }
    });

    const panUrlResults = (await Promise.all(panUrlTasks)).filter(Boolean);
    OmniBox.log("info", `方案A: 有效网盘结果数量=${panUrlResults.length}`);

    const mergedVideoFilesForScraping = buildMergedVideoFilesForScraping(panUrlResults, videoId);
    OmniBox.log("info", `方案A: 合并用于刮削的视频文件数量=${mergedVideoFilesForScraping.length}`);

    const {
      scrapeData,
      videoMappings,
      scrapeType,
    } = await getMergedMetadataCached(videoId, vodName, mergedVideoFilesForScraping);
    logDetailDebug(`方案A: 当前统一元数据映射数量=${videoMappings.length}, scrapeType=${scrapeType || "unknown"}`);

    // 处理结果并构建播放源
    for (const result of panUrlResults) {
      const { shareURL, displayName, driveInfo, allVideoFiles } = result;

      let sourceNames = [displayName];
      const targetDriveTypes = DRIVE_TYPE_CONFIG;
      const configSourceNames = SOURCE_NAMES_CONFIG;

      if (targetDriveTypes.includes(driveInfo.driveType)) {
        sourceNames = [...configSourceNames];
        OmniBox.log("info", `${displayName} 匹配成功,初始线路设置为: ${sourceNames.join(", ")}`);
        sourceNames = filterSourceNamesForCaller(sourceNames, source, context);
        OmniBox.log("info", `来源=${source || "unknown"},最终线路设置为: ${sourceNames.join(", ")}`);
      }

      for (const sourceName of sourceNames) {
        const episodes = [];
        for (const file of allVideoFiles) {
          let fileName = file.file_name || "";
          const fileId = file.fid || "";
          const fileSize = file.size || file.file_size || 0;

          if (!fileName || !fileId) {
            continue;
          }

          const formattedFileId = fileId ? `${shareURL}|${fileId}|${videoId}` : "";

          let matchedMapping = null;
          if (scrapeData && videoMappings && Array.isArray(videoMappings) && videoMappings.length > 0) {
            for (const mapping of videoMappings) {
              if (mapping && mapping.fileId === formattedFileId) {
                matchedMapping = mapping;
                const newFileName = buildScrapedFileName(scrapeData, mapping, fileName);
                if (newFileName && newFileName !== fileName) {
                  fileName = newFileName;
                  OmniBox.log("info", `应用刮削文件名: ${file.file_name} -> ${fileName}`);
                }
                break;
              }
            }
          }

          const normalizedOriginalEpisodeName = normalizeEpisodeName(file.file_name || fileName);
          const playMeta = encodePlayMeta({
            sid: videoId,
            fid: fileId ? `${shareURL}|${fileId}` : "",
            v: vodName || "",
            t: vodName,
            e: normalizedOriginalEpisodeName,
          });
          const basePlayId = fileId ? `${shareURL}|${fileId}` : "";

          let displayFileName = fileName;
          if (fileSize > 0) {
            const fileSizeStr = formatFileSize(fileSize);
            if (fileSizeStr) {
              displayFileName = `[${fileSizeStr}] ${fileName}`;
            }
          }

          const episode = {
            name: displayFileName,
            playId: playMeta ? `${basePlayId}|${playMeta}` : basePlayId,
            size: fileSize > 0 ? fileSize : undefined,
            rawName: file.file_name || "",
          };

          if (matchedMapping) {
            if (matchedMapping.seasonNumber !== undefined && matchedMapping.seasonNumber !== null) {
              episode._seasonNumber = matchedMapping.seasonNumber;
            }
            if (matchedMapping.episodeNumber !== undefined && matchedMapping.episodeNumber !== null) {
              episode._episodeNumber = matchedMapping.episodeNumber;
            }
            if (matchedMapping.episodeName) {
              episode.episodeName = matchedMapping.episodeName;
            }
            if (matchedMapping.episodeOverview) {
              episode.episodeOverview = matchedMapping.episodeOverview;
            }
            if (matchedMapping.episodeAirDate) {
              episode.episodeAirDate = matchedMapping.episodeAirDate;
            }
            if (matchedMapping.episodeStillPath) {
              episode.episodeStillPath = matchedMapping.episodeStillPath;
            }
            if (matchedMapping.episodeVoteAverage !== undefined && matchedMapping.episodeVoteAverage !== null) {
              episode.episodeVoteAverage = matchedMapping.episodeVoteAverage;
            }
            if (matchedMapping.episodeRuntime !== undefined && matchedMapping.episodeRuntime !== null) {
              episode.episodeRuntime = matchedMapping.episodeRuntime;
            }
          }

          if (!episode.episodeName) {
            episode.episodeName = normalizedOriginalEpisodeName || file.file_name || fileName;
          }

          if (episode.name && episode.playId) {
            episodes.push(episode);
          }
        }

        if (scrapeData && episodes.length > 0) {
          const hasEpisodeNumber = episodes.some((ep) => ep._episodeNumber !== undefined);
          if (hasEpisodeNumber) {
            OmniBox.log("info", `检测到刮削数据，按 episodeNumber 排序剧集列表，共 ${episodes.length} 集`);
            episodes.sort((a, b) => {
              const seasonA = a._seasonNumber !== undefined ? a._seasonNumber : 0;
              const seasonB = b._seasonNumber !== undefined ? b._seasonNumber : 0;
              if (seasonA !== seasonB) return seasonA - seasonB;
              const episodeA = a._episodeNumber !== undefined ? a._episodeNumber : 0;
              const episodeB = b._episodeNumber !== undefined ? b._episodeNumber : 0;
              if (episodeA !== episodeB) return episodeA - episodeB;
              return a.name.localeCompare(b.name, 'zh-CN');
            });
          }
        }

        OmniBox.log("info", `方案A: shareURL=${shareURL}, sourceName=${sourceName}, episodes=${episodes.length}`);
        if (episodes.length > 0) {
          const lineName = targetDriveTypes.includes(driveInfo.driveType)
            ? `${displayName}-${sourceName}`
            : displayName;
          playSources.push({
            name: lineName,
            episodes,
          });
        }
      }
    }
    OmniBox.log("info", `方案A: 最终线路数=${playSources.length}`);
    if (Array.isArray(playSources) && playSources.length > 1 && DRIVE_ORDER.length > 0) {
      playSources = sortPlaySourcesByDriveOrder(playSources);
      OmniBox.log("info", `[detail] 按 DRIVE_ORDER 排序后线路顺序: ${playSources.map(item => item.name).join(' | ')}`);
    }

    const vodDetail = {
      vod_id: videoId,
      vod_name: vodName,
      vod_pic: vodPic,
      vod_year: vodYear,
      vod_director: vodDirector,
      vod_actor: vodActor,
      vod_content: vodContent || `网盘资源,共${panUrls.length}个网盘链接`,
      vod_play_sources: playSources.length > 0 ? playSources : undefined,
      vod_remarks: "",
    };

    return {
      list: [vodDetail],
    };
  } catch (error) {
    OmniBox.log("error", `获取视频详情失败: ${error.message}`);
    return {
      list: [],
    };
  }
}

/**
 * 搜索视频
 */
async function search(params) {
  try {
    const keyword = params.keyword || "";
    const page = parseInt(params.page || "1", 10);

    OmniBox.log("info", `搜索视频: keyword=${keyword}, page=${page}`);

    if (!keyword) {
      OmniBox.log("warn", "搜索关键词为空");
      return {
        list: [],
        page: 1,
        pagecount: 0,
        total: 0,
      };
    }

    const searchPath = `/index.php/vod/search/page/${page}/wd/${keyword}.html`;
    const { response, baseUrl } = await requestWithFailover(searchPath);

    if (response.statusCode !== 200 || !response.body) {
      OmniBox.log("error", `请求失败: HTTP ${response.statusCode}`);
      return {
        list: [],
        page: page,
        pagecount: 0,
        total: 0,
      };
    }

    const $ = cheerio.load(response.body);
    const videos = [];

    const items = $(".module-search-item");
    for (const item of items) {
      const $item = $(item);
      const videoSerial = $item.find(".video-serial")[0];
      const vodPicImg = $item.find(".module-item-pic > img")[0];

      if (videoSerial && videoSerial.attribs) {
        const vodId = videoSerial.attribs.href || "";
        const vodName = videoSerial.attribs.title || "";
        let vodPic = vodPicImg?.attribs?.["data-src"] || "";
        if (vodPic && !vodPic.startsWith("http://") && !vodPic.startsWith("https://")) {
          vodPic = baseUrl + vodPic;
        }
        const vodRemarks = $($item.find(".video-serial")[0]).text() || "";

        if (vodId && vodName) {
          videos.push({
            vod_id: vodId,
            vod_name: vodName,
            vod_pic: vodPic,
            type_id: "",
            type_name: "",
            vod_remarks: vodRemarks,
          });
        }
      }
    }

    OmniBox.log("info", `搜索完成,找到 ${videos.length} 个结果`);

    return {
      list: videos,
      page: page,
      pagecount: 0,
      total: videos.length,
    };
  } catch (error) {
    OmniBox.log("error", `搜索视频失败: ${error.message}`);
    return {
      list: [],
      page: params.page || 1,
      pagecount: 0,
      total: 0,
    };
  }
}

async function play(params, context) {
  try {
    const flag = params.flag || "";
    const playId = params.playId || "";
    const source = resolveCallerSource(params, context);

    OmniBox.log("info", `获取播放地址: flag=${flag}, playId=${playId}`);

    if (!playId) {
      throw new Error("播放参数不能为空");
    }

    const idParts = playId.split("|");
    if (idParts.length < 2) {
      throw new Error("播放参数格式错误,应为:分享链接|文件ID");
    }

    let playMeta = {};
    let coreParts = [...idParts];
    if (coreParts.length >= 3) {
      const possibleMeta = coreParts[coreParts.length - 1] || "";
      try {
        playMeta = decodePlayMeta(possibleMeta);
        if (playMeta && typeof playMeta === "object" && (playMeta.v || playMeta.e || playMeta.fid || playMeta.sid || playMeta.t)) {
          coreParts = coreParts.slice(0, -1);
        } else {
          playMeta = {};
        }
      } catch (_) {
        playMeta = {};
      }
    }

    const shareURL = coreParts[0] || "";
    const fileId = coreParts[1] || "";
    const videoId = playMeta.sid || coreParts[2] || "";

    if (!shareURL || !fileId) {
      throw new Error("分享链接或文件ID不能为空");
    }

    OmniBox.log("info", `解析参数: shareURL=${shareURL}, fileId=${fileId}`);

    const routeType = resolveRouteType(flag, source, context);
    OmniBox.log("info", `使用线路: ${routeType}`);

    // 并行: 主链路(播放地址) + 辅链路(刮削元数据/弹幕)
    const playInfoPromise = OmniBox.getDriveVideoPlayInfo(shareURL, fileId, routeType);
    const metadataPromise = (async () => {
      const result = {
        danmakuList: [],
        scrapeTitle: "",
        scrapePic: "",
        episodeNumber: null,
        episodeName: params.episodeName || playMeta.e || "",
      };

      if (!videoId) return result;

      try {
        const metadata = await OmniBox.getScrapeMetadata(videoId);
        if (!metadata || !metadata.scrapeData || !Array.isArray(metadata.videoMappings)) {
          return result;
        }

        const formattedFileId = `${shareURL}|${fileId}|${videoId}`;
        const matchedMapping = metadata.videoMappings.find((mapping) => mapping && mapping.fileId === formattedFileId);
        if (!matchedMapping) {
          return result;
        }

        const scrapeData = metadata.scrapeData;
        result.scrapeTitle = scrapeData.title || "";
        if (scrapeData.posterPath) {
          result.scrapePic = `https://image.tmdb.org/t/p/w500${scrapeData.posterPath}`;
        }

        if (matchedMapping.episodeNumber) {
          result.episodeNumber = matchedMapping.episodeNumber;
        }
        if (matchedMapping.episodeName && !result.episodeName) {
          result.episodeName = matchedMapping.episodeName;
        }

        let fileName = "";
        const scrapeType = metadata.scrapeType || "";
        if (scrapeType === "movie") {
          fileName = scrapeData.title || "";
        } else {
          const title = scrapeData.title || "";
          const seasonAirYear = scrapeData.seasonAirYear || "";
          const seasonNumber = matchedMapping.seasonNumber || 1;
          const episodeNum = matchedMapping.episodeNumber || 1;
          fileName = `${title}.${seasonAirYear}.S${String(seasonNumber).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
        }

        if (fileName) {
          OmniBox.log("info", `生成fileName用于弹幕匹配: ${fileName}`);
          const matchedDanmaku = await OmniBox.getDanmakuByFileName(fileName);
          if (Array.isArray(matchedDanmaku) && matchedDanmaku.length > 0) {
            result.danmakuList = matchedDanmaku;
            OmniBox.log("info", `弹幕匹配成功,找到 ${matchedDanmaku.length} 条弹幕`);
          }
        }
      } catch (error) {
        OmniBox.log("warn", `弹幕匹配失败: ${error.message}`);
      }

      return result;
    })();

    const [playInfoResult, metadataResult] = await Promise.allSettled([playInfoPromise, metadataPromise]);

    if (playInfoResult.status !== "fulfilled") {
      throw new Error(playInfoResult.reason && playInfoResult.reason.message ? playInfoResult.reason.message : "无法获取播放地址");
    }

    const playInfo = playInfoResult.value;
    if (!playInfo || !playInfo.url || !Array.isArray(playInfo.url) || playInfo.url.length === 0) {
      throw new Error("无法获取播放地址");
    }

    let danmakuList = [];
    let scrapeTitle = "";
    let scrapePic = "";
    let episodeNumber = null;
    let episodeName = params.episodeName || "";

    if (metadataResult.status === "fulfilled" && metadataResult.value) {
      danmakuList = metadataResult.value.danmakuList || [];
      scrapeTitle = metadataResult.value.scrapeTitle || "";
      scrapePic = metadataResult.value.scrapePic || "";
      episodeNumber = metadataResult.value.episodeNumber || null;
      episodeName = metadataResult.value.episodeName || episodeName;
    } else if (metadataResult.status === "rejected") {
      OmniBox.log("warn", `获取元数据失败(不影响播放): ${metadataResult.reason && metadataResult.reason.message ? metadataResult.reason.message : metadataResult.reason}`);
    }

    try {
      const sourceId = context.sourceId;
      if (sourceId) {
        const title = params.title || scrapeTitle || shareURL;
        const pic = params.pic || scrapePic || "";

        OmniBox.addPlayHistory({
          vodId: videoId,
          title: title,
          pic: pic,
          episode: playId,
          sourceId: sourceId,
          episodeNumber: episodeNumber,
          episodeName: episodeName,
        })
          .then((added) => {
            if (added) {
              OmniBox.log("info", `已添加观看记录: ${title}`);
            } else {
              OmniBox.log("info", `观看记录已存在,跳过添加: ${title}`);
            }
          })
          .catch((error) => {
            OmniBox.log("warn", `添加观看记录失败: ${error.message}`);
          });
      }
    } catch (error) {
      OmniBox.log("warn", `添加观看记录失败: ${error.message}`);
    }

    const urlList = playInfo.url || [];
    const urlsResult = [];
    for (const item of urlList) {
      urlsResult.push({
        name: item.name || "播放",
        url: item.url,
      });
    }

    const header = playInfo.header || {};
    const finalDanmakuList = danmakuList && danmakuList.length > 0 ? danmakuList : playInfo.danmaku || [];

    return {
      urls: urlsResult,
      header: header,
      parse: 0,
      danmaku: finalDanmakuList};
  } catch (error) {
    OmniBox.log("error", `播放接口失败: ${error.message}`);
    return {
      urls: [],
      header: {},
      danmaku: []};
  }
}

async function getDynamicFilters() {
  return {
    "1": [
      {
        "key": "tid",
        "name": "类型",
        "init": "",
        "value": [
          {
            "name": "全部类型",
            "value": ""
          },
          {
            "name": "动作片",
            "value": "12"
          },
          {
            "name": "喜剧片",
            "value": "102"
          },
          {
            "name": "爱情片",
            "value": "103"
          },
          {
            "name": "科幻片",
            "value": "104"
          },
          {
            "name": "剧情片",
            "value": "105"
          },
          {
            "name": "悬疑片",
            "value": "106"
          },
          {
            "name": "惊悚片",
            "value": "107"
          },
          {
            "name": "恐怖片",
            "value": "108"
          },
          {
            "name": "犯罪片",
            "value": "109"
          },
          {
            "name": "武侠片",
            "value": "110"
          },
          {
            "name": "冒险片",
            "value": "111"
          },
          {
            "name": "奇幻片",
            "value": "112"
          },
          {
            "name": "战争片",
            "value": "113"
          },
          {
            "name": "记录片",
            "value": "114"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部地区",
            "value": ""
          },
          {
            "name": "大陆",
            "value": "大陆"
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "香港",
            "value": "香港"
          },
          {
            "name": "中国香港",
            "value": "中国香港"
          },
          {
            "name": "台湾",
            "value": "台湾"
          },
          {
            "name": "中国台湾",
            "value": "中国台湾"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "韩国",
            "value": "韩国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "法国",
            "value": "法国"
          },
          {
            "name": "意大利",
            "value": "意大利"
          },
          {
            "name": "德国",
            "value": "德国"
          },
          {
            "name": "西班牙",
            "value": "西班牙"
          },
          {
            "name": "泰国",
            "value": "泰国"
          },
          {
            "name": "其它",
            "value": "其它"
          }
        ]
      },
      {
        "key": "lang",
        "name": "语言",
        "init": "",
        "value": [
          {
            "name": "全部语言",
            "value": ""
          },
          {
            "name": "国语",
            "value": "国语"
          },
          {
            "name": "英语",
            "value": "英语"
          },
          {
            "name": "粤语",
            "value": "粤语"
          },
          {
            "name": "闽南语",
            "value": "闽南语"
          },
          {
            "name": "韩语",
            "value": "韩语"
          },
          {
            "name": "日语",
            "value": "日语"
          },
          {
            "name": "法语",
            "value": "法语"
          },
          {
            "name": "德语",
            "value": "德语"
          },
          {
            "name": "其它",
            "value": "其它"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部时间",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "全部字母",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "默认排序",
            "value": ""
          },
          {
            "name": "人气",
            "value": "hits"
          },
          {
            "name": "评分",
            "value": "score"
          }
        ]
      }
    ],
    "2": [
      {
        "key": "tid",
        "name": "类型",
        "init": "",
        "value": [
          {
            "name": "全部类型",
            "value": ""
          },
          {
            "name": "国产剧",
            "value": "201"
          },
          {
            "name": "港台剧",
            "value": "202"
          },
          {
            "name": "欧美韩剧",
            "value": "203"
          },
          {
            "name": "日韩剧",
            "value": "204"
          },
          {
            "name": "海外剧",
            "value": "205"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部地区",
            "value": ""
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "大陆",
            "value": "大陆"
          },
          {
            "name": "韩国",
            "value": "韩国"
          },
          {
            "name": "香港",
            "value": "香港"
          },
          {
            "name": "台湾",
            "value": "台湾"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "泰国",
            "value": "泰国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "新加坡",
            "value": "新加坡"
          },
          {
            "name": "其他",
            "value": "其他"
          }
        ]
      },
      {
        "key": "lang",
        "name": "语言",
        "init": "",
        "value": [
          {
            "name": "全部语言",
            "value": ""
          },
          {
            "name": "国语",
            "value": "国语"
          },
          {
            "name": "英语",
            "value": "英语"
          },
          {
            "name": "粤语",
            "value": "粤语"
          },
          {
            "name": "闽南语",
            "value": "闽南语"
          },
          {
            "name": "韩语",
            "value": "韩语"
          },
          {
            "name": "日语",
            "value": "日语"
          },
          {
            "name": "其它",
            "value": "其它"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部时间",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "全部字母",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "默认排序",
            "value": ""
          },
          {
            "name": "人气",
            "value": "hits"
          },
          {
            "name": "评分",
            "value": "score"
          }
        ]
      }
    ],
    "3": [
      {
        "key": "tid",
        "name": "类型",
        "init": "",
        "value": [
          {
            "name": "全部类型",
            "value": ""
          },
          {
            "name": "大陆综艺",
            "value": "301"
          },
          {
            "name": "港台综艺",
            "value": "302"
          },
          {
            "name": "欧美综艺",
            "value": "303"
          },
          {
            "name": "日韩综艺",
            "value": "304"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部地区",
            "value": ""
          },
          {
            "name": "大陆",
            "value": "大陆"
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "韩国",
            "value": "韩国"
          },
          {
            "name": "香港",
            "value": "香港"
          },
          {
            "name": "台湾",
            "value": "台湾"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "法国",
            "value": "法国"
          },
          {
            "name": "意大利",
            "value": "意大利"
          },
          {
            "name": "德国",
            "value": "德国"
          },
          {
            "name": "西班牙",
            "value": "西班牙"
          },
          {
            "name": "泰国",
            "value": "泰国"
          },
          {
            "name": "其它",
            "value": "其它"
          }
        ]
      },
      {
        "key": "lang",
        "name": "语言",
        "init": "",
        "value": [
          {
            "name": "全部语言",
            "value": ""
          },
          {
            "name": "国语",
            "value": "国语"
          },
          {
            "name": "英语",
            "value": "英语"
          },
          {
            "name": "粤语",
            "value": "粤语"
          },
          {
            "name": "闽南语",
            "value": "闽南语"
          },
          {
            "name": "韩语",
            "value": "韩语"
          },
          {
            "name": "日语",
            "value": "日语"
          },
          {
            "name": "法语",
            "value": "法语"
          },
          {
            "name": "德语",
            "value": "德语"
          },
          {
            "name": "其它",
            "value": "其它"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部时间",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "全部字母",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "默认排序",
            "value": ""
          },
          {
            "name": "人气",
            "value": "hits"
          },
          {
            "name": "评分",
            "value": "score"
          }
        ]
      }
    ],
    "4": [
      {
        "key": "tid",
        "name": "类型",
        "init": "",
        "value": [
          {
            "name": "全部类型",
            "value": ""
          },
          {
            "name": "动画片",
            "value": "401"
          },
          {
            "name": "国产动漫",
            "value": "402"
          },
          {
            "name": "日韩动漫",
            "value": "403"
          },
          {
            "name": "欧美动漫",
            "value": "404"
          },
          {
            "name": "港台动漫",
            "value": "405"
          },
          {
            "name": "海外动漫",
            "value": "406"
          }
        ]
      },
      {
        "key": "area",
        "name": "地区",
        "init": "",
        "value": [
          {
            "name": "全部地区",
            "value": ""
          },
          {
            "name": "大陆",
            "value": "大陆"
          },
          {
            "name": "中国大陆",
            "value": "中国大陆"
          },
          {
            "name": "韩国",
            "value": "韩国"
          },
          {
            "name": "香港",
            "value": "香港"
          },
          {
            "name": "台湾",
            "value": "台湾"
          },
          {
            "name": "美国",
            "value": "美国"
          },
          {
            "name": "英国",
            "value": "英国"
          },
          {
            "name": "日本",
            "value": "日本"
          },
          {
            "name": "法国",
            "value": "法国"
          },
          {
            "name": "意大利",
            "value": "意大利"
          },
          {
            "name": "德国",
            "value": "德国"
          },
          {
            "name": "西班牙",
            "value": "西班牙"
          },
          {
            "name": "泰国",
            "value": "泰国"
          },
          {
            "name": "其它",
            "value": "其它"
          }
        ]
      },
      {
        "key": "lang",
        "name": "语言",
        "init": "",
        "value": [
          {
            "name": "全部语言",
            "value": ""
          },
          {
            "name": "国语",
            "value": "国语"
          },
          {
            "name": "英语",
            "value": "英语"
          },
          {
            "name": "粤语",
            "value": "粤语"
          },
          {
            "name": "闽南语",
            "value": "闽南语"
          },
          {
            "name": "韩语",
            "value": "韩语"
          },
          {
            "name": "日语",
            "value": "日语"
          },
          {
            "name": "法语",
            "value": "法语"
          },
          {
            "name": "德语",
            "value": "德语"
          },
          {
            "name": "其它",
            "value": "其它"
          }
        ]
      },
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部时间",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          },
          {
            "name": "2022",
            "value": "2022"
          },
          {
            "name": "2021",
            "value": "2021"
          },
          {
            "name": "2020",
            "value": "2020"
          },
          {
            "name": "2019",
            "value": "2019"
          },
          {
            "name": "2018",
            "value": "2018"
          },
          {
            "name": "2017",
            "value": "2017"
          },
          {
            "name": "2016",
            "value": "2016"
          },
          {
            "name": "2015",
            "value": "2015"
          },
          {
            "name": "2014",
            "value": "2014"
          },
          {
            "name": "2013",
            "value": "2013"
          },
          {
            "name": "2012",
            "value": "2012"
          },
          {
            "name": "2011",
            "value": "2011"
          },
          {
            "name": "2010",
            "value": "2010"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "全部字母",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "默认排序",
            "value": ""
          },
          {
            "name": "人气",
            "value": "hits"
          },
          {
            "name": "评分",
            "value": "score"
          }
        ]
      }
    ],
    "30": [
      {
        "key": "year",
        "name": "时间",
        "init": "",
        "value": [
          {
            "name": "全部时间",
            "value": ""
          },
          {
            "name": "2026",
            "value": "2026"
          },
          {
            "name": "2025",
            "value": "2025"
          },
          {
            "name": "2024",
            "value": "2024"
          },
          {
            "name": "2023",
            "value": "2023"
          }
        ]
      },
      {
        "key": "letter",
        "name": "字母",
        "init": "",
        "value": [
          {
            "name": "全部字母",
            "value": ""
          },
          {
            "name": "A",
            "value": "A"
          },
          {
            "name": "B",
            "value": "B"
          },
          {
            "name": "C",
            "value": "C"
          },
          {
            "name": "D",
            "value": "D"
          },
          {
            "name": "E",
            "value": "E"
          },
          {
            "name": "F",
            "value": "F"
          },
          {
            "name": "G",
            "value": "G"
          },
          {
            "name": "H",
            "value": "H"
          },
          {
            "name": "I",
            "value": "I"
          },
          {
            "name": "J",
            "value": "J"
          },
          {
            "name": "K",
            "value": "K"
          },
          {
            "name": "L",
            "value": "L"
          },
          {
            "name": "M",
            "value": "M"
          },
          {
            "name": "name",
            "value": "name"
          },
          {
            "name": "O",
            "value": "O"
          },
          {
            "name": "P",
            "value": "P"
          },
          {
            "name": "Q",
            "value": "Q"
          },
          {
            "name": "R",
            "value": "R"
          },
          {
            "name": "S",
            "value": "S"
          },
          {
            "name": "T",
            "value": "T"
          },
          {
            "name": "U",
            "value": "U"
          },
          {
            "name": "value",
            "value": "value"
          },
          {
            "name": "W",
            "value": "W"
          },
          {
            "name": "X",
            "value": "X"
          },
          {
            "name": "Y",
            "value": "Y"
          },
          {
            "name": "Z",
            "value": "Z"
          },
          {
            "name": "0-9",
            "value": "0-9"
          }
        ]
      },
      {
        "key": "sort",
        "name": "排序",
        "init": "",
        "value": [
          {
            "name": "默认排序",
            "value": ""
          },
          {
            "name": "人气",
            "value": "hits"
          },
          {
            "name": "评分",
            "value": "score"
          }
        ]
      }
    ]
  };
}

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
