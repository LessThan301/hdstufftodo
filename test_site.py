"""Static checks for the preview: run `python3 test_site.py` from the repo root (needs beautifulsoup4)."""
import json, re, sys
from pathlib import Path
from urllib.parse import urlsplit, unquote
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
PAGES = ['index.html', 'touren.html', 'kontakt.html', 'downloads.html', 'impressum.html', 'datenschutz.html']
errors = []
def check(cond, msg):
    if not cond: errors.append(msg)

js = (ROOT / 'assets/content.js').read_text(encoding='utf-8')
data = json.loads(re.search(r'window\.HD_CONTENT = (\{.*\});', js, re.S).group(1))
check(set(data['de']) == set(data['en']), 'de/en key sets differ')

for name in PAGES:
    soup = BeautifulSoup((ROOT / name).read_text(encoding='utf-8'), 'html.parser')
    check(soup.html.get('lang') == 'de', f'{name}: default lang must be de')
    check(len(soup.find_all('h1')) == 1, f'{name}: exactly one h1')
    check(soup.select_one('.lang-switch [data-lang=de]') and soup.select_one('.lang-switch [data-lang=en]'), f'{name}: language selector')
    check(soup.select_one('.menu-toggle[aria-controls=site-nav]') and soup.select_one('#site-nav'), f'{name}: menu')
    check(soup.select_one('footer'), f'{name}: footer')
    for s in soup.find_all('script'):
        check(urlsplit(s.get('src', '')).path in ('assets/content.js', 'assets/app.js'), f'{name}: unexpected script {s}')
    for l in soup.find_all('link'):
        href = l.get('href','')
        if l.get('rel') and 'canonical' in l.get('rel'):
            expected = 'https://hdstufftodo.com/' if name == 'index.html' else f'https://hdstufftodo.com/{name}'
            check(href == expected, f'{name}: canonical {href}')
            continue
        check(not urlsplit(href).scheme, f'{name}: external stylesheet/link {href}')
    check(soup.select_one('meta[property="og:url"]') and soup.select_one('meta[property="og:url"]')['content'] == (soup.select_one('link[rel=canonical]')['href'] if soup.select_one('link[rel=canonical]') else ''), f'{name}: og:url matches canonical')
    check(not soup.select_one('meta[name=robots][content*="noindex"]'), f'{name}: live site must be indexable')
    page_src = (ROOT / name).read_text(encoding='utf-8')
    check('/hdstufftodo/' not in page_src, f'{name}: no project-page path prefix')
    for el in soup.select('[data-i18n]'):
        key = el['data-i18n']
        check(key in data['de'], f'{name}: missing key {key}')
        # Regression: static German HTML fallback must match content.js de
        check(el.get_text() == data['de'][key], f'{name}: HTML de fallback != content.js for {key}')
    for el in soup.select('a[href], img[src], img[srcset], source[srcset]'):
        for attr in ('href', 'src', 'srcset'):
            if not el.get(attr): continue
            u = urlsplit(el[attr])
            if el.name == 'img': check(not u.scheme, f'{name}: remote image {el[attr]}')
            if u.scheme in ('mailto', 'tel', 'http', 'https') or not u.path: continue
            check((ROOT / unquote(u.path)).is_file(), f'{name}: missing local file {el[attr]}')
    for img in soup.find_all('img'):
        check(img.has_attr('alt'), f'{name}: img without alt')

css = (ROOT / 'assets/style.css').read_text()
for m in re.findall(r'url\([\"\']?([^\"\')]+)[\"\']?\)', css):
    check((ROOT / 'assets' / m).is_file(), f'css: missing {m}')
check('@import' not in css and 'http' not in css, 'css: external resource')
check('.about > h2' in css and 'text-align: left' in css.split('.about > h2')[1].split('}')[0], 'about h2 left-aligned')
check('.about .lead' in css and 'text-align: left' in css.split('.about .lead')[1].split('}')[0], 'about lead left-aligned')

tours = BeautifulSoup((ROOT / 'touren.html').read_text(encoding='utf-8'), 'html.parser')
check(len(tours.select('article.tour')) == 8, 'touren: need 8 tour cards')
check(len(tours.select('h2.region')) == 5, 'touren: need 5 regions')
txt = tours.get_text(' ', strip=True).replace('\xa0', ' ')
for p in ['EUR 130 (Gruppe bis 15 Personen) plus Schlosshofeintritt', 'EUR 140 (Gruppe bis 15 Personen)', 'EUR 120', 'EUR 170']:
    check(p in txt, f'touren: price {p}')

def facts(price):
    """Normalise duration/price/group size from a price string."""
    d = re.search(r'(\d+)\s*minut', price, re.I)
    euros = [int(x) for x in re.findall(r'EUR\s*(\d+)', price, re.I)]
    g = re.search(r'(?:bis|up to|of up to)\s*(\d+)', price, re.I)
    return (int(d.group(1)) if d else None, euros, int(g.group(1)) if g else None)

expected = [
    (90, [130], 15),  # Heidelberg castle + courtyard note
    (90, [130], 15),
    (120, [140], 15),
    (90, [130], 15),
    (60, [120], 15),
    (60, [120], 15),
    (90, [130], 15),
    (90, [170], 15),
]
for i, exp in enumerate(expected):
    for lang in ('de', 'en'):
        got = facts(data[lang][f'tour.{i}.price'])
        check(got == exp, f'{lang} tour {i} facts {got} != {exp}')
check('courtyard' in data['en']['tour.0.price'].lower() or 'court' in data['en']['tour.0.price'].lower(), 'en price 0 mentions courtyard admission')
check('Schlosshofeintritt' in data['de']['tour.0.price'], 'de price 0 mentions Schlosshofeintritt')

