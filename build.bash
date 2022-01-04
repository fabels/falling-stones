#!/bin/bash
version=$(cat package.json | jq '.version' | sed "s/\"//g")

docker build -t gummelhummel/falling-stones:${version} -t gummelhummel/falling-stones:latest .