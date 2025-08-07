"use client";
import Link from "next/link";
import React from "react";

const WidgetTestPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            NoName Payment Widget Demo
          </h1>
          <p className="text-gray-600">
            This is how the payment widget will look on your website
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Demo Website */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-800 text-white p-4">
              <h2 className="font-semibold">Demo Store Website</h2>
              <p className="text-sm text-gray-300">example-store.com</p>
            </div>

            <div className="p-6">
              {/* Fake product */}
              <div className="mb-6">
                <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-gray-500">Product Image</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Premium Digital Course
                </h3>
                <p className="text-gray-600 mb-4">
                  Learn advanced web development with this comprehensive course.
                  Includes video tutorials, exercises, and lifetime access.
                </p>
                <div className="text-2xl font-bold text-gray-900 mb-6">
                  $99.99
                </div>
              </div>

              {/* Widget container - This is where merchants add the payment widget */}
              <div
                id="crypto-payment-demo"
                data-noname-payment
                data-merchant="demo-store"
                data-amount="99.99"
                data-product="Premium Digital Course"
                data-description="Learn advanced web development"
              ></div>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🚀 How to integrate this widget
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Copy the HTML</p>
                    <p>Add the widget div to your product page</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Include the script
                    </p>
                    <p>Load the NoName widget JavaScript</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Handle payments</p>
                    <p>Listen for payment events in your code</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Start earning!</p>
                    <p>Accept crypto payments worldwide</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ✨ Features included
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>QR code generation for mobile payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Copy-paste payment addresses</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Multiple token support (USDC, USDT)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Responsive design for all devices</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Customizable colors and branding</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Real-time payment events</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>No customer registration required</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                💡 Ready to integrate?
              </h3>
              <p className="text-blue-700 text-sm mb-4">
                Register as a merchant to get your personalized integration code
                and start accepting crypto payments today.
              </p>
              <Link
                href="/merchant/dashboard"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Access Dashboard →
              </Link>
            </div>
          </div>
        </div>

        {/* Code Example */}
        <div className="mt-12 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-800 text-white p-4">
            <h3 className="font-semibold">Integration Code</h3>
          </div>
          <div className="p-6">
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm">
                <code>{`<!-- Add this div where you want the payment widget -->
<div id="crypto-payment" 
     data-noname-payment 
     data-merchant="your-username"
     data-amount="99.99"
     data-product="Your Product Name"></div>

<!-- Include the widget script -->
<script src="https://cdn.noname.com/widget/v1/merchant-widget.js"></script>

<!-- Handle payment success -->
<script>
document.addEventListener('noname-payment-success', (event) => {
    console.log('Payment received!', event.detail);
    // Your success logic here
});
</script>`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Load the actual widget for demo */}
      {/* <script src="/merchant-widget.js" onLoad={() => console.log("Widget loaded")} /> */}
    </div>
  );
};

export default WidgetTestPage;
