const create = require('./create');
const configure = require('./configure');
const {
  getString,
} = require('./utils');
const {
  writeConfFile,
  deleteConfFile,
  buildAndPush,
} = require('./nginx');
const ssl = require('./ssl');
const createEnvironment = require('./createEnvironment');

jest.mock('./configure');
jest.mock('./nginx');
jest.mock('./ssl');
jest.mock('./createEnvironment');

configure.mockImplementation(() => Promise.resolve({}));
writeConfFile.mockImplementation(() => Promise.resolve({}));
deleteConfFile.mockImplementation(() => Promise.resolve({}));
buildAndPush.mockImplementation(() => Promise.resolve({}));
ssl.mockImplementation(() => Promise.resolve({}));

const WONQA_DIR = '/';

describe('create', () => {
  const awsRegion = getString();
  const awsAccountID = getString();
  const iamUsername = getString();
  const clusterName = getString();
  const cpu = getString();
  const memory = getString();
  const containerDefinitions = [];
  const subnet = getString();
  const subnets = [subnet];
  const securityGroup = getString();
  const securityGroups = [securityGroup];
  const imageRepositoryPath = getString();
  const servers = [{ default: true, port: 3000 }];
  const rootDomain = getString();
  const subDomain = getString();
  const email = getString();
  const dnsimpleToken = getString();
  const dnsimpleAccountID = getString();
  const awsLogsGroup = getString();
  const awsLogsRegion = getString();
  const awsLogsStreamPrefix = getString();
  const createDNSRecords = jest.fn();
  const onSuccess = jest.fn();
  const cachePath = getString();
  const configurationPath = getString();

  it('configure()', async () => {
    await create({ WONQA_DIR, aws: { awsRegion } });
    expect(configure).toBeCalledWith({ WONQA_DIR, awsRegion });
  });

  it('writeConfFile()', async () => {
    await create({ WONQA_DIR, https: { nginx: { servers } } });
    expect(writeConfFile).toBeCalledWith({ WONQA_DIR, servers });
  });

  it('writeConfFile()', async () => {
    await create({ WONQA_DIR, https: { nginx: { configurationPath } } });
    expect(writeConfFile).toBeCalledWith({ WONQA_DIR, configurationPath });
  });

  it('ssl()', async () => {
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

  it('buildAndPush()', async () => {
    await create({
      https: { nginx: { imageRepositoryPath } },
      aws: { awsAccountID, awsRegion },
      dns: { subDomain },
      WONQA_DIR,
    });
    expect(buildAndPush).toBeCalledWith({
      imageRepositoryPath,
      awsAccountID,
      awsRegion,
      subDomain,
      WONQA_DIR,
    });
  });

  it('deleteConfFile()', async () => {
    await create({ WONQA_DIR });
    expect(buildAndPush).toBeCalledWith({ WONQA_DIR });
  });

  it('executes preCreate promises', async () => {
    const prom1 = jest.fn().mockImplementation(() => Promise.resolve());
    const prom2 = jest.fn().mockImplementation(() => Promise.resolve());
    await create({ preCreate: [prom1, prom2] });
    expect(prom1).toHaveBeenCalled();
    expect(prom2).toHaveBeenCalled();
  });

  it('createEnvironment()', async () => {
    await create({
      WONQA_DIR,
      https: {
        nginx: {
          imageRepositoryPath,
          awsLogsGroup,
          awsLogsRegion,
          awsLogsStreamPrefix,
        },
      },
      dns: {
        rootDomain,
        subDomain,
        dnsimpleToken,
        dnsimpleAccountID,
        createDNSRecords,
      },
      aws: {
        awsRegion,
        awsAccountID,
        iamUsername,
        clusterName,
        cpu,
        memory,
        containerDefinitions,
        subnets,
        securityGroups,
      },
      onSuccess,
    });
    expect(createEnvironment).toBeCalledWith({
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
      dnsimpleToken,
      dnsimpleAccountID,
      imageRepositoryPath,
      awsLogsGroup,
      awsLogsRegion,
      awsLogsStreamPrefix,
      createDNSRecords,
      onSuccess,
    });
  });

  it('executes all postCreate promises', async () => {
    const prom1 = jest.fn().mockImplementation(() => Promise.resolve());
    const prom2 = jest.fn().mockImplementation(() => Promise.resolve());
    await create({ postCreate: [prom1, prom2] });
    expect(prom1).toHaveBeenCalled();
    expect(prom2).toHaveBeenCalled();
  });

  it('returns the task object', async () => {
    const taskArn = getString();
    createEnvironment.mockImplementation(() => Promise.resolve({ taskArn }));
    const task = await create({});
    expect(task).toEqual({ taskArn });
  });

  it('calls the provided onError callback if it exists', async () => {
    const onError = jest.fn();
    createEnvironment.mockImplementation(() => Promise.reject(new Error('Oh no')));
    await create({ onError });
    expect(onError).toBeCalledWith(new Error('Oh no'));
  });
});
