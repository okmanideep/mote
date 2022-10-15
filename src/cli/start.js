import Server from '../server/server.js'
import { fork } from 'node:child_process'
import envPaths from 'env-paths'
import fs from 'node:fs'
import path from 'node:path'

async function start() {
  const isAlreadyRunning = await Server.isRunning()

  if (!isAlreadyRunning) {
    await spawnServer()
    console.log('Mote Started 🟢')
  } else {
    console.log('Mote is already running ...')
  }
}

async function spawnServer() {
  const {out, err} = await getLogStreams()
  const moteServer = fork('./src/server/index.js', ['mote-server'], { 
    detached: true,
    stdio: ['ignore', out, err, 'ipc' ]
  })

  moteServer.channel.unref()
  moteServer.unref()
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


export default start
