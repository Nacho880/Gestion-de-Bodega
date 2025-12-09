# 🎬 Guion para Video Explicativo - Sistema de Gestión de Inventario

## INTRODUCCIÓN (0:00 - 1:00)

Hola y bienvenidos. Hoy les voy a presentar nuestro **Sistema de Gestión de Inventario**, una solución completa desarrollada en Django para la administración integral de una ferretería o negocio de retail.

Este sistema permite gestionar productos, ventas, compras, proveedores, usuarios y mucho más, todo desde una interfaz web moderna y fácil de usar.

Vamos a ver paso a paso todas las funcionalidades principales y cómo utilizarlas de manera eficiente.

---

## 1. INICIO DE SESIÓN Y AUTENTICACIÓN (1:00 - 2:00)

Primero, necesitamos iniciar sesión en el sistema. El sistema cuenta con un robusto sistema de autenticación y roles.

Aquí podemos ver la pantalla de login. Para acceder, simplemente ingresamos nuestro correo electrónico y contraseña.

[**Mostrar pantalla de login**]

Una vez dentro, llegamos a la página principal, que muestra un resumen general del sistema.

[**Mostrar dashboard principal**]

---

## 2. SISTEMA DE ROLES Y PERMISOS (2:00 - 3:30)

El sistema cuenta con tres niveles de roles:

**Dueño**: Tiene acceso completo, puede gestionar todos los perfiles, asignar roles y eliminar cualquier usuario. Solo los Dueños pueden ver y administrar el módulo de Perfiles.

**Administrador**: Puede gestionar perfiles excepto Dueños, asignar el rol de Administrador y eliminar solo usuarios del sistema.

**Usuario del sistema**: Tiene acceso básico a todas las funcionalidades principales, pero no puede gestionar perfiles de otros usuarios.

En la barra lateral, los usuarios con permisos administrativos verán opciones adicionales como "Perfiles" y "Configuración".

---

## 3. MÓDULO DE PRODUCTOS (3:30 - 5:00)

Vamos al módulo de **Productos**. Aquí podemos ver todos los productos registrados en el inventario.

[**Mostrar lista de productos**]

Al hacer clic en "Agregar Producto", podemos crear un nuevo producto. El formulario nos permite ingresar:
- Nombre del producto
- Código SKU (único)
- Stock actual
- Stock mínimo (para alertas)
- Precio de venta
- Categorías (puede tener múltiples)
- Descripción

[**Mostrar formulario de agregar producto**]

Al guardar, el producto queda registrado. Podemos editar o eliminar productos en cualquier momento. También podemos buscar productos usando el buscador integrado.

Los productos con stock bajo del mínimo aparecerán destacados para que los identifiquemos rápidamente.

---

## 4. MÓDULO DE CATEGORÍAS (5:00 - 5:45)

Las **Categorías** nos ayudan a organizar nuestros productos de manera flexible. Un producto puede pertenecer a múltiples categorías.

[**Mostrar módulo de categorías**]

Aquí podemos crear nuevas categorías, editarlas o eliminarlas. Las categorías nos facilitan filtrar y buscar productos según nuestras necesidades organizacionales.

---

## 5. MÓDULO DE PROVEEDORES (5:45 - 7:00)

El módulo de **Proveedores** es fundamental para gestionar nuestras relaciones comerciales.

[**Mostrar lista de proveedores**]

Al agregar un proveedor, registramos:
- Nombre del proveedor
- Información de contacto
- Datos relevantes del negocio

Pero además, podemos asociar productos a cada proveedor con precios personalizados.

[**Mostrar agregar proveedor y producto-proveedor**]

Esto es muy útil porque el mismo producto puede tener diferentes precios según el proveedor, y al momento de crear una compra, podemos seleccionar rápidamente de qué proveedor compramos y a qué precio.

---

## 6. MÓDULO DE SUCURSALES (7:00 - 7:30)

Las **Sucursales** representan las diferentes ubicaciones de nuestro negocio: bodegas y tiendas.

