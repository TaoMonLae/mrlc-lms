# MRLC-LMS Ubuntu Deployment Guide

## Quick Start Deployment

### Option 1: Automated Script Deployment (Recommended)

```bash
# Clone the repository
git clone <your-repo-url> mrlc-lms
cd mrlc-lms

# Run the automated setup script
sudo bash deploy/ubuntu-setup.sh
```

This script will:
- Install Node.js 20, PostgreSQL, nginx, and PM2
- Create and configure the database
- Build the application
- Set up environment variables
- Configure nginx as a reverse proxy
- Obtain SSL certificates with Let's Encrypt
- Start the application with PM2

### Option 2: Docker Deployment

```bash
# Build and start with Docker Compose
cp deploy/docker-update.conf .env
# Edit .env with your production values
docker-compose up -d
```

Then set up nginx as a reverse proxy (see below).

---

## Manual Deployment Steps

### 1. System Requirements

- Ubuntu 20.04+ or Debian 11+
- Minimum 2GB RAM, 4GB recommended
- 20GB disk space

### 2. Install Dependencies

```bash
sudo apt update
sudo apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# PM2
sudo npm install -g pm2
```

### 3. Setup Database

```bash
# Create database and user
sudo -u postgres psql
```

```sql
CREATE USER mrlc WITH PASSWORD 'your_strong_password';
CREATE DATABASE school_lms OWNER mrlc;
GRANT ALL PRIVILEGES ON DATABASE school_lms TO mrlc;
\q
```

### 4. Deploy Application

```bash
# Create app directory
sudo mkdir -p /opt/mrlc-lms
sudo chown -R $USER:$USER /opt/mrlc-lms

# Copy files (from project root)
rsync -av \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude 'data' \
  /path/to/source/ /opt/mrlc-lms/

# Install and build
cd /opt/mrlc-lms
npm ci
npm run build
```

### 5. Configure Environment

```bash
# Generate secrets
SESSION_SECRET=$(openssl rand -base64 48)
DB_PASSWORD="<your_database_password>"

# Create .env file
cat > .env <<EOF
DATABASE_URL="postgresql://mrlc:$DB_PASSWORD@localhost:5432/school_lms"
SESSION_SECRET="$SESSION_SECRET"
APP_URL="https://gedmrlc.monrefugeelc.com"
PORT=8000
NODE_ENV=production
EBOOK_DIR="/opt/mrlc-lms/data/ebooks"
BACKUP_DIR="/opt/mrlc-lms/data/backups"
BACKUP_RETENTION=14
BACKUP_HOUR=2
EOF

chmod 600 .env
```

### 6. Run Migrations

```bash
cd /opt/mrlc-lms
npx prisma migrate deploy
```

### 7. Seed Initial Data (Optional)

```bash
# Create admin, teacher, and student accounts
SEED_ON_START=true npm run seed
```

Default credentials (change on first login):
- Admin: `admin@mrlc.school`
- Teacher: `teacher@mrlc.school`
- Student: `student@mrlc.school`

### 8. Start with PM2

```bash
cd /opt/mrlc-lms
pm2 start dist/server.cjs --name mrlc-lms --env production
pm2 save
pm2 startup
```

### 9. Configure nginx

```bash
# Copy nginx config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/gedmrlc.monrefugeelc.com
sudo ln -s /etc/nginx/sites-available/gedmrlc.monrefugeelc.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

### 10. Obtain SSL Certificate

```bash
# Get certificate from Let's Encrypt
sudo certbot --nginx -d gedmrlc.monrefugeelc.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 11. Configure Firewall

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## Maintenance

### View Application Logs

```bash
pm2 logs mrlc-lms
```

### Restart Application

```bash
pm2 restart mrlc-lms
```

### Update Application

```bash
cd /opt/mrlc-lms
git pull
npm ci
npm run build
npx prisma migrate deploy
pm2 restart mrlc-lms
```

### Database Backup

Manual backup:
```bash
cd /opt/mrlc-lms
# Backup is triggered from admin panel, or run:
pg_dump -Fc school_lms > data/backups/manual-$(date +%Y%m%d).dump
```

### Monitor System Resources

```bash
pm2 monit
```

---

## Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs mrlc-lms --lines 100

# Verify .env file exists
cat /opt/mrlc-lms/.env

# Check database connection
psql -U mrlc -d school_lms -h localhost
```

### nginx 502 Bad Gateway

```bash
# Check if app is running
pm2 status

# Check nginx error log
sudo tail -f /var/log/nginx/mrlc-lms-error.log

# Verify app is listening on port 8000
sudo netstat -tlnp | grep 8000
```

### SSL Certificate Issues

```bash
# Renew certificate manually
sudo certbot renew --force-renewal

# Check certificate status
sudo certbot certificates
```

---

## Security Checklist

- [ ] Changed `SESSION_SECRET` to a strong random value
- [ ] Set strong database password
- [ ] SSL certificate installed and valid
- [ ] Firewall enabled (UFW)
- [ ] Database bound to localhost only
- [ ] `.env` file permissions set to 600
- [ ] Regular backups configured
- [ ] PM2 startup script enabled
- [ ] Log rotation configured

---

## Docker Deployment (Alternative)

If using Docker instead of native Node.js:

1. Update environment in `deploy/docker-update.conf`
2. Run: `docker-compose up -d`
3. Set up nginx reverse proxy (use the same nginx.conf)

---

## Default Ports

- Application: 8000 (internal, behind nginx)
- HTTP: 80 (redirects to HTTPS)
- HTTPS: 443
- PostgreSQL: 5432 (localhost only)

---

## File Locations

- Application: `/opt/mrlc-lms`
- nginx config: `/etc/nginx/sites-available/gedmrlc.monrefugeelc.com`
- SSL certificates: `/etc/letsencrypt/live/gedmrlc.monrefugeelc.com`
- PM2 logs: `~/.pm2/logs/`

---

## Support

For issues or questions:
1. Check PM2 logs: `pm2 logs mrlc-lms`
2. Check nginx logs: `sudo tail -f /var/log/nginx/mrlc-lms-error.log`
3. Verify database connectivity
4. Check environment variables in `/opt/mrlc-lms/.env`
