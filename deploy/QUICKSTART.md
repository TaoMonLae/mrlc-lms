# MRLC-LMS Deployment Quick Start

## One-Command Deployment

```bash
# From your Ubuntu server:
git clone <your-repository-url> mrlc-lms
cd mrlc-lms
sudo bash deploy/ubuntu-setup.sh
```

## What This Does

The automated script sets up your entire production environment:

✅ **Installs**: Node.js 20, PostgreSQL, nginx, Certbot, PM2
✅ **Configures**: Database with secure credentials
✅ **Deploys**: Your application with production build
✅ **Secures**: SSL certificate from Let's Encrypt
✅ **Sets Up**: nginx reverse proxy with rate limiting
✅ **Starts**: Application with PM2 process manager

## After Deployment

### Access Your Site
- **URL**: https://gedmrlc.monrefugeelc.com
- **Admin**: admin@mrlc.school (change password on first login)

### Monitor Status
```bash
./deploy/monitor.sh
```

### View Logs
```bash
pm2 logs mrlc-lms
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

## Configuration Files Created

| File | Purpose |
|------|---------|
| `/opt/mrlc-lms/.env` | Production environment variables |
| `/etc/nginx/sites-available/gedmrlc.monrefugeelc.com` | nginx configuration |
| `~/.pm2/ecosystem.config.js` | PM2 process configuration |

## Important Notes

1. **Save Credentials**: The setup script will generate database passwords and SESSION_SECRET. Save these securely!
2. **SSL Certificate**: Automatically obtained and configured to auto-renew
3. **Firewall**: Remember to enable UFW (prompted at end of setup)
4. **Backups**: Database backups run daily (configurable in admin panel)

## Troubleshooting

### Site not loading?
```bash
pm2 status          # Check if app is running
sudo nginx -t       # Check nginx config
pm2 logs mrlc-lms   # Check for errors
```

### SSL issues?
```bash
sudo certbot renew --force-renewal
```

### Database issues?
```bash
sudo systemctl status postgresql
sudo -u postgres psql -d school_lms
```

## Production Checklist

- [ ] Review `deploy/DEPLOYMENT.md` for detailed setup
- [ ] Configure firewall: `sudo ufw enable`
- [ ] Test backup system
- [ ] Set up monitoring (consider Uptime monitoring service)
- [ ] Update APP_URL in .env to your domain

---

**Need Help?** See full documentation in `deploy/DEPLOYMENT.md`
