import express from 'express'
import esbuild from 'esbuild'
import { WebSocketServer } from 'ws'
import path from 'path'
import fs from 'fs'
import { Liquid } from 'liquidjs'
import MarkdownIt from 'markdown-it'
import MarkdownItChechbox from 'markdown-it-checkbox'
import hljs from 'highlight.js'
import cssmin from 'cssmin'
import getConfig from './config.js'

const app = express()
const config = await getConfig()
const SITE_PORT = config['site_port']
const MOTES_DIR = config['motes_dir']
const WEBSOCKET_PORT = config['websocket_port']

const options = {
  html: true,
  breaks: true,
  linkify: true,
  highlight: highlight
}

const md = MarkdownIt(options).use(MarkdownItChechbox)

hljs.registerAliases("proto", {languageName: 'protobuf'})

// path.resolve("src/client") works from the project root reliably in linux, windows
// than path.resolve(__dirname, "..", "client")
// I don't know why. __dirname in both the platforms is $PROJECT_ROOT/src/server
const liquidRoot = [path.resolve('src/client'), path.resolve('src/client/css'), path.resolve('src/client/js')]

const engine = new Liquid({
  root: liquidRoot,
})
engine.registerFilter('cssmin', cssmin)
const template = engine.parseFileSync("default.liquid")
const buildOutput = esbuild.buildSync({
  entryPoints: [path.resolve('src/client/js/index.js')],
  write: false,
  bundle: true,
  platform: 'browser',
  nodePaths: [path.resolve('node_modules')],
  format: 'iife',
  outdir: 'out',
})

const js = buildOutput.outputFiles[0].text.replace('{{WEBSOCKET_PORT}}', `${WEBSOCKET_PORT}`)

app.get('/:name', async function(req, res) {
  const name = req.params['name']
  const file = getMdFilePath(name)

  if (!fs.existsSync(file)) {
    res.sendStatus(404)
  } else {
    const content = getHTMLfromMdFile(file)
    res.send(await engine.render(template, {content, js}))
  }
})

app.listen(SITE_PORT, () => {
  console.log("http://localhost:3000/current")
})

const wss = new WebSocketServer({ port: WEBSOCKET_PORT })
wss.on('connection', function(ws, req) {
  const filename = req.url.substring(1)
  const mdFilePath = getMdFilePath(filename)
  if (!fs.existsSync(mdFilePath)) {
    ws.send(JSON.stringify({type: 'error', data: {message: `Couldn't find ${mdFilePath}`}}))
    return
  }

  fs.watchFile(mdFilePath, {persistent: true, interval: 300}, async () => {
    console.log("file updated")
    const contents = await getHTMLfromMdFile(mdFilePath)
    ws.send(JSON.stringify({type: 'update', data: {contents}}))
  })

  ws.onclose = () => {
    fs.unwatchFile(mdFilePath)
  }
})

function getMdFilePath(filename) {
  return path.resolve(MOTES_DIR, `${filename}.md`)
}

function getHTMLfromMdFile(file) {
    const markdown = fs.readFileSync(file).toString()
    return md.render(markdown)
}

function highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>';
      } catch (__) {}
    }

    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
}
