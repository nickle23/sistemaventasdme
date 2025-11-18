import os
import json
import pandas as pd
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess
import shutil

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
    
    def convertir_excel_a_json(self, ruta_excel):
        """Convierte Excel a JSON optimizado"""
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
            
            # Guardar JSON
            with open(self.archivo_json, 'w', encoding='utf-8') as f:
                json.dump(productos, f, ensure_ascii=False, indent=2)
            
            print(f"✅ JSON actualizado: {len(productos)} productos")
            return True
            
        except Exception as e:
            print(f"❌ Error convirtiendo Excel: {e}")
            return False
    
    def ejecutar_git(self, comando):
        """Ejecuta comandos Git"""
        try:
            resultado = subprocess.run(comando, shell=True, capture_output=True, text=True)
            if resultado.returncode == 0:
                return True
            else:
                print(f"❌ Error Git: {resultado.stderr}")
                return False
        except Exception as e:
            print(f"❌ Error ejecutando Git: {e}")
            return False
    
    def subir_a_github(self):
        """Sube los cambios automáticamente a GitHub"""
        print("🚀 Subiendo cambios a GitHub...")
        
        # Comandos Git
        comandos = [
            "git add .",
            'git commit -m "🔄 Actualización automática de productos"',
            "git push origin main"
        ]
        
        for comando in comandos:
            print(f"   Ejecutando: {comando}")
            if not self.ejecutar_git(comando):
                print("❌ Error en el proceso Git")
                return False
        
        print("✅ Cambios subidos exitosamente a GitHub")
        return True
    
    def procesar_excel(self, ruta_excel):
        """Procesa completo: Excel → JSON → GitHub"""
        print("🔄 Iniciando procesamiento automático...")
        
        # 1. Convertir Excel a JSON
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
        
        # 3. Subir a GitHub
        self.subir_a_github()
        
        print("🎯 Proceso completado - Tu buscador online está actualizado!")
        print("=" * 60)
    
    def iniciar_vigilancia(self):
        """Inicia la vigilancia automática"""
        print("🚀 SISTEMA DE SINCRONIZACIÓN AUTOMÁTICA")
        print("=" * 60)
        print("📁 Coloca tu Excel en esta carpeta")
        print("👀 El sistema detectará cambios automáticamente")
        print("🌐 Los cambios se subirán automáticamente a GitHub")
        print("💡 Presiona Ctrl+C para detener")
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