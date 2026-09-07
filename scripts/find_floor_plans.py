import os
from pathlib import Path

search_roots = [
    Path(r"c:\Users\ASUS\Desktop"),
    Path(r"c:\Users\ASUS\Downloads"),
    Path(r"c:\Users\ASUS\Documents"),
    Path(r"c:\Users\ASUS\Pictures"),
    Path(r"c:\Users\ASUS\Videos"),
    Path(r"c:\Users\ASUS\.gemini"),
]

exts = {".png", ".jpg", ".jpeg", ".svg", ".pdf", ".dwg", ".dxf", ".json", ".yaml", ".yml", ".bmp", ".webp"}
keywords = ["floor", "plan", "b2", "carparking", "layout", "parking_map", "facility"]

found = []
for root in search_roots:
    if not root.exists():
        continue
    print(f"Scanning {root}...")
    for p in root.rglob("*"):
        try:
            if p.is_file() and p.suffix.lower() in exts:
                nl = p.name.lower()
                if any(k in nl for k in keywords):
                    if not any(x in p.parts for x in ["node_modules", ".git", ".next"]):
                        found.append(p)
        except Exception:
            pass

print(f"\nTotal matches found: {len(found)}")
for f in found[:50]:
    print(f"  {f} ({f.stat().st_size:,} bytes)")
