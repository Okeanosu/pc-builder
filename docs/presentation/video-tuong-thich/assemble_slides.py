# Inlines graph.svg (the constraint graph) into slides.src.html and writes slides.html. Usage: python3 assemble_slides.py
import os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'slides.src.html'), encoding='utf-8').read()
svg = open(os.path.join(here, 'graph.svg'), encoding='utf-8').read()
open(os.path.join(here, 'slides.html'), 'w', encoding='utf-8').write(src.replace('{{svg:graph}}', svg))
print('slides.html written')
