const createEnvironment = require('./createEnvironment');
const {
  getString,
  createTaskDefinition,
  saveTaskID,
  waitForQAEnvAvailable,
  onSuccess,
} = require('./utils');
const {
  getCluster,
  registerTaskDefinition,
  runTask,
  waitForTaskRunning,
  stopPreviousTasks,
  deregisterPreviousTaskDefinitions,
} = require('./ecs');
const {
  getPublicIP,
} = require('./ec2');
const {
  ensureAuthenticated,
  confirmRegion,
} = require('./iam');
const {
  createDNSRecords,
} = require('./dns');

jest.mock('./utils');
jest.mock('./iam');
jest.mock('./ecs');
jest.mock('./ec2');
jest.mock('./dns');

const task = { taskMock: true };
const revision = 10;
const taskDefinition = { mockTaskDefinition: true, revision };
const taskArn = getString();
const runningTask = {
  mockRunningTask: true,
  attachments: [
    {
      details: [
        {
          name: 'networkInterfaceId',
          value: getString(),
        },
      ],
    },
  ],
};
const publicIp = getString();

ensureAuthenticated.mockImplementation(() => Promise.resolve({}));
confirmRegion.mockImplementation(() => Promise.resolve({}));
getCluster.mockImplementation(() => Promise.resolve({}));
createTaskDefinition.mockImplementation(() => Promise.resolve(task));
registerTaskDefinition.mockImplementation(() => Promise.resolve(taskDefinition));
runTask.mockImplementation(() => Promise.resolve(taskArn));
saveTaskID.mockImplementation(() => Promise.resolve({}));
waitForTaskRunning.mockImplementation(() => Promise.resolve(runningTask));
getPublicIP.mockImplementation(() => Promise.resolve(publicIp));
createDNSRecords.mockImplementation(() => Promise.resolve({}));
waitForQAEnvAvailable.mockImplementation(() => Promise.resolve({}));
onSuccess.mockImplementation(() => Promise.resolve({}));
stopPreviousTasks.mockImplementation(() => Promise.resolve({}));
deregisterPreviousTaskDefinitions.mockImplementation(() => Promise.resolve({}));

const WONQA_DIR = '/';
const awsRegion = getString();
const awsAccountID = getString();
const subDomain = getString();
const cpu = getString();
const memory = getString();
const containerDefinitions = getString();
const imageRepositoryPath = getString();
const awsLogsGroup = getString();
const awsLogsRegion = getString();
const awsLogsStreamPrefix = getString();
const clusterName = getString();
const subnets = [getString()];
const securityGroups = [getString()];
const dnsimpleAccountID = getString();
const dnsimpleToken = getString();
const rootDomain = getString();
const userCreateDNSRecords = jest.fn();
const userOnSuccess = jest.fn();


describe('createEnvironment', () => {
  it('createTaskDefinition()', async () => {
    await createEnvironment({
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
    expect(createTaskDefinition).toBeCalledWith({
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
  });

  it('registerTaskDefinition()', async () => {
    await createEnvironment({ awsRegion });
    expect(registerTaskDefinition).toBeCalledWith({
      awsRegion,
      task,
    });
  });

  it('runTask()', async () => {
    await createEnvironment({
      awsRegion,
      clusterName,
      subnets,
      securityGroups,
    });
    expect(runTask).toBeCalledWith({
      awsRegion,
      clusterName,
      subnets,
      securityGroups,
      taskDefinition,
    });
  });

  it('saveTaskID()', async () => {
    await createEnvironment({
      WONQA_DIR,
    });
    expect(saveTaskID).toBeCalledWith({
      WONQA_DIR,
      taskArn,
    });
  });

  it('waitForTaskRunning()', async () => {
    await createEnvironment({ awsRegion, clusterName });
    expect(waitForTaskRunning).toBeCalledWith({
      awsRegion,
      clusterName,
      taskArn,
    });
  });

  it('getPublicIP()', async () => {
    await createEnvironment({ awsRegion });
    expect(getPublicIP).toBeCalledWith({
      awsRegion,
      runningTask,
    });
  });

  it('createDNSRecords()', async () => {
    await createEnvironment({
      awsRegion,
      dnsimpleAccountID,
      dnsimpleToken,
      rootDomain,
      subDomain,
      createDNSRecords: userCreateDNSRecords,
    });
    expect(createDNSRecords).toBeCalledWith({
      dnsimpleAccountID,
      dnsimpleToken,
      rootDomain,
      subDomain,
      userCreateDNSRecords,
      publicIp,
    });
  });

  it('waitForQAEnvAvailable()', async () => {
    await createEnvironment({
      rootDomain,
      subDomain,
    });
    expect(waitForQAEnvAvailable).toBeCalledWith({
      rootDomain,
      subDomain,
    });
  });

  it('onSuccess()', async () => {
    await createEnvironment({
      onSuccess: userOnSuccess,
      rootDomain,
      subDomain,
    });
    expect(onSuccess).toBeCalledWith({
      rootDomain,
      subDomain,
      userOnSuccess,
    });
  });

  it('stopPreviousTasks()', async () => {
    await createEnvironment({
      subDomain,
      awsRegion,
    });
    expect(stopPreviousTasks).toBeCalledWith({
      awsRegion,
      subDomain,
      clusterName,
      revision,
    });
  });

  it('deregisterPreviousTaskDefinitions()', async () => {
    await createEnvironment({
      subDomain,
      awsRegion,
    });
    expect(deregisterPreviousTaskDefinitions).toBeCalledWith({
      awsRegion,
      subDomain,
      revision,
    });
  });

  it('returns the running task', async () => {
    const tsk = await createEnvironment({});
    expect(tsk).toEqual(runningTask);
  });
});
