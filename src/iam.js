const AWS = require('aws-sdk');
const {
  WONQA_POLICY_NAME,
  WONQA_ECS_EXECUTION_ROLE,
} = require('./constants');

const createIam = ({ awsRegion }) => new AWS.IAM({ region: awsRegion });

const ensureAuthenticated = ({
  awsRegion,
  iamUsername,
} = {}) => new Promise((resolve, reject) => {
  const iamClient = createIam({ awsRegion });
  iamClient.getUser({ UserName: iamUsername }, (err, data = {}) => {
    if (err) { return reject(err); }
    const { User: { UserName } } = data;
    console.log(`👋   Welcome ${UserName}`);
    return resolve(data);
  });
});

const confirmRegion = ({ awsRegion } = {}) => new Promise((resolve, reject) => {
  if (!AWS.config.region) {
    AWS.config.region = awsRegion;
  }
  if (AWS.config.region !== awsRegion) {
    return reject(new Error(`The provided AWS region does not seem to match the configured region. Provided: ${awsRegion}. Configured: ${AWS.config.region}`));
  }
  console.log(`🌎   Region: ${awsRegion}`);
  return resolve(awsRegion);
});

const createWonqaPolicy = async ({ awsRegion }) => {
  const iamClient = createIam({ awsRegion });
  const params = {
    PolicyName: WONQA_POLICY_NAME,
    PolicyDocument: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'iam:PassRole',
            'iam:GetUser',
            'logs:PutLogEvents',
            'logs:CreateLogStream',
            'logs:CreateLogGroup',
            'ec2:DescribeNetworkInterfaces',
            'ecr:*',
            'ecs:*',
          ],
          Resource: '*',
        },
        {
          Effect: 'Allow',
          Action: [
            'iam:CreateServiceLinkedRole',
            'iam:PutRolePolicy',
          ],
          Resource: 'arn:aws:iam::*:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS*',
          Condition: { StringLike: { 'iam:AWSServiceName': 'ecs.amazonaws.com' } },
        },
      ],
    }),
  };
  const data = await iamClient.createPolicy(params).promise();
  console.log('Created WonqaAccess IAM policy');
  return data.Policy;
};

const attachUserPolicy = async ({
  awsRegion,
  iamUsername,
  policy = {},
}) => {
  const iamClient = createIam({ awsRegion });
  const params = {
    PolicyArn: policy.Arn,
    UserName: iamUsername,
  };
  const res = await iamClient.attachUserPolicy(params).promise();
  console.log(`Attached policy ${policy.PolicyName} to IAM user ${iamUsername}`);
  return res;
};

const creatEcsExecutionRole = async ({ awsRegion }) => {
  const iamClient = createIam({ awsRegion });
  // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
  const params = {
    AssumeRolePolicyDocument: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: 'ecs-tasks.amazonaws.com',
          },
          Action: 'sts:AssumeRole',
        },
      ],
    }),
    Path: '/',
    RoleName: WONQA_ECS_EXECUTION_ROLE,
    Description: 'Allows ECS tasks to call AWS services on your behalf.',
    MaxSessionDuration: '3600',
  };
  const data = await iamClient.createRole(params).promise();
  console.log('Created IAM role: ecsExecutionRole');
  return data.Role;
};

const attachRolePolicy = async ({
  awsRegion,
  role,
  policy,
}) => {
  const iamClient = createIam({ awsRegion });
  const params = {
    PolicyArn: policy.PolicyArn,
    RoleName: role.RoleName,
  };
  const data = await iamClient.attachRolePolicy(params).promise();
  console.log(`Attached policy ${policy.PolicyArn} to IAM role ${role.RoleName}`);
  return data;
};

module.exports = {
  ensureAuthenticated,
  confirmRegion,
  createWonqaPolicy,
  attachUserPolicy,
  attachRolePolicy,
  creatEcsExecutionRole,
};
