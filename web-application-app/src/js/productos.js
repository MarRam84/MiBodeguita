const express = require("express");
const router = express.Router();
const { sql, pool, poolConnect } = require("../db");

// Insertar producto
router.post("/api/productos", async (req, res) => {
  await poolConnect;
  const {
    nombre,
    categoria,
    cantidad,
    unidad,
    lote,
    ubicacion,
    ingreso,
    vencimiento,
    activo,
  } = req.body;

  try {
    const result = await pool
      .request()
      .input("nombre", sql.VarChar(100), nombre)
      .input("categoria", sql.VarChar(100), categoria)
      .input("cantidad", sql.Int, cantidad)
      .input("unidad", sql.VarChar(50), unidad)
      .input("lote", sql.VarChar(50), lote)
      .input("ubicacion", sql.VarChar(100), ubicacion)
      .input("ingreso", sql.Date, ingreso)
      .input("vencimiento", sql.Date, vencimiento)
      .input("activo", sql.Bit, activo).query(`
        INSERT INTO Productos (
          nombre, categoria, cantidad, unidad, lote,
          ubicacion, ingreso, vencimiento, activo
        )
        VALUES (
          @nombre, @categoria, @cantidad, @unidad, @lote,
          @ubicacion, @ingreso, @vencimiento, @activo
        )
      `);

    res.json({ message: "Producto agregado correctamente" });
  } catch (err) {
    console.error("Error al insertar producto:", err);
    res.status(500).json({ error: "Error al guardar el producto" });
  }
});

module.exports = router;
