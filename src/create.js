const configure = require('./configure');
const ssl = require('./ssl');
const createEnvironment = require('./createEnvironment');
const {
  writeConfFile,
  deleteConfFile,
  buildAndPush: buildAndPushNginx,
} = require('./nginx');

const create = ({
  WONQA_DIR,
  https: {
    email,
    dnsimpleToken,
    cachePath,
    nginx: {
      servers,
      configurationPath,
      imageRepositoryPath,
      awsLogsGroup,
      awsLogsRegion,
      awsLogsStreamPrefix,
    } = {},
  } = {},
  dns: {
    rootDomain,
    subDomain,
    dnsimpleToken: DNSdnsimpleToken,
    dnsimpleAccountID: DNSdnsimpleAccountID,
    createDNSRecords,
    dnsProvider,
    hostedZoneId
  } = {},
  aws: {
    awsAccountID,
    awsRegion,
    iamUsername,
    clusterName,
    cpu,
    memory,
    containerDefinitions,
    subnets,
    securityGroups,
  } = {},
  onError,
  onSuccess,
  preCreate = [],
  postCreate = [],
}) => {
  const scope = {};
  return configure({ WONQA_DIR, awsRegion })
    .then(() => writeConfFile({ WONQA_DIR, servers, configurationPath }))
    .then(() => {ssl({
      rootDomain,
      subDomain,
      servers,
      email,
      dnsimpleToken,
      dnsProvider,
      cachePath,
      WONQA_DIR,
    })})
    .then(() => buildAndPushNginx({
      awsAccountID,
      awsRegion,
      subDomain,
      imageRepositoryPath,
      WONQA_DIR,
    }))
    .then(() => deleteConfFile({ WONQA_DIR }))
    .then(() => {
      // do anything the user needs done before the qa env is setup
      const promises = preCreate.map(fn => fn());
      return Promise.all(promises);
    })
    .then(() => createEnvironment({
      WONQA_DIR,
      awsRegion,
      awsAccountID,
      iamUsername,
      clusterName,
      rootDomain,
      subDomain,
      cpu,
      memory,
      containerDefinitions,
      subnets,
      securityGroups,
      dnsimpleToken: DNSdnsimpleToken,
      dnsimpleAccountID: DNSdnsimpleAccountID,
      imageRepositoryPath,
      awsLogsGroup,
      awsLogsRegion,
      awsLogsStreamPrefix,
      createDNSRecords,
      onSuccess,
      dnsProvider,
      hostedZoneId,
    }))
    .then((task) => {
      scope.task = task;
      // do anything the user needs done after the qa env is setup
      const promises = postCreate.map(fn => fn());
      return Promise.all(promises);
    })
    .then(() => Promise.resolve(scope.task))
    .catch((error) => {
      if (onError) {
        onError(error);
        return;
      }
      console.log('Wonqa error:', error);
      process.exit(1);
    });
};

module.exports = create;
