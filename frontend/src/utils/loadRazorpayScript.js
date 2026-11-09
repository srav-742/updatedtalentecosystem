/**
 * Helper to dynamically load the Razorpay Checkout script.
 * Returns a promise that resolves to true once successfully loaded.
 */
export const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        // If script is already loaded and window.Razorpay is available, resolve immediately
        if (typeof window !== 'undefined' && typeof window.Razorpay === 'function') {
            resolve(true);
            return;
        }

        // Check if script tag is already in the document
        const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
        if (existingScript) {
            if (typeof window !== 'undefined' && typeof window.Razorpay === 'function') {
                resolve(true);
                return;
            }
            existingScript.addEventListener('load', () => resolve(true), { once: true });
            existingScript.addEventListener('error', () => resolve(false), { once: true });

            // Quick polling fallback in case load event already fired
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (typeof window !== 'undefined' && typeof window.Razorpay === 'function') {
                    clearInterval(interval);
                    resolve(true);
                } else if (attempts > 30) {
                    clearInterval(interval);
                    resolve(false);
                }
            }, 100);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        
        script.onload = () => {
            resolve(true);
        };
        
        script.onerror = (err) => {
            console.error('[RAZORPAY-SCRIPT-ERROR] Failed to load Razorpay checkout script.', err);
            resolve(false);
        };

        document.head.appendChild(script);
    });
};
