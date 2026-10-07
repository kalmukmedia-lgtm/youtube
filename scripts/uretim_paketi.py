#!/usr/bin/env python3
"""
Elle üretim paketi: script.json'dan URETIM.md ve etkileşimli URETIM.html üretir.

Görselleri ve seslendirmeyi kendin hazırlayacaksan (Midjourney, ElevenLabs vb.)
gereken her şey bu iki dosyada: dosya adları, görsel prompt'ları, sahne metinleri,
okunuş tablosu, yükleme bağlantıları ve YouTube bilgileri.

Kullanım:  python3 scripts/uretim_paketi.py videos/<proje-klasörü> [--branch <dal>]
"""
import argparse
import html
import json
import re
from pathlib import Path

REPO = "kalmukmedia-lgtm/youtube"
ROOT = Path(__file__).resolve().parent.parent
WPM = 115  # Türkçe belgesel anlatımında ölçülen ortalama hız (kelime/dakika)


def load_pronunciations() -> dict[str, str]:
    out = {}
    for line in (ROOT / "config/pronunciation.yaml").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and ":" in line:
            key, value = line.split(":", 1)
            out[key.strip()] = value.strip()
    return out


def scene_images(scene: dict) -> list[dict]:
    refs = [scene.get("image")]
    if scene["type"] == "Versus":
        refs += [scene["left"].get("image"), scene["right"].get("image")]
    return [r for r in refs if isinstance(r, dict)]


def collect(script: dict):
    """Görselleri sırala: önce karakter portreleri (referans olacaklar), sonra ilk göründükleri sıraya göre."""
    images, used = {}, {}
    for scene in script["scenes"]:
        for ref in scene_images(scene):
            images.setdefault(ref["id"], ref)
            used.setdefault(ref["id"], [])
            if scene["id"] not in used[ref["id"]]:
                used[ref["id"]].append(scene["id"])
    thumb = script["thumbnail"]["image"]
    images.setdefault(thumb["id"], thumb)
    used.setdefault(thumb["id"], []).append("thumbnail")
    portraits = [i for i in images if i.endswith("-portrait")]
    order = portraits + [i for i in images if i not in portraits]
    return [(images[i], used[i]) for i in order]


def chapters(script: dict) -> list[str]:
    names = ["Giriş"] + [s["title"] for s in script["scenes"] if s["type"] == "ChapterTitle"]
    return names if script["scenes"][0]["type"] != "ChapterTitle" else names[1:]


