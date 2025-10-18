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
          if (!form) {
            console.error("Formulario no encontrado");
            return;
          }

          form.addEventListener("submit", (e) => {
            e.preventDefault();

            const nuevoProducto = {
              nombre: document.getElementById("nombre").value.trim(),
              categoria: document.getElementById("categoria").value.trim(),
              cantidad: parseInt(document.getElementById("cantidad").value),
              unidad: document.getElementById("unidad").value.trim(),
              lote: document.getElementById("lote").value.trim(),
              ubicacion: document.getElementById("ubicacion").value.trim(),
              ingreso: document.getElementById("ingreso").value,
              vencimiento: document.getElementById("vencimiento").value,
              activo: true,
            };

            // Validación básica
            if (
              !nuevoProducto.nombre ||
              isNaN(nuevoProducto.cantidad) ||
              !nuevoProducto.unidad ||
              !nuevoProducto.ingreso
            ) {
              alert(
                "Por favor completa todos los campos obligatorios correctamente."
              );
              return;
            }

            fetch("http://localhost:3000/api/productos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(nuevoProducto),
            })
              .then((res) => res.json())
              .then((res) => {
                if (res.error) {
                  alert("Error del servidor: " + res.error);
                } else {
                  alert(res.message || "Producto agregado correctamente");
                  document.getElementById("modal").classList.add("hidden");
                  loadContent("inventario.html", "inventario");
                }
              })
              .catch((err) => {
                console.error("Error al agregar producto:", err);
                alert("No se pudo conectar con el servidor.");
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
const express = require("express");

const productos = require("./routes/productos");

app.use(express.json());
app.use(productos);

app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
const { sql, pool, poolConnect } = require("../db");
const express = require("express");
const router = express.Router();
const express = require("express");
const app = express();
const productos = require("./routes/productos");

app.use(express.json());
app.use(productos);

app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
const { sql, pool, poolConnect } = require("../db");
