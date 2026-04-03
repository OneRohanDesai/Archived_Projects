#!/bin/bash

# GitOps trigger
git add k8s/ && git commit -m "Update deployment" && git push
echo "ArgoCD auto-deploys from Sourcehut"