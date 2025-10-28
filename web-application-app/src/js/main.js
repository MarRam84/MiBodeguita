document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "http://localhost:3000/api";
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");
  const contentArea = document.getElementById("content-area");
  const themeToggle = document.getElementById("themeToggle");

  // --- THEME --- //
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });

  // --- MODAL --- //
  function showModal(title, bodyHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.classList.remove("hidden");
  }
  function hideModal() {
    modal.classList.add("hidden");
  }
  modalClose.addEventListener("click", hideModal);
  window.addEventListener("click", (e) => {
    if (e.target === modal) hideModal();
  });

  // --- DYNAMIC CONTENT LOADING --- //
  function loadContent(url, section) {
    fetch(url)
      .then((response) => response.text())
      .then((data) => {
        contentArea.innerHTML = data;
        document.getElementById("header-title").textContent = section.charAt(0).toUpperCase() + section.slice(1);

        switch (section) {
          case "inventario":
            activarInventario();
            break;
          case "usuarios":
            activarUsuarios();
            break;
          case "entrada":
            activarEntrada();
            break;
          case "salida":
            activarSalida();
            break;
        }
      })
      .catch((error) => {
        console.error("Error al cargar la sección:", error);
        contentArea.innerHTML = "<p>Error al cargar la sección.</p>";
      });
  }

  // --- ENTRADA LOGIC --- //
  function activarEntrada() {
    const formEntrada = document.getElementById("formEntrada");
    const selectProducto = document.getElementById("nombreProductoEntrada");

    // Populate product dropdown
    fetch(`${API_BASE_URL}/productos`)
      .then(response => response.json())
      .then(productos => {
        productos.forEach(producto => {
          const option = document.createElement("option");
          option.value = producto.ProductoID;
          option.textContent = producto.nombre;
          selectProducto.appendChild(option);
        });
      })
      .catch(error => {
        console.error("Error al cargar productos:", error);
        alert("Error al cargar la lista de productos.");
      });

    // Handle form submission
    formEntrada.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const data = Object.fromEntries(formData.entries());

      fetch(`${API_BASE_URL}/entradas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      .then(response => response.json().then(body => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) {
          throw new Error(body.error || "Error en la respuesta del servidor");
        }
        alert(body.message);
        event.target.reset();
      })
      .catch(error => {
        console.error("Error:", error);
        alert(`Hubo un error al guardar la entrada: ${error.message}`);
      });
    });
  }

  // --- SALIDA LOGIC --- //
  function activarSalida() {
    const formSalida = document.getElementById("formSalida");
    const selectProducto = document.getElementById("nombreProductoSalida");

    // Populate product dropdown
    fetch(`${API_BASE_URL}/productos`)
      .then(response => response.json())
      .then(productos => {
        productos.forEach(producto => {
          const option = document.createElement("option");
          option.value = producto.ProductoID;
          option.textContent = producto.nombre;
          selectProducto.appendChild(option);
        });
      })
      .catch(error => {
        console.error("Error al cargar productos:", error);
        alert("Error al cargar la lista de productos.");
      });

    // Handle form submission
    formSalida.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const data = Object.fromEntries(formData.entries());

      fetch(`${API_BASE_URL}/salidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      .then(response => response.json().then(body => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) {
          throw new Error(body.error || "Error en la respuesta del servidor");
        }
        alert(body.message);
        event.target.reset();
      })
      .catch(error => {
        console.error("Error:", error);
        alert(`Hubo un error al registrar la salida: ${error.message}`);
      });
    });
  }

  // --- USER LOGIC --- //
  function activarUsuarios() {
    const formUsuarios = document.getElementById("formUsuarios");
    const tablaUsuarios = document.getElementById("tablaUsuarios");

    async function cargarUsuarios() {
        try {
            const response = await fetch(`${API_BASE_URL}/usuarios`);
            if (!response.ok) throw new Error("Error al cargar usuarios");
            const usuarios = await response.json();
            renderizarUsuarios(usuarios);
        } catch (error) {
            console.error(error);
            tablaUsuarios.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
        }
    }

    function renderizarUsuarios(usuarios) {
        tablaUsuarios.innerHTML = "";
        if (usuarios.length === 0) {
            tablaUsuarios.innerHTML = '<tr><td colspan="5">No hay usuarios registrados.</td></tr>';
            return;
        }
        usuarios.forEach(usuario => {
            const fila = document.createElement("tr");
            fila.dataset.id = usuario.UsuarioID;
            fila.innerHTML = `
                <td>${usuario.UsuarioID}</td>
                <td>${usuario.nombre}</td>
                <td>${usuario.email}</td>
                <td>${usuario.rol}</td>
                <td>
                    <button class="btn-editar" disabled><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn-eliminar" disabled><i class="fas fa-trash-alt"></i> Eliminar</button>
                </td>
            `;
            tablaUsuarios.appendChild(fila);
        });
    }

    formUsuarios.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(formUsuarios);
        const nuevoUsuario = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`${API_BASE_URL}/usuarios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nuevoUsuario),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Error al crear usuario");
            alert(result.message);
            formUsuarios.reset();
            cargarUsuarios();
        } catch (error) {
            alert(error.message);
        }
    });

    cargarUsuarios();
  }

  // --- INVENTORY LOGIC --- //
  function activarInventario() {
    const tablaProductos = document.getElementById("tablaProductos");

    // --- Helper Functions ---
    function formatearFecha(fechaString) {
      if (!fechaString) return "N/A";
      const fecha = new Date(fechaString);
      fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset());
      return fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    function formatearFechaParaInput(fechaString) {
        if (!fechaString) return '';
        const fecha = new Date(fechaString);
        fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset());
        return fecha.toISOString().split('T')[0];
    }

    function actualizarDashboard(productos) {
      const STOCK_CRITICO_UMBRAL = 10;
      const DIAS_PARA_VENCER_UMBRAL = 30;
      const hoy = new Date();

      const stockCritico = productos.filter((p) => p.cantidad < STOCK_CRITICO_UMBRAL).length;
      const proximosAVencer = productos.filter((p) => {
        if (!p.vencimiento) return false;
        const fechaVencimiento = new Date(p.vencimiento);
        const diffTiempo = fechaVencimiento.getTime() - hoy.getTime();
        const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));
        return diffDias > 0 && diffDias <= DIAS_PARA_VENCER_UMBRAL;
      }).length;

      document.getElementById("totalProductos").textContent = productos.length;
      document.getElementById("stockCritico").textContent = stockCritico;
      document.getElementById("ultimosMovimientos").textContent = "N/A"; // Placeholder
      document.getElementById("proximosAVencer").textContent = proximosAVencer;
    }

    function renderizarProductos(productos) {
      tablaProductos.innerHTML = "";
      if (productos.length === 0) {
        tablaProductos.innerHTML = '<tr><td colspan="7">No hay productos en el inventario.</td></tr>';
        return;
      }
      productos.forEach((producto) => {
        const fila = document.createElement("tr");
        fila.dataset.id = producto.ProductoID;
        fila.innerHTML = `
          <td>${producto.nombre}</td>
          <td>${producto.categoria}</td>
          <td>${producto.cantidad}</td>
          <td>${producto.ubicacion || "N/A"}</td>
          <td>${formatearFecha(producto.ingreso)}</td>
          <td>${formatearFecha(producto.vencimiento)}</td>
          <td>
            <button class="btn-editar" aria-label="Editar ${producto.nombre}"><i class="fas fa-edit"></i> Editar</button>
            <button class="btn-eliminar" aria-label="Eliminar ${producto.nombre}"><i class="fas fa-trash-alt"></i> Eliminar</button>
          </td>
        `;
        tablaProductos.appendChild(fila);
      });
    }

    // --- Main Data Loading ---
    async function cargarProductos() {
      try {
        const response = await fetch(`${API_BASE_URL}/productos`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const productos = await response.json();
        renderizarProductos(productos);
        actualizarDashboard(productos);
      } catch (error) {
        console.error("Error al cargar los productos:", error);
        tablaProductos.innerHTML = '<tr><td colspan="7">Error al cargar los productos.</td></tr>';
      }
    }

    // --- Event Handlers ---
    async function handleAgregarProducto(event) {
      event.preventDefault();
      const form = event.target;
      const formData = new FormData(form);
      const nuevoProducto = Object.fromEntries(formData.entries());

      try {
        const response = await fetch(`${API_BASE_URL}/productos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nuevoProducto),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Error en el servidor");
        alert(result.message);
        hideModal();
        cargarProductos();
      } catch (error) {
        console.error("Error al agregar el producto:", error);
        alert(`Error al agregar el producto: ${error.message}`);
      }
    }

    async function handleUpdateProducto(event, productoId) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const updatedProducto = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`${API_BASE_URL}/productos/${productoId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedProducto),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Error en el servidor");
            alert(result.message);
            hideModal();
            cargarProductos();
        } catch (error) {
            console.error("Error al actualizar el producto:", error);
            alert(`Error al actualizar el producto: ${error.message}`);
        }
    }

    async function handleEditarProducto(productoId) {
        try {
            const [productResponse, formResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/productos/${productoId}`),
                fetch("agregar-producto.html"),
            ]);

            if (!productResponse.ok) throw new Error("Error al cargar los datos del producto.");
            if (!formResponse.ok) throw new Error("Error al cargar el formulario.");

            const producto = await productResponse.json();
            const formHtml = await formResponse.text();

            showModal("Editar Producto", formHtml);

            // Populate the form
            const form = modalBody.querySelector("form");
            form.querySelector("#nombre").value = producto.nombre;
            form.querySelector("#categoria").value = producto.categoria;
            form.querySelector("#cantidad").value = producto.cantidad;
            form.querySelector("#ubicacion").value = producto.ubicacion;
            form.querySelector("#ingreso").value = formatearFechaParaInput(producto.ingreso);
            form.querySelector("#vencimiento").value = formatearFechaParaInput(producto.vencimiento);
            form.querySelector("button[type='submit']").textContent = "Actualizar Producto";

            form.addEventListener("submit", (e) => handleUpdateProducto(e, productoId));

        } catch (error) {
            console.error("Error en handleEditarProducto:", error);
            alert(error.message);
        }
    }

    async function handleEliminarProducto(productoId) {
        if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return;

        try {
            const response = await fetch(`${API_BASE_URL}/productos/${productoId}`, {
                method: "DELETE",
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Error en el servidor");
            alert(result.message);
            cargarProductos();
        } catch (error) {
            console.error("Error al eliminar el producto:", error);
            alert(`Error al eliminar el producto: ${error.message}`);
        }
    }

    document.getElementById("btnAgregar").addEventListener("click", async () => {
      try {
        const response = await fetch("agregar-producto.html");
        const formHtml = await response.text();
        showModal("Agregar Producto", formHtml);
        modalBody.querySelector("form").addEventListener("submit", handleAgregarProducto);
      } catch (error) {
        console.error("Error al cargar el formulario:", error);
        alert("Error al cargar el formulario de agregar producto.");
      }
    });

    tablaProductos.addEventListener("click", function (event) {
      const target = event.target.closest("button");
      if (!target) return;

      const productoId = target.closest("tr").dataset.id;

      if (target.classList.contains("btn-editar")) {
        handleEditarProducto(productoId);
      }

      if (target.classList.contains("btn-eliminar")) {
        handleEliminarProducto(productoId);
      }
    });

    // --- Search Logic ---
    const searchInput = document.querySelector(".search-bar");
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filas = tablaProductos.querySelectorAll("tr");
      filas.forEach((fila) => {
        const nombreProducto = fila.querySelector("td").textContent.toLowerCase();
        if (nombreProducto.includes(searchTerm)) {
          fila.style.display = "";
        } else {
          fila.style.display = "none";
        }
      });
    });

    // --- Initial Load ---
    cargarProductos();
  }

  // --- NAVIGATION --- //
  document.querySelector("aside.sidebar nav ul").addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (link) {
      e.preventDefault();
      const section = link.dataset.section;

      document.querySelectorAll("aside.sidebar nav ul li").forEach((li) => li.classList.remove("active"));
      link.parentElement.classList.add("active");

      const urls = {
        inventario: "inventario.html",
        entrada: "entrada.html",
        salida: "salida.html",
        reportes: "reportes.html",
        usuarios: "usuarios.html",
        configuracion: "configuracion.html",
      };
      const url = urls[section] || "inventario.html";
      loadContent(url, section);
    }
  });

  // --- INITIAL LOAD --- //
  loadContent("inventario.html", "inventario");
});