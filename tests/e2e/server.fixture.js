import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { WebSocketServer } from 'ws'
import PageRenderer from '../../src/server/page-renderer-webc.js'

export async function startFixture(notesDir) {
  const app = express()
  const site = app.listen(0)
  await new Promise(resolve => site.once('listening', resolve))
  const ws = new WebSocketServer({ port: 0 })
  await new Promise(resolve => ws.once('listening', resolve))
  const pageRenderer = new PageRenderer(ws.address().port)
  app.get('/status', (_, res) => res.sendStatus(200))
  app.get('/:name', async (req, res) => {
    const file = path.join(notesDir, `${req.params.name}.md`)
    if (!fs.existsSync(file)) return res.sendStatus(404)
    res.send(await pageRenderer.render(file))
  })
  return {
    url: `http://127.0.0.1:${site.address().port}`,
    close: async () => {
      await new Promise(resolve => ws.close(resolve))
      await new Promise(resolve => site.close(resolve))
    }
  }
}
