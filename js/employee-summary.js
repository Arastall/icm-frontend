/**
 * ICM - Employee Summary Page JavaScript
 */

var _serverURL = ICM_CONFIG.getApiUrl();
var _selectedLogin = '';
var _acDebounce = null;
var _acIndex = -1;

document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('loginInput');
    input.addEventListener('input', function () {
        _selectedLogin = '';
        document.getElementById('btnSearch').disabled = true;
        var val = input.value.trim();
        if (val.length < 1) { hideAutocomplete(); return; }
        clearTimeout(_acDebounce);
        _acDebounce = setTimeout(function () { fetchAutocomplete(val); }, 250);
    });
    input.addEventListener('keydown', function (e) {
        var dropdown = document.getElementById('autocompleteDropdown');
        var items = dropdown.querySelectorAll('.autocomplete-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            _acIndex = Math.min(_acIndex + 1, items.length - 1);
            updateAcHighlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            _acIndex = Math.max(_acIndex - 1, 0);
            updateAcHighlight(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (_acIndex >= 0 && items[_acIndex]) {
                items[_acIndex].click();
            } else if (_selectedLogin) {
                searchEmployee();
            }
        } else if (e.key === 'Escape') {
            hideAutocomplete();
        }
    });
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.search-row')) hideAutocomplete();
    });
    input.focus();
});

function fetchAutocomplete(value) {
    fetch(_serverURL + '/Employees/SearchEmployee/' + encodeURIComponent(value))
        .then(function (r) { return r.json(); })
        .then(function (employees) {
            var dropdown = document.getElementById('autocompleteDropdown');
            dropdown.innerHTML = '';
            _acIndex = -1;
            if (!employees || employees.length === 0) {
                dropdown.innerHTML = '<div class="autocomplete-item" style="color:#999;cursor:default;">No employees found</div>';
                dropdown.classList.add('visible');
                return;
            }
            employees.sort(function (a, b) {
                var na = (a.lastName || '') + (a.fstName || '');
                var nb = (b.lastName || '') + (b.fstName || '');
                return na.localeCompare(nb);
            });
            employees.forEach(function (emp) {
                var div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.innerHTML = '<span class="emp-name">' + escHtml((emp.lastName || '') + ', ' + (emp.fstName || '')) + '</span><span class="emp-login">' + escHtml(emp.login || '') + '</span>';
                div.addEventListener('click', function () {
                    selectEmployee(emp);
                });
                dropdown.appendChild(div);
            });
            dropdown.classList.add('visible');
        })
        .catch(function () { hideAutocomplete(); });
}

function selectEmployee(emp) {
    _selectedLogin = emp.login || '';
    document.getElementById('loginInput').value = (emp.fstName || '') + ' ' + (emp.lastName || '') + ' (' + _selectedLogin + ')';
    document.getElementById('btnSearch').disabled = false;
    hideAutocomplete();
    searchEmployee();
}

function updateAcHighlight(items) {
    items.forEach(function (el, i) {
        el.classList.toggle('active', i === _acIndex);
    });
    if (items[_acIndex]) items[_acIndex].scrollIntoView({ block: 'nearest' });
}

function hideAutocomplete() {
    document.getElementById('autocompleteDropdown').classList.remove('visible');
    _acIndex = -1;
}

function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function toggleSection(header) {
    header.classList.toggle('collapsed');
    var body = header.nextElementSibling;
    body.classList.toggle('collapsed');
}

