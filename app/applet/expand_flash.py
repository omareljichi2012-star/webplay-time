import json
import os

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "public")
flash_json_path = os.path.join(PUBLIC_DIR, "flash.json")

additional_flash_games = [
    {
        "id": "flash-fancy-pants-adventure",
        "title": "The Fancy Pants Adventure",
        "slug": "the-fancy-pants-adventure",
        "consoleType": "Flash",
        "developer": "Brad Borne",
        "publisher": "Armor Games",
        "releaseYear": 2006,
        "genre": "Platformer",
        "rating": 9.5,
        "synopsis": "Run, jump, and slide through stick-figure worlds in this iconic Flash platformer masterpiece.",
        "posterUrl": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
        "poster": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
        "boxFront": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
        "box3dUrl": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
        "romUrl": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/fancypants1.swf",
        "streamUrl": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/fancypants1.swf",
        "url": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/fancypants1.swf"
    },
    {
        "id": "flash-bloons-tower-defense",
        "title": "Bloons Tower Defense",
        "slug": "bloons-tower-defense",
        "consoleType": "Flash",
        "developer": "Ninja Kiwi",
        "publisher": "Ninja Kiwi",
        "releaseYear": 2007,
        "genre": "Strategy / TD",
        "rating": 9.4,
        "synopsis": "Pop the colorful balloons using dart-throwing monkeys in the legendary tower defense original.",
        "posterUrl": "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
        "poster": "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
        "boxFront": "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
        "box3dUrl": "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
        "romUrl": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/bloons.swf",
        "streamUrl": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/bloons.swf",
        "url": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/bloons.swf"
    },
    {
        "id": "flash-crush-the-castle",
        "title": "Crush the Castle",
        "slug": "crush-the-castle",
        "consoleType": "Flash",
        "developer": "Armor Games",
        "publisher": "Armor Games",
        "releaseYear": 2009,
        "genre": "Physics Destroyer",
        "rating": 9.3,
        "synopsis": "Launch boulders and explosives from a trebuchet to demolish enemy castles and royals.",
        "posterUrl": "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80",
        "poster": "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80",
        "boxFront": "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80",
        "box3dUrl": "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80",
        "romUrl": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/crushthecastle.swf",
        "streamUrl": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/crushthecastle.swf",
        "url": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/crushthecastle.swf"
    },
    {
        "id": "flash-papas-pizzeria",
        "title": "Papa's Pizzeria",
        "slug": "papas-pizzeria",
        "consoleType": "Flash",
        "developer": "Flipline Studios",
        "publisher": "Flipline Studios",
        "releaseYear": 2007,
        "genre": "Time Management",
        "rating": 9.6,
        "synopsis": "Take orders, top pizzas with precision, bake to perfection, and slice for hungry customers.",
        "posterUrl": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
        "poster": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
        "boxFront": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
        "box3dUrl": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
        "romUrl": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/papaspizzeria.swf",
        "streamUrl": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/papaspizzeria.swf",
        "url": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/papaspizzeria.swf"
    },
    {
        "id": "flash-qwop",
        "title": "QWOP",
        "slug": "qwop",
        "consoleType": "Flash",
        "developer": "Bennett Foddy",
        "publisher": "Foddy.net",
        "releaseYear": 2008,
        "genre": "Physics Challenge",
        "rating": 9.2,
        "synopsis": "Control the individual thigh and calf muscles of an Olympic runner using only the Q, W, O, and P keys.",
        "posterUrl": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80",
        "poster": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80",
        "boxFront": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80",
        "box3dUrl": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80",
        "romUrl": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/qwop.swf",
        "streamUrl": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/qwop.swf",
        "url": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/qwop.swf"
    },
    {
        "id": "flash-line-rider",
        "title": "Line Rider",
        "slug": "line-rider",
        "consoleType": "Flash",
        "developer": "Boštjan Čadež",
        "publisher": "InXile",
        "releaseYear": 2006,
        "genre": "Sandbox / Physics",
        "rating": 9.5,
        "synopsis": "Draw tracks and slopes for a sledder to navigate gravity in this legendary creative sandbox.",
        "posterUrl": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
        "poster": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
        "boxFront": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
        "box3dUrl": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
        "romUrl": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/linerider.swf",
        "streamUrl": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/linerider.swf",
        "url": "https://raw.githubusercontent.com/BinBashBanana/gstore/master/linerider.swf"
    }
]

existing = []
if os.path.exists(flash_json_path):
    try:
        with open(flash_json_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    except Exception:
        pass

# Merge avoiding duplicates
existing_ids = {g['id'] for g in existing}
added_count = 0
for game in additional_flash_games:
    if game['id'] not in existing_ids:
        existing.insert(0, game)
        added_count += 1

with open(flash_json_path, 'w', encoding='utf-8') as f:
    json.dump(existing, f, indent=2)

print(f"✅ Added {added_count} legendary popular Flash games to {flash_json_path}. Total flash games: {len(existing)}")
