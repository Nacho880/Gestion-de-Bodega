// Modales edición y eliminación 
const editCategoryModal = document.getElementById('editCategoryModal');
const deleteCategoryModal = document.getElementById('deleteCategoryModal');

editCategoryModal.addEventListener('show.bs.modal', function (event) {
  const button = event.relatedTarget;
  const id = button.getAttribute('data-id');
  const nombre = button.getAttribute('data-nombre');
  const descripcion = button.getAttribute('data-descripcion');

  document.getElementById('edit-id').value = id;
  document.getElementById('edit-nombre').value = nombre;
  document.getElementById('edit-descripcion').value = descripcion;

  document.getElementById('editCategoryForm').action = `/categoria/editar/${id}/`;
});

deleteCategoryModal.addEventListener('show.bs.modal', function (event) {
  const button = event.relatedTarget;
  const id = button.getAttribute('data-id');
  const nombre = button.getAttribute('data-nombre');

  document.getElementById('delete-id').value = id;
  document.getElementById('delete-nombre').textContent = nombre;

  document.getElementById('deleteCategoryForm').action = `/categoria/eliminar/${id}/`;
});

$(document).ready(function () {
  // Variables para el modal de eliminación
  let idCategoriaEliminar = null;
  let filaCategoria = null;

  // La búsqueda ahora se maneja en unified-table.js con búsqueda en tiempo real

  // Abrir modal de eliminación y guardar datos
  $(document).on('click', 'button[data-bs-target="#deleteCategoryModal"]', function () {
    idCategoriaEliminar = $(this).data('id');
    filaCategoria = $(this).closest('tr');
    const nombre = $(this).data('nombre');
    $('#delete-nombre').text(nombre);
    // También establecer el valor en el input hidden por si acaso
    const deleteIdInput = document.getElementById('delete-id');
    if (deleteIdInput) {
      deleteIdInput.value = idCategoriaEliminar;
    }
  });

  // Confirmar eliminación por AJAX
  $('#deleteCategoryForm').on('submit', function (e) {
    e.preventDefault();
    
    // Obtener el ID del input hidden o de la variable
    const idInput = document.getElementById('delete-id');
    const categoriaId = idCategoriaEliminar || (idInput ? idInput.value : null);
    
    if (!categoriaId) {
      console.error('No se pudo obtener el ID de la categoría a eliminar');
      mostrarMensajeEnPagina('Error: No se pudo obtener el ID de la categoría.', 'danger');
      return;
    }
    
    // Si no tenemos la fila, intentar obtenerla
    if (!filaCategoria || filaCategoria.length === 0) {
      filaCategoria = $(`button[data-id="${categoriaId}"]`).closest('tr');
    }
    
    
    $.ajax({
      url: `/categoria/eliminar/${categoriaId}/`,
      type: 'POST',
      data: {
        'csrfmiddlewaretoken': $('[name=csrfmiddlewaretoken]').val()
      },
      success: function (data) {
        // Cerrar modal
        $('#deleteCategoryModal').modal('hide');
        
        // Guardar datos de la categoría eliminada en sessionStorage para poder restaurarla
        const categoriaEliminada = {
          id: categoriaId,
          nombre: $('#delete-nombre').text(),
          filaHtml: filaCategoria && filaCategoria.length > 0 ? filaCategoria.prop('outerHTML') : '',
          timestamp: new Date().getTime()
        };
        sessionStorage.setItem('categoriaEliminada', JSON.stringify(categoriaEliminada));
        
        // Actualizar la tabla dinámicamente en lugar de ocultar la fila
        actualizarTablaCategorias();
        
        // Mostrar mensaje de éxito con opción de deshacer (usar mensaje del servidor)
        const mensaje = data.message || `La categoría <strong>${$('#delete-nombre').text()}</strong> fue eliminada.`;
        mostrarMensajeConDeshacer(mensaje, categoriaId);
      },
      error: function (xhr, status, error) {
        
        $('#deleteCategoryModal').modal('hide');
        let mensaje = 'Error al eliminar la categoría.';
        
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.message) {
            mensaje = response.message;
          }
        } catch (e) {
        }
        
        // Mostrar mensaje de error
        mostrarMensajeEnPagina(mensaje, 'danger');
      }
    });
  });

  // Manejar el envío del formulario de agregar categoría con AJAX
  const addCategoryForm = document.getElementById('addCategoryModal').querySelector('form');
  
  if (addCategoryForm) {
    
    addCategoryForm.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopPropagation();
      
      const formData = new FormData(this);
      const modal = document.getElementById('addCategoryModal');
      const submitButton = modal.querySelector('button[type="submit"]');
      const originalText = submitButton.innerHTML;
      
      // Deshabilitar botón y mostrar loading
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Guardando...';
      
      fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(response => response.json().catch(() => null))
      .then(data => {
        // Limpiar mensajes de error previos
        let alertDiv = modal.querySelector('.modal-alert');
        if (alertDiv) alertDiv.remove();
        const alertContainer = modal.querySelector('.modal-alert-container');
        if (alertContainer) alertContainer.innerHTML = '';
        const inputs = modal.querySelectorAll('.is-invalid');
        inputs.forEach(input => input.classList.remove('is-invalid'));
        const feedbacks = modal.querySelectorAll('.invalid-feedback');
        feedbacks.forEach(fb => fb.remove());

        if (data && data.success) {
          const modalInstance = bootstrap.Modal.getInstance(document.getElementById('addCategoryModal'));
          if (modalInstance) modalInstance.hide();
          mostrarMensajeEnPagina(data.message, 'success');
          actualizarTablaCategorias();
        } else if (data && data.errors) {
          // Mostrar solo mensaje general en el contenedor fijo
          if (alertContainer) {
            alertContainer.innerHTML = `<div class='modal-alert alert alert-danger mt-3 text-center'><i class=\"bi bi-exclamation-triangle me-2\"></i>${data.message}</div>`;
          }
        } else {
          mostrarMensajeEnPagina('Error inesperado al agregar la categoría.', 'danger');
        }
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      })
      .catch(() => {
        mostrarMensajeEnPagina('Error inesperado al agregar la categoría.', 'danger');
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      });
      return false;
    });
  } else {
  }
  
  // Manejar el envío del formulario de editar categoría con AJAX
  const editCategoryForm = document.getElementById('editCategoryModal').querySelector('form');
  
  if (editCategoryForm) {
    
    editCategoryForm.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopPropagation();

      const formData = new FormData(this);
      const modal = document.getElementById('editCategoryModal');
      const submitButton = modal.querySelector('button[type="submit"]');
      const originalText = submitButton.innerHTML;

      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Guardando...';

      fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(response => response.json().catch(() => null))
      .then(data => {
        // Limpiar mensajes de error previos
        let alertDiv = modal.querySelector('.modal-alert');
        if (alertDiv) alertDiv.remove();
        const alertContainer = modal.querySelector('.modal-alert-container');
        if (alertContainer) alertContainer.innerHTML = '';
        const inputs = modal.querySelectorAll('.is-invalid');
        inputs.forEach(input => input.classList.remove('is-invalid'));
        const feedbacks = modal.querySelectorAll('.invalid-feedback');
        feedbacks.forEach(fb => fb.remove());

        if (data && data.success) {
          const modalInstance = bootstrap.Modal.getInstance(document.getElementById('editCategoryModal'));
          if (modalInstance) modalInstance.hide();
          mostrarMensajeEnPagina(data.message, 'success');
          actualizarTablaCategorias();
        } else if (data && data.errors) {
          // Mostrar solo mensaje general en el contenedor fijo
          if (alertContainer) {
            alertContainer.innerHTML = `<div class='modal-alert alert alert-danger mt-3 text-center'><i class=\"bi bi-exclamation-triangle me-2\"></i>${data.message}</div>`;
          }
        } else {
          mostrarMensajeEnPagina('Error inesperado al editar la categoría.', 'danger');
        }
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      })
      .catch(() => {
        mostrarMensajeEnPagina('Error inesperado al editar la categoría.', 'danger');
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      });
    });
  } else {
  }

  const addCategoryModal = document.getElementById('addCategoryModal');
  if (addCategoryModal) {
    addCategoryModal.addEventListener('hidden.bs.modal', function () {
      const form = addCategoryModal.querySelector('form');
      if (form) {
        form.reset();
      }
      // Limpiar contadores de caracteres si existen
      const nombreCounter = document.getElementById('add-nombre-counter');
      if (nombreCounter) nombreCounter.textContent = '0';
      const descripcionCounter = document.getElementById('add-descripcion-counter');
      if (descripcionCounter) descripcionCounter.textContent = '0';
      // Limpiar mensajes de error
      const alertDiv = addCategoryModal.querySelector('.modal-alert');
      if (alertDiv) alertDiv.remove();
      const alertContainer = addCategoryModal.querySelector('.modal-alert-container');
      if (alertContainer) alertContainer.innerHTML = '';
      // Limpiar clases de error
      const inputs = addCategoryModal.querySelectorAll('.is-invalid');
      inputs.forEach(input => input.classList.remove('is-invalid'));
      const feedbacks = addCategoryModal.querySelectorAll('.invalid-feedback');
      feedbacks.forEach(fb => fb.remove());
    });
  }
});