function resetSearch() {
    document.getElementById('searchSection').style.display = '';
    document.getElementById('resultsSection').classList.remove('visible');
    document.getElementById('loginInput').value = '';
    document.getElementById('loginInput').focus();
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

function fmtMoney(val) {
    if (val === null || val === undefined) return '—';
    return '£' + Number(val).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function searchEmployee() {
    var login = _selectedLogin || document.getElementById('loginInput').value.trim();
    var now = new Date();
    var year = String(now.getFullYear());
    var month = String(now.getMonth() + 1).padStart(2, '0');
    hideError();
    hideAutocomplete();

    if (!login) { showError('Please select an employee from the list.'); return; }

    document.getElementById('loadingOverlay').style.display = 'flex';

    try {
        var url = _serverURL + '/Employees/GetEmployeeSummary/' +
            encodeURIComponent(login) + '/' +
            encodeURIComponent(year) + '/' +
            encodeURIComponent(month);

        var response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        if (response.status === 404) {
            showError('Employee with login "' + login + '" not found.');
            return;
        }
        if (!response.ok) {
            var errText = await response.text();
            showError('Error: ' + (errText || response.statusText));
            return;
        }

        var data = await response.json();
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

    renderSummaryGrid(data);
    renderEmployeeDetails(data.employeeDetails);
    renderAllocatedOrders(data.allocatedOrders);
    renderUnitSummary(data.unitSummary);
    renderOrderAllocTotals(data.orderAllocationTotals);
    renderAllocationTotals(data.allocationTotals);
    renderPaymentDetails(data.paymentDetails, data.paymentTotal);
    renderAdjustments(data.adjustments);
    renderOrderLines(data.orderLines);
}

function renderSummaryGrid(data) {
    var e = data.employeeDetails;
    var grid = document.getElementById('summaryGrid');
    grid.innerHTML =
        '<div class="summary-stat"><div class="stat-label">Employee</div><div class="stat-value" style="font-size:1em">' + ((e.fstName || '') + ' ' + (e.lastName || '')).trim() + '</div></div>' +
        '<div class="summary-stat"><div class="stat-label">Login</div><div class="stat-value">' + (e.login || '—') + '</div></div>' +
        '<div class="summary-stat"><div class="stat-label">Position</div><div class="stat-value" style="font-size:0.9em">' + (e.positionName || '—') + '</div></div>' +
        '<div class="summary-stat green"><div class="stat-label">Payment Total</div><div class="stat-value">' + fmtMoney(data.paymentTotal) + '</div></div>' +
        '<div class="summary-stat orange"><div class="stat-label">Allocated Orders</div><div class="stat-value">' + data.allocatedOrders.length + '</div></div>' +
        '<div class="summary-stat"><div class="stat-label">Rep Type</div><div class="stat-value">' + (e.xRepType || '—') + '</div></div>';
}

function renderEmployeeDetails(e) {
    if (!e) { document.getElementById('employeeInfo').innerHTML = '<div class="empty-state">No employee details found.</div>'; return; }
    var fields = [
        ['Row ID', e.rowId],
        ['Login', e.login],
        ['First Name', e.fstName],
        ['Last Name', e.lastName],
        ['Job Title', e.jobTitle],
        ['Employee Number', e.employeeNumber],
        ['Position Name', e.positionName],
        ['Rep Type', e.xRepType]
    ];
    document.getElementById('employeeInfo').innerHTML = fields.map(function (f) {
        return '<div class="info-item"><span class="info-label">' + f[0] + '</span><span class="info-value">' + (f[1] || '—') + '</span></div>';
    }).join('');
}

function renderAllocatedOrders(orders) {
    document.getElementById('allocOrdersCount').textContent = orders.length;
    if (!orders.length) { document.getElementById('allocOrdersTable').innerHTML = '<div class="empty-state">No allocated orders found.</div>'; return; }
    var html = '<table class="data-table"><thead><tr>' +
        '<th>SAP Ref</th><th>Customer</th><th>Order #</th><th>Position</th><th>Pay Plan</th>' +
        '<th class="text-right">List Value</th><th class="text-right">Sale Value</th>' +
        '<th class="text-right">Disc %</th><th>Service</th><th class="text-right">Svc Disc %</th>' +
        '<th>Order Type</th><th>Cust Type</th></tr></thead><tbody>';
    orders.forEach(function (o) {
        html += '<tr>' +
            '<td class="text-mono">' + (o.sapOrderReference || '') + '</td>' +
            '<td class="text-truncate">' + (o.customerName || '') + '</td>' +
            '<td class="text-mono">' + (o.orderNumber || '') + '</td>' +
            '<td>' + (o.positionName || '') + '</td>' +
            '<td>' + (o.payplanType || '') + '</td>' +
            '<td class="text-right text-mono">' + fmt(o.orderListVal) + '</td>' +
            '<td class="text-right text-mono">' + fmt(o.orderSaleVal) + '</td>' +
            '<td class="text-right">' + fmt(o.orderDiscountPercent) + '%</td>' +
            '<td>' + (o.serviceType || '') + '</td>' +
            '<td class="text-right">' + fmt(o.serviceDiscountPercent) + '%</td>' +
            '<td>' + (o.orderType || '') + '</td>' +
            '<td>' + (o.customerType || '') + '</td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('allocOrdersTable').innerHTML = html;
}

function renderUnitSummary(units) {
    document.getElementById('unitCount').textContent = units.length;
    if (!units.length) { document.getElementById('unitTable').innerHTML = '<div class="empty-state">No unit summary data found.</div>'; return; }
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Order #</th><th>Line #</th><th>Product Code</th><th>Description</th>' +
        '<th>Allocation Type</th><th class="text-right">Value</th><th class="text-center">Excluded</th></tr></thead><tbody>';
    units.forEach(function (u) {
        html += '<tr>' +
            '<td class="text-mono">' + (u.orderNumber || '') + '</td>' +
            '<td class="text-center">' + (u.lineNumber || '') + '</td>' +
            '<td>' + (u.productCode || '') + '</td>' +
            '<td class="text-truncate">' + (u.productDesc || '') + '</td>' +
            '<td>' + (u.allocationDescription || '') + '</td>' +
            '<td class="text-right text-mono">' + u.allocationValue + '</td>' +
            '<td class="text-center">' + (u.excludeFromCalcs === 'YES' ? '<span class="pill pill-yes">YES</span>' : '<span class="pill pill-no">NO</span>') + '</td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('unitTable').innerHTML = html;
}

function renderOrderAllocTotals(items) {
    document.getElementById('orderAllocCount').textContent = items.length;
    if (!items.length) { document.getElementById('orderAllocTable').innerHTML = '<div class="empty-state">No order allocation totals found.</div>'; return; }
    var html = '<table class="data-table"><thead><tr>' +
        '<th class="text-center">Primary</th><th>Order #</th><th>Position</th><th>Pay Plan</th>' +
        '<th class="text-right">Order List</th><th class="text-right">Order Sale</th>' +
        '<th class="text-right">Disc %</th><th class="text-right">Svc Disc %</th>' +
        '<th class="text-right">Alloc %</th><th class="text-right">Alloc List</th>' +
        '<th class="text-right">Alloc Value</th><th class="text-center">Excluded</th></tr></thead><tbody>';
    items.forEach(function (i) {
        html += '<tr>' +
            '<td class="text-center">' + (i.primaryFlag === '1' ? '✓' : '') + '</td>' +
            '<td class="text-mono">' + (i.orderNumber || '') + '</td>' +
            '<td>' + (i.positionName || '') + '</td>' +
            '<td>' + (i.payplanType || '') + '</td>' +
            '<td class="text-right text-mono">' + fmt(i.orderListVal) + '</td>' +
            '<td class="text-right text-mono">' + fmt(i.orderSaleVal) + '</td>' +
            '<td class="text-right">' + fmt(i.orderDiscountPercent) + '%</td>' +
            '<td class="text-right">' + fmt(i.serviceDiscountPercent) + '%</td>' +
            '<td class="text-right text-mono">' + fmt(i.allocationPercentage) + '%</td>' +
            '<td class="text-right text-mono">' + fmt(i.allocationList) + '</td>' +
            '<td class="text-right text-mono">' + fmt(i.allocationValue) + '</td>' +
            '<td class="text-center">' + (i.excludeFromCalcs === 'YES' ? '<span class="pill pill-yes">YES</span>' : '<span class="pill pill-no">NO</span>') + '</td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('orderAllocTable').innerHTML = html;
}

function renderAllocationTotals(items) {
    document.getElementById('allocTotalCount').textContent = items.length;
    if (!items.length) { document.getElementById('allocTotalTable').innerHTML = '<div class="empty-state">No allocation totals found.</div>'; return; }
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Type ID</th><th>Type</th><th>Description</th><th class="text-right">Value</th></tr></thead><tbody>';
    items.forEach(function (a) {
        html += '<tr>' +
            '<td class="text-center">' + a.allocationTypeId + '</td>' +
            '<td>' + (a.allocationType || '') + '</td>' +
            '<td>' + (a.allocationDescription || '') + '</td>' +
            '<td class="text-right text-mono">' + fmt(a.allocationValue) + '</td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('allocTotalTable').innerHTML = html;
}

function renderPaymentDetails(payments, total) {
    document.getElementById('payCount').textContent = payments.length;
    if (!payments.length) { document.getElementById('payTable').innerHTML = '<div class="empty-state">No payment details found.</div>'; return; }
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Order #</th><th>Customer</th><th>Description</th>' +
        '<th class="text-right">Rate</th><th class="text-right">Value</th>' +
        '<th class="text-center">Withheld</th></tr></thead><tbody>';
    payments.forEach(function (p) {
        html += '<tr>' +
            '<td class="text-mono">' + (p.orderNumber || '') + '</td>' +
            '<td class="text-truncate">' + (p.customerName || '') + '</td>' +
            '<td>' + (p.paymentDescription || '') + '</td>' +
            '<td class="text-right text-mono">' + fmt(p.paymentRate, 4) + '</td>' +
            '<td class="text-right text-mono">' + fmtMoney(p.paymentValue) + '</td>' +
            '<td class="text-center">' + (p.paymentWithheld === 'YES' ? '<span class="pill pill-yes">YES</span>' : '<span class="pill pill-no">NO</span>') + '</td></tr>';
    });
    // Total row
    html += '<tr class="payment-total-row">' +
        '<td colspan="4" class="text-right">TOTAL (non-withheld):</td>' +
        '<td class="text-right text-mono">' + fmtMoney(total) + '</td>' +
        '<td></td></tr>';
    html += '</tbody></table>';
    document.getElementById('payTable').innerHTML = html;
}

function renderAdjustments(adjs) {
    document.getElementById('adjCount').textContent = adjs.length;
    if (!adjs.length) { document.getElementById('adjTable').innerHTML = '<div class="empty-state">No adjustments found.</div>'; return; }
    var html = '<table class="data-table"><thead><tr>' +
        '<th>Order #</th><th>Customer</th><th>Reason</th><th>Type</th>' +
        '<th class="text-right">Alloc List</th><th class="text-right">Alloc Value</th>' +
        '<th class="text-right">Payment Value</th></tr></thead><tbody>';
    adjs.forEach(function (a) {
        html += '<tr>' +
            '<td class="text-mono">' + (a.orderNumber || '') + '</td>' +
            '<td class="text-truncate">' + (a.customerName || '') + '</td>' +
            '<td>' + (a.adjustmentReason || '') + '</td>' +
            '<td>' + (a.adjustmentType || '') + '</td>' +
            '<td class="text-right text-mono">' + fmt(a.allocationList) + '</td>' +
            '<td class="text-right text-mono">' + fmt(a.allocationValue) + '</td>' +
            '<td class="text-right text-mono">' + fmtMoney(a.paymentValue) + '</td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('adjTable').innerHTML = html;
}

function renderOrderLines(orderLines) {
    document.getElementById('orderLinesCount').textContent = orderLines.length;
    var container = document.getElementById('orderLinesContainer');
    if (!orderLines.length) { container.innerHTML = '<div class="empty-state">No order lines found.</div>'; return; }

    var html = '';
    orderLines.forEach(function (og, idx) {
        var groupId = 'orderGroup_' + idx;
        html += '<div class="order-group">' +
            '<div class="order-group-header" onclick="toggleOrderGroup(this)">' +
            '<div><strong>' + (og.orderNumber || 'N/A') + '</strong> — Total: <span class="text-mono">' + fmt(og.totalAllocationValue) + '</span>' +
            (og.excludeFromCalcs === 'YES' ? ' <span class="pill pill-yes">EXCLUDED</span>' : '') +
            ' <span style="color:#999; font-size:0.85em">(' + og.lines.length + ' lines)</span></div>' +
            '<span class="chevron">▼</span></div>' +
            '<div class="order-group-body collapsed">' +
            '<table class="data-table"><thead><tr><th>Allocation Description</th><th class="text-right">Value</th></tr></thead><tbody>';
        og.lines.forEach(function (l) {
            html += '<tr><td>' + (l.allocationDescription || '') + '</td>' +
                '<td class="text-right text-mono">' + fmt(l.allocationValue) + '</td></tr>';
        });
        html += '</tbody></table></div></div>';
    });
    container.innerHTML = html;
}

function toggleOrderGroup(header) {
    header.classList.toggle('collapsed');
    var body = header.nextElementSibling;
    body.classList.toggle('collapsed');
}
