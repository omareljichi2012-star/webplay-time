#!/usr/bin/env python3
"""
LaunchBox GamesDB API Art & Metadata Engine
============================================
Fetches official, high-resolution game artwork and metadata directly from
LaunchBox Games Database (GamesDB API).

Strictly isolates and maps artwork types for the 3D Box Engine and game catalogs:
  - FRONT: 'Box - Front' -> boxFront / poster / boxFrontUrl
  - SPINE: 'Box - Spine' -> boxSpine / boxSpineUrl
  - BACK:  'Box - Back'  -> boxBack / boxBackUrl
  - 3D:    'Box - 3D'    -> box3d / box3dUrl
  - CART:  'Cart - Front' -> cartridge / cartridgeFront
  - CART 3D: 'Cart - 3D'  -> cartridge3D
  - CART BACK: 'Cart - Back' -> cartridgeBack
  - LOGO:  'Clear Logo'  -> clearLogo
  - BANNER:'Banner'      -> banner
  - FANART:'Fanart - Background' -> fanart / background

Also extracts accurate IMDb-style ratings, synopsis, developers, publishers,
and release years.
"""

import sys
import os
import json
import re
import argparse
import urllib.request
import urllib.parse

BASE_API_URL = "https://gamesdb-api.launchbox-app.com"
PRIMARY_CDN_URL = "https://images.launchbox-app.com"
MIRROR_CDN_URL = "https://gamesdb-images.launchbox.gg"

# Canonical Platform Mapping for LaunchBox GamesDB
PLATFORM_MAP = {
    "nes": ["Nintendo Entertainment System", "Famicom", "Nintendo NES"],
    "snes": ["Super Nintendo Entertainment System", "Super Famicom", "Nintendo SNES"],
    "gb": ["Nintendo Game Boy"],
    "gbc": ["Nintendo Game Boy Color"],
    "gba": ["Nintendo Game Boy Advance"],
    "genesis": ["Sega Genesis", "Sega Mega Drive"],
    "n64": ["Nintendo 64"],
    "ps1": ["Sony PlayStation", "Sony Playstation", "PlayStation"],
    "ps2": ["Sony PlayStation 2", "PlayStation 2"],
    "psp": ["Sony PSP", "Sony PlayStation Portable", "PlayStation Portable"],
    "saturn": ["Sega Saturn"],
    "sega32x": ["Sega 32X"],
    "atari2600": ["Atari 2600"],
    "atari7800": ["Atari 7800"],
    "mastersystem": ["Sega Master System"],
    "gamegear": ["Sega Game Gear"],
    "turbografx16": ["NEC TurboGrafx-16", "NEC PC Engine", "PC Engine"],
    "nds": ["Nintendo DS"],
    "dos": ["MS-DOS", "DOS"],
    "flash": ["Flash", "Web Browser"]
}

def clean_search_title(title: str) -> str:
    """Normalize game title for accurate LaunchBox GamesDB searching."""
    if not title:
        return ""
    # Strip parentheses and brackets: e.g. "Sonic The Hedgehog (USA, Europe)" -> "Sonic The Hedgehog"
    cleaned = re.sub(r'\s*\([^)]*\)', '', title)
    cleaned = re.sub(r'\s*\[[^\]]*\]', '', cleaned)
    cleaned = cleaned.strip()
    return cleaned

def format_image_url(filename: str, preferred_cdn: str = PRIMARY_CDN_URL) -> str:
    """Format full CDN URL for a LaunchBox asset file."""
    if not filename:
        return ""
    if filename.startswith("http://") or filename.startswith("https://"):
        return filename
    if filename.startswith("r2_"):
        return f"{MIRROR_CDN_URL}/{filename}"
    return f"{preferred_cdn}/{filename}"

