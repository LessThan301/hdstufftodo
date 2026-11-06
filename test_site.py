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
        check(s.get('src') in ('assets/content.js', 'assets/app.js'), f'{name}: unexpected script {s}')
    for l in soup.find_all('link'):
        check(not urlsplit(l['href']).scheme, f'{name}: external stylesheet/link {l["href"]}')
    for el in soup.select('[data-i18n]'):
        check(el['data-i18n'] in data['de'], f'{name}: missing key {el["data-i18n"]}')
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
for m in re.findall(r'url\("?([^")]+)"?\)', css):
    check((ROOT / 'assets' / m).is_file(), f'css: missing {m}')
check('@import' not in css and 'http' not in css, 'css: external resource')

tours = BeautifulSoup((ROOT / 'touren.html').read_text(encoding='utf-8'), 'html.parser')
check(len(tours.select('article.tour')) == 8, 'touren: need 8 tour cards')
check(len(tours.select('h2.region')) == 5, 'touren: need 5 regions')
txt = tours.get_text(' ', strip=True).replace('\xa0', ' ')
for p in ['EUR 130 (Gruppe bis 15 Personen) plus Schlosshofeintritt', 'EUR 140 bis 15 Personen', 'EUR 120', 'EUR 170']:
    check(p in txt, f'touren: price {p}')
en_prices = [data['en'][f'tour.{i}.price'] for i in range(8)]
check(en_prices[0] == 'Duration: 90 minutes Price: EUR 130 (group up to 15 persons) plus castle court entrance fee', 'en price 0')
check(en_prices[7] == 'Duration: 90 minutes Price: EUR 170 (group up to 15 persons)', 'en price 7')
home = BeautifulSoup((ROOT / 'index.html').read_text(encoding='utf-8'), 'html.parser')
check(len(home.select('.member img')) == 3 and len(home.select('.member h3')) == 3, 'home: 3 team profiles')
check(len(home.select('.review')) == 5, 'home: 5 reviews')
check(len(home.select('.gallery-track img')) >= 4 and len(home.select('.gallery-btn')) == 2, 'home: gallery')
check(home.select_one('.press-cover')['href'].endswith('.pdf'), 'home: press cover -> PDF')
contact = BeautifulSoup((ROOT / 'kontakt.html').read_text(encoding='utf-8'), 'html.parser')
form = contact.select_one('form#contact-form')
check(form is not None and not form.get('action'), 'kontakt: form must not post anywhere')
for name in ('datenschutz.html', 'impressum.html'):
    s = BeautifulSoup((ROOT / name).read_text(encoding='utf-8'), 'html.parser')
    check(s.select_one('.legal-note'), f'{name}: preview legal note')

if errors:
    print('\n'.join('FAIL: ' + e for e in errors)); print(f'{len(errors)} error(s)'); sys.exit(1)
print(f'PASS: {len(PAGES)} pages, 8 tours, local images/PDF, language selector, legal notes. 0 errors.')
