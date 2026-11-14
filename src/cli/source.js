import fs from 'node:fs/promises'
import conf from '../server/conf.js'
import {
  addSource,
  displayPath,
  listSources,
  removeSource,
  resolveSourcePath,
  samePath
} from '../server/sources.js'

async function notesDir() {
  try {
    return (await conf.get())['motes_dir'] || null
  } catch {
    // `mote source` should still work before the config exists
    return null
  }
}

async function printSources(dir) {
  const sources = await listSources(dir)
  if (!sources.length) {
    console.log('No source directories configured yet. Run `mote config` to set a notes directory.')
    return
  }

  for (const source of sources) {
    const suffix = dir && samePath(source, dir) ? ' (notes directory)' : ''
    console.log(`${displayPath(source)}${suffix}`)
  }
}

async function add(directory, dir) {
  const source = resolveSourcePath(directory)
  let stat
  try {
    stat = await fs.stat(source)
  } catch {
    throw new Error(`${displayPath(source)} does not exist`)
  }
  if (!stat.isDirectory()) {
    throw new Error(`${displayPath(source)} is not a directory`)
  }

  const result = await addSource(source, { notesDir: dir })
  if (result.notesDir) {
    console.log(`${displayPath(source)} is already a source: it is the notes directory in the config.`)
  } else if (result.added) {
    console.log(`Added ${displayPath(source)} to Mote sources.`)
  } else {
    console.log(`${displayPath(source)} is already a Mote source.`)
  }
}

async function remove(directory, dir) {
  const result = await removeSource(directory, { notesDir: dir })
  if (result.notesDir) {
    console.log(`${displayPath(result.path)} is the notes directory in the config; run \`mote config\` to change it.`)
  } else if (result.removed) {
    console.log(`Removed ${displayPath(result.path)} from Mote sources.`)
  } else {
    console.log(`${displayPath(result.path)} is not a Mote source.`)
  }
}

async function source(directory, options = {}) {
  const dir = await notesDir()
  try {
    if (options.list) {
      await printSources(dir)
    } else if (!directory) {
      throw new Error('Pass a directory to add, or use --list to see the current sources.')
    } else if (options.remove) {
      await remove(directory, dir)
    } else {
      await add(directory, dir)
    }
  } catch (error) {
    console.error(`Could not update Mote sources: ${error.message}`)
    process.exitCode = 1
  }
}

export default source
