from bs4 import BeautifulSoup
from pathlib import Path
from urllib.parse import urlsplit
PAGES = ['index.html','touren.html','kontakt.html','downloads.html','impressum.html','datenschutz.html']
for file in PAGES:
    s = BeautifulSoup(Path(file).read_text(), 'html.parser')
    assert s.select_one('#lang') and s.select_one('footer')
    for element in s.select('a[href], img[src]'):
        attr = 'href' if element.name == 'a' else 'src'
        url = urlsplit(element[attr])
        if url.scheme in ('https', 'http', 'mailto', 'tel'):
            continue
        path = url.path
        if path and not Path(path).exists():
            # Image names may have plus signs from the original CDN.
            path = path.replace('+',' ')
        assert not path or Path(path).exists(), (file, element[attr])
text = BeautifulSoup(Path('touren.html').read_text(), 'html.parser').get_text(' ', strip=True)
assert len(BeautifulSoup(Path('touren.html').read_text(), 'html.parser').select('article.tour')) == 8
for price in ['EUR\xa0130', 'EUR\xa0140', 'EUR\xa0120', 'EUR\xa0170']:
    assert price in text, price
assert Path('assets/images/logo.png').stat().st_size > 0
print(f'PASS: {len(PAGES)} routes, language selector, local assets, eight tour offers.')
