const {
  ensureAuthenticated,
  confirmRegion,
} = require('./iam');
const {
  getCluster,
  registerTaskDefinition,
  runTask,
  waitForTaskRunning,
  deregisterPreviousTaskDefinitions,
  stopPreviousTasks,
} = require('./ecs');
const {
  createTaskDefinition,
  waitForQAEnvAvailable,
  saveTaskID,
  onSuccess,
} = require('./utils');
const {
  getPublicIP,
} = require('./ec2');
const {
  createDNSRecords,
} = require('./dns');

const createEnvironment = ({
  WONQA_DIR,
  awsAccountID,
  awsRegion,
  iamUsername,
  clusterName,
  subnets,
  securityGroups,
  rootDomain,
  subDomain,
  cpu,
  memory,
  containerDefinitions,
  dnsimpleAccountID,
  dnsimpleToken,
  imageRepositoryPath,
  awsLogsGroup,
  awsLogsRegion,
  awsLogsStreamPrefix,
  createDNSRecords: userCreateDNSRecords,
  onSuccess: userOnSuccess,
} = {}) => new Promise((resolve, reject) => {
  const scope = {};
  ensureAuthenticated({ awsRegion, iamUsername })
    .then(() => confirmRegion({ awsRegion }))
    .then(() => getCluster({ awsRegion, clusterName }))
    .then(() => createTaskDefinition({
      awsRegion,
      awsAccountID,
      subDomain,
      cpu,
      memory,
      containerDefinitions,
      imageRepositoryPath,
      awsLogsGroup,
      awsLogsRegion,
      awsLogsStreamPrefix,
    }))
    .then(task => registerTaskDefinition({ awsRegion, task }))
    .then((taskDefinition) => {
      scope.taskDefinition = taskDefinition;
      return runTask({
        awsRegion,
        clusterName,
        subnets,
        securityGroups,
        taskDefinition,
      });
    })
    .then(taskArn => saveTaskID({ WONQA_DIR, taskArn }))
    .then(taskArn => waitForTaskRunning({ awsRegion, clusterName, taskArn }))
    .then((runningTask) => {
      scope.runningTask = runningTask;
      return getPublicIP({ awsRegion, runningTask });
    })
    .then(({ NetworkInterfaces }) => createDNSRecords({
      dnsimpleAccountID,
      dnsimpleToken,
      rootDomain,
      subDomain,
      userCreateDNSRecords,
      NetworkInterfaces,
    }))
    .then(() => waitForQAEnvAvailable({ rootDomain, subDomain }))
    .then(() => onSuccess({ userOnSuccess, rootDomain, subDomain }))
    .then(() => stopPreviousTasks({
      awsRegion,
      subDomain,
      clusterName,
      revision: scope.taskDefinition.revision,
    }))
    .then(() => deregisterPreviousTaskDefinitions({
      awsRegion,
      subDomain,
      revision: scope.taskDefinition.revision,
    }))
    .then(() => resolve(scope.runningTask))
    .catch(error => reject(error));
});

module.exports = createEnvironment;
