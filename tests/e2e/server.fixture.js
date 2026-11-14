import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { WebSocketServer } from 'ws'
import PageRenderer from '../../src/server/page-renderer-webc.js'
import { RecentFiles, renderHomeLists } from '../../src/server/recent-files.js'
import { addSource } from '../../src/server/sources.js'
import mdRenderer from '../../src/server/md-renderer.js'
import os from 'node:os'
import { attachLiveUpdates } from '../../src/server/live-updates.js'

export async function startFixture(notesDir) {
  const app = express()
  const site = app.listen(0)
  await new Promise(resolve => site.once('listening', resolve))
  const ws = new WebSocketServer({ port: 0 })
  await new Promise(resolve => ws.once('listening', resolve))
  const pageRenderer = new PageRenderer(ws.address().port)
  const stateDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mote-state-'))
  const sourcesFile = path.join(stateDir, 'sources.json')
  const recentFiles = new RecentFiles(path.join(stateDir, 'recent-files.json'), notesDir, sourcesFile)
  app.use(express.static(path.resolve('src/server/assets')))
  app.get('/status', (_, res) => res.sendStatus(200))
  app.get('/', async (_, res) => {
    const lists = await recentFiles.list()
    res.type('html').send(await pageRenderer.renderHome(renderHomeLists(lists)))
  })
  app.get('/api/recent-files', async (_, res) => res.json(await recentFiles.list()))
  app.get('/api/search', async (req, res) => res.json(await recentFiles.search(req.query.q || '')))
  app.get('/p/:file', async (req, res) => {
    const file = decodeURIComponent(req.params.file)
    if (!fs.existsSync(file)) return res.sendStatus(404)
    const note = mdRenderer.render(file)
    await recentFiles.recordViewed(file, note.title)
    res.send(await pageRenderer.render(file, note))
  })
  app.get('/:name', async (req, res) => {
    const file = path.join(notesDir, `${req.params.name}.md`)
    if (!fs.existsSync(file)) return res.sendStatus(404)
    const note = mdRenderer.render(file)
    await recentFiles.recordViewed(file, note.title)
    res.send(await pageRenderer.render(file, note))
  })
  attachLiveUpdates(ws, pagePath => pagePath.startsWith('/p/')
    ? decodeURIComponent(pagePath.substring(3))
    : path.join(notesDir, `${decodeURIComponent(pagePath.substring(1))}.md`))
  return {
    url: `http://127.0.0.1:${site.address().port}`,
    addSource: directory => addSource(directory, { file: sourcesFile, notesDir }),
    close: async () => {
      await new Promise(resolve => ws.close(resolve))
      await new Promise(resolve => site.close(resolve))
      await fs.promises.rm(stateDir, { recursive: true, force: true })
    }
  }
}
