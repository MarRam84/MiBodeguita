// db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Ruta al archivo de base de datos
const dbPath = path.resolve(__dirname, "bodega.db");

// Conexión
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error al conectar con SQLite:", err.message);
  } else {
    console.log("Conectado a la base de datos SQLite");
  }
});

module.exports = db;
