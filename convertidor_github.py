import os
import json
import pandas as pd

def excel_a_json_github():
    """Convierte Excel a JSON optimizado para GitHub Pages"""
    
    print("🔄 CONVERSOR PARA GITHUB PAGES")
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
        
        # Limpiar y optimizar datos para web
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
        
        # Guardar JSON optimizado
        with open('productos.json', 'w', encoding='utf-8') as f:
            json.dump(productos, f, ensure_ascii=False, indent=2)
        
        print(f"✅ CONVERSIÓN EXITOSA!")
        print(f"📊 Total productos: {len(productos)}")
        print(f"💾 JSON guardado como: productos.json")
        print("\n📋 PRÓXIMOS PASOS PARA GITHUB:")
        print("1. Sube todos los archivos a tu repositorio GitHub")
        print("2. Activa GitHub Pages en la configuración")
        print("3. Tu buscador estará online en: https://tunombre.github.io/buscador-productos")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    excel_a_json_github()
    input("\nPresiona Enter para salir...")