// ADAPTACIÓN DE COMPRAS.JS PARA VENTAS (PRIMERA PARTE)
// Cambios: rutas, textos, y lógica de proveedor eliminada si no aplica

// Flag para evitar búsquedas automáticas después de seleccionar producto
let bloqueoBusquedaAutomatica = false;
// Flag adicional para prevenir que el evento input se procese cuando se selecciona desde opciones
let seleccionandoDesdeOpciones = false;

// Función para mostrar notificaciones push modernas
function mostrarMensajeEnPagina(mensaje, tipo) {
  // Detectar si es un mensaje especial de carrito
  const esCarritoSuccess = tipo === 'success' && /agregado al carrito/i.test(mensaje);
  const esCarritoEliminado = tipo === 'danger' && /eliminado del carrito/i.test(mensaje);
  // Detectar mensaje de salida creada exitosamente
  const esVentaCreada = tipo === 'success' && /salida #\d+ creada exitosamente\.?/i.test(mensaje);

  if ((esCarritoSuccess || esCarritoEliminado) && !esVentaCreada) {
    // Mostrar como alerta dentro de <main class="content">
    let mainContent = document.querySelector('main.content');
    if (!mainContent) mainContent = document.body;
    // Eliminar alertas previas del mismo tipo (solo JS, no las de Django)
    const prevAlerts = mainContent.querySelectorAll('.alert[data-js-alert]');
    prevAlerts.forEach(alert => alert.remove());
    // Crear la alerta tipo Bootstrap
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.setAttribute('data-js-alert', 'true');
    alertDiv.style.cssText = `
      margin-bottom: 18px;
      font-size: 1.1rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.07);
      display: flex;
      align-items: center;
      gap: 12px;
    `;
    // Icono
    let iconHtml = '';
    if (tipo === 'success') {
      iconHtml = '<i class="bi bi-check-circle me-2" style="font-size:1.3em;"></i>';
    } else if (tipo === 'danger') {
      iconHtml = '<i class="bi bi-x-circle me-2" style="font-size:1.3em;"></i>';
    }
    alertDiv.innerHTML = `
      ${iconHtml}
      <span style="flex:1;">${mensaje}</span>
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar" style="pointer-events:auto;"></button>
    `;
    alertDiv.querySelector('.btn-close').onclick = function() {
      alertDiv.classList.remove('show');
      setTimeout(() => {
        if (alertDiv.parentNode) alertDiv.parentNode.removeChild(alertDiv);
      }, 200);
    };
    if (mainContent.firstChild) {
      mainContent.insertBefore(alertDiv, mainContent.firstChild);
    } else {
      mainContent.appendChild(alertDiv);
    }
    setTimeout(() => {
      alertDiv.classList.remove('show');
      setTimeout(() => {
        if (alertDiv.parentNode) alertDiv.parentNode.removeChild(alertDiv);
      }, 200);
    }, 3000);
    return;
  }

  // --- DISEÑO MINIMALISTA FLOTANTE PARA OTROS MENSAJES ---
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
function mostrarMensajeConDeshacer(mensaje, ventaId) {
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
                  onclick="restaurarVenta(${ventaId}, this)" 
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

// Función para restaurar salida
function restaurarVenta(ventaId, button) {
  // Deshabilitar botón
  button.disabled = true;
  button.textContent = 'Restaurando...';
  button.style.opacity = '0.7';
  
  // Enviar petición para restaurar
  fetch(`/salidas/restaurar/${ventaId}/`, {
    method: 'POST',
    headers: {
      'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Restaurar exitosamente
      mostrarMensajeEnPagina('Salida restaurada correctamente', 'success');
      
      // Actualizar la tabla de ventas
      actualizarTablaVentas();
      
      // Remover la notificación
      const notification = button.closest('.notification');
      if (notification) {
        notification.remove();
      }
    } else {
      // Error al restaurar
      mostrarMensajeEnPagina(data.message || 'Error al restaurar la salida', 'danger');
      
      // Restaurar botón
      button.disabled = false;
      button.textContent = 'Deshacer';
      button.style.opacity = '1';
    }
  })
  .catch(error => {
    console.error('Error al restaurar salida:', error);
    mostrarMensajeEnPagina('Error al restaurar la salida', 'danger');
    
    // Restaurar botón
    button.disabled = false;
    button.textContent = 'Deshacer';
    button.style.opacity = '1';
  });
}

// Función para actualizar tabla de ventas
function actualizarTablaVentas(ventaEliminadaId = null) {
  // Si se pasa un ID, eliminar solo ese acordeón
  if (ventaEliminadaId) {
    const acordeon = document.querySelector(`.accordion-item [data-id="${ventaEliminadaId}"]`);
    if (acordeon) {
      const item = acordeon.closest('.accordion-item');
      if (item) item.remove();
    }
    // Si no quedan ventas, mostrar mensaje
    if (!document.querySelector('.accordion-item')) {
      const accordion = document.querySelector('.accordion');
      if (accordion) {
        accordion.innerHTML = '<div class="alert alert-info mb-0">No hay ventas registradas.</div>';
      }
    }
    return;
  }
  
  // Si no, obtener datos actualizados del servidor
  // Guardar el estado de expansión de los acordeones antes de actualizar
  const acordeonesExpandidos = new Set();
  document.querySelectorAll('.accordion-collapse.show').forEach(collapse => {
    const id = collapse.id;
    if (id) {
      acordeonesExpandidos.add(id);
    }
  });
  
  // Limpiar el parámetro de la URL si existe
  const url = new URL(window.location.href);
  url.searchParams.delete('actualizado');
  // Agregar timestamp para evitar cache
  url.searchParams.set('_t', Date.now());
  const urlSinParametro = url.toString();
  
  fetch(urlSinParametro, {
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  })
    .then(response => response.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Buscar específicamente el card-body del historial de ventas que contiene el accordion
      const nuevaSeccionHistorial = doc.querySelector('#table-wrapper') || 
                                     doc.querySelector('.card-body:has(#ventasAccordion)') ||
                                     Array.from(doc.querySelectorAll('.card-body')).find(cb => 
                                       cb.querySelector('#ventasAccordion')
                                     );
      
      const seccionHistorialActual = document.querySelector('#table-wrapper') || 
                                      document.querySelector('.card-body:has(#ventasAccordion)') ||
                                      Array.from(document.querySelectorAll('.card-body')).find(cb => 
                                      cb.querySelector('#ventasAccordion')
                                    );
        
        if (nuevaSeccionHistorial && seccionHistorialActual) {
          // Actualizar solo el contenido del card-body del historial, NO el del carrito
          // Guardar qué acordeones estaban expandidos antes de actualizar
          const acordeonesExpandidosAntes = Array.from(acordeonesExpandidos);
          
          // Actualizar el contenido
          seccionHistorialActual.innerHTML = nuevaSeccionHistorial.innerHTML;
          
          // Esperar un momento para que el DOM se actualice
          setTimeout(() => {
            // Restaurar el estado de expansión de los acordeones
            acordeonesExpandidosAntes.forEach(collapseId => {
              const collapse = document.getElementById(collapseId);
              if (collapse) {
                // Verificar si el acordeón existe en el nuevo HTML
                const button = document.querySelector(`[data-bs-target="#${collapseId}"]`);
                if (button) {
                  const bsCollapse = new bootstrap.Collapse(collapse, { toggle: false });
                  bsCollapse.show();
                }
              }
            });
            
            // Re-inicializar los event listeners
            inicializarEventListenersCarrito();
            
            // Actualizar la URL sin el parámetro
            window.history.replaceState({}, '', urlSinParametro);
          }, 100);
        } else {
          // Si no se encuentra, recargar la página como fallback
          window.location.reload();
        }
    })
    .catch(error => {
      console.error('Error al actualizar tabla de ventas:', error);
      // Si hay error, recargar la página como fallback
      window.location.reload();
    });
}

// Función para mostrar mensajes en modales
function mostrarMensajeEnModal(modalId, mensaje, tipo) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const errorMsg = modal.querySelector('#addManualErrorMsg');
  if (errorMsg) {
    // Limpiar el mensaje anterior del modal
    errorMsg.innerHTML = '';
    errorMsg.classList.remove('d-none', 'text-success', 'text-danger', 'text-warning');
    errorMsg.classList.add('text-' + tipo);
    errorMsg.innerHTML = mensaje;
  }
}

