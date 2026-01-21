const { app, BrowserWindow } = require('electron');
const path = require('path');
const server = require('../server'); // Importa tu servidor Express

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Opcional, agrega un ícono
  });

  // Carga la aplicación web desde el servidor local
  mainWindow.loadURL('http://localhost:3000');

  // Abre las herramientas de desarrollo (opcional, quítalo en producción)
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});