/**
 * ICM - Common JavaScript Functions
 * Shared utilities used across all pages
 */

/**
 * Show loading modal
 * @param {string} title - Modal title
 * @param {string} text - Modal description text
 */
function showLoading(title, text) {
    const modal = document.getElementById('loadingModal');
    const titleEl = document.getElementById('loadingTitle');
    const textEl = document.getElementById('loadingText');

    if (titleEl) titleEl.textContent = title || 'Loading...';
    if (textEl) textEl.textContent = text || 'Please wait.';
    if (modal) modal.style.display = 'flex';
}

/**
 * Hide loading modal
 */
function hideLoading() {
    const modal = document.getElementById('loadingModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Show message box
 * @param {string} type - 'success', 'error', or 'warning'
 * @param {string} title - Message title
 * @param {string} text - Message text (can contain HTML)
 * @param {number} autoHideDelay - Optional delay in ms to auto-hide (default: 0 = no auto-hide)
 */
function showMessage(type, title, text, autoHideDelay) {
    const messageBox = document.getElementById('messageBox');
    const messageTitle = document.getElementById('messageTitle');
    const messageText = document.getElementById('messageText');

    if (!messageBox) return;

    messageBox.className = 'message-box visible ' + type;

    var icon;
    if (type === 'success') {
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'warning') {
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    } else {
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    }

    if (messageTitle) messageTitle.innerHTML = icon + ' ' + title;
    if (messageText) messageText.innerHTML = text;

    if (autoHideDelay && autoHideDelay > 0) {
        setTimeout(() => hideMessage(), autoHideDelay);
    }
}

/**
 * Hide message box
 */
function hideMessage() {
    const messageBox = document.getElementById('messageBox');
    if (messageBox) messageBox.classList.remove('visible');
}

/**
 * Generate timestamp string for file naming
 * Format: YYYYMMDD_HHMMSSmmm
 * @returns {string}
 */
function getTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}${now.getMilliseconds().toString().padStart(3, '0')}`;
}

/**
 * Format date string for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date or '-' if invalid
 */
function formatDate(dateString) {
    if (!dateString || dateString === '0001-01-01T00:00:00') return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
}

/**
 * Populate years dropdown with fiscal years (2025 and 2026 only)
 * @param {string} selectId - ID of the select element
 * @param {string} selectedYear - Year to select by default
 */
function populateYearsDropdown(selectId, selectedYear) {
    const ddlYears = document.getElementById(selectId);
    if (!ddlYears) return;

    ddlYears.innerHTML = '';
    const allowedYears = [2025, 2026];

    for (const year of allowedYears) {
        const option = new Option('FY ' + year, year.toString());
        if (year.toString() === selectedYear) {
            option.selected = true;
        }
        ddlYears.add(option);
    }
}

/**
 * Make an API request with error handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function apiRequest(url, options) {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    };

    const mergedOptions = { ...defaultOptions, ...options };

    if (options && options.headers) {
        mergedOptions.headers = { ...defaultOptions.headers, ...options.headers };
    }

    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed with status ${response.status}`);
    }

    return response;
}

/**
 * Download a file from API response
 * @param {string} url - API endpoint URL
 * @param {string} filename - Name for the downloaded file
 */
