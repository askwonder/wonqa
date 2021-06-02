const AWS = require('aws-sdk');
const {
  WONQA_CLUSTER_NAME,
} = require('./constants');

const createEcs = ({ awsRegion } = {}) => new AWS.ECS({ region: awsRegion });

const getCluster = ({ awsRegion, clusterName } = {}) => new Promise((resolve, reject) => {
  const ecsClient = createEcs({ awsRegion });
  const params = { clusters: [clusterName] };
  ecsClient.describeClusters(params, (err, data = {}) => {
    if (err) { return reject(err); }
    const { clusters = [] } = data;
    if (!clusters.length) {
      console.log('Cluster does not exist!');
      return reject();
    }
    console.log(`💻   Cluster: ${clusters[0].clusterName}`);
    return resolve(clusters);
  });
});

const registerTaskDefinition = ({ awsRegion, task }) => new Promise((resolve, reject) => {
  const ecsClient = createEcs({ awsRegion });
  const params = {
    requiresCompatibilities: ['FARGATE'],
    ...task,
  };
  ecsClient.registerTaskDefinition(params, (err, data = {}) => {
    if (err) { return reject(err); }
    console.log(`✅   Task Registered: ${data.taskDefinition.taskDefinitionArn}`);
    return resolve(data.taskDefinition);
  });
});

const listTaskDefinitions = ({ awsRegion, subDomain }) => new Promise((resolve, reject) => {
  const ecsClient = createEcs({ awsRegion });
  ecsClient.listTaskDefinitions(
    { familyPrefix: subDomain },
    (err, data = {}) => resolve(data.taskDefinitionArns || []),
  );
});

const deregisterTaskDefinition = ({ awsRegion, task }) => new Promise((resolve, reject) => {
  const ecsClient = createEcs({ awsRegion });
  const { taskDefinitionArn } = task;
  ecsClient.deregisterTaskDefinition(
    { taskDefinition: taskDefinitionArn },
    (err, data) => {
      if (err) {
        // not rejecting. We don't want this whole script to fail if clean up fails
        console.log(`Could not deregister task definition ${taskDefinitionArn}`, err, err.stack);
        return resolve();
      }
      console.log(`Deregistered task definition: ${taskDefinitionArn}`);
      return resolve(data);
    },
  );
});

/**
 * cleanPreviousTaskDefinitions
 * Remove task definitions that have the same branch but a previous revision ID
 * @param {String} taskDefinition the task definition registered by the latest `make qa`
 */
const deregisterPreviousTaskDefinitions = ({
  awsRegion,
  subDomain,
  revision,
}) => new Promise((resolve, reject) => {
  listTaskDefinitions({ awsRegion, subDomain })
    .then((taskDefinitionArns) => {
      if (taskDefinitionArns.length > 0) {
        const promises = [];
        taskDefinitionArns.forEach((taskArn) => {
          if (!taskArn.includes(`${subDomain}:${revision}`)) {
            const promise = deregisterTaskDefinition({
              awsRegion, task: { taskDefinitionArn: taskArn },
            });
            promises.push(promise);
          }
        });
        return Promise.all(promises);
      }
      return Promise.resolve();
    })
    .then(() => resolve())
    .catch(error => reject(error));
});

const runTask = ({
  awsRegion,
  clusterName,
  subnets,
  securityGroups,
  taskDefinition: { taskDefinitionArn } = {},
  platformVersion,
  ephemeralStorage,
} = {}) => new Promise((resolve, reject) => {
  const params = {
    cluster: clusterName,
    launchType: 'FARGATE',
    platformVersion,
    ...ephemeralStorage ? { ephemeralStorage: { sizeInGiB: ephemeralStorage } } : {},
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets,
        securityGroups,
        assignPublicIp: 'ENABLED',
      },
    },
    taskDefinition: taskDefinitionArn,
  };
  const ecsClient = createEcs({ awsRegion });
  ecsClient.runTask(params, (err, data = {}) => {
    if (err) { return reject(err); }
    const { tasks, failures = [] } = data;
    if (failures.length > 0) {
      return reject(failures[0].reason);
    }
    const { taskArn } = tasks[0];
    return resolve(taskArn);
  });
});

const waitForTaskRunning = ({
  awsRegion,
  clusterName,
  taskArn,
}) => new Promise((resolve, reject) => {
  console.log('Task: ', taskArn);
  console.log('Current status: PROVISIONING');
  console.log('Desired status: RUNNING');
  console.log('⏲️   This may take a couple minutes...');
  const params = { cluster: clusterName, tasks: [taskArn] };
  const ecsClient = createEcs({ awsRegion });
  ecsClient.waitFor('tasksRunning', params, (err, data = {}) => {
    if (err) {
      ecsClient
        .describeTasks(params)
        .promise()
        .then(({ tasks = [] } = {}) => {
          const task = tasks[0];
          if (!task) {
            throw new Error('Unable to find task');
          }

          const { containers, stoppedReason } = task;

          containers
            .filter(it => it.reason)
            .forEach(it => console.error(`Error: ${it.name} failed to start because of error "${it.reason}"`));

          throw new Error(`Task is not running: ${stoppedReason}`);
        })
        .catch(reject);
      return;
    }
    if (data.tasks.length === 0) {
      return reject(new Error('Could not find any tasks running'));
    }
    const runningTask = data.tasks[0];
    console.log('✅   Your task is running!', runningTask);
    return resolve(runningTask);
  });
});


