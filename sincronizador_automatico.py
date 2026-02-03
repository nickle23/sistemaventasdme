import os
import sys

# 1. Mensaje de vida inmediato e IRRECHAZABLE
print(">> SISTEMA INICIANDO... POR FAVOR ESPERA.", flush=True)

import json
import time
import shutil
import base64
import glob
import re
import math
from datetime import datetime

# =============================================================================
# CONFIGURACIÓN UNIVERSAL (AUTO-REPARABLE)
# =============================================================================

# 2. Configuración de terminal simplificada
if sys.platform == "win32":
    try: os.system('chcp 65001 > nul')
    except: pass

# 2. Verificación inteligente de dependencias
def verificar_librerias():
    faltantes = []
    try: import pandas as pd
    except ImportError: faltantes.append("pandas")
    try: from watchdog.observers import Observer
    except ImportError: faltantes.append("watchdog")
    try: from Crypto.Cipher import AES
    except ImportError: faltantes.append("pycryptodome")
    
    if faltantes:
        print("\n" + "!"*60)
        print("ERROR: Faltan librerias necesarias.")
        print(f"Instala esto: pip install {' '.join(faltantes)} openpyxl")
        print("!"*60 + "\n")
        time.sleep(5)
        sys.exit(1)

verificar_librerias()
import pandas as pd
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

# Intento de importar la clave secreta
try:
    from secret import SECRET_KEY
except ImportError:
    SECRET_KEY = "MundoEscolar$2025_Seguro"

# =============================================================================
# CLASES DEL SISTEMA
# =============================================================================

