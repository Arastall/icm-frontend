// ICM Application Configuration
// Change the backend URL here - it will be used across all pages

var ICM_CONFIG = {
    // Backend API URL - change this value to point to your server
    API_URL: 'https://demo.cenaia-labs.com/api',

    // Helper function to get the API URL
    // Returns empty string if served from same origin (for relative paths)
    getApiUrl: function() {
        if (window.location.origin === 'file://') {
            return this.API_URL;
        }
        // If served from same origin as API, use relative paths
        if (window.location.origin === this.API_URL) {
            return '';
        }
        return this.API_URL;
    }
};
