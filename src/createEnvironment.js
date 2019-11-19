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

const createEnvironment = async ({
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
  dnsProvider,
  hostedZoneId
} = {}) => {
  try {
    await ensureAuthenticated({ awsRegion, iamUsername });
    await confirmRegion({ awsRegion });
    await getCluster({ awsRegion, clusterName });
    const task = await createTaskDefinition({
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
    });
    const taskDefinition = await registerTaskDefinition({ awsRegion, task });
    const taskArn = await runTask({
      awsRegion,
      clusterName,
      subnets,
      securityGroups,
      taskDefinition,
    });
    await saveTaskID({ WONQA_DIR, taskArn });
    const runningTask = await waitForTaskRunning({ awsRegion, clusterName, taskArn });
    const publicIp = await getPublicIP({ awsRegion, runningTask });
    await createDNSRecords({
      dnsimpleAccountID,
      dnsimpleToken,
      rootDomain,
      subDomain,
      userCreateDNSRecords,
      publicIp,
      dnsProvider,
      hostedZoneId
    });
    await waitForQAEnvAvailable({ rootDomain, subDomain });
    await onSuccess({ userOnSuccess, rootDomain, subDomain });
    await stopPreviousTasks({
      awsRegion,
      subDomain,
      clusterName,
      revision: taskDefinition.revision,
    });
    await deregisterPreviousTaskDefinitions({
      awsRegion,
      subDomain,
      revision: taskDefinition.revision,
    });
    return runningTask;
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = createEnvironment;
