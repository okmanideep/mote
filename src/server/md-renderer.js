import MarkdownIt from 'markdown-it'
import MarkdownItChechbox from 'markdown-it-checkbox'
import hljs from 'highlight.js'
import fs from 'node:fs'

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

  _md = MarkdownIt(options).use(MarkdownItChechbox)

  return {
    render: (file) => _renderHTML(_md, file)
  }
}

function _renderHTML(md, file) {
  const markdown = fs.readFileSync(file).toString()
  return md.render(markdown)
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
