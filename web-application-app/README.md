# Mi Bodeguita - Sistema de Gestión de Inventario

Este proyecto es una aplicación full-stack para la gestión de un pequeño inventario con sistema de autenticación. Consiste en un backend con una API REST construido con Node.js y Express, y un frontend web con login seguro.

## 🚀 Características

- ✅ **Sistema de Login Seguro**: Autenticación JWT con tokens
- ✅ **Gestión de Inventario**: CRUD completo de productos
- ✅ **Control de Stock**: Entradas y salidas de productos
- ✅ **Reportes**: Visualización de datos y estadísticas
- ✅ **Interfaz Responsiva**: Optimizada para desktop y móvil
- ✅ **Tema Oscuro/Claro**: Personalización visual

## 📋 Credenciales de Prueba

Para probar la aplicación, usa estas credenciales:

- **Email**: `admin@bodega.com`
- **Contraseña**: `admin123`

## Project Structure

```
web-application-app
├── src
│   ├── login.html       # Página de login
│   ├── index.html       # Dashboard principal (requiere autenticación)
│   ├── js
│   │   ├── login.js     # Lógica del login
│   │   └── main.js      # JavaScript del dashboard
│   └── css
│       ├── login.css    # Estilos del login
│       └── styles.css   # Estilos del dashboard
├── server.js            # Backend API con autenticación
├── create-test-user.js  # Script para crear usuario de prueba
└── README.md
```

## Getting Started

To set up and run the web application, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd web-application-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your JWT secret
   ```

4. **Create test user** (optional):
   ```bash
   node create-test-user.js
   ```

5. **Start the server**:
   ```bash
   npm start
   ```

6. **Open your browser**:
   - Navigate to `http://localhost:3000`
   - You'll be redirected to the login page
   - Use the test credentials above to log in

## 🔧 Development

- **Development mode**: `npm run dev` (with nodemon)
- **Build for production**: `npm run build`
- **Android app**: `npm run android`

## Technologies Used

- **Backend**: Node.js, Express, SQLite, JWT Authentication
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Database**: SQLite3
- **Security**: bcrypt for password hashing, JWT for sessions
- **Mobile**: Capacitor for cross-platform deployment

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `GET /api/verify` - Verify JWT token

### Products
- `GET /api/productos` - Get all products
- `POST /api/productos` - Create product
- `PUT /api/productos/:id` - Update product
- `DELETE /api/productos/:id` - Delete product

### Users
- `GET /api/usuarios` - Get all users
- `POST /api/usuarios` - Create user
- `PUT /api/usuarios/:id` - Update user
- `DELETE /api/usuarios/:id` - Delete user

## Contributing

If you would like to contribute to this project, please fork the repository and submit a pull request.
