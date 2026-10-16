"""Regenerate static MathML from explicit data-tex spans; no browser dependency.

Install the authoring-only dependency with:
  python -m pip install -r tools/requirements-math.txt
Then run: python tools/render-math.py
"""
from pathlib import Path
import html
import re
import xml.etree.ElementTree as ET

from latex2mathml.converter import convert

ROOT = Path(__file__).resolve().parents[1]
PATTERN = re.compile(r'(<span\b[^>]*\bdata-tex="([^"]+)"[^>]*>).*?(</span>)', re.S)


def render(match):
    opening, encoded, closing = match.groups()
    tex = html.unescape(encoded)
    display = 'block' if 'class="math-block"' in opening else 'inline'
    markup = convert(tex, display=display)
    tree = ET.fromstring(markup)
    if any(node.tag.endswith('merror') for node in tree.iter()):
        raise ValueError(f'Invalid formula: {tex}')
    return opening + markup + closing


if __name__ == '__main__':
    count = 0
    for path in [ROOT / 'index.html', *sorted((ROOT / 'pages').glob('*.html'))]:
        source = path.read_text(encoding='utf-8')
        result, matches = PATTERN.subn(render, source)
        if result != source:
            path.write_text(result, encoding='utf-8')
        count += matches
    print(f'Rendered {count} static formulas.')
