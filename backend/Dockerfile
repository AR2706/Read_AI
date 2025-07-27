# Use a Node.js base image that also includes Python for your ML scripts
FROM node:18-slim

# Install Python and pip
# Using apt-get for Debian-based slim image
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    # Add any other system dependencies for pdfplumber or other libraries if needed
    # e.g., libpoppler-dev if pdfplumber requires it for some reason (unlikely for basic text extraction)
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app/backend

# Copy Node.js package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install --production # Install only production dependencies

# Copy Python requirements file and install dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy the rest of your backend files, including server.js, run_model.py, and model2.pkl
# The .dockerignore file (see below) will prevent node_modules and uploads from being copied
COPY . .

# Expose the port your Node.js backend listens on
EXPOSE 8000 # Your server.js listens on 8000

# Command to run your Node.js backend server
CMD ["node", "server.js"]
