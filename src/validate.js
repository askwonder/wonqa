const fs = require('fs');

const validateSubDomain = (subDomain) => {
  if (!subDomain || typeof subDomain !== 'string') {
    throw new Error(`
      Missing subDomain. We recommend using your current branch name. 
      Get it by running: git rev-parse --abbrev-ref HEAD
      Please make sure it's URL safe (alpha numeric and dash characters only)
    `);
  }
  const alphaNumAndDash = new RegExp('^[a-zA-Z0-9-]*$');
  if (!alphaNumAndDash.test(subDomain)) {
    throw new Error('subDomain should only contain alphanumerical and "-" characters');
  }
  if (subDomain !== subDomain.toLowerCase()) {
    throw new Error('subDomain should only contain lowercase characters');
  }
};

const validateNginxServersConf = (servers) => {
  if (!Array.isArray(servers)) {
    throw new Error('servers must be an array');
  }
  if (servers.length === 0) {
    throw new Error('servers must have at least one object to specify the port of your default server');
  }
  if (!servers.every(server => server.port)) {
    throw new Error('Every object in the servers array must have a port property');
  }
  const serverNames = servers.filter(el => el.serverName);
  if (serverNames && !serverNames.every(el => el.serverName === el.serverName.toLowerCase())) {
    throw new Error('Every serverName value must be in lowercase');
  }
};

const validateNginxConf = (servers, configurationPath) => {
  validateNginxServersConf(servers);
  if (configurationPath) {
    const stats = fs.lstatSync(configurationPath);
    if (!stats.isFile()) {
      throw new Error('nginx.configurationPath is not a path to a file');
    }
    const config = fs.readFileSync(configurationPath);
    const expectedConfigs = [
      'http {',
      'ssl_certificate     /etc/ssl/fullchain1.pem;',
      'ssl_certificate_key /etc/ssl/privkey1.pem;',
    ];
    expectedConfigs.forEach((el) => {
      if (!config.includes(el)) {
        throw new Error(`NGINX configuration missing '${el}'`);
      }
    });
  }
};

const validateHTTPSOptions = ({
  dnsimpleToken,
  dnsProvider,
  email,
  cachePath,
  nginx: {
    configurationPath,
    servers,
    imageRepositoryPath,
    awsLogsGroup,
    awsLogsRegion,
    awsLogsStreamPrefix,
  } = {},
}) => {
  if (dnsProvider == 'DNSIMPLE' && (!dnsimpleToken || typeof dnsimpleToken !== 'string')) {
    throw new Error('Missing https.dnsimpleToken required to create SSL certificates');
  }
  if (!email || typeof email !== 'string') {
    throw new Error('email is missing');
  }
  if (cachePath) {
    const stats = fs.lstatSync(cachePath);
    if (!stats.isDirectory()) {
      throw new Error('cachePath is not a path to a directory');
    }
  } else {
    throw new Error('cachePath is undefined');
  }
  validateNginxConf(servers, configurationPath);
  if (imageRepositoryPath && typeof imageRepositoryPath !== 'string') {
    throw new Error('imageRepositoryPath should be a string');
  }
  if (awsLogsGroup && typeof awsLogsGroup !== 'string') {
    throw new Error('awsLogsGroup is not a string');
  }
  if (awsLogsRegion && typeof awsLogsRegion !== 'string') {
    throw new Error('awsLogsRegion is not a string');
  }
  if (awsLogsStreamPrefix && typeof awsLogsStreamPrefix !== 'string') {
    throw new Error('awsLogsStreamPrefix is not a string');
  }
};

const validateDNSOptions = ({
  rootDomain,
  subDomain,
  dnsProvider,
  dnsimpleToken: DNSdnsimpleToken,
  dnsimpleAccountID: DNSdnsimpleAccountID,
  createDNSRecords,
}) => {
  if (!rootDomain || typeof rootDomain !== 'string') {
    throw new Error('Missing rootDomain');
  }
  if (rootDomain !== rootDomain.toLowerCase()) {
    throw new Error('rootDomain should only contain lowercase characters');
  }
  validateSubDomain(subDomain);
  if (createDNSRecords && typeof createDNSRecords !== 'function') {
    throw new Error('createDNSRecords must be a function');
  }
  if (dnsProvider == 'DNSIMPLE' && !createDNSRecords && !DNSdnsimpleToken) {
    throw new Error('If you do not provide a createDNSRecords callback, you need to provide a dns.dnsimpleToken value');
  }
  if (dnsProvider == 'DNSIMPLE' && !createDNSRecords && typeof DNSdnsimpleAccountID !== 'string') {
    throw new Error('If you do not provide a createDNSRecords callback, you need to provide a dns.dnsimpleAccountID value');
  }
};

