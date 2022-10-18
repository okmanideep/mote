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
import fetch from 'node-fetch'
import * as url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

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

async function start() {
  const app = express()

  hljs.registerAliases("proto", { languageName: 'protobuf' })

  const engine = new Liquid({
    root: liquidRootPaths(),
  })
  engine.registerFilter('cssmin', cssmin)
  const template = engine.parseFileSync("default.liquid")
  const buildOutput = esbuild.buildSync({
    entryPoints: clientJsPaths(),
    write: false,
    bundle: true,
    platform: 'browser',
    nodePaths: nodeModulesPaths(),
    format: 'iife',
    outdir: 'out',
  })

  const js = buildOutput.outputFiles[0].text.replace('{{WEBSOCKET_PORT}}', `${WEBSOCKET_PORT}`)

  app.get('/status', async function(req, res) {
      res.sendStatus(200)
  })

  app.get('/:name', async function(req, res) {
    const name = req.params['name']
    const file = getMdFilePath(name)

    if (!fs.existsSync(file)) {
      res.sendStatus(404)
    } else {
      const content = getHTMLfromMdFile(file)
      res.send(await engine.render(template, { content, js }))
    }
  })

  app.listen(SITE_PORT, () => {
    console.log(`http://localhost:${SITE_PORT}/current`)
  })

  const wss = new WebSocketServer({ port: WEBSOCKET_PORT })
  wss.on('connection', (ws, req) => {
    const filename = req.url.substring(1)
    const mdFilePath = getMdFilePath(filename)
    if (!fs.existsSync(mdFilePath)) {
      ws.send(JSON.stringify({ type: 'error', data: { message: `Couldn't find ${mdFilePath}` } }))
      return
    }

    fs.watchFile(mdFilePath, { persistent: true, interval: 300 }, async () => {
      console.log("file updated")
      const contents = await getHTMLfromMdFile(mdFilePath)
      ws.send(JSON.stringify({ type: 'update', data: { contents } }))
    })

    ws.onclose = () => {
      fs.unwatchFile(mdFilePath)
    }
  })

}

function getMdFilePath(filename) {
  return path.join(MOTES_DIR, `${filename}.md`)
}

function getHTMLfromMdFile(file) {
  const markdown = fs.readFileSync(file).toString()
  return md.render(markdown)
}

function highlight(str, lang) {
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

async function isRunning() {
  try {
    const response = await fetch(`http://localhost:${SITE_PORT}/status`)
    return response.ok
  } catch(e) {
    return false
  }
}

function liquidRootPaths() {
  return [
    path.join(__dirname, '..', 'client'),
    path.join(__dirname, '..', 'client', 'css'),
  ]
}

function clientJsPaths() {
  return [
    path.join(__dirname, '..', 'client', 'js', 'index.js')
  ]
}

function nodeModulesPaths() {
  return [
    path.join(__dirname, '..', '..', 'node_modules')
  ]
}

export default { start, isRunning }
