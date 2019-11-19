# Wonqa 
Wonqa makes it easy to create disposable SSL-enabled staging environments using AWS Fargate and accessible through custom DNS: `https://your-branch-name.your-domain`.
These environments are useful for any type of QA, from manual testing to functional tests.

Read the release announcement [here](https://medium.com/wonder-engineering/on-demand-qa-environments-with-aws-fargate-c23b41f15a0c).

## Install
Wonqa runs in [node](https://nodejs.org/en/) and is available through [npm](https://www.npmjs.com/)
```
npm i --save-dev wonqa
```

## Download machine dependencies
Wonqa relies on software not included in the npm package:
- [Node ^8.11](https://nodejs.org/en/download/)
- [aws](https://docs.aws.amazon.com/cli/latest/userguide/installing.html)
- [ecs-cli](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_CLI_installation.html)
- [Docker](https://docs.docker.com/docker-for-mac/install/): wonqa uses Docker to enable HTTPS on your environment. See [HTTPS](https://github.com/askwonder/wonqa_test#enable-ssl-with-a-dnsimple-account) below for more details. Run `docker login` once docker is installed on your machine.

## Setup AWS resources
Wonqa provides a `init()` method which will configure all required AWS resources for you. If you use init, simply call it **once** to setup the required AWS resources. If you prefer configuring AWS resources by yourself, see the list of required resources below.

### Using `wonqa.init()`
You'll need an AWS account, an IAM user with basic permissions and to save your AWS credentials to your local aws credentials file:
1. Create an [AWS account](https://aws.amazon.com/free/) if you don't already have one. Ensure the account is fully activated (you'll get a confirmation email from AWS once the account is fully activated).
2. Create an [IAM user](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html#id_users_create_console) with the `Programmatic access` access type. When prompted to give the user permissions, click on `Attach existing policies directly` and select the `IAMFullAccess` policy. This will allow wonqa to make a set of API calls to setup AWS resources on your behalf. You can remove this permission after calling `init()`.
3. Once the user is created, you'll be shown a confirmation page with the user's `Access key ID` and `Secret access key` which you'll need to save to the default profile of your `~/.aws/credentials` file (see [here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html) for more). Do not delete this file or wonqa won't be able to function: wonqa uses the NodeJS aws-sdk which, in turn, uses this file to make API calls to AWS services.
```
[default]
aws_access_key_id = <ACCESS_KEY_ID>
aws_secret_access_key = <SECRET_ACCESS_KEY>
```
4. Call `init()` once

```js
const { init } = require('wonqa');
// !! You only need to run this once.
init({
  iamUsername: 'string', // the username of your IAM user
  awsRegion: 'string', // the awsRegion where your services will be created and run
});
```

`Init()` will do the following: 
- attach an IAM policy named `WonqaAccess` to the provided IAM user
- create a IAM role named `ecsExecutionRole` and attach the following policies to that role: `AmazonECSTaskExecutionRolePolicy` and `CloudWatchLogsFullAccess`
- create a Fargate-enabled ECS cluster named `wonqa-cluster`
- create a ECR repository named `wonqa-nginx` and add a lifecycle policy that repository
- find your default VPC in the given region or create one
- find an available subnet tied to that VPC, or create a default one 
- create a security group attached to this VPC with ingress rules for HTTP and HTTPS

After running `init()` you should see a console log with the IDs of the created resources which you can then use to call `wonqa.create()`

### Configuring AWS resources without `wonqa.init()`
Wonqa relies on several AWS resources which you'll need to create.
- an [AWS account](https://aws.amazon.com/free/)
- an [IAM user](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html) with the following premissions:
  - "iam:PassRole",
  - "iam:GetUser",
  - "logs:PutLogEvents",
  - "logs:CreateLogStream",
  - "logs:CreateLogGroup",
  - "ec2:DescribeNetworkInterfaces",
  - "ecr:*",
  - "ecs:*",
- an [IAM role](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) 'ecsExecutionRole' with the `AmazonECSTaskExecutionRolePolicy` and `CloudWatchLogsFullAccess` policies attached.
- an [ECR repo](https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-create.html). This image registry is used to store the images of the SSL-enabled nginx images matched to your provided subDomain and rootDomain.
- a Fargate-enabled [ECS cluster](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create_cluster.html) and related VPC resources:
  - AWS creates [default VPC resources](https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/default-vpc.html) when you create an account. If you do not have these created, you'll need to create a [VPC](https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/GetStarted.html) in the same availability zone as the `awsRegion` you provide to the wonqa constructor, as well as one or more [subnets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-public-private-vpc.html) pointing to a [route table](https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Route_Tables.html) which includes at least a route with destination `0.0.0.0/0` pointing to a target [internet gateway](https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Internet_Gateway.html) (this will give internet access to your VPC and therefore the resources running your environment)
  - You'll also need one of more [security groups](https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_SecurityGroups.html#WorkingWithSecurityGroups) permissioned with the relevant inbound rules for your application. Your security group must at least have an inbound rule for HTTP traffic as well as HTTPS traffic (`TCP 443 0.0.0.0/0` and `TCP 443 ::/0`) or you will not be able to access your container

## How to run wonqa
```js
const { Wonqa } = require('wonqa');

// initialize the client
const wonqa = new Wonqa({
  ...options // see below for more details and examples
});

// create your environment (this generally takes 1-3 mins as AWS provisions the resources)
wonqa.create();
```

Once a task is running, you can get logs for a container by calling:
```js
// tail the logs of the container named api
wonqa.logs('api');
```

To clean up resources created when running `.create()`, use:
```js
// delete resources created by the last .create() call
wonqa.prune();
```

## Example config:
This is an example config

```js
const wonqa = new Wonqa({
  https: {
    dnsimpleToken: '8ftZw6dk19fzaDJdkdl2929QIqbjoiLL',    // optional
    dnsProvider: 'DNSIMPLE || ROUTE_53',
    email: 'bob@domain.com',                              // required
    cachePath: '/Users/bob/Desktop/myApp',                // required
    nginx: {
      configurationPath: '/Users/bob/nginx.conf',         // optional
      servers: [                                          // at least 1 is required
        { default: true, port: 8000, },                   // default application port
        { serverName: 'api', port: 3000 }                 // additional server definitions are optional
      ],
      imageRepositoryPath: '012012012.dkr.ecr.us-east-1.amazonaws.com/wonqa-nginx',   // optional
    },
  },
  dns: {
    rootDomain: 'myDomain.com',                           // required
    subDomain: 'feature-cats',                            // required
    dnsProvider: 'DNSIMPLE || ROUTE_53'                   // required
    dnsimpleToken: '8ftZw6dk19fzaDJdkdl2929QIqbjoiLL',    // required if dnsProvider is dnsimple
    dnsimpleAccountID: '19291291',                        // required if dnsProvider is dnsimple
    hostedZoneId: 'ZDJDJJO12345S',                        // required if dnsProvider is route53
    createDNSRecords: () => Promise,                      // optional
  },
  aws: {
    awsAccountID: '012012012',                            // required
    awsRegion: 'us-east-1',                               // required
    iamUsername: 'bob',                                   // required
    clusterName: 'wonqa-cluster',                         // required
    subnets: ['subnet-7c629102'],                         // required
    securityGroups: ['sg-f2o903cd3'],                     // required
    cpu: '256',                                           // required
    memory: '512',                                        // required
    containerDefinitions: [                               // at least 1 container definition is required
      {
        name: 'frontend',                                 // required
        image: '012012012.dkr.ecr.us-east-1.amazonaws.com/frontend:feature-cats', // required
        portMappings: [                                   // optional
          { containerPort: 8000, hostPort: 8000, protocol: 'tcp' },
        ],
        command: ['npm', 'run', 'start'],                 // optional
        // for all possible container parameters, see:
        // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#container_definitions 
      },
      {
        name: 'api',
        image: '012012012.dkr.ecr.us-east-1.amazonaws.com/api:feature-cats',
        portMappings: [
          { containerPort: 3000, hostPort: 3000, protocol: 'tcp' },
        ],
        command: ['npm', 'run', 'start:server'],
      },
    ],
  },
  preCreate: [ () => Promise, () => Promise ],            // optional
  postCreate: [ () => Promise, () => Promise ],           // optional
  onSuccess: () => Promise,                               // optional
  onError: () => Promise,                                 // optional
});
```

## HTTPS
By default, wonqa adds HTTPS to your environment.

#### Why `https.dnsimpleToken`, `https.email`?
Wonqa uses the [certbot/dns-dnsimple](https://hub.docker.com/r/certbot/dns-dnsimple/) and [certbot/dns-route53](https://hub.docker.com/r/certbot/dns-route53/) Docker image to generate [LetsEncrypt](https://letsencrypt.org/) SSL certificates using certbot's plugins.
Wonqa currently only supports certbot's DNSimple and Route53 plugins and so you'll need a DNSimple or AWS account, but we welcome PRs to support additional DNS providers through [Certbot's plugins](https://certbot.eff.org/docs/using.html).

#### Why `https.nginx`?
To enable Internet traffic to hit your SSL-enabled QA environment living inside AWS Fargate, wonqa will configure a [nginx](https://www.nginx.com/) container to proxy HTTPs traffic from the Internet to the containers running your app code.

#### Why `https.cachePath`?
To avoid hitting LetsEncrypt's [rate limits](https://letsencrypt.org/docs/rate-limits/) you'll need to provide the wonqa constructor with an absolute path to a local directory that wonqa can use to cache certificates in between builds. For eg: `/Users/bob/Desktop/myApp` where myApp is a directory. Wonqa create a directory named `etc` at this path to store SSL certificates. For example, if you provide the path `/Users/bob/Desktop/myApp`, wonqa will create `/Users/bob/Desktop/myApp/etc` where `etc` is a directory.
Tips: 
- add `/Users/bob/Desktop/myApp/etc` to your `.gitignore` file if you don't want your SSL certificates to be checked-in
- if you run the wonqa process in CI, you can use the same path to cache certs remotely

## DNS
Once your environment is up and running, DNS records can be created to point a user-friendly URL to the environment's AWS IP.

By default, wonqa will use DNSimple to create or edit DNS records. If you use DNSimple, simply pass your DNSimple creds to the wonqa constructor. 

wonqa will also create DNS records for Route53.

If you prefer a custom implementation, you can pass a `createDNSRecords` function to the wonqa constructor. This function will be called with the publicIP as its only argument and should return a Promise which resolves when the records are created. Wonqa will call this function as soon as the environment is running inside AWS and will poll the given `https://subDomain.rootDomain` URL for a 200 OK once the promise has resolved.

## Reference
#### HTTPS
- `dnsimpleAccountID` [string] **required**: The ID of your DNSimple account required to generate SSL certificates.

- `dnsimpleToken` [string] **required**: Your DNSimple API token required to generate SSL certificates.

- `dnsProvider` [string] **required**: The DNS provider of choice (currently only DNSIMPLE or ROUTE_53).

- `imageRepositoryPath` [string]: The path of an AWS ECR image repository used by wonqa to store the SSL-enabled nginx image for each QA environment. If this is undefined, Wonqa will look for an ECR repository in your account with the name "wonqa-nginx"  or create it.

- `email` [string] **required**: the email used to register SSL certs using [certbot](https://certbot.eff.org/docs/using.html)

- `cachePath` [string] **required**: The path to a local directory wonqa will use to cache your SSL certificates.

- `configurationPath` [string]: The path to a local file containing your nginx configuration. For a sample configuration, see this [example](/askwonder/wonqa/blob/master/examples/nginx.conf)

- `servers` [array] **required**: an array of objects defining the server names and ports used by wonqa to generate the [nginx config](https://nginx.org/en/docs/http/server_names.html) used to build the nginx image. This image will be used by a container which will proxy SSL traffic to the containers with your app code living inside the [AWS Fargate network](https://aws.amazon.com/blogs/compute/task-networking-in-aws-fargate/). This array should contain at least one object defining the base port that your app listens on, for eg: `[{ default: true, port: 8000 }]`. If your app uses multiple domains and ports (one for a client bundle and one for a backend bundle, for example), wonqa will need to generate SSL certificates for each additional domain as well as configure nginx to proxy traffic to each domain/port. In this case, provide additional objects in this array to define the subdomains and ports used. For eg: `[{ default: true, port: 8000 }, { serverName: 'api', port: 3000 }]` will allow your environment to be accessible at `<subDomain>.<rootDomain>` (traffic will be proxied to this URL on port 8000) and `api.<subDomain>.<rootDomain>` (traffic will be proxied to this URL on port 3000). !! The `serverName` values should be in lowercase.

- `awsLogsGroup` [string]: the [log group](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html) used by the nginx container. Defaults to: "wonqa-log-group" 

- `awsLogsRegion` [string]: the [log region](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html) used by the nginx container. Defaults to the provided awsRegion.

- `awsLogsStreamPrefix` [string]: the [log stream prefix](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html) used by the nginx container. Defaults to the provided "wonqa".

#### DNS
- `dnsimpleAccountID` [string] **required if createDNSRecords is undefined**: The ID of your DNSimple account.

- `dnsimpleToken` [string] **required if createDNSRecords is undefined**: Your DNSimple API token.

- `dnsProvider` [string] **required**: The DNS provider of choice (currently only DNSIMPLE or ROUTE_53).

- `hostZoneId` [string]  The host zone id of rootDomain in AWS.

- `rootDomain` [string] **required**: The domain used for your QA environment. For eg: `google.com`. This is also the domain used to create DNS records if you use DNSimple.

- `subDomain` [string] **required**: The sub-domain where your QA environment will be located. We recommend using your current branch name re-formatted to be in lowercase and with only alphanumerical characters and dash characters (to be URL safe!). You can easily get this by running:
```bash
BRANCH=`git rev-parse --abbrev-ref HEAD` # get git branch name
echo ${BRANCH//[^A-Za-z0-9]/-} # strip out everything but alphanumerical and dash characters
```

- `createDNSRecords` [function]: By default Wonqa will create DNS records using DNSimple. You can override this behavior by providing this callback. This function will accept 1 argument, the AWS PublicIP used to run your task, and should return a Promise which resolves when the DNS records have been created.

#### AWS
- `awsAccountID` [string] **required**: The ID for your AWS account

- `awsRegion` [string] **required**: The AWS region where your resources are located

- `iamUsername` [string] **required**: The IAM user with all the required permissions to run AWS commands

- `clusterName` [string] **required**: The name of the ECS cluster where your environment will live

- `subnets` [array] **required**: The AWS VPC subnets used to run your tasks. You can use any public subnet linked to the VPC which runs the Fargate cluster.

- `securityGroups` [array] **required**: The AWS security groups used to access your VPC. Make sure to add ingress rules for all ports/protocols required by your app.

- `cpu` [string] **required**: the CPU value required for your task to run. More info [here](https://aws.amazon.com/blogs/compute/migrating-your-amazon-ecs-containers-to-aws-fargate/).

- `memory` [string] **required**: the memory value required for your task to run. More info [here](https://aws.amazon.com/blogs/compute/migrating-your-amazon-ecs-containers-to-aws-fargate/).

- `containerDefinitions` [array] **required**: An array of container definition objects that Wonqa uses to create your AWS containers. Each object must include the following basic parameters
  - `name` [string] **required**: the name of the container.
  - `image` [string] **required**: the path of the Docker image for this container. Checkout ./utils/images.sh and ./utils/Dockerfile for examples on how to create Docker images and push them to an ECR repo
You can also define optional parameters such as:
  - `portMappings` [array]: An array of objects defining port mappings between the host (the AWS agent) and your container. For eg: `[{ containerPort: 3000, hostPort: 3000, protocol: 'tcp' }]`
  - `cpu` [number]: the CPU amount to be reserved for this container
  - `memoryReservation` [number]: the memory allocated for this container
  - `command` [array]: The commands to be passed to the container at run-time. For eg: `['npm', 'run', 'start']`
  - `environment` [array]: environment variables to be passed to the container. For eg: `[{ name: 'NODE_ENV', value: 'test' }]`
  - `logConfiguration` [object]: AWS log configs. This defaults to: `{ logDriver: 'awslogs', options: { 'awslogs-group': 'wonqa-log-group', 'awslogs-region': <awsRegion>, 'awslogs-stream-prefix': 'wonqa' }}`
  - Learn more about all possible AWS container definition parameters [here](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#container_definitions).

#### Other options
- `preCreate` [array]: This should be an array of functions which return Promises. Wonqa waits for every promise to resolve before creating your QA environment. This can be useful to perform some custom cleanup of resources, or push notifications to Github.

- `postCreate` [array]: This should be an array of functions which return Promises. Wonqa waits for every promise to resolve before finishing its process. This is useful to perform additional custom cleanup, or push notifications to Github.

- `onSuccess` [function]: A function which will be called once the QA environment is running and returns a 200 OK. It is called with 1 argument, the URL of the environment, and should return a Promise.

- `onError` [function]: A function which will be called if an error is encountered. It is called with 1 argument, the error object, and should return a Promise.

## AWS resource management & keeping costs low
Wonqa helps you keep your costs low by pruning stale resources each time you create a new QA environment. 

Each time you call `wonqa.create()`, wonqa will first create a QA environment and use your provided subDomain and an incremental revision ID to tag the created AWS resources. At the end of this process, wonqa will look for any AWS resource which match the provided subDomain and a previous revision ID and delete those.

You can also use `wonqa.prune()` to delete any resources created by the last `create()` call. `prune()` will find the ECS task linked to the given `subDomain` and stop it, then deregister the related task definition, then delete the images stored in the `wonqa-nginx` ECR repo (or the ECR repo at `imageRepositoryPath`) also tagged with the provided `subDomain`. By default, this call will also delete DNS records created by default, unless you overrode this behavior by providing a `createDNSRecords` callback. For eg., you can call `prune()` whenever a PR is merged using GitHub webhooks.

If you use AWS's ECR service to host your images, you may want to consider adding [lifecycle policies](https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html) on each repo to automatically delete images after a given time period.

## Troubleshooting
If you run `init()` more than once, you'll see errors as wonqa tries to create resources that have already been created by a previous call. You'll need to log into the AWS console to delete these resources and try again.

If the `wonqa.create()` runs but you are unable to accessing your environment causes a timeout (for eg., if it hangs on `Waiting for your QA env to return a 200 OK`), this probably means that the security group that you are using does not have ingress rules for HTTP and HTTPS as well as the rules required by your app to work.
