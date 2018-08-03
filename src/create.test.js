const create = require('./create');
const configure = require('./configure');
const {
  getString,
} = require('./utils');
const {
  writeConfFile,
} = require('./nginx');
const ssl = require('./ssl');

jest.mock('./configure');
jest.mock('./nginx');
jest.mock('./ssl');

configure.mockImplementation(() => Promise.resolve({}));
writeConfFile.mockImplementation(() => Promise.resolve({}));
ssl.mockImplementation(() => Promise.resolve({}));

const WONQA_DIR = '/';

describe('create', () => {
  it('calls configure() with the provided awsRegion and WONQA_DIR', async () => {
    const awsRegion = getString();
    await create({ WONQA_DIR, aws: { awsRegion } });
    expect(configure).toBeCalledWith({ WONQA_DIR, awsRegion });
  });

  it('calls writeConfFile() with the provided server definitions', async () => {
    const servers = [{ default: true, port: 3000 }];
    await create({ WONQA_DIR, https: { nginx: { servers } } });
    expect(writeConfFile).toBeCalledWith({ WONQA_DIR, servers });
  });

  it('calls ssl()', async () => {
    const servers = [{ default: true, port: 3000 }];
    const rootDomain = getString();
    const subDomain = getString();
    const email = getString();
    const dnsimpleToken = getString();
    const cachePath = getString();
    await create({
      WONQA_DIR,
      https: {
        nginx: { servers },
        email,
        dnsimpleToken,
        cachePath,
      },
      dns: { rootDomain, subDomain },
    });
    expect(ssl).toBeCalledWith({
      rootDomain,
      subDomain,
      servers,
      email,
      dnsimpleToken,
      cachePath,
      WONQA_DIR,
    });
  });
});
