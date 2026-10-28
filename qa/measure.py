import re, sys
from html.parser import HTMLParser

def syllables(word):
    word = word.lower()
    groups = re.findall(r'[aeiouy]+', word)
    n = len(groups)
    if word.endswith('e') and n > 1: n -= 1
    return max(n, 1)

def score(text, label):
    words = re.findall(r"[A-Za-z']+", text)
    sentences = [s for s in re.split(r'[.!?]+', text) if s.strip()]
    ns = max(len(sentences), 1); nw = len(words)
    sy = sum(syllables(w) for w in words)
    fk = 0.39 * (nw / ns) + 11.8 * (sy / max(nw, 1)) - 15.59
    longest = max((len(re.findall(r"[A-Za-z']+", s)) for s in sentences), default=0)
    over = [s.strip() for s in sentences if len(re.findall(r"[A-Za-z']+", s)) > 10]
    print(f"{label}: words={nw} sentences={ns} fk_grade={fk:.2f} longest_sentence={longest}")
    for s in over: print(f"   OVER-10: {s!r} ({len(re.findall(chr(92)+'b',s))} )")
    return nw, fk, longest

class TextGrab(HTMLParser):
    def __init__(self, skip_hidden):
        super().__init__()
        self.skip_hidden = skip_hidden
        self.stack = []       # (tag, hidden?)
        self.skip_depth = 0
        self.parts = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        hidden = ('hidden' in a) or tag in ('script', 'style')
        if self.skip_hidden and hidden: self.skip_depth += 1
        if not self.skip_hidden and tag in ('script','style'): self.skip_depth += 1
        self.stack.append((tag, hidden))
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, -1, -1):
            if self.stack[i][0] == tag:
                t, hidden = self.stack.pop(i)
                if hidden and self.skip_depth > 0: self.skip_depth -= 1
                break
    def handle_data(self, data):
        if self.skip_depth == 0:
            t = data.strip()
            if t: self.parts.append(t)

def grab(path, skip_hidden):
    p = TextGrab(skip_hidden)
    p.feed(open(path).read())
    return " ".join(p.parts)

for path, skip in [("site/index.html", True), ("site/index.html", False),
                   ("site/privacy.html", True), ("site/terms.html", True),
                   ("site/404.html", True)]:
    label = f"{path} ({'initial view' if skip and 'index' in path else 'all static text' if 'index' in path else 'page'})"
    score(grab(path, skip), label)
