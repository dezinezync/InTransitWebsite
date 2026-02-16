# Project: Eleventy Static Site

# Domain: intransit.app

## General Instructions

*   **Goal:** The primary goal is to maintain and extend a fast, static website built with the [Eleventy](https://www.11ty.dev) static site generator.
*   **Coding Style:** Follow the existing coding style for HTML, CSS, and JavaScript. Use two spaces for indentation.
*   **Documentation:** Ensure all new functions, components, or complex logic have clear comments or JSDoc where appropriate.

## Technology Stack

*   **Static Site Generator:** [Eleventy](https://www.11ty.dev) (using Markdown and Nunjucks templates).
*   **Styling:** Plain old CSS (no Sass/Less/Stylus). Leverage CSS variables and modern layouts like Flexbox/Grid.
*   **JavaScript:** Minimal JavaScript, no heavy frameworks.
*   **Output:** The site is built into the `_site` directory.

## Eleventy Specifics

*   **Markdown Frontmatter:** Use YAML frontmatter for defining layout, title, tags, and other page-specific data.
*   **Templates:** Templates are located in the `_includes` directory and use the Nunjucks templating language (e.g., `.njk` files).
*   **Content Variable:** The main content of a Markdown file is inserted into the template using the `{{ content | safe }}` variable.

## Specific Directives for the AI Agent

*   When editing `.md` files, remember to use Markdown syntax and include frontmatter if necessary.
*   When generating new code, avoid using Tailwind classes as they are not part of the project's chosen styling strategy.
*   If a task involves generating content for the Gemini protocol, use tools like `md2gemini` or `gemdown` as the site can also be configured to generate `.gmi` files.
*   Prioritize a progressive enhancement methodology when adding new features.