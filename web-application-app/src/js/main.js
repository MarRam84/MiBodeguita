// script.js
document.addEventListener("DOMContentLoaded", () => {
  // Modal logic (keep this, but it might not be needed anymore)
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');

  function showModal(title, bodyHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.classList.remove('hidden');
  }

  modalClose.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });

  // Function to load content into content-area
  function loadContent(url) {
    fetch(url)
      .then(response => response.text())
      .then(data => {
        document.getElementById('content-area').innerHTML = data;
      })
      .catch(error => {
        console.error('Error loading content:', error);
        document.getElementById('content-area').innerHTML = '<p>Error al cargar la sección.</p>';
      });
  }

  // Menu lateral event listeners
  document.querySelector('aside.sidebar nav ul').addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      const section = e.target.dataset.section;

      // Remove active class from all links
      document.querySelectorAll('aside.sidebar nav ul li').forEach(li => li.classList.remove('active'));
      // Add active class to the clicked link's parent li
      e.target.parentNode.classList.add('active');

      let url;
      switch (section) {
        case 'entrada':
          url = 'entrada.html';
          break;
        case 'salida':
          url = 'salida.html';
          break;
        case 'reportes':
          url = 'reportes.html';
          break;
        case 'usuarios':
          url = 'usuarios.html';
          break;
        case 'configuracion':
          url = 'configuracion.html';
          break;
        default:
          url = 'inventario.html'; // Or your default inventory page
      }
      loadContent(url);
    }
  });

  // Load default content on page load (e.g., inventario)
  loadContent('inventario.html'); // Replace with your default page
});
