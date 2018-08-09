const fs = require('fs');
const util = require('util');
const spawnPromise = require('./spawnPromise');
const {
  describeRepositories,
  createRepository,
} = require('./ecr');
const {
  NGINX_REPOSITORY_NAME,
} = require('./constants');

const writeFilePromise = util.promisify(fs.writeFile);
const deleteFilePromise = util.promisify(fs.unlink);

const buildAndPush = ({
  awsAccountID,
  awsRegion,
  WONQA_DIR,
  subDomain,
  imageRepositoryPath,
} = {}) => new Promise((resolve, reject) => {
  if (imageRepositoryPath) {
    spawnPromise('bash', [`${WONQA_DIR}/bin/nginx_ssl.sh`], {
      WONQA_DIR,
      imageRepositoryPath,
      subDomain,
    })
      .then(() => resolve())
      .catch(err => reject(err));
  } else {
    // ensure default ECR wonqa-nginx ECR repo exists or create it
    describeRepositories({ awsRegion })
      .then((repositories = []) => {
        const wonqaNginxExists = repositories
          .some(({ repositoryArn }) => repositoryArn.includes(NGINX_REPOSITORY_NAME));
        return !wonqaNginxExists
          ? createRepository({ awsRegion, repositoryName: NGINX_REPOSITORY_NAME })
          : Promise.resolve();
      })
      .then(() => {
        const imageRepository = `${awsAccountID}.dkr.ecr.${awsRegion}.amazonaws.com/${NGINX_REPOSITORY_NAME}`;
        return spawnPromise('bash', [`${WONQA_DIR}/bin/nginx_ssl.sh`], {
          WONQA_DIR,
          imageRepositoryPath: imageRepository,
          subDomain,
        });
      })
      .then(() => resolve())
      .catch(err => reject(err));
  }
});


const writeConfFile = ({
  WONQA_DIR,
  servers,
  configurationPath,
}) => new Promise((resolve, reject) => {
  let config;

  if (configurationPath) {
    config = fs.readFileSync(configurationPath);
  } else {
    const serverConfig = (port, serverName) => `
  server {
    ${serverName ? (`listen 443 ssl; \n    server_name ${serverName}.*;`) : 'listen 443 ssl default_server;'}
    location / {
      proxy_pass http://localhost:${port}/;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header Host $http_host;
      proxy_redirect off;
      proxy_http_version 1.1;
      proxy_set_header    Upgrade           $http_upgrade;
      proxy_set_header    Connection        "upgrade";
    }
  }`;

    const s = servers.map(({ port, serverName }) => serverConfig(port, serverName));

    config = `
http {
  ssl_certificate     /etc/ssl/fullchain1.pem;
  ssl_certificate_key /etc/ssl/privkey1.pem;

  map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
  }
  ${s.toString().replace(new RegExp('},', 'g'), '}\n')}
}
events {
  accept_mutex on;
  worker_connections 1024;
} 
    `;
  }

  writeFilePromise(`${WONQA_DIR}/nginx/ecs-nginx.conf`, config)
    .then((buf = '') => resolve(buf.toString()))
    .catch(err => reject(err));
});

const deleteConfFile = ({ WONQA_DIR }) => new Promise((resolve, reject) => {
  deleteFilePromise(`${WONQA_DIR}/nginx/ecs-nginx.conf`)
    .then(() => resolve())
    .catch(err => reject(err));
});

module.exports = {
  buildAndPush,
  writeConfFile,
  deleteConfFile,
};
