import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fuzzyMatch, matchContent, matchFilename, normalize } from '../../src/server/fuzzy.js'

const ranges = match => match.matches.map(({ start, end }) => [start, end])
const highlighted = (name, match) => match.matches.map(({ start, end }) => name.slice(start, end)).join('|')

test('treats filename separators as spaces for term queries', () => {
  const match = matchFilename('apple-hsi-app-sunset.md', 'apple hsi')
  assert.ok(match)
  assert.deepEqual(ranges(match), [[0, 5], [6, 9]])
  assert.equal(highlighted('apple-hsi-app-sunset.md', match), 'apple|hsi')
  assert.equal(matchFilename('apple-hsi-app-sunset.md', ''), null)
})

test('scores basename hits above directory-name hits', () => {
  const basenameExact = matchFilename('reports/quarterly.md', 'quarterly')
  const basenamePrefix = matchFilename('reports/quarterly-summary.md', 'quarterly')
  const directory = matchFilename('quarterly-notes/summary.md', 'quarterly')
  assert.equal(matchFilename('quarterly.md', 'quarterly').score, basenameExact.score)
  assert.ok(basenameExact.score > basenamePrefix.score)
  assert.ok(basenamePrefix.score > directory.score)
})

test('fuzzy matches word-boundary acronyms in filenames', () => {
  const match = matchFilename('jiostar-hsi-app-sunset.md', 'jhs')
  assert.ok(match)
  assert.equal(highlighted('jiostar-hsi-app-sunset.md', match), 'j|h|s')
  assert.ok(matchFilename('midroll-arch.md', 'mdrl'))
})

test('ignores scattered fuzzy hits that are not a compact filename match', () => {
  assert.equal(matchFilename('the-value-of-values.md', 'tvod'), null)
  assert.equal(matchFilename('interview-mohd-ali.md', 'tvod'), null)
  assert.equal(matchFilename('praja-video-frames-protocol-variations.md', 'tvod'), null)
  assert.ok(matchFilename('tvod-entitlement-error-client-ui.md', 'tvod'))
})

test('fuzzyMatch prefers consecutive characters and boundary starts', () => {
  const boundary = fuzzyMatch('midroll-arch.md', 'midroll')
  const midWord = fuzzyMatch('xmidrolly-arch.md', 'midroll')
  const gapped = fuzzyMatch('midarollx.md', 'midroll')
  assert.ok(boundary.score > midWord.score)
  assert.ok(boundary.score > gapped.score)
  assert.equal(fuzzyMatch('abc.md', 'zyx'), null)
  assert.equal(fuzzyMatch('ab.md', 'abc'), null)
})

test('filename matches always outrank content matches', () => {
  const nameMatch = matchFilename('revenue.md', 'revenue')
  const bodyMatch = matchContent('A long note about our revenue for the quarter.', 'revenue')
  assert.ok(nameMatch.score > bodyMatch.score)
  const fuzzyName = matchFilename('praja-revenue-division.md', 'revdiv')
  assert.ok(fuzzyName.score > bodyMatch.score)
})

test('content matching prefers literal substrings and reports their position', () => {
  const literal = matchContent('# Refunds\n\nRefund policy details.', 'refund')
  const fuzzy = matchContent('# Notes\n\nThe refund flow has a defect.', 'rfnd')
  assert.equal(literal.index, 2)
  assert.ok(literal.score > fuzzy.score)
  assert.equal(matchContent('nothing here', 'zzz'), null)
})

test('normalize maps matches back to the original filename', () => {
  const { text, original } = normalize('poc-reports/component-verify-otp-widget.md')
  assert.equal(text, 'poc reports component verify otp widget md')
  assert.equal(original[text.indexOf('component')], 'poc-reports/component-verify-otp-widget.md'.indexOf('component'))
  assert.equal(original[text.indexOf(' ')], -1)
})
