import conf from '../server/conf.js'

async function config() {
  await conf.setup();
}

export default config;
