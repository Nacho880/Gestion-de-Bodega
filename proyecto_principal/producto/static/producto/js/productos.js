

// Abrir modal Añadir producto con botón
document.getElementById('addProductoBtn').addEventListener('click', () => {
  const addModal = new bootstrap.Modal(document.getElementById('addProductModal'));
  addModal.show();
});

let scannedCode = '';
let scanActive = false;
let scanMode = '';  // 'add' o 'search'

const scanModalEl = document.getElementById('scanCodeModal');
const scanModal = new bootstrap.Modal(scanModalEl);
const scanOptions = document.getElementById('scanOptions');
const scanCodeUI = document.getElementById('scanCodeUI');
const scanMsg = document.getElementById('scanMessage');
const searchInput = document.getElementById('searchProductos');

document.getElementById('scanCodeBtn').addEventListener('click', () => {
  scannedCode = '';
  scanActive = false;
  scanMode = '';
  scanMsg.style.display = 'none';
  scanMsg.textContent = '';

  scanOptions.style.display = 'block';
  scanCodeUI.style.display = 'none';

  scanModal.show();
});

document.getElementById('btnAddScan').addEventListener('click', () => {
  startScan('add');
});

document.getElementById('btnSearchScan').addEventListener('click', () => {
  startScan('search');
});

function startScan(mode) {
  scanMode = mode;
  scannedCode = '';
  scanActive = true;

  scanOptions.style.display = 'none';
  scanCodeUI.style.display = 'block';
  scanMsg.style.display = 'none';
  scanMsg.textContent = '';

  window.addEventListener('keydown', handleScan);

  scanModalEl.addEventListener('hidden.bs.modal', () => {
    scanActive = false;
    scanMode = '';
    window.removeEventListener('keydown', handleScan);
  }, { once: true });
}

function handleScan(e) {
  if (!scanActive) return;

  if (e.key === 'Enter') {
    if (scannedCode.trim() !== '') {
      e.preventDefault();

      if (scanMode === 'add') {
        $.ajax({
          url: validarCodigoUrl,
          data: { codigo: scannedCode.trim() },
          success: function(response) {
            if (response.existe) {
              scanMsg.textContent = "⚠️ El código ya existe en la base de datos.";
              scanMsg.style.display = 'block';
              scannedCode = '';
            } else {
              scanModal.hide();
              scanActive = false;
              window.removeEventListener('keydown', handleScan);

              // Abrir el modal y esperar a que esté completamente visible para asignar el código
              const addProductModalEl = document.getElementById('addProductModal');
              const addModal = new bootstrap.Modal(addProductModalEl);
              addModal.show();
              // Esperar a que el modal esté completamente abierto
              addProductModalEl.addEventListener('shown.bs.modal', function handler() {
                document.getElementById('add-codigo').value = scannedCode.trim();
                // Remover el event listener para evitar duplicados
                addProductModalEl.removeEventListener('shown.bs.modal', handler);
              });
            }
          },
          error: function() {
            alert("Error al validar el código. Intenta nuevamente.");
          }
        });
      } else if (scanMode === 'search') {
        scanModal.hide();
        scanActive = false;
        window.removeEventListener('keydown', handleScan);

        searchInput.value = scannedCode.trim();
        searchInput.dispatchEvent(new Event('input'));
      }
    }
  } else {
    if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey &&
      e.key !== 'Shift'
    ) {
      scannedCode += e.key;
    }
  }
}

// Modales edición y eliminación
const editProductModal = document.getElementById('editProductModal');
const deleteProductModal = document.getElementById('deleteProductModal');

editProductModal.addEventListener('show.bs.modal', function (event) {
  // Limpiar mensajes y validaciones
  const alertDiv = this.querySelector('.modal-alert');
  if (alertDiv) alertDiv.style.display = 'none';
  
  // Limpiar clases de validación
  const inputs = this.querySelectorAll('.form-control');
  inputs.forEach(input => {
    input.classList.remove('is-invalid', 'is-valid');
  });
  
  // Limpiar mensajes de error
  const errorDivs = this.querySelectorAll('.invalid-feedback');
  errorDivs.forEach(div => {
    div.textContent = '';
  });

  // Inicializar autocompletado de categorías para el modal de editar
  setTimeout(() => {
    inicializarCategoriaInputs('edit');
  }, 100);

  // Llenar datos del modal si hay un botón relacionado
  if (event.relatedTarget) {
    const button = event.relatedTarget;
    const id = button.getAttribute('data-id');
    const nombre = button.getAttribute('data-nombre');
    const marca = button.getAttribute('data-marca');
    const categoria = button.getAttribute('data-categoria');
    const descripcion = button.getAttribute('data-descripcion');
    const precio = button.getAttribute('data-precio');
    const stock = button.getAttribute('data-stock');
    const stockmin = button.getAttribute('data-stockmin');
    const codigo = button.getAttribute('data-codigo');

    document.getElementById('edit-id').value = id;
    document.getElementById('edit-nombre').value = nombre;
    document.getElementById('edit-marca').value = marca;
    
    // Cargar categorías del producto
    const productoId = button.getAttribute('data-id');
    if (productoId) {
      fetch(`/producto/${productoId}/categorias/`)
          .then(res => res.json())
          .then(data => {
          if (data.success && data.categorias) {
            categoriasSeleccionadas['edit'] = data.categorias.map(cat => ({
              id: cat.id,
              nombre: cat.nombre
            }));
            // Asegurar que el contenedor de badges esté visible antes de actualizar
            const container = document.getElementById('edit-categorias-selected');
            if (container) {
              container.style.display = 'flex';
            }
            actualizarBadgesCategorias('edit');
            // Si el panel de opciones está abierto, actualizar checkboxes
            setTimeout(() => {
              actualizarCheckboxesAlCargar('edit');
            }, 100);
            } else {
            categoriasSeleccionadas['edit'] = [];
            actualizarBadgesCategorias('edit');
            }
          })
          .catch(error => {
          console.error('Error al obtener categorías:', error);
          categoriasSeleccionadas['edit'] = [];
          actualizarBadgesCategorias('edit');
          });
      } else {
      categoriasSeleccionadas['edit'] = [];
      actualizarBadgesCategorias('edit');
    }
    
    document.getElementById('edit-descripcion').value = descripcion;
    document.getElementById('edit-precio').value = Math.round(precio);
    document.getElementById('edit-stock').value = stock;
    document.getElementById('edit-stockmin').value = stockmin;
    document.getElementById('edit-codigo').value = codigo;

    document.getElementById('editProductForm').action = `/producto/editar/${id}/`;
  }
});

