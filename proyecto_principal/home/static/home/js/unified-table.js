// Sistema de tablas unificado
// Maneja búsqueda, ordenamiento y paginación del lado del servidor

function sortTable(columnName) {
    const url = new URL(window.location.href);
    const currentSort = url.searchParams.get('sort');
    const currentOrder = url.searchParams.get('order') || 'asc';
    
    // Si es la misma columna, cambiar el orden
    if (currentSort === columnName) {
        url.searchParams.set('order', currentOrder === 'asc' ? 'desc' : 'asc');
    } else {
        url.searchParams.set('sort', columnName);
        url.searchParams.set('order', 'asc');
    }
    
    // Resetear a página 1 al ordenar
    url.searchParams.set('page', '1');
    
    // Actualizar tabla mediante AJAX
    if (typeof updateTableContent === 'function') {
        try {
            updateTableContent(url.toString());
        } catch (error) {
            // Fallback: recargar la página
            window.location.href = url.toString();
        }
    } else {
        // Fallback: recargar la página
        window.location.href = url.toString();
    }
}

// Variable global para el handler de clics en encabezados
let headerClickHandler = null;

// Función para inicializar eventos de la tabla después de actualización AJAX
function initializeTableEvents() {
    // Remover handler anterior si existe
    if (headerClickHandler) {
        document.removeEventListener('click', headerClickHandler, true);
    }
    
    // Crear nuevo handler con captura (true) para interceptar antes que otros eventos
    headerClickHandler = function(e) {
        // Verificar si el clic fue en un encabezado ordenable o en sus hijos
        let target = e.target;
        let th = null;
        
        // Buscar el th.sortable más cercano
        while (target && target !== document.body) {
            if (target.tagName === 'TH' && target.classList.contains('sortable')) {
                th = target;
                break;
            }
            target = target.parentElement;
        }
        
        if (th) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const sortField = th.getAttribute('data-sort');
            if (sortField) {
                sortTable(sortField);
            }
            return false;
        }
    };
    
    // Agregar listener con captura para que se ejecute antes que otros eventos
    document.addEventListener('click', headerClickHandler, true);
    
    // También agregar listeners directos en los encabezados como respaldo
    document.querySelectorAll('.unified-table thead th.sortable').forEach(th => {
        // Remover listeners anteriores
        const newTh = th.cloneNode(true);
        th.parentNode.replaceChild(newTh, th);
        
        // Agregar nuevo listener directo
        newTh.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const sortField = this.getAttribute('data-sort');
            if (sortField) {
                sortTable(sortField);
            }
            return false;
        }, true); // Usar captura también aquí
    });
}

// Manejar búsqueda con debounce
let searchTimeout;
const searchInputsInitialized = new WeakSet();
const formsInitialized = new WeakSet();

function initializeSearchInputs() {
    const searchInputs = document.querySelectorAll('input[name="search"]');
    
    if (searchInputs.length === 0) {
        return; // No hay inputs para inicializar
    }
    
    searchInputs.forEach(input => {
        // Si el input ya está inicializado, no hacer nada
        if (searchInputsInitialized.has(input)) {
            return;
        }
        
        // Marcar como inicializado ANTES de agregar listeners
        searchInputsInitialized.add(input);
        
        // Prevenir submit del formulario cuando se presiona Enter
        const form = input.closest('form');
        if (form && !formsInitialized.has(form)) {
            const submitHandler = function(e) {
                e.preventDefault();
                e.stopPropagation();
                const searchInput = form.querySelector('input[name="search"]');
                if (searchInput) {
                    performSearch(searchInput);
                }
                return false;
            };
            form.addEventListener('submit', submitHandler, { capture: true });
            formsInitialized.add(form);
        }
        
        // Permitir búsqueda al presionar Enter
        const keypressHandler = function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                performSearch(this);
                return false;
            }
        };
        input.addEventListener('keypress', keypressHandler, { capture: true });
        
        // Búsqueda automática mientras escribe (con debounce de 500ms)
        // Usar capture para asegurar que se ejecute antes que otros listeners
        const inputHandler = function(e) {
            e.stopPropagation();
            clearTimeout(searchTimeout);
            const inputValue = this.value;
            searchTimeout = setTimeout(() => {
                performSearch(this);
            }, 500);
        };
        input.addEventListener('input', inputHandler, { capture: true });
        
        // También agregar como listener normal (sin capture) como respaldo
        input.addEventListener('input', inputHandler);
    });
}

