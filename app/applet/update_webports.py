import json
import os

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "public")
webport_path = os.path.join(PUBLIC_DIR, "webport.json")

gta_webports = [
    {
        "id": "webport-gtav",
        "title": "Grand Theft Auto V (GTA V Web Port)",
        "slug": "webport-gtav",
        "consoleType": "WebPort",
        "engine": "web",
        "genre": "Open World Action",
        "year": 2024,
        "rating": 9.9,
        "url": "https://fiveplay.lol/",
        "streamUrl": "https://fiveplay.lol/",
        "poster": "https://upload.wikimedia.org/wikipedia/en/a/a5/Grand_Theft_Auto_V_cover_art.jpg",
        "synopsis": "High-performance browser WebAssembly port of Grand Theft Auto V. Explore Los Santos directly in your browser with full 3D graphics.",
        "publisher": "Rockstar Games / Community Web Port",
        "releaseDate": "2024",
        "active": True
    },
    {
        "id": "webport-gta-san-andreas",
        "title": "Grand Theft Auto: San Andreas (Web Port)",
        "slug": "webport-gta-san-andreas",
        "consoleType": "WebPort",
        "engine": "web",
        "genre": "Open World Action",
        "year": 2023,
        "rating": 9.8,
        "url": "https://fiveplay.lol/",
        "streamUrl": "https://fiveplay.lol/",
        "poster": "https://upload.wikimedia.org/wikipedia/en/c/c4/GTA_San_Andreas_Cover.jpg",
        "synopsis": "Community WebAssembly port of GTA San Andreas. CJ returns to San Andreas in this seamless browser port.",
        "publisher": "Rockstar Games / Community Web Port",
        "releaseDate": "2023"
    },
    {
        "id": "webport-gta-vice-city",
        "title": "Grand Theft Auto: Vice City (Web Port)",
        "slug": "webport-gta-vice-city",
        "consoleType": "WebPort",
        "engine": "web",
        "genre": "Open World Action",
        "year": 2023,
        "rating": 9.7,
        "url": "https://fiveplay.lol/",
        "streamUrl": "https://fiveplay.lol/",
        "poster": "https://upload.wikimedia.org/wikipedia/en/d/dc/ViceCityCover.jpg",
        "synopsis": "1980s neon-soaked Vice City ported to WebAssembly for smooth browser gameplay.",
        "publisher": "Rockstar Games / Community Web Port",
        "releaseDate": "2023"
    },
    {
        "id": "webport-gta-3",
        "title": "Grand Theft Auto III (Web Port)",
        "slug": "webport-gta-3",
        "consoleType": "WebPort",
        "engine": "web",
        "genre": "Open World Action",
        "year": 2022,
        "rating": 9.6,
        "url": "https://fiveplay.lol/",
        "streamUrl": "https://fiveplay.lol/",
        "poster": "https://upload.wikimedia.org/wikipedia/en/e/eb/GTA3boxcover.jpg",
        "synopsis": "The legendary 3D open-world classic GTA III running via WebAssembly in browser.",
        "publisher": "Rockstar Games / Community Web Port",
        "releaseDate": "2022"
    }
]

existing = []
if os.path.exists(webport_path):
    try:
        with open(webport_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    except Exception:
        pass

# Filter out old gtav entries to avoid duplication
existing = [g for g in existing if not g.get('id', '').startswith('webport-gta')]

# Prepend GTA web ports
final_list = gta_webports + existing

with open(webport_path, 'w', encoding='utf-8') as f:
    json.dump(final_list, f, indent=2)

print(f"✅ Updated {webport_path} with GTA WebAssembly ports at the top. Total web ports: {len(final_list)}")
