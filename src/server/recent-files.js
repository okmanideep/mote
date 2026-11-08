import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import mdRenderer from './md-renderer.js'

const LIMIT = 10
const RELATIVE_TIME_UNITS = [
  { duration: 365 * 24 * 60 * 60 * 1000, suffix: 'y' },
  { duration: 30 * 24 * 60 * 60 * 1000, suffix: 'mo' },
  { duration: 7 * 24 * 60 * 60 * 1000, suffix: 'w' },
  { duration: 24 * 60 * 60 * 1000, suffix: 'd' },
  { duration: 60 * 60 * 1000, suffix: 'h' },
  { duration: 60 * 1000, suffix: 'm' }
]

export class RecentFiles {
  constructor(stateFile, notesDir) {
    this.stateFile = stateFile
    this.notesDir = path.resolve(notesDir)
    this.writeQueue = Promise.resolve()
  }

  async readViewed() {
    try {
      const state = JSON.parse(await fs.readFile(this.stateFile, 'utf8'))
      return Array.isArray(state.viewed) ? state.viewed.map(item =>
        typeof item === 'string' ? { path: item, title: null } : item
      ).filter(item => item && typeof item.path === 'string') : []
    } catch (error) {
      if (error.code === 'ENOENT') return []
      return []
    }
  }

  async recordViewed(file, title) {
    const absolutePath = path.resolve(file)
    await fs.mkdir(path.dirname(this.stateFile), { recursive: true })
    this.writeQueue = this.writeQueue.then(async () => {
      const viewed = [{ path: absolutePath, title: title || null }, ...(await this.readViewed()).filter(item => item.path !== absolutePath)]
        .slice(0, LIMIT)
      await fs.writeFile(this.stateFile, JSON.stringify({ viewed }, null, 2), 'utf8')
    })
    await this.writeQueue
  }

  async list() {
    const viewedEntries = await this.readViewed()
    const legacyTitles = new Map()
    const viewed = (await Promise.all(viewedEntries.map(async entry => {
      const file = entry.path
      try {
        const stat = await fs.stat(file)
        if (!stat.isFile()) return null
        const title = entry.title || mdRenderer.render(file).title
        if (!entry.title) legacyTitles.set(file, title)
        return { path: displayPath(file), name: path.basename(file), title, url: this.urlFor(file), modified: stat.mtimeMs }
      } catch { return null }
    }))).filter(Boolean)

    if (legacyTitles.size) {
      await fs.mkdir(path.dirname(this.stateFile), { recursive: true })
      this.writeQueue = this.writeQueue.then(async () => {
        const latest = await this.readViewed()
        const viewed = latest.map(entry => ({
          ...entry,
          title: entry.title || legacyTitles.get(entry.path) || null
        }))
        await fs.writeFile(this.stateFile, JSON.stringify({ viewed }, null, 2), 'utf8')
      })
      await this.writeQueue
    }

    const modified = []
    const visit = async directory => {
      let entries
      try { entries = await fs.readdir(directory, { withFileTypes: true }) } catch { return }
      for (const entry of entries) {
        const file = path.join(directory, entry.name)
        if (entry.isDirectory()) await visit(file)
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          try {
            const stat = await fs.stat(file)
            modified.push({ path: displayPath(file), name: path.relative(this.notesDir, file), url: this.urlFor(file), modified: stat.mtimeMs, modifiedLabel: formatAgo(stat.mtimeMs) })
          } catch { /* the file may have disappeared while scanning */ }
        }
      }
    }
    await visit(this.notesDir)
    modified.sort((a, b) => b.modified - a.modified)
    return { viewed: viewed.slice(0, LIMIT), modified: modified.slice(0, LIMIT) }
  }

  async search(query = '') {
    const normalized = String(query).trim().toLocaleLowerCase()
    const { viewed } = await this.list()
    if (!normalized) {
      const entries = await this.readViewed()
      return Promise.all(viewed.map(async file => {
        const entry = entries.find(item => displayPath(item.path) === file.path)
        const preview = entry ? await previewFor(entry.path) : { text: '', matches: [] }
        return { ...file, preview: preview.text, matches: preview.matches }
      }))
    }

    const files = []
    const visit = async directory => {
      let entries
      try { entries = await fs.readdir(directory, { withFileTypes: true }) } catch { return }
      for (const entry of entries) {
        if (entry.name === '.git') continue
        const file = path.join(directory, entry.name)
        if (entry.isDirectory()) await visit(file)
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) files.push(file)
      }
    }
    await visit(this.notesDir)

    const results = []
    for (const file of files) {
      try {
        const text = (await fs.readFile(file, 'utf8')).replace(/^\uFEFF?---[\t ]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[\t ]*(?:\r?\n|$)/, '')
        const name = path.relative(this.notesDir, file).replace(/\\/g, '/')
        const match = findBestMatch(`${name}\n${text}`, normalized)
        if (!match) continue
        const lines = text.split(/\r?\n/)
        const lineIndex = Math.max(0, lines.findIndex(line => line.toLocaleLowerCase().includes(normalized)))
        const preview = excerpt(lines, lineIndex, normalized)
        results.push({ path: displayPath(file), name, title: mdRenderer.render(file).title, url: this.urlFor(file), preview: preview.text, matches: preview.matches, score: match + (name.toLocaleLowerCase().includes(normalized) ? 1000 : 0) })
      } catch { /* skip files that disappear or cannot be read */ }
    }
    return results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 30).map(({ score, ...result }) => result)
  }

  urlFor(file) {
    const absolute = path.resolve(file)
    const relative = path.relative(this.notesDir, absolute)
    if (relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)) {
      return `/${encodeURIComponent(relative.replace(/\\/g, '/').replace(/\.md$/i, ''))}`
    }
    return `/p/${encodeURIComponent(absolute)}`
  }
}

