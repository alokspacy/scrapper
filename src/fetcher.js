const fs = require('fs/promises');
const path = require('path');

const DEFAULT_USER_AGENT = 'ThePoliteScraper/1.0 (Public Practice Sandbox; +https://books.toscrape.com/)';
const DEFAULT_TIMEOUT_MS = 10000;

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

module.exports = {
  fetchPage,
  saveToCache,
  DEFAULT_USER_AGENT,
  DEFAULT_TIMEOUT_MS,
};
