const path = window.location.pathname
const ws = new WebSocket(`ws://localhost:8080${path}`)
ws.onopen = () => {
  console.log("Connected")
}

ws.onmessage = (msg) => {
  const payload = JSON.parse(msg.data)

  if (payload.type === 'update') {
    const contentDiv = document.querySelector('.content')
    contentDiv.innerHTML = payload.data.contents
  }
}
