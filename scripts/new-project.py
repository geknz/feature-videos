#!/usr/bin/env python3
"""Create a capture project without overwriting an existing directory."""
import shutil,sys
from pathlib import Path
skill=Path(__file__).resolve().parents[1]
target=Path(sys.argv[1]).resolve()
if target.exists(): raise SystemExit('Destination already exists; choose a new project directory.')
shutil.copytree(skill/'assets/starter',target)
shared=target/'src/shared';shared.mkdir()
for name in ['device-frame.css','device-frame.html','device-frame.json','motion.mjs','motion-tokens.json']:
 shutil.copy2(skill/'assets'/name,shared/name)
shutil.copy2(skill/'references/BRIEF_TEMPLATE.md',target/'brief.md')
print(target)
