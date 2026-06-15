// ============================================================
// AUTH.JS - Protección de rutas y manejo de sesión
// ============================================================

(function () {
    // Si no está autenticado, redirigir al login
    if (sessionStorage.getItem('st_auth') !== 'true') {
        window.location.href = 'index.html';
    }
})();

function cerrarSesion() {
    sessionStorage.removeItem('st_auth');
    sessionStorage.removeItem('st_user');
    window.location.href = 'index.html';
}

console.log('✅ Auth cargado');
