const pluginRss = require("@11ty/eleventy-plugin-rss");
const sass = require("sass");
const markdownIt = require("markdown-it");
const { DateTime, FixedOffsetZone } = require("luxon");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { descriptionText } = require("./tools/meta-text.js");

// Cloudflare Pages makes a shallow clone of the repository. Then git has no
// history, and each file has the date of the build. If the clone is shallow,
// fetch the full history before the build reads the dates.
// `--filter=blob:none` fetches only commits and trees, not the file contents,
// so the fetch is fast. A full clone (for example a local checkout) does not fetch.
function ensureFullGitHistory() {
  try {
    const shallow = execFileSync("git", ["rev-parse", "--is-shallow-repository"], { cwd: __dirname, encoding: "utf8" }).trim();
    if (shallow === "true") {
      execFileSync("git", ["fetch", "--quiet", "--unshallow", "--filter=blob:none", "origin"], { cwd: __dirname, stdio: ["ignore", "inherit", "inherit"] });
    }
  } catch (error) {
    console.warn(`[gitLastModified] Could not fetch the full git history (${error.message}). The <lastmod> dates in the sitemap can be wrong.`);
  }
}

// Return the date of the last commit that changed a file, or null if git has no
// date for it (for example a file that is not committed yet).
const gitDateCache = new Map();
function gitLastModified(filePath) {
  if (gitDateCache.has(filePath)) {
    return gitDateCache.get(filePath);
  }
  let result = null;
  try {
    const output = execFileSync("git", ["log", "-1", "--format=%cI", "--", filePath], { cwd: __dirname, encoding: "utf8" }).trim();
    result = output ? new Date(output) : null;
  } catch (error) {
    result = null;
  }
  gitDateCache.set(filePath, result);
  return result;
}

// The port of the dev server (`npm run start`). Another service on this
// computer uses port 8080. Keep this value the same as `port` in
// .claude/launch.json.
const DEV_PORT = 8082;

// Read the size of a PNG, WebP, or JPEG image, in pixels, from the header of the file. The
// function does not decode the image, so it is fast. It returns { width, height, type },
// where `type` is the media type of the file: "image/png", "image/webp", or "image/jpeg".
// It returns null if the file has another format.
// A PNG or WebP file has its size in the first 32 bytes, and the function reads only those.
// A WebP file has one of three layouts, and each layout keeps the size in another place:
//   "VP8X"  The extended layout. The canvas size, less 1, is in two 24-bit numbers.
//   "VP8L"  The lossless layout. The size, less 1, is in two 14-bit numbers.
//   "VP8 "  The lossy layout. The size is in two 14-bit numbers after the start code.
// A JPEG file has its size in a segment further on. See readJpegSize.
function readImageSize(filePath) {
  const header = Buffer.alloc(32);
  const fd = fs.openSync(filePath, "r");
  let length = 0;
  try {
    length = fs.readSync(fd, header, 0, header.length, 0);
  }
  finally {
    fs.closeSync(fd);
  }

  if (length >= 24 && header.toString("latin1", 1, 4) === "PNG" && header.toString("latin1", 12, 16) === "IHDR") {
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20), type: "image/png" };
  }

  if (length >= 30 && header.toString("latin1", 0, 4) === "RIFF" && header.toString("latin1", 8, 12) === "WEBP") {
    const layout = header.toString("latin1", 12, 16);
    if (layout === "VP8X") {
      return { width: 1 + header.readUIntLE(24, 3), height: 1 + header.readUIntLE(27, 3), type: "image/webp" };
    }
    if (layout === "VP8L" && header[20] === 0x2f) {
      const bits = header.readUInt32LE(21);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff), type: "image/webp" };
    }
    if (layout === "VP8 " && header[23] === 0x9d && header[24] === 0x01 && header[25] === 0x2a) {
      return { width: header.readUInt16LE(26) & 0x3fff, height: header.readUInt16LE(28) & 0x3fff, type: "image/webp" };
    }
  }

  if (length >= 4 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return readJpegSize(filePath);
  }

  return null;
}

