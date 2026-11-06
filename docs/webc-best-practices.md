# WebC best practices

Mote uses `@11ty/webc` 0.8.0. Keep components reusable by colocating their markup, scoped styles, and browser behavior in `.webc` files.

## Mote file names

This is Mote’s naming convention; WebC does not require these suffixes.

- `*-page.webc` holds one page’s content and page-specific components, styles, and scripts. For example, `home-page.webc` builds the homepage content.
- `layout.webc` is the shared outer HTML document. It inserts page markup, optional Markdown content, and the CSS and JavaScript bundles produced by WebC.
- `components/*.webc` holds reusable pieces shared by pages, such as `theme-switch.webc` and `file-list.webc`.

The renderer compiles a page template first, then puts its output into `layout.webc`.

- Put interactions in a component `<script>` and register DOM events with `addEventListener`; avoid inline handlers such as `onclick`.
- Use `<style webc:scoped>` for component styles. WebC rewrites `:host` to the component’s generated class.
- Pass content through component attributes and slots. Use `@text` for escaped text; reserve `@raw` for trusted HTML that is intentionally emitted without escaping or WebC processing.
- In bundler mode, WebC collects component `<script>`, `<style>`, and local stylesheet links into page bundles. Keep the layout bundle outlets marked `webc:keep`.
- Check the installed WebC version before using newer directives. In particular, `webc:setup` and several dynamic attributes require WebC 0.9.0 or newer.

References: [WebC documentation](https://www.11ty.dev/docs/languages/webc/), especially [scoped CSS](https://www.11ty.dev/docs/languages/webc/#webcscoped), [slots](https://www.11ty.dev/docs/languages/webc/#slots), and [bundled CSS and JS](https://www.11ty.dev/docs/languages/webc/#css-and-js-bundler-mode).
