import json
import os

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "public")

staple_games = {
    "genesis": [
        {"id": "genesis-streets-of-rage-2", "title": "Streets of Rage 2", "slug": "streets-of-rage-2", "consoleType": "Sega Genesis", "publisher": "Sega", "genre": "Beat 'em up"},
        {"id": "genesis-phantasy-star-iv", "title": "Phantasy Star IV", "slug": "phantasy-star-iv", "consoleType": "Sega Genesis", "publisher": "Sega", "genre": "RPG"},
        {"id": "genesis-gunstar-heroes", "title": "Gunstar Heroes", "slug": "gunstar-heroes", "consoleType": "Sega Genesis", "publisher": "Sega", "genre": "Run and Gun"}
    ],
    "gba": [
        {"id": "gba-metroid-fusion", "title": "Metroid Fusion", "slug": "metroid-fusion", "consoleType": "GBA", "publisher": "Nintendo", "genre": "Action-Adventure"},
        {"id": "gba-castlevania-aria-of-sorrow", "title": "Castlevania: Aria of Sorrow", "slug": "castlevania-aria-of-sorrow", "consoleType": "GBA", "publisher": "Konami", "genre": "Action-Platformer"}
    ],
    "ps1": [
        {"id": "ps1-tekken-3", "title": "Tekken 3", "slug": "tekken-3", "consoleType": "PS1", "publisher": "Namco", "genre": "Fighting"},
        {"id": "ps1-crash-bandicoot-3", "title": "Crash Bandicoot: Warped", "slug": "crash-bandicoot-warped", "consoleType": "PS1", "publisher": "Sony", "genre": "Platformer"}
    ]
}

for key, games in staple_games.items():
    json_path = os.path.join(PUBLIC_DIR, f"{key}.json")
    existing = []
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            try:
                existing = json.load(f)
            except:
                pass
    
    existing_ids = {g['id'] for g in existing}
    added = 0
    for game in games:
        if game['id'] not in existing_ids:
            existing.append(game)
            added += 1
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, indent=2)
    print(f"Added {added} staple games to {json_path}")
