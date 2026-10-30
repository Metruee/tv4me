#!/usr/bin/env python3
"""拉取 Silent1566/OmniBox-Spider -> 逐个实跑验活 -> 去重 -> 按体积分片 -> 版本自增。

设计要点：
1. 并发验活（8 线程）；
2. 排除非点播源目录（模板/拦截器/定时任务/Emby/直播/流媒体/已失效待修复/配置/tests）；
3. 去重：内容 SHA256 + 归一化站名（同站点不同实现只留体积最大的一个）；
4. 分片：单文件不超过 MAX_KB（默认 200KB），避免 OmniBox 加载/保存超时；
5. 容错：连续失败 <=2 次且上一版收录过的仍保留（config/health.json）。
"""
import os, sys, json, tarfile, shutil, tempfile, subprocess, datetime, hashlib, re, urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = "Silent1566/OmniBox-Spider"
TAR = "https://gh-proxy.com/https://codeload.github.com/%s/tar.gz/refs/heads/main" % REPO
HEALTH = os.path.join(ROOT, "config", "health.json")
CFG = os.path.join(ROOT, "config", "merged.json")
GRACE = 2
MAX_KB = int(os.environ.get("MAX_KB", "200"))

EXCLUDE = {"tests", ".github", "模板", "拦截器", "定时任务", "Emby", "直播", "流媒体",
           "已失效待修复", "配置", "node_modules"}

EXTRA_GROUPS = [
    ("短剧聚合(合并)", "自动同步：短剧", ["短剧/"]),
    ("音乐听书聚合(合并)", "自动同步：音乐听书", ["音乐/", "听书/"]),
    ("教育(合并)", "自动同步：纯教育", ["教育/"]),
    ("动漫(合并)", "自动同步：动漫", ["动漫/"]),
    ("综合导航(合并)", "自动同步：综合导航", ["综合/", "导航/"]),
]

def letter(i):
    return chr(ord("A") + i) if i < 26 else "Z%d" % i

def fetch(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=180) as r, open(path, "wb") as f:
        shutil.copyfileobj(r, f)

def verify(workdir, relpath):
    env = dict(os.environ)
    env["NODE_PATH"] = os.pathsep.join([os.path.join(HERE, "sdk"), os.path.join(HERE, "node_modules")])
    try:
        p = subprocess.run(["node", os.path.join(HERE, "verify_spider.js"), os.path.join(workdir, relpath)],
                           cwd=HERE, env=env, capture_output=True, timeout=70)
        lines = [l for l in p.stdout.decode("utf-8", "replace").strip().splitlines() if l.startswith("{")]
        return bool(json.loads(lines[-1])["ok"]) if lines else False
    except Exception:
        return False

