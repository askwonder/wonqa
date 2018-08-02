const fs = require('fs');
const util = require('util');
const spawnPromise = require('./spawnPromise');

const readFilePromise = util.promisify(fs.readFile);

const logs = ({
  aws: { awsRegion, clusterName } = {},
  WONQA_DIR,
  container,
}) => readFilePromise(`${WONQA_DIR}/task.json`)
  .then((tsk) => {
    const { taskID } = JSON.parse(tsk.toString());
    if (!taskID) {
      throw new Error(`
Wonqa can't find the task ID of your most recent task.
This ID should be stored in wonqa/task.json but this file may have been deleted if wonqa was removed from your node_modules directory.
Try running wonqa.create() again to regenerate a new task and its ID, and running wonqa.logs(<container>) after.

Alternatively, you can find your current running tasks by running list-tasks, and finding the task ID for a given task.
https://docs.aws.amazon.com/cli/latest/reference/ecs/list-tasks.html

And you can get the logs by running:
ecs-cli logs --follow --region <awsRegion> --task-id <taskID> --cluster <clusterName> --container-name <containerName>

You can also log into the AWS console and navigate to the Elastic Container Service page, find your cluster and click on the "tasks" tab. 
You can then click on a task and find the logs for each container.
      `);
    }
    return spawnPromise('ecs-cli', [
      'logs',
      '--follow',
      '--region',
      awsRegion,
      '--task-id',
      taskID,
      '--cluster',
      clusterName,
      '--container-name',
      container,
    ]);
  })
  .catch(error => console.log('Wonqa error: ', error));

module.exports = logs;
