# Writes captions.json (file name + subtitle text per narration line) for captions.cjs.
import importlib.util, json, os, sys
work = sys.argv[1]
spec = importlib.util.spec_from_file_location('script', os.path.join(work, 'script.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
caps = [{'file': f"{sc['id']}-{i}.png", 'text': cap} for sc in m.SCENES for i, (_, cap) in enumerate(sc['lines'])]
json.dump(caps, open(os.path.join(work, 'captions.json'), 'w'), ensure_ascii=False, indent=1)
print(len(caps), 'captions')
