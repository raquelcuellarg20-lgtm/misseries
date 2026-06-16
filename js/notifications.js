// ============================================================
// NOTIFICATIONS.JS - Calendario interno con notificaciones
// ============================================================

const NotificationManager = {
    recordatorios: [],
    intervaloRevisión: null,
    permisoConcedido: false,

    // Inicializar
    async init() {
        if (!('Notification' in window)) {
            console.warn('❌ Notificaciones no soportadas');
            return false;
        }

        // Pedir permiso
        if (Notification.permission === 'granted') {
            this.permisoConcedido = true;
        } else if (Notification.permission !== 'denied') {
            const permiso = await Notification.requestPermission();
            this.permisoConcedido = permiso === 'granted';
        }

        if (this.permisoConcedido) {
            console.log('🔔 Notificaciones activadas');
            await this.cargarRecordatorios();
            this.iniciarRevisión();
        } else {
            console.warn('⚠️ Permiso de notificaciones denegado');
        }

        return this.permisoConcedido;
    },

    // Cargar todos los recordatorios desde Firestore
    async cargarRecordatorios() {
        try {
            const snapshot = await seriesRef.get();
            this.recordatorios = [];

            snapshot.forEach(doc => {
                const serie = { id: doc.id, ...doc.data() };
                
                // Fecha de estreno
                if ((serie.categoria === 'pendiente_estreno' || serie.categoria === 'en_emision') && serie.fecha_estreno) {
                    this.recordatorios.push({
                        id: `estreno-${serie.id}`,
                        titulo: `🎬 ¡Estrena hoy! ${serie.titulo}`,
                        cuerpo: `${serie.titulo} se estrena hoy. ¡A disfrutar!`,
                        fecha: this.parsearFecha(serie.fecha_estreno),
                        url: 'pendiente_estreno.html',
                        notificado: false
                    });

                    // Un día antes
                    const unDiaAntes = this.parsearFecha(serie.fecha_estreno);
                    if (unDiaAntes) {
                        unDiaAntes.setDate(unDiaAntes.getDate() - 1);
                        this.recordatorios.push({
                            id: `pre-estreno-${serie.id}`,
                            titulo: `📅 Mañana estrena: ${serie.titulo}`,
                            cuerpo: `¡Prepárate! ${serie.titulo} se estrena mañana.`,
                            fecha: new Date(unDiaAntes),
                            url: 'pendiente_estreno.html',
                            notificado: false
                        });
                    }
                }

                // Capítulos de series en emisión
                if (serie.categoria === 'en_emision' && serie.capitulos_checklist) {
                    let capitulos = serie.capitulos_checklist;
                    if (typeof capitulos === 'string') {
                        try { capitulos = JSON.parse(capitulos); } catch (e) { return; }
                    }

                    capitulos.filter(c => !c.visto).forEach(cap => {
                        const fechaCap = this.parsearFecha(cap.fecha);
                        if (fechaCap) {
                            this.recordatorios.push({
                                id: `cap-${serie.id}-${cap.numero}`,
                                titulo: `📺 Nuevo capítulo: ${serie.titulo}`,
                                cuerpo: `Capítulo ${cap.numero} de ${serie.titulo} disponible hoy.`,
                                fecha: fechaCap,
                                url: 'en_emision.html',
                                notificado: false
                            });
                        }
                    });
                }
            });

            console.log(`📅 ${this.recordatorios.length} recordatorios cargados`);
        } catch (err) {
            console.error('Error al cargar recordatorios:', err);
        }
    },

    // Iniciar revisión cada 30 segundos
    iniciarRevisión() {
        if (this.intervaloRevisión) clearInterval(this.intervaloRevisión);
        
        this.intervaloRevisión = setInterval(() => {
            this.verificarRecordatorios();
        }, 30000); // Cada 30 segundos

        // Primera verificación inmediata
        this.verificarRecordatorios();
    },

    // Verificar si hay recordatorios para AHORA
    verificarRecordatorios() {
        if (!this.permisoConcedido) return;

        const ahora = new Date();
        const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        const horaActual = ahora.getHours();
        const minutosActual = ahora.getMinutes();

        this.recordatorios.forEach(recordatorio => {
            if (recordatorio.notificado) return;

            const fechaRec = recordatorio.fecha;
            if (!fechaRec) return;

            const fechaRecDate = new Date(fechaRec.getFullYear(), fechaRec.getMonth(), fechaRec.getDate());

            // ¿Es hoy?
            if (fechaRecDate.getTime() === hoy.getTime()) {
                // Notificar a las 7:00 AM (o después si abrió tarde)
                if (horaActual >= 7 && minutosActual >= 0) {
                    this.mostrarNotificación(recordatorio);
                    recordatorio.notificado = true;
                }
            }
        });
    },

    // Mostrar notificación del navegador
    mostrarNotificación(recordatorio) {
        if (!this.permisoConcedido) return;

        const opciones = {
            body: recordatorio.cuerpo,
            icon: '/misseries/favicon.png',
            badge: '/misseries/favicon.png',
            tag: recordatorio.id,
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            data: { url: recordatorio.url }
        };

        const notificacion = new Notification(recordatorio.titulo, opciones);

        notificacion.onclick = () => {
            window.focus();
            if (recordatorio.url) {
                window.location.href = recordatorio.url;
            }
            notificacion.close();
        };

        // Auto-cerrar después de 30 segundos
        setTimeout(() => notificacion.close(), 30000);
    },

    // Reprogramar después de agregar/editar
    async reprogramarTodo() {
        await this.cargarRecordatorios();
    },

    // Parsear fecha
    parsearFecha(fechaStr) {
        if (!fechaStr) return null;
        try {
            if (fechaStr.toDate) fechaStr = fechaStr.toDate().toISOString();
            const str = typeof fechaStr === 'string' ? fechaStr.split('T')[0] : null;
            if (!str) return null;
            const [y, m, d] = str.split('-').map(Number);
            return new Date(y, m - 1, d, 7, 0, 0); // 7:00 AM
        } catch (e) {
            return null;
        }
    }
};

console.log('🔔 NotificationManager cargado');
