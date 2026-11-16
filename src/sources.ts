import { ConsoleSource } from './types';

export const CONSOLE_SOURCES: ConsoleSource[] = [
  {
    console: 'WebPort',
    engine: 'web',
    core: 'web',
    romSourceBaseUrl: '',
    useDynamicIndex: true,
    manifestUrl: '/webport.json'
  },
  {
    console: 'Flash',
    engine: 'ruffle',
    core: 'flash',
    romSourceBaseUrl: '',
    useDynamicIndex: true,
    manifestUrl: '/flash.json'
  },
  {
    console: 'NES',
    engine: 'emulatorjs',
    core: 'fceumm',
    romSourceBaseUrl: 'https://raw.githubusercontent.com/allancoding/games/main/public/assets/',
    useDynamicIndex: true,
    manifestUrl: '/nes.json'
  },
  {
    console: 'SNES',
    engine: 'emulatorjs',
    core: 'snes9x',
    romSourceBaseUrl: 'https://raw.githubusercontent.com/allancoding/games/main/public/assets/',
    useDynamicIndex: true,
    manifestUrl: '/snes.json'
  },
  {
    console: 'Game Boy',
    engine: 'emulatorjs',
    core: 'gambatte',
    romSourceBaseUrl: 'https://raw.githubusercontent.com/vbaemulator/GB-Roms/main/',
    useDynamicIndex: true,
    manifestUrl: '/gb.json'
  },
  {
    console: 'Game Boy Color',
    engine: 'emulatorjs',
    core: 'gambatte',
    romSourceBaseUrl: 'https://raw.githubusercontent.com/vbaemulator/GBC-Roms/main/',
    useDynamicIndex: true,
    manifestUrl: '/gbc.json'
  },
  {
    console: 'GBA',
    engine: 'emulatorjs',
    core: 'mgba',
    romSourceBaseUrl: 'https://raw.githubusercontent.com/vbaemulator/GBA-Roms/main/',
    useDynamicIndex: true,
    manifestUrl: '/gba.json'
  },
  {
    console: 'Sega Genesis',
    engine: 'emulatorjs',
    core: 'segaMD',
    romSourceBaseUrl: 'https://raw.githubusercontent.com/CleberDevOps/roms-megadrive/master/SegaGenesisMegaDriveRomCollectionByGhostware/',
    useDynamicIndex: true,
    manifestUrl: '/genesis.json'
  },
  {
    console: 'Master System',
    engine: 'emulatorjs',
    core: 'picodrive',
    romSourceBaseUrl: 'https://raw.githubusercontent.com/CleberDevOps/roms-master-system/master/',
    useDynamicIndex: true,
    manifestUrl: '/mastersystem.json'
  },
  {
    console: 'Game Gear',
    engine: 'emulatorjs',
    core: 'picodrive',
    romSourceBaseUrl: 'https://raw.githubusercontent.com/asempreendimentos13/roms-retro-gamegear/main/',
    useDynamicIndex: true,
    manifestUrl: '/gamegear.json'
  },
  {
    console: 'TurboGrafx-16',
    engine: 'emulatorjs',
    core: 'mednafen_pce_fast',
    romSourceBaseUrl: 'https://raw.githubusercontent.com/asempreendimentos13/roms-retro-turbografx16/main/',
    useDynamicIndex: true,
    manifestUrl: '/turbografx16.json'
  },
  {
    console: 'Nintendo DS',
    engine: 'emulatorjs',
    core: 'desmume',
    romSourceBaseUrl: 'https://archive.org/download/nds-0083-osu-tatakae-ouendan-j-projectgwww.-nintendo-ds-roms.com/',
    useDynamicIndex: true,
    manifestUrl: '/nds.json'
  },
  {
    console: 'N64',
    engine: 'emulatorjs',
    core: 'n64',
    romSourceBaseUrl: 'https://ia601809.us.archive.org/1/items/roms-bestset-nintendo-64/',
    useDynamicIndex: true,
    manifestUrl: '/n64.json'
  },
  {
    console: 'PS1',
    engine: 'emulatorjs',
    core: 'psx',
    romSourceBaseUrl: 'https://archive.org/download/CuratedPSXRedumpCHDs/',
    useDynamicIndex: true,
    manifestUrl: '/ps1.json'
  },
  {
    console: 'Atari 2600',
    engine: 'emulatorjs',
    core: 'stella',
    romSourceBaseUrl: 'https://ia601006.us.archive.org/33/items/roms-de-la-atari-2600/',
    useDynamicIndex: true,
    manifestUrl: '/atari2600.json'
  },
  {
    console: 'Sega CD',
    engine: 'emulatorjs',
    core: 'picodrive',
    romSourceBaseUrl: 'https://ia803201.us.archive.org/34/items/sega-mega-cd-sega-cd/',
    useDynamicIndex: true,
    manifestUrl: '/segacd.json'
  },
  {
    console: 'Sega 32X',
    engine: 'emulatorjs',
    core: 'picodrive',
    romSourceBaseUrl: 'https://ia601409.us.archive.org/4/items/corpse-killer-usa-sega-cd-32-x/',
    useDynamicIndex: true,
    manifestUrl: '/sega32x.json'
  },
  {
    console: 'Virtual Boy',
    engine: 'emulatorjs',
    core: 'mednafen_vb',
    romSourceBaseUrl: 'https://ia601407.us.archive.org/24/items/virtualboy_202608/',
    useDynamicIndex: true,
    manifestUrl: '/virtualboy.json'
  },
  {
    console: 'PSP',
    engine: 'web',
    core: 'ppsspp',
    romSourceBaseUrl: 'https://archive.org/download/psp-collection/',
    useDynamicIndex: true,
    manifestUrl: '/psp.json',
    status: 'coming_soon'
  },
  {
    console: 'Sega Saturn',
    engine: 'emulatorjs',
    core: 'yabause',
    romSourceBaseUrl: 'https://archive.org/download/sega-saturn-collection/',
    useDynamicIndex: true,
    manifestUrl: '/saturn.json'
  },
  {
    console: 'Atari 7800',
    engine: 'emulatorjs',
    core: 'prosystem',
    romSourceBaseUrl: 'https://archive.org/download/atari-7800-collection/',
    useDynamicIndex: true,
    manifestUrl: '/atari7800.json'
  },
  {
    console: 'MS-DOS',
    engine: 'emulatorjs',
    core: 'dosbox',
    romSourceBaseUrl: 'https://archive.org/download/softwarelibrary_msdos_games/',
    useDynamicIndex: true,
    manifestUrl: '/dos.json'
  }
];
