# Page Timer Extension

Extensión para navegador que rastrea el tiempo que pasas en cada página web.

## Instalación

### Google Chrome

1. Abre `chrome://extensions/` y activa el **Modo de desarrollador**
2. Haz clic en **Cargar extensión sin empaquetar** y selecciona la carpeta `src`
3. Tras editar el código, pulsa el botón de recarga de la extensión

### Mozilla Firefox

1. Ejecuta `./build.sh` (requiere `jq`): genera `dist/firefox` con el manifest de Firefox
2. Abre `about:debugging#/runtime/this-firefox`
3. Haz clic en **Cargar complemento temporal...** y selecciona `dist/firefox/manifest.json`
4. Tras editar el código, vuelve a ejecutar `./build.sh` y pulsa **Recargar**

> **Nota para Firefox:** Las extensiones temporales se eliminan al cerrar el navegador. Para una instalación permanente, necesitas firmar la extensión a través de [addons.mozilla.org](https://addons.mozilla.org).

## Publicación

`./build.sh --zip` genera en `dist/` los zip listos para subir a Chrome Web Store y addons.mozilla.org. El workflow de GitHub hace lo mismo al publicar un tag `v*`, valida el paquete de Firefox con `web-ext lint` y adjunta los zip a la release.

## Uso

Haz clic en el icono de la extensión para ver el tiempo acumulado en la página actual.

## Estructura del Proyecto

```
PageTimerExtention/
├── src/                    extensión de Chrome, se carga tal cual
│   ├── manifest.json
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css       estilos propios del popup
│   │   ├── popup.js
│   │   ├── base.css        estilos compartidos, iguales en todas las extensiones
│   │   └── common.js       tema, traducciones y utilidades compartidas
│   ├── background/
│   ├── content/
│   ├── fonts/              Fraunces e IBM Plex (licencia OFL)
│   ├── icons/
│   └── _locales/
├── manifest.firefox.json   cambios del manifest para Firefox (null elimina una clave)
├── build.sh                genera dist/ y los zip para las tiendas
└── README.md
```
