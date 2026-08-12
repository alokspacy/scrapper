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
 * Reusable HTTP fetcher for HTML pages with custom User-Agent and timeout handling.
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
      throw new Error(`HTTP Error ${response.status}: ${response.statusText} for URL ${url}`);
    }

    const html = await response.text();
    return {
      html,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms for URL: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
 * Returns cached HTML if present; otherwise applies politeness delay, fetches live HTML, and caches it.
 *
 * @param {string} url - Target URL to fetch
 * @param {number} pageNum - Catalogue page number (used for cache filename)
 * @param {object} [options] - Options (delayMs)
 * @returns {Promise<{ html: string, fromCache: boolean, cachePath: string }>}
 */
async function getCachedOrFetchPage(url, pageNum, options = {}) {
  const cachePath = path.resolve(`cache/catalogue-page-${pageNum}.html`);
  const delayMs = options.delayMs !== undefined ? options.delayMs : POLITENESS_DELAY_MS;

  try {
    const cachedHtml = await fs.readFile(cachePath, 'utf-8');
    return {
      html: cachedHtml,
      fromCache: true,
      cachePath,
    };
  } catch (err) {
    // Cache miss - fetch live page with politeness delay if needed
    if (delayMs > 0) {
      await sleep(delayMs);
    }
    const result = await fetchPage(url, options);
    await saveToCache(cachePath, result.html);

    return {
      html: result.html,
      fromCache: false,
      cachePath,
    };
  }
}

module.exports = {
  fetchPage,
  saveToCache,
  getCachedOrFetchPage,
  sleep,
  DEFAULT_USER_AGENT,
  DEFAULT_TIMEOUT_MS,
  POLITENESS_DELAY_MS,
};
