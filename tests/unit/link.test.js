import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { getLinks, tailscaleLinks } from '../../src/cli/link.js'

const page = '/p/%2Ftmp%2Fa%20%23%25.md'
const route = (proxy) => ({ Handlers: { '/': { Proxy: proxy } } })

test('discovers matching HTTP and HTTPS listeners, including distinct public ports', () => {
  assert.deepEqual(tailscaleLinks({
    TCP: { 3008: { HTTP: true }, 443: { HTTPS: true }, 8080: { HTTP: true } },
    Web: {
      'host.example:3008': route('http://localhost:3008'),
      'host.example:443': route('http://127.0.0.1:3008'),
      'host.example:8080': route('http://[::1]:3008'),
    },
  }, 3008, page), [
    `http://host.example:3008${page}`,
    `https://host.example${page}`,
    `http://host.example:8080${page}`,
  ])
})

test('does not confuse unrelated services or static handlers with Mote', () => {
  const proxies = ['http://localhost:8000', 'http://remote.example:3008',
    'http://localhost:3008/other', 'invalid', 'https://localhost:3008']
  for (const proxy of proxies) {
    assert.deepEqual(tailscaleLinks({ TCP: { 443: { HTTPS: true } },
      Web: { 'host.example:443': route(proxy) } }, 3008, page), [])
  }
  assert.deepEqual(tailscaleLinks(null, 3008, page), [])
  assert.deepEqual(tailscaleLinks({ Web: { 'host.example:443': route('http://localhost:3008') } }, 3008, page), [])
})

test('supports mounted and foreground Serve routes', () => {
  assert.deepEqual(tailscaleLinks({ Foreground: { session: {
    TCP: { 8443: { HTTPS: true } }, Web: { 'host.example:8443': {
      Handlers: { '/notes/': { Proxy: 'http://localhost:3008' } },
    } },
  } } }, 3008, page), [`https://host.example:8443/notes${page}`])
})

test('encodes full file paths and queries status without a shell', async () => {
  const result = await getLinks('a #%.md', 3008, async (command, args, options) => {
    assert.equal(command, 'tailscale')
    assert.deepEqual(args, ['serve', 'status', '--json'])
    assert.ok(options.timeout > 0)
    return { stdout: '{}' }
  })
  assert.equal(result.localhost, `http://localhost:3008/p/${encodeURIComponent(path.resolve('a #%.md'))}`)
  assert.deepEqual(result.tailscale, [])
  assert.equal(result.warning, undefined)
})

test('keeps localhost link when Tailscale is missing, fails or emits malformed JSON', async () => {
  for (const run of [async () => { throw new Error('ENOENT') }, async () => ({ stdout: 'bad json' })]) {
    const result = await getLinks('note.md', 3008, run)
    assert.match(result.localhost, /^http:\/\/localhost:3008\/p\//)
    assert.deepEqual(result.tailscale, [])
    assert.match(result.warning, /Could not read Tailscale/)
  }
})
