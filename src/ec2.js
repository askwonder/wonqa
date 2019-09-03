const AWS = require('aws-sdk');
const {
  WONQA_SECURITY_GROUP_NAME,
} = require('./constants');

const createEc2 = ({ awsRegion } = {}) => new AWS.EC2({ region: awsRegion });

const getPublicIP = ({ awsRegion, runningTask }) => new Promise((resolve, reject) => {
  const ec2Client = createEc2({ awsRegion });
  const eniID = runningTask.attachments[0].details.find(
    el => el.name === 'networkInterfaceId',
  ).value;
  const params = { NetworkInterfaceIds: [eniID] };
  ec2Client.describeNetworkInterfaces(params, (err, data) => {
    if (err) { console.log(err); return reject(err); }
    const { NetworkInterfaces } = data;
    const { PublicIp } = (NetworkInterfaces[0] || {}).Association || {};
    return resolve(PublicIp);
  });
});

const findOrCreateDefaultVPC = async ({ awsRegion }) => {
  const ec2Client = createEc2({ awsRegion });
  const { Vpcs = [] } = await ec2Client.describeVpcs().promise() || {};
  const defaultVPC = Vpcs.find(el => el.IsDefault);
  if (!defaultVPC) {
    console.log(`Could not find a default VPC in awsRegion: ${awsRegion}...creating one.`);
    const { Vpc } = await ec2Client.createDefaultVpc().promise();
    console.log('Created new default VPC');
    return Vpc;
  }
  console.log(`Found default VPC in awsRegion: ${awsRegion}.`);
  return defaultVPC;
};

const findOrCreateDefaultSubnet = async ({ awsRegion, vpcId }) => {
  const ec2Client = createEc2({ awsRegion });
  const params = {
    Filters: [
      {
        Name: 'vpc-id',
        Values: [vpcId],
      },
    ],
  };
  const { Subnets = [] } = await ec2Client.describeSubnets(params).promise();
  if (Subnets.length > 0) {
    console.log(`Found default subnet ${Subnets[0].SubnetId} in zone ${awsRegion} for VPC ${vpcId}.`);
    return Subnets[0];
  }
  console.log(`Could not find a default subnet in zone ${awsRegion} for VPC ${vpcId}...creating one.`);
  const zoneParams = {
    Filters: [
      {
        Name: 'region-name',
        Values: [awsRegion],
      },
    ],
  };
  const {
    AvailabilityZones = [],
  } = await ec2Client.describeAvailabilityZones(zoneParams).promise();
  const zone = AvailabilityZones.find(z => z.State === 'available');
  const {
    Subnet,
  } = await ec2Client.createDefaultSubnet({ AvailabilityZone: zone.ZoneName }).promise();
  console.log(`Created default subnet ${Subnet.SubnetId} in zone ${awsRegion} for VPC ${vpcId}.`);
  return Subnet;
};

const createSecurityGroup = async ({ awsRegion, vpcId }) => {
  const ec2Client = createEc2({ awsRegion });
  const params = {
    Description: 'Wonqa Security Group',
    GroupName: WONQA_SECURITY_GROUP_NAME,
    VpcId: vpcId,
  };
  const { GroupId } = await ec2Client.createSecurityGroup(params).promise();
  return GroupId;
};

const authorizeSecurityGroupIngress = async ({ awsRegion, rule, securityGroupId }) => {
  const ec2Client = createEc2({ awsRegion });
  const res = await ec2Client.authorizeSecurityGroupIngress(rule).promise();
  console.log(`Authorized security group ${securityGroupId} with ingress rule: ${JSON.stringify(rule.IpPermissions)}`);
  return res;
};

module.exports = {
  getPublicIP,
  findOrCreateDefaultVPC,
  findOrCreateDefaultSubnet,
  createSecurityGroup,
  authorizeSecurityGroupIngress,
};
