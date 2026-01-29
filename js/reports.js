/**
 * ICM - Reports Page JavaScript
 * Page-specific logic for GenerateDealsReports.html
 */

var _serverURL = ICM_CONFIG.getApiUrl();

/**
 * Initialize page on DOM ready
 */
document.addEventListener('DOMContentLoaded', function() {
    loadCurrentSalesPeriod();
});

/**
 * Load current sales period from backend and set dropdowns
 */
async function loadCurrentSalesPeriod() {
    try {
        const response = await fetch(`${_serverURL}/Settings/GetCurrentSalesPeriod`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to get current sales period');
        }

        const result = await response.json();
        const currentMonth = result.month.toString().padStart(2, '0');
        const currentYear = result.year.toString();

        populateYearsDropdown('ddlYears', currentYear, 2);

        const ddlMonths = document.getElementById('ddlMonths');
        if (ddlMonths) {
            ddlMonths.value = currentMonth;
        }

        console.log(`Sales period loaded: SP${currentMonth}/FY${currentYear}`);

    } catch (error) {
        console.error('Error loading sales period:', error);
        fallbackToDefaultPeriod();
    }
}

/**
 * Fallback to default period if API fails
 */
function fallbackToDefaultPeriod() {
    const now = new Date();
    const fiscalYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const fiscalMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const fiscalMonthStr = fiscalMonth.toString().padStart(2, '0');

    populateYearsDropdown('ddlYears', fiscalYear.toString(), 2);

    const ddlMonths = document.getElementById('ddlMonths');
    if (ddlMonths) {
        ddlMonths.value = fiscalMonthStr;
    }
}

/**
 * Get selected period values
 * @returns {Object} { month, year }
 */
function getSelectedPeriod() {
    return {
        month: document.getElementById('ddlMonths').value,
        year: document.getElementById('ddlYears').value
    };
}

/**
 * Show loading modal with filename
 * @param {string} reportName - Name of the report being generated
 */
function showReportLoading(reportName) {
    document.getElementById('filename').textContent = reportName;
    document.getElementById('loadingModal').style.display = 'flex';
}

/**
 * Hide loading modal
 */
function hideReportLoading() {
    document.getElementById('loadingModal').style.display = 'none';
}

/**
 * Download yearly revenues and payments report
 */
async function downloadYearlyReport() {
    const { year } = getSelectedPeriod();
    showReportLoading('Yearly Report');

    try {
        const url = `${_serverURL}/Report/GetYearlyRevenuesPaymentsReport/${year}`;
        const filename = `Report_Yearly_FY${year}_${getTimestamp()}.xlsx`;
        await downloadFile(url, filename);
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating the report.');
    } finally {
        hideReportLoading();
    }
}

/**
 * Download monthly revenues and payments report
 */
async function downloadMonthlyReport() {
    const { month, year } = getSelectedPeriod();
    showReportLoading('Monthly Report');

    try {
        const url = `${_serverURL}/Report/GetMonthlyRevenuesPaymentsReport/${year}/${month}`;
        const filename = `Report_RevenuesPayments_FY${year}_SP${month}_${getTimestamp()}.xlsx`;
        await downloadFile(url, filename);
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating the report.');
    } finally {
        hideReportLoading();
    }
}

/**
 * Download monthly deals report
 */
async function downloadMonthlyDealsReport() {
    const { month, year } = getSelectedPeriod();
    showReportLoading('Deals Data Report');

    try {
        const url = `${_serverURL}/Report/GetMonthlyDealsInfoReport/${year}/${month}`;
        const filename = `Report_Deals_FY${year}_SP${month}_${getTimestamp()}.xlsx`;
        await downloadFile(url, filename);
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating the report.');
    } finally {
        hideReportLoading();
    }
}

/**
 * Download pay file report
 */
async function downloadPayFileReport() {
    const { month, year } = getSelectedPeriod();
    showReportLoading('Payfile Report');

    try {
        const url = `${_serverURL}/Report/GetPayFileReportOld/${year}/${month}`;
        const filename = `Report_PayFile_FY${year}_SP${month}_${getTimestamp()}.xlsx`;
        await downloadFile(url, filename);
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating the report.');
    } finally {
        hideReportLoading();
    }
}

/**
 * Download products report
 */
async function downloadProductsReport() {
    const { month, year } = getSelectedPeriod();
    showReportLoading('Products Report');

    try {
        const url = `${_serverURL}/Report/GetProductsReport`;
        const filename = `Report_Products_${getTimestamp()}.xlsx`;
        await downloadFile(url, filename);
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating the report.');
    } finally {
        hideReportLoading();
    }
}
