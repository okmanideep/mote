import fs from 'node:fs'
import mdRenderer from './md-renderer.js'

export function attachLiveUpdates(server, resolveFile) {
  server.on('connection', (socket, request) => {
    const file = resolveFile(new URL(request.url, 'http://localhost').pathname)
    if (!fs.existsSync(file)) {
      socket.send(JSON.stringify({ type: 'error', data: { message: `Couldn't find ${file}` } }))
      return
    }

    let previousContent = ''
    const sendUpdate = (force = false) => {
      try {
        const note = mdRenderer.render(file)
        if (force || note.content !== previousContent) {
          socket.send(JSON.stringify({ type: 'update', data: note }))
          previousContent = note.content
        }
      } catch (error) {
        console.error(`Error watching file: ${file}`, error)
      }
    }
    const onChange = () => sendUpdate()
    fs.watchFile(file, { persistent: true, interval: 300 }, onChange)
    socket.on('close', () => fs.unwatchFile(file, onChange))
    socket.on('message', message => {
      if (JSON.parse(message.toString()).type === 'theme-changed') sendUpdate(true)
    })
  })
}
