
// Flag para evitar búsquedas automáticas después de seleccionar proveedor/producto
let bloqueoBusquedaAutomatica = false;
// Flag adicional para prevenir que el evento input se procese cuando se selecciona desde opciones
let seleccionandoDesdeOpciones = false;

// Función para mostrar notificaciones push modernas
function mostrarMensajeEnPagina(mensaje, tipo) {
  // Detectar si es un mensaje especial de carrito
  const esCarritoSuccess = tipo === 'success' && /agregado al carrito/i.test(mensaje);
  const esCarritoEliminado = tipo === 'danger' && /eliminado del carrito/i.test(mensaje);
  // Detectar mensaje de entrada creada exitosamente
  const esCompraCreada = tipo === 'success' && /entrada #\d+ creada exitosamente\.?/i.test(mensaje);

  if ((esCarritoSuccess || esCarritoEliminado) && !esCompraCreada) {
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
function mostrarMensajeConDeshacer(mensaje, compraId) {
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
                  onclick="restaurarCompra(${compraId}, this)" 
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

// Función para restaurar entrada
function restaurarCompra(compraId, button) {
  
  // Deshabilitar botón
  button.disabled = true;
  button.textContent = 'Restaurando...';
  button.style.opacity = '0.7';
  
  // Enviar petición para restaurar
  fetch(`/entradas/restaurar/${compraId}/`, {
    method: 'POST',
    headers: {
      'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  .then(response => {
    
    // Verificar si la respuesta es JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Si no es JSON, obtener el texto para debug
      return response.text().then(text => {
        console.error('Respuesta no es JSON:', text);
        throw new Error(`El servidor devolvió HTML en lugar de JSON. Status: ${response.status}`);
      });
    }
    
    return response.json();
  })
  .then(data => {
    if (data.success) {
      // Mostrar mensaje de éxito
      mostrarMensajeEnPagina(data.message, 'success');
      
      // Actualizar tabla
      actualizarTablaCompras();
      
      // Actualizar el bloque de total
      actualizarBloqueTotal();
      
      // Remover la notificación de eliminación
      const notification = button.closest('.notification');
      if (notification) {
        notification.remove();
      }
    } else {
      // Mostrar error
      mostrarMensajeEnPagina(data.message || 'Error al restaurar la entrada', 'danger');
      
      // Restaurar botón
      button.disabled = false;
      button.textContent = 'Deshacer';
      button.style.opacity = '1';
    }
  })
  .catch(error => {
    console.error('Error al restaurar entrada:', error);
    mostrarMensajeEnPagina(`Error al restaurar la entrada: ${error.message}`, 'danger');
    
    // Restaurar botón
    button.disabled = false;
    button.textContent = 'Deshacer';
    button.style.opacity = '1';
  });
}

// Función para actualizar solo el bloque de total de compras
function actualizarBloqueTotal() {
  // Obtener el HTML completo para extraer el bloque de total
  fetch(window.location.href)
    .then(response => response.text())
    .then(fullHtml => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(fullHtml, 'text/html');
      
      // Buscar el bloque de total en el HTML completo
      const nuevoTotalBlock = doc.querySelector('.card.shadow-lg.border-0.mt-3');
      if (nuevoTotalBlock && nuevoTotalBlock.querySelector('.bi-cash-stack')) {
        // Buscar el bloque de total actual en la página
        const totalBlocks = document.querySelectorAll('.card.shadow-lg.border-0.mt-3');
        let totalBlockActual = null;
        for (let block of totalBlocks) {
          if (block.querySelector('.bi-cash-stack')) {
            totalBlockActual = block;
            break;
          }
        }
        
        // Buscar el card del historial para insertar el bloque de total después
        const historialCard = document.querySelector('#table-wrapper')?.closest('.card');
        
        if (totalBlockActual && historialCard && historialCard.parentElement) {
          // Si existe, actualizarlo
          totalBlockActual.outerHTML = nuevoTotalBlock.outerHTML;
        } else if (!totalBlockActual && historialCard && historialCard.parentElement) {
          // Si no existe, agregarlo después del card del historial
          historialCard.parentElement.insertAdjacentHTML('afterend', nuevoTotalBlock.outerHTML);
        }
      } else {
        // Si no hay bloque de total en la respuesta, eliminarlo si existe
        const totalBlocks = document.querySelectorAll('.card.shadow-lg.border-0.mt-3');
        for (let block of totalBlocks) {
          if (block.querySelector('.bi-cash-stack')) {
            block.remove();
            break;
          }
        }
      }
    })
    .catch(error => {
      console.error('Error al actualizar bloque de total:', error);
    });
}

// Función para actualizar la tabla de entradas dinámicamente
function actualizarTablaCompras(compraEliminadaId = null) {
  // Si se pasa un ID, eliminar solo ese acordeón
  if (compraEliminadaId) {
    const acordeon = document.querySelector(`.accordion-item [data-id="${compraEliminadaId}"]`);
    if (acordeon) {
      const item = acordeon.closest('.accordion-item');
      if (item) item.remove();
    }
    // Si no quedan compras, mostrar mensaje
    if (!document.querySelector('.accordion-item')) {
      const accordion = document.querySelector('.accordion');
      if (accordion) {
        accordion.innerHTML = '<div class="alert alert-info mb-0">No hay compras registradas.</div>';
      }
      // También ocultar el bloque de total si no hay compras
      const totalBlock = document.querySelector('.card.shadow-lg.border-0.mt-3');
      if (totalBlock && totalBlock.querySelector('.bi-cash-stack')) {
        totalBlock.remove();
      }
    } else {
      // Si aún hay compras, actualizar el bloque de total
      actualizarBloqueTotal();
    }
    return;
  }
  
  // Si no, obtener datos actualizados del servidor
  // Primero obtener el partial para el historial
  fetch(window.location.href, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
    .then(response => response.text())
    .then(partialHtml => {
      // El servidor devuelve directamente el contenido del partial table_content.html
      // Buscar el contenedor del historial (table-wrapper)
      const tableWrapper = document.getElementById('table-wrapper');
      if (tableWrapper) {
        // Actualizar solo el contenido del historial de entradas
        tableWrapper.innerHTML = partialHtml;
      }
      
      // Ahora obtener el HTML completo para actualizar el bloque de total
      fetch(window.location.href)
        .then(response => response.text())
        .then(fullHtml => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(fullHtml, 'text/html');
          
          // Buscar el bloque de total en el HTML completo
          const nuevoTotalBlock = doc.querySelector('.card.shadow-lg.border-0.mt-3');
          if (nuevoTotalBlock && nuevoTotalBlock.querySelector('.bi-cash-stack')) {
            // Buscar el bloque de total actual en la página
            const totalBlocks = document.querySelectorAll('.card.shadow-lg.border-0.mt-3');
            let totalBlockActual = null;
            for (let block of totalBlocks) {
              if (block.querySelector('.bi-cash-stack')) {
                totalBlockActual = block;
                break;
              }
            }
            
            // Buscar el card del historial para insertar el bloque de total después
            const historialCard = document.querySelector('#table-wrapper')?.closest('.card');
            
            if (totalBlockActual && historialCard && historialCard.parentElement) {
              // Si existe, actualizarlo
              totalBlockActual.outerHTML = nuevoTotalBlock.outerHTML;
            } else if (!totalBlockActual && historialCard && historialCard.parentElement) {
              // Si no existe, agregarlo después del card del historial
              historialCard.parentElement.insertAdjacentHTML('afterend', nuevoTotalBlock.outerHTML);
            }
          } else {
            // Si no hay bloque de total en la respuesta, eliminarlo si existe
            const totalBlocks = document.querySelectorAll('.card.shadow-lg.border-0.mt-3');
            for (let block of totalBlocks) {
              if (block.querySelector('.bi-cash-stack')) {
                block.remove();
                break;
              }
            }
          }
        })
        .catch(error => {
          console.error('Error al actualizar bloque de total:', error);
        });
    })
    .catch(error => {
      console.error('Error al actualizar tabla de compras:', error);
    });
}

// Función para actualizar el estado de entrega
function actualizarEstadoEntrega(compraId) {
  // Obtener datos actualizados del servidor
  fetch(window.location.href)
    .then(response => response.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Buscar el acordeón actualizado en el HTML del servidor
      const nuevoAcordeon = doc.querySelector(`[data-bs-target="#collapse${compraId}"]`);
      if (nuevoAcordeon) {
        const nuevoAcordeonContainer = nuevoAcordeon.closest('.accordion-item');
        const acordeonActual = document.querySelector(`[data-bs-target="#collapse${compraId}"]`);
        
        if (nuevoAcordeonContainer && acordeonActual) {
          const acordeonActualContainer = acordeonActual.closest('.accordion-item');
          
          // Reemplazar el acordeón actual con el actualizado
          acordeonActualContainer.outerHTML = nuevoAcordeonContainer.outerHTML;
        }
      }
    })
    .catch(error => {
      console.error('Error al actualizar estado de entrega:', error);
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

confirmarEntregaModal.addEventListener('show.bs.modal', function (event) {
  const button = event.relatedTarget;
  const id = button.getAttribute('data-id');
  
  // Establecer el ID en el campo hidden
  document.getElementById('entrega-id').value = id;
  document.getElementById('entrega-compra-id').textContent = id;
  
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
    
    fetch(`/entradas/confirmar-entrega/${formData.get('id')}/`, {
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

// Modales edición y eliminación 
const deleteCompraModal = document.getElementById('deleteCompraModal');

deleteCompraModal.addEventListener('show.bs.modal', function (event) {
  const button = event.relatedTarget;
  const id = button.getAttribute('data-id');
  
  document.getElementById('delete-id').value = id;
  
  // Buscar el número de compra en el DOM
  const compraElement = document.querySelector(`[data-bs-target="#collapse${id}"]`);
  if (compraElement) {
    const compraText = compraElement.querySelector('.fw-bold').textContent;
    const numeroCompra = compraText.match(/Compra #(\d+)/);
    if (numeroCompra) {
      document.getElementById('delete-producto').textContent = `#${numeroCompra[1]}`;
    } else {
      document.getElementById('delete-producto').textContent = `#${id}`;
    }
  } else {
    document.getElementById('delete-producto').textContent = `#${id}`;
  }
  
  document.getElementById('deleteCompraForm').action = `/entradas/eliminar/${id}/`;
});

// Manejar el envío del formulario de eliminación con AJAX
const deleteCompraForm = document.getElementById('deleteCompraForm');
if (deleteCompraForm) {
  deleteCompraForm.addEventListener('submit', function (event) {
    event.preventDefault();
    event.stopPropagation();
    
    const formData = new FormData(this);
    const modal = document.getElementById('deleteCompraModal');
    const submitButton = modal.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Eliminando...';
    
    fetch('/entradas/eliminar/' + formData.get('id') + '/', {
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
          const modal = bootstrap.Modal.getInstance(document.getElementById('deleteCompraModal'));
          modal.hide();
          
          // Mostrar mensaje con botón deshacer
          mostrarMensajeConDeshacer(data.message, data.compra_id);
          
          // Eliminar acordeón de la compra eliminada
          actualizarTablaCompras(data.compra_id);
          
          // Actualizar el bloque de total
          actualizarBloqueTotal();
        } else {
          // Error
          mostrarMensajeEnPagina(data.message || 'Error al eliminar la compra', 'danger');
        }
        // Restaurar botón
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      }
    })
    .catch(error => {
      console.error('Error en eliminación:', error);
      mostrarMensajeEnPagina('Error al eliminar la compra', 'danger');
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    });
    return false;
  });
} else {
}

// El formulario de finalizar compra ahora se maneja en inicializarEventListenersCarrito()

// Autocomplete y validación en modal de agregar producto
(function() {
  const proveedorInput = document.getElementById('proveedor_autocomplete');
  const proveedorSuggestions = document.getElementById('proveedor_suggestions');
  const proveedorHidden = document.getElementById('proveedor_id_hidden');
  const productoInput = document.getElementById('producto_autocomplete');
  const productoSuggestions = document.getElementById('autocomplete_suggestions');
  const productoHidden = document.getElementById('producto_id_hidden');
  const errorMsg = document.getElementById('addManualErrorMsg');
  const form = document.querySelector('#addManualModal form');
  let currentFocus = -1;
  let proveedores = [];
  let productos = [];

  if (!proveedorInput || !proveedorSuggestions || !proveedorHidden || 
      !productoInput || !productoSuggestions || !productoHidden || 
      !errorMsg || !form) {
    return;
  }

  function closeProveedorSuggestions() {
    if (proveedorSuggestions) {
      proveedorSuggestions.innerHTML = '';
      proveedorSuggestions.style.display = 'none';
      proveedorSuggestions.style.visibility = 'hidden';
      proveedorSuggestions.style.opacity = '0';
      proveedorSuggestions.style.boxShadow = 'none';
      proveedorSuggestions.style.border = 'none';
      proveedorSuggestions.style.marginTop = '0';
      proveedorSuggestions.style.height = '0';
      proveedorSuggestions.style.overflow = 'hidden';
    }
    currentFocus = -1;
  }

  function closeProductoSuggestions() {
    if (productoSuggestions) {
      productoSuggestions.innerHTML = '';
      productoSuggestions.style.display = 'none';
      productoSuggestions.style.visibility = 'hidden';
      productoSuggestions.style.opacity = '0';
      productoSuggestions.style.boxShadow = 'none';
      productoSuggestions.style.border = 'none';
      productoSuggestions.style.marginTop = '0';
      productoSuggestions.style.height = '0';
      productoSuggestions.style.overflow = 'hidden';
    }
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

  function renderProveedorSuggestions(items) {
    proveedorSuggestions.innerHTML = '';
    if (!items.length) {
      proveedorSuggestions.style.display = 'none';
      return;
    }
    // Limitar a 5 resultados
    const limitedItems = items.slice(0, 5);
    // Obtener el ancho del input de producto
    const productoInput = document.getElementById('producto_autocomplete');
    let anchoProducto = 0;
    if (productoInput) {
      anchoProducto = productoInput.getBoundingClientRect().width;
    }
    // Ajustar el ancho del contenedor de sugerencias de proveedor al del input de producto
    if (anchoProducto > 0) {
      proveedorSuggestions.style.width = anchoProducto + 'px';
    }
    // Mantener la posición absoluta si ya estaba configurada
    proveedorSuggestions.style.position = 'absolute';
    proveedorSuggestions.style.zIndex = '1060';
    limitedItems.forEach((item, idx) => {
      const div = document.createElement('button');
      div.type = 'button';
      div.className = 'list-group-item list-group-item-action';
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${item.nombre}</strong>
            <br>
            <small class="text-muted">${item.telefono} | ${item.correo}</small>
          </div>
        </div>
      `;
      div.onclick = function() {
        proveedorInput.value = item.nombre;
        proveedorHidden.value = item.id;
        closeProveedorSuggestions();
        clearError();
        
        // Si ya hay un producto seleccionado, verificar que sea compatible
        if (productoHidden.value) {
          verificarCompatibilidadProductoProveedor();
        } else {
          // Si no hay producto, habilitar búsqueda de productos para este proveedor
          productoInput.disabled = false;
          // No hacer focus automático, las opciones aparecerán cuando el usuario interactúe
        }
      };
      proveedorSuggestions.appendChild(div);
    });
    proveedorSuggestions.style.display = 'block';
    proveedorSuggestions.style.visibility = 'visible';
    proveedorSuggestions.style.opacity = '1';
    proveedorSuggestions.style.marginTop = '2px';
    proveedorSuggestions.style.height = 'auto';
    proveedorSuggestions.style.overflow = 'auto';
    // Eliminar estilos inline para que se apliquen los estilos CSS del template
    proveedorSuggestions.style.removeProperty('box-shadow');
    proveedorSuggestions.style.removeProperty('border');
  }

  function renderProductoSuggestions(items) {
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
        
        productoInput.value = item.nombre;
        productoHidden.value = item.id;
        closeProductoSuggestions();
        clearError();
        
        // Si ya hay un proveedor seleccionado, verificar que sea compatible
        if (proveedorHidden.value) {
          verificarCompatibilidadProductoProveedor();
        } else {
          // Si no hay proveedor, habilitar búsqueda de proveedores para este producto
          proveedorInput.disabled = false;
          // No hacer focus automático, las opciones aparecerán cuando el usuario interactúe
        }
      };
      productoSuggestions.appendChild(div);
    });
    productoSuggestions.style.display = 'block';
    productoSuggestions.style.visibility = 'visible';
    productoSuggestions.style.opacity = '1';
    productoSuggestions.style.marginTop = '2px';
    productoSuggestions.style.height = 'auto';
    productoSuggestions.style.overflow = 'auto';
    productoSuggestions.style.zIndex = '1050';
    // Eliminar estilos inline para que se apliquen los estilos CSS del template
    productoSuggestions.style.removeProperty('box-shadow');
    productoSuggestions.style.removeProperty('border');
  }

  function fetchProveedores() {
    const q = proveedorInput.value.trim();
    const productoId = productoHidden.value;
    
    // Mostrar todos los proveedores si no hay texto de búsqueda
    if (q.length === 0) {
      const url = productoId ? 
        `/entradas/autocomplete_proveedores/?q=${encodeURIComponent('')}&producto=${productoId}` :
        `/entradas/autocomplete_proveedores/?q=${encodeURIComponent('')}`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          proveedores = data.results || [];
          renderProveedorSuggestions(proveedores);
          proveedorHidden.value = '';
        });
      return;
    }

    // Si hay un producto seleccionado, buscar solo proveedores de ese producto
    const url = productoId ? 
      `/entradas/autocomplete_proveedores/?q=${encodeURIComponent(q)}&producto=${productoId}` :
      `/entradas/autocomplete_proveedores/?q=${encodeURIComponent(q)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        proveedores = data.results || [];
        renderProveedorSuggestions(proveedores);
        
        if (proveedores.length === 1) {
          proveedorHidden.value = proveedores[0].id;
        } else {
          proveedorHidden.value = '';
        }
      });
  }

  function fetchProductos() {
    const q = productoInput.value.trim();
    const proveedorId = proveedorHidden.value;
    
    // Mostrar todos los productos si no hay texto de búsqueda
    if (q.length === 0) {
      const url = proveedorId ? 
        `/entradas/autocomplete_productos/?q=${encodeURIComponent('')}&proveedor=${proveedorId}` :
        `/entradas/autocomplete_productos/?q=${encodeURIComponent('')}`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          productos = data.results || [];
          renderProductoSuggestions(productos);
          productoHidden.value = '';
        })
        .catch(error => {
          console.error('Error en fetchProductos:', error);
        });
      return;
    }

    // Si hay un proveedor seleccionado, buscar solo productos de ese proveedor
    const url = proveedorId ? 
      `/entradas/autocomplete_productos/?q=${encodeURIComponent(q)}&proveedor=${proveedorId}` :
      `/entradas/autocomplete_productos/?q=${encodeURIComponent(q)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        productos = data.results || [];
        renderProductoSuggestions(productos);
        
        if (productos.length === 1) {
          productoHidden.value = productos[0].id;
        } else {
          productoHidden.value = '';
        }
      })
      .catch(error => {
        console.error('Error en fetchProductos con texto:', error);
      });
  }

  function verificarCompatibilidadProductoProveedor() {
    const productoId = productoHidden.value;
    const proveedorId = proveedorHidden.value;
    
    if (!productoId || !proveedorId) return;
    
    // Verificar que el producto y proveedor sean compatibles
    fetch(`/entradas/verificar_compatibilidad/?producto=${productoId}&proveedor=${proveedorId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.compatible) {
          showError('⚠️ Este producto no está disponible con el proveedor seleccionado.');
          // Limpiar el campo que se seleccionó último
          if (proveedorInput.value && !productoInput.value) {
            productoHidden.value = '';
            productoInput.value = '';
          } else if (productoInput.value && !proveedorInput.value) {
            proveedorHidden.value = '';
            proveedorInput.value = '';
          }
        } else {
          clearError();
        }
      });
  }

  // Event listeners para proveedores
  proveedorInput.addEventListener('input', fetchProveedores);
  // Solo mostrar opciones cuando el usuario hace clic explícitamente, no en focus automático
  proveedorInput.addEventListener('click', function(e) {
    e.stopPropagation();
    // Siempre mostrar opciones al hacer clic, incluso si está vacío
    fetchProveedores();
  });
  
  // También mostrar opciones al hacer focus
  proveedorInput.addEventListener('focus', function(e) {
    e.stopPropagation();
    // Mostrar opciones al hacer focus si está vacío
    if (proveedorInput.value.trim().length === 0) {
      fetchProveedores();
    }
  });

  proveedorInput.addEventListener('keydown', function(e) {
    const items = proveedorSuggestions.querySelectorAll('.list-group-item');
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
      else if (proveedores.length === 1) {
        e.preventDefault();
        proveedorInput.value = proveedores[0].nombre;
        proveedorHidden.value = proveedores[0].id;
        closeProveedorSuggestions();
      }
    }
  });

  // Event listeners para productos
  productoInput.addEventListener('input', function() {
    // Si el usuario está escribiendo, limpiar la selección anterior
    if (productoInput.value.trim() !== productoHidden.value) {
      productoHidden.value = '';
    }
    fetchProductos();
  });
  
  // Mostrar opciones al hacer clic solo si no hay producto seleccionado
  productoInput.addEventListener('click', function(e) {
    e.stopPropagation();
    // Solo mostrar opciones si no hay producto seleccionado
    if (!productoHidden.value) {
      setTimeout(() => {
        fetchProductos();
      }, 10);
    }
  });
  
  // No mostrar opciones automáticamente al hacer focus
  productoInput.addEventListener('focus', function(e) {
    e.stopPropagation();
    // No hacer nada automáticamente
  });

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
        closeProductoSuggestions();
      }
    }
  });

  // Cerrar sugerencias al hacer clic fuera (igual que en proveedor-producto)
  document.addEventListener('click', function(e) {
    if (productoInput && productoSuggestions) {
      if (!productoInput.contains(e.target) && !productoSuggestions.contains(e.target)) {
        closeProductoSuggestions();
      }
    }
    if (proveedorInput && proveedorSuggestions) {
      if (!proveedorInput.contains(e.target) && !proveedorSuggestions.contains(e.target)) {
        closeProveedorSuggestions();
      }
    }
  });

  // Validar formulario antes de enviar
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const proveedorInput = document.getElementById('proveedor_autocomplete').value.trim();
    const productoInput = document.getElementById('producto_autocomplete').value.trim();
    const cantidadInput = document.getElementById('cantidad').value.trim();
    const cantidad = parseInt(cantidadInput);

    if (!proveedorInput) {
      showError('⚠️ Por favor, ingrese un proveedor.');
      return;
    }

    if (!proveedorHidden.value) {
      showError(`⚠️ No se encontró el proveedor "<strong>${proveedorInput}</strong>".`);
      return;
    }

    if (!productoInput) {
      showError('⚠️ Por favor, ingrese un producto.');
      return;
    }

    if (!productoHidden.value) {
      showError(`⚠️ No se encontró el producto "<strong>${productoInput}</strong>".`);
      return;
    }

    if (isNaN(cantidad) || cantidad <= 0) {
      showError('⚠️ Por favor, ingrese una cantidad válida.');
      return;
    }

    // Si todo está bien, el envío lo maneja el otro event listener con AJAX
  });

  // Limpiar al abrir el modal
  const addManualModal = document.getElementById('addManualModal');
  addManualModal.addEventListener('show.bs.modal', function() {
    clearError();
    
    // Verificar si hay un proveedor ya seleccionado (input readonly)
    const proveedorReadonly = document.querySelector('#addManualModal input[readonly]');
    const proveedorHidden = document.getElementById('proveedor_id_hidden');
    const proveedorInput = document.getElementById('proveedor_autocomplete');
    const proveedorSuggestions = document.getElementById('proveedor_suggestions');
    const cantidadInput = document.getElementById('cantidad');
    const errorMsg = document.getElementById('addManualErrorMsg');
    
    if (proveedorReadonly && proveedorHidden && proveedorHidden.value) {
      // Si hay un proveedor ya seleccionado, solo limpiar producto y cantidad
      productoInput.value = '';
      productoHidden.value = '';
      if (cantidadInput) cantidadInput.value = '';
      productoInput.disabled = false;
    } else {
      // Si no hay proveedor seleccionado, limpiar todos los campos
      if (proveedorInput) proveedorInput.value = '';
      if (proveedorHidden) proveedorHidden.value = '';
      productoInput.value = '';
      productoHidden.value = '';
      if (proveedorInput) proveedorInput.disabled = false;
      productoInput.disabled = false;
    }
    
    // Limpiar sugerencias
    closeProveedorSuggestions();
    closeProductoSuggestions();
    
    // Limpiar contenedores de sugerencias completamente
    if (proveedorSuggestions) {
      proveedorSuggestions.innerHTML = '';
      proveedorSuggestions.style.display = 'none';
      proveedorSuggestions.style.visibility = 'hidden';
      proveedorSuggestions.style.opacity = '0';
      proveedorSuggestions.style.boxShadow = 'none';
      proveedorSuggestions.style.border = 'none';
      proveedorSuggestions.style.marginTop = '0';
      proveedorSuggestions.style.height = '0';
      proveedorSuggestions.style.overflow = 'hidden';
    }
    const autocompleteSuggestions = document.getElementById('autocomplete_suggestions');
    if (autocompleteSuggestions) {
      autocompleteSuggestions.innerHTML = '';
      autocompleteSuggestions.style.display = 'none';
      autocompleteSuggestions.style.visibility = 'hidden';
      autocompleteSuggestions.style.opacity = '0';
      autocompleteSuggestions.style.boxShadow = 'none';
      autocompleteSuggestions.style.border = 'none';
      autocompleteSuggestions.style.marginTop = '0';
      autocompleteSuggestions.style.height = '0';
      autocompleteSuggestions.style.overflow = 'hidden';
    }
    
    // Restablecer cantidad a vacío
    if (cantidadInput) cantidadInput.value = '';
    
    // Limpiar mensajes de error
    if (errorMsg) {
      errorMsg.classList.add('d-none');
      errorMsg.innerHTML = '';
    }
  });
  
  // También limpiar cuando se cierra el modal
  addManualModal.addEventListener('hidden.bs.modal', function() {
    const proveedorReadonly = document.querySelector('#addManualModal input[readonly]');
    const proveedorHidden = document.getElementById('proveedor_id_hidden');
    const proveedorInput = document.getElementById('proveedor_autocomplete');
    const proveedorSuggestions = document.getElementById('proveedor_suggestions');
    const productoInput = document.getElementById('producto_autocomplete');
    const productoHidden = document.getElementById('producto_id_hidden');
    const autocompleteSuggestions = document.getElementById('autocomplete_suggestions');
    
    // Solo limpiar si no hay proveedor seleccionado (readonly)
    if (!proveedorReadonly || !proveedorHidden || !proveedorHidden.value) {
      if (proveedorInput) proveedorInput.value = '';
      if (proveedorHidden) proveedorHidden.value = '';
    }
    
    // Siempre limpiar producto
    if (productoInput) productoInput.value = '';
    if (productoHidden) productoHidden.value = '';
    
    // Limpiar sugerencias completamente
    if (proveedorSuggestions) {
      proveedorSuggestions.innerHTML = '';
      proveedorSuggestions.style.display = 'none';
      proveedorSuggestions.style.visibility = 'hidden';
      proveedorSuggestions.style.opacity = '0';
      proveedorSuggestions.style.boxShadow = 'none';
      proveedorSuggestions.style.border = 'none';
      proveedorSuggestions.style.marginTop = '0';
      proveedorSuggestions.style.height = '0';
      proveedorSuggestions.style.overflow = 'hidden';
    }
    if (autocompleteSuggestions) {
      autocompleteSuggestions.innerHTML = '';
      autocompleteSuggestions.style.display = 'none';
      autocompleteSuggestions.style.visibility = 'hidden';
      autocompleteSuggestions.style.opacity = '0';
      autocompleteSuggestions.style.boxShadow = 'none';
      autocompleteSuggestions.style.border = 'none';
      autocompleteSuggestions.style.marginTop = '0';
      autocompleteSuggestions.style.height = '0';
      autocompleteSuggestions.style.overflow = 'hidden';
    }
  });
})();