home = BeautifulSoup((ROOT / 'index.html').read_text(encoding='utf-8'), 'html.parser')
check(len(home.select('.member img')) == 3 and len(home.select('.member h3')) == 3, 'home: 3 team profiles')
check(len(home.select('.review')) == 5, 'home: 5 reviews')
check(len(home.select('.gallery-track img')) >= 4 and len(home.select('.gallery-btn')) == 2, 'home: gallery')
check(home.select_one('.press-cover')['href'].endswith('.pdf'), 'home: press cover -> PDF')
# Eichendorff German exact
eich = [data['de'][f'team.0.p.{j}'] for j in range(5)]
check(eich == [
    '„Schläft ein Lied in allen Dingen,',
    'Die da träumen fort und fort,',
    'Und die Welt hebt an zu singen,',
    'Triffst Du nur das Zauberwort“',
    'Joseph von Eichendorff',
], 'Eichendorff German must stay exact')
contact = BeautifulSoup((ROOT / 'kontakt.html').read_text(encoding='utf-8'), 'html.parser')
form = contact.select_one('form#contact-form')
check(form is not None and not form.get('action') and form.select_one('fieldset[disabled]'), 'kontakt: noscript fallback stays disabled')
check(form.get('data-backend-enabled') == 'true' and form.get('data-backend-url') == 'https://heidelberg-contact.synoikon.workers.dev/contact', 'kontakt: isolated backend enabled')
check('Cloudflare-D1-Datenbank' in (ROOT / 'datenschutz.html').read_text() and 'Contact form (direct enquiry)' in (ROOT / 'datenschutz.html').read_text(), 'datenschutz: published contact-form privacy DE+EN')
for name in ('datenschutz.html', 'impressum.html'):
    s = BeautifulSoup((ROOT / name).read_text(encoding='utf-8'), 'html.parser')
    check(s.select_one('.legal-note'), f'{name}: preview legal note')

# Logo D (River Spark): header, favicon, no lion assets referenced
for name in PAGES:
    soup = BeautifulSoup((ROOT / name).read_text(encoding='utf-8'), 'html.parser')
    logo = soup.select_one('a.logo img')
    check(logo is not None and 'logo-river-spark.svg' in logo.get('src',''), f'{name}: header River Spark SVG')
    check(logo and 'Heidelberg StuffToDo' in logo.get('alt',''), f'{name}: logo alt descriptive')
    check(soup.select_one('link[rel=icon][href*="favicon-river-spark.svg"]'), f'{name}: SVG favicon')
    check(soup.select_one('link[rel=icon][href*="favicon-river-spark-32.png"]'), f'{name}: 32px favicon')
    check(soup.select_one('link[rel="apple-touch-icon"][href*="apple-touch-icon.png"]'), f'{name}: apple touch icon')
    footer_img = soup.select_one('.footer-brand img')
    check(footer_img is not None and 'logo-river-spark.svg' in footer_img.get('src',''), f'{name}: footer brand logo')
    page_txt = (ROOT / name).read_text(encoding='utf-8').lower()
    check('lion' not in page_txt, f'{name}: no lion references')
    # Old lion PNG must not be linked (file may still exist historically only in git)
    for el in soup.select('img[src], link[href]'):
        ref = el.get('src') or el.get('href') or ''
        check('logo.png' not in ref.split('?')[0], f'{name}: must not reference logo.png ({ref})')
for asset in [
    'assets/images/logo-river-spark.svg',
    'assets/images/logo-river-spark-mark.svg',
    'assets/images/logo-river-spark-editable.svg',
    'assets/images/favicon-river-spark.svg',
    'assets/images/favicon-river-spark-32.png',
    'assets/images/favicon-river-spark-192.png',
    'assets/images/apple-touch-icon.png',
    'assets/images/logo.png',
]:
    check((ROOT / asset).is_file(), f'missing asset {asset}')
# logo.png must be River Spark PNG (not tiny old lion): check dimensions / non-trivial size
from PIL import Image as _Image
_logo = _Image.open(ROOT / 'assets/images/logo.png')
check(_logo.size[0] >= 400 and _logo.mode in ('RGBA','RGB'), f'logo.png should be River Spark raster ({_logo.size} {_logo.mode})')
css = (ROOT / 'assets/style.css').read_text()
check('.logo img' in css and '240px' in css.split('.logo img')[1].split('}')[0], 'header logo 180px desktop (original)')

check(len(contact.select('.faq details')) == 8, 'contact: 8 bilingual FAQs')
check(len(tours.select('.package-card')) == 4, 'tours: 4 package proposals')

cname = (ROOT / 'CNAME').read_text().strip()
check(cname == 'hdstufftodo.com', f'CNAME file {cname}')
robots = (ROOT / 'robots.txt').read_text()
check('Sitemap: https://hdstufftodo.com/sitemap.xml' in robots, 'robots.txt sitemap')
sitemap = (ROOT / 'sitemap.xml').read_text()
check('https://hdstufftodo.com/' in sitemap and 'https://hdstufftodo.com/kontakt.html' in sitemap, 'sitemap lists apex pages')

check('subject=' not in (ROOT / 'assets/app.js').read_text(), 'contact: no mailto form handler')
check('window.location.href' not in (ROOT / 'assets/app.js').read_text(), 'contact: no mail app navigation')

if errors:
    print('\n'.join('FAIL: ' + e for e in errors)); print(f'{len(errors)} error(s)'); sys.exit(1)
print(f'PASS: {len(PAGES)} pages, 8 tours, DE HTML=content sync, local assets, language selector, legal notes. 0 errors.')
