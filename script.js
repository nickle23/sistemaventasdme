// ===== AUTO-VERSIONADO COMPLETO - EVITA CACHE EN TODO =====
(function() {
    'use strict';
    
    const timestamp = Date.now();
    
    // Versionar TODOS los archivos CSS locales
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.includes('://') && !href.includes('?')) {
            link.setAttribute('href', href + '?v=' + timestamp);
        }
    });
    
    // Versionar TODOS los archivos JS locales (con precaución)
    document.querySelectorAll('script[src]').forEach(script => {
        const src = script.getAttribute('src');
        if (src && !src.includes('://') && !src.includes('?') && 
            !src.includes('cdnjs.cloudflare.com')) { // Excluir CDNs
            script.setAttribute('src', src + '?v=' + timestamp);
        }
    });
})();

class BuscadorExpress {
    constructor() {
        this.productos = [];
        this.productosAgrupados = new Map();
        this.cacheBusquedas = new Map();
        this.init();
    }

    async init() {
        await this.cargarProductosOptimizado();
        this.agruparProductos();
        this.inicializarBuscador();
        this.mostrarEstadisticas();
        this.mostrarTodosProductos();
    }

    async cargarProductosOptimizado() {
        try {
            const inicio = performance.now();
            const respuesta = await fetch('./productos.json');
            this.productos = await respuesta.json();
            const fin = performance.now();
            console.log(`⚡ Productos cargados en ${(fin - inicio).toFixed(2)}ms`);
        } catch (error) {
            this.mostrarError('Error cargando productos');
        }
    }

    agruparProductos() {
        const inicio = performance.now();
        
        for (const producto of this.productos) {
            const codigo = producto.codigo?.trim() || 'SIN-CODIGO';
            
            if (!this.productosAgrupados.has(codigo)) {
                this.productosAgrupados.set(codigo, {
                    codigo: codigo,
                    descripcion: producto.descripcion || '',
                    textoBusqueda: this.prepararTextoBusqueda(codigo, producto.descripcion),
                    variantes: []
                });
            }
            
            this.productosAgrupados.get(codigo).variantes.push({
                unidad: producto.unidad || 'UND',
                precio: producto.precio || '0',
                stock: producto.stock || '0',
                precio_unit: producto.precio_unit || '0'
            });
        }
        
        const fin = performance.now();
        console.log(`⚡ Productos agrupados en ${(fin - inicio).toFixed(2)}ms`);
    }