function performSearch(input) {
    const form = input.closest('form');
    const url = new URL(window.location.href);
    
    // Guardar estado del input antes de actualizar
    const searchValue = input.value;
    const cursorPosition = input.selectionStart;
    const hasFocus = (document.activeElement === input);
    
    // Actualizar parámetro de búsqueda
    url.searchParams.set('search', searchValue);
    url.searchParams.set('page', '1'); // Resetear a página 1
    
    // Preservar otros parámetros del formulario
    if (form) {
        const formData = new FormData(form);
        formData.forEach((value, key) => {
            if (key !== 'search' && key !== 'page') {
                url.searchParams.set(key, value);
            }
        });
    }
    
    // Actualizar tabla mediante AJAX preservando el foco
    updateTableContent(url.toString(), searchValue, cursorPosition, hasFocus);
}

// Función para inicializar todo
function initializeUnifiedTable() {
    // Inicializar eventos al cargar la página
    initializeTableEvents();
    initializeSearchInputs();
    
    // Asegurar que los eventos se inicialicen después de un pequeño delay
    setTimeout(function() {
        initializeTableEvents();
    }, 100);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUnifiedTable);
} else {
    // DOM ya está listo, inicializar inmediatamente
    initializeUnifiedTable();
}

// También inicializar después de un pequeño delay para asegurar que otros scripts hayan terminado
setTimeout(function() {
    initializeSearchInputs();
}, 500);

// Inicializar cuando la ventana esté completamente cargada
window.addEventListener('load', function() {
    setTimeout(function() {
        initializeSearchInputs();
    }, 500);
});

document.addEventListener('DOMContentLoaded', function() {
    // Re-inicializar después de que otros scripts hayan terminado
    setTimeout(function() {
        initializeSearchInputs();
    }, 1000);
    
    // Re-inicializar después de más tiempo para asegurar que todo esté listo
    setTimeout(function() {
        initializeSearchInputs();
    }, 2000);
    
    // Manejar cambio de elementos por página con AJAX
    document.addEventListener('change', function(e) {
        if (e.target.matches('select[name="per_page"]')) {
            e.preventDefault();
            const select = e.target;
            const form = select.closest('form');
            const url = new URL(window.location.href);
            
            // Actualizar parámetro per_page
            url.searchParams.set('per_page', select.value);
            url.searchParams.set('page', '1'); // Resetear a página 1
            
            // Preservar otros parámetros del formulario
            if (form) {
                const formData = new FormData(form);
                formData.forEach((value, key) => {
                    if (key !== 'per_page' && key !== 'page') {
                        url.searchParams.set(key, value);
                    }
                });
            }
            
            // Actualizar tabla mediante AJAX
            updateTableContent(url.toString());
        }
    });
    
    // Manejar clicks en enlaces de paginación con AJAX
    document.addEventListener('click', function(e) {
        const pageLink = e.target.closest('.pagination .page-link');
        if (pageLink && pageLink.href && !pageLink.closest('.disabled')) {
            e.preventDefault();
            const url = pageLink.href;
            updateTableContent(url);
        }
    });
});

