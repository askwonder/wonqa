const NGINX_REPOSITORY_NAME = 'wonqa-nginx';
const WONQA_POLICY_NAME = 'WonqaAccess';
const WONQA_CLUSTER_NAME = 'wonqa-cluster';
const WONQA_ECS_EXECUTION_ROLE = 'ecsExecutionRole';
const WONQA_SECURITY_GROUP_NAME = 'wonqa-security-group';

const AmazonECSTaskExecutionRolePolicy = {
  PolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
};
const CloudWatchLogsFullAccess = {
  PolicyArn: 'arn:aws:iam::aws:policy/CloudWatchLogsFullAccess',
};
const WonqaDefaultSecurityGroupIngress = {
  IpPermissions: [
    {
      FromPort: 80,
      ToPort: 80,
      IpProtocol: 'tcp',
      IpRanges: [
        {
          CidrIp: '0.0.0.0/0',
        },
      ],
    },
    {
      FromPort: 443,
      ToPort: 443,
      IpProtocol: 'tcp',
      IpRanges: [
        {
          CidrIp: '0.0.0.0/0',
        },
      ],
    },
    {
      FromPort: 443,
      ToPort: 443,
      IpProtocol: 'tcp',
      Ipv6Ranges: [
        {
          CidrIpv6: '::/0',
        },
      ],
    },
  ],
};

module.exports = {
  NGINX_REPOSITORY_NAME,
  WONQA_POLICY_NAME,
  WONQA_CLUSTER_NAME,
  WONQA_ECS_EXECUTION_ROLE,
  WONQA_SECURITY_GROUP_NAME,
  AmazonECSTaskExecutionRolePolicy,
  CloudWatchLogsFullAccess,
  WonqaDefaultSecurityGroupIngress,
};
