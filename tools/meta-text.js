// Text helpers for the meta descriptions of the pages.
//
//   plainText(source)          Makes plain text from Markdown, HTML, or Liquid.
//   cutAtWord(text, max)       Cuts a text at a word boundary to `max` characters.
//   describe(source, max)      Makes a description from the start of a text.
//   describeFile(path, max)    Makes a description from a file, without its front matter.
//   descriptionText(text, max) Makes a stored description fit in a meta tag.
//
// _posts/_posts.11tydata.js makes the description of a post with `plainText` and
// `describeFile`. The `descriptionText` filter in .eleventy.js uses `descriptionText`.
// _includes/head.html applies that filter to the description of each page.
//
// To see the description of each post, run: node tools/meta-text.js

const fs = require("fs");
const path = require("path");

// The longest description that a page can have in a meta tag. Search engines
// cut a longer description. Each description of the site is at most this long.
const MAX_DESCRIPTION = 160;

// The longest description that `describe` makes from the text of a post. It is a
// little shorter than MAX_DESCRIPTION. Then a search engine that counts characters in
// another way (an emoji as two characters, for example) still shows the whole text.
const MAX_GENERATED = 155;

// `describe` stops at the end of a sentence if the text so far has at least this
// many characters. A shorter text takes part of the next sentence too.
const MIN_GENERATED = 80;

// `describe` reads only this many characters from the start of a text. A description needs
// a few sentences, and some patterns in `plainText` are slow on a very long text.
const MAX_SOURCE = 20000;

// The HTML entities that the old posts use. A character reference with a number
// (`&#8217;` or `&#x2019;`) needs no entry here.
const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: "\u00a0",
  hellip: "…", mdash: "—", ndash: "–", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  laquo: "«", raquo: "»", bull: "•", middot: "·", copy: "©", reg: "®", trade: "™",
  times: "×", deg: "°", euro: "€", pound: "£", yen: "¥", cent: "¢", sect: "§",
  larr: "←", rarr: "→", uarr: "↑", darr: "↓"
};

// Tags that start a new block of text. The text before and after such a tag is
// not in the same paragraph.
const BLOCK_TAGS = "p|div|section|article|aside|header|footer|nav|main|ul|ol|li|dl|dt|dd|blockquote|br|hr|tr|td|th|address|details|summary|fieldset|form|figcaption|center";

// Tags with content that is not text for a reader: scripts, styles, code blocks,
// tables, images with their captions, and headings. The tag and its content go.
const SKIP_TAGS = "script|style|pre|table|svg|iframe|noscript|template|video|audio|canvas|object|picture|figure|h[1-6]";

// Replaces each HTML entity with its character. An entity that is not in the list
// stays as it is.
function decodeEntities(text) {
  return text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z][a-z0-9]*));/gi, (entity, decimal, hex, name) => {
    if (name) {
      return Object.prototype.hasOwnProperty.call(ENTITIES, name) ? ENTITIES[name] : entity;
    }
    const code = decimal ? parseInt(decimal, 10) : parseInt(hex, 16);
    try {
      return String.fromCodePoint(code);
    }
    catch (error) {
      return entity;
    }
  });
}

