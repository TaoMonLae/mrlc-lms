# 🚀 MRLC-LMS - Quick Deployment Guide
## For gedmrlc.monrefugeelc.com on Ubuntu

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. Update Environment Variables (CRITICAL)

Edit `.env` file and change these values:

```bash
# MUST CHANGE - Generate with: openssl rand -base64 48
SESSION_SECRET="CHANGE_ME_TO_NEW_RANDOM_SECRET"

# MUST CHANGE - Set to production domain
APP_URL="https://gedmrlc.monrefugeelc.com"

# RECOMMENDED - Use strong password
DATABASE_URL="postgresql://mrlc:NEW_STRONG_PASSWORD@localhost:5432/school_lms"
```

### 2. Build Test
```bash
npm run build
# Should succeed in ~3 seconds
```

---

## 🚀 DEPLOYMENT STEPS

### Option A: Automated (Recommended)
```bash
# On your Ubuntu server
git clone <your-repo-url> mrlc-lms
cd mrlc-lms
sudo bash deploy/ubuntu-setup.sh
```

### Option B: Docker
```bash
# Update deploy/docker-update.conf with production values
docker-compose up -d
# Then set up nginx reverse proxy
```

### Option C: Manual
```bash
# Install dependencies
sudo apt update && sudo apt install -y nodejs npm postgresql nginx

# Install PM2
sudo npm install -g pm2

# Build
npm ci
npm run build

# Setup database
sudo -u postgres createdb school_lms
npx prisma migrate deploy

# Start app
pm2 start dist/server.cjs --name mrlc-lms
pm2 startup
pm2 save
```

---

## 🔒 CRITICAL: SSL Certificate Setup

```bash
# After nginx is configured
sudo certbot --nginx -d gedmrlc.monrefugeelc.com
```

---

## 🧪 POST-DEPLOYMENT TESTING

1. **Test URL:** https://gedmrlc.monrefugeelc.com
2. **Test Login:** admin@mrlc.school (change password on first login)
3. **Test Database:** Check if data loads correctly
4. **Test SSL:** Verify HTTPS works and certificate is valid
5. **Test Uploads:** Try uploading an e-book

---

## 📱 MOBILE TESTING

Test on actual devices:
- **iOS Safari:** https://gedmrlc.monrefugeelc.com
- **Android Chrome:** https://gedmrlc.monrefugeelc.com
- **Test:** Search dialog works, all buttons accessible

---

## 🔧 TROUBLESHOOTING

### Build Fails?
```bash
# Check Node.js version
node --version  # Should be 20+

# Clear cache and rebuild
rm -rf node_modules dist
npm ci
npm run build
```

### Database Connection Error?
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U mrlc -d school_lms
```

### SSL Certificate Issues?
```bash
# Renew manually
sudo certbot renew --force-renewal

# Check status
sudo certbot certificates
```

### App Not Starting?
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs mrlc-lms

# Restart
pm2 restart mrlc-lms
```

---

## 📊 MONITORING

### Check App Status
```bash
pm2 status
pm2 logs mrlc-lms --lines 50
```

### Check nginx
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/mrlc-lms-error.log
```

### Check Database
```bash
sudo systemctl status postgresql
sudo -u postgres psql -d school_lms -c "SELECT COUNT(*) FROM \"User\";"
```

---

## 🎯 SUCCESS CRITERIA

✅ **Deployment is successful when:**
- [ ] HTTPS works with valid certificate
- [ ] Login page loads at https://gedmrlc.monrefugeelc.com
- [ ] Can authenticate and access dashboard
- [ ] Can create/edit students
- [ ] Database operations work
- [ ] File uploads work (e-books)
- [ ] Mobile site is functional

---

## 🚨 EMERGENCY ROLLBACK

If critical issues occur:
```bash
# Stop app
pm2 stop mrlc-lms

# Revert to previous version
git checkout <previous-commit>
npm ci
npm run build
pm2 restart mrlc-lms
```

---

## 📞 SUPPORT

For issues or questions:
- Check logs: `pm2 logs mrlc-lms`
- Check nginx logs: `sudo tail -f /var/log/nginx/mrlc-lms-error.log`
- Review troubleshooting section above

---

**Deployment Estimated Time:** 15-30 minutes
**Difficulty Level:** Intermediate
**Status:** ✅ Ready for Production

---

**Good luck with your deployment! 🚀**
