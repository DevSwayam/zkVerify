/**
 * NoName Crypto Payment Widget
 * Version: 1.0.0
 *
 * Copy and paste this code into your website to start accepting crypto payments!
 *
 * Usage:
 * 1. Replace 'YOUR_MERCHANT_USERNAME' with your actual merchant username
 * 2. Customize the amount, currency, and styling as needed
 * 3. Add this script to your HTML page
 */

(function () {
  "use strict";

  // Configuration - CUSTOMIZE THESE VALUES
  const WIDGET_CONFIG = {
    // Replace with your merchant username from registration
    merchantUsername: "YOUR_MERCHANT_USERNAME",

    // API Base URL (update if using different environment)
    apiBaseUrl: "https://stealth-lemon.vercel.app",

    // Payment details (customize for your product/service)
    defaultAmount: "50.00",
    defaultCurrency: "USDC",
    productName: "Your Product/Service",
    productDescription: "Payment for your amazing product or service",

    // Supported tokens (add more as needed)
    supportedTokens: [
      {
        symbol: "USDC",
        name: "USD Coin",
        logo: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMyNzc1Q0EiLz4KPHBhdGggZD0iTTE2IDJDOC4yNjggMiAyIDguMjY4IDIgMTZTOC4yNjggMzAgMTYgMzAgMzAgMjMuNzMyIDMwIDE2UzIzLjczMiAyIDE2IDJaIiBmaWxsPSIjMjc3NUNBIi8+Cjx0ZXh0IHg9IjE2IiB5PSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiPlVTREM8L3RleHQ+Cjwvc3ZnPgo=",
        chainId: 1328,
        tokenAddress: "0x0000000000000000000000000000000000000000",
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        logo: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMyNkE1NEIiLz4KPHBhdGggZD0iTTE2IDJDOC4yNjggMiAyIDguMjY4IDIgMTZTOC4yNjggMzAgMTYgMzAgMzAgMjMuNzMyIDMwIDE2UzIzLjczMiAyIDE2IDJaIiBmaWxsPSIjMjZBNTRCIi8+Cjx0ZXh0IHg9IjE2IiB5PSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiPlVTRFQ8L3RleHQ+Cjwvc3ZnPgo=",
        chainId: 1328,
        tokenAddress: "0x0000000000000000000000000000000000000001",
      },
    ],

    // Styling options
    theme: {
      primaryColor: "#2775CA",
      successColor: "#26A54B",
      errorColor: "#E53E3E",
      backgroundColor: "#FFFFFF",
      textColor: "#1A202C",
      borderRadius: "8px",
      fontFamily: "system-ui, -apple-system, sans-serif",
    },
  };

  // Widget class
  class NoNamePaymentWidget {
    constructor(config) {
      this.config = { ...WIDGET_CONFIG, ...config };
      this.currentPayment = null;
      this.widgetId =
        "noname-payment-widget-" + Math.random().toString(36).substr(2, 9);
      this.init();
    }

    init() {
      this.createStyles();
      this.createWidget();
      this.attachEventListeners();
    }

    createStyles() {
      const styles = `
        .noname-widget {
          font-family: ${this.config.theme.fontFamily};
          max-width: 400px;
          margin: 20px auto;
          background: ${this.config.theme.backgroundColor};
          border: 1px solid #E2E8F0;
          border-radius: ${this.config.theme.borderRadius};
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .noname-widget-header {
          background: ${this.config.theme.primaryColor};
          color: white;
          padding: 16px;
          text-align: center;
        }

        .noname-widget-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .noname-widget-header p {
          margin: 4px 0 0 0;
          font-size: 14px;
          opacity: 0.9;
        }

        .noname-widget-content {
          padding: 20px;
        }

        .noname-amount-section {
          margin-bottom: 20px;
        }

        .noname-amount-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #E2E8F0;
          border-radius: ${this.config.theme.borderRadius};
          font-size: 16px;
          font-weight: 600;
          text-align: center;
          outline: none;
          transition: border-color 0.2s;
        }

        .noname-amount-input:focus {
          border-color: ${this.config.theme.primaryColor};
        }

        .noname-token-selector {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
          margin-bottom: 20px;
        }

        .noname-token-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border: 2px solid #E2E8F0;
          border-radius: ${this.config.theme.borderRadius};
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .noname-token-option:hover {
          border-color: ${this.config.theme.primaryColor};
        }

        .noname-token-option.selected {
          border-color: ${this.config.theme.primaryColor};
          background: ${this.config.theme.primaryColor}15;
        }

        .noname-token-logo {
          width: 20px;
          height: 20px;
          border-radius: 50%;
        }

        .noname-token-symbol {
          font-weight: 600;
          font-size: 14px;
        }

        .noname-pay-button {
          width: 100%;
          padding: 16px;
          background: ${this.config.theme.primaryColor};
          color: white;
          border: none;
          border-radius: ${this.config.theme.borderRadius};
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .noname-pay-button:hover {
          background: ${this.config.theme.primaryColor}DD;
          transform: translateY(-1px);
        }

        .noname-pay-button:disabled {
          background: #A0AEC0;
          cursor: not-allowed;
          transform: none;
        }

        .noname-loading {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: noname-spin 1s linear infinite;
        }

        @keyframes noname-spin {
          to { transform: rotate(360deg); }
        }

        .noname-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .noname-modal-content {
          background: white;
          border-radius: ${this.config.theme.borderRadius};
          max-width: 400px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .noname-modal-header {
          background: ${this.config.theme.primaryColor};
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .noname-close-button {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .noname-qr-section {
          text-align: center;
          padding: 20px;
        }

        .noname-qr-code {
          margin: 20px auto;
          padding: 16px;
          background: white;
          border: 2px solid #E2E8F0;
          border-radius: ${this.config.theme.borderRadius};
          display: inline-block;
        }

        .noname-address-section {
          padding: 0 20px 20px;
        }

        .noname-address-container {
          background: #F7FAFC;
          border: 1px solid #E2E8F0;
          border-radius: ${this.config.theme.borderRadius};
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .noname-address {
          font-family: monospace;
          font-size: 12px;
          word-break: break-all;
          flex: 1;
          margin-right: 8px;
        }

        .noname-copy-button {
          background: ${this.config.theme.primaryColor};
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
        }

        .noname-status {
          text-align: center;
          padding: 16px;
          background: #FFF5B7;
          border-left: 4px solid #D69E2E;
          margin: 16px 20px;
          border-radius: 0 ${this.config.theme.borderRadius} ${this.config.theme.borderRadius} 0;
        }

        .noname-footer {
          padding: 16px;
          text-align: center;
          border-top: 1px solid #E2E8F0;
          font-size: 12px;
          color: #718096;
        }

        .noname-error {
          background: #FED7D7;
          border-left: 4px solid ${this.config.theme.errorColor};
          color: #C53030;
          padding: 12px;
          margin: 16px 20px;
          border-radius: 0 ${this.config.theme.borderRadius} ${this.config.theme.borderRadius} 0;
        }

        .noname-merchant-info {
          font-size: 12px;
          color: #718096;
          text-align: center;
          margin-bottom: 16px;
        }
      `;

      const styleSheet = document.createElement("style");
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }

    createWidget() {
      const widget = document.createElement("div");
      widget.className = "noname-widget";
      widget.id = this.widgetId;
      widget.innerHTML = this.getWidgetHTML();

      return widget;
    }

    getWidgetHTML() {
      return `
        <div class="noname-widget-header">
          <h3>💳 Pay with Crypto</h3>
          <p>${this.config.productName}</p>
        </div>
        <div class="noname-widget-content">
          <div class="noname-merchant-info">
            Powered by @${this.config.merchantUsername}
          </div>
          
          <div class="noname-amount-section">
            <input 
              type="number" 
              class="noname-amount-input" 
              value="${this.config.defaultAmount}"
              placeholder="Enter amount"
              min="0.01"
              step="0.01"
            />
          </div>

          <div class="noname-token-selector">
            ${this.config.supportedTokens
              .map(
                (token, index) => `
              <div class="noname-token-option ${
                index === 0 ? "selected" : ""
              }" data-token="${token.symbol}">
                <img src="${token.logo}" alt="${
                  token.symbol
                }" class="noname-token-logo" />
                <span class="noname-token-symbol">${token.symbol}</span>
              </div>
            `
              )
              .join("")}
          </div>

          <button class="noname-pay-button">
            <span class="button-text">Pay with Crypto</span>
          </button>
        </div>
        <div class="noname-footer">
          Secured by NoName Stealth Payments
        </div>
      `;
    }

    attachEventListeners() {
      document.addEventListener("click", (e) => {
        // Token selection
        if (e.target.closest(".noname-token-option")) {
          const tokenOption = e.target.closest(".noname-token-option");
          const widget = tokenOption.closest(".noname-widget");

          // Remove selected class from all options
          widget
            .querySelectorAll(".noname-token-option")
            .forEach((opt) => opt.classList.remove("selected"));

          // Add selected class to clicked option
          tokenOption.classList.add("selected");
        }

        // Pay button
        if (e.target.closest(".noname-pay-button")) {
          const widget = e.target.closest(".noname-widget");
          this.handlePayment(widget);
        }

        // Close modal
        if (
          e.target.closest(".noname-close-button") ||
          (e.target.classList.contains("noname-modal") &&
            e.target === e.currentTarget)
        ) {
          this.closeModal();
        }

        // Copy address
        if (e.target.closest(".noname-copy-button")) {
          this.copyAddress(e.target.closest(".noname-copy-button"));
        }
      });
    }

    async handlePayment(widget) {
      const amountInput = widget.querySelector(".noname-amount-input");
      const selectedToken = widget.querySelector(
        ".noname-token-option.selected"
      );
      const payButton = widget.querySelector(".noname-pay-button");

      const amount = parseFloat(amountInput.value);
      const tokenSymbol = selectedToken.dataset.token;
      const token = this.config.supportedTokens.find(
        (t) => t.symbol === tokenSymbol
      );

      if (!amount || amount <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      if (!token) {
        alert("Please select a payment token");
        return;
      }

      // Show loading state
      payButton.disabled = true;
      payButton.innerHTML = `
        <div class="noname-loading"></div>
        <span>Generating Payment...</span>
      `;

      try {
        const stealthAddress = await this.generateStealthAddress(
          token,
          amount.toString()
        );
        this.showPaymentModal(stealthAddress, token, amount);
      } catch (error) {
        console.error("Payment generation failed:", error);
        this.showError(
          widget,
          "Failed to generate payment address. Please try again."
        );
      } finally {
        // Reset button state
        payButton.disabled = false;
        payButton.innerHTML =
          '<span class="button-text">Pay with Crypto</span>';
      }
    }

    async generateStealthAddress(token, amount) {
      const response = await fetch(
        `${this.config.apiBaseUrl}/api/user/${this.config.merchantUsername}/stealth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chainId: token.chainId,
            tokenAddress: token.tokenAddress,
            tokenAmount: amount,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.data;
    }

    showPaymentModal(stealthData, token, amount) {
      this.currentPayment = { stealthData, token, amount };

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        stealthData.address
      )}`;

      const modal = document.createElement("div");
      modal.className = "noname-modal";
      modal.innerHTML = `
        <div class="noname-modal-content">
          <div class="noname-modal-header">
            <h3>💳 Complete Payment</h3>
            <button class="noname-close-button">×</button>
          </div>
          
          <div class="noname-qr-section">
            <h4>Scan QR Code to Pay</h4>
            <div class="noname-qr-code">
              <img src="${qrCodeUrl}" alt="Payment QR Code" style="width: 200px; height: 200px;" />
            </div>
            <p><strong>${amount} ${token.symbol}</strong></p>
            <p>to @${this.config.merchantUsername}</p>
          </div>

          <div class="noname-address-section">
            <h4>Or Copy Payment Address</h4>
            <div class="noname-address-container">
              <div class="noname-address">${stealthData.address}</div>
              <button class="noname-copy-button" data-address="${stealthData.address}">Copy</button>
            </div>
          </div>

          <div class="noname-status">
            ⏳ Waiting for payment confirmation...
          </div>

          <div class="noname-footer">
            <p><strong>Payment Details:</strong></p>
            <p>Amount: ${amount} ${token.symbol}</p>
            <p>Network: ${stealthData.chainName}</p>
            <p>Safe Address: ${stealthData.safeAddress.address}</p>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Start payment monitoring
      this.startPaymentMonitoring();
    }

    async copyAddress(button) {
      const address = button.dataset.address;

      try {
        await navigator.clipboard.writeText(address);
        const originalText = button.textContent;
        button.textContent = "Copied!";
        button.style.background = this.config.theme.successColor;

        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = this.config.theme.primaryColor;
        }, 2000);
      } catch (err) {
        console.error("Failed to copy address:", err);
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = address;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);

        button.textContent = "Copied!";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 2000);
      }
    }

    showError(widget, message) {
      const existingError = widget.querySelector(".noname-error");
      if (existingError) {
        existingError.remove();
      }

      const errorDiv = document.createElement("div");
      errorDiv.className = "noname-error";
      errorDiv.textContent = message;

      const content = widget.querySelector(".noname-widget-content");
      content.appendChild(errorDiv);

      // Auto-remove error after 5 seconds
      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    }

    startPaymentMonitoring() {
      // This is a placeholder for payment monitoring
      // In a real implementation, you would poll your backend or use webhooks
      // to check if the payment has been received

      console.log("Payment monitoring started for:", this.currentPayment);

      // Simulate payment monitoring (remove in production)
      setTimeout(() => {
        this.handlePaymentSuccess();
      }, 30000); // Simulate success after 30 seconds
    }

    handlePaymentSuccess() {
      const modal = document.querySelector(".noname-modal");
      if (modal) {
        const statusDiv = modal.querySelector(".noname-status");
        statusDiv.innerHTML = `
          <div style="color: ${this.config.theme.successColor};">
            ✅ Payment received successfully!
          </div>
        `;
        statusDiv.style.background = "#F0FFF4";
        statusDiv.style.borderColor = this.config.theme.successColor;

        // Trigger custom event for merchant integration
        const event = new CustomEvent("noname-payment-success", {
          detail: this.currentPayment,
        });
        document.dispatchEvent(event);

        // Auto-close modal after 3 seconds
        setTimeout(() => {
          this.closeModal();
        }, 3000);
      }
    }

    closeModal() {
      const modal = document.querySelector(".noname-modal");
      if (modal) {
        modal.remove();
      }
      this.currentPayment = null;
    }

    // Public method to render widget in a specific container
    renderIn(containerId, customConfig = {}) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Container with ID '${containerId}' not found`);
        return;
      }

      // Merge custom config
      this.config = { ...this.config, ...customConfig };

      const widget = this.createWidget();
      container.appendChild(widget);
    }
  }

  // Auto-initialize if data attributes are found
  function autoInitialize() {
    const containers = document.querySelectorAll("[data-noname-payment]");

    containers.forEach((container) => {
      const config = {
        merchantUsername:
          container.dataset.merchant || WIDGET_CONFIG.merchantUsername,
        defaultAmount: container.dataset.amount || WIDGET_CONFIG.defaultAmount,
        productName: container.dataset.product || WIDGET_CONFIG.productName,
        productDescription:
          container.dataset.description || WIDGET_CONFIG.productDescription,
      };

      const widget = new NoNamePaymentWidget(config);
      widget.renderIn(container.id, config);
    });
  }

  // Make widget available globally
  window.NoNamePaymentWidget = NoNamePaymentWidget;

  // Auto-initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInitialize);
  } else {
    autoInitialize();
  }

  // Listen for payment success events (for merchant integration)
  document.addEventListener("noname-payment-success", (event) => {
    console.log("Payment successful:", event.detail);
    // Merchants can listen to this event to handle successful payments
  });
})();
