# MongoDB Atlas Setup Guide

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for free account
3. Click "Build a Database"
4. Choose "M0 FREE" tier
5. Select a cloud provider and region (choose closest to you)
6. Click "Create Cluster"

## Step 2: Create Database User

1. In the left sidebar, click "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `shift-scheduler-admin`
5. Password: Generate a secure password (save it!)
6. Database User Privileges: "Atlas Admin"
7. Click "Add User"

## Step 3: Whitelist IP Address

1. In the left sidebar, click "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
   - IP: `0.0.0.0/0`
4. Click "Confirm"

**Note**: In production, restrict to specific IPs!

## Step 4: Get Connection String

1. Click "Database" in left sidebar
2. Click "Connect" button on your cluster
3. Choose "Connect your application"
4. Driver: "Node.js", Version: "4.1 or later"
5. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 5: Update .env File

1. Open `backend/.env`
2. Replace the MONGODB_URI with your connection string:
   ```
   MONGODB_URI=mongodb+srv://shift-scheduler-admin:<your-password>@cluster0.xxxxx.mongodb.net/shift-scheduler?retryWrites=true&w=majority
   ```
3. Replace `<your-password>` with the password from Step 2
4. Add `/shift-scheduler` before the `?` to specify the database name

## Example .env

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://shift-scheduler-admin:MySecurePass123@cluster0.abc123.mongodb.net/shift-scheduler?retryWrites=true&w=majority
JWT_SECRET=dev-secret-key-12345-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5176
LOG_LEVEL=debug
```

## Test Connection

Run the backend server:

```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB connected successfully
📊 Database: shift-scheduler
🚀 Server running on port 5000
```

## Troubleshooting

### Error: "MongooseServerSelectionError: connect ECONNREFUSED"

- Check that your IP is whitelisted (0.0.0.0/0 for development)
- Verify the connection string is correct
- Make sure you replaced `<password>` with your actual password

### Error: "Authentication failed"

- Double-check username and password
- Make sure the database user has "Atlas Admin" privileges

### Error: "Network timeout"

- Check your internet connection
- Verify firewall isn't blocking MongoDB Atlas (port 27017)
- Try a different network (sometimes corporate networks block it)

## MongoDB Compass (Optional GUI)

Download [MongoDB Compass](https://www.mongodb.com/products/compass) to view/edit data visually:

1. Install Compass
2. Use the same connection string from .env
3. Connect and browse your database

## Useful MongoDB Atlas Features

- **Data Explorer**: View and edit documents
- **Charts**: Create dashboards from your data
- **Metrics**: Monitor database performance
- **Backups**: Automatic backups (paid feature)
- **Alerts**: Get notified about issues
