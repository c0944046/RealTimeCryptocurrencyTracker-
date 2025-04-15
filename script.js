// DOM Elements
const cryptoTableBody = document.getElementById('crypto-table-body');
const comparisonContainer = document.getElementById('comparison-container');
const sortBySelect = document.getElementById('sort-by');
const refreshBtn = document.getElementById('refresh-btn');
const searchInput = document.getElementById('search-input');
const clearComparisonBtn = document.getElementById('clear-comparison');
const saveComparisonBtn = document.getElementById('save-comparison');
const lastUpdatedSpan = document.getElementById('last-updated');
const notification = document.getElementById('notification');

// Global variables
let cryptoData = [];
let selectedCryptos = [];
let sortMethod = 'market_cap';
let searchQuery = '';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadSelectedCryptos();
    fetchCryptoData();
    setupEventListeners();
    
    // Refresh data every minute
    setInterval(fetchCryptoData, 60000);
});

// Event listeners setup
function setupEventListeners() {
    sortBySelect.addEventListener('change', (e) => {
        sortMethod = e.target.value;
        renderCryptoTable();
    });
    
    refreshBtn.addEventListener('click', fetchCryptoData);
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderCryptoTable();
    });
    
    clearComparisonBtn.addEventListener('click', clearComparison);
    saveComparisonBtn.addEventListener('click', saveComparison);
}

// Fetch crypto data from CoinGecko API
async function fetchCryptoData() {
    try {
        showNotification('Fetching latest cryptocurrency data...');
        
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false');
        
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        
        cryptoData = await response.json();
        
        // Match saved cryptos after data is loaded
        if (selectedCryptos.length > 0 && selectedCryptos[0].id && !selectedCryptos[0].name) {
            const savedIds = selectedCryptos.map(c => c.id);
            selectedCryptos = cryptoData.filter(crypto => savedIds.includes(crypto.id));
        }
        
        renderCryptoTable();
        updateComparisonCards();
        
        const now = new Date();
        lastUpdatedSpan.textContent = now.toLocaleString();
        
        showNotification('Data updated successfully!', 'success');
    } catch (error) {
        console.error('Error fetching crypto data:', error);
        showNotification('Failed to update data. Please try again.', 'error');
    }
}

