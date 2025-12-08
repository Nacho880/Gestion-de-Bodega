/**
 * Funcionalidad genérica para deshacer eliminaciones
 * Se puede reutilizar en cualquier módulo del sistema
 */

class UndoDelete {
    constructor(options = {}) {
        this.storageKey = options.storageKey || 'itemEliminado';
        this.timeout = options.timeout || 300000; // 5 minutos por defecto
        this.alertClass = options.alertClass || 'alert-danger';
        this.successMessage = options.successMessage || 'Elemento eliminado exitosamente.';
        this.restoreMessage = options.restoreMessage || 'Elemento restaurado correctamente.';
        this.timeoutMessage = options.timeoutMessage || 'El tiempo para deshacer ha expirado (5 minutos).';
    }

    /**
     * Guarda los datos del elemento eliminado
     */
    saveDeletedItem(data) {
        const itemData = {
            ...data,
            timestamp: new Date().getTime()
        };
        sessionStorage.setItem(this.storageKey, JSON.stringify(itemData));
    }

    /**
     * Obtiene los datos del elemento eliminado
     */
    getDeletedItem() {
        const itemStr = sessionStorage.getItem(this.storageKey);
        if (!itemStr) return null;
        
        const item = JSON.parse(itemStr);
        
        // Verificar si ha expirado
        const tiempoTranscurrido = new Date().getTime() - item.timestamp;
        if (tiempoTranscurrido > this.timeout) {
            sessionStorage.removeItem(this.storageKey);
            return null;
        }
        
        return item;
    }

    /**
     * Limpia los datos del elemento eliminado
     */
    clearDeletedItem() {
        sessionStorage.removeItem(this.storageKey);
    }

    /**
     * Crea el mensaje de alerta con botón de deshacer
     */
    createAlertMessage() {
        return `
            <div class="alert ${this.alertClass} alert-dismissible fade show mt-3" role="alert">
                <div class="d-flex justify-content-between align-items-center">
                    <span>${this.successMessage}</span>
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-outline-light btn-sm" id="btnDeshacerEliminacion">
                            <i class="bi bi-arrow-counterclockwise me-1"></i>Deshacer
                        </button>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert" aria-label="Cerrar"></button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Muestra el mensaje de eliminación con opción de deshacer
     */
    showDeleteMessage(containerSelector = '.card') {
        const alertHtml = this.createAlertMessage();
        $(`<div id="alertEliminacion"></div>`).html(alertHtml).insertBefore(containerSelector);
        
        // Auto-ocultar después de 10 segundos
        setTimeout(() => {
            $('#alertEliminacion').fadeOut();
        }, 10000);
    }

    /**
     * Configura el evento de deshacer
     */
    setupUndoEvent(callback) {
        $(document).on('click', '#btnDeshacerEliminacion', () => {
            const deletedItem = this.getDeletedItem();
            if (!deletedItem) {
                alert(this.timeoutMessage);
                $('#alertEliminacion').fadeOut();
                return;
            }

            // Ocultar mensaje de eliminación
            $('#alertEliminacion').fadeOut();

            // Ejecutar callback de restauración
            if (callback && typeof callback === 'function') {
                callback(deletedItem);
            }

            // Limpiar datos
            this.clearDeletedItem();
        });
    }

    /**
     * Muestra mensaje de restauración exitosa
     */
    showRestoreMessage() {
        $(`<div class="alert alert-success alert-dismissible fade show mt-3" role="alert">
            ${this.restoreMessage}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
        </div>`).insertBefore('.card');
    }
}

// Función helper para usar en cualquier plantilla
function setupUndoDelete(options = {}) {
    const undoDelete = new UndoDelete(options);
    
    // Configurar evento de deshacer
    undoDelete.setupUndoEvent((deletedItem) => {
        // Callback por defecto - se puede sobrescribir
        undoDelete.showRestoreMessage();
    });
    
    return undoDelete;
} 