// Función para actualizar contenido de la tabla mediante AJAX
function updateTableContent(url, searchValue = null, cursorPosition = null, restoreFocus = false) {
    // Guardar estado del input de búsqueda si existe y tiene foco
    const searchInput = document.querySelector('input[name="search"]');
    let savedSearchValue = searchValue;
    let savedCursorPosition = cursorPosition;
    let shouldRestoreFocus = restoreFocus;
    
    if (searchInput && !savedSearchValue) {
        savedSearchValue = searchInput.value;
        savedCursorPosition = searchInput.selectionStart;
        shouldRestoreFocus = (document.activeElement === searchInput);
    }
    
    fetch(url, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }
        return response.text();
    })
    .then(html => {
        // Encontrar el contenedor de la tabla
        let tableWrapper = document.getElementById('table-wrapper') || document.querySelector('.unified-table-wrapper');
        
        // Si no existe el contenedor, buscar el div con el mensaje "No hay categorías"
        if (!tableWrapper) {
            // Buscar el div que contiene el mensaje de "No hay categorías registradas" o similar
            const noDataCard = document.querySelector('.card.shadow-lg.border-0 .alert-info');
            if (noDataCard) {
                // Encontrar el contenedor padre (el card)
                const cardContainer = noDataCard.closest('.card.shadow-lg.border-0');
                if (cardContainer && cardContainer.parentNode) {
                    // Crear el contenedor de la tabla
                    tableWrapper = document.createElement('div');
                    tableWrapper.className = 'unified-table-wrapper';
                    tableWrapper.id = 'table-wrapper';
                    // Reemplazar el card con el nuevo contenedor
                    cardContainer.parentNode.replaceChild(tableWrapper, cardContainer);
                }
            }
        }
        
        if (tableWrapper) {
            // Guardar posición de scroll antes de actualizar
            const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
            const tableScrollPosition = tableWrapper.scrollTop;
            
            // Guardar altura y posición exacta del contenedor (solo si tiene altura)
            const containerHeight = tableWrapper.offsetHeight || 0;
            const containerRect = tableWrapper.getBoundingClientRect();
            const containerTop = containerRect.top;
            const containerLeft = containerRect.left;
            const containerWidth = containerRect.width;
            
            // Guardar estilos originales del contenedor
            const originalStyle = {
                position: tableWrapper.style.position,
                top: tableWrapper.style.top,
                left: tableWrapper.style.left,
                width: tableWrapper.style.width,
                minHeight: tableWrapper.style.minHeight,
                marginBottom: tableWrapper.style.marginBottom,
                transform: tableWrapper.style.transform
            };
            
            // Fijar altura del contenedor para prevenir layout shift (solo si tiene altura)
            if (containerHeight > 0) {
                tableWrapper.style.minHeight = containerHeight + 'px';
            }
            
            // Actualizar contenido directamente
            tableWrapper.innerHTML = html;
            
            // Restaurar scroll inmediatamente
            window.scrollTo(0, scrollPosition);
            if (tableWrapper.scrollTop !== undefined) {
                tableWrapper.scrollTop = tableScrollPosition;
            }
            
            // Forzar reflow para asegurar que el contenido se renderice
            void tableWrapper.offsetHeight;
            
            // Restaurar scroll nuevamente después del reflow
            window.scrollTo(0, scrollPosition);
            if (tableWrapper.scrollTop !== undefined) {
                tableWrapper.scrollTop = tableScrollPosition;
            }
            
            // Remover minHeight después del renderizado (solo si se estableció)
            if (containerHeight > 0) {
                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPosition);
                    setTimeout(() => {
                        tableWrapper.style.minHeight = '';
                        // Verificación final de scroll
                        window.scrollTo(0, scrollPosition);
                    }, 0);
                });
            }
            
            // Actualizar la URL sin recargar
            window.history.pushState({}, '', url);
            
            // Re-inicializar event listeners
            initializeTableEvents();
            
            // Limpiar el WeakSet de inputs inicializados para permitir re-inicialización
            // Esto es necesario porque el contenido se reemplaza completamente
            const newSearchInputs = document.querySelectorAll('input[name="search"]');
            newSearchInputs.forEach(input => {
                searchInputsInitialized.delete(input);
            });
            
            // Forzar re-inicialización de inputs de búsqueda después de un pequeño delay
            // para asegurar que el DOM esté completamente actualizado
            setTimeout(() => {
                initializeSearchInputs();
            }, 100);
            
            // Actualizar badge de filtros si existe la función
            if (typeof updateFilterBadge === 'function') {
                updateFilterBadge();
            }
            
            // Restaurar estado del input de búsqueda
            if (savedSearchValue !== null) {
                setTimeout(() => {
                    const newSearchInput = document.querySelector('input[name="search"]');
                    if (newSearchInput) {
                        newSearchInput.value = savedSearchValue;
                        if (savedCursorPosition !== null) {
                            newSearchInput.setSelectionRange(savedCursorPosition, savedCursorPosition);
                        }
                        if (shouldRestoreFocus) {
                            // Restaurar foco de manera robusta
                            requestAnimationFrame(() => {
                                setTimeout(() => {
                                    newSearchInput.focus();
                                    if (savedCursorPosition !== null) {
                                        newSearchInput.setSelectionRange(savedCursorPosition, savedCursorPosition);
                                    }
                                }, 0);
                            });
                        }
                    }
                }, 150);
            }
            
            // Remover minHeight después de que el contenido se haya renderizado
            requestAnimationFrame(() => {
                setTimeout(() => {
                    tableWrapper.style.minHeight = '';
                }, 100);
            });
        } else {
            // Si no encuentra el contenedor, recargar la página
            window.location.href = url;
        }
    })
    .catch(error => {
        console.error('Error al actualizar tabla:', error);
        // Fallback: recargar la página si falla AJAX
        window.location.href = url;
    });
}


