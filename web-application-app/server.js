const express = require("express");
require("dotenv").config();
const cors = require("cors");
const mysql = require("mysql2"); // Usar mysql2
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_super_segura";

// Middleware
app.use(cors());
app.use(express.json());

// Rutas específicas antes de archivos estáticos
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "index.html"));
});

app.use(express.static(path.join(__dirname, "src")));

// Conexión a la base de datos MySQL
const dbHost = process.env.DB_HOST?.trim() || "localhost";
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const dbUser = process.env.DB_USER?.trim() || "root";
const dbPassword = process.env.DB_PASSWORD ?? "";
const dbName = process.env.DB_NAME?.trim() || "mibodeguita";

// Inicializamos el pool directamente con la base de datos definida
let pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log("MySQL config:", {
  host: dbHost,
  port: dbPort,
  user: dbUser,
  database: dbName,
});
function initDatabase(callback) {
  // 1. Inicializar las tablas si no existen en MySQL
  pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
    UsuarioID INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    Rol VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL
  )`, (err) => {
    if (err) {
      console.error("Error creando tabla usuarios:", err);
      process.exit(1);
    }

    pool.query(`CREATE TABLE IF NOT EXISTS productos (
      ProductoID INT PRIMARY KEY AUTO_INCREMENT,
      nombre VARCHAR(255) NOT NULL,
      categoria VARCHAR(255),
      cantidad INT DEFAULT 0,
      ubicacion VARCHAR(255),
      ingreso DATE,
      vencimiento DATE
    )`, (err) => {
      if (err) {
        console.error("Error creando tabla productos:", err);
        process.exit(1);
      }

      pool.query(`CREATE TABLE IF NOT EXISTS movimientos (
        MovimientoID INT PRIMARY KEY AUTO_INCREMENT,
        ProductoID INT,
        Tipo VARCHAR(50) NOT NULL,
        Cantidad INT NOT NULL,
        Fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ProductoID) REFERENCES productos(ProductoID)
      )`, (err) => {
        if (err) {
          console.error("Error creando tabla movimientos:", err);
          process.exit(1);
        }

        // 2. Asegurar que exista un admin inicial para login
        pool.query("SELECT count(*) as count FROM usuarios WHERE email = 'admin@bodega.com'", (err, results) => {
          if (err) {
            console.error("Error checking users count:", err);
            if (callback) callback();
            return;
          }
          if (Number(results[0].count) === 0) {
            console.log("Creando usuario admin por defecto...");
            bcrypt.hash("admin123", 10, (hashErr, hashedPassword) => {
              if (hashErr) {
                console.error("Error hashing admin password:", hashErr);
                return;
              }
              pool.query(
                "INSERT INTO usuarios (nombre, email, Rol, password) VALUES (?, ?, ?, ?)",
                ["Administrador", "admin@bodega.com", "Admin", hashedPassword],
                (insertErr) => {
                  if (insertErr) {
                    console.error("Error inserting admin user:", insertErr);
                  } else {
                    console.log("Usuario admin por defecto creado (admin@bodega.com/admin123)");
                  }
                  if (callback) callback();
                }
              );
            });
          } else {
            if (callback) callback();
          }
        });
      });
    });
  });
}

function startServer() {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

function connectAndStart() {
  console.log(`Intentando conectar a MySQL en ${dbHost}:${dbPort}...`);
  pool.getConnection((err, connection) => {
    if (err) {
      // Si el error es que la DB no existe (común en entorno local), intentamos crearla
      if (err.code === 'ER_BAD_DB_ERROR') {
        console.log("La base de datos no existe. Intentando crearla (solo entorno local)...");
        const tempConn = mysql.createConnection({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPassword
        });

        tempConn.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(dbName)}`, (createErr) => {
          tempConn.end();
          if (createErr) {
            console.error("Error fatal: No se pudo crear ni conectar a la DB:", createErr.message);
            process.exit(1);
          }
          console.log("Base de datos creada. Inicializando...");
          initDatabase(startServer);
        });
        return;
      }
      console.error("Error de conexión a MySQL:", err.message);
      process.exit(1);
    }
    connection.release();
    console.log("Conexión a MySQL establecida correctamente.");
    initDatabase(startServer);
  });
}

// ----------------------------------------------------------------------
// AUTENTICACIÓN
// ----------------------------------------------------------------------

// POST Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña son requeridos" });
  }

  pool.query(
    "SELECT UsuarioID, nombre, email, Rol, password FROM usuarios WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        console.error("Error querying user:", err);
        return res.status(500).json({ message: "Error interno del servidor" });
      }
      const user = results[0];
      if (!user) {
        console.log(`Intento de login fallido: usuario no encontrado (${email})`);
        return res.status(401).json({ message: "Usuario no registrado o credenciales incorrectas" });
      }

      // Detectar el rol de forma segura y normalizada
      const userRole = (user.Rol || user.rol || "").trim();
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        console.log(`Intento de login fallido: contraseña incorrecta para ${email}`);
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      console.log(`Login exitoso para ${email}. Rol detectado: "${userRole}"`);

      const token = jwt.sign(
        { userId: user.UsuarioID, email: user.email, role: userRole },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({ token, user: { id: user.UsuarioID, nombre: user.nombre, email: user.email, rol: userRole } });
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
  } catch (err) {
    console.error("Error al verificar token:", err.message);
    res.status(401).json({ message: "Token inválido" });
  }
}

