# Sync SDM Picatekpol

A Node.js application for synchronizing employee attendance data from an external API to a MySQL database. The application can run in both manual mode for specific date ranges and daemon mode for automatic periodic synchronization.

## Features

- **Data Synchronization**: Fetches attendance data from external API and stores it in MySQL database
- **Flexible Execution Modes**: 
  - Manual mode for specific date ranges
  - Daemon mode with automatic 30-minute interval synchronization
- **Duplicate Handling**: Uses `ON DUPLICATE KEY UPDATE` to handle existing records
- **Notification System**: Sends synchronization summaries to Discord via webhook
- **Docker Support**: Containerized application for easy deployment
- **Progress Tracking**: Real-time progress display during synchronization

## Prerequisites

- Node.js (v22 or higher)
- pnpm package manager
- MySQL database
- Docker (optional, for containerized deployment)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd sync-sdm-picatekpol
   ```

2. Install dependencies using pnpm:
   ```bash
   pnpm install
   ```

## Configuration

The application requires the following environment configurations:

### Database Configuration
- Host: `103.152.5.77`
- User: `u344419611_picatekpol`
- Password: `Picatekpol2024!@#`
- Database: `u344419611_picatekpol`
- Port: `13036`

> Note: These are hardcoded in the application and should be updated for different environments.

### Discord Webhook
The application sends notifications to a Discord webhook:
- Webhook URL: `https://discord.com/api/webhooks/1407258593161379850/Uiy7O1-j-ekohed3V_R9fK9LynhWpwzI9une-IyIz53Y0St0KxzKoyT7tcuwiWXJKw6y`

## Usage

### Manual Mode
To synchronize data for a specific date range:
```bash
node sdmapi.js --start YYYY-MM-DD --end YYYY-MM-DD
```

Example:
```bash
node sdmapi.js --start 2025-09-01 --end 2025-09-25
```

### Daemon Mode
To run the application in daemon mode with automatic synchronization every 30 minutes:
```bash
node sdmapi.js --daemon
```

In daemon mode, the application automatically synchronizes attendance data for the last 3 days.

## Docker Deployment

### Using Docker Compose (Recommended)
```bash
docker-compose up -d
```

### Manual Docker Build
```bash
# Build the image
docker build -t sync-sdm-picatekpol .

# Run the container
docker run -d --name sdmapi --restart unless-stopped sync-sdm-picatekpol
```

## How It Works

1. The application connects to an external API to fetch attendance data
2. Data is processed and synchronized with the MySQL database
3. Duplicate records are handled using MySQL's `ON DUPLICATE KEY UPDATE`
4. Special handling for "PPIS" company records with prefixed unit codes
5. Old records are deleted based on update timestamp (older than 3 hours)
6. Progress is displayed in real-time during synchronization
7. Summary notifications are sent to Discord after each synchronization

## Dependencies

- `axios`: For making HTTP requests to the external API
- `mysql2`: For MySQL database connectivity
- `node-cron`: For scheduling automatic synchronization in daemon mode
- `yargs`: For command-line argument parsing

## Database Schema

The application works with the following table:
- `sdm_kehadiran`: Stores attendance records
- `karyawan`: Used to identify PPIS company employees

## Error Handling

The application includes comprehensive error handling:
- API request timeouts and errors
- Database connection and query errors
- Individual row processing errors
- Discord notification failures

Failed records are logged but don't stop the overall synchronization process.

## Monitoring

The application sends notifications to Discord with synchronization summaries including:
- Date range processed
- Total records processed
- Successful and failed insertions
- Execution start and end times

## License

ISC