class SincronizadorUniversal:
    def __init__(self):
        # Rutas dinámicas basadas en la ubicación del script
        self.base_path = os.path.dirname(os.path.abspath(__file__))
        self.carpeta_excel = os.path.join(self.base_path, "excel")
        self.archivo_json = os.path.join(self.base_path, "productos.json")
        self.archivo_index = os.path.join(self.base_path, "index.html")
        
        self.asegurar_entorno()
        
    def asegurar_entorno(self):
        """Crea las carpetas necesarias si no existen"""
        if not os.path.exists(self.carpeta_excel):
            try:
                os.makedirs(self.carpeta_excel)
                self.log(f"Carpeta de respaldo '{os.path.basename(self.carpeta_excel)}' creada")
            except:
                pass

    def log(self, mensaje, tipo="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = ">>" if tipo == "INFO" else "(!)"
        # Eliminar cualquier emoji residual por seguridad extrema
        mensaje_limpio = mensaje.encode('ascii', 'ignore').decode('ascii') if tipo != "INFO" else mensaje
        print(f"[{timestamp}] {prefix} {mensaje}")

    def _normalizar_codigo(self, val):
        s = str(val).strip()
        if s.endswith('.0'): s = s[:-2]
        return s

    def _limpiar_datos_profundo(self, obj):
        """Elimina NaNs e Infs de forma recursiva para evitar JSON inválido"""
        if isinstance(obj, list):
            return [self._limpiar_datos_profundo(i) for i in obj]
        elif isinstance(obj, dict):
            return {k: self._limpiar_datos_profundo(v) for k, v in obj.items()}
        elif isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return 0.0
        return obj

    def encriptar(self, data_json):
        key = SECRET_KEY.encode('utf-8')
        key = key[:32].ljust(32, b'\0') 
        cipher = AES.new(key, AES.MODE_ECB)
        data_bytes = data_json.encode('utf-8')
        encrypted = cipher.encrypt(pad(data_bytes, AES.block_size))
        return base64.b64encode(encrypted).decode('utf-8')

    def desencriptar(self, contenido_encriptado):
        try:
            key = SECRET_KEY.encode('utf-8')
            key = key[:32].ljust(32, b'\0')
            cipher = AES.new(key, AES.MODE_ECB)
            encrypted_bytes = base64.b64decode(contenido_encriptado)
            decrypted = unpad(cipher.decrypt(encrypted_bytes), AES.block_size)
            return decrypted.decode('utf-8')
        except:
            return None

    def detectar_cambios(self, df_actual, nombre_actual=None):
        try:
            patron = os.path.join(self.carpeta_excel, "*.xls*")
            archivos = glob.glob(patron)
            if nombre_actual:
                archivos = [f for f in archivos if os.path.basename(f) != nombre_actual]
            
            if not archivos: return None
            
            ultimo_backup = max(archivos, key=os.path.getmtime)
            df_anterior = pd.read_excel(ultimo_backup).fillna('')
            
            # Normalización
            df_actual['Código'] = df_actual['Código'].apply(self._normalizar_codigo)
            df_actual['Unidad'] = df_actual['Unidad'].astype(str).str.strip()
            df_anterior['Código'] = df_anterior['Código'].apply(self._normalizar_codigo)
            df_anterior['Unidad'] = df_anterior['Unidad'].astype(str).str.strip()
            
            codigos_anteriores = set(df_anterior['Código'])
            
            dict_actual = {(r['Código'], r['Unidad']): r.to_dict() for _, r in df_actual.iterrows()}
            dict_anterior = {(r['Código'], r['Unidad']): r.to_dict() for _, r in df_anterior.iterrows()}
            
            cambios = {"nuevos": [], "precios": []}
            
            for key, datos in dict_actual.items():
                codigo, unidad = key
                if key not in dict_anterior:
                    cambios["nuevos"].append({
                        "codigo": codigo,
                        "descripcion": str(datos.get('Descripcion', '')).strip(),
                        "precio": str(datos.get('Precio', '0')).strip(),
                        "unidad": unidad,
                        "es_producto_nuevo": codigo not in codigos_anteriores,
                        "tipo_cambio": "producto_nuevo" if codigo not in codigos_anteriores else "nueva_unidad"
                    })
                else:
                    try:
                        p_nuevo = float(str(datos.get('Precio', '0')))
                        p_viejo = float(str(dict_anterior[key].get('Precio', '0')))
                        if abs(p_nuevo - p_viejo) > 0.01:
                            cambios["precios"].append({
                                "codigo": codigo,
                                "descripcion": str(datos.get('Descripcion', '')).strip(),
                                "precio_antiguo": f"{p_viejo:.2f}",
                                "precio_nuevo": f"{p_nuevo:.2f}",
                                "unidad": unidad,
                                "tipo": "subio" if p_nuevo > p_viejo else "bajo"
                            })
                    except: pass
            
            return cambios if cambios["nuevos"] or cambios["precios"] else None
        except Exception as e:
            self.log(f"Error comparando archivos: {e}", "WARN")
            return None

    def merge_cambios(self, historico, nuevos):
        ahora = datetime.now()
        limite = 7
        if not historico: historico = {"nuevos": [], "precios": []}
        if not nuevos: nuevos = {"nuevos": [], "precios": []}
        
        def es_valido(v):
            if 'timestamp' not in v: return True
            try:
                return (ahora - datetime.fromisoformat(v['timestamp'])).days < limite
            except: 
                return True

        # Merge de productos nuevos
        dict_n = {(n['codigo'], n.get('unidad', 'UND')): n for n in historico.get("nuevos", []) if es_valido(n)}
        for n in nuevos.get("nuevos", []):
            n['timestamp'] = ahora.isoformat()
            dict_n[(n['codigo'], n.get('unidad', 'UND'))] = n
            
        # Merge de precios
        dict_p = {(p['codigo'], p.get('unidad', 'UND')): p for p in historico.get("precios", []) if es_valido(p)}
        for p in nuevos.get("precios", []):
            p['timestamp'] = ahora.isoformat()
            key = (p['codigo'], p.get('unidad', 'UND'))
            if key in dict_p:
                dict_p[key]['precio_nuevo'] = p['precio_nuevo']
                dict_p[key]['tipo'] = "subio" if float(p['precio_nuevo']) > float(dict_p[key]['precio_antiguo']) else "bajo"
                dict_p[key]['timestamp'] = ahora.isoformat()
            else:
                dict_p[key] = p
                
        return {"nuevos": list(dict_n.values()), "precios": list(dict_p.values())}

    def actualizar_version_index(self):
        try:
            if not os.path.exists(self.archivo_index): return
            with open(self.archivo_index, 'r', encoding='utf-8') as f: content = f.read()
            nueva_v = f"v={int(time.time())}"
            content = re.sub(r'v=[\w\.]+', nueva_v, content)
            with open(self.archivo_index, 'w', encoding='utf-8') as f: f.write(content)
            self.log("Control de cache (index.html) actualizado")
        except: pass

    def procesar(self, ruta_excel):
        self.log(f"Procesando: {os.path.basename(ruta_excel)}")
        try:
            df = pd.read_excel(ruta_excel).fillna('')
            df = df.replace([float('inf'), float('-inf')], 0)
            
            nombre_archivo = os.path.basename(ruta_excel)
            cambios_det = self.detectar_cambios(df, nombre_actual=nombre_archivo)
            
            # RESUMEN DE CAMBIOS EN CONSOLA
            if cambios_det:
                n_nuevos = len(cambios_det.get("nuevos", []))
                n_precios = len(cambios_det.get("precios", []))
                if n_nuevos > 0: self.log(f"Detectados {n_nuevos} productos nuevos")
                if n_precios > 0: self.log(f"Detectados {n_precios} cambios de precio")
            else:
                self.log("No se detectaron cambios respecto al respaldo anterior")

            productos = []
            for _, fila in df.iterrows():
                productos.append({
                    'codigo': self._normalizar_codigo(fila.get('Código', '')),
                    'descripcion': str(fila.get('Descripcion', '')).strip(),
                    'unidad': str(fila.get('Unidad', '')).strip(),
                    'precio': str(fila.get('Precio', '0')).strip(),
                    'stock': str(fila.get('StActual', '0')).strip(),
                    'precio_unit': str(fila.get('Pr.Unit', '0')).strip()
                })
            
            historico = {"nuevos": [], "precios": []}
            if os.path.exists(self.archivo_json):
                try:
                    with open(self.archivo_json, 'r', encoding='utf-8') as f:
                        dec = self.desencriptar(f.read())
                        if dec:
                            old_data = json.loads(dec)
                            historico = old_data.get("changes", historico)
                except: pass

            data = {
                "metadata": {"last_updated": datetime.now().isoformat(), "total_products": len(productos)},
                "changes": self.merge_cambios(historico, cambios_det),
                "products": productos
            }
            
            # Limpieza final de seguridad anti-NaN
            data = self._limpiar_datos_profundo(data)
            
            with open(self.archivo_json, 'w', encoding='utf-8') as f:
                f.write(self.encriptar(json.dumps(data, ensure_ascii=False)))
            
            # Respaldo
            ruta_dest = os.path.join(self.carpeta_excel, nombre_archivo)
            if os.path.abspath(ruta_excel) != os.path.abspath(ruta_dest):
                shutil.copy2(ruta_excel, ruta_dest)
            
            self.actualizar_version_index()
            self.log(f"Exito: {len(productos)} productos protegidos")
            print("-" * 50)
            return True
        except Exception as e:
            self.log(f"Error critico: {str(e)}", "ERROR")
            return False

class ManejadorExcel(FileSystemEventHandler):
    def __init__(self, sinc): self.sinc = sinc; self.last = None
    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(('.xlsx', '.xls')):
            archivo = os.path.basename(event.src_path)
            if archivo != self.last and not archivo.startswith('~$'):
                self.last = archivo
                time.sleep(1) # Esperar a que Excel suelte el archivo
                self.sinc.procesar(event.src_path)

if __name__ == "__main__":
    print("="*60)
    print("SISTEMA DE SINCRONIZACION UNIVERSAL - MUNDO ESCOLAR")
    print("="*60)
    
    sinc = SincronizadorUniversal()
    
    # Procesar archivo inicial si existe
    excels = [f for f in os.listdir('.') if f.endswith(('.xlsx', '.xls')) and not f.startswith('~$')]
    if excels:
        sinc.procesar(excels[0])
    
    print(">> Vigilando cambios en esta carpeta... (Presiona Ctrl+C para salir)")
    
    handler = ManejadorExcel(sinc)
    observer = Observer()
    observer.schedule(handler, '.', recursive=False)
    observer.start()
    
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\n>> Sincronizador detenido.")
    observer.join()