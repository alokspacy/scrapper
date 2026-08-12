const fs = require('fs/promises');
const path = require('path');

const DEFAULT_USER_AGENT = 'ThePoliteScraper/1.0 (Public Practice Sandbox; +https://books.toscrape.com/)';
const DEFAULT_TIMEOUT_MS = 10000;
const POLITENESS_DELAY_MS = 500;

/**
 * Helper to pause execution for a given number of milliseconds.
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Low-level HTTP fetcher for HTML pages with custom User-Agent and timeout handling.
 *
 * @param {string} url - Target URL to fetch
 * @param {object} [options] - Additional options (timeoutMs, headers)
 * @returns {Promise<{ html: string, status: number, statusText: string }>}
 */
async function fetchPage(url, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const userAgent = options.userAgent || DEFAULT_USER_AGENT;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = new Error(`HTTP Error ${response.status}: ${response.statusText} for URL ${url}`);
      err.status = response.status;
      throw err;
    }

    const html = await response.text();
    return {
      html,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutErr = new Error(`Request timeout after ${timeoutMs}ms for URL: ${url}`);
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches page with retry logic. Retries timeouts and 5xx errors exactly once.
 * Does NOT retry 404 or 403 status errors.
 *
 * @param {string} url - Target URL
 * @param {object} [options]
 * @returns {Promise<{ html: string, status: number, statusText: string }>}
 */
async function fetchPageWithRetry(url, options = {}) {
  const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 1;
  const retryDelayMs = options.retryDelayMs || 500;

  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      const result = await fetchPage(url, options);
      return result;
    } catch (error) {
      lastError = error;

      // Do NOT retry HTTP 404 or HTTP 403
      const status = error.status;
      const is404or403 = status === 404 || status === 403;

      if (is404or403 || attempt > maxRetries) {
        throw error;
      }

      console.warn(`[Fetch Retry] Attempt ${attempt} failed for ${url}: ${error.message}. Retrying in ${retryDelayMs}ms...`);
      await sleep(retryDelayMs);
    }
  }

  throw lastError;
}

/**
 * Saves raw HTML response to specified cache path.
 *
 * @param {string} filePath - Destination file path
 * @param {string} content - Raw content to write
 */
async function saveToCache(filePath, content) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Returns cached HTML if present; otherwise applies politeness delay, fetches live HTML with retry, and caches it.
 *
 * @param {string} url - Target URL to fetch
 * @param {string} cacheKey - Cache identifier/filename key (without .html)
 * @param {object} [options] - Options (delayMs)
 * @returns {Promise<{ html: string, fromCache: boolean, cachePath: string, fetchedAt: string }>}
 */
async function getCachedOrFetchPage(url, cacheKey, options = {}) {
  const cachePath = path.resolve(`cache/${cacheKey}.html`);
  const delayMs = options.delayMs !== undefined ? options.delayMs : POLITENESS_DELAY_MS;

  try {
    const cachedHtml = await fs.readFile(cachePath, 'utf-8');
    const stat = await fs.stat(cachePath);
    return {
      html: cachedHtml,
      fromCache: true,
      cachePath,
      fetchedAt: stat.mtime.toISOString(),
    };
  } catch (err) {
    if (delayMs > 0) {
      await sleep(delayMs);
    }
    const fetchedAt = new Date().toISOString();
    const result = await fetchPageWithRetry(url, options);
    await saveToCache(cachePath, result.html);

    return {
      html: result.html,
      fromCache: false,
      cachePath,
      fetchedAt,
    };
  }
}

module.exports = {
  fetchPage,
  fetchPageWithRetry,
  saveToCache,
  getCachedOrFetchPage,
  sleep,
  DEFAULT_USER_AGENT,
  DEFAULT_TIMEOUT_MS,
  POLITENESS_DELAY_MS,
};
