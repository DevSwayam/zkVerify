# 💳 NoName Crypto Payment Widget for Merchants

A complete, copy-paste solution for accepting crypto payments on any website using NoName Stealth Addresses.

## 🚀 Quick Start

### 1. Register as a Merchant

First, register your merchant account to get your username:

```bash
curl -X POST https://stealth-lemon.vercel.app/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your-store-name",
    "email": "store@example.com",
    "isMerchant": true,
    "viewingPrivateKey": "0x...",
    "spendingPublicKey": "0x...",
    "chains": [...]
  }'
```

### 2. Download Files

Download these files to your website:

- `merchant-widget.js` - The payment widget
- `widget-examples.html` - Integration examples (optional)

### 3. Basic Integration

Add this to your HTML where you want the payment button:

```html
<!-- Payment widget container -->
<div
  id="crypto-payment"
  data-noname-payment
  data-merchant="your-store-name"
  data-amount="99.99"
  data-product="Your Product Name"
></div>

<!-- Include the widget script -->
<script src="merchant-widget.js"></script>
```

### 4. Handle Payment Success

Listen for successful payments:

```javascript
document.addEventListener("noname-payment-success", (event) => {
  const { amount, token, stealthData } = event.detail;

  // Your success logic here
  console.log(`Payment received: ${amount} ${token.symbol}`);
  alert("Payment successful! Order confirmed.");

  // Redirect to success page
  window.location.href = "/order-success";
});
```

## ✨ Features

- **🔓 No Authentication Required**: Customers can pay without accounts
- **🎨 Fully Customizable**: Match your brand colors and styling
- **📱 Responsive Design**: Works on desktop and mobile
- **🔒 Secure**: Uses stealth addresses for privacy
- **⚡ Fast Setup**: Copy-paste integration in 5 minutes
- **🌐 Multi-Token**: Support USDC, USDT, and more
- **📊 Event Driven**: Easy backend integration

## 📋 Configuration Options

```javascript
const widget = new NoNamePaymentWidget({
  // Required
  merchantUsername: "your-store-name",

  // Customization
  defaultAmount: "50.00",
  productName: "Your Product",

  // Branding
  theme: {
    primaryColor: "#your-brand-color",
    borderRadius: "8px",
    fontFamily: "your-font",
  },

  // Tokens
  supportedTokens: [
    {
      symbol: "USDC",
      name: "USD Coin",
      chainId: 1328,
      tokenAddress: "0x...",
    },
  ],
});
```

## 🛒 Use Cases

### E-commerce Stores

```html
<div id="product-payment"></div>
<script>
  const widget = new NoNamePaymentWidget({
    merchantUsername: "fashion-store",
    defaultAmount: "149.99",
    productName: "Designer T-Shirt",
  });
  widget.renderIn("product-payment");
</script>
```

### SaaS Subscriptions

```html
<div id="subscription-payment"></div>
<script>
  const widget = new NoNamePaymentWidget({
    merchantUsername: "saas-platform",
    defaultAmount: "29.99",
    productName: "Pro Plan - Monthly",
  });
  widget.renderIn("subscription-payment");
</script>
```

### Digital Downloads

```html
<div id="download-payment"></div>
<script>
  const widget = new NoNamePaymentWidget({
    merchantUsername: "digital-creator",
    defaultAmount: "9.99",
    productName: "Premium Template Pack",
  });
  widget.renderIn("download-payment");
</script>
```

## 🔧 Advanced Integration

### Dynamic Pricing

```javascript
// Update amount based on user selection
function updatePrice(newAmount) {
  const amountInput = document.querySelector(".noname-amount-input");
  if (amountInput) {
    amountInput.value = newAmount;
  }
}
```

### Backend Integration

```javascript
document.addEventListener("noname-payment-success", async (event) => {
  const paymentData = event.detail;

  // Send to your backend
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: paymentData.amount,
      currency: paymentData.token.symbol,
      paymentAddress: paymentData.stealthData.address,
      customerData: getCustomerInfo(),
    }),
  });

  if (response.ok) {
    // Order created successfully
    window.location.href = "/order-confirmation";
  }
});
```

### Analytics Tracking

```javascript
document.addEventListener("noname-payment-success", (event) => {
  // Google Analytics
  if (typeof gtag !== "undefined") {
    gtag("event", "purchase", {
      transaction_id: event.detail.stealthData.address,
      value: event.detail.amount,
      currency: event.detail.token.symbol,
    });
  }

  // Facebook Pixel
  if (typeof fbq !== "undefined") {
    fbq("track", "Purchase", {
      value: event.detail.amount,
      currency: event.detail.token.symbol,
    });
  }
});
```

## 🎨 Styling Examples

### Dark Theme

```javascript
const darkWidget = new NoNamePaymentWidget({
  merchantUsername: "your-store",
  theme: {
    primaryColor: "#6B46C1",
    backgroundColor: "#1A202C",
    textColor: "#E2E8F0",
    borderRadius: "12px",
  },
});
```

### Minimal Style

```javascript
const minimalWidget = new NoNamePaymentWidget({
  merchantUsername: "your-store",
  theme: {
    primaryColor: "#000000",
    backgroundColor: "#FFFFFF",
    borderRadius: "4px",
    fontFamily: "Arial, sans-serif",
  },
});
```

## 🔒 Security Best Practices

1. **Verify Payments**: Always verify payments on your backend
2. **Use HTTPS**: Ensure your website uses SSL/TLS
3. **Validate Amounts**: Check payment amounts match your prices
4. **Monitor Addresses**: Track payments to generated addresses
5. **Rate Limiting**: Implement rate limiting for payment generation

## 📊 Payment Flow

1. **Customer** clicks "Pay with Crypto"
2. **Widget** generates unique stealth address via API
3. **Customer** scans QR code or copies address
4. **Customer** sends payment from their wallet
5. **Blockchain** confirms transaction
6. **Your Backend** receives payment notification
7. **Order** is fulfilled automatically

## 🛠️ Troubleshooting

### Widget Not Appearing

- Check if script is loaded: `typeof NoNamePaymentWidget !== 'undefined'`
- Verify container element exists
- Check browser console for errors

### Payment Generation Fails

- Verify merchant username is correct
- Check API connectivity to `https://stealth-lemon.vercel.app`
- Ensure token addresses are supported

### Events Not Firing

- Check event listener is attached after DOM load
- Verify event name: `noname-payment-success`
- Check browser console for JavaScript errors

## 📞 Support

- **Documentation**: See `widget-examples.html` for live examples
- **API Docs**: Check the NoName API documentation
- **Issues**: Report bugs via GitHub issues

## 📄 License

This widget is free to use for all NoName merchants. Integrate and start accepting crypto payments today!

---

**🚀 Ready to start accepting crypto payments? Copy the code above and you're live in minutes!**
