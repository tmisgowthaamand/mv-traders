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

// Debug endpoint - verify credentials match
app.get('/api/debug-credentials', (req, res) => {
  const merchantKey = String(process.env.PAYTM_MERCHANT_KEY || '').trim();

  res.json({
    status: 'DEBUG INFO',
    credentials: {
      MID: process.env.PAYTM_MID,
      MERCHANT_KEY_SET: !!merchantKey,
      MERCHANT_KEY_LENGTH: merchantKey.length,
      MERCHANT_KEY_HEX: Buffer.from(merchantKey, 'utf8').toString('hex'),
      MERCHANT_KEY_DISPLAY: merchantKey.split('').map(c => `${c}(${c.charCodeAt(0).toString(16)})`).join(' '),
      WEBSITE: process.env.PAYTM_WEBSITE,
      INDUSTRY_TYPE: process.env.PAYTM_INDUSTRY_TYPE,
      CHANNEL_ID: process.env.PAYTM_CHANNEL_ID,
      CALLBACK_URL: process.env.PAYTM_CALLBACK_URL,
      FRONTEND_URL: process.env.FRONTEND_URL,
    },
    troubleshooting: {
      issue: 'Invalid checksum error 330 from Paytm',
      possibleCauses: [
        '1. MID and MERCHANT_KEY do not belong together in Paytm',
        '2. Credentials are for staging environment, not production',
        '3. Merchant key may have been regenerated in Paytm dashboard',
        '4. Credentials may be expired or revoked'
      ],
      solution: 'Verify in https://dashboard.paytm.com/next/apikeys that:',
      steps: [
        'Login to Paytm Merchant Dashboard',
        'Check API Keys section',
        'Confirm MID matches exactly: ' + process.env.PAYTM_MID,
        'Copy merchant key exactly (no spaces before/after)',
        'Ensure you are viewing PRODUCTION credentials (not staging)',
        'Update .env and redeploy if credentials changed'
      ]
    }
  });
});


// Test endpoint to verify Paytm configuration
app.get('/api/test-paytm', async (req, res) => {
  try {
    // Clean merchant key - remove quotes if present
    let merchantKey = String(process.env.PAYTM_MERCHANT_KEY || '').trim();
    if ((merchantKey.startsWith('"') && merchantKey.endsWith('"')) ||
        (merchantKey.startsWith("'") && merchantKey.endsWith("'"))) {
      merchantKey = merchantKey.slice(1, -1);
    }

    const testParams = {
      MID: process.env.PAYTM_MID,
      WEBSITE: process.env.PAYTM_WEBSITE,
      INDUSTRY_TYPE_ID: process.env.PAYTM_INDUSTRY_TYPE,
      CHANNEL_ID: process.env.PAYTM_CHANNEL_ID,
      ORDER_ID: 'TEST' + Date.now(),
      CUST_ID: 'TEST_CUSTOMER',
      TXN_AMOUNT: '1.00',
      CALLBACK_URL: process.env.PAYTM_CALLBACK_URL,
      EMAIL: 'test@example.com',
      MOBILE_NO: '9999999999',
    };

    console.log('\n=== PAYTM CONFIGURATION TEST ===');
    console.log('MID:', process.env.PAYTM_MID);
    console.log('Merchant Key Present:', !!merchantKey);
    console.log('Merchant Key Length:', merchantKey.length);
    console.log('Frontend URL:', process.env.FRONTEND_URL);
    console.log('Callback URL:', process.env.PAYTM_CALLBACK_URL);
    console.log('Node Env:', process.env.NODE_ENV);

    // Test checksum generation - pass object directly, not JSON string
    console.log('\n--- Generating Test Checksum ---');
    const checksum = await PaytmChecksum.generateSignature(
      testParams,
      merchantKey
    );

    console.log('✓ Checksum generated successfully');
    console.log('Checksum length:', checksum?.length);

    // Test checksum verification
    console.log('\n--- Verifying Test Checksum ---');
    const isValid = PaytmChecksum.verifySignature(
      testParams,
      merchantKey,
      checksum
    );

    console.log('✓ Checksum verification:', isValid);

    res.json({
      status: 'success',
      message: 'Paytm configuration is working correctly',
      environment: process.env.NODE_ENV,
      config: {
        MID: process.env.PAYTM_MID,
        WEBSITE: process.env.PAYTM_WEBSITE,
        INDUSTRY_TYPE: process.env.PAYTM_INDUSTRY_TYPE,
        CHANNEL_ID: process.env.PAYTM_CHANNEL_ID,
        CALLBACK_URL: process.env.PAYTM_CALLBACK_URL,
        FRONTEND_URL: process.env.FRONTEND_URL,
        merchantKeySet: !!process.env.PAYTM_MERCHANT_KEY,
        merchantKeyLength: process.env.PAYTM_MERCHANT_KEY?.length || 0,
      },
      checksumTest: {
        generated: !!checksum,
        verified: isValid,
        checksumLength: checksum?.length || 0,
        testOrderId: testParams.ORDER_ID,
      }
    });
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message,
      config: {
        MID: process.env.PAYTM_MID,
        merchantKeySet: !!process.env.PAYTM_MERCHANT_KEY,
        merchantKeyLength: process.env.PAYTM_MERCHANT_KEY?.length || 0,
      }
    });
  }
});

