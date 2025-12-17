class AuthSystem {
    constructor() {
        this.deviceId = this.getOrCreateDeviceId();
        this.authorized = false;
        this.currentUser = null;
        this.init();
    }

    init() {
        // Ejecutar verificación inmediatamente
        this.checkAccess();
    }

    getOrCreateDeviceId() {
        let id = localStorage.getItem('device_auth_id');
        if (!id) {
            // Generar un ID corto y legible tipo: USR-X9J2-M5K8
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin I, 1, O, 0 para evitar confusión
            let result = 'USR';
            for (let i = 0; i < 8; i++) {
                if (i % 4 === 0) result += '-';
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            id = result;
            localStorage.setItem('device_auth_id', id);
        }
        return id;
    }

    async checkAccess() {
        try {
            // Cargar lista de usuarios permitidos
            // Usamos timestamp para evitar caché del JSON
            const response = await fetch(`usuarios.json?v=${Date.now()}`);
            if (!response.ok) throw new Error('No se pudo cargar la base de datos de usuarios');
            
            const data = await response.json();
            const validUsers = data.users || [];

            // Buscar si mi ID está en la lista
            const user = validUsers.find(u => u.id === this.deviceId);

            if (user && user.active !== false) {
                this.permitAccess(user);
            } else {
                this.denyAccess();
            }

        } catch (error) {
            console.error('Error de autenticación:', error);
            // Si falla la carga (ej: no hay internet o archivo corrupto), 
            // por seguridad denegamos acceso salvo que ya estuviera validado en sesión (opcional)
            this.denyAccess();
        }
    }

    permitAccess(user) {
        this.authorized = true;
        this.currentUser = user;
        console.log(`✅ Bienvenido ${user.name}`);
        
        // Quitar pantalla de bloqueo si existe
        const lockScreen = document.getElementById('lockScreen');
        if (lockScreen) {
            lockScreen.style.opacity = '0';
            setTimeout(() => lockScreen.remove(), 500);
        }
        
        // Mostrar la app principal
        document.querySelector('.app').style.filter = 'none';
        
        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('auth-success', { detail: user }));
    }

    denyAccess() {
        this.authorized = false;
        console.log('⛔ Acceso denegado. ID:', this.deviceId);
        
        this.showLockScreen();
    }

    showLockScreen() {
        if (document.getElementById('lockScreen')) return;

        const overlay = document.createElement('div');
        overlay.id = 'lockScreen';
        overlay.innerHTML = `
            <div class="lock-container">
                <div class="lock-icon">
                    <i class="fas fa-lock"></i>
                </div>
                <h2>Acceso Restringido</h2>
                <p>Este dispositivo no está autorizado para acceder al sistema.</p>
                
                <div class="code-box">
                    <span class="code-label">TU CÓDIGO DE ACCESO:</span>
                    <div class="code-display" onclick="auth.copyToClipboard()">
                        ${this.deviceId}
                        <i class="fas fa-copy copy-icon"></i>
                    </div>
                    <small>Toca el código para copiarlo</small>
                </div>

                <div class="instructions">
                    <p>1. Copia tu código.</p>
                    <p>2. Envíalo al administrador para solicitar acceso.</p>
                    <p>3. Una vez autorizado, recarga esta página.</p>
                </div>

                <button onclick="location.reload()" class="btn-reload">
                    <i class="fas fa-sync-alt"></i> Ya me autorizaron, recargar
                </button>
            </div>
        `;

        // Estilos Inline críticos para asegurar que se vea
        const style = document.createElement('style');
        style.textContent = `
            #lockScreen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #0f172a;
                color: white;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.5s ease;
                font-family: system-ui, -apple-system, sans-serif;
            }
            
            .lock-container {
                background: #1e293b;
                padding: 40px;
                border-radius: 16px;
                text-align: center;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                border: 1px solid #334155;
            }

            .lock-icon {
                font-size: 48px;
                color: #ef4444;
                margin-bottom: 20px;
            }

            h2 { margin: 0 0 10px 0; font-size: 24px; }
            p { color: #94a3b8; margin-bottom: 20px; line-height: 1.5; }

            .code-box {
                background: #0f172a;
                padding: 15px;
                border-radius: 8px;
                border: 2px dashed #334155;
                margin: 20px 0;
            }

            .code-label {
                display: block;
                font-size: 10px;
                color: #64748b;
                margin-bottom: 5px;
                letter-spacing: 1px;
            }

            .code-display {
                font-family: monospace;
                font-size: 24px;
                font-weight: bold;
                color: #38bdf8;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 5px;
                border-radius: 4px;
                transition: background 0.2s;
            }

            .code-display:hover {
                background: rgba(56, 189, 248, 0.1);
            }

            .copy-icon { font-size: 16px; opacity: 0.7; }

            .btn-reload {
                background: #2563eb;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: background 0.2s;
            }

            .btn-reload:hover { background: #1d4ed8; }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(overlay);
        
        // Bloquear scroll del body
        document.body.style.overflow = 'hidden';
    }

    copyToClipboard() {
        navigator.clipboard.writeText(this.deviceId).then(() => {
            const display = document.querySelector('.code-display');
            const originalColor = display.style.color;
            display.style.color = '#4ade80'; // Verde éxito
            display.innerHTML = `¡COPIADO! <i class="fas fa-check"></i>`;
            
            setTimeout(() => {
                display.style.color = ''; // Restaurar
                display.innerHTML = `${this.deviceId} <i class="fas fa-copy copy-icon"></i>`;
            }, 1000);
        });
    }
}

// Inicializar
const auth = new AuthSystem();
