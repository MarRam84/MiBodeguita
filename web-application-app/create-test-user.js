const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");

const db = new sqlite3.Database(
  path.join(__dirname, "inventario.db"),
  (err) => {
    if (err) {
      console.error("Error al abrir la base de datos:", err.message);
    } else {
      console.log("Conectado a la base de datos.");
    }
  }
);

async function createTestUser() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  db.run(
    `INSERT OR REPLACE INTO usuarios (UsuarioID, nombre, email, Rol, password) VALUES (?, ?, ?, ?, ?)`,
    [1, "Administrador", "admin@bodega.com", "Admin", hashedPassword],
    function(err) {
      if (err) {
        console.error("Error creando usuario de prueba:", err.message);
      } else {
        console.log("Usuario de prueba creado exitosamente:");
        console.log("Email: admin@bodega.com");
        console.log("Contraseña: admin123");
      }
      db.close();
    }
  );
}

createTestUser();