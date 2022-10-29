import conf from '../server/conf.js'
import { fork } from 'node:child_process'
import envPaths from 'env-paths'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import * as url from 'url'
import prompt from 'prompt'
import fetch from 'node-fetch'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const timeout = ms => new Promise(res => setTimeout(res, ms))

async function start() {
  const configExists = await conf.exists()

  if (!configExists) {
    await _setupConfig()
  }

  const config = await conf.get()
  const isAlreadyRunning = await _isRunning(config)

  if (!isAlreadyRunning) {
    await _spawnServer(config)
  } else {
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

async function _setupConfig() {
  prompt.start()
  const { sitePort, websocketPort, motesDir } = await prompt.get({
    properties: {
      sitePort: {
        description: 'Website Port',
        required: true,
        default: 3000,
        type: 'number',
        conform: (value) => {
          return value > 1023
        }
      },
      websocketPort: {
        description: 'Browser <-> Mote communication port for live changes',
        default: 8383,
        type: 'number',
        conform: (value) => {
          return value > 1023
        }
      },
      motesDir: {
        description: 'Your markdown notes directory',
        type: 'string',
        required: true,
        before: (value) => {
          return value.replace('~', os.homedir())
        }
      }
    }
  })

  await conf.write({ sitePort, websocketPort, motesDir })
}

async function _spawnServer(config) {
  const {out, err} = await _getLogStreams()
  const serverPath = _moteServerPath()
  const moteServer = fork(serverPath, ['mote-server'], { 
    detached: true,
    stdio: ['ignore', out, err, 'ipc']
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
