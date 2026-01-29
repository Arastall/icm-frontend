/**
 * ICM - Process Runner Page JavaScript
 * Page-specific logic for ICMProcessRunner.html
 */

var _serverURL = ICM_CONFIG.getApiUrl();
var _isRunning = false;
var _timerInterval = null;
var _startTime = null;
var _steps = [];
var _completedSteps = 0;

/**
 * Default process steps - these will be shown when the process starts
 * The stepId must match what the backend sends via SignalR
 *
 * Backend SignalR calls for StartICMRun (RunICM):
 * - ImportService.DoImportAsync(): stepId = 'import_siebel_data'
 * - CalculationService.DoCalculationsAsync(): stepId = 'calculating'
 */
var DEFAULT_PROCESS_STEPS = [
    { stepId: 'import_siebel_data', stepName: 'Importing Siebel Data', status: 'pending', message: '' },
    { stepId: 'calculating', stepName: 'Processing Calculations', status: 'pending', message: '' }
];

/**
 * Update timer display
 */
function updateTimer() {
    if (!_startTime) return;

    const elapsed = Math.floor((Date.now() - _startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');

    document.getElementById('timer').textContent = `${minutes}:${seconds}`;
}

/**
 * Start the timer
 */
function startTimer() {
    _startTime = Date.now();
    _timerInterval = setInterval(updateTimer, 1000);
}

/**
 * Stop the timer
 */
function stopTimer() {
    if (_timerInterval) {
        clearInterval(_timerInterval);
        _timerInterval = null;
    }
}

/**
 * Set which icon is visible
 * @param {string} iconName - 'Play', 'Running', 'Success', or 'Error'
 */
function setIcon(iconName) {
    const icons = ['Play', 'Running', 'Success', 'Error'];
    icons.forEach(name => {
        const el = document.getElementById('icon' + name);
        if (el) el.style.display = name === iconName ? 'block' : 'none';
    });
}

/**
 * Set UI to running state
 */
function setRunningState() {
    _isRunning = true;

    // Update icon
    const runnerIcon = document.getElementById('runnerIcon');
    runnerIcon.classList.add('running');
    runnerIcon.classList.remove('success', 'error');
    setIcon('Running');

    // Update button
    const btnRun = document.getElementById('btnRun');
    btnRun.disabled = true;
    btnRun.classList.add('running');
    document.getElementById('btnIconPlay').style.display = 'none';
    document.getElementById('btnSpinner').style.display = 'block';
    document.getElementById('btnText').textContent = 'Processing...';

    // Update title and description
    document.getElementById('mainTitle').textContent = 'Process Running';
    document.getElementById('mainDescription').textContent = 'The ICM calculation is currently being executed. Please wait...';

    // Show status section
    const statusSection = document.getElementById('statusSection');
    statusSection.classList.add('visible', 'running');
    statusSection.classList.remove('success', 'error');
    document.getElementById('statusTitleText').textContent = 'Processing...';
    document.getElementById('statusMessage').textContent = 'Please wait while the ICM process is running.';

    // Hide warning, hide new run button
    document.getElementById('warningNotice').style.display = 'none';
    document.getElementById('btnNewRun').classList.remove('visible');

    // Start timer
    document.getElementById('timer').style.display = 'block';
    startTimer();
}

/**
 * Set UI to success state
 */
function setSuccessState() {
    _isRunning = false;
    stopTimer();

    // Update icon
    const runnerIcon = document.getElementById('runnerIcon');
    runnerIcon.classList.remove('running');
    runnerIcon.classList.add('success');
    setIcon('Success');

    // Update button
    document.getElementById('btnRun').style.display = 'none';

    // Update title and description
    document.getElementById('mainTitle').textContent = 'Process Completed';
    document.getElementById('mainDescription').textContent = 'The ICM calculation has been successfully executed.';

    // Update status section
    const statusSection = document.getElementById('statusSection');
    statusSection.classList.remove('running');
    statusSection.classList.add('success');
    document.getElementById('statusTitleText').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Success!';
    document.getElementById('statusMessage').textContent = 'The ICM process has completed successfully. All calculations have been processed.';

    // Show new run button
    document.getElementById('btnNewRun').classList.add('visible');
}

/**
 * Set UI to error state
 * @param {string} errorMessage - Error message to display
 */
function setErrorState(errorMessage) {
    _isRunning = false;
    stopTimer();

    // Update icon
    const runnerIcon = document.getElementById('runnerIcon');
    runnerIcon.classList.remove('running');
    runnerIcon.classList.add('error');
    setIcon('Error');

    // Update button
    const btnRun = document.getElementById('btnRun');
    btnRun.disabled = false;
    btnRun.classList.remove('running');
    btnRun.style.display = 'inline-flex';
    document.getElementById('btnIconPlay').style.display = 'block';
    document.getElementById('btnSpinner').style.display = 'none';
    document.getElementById('btnText').textContent = 'Retry';

    // Update title and description
    document.getElementById('mainTitle').textContent = 'Process Failed';
    document.getElementById('mainDescription').textContent = 'An error occurred while running the ICM calculation.';

    // Update status section
    const statusSection = document.getElementById('statusSection');
    statusSection.classList.remove('running');
    statusSection.classList.add('error');
    document.getElementById('statusTitleText').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Error';
    document.getElementById('statusMessage').textContent = errorMessage || 'An unexpected error occurred. Please try again.';

    // Show warning again
    document.getElementById('warningNotice').style.display = 'flex';

    // Show new run button
    document.getElementById('btnNewRun').classList.add('visible');
}

/**
 * Reset page to initial state
 */
function resetPage() {
    _isRunning = false;
    stopTimer();
    _startTime = null;

    // Reset icon
    const runnerIcon = document.getElementById('runnerIcon');
    runnerIcon.classList.remove('running', 'success', 'error');
    setIcon('Play');

    // Reset button
    const btnRun = document.getElementById('btnRun');
    btnRun.disabled = false;
    btnRun.classList.remove('running');
    btnRun.style.display = 'inline-flex';
    document.getElementById('btnIconPlay').style.display = 'block';
    document.getElementById('btnSpinner').style.display = 'none';
    document.getElementById('btnText').textContent = 'Start Process';

    // Reset title and description
    document.getElementById('mainTitle').textContent = 'Run ICM Calculation';
    document.getElementById('mainDescription').textContent = 'Execute the ICM calculation process to compute incentives and compensations for the current sales period.';

    // Hide status section
    const statusSection = document.getElementById('statusSection');
    statusSection.classList.remove('visible', 'running', 'success', 'error');

    // Reset timer
    document.getElementById('timer').textContent = '00:00';
    document.getElementById('timer').style.display = 'block';

    // Show warning
    document.getElementById('warningNotice').style.display = 'flex';

    // Hide new run button
    document.getElementById('btnNewRun').classList.remove('visible');
}

/**
 * Start the ICM process
 */
async function startProcess() {
    if (_isRunning) return;

    setRunningState();
    resetStepsTracker();

    try {
        const response = await fetch(`${_serverURL}/Menu/StartICMRun`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to run ICM process');
        }

        // Note: Success/Error state will now be set by SignalR events
        // If no SignalR, fall back to immediate success
        if (typeof signalR === 'undefined') {
            setSuccessState();
        }

    } catch (error) {
        console.error('Error:', error);
        setErrorState(error.message);
    }
}

// ============================================
// Steps Tracker Functions
// ============================================

/**
 * Get SVG icon for step status
 * @param {string} status - 'pending', 'in_progress', 'completed', 'error'
 * @returns {string} SVG HTML
 */
function getStepIcon(status) {
    var icons = {
        pending: '',  // Will use CSS ::before
        in_progress: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>',
        completed: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
        error: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
    };
    return icons[status] || icons.pending;
}

/**
 * Format time for display
 * @param {string|Date} time - Time value
 * @returns {string} Formatted time string
 */
function formatStepTime(time) {
    if (!time) return '';
    var date = new Date(time);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Reset the steps tracker and initialize with default steps
 */
function resetStepsTracker() {
    _steps = [];
    _completedSteps = 0;
    var stepsList = document.getElementById('stepsList');
    if (stepsList) {
        stepsList.innerHTML = '';
    }
    updateStepsProgress();

    // Initialize with default steps
    initializeSteps({ steps: DEFAULT_PROCESS_STEPS });
}

/**
 * Show the steps tracker
 */
function showStepsTracker() {
    var tracker = document.getElementById('stepsTracker');
    if (tracker) {
        tracker.classList.add('visible');
    }
}

/**
 * Hide the steps tracker
 */
function hideStepsTracker() {
    var tracker = document.getElementById('stepsTracker');
    if (tracker) {
        tracker.classList.remove('visible');
    }
}

/**
 * Update the progress counter
 */
function updateStepsProgress() {
    var progressEl = document.getElementById('stepsProgress');
    if (progressEl) {
        progressEl.textContent = _completedSteps + ' / ' + _steps.length;
    }
}

/**
 * Initialize steps from backend
 * @param {Object} data - Steps initialization data
 * @param {Array} data.steps - Array of step objects {stepId, stepName, status}
 */
function initializeSteps(data) {
    if (!data || !data.steps) return;

    _steps = data.steps;
    _completedSteps = 0;

    var stepsList = document.getElementById('stepsList');
    if (!stepsList) return;

    stepsList.innerHTML = '';

    _steps.forEach(function(step) {
        var li = document.createElement('li');
        li.id = 'step-' + step.stepId;
        li.className = 'step-item ' + (step.status || 'pending');

        var html = '<div class="step-icon">' + getStepIcon(step.status || 'pending') + '</div>';
        html += '<div class="step-content">';
        html += '<div class="step-name">' + escapeHtml(step.stepName) + '</div>';
        html += '<p class="step-message">' + escapeHtml(step.message || '') + '</p>';
        html += '</div>';
        html += '<span class="step-time"></span>';

        li.innerHTML = html;
        stepsList.appendChild(li);

        if (step.status === 'completed') {
            _completedSteps++;
        }
    });

    updateStepsProgress();
    showStepsTracker();
}

/**
 * Update a specific step
 * @param {Object} data - Step update data
 * @param {string} data.stepId - Step identifier
 * @param {string} data.stepName - Step name
 * @param {string} data.status - 'pending', 'in_progress', 'completed', 'error'
 * @param {string} data.message - Optional message
 * @param {string} data.time - Timestamp
 */
function updateStep(data) {
    if (!data || !data.stepId) return;

    var stepEl = document.getElementById('step-' + data.stepId);

    // If step doesn't exist, add it dynamically
    if (!stepEl) {
        var newStep = {
            stepId: data.stepId,
            stepName: data.stepName,
            status: data.status,
            message: data.message
        };
        _steps.push(newStep);

        var stepsList = document.getElementById('stepsList');
        if (stepsList) {
            var li = document.createElement('li');
            li.id = 'step-' + data.stepId;
            li.className = 'step-item ' + (data.status || 'pending');

            var html = '<div class="step-icon">' + getStepIcon(data.status || 'pending') + '</div>';
            html += '<div class="step-content">';
            html += '<div class="step-name">' + escapeHtml(data.stepName) + '</div>';
            html += '<p class="step-message">' + escapeHtml(data.message || '') + '</p>';
            html += '</div>';
            html += '<span class="step-time">' + formatStepTime(data.time) + '</span>';

            li.innerHTML = html;
            stepsList.appendChild(li);
        }
        showStepsTracker();
    } else {
        // Update existing step
        var previousStatus = stepEl.className.replace('step-item ', '').trim();

        // Update class
        stepEl.className = 'step-item ' + data.status;

        // Update icon
        var iconEl = stepEl.querySelector('.step-icon');
        if (iconEl) {
            iconEl.innerHTML = getStepIcon(data.status);
        }

        // Update step name if provided (backend may send different name during progress)
        if (data.stepName) {
            var nameEl = stepEl.querySelector('.step-name');
            if (nameEl) {
                nameEl.textContent = data.stepName;
            }
        }

        // Update message if provided
        if (data.message !== undefined) {
            var messageEl = stepEl.querySelector('.step-message');
            if (messageEl) {
                messageEl.textContent = data.message || '';
            }
        }

        // Update time
        if (data.time) {
            var timeEl = stepEl.querySelector('.step-time');
            if (timeEl) {
                timeEl.textContent = formatStepTime(data.time);
            }
        }

        // Update completed count
        if (data.status === 'completed' && previousStatus !== 'completed') {
            _completedSteps++;
        } else if (previousStatus === 'completed' && data.status !== 'completed') {
            _completedSteps--;
        }
    }

    updateStepsProgress();
}

/**
 * Handle process finished event
 * @param {Object} data - Finish data
 * @param {boolean} data.success - Whether process succeeded
 * @param {string} data.message - Final message
 */
function handleProcessFinished(data) {
    if (data.success) {
        setSuccessState();
    } else {
        setErrorState(data.message || 'Process failed');
    }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// Load Process State on Page Load
// ============================================

/**
 * Load the current process state from the backend
 * This is called when the page loads to restore state if a process is running
 */
async function loadProcessState() {
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
        console.log('Process state loaded:', state);

        // If process is running, restore the UI state
        if (state.isRunning) {
            console.log('Process is running, restoring UI state');
            setRunningState();

            // Restore timer from start time
            if (state.startTime) {
                _startTime = new Date(state.startTime).getTime();
            }

            // Initialize steps from saved state
            if (state.steps && state.steps.length > 0) {
                initializeSteps({ steps: state.steps });
            }
        }
        // If process finished, reset the state and show default view
        else if (state.success !== null) {
            console.log('Process finished, resetting to default state');
            // Auto-reset the backend state since process is done
            await fetch(`${_serverURL}/Menu/ResetProcessState`, {
                method: 'POST',
                credentials: 'include'
            });
        } else {
            console.log('No active process, showing default state');
        }
    } catch (error) {
        console.error('Error loading process state:', error);
    }
}

/**
 * Reset page and clear backend state
 */
async function resetPageAndState() {
    // Reset backend state
    try {
        await fetch(`${_serverURL}/Menu/ResetProcessState`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Error resetting process state:', error);
    }

    // Reset frontend
    resetPage();
    hideStepsTracker();
}

// ============================================
// Event Listeners for SignalR events
// ============================================

document.addEventListener('processStepsInit', function(e) {
    initializeSteps(e.detail);
});

document.addEventListener('processStepUpdate', function(e) {
    updateStep(e.detail);
});

document.addEventListener('processFinished', function(e) {
    handleProcessFinished(e.detail);
});

// ============================================
// Initialize on page load
// ============================================

// Handle case where DOM is already loaded (script loaded after DOMContentLoaded)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        loadProcessState();
    });
} else {
    // DOM already loaded, call directly
    loadProcessState();
}
