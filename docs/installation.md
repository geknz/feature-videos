# Installation

Clone the repository and point your agent at `SKILL.md`. It does not require a particular agent: the agent needs file access, a shell and a way to inspect the product and review frames.

## Renderer requirements

- Python 3 for the project generator.
- Node.js 20 or newer and npm.
- Google Chrome installed locally (the renderer uses Playwright's `chrome` channel).
- FFmpeg and ffprobe on PATH.
- Access to the product's source or designs and any required browser/Figma integration.
- A Flask integration if you want uploads and feedback in Flask.

## Create a project

```sh
python3 ~/feature-videos/scripts/new-project.py ~/my-feature-video
cd ~/my-feature-video
npm install
npm test
npm run dev
```

The dev server prints its local preview URL. The render commands start their own local server, so the preview server is optional for export.

In another terminal:

```sh
cd ~/my-feature-video
npm run plan
npm run check
npm run draft
# After revisions:
npm run final
```

Outputs are `out/draft.mp4` and `out/final.mp4`. Reports are in `qa/`; keyframes and reusable scene clips are in `.cache/`. Inspect the keyframes and watch the final MP4; automated checks do not judge visual quality.

Keep the generated `package-lock.json` with your project and add it to the top-level `dependencies` array in `film.json`, so dependency changes invalidate the scene cache.

Do not run two render processes in the same project folder at once. For a React/Vite product, the agent must adapt the dev server while keeping the capture API; the included starter uses plain browser JavaScript.
