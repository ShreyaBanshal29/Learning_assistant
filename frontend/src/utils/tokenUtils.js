// Utility functions for handling URL tokens

/**
 * Extract usertoken from URL query parameters
 * @returns {string|null} The usertoken if found, null otherwise
 */
export const getTokenFromURL = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('usertoken');
};

/**
 * Remove token from URL without page reload
 * This keeps the token in memory but removes it from the URL for security
 */
export const removeTokenFromURL = () => {
    const url = new URL(window.location);
    url.searchParams.delete('usertoken');
    window.history.replaceState({}, document.title, url.pathname);
};

/**
 * Check if we're in token authentication mode
 * @returns {boolean} True if usertoken is present in URL
 */
export const isTokenAuthMode = () => {
    return getTokenFromURL() !== null;
};