async function previewFor(file) {
  try {
    const text = (await fs.readFile(file, 'utf8')).replace(/^\uFEFF?---[\t ]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[\t ]*(?:\r?\n|$)/, '')
    return excerpt(text.split(/\r?\n/), 0, '')
  } catch { return { text: '', matches: [] } }
}

function excerpt(lines, lineIndex, query) {
  let first = Math.max(0, lineIndex - 1)
  while (first < lines.length && !lines[first].trim()) first++
  const selected = lines.slice(first, Math.min(lines.length, first + 3))
  const text = selected.join('\n').trim()
  const at = query ? text.toLocaleLowerCase().indexOf(query) : -1
  return { text: text.slice(0, 500), matches: at >= 0 ? [{ start: at, end: at + query.length }] : [] }
}

function findBestMatch(text, query) {
  const candidate = text.toLocaleLowerCase()
  if (candidate.includes(query)) return 100 + query.length
  let score = 0
  let cursor = 0
  let previous = -2
  for (const character of query) {
    const index = candidate.indexOf(character, cursor)
    if (index === -1) return null
    score += (previous === index - 1 ? 10 : 1) - Math.min(index - cursor, 20) / 20
    previous = index
    cursor = index + 1
  }
  return score
}

function displayPath(file) {
  const absolute = path.resolve(file)
  const home = path.resolve(os.homedir())
  const relative = path.relative(home, absolute)
  if (relative === '') return '~'
  if (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
    return `~/${relative.split(path.sep).join('/')}`
  }
  return absolute
}

export function renderHomeLists({ viewed, modified }) {
  return {
    viewedHtml: listHtml(viewed, 'viewed'),
    modifiedHtml: listHtml(modified, 'modified')
  }
}

function listHtml(files, kind) {
  return `<ul data-recent-list="${kind}">${files.map(file => listItem(file, kind)).join('')}</ul>`
}

function listItem(file, kind) {
  const detail = kind === 'modified' ? modifiedTime(file.modified) : escapeHtml(file.path)
  return `<li><a href="${escapeHtml(file.url)}"><span>${escapeHtml(file.title || file.name)}</span><small>${detail}</small></a></li>`
}

function modifiedTime(timestamp) {
  return escapeHtml(formatAgo(timestamp))
}

function formatAgo(timestamp) {
  const elapsed = Math.max(0, Date.now() - timestamp)
  const unit = RELATIVE_TIME_UNITS.find(candidate => elapsed >= candidate.duration)
  return unit ? `${Math.floor(elapsed / unit.duration)}${unit.suffix} ago` : 'just now'
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}
