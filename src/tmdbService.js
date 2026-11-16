/**
 * TMDB Dynamic Media Showcase Service
 * Live TMDB v3 API integrations with zero static or hardcoded media lists.
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_W500 = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMAGE_BASE_ORIGINAL = 'https://image.tmdb.org/t/p/original';

// Fallback public API key for development/demo
const DEFAULT_TMDB_KEY = '4e44d9029b1270a757cddc766a1bcb63';

export function getApiKey() {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TMDB_API_KEY) {
    return import.meta.env.VITE_TMDB_API_KEY;
  }
  return DEFAULT_TMDB_KEY;
}

// In-memory cache to prevent redundant HTTP queries
const cache = new Map();

/**
 * Generates an SVG vector graphic data URL when TMDB poster_path is null
 */
export function getSvgPlaceholder(title = 'Stream X Media', category = 'Media') {
  const safeTitle = (title || 'Stream X Media').replace(/[<>&"']/g, '');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0a14" />
          <stop offset="50%" stop-color="#141428" />
          <stop offset="100%" stop-color="#070810" />
        </linearGradient>
        <radialGradient id="glowGradient" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="#9333ea" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#9333ea" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="500" height="750" fill="url(#bgGradient)" />
      <circle cx="250" cy="300" r="160" fill="url(#glowGradient)" />
      <circle cx="250" cy="300" r="70" fill="#1f1d36" stroke="#9333ea" stroke-width="2" />
      <polygon points="240,270 275,300 240,330" fill="#c084fc" />
      <text x="250" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">
        ${safeTitle.length > 28 ? safeTitle.slice(0, 25) + '...' : safeTitle}
      </text>
      <text x="250" y="475" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#a855f7" text-anchor="middle" letter-spacing="3">
        ${category.toUpperCase()} • STREAM X
      </text>
      <rect x="200" y="520" width="100" height="4" rx="2" fill="#7e22ce" opacity="0.6" />
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Normalizes a raw TMDB result into an application MediaStreamItem
 */
export function formatTmdbItem(item, defaultCategory = null) {
  const isMovie = item.media_type === 'movie' || (!item.first_air_date && Boolean(item.release_date));
  const mediaType = isMovie ? 'movie' : 'tv';
  const category = defaultCategory || (isMovie ? 'Movies' : 'TV Shows');
  const title = item.title || item.name || item.original_title || item.original_name || 'Untitled';
  const releaseYear = (item.release_date || item.first_air_date || '').slice(0, 4) || '2024';

  const poster = item.poster_path
    ? `${TMDB_IMAGE_BASE_W500}${item.poster_path}`
    : getSvgPlaceholder(title, category);

  const banner = item.backdrop_path
    ? `${TMDB_IMAGE_BASE_ORIGINAL}${item.backdrop_path}`
    : poster;

  return {
    id: `tmdb-${mediaType}-${item.id}`,
    tmdbId: String(item.id),
    imdbId: item.imdb_id || null,
    title,
    category,
    source: 'Stream X',
    genre: isMovie ? 'Feature Film' : 'Series / Drama',
    year: parseInt(releaseYear, 10) || 2024,
    rating: item.vote_average ? parseFloat(item.vote_average.toFixed(1)) : 8.5,
    synopsis: item.overview || `Watch ${title} in ultra-HD with native upstream streaming servers and multiple language dubs.`,
    poster,
    banner,
    streamUrl: `https://vidsrc.cc/v2/embed/${mediaType}/${item.id}`,
    embedUrl: `https://vidsrc.cc/v2/embed/${mediaType}/${item.id}`,
    quality: '4K',
    tags: [category, isMovie ? 'Movie' : 'TV Show', releaseYear],
    mediaType
  };
}

/**
 * Centralized fetch handler with in-memory caching
 */
async function fetchTmdb(endpoint, params = {}) {
  const key = getApiKey();
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', key);
  url.searchParams.set('language', 'en-US');

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  const cacheKey = url.toString();
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const res = await fetch(cacheKey);
    if (!res.ok) {
      throw new Error(`TMDB error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    cache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(`[TMDB Service] Fetch failed for ${endpoint}:`, err);
    throw err;
  }
}

/**
 * 1. Fetch Trending Media (Movies and TV combined)
 */
export async function getTrendingMedia(page = 1) {
  try {
    const data = await fetchTmdb('/trending/all/day', { page });
    const items = (data.results || []).map((item) => formatTmdbItem(item));
    return {
      page: data.page || 1,
      totalPages: data.total_pages || 1,
      items
    };
  } catch (err) {
    return { page: 1, totalPages: 1, items: [] };
  }
}

/**
 * 2. Fetch Trending Feature Films
 */
export async function getTrendingMovies(page = 1) {
  try {
    const data = await fetchTmdb('/trending/movie/day', { page });
    const items = (data.results || []).map((item) => formatTmdbItem(item, 'Movies'));
    return {
      page: data.page || 1,
      totalPages: data.total_pages || 1,
      items
    };
  } catch (err) {
    return { page: 1, totalPages: 1, items: [] };
  }
}

/**
 * 3. Fetch Trending TV Shows
 */
export async function getTrendingTvShows(page = 1) {
  try {
    const data = await fetchTmdb('/trending/tv/day', { page });
    const items = (data.results || []).map((item) => formatTmdbItem(item, 'TV Shows'));
    return {
      page: data.page || 1,
      totalPages: data.total_pages || 1,
      items
    };
  } catch (err) {
    return { page: 1, totalPages: 1, items: [] };
  }
}

/**
 * 4. Fetch Anime (Japanese Animation TV Series)
 */
export async function getTrendingAnime(page = 1) {
  try {
    const data = await fetchTmdb('/discover/tv', {
      page,
      with_genres: '16',
      with_original_language: 'ja',
      sort_by: 'popularity.desc'
    });
    const items = (data.results || []).map((item) => {
      const formatted = formatTmdbItem(item, 'Anime');
      formatted.genre = 'Anime / Japanese Animation';
      formatted.source = 'Stream X Anime';
      return formatted;
    });
    return {
      page: data.page || 1,
      totalPages: data.total_pages || 1,
      items
    };
  } catch (err) {
    return { page: 1, totalPages: 1, items: [] };
  }
}

/**
 * 5. Fetch Animated Cartoons
 */
export async function getTrendingCartoons(page = 1) {
  try {
    const data = await fetchTmdb('/discover/tv', {
      page,
      with_genres: '16',
      without_original_language: 'ja',
      sort_by: 'popularity.desc'
    });
    const items = (data.results || []).map((item) => {
      const formatted = formatTmdbItem(item, 'Cartoons');
      formatted.genre = 'Animated Cartoon';
      formatted.source = 'Toonix';
      return formatted;
    });
    return {
      page: data.page || 1,
      totalPages: data.total_pages || 1,
      items
    };
  } catch (err) {
    return { page: 1, totalPages: 1, items: [] };
  }
}

/**
 * 6. Multi-Search Handler across Movies and TV
 */
export async function searchTmdb(query, page = 1) {
  if (!query || !query.trim()) {
    return getTrendingMedia(page);
  }

  try {
    const data = await fetchTmdb('/search/multi', {
      query: query.trim(),
      page
    });

    const items = (data.results || [])
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item) => formatTmdbItem(item));

    return {
      page: data.page || 1,
      totalPages: data.total_pages || 1,
      items
    };
  } catch (err) {
    return { page: 1, totalPages: 1, items: [] };
  }
}

/**
 * 7. External ID Lookup (IMDb ID, TVDB ID, Wikidata ID)
 */
export async function getExternalIds(mediaType, tmdbId) {
  if (!tmdbId) return null;
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  try {
    const data = await fetchTmdb(`/${type}/${tmdbId}/external_ids`);
    return {
      imdbId: data.imdb_id || null,
      wikidataId: data.wikidata_id || null,
      tvdbId: data.tvdb_id || null
    };
  } catch (err) {
    return null;
  }
}

export default {
  getTrendingMedia,
  getTrendingMovies,
  getTrendingTvShows,
  getTrendingAnime,
  getTrendingCartoons,
  searchTmdb,
  getExternalIds,
  formatTmdbItem,
  getSvgPlaceholder
};
