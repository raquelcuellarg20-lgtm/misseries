// Gestor de Imágenes y Portadas
class ImageManager {
    // Detectar servicio de origen de la URL
    static detectarServicio(url) {
        if (!url) return null;
        
        for (const [key, service] of Object.entries(IMAGE_SERVICES)) {
            if (service.pattern.test(url)) {
                return { id: key, ...service };
            }
        }
        return { id: 'unknown', name: 'Desconocido', pattern: null, icon: 'fas fa-question' };
    }

    // Convertir URL a enlace directo según el servicio
    static convertirAEnlaceDirecto(url) {
        if (!url) return '';
        
        const servicio = this.detectarServicio(url);
        
        switch (servicio.id) {
            case 'drive':
                return this.convertirDriveUrl(url);
            
            case 'imgur':
                return this.convertirImgurUrl(url);
            
            case 'cloudinary':
                return url;
            
            case 'direct':
                return url;
            
            default:
                if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
                    return url;
                }
                return url;
        }
    }

    // Convertir URL de Google Drive
    static convertirDriveUrl(url) {
        let id = null;
        
        const matchFile = url.match(/\/file\/d\/([^\/]+)/);
        if (matchFile) id = matchFile[1];
        
        const matchOpen = url.match(/open\?id=([^&]+)/);
        if (matchOpen) id = matchOpen[1];
        
        const matchUc = url.match(/uc\?id=([^&]+)/);
        if (matchUc) id = matchUc[1];
        
        if (id) {
            return `https://drive.google.com/uc?export=view&id=${id}`;
        }
        
        return url;
    }

    // Convertir URL de Imgur
    static convertirImgurUrl(url) {
        if (url.includes('i.imgur.com')) return url;
        
        const match = url.match(/imgur\.com\/([a-zA-Z0-9]+)/);
        if (match) {
            return `https://i.imgur.com/${match[1]}.jpg`;
        }
        
        return url;
    }

    // Generar placeholder personalizado
    static generarPlaceholder(titulo = 'Sin Portada', color = '#667eea') {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                    </linearGradient>
                    <filter id="shadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                    </filter>
                </defs>
                <rect width="400" height="600" fill="url(#grad)"/>
                <circle cx="200" cy="250" r="80" fill="rgba(255,255,255,0.1)"/>
                <text x="200" y="270" font-size="80" text-anchor="middle" fill="white" opacity="0.7">📺</text>
                <text x="200" y="370" font-size="22" text-anchor="middle" fill="white" font-weight="bold" filter="url(#shadow)">${titulo}</text>
                <text x="200" y="400" font-size="16" text-anchor="middle" fill="white" opacity="0.8">Sin portada</text>
                <rect x="50" y="440" width="300" height="45" rx="22.5" fill="rgba(255,255,255,0.2)"/>
                <text x="200" y="468" font-size="15" text-anchor="middle" fill="white">📷 Agregar imagen</text>
            </svg>
        `;
        
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }

    // Obtener color predominante de una imagen (simplificado)
    static async obtenerColorPredominante(imgElement) {
        return new Promise((resolve) => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 1;
                canvas.height = 1;
                ctx.drawImage(imgElement, 0, 0, 1, 1);
                const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                resolve({ r, g, b });
            } catch (error) {
                resolve({ r: 102, g: 126, b: 234 }); // Color por defecto
            }
        });
    }

    // Obtener contraste para texto
    static obtenerContraste(r, g, b) {
        const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminancia > 0.5 ? '#000000' : '#ffffff';
    }

    // Obtener portada final
    static obtenerPortada(url, titulo) {
        if (!url || url.trim() === '') {
            return {
                url: this.generarPlaceholder(titulo),
                esPlaceholder: true
            };
        }
        
        const urlDirecta = this.convertirAEnlaceDirecto(url);
        
        return {
            url: urlDirecta,
            esPlaceholder: false,
            servicio: this.detectarServicio(url)
        };
    }
}

console.log('🖼️ ImageManager cargado correctamente');
