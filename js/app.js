// ============================================================
// APP.JS - Lógica principal
// ============================================================

let modalSerie;
let modalChecklist;

document.addEventListener('DOMContentLoaded', async () => {
    modalSerie = new bootstrap.Modal(document.getElementById('modalSerie'));
    modalChecklist = new bootstrap.Modal(document.getElementById('modalChecklist'));

    document.getElementById('modalChecklist').addEventListener('hidden.bs.modal', () => {
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        UIManager.renderizarSeries(CATEGORIA_ACTUAL, true);
    });

    inicializarEventos();
    UIManager.renderizarSeries(CATEGORIA_ACTUAL);

    // Inicializar Calendar
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
                </div>
                <div class="mb-3">
                    <button type="button" class="btn btn-sm btn-outline-info" onclick="toggleChecklistPersonalizado()" id="btnAgregarChecklist">
                        <i class="fas fa-list-check me-1"></i> Agregar checklist personalizado
                    </button>
                    <div id="checklistPersonalizadoContainer" style="display:none; margin-top:10px;">
                        <label class="form-label">Ítems del checklist (uno por línea)</label>
                        <div id="checklistItems">
                            ${datos.checklist_personalizado ? 
                                JSON.parse(datos.checklist_personalizado).map(item => `
                                    <div class="input-group mb-2">
                                        <input type="text" class="form-control bg-dark text-white checklist-item" value="${item.texto || ''}" placeholder="Nombre del ítem">
                                        <span class="input-group-text bg-dark text-white" style="border-color: rgba(255,255,255,0.15);">
                                            <input type="checkbox" class="form-check-input checklist-check" ${item.visto ? 'checked' : ''}>
                                        </span>
                                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                `).join('')
                            : `
                                <div class="input-group mb-2">
                                    <input type="text" class="form-control bg-dark text-white checklist-item" placeholder="Nombre del ítem">
                                    <span class="input-group-text bg-dark text-white" style="border-color: rgba(255,255,255,0.15);">
                                        <input type="checkbox" class="form-check-input checklist-check">
                                    </span>
                                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            `}
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-secondary mt-1" onclick="agregarItemChecklist()">
                            <i class="fas fa-plus me-1"></i> Agregar ítem
                        </button>
                    </div>
                </div>`;
            break;
        case 'a_medias':
            camposExtras.innerHTML = `
                <div class="mb-3">
                    <button type="button" class="btn btn-sm btn-outline-info" onclick="toggleChecklistPersonalizado()" id="btnAgregarChecklist">
                        <i class="fas fa-list-check me-1"></i> Agregar checklist personalizado
                    </button>
                    <div id="checklistPersonalizadoContainer" style="display:none; margin-top:10px;">
                        <label class="form-label">Ítems del checklist (uno por línea)</label>
                        <div id="checklistItems">
                            ${datos.checklist_personalizado ? 
                                JSON.parse(datos.checklist_personalizado).map(item => `
                                    <div class="input-group mb-2">
                                        <input type="text" class="form-control bg-dark text-white checklist-item" value="${item.texto || ''}" placeholder="Nombre del ítem">
                                        <span class="input-group-text bg-dark text-white" style="border-color: rgba(255,255,255,0.15);">
                                            <input type="checkbox" class="form-check-input checklist-check" ${item.visto ? 'checked' : ''}>
                                        </span>
                                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                `).join('')
                            : `
                                <div class="input-group mb-2">
                                    <input type="text" class="form-control bg-dark text-white checklist-item" placeholder="Nombre del ítem">
                                    <span class="input-group-text bg-dark text-white" style="border-color: rgba(255,255,255,0.15);">
                                        <input type="checkbox" class="form-check-input checklist-check">
                                    </span>
                                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            `}
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-secondary mt-1" onclick="agregarItemChecklist()">
                            <i class="fas fa-plus me-1"></i> Agregar ítem
                        </button>
                    </div>
                </div>`;
            break;
        default:
            camposExtras.innerHTML = '';
    }
}

async function guardarSerie() {
    const id = document.getElementById('serieId').value;
    const titulo = document.getElementById('titulo').value;
    const categoria = document.getElementById('categoria').value;
    const portada = document.getElementById('portada').value;

    if (!titulo) { alert('El título es obligatorio'); return; }

    const datos = { titulo, categoria, portada };

    switch (categoria) {
        case 'pendiente_estreno':
            const fechaPE = document.getElementById('fechaEstreno')?.value;
            if (fechaPE) datos.fecha_estreno = fechaPE;
            break;
        case 'en_emision':
            datos.fecha_estreno = document.getElementById('fechaEstreno').value;
            datos.total_capitulos = parseInt(document.getElementById('totalCapitulos').value);
            datos.dias_emision = Array.from(document.querySelectorAll('.dia-badge.seleccionado')).map(b => b.dataset.dia);
            if (!datos.fecha_estreno || !datos.total_capitulos || datos.dias_emision.length === 0) {
                alert('Todos los campos son obligatorios'); return;
            }
            break;
        case 'vistas':
            const cal = document.querySelector('input[name="calificacion"]:checked');
            if (cal) datos.calificacion = parseFloat(cal.value);
            const checklistV = document.getElementById('checklistPersonalizado')?.value;
            if (checklistV) datos.checklist_personalizado = checklistV;
            break;
        case 'a_medias':
            const checklistM = document.getElementById('checklistPersonalizado')?.value;
            if (checklistM) datos.checklist_personalizado = checklistM;
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

        if (serieId) await CalendarManager.reprogramarSerie(serieId);

        modalSerie.hide();
        UIManager.renderizarSeries(CATEGORIA_ACTUAL, true);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar');
    }
}

function verChecklist(id) { UIManager.mostrarChecklist(id); }

async function calificarSerie(id) {
    await editarSerie(id);
    document.getElementById('categoria').value = 'vistas';
    actualizarCamposExtras('vistas');
}

async function eliminarSerie(id) {
    if (confirm('¿Eliminar esta serie?')) {
        try {
            await SeriesManager.eliminarSerie(id);
            UIManager.renderizarSeries(CATEGORIA_ACTUAL, true);
        } catch (error) { alert('Error al eliminar'); }
    }
}

function verDetalleSerie(id) {}

console.log('✅ App cargada — categoría:', typeof CATEGORIA_ACTUAL !== 'undefined' ? CATEGORIA_ACTUAL : 'no definida');
