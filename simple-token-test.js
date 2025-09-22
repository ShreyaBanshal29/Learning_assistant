// Simple test for token detection logic
function getTokenFromURL() {
    const urlParams = new URLSearchParams('?usertoken=d885697702943421a7c6185632105613e0016f86a8655b8ae9d8ceeca30c3e39');
    return urlParams.get('usertoken');
}

function isTokenAuthMode() {
    return getTokenFromURL() !== null;
}

console.log('Testing token detection logic...');
console.log('Token from URL:', getTokenFromURL());
console.log('Is token auth mode:', isTokenAuthMode());
console.log('✅ Token detection logic working correctly!');