// Función para mostrar notificaciones push modernas (igual que en productos)
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

// Función para mostrar mensaje con botón deshacer (igual que en productos)
function mostrarMensajeConDeshacer(mensaje, categoriaId) {
  
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
                  onclick="restaurarCategoria(${categoriaId}, this)" 
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

// Función para restaurar categoría (llamada desde el botón deshacer)
function restaurarCategoria(categoriaId, button) {
  const categoriaEliminadaStr = sessionStorage.getItem('categoriaEliminada');
  if (!categoriaEliminadaStr) return;
  
  const categoriaEliminada = JSON.parse(categoriaEliminadaStr);
  
  // Verificar que no hayan pasado más de 5 minutos (300000 ms)
  const tiempoTranscurrido = new Date().getTime() - categoriaEliminada.timestamp;
  if (tiempoTranscurrido > 300000) {
    alert('El tiempo para deshacer ha expirado (5 minutos).');
    sessionStorage.removeItem('categoriaEliminada');
    return;
  }
  
  
  // Hacer petición AJAX para restaurar la categoría en la base de datos
  $.ajax({
    url: `/categoria/restaurar/${categoriaEliminada.id}/`,
    type: 'POST',
    data: {
      'csrfmiddlewaretoken': $('[name=csrfmiddlewaretoken]').val()
    },
    success: function (data) {
      
      // Ocultar la notificación actual
      const notification = button.closest('.notification');
      if (notification) {
        notification.remove();
      }
      
      // Limpiar datos del sessionStorage
      sessionStorage.removeItem('categoriaEliminada');
      
      // Actualizar la tabla completa usando AJAX para respetar el ordenamiento actual
      const url = new URL(window.location.href);
      // Preservar parámetros de búsqueda, ordenamiento y paginación
      
      fetch(url.toString(), {
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
        const tableWrapper = document.querySelector('.unified-table-wrapper') || document.querySelector('#table-wrapper');
        if (tableWrapper) {
          // El HTML recibido ya contiene solo el contenido de la tabla
          tableWrapper.innerHTML = html;
          
          // Re-inicializar event listeners
          if (typeof initializeTableEvents === 'function') {
            initializeTableEvents();
      }
      
      // Mostrar mensaje de restauración exitosa
      mostrarMensajeEnPagina('Categoría restaurada correctamente.', 'success');
        } else {
          // Si no encuentra el contenedor, actualizar tabla
          if (typeof refreshTable === 'function') {
            refreshTable();
          } else if (typeof updateTableContent === 'function') {
            updateTableContent(window.location.href);
          } else {
          window.location.reload();
          }
        }
      })
      .catch(error => {
        console.error('Error al actualizar tabla después de restaurar:', error);
        // Fallback: actualizar tabla
        if (typeof refreshTable === 'function') {
          refreshTable();
        } else if (typeof updateTableContent === 'function') {
          updateTableContent(window.location.href);
        } else {
        window.location.reload();
        }
      });
    },
    error: function (xhr, status, error) {
      
      let mensaje = 'Error al restaurar la categoría.';
      
      try {
        const response = JSON.parse(xhr.responseText);
        if (response.message) {
          mensaje = response.message;
        }
      } catch (e) {
      }
      
      // Mostrar mensaje de error
      mostrarMensajeEnPagina(mensaje, 'danger');
    }
  });
}

// Función para actualizar la tabla de categorías dinámicamente
function actualizarTablaCategorias() {
  // Buscar el contenedor de la tabla
  let tableWrapper = document.getElementById('table-wrapper') || document.querySelector('.unified-table-wrapper');
  
  // Si no existe el contenedor de la tabla, buscar el div con el mensaje "No hay categorías"
  if (!tableWrapper) {
    // Buscar el div que contiene el mensaje de "No hay categorías registradas"
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

// Funcionalidad del contador de caracteres para categorías
function inicializarContadorCaracteres() {
  // Contadores para modal de agregar
  const addNombre = document.getElementById('add-nombre');
  const addNombreCounter = document.getElementById('add-nombre-counter');
  const addDescripcion = document.getElementById('add-descripcion');
  const addDescripcionCounter = document.getElementById('add-descripcion-counter');
  
  // Contador para nombre (agregar)
  if (addNombre && addNombreCounter) {
    addNombre.addEventListener('input', function() {
      addNombreCounter.textContent = this.value.length;
    });
    
    // Inicializar contador
    addNombreCounter.textContent = addNombre.value.length;
  }
  
  // Contador para descripción (agregar)
  if (addDescripcion && addDescripcionCounter) {
    addDescripcion.addEventListener('input', function() {
      addDescripcionCounter.textContent = this.value.length;
    });
    
    // Inicializar contador
    addDescripcionCounter.textContent = addDescripcion.value.length;
  }
  
  // Contadores para modal de editar
  const editNombre = document.getElementById('edit-nombre');
  const editNombreCounter = document.getElementById('edit-nombre-counter');
  const editDescripcion = document.getElementById('edit-descripcion');
  const editDescripcionCounter = document.getElementById('edit-descripcion-counter');
  
  // Contador para nombre (editar)
  if (editNombre && editNombreCounter) {
    editNombre.addEventListener('input', function() {
      editNombreCounter.textContent = this.value.length;
    });
    
    // Inicializar contador
    editNombreCounter.textContent = editNombre.value.length;
  }
  
  // Contador para descripción (editar)
  if (editDescripcion && editDescripcionCounter) {
    editDescripcion.addEventListener('input', function() {
      editDescripcionCounter.textContent = this.value.length;
    });
    
    // Inicializar contador
    editDescripcionCounter.textContent = editDescripcion.value.length;
  }
}

// Inicializar contadores cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  inicializarContadorCaracteres();
});

// Reinicializar contadores cuando se abren los modales
if (addCategoryModal) {
  addCategoryModal.addEventListener('shown.bs.modal', function() {
    setTimeout(() => {
      inicializarContadorCaracteres();
    }, 100);
  });
}

if (editCategoryModal) {
  editCategoryModal.addEventListener('shown.bs.modal', function() {
    setTimeout(() => {
      inicializarContadorCaracteres();
    }, 100);
  });
}
