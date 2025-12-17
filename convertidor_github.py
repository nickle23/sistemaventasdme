import os
import json
import pandas as pd


from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import base64
try:
    from secret import SECRET_KEY
except ImportError:
    SECRET_KEY = "MundoEscolar$2025_Seguro"

def encriptar_datos(data_json):
    """Encripta el string JSON usando AES"""
    key = SECRET_KEY.encode('utf-8')
    key = key[:32].ljust(32, b'\0') 
    
    cipher = AES.new(key, AES.MODE_ECB)
    data_bytes = data_json.encode('utf-8')
    encrypted = cipher.encrypt(pad(data_bytes, AES.block_size))
    return base64.b64encode(encrypted).decode('utf-8')

def excel_a_json_github():
    """Convierte Excel a JSON optimizado y ENCRIPTADO"""
    
    print("🔄 CONVERSOR DE SEGURIDAD (AES-256)")
    print("=" * 50)
    
    # Buscar archivo Excel
    excel_files = [f for f in os.listdir('.') if f.endswith(('.xlsx', '.xls'))]
    
    if not excel_files:
        print("❌ No se encontró ningún archivo Excel en esta carpeta")
        print("💡 Copia tu EXCEL PRODUCTOS ACTUALIZADO.xlsx aquí")
        return
    
    archivo_excel = excel_files[0]
    print(f"📖 Leyendo: {archivo_excel}")
    
    try:
        # Leer Excel
        df = pd.read_excel(archivo_excel)
        
        # Limpiar y optimizar datos
        productos = []
        for _, row in df.iterrows():
            producto = {
                'codigo': str(row.get('Código', '')),
                'descripcion': str(row.get('Descripcion', '')),
                'unidad': str(row.get('Unidad', '')),
                'precio': str(row.get('Precio', '')),
                'stock': str(row.get('StActual', '')),
                'precio_unit': str(row.get('Pr.Unit', ''))
            }
            productos.append(producto)
        
        # Convertir a JSON
        json_str = json.dumps(productos, ensure_ascii=False)
        
        # ENCRIPTAR
        print("🔒 Encriptando información confidencial...")
        contenido_seguro = encriptar_datos(json_str)
        
        # Guardar encriptado
        with open('productos.json', 'w', encoding='utf-8') as f:
            f.write(contenido_seguro)
        
        print(f"✅ PROTECCIÓN EXITOSA!")
        print(f"📊 Total productos protegidos: {len(productos)}")
        print(f"💾 Archivo generado: productos.json (ENCRIPTADO)")
        print("\n📋 NOTA:")
        print("El archivo productos.json ahora es ilegible para humanos.")
        print("Solo tu página oficial con la clave correcta podrá leerlo.")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    excel_a_json_github()
    input("\nPresiona Enter para salir...")