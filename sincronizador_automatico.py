import os
import json
import pandas as pd
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import shutil
from datetime import datetime


from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import base64
try:
    from secret import SECRET_KEY
except ImportError:
    SECRET_KEY = "MundoEscolar$2025_Seguro"

import glob

class ManejadorExcel(FileSystemEventHandler):
    def __init__(self, sincronizador):
        self.sincronizador = sincronizador
        self.ultimo_archivo = None
    
    def on_modified(self, event):
        if event.is_directory:
            return
            
        if event.src_path.endswith(('.xlsx', '.xls')):
            archivo_actual = os.path.basename(event.src_path)
            
            # Evitar múltiples triggers del mismo archivo
            if archivo_actual != self.ultimo_archivo:
                print(f"\n🔄 Cambio detectado en: {archivo_actual}")
                self.ultimo_archivo = archivo_actual
                self.sincronizador.procesar_excel(event.src_path)

class SincronizadorGitHub:
    def __init__(self):
        self.carpeta_excel = "excel"
        self.archivo_json = "productos.json"
        self.crear_carpetas()
        
    def crear_carpetas(self):
        if not os.path.exists(self.carpeta_excel):
            os.makedirs(self.carpeta_excel)
            print(f"✅ Carpeta '{self.carpeta_excel}/' creada")
    
    def encriptar_datos(self, data_json):
        """Encripta el string JSON usando AES"""
        key = SECRET_KEY.encode('utf-8')
        # Asegurar que la clave sea de 16, 24 o 32 bytes (completar o recortar)
        key = key[:32].ljust(32, b'\0') 
        
        cipher = AES.new(key, AES.MODE_ECB)
        data_bytes = data_json.encode('utf-8')
        encrypted = cipher.encrypt(pad(data_bytes, AES.block_size))
        return base64.b64encode(encrypted).decode('utf-8')

    def detectar_cambios(self, df_actual, nombre_actual=None):
        """
        Compara el DataFrame actual con el último Excel de respaldo.
        exclude_name: Nombre del archivo actual para ignorarlo si existe en respaldos
        """
        try:
            # 1. Buscar el archivo más reciente en la carpeta excel/
            patron = os.path.join(self.carpeta_excel, "*.xls*")
            archivos = glob.glob(patron)
            
            # FILTRAR: Ignorar el archivo que tenga el mismo nombre que el actual
            if nombre_actual:
                archivos = [f for f in archivos if os.path.basename(f) != nombre_actual]
            
            if not archivos:
                print("(!) No hay respaldos validos anteriores para comparar.")
                return None
                
            # Ordenar por fecha de modificación (el más nuevo al final)
            ultimo_backup = max(archivos, key=os.path.getmtime)
            print(f"[DEBUG] Archivo actual: {len(df_actual)} filas")
            print(f"[DEBUG] Comparando con respaldo valido: {os.path.basename(ultimo_backup)}")
            
            # 2. Cargar respaldo
            df_anterior = pd.read_excel(ultimo_backup)
            
            # Normalizar columnas clave (Código como string)
            # Normalizar columnas clave
            df_actual['Código'] = df_actual['Código'].astype(str).str.strip()
            df_actual['Unidad'] = df_actual['Unidad'].astype(str).str.strip()
            
            df_anterior['Código'] = df_anterior['Código'].astype(str).str.strip()
            df_anterior['Unidad'] = df_anterior['Unidad'].astype(str).str.strip()
            
            # Crear claves únicas (Código + Unidad) para soportar variantes
            # Esto evita que una unidad (ej: Docena) sobrescriba a otra (ej: Unidad)
            dict_actual = {}
            codigos_actuales = set()
            for _, row in df_actual.iterrows():
                key = (row['Código'], row['Unidad'])
                codigo = row['Código']
                dict_actual[key] = row.to_dict()
                codigos_actuales.add(codigo)
                
            dict_anterior = {}
            codigos_anteriores = set()
            for _, row in df_anterior.iterrows():
                key = (row['Código'], row['Unidad'])
                codigo = row['Código']
                dict_anterior[key] = row.to_dict()
                codigos_anteriores.add(codigo)
            
            cambios = {
                "nuevos": [],
                "precios": []
            }
            
            # 3. Detectar NUEVOS y CAMBIOS
            for key, datos in dict_actual.items():
                codigo, unidad = key
                
                if key not in dict_anterior:
                    # Verificar si es producto completamente nuevo o solo nueva variante
                    es_producto_nuevo = codigo not in codigos_anteriores
                    
                    cambios["nuevos"].append({
                        "codigo": codigo,
                        "descripcion": str(datos.get('Descripcion', '')).strip(),
                        "precio": str(datos.get('Precio', '0')).strip(),
                        "unidad": unidad,
                        "es_producto_nuevo": es_producto_nuevo,  # True si el código no existía antes
                        "tipo_cambio": "producto_nuevo" if es_producto_nuevo else "nueva_unidad"
                    })
                else:
                    # Existe, verificar PRECIO
                    try:
                        precio_nuevo = float(str(datos.get('Precio', '0')))
                        precio_antiguo = float(str(dict_anterior[key].get('Precio', '0')))
                        
                        # Si hay diferencia significativa
                        if abs(precio_nuevo - precio_antiguo) > 0.01:
                            tipo = "subio" if precio_nuevo > precio_antiguo else "bajo"
                            cambios["precios"].append({
                                "codigo": codigo,
                                "descripcion": str(datos.get('Descripcion', '')).strip(),
                                "precio_antiguo": f"{precio_antiguo:.2f}",
                                "precio_nuevo": f"{precio_nuevo:.2f}",
                                "unidad": unidad,
                                "tipo": tipo
                            })
                    except:
                        pass # Si falla conversión, ignorar
                        
            count_nuevos = len(cambios["nuevos"])
            count_precios = len(cambios["precios"])
            
            if count_nuevos > 0 or count_precios > 0:
                print(f"CAMBIOS DETECTADOS: {count_nuevos} Nuevos | {count_precios} Cambios de Precio")
                return cambios
            else:
                print("Sin cambios relevantes respecto al ultimo respaldo.")
                return None

        except Exception as e:
            print(f"Warning al comparar excel: {e}")
            return None

    def convertir_excel_a_json(self, ruta_excel):
        """Convierte Excel a JSON ENCRIPTADO"""
        try:
            print("Leyendo archivo Excel...")
            df = pd.read_excel(ruta_excel)
            
            # Detectar cambios ANTES de procesar (Pasamos el nombre para excluirlo de la busqueda)
            nombre_archivo = os.path.basename(ruta_excel)
            cambios_detectados = self.detectar_cambios(df, nombre_actual=nombre_archivo)
            
            # Procesar productos
            productos = []
            for _, fila in df.iterrows():
                producto = {
                    'codigo': str(fila.get('Código', '')).strip(),
                    'descripcion': str(fila.get('Descripcion', '')).strip(),
                    'unidad': str(fila.get('Unidad', '')).strip(),
                    'precio': str(fila.get('Precio', '0')).strip(),
                    'stock': str(fila.get('StActual', '0')).strip(),
                    'precio_unit': str(fila.get('Pr.Unit', '0')).strip()
                }
                productos.append(producto)
            
            # Convertir a String JSON
            # === MODIFICACIÓN: Agregar metadata con fecha ===
            data = {
                "metadata": {
                    "last_updated": datetime.now().isoformat(),
                    "total_products": len(productos)
                },
                "changes": cambios_detectados, # Agregamos los cambios aquí
                "products": productos
            }
            json_str = json.dumps(data, ensure_ascii=False)
            
            # ENCRIPTAR
            print("Encriptando datos con AES-256...")
            contenido_seguro = self.encriptar_datos(json_str)
            
            # Guardar archivo encriptado (aunque se llame .json es texto cifrado)
            with open(self.archivo_json, 'w', encoding='utf-8') as f:
                f.write(contenido_seguro)
            
            print(f"JSON DE SEGURIDAD generado: {len(productos)} productos protegidos")
            return True
            
        except Exception as e:
            print(f"Error convirtiendo Excel: {e}")
            return False
    
    
    def procesar_excel(self, ruta_excel):
        """Procesa completo: Excel → JSON Encriptado"""
        print("Iniciando procesamiento automatico...")
        
        # 1. Convertir Excel a JSON Encriptado
        if not self.convertir_excel_a_json(ruta_excel):
            return
        
        # 2. Copiar Excel a carpeta de respaldo
        nombre_archivo = os.path.basename(ruta_excel)
        ruta_destino = os.path.join(self.carpeta_excel, nombre_archivo)
        
        try:
            shutil.copy2(ruta_excel, ruta_destino)
            print(f"Excel respaldado en: {self.carpeta_excel}/")
        except Exception as e:
            print(f"No se pudo respaldar Excel: {e}")
        
        # 3. ACTUALIZAR VERSIÓN EN INDEX.HTML (CACHE BUSTING)
        self.actualizar_version_index()

        print("Proceso completado - Datos Protegidos y Listos para Subir!")
        print("=" * 60)
    
    def actualizar_version_index(self):
        """Actualiza el parámetro ?v=TIMESTAMP en index.html para evitar caché"""
        try:
            archivo_index = "index.html"
            if not os.path.exists(archivo_index):
                return
                
            print("🔄 Actualizando versión en index.html...")
            
            with open(archivo_index, 'r', encoding='utf-8') as f:
                contenido = f.read()
            
            # Generar nueva versión basada en timestamp corto
            nueva_version = f"v={int(time.time())}"
            
            # Reemplazar cualquier v=... por la nueva versión
            import re
            contenido_nuevo = re.sub(r'v=[\w\.]+', nueva_version, contenido)
            
            # Solo escribir si hubo cambios
            if contenido != contenido_nuevo:
                with open(archivo_index, 'w', encoding='utf-8') as f:
                    f.write(contenido_nuevo)
                print(f"Version actualizada a: {nueva_version}")
            else:
                print("La version ya estaba actualizada")
                
        except Exception as e:
            print(f"No se pudo actualizar version en index.html: {e}")

    def iniciar_vigilancia(self):
        """Inicia la vigilancia automática"""
        print("GENERADOR AUTOMATICO DE SEGURIDAD")
        print("=" * 60)
        print("Coloca tu Excel en esta carpeta")
        print("El sistema detectara cambios automaticamente")
        print("Tus datos seran ENCRIPTADOS en 'productos.json'")
        print("Luego solo sube ese archivo a GitHub manualmente")
        print("=" * 60)
        
        # Procesar Excel existente al iniciar
        archivos_excel = [f for f in os.listdir('.') if f.endswith(('.xlsx', '.xls'))]
        if archivos_excel:
            print(f"Procesando Excel existente: {archivos_excel[0]}")
            self.procesar_excel(archivos_excel[0])
        
        # Iniciar vigilancia
        event_handler = ManejadorExcel(self)
        observer = Observer()
        observer.schedule(event_handler, '.', recursive=False)
        observer.start()
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
            print("\nSistema detenido")
        
        observer.join()

if __name__ == "__main__":
    sincronizador = SincronizadorGitHub()
    sincronizador.iniciar_vigilancia()