// Modal de confirmar entrega
const confirmarEntregaModal = document.getElementById('confirmarEntregaModal');

if (confirmarEntregaModal) {
  confirmarEntregaModal.addEventListener('show.bs.modal', function (event) {
    const button = event.relatedTarget;
    const id = button.getAttribute('data-id');
    
    // Establecer el ID en el campo hidden
    document.getElementById('entrega-id').value = id;
    
    // Buscar el número de venta en el DOM
    const ventaElement = document.querySelector(`[data-bs-target="#collapse${id}"]`);
    let numeroVenta = id;
    if (ventaElement) {
      const ventaText = ventaElement.querySelector('.fw-bold').textContent;
      const match = ventaText.match(/Salida #(\d+)/);
      if (match) {
        numeroVenta = match[1];
      }
    }
    document.getElementById('entrega-venta-id').textContent = numeroVenta;
    
    // Limpiar el textarea de observaciones al abrir el modal
    const textareaObservaciones = document.getElementById('observaciones_entrega');
    if (textareaObservaciones) {
      textareaObservaciones.value = '';
    }
  });

  // Limpiar el textarea cuando se cierra el modal
  confirmarEntregaModal.addEventListener('hidden.bs.modal', function () {
    const textareaObservaciones = document.getElementById('observaciones_entrega');
    if (textareaObservaciones) {
      textareaObservaciones.value = '';
    }
    // Reinicializar contador cuando se cierra el modal
    inicializarContadorObservaciones();
  });

  // Reinicializar contador cuando se abre el modal de confirmar entrega
  confirmarEntregaModal.addEventListener('shown.bs.modal', function () {
    inicializarContadorObservaciones();
  });

  // Manejar formulario de confirmar entrega con AJAX
  const confirmarEntregaForm = document.getElementById('confirmarEntregaForm');
  if (confirmarEntregaForm) {
    confirmarEntregaForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const submitButton = this.querySelector('button[type="submit"]');
      const originalText = submitButton.innerHTML;
      
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Confirmando...';
      
      fetch(`/salidas/confirmar-entrega/${formData.get('id')}/`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Limpiar el textarea de observaciones antes de cerrar el modal
          const textareaObservaciones = document.getElementById('observaciones_entrega');
          if (textareaObservaciones) {
            textareaObservaciones.value = '';
          }
          
          // Cerrar el modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('confirmarEntregaModal'));
          modal.hide();
          
          mostrarMensajeEnPagina(data.message, 'success');
          
          // Esperar a que el modal se cierre completamente antes de actualizar
          setTimeout(() => {
            // Actualizar el estado de entrega en la tabla
            actualizarEstadoEntrega(formData.get('id'));
          }, 300);
        } else {
          mostrarMensajeEnModal('confirmarEntregaModal', data.message, 'danger');
        }
        
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      })
      .catch(error => {
        console.error('Error al confirmar entrega:', error);
        mostrarMensajeEnModal('confirmarEntregaModal', 'Error al confirmar la entrega', 'danger');
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      });
    });
  }
}

// Función para actualizar el estado de entrega en la tabla
function actualizarEstadoEntrega(ventaId) {
  // Obtener datos actualizados del servidor
  fetch(window.location.href, {
    method: 'GET',
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => response.text())
  .then(html => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Buscar el acordeón actualizado en el HTML del servidor
    const nuevoAcordeon = doc.querySelector(`[data-bs-target="#collapse${ventaId}"]`);
    if (nuevoAcordeon) {
      const nuevoAcordeonContainer = nuevoAcordeon.closest('.accordion-item');
      const acordeonActual = document.querySelector(`[data-bs-target="#collapse${ventaId}"]`);
      
      if (nuevoAcordeonContainer && acordeonActual) {
        const acordeonActualContainer = acordeonActual.closest('.accordion-item');
        
        // Reemplazar el acordeón actual con el actualizado
        acordeonActualContainer.outerHTML = nuevoAcordeonContainer.outerHTML;
      }
    } else {
      // Si no se encuentra, actualizar toda la tabla
      const newTableWrapper = doc.getElementById('table-wrapper');
      if (newTableWrapper) {
        const currentTableWrapper = document.getElementById('table-wrapper');
        if (currentTableWrapper) {
          currentTableWrapper.innerHTML = newTableWrapper.innerHTML;
          
          // Reinicializar event listeners después de actualizar
          setTimeout(() => {
            inicializarEventListenersCarrito();
          }, 100);
        }
      }
    }
  })
  .catch(error => {
    console.error('Error al actualizar estado de entrega:', error);
    // Recargar la página como fallback
    window.location.reload();
  });
}

// Función para inicializar el contador de observaciones
function inicializarContadorObservaciones() {
  // Contador para observaciones del carrito
  const observacionesCarrito = document.getElementById('observaciones');
  const observacionesCarritoCounter = document.getElementById('observaciones-counter');
  
  if (observacionesCarrito && observacionesCarritoCounter) {
    // Remover listeners anteriores para evitar duplicados
    const newObservacionesCarrito = observacionesCarrito.cloneNode(true);
    observacionesCarrito.parentNode.replaceChild(newObservacionesCarrito, observacionesCarrito);
    
    const updateCounter = function() {
      observacionesCarritoCounter.textContent = newObservacionesCarrito.value.length;
    };
    
    newObservacionesCarrito.addEventListener('input', updateCounter);
    
    // Inicializar contador
    updateCounter();
  }
  
  // Contador para observaciones de entrega
  const observacionesEntrega = document.getElementById('observaciones_entrega');
  const observacionesEntregaCounter = document.getElementById('observaciones_entrega-counter');
  
  if (observacionesEntrega && observacionesEntregaCounter) {
    // Remover listeners anteriores para evitar duplicados
    const newObservacionesEntrega = observacionesEntrega.cloneNode(true);
    observacionesEntrega.parentNode.replaceChild(newObservacionesEntrega, observacionesEntrega);
    
    const updateCounterEntrega = function() {
      observacionesEntregaCounter.textContent = newObservacionesEntrega.value.length;
    };
    
    newObservacionesEntrega.addEventListener('input', updateCounterEntrega);
    
    // Inicializar contador
    updateCounterEntrega();
  }
}

// Modales edición y eliminación 
const deleteVentaModal = document.getElementById('deleteVentaModal');

