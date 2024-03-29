import conf from '../server/conf.js'
import { fork } from 'node:child_process'
import envPaths from 'env-paths'
import fs from 'node:fs'
import path from 'node:path'
import * as url from 'url'
import fetch from 'node-fetch'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const timeout = ms => new Promise(res => setTimeout(res, ms))

function serverCwd() {
  return path.resolve(__dirname, '..', '..')
}

async function start({ disableLogging = false } = {}) {
  const configExists = await conf.exists()

  if (!configExists) {
    await conf.setup()
  }

  const config = await conf.get()
  const isAlreadyRunning = await _isRunning(config)

  if (!isAlreadyRunning) {
    await _spawnServer(config)
  } else if (!disableLogging) {
    console.log('Mote is already running ...')
  }
}

async function _isRunning(config) {
  const SITE_PORT = config['site_port']
  try {
    const response = await fetch(`http://localhost:${SITE_PORT}/status`)
    return response.ok
  } catch(e) {
    return false
  }
}

async function _spawnServer(config) {
  const {out, err} = await _getLogStreams()
  const serverPath = _moteServerPath()
  const moteServer = fork(serverPath, ['mote-server'], { 
    detached: true,
    stdio: ['ignore', out, err, 'ipc'],
    cwd: serverCwd()
  })

  moteServer.channel.unref()
  moteServer.unref()

  let isRunning = await _isRunning(config)
  let waitTime = 0
  while (!isRunning && waitTime < 1000) {
    await timeout(100)
    waitTime += 100

    isRunning = await _isRunning(config)
  }

  if (!isRunning) {
    console.error('❌ Could not start mote server')
    console.error({serverPath})
  } else {
    console.log('Mote Started 🟢')
  }
}

async function _getLogStreams() {
  const paths = envPaths('mote', { suffix: '' })
  await fs.promises.mkdir(paths.log, { recursive: true })

  const outPath = path.join(paths.log, './out.log')
  const errPath = path.join(paths.log, './err.log')

  const out = fs.openSync(outPath, 'a')
  const err = fs.openSync(errPath, 'a')

  return { out, err}
}

function _moteServerPath() {
  return path.resolve(__dirname, '..', 'server', 'index.js')
}

export default start
