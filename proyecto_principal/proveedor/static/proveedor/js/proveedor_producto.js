document.addEventListener('DOMContentLoaded', function() {
    // La búsqueda ahora se maneja en unified-table.js con búsqueda en tiempo real

    // Configurar los event listeners iniciales
    reconfigurarEventListeners();
}); 

// Autocomplete y validación en modal de agregar producto
(function() {
    const input = document.getElementById('producto_autocomplete');
    const suggestions = document.getElementById('autocomplete_suggestions');
    const hiddenId = document.getElementById('producto_id_hidden');
    const errorMsg = document.getElementById('addProductoErrorMsg');
    const form = document.querySelector('#agregarProductoModal form');
    let currentFocus = -1;
    let productos = [];

    if (!input || !suggestions || !hiddenId || !errorMsg || !form) {
        return;
    }

    // Obtener el ID del proveedor de la URL
    function getProveedorId() {
        const urlParts = window.location.pathname.split('/');
        for (let i = 0; i < urlParts.length - 1; i++) {
            if (urlParts[i] === 'proveedor' && urlParts[i + 2] === 'productos') {
                const proveedorId = urlParts[i + 1];
                return proveedorId;
            }
        }
        return null;
    }

    function closeSuggestions() {
        suggestions.innerHTML = '';
        suggestions.style.display = 'none';
        currentFocus = -1;
    }

    function showError(message) {
        errorMsg.innerHTML = message;
        errorMsg.classList.remove('d-none');
    }

    function clearError() {
        errorMsg.innerHTML = '';
        errorMsg.classList.add('d-none');
    }

    function renderSuggestions(items) {
        suggestions.innerHTML = '';
        if (!items.length) {
            suggestions.style.display = 'none';
            return;
        }
        // Limitar a 5 resultados
        const limitedItems = items.slice(0, 5);
        // Ajustar el ancho del contenedor al del input
        suggestions.style.width = input.offsetWidth + 'px';
        limitedItems.forEach((item, idx) => {
            const div = document.createElement('button');
            div.type = 'button';
            div.className = 'list-group-item list-group-item-action';
            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${item.nombre}</strong>
                        <br>
                        <small class="text-muted">Código: ${item.codigo} | Marca: ${item.marca}</small>
                    </div>
                    <span class="badge bg-primary rounded-pill">$${item.precio_venta}</span>
                </div>
            `;
            div.onclick = function() {
                input.value = item.nombre;
                hiddenId.value = item.id;
                closeSuggestions();
                clearError();
            };
            suggestions.appendChild(div);
        });
        suggestions.style.display = 'block';
    }

    function fetchProductos() {
        const q = input.value.trim();
        const proveedorId = getProveedorId();
        
        // Mostrar todos los productos si no hay texto de búsqueda
        if (q.length === 0) {
            if (!proveedorId) {
                closeSuggestions();
                hiddenId.value = '';
                return;
            }
            
            const url = `/proveedor/autocomplete_productos/?q=${encodeURIComponent('')}&proveedor=${proveedorId}`;
            
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    productos = data.results || [];
                    renderSuggestions(productos);
                    hiddenId.value = '';
                })
                .catch(error => {
                    console.error('Error al buscar productos:', error);
                });
            return;
        }
        
        if (!proveedorId) {
            return;
        }
        
        const url = `/proveedor/autocomplete_productos/?q=${encodeURIComponent(q)}&proveedor=${proveedorId}`;
        
        fetch(url)
            .then(res => res.json())
            .then(data => {
                productos = data.results || [];
                renderSuggestions(productos);
                
                if (productos.length === 1) {
                    hiddenId.value = productos[0].id;
                } else {
                    hiddenId.value = '';
                }
            })
            .catch(error => {
                console.error('Error al buscar productos:', error);
            });
    }

    input.addEventListener('input', fetchProductos);
    // Mostrar sugerencias al enfocar el input
    const productoInput = document.getElementById('producto_autocomplete');
    if (productoInput) {
      productoInput.addEventListener('focus', function() {
        fetchProductos();
      });
    }

    input.addEventListener('keydown', function(e) {
        const items = suggestions.querySelectorAll('.list-group-item');
        if (!items.length) return;
        if (e.key === 'ArrowDown') {
            currentFocus++;
            if (currentFocus >= items.length) currentFocus = 0;
            items.forEach((el, idx) => el.classList.toggle('active', idx === currentFocus));
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            currentFocus--;
            if (currentFocus < 0) currentFocus = items.length - 1;
            items.forEach((el, idx) => el.classList.toggle('active', idx === currentFocus));
            e.preventDefault();
        } else if (e.key === 'Enter') {
            if (currentFocus > -1 && items[currentFocus]) {
                e.preventDefault();
                items[currentFocus].click();
            }
        }
    });

    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            closeSuggestions();
        }
    });

    // Validar formulario antes de enviar
    form.addEventListener('submit', function(e) {
        if (!hiddenId.value) {
            e.preventDefault();
            showError('Por favor, seleccione un producto de la lista.');
            input.focus();
            return false;
        }
        clearError();
    });

        // Limpiar al abrir el modal
    const modal = document.getElementById('agregarProductoModal');
    if (modal) {
      modal.addEventListener('show.bs.modal', function() {
        input.value = '';
        hiddenId.value = '';
        closeSuggestions();
        clearError();
        // Asegurar que el precio esté vacío al abrir el modal
        const precioInput = document.getElementById('precio_proveedor');
        if (precioInput) {
          precioInput.value = '';
        }
      });
      
      // Limpiar al cerrar el modal
      modal.addEventListener('hidden.bs.modal', function() {
        input.value = '';
        hiddenId.value = '';
        closeSuggestions();
        clearError();
        
        // Limpiar errores de validación
        const form = modal.querySelector('form');
        if (form) {
          form.reset();
          // Asegurar que el precio esté vacío después del reset
          const precioInput = document.getElementById('precio_proveedor');
          if (precioInput) {
            precioInput.value = '';
          }
          form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
          form.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
          form.querySelectorAll('.modal-alert').forEach(el => el.remove());
        }
        
        // Restaurar botón si está deshabilitado
        const submitButton = modal.querySelector('button[type="submit"]');
        if (submitButton && submitButton.disabled) {
          submitButton.disabled = false;
          submitButton.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Agregar';
        }
      });
    }
})();

// Función para mostrar mensaje en página (igual que en categorías)
function mostrarMensajeEnPagina(mensaje, tipo) {
  
  // Crear el contenedor de notificaciones si no existe
  let notificationContainer = document.getElementById('notification-container');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 350px;
    `;
    document.body.appendChild(notificationContainer);
  }
  
  // Crear la notificación (diseño minimalista y pequeño)
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.style.cssText = `
    background: ${tipo === 'danger' ? '#f8d7da' : '#d1e7dd'};
    color: ${tipo === 'danger' ? '#721c24' : '#0f5132'};
    padding: 10px 14px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    border: 1px solid ${tipo === 'danger' ? '#f5c2c7' : '#badbcc'};
    transform: translateX(400px);
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    position: relative;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 400;
    font-size: 13px;
  `;
  
  // Agregar barra de progreso (más sutil)
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: ${tipo === 'danger' ? 'rgba(114, 28, 36, 0.2)' : 'rgba(15, 81, 50, 0.2)'};
    width: 100%;
    transform: scaleX(1);
    transform-origin: left;
    transition: transform 3s linear;
  `;
  
  notification.appendChild(progressBar);
  
  // Contenido de la notificación (minimalista)
  notification.innerHTML += `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
      <div style="flex: 1;">
        <div style="font-size: 13px; font-weight: 400; text-align: center; line-height: 1.4;">
          ${mensaje}
        </div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: none; border: none; color: ${tipo === 'danger' ? '#721c24' : '#0f5132'}; font-size: 16px; cursor: pointer; padding: 0; opacity: 0.5; transition: opacity 0.2s; flex-shrink: 0; line-height: 1;">
        ×
      </button>
    </div>
  `;
  
  // Agregar la notificación al contenedor
  notificationContainer.appendChild(notification);
  
  // Animar entrada
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 10);
  
  // Animar barra de progreso
  setTimeout(() => {
    progressBar.style.transform = 'scaleX(0)';
  }, 100);
  
  // Auto-remover después de 3 segundos
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 300);
    }
  }, 3000);
  
  // Efecto hover (más sutil)
  notification.addEventListener('mouseenter', () => {
    notification.style.transform = 'translateX(0)';
    notification.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
    progressBar.style.transition = 'none';
  });
  
  notification.addEventListener('mouseleave', () => {
    notification.style.transform = 'translateX(0)';
    notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    progressBar.style.transition = 'transform 3s linear';
  });
}

// Función para mostrar mensaje con botón deshacer (igual que en categorías)
function mostrarMensajeConDeshacer(mensaje, productoId, proveedorId) {
  
  // Crear el contenedor de notificaciones si no existe
  let notificationContainer = document.getElementById('notification-container');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 320px;
    `;
    document.body.appendChild(notificationContainer);
  }
  
  // Crear la notificación con botón deshacer (diseño minimalista)
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.style.cssText = `
    background: #f8d7da;
    color: #721c24;
    padding: 10px 14px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    border: 1px solid #f5c2c7;
    transform: translateX(400px);
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    position: relative;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 400;
    font-size: 13px;
  `;
  
  // Agregar barra de progreso (más sutil)
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: rgba(114, 28, 36, 0.2);
    width: 100%;
    transform: scaleX(1);
    transform-origin: left;
    transition: transform 10s linear;
  `;
  
  notification.appendChild(progressBar);
  
  // Contenido de la notificación con botón deshacer (minimalista)
  notification.innerHTML += `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
      <div style="flex: 1;">
        <div style="font-size: 13px; font-weight: 400; margin-bottom: 6px; text-align: center; line-height: 1.4;">
          ${mensaje}
        </div>
        <div style="text-align: center;">
        <button onclick="restaurarProductoProveedor(${proveedorId}, ${productoId}, this)" 
                  style="background: rgba(114, 28, 36, 0.1); border: 1px solid rgba(114, 28, 36, 0.2); color: #721c24; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; transition: all 0.2s; font-weight: 400;">
          Deshacer
        </button>
        </div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: none; border: none; color: #721c24; font-size: 16px; cursor: pointer; padding: 0; opacity: 0.5; transition: opacity 0.2s; flex-shrink: 0; line-height: 1;">
        ×
      </button>
    </div>
  `;
  
  // Agregar la notificación al contenedor
  notificationContainer.appendChild(notification);
  
  // Animar entrada
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 10);
  
  // Animar barra de progreso
  setTimeout(() => {
    progressBar.style.transform = 'scaleX(0)';
  }, 100);
  
  // Auto-remover después de 10 segundos
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 300);
    }
  }, 10000);
  
  // Efecto hover (más sutil)
  notification.addEventListener('mouseenter', () => {
    notification.style.transform = 'translateX(0)';
    notification.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
    progressBar.style.transition = 'none';
  });
  
  notification.addEventListener('mouseleave', () => {
    notification.style.transform = 'translateX(0)';
    notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    progressBar.style.transition = 'transform 10s linear';
  });
}

// Función para restaurar producto eliminado
function restaurarProductoProveedor(proveedorId, productoId, button) {
  
  // Deshabilitar botón durante la operación
  button.disabled = true;
  button.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Restaurando...';
  
  // Obtener datos del producto eliminado del sessionStorage
  const productoEliminado = JSON.parse(sessionStorage.getItem('productoEliminado'));
  
  $.ajax({
    url: `/proveedor/${proveedorId}/productos/restaurar/${productoId}/`,
    type: 'POST',
    data: {
      'csrfmiddlewaretoken': $('[name=csrfmiddlewaretoken]').val(),
      'precio_proveedor': productoEliminado ? productoEliminado.precioProveedor : null
    },
    success: function (data) {
      // Cerrar la notificación
      button.closest('.notification').remove();
      
      // Verificar si la tabla está oculta (cuando no hay productos)
      const mensajeNoProductos = $('.alert-info:contains("No hay productos")');
      
      if (mensajeNoProductos.length > 0) {
        // Buscar el contenedor donde está el mensaje
        const contenedorMensaje = mensajeNoProductos.closest('.card-body');
        if (contenedorMensaje.length > 0) {
          // Recrear la tabla en el mismo contenedor
          contenedorMensaje.html(`
            <div class="table-responsive">
              <table class="table datatable table-bordered table-striped table-hover align-middle" style="width: 100%;">
                <thead class="table-dark">
                  <tr>
                    <th class="text-center">Nombre</th>
                    <th class="text-center">Marca</th>
                    <th class="text-center">Stock</th>
                    <th class="text-center">Precio Venta</th>
                    <th class="text-center">Precio Proveedor</th>
                    <th class="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                </tbody>
              </table>
            </div>
          `);
          
          // Usar el sistema unificado para actualizar la tabla
          if (typeof refreshTable === 'function') {
            refreshTable();
          } else if (typeof updateTableContent === 'function') {
            updateTableContent(window.location.href);
          } else {
            window.location.reload();
          }
        }
      }
      
      // Usar el sistema unificado para actualizar la tabla
      if (typeof refreshTable === 'function') {
        refreshTable();
      } else if (typeof updateTableContent === 'function') {
        updateTableContent(window.location.href);
      } else {
        window.location.reload();
      }
      
      // Mostrar mensaje de restauración exitosa (usar mensaje del servidor si está disponible)
      const mensajeRestauracion = data.message || 'Producto restaurado correctamente.';
      mostrarMensajeEnPagina(mensajeRestauracion, 'success');
      
      // Limpiar datos del sessionStorage
      sessionStorage.removeItem('productoEliminado');
    },
    error: function (xhr, status, error) {
      let mensaje = 'Error al restaurar el producto.';
      
      try {
        const response = JSON.parse(xhr.responseText);
        if (response.message) {
          mensaje = response.message;
        }
      } catch (e) {
        // No se pudo parsear la respuesta JSON
      }
      
      // Mostrar mensaje de error
      mostrarMensajeEnPagina(mensaje, 'danger');
      
      // Restaurar botón en caso de error
      button.disabled = false;
      button.innerHTML = 'Deshacer';
    }
  });
}

// Manejo de AJAX para eliminación de productos (igual que en categorías)
$(document).ready(function() {
  // Variables para el modal de eliminación
  let idProductoEliminar = null;
  let idProveedorEliminar = null;
  let filaProducto = null;

  // Abrir modal de eliminación y guardar datos
  $(document).on('click', 'button[data-bs-target="#deleteProductoModal"]', function () {
    idProductoEliminar = $(this).data('producto-id');
    idProveedorEliminar = $(this).data('proveedor-id');
    filaProducto = $(this).closest('tr');
    const nombre = $(this).data('producto-nombre');
    $('#deleteProductoName').text(nombre);
  });

  // Confirmar eliminación por AJAX
  $('#deleteProductoForm').on('submit', function (e) {
    e.preventDefault();
    if (!idProductoEliminar || !idProveedorEliminar) return;
    
    $.ajax({
      url: `/proveedor/${idProveedorEliminar}/productos/eliminar/${idProductoEliminar}/`,
      type: 'POST',
      data: {
        'csrfmiddlewaretoken': $('[name=csrfmiddlewaretoken]').val()
      },
      success: function (data) {
        // Cerrar modal
        $('#deleteProductoModal').modal('hide');
        
        // Guardar datos del producto eliminado en sessionStorage para poder restaurarlo
        const productoEliminado = {
          id: idProductoEliminar,
          proveedorId: idProveedorEliminar,
          nombre: $('#deleteProductoName').text(),
          filaHtml: filaProducto.prop('outerHTML'),
          precioProveedor: filaProducto.find('td:eq(4)').text().replace(/[^\d]/g, ''), // Extraer precio del proveedor
          timestamp: new Date().getTime()
        };
        sessionStorage.setItem('productoEliminado', JSON.stringify(productoEliminado));
        
        // Verificar si era el último producto antes de ocultar
        const filasVisibles = $('.datatable tbody tr:visible').length;
        
        if (filasVisibles === 1) {
          // Si era el último producto, reemplazar toda la tabla con el mensaje
          const contenedorTabla = $('.datatable').closest('.card-body');
          if (contenedorTabla.length > 0) {
            // Reemplazar el contenido del contenedor con el mensaje
            contenedorTabla.html(`
              <div class="text-center px-4 py-4">
                <div class="alert alert-info mb-0">No hay productos en este proveedor.</div>
              </div>
            `);
          }
        } else {
          // Si no era el último producto, solo ocultar la fila
          filaProducto.hide();
        }
        
        // Mostrar mensaje de éxito con opción de deshacer (usar mensaje del servidor)
        const nombreProducto = $('#deleteProductoName').text();
        const mensaje = data.message || `El producto <strong>${nombreProducto}</strong> fue eliminado del proveedor.`;
        mostrarMensajeConDeshacer(mensaje, idProductoEliminar, idProveedorEliminar);
      },
      error: function (xhr, status, error) {
        $('#deleteProductoModal').modal('hide');
        let mensaje = 'Error al eliminar el producto del proveedor.';
        
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.message) {
            mensaje = response.message;
          }
        } catch (e) {
          // No se pudo parsear la respuesta JSON
        }
        
        // Mostrar mensaje de error
        mostrarMensajeEnPagina(mensaje, 'danger');
      }
    });
  });
});

// Manejar el envío del formulario de agregar producto con AJAX
const addProductForm = document.getElementById('agregarProductoModal').querySelector('form');

if (addProductForm) {
  addProductForm.addEventListener('submit', function (event) {
    event.preventDefault();
    event.stopPropagation();
    
    const formData = new FormData(this);
    const modal = document.getElementById('agregarProductoModal');
    const submitButton = modal.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // Deshabilitar botón y mostrar loading
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Agregando...';
    
    fetch(this.action, {
      method: 'POST',
      body: formData,
      headers: {
        'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(response => {
      return response.json().catch(() => null);
    })
    .then(data => {
      if (data && data.success) {
          // Operación exitosa
        const modal = bootstrap.Modal.getInstance(document.getElementById('agregarProductoModal'));
        if (modal) modal.hide();
        mostrarMensajeEnPagina(data.message, 'success');
        
        // Actualizar la tabla dinámicamente
        actualizarTablaProductos(data.producto);
        
        // Limpiar el formulario
        addProductForm.reset();
        // Asegurar que el precio quede vacío (sin valor escrito)
        const precioInput = document.getElementById('precio_proveedor');
        if (precioInput) {
          precioInput.value = '';
        }
      } else if (data && data.message) {
        // Error con mensaje - mostrar solo en el modal
        const errorMsg = document.getElementById('addProductoErrorMsg');
        if (errorMsg) {
          errorMsg.innerHTML = data.message;
          errorMsg.classList.remove('d-none');
        }
        } else {
        // Si no hay datos o la respuesta no es JSON, mostrar error en el modal
        const errorMsg = document.getElementById('addProductoErrorMsg');
        if (errorMsg) {
          errorMsg.innerHTML = 'Hubo un problema al procesar la respuesta.';
          errorMsg.classList.remove('d-none');
              }
      }
        // Restaurar botón
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    })
    .catch(error => {
      console.error('Error en agregar:', error);
      
      // Restaurar botón en caso de error
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
      
      // Mostrar mensaje de error
      mostrarMensajeEnPagina("Error al agregar el producto. Intente nuevamente.", "danger");
    });
    
    return false;
  });
}

// Función para reconfigurar los event listeners de los botones de editar
function reconfigurarEventListeners() {
    // Configurar modal de editar precio
    const editPriceButtons = document.querySelectorAll('.btn-edit-precio');
    editPriceButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productoId = this.getAttribute('data-producto-id');
            const productoNombre = this.getAttribute('data-producto-nombre');
            const precioActual = this.getAttribute('data-precio-actual');
            const url = this.getAttribute('data-url');
            
            document.getElementById('edit-producto-id').value = productoId;
            document.getElementById('edit-precio-proveedor').value = Math.round(Number(precioActual));
            document.getElementById('editarPrecioForm').action = url;
        });
    });

    // Configurar modal de eliminar producto
    const deleteProductButtons = document.querySelectorAll('.btn-delete-producto');
    deleteProductButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productoId = this.getAttribute('data-producto-id');
            const productoNombre = this.getAttribute('data-producto-nombre');
            const url = this.getAttribute('data-url');
            
            document.getElementById('delete-producto-id').value = productoId;
            document.getElementById('deleteProductoName').textContent = productoNombre;
            document.getElementById('deleteProductoForm').action = url;
        });
    });
}

// Función para actualizar la tabla de productos dinámicamente
function actualizarTablaProductos(productoAgregado = null) {
  if (productoAgregado && productoAgregado.id) {
    // Si tenemos datos del producto agregado, usar refreshTable
    let tabla = document.querySelector('.datatable tbody');
    
    // Si no existe la tabla, crearla dinámicamente
    if (!tabla) {
      // Buscar el contenedor donde debería estar la tabla
      let contenedorTabla = null;
      
      // Buscar específicamente el contenedor de la tabla de productos
      // Primero buscar por el mensaje "No hay productos"
      const mensajeNoProductos = document.querySelector('.alert-info');
      if (mensajeNoProductos) {
        contenedorTabla = mensajeNoProductos.closest('.card-body');
      }
      
      // Si no lo encuentra por el mensaje, buscar por la estructura específica
      if (!contenedorTabla) {
        // Buscar el card que contiene la tabla de productos
        const cards = document.querySelectorAll('.card');
        for (let card of cards) {
          const cardHeader = card.querySelector('.card-header');
          if (cardHeader && cardHeader.textContent.includes('Productos del Proveedor')) {
            contenedorTabla = card.querySelector('.card-body');
      break;
    }
  }
      }
      
      // Si aún no lo encuentra, buscar el último card-body
      if (!contenedorTabla) {
        const cardBodies = document.querySelectorAll('.card-body');
        if (cardBodies.length > 1) {
          contenedorTabla = cardBodies[cardBodies.length - 1];
        }
      }
      
      if (!contenedorTabla) {
        // Usar el sistema unificado para actualizar la tabla
        if (typeof refreshTable === 'function') {
          refreshTable();
          return;
        } else if (typeof updateTableContent === 'function') {
          updateTableContent(window.location.href);
          return;
        }
        setTimeout(() => {
          window.location.reload();
        }, 1500);
    return;
  }
  
      // Remover el mensaje "No hay productos" si existe
      const mensajeNoProductosEnContenedor = contenedorTabla.querySelector('.alert-info');
      if (mensajeNoProductosEnContenedor) {
        mensajeNoProductosEnContenedor.remove();
      }
      
      // Usar el sistema unificado para actualizar la tabla
      if (typeof refreshTable === 'function') {
        refreshTable();
        return;
      } else if (typeof updateTableContent === 'function') {
        updateTableContent(window.location.href);
        return;
      }
      
      // Fallback: recargar la página
      window.location.reload();
      return;
    }
    
    if (tabla) {
      // Usar el sistema unificado para actualizar la tabla
      if (typeof refreshTable === 'function') {
        refreshTable();
        return;
      } else if (typeof updateTableContent === 'function') {
        updateTableContent(window.location.href);
        return;
      }
      
      // Fallback: recargar la página
      window.location.reload();
      return;
    }
  }
  
  // Si no tenemos datos del producto o no se pudo agregar, usar refreshTable
  // Buscar el contenedor de la tabla
  let tableWrapper = document.getElementById('table-wrapper') || document.querySelector('.unified-table-wrapper');
  
  // Si no existe el contenedor de la tabla, buscar el div con el mensaje "No hay productos"
  if (!tableWrapper) {
    // Buscar el div que contiene el mensaje de "No hay productos registrados"
    const noDataCard = document.querySelector('.card.shadow-lg.border-0 .alert-info');
    if (noDataCard) {
      // Encontrar el contenedor padre (el card)
      const cardContainer = noDataCard.closest('.card.shadow-lg.border-0');
      if (cardContainer) {
        // Crear el contenedor de la tabla
        tableWrapper = document.createElement('div');
        tableWrapper.className = 'unified-table-wrapper';
        tableWrapper.id = 'table-wrapper';
        // Reemplazar el card con el nuevo contenedor
        cardContainer.parentNode.replaceChild(tableWrapper, cardContainer);
      }
    }
  }
  
  if (typeof refreshTable === 'function') {
    refreshTable();
  } else if (typeof updateTableContent === 'function') {
    updateTableContent(window.location.href);
        } else {
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }
}

// La tabla ahora se maneja con unified-table.js que proporciona búsqueda, ordenamiento y paginación del lado del servidor
  
// Script para el escaneo de códigos (igual que compras/ventas/categoría)
(function() {
  const scanCodeModalEl = document.getElementById('scanCodeModal');
  const scanCodeInput = document.getElementById('scanCodeInput');
  const scanMessage = document.getElementById('scanMessage');
  let scanTimeout = null;

  function showError(message) {
    scanMessage.innerHTML = message;
    scanMessage.style.display = 'block';
  }

  function clearError() {
    scanMessage.innerHTML = '';
    scanMessage.style.display = 'none';
  }

  if (scanCodeModalEl && scanCodeInput && scanMessage) {
    scanCodeModalEl.addEventListener('shown.bs.modal', () => {
      scanCodeInput.value = '';
      clearError();
      scanCodeInput.focus();
    });

    scanCodeInput.addEventListener('keydown', function(event) {
      if(event.key === 'Enter') {
        event.preventDefault();
        const codigo = this.value.trim();
        if(codigo === '') return;

        // Limpiar timeout anterior si existe
        if (scanTimeout) {
          clearTimeout(scanTimeout);
        }

        // Validar el código (AJAX, igual que en compras/ventas/categoría)
        fetch('/proveedor/validar_codigo/?codigo=' + encodeURIComponent(codigo))
          .then(response => response.json())
          .then(data => {
            if(!data.existe) {
              showError(`⚠️ No se encontró el código "<strong>${codigo}</strong>".`);
              scanCodeInput.value = '';
              scanCodeInput.focus();
            } else {
              // Código existe, cerrar modal escaneo y abrir modal agregar producto
              const scanModalInstance = bootstrap.Modal.getInstance(scanCodeModalEl);
              scanModalInstance.hide();

              // Abrir modal de agregar producto
              const addManualModal = new bootstrap.Modal(document.getElementById('agregarProductoModal'));
              addManualModal.show();

              // Poner código en el input de producto y poner foco
              const productoInput = document.getElementById('producto_autocomplete');
              if(productoInput) {
                productoInput.value = codigo;
                productoInput.focus();
                // Disparar el evento input para activar la búsqueda
                productoInput.dispatchEvent(new Event('input'));
              }
            }
          })
          .catch(() => {
            showError('⚠️ Error al validar el código. Intente nuevamente.');
            scanCodeInput.value = '';
            scanCodeInput.focus();
          });
      }
    });

    // Limpiar el input después de un tiempo si no se completó el escaneo
    scanCodeInput.addEventListener('input', function() {
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
      scanTimeout = setTimeout(() => {
        this.value = '';
      }, 1000);
    });

    // Limpiar error al cerrar el modal
    scanCodeModalEl.addEventListener('hidden.bs.modal', () => {
      clearError();
      scanCodeInput.value = '';
    });
  }
})();
  