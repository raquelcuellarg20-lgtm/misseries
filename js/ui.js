class UIManager {
    static async renderizarSeries(categoria) {
        const container = document.getElementById('series-container');
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem;"><div class="spinner-border text-primary" role="status"></div></div>';
        
        // Obtener series filtradas por categoría
        let series = await SeriesManager.obtenerSeries(categoria);
        
        // Filtrar nuevamente para asegurar que solo se muestren las de la categoría correcta
        series = series.filter(s => s.categoria === categoria);
        
        if (categoria === 'pendiente_estreno') {
            series = SeriesManager.ordenarPendientesEstreno(series);
        }
        
        container.innerHTML = '';
        
        if (series.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 0;">
                    <i class="fas fa-tv fa-4x mb-3" style="color: var(--text-secondary)"></i>
                    <h4 style="color: var(--text-secondary)">No hay series en esta categoría</h4>
                    <button class="btn btn-primary mt-3" onclick="abrirModalAgregar()">
                        <i class="fas fa-plus me-1"></i> Agregar Serie
                    </button>
                </div>
            `;
            return;
        }
        
        for (const serie of series) {
            const tarjeta = await this.crearTarjetaSerie(serie);
            container.appendChild(tarjeta);
        }
    }

    static crearTarjetaSerie(serie) {
        return new Promise((resolve) => {
            const col = document.createElement('div');
            
            const portadaData = ImageManager.obtenerPortada(serie.portada, serie.titulo);
            const portada = portadaData.url;
            
            const fechaEstreno = serie.fecha_estreno ? 
                ChecklistManager.formatearFecha(serie.fecha_estreno) : '';
            
            let infoExtra = '';
            let proximoCapituloHTML = '';
            
            switch(serie.categoria) {
                case 'en_emision':
                    const capitulos = serie.capitulos_checklist || [];
                    const capitulosVistos = capitulos.filter(c => c.visto).length;
                    const totalCaps = serie.total_capitulos || capitulos.length || 0;
                    
                    const proximoCapitulo = ChecklistManager.obtenerProximoCapitulo(capitulos);
                    
                    if (proximoCapitulo) {
                        proximoCapituloHTML = `
                            <div class="proximo-capitulo" onclick="verChecklist('${serie.id}')">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-play-circle me-2"></i>
                                    <div>
                                        <small style="opacity: 0.8;">Próximo:</small>
                                        <strong>Cap. ${proximoCapitulo.numero}</strong>
                                        ${proximoCapitulo.visto ? '<i class="fas fa-check-circle text-success ms-1"></i>' : ''}
                                        <br>
                                        <small>📅 ${ChecklistManager.formatearFecha(proximoCapitulo.fecha)}</small>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else if (capitulos.length > 0 && capitulosVistos === capitulos.length) {
                        proximoCapituloHTML = `
                            <div class="proximo-capitulo" style="background: rgba(39, 174, 96, 0.2); border-color: rgba(39, 174, 96, 0.3);">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-check-circle text-success me-2"></i>
                                    <div>
                                        <small style="opacity: 0.8;">¡Completado!</small>
                                        <br>
                                        <small>${capitulosVistos}/${totalCaps} capítulos vistos</small>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                    
                    infoExtra = `
                        <p class="mb-1">
                            <small style="opacity: 0.9;">📺 ${capitulosVistos}/${totalCaps} capítulos</small>
                        </p>
                        <div class="progress mb-2" style="height: 3px; background: rgba(255,255,255,0.2);">
                            <div class="progress-bar bg-success" style="width: ${totalCaps > 0 ? (capitulosVistos / totalCaps) * 100 : 0}%"></div>
                        </div>
                        ${proximoCapituloHTML}
                    `;
                    break;
                    
                case 'vistas':
                    infoExtra = `
                        <div class="text-warning mb-1">
                            ${this.generarEstrellas(serie.calificacion || 0)}
                        </div>
                        ${!serie.calificacion ? '<small style="opacity: 0.7;">Sin calificar</small>' : ''}
                    `;
                    break;
                    
                case 'a_medias':
                    const progreso = this.calcularProgreso(serie);
                    infoExtra = `
                        <div class="mt-1">
                            <div class="d-flex justify-content-between">
                                <small style="opacity: 0.8;">Progreso</small>
                                <small style="opacity: 0.8;">${progreso}%</small>
                            </div>
                            <div class="progress" style="height: 4px; background: rgba(255,255,255,0.2);">
                                <div class="progress-bar bg-info" style="width: ${progreso}%"></div>
                            </div>
                        </div>
                    `;
                    break;
            }
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = portada;
            
            img.onload = async () => {
                const colorPredominante = await ImageManager.obtenerColorPredominante(img);
                const { r, g, b } = colorPredominante;
                const textoContraste = ImageManager.obtenerContraste(r, g, b);
                
                col.innerHTML = this.generarHTMLTarjeta(serie, portada, fechaEstreno, infoExtra, r, g, b, textoContraste);
                resolve(col);
            };
            
            img.onerror = () => {
                col.innerHTML = this.generarHTMLTarjeta(serie, portada, fechaEstreno, infoExtra, 102, 126, 234, '#ffffff');
                resolve(col);
            };
            
            setTimeout(() => {
                if (!col.innerHTML) {
                    col.innerHTML = this.generarHTMLTarjeta(serie, portada, fechaEstreno, infoExtra, 102, 126, 234, '#ffffff');
                    resolve(col);
                }
            }, 3000);
        });
    }

    static generarHTMLTarjeta(serie, portada, fechaEstreno, infoExtra, r, g, b, textoContraste) {
        const bgColor = `rgb(${r}, ${g}, ${b})`;
        
        return `
            <div class="serie-card" style="background-color: ${bgColor};" onclick="verDetalleSerie('${serie.id}')">
                <div class="imagen-container">
                    <img src="${portada}" alt="${serie.titulo}" style="width: 100%; height: auto; display: block;">
                </div>
                <div class="info-overlay" style="color: ${textoContraste};">
                    <h5 class="card-title" style="color: ${textoContraste}; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                        ${serie.titulo}
                    </h5>
                    ${fechaEstreno ? `<p class="mb-1"><small style="color: ${textoContraste}; opacity: 0.9;">📅 ${fechaEstreno}</small></p>` : ''}
                    <div style="color: ${textoContraste}; opacity: 0.95;">
                        ${infoExtra}
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <span class="badge" style="background-color: ${textoContraste === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; color: ${textoContraste}; font-size: 0.75rem;">
                            ${this.formatearCategoria(serie.categoria)}
                        </span>
                        <div class="dropdown" onclick="event.stopPropagation()">
                            <button class="btn btn-sm" style="color: ${textoContraste};" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-dark">
                                <li><a class="dropdown-item" href="#" onclick="editarSerie('${serie.id}')">
                                    <i class="fas fa-edit me-2"></i>Editar</a></li>
                                ${serie.categoria === 'en_emision' ? 
                                    `<li><a class="dropdown-item" href="#" onclick="verChecklist('${serie.id}')">
                                        <i class="fas fa-list-check me-2"></i>Ver Checklist</a></li>` : ''}
                                ${serie.categoria === 'vistas' && !serie.calificacion ? 
                                    `<li><a class="dropdown-item" href="#" onclick="calificarSerie('${serie.id}')">
                                        <i class="fas fa-star me-2"></i>Calificar</a></li>` : ''}
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="eliminarSerie('${serie.id}')">
                                    <i class="fas fa-trash me-2"></i>Eliminar</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static generarEstrellas(calificacion) {
        if (!calificacion || calificacion === 0) {
            return '<small style="opacity: 0.5;">⭐ Sin calificar</small>';
        }
        
        let estrellas = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= calificacion) {
                estrellas += '<i class="fas fa-star"></i>';
            } else if (i - 0.5 === calificacion) {
                estrellas += '<i class="fas fa-star-half-alt"></i>';
            } else {
                estrellas += '<i class="far fa-star"></i>';
            }
        }
        return estrellas;
    }

    static formatearCategoria(categoria) {
        const categorias = {
            'pendiente_estreno': 'Próximo estreno',
            'en_emision': 'En emisión',
            'a_medias': 'A medias',
            'pendientes': 'Pendiente',
            'vistas': 'Vista'
        };
        return categorias[categoria] || categoria;
    }

    static async mostrarChecklist(serieId) {
        try {
            const doc = await seriesRef.doc(serieId).get();
            if (!doc.exists) return;
            
            const serie = { id: doc.id, ...doc.data() };
            const capitulos = ChecklistManager.normalizarCapitulos(serie.capitulos_checklist);
            
            const checklistBody = document.getElementById('checklistBody');
            
            if (!capitulos || capitulos.length === 0) {
                checklistBody.innerHTML = '<p class="text-center py-3">No hay checklist disponible para esta serie.</p>';
            } else {
                const vistos = capitulos.filter(c => c.visto).length;
                const total = capitulos.length;
                
                checklistBody.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">${serie.titulo}</h6>
                        <small>${vistos}/${total} vistos</small>
                    </div>
                    <div class="progress mb-3" style="height: 6px; background: rgba(255,255,255,0.1);">
                        <div class="progress-bar bg-success" style="width: ${(vistos / total) * 100}%"></div>
                    </div>
                    <div id="listaCapitulos">
                        ${capitulos.map(cap => `
                            <div class="capitulo-item ${cap.visto ? 'completado' : ''}">
                                <input type="checkbox" 
                                       ${cap.visto ? 'checked' : ''} 
                                       onchange="UIManager.toggleChecklist('${serieId}', ${cap.numero}, this.checked)">
                                <span class="capitulo-texto">
                                    Capítulo ${cap.numero} - ${ChecklistManager.formatearFecha(cap.fecha)}
                                </span>
                                ${cap.visto ? '<i class="fas fa-check-circle text-success ms-auto"></i>' : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            const modal = new bootstrap.Modal(document.getElementById('modalChecklist'));
            modal.show();
        } catch (error) {
            console.error('Error al mostrar checklist:', error);
        }
    }

    static async toggleChecklist(serieId, numeroCapitulo, visto) {
        const resultado = await ChecklistManager.toggleCapitulo(serieId, numeroCapitulo, visto);
        
        if (resultado) {
            // Recargar el checklist
            setTimeout(async () => {
                await this.mostrarChecklist(serieId);
            }, 300);
        }
    }

    static calcularProgreso(serie) {
        const capitulos = serie.capitulos_checklist || [];
        if (capitulos.length === 0) return 0;
        const vistos = capitulos.filter(c => c.visto).length;
        return Math.round((vistos / capitulos.length) * 100);
    }
}

console.log('✅ UIManager cargado');