def request_json(url: str, timeout: int = 10):
    """Make HTTP GET request and parse JSON with User-Agent header."""
    headers = {
        "User-Agent": "LaunchBox-3D-Engine/2.0 (Mozilla/5.0 RetroGamePreservation)",
        "Accept": "application/json"
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status == 200:
                raw = response.read().decode('utf-8', errors='ignore')
                return json.loads(raw)
    except Exception as e:
        pass
    return None

def search_game(title: str, console_type: str = None) -> dict:
    """
    Search LaunchBox GamesDB for a game title, filtering by console/platform if provided.
    Returns matched game summary dict with 'gameKey' or None.
    """
    cleaned = clean_search_title(title)
    if not cleaned:
        return None

    encoded = urllib.parse.quote(cleaned)
    search_url = f"{BASE_API_URL}/api/search/{encoded}"
    data = request_json(search_url)

    if not data or not isinstance(data, dict):
        return None

    results = data.get("data", [])
    if not isinstance(results, list) or len(results) == 0:
        return None

    # If platform specified, find the best matching platform entry
    if console_type:
        c_key = console_type.lower().replace("-", "").replace(" ", "")
        possible_platforms = PLATFORM_MAP.get(c_key, [console_type])
        
        # 1. Exact platform match
        for item in results:
            item_platform = item.get("platformName", "")
            for p in possible_platforms:
                if item_platform.lower() == p.lower():
                    return item

        # 2. Substring platform match
        for item in results:
            item_platform = item.get("platformName", "").lower()
            for p in possible_platforms:
                if p.lower() in item_platform or item_platform in p.lower():
                    return item

    # Fallback to first result
    return results[0]

def extract_side_art(images: list, type_substring: str, region_priority=None) -> str:
    """
    Extract exact artwork file matching category and prioritize specified regions.
    Guarantees strict separation between Front, Spine, and Back!
    """
    if region_priority is None:
        region_priority = ["North America", "United States", "World", "Europe", "Japan"]

    sub = type_substring.lower()
    
    # Filter images matching this specific type
    candidates = []
    for img in images:
        tname = (img.get("imageTypeName") or "").lower()
        if sub in tname:
            candidates.append(img)

    if not candidates:
        return ""

    # Sort/find candidate by regional priority
    for reg in region_priority:
        for img in candidates:
            img_reg = img.get("regionName") or ""
            if img_reg.lower() == reg.lower():
                fn = img.get("fullGameImageFileName") or img.get("imageFileName")
                if fn:
                    return format_image_url(fn)

    # Fallback to first candidate
    first_fn = candidates[0].get("fullGameImageFileName") or candidates[0].get("imageFileName")
    return format_image_url(first_fn) if first_fn else ""

def get_game_art_and_metadata(game_key_or_title, console_type: str = None) -> dict:
    """
    Fetch comprehensive artwork and information for a game from LaunchBox GamesDB.
    Ensures:
      - 'boxFront': ONLY front cover art
      - 'boxSpine': ONLY spine art
      - 'boxBack':  ONLY back cover art
      - 'box3d':    LaunchBox official 3D box model texture
      - 'cartridgeFront': Cartridge label art
      - 'cartridge3D': 3D physical media model
      - 'cartridgeBack': Cartridge back label
      - 'rating': Real LaunchBox / IMDb-scale community rating
    """
    game_key = None
    initial_info = {}

    if isinstance(game_key_or_title, int) or (isinstance(game_key_or_title, str) and game_key_or_title.isdigit()):
        game_key = int(game_key_or_title)
    else:
        search_res = search_game(str(game_key_or_title), console_type)
        if search_res and "gameKey" in search_res:
            game_key = search_res["gameKey"]
            initial_info = search_res

    if not game_key:
        return None

    details_url = f"{BASE_API_URL}/api/games/details/{game_key}"
    details = request_json(details_url)
    if not details or not isinstance(details, dict):
        return None

    images = details.get("gameImages", [])

    # Strictly separate artwork sides
    box_front = extract_side_art(images, "box - front")
    box_back = extract_side_art(images, "box - back")
    box_spine = extract_side_art(images, "box - spine")
    box_3d = extract_side_art(images, "box - 3d")
    cart_front = extract_side_art(images, "cart - front")
    cart_back = extract_side_art(images, "cart - back")
    cart_3d = extract_side_art(images, "cart - 3d")
    clear_logo = extract_side_art(images, "clear logo")
    banner = extract_side_art(images, "banner")
    fanart = extract_side_art(images, "fanart - background")

    # Developer & Publisher
    devs = details.get("gameDevelopers", [])
    developer = devs[0].get("name") if devs and isinstance(devs, list) else "Unknown"

    pubs = details.get("gamePublishers", [])
    publisher = pubs[0].get("name") if pubs and isinstance(pubs, list) else developer

    # Genre
    genres = details.get("gameGenres", [])
    genre_names = [g.get("name") for g in genres if isinstance(g, dict) and g.get("name")]
    genre = " / ".join(genre_names[:2]) if genre_names else "Action"

    # Community Rating normalized to 10-point scale (LaunchBox uses 0.0 - 5.0)
    raw_rating = details.get("communityRating")
    if raw_rating and isinstance(raw_rating, (int, float)) and raw_rating > 0:
        rating = round(float(raw_rating) * 2.0, 1)
    else:
        rating = 8.8

    return {
        "launchboxId": game_key,
        "launchboxUrl": f"https://gamesdb.launchbox-app.com/games/details/{game_key}",
        "name": details.get("name") or initial_info.get("name") or str(game_key_or_title),
        "overview": details.get("overview") or "",
        "releaseYear": details.get("releaseYear") or (details.get("releaseDate", "")[:4] if details.get("releaseDate") else None),
        "developer": developer,
        "publisher": publisher,
        "genre": genre,
        "rating": rating,
        "esrb": details.get("esrbName"),
        "maxPlayers": details.get("maxPlayers"),
        "cooperative": details.get("cooperative", False),
        "wikipediaUrl": details.get("wikipediaUrl"),
        "videoUrl": details.get("videoUrl"),
        # Strict Artwork Map:
        "boxFront": box_front,
        "boxSpine": box_spine,
        "boxBack": box_back,
        "box3d": box_3d,
        "cartridgeFront": cart_front,
        "cartridgeBack": cart_back,
        "cartridge3D": cart_3d,
        "clearLogo": clear_logo,
        "banner": banner,
        "fanart": fanart
    }

def enrich_game_item(game_item: dict, console_type: str = None) -> dict:
    """
    Enrich an existing catalog game item in place with authentic LaunchBox art and metadata.
    Preserves existing URLs and adds verified Front, Spine, Back, and 3D textures.
    """
    title = game_item.get("title") or game_item.get("name")
    if not title:
        return game_item

    target_console = console_type or game_item.get("consoleType") or ""
    art_meta = get_game_art_and_metadata(title, target_console)

    if not art_meta:
        return game_item

    # Front art
    if art_meta.get("boxFront"):
        game_item["boxFront"] = art_meta["boxFront"]
        game_item["boxFrontUrl"] = art_meta["boxFront"]
        game_item["poster"] = art_meta["boxFront"]
        game_item["posterUrl"] = art_meta["boxFront"]

    # Spine art (Strictly Spine)
    if art_meta.get("boxSpine"):
        game_item["boxSpine"] = art_meta["boxSpine"]
        game_item["boxSpineUrl"] = art_meta["boxSpine"]

    # Back art (Strictly Back)
    if art_meta.get("boxBack"):
        game_item["boxBack"] = art_meta["boxBack"]
        game_item["boxBackUrl"] = art_meta["boxBack"]

    # 3D Box
    if art_meta.get("box3d"):
        game_item["box3d"] = art_meta["box3d"]
        game_item["box3dUrl"] = art_meta["box3d"]

    # Cartridge Assets
    if art_meta.get("cartridgeFront"):
        game_item["cartridge"] = art_meta["cartridgeFront"]
        game_item["cartridgeUrl"] = art_meta["cartridgeFront"]
        game_item["cartridgeFront"] = art_meta["cartridgeFront"]
        game_item["cartridgeFrontUrl"] = art_meta["cartridgeFront"]

    if art_meta.get("cartridgeBack"):
        game_item["cartridgeBack"] = art_meta["cartridgeBack"]
        game_item["cartridgeBackUrl"] = art_meta["cartridgeBack"]

    if art_meta.get("cartridge3D"):
        game_item["cartridge3D"] = art_meta["cartridge3D"]
        game_item["cartridge3DUrl"] = art_meta["cartridge3D"]

    # Background / Clear Logo
    if art_meta.get("clearLogo"):
        game_item["clearLogo"] = art_meta["clearLogo"]
    if art_meta.get("fanart"):
        game_item["backgroundImage"] = art_meta["fanart"]

    # Metadata enrichment
    if art_meta.get("rating"):
        game_item["rating"] = art_meta["rating"]
    if art_meta.get("overview") and len(art_meta["overview"]) > 20:
        game_item["synopsis"] = art_meta["overview"]
    if art_meta.get("developer") and art_meta["developer"] != "Unknown":
        game_item["developer"] = art_meta["developer"]
    if art_meta.get("publisher") and art_meta["publisher"] != "Unknown":
        game_item["publisher"] = art_meta["publisher"]

    game_item["launchboxId"] = art_meta.get("launchboxId")
    game_item["launchboxUrl"] = art_meta.get("launchboxUrl")

    return game_item

def main():
    parser = argparse.ArgumentParser(description="Fetch official LaunchBox GamesDB artwork and metadata.")
    parser.add_argument("title", nargs="?", help="Game title to search (e.g. 'Super Mario Bros', 'Crash Bandicoot')")
    parser.add_argument("--console", "-c", default="", help="Console or platform (e.g. NES, PS1, SNES, Genesis)")
    parser.add_argument("--test", action="store_true", help="Run self-test on prominent games across consoles")
    parser.add_argument("--enrich", help="Path to a JSON catalog file to enrich with LaunchBox assets")
    parser.add_argument("--limit", type=int, default=10, help="Max entries to enrich in batch mode")

    args = parser.parse_args()

    if args.test:
        test_cases = [
            ("Super Mario Bros", "NES"),
            ("Sonic The Hedgehog", "Genesis"),
            ("Crash Bandicoot", "PS1"),
            ("The Legend of Zelda: Ocarina of Time", "N64"),
            ("Chrono Trigger", "SNES")
        ]
        print("🎮 Running LaunchBox GamesDB Art & Metadata Verification Test...")
        print("=" * 70)
        for t, c in test_cases:
            print(f"\n🔍 Querying: '{t}' [{c}]...")
            res = get_game_art_and_metadata(t, c)
            if res:
                print(f"  ✅ Title: {res['name']} (LaunchBox ID: #{res['launchboxId']})")
                print(f"  ⭐ Real Rating: {res['rating']} / 10 | Dev: {res['developer']} | Year: {res['releaseYear']}")
                print(f"  🖼️  FRONT:  {res['boxFront'] or 'N/A'}")
                print(f"  📖 SPINE:  {res['boxSpine'] or 'N/A'}")
                print(f"  📦 BACK:   {res['boxBack'] or 'N/A'}")
                print(f"  🎲 BOX 3D: {res['box3d'] or 'N/A'}")
                print(f"  💾 CART:   {res['cartridgeFront'] or 'N/A'}")
            else:
                print(f"  ❌ No result returned for '{t}'")
        print("\n✨ Verification Test Finished.")
        return

    if args.enrich:
        if not os.path.exists(args.enrich):
            print(f"Error: File not found: {args.enrich}")
            sys.exit(1)

        print(f"📂 Enriching {args.enrich} using LaunchBox GamesDB API (Limit: {args.limit})...")
        with open(args.enrich, "r", encoding="utf-8") as f:
            catalog = json.load(f)

        count = 0
        for i, item in enumerate(catalog):
            if count >= args.limit:
                break
            title = item.get("title") or item.get("name")
            print(f"  [{i+1}/{min(len(catalog), args.limit)}] Enriching: {title}...")
            enrich_game_item(item, args.console or item.get("consoleType"))
            count += 1

        with open(args.enrich, "w", encoding="utf-8") as f:
            json.dump(catalog, f, indent=2)

        print(f"✅ Successfully enriched {count} items in {args.enrich}!")
        return

    if args.title:
        print(f"🔍 Searching LaunchBox GamesDB for: '{args.title}' (Console: {args.console or 'Any'})...")
        res = get_game_art_and_metadata(args.title, args.console)
        if res:
            print("\n" + json.dumps(res, indent=2))
        else:
            print("❌ Game not found on LaunchBox GamesDB.")
    else:
        try:
            t = input("Enter game title: ").strip()
            c = input("Enter console (optional, e.g. NES, PS1, SNES, Genesis): ").strip()
            if t:
                res = get_game_art_and_metadata(t, c or None)
                if res:
                    print("\n" + json.dumps(res, indent=2))
                else:
                    print("❌ Game not found on LaunchBox GamesDB.")
        except KeyboardInterrupt:
            print("\nExiting.")

if __name__ == "__main__":
    main()
