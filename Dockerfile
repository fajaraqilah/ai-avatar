# Dockerfile khusus Hugging Face Spaces (Diletakkan di Root Folder)
FROM node:20-bullseye-slim

# Install system dependencies (Python3, pip, ffmpeg, curl, unzip)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    ffmpeg \
    curl \
    unzip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set python3 sebagai default python cmd
RUN ln -s /usr/bin/python3 /usr/bin/py || true

# Set working directory ke /app
WORKDIR /app

# Download dan install Rhubarb Lip Sync Linux
RUN curl -L -o rhubarb.zip https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip \
    && unzip rhubarb.zip \
    && mv Rhubarb-Lip-Sync-1.13.0-Linux /app/Rhubarb-Lip-Sync \
    && rm rhubarb.zip

# Copy backend dependencies ke container
COPY avatar-backend/package*.json ./
COPY avatar-backend/requirements.txt ./

# Install Node.js dependencies
RUN npm ci --omit=dev

# Install Python dependencies & gTTS
RUN pip3 install --no-cache-dir -r requirements.txt gTTS

# Copy seluruh file backend ke working directory
COPY avatar-backend/ .

# Buat symlink agar kode execPromise dapat mencari Rhubarb & FFmpeg secara seragam
RUN mkdir -p /ffmpeg/bin && ln -s /usr/bin/ffmpeg /ffmpeg/bin/ffmpeg.exe || true \
    && mkdir -p /Rhubarb-Lip-Sync/bin && ln -s /app/Rhubarb-Lip-Sync/rhubarb /Rhubarb-Lip-Sync/bin/rhubarb.exe || true

# Hugging Face menggunakan PORT default 7860 untuk Spaces (Docker)
ENV PORT=7860
EXPOSE 7860

CMD ["node", "index.js"]
