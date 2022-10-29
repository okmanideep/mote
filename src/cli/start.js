import Server from '../server/server.js'
import { fork } from 'node:child_process'
import envPaths from 'env-paths'
import fs from 'node:fs'
import path from 'node:path'
import * as url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const timeout = ms => new Promise(res => setTimeout(res, ms))

async function start() {
  const isAlreadyRunning = await Server.isRunning()

  if (!isAlreadyRunning) {
    await spawnServer()
  } else {
    console.log('Mote is already running ...')
  }
}

async function spawnServer() {
  const {out, err} = await getLogStreams()
  const serverPath = moteServerPath()
  const moteServer = fork(serverPath, ['mote-server'], { 
    detached: true,
    stdio: ['ignore', out, err, 'ipc']
  })

  moteServer.channel.unref()
  moteServer.unref()

  let isRunning = await Server.isRunning()
  let waitTime = 0
  while (!isRunning && waitTime < 1000) {
    await timeout(100)
    waitTime += 100

    isRunning = await Server.isRunning()
  }

  if (!isRunning) {
    console.error('❌ Could not start mote server')
    console.error({serverPath})
  } else {
    console.log('Mote Started 🟢')
  }
}

async function getLogStreams() {
  const paths = envPaths('mote', { suffix: '' })
  await fs.promises.mkdir(paths.log, { recursive: true })

  const outPath = path.join(paths.log, './out.log')
  const errPath = path.join(paths.log, './err.log')

  const out = fs.openSync(outPath, 'a')
  const err = fs.openSync(errPath, 'a')

  return { out, err}
}

function moteServerPath() {
  return path.resolve(__dirname, '..', 'server', 'index.js')
}

export default start