deleteVentaModal.addEventListener('show.bs.modal', function (event) {
  const button = event.relatedTarget;
  const id = button.getAttribute('data-id');
  
  document.getElementById('delete-id').value = id;
  
  // Buscar el número de venta en el DOM
  const ventaElement = document.querySelector(`[data-bs-target="#collapse${id}"]`);
  if (ventaElement) {
    const ventaText = ventaElement.querySelector('.fw-bold').textContent;
    const numeroVenta = ventaText.match(/Venta #(\d+)/);
    if (numeroVenta) {
      document.getElementById('delete-producto').textContent = `#${numeroVenta[1]}`;
    } else {
      document.getElementById('delete-producto').textContent = `#${id}`;
    }
  } else {
    document.getElementById('delete-producto').textContent = `#${id}`;
  }
  
  document.getElementById('deleteVentaForm').action = `/salidas/eliminar/${id}/`;
});

// Manejar el envío del formulario de eliminación con AJAX
const deleteVentaForm = document.getElementById('deleteVentaForm');
if (deleteVentaForm) {
  deleteVentaForm.addEventListener('submit', function (event) {
    event.preventDefault();
    event.stopPropagation();
    
    const formData = new FormData(this);
    const modal = document.getElementById('deleteVentaModal');
    const submitButton = modal.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Eliminando...';
    
    fetch('/salidas/eliminar/' + formData.get('id') + '/', {
      method: 'POST',
      body: formData,
      headers: {
        'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(response => {
      return response.json();
    })
    .then(data => {
      if (data) {
        if (data.success) {
          // Eliminación exitosa, cerrar el modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('deleteVentaModal'));
          modal.hide();
          
          // Mostrar mensaje con botón deshacer
          mostrarMensajeConDeshacer(data.message, data.venta_id);
          
          // Eliminar acordeón de la venta eliminada
          actualizarTablaVentas(data.venta_id);
        } else {
          // Error
          mostrarMensajeEnPagina(data.message || 'Error al eliminar la venta', 'danger');
        }
        // Restaurar botón
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      }
    })
    .catch(error => {
      console.error('Error en eliminación:', error);
      mostrarMensajeEnPagina('Error al eliminar la venta', 'danger');
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    });
    return false;
  });
}

// Modal de escaneo de código
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

      // Validar el código
      fetch('/salidas/validar_codigo/?codigo=' + encodeURIComponent(codigo))
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
            const addManualModal = new bootstrap.Modal(document.getElementById('addManualModal'));
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

// Abrir modal de agregar manual desde botón (si existe)
const btnAgregarManual = document.getElementById('btnAgregarManual');
if (btnAgregarManual) {
  btnAgregarManual.addEventListener('click', () => {
    // Ocultar modal de escaneo
    const scanModalEl = document.getElementById('scanCodeModal');
    const scanModal = bootstrap.Modal.getInstance(scanModalEl);
    scanModal.hide();

    // Abrir modal de añadir venta
    const addVentaModalEl = document.getElementById('addVentaModal');
    const addVentaModal = new bootstrap.Modal(addVentaModalEl);
    addVentaModal.show();
  });
}

// --- FUNCIONES DE CARRITO ---
function handleAddToCart(e) {
  e.preventDefault();
  
  const formData = new FormData(this);
  const submitButton = this.querySelector('button[type="submit"]');
  const originalText = submitButton.innerHTML;
  
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
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Cerrar el modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('addManualModal'));
      modal.hide();
      
      mostrarMensajeEnPagina(data.message, 'success');
      
      // Actualizar solo la sección del carrito
      actualizarSeccionCarrito();
    } else {
      mostrarMensajeEnModal('addManualModal', data.message, 'danger');
    }
    
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  })
  .catch(error => {
    console.error('Error al agregar al carrito:', error);
    mostrarMensajeEnModal('addManualModal', 'Error al agregar al carrito', 'danger');
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  });
}

// Manejar formulario de agregar al carrito con AJAX (inicial)
const addToCartForm = document.querySelector('#addManualModal form');
if (addToCartForm) {
  addToCartForm.addEventListener('submit', handleAddToCart);
}

// --- LÓGICA DE CARRITO (AGREGAR, EDITAR, ELIMINAR, ACTUALIZAR) ---

// Refuerza la reinicialización tras actualizar el carrito
function actualizarSeccionCarrito() {
  // Hacer la petición para obtener el HTML actualizado
  fetch(window.location.href)
    .then(response => response.text())
    .then(html => {
      // Crear un parser para el HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      // Buscar el card del carrito en el HTML nuevo
      const cardsNuevos = doc.querySelectorAll('.card');
      let carritoCardNuevo = null;
      for (let card of cardsNuevos) {
        const header = card.querySelector('.card-header');
        if (header && (header.textContent.includes('Carrito de Salida') || header.textContent.includes('Carrito de Venta'))) {
          carritoCardNuevo = card;
          break;
        }
      }
      // Buscar el card del carrito en el HTML actual
      const cardsActuales = document.querySelectorAll('.card');
      let carritoCardActual = null;
      for (let card of cardsActuales) {
        const header = card.querySelector('.card-header');
        if (header && (header.textContent.includes('Carrito de Salida') || header.textContent.includes('Carrito de Venta'))) {
          carritoCardActual = card;
          break;
        }
      }
      // Verificar que encontramos ambos cards
      if (!carritoCardNuevo) {
        console.error('No se encontró el card del carrito en el HTML nuevo');
        return;
      }
      
      if (!carritoCardActual) {
        console.error('No se encontró el card del carrito en el HTML actual');
        return;
      }
      
      // Obtener las secciones card-body
      const nuevaSeccionCarrito = carritoCardNuevo.querySelector('.card-body');
      const seccionCarritoActual = carritoCardActual.querySelector('.card-body');
      
      if (!nuevaSeccionCarrito) {
        console.error('No se encontró la sección card-body en el HTML nuevo');
        return;
      }
      
      if (!seccionCarritoActual) {
        console.error('No se encontró la sección card-body en el HTML actual');
        return;
      }
      
      // Detectar si estamos pasando de "carrito vacío" a "carrito con productos"
      const tieneMensajeVacio = seccionCarritoActual.querySelector('.alert-info');
      const tieneTablaNueva = nuevaSeccionCarrito.querySelector('.table-responsive') || nuevaSeccionCarrito.querySelector('table');
      
      // Preservar el valor del textarea de observaciones si existe
      const textareaObservaciones = seccionCarritoActual.querySelector('textarea#observaciones');
      const valorObservaciones = textareaObservaciones ? textareaObservaciones.value : '';
      
      // Actualizar el contenido (esto funciona tanto para carrito vacío como con productos)
      seccionCarritoActual.innerHTML = nuevaSeccionCarrito.innerHTML;
      
      // Restaurar el valor del textarea de observaciones si existe
      const nuevoTextareaObservaciones = seccionCarritoActual.querySelector('textarea#observaciones');
      if (nuevoTextareaObservaciones && valorObservaciones) {
        nuevoTextareaObservaciones.value = valorObservaciones;
      }
      
      // Re-inicializar los event listeners
      inicializarEventListenersCarrito();
      
      // Re-inicializar contadores de caracteres
      inicializarContadorObservaciones();
    })
    .catch(() => {
      window.location.reload();
    });
}

