import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  addSource,
  displayPath,
  listSources,
  readSourcePaths,
  removeSource,
  resolveSourcePath,
  samePath,
  sourceDirectories,
  writeSourcePaths
} from '../../src/server/sources.js'

async function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'mote-sources-'))
}

test('resolves ~ and relative source paths', () => {
  assert.equal(resolveSourcePath('~/Documents/reports'), path.join(os.homedir(), 'Documents/reports'))
  assert.equal(resolveSourcePath('reports', '/tmp/notes'), path.resolve('/tmp/notes/reports'))
  assert.equal(resolveSourcePath('~other/reports', '/tmp'), path.resolve('/tmp/~other/reports'))
})

test('reads sources from the state file and tolerates missing or malformed state', async () => {
  const dir = await tempDir()
  try {
    const file = path.join(dir, 'sources.json')
    assert.deepEqual(await readSourcePaths(file), [])

    await fs.writeFile(file, 'not json')
    assert.deepEqual(await readSourcePaths(file), [])

    await fs.writeFile(file, JSON.stringify({ sources: ['/tmp/a', '/tmp/a/', ' ', 42] }))
    assert.deepEqual(await readSourcePaths(file), ['/tmp/a'])
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test('adds, dedupes, and removes non-default sources', async () => {
  const dir = await tempDir()
  try {
    const file = path.join(dir, 'state', 'sources.json')
    const notesDir = path.join(dir, 'notes')
    const reports = path.join(dir, 'reports')

    assert.deepEqual(await addSource(reports, { file, notesDir }), { path: reports, added: true, notesDir: false })
    assert.deepEqual(await addSource(reports, { file, notesDir }), { path: reports, added: false, notesDir: false })
    assert.deepEqual(await addSource(`${reports}${path.sep}.`, { file, notesDir }), { path: reports, added: false, notesDir: false })
    assert.deepEqual(await addSource(notesDir, { file, notesDir }), { path: notesDir, added: false, notesDir: true })
    assert.deepEqual(await readSourcePaths(file), [reports])

    assert.deepEqual(await removeSource(notesDir, { file, notesDir }), { path: notesDir, removed: false, notesDir: true })
    assert.deepEqual(await removeSource(path.join(dir, 'missing'), { file, notesDir }), { path: path.join(dir, 'missing'), removed: false, notesDir: false })
    assert.deepEqual(await removeSource(reports, { file, notesDir }), { path: reports, removed: true, notesDir: false })
    assert.deepEqual(await readSourcePaths(file), [])
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test('the notes directory is always the first source and duplicates collapse', () => {
  assert.deepEqual(sourceDirectories('/tmp/notes', ['/tmp/reports', '/tmp/notes/', '/tmp/notes']), ['/tmp/notes', '/tmp/reports'])
  assert.deepEqual(sourceDirectories('/tmp/notes', []), ['/tmp/notes'])
  assert.deepEqual(sourceDirectories(null, ['/tmp/reports']), ['/tmp/reports'])
})

test('lists configured sources with the notes directory first', async () => {
  const dir = await tempDir()
  try {
    const file = path.join(dir, 'sources.json')
    await writeSourcePaths([path.join(dir, 'reports')], file)
    assert.deepEqual(await listSources(path.join(dir, 'notes'), file), [path.join(dir, 'notes'), path.join(dir, 'reports')])
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test('samePath and displayPath normalize paths', () => {
  assert.equal(samePath('/tmp/a/', '/tmp/a'), true)
  assert.equal(samePath('/tmp/a', '/tmp/b'), false)
  assert.equal(samePath(null, '/tmp/b'), false)
  assert.equal(displayPath(os.homedir()), '~')
  assert.equal(displayPath(path.join(os.homedir(), 'Documents', 'reports')), '~/Documents/reports')
})
