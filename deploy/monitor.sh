#!/bin/bash
# MRLC-LMS Monitoring Script
# Run: ./deploy/monitor.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "MRLC-LMS System Status"
echo "=========================================="

# Check PM2 status
echo -e "\n${GREEN}[PM2 Process Status]${NC}"
if command -v pm2 &> /dev/null; then
    pm2 status
    echo ""
    echo -e "${YELLOW}Recent Logs (last 20 lines):${NC}"
    pm2 logs mrlc-lms --lines 20 --nostream
else
    echo -e "${RED}PM2 not installed${NC}"
fi

# Check nginx status
echo -e "\n${GREEN}[nginx Status]${NC}
if command -v nginx &> /dev/null; then
    sudo systemctl status nginx --no-pager | head -5
else
    echo -e "${RED}nginx not installed${NC}"
fi

# Check PostgreSQL status
echo -e "\n${GREEN}[PostgreSQL Status]${NC}"
if command -v psql &> /dev/null; then
    sudo systemctl status postgresql --no-pager | head -5
    echo ""
    echo -e "${YELLOW}Database size:${NC}"
    sudo -u postgres psql -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database WHERE datname='school_lms';" 2>/dev/null || echo "Could not connect to database"
else
    echo -e "${RED}PostgreSQL not installed${NC}"
fi

# Check disk space
echo -e "\n${GREEN}[Disk Space]${NC}"
df -h /opt /var 2>/dev/null | grep -v "Filesystem"

# Check memory
echo -e "\n${GREEN}[Memory Usage]${NC}"
free -h

# Check SSL certificate
echo -e "\n${GREEN}[SSL Certificate]${NC}"
if [ -f /etc/letsencrypt/live/gedmrlc.monrefugeelc.com/cert.pem ]; then
    EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/gedmrlc.monrefugeelc.com/cert.pem | cut -d= -f2)
    EXPIRY_DATE=$(date -d "$EXPIRY" +%s)
    CURRENT_DATE=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_DATE - $CURRENT_DATE) / 86400 ))
    echo "Certificate expires: $EXPIRY ($DAYS_LEFT days left)"
    if [ $DAYS_LEFT -lt 30 ]; then
        echo -e "${RED}WARNING: Certificate expires soon!${NC}"
        echo "Run: sudo certbot renew"
    fi
else
    echo -e "${YELLOW}No SSL certificate found${NC}"
fi

# Check recent backups
echo -e "\n${GREEN}[Recent Backups]${NC}"
if [ -d /opt/mrlc-lms/data/backups ]; then
    ls -lh /opt/mrlc-lms/data/backups/*.dump 2>/dev/null | tail -5 || echo "No backups found"
else
    echo -e "${YELLOW}Backup directory not found${NC}"
fi

# Check if application is responding
echo -e "\n${GREEN}[Health Check]${NC}"
if command -v curl &> /dev/null; then
    if curl -s -f http://localhost:8000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Application is responding${NC}"
    else
        echo -e "${RED}✗ Application is not responding${NC}"
    fi
fi

echo ""
echo "=========================================="
echo "For detailed logs, run:"
echo "  pm2 logs mrlc-lms"
echo "  sudo tail -f /var/log/nginx/mrlc-lms-error.log"
echo "=========================================="
