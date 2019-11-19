const {
  ensureAuthenticated,
  confirmRegion,
} = require('./iam');
const {
  findTask,
  stopTask,
  deregisterTaskDefinition,
} = require('./ecs');
const {
  deleteImages,
} = require('./ecr');
const {
  NGINX_REPOSITORY_NAME,
} = require('./constants');
const {
  deleteDNSRecords,
} = require('./dns');

const prune = ({
  aws: {
    awsRegion,
    iamUsername,
    clusterName,
  } = {},
  dns: {
    rootDomain,
    subDomain,
    dnsProvider,
    hostedZoneId,
    dnsimpleToken,
    dnsimpleAccountID,
    createDNSRecords,
  } = {},
  onError: userOnError,
}) => {
  const scope = {};
  return ensureAuthenticated({
    awsRegion,
    iamUsername,
  })
    .then(() => confirmRegion({ awsRegion }))
    .then(() => findTask({
      awsRegion,
      clusterName,
      subDomain,
    }))
    // eslint-disable-next-line consistent-return
    .then((task) => {
      if (task) {
        scope.task = task;
        return stopTask({
          awsRegion,
          clusterName,
          taskArn: task.taskArn,
        });
      }
    })
    // eslint-disable-next-line consistent-return
    .then(() => {
      if (scope.task) {
        return deregisterTaskDefinition({
          awsRegion,
          task: scope.task,
        });
      }
    })
    .then(() => deleteImages({
      awsRegion,
      subDomain,
      repositoryName: NGINX_REPOSITORY_NAME,
    }))
    .then(() => (createDNSRecords
      ? Promise.resolve()
      : deleteDNSRecords({
        dnsimpleToken,
        dnsimpleAccountID,
        dnsProvider,
        hostedZoneId,
        rootDomain,
        subDomain,
      })))
    .catch((error) => {
      if (userOnError) {
        userOnError(error);
        return;
      }
      console.log('Wonqa error:', error);
      process.exit(1);
    });
};

module.exports = prune;
