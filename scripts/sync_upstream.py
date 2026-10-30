#!/usr/bin/env python3
"""拉取 Silent1566/OmniBox-Spider -> 逐个实跑验活 -> 按分类重新合并 -> 版本号自增。

两处稳健性设计：
1. 并发验活（8 线程），避免 Actions 上串行跑 9 分钟；
2. 容错计数 config/health.json：某源连续失败 <=2 次仍保留（防网络抖动误删好源），
   连续失败 3 次才剔除。
"""
import os, sys, json, tarfile, shutil, tempfile, subprocess, datetime, urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = "Silent1566/OmniBox-Spider"
TAR = "https://gh-proxy.com/https://codeload.github.com/%s/tar.gz/refs/heads/main" % REPO
HEALTH = os.path.join(ROOT, "config", "health.json")
CFG = os.path.join(ROOT, "config", "merged.json")
GRACE = 2
SITE_GROUPS = [
    ("影视采集%s(合并%d源)", "自动同步：采集聚合", ["影视/采集/", "影视/解析/"], 3, "采集"),
    ("网盘影视%s(合并%d源)", "自动同步：网盘聚合", ["影视/网盘/"], 2, "网盘"),
]
EXTRA_GROUPS = [
    ("短剧聚合(合并)", "自动同步：短剧", ["短剧/"]),
    ("音乐听书聚合(合并)", "自动同步：音乐听书", ["音乐/", "听书/"]),
    ("教育(合并)", "自动同步：纯教育", ["教育/"]),
    ("动漫(合并)", "自动同步：动漫", ["动漫/"]),
    ("综合导航(合并)", "自动同步：综合导航", ["综合/", "导航/"]),
]

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

def balanced(files, n, root=""):
    items = sorted(((os.path.getsize(os.path.join(root, f)), f) for f in files), reverse=True)
    gs = [[] for _ in range(n)]; sz = [0] * n
    for s, f in items:
        i = sz.index(min(sz)); gs[i].append(f); sz[i] += s
    return [sorted(g) for g in gs]

def main():
    tmp = tempfile.mkdtemp(prefix="obspider-")
    tar = os.path.join(tmp, "s.tar.gz")
    print("[1/5] 下载上游 ...", flush=True)
    fetch(TAR, tar)
    with tarfile.open(tar) as t:
        t.extractall(tmp)
    work = [os.path.join(tmp, d) for d in os.listdir(tmp) if os.path.isdir(os.path.join(tmp, d))][0]
    print("[2/5] 解包到", work, flush=True)

    files = []
    for dp, dn, fn in os.walk(work):
        if "/tests" in dp or "/.github" in dp:
            continue
        for f in fn:
            if f.endswith(".js"):
                files.append(os.path.relpath(os.path.join(dp, f), work))
    files = sorted(files)
    print("      检测 %d 个源（8 线程）..." % len(files), flush=True)

    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(lambda f: verify(work, f), files))
    raw_ok = {f for f, r in zip(files, results) if r}
    print("[3/5] 实测可用 %d / %d" % (len(raw_ok), len(files)), flush=True)

    # 容错：连续失败不超过 GRACE 次、且上一版收录过的，继续保留
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
    print("      最终收录 %d 个" % len(ok), flush=True)

    def pick(prefixes):
        return [f for f in ok if f.startswith(tuple(prefixes))]

    groups = []
    for name, desc, prefixes, n, base in SITE_GROUPS:
        parts = balanced(pick(prefixes), n, work)
        for idx, g in enumerate(parts):
            groups.append((name % ("ABC"[:n][idx], len(g)), desc, g, base + "ABC"[:n][idx]))
    for name, desc, prefixes in EXTRA_GROUPS:
        groups.append((name, desc, pick(prefixes), name.split("(")[0]
                       .replace("短剧聚合", "短剧").replace("音乐听书聚合", "音乐听书")))

    run = os.environ.get("GITHUB_RUN_NUMBER", "1")
    ver = "2.%s.%s" % (datetime.datetime.utcnow().strftime("%Y%m%d"), run)
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
    print("[4/5] 重新生成 ...", flush=True)
    for e in cfg:
        out, n, k = build_merged.build(e, work, ROOT)
        print("      %-44s %2d 源  %.0f KB" % (out, k, n / 1024))
    shutil.rmtree(tmp, ignore_errors=True)
    print("[5/5] 完成，版本 %s" % ver, flush=True)

if __name__ == "__main__":
    main()
