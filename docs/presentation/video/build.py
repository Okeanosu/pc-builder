# Builds the narrated MP4 from script.py: TTS per line, caption overlays, slow zoom per scene, concat.
# Usage: python3 build.py <workdir> <out.mp4>   (captions are rendered beforehand by captions.cjs)
import importlib.util, json, os, subprocess, sys

work, out_mp4 = sys.argv[1], sys.argv[2]
limit = int(sys.argv[3]) if len(sys.argv) > 3 else None  # build only the first N scenes when testing
spec = importlib.util.spec_from_file_location('script', os.path.join(work, 'script.py'))
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)

FPS, W, H = 30, 1920, 1080
LEAD, GAP, TAIL, FADE = 0.5, 0.35, 0.7, 0.4
VOICE, RATE = 'Linh', '165'
# Neural voice (Microsoft Edge read-aloud); the service drops some requests at random, so each line is retried.
NEURAL_VOICE, NEURAL_RATE = os.environ.get('TTS_VOICE', 'vi-VN-NamMinhNeural'), os.environ.get('TTS_RATE', '+0%')
ENGINE = os.environ.get('TTS', 'edge')

# Words a Vietnamese neural voice tends to misread; subtitles keep the original spelling.
SPEECH_FIXES = [
    ('Next.js', 'Next JS'), ('Node.js', 'Node JS'), ('PostgreSQL', 'Postgres'), ('JSONB', 'JSON B'),
    ('AC-3', 'A C 3'), ('Branch & Bound', 'Branch and Bound'), ('recommend_builds', 'recommend builds'),
    ('VietQR', 'Việt QR'), (' (VPS)', ''), (' (CSP)', ''), (' (MCKP)', ''), ('1.512', '1512'),
    ('2.000', '2000'), ('1.000', '1000'), ('…', '.'), ('“', ''), ('”', ''),
]

# A script may add its own fixes (checked first), e.g. for product names in that video.
SPEECH_FIXES = list(getattr(script, 'SPEECH_FIXES', [])) + SPEECH_FIXES

def speech_text(cap):
    for a, b in SPEECH_FIXES:
        cap = cap.replace(a, b)
    return cap

def tts_edge(text, mp3):
    import asyncio, hashlib, shutil, time, edge_tts
    # Cache by voice + text: the service throttles bursts, so finished lines are never requested again.
    key = hashlib.sha1(f'{NEURAL_VOICE}|{NEURAL_RATE}|{text}'.encode()).hexdigest()[:16]
    cached = f'{work}/tts-cache/{key}.mp3'
    os.makedirs(f'{work}/tts-cache', exist_ok=True)
    if os.path.exists(cached) and os.path.getsize(cached) > 1000:
        shutil.copy(cached, mp3)
        return
    async def go():
        await edge_tts.Communicate(text, NEURAL_VOICE, rate=NEURAL_RATE).save(cached)
    for attempt in range(int(os.environ.get('TTS_RETRIES', '12'))):
        try:
            asyncio.run(go())
            if os.path.getsize(cached) > 1000:
                shutil.copy(cached, mp3)
                time.sleep(1.2)  # pace requests to stay under the service's burst limit
                return
        except Exception:
            pass
        time.sleep(min(3 + 2 * attempt, 20))
    sys.exit(f'TTS failed for: {text[:60]}')
os.makedirs(f'{work}/build', exist_ok=True)

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f'command failed: {" ".join(cmd[:6])}...\n{r.stderr[-2000:]}')
    return r.stdout

def duration(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).strip())

def image_for(visual):
    kind, name = visual.split(':')
    return f'{work}/{"slides" if kind == "slide" else "shots"}/{name}.png'

def zoompan(motion, frames):
    (x0, y0, s0), (x1, y1, s1) = motion
    n = max(frames - 1, 1)
    e = f'(3*pow(on/{n},2)-2*pow(on/{n},3))'  # smoothstep easing
    s = f'({s0}+({s1 - s0})*{e})'
    z = f'1/{s}'
    x = f'({x0}+({x1 - x0})*{e})*iw'
    y = f'({y0}+({y1 - y0})*{e})*ih'
    return f"scale=7680:4320,zoompan=z='{z}':x='{x}':y='{y}':d={frames}:s={W}x{H}:fps={FPS}"

# Fetch every line's speech first: the service throttles, and a failure then costs no re-rendering.
if ENGINE == 'edge':
    for sc in script.SCENES[:limit]:
        for li, (_say, cap) in enumerate(sc['lines']):
            tts_edge(speech_text(cap), f"{work}/build/{sc['id']}-{li}.mp3")
    print('speech ready', flush=True)

