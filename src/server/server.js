import express from 'express'
import esbuild from 'esbuild'
import { WebSocketServer } from 'ws'
import path from 'path'
import fs from 'fs'
import { Liquid } from 'liquidjs'
import cssmin from 'cssmin'
import conf from './conf.js'
import mdRenderer from './md-renderer.js'
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

async function start() {
  const config = await conf.get()
  const SITE_PORT = config['site_port']
  const MOTES_DIR = config['motes_dir']
  const WEBSOCKET_PORT = config['websocket_port']

  const mdFilePath = (filename) => {
    return path.join(MOTES_DIR, `${filename}.md`)
  }

  const app = express()

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

  app.get('/status', async function(_, res) {
      res.sendStatus(200)
  })

  app.get('/:name', async function(req, res) {
    const name = req.params['name']
    const file = mdFilePath(name)

    if (!fs.existsSync(file)) {
      console.log(`Could not find ${file}`)
      res.sendStatus(404)
    } else {
      const content = mdRenderer.render(file)
      res.send(await engine.render(template, { content, js }))
    }
  })

  app.listen(SITE_PORT, () => {
    console.log(`http://localhost:${SITE_PORT}/current`)
  })

  const wss = new WebSocketServer({ port: WEBSOCKET_PORT })
  wss.on('connection', (ws, req) => {
    const filename = req.url.substring(1)
    const file = mdFilePath(filename)
    if (!fs.existsSync(file)) {
      ws.send(JSON.stringify({ type: 'error', data: { message: `Couldn't find ${file}` } }))
      return
    }

    fs.watchFile(file, { persistent: true, interval: 300 }, async () => {
      console.log("file updated")
      const contents = await mdRenderer.render(file)
      ws.send(JSON.stringify({ type: 'update', data: { contents } }))
    })

    ws.onclose = () => {
      fs.unwatchFile(file)
    }
  })

}

function liquidRootPaths() {
  return [
    path.resolve(__dirname, '..', 'client'),
    path.resolve(__dirname, '..', 'client', 'css'),
  ]
}

function clientJsPaths() {
  return [
    path.resolve(__dirname, '..', 'client', 'js', 'index.js')
  ]
}

function nodeModulesPaths() {
  return [
    path.resolve(__dirname, '..', '..', 'node_modules')
  ]
}

export default { start }