def build(project: Path, branch: str):
    script = json.loads((project / "script.json").read_text(encoding="utf-8"))
    names = {c["id"]: c["name"] for c in script["characters"]}
    images = collect(script)
    clips = [(img, used) for img, used in images if img.get("motion")]
    scenes = script["scenes"]
    words = sum(len(s["narration"].split()) for s in scenes)
    minutes = words / WPM
    narration_all = " ".join(s["narration"] for s in scenes)
    pron = {k: v for k, v in load_pronunciations().items() if re.search(rf"(?<!\w){re.escape(k)}(?!\w)", narration_all, re.I)}
    base = f"https://github.com/{REPO}/tree/{branch}/{project.relative_to(ROOT).as_posix()}"
    portraits = [img["id"] for img, _ in images if img["id"].endswith("-portrait")]
    hashtags = " ".join(script["hashtags"])
    description = f"{script['description']}\n\n{hashtags}"
    fmt = "Uzun video, 16:9, 1920×1080" if script["format"] == "long" else "Shorts, 9:16, 1080×1920"

    # ---------- Markdown ----------
    md = [f"# {script['workingTitle']} — Üretim Paketi", "",
          "Bu paket, senden gereken **görselleri** ve **seslendirmeyi** içerir. Sen bunları hazırlayıp yükledikten sonra montaj, altyazı, efektler, müzik, render ve thumbnail'leri ben yapıyorum.", "",
          "| | |", "|---|---|", f"| Format | {fmt} |",
          f"| Tahmini süre | ~{minutes:.1f} dakika ({words} kelime, {len(scenes)} sahne) |".replace(".", ",", 1),
          f"| Bölümler | {' · '.join(chapters(script))} |", f"| Görsel | {len(images)} adet |"] + ([f"| Video klip | {len(clips)} adet (görsellerden üretilir) |"] if clips else []) + [f"| Ses | {len(scenes)} dosya (her sahneye bir tane) |", "",
          "## 1. Görseller", "", "**Kurallar**",
          "- Oran **16:9**, en az **1920×1080** (daha büyük olabilir). PNG veya JPG.",
          "- Dosya adı **tam olarak** aşağıdaki gibi olmalı (ör. `" + images[0][0]["id"] + ".png`). Sistem görseli adından tanıyor.",
          "- Görsellerde **yazı olmasın**; yazıları ben ekliyorum.",
          f"- **Karakter tutarlılığı:** Önce {', '.join(f'`{p}`' for p in portraits)} görsellerini üret. Sonra o karakterin geçtiği görsellerde bu portreleri aracındaki *referans görsel / karakter referansı* özelliğiyle kullan (ör. Midjourney'de `--cref`).",
          "- Ana öğe görselin **ortasında** olsun (karakter kartlarında ve Shorts'ta kenarlar kırpılıyor).", ""]
    for n, (img, used) in enumerate(images, 1):
        chars = ", ".join(names.get(c, c) for c in img.get("characters", [])) or "—"
        md += [f"### {n}. `{img['id']}.png`", f"Karakter: **{chars}** · Kullanıldığı yer: {', '.join(used)}", "", "```text", img["prompt"], "```", ""]
    if clips:
        md += ["## 1b. Video klipler (image-to-video)", "", "**Kurallar**",
               "- Önce ilgili görseli üret, sonra o görseli video aracına (Kling, Runway, Hailuo, Luma…) **başlangıç karesi** olarak yükle ve hareket prompt'unu yapıştır.",
               "- **16:9, 1080p, 5–10 sn** (10 sn tercih). Ses gerekmez. Yazı/logo olmasın.",
               "- Dosya adı görselle **aynı ad, `.mp4` uzantılı** olmalı (ör. `" + clips[0][0]["id"] + ".mp4`) ve **visuals** klasörüne yüklenmeli. Görseli de silme; thumbnail için kullanılıyor.",
               "- Klip sahneden kısaysa sistem onu yavaşlatır, bitince son karede bekletip kamera hareketini sürdürür.", ""]
        for n, (img, used) in enumerate(clips, 1):
            md += [f"### V{n}. `{img['id']}.mp4`", f"Başlangıç görseli: `{img['id']}.png` · Kullanıldığı yer: {', '.join(u for u in used if u != 'thumbnail')}", "", "```text", img["motion"], "```", ""]
    md += ["## 2. Seslendirme", "", "**Ses yönergesi**",
           "- Türkçe, **tok ve sakin bir erkek sesi**; belgesel anlatıcısı gibi, merak uyandıran ama abartısız.",
           "- Hız normalden biraz yavaş; cümle aralarında kısa doğal duraklamalar.",
           f"- **Her sahne ayrı dosya:** `s01.mp3`, `s02.mp3` … `{scenes[-1]['id']}.mp3`. Dosyanın başında ve sonunda uzun sessizlik olmasın (en fazla ~0,3 sn).",
           "- MP3 (veya WAV/M4A), 44.1 ya da 48 kHz.",
           "- **Her dosyayı ayrı kaydet ve doğru adla kaydet**; iki sahneye aynı dosyayı yüklememeye dikkat et.",
           "- Ses aracı bir ismi yanlış okursa, **sadece ses aracına** okunuşunu yaz (altyazı senaryodaki yazımla kalır):", "",
           "| Yazım | Okunuş |", "|---|---|"]
    md += [f"| {k} | {v} |" for k, v in pron.items()]
    md += [""]
    for s in scenes:
        md += [f"**`{s['id']}.mp3`** · {s['type']}", "```text", s["narration"], "```"]
    md += ["", "## 3. Müzik (isteğe bağlı)", "",
           "YouTube Studio → **Ses Kitaplığı**'ndan telif sorunu olmayan bir parça seç. Adı `music.mp3` olsun. Kısa olması sorun değil: video müzikten uzunsa parça yumuşak geçişle tekrar başlar. Konuşma sırasında sesi otomatik kısılır.", "",
           "## 4. Dosyaları yükleme (GitHub üzerinden)", "",
           f"1. Görseller: [visuals]({base}/visuals) klasörünü aç → sağ üstte **Add file → Upload files** → görselleri sürükle → en altta yeşil **Commit changes**.",
           f"2. Sesler: aynı şekilde [audio]({base}/audio) klasörüne.",
           f"3. Müzik (varsa): `music.mp3`'ü [video klasörünün kendisine]({base}) yükle.",
           "4. Bana \"yükledim\" yaz. Web'den dosya başına 25 MB sınırı var; görseller ve sesler bunun çok altında.", "",
           "## 5. YouTube bilgileri", "", "**Başlık seçenekleri:**"]
    md += [f"- {t}" for t in script["titleOptions"]]
    md += ["", "**Açıklama** (bölüm zaman damgaları gerçek ses sürelerine göre render'dan sonra eklenecek):", "", "```text", description, "```", "",
           f"**Etiketler:** {', '.join(script['tags'])}", ""]
    (project / "URETIM.md").write_text("\n".join(md), encoding="utf-8")

    # ---------- HTML ----------
    E = html.escape

    def copybtn(text: str, label: str = "Kopyala") -> str:
        return f'<button class="copy" data-copy="{E(text)}">{label}</button>' if text else ""

    def item(key: str, title: str, meta: str, body: str, text: str) -> str:
        return (f'<div class="item" data-key="{E(key)}"><label class="chk"><input type="checkbox"><span></span></label>'
                f'<div class="content"><div class="head"><code>{E(title)}</code>{copybtn(title, "Adı kopyala")}<span class="meta">{meta}</span></div>'
                f'<div class="text">{E(body)}</div><div class="actions">{copybtn(text)}</div></div></div>')

    img_html = "".join(
        item(f"img:{img['id']}", f"{img['id']}.png",
             E(f"Karakter: {', '.join(names.get(c, c) for c in img.get('characters', [])) or '—'} · Kullanıldığı yer: {', '.join(used)}"),
             img["prompt"], img["prompt"])
        for img, used in images)
    clip_html = "".join(
        item(f"vid:{img['id']}", f"{img['id']}.mp4", E(f"Başlangıç görseli: {img['id']}.png · Kullanıldığı yer: {', '.join(u for u in used if u != 'thumbnail')}"), img["motion"], img["motion"])
        for img, used in clips)
    clip_section = (f'''<h2 id="v">1b. Video klipler <small data-sec="vid"></small></h2>
<div class="box"><ul><li>Önce görseli üret, sonra onu video aracına (Kling, Runway, Hailuo, Luma…) <b>başlangıç karesi</b> olarak yükleyip hareket prompt'unu yapıştır.</li>
<li>16:9, 1080p, 5–10 sn (10 sn tercih). Ses gerekmez, yazı olmasın.</li>
<li>Dosya adı görselle aynı, <b>.mp4</b> uzantılı; <b>visuals</b> klasörüne yükle. Görseli silme (thumbnail için lazım).</li>
<li>Klip sahneden kısaysa sistem yavaşlatır ve son karede bekletir.</li></ul></div>{clip_html}''' if clips else "")
    aud_html = "".join(item(f"aud:{s['id']}", f"{s['id']}.mp3", E(s["type"]), s["narration"], s["narration"]) for s in scenes)
    all_narr = "\n\n".join(f"[{s['id']}.mp3]\n{s['narration']}" for s in scenes)
    pron_rows = "".join(f"<tr><td>{E(k)}</td><td>{E(v)}</td></tr>" for k, v in pron.items())
    titles = "".join(f"<li>{E(t)} {copybtn(t)}</li>" for t in script["titleOptions"])
    tags = ", ".join(script["tags"])
    storage_key = f"metaficta-uretim-{script['id']}"

    page = f'''<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(script['workingTitle'])} Üretim</title><style>
:root{{--bg:#0e0d12;--card:#1a1822;--line:#2e2a3a;--fg:#ece8f4;--mut:#9a94aa;--gold:#e0b44c;--ok:#4cc38a}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,sans-serif}}
main{{max-width:900px;margin:auto;padding:0 16px 80px}}h1{{color:var(--gold);font-size:24px;margin:20px 0 4px}}
h2{{margin:32px 0 10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}}h2 small{{color:var(--mut);font-weight:400;font-size:14px}}
.top{{position:sticky;top:0;background:var(--bg);padding:10px 0;z-index:5;border-bottom:1px solid var(--line)}}
.bar{{height:10px;background:var(--line);border-radius:6px;overflow:hidden}}.bar i{{display:block;height:100%;background:linear-gradient(90deg,var(--gold),var(--ok));width:0;transition:width .3s}}
.row{{display:flex;justify-content:space-between;font-size:13px;color:var(--mut);margin:4px 0;gap:8px;flex-wrap:wrap}}
nav a{{color:var(--gold);margin-right:12px;font-size:13px}}
.item{{display:flex;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;margin:10px 0}}
.item.done{{opacity:.55;border-color:var(--ok)}}.content{{flex:1;min-width:0}}
.head{{display:flex;gap:8px;align-items:center;flex-wrap:wrap}}code{{color:var(--gold);font-size:15px;word-break:break-all}}
.meta{{color:var(--mut);font-size:13px}}.text{{margin:8px 0;white-space:pre-wrap;word-wrap:break-word}}
.chk input{{display:none}}.chk span{{display:block;width:26px;height:26px;border:2px solid var(--gold);border-radius:6px;cursor:pointer}}
.chk input:checked+span{{background:var(--ok);border-color:var(--ok)}}.chk input:checked+span::after{{content:"✓";color:#000;display:block;text-align:center;font-weight:700}}
button{{background:#2b2738;color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:5px 10px;cursor:pointer;font-size:13px}}
button:hover{{border-color:var(--gold)}}button.ok{{background:var(--ok);color:#000}}
.box{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px}}
table{{border-collapse:collapse}}td{{padding:4px 12px;border-bottom:1px solid var(--line)}}a{{color:var(--gold)}}
</style></head><body><main>
<div class="top"><h1>{E(script['workingTitle'])} — Üretim</h1>
<div class="row"><b id="tot"></b><button id="reset">Sıfırla</button></div><div class="bar"><i id="totbar"></i></div>
<nav><a href="#g">Görseller</a>{'<a href="#v">Videolar</a>' if clips else ''}<a href="#s">Ses</a><a href="#m">Müzik</a><a href="#y">Yükleme</a><a href="#yt">YouTube</a></nav></div>
<p class="meta">{E(fmt)} · ~{minutes:.1f} dk · {len(scenes)} sahne · {len(images)} görsel{f" · {len(clips)} video klip" if clips else ""}</p>

<h2 id="g">1. Görseller <small data-sec="img"></small></h2>
<div class="box"><ul><li>16:9, en az 1920×1080, PNG/JPG; dosya adı <b>tam olarak</b> aynı olmalı.</li><li>Görselde yazı olmasın.</li>
<li>Önce {", ".join(f"<code>{E(p)}</code>" for p in portraits)} görsellerini üret; sonra o karakterin geçtiği görsellerde bunları karakter referansı olarak kullan.</li>
<li>Ana öğe ortada olsun.</li></ul></div>{img_html}
{clip_section}

<h2 id="s">2. Seslendirme <small data-sec="aud"></small> {copybtn(all_narr, 'Tüm metni kopyala')}</h2>
<div class="box"><ul><li>Tok, sakin erkek sesi; belgesel anlatıcısı; biraz yavaş.</li><li>Her sahne ayrı dosya (s01.mp3 … {scenes[-1]['id']}.mp3), baş/sonda en fazla ~0,3 sn sessizlik.</li>
<li>MP3/WAV/M4A, 44.1 ya da 48 kHz. <b>İki sahneye aynı dosyayı yükleme.</b></li><li>Ses aracı yanlış okursa sadece ses aracına okunuşu yaz:</li></ul>
<table>{pron_rows}</table></div>{aud_html}

<h2 id="m">3. Müzik <small>(isteğe bağlı)</small></h2>
{item('music', 'music.mp3', 'YouTube Ses Kitaplığı', 'Telifsiz bir parça; kısa olabilir, yumuşak geçişle tekrar eder. Video klasörünün köküne yükle.', '')}

<h2 id="y">4. Yükleme</h2>
<div class="box"><ol><li><a href="{base}/visuals" target="_blank">visuals klasörü</a> → Add file → Upload files → en altta <b>Commit changes</b></li>
<li><a href="{base}/audio" target="_blank">audio klasörü</a> → aynı şekilde</li><li>music.mp3 → <a href="{base}" target="_blank">video klasörü</a></li><li>Bana "yükledim" yaz.</li></ol></div>
{item('up:img', 'Görseller yüklendi', '', f'visuals klasörüne {len(images)} görsel', '')}
{item('up:vid', 'Video klipler yüklendi', '', f'visuals klasörüne {len(clips)} klip (.mp4)', '') if clips else ''}
{item('up:aud', 'Sesler yüklendi', '', f'audio klasörüne {len(scenes)} ses', '')}

<h2 id="yt">5. YouTube bilgileri</h2>
<div class="box"><b>Başlıklar</b><ul>{titles}</ul>
<b>Açıklama</b> {copybtn(description)}<div class="text">{E(description)}</div>
<b>Etiketler</b> {copybtn(tags)}<div class="text">{E(tags)}</div></div>
</main><script>
const K={json.dumps(storage_key)};let st={{}};try{{st=JSON.parse(localStorage.getItem(K))||{{}}}}catch(e){{}}
const items=[...document.querySelectorAll('.item')];
function upd(){{let d=0;const sec={{}};items.forEach(it=>{{const k=it.dataset.key,c=!!st[k];it.querySelector('input').checked=c;it.classList.toggle('done',c);
const s=k.split(':')[0];sec[s]=sec[s]||[0,0];sec[s][1]++;if(c){{d++;sec[s][0]++}}}});
document.getElementById('tot').textContent=`İlerleme: ${{d}} / ${{items.length}} (%${{Math.round(d*100/items.length)}})`;
document.getElementById('totbar').style.width=d*100/items.length+'%';
document.querySelectorAll('[data-sec]').forEach(e=>{{const v=sec[e.dataset.sec];e.textContent=`${{v[0]}} / ${{v[1]}} tamam`}});
try{{localStorage.setItem(K,JSON.stringify(st))}}catch(e){{}}}}
items.forEach(it=>it.querySelector('input').addEventListener('change',e=>{{st[it.dataset.key]=e.target.checked;upd()}}));
document.getElementById('reset').onclick=()=>{{if(confirm('Tüm işaretler silinsin mi?')){{st={{}};upd()}}}};
document.querySelectorAll('button.copy').forEach(b=>b.onclick=async()=>{{const t=b.dataset.copy,l=b.textContent;
try{{await navigator.clipboard.writeText(t)}}catch(e){{const a=document.createElement('textarea');a.value=t;document.body.append(a);a.select();document.execCommand('copy');a.remove()}}
b.textContent='Kopyalandı ✓';b.classList.add('ok');setTimeout(()=>{{b.textContent=l;b.classList.remove('ok')}},1200)}});
upd();
</script></body></html>'''
    (project / "URETIM.html").write_text(page, encoding="utf-8")
    for folder in ("visuals", "audio"):
        (project / folder).mkdir(exist_ok=True)
        (project / folder / "OKU.txt").write_text("Dosyaları bu klasöre yükle. Adlar için URETIM.html'e bak.\n", encoding="utf-8")
    print(f"✅ {project}/URETIM.md + URETIM.html — {len(images)} görsel, {len(clips)} klip, {len(scenes)} ses, ~{minutes:.1f} dk, {len(pron)} okunuş")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("project", type=Path)
    parser.add_argument("--branch", default="claude/hopeful-archimedes-ig6l3x")
    args = parser.parse_args()
    build(args.project.resolve(), args.branch)
