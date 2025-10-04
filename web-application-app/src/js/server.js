function activarInventario() {
  const btnAgregar = document.getElementById('btnAgregar');
  if (!btnAgregar) return;

  btnAgregar.addEventListener('click', () => {
    fetch('agregar-producto.html')
      .then(response => response.text())
      .then(data => {
        showModal('Agregar Producto', data);

        // Esperar a que el formulario se cargue en el DOM
        setTimeout(() => {
          const form = document.getElementById('formAgregarProducto');
          if (!form) {
            console.error('Formulario no encontrado');
            return;
          }

          form.addEventListener('submit', (e) => {
            e.preventDefault();

            const nuevoProducto = {
              nombre: document.getElementById('nombre').value,
              categoria: document.getElementById('categoria').value,
              cantidad: parseInt(document.getElementById('cantidad').value),
              unidad: document.getElementById('unidad').value,
              lote: document.getElementById('lote').value,
              ubicacion: document.getElementById('ubicacion').value,
              ingreso: document.getElementById('ingreso').value,
              vencimiento: document.getElementById('vencimiento').value,
              activo: true // o 1 si tu backend espera un BIT
            };

            // Validación básica
            if (!nuevoProducto.nombre || isNaN(nuevoProducto.cantidad)) {
              alert('Por favor completa los campos correctamente.');
              return;
            }

            fetch('http://localhost:3000/api/productos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(nuevoProducto)
            })
              .then(res => res.json())
              .then(res => {
                alert(res.message || 'Producto agregado correctamente');
                document.getElementById('modal').classList.add('hidden');
                loadContent('inventario.html', 'inventario'); // Recargar inventario
              })
              .catch(err => {
                console.error('Error al agregar producto:', err);
                alert('Error al agregar el producto');
              });
          });
        }, 100);
      })
      .catch(error => {
        console.error('Error al cargar el formulario:', error);
        showModal('Error', '<p>No se pudo cargar el formulario.</p>');
      });
  });
}