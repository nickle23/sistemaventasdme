# 📘 MANUAL DE USO - SISTEMA MUNDO ESCOLAR

Este documento explica paso a paso qué hacer para actualizar precios o gestionar usuarios.

---

## 🟢 CASO 1: ACTUALIZAR PRECIOS O PRODUCTOS

Cada vez que modifiques tu Excel principal con nuevos precios o stock:

1. **Guarda tu Excel** en la carpeta del proyecto.
2. **Ejecuta el Sincronizador**:
   - Abre el archivo `sincronizador_automatico.py`.
   - El programa detectará tu Excel, actualizará la base de datos y **actualizará la versión en `index.html` automáticamente**.
   - **Lógica de Cambios**: El sistema ahora tiene **memoria de 7 días**. Los cambios se acumulan durante la semana y se borran automáticamente después del séptimo día.
3. **Sube a GitHub (OBLIGATORIO SUBIR LOS DOS)**:
   - Ve a tu repositorio en GitHub.com.
   - Sube **`productos.json`** (El archivo de datos que ahora contiene el historial de 7 días).
   - Sube **`index.html`** (El archivo que "avisa" al navegador que hay datos nuevos).
   
> **⚠️ MUY IMPORTANTE:** Si solo subes el JSON y olvidas el HTML, tus clientes NO verán los cambios debido a la memoria del celular (caché). **Sube siempre los dos.**

---

## 🟠 CASO 2: GESTIONAR USUARIOS (Autorizar o Bloquear)

Cada vez que quieras dar acceso a un vendedor nuevo o bloquear a alguien:

1. **Abre el Gestor**:
   - Ejecuta el archivo `gestor_usuarios.py`.
2. **Realiza los cambios**:
   - **Buscador Práctico**: Usa la barra de búsqueda arriba a la derecha para encontrar vendedores por nombre o ID al instante.
   - **Autorizar**: Agrega el nombre y el ID del nuevo usuario.
   - **Editar ID**: Si un vendedor cambia de celular, selecciona su nombre y usa el botón **"Editar ID"** para actualizarlo sin borrar su registro.
   - **Bloquear**: Selecciona uno y dale a "Bloquear/Desbloquear".
3. **Sube a GitHub**:
   - Ve a tu repositorio en GitHub.com.
   - Sube el archivo **`usuarios.json`**.
   - *Importante:* Sin subir este archivo, los cambios NO tendrán efecto en la web.

---

## 🔴 CASO 3: SI ALGO SE VE MAL (Mantenimiento)

Si ves que el diseño está raro, desalineado o antiguo en los celulares:

1. Asegúrate de tener la **última versión** de todos los archivos en tu PC (haz `git pull` o descarga lo último).
2. **Sube nuevamente TODOS los archivos críticos**:
   - `index.html`, `styles.css`, `script.js`, `auth.js`, `productos.json`.
3. Esto forzará una "reparación" completa del sitio en la nube.

---
**Nota Final:** El sistema ahora tiene un "Anti-Caché Automático" y una "Memoria de 7 días" para novedades. Es vital subir `index.html` siempre para que el sistema sepa que hay información fresca.
