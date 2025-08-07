# NoName Stealth Address API Documentation

> **Version:** 3.0.0  
> **Description:** A TypeScript server with Express, Viem, and Supabase integration for stealth address generation with multi-chain support, real-time payment tracking, and device session management.

## 🌟 Key Features

- **🔓 Public Stealth Generation**: Anyone can generate stealth addresses for any username without authentication
- **👥 User Types**: Support for both merchants (with API keys) and regular users (public access only)
- **🔗 Multi-Chain Support**: Support for multiple blockchain networks per user
- **🎯 Token Validation**: Configure specific token contract addresses per chain
- **💳 Payment Tracking**: Unique payment IDs with real-time monitoring
- **📡 Event Listeners**: 3-minute blockchain monitoring windows
- **📱 Device Sessions**: Consistent address returns on device refresh
- **🔄 Concurrent Users**: Multiple simultaneous payment tracking
- **👤 Custom Username Routes**: Username-based API endpoints
- **🔢 Automatic Nonce Management**: Tracks and increments nonces automatically
- **🛡️ Safe Address Prediction**: Predicts Safe wallet addresses for enhanced security
- **🔐 Single Address Generation**: Generates exactly one stealth address per request
- **📊 Test Address Generation**: Automatic test address during registration for validation

## 🔐 Authentication

- **Public Endpoints**: Stealth address generation and payment tracking require NO authentication
- **User Types**: 
  - **Merchants**: Get API keys during registration (`isMerchant: true`)
  - **Regular Users**: No API keys needed (`isMerchant: false` or omitted)
- **Protected Endpoints**: Only user profile access requires authentication
- **Headers for Protected Endpoints** (merchants only):
  - `X-API-Key`: Your API key (from registration)
  - `Authorization`: Bearer JWT token

## 🌐 Base URL

```
http://localhost:3000
```

## 📊 Rate Limiting

- **Auth endpoints** (register/login): 5 requests per 15 minutes
- **Stealth generation**: 100 requests per 15 minutes
- **Payment tracking**: No specific limits
- **Other endpoints**: Standard rate limiting applied

---

## 📋 Table of Contents

