# Working with me on this site

I am not a developer and I do not intend to become one. I describe what I want
in ordinary words; you do the implementing.

## How to talk to me

- Explain in plain language. If a technical term is unavoidable, define it once.
- Tell me before you do anything that would be hard to undo.
- If you are guessing rather than certain, say so plainly.
- Never change things I did not ask about. If you spot something else worth
  fixing, mention it and let me decide — do not fold it into the current change.

## How to make a change

1. Make the change and show me how it looks locally, before publishing anything.
2. Explain what you changed and why, without assuming I know technical terms.
3. Only once I say I am happy, publish it.
4. After publishing, confirm it is actually live by checking the real web
   address — https://bloodoficetear.com — not by telling me it should be
   working.

"Done" is ambiguous. Always say whether something is done *locally* or *live*.

## Two laptops

This project is checked out on more than one machine. Always `git pull` before
starting work, and push when a change is finished. Do not leave work committed
locally but unpushed.

## This laptop

These facts describe the Windows laptop, which I share with my Dharmalogist
project. The other laptop may differ, so if something doesn't fit, check rather
than assume.

- Windows 11, with PowerShell and Git Bash, Node 22, Git 2.47.
- Git is signed in to GitHub as `lash-lan` through Git Credential Manager, so
  pushing works.
- The GitHub CLI (`gh`) is at `C:\Users\lashl\tools\gh\bin\gh.exe`. It is not on
  PATH and not logged in. You should not need it. If you do, tell me and I will
  log in myself.

## Lessons learned (from the Dharmalogist build)

- Checking a page with `curl` can mislead. Redirects made by the page's scripts
  still return 200, and text drawn by JavaScript is not in the HTML. Check the
  live site in a real browser.
- A hidden browser pane pauses animations, so pages can look washed out. Bring
  the pane to the front before judging how something looks.
- Git Bash mangles backslashes in heredocs. Write files with the Write or Edit
  tools instead.
- Python cannot open files in the very long scratchpad path. Do Python work in a
  short folder such as `C:\Users\lashl\AppData\Local\Temp\tl\`.
- Old preview servers keep their ports. Stop them so you are not testing a stale
  preview.
- Secrets never go in the repo or the chat. They go in Cloudflare (the Worker,
  then Settings, then Variables and Secrets), and I type them in myself.

## The project

Astro 6 static site, live at **https://bloodoficetear.com**, deployed to
Cloudflare Workers via the `@astrojs/cloudflare` adapter. Cloudflare watches the
`main` branch on GitHub and rebuilds on every push — nothing is ever uploaded by
hand. The domain is registered with Cloudflare too, so there is no separate
nameserver step.

- `src/pages/` — one file per page; the filename becomes the web address.
  Sections: `codex`, `gallery`, `library`, `sagas`, `trial`, `workshop`.
- `src/data/` — the written content and structured data the pages read from.
- `src/components/`, `src/layouts/` — the reusable furniture.
- `src/lib/` — the logic behind the Trial and the tools.
- `public/` — images and files served exactly as they are.

Commands: `npm run dev` (local preview), `npm run build` (production build).