const listAndDescribeTasks = ({
  awsRegion,
  clusterName,
}) => {
  const ecsClient = createEcs({ awsRegion });
  return new Promise((resolve, reject) => {
    ecsClient.listTasks({ cluster: clusterName }, (err, data = {}) => {
      if (err || (data.taskArns && data.taskArns.length === 0)) {
        return reject(new Error(`Could not find tasks in cluster ${clusterName}`));
      }
      return resolve(data.taskArns || []);
    });
  })
    .then(taskArns => new Promise((resolve) => {
      ecsClient.describeTasks(
        { cluster: clusterName, tasks: taskArns },
        (err, { tasks = [] } = {}) => resolve(tasks),
      );
    }));
};

const stopTask = ({
  awsRegion,
  clusterName,
  taskArn,
}) => new Promise((resolve) => {
  const ecsClient = createEcs({ awsRegion });
  ecsClient.stopTask(
    {
      cluster: clusterName,
      task: taskArn,
      reason: 'Task is obsolete',
    },
    (err, data) => {
      if (err) {
        // not rejecting as we don't want this whole script to fail if clean up fails
        console.log(`Could not stop task ${taskArn}`, err);
        return resolve();
      }
      console.log(`Stopped previous task: ${taskArn}`);
      return resolve(data);
    },
  );
});

const findTask = ({
  awsRegion,
  clusterName,
  subDomain,
}) => new Promise(resolve => listAndDescribeTasks({ awsRegion, clusterName })
  .then((tasks = []) => {
    if (tasks.length > 0) {
      const task = tasks.find(el => el.taskDefinitionArn.includes(subDomain));
      if (task) {
        console.log(`Found task: ${task.taskDefinitionArn}`);
        return resolve(task);
      }
      // not rejecting as we want the chain to keep going
      console.log(`Could not find a task matching branch: ${subDomain}`);
      return resolve();
    }
    return resolve();
  }));

const stopPreviousTasks = ({
  awsRegion,
  subDomain,
  clusterName,
  revision,
}) => new Promise((resolve, reject) => {
  listAndDescribeTasks({ awsRegion, clusterName })
    .then((tasks) => {
      if (tasks.length > 0) {
        const promises = [];
        tasks.forEach((tsk) => {
          if (
            tsk.taskDefinitionArn.includes(subDomain)
            && !tsk.taskDefinitionArn.includes(`${subDomain}:${revision}`)
          ) {
            const promise = stopTask({ awsRegion, clusterName, taskArn: tsk.taskArn });
            promises.push(promise);
          }
        });
        if (promises.length > 0) {
          console.log('---------------- CLEANING UP AWS RESOURCES');
        }
        return Promise.all(promises);
      }
      return Promise.resolve();
    })
    .then(() => resolve())
    .catch(error => reject(error));
});

/**
 * waitForPolicyAndCreateCluster
 * we need to wait for the IAM policy to be attached the IAM user
 * and for this change to have propagated throughout AWS,
 * before being able to create a cluster.
 * Unforutnately AWS doesn't provide an API to safely check for this.
 * IAM.listAttachedUserPolicies will list the policy as attached
 * even though the change has not yet fully propagated:
 * https://stackoverflow.com/questions/20156043/how-long-should-i-wait-after-applying-an-aws-iam-policy-before-it-is-valid
 */
const waitForPolicyAndCreateCluster = async ({
  awsRegion,
  iamUsername,
}) => {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const ecsClient = createEcs({ awsRegion });
  let timeout = 100;
  while (true) {
    await delay(timeout); // eslint-disable-line no-await-in-loop
    try {
      timeout *= 1.2;
      const data = await ecsClient.createCluster({ clusterName: WONQA_CLUSTER_NAME }).promise(); // eslint-disable-line no-await-in-loop
      return data;
    } catch (err) {
      if (err && !err.message.includes(`${iamUsername} is not authorized to perform`)) {
        console.log('Error while creating a cluster');
        throw err;
      }
      if (timeout >= 60000) {
        throw new Error('Request timed out');
      }
    }
  }
};

module.exports = {
  getCluster,
  registerTaskDefinition,
  deregisterTaskDefinition,
  deregisterPreviousTaskDefinitions,
  runTask,
  findTask,
  stopTask,
  waitForTaskRunning,
  stopPreviousTasks,
  waitForPolicyAndCreateCluster,
};
