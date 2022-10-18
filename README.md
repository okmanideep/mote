# Mote
Markdown Server for my notes

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
* `mote start`

If you have `filename.md` in your notes directory, then open `http://localhost:<site_port>/filename` to view it in the browser.

💡**Protip**: If you use vim, you can use [this function](https://github.com/okmanideep/dotfiles/blob/baf644712003a0abe42db879a58b3a359f274667/nvim/init.vim#L188) and have your preferred key-binding to open you notes in the browser

## Stopping Mote
* `mote stop`
