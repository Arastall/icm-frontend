/**
 * ICM - Sales Period Page JavaScript
 * Page-specific logic for ManageSalesPeriod.html
 */

var _serverURL = ICM_CONFIG.getApiUrl();
var _currentMonth = null;
var _currentYear = null;

/**
 * Initialize page on DOM ready
 */
document.addEventListener('DOMContentLoaded', function() {
    loadCurrentSalesPeriod();
});

/**
 * Load current sales period from backend
 */
async function loadCurrentSalesPeriod() {
    showLoading('Loading', 'Fetching current sales period...');

    try {
        const response = await fetch(`${_serverURL}/Settings/GetCurrentSalesPeriod`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to get current sales period');
        }

        const result = await response.json();

        // Store original values
        _currentMonth = result.month.toString().padStart(2, '0');
        _currentYear = result.year.toString();

        // Update display
        document.getElementById('currentPeriodDisplay').textContent = `${_currentMonth}/${_currentYear}`;

        // Set select values
        document.getElementById('selectMonth').value = _currentMonth;
        document.getElementById('selectYear').value = _currentYear;

        // Disable past periods in dropdowns
        updateSelectOptions();

        // Ensure button is disabled initially
        checkForChanges();

    } catch (error) {
        console.error('Error:', error);
        showMessage('error', 'Error Loading Period', error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Update select options to disable past periods
 * Only future periods can be selected
 */
function updateSelectOptions() {
    const selectMonth = document.getElementById('selectMonth');
    const selectYear = document.getElementById('selectYear');
    const currentMonthInt = parseInt(_currentMonth);
    const currentYearInt = parseInt(_currentYear);

    // Disable past years
    Array.from(selectYear.options).forEach(option => {
        const yearValue = parseInt(option.value);
        option.disabled = yearValue < currentYearInt;
    });

    // Update month options based on selected year
    updateMonthOptions();
}

/**
 * Update month options based on selected year
 */
function updateMonthOptions() {
    const selectMonth = document.getElementById('selectMonth');
    const selectYear = document.getElementById('selectYear');
    const selectedYearInt = parseInt(selectYear.value);
    const currentMonthInt = parseInt(_currentMonth);
    const currentYearInt = parseInt(_currentYear);

    Array.from(selectMonth.options).forEach(option => {
        const monthValue = parseInt(option.value);

        if (selectedYearInt === currentYearInt) {
            // Same year: disable months before current month
            option.disabled = monthValue < currentMonthInt;
        } else if (selectedYearInt > currentYearInt) {
            // Future year: all months enabled
            option.disabled = false;
        } else {
            // Past year: all months disabled
            option.disabled = true;
        }
    });

    // If current selection is now disabled, reset to current period
    const selectedMonth = selectMonth.value;
    const selectedMonthInt = parseInt(selectedMonth);

    if (selectedYearInt === currentYearInt && selectedMonthInt < currentMonthInt) {
        selectMonth.value = _currentMonth;
    }
}

/**
 * Handle year change - update month options accordingly
 */
function onYearChange() {
    updateMonthOptions();
    checkForChanges();
}

/**
 * Check if user has made changes and update UI accordingly
 */
function checkForChanges() {
    const selectedMonth = document.getElementById('selectMonth').value;
    const selectedYear = document.getElementById('selectYear').value;
    const btnUpdate = document.getElementById('btnUpdate');
    const changeIndicator = document.getElementById('changeIndicator');

    const hasChanges = (selectedMonth !== _currentMonth || selectedYear !== _currentYear);

    if (hasChanges) {
        btnUpdate.disabled = false;
        btnUpdate.classList.add('changed');
        changeIndicator.classList.add('visible');

        // Update button with unlock icon
        btnUpdate.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
            </svg>
            <span id="btnUpdateText">Update to ${selectedMonth}/${selectedYear}</span>
        `;
    } else {
        btnUpdate.disabled = true;
        btnUpdate.classList.remove('changed');
        changeIndicator.classList.remove('visible');

        // Update button with lock icon
        btnUpdate.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span id="btnUpdateText">No Changes</span>
        `;
    }

    hideMessage();
}

/**
 * Update sales period on server
 */
async function updateSalesPeriod() {
    const selectedMonth = document.getElementById('selectMonth').value;
    const selectedYear = document.getElementById('selectYear').value;

    showLoading('Updating', 'Setting new sales period...');

    try {
        const response = await fetch(`${_serverURL}/Settings/SetCurrentSalesPeriod/${selectedYear}/${selectedMonth}`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to update sales period');
        }

        // Update stored values
        _currentMonth = selectedMonth;
        _currentYear = selectedYear;

        // Update display
        document.getElementById('currentPeriodDisplay').textContent = `${_currentMonth}/${_currentYear}`;

        // Reset button state
        checkForChanges();

        // Show success message
        showMessage('success', 'Sales Period Updated', `The sales period has been successfully changed to ${selectedMonth}/${selectedYear}.`, 5000);

    } catch (error) {
        console.error('Error:', error);
        showMessage('error', 'Update Failed', error.message);
    } finally {
        hideLoading();
    }
}
