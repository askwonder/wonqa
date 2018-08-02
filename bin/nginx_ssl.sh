#!/usr/bin/env bash

set -e # exit on non 0 codes
set -u # error out on failed param expansion

which docker || (
  echo >&2 "Please install docker (https://docs.docker.com/docker-for-mac/install/) and run: docker login"
  exit 1
)

cd $WONQA_DIR/nginx

REMOTE="$imageRepositoryPath:$subDomain"

docker build -t $REMOTE .
echo "✅   Built nginx Docker image"
docker push $REMOTE
echo "✅   Pushed nginx image to repo"

# clean up
rm -rf $WONQA_DIR/nginx/cert