// Corregir problema de accesibilidad al cerrar modal de editar
editProductModal.addEventListener('hidden.bs.modal', function() {
  // Remover aria-hidden cuando el modal se cierra
  this.removeAttribute('aria-hidden');
  
  // Asegurar que el foco vuelva al botón que abrió el modal
  const triggerButton = document.querySelector('[data-bs-target="#editProductModal"]');
  if (triggerButton) {
    triggerButton.focus();
  }
});

// Interceptar el click del botón de eliminar ANTES de que se abra el modal
document.addEventListener('click', function(event) {
  const button = event.target.closest('button[data-bs-target="#deleteProductModal"]');
  if (!button) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  const id = button.getAttribute('data-id');
  const nombre = button.getAttribute('data-nombre');
  const puedeEliminar = button.getAttribute('data-puede-eliminar') === 'true';
  
  // Ocultar todo primero
  document.getElementById('modalContentNormal').style.display = 'none';
  document.getElementById('modalContentError').style.display = 'none';
  document.getElementById('btnConfirmarEliminar').style.display = 'none';
  
  if (puedeEliminar) {
    // Se puede eliminar, mostrar contenido normal
    document.getElementById('delete-id').value = id;
    document.getElementById('delete-product-name').textContent = nombre;
    document.getElementById('deleteProductForm').action = `/producto/eliminar/${id}/`;
    document.getElementById('modalContentNormal').style.display = 'block';
    document.getElementById('btnConfirmarEliminar').style.display = 'inline-block';
  } else {
    // No se puede eliminar, mostrar mensaje de error
    document.getElementById('error-message').textContent = 'No se puede eliminar el producto porque está asociado a ventas o compras.';
    document.getElementById('modalContentError').style.display = 'block';
  }
  
  // Obtener o crear instancia del modal
  const modalElement = document.getElementById('deleteProductModal');
  let modal = bootstrap.Modal.getInstance(modalElement);
  if (!modal) {
    modal = new bootstrap.Modal(modalElement);
  }
  modal.show();
}, true); // Usar capture phase para interceptar antes que Bootstrap

// Corregir problema de accesibilidad al cerrar modal de eliminar
deleteProductModal.addEventListener('hidden.bs.modal', function() {
  // Remover aria-hidden cuando el modal se cierra
  this.removeAttribute('aria-hidden');
  
  // Resetear modal al estado inicial
  document.getElementById('modalContentNormal').style.display = 'none';
  document.getElementById('modalContentError').style.display = 'none';
  document.getElementById('btnConfirmarEliminar').style.display = 'none';
  
  // Asegurar que se elimine el backdrop si queda alguno
  const backdrops = document.querySelectorAll('.modal-backdrop');
  backdrops.forEach(backdrop => backdrop.remove());
  
  // Remover clase modal-open del body si queda
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  
  // Asegurar que el foco vuelva al botón que abrió el modal
  const triggerButton = document.querySelector('[data-bs-target="#deleteProductModal"]');
  if (triggerButton) {
    triggerButton.focus();
  }
});

