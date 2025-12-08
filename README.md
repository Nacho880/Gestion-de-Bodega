# 🏪 Sistema de Gestión de Ferretería

Sistema web desarrollado en Django para la gestión integral de una ferretería, incluyendo inventario, ventas, compras, proveedores y reportes.

**Desarrollado por:** [Cristopher Retamales Pedreros, Bianca Torres Rivadeneira, Paz Pérez Avaria, Ignacio Ortega Bustamante, Maximiliano Campos Camimil]

## 📋 Características

- **Gestión de Productos**: Inventario con stock mínimo, categorías
- **Ventas**: Registro de ventas, boletas, reembolsos
- **Compras**: Gestión de compras a proveedores
- **Proveedores**: Catálogo de proveedores y productos
- **Usuarios**: Sistema de autenticación y perfiles
- **Estadísticas**: Reportes y análisis de ventas
- **Categorías**: Organización de productos por categorías

## 🛠️ Tecnologías

- **Backend**: Django 4.x
- **Base de Datos**: MySQL
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Control de Versiones**: Git & GitHub

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Python 3.8+**
- **Git**
- **MySQL Server**
- **Editor de código** (VSCode, PyCharm, etc.)

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/Reta-001/management-system.git
cd management-system/proyecto_principal
```

### 2. Crear entorno virtual
```bash
python -m venv venv
```

### 3. Activar entorno virtual
**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 4. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 5. Configurar base de datos
1. Crear una base de datos MySQL llamada `ferreteria_db`
2. Copiar `.env.example` a `.env`
3. Editar `.env` con tus credenciales de base de datos

### 6. Ejecutar migraciones
```bash
python manage.py migrate
```

### 7. Crear superusuario (opcional)
```bash
python manage.py createsuperuser
```

### 8. Ejecutar el servidor
```bash
python manage.py runserver
```

El proyecto estará disponible en: http://127.0.0.1:8000/

## 📁 Estructura del Proyecto

```
proyecto_principal/
├── categoria/          # Gestión de categorías de productos
├── compras/           # Sistema de compras a proveedores
├── estadistica/       # Reportes y estadísticas
├── home/              # Página principal y modelos base
├── producto/          # Gestión de productos
├── proveedor/         # Gestión de proveedores
├── usuario/           # Sistema de usuarios y autenticación
├── venta/             # Sistema de ventas y boletas
└── proyecto_principal/ # Configuración principal de Django
```

## 🔧 Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
DEBUG=True
SECRET_KEY=tu_clave_secreta_aqui
DATABASE_NAME=ferreteria_db
DATABASE_USER=tu_usuario_mysql
DATABASE_PASSWORD=tu_password_mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
```

## 📝 Comandos Útiles

### Desarrollo
```bash
# Ejecutar servidor de desarrollo
python manage.py runserver

# Crear migraciones después de cambios en modelos
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Ejecutar tests
python manage.py test
```

### Git
```bash
# Ver estado del repositorio
git status

# Ver ramas
git branch

# Cambiar de rama
git checkout nombre-rama

# Crear nueva rama
git checkout -b nueva-rama

# Agregar cambios
git add .

# Hacer commit
git commit -m "Descripción del cambio"

# Subir cambios
git push origin nombre-rama
```

## 🤝 Flujo de Trabajo

### Para colaboradores nuevos:
1. Clonar el repositorio
2. Crear rama para tu funcionalidad: `git checkout -b feature/nombre-funcionalidad`
3. Hacer cambios y commits
4. Crear Pull Request en GitHub
5. Esperar revisión y aprobación
6. Fusionar cambios

### Para cambios diarios:
1. Actualizar tu rama: `git pull origin main`
2. Trabajar en tu funcionalidad
3. Hacer commits frecuentes con mensajes claros
4. Subir cambios: `git push origin tu-rama`

## 🚀 Despliegue en Vercel

Este proyecto está configurado para desplegarse fácilmente en Vercel. Sigue estos pasos:

### Prerrequisitos
- Cuenta en [Vercel](https://vercel.com)
- Repositorio en GitHub
- Base de datos configurada (PostgreSQL recomendado para producción)

### Pasos para Desplegar

1. **Subir el proyecto a GitHub**
   ```bash
   git add .
   git commit -m "Preparar proyecto para Vercel"
   git push origin main
   ```

2. **Conectar con Vercel**
   - Ve a [vercel.com](https://vercel.com) e inicia sesión
   - Haz clic en "Add New Project"
   - Importa tu repositorio de GitHub
   - Vercel detectará automáticamente la configuración de Django

3. **Configurar Variables de Entorno en Vercel**
   
   En la configuración del proyecto en Vercel, agrega las siguientes variables de entorno:
   
   ```
   DEBUG=False
   SECRET_KEY=tu_clave_secreta_super_segura_aqui
   DATABASE_URL=postgresql://usuario:password@host:puerto/nombre_db
   ALLOWED_HOSTS=tu-dominio.vercel.app,tu-dominio.com
   ```
   
   **Nota importante**: 
   - Genera una nueva `SECRET_KEY` para producción (nunca uses la de desarrollo)
   - Para `DATABASE_URL`, puedes usar servicios como:
     - [Vercel Postgres](https://vercel.com/storage/postgres)
     - [Supabase](https://supabase.com)
     - [Railway](https://railway.app)
     - [PlanetScale](https://planetscale.com)

4. **Configurar Build Command (opcional)**
   
   En la configuración de Vercel, puedes agregar un Build Command:
   ```
   cd proyecto_principal && python manage.py collectstatic --noinput
   ```

5. **Desplegar**
   - Vercel desplegará automáticamente tu proyecto
   - Una vez completado, recibirás una URL de producción
   - Las migraciones se ejecutarán automáticamente en el primer despliegue

### Ejecutar Migraciones en Vercel

Para ejecutar migraciones en el entorno de producción, puedes usar Vercel CLI:

```bash
# Instalar Vercel CLI
npm i -g vercel

# Iniciar sesión
vercel login

# Ejecutar migraciones
vercel env pull .env.production
cd proyecto_principal
python manage.py migrate
```

O configurar un script de build que ejecute las migraciones automáticamente.

### Archivos de Configuración para Vercel

El proyecto incluye los siguientes archivos para Vercel:
- `vercel.json` - Configuración de Vercel
- `api/index.py` - Handler serverless para Django
- `runtime.txt` - Versión de Python
- `build.sh` - Script de build (opcional)

## 🐛 Solución de Problemas

### Error de base de datos:
- Verificar que MySQL esté corriendo
- Revisar credenciales en `.env`
- Ejecutar `python manage.py migrate`

### Error de dependencias:
- Activar entorno virtual
- Reinstalar: `pip install -r requirements.txt`

### Error de Git:
- Verificar que estés en la rama correcta: `git branch`
- Verificar estado: `git status`

### Errores en Vercel:
- Verificar que todas las variables de entorno estén configuradas
- Revisar los logs de build en el dashboard de Vercel
- Asegurarse de que `DATABASE_URL` esté correctamente formateada
- Verificar que `SECRET_KEY` esté configurada

## 📞 Contacto y Soporte

- **Repositorio**: https://github.com/Reta-001/management-system
- **Issues**: Usar la sección Issues de GitHub para reportar bugs o solicitar funcionalidades

## 🙏 Agradecimientos

Agradecemos especialmente a nuestro socio por confiar en nuestro equipo para el desarrollo de este sistema de gestión. Su visión y requerimientos fueron fundamentales para crear una solución que se adapta perfectamente a las necesidades de su negocio.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

**¡Gracias por contribuir al proyecto! 🎉** 