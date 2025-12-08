# Universal NGINX Streaming Microservice
# Multistage build: Compile NGINX with RTMP module + FFmpeg

# Stage 1: Build NGINX with RTMP module
FROM alpine:3.19 as builder

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    ca-certificates \
    openssl-dev \
    pcre-dev \
    zlib-dev \
    linux-headers \
    curl \
    git \
    wget \
    tar

# NGINX and module versions
ENV NGINX_VERSION=1.25.3 \
    NGINX_RTMP_VERSION=1.2.2

# Download and extract NGINX
RUN cd /tmp && \
    wget http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz && \
    tar -xzf nginx-${NGINX_VERSION}.tar.gz

# Clone RTMP module
RUN cd /tmp && \
    git clone https://github.com/arut/nginx-rtmp-module.git

# Configure and compile NGINX with RTMP module
RUN cd /tmp/nginx-${NGINX_VERSION} && \
    ./configure \
    --prefix=/etc/nginx \
    --sbin-path=/usr/sbin/nginx \
    --modules-path=/usr/lib/nginx/modules \
    --conf-path=/etc/nginx/nginx.conf \
    --error-log-path=/var/log/nginx/error.log \
    --http-log-path=/var/log/nginx/access.log \
    --pid-path=/var/run/nginx.pid \
    --lock-path=/var/run/nginx.lock \
    --http-client-body-temp-path=/var/cache/nginx/client_temp \
    --http-proxy-temp-path=/var/cache/nginx/proxy_temp \
    --http-fastcgi-temp-path=/var/cache/nginx/fastcgi_temp \
    --http-uwsgi-temp-path=/var/cache/nginx/uwsgi_temp \
    --http-scgi-temp-path=/var/cache/nginx/scgi_temp \
    --user=nginx \
    --group=nginx \
    --with-http_ssl_module \
    --with-http_realip_module \
    --with-http_addition_module \
    --with-http_sub_module \
    --with-http_dav_module \
    --with-http_flv_module \
    --with-http_mp4_module \
    --with-http_gunzip_module \
    --with-http_gzip_static_module \
    --with-http_random_index_module \
    --with-http_secure_link_module \
    --with-http_stub_status_module \
    --with-http_auth_request_module \
    --with-threads \
    --with-stream \
    --with-stream_ssl_module \
    --with-stream_realip_module \
    --with-http_slice_module \
    --with-file-aio \
    --with-http_v2_module \
    --add-module=/tmp/nginx-rtmp-module && \
    make -j$(nproc) && \
    make install

# Stage 2: Runtime image
FROM alpine:3.19

LABEL maintainer="Universal Streaming Engine"
LABEL description="Netflix-like streaming microservice with NGINX RTMP + HLS + ABR"

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    openssl \
    pcre \
    zlib \
    ffmpeg \
    curl \
    bash \
    python3 \
    py3-pip

# Copy compiled NGINX from builder
COPY --from=builder /usr/sbin/nginx /usr/sbin/nginx
COPY --from=builder /etc/nginx /etc/nginx
COPY --from=builder /usr/lib/nginx /usr/lib/nginx

# Create nginx user and required directories
RUN addgroup -S nginx && adduser -S nginx -G nginx && \
    mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp \
    /var/log/nginx \
    /var/www/html \
    /tmp/hls \
    /tmp/dash \
    /tmp/rec \
    /etc/nginx/keys && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /var/www/html /tmp/hls /tmp/dash /tmp/rec /etc/nginx/keys && \
    chmod -R 755 /tmp/hls /tmp/dash /tmp/rec /etc/nginx/keys

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY scripts/generate-keys.sh /usr/local/bin/generate-keys.sh
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/generate-keys.sh /usr/local/bin/entrypoint.sh

# Expose ports
EXPOSE 1935 8080 8443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/stat || exit 1

# Start NGINX
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]