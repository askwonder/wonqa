#!/usr/bin/env bash

# You can use this script to build Docker images for a given repo/Dockerfile, and push these images to a given image repository
# When running the script, ensure you have the following env. variables setup:
# REPO_PATH: the path to the repo that you want to build an image from. The Dockerfile used to create the image should be present at the root of the repo
# subDomain: the name of the subdomain you will use to access your QA environment. We recommend using your branch name which you can generate by using ./branch.sh. From /wonqa, simply run: "subDomain=`bash ./examples/branch.sh` bash examples/images.sh"
# REMOTE_PATH: the path of the image registry used to host your images. We recommend using an ECR repository: https://docs.aws.amazon.com/AmazonECR/latest/userguide/Repositories.html

set -e # exit on non 0 codes
set -u # error out on failed param expansion

which docker || (
  echo >&2 "Please install docker (https://docs.docker.com/docker-for-mac/install/) and run: docker login"
  exit 1
)

cd $REPO_PATH
docker build -t "$REMOTE_PATH:$subDomain" .
echo "✅   Built docker image at path $REPO_PATH"
docker push $REMOTE_PATH:$subDomain
echo "✅   Pushed $REMOTE_PATH:$subDomain image to remote repo"