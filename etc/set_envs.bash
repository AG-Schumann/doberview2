#!/bin/bash

for line in $(cat /Users/jarongrigat/Documents/doberview2/etc/env_vars); do
  if [[ -z $line ]]; then
    continue
  fi
  export "${line//\'/}"
  echo "export ${line//\'/}"
done
