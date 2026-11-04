#!/usr/bin/env node
// Send changed pages of the site to IndexNow (https://www.indexnow.org).
// A copy of tools/indexnow.js on the Pockity site.
// Bing, Yandex, Naver, and the other IndexNow search engines share the URLs.
// Google does not use IndexNow.
//
// Run this script after the deploy is live. The search engines read the pages
// soon after they get the URLs, so the new content must be online first.
//
// Usage:
//   npm run indexnow -- --since 2026-10-13   Send each URL in the live sitemap that
//                                            has a <lastmod> on or after the date. The
//                                            date is in the time zone of this computer,
//                                            and starts at midnight. The sitemap of this
//                                            site has dates only, with no time, so
//                                            `--since` also takes a time but a time
//                                            leaves out the pages of that day. After
//                                            a second deploy on a day, send its pages
//                                            by path (below).
//   npm run indexnow -- --all                Send all URLs in the live sitemap.
//   npm run indexnow -- /press/ /releases/   Send only these URLs. A path is
//                                            relative to the production domain.
// Add --dry-run to show the request and not send it.
//
// The key is `indexNowKey` in _data/site.js. The build writes it to /<key>.txt
// (see indexnow-key.txt.liquid). The script stops if that file is not live with
// the correct key, because IndexNow then rejects the request.

// _data/site.js exports a function, which Eleventy calls to get the data.
const site = require("../_data/site.js")();

const ENDPOINT = "https://api.indexnow.org/indexnow";
// IndexNow accepts a maximum of 10,000 URLs in one request.
const MAX_URLS_PER_REQUEST = 10000;
// The meaning of each status code, from the IndexNow documentation.
const STATUS_MEANINGS = {
  200: "OK. The search engines got the URLs.",
  202: "Accepted. The search engines got the URLs. They will validate the key later.",
  400: "Bad request. The format of the request is not valid.",
  403: "Forbidden. The key is not valid, or the key file does not contain the key.",
  422: "Unprocessable. A URL is not on the host, or the key does not agree with the protocol.",
  429: "Too many requests. Wait, then try again."
};

function usage(message) {
  console.error(message);
  console.error("Usage: node tools/indexnow.js [--dry-run] (--all | --since YYYY-MM-DD | <url> ...)");
  process.exit(2);
}

// Read a date (YYYY-MM-DD) or a time (YYYY-MM-DDTHH:MM, with optional seconds and an
// optional offset such as Z or +05:30). A date starts at midnight. A date or a time
// without an offset is in the time zone of this computer. Returns null for other text.
// The sitemap writes dates only (see sitemap.xml.liquid).
function parseDate(text) {
  const match = /^(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(text || "");
  if (!match) {
    return null;
  }
  // JavaScript reads a date without a time as UTC, but a time without an offset
  // as local time. Thus a date gets the time 00:00 here.
  const date = new Date(match[2] ? text : `${match[1]}T00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseArgs(argv) {
  const options = { dryRun: false, all: false, since: null, urls: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
    }
    else if (arg === "--all") {
      options.all = true;
    }
    else if (arg === "--since") {
      options.since = parseDate(argv[index + 1]);
      index += 1;
      if (!options.since) {
        usage("--since needs a date (YYYY-MM-DD) or a time (YYYY-MM-DDTHH:MM).");
      }
    }
    else if (arg.startsWith("--")) {
      usage(`Unknown option: ${arg}`);
    }
    else {
      options.urls.push(arg);
    }
  }
  const modes = [options.all, options.since !== null, options.urls.length > 0].filter(Boolean).length;
  if (modes !== 1) {
    usage("Give one of --all, --since <date or time>, or a list of URLs.");
  }
  return options;
}

async function fetchText(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`GET ${url} gave HTTP ${response.status}.`);
  }
  return response.text();
}

// Read the <loc> and <lastmod> of each <url> in the sitemap. sitemap.xml.liquid
// makes the sitemap and its structure is simple, so a regular expression is sufficient.
function parseSitemap(xml) {
  const entries = [];
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/.exec(match[1]);
    const lastmod = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(match[1]);
    if (loc) {
      entries.push({ loc: loc[1].replace(/&amp;/g, "&"), lastmod: lastmod ? lastmod[1] : null });
    }
  }
  return entries;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const origin = site.productionUrl;
  const host = new URL(origin).host;
  const key = site.indexNowKey;
  const keyLocation = `${origin}/${key}.txt`;

  // Make sure that the key file is live. In a dry run, only show the problem.
  let liveKey = null;
  try {
    liveKey = (await fetchText(keyLocation)).trim();
  }
  catch (error) {
    liveKey = null;
  }
  if (liveKey !== key) {
    const message = `The key file ${keyLocation} is not live with the key from _data/site.js. Deploy the site first.`;
    if (!options.dryRun) {
      console.error(message);
      process.exit(1);
    }
    console.warn(`Warning: ${message}`);
  }

  let urls = [];
  if (options.urls.length > 0) {
    urls = options.urls.map((url) => new URL(url, origin).href);
  }
  else {
    const entries = parseSitemap(await fetchText(`${origin}/sitemap.xml`));
    urls = entries
      .filter((entry) => {
        if (options.all) {
          return true;
        }
        const lastmod = parseDate(entry.lastmod);
        return lastmod !== null && lastmod >= options.since;
      })
      .map((entry) => entry.loc);
  }
  urls = [...new Set(urls)];

  // IndexNow accepts only URLs on the host of the key.
  const otherHosts = urls.filter((url) => new URL(url).host !== host);
  if (otherHosts.length > 0) {
    console.error(`These URLs are not on ${host}:\n  ${otherHosts.join("\n  ")}`);
    process.exit(1);
  }
  if (urls.length === 0) {
    console.log("No URLs to send.");
    return;
  }

  for (let start = 0; start < urls.length; start += MAX_URLS_PER_REQUEST) {
    const body = { host, key, keyLocation, urlList: urls.slice(start, start + MAX_URLS_PER_REQUEST) };
    if (options.dryRun) {
      console.log(`Dry run. This request is not sent:\nPOST ${ENDPOINT}\n${JSON.stringify(body, null, 2)}`);
      continue;
    }
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body)
    });
    const text = (await response.text()).trim();
    const meaning = STATUS_MEANINGS[response.status] || "Unknown status.";
    console.log(`HTTP ${response.status}: ${meaning} (${body.urlList.length} URLs)${text ? `\n${text}` : ""}`);
    if (!response.ok) {
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
