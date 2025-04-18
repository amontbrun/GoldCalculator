// --- Constants ---
const gramsPerTroyOunce = 31.1035;
const apiKey = 'goldapi-1vo6sm9naacj1-io'; // Your GoldAPI.io Key
const apiUrl = 'https://www.goldapi.io/api/XAU/USD'; // GoldAPI.io endpoint for Gold in USD

// --- DOM Elements ---
const basePriceGramElement = document.getElementById('base-price-gram');
const basePriceOunceElement = document.getElementById('base-price-ounce');
const timestampElement = document.getElementById('timestamp');
const purityPricesList = document.getElementById('purity-prices');
const refreshButton = document.getElementById('refresh-button');
const calcPuritySelect = document.getElementById('calc-purity');
const calcGramsInput = document.getElementById('calc-grams');
const calculateButton = document.getElementById('calculate-button');
const calcValueSpan = document.getElementById('calc-value');
const apiStatsElement = document.getElementById('api-stats');
const purchasePriceInput = document.getElementById('purchase-price');
const profitPercentSpan = document.getElementById('profit-percent');
const netProfitSpan = document.getElementById('net-profit');


// --- Global State ---
let currentPricePerGram = null; // To store the fetched price for the calculator

// --- Purity Definitions ---
const purities = [
    { name: "Oro 24k (Ley 999)", factor: 0.999 / 0.999 }, // 99.9%
    { name: "Oro 22k (Ley 916)", factor: 0.916 / 0.999 }, // 91.6%
    { name: "Oro 18k (Ley 750)", factor: 0.750 / 0.999 }, // 75.0%
    { name: "Oro 14k (Ley 585)", factor: 0.585 / 0.999 }, // 58.5%
    { name: "Oro Ley 900", factor: 0.900 / 0.999 },       // 90.0%
    { name: "Oro 10k (Ley 417)", factor: 0.417 / 0.999 }  // 41.7%
];

// --- Functions ---

// Function to populate the calculator's purity dropdown
function populatePurityDropdown() {
    if (!calcPuritySelect) return;
    // Clear existing options except the placeholder
    calcPuritySelect.innerHTML = '<option value="">Seleccione...</option>';
    purities.forEach(purity => {
        const option = document.createElement('option');
        option.value = purity.factor; // Store the factor as the value
        option.textContent = purity.name;
        calcPuritySelect.appendChild(option);
    });
}


// Function to update the display with fetched prices
function updateDisplay(pricePerOunce, timestamp) {
    currentPricePerGram = pricePerOunce / gramsPerTroyOunce; // Store globally

    // Format timestamp (API provides Unix timestamp in seconds)
    const date = new Date(timestamp * 1000);
    const formattedTimestamp = date.toLocaleString('es-VE', {
        dateStyle: 'long',
        timeStyle: 'medium'
    });

    // Update base prices and timestamp display
    if (basePriceGramElement) basePriceGramElement.textContent = currentPricePerGram.toFixed(2);
    if (basePriceOunceElement) basePriceOunceElement.textContent = pricePerOunce.toFixed(2);
    if (timestampElement) timestampElement.textContent = formattedTimestamp;

    // Clear calculator result when price updates
    if (calcValueSpan) calcValueSpan.textContent = '---';

    // Calculate and display prices for different purities (per gram)
    if (purityPricesList) {
        purityPricesList.innerHTML = ''; // Clear previous list
        purities.forEach(purity => {
            const calculatedPrice = currentPricePerGram * purity.factor; // Use stored price
            const listItem = document.createElement('li');
            listItem.innerHTML = `${purity.name}: <span>${calculatedPrice.toFixed(2)} USD</span>`;
            purityPricesList.appendChild(listItem);
        });
    }
}

// Function to perform calculation
function calculateValue() {
    if (!calcValueSpan || !calcPuritySelect || !calcGramsInput) return;

    const selectedFactor = parseFloat(calcPuritySelect.value);
    const grams = parseFloat(calcGramsInput.value);

    // Validation
    if (!selectedFactor) {
        alert("Por favor, seleccione una pureza.");
        calcValueSpan.textContent = 'Error';
        return;
    }
    if (isNaN(grams) || grams <= 0) {
        alert("Por favor, ingrese un número válido de gramos (mayor que 0).");
        calcValueSpan.textContent = 'Error';
        return;
    }
    if (currentPricePerGram === null) {
        alert("El precio base del oro aún no se ha cargado. Intente actualizar.");
        calcValueSpan.textContent = 'Error';
        return;
    }

    // Calculation
    const totalValue = grams * currentPricePerGram * selectedFactor;
    calcValueSpan.textContent = totalValue.toFixed(2); // Display with 2 decimal places

    // Calculate profit
    calculateProfit(totalValue);
}