// Manejar todos los formularios con AJAX
document.addEventListener('DOMContentLoaded', function() {
  
  // Manejar el envío del formulario de eliminación con AJAX
  const deleteProductForm = document.getElementById('deleteProductForm');
  if (deleteProductForm) {
    
    deleteProductForm.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopPropagation();
      
      const formData = new FormData(this);
      const modal = document.getElementById('deleteProductModal');
      const submitButton = document.getElementById('btnConfirmarEliminar');
      if (!submitButton || submitButton.style.display === 'none') {
        return; // No hacer nada si el botón no está visible
      }
      const originalText = submitButton.innerHTML;
      
      
      // Deshabilitar botón y mostrar loading
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Eliminando...';
      
      fetch('/producto/eliminar/' + formData.get('id') + '/', {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': formData.get('csrfmiddlewaretoken')
        }
      })
      .then(response => {
        // Intentar parsear como JSON
        return response.json();
      })
      .then(data => {
        if (data) {
          
          if (data.success) {
            // Eliminación exitosa, cerrar el modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteProductModal'));
            modal.hide();
            
            // Mostrar mensaje con botón deshacer
            mostrarMensajeConDeshacer(data.message, data.producto_id);
            
            // Actualizar la tabla dinámicamente
            actualizarTablaProductos();
          } else {
            // Error
            mostrarMensajeEnModal('deleteProductModal', data.message, 'danger');
          }
          
          // Restaurar botón
          submitButton.disabled = false;
          submitButton.innerHTML = originalText;
        }
      })
      .catch(error => {
        console.error('Error en eliminación:', error);
        // Si hay error, actualizar tabla
        if (typeof refreshTable === 'function') {
          refreshTable();
        } else if (typeof updateTableContent === 'function') {
          updateTableContent(window.location.href);
        } else {
        window.location.reload();
        }
      });
      
      return false;
    });
  } else {
  }
  
  // Manejar el envío del formulario de agregar producto con AJAX
  const addProductForm = document.getElementById('addProductModal').querySelector('form');
  
  if (addProductForm) {
    
    addProductForm.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopPropagation();
      
      const formData = new FormData(this);
      
      // Asegurar que se envíen las categorías seleccionadas
      // Leer directamente de categoriasSeleccionadas para asegurar que tenemos los datos más recientes
      const categoriasHidden = document.getElementById('add-categorias-hidden');
      let categoriasIds = [];
      
      // Primero intentar leer del array categoriasSeleccionadas (más confiable)
      if (categoriasSeleccionadas['add'] && categoriasSeleccionadas['add'].length > 0) {
        categoriasIds = categoriasSeleccionadas['add'].map(c => c.id.toString());
      } else if (categoriasHidden && categoriasHidden.value) {
        // Fallback: leer del campo hidden si el array está vacío
        categoriasIds = categoriasHidden.value.split(',').filter(id => id.trim());
      }
      
      // Actualizar el campo hidden antes de enviar (por si acaso)
      if (categoriasHidden && categoriasIds.length > 0) {
        categoriasHidden.value = categoriasIds.join(',');
      }
      
      // IMPORTANTE: Eliminar cualquier valor previo de categorias_ids del FormData
      // para evitar duplicados
      formData.delete('categorias_ids');
      
      // Agregar cada ID como un parámetro separado (solo IDs individuales)
      categoriasIds.forEach(id => {
        const trimmedId = id.trim();
        if (trimmedId && !trimmedId.includes(',')) {
          // Solo agregar si no contiene comas (para evitar strings como "1,2")
          formData.append('categorias_ids', trimmedId);
            }
          });
      
      const modal = document.getElementById('addProductModal');
      const submitButton = modal.querySelector('button[type="submit"]');
      const originalText = submitButton.innerHTML;
      
      // Deshabilitar botón y mostrar loading
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Guardando...';
      
      fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': formData.get('csrfmiddlewaretoken')
        }
      })
      .then(response => {
        
        // Verificar si es redirección
        if (response.redirected || response.status === 302) {
          // Mostrar mensaje de éxito y actualizar tabla
          mostrarMensajeEnPagina("Operación completada exitosamente.", "success");
          actualizarTablaProductos();
          return null;
        }
        
        // Intentar parsear como JSON
        return response.json();
      })
      .then(data => {
        if (data) {
          
          if (data.success) {
            // Operación exitosa
            
            // Cerrar el modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
            modal.hide();
            
            // Mostrar mensaje de éxito en la página principal
            mostrarMensajeEnPagina(data.message, 'success');
            
            // Actualizar la tabla dinámicamente
            actualizarTablaProductos();
          } else {
            // Error
            const modal = document.getElementById('addProductModal');
            let alertDiv = modal.querySelector('.modal-alert');
            
            if (!alertDiv) {
              alertDiv = document.createElement('div');
              alertDiv.className = 'modal-alert alert alert-danger mt-3';
              const modalFooter = modal.querySelector('.modal-footer');
              modalFooter.insertBefore(alertDiv, modalFooter.firstChild);
            }
            
            alertDiv.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>${data.message}`;
            alertDiv.style.display = 'block';
            
            // Marcar en rojo el campo de precio si hay error en precio_unitario
            const precioInput = this.querySelector('[name="precio_unitario"]');
            if (data.errors && data.errors.precio_unitario) {
                if (precioInput) precioInput.classList.add('is-invalid');
            } else {
                if (precioInput) precioInput.classList.remove('is-invalid');
            }
            // Marcar en rojo el campo de código si hay error en codigo
            const codigoInput = this.querySelector('[name="codigo"]');
            if ((data.errors && data.errors.codigo) || data.field === "codigo") {
                if (codigoInput) codigoInput.classList.add('is-invalid');
            } else {
                if (codigoInput) codigoInput.classList.remove('is-invalid');
            }
            // Mostrar errores específicos de campos si existen
            // if (data.errors) {
            //   Object.keys(data.errors).forEach(field => {
            //     const input = this.querySelector(`[name="${field}"]`);
            //     if (input) {
            //       input.classList.add('is-invalid');
            //       const errorDiv = input.parentNode.querySelector('.invalid-feedback') || 
            //                       input.parentNode.appendChild(document.createElement('div'));
            //       errorDiv.className = 'invalid-feedback';
            //       errorDiv.textContent = data.errors[field];
            //     }
            //   });
            // }
          }
          
          // Restaurar botón
          submitButton.disabled = false;
          submitButton.innerHTML = originalText;
        } else {
        }
      })
      .catch(error => {
        console.error('Error en agregar:', error);
        
        // Si hay error, actualizar tabla
        if (typeof refreshTable === 'function') {
          refreshTable();
        } else if (typeof updateTableContent === 'function') {
          updateTableContent(window.location.href);
        } else {
        window.location.reload();
        }
      });
      
      return false;
    });
  } else {
  }
  
  // Manejar el envío del formulario de editar producto con AJAX
  const editProductForm = document.getElementById('editProductForm');
  
  if (editProductForm) {
    
    editProductForm.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopPropagation();
      
      const formData = new FormData(this);
      
      // Asegurar que se envíen las categorías seleccionadas
      // Leer directamente de categoriasSeleccionadas para asegurar que tenemos los datos más recientes
      const categoriasHidden = document.getElementById('edit-categorias-hidden');
      let categoriasIds = [];
      
      // Primero intentar leer del array categoriasSeleccionadas (más confiable)
      if (categoriasSeleccionadas['edit'] && categoriasSeleccionadas['edit'].length > 0) {
        categoriasIds = categoriasSeleccionadas['edit'].map(c => c.id.toString());
      } else if (categoriasHidden && categoriasHidden.value) {
        // Fallback: leer del campo hidden si el array está vacío
        categoriasIds = categoriasHidden.value.split(',').filter(id => id.trim());
      }
      
      // Actualizar el campo hidden antes de enviar (por si acaso)
      if (categoriasHidden && categoriasIds.length > 0) {
        categoriasHidden.value = categoriasIds.join(',');
      }
      
      // IMPORTANTE: Eliminar cualquier valor previo de categorias_ids del FormData
      // para evitar duplicados
      formData.delete('categorias_ids');
      
      // Agregar cada ID como un parámetro separado (solo IDs individuales)
      categoriasIds.forEach(id => {
        const trimmedId = id.trim();
        if (trimmedId && !trimmedId.includes(',')) {
          // Solo agregar si no contiene comas (para evitar strings como "1,2")
          formData.append('categorias_ids', trimmedId);
            }
          });
      const modal = editProductModal;
      const submitButton = modal.querySelector('button[type="submit"]');
      const originalText = submitButton.innerHTML;
      
      // Deshabilitar botón y mostrar loading
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Guardando...';
      
      fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': formData.get('csrfmiddlewaretoken')
        }
      })
      .then(response => {
        
        // Verificar si es redirección
        if (response.redirected || response.status === 302) {
          // Mostrar mensaje de éxito y actualizar tabla
          mostrarMensajeEnPagina("Operación completada exitosamente.", "success");
          actualizarTablaProductos();
          return null;
        }
        
        // Intentar parsear como JSON
        return response.json();
      })
      .then(data => {
        if (data) {
          
          if (data.success) {
            // Operación exitosa
            
            // Cerrar el modal
            const modal = bootstrap.Modal.getInstance(editProductModal);
            modal.hide();
            
            // Mostrar mensaje de éxito en la página principal
            mostrarMensajeEnPagina(data.message, 'success');
            
            // Actualizar la tabla dinámicamente
            actualizarTablaProductos();
          } else {
            // Error
            const modal = editProductModal;
            let alertDiv = modal.querySelector('.modal-alert');
            
            if (!alertDiv) {
              alertDiv = document.createElement('div');
              alertDiv.className = 'modal-alert alert alert-danger mt-3';
              const modalFooter = modal.querySelector('.modal-footer');
              modalFooter.insertBefore(alertDiv, modalFooter.firstChild);
            }
            
            alertDiv.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>${data.message}`;
            alertDiv.style.display = 'block';
            
            // Marcar en rojo el campo de precio si hay error en precio_unitario
            const precioInput = this.querySelector('[name="precio_unitario"]');
            if (data.errors && data.errors.precio_unitario) {
                if (precioInput) precioInput.classList.add('is-invalid');
            } else {
                if (precioInput) precioInput.classList.remove('is-invalid');
            }
            // Marcar en rojo el campo de código si hay error en codigo
            const codigoInput = this.querySelector('[name="codigo"]');
            if ((data.errors && data.errors.codigo) || data.field === "codigo") {
                if (codigoInput) codigoInput.classList.add('is-invalid');
            } else {
                if (codigoInput) codigoInput.classList.remove('is-invalid');
            }
            // Mostrar errores específicos de campos si existen
            // if (data.errors) {
            //   Object.keys(data.errors).forEach(field => {
            //     const input = this.querySelector(`[name="${field}"]`);
            //     if (input) {
            //       input.classList.add('is-invalid');
            //       const errorDiv = input.parentNode.querySelector('.invalid-feedback') || 
            //                       input.parentNode.appendChild(document.createElement('div'));
            //       errorDiv.className = 'invalid-feedback';
            //       errorDiv.textContent = data.errors[field];
            //     }
            //   });
            // }
          }
          
          // Restaurar botón
          submitButton.disabled = false;
          submitButton.innerHTML = originalText;
        } else {
        }
      })
      .catch(error => {
        console.error('Error en editar:', error);
        
        // Si hay error, actualizar tabla
        if (typeof refreshTable === 'function') {
          refreshTable();
        } else if (typeof updateTableContent === 'function') {
          updateTableContent(window.location.href);
        } else {
        window.location.reload();
        }
      });
      
      return false;
    });
  } else {
  }
});

