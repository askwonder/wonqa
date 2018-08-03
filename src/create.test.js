const create = require('./create');
const {
  getString,
} = require('./utils');

describe('create', () => {
  it('calls configure.sh with the provided awsRegion and WONQA_DIR', () => {
    const awsRegion = getString();
    create({ aws: { awsRegion } });
  });
});
