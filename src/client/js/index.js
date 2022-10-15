import mermaid from "mermaid"

mermaid.initialize(
  {
    startOnLoad: true,
    theme: 'dark',
    themeVariables: {
      'fontFamily': '"Jetbrains Mono", monospace',
      'background': '#22262C',
      'mainBkg': '#282C34',
      'primaryBorderColor': '#9AA2B1',
      'actorBorder': '#9AA2B1',
    }
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
