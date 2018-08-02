BRANCH="${BRANCH:-`git rev-parse --abbrev-ref HEAD`}" # could also use: $(echo $CIRCLE_SHA1 | cut -c -7)
echo ${BRANCH//[^A-Za-z0-9_]/-} # replace non alpha numeric with -%