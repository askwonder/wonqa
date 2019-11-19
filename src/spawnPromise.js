const { spawn } = require('child_process');

const spawnPromise = (cmd, args = [], env = {}) => new Promise((resolve, reject) => {
  if (typeof cmd !== 'string') {
    return reject(new Error('cmd is not a string'));
  }
  if (!Array.isArray(args)) {
    return reject(new Error('args is not an array'));
  }
  if (env && typeof env !== 'object') {
    return reject(new Error('env is not an object'));
  }
  if (args.length === 0) {
    return reject(new Error('args is empty'));
  }
  args.forEach((arg) => {
    if (typeof arg !== 'string') {
      return reject(new Error(`Arg ${arg} is not a string`));
    }
  });
  const sp = spawn(cmd, [...args], {
    env: {
      ...process.env,
      ...env,
    },
  });
  sp.stdout.on('data', (data) => {
    console.log(data.toString());
  });
  sp.stderr.on('data', (data) => {
    console.log(data.toString());
    // not rejecting anymore but we should if certbot can push logs to stdout
    // reject(data.toString());
  });
  sp.on('error', (data) => {
    console.log('Error in spawned child process', data.toString());
    return reject(data.toString());
  });
  sp.on('exit', (data) => {
    if (typeof data === 'number' && data !== 0) {
      return reject(new Error(`Spawned child process error code': ${data}`));
    }
    const exitMsg = data.toString();
    console.log('Spawned child process exits', exitMsg);
    return resolve(exitMsg);
  });
});

module.exports = spawnPromise;
