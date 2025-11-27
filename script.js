// ===== LIMPIAR CACHE AL CARGAR =====
(function() {
    'use strict';
    
    console.log('🔄 Forzando actualización de cache...');
    
    // Forzar recarga de CSS
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes('styles.css')) {
            const newHref = href.split('?')[0] + '?v=' + Date.now();
            link.setAttribute('href', newHref);
            console.log('✅ CSS actualizado:', newHref);
        }
    });
    
    // Forzar recarga de JS
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
        const src = script.getAttribute('src');
        if (src && src.includes('script.js')) {
            const newSrc = src.split('?')[0] + '?v=' + Date.now();
            script.setAttribute('src', newSrc);
            console.log('✅ JS actualizado:', newSrc);
        }
    });
})();

// Buscador Profesional con Búsqueda Exacta
class ProductSearch {
    constructor() {
        this.products = [];
        this.grouped = new Map();
        this.cache = new Map();
        this.recentSearches = this.loadRecentSearches();
        this.searchStats = this.loadSearchStats();
        this.currentState = 'loading';
        this.lastSearchTerm = '';
        this.init();
    }

    async init() {
        try {
            await this.loadProducts();
            this.groupProducts();
            this.setupSearch();
            this.updateStats();
            this.showHomePanel();
        } catch (error) {
            this.showError();
        }
    }

