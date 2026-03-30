const express = require("express");
require("dotenv").config();
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose(); // Usar sqlite3
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const port = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_super_segura";

// Middleware
app.use(cors());
app.use(express.json());

// Rutas específicas antes de archivos estáticos
app.get("/", (req, res) => {
  // Por defecto, servir el login. El cliente manejará la autenticación
  res.sendFile(path.join(__dirname, "src", "login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "index.html"));
});

app.use(express.static(path.join(__dirname, "src")));

// Conexión a la base de datos SQLite
// Se usará una base de datos basada en archivos llamada 'inventario.db'
const db = new sqlite3.Database(
  path.join(__dirname, "inventario.db"),
  (err) => {
    if (err) {
      console.error("Error al abrir la base de datos SQLite:", err.message);
    } else {
      console.log("Conectado a la base de datos SQLite 'inventario.db'.");
      // Inicializar las tablas si no existen
      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        UsuarioID INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        Rol TEXT NOT NULL,
        password TEXT NOT NULL
      )`);

        db.run(`CREATE TABLE IF NOT EXISTS productos (
        ProductoID INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        categoria TEXT,
        cantidad INTEGER DEFAULT 0,
        ubicacion TEXT,
        ingreso DATE,
        vencimiento DATE
      )`);

        db.run(`CREATE TABLE IF NOT EXISTS movimientos (
        MovimientoID INTEGER PRIMARY KEY AUTOINCREMENT,
        ProductoID INTEGER,
        Tipo TEXT NOT NULL, -- 'Entrada' o 'Salida'
        Cantidad INTEGER NOT NULL,
        Fecha TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (ProductoID) REFERENCES productos(ProductoID)
      )`);
      });
    }
  }
);

// Nota: En SQLite, se usa db.all() para obtener múltiples filas, db.get() para una sola fila, y db.run() para INSERT/UPDATE/DELETE.

// ----------------------------------------------------------------------
// AUTENTICACIÓN
// ----------------------------------------------------------------------

// POST Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña son requeridos" });
  }

  db.get(
    "SELECT UsuarioID, nombre, email, Rol, password FROM usuarios WHERE email = ?",
    [email],
    async (err, user) => {
      if (err) {
        console.error("Error querying user:", err.message);
        return res.status(500).json({ message: "Error interno del servidor" });
      }
      if (!user) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }
      const token = jwt.sign(
        { userId: user.UsuarioID, email: user.email, role: user.Rol },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({ token, user: { id: user.UsuarioID, nombre: user.nombre, email: user.email, rol: user.Rol } });
    }
  );
});

// GET Verificar Token
app.get("/api/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (e) {
    res.status(401).json({ message: "Token inválido" });
  }
});

// Middleware para proteger rutas (opcional)
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Acceso denegado" });
  }
  const token = authHeader.substring(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ message: "Token inválido" });
  }
}

// ----------------------------------------------------------------------
// API routes for usuarios
// ----------------------------------------------------------------------

// GET todos los Usuarios
app.get("/api/usuarios", (req, res) => {
  // SQLite no necesita el alias 'AS' para UsuarioID.
  db.all(
    "SELECT UsuarioID, nombre, email, Rol FROM usuarios",
    (err, results) => {
      if (err) {
        console.error("Error querying usuarios:", err.message);
        return res.status(500).json({ error: "Error al obtener los usuarios" });
      }
      res.json(results);
    }
  );
});

// POST Nuevo Usuario
app.post("/api/usuarios", async (req, res) => {
  const { nombre, email, Rol, password } = req.body;

  if (!nombre || !email || !Rol || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql =
      "INSERT INTO usuarios (nombre, email, Rol, password) VALUES (?, ?, ?, ?)";
    const params = [nombre, email, Rol, hashedPassword];

    // db.run ejecuta la query y usa `this.lastID` para el ID insertado
    db.run(sql, params, function (err) {
      if (err) {
        console.error("Error inserting usuario:", err.message);
        // Error 500 podría indicar una violación de UNIQUE (email)
        return res
          .status(500)
          .json({ error: "Error al crear el usuario", details: err.message });
      }
      res.json({
        message: "Usuario creado correctamente",
        id: this.lastID, // SQLite property for the last inserted row ID
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET Usuario
app.get("/api/usuarios/:id", (req, res) => {
  const { id } = req.params;
  // db.get es para obtener una sola fila
  db.get(
    "SELECT UsuarioID, nombre, email, Rol FROM usuarios WHERE UsuarioID = ?",
    [id],
    (err, result) => {
      if (err) {
        console.error("Error querying usuario:", err.message);
        return res.status(500).json({ error: "Error al obtener el usuario" });
      }
      if (!result) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      res.json(result);
    }
  );
});

// PUT Actualizar Usuario
app.put("/api/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  let userData = req.body;

  // Si se proporciona una nueva contraseña, se hashea
  if (userData.password) {
    try {
      userData.password = await bcrypt.hash(userData.password, 10);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Error al encriptar la contraseña" });
    }
  }

  // Convertir el objeto userData a una lista de SET clauses y sus valores
  const keys = Object.keys(userData);
  const setClauses = keys.map((key) => `${key} = ?`).join(", ");
  const params = keys.map((key) => userData[key]);
  params.push(id); // Añadir el ID al final para la cláusula WHERE

  if (keys.length === 0) {
    return res.status(400).json({ error: "No hay datos para actualizar" });
  }

  const sql = `UPDATE usuarios SET ${setClauses} WHERE UsuarioID = ?`;

  // db.run ejecuta la query y usa `this.changes` para ver filas afectadas
  db.run(sql, params, function (err) {
    if (err) {
      console.error("Error updating usuario:", err.message);
      return res.status(500).json({ error: "Error al actualizar el usuario" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario actualizado correctamente" });
  });
});

// DELETE Usuario
app.delete("/api/usuarios/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM usuarios WHERE UsuarioID = ?", [id], function (err) {
    if (err) {
      console.error("Error deleting usuario:", err.message);
      return res.status(500).json({ error: "Error al eliminar el usuario" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario eliminado correctamente" });
  });
});

// ----------------------------------------------------------------------
// API/Rutas
// ----------------------------------------------------------------------

// Obtener Productos
app.get("/api/productos", (req, res) => {
  db.all("SELECT * FROM productos", (err, results) => {
    if (err) {
      console.error("Error querying productos:", err.message);
      return res.status(500).json({ error: "Error al obtener los productos" });
    }
    res.json(results);
  });
});

// GET Productos Vencimiento Próximo
// IMPORTANTE: debe definirse antes de la ruta parametrizada `/api/productos/:id`
// para evitar que Express trate `vencimiento` como un `:id` y se produzcan colisiones.
app.get("/api/productos/vencimiento", (req, res) => {
  const DIAS_PARA_VENCER_UMBRAL = 30;
  // SQLite usa julianday() para operaciones con fechas
  const query = `
    SELECT ProductoID, nombre, categoria, cantidad, vencimiento
    FROM productos
    WHERE strftime('%s', vencimiento)
    BETWEEN strftime('%s', 'now', 'localtime')
    AND strftime('%s', 'now', 'localtime', '+${DIAS_PARA_VENCER_UMBRAL} days')
    AND cantidad > 0
    ORDER BY vencimiento ASC
  `;

  db.all(query, (err, results) => {
    if (err) {
      console.error("Error querying productos por vencer:", err.message);
      return res
        .status(500)
        .json({ error: "Error al obtener los productos por vencer" });
    }
    res.json(results);
  });
});

// Obtener un Producto
app.get("/api/productos/:id", (req, res) => {
  const { id } = req.params;
  db.get(
    "SELECT * FROM productos WHERE ProductoID = ?",
    [id],
    (err, result) => {
      if (err) {
        console.error("Error querying producto:", err.message);
        return res.status(500).json({ error: "Error al obtener el producto" });
      }
      if (!result) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      res.json(result);
    }
  );
});

// POST Nuevo Producto
app.post("/api/productos", (req, res) => {
  const nuevoProducto = req.body;
  const keys = Object.keys(nuevoProducto);
  const placeholders = keys.map(() => "?").join(", ");
  const sql = `INSERT INTO productos (${keys.join(
    ", "
  )}) VALUES (${placeholders})`;
  const params = keys.map((key) => nuevoProducto[key]);

  db.run(sql, params, function (err) {
    if (err) {
      console.error("Error inserting producto:", err.message);
      return res.status(500).json({ error: "Error al agregar el producto" });
    }
    res.json({
      message: "Producto agregado correctamente",
      id: this.lastID,
    });
  });
});

// PUT Actualizar Producto
app.put("/api/productos/:id", authenticateToken, (req, res) => {
  const userRole = (req.user.role || "").toString().trim().toLowerCase();
  const allowedRoles = ["admin", "administrador"];
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ error: "No autorizado para actualizar productos" });
  }

  const { id } = req.params;
  const updatedProducto = req.body;

  const keys = Object.keys(updatedProducto);
  const setClauses = keys.map((key) => `${key} = ?`).join(", ");
  const params = keys.map((key) => updatedProducto[key]);
  params.push(id);

  if (keys.length === 0) {
    return res.status(400).json({ error: "No hay datos para actualizar" });
  }

  const sql = `UPDATE productos SET ${setClauses} WHERE ProductoID = ?`;

  db.run(sql, params, function (err) {
    if (err) {
      console.error("Error updating producto:", err.message);
      return res.status(500).json({ error: "Error al actualizar el producto" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ message: "Producto actualizado correctamente" });
  });
});

// Borrar Producto
app.delete("/api/productos/:id", authenticateToken, (req, res) => {
  const userRole = (req.user.role || "").toString().trim().toLowerCase();
  const allowedRoles = ["admin", "administrador"];
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ error: "No autorizado para eliminar productos" });
  }

  const { id } = req.params;
  db.run("DELETE FROM productos WHERE ProductoID = ?", [id], function (err) {
    if (err) {
      console.error("Error deleting producto:", err.message);
      return res.status(500).json({ error: "Error al eliminar el producto" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ message: "Producto eliminado correctamente" });
  });
});

// ----------------------------------------------------------------------
// API rutas para movimientos (Entradas/Salidas)
// ----------------------------------------------------------------------

// POST Entrada
app.post("/api/entradas", (req, res) => {
  const { nombreProductoEntrada, cantidadProductoEntrada } = req.body;

  if (!nombreProductoEntrada || !cantidadProductoEntrada) {
    return res
      .status(400)
      .json({ error: "Se requiere el producto y la cantidad." });
  }

  const cantidad = parseInt(cantidadProductoEntrada, 10);
  if (isNaN(cantidad) || cantidad <= 0) {
    return res
      .status(400)
      .json({ error: "La cantidad debe ser un número positivo." });
  }

  // Usar transacción para asegurar atomicidad
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // 1. Actualizar stock
    db.run(
      "UPDATE productos SET cantidad = cantidad + ? WHERE ProductoID = ?",
      [cantidad, nombreProductoEntrada],
      function (err) {
        if (err) {
          console.error("Error updating stock:", err.message);
          db.run("ROLLBACK");
          return res
            .status(500)
            .json({ error: "Error al actualizar el stock del producto." });
        }
        if (this.changes === 0) {
          db.run("ROLLBACK");
          return res.status(404).json({ error: "Producto no encontrado." });
        }

        // 2. Registrar movimiento
        const movimiento = {
          ProductoID: nombreProductoEntrada,
          Tipo: "Entrada",
          Cantidad: cantidad,
        };

        const sqlMov =
          "INSERT INTO movimientos (ProductoID, Tipo, Cantidad) VALUES (?, ?, ?)";
        const paramsMov = [
          movimiento.ProductoID,
          movimiento.Tipo,
          movimiento.Cantidad,
        ];

        db.run(sqlMov, paramsMov, function (err) {
          if (err) {
            console.error("Error logging movement:", err.message);
            db.run("ROLLBACK");
            return res
              .status(500)
              .json({ error: "Error al registrar el movimiento." });
          }

          // Confirmar transacción
          db.run("COMMIT", (err) => {
            if (err) {
              console.error("Error committing transaction:", err.message);
              return res
                .status(500)
                .json({ error: "Error al confirmar la transacción." });
            }
            res.json({ message: "Entrada de stock registrada correctamente." });
          });
        });
      }
    );
  });
});

// POST Salida
app.post("/api/salidas", (req, res) => {
  const { nombreProductoSalida, cantidadProductoSalida } = req.body;

  if (!nombreProductoSalida || !cantidadProductoSalida) {
    return res
      .status(400)
      .json({ error: "Se requiere el producto y la cantidad." });
  }

  const cantidad = parseInt(cantidadProductoSalida, 10);
  if (isNaN(cantidad) || cantidad <= 0) {
    return res
      .status(400)
      .json({ error: "La cantidad debe ser un número positivo." });
  }

  // Usar transacción para asegurar atomicidad
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // 1. Verificar stock
    db.get(
      "SELECT cantidad FROM productos WHERE ProductoID = ?",
      [nombreProductoSalida],
      (err, result) => {
        if (err) {
          console.error("Error checking stock:", err.message);
          db.run("ROLLBACK");
          return res.status(500).json({ error: "Error al verificar el stock." });
        }

        if (!result) {
          db.run("ROLLBACK");
          return res.status(404).json({ error: "Producto no encontrado." });
        }

        const stockActual = result.cantidad;
        if (stockActual < cantidad) {
          db.run("ROLLBACK");
          return res.status(400).json({
            error: `Stock insuficiente. Solo quedan ${stockActual} unidades.`,
          });
        }

        // 2. Actualizar stock
        db.run(
          "UPDATE productos SET cantidad = cantidad - ? WHERE ProductoID = ?",
          [cantidad, nombreProductoSalida],
          function (updateErr) {
            if (updateErr) {
              console.error("Error updating stock:", updateErr.message);
              db.run("ROLLBACK");
              return res
                .status(500)
                .json({ error: "Error al actualizar el stock del producto." });
            }

            // 3. Registrar movimiento
            const movimiento = {
              ProductoID: nombreProductoSalida,
              Tipo: "Salida",
              Cantidad: cantidad,
            };

            const sqlMov =
              "INSERT INTO movimientos (ProductoID, Tipo, Cantidad) VALUES (?, ?, ?)";
            const paramsMov = [
              movimiento.ProductoID,
              movimiento.Tipo,
              movimiento.Cantidad,
            ];

            db.run(sqlMov, paramsMov, function (logErr) {
              if (logErr) {
                console.error("Error logging movement:", logErr.message);
                db.run("ROLLBACK");
                return res
                  .status(500)
                  .json({ error: "Error al registrar el movimiento." });
              }

              // Confirmar transacción
              db.run("COMMIT", (err) => {
                if (err) {
                  console.error("Error committing transaction:", err.message);
                  return res
                    .status(500)
                    .json({ error: "Error al confirmar la transacción." });
                }
                res.json({ message: "Salida de stock registrada correctamente." });
              });
            });
          }
        );
      }
    );
  });
});

// GET Movimientos Recientes
app.get("/api/movimientos", (req, res) => {
  const query = `
    SELECT m.Tipo, m.Cantidad, m.Fecha, p.nombre AS ProductoNombre
    FROM movimientos m
    JOIN productos p ON m.ProductoID = p.ProductoID
    ORDER BY m.Fecha DESC
    LIMIT 5;
  `;
  // db.all es para obtener múltiples resultados
  db.all(query, (err, results) => {
    if (err) {
      console.error("Error querying movimientos:", err.message);
      return res
        .status(500)
        .json({ error: "Error al obtener los movimientos" });
    }
    res.json(results);
  });
});

// ----------------------------------------------------------------------
// HTML Rutas (No han cambiado)
// ----------------------------------------------------------------------

// Handle Chrome DevTools request
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.status(404).send();
});

// Serve the main HTML file

app.get("/", (req, res) => {
  // Verificar si hay un token válido en las cookies o headers
  const authHeader = req.headers.authorization || req.headers.cookie;

  if (authHeader && (authHeader.includes('authToken=') || authHeader.startsWith('Bearer '))) {
    // Si hay token, servir el dashboard
    res.sendFile(path.join(__dirname, "src", "index.html"));
  } else {
    // Si no hay token, redirigir al login
    res.redirect('/login.html');
  }
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

// Iniciar Servidor
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${port}`);
});
