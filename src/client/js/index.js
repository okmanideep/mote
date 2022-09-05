import mermaid from "mermaid"

mermaid.initialize(
  {
    startOnLoad: true,
    theme: 'dark',
  }
)

const path = window.location.pathname
const ws = new WebSocket(`ws://localhost:{{WEBSOCKET_PORT}}${path}`)
ws.onopen = () => {
  console.log("Connected")
}

ws.onmessage = (msg) => {
  const payload = JSON.parse(msg.data)

  if (payload.type === 'update') {
    const contentDiv = document.querySelector('.content')
    contentDiv.innerHTML = payload.data.contents
    mermaid.init('.mermaid')
  }
}
