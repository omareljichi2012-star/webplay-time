import { ComicChapter, ComicCharacter, ComicSeries, RelatedComic } from '../types';
import { getTextureSafeUrl } from '../launchboxApi';

export function getComicAssetUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) {
    // Resolve relative BatCave uploads paths if present
    if (trimmed.startsWith('/uploads/')) {
      return getTextureSafeUrl(`https://batcave.biz${trimmed}`);
    }
    return trimmed;
  }
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  return getTextureSafeUrl(trimmed);
}

function normalizeBatcaveUrl(url?: string | null): string {
  if (!url) return '';
  const t = url.trim();
  if (!t) return '';
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return `https://batcave.biz${t.startsWith('/') ? '' : '/'}${t}`;
}

export function sortComicChaptersForReading(chapters: ComicChapter[]): ComicChapter[] {
  const reversed = [...chapters].reverse();
  const isTpb = (title: string) => /_TPB\b|\bTPB\s+\d+/i.test(title);
  const singleIssues = reversed.filter((ch) => !isTpb(ch.title));
  const collected = reversed.filter((ch) => isTpb(ch.title));
  return [...singleIssues, ...collected];
}

/**
 * Parses a saved BatCave.biz HTML document (reader page with window.__DATA__.images,
 * series overview page with window.__DATA__.chapters/thumbs + ComicSeries JSON-LD, or
 * BatCave catalog/listing page with comic cards) into ComicSeries items.
 */
