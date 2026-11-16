#!/usr/bin/env python3
"""
Master Catalog Builder Pipeline
Builds complete game catalog JSON datasets for all browser-emulatable platforms.
Removes PS2 completely, sets PSP to "coming_soon" with preview boxart cards.
"""

import json
import os
import re
import urllib.parse

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "public")
DATA_DIR = os.path.join(os.path.dirname(__file__), "src", "data")

for d in [PUBLIC_DIR, DATA_DIR]:
    if not os.path.exists(d):
        os.makedirs(d, exist_ok=True)

PLATFORM_CONFIGS = {
    "nes": {
        "consoleType": "NES",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Nintendo_Entertainment_System/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/nes-collection/",
        "default_ext": ".nes",
        "genre": "8-Bit Arcade Action",
        "publisher": "Nintendo",
        "year": 1985
    },
    "snes": {
        "consoleType": "SNES",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/snes-collection/",
        "default_ext": ".sfc",
        "genre": "16-Bit RPG & Platformer",
        "publisher": "Nintendo",
        "year": 1991
    },
    "gb": {
        "consoleType": "Game Boy",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/nintendo-gameboy-collection/",
        "default_ext": ".gb",
        "genre": "8-Bit Handheld Action",
        "publisher": "Nintendo",
        "year": 1989
    },
    "gbc": {
        "consoleType": "Game Boy Color",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Color/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/nintendo-gameboy-color-collection/",
        "default_ext": ".gbc",
        "genre": "Color Handheld Adventure",
        "publisher": "Nintendo",
        "year": 1998
    },
    "gba": {
        "consoleType": "GBA",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/gba-collection/",
        "default_ext": ".gba",
        "genre": "32-Bit Handheld RPG",
        "publisher": "Nintendo",
        "year": 2001
    },
    "n64": {
        "consoleType": "N64",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Nintendo_64/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/n64-collection/",
        "default_ext": ".z64",
        "genre": "64-Bit 3D Platformer",
        "publisher": "Nintendo",
        "year": 1996
    },
    "ps1": {
        "consoleType": "PS1",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Sony_-_PlayStation/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/sony_playstation_psx_collection/",
        "default_ext": ".chd",
        "genre": "32-Bit CD Action",
        "publisher": "Sony Computer Entertainment",
        "year": 1995
    },
    "mastersystem": {
        "consoleType": "Master System",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Master_System_-_Mark_III/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/sega-master-system-collection/",
        "default_ext": ".sms",
        "genre": "8-Bit Sega Classic",
        "publisher": "Sega",
        "year": 1985
    },
    "gamegear": {
        "consoleType": "Game Gear",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Game_Gear/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/sega-game-gear-collection/",
        "default_ext": ".gg",
        "genre": "Sega Color Handheld",
        "publisher": "Sega",
        "year": 1990
    },
    "genesis": {
        "consoleType": "Sega Genesis",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Mega_Drive_-_Genesis/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/sega-genesis-collection/",
        "default_ext": ".md",
        "genre": "16-Bit Sega Action",
        "publisher": "Sega",
        "year": 1989
    },
    "sega32x": {
        "consoleType": "Sega 32X",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_32X/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/sega-32x-collection/",
        "default_ext": ".32x",
        "genre": "32-Bit Sega Add-on",
        "publisher": "Sega",
        "year": 1994
    },
    "segacd": {
        "consoleType": "Sega CD",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Sega_CD/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/sega-cd-collection/",
        "default_ext": ".chd",
        "genre": "CD-ROM Interactive",
        "publisher": "Sega",
        "year": 1992
    },
    "saturn": {
        "consoleType": "Sega Saturn",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Saturn/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/sega-saturn-collection/",
        "default_ext": ".chd",
        "genre": "32-Bit 3D Arcade",
        "publisher": "Sega",
        "year": 1995
    },
    "atari2600": {
        "consoleType": "Atari 2600",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Atari_-_2600/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/atari-2600-collection/",
        "default_ext": ".a26",
        "genre": "Classic 2600 Arcade",
        "publisher": "Atari",
        "year": 1977
    },
    "atari5200": {
        "consoleType": "Atari 5200",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Atari_-_5200/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/atari-5200-collection/",
        "default_ext": ".a52",
        "genre": "Atari 8-Bit Console",
        "publisher": "Atari",
        "year": 1982
    },
    "atari7800": {
        "consoleType": "Atari 7800",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Atari_-_7800/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/atari-7800-collection/",
        "default_ext": ".a78",
        "genre": "Atari Pro System",
        "publisher": "Atari",
        "year": 1986
    },
    "atari-lynx": {
        "consoleType": "Atari Lynx",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Atari_-_Lynx/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/atari-lynx-collection/",
        "default_ext": ".lnx",
        "genre": "Atari Color Handheld",
        "publisher": "Atari",
        "year": 1989
    },
    "atari-jaguar": {
        "consoleType": "Atari Jaguar",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Atari_-_Jaguar/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/atari-jaguar-collection/",
        "default_ext": ".j64",
        "genre": "64-Bit Interactive",
        "publisher": "Atari",
        "year": 1993
    },
    "dos": {
        "consoleType": "MS-DOS",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/DOS/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/softwarelibrary_msdos_games/",
        "default_ext": ".zip",
        "genre": "PC Classic DOS",
        "publisher": "MS-DOS PC",
        "year": 1990
    },
    "flash": {
        "consoleType": "Flash",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Flash/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/flash_games_archive/",
        "default_ext": ".swf",
        "genre": "Flash Web Classic",
        "publisher": "Web Archive",
        "year": 2005
    },
    "psp": {
        "consoleType": "PSP",
        "status": "coming_soon",
        "art_base": "https://raw.githubusercontent.com/libretro-thumbnails/Sony_-_PlayStation_Portable/master/Named_Boxarts/",
        "rom_archive_base": "https://archive.org/download/sony_playstation_portable_collection/",
        "default_ext": ".iso",
        "genre": "PSP Handheld Preview",
        "publisher": "Sony Computer Entertainment",
        "year": 2004
    }
}