def norm_name(rel):
    s = re.sub(r"\.js$", "", os.path.basename(rel))
    s = re.sub(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", "", s)
    s = re.sub(r"[\[\]()（）【】\s_\-—·•]", "", s)
    for w in ("资源站", "资源", "影视", "采集", "网盘", "直连", "点播", "线路", "专线", "官方", "备用"):
        s = s.replace(w, "")
    return s.lower()

def dedupe(files, root):
    seen_hash, seen_name, out = set(), set(), []
    for f in sorted(files, key=lambda x: -os.path.getsize(os.path.join(root, x))):
        h = hashlib.sha256(open(os.path.join(root, f), "rb").read()).hexdigest()
        n = norm_name(f)
        if h in seen_hash or n in seen_name:
            print("      × 去重：%s" % f, flush=True)
            continue
        seen_hash.add(h); seen_name.add(n); out.append(f)
    return sorted(out)

def chunk_by_size(files, root, cap_kb):
    items = sorted(files, key=lambda f: -os.path.getsize(os.path.join(root, f)))
    out, cur, size = [], [], 0
    for f in items:
        s = os.path.getsize(os.path.join(root, f))
        if cur and size + s > cap_kb * 1024:
            out.append(cur); cur, size = [], 0
        cur.append(f); size += s
    if cur:
        out.append(cur)
    return [sorted(c) for c in out]

def main():
    tmp = tempfile.mkdtemp(prefix="obspider-")
    tar = os.path.join(tmp, "s.tar.gz")
    print("[1/6] 下载上游 ...", flush=True)
    fetch(TAR, tar)
    with tarfile.open(tar) as t:
        t.extractall(tmp)
    work = [os.path.join(tmp, d) for d in os.listdir(tmp) if os.path.isdir(os.path.join(tmp, d))][0]
    print("[2/6] 解包到", work, flush=True)

    files = []
    for dp, dn, fn in os.walk(work):
        rel_dir = os.path.relpath(dp, work)
        if any(p in EXCLUDE for p in rel_dir.split(os.sep)):
            continue
        for f in fn:
            if f.endswith(".js"):
                files.append(os.path.relpath(os.path.join(dp, f), work))
    files = sorted(files)
    print("      检测 %d 个源（8 线程，单文件上限 %dKB）..." % (len(files), MAX_KB), flush=True)

    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(lambda f: verify(work, f), files))
    raw_ok = {f for f, r in zip(files, results) if r}
    print("[3/6] 实测可用 %d / %d" % (len(raw_ok), len(files)), flush=True)

    health = json.load(open(HEALTH, encoding="utf-8")) if os.path.exists(HEALTH) else {}
    prev = set()
    if os.path.exists(CFG):
        for e in json.load(open(CFG, encoding="utf-8")):
            prev.update(e.get("files", []))

    new_health, ok = {}, []
    for f in files:
        if f in raw_ok:
            new_health[f] = 0
            ok.append(f)
        else:
            c = health.get(f, 0) + 1
            new_health[f] = c
            if c <= GRACE and f in prev:
                ok.append(f)
                print("      ~ 保留（连续第 %d 次失败）：%s" % (c, f), flush=True)
    json.dump(new_health, open(HEALTH, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
    print("      最终候选 %d 个" % len(ok), flush=True)

    def pick(prefixes):
        return [f for f in ok if f.startswith(tuple(prefixes))]

    print("[4/6] 整体去重 + 按体积分片 ...", flush=True)
    groups = []
    for label, base, prefixes in (("影视采集", "采集", ["影视/采集/", "影视/解析/"]),
                                  ("网盘影视", "网盘", ["影视/网盘/"])):
        pool = dedupe(pick(prefixes), work)
        for i, g in enumerate(chunk_by_size(pool, work, MAX_KB)):
            groups.append(("%s%s(合并%d源)" % (label, letter(i), len(g)), "自动同步：" + base + "聚合", g, base + letter(i)))
    for name, desc, prefixes in EXTRA_GROUPS:
        groups.append((name, desc, pick(prefixes),
                       name.split("(")[0].replace("短剧聚合", "短剧").replace("音乐听书聚合", "音乐听书")))

    ver = "3.%s" % datetime.datetime.utcnow().strftime("%Y%m%d.%H%M")
    cfg = []
    for name, desc, fs, base in groups:
        if not fs:
            continue
        out = "spiders/omnibox-%s.js" % base
        cfg.append({
            "name": name, "desc": desc, "version": ver, "files": fs, "out": out,
            "download": "https://gh-proxy.com/https://raw.githubusercontent.com/Metruee/tv4me/main/" + out,
        })
    json.dump(cfg, open(CFG, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    sys.path.insert(0, HERE)
    import build_merged
    print("[5/6] 重新生成 ...", flush=True)
    for e in cfg:
        out, n, k = build_merged.build(e, work, ROOT)
        print("      %-46s %2d 源  %.0f KB" % (out, k, n / 1024))
    shutil.rmtree(tmp, ignore_errors=True)
    print("[6/6] 完成，版本 %s" % ver, flush=True)

if __name__ == "__main__":
    main()
