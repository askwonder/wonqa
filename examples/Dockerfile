# This is a simple example Dockerfile
# Refer to the reference here for more: https://docs.docker.com/engine/reference/builder/

# What other image should this image extend
FROM node:8.11

# Copy dependencies
COPY package*.json ./

# Install dependencies
RUN npm install --silent

# Create build context. This will copy all the files at the same level as this Dockerfile
# This Dockerfile should be at the same level as your app code for this command to copy your app code into the image: myapp/Dockerfile
COPY . ./

# Build code inside the image
# You can also build the code before running `docker build` and only COPY your built code
RUN npm run build

# Expose any port this app requires to communicate with a client (aka the 'host')
EXPOSE 3000

# The command to execute when the image is ran
CMD [ "npm", "run", "start" ]
