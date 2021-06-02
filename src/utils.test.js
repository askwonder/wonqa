const {
  onSuccess,
  createTaskDefinition,
  getString,
} = require('./utils');

describe('utils', () => {
  test('onSuccess :: calls the provided userOnSuccess if it exists', () => {
    const mock = jest.fn(() => Promise.resolve());
    const subDomain = 'feature-cats';
    const rootDomain = 'google.com';
    onSuccess({ userOnSuccess: mock, subDomain, rootDomain });
    expect(mock).toBeCalledWith(`https://${subDomain}.${rootDomain}`);
  });

  test('createTaskDefinition :: returns the task definition with nginx container', () => {
    /*
    TODO:
    - that every aws container config can be returned
    - memoryReservation is added
    - command is added
    - without nginx log group options
    - without nginx imageRepositoryPath
    */
    const awsAccountID = getString();
    const awsRegion = getString();
    const subDomain = getString();
    const cpu = getString();
    const memory = getString();
    const ephemeralStorage = getString();
    const containerDefinitions = [{
      name: 'someContainerName',
      image: 'someImagePath',
    }];
    const imageRepositoryPath = getString();
    const awsLogsGroup = getString();
    const awsLogsRegion = getString();
    const awsLogsStreamPrefix = getString();

    const taskDef = createTaskDefinition({
      awsAccountID,
      awsRegion,
      subDomain,
      cpu,
      memory,
      ephemeralStorage,
      containerDefinitions,
      imageRepositoryPath,
      awsLogsGroup,
      awsLogsRegion,
      awsLogsStreamPrefix,
    });
    expect(taskDef).toEqual({
      family: subDomain,
      taskRoleArn: `arn:aws:iam::${awsAccountID}:role/ecsExecutionRole`,
      executionRoleArn: `arn:aws:iam::${awsAccountID}:role/ecsExecutionRole`,
      networkMode: 'awsvpc',
      requiresCompatibilities: ['FARGATE'],
      cpu,
      memory,
      ephemeralStorage: { sizeInGiB: ephemeralStorage },
      containerDefinitions: [
        {
          name: 'someContainerName',
          image: 'someImagePath',
          portMappings: [],
          essential: true,
          environment: [],
          mountPoints: [],
          volumesFrom: [],
          logConfiguration: {
            logDriver: 'awslogs',
            options: {
              'awslogs-create-group': 'true',
              'awslogs-group': 'wonqa-log-group',
              'awslogs-region': awsRegion,
              'awslogs-stream-prefix': 'wonqa',
            },
          },
        },
        {
          name: 'nginx',
          image: `${imageRepositoryPath}:${subDomain}`,
          portMappings: [
            {
              containerPort: 443,
              hostPort: 443,
              protocol: 'tcp',
            },
          ],
          logConfiguration: {
            logDriver: 'awslogs',
            options: {
              'awslogs-create-group': 'true',
              'awslogs-group': awsLogsGroup,
              'awslogs-region': awsLogsRegion,
              'awslogs-stream-prefix': awsLogsStreamPrefix,
            },
          },
          essential: true,
          environment: [],
          mountPoints: [],
          volumesFrom: [],
        },
      ],
    });
  });
});
