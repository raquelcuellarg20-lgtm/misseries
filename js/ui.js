class UIManager {
    // Renderizar series en el contenedor
    static async renderizarSeries(categoria) {
        const container = document.getElementById('series-container');
        container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"></div></div>';
        
        let series = await SeriesManager.obtenerSeries(categoria);
        
        // Ordenamiento especial para Pendientes de Estreno
        if (categoria === 'pendiente_estreno') {
            series = SeriesManager.ordenarPendientesEstreno(series);
        }
        
        container.innerHTML = '';
        
        if (series.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-tv fa-4x mb-3" style="color: var(--text-secondary)"></i>
                    <h4 style="color: var(--text-secondary)">No hay series en esta categoría</h4>
                    <button class="btn btn-primary mt-3" onclick="abrirModalAgregar()">
                        <i class="fas fa-plus me-1"></i> Agregar Serie
                    </button>
                </div>
            `;
            return;
        }
        
        series.forEach(serie => {
            container.appendChild(this.crearTarjetaSerie(serie));
        });
    }

    // Crear tarjeta de serie
    static crearTarjetaSerie(serie) {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-lg-3 mb-4';
        
        const portada = serie.portada || 'assets/images/placeholder.jpg';
        const fechaEstreno = serie.fecha_estreno ? 
            new Date(serie.fecha_estreno).toLocaleDateString('es-ES') : '';
        
        let infoExtra = '';
        
        switch(serie.categoria) {
            case 'en_emision':
                infoExtra = `
                    <p class="card-text">
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i> Capítulos: ${serie.total_capitulos || 'N/A'}
                        </small>
                    </p>
                `;
                break;
            case 'vistas':
                infoExtra = `
                    <p class="card-text">
                        <div class="text-warning">
                            ${this.generarEstrellas(serie.calificacion || 0)}
                        </div>
                    </p>
                `;
                break;
            case 'a_medias':
                infoExtra = `
                    <div class="progress mt-2" style="height: 5px;">
                        <div class="progress-bar" style="width: ${this.calcularProgreso(serie)}%"></div>
                    </div>
                `;
                break;
        }
        
        col.innerHTML = `
            <div class="serie-card" onclick="verDetalleSerie('${serie.id}')">
                <img src="${portada}" class="card-img-top" alt="${serie.titulo}">
                <div class="card-body">
                    <h5 class="card-title">${serie.titulo}</h5>
                    ${fechaEstreno ? `<p class="card-text"><small>📅 ${fechaEstreno}</small></p>` : ''}
                    ${infoExtra}
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <span class="badge bg-primary">${this.formatearCategoria(serie.categoria)}</span>
                        <div class="dropdown" onclick="event.stopPropagation()">
                            <button class="btn btn-sm btn-outline-light" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-dark">
                                <li><a class="dropdown-item" href="#" onclick="editarSerie('${serie.id}')">Editar</a></li>
                                ${serie.categoria === 'en_emision' ? 
                                    `<li><a class="dropdown-item" href="#" onclick="verChecklist('${serie.id}')">Ver Checklist</a></li>` : ''}
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="eliminarSerie('${serie.id}')">Eliminar</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return col;
    }

    // Generar estrellas HTML
    static generarEstrellas(calificacion) {
        let estrellas = '';
        for (let i = 0.5; i <= 5; i += 0.5) {
            if (i <= calificacion) {
                estrellas += '<i class="fas fa-star"></i>';
            } else if (i - 0.5 < calificacion) {
                estrellas += '<i class="fas fa-star-half-alt"></i>';
            } else {
                estrellas += '<i class="far fa-star"></i>';
            }
        }
        return estrellas;
    }

    // Formatear nombre de categoría
    static formatearCategoria(categoria) {
        const categorias = {
            'pendiente_estreno': 'Pendiente Estreno',
            'en_emision': 'En Emisión',
            'a_medias': 'A Medias',
            'pendientes': 'Pendiente',
            'vistas': 'Vista'
        };
        return categorias[categoria] || categoria;
    }

    // Mostrar checklist en modal
    static async mostrarChecklist(serieId) {
        const doc = await seriesRef.doc(serieId).get();
        const serie = { id: doc.id, ...doc.data() };
        const checklistBody = document.getElementById('checklistBody');
        
        checklistBody.innerHTML = `
            <h6>${serie.titulo}</h6>
            <div id="listaCapitulos">
                ${serie.capitulos_checklist ? serie.capitulos_checklist.map(cap => `
                    <div class="capitulo-item ${cap.visto ? 'completado' : ''}">
                        <input type="checkbox" 
                               ${cap.visto ? 'checked' : ''} 
                               onchange="UIManager.toggleChecklist('${serieId}', ${cap.numero}, this.checked)">
                        <span class="capitulo-texto">
                            Capítulo ${cap.numero} - ${ChecklistManager.formatearFecha(cap.fecha)}
                        </span>
                    </div>
                `).join('') : '<p>No hay checklist disponible</p>'}
            </div>
        `;
        
        new bootstrap.Modal(document.getElementById('modalChecklist')).show();
    }

    // Toggle capítulo en checklist
    static async toggleChecklist(serieId, numeroCapitulo, visto) {
        await ChecklistManager.toggleCapitulo(serieId, numeroCapitulo, visto);
    }

    // Calcular progreso (para series a medias)
    static calcularProgreso(serie) {
        if (serie.capitulos_checklist && serie.total_capitulos) {
            const vistos = serie.capitulos_checklist.filter(c => c.visto).length;
            return (vistos / serie.total_capitulos) * 100;
        }
        return 0;
    }
}
