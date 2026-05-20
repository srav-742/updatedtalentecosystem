/**
 * Helper to dynamically load the Razorpay Checkout script.
 * Returns a promise that resolves to true once successfully loaded.
 */
export const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        // If script is already loaded, resolve immediately
        if (window.hasOwnProperty('Razorpay')) {
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        
        script.onload = () => {
            resolve(true);
        };
        
        script.onerror = () => {
            console.error('[RAZORPAY-SCRIPT-ERROR] Failed to load Razorpay checkout script.');
            resolve(false);
        };

        document.body.appendChild(script);
    });
};
