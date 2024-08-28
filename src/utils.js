const fs = require('fs');
const https = require('https');
const {
  NGINX_REPOSITORY_NAME,
} = require('./constants');
const BASE_TASK_DEFINITION = require('./baseTaskDefinition.json');

const createNginxContainerDefinition = ({
  awsAccountID,
  awsRegion,
  subDomain,
  imageRepositoryPath,
  awsLogsGroup,
  awsLogsRegion,
  awsLogsStreamPrefix,
}) => {
  const image = (imageRepositoryPath && `${imageRepositoryPath}:${subDomain}`)
    || `${awsAccountID}.dkr.ecr.${awsRegion}.amazonaws.com/${NGINX_REPOSITORY_NAME}:${subDomain}`;
  return {
    name: 'nginx',
    image,
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
        'awslogs-group': awsLogsGroup || 'wonqa-log-group',
        'awslogs-region': awsLogsRegion || awsRegion,
        'awslogs-stream-prefix': awsLogsStreamPrefix || 'wonqa',
      },
    },
  };
};

const createTaskDefinition = ({
  awsAccountID,
  awsRegion,
  subDomain,
  cpu,
  memory,
  containerDefinitions,
  imageRepositoryPath,
  awsLogsGroup,
  awsLogsRegion,
  awsLogsStreamPrefix,
} = {}) => {
  const {
    taskRoleArn,
    executionRoleArn,
    networkMode,
    requiresCompatibilities,
    cpu: baseCpu,
    memory: baseMemory,
    containerDefinitions: baseContainerDefinitions,
  } = BASE_TASK_DEFINITION;
  const baseContainerDefinition = baseContainerDefinitions[0];

  // ensure nginx container definition is included
  const nginxContainerDef = createNginxContainerDefinition({
    awsAccountID,
    awsRegion,
    subDomain,
    imageRepositoryPath,
    awsLogsGroup,
    awsLogsRegion,
    awsLogsStreamPrefix,
  });
  const containerDefs = [...containerDefinitions, nginxContainerDef];

  const updatedContainerDefs = containerDefs.map((el) => {
    const def = {
      ...el,
      name: el.name,
      image: el.image,
      portMappings: el.portMappings || baseContainerDefinition.portMappings,
      essential: el.essential || baseContainerDefinition.essential,
      environment: el.environment || baseContainerDefinition.environment,
      mountPoints: el.mountPoints || baseContainerDefinition.mountPoints,
      volumesFrom: el.volumesFrom || baseContainerDefinition.volumesFrom,
      logConfiguration: el.logConfiguration
        || {
          ...baseContainerDefinition.logConfiguration,
          options: {
            ...baseContainerDefinition.logConfiguration.options,
            'awslogs-region': awsRegion,
          },
        },
    };
    if (el.memoryReservation) {
      def.memoryReservation = el.memoryReservation;
    }
    if (el.command) {
      def.command = el.command;
    }
    return def;
  });

  return {
    family: subDomain, // Changing this will break ecs.js#deregisterPreviousTaskDefinitions
    taskRoleArn: taskRoleArn.replace('<awsAccountID>', awsAccountID),
    executionRoleArn: executionRoleArn.replace('<awsAccountID>', awsAccountID),
    networkMode,
    requiresCompatibilities,
    cpu: cpu || baseCpu,
    memory: memory || baseMemory,
    containerDefinitions: updatedContainerDefs,
  };
};

const getTaskIdFromTaskArn = taskArn => taskArn.slice(taskArn.indexOf('task/') + 'task/'.length);

const saveTaskID = ({ WONQA_DIR, taskArn }) => new Promise((resolve, reject) => {
  const taskID = getTaskIdFromTaskArn(taskArn);
  fs.writeFile(`${WONQA_DIR}/task.json`, JSON.stringify({ taskID }, null, 2), (err) => {
    if (err) { return reject(err); }
    console.log('Saved task id to wonqa/task.json');
    return resolve(taskArn);
  });
});

/**
 * waitForQAEnvAvailable
 * Wait for the QA env to return a 200 OK
 */
const waitForQAEnvAvailable = ({ subDomain, rootDomain, healthCheckUrl }) => {
  console.log('Waiting for your QA env to return a 200 OK');
  let TIMEOUT = 100;
  const poll = (resolve, reject) => {
    const pollAgain = () => {
      if (TIMEOUT >= 600000) { console.log('This QA env isn\'t returning a 200 OK...there might be an issue.'); }
      TIMEOUT *= 1.2;
      setTimeout(() => poll(resolve, reject), TIMEOUT);
    };
    setTimeout(() => {
      const healthCheckEndpoint = new URL(healthCheckUrl || '', `https://${subDomain}.${rootDomain}`);

      https.get(healthCheckEndpoint, (res) => {
        console.log('HTTPS GET status:', res.statusCode, healthCheckEndpoint.toString());
        if (res.statusCode === 200) {
          resolve();
        } else {
          pollAgain();
        }
      })
        .on('error', () => {
          pollAgain();
        });
    }, TIMEOUT);
  };
  return new Promise(poll);
};

const onSuccess = ({ userOnSuccess, subDomain, rootDomain }) => {
  if (userOnSuccess) {
    return userOnSuccess(`https://${subDomain}.${rootDomain}`)
      .then(() => Promise.resolve())
      .catch(error => Promise.reject(error));
  }

  console.log(`
  ___ _   _  ___ ___ ___  ___ ___ 
 / __| | | |/ __/ __/ _ \\/ __/ __|
 \\__ \\ |_| | (_| (_|  __/\\__ \\__ \\
 |___/\\__,_|\\___\\___\\___||___/___/
 
 Your staging environment at should be ready for QA momentarily at:
 https://${subDomain}.${rootDomain}
 `);
  return Promise.resolve();
};

const getString = () => Math.random().toString(36).slice(-5);

module.exports = {
  createTaskDefinition,
  saveTaskID,
  waitForQAEnvAvailable,
  onSuccess,
  getString,
};
