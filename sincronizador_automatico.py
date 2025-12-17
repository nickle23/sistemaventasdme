import os
import json
import pandas as pd
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import shutil


from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import base64
try:
    from secret import SECRET_KEY
except ImportError:
    SECRET_KEY = "MundoEscolar$2025_Seguro"

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

    def convertir_excel_a_json(self, ruta_excel):
        """Convierte Excel a JSON ENCRIPTADO"""
        try:
            print("📖 Leyendo archivo Excel...")
            df = pd.read_excel(ruta_excel)
            
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
            json_str = json.dumps(productos, ensure_ascii=False)
            
            # ENCRIPTAR
            print("🔒 Encriptando datos con AES-256...")
            contenido_seguro = self.encriptar_datos(json_str)
            
            # Guardar archivo encriptado (aunque se llame .json es texto cifrado)
            with open(self.archivo_json, 'w', encoding='utf-8') as f:
                f.write(contenido_seguro)
            
            print(f"✅ JSON DE SEGURIDAD generado: {len(productos)} productos protegidos")
            return True
            
        except Exception as e:
            print(f"❌ Error convirtiendo Excel: {e}")
            return False
    
    
    def procesar_excel(self, ruta_excel):
        """Procesa completo: Excel → JSON Encriptado"""
        print("🔄 Iniciando procesamiento automático...")
        
        # 1. Convertir Excel a JSON Encriptado
        if not self.convertir_excel_a_json(ruta_excel):
            return
        
        # 2. Copiar Excel a carpeta de respaldo
        nombre_archivo = os.path.basename(ruta_excel)
        ruta_destino = os.path.join(self.carpeta_excel, nombre_archivo)
        
        try:
            shutil.copy2(ruta_excel, ruta_destino)
            print(f"📁 Excel respaldado en: {self.carpeta_excel}/")
        except Exception as e:
            print(f"⚠️ No se pudo respaldar Excel: {e}")
        
        print("🎯 Proceso completado - Datos Protegidos y Listos para Subir!")
        print("=" * 60)
    
    def iniciar_vigilancia(self):
        """Inicia la vigilancia automática"""
        print("🚀 GENERADOR AUTOMÁTICO DE SEGURIDAD")
        print("=" * 60)
        print("📁 Coloca tu Excel en esta carpeta")
        print("👀 El sistema detectará cambios automáticamente")
        print("🔒 Tus datos serán ENCRIPTADOS en 'productos.json'")
        print("💡 Luego solo sube ese archivo a GitHub manualmente")
        print("=" * 60)
        
        # Procesar Excel existente al iniciar
        archivos_excel = [f for f in os.listdir('.') if f.endswith(('.xlsx', '.xls'))]
        if archivos_excel:
            print(f"📖 Procesando Excel existente: {archivos_excel[0]}")
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
            print("\n🛑 Sistema detenido")
        
        observer.join()

if __name__ == "__main__":
    sincronizador = SincronizadorGitHub()
    sincronizador.iniciar_vigilancia()