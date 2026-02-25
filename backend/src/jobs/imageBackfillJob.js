import cron from 'node-cron';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const DEFAULT_CRON = '30 2 * * *';
const DEFAULT_BATCH = 200;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_MAX = 5000;

function extractImageFromHtml(html) {
  if (!html) return null;

  const ogMatch = html.match(/property="og:image" content="([^"]+)"/i);
  if (ogMatch?.[1]) return ogMatch[1];

  const twitterMatch = html.match(/name="twitter:image" content="([^"]+)"/i);
  if (twitterMatch?.[1]) return twitterMatch[1];

  const knownPatterns = [
    /https?:\/\/pro\.bbcdn\.io[^"\s]+/i,
    /https?:\/\/images\.blocketcdn\.se[^"\s]+/i,
    /https?:\/\/cdn\.blocket\.se[^"\s]+/i,
    /https?:\/\/img\.bilweb\.se[^"\s]+/i,
    /https?:\/\/bilweb\.se\/images[^"\s]+/i,
    /https?:\/\/[^"\s]*bytbil[^"\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"\s]*)?/i,
    /https?:\/\/[^"\s]*blocket[^"\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"\s]*)?/i
  ];

  for (const pattern of knownPatterns) {
    const match = html.match(pattern);
    if (match?.[0]) return match[0];
  }

  const genericMatch = html.match(/https?:\/\/[^"\s]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"\s]+)?/i);
  return genericMatch?.[0] || null;
}

async function fetchImageFromUrl(url) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok) return null;
    const html = await response.text();
    return extractImageFromHtml(html);
  } catch (error) {
    logger.warn('Failed to fetch listing page for image', {
      url,
      error: error?.message || error
    });
    return null;
  }
}

async function updateListingImage(listingId, imageUrl) {
  const { error } = await supabase
    .from('listings')
    .update({ images: [imageUrl] })
    .eq('id', listingId);

  if (error) {
    logger.warn('Failed to update listing image', {
      listingId,
      error: error.message
    });
    return false;
  }

  return true;
}

async function processBatch(rows, concurrency) {
  let updated = 0;
  for (let i = 0; i < rows.length; i += concurrency) {
    const slice = rows.slice(i, i + concurrency);
    const results = await Promise.all(
      slice.map(async (row) => {
        if (!row.url) return false;
        const imageUrl = await fetchImageFromUrl(row.url);
        if (!imageUrl) return false;
        return updateListingImage(row.id, imageUrl);
      })
    );
    updated += results.filter(Boolean).length;
  }
  return updated;
}

export async function backfillMissingImages({
  batchSize = DEFAULT_BATCH,
  concurrency = DEFAULT_CONCURRENCY,
  max = DEFAULT_MAX
} = {}) {
  let offset = 0;
  let totalChecked = 0;
  let totalUpdated = 0;

  while (offset < max) {
    const { data, error } = await supabase
      .from('listings')
      .select('id, url, images')
      .or('images.is.null,images.eq.[]')
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    totalChecked += data.length;
    totalUpdated += await processBatch(data, concurrency);
    offset += batchSize;
  }

  return { checked: totalChecked, updated: totalUpdated };
}

export function startImageBackfillJob() {
  const cronExpression = process.env.IMAGE_BACKFILL_CRON || DEFAULT_CRON;
  const batchSize = parseInt(process.env.IMAGE_BACKFILL_BATCH || DEFAULT_BATCH, 10);
  const concurrency = parseInt(process.env.IMAGE_BACKFILL_CONCURRENCY || DEFAULT_CONCURRENCY, 10);
  const max = parseInt(process.env.IMAGE_BACKFILL_MAX || DEFAULT_MAX, 10);

  logger.info('Starting image backfill job', { cronExpression });

  cron.schedule(cronExpression, async () => {
    logger.info('Running scheduled image backfill...');
    try {
      const result = await backfillMissingImages({ batchSize, concurrency, max });
      logger.info('Image backfill complete', result);
    } catch (error) {
      logger.error('Error in scheduled image backfill', { error: error.message });
    }
  });
}
