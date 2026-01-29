/**
 * ICM - Order Summary Page JavaScript
 */

var _serverURL = ICM_CONFIG.getApiUrl();
var _currentOrderNumber = null;

document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('orderInput');
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchOrder();
        }
    });
    input.focus();
});

function toggleSection(header) {
    header.classList.toggle('collapsed');
    var body = header.nextElementSibling;
    body.classList.toggle('collapsed');
}

function resetSearch() {
    document.getElementById('searchSection').style.display = '';
    document.getElementById('resultsSection').classList.remove('visible');
    document.getElementById('orderInput').value = '';
    document.getElementById('orderInput').focus();
    hideError();
}

function showError(msg) {
    var el = document.getElementById('searchError');
    el.textContent = msg;
    el.classList.add('visible');
}

function hideError() {
    document.getElementById('searchError').classList.remove('visible');
}

function fmt(val, decimals) {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString('en-GB', { minimumFractionDigits: decimals || 2, maximumFractionDigits: decimals || 2 });
}

async function searchOrder() {
    var input = document.getElementById('orderInput');
    var value = input.value.trim();
    hideError();

    if (!value) { showError('Please enter an order number.'); return; }
    if (!/^[A-Za-z0-9]+$/.test(value)) { showError('Order number must be alphanumeric (letters and digits only).'); return; }

    document.getElementById('loadingOverlay').style.display = 'flex';

    try {
        var response = await fetch(_serverURL + '/Orders/GetOrderSummary/' + encodeURIComponent(value), {
            method: 'GET',
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (response.status === 404) {
            showError('Order "' + value + '" not found.');
            return;
        }
        if (!response.ok) {
            var errText = await response.text();
            showError('Error: ' + (errText || response.statusText));
            return;
        }

        var data = await response.json();
        _currentOrderNumber = value;
        renderResults(data);
    } catch (err) {
        console.error(err);
        showError('Connection error: ' + err.message);
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

function renderResults(data) {
    document.getElementById('searchSection').style.display = 'none';
    document.getElementById('resultsSection').classList.add('visible');

    renderSummaryGrid(data.header);
    renderHeader(data.header);
    renderLines(data.lines);
    renderAllocations(data.allocations);
    renderPayments(data.payments);
    renderAdjustments(data.adjustments);
    renderCreditAllocations(data.creditAllocations);
    renderRollups(data.rollups);
}

function renderSummaryGrid(h) {
    var grid = document.getElementById('summaryGrid');
    grid.innerHTML = `
        <div class="summary-stat">
            <div class="stat-label">Order Number</div>
            <div class="stat-value">${h.orderNumber || '—'}</div>
        </div>
        <div class="summary-stat">
            <div class="stat-label">Order Type</div>
            <div class="stat-value">${h.orderType || '—'}</div>
        </div>
        <div class="summary-stat">
            <div class="stat-label">Customer</div>
            <div class="stat-value" style="font-size:1em">${h.customerName || '—'}</div>
        </div>
        <div class="summary-stat green">
            <div class="stat-label">Order Sale Value</div>
            <div class="stat-value">${fmt(h.orderSaleVal)}</div>
        </div>
        <div class="summary-stat green">
            <div class="stat-label">Service Sale Value</div>
            <div class="stat-value">${fmt(h.serviceSaleVal)}</div>
        </div>
        <div class="summary-stat orange">
            <div class="stat-label">Discount %</div>
            <div class="stat-value">${fmt(h.orderDiscountPercent)}%</div>
        </div>
        <div class="summary-stat">
            <div class="stat-label">Period</div>
            <div class="stat-value">${(h.periodMonth || '?') + '/' + (h.periodYear || '?')}</div>
        </div>
    `;
}

function renderHeader(h) {
    var fields = [
        ['Order Row ID', h.orderRowId],
        ['Order Number', h.orderNumber],
        ['Order Type', h.orderType],
        ['Promotion Code', h.promotionCode],
        ['SAP Reference', h.sapOrderReference],
        ['Customer Account', h.customerAccountNumber],
        ['Customer Name', h.customerName],
        ['Customer Type', h.customerType],
        ['Primary Position', h.primaryPosition],
        ['Order List Value', fmt(h.orderListVal)],
        ['Order Sale Value', fmt(h.orderSaleVal)],
        ['Order Discount Value', fmt(h.orderDiscountVal)],
        ['Order Discount %', fmt(h.orderDiscountPercent) + '%'],
        ['Service List Value', fmt(h.serviceListVal)],
        ['Service Sale Value', fmt(h.serviceSaleVal)],
        ['Service Discount Value', fmt(h.serviceDiscountVal)],
        ['Service Discount %', fmt(h.serviceDiscountPercent) + '%'],
        ['Service Type', h.serviceType],
        ['Maintenance Term', h.maintenanceTerm],
        ['Period', (h.periodMonth || '') + '/' + (h.periodYear || '')]
    ];
    document.getElementById('headerInfo').innerHTML = fields.map(function (f) {
        return '<div class="info-item"><span class="info-label">' + f[0] + '</span><span class="info-value">' + (f[1] || '—') + '</span></div>';
    }).join('');
}

function renderLines(lines) {
    document.getElementById('linesCount').textContent = lines.length;
    if (!lines.length) { document.getElementById('linesTable').innerHTML = '<div class="empty-state">No order lines found.</div>'; return; }
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Line #</th><th>Item ID</th><th>Product Code</th><th>Description</th>' +
        '<th class="text-right">List Value</th><th class="text-right">Sale Value</th><th class="text-center">Qty</th>' +
        '<th>Level 1</th><th>Level 2</th><th>Level 3</th><th>Type</th></tr></thead><tbody>';
    lines.forEach(function (l) {
        html += '<tr>' +
            '<td class="text-center">' + (l.lineNumber || '') + '</td>' +
            '<td class="text-mono">' + (l.orderItemId || '') + '</td>' +
            '<td>' + (l.productCode || '') + '</td>' +
            '<td class="text-truncate">' + (l.productDesc || '') + '</td>' +
            '<td class="text-right text-mono">' + fmt(l.listValue, 3) + '</td>' +
            '<td class="text-right text-mono">' + fmt(l.saleValue, 3) + '</td>' +
            '<td class="text-center">' + (l.quantity != null ? Math.round(l.quantity) : '') + '</td>' +
            '<td>' + (l.productLevel1 || '') + '</td>' +
            '<td>' + (l.productLevel2 || '') + '</td>' +
            '<td>' + (l.productLevel3 || '') + '</td>' +
            '<td>' + (l.productType || '') + '</td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('linesTable').innerHTML = html;
}

function renderAllocations(allocs) {
    document.getElementById('allocCount').textContent = allocs.length;
    if (!allocs.length) { document.getElementById('allocTable').innerHTML = '<div class="empty-state">No allocations found.</div>'; return; }
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Employee Name</th><th>Employee ID</th><th>Position</th><th>Pay Plan</th><th class="text-right">Allocation %</th></tr></thead><tbody>';
    allocs.forEach(function (a) {
        html += '<tr>' +
            '<td>' + (a.employeeName || '') + '</td>' +
            '<td class="text-mono">' + (a.employeeRowId || '') + '</td>' +
            '<td>' + (a.positionName || '') + '</td>' +
            '<td>' + (a.payplanType || '') + '</td>' +
            '<td class="text-right text-mono">' + fmt(a.allocationPercentage) + '%</td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('allocTable').innerHTML = html;
}

function renderPayments(payments) {
    document.getElementById('payCount').textContent = payments.length;
    if (!payments.length) { document.getElementById('payTable').innerHTML = '<div class="empty-state">No payments found.</div>'; return; }
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Type</th><th>Description</th><th>Position</th><th>Employee ID</th><th>Employee Name</th>' +
        '<th>Enhancement</th><th>Rate Desc</th><th class="text-right">Rate</th><th class="text-right">Value</th>' +
        '<th class="text-center">Withheld</th><th class="text-center">Period</th></tr></thead><tbody>';
    payments.forEach(function (p) {
        html += '<tr>' +
            '<td>' + (p.paymentSource || '') + '</td>' +
            '<td>' + (p.paymentDescription || '') + '</td>' +
            '<td>' + (p.positionName || '') + '</td>' +
            '<td class="text-mono">' + (p.employeeId || '') + '</td>' +
            '<td>' + (p.employeeName || '') + '</td>' +
            '<td>' + (p.enhancementDesc || '') + '</td>' +
            '<td>' + (p.rateTableDesc || '') + '</td>' +
            '<td class="text-right text-mono">' + fmt(p.paymentRate, 3) + '</td>' +
            '<td class="text-right text-mono">' + fmt(p.paymentValue, 3) + '</td>' +
            '<td class="text-center">' + (p.paymentWithheld ? '<span class="pill pill-yes">YES</span>' : '<span class="pill pill-no">NO</span>') + '</td>' +
            '<td class="text-center">' + (p.periodMonth || '') + '/' + (p.periodYear || '') + '</td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('payTable').innerHTML = html;
}

function renderAdjustments(adjs) {
    document.getElementById('adjCount').textContent = adjs.length;
    if (!adjs.length) { document.getElementById('adjTable').innerHTML = '<div class="empty-state">No adjustments found.</div>'; return; }
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Type</th><th>Description</th><th>Position</th><th>Employee ID</th><th>Employee Name</th>' +
        '<th class="text-right">Value</th><th class="text-center">Excl. from Calcs</th><th class="text-center">Period</th></tr></thead><tbody>';
    adjs.forEach(function (a) {
        html += '<tr>' +
            '<td>' + (a.paymentSource || '') + '</td>' +
            '<td>' + (a.paymentDescription || '') + '</td>' +
            '<td>' + (a.positionName || '') + '</td>' +
            '<td class="text-mono">' + (a.employeeId || '') + '</td>' +
            '<td>' + (a.employeeName || '') + '</td>' +
            '<td class="text-right text-mono">' + fmt(a.paymentValue, 3) + '</td>' +
            '<td class="text-center">' + (a.paymentWithheld ? '<span class="pill pill-yes">YES</span>' : '<span class="pill pill-no">NO</span>') + '</td>' +
            '<td class="text-center">' + (a.periodMonth || '') + '/' + (a.periodYear || '') + '</td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('adjTable').innerHTML = html;
}

function renderCreditTable(items, containerId) {
    if (!items.length) { document.getElementById(containerId).innerHTML = '<div class="empty-state">No data found.</div>'; return; }
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Employee</th><th>Product</th><th>Allocation Type</th>' +
        '<th class="text-right">Alloc. List</th><th class="text-right">Alloc. Value</th>' +
        '<th class="text-center">Excl. from Calcs</th><th class="text-center">Rollup Proc.</th><th class="text-center">Period</th></tr></thead><tbody>';
    items.forEach(function (c) {
        html += '<tr>' +
            '<td>' + (c.employeeName || '') + '</td>' +
            '<td class="text-truncate">' + (c.productDesc || '') + '</td>' +
            '<td>' + (c.allocationDescription || '') + '</td>' +
            '<td class="text-right text-mono">' + fmt(c.allocationList, 3) + '</td>' +
            '<td class="text-right text-mono">' + fmt(c.allocationValue, 3) + '</td>' +
            '<td class="text-center">' + (c.excludeFromCalcs === 'YES' ? '<span class="pill pill-yes">YES</span>' : '<span class="pill pill-no">NO</span>') + '</td>' +
            '<td class="text-center">' + (c.rollupProcessed || '') + '</td>' +
            '<td class="text-center">' + (c.periodMonth || '') + '/' + (c.periodYear || '') + '</td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById(containerId).innerHTML = html;
}

function renderCreditAllocations(items) {
    document.getElementById('creditCount').textContent = items.length;
    renderCreditTable(items, 'creditTable');
}

function renderRollups(items) {
    document.getElementById('rollupCount').textContent = items.length;
    renderCreditTable(items, 'rollupTable');
}

async function reprocessThisOrder() {
    if (!_currentOrderNumber) return;
    if (!confirm('Reprocess order ' + _currentOrderNumber + '? This will reset its calculation data.')) return;

    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('loadingOverlay').querySelector('h3').textContent = 'Reprocessing...';
    document.getElementById('loadingOverlay').querySelector('p').textContent = 'Resetting order ' + _currentOrderNumber + ' for recalculation.';

    try {
        var response = await fetch(_serverURL + '/Orders/ReprocessOrders', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify([_currentOrderNumber])
        });

        if (!response.ok) {
            var errText = await response.text();
            alert('Error: ' + (errText || response.statusText));
            return;
        }

        var results = await response.json();
        var r = results[0];
        if (r.success) {
            alert('✅ ' + r.message);
            // Refresh the order summary
            searchOrder();
        } else {
            alert('⚠️ ' + r.message);
        }
    } catch (err) {
        alert('Connection error: ' + err.message);
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
        document.getElementById('loadingOverlay').querySelector('h3').textContent = 'Loading Order...';
        document.getElementById('loadingOverlay').querySelector('p').textContent = 'Fetching order details from the server.';
    }
}

function addManualAdjustment() {
    window.location.href = 'ManageAdjustments.html';
}