// Read the size of a JPEG file. A JPEG file is a list of segments. Each segment starts with
// the byte 0xFF and a marker byte. Most segments then have a length of two bytes, and the
// length includes those two bytes. The size is in the "start of frame" segment (the markers
// 0xC0 to 0xCF, except 0xC4, 0xC8, and 0xCC): one byte of precision, and then the height and
// the width, two bytes each. The segments before it, for example the EXIF data and the
// colour profile, can be large. The function skips each one with its length, and it does not
// read it. It returns null if the file has no start of frame.
function readJpegSize(filePath) {
  const buffer = Buffer.alloc(5);
  const fd = fs.openSync(filePath, "r");
  try {
    // The first two bytes are the marker "start of image".
    let offset = 2;
    for (;;) {
      if (fs.readSync(fd, buffer, 0, 4, offset) < 4 || buffer[0] !== 0xff) {
        return null;
      }
      const marker = buffer[1];
      if (marker === 0xff) {
        // A filler byte before a marker.
        offset += 1;
      }
      else if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
        // A marker with no length.
        offset += 2;
      }
      else if (marker === 0xd9 || marker === 0xda) {
        // The end of the image or the start of the data: there is no start of frame before it.
        return null;
      }
      else if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        if (fs.readSync(fd, buffer, 0, 5, offset + 4) < 5) {
          return null;
        }
        return { width: buffer.readUInt16BE(3), height: buffer.readUInt16BE(1), type: "image/jpeg" };
      }
      else {
        offset += 2 + buffer.readUInt16BE(2);
      }
    }
  }
  finally {
    fs.closeSync(fd);
  }
}

