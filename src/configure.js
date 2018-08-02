const spawnPromise = require('./spawnPromise');

const configure = ({ WONQA_DIR, ...env } = {}) => spawnPromise('bash', [`${WONQA_DIR}/bin/configure.sh`], env);

module.exports = configure;
