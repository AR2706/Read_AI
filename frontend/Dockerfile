# Stage 1: Build the React application
FROM node:18-slim as build-stage

WORKDIR /app/frontend

# Copy package.json and install Node.js dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of your frontend source code
COPY . .

# Build the React app
# Assuming 'npm run build' generates static files in a 'dist' folder
RUN npm run build

# Stage 2: Serve the React application with Nginx
FROM nginx:stable-alpine as production-stage

# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from the build-stage
# Adjust '/app/frontend/dist' if your build output directory is different (e.g., 'build')
COPY --from=build-stage /app/frontend/dist /usr/share/nginx/html

# Expose port 80 for the web server
EXPOSE 80

# Command to start Nginx
CMD ["nginx", "-g", "daemon off;"]
