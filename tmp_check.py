import re, pathlib
path = 'src/screens/DashboardScreen.js'
text = pathlib.Path(path).read_text(encoding='utf-8')
text_no_text = re.sub(r'<Text[^>]*>.*?</Text>', '', text, flags=re.S)
text_no_text = re.sub(r'<Text[^>]*/>', '', text_no_text, flags=re.S)
found = False
for m in re.finditer(r'>([^<]+)<', text_no_text):
    content = m.group(1)
    if re.search(r'\S', content):
        if re.match(r'^\s*\{[^}]*\}\s*$', content):
            continue
        if re.match(r'^\s*$', content):
            continue
        line = text[:m.start()].count('\n') + 1
        print('Potential text node:', repr(content.strip()), 'at approx line', line)
        found = True
if not found:
    print('No potential raw text nodes found.')