    // ===== ALGORITMO DE BÚSQUEDA EXACTA =====
    normalizeText(text) {
        return text.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    // BÚSQUEDA EXACTA MEJORADA
    searchProducts(text, searchTerm) {
        const normalizedText = this.normalizeText(text);
        const searchWords = this.normalizeText(searchTerm).split(/\s+/).filter(w => w.length > 0);
        
        // Verificar si hay números en la búsqueda
        const numberWords = searchWords.filter(word => /\d/.test(word));
        const textWords = searchWords.filter(word => !/\d/.test(word));
        
        // Si hay números, búsqueda ESTRICTA
        if (numberWords.length > 0) {
            // DEBE cumplir TODAS las condiciones:
            // 1. Todos los textos deben coincidir
            const textMatch = textWords.every(word => normalizedText.includes(word));
            if (!textMatch) return false;
            
            // 2. Todos los números deben coincidir EXACTAMENTE
            const numberMatch = numberWords.every(number => {
                // Buscar el número como palabra completa (no como parte de otro número)
                const numberRegex = new RegExp(`\\b${number}\\b`, 'i');
                return numberRegex.test(text);
            });
            
            return numberMatch;
        } else {
            // Solo texto: búsqueda normal
            return searchWords.every(word => normalizedText.includes(word));
        }
    }

    // ===== SISTEMA DE ESTADÍSTICAS DE BÚSQUEDAS =====
    loadSearchStats() {
        try {
            const stored = localStorage.getItem('searchStats');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            return {};
        }
    }

    saveSearchStats() {
        try {
            localStorage.setItem('searchStats', JSON.stringify(this.searchStats));
        } catch (error) {
            console.error('Error guardando estadísticas:', error);
        }
    }

    recordProductSearch(productCode, searchTerm, source = 'click') {
        if (!productCode) return;
        
        if (!this.searchStats[productCode]) {
            this.searchStats[productCode] = {
                count: 0,
                lastSearched: Date.now(),
                searchTerms: [],
                sources: {}
            };
        }
        
        this.searchStats[productCode].count++;
        this.searchStats[productCode].lastSearched = Date.now();
        
        if (searchTerm && !this.searchStats[productCode].searchTerms.includes(searchTerm)) {
            this.searchStats[productCode].searchTerms.unshift(searchTerm);
            this.searchStats[productCode].searchTerms = this.searchStats[productCode].searchTerms.slice(0, 5);
        }
        
        if (!this.searchStats[productCode].sources[source]) {
            this.searchStats[productCode].sources[source] = 0;
        }
        this.searchStats[productCode].sources[source]++;
        
        this.saveSearchStats();
        console.log(`📊 Producto ${productCode}: ${this.searchStats[productCode].count} búsquedas (desde: ${source})`);
    }

    getPopularProducts() {
        const popularArray = Object.entries(this.searchStats)
            .map(([productCode, stats]) => ({
                productCode,
                count: stats.count,
                lastSearched: stats.lastSearched,
                searchTerms: stats.searchTerms,
                sources: stats.sources
            }))
            .sort((a, b) => {
                if (b.count !== a.count) {
                    return b.count - a.count;
                }
                return b.lastSearched - a.lastSearched;
            })
            .slice(0, 6);
        
        return popularArray;
    }

    updatePopularProductsUI() {
        const container = document.getElementById('popularProducts');
        if (!container) return;

        const popularProducts = this.getPopularProducts();
        
        if (popularProducts.length === 0) {
            container.innerHTML = `
                <div class="popular-product" style="text-align: center; color: var(--text-muted); grid-column: 1 / -1;">
                    <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
                    <div>Las búsquedas populares aparecerán aquí</div>
                    <div style="font-size: 12px; margin-top: 4px;">Busca productos para comenzar</div>
                </div>
            `;
            return;
        }

        container.innerHTML = popularProducts.map(item => {
            const product = this.grouped.get(item.productCode);
            if (!product) return '';
            
            const mainVariant = product.variantes[0];
            const searchCount = item.count;
            const mostUsedTerm = item.searchTerms[0] || product.codigo;
            
            return `
                <div class="popular-product" onclick="productSearch.performSearchFromPopular('${this.escapeHTML(mostUsedTerm)}', '${this.escapeHTML(product.codigo)}')">
                    <div class="popular-header">
                        <div class="popular-code">${product.codigo}</div>
                        <div class="popular-badge">${searchCount} ${searchCount === 1 ? 'vez' : 'veces'}</div>
                    </div>
                    <div class="popular-desc">${this.truncateText(product.descripcion, 40)}</div>
                    <div class="popular-price">S/. ${mainVariant.precio}</div>
                </div>
            `;
        }).join('');
    }

    // ===== GESTIÓN DE BÚSQUEDAS RECIENTES =====
    loadRecentSearches() {
        try {
            const stored = localStorage.getItem('recentSearches');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error cargando búsquedas recientes:', error);
            return [];
        }
    }

    saveRecentSearches() {
        try {
            localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
        } catch (error) {
            console.error('Error guardando búsquedas recientes:', error);
        }
    }

    addRecentSearch(term) {
        if (!term || term.trim().length < 2) return;
        
        const cleanTerm = term.trim();
        console.log(`💾 Guardando búsqueda en recientes: "${cleanTerm}"`);
        
        this.recentSearches = this.recentSearches.filter(t => t !== cleanTerm);
        this.recentSearches.unshift(cleanTerm);
        this.recentSearches = this.recentSearches.slice(0, 8);
        
        this.saveRecentSearches();
        this.updateRecentSearchesUI();
    }

    removeRecentSearch(term) {
        this.recentSearches = this.recentSearches.filter(t => t !== term);
        this.saveRecentSearches();
        this.updateRecentSearchesUI();
    }

    updateRecentSearchesUI() {
        const container = document.getElementById('recentSearches');
        if (!container) return;

        if (this.recentSearches.length === 0) {
            container.innerHTML = '<div class="search-chip" style="justify-content: center; color: var(--text-muted);">No hay búsquedas recientes</div>';
            return;
        }

        container.innerHTML = this.recentSearches.map(term => `
            <div class="search-chip" onclick="productSearch.performSearchFromRecent('${this.escapeHTML(term)}')">
                <span>${term}</span>
                <span class="remove" onclick="event.stopPropagation(); productSearch.removeRecentSearch('${this.escapeHTML(term)}')">
                    <i class="fas fa-times"></i>
                </span>
            </div>
        `).join('');
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== BÚSQUEDA DESDE RECIENTES =====
    performSearchFromRecent(term) {
        console.log(`🎯 Buscando desde recientes: "${term}"`);
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = term;
        }
        
        this.search(term, true);
        
        setTimeout(() => {
            this.recordSearchFromRecent(term);
        }, 100);
    }

    recordSearchFromRecent(searchTerm) {
        const results = this.cache.get(searchTerm);
        if (results && results.size > 0) {
            results.forEach((product, productCode) => {
                this.recordProductSearch(productCode, searchTerm, 'recent_searches');
            });
            this.updatePopularProductsUI();
        }
    }

    // ===== BÚSQUEDA DESDE POPULARES =====
    performSearchFromPopular(term, productCode = null) {
        console.log(`🎯 Buscando desde populares: "${term}"`);
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = term;
        }
        
        this.search(term, true);
        
        if (productCode) {
            this.recordProductSearch(productCode, term, 'popular_list');
        }
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // ===== PANEL DE INICIO =====
    showHomePanel() {
        this.currentState = 'home';
        this.hideAllStates();
        
        const homePanel = document.getElementById('homePanel');
        const countElement = document.getElementById('resultsCount');
        
        if (homePanel) homePanel.style.display = 'block';
        if (countElement) countElement.textContent = `${this.grouped.size} productos disponibles`;
        
        this.updateRecentSearchesUI();
        this.updatePopularProductsUI();
    }

    hideHomePanel() {
        const homePanel = document.getElementById('homePanel');
        if (homePanel) homePanel.style.display = 'none';
    }

    // ===== BÚSQUEDA PRINCIPAL =====
    async loadProducts() {
        const startTime = performance.now();
        
        try {
            const response = await fetch('./productos.json');
            if (!response.ok) throw new Error('Error HTTP');
            
            this.products = await response.json();
            
            const loadTime = performance.now() - startTime;
            console.log(`✅ ${this.products.length} productos cargados en ${loadTime.toFixed(0)}ms`);
            
        } catch (error) {
            console.error('❌ Error cargando productos:', error);
            throw error;
        }
    }

    groupProducts() {
        this.grouped.clear();
        
        for (const product of this.products) {
            const code = (product.codigo || 'SIN-CODIGO').toString().trim();
            
            if (!this.grouped.has(code)) {
                this.grouped.set(code, {
                    codigo: code,
                    descripcion: product.descripcion || '',
                    searchText: this.normalizeText(`${code} ${product.descripcion || ''}`),
                    variantes: []
                });
            }
            
            this.grouped.get(code).variantes.push({
                unidad: product.unidad || 'UND',
                precio: this.formatPrice(product.precio),
                stock: product.stock || '0',
                precio_unit: this.formatPrice(product.precio_unit)
            });
        }
        
        console.log(`📦 Productos agrupados: ${this.grouped.size} grupos`);
    }

    setupSearch() {
        const input = document.getElementById('searchInput');
        const clear = document.getElementById('clearSearch');
        
        if (!input || !clear) {
            console.error('❌ No se encontraron elementos de búsqueda');
            return;
        }
        
        let timeout;
        input.addEventListener('input', (e) => {
            const term = e.target.value.trim();
            
            this.toggleClearButton(term.length > 0);
            
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (term === '') {
                    this.showHomePanel();
                } else {
                    this.performSearch(term, false);
                }
            }, 150);
        });

