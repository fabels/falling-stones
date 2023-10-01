#!/bin/bash
version=$(cat package.json | jq '.version' | sed "s/\"//g")

docker build -t registry.if-then-els.de/falling-stones:${version} -t registry.if-then-els.de/falling-stones:latest .
docker push registry.if-then-els.de/falling-stones:${version}
docker push registry.if-then-els.de/falling-stones:latest