// Script para el escaneo de códigos
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

        // Validar el código
        fetch('/entradas/validar_codigo/?codigo=' + encodeURIComponent(codigo))
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
})();

// Función global para manejar el envío del formulario de agregar al carrito
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

// Función para actualizar solo la sección del carrito
function actualizarSeccionCarrito() {
  
  // Hacer la petición para obtener el HTML actualizado
  fetch(window.location.href)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      
      // Crear un parser para el HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Buscar todos los cards en el HTML nuevo
      const cardsNuevos = doc.querySelectorAll('.card');
      
      // Buscar todos los cards en el HTML actual
      const cardsActuales = document.querySelectorAll('.card');
      
      // Buscar el card del carrito en el HTML nuevo
      let carritoCardNuevo = null;
      for (let i = 0; i < cardsNuevos.length; i++) {
        const card = cardsNuevos[i];
        const header = card.querySelector('.card-header');
        if (header && (header.textContent.includes('Carrito de Entrada') || header.textContent.includes('Carrito de Compra'))) {
          carritoCardNuevo = card;
          break;
        }
      }
      
      // Buscar el card del carrito en el HTML actual
      let carritoCardActual = null;
      for (let i = 0; i < cardsActuales.length; i++) {
        const card = cardsActuales[i];
        const header = card.querySelector('.card-header');
        if (header && (header.textContent.includes('Carrito de Entrada') || header.textContent.includes('Carrito de Compra'))) {
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
      
      // Verificar que encontramos ambas secciones
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
      
      // Actualizar también el modal si existe
      const modalNuevo = doc.querySelector('#addManualModal');
      const modalActual = document.querySelector('#addManualModal');
      if (modalNuevo && modalActual) {
        modalActual.innerHTML = modalNuevo.innerHTML;
        
        // Re-inicializar los event listeners del modal
        inicializarEventListenersModal();
      }
      
      // Re-inicializar los event listeners
      inicializarEventListenersCarrito();
      
      // Re-inicializar contadores de caracteres
      inicializarContadorObservaciones();
      
    })
    .catch(error => {
      console.error('Error al actualizar carrito:', error);
    });
}

