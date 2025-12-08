/**
 * JavaScript consolidado para adaptación móvil del diseño PC
 * Mantiene la misma funcionalidad visual, solo ajusta tamaños
 */

document.addEventListener('DOMContentLoaded', function() {
  
  // ===== MEJORAS PARA LAYOUT MÓVIL =====
  
  function enhanceMobileLayout() {
    // Solo ajustar el content para móviles
    const content = document.querySelector('.content');
    if (content && window.innerWidth <= 768) {
      content.style.marginLeft = '0';
      content.style.padding = '2rem 1rem 2rem';
      content.style.paddingTop = '80px';
      content.style.borderRadius = '0';
      content.style.boxShadow = 'none';
    }
    
    // Ajustar contenedores para móviles
    const containers = document.querySelectorAll('.container-fluid, .container');
    containers.forEach(container => {
      if (window.innerWidth <= 768) {
        container.style.padding = '0';
      }
    });
  }
  
  // ===== MEJORAS PARA CARDS =====
  
  function enhanceCards() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
      // Mantener el diseño original de PC
      card.style.background = 'var(--card-bg)';
      card.style.borderRadius = '12px';
      card.style.border = '1px solid var(--border-color)';
      // Solo aplicar sombra por defecto si NO tiene clase shadow-*
      if (!card.classList.contains('shadow-lg') && 
          !card.classList.contains('shadow-sm') && 
          !card.classList.contains('shadow') && 
          !card.classList.contains('shadow-none')) {
        card.style.boxShadow = 'var(--card-shadow)';
      }
      card.style.transition = 'transform var(--transition-speed) ease, box-shadow var(--transition-speed) ease, background-color var(--transition-speed), border-color var(--transition-speed)';
      card.style.marginBottom = '1rem';
      
      // Mejorar animaciones
      card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        // Solo cambiar sombra si NO tiene shadow-lg
        if (!this.classList.contains('shadow-lg')) {
          this.style.boxShadow = '0 6px 12px -2px rgb(0 0 0 / 0.15)';
        } else {
          this.style.boxShadow = '0 1.25rem 3.5rem rgba(0, 0, 0, 0.2)';
        }
      });
      
      card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        // Restaurar sombra según la clase
        if (this.classList.contains('shadow-lg')) {
          this.style.boxShadow = '0 1rem 3rem rgba(0, 0, 0, 0.175)';
        } else if (!this.classList.contains('shadow-sm') && 
                   !this.classList.contains('shadow') && 
                   !this.classList.contains('shadow-none')) {
          this.style.boxShadow = 'var(--card-shadow)';
        }
      });
      
      // Mejorar headers de cards
      const cardHeader = card.querySelector('.card-header');
      if (cardHeader) {
        cardHeader.style.background = 'var(--card-bg)';
        cardHeader.style.borderBottom = '1px solid var(--border-color)';
        cardHeader.style.borderRadius = '12px 12px 0 0';
        cardHeader.style.padding = '1rem 1.5rem';
        cardHeader.style.fontWeight = '600';
        cardHeader.style.fontSize = '1rem';
      }
      
      // Mejorar bodies de cards
      const cardBody = card.querySelector('.card-body');
      if (cardBody) {
        cardBody.style.padding = '1.5rem';
      }
      
      // Mejorar footers de cards
      const cardFooter = card.querySelector('.card-footer');
      if (cardFooter) {
        cardFooter.style.background = 'var(--card-bg)';
        cardFooter.style.borderTop = '1px solid var(--border-color)';
        cardFooter.style.borderRadius = '0 0 12px 12px';
        cardFooter.style.padding = '1rem 1.5rem';
      }
    });
  }
  
  // ===== MEJORAS PARA BOTONES =====
  
  function enhanceButtons() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
      // Mantener el diseño original de PC
      button.style.padding = '0.6rem 1.2rem';
      button.style.borderRadius = '8px';
      button.style.fontWeight = '500';
      button.style.transition = 'all var(--transition-speed) ease';
      button.style.fontSize = '0.9rem';
      
      // Mejorar feedback táctil
      button.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.95)';
      });
      
      button.addEventListener('touchend', function() {
        this.style.transform = 'scale(1)';
      });
      
      button.addEventListener('touchcancel', function() {
        this.style.transform = 'scale(1)';
      });
      
      // Mejorar hover
      button.addEventListener('mouseenter', function() {
        if (this.classList.contains('btn-primary')) {
          this.style.transform = 'translateY(-1px)';
        }
      });
      
      button.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
      });
    });
  }
  
  // ===== MEJORAS PARA FORMULARIOS =====
  
  function enhanceForms() {
    const formControls = document.querySelectorAll('.form-control, .form-select');
    
    formControls.forEach(control => {
      // Evitar zoom en iOS
      if (control.type !== 'file') {
        control.style.fontSize = '16px';
      }
      
      // Mantener el diseño original de PC
      control.style.padding = '0.6rem 1rem';
      control.style.borderRadius = '8px';
      control.style.border = '1px solid var(--input-border)';
      control.style.background = 'var(--input-bg)';
      control.style.color = 'var(--text-color)';
      control.style.transition = 'all var(--transition-speed) ease';
      
      // Mejorar focus
      control.addEventListener('focus', function() {
        this.style.borderColor = 'var(--input-focus-border)';
        this.style.boxShadow = '0 0 0 0.2rem rgba(59, 130, 246, 0.25)';
        this.style.outline = 'none';
        this.style.background = 'var(--input-bg)';
      });
      
      control.addEventListener('blur', function() {
        this.style.borderColor = 'var(--input-border)';
        this.style.boxShadow = 'none';
        this.style.background = 'var(--input-bg)';
      });
    });
    
    // Mejorar labels
    const formLabels = document.querySelectorAll('.form-label');
    formLabels.forEach(label => {
      label.style.fontWeight = '600';
      label.style.marginBottom = '0.5rem';
      label.style.color = 'var(--text-color)';
      label.style.fontSize = '0.9rem';
    });
    
    // Mejorar input groups
    const inputGroups = document.querySelectorAll('.input-group');
    inputGroups.forEach(group => {
      group.style.borderRadius = '8px';
      group.style.overflow = 'hidden';
    });
    
    const inputGroupTexts = document.querySelectorAll('.input-group-text');
    inputGroupTexts.forEach(text => {
      text.style.background = 'var(--border-color)';
      text.style.border = '1px solid var(--input-border)';
      text.style.color = 'var(--text-color)';
      text.style.fontSize = '16px';
      text.style.padding = '0.6rem 1rem';
    });
  }
  
  // ===== MEJORAS PARA TABLAS =====
  
  function enhanceTables() {
    const tableResponsives = document.querySelectorAll('.table-responsive');
    
    tableResponsives.forEach(tableWrapper => {
      // Mantener el diseño original de PC
      tableWrapper.style.borderRadius = '12px';
      tableWrapper.style.overflow = 'hidden';
      tableWrapper.style.boxShadow = '0 2px 12px -6px rgba(30, 33, 37, 0.13)';
      tableWrapper.style.marginBottom = '1rem';
      tableWrapper.style.webkitOverflowScrolling = 'touch';
      
      // Mejorar scroll horizontal
      tableWrapper.style.overflowX = 'auto';
    });
    
    const tables = document.querySelectorAll('.table');
    tables.forEach(table => {
      // Mantener el diseño original de PC
      table.style.background = 'var(--table-bg)';
      table.style.color = 'var(--table-text)';
      table.style.borderRadius = '12px';
      table.style.overflow = 'hidden';
      table.style.boxShadow = '0 2px 12px -6px rgba(30, 33, 37, 0.13)';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '0.85rem';
      table.style.marginBottom = '0';
      table.style.transition = 'background-color var(--transition-speed), color var(--transition-speed)';
      table.style.minWidth = '600px';
    });
    
    const tableHeaders = document.querySelectorAll('.table th');
    tableHeaders.forEach(header => {
      header.style.background = 'var(--table-bg)';
      header.style.color = 'var(--table-text)';
      header.style.fontWeight = '600';
      header.style.fontSize = '0.9rem';
      header.style.borderBottom = '2px solid var(--table-border)';
      header.style.position = 'sticky';
      header.style.top = '0';
      header.style.zIndex = '5';
      header.style.padding = '0.5rem 0.75rem';
      header.style.border = '1px solid var(--table-border)';
      header.style.verticalAlign = 'middle';
      header.style.maxWidth = '150px';
      header.style.whiteSpace = 'nowrap';
      header.style.overflow = 'hidden';
      header.style.textOverflow = 'ellipsis';
      header.style.transition = 'border-color var(--transition-speed)';
    });
    
    const tableCells = document.querySelectorAll('.table td');
    tableCells.forEach(cell => {
      cell.style.padding = '0.5rem 0.75rem';
      cell.style.verticalAlign = 'middle';
      cell.style.border = '1px solid var(--table-border)';
      cell.style.maxWidth = '150px';
      cell.style.whiteSpace = 'nowrap';
      cell.style.overflow = 'hidden';
      cell.style.textOverflow = 'ellipsis';
      cell.style.transition = 'border-color var(--transition-speed)';
    });
    
    // Mejorar botones en tablas
    const tableButtons = document.querySelectorAll('.table .btn');
    tableButtons.forEach(button => {
      button.style.padding = '0.4rem 0.6rem';
      button.style.fontSize = '0.8rem';
      button.style.margin = '0.1rem';
    });
    
    // Mejorar grupos de botones en tablas
    const tableButtonGroups = document.querySelectorAll('.table .btn-group');
    tableButtonGroups.forEach(group => {
      group.style.display = 'flex';
      group.style.gap = '0.25rem';
    });
    
    const tableButtonGroupButtons = document.querySelectorAll('.table .btn-group .btn');
    tableButtonGroupButtons.forEach(button => {
      button.style.flex = '1';
    });
  }
  
  // ===== MEJORAS PARA MODALES =====
  
  function enhanceModals() {
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
      const modalDialog = modal.querySelector('.modal-dialog');
      const modalContent = modal.querySelector('.modal-content');
      const modalHeader = modal.querySelector('.modal-header');
      const modalBody = modal.querySelector('.modal-body');
      const modalFooter = modal.querySelector('.modal-footer');
      const modalTitle = modal.querySelector('.modal-title');
      
      if (modalDialog) {
        modalDialog.style.margin = '1rem';
        modalDialog.style.maxWidth = 'calc(100% - 2rem)';
      }
      
      if (modalContent) {
        modalContent.style.borderRadius = '12px';
        modalContent.style.border = 'none';
        modalContent.style.background = 'var(--card-bg)';
        modalContent.style.color = 'var(--text-color)';
        modalContent.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.2)';
      }
      
      if (modalHeader) {
        modalHeader.style.background = 'var(--card-bg)';
        modalHeader.style.borderBottom = '1px solid var(--border-color)';
        modalHeader.style.borderRadius = '12px 12px 0 0';
        modalHeader.style.padding = '1rem 1.5rem';
      }
      
      if (modalTitle) {
        modalTitle.style.fontSize = '1.1rem';
        modalTitle.style.fontWeight = '600';
        modalTitle.style.color = 'var(--text-color)';
      }
      
      if (modalBody) {
        modalBody.style.padding = '1.5rem';
        modalBody.style.maxHeight = 'calc(100vh - 200px)';
        modalBody.style.overflowY = 'auto';
      }
      
      if (modalFooter) {
        modalFooter.style.background = 'var(--card-bg)';
        modalFooter.style.borderTop = '1px solid var(--border-color)';
        modalFooter.style.borderRadius = '0 0 12px 12px';
        modalFooter.style.padding = '1rem 1.5rem';
      }
      
      // Mejorar botón de cerrar
      const closeButton = modal.querySelector('.btn-close');
      if (closeButton) {
        closeButton.style.background = 'rgba(0, 0, 0, 0.1)';
        closeButton.style.borderRadius = '50%';
        closeButton.style.width = '32px';
        closeButton.style.height = '32px';
        closeButton.style.display = 'flex';
        closeButton.style.alignItems = 'center';
        closeButton.style.justifyContent = 'center';
      }
    });
  }
  
  // ===== MEJORAS PARA ALERTAS =====
  
  function enhanceAlerts() {
    const alerts = document.querySelectorAll('.alert');
    
    alerts.forEach(alert => {
      // Mantener el diseño original de PC
      alert.style.border = 'none';
      alert.style.borderRadius = '8px';
      alert.style.padding = '0.75rem 1rem';
      alert.style.marginBottom = '1rem';
      alert.style.fontSize = '0.9rem';
      
      // Estilos específicos por tipo
      if (alert.classList.contains('alert-success')) {
        alert.style.background = '#d1e7dd';
        alert.style.color = '#0f5132';
        alert.style.borderLeft = '4px solid #198754';
      } else if (alert.classList.contains('alert-danger') || alert.classList.contains('alert-error')) {
        alert.style.background = '#f8d7da';
        alert.style.color = '#721c24';
        alert.style.borderLeft = '4px solid #dc3545';
      } else if (alert.classList.contains('alert-warning')) {
        alert.style.background = '#fff3cd';
        alert.style.color = '#856404';
        alert.style.borderLeft = '4px solid #ffc107';
      } else if (alert.classList.contains('alert-info')) {
        alert.style.background = '#d1ecf1';
        alert.style.color = '#0c5460';
        alert.style.borderLeft = '4px solid #0dcaf0';
      }
      
      // Mejorar botón de cerrar
      const closeButton = alert.querySelector('.btn-close');
      if (closeButton) {
        closeButton.style.padding = '0.5rem';
        closeButton.style.margin = '-0.5rem -0.5rem -0.5rem auto';
      }
    });
  }
  
  // ===== MEJORAS PARA PAGINACIÓN =====
  
  function enhancePagination() {
    const paginations = document.querySelectorAll('.pagination');
    
    paginations.forEach(pagination => {
      pagination.style.justifyContent = 'center';
      pagination.style.flexWrap = 'wrap';
      pagination.style.gap = '0.25rem';
      pagination.style.margin = '1rem 0';
    });
    
    const pageLinks = document.querySelectorAll('.page-link');
    pageLinks.forEach(link => {
      link.style.border = '1px solid var(--border-color)';
      link.style.borderRadius = '8px';
      link.style.background = 'var(--card-bg)';
      link.style.color = 'var(--text-color)';
      link.style.padding = '0.5rem 0.75rem';
      link.style.fontSize = '0.9rem';
      link.style.transition = 'all var(--transition-speed) ease';
    });
  }
  
  // ===== MEJORAS PARA DATA TABLES =====
  
  function enhanceDataTables() {
    if (typeof $.fn.DataTable !== 'undefined') {
      // Mejorar DataTables existentes
      $('.dataTable').each(function() {
        const table = $(this);
        const wrapper = table.closest('.dataTables_wrapper');
        
        if (wrapper.length) {
          wrapper.css({
            'font-size': '0.9rem'
          });
          
          // Mejorar controles
          wrapper.find('.dataTables_length, .dataTables_filter').css({
            'margin-bottom': '0.75rem',
            'text-align': 'center'
          });
          
          wrapper.find('.dataTables_length select, .dataTables_filter input').css({
            'font-size': '14px',
            'padding': '0.5rem 0.75rem',
            'border-radius': '6px',
            'border': '1px solid var(--input-border)',
            'background': 'var(--input-bg)',
            'color': 'var(--text-color)'
          });
          
          // Mejorar paginación
          wrapper.find('.dataTables_paginate').css({
            'text-align': 'center',
            'margin-top': '0.5rem'
          });
          
          wrapper.find('.paginate_button').css({
            'padding': '0.5rem 0.75rem',
            'margin': '0 0.1rem',
            'border-radius': '6px',
            'border': '1px solid var(--border-color)',
            'background': 'var(--card-bg)',
            'color': 'var(--text-color)',
            'font-size': '0.85rem'
          });
          
          wrapper.find('.paginate_button.current').css({
            'background': 'var(--primary-color)',
            'border-color': 'var(--primary-color)',
            'color': 'white'
          });
          
          wrapper.find('.paginate_button.disabled').css({
            'opacity': '0.5',
            'pointer-events': 'none'
          });
        }
      });
    }
  }
  
  // ===== MEJORAS PARA ACORDEONES =====
  
  function enhanceAccordions() {
    const accordionItems = document.querySelectorAll('.accordion-item');
    
    accordionItems.forEach(item => {
      item.style.marginBottom = '0.5rem';
      item.style.borderRadius = '8px';
      item.style.overflow = 'hidden';
      item.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    });
    
    const accordionButtons = document.querySelectorAll('.accordion-button');
    accordionButtons.forEach(button => {
      button.style.padding = '1rem';
      button.style.fontSize = '0.95rem';
      button.style.fontWeight = '600';
      button.style.background = 'var(--card-bg)';
      button.style.color = 'var(--text-color)';
      button.style.border = 'none';
      button.style.borderRadius = '8px 8px 0 0';
      button.style.transition = 'all 0.2s ease';
    });
    
    const accordionBodies = document.querySelectorAll('.accordion-body');
    accordionBodies.forEach(body => {
      body.style.padding = '1rem';
      body.style.background = 'var(--card-bg)';
      body.style.color = 'var(--text-color)';
      body.style.borderTop = '1px solid var(--border-color)';
    });
    
    // Mejorar tablas en acordeones
    const accordionTableResponsives = document.querySelectorAll('.accordion-body .table-responsive');
    accordionTableResponsives.forEach(tableWrapper => {
      tableWrapper.style.margin = '0';
      tableWrapper.style.borderRadius = '8px';
    });
    
    const accordionTableHeaders = document.querySelectorAll('.accordion-body .table th');
    accordionTableHeaders.forEach(header => {
      header.style.fontSize = '0.85rem';
      header.style.padding = '0.5rem 0.25rem';
    });
    
    const accordionTableCells = document.querySelectorAll('.accordion-body .table td');
    accordionTableCells.forEach(cell => {
      cell.style.fontSize = '0.85rem';
      cell.style.padding = '0.5rem 0.25rem';
    });
    
    const accordionTableButtons = document.querySelectorAll('.accordion-body .table .btn');
    accordionTableButtons.forEach(button => {
      button.style.padding = '0.25rem 0.4rem';
      button.style.fontSize = '0.75rem';
    });
  }
  
  // ===== MEJORAS PARA ACTION BARS =====
  
  function enhanceActionBars() {
    const actionBars = document.querySelectorAll('.action-bar');
    
    actionBars.forEach(actionBar => {
      actionBar.style.display = 'flex';
      actionBar.style.flexDirection = 'column';
      actionBar.style.gap = '1rem';
      actionBar.style.marginBottom = '1.5rem';
      actionBar.style.padding = '1rem';
      actionBar.style.background = 'var(--card-bg)';
      actionBar.style.borderRadius = '12px';
      actionBar.style.border = '1px solid var(--border-color)';
      actionBar.style.boxShadow = 'var(--card-shadow)';
      
      const actionBarDivs = actionBar.querySelectorAll('> div');
      actionBarDivs.forEach(div => {
        div.style.display = 'flex';
        div.style.justifyContent = 'center';
        div.style.alignItems = 'center';
        div.style.gap = '0.75rem';
        div.style.flexWrap = 'wrap';
      });
      
      const actionBarFormControls = actionBar.querySelectorAll('.form-control');
      actionBarFormControls.forEach(control => {
        control.style.maxWidth = '200px';
      });
    });
  }
  
  // ===== MEJORAS PARA DARK MODE =====
  
  function enhanceDarkMode() {
    function updateDarkMode() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      
      if (isDark) {
        // Aplicar estilos dark mode usando variables CSS
        document.documentElement.style.setProperty('--content-bg', 'var(--content-bg)');
        document.documentElement.style.setProperty('--card-bg', 'var(--card-bg)');
        document.documentElement.style.setProperty('--text-color', 'var(--text-color)');
      } else {
        // Aplicar estilos light mode usando variables CSS
        document.documentElement.style.setProperty('--content-bg', 'var(--content-bg)');
        document.documentElement.style.setProperty('--card-bg', 'var(--card-bg)');
        document.documentElement.style.setProperty('--text-color', 'var(--text-color)');
      }
    }
    
    // Observar cambios en el tema
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          updateDarkMode();
        }
      });
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    // Aplicar tema inicial
    updateDarkMode();
  }
  
  // ===== MEJORAS PARA ORIENTACIÓN =====
  
  function handleOrientationChange() {
    if (window.innerWidth <= 768) {
      const content = document.querySelector('.content');
      if (content) {
        if (window.orientation === 90 || window.orientation === -90) {
          // Landscape
          content.style.paddingTop = '60px';
          
          const actionBars = document.querySelectorAll('.action-bar');
          actionBars.forEach(actionBar => {
            actionBar.style.flexDirection = 'row';
            actionBar.style.gap = '0.75rem';
          });
        } else {
          // Portrait
          content.style.paddingTop = '80px';
          
          const actionBars = document.querySelectorAll('.action-bar');
          actionBars.forEach(actionBar => {
            actionBar.style.flexDirection = 'column';
            actionBar.style.gap = '1rem';
          });
        }
      }
    }
  }
  
  // Función para manejar el botón de menú móvil integrado
  function handleMobileMenuButton() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (mobileMenuToggle && sidebar && sidebarOverlay) {
      mobileMenuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('mobile-open');
        sidebarOverlay.classList.toggle('active');
        
        // Cambiar el ícono
        const icon = this.querySelector('i');
        if (sidebar.classList.contains('mobile-open')) {
          icon.className = 'bi bi-x-lg';
        } else {
          icon.className = 'bi bi-list';
        }
      });
      
      // Cerrar sidebar al hacer clic en el overlay
      sidebarOverlay.addEventListener('click', function() {
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('active');
        
        const icon = mobileMenuToggle.querySelector('i');
        icon.className = 'bi bi-list';
      });
    }
  }
  
  // ===== MEJORAS PARA SCROLL HORIZONTAL =====
  
  function enhanceHorizontalScroll() {
    const tableResponsives = document.querySelectorAll('.table-responsive');
    
    tableResponsives.forEach(tableWrapper => {
      let isScrolling = false;
      let startX = 0;
      let scrollLeft = 0;
      
      // Touch events para scroll horizontal
      tableWrapper.addEventListener('touchstart', function(e) {
        isScrolling = true;
        startX = e.touches[0].pageX - tableWrapper.offsetLeft;
        scrollLeft = tableWrapper.scrollLeft;
      });
      
      tableWrapper.addEventListener('touchmove', function(e) {
        if (!isScrolling) return;
        e.preventDefault();
        const x = e.touches[0].pageX - tableWrapper.offsetLeft;
        const walk = (x - startX) * 2;
        tableWrapper.scrollLeft = scrollLeft - walk;
      });
      
      tableWrapper.addEventListener('touchend', function() {
        isScrolling = false;
      });
      
      // Mouse events para scroll horizontal
      tableWrapper.addEventListener('mousedown', function(e) {
        isScrolling = true;
        startX = e.pageX - tableWrapper.offsetLeft;
        scrollLeft = tableWrapper.scrollLeft;
        tableWrapper.style.cursor = 'grabbing';
      });
      
      tableWrapper.addEventListener('mousemove', function(e) {
        if (!isScrolling) return;
        e.preventDefault();
        const x = e.pageX - tableWrapper.offsetLeft;
        const walk = (x - startX) * 2;
        tableWrapper.scrollLeft = scrollLeft - walk;
      });
      
      tableWrapper.addEventListener('mouseup', function() {
        isScrolling = false;
        tableWrapper.style.cursor = 'grab';
      });
      
      tableWrapper.addEventListener('mouseleave', function() {
        isScrolling = false;
        tableWrapper.style.cursor = 'grab';
      });
    });
  }
  
  // ===== INICIALIZAR MEJORAS =====
  
  function initMobileEnhancements() {
    enhanceMobileLayout();
    enhanceCards();
    enhanceButtons();
    enhanceForms();
    enhanceTables();
    enhanceModals();
    enhanceAlerts();
    enhancePagination();
    enhanceDataTables();
    enhanceAccordions();
    enhanceActionBars();
    enhanceDarkMode();
    enhanceHorizontalScroll();
    handleMobileMenuButton();
    
    // Event listeners
    window.addEventListener('resize', function() {
      setTimeout(() => {
        enhanceMobileLayout();
        handleOrientationChange();
      }, 100);
    });
    
    window.addEventListener('orientationchange', function() {
      setTimeout(handleOrientationChange, 100);
    });
    
    // Mejorar elementos dinámicos
    document.addEventListener('shown.bs.modal', function() {
      setTimeout(enhanceModals, 100);
    });
    
    // Mejorar DataTables dinámicos
    if (typeof $.fn.DataTable !== 'undefined') {
      $(document).on('init.dt', function() {
        setTimeout(() => {
          enhanceTables();
          enhanceActionBars();
          enhanceDataTables();
        }, 100);
      });
    }
    
    // Mejorar acordeones dinámicos
    document.addEventListener('shown.bs.collapse', function() {
      setTimeout(enhanceAccordions, 100);
    });
  }
  
  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileEnhancements);
  } else {
    initMobileEnhancements();
  }
  
  // Agregar estilos CSS dinámicos
  const style = document.createElement('style');
  style.textContent = `
    /* Mejorar transiciones */
    * {
      transition: all var(--transition-speed) ease;
    }
    
    /* Mejorar scroll */
    html, body {
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
    }
    
    /* Mejorar focus visible */
    .btn:focus-visible,
    .form-control:focus-visible,
    .form-select:focus-visible,
    .nav-link:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    
    /* Mejorar hover en móviles */
    @media (hover: none) and (pointer: coarse) {
      .card:hover {
        transform: none;
      }
      
      .btn:hover {
        transform: none;
      }
    }
    
    /* Mejorar scroll horizontal */
    .table-responsive {
      cursor: grab;
    }
    
    .table-responsive:active {
      cursor: grabbing;
    }
  `;
  document.head.appendChild(style);
}); 