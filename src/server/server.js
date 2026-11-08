import express from 'express'
import { WebSocketServer } from 'ws'
import path from 'path'
import fs from 'fs'
import conf from './conf.js'
import mdRenderer from './md-renderer.js'
import PageRenderer from './page-renderer-webc.js'
import { attachLiveUpdates } from './live-updates.js'
import ensureFonts from './font-downloader.js'
import envPaths from 'env-paths'
import { RecentFiles, renderHomeLists } from './recent-files.js'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

async function start() {
  await ensureFonts()
  const config = await conf.get()
  const SITE_PORT = config['site_port']
  const MOTES_DIR = config['motes_dir']
  const recentFiles = new RecentFiles(path.join(envPaths('mote', { suffix: '' }).data, 'recent-files.json'), MOTES_DIR)
  const WEBSOCKET_PORT = config['websocket_port']
  const pageRenderer = new PageRenderer(WEBSOCKET_PORT)

  const mdFilePath = (filename) => {
    // add extension if not already present
    const fileNameWithExt = filename.endsWith('.md') ? filename : filename + '.md'
    return path.join(MOTES_DIR, fileNameWithExt)
  }

  const resolveMarkdownFileFromPagePath = (pagePath) => {
    if (pagePath.startsWith('/p/')) {
      return decodeURIComponent(pagePath.substring(3))
    }

    const name = decodeURIComponent(pagePath.substring(1))
    return mdFilePath(name)
  }

  const resolveImageFileFromRequest = (req) => {
    const referer = req.get('referer')
    if (!referer) {
      return null
    }

    const refererUrl = new URL(referer)
    const markdownFile = resolveMarkdownFileFromPagePath(refererUrl.pathname)
    const markdownDir = path.dirname(markdownFile)

    let imagePath = decodeURIComponent(req.path)
    if (refererUrl.pathname.startsWith('/p/') && imagePath.startsWith('/p/')) {
      imagePath = imagePath.substring(3)
    } else {
      imagePath = imagePath.substring(1)
    }

    return path.resolve(markdownDir, imagePath)
  }

  const app = express()

  app.get('/status', async function(_, res) {
    res.sendStatus(200)
  })

  app.get('/', async function(_, res) {
    const lists = await recentFiles.list()
    res.type('html').send(await pageRenderer.renderHome(renderHomeLists(lists)))
  })

  app.get('/api/recent-files', async function(_, res) {
    res.json(await recentFiles.list())
  })

  app.get('/api/search', async function(req, res) {
    res.json(await recentFiles.search(req.query.q || ''))
  })

  app.use(express.static(path.join(__dirname,'assets')))

  app.get(/.*\.(png|jpg|jpeg|gif|webp|svg)$/, function(req, res) {
    const imageFile = resolveImageFileFromRequest(req)

    if (!imageFile || !fs.existsSync(imageFile)) {
      res.sendStatus(404)
      return
    }

    res.sendFile(imageFile)
  })

  app.get('/p/:path', async function(req, res) {
    const filePath = req.params['path']
    if (!fs.existsSync(filePath)) {
      res.status(404).send(`<h1>${filePath} not found</h1>`)
    } else {
      const note = mdRenderer.render(filePath)
      await recentFiles.recordViewed(filePath, note.title)
      res.send(await pageRenderer.render(filePath, note))
    }
  })

  app.get('/:name', async function(req, res) {
    const name = req.params['name']
    const file = mdFilePath(name)

    if (!fs.existsSync(file)) {
      console.log(`Could not find ${file}`)
      res.sendStatus(404)
    } else {
      const note = mdRenderer.render(file)
      await recentFiles.recordViewed(file, note.title)
      res.send(await pageRenderer.render(file, note))
    }
  })

  app.listen(SITE_PORT, () => {
    console.log(`http://localhost:${SITE_PORT}/current`)
  })

  const wss = new WebSocketServer({ port: WEBSOCKET_PORT })
  attachLiveUpdates(wss, resolveMarkdownFileFromPagePath)


}

export default { start }
