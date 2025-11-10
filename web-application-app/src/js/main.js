document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "http://localhost:3000/api";

  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");
  const modalContent = document.querySelector(".modal-content");
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
    modalContent.classList.add("start-animation");
  }
  function hideModal() {
    modalContent.classList.remove("start-animation");
    modal.classList.add("hidden");
  }
  modalClose.addEventListener("click", hideModal);
  window.addEventListener("click", (e) => {
    if (e.target === modal) hideModal();
  });

  // --- GLOBAL HELPERS --- //
  function formatearFecha(fechaString, includeTime = false) {
    if (!fechaString) return "N/A";
    const fecha = new Date(fechaString);
    const userTimezoneOffset = fecha.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(fecha.getTime() + userTimezoneOffset);

    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };

    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }

    return adjustedDate.toLocaleString("es-ES", options);
  }

  async function actualizarDashboard() {
    try {
      const [productosRes, movimientosRes] = await Promise.all([
        fetch(`${API_BASE_URL}/productos`),
        fetch(`${API_BASE_URL}/movimientos`),
      ]);

      if (!productosRes.ok || !movimientosRes.ok) {
        throw new Error("Error al cargar datos del dashboard");
      }

      const productos = await productosRes.json();
      const movimientos = await movimientosRes.json();

      // Update dashboard cards
      const STOCK_CRITICO_UMBRAL = 10;
      const DIAS_PARA_VENCER_UMBRAL = 30;
      const hoy = new Date();

      const stockCritico = productos.filter(
        (p) => p.cantidad < STOCK_CRITICO_UMBRAL
      ).length;
      const proximosAVencer = productos.filter((p) => {
        if (!p.vencimiento) return false;
        const fechaVencimiento = new Date(p.vencimiento);
        const diffTiempo = fechaVencimiento.getTime() - hoy.getTime();
        const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));
        return diffDias > 0 && diffDias <= DIAS_PARA_VENCER_UMBRAL;
      }).length;

      document.getElementById("totalProductos").textContent = productos.length;
      document.getElementById("stockCritico").textContent = stockCritico;
      document.getElementById("proximosAVencer").textContent = proximosAVencer;

      // Update movimientos
      const contenedor = document.getElementById("ultimosMovimientos");
      if (!movimientos || movimientos.length === 0) {
        contenedor.innerHTML = "<p>No hay movimientos recientes.</p>";
        return;
      }

      const lista = document.createElement("ul");
      lista.className = "movimientos-lista";

      movimientos.forEach((mov) => {
        const item = document.createElement("li");
        const tipoClase = mov.Tipo === "Entrada" ? "entrada" : "salida";
        item.innerHTML = `
              <span class="movimiento-tipo ${tipoClase}">${mov.Tipo}</span>
              <span class="movimiento-cantidad">${mov.Cantidad} x</span>
              <span class="movimiento-nombre">${mov.ProductoNombre}</span>
              <span class="movimiento-fecha">${formatearFecha(
                mov.Fecha,
                true
              )}</span>
          `;
        lista.appendChild(item);
      });
      contenedor.innerHTML = "";
      contenedor.appendChild(lista);
    } catch (error) {
      console.error("Error actualizando dashboard:", error);
    }
  }

  // --- DYNAMIC CONTENT LOADING --- //
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function loadContent(url, section) {
    fetch(url)
      .then((response) => response.text())
      .then((data) => {
        contentArea.innerHTML = data;
        document.getElementById("header-title").textContent =
          section.charAt(0).toUpperCase() + section.slice(1);

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
          case "reportes":
            loadScript("https://cdn.jsdelivr.net/npm/chart.js")
              .then(() => {
                activarReportes();
              })
              .catch((error) => {
                console.error("Error loading Chart.js", error);
                contentArea.innerHTML =
                  "<p>Error al cargar la librería de gráficos.</p>";
              });
            break;
        }
      })
      .catch((error) => {
        console.error("Error al cargar la sección:", error);
        contentArea.innerHTML = "<p>Error al cargar la sección.</p>";
      });
  }

  // --- REPORTES LOGIC --- //
  function activarReportes() {
    const formReportes = document.getElementById("formReportes");
    const reporteContainer = document.getElementById("reporteContainer");
    const reporteHeader = document.getElementById("reporteHeader");
    const reporteTitulo = document.getElementById("reporteTitulo");
    const btnImprimir = document.getElementById("btnImprimir");
    const reporteContenido = document.getElementById("reporteContenido");
    const fechaInicioInput = document.getElementById("fechaInicioReporte");
    const fechaFinInput = document.getElementById("fechaFinReporte");
    const tipoReporteSelect = document.getElementById("tipoReporte");

    // Show/hide date fields based on report type
    tipoReporteSelect.addEventListener("change", () => {
      const selected = tipoReporteSelect.value;
      if (selected === "entradas" || selected === "salidas") {
        fechaInicioInput.parentElement.style.display = "block";
        fechaFinInput.parentElement.style.display = "block";
      } else {
        fechaInicioInput.parentElement.style.display = "none";
        fechaFinInput.parentElement.style.display = "none";
      }
    });
    // Trigger change on load
    tipoReporteSelect.dispatchEvent(new Event("change"));

    btnImprimir.addEventListener("click", () => {
      window.print();
    });

    formReportes.addEventListener("submit", async function (event) {
      event.preventDefault();
      const tipoReporte = tipoReporteSelect.value;
      const fechaInicio = fechaInicioInput.value;
      const fechaFin = fechaFinInput.value;

      reporteContenido.innerHTML = "<p>Generando reporte...</p>";
      reporteHeader.style.display = "none";

      try {
        let url = `${API_BASE_URL}/`;
        let data;

        switch (tipoReporte) {
          case "inventario":
            url += `productos`; // No es necesario el API_BASE_URL aquí
            const response = await fetch(`${API_BASE_URL}${url}`);
            if (!response.ok) throw new Error("Error al cargar el inventario.");
            data = await response.json();
            renderizarReporteInventario(data);
            break;
          case "entradas":
          case "salidas":
            url = `${API_BASE_URL}/movimientos?tipo=${tipoReporte.slice(
              0,
              -1
            )}&inicio=${fechaInicio}&fin=${fechaFin}`;
            const movResponse = await fetch(url);
            if (!movResponse.ok)
              throw new Error(`Error al cargar ${tipoReporte}.`);
            data = await movResponse.json();
            renderizarReporteMovimientos(data, tipoReporte);
            break;
          case "vencimientos":
            url = `${API_BASE_URL}/productos/vencimiento`;
            const vencResponse = await fetch(url);
            if (!vencResponse.ok)
              throw new Error("Error al cargar productos por vencer.");
            data = await vencResponse.json();
            renderizarReporteVencimientos(data);
            break;
        }
      } catch (error) {
        reporteContenido.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        console.error("Error al generar reporte:", error);
      }
    });

    function generarGrafico(data, tipoReporte) {
      const ctx = document.getElementById("reporteGrafico").getContext("2d");
      let chartData = {};

      // Destroy previous chart instance if it exists
      if (window.myChart instanceof Chart) {
        window.myChart.destroy();
      }

      switch (tipoReporte) {
        case "inventario":
          chartData = {
            labels: data.map((p) => p.nombre),
            datasets: [
              {
                label: "Cantidad en Inventario",
                data: data.map((p) => p.cantidad),
                backgroundColor: "rgba(54, 162, 235, 0.6)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 1,
              },
            ],
          };
          break;
        case "entradas":
        case "salidas":
          const dataAgrupada = data.reduce((acc, m) => {
            const fecha = formatearFecha(m.Fecha);
            acc[fecha] = (acc[fecha] || 0) + m.Cantidad;
            return acc;
          }, {});

          chartData = {
            labels: Object.keys(dataAgrupada),
            datasets: [
              {
                label: `Cantidad de ${tipoReporte}`,
                data: Object.values(dataAgrupada),
                backgroundColor:
                  tipoReporte === "entradas"
                    ? "rgba(75, 192, 192, 0.6)"
                    : "rgba(255, 99, 132, 0.6)",
                borderColor:
                  tipoReporte === "entradas"
                    ? "rgba(75, 192, 192, 1)"
                    : "rgba(255, 99, 132, 1)",
                borderWidth: 1,
              },
            ],
          };
          break;
        case "vencimientos":
          chartData = {
            labels: data.map((p) => p.nombre),
            datasets: [
              {
                label: "Días para Vencer",
                data: data.map((p) => {
                  const hoy = new Date();
                  const fechaVencimiento = new Date(p.vencimiento);
                  const diffTiempo = fechaVencimiento.getTime() - hoy.getTime();
                  return Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));
                }),
                backgroundColor: "rgba(255, 159, 64, 0.6)",
                borderColor: "rgba(255, 159, 64, 1)",
                borderWidth: 1,
              },
            ],
          };
          break;
      }

      window.myChart = new Chart(ctx, {
        type: "bar",
        data: chartData,
        options: {
          scales: {
            y: {
              beginAtZero: true,
            },
          },
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }

    function renderizarReporteInventario(productos) {
      reporteHeader.style.display = "flex";
      reporteTitulo.textContent = "Reporte de Inventario Actual";
      reporteContenido.innerHTML =
        '<div class="chart-container"><canvas id="reporteGrafico"></canvas></div><div id="tablaReporteContenedor"></div>';

      if (productos.length === 0) {
        reporteContenido.innerHTML =
          "<p>No hay productos en el inventario.</p>";
        return;
      }
      generarGrafico(productos, "inventario");
      const tabla = `
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th>Cantidad</th>
                        <th>Ubicación</th>
                        <th>Fecha Ingreso</th>
                    </tr>
                </thead>
                <tbody>
                    ${productos
                      .map(
                        (p) => `
                        <tr>
                            <td>${p.nombre}</td>
                            <td>${p.categoria}</td>
                            <td>${p.cantidad}</td>
                            <td>${p.ubicacion || "N/A"}</td>
                            <td>${formatearFecha(p.ingreso)}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>`;
      document.getElementById("tablaReporteContenedor").innerHTML = tabla;
    }

    function renderizarReporteMovimientos(movimientos, tipo) {
      const titulo = `Reporte de ${
        tipo.charAt(0).toUpperCase() + tipo.slice(1)
      }`;
      reporteHeader.style.display = "flex";
      reporteTitulo.textContent = titulo;
      reporteContenido.innerHTML =
        '<div class="chart-container"><canvas id="reporteGrafico"></canvas></div><div id="tablaReporteContenedor"></div>';

      if (movimientos.length === 0) {
        reporteContenido.innerHTML = `<p>No hay ${tipo} en el rango de fechas seleccionado.</p>`;
        return;
      }
      generarGrafico(movimientos, tipo);
      const tabla = `
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Fecha</th>
                        <th>Usuario</th>
                    </tr>
                </thead>
                <tbody>
                    ${movimientos
                      .map(
                        (m) => `
                        <tr>
                            <td>${m.ProductoNombre}</td>
                            <td>${m.Cantidad}</td>
                            <td>${formatearFecha(m.Fecha, true)}</td>
                            <td>${m.UsuarioNombre || "N/A"}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>`;
      document.getElementById("tablaReporteContenedor").innerHTML = tabla;
    }

    function renderizarReporteVencimientos(productos) {
      reporteHeader.style.display = "flex";
      reporteTitulo.textContent = "Reporte de Productos Próximos a Vencer";
      reporteContenido.innerHTML =
        '<div class="chart-container"><canvas id="reporteGrafico"></canvas></div><div id="tablaReporteContenedor"></div>';

      if (productos.length === 0) {
        reporteContenido.innerHTML =
          "<p>No hay productos próximos a vencer.</p>";
        return;
      }
      generarGrafico(productos, "vencimientos");
      const tabla = `
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th>Cantidad</th>
                        <th>Fecha de Vencimiento</th>
                    </tr>
                </thead>
                <tbody>
                    ${productos
                      .map(
                        (p) => `
                        <tr>
                            <td>${p.nombre}</td>
                            <td>${p.categoria}</td>
                            <td>${p.cantidad}</td>
                            <td>${formatearFecha(p.vencimiento)}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>`;
      document.getElementById("tablaReporteContenedor").innerHTML = tabla;
    }
  }

  // --- ENTRADA LOGIC --- //
  function activarEntrada() {
    const formEntrada = document.getElementById("formEntrada");
    const selectProducto = document.getElementById("nombreProductoEntrada");

    fetch(`${API_BASE_URL}/productos`)
      .then((response) => response.json())
      .then((productos) => {
        productos.forEach((producto) => {
          const option = document.createElement("option");
          option.value = producto.ProductoID;
          option.textContent = producto.nombre;
          selectProducto.appendChild(option);
        });
      })
      .catch((error) => {
        console.error("Error al cargar productos:", error);
        alert("Error al cargar la lista de productos.");
      });

    formEntrada.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const data = Object.fromEntries(formData.entries());

      fetch(`${API_BASE_URL}/entradas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then((response) =>
          response.json().then((body) => ({ ok: response.ok, body }))
        )
        .then(({ ok, body }) => {
          if (!ok) {
            throw new Error(body.error || "Error en la respuesta del servidor");
          }
          alert(body.message);
          event.target.reset();
          actualizarDashboard();
        })
        .catch((error) => {
          console.error("Error:", error);
          alert(`Hubo un error al guardar la entrada: ${error.message}`);
        });
    });
  }

  // --- SALIDA LOGIC --- //
  function activarSalida() {
    const formSalida = document.getElementById("formSalida");
    const selectProducto = document.getElementById("nombreProductoSalida");

    fetch(`${API_BASE_URL}/productos`)
      .then((response) => response.json())
      .then((productos) => {
        productos.forEach((producto) => {
          const option = document.createElement("option");
          option.value = producto.ProductoID;
          option.textContent = producto.nombre;
          selectProducto.appendChild(option);
        });
      })
      .catch((error) => {
        console.error("Error al cargar productos:", error);
        alert("Error al cargar la lista de productos.");
      });

    formSalida.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const data = Object.fromEntries(formData.entries());

      fetch(`${API_BASE_URL}/salidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then((response) =>
          response.json().then((body) => ({ ok: response.ok, body }))
        )
        .then(({ ok, body }) => {
          if (!ok) {
            throw new Error(body.error || "Error en la respuesta del servidor");
          }
          alert(body.message);
          event.target.reset();
          actualizarDashboard();
        })
        .catch((error) => {
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
        tablaUsuarios.innerHTML =
          '<tr><td colspan="5">No hay usuarios registrados.</td></tr>';
        return;
      }
      usuarios.forEach((usuario) => {
        const fila = document.createElement("tr");
        fila.dataset.id = usuario.UsuarioID;
        fila.innerHTML = `
                <td>${usuario.UsuarioID}</td>
                <td>${usuario.nombre}</td>
                <td>${usuario.email}</td>
                <td>${usuario.Rol}</td>
                <td>
                    <button class="btn-editar"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn-eliminar"><i class="fas fa-trash-alt"></i> Eliminar</button>
                </td>
            `;
        tablaUsuarios.appendChild(fila);
      });
    }

    async function handleUpdateUsuario(event, usuarioId) {
      event.preventDefault();
      const form = event.target;
      const updatedUsuario = {
        nombre: form.nombre.value,
        email: form.email.value,
        Rol: form.rol.value,
      };

      if (form.password.value) {
        updatedUsuario.password = form.password.value;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/usuarios/${usuarioId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedUsuario),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Error en el servidor");
        alert(result.message);
        hideModal();
        cargarUsuarios();
      } catch (error) {
        console.error("Error al actualizar el usuario:", error);
        alert(`Error al actualizar el usuario: ${error.message}`);
      }
    }

    async function handleEditarUsuario(usuarioId) {
      try {
        const [userResponse, formHtmlResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/usuarios/${usuarioId}`),
          fetch("usuarios.html"), // No necesita autenticación
        ]);

        if (!userResponse.ok)
          throw new Error("Error al cargar los datos del usuario.");
        if (!formHtmlResponse.ok)
          throw new Error("Error al cargar el formulario.");

        const usuario = await userResponse.json();
        const formHtmlText = await formHtmlResponse.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(formHtmlText, "text/html");
        const formNode = doc.querySelector("#formUsuarios");

        if (!formNode)
          throw new Error(
            "No se pudo encontrar el formulario en usuarios.html"
          );

        showModal("Editar Usuario", formNode.outerHTML);

        const form = modalBody.querySelector("form");
        form.querySelector("#nombre").value = usuario.nombre;
        form.querySelector("#email").value = usuario.email;
        form.querySelector("#rol").value = usuario.Rol;

        const passwordInput = form.querySelector("#password");
        passwordInput.placeholder = "Dejar en blanco para no cambiar";
        passwordInput.required = false;

        form.querySelector("button[type='submit']").textContent =
          "Actualizar Usuario";

        form.addEventListener("submit", (e) =>
          handleUpdateUsuario(e, usuarioId)
        );
      } catch (error) {
        console.error("Error en handleEditarUsuario:", error);
        alert(error.message);
      }
    }

    async function handleEliminarUsuario(usuarioId) {
      if (!confirm("¿Estás seguro de que quieres eliminar este usuario?"))
        return;

      try {
        const response = await fetch(`${API_BASE_URL}/usuarios/${usuarioId}`, {
          method: "DELETE",
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Error en el servidor");
        alert(result.message);
        cargarUsuarios();
      } catch (error) {
        console.error("Error al eliminar el usuario:", error);
        alert(`Error al eliminar el usuario: ${error.message}`);
      }
    }

    tablaUsuarios.addEventListener("click", function (event) {
      const target = event.target.closest("button");
      if (!target) return;

      const usuarioId = target.closest("tr").dataset.id;

      if (target.classList.contains("btn-editar")) {
        handleEditarUsuario(usuarioId);
      }

      if (target.classList.contains("btn-eliminar")) {
        handleEliminarUsuario(usuarioId);
      }
    });

    formUsuarios.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const nuevoUsuario = {
        nombre: form.nombre.value,
        email: form.email.value,
        password: form.password.value,
        Rol: form.rol.value,
      };

      try {
        const response = await fetch(`${API_BASE_URL}/usuarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nuevoUsuario),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Error al crear usuario");
        alert(result.message);
        form.reset();
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

    function formatearFechaParaInput(fechaString) {
      if (!fechaString) return "";
      const fecha = new Date(fechaString);
      fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset());
      return fecha.toISOString().split("T")[0];
    }

    function renderizarProductos(productos) {
      tablaProductos.innerHTML = "";
      if (productos.length === 0) {
        tablaProductos.innerHTML =
          '<tr><td colspan="7">No hay productos en el inventario.</td></tr>';
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
            <button class="btn-editar" aria-label="Editar ${
              producto.nombre
            }"><i class="fas fa-edit"></i> Editar</button>
            <button class="btn-eliminar" aria-label="Eliminar ${
              producto.nombre
            }"><i class="fas fa-trash-alt"></i> Eliminar</button>
          </td>
        `;
        tablaProductos.appendChild(fila);
      });
    }

    async function cargarProductos() {
      try {
        const response = await fetch(`${API_BASE_URL}/productos`);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const productos = await response.json();
        renderizarProductos(productos);
      } catch (error) {
        console.error("Error al cargar los productos:", error);
        tablaProductos.innerHTML =
          '<tr><td colspan="7">Error al cargar los productos.</td></tr>';
      }
    }

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
        if (!response.ok)
          throw new Error(result.error || "Error en el servidor");
        alert(result.message);
        hideModal();
        cargarProductos();
        actualizarDashboard();
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
        const response = await fetch(
          `${API_BASE_URL}/productos/${productoId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedProducto),
          }
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Error en el servidor");
        alert(result.message);
        hideModal();
        cargarProductos();
        actualizarDashboard();
      } catch (error) {
        console.error("Error al actualizar el producto:", error);
        alert(`Error al actualizar el producto: ${error.message}`);
      }
    }

    async function handleEditarProducto(productoId) {
      try {
        const [productResponse, formResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/productos/${productoId}`),
          fetch("agregar-producto.html"), // No necesita autenticación
        ]);

        if (!productResponse.ok)
          throw new Error("Error al cargar los datos del producto.");
        if (!formResponse.ok) throw new Error("Error al cargar el formulario.");

        const producto = await productResponse.json();
        const formHtml = await formResponse.text();

        showModal("Editar Producto", formHtml);

        const form = modalBody.querySelector("form");
        form.querySelector("#nombre").value = producto.nombre;
        form.querySelector("#categoria").value = producto.categoria;
        form.querySelector("#cantidad").value = producto.cantidad;
        form.querySelector("#ubicacion").value = producto.ubicacion;
        form.querySelector("#ingreso").value = formatearFechaParaInput(
          producto.ingreso
        );
        form.querySelector("#vencimiento").value = formatearFechaParaInput(
          producto.vencimiento
        );
        form.querySelector("button[type='submit']").textContent =
          "Actualizar Producto";

        form.addEventListener("submit", (e) =>
          handleUpdateProducto(e, productoId)
        );
      } catch (error) {
        console.error("Error en handleEditarProducto:", error);
        alert(error.message);
      }
    }

    async function handleEliminarProducto(productoId) {
      if (!confirm("¿Estás seguro de que quieres eliminar este producto?"))
        return;

      try {
        const response = await fetch(
          `${API_BASE_URL}/productos/${productoId}`,
          {
            method: "DELETE",
          }
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Error en el servidor");
        alert(result.message);
        cargarProductos();
        actualizarDashboard();
      } catch (error) {
        console.error("Error al eliminar el producto:", error);
        alert(`Error al eliminar el producto: ${error.message}`);
      }
    }

    document
      .getElementById("btnAgregar")
      .addEventListener("click", async () => {
        try {
          const response = await fetch("agregar-producto.html");
          const formHtml = await response.text();
          showModal("Agregar Producto", formHtml);
          modalBody
            .querySelector("form")
            .addEventListener("submit", handleAgregarProducto);
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

    const searchInput = document.querySelector(".search-bar");
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filas = tablaProductos.querySelectorAll("tr");
      filas.forEach((fila) => {
        const nombreProducto = fila
          .querySelector("td")
          .textContent.toLowerCase();
        if (nombreProducto.includes(searchTerm)) {
          fila.style.display = "";
        } else {
          fila.style.display = "none";
        }
      });
    });

    cargarProductos();
    actualizarDashboard();
  }

  // --- NAVIGATION --- //
  document
    .querySelector("aside.sidebar nav ul")
    .addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link) {
        e.preventDefault();
        const section = link.dataset.section;

        document
          .querySelectorAll("aside.sidebar nav ul li")
          .forEach((li) => li.classList.remove("active"));
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
