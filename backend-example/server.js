// Node.js Backend for Paytm Integration on Render
// Install: npm install express paytmchecksum cors dotenv

const express = require('express');
const PaytmChecksum = require('paytmchecksum');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Health check endpoint for Render
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Paytm Payment Gateway API',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Initiate Payment - Generate Checksum
app.post('/api/initiate-payment', async (req, res) => {
  try {
    const { orderId, amount, customerId, customerEmail, customerPhone } = req.body;

    // Validate required fields
    if (!orderId || !amount || !customerId || !customerPhone) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['orderId', 'amount', 'customerId', 'customerPhone']
      });
    }

    const paytmParams = {
      MID: process.env.PAYTM_MID,
      WEBSITE: process.env.PAYTM_WEBSITE || 'DEFAULT',
      INDUSTRY_TYPE_ID: process.env.PAYTM_INDUSTRY_TYPE || 'Retail',
      CHANNEL_ID: process.env.PAYTM_CHANNEL_ID || 'WEB',
      ORDER_ID: orderId,
      CUST_ID: customerId,
      TXN_AMOUNT: amount,
      CALLBACK_URL: process.env.PAYTM_CALLBACK_URL,
      EMAIL: customerEmail || 'customer@example.com',
      MOBILE_NO: customerPhone,
    };

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams),
      process.env.PAYTM_MERCHANT_KEY
    );

    res.json({
      ...paytmParams,
      CHECKSUMHASH: checksum,
    });
  } catch (error) {
    console.error('Error generating checksum:', error);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// Payment Callback - Verify Payment
app.post('/api/payment-callback', async (req, res) => {
  try {
    console.log('Payment callback received:', req.body);
    
    const paytmChecksum = req.body.CHECKSUMHASH;
    
    if (!paytmChecksum) {
      console.error('No checksum received');
      return res.status(400).json({ error: 'No checksum received' });
    }
    
    const paytmParams = { ...req.body };
    delete paytmParams.CHECKSUMHASH;

    // Convert params to string for verification
    const paramsString = JSON.stringify(paytmParams);
    
    const isValidChecksum = PaytmChecksum.verifySignature(
      paramsString,
      process.env.PAYTM_MERCHANT_KEY,
      paytmChecksum
    );

    console.log('Checksum valid:', isValidChecksum);

    if (isValidChecksum) {
      const { ORDERID, STATUS, TXNID, TXNAMOUNT, RESPCODE, RESPMSG } = req.body;

      if (STATUS === 'TXN_SUCCESS') {
        console.log('Payment successful:', {
          orderId: ORDERID,
          txnId: TXNID,
          amount: TXNAMOUNT,
        });

        const redirectUrl = `${process.env.FRONTEND_URL}/payment-callback?ORDERID=${ORDERID}&TXNID=${TXNID}&TXNAMOUNT=${TXNAMOUNT}&STATUS=${STATUS}&RESPCODE=${RESPCODE}&RESPMSG=${encodeURIComponent(RESPMSG)}`;
        return res.redirect(302, redirectUrl);
      } else {
        console.log('Payment failed:', RESPMSG);
        
        const redirectUrl = `${process.env.FRONTEND_URL}/payment-callback?ORDERID=${ORDERID}&STATUS=${STATUS}&RESPCODE=${RESPCODE}&RESPMSG=${encodeURIComponent(RESPMSG)}`;
        return res.redirect(302, redirectUrl);
      }
    } else {
      console.error('Invalid checksum');
      return res.status(400).json({ error: 'Invalid checksum' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    
    // Redirect to frontend with error
    const redirectUrl = `${process.env.FRONTEND_URL}/payment-callback?STATUS=ERROR&RESPMSG=${encodeURIComponent('Payment verification failed')}`;
    return res.redirect(302, redirectUrl);
  }
});

// Verify Transaction Status (Optional - for manual verification)
app.post('/api/verify-transaction', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const paytmParams = {
      MID: process.env.PAYTM_MID,
      ORDERID: orderId,
    };

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams),
      process.env.PAYTM_MERCHANT_KEY
    );

    res.json({
      ...paytmParams,
      CHECKSUMHASH: checksum,
      message: 'Use this data to verify transaction with Paytm'
    });
  } catch (error) {
    console.error('Error verifying transaction:', error);
    res.status(500).json({ error: 'Transaction verification failed' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
});
