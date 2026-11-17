# Scenes, caching and review

## Scene contract

Each scene has an ID, duration, entry module, keyframe checkpoints and dependencies in `film.json`. Scene modules live under `src/scenes/<id>/`. They calculate the full UI and camera pose from local time; seeking backward or rendering scenes out of order must produce the same frame.

The capture layer exposes:

- `window.ready` — initialization complete.
- `window.prepare(sceneId, checkpoints)` — preload scene images and fonts.
- `window.seek(sceneId, localSeconds)` — apply a deterministic frame.

Prepare assets before rendering rather than decoding every image for every frame. Use fixed data and seeded randomness. Download external assets locally before capture.

## What gets rebuilt

Draft and final have separate caches. A scene's source, declared dependencies and profile contribute to its cache key. Shared files invalidate all dependent scenes. Cached clips are checked by checksum, and incomplete renders are not reused. The renderer joins scene clips without re-encoding the whole film.

Declare external product components, assets and their transitive dependencies in `film.dependencies` or `scene.dependencies`. Missing dependencies can produce stale clips. When unsure, declare them shared.

A transition belongs to one scene. If it uses the neighboring scene's UI, include that UI as a dependency. Check matching end/start poses at scene boundaries. Reordering scenes can reuse clips, but any changed incoming state must be updated explicitly.

## Flask loop

Upload one version per feedback round to the existing asset. Include a source ZIP and notes explaining the changes. Exclude dependencies, render caches and output videos from the source ZIP. The agent reads frame comments and recordings through your Flask integration when asked, applies the feedback and uploads the next draft.

After upload, return the link and finish. This workflow does not keep the agent waiting for feedback unless you explicitly ask it to watch. It does not include a standalone Flask API client or credentials.

## Final delivery

After revisions, render the final profile. Check the full video at normal speed, important action frames, scene transitions and any loop. The renderer checks new clips with FFmpeg/ffprobe; visual review remains the agent's job. Keep sources and the exact rendering command with the delivery.

The detailed agent guide is [FAST_WORKFLOW.md](../references/FAST_WORKFLOW.md).
