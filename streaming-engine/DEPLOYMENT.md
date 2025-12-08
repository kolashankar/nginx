# 🚀 Universal NGINX Streaming Engine - Deployment Guide

This guide covers everything you need to deploy the streaming engine from development to production.

---

## Table of Contents

1. [Quick Start (Local Development)](#quick-start-local-development)
2. [Docker Deployment](#docker-deployment)
3. [Docker Compose Deployment](#docker-compose-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [AWS Deployment](#aws-deployment)
6. [Production Checklist](#production-checklist)
7. [Scaling Guide](#scaling-guide)
8. [Monitoring Setup](#monitoring-setup)

---

## Quick Start (Local Development)

### Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- 4GB+ RAM
- 10GB+ free disk space

### Steps

```bash
# 1. Navigate to the streaming-engine directory
cd streaming-engine

# 2. Create environment file
cp .env.example .env

# 3. Build and start services
docker-compose up --build

# 4. Verify services are running
curl http://localhost:8080/health
curl http://localhost:8000/health

# 5. Access the demo player
open http://localhost:8080
```

### Test Streaming

**Using OBS Studio:**
1. Settings → Stream
2. Service: Custom
3. Server: `rtmp://localhost:1935/live`
4. Stream Key: `demo`
5. Start Streaming

**Using FFmpeg:**
```bash
ffmpeg -re -i test-video.mp4 -c:v libx264 -c:a aac -f flv rtmp://localhost:1935/live/demo
```

**Watch Stream:**
- Browser: `http://localhost:8080` (enter stream key: demo)
- Direct HLS: `http://localhost:8080/hls/demo.m3u8`
- Statistics: `http://localhost:8080/stat`

---

## Docker Deployment

### Single Container

```bash
# Build image
docker build -t streaming-engine:latest .

# Run container
docker run -d \
  --name streaming-engine \
  -p 1935:1935 \
  -p 8080:8080 \
  -e ALLOWED_STREAM_KEYS=stream1,stream2,stream3 \
  -e HLS_ENCRYPTION_KEY=$(openssl rand -hex 16) \
  -v $(pwd)/data/hls:/tmp/hls \
  -v $(pwd)/data/recordings:/tmp/rec \
  streaming-engine:latest

# View logs
docker logs -f streaming-engine

# Stop container
docker stop streaming-engine
docker rm streaming-engine
```

### With Custom Configuration

```bash
docker run -d \
  --name streaming-engine \
  -p 1935:1935 \
  -p 8080:8080 \
  -e ALLOWED_STREAM_KEYS=mystream \
  -v $(pwd)/custom-nginx.conf:/etc/nginx/nginx.conf:ro \
  -v $(pwd)/data:/tmp \
  streaming-engine:latest
```

---

## Docker Compose Deployment

### Standard Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps

# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Production Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  streaming:
    image: your-registry.com/streaming-engine:latest
    restart: always
    ports:
      - "1935:1935"
      - "8080:8080"
    environment:
      - HLS_ENCRYPTION_KEY=${HLS_ENCRYPTION_KEY}
      - ALLOWED_STREAM_KEYS=${ALLOWED_STREAM_KEYS}
      - HTTP_CALLBACK_URL=https://api.yourapp.com
    volumes:
      - /mnt/nfs/hls:/tmp/hls
      - /mnt/nfs/recordings:/tmp/rec
    networks:
      - streaming-net
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 2G
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  streaming-net:
    driver: overlay
```

Deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Kubernetes Deployment

### Step 1: Create Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: streaming
```

```bash
kubectl apply -f namespace.yaml
```

### Step 2: Create Secrets

```bash
# Generate secrets
kubectl create secret generic streaming-secrets \
  --from-literal=hls-key=$(openssl rand -hex 16) \
  --from-literal=webhook-secret=$(openssl rand -hex 32) \
  --from-literal=stream-keys=stream1,stream2,stream3 \
  -n streaming
```

### Step 3: Create ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: streaming-config
  namespace: streaming
data:
  nginx.conf: |
    # Your nginx.conf content here
    # (Copy from nginx.conf file)
```

```bash
kubectl apply -f configmap.yaml
```

### Step 4: Create Persistent Volume

```yaml
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: hls-storage
  namespace: streaming
spec:
  accessModes:
    - ReadWriteMany  # Required for multiple pods
  resources:
    requests:
      storage: 100Gi
  storageClassName: efs-sc  # Use EFS, NFS, or similar
```

```bash
kubectl apply -f pvc.yaml
```

### Step 5: Create Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: streaming-engine
  namespace: streaming
spec:
  replicas: 3
  selector:
    matchLabels:
      app: streaming
  template:
    metadata:
      labels:
        app: streaming
    spec:
      containers:
      - name: streaming
        image: your-registry.com/streaming-engine:latest
        ports:
        - containerPort: 1935
          name: rtmp
        - containerPort: 8080
          name: http
        env:
        - name: HLS_ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: streaming-secrets
              key: hls-key
        - name: ALLOWED_STREAM_KEYS
          valueFrom:
            secretKeyRef:
              name: streaming-secrets
              key: stream-keys
        - name: WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: streaming-secrets
              key: webhook-secret
        resources:
          requests:
            cpu: "1000m"
            memory: "2Gi"
          limits:
            cpu: "4000m"
            memory: "4Gi"
        volumeMounts:
        - name: hls-storage
          mountPath: /tmp/hls
        - name: config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: hls-storage
        persistentVolumeClaim:
          claimName: hls-storage
      - name: config
        configMap:
          name: streaming-config
```

```bash
kubectl apply -f deployment.yaml
```

### Step 6: Create Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: streaming-service
  namespace: streaming
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  ports:
  - port: 1935
    targetPort: 1935
    protocol: TCP
    name: rtmp
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
  selector:
    app: streaming
```

```bash
kubectl apply -f service.yaml

# Get external IP
kubectl get svc streaming-service -n streaming
```

### Step 7: Create HorizontalPodAutoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: streaming-hpa
  namespace: streaming
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: streaming-engine
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

```bash
kubectl apply -f hpa.yaml
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n streaming

# Check services
kubectl get svc -n streaming

# View logs
kubectl logs -f deployment/streaming-engine -n streaming

# Execute commands in pod
kubectl exec -it deployment/streaming-engine -n streaming -- sh
```

---

## AWS Deployment

### Option 1: AWS ECS (Fargate)

#### Step 1: Create Task Definition

```json
{
  "family": "streaming-engine",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "containerDefinitions": [
    {
      "name": "streaming",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/streaming-engine:latest",
      "portMappings": [
        {"containerPort": 1935, "protocol": "tcp"},
        {"containerPort": 8080, "protocol": "tcp"}
      ],
      "environment": [
        {"name": "ALLOWED_STREAM_KEYS", "value": "stream1,stream2"},
        {"name": "HTTP_CALLBACK_URL", "value": "https://api.yourapp.com"}
      ],
      "secrets": [
        {
          "name": "HLS_ENCRYPTION_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:streaming/hls-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/streaming-engine",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "mountPoints": [
        {
          "sourceVolume": "efs-storage",
          "containerPath": "/tmp/hls",
          "readOnly": false
        }
      ]
    }
  ],
  "volumes": [
    {
      "name": "efs-storage",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-12345678",
        "transitEncryption": "ENABLED"
      }
    }
  ]
}
```

#### Step 2: Create ECS Service

```bash
aws ecs create-service \
  --cluster streaming-cluster \
  --service-name streaming-service \
  --task-definition streaming-engine \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-123,subnet-456],securityGroups=[sg-789],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/streaming-tg,containerName=streaming,containerPort=8080"
```

#### Step 3: Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name streaming-alb \
  --subnets subnet-123 subnet-456 \
  --security-groups sg-789 \
  --scheme internet-facing \
  --type application

# Create Target Group
aws elbv2 create-target-group \
  --name streaming-tg \
  --protocol HTTP \
  --port 8080 \
  --vpc-id vpc-123 \
  --target-type ip \
  --health-check-path /health

# Create Listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

### Option 2: AWS EC2 with Auto Scaling

#### User Data Script

```bash
#!/bin/bash
# user-data.sh

# Update system
yum update -y

# Install Docker
amazon-linux-extras install docker -y
systemctl start docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Pull image from ECR
$(aws ecr get-login --no-include-email --region us-east-1)
docker pull your-account.dkr.ecr.us-east-1.amazonaws.com/streaming-engine:latest

# Create docker-compose.yml
cat > /opt/streaming/docker-compose.yml <<EOF
version: '3.8'
services:
  streaming:
    image: your-account.dkr.ecr.us-east-1.amazonaws.com/streaming-engine:latest
    restart: always
    ports:
      - "1935:1935"
      - "8080:8080"
    environment:
      - ALLOWED_STREAM_KEYS=\$(aws secretsmanager get-secret-value --secret-id streaming/keys --query SecretString --output text)
      - HLS_ENCRYPTION_KEY=\$(aws secretsmanager get-secret-value --secret-id streaming/hls-key --query SecretString --output text)
    volumes:
      - /mnt/efs/hls:/tmp/hls
EOF

# Mount EFS
mkdir -p /mnt/efs
mount -t efs fs-12345678:/ /mnt/efs

# Start services
cd /opt/streaming
docker-compose up -d

# Enable CloudWatch logs
yum install -y awslogs
systemctl start awslogsd
systemctl enable awslogsd
```

#### Launch Configuration

```bash
aws autoscaling create-launch-configuration \
  --launch-configuration-name streaming-lc \
  --image-id ami-12345678 \
  --instance-type c5.xlarge \
  --security-groups sg-123 \
  --user-data file://user-data.sh \
  --iam-instance-profile streaming-instance-profile \
  --key-name your-key-pair
```

#### Auto Scaling Group

```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name streaming-asg \
  --launch-configuration-name streaming-lc \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 3 \
  --vpc-zone-identifier "subnet-123,subnet-456" \
  --target-group-arns arn:aws:elasticloadbalancing:... \
  --health-check-type ELB \
  --health-check-grace-period 300
```

---

## Production Checklist

### Security

- [ ] Change default `WEBHOOK_SECRET`
- [ ] Generate secure `HLS_ENCRYPTION_KEY`
- [ ] Configure SSL/TLS certificates
- [ ] Enable firewall rules (only open 1935, 80, 443)
- [ ] Implement IP whitelisting (if needed)
- [ ] Enable secure_link for HLS URLs
- [ ] Set up WAF rules
- [ ] Configure CORS properly
- [ ] Use secrets management (AWS Secrets Manager, HashiCorp Vault)
- [ ] Enable audit logging

### Performance

- [ ] Configure worker_processes based on CPU cores
- [ ] Tune buffer sizes
- [ ] Enable gzip compression
- [ ] Configure proper cache headers
- [ ] Set up CDN (CloudFront, Cloudflare)
- [ ] Optimize FFmpeg presets
- [ ] Configure appropriate bitrates
- [ ] Set fragment duration (3s recommended)
- [ ] Enable hardware acceleration (if available)
- [ ] Configure kernel parameters

### Monitoring

- [ ] Set up CloudWatch/Prometheus metrics
- [ ] Configure Grafana dashboards
- [ ] Enable application logs
- [ ] Set up error alerting
- [ ] Monitor disk space
- [ ] Track bandwidth usage
- [ ] Monitor CPU/memory usage
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation (ELK, Splunk)
- [ ] Enable distributed tracing (Jaeger, Zipkin)

### Reliability

- [ ] Configure health checks
- [ ] Set up auto-scaling rules
- [ ] Implement backup strategy
- [ ] Test disaster recovery procedures
- [ ] Configure persistent storage
- [ ] Set up database replication (if using)
- [ ] Implement circuit breakers
- [ ] Configure retry policies
- [ ] Set up graceful shutdown
- [ ] Test failover scenarios

### Operations

- [ ] Document deployment procedures
- [ ] Create runbooks for common issues
- [ ] Set up CI/CD pipeline
- [ ] Implement blue-green deployments
- [ ] Configure automated backups
- [ ] Set up scheduled maintenance windows
- [ ] Create incident response plan
- [ ] Train operations team
- [ ] Set up on-call rotation
- [ ] Document rollback procedures

---

## Scaling Guide

### Vertical Scaling

**Increase container resources:**

```yaml
# docker-compose.yml
services:
  streaming:
    deploy:
      resources:
        limits:
          cpus: '8'
          memory: 8G
```

**Or in Kubernetes:**

```yaml
resources:
  limits:
    cpu: "8000m"
    memory: "8Gi"
```

### Horizontal Scaling

#### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml streaming

# Scale service
docker service scale streaming_streaming=5
```

#### Kubernetes

```bash
# Manual scaling
kubectl scale deployment streaming-engine --replicas=5 -n streaming

# Auto-scaling (already configured in HPA)
kubectl get hpa -n streaming
```

### Load Balancer Configuration

**NGINX Load Balancer for RTMP:**

```nginx
stream {
    upstream rtmp_backend {
        least_conn;
        server stream1.example.com:1935 max_fails=3 fail_timeout=30s;
        server stream2.example.com:1935 max_fails=3 fail_timeout=30s;
        server stream3.example.com:1935 max_fails=3 fail_timeout=30s;
    }
    
    server {
        listen 1935;
        proxy_pass rtmp_backend;
        proxy_timeout 3s;
        proxy_connect_timeout 1s;
    }
}

http {
    upstream http_backend {
        least_conn;
        server stream1.example.com:8080;
        server stream2.example.com:8080;
        server stream3.example.com:8080;
    }
    
    server {
        listen 80;
        
        location /hls {
            proxy_pass http://http_backend;
            proxy_cache hls_cache;
            proxy_cache_valid 200 3s;
            add_header X-Cache-Status $upstream_cache_status;
        }
    }
}
```

### Shared Storage for HLS

**Option 1: NFS**

```yaml
volumes:
  - type: volume
    source: nfs-hls
    target: /tmp/hls
    volume:
      nocopy: true
      driver_opts:
        type: nfs
        o: addr=nfs-server.example.com,rw
        device: ":/exports/hls"
```

**Option 2: AWS EFS**

```bash
# Mount EFS on all instances
sudo mount -t efs fs-12345678:/ /mnt/efs

# Use in docker-compose
volumes:
  - /mnt/efs/hls:/tmp/hls
```

**Option 3: S3 + s3fs**

```bash
# Mount S3 bucket
s3fs your-bucket /tmp/hls \
  -o iam_role=auto \
  -o use_cache=/tmp/s3cache \
  -o allow_other
```

---

## Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nginx'
    static_configs:
      - targets: ['streaming:9113']
  
  - job_name: 'webhook'
    static_configs:
      - targets: ['webhook:8000']
    metrics_path: /metrics
```

### Grafana Dashboard

Import dashboard JSON or create panels for:

- **Stream Metrics**
  - Active streams count
  - Total viewers
  - Bandwidth per stream
  
- **System Metrics**
  - CPU usage
  - Memory usage
  - Disk I/O
  - Network throughput
  
- **Application Metrics**
  - Request rate
  - Error rate
  - Response time
  - FFmpeg process count

### Alerting Rules

```yaml
# alerts.yml
groups:
  - name: streaming_alerts
    interval: 30s
    rules:
      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total[5m]) > 0.8
        for: 5m
        annotations:
          summary: "High CPU usage detected"
      
      - alert: StreamingDown
        expr: up{job="nginx"} == 0
        for: 1m
        annotations:
          summary: "Streaming service is down"
      
      - alert: HighBandwidth
        expr: rate(nginx_bytes_sent[5m]) > 1000000000
        for: 5m
        annotations:
          summary: "High bandwidth usage"
```

---

## Troubleshooting

### Services Not Starting

```bash
# Check Docker logs
docker-compose logs streaming
docker-compose logs webhook

# Check if ports are available
netstat -tulpn | grep -E '1935|8080|8000'

# Verify configuration
docker-compose exec streaming nginx -t

# Check disk space
df -h
```

### RTMP Connection Issues

```bash
# Test RTMP port
telnet localhost 1935

# Check firewall
sudo ufw status
sudo ufw allow 1935/tcp

# Verify NGINX is listening
docker-compose exec streaming netstat -tulpn | grep 1935
```

### HLS Not Playing

```bash
# Check if segments are being generated
ls -la /tmp/hls/

# Verify HLS endpoint
curl http://localhost:8080/hls/demo.m3u8

# Check CORS headers
curl -I http://localhost:8080/hls/demo.m3u8

# Test with ffplay
ffplay http://localhost:8080/hls/demo.m3u8
```

### Performance Issues

```bash
# Monitor resource usage
docker stats

# Check FFmpeg processes
docker-compose exec streaming ps aux | grep ffmpeg

# Monitor NGINX worker processes
docker-compose exec streaming ps aux | grep nginx

# Check system load
uptime
```

---

## Backup and Restore

### Backup HLS Files

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/streaming/$DATE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup HLS files
docker run --rm \
  -v streaming_hls:/source \
  -v "$BACKUP_DIR:/backup" \
  alpine \
  tar czf /backup/hls.tar.gz -C /source .

# Upload to S3
aws s3 cp "$BACKUP_DIR/hls.tar.gz" \
  "s3://your-backup-bucket/streaming/$DATE/"

# Clean old backups (keep 7 days)
find /backups/streaming -type d -mtime +7 -exec rm -rf {} \;
```

### Restore from Backup

```bash
#!/bin/bash
# restore.sh

BACKUP_DATE=$1

# Download from S3
aws s3 cp \
  "s3://your-backup-bucket/streaming/$BACKUP_DATE/hls.tar.gz" \
  /tmp/

# Extract to volume
docker run --rm \
  -v streaming_hls:/target \
  -v /tmp:/source \
  alpine \
  tar xzf /source/hls.tar.gz -C /target

# Restart services
docker-compose restart streaming
```

---

## Final Notes

### Best Practices

1. **Always use environment variables** for sensitive data
2. **Implement proper monitoring** before going to production
3. **Test failover scenarios** regularly
4. **Keep Docker images updated** for security patches
5. **Use persistent storage** for HLS files in production
6. **Configure proper backup** strategies
7. **Document all customizations** to nginx.conf
8. **Test with expected load** before launch
9. **Set up alerts** for critical failures
10. **Have a rollback plan** ready

### Support

- Review logs: `docker-compose logs -f`
- Check health: `curl http://localhost:8080/health`
- RTMP stats: `curl http://localhost:8080/stat`
- Webhook status: `curl http://localhost:8000/streams/active`

### Next Steps

1. Deploy to staging environment
2. Perform load testing
3. Configure monitoring and alerting
4. Test disaster recovery procedures
5. Train operations team
6. Deploy to production
7. Monitor and optimize

---

**Deployment Complete! 🎉**

Your Universal NGINX Streaming Engine is ready for any streaming application - from WedLive to Netflix clones.