export function parseBatcaveHtml(html: string): ComicSeries[] {
  if (!html || typeof html !== 'string') return [];
  const results: ComicSeries[] = [];

  // Strategy 1: BatCave Reader Export OR Series Overview Export (window.__DATA__ + Schema.org JSON-LD)
  const dataMatch = html.match(/window\.__DATA__\s*=\s*(\{[\s\S]*?\});/);
  if (dataMatch) {
    try {
      const data = JSON.parse(dataMatch[1]);
      let publisher = 'Independent';
      let authors: string[] = [];
      let artists: string[] = [];
      let genres: string[] = ['Comics'];
      let seriesStatus: string | undefined;
      let ldDescription = '';
      let ldPoster = '';
      let ldYear: number | undefined;
      let sourceUrl = typeof data.post_link === 'string' ? data.post_link : undefined;
      const charactersMap = new Map<string, ComicCharacter>();

      const ldRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
      let ldMatch: RegExpExecArray | null;
      while ((ldMatch = ldRegex.exec(html)) !== null) {
        try {
          const ld = JSON.parse(ldMatch[1]);
          const graph = Array.isArray(ld['@graph']) ? ld['@graph'] : [];
          const issueOrSeriesNode =
            graph.find((n: any) => n['@type'] === 'ComicSeries') ||
            graph.find((n: any) => n['@type'] === 'ComicIssue');
          const peopleMap = new Map<string, string>();
          const orgMap = new Map<string, string>();

          for (const node of graph) {
            if (node['@type'] === 'Person' && node['@id'] && node.name) {
              peopleMap.set(node['@id'], node.name);
            }
            if (node['@type'] === 'Organization' && node['@id'] && node.name) {
              orgMap.set(node['@id'], node.name);
            }
          }

          if (issueOrSeriesNode) {
            if (
              issueOrSeriesNode.publisher?.['@id'] &&
              orgMap.has(issueOrSeriesNode.publisher['@id'])
            ) {
              publisher = orgMap.get(issueOrSeriesNode.publisher['@id'])!;
            }
            if (Array.isArray(issueOrSeriesNode.author)) {
              const extractedAuthors = issueOrSeriesNode.author
                .map((a: any) => peopleMap.get(a['@id']) || a.name)
                .filter(Boolean);
              if (extractedAuthors.length > 0) authors = extractedAuthors;
            }
            const rawArtists = issueOrSeriesNode.illustrator || issueOrSeriesNode.artist;
            if (Array.isArray(rawArtists)) {
              const extractedArtists = rawArtists
                .map((a: any) => peopleMap.get(a['@id']) || a.name)
                .filter(Boolean);
              if (extractedArtists.length > 0) artists = extractedArtists;
            }
            if (Array.isArray(issueOrSeriesNode.genre) && issueOrSeriesNode.genre.length > 0) {
              genres = issueOrSeriesNode.genre;
            }
            if (typeof issueOrSeriesNode.creativeWorkStatus === 'string') {
              seriesStatus = issueOrSeriesNode.creativeWorkStatus;
            }
            if (typeof issueOrSeriesNode.description === 'string' && !ldDescription) {
              ldDescription = issueOrSeriesNode.description.trim();
            }
            if (typeof issueOrSeriesNode.image === 'string' && !ldPoster) {
              ldPoster = normalizeBatcaveUrl(issueOrSeriesNode.image);
            } else if (typeof issueOrSeriesNode.thumbnailUrl === 'string' && !ldPoster) {
              ldPoster = normalizeBatcaveUrl(issueOrSeriesNode.thumbnailUrl);
            }
            if (!sourceUrl && typeof issueOrSeriesNode.url === 'string') {
              sourceUrl = issueOrSeriesNode.url;
            }
            if (!ldYear && issueOrSeriesNode.startDate) {
              const parsedYear = Number(issueOrSeriesNode.startDate);
              if (parsedYear > 1900 && parsedYear < 2100) ldYear = parsedYear;
            }
            if (Array.isArray(issueOrSeriesNode.character)) {
              for (const ch of issueOrSeriesNode.character) {
                if (ch?.name) {
                  charactersMap.set(ch.name, {
                    name: ch.name,
                    url: normalizeBatcaveUrl(ch.url),
                  });
                }
              }
            }
          }
        } catch {
          // Ignore malformed JSON-LD block
        }
      }

      const newsId = Number(data.news_id) || undefined;
      const postTitle = String(data.post_title || data.title || 'Imported BatCave Comic').trim();
      const yearMatch = postTitle.match(/\((\d{4})\)/);
      const year = ldYear || (yearMatch ? Number(yearMatch[1]) : undefined);

      const rawPoster = typeof data.post_poster === 'string' ? data.post_poster : '';
      let resolvedRemotePoster = normalizeBatcaveUrl(ldPoster || rawPoster);

      // Extract rating, votes, synopsis, characters & related series from DOM if overview HTML
      let rating: number | undefined;
      let votes: number | undefined;
      let domSynopsis = '';
      const relatedComics: RelatedComic[] = [];

      if (typeof DOMParser !== 'undefined') {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const rateText = doc.querySelector('.page__poster-rating-score')?.textContent?.trim();
        if (rateText && !Number.isNaN(Number(rateText))) rating = Number(rateText);

        const votesText = newsId
          ? doc.querySelector(`[data-vote-num-id="${newsId}"]`)?.textContent?.trim()
          : undefined;
        if (votesText && !Number.isNaN(Number(votesText))) votes = Number(votesText);

        const synEl = doc.querySelector('.page__text.full-text');
        if (synEl?.textContent) {
          domSynopsis = synEl.textContent
            .replace(/\s+/g, ' ')
            .replace(/\s+([.,!?;:])/g, '$1')
            .trim();
        }

        if (!resolvedRemotePoster) {
          const posterImg = doc.querySelector('.page__poster img, .pmovie__poster img');
          const pSrc = posterImg?.getAttribute('data-src') || posterImg?.getAttribute('src');
          if (pSrc && !pSrc.startsWith('data:')) {
            resolvedRemotePoster = normalizeBatcaveUrl(pSrc);
          }
        }

        const charLinks = Array.from(doc.querySelectorAll('.char-chip'));
        for (const el of charLinks) {
          const name = (el.getAttribute('title') || el.textContent || '').trim();
          const href = el.getAttribute('href');
          const img = el.querySelector('img');
          const imgSrc = img?.getAttribute('data-src') || img?.getAttribute('src');
          if (name) {
            charactersMap.set(name, {
              name,
              url: normalizeBatcaveUrl(href),
              thumb:
                imgSrc && !imgSrc.startsWith('data:')
                  ? normalizeBatcaveUrl(imgSrc)
                  : charactersMap.get(name)?.thumb,
            });
          }
        }

        const relCards = Array.from(
          doc.querySelectorAll('[data-similar-panel="read"] a.poster, #rec-similar a.poster')
        );
        const seenRel = new Set<string>();
        for (const card of relCards) {
          const href = normalizeBatcaveUrl(card.getAttribute('href'));
          if (!href || seenRel.has(href)) continue;
          seenRel.add(href);
          const idM = href.match(/\/(\d+)-/);
          const imgEl = card.querySelector('img');
          const rawRelImg = imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src');
          const rPoster =
            rawRelImg && !rawRelImg.startsWith('data:') ? normalizeBatcaveUrl(rawRelImg) : '';
          const rTitle = (
            card.querySelector('.poster__title')?.textContent ||
            imgEl?.getAttribute('alt') ||
            ''
          ).trim();
          if (!rTitle) continue;
          const rRateText = card.querySelector('.poster__label--rate')?.textContent?.trim();
          const rSubs = Array.from(card.querySelectorAll('.poster__subtitle li')).map((li) =>
            (li.textContent || '').trim()
          );
          const rStatus = rSubs.find((s) => !/^\d{4}$/.test(s));
          const rYear = rSubs.find((s) => /^\d{4}$/.test(s));
          relatedComics.push({
            id: idM ? `batcave-${idM[1]}` : href,
            newsId: idM ? Number(idM[1]) : undefined,
            title: rTitle,
            poster: rPoster || undefined,
            rating: rRateText && !Number.isNaN(Number(rRateText)) ? Number(rRateText) : undefined,
            status: rStatus,
            year: rYear ? Number(rYear) : undefined,
            url: href,
          });
        }
      }

      const pageLimit = typeof data.pages === 'number' && data.pages > 0 ? data.pages : undefined;
      const hasReaderImages = Array.isArray(data.images) && data.images.length > 0;
      const issueImages: string[] = hasReaderImages ? data.images.slice(0, pageLimit) : [];
      const thumbSet = new Set<number>(
        Array.isArray(data.thumbs) ? data.thumbs.map((n: any) => Number(n)) : []
      );

      const rawChapters = Array.isArray(data.chapters) ? data.chapters : [];
      const chapters: ComicChapter[] = rawChapters.map((ch: any) => {
        const chIdNum = Number(ch.id);
        const isCurrent = hasReaderImages && Number(ch.id) === Number(data.chapter_id);
        const thumb = thumbSet.has(chIdNum)
          ? `https://batcave.biz/uploads/chthumbs/${Math.floor(chIdNum / 1000)}/${chIdNum}.webp`
          : undefined;
        return {
          id: ch.id,
          title: ch.title || `Issue #${ch.id}`,
          readerUrl: newsId ? `https://batcave.biz/reader/${newsId}/${ch.id}` : undefined,
          pageCount: isCurrent
            ? issueImages.length
            : typeof ch.pages === 'number'
            ? ch.pages
            : undefined,
          date: typeof ch.date === 'string' && ch.date ? ch.date : undefined,
          posi: typeof ch.posi === 'number' ? ch.posi : undefined,
          thumb,
          remotePages: isCurrent ? issueImages : undefined,
          hasLocalPages: isCurrent && issueImages.length > 0,
        };
      });

      if (chapters.length === 0 && data.chapter_id) {
        chapters.push({
          id: data.chapter_id,
          title: postTitle,
          readerUrl: newsId ? `https://batcave.biz/reader/${newsId}/${data.chapter_id}` : undefined,
          pageCount: issueImages.length,
          remotePages: issueImages,
          hasLocalPages: issueImages.length > 0,
        });
      }

      const defaultIssue1 = chapters.find((c) => /\bIssue #1\b/i.test(c.title))?.id;
      const finalPoster = resolvedRemotePoster || issueImages[0] || '';
      const characters = Array.from(charactersMap.values());

      results.push({
        id: newsId ? `batcave-${newsId}` : `batcave-import-${Date.now()}`,
        newsId,
        title: postTitle,
        year,
        publisher,
        status: seriesStatus,
        rating,
        votes,
        authors,
        artists,
        genres,
        synopsis:
          domSynopsis ||
          ldDescription ||
          `Imported from BatCave.biz (${chapters.length} issue${chapters.length === 1 ? '' : 's'} indexed).`,
        poster: finalPoster,
        remotePoster: resolvedRemotePoster || undefined,
        sourceUrl,
        totalChapters: chapters.length,
        defaultChapterId: data.chapter_id || defaultIssue1 || chapters[chapters.length - 1]?.id,
        characters: characters.length > 0 ? characters : undefined,
        relatedComics: relatedComics.length > 0 ? relatedComics : undefined,
        chapters,
        imported: true,
      });

      return results;
    } catch {
      // Fall through to DOM listing extraction
    }
  }

  // Strategy 2: BatCave Catalog / Search / Homepage / Archive List HTML via DOMParser
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rawExtracted: ComicSeries[] = [];
    const cardSelectors = [
      '.readed',
      'li.latest.grid-item',
      'a.poster.grid-item',
      'a.popular',
      '.short',
      '.movie-item',
      '.poster.grid-item',
      '.card',
      'article',
      '.sect__content a[href*=".html"]',
    ];

    const candidates = Array.from(doc.querySelectorAll(cardSelectors.join(',')));

    for (const el of candidates) {
      if (
        el.closest(
          '.last-comm, #dle-comments-list, .comments, .comm-item, .lcomm, .hof-home, .rvh-grid, .rvh-card'
        )
      ) {
        continue;
      }

      // Skip inner anchors when their parent card container is already matched
      if (el.tagName === 'A') {
        const parentCard = el.parentElement?.closest(
          'li.latest.grid-item, .readed, .short, .movie-item, .card, article'
        );
        if (parentCard && parentCard !== el) continue;
      }

      const anchor =
        el.tagName === 'A'
          ? (el as HTMLAnchorElement)
          : ((el.querySelector(
              '.latest__title a[href*=".html"], a[href*=".html"]'
            ) || el.querySelector('a[href*=".html"]')) as HTMLAnchorElement | null);
      if (!anchor) continue;

      const rawHref = (anchor.getAttribute('href') || '').split('#')[0];
      const idMatch = rawHref.match(/\/(\d+)-([^/?#]+)\.html/);
      if (!idMatch) continue;

      const newsId = Number(idMatch[1]);
      const normalizedHref = normalizeBatcaveUrl(rawHref);

      const container = el;
      const titleEl = container.querySelector(
        '.readed__title, .popular__title, .short__title, .poster__title, .latest__title a, .latest__title, h2, h3, h4, .title'
      );
      const rawTitle = (
        titleEl?.textContent ||
        anchor.getAttribute('title') ||
        container.querySelector('img')?.getAttribute('alt') ||
        anchor.textContent ||
        idMatch[2].replace(/-/g, ' ')
      )
        .replace(/\s+/g, ' ')
        .trim();

      if (!rawTitle || rawTitle.length < 2) continue;

      const imgEl = container.querySelector('img');
      const dataSrc = imgEl?.getAttribute('data-src') || '';
      const attrSrc = imgEl?.getAttribute('src') || '';
      const rawImg =
        dataSrc && !dataSrc.startsWith('data:')
          ? dataSrc
          : attrSrc && !attrSrc.startsWith('data:')
          ? attrSrc
          : '';
      const poster = normalizeBatcaveUrl(rawImg);

      const rateText = container
        .querySelector('.poster__label--rate')
        ?.textContent?.replace(/[^\d.]/g, '')
        .trim();
      const rating =
        rateText && !Number.isNaN(Number(rateText)) && Number(rateText) > 0
          ? Number(rateText)
          : undefined;

      const metaItems = Array.from(
        container.querySelectorAll('.readed__meta-item, .poster__subtitle li')
      )
        .map((m) => (m.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      const readedInfos = Array.from(container.querySelectorAll('.readed__info li'))
        .map((li) => (li.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);

      const latestPubRaw = container
        .querySelector('.latest__publisher')
        ?.textContent?.replace(/\s+/g, ' ')
        .replace(/^Publisher:\s*/i, '')
        .trim();

      const statusItem = metaItems.find((m) =>
        /^(Completed|Ongoing|Hiatus|Cancelled|Published)$/i.test(m)
      );
      const yearFromMeta = metaItems.find((m) => /^\d{4}$/.test(m));
      const publisherFromMeta = metaItems.find(
        (m) =>
          !/^\d{4}$/.test(m) &&
          !/^(Completed|Ongoing|Hiatus|Cancelled|Published)$/i.test(m)
      );

      const metaText = (
        container.querySelector('.readed__meta, .short__meta, .poster__subtitle, .meta')
          ?.textContent || ''
      )
        .replace(/\s+/g, ' ')
        .trim();

      const publisher = latestPubRaw || publisherFromMeta || 'BatCave Archive';
      const yearMatch = (rawTitle + ' ' + metaText).match(/\b(19\d{2}|20\d{2})\b/);
      const lastIssue = readedInfos
        .find((t) => /^Last issue:/i.test(t))
        ?.replace(/^Last issue:\s*/i, '');

      // Extract exact chapter link from latest releases widget (.latest__chapter a)
      const latestChapterEl = container.querySelector('.latest__chapter a');
      const latestChHref = latestChapterEl?.getAttribute('href') || '';
      const latestChMatch = latestChHref.match(/\/reader\/(\d+)\/(\d+)/);
      const latestChRawText = (latestChapterEl?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
      const latestDateTitle = latestChRawText.match(/^(\d{2}\.\d{2}\.\d{4})\s*-\s*(.+)$/);

      const chapters: ComicChapter[] = latestChMatch
        ? [
            {
              id: Number(latestChMatch[2]),
              title: (latestDateTitle ? latestDateTitle[2] : latestChRawText || rawTitle).trim(),
              readerUrl: normalizeBatcaveUrl(latestChHref),
              date: latestDateTitle ? latestDateTitle[1] : undefined,
              hasLocalPages: false,
            },
          ]
        : [
            {
              id: newsId,
              title: lastIssue || `${rawTitle} — BatCave Source`,
              readerUrl: normalizedHref,
              hasLocalPages: false,
            },
          ];

      const synopsis =
        readedInfos.find((t) => !/^Last issue:/i.test(t)) ||
        (latestDateTitle
          ? `Latest indexed release: ${latestDateTitle[2].trim()} (${latestDateTitle[1]}).`
          : metaText
          ? `Indexed from BatCave.biz (${metaText}).`
          : `Indexed BatCave series: ${rawTitle}.`);

      rawExtracted.push({
        id: `batcave-${newsId}`,
        newsId,
        title: rawTitle,
        year: yearFromMeta ? Number(yearFromMeta) : yearMatch ? Number(yearMatch[1]) : undefined,
        publisher,
        status: statusItem,
        rating,
        authors: [],
        artists: [],
        genres: ['Comics'],
        synopsis,
        poster,
        remotePoster: poster || undefined,
        sourceUrl: normalizedHref,
        totalChapters: chapters.length,
        defaultChapterId: chapters[0]?.id,
        chapters,
        imported: true,
      });
    }

    if (rawExtracted.length > 0) {
      return mergeComicCatalogs([], rawExtracted);
    }
  }

  return results;
}

function posterResolutionScore(url?: string): number {
  if (!url) return 0;
  if (url.startsWith('/comics/')) return 100;
  if (url.includes('/uploads/posts/')) return 90;
  if (url.includes('/uploads/mini/142x212/')) return 75;
  if (url.includes('/uploads/mini/131x196/')) return 65;
  if (url.includes('/uploads/mini/64x96/')) return 30;
  return 50;
}

function pickBetterPoster(prevPoster?: string, nextPoster?: string): string {
  const prevScore = posterResolutionScore(prevPoster);
  const nextScore = posterResolutionScore(nextPoster);
  return nextScore > prevScore ? nextPoster || prevPoster || '' : prevPoster || nextPoster || '';
}

function isGenericPublisher(p?: string): boolean {
  if (!p) return true;
  return /^(Independent|BatCave Archive|BatCave Top Rated|BatCave Fresh Release)$/i.test(
    p.trim()
  );
}

/**
 * Merges newly imported ComicSeries items into an existing catalog without duplicating
 * series or overwriting already-cached local issues.
 */
export function mergeComicCatalogs(
  existing: ComicSeries[],
  incoming: ComicSeries[]
): ComicSeries[] {
  const byId = new Map<string, ComicSeries>();
  for (const item of existing) {
    byId.set(item.id, item);
  }

  for (const item of incoming) {
    const prev = byId.get(item.id);
    if (!prev) {
      byId.set(item.id, item);
      continue;
    }

    const chapterMap = new Map<string, ComicChapter>();
    for (const ch of prev.chapters) {
      chapterMap.set(String(ch.id), ch);
    }
    for (const ch of item.chapters) {
      const key = String(ch.id);
      const oldCh = chapterMap.get(key);
      if (!oldCh) {
        chapterMap.set(key, ch);
      } else {
        const keepLocalFiles = Boolean(oldCh.pages?.length);
        const keepOldRemote = Boolean(oldCh.hasLocalPages && !ch.hasLocalPages);
        const keepOld = keepLocalFiles || keepOldRemote;
        chapterMap.set(key, {
          ...oldCh,
          ...ch,
          pageCount: keepOld ? oldCh.pageCount : ch.pageCount ?? oldCh.pageCount,
          pages: keepLocalFiles ? oldCh.pages : ch.pages ?? oldCh.pages,
          remotePages: keepOld ? oldCh.remotePages : ch.remotePages ?? oldCh.remotePages,
          hasLocalPages: Boolean(oldCh.hasLocalPages || ch.hasLocalPages),
          thumb: ch.thumb || oldCh.thumb,
          date: ch.date || oldCh.date,
          posi: ch.posi ?? oldCh.posi,
        });
      }
    }

    let mergedChapters = Array.from(chapterMap.values());
    const resolvedNewsId = item.newsId ?? prev.newsId;
    const isSeriesPlaceholder = (ch: ComicChapter) =>
      !ch.hasLocalPages &&
      resolvedNewsId !== undefined &&
      Number(ch.id) === Number(resolvedNewsId) &&
      !String(ch.readerUrl || '').includes('/reader/');

    const hasSpecificChapter = mergedChapters.some((ch) => !isSeriesPlaceholder(ch));
    if (hasSpecificChapter && mergedChapters.length > 1) {
      mergedChapters = mergedChapters.filter((ch) => !isSeriesPlaceholder(ch));
    }

    mergedChapters.sort((a, b) => {
      if (typeof a.posi === 'number' && typeof b.posi === 'number') {
        return b.posi - a.posi;
      }
      return Number(b.id) - Number(a.id);
    });

    const isGenericSyn = (s?: string) =>
      !s ||
      s.startsWith('Imported from BatCave.biz') ||
      s.startsWith('Indexed BatCave series:') ||
      s.startsWith('Indexed from BatCave.biz');

    const prevDefaultValid =
      prev.defaultChapterId !== undefined &&
      mergedChapters.some((c) => String(c.id) === String(prev.defaultChapterId));

    byId.set(item.id, {
      ...prev,
      ...item,
      year: item.year ?? prev.year,
      publisher: !isGenericPublisher(item.publisher) ? item.publisher : prev.publisher,
      status: item.status || prev.status,
      rating: item.rating ?? prev.rating,
      votes: item.votes ?? prev.votes,
      synopsis: !isGenericSyn(item.synopsis) ? item.synopsis : prev.synopsis,
      poster: pickBetterPoster(prev.poster, item.poster),
      remotePoster: pickBetterPoster(prev.remotePoster, item.remotePoster) || undefined,
      defaultChapterId: prevDefaultValid
        ? prev.defaultChapterId
        : item.defaultChapterId || mergedChapters[0]?.id,
      authors: item.authors?.length ? item.authors : prev.authors,
      artists: item.artists?.length ? item.artists : prev.artists,
      genres:
        item.genres?.length && !(item.genres.length === 1 && item.genres[0] === 'Comics')
          ? item.genres
          : prev.genres,
      characters: item.characters?.length ? item.characters : prev.characters,
      relatedComics: item.relatedComics?.length ? item.relatedComics : prev.relatedComics,
      chapters: mergedChapters,
      totalChapters: Math.max(
        mergedChapters.length,
        hasSpecificChapter ? mergedChapters.length : prev.totalChapters
      ),
    });
  }

  return Array.from(byId.values());
}