const validateAWSOptions = ({
  awsAccountID,
  awsRegion,
  iamUsername,
  clusterName,
  subnets,
  securityGroups,
  cpu,
  memory,
  containerDefinitions,
}) => {
  if (!awsAccountID || typeof awsAccountID !== 'string') {
    throw new Error('Missing awsAccountID');
  }
  if (!awsRegion || typeof awsRegion !== 'string') {
    throw new Error('Missing awsRegion');
  }
  if (!iamUsername || typeof iamUsername !== 'string') {
    throw new Error('Missing iamUsername');
  }
  if (!clusterName || typeof clusterName !== 'string') {
    throw new Error('Missing clusterName');
  }
  if (!subnets || !Array.isArray(subnets)) {
    throw new Error('subnets should be an array of subnet IDs');
  }
  if (!securityGroups || !Array.isArray(securityGroups)) {
    throw new Error('securityGroups should be an array of security group IDs');
  }
  if (!cpu || typeof cpu !== 'string') {
    throw new Error('Missing cpu');
  }
  if (!memory || typeof memory !== 'string') {
    throw new Error('Missing memory');
  }
  if (!containerDefinitions) {
    throw new Error('Missing containerDefinitions');
  }
  if (!Array.isArray(containerDefinitions)) {
    throw new Error('containerDefinitions should be an array of container definition objects');
  }
  if (!containerDefinitions.every(def => typeof def === 'object' && def.name && def.image)) {
    throw new Error('Every container definition object should have at least name and image properties.');
  }
};

const validateCreateOptions = ({
  https = {},
  dns = {},
  aws = {},
  preCreate,
  postCreate,
  onSuccess,
  onError,
} = {}) => {
  validateHTTPSOptions(https);
  validateDNSOptions(dns);
  validateAWSOptions(aws);
  if (onSuccess && typeof onSuccess !== 'function') {
    throw new Error('onSuccess must be a function');
  }
  if (onError && typeof onError !== 'function') {
    throw new Error('onError must be a function');
  }
  if (preCreate) {
    if (!Array.isArray(preCreate)) {
      throw new Error('preCreate should be an array');
    }
    preCreate.forEach((fn) => {
      if (typeof fn !== 'function') {
        throw new Error('preCreate should be an array of promises');
      }
    });
  }
  if (postCreate) {
    if (!Array.isArray(postCreate)) {
      throw new Error('postCreate should be an array');
    }
    postCreate.forEach((fn) => {
      if (typeof fn !== 'function') {
        throw new Error('postCreate should be an array of promises');
      }
    });
  }
};

const validateLogsOptions = ({
  aws: {
    awsRegion,
    clusterName,
  } = {},
  container,
} = {}) => {
  if (!awsRegion || typeof awsRegion !== 'string') {
    throw new Error('Missing awsRegion');
  }
  if (!clusterName || typeof clusterName !== 'string') {
    throw new Error('Missing clusterName');
  }
  if (!container || typeof container !== 'string') {
    throw new Error('Missing container name');
  }
};

const validatePruneOptions = ({
  aws: {
    awsRegion,
    iamUsername,
    clusterName,
  } = {},
  dns: {
    rootDomain,
    subDomain,
    dnsimpleToken,
    dnsimpleAccountID,
    createDNSRecords,
  } = {},
  onError,
} = {}) => {
  if (!awsRegion || typeof awsRegion !== 'string') {
    throw new Error('Missing awsRegion');
  }
  if (!iamUsername || typeof iamUsername !== 'string') {
    throw new Error('Missing iamUsername');
  }
  if (!clusterName || typeof clusterName !== 'string') {
    throw new Error('Missing clusterName');
  }
  if (!rootDomain || typeof rootDomain !== 'string') {
    throw new Error('Missing rootDomain');
  }
  validateSubDomain(subDomain);
  if (createDNSRecords && typeof createDNSRecords !== 'function') {
    throw new Error('createDNSRecords must be a function');
  }
  if (!createDNSRecords && (!dnsimpleToken || typeof dnsimpleToken !== 'string')) {
    throw new Error('Missing dns.dnsimpleToken required to create SSL certificates');
  }
  if (!createDNSRecords && typeof dnsimpleAccountID !== 'string') {
    throw new Error('If you do not provide a createDNSRecords callback, you need to provide a dns.dnsimpleAccountID value');
  }
  if (onError && typeof onError !== 'function') {
    throw new Error('onError must be a function');
  }
};

module.exports = {
  validateCreateOptions,
  validateLogsOptions,
  validatePruneOptions,
};
