# Cinematic scroll playbook

How lashlan.com got its scroll-directed "film" (the atrium, the crystal core,
the fly-through, the section backgrounds), written so another Claude Code chat
can do the same for the Blood of Icetear home page with characters.

The working reference implementation is the lashlan.com repo:
`C:\Users\lashl\Projects\lashlan-com` (read its `CLAUDE.md`, section "The
Infinite AI Core", and `src/scripts/cinematic/`). Read it before writing code.
Do not copy its content or look; copy its *mechanics*.

Lash is not a developer. Talk in plain language, show everything locally
first, say "locally" or "live" every time, and publish only when Lash says so.
No em dashes anywhere.

---

## 1. Why it works

Sites like scrolltide.co look expensive for one reason: **the pictures are
cinematic, and the code only moves a camera over them.** Hand-drawn SVG and
WebGL alone never reach that level. So the job splits in two:

1. **Lash makes the images** in ChatGPT's image generator from prompts you
   write. This costs nothing extra and Lash controls the art.
2. **You turn stills into motion**: layered "plates" that the scroll pushes,
   pans, reveals and crossfades, plus small code effects (particles, a light,
   a travelling dot) that make the stills feel alive.

Scroll position is the clock. Every visual is a pure function of scroll
progress, so scrolling back up rewinds everything exactly, and the narration
(Listen) can drive the same scenes by choosing scroll positions.

---

## 2. The conversation with Lash, step by step

Do these in order. Use the question tool for real choices, and give a
recommendation first.

1. **Study the reference** Lash likes (if any). The browser pane may be
   blocked for some sites; headless Chrome works (section 8). Report in two or
   three lines what makes it good.
2. **Ask three things at once:**
   - *Art direction*: two or three named options, each one sentence, one
     marked recommended.
   - *Scope*: which parts of the page get the treatment (the opening, one
     showpiece scene, section transitions, a finale). Fewer, better scenes
     beat many thin ones.
   - *Who makes the images*: Lash via ChatGPT (recommended, free), or another
     tool.
3. **Plan the shots before the prompts.** Write a short shot list: for each
   scene, what the camera does and which layers it needs. Every image must
   earn its place. lashlan.com used 12 images for 7 scenes.
4. **Write the prompts file** (section 3) into the repo, for example
   `art/PROMPTS.md`, and give Lash the prompts in chat as well, one per
   image, with the exact file name and size.
5. **Receive the images.** Lash will drop them in a folder (last time
   `C:\Users\lashl\Downloads\Animation images`, in subfolders, with ChatGPT's
   own timestamped names). Build a contact sheet, match each image to its
   slot by timestamp order and by looking at it, check transparency, and tell
   Lash plainly whether they will do. Only ask for a regeneration if an image
   truly fails (text, extra limbs, wrong character, a solid background where
   transparency was needed and you cannot cut it out).
6. **Build, verify locally with screenshots, send Lash contact sheets** of
   the scroll (frames at many scroll positions, desktop and phone).
7. Remind Lash that **this laptop has Windows animation effects off**, so
   Chrome here shows the still version. To see it move: Settings,
   Accessibility, Visual effects, Animation effects on, then refresh. This
   surprised Lash last time ("i dont see any of it moving"); say it up front.
8. **Publish only on Lash's word**, then verify on the real address.

---

## 3. Writing the image prompts

### Rules that made the images consistent

- **One style line pasted at the start of every prompt.** Palette with hex
  colours, lighting, lens, grain, mood, and a list of what must never appear
  (text, logos, watermarks, extra characters, modern objects).
- **Make image 01 first. For every later image, attach 01** (and the
  character references) and add: "Match the lighting, materials and colours
  of the attached image." This is what kept all 12 images in one world.
- **Give exact sizes**: 1536 x 1024 landscape, 1024 x 1536 portrait, 1024 x
  1024 square. Ask for a portrait version of any full-screen plate that must
  work on phones.
- **Leave room for the page.** Ask for empty, calm areas where text will sit,
  and a clear subject at the centre if the camera will push into it.
- **Layers, not finished pictures.** A foreground layer (an arch, branches,
  mist) must be "foreground layer only ... everything else fully transparent,
  PNG with transparent background". Subjects that move on their own (a
  character, an object) must be on a transparent background with no floor
  and no shadow.
