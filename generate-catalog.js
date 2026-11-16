/**
 * generate-catalog.js
 * Automated build script for compiling retro game catalogs and digital art books.
 * Uses public Wikipedia REST API and Libretro / Wikimedia open repositories without API keys.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, 'src', 'data');
const USER_AGENT = 'RetroArtBookCatalogBot/1.0 (https://github.com/retro-vault; educational-catalog@build.bot)';

// Rate-limiting delay helper to respect Wikimedia / Archive servers
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Pre-seeded games to enrich with Wikipedia summaries and box art
const CONSOLE_GAME_SEEDS = {
  NES: [
    { title: 'Super Mario Bros. 3', wikiQuery: 'Super_Mario_Bros._3', defaultYear: 1988, developer: 'Nintendo R&D4', genre: 'Platformer', romSlug: 'Super_Mario_Bros._3.nes' },
    { title: 'The Legend of Zelda', wikiQuery: 'The_Legend_of_Zelda_(video_game)', defaultYear: 1986, developer: 'Nintendo R&D4', genre: 'Action-Adventure', romSlug: 'Legend_of_Zelda,_The.nes' },
    { title: 'Castlevania', wikiQuery: 'Castlevania_(video_game)', defaultYear: 1986, developer: 'Konami', genre: 'Action-Platformer', romSlug: 'Castlevania.nes' },
    { title: 'Mega Man 2', wikiQuery: 'Mega_Man_2', defaultYear: 1988, developer: 'Capcom', genre: 'Action-Platformer', romSlug: 'Mega_Man_2.nes' },
    { title: 'Metroid', wikiQuery: 'Metroid_(video_game)', defaultYear: 1986, developer: 'Nintendo R&D1', genre: 'Action-Adventure', romSlug: 'Metroid.nes' }
  ],
  SNES: [
    { title: 'Super Mario World', wikiQuery: 'Super_Mario_World', defaultYear: 1990, developer: 'Nintendo EAD', genre: 'Platformer', romSlug: 'Super_Mario_World.smc' },
    { title: 'The Legend of Zelda: A Link to the Past', wikiQuery: 'The_Legend_of_Zelda:_A_Link_to_the_Past', defaultYear: 1991, developer: 'Nintendo EAD', genre: 'Action-Adventure', romSlug: 'Legend_of_Zelda,_The_-_A_Link_to_the_Past.smc' },
    { title: 'Super Metroid', wikiQuery: 'Super_Metroid', defaultYear: 1994, developer: 'Nintendo R&D1', genre: 'Action-Adventure', romSlug: 'Super_Metroid.smc' },
    { title: 'Chrono Trigger', wikiQuery: 'Chrono_Trigger', defaultYear: 1995, developer: 'Square', genre: 'JRPG', romSlug: 'Chrono_Trigger.smc' },
    { title: 'Donkey Kong Country', wikiQuery: 'Donkey_Kong_Country', defaultYear: 1994, developer: 'Rare', genre: 'Platformer', romSlug: 'Donkey_Kong_Country.smc' }
  ],
  Genesis: [
    { title: 'Sonic the Hedgehog 2', wikiQuery: 'Sonic_the_Hedgehog_2', defaultYear: 1992, developer: 'Sonic Team / Sega Technical Institute', genre: 'Platformer', romSlug: 'Sonic_The_Hedgehog_2.bin' },
    { title: 'Streets of Rage 2', wikiQuery: 'Streets_of_Rage_2', defaultYear: 1992, developer: 'Ancient / Sega', genre: 'Beat em up', romSlug: 'Streets_of_Rage_2.bin' },
    { title: 'Gunstar Heroes', wikiQuery: 'Gunstar_Heroes', defaultYear: 1993, developer: 'Treasure', genre: 'Run and Gun', romSlug: 'Gunstar_Heroes.bin' },
    { title: 'Shinobi III: Return of the Ninja Master', wikiQuery: 'Shinobi_III:_Return_of_the_Ninja_Master', defaultYear: 1993, developer: 'Sega', genre: 'Action-Platformer', romSlug: 'Shinobi_III.bin' }
  ],
  PS1: [
    { title: 'Castlevania: Symphony of the Night', wikiQuery: 'Castlevania:_Symphony_of_the_Night', defaultYear: 1997, developer: 'Konami Computer Entertainment Tokyo', genre: 'Action RPG / Metroidvania', romSlug: 'Castlevania_Symphony_of_the_Night.chd' },
    { title: 'Metal Gear Solid', wikiQuery: 'Metal_Gear_Solid_(video_game)', defaultYear: 1998, developer: 'Konami Computer Entertainment Japan', genre: 'Stealth Action', romSlug: 'Metal_Gear_Solid.chd' },
    { title: 'Final Fantasy VII', wikiQuery: 'Final_Fantasy_VII', defaultYear: 1997, developer: 'Square', genre: 'JRPG', romSlug: 'Final_Fantasy_VII.chd' },
    { title: 'Tekken 3', wikiQuery: 'Tekken_3', defaultYear: 1998, developer: 'Namco', genre: 'Fighting', romSlug: 'Tekken_3.chd' },
    { title: 'Crash Bandicoot', wikiQuery: 'Crash_Bandicoot_(video_game)', defaultYear: 1996, developer: 'Naughty Dog', genre: 'Platformer', romSlug: 'Crash_Bandicoot.chd' }
  ],
  PS2: [
    { title: 'Grand Theft Auto: San Andreas', wikiQuery: 'Grand_Theft_Auto:_San_Andreas', defaultYear: 2004, developer: 'Rockstar North', genre: 'Open World Action', romSlug: 'GTA_San_Andreas.chd' },
    { title: 'God of War', wikiQuery: 'God_of_War_(2005_video_game)', defaultYear: 2005, developer: 'Santa Monica Studio', genre: 'Action-Adventure', romSlug: 'God_of_War.chd' },
    { title: 'Shadow of the Colossus', wikiQuery: 'Shadow_of_the_Colossus', defaultYear: 2005, developer: 'Team Ico', genre: 'Action-Adventure', romSlug: 'Shadow_of_the_Colossus.chd' },
    { title: 'Kingdom Hearts II', wikiQuery: 'Kingdom_Hearts_II', defaultYear: 2005, developer: 'Square Enix', genre: 'Action RPG', romSlug: 'Kingdom_Hearts_2.chd' },
    { title: 'Resident Evil 4', wikiQuery: 'Resident_Evil_4', defaultYear: 2005, developer: 'Capcom', genre: 'Survival Horror / Action', romSlug: 'Resident_Evil_4.chd' }
  ],
  PSP: [
    { title: 'God of War: Chains of Olympus', wikiQuery: 'God_of_War:_Chains_of_Olympus', defaultYear: 2008, developer: 'Ready at Dawn / Santa Monica', genre: 'Action-Adventure', romSlug: 'God_of_War_Chains_of_Olympus.cso' },
    { title: 'Grand Theft Auto: Liberty City Stories', wikiQuery: 'Grand_Theft_Auto:_Liberty_City_Stories', defaultYear: 2005, developer: 'Rockstar Leeds / Rockstar North', genre: 'Open World Action', romSlug: 'GTA_Liberty_City_Stories.cso' },
    { title: 'Monster Hunter Freedom Unite', wikiQuery: 'Monster_Hunter_Freedom_Unite', defaultYear: 2008, developer: 'Capcom', genre: 'Action RPG', romSlug: 'Monster_Hunter_Freedom_Unite.cso' },
    { title: 'Crisis Core: Final Fantasy VII', wikiQuery: 'Crisis_Core:_Final_Fantasy_VII', defaultYear: 2007, developer: 'Square Enix', genre: 'Action RPG', romSlug: 'Crisis_Core_FFVII.cso' },
    { title: 'Persona 3 Portable', wikiQuery: 'Persona_3#Persona_3_Portable', defaultYear: 2009, developer: 'Atlus', genre: 'JRPG', romSlug: 'Persona_3_Portable.cso' }
  ]
};

// Digital Art Books master seed collection
const DIGITAL_ARTBOOKS_SEED = [
  {
    id: 'artbook-zelda-hyrule-historia',
    title: 'The Legend of Zelda: Hyrule Historia',
    author: 'Eiji Aonuma, Shigeru Miyamoto',
    publisher: 'Dark Horse Books / Nintendo',
    releaseYear: 2013,
    pages: 276,
    genre: 'Concept Art & Lore Encyclopedia',
    description: 'Comprehensive historical chronology, concept artwork, character models, and design documents covering 25 years of The Legend of Zelda franchise.',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    viewUrl: 'https://archive.org/embed/the-legend-of-zelda-hyrule-historia',
    downloadUrl: 'https://archive.org/download/the-legend-of-zelda-hyrule-historia/The%20Legend%20of%20Zelda%20Hyrule%20Historia.pdf'
  },
  {
    id: 'artbook-metal-gear-solid-shinkawa',
    title: 'The Art of Metal Gear Solid I-IV',
    author: 'Yoji Shinkawa',
    publisher: 'Konami / Dark Horse Books',
    releaseYear: 2018,
    pages: 800,
    genre: 'Ink & Character Concept Art',
    description: 'The iconic sumi-e ink brush artwork, mechanical concept designs, cyborg ninja illustrations, and tactical gear sketches by lead artist Yoji Shinkawa.',
    coverUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
    viewUrl: 'https://archive.org/embed/the-art-of-metal-gear-solid',
    downloadUrl: 'https://archive.org/download/the-art-of-metal-gear-solid/The%20Art%20of%20Metal%20Gear%20Solid.pdf'
  },
  {
    id: 'artbook-final-fantasy-amano-dawn',
    title: 'The Sky: The Art of Final Fantasy',
    author: 'Yoshitaka Amano',
    publisher: 'Dark Horse Manga / Square Enix',
    releaseYear: 2012,
    pages: 640,
    genre: 'Fantasy Fine Art & Logo Design',
    description: 'Ethereal watercolor paintings, character concept portraits, and monumental beast designs created by master artist Yoshitaka Amano across classic Final Fantasy titles.',
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    viewUrl: 'https://archive.org/embed/the-sky-art-of-final-fantasy',
    downloadUrl: 'https://archive.org/download/the-sky-art-of-final-fantasy/The%20Sky%20Art%20of%20Final%20Fantasy.pdf'
  },
  {
    id: 'artbook-castlevania-kojima',
    title: 'Castlevania: Santa Lilio Sangre',
    author: 'Ayami Kojima',
    publisher: 'Asuka Shinsha / Konami',
    releaseYear: 2010,
    pages: 200,
    genre: 'Gothic Baroque & Dark Fantasy Art',
    description: 'Breathtaking oil, pastel, and pencil illustrations by Ayami Kojima for Symphony of the Night, Aria of Sorrow, Harmony of Dissonance, and Lament of Innocence.',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    viewUrl: 'https://archive.org/embed/castlevania-santa-lilio-sangre',
    downloadUrl: 'https://archive.org/download/castlevania-santa-lilio-sangre/Santa_Lilio_Sangre_Ayami_Kojima.pdf'
  },
  {
    id: 'artbook-street-fighter-tribute',
    title: 'Street Fighter Tribute & World Warrior Works',
    author: 'UDON Crew, Akiman, Bengus',
    publisher: 'UDON Entertainment / Capcom',
    releaseYear: 2015,
    pages: 320,
    genre: 'Fighting Game Illustrations',
    description: 'Over three decades of dynamic fighting portraits, tournament key visuals, and production sprites honoring the legendary world warriors.',
    coverUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80',
    viewUrl: 'https://archive.org/embed/street-fighter-tribute',
    downloadUrl: 'https://archive.org/download/street-fighter-tribute/Street%20Fighter%20Tribute.pdf'
  },
  {
    id: 'artbook-persona-shigenori-soejima',
    title: 'Shigenori Soejima & P-Studio Art Unit Work',
    author: 'Shigenori Soejima',
    publisher: 'Kadokawa / Enterbrain / Atlus',
    releaseYear: 2019,
    pages: 208,
    genre: 'Anime Stylized Character Art',
    description: 'Vibrant pop-art character sketches, UI element concept sheets, and promotional portraits for Persona 3, Persona 4, Persona 5, and Catherine.',
    coverUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
    viewUrl: 'https://archive.org/embed/shigenori-soejima-art-works',
    downloadUrl: 'https://archive.org/download/shigenori-soejima-art-works/Shigenori%20Soejima%20Art%20Works.pdf'
  }
];

/**
 * Fetch Wikipedia summary and thumbnail for a given query title
 */