function calculateProfit(currentValue) {
    if (!purchasePriceInput || !profitPercentSpan || !netProfitSpan) return;

    const purchasePrice = parseFloat(purchasePriceInput.value);

    if (isNaN(purchasePrice) || purchasePrice <= 0) {
        profitPercentSpan.textContent = 'Error';
        netProfitSpan.textContent = 'Error';
        alert("Por favor, ingrese un precio de compra válido (mayor que 0).");
        return;
    }

    const profit = currentValue - purchasePrice;
    const profitPercent = (profit / purchasePrice) * 100;

    profitPercentSpan.textContent = profitPercent.toFixed(2);
    netProfitSpan.textContent = profit.toFixed(2);
}


// Function to fetch gold price from GoldAPI.io
async function fetchGoldPrice() {
    // Disable buttons during fetch
    if (refreshButton) refreshButton.disabled = true;
    if (calculateButton) calculateButton.disabled = true;

    // Indicate loading state
    currentPricePerGram = null; // Reset price while loading
    if (calcValueSpan) calcValueSpan.textContent = '---'; // Reset calculator result
    if (basePriceGramElement) basePriceGramElement.textContent = 'Cargando...';
    if (basePriceOunceElement) basePriceOunceElement.textContent = 'Cargando...';
    if (timestampElement) timestampElement.textContent = 'Cargando...';
    if (purityPricesList) purityPricesList.innerHTML = '<li>Cargando precios...</li>';

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'x-access-token': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // Attempt to read error message from API if available
            let errorMsg = `Error HTTP: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg += ` - ${errorData.error || JSON.stringify(errorData)}`;
            } catch (e) { /* Ignore if error response is not JSON */ }
            throw new Error(errorMsg);
        }

        const data = await response.json();

        // Check if the expected data is present
        if (data && typeof data.price === 'number' && typeof data.timestamp === 'number') {
            updateDisplay(data.price, data.timestamp);
        } else {
            console.error('Respuesta inesperada de la API:', data);
            throw new Error('Formato de respuesta inesperado de la API.');
        }

    } catch (error) {
        console.error('Error al obtener el precio del oro:', error);
        // Display error message to the user
        const errorMessage = `Error al cargar: ${error.message}`;
        if (basePriceGramElement) basePriceGramElement.textContent = 'Error';
        if (basePriceOunceElement) basePriceOunceElement.textContent = 'Error';
        if (timestampElement) timestampElement.textContent = errorMessage;
        if (purityPricesList) purityPricesList.innerHTML = `<li>${errorMessage}</li>`;
        if (calcValueSpan) calcValueSpan.textContent = 'Error'; // Show error in calculator too
    } finally {
         // Re-enable buttons after fetch attempt (success or failure)
        if (refreshButton) refreshButton.disabled = false;
        if (calculateButton) calculateButton.disabled = false;
    }
}

// Function to fetch and display API statistics
async function fetchApiStats() {
    if (!apiStatsElement) return;

    apiStatsElement.innerHTML = '<p>Cargando estadísticas...</p>';

    try {
        const response = await fetch("https://www.goldapi.io/api/stat", {
            method: 'GET',
            headers: {
                "x-access-token": apiKey,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        // Check the structure of the API response
        console.log("API Stats Response:", data);

         // Format the statistics for display
        const statsHTML = `
            <p><b>Hoy:</b> ${data?.requests_today}</p>
            <p><b>Ayer:</b> ${data?.requests_yesterday}</p>
            <p><b>Mes actual:</b> ${data?.requests_month}</p>
            <p><b>Mes pasado:</b> ${data?.requests_last_month}</p>
        `;

        apiStatsElement.innerHTML = statsHTML;

    } catch (error) {
        console.error('Error al obtener las estadísticas de la API:', error);
        apiStatsElement.innerHTML = `<p>Error al cargar las estadísticas: ${error.message}</p>`;
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    populatePurityDropdown(); // Populate dropdown on load
    fetchGoldPrice();         // Fetch initial price on load
    fetchApiStats();          // Fetch API stats on load

    // Add listener for the refresh button
    if (refreshButton) {
        refreshButton.addEventListener('click', fetchGoldPrice);
    }

    // Add listener for the calculate button
    if (calculateButton) {
        calculateButton.addEventListener('click', calculateValue);
    }
});
