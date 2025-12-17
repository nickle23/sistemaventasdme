# 📘 MANUAL DE USO - SISTEMA MUNDO ESCOLAR

Este documento explica paso a paso qué hacer para actualizar precios o gestionar usuarios.

---

## 🟢 CASO 1: ACTUALIZAR PRECIOS O PRODUCTOS

Cada vez que modifiques tu Excel principal con nuevos precios o stock:

1. **Guarda tu Excel** en la carpeta del proyecto.
2. **Ejecuta el Sincronizador**:
   - Abre el archivo `sincronizador_automatico.py`.
   - Verás una ventana negra que dice "SISTEMA DE SINCRONIZACIÓN AUTOMÁTICA".
   - El programa detectará tu Excel y generará el archivo de seguridad automáticamente.
   - Espera a que diga: `✅ JSON DE SEGURIDAD generado`.
3. **Sube a GitHub**:
   - Ve a tu repositorio en GitHub.com.
   - Sube el archivo **`productos.json`** (el nuevo que se acaba de crear).
   - *Tip:* Espera 1 minuto para que los cambios se reflejen en la web.

---

## 🟠 CASO 2: GESTIONAR USUARIOS (Autorizar o Bloquear)

Cada vez que quieras dar acceso a un vendedor nuevo o bloquear a alguien:

1. **Abre el Gestor**:
   - Ejecuta el archivo `gestor_usuarios.py`.
2. **Realiza los cambios**:
   - Agrega el código del nuevo usuario.
   - O selecciona uno y dale a "Bloquear/Desbloquear".
3. **Sube a GitHub**:
   - Ve a tu repositorio en GitHub.com.
   - Sube el archivo **`usuarios.json`**.
   - *Importante:* Sin subir este archivo, los cambios NO tendrán efecto en la web.

---

## 🔴 CASO 3: MANTENIMIENTO GENERAL

Si modificas el diseño o la página falla, sube nuevamente:
   - `index.html`
   - `script.js`
   - `auth.js`
   - `productos.json`
   - `usuarios.json`

---
**Nota:** Si subes algo y no lo ves al instante, recuerda que es por la **caché**. Prueba en "Modo Incógnito" para verificar.
