import pathlib, re
path = 'src/screens/DashboardScreen.js'
text = pathlib.Path(path).read_text(encoding='utf-8')
pos = text.find('if (loading)')
pos = text.find('return (', pos)
if pos == -1:
    pos = text.find('return (')
sub = text[pos:]
stack = []
in_tag = False
in_close = False
in_string = None
escape = False
raw_positions = []
for i, ch in enumerate(sub):
    if in_string:
        if escape:
            escape = False
        elif ch == '\\':
            escape = True
        elif ch == in_string:
            in_string = None
        continue
    if ch in ('"', "'"):
        in_string = ch
        continue
    if ch == '<':
        in_tag = True
        in_close = False
        tagname = ''
        continue
    if in_tag:
        if ch == '/':
            in_close = True
            continue
        if ch in ('>', ' ', '\n', '\t'):
            if tagname:
                if in_close:
                    if stack and stack[-1] == tagname:
                        stack.pop()
                else:
                    if not tagname.endswith('/'):
                        stack.append(tagname)
            in_tag = False
            in_close = False
            continue
        tagname += ch
        continue
    if stack and stack[-1].lower() == 'text':
        continue
    if ch.strip() and ch not in '{};(),':
        raw_positions.append((i, ch, stack[-1] if stack else None))
        if len(raw_positions) > 100:
            break
print('found raw', len(raw_positions))
for i,ch,st in raw_positions[:20]:
    print(i, repr(ch), st)