async function downloadFile(url, filename) {
    const response = await apiRequest(url, { method: 'GET' });
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.click();

    window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Load server info (Server Name, Sales Period, Status and Last Run) into header
 * This function is automatically called on page load
 */
async function loadServerInfo() {
    const serverInfoServer = document.getElementById('serverInfoServer');
    const serverInfoSP = document.getElementById('serverInfoSP');
    const serverInfoStatus = document.getElementById('serverInfoStatus');
    const serverInfoLastRun = document.getElementById('serverInfoLastRun');

    if (!serverInfoSP && !serverInfoLastRun && !serverInfoServer && !serverInfoStatus) return;

    const serverURL = ICM_CONFIG.getApiUrl();

    try {
        // Load Server Environment Data (for server name and last run)
        const envResponse = await fetch(`${serverURL}/Settings/GetServerEnvironmentData`, {
            method: 'GET',
            credentials: 'include'
        });

        if (envResponse.ok) {
            const envData = await envResponse.json();

            // Server Name
            if (serverInfoServer) {
                serverInfoServer.textContent = envData.serverName || 'Unknown';
                serverInfoServer.classList.remove('loading');
            }

            // Status - make clickable to navigate to process runner
            if (serverInfoStatus) {
                serverInfoStatus.textContent = envData.status || 'Unknown';
                serverInfoStatus.classList.remove('loading');
                serverInfoStatus.classList.add('clickable');
                serverInfoStatus.title = 'Click to view process status';
                serverInfoStatus.onclick = function() {
                    window.location.href = 'ICMProcessRunner.html';
                };
            }

            // Last Run (from dtLastRun field)
            if (serverInfoLastRun) {
                if (envData.dtLastRun && envData.dtLastRun !== '0001-01-01T00:00:00') {
                    const date = new Date(envData.dtLastRun);
                    serverInfoLastRun.textContent = date.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } else {
                    serverInfoLastRun.textContent = 'Never';
                }
                serverInfoLastRun.classList.remove('loading');
            }
        } else {
            throw new Error('Failed to load server environment data');
        }

        // Load Sales Period
        const spResponse = await fetch(`${serverURL}/Settings/GetCurrentSalesPeriod`, {
            method: 'GET',
            credentials: 'include'
        });

        if (spResponse.ok) {
            const spData = await spResponse.json();
            const month = String(spData.month).padStart(2, '0');
            const year = String(spData.year);
            if (serverInfoSP) {
                serverInfoSP.textContent = `SP${month} / FY${year}`;
                serverInfoSP.classList.remove('loading');
            }
        } else {
            throw new Error('Failed to load sales period');
        }

    } catch (error) {
        console.error('Error loading server info:', error);
        if (serverInfoServer) {
            serverInfoServer.textContent = 'Error';
            serverInfoServer.classList.remove('loading');
            serverInfoServer.classList.add('error');
        }
        if (serverInfoSP) {
            serverInfoSP.textContent = 'Error';
            serverInfoSP.classList.remove('loading');
            serverInfoSP.classList.add('error');
        }
        if (serverInfoStatus) {
            serverInfoStatus.textContent = 'Error';
            serverInfoStatus.classList.remove('loading');
            serverInfoStatus.classList.add('error');
        }
        if (serverInfoLastRun) {
            serverInfoLastRun.textContent = 'Error';
            serverInfoLastRun.classList.remove('loading');
            serverInfoLastRun.classList.add('error');
        }
    }
}

/**
 * Update the status in the header
 * @param {string} status - New status value
 */
function updateHeaderStatus(status) {
    const serverInfoStatus = document.getElementById('serverInfoStatus');
    if (serverInfoStatus) {
        serverInfoStatus.textContent = status;
        serverInfoStatus.classList.remove('loading');
    }
}

/**
 * Update the last run date in the header
 * @param {string|Date} dtLastRun - Last run date value
 */
function updateHeaderLastRun(dtLastRun) {
    const serverInfoLastRun = document.getElementById('serverInfoLastRun');
    if (serverInfoLastRun) {
        if (dtLastRun && dtLastRun !== '0001-01-01T00:00:00') {
            const date = new Date(dtLastRun);
            serverInfoLastRun.textContent = date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            serverInfoLastRun.textContent = 'Never';
        }
        serverInfoLastRun.classList.remove('loading');
    }
}

/**
 * Listen for process state changes via SignalR custom events
 */
function setupHeaderStatusListeners() {
    // When process step updates - if in_progress, status is Running
    document.addEventListener('processStepUpdate', function(e) {
        if (e.detail && e.detail.status === 'in_progress') {
            updateHeaderStatus('Running');
        }
    });

    // When process finishes - reload server info to get updated status and last run
    document.addEventListener('processFinished', function() {
        loadServerInfo();
    });

    // When server status update event is received - update header directly
    document.addEventListener('serverStatusUpdate', function(e) {
        if (e.detail) {
            if (e.detail.status) {
                updateHeaderStatus(e.detail.status);
            }
            if (e.detail.dtLastRun) {
                updateHeaderLastRun(e.detail.dtLastRun);
            }
        }
    });
}

// Auto-load server info when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    loadServerInfo();
    setupHeaderStatusListeners();
});
