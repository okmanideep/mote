import express from 'express'
import { WebSocketServer } from 'ws'
import path from 'path'
import fs from 'fs'
import conf from './conf.js'
import mdRenderer from './md-renderer.js'
import PageRenderer from './page-renderer-webc.js'
import CryptoJS from 'crypto-js'

async function start() {
	const config = await conf.get()
	const SITE_PORT = config['site_port']
	const MOTES_DIR = config['motes_dir']
	const WEBSOCKET_PORT = config['websocket_port']
	const pageRenderer = new PageRenderer(WEBSOCKET_PORT)

	const mdFilePath = (filename) => {
		return path.join(MOTES_DIR, `${filename}.md`)
	}

	const app = express()

	app.get('/status', async function(_, res) {
		res.sendStatus(200)
	})

	app.get('/favicon.ico', async function(_, res) {
		res.sendStatus(404)
	})

	app.get('/p/:path', async function(req, res) {
		const filePath = req.params['path']
		if (!fs.existsSync(filePath)) {
			res.status(404).send(`<h1>${filePath} not found</h1>`)
		} else {
			res.send(await pageRenderer.render(filePath))
		}
	})

	app.get('/:name', async function(req, res) {
		const name = req.params['name']
		const file = mdFilePath(name)

		if (!fs.existsSync(file)) {
			console.log(`Could not find ${file}`)
			res.sendStatus(404)
		} else {
			res.send(await pageRenderer.render(file))
		}
	})

	app.listen(SITE_PORT, () => {
		console.log(`http://localhost:${SITE_PORT}/current`)
	})

	const wss = new WebSocketServer({ port: WEBSOCKET_PORT })
	wss.on('connection', (ws, req) => {
		let file

		if (req.url.startsWith('/p/')) {
			file = decodeURIComponent(req.url.substring(3))
		} else {
			const filename = req.url.substring(1)
			file = mdFilePath(filename)
		}

		if (!fs.existsSync(file)) {
			ws.send(JSON.stringify({ type: 'error', data: { message: `Couldn't find ${file}` } }))
			return
		}

		let prevContentHash = ''
		fs.watchFile(file, { persistent: true, interval: 300 }, async () => {
			const contents = mdRenderer.render(file)
			const newContentHash = CryptoJS.MD5(contents).toString()
			if (newContentHash !== prevContentHash) {
				ws.send(JSON.stringify({ type: 'update', data: { contents } }))
				prevContentHash = newContentHash
			}
		})

		ws.onclose = () => {
			fs.unwatchFile(file)
		}

		ws.onmessage = (msg) => {
			const payload = JSON.parse(msg.data)

			if (payload.type === 'theme-changed') {
				const contents = mdRenderer.render(file) 
				ws.send(JSON.stringify({ type: 'update', data: { contents } }))
			}
		}
	})

}

export default { start }
