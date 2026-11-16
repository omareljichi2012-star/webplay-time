import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Search,
  Star,
  Upload,
  ExternalLink,
  Layers,
  CheckCircle2,
  X,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { ComicChapter, ComicSeries } from '../types';
import {
  getComicAssetUrl,
  mergeComicCatalogs,
  parseBatcaveHtml,
  sortComicChaptersForReading,
} from '../utils/batcaveParser';
import { ComicReaderModal } from './ComicReaderModal';

interface ComicsSectionProps {
  searchQuery?: string;
}

const IMPORTED_COMICS_KEY = 'arcadia_imported_comics_v1';
const COMICS_IDB_NAME = 'arcadia_comics_vault_db';
const COMICS_IDB_STORE = 'catalog';
const PROGRESS_STORAGE_KEY = 'arcadia_comic_progress_v1';
const FAV_CHAPTERS_KEY = 'arcadia_comic_fav_chapters_v1';
const SERIES_PER_PAGE = 50;

function openComicsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(COMICS_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(COMICS_IDB_STORE)) {
        req.result.createObjectStore(COMICS_IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadImportedFromIdb(): Promise<ComicSeries[]> {
  try {
    const db = await openComicsDb();
    const result = await new Promise<ComicSeries[] | undefined>((resolve) => {
      const tx = db.transaction(COMICS_IDB_STORE, 'readonly');
      const req = tx.objectStore(COMICS_IDB_STORE).get('imported_series');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
    if (Array.isArray(result) && result.length > 0) return result;
  } catch {}
  try {
    const legacy = localStorage.getItem(IMPORTED_COMICS_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

async function saveImportedToIdb(catalog: ComicSeries[]): Promise<void> {
  try {
    const db = await openComicsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(COMICS_IDB_STORE, 'readwrite');
      tx.objectStore(COMICS_IDB_STORE).put(catalog, 'imported_series');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      localStorage.setItem(IMPORTED_COMICS_KEY, JSON.stringify(catalog));
    } catch {}
  }
}

async function clearImportedIdb(): Promise<void> {
  try {
    const db = await openComicsDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(COMICS_IDB_STORE, 'readwrite');
      tx.objectStore(COMICS_IDB_STORE).delete('imported_series');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
  try {
    localStorage.removeItem(IMPORTED_COMICS_KEY);
  } catch {}
}

function createFallbackComicPoster(title: string, publisher: string): string {
  const safeTitle = (title || 'COMIC SERIES').toUpperCase().slice(0, 26);
  const safePub = (publisher || 'ARCHIVE').toUpperCase().slice(0, 22);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="100%" height="100%">
    <defs>
      <linearGradient id="cbBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#18181b"/>
        <stop offset="100%" stop-color="#09090b"/>
      </linearGradient>
    </defs>
    <rect width="400" height="560" fill="url(#cbBg)"/>
    <rect x="16" y="16" width="368" height="528" fill="none" stroke="#f5c518" stroke-width="2" rx="8"/>
    <rect x="16" y="16" width="368" height="44" fill="#f5c518" rx="6"/>
    <text x="200" y="44" fill="#09090b" font-family="system-ui, sans-serif" font-size="14" font-weight="900" text-anchor="middle" letter-spacing="2">${safePub}</text>
    <text x="200" y="275" fill="#fafafa" font-family="system-ui, sans-serif" font-size="22" font-weight="900" text-anchor="middle">${safeTitle}</text>
    <text x="200" y="310" fill="#a1a1aa" font-family="monospace" font-size="12" text-anchor="middle">COLLECTOR EDITION ARCHIVE</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const ProxyThumb: React.FC<{
  src?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}> = ({ src, fallbackSrc, alt, className = '', fallback = null }) => {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const primaryUrl = src ? getComicAssetUrl(src) : '';
  const backupUrl = fallbackSrc ? getComicAssetUrl(fallbackSrc) : '';
  const activeUrl = stage === 0 ? primaryUrl || backupUrl : stage === 1 ? backupUrl : '';

  useEffect(() => {
    setStage(0);
  }, [src, fallbackSrc]);

  if (!activeUrl || stage >= 2) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={activeUrl}
      alt={alt}
      onError={() => {
        if (stage === 0 && backupUrl && backupUrl !== activeUrl) {
          setStage(1);
        } else {
          setStage(2);
        }
      }}
      referrerPolicy="no-referrer"
      loading="lazy"
      className={className}
    />
  );
};

const ComicCoverImage: React.FC<{
  series: ComicSeries;
  className?: string;
}> = ({ series, className = '' }) => {
  const resolvePrimary = () =>
    (series.poster?.startsWith('/')
      ? series.poster
      : getComicAssetUrl(series.poster)) ||
    getComicAssetUrl(series.remotePoster) ||
    '';
  const [src, setSrc] = useState(resolvePrimary);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setSrc(resolvePrimary());
    setStage(0);
  }, [series.id, series.poster, series.remotePoster]);

  const handleError = () => {
    const proxied = getComicAssetUrl(series.remotePoster);
    if (stage === 0 && proxied && proxied !== src) {
      setStage(1);
      setSrc(proxied);
    } else {
      setStage(2);
      setSrc(createFallbackComicPoster(series.title, series.publisher));
    }
  };

  return (
    <img
      src={src || createFallbackComicPoster(series.title, series.publisher)}
      alt={series.title}
      onError={handleError}
      referrerPolicy="no-referrer"
      className={className}
      loading="lazy"
    />
  );
};

export const ComicsSection: React.FC<ComicsSectionProps> = ({ searchQuery = '' }) => {
  const [baseCatalog, setBaseCatalog] = useState<ComicSeries[]>([]);
  const [importedCatalog, setImportedCatalog] = useState<ComicSeries[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('batcave-6975');
  const [seriesPage, setSeriesPage] = useState<number>(1);

  // Issue Vault controls
  const [issueSearch, setIssueSearch] = useState<string>('');
  const [issueFilter, setIssueFilter] = useState<'all' | 'ready' | 'bookmarked'>('all');

  // Reader modal state
  const [readerState, setReaderState] = useState<{
    series: ComicSeries;
    chapterId?: number | string;
  } | null>(null);

  // HTML Batch Importer Modal
  const [showImporter, setShowImporter] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const heroTopRef = useRef<HTMLElement | null>(null);

  // Reading progress & bookmarked issues tracking
  const [progressMap, setProgressMap] = useState<
    Record<string, { page: number; total: number }>
  >({});
  const [favChapters, setFavChapters] = useState<Record<string, boolean>>({});

  const refreshLocalTracking = () => {
    try {
      const pRaw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      setProgressMap(pRaw ? JSON.parse(pRaw) : {});
      const fRaw = localStorage.getItem(FAV_CHAPTERS_KEY);
      setFavChapters(fRaw ? JSON.parse(fRaw) : {});
    } catch {}
  };

  useEffect(() => {
    refreshLocalTracking();
    Promise.all([
      fetch('/comics/comics.json')
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      loadImportedFromIdb(),
    ])
      .then(([baseData, savedImported]) => {
        if (Array.isArray(baseData)) {
          setBaseCatalog(baseData);
          if (baseData[0]?.id) setSelectedSeriesId(baseData[0].id);
        }
        if (Array.isArray(savedImported) && savedImported.length > 0) {
          setImportedCatalog(savedImported);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const allSeries = useMemo(
    () => mergeComicCatalogs(baseCatalog, importedCatalog),
    [baseCatalog, importedCatalog]
  );

  const filteredSeries = useMemo(() => {
    if (!searchQuery.trim()) return allSeries;
    const q = searchQuery.toLowerCase();
    return allSeries.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.publisher.toLowerCase().includes(q) ||
        s.authors.some((a) => a.toLowerCase().includes(q)) ||
        s.genres.some((g) => g.toLowerCase().includes(q))
    );
  }, [allSeries, searchQuery]);

  const totalSeriesPages = Math.max(1, Math.ceil(filteredSeries.length / SERIES_PER_PAGE));
  const paginatedSeries = useMemo(() => {
    const start = (seriesPage - 1) * SERIES_PER_PAGE;
    return filteredSeries.slice(start, start + SERIES_PER_PAGE);
  }, [filteredSeries, seriesPage]);

  useEffect(() => {
    setSeriesPage(1);
  }, [searchQuery]);

  const activeSeries: ComicSeries | undefined = useMemo(
    () => allSeries.find((s) => s.id === selectedSeriesId) || allSeries[0],
    [allSeries, selectedSeriesId]
  );

  const orderedIssues = useMemo(() => {
    if (!activeSeries) return [];
    return sortComicChaptersForReading(activeSeries.chapters);
  }, [activeSeries]);

  const filteredIssues = useMemo(() => {
    if (!activeSeries) return [];
    return orderedIssues.filter((ch) => {
      if (issueFilter === 'ready' && !ch.hasLocalPages) return false;
      if (issueFilter === 'bookmarked' && !favChapters[`${activeSeries.id}:${ch.id}`]) {
        return false;
      }
      if (issueSearch.trim()) {
        return ch.title.toLowerCase().includes(issueSearch.trim().toLowerCase());
      }
      return true;
    });
  }, [orderedIssues, activeSeries, issueFilter, favChapters, issueSearch]);

  const readyChapter = useMemo(
    () =>
      orderedIssues.find((ch) => ch.hasLocalPages) ||
      orderedIssues.find((ch) => ch.id === activeSeries?.defaultChapterId) ||
      orderedIssues[0],
    [orderedIssues, activeSeries]
  );

  const toggleFavIssue = (seriesId: string, chapterId: number | string) => {
    const key = `${seriesId}:${chapterId}`;
    setFavChapters((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(FAV_CHAPTERS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleFilesImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter((f) =>
      /\.(html?|json)$/i.test(f.name)
    );
    if (validFiles.length === 0) {
      setImportStatus('No .html or .json files found in selection.');
      return;
    }

    setIsImporting(true);
    setImportStatus(`Scanning ${validFiles.length} file${validFiles.length === 1 ? '' : 's'}...`);

    try {
      const parsedItems: ComicSeries[] = [];
      let unlockedIssuesCount = 0;

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        if (validFiles.length > 10 && i % 10 === 0) {
          setImportStatus(`Parsing ${i + 1} / ${validFiles.length} files...`);
        }
        const text = await file.text();
        if (file.name.toLowerCase().endsWith('.json')) {
          const json = JSON.parse(text);
          const list = Array.isArray(json) ? json : json && json.title ? [json] : [];
          parsedItems.push(...list);
          unlockedIssuesCount += list.reduce(
            (sum, s) => sum + (s.chapters?.filter((c: ComicChapter) => c.hasLocalPages).length || 0),
            0
          );
        } else {
          const extracted = parseBatcaveHtml(text);
          parsedItems.push(...extracted);
          unlockedIssuesCount += extracted.reduce(
            (sum, s) => sum + s.chapters.filter((c) => c.hasLocalPages).length,
            0
          );
        }
      }

      if (parsedItems.length === 0) {
        setImportStatus(
          'No BatCave comic metadata or reader blocks were found in the selected file(s).'
        );
      } else {
        const updatedImported = mergeComicCatalogs(importedCatalog, parsedItems);
        setImportedCatalog(updatedImported);
        await saveImportedToIdb(updatedImported);
        setSelectedSeriesId(parsedItems[0].id);
        const uniqueSeriesCount = new Set(parsedItems.map((p) => p.id)).size;
        setImportStatus(
          `Imported ${uniqueSeriesCount} series${
            unlockedIssuesCount > 0
              ? ` and unlocked ${unlockedIssuesCount} readable issue${
                  unlockedIssuesCount === 1 ? '' : 's'
                }`
              : ''
          } from ${validFiles.length} file${validFiles.length === 1 ? '' : 's'}.`
        );
      }
    } catch (err: any) {
      setImportStatus(`Import error: ${err?.message || 'Unable to parse file.'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearImported = () => {
    setImportedCatalog([]);
    clearImportedIdb();
    if (baseCatalog[0]?.id) setSelectedSeriesId(baseCatalog[0].id);
    setImportStatus('Cleared custom imports; restored base BatCave vault.');
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-zinc-400 text-sm">
        Loading BatCave collector vault...
      </div>
    );
  }

  return (
    <section ref={heroTopRef} className="space-y-8 pb-12">
      {/* Featured Collector Editorial Hero Showcase */}
      {activeSeries && (
        <div className="rounded-2xl border border-zinc-800 bg-[#0c0c10] overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Left Copy Column */}
            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span className="font-semibold text-amber-400">{activeSeries.publisher}</span>
                  <span aria-hidden="true">·</span>
                  <span>BatCave Archive Edition</span>
                  {activeSeries.status && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-200 font-medium">{activeSeries.status}</span>
                    </>
                  )}
                  {activeSeries.year && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{activeSeries.year}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {activeSeries.totalChapters} Issues Indexed
                  </span>
                  {typeof activeSeries.rating === 'number' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums text-amber-300">
                        <Star size={12} fill="currentColor" />
                        <span>{activeSeries.rating.toFixed(1)}</span>
                        {activeSeries.votes && (
                          <span className="text-zinc-500">
                            ({activeSeries.votes.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-50 leading-tight max-w-xl">
                  {activeSeries.title}
                </h2>

                {(activeSeries.authors.length > 0 || activeSeries.artists.length > 0) && (
                  <p className="text-xs sm:text-sm text-zinc-300">
                    {activeSeries.authors.length > 0 && (
                      <span>
                        Written by{' '}
                        <strong className="font-semibold text-zinc-100">
                          {activeSeries.authors.join(', ')}
                        </strong>
                      </span>
                    )}
                    {activeSeries.authors.length > 0 && activeSeries.artists.length > 0 && (
                      <span className="mx-2 text-zinc-600" aria-hidden="true">
                        ·
                      </span>
                    )}
                    {activeSeries.artists.length > 0 && (
                      <span>
                        Art by{' '}
                        <strong className="font-semibold text-zinc-100">
                          {activeSeries.artists.join(', ')}
                        </strong>
                      </span>
                    )}
                  </p>
                )}

                <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
                  {activeSeries.synopsis}
                </p>

                {activeSeries.genres.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 pt-1">
                    {activeSeries.genres.map((g, idx) => (
                      <React.Fragment key={g}>
                        {idx > 0 && (
                          <span className="text-zinc-700" aria-hidden="true">
                            /
                          </span>
                        )}
                        <span>{g}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {readyChapter && (
                  <button
                    type="button"
                    onClick={() =>
                      setReaderState({ series: activeSeries, chapterId: readyChapter.id })
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs sm:text-sm font-bold transition-colors shadow-lg cursor-pointer"
                  >
                    <BookOpen size={16} />
                    <span>
                      {readyChapter.hasLocalPages ? 'Read ' : 'Inspect '}
                      {readyChapter.title.replace(`${activeSeries.title} `, '')}
                      {readyChapter.pageCount ? ` (${readyChapter.pageCount} Pages)` : ''}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowImporter(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Upload size={15} />
                  <span>Import BatCave HTML</span>
                </button>

                {activeSeries.sourceUrl && (
                  <a
                    href={activeSeries.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    <span>BatCave Source</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* Right Cover + Live Page Spread Preview */}
            <div className="lg:col-span-5 bg-[#08080b] border-t lg:border-t-0 lg:border-l border-zinc-800 p-6 flex items-center justify-center gap-4">
              <div className="w-44 sm:w-52 aspect-[2/3] rounded-xl overflow-hidden border border-zinc-700/80 shadow-2xl shrink-0">
                <ComicCoverImage
                  series={activeSeries}
                  className="w-full h-full object-cover block"
                />
              </div>

              {(() => {
                const previewList = readyChapter?.pages?.length
                  ? readyChapter.pages
                  : readyChapter?.remotePages?.map((u) => getComicAssetUrl(u)) || [];
                if (previewList.length < 2) return null;
                return (
                  <div className="hidden sm:flex flex-col gap-3 w-28 shrink-0">
                    {previewList.slice(0, 3).map((pageUrl, idx) => (
                      <button
                        key={pageUrl}
                        type="button"
                        onClick={() =>
                          setReaderState({ series: activeSeries, chapterId: readyChapter!.id })
                        }
                        className="group relative aspect-[3/4] rounded-lg overflow-hidden border border-zinc-800 hover:border-amber-400 transition-colors cursor-pointer"
                        title={`Preview Page ${idx + 1}`}
                      >
                        <img
                          src={pageUrl}
                          alt={`Preview Page ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Imported Series Switcher (if more than 1 series exists or imported) */}
      {allSeries.length > 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Layers size={15} className="text-amber-400" />
              <span>Comic Series Catalog ({filteredSeries.length})</span>
            </h3>
            {importedCatalog.length > 0 && (
              <button
                type="button"
                onClick={handleClearImported}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
                <span>Clear Imports</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {paginatedSeries.map((s) => {
              const isSelected = s.id === activeSeries?.id;
              const localReadyCount = s.chapters.filter((c) => c.hasLocalPages).length;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSeriesId(s.id);
                    heroTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`text-left rounded-xl border overflow-hidden bg-[#0c0c10] transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 ring-1 ring-amber-400/50'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="aspect-[2/3] w-full bg-zinc-900 overflow-hidden">
                    <ComicCoverImage series={s} className="w-full h-full object-cover block" />
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="text-xs font-bold text-zinc-100 line-clamp-1">{s.title}</div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {localReadyCount > 0 ? (
                        <span className="text-amber-400 font-semibold">
                          {localReadyCount} HD Ready · {s.totalChapters} indexed
                        </span>
                      ) : (
                        <span>
                          {s.publisher}
                          {s.year ? ` · ${s.year}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredSeries.length > SERIES_PER_PAGE && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                type="button"
                disabled={seriesPage === 1}
                onClick={() => setSeriesPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <span className="text-xs font-mono tabular-nums text-zinc-400">
                Page {seriesPage} of {totalSeriesPages}
              </span>
              <button
                type="button"
                disabled={seriesPage === totalSeriesPages}
                onClick={() => setSeriesPage((p) => Math.min(totalSeriesPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Full Issue Vault Directory */}
      {activeSeries && (
        <div className="rounded-2xl border border-zinc-800 bg-[#0c0c10] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-zinc-100">
                {activeSeries.title} — Issue Directory
              </h3>
              <p className="text-xs text-zinc-400">
                {(() => {
                  const readyCount = orderedIssues.filter((c) => c.hasLocalPages).length;
                  return `${readyCount} ${
                    readyCount === 1 ? 'issue' : 'issues'
                  } ready in offline HD studio · ${orderedIssues.length} total ${
                    orderedIssues.length === 1 ? 'issue' : 'issues'
                  } indexed`;
                })()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'ready', label: 'Ready HD' },
                    { id: 'bookmarked', label: 'Bookmarked' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setIssueFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      issueFilter === tab.id
                        ? 'bg-amber-400 text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="text"
                  value={issueSearch}
                  onChange={(e) => setIssueSearch(e.target.value)}
                  placeholder="Find issue # or TPB..."
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-400 w-44 sm:w-56"
                />
              </div>
            </div>
          </div>

          <div className="max-h-[480px] overflow-y-auto divide-y divide-zinc-800/70">
            {filteredIssues.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                No issues match your filter criteria.
              </div>
            ) : (
              filteredIssues.map((ch: ComicChapter) => {
                const prog = progressMap[`${activeSeries.id}:${ch.id}`];
                const isFav = Boolean(favChapters[`${activeSeries.id}:${ch.id}`]);
                return (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 hover:bg-zinc-900/60 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setReaderState({ series: activeSeries, chapterId: ch.id })
                      }
                      className="flex items-center gap-3.5 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="w-9 h-12 rounded-md overflow-hidden border border-zinc-800 bg-zinc-950 shrink-0 flex items-center justify-center">
                        <ProxyThumb
                          src={ch.thumb || activeSeries.poster || activeSeries.remotePoster}
                          fallbackSrc={activeSeries.poster || activeSeries.remotePoster}
                          alt={ch.title}
                          className="w-full h-full object-cover block"
                          fallback={
                            <span
                              className={
                                ch.hasLocalPages ? 'text-amber-400' : 'text-zinc-600'
                              }
                            >
                              {ch.hasLocalPages ? (
                                <CheckCircle2 size={15} />
                              ) : (
                                <BookOpen size={15} />
                              )}
                            </span>
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-medium text-zinc-100 truncate">
                          {ch.title}
                        </div>
                        <div className="text-[11px] text-zinc-500 flex flex-wrap items-center gap-2 font-mono tabular-nums">
                          {ch.hasLocalPages ? (
                            <span className="text-amber-400/95 font-semibold">
                              {ch.pageCount} Pages ·{' '}
                              {ch.pages?.length ? 'Cached Local HD' : 'Streamed HD (HTML Import)'}
                            </span>
                          ) : (
                            <span>
                              {ch.pageCount ? `${ch.pageCount} Pages` : `BatCave Index #${ch.id}`}
                            </span>
                          )}
                          {ch.date && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{ch.date}</span>
                            </>
                          )}
                          {!ch.hasLocalPages && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-zinc-600">#{ch.id}</span>
                            </>
                          )}
                          {prog && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-zinc-300">
                                Resume p.{prog.page}/{prog.total}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleFavIssue(activeSeries.id, ch.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isFav
                            ? 'border-amber-400/40 bg-amber-400/10 text-amber-400'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-200'
                        }`}
                        title={isFav ? 'Remove bookmark' : 'Bookmark issue'}
                      >
                        <Star size={13} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setReaderState({ series: activeSeries, chapterId: ch.id })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                          ch.hasLocalPages
                            ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950'
                            : 'border border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        {ch.hasLocalPages ? 'Read Issue' : 'Inspect'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Character Roster & Related BatCave Series */}
      {activeSeries &&
        ((activeSeries.characters && activeSeries.characters.length > 0) ||
          (activeSeries.relatedComics && activeSeries.relatedComics.length > 0)) && (
          <div className="space-y-6">
            {activeSeries.characters && activeSeries.characters.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-[#0c0c10] p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <h3 className="text-sm font-bold text-zinc-100">
                    Key Characters ({activeSeries.characters.length})
                  </h3>
                  <span className="text-[11px] text-zinc-500">BatCave Universe Index</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                  {activeSeries.characters.map((ch) => (
                    <a
                      key={ch.name}
                      href={ch.url || activeSeries.sourceUrl || 'https://batcave.biz'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 p-2 rounded-lg border border-zinc-800/80 bg-zinc-950/70 hover:border-amber-400/50 transition-colors min-w-0"
                    >
                      <div className="w-8 h-8 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 flex items-center justify-center text-[11px] font-bold text-zinc-400">
                        <ProxyThumb
                          src={ch.thumb}
                          alt={ch.name}
                          className="w-full h-full object-cover block"
                          fallback={<span>{ch.name.slice(0, 2).toUpperCase()}</span>}
                        />
                      </div>
                      <span className="text-xs font-medium text-zinc-200 truncate">
                        {ch.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {activeSeries.relatedComics && activeSeries.relatedComics.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-[#0c0c10] p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <h3 className="text-sm font-bold text-zinc-100">
                    Related Series on BatCave ({activeSeries.relatedComics.length})
                  </h3>
                  <span className="text-[11px] text-zinc-500">Save page HTML to import</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
                  {activeSeries.relatedComics.map((rel) => (
                    <a
                      key={rel.id}
                      href={rel.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden hover:border-amber-400/60 transition-colors flex flex-col"
                    >
                      <div className="aspect-[2/3] w-full bg-zinc-900 overflow-hidden">
                        <ProxyThumb
                          src={rel.poster}
                          alt={rel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          fallback={
                            <div className="w-full h-full flex items-center justify-center p-2 text-center text-[11px] font-semibold text-zinc-500">
                              {rel.title}
                            </div>
                          }
                        />
                      </div>
                      <div className="p-2.5 space-y-1">
                        <div className="text-xs font-semibold text-zinc-100 line-clamp-2 leading-snug">
                          {rel.title}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono tabular-nums">
                          <span>{rel.status || rel.year || 'BatCave'}</span>
                          {typeof rel.rating === 'number' && (
                            <span className="text-amber-400">★ {rel.rating.toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      {/* Batch BatCave HTML / JSON Importer Modal */}
      {showImporter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-[#111116] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode2 size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100">
                  Import Saved BatCave HTML / JSON
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImporter(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Save any BatCave comic or reader page with <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 font-mono">Ctrl+S</kbd> →{' '}
              <strong className="text-zinc-200">Webpage, HTML Only</strong> (~45 KB, zero images
              downloaded), then drop your saved <code className="text-zinc-200">.html</code> /{' '}
              <code className="text-zinc-200">.json</code> files or folder below. Every page streams
              in full HD automatically through the built-in proxy.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesImport(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-zinc-700 hover:border-amber-400 rounded-xl p-8 text-center cursor-pointer transition-colors bg-zinc-950/60 space-y-2"
            >
              <Upload size={26} className="mx-auto text-amber-400" />
              <p className="text-xs font-semibold text-zinc-100">
                {isImporting
                  ? 'Parsing comic files...'
                  : 'Click to select or drag BatCave .html / .json files here'}
              </p>
              <p className="text-[11px] text-zinc-500">
                Supports single issues, full series overviews, catalog pages, and thousands of files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".html,.htm,.json"
                onChange={(e) => handleFilesImport(e.target.files)}
                className="hidden"
              />
              <input
                ref={folderInputRef}
                type="file"
                multiple
                {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                onChange={(e) => handleFilesImport(e.target.files)}
                className="hidden"
              />
            </div>

            {importStatus && (
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200">
                {importStatus}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                disabled={isImporting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 disabled:opacity-50"
              >
                <Layers size={13} />
                <span>Select Folder</span>
              </button>
              <button
                type="button"
                onClick={() => setShowImporter(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-100"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pro Collector Comic Reader Skin */}
      {readerState && (
        <ComicReaderModal
          series={readerState.series}
          initialChapterId={readerState.chapterId}
          onClose={() => {
            setReaderState(null);
            refreshLocalTracking();
          }}
          onOpenImporter={() => setShowImporter(true)}
        />
      )}
    </section>
  );
};

export default ComicsSection;
