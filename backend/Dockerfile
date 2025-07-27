# Use a Node.js base image that also includes Python for your ML scripts
FROM node:18-slim

# Install Python and pip
# Using apt-get for Debian-based slim image
# Add build-essential and other common dependencies for Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    build-essential \
    libpoppler-cpp-dev \
    pkg-config \
    # Clean up apt caches to keep image size down
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app/backend

# Copy Node.js package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install --production # Install only production dependencies

# Copy Python requirements file and install dependencies
COPY requirements.txt ./
# --- FIX THIS LINE: Added --break-system-packages ---
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages
# --- END FIX ---

# Copy the rest of your backend files, including server.js, run_model.py, and model2.pkl
# The .dockerignore file (see below) will prevent node_modules and uploads from being copied
COPY . .

# Expose the port your Node.js backend listens on
EXPOSE 7866 

# Command to run your Node.js backend server
CMD ["node", "server.js"]
