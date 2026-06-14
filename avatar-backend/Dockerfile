# Multi-stage Dockerfile to build Guru Virtual AI backend with Node.js, Python, FFmpeg, and Rhubarb Lip Sync.
FROM node:20-bullseye-slim

# Install system dependencies (Python3, pip, curl, unzip, ffmpeg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    ffmpeg \
    curl \
    unzip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set python3 as default python
RUN ln -s /usr/bin/python3 /usr/bin/py || true

# Set working directory
WORKDIR /app

# Download and install Rhubarb Lip Sync for Linux
RUN curl -L -o rhubarb.zip https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip \
    && unzip rhubarb.zip \
    && mv Rhubarb-Lip-Sync-1.13.0-Linux /app/Rhubarb-Lip-Sync \
    && rm rhubarb.zip

# Copy backend dependencies
COPY package*.json ./
COPY requirements.txt ./

# Install Node.js dependencies
RUN npm ci --omit=dev

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt gTTS

# Copy the rest of the application files
COPY . .

# Buat link symlink agar kode execPromise dapat mencari Rhubarb & FFmpeg secara seragam baik di lokal maupun di Render
# Di lokal pathnya: ..\Rhubarb-Lip-Sync\bin\rhubarb.exe dan ..\ffmpeg\bin\ffmpeg.exe
# Di Docker Linux kita letakkan di folder yang setara di luar /app/
RUN mkdir -p /ffmpeg/bin && ln -s /usr/bin/ffmpeg /ffmpeg/bin/ffmpeg.exe || true \
    && mkdir -p /Rhubarb-Lip-Sync/bin && ln -s /app/Rhubarb-Lip-Sync/rhubarb /Rhubarb-Lip-Sync/bin/rhubarb.exe || true

EXPOSE 3000

CMD ["node", "index.js"]
