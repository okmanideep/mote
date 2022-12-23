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
  'light': {}
}

function _initialize(startOnLoad = true) {
  let body = document.querySelector('body')

  let theme = body.getAttribute('data-theme')
  if (!theme) {
    theme = 'dark'
  }

  console.log(`Initializing mermaid with ${theme} theme`)
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

function initializeDiagrams() {
  _initialize()

  let content = document.querySelector('.content')

  let contentChangeObserver = new MutationObserver(_onContentChange)
  contentChangeObserver.observe(content, {
    childList: true
  })
}

document.addEventListener("DOMContentLoaded", function() {
  initializeDiagrams()
});