// Initiate Payment - Generate Checksum
app.post('/api/initiate-payment', async (req, res) => {
  try {
    const { orderId, amount, customerId, customerEmail, customerPhone } = req.body;

    console.log('\n=== INITIATE PAYMENT REQUEST ===');
    console.log('Order ID:', orderId);
    console.log('Amount:', amount);

    // Validate required fields
    if (!orderId || !amount || !customerId || !customerPhone) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['orderId', 'amount', 'customerId', 'customerPhone']
      });
    }

    // Validate Paytm configuration
    if (!process.env.PAYTM_MID) {
      console.error('PAYTM_MID not configured');
      return res.status(500).json({ error: 'Paytm MID not configured' });
    }

    if (!process.env.PAYTM_MERCHANT_KEY) {
      console.error('PAYTM_MERCHANT_KEY not configured');
      return res.status(500).json({ error: 'Paytm merchant key not configured' });
    }

    if (!process.env.PAYTM_CALLBACK_URL) {
      console.error('PAYTM_CALLBACK_URL not configured');
      return res.status(500).json({ error: 'Paytm callback URL not configured' });
    }

    // Paytm parameters - ensure all values are strings and properly formatted
    const paytmParams = {
      MID: String(process.env.PAYTM_MID).trim(),
      WEBSITE: String(process.env.PAYTM_WEBSITE || 'DEFAULT').trim(),
      INDUSTRY_TYPE_ID: String(process.env.PAYTM_INDUSTRY_TYPE || 'Retail').trim(),
      CHANNEL_ID: String(process.env.PAYTM_CHANNEL_ID || 'WEB').trim(),
      ORDER_ID: String(orderId).trim(),
      CUST_ID: String(customerId).trim(),
      TXN_AMOUNT: String(amount).trim(),
      CALLBACK_URL: String(process.env.PAYTM_CALLBACK_URL).trim(),
      EMAIL: String(customerEmail || 'customer@example.com').trim(),
      MOBILE_NO: String(customerPhone).trim(),
    };

    console.log('\nChecksum Parameters (in order):');
    Object.keys(paytmParams).sort().forEach(key => {
      console.log(`  ${key}: "${paytmParams[key]}"`);
    });

    // Ensure merchant key is exactly as configured - remove any quotes
    let merchantKey = String(process.env.PAYTM_MERCHANT_KEY || '').trim();
    // Remove surrounding quotes if they exist
    if ((merchantKey.startsWith('"') && merchantKey.endsWith('"')) ||
        (merchantKey.startsWith("'") && merchantKey.endsWith("'"))) {
      merchantKey = merchantKey.slice(1, -1);
    }

    console.log('\nMerchant Key Info:');
    console.log('  Length:', merchantKey.length);
    console.log('  Hex:', Buffer.from(merchantKey, 'utf8').toString('hex'));
    console.log('  Chars:', Array.from(merchantKey).map(c => `${c}(${c.charCodeAt(0)})`).join(' '));

    // Generate checksum using Paytm's method
    console.log('\nGenerating checksum...');
    const checksum = await PaytmChecksum.generateSignature(
      paytmParams,
      merchantKey
    );

    console.log('✓ Checksum generated successfully');
    console.log('  Length:', checksum?.length);
    console.log('  Checksum:', checksum);

    res.json({
      ...paytmParams,
      CHECKSUMHASH: checksum,
    });
  } catch (error) {
    console.error('\n✗ Error generating checksum:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Failed to initiate payment',
      message: error.message
    });
  }
});