// Función para mostrar mensajes en el modal
function mostrarMensajeEnModal(modalId, mensaje, tipo) {
  
  const modal = document.getElementById(modalId);
  let alertDiv = modal.querySelector('.modal-alert');
  
  // Crear div de alerta si no existe
  if (!alertDiv) {
    alertDiv = document.createElement('div');
    alertDiv.className = 'modal-alert alert mt-3';
    alertDiv.style.display = 'none';
    
    // Insertar al inicio del modal-footer (arriba de los botones)
    const modalFooter = modal.querySelector('.modal-footer');
    modalFooter.insertBefore(alertDiv, modalFooter.firstChild);
  }
  
  // Configurar el mensaje
  alertDiv.className = `modal-alert alert alert-${tipo} mt-3 text-center`;
  
  // Icono según el tipo
  let icon = 'bi-exclamation-triangle';
  if (tipo === 'success') {
    icon = 'bi-check-circle';
  } else if (tipo === 'info') {
    icon = 'bi-info-circle';
  }
  
  alertDiv.innerHTML = `
    <i class="bi ${icon} me-2"></i>
    ${mensaje}
  `;
  alertDiv.style.display = 'block';
  
  
  // Auto-ocultar mensajes de error después de 5 segundos
  if (tipo === 'danger' || tipo === 'warning') {
    setTimeout(() => {
      alertDiv.style.display = 'none';
    }, 5000);
  }
}

// Función para mostrar notificaciones push modernas
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

// Función para mostrar mensaje con botón deshacer
function mostrarMensajeConDeshacer(mensaje, productoId) {
  
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
          <button id="btnDeshacerEliminacion" 
                  onclick="restaurarProducto(${productoId}, this)" 
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
  
  // Efecto hover
  notification.addEventListener('mouseenter', () => {
    notification.style.transform = 'translateX(0) scale(1.02)';
    progressBar.style.transition = 'none';
  });
  
  notification.addEventListener('mouseleave', () => {
    notification.style.transform = 'translateX(0) scale(1)';
    progressBar.style.transition = 'transform 10s linear';
  });
}

