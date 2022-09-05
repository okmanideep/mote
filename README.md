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
Linux/MacOS: `~/.config/mote/config.json`

## Usage
* Add configuration file as described above
* `git clone git@github.com:okmanideep/mote`
* `cd mote`
* `npm i`
* `npm start`

If you have `name.md` in your notes directory, then open `http://localhost:<site_port>/current` to view it in the browser.

💡**Protip**: If you use vim, you can use [this function](https://github.com/okmanideep/dotfiles/blob/baf644712003a0abe42db879a58b3a359f274667/nvim/init.vim#L188) and map to your preferred key-binding
