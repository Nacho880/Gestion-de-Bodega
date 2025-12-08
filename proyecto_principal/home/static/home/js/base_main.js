

$(document).ready(function () {
  // DataTables ya no se inicializa automáticamente
  // El sistema unificado maneja las tablas principales
  // Solo se usa DataTables en tablas específicas como categoria_producto y proveedor_producto

  // --- Código para menú móvil ---
  $('#mobileMenuToggle').on('click', function () {
    $('#sidebar').toggleClass('mobile-open');
    $('#sidebarOverlay').toggleClass('active');
  });
  $('#sidebarOverlay').on('click', function () {
    $('#sidebar').removeClass('mobile-open');
    $('#sidebarOverlay').removeClass('active');
  });
});