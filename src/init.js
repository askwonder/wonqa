const {
  NGINX_REPOSITORY_NAME,
  WONQA_CLUSTER_NAME,
  AmazonECSTaskExecutionRolePolicy,
  CloudWatchLogsFullAccess,
  WonqaDefaultSecurityGroupIngress,
} = require('./constants');
const {
  createWonqaPolicy,
  attachUserPolicy,
  creatEcsExecutionRole,
  attachRolePolicy,
} = require('./iam');
const {
  waitForPolicyAndCreateCluster,
} = require('./ecs');
const {
  createRepository,
  putLifecyclePolicy,
} = require('./ecr');
const {
  findOrCreateDefaultVPC,
  findOrCreateDefaultSubnet,
  createSecurityGroup,
  authorizeSecurityGroupIngress,
} = require('./ec2');

const init = async ({
  iamUsername,
  awsRegion,
} = {}) => {
  if (!iamUsername || typeof iamUsername !== 'string') {
    throw new Error('Missing iamUsername');
  }
  if (!awsRegion || typeof awsRegion !== 'string') {
    throw new Error('Missing awsRegion');
  }
  try {
    const policy = await createWonqaPolicy({ awsRegion });
    await attachUserPolicy({ awsRegion, iamUsername, policy });
    const role = await creatEcsExecutionRole({ awsRegion });
    await attachRolePolicy({ awsRegion, role, policy: AmazonECSTaskExecutionRolePolicy });
    await attachRolePolicy({ awsRegion, role, policy: CloudWatchLogsFullAccess });
    await waitForPolicyAndCreateCluster({ awsRegion, iamUsername });
    await createRepository({ awsRegion, repositoryName: NGINX_REPOSITORY_NAME });
    await putLifecyclePolicy({ awsRegion, repositoryName: NGINX_REPOSITORY_NAME });
    const defaultVPC = await findOrCreateDefaultVPC({ awsRegion });
    const defaultSubnet = await findOrCreateDefaultSubnet({ awsRegion, vpcId: defaultVPC.VpcId });
    const securityGroupId = await createSecurityGroup({ awsRegion, vpcId: defaultVPC.VpcId });
    const rule = { GroupId: securityGroupId, ...WonqaDefaultSecurityGroupIngress };
    await authorizeSecurityGroupIngress({ awsRegion, rule, securityGroupId });

    // print out results for user to copy paste
    console.log(`
--------SUCCESS--------
You can now use the following options:
awsRegion: ${awsRegion}
clusterName: ${WONQA_CLUSTER_NAME}
subnets: [${defaultSubnet.SubnetId}]
securityGroups: [${securityGroupId}]
    `);
    return {
      awsRegion,
      clusterName: WONQA_CLUSTER_NAME,
      subnets: [defaultSubnet],
      securityGroups: [securityGroupId],
    };
  } catch (error) {
    console.log('Wonqa error:', error);
    return process.exit(1);
  }
};

module.exports = init;
