document.addEventListener("DOMContentLoaded", () => {
  // Configuración
  // Forzamos la URL de API al servidor local (asegura que funcione aunque se abra desde file://)
  const API_BASE_URL = "http://10.68.141.12:3000/api";

  // Elementos del DOM
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("togglePassword");
  const loginButton = document.querySelector(".btn-login");
  const errorMessage = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");

  // Verificar si ya está autenticado
  const token = localStorage.getItem("authToken");
  if (token) {
    // Verificar si el token es válido
    verifyToken(token);
  }

  // Toggle password visibility
  togglePassword.addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    togglePassword.innerHTML = type === "password"
      ? '<i class="fas fa-eye"></i>'
      : '<i class="fas fa-eye-slash"></i>';
  });

  // Manejar envío del formulario
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError("Por favor, completa todos los campos.");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("Por favor, ingresa un correo electrónico válido.");
      return;
    }

    // Mostrar loading
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const raw = await response.text();
      console.log("Login response status:", response.status, "raw:", raw);
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        console.error("La respuesta no es JSON válido", e);
        showError("Respuesta inesperada del servidor. Revisa la consola.");
        return;
      }

      if (response.ok) {
        // Login exitoso
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Redirigir al dashboard
        console.log("Redirigiendo al dashboard...");
        window.location.assign("/dashboard");
      } else {
        // Error de autenticación
        showError(data.message || "Credenciales incorrectas.");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      showError("Error de conexión. Por favor, verifica tu conexión a internet.");
    } finally {
      setLoading(false);
    }
  });

  // Función para verificar token
  async function verifyToken(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/verify`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      console.log("verify status", response.status);
      if (response.ok) {
        // Token válido, redirigir al dashboard
        console.log("Token verificado, redirigiendo al dashboard");
        window.location.assign("/dashboard");
      } else {
        // Token inválido, limpiar localStorage
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error("Error verificando token:", error);
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    }
  }

  // Función para mostrar errores
  function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove("hidden");

    // Ocultar error después de 5 segundos
    setTimeout(() => {
      errorMessage.classList.add("hidden");
    }, 5000);
  }

  // Función para mostrar/ocultar loading
  function setLoading(loading) {
    loginButton.disabled = loading;
    loginButton.innerHTML = loading
      ? '<span class="loading">Iniciando Sesión...</span>'
      : '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';

    // Deshabilitar inputs durante loading
    emailInput.disabled = loading;
    passwordInput.disabled = loading;
  }

  // Limpiar errores cuando el usuario empiece a escribir
  emailInput.addEventListener("input", () => {
    if (!errorMessage.classList.contains("hidden")) {
      errorMessage.classList.add("hidden");
    }
  });

  passwordInput.addEventListener("input", () => {
    if (!errorMessage.classList.contains("hidden")) {
      errorMessage.classList.add("hidden");
    }
  });

  // Manejar tecla Enter
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !loginButton.disabled) {
      loginForm.dispatchEvent(new Event("submit"));
    }
  });
});