// Autocomplete de sucursales (bodega de salida y tienda de llegada)
(function() {
  const bodegaSalidaInput = document.getElementById('bodega_salida_autocomplete');
  const bodegaSalidaSuggestions = document.getElementById('bodega_salida_suggestions');
  const bodegaSalidaHidden = document.getElementById('bodega_salida_id_hidden');
  const tiendaLlegadaInput = document.getElementById('tienda_llegada_autocomplete');
  const tiendaLlegadaSuggestions = document.getElementById('tienda_llegada_suggestions');
  const tiendaLlegadaHidden = document.getElementById('tienda_llegada_id_hidden');

  if (!bodegaSalidaInput || !bodegaSalidaSuggestions || !bodegaSalidaHidden ||
      !tiendaLlegadaInput || !tiendaLlegadaSuggestions || !tiendaLlegadaHidden) {
    return;
  }

  function closeBodegaSalidaSuggestions() {
    if (bodegaSalidaSuggestions) {
      bodegaSalidaSuggestions.innerHTML = '';
      bodegaSalidaSuggestions.style.display = 'none';
    }
  }

  function closeTiendaLlegadaSuggestions() {
    if (tiendaLlegadaSuggestions) {
      tiendaLlegadaSuggestions.innerHTML = '';
      tiendaLlegadaSuggestions.style.display = 'none';
    }
  }

  function renderBodegaSalidaSuggestions(items) {
    bodegaSalidaSuggestions.innerHTML = '';
    if (!items.length) {
      bodegaSalidaSuggestions.style.display = 'none';
      return;
    }
    // Limitar a 5 resultados
    const limitedItems = items.slice(0, 5);
    limitedItems.forEach((item, idx) => {
      const div = document.createElement('button');
      div.type = 'button';
      div.className = 'list-group-item list-group-item-action';
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${item.nombre}</strong>
            <br>
            <small class="text-muted">${item.direccion} | ${item.ciudad}</small>
          </div>
        </div>
      `;
      div.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        bodegaSalidaInput.value = item.nombre;
        bodegaSalidaHidden.value = item.id;
        closeBodegaSalidaSuggestions();
        closeTiendaLlegadaSuggestions();
      };
      bodegaSalidaSuggestions.appendChild(div);
    });
    bodegaSalidaSuggestions.style.display = 'block';
  }

  function renderTiendaLlegadaSuggestions(items) {
    tiendaLlegadaSuggestions.innerHTML = '';
    if (!items.length) {
      tiendaLlegadaSuggestions.style.display = 'none';
      return;
    }
    // Limitar a 5 resultados
    const limitedItems = items.slice(0, 5);
    limitedItems.forEach((item, idx) => {
      const div = document.createElement('button');
      div.type = 'button';
      div.className = 'list-group-item list-group-item-action';
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${item.nombre}</strong>
            <br>
            <small class="text-muted">${item.direccion} | ${item.ciudad}</small>
          </div>
        </div>
      `;
      div.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        tiendaLlegadaInput.value = item.nombre;
        tiendaLlegadaHidden.value = item.id;
        closeTiendaLlegadaSuggestions();
        closeBodegaSalidaSuggestions();
      };
      tiendaLlegadaSuggestions.appendChild(div);
    });
    tiendaLlegadaSuggestions.style.display = 'block';
  }

  function fetchBodegaSalida() {
    const q = bodegaSalidaInput.value.trim();
    const url = `/salidas/autocomplete_sucursales/?q=${encodeURIComponent(q)}&tipo=BODEGA`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const sucursales = data.results || [];
        renderBodegaSalidaSuggestions(sucursales);
      })
      .catch(error => {
        console.error('Error en fetchBodegaSalida:', error);
      });
  }

  function fetchTiendaLlegada() {
    const q = tiendaLlegadaInput.value.trim();
    const url = `/salidas/autocomplete_sucursales/?q=${encodeURIComponent(q)}&tipo=TIENDA`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const sucursales = data.results || [];
        renderTiendaLlegadaSuggestions(sucursales);
      })
      .catch(error => {
        console.error('Error en fetchTiendaLlegada:', error);
      });
  }

  bodegaSalidaInput.addEventListener('input', fetchBodegaSalida);
  bodegaSalidaInput.addEventListener('focus', fetchBodegaSalida);
  tiendaLlegadaInput.addEventListener('input', fetchTiendaLlegada);
  tiendaLlegadaInput.addEventListener('focus', fetchTiendaLlegada);

  // Cerrar sugerencias al hacer click fuera
  document.addEventListener('click', function(e) {
    if (!bodegaSalidaInput.contains(e.target) && !bodegaSalidaSuggestions.contains(e.target)) {
      closeBodegaSalidaSuggestions();
    }
    if (!tiendaLlegadaInput.contains(e.target) && !tiendaLlegadaSuggestions.contains(e.target)) {
      closeTiendaLlegadaSuggestions();
    }
  });
})();

// Función para inicializar los event listeners del modal
function inicializarEventListenersModal() {
  // Obtener referencias a los elementos del modal
  const productoInput = document.getElementById('producto_autocomplete');
  const categoriaHidden = document.getElementById('venta-categoria-hidden');
  const productoHidden = document.getElementById('producto_id_hidden');
  const productoSuggestions = document.getElementById('autocomplete_suggestions');
  const form = document.querySelector('#addManualModal form');
  
  if (!productoInput || !productoHidden || !productoSuggestions || !form) return;

  // Remover event listeners existentes para evitar duplicados
  productoInput.removeEventListener('input', fetchProductosGlobal);
  productoInput.removeEventListener('focus', fetchProductosGlobal);
  productoInput.addEventListener('input', function() {
    // No buscar si se está seleccionando desde opciones
    if (seleccionandoDesdeOpciones) {
      return;
    }
    // Solo buscar si no hay bloqueo activo
    if (!bloqueoBusquedaAutomatica) {
      fetchProductosGlobal();
    }
  });
  productoInput.addEventListener('focus', fetchProductosGlobal);
    
  // Inicializar selector de categoría
  inicializarCategoriaVenta();

  // Re-agregar el event listener del formulario
  form.removeEventListener('submit', handleAddToCart);
  form.addEventListener('submit', handleAddToCart);
  
  // Agregar event listeners al input de cantidad para ajustar automáticamente
  const cantidadInput = document.getElementById('cantidad');
  if (cantidadInput) {
    // Remover event listeners existentes para evitar duplicados
    cantidadInput.removeEventListener('blur', handleCantidadModalBlur);
    cantidadInput.removeEventListener('keypress', handleCantidadModalKeypress);
    cantidadInput.removeEventListener('input', handleCantidadModalInput);
    
    // Agregar nuevos event listeners
    cantidadInput.addEventListener('blur', handleCantidadModalBlur);
    cantidadInput.addEventListener('keypress', handleCantidadModalKeypress);
    cantidadInput.addEventListener('input', handleCantidadModalInput);
  }
}

// Función para manejar el blur del input de cantidad en el modal
function handleCantidadModalBlur() {
  // Si el campo está vacío, no hacer nada (el required del HTML lo validará)
  if (this.value === '' || this.value === null) {
    clearErrorGlobal();
    return;
  }
  
  const maxValue = parseInt(this.getAttribute('max')) || 9999;
  const currentValue = parseInt(this.value);
  
  if (!isNaN(currentValue) && currentValue > maxValue) {
    this.value = maxValue;
    showErrorInModal(`La cantidad máxima disponible es ${maxValue} unidades. Se ajustó automáticamente.`);
  } else {
    clearErrorGlobal();
  }
}

// Función para manejar el keypress del input de cantidad en el modal
function handleCantidadModalKeypress(e) {
  if (e.key === 'Enter') {
    // Si el campo está vacío, no hacer nada (el required del HTML lo validará)
    if (this.value === '' || this.value === null) {
      clearErrorGlobal();
      return;
    }
    
    const maxValue = parseInt(this.getAttribute('max')) || 9999;
    const currentValue = parseInt(this.value);
    
    if (!isNaN(currentValue) && currentValue > maxValue) {
      this.value = maxValue;
      showErrorInModal(`La cantidad máxima disponible es ${maxValue} unidades. Se ajustó automáticamente.`);
    } else {
      clearErrorGlobal();
    }
  }
}

// Función para manejar el input del input de cantidad en el modal
function handleCantidadModalInput() {
  const maxValue = parseInt(this.getAttribute('max')) || 9999;
  const currentValue = parseInt(this.value);
  
  // Solo validar si hay un valor y es mayor al máximo
  if (this.value !== '' && !isNaN(currentValue) && currentValue > maxValue) {
    // Mostrar advertencia visual mientras se escribe
    this.style.borderColor = '#ffc107';
  } else {
    this.style.borderColor = '';
    clearErrorGlobal();
  }
}

