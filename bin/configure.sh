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
  if [[ ! -e ~/.aws/credentials ]]; then
    echo >&2 "Please add your aws credentials to ~/.aws/credentials: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html"
    exit 1
  else
    echo "~/.aws/credentials"
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

echo "Configuring AWS"
aws --version
aws configure set default.region $awsRegion
aws configure set default.output json
aws ecr get-login-password | docker login --username AWS --password-stdin https://$awsAccountID.dkr.ecr.$awsRegion.amazonaws.com
echo "AWS configured!"
