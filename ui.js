// ui.js - Handles all DOM manipulation and UI interactions for collar strategy

document.addEventListener('DOMContentLoaded', () => {
  // State management
  let savedStocks = JSON.parse(localStorage.getItem('savedStocks') || '[]');
  let calculator = null;
  let resultsUI = null; // Instance of ResultsUI
  let rawFetchedData = []; // To store raw fetched data

  // Restore API token if saved
  const savedApiToken = localStorage.getItem('apiToken');
  if (savedApiToken) document.getElementById('apiToken').value = savedApiToken;



  // Initialize dual range sliders
  function initializeRangeSliders() {
    // Initialize Strike-% slider
    initializeRangeSlider('strike', {
      min: 0,
      max: 100,
      startMin: 30,
      startMax: 80,
      suffix: '%',
      minInputId: 'minStrike',
      maxInputId: 'maxStrike'
    });

    // Initialize DTE slider
    initializeRangeSlider('dte', {
      min: 1,
      max: 365 * 2,
      startMin: 1,
      startMax: 45,
      suffix: ' days',
      minInputId: 'minDte',
      maxInputId: 'maxDte'
    });
  }

  // Generic range slider initialization
  function initializeRangeSlider(sliderName, options) {
    const rangeSlider = document.querySelector(`[data-slider="${sliderName}"]`);
    if (!rangeSlider) {
      console.error(`Range slider not found: ${sliderName}`);
      return;
    }

    const rangeTrack = rangeSlider.querySelector('.range-track');
    const rangeSelected = rangeSlider.querySelector('.range-selected');
    const minThumb = rangeSlider.querySelector('.thumb-min');
    const maxThumb = rangeSlider.querySelector('.thumb-max');
    const minValue = document.getElementById(options.minInputId);
    const maxValue = document.getElementById(options.maxInputId);
    const display = rangeSlider.querySelector('.range-display');

    let minVal = options.startMin;
    let maxVal = options.startMax;

    function updateSlider() {
      const percent1 = ((minVal - options.min) / (options.max - options.min)) * 100;
      const percent2 = ((maxVal - options.min) / (options.max - options.min)) * 100;

      rangeSelected.style.left = percent1 + '%';
      rangeSelected.style.width = (percent2 - percent1) + '%';

      minThumb.style.left = percent1 + '%';
      maxThumb.style.left = percent2 + '%';

      minValue.value = minVal;
      maxValue.value = maxVal;

      const displayText = sliderName === 'dte'
        ? `${minVal} - ${maxVal}${options.suffix}`
        : `${minVal}${options.suffix} - ${maxVal}${options.suffix}`;
      display.textContent = displayText;
    }

    function handleMinThumb(e) {
      e.preventDefault();
      const startX = e.clientX || e.touches[0].clientX;
      const startVal = minVal;
      const rect = rangeTrack.getBoundingClientRect();

      function onMove(e) {
        const currentX = e.clientX || e.touches[0].clientX;
        const diff = currentX - startX;
        const percent = (diff / rect.width) * 100;
        const range = options.max - options.min;
        let newVal = Math.round(startVal + (percent * range / 100));

        newVal = Math.max(options.min, Math.min(newVal, maxVal - 1));
        minVal = newVal;
        updateSlider();
      }

      function onEnd() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove);
      document.addEventListener('touchend', onEnd);
    }

    function handleMaxThumb(e) {
      e.preventDefault();
      const startX = e.clientX || e.touches[0].clientX;
      const startVal = maxVal;
      const rect = rangeTrack.getBoundingClientRect();

      function onMove(e) {
        const currentX = e.clientX || e.touches[0].clientX;
        const diff = currentX - startX;
        const percent = (diff / rect.width) * 100;
        const range = options.max - options.min;
        let newVal = Math.round(startVal + (percent * range / 100));

        newVal = Math.max(minVal + 1, Math.min(newVal, options.max));
        maxVal = newVal;
        updateSlider();
      }

      function onEnd() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove);
      document.addEventListener('touchend', onEnd);
    }

    minThumb.addEventListener('mousedown', handleMinThumb);
    minThumb.addEventListener('touchstart', handleMinThumb);
    maxThumb.addEventListener('mousedown', handleMaxThumb);
    maxThumb.addEventListener('touchstart', handleMaxThumb);

    // Click on track to move nearest thumb
    rangeTrack.addEventListener('click', (e) => {
      if (e.target.classList.contains('thumb')) return;

      const rect = rangeTrack.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      const range = options.max - options.min;
      const value = options.min + (percent * range / 100);

      const distToMin = Math.abs(value - minVal);
      const distToMax = Math.abs(value - maxVal);

      if (distToMin < distToMax) {
        minVal = Math.round(Math.max(options.min, Math.min(value, maxVal - 1)));
      } else {
        maxVal = Math.round(Math.max(minVal + 1, Math.min(value, options.max)));
      }

      updateSlider();
    });

    updateSlider();
  }

  // Create stock input section
  function createStockInputSection() {
    const container = document.getElementById('tradeForm');
    if (!container) {
      console.error('tradeForm not found');
      return;
    }

    const stockSection = document.createElement('div');
    stockSection.className = 'stock-input-section';
    stockSection.innerHTML = `
          <div class="manual-stocks">
              <h3>Enter Stocks</h3>
              <div id="stockInputs">
                  <div class="stock-input-row">
                      <input type="text" class="stock-input" maxlength="7" placeholder="e.g., AAPL">
                      <label class="save-label" style="display: none;"><input type="checkbox" class="save-stock-cb"> Save</label>
                  </div>
              </div>
              <button type="button" id="addStockBtn" class="add-stock-btn">+ Add More</button>
          </div>

          <div class="saved-stocks-section">
              <h3>Saved Stocks</h3>
              <div id="savedStocks" class="stock-checkboxes"></div>
          </div>
      `;

    // Insert after API token field
    const apiGroup = container.querySelector('.form-group');
    if (apiGroup) {
      apiGroup.after(stockSection);
    }

    // Add the demo mode checkbox container
    const demoModeHtml = `
          <div id="demoModeContainer" class="form-group" style="display: none;">
              <label>
                  <input type="checkbox" id="useDemoDataCb"> Use Demo Data (from last fetch)
              </label>
          </div>
      `;
    stockSection.after(document.createRange().createContextualFragment(demoModeHtml));

    // FIXED: Remove the problematic :has() selector usage
    // The original code was trying to remove a non-existent element with a browser-incompatible selector
    // Since there's no element with id="symbol" in the HTML, we can safely remove this code

    // Initial render of saved stocks
    renderSavedStocks();

    // Add stock button handler
    const addStockBtn = document.getElementById('addStockBtn');
    if (addStockBtn) {
      addStockBtn.addEventListener('click', addStockInput);
    }

    // Add input handler for first input
    const firstInput = container.querySelector('.stock-input');
    if (firstInput) {
      firstInput.addEventListener('input', handleStockInputChange);
    }
  }

  // Handle input change to show/hide save button
  function handleStockInputChange(e) {
    const saveLabel = e.target.parentElement.querySelector('.save-label');
    if (!saveLabel) return;

    if (e.target.value.trim()) {
      saveLabel.style.display = 'inline-flex';
    } else {
      saveLabel.style.display = 'none';
      // Uncheck if input is cleared
      const checkbox = saveLabel.querySelector('.save-stock-cb');
      if (checkbox) checkbox.checked = false;
    }
  }

  // Add new stock input row
  function addStockInput() {
    const container = document.getElementById('stockInputs');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'stock-input-row';
    row.innerHTML = `
          <input type="text" class="stock-input" maxlength="7" placeholder="e.g., AAPL">
          <label class="save-label" style="display: none;"><input type="checkbox" class="save-stock-cb"> Save</label>
          <button type="button" class="remove-input-btn">×</button>
      `;
    container.appendChild(row);

    // Add input handler
    const input = row.querySelector('.stock-input');
    if (input) {
      input.addEventListener('input', handleStockInputChange);
    }

    // Remove button handler
    const removeBtn = row.querySelector('.remove-input-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        row.remove();
      });
    }
  }

  // Render saved stocks with remove buttons
  function renderSavedStocks() {
    const savedDiv = document.getElementById('savedStocks');
    if (!savedDiv) return;

    savedDiv.innerHTML = '';

    if (savedStocks.length === 0) {
      savedDiv.innerHTML = '<span class="no-saved">No saved stocks yet. Enter a stock symbol and check "Save" to add it here.</span>';
      return;
    }

    savedStocks.forEach(stock => {
      const wrapper = document.createElement('div');
      wrapper.className = 'saved-stock-wrapper';
      wrapper.innerHTML = `
              <label class="stock-checkbox">
                  <input type="checkbox" value="${stock}"> ${stock}
              </label>
              <button type="button" class="remove-saved-btn" data-stock="${stock}">×</button>
          `;
      savedDiv.appendChild(wrapper);
    });

    // Add remove handlers
    savedDiv.querySelectorAll('.remove-saved-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stock = e.target.dataset.stock;
        savedStocks = savedStocks.filter(s => s !== stock);
        localStorage.setItem('savedStocks', JSON.stringify(savedStocks));
        renderSavedStocks();
      });
    });
  }

  // Get all selected stocks
  function getSelectedStocks() {
    const stocks = new Set();

    // Manual inputs
    document.querySelectorAll('.stock-input').forEach((input) => {
      const value = input.value.trim().toUpperCase();
      if (value) {
        stocks.add(value);

        // Check if should save
        const saveCheckbox = input.parentElement.querySelector('.save-stock-cb');
        if (saveCheckbox?.checked && !savedStocks.includes(value)) {
          savedStocks.push(value);
          localStorage.setItem('savedStocks', JSON.stringify(savedStocks));
        }
      }
    });

    // Checked saved stocks
    document.querySelectorAll('#savedStocks input:checked').forEach(cb => {
      stocks.add(cb.value);
    });

    return Array.from(stocks);
  }

  // Initialize stock input section
  createStockInputSection();

  // --- New: Load raw data from localStorage and set up demo checkbox ---
  const savedRawData = localStorage.getItem('rawFetchedData');
  if (savedRawData) {
    try {
      rawFetchedData = JSON.parse(savedRawData);
      // Show the demo checkbox if data is found
      const demoContainer = document.getElementById('demoModeContainer');
      if (demoContainer) {
        demoContainer.style.display = 'block';
      }
    } catch (e) {
      console.error("Error parsing rawFetchedData from localStorage:", e);
      localStorage.removeItem('rawFetchedData'); // Clear invalid data
    }
  }

  // Initialize range sliders with error handling
  setTimeout(() => {
    try {
      initializeRangeSliders();
    } catch (error) {
      console.error('Error initializing range sliders:', error);
    }
  }, 100);



  function recalculateMetrics(records) {
    const callPricePct = parseInt(document.getElementById('callPriceSlider')?.value || '50');
    const putPricePct = parseInt(document.getElementById('putPriceSlider')?.value || '50');
    
    return records.map(record => {
      // Calculate CALL price based on percentage between bid and ask
      const callPrice = record.callBid + (callPricePct / 100) * (record.callAsk - record.callBid);
      
      // Calculate PUT price based on percentage between bid and ask
      const putPrice = record.putBid + (putPricePct / 100) * (record.putAsk - record.putBid);
      
      const netCost = (record.price - callPrice + putPrice) * 100;
      const collar = (record.strike - record.price + callPrice - putPrice) * 100;
      const annReturn = (collar / netCost) * (365 / record.dte) * 100;
      
      return {
        ...record,
        netCost,
        collar,
        annReturn
      };
    }).filter(r => r.collar > 0);
  }

  function setupMarketPriceHandlers() {
    const callSlider = document.getElementById('callPriceSlider');
    const putSlider = document.getElementById('putPriceSlider');
    const callDisplay = document.getElementById('callPriceDisplay');
    const putDisplay = document.getElementById('putPriceDisplay');
    
    if (callSlider && callDisplay) {
      callSlider.addEventListener('input', (e) => {
        callDisplay.textContent = e.target.value + '%';
        updateResults();
      });
    }
    
    if (putSlider && putDisplay) {
      putSlider.addEventListener('input', (e) => {
        putDisplay.textContent = e.target.value + '%';
        updateResults();
      });
    }
    
    function updateResults() {
      if (rawFetchedData.length > 0) {
        const recalculated = recalculateMetrics(rawFetchedData);
        resultsUI.setRecords(recalculated);
        resultsUI.render();
        
        const msgElement = document.getElementById('message');
        if (msgElement) {
          msgElement.textContent = `Found ${recalculated.length} profitable collar positions (recalculated).`;
        }
      }
    }
  }

// Call this after DOM is loaded
setTimeout(() => {
  setupMarketPriceHandlers();
}, 100);
  
  const tradeForm = document.getElementById('tradeForm');
  if (tradeForm) {
    tradeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Form submitted'); // Debug log

      try {
        const apiTokenElement = document.getElementById('apiToken');
        const minStrikeElement = document.getElementById('minStrike');
        const maxStrikeElement = document.getElementById('maxStrike');
        const minDteElement = document.getElementById('minDte');
        const maxDteElement = document.getElementById('maxDte');
        const msgElement = document.getElementById('message');
        const resultsContainer = document.getElementById('resultsContainer');

        if (!apiTokenElement || !msgElement || !resultsContainer) {
          console.error('Required form elements not found');
          return;
        }

        const apiToken = apiTokenElement.value.trim();
        const minStrikePct = parseInt(minStrikeElement?.value || '75');
        const maxStrikePct = parseInt(maxStrikeElement?.value || '80');
        const minDte = parseInt(minDteElement?.value || '1');
        const maxDte = parseInt(maxDteElement?.value || '45');
        const useDemoDataElement = document.getElementById('useDemoDataCb');
        const useDemoData = useDemoDataElement?.checked || false;

        if (!apiToken && !useDemoData) {
          msgElement.textContent = 'Please enter an API token or use demo data.';
          return;
        }

        localStorage.setItem('apiToken', apiToken);

        // Get selected stocks
        const stocks = getSelectedStocks();
        console.log('Selected stocks:', stocks); // Debug log

        if (stocks.length === 0 && !useDemoData) {
          msgElement.textContent = 'Please select at least one stock, or use demo data.';
          return;
        }

        msgElement.textContent = useDemoData ? 'Loading demo data...' : `Loading collar options for ${stocks.length} stock(s)...`;
        resultsContainer.innerHTML = ''; // Clear previous results

        // Create calculator instance if not already created
        if (!calculator) {
          calculator = new CollarCalculator(apiToken);
        } else {
          calculator.apiToken = apiToken; // Update token if changed
        }

        // Create ResultsUI instance if not already created
        if (!resultsUI) {
          resultsUI = new ResultsUI('resultsContainer');
        }

        let allFetchedRecords = [];
        let apiCallsMade = 0;

        if (useDemoData && rawFetchedData.length > 0) {
          // Use data from localStorage if demo mode is enabled and data exists
          allFetchedRecords = recalculateMetrics(rawFetchedData);
          msgElement.textContent = `Using demo data with ${allFetchedRecords.length} profitable collar positions.`;
        } else {
          // Fetch data using calculator
          const result = await calculator.fetchOptionsData(stocks, {
            minStrikePct,
            maxStrikePct,
            minDte,
            maxDte
          });

          allFetchedRecords = result.records;
          rawFetchedData = result.records; // Store the raw data
          apiCallsMade = result.apiCalls;

          // Save fetched data to localStorage
          localStorage.setItem('rawFetchedData', JSON.stringify(allFetchedRecords));
          // Show demo checkbox after first successful fetch
          if (allFetchedRecords.length > 0) {
            const demoContainer = document.getElementById('demoModeContainer');
            if (demoContainer) {
              demoContainer.style.display = 'block';
            }
          }
        }

        if (!allFetchedRecords.length) {
          msgElement.textContent = 'No profitable collar positions found. Try adjusting your filters.';
          return;
        }

        if (!useDemoData) {
          msgElement.textContent = `Found ${allFetchedRecords.length} profitable collar positions. API calls: ${apiCallsMade}`;
        }

        // Update saved stocks display (in case new stocks were saved)
        renderSavedStocks();

        // Set records and render results using ResultsUI
        resultsUI.setRecords(allFetchedRecords);
        resultsUI.render();

        // Show market price options
const marketOptions = document.getElementById('marketPriceOptions');
if (marketOptions) {
  marketOptions.style.display = 'block';
}

      } catch (err) {
        console.error('Form submission error:', err);
        const msgElement = document.getElementById('message');
        if (msgElement) {
          msgElement.textContent = `Error: ${err.message}. Check your API token and try again.`;
        }
      }
    });
  } else {
    console.error('tradeForm element not found');
  }
});