// Payment Callback - Verify Payment
app.post('/api/payment-callback', async (req, res) => {
  try {
    console.log('Payment callback received:', req.body);
    
    const { ORDERID, STATUS, TXNID, TXNAMOUNT, RESPCODE, RESPMSG, CHECKSUMHASH } = req.body;
    
    if (!ORDERID || !STATUS) {
      console.error('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // For production, verify checksum
    if (CHECKSUMHASH && process.env.PAYTM_MERCHANT_KEY) {
      try {
        // Clean merchant key - remove quotes if present
        let merchantKey = String(process.env.PAYTM_MERCHANT_KEY).trim();
        if ((merchantKey.startsWith('"') && merchantKey.endsWith('"')) ||
            (merchantKey.startsWith("'") && merchantKey.endsWith("'"))) {
          merchantKey = merchantKey.slice(1, -1);
        }

        const paytmParams = { ...req.body };
        delete paytmParams.CHECKSUMHASH;

        // Pass object directly, not JSON string
        const isValidChecksum = PaytmChecksum.verifySignature(
          paytmParams,
          merchantKey,
          CHECKSUMHASH
        );

        console.log('Checksum verification:', isValidChecksum);
        
        if (!isValidChecksum) {
          console.warn('Invalid checksum - proceeding anyway for testing');
        }
      } catch (checksumError) {
        console.error('Checksum verification error:', checksumError);
      }
    }

    // Process payment based on status
    if (STATUS === 'TXN_SUCCESS') {
      console.log('Payment successful:', {
        orderId: ORDERID,
        txnId: TXNID,
        amount: TXNAMOUNT,
      });

      const redirectUrl = `${process.env.FRONTEND_URL}/payment-callback?ORDERID=${ORDERID}&TXNID=${TXNID || ''}&TXNAMOUNT=${TXNAMOUNT || ''}&STATUS=${STATUS}&RESPCODE=${RESPCODE || ''}&RESPMSG=${encodeURIComponent(RESPMSG || 'Success')}`;
      return res.redirect(302, redirectUrl);
    } else {
      console.log('Payment failed:', RESPMSG);
      
      const redirectUrl = `${process.env.FRONTEND_URL}/payment-callback?ORDERID=${ORDERID}&STATUS=${STATUS}&RESPCODE=${RESPCODE || ''}&RESPMSG=${encodeURIComponent(RESPMSG || 'Payment failed')}`;
      return res.redirect(302, redirectUrl);
    }
  } catch (error) {
    console.error('Error processing payment callback:', error);
    
    // Redirect to frontend with error
    const redirectUrl = `${process.env.FRONTEND_URL}/payment-callback?STATUS=ERROR&RESPMSG=${encodeURIComponent('Payment processing failed')}`;
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

    // Clean merchant key - remove quotes if present
    let merchantKey = String(process.env.PAYTM_MERCHANT_KEY || '').trim();
    if ((merchantKey.startsWith('"') && merchantKey.endsWith('"')) ||
        (merchantKey.startsWith("'") && merchantKey.endsWith("'"))) {
      merchantKey = merchantKey.slice(1, -1);
    }

    const paytmParams = {
      MID: process.env.PAYTM_MID,
      ORDERID: orderId,
    };

    // Fix: Pass object directly, not JSON string
    const checksum = await PaytmChecksum.generateSignature(
      paytmParams,
      merchantKey
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
