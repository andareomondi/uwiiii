#!/bin/bash

# VendorFlow - Deploy to GitHub Script
echo "🚀 Deploying VendorFlow to GitHub..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
fi

# Add all files
echo "📁 Adding all files..."
git add .

# Create a comprehensive commit message
echo "💬 Creating commit..."
git commit -m "🎉 VendorFlow v2.0 - Complete IoT Device Management Platform

✨ New Features:
- Real-time MQTT integration with broker communication
- SMS support for offline device control (Kenya SIM cards)
- PWA support with offline functionality and push notifications
- Analytics dashboard with usage tracking and charts
- Dark/Light theme toggle with system preference detection
- Role-based access control (Admin/Staff/User)
- Multi-device support (Vending Machines, Relay Controllers, Water Pumps)
- Shop management for multi-location vending machines
- Smart home interface for relay devices and water pumps

🔧 Technical Improvements:
- Complete database schema with relationships and triggers
- Optimistic UI updates for better user experience
- Proper error handling and loading states
- Responsive design for mobile and desktop
- Service worker for offline functionality
- Real-time data processing with Supabase
- MQTT message queuing and processing
- Toast notifications with proper visibility

🎨 UI/UX Enhancements:
- Modern gradient designs and animations
- Consistent dark mode styling across all pages
- Improved device cards with better contrast
- Fixed notification popup transparency issues
- Better icon visibility in dark mode
- Enhanced mobile navigation and responsive layout

📱 Mobile & PWA:
- Progressive Web App with install prompt
- Offline support with cached content
- Push notifications for device alerts
- Mobile-optimized touch interactions
- App icons and splash screens

🔐 Security & Performance:
- Environment variable management
- Proper authentication flow
- Database indexes for better performance
- Error boundaries and fallback handling
- Rate limiting and input validation

🌍 Kenya-Specific Features:
- SMS commands for device control when offline
- Support for +254 phone number format
- Direct SIM card communication for IoT devices
- Offline-first approach for poor connectivity areas

This release transforms VendorFlow into a production-ready IoT management platform
suitable for deployment in Kenya and other emerging markets."

# Check if remote origin exists
if git remote get-url origin >/dev/null 2>&1; then
    echo "📡 Remote origin already configured"
else
    echo "🔗 Adding remote origin..."
    git remote add origin https://github.com/andareomondi/uwiiii.git
fi

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
git push -u origin main

echo "✅ Successfully deployed to GitHub!"
echo "🌐 Repository: https://github.com/andareomondi/uwiiii"
echo ""
echo "🎯 Next Steps:"
echo "1. Test the toast notifications on the dashboard"
echo "2. Set up environment variables in Vercel"
echo "3. Deploy to production"
echo "4. Test PWA installation on mobile devices"
echo "5. Configure MQTT broker for production use"
