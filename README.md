# VendorFlow - Next.js MQTT Integration

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/andareomondis-projects/v0-next-js-mqtt-integration-8m)

## Overview

VendorFlow is a comprehensive IoT device management platform that integrates MQTT messaging with a Next.js application. Manage vending machines, relay devices, and water pumps all in one place with real-time control and monitoring.

## Features

- **Real-time MQTT Integration** - Direct broker communication for instant device control
- **Multi-device Support** - Vending machines, relay controllers, and water pumps
- **Shop Management** - Organize devices across multiple locations
- **Role-based Access** - Admin, staff, and user permissions
- **Modern UI** - Clean, responsive design inspired by modern smart home apps
- **Real-time Updates** - Live device status and control feedback

## Live Demo

Check out the live deployment:

**[https://vercel.com/andareomondis-projects/v0-next-js-mqtt-integration-8m](https://vercel.com/andareomondis-projects/v0-next-js-mqtt-integration-8m)**

## Getting Started

### Prerequisites

1. **Supabase Project** - Set up your database and authentication
2. **MQTT Broker** - Configure your MQTT broker (HiveMQ, EMQX, etc.)
3. **Environment Variables** - Create a `.env.local` file

### Environment Setup

Create a `.env.local` file with the following variables:

\`\`\`env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# MQTT Configuration
NEXT_PUBLIC_MQTT_BROKER_URL=wss://your-broker-url:8084/mqtt
NEXT_PUBLIC_MQTT_USERNAME=your_mqtt_username
NEXT_PUBLIC_MQTT_PASSWORD=your_mqtt_password
\`\`\`

### Installation

1. **Clone the repository:**
    \`\`\`bash
    git clone https://github.com/andareomondis-projects/v0-next-js-mqtt-integration-8m.git
    cd v0-next-js-mqtt-integration-8m
    \`\`\`

2. **Install dependencies:**
    \`\`\`bash
    npm install
    npm install mqtt  # For MQTT integration
    \`\`\`

3. **Set up the database:**
    - Run the SQL scripts in the `scripts/` folder in your Supabase SQL editor
    - Start with `complete-database-setup.sql`

4. **Configure admin user:**
    - Update `scripts/add-admin-user.sql` with your email
    - Run the script to grant admin privileges

5. **Run the development server:**
    \`\`\`bash
    npm run dev
    \`\`\`

6. **Open [http://localhost:3000](http://localhost:3000) to view the app.**

## MQTT Integration

VendorFlow uses MQTT for real-time device communication:

### Topics Structure
- `vendorflow/device/{device_id}/control` - Device control commands
- `vendorflow/device/{device_id}/status` - Device status updates
- `vendorflow/vending/{device_id}/control` - Vending machine operations

### Message Format
\`\`\`json
{
  "device_id": "VM001",
  "action": "dispense",
  "amount": 250,
  "timestamp": "2024-01-01T12:00:00Z"
}
\`\`\`

## Device Types

### Vending Machines
- Liquid level monitoring
- Dispensing controls (100ml, 250ml, 500ml)
- Shop assignment and tracking

### Relay Devices
- 8 input channels (status monitoring)
- 8 output channels (controllable switches)
- Custom switch types (light, fan, outlet, heater, pump)
- Configurable display names

### Water Pumps
- On/off control
- Water balance tracking
- Status monitoring

## Architecture

- **Frontend**: Next.js 14 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: MQTT + Supabase Realtime
- **UI**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements.

## License

This project is licensed under the MIT License.
