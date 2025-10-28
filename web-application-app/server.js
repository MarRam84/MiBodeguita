const express = require("express");
require("dotenv").config();
const cors = require("cors");
const mysql = require("mysql2");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "src")));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// API routes for usuarios
app.get("/api/usuarios", (req, res) => {
  pool.query(
    "SELECT UsuarioID, nombre, email, Rol FROM usuarios",
    (err, results) => {
      if (err) {
        console.error("Error querying usuarios:", err);
        res.status(500).json({ error: "Error al obtener los usuarios" });
        return;
      }
      res.json(results);
    }
  );
});

app.post("/api/usuarios", async (req, res) => {
  const { nombre, email, Rol, password } = req.body;

  if (!nombre || !email || !Rol || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { nombre, email, Rol, password: hashedPassword };

    pool.query("INSERT INTO usuarios SET ?", newUser, (err, results) => {
      if (err) {
        console.error("Error inserting usuario:", err);
        res
          .status(500)
          .json({ error: "Error al crear el usuario", details: err });
        return;
      }
      res.json({
        message: "Usuario creado correctamente",
        id: results.insertId,
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// API routes for productos
app.get("/api/productos", (req, res) => {
  pool.query("SELECT * FROM productos", (err, results) => {
    if (err) {
      console.error("Error querying productos:", err);
      res.status(500).json({ error: "Error al obtener los productos" });
      return;
    }
    res.json(results);
  });
});

app.get("/api/productos/:id", (req, res) => {
  const { id } = req.params;
  pool.query("SELECT * FROM productos WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("Error querying producto:", err);
      res.status(500).json({ error: "Error al obtener el producto" });
      return;
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(results[0]);
  });
});

app.post("/api/productos", (req, res) => {
  const nuevoProducto = req.body;
  pool.query("INSERT INTO productos SET ?", nuevoProducto, (err, results) => {
    if (err) {
      console.error("Error inserting producto:", err);
      res.status(500).json({ error: "Error al agregar el producto" });
      return;
    }
    res.json({
      message: "Producto agregado correctamente",
      id: results.insertId,
    });
  });
});

app.put("/api/productos/:id", (req, res) => {
  const { id } = req.params;
  const updatedProducto = req.body;
  pool.query(
    "UPDATE productos SET ? WHERE id = ?",
    [updatedProducto, id],
    (err, results) => {
      if (err) {
        console.error("Error updating producto:", err);
        res.status(500).json({ error: "Error al actualizar el producto" });
        return;
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      res.json({ message: "Producto actualizado correctamente" });
    }
  );
});

app.delete("/api/productos/:id", (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM productos WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("Error deleting producto:", err);
      res.status(500).json({ error: "Error al eliminar el producto" });
      return;
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ message: "Producto eliminado correctamente" });
  });
});

// Handle Chrome DevTools request
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.status(404).send();
});

// Serve the main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "index.html"));
});

// Routes for other HTML pages
app.get("/usuarios", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "usuarios.html"));
});

app.get("/inventario", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "inventario.html"));
});

app.get("/agregar-producto", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "agregar-producto.html"));
});

app.get("/configuracion", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "configuracion.html"));
});

app.get("/entrada", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "entrada.html"));
});

app.get("/reportes", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "reportes.html"));
});

app.get("/salida", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "salida.html"));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