// Función para inicializar los event listeners del carrito
function inicializarEventListenersCarrito() {
  // Event listeners para eliminar del carrito
  const deleteFromCartForms = document.querySelectorAll('form[action*="carrito/eliminar"]');
  deleteFromCartForms.forEach((form) => {
    form.removeEventListener('submit', handleDeleteFromCart);
    form.addEventListener('submit', handleDeleteFromCart);
  });
  // Event listeners para editar cantidad del carrito
  const editCartForms = document.querySelectorAll('form[action*="carrito/editar"]');
  editCartForms.forEach((form) => {
    form.removeEventListener('submit', handleEditCartQuantity);
    form.addEventListener('submit', handleEditCartQuantity);
    
    // Agregar evento para actualizar automáticamente cuando cambie el valor
    const input = form.querySelector('input[name="cantidad"]');
    let originalValue = input ? input.value : '';
    let updateTimeout = null;
    
    if (input) {
      // Guardar valor original al enfocar
      input.addEventListener('focus', function() {
        originalValue = this.value;
      });
      
      // No actualizar automáticamente mientras se escribe, solo cuando se salga del campo
      // Esto evita que se pierda el foco mientras el usuario está escribiendo
      
      // Actualizar cuando se usen las flechas del input numérico (evento change)
      input.addEventListener('change', function() {
        // Solo actualizar si el valor cambió y es válido
        if (this.value !== originalValue && this.value !== '' && this.value >= this.min && this.value <= this.max) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      });
      
      // Actualizar cuando salga del campo si cambió el valor
      input.addEventListener('blur', function() {
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        // Si el campo está vacío, restaurar el valor original
        if (this.value === '' || this.value === null) {
          this.value = originalValue;
          return;
        }
        // Validar y ajustar el valor
        const newValue = parseInt(this.value);
        const minValue = parseInt(this.min);
        const maxValue = parseInt(this.max);
        
        if (isNaN(newValue) || newValue < minValue) {
          // Si el valor no es válido o es menor al mínimo, restaurar el original
          this.value = originalValue;
          return;
        }
        
        // Si el valor es mayor al máximo, ajustarlo al máximo
        let finalValue = newValue;
        if (newValue > maxValue) {
          finalValue = maxValue;
          this.value = maxValue;
          mostrarMensajeEnPagina(`La cantidad máxima disponible es ${maxValue} unidades. Se ajustó automáticamente.`, 'warning');
        }
        
        // Actualizar solo si el valor cambió
        if (finalValue !== parseInt(originalValue)) {
          // Asegurarse de que el FormData tenga el valor actualizado
          const formData = new FormData(form);
          formData.set('cantidad', finalValue);
          // Crear un evento personalizado con el FormData actualizado
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        }
      });
      
      // Actualizar cuando presione Enter
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }
          // Si el campo está vacío, restaurar el valor original
          if (this.value === '' || this.value === null) {
            this.value = originalValue;
            this.blur();
            return;
          }
          // Validar y ajustar el valor
          const newValue = parseInt(this.value);
          const minValue = parseInt(this.min);
          const maxValue = parseInt(this.max);
          
          if (isNaN(newValue) || newValue < minValue) {
            // Si el valor no es válido o es menor al mínimo, restaurar el original
            this.value = originalValue;
            this.blur();
            return;
          }
          
          // Si el valor es mayor al máximo, ajustarlo al máximo
          let finalValue = newValue;
          if (newValue > maxValue) {
            finalValue = maxValue;
            this.value = maxValue;
            mostrarMensajeEnPagina(`La cantidad máxima disponible es ${maxValue} unidades. Se ajustó automáticamente.`, 'warning');
          }
          
          // Actualizar solo si el valor cambió
          if (finalValue !== parseInt(originalValue)) {
            const formData = new FormData(form);
            formData.set('cantidad', finalValue);
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          }
          this.blur();
        }
      });
    }
  });

  // Event listeners para editar precio del carrito
  const editPrecioForms = document.querySelectorAll('form[action*="carrito/editar-precio"]');
  editPrecioForms.forEach((form) => {
    form.removeEventListener('submit', handleEditCartPrecio);
    form.addEventListener('submit', handleEditCartPrecio);
    
    // Agregar evento para actualizar automáticamente cuando cambie el valor
    const input = form.querySelector('input[name="precio"]');
    let originalValue = input ? input.value : '';
    let updateTimeout = null;
    
    if (input) {
      // Guardar valor original al enfocar
      input.addEventListener('focus', function() {
        originalValue = this.value;
      });
      
      // Actualizar cuando cambie el valor (incluyendo flechas del input numérico)
      input.addEventListener('input', function() {
        // Cancelar timeout anterior si existe
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        
        // Esperar un poco para que el valor se actualice completamente
        updateTimeout = setTimeout(() => {
          if (this.value !== originalValue && this.value !== '' && this.value >= this.min) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          }
        }, 300); // Esperar 300ms después del último cambio
      });
      
      // Actualizar cuando salga del campo si cambió el valor
      input.addEventListener('blur', function() {
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        if (this.value !== originalValue && this.value !== '' && this.value >= this.min) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      });
      
      // Actualizar cuando presione Enter
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }
          if (this.value !== originalValue && this.value !== '' && this.value >= this.min) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          }
          this.blur();
        }
      });
    }
  });
  // Event listener para finalizar venta (más robusto)
  document.querySelectorAll('form[action*="carrito/finalizar"]').forEach(form => {
    form.removeEventListener('submit', handleFinalizarVenta);
    form.addEventListener('submit', handleFinalizarVenta);
  });
}

// Función para manejar la eliminación del carrito
function handleDeleteFromCart(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const submitButton = this.querySelector('button[type="submit"]');
  const originalText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Eliminando...';
  fetch(this.action, {
    method: 'POST',
    body: formData,
    headers: {
      'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      mostrarMensajeEnPagina(data.message, 'danger');
      actualizarSeccionCarrito();
    } else {
      mostrarMensajeEnPagina(data.message, 'danger');
    }
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  })
  .catch(() => {
    mostrarMensajeEnPagina('Error al eliminar del carrito', 'danger');
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  });
}

// Función para manejar la edición de cantidad en el carrito
function handleEditCartQuantity(e) {
  e.preventDefault();
  const input = this.querySelector('input[name="cantidad"]');
  const originalValue = input.value;
  
  // Validar que el valor no esté vacío y sea válido
  if (input.value === '' || input.value === null) {
    input.value = originalValue;
    return;
  }
  
  const newValue = parseInt(input.value);
  const minValue = parseInt(input.min);
  const maxValue = parseInt(input.max);
  
  if (isNaN(newValue) || newValue < minValue) {
    mostrarMensajeEnPagina('Cantidad inválida o fuera de rango.', 'danger');
    input.value = originalValue;
    return;
  }
  
  // Si el valor es mayor al máximo, ajustarlo al máximo
  let finalValue = newValue;
  if (newValue > maxValue) {
    finalValue = maxValue;
    input.value = maxValue;
    mostrarMensajeEnPagina(`La cantidad máxima disponible es ${maxValue} unidades. Se ajustó automáticamente.`, 'warning');
  }
  
  // Crear FormData y asegurarse de que tenga el valor actualizado del input
  const formData = new FormData(this);
  formData.set('cantidad', finalValue); // Asegurar que el valor esté actualizado
  
  input.style.opacity = '0.7';
  input.disabled = true;
  fetch(this.action, {
    method: 'POST',
    body: formData,
    headers: {
      'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      actualizarSeccionCarrito();
    } else {
      mostrarMensajeEnPagina(data.message, 'danger');
      input.value = originalValue;
    }
    input.style.opacity = '1';
    input.disabled = false;
  })
  .catch(() => {
    mostrarMensajeEnPagina('Error al editar cantidad del carrito', 'danger');
    input.value = originalValue;
    input.style.opacity = '1';
    input.disabled = false;
  });
}

// Función para manejar la edición de precio en el carrito
function handleEditCartPrecio(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const input = this.querySelector('input[name="precio"]');
  const originalValue = input.value;
  input.style.opacity = '0.7';
  input.disabled = true;
  fetch(this.action, {
    method: 'POST',
    body: formData,
    headers: {
      'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      actualizarSeccionCarrito();
    } else {
      mostrarMensajeEnPagina(data.message, 'danger');
      input.value = originalValue;
    }
    input.style.opacity = '1';
    input.disabled = false;
  })
  .catch(error => {
    console.error('Error al editar precio del carrito:', error);
    mostrarMensajeEnPagina('Error al editar precio del carrito', 'danger');
    input.value = originalValue;
    input.style.opacity = '1';
    input.disabled = false;
  });
}

// Función para manejar la finalización de venta
function handleFinalizarVenta(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const submitButton = this.querySelector('button[type="submit"]');
  const originalText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Finalizando...';
  fetch(this.action, {
    method: 'POST',
    body: formData,
    headers: {
      'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      mostrarMensajeEnPagina(data.message, 'success');
      
      // Actualizar tanto el carrito como el historial de ventas
      actualizarSeccionCarrito();
      actualizarTablaVentas();
    } else {
      mostrarMensajeEnPagina(data.message, 'danger');
    }
    
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  })
  .catch(() => {
    mostrarMensajeEnPagina('Error al finalizar venta', 'danger');
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  });
}