// Función para restaurar producto
function restaurarProducto(productoId, button) {
  
  // Deshabilitar botón
  button.disabled = true;
  button.textContent = 'Restaurando...';
  button.style.opacity = '0.7';
  
  // Enviar petición para restaurar
  fetch(`/producto/restaurar/${productoId}/`, {
    method: 'POST',
    headers: {
      'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Mostrar mensaje de éxito
      mostrarMensajeEnPagina(data.message, 'success');
      
      // Actualizar tabla
      actualizarTablaProductos();
      
      // Remover la notificación de eliminación
      const notification = button.closest('.notification');
      if (notification) {
        notification.remove();
      }
    } else {
      // Mostrar error
      alert('Error al restaurar el producto: ' + data.message);
      
      // Restaurar botón
      button.disabled = false;
      button.textContent = 'Deshacer';
      button.style.opacity = '1';
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Error al restaurar el producto');
    
    // Restaurar botón
    button.disabled = false;
    button.textContent = 'Deshacer';
    button.style.opacity = '1';
  });
}

// Función para actualizar la tabla de productos dinámicamente
function actualizarTablaProductos() {
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
  
  // Usar el sistema unificado de tablas
  if (typeof refreshTable === 'function') {
    refreshTable();
  } else if (typeof updateTableContent === 'function') {
    updateTableContent(window.location.href);
        } else {
    // Fallback: recargar la página completa
    window.location.reload();
  }
}

// Limpiar mensajes al abrir modal de eliminación
deleteProductModal.addEventListener('show.bs.modal', function() {
  const alertDiv = this.querySelector('.modal-alert');
  if (alertDiv) alertDiv.style.display = 'none';
});

// Limpiar mensajes al abrir modal de agregar
const addProductModal = document.getElementById('addProductModal');
addProductModal.addEventListener('show.bs.modal', function() {
  const alertDiv = this.querySelector('.modal-alert');
  if (alertDiv) alertDiv.style.display = 'none';
  
  // Limpiar el formulario
  const form = this.querySelector('form');
  if (form) {
    form.reset();
  }
  
  // Limpiar categorías seleccionadas
  categoriasSeleccionadas['add'] = [];
  actualizarBadgesCategorias('add');
  
  // Limpiar clases de validación
  const inputs = this.querySelectorAll('.form-control');
  inputs.forEach(input => {
    input.classList.remove('is-invalid', 'is-valid');
  });
  
  // Limpiar mensajes de error
  const errorDivs = this.querySelectorAll('.invalid-feedback');
  errorDivs.forEach(div => {
    div.textContent = '';
  });
  
  // Inicializar autocompletado de categorías para el modal de agregar
  setTimeout(() => {
    inicializarCategoriaInputs('add');
  }, 100);
});

// Corregir problema de accesibilidad al cerrar modal
addProductModal.addEventListener('hidden.bs.modal', function() {
  // Remover aria-hidden cuando el modal se cierra
  this.removeAttribute('aria-hidden');
  
  // Asegurar que el foco vuelva al botón que abrió el modal
  const triggerButton = document.querySelector('[data-bs-target="#addProductModal"]');
  if (triggerButton) {
    triggerButton.focus();
  }
});

// Al abrir el modal de agregar producto, limpiar clases de error
addProductModal.addEventListener('show.bs.modal', function () {
  const precioInput = this.querySelector('[name="precio_unitario"]');
  const codigoInput = this.querySelector('[name="codigo"]');
  if (precioInput) precioInput.classList.remove('is-invalid');
  if (codigoInput) codigoInput.classList.remove('is-invalid');
  // Limpiar mensaje de error global
  const alertDiv = this.querySelector('.modal-alert');
  if (alertDiv) alertDiv.remove();
});
// Al abrir el modal de editar producto, limpiar clases de error
editProductModal.addEventListener('show.bs.modal', function () {
  const precioInput = this.querySelector('[name="precio_unitario"]');
  const codigoInput = this.querySelector('[name="codigo"]');
  if (precioInput) precioInput.classList.remove('is-invalid');
  if (codigoInput) codigoInput.classList.remove('is-invalid');
});

// Ya existe la declaración de deleteProductModal arriba, solo agregar el event listener aquí
if (deleteProductModal) {
    deleteProductModal.addEventListener('hidden.bs.modal', function () {
        const alertDiv = deleteProductModal.querySelector('.modal-alert');
        if (alertDiv) {
            alertDiv.remove();
        }
    });
}


$(document).ready(function () {
  // El sistema unificado de tablas maneja la búsqueda, ordenamiento y paginación
  // No necesitamos inicializar DataTables aquí

  // Hacer funciones disponibles globalmente
  window.removerCategoria = removerCategoria;
  window.toggleCategoria = toggleCategoria;
  
  // Inicializar el listener global para cerrar opciones al hacer clic fuera
  // Usar click con capture: false para que se ejecute después de los eventos de las opciones
  document.addEventListener('click', function(e) {
    // Usar setTimeout para que se ejecute después de que se procesen los eventos de las opciones
    setTimeout(() => {
      handleClickOutsideCategorias(e);
    }, 150);
  }, false);
});

// Funciones para selección múltiple de categorías con checkboxes
let categoriasSeleccionadas = {
  'add': [],
  'edit': []
};

// Bandera para prevenir que el click fuera se ejecute inmediatamente
let categoriaClickJustHappened = false;
let categoriaClickTimeout = null;
let categoriaOptionClickJustHappened = false;
let categoriaOptionClickTimeout = null;

function inicializarCategoriaInputs(mode) {
  const categoriaContainer = document.getElementById(`${mode}-categoria-container`);
  const categoriaInput = document.getElementById(`${mode}-categoria`);
  const categoriaBtn = document.getElementById(`${mode}-categoria-btn`);
  const categoriaOptions = document.getElementById(`${mode}-categoria-options`);

  if (!categoriaInput || !categoriaOptions) {
    console.error(`No se encontraron los elementos para ${mode}`);
    return;
  }
  
  // Función para abrir/cerrar opciones usando mousedown
  const toggleOptions = function(e) {
    // Si el click fue dentro del panel de opciones, no hacer nada
    if (categoriaOptions && categoriaOptions.contains(e.target)) {
      return;
    }
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    
    // Marcar que acaba de ocurrir un click
    categoriaClickJustHappened = true;
    
    // Limpiar timeout anterior si existe
    if (categoriaClickTimeout) {
      clearTimeout(categoriaClickTimeout);
    }
    
    // Resetear la bandera después de 300ms
    categoriaClickTimeout = setTimeout(() => {
      categoriaClickJustHappened = false;
    }, 300);
    
    
    // Usar setTimeout para asegurar que se ejecute después del evento de click
    setTimeout(() => {
      // Si las opciones están vacías o no se han cargado, cargarlas primero
      if (categoriaOptions.innerHTML === '' || categoriaOptions.innerHTML.trim() === '') {
        // Agregar clase open para activar animación de rotación
        const btn = document.getElementById(`${mode}-categoria-btn`);
        if (btn) {
          btn.classList.add('open');
        }
        cargarTodasLasCategorias(mode);
      } else {
        toggleCategoriaOptions(mode);
      }
    }, 0);
  };
  
  // Solo agregar listeners al input y botón, NO al contenedor completo
  // Esto evita que se abran las opciones al hacer clic en las etiquetas
  if (categoriaInput) {
    categoriaInput.addEventListener('mousedown', function(e) {
      e.stopPropagation();
      toggleOptions(e);
    }, true);
    categoriaInput.addEventListener('focus', function(e) {
      e.preventDefault();
      toggleOptions(e);
    }, true);
  }
  
  if (categoriaBtn) {
    categoriaBtn.addEventListener('mousedown', function(e) {
      e.stopPropagation();
      toggleOptions(e);
    }, true);
  }
  
  // Prevenir que los clics en las etiquetas abran las opciones
  // PERO permitir que el botón de cerrar (X) funcione
  const categoriasSelected = document.getElementById(`${mode}-categorias-selected`);
  if (categoriasSelected) {
    categoriasSelected.addEventListener('mousedown', function(e) {
      // Si el clic fue en el botón de cerrar o en sus hijos (el icono X), no hacer nada
      if (e.target.classList.contains('btn-close') || 
          e.target.closest('.btn-close') || 
          e.target.tagName === 'BUTTON' && e.target.classList.contains('btn-close')) {
        return; // Dejar que el onclick del botón funcione
      }
      // Si el clic fue en la etiqueta (badge) pero no en el botón, prevenir que abra las opciones
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, false); // Cambiar a false para que se ejecute después del onclick del botón
    
    categoriasSelected.addEventListener('click', function(e) {
      // Si el clic fue en el botón de cerrar o en sus hijos, no hacer nada
      if (e.target.classList.contains('btn-close') || 
          e.target.closest('.btn-close') || 
          e.target.tagName === 'BUTTON' && e.target.classList.contains('btn-close')) {
        return; // Dejar que el onclick del botón funcione
      }
      // Si el clic fue en la etiqueta pero no en el botón, prevenir que abra las opciones
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, false); // Cambiar a false para que se ejecute después del onclick del botón
  }
  
  // Prevenir que los clicks dentro del panel de opciones se propaguen
  if (categoriaOptions) {
    categoriaOptions.addEventListener('mousedown', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);
    
    categoriaOptions.addEventListener('click', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);
  }
  
}

function toggleCategoriaOptions(mode) {
  const options = document.getElementById(`${mode}-categoria-options`);
  const container = document.getElementById(`${mode}-categoria-container`);
  
  if (!options) {
    console.error(`No se encontró el elemento ${mode}-categoria-options`);
    return;
  }
  
  const isVisible = options.style.display !== 'none' && options.style.display !== '';
  
  const btn = document.getElementById(`${mode}-categoria-btn`);
  
  if (!isVisible) {
    // Mostrar opciones
    options.style.display = 'block';
    
    // Agregar clase open para activar animación de rotación
    if (btn) {
      btn.classList.add('open');
    }
    
    // Ajustar el ancho para que coincida exactamente con el contenedor
    // Usar requestAnimationFrame para asegurar que el DOM esté actualizado
    requestAnimationFrame(() => {
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        options.style.width = containerWidth + 'px';
        options.style.left = '0px';
      }
    });
    
    if (options.innerHTML === '' || options.innerHTML.trim() === '') {
      cargarTodasLasCategorias(mode);
    }
  } else {
    // Ocultar opciones
    options.style.display = 'none';
    
    // Quitar clase open para restaurar flecha
    if (btn) {
      btn.classList.remove('open');
    }
  }
}

function cargarTodasLasCategorias(mode) {
  const options = document.getElementById(`${mode}-categoria-options`);
  if (!options) {
    console.error(`No se encontró el elemento ${mode}-categoria-options`);
    return;
  }
  
  // Asegurar que la flecha esté rotada cuando se cargan las opciones
  const btn = document.getElementById(`${mode}-categoria-btn`);
  if (btn) {
    btn.classList.add('open');
  }
  
  // Mostrar loading
  options.innerHTML = '<div class="list-group-item text-center text-muted">Cargando categorías...</div>';
  options.style.display = 'block';
  
  fetch('/producto/autocomplete_categorias/?q=&all=true')
    .then(res => {
      if (!res.ok) {
        throw new Error('Error en la respuesta del servidor');
      }
      return res.json();
    })
    .then(data => {
      const categorias = data.results || [];
      if (categorias.length === 0) {
        options.innerHTML = '<div class="list-group-item text-center text-muted">No hay categorías disponibles</div>';
      } else {
        renderCategoriaCheckboxes(mode, categorias);
      }
    })
    .catch(error => {
      console.error('Error al cargar categorías:', error);
      options.innerHTML = '<div class="list-group-item text-center text-danger">Error al cargar categorías. Intenta recargar la página.</div>';
    });
}

function renderCategoriaCheckboxes(mode, categorias) {
  const options = document.getElementById(`${mode}-categoria-options`);
  if (!options) return;
  
  options.innerHTML = '';
  
  if (categorias.length === 0) {
    options.innerHTML = '<div class="list-group-item text-center text-muted">No hay categorías disponibles</div>';
    return;
  }
  
  const categoriasSeleccionadasIds = categoriasSeleccionadas[mode].map(c => c.id);
  
  categorias.forEach((categoria) => {
    const div = document.createElement('div');
    div.className = 'list-group-item';
    div.style.cssText = 'padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid #f8f9fa;';
    
    const isSelected = categoriasSeleccionadasIds.includes(categoria.id);
    const categoriaNombreEscapado = categoria.nombre.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    div.innerHTML = `
      <div class="form-check d-flex align-items-center">
        <input class="form-check-input" type="checkbox" value="${categoria.id}" id="cat-${mode}-${categoria.id}" 
               ${isSelected ? 'checked' : ''}>
        <label class="form-check-label ms-2 flex-grow-1" for="cat-${mode}-${categoria.id}" style="cursor: pointer; margin: 0;">
          <strong>${categoria.nombre}</strong>
        </label>
      </div>
    `;
    
    const checkbox = div.querySelector('input[type="checkbox"]');
    
    // Agregar listener a toda la fila para permitir click en cualquier parte
    div.addEventListener('click', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Si el click fue directamente en el checkbox, el estado ya cambió automáticamente
      // Si el click fue en otra parte, cambiar el estado manualmente
      if (e.target !== checkbox) {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
      }
      
      // Ejecutar toggle basado en el estado actual del checkbox
      // Usar setTimeout para asegurar que el estado del checkbox se haya actualizado
      setTimeout(() => {
        toggleCategoria(mode, categoria.id, categoria.nombre);
      }, 0);
    }, true);
    
    // Agregar listener al checkbox para el evento change (cuando se hace clic directamente en el checkbox)
    checkbox.addEventListener('change', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      toggleCategoria(mode, categoria.id, categoria.nombre);
    }, true);
    
    options.appendChild(div);
  });
}

