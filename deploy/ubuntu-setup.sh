#!/bin/bash
# MRLC-LMS Ubuntu Deployment Script
# Run with: sudo bash deploy/ubuntu-setup.sh

set -e

echo "=========================================="
echo "MRLC-LMS Ubuntu Server Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="mrlc-lms"
APP_DIR="/opt/$APP_NAME"
DOMAIN="gedmrlc.monrefugeelc.com"
PORT=8000
NODE_VERSION=20

# Prompt for domain if not set
read -p "Enter your domain (default: $DOMAIN): " INPUT_DOMAIN
DOMAIN=${INPUT_DOMAIN:-$DOMAIN}

echo -e "${GREEN}[1/10] Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${GREEN}[2/10] Installing Node.js $NODE_VERSION...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "Node.js already installed: $(node -v)"
fi

echo -e "${GREEN}[3/10] Installing PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
else
    echo "PostgreSQL already installed"
fi

echo -e "${GREEN}[4/10] Installing nginx and Certbot...${NC}"
sudo apt install -y nginx certbot python3-certbot-nginx

echo -e "${GREEN}[5/10] Installing PM2 for process management...${NC}"
sudo npm install -g pm2

echo -e "${GREEN}[6/10] Creating application directory...${NC}"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

echo -e "${GREEN}[7/10] Setting up PostgreSQL database...${NC}"
# Generate random password
DB_PASSWORD=$(openssl rand -base64 32)
DB_NAME="school_lms"
DB_USER="mrlc"

echo -e "${YELLOW}Creating database user and database...${NC}"
sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF

echo -e "${GREEN}[8/10] Preparing application files...${NC}"
echo "Please ensure you're running this from the project root directory."
echo "Current directory: $(pwd)"

# Copy application files
read -p "Copy files from current directory to $APP_DIR? (y/n): " COPY_FILES
if [[ $COPY_FILES == "y" || $COPY_FILES == "Y" ]]; then
    # Create exclude patterns for node_modules and dist
    rsync -av --progress \
        --exclude 'node_modules' \
        --exclude 'dist' \
        --exclude '.git' \
        --exclude 'data' \
        --exclude '.env' \
        ./ $APP_DIR/

    cd $APP_DIR
    npm ci
    npm run build
fi

echo -e "${GREEN}[9/10] Creating environment file...${NC}"
SESSION_SECRET=$(openssl rand -base64 48)
cat > $APP_DIR/.env <<EOF
# Database
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# JWT Secret
SESSION_SECRET="$SESSION_SECRET"

# Application
APP_URL="https://$DOMAIN"
PORT=$PORT
NODE_ENV="production"

# File Storage
EBOOK_DIR="$APP_DIR/data/ebooks"
BACKUP_DIR="$APP_DIR/data/backups"
BACKUP_RETENTION="14"
BACKUP_HOUR="2"

# Seed credentials (optional - remove after first deploy)
SEED_ADMIN_PASSWORD=""
SEED_TEACHER_PASSWORD=""
SEED_STUDENT_PASSWORD=""
EOF

chmod 600 $APP_DIR/.env
echo "Environment file created at $APP_DIR/.env"

echo -e "${GREEN}[10/10] Running database migrations...${NC}"
cd $APP_DIR
npx prisma migrate deploy

echo -e "${GREEN}[11/12] Seeding initial data (optional)...${NC}"
read -p "Seed initial admin/teacher/student accounts? (y/n): " SEED_DATA
if [[ $SEED_DATA == "y" || $SEED_DATA == "Y" ]]; then
    SEED_ON_START=true npm run seed
fi

echo -e "${GREEN}[12/13] Starting application with PM2...${NC}"
cd $APP_DIR
pm2 start dist/server.cjs --name $APP_NAME --env production
pm2 save
pm2 startup

echo -e "${GREEN}[13/13] Configuring nginx...${NC}"
# Copy nginx config
sudo cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/$DOMAIN
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

echo -e "${GREEN}[14/14] Setting up SSL with Let's Encrypt...${NC}"
read -p "Obtain SSL certificate now? (y/n): " OBTAIN_SSL
if [[ $OBTAIN_SSL == "y" || $OBTAIN_SSL == "Y" ]]; then
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

    # Setup auto-renewal
    sudo certbot renew --dry-run
fi

echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo -e "Application URL: ${GREEN}https://$DOMAIN${NC}"
echo -e "PM2 Status: Run ${YELLOW}pm2 status${NC}"
echo -e "PM2 Logs: Run ${YELLOW}pm2 logs $APP_NAME${NC}"
echo -e ""
echo -e "${YELLOW}IMPORTANT: Save these credentials!${NC}"
echo -e "Database User: $DB_USER"
echo -e "Database Password: $DB_PASSWORD"
echo -e "Database Name: $DB_NAME"
echo -e "Session Secret: $SESSION_SECRET"
echo ""
echo -e "${YELLOW}Default Login (if seeded):${NC}"
echo -e "Admin: admin@mrlc.school / Change on first login"
echo -e "Teacher: teacher@mrlc.school / Change on first login"
echo -e "Student: student@mrlc.school / Change on first login"

# Display firewall setup info
echo ""
echo -e "${YELLOW}Recommended: Configure UFW Firewall${NC}"
echo "sudo ufw allow 22    # SSH"
echo "sudo ufw allow 80    # HTTP"
echo "sudo ufw allow 443   # HTTPS"
echo "sudo ufw enable"
