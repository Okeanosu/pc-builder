# Generates one WAV per narration line with the Vietnamese F5-TTS checkpoint, cloning the voice in ref.wav.
# Usage: venv/bin/python f5_gen.py <video-workdir> [scene-id ...]   (writes <workdir>/f5/<scene>-<line>.wav)
import importlib.util, os, re, sys
import soundfile as sf
from f5_tts.api import F5TTS

here = os.path.dirname(os.path.abspath(__file__))
work = sys.argv[1]
only = set(sys.argv[2:])
spec = importlib.util.spec_from_file_location('script', os.path.join(work, 'script.py'))
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)

# The model was trained on lowercase Vietnamese with numbers spelled out; English words are respelled as spoken.
RESPELL = [
    (r'\bpc builder\b', 'pi xi bin đơ'), (r'\bpc\b', 'pi xi'), (r'\bgame\b', 'gêm'), (r'\bbuild\b', 'bin'),
    (r'\ba p i\b', 'ây pi ai'), (r'\bq r\b', 'kiu a'), (r'\bengine\b', 'en gin'), (r'\bmi li\b', 'mi li'),
]

def normalise(text):
    t = text.lower().replace('“', '').replace('”', '').replace('…', '.')
    for pat, rep in RESPELL:
        t = re.sub(pat, rep, t)
    return re.sub(r'\s+', ' ', t).strip()

ref_wav = os.path.join(here, 'ref.wav')
ref_text = open(os.path.join(here, 'ref.txt')).read().strip()
tts = F5TTS(model='F5TTS_Base', ckpt_file=os.path.join(here, 'model', 'model_last.pt'),
            vocab_file=os.path.join(here, 'model', 'vocab.txt'),
            # torch 2.15's MPS kernels need macOS 15; on macOS 14 they crash, so CPU is the default.
            device=os.environ.get('F5_DEVICE', 'cpu'))

out_dir = os.path.join(work, 'f5')
os.makedirs(out_dir, exist_ok=True)
for scene in script.SCENES:
    if only and scene['id'] not in only:
        continue
    for li, (say, _cap) in enumerate(scene['lines']):
        out = os.path.join(out_dir, f"{scene['id']}-{li}.wav")
        if os.path.exists(out):
            continue
        text = normalise(say)
        wav, sr, _ = tts.infer(ref_wav, ref_text, text, show_info=lambda *a: None, seed=7, nfe_step=32, speed=1.0)
        sf.write(out, wav, sr)
        print(f"{scene['id']}-{li}: {len(wav) / sr:.1f}s  {text[:70]}", flush=True)