function toggleCategoria(mode, categoriaId, categoriaNombre) {
  const checkbox = document.getElementById(`cat-${mode}-${categoriaId}`);
  if (!checkbox) return;
  
  if (checkbox.checked) {
    // Agregar categoría si no está ya seleccionada
    if (!categoriasSeleccionadas[mode].some(c => c.id === categoriaId)) {
      categoriasSeleccionadas[mode].push({ id: categoriaId, nombre: categoriaNombre });
      actualizarBadgesCategorias(mode);
    }
      } else {
    // Remover categoría
    categoriasSeleccionadas[mode] = categoriasSeleccionadas[mode].filter(c => c.id !== categoriaId);
    actualizarBadgesCategorias(mode);
  }
}

function handleClickOutsideCategorias(e) {
  // Si acaba de ocurrir un click en el campo de categoría, ignorar este evento
  if (categoriaClickJustHappened) {
    return;
  }
  
  const addCategoriaContainer = document.getElementById('add-categoria-container');
  const addCategoriaInput = document.getElementById('add-categoria');
  const addCategoriaBtn = document.getElementById('add-categoria-btn');
  const addCategoriaOptions = document.getElementById('add-categoria-options');
  const editCategoriaContainer = document.getElementById('edit-categoria-container');
  const editCategoriaInput = document.getElementById('edit-categoria');
  const editCategoriaBtn = document.getElementById('edit-categoria-btn');
  const editCategoriaOptions = document.getElementById('edit-categoria-options');
  const addCategoriasSelected = document.getElementById('add-categorias-selected');
  const editCategoriasSelected = document.getElementById('edit-categorias-selected');

  // Verificar si el click fue dentro del panel de opciones (verificar el elemento y todos sus ancestros)
  let clickedInAddOptions = false;
  let clickedInEditOptions = false;
  
  if (addCategoriaOptions) {
    let element = e.target;
    while (element && element !== document.body) {
      if (element === addCategoriaOptions || element.id === 'add-categoria-options') {
        clickedInAddOptions = true;
        break;
      }
      element = element.parentElement;
    }
  }
  
  if (editCategoriaOptions) {
    let element = e.target;
    while (element && element !== document.body) {
      if (element === editCategoriaOptions || element.id === 'edit-categoria-options') {
        clickedInEditOptions = true;
        break;
      }
      element = element.parentElement;
    }
  }
  
  // Si el click fue dentro de las opciones, no cerrar
  if (clickedInAddOptions || clickedInEditOptions) {
    return;
  }

  // Verificar para modal de agregar
  if (addCategoriaOptions && addCategoriaOptions.style.display !== 'none' && addCategoriaOptions.style.display !== '') {
    const clickedInside = 
      (addCategoriaContainer && addCategoriaContainer.contains(e.target)) ||
      (addCategoriaInput && addCategoriaInput.contains(e.target)) ||
      (addCategoriaBtn && addCategoriaBtn.contains(e.target)) ||
      (addCategoriasSelected && addCategoriasSelected.contains(e.target));
    
    if (!clickedInside) {
      addCategoriaOptions.style.display = 'none';
      // Quitar clase open cuando se cierra desde fuera
      if (addCategoriaBtn) {
        addCategoriaBtn.classList.remove('open');
      }
    }
  }

  // Verificar para modal de editar
  if (editCategoriaOptions && editCategoriaOptions.style.display !== 'none' && editCategoriaOptions.style.display !== '') {
    const clickedInside = 
      (editCategoriaContainer && editCategoriaContainer.contains(e.target)) ||
      (editCategoriaInput && editCategoriaInput.contains(e.target)) ||
      (editCategoriaBtn && editCategoriaBtn.contains(e.target)) ||
      (editCategoriasSelected && editCategoriasSelected.contains(e.target));
    
    if (!clickedInside) {
      editCategoriaOptions.style.display = 'none';
      // Quitar clase open cuando se cierra desde fuera
      if (editCategoriaBtn) {
        editCategoriaBtn.classList.remove('open');
      }
    }
  }
}

