// Mejoras para DataTables - Paginación inteligente y diseño mejorado
$(document).ready(function() {
  // Función helper para generar infoCallback
  function createInfoCallback(entityName) {
    return function(settings, start, end, max, total, pre) {
      const pageLength = settings._iDisplayLength;
      const currentPage = Math.floor(start / pageLength) + 1;
      const totalPages = Math.ceil(total / pageLength);
      return `Página ${currentPage} de ${totalPages} | Total ${total} ${entityName}`;
    };
  }

  // Configuración base mejorada para DataTables
  const dataTableConfig = {
    // Configuración de idioma mejorada
    language: {
      infoEmpty: "Sin registros para mostrar",
      infoFiltered: "(filtrado de _MAX_ registros totales)",
      lengthMenu: "Mostrar _MENU_ registros",
      search: "🔍 Buscar:",
      zeroRecords: "No se encontraron registros coincidentes",
      paginate: {
        first: '««',
        last: '»»',
        next: '»',
        previous: '«'
      },
      processing: "Procesando...",
      loadingRecords: "Cargando...",
      emptyTable: "No hay datos disponibles en la tabla"
    },
    // Callback para el formato de información
    infoCallback: createInfoCallback("registro(s)"),
    
    // Configuración de paginación inteligente
    pageLength: 10,
    lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "Todos"]],
    
    // Configuración de DOM personalizada
    dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
         '<"row"<"col-sm-12"tr>>' +
         '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
    
    // Configuración de paginación personalizada
    pagingType: 'full_numbers',
    
    // Configuración de ordenamiento
    order: [[0, 'asc']],
    
    // Configuración de responsividad
    responsive: true,
    
    // Configuración de procesamiento
    processing: true,
    deferRender: true,
    
    // Configuración de búsqueda
    search: {
      smart: true,
      regex: false,
      caseInsensitive: true
    },
    
    // Configuración de columnas
    columnDefs: [
      {
        targets: '_all',
        className: 'text-center'
      }
    ],
    
    // Callbacks personalizados
    initComplete: function(settings, json) {
      // Mejorar la apariencia después de la inicialización
      enhanceDataTableAppearance(this);
    },
    
    drawCallback: function(settings) {
      // Mejorar la apariencia después de cada redibujado
      enhanceDataTableAppearance(this);
      
      // Agregar tooltips a las celdas truncadas después de cada redibujado
      addTooltipsToTruncatedCells(this);
    }
  };

  // Configuración global para la paginación de DataTables
  $.fn.DataTable.ext.pager.numbers_length = 5;

  // Función para mejorar la apariencia de DataTables
  function enhanceDataTableAppearance(table) {
    const wrapper = $(table).closest('.dataTables_wrapper');
    
    // Mejorar el diseño de los controles
    wrapper.find('.dataTables_length select').addClass('form-select form-select-sm');
    wrapper.find('.dataTables_filter input').addClass('form-control form-control-sm');
    
    // Agregar clases de Bootstrap a los botones de paginación
    wrapper.find('.paginate_button').each(function() {
      const $btn = $(this);
      
      // Remover clases existentes
      $btn.removeClass('btn btn-sm btn-outline-primary btn-outline-secondary');
      
      // Agregar clases apropiadas
      if ($btn.hasClass('current')) {
        $btn.addClass('btn btn-sm btn-primary');
      } else if ($btn.hasClass('disabled')) {
        $btn.addClass('btn btn-sm btn-outline-secondary disabled');
      } else {
        $btn.addClass('btn btn-sm btn-outline-primary');
      }
    });
    
    // Mejorar el espaciado y alineación
    wrapper.find('.dataTables_paginate').addClass('d-flex justify-content-center align-items-center flex-wrap gap-1');
    wrapper.find('.dataTables_info').addClass('text-muted small');
    
    // Agregar tooltips a las celdas truncadas
    addTooltipsToTruncatedCells(table);
  }

  // Función para agregar tooltips a celdas truncadas
  function addTooltipsToTruncatedCells(table) {
    const $table = $(table);
    
    $table.find('tbody td').each(function() {
      const $cell = $(this);
      const $lastCell = $cell.closest('tr').find('td:last-child');
      
      // No agregar tooltip a la última columna (acciones)
      if ($cell.is($lastCell)) {
        return;
      }
      
      const cellText = $cell.text().trim();
      const cellWidth = $cell.width();
      const textWidth = getTextWidth(cellText, $cell.css('font'));
      
      // Si el texto es más ancho que la celda, agregar tooltip
      if (textWidth > cellWidth) {
        $cell.attr('title', cellText);
      } else {
        $cell.removeAttr('title');
      }
    });
  }

  // Función auxiliar para calcular el ancho del texto
  function getTextWidth(text, font) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = font;
    return context.measureText(text).width;
  }

  // Función para inicializar DataTables con configuración mejorada
  function initializeEnhancedDataTable(selector, customConfig = {}) {
    const config = { ...dataTableConfig, ...customConfig };
    
    if ($.fn.DataTable.isDataTable(selector)) {
      $(selector).DataTable().destroy();
    }
    
    return $(selector).DataTable(config);
  }

  // Inicializar todas las tablas con clase 'datatable' que no estén ya inicializadas
  $('.datatable:not(.dataTable)').each(function() {
    const $table = $(this);
    const tableId = $table.attr('id') || 'datatable-' + Math.random().toString(36).substr(2, 9);
    
    // Configuración específica según el tipo de tabla
    let customConfig = {};
    
    // Detectar el tipo de tabla basado en el contexto o clases
    if ($table.closest('.card').find('h5, h6').text().toLowerCase().includes('producto')) {
      customConfig = {
        language: {
          ...dataTableConfig.language,
          infoEmpty: "Sin productos para mostrar",
          infoFiltered: "(filtrado de _MAX_ producto(s) totales)",
          lengthMenu: "Mostrar _MENU_ producto(s)",
          zeroRecords: "No se encontraron productos coincidentes"
        },
        infoCallback: createInfoCallback("producto(s)"),
        columnDefs: [
          { orderable: false, targets: [2, 7] }
        ]
      };
    } else if ($table.closest('.card').find('h5, h6').text().toLowerCase().includes('proveedor')) {
      customConfig = {
        language: {
          ...dataTableConfig.language,
          infoEmpty: "Sin proveedores para mostrar",
          infoFiltered: "(filtrado de _MAX_ proveedor(es) totales)",
          lengthMenu: "Mostrar _MENU_ proveedor(es)",
          zeroRecords: "No se encontraron proveedores coincidentes"
        },
        infoCallback: createInfoCallback("proveedor(es)"),
        columnDefs: [
          { orderable: false, targets: [1, 2, 7] }
        ]
      };
    } else if ($table.closest('.card').find('h5, h6').text().toLowerCase().includes('categoría') || 
               $table.closest('.card').find('h5, h6').text().toLowerCase().includes('categoria')) {
      customConfig = {
        language: {
          ...dataTableConfig.language,
          infoEmpty: "Sin categorías para mostrar",
          infoFiltered: "(filtrado de _MAX_ categoría(s) totales)",
          lengthMenu: "Mostrar _MENU_ categoría(s)",
          zeroRecords: "No se encontraron categorías coincidentes"
        },
        infoCallback: createInfoCallback("categoría(s)"),
        columnDefs: [
          { orderable: false, targets: [1, 2] }
        ]
      };
    } else if ($table.closest('.card').find('h5, h6').text().toLowerCase().includes('compra')) {
      customConfig = {
        language: {
          ...dataTableConfig.language,
          infoEmpty: "Sin compras para mostrar",
          infoFiltered: "(filtrado de _MAX_ compra(s) totales)",
          lengthMenu: "Mostrar _MENU_ compra(s)",
          zeroRecords: "No se encontraron compras coincidentes"
        },
        infoCallback: createInfoCallback("compra(s)"),
        columnDefs: [
          { orderable: false, targets: [1, 2, 7] }
        ]
      };
    } else if ($table.closest('.card').find('h5, h6').text().toLowerCase().includes('venta')) {
      customConfig = {
        language: {
          ...dataTableConfig.language,
          infoEmpty: "Sin ventas para mostrar",
          infoFiltered: "(filtrado de _MAX_ venta(s) totales)",
          lengthMenu: "Mostrar _MENU_ venta(s)",
          zeroRecords: "No se encontraron ventas coincidentes"
        },
        infoCallback: createInfoCallback("venta(s)"),
        columnDefs: [
          { orderable: false, targets: [1, 2, 7] }
        ]
      };
    } else if ($table.closest('.card').find('h5, h6').text().toLowerCase().includes('perfil')) {
      customConfig = {
        language: {
          ...dataTableConfig.language,
          infoEmpty: "Sin perfiles para mostrar",
          infoFiltered: "(filtrado de _MAX_ perfil(es) totales)",
          lengthMenu: "Mostrar _MENU_ perfil(es)",
          zeroRecords: "No se encontraron perfiles coincidentes"
        },
        infoCallback: createInfoCallback("perfil(es)"),
        columnDefs: [
          { orderable: false, targets: [2] }
        ]
      };
    }
    
    // Inicializar la tabla con configuración mejorada
    initializeEnhancedDataTable($table, customConfig);
  });
});

// Mejoras adicionales para dispositivos móviles
$(window).on('resize', function() {
  // Redibujar todas las tablas DataTables en resize
  $('.dataTable').each(function() {
    if ($.fn.DataTable.isDataTable(this)) {
      var dt = $(this).DataTable();
      dt.columns.adjust();
      if (dt.responsive && typeof dt.responsive.recalc === 'function') {
        dt.responsive.recalc();
      }
    }
  });
});

// Mejorar la experiencia de usuario en dispositivos táctiles
if ('ontouchstart' in window) {
  $(document).on('touchstart', '.paginate_button', function() {
    $(this).addClass('touch-active');
  });
  
  $(document).on('touchend touchcancel', '.paginate_button', function() {
    $(this).removeClass('touch-active');
  });
} 