# Modelo AR

Aplicación web para visualizar modelos de Sketchfab y archivos `.glb` o descargas glTF `.zip` en realidad aumentada desde un celular compatible.

## Publicar en GitHub Pages

1. Crea un repositorio y sube `index.html`, `app.js` y este `README.md` a la raíz.
2. En **Settings → Pages**, elige **Deploy from a branch**, rama **main** y carpeta **/(root)**.
3. Abre la dirección HTTPS que GitHub Pages genere en Chrome para Android o Safari para iPhone.

No requiere instalación, compilación ni variables de entorno. El navegador debe poder cargar `model-viewer` y JSZip desde las URL CDN incluidas en `index.html`.

## Uso

- **Sketchfab:** pega el enlace del modelo. Para solicitar su descarga con tu cuenta, introduce tu token API personal y pulsa **Abrir**. La descarga solo funciona si Sketchfab la autoriza para ese modelo.
- **Archivo:** selecciona un `.glb` o el `.zip` glTF descargado de Sketchfab. El ZIP se convierte a GLB en el navegador.
- **AR:** toca **Ver en AR** en un celular compatible. Android usa WebXR cuando está disponible; iPhone utiliza Quick Look si Sketchfab entregó USDZ. El funcionamiento final depende del dispositivo, navegador y modelo.

El token API se mantiene únicamente en la memoria de la pestaña, se envía directamente a `api.sketchfab.com` y no se guarda en el repositorio, almacenamiento local ni servidor de esta aplicación. **No publiques ni compartas tu token:** Sketchfab indica que permite realizar cambios en tu cuenta. Tras terminar, cierra la pestaña. La API puede denegar descargas según los permisos y la configuración del modelo.

Los modelos descargados de Sketchfab conservan el enlace a su autor, licencia y página de origen cuando la API proporciona esos datos. Respeta la licencia del modelo al reutilizarlo.

## Archivos

- `index.html`: interfaz adaptable a móvil.
- `app.js`: validación de enlaces, solicitud de descarga, conversión glTF ZIP → GLB y visor AR.

## Limitaciones

- Los archivos comprimidos tienen un límite de 90 MB y el contenido descomprimido de 180 MB para evitar agotar la memoria del celular.
- Algunas extensiones glTF o texturas pueden no ser compatibles con el visor. Si falla, prueba un GLB optimizado.
- Un enlace de Sketchfab sin permiso de descarga solo muestra su visor incrustado; no permite convertir el modelo a AR desde la app.