// Función obsoleta - ya no se usa

// Función para actualizar checkboxes cuando se remueve una categoría
function actualizarCheckboxesCategorias(mode) {
  const options = document.getElementById(`${mode}-categoria-options`);
  if (!options) return;
  
  const checkboxes = options.querySelectorAll('input[type="checkbox"]');
  const categoriasSeleccionadasIds = categoriasSeleccionadas[mode].map(c => c.id);
  
  checkboxes.forEach(checkbox => {
    const categoriaId = parseInt(checkbox.value);
    checkbox.checked = categoriasSeleccionadasIds.includes(categoriaId);
  });
}

function actualizarBadgesCategorias(mode) {
  const container = document.getElementById(`${mode}-categorias-selected`);
  const hidden = document.getElementById(`${mode}-categorias-hidden`);
  const input = document.getElementById(`${mode}-categoria`);
  const categoriaContainer = document.getElementById(`${mode}-categoria-container`);
  
  if (!container) return;
  
  container.innerHTML = '';
  
  categoriasSeleccionadas[mode].forEach((categoria) => {
    const badge = document.createElement('span');
    badge.className = 'badge bg-primary rounded-pill d-flex align-items-center gap-1';
    badge.style.cssText = 'padding: 0.4em 0.75em; font-size: 0.85rem; font-weight: 500;';
    badge.innerHTML = `
      ${categoria.nombre}
      <button type="button" class="btn-close btn-close-white" style="font-size: 0.7em; margin-left: 0.25em;" 
              data-categoria-id="${categoria.id}" data-mode="${mode}" aria-label="Remover"></button>
    `;
    container.appendChild(badge);
    
    // Agregar listener al botón de cerrar
    const closeBtn = badge.querySelector('.btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        removerCategoria(mode, categoria.id);
      }, true);
    }
  });
  
  // Actualizar campo hidden con los IDs separados por comas
  if (hidden) {
    const ids = categoriasSeleccionadas[mode].map(c => c.id).join(',');
    hidden.value = ids;
  }
  
  // Mostrar u ocultar el input según si hay categorías seleccionadas
  if (input) {
    if (categoriasSeleccionadas[mode].length > 0) {
      input.style.display = 'none';
      input.style.opacity = '0';
      input.placeholder = '';
    } else {
      input.style.display = 'block';
      input.style.opacity = '1';
      input.placeholder = 'Seleccionar Categoría(s)...';
    }
  }
  
  // Asegurar que el contenedor de badges sea visible
  if (container) {
    container.style.display = categoriasSeleccionadas[mode].length > 0 ? 'flex' : 'none';
  }
  
}

