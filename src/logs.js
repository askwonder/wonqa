const fs = require('fs');
const util = require('util');
const spawnPromise = require('./spawnPromise');

const readFilePromise = util.promisify(fs.readFile);

const logs = ({
  aws: { awsRegion, clusterName } = {},
  WONQA_DIR,
  container,
}) => new Promise((resolve, reject) => {
  readFilePromise(`${WONQA_DIR}/task.json`)
    .then((tsk) => {
      const { taskID } = JSON.parse(tsk.toString());
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
    .then(() => resolve())
    .catch(error => reject(error));
}).catch(error => console.log('Wonqa error: ', error));

module.exports = logs;
