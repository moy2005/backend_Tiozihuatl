# 📘 Módulo de Usuarios — Sistema Integral Tiozihuatl

## Submódulos
- Autenticación (`/api/auth`)
- Recuperación de contraseña (`/api/password`)
- Perfil de usuario (`/api/users/profile`)
- Administración de usuarios y roles (`/api/users/admin`)

---

## Endpoints principales

| Método | Ruta                       | Descripción               | Rol           |
|--------|----------------------------|---------------------------|---------------|
| POST   | /api/auth/register         | Registro público          | Visitante     |
| POST   | /api/auth/login            | Inicio de sesión          | Todos         |
| POST   | /api/password/forgot       | Solicitud de recuperación | Todos         |
| GET    | /api/users/profile/:id     | Obtener perfil            | Usuario       |
| PUT    | /api/users/profile/:id     | Actualizar perfil         | Usuario       |
| GET    | /api/users/admin           | Listar usuarios           | Administrador |
| POST   | /api/users/admin           | Crear usuario             | Administrador |
| PUT    | /api/users/admin/:id       | Editar usuario            | Administrador |
| DELETE | /api/users/admin/:id       | Desactivar usuario        | Administrador |
| GET    | /api/users/admin/roles/all | Listar roles              | Administrador |

