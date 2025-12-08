#!/bin/bash
# Generate HLS encryption keys

KEY_DIR="/etc/nginx/keys"
mkdir -p "$KEY_DIR"

# Generate encryption key if not provided via environment
if [ -z "$HLS_ENCRYPTION_KEY" ]; then
    echo "Generating random HLS encryption key..."
    openssl rand 16 > "$KEY_DIR/stream.key"
else
    echo "Using provided HLS encryption key..."
    echo -n "$HLS_ENCRYPTION_KEY" > "$KEY_DIR/stream.key"
fi

# Generate key info file
cat > "$KEY_DIR/stream.keyinfo" <<EOF
/keys/stream.key
$KEY_DIR/stream.key
$(openssl rand -hex 16)
EOF

chmod 644 "$KEY_DIR/stream.key" "$KEY_DIR/stream.keyinfo"

echo "HLS encryption keys generated successfully"