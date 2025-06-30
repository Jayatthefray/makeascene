#!/bin/sh
# Usage: sh push.sh "Your commit message"
git add .
git commit -m "$1"
git push origin main 