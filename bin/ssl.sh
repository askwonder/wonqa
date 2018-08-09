#!/usr/bin/env bash

set -e # exit on non 0 codes
set -u # error out on failed param expansion
set -x # print commands

which docker || (
  echo >&2 "Please install docker (https://docs.docker.com/docker-for-mac/install/) and run: docker login"
  exit 1
)

ARCHIVE="etc/letsencrypt/archive/$subDomain.$rootDomain/"
CERT_DIR="$cachePath/$ARCHIVE"

echo "Cache path: $cachePath"
echo "Currently in cache:"
ls "./etc/letsencrypt/archive/" || echo "./etc/letsencrypt/archive/ is not a directory"

if [[ ! -d $CERT_DIR ]]; then
  # Generate cert
  cd "$WONQA_DIR"
  docker build -t "wonqa-certbot" -f "dnsimple/Dockerfile" .
  docker run -i --name wonqa-certbot wonqa-certbot:latest \
    certonly \
    --dns-dnsimple \
    --dns-dnsimple-credentials dnsimple.ini \
    --agree-tos \
    --no-eff-email \
    -m $email \
    -d "$domains"

  # Move cert to common location for Dockerfile build
  mkdir -p $CERT_DIR
  WONQA_CERTBOT=$(docker ps -aqf "name=wonqa-certbot")
  # '.' after $CERT_DIR is required or `docker cp` will cp directory instead of its content
  echo "Copying certs to $CERT_DIR"
  docker cp $WONQA_CERTBOT:$ARCHIVE. $CERT_DIR
  echo "Removing wonqa-certbot container"
  docker rm wonqa-certbot -f
else
  echo "Using SSL certs cached at $CERT_DIR"
fi

mkdir -p $WONQA_DIR/nginx/cert
echo "Copying certs into wonqa/nginx/cert"
cp -R $CERT_DIR* $WONQA_DIR/nginx/cert
ls $WONQA_DIR/nginx/cert # log result