// Middleware para verificar rol de administrador
function requireAdmin(req, res, next) {
  const role = (req.user && (req.user.role || req.user.rol || "")).toString().trim();
  
  console.log(`Verificando permisos de Admin. Rol en token: "${role}"`);

  if (role.toLowerCase() !== "admin") {
    return res.status(403).json({ error: "Acceso denegado. Solo administradores pueden realizar esta acción." });
  }
  next();
}

// ----------------------------------------------------------------------
// API routes for usuarios
// ----------------------------------------------------------------------

// GET todos los Usuarios
app.get("/api/usuarios", authenticateToken, requireAdmin, (req, res) => {
  pool.query(
    "SELECT UsuarioID, nombre, email, Rol FROM usuarios",
    (err, results) => {
      if (err) {
        console.error("Error querying usuarios:", err);
        return res.status(500).json({ error: "Error al obtener los usuarios" });
      }
      res.json(results);
    }
  );
});

// POST Nuevo Usuario
app.post("/api/usuarios", async (req, res) => {
  let { nombre, email, Rol, rol, password } = req.body;

  // Soporte para ambos nombres de campo 'Rol' y 'rol' desde el frontend
  let roleToSave = Rol || rol;

  if (!nombre || !email || !roleToSave || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  // Normalizar Rol para asegurar consistencia (Admin, Bodeguero, Visor)
  roleToSave = roleToSave.toString().trim();
  roleToSave = roleToSave.charAt(0).toUpperCase() + roleToSave.slice(1).toLowerCase();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql =
      "INSERT INTO usuarios (nombre, email, Rol, password) VALUES (?, ?, ?, ?)";
    const params = [nombre, email, roleToSave, hashedPassword];

    pool.query(sql, params, (err, result) => {
      if (err) {
        console.error("Error inserting usuario:", err);
        // Error 500 podría indicar una violación de UNIQUE (email)
        return res
          .status(500)
          .json({ error: "Error al crear el usuario", details: err.message });
      }
      res.json({
        message: "Usuario creado correctamente",
        id: result.insertId,
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET Usuario
app.get("/api/usuarios/:id", (req, res) => {
  const { id } = req.params;
  pool.query(
    "SELECT UsuarioID, nombre, email, Rol FROM usuarios WHERE UsuarioID = ?",
    [id],
    (err, results) => {
      if (err) {
        console.error("Error querying usuario:", err);
        return res.status(500).json({ error: "Error al obtener el usuario" });
      }
      const result = results[0];
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

  // Mapear 'rol' a 'Rol' si es necesario para consistencia con la DB
  const inputRol = userData.Rol || userData.rol;
  if (inputRol) {
    userData.Rol = inputRol;
    if (userData.rol) delete userData.rol;
  }

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

  // Normalizar Rol si se proporciona para mantener la consistencia visual y de permisos
  if (userData.Rol) {
    userData.Rol = userData.Rol.toString().trim();
    userData.Rol = userData.Rol.charAt(0).toUpperCase() + userData.Rol.slice(1).toLowerCase();
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

  pool.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error updating usuario:", err);
      return res.status(500).json({ error: "Error al actualizar el usuario" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario actualizado correctamente" });
  });
});

// DELETE Usuario
app.delete("/api/usuarios/:id", (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM usuarios WHERE UsuarioID = ?", [id], (err, result) => {
    if (err) {
      console.error("Error deleting usuario:", err);
      return res.status(500).json({ error: "Error al eliminar el usuario" });
    }
    if (result.affectedRows === 0) {
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
  pool.query("SELECT * FROM productos", (err, results) => {
    if (err) {
      console.error("Error querying productos:", err);
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
  const query = `
    SELECT ProductoID, nombre, categoria, cantidad, vencimiento
    FROM productos
    WHERE vencimiento BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL ${DIAS_PARA_VENCER_UMBRAL} DAY)
    AND cantidad > 0
    ORDER BY vencimiento ASC
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("Error querying productos por vencer:", err);
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
  pool.query(
    "SELECT * FROM productos WHERE ProductoID = ?",
    [id],
    (err, results) => {
      if (err) {
        console.error("Error querying producto:", err);
        return res.status(500).json({ error: "Error al obtener el producto" });
      }
      const result = results[0];
      if (!result) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      res.json(result);
    }
  );
});

// POST Nuevo Producto
app.post("/api/productos", authenticateToken, requireAdmin, (req, res) => {
  const nuevoProducto = req.body;
  const keys = Object.keys(nuevoProducto);
  const placeholders = keys.map(() => "?").join(", ");
  const sql = `INSERT INTO productos (${keys.join(
    ", "
  )}) VALUES (${placeholders})`;
  const params = keys.map((key) => nuevoProducto[key]);

  pool.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error inserting producto:", err);
      return res.status(500).json({ error: "Error al agregar el producto" });
    }
    res.json({
      message: "Producto agregado correctamente",
      id: result.insertId,
    });
  });
});

// PUT Actualizar Producto
app.put("/api/productos/:id", authenticateToken, requireAdmin, (req, res) => {

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

  pool.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error updating producto:", err);
      return res.status(500).json({ error: "Error al actualizar el producto" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ message: "Producto actualizado correctamente" });
  });
});

// Borrar Producto
app.delete("/api/productos/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM productos WHERE ProductoID = ?", [id], (err, result) => {
    if (err) {
      console.error("Error deleting producto:", err);
      return res.status(500).json({ error: "Error al eliminar el producto" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ message: "Producto eliminado correctamente" });
  });
});

// ----------------------------------------------------------------------
// API rutas para movimientos (Entradas/Salidas)
// ----------------------------------------------------------------------

// POST Entrada
app.post("/api/entradas", authenticateToken, requireAdmin, (req, res) => {
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

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error obteniendo conexión MySQL:", err);
      return res.status(500).json({ error: "Error de conexión." });
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        console.error("Error iniciando transacción:", err);
        return res.status(500).json({ error: "Error iniciando transacción." });
      }

      connection.query(
        "SELECT cantidad FROM productos WHERE ProductoID = ?",
        [nombreProductoEntrada],
        (err, results) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              console.error("Error verificando producto:", err);
              res.status(500).json({ error: "Error verificando stock." });
            });
          }

          const product = results[0];
          if (!product) {
            return connection.rollback(() => {
              connection.release();
              res.status(404).json({ error: "Producto no encontrado." });
            });
          }

          connection.query(
            "UPDATE productos SET cantidad = cantidad + ? WHERE ProductoID = ?",
            [cantidad, nombreProductoEntrada],
            (err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  console.error("Error actualizando stock:", err);
                  res.status(500).json({ error: "Error al actualizar el stock." });
                });
              }

              connection.query(
                "INSERT INTO movimientos (ProductoID, Tipo, Cantidad) VALUES (?, ?, ?)",
                [nombreProductoEntrada, "Entrada", cantidad],
                (err) => {
                  if (err) {
                    return connection.rollback(() => {
                      connection.release();
                      console.error("Error registrando movimiento:", err);
                      res.status(500).json({ error: "Error al registrar el movimiento." });
                    });
                  }

                  connection.commit((err) => {
                    if (err) {
                      return connection.rollback(() => {
                        connection.release();
                        console.error("Error confirmando transacción:", err);
                        res.status(500).json({ error: "Error al confirmar la transacción." });
                      });
                    }

                    connection.release();
                    res.json({ message: "Entrada de stock registrada correctamente." });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

// POST Salida
app.post("/api/salidas", authenticateToken, requireAdmin, (req, res) => {
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

  pool.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: "Error de conexión." });

    connection.beginTransaction((err) => {
      if (err) { connection.release(); return res.status(500).json({ error: "Error iniciando transacción." }); }

      // 1. Verificar stock
      connection.query(
        "SELECT cantidad FROM productos WHERE ProductoID = ?",
        [nombreProductoSalida],
        (err, results) => {
          const result = results ? results[0] : null;
          if (err || !result || result.cantidad < cantidad) {
            return connection.rollback(() => {
              connection.release();
              res.status(err ? 500 : (result ? 400 : 404)).json({ 
                error: err ? "Error verificando stock." : (result ? `Stock insuficiente. Solo quedan ${result.cantidad} unidades.` : "Producto no encontrado.") 
              });
            });
          }

          // 2. Actualizar stock
          connection.query(
            "UPDATE productos SET cantidad = cantidad - ? WHERE ProductoID = ?",
            [cantidad, nombreProductoSalida],
            (err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({ error: "Error actualizando stock." });
                });
              }

              // 3. Registrar movimiento
              connection.query(
                "INSERT INTO movimientos (ProductoID, Tipo, Cantidad) VALUES (?, ?, ?)",
                [nombreProductoSalida, "Salida", cantidad],
                (err) => {
                  if (err) {
                    return connection.rollback(() => {
                      connection.release();
                      res.status(500).json({ error: "Error al registrar el movimiento." });
                    });
                  }

                  connection.commit((err) => {
                    if (err) {
                      return connection.rollback(() => {
                        connection.release();
                        res.status(500).json({ error: "Error al confirmar transacción." });
                      });
                    }
                    connection.release();
                    res.json({ message: "Salida de stock registrada correctamente." });
                  });
                }
              );
            }
          );
        }
      );
    });
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
  pool.query(query, (err, results) => {
    if (err) {
      console.error("Error querying movimientos:", err);
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
  res.redirect('/login');
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

// Iniciar Servidor solo después de validar conexión MySQL
connectAndStart();
