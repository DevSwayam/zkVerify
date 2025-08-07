// components/ErrorSuppressor.tsx
"use client";

import { useEffect } from 'react';

export default function ErrorSuppressor() {
  useEffect(() => {
    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // List of error/warning patterns to suppress
    const suppressedPatterns = [
      // React DOM prop warnings
      /React does not recognize the `\w+` prop on a DOM element/,
      /Warning: React does not recognize/,
      /isActive/,
      /custom attribute/,
      
      // React setState in render warnings
      /Cannot update a component \(`\w+`\) while rendering a different component \(`\w+`\)/,
      /To locate the bad setState\(\) call inside/,
      /follow the stack trace as described in https:\/\/react\.dev\/link\/setstate-in-render/,
      
      // Additional common React warnings
      /Warning: validateDOMNesting/,
      /Warning: Each child in a list should have a unique "key" prop/,
      /Warning: Failed prop type/,
      /Warning: componentWillReceiveProps has been renamed/,
      /Warning: componentWillMount has been renamed/,
      /Warning: componentWillUpdate has been renamed/,
      
      // Next.js specific warnings
      /Warning: Extra attributes from the server/,
      /Warning: Prop `\w+` did not match/,
      
      // Common third-party library warnings
      /Warning: findDOMNode is deprecated/,
      /Warning: Using UNSAFE_componentWillMount/,
      /Warning: Using UNSAFE_componentWillReceiveProps/,
      /Warning: Using UNSAFE_componentWillUpdate/,
    ];
    
    const shouldSuppress = (message: string) => {
      return suppressedPatterns.some(pattern => pattern.test(message));
    };
    
    console.error = (...args) => {
      const message = args.join(' ');
      if (!shouldSuppress(message)) {
        originalError.apply(console, args);
      }
    };
    
    console.warn = (...args) => {
      const message = args.join(' ');
      if (!shouldSuppress(message)) {
        originalWarn.apply(console, args);
      }
    };
    
    // Also suppress unhandled promise rejections if they match patterns
    const originalUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      const message = event.reason?.message || event.reason?.toString() || '';
      if (shouldSuppress(message)) {
        event.preventDefault();
        return;
      }
      if (originalUnhandledRejection) {
        originalUnhandledRejection.call(window, event);
      }
    };
    
    // Cleanup function
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.onunhandledrejection = originalUnhandledRejection;
    };
  }, []);

  return null; // This component doesn't render anything
}