// Render the crypto table based on current sort and search
function renderCryptoTable() {
    if (!cryptoData.length) return;
    
    // Filter and sort data
    let filteredData = [...cryptoData];
    
    // Apply search filter
    if (searchQuery) {
        filteredData = filteredData.filter(crypto => 
            (crypto.name && crypto.name.toLowerCase().includes(searchQuery)) || 
            (crypto.symbol && crypto.symbol.toLowerCase().includes(searchQuery))
        );
    }
    
    // Apply sorting
    filteredData.sort((a, b) => {
        switch (sortMethod) {
            case 'price':
                return (b.current_price || 0) - (a.current_price || 0);
            case '24h_change':
                return (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0);
            case 'market_cap':
            default:
                return (b.market_cap || 0) - (a.market_cap || 0);
        }
    });
    
    // Clear table
    cryptoTableBody.innerHTML = '';
    
    // Populate table
    filteredData.forEach(crypto => {
        const isSelected = selectedCryptos.some(c => c.id === crypto.id);
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${crypto.name || 'N/A'}</td>
            <td>${crypto.symbol ? crypto.symbol.toUpperCase() : 'N/A'}</td>
            <td>$${(crypto.current_price || 0).toLocaleString()}</td>
            <td class="${(crypto.price_change_percentage_24h || 0) >= 0 ? 'positive' : 'negative'}">
                ${(crypto.price_change_percentage_24h || 0) >= 0 ? '+' : ''}${(crypto.price_change_percentage_24h || 0).toFixed(2)}%
            </td>
            <td>$${(crypto.market_cap || 0).toLocaleString()}</td>
            <td>
                <button class="action-btn ${isSelected ? 'remove' : ''}" data-id="${crypto.id}">
                    ${isSelected ? 'Remove' : 'Compare'}
                </button>
            </td>
        `;
        
        cryptoTableBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleCryptoSelection(btn.dataset.id));
    });
}

// Toggle crypto selection for comparison
function toggleCryptoSelection(cryptoId) {
    const crypto = cryptoData.find(c => c.id === cryptoId);
    
    if (!crypto) return;
    
    // Check if already selected
    const existingIndex = selectedCryptos.findIndex(c => c.id === cryptoId);
    
    if (existingIndex >= 0) {
        // Remove from selection
        selectedCryptos.splice(existingIndex, 1);
    } else {
        // Add to selection (if less than 5)
        if (selectedCryptos.length >= 5) {
            showNotification('You can compare up to 5 cryptocurrencies at a time', 'warning');
            return;
        }
        selectedCryptos.push(crypto);
    }
    
    renderCryptoTable();
    updateComparisonCards();
}

// Update the comparison cards display
function updateComparisonCards() {
    if (selectedCryptos.length === 0) {
        comparisonContainer.innerHTML = '<div class="empty-state"><p>Select up to 5 cryptocurrencies to compare</p></div>';
        return;
    }
    
    comparisonContainer.innerHTML = '';
    
    selectedCryptos.forEach(crypto => {
        // Skip if crypto object is invalid
        if (!crypto || !crypto.id) return;
        
        const card = document.createElement('div');
        card.className = 'comparison-card';
        
        card.innerHTML = `
            <h3>
                ${crypto.image ? `<img src="${crypto.image}" alt="${crypto.name}" width="24" height="24">` : ''}
                ${crypto.name || 'N/A'}
            </h3>
            <span class="symbol">${crypto.symbol ? crypto.symbol.toUpperCase() : 'N/A'}</span>
            <div class="price">$${crypto.current_price ? crypto.current_price.toLocaleString() : 'N/A'}</div>
            <div class="change ${(crypto.price_change_percentage_24h || 0) >= 0 ? 'positive' : 'negative'}">
                <i class="fas ${(crypto.price_change_percentage_24h || 0) >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                ${typeof crypto.price_change_percentage_24h === 'number' ? 
                  ((crypto.price_change_percentage_24h >= 0 ? '+' : '') + crypto.price_change_percentage_24h.toFixed(2) + '%') : 
                  'N/A'}
            </div>
            <div>Market Cap: $${crypto.market_cap ? crypto.market_cap.toLocaleString() : 'N/A'}</div>
            <button class="remove-btn" data-id="${crypto.id}">
                <i class="fas fa-times"></i> Remove
            </button>
        `;
        
        comparisonContainer.appendChild(card);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleCryptoSelection(btn.dataset.id));
    });
}

// Clear the comparison selection
function clearComparison() {
    selectedCryptos = [];
    renderCryptoTable();
    updateComparisonCards();
    showNotification('Comparison cleared', 'success');
}

// Save the current comparison to local storage
function saveComparison() {
    try {
        const comparisonIds = selectedCryptos.map(crypto => crypto.id);
        localStorage.setItem('cryptoComparison', JSON.stringify(comparisonIds));
        showNotification('Comparison saved', 'success');
    } catch (error) {
        console.error('Error saving comparison:', error);
        showNotification('Failed to save comparison', 'error');
    }
}

// Load saved comparison from local storage
function loadSelectedCryptos() {
    try {
        const savedComparison = localStorage.getItem('cryptoComparison');
        if (savedComparison) {
            const comparisonIds = JSON.parse(savedComparison);
            // Store just the IDs - we'll match with full data when loaded
            selectedCryptos = comparisonIds.map(id => ({ id }));
        }
    } catch (error) {
        console.error('Error loading saved comparison:', error);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = 'notification';
    
    // Add type class if provided
    if (type === 'success') {
        notification.style.backgroundColor = 'var(--positive)';
    } else if (type === 'error') {
        notification.style.backgroundColor = 'var(--negative)';
    } else if (type === 'warning') {
        notification.style.backgroundColor = 'var(--warning)';
    } else {
        notification.style.backgroundColor = 'var(--primary-color)';
    }
    
    // Show notification
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}