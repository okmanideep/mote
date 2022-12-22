# Mote
Markdown Server for notes and other md files

## Configuration
```json
{
  "site_port": 3000,
  "websocket_port": 8383,
  "motes_dir": "/Users/okmanideep/Dropbox/notes"
}
```
Windows: `~/AppData/Local/mote/config.json`
Linux: `~/.config/mote/config.json`
MacOs: `~/Library/Preferences/mote/config.json`

## Installation
* Add configuration file as described above
* `git clone git@github.com:okmanideep/mote`
* `cd mote`
* `npm i` (install all dependencies)
* `npm i -g`

## Starting Mote
`mote start`

## Opening a file
`mote open path/to/file.md`

💡**Protip**: 
If you use vim, you can use the following vim script and have your preferred key-binding to open you notes or any markdown file in the browser
```vim
function s:OpenMote()
    let l:command = 'mote open '.expand('%:t')
    call system(l:command)
endfunction

command! OpenMote :call <SID>OpenMote()
" map to your preferred key combo
nnoremap gn <cmd>OpenMote<CR>
```

## Stopping Mote
* `mote stop`

## URL Schema
Files in `motes_dir` -> `http://localhost:${site_port}/filename`
Other files -> `http://localhost:${site_port}/p/full%2Fpath%2Fto%2Ffile.md`