async function fetchWikiMetadata(wikiQuery) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return {
      description: data.extract || null,
      thumbnail: data.thumbnail?.source || data.originalimage?.source || null,
      pageUrl: data.content_urls?.desktop?.page || null
    };
  } catch (err) {
    console.warn(`[WARN] Wikipedia fetch failed for "${wikiQuery}": ${err.message}`);
    return null;
  }
}

/**
 * Helper to construct Libretro public box art thumbnail fallback
 */
function getLibretroThumbnail(consoleName, title) {
  const consoleFolders = {
    NES: 'Nintendo_-_Nintendo_Entertainment_System',
    SNES: 'Nintendo_-_Super_Nintendo_Entertainment_System',
    Genesis: 'Sega_-_Mega_Drive_-_Genesis',
    PS1: 'Sony_-_PlayStation',
    PS2: 'Sony_-_PlayStation_2',
    PSP: 'Sony_-_PlayStation_Portable'
  };

  const folder = consoleFolders[consoleName];
  if (!folder) return 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80';
  const cleanTitle = encodeURIComponent(title.replace(/[/:*?"<>|]/g, '_'));
  return `https://raw.githubusercontent.com/libretro-thumbnails/${folder}/master/Named_Boxarts/${cleanTitle}%20%28USA%29.png`;
}

/**
 * Core build procedure
 */
async function run() {
  console.log('====================================================');
  console.log('🚀 Starting Automated Catalog & Art Book Build');
  console.log('====================================================\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
  }

  const masterCatalog = {};

  // Process each console catalog
  for (const [consoleName, games] of Object.entries(CONSOLE_GAME_SEEDS)) {
    console.log(`\n📦 Compiling [${consoleName}] catalog (${games.length} titles)...`);
    const compiledGames = [];

    for (const game of games) {
      console.log(`   ⏳ Querying open API for: ${game.title}`);
      await sleep(150); // Respectful rate limit

      const wikiData = await fetchWikiMetadata(game.wikiQuery);

      const coverArt = wikiData?.thumbnail || getLibretroThumbnail(consoleName, game.title);
      const synopsis = wikiData?.description || `${game.title} is an acclaimed ${game.genre} title developed by ${game.developer}.`;

      const gameItem = {
        id: `${consoleName.toLowerCase()}-${game.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: game.title,
        consoleType: consoleName,
        developer: game.developer,
        year: game.defaultYear,
        genre: game.genre,
        rating: 9.5,
        coverUrl: coverArt,
        poster: coverArt,
        synopsis: synopsis,
        streamUrl: `https://ia800108.us.archive.org/13/items/rom-vault-stream/${encodeURIComponent(game.romSlug)}`,
        wikiUrl: wikiData?.pageUrl || null
      };

      compiledGames.push(gameItem);
    }

    const consoleFilePath = path.join(OUTPUT_DIR, `${consoleName.toLowerCase()}.json`);
    fs.writeFileSync(consoleFilePath, JSON.stringify(compiledGames, null, 2), 'utf-8');
    console.log(`   ✅ Wrote ${compiledGames.length} items to: ${consoleFilePath}`);
    masterCatalog[consoleName] = compiledGames;
  }

  // Process and write Digital Art Books
  console.log(`\n📚 Ingesting and compiling Digital Art Books dataset...`);
  const artbooksFilePath = path.join(OUTPUT_DIR, 'artbooks.json');
  fs.writeFileSync(artbooksFilePath, JSON.stringify(DIGITAL_ARTBOOKS_SEED, null, 2), 'utf-8');
  console.log(`   ✅ Wrote ${DIGITAL_ARTBOOKS_SEED.length} art books to: ${artbooksFilePath}`);
  masterCatalog['ArtBooks'] = DIGITAL_ARTBOOKS_SEED;

  // Write compiled unified master catalog
  const masterFilePath = path.join(OUTPUT_DIR, 'master-catalog.json');
  fs.writeFileSync(masterFilePath, JSON.stringify(masterCatalog, null, 2), 'utf-8');
  console.log(`\n🌟 Master catalog written to: ${masterFilePath}`);

  console.log('\n====================================================');
  console.log('🎉 Automated Catalog Build Completed Successfully!');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('[FATAL] Build script failed:', err);
  process.exit(1);
});
