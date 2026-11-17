# JW Tracker — Mi vida espiritual, organizada

Versión independiente basada en el lenguaje visual y la arquitectura inicial del proyecto creado en Lovable.

## Requisitos
- Node.js 20.19+ o 22.12+
- npm

## Ejecutar
```bash
npm install
npm run dev
```
Abre la URL local que indique Vite.

## Instalar y usar sin conexión
- Publica el build de producción en HTTPS (o pruébalo en `localhost`) y abre la aplicación desde un navegador compatible.
- Usa **Instalar app** o la opción de instalación del navegador. En iPhone/iPad, abre el menú Compartir de Safari y selecciona “Añadir a pantalla de inicio”.
- La primera visita debe completarse con conexión para descargar el shell de la aplicación. Después, Inicio, calendario, rutinas, temporizador, servicio, discursos y adjuntos locales, metas, reuniones, estudio, seguimiento, recordatorios, perfil, ajustes y respaldos funcionan sin conexión.
- JW.ORG, la descarga de fuentes web y las actualizaciones requieren conexión. Los datos permanecen en el almacenamiento local del dispositivo; instalar la PWA no sincroniza ni cifra los datos.

## Compilar
```bash
npm run build
npm run preview
```

## Funcionalidades incluidas
- Dashboard de actividades con racha, meta semanal y progreso diario sin métricas duplicadas.
- Calendario mensual con selección de fecha y CRUD de actividades.
- Horarios semanales configurables de reuniones, mostrados en el calendario como eventos recurrentes, y notas personales de preparación.
- Planes de estudio personales con referencias bíblicas, notas y seguimiento de progreso.
- Tareas anónimas de seguimiento del ministerio, sin campos para nombres ni datos de contacto.
- Rutinas espirituales diarias con progreso.
- Temporizador de enfoque con presets 15, 25, 45 y 60 minutos.
- Metas personales configurables de horas de estudio semanales y servicio mensual, con progreso visual en Inicio.
- Historial de rutinas de siete días y racha basada en días con al menos una rutina completada.
- Informe de servicio con tiempo de predicación separado de horas de crédito.
- Cursos bíblicos, publicaciones y videos por registro.
- Documentos para discursos, comentarios, demostraciones y notas; exportación Markdown, detección interactiva de referencias bíblicas y consulta externa en JW.ORG sin reproducir el texto en el panel.
- Adjuntos PDF, DOC y DOCX en discursos (hasta cinco archivos y 20 MB cada uno). Se almacenan localmente en IndexedDB, no se sincronizan y no se incluyen en el respaldo JSON.
- Recordatorios con repetición y activación manual.
- Perfil local, tema claro/oscuro y acentos.
- Interfaz disponible en español, inglés, francés y portugués; el idioma elegido se conserva en este dispositivo.
- Exportación y restauración validada de copias JSON; restaurar reemplaza los datos locales tras confirmación.
- Diseño responsive con navegación móvil.

## Persistencia y límites
Los datos de la aplicación se guardan en `localStorage` del navegador y los adjuntos en IndexedDB, sin cifrado. Los adjuntos son propios de este dispositivo y no se incluyen en las copias JSON. Los seguimientos no tienen campos de identidad ni contacto; aun así, evita incluir datos identificables en notas y protege las copias de seguridad. No hay autenticación, sincronización entre dispositivos ni backend Cloudflare en esta entrega. Los recordatorios se administran dentro de la aplicación; las notificaciones push en segundo plano no están habilitadas.

JW Tracker es un organizador personal independiente, no afiliado ni respaldado por los Testigos de Jehová ni por jw.org.
