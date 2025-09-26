// filepath: backend/server.js
const express = require('express');
const mssql = require('mssql');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Configuración de la base de datos SQL Server
const dbConfig = {
  server: 'localhost\\DESKTOP-8DE8JQT',
  database: 'BodegaDB',
  options: {
    trustedConnection: true // Usa la autenticación de Windows
  }
};

// Función para conectar a la base de datos
async function connectToDatabase() {
  try {
    await mssql.connect(dbConfig);
    console.log('Conectado a la base de datos SQL Server');
    return true; // Indica que la conexión fue exitosa
  } catch (err) {
    console.error('Error al conectar a la base de datos:', err);
    return false; // Indica que la conexión falló
  }
}

// Verificar la conexión al iniciar el servidor
connectToDatabase().then(isConnected => {
  if (isConnected) {
    // Rutas de la API
    app.get('/api/productos', async (req, res) => {
      try {
        const result = await mssql.query`SELECT * FROM productos`;
        res.json(result.recordset);
      } catch (err) {
        console.error('Error al obtener los productos:', err);
        res.status(500).send('Error al obtener los productos');
      }
    });

    app.post('/api/productos', async (req, res) => {
      const producto = req.body;
      try {
        await mssql.query`INSERT INTO productos (nombre, categoria, cantidad, ubicacion, ingreso, vencimiento) VALUES (${producto.nombre}, ${producto.categoria}, ${producto.cantidad}, ${producto.ubicacion}, ${producto.ingreso}, ${producto.vencimiento})`;
        res.json({ message: 'Producto agregado correctamente' });
      } catch (err) {
        console.error('Error al agregar el producto:', err);
        res.status(500).send('Error al agregar el producto');
      }
    });

    app.listen(port, () => {
      console.log(`Servidor backend escuchando en el puerto ${port}`);
    });
  } else {
    console.log('No se pudo conectar a la base de datos. El servidor no se iniciará.');
  }
});