// Makes plain text from the source of a post or from another text. The source can
// have Markdown, HTML, and Liquid. The function removes:
//   • Liquid tags, outputs, and comments.
//   • HTML comments, tags, and the content of the tags in SKIP_TAGS (images, headings,
//     code blocks, and tables).
//   • Markdown headings, images, code blocks, tables, rules, footnote markers and
//     footnotes, link addresses, and the marks for bold, italic, and code.
//   • URLs.
// The function decodes HTML entities. It returns the blocks of text (paragraphs,
// list items, and quotes) with an empty line between them. A block has no line break
// and no double space. The result has no block that is empty or that has no letter or
// number, for example a paragraph with only an image.
function plainText(source) {
  let text = String(source === undefined || source === null ? "" : source).replace(/\r\n?/g, "\n");

  // Liquid. A comment goes with its content. The other tags and outputs go alone.
  text = text
    .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, " ")
    .replace(/\{%[\s\S]*?%\}/g, " ")
    .replace(/\{\{[\s\S]*?\}\}/g, " ");

  // Markdown code blocks with fences. A block that has no closing fence goes to the end.
  text = text.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n {0,3}\1[`~]*[ \t]*(?=\n|$)|(?![\s\S]))/gm, "\n\n");

  // HTML that is not text for a reader.
  text = text
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(new RegExp(`<(${SKIP_TAGS})\\b[\\s\\S]*?<\\/\\1\\s*>`, "gi"), "\n\n")
    .replace(new RegExp(`<\\/?(?:${BLOCK_TAGS})\\b[^>]*>`, "gi"), "\n\n")
    .replace(/<\/?[a-z][^>]*>/gi, "");

  // Markdown at the start of a line: headings, rules, notes, link definitions, tables,
  // quotes, and list marks. Each list item is a block of its own.
  text = text
    .replace(/^ {0,3}#{1,6}(?:[ \t].*)?$/gm, "\n")
    .replace(/^[^\n]+\n {0,3}(?:=+|-{2,})[ \t]*$/gm, "\n")
    .replace(/^ {0,3}(?:[-*_][ \t]*){3,}$/gm, "\n")
    .replace(/^ {0,3}\[\^[^\]]+\]:.*(?:\n(?: {2,}|\t)[^\n]*)*/gm, "\n")
    .replace(/^ {0,3}\[[^\]]+\]:[ \t]*\S.*$/gm, "\n")
    .replace(/^[ \t]*\|.*$/gm, "\n")
    .replace(/^(?:[ \t]*>)+[ \t]?/gm, "")
    .replace(/^[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+/gm, "\n\n");

  // Markdown in the text of a line: images, footnote markers, links, URLs, code, bold,
  // italic, and escapes. A link keeps its text. Its address goes.
  text = text
    .replace(/!\[[^\]]*\](?:\((?:[^()]|\([^()]*\))*\)|\[[^\]]*\])/g, " ")
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"')\]]+/gi, " ")
    .replace(/`+([^`\n]*)`+/g, "$1")
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2")
    .replace(/(?<![\w*])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![\w*])/g, "$1")
    .replace(/(?<![\w_])_(?=[^\s_])([^_\n]*?[^\s_])_(?![\w_])/g, "$1")
    .replace(/~~(?=\S)([^~\n]*?\S)~~/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!|<>~])/g, "$1");

  // Characters, then spaces. One block is one line.
  return decodeEntities(text)
    .split(/\n[ \t]*\n/)
    .map((block) => block.replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim())
    .filter((block) => /[\p{L}\p{N}]/u.test(block))
    .join("\n\n");
}

// Cuts a text to `max` characters or fewer, at the end of a word. If the text is
// cut, the result ends with "…", and the "…" is in the count. A text that fits
// stays as it is. The cut does not leave a comma, a colon, a dash, or an open
// bracket at the end.
function cutAtWord(text, max) {
  if (text.length <= max) {
    return text;
  }
  const room = max - 1;
  // One more character than `room`, to see if the cut is between two words.
  const head = text.slice(0, room + 1);
  const space = head.lastIndexOf(" ");
  let cut = space > 0 ? head.slice(0, space) : head.slice(0, room);
  // A text with no space can be cut in the middle of a surrogate pair (an emoji, for
  // example). Then the function removes the first half of the pair.
  if (space <= 0 && /[\ud800-\udbff]$/.test(cut)) {
    cut = cut.slice(0, -1);
  }
  return `${cut.replace(/[\s,;:([{\-–—]+$/, "")}…`;
}