    prepararTextoBusqueda(codigo, descripcion) {
        return `${codigo} ${descripcion}`
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    inicializarBuscador() {
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearch');
        
        // Debounce para búsqueda en tiempo real
        let timeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.buscarSuperRapido(e.target.value.trim());
            }, 50); // Solo 50ms de delay
        });

        // Clear search
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.buscarSuperRapido('');
            searchInput.focus();
        });

        searchInput.focus();
    }

    buscarSuperRapido(terminoBusqueda) {
        const inicio = performance.now();
        
        if (!terminoBusqueda) {
            this.mostrarTodosProductos();
            return;
        }

        // Verificar cache primero
        if (this.cacheBusquedas.has(terminoBusqueda)) {
            this.mostrarResultados(this.cacheBusquedas.get(terminoBusqueda), terminoBusqueda);
            return;
        }

        const palabras = this.obtenerPalabrasBusqueda(terminoBusqueda);
        const resultados = new Map();

        // Búsqueda optimizada
        for (const [codigo, producto] of this.productosAgrupados) {
            if (this.coincideTodasLasPalabras(producto.textoBusqueda, palabras)) {
                resultados.set(codigo, producto);
            }
        }

        // Guardar en cache
        this.cacheBusquedas.set(terminoBusqueda, resultados);
        
        this.mostrarResultados(resultados, terminoBusqueda);
        
        const fin = performance.now();
        console.log(`⚡ Búsqueda completada en ${(fin - inicio).toFixed(2)}ms`);
    }

    obtenerPalabrasBusqueda(termino) {
        return termino
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .split(/\s+/)
            .filter(p => p.length > 1);
    }

    coincideTodasLasPalabras(texto, palabras) {
        for (const palabra of palabras) {
            if (!texto.includes(palabra)) return false;
        }
        return true;
    }

    mostrarResultados(resultados, terminoBusqueda = '') {
        const contenedor = document.getElementById('resultsContainer');
        const contador = document.getElementById('resultsCount');
        const loading = document.getElementById('loading');
        const noResults = document.getElementById('noResults');
        
        // Ocultar estados
        loading.style.display = 'none';
        noResults.style.display = 'none';
        contenedor.style.display = 'grid';
        
        // Limpiar contenedor rápido
        contenedor.textContent = '';
        
        // Actualizar contador
        contador.textContent = `${resultados.size} productos`;
        
        if (resultados.size === 0) {
            this.mostrarNoResultados(terminoBusqueda);
            return;
        }

        // Renderizar resultados (máximo 100 para performance)
        let contadorRender = 0;
        for (const producto of resultados.values()) {
            if (contadorRender++ >= 100) break;
            contenedor.appendChild(this.crearTarjetaProducto(producto, terminoBusqueda));
        }
    }

    crearTarjetaProducto(producto, terminoBusqueda) {
        const div = document.createElement('div');
        div.className = 'product-card will-change';
        
        const descripcion = this.resaltarTexto(producto.descripcion, terminoBusqueda);
        const codigo = this.resaltarTexto(producto.codigo, terminoBusqueda);

        let variantesHTML = '';
        for (let i = 0; i < producto.variantes.length; i++) {
            const v = producto.variantes[i];
            variantesHTML += `
                <div class="variante ${i === 0 ? 'variante-principal' : ''}">
                    <span class="unidad"><i class="fas fa-tag"></i>${v.unidad}</span>
                    <span class="precio"><i class="fas fa-money-bill-wave"></i>S/. ${v.precio}</span>
                    <span class="stock"><i class="fas fa-boxes"></i>${v.stock}</span>
                    ${v.precio_unit && v.precio_unit !== '0' ? 
                        `<span class="precio-unit"><i class="fas fa-receipt"></i>S/. ${v.precio_unit}</span>` : ''}
                </div>
            `;
        }

        div.innerHTML = `
            <div class="product-header">
                <div class="product-code"><i class="fas fa-barcode"></i>${codigo}</div>
                <div class="product-description">${descripcion}</div>
            </div>
            <div class="variantes-container">
                ${variantesHTML}
            </div>
        `;

        return div;
    }

    resaltarTexto(texto, terminoBusqueda) {
        if (!terminoBusqueda || !texto) return texto;
        
        const palabras = this.obtenerPalabrasBusqueda(terminoBusqueda);
        let resultado = texto;
        
        for (const palabra of palabras) {
            const regex = new RegExp(`(${palabra})`, 'gi');
            resultado = resultado.replace(regex, '<mark class="texto-resaltado">$1</mark>');
        }
        
        return resultado;
    }

    mostrarTodosProductos() {
        // Mostrar solo primeros 50 productos para performance
        const resultadosLimitados = new Map(
            Array.from(this.productosAgrupados.entries()).slice(0, 50)
        );
        this.mostrarResultados(resultadosLimitados);
    }

    mostrarEstadisticas() {
        document.getElementById('productCount').textContent = 
            `${this.productosAgrupados.size} productos`;
    }

    mostrarNoResultados(termino) {
        const contenedor = document.getElementById('resultsContainer');
        const noResults = document.getElementById('noResults');
        const noResultsText = document.getElementById('noResultsText');
        const suggestions = document.getElementById('suggestionsContainer');
        
        contenedor.style.display = 'none';
        noResults.style.display = 'block';
        noResultsText.textContent = `No hay productos con "${termino}"`;
        
        // Limpiar sugerencias anteriores
        suggestions.textContent = '';
    }

    mostrarError(mensaje) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'block';
    }
}

// Inicialización ultra rápida
document.addEventListener('DOMContentLoaded', () => {
    new BuscadorExpress();
});