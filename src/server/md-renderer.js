import MarkdownIt from 'markdown-it'
import MarkdownItChechbox from 'markdown-it-checkbox'
import MarkdownItAnchor from 'markdown-it-anchor'
import hljs from 'highlight.js'
import fs from 'node:fs'
import zigHighlight from './zig-hightlight.js'

function renderer() {
  let _md
  let highlight = (str, lang) => _highlight(_md, str, lang)

  const options = {
    html: true,
    breaks: true,
    linkify: true,
    highlight: highlight
  }

  hljs.registerAliases("proto", { languageName: 'protobuf' })
  hljs.registerLanguage("zig", zigHighlight)

  _md = MarkdownIt(options)
    .use(MarkdownItChechbox)
    .use(MarkdownItAnchor)

  return {
    render: (file) => _renderHTML(_md, file)
  }
}

function _renderHTML(md, file) {
  const markdown = _stripFrontMatter(fs.readFileSync(file).toString())
  const title = _firstHeading(markdown)
  return { content: md.render(markdown), title: title ? title : "Notes" }
}

function _stripFrontMatter(markdown) {
  // Front matter is only valid when its opening delimiter is the first line.
  // Do not use multiline anchors here: they also match horizontal rules later
  // in an ordinary Markdown document.
  const text = markdown.replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/)
  if (!/^---[\t ]*$/.test(lines[0] ?? '')) return markdown

  const closingLine = lines.findIndex((line, index) =>
    index > 0 && /^(?:---|\.\.\.)[\t ]*$/.test(line)
  )
  if (closingLine === -1) return markdown

  return lines.slice(closingLine + 1).join('\n')
}

function _firstHeading(markdown) {
  // get from first line that starts with #
  const lines = markdown.split('\n')
  const headingLine = lines.find(line => line.startsWith('#'))
  if (headingLine) {
    return headingLine.replace(/^#+\s*/, '').trim()
  }

  return null
}

function _highlight(md, str, lang) {
  if (lang === "mermaid") {
    // browser javascript will replace this with diagram
    return '<div class="mermaid">' + str + '</div>'
  }

  if (lang && hljs.getLanguage(lang)) {
    try {
      return '<pre class="hljs"><code>' +
        hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
        '</code></pre>';
    } catch (__) { }
  }

  return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
}

export default renderer()
