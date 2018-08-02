const fs = require('fs');
const spawnPromise = require('./spawnPromise');
const ssl = require('./ssl');
const {
  getString,
} = require('./utils');

jest.mock('fs');

jest.mock('./spawnPromise', () => jest.fn());

describe('ssl', () => {
  const dnsimpleToken = getString();
  const rootDomain = getString();
  const subDomain = getString();
  const cachePath = getString();
  const email = getString();

  test('writes dnsimple.ini file with dns_simple_token credential', async () => {
    const servers = [
      {
        default: true,
        port: 3000,
      },
    ];
    await ssl({
      WONQA_DIR: 'home',
      dnsimpleToken,
      rootDomain,
      subDomain,
      servers,
      cachePath,
      email,
    });
    const args = fs.writeFile.mock.calls[0];
    expect(args[0]).toEqual('home/dnsimple.ini');
    expect(args[1]).toEqual(`dns_dnsimple_token = ${dnsimpleToken}`);
  });

  test('spawns ssl.sh with the root subDomain.rootDomain', async () => {
    const servers = [
      {
        default: true,
        port: 3000,
      },
    ];
    await ssl({
      WONQA_DIR: 'home',
      dnsimpleToken,
      rootDomain,
      subDomain,
      servers,
      cachePath,
      email,
    });
    expect(spawnPromise).toBeCalledWith('bash', ['home/bin/ssl.sh'], {
      WONQA_DIR: 'home',
      rootDomain,
      subDomain,
      domains: `${subDomain}.${rootDomain}`,
      cachePath,
      email,
    });
  });

  test('spawns ssl.sh with multiple domains', async () => {
    const servers = [
      {
        default: true,
        port: 3000,
      },
      {
        serverName: 'api',
        port: 8000,
      },
    ];
    await ssl({
      WONQA_DIR: 'home',
      dnsimpleToken,
      rootDomain,
      subDomain,
      servers,
      cachePath,
      email,
    });
    expect(spawnPromise).toBeCalledWith('bash', ['home/bin/ssl.sh'], {
      WONQA_DIR: 'home',
      rootDomain,
      subDomain,
      domains: `${subDomain}.${rootDomain},api.${subDomain}.${rootDomain}`,
      cachePath,
      email,
    });
  });
});