// Función para manejar el cambio de cantidad
function handleCantidadChange() {
  const input = this;
  const cantidad = parseInt(input.value);
  const max = parseInt(input.getAttribute('max'));
  if (max && cantidad > max) {
    input.value = max;
    mostrarMensajeEnPagina(`La cantidad máxima disponible es ${max} unidades.`, 'warning');
  }
  const form = this.closest('form');
  if (form) {
    form.dispatchEvent(new Event('submit'));
  }
}

// Variables globales para autocompletado
let productos = [];
let currentFocus = -1;
let fetchTimeout = null;

// --- AUTOCOMPLETADO DE PRODUCTOS CON FILTRO DE CATEGORÍA ---
function fetchProductosGlobal() {
  // Si hay un bloqueo activo o se está seleccionando desde opciones, no hacer búsqueda automática
  if (bloqueoBusquedaAutomatica || seleccionandoDesdeOpciones) {
    return;
  }
  
  const productoInput = document.getElementById('producto_autocomplete');
  const categoriaHidden = document.getElementById('venta-categoria-hidden');
  const productoSuggestions = document.getElementById('autocomplete_suggestions');
  const productoHidden = document.getElementById('producto_id_hidden');

  if (!productoInput || !productoSuggestions) {
    return;
  }

  const q = productoInput.value.trim();
  const categoria = categoriaHidden ? categoriaHidden.value : '';

  // Limpiar timeout anterior si existe
  if (fetchTimeout) {
    clearTimeout(fetchTimeout);
  }

  // Si no hay texto de búsqueda, mostrar inmediatamente
  if (q.length === 0) {
    const url = categoria ? 
      `/salidas/autocomplete_productos/?q=${encodeURIComponent('')}&categoria=${categoria}` :
      `/salidas/autocomplete_productos/?q=${encodeURIComponent('')}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const productos = data.results || [];
        renderProductoSuggestionsGlobal(productos);
      })
      .catch(error => {
        console.error('Error en fetchProductos:', error);
      });
    return;
  }

  // Para búsquedas con texto, usar debounce de 150ms
  fetchTimeout = setTimeout(() => {
    const url = categoria ? 
      `/salidas/autocomplete_productos/?q=${encodeURIComponent(q)}&categoria=${categoria}` :
      `/salidas/autocomplete_productos/?q=${encodeURIComponent(q)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        const productos = data.results || [];
        renderProductoSuggestionsGlobal(productos);
      })
      .catch(error => {
        console.error('Error en fetchProductos con texto:', error);
      });
  }, 150);
}

