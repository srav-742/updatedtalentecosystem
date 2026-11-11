/**
 * Helper to dynamically load the Razorpay Checkout script.
 * Returns a promise that resolves to true once successfully loaded.
 */
export const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        // 1. If Razorpay is already available globally, resolve immediately
        if (typeof window !== 'undefined' && (Boolean(window.Razorpay) || 'Razorpay' in window || window.hasOwnProperty('Razorpay'))) {
            resolve(true);
            return;
        }

        // 2. Check if the script tag is already in DOM (e.g. from index.html or prior attempt)
        const existingScript = typeof document !== 'undefined' ? document.querySelector('script[src*="checkout.razorpay.com"]') : null;
        if (existingScript) {
            if (typeof window !== 'undefined' && window.Razorpay) {
                resolve(true);
                return;
            }
            existingScript.addEventListener('load', () => resolve(true), { once: true });
            existingScript.addEventListener('error', () => {
                try { existingScript.remove(); } catch (e) {}
                injectScript(resolve);
            }, { once: true });

            // Polling fallback in case load event already fired before listener was attached
            let attempts = 0;
            const pollInterval = setInterval(() => {
                attempts++;
                if (typeof window !== 'undefined' && window.Razorpay) {
                    clearInterval(pollInterval);
                    resolve(true);
                } else if (attempts >= 10) {
                    clearInterval(pollInterval);
                    injectScript(resolve);
                }
            }, 100);
            return;
        }

        // 3. Inject new script tag into head or body
        injectScript(resolve);
    });
};

function injectScript(resolve) {
    if (typeof document === 'undefined') {
        resolve(false);
        return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
        resolve(true);
    };

    script.onerror = () => {
        console.error('[RAZORPAY-SCRIPT-ERROR] Failed to load Razorpay checkout script.');
        // Verify in case Razorpay initialized despite error event
        if (typeof window !== 'undefined' && window.Razorpay) {
            resolve(true);
        } else {
            try { script.remove(); } catch (e) {}
            resolve(false);
        }
    };

    const target = document.head || document.body;
    if (target) {
        target.appendChild(script);
    } else {
        resolve(false);
    }
}
