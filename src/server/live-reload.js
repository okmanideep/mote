import mermaid from 'mermaid'

const THEME_VARIABLES = {
	'dark': {
		'fontFamily': '"Jetbrains Mono", monospace',
		'background': '#22262C',
		'mainBkg': '#282C34',
		'primaryBorderColor': '#9AA2B1',
		'actorBorder': '#9AA2B1',
		'edgeLabelBackground': '#424856'
	},
	'light': {
		'fontFamily': '"Jetbrains Mono", monospace',
	}
}

function _initialize(startOnLoad = true) {
	let body = document.querySelector('body')

	let theme = body.getAttribute('data-theme')
	if (!theme) {
		theme = 'dark'
	}

	console.log(`Initializing mermaid with ${theme} theme`, { startOnLoad} )
	mermaid.initialize(
		{
			startOnLoad,
			theme,
			themeVariables: THEME_VARIABLES[theme]
		}
	)
}

function _onContentChange() {
	// re processes all mermaid code blocks
	_initialize(false)
	mermaid.init('.mermaid')
}

let diagrams = {
	initialize: _initialize,
	onContentChange: _onContentChange
}

document.addEventListener("DOMContentLoaded", function() {
	console.log("DOMContentLoaded")
	diagrams.initialize()

	const path = window.location.pathname
	const ws = new WebSocket(`ws://localhost:{{WEBSOCKET_PORT}}${path}`)
	ws.onopen = () => {
		console.log("Connected")
	}

	ws.onmessage = (msg) => {
		const payload = JSON.parse(msg.data)

		console.log('message', payload.type);
		if (payload.type === 'update') {
			const contentDiv = document.querySelector('.content')

			// record scrollTop to restore after diagrams are processed
			let scrollTop = document.documentElement.scrollTop
			let scrollHeight = document.documentElement.scrollHeight
			const windowHeight = window.innerHeight
			let isAtEnd = false
			if (scrollTop + windowHeight === scrollHeight) {
				isAtEnd = true
			}

			contentDiv.innerHTML = payload.data.contents
			diagrams.onContentChange()

			// restore the scroll position of the document after content changes
			// normally we don't have to do this, but since the mermaid diagrams
			// are processed and swapped(code -> svg) on the browser, there is
			// that occurs after scrolling past one or more diagrams
			if (isAtEnd) {
				// stay at the end of scroll
				// for this we need to wait for the diagrams to be rendered
				setTimeout(() => {
					document.documentElement.scrollTop = document.documentElement.scrollHeight - windowHeight
				})
			} else {
				// stay at the previous scroll top
				document.documentElement.scrollTop = scrollTop
			}
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
