// db.js
const sql = require("mssql");

const config = {
  user: "tu_usuario", // ← tu usuario de SQL Server
  password: "tu_contraseña", // ← tu contraseña
  server: "DESKTOP-8DE8JQT\\SQLEXPRESS", // ← host + instancia
  database: "BodegaDB", // ← nombre correcto de tu base de datos
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

module.exports = { sql, pool, poolConnect };
const express = require("express");
const router = express.Router();
const { sql, pool, poolConnect } = require("../db");

// Obtener todos los productos
router.get("/api/productos", async (req, res) => {
  await poolConnect;
  try {
    const result = await pool.request().query(`
      SELECT id, nombre, categoria, cantidad, unidad, lote,
             ubicacion, ingreso, vencimiento, activo
      FROM Productos
      ORDER BY ingreso DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error al consultar productos:", err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

module.exports = router;