1. [User Management](#-user-management)
2. [Stealth Address Generation (Enhanced)](#-stealth-address-generation-enhanced)
3. [Payment Tracking](#-payment-tracking)
4. [Event Listener Monitoring](#-event-listener-monitoring)
5. [Data Retrieval](#-data-retrieval)
6. [Health Checks](#-health-checks)
7. [Error Handling](#-error-handling)
8. [Examples](#-examples)

---

## 👤 User Management

### 1. Register User

**POST** `/api/user/register`

Creates a new user account with stealth address capabilities.

#### Request Body

```json
{
  "username": "mystore",
  "email": "store@example.com",
  "viewingPrivateKey": "0x54a2a7c97b0396c69ce3d49f617a5f77e690835f726aa546fa065510e639ff41",
  "spendingPublicKey": "0x043b6784f290ddf0adc6c7739bd0ff010344cc94d3e1e5f666af05c75fc2bd4f2b7b6786cdcdeda78decddecc15f1308c6b48c4f66a7eeec208daa8d82d16ea786",
  "isMerchant": true,
  "deviceId": "optional_device_identifier",
  "chains": [
    {
      "chainId": 84532,
      "name": "Base Sepolia",
      "tokenAddresses": [
        "0x0000000000000000000000000000000000000000"
      ]
    }
  ]
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | ✅ | Unique username (used in API routes) |
| `email` | string | ✅ | User email address |
| `viewingPrivateKey` | string | ✅ | Hex-encoded viewing private key |
| `spendingPublicKey` | string | ✅ | Hex-encoded spending public key |
| `isMerchant` | boolean | ❌ | Whether user is a merchant (defaults to false) |
| `deviceId` | string | ❌ | Optional device identifier for session tracking |
| `chains` | array | ✅ | Array of supported blockchain configurations |
| `chains[].chainId` | number | ✅ | Blockchain network ID |
| `chains[].name` | string | ❌ | Human-readable chain name |
| `chains[].tokenAddresses` | array | ✅ | Supported token contract addresses |

#### Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "73dd09b0-e742-4e4c-9500-fa8c6b3c0b5d",
      "username": "mystore",
      "email": "store@example.com",
      "isMerchant": true,
      "chains": [
        {
          "chainId": 84532,
          "name": "Base Sepolia",
          "tokenAddresses": ["0x0000000000000000000000000000000000000000"]
        }
      ],
      "apiKey": "sk_3802982c47c7c7559..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "testStealthAddress": {
      "address": "0x8091a01a2dd1602e127815a786489920ccd38fcd",
      "chainId": 84532,
      "chainName": "Base Sepolia",
      "tokenAddress": "0x0000000000000000000000000000000000000000",
      "tokenAmount": "1.0",
      "paymentId": "pay_1mvk2nq_a1b2c3d4",
      "nonce": 0,
      "newNonce": 1,
      "safeAddress": {
        "address": "0x600a9bfc3fa080554788c8e4c593a4399ff6d6f6",
        "isDeployed": false
      }
    },
    "instructions": {
      "apiKey": "Use this API key in the X-API-Key header for profile access",
      "token": "Use this JWT token in the Authorization: Bearer <token> header for profile access",
      "endpoint": "Your custom endpoint: /api/user/mystore/stealth",
      "note": "As a merchant, you have API key access for profile management",
      "supportedChains": [
        {
          "chainId": 84532,
          "tokenCount": 1,
          "name": "Base Sepolia"
        }
      ],
      "testAddress": "Test stealth address generated successfully - your setup is working!"
    }
  },
  "message": "User registered successfully",
  "timestamp": "2025-07-09T14:54:46.679Z"
}
```

### 2. Login User

**POST** `/api/user/login`

Generate a new JWT token for existing user. **API key is only required for merchants.**

#### Request Body

**For Merchants:**
```json
{
  "email": "store@example.com",
  "apiKey": "sk_3802982c47c7c7559..."
}
```

**For Regular Users:**
```json
{
  "email": "user@example.com"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "73dd09b0-e742-4e4c-9500-fa8c6b3c0b5d",
      "username": "mystore",
      "email": "store@example.com",
      "isMerchant": true,
      "chains": [
        {
          "chainId": 84532,
          "tokenCount": 1,
          "name": "Base Sepolia"
        }
      ]
    },
    "endpoint": "/api/user/mystore/stealth",
    "note": "Merchant login successful - you have API key access"
  },
  "message": "Login successful"
}
```

---

## 🎯 Stealth Address Generation (Enhanced)

### Generate Stealth Address with Payment Tracking

**POST** `/api/user/{username}/stealth`

Generate a stealth address with automatic payment tracking and blockchain event monitoring.

#### Request Body

```json
{
  "chainId": 84532,
  "tokenAddress": "0x0000000000000000000000000000000000000000",
  "tokenAmount": "0.001",
  "deviceId": "my_device_123",
  "reuseSession": true
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chainId` | number | ❌ | Blockchain network ID (uses first supported if omitted) |
| `tokenAddress` | string | ✅ | Token contract address (use `0x000...000` for native tokens) |
| `tokenAmount` | string | ✅ | Amount to be sent to this address |
| `deviceId` | string | ❌ | Device identifier (auto-generated if omitted) |
| `reuseSession` | boolean | ❌ | Return same address if active session exists (default: false) |

#### Response

```json
{
  "success": true,
  "data": {
    "address": "0x2b8401cdb06bba633b6a422525efccf2d74fa648",
    "chainId": 84532,
    "chainName": "Base Sepolia",
    "tokenAddress": "0x0000000000000000000000000000000000000000",
    "tokenAmount": "0.001",
    "paymentId": "pay_1mvk2nq_a1b2c3d4",
    "safeAddress": {
      "address": "0x8225f0689bfaa5ae98c10f52939d0b6b0b3f4fe5",
      "isDeployed": false
    },
    "eventListener": {
      "listenerId": "pay_1mvk2nq_a1b2c3d4_0x2b8401cdb06bba633b6a422525efccf2d74fa648",
      "isActive": true,
      "startTime": "2025-07-09T19:05:33.123Z",
      "timeRemaining": 180,
      "timeoutMinutes": 3
    }
  },
  "message": "Stealth address generated successfully with payment tracking",
  "timestamp": "2025-07-09T19:05:33.123Z"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Generated stealth address |
| `chainId` | number | Blockchain network ID |
| `chainName` | string | Human-readable chain name |
| `tokenAddress` | string | Token contract address |
| `tokenAmount` | string | Expected payment amount |
| `paymentId` | string | Unique payment tracking identifier |
| `safeAddress` | object | Predicted Safe wallet information |
| `eventListener` | object | Real-time monitoring information |
| `eventListener.isActive` | boolean | Whether monitoring is active |
| `eventListener.timeRemaining` | number | Seconds until timeout |
| `eventListener.timeoutMinutes` | number | Total timeout duration |

---

## 💳 Payment Tracking

### Get Payment Status

**GET** `/api/user/payment/{paymentId}/status`

Check the status of a payment session and its blockchain monitoring.

#### Response

```json
{
  "success": true,
  "data": {
    "paymentId": "pay_1mvk2nq_a1b2c3d4",
    "stealthAddress": "0x2b8401cdb06bba633b6a422525efccf2d74fa648",
    "status": "listening",
    "chainId": 84532,
    "tokenAddress": "0x0000000000000000000000000000000000000000",
    "tokenAmount": "0.001",
    "isActive": true,
    "expiresAt": "2025-07-09T19:08:33.123Z",
    "completedAt": null,
    "transactionHash": null,
    "fromAddress": null,
    "actualAmount": null,
    "createdAt": "2025-07-09T19:05:33.123Z",
    "eventListener": {
      "listenerId": "pay_1mvk2nq_a1b2c3d4_0x2b8401cdb06bba633b6a422525efccf2d74fa648",
      "isActive": true,
      "startTime": "2025-07-09T19:05:33.123Z",
      "timeRemaining": 147,
      "timeoutMinutes": 3
    }
  },
  "message": "Payment status retrieved successfully",
  "timestamp": "2025-07-09T19:06:06.234Z"
}
```

#### Payment Status Values

| Status | Description |
|--------|-------------|
| `pending` | Payment session created, listener starting |
| `listening` | Actively monitoring blockchain for payments |
| `completed` | Payment detected and confirmed |
| `expired` | 3-minute timeout reached without payment |
| `cancelled` | Payment session manually cancelled |

#### When Payment is Detected

```json
{
  "success": true,
  "data": {
    "paymentId": "pay_1mvk2nq_a1b2c3d4",
    "stealthAddress": "0x2b8401cdb06bba633b6a422525efccf2d74fa648",
    "status": "completed",
    "chainId": 84532,
    "tokenAddress": "0x0000000000000000000000000000000000000000",
    "tokenAmount": "0.001",
    "isActive": false,
    "expiresAt": "2025-07-09T19:08:33.123Z",
    "completedAt": "2025-07-09T19:07:15.456Z",
    "transactionHash": "0xabcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
    "fromAddress": "0x742d35cc6e7c5a3dbcd4181e5b2a4df3e4b16a2b",
    "actualAmount": "0.001",
    "createdAt": "2025-07-09T19:05:33.123Z"
  },
  "message": "Payment status retrieved successfully",
  "timestamp": "2025-07-09T19:07:16.789Z"
}
```

---

## 📡 Event Listener Monitoring

### Get Active Event Listeners

**GET** `/api/user/listeners/active`

Monitor all active blockchain event listeners across the system.

#### Response

```json
{
  "success": true,
  "data": {
    "totalActive": 3,
    "listeners": [
      {
        "paymentId": "pay_1mvk2nq_a1b2c3d4",
        "stealthAddress": "0x2b8401cdb06bba633b6a422525efccf2d74fa648",
        "chainId": 84532,
        "tokenAddress": "0x0000000000000000000000000000000000000000",
        "userId": "73dd09b0-e742-4e4c-9500-fa8c6b3c0b5d",
        "startTime": "2025-07-09T19:05:33.123Z",
        "timeRemaining": 147,
        "timeoutMinutes": 3
      },
      {
        "paymentId": "pay_2abc3def_b2c3d4e5",
        "stealthAddress": "0xf807afef2479f9b8f776a2a69ba65ece0dd85fb7",
        "chainId": 84532,
        "tokenAddress": "0x0000000000000000000000000000000000000000",
        "userId": "84dd09b0-f842-5e5c-a600-gb8c7b4c1c6e",
        "startTime": "2025-07-09T19:06:45.678Z",
        "timeRemaining": 75,
        "timeoutMinutes": 3
      }
    ],
    "serviceHealth": {
      "isHealthy": true,
      "activeListeners": 3,
      "supportedChains": [84532],
      "uptime": 12345.67
    }
  },
  "message": "Active listeners retrieved successfully",
  "timestamp": "2025-07-09T19:06:06.234Z"
}
```

---

## 📊 Data Retrieval

### Get User's Current Nonce

**GET** `/api/user/{username}/nonce`

Get the current nonce and supported chains for a user.

#### Response

```json
{
  "success": true,
  "data": {
    "currentNonce": 5,
    "userId": "73dd09b0-e742-4e4c-9500-fa8c6b3c0b5d",
    "username": "mystore",
    "supportedChains": [
      {
        "chainId": 84532,
        "tokenCount": 1,
        "name": "Base Sepolia",
        "tokenAddresses": ["0x0000000000000000000000000000000000000000"]
      }
    ]
  },
  "message": "Current nonce retrieved successfully"
}
```

### Get All Stealth Addresses

**GET** `/api/user/{username}/stealth-addresses`

Get all stealth addresses generated for a user.

#### Response

```json
{
  "success": true,
  "data": {
    "userId": "73dd09b0-e742-4e4c-9500-fa8c6b3c0b5d",
    "username": "mystore",
    "totalAddresses": 5,
    "addresses": [
      {
        "id": "addr_123",
        "nonce": 1,
        "stealthAddress": "0x2b8401cdb06bba633b6a422525efccf2d74fa648",
        "safeAddress": "0x8225f0689bfaa5ae98c10f52939d0b6b0b3f4fe5",
        "safeDeployed": false,
        "safeFunded": false,
        "chainId": 84532,
        "chainName": "Base Sepolia",
        "tokenAddress": "0x0000000000000000000000000000000000000000",
        "tokenAmount": "0.001",
        "generatedAt": "2025-07-09T19:05:33.123Z",
        "lastCheckedAt": "2025-07-09T19:05:33.123Z"
      }
    ]
  },
  "message": "Stealth addresses retrieved successfully"
}
```

### Get Stealth Address by Nonce

**GET** `/api/user/{username}/stealth-addresses/{nonce}`

Get a specific stealth address by its nonce value.

#### Response

```json
{
  "success": true,
  "data": {
    "id": "addr_123",
    "nonce": 1,
    "stealthAddress": "0x2b8401cdb06bba633b6a422525efccf2d74fa648",
    "safeAddress": "0x8225f0689bfaa5ae98c10f52939d0b6b0b3f4fe5",
    "safeDeployed": false,
    "safeFunded": false,
    "chainId": 84532,
    "chainName": "Base Sepolia",
    "tokenAddress": "0x0000000000000000000000000000000000000000",
    "tokenAmount": "0.001",
    "generatedAt": "2025-07-09T19:05:33.123Z",
    "lastCheckedAt": "2025-07-09T19:05:33.123Z"
  },
  "message": "Stealth address retrieved successfully"
}
```

---

## 💰 Funding Status & Resolver API

### Resolve Funding Status

**POST** `/api/user/{username}/resolve-funding`

Check and update the funding status for stealth addresses. This endpoint manually verifies if Safe addresses have received payments and updates the `safeFunded` status accordingly.

#### Request Body

```json
{
  "addressId": "addr_123",  // Optional: Check specific address by ID
  "forceCheck": false       // Optional: If true, checks all addresses regardless of current status
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `addressId` | string | ❌ | Specific stealth address ID to check (if omitted, checks unfunded addresses) |
| `forceCheck` | boolean | ❌ | If true, checks all addresses; if false, only checks unfunded ones |

#### Response

```json
{
  "success": true,
  "data": {
    "userId": "73dd09b0-e742-4e4c-9500-fa8c6b3c0b5d",
    "username": "mystore",
    "totalChecked": 3,
    "totalUpdated": 2,
    "addresses": [
      {
        "id": "addr_123",
        "stealthAddress": "0x2b8401cdb06bba633b6a422525efccf2d74fa648",
        "safeAddress": "0x8225f0689bfaa5ae98c10f52939d0b6b0b3f4fe5",
        "previousFundingStatus": false,
        "currentFundingStatus": true,
        "updated": true
      },
      {
        "id": "addr_124",
        "stealthAddress": "0x3c9512cab07cca744b7dd1e4fd9e3f5c6d8e1c92",
        "safeAddress": "0x9336f1ba5ad873e3e0c9f16ab1b4bb8a50b87f61",
        "previousFundingStatus": false,
        "currentFundingStatus": false,
        "updated": false
      }
    ]
  },
  "message": "Stealth address funding status resolved successfully"
}
```

### Get Funding Statistics

**GET** `/api/user/{username}/funding-stats`

Get comprehensive funding statistics for a user including total generated addresses, funded count, and percentage.

#### Response

```json
{
  "success": true,
  "data": {
    "userId": "73dd09b0-e742-4e4c-9500-fa8c6b3c0b5d",
    "username": "mystore",
    "statistics": {
      "totalGenerated": 10,
      "totalFunded": 7,
      "totalUnfunded": 3,
      "fundedPercentage": 70.0
    },
    "fundedAddresses": [
      {
        "id": "addr_123",
        "nonce": 1,
        "stealthAddress": "0x2b8401cdb06bba633b6a422525efccf2d74fa648",
        "safeAddress": "0x8225f0689bfaa5ae98c10f52939d0b6b0b3f4fe5",
        "chainId": 84532,
        "chainName": "Base Sepolia",
        "tokenAddress": "0x0000000000000000000000000000000000000000",
        "tokenAmount": "0.001",
        "generatedAt": "2025-07-09T19:05:33.123Z",
        "lastCheckedAt": "2025-07-09T19:08:45.567Z"
      }
    ]
  },
  "message": "Funding statistics retrieved successfully"
}
```

### Get Addresses by Funding Status

**GET** `/api/user/{username}/funded-addresses?funded=true`

Get stealth addresses filtered by their funding status.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `funded` | boolean | ❌ | If `true` returns funded addresses, if `false` returns unfunded (default: `true`) |

#### Examples

**Get funded addresses:**
```bash
GET /api/user/mystore/funded-addresses?funded=true
```

**Get unfunded addresses:**
```bash
GET /api/user/mystore/funded-addresses?funded=false
```

#### Response

```json
{
  "success": true,
  "data": {
    "userId": "73dd09b0-e742-4e4c-9500-fa8c6b3c0b5d",
    "username": "mystore",
    "fundingStatus": "funded",
    "totalAddresses": 7,
    "addresses": [
      {
        "id": "addr_123",
        "nonce": 1,
        "stealthAddress": "0x2b8401cdb06bba633b6a422525efccf2d74fa648",
        "safeAddress": "0x8225f0689bfaa5ae98c10f52939d0b6b0b3f4fe5",
        "safeDeployed": true,
        "safeFunded": true,
        "chainId": 84532,
        "chainName": "Base Sepolia",
        "tokenAddress": "0x0000000000000000000000000000000000000000",
        "tokenAmount": "0.001",
        "generatedAt": "2025-07-09T19:05:33.123Z",
        "lastCheckedAt": "2025-07-09T19:08:45.567Z"
      }
    ]
  },
  "message": "Funded stealth addresses retrieved successfully"
}
```

---

### Get User Profile (Protected)

**GET** `/api/user/{username}/profile`

Get user profile information. **Requires authentication for merchants.**

#### Headers (Merchants Only)

```
X-API-Key: sk_3802982c47c7c7559...
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "73dd09b0-e742-4e4c-9500-fa8c6b3c0b5d",
    "username": "mystore",
    "email": "store@example.com",
    "isMerchant": true,
    "chains": [
      {
        "chainId": 84532,
        "name": "Base Sepolia",
        "tokenAddresses": ["0x0000000000000000000000000000000000000000"]
      }
    ],
    "currentNonce": 5,
    "isActive": true,
    "createdAt": "2025-07-09T14:54:46.679Z"
  },
  "message": "Profile retrieved successfully"
}
```

---

## 🏥 Health Checks

### System Health

**GET** `/health`

Check overall system health and status.

#### Response

```json
{
  "success": true,
  "data": {
    "status": "OK",
    "timestamp": "2025-07-09T19:06:06.234Z",
    "services": {
      "database": "connected",
      "eventListeners": {
        "active": 3,
        "supportedChains": [84532]
      }
    },
    "uptime": 12345.67
  },
  "message": "Service is healthy"
}
```

---

## ⚠️ Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": "2025-07-09T19:06:06.234Z"
}
```

### Common Error Codes

| HTTP Code | Description | Common Causes |
|-----------|-------------|---------------|
| `400` | Bad Request | Missing required fields, invalid data format |
| `401` | Unauthorized | Missing or invalid API key/token |
| `404` | Not Found | User not found, payment session not found |
| `409` | Conflict | Username/email already exists |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side issues |

### Validation Errors

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "tokenAddress",
      "message": "tokenAddress is required and must be a valid address string"
    },
    {
      "field": "tokenAmount",
      "message": "Valid tokenAmount is required and must be greater than 0"
    }
  ],
  "timestamp": "2025-07-09T19:06:06.234Z"
}
```

---

## 🚀 Examples

### Complete Payment Flow Example

#### 1. Generate Stealth Address with Payment Tracking

```bash
curl -X POST http://localhost:3000/api/user/mystore/stealth \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 84532,
    "tokenAddress": "0x0000000000000000000000000000000000000000",
    "tokenAmount": "0.005",
    "deviceId": "my_device_123",
    "reuseSession": false
  }'
```

#### 2. Monitor Payment Status

```bash
curl -X GET http://localhost:3000/api/user/payment/pay_1mvk2nq_a1b2c3d4/status
```

#### 3. Check Active Listeners

```bash
curl -X GET http://localhost:3000/api/user/listeners/active
```

### Device Session Reuse Example

#### First Request (New Session)

```bash
curl -X POST http://localhost:3000/api/user/mystore/stealth \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "0x0000000000000000000000000000000000000000",
    "tokenAmount": "0.001",
    "deviceId": "device_123",
    "reuseSession": false
  }'
```

#### Second Request (Reuse Session)

```bash
curl -X POST http://localhost:3000/api/user/mystore/stealth \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "0x0000000000000000000000000000000000000000",
    "tokenAmount": "0.001",
    "deviceId": "device_123",
    "reuseSession": true
  }'
```

**Result**: Same stealth address returned if previous session is still active!

### JavaScript SDK Example

```javascript
class NoNameSDK {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  // Generate stealth address with payment tracking
  async generateStealthAddress(username, options = {}) {
    const {
      chainId,
      tokenAddress,
      tokenAmount,
      deviceId,
      reuseSession = false
    } = options;

    const response = await fetch(`${this.baseUrl}/api/user/${username}/stealth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chainId,
        tokenAddress,
        tokenAmount,
        deviceId,
        reuseSession
      })
    });

    return response.json();
  }

  // Monitor payment status
  async getPaymentStatus(paymentId) {
    const response = await fetch(`${this.baseUrl}/api/user/payment/${paymentId}/status`);
    return response.json();
  }

  // Check if payment completed
  async waitForPayment(paymentId, timeout = 180000) { // 3 minutes default
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.getPaymentStatus(paymentId);
      
      if (status.data.status === 'completed') {
        return status.data;
      }
      
      if (status.data.status === 'expired') {
        throw new Error('Payment expired');
      }
      
      // Check every 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error('Payment timeout');
  }

  // Get active listeners
  async getActiveListeners() {
    const response = await fetch(`${this.baseUrl}/api/user/listeners/active`);
    return response.json();
  }
}

// Usage Example
const sdk = new NoNameSDK();

async function processPayment() {
  try {
    // Generate stealth address
    const result = await sdk.generateStealthAddress('mystore', {
      tokenAddress: '0x0000000000000000000000000000000000000000',
      tokenAmount: '0.001',
      deviceId: 'my_device_123',
      reuseSession: true
    });

    console.log('Payment Address:', result.data.address);
    console.log('Payment ID:', result.data.paymentId);
    console.log('Time Remaining:', result.data.eventListener.timeRemaining, 'seconds');

    // Wait for payment
    const payment = await sdk.waitForPayment(result.data.paymentId);
    console.log('Payment completed!', payment.transactionHash);

  } catch (error) {
    console.error('Payment failed:', error.message);
  }
}

processPayment();
```

---

## 🔗 Supported Chains

| Chain | Chain ID | RPC URL | Native Token |
|-------|----------|---------|--------------|
| Base Sepolia | 84532 | https://base-sepolia-rpc.publicnode.com | ETH |
| Base Sepolia | 84532 | https://base-sepolia-rpc.publicnode.com | ETH |
| Ethereum Mainnet | 1 | https://eth.llamarpc.com | ETH |

## 📝 Notes

- **Device ID**: Optional parameter - system auto-generates if not provided
- **Session Reuse**: Perfect for user refresh scenarios - same address returned
- **Payment Tracking**: Automatic 3-minute monitoring windows
- **Concurrent Users**: Full support for multiple simultaneous payments
- **Event Listeners**: Real-time blockchain monitoring with automatic cleanup
- **Rate Limiting**: Generous limits for payment tracking operations
- **Error Handling**: Comprehensive error responses with detailed information

## 🎯 Summary

The NoName API now supports **real-time payment tracking** with automatic blockchain monitoring, device session management for consistent user experience, and concurrent payment processing. The enhanced stealth address generation includes payment IDs, event listeners, and device session reuse - perfect for production payment systems!