function renderProductoSuggestionsGlobal(items) {
  const productoSuggestions = document.getElementById('autocomplete_suggestions');
  const productoInput = document.getElementById('producto_autocomplete');
  const productoHidden = document.getElementById('producto_id_hidden');

  if (!productoSuggestions || !productoInput || !productoHidden) return;

  productoSuggestions.innerHTML = '';
  if (!items.length) {
    productoSuggestions.style.display = 'none';
    return;
  }

  // Limitar a 5 resultados
  const limitedItems = items.slice(0, 5);
  limitedItems.forEach((item, idx) => {
    const div = document.createElement('button');
    div.type = 'button';
    div.className = 'list-group-item list-group-item-action';
    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${item.nombre}</strong>
          <br>
          <small class="text-muted">Código: ${item.codigo} | Stock: ${item.stock}</small>
        </div>
        <span class="badge bg-primary rounded-pill">$${item.precio_venta}</span>
      </div>
    `;
    div.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Activar banderas ANTES de cambiar el valor para prevenir que se dispare el evento input
      bloqueoBusquedaAutomatica = true;
      seleccionandoDesdeOpciones = true;
      
      // Cerrar sugerencias inmediatamente ANTES de cambiar el valor
      closeProductoSuggestionsGlobal();
      clearErrorGlobal();
      
      // Usar setTimeout(0) para cambiar el valor en el siguiente ciclo de eventos
      // Esto asegura que el bloqueo esté completamente activo antes del cambio
      setTimeout(() => {
        productoInput.value = item.nombre;
        if (productoHidden) productoHidden.value = item.id;
        
        // Actualizar el max del input de cantidad con el stock del producto
        const cantidadInput = document.getElementById('cantidad');
        if (cantidadInput && item.stock !== undefined) {
          cantidadInput.setAttribute('max', item.stock);
          // Si hay un valor y es mayor al stock, ajustarlo
          if (cantidadInput.value !== '' && cantidadInput.value !== null) {
            const currentValue = parseInt(cantidadInput.value);
            if (!isNaN(currentValue) && currentValue > item.stock) {
              cantidadInput.value = item.stock;
              showErrorInModal(`La cantidad máxima disponible es ${item.stock} unidades. Se ajustó automáticamente.`);
            }
          }
        }
        
        // Desactivar banderas después de un breve delay adicional
        setTimeout(() => {
          bloqueoBusquedaAutomatica = false;
          seleccionandoDesdeOpciones = false;
        }, 100);
      }, 0);
    };
    productoSuggestions.appendChild(div);
  });
  productoSuggestions.style.display = 'block';
}

function closeProductoSuggestionsGlobal() {
  const productoSuggestions = document.getElementById('autocomplete_suggestions');
  if (productoSuggestions) {
    productoSuggestions.style.display = 'none';
  }
}

function clearErrorGlobal() {
  const errorMsg = document.getElementById('addManualErrorMsg');
  if (errorMsg) {
    errorMsg.classList.add('d-none');
    errorMsg.innerHTML = '';
  }
}

function showErrorInModal(message) {
  const errorMsg = document.getElementById('addManualErrorMsg');
  if (errorMsg) {
    errorMsg.classList.remove('d-none');
    errorMsg.innerHTML = message;
    // Cambiar el color a warning (amarillo) en lugar de danger (rojo)
    errorMsg.className = 'text-center mt-3 text-warning fw-semibold';
  }
}

// Inicializar eventos de autocompletado
(function() {
  const productoInput = document.getElementById('producto_autocomplete');
  const categoriaHidden = document.getElementById('venta-categoria-hidden');
  const productoSuggestions = document.getElementById('autocomplete_suggestions');
  const productoHidden = document.getElementById('producto_id_hidden');
  let productos = [];
  let currentFocus = -1;

  if (!productoInput || !productoSuggestions) return;

  productoInput.addEventListener('input', fetchProductosGlobal);
  productoInput.addEventListener('focus', fetchProductosGlobal);

  productoInput.addEventListener('keydown', function(e) {
    const items = productoSuggestions.querySelectorAll('.list-group-item');
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
      else if (productos.length === 1) {
        e.preventDefault();
        productoInput.value = productos[0].nombre;
        productoHidden.value = productos[0].id;
        closeProductoSuggestionsGlobal();
      }
    }
  });

  // Cerrar sugerencias al hacer clic fuera
  document.addEventListener('click', function(e) {
    if (!productoInput.contains(e.target) && !productoSuggestions.contains(e.target)) {
      closeProductoSuggestionsGlobal();
    }
  });
})();

// Inicializar event listeners al cargar la página
window.addEventListener('DOMContentLoaded', function() {
  inicializarEventListenersCarrito();
  
  // Si hay mensajes de éxito o si se viene de editar una venta, actualizar los acordeones
  const urlParams = new URLSearchParams(window.location.search);
  const mensajes = document.querySelectorAll('.alert-success, .messages .success, .alert-info');
  const tieneParametroActualizado = urlParams.has('actualizado') || window.location.search.includes('actualizado=1');
  
  // Actualizar si hay parámetro actualizado O si hay mensajes de éxito/info (que indican que se editó algo)
  if (tieneParametroActualizado || mensajes.length > 0) {
    if (tieneParametroActualizado) {
      // Limpiar el parámetro de la URL primero
      const url = new URL(window.location.href);
      url.searchParams.delete('actualizado');
      // También eliminar el parámetro _t si existe
      url.searchParams.delete('_t');
      window.history.replaceState({}, '', url.toString());
    }
    
    // Esperar un poco más para asegurar que la transacción se haya confirmado en el servidor
    setTimeout(() => {
      actualizarTablaVentas();
    }, 1000);
  }
});

// Función para inicializar event listeners de ventas
function inicializarEventListenersVentas() {
  // Aquí puedes agregar otros event listeners específicos de ventas si es necesario
}

// Funciones para selector de categoría en ventas (selección única)
let ventaCategoriaClickJustHappened = false;
let ventaCategoriaClickTimeout = null;

function inicializarCategoriaVenta() {
  const categoriaContainer = document.getElementById('venta-categoria-container');
  const categoriaInput = document.getElementById('venta-categoria');
  const categoriaBtn = document.getElementById('venta-categoria-btn');
  const categoriaOptions = document.getElementById('venta-categoria-options');
  const categoriaHidden = document.getElementById('venta-categoria-hidden');
  const categoriasSelected = document.getElementById('venta-categorias-selected');

  if (!categoriaInput || !categoriaOptions) {
    console.error('No se encontraron los elementos del selector de categoría');
    return;
  }

  // Función para abrir/cerrar opciones
  const toggleOptions = function(e) {
    // Si el click fue dentro del panel de opciones, no hacer nada
    if (categoriaOptions && categoriaOptions.contains(e.target)) {
      return;
    }
    
    // Si el click fue en el botón de cerrar de un badge, no hacer nada
    if (e.target.classList.contains('btn-close') || e.target.closest('.btn-close')) {
      return;
    }
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    
    // Marcar que acaba de ocurrir un click
    ventaCategoriaClickJustHappened = true;
    if (ventaCategoriaClickTimeout) {
      clearTimeout(ventaCategoriaClickTimeout);
    }
    ventaCategoriaClickTimeout = setTimeout(() => {
      ventaCategoriaClickJustHappened = false;
    }, 300);
    
    const isVisible = categoriaOptions.style.display !== 'none' && categoriaOptions.style.display !== '';
    
    setTimeout(() => {
      if (!isVisible) {
        categoriaOptions.style.display = 'block';
        if (categoriaBtn) {
          categoriaBtn.classList.add('open');
        }
        
        // Ajustar ancho
        requestAnimationFrame(() => {
          if (categoriaContainer) {
            const containerWidth = categoriaContainer.getBoundingClientRect().width;
            categoriaOptions.style.width = containerWidth + 'px';
          }
        });
        
        if (categoriaOptions.innerHTML === '' || categoriaOptions.innerHTML.trim() === '') {
          cargarCategoriasVenta();
        }
      } else {
        categoriaOptions.style.display = 'none';
        if (categoriaBtn) {
          categoriaBtn.classList.remove('open');
        }
      }
    }, 0);
  };

  // Event listeners en el input y botón
  if (categoriaInput) {
    categoriaInput.addEventListener('mousedown', toggleOptions, true);
    categoriaInput.addEventListener('focus', function(e) {
      e.preventDefault();
      toggleOptions(e);
    }, true);
  }
  
  if (categoriaBtn) {
    categoriaBtn.addEventListener('mousedown', toggleOptions, true);
  }

  // Prevenir que los clicks en las etiquetas abran las opciones
  if (categoriasSelected) {
    categoriasSelected.addEventListener('mousedown', function(e) {
      if (e.target.classList.contains('btn-close') || e.target.closest('.btn-close')) {
        return;
      }
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, false);
  }

  // Prevenir que los clicks dentro del panel de opciones se propaguen, pero permitir clicks en items
  if (categoriaOptions) {
    categoriaOptions.addEventListener('mousedown', function(e) {
      // Solo prevenir propagación si no es un click en un item
      if (!e.target.closest('.list-group-item')) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }, true);
    
    categoriaOptions.addEventListener('click', function(e) {
      // Solo prevenir propagación si no es un click en un item
      if (!e.target.closest('.list-group-item')) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }, true);
  }

  // Cerrar al hacer click fuera
  document.addEventListener('click', function(e) {
    if (ventaCategoriaClickJustHappened) {
      return;
    }
    
    if (categoriaContainer && !categoriaContainer.contains(e.target) && 
        categoriaOptions && !categoriaOptions.contains(e.target)) {
      categoriaOptions.style.display = 'none';
      if (categoriaBtn) {
        categoriaBtn.classList.remove('open');
      }
    }
  });
}

function cargarCategoriasVenta() {
  const categoriaOptions = document.getElementById('venta-categoria-options');
  if (!categoriaOptions) return;
  
  categoriaOptions.innerHTML = '<div class="list-group-item text-center text-muted">Cargando categorías...</div>';
  
  fetch('/producto/autocomplete_categorias/?q=&all=true')
    .then(res => res.json())
    .then(data => {
      const categorias = data.results || [];
      if (categorias.length === 0) {
        categoriaOptions.innerHTML = '<div class="list-group-item text-center text-muted">No hay categorías disponibles</div>';
      } else {
        renderCategoriasVenta(categorias);
      }
    })
    .catch(error => {
      console.error('Error al cargar categorías:', error);
      categoriaOptions.innerHTML = '<div class="list-group-item text-center text-danger">Error al cargar categorías</div>';
    });
}

function renderCategoriasVenta(categorias) {
  const categoriaOptions = document.getElementById('venta-categoria-options');
  const categoriaHidden = document.getElementById('venta-categoria-hidden');
  if (!categoriaOptions) return;
  
  categoriaOptions.innerHTML = '';
  
  // Opción para "Todas las categorías"
  const todasDiv = document.createElement('div');
  todasDiv.className = 'list-group-item';
  todasDiv.style.cssText = 'padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid #f8f9fa;';
  todasDiv.innerHTML = '<strong>Todas las categorías</strong>';
  todasDiv.addEventListener('click', function(e) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    seleccionarCategoriaVenta(null, 'Todas las categorías');
  }, true);
  categoriaOptions.appendChild(todasDiv);
  
  categorias.forEach((categoria) => {
    const div = document.createElement('div');
    div.className = 'list-group-item';
    div.style.cssText = 'padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid #f8f9fa;';
    div.innerHTML = `<strong>${categoria.nombre}</strong>`;
    div.addEventListener('click', function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      seleccionarCategoriaVenta(categoria.id, categoria.nombre);
    }, true);
    categoriaOptions.appendChild(div);
  });
}

function seleccionarCategoriaVenta(categoriaId, categoriaNombre) {
  const categoriaHidden = document.getElementById('venta-categoria-hidden');
  const categoriasSelected = document.getElementById('venta-categorias-selected');
  const categoriaInput = document.getElementById('venta-categoria');
  const categoriaOptions = document.getElementById('venta-categoria-options');
  const categoriaBtn = document.getElementById('venta-categoria-btn');
  
  if (categoriaHidden) {
    categoriaHidden.value = categoriaId || '';
  }
  
  // Actualizar input con el nombre de la categoría
  if (categoriaInput) {
    if (categoriaId) {
      categoriaInput.value = categoriaNombre;
    } else {
      // Si no hay categoría seleccionada, mostrar "Todas las categorías"
      categoriaInput.value = categoriaNombre || 'Todas las categorías';
      categoriaInput.placeholder = 'Seleccionar Categoría...';
    }
  }
  
  // Ocultar badges si existen
  if (categoriasSelected) {
    categoriasSelected.innerHTML = '';
    categoriasSelected.style.display = 'none';
  }
  
  // Cerrar opciones
  if (categoriaOptions) {
    categoriaOptions.style.display = 'none';
  }
  
  if (categoriaBtn) {
    categoriaBtn.classList.remove('open');
  }
  
  // No actualizar productos automáticamente, solo cuando el usuario interactúe con el campo
}

// Inicializar cuando se abre el modal
document.addEventListener('DOMContentLoaded', function() {
  const addManualModal = document.getElementById('addManualModal');
  if (addManualModal) {
    // Limpiar campos cuando se abre el modal
    addManualModal.addEventListener('show.bs.modal', function() {
      // Limpiar campos del formulario
      const productoInput = document.getElementById('producto_autocomplete');
      const productoHidden = document.getElementById('producto_id_hidden');
      const cantidadInput = document.getElementById('cantidad');
      const categoriaInput = document.getElementById('venta-categoria');
      const categoriaHidden = document.getElementById('venta-categoria-hidden');
      const categoriasSelected = document.getElementById('venta-categorias-selected');
      const errorMsg = document.getElementById('addManualErrorMsg');
      const autocompleteSuggestions = document.getElementById('autocomplete_suggestions');
      
      // Verificar si hay bodega y tienda ya seleccionadas
      // Si hay inputs readonly, significa que ya están seleccionadas y no se pueden editar
      const inputsReadonly = document.querySelectorAll('#addManualModal input[readonly]');
      const bodegaSalidaHidden = document.getElementById('bodega_salida_id_hidden');
      const tiendaLlegadaHidden = document.getElementById('tienda_llegada_id_hidden');
      const bodegaSalidaInput = document.getElementById('bodega_salida_autocomplete');
      const tiendaLlegadaInput = document.getElementById('tienda_llegada_autocomplete');
      const bodegaSalidaSuggestions = document.getElementById('bodega_salida_suggestions');
      const tiendaLlegadaSuggestions = document.getElementById('tienda_llegada_suggestions');
      
      // Si hay inputs readonly, significa que bodega y tienda ya están seleccionadas
      // Si no hay readonly pero hay valores en los hidden, también están seleccionadas
      const hayBodegaYTiendaSeleccionadas = inputsReadonly.length >= 2 || 
                                            ((bodegaSalidaHidden && bodegaSalidaHidden.value) && 
                                             (tiendaLlegadaHidden && tiendaLlegadaHidden.value));
      
      // Si hay bodega y tienda ya seleccionadas, deshabilitar los inputs de autocomplete
      if (hayBodegaYTiendaSeleccionadas && bodegaSalidaInput && tiendaLlegadaInput) {
        // Deshabilitar inputs de autocomplete si existen
        if (bodegaSalidaInput) {
          bodegaSalidaInput.disabled = true;
          bodegaSalidaInput.style.pointerEvents = 'none';
          bodegaSalidaInput.style.cursor = 'not-allowed';
        }
        if (tiendaLlegadaInput) {
          tiendaLlegadaInput.disabled = true;
          tiendaLlegadaInput.style.pointerEvents = 'none';
          tiendaLlegadaInput.style.cursor = 'not-allowed';
        }
        // Ocultar sugerencias
        if (bodegaSalidaSuggestions) {
          bodegaSalidaSuggestions.innerHTML = '';
          bodegaSalidaSuggestions.style.display = 'none';
        }
        if (tiendaLlegadaSuggestions) {
          tiendaLlegadaSuggestions.innerHTML = '';
          tiendaLlegadaSuggestions.style.display = 'none';
        }
      } else {
        // Si no hay bodega/tienda seleccionadas, habilitar los inputs
        if (bodegaSalidaInput) {
          bodegaSalidaInput.disabled = false;
          bodegaSalidaInput.style.pointerEvents = 'auto';
          bodegaSalidaInput.style.cursor = 'text';
        }
        if (tiendaLlegadaInput) {
          tiendaLlegadaInput.disabled = false;
          tiendaLlegadaInput.style.pointerEvents = 'auto';
          tiendaLlegadaInput.style.cursor = 'text';
        }
      }
      
      // Limpiar producto
      if (productoInput) productoInput.value = '';
      if (productoHidden) productoHidden.value = '';
      
      // Limpiar cantidad y resetear max
      if (cantidadInput) {
        cantidadInput.value = '';
        cantidadInput.removeAttribute('max'); // Resetear el max hasta que se seleccione un producto
        cantidadInput.style.borderColor = ''; // Resetear el color del borde
      }
      
      // Limpiar categoría
      if (categoriaInput) categoriaInput.value = 'Todas las categorías';
      if (categoriaHidden) categoriaHidden.value = '';
      if (categoriasSelected) categoriasSelected.innerHTML = '';
      
      // Limpiar mensajes de error
      if (errorMsg) {
        errorMsg.classList.add('d-none');
        errorMsg.innerHTML = '';
      }
      
      // Ocultar sugerencias de producto
      if (autocompleteSuggestions) {
        autocompleteSuggestions.innerHTML = '';
        autocompleteSuggestions.style.display = 'none';
      }
    });
    
    addManualModal.addEventListener('shown.bs.modal', function() {
      inicializarCategoriaVenta();
      // Establecer "Todas las categorías" por defecto sin disparar eventos
      const categoriaInput = document.getElementById('venta-categoria');
      const categoriaHidden = document.getElementById('venta-categoria-hidden');
      if (categoriaInput) {
        categoriaInput.value = 'Todas las categorías';
      }
      if (categoriaHidden) {
        categoriaHidden.value = '';
      }
      // Inicializar event listeners del modal (incluyendo el input de cantidad)
      inicializarEventListenersModal();
    });
    
    // También limpiar cuando se cierra el modal
    addManualModal.addEventListener('hidden.bs.modal', function() {
      // Limpiar selección al cerrar el modal
      const categoriaInput = document.getElementById('venta-categoria');
      const categoriaHidden = document.getElementById('venta-categoria-hidden');
      const categoriasSelected = document.getElementById('venta-categorias-selected');
      const productoInput = document.getElementById('producto_autocomplete');
      const productoHidden = document.getElementById('producto_id_hidden');
      const autocompleteSuggestions = document.getElementById('autocomplete_suggestions');
      
      if (categoriaInput) {
        categoriaInput.value = 'Todas las categorías';
      }
      if (categoriaHidden) {
        categoriaHidden.value = '';
      }
      if (categoriasSelected) {
        categoriasSelected.innerHTML = '';
      }
      if (productoInput) productoInput.value = '';
      if (productoHidden) productoHidden.value = '';
      if (autocompleteSuggestions) {
        autocompleteSuggestions.innerHTML = '';
        autocompleteSuggestions.style.display = 'none';
      }
    });
  }
});

// Función para inicializar contadores de caracteres en observaciones
function inicializarContadorObservaciones() {
  // Contador para observaciones del carrito
  const observacionesCarrito = document.getElementById('observaciones');
  const observacionesCarritoCounter = document.getElementById('observaciones-counter');
  
  if (observacionesCarrito && observacionesCarritoCounter) {
    // Remover listeners anteriores para evitar duplicados
    const newObservacionesCarrito = observacionesCarrito.cloneNode(true);
    observacionesCarrito.parentNode.replaceChild(newObservacionesCarrito, observacionesCarrito);
    
    const updateCounter = function() {
      observacionesCarritoCounter.textContent = newObservacionesCarrito.value.length;
    };
    
    newObservacionesCarrito.addEventListener('input', updateCounter);
    
    // Inicializar contador
    updateCounter();
  }
  
  // Contador para observaciones de entrega
  const observacionesEntrega = document.getElementById('observaciones_entrega');
  const observacionesEntregaCounter = document.getElementById('observaciones_entrega-counter');
  
  if (observacionesEntrega && observacionesEntregaCounter) {
    // Remover listeners anteriores para evitar duplicados
    const newObservacionesEntrega = observacionesEntrega.cloneNode(true);
    observacionesEntrega.parentNode.replaceChild(newObservacionesEntrega, observacionesEntrega);
    
    const updateCounterEntrega = function() {
      observacionesEntregaCounter.textContent = newObservacionesEntrega.value.length;
    };
    
    newObservacionesEntrega.addEventListener('input', updateCounterEntrega);
    
    // Inicializar contador
    updateCounterEntrega();
  }
}

// Inicializar contadores cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  inicializarContadorObservaciones();
}); 