// ============================================================
// APP.JS - Lógica principal (compartido entre todas las vistas)
// La variable CATEGORIA_ACTUAL se define en cada página HTML
// ============================================================

let modalSerie;
let modalChecklist;

document.addEventListener('DOMContentLoaded', async () => {
    modalSerie    = new bootstrap.Modal(document.getElementById('modalSerie'));
    modalChecklist = new bootstrap.Modal(document.getElementById('modalChecklist'));

    // Cerrar modal checklist → re-renderizar forzado
    document.getElementById('modalChecklist').addEventListener('hidden.bs.modal', () => {
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        UIManager.renderizarSeries(CATEGORIA_ACTUAL, true);
    });

    // El modal serie NO re-renderiza aquí: lo hace guardarSerie() directamente
    // para evitar doble render que causa duplicados

    inicializarEventos();
    UIManager.renderizarSeries(CATEGORIA_ACTUAL);

    // Inicializar notificaciones
    await NotificationManager.init();
});

function inicializarEventos() {
    document.getElementById('formSerie').addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarSerie();
    });

    document.getElementById('categoria').addEventListener('change', (e) => {
        actualizarCamposExtras(e.target.value);
    });
}

function abrirModalAgregar() {
    document.getElementById('modalTitulo').textContent = 'Nueva Serie';
    document.getElementById('formSerie').reset();
    document.getElementById('serieId').value = '';
    document.getElementById('categoria').value = CATEGORIA_ACTUAL;
    actualizarCamposExtras(CATEGORIA_ACTUAL);
    modalSerie.show();
}

async function editarSerie(id) {
    try {
        const doc = await seriesRef.doc(id).get();
        if (doc.exists) {
            const serie = doc.data();
            document.getElementById('modalTitulo').textContent = 'Editar Serie';
            document.getElementById('serieId').value = id;
            document.getElementById('titulo').value = serie.titulo || '';
            document.getElementById('categoria').value = serie.categoria || '';
            document.getElementById('portada').value = serie.portada || '';
            actualizarCamposExtras(serie.categoria, serie);
            modalSerie.show();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar la serie');
    }
}

function actualizarCamposExtras(categoria, datos = {}) {
    const camposExtras = document.getElementById('camposExtras');
    switch (categoria) {
        case 'pendiente_estreno':
            camposExtras.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">Fecha de Estreno (Opcional)</label>
                    <input type="date" class="form-control bg-dark text-white" id="fechaEstreno"
                           value="${datos.fecha_estreno ? datos.fecha_estreno.split('T')[0] : ''}">
                </div>`;
            break;
        case 'en_emision':
            camposExtras.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">Fecha de Estreno *</label>
                    <input type="date" class="form-control bg-dark text-white" id="fechaEstreno" required
                           value="${datos.fecha_estreno ? datos.fecha_estreno.split('T')[0] : ''}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Total de Capítulos *</label>
                    <input type="number" class="form-control bg-dark text-white" id="totalCapitulos"
                           min="1" required value="${datos.total_capitulos || ''}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Días de Emisión *</label>
                    <div class="dias-emision" id="diasEmision">
                        ${['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].map(dia => `
                            <span class="dia-badge ${datos.dias_emision && datos.dias_emision.includes(dia) ? 'seleccionado' : ''}"
                                  data-dia="${dia}">${dia.charAt(0).toUpperCase() + dia.slice(1)}</span>
                        `).join('')}
                    </div>
                </div>`;
            document.querySelectorAll('.dia-badge').forEach(badge => {
                badge.addEventListener('click', () => badge.classList.toggle('seleccionado'));
            });
            break;
        case 'vistas':
            camposExtras.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">Calificación</label>
                    <div class="rating">
                        ${[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map(valor => `
                            <input type="radio" name="calificacion" value="${valor}"
                                   id="star${valor}" ${datos.calificacion === valor ? 'checked' : ''}>
                            <label for="star${valor}">★</label>
                        `).join('')}
                    </div>
                </div>`;
            break;
        default:
            camposExtras.innerHTML = '';
    }
}

async function guardarSerie() {
    const id        = document.getElementById('serieId').value;
    const titulo    = document.getElementById('titulo').value;
    const categoria = document.getElementById('categoria').value;
    const portada   = document.getElementById('portada').value;

    if (!titulo) { alert('El título es obligatorio'); return; }

    const datos = { titulo, categoria, portada };

    switch (categoria) {
        case 'pendiente_estreno':
            const fechaPE = document.getElementById('fechaEstreno')?.value;
            if (fechaPE) datos.fecha_estreno = fechaPE;
            break;
        case 'en_emision':
            datos.fecha_estreno    = document.getElementById('fechaEstreno').value;
            datos.total_capitulos  = parseInt(document.getElementById('totalCapitulos').value);
            datos.dias_emision     = Array.from(document.querySelectorAll('.dia-badge.seleccionado')).map(b => b.dataset.dia);
            if (!datos.fecha_estreno || !datos.total_capitulos || datos.dias_emision.length === 0) {
                alert('Todos los campos son obligatorios'); return;
            }
            break;
        case 'vistas':
            const cal = document.querySelector('input[name="calificacion"]:checked');
            if (cal) datos.calificacion = parseFloat(cal.value);
            break;
    }

    try {
        let serieId = id;
        if (id) {
            await SeriesManager.actualizarSerie(id, datos);
        } else {
            const resultado = await SeriesManager.agregarSerie(datos);
            serieId = resultado?.id;
        }

        // Reprogramar notificaciones para esta serie
        if (serieId) await NotificationManager.reprogramarSerie(serieId);

        modalSerie.hide();
        // forzar=true para invalidar caché y mostrar cambios inmediatamente
        UIManager.renderizarSeries(CATEGORIA_ACTUAL, true);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar');
    }
}

function verChecklist(id)   { UIManager.mostrarChecklist(id); }

async function calificarSerie(id) {
    await editarSerie(id);
    document.getElementById('categoria').value = 'vistas';
    actualizarCamposExtras('vistas');
}

async function eliminarSerie(id) {
    if (confirm('¿Eliminar esta serie?')) {
        try {
            await SeriesManager.eliminarSerie(id);
            // forzar=true para invalidar caché
            UIManager.renderizarSeries(CATEGORIA_ACTUAL, true);
        } catch (error) { alert('Error al eliminar'); }
    }
}

function verDetalleSerie(id) {}

console.log('✅ App cargada — categoría:', typeof CATEGORIA_ACTUAL !== 'undefined' ? CATEGORIA_ACTUAL : 'no definida');
