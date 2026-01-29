/**
 * ICM - Adjustments Page JavaScript
 * Page-specific logic for ManageAdjustments.html
 */

var _serverURL = ICM_CONFIG.getApiUrl();
var _selectedFile = null;
var _cacheKey = null;
var _isProcessRunning = false;

/**
 * Initialize page on DOM ready
 */
document.addEventListener('DOMContentLoaded', function() {
    initDragAndDrop();
    checkProcessState();
});

/**
 * Check if ICM process is currently running
 */
async function checkProcessState() {
    try {
        const response = await fetch(`${_serverURL}/Menu/GetProcessState`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            console.warn('Could not fetch process state:', response.status);
            return;
        }

        const state = await response.json();

        if (state.isRunning) {
            _isProcessRunning = true;
            disablePageForRunningProcess();
        }
    } catch (error) {
        console.error('Error checking process state:', error);
    }
}

/**
 * Disable page elements when ICM process is running
 */
function disablePageForRunningProcess() {
    // Disable upload area
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.classList.add('disabled');
        uploadArea.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            showMessage('warning', 'Process Running', 'Cannot upload files while ICM process is running. Please wait for the process to complete.');
        };
    }

    // Disable file input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.disabled = true;
    }

    // Disable validate button
    const btnValidate = document.getElementById('btnValidate');
    if (btnValidate) {
        btnValidate.disabled = true;
        btnValidate.classList.add('disabled');
    }

    // Show warning message
    showMessage('warning', 'ICM Process Running', 'File upload and adjustments import are disabled while the ICM process is running. <a href="ICMProcessRunner.html">View process status</a>');
}

/**
 * Initialize drag and drop handlers
 */
function initDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    if (!uploadArea) return;

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

/**
 * Handle file input change event
 * @param {Event} event - File input change event
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

/**
 * Process selected file
 * @param {File} file - Selected file
 */
function handleFile(file) {
    // Block file handling if process is running
    if (_isProcessRunning) {
        showMessage('warning', 'Process Running', 'Cannot upload files while ICM process is running. Please wait for the process to complete.');
        return;
    }

    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
        showMessage('error', 'Invalid File Format', 'Please upload an Excel file (.xlsx or .xls)');
        return;
    }

    _selectedFile = file;

    const fileNameEl = document.getElementById('fileName');
    fileNameEl.textContent = file.name;
    fileNameEl.classList.add('visible');

    document.getElementById('uploadArea').classList.add('has-file');

    hideMessage();

    // Automatically check adjustments after file selection
    checkAdjustments();
}

/**
 * Check adjustments by uploading file to server
 */
async function checkAdjustments() {
    // Block if process is running
    if (_isProcessRunning) {
        showMessage('warning', 'Process Running', 'Cannot check adjustments while ICM process is running. Please wait for the process to complete.');
        return;
    }

    if (!_selectedFile) {
        showMessage('error', 'No File Selected', 'Please select an Excel file first.');
        return;
    }

    showLoading('Checking Adjustments', 'Analyzing the uploaded file...');

    const formData = new FormData();
    formData.append('file', _selectedFile);

    try {
        const response = await fetch(`${_serverURL}/Adjustments/check-adjustments`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to check adjustments');
        }

        const result = await response.json();
        _cacheKey = result.cacheKey;

        displayResults(result.adjustments);
        document.getElementById('adjustmentCount').textContent = result.count;

        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('resultsSection').classList.add('visible');
        hideMessage();

    } catch (error) {
        console.error('Error:', error);
        showMessage('error', 'Error Processing File', error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Display adjustments in table
 * @param {Array} adjustments - Array of adjustment objects
 */
function displayResults(adjustments) {
    const tbody = document.getElementById('adjustmentsBody');
    tbody.innerHTML = '';

    adjustments.forEach((adj, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${adj.adjustmentType || '-'}</td>
            <td>${adj.positionId || '-'}</td>
            <td>${adj.employeeId || '-'}</td>
            <td>${adj.orderId || '-'}</td>
            <td>${adj.allocationTypeId || '-'}</td>
            <td>${adj.allocationValue != null ? adj.allocationValue.toFixed(2) : '-'}</td>
            <td>${adj.allocationList != null ? adj.allocationList.toFixed(2) : '-'}</td>
            <td>${adj.excludeFromCalcs || '-'}</td>
            <td>${adj.adjustmentReason || '-'}</td>
            <td>${formatDate(adj.adjustmentDate)}</td>
            <td>${adj.adjustmentBy || '-'}</td>
            <td>${adj.periodMonth}/${adj.periodYear}</td>
            <td>${adj.orderNumber || '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Cancel import and reset to initial state
 */
function cancelImport() {
    _cacheKey = null;
    _selectedFile = null;

    document.getElementById('resultsSection').classList.remove('visible');
    document.getElementById('processSection').classList.remove('visible');
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('fileName').classList.remove('visible');
    document.getElementById('btnCheck').classList.remove('visible');
    document.getElementById('uploadArea').classList.remove('has-file');
    document.getElementById('fileInput').value = '';
    document.getElementById('adjustmentsBody').innerHTML = '';
    hideMessage();
}

/**
 * Validate and import adjustments
 */
async function validateAdjustments() {
    // Block if process is running
    if (_isProcessRunning) {
        showMessage('warning', 'Process Running', 'Cannot import adjustments while ICM process is running. Please wait for the process to complete.');
        return;
    }

    if (!_cacheKey) {
        showMessage('error', 'Session Expired', 'Please re-upload the file and try again.');
        return;
    }

    showLoading('Validating Adjustments', 'Importing adjustments into the database...');

    try {
        const response = await fetch(`${_serverURL}/Adjustments/validate-adjustments/${_cacheKey}`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to validate adjustments');
        }

        const result = await response.json();

        document.getElementById('resultsSection').classList.remove('visible');
        document.getElementById('insertedCount').textContent = `${result.inserted} adjustments have been imported into the database.`;
        document.getElementById('processSection').classList.add('visible');

        _cacheKey = null;

    } catch (error) {
        console.error('Error:', error);
        showMessage('error', 'Validation Failed', error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Run calculation process after import - redirects to process runner page
 */
function runProcess() {
    // Redirect to process runner page
    window.location.href = 'ICMProcessRunner.html';
}