timeline, srt, t_global = [], [], 0.0
scene_files = []
for si, scene in enumerate(script.SCENES[:limit]):
    sid = scene['id']
    parts, caps, t = [], [], LEAD
    for li, (say, cap) in enumerate(scene['lines']):
        raw = f'{work}/build/{sid}-{li}.' + ('mp3' if ENGINE == 'edge' else 'aiff')
        wav = f'{work}/build/{sid}-{li}.wav'
        if ENGINE == 'f5':
            raw = f'{work}/f5/{sid}-{li}.wav'  # generated beforehand by f5/f5_gen.py
            if not os.path.exists(raw):
                sys.exit(f'missing F5 audio {raw}; run f5_gen.py first')
        elif ENGINE == 'edge':
            tts_edge(speech_text(cap), raw)
        else:
            run(['say', '-v', VOICE, '-r', RATE, '-o', raw, say])
        # Trim the silence the engine adds at both ends so pauses come only from GAP.
        trim = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse'
        run(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-af', trim, '-ar', '48000', '-ac', '1', wav])
        d = duration(wav)
        caps.append((f'{work}/captions/{sid}-{li}.png', t, t + d))
        srt.append((t_global + t, t_global + t + d, cap))
        parts.append((wav, t))
        t += d + GAP
    total = t - GAP + TAIL
    frames = round(total * FPS)

    # Scene audio: each line placed at its start time on a silent bed.
    a_inputs, a_filters = [], []
    for i, (wav, start) in enumerate(parts):
        a_inputs += ['-i', wav]
        a_filters.append(f'[{i + 1}:a]adelay={int(start * 1000)}:all=1[a{i}]')
    mix = ''.join(f'[a{i}]' for i in range(len(parts)))
    a_graph = ';'.join(a_filters) + f';{mix}amix=inputs={len(parts)}:normalize=0,apad,atrim=0:{total:.3f},afade=t=in:d=0.2,afade=t=out:st={total - FADE:.3f}:d={FADE}[aout]'

    # Video: zoom over the still, then each caption overlaid for its line.
    v_inputs = ['-i', image_for(scene['visual'])]
    for cap_png, _, _ in caps:
        v_inputs += ['-loop', '1', '-t', f'{total:.3f}', '-i', cap_png]
    n_audio = len(parts)
    v_graph = f'[0:v]{zoompan(scene["motion"], frames)},setsar=1,format=yuv420p[v0]'
    for ci, (_, a, b) in enumerate(caps):
        idx = 1 + n_audio + ci
        v_graph += f';[v{ci}][{idx}:v]overlay=0:0:enable=\'between(t,{a:.3f},{b:.3f})\'[v{ci + 1}]'
    last = f'v{len(caps)}'
    v_graph += f';[{last}]fade=t=in:st=0:d={FADE},fade=t=out:st={total - FADE:.3f}:d={FADE},format=yuv420p[vout]'

    scene_mp4 = f'{work}/build/{sid}.mp4'
    # Input order: 0 image, 1..n line audio, then the caption overlays.
    cmd = ['ffmpeg', '-y', '-v', 'error'] + v_inputs[:2] + a_inputs + v_inputs[2:]
    graph = a_graph + ';' + v_graph
    cmd += ['-filter_complex', graph, '-map', '[vout]', '-map', '[aout]', '-r', str(FPS),
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', f'{total:.3f}', scene_mp4]
    run(cmd)
    scene_files.append(scene_mp4)
    timeline.append({'id': sid, 'start': round(t_global, 2), 'duration': round(total, 2)})
    t_global += total
    print(f'{sid}: {total:.1f}s', flush=True)

with open(f'{work}/build/list.txt', 'w') as f:
    for p in scene_files:
        f.write(f"file '{p}'\n")
joined = f'{work}/build/joined.mp4'
run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', f'{work}/build/list.txt', '-c', 'copy', joined])
# Two-pass loudnorm to -16 LUFS (YouTube/podcast level) with a high-pass to drop low rumble.
probe = subprocess.run(['ffmpeg', '-hide_banner', '-i', joined, '-af', 'highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
                        '-f', 'null', '-'], capture_output=True, text=True).stderr
meas = json.loads(probe[probe.rindex('{'):probe.rindex('}') + 1])
ln = (f"highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={meas['input_i']}:measured_TP={meas['input_tp']}"
      f":measured_LRA={meas['input_lra']}:measured_thresh={meas['input_thresh']}:offset={meas['target_offset']}:linear=true")
run(['ffmpeg', '-y', '-v', 'error', '-i', joined, '-c:v', 'copy', '-af', ln, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k',
     '-movflags', '+faststart', out_mp4])

def ts(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'

with open(out_mp4.rsplit('.', 1)[0] + '.srt', 'w') as f:
    for i, (a, b, text) in enumerate(srt, 1):
        f.write(f'{i}\n{ts(a)} --> {ts(b)}\n{text}\n\n')
json.dump(timeline, open(f'{work}/build/timeline.json', 'w'), indent=1)
print(f'total {t_global:.1f}s -> {out_mp4}')