// Funciones globales para autocompletado
function fetchProveedoresGlobal() {
  // Si hay un bloqueo activo, no hacer búsqueda automática
  if (bloqueoBusquedaAutomatica) {
    return;
  }
  
  // Buscar el input de proveedor (puede ser readonly o editable)
  const proveedorInput = document.getElementById('proveedor_autocomplete');
  const productoHidden = document.getElementById('producto_id_hidden');
  const proveedorSuggestions = document.getElementById('proveedor_suggestions');
  
  // Si no hay input editable de proveedor, no hacer nada (proveedor ya seleccionado)
  if (!proveedorInput || !proveedorSuggestions) {
    return;
  }
  
  const q = proveedorInput.value.trim();
  const productoId = productoHidden ? productoHidden.value : '';
  
  // Mostrar todos los proveedores si no hay texto de búsqueda
  if (q.length === 0) {
    const url = productoId ? 
      `/entradas/autocomplete_proveedores/?q=${encodeURIComponent('')}&producto=${productoId}` :
      `/entradas/autocomplete_proveedores/?q=${encodeURIComponent('')}`;
    
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const proveedores = data.results || [];
        renderProveedorSuggestionsGlobal(proveedores);
      })
      .catch(error => {
        console.error('fetchProveedoresGlobal - Error:', error);
      });
    return;
  }

  // Si hay un producto seleccionado, buscar solo proveedores de ese producto
  const url = productoId ? 
    `/entradas/autocomplete_proveedores/?q=${encodeURIComponent(q)}&producto=${productoId}` :
    `/entradas/autocomplete_proveedores/?q=${encodeURIComponent(q)}`;


  fetch(url)
    .then(res => res.json())
    .then(data => {
      const proveedores = data.results || [];
      renderProveedorSuggestionsGlobal(proveedores);
    })
    .catch(error => {
      console.error('fetchProveedoresGlobal - Error (con texto):', error);
    });
}