def clean_slug(title):
    s = title.lower()
    s = re.sub(r'\(.*?\)', '', s)
    s = re.sub(r'\[.*?\]', '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')

def clean_title(raw_name):
    name = os.path.splitext(raw_name)[0]
    name = re.sub(r'\s*\([^)]*\)', '', name)
    name = re.sub(r'\s*\[[^\]]*\]', '', name)
    return name.strip()

def build_entry(raw_title, config, index):
    title = clean_title(raw_title)
    slug = clean_slug(title)
    if not slug:
        slug = f"game-{index}"
    
    id_val = f"{config['consoleType'].lower().replace(' ', '')}-{slug}"
    encoded_art_title = urllib.parse.quote(f"{title}.png")
    poster_url = f"{config['art_base']}{encoded_art_title}"
    
    rom_filename = f"{title}{config['default_ext']}"
    encoded_rom_file = urllib.parse.quote(rom_filename)
    rom_url = f"{config['rom_archive_base']}{encoded_rom_file}"

    entry = {
        "id": id_val,
        "title": title,
        "slug": slug,
        "consoleType": config["consoleType"],
        "developer": config["publisher"],
        "publisher": config["publisher"],
        "year": config.get("year", 1995),
        "releaseYear": config.get("year", 1995),
        "genre": config["genre"],
        "rating": round(8.8 + (index % 12) * 0.1, 1),
        "synopsis": f"Official release of {title} on {config['consoleType']}. Preserved and cataloged for native browser emulation.",
        "posterUrl": poster_url,
        "poster": poster_url,
        "boxFront": poster_url,
        "box3dUrl": poster_url,
        "romUrl": rom_url,
        "streamUrl": rom_url,
        "url": rom_url
    }

    if config.get("status"):
        entry["status"] = config["status"]

    return entry

def main():
    print("🚀 Master Catalog Builder Pipeline Starting...")

    # Ensure PS2 is purged if ps2.json exists anywhere
    for p in [os.path.join(PUBLIC_DIR, "ps2.json"), os.path.join(DATA_DIR, "ps2.json")]:
        if os.path.exists(p):
            os.remove(p)
            print(f"  🗑 Removed PS2 dataset at {p}")

    for platform_key, config in PLATFORM_CONFIGS.items():
        pub_json_path = os.path.join(PUBLIC_DIR, f"{platform_key}.json")
        src_json_path = os.path.join(DATA_DIR, f"{platform_key}.json")
        
        existing_games = []
        for target_p in [pub_json_path, src_json_path]:
            if os.path.exists(target_p):
                try:
                    with open(target_p, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if len(data) > len(existing_games):
                            existing_games = data
                except Exception:
                    pass
        
        updated_entries = []
        seen_ids = set()

        for idx, item in enumerate(existing_games):
            item_title = item.get("title") or item.get("name") or f"Game {idx+1}"
            entry = build_entry(item_title, config, idx)
            if item.get("romUrl") or item.get("streamUrl") or item.get("url"):
                target = item.get("streamUrl") or item.get("romUrl") or item.get("url")
                entry["romUrl"] = target
                entry["streamUrl"] = target
                entry["url"] = target
            if item.get("poster") or item.get("posterUrl") or item.get("boxFront"):
                art = item.get("poster") or item.get("posterUrl") or item.get("boxFront")
                entry["posterUrl"] = art
                entry["poster"] = art
                entry["boxFront"] = art
                entry["box3dUrl"] = item.get("box3dUrl") or art

            if entry["id"] not in seen_ids:
                seen_ids.add(entry["id"])
                updated_entries.append(entry)

        if not updated_entries:
            # Generate sample catalog entries with Libretro artwork
            sample_titles = [
                f"{config['consoleType']} Greatest Hits Vol 1",
                f"{config['consoleType']} Championship Challenge",
                f"{config['consoleType']} Ultimate Quest",
                f"{config['consoleType']} Turbo Racer 2000",
                f"{config['consoleType']} Arcade Odyssey"
            ]
            for idx, title in enumerate(sample_titles):
                entry = build_entry(title, config, idx)
                updated_entries.append(entry)

        # Write to both /public and /src/data
        for target_p in [pub_json_path, src_json_path]:
            with open(target_p, 'w', encoding='utf-8') as f:
                json.dump(updated_entries, f, indent=2)

        print(f"  ✅ Saved {len(updated_entries)} items to {platform_key}.json")

    print("🎉 Master Catalog Pipeline complete! PS2 purged, PSP status set to coming_soon.")

if __name__ == "__main__":
    main()
