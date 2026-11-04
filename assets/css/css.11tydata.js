// The data of the files in assets/css. site.scss is a template (see the Sass
// extension in .eleventy.js), so without this its output, site.css, is in
// `collections.all`, and sitemap.xml.liquid lists it as a page.
module.exports = {
  eleventyExcludeFromCollections: true,
};