function fetchProductosGlobal() {
  // Si hay un bloqueo activo, no hacer búsqueda automática
  if (bloqueoBusquedaAutomatica) {
    return;
  }
  
  const productoInput = document.getElementById('producto_autocomplete');
  const proveedorHidden = document.getElementById('proveedor_id_hidden');
  const productoSuggestions = document.getElementById('autocomplete_suggestions');
  
  if (!productoInput || !productoSuggestions) {
    return;
  }
  
  const q = productoInput.value.trim();
  const proveedorId = proveedorHidden ? proveedorHidden.value : '';
  
  // Mostrar todos los productos si no hay texto de búsqueda
  if (q.length === 0) {
    const url = proveedorId ? 
      `/entradas/autocomplete_productos/?q=${encodeURIComponent('')}&proveedor=${proveedorId}` :
      `/entradas/autocomplete_productos/?q=${encodeURIComponent('')}`;
    
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

  // Si hay un proveedor seleccionado, buscar solo productos de ese proveedor
  const url = proveedorId ? 
    `/entradas/autocomplete_productos/?q=${encodeURIComponent(q)}&proveedor=${proveedorId}` :
    `/entradas/autocomplete_productos/?q=${encodeURIComponent(q)}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const productos = data.results || [];
      renderProductoSuggestionsGlobal(productos);
    })
    .catch(error => {
      console.error('Error en fetchProductos con texto:', error);
    });
}

function renderProveedorSuggestionsGlobal(items) {
  const proveedorSuggestions = document.getElementById('proveedor_suggestions');
  const proveedorInput = document.getElementById('proveedor_autocomplete');
  const proveedorHidden = document.getElementById('proveedor_id_hidden');
  
  // Si no hay input editable de proveedor, no mostrar sugerencias
  if (!proveedorSuggestions || !proveedorInput) {
    return;
  }
  
  proveedorSuggestions.innerHTML = '';
  if (!items.length) {
    proveedorSuggestions.style.display = 'none';
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
          <small class="text-muted">${item.telefono || 'Sin teléfono'} | ${item.correo || 'Sin correo'}</small>
        </div>
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
      closeProveedorSuggestionsGlobal();
      clearErrorGlobal();
      
      // Cerrar cualquier sugerencia de producto que esté abierta
      closeProductoSuggestionsGlobal();
      
      // Usar setTimeout(0) para cambiar el valor en el siguiente ciclo de eventos
      // Esto asegura que el bloqueo esté completamente activo antes del cambio
      setTimeout(() => {
        // Establecer valores
        proveedorInput.value = item.nombre;
        if (proveedorHidden) proveedorHidden.value = item.id;
        
        // Desactivar banderas después de un breve delay adicional
        setTimeout(() => {
          bloqueoBusquedaAutomatica = false;
          seleccionandoDesdeOpciones = false;
        }, 100);
      }, 0);
      
      // Si ya hay un producto seleccionado, verificar que sea compatible
      const productoHidden = document.getElementById('producto_id_hidden');
      if (productoHidden && productoHidden.value) {
        verificarCompatibilidadProductoProveedorGlobal();
      } else {
        // Si no hay producto, habilitar búsqueda de productos para este proveedor
        const productoInput = document.getElementById('producto_autocomplete');
        if (productoInput) {
          productoInput.disabled = false;
          // No hacer focus automático, las opciones aparecerán cuando el usuario interactúe
        }
      }
    };
    proveedorSuggestions.appendChild(div);
  });
  proveedorSuggestions.style.display = 'block';
  proveedorSuggestions.style.visibility = 'visible';
  proveedorSuggestions.style.opacity = '1';
  proveedorSuggestions.style.marginTop = '2px';
  proveedorSuggestions.style.height = 'auto';
  proveedorSuggestions.style.overflow = 'auto';
  // Eliminar estilos inline para que se apliquen los estilos CSS del template
  proveedorSuggestions.style.removeProperty('box-shadow');
  proveedorSuggestions.style.removeProperty('border');
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
      
      // Activar banderas ANTES de cambiar el valor
      bloqueoBusquedaAutomatica = true;
      seleccionandoDesdeOpciones = true;
      
      // Cerrar sugerencias inmediatamente ANTES de cambiar el valor
      closeProductoSuggestionsGlobal();
      clearErrorGlobal();
      
      // Cerrar cualquier sugerencia de proveedor que esté abierta
      closeProveedorSuggestionsGlobal();
      
      // Usar setTimeout(0) para cambiar el valor en el siguiente ciclo de eventos
      // Esto asegura que el bloqueo esté completamente activo antes del cambio
      setTimeout(() => {
        productoInput.value = item.nombre;
        if (productoHidden) productoHidden.value = item.id;
        
        // Desactivar banderas después de un breve delay adicional
        setTimeout(() => {
          bloqueoBusquedaAutomatica = false;
          seleccionandoDesdeOpciones = false;
        }, 100);
      }, 0);
      
      // Si ya hay un proveedor seleccionado, verificar que sea compatible
      const proveedorHidden = document.getElementById('proveedor_id_hidden');
      if (proveedorHidden && proveedorHidden.value) {
        verificarCompatibilidadProductoProveedorGlobal();
      } else {
        // Si no hay proveedor, habilitar búsqueda de proveedores para este producto
        const proveedorInput = document.getElementById('proveedor_autocomplete');
        if (proveedorInput) {
          proveedorInput.disabled = false;
          // No hacer focus automático, las opciones aparecerán cuando el usuario interactúe
        }
      }
    };
    productoSuggestions.appendChild(div);
  });
  productoSuggestions.style.display = 'block';
  productoSuggestions.style.visibility = 'visible';
  productoSuggestions.style.opacity = '1';
  productoSuggestions.style.marginTop = '2px';
  productoSuggestions.style.height = 'auto';
  productoSuggestions.style.overflow = 'auto';
  // Eliminar estilos inline para que se apliquen los estilos CSS del template
  productoSuggestions.style.removeProperty('box-shadow');
  productoSuggestions.style.removeProperty('border');
}

function closeProveedorSuggestionsGlobal() {
  const proveedorSuggestions = document.getElementById('proveedor_suggestions');
  if (proveedorSuggestions) {
    proveedorSuggestions.innerHTML = '';
    proveedorSuggestions.style.display = 'none';
    proveedorSuggestions.style.visibility = 'hidden';
    proveedorSuggestions.style.opacity = '0';
    proveedorSuggestions.style.boxShadow = 'none';
    proveedorSuggestions.style.border = 'none';
    proveedorSuggestions.style.marginTop = '0';
    proveedorSuggestions.style.height = '0';
    proveedorSuggestions.style.overflow = 'hidden';
  }
}

function closeProductoSuggestionsGlobal() {
  const productoSuggestions = document.getElementById('autocomplete_suggestions');
  if (productoSuggestions) {
    productoSuggestions.innerHTML = '';
    productoSuggestions.style.display = 'none';
    productoSuggestions.style.visibility = 'hidden';
    productoSuggestions.style.opacity = '0';
    productoSuggestions.style.boxShadow = 'none';
    productoSuggestions.style.border = 'none';
    productoSuggestions.style.marginTop = '0';
    productoSuggestions.style.height = '0';
    productoSuggestions.style.overflow = 'hidden';
  }
}

function clearErrorGlobal() {
  const errorMsg = document.getElementById('addManualErrorMsg');
  if (errorMsg) {
    errorMsg.classList.add('d-none');
    errorMsg.innerHTML = '';
  }
}

function verificarCompatibilidadProductoProveedorGlobal() {
  const productoHidden = document.getElementById('producto_id_hidden');
  const proveedorHidden = document.getElementById('proveedor_id_hidden');
  
  if (!productoHidden || !proveedorHidden || !productoHidden.value || !proveedorHidden.value) return;
  
  // Verificar que el producto y proveedor sean compatibles
  fetch(`/entradas/verificar_compatibilidad/?producto=${productoHidden.value}&proveedor=${proveedorHidden.value}`)
    .then(res => res.json())
    .then(data => {
      if (!data.compatible) {
        showErrorGlobal('⚠️ Este producto no está disponible con el proveedor seleccionado.');
        // Limpiar el campo que se seleccionó último
        const proveedorInput = document.getElementById('proveedor_autocomplete');
        const productoInput = document.getElementById('producto_autocomplete');
        
        if (proveedorInput && productoInput) {
          if (proveedorInput.value && !productoInput.value) {
            productoHidden.value = '';
            productoInput.value = '';
          } else if (productoInput.value && !proveedorInput.value) {
            proveedorHidden.value = '';
            proveedorInput.value = '';
          }
        }
      } else {
        clearErrorGlobal();
      }
    });
}

function showErrorGlobal(message) {
  const errorMsg = document.getElementById('addManualErrorMsg');
  if (errorMsg) {
    errorMsg.classList.remove('d-none');
    errorMsg.innerHTML = message;
  }
}

// Función para inicializar los event listeners del modal
function inicializarEventListenersModal() {
  
  // Obtener referencias a los elementos del modal
  const proveedorInput = document.getElementById('proveedor_autocomplete');
  const productoInput = document.getElementById('producto_autocomplete');
  const proveedorHidden = document.getElementById('proveedor_id_hidden');
  const productoHidden = document.getElementById('producto_id_hidden');
  const proveedorSuggestions = document.getElementById('proveedor_suggestions');
  const productoSuggestions = document.getElementById('autocomplete_suggestions');
  const form = document.querySelector('#addManualModal form');
  
  // Verificar que el producto input existe (siempre debe existir)
  if (!productoInput || !productoHidden) {
    return;
  }
  
  // Remover event listeners existentes para evitar duplicados
  productoInput.removeEventListener('input', fetchProductosGlobal);
  productoInput.removeEventListener('focus', fetchProductosGlobal);
  productoInput.removeEventListener('click', fetchProductosGlobal);
  
  // Re-agregar event listeners del producto (solo input y click, no focus automático)
  productoInput.addEventListener('input', function() {
    // No buscar si se está seleccionando desde opciones
    if (seleccionandoDesdeOpciones) {
      return;
    }
    
    // Si el usuario está escribiendo, limpiar la selección anterior
    const productoHidden = document.getElementById('producto_id_hidden');
    if (productoHidden && productoHidden.value) {
      // Si el texto no coincide con el producto seleccionado, limpiar la selección
      const textoActual = productoInput.value.trim();
      if (textoActual.length > 0) {
        productoHidden.value = '';
      }
    }
    
    // Solo buscar si no hay bloqueo activo
    if (!bloqueoBusquedaAutomatica) {
      fetchProductosGlobal();
    }
  });
  
  productoInput.addEventListener('click', function(e) {
    e.stopPropagation();
    // Solo mostrar opciones si no hay producto seleccionado
    const productoHidden = document.getElementById('producto_id_hidden');
    if (!productoHidden || !productoHidden.value) {
      // Si no hay producto seleccionado, mostrar opciones
      setTimeout(() => {
        if (!bloqueoBusquedaAutomatica) {
          fetchProductosGlobal();
        }
      }, 10);
    }
  });
  
  // Agregar listener de focus solo para limpiar selección si el usuario empieza a escribir
  productoInput.addEventListener('focus', function(e) {
    e.stopPropagation();
    // No hacer nada automáticamente, solo permitir que el usuario escriba
  });
  
  // Solo agregar event listeners del proveedor si existe el input editable
  if (proveedorInput && proveedorSuggestions) {
    proveedorInput.removeEventListener('input', fetchProveedoresGlobal);
    proveedorInput.removeEventListener('focus', fetchProveedoresGlobal);
    proveedorInput.removeEventListener('click', fetchProveedoresGlobal);
    
    proveedorInput.addEventListener('input', function() {
      // No buscar si hay bloqueo activo o si se está seleccionando desde opciones
      if (!bloqueoBusquedaAutomatica && !seleccionandoDesdeOpciones) {
        fetchProveedoresGlobal();
      }
    });
    proveedorInput.addEventListener('click', function(e) {
      // Solo mostrar opciones si el usuario hace clic explícitamente en el campo
      // No mostrar si el campo fue habilitado automáticamente
      if (proveedorInput.value.trim().length === 0 && !proveedorInput.disabled && !bloqueoBusquedaAutomatica) {
        fetchProveedoresGlobal();
      }
    });
  } else {
  }
  
  
  // Re-agregar el event listener del formulario
  const addToCartForm = document.querySelector('#addManualModal form');
  if (addToCartForm) {
    // Remover event listeners existentes para evitar duplicados
    addToCartForm.removeEventListener('submit', handleAddToCart);
    // Agregar el nuevo event listener
    addToCartForm.addEventListener('submit', handleAddToCart);
  } else {
  }
}

// Función para inicializar los event listeners del carrito
function inicializarEventListenersCarrito() {
  
  // Event listeners para eliminar del carrito
  const deleteFromCartForms = document.querySelectorAll('form[action*="carrito/eliminar"]');
  
  deleteFromCartForms.forEach((form, index) => {
    // Remover event listeners existentes para evitar duplicados
    form.removeEventListener('submit', handleDeleteFromCart);
    // Agregar el nuevo event listener
    form.addEventListener('submit', handleDeleteFromCart);
  });
  
  // Event listeners para editar cantidad del carrito
  const editCartForms = document.querySelectorAll('form[action*="carrito/editar"]');
  
  editCartForms.forEach((form, index) => {
    // Remover event listeners existentes para evitar duplicados
    form.removeEventListener('submit', handleEditCartQuantity);
    // Agregar el nuevo event listener
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
        // Validar y actualizar solo si el valor es válido
        const newValue = parseInt(this.value);
        if (!isNaN(newValue) && newValue >= parseInt(this.min) && newValue <= parseInt(this.max) && newValue !== parseInt(originalValue)) {
          // Asegurarse de que el FormData tenga el valor actualizado
          const formData = new FormData(form);
          formData.set('cantidad', this.value);
          // Crear un evento personalizado con el FormData actualizado
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        } else if (isNaN(newValue) || newValue < parseInt(this.min) || newValue > parseInt(this.max)) {
          // Si el valor no es válido, restaurar el original
          this.value = originalValue;
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
          // Validar y actualizar solo si el valor es válido
          const newValue = parseInt(this.value);
          if (!isNaN(newValue) && newValue >= this.min && newValue <= this.max && newValue !== parseInt(originalValue)) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          } else if (isNaN(newValue) || newValue < this.min || newValue > this.max) {
            // Si el valor no es válido, restaurar el original
            this.value = originalValue;
          }
          this.blur();
        }
      });
    }
  });
  
  // Event listener para finalizar compra
  const finalizarCompraForm = document.querySelector('form[action*="carrito/finalizar"]');
  if (finalizarCompraForm) {
    // Remover event listeners existentes para evitar duplicados
    finalizarCompraForm.removeEventListener('submit', handleFinalizarCompra);
    // Agregar el nuevo event listener
    finalizarCompraForm.addEventListener('submit', handleFinalizarCompra);
  } else {
  }
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
      
      // Actualizar solo la sección del carrito
      actualizarSeccionCarrito();
    } else {
      mostrarMensajeEnPagina(data.message, 'danger');
    }
    
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  })
  .catch(error => {
    console.error('Error al eliminar del carrito:', error);
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
  if (isNaN(newValue) || newValue < parseInt(input.min) || newValue > parseInt(input.max)) {
    mostrarMensajeEnPagina('Cantidad inválida o fuera de rango.', 'danger');
    input.value = originalValue;
    return;
  }
  
  // Crear FormData y asegurarse de que tenga el valor actualizado del input
  const formData = new FormData(this);
  formData.set('cantidad', input.value); // Asegurar que el valor esté actualizado
  
  // Mostrar indicador de carga en el input
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
      // Actualizar solo la sección del carrito sin mostrar mensaje
      actualizarSeccionCarrito();
    } else {
      mostrarMensajeEnPagina(data.message, 'danger');
      // Restaurar el valor original si hay error
      input.value = originalValue;
    }
    
    input.style.opacity = '1';
    input.disabled = false;
  })
  .catch(error => {
    console.error('Error al editar cantidad del carrito:', error);
    mostrarMensajeEnPagina('Error al editar cantidad del carrito', 'danger');
    // Restaurar el valor original si hay error
    input.value = originalValue;
    input.style.opacity = '1';
    input.disabled = false;
  });
}

// Función para manejar la finalización de compra
function handleFinalizarCompra(e) {
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
      
      // Actualizar el carrito
      actualizarSeccionCarrito();
      
      // Actualizar solo el historial de entradas
      actualizarTablaCompras();
    } else {
      mostrarMensajeEnPagina(data.message, 'danger');
    }
    
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  })
  .catch(error => {
    console.error('Error al finalizar compra:', error);
    mostrarMensajeEnPagina('Error al finalizar la compra', 'danger');
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  });
}

// Función para manejar el cambio de cantidad
function handleCantidadChange() {
  const input = this;
  const cantidad = parseInt(input.value);
  const max = parseInt(input.getAttribute('max'));
  
  // Validar que no exceda la cantidad máxima permitida
  if (max && cantidad > max) {
    input.value = max;
    mostrarMensajeEnPagina(`La cantidad máxima permitida es ${max} unidades.`, 'warning');
  }
  
  const form = this.closest('form');
  if (form) {
    form.dispatchEvent(new Event('submit'));
  }
}

// Abrir modal de agregar manual desde botón (si existe)
const btnAgregarManual = document.getElementById('btnAgregarManual');
if (btnAgregarManual) {
  btnAgregarManual.addEventListener('click', () => {
    // Ocultar modal de escaneo
    const scanModalEl = document.getElementById('scanCodeModal');
    const scanModal = bootstrap.Modal.getInstance(scanModalEl);
    scanModal.hide();

    // Abrir modal de añadir compra
    const addManualModal = new bootstrap.Modal(document.getElementById('addManualModal'));
    addManualModal.show();
  });
}

// Manejar formularios de eliminar del carrito con AJAX
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

document.addEventListener('DOMContentLoaded', function() {
  inicializarEventListenersCarrito();
  inicializarContadorObservaciones();
});
