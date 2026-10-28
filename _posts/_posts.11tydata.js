// Data for each post: the files in this folder and in its folders. Eleventy adds it to
// the data of _posts.json.
const path = require("path");
const { describeFile, plainText } = require("../tools/meta-text.js");

module.exports = {
  eleventyComputed: {
    // The meta description of a post (see _includes/head.html).
    //   • A `description` in the front matter of the post wins.
    //   • Then an `excerpt` in the front matter, as plain text.
    //   • Else the description comes from the start of the text of the post: its first
    //     sentences, as plain text, in at most 155 characters (see tools/meta-text.js).
    // The head cuts each description at 160 characters, whatever its source.
    //
    // Eleventy 2.0.1 does not give the source of a page to its data, and so the function
    // reads the file. `page.inputPath` is relative to the root of the site. This function
    // runs twice for each post, because Eleventy first finds the values that it reads. The
    // posts are small, and so the second read costs almost nothing.
    // The function does not change `date` or `updated`, and so the <lastmod> of the post in
    // the sitemap stays as it was (see the `lastModified` filter in .eleventy.js).
    description: (data) => {
      if (data.description) {
        return data.description;
      }
      if (data.excerpt) {
        return plainText(data.excerpt).replace(/\n\n/g, " ");
      }
      return describeFile(path.join(__dirname, "..", data.page.inputPath));
    }
  }
};
