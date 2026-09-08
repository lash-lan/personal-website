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
