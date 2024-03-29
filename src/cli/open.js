import conf from '../server/conf.js'
import path from 'node:path'
import open from 'open'
import start from './start.js'

async function openFile(relativePath) {
  const config = await conf.get()

  await start({disableLogging: true})

  const fullPath = path.resolve(relativePath)

  let webPagePath
  if (isRunningInMotesDir(config)) {
    webPagePath = `/${path.parse(fullPath).name}`
  } else {
    webPagePath = `/p/${encodeURIComponent(fullPath)}`
  }

  await open(`http://localhost:${config['site_port']}${webPagePath}`)
}

function isRunningInMotesDir(config) {
  return path.relative(process.cwd(), config['motes_dir']) === ''
}

export default openFile
