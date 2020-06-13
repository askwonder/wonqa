#!/usr/bin/env bash

set -e # exit on non 0 codes
set -u # error out on failed param expansion

check_aws() {
  which aws || (
    echo >&2 "Please install aws: https://docs.aws.amazon.com/cli/latest/userguide/installing.html"
    exit 1
  )
}

check_credentials() {
  credentials_set=false

  echo "Checking to ensure that aws credentials are set... "

  # aws credentials can be made available either by the ~/.aws/credentials file
  # or via environmental variables.
  # see: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html
  if [[ -e ~/.aws/credentials ]]; then
     echo "~/.aws/credentials found"
     credentials_set=true
  fi

  if [ ${AWS_ACCESS_KEY_ID+x} ]; then
    echo "AWS env variables found"
    credentials_set=true
  fi

  if [ "$credentials_set" = "false" ]; then
    echo >&2 "No aws credentials found. Please make sure to configure your aws credentials: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html"
    exit 1
  fi
}

check-ecs-cli() {
  which ecs-cli || (
    echo >&2
      "Please install aws-cli: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_CLI_installation.html"
      "Or using: brew install amazon-ecs-cli"
    exit 1
  )
}

echo "Checking for required dependencies"
check_aws
check_credentials
check-ecs-cli

# if awsRegion has not been set us the one set in the proper env variable
if [ -z ${awsRegion+x} ]; then
   awsRegion=${AWS_DEFAULT_REGION}
fi

echo $awsRegion

echo "Configuring AWS"
aws --version
aws configure set default.region $awsRegion
aws configure set default.output json
$(aws ecr get-login --no-include-email --region "${awsRegion}")
echo "AWS configured!"
