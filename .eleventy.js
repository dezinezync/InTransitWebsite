const markdownIt = require("markdown-it");
const { DateTime } = require("luxon");
const pluginRss = require("@11ty/eleventy-plugin-rss");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);
  // Filters
  eleventyConfig.addFilter("rssLastUpdatedDate", (collection) => {
    return rssPlugin.dateToRfc3339(rssPlugin.getNewestCollectionItemDate(collection));
  });
  
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

  eleventyConfig.addFilter("absolute_url", (url) => {
    const isDev = process.argv && (process.argv.includes("--serve") || process.argv.includes("-s"));
    const baseUrl = isDev ? "http://localhost:8080" : "https://intransit.app";
    return new URL(url, baseUrl).href;
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

  eleventyConfig.addFilter("jsonify", (obj) => {
    return JSON.stringify(obj);
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

  eleventyConfig.addFilter("strip_html", (str) => {
    if (!str) return "";
    return str.replace(/<[^>]*>?/gm, "");
  });

  eleventyConfig.addFilter("strip", (str) => {
    if (!str) return "";
    return str.trim();
  });

  // Collections
  eleventyConfig.addCollection("posts", (collection) => {
    return collection.getFilteredByGlob("_posts/**/*.md").sort((a, b) => {
      return b.date - a.date;
    });
  });

  // Passthrough Copy
  eleventyConfig.addPassthroughCopy("assets/images");
  eleventyConfig.addPassthroughCopy("assets/icons");
  eleventyConfig.addPassthroughCopy("assets/scripts");
  eleventyConfig.addPassthroughCopy("assets/css");
  eleventyConfig.addPassthroughCopy("favicon.ico");
  eleventyConfig.addPassthroughCopy("sitemap.xml");

  eleventyConfig.addWatchTarget("assets/scripts/");

  eleventyConfig.setFrontMatterParsingOptions({
    excerpt: true,
    excerpt_alias: 'excerpt',
  });

  // Layout aliases
  eleventyConfig.addLayoutAlias("post", "post.njk");
  // eleventyConfig.addLayoutAlias("page", "page.njk");
  eleventyConfig.addLayoutAlias("blog", "blog.njk");

  // Initialize the Markdown parser
  const md = new markdownIt({
    html: true, // Enable HTML tags in source
    breaks: true, // Convert '\n' in source into <br>
    linkify: true // Autoconvert URL-like text to links
  });

  // Add the custom filter
  eleventyConfig.addFilter("markdown", (content) => {
    return md.render(content);
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
      output: "_site",
    },
    templateFormats: ["md", "njk", "html", "liquid", "xml", "json"],
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    dataTemplateEngine: "liquid"
  };
};
