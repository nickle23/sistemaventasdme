import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import json
import os
from datetime import datetime

class GestorUsuariosApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Gestor de Usuarios - MUNDO ESCOLAR")
        self.root.geometry("800x500")
        
        self.archivo_json = "usuarios.json"
        
        # Estilos
        style = ttk.Style()
        style.configure("Treeview", font=('Segoe UI', 10), rowheight=30)
        style.configure("TButton", font=('Segoe UI', 9), padding=5)
        style.configure("Header.TLabel", font=('Segoe UI', 12, 'bold'))
        
        # Frame Principal
        main_frame = ttk.Frame(root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Header
        header_frame = ttk.Frame(main_frame)
        header_frame.pack(fill=tk.X, pady=(0, 20))
        
        lbl_title = ttk.Label(header_frame, text="🛡️ Panel de Seguridad - Control de Accesos", style="Header.TLabel")
        lbl_title.pack(side=tk.LEFT)
        
        # Frame de Entrada
        input_frame = ttk.LabelFrame(main_frame, text="Nuevo Acceso", padding="15")
        input_frame.pack(fill=tk.X, pady=(0, 20))
        
        # Campos de entrada
        grid_frame = ttk.Frame(input_frame)
        grid_frame.pack(fill=tk.X)
        
        ttk.Label(grid_frame, text="Nombre / Vendedor:").grid(row=0, column=0, padx=5, sticky="w")
        self.entry_nombre = ttk.Entry(grid_frame, width=35)
        self.entry_nombre.grid(row=0, column=1, padx=5, pady=5)
        self.entry_nombre.bind('<Return>', lambda e: self.entry_id.focus())
        
        ttk.Label(grid_frame, text="Código ID:").grid(row=0, column=2, padx=5, sticky="w")
        self.entry_id = ttk.Entry(grid_frame, width=25)
        self.entry_id.grid(row=0, column=3, padx=5, pady=5)
        
        btn_add = tk.Button(grid_frame, text="✅ Autorizar", bg="#22c55e", fg="white", 
                          font=("Segoe UI", 9, "bold"), command=self.agregar_usuario, padx=15)
        btn_add.grid(row=0, column=4, padx=10)
        
        # Barra de Herramientas
        toolbar_frame = ttk.Frame(main_frame)
        toolbar_frame.pack(fill=tk.X, pady=(0, 5))
        
        ttk.Label(toolbar_frame, text="Usuarios Registrados:", font=("Segoe UI", 10, "bold")).pack(side=tk.LEFT)
        
        # BUSCADOR
        search_container = ttk.Frame(toolbar_frame)
        search_container.pack(side=tk.RIGHT)
        
        ttk.Label(search_container, text="🔍 Buscar:").pack(side=tk.LEFT, padx=5)
        self.entry_busqueda = ttk.Entry(search_container, width=30)
        self.entry_busqueda.pack(side=tk.LEFT, padx=5)
        self.entry_busqueda.bind('<KeyRelease>', lambda e: self.filtrar_usuarios())
        
        # Botones de Acción
        action_frame = ttk.Frame(main_frame)
        action_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=10)
        
        btn_toggle = ttk.Button(action_frame, text="⏯️ Bloquear/Desbloquear", command=self.toggle_status)
        btn_toggle.pack(side=tk.LEFT, padx=5)
        
        btn_edit = ttk.Button(action_frame, text="✏️ Editar Nombre", command=self.editar_usuario)
        btn_edit.pack(side=tk.LEFT, padx=5)
        
        btn_edit_id = ttk.Button(action_frame, text="🆔 Editar ID", command=self.editar_id)
        btn_edit_id.pack(side=tk.LEFT, padx=5)
        
        btn_delete = ttk.Button(action_frame, text="🗑️ Eliminar Definitivamente", command=self.eliminar_usuario)
        btn_delete.pack(side=tk.RIGHT, padx=5)

        # Lista de Usuarios
        list_frame = ttk.Frame(main_frame)
        list_frame.pack(fill=tk.BOTH, expand=True)
        
        # Tabla
        columns = ('estado', 'nombre', 'id', 'fecha')
        self.tree = ttk.Treeview(list_frame, columns=columns, show='headings', selectmode='browse')
        
        self.tree.heading('estado', text='Estado')
        self.tree.heading('nombre', text='Nombre')
        self.tree.heading('id', text='ID Dispositivo')
        self.tree.heading('fecha', text='Última Modificación')
        
        self.tree.column('estado', width=80, anchor='center')
        self.tree.column('nombre', width=200)
        self.tree.column('id', width=150)
        self.tree.column('fecha', width=120)
        
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.tree.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        # Menú contextual
        self.menu = tk.Menu(root, tearoff=0)
        self.menu.add_command(label="Bloquear/Desbloquear", command=self.toggle_status)
        self.menu.add_command(label="Editar Nombre", command=self.editar_usuario)
        self.menu.add_command(label="Editar ID", command=self.editar_id)
        self.menu.add_separator()
        self.menu.add_command(label="Eliminar", command=self.eliminar_usuario)
        
        self.tree.bind("<Button-3>", self.mostrar_menu)
        
        self.cargar_usuarios()

    def mostrar_menu(self, event):
        try:
            self.menu.tk_popup(event.x_root, event.y_root)
        finally:
            self.menu.grab_release()

    def cargar_usuarios(self, filtro=None):
        for i in self.tree.get_children():
            self.tree.delete(i)
            
        if not os.path.exists(self.archivo_json):
            return
            
        try:
            with open(self.archivo_json, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for user in data.get('users', []):
                    estado = "✅ ACTIVO" if user.get('active', True) else "⛔ BLOQUEADO"
                    
                    # Filtro
                    if filtro:
                        search_text = (user['name'] + user['id']).lower()
                        if filtro.lower() not in search_text:
                            continue

                    self.tree.insert('', tk.END, values=(
                        estado,
                        user['name'],
                        user['id'], 
                        user.get('date', '-')
                    ), tags=('blocked' if not user.get('active', True) else 'active',))
                    
            self.tree.tag_configure('blocked', foreground='red')
            self.tree.tag_configure('active', foreground='black')
                        
        except Exception as e:
            messagebox.showerror("Error", f"Error al cargar usuarios: {e}")

    def filtrar_usuarios(self):
        termino = self.entry_busqueda.get().strip()
        self.cargar_usuarios(filtro=termino)

    def leer_json(self):
        if not os.path.exists(self.archivo_json):
            return {'users': []}
        try:
            with open(self.archivo_json, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {'users': []}

    def guardar_json(self, data):
        data['last_updated'] = datetime.now().isoformat()
        try:
            with open(self.archivo_json, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            self.cargar_usuarios()
            return True
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo guardar: {e}")
            return False

    def agregar_usuario(self):
        nombre = self.entry_nombre.get().strip()
        user_id = self.entry_id.get().strip()
        
        if not nombre or not user_id:
            messagebox.showwarning("Atención", "Falta Nombre o ID")
            return
            
        data = self.leer_json()
        
        # Verificar duplicados
        for u in data['users']:
            if u['id'] == user_id:
                messagebox.showerror("Error", f"El ID ya existe: Pertenece a {u['name']}")
                return
        
        nuevo_usuario = {
            'id': user_id,
            'name': nombre,
            'active': True,
            'date': datetime.now().strftime("%Y-%m-%d %H:%M")
        }
        
        data['users'].append(nuevo_usuario)
        
        if self.guardar_json(data):
            self.entry_nombre.delete(0, tk.END)
            self.entry_id.delete(0, tk.END)
            messagebox.showinfo("Éxito", f"Usuario autorizado.\n\n⚠️ RECUERDA SUBIR EL ARCHIVO 'usuarios.json'")

    def get_selected_id(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("Selección", "Selecciona un usuario de la lista")
            return None
        return self.tree.item(selected[0])['values'][2] # ID es la columna 2

    def toggle_status(self):
        user_id = self.get_selected_id()
        if not user_id: return
        
        data = self.leer_json()
        found = False
        
        for u in data['users']:
            if str(u['id']) == str(user_id):
                current_status = u.get('active', True)
                u['active'] = not current_status
                u['date'] = datetime.now().strftime("%Y-%m-%d %H:%M")
                found = True
                new_status = "BLOQUEADO" if u['active'] == False else "ACTIVADO"
                break
                
        if found and self.guardar_json(data):
            messagebox.showinfo("Estado Cambiado", f"El usuario ha sido {new_status}")

    def editar_usuario(self):
        user_id = self.get_selected_id()
        if not user_id: return
        
        data = self.leer_json()
        user = next((u for u in data['users'] if str(u['id']) == str(user_id)), None)
        
        if user:
            new_name = simpledialog.askstring("Editar Nombre", "Nuevo nombre:", initialvalue=user['name'])
            if new_name and new_name.strip():
                user['name'] = new_name.strip()
                user['date'] = datetime.now().strftime("%Y-%m-%d %H:%M")
                self.guardar_json(data)

    def editar_id(self):
        user_id = self.get_selected_id()
        if not user_id: return
        
        data = self.leer_json()
        user = next((u for u in data['users'] if str(u['id']) == str(user_id)), None)
        
        if user:
            new_id = simpledialog.askstring("Editar ID Dispositivo", 
                                          f"Nuevo ID para {user['name']}:", 
                                          initialvalue=user['id'])
            
            if new_id and new_id.strip():
                new_id = new_id.strip()
                
                # Si el ID no cambió, no hacer nada
                if new_id == user['id']:
                    return

                # Verificar si el NUEVO ID ya lo tiene otra persona
                for u in data['users']:
                    if u['id'] == new_id:
                        messagebox.showerror("Error", f"El ID '{new_id}' ya está registrado a nombre de: {u['name']}")
                        return
                
                user['id'] = new_id
                user['date'] = datetime.now().strftime("%Y-%m-%d %H:%M")
                if self.guardar_json(data):
                    messagebox.showinfo("Éxito", "ID actualizado correctamente.")

    def eliminar_usuario(self):
        user_id = self.get_selected_id()
        if not user_id: return
        
        confirm = messagebox.askyesno("ELIMINAR DEFINITIVAMENTE", 
                                    "¿Estás seguro de borrar este registro?\n\nSi solo quieres quitar acceso temporalmente, usa la opción 'Bloquear'.")
        if not confirm: return
        
        data = self.leer_json()
        data['users'] = [u for u in data['users'] if str(u['id']) != str(user_id)]
        
        if self.guardar_json(data):
            messagebox.showinfo("Eliminado", "Usuario eliminado de la base de datos.")

if __name__ == "__main__":
    root = tk.Tk()
    try:
        # Intentar mejorar resolución en Windows
        from ctypes import windll
        windll.shcore.SetProcessDpiAwareness(1)
    except:
        pass
    app = GestorUsuariosApp(root)
    root.mainloop()