- Tell Lash: if a transparent image comes back on a solid background, send
  it anyway; you will cut it out (section 4).

### Characters (new for Blood of Icetear)

Characters are harder than places because they must stay the same person in
every image. Do this:

- **Attach the character's reference image to every prompt** that shows
  them, and say "the same character as the attached image: same face, hair,
  armour, colours, proportions".
- **Full body, transparent background, even studio light matching the
  scene's key light**, so they can be placed into any background plate.
- **Poses as separate images**, not one image with both characters. Separate
  cutouts can be moved, scaled and lit independently, which is what makes a
  face-off feel like a camera shot. Useful poses: standing guard, turning
  toward the other, mid-lunge, weapon raised, a three-quarter back view (for
  over-the-shoulder shots).
- **Matching angles in pairs**: if character A faces right at three-quarters,
  make character B face left at three-quarters, same camera height, same
  light direction.
- **Faces**: ask for a neutral expression unless the moment needs more; AI
  expressions drift between images.
- For the two characters Lash shared (a masked, crowned elf lord in pale gold
  filigree armour with a rust-red cloak and glowing eyes; a white-haired
  ranger in worn brown leather and plate with a torn hooded cloak), keep the
  palette from those images and match every background to it.

### "The character moves at certain angles"

A still image cannot turn. Pick one of these, cheapest first, and explain the
choice to Lash:

1. **Pose crossfade** (cheap, reliable): three to five poses of the same
   character at the same scale and position; scroll crossfades between them
   while the camera moves. With a push-in and a light sweep this reads as
   motion.
2. **2.5D parallax** (cheap, very effective): character cutout, background,
   and a foreground layer (mist, embers, branches) moving at different speeds
   and scales. Add a slight rotate and scale on the character for "weight".
3. **Scroll-scrubbed video frames** (most cinematic, what the best sites do):
   Lash generates a short video (for example in Sora, Runway or Kling) from
   the character image, such as a slow turn or a sword draw. You extract
   60 to 120 frames with ffmpeg, compress them to WebP (about 20 to 60 KB
   each), and draw the frame for the current scroll position onto a canvas.
   Load frames progressively and keep a still fallback. Check file sizes
   (the whole sequence should stay under about 4 MB) and ask Lash before
   adding this much weight.

### Blood drop, ghost spirit, and other effects

These are better made in code than in images, because they must move freely:

- **Ghost spirit flying between the characters**: a transparent PNG wisp (one
  prompt: "a single translucent ghostly spirit, pale blue-white, trailing
  mist, transparent background"), moved along an SVG path by scroll progress
  (the lashlan.com "signal" does this: `signal.ts`, `pointOnPath`), with a few
  fading copies behind it for a trail, or a small particle canvas.
- **Blood drop**: an SVG or canvas drop that falls with scroll progress, and
  a splash or ripple that spreads on impact. Keep it restrained: one drop, one
  moment, dark red, not gore.
- **Embers, snow, dust**: a small canvas particle loop that runs only while
  its scene is on screen (see `runSnow` in lashlan.com `scenes.ts`).

### Prompt template

```
[STYLE LINE]
[What the image is, where the camera is, what is in frame and what is not]
[Layer instructions: "foreground only, transparent elsewhere" or "subject only on a fully transparent background, no floor, no shadow"]
Size: 1536 x 1024.
Match the lighting, materials and colours of the attached image(s).
```

A face-off shot list that suits Blood of Icetear (adapt it with Lash):

| # | File | What |
|---|---|---|
| 01 | `01-battlefield.png` | Wide landscape plate: the place they meet (frozen field, ruined hall), empty, symmetrical, light in the centre. Also a portrait version. |
| 02 | `02-foreground.png` | Foreground layer only (broken pillars or snow-laden branches at the edges), transparent elsewhere. |
| 03 to 05 | `03-lord-stand.png` ... | Character A: standing, turning, attacking. Transparent. |
| 06 to 08 | `06-ranger-stand.png` ... | Character B: the matching three poses, mirrored angle. Transparent. |
| 09 | `09-spirit.png` | The ghost wisp, transparent. |
| 10 | `10-closeup.png` | A close-up plate for the clash moment (eyes, blades crossing), for a hard cut. |

---

## 4. Processing the images

Do image work in a short folder such as `C:\Users\lashl\AppData\Local\Temp\tl\`
(Python cannot open the long scratchpad path). Write scripts with the Write
tool, not Bash heredocs (Git Bash mangles backslashes and quotes).

1. **Contact sheet**: a PIL script (like `docs/tools/grid.py`) that tiles thumbnails, pasting transparent
   images on magenta so real transparency is obvious.
2. **Cut-outs**: if a "transparent" image has a solid background, remove it
   (for example with `rembg`), then check the edges on magenta.
3. **Trim** transparent subjects to their bounding box and pad to a square or
   a fixed height, so scaling maths is predictable.
4. **Export WebP** into `public/cine/` (served as-is):
   - landscape plates at 960 and 1536 wide (quality 78),
   - portrait plates at 800 wide,
   - transparent subjects at two sizes (for example 520 and 900), quality 82.
   The whole lashlan.com set was about 2.5 MB, and each image loads only when
   needed.

---

## 5. How the code is built (read lashlan.com for the real thing)

- **Director** (`director.ts`): GSAP ScrollTrigger for pinning and progress,
  Lenis for smooth wheel scrolling on mouse and trackpad (touch keeps native
  scrolling), and one frame loop that smooths each scene's progress and calls
  its `update(progress)`.
- **Scenes** (`scenes.ts`): one function per scene, in story order. Each is a
  pure function of its progress 0..1. Helpers: `seg(p, a, b)` (a sub-range),
  `smooth` (ease), `lerp`.
- **Plates** (`plates.ts`): one fixed layer just above the page background and
  below the content. Each plate is an `<img>` in a full-screen div; scenes set
  `{o, s, x, y, r}` (opacity, scale, pan, circular reveal). **Plates reset to
  hidden at the start of every frame**, so only scenes on screen decide what
  shows. A moving subject (the crystal, a character) is positioned from shared
  state (x, y, scale) with `transform` only.
- **Layers** use z-index tokens in `global.css` (`--z-backdrop`, `--z-plates`,
  `--z-stage`, `--z-content` ...), never raw numbers.
- **Loading**: plates load when about to be seen; the opening set loads when
  the page is idle; later plates load and `decode()` while their section is
  still about two screens away. Skip plates entirely with data saver on.
- **Text stays readable**: busy images sit at 25 to 45% opacity behind text;
  darken sections that sit over dark plates (lashlan.com adds `tone-dark` to
  some sections from the script only, so the still version is unchanged).
- **Fallbacks**: without JavaScript, or with reduced motion, the page must be
  complete and calm. Show one good still (the hero image) instead of the
  animation.

### Camera recipes

| Effect | How |
|---|---|
| Push in | Plate scale 1 to 1.6 over the scene; slight upward pan. |
| Pass through a foreground | Foreground plate scales 1 to 3.4 and fades out as it "passes the camera". |
| Enter something | Subject scales past the screen size while the next plate opens with `clip-path: circle()` from the centre. |
| Pan | `x` from +7% to -7% of the width across the section. |
| Pull back (finale) | Reverse of the push: scale 1.6 to 1 while the story's pieces gather. |
| Face-off | A and B start off-screen left and right, slide in on parallax, the camera pushes between them, poses crossfade at the clash, the spirit crosses on a path, hard cut to the close-up plate, then pull back. |

### A face-off timeline (one pinned scene, progress 0..1)

- 0.00 to 0.15: battlefield plate fades in, slow push.
- 0.10 to 0.35: character A slides in from the left, B from the right
  (different speeds for depth); foreground mist drifts.
- 0.35 to 0.55: camera pushes between them; both switch to "turning" poses.
- 0.50 to 0.70: the spirit flies from A to B along a curved path, leaving a
  trail; a single blood drop falls at the midpoint.
- 0.70 to 0.80: clash: both "attack" poses, a white flash, cut to the
  close-up plate.
- 0.80 to 1.00: pull back; title text reveals.

---

## 6. Listen (narration) must drive the same scenes

Blood of Icetear already narrates its stories. If the home page gets a Listen
button, copy lashlan.com's approach (`src/components/Listen.astro`):

- Each narration line has a target element and either `at` (where in a
  pinned scene it belongs, 0..1) or `through` (play part of a scene during the
  line).
- **Do not glide from line to line** (that looked rigid: stop, jump, stop).
  Instead give every line a scroll position at the moment it starts, draw a
  smooth monotone curve through those points against the audio clock, and
  move the page along the curve every frame. Ordinary text and a scene's last
  line hold still for part of their line; the page never scrolls backwards;
  long moves start earlier instead of rushing. Settings live in one `cam`
  object.
- Scrolling by hand pauses following until the next section; menu jumps
  pause; stop leaves the page where it is.

---

## 7. Lessons learned (each cost time)

- **Gaps between scenes**: when one pinned scene ends and the next has not
  started, no scene writes the plates and they vanish for a moment. Add a
  small "approach" scene over the gap that holds the plates.
- **Phones**: the hero is not pinned there, so plates can cover text too
  early; fade them in with `Math.max` of what earlier scenes set. Things that
  follow the camera must also leave when their scene ends on phones.
- **Busy images behind small text** looked great in screenshots and were
  hard to read; lower the opacity.
- **Big moving images** must be positioned with `transform` and scaled from a
  fixed base size; never animate width, height or `filter`.
- **Stalls**: first showing a large image can freeze a frame; decode ahead.
- **Section colours**: the page background is one fixed layer painted by the
  director; if a section's colour looks wrong after pinning, check the
  section list ignores pin wrappers.
- Headless Chrome (software rendering) is slow and sometimes flaky; if a test
  fails oddly, rerun it before assuming the site is broken.
- Old preview servers keep their ports; stop them so you are not testing a
  stale build.

---

## 8. Checking the work

Lash's laptop shows the still version, so verify with headless Chrome over the
DevTools protocol. Copies of the tools used for lashlan.com are in
`docs/tools/`: `cdp.mjs` (the headless driver), `grid.py` (contact sheets of
screenshots) and `cine_art.py` (the WebP export used for the artwork; change
its paths and names). Copy them to `C:\Users\lashl\AppData\Local\Temp\tl\`
and run them from there:

```
node cdp.mjs <url> <outdir> <width> <height> on|off|nojs plan.json
```

It launches headless Chrome with software WebGL, sets
`Emulation.setEmulatedMedia` to `prefers-reduced-motion: no-preference` for
"on", uses `Emulation.setDeviceMetricsOverride` for phone widths, runs the
steps in `plan.json` (wait, evaluate JavaScript, screenshot) and prints page
errors. Evaluations time out after 20 seconds, so keep waits shorter.

Check, every time:

- A scroll sweep on desktop (1440 x 900) and phone (390 x 844): screenshots
  at 20 to 40 scroll positions, tiled into contact sheets. Look at every
  frame.
- No sideways scrolling on phones (`scrollWidth === clientWidth`).
- Reduced motion and no JavaScript: complete, calm, readable.
- Listen: it follows, pauses on hand scroll, resumes at the next section,
  pause, resume, stop.
- Send Lash the contact sheets, then give the local address.

After publishing, run the same sweep against the real address before saying
it is live.
