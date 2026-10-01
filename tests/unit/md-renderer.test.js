import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import mdRenderer from '../../src/server/md-renderer.js'

function render(markdown) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mote-test-'))
  const file = path.join(dir, 'note.md')
  fs.writeFileSync(file, markdown)
  try { return mdRenderer.render(file) } finally { fs.rmSync(dir, { recursive: true }) }
}

test('renders heading as title and markdown content', () => {
  const result = render('# Hello\n\nA paragraph.')
  assert.equal(result.title, 'Hello')
  assert.match(result.content, /<h1.*>Hello<\/h1>/)
  assert.match(result.content, /<p>A paragraph\.<\/p>/)
})

test('strips valid front matter and BOM', () => {
  const result = render('\uFEFF---\ntitle: Hidden\n...\n# Visible')
  assert.equal(result.title, 'Visible')
  assert.doesNotMatch(result.content, /title: Hidden/)
})

test('keeps horizontal rules in normal markdown and defaults title', () => {
  const result = render('Text\n\n---\n\nMore text')
  assert.equal(result.title, 'Notes')
  assert.match(result.content, /<hr>/)
})

test('renders mermaid blocks and safely escapes unknown code', () => {
  const result = render('```mermaid\ngraph TD; A-->B\n```\n\n```unknown\n<x>\n```')
  assert.match(result.content, /class="mermaid"/)
  assert.match(result.content, /&lt;x&gt;/)
})
