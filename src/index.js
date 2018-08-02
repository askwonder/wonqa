const path = require('path');
const { validateOptions } = require('./validate');
const create = require('./create');
const prune = require('./prune');
const logs = require('./logs');
const init = require('./init');

// used by scripts to run commands from wonqa dir
// we could also give cwd option to spawn()
// but this leads to permission denied errors when running mkdir
// if there's a way to transfer permissions from parent process to
// spawned proces, this might be cleaner
const WONQA_DIR = path.join(__dirname, '..');

function Wonqa(options = {}) {
  validateOptions(options);
  return {
    create() {
      return create({ ...options, WONQA_DIR });
    },
    prune() {
      return prune({ ...options, WONQA_DIR });
    },
    logs(container) {
      return logs({ ...options, WONQA_DIR, container });
    },
  };
}

function initFn(options = {}) {
  return init({ ...options, WONQA_DIR });
}

module.exports = { Wonqa, init: initFn };
