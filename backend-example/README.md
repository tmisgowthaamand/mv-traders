# Paytm Backend API for Render

Backend API for Paytm payment integration, designed to deploy on Render.

## Deploy to Render

### Step 1: Push to GitHub
```bash
cd backend-example
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2: Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `paytm-payment-api` (or your choice)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for production)

### Step 3: Add Environment Variables

In Render dashboard, add these environment variables:

```
PAYTM_MID=ZkCPzp89071287715186
PAYTM_MERCHANT_KEY=zoovHN@%Y%swC3iX
PAYTM_WEBSITE=DEFAULT
PAYTM_INDUSTRY_TYPE=Retail
PAYTM_CHANNEL_ID=WEB
PAYTM_ENV=production
PAYTM_CALLBACK_URL=https://your-backend.onrender.com/api/payment-callback
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

### Step 4: Deploy

Render will automatically deploy your service. You'll get a URL like:
`https://paytm-payment-api.onrender.com`

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your credentials

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### GET /
Health check endpoint
```
Response: { status: 'ok', message: 'Paytm Payment Gateway API' }
```

### GET /health
Service health status
```
Response: { status: 'healthy' }
```

### POST /api/initiate-payment
Generates checksum for payment initiation.

**Request:**
```json
{
  "orderId": "ORD123456",
  "amount": "500.00",
  "customerId": "CUST001",
  "customerEmail": "customer@example.com",
  "customerPhone": "9876543210"
}
```

**Response:**
```json
{
  "MID": "...",
  "ORDER_ID": "ORD123456",
  "TXN_AMOUNT": "500.00",
  "CHECKSUMHASH": "...",
  "CALLBACK_URL": "..."
}
```

### POST /api/payment-callback
Verifies payment response from Paytm and redirects to frontend.

**Paytm sends payment response here**
- Verifies checksum
- Redirects to frontend with payment status

### POST /api/verify-transaction
Manually verify transaction status.

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

## Frontend Integration

Update your frontend `.env.local`:

```env
VITE_BACKEND_URL=https://your-backend.onrender.com
```

Update `src/lib/paytm.ts`:

```typescript
export const initiatePaytmPayment = async (orderData: PaytmOrderData) => {
  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/initiate-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  
  const data = await response.json();
  return data;
};
```

## Important Notes

### Render Free Tier
- Service spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Upgrade to paid plan for always-on service

### Security
- Never expose merchant key in frontend
- Always verify checksums on backend
- Use HTTPS in production (Render provides this)
- Validate all inputs
- Store sensitive data in environment variables

### CORS
The backend is configured to accept requests from your frontend URL. Update `FRONTEND_URL` environment variable with your actual frontend URL.

## Production Checklist

- [ ] Set all environment variables in Render
- [ ] Update `PAYTM_CALLBACK_URL` with your Render URL
- [ ] Update `FRONTEND_URL` with your Vercel URL
- [ ] Set `PAYTM_ENV=production`
- [ ] Test payment flow end-to-end
- [ ] Set up database for order storage
- [ ] Implement email notifications
- [ ] Add logging and monitoring
- [ ] Enable Render health checks

## Troubleshooting

### Service not responding
- Check Render logs in dashboard
- Verify environment variables are set
- Ensure service is not sleeping (free tier)

### CORS errors
- Verify `FRONTEND_URL` matches your actual frontend
- Check CORS configuration in server.js

### Payment callback not working
- Verify `PAYTM_CALLBACK_URL` is correct
- Check Render logs for errors
- Ensure Paytm can reach your Render URL

## Support

- Render Docs: https://render.com/docs
- Paytm Developer Docs: https://developer.paytm.com/
