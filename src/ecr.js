const AWS = require('aws-sdk');

const createEcr = ({ awsRegion } = {}) => new AWS.ECR({ region: awsRegion });

const describeRepositories = ({ awsRegion }) => new Promise((resolve, reject) => {
  const ecrClient = createEcr({ awsRegion });
  ecrClient.describeRepositories({}, (err, { repositories = [] } = {}) => {
    if (err) { return reject(err); }
    return resolve(repositories);
  });
});

const createRepository = async ({ awsRegion, repositoryName }) => {
  const ecrClient = createEcr({ awsRegion });
  await ecrClient.createRepository({ repositoryName }).promise();
};

const listImages = ({ awsRegion, repositoryName }) => new Promise((resolve) => {
  const ecrClient = createEcr({ awsRegion });
  ecrClient.listImages({ repositoryName }, (err, data = {}) => {
    if (err) {
      console.log(`Could not list images for repo: ${repositoryName}`);
      return resolve();
    }
    const { imageIds } = data;
    return resolve(imageIds);
  });
});

const deleteImages = ({
  awsRegion,
  subDomain,
  repositoryName,
}) => new Promise((resolve, reject) => listImages({ awsRegion, repositoryName })
  .then((imageIds) => {
    const toDelete = [];
    imageIds.forEach((image) => {
      if (image.imageTag && image.imageTag.includes(subDomain)) {
        toDelete.push(image);
      }
    });
    if (toDelete.length > 0) {
      const ecrClient = createEcr({ awsRegion });
      ecrClient.batchDeleteImage({ imageIds: toDelete, repositoryName }, (err, data = {}) => {
        if (err || (data.failures && data.failures.length > 0)) {
          console.log(`Could not delete images for repo: ${repositoryName}`);
          reject(err, data);
        } else {
          console.log(`Deleted image for repo: ${repositoryName}`, data.imageIds);
          resolve();
        }
      });
    } else {
      resolve();
    }
  }));

const putLifecyclePolicy = async ({ awsRegion, repositoryName }) => {
  const ecrClient = createEcr({ awsRegion });
  const params = {
    lifecyclePolicyText: JSON.stringify({
      rules: [
        {
          action: { type: 'expire' },
          description: 'Delete stale wonqa images',
          rulePriority: 1,
          selection: {
            countNumber: 30,
            countType: 'sinceImagePushed',
            countUnit: 'days',
            tagStatus: 'untagged',
          },
        },
      ],
    }),
    repositoryName,
  };
  const res = await ecrClient.putLifecyclePolicy(params).promise();
  console.log(`Added lifecycle policy to ECR repo ${repositoryName}`);
  return res;
};

module.exports = {
  describeRepositories,
  createRepository,
  listImages,
  deleteImages,
  putLifecyclePolicy,
};