        clear.addEventListener('click', () => {
            input.value = '';
            this.showHomePanel();
            input.focus();
            this.toggleClearButton(false);
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(timeout);
                const term = input.value.trim();
                if (term === '') {
                    this.showHomePanel();
                } else {
                    this.performSearch(term, true);
                }
            }
        });

        this.toggleClearButton(false);
        setTimeout(() => input.focus(), 200);
    }

    performSearch(term, saveToRecent = false) {
        console.log(`🔍 Ejecutando búsqueda: "${term}", guardar: ${saveToRecent}`);
        
        this.lastSearchTerm = term;
        
        if (saveToRecent) {
            this.addRecentSearch(term);
        }
        
        this.search(term);
    }

    search(term) {
        const startTime = performance.now();
        
        this.currentState = 'search';
        this.hideHomePanel();

        if (!term) {
            this.showHomePanel();
            return;
        }

        if (this.cache.has(term)) {
            console.log(`⚡ Usando cache para: "${term}"`);
            this.displayResults(this.cache.get(term), term);
            return;
        }

        const results = new Map();

        // BÚSQUEDA EXACTA - Usa el algoritmo mejorado
        for (const [code, product] of this.grouped) {
            if (this.searchProducts(product.searchText, term)) {
                results.set(code, product);
            }
        }

        this.cache.set(term, results);
        this.displayResults(results, term);
        
        const searchTime = performance.now() - startTime;
        console.log(`🔍 "${term}": ${results.size} resultados en ${searchTime.toFixed(0)}ms`);
    }

    displayResults(results, term = '') {
        this.hideAllStates();
        
        const container = document.getElementById('resultsContainer');
        const countElement = document.getElementById('resultsCount');
        
        if (!container || !countElement) {
            console.error('❌ No se encontraron elementos de resultados');
            return;
        }
        
        if (term) {
            countElement.textContent = `${results.size} resultado${results.size !== 1 ? 's' : ''} para "${term}"`;
        } else {
            countElement.textContent = `${results.size} producto${results.size !== 1 ? 's' : ''} disponibles`;
        }
        
        if (results.size === 0) {
            this.showNoResults(term);
            return;
        }

        container.style.display = 'grid';
        this.clearContainer(container);

        let rendered = 0;
        const maxResults = 100;
        
        for (const product of results.values()) {
            if (rendered++ >= maxResults) break;
            const card = this.createProductCard(product, term);
            if (card) {
                container.appendChild(card);
            }
        }
        
        console.log(`🎨 Renderizados ${rendered} productos`);
    }

    // ===== GUARDAR AL HACER CLICK EN PRODUCTOS =====
    handleProductClick(clickedProduct, searchTerm) {
        console.log(`🖱️ Click en producto: ${clickedProduct.codigo}`);
        
        this.recordProductSearch(clickedProduct.codigo, searchTerm || this.lastSearchTerm, 'result_click');
        this.updatePopularProductsUI();
        
        if (this.lastSearchTerm && this.lastSearchTerm.trim().length >= 2) {
            console.log(`💾 Guardando búsqueda por click en producto: "${this.lastSearchTerm}"`);
            this.addRecentSearch(this.lastSearchTerm);
        }
    }

    createProductCard(product, term) {
        try {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            card.addEventListener('click', () => {
                this.handleProductClick(product, term);
            });
            
            const description = this.highlightMatches(product.descripcion || '', term);
            const code = this.highlightMatches(product.codigo || '', term);

            let variantsHTML = '';
            if (product.variantes && product.variantes.length > 0) {
                product.variantes.forEach(variant => {
                    variantsHTML += `
                        <div class="variant-item">
                            <span class="variant-unit">${variant.unidad || 'UND'}</span>
                            <span class="variant-price">S/. ${variant.precio || '0.00'}</span>
                            <span class="variant-stock">${variant.stock || '0'} und</span>
                            ${variant.precio_unit && variant.precio_unit !== '0.00' ? 
                                `<span class="variant-unitprice">S/. ${variant.precio_unit}</span>` : ''}
                        </div>
                    `;
                });
            }

            card.innerHTML = `
                <div class="product-header">
                    <div class="product-code">${code}</div>
                    <div class="product-desc">${description}</div>
                </div>
                <div class="variants-list">
                    ${variantsHTML}
                </div>
            `;

            return card;
        } catch (error) {
            console.error('Error creando tarjeta de producto:', error);
            return null;
        }
    }

    // ===== MÉTODOS AUXILIARES =====
    formatPrice(price) {
        if (!price || price === '0' || price === '0.00') return '0.00';
        try {
            const num = parseFloat(price);
            return isNaN(num) ? '0.00' : num.toFixed(2);
        } catch {
            return '0.00';
        }
    }

    toggleClearButton(show) {
        const clearBtn = document.getElementById('clearSearch');
        if (clearBtn) {
            clearBtn.style.display = show ? 'block' : 'none';
        }
    }

    highlightMatches(text, term) {
        if (!term || !text) return text || '';
        
        const words = this.normalizeText(term).split(/\s+/).filter(w => w.length > 0);
        let result = text;
        
        for (const word of words) {
            try {
                const regex = new RegExp(`(${this.escapeRegex(word)})`, 'gi');
                result = result.replace(regex, '<mark class="highlight">$1</mark>');
            } catch (error) {
                console.error('Error en highlight:', error);
            }
        }
        
        return result;
    }

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    updateStats() {
        const countElement = document.getElementById('productCount');
        if (countElement) {
            countElement.textContent = this.grouped.size;
        }
    }

    showNoResults(term) {
        this.currentState = 'noResults';
        this.hideAllStates();
        
        const element = document.getElementById('noResults');
        const textElement = document.getElementById('noResultsText');
        
        if (element) element.style.display = 'flex';
        if (textElement) textElement.textContent = term ? `"${term}"` : '';
        
        const countElement = document.getElementById('resultsCount');
        if (countElement) countElement.textContent = '0 resultados encontrados';
    }

    showError() {
        this.currentState = 'error';
        this.hideAllStates();
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) errorElement.style.display = 'flex';
    }

    hideAllStates() {
        const states = ['loading', 'resultsContainer', 'noResults', 'errorMessage', 'homePanel'];
        states.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
    }

    clearContainer(container) {
        if (container) {
            container.innerHTML = '';
        }
    }
}

let productSearch;

document.addEventListener('DOMContentLoaded', () => {
    try {
        productSearch = new ProductSearch();
    } catch (error) {
        console.error('💥 Error crítico al inicializar:', error);
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) errorElement.style.display = 'flex';
    }
});