function removerCategoria(mode, categoriaId) {
  // Prevenir que se abran las opciones al remover una categoría
  if (categoriaClickJustHappened) {
    categoriaClickJustHappened = false;
    if (categoriaClickTimeout) {
      clearTimeout(categoriaClickTimeout);
      categoriaClickTimeout = null;
    }
  }
  
  categoriasSeleccionadas[mode] = categoriasSeleccionadas[mode].filter(c => c.id !== categoriaId);
  actualizarBadgesCategorias(mode);
  actualizarCheckboxesCategorias(mode);
  
  // Cerrar las opciones si están abiertas
  const categoriaOptions = document.getElementById(`${mode}-categoria-options`);
  if (categoriaOptions && categoriaOptions.style.display !== 'none') {
    categoriaOptions.style.display = 'none';
  }
}

// Función para actualizar checkboxes cuando se carga el modal de editar
function actualizarCheckboxesAlCargar(mode) {
  const options = document.getElementById(`${mode}-categoria-options`);
  if (options && options.style.display !== 'none' && options.innerHTML !== '') {
    actualizarCheckboxesCategorias(mode);
  }
}

// Funcionalidad del contador de caracteres para descripción
function inicializarContadorCaracteres() {
  // Contador para modal de agregar
  const addDescripcion = document.getElementById('add-descripcion');
  const addCounter = document.getElementById('add-descripcion-counter');
  
  if (addDescripcion && addCounter) {
    addDescripcion.addEventListener('input', function() {
      addCounter.textContent = this.value.length;
    });
    
    // Inicializar contador
    addCounter.textContent = addDescripcion.value.length;
  }
  
  // Contador para modal de editar
  const editDescripcion = document.getElementById('edit-descripcion');
  const editCounter = document.getElementById('edit-descripcion-counter');
  
  if (editDescripcion && editCounter) {
    editDescripcion.addEventListener('input', function() {
      editCounter.textContent = this.value.length;
    });
    
    // Inicializar contador
    editCounter.textContent = editDescripcion.value.length;
  }
}

// Inicializar contadores cuando se cargan los modales
document.addEventListener('DOMContentLoaded', function() {
  inicializarContadorCaracteres();
});

// Reinicializar contadores cuando se abren los modales
if (addProductModal) {
  addProductModal.addEventListener('shown.bs.modal', function() {
    setTimeout(() => {
      inicializarContadorCaracteres();
    }, 100);
  });
}

if (editProductModal) {
  editProductModal.addEventListener('shown.bs.modal', function() {
    setTimeout(() => {
      inicializarContadorCaracteres();
    }, 100);
  });
}

// Quitar borde rojo al escribir en código o precio (agregar y editar)
function inicializarListenersInputsProducto() {
  document.querySelectorAll('[name="codigo"], [name="precio_unitario"]').forEach(input => {
    input.addEventListener('input', function() {
      this.classList.remove('is-invalid');
    });
  });
}
// Inicializar listeners al abrir los modales
addProductModal.addEventListener('shown.bs.modal', inicializarListenersInputsProducto);
editProductModal.addEventListener('shown.bs.modal', inicializarListenersInputsProducto);

