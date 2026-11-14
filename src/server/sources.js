/**
* Source directories are the folders Mote lists, searches, and watches.
*
* The notes directory from the config is always a source. Directories added
* with `mote source <dir>` are stored in the app's data directory, next to
* recent-files.json, so the config file stays untouched:
*
* {
*   "sources": ["/Users/me/Documents/reports"]
* }
*
* Windows: ~/AppData/Local/mote/sources.json
* Linux: ~/.local/share/mote/sources.json
* MacOs: ~/Library/Application Support/mote/sources.json
*/

import envPaths from 'env-paths'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

export function sourcesFilePath() {
  return path.join(envPaths('mote', { suffix: '' }).data, 'sources.json')
}

export function resolveSourcePath(source, cwd = process.cwd()) {
  const expanded = String(source).trim().replace(/^~(?=$|[\\/])/, os.homedir())
  return path.resolve(cwd, expanded)
}

export function samePath(a, b) {
  if (!a || !b) return false
  return pathKey(a) === pathKey(b)
}

export function displayPath(file) {
  const absolute = path.resolve(file)
  const home = path.resolve(os.homedir())
  const relative = path.relative(home, absolute)
  if (relative === '') return '~'
  if (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
    return `~/${relative.split(path.sep).join('/')}`
  }
  return absolute
}

function pathKey(source) {
  const resolved = path.resolve(source)
  // Most macOS and Windows file systems are case-insensitive
  return process.platform === 'linux' ? resolved : resolved.toLowerCase()
}

function uniquePaths(sources) {
  const seen = new Set()
  return sources.filter(source => {
    const key = pathKey(source)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function readSourcePaths(file = sourcesFilePath()) {
  try {
    const state = JSON.parse(await fs.readFile(file, 'utf8'))
    const sources = Array.isArray(state?.sources) ? state.sources : []
    return uniquePaths(
      sources
        .filter(source => typeof source === 'string' && source.trim())
        .map(source => resolveSourcePath(source))
    )
  } catch (error) {
    // A missing or malformed state file just means no extra sources
    return []
  }
}

export async function writeSourcePaths(sources, file = sourcesFilePath()) {
  const unique = uniquePaths(sources.map(source => resolveSourcePath(source)))
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify({ sources: unique }, null, 2), 'utf8')
  return unique
}

/**
* The notes directory always comes first so its files keep their clean URLs
* and are preferred when directories overlap.
*/
export function sourceDirectories(notesDir, sources = []) {
  return uniquePaths(
    [notesDir, ...sources]
      .filter(source => typeof source === 'string' && source.trim())
      .map(source => resolveSourcePath(source))
  )
}

export async function listSources(notesDir, file = sourcesFilePath()) {
  return sourceDirectories(notesDir, await readSourcePaths(file))
}

export async function addSource(directory, { file = sourcesFilePath(), notesDir } = {}) {
  const source = resolveSourcePath(directory)
  if (notesDir && samePath(source, notesDir)) {
    return { path: source, added: false, notesDir: true }
  }

  const sources = await readSourcePaths(file)
  if (sources.some(existing => samePath(existing, source))) {
    return { path: source, added: false, notesDir: false }
  }

  await writeSourcePaths([...sources, source], file)
  return { path: source, added: true, notesDir: false }
}

export async function removeSource(directory, { file = sourcesFilePath(), notesDir } = {}) {
  const source = resolveSourcePath(directory)
  if (notesDir && samePath(source, notesDir)) {
    return { path: source, removed: false, notesDir: true }
  }

  const sources = await readSourcePaths(file)
  const remaining = sources.filter(existing => !samePath(existing, source))
  if (remaining.length === sources.length) {
    return { path: source, removed: false, notesDir: false }
  }

  await writeSourcePaths(remaining, file)
  return { path: source, removed: true, notesDir: false }
}
