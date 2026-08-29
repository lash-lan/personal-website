"""Narrate the site's prose with Kokoro (Apache 2.0), on CPU.

Runs locally or on a GitHub Actions runner. The story's mood zones drive the
tempo and the length of the silences, so one narrator grows heavier through
dread and quickens through wrath rather than reading everything flat.

  python scripts/narrate.py --list
  python scripts/narrate.py --shard 0 --of 8
  python scripts/narrate.py --only the-sea-prison
"""
import argparse, json, os, subprocess, sys, time
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "src", "data")
OUT = os.path.join(ROOT, "public", "audio")
CUES = os.path.join(ROOT, "src", "data", "audio")
MODELS = os.environ.get("KOKORO_MODELS", os.path.join(ROOT, ".kokoro"))

VOICE = os.environ.get("KOKORO_VOICE", "bf_isabella")  # British woman, warmer
LANG = os.environ.get("KOKORO_LANG", "en-gb")
BITRATE = os.environ.get("NARRATION_BITRATE", "28k")  # opus, mono, speech

# mood -> (speaking rate, silence after each line in seconds)
MOOD = {
    "hearth": (1.00, 0.28),
    "frost":  (0.94, 0.34),
    "dread":  (0.86, 0.52),
    "wonder": (0.93, 0.38),
    "wrath":  (1.10, 0.18),
    "abyss":  (0.84, 0.60),
    "gilded": (0.95, 0.36),
}
DEFAULT = (0.95, 0.35)


def units():
    """Every narratable piece: one per short story, one per saga chapter."""
    out = []
    stories = json.load(open(os.path.join(DATA, "foundation-age-stories.json"), encoding="utf-8"))
    for s in stories["stories"]:
        out.append(dict(
            id=s["slug"],
            rel=os.path.join("stories", s["slug"] + ".opus"),
            title=s["title"],
            paras=s["paras"],
            zones=s.get("zones"),
        ))
    saga = json.load(open(os.path.join(DATA, "last-days-of-legends.json"), encoding="utf-8"))
    for part in saga["parts"]:
        for i, c in enumerate(part["chapters"]):
            out.append(dict(
                id=f'{part["slug"]}/{i:02d}',
                rel=os.path.join("saga", part["slug"], f"{i:02d}.opus"),
                title=c["title"],
                paras=[p.get("x", "") for p in c["paras"] if p.get("t") != "break"],
                zones=None if not c.get("zones") else [
                    # zone indices count breaks; rebuild against the filtered lines
                    z for z in c["zones"]
                ],
                raw=c["paras"],
                rawzones=c.get("zones"),
            ))
    return out


def lines_with_speed(u):
    """Yield (text, speed, gap) for every spoken line."""
    if u.get("raw") is not None:
        zones = u.get("rawzones") or [{"mood": "frost", "start": 0, "end": len(u["raw"]) - 1}]
        for z in zones:
            speed, gap = MOOD.get(z["mood"], DEFAULT)
            for p in u["raw"][z["start"]: z["end"] + 1]:
                if p.get("t") == "break":
                    continue
                t = (p.get("x") or "").strip()
                if t:
                    yield t, speed, gap
    else:
        zones = u.get("zones") or [{"mood": "gilded", "start": 0, "end": len(u["paras"]) - 1}]
        for z in zones:
            speed, gap = MOOD.get(z["mood"], DEFAULT)
            for t in u["paras"][z["start"]: z["end"] + 1]:
                t = t.strip()
                if t:
                    yield t, speed, gap


def encode(wav, dest):
    ff = os.environ.get("FFMPEG")
    if not ff:
        try:
            import imageio_ffmpeg
            ff = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            ff = "ffmpeg"
    subprocess.run(
        [ff, "-hide_banner", "-loglevel", "error", "-y", "-i", wav,
         "-ac", "1", "-c:a", "libopus", "-b:a", BITRATE, dest],
        check=True,
    )
    os.remove(wav)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shard", type=int, default=0)
    ap.add_argument("--of", type=int, default=1)
    ap.add_argument("--only")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()

    all_units = units()
    if a.list:
        for u in all_units:
            print(f'{u["id"]:52s} {len(u["paras"]):5d} lines')
        print(f"\n{len(all_units)} units")
        return

    todo = [u for u in all_units if u["id"] == a.only] if a.only \
        else [u for i, u in enumerate(all_units) if i % a.of == a.shard]
    if not todo:
        print("nothing to do"); return

    k = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"),
               os.path.join(MODELS, "voices-v1.0.bin"))

    for n, u in enumerate(todo, 1):
        dest = os.path.join(OUT, u["rel"])
        if os.path.exists(dest):
            print(f"[{n}/{len(todo)}] skip (exists) {u['id']}", flush=True)
            continue
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        t0, sr, pieces = time.time(), 24000, []
        cues, at = [], 0          # start time of each spoken paragraph

        samples, sr = k.create(u["title"] + ".", voice=VOICE, speed=0.92, lang=LANG)
        pieces.append(samples); at += len(samples)
        pad = np.zeros(int(sr * 0.9), dtype=np.float32)
        pieces.append(pad); at += len(pad)

        count = 0
        for text, speed, gap in lines_with_speed(u):
            cues.append(round(at / sr, 2))     # this line begins here
            s, sr = k.create(text, voice=VOICE, speed=speed, lang=LANG)
            pieces.append(s); at += len(s)
            pad = np.zeros(int(sr * gap), dtype=np.float32)
            pieces.append(pad); at += len(pad)
            count += 1

        audio = np.concatenate(pieces)
        wav = dest.replace(".opus", ".wav")
        sf.write(wav, audio, sr)
        encode(wav, dest)

        # Timings live under src/ so the build can read them; only the audio
        # itself is a public asset. The Cloudflare build has no filesystem
        # access, so pages pick these up through Vite's glob instead.
        cue_path = os.path.join(CUES, u["rel"].replace(".opus", ".json"))
        os.makedirs(os.path.dirname(cue_path), exist_ok=True)
        with open(cue_path, "w", encoding="utf-8") as f:
            json.dump({"voice": VOICE, "duration": round(len(audio) / sr, 2), "cues": cues},
                      f, separators=(",", ":"))

        mins = len(audio) / sr / 60
        print(f'[{n}/{len(todo)}] {u["id"]}  {count} lines  {mins:.1f} min  '
              f'{os.path.getsize(dest)/1024:.0f} KB  ({time.time()-t0:.0f}s)', flush=True)


if __name__ == "__main__":
    main()