// The dev server of Eleventy (npm run start) sends a file whole, and it ignores the `Range` header.
// A browser cannot seek in such a video: `currentTime` stays at 0, and the scroll of the Reading
// section (assets/js/reading-flight.js) cannot play the flight. Safari does not play such a video at
// all. Cloudflare Pages answers a `Range` request, so the live site is fine. This middleware
// answers it for the videos in the dev server: 206 with the bytes that the browser asks for.
const DEV_MEDIA_TYPES = { ".mp4": "video/mp4", ".m4v": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm" };
function devRangeMiddleware(req, res, next) {
  const pathname = decodeURIComponent((req.url || "").split("?")[0]);
  const type = DEV_MEDIA_TYPES[path.extname(pathname).toLowerCase()];
  const file = path.join(__dirname, "_site", pathname);
  if (!type || !file.startsWith(path.join(__dirname, "_site") + path.sep) || !fs.existsSync(file)) {
    return next();
  }
  const size = fs.statSync(file).size;
  const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  res.setHeader("Content-Type", type);
  res.setHeader("Accept-Ranges", "bytes");
  if (!match) {
    res.setHeader("Content-Length", size);
    res.statusCode = 200;
    fs.createReadStream(file).pipe(res);
    return;
  }
  let start = match[1] === "" ? size - Number(match[2]) : Number(match[1]);
  let end = match[1] === "" || match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  start = Math.max(0, start);
  if (start > end || start >= size) {
    res.statusCode = 416;
    res.setHeader("Content-Range", `bytes */${size}`);
    res.end();
    return;
  }
  res.statusCode = 206;
  res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
  res.setHeader("Content-Length", end - start + 1);
  fs.createReadStream(file, { start, end }).pipe(res);
}

module.exports = function (eleventyConfig) {
  // Plugins
  eleventyConfig.addPlugin(pluginRss);

  // Sass. Eleventy compiles assets/css/site.scss to /assets/css/site.css with the `sass`
  // package (the Elytra site uses the eleventy-sass plugin, which does not support
  // Eleventy 3). The partials are in _sass/site/. A file whose name starts with "_" is a
  // partial: it writes no file of its own. `addDependencies` tells Eleventy which partials
  // site.scss loads, so a change to a partial compiles site.scss again (with no cache, see
  // `compileOptions` below).
  eleventyConfig.addTemplateFormats("scss");
  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css",
    useLayouts: false,
    // Eleventy caches a compiled template by its content. site.scss itself rarely
    // changes, so with the cache a change to a partial would not reach site.css.
    compileOptions: {
      cache: false,
    },
    compile: async function (inputContent, inputPath) {
      const parsed = path.parse(inputPath);
      if (parsed.name.startsWith("_")) {
        return;
      }
      const result = sass.compileString(inputContent, {
        loadPaths: [parsed.dir || ".", path.join(__dirname, "_sass")],
        style: "compressed",
      });
      this.addDependencies(inputPath, result.loadedUrls);
      return async () => result.css;
    },
  });
  eleventyConfig.ignores.add("_sass/**");
  eleventyConfig.addWatchTarget("./_sass/");

  // Markdown
  const md = new markdownIt({
    html: true,
    breaks: true,
    linkify: true
  });
  eleventyConfig.setLibrary("md", md);

  // Renders a Markdown string, for the excerpts of the posts (_includes/head.html).
  eleventyConfig.addFilter("markdown", (content) => md.render(content || ""));

  eleventyConfig.addFilter("strip_html", (str) => {
    if (!str) return "";
    return str.replace(/<[^>]*>?/gm, "");
  });

  eleventyConfig.addFilter("strip", (str) => {
    if (!str) return "";
    return String(str).trim();
  });

  // Filters
  eleventyConfig.addFilter("date", (dateObj, format) => {
    if (!dateObj) return "";
    const date = typeof dateObj === "string" ? new Date(dateObj) : dateObj;
    
    if (format === "%Y-%m-%dT%H:%M:%S%z") {
      return DateTime.fromJSDate(date).toISO();
    }
    
    // Simple mapping for common Jekyll date formats to Luxon
    // Jekyll: %b %-d, %Y -> Luxon: MMM d, yyyy
    if (format === "%b %-d, %Y") {
      return DateTime.fromJSDate(date).toFormat("MMM d, yyyy");
    }
    if (format === "%Y-%m-%d") {
      return DateTime.fromJSDate(date).toFormat("yyyy-MM-dd");
    }
    
    // Fallback to simple format mapping if it looks like Jekyll format
    // This is very basic, for production we might want a more complete mapping
    const mapping = {
      "%Y": "yyyy",
      "%m": "MM",
      "%d": "dd",
      "%b": "MMM",
      "%B": "MMMM",
      "%H": "HH",
      "%M": "mm",
      "%S": "ss"
    };
    
    let luxonFormat = format;
    if (luxonFormat) {
      for (const [jekyll, luxon] of Object.entries(mapping)) {
        luxonFormat = luxonFormat.replace(new RegExp(jekyll, "g"), luxon);
      }
      return DateTime.fromJSDate(date).toFormat(luxonFormat);
    }
    
    return DateTime.fromJSDate(date).toFormat("MMM d, yyyy");
  });

  eleventyConfig.addFilter("absolute_url", function(url) {
    let baseUrl;
    if (process.env.CF_PAGES) {
      baseUrl = process.env.CF_PAGES_BRANCH === "main"
        ? "https://intransit.app"
        : (process.env.CF_PAGES_URL || "https://intransit.app");
    } else if (process.env.ELEVENTY_ENV === "production") {
      baseUrl = "https://intransit.app";
    } else {
      baseUrl = `http://localhost:${DEV_PORT}`;
    }
    
    if (!url) return baseUrl;
    if (url.startsWith("http")) return url;
    return baseUrl + (url.startsWith("/") ? "" : "/") + url;
  });

  eleventyConfig.addFilter("relative_url", function(url) {
    const isServe = process.argv && (process.argv.includes("--serve") || process.argv.includes("-s"));
    const baseUrl = ""; 
    if (!url) return baseUrl;
    return baseUrl + (url.startsWith("/") ? "" : "/") + url;
  });

  eleventyConfig.addFilter("xml_escape", (str) => {
    if (!str) return "";
    return str.replace(/[<>&"']/g, (m) => {
      switch (m) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "&": return "&amp;";
        case "\"": return "&quot;";
        case "'": return "&apos;";
        default: return m;
      }
    });
  });

  eleventyConfig.addFilter("date_to_rfc822", (dateObj) => {
    const date = typeof dateObj === "string" ? new Date(dateObj) : dateObj;
    return DateTime.fromJSDate(date).toRFC2822();
  });

  // A date and time in ISO 8601, for the `article:published_time` and `article:modified_time`
  // tags (_includes/head.html) and for the JSON-LD of a post (_includes/structured-data.html),
  // for example "2018-03-11T18:24:10+05:30". The time zone is always India, UTC+05:30, which
  // is the offset in the front matter of the posts. Thus the result does not depend on the
  // time zone of the computer that builds the site.
  // A date with no time, for example `updated: 2026-10-16`, is at midnight UTC in the data.
  // The filter then gives midnight in India on the same date, "2026-10-16T00:00:00+05:30".
  // The filter gives an empty string if the date is not valid.
  const INDIA = FixedOffsetZone.instance(5 * 60 + 30);
  eleventyConfig.addFilter("date_to_iso8601", (dateObj) => {
    if (!dateObj) return "";
    const date = typeof dateObj === "string" ? new Date(dateObj) : dateObj;
    if (Number.isNaN(date.getTime())) return "";
    const hasNoTime = date.getTime() % (24 * 60 * 60 * 1000) === 0;
    const dateTime = hasNoTime
      ? DateTime.fromObject({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }, { zone: INDIA })
      : DateTime.fromJSDate(date, { zone: INDIA });
    return dateTime.toISO({ suppressMilliseconds: true });
  });

  eleventyConfig.addFilter("jsonify", (obj) => {
    return JSON.stringify(obj);
  });

  // Writes a value as JSON for a `<script type="application/ld+json">` element
  // (_includes/structured-data.html). It works as `jsonify`, with one more step: each "<"
  // becomes "\u003c". Then a text with "</script>" in it cannot end the script element
  // early. A JSON parser reads "\u003c" as "<", so the data stays the same. The filter also
  // escapes the line separators U+2028 and U+2029. `jsonify` stays as it is, because
  // feed.json uses it, and the file must not change.
  eleventyConfig.addFilter("jsonld", (value) => {
    return JSON.stringify(value === undefined ? null : value)
      .replace(/</g, "\\u003c")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  });

  eleventyConfig.addFilter("normalize_whitespace", (str) => {
    if (!str) return "";
    return str.replace(/\s+/g, " ").trim();
  });

  eleventyConfig.addFilter("truncatewords", (str, count) => {
    if (!str) return "";
    const words = str.split(/\s+/);
    if (words.length <= count) return str;
    return words.slice(0, count).join(" ") + "...";
  });

  // Makes a description fit in a meta tag: one line, and at most 160 characters. A longer
  // text is cut at the end of a word, and it gets "…" at the end. _includes/head.html uses
  // this filter for the description of each page (see tools/meta-text.js).
  eleventyConfig.addFilter("descriptionText", (text) => descriptionText(text));

  // The size of an image file, for the `width` and `height` of an `img`, and for the share
  // image of a page (_includes/head.html). Give it the address of the image on the site, for
  // example "/assets/2026/20260221/banner.png". It returns { width, height, type }: the size
  // in pixels, and the media type of the file, for example "image/png".
  // `{% assign size = path | imageSize %}`, and then `size.width`, `size.height`, and
  // `size.type`. The browser uses the two numbers to keep the space of the image before the
  // file loads, so the page does not move when the image appears.
  // The address is also the path of the file in this folder, because each folder with
  // images (assets/images, assets/2026, ...) is copied to the same address (see "Passthrough
  // Copy" below). The build stops with an error if the file does not exist, is outside this
  // folder, or is not a PNG, a WebP, or a JPEG file.
  eleventyConfig.addFilter("imageSize", (sitePath) => {
    const filePath = path.resolve(__dirname, String(sitePath).replace(/^\/+/, ""));
    if (!filePath.startsWith(__dirname + path.sep)) {
      throw new Error(`[imageSize] "${sitePath}" is outside the site folder.`);
    }
    let size = null;
    try {
      size = readImageSize(filePath);
    }
    catch (error) {
      throw new Error(`[imageSize] Cannot read "${sitePath}": ${error.message}`);
    }
    if (!size) {
      throw new Error(`[imageSize] "${sitePath}" is not a PNG, a WebP, or a JPEG file. Add a reader for its format to readImageSize in .eleventy.js.`);
    }
    return size;
  });

  // True if a file of the site exists. Give it the address of the file on the site, for
  // example "/assets/images/home/cities-map-dark.webp". _includes/shot.html uses it to add the
  // dark files of an image only after Sketch has exported them, so that a page never links to
  // a file that is not there.
  eleventyConfig.addFilter("fileExists", (sitePath) => {
    const filePath = path.resolve(__dirname, String(sitePath).replace(/^\/+/, ""));
    return filePath.startsWith(__dirname + path.sep) && fs.existsSync(filePath);
  });

  // Colours the group labels of a release (New, Improved, Fixed, ...). A label is an
  // `h3`. Three old releases use an `h2` with an id (`<h2 id="new">`). The filter keeps
  // the level, and it removes the id, because many releases on one page would have the
  // same id.
  eleventyConfig.addFilter("releaseNotes", (html) => {
    return (html || "").replace(
      /<h([23])[^>]*>(New|Improved|Changed|Fixed|Removed|Fixes)<\/h\1>/gi,
      (_match, level, label) => {
        const normalized = label.toLowerCase() === "fixes" ? "fixed" : label.toLowerCase();
        const displayLabel = label.toLowerCase() === "fixes" ? "Fixed" : label;
        return `<h${level} class="mt-release__heading mt-release__heading--${normalized}">${displayLabel}</h${level}>`;
      }
    );
  });

  // The platform tags. A post or a release note marks the platform of a change with
  // inline code, for example `macOS`: Fixed ... Each platform has a modifier of
  // `.mt-tag` (see _sass/site/_typography.scss).
  const PLATFORM_TAGS = {
    iOS: "ios",
    iPadOS: "ipados",
    macOS: "mac",
    watchOS: "watch"
  };

  // The class attribute for the tag of a platform. A name that is not a platform gets
  // a grey tag.
  const platformTagClass = (platform) => {
    return PLATFORM_TAGS[platform] ? `mt-tag mt-tag--${PLATFORM_TAGS[platform]}` : "mt-tag";
  };
  eleventyConfig.addFilter("platformTagClass", platformTagClass);

  // Turns the code elements of the platforms into tags. Use it in a page template. Do
  // not use it in a feed: a feed reader does not have the stylesheet, and it shows
  // the code element. A code block (`pre`) stays as it is.
  eleventyConfig.addFilter("platformTags", (html) => {
    return (html || "").replace(
      /(?<!<pre>)<code>(iOS|iPadOS|macOS|watchOS)<\/code>/g,
      (_match, platform) => `<span class="${platformTagClass(platform)}">${platform}</span>`
    );
  });

  // Releases grouped by year, for the releases pages. The newest year is first.
  // Each entry has:
  //   year      The year as a string, for example "2026".
  //   releases  The releases of that year. The newest release is first.
  //   latest    True for the newest year that has a release.
  //   url       The address to link to. The newest year is at `/releases/`.
  //             Each other year is at `/releases/<year>/`.
  //   permalink The permanent address of the year, `/releases/<year>/`.
  //             The newest year also has this address.
  // A year has an entry only if it has a release. Thus a new year shows on the
  // site after its first release, and not before.
  // Release dates in the front matter have no time, so Eleventy reads them as
  // UTC midnight. Use the UTC year, so that the year is correct in all time zones.
  eleventyConfig.addCollection("releaseYears", (collectionApi) => {
    const byYear = new Map();
    const releases = collectionApi.getFilteredByTag("releases").slice().reverse();
    for (const release of releases) {
      const year = String(release.date.getUTCFullYear());
      if (!byYear.has(year)) {
        byYear.set(year, []);
      }
      byYear.get(year).push(release);
    }
    const years = [...byYear.keys()].sort((a, b) => Number(b) - Number(a));
    return years.map((year, index) => {
      const latest = index === 0;
      const permalink = `/releases/${year}/`;
      return {
        year,
        releases: byYear.get(year),
        latest,
        url: latest ? "/releases/" : permalink,
        permalink
      };
    });
  });

  // The date that a page last changed, for the <lastmod> of the page in
  // sitemap.xml.liquid:
  //   • `updated` in the front matter, if it is set.
  //   • The date of a post.
  //   • Else the date of the last commit that changed the template of the page.
  //     A page that lists posts or releases also uses the newest date in the list:
  //     the releases of a year (`yearData`), or the collection that
  //     `listsCollection` in the front matter names.
  // A release can have a date in the future. For such an entry, use the date of
  // the last commit that changed it, because the page shows the entry from then.
  ensureFullGitHistory();
  eleventyConfig.addFilter("lastModified", (item, collections) => {
    const data = item.data || {};
    if (data.updated) {
      return new Date(data.updated);
    }
    if (item.inputPath.startsWith("./_posts/")) {
      return item.date;
    }
    const dates = [gitLastModified(item.inputPath) || item.date];
    let listed = [];
    if (data.yearData) {
      listed = data.yearData.releases;
    }
    else if (data.listsCollection && collections) {
      listed = collections[data.listsCollection] || [];
    }
    const now = new Date();
    for (const entry of listed) {
      dates.push(entry.date > now ? (gitLastModified(entry.inputPath) || now) : entry.date);
    }
    return new Date(Math.max(...dates.map((date) => date.getTime())));
  });

  // Collections
  eleventyConfig.addCollection("posts", (collection) => {
    return collection.getFilteredByGlob("_posts/**/*.md").sort((a, b) => {
      return b.date - a.date;
    });
  });

  // Passthrough Copy
  eleventyConfig.addPassthroughCopy("assets/images");
  // The scripts of the pages. A page loads one with `defer`.
  eleventyConfig.addPassthroughCopy("assets/js");
  eleventyConfig.addPassthroughCopy("favicon.ico");
  // Redirect rules for Cloudflare Pages.
  eleventyConfig.addPassthroughCopy("_redirects");

  eleventyConfig.setServerOptions({
    showAllHosts: true,
    port: DEV_PORT,
    middleware: [devRangeMiddleware],
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
      output: "_site",
    },
    // Do not add "xml" or "json". Eleventy copies a file of a format that is not
    // a template language to the site as it is. That published package.json, the
    // directory data files, and the raw sitemap template.
    templateFormats: ["md", "html", "liquid", "njk"],
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    dataTemplateEngine: "liquid",
  };
};
