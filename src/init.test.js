const AWS = require('aws-sdk-mock');
const init = require('./init');
const {
  WONQA_POLICY_NAME,
  WONQA_CLUSTER_NAME,
  WONQA_ECS_EXECUTION_ROLE,
  NGINX_REPOSITORY_NAME,
  WONQA_SECURITY_GROUP_NAME,
  WonqaDefaultSecurityGroupIngress,
} = require('./constants');
const {
  getString,
} = require('./utils');

describe('init', () => {
  console.log = jest.fn();

  const iamUsername = getString();
  const awsRegion = getString();
  const policyArn = getString();
  const policy = { PolicyName: WONQA_POLICY_NAME, Arn: policyArn };
  const roleName = getString();
  const role = { RoleName: roleName };
  const clusterArn = getString();
  const cluster = { clusterArn };
  const VpcId = getString();
  const createdDefaultVpcId = getString();
  const SubnetId = getString();
  const createdDefaultSubnetId = getString();
  const securityGroupId = getString();

  // mocks
  const createPolicy = jest.fn().mockImplementation(() => Promise.resolve({ Policy: policy }));
  const attachUserPolicy = jest.fn().mockImplementation(() => Promise.resolve());
  const createRole = jest.fn().mockImplementation(() => Promise.resolve({ Role: role }));
  const attachRolePolicy = jest.fn().mockImplementation(() => Promise.resolve({}));
  const createCluster = jest.fn().mockImplementation(() => Promise.resolve({ cluster }));
  const createRepository = jest.fn().mockImplementation(() => Promise.resolve());
  const putLifecyclePolicy = jest.fn()
    .mockImplementation(() => Promise.resolve({ Policy: policy }));
  const describeVpcs = jest.fn().mockImplementation(() => Promise.resolve({ Vpcs: [{ VpcId, IsDefault: true }] }));
  const createDefaultVpc = jest.fn()
    .mockImplementation(() => Promise.resolve({ Vpc: { VpcId: createdDefaultVpcId } }));
  const describeSubnets = jest.fn()
    .mockImplementation(() => Promise.resolve({ Subnets: [{ SubnetId }] }));
  const describeAvailabilityZones = jest.fn()
    .mockImplementation(() => Promise.resolve({ AvailabilityZones: [{ State: 'available', ZoneName: 'us-east-1a' }] }));
  const createDefaultSubnet = jest.fn()
    .mockImplementation(() => Promise.resolve({ Subnet: { SubnetId: createdDefaultSubnetId } }));
  const createSecurityGroup = jest.fn()
    .mockImplementation(() => Promise.resolve({ GroupId: securityGroupId }));
  const authorizeSecurityGroupIngress = jest.fn()
    .mockImplementation(() => Promise.resolve(true));

  // mock aws-sdk functions with default mocks or overrides provided by each test
  const mock = ({
    createCluster: overrideCreateCluster,
    describeVpcs: overrideDescribeVpcs,
    describeSubnets: overrideDescribeSubnets,
  } = {}) => {
    AWS.mock('IAM', 'createPolicy', createPolicy);
    AWS.mock('IAM', 'attachUserPolicy', attachUserPolicy);
    AWS.mock('IAM', 'createRole', createRole);
    AWS.mock('IAM', 'attachRolePolicy', attachRolePolicy);
    AWS.mock('ECS', 'createCluster', overrideCreateCluster || createCluster);
    AWS.mock('ECR', 'createRepository', createRepository);
    AWS.mock('ECR', 'putLifecyclePolicy', putLifecyclePolicy);
    AWS.mock('EC2', 'describeVpcs', overrideDescribeVpcs || describeVpcs);
    AWS.mock('EC2', 'createDefaultVpc', createDefaultVpc);
    AWS.mock('EC2', 'describeSubnets', overrideDescribeSubnets || describeSubnets);
    AWS.mock('EC2', 'describeAvailabilityZones', describeAvailabilityZones);
    AWS.mock('EC2', 'createDefaultSubnet', createDefaultSubnet);
    AWS.mock('EC2', 'createSecurityGroup', createSecurityGroup);
    AWS.mock('EC2', 'authorizeSecurityGroupIngress', authorizeSecurityGroupIngress);
  };

  const restoreMocks = () => {
    AWS.restore('IAM');
    AWS.restore('ECS');
    AWS.restore('ECR');
    AWS.restore('EC2');
  };

  test('throws if iamUsername or awsRegion are not provided', () => {
    expect(init({ iamUsername })).rejects.toThrow();
    expect(init({ awsRegion })).rejects.toThrow();
    expect(init()).rejects.toThrow();
  });

  test('creates the IAM wonqa policy', async () => {
    mock();
    await init({ iamUsername, awsRegion });
    const {
      PolicyName,
      PolicyDocument,
    } = createPolicy.mock.calls[0][0];
    expect(PolicyName).toEqual(WONQA_POLICY_NAME);
    const { Statement } = JSON.parse(PolicyDocument);
    const a1 = Statement[0].Action;
    const expected1 = [
      'iam:PassRole',
      'iam:GetUser',
      'logs:PutLogEvents',
      'logs:CreateLogStream',
      'logs:CreateLogGroup',
      'ec2:DescribeNetworkInterfaces',
      'ecr:*',
      'ecs:*',
    ];
    const expected2 = [
      'iam:CreateServiceLinkedRole',
      'iam:PutRolePolicy',
    ];
    const a2 = Statement[1].Action;
    expect(expected1).toEqual(expect.arrayContaining(a1));
    expect(expected2).toEqual(expect.arrayContaining(a2));
    restoreMocks();
  });

  test('attaches the IAM wonqa policy to the iam Username', async () => {
    mock();
    await init({ iamUsername, awsRegion });
    const {
      PolicyArn,
      UserName,
    } = attachUserPolicy.mock.calls[0][0];
    expect(PolicyArn).toEqual(policyArn);
    expect(UserName).toEqual(iamUsername);
    restoreMocks();
  });

  test('creates the ecsExecutionRole', async () => {
    mock();
    await init({ iamUsername, awsRegion });
    const {
      RoleName,
      AssumeRolePolicyDocument,
    } = createRole.mock.calls[0][0];
    expect(RoleName).toEqual(WONQA_ECS_EXECUTION_ROLE);
    const { Statement } = JSON.parse(AssumeRolePolicyDocument);
    const { Action, Effect, Principal } = Statement[0];
    expect(Effect).toEqual('Allow');
    expect(Principal.Service).toEqual('ecs-tasks.amazonaws.com');
    expect(Action).toEqual('sts:AssumeRole');
    restoreMocks();
  });

  test('attaches the AmazonECSTaskExecutionRolePolicy to the ecsRoleExecution role', async () => {
    mock();
    await init({ iamUsername, awsRegion });
    const {
      PolicyArn,
      RoleName,
    } = attachRolePolicy.mock.calls[0][0];
    expect(PolicyArn).toEqual(expect.stringContaining('arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'));
    expect(RoleName).toEqual(roleName);
    restoreMocks();
  });

  test('attaches the CloudWatchLogsFullAccess to the ecsRoleExecution role', async () => {
    mock();
    await init({ iamUsername, awsRegion });
    const {
      PolicyArn,
      RoleName,
    } = attachRolePolicy.mock.calls[1][0];
    expect(PolicyArn).toEqual(expect.stringContaining('arn:aws:iam::aws:policy/CloudWatchLogsFullAccess'));
    expect(RoleName).toEqual(roleName);
    restoreMocks();
  });

  test('creates the wonqa-cluster', async () => {
    mock();
    await init({ iamUsername, awsRegion });
    const { clusterName } = createCluster.mock.calls[0][0];
    expect(clusterName).toEqual(WONQA_CLUSTER_NAME);
    restoreMocks();
  });

  test('keeps trying to create the cluster if the IAM policy hasn\'t yet propagated', async () => {
    const createCluster2 = jest.fn()
      .mockImplementationOnce(() => Promise.reject(new Error(`${iamUsername} is not authorized to perform`)))
      .mockImplementationOnce(() => Promise.resolve({ cluster }));
    mock({ createCluster: createCluster2 });
    AWS.mock('IAM', 'createPolicy', createPolicy);
    await init({ iamUsername, awsRegion });
    expect(createCluster2.mock.calls.length).toEqual(2);
    restoreMocks();
  });

  test('creates the nginx ECR repository', async () => {
    mock();
    await init({ iamUsername, awsRegion });
    const { repositoryName } = createRepository.mock.calls[0][0];
    expect(repositoryName).toEqual(NGINX_REPOSITORY_NAME);
    restoreMocks();
  });

  test('Puts the lifecycle policy on the nginx ECR repository', async () => {
    mock();
    await init({ iamUsername, awsRegion });
    const {
      lifecyclePolicyText,
      repositoryName,
    } = putLifecyclePolicy.mock.calls[0][0];
    const {
      rules,
    } = JSON.parse(lifecyclePolicyText);
    expect(repositoryName).toEqual(NGINX_REPOSITORY_NAME);
    expect(rules[0].action.type).toEqual('expire');
    expect(rules[0].selection.countType).toEqual('sinceImagePushed');
    expect(rules[0].selection.countUnit).toEqual('days');
    expect(rules[0].selection.tagStatus).toEqual('untagged');
    restoreMocks();
  });

  test('finds the default VPC and uses it to describeSubnets', async () => {
    mock();
    await init({ iamUsername, awsRegion });
    const {
      Filters,
    } = describeSubnets.mock.calls[0][0];
    expect(Filters[0].Values[0]).toEqual(VpcId);
    restoreMocks();
  });

  test('creates a default VPC is no default is found', async () => {
    const describeVCPsNoDefault = jest.fn()
      .mockImplementation(() => Promise.resolve({ Vpcs: [{ IsDefault: false }] }));
    const describeSubnetsWithCreatedDefaultVPC = jest.fn()
      .mockImplementation(() => Promise.resolve({ Subnets: [{ SubnetId }] }));
    mock({
      describeVpcs: describeVCPsNoDefault,
      describeSubnets: describeSubnetsWithCreatedDefaultVPC,
    });
    await init({ iamUsername, awsRegion });
    const {
      Filters,
    } = describeSubnetsWithCreatedDefaultVPC.mock.calls[0][0];
    expect(Filters[0].Values[0]).toEqual(createdDefaultVpcId);
    restoreMocks();
  });

  test('finds the default subnet', async () => {
    mock();
    const { subnets } = await init({ iamUsername, awsRegion });
    expect(subnets[0].SubnetId).toEqual(SubnetId);
    restoreMocks();
  });

  test('creates a default subnet if none is found', async () => {
    const noSubnets = jest.fn()
      .mockImplementation(() => Promise.resolve({ Subnets: [] }));
    mock({ describeSubnets: noSubnets });
    const { subnets } = await init({ iamUsername, awsRegion });
    expect(subnets[0].SubnetId).toEqual(createdDefaultSubnetId);
    restoreMocks();
  });

  test('creates the wonqa security group', async () => {
    mock();
    const { securityGroups } = await init({ iamUsername, awsRegion });
    expect(securityGroups[0]).toEqual(securityGroupId);
    const {
      GroupName,
      VpcId: paramVpcId,
    } = createSecurityGroup.mock.calls[0][0];
    expect(GroupName).toEqual(WONQA_SECURITY_GROUP_NAME);
    expect(paramVpcId).toEqual(VpcId);
    restoreMocks();
  });

  test('authorizes the security group with ingress rules for HTTP and HTTPS', async () => {
    mock();
    await init({ iamUsername, awsRegion });
    const {
      GroupId,
      IpPermissions,
    } = authorizeSecurityGroupIngress.mock.calls[0][0];
    expect(GroupId).toEqual(securityGroupId);
    expect(IpPermissions)
      .toEqual(expect.objectContaining(WonqaDefaultSecurityGroupIngress.IpPermissions));
    restoreMocks();
  });
});
