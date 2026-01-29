/**
 * ICM - Reprocess Orders Page JavaScript
 * Page-specific logic for ReprocessOrders.html
 */

var _serverURL = ICM_CONFIG.getApiUrl();
var _orderNumbers = [];

/**
 * Initialize page on DOM ready
 */
document.addEventListener('DOMContentLoaded', function() {
    setupTagInput();
});

/**
 * Setup tag/capsule input behavior
 */
function setupTagInput() {
    var input = document.getElementById('orderInput');
    
    input.addEventListener('keydown', function(e) {
        // Enter or comma triggers tag creation
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        }
        // Backspace on empty input removes last tag
        if (e.key === 'Backspace' && input.value === '' && _orderNumbers.length > 0) {
            removeTag(_orderNumbers.length - 1);
        }
    });

    // Also handle comma in input event (for paste scenarios)
    input.addEventListener('input', function() {
        if (input.value.includes(',')) {
            var parts = input.value.split(',');
            input.value = '';
            parts.forEach(function(part) {
                var trimmed = part.trim();
                if (trimmed) {
                    input.value = trimmed;
                    addTag();
                }
            });
        }
    });

    // Handle paste with multiple numbers
    input.addEventListener('paste', function(e) {
        setTimeout(function() {
            var val = input.value;
            if (val.includes(',') || val.includes('\n') || val.includes(' ')) {
                var parts = val.split(/[,\n\s]+/);
                input.value = '';
                parts.forEach(function(part) {
                    var trimmed = part.trim();
                    if (trimmed) {
                        input.value = trimmed;
                        addTag();
                    }
                });
            }
        }, 0);
    });
}

/**
 * Add a tag from the current input value
 */
function addTag() {
    var input = document.getElementById('orderInput');
    var value = input.value.trim();
    var errorEl = document.getElementById('inputError');

    // Hide previous error
    errorEl.classList.remove('visible');

    if (!value) return;

    // Validate: must be alphanumeric (letters and digits only)
    if (!/^[A-Za-z0-9]+$/.test(value)) {
        errorEl.classList.add('visible');
        return;
    }

    // Check for duplicates
    if (_orderNumbers.indexOf(value) !== -1) {
        errorEl.textContent = 'This order number is already added.';
        errorEl.classList.add('visible');
        setTimeout(function() {
            errorEl.textContent = 'Please enter a valid numeric order number.';
        }, 2000);
        return;
    }

    _orderNumbers.push(value);
    input.value = '';
    renderTags();
    updateButton();
}

/**
 * Remove a tag by index
 */
function removeTag(index) {
    _orderNumbers.splice(index, 1);
    renderTags();
    updateButton();
}

/**
 * Render all tags in the container
 */
function renderTags() {
    var container = document.getElementById('tagsContainer');
    var input = document.getElementById('orderInput');
    
    // Remove existing tags
    var existingTags = container.querySelectorAll('.tag');
    existingTags.forEach(function(tag) { tag.remove(); });

    // Add tags before input
    _orderNumbers.forEach(function(num, idx) {
        var tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML = num + ' <button class="tag-remove" onclick="removeTag(' + idx + ')" title="Remove">&times;</button>';
        container.insertBefore(tag, input);
    });

    // Update count
    var countEl = document.getElementById('tagCount');
    var countNum = document.getElementById('orderCount');
    if (_orderNumbers.length > 0) {
        countEl.style.display = 'block';
        countNum.textContent = _orderNumbers.length;
    } else {
        countEl.style.display = 'none';
    }
}

/**
 * Update button state
 */
function updateButton() {
    var btn = document.getElementById('btnReprocess');
    btn.disabled = _orderNumbers.length === 0;
}

/**
 * Reprocess orders - send to API
 */
async function reprocessOrders() {
    if (_orderNumbers.length === 0) return;

    showLoading('Reprocessing Orders...', 'Please wait while ' + _orderNumbers.length + ' order(s) are being reprocessed.');

    try {
        var response = await fetch(_serverURL + '/Orders/ReprocessOrders', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(_orderNumbers)
        });

        if (!response.ok) {
            var errorText = await response.text();
            throw new Error(errorText || 'Request failed with status ' + response.status);
        }

        var result = await response.text();
        
        var count = _orderNumbers.length;

        // Show process section, hide input section
        document.getElementById('inputSection').style.display = 'none';
        document.getElementById('reprocessedInfo').textContent = count + ' order(s) have been reprocessed.';
        document.getElementById('processSection').style.display = 'block';

        // Clear tags
        _orderNumbers = [];
        renderTags();
        updateButton();

    } catch (error) {
        console.error('Error reprocessing orders:', error);
        showMessage('error', 'Reprocessing Failed', 'An error occurred: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Run calculation process - redirects to process runner page
 */
function runProcess() {
    window.location.href = 'ICMProcessRunner.html';
}

/**
 * Reset page to input state for reprocessing more orders
 */
function resetPage() {
    document.getElementById('processSection').style.display = 'none';
    document.getElementById('inputSection').style.display = 'block';
    hideMessage();
}
