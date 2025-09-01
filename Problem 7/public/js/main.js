// Main JavaScript for Shopping Cart Application

// Global variables
let cart = {
    items: [],
    total: 0,
    count: 0
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadCartData();
    setupEventListeners();
});

// Initialize application
function initializeApp() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Add fade-in animation to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('fade-in');
        }, index * 100);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Cart buttons
    document.addEventListener('click', function(e) {
        if (e.target.matches('.add-to-cart-btn') || e.target.closest('.add-to-cart-btn')) {
            handleAddToCart(e);
        }
        
        if (e.target.matches('.remove-from-cart-btn') || e.target.closest('.remove-from-cart-btn')) {
            handleRemoveFromCart(e);
        }
        
        if (e.target.matches('.update-quantity-btn') || e.target.closest('.update-quantity-btn')) {
            handleUpdateQuantity(e);
        }
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        searchInput.addEventListener('focus', showSearchSuggestions);
        searchInput.addEventListener('blur', hideSearchSuggestions);
    }

    // Filter functionality
    const filterInputs = document.querySelectorAll('.filter-input');
    filterInputs.forEach(input => {
        input.addEventListener('change', handleFilterChange);
    });

    // Quantity controls
    document.addEventListener('click', function(e) {
        if (e.target.matches('.quantity-decrease')) {
            updateQuantity(e.target, -1);
        }
        
        if (e.target.matches('.quantity-increase')) {
            updateQuantity(e.target, 1);
        }
    });

    // Image lazy loading
    const images = document.querySelectorAll('img[data-src]');
    if (images.length > 0) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }
}

// Cart functionality
async function handleAddToCart(e) {
    e.preventDefault();
    const button = e.target.closest('.add-to-cart-btn');
    const productId = button.dataset.productId;
    const quantity = parseInt(button.dataset.quantity) || 1;

    try {
        showLoading(button);
        
        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productId: productId,
                quantity: quantity
            })
        });

        const result = await response.json();
        
        if (result.success) {
            updateCartUI(result.cart);
            showNotification('Product added to cart!', 'success');
            
            // Update button state
            button.innerHTML = '<i class="fas fa-check me-1"></i>Added';
            button.classList.remove('btn-primary');
            button.classList.add('btn-success');
            
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-shopping-cart me-1"></i>Add to Cart';
                button.classList.remove('btn-success');
                button.classList.add('btn-primary');
            }, 2000);
        } else {
            showNotification(result.message || 'Failed to add product to cart', 'error');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add product to cart', 'error');
    } finally {
        hideLoading(button);
    }
}

async function handleRemoveFromCart(e) {
    e.preventDefault();
    const button = e.target.closest('.remove-from-cart-btn');
    const productId = button.dataset.productId;

    if (!confirm('Are you sure you want to remove this item from your cart?')) {
        return;
    }

    try {
        showLoading(button);
        
        const response = await fetch('/cart/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productId: productId
            })
        });

        const result = await response.json();
        
        if (result.success) {
            updateCartUI(result.cart);
            showNotification('Product removed from cart', 'success');
            
            // Remove the cart item row
            const cartItem = button.closest('.cart-item');
            if (cartItem) {
                cartItem.style.transition = 'all 0.3s ease';
                cartItem.style.opacity = '0';
                cartItem.style.transform = 'translateX(-100%)';
                setTimeout(() => cartItem.remove(), 300);
            }
        } else {
            showNotification(result.message || 'Failed to remove product from cart', 'error');
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        showNotification('Failed to remove product from cart', 'error');
    } finally {
        hideLoading(button);
    }
}

async function handleUpdateQuantity(e) {
    e.preventDefault();
    const input = e.target.closest('.cart-item').querySelector('.quantity-input');
    const productId = input.dataset.productId;
    const quantity = parseInt(input.value);

    if (quantity < 1) {
        input.value = 1;
        return;
    }

    try {
        const response = await fetch('/cart/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productId: productId,
                quantity: quantity
            })
        });

        const result = await response.json();
        
        if (result.success) {
            updateCartUI(result.cart);
            updateCartItemTotal(input.closest('.cart-item'), result.item);
        } else {
            showNotification(result.message || 'Failed to update quantity', 'error');
            // Reset to previous value
            input.value = input.dataset.previousValue || 1;
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
        showNotification('Failed to update quantity', 'error');
        input.value = input.dataset.previousValue || 1;
    }
}

