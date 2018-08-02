const fs = require('fs');
const util = require('util');
const spawnPromise = require('./spawnPromise');

const writeFilePromise = util.promisify(fs.writeFile);

const ssl = ({
  WONQA_DIR,
  dnsimpleToken,
  rootDomain,
  subDomain,
  servers,
  cachePath,
  email,
} = {}) => new Promise((resolve, reject) => {
  // write dnsimple.ini file using dnsimpleToken
  const dnsimpleCreds = `dns_dnsimple_token = ${dnsimpleToken}`;
  const additionalDomains = servers && servers
    .map(server => server.serverName && `${server.serverName}.${subDomain}.${rootDomain}`)
    .filter(el => el) // remove undefined values
    .join();
  const trimmed = additionalDomains.slice(-1) === ','
    ? additionalDomains.slice(0, -1)
    : additionalDomains;
  const domains = (trimmed && trimmed.length > 0)
    ? `${subDomain}.${rootDomain},${trimmed}`
    : `${subDomain}.${rootDomain}`;
  writeFilePromise(`${WONQA_DIR}/dnsimple.ini`, dnsimpleCreds)
    .then(() => spawnPromise('bash', [`${WONQA_DIR}/bin/ssl.sh`], {
      WONQA_DIR,
      rootDomain,
      subDomain,
      domains,
      cachePath,
      email,
    }))
    .then(() => resolve())
    .catch(err => reject(err));
});

module.exports = ssl;
