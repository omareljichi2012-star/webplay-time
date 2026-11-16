export interface GameItem {
  id: string;
  title: string;
  name?: string;
  slug: string;
  consoleType: string;
  console_type?: string;
  engine: 'ruffle' | 'emulatorjs' | 'web' | 'iframe' | string;
  core?: string;
  genre: string;
  year: number;
  rating: number;
  url: string;
  streamUrl?: string;
  rom_url?: string;
  romUrl?: string;
  swf_url?: string;
  poster: string;
  posterUrl?: string;
  coverUrl?: string;
  boxFront?: string;
  box3d?: string | null;
  box3dUrl?: string | null;
  cartridge?: string | null;
  cartridgeUrl?: string | null;
  cartridge3DUrl?: string | null;
  cartridgeFrontUrl?: string | null;
  boxFrontUrl?: string | null;
  boxBackUrl?: string | null;
  boxSpineUrl?: string | null;
  cartridgeBackUrl?: string | null;
  launchboxId?: number | string;
  launchboxUrl?: string;
  launchboxAssetSource?: 'launchbox-gamesdb' | 'cdn-mirror' | 'procedural';
  synopsis: string;
  description?: string;
  publisher: string;
  developer?: string;
  releaseDate: string;
  embed_url?: string;
  releaseYear?: number;
  status?: 'coming_soon' | 'active' | string;
}

export interface ManifestGameItem {
  title: string;
  name?: string;
  slug: string;
  consoleType?: string;
  engine?: 'ruffle' | 'emulatorjs' | 'web' | 'iframe' | string;
  core?: string;
  genre: string;
  year: number;
  rating: number;
  poster: string;
  box3d?: string;
  box3dUrl?: string;
  cartridge?: string;
  cartridgeUrl?: string;
  cartridge3DUrl?: string;
  cartridgeFrontUrl?: string;
  boxFrontUrl?: string;
  boxBackUrl?: string;
  boxSpineUrl?: string;
  cartridgeBackUrl?: string;
  launchboxId?: number | string;
  launchboxUrl?: string;
  launchboxAssetSource?: 'launchbox-gamesdb' | 'cdn-mirror' | 'procedural';
  synopsis: string;
  description?: string;
  publisher: string;
  developer?: string;
  releaseDate: string;
  url?: string;
  streamUrl?: string;
  rom_url?: string;
  embed_url?: string;
}

export interface ConsoleSource {
  console: string;
  engine: 'ruffle' | 'emulatorjs' | 'web' | 'iframe' | string;
  core: string;
  romSourceBaseUrl: string;
  useDynamicIndex: boolean;
  manifestUrl: string;
  status?: 'coming_soon' | 'active' | string;
}

export interface GameReview {
  id: string;
  gameId: string;
  handle: string;
  rating: number; // 1 to 5
  comment: string;
  timestamp: string;
}

export interface ComicCharacter {
  name: string;
  thumb?: string;
  url?: string;
}

export interface RelatedComic {
  id: string;
  newsId?: number;
  title: string;
  poster?: string;
  year?: number;
  rating?: number;
  status?: string;
  url: string;
}

export interface ComicChapter {
  id: number | string;
  title: string;
  readerUrl?: string;
  pageCount?: number;
  date?: string;
  thumb?: string;
  posi?: number;
  pages?: string[];
  remotePages?: string[];
  hasLocalPages?: boolean;
}

export interface ComicSeries {
  id: string;
  newsId?: number;
  title: string;
  year?: number;
  publisher: string;
  status?: string;
  rating?: number;
  votes?: number;
  authors: string[];
  artists: string[];
  genres: string[];
  synopsis: string;
  poster: string;
  remotePoster?: string;
  sourceUrl?: string;
  totalChapters: number;
  defaultChapterId?: number | string;
  characters?: ComicCharacter[];
  relatedComics?: RelatedComic[];
  chapters: ComicChapter[];
  imported?: boolean;
}

declare module 'react' {
  interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
    credentialless?: boolean;
  }
}
