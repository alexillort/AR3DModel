# Modelo AR

Aplicación web para visualizar modelos de Sketchfab y archivos `.glb` o descargas glTF `.zip` en realidad aumentada desde un celular compatible.

## Publicar en GitHub Pages

1. Crea un repositorio y sube `index.html`, `app.js` y este `README.md` a la raíz.
2. En **Settings → Pages**, elige **Deploy from a branch**, rama **main** y carpeta **/(root)**.
3. Abre la dirección HTTPS que GitHub Pages genere en Chrome para Android o Safari para iPhone.

No requiere instalación, compilación ni variables de entorno. El navegador debe poder cargar `model-viewer` y JSZip desde las URL CDN incluidas en `index.html`.

## Uso

- **Sketchfab:** pega el enlace del modelo y pulsa **Abrir**. Si hay un token guardado, la app descarga el modelo con sus texturas y lo prepara para AR automáticamente; si no, muestra el visor de Sketchfab y el botón **Agregar token para ver en AR**.
- **Token API:** escríbelo una sola vez y pulsa **Guardar**. Para cambiarlo o borrarlo usa **Configurar** o el botón ⚙ de la parte superior. Si Sketchfab lo rechaza, se borra y se vuelve a pedir.
- **Archivo:** selecciona un `.glb` o el `.zip` glTF descargado de Sketchfab. El ZIP se convierte a GLB en el navegador con todas sus texturas.
- **AR:** toca **Ver en AR** en un celular compatible. Android usa WebXR (Chrome con Servicios de Google Play para RA), que muestra las texturas con el mismo motor del visor. iPhone usa Quick Look con el USDZ de Sketchfab o, si no existe, uno generado a partir del GLB. El funcionamiento final depende del dispositivo, navegador y modelo.

### Texturas

Muchos modelos de Sketchfab usan materiales `KHR_materials_pbrSpecularGlossiness`, que el visor actual ya no soporta y que hacían que el modelo saliera gris o no cargara. La app los convierte a metallic-roughness al cargar: la textura de color pasa a `baseColorTexture` y el brillo (canal alfa) se convierte en una textura de rugosidad.

### Privacidad del token

El token se guarda en el `localStorage` de este navegador (solo en tu dispositivo) y se envía únicamente a `api.sketchfab.com`. No se guarda en el repositorio ni en ningún servidor de esta aplicación. Cualquiera con acceso a este navegador podría leerlo: en equipos compartidos usa **Borrar token** al terminar. **No publiques ni compartas tu token:** Sketchfab indica que permite realizar cambios en tu cuenta.

Los modelos descargados de Sketchfab conservan el enlace a su autor, licencia y página de origen cuando la API proporciona esos datos. Respeta la licencia del modelo al reutilizarlo.

## Archivos

- `index.html`: interfaz adaptable a móvil.
- `app.js`: token guardado, validación de enlaces, solicitud de descarga, conversión glTF ZIP → GLB (con conversión de materiales) y visor AR.

## Limitaciones

- Los archivos comprimidos tienen un límite de 90 MB y el contenido descomprimido de 180 MB para evitar agotar la memoria del celular.
- Algunas extensiones glTF o texturas pueden no ser compatibles con el visor. Si falla, prueba un GLB optimizado.
- Un enlace de Sketchfab sin permiso de descarga solo muestra su visor incrustado; no permite convertir el modelo a AR desde la app.
- Android no usa Scene Viewer porque no puede abrir modelos cargados en memoria (`blob:`); se necesita WebXR.
