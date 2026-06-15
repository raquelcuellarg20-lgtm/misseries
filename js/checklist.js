class ChecklistManager {
    // Generar fechas de capítulos basado en fecha de estreno y días de emisión
    static generarFechasCapitulos(fechaEstreno, diasEmision, totalCapitulos) {
        const fechas = [];
        
        // Crear fecha base sin problemas de zona horaria
        const partes = fechaEstreno.split('T')[0].split('-');
        const fechaBase = new Date(
            parseInt(partes[0]), 
            parseInt(partes[1]) - 1, 
            parseInt(partes[2]), 
            12, 0, 0
        );
        
        let capitulosGenerados = 0;
        let diasBusqueda = 0;
        const maxDiasBusqueda = totalCapitulos * 14;

        while (capitulosGenerados < totalCapitulos && diasBusqueda < maxDiasBusqueda) {
            const fechaActual = new Date(fechaBase);
            fechaActual.setDate(fechaBase.getDate() + diasBusqueda);
            
            const diaSemana = this.obtenerNombreDia(fechaActual.getDay());
            
            if (diasEmision.includes(diaSemana)) {
                capitulosGenerados++;
                // Guardar fecha en formato ISO sin hora para evitar desfases
                const fechaCapitulo = new Date(
                    fechaActual.getFullYear(),
                    fechaActual.getMonth(),
                    fechaActual.getDate(),
                    12, 0, 0
                );
                fechas.push({
                    numero: capitulosGenerados,
                    fecha: fechaCapitulo.toISOString(),
                    visto: false
                });
            }
            
            diasBusqueda++;
        }

        return fechas;
    }

    // Obtener nombre del día en español
    static obtenerNombreDia(diaNumero) {
        const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        return dias[diaNumero];
    }

    // Formatear fecha para mostrar
    static formatearFecha(fecha) {
        if (!fecha) return 'Fecha no disponible';
        
        try {
            // Si la fecha es un timestamp de Firestore
            if (fecha.toDate && typeof fecha.toDate === 'function') {
                fecha = fecha.toDate().toISOString();
            }
            
            const partes = fecha.split('T')[0].split('-');
            if (partes.length !== 3) return 'Fecha no disponible';
            
            const año = parseInt(partes[0]);
            const mes = parseInt(partes[1]) - 1;
            const dia = parseInt(partes[2]);
            
            const fechaObj = new Date(año, mes, dia, 12, 0, 0);
            
            if (isNaN(fechaObj.getTime())) return 'Fecha no disponible';
            
            return fechaObj.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Error formateando fecha:', fecha, error);
            return 'Fecha no disponible';
        }
    }

    // Actualizar estado de capítulo
    static async toggleCapitulo(serieId, numeroCapitulo, visto) {
        try {
            const doc = await seriesRef.doc(serieId).get();
            if (doc.exists) {
                const data = doc.data();
                let capitulos = data.capitulos_checklist || [];
                
                // Normalizar capitulos si vienen como string
                if (typeof capitulos === 'string') {
                    try {
                        capitulos = JSON.parse(capitulos);
                    } catch (e) {
                        capitulos = [];
                    }
                }
                
                const index = capitulos.findIndex(c => c.numero === numeroCapitulo);
                
                if (index !== -1) {
                    capitulos[index].visto = visto;
                    
                    await seriesRef.doc(serieId).update({
                        capitulos_checklist: capitulos,
                        ultima_actualizacion: new Date().toISOString()
                    });
                    
                    // Verificar si todos los capítulos están vistos para mover a Vistas
                    if (AUTOMATIZACION.emisionAVistas && this.todosVistos(capitulos)) {
                        await SeriesManager.moverCategoria(serieId, 'vistas');
                    }
                    
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error al actualizar capítulo:', error);
            return false;
        }
    }

    // Obtener próximo capítulo no visto
    static obtenerProximoCapitulo(capitulos) {
        if (!capitulos || capitulos.length === 0) return null;
        
        // Normalizar
        const capsNormalizados = this.normalizarCapitulos(capitulos);
        
        const noVistos = capsNormalizados.filter(c => !c.visto);
        if (noVistos.length === 0) return null;
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        let proximo = null;
        let menorDiferencia = Infinity;
        
        for (const cap of noVistos) {
            try {
                const partes = cap.fecha.split('T')[0].split('-');
                const fechaCap = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
                fechaCap.setHours(0, 0, 0, 0);
                
                const diferencia = fechaCap - hoy;
                
                // Priorizar capítulos futuros o de hoy
                if (diferencia >= 0 && diferencia < menorDiferencia) {
                    menorDiferencia = diferencia;
                    proximo = cap;
                }
            } catch (e) {
                continue;
            }
        }
        
        // Si no hay futuros, devolver el primer no visto
        if (!proximo) {
            proximo = noVistos[0];
        }
        
        return proximo;
    }

    // Verificar si todos los capítulos están vistos
    static todosVistos(capitulos) {
        if (!capitulos || capitulos.length === 0) return false;
        const caps = this.normalizarCapitulos(capitulos);
        return caps.every(c => c.visto);
    }

    // Normalizar fechas en capitulos
    static normalizarCapitulos(capitulos) {
        if (!capitulos) return [];
        if (typeof capitulos === 'string') {
            try {
                capitulos = JSON.parse(capitulos);
            } catch (e) {
                return [];
            }
        }
        
        return capitulos.map(cap => ({
            numero: cap.numero,
            fecha: cap.fecha || new Date().toISOString(),
            visto: cap.visto || false
        }));
    }
}

console.log('✅ ChecklistManager cargado');
