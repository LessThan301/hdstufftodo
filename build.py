from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import unquote
src=Path('/workspace/hdstufftodo-research/pages')
root=Path('/workspace/hdstufftodo')
nav='''<header class="header"><a class="logo" href="index.html"><img src="assets/images/logo.png" alt="Heidelberg Stuff To Do"></a><button class="menu" aria-expanded="false" aria-label="Menu">☰</button><nav id="navigation"><a {{home}} href="index.html">Home</a><a {{tours}} href="touren.html">Tours</a><a {{contact}} href="kontakt.html">Contact</a><label class="language">Language<select id="lang"><option value="de">Deutsch</option><option value="en">English</option></select></label></nav></header>'''
footer='''<footer><h3>HeidelbergStuffToDo</h3><p>Römerstrasse 49<br>69115 Heidelberg<br>Germany</p><a href="tel:+4917647276924">+(49) 176 472 769 24</a><a href="mailto:hdstufftodo@gmail.com">hdstufftodo@gmail.com</a><p><a href="impressum.html">Impressum</a> &nbsp; | &nbsp; <a href="datenschutz.html">Datenschutz</a></p></footer>'''
for page in ['root','touren','impressum','datenschutz','kontakt','downloads']:
 soup=BeautifulSoup((src/(page+'.html')).read_text(),'html.parser')
 main=soup.find('main')
 if page=='downloads':
  title='Downloads'
  footer_html=footer
  header_html=nav.replace('{{home}}','').replace('{{tours}}','').replace('{{contact}}','')
  (root/'downloads.html').write_text(f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Downloads | Heidelberg Stuff To Do</title><link rel="stylesheet" href="assets/style.css"><script src="assets/app.js" defer></script></head><body class="page-downloads">{header_html}<main class="main-content downloads"><h1>Downloads</h1><section class="intro"><a class="book" href="assets/downloads/Adelsblatt_Ausagbe-Mai_21.pdf" target="_blank" rel="noopener">Adelsblatt Artikel (PDF)</a></section></main>{footer_html}</body></html>''')
  continue
 if page=='root':
  sections=[]
  for i,sec in enumerate(main.select('section.page-section')):
   sect=BeautifulSoup('<section></section>','html.parser').section
   sect['class']='section home-section home-'+str(i)
   for e in sec.find_all(['h2','h4','p','img'],recursive=True):
    if not e.get_text(' ',strip=True) and e.name!='img':continue
    if e.name=='p' and e.find_parent('p'):continue
    if e.name=='img':
     name=unquote((e.get('src') or '').split('?')[0].split('/')[-1])
     if 'HSTDLogo' in name: continue
     e['src']='assets/images/'+name
     if e.get('alt','').strip():e['alt']=e['alt'].strip()
     e['loading']='lazy'
     del e['class']
     sect.append(e)
     continue
    for a in e.select('a[href]'):
     a['href']=a['href'].replace('https://www.hdstufftodo.com','').replace('http://www.hdstufftodo.com','')
     if a['href'].startswith('/s/'):
      a['href']='assets/downloads/Adelsblatt_Ausagbe-Mai_21.pdf';a['target']='_blank'
     if a['href'].startswith('/touren'):a['href']='touren.html'
     if a['href'].startswith('/kontakt'):a['href']='kontakt.html'
     if a['href'].startswith('/'):a['href']=a['href'][1:]+'.html'
    sect.append(e)
   sections.append(str(sect))
  body='\n'.join(sections)
 elif page in ['touren','impressum','datenschutz']:
  blocks=[]
  for e in main.find_all(['h1','h2','h3','h4','p','img']):
   if e.name!='img' and not e.get_text(' ',strip=True):continue
   if e.find_parent('footer') or e.find_parent('header'):continue
   if e.name=='img':
    name=unquote((e.get('src') or '').split('?')[0].split('/')[-1])
    if 'HSTDLogo' in name:continue
    e['src']='assets/images/'+name
    e['loading']='lazy'
    e['alt']='Heidelberg Stuff To Do tour'
   for a in e.select('a[href]'):
    a['href']=a['href'].replace('https://www.hdstufftodo.com','').replace('http://www.hdstufftodo.com','')
    if a['href'].startswith('/kontakt'):a['href']='kontakt.html'
   blocks.append(str(e))
  body='<main class="main-content '+page+'">\n'+'\n'.join(blocks)+'\n</main>'
 elif page=='kontakt' or page=='downloads':
  body='''<main class="contact-page"><h2>Contact us</h2><div class="contact-grid"><p>Für Informationen oder Tourbuchungen nutzen Sie bitte das nebenstehende Formular. Sie können uns auch gerne jederzeit direkt über folgende E-mail oder Telefonnummer kontaktieren:<br><a href="mailto:hdstufftodo@gmail.com">hdstufftodo@gmail.com</a><br><a href="tel:+4917647276924">+(49) 176 472 769 24</a></p><form id="inquiry"><div class="fields"><label>First name<input name="firstName" required></label><label>Last name<input name="lastName" required></label></div><label>Email<input type="email" name="email" required></label><label>Phone (optional)<input type="tel" name="phone"></label><label>Message<textarea name="message" rows="7" required></textarea></label><button type="submit">Prepare email</button><p class="form-note" id="form-note">This preview opens your email program. It never sends anything automatically.</p></form></div></main>'''
 if page=='downloads': body='<main class="main-content downloads"><h1>Downloads</h1><section class="intro"><a class="book" href="assets/downloads/Adelsblatt_Ausagbe-Mai_21.pdf" target="_blank" rel="noopener">Adelsblatt Artikel (PDF)</a></section></main>'
 title={'root':'Heidelberg Stuff To Do','touren':'Unsere Touren','impressum':'Impressum','datenschutz':'Datenschutz','kontakt':'Kontakt','downloads':'Downloads'}[page]
 active={'home':'data-current', 'tours':'data-current','contact':'data-current'}
 page_nav=nav.replace('{{home}}',active['home'] if page=='root' else '').replace('{{tours}}',active['tours'] if page=='touren' else '').replace('{{contact}}',active['contact'] if page=='kontakt' else '')
 html=f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>{title} | Heidelberg Stuff To Do</title><link rel="stylesheet" href="assets/style.css"><script src="assets/app.js" defer></script></head><body class="page-{page}">{page_nav}{body}{footer}</body></html>'''
 (root/('index.html' if page=='root' else page+'.html')).write_text(html)
print('six pages created')