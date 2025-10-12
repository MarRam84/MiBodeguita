document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");
  const contentArea = document.getElementById("content-area");

  function showModal(title, bodyHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.classList.remove("hidden");
  }

  modalClose.addEventListener("click", () => modal.classList.add("hidden"));
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });

  function loadContent(url, section) {
    fetch(url)
      .then((response) => response.text())
      .then((data) => {
        contentArea.innerHTML = data;

        switch (section) {
          case "inventario":
            activarInventario();
            break;
        }
      })
      .catch((error) => {
        console.error("Error al cargar la sección:", error);
        contentArea.innerHTML = "<p>Error al cargar la sección.</p>";
      });
  }

  function activarInventario() {
    const btnAgregar = document.getElementById("btnAgregar");
    if (!btnAgregar) return;

    btnAgregar.addEventListener("click", () => {
      fetch("agregar-producto.html")
        .then((response) => response.text())
        .then((data) => {
          showModal("Agregar Producto", data);

          setTimeout(() => {
            const form = document.getElementById("formAgregarProducto");
            if (!form) return;

            form.addEventListener("submit", (e) => {
              e.preventDefault();

              const nuevoProducto = {
                nombre: document.getElementById("nombre").value,
                categoria: document.getElementById("categoria").value,
                cantidad: parseInt(document.getElementById("cantidad").value),
                unidad: document.getElementById("unidad").value,
                lote: document.getElementById("lote").value,
                ubicacion: document.getElementById("ubicacion").value,
                ingreso: document.getElementById("ingreso").value,
                vencimiento: document.getElementById("vencimiento").value,
                activo: true,
              };

              if (!nuevoProducto.nombre || isNaN(nuevoProducto.cantidad)) {
                alert("Por favor completa los campos correctamente.");
                return;
              }

              fetch("http://localhost:3000/api/productos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nuevoProducto),
              })
                .then((res) => res.json())
                .then((res) => {
                  alert(res.message || "Producto agregado correctamente");
                  document.getElementById("modal").classList.add("hidden");
                  loadContent("inventario.html", "inventario");
                })
                .catch((err) => {
                  console.error("Error al agregar producto:", err);
                  alert("Error al agregar el producto");
                });
            });
          }, 100);
        })
        .catch((error) => {
          console.error("Error al cargar el formulario:", error);
          showModal("Error", "<p>No se pudo cargar el formulario.</p>");
        });
    });
  }

  document
    .querySelector("aside.sidebar nav ul")
    .addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        e.preventDefault();
        const section = e.target.dataset.section;

        document
          .querySelectorAll("aside.sidebar nav ul li")
          .forEach((li) => li.classList.remove("active"));
        e.target.parentNode.classList.add("active");

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

  loadContent("inventario.html", "inventario");
});
document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("themeToggle");

  // Activar tema guardado
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }

  // Cambiar tema al hacer clic
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
});