[**Mostrar módulo de sucursales**]

Podemos crear y gestionar múltiples sucursales. Esto es importante porque:
- Cada usuario puede estar asignado a una sucursal
- Al crear entradas y salidas, podemos especificar de qué bodega sale o a qué tienda llega

---

## 7. MÓDULO DE ENTRADAS (COMPRAS) (7:30 - 10:00)

Ahora vamos con el módulo de **Entradas**, que representa las compras que realizamos a nuestros proveedores.

[**Mostrar lista de entradas**]

Al crear una nueva entrada, el proceso es el siguiente:

1. Seleccionamos el proveedor
2. Seleccionamos la bodega de destino y la tienda de llegada
3. Agregamos los productos que vamos a comprar, indicando cantidad y precio
4. El sistema calcula automáticamente los totales

[**Mostrar formulario de nueva entrada**]

**Punto importante sobre el stock**: Al crear una entrada, el stock NO se modifica todavía. El stock solo se actualiza cuando **confirmamos la entrega** del proveedor.

[**Mostrar botón de confirmar entrega**]

Una vez confirmada la entrega, el stock se suma automáticamente al inventario.

También podemos **editar entradas** que ya fueron entregadas.

[**Mostrar modal de editar entrada**]

Al editar, vemos indicadores visuales muy claros:
- **Badges amarillos** indican unidades que se van a reducir
- **Badges verdes** indican unidades que se van a agregar
- Las filas cambian de color para visualización rápida

Si aumentamos la cantidad, se suma al stock. Si reducimos, se resta del stock. Todo se recalcula automáticamente.

Podemos eliminar entradas, y si estaban entregadas, el stock se restaura automáticamente.

---

## 8. MÓDULO DE SALIDAS (VENTAS) (10:00 - 12:30)

El módulo de **Salidas** gestiona todas nuestras ventas.

[**Mostrar lista de ventas**]

Al crear una nueva salida:

1. Agregamos los productos que se van a vender
2. Indicamos la cantidad de cada uno
3. El sistema valida que tengamos suficiente stock disponible
4. Seleccionamos la bodega de salida y la tienda de destino

[**Mostrar formulario de nueva salida**]

**Punto clave sobre el stock en salidas**: A diferencia de las entradas, al crear una salida, el stock se **resta inmediatamente**. Esto es importante porque garantiza que no vendamos productos que no tenemos.

Una vez creada la salida, podemos generar una boleta haciendo clic en el botón correspondiente.

[**Mostrar boleta**]

Cuando la salida se entrega al cliente, podemos confirmar el envío. Esto cambia el estado de la venta, pero no modifica el stock porque ya se restó al momento de crear.

También podemos **editar salidas** con el mismo sistema visual de indicadores que vimos en las entradas.

[**Mostrar modal de editar salida**]

- Si reducimos la cantidad, el stock se devuelve al inventario (reembolso)
- Si aumentamos la cantidad, se resta stock adicional si hay disponibilidad
- El sistema muestra el total a reembolsar si aplica

Podemos eliminar salidas, y el stock se devuelve automáticamente al inventario.

---

## 9. MÓDULO DE ESTADÍSTICAS (12:30 - 13:15)

El módulo de **Estadísticas** nos proporciona reportes y análisis de nuestras ventas y compras.

[**Mostrar dashboard de estadísticas**]

Aquí podemos ver gráficos y métricas que nos ayudan a entender el rendimiento de nuestro negocio: totales de ventas, compras, productos más vendidos, y otros indicadores clave.

---

## 10. GESTIÓN DE PERFILES (Solo Dueños/Administradores) (13:15 - 15:00)

Si tenemos permisos de administrador, podemos acceder al módulo de **Perfiles**.

[**Mostrar lista de perfiles**]

Los **Dueños** pueden:
- Ver todos los perfiles
- Agregar nuevos usuarios
- Editar cualquier perfil (cambiar nombre, email, sucursal y roles)
- Eliminar cualquier usuario

