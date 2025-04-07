// Add Buffer polyfill
import { Buffer } from 'buffer';
window.Buffer = Buffer;

// Define the process object for the browser environment
window.process = {
    env: {
        ANCHOR_BROWSER: 'true',
        NODE_ENV: import.meta.env.MODE,
        PUBLIC_KEY: '',
        ANCHOR_WALLET: '',
        // Add any other environment variables you need
    }
} as any;

// Export nothing - this file is just for its side effects
export { };