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

const listImages = async ({ awsRegion, repositoryName }) => {
  const ecrClient = createEcr({ awsRegion });
  try {
    const { imageIds = [] } = await ecrClient.listImages({ repositoryName }).promise() || {};
    return imageIds;
  } catch (error) {
    throw new Error(error);
  }
};

const deleteImages = async ({
  awsRegion,
  subDomain,
  repositoryName,
}) => {
  const imageIds = await listImages({ awsRegion, repositoryName });
  const toDelete = [];
  imageIds.forEach((image) => {
    if (image.imageTag && image.imageTag.includes(subDomain)) {
      toDelete.push(image);
    }
  });
  if (toDelete.length > 0) {
    const ecrClient = createEcr({ awsRegion });
    try {
      const res = await ecrClient.batchDeleteImage({ imageIds: toDelete, repositoryName }).promise();
      if (res.failures && res.failures.length > 0) {
        console.log(`Could not delete images for repo: ${repositoryName}`);
        return res.failures;
      }
      console.log(`Deleted image for repo: ${repositoryName}`, res.imageIds);
      console.log(res);
      return res;
    } catch (err) {
      console.log(`Could not delete images for repo: ${repositoryName}`);
      console.log(err);
      return err;
    }
  }
  return Promise.resolve();
};

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
