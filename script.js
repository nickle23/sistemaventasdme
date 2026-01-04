// ===== LIMPIAR CACHE AL CARGAR =====
(function () {
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

// Buscador Profesional ULTRA INTUITIVO
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

    // ===== NORMALIZACIÓN MEJORADA =====
    normalizeText(text, forSearch = false) {
        if (!text && text !== 0 && text !== '') return '';

        // Convertir a string
        let str = String(text);

        // Actualizar contador inicial en el header
        const headerCount = document.getElementById('productCount');
        if (headerCount && this.grouped) {
            headerCount.textContent = `Total de Productos: ${this.grouped.size}`;
        }

        // Minúsculas y quitar acentos
        str = str.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        // Quitar SOLO espacios en blanco, mantener TODO lo demás (símbolos, números, letras)
        str = str.replace(/\s+/g, '');

        return str;
    }

    // ===== BUSCADOR POR PALABRAS COMPLETAS =====
    searchProducts(text, searchTerm) {
        if (!searchTerm || !text) return false;

        // Normalizar texto del producto
        const normalizedText = this.normalizeText(text);

        // Separar término en PALABRAS COMPLETAS
        const searchWords = searchTerm.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .split(/\s+/)  // Separar por espacios
            .filter(word => word.length >= 1);

        if (searchWords.length === 0) return false;

        // Verificar que TODAS las palabras estén presentes
        for (const word of searchWords) {
            // Buscar la palabra como SUBSTRING (no solo caracteres sueltos)
            if (!normalizedText.includes(word)) {
                return false; // Si falta UNA palabra, no mostrar
            }
        }

        return true; // TODAS las palabras están presentes
    }

    // ===== CÁLCULO DE RELEVANCIA OPTIMIZADO =====
    calculateRelevanceScore(product, searchTerm) {
        const normalizedSearch = this.normalizeText(searchTerm);
        const normalizedCode = this.normalizeText(product.codigo);
        const normalizedDesc = this.normalizeText(product.descripcion || '');

        let score = 0;

        // 1. COINCIDENCIA EXACTA EN EL CÓDIGO
        if (normalizedCode === normalizedSearch) {
            score += 200;
        }

        // 2. EL CÓDIGO EMPIEZA CON LA BÚSQUEDA
        if (normalizedCode.startsWith(normalizedSearch)) {
            score += 150;
        }

        // 3. LA BÚSQUEDA ESTÁ EN EL CÓDIGO (como substring)
        if (normalizedCode.includes(normalizedSearch)) {
            score += 120;
        }

        // 4. LA BÚSQUEDA ESTÁ EN LA DESCRIPCIÓN
        if (normalizedDesc.includes(normalizedSearch)) {
            score += 80;
        }

        // 5. COINCIDENCIA DE TODOS LOS CARACTERES EN EL CÓDIGO
        const allCharsInCode = normalizedSearch.split('').every(char =>
            normalizedCode.includes(char)
        );
        if (allCharsInCode) {
            score += 70;
        }

        // 6. COINCIDENCIA DE TODOS LOS CARACTERES EN LA DESCRIPCIÓN
        const allCharsInDesc = normalizedSearch.split('').every(char =>
            normalizedDesc.includes(char)
        );
        if (allCharsInDesc) {
            score += 60;
        }

        // 7. BONO POR PRODUCTOS POPULARES
        const stats = this.searchStats[product.codigo];
        if (stats && stats.count) {
            score += Math.min(stats.count * 2, 30);
        }

        // 8. BONO POR BÚSQUEDAS RECIENTES
        if (stats && stats.lastSearched) {
            const daysAgo = (Date.now() - stats.lastSearched) / (1000 * 60 * 60 * 24);
            if (daysAgo < 7) {
                score += 20;
            }
        }

        // 9. BONO ESPECIAL PARA NÚMEROS
        const searchNumbers = normalizedSearch.split('').filter(ch => /\d/.test(ch));
        if (searchNumbers.length > 0) {
            let numberBonus = 0;
            for (const numChar of searchNumbers) {
                if (normalizedCode.includes(numChar)) numberBonus += 15;
                if (normalizedDesc.includes(numChar)) numberBonus += 10;
            }
            score += numberBonus;
        }

        // 10. BONO POR COINCIDENCIA DE 3+ LETRAS CONSECUTIVAS
        if (normalizedSearch.length >= 3) {
            for (let i = 0; i <= normalizedSearch.length - 3; i++) {
                const threeLetters = normalizedSearch.substring(i, i + 3);
                if (normalizedCode.includes(threeLetters)) {
                    score += 40;
                }
                if (normalizedDesc.includes(threeLetters)) {
                    score += 20;
                }
            }
        }

        return score;
    }

    // ===== SISTEMA DE ESTADÍSTICAS =====
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

    // ===== BÚSQUEDAS RECIENTES =====
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
        if (!text && text !== 0) return '';
        const div = document.createElement('div');
        div.textContent = text.toString();
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

        // Actualizar contador del header
        const headerCount = document.getElementById('productCount');
        if (headerCount) {
            headerCount.textContent = `Total de Productos: ${this.grouped.size}`;
        }

        if (homePanel) homePanel.style.display = 'block';
        if (countElement) countElement.textContent = `${this.grouped.size} productos disponibles`;

        this.updateRecentSearchesUI();
        this.updatePopularProductsUI();
    }

    hideHomePanel() {
        const homePanel = document.getElementById('homePanel');
        if (homePanel) homePanel.style.display = 'none';
    }

    // ===== CARGA DE PRODUCTOS =====
    // ===== CARGA DE PRODUCTOS =====
    async loadProducts() {
        const startTime = performance.now();

        try {
            // 1. Cargar archivo (ahora viene encriptado como texto plano)
            const response = await fetch('./productos.json?v=' + Date.now()); // No caché
            if (!response.ok) throw new Error('Error HTTP');

            const encryptedData = await response.text();

            // 2. Desencriptar
            try {
                // La clave debe coincidir exactamente con la de Python (32 chars)
                const SECRET_KEY = "MundoEscolar$2025_Seguro"; // Clave pública en código (ofuscable)
                const key = CryptoJS.enc.Utf8.parse(SECRET_KEY.padEnd(32, '\0'));

                const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
                    mode: CryptoJS.mode.ECB,
                    padding: CryptoJS.pad.Pkcs7
                });

                const jsonString = decrypted.toString(CryptoJS.enc.Utf8);

                if (!jsonString) throw new Error("Fallo de desencriptación (clave incorrecta o archivo dañado)");

                const data = JSON.parse(jsonString);

                // Soporte RETROCOMPATIBLE (Arrays antiguos vs Objeto nuevo)
                if (Array.isArray(data)) {
                    this.products = data;
                } else if (data.products && Array.isArray(data.products)) {
                    this.products = data.products;
                    if (data.metadata && data.metadata.last_updated) {
                        this.showUpdateDate(data.metadata.last_updated);
                    }
                } else {
                    throw new Error("Formato de datos no reconocido");
                }

            } catch (cryptoError) {
                console.error("🔐 Error de seguridad:", cryptoError);
                throw new Error("No se pudo desencriptar la base de datos.");
            }

            const loadTime = performance.now() - startTime;
            console.log(`✅ ${this.products.length} productos cargados y desencriptados en ${loadTime.toFixed(0)}ms`);

        } catch (error) {
            console.error('❌ Error cargando productos:', error);
            throw error;
        }
    }

    // ===== MOSTRAR FECHA DE ACTUALIZACIÓN =====
    showUpdateDate(isoDateString) {
        try {
            const date = new Date(isoDateString);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            // Formato: "3 de enero de 2026"
            const formattedDate = date.toLocaleDateString('es-ES', options);

            // Capitalizar primera letra del mes si es necesario (opcional)
            // const finalDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

            const container = document.getElementById('updateContainer');
            const textElement = document.getElementById('lastUpdateText');

            if (container && textElement) {
                textElement.textContent = `Actualizado: ${formattedDate}`;
                container.style.display = 'block';
            }
        } catch (e) {
            console.error('Error parseando fecha:', e);
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
                    searchText: (code + (product.descripcion || '')).toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/\s+/g, ''),
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

    // ===== CONFIGURACIÓN DE BÚSQUEDA =====
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

        // Limitar términos muy largos
        if (term.length > 100) {
            term = term.substring(0, 100);
        }

        if (this.cache.has(term)) {
            console.log(`⚡ Usando cache para: "${term}"`);
            this.displayResults(this.cache.get(term), term);
            return;
        }

        const results = new Map();
        const scoredResults = [];

        // BUSCAR PRODUCTOS
        for (const [code, product] of this.grouped) {
            if (this.searchProducts(product.searchText, term)) {
                const score = this.calculateRelevanceScore(product, term);
                scoredResults.push({
                    product,
                    score,
                    code
                });
            }
        }

        // ORDENAR POR RELEVANCIA
        scoredResults.sort((a, b) => b.score - a.score);

        // AGREGAR AL MAPA ORDENADO
        for (const item of scoredResults) {
            results.set(item.code, item.product);
        }

        this.cache.set(term, results);
        this.displayResults(results, term);

        const searchTime = performance.now() - startTime;
        console.log(`🔍 "${term}": ${results.size} resultados en ${searchTime.toFixed(0)}ms`);

        // DEBUG: Mostrar top 3
        if (scoredResults.length > 0) {
            console.log('🏆 Top 3 resultados:');
            scoredResults.slice(0, 3).forEach((item, i) => {
                console.log(`${i + 1}. ${item.code} - Puntaje: ${item.score}`);
            });
        }
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

    // ===== CLICK EN PRODUCTOS =====
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

            const description = this.safeHighlightMatches(product.descripcion || '', term);
            const code = this.safeHighlightMatches(product.codigo || '', term);

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

    // ===== MÉTODOS AUXILIARES SEGUROS =====
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

    escapeRegex(text) {
        if (!text) return '';
        return text.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ===== HIGHLIGHT POR PALABRAS COMPLETAS =====
    safeHighlightMatches(text, term) {
        if (!text) return '';
        if (!term || term.trim().length === 0) return this.escapeHTML(text);

        const escapedText = this.escapeHTML(text);

        // Crear versión NORMALIZADA para búsqueda exacta
        const plainText = escapedText.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        // Separar término en PALABRAS
        const searchWords = term.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .split(/\s+/)
            .filter(word => word.length >= 1);

        if (searchWords.length === 0) return escapedText;

        const chars = escapedText.split('');
        const highlightMap = new Array(chars.length).fill(false);

        // Para CADA palabra de búsqueda
        for (const searchWord of searchWords) {
            if (searchWord.length === 0) continue;

            // Buscar TODAS las ocurrencias de esta palabra
            let startPos = 0;

            while (true) {
                // Buscar la palabra en el texto normalizado
                const foundPos = plainText.indexOf(searchWord, startPos);
                if (foundPos === -1) break;

                // Marcar TODOS los caracteres de esta palabra
                for (let i = 0; i < searchWord.length; i++) {
                    const actualPos = foundPos + i;
                    if (actualPos < highlightMap.length) {
                        highlightMap[actualPos] = true;
                    }
                }

                // Continuar buscando después de esta ocurrencia
                startPos = foundPos + 1;
            }
        }

        // Reconstruir el resultado con highlights
        let result = '';
        let i = 0;

        while (i < chars.length) {
            if (highlightMap[i]) {
                let segment = '';
                while (i < chars.length && highlightMap[i]) {
                    segment += chars[i];
                    i++;
                }
                result += `<mark class="highlight">${segment}</mark>`;
            } else {
                result += chars[i];
                i++;
            }
        }

        return result;
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

// ===== INICIALIZACIÓN CON COBERTURA TOTAL =====
document.addEventListener('DOMContentLoaded', () => {
    // 1. Remover clase no-js (para navegadores con JS)
    document.documentElement.classList.remove('no-js');

    // 2. Fallback de seguridad: si CSS no cargó en 2 segundos, forzar
    const cssFallbackTimer = setTimeout(() => {
        const appElement = document.querySelector('.app');
        if (appElement && !appElement.classList.contains('css-loaded')) {
            console.log('⏱️  Fallback CSS: Forzando visibilidad después de timeout');
            appElement.classList.add('css-loaded');
        }
    }, 2000);

    // 3. Inicializar buscador
    try {
        productSearch = new ProductSearch();

        // 4. Cuando el buscador termine de inicializar
        // Sobreescribimos el método init para capturar cuando termina
        const originalInit = productSearch.init;
        productSearch.init = async function () {
            try {
                await originalInit.call(this);

                // 5. Asegurar que CSS está cargado
                const appElement = document.querySelector('.app');
                if (appElement && !appElement.classList.contains('css-loaded')) {
                    appElement.classList.add('css-loaded');
                }

                // 6. Limpiar timer de fallback
                clearTimeout(cssFallbackTimer);

                console.log('✅ Sistema inicializado con cobertura total contra flash');
            } catch (error) {
                // 7. En caso de error, igual mostrar la app
                const appElement = document.querySelector('.app');
                if (appElement) {
                    appElement.classList.add('css-loaded');
                }
                clearTimeout(cssFallbackTimer);
                throw error;
            }
        };

        // Iniciar
        productSearch.init();

    } catch (error) {
        console.error('💥 Error crítico al inicializar:', error);

        // 8. Aún con error, mostrar la app
        const appElement = document.querySelector('.app');
        if (appElement) {
            appElement.classList.add('css-loaded');
        }
        clearTimeout(cssFallbackTimer);

        const errorElement = document.getElementById('errorMessage');
        if (errorElement) errorElement.style.display = 'flex';
    }
});

// 9. Fallback adicional: si window.load se dispara y aún no se mostró
window.addEventListener('load', () => {
    setTimeout(() => {
        const appElement = document.querySelector('.app');
        if (appElement && !appElement.classList.contains('css-loaded')) {
            console.log('🌅 Fallback window.load: Mostrando app');
            appElement.classList.add('css-loaded');
        }
    }, 100);
});