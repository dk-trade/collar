// results_ui.js - Renders and sorts the results table

class ResultsUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.records = [];
        this.sortState = { column: null, direction: null };
    }

    setRecords(arr) {
        this.records = Array.isArray(arr) ? [...arr] : [];
        this.sortState = { column: null, direction: null }; // Reset sort state when new records are set
    }

    // In ResultsUI.js, inside the render() method:
render() {
    this.container.innerHTML = ''; // Clear the main container, including the .table-scroll-container placeholder

    if (this.records.length === 0) {
        this.container.innerHTML = '<p>No results to display.</p>';
        return;
    }

    let displayRows = [...this.records];

    // Apply sort
    if (this.sortState.column) {
        displayRows = CollarCalculator.sortRecords(displayRows, this.sortState.column, this.sortState.direction);
    } else {
        // Default sort by annReturn descending
        displayRows.sort((a, b) => b.annReturn - a.annReturn);
    }

    // Check if single symbol
    const uniqueSymbols = [...new Set(displayRows.map(r => r.symbol))];
    const isSingleSymbol = uniqueSymbols.length === 1;

    if (isSingleSymbol) {
        // Display symbol and price info above table
        const stockInfo = document.createElement('div');
        stockInfo.className = 'stock-info';
        stockInfo.innerHTML = `
            <h2>${uniqueSymbols[0]}</h2>
            <p class="stock-price">Current Price: $${this._formatNumber(displayRows[0].price)}</p>
        `;
        this.container.appendChild(stockInfo);
    }

    const summary = document.createElement('p');
    summary.textContent = `Showing ${displayRows.length} profitable collar opportunities.`;
    this.container.appendChild(summary);

    // Create and append the table scroll container
    const tableScrollContainer = document.createElement('div');
    tableScrollContainer.className = 'table-scroll-container';
    this.container.appendChild(tableScrollContainer);

    const table = document.createElement('table');
    table.className = 'result-table';
    table.appendChild(this._createTableHeader(isSingleSymbol));

    const tbody = document.createElement('tbody');
    displayRows.forEach(r => {
        const row = document.createElement('tr');
        const cells = [];

        if (!isSingleSymbol) {
            cells.push(`<td>${r.symbol}</td>`);
            cells.push(`<td>${this._formatNumber(r.price)}</td>`);
        }

        cells.push(
            `<td>${r.expDate}</td>`,
            `<td>${r.dte}</td>`,
            `<td>${this._formatNumber(r.strike)}</td>`,
            `<td>${r.strikePricePct.toFixed(2)}%</td>`,
            `<td>${this._formatNumber(r.callBid)}</td>`,
            `<td>${this._formatNumber(r.callAsk)}</td>`,
            `<td>${this._formatNumber(r.callMid)}</td>`,
            `<td>${this._formatNumber(r.putBid)}</td>`,
            `<td>${this._formatNumber(r.putAsk)}</td>`,
            `<td>${this._formatNumber(r.putMid)}</td>`,
            `<td>${this._formatNumber(r.netCost)}</td>`,
            `<td class="profit">${this._formatNumber(r.collar)}</td>`,
            `<td class="return">${this._formatNumber(r.annReturn)}%</td>`
        );

        row.innerHTML = cells.join('');
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableScrollContainer.appendChild(table); // Append table to the scroll container
}

    _formatNumber(num) {
        if (typeof num !== 'number') return num;
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    _createTableHeader(isSingleSymbol = false) {
        const headers = [
            { key: 'symbol', label: 'Symbol', skip: isSingleSymbol },
            { key: 'price', label: 'Stock Price', skip: isSingleSymbol },
            { key: 'expDate', label: 'Expire Date' },
            { key: 'dte', label: 'DTE' },
            { key: 'strike', label: 'Strike' },
            { key: 'strikePricePct', label: 'Strike/Price %' },
            { key: 'callBid', label: 'Call Bid' },
            { key: 'callAsk', label: 'Call Ask' },
            { key: 'callMid', label: 'Call Mid' },
            { key: 'putBid', label: 'Put Bid' },
            { key: 'putAsk', label: 'Put Ask' },
            { key: 'putMid', label: 'Put Mid' },
            { key: 'netCost', label: 'Net Cost' },
            { key: 'collar', label: 'Collar (Profit)' },
            { key: 'annReturn', label: 'Ann. Return %' }
        ];

        const thead = document.createElement('thead');
        const tr = document.createElement('tr');

        headers.forEach(({ key, label, skip }) => {
            if (skip) return;

            const th = document.createElement('th');
            th.className = 'sortable';
            th.dataset.column = key;
            th.innerHTML = `${label} <span class="sort-arrow"></span>`;

            th.addEventListener('click', () => this._handleSort(key));

            // Update arrow display
            if (this.sortState.column === key) {
                th.classList.add('sorted');
                const arrow = th.querySelector('.sort-arrow');
                arrow.textContent = this.sortState.direction === 'asc' ? '▲' : '▼';
            }

            tr.appendChild(th);
        });

        thead.appendChild(tr);
        return thead;
    }

    _handleSort(column) {
        if (this.sortState.column === column) {
            // Cycle through: asc -> desc -> null
            if (this.sortState.direction === 'asc') {
                this.sortState.direction = 'desc';
            } else if (this.sortState.direction === 'desc') {
                this.sortState.column = null;
                this.sortState.direction = null;
            }
        } else {
            this.sortState.column = column;
            this.sortState.direction = 'asc';
        }

        // Re-render table with new sort
        this.render();
    }
}

window.ResultsUI = ResultsUI;