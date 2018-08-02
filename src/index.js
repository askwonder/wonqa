const path = require('path');
const {
  validateOptions,
  validateLogsOptions,
} = require('./validate');
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
  return {
    create() {
      validateOptions(options);
      return create({ ...options, WONQA_DIR });
    },
    prune() {
      validateOptions(options);
      return prune({ ...options, WONQA_DIR });
    },
    logs(container) {
      validateLogsOptions({ ...options, container });
      return logs({ ...options, container, WONQA_DIR });
    },
  };
}

function initFn(options = {}) {
  return init({ ...options, WONQA_DIR });
}

module.exports = { Wonqa, init: initFn };