// The sentences of one block of text. A sentence ends with ".", "!", "?", or "…", with
// optional closing quotes or brackets. The next sentence starts after a space, with a
// capital letter, a number, or an opening quote. A name like "iOS" or "macOS" (a small
// letter and then a capital letter) also starts a sentence. A full stop after an
// abbreviation or after an initial ("e.g.", "Dr.", "J.") is not the end of a sentence.
function splitSentences(block) {
  const sentences = [];
  const ending = /([.!?…]+["”’')\]]*)(\s+)(?=["“‘'([]?(?:[\p{Lu}\p{N}]|[a-z]\p{Lu}))/gu;
  const abbreviation = /(?:\b(?:e\.g|i\.e|etc|vs|approx|Mr|Mrs|Ms|Dr|Prof|St|No|Inc|Ltd|Co|Jr|Sr|cf|ca)|\b\p{Lu})\.$/iu;
  let start = 0;
  let match;
  while ((match = ending.exec(block)) !== null) {
    const end = match.index + match[1].length;
    if (abbreviation.test(block.slice(start, end))) {
      continue;
    }
    sentences.push(block.slice(start, end));
    start = match.index + match[0].length;
  }
  sentences.push(block.slice(start));
  return sentences.filter((sentence) => sentence.length > 0);
}

// Ends the last sentence of a block of text with a stop mark, if it has none. A list item
// and a heading line often have no full stop. Then the next block would run into this
// one in the description. A comma or a semicolon at the end becomes a full stop. A colon,
// which introduces the next block, stays.
function endBlock(sentence) {
  if (/[.!?…:]["”’')\]]*$/.test(sentence)) {
    return sentence;
  }
  return `${sentence.replace(/[,;]+$/, "")}.`;
}

// Makes a description from the start of a text (Markdown, HTML, or Liquid). The
// description has the first sentences of the text, as plain text, in `max` characters
// or fewer. It stops at the end of a sentence if it has at least MIN_GENERATED
// characters by then. Else it cuts the next sentence at the end of a word, and it adds
// "…". The text can start with an image or a heading: `plainText` removes both.
// The function returns an empty string if the text has no words.
function describe(source, max = MAX_GENERATED) {
  const sentences = plainText(String(source === undefined || source === null ? "" : source).slice(0, MAX_SOURCE))
    .split("\n\n")
    .flatMap((block) => {
      const parts = splitSentences(block);
      if (parts.length > 0) {
        parts[parts.length - 1] = endBlock(parts[parts.length - 1]);
      }
      return parts;
    });
  let result = "";
  for (const sentence of sentences) {
    const next = result ? `${result} ${sentence}` : sentence;
    if (next.length <= max) {
      result = next;
    }
    else if (result.length >= MIN_GENERATED) {
      break;
    }
    else {
      return cutAtWord(next, max);
    }
  }
  // A text that ends with a colon would look cut. The list that the colon introduces is not
  // in the description.
  return result.replace(/:$/, ".");
}

// Makes a stored description fit in a meta tag: one line, with no space at the start
// or at the end, and at most `max` characters. A longer description is cut at the end
// of a word, with "…". The function does not read the text as Markdown or HTML.
function descriptionText(text, max = MAX_DESCRIPTION) {
  const line = String(text === undefined || text === null ? "" : text).replace(/\s+/g, " ").trim();
  return cutAtWord(line, max);
}

// Removes the front matter of a file: the lines between the two "---" lines at the start.
function withoutFrontMatter(source) {
  return source.replace(/^\uFEFF?---[ \t]*\n(?:[\s\S]*?\n)?---[ \t]*(?:\n|$)/, "");
}

// Makes a description from a file. The file is a post, with front matter and then Markdown
// or HTML. The path is the path of the file on the disk.
function describeFile(filePath, max) {
  const source = fs.readFileSync(filePath, "utf8").replace(/\r\n?/g, "\n");
  return describe(withoutFrontMatter(source), max);
}

module.exports = { MAX_DESCRIPTION, MAX_GENERATED, MIN_GENERATED, plainText, cutAtWord, describe, describeFile, descriptionText };

// The command: print the description of each post.
if (require.main === module) {
  const postsFolder = path.join(__dirname, "..", "_posts");
  const files = [];
  const walk = (folder) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(folder, entry.name));
      }
      else if (entry.name.endsWith(".md")) {
        files.push(path.join(folder, entry.name));
      }
    }
  };
  walk(postsFolder);
  for (const file of files.sort()) {
    const description = describeFile(file);
    console.log(`${String(description.length).padStart(3)}  ${path.relative(postsFolder, file)}\n     ${description}`);
  }
}