function updateQuantity(button, change) {
    const cartItem = button.closest('.cart-item');
    const input = cartItem.querySelector('.quantity-input');
    const currentValue = parseInt(input.value) || 1;
    const newValue = Math.max(1, currentValue + change);
    
    input.dataset.previousValue = currentValue;
    input.value = newValue;
    
    // Trigger update
    handleUpdateQuantity({ target: input });
}

// Search functionality
async function handleSearch(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        hideSearchSuggestions();
        return;
    }

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        
        if (results.success) {
            showSearchSuggestions(results.suggestions);
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

function showSearchSuggestions(suggestions = []) {
    const container = document.getElementById('searchSuggestions');
    if (!container) return;

    if (suggestions.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.innerHTML = suggestions.map(item => `
        <div class="search-suggestion" data-type="${item.type}" data-id="${item.id}">
            <div class="d-flex align-items-center">
                <i class="fas ${item.type === 'product' ? 'fa-box' : 'fa-folder'} me-2"></i>
                <div>
                    <div class="fw-medium">${item.name}</div>
                    ${item.category ? `<small class="text-muted">${item.category}</small>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    container.style.display = 'block';
}

function hideSearchSuggestions() {
    setTimeout(() => {
        const container = document.getElementById('searchSuggestions');
        if (container) {
            container.style.display = 'none';
        }
    }, 200);
}

// Filter functionality
function handleFilterChange() {
    const filters = {};
    const filterInputs = document.querySelectorAll('.filter-input:checked');
    
    filterInputs.forEach(input => {
        const filterType = input.dataset.filterType;
        if (!filters[filterType]) {
            filters[filterType] = [];
        }
        filters[filterType].push(input.value);
    });

    // Apply filters to products
    applyFilters(filters);
}

function applyFilters(filters) {
    const products = document.querySelectorAll('.product-card');
    
    products.forEach(product => {
        let show = true;
        
        // Check each filter type
        Object.keys(filters).forEach(filterType => {
            if (filters[filterType].length > 0) {
                const productValue = product.dataset[filterType];
                if (!filters[filterType].includes(productValue)) {
                    show = false;
                }
            }
        });
        
        product.style.display = show ? 'block' : 'none';
    });
}

// UI Update functions
function updateCartUI(cartData) {
    cart = cartData;
    
    // Update cart count
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(element => {
        element.textContent = cartData.count || 0;
        element.style.display = cartData.count > 0 ? 'inline' : 'none';
    });
    
    // Update cart total
    const cartTotalElements = document.querySelectorAll('.cart-total');
    cartTotalElements.forEach(element => {
        element.textContent = `₹${(cartData.total || 0).toLocaleString('en-IN')}`;
    });
}

function updateCartItemTotal(cartItem, itemData) {
    const totalElement = cartItem.querySelector('.item-total');
    if (totalElement && itemData) {
        totalElement.textContent = `₹${(itemData.total || 0).toLocaleString('en-IN')}`;
    }
}

async function loadCartData() {
    try {
        const response = await fetch('/api/cart/summary');
        const result = await response.json();
        
        if (result.success) {
            updateCartUI(result.cart);
        }
    } catch (error) {
        console.error('Error loading cart data:', error);
    }
}

// Utility functions
function showLoading(element) {
    element.disabled = true;
    element.classList.add('loading');
    const originalText = element.innerHTML;
    element.dataset.originalText = originalText;
    element.innerHTML = '<span class="loading-spinner"></span>';
}

function hideLoading(element) {
    element.disabled = false;
    element.classList.remove('loading');
    element.innerHTML = element.dataset.originalText || element.innerHTML;
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Price formatting
function formatPrice(price) {
    return `₹${price.toLocaleString('en-IN')}`;
}

// Image error handling
function handleImageError(img) {
    img.src = '/images/placeholder.jpg';
    img.onerror = null;
}

// Smooth scroll to element
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Form validation
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });
    
    return isValid;
}

// Export functions for global use
window.ShoppingCart = {
    addToCart: handleAddToCart,
    removeFromCart: handleRemoveFromCart,
    updateQuantity: handleUpdateQuantity,
    loadCartData: loadCartData,
    showNotification: showNotification,
    formatPrice: formatPrice
};
