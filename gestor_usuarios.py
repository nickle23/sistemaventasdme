import tkinter as tk
from tkinter import ttk, messagebox
import json
import os
from datetime import datetime

class GestorUsuariosApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Gestor de Usuarios - Buscador")
        self.root.geometry("600x450")
        
        self.archivo_json = "usuarios.json"
        
        # Estilos
        style = ttk.Style()
        style.configure("Treeview", font=('Arial', 10), rowheight=25)
        style.configure("TButton", font=('Arial', 10), padding=5)
        
        # Frame Principal
        main_frame = ttk.Frame(root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Título
        lbl_title = tk.Label(main_frame, text="👥 Control de Acceso", font=("Arial", 16, "bold"))
        lbl_title.pack(pady=(0, 20))
        
        # Frame de Entrada
        input_frame = ttk.LabelFrame(main_frame, text="Nuevo Usuario", padding="10")
        input_frame.pack(fill=tk.X, pady=(0, 20))
        
        # Campos de entrada
        grid_frame = ttk.Frame(input_frame)
        grid_frame.pack(fill=tk.X)
        
        ttk.Label(grid_frame, text="Nombre/Vendedor:").grid(row=0, column=0, padx=5, sticky="w")
        self.entry_nombre = ttk.Entry(grid_frame, width=30)
        self.entry_nombre.grid(row=0, column=1, padx=5, pady=5)
        
        ttk.Label(grid_frame, text="Código (ID Dispositivo):").grid(row=1, column=0, padx=5, sticky="w")
        self.entry_id = ttk.Entry(grid_frame, width=30)
        self.entry_id.grid(row=1, column=1, padx=5, pady=5)
        
        btn_add = ttk.Button(grid_frame, text="✅ Autorizar Usuario", command=self.agregar_usuario)
        btn_add.grid(row=2, column=1, pady=10, sticky="e")
        
        # Lista de Usuarios
        list_frame = ttk.LabelFrame(main_frame, text="Usuarios Autorizados", padding="10")
        list_frame.pack(fill=tk.BOTH, expand=True)
        
        # Tabla
        columns = ('nombre', 'id', 'fecha')
        self.tree = ttk.Treeview(list_frame, columns=columns, show='headings')
        
        self.tree.heading('nombre', text='Nombre')
        self.tree.heading('id', text='ID Dispositivo')
        self.tree.heading('fecha', text='Fecha Registro')
        
        self.tree.column('nombre', width=150)
        self.tree.column('id', width=150)
        self.tree.column('fecha', width=120)
        
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.tree.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        # Botón Eliminar
        btn_delete = ttk.Button(main_frame, text="❌ Revocar Acceso", command=self.eliminar_usuario)
        btn_delete.pack(pady=10, side=tk.RIGHT)
        
        self.cargar_usuarios()

    def cargar_usuarios(self):
        # Limpiar tabla
        for i in self.tree.get_children():
            self.tree.delete(i)
            
        if not os.path.exists(self.archivo_json):
            return
            
        try:
            with open(self.archivo_json, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for user in data.get('users', []):
                    self.tree.insert('', tk.END, values=(user['name'], user['id'], user.get('date', '-')))
        except Exception as e:
            messagebox.showerror("Error", f"Error al cargar usuarios: {e}")

    def agregar_usuario(self):
        nombre = self.entry_nombre.get().strip()
        user_id = self.entry_id.get().strip()
        
        if not nombre or not user_id:
            messagebox.showwarning("Faltan datos", "Por favor ingresa el nombre y el código del dispositivo.")
            return
            
        # Cargar datos actuales
        data = {'users': []}
        if os.path.exists(self.archivo_json):
            try:
                with open(self.archivo_json, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except:
                pass
        
        # Verificar duplicados
        for u in data['users']:
            if u['id'] == user_id:
                messagebox.showerror("Error", "Este ID ya está registrado.")
                return
        
        # Agregar
        nuevo_usuario = {
            'id': user_id,
            'name': nombre,
            'active': True,
            'date': datetime.now().strftime("%Y-%m-%d %H:%M")
        }
        
        data['users'].append(nuevo_usuario)
        data['last_updated'] = datetime.now().isoformat()
        
        # Guardar
        try:
            with open(self.archivo_json, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            self.entry_nombre.delete(0, tk.END)
            self.entry_id.delete(0, tk.END)
            self.cargar_usuarios()
            messagebox.showinfo("Éxito", f"Usuario '{nombre}' autorizado correctamente.\n\n⚠️ RECUERDA: Debes subir el archivo 'usuarios.json' a tu web para que funcione.")
        except Exception as e:
            messagebox.showerror("Error", f"Error al guardar: {e}")

    def eliminar_usuario(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("Selección", "Por favor selecciona un usuario de la lista.")
            return
            
        item = self.tree.item(selected[0])
        user_id = item['values'][1]
        nombre = item['values'][0]
        
        confirm = messagebox.askyesno("Confirmar", f"¿Estás seguro de quitar el acceso a {nombre}?")
        if not confirm:
            return
            
        # Cargar, filtrar y guardar
        try:
            with open(self.archivo_json, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            data['users'] = [u for u in data['users'] if u['id'] != str(user_id)]
            data['last_updated'] = datetime.now().isoformat()
            
            with open(self.archivo_json, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                
            self.cargar_usuarios()
            messagebox.showinfo("Eliminado", "Usuario eliminado correctamente.\n\n⚠️ RECUERDA: Debes subir los cambios a tu web.")
        except Exception as e:
            messagebox.showerror("Error", f"Error al eliminar: {e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = GestorUsuariosApp(root)
    root.mainloop()
