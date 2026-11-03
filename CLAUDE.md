# CLAUDE.md

## Design and frontend work: pick the skill yourself

The user should never have to type a slash command for design work. When a request involves building, changing or improving anything visual (a website, page, dashboard, the `viewer/`, a component, styling, animation), choose the matching skill(s) below and use them automatically with the Skill tool. Say in one short line which skill you're using.

Use the first row that matches. Combine skills when a request covers several rows. For example, "build a landing page and make it feel alive" uses `design-taste-frontend` first, then `animate`.

| When the user asks to… | Use |
|---|---|
| Create a new website from scratch | `frontend-design` for the design plan (palette, type, layout), then `design-taste-frontend` to build and lint it |
| Build a new landing page, marketing or public-facing page, or says it looks generic / "AI-made" / not premium | `design-taste-frontend` (plus `frontend-design` if there's no design direction yet) |
| Build or redesign an app screen (dashboard, settings, forms, onboarding, empty states) | `impeccable` (`shape`, then `craft`) |
| Start design work in a project with no DESIGN.md yet | `impeccable init` first |
| "Make it better", polish, clean up, final pass before shipping | `impeccable polish` |
| Review, critique or audit a design / "what's wrong with this page" | `impeccable critique` or `impeccable audit`, plus `emil-design-eng` for detail-level feedback |
| Too plain → bolder; too loud → quieter; colour, fonts, layout, copy | `impeccable bolder` / `quieter` / `colorize` / `typeset` / `layout` / `clarify` |
| Add an animation, transition or motion to something specific | `animate` |
| Review or fix existing animations | `review-animations` (one piece) / `improve-animations` (whole codebase) |
| "What could be animated?" / make it feel alive | `find-animation-opportunities` |
| Too much animation / app feels slow | `remove-animations` |
| Animation is janky or drops frames | `animation-performance` |
| Stress-test a component, edge cases, "try to break it" | `break-ui` |
| Make it feel right on a phone / PWA / touch | `mobile-native` |
| Gestures, springs, sheets, Apple-style feel | `apple-design` |
| Try several design variants side by side | `prototype` |
| Choose a UI/component library | `pick-ui-library` |
| Toasts with Sonner | `ask-sonner` |
| React Native / Expo animation | `animate-expo` |
| Swift / iOS code | `write-swift` |
| User describes a motion effect and doesn't know its name | `animation-vocabulary` |
| General UI taste and small details | `emil-design-eng` |

### Figma

If the user shares a Figma link or mentions a Figma design and the Figma MCP tools are available, use them to read the design (frames, styles, variables) before writing code. Then build it using the skills above. If the Figma tools aren't available, say so in one line and ask the user to connect Figma at https://claude.ai/customize/connectors.

### Playwright: look at the result

After building or changing anything visual, open it in a browser and look at it before calling the work done. Don't wait to be asked. Use the Playwright MCP tools if they're loaded, otherwise the Playwright library directly. Take screenshots at desktop width and at phone width (390px), check for broken layout, overflow and console errors, fix what you find, and show the user the final screenshot. Also use Playwright when the user asks to test a page, click through a flow, or check a live site.

### Websites: where they live and how they go online

- Each website lives in its own folder at the repo root, such as `website/`. It never mixes with the trading code.
- `website/` is the hotel website product: one Next.js app with a sales page (`/en`, `/pt`, `/es`) and one site per hotel (`/<lang>/h/<slug>`), each hotel a JSON file in `website/data/hotels/`. Adding or changing a hotel means editing that JSON (see `website/README.md`). Run `npm test`, `npm run typecheck` and `npm run build` in `website/` before pushing.
- Default stack for a new site unless the user asks otherwise: plain HTML/CSS/JS for simple sites; Next.js + Tailwind when it needs several pages, a blog or app features.
- Deploying: the site is hosted on Vercel, connected to this GitHub repo with the site folder as its Root Directory. Every merge to `main` goes live automatically, and every pull request gets its own preview link. So "put it online" or "publish the change" means: commit, push, open a PR (the preview link appears on it), and tell the user to merge it.
- If the Vercel connector is loaded, use it to check the deployment status and build logs after pushing, and to fix failed builds.

### Not design work

Skip all of this for non-visual work such as the trading logic in `core/`, `divisions/`, `main.py` and similar.