// Función para actualizar tabla después de operaciones AJAX
function refreshTable(tableId) {
    const url = new URL(window.location.href);
    
    // Guardar estado del input de búsqueda si existe y tiene foco
    const searchInput = document.querySelector('input[name="search"]');
    let savedSearchValue = null;
    let savedCursorPosition = null;
    let shouldRestoreFocus = false;
    
    if (searchInput) {
        savedSearchValue = searchInput.value;
        savedCursorPosition = searchInput.selectionStart;
        shouldRestoreFocus = (document.activeElement === searchInput);
    }
    
    // Hacer petición AJAX para actualizar solo la tabla
    fetch(url.toString(), {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        }
    })
    .then(response => response.text())
    .then(html => {
        const tableWrapper = document.querySelector('.unified-table-wrapper') || document.getElementById('table-wrapper');
        if (tableWrapper) {
            // Guardar posición de scroll antes de actualizar
            const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
            const tableScrollPosition = tableWrapper.scrollTop;
            
            // Guardar altura del contenedor para evitar layout shift
            const containerHeight = tableWrapper.offsetHeight;
            
            // Usar requestAnimationFrame para hacer la actualización más suave
            requestAnimationFrame(() => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newContent = doc.querySelector('.unified-table-wrapper') || doc.getElementById('table-wrapper') || doc.body;
                tableWrapper.innerHTML = newContent.innerHTML;
                
                // Restaurar altura del contenedor inmediatamente para evitar movimiento
                if (containerHeight > 0) {
                    tableWrapper.style.minHeight = containerHeight + 'px';
                }
                
                // Restaurar posición de scroll inmediatamente
                window.scrollTo(0, scrollPosition);
                if (tableWrapper.scrollTop !== undefined) {
                    tableWrapper.scrollTop = tableScrollPosition;
                }
                
                initializeTableEvents();
                
                // Remover minHeight después de que el contenido se haya renderizado
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        tableWrapper.style.minHeight = '';
                    }, 100);
                });
            });
            
            // Limpiar el WeakSet de inputs inicializados para permitir re-inicialización
            const newSearchInputs = document.querySelectorAll('input[name="search"]');
            newSearchInputs.forEach(input => {
                searchInputsInitialized.delete(input);
            });
            
            // Forzar re-inicialización de inputs de búsqueda después de un pequeño delay
            setTimeout(() => {
            initializeSearchInputs();
            }, 100);
            
            // Actualizar badge de filtros si existe la función
            if (typeof updateFilterBadge === 'function') {
                updateFilterBadge();
            }
            
            // Restaurar estado del input de búsqueda
            if (savedSearchValue !== null) {
                setTimeout(() => {
                    const newSearchInput = document.querySelector('input[name="search"]');
                    if (newSearchInput) {
                        newSearchInput.value = savedSearchValue;
                        if (savedCursorPosition !== null) {
                            newSearchInput.setSelectionRange(savedCursorPosition, savedCursorPosition);
                        }
                        if (shouldRestoreFocus) {
                            // Restaurar foco de manera robusta
                            requestAnimationFrame(() => {
                                setTimeout(() => {
                                    newSearchInput.focus();
                                    if (savedCursorPosition !== null) {
                                        newSearchInput.setSelectionRange(savedCursorPosition, savedCursorPosition);
                                    }
                                }, 0);
                            });
                        }
                    }
                }, 150);
            }
        }
    })
    .catch(error => {
        console.error('Error al actualizar tabla:', error);
        window.location.reload();
    });
}