Los **Administradores** pueden:
- Ver y gestionar perfiles, excepto Dueños
- Agregar usuarios (pero solo asignar rol de Administrador o Usuario del sistema)
- Eliminar solo usuarios del sistema

Al agregar un perfil nuevo, podemos:
- Asignar nombre, email y contraseña
- Seleccionar la sucursal donde trabaja (opcional)
- Asignar roles (opcional; si no seleccionamos ninguno, será Usuario del sistema)

[**Mostrar modal de agregar perfil**]

En el modal de editar perfil, podemos cambiar la sucursal y los roles asignados.

[**Mostrar modal de editar perfil**]

El sistema tiene validaciones inteligentes:
- No puedes eliminar tu propio perfil
- No puedes quitar el rol de Dueño si solo queda un Dueño en el sistema
- Los Administradores no pueden eliminar perfiles de Dueños

---

## 11. CONFIGURACIÓN PERSONAL (15:00 - 16:00)

Cada usuario puede gestionar su propio perfil en **Configuración**.

[**Mostrar página de configuración**]

Aquí podemos:
- Actualizar nuestro nombre y correo electrónico
- Cambiar nuestra contraseña

El cambio de contraseña tiene un sistema de seguridad adicional: requiere verificación por email.

[**Mostrar proceso de cambio de contraseña**]

El proceso es:
1. Marcamos la casilla "Cambiar contraseña"
2. Ingresamos la nueva contraseña y la confirmación
3. El sistema envía un código de 6 dígitos a nuestro correo
4. Ingresamos el código para verificar
5. Guardamos los cambios

La contraseña debe cumplir con ciertos requisitos de seguridad que se muestran claramente en pantalla.

---

## 12. MODO OSCURO Y DISEÑO RESPONSIVE (16:00 - 16:30)

El sistema cuenta con un **modo oscuro** que puede activarse desde el menú de usuario, ideal para trabajar en diferentes condiciones de iluminación.

[**Mostrar cambio a modo oscuro**]

Además, la interfaz es completamente **responsive**, lo que significa que se adapta perfectamente a dispositivos móviles, tablets y escritorio.

[**Mostrar en diferentes tamaños de pantalla**]

---

## 13. CARACTERÍSTICAS TÉCNICAS Y SEGURIDAD (16:30 - 17:15)

Para los más técnicos, este sistema está desarrollado con:
- **Backend**: Django 5.x
- **Base de datos**: MySQL o PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript moderno, Bootstrap 5
- **Despliegue**: Compatible con Vercel y otros servicios serverless

La seguridad está garantizada mediante:
- Autenticación basada en sesiones
- Roles y permisos granulares
- Verificación por email para cambios sensibles
- Validaciones tanto en frontend como backend

---

## CONCLUSIÓN (17:15 - 18:00)

Como hemos visto, este **Sistema de Gestión de Inventario** es una solución completa que cubre todas las necesidades de administración de un negocio:

✅ Gestión completa de productos e inventario  
✅ Control de compras y ventas con gestión automática de stock  
✅ Sistema robusto de roles y permisos  
✅ Reportes y estadísticas  
✅ Interfaz moderna y fácil de usar  
✅ Diseño responsive y modo oscuro  

Es un sistema profesional, seguro y escalable que puede adaptarse a diferentes tipos de negocios.

Si tienen alguna pregunta o necesitan más información sobre alguna funcionalidad específica, no duden en contactarnos.

¡Gracias por su atención!

---

## NOTAS PARA EL PRESENTADOR:

- **Duración estimada**: 15-20 minutos
- **Ritmo**: Hablar claro y pausado, dar tiempo para mostrar cada funcionalidad
- **Demostraciones**: Hacer las acciones reales en el sistema mientras explicas
- **Capturas**: Si es un video tutorial, usar zoom o resaltar áreas importantes
- **Puntos clave**: Enfatizar la gestión automática de stock y el sistema de roles
- **Personalización**: Adapta el tiempo y el nivel de detalle según tu audiencia
