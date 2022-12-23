document.addEventListener("DOMContentLoaded", function() {
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
    } else if (payload.type === 'error') {
      console.error(payload.data.message)
    }
  }

  /*
  * Refetching markdown content to re-render mermaid diagrams in the new theme
  * Hacky, but works 🤷
  */
  function onThemeChange() {
    ws.send(JSON.stringify({type: 'theme-changed'}))
  }

  let body = document.querySelector("body") 
  let themeChangeObserver = new MutationObserver(onThemeChange)

  themeChangeObserver.observe(body, {
    attributeFilter: ['data-theme']
  })
})
