const fs = require('fs');

const {
  writeConfFile,
} = require('./nginx');

jest.mock('fs');

describe('utils', () => {
  const baseExpectedServerConfigs = (port = 3000) => ([
    'http {',
    'ssl_certificate     /etc/ssl/fullchain1.pem;',
    'ssl_certificate_key /etc/ssl/privkey1.pem;',
    'map $http_upgrade $connection_upgrade {',
    'default upgrade;',
    '\'\'      close;',
    'server {',
    'listen 443 ssl default_server;',
    'location / {',
    `proxy_pass http://localhost:${port}/;`,
    'proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
    'proxy_set_header X-Forwarded-Proto $scheme;',
    'proxy_set_header Host $http_host;',
    'proxy_redirect off;',
    'proxy_http_version 1.1;',
    'proxy_set_header    Upgrade           $http_upgrade;',
    'proxy_set_header    Connection        "upgrade";',
    'events {',
    'accept_mutex on;',
    'worker_connections 1024;',
  ]);

  test('writeConfFile :: allows file to be overriden with custom file', async () => {
    fs.readFileSync.mockReturnValue('foo');
    const file = await writeConfFile({ WONQA_DIR: './', configurationPath: '/Users/bob/foo.conf' });
    expect(file).toBe('foo');
  });

  test('writeConfFile :: creates the nginx config with a default server', async () => {
    const servers = [
      {
        default: true,
        port: 3000,
      },
    ];
    const expected = baseExpectedServerConfigs(3000);
    const file = await writeConfFile({ WONQA_DIR: './', servers });
    expect(expected.every(el => file.includes(el))).toBe(true);
  });

  test('writeConfFile :: creates the nginx config with multiple servers', async () => {
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
    const expected = baseExpectedServerConfigs(3000).concat([
      // second server block:
      'listen 443 ssl;',
      'server_name api.*;',
      'proxy_pass http://localhost:8000/;',
    ]);
    const file = await writeConfFile({ WONQA_DIR: './', servers });
    expect(expected.every(el => file.includes(el))).toBe(true);
  });
});
