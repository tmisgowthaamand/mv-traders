# Backend Folder Structure

## 📁 backend-example/ Folder Contents

```
backend-example/
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore file (excludes node_modules, .env)
├── package.json         # Node.js dependencies and scripts
├── README.md            # Backend documentation
├── render.yaml          # Render deployment configuration
└── server.js            # Main Express server file
```

---

## 📄 File Details

### 1. `.env.example`
Template for environment variables. Contains:
```env
PAYTM_MID=ZkCPzp89071287715186
PAYTM_MERCHANT_KEY=zoovHN@%Y%swC3iX
PAYTM_WEBSITE=DEFAULT
PAYTM_INDUSTRY_TYPE=Retail
PAYTM_CHANNEL_ID=WEB
PAYTM_ENV=production
PAYTM_CALLBACK_URL=https://your-backend.onrender.com/api/payment-callback
FRONTEND_URL=https://your-frontend.vercel.app
PORT=10000
NODE_ENV=production
```

### 2. `.gitignore`
Excludes sensitive files from git:
```
node_modules
.env
*.log
.DS_Store
```

### 3. `package.json`
Node.js project configuration:
```json
{
  "name": "paytm-backend",
  "version": "1.0.0",
  "description": "Backend API for Paytm payment integration on Render",
  "main": "server.js",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "paytmchecksum": "^1.5.1",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  }
}
```

**Dependencies:**
- `express` - Web server framework
- `paytmchecksum` - Paytm's official checksum library
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management

### 4. `README.md`
Complete documentation for:
- Deploying to Render
- Local development setup
- API endpoints
- Environment variables
- Testing instructions

### 5. `render.yaml`
Render deployment configuration:
```yaml
services:
  - type: web
    name: mv-traders-backend
    runtime: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      # ... other environment variables
```

### 6. `server.js` (Main Backend File)
Express server with 4 API endpoints:

#### **GET /**
Health check endpoint
```javascript
Response: {
  status: 'ok',
  message: 'Paytm Payment Gateway API',
  timestamp: '2026-03-20T...'
}
```

#### **GET /health**
Service health status
```javascript
Response: { status: 'healthy' }
```

#### **POST /api/initiate-payment**
Generates checksum for payment initiation

**Request:**
```json
{
  "orderId": "ORD123456",
  "amount": "500.00",
  "customerId": "9876543210",
  "customerEmail": "customer@example.com",
  "customerPhone": "9876543210"
}
```

**Response:**
```json
{
  "MID": "ZkCPzp89071287715186",
  "ORDER_ID": "ORD123456",
  "TXN_AMOUNT": "500.00",
  "CUST_ID": "9876543210",
  "EMAIL": "customer@example.com",
  "MOBILE_NO": "9876543210",
  "CALLBACK_URL": "https://...",
  "CHECKSUMHASH": "generated_checksum_here"
}
```

#### **POST /api/payment-callback**
Receives payment response from Paytm, verifies checksum, and redirects to frontend

**Paytm sends:**
```
ORDERID, TXNID, TXNAMOUNT, STATUS, RESPCODE, RESPMSG, CHECKSUMHASH
```

**Backend:**
1. Verifies checksum
2. Checks payment status
3. Redirects to frontend with status

#### **POST /api/verify-transaction**
Manually verify transaction status with Paytm

**Request:**
```json
{
  "orderId": "ORD123456"
}
```

**Response:**
```json
{
  "STATUS": "TXN_SUCCESS",
  "TXNID": "...",
  "ORDERID": "ORD123456",
  "TXNAMOUNT": "500.00"
}
```

---

## 🔧 How It Works

### Server Configuration:
```javascript
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

### CORS Configuration:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
```

### Security Features:
1. ✅ Checksum generation on server-side only
2. ✅ Checksum verification for Paytm responses
3. ✅ Environment variables for sensitive data
4. ✅ CORS protection
5. ✅ HTTPS (provided by Render)

---

## 🚀 Deployment Flow

1. **Push to GitHub** → Code in `backend-example/` folder
2. **Render reads** → `backend-example/` as root directory
3. **Runs** → `npm install` (installs dependencies)
4. **Starts** → `npm start` (runs `node server.js`)
5. **Server listens** → Port 10000
6. **Render exposes** → https://mv-traders-backend.onrender.com

---

## 📊 Backend Architecture

```
Client (Frontend)
    ↓
    POST /api/initiate-payment
    ↓
Backend (Render)
    ├── Generate Checksum (using PAYTM_MERCHANT_KEY)
    └── Return payment params + checksum
    ↓
Client submits to Paytm
    ↓
Paytm processes payment
    ↓
    POST /api/payment-callback
    ↓
Backend (Render)
    ├── Verify Checksum
    ├── Check payment status
    └── Redirect to frontend with result
    ↓
Client shows success/failure
```

---

## 🔐 Environment Variables (Set in Render)

These must be configured in Render dashboard:

```
PAYTM_MID              → Your Paytm Merchant ID
PAYTM_MERCHANT_KEY     → Your Paytm Merchant Key (SECRET!)
PAYTM_WEBSITE          → DEFAULT
PAYTM_INDUSTRY_TYPE    → Retail
PAYTM_CHANNEL_ID       → WEB
PAYTM_ENV              → production
PAYTM_CALLBACK_URL     → https://mv-traders-backend.onrender.com/api/payment-callback
FRONTEND_URL           → https://mv-traders.vercel.app
NODE_ENV               → production
```

---

## 📝 Summary

The `backend-example/` folder is a **complete, standalone Node.js backend** that:

✅ Handles Paytm payment integration securely
✅ Generates checksums server-side
✅ Verifies payment responses
✅ Provides REST API endpoints
✅ Ready to deploy on Render
✅ Connects with your Vercel frontend

**Total Files:** 6
**Total Dependencies:** 4
**API Endpoints:** 4
**Lines of Code:** ~200

This is a production-ready backend! 🚀
