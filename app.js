'use strict';
const $ = id => document.getElementById(id);
const ids = ['linkForm','link','personalToken','file','viewer','empty','error','source','actions','status','stageTitle','attribution','open',
  'tokenSaved','tokenEditor','tokenEdit','tokenSave','tokenClear','tokenCancel','settingsBtn','loadAR'];
const el = Object.fromEntries(ids.map(id => [id, $(id)]));
const {linkForm,link,personalToken,file,viewer,empty,error,source,actions,status,stageTitle,attribution,open} = el;

const MAX_ZIP = 90 * 1024 * 1024, MAX_UNZIPPED = 180 * 1024 * 1024;
const TOKEN_KEY = 'ar3dmodel.sketchfabToken';
const SPEC_GLOSS = 'KHR_materials_pbrSpecularGlossiness';
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let objectUrls = [], currentUid = null, processing = false;

/* ---------- Token guardado en el navegador ---------- */
function readToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } }
function writeToken(value) { try { value ? localStorage.setItem(TOKEN_KEY, value) : localStorage.removeItem(TOKEN_KEY); } catch {} }
let apiToken = readToken();

function renderToken(editing = false) {
  const has = !!apiToken;
  el.tokenSaved.classList.toggle('hidden', !has || editing);
  el.tokenEditor.classList.toggle('hidden', has && !editing);
  el.tokenClear.classList.toggle('hidden', !has);
  el.tokenCancel.classList.toggle('hidden', !has);
  personalToken.placeholder = has ? 'Nuevo token' : 'Token API';
  if (editing) personalToken.focus();
}
function saveTokenFromInput() {
  const pasted = personalToken.value.trim();
  if (!pasted) return true;
  if (!/^[\w-]{10,}$/.test(pasted)) { error.textContent = 'El formato del token no es válido.'; return false; }
  apiToken = pasted; writeToken(pasted); personalToken.value = ''; error.textContent = '';
  return true;
}
el.tokenSave.addEventListener('click', () => {
  if (!personalToken.value.trim()) { renderToken(false); return; }
  if (saveTokenFromInput()) { renderToken(false); status.textContent = 'Token guardado'; setTimeout(() => status.textContent === 'Token guardado' && (status.textContent = ''), 2000);
    if (currentUid) loadDownload(currentUid); }
});
personalToken.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.tokenSave.click(); } });
el.tokenEdit.addEventListener('click', () => renderToken(true));
el.settingsBtn.addEventListener('click', () => { renderToken(true); el.tokenEditor.scrollIntoView({behavior: 'smooth', block: 'center'}); });
el.tokenCancel.addEventListener('click', () => { personalToken.value = ''; renderToken(false); });
el.tokenClear.addEventListener('click', () => { apiToken = ''; writeToken(''); personalToken.value = ''; renderToken(false); updateLoadButton(); });

/* ---------- Utilidades ---------- */
function parseSketch(value) {
  let u; try { u = new URL(value); } catch { return null; }
  if (u.protocol !== 'https:' || !['sketchfab.com','www.sketchfab.com'].includes(u.hostname.toLowerCase())) return null;
  const parts = u.pathname.split('/').filter(Boolean);
  let uid = null;
  if (parts[0] === '3d-models' && parts[1]) uid = parts[1].match(/([a-f0-9]{32})$/i)?.[1];
  else if (parts[0] === 'models' && parts[1]) uid = parts[1].match(/^([a-f0-9]{32})$/i)?.[1];
  return uid?.toLowerCase() || null;
}
function release() { for (const url of objectUrls) URL.revokeObjectURL(url); objectUrls = []; }
function clean() {
  release(); viewer.replaceChildren(); viewer.classList.remove('hidden'); empty.classList.add('hidden');
  attribution.classList.add('hidden'); attribution.replaceChildren(); actions.classList.add('hidden');
  error.textContent = ''; status.textContent = '';
}
function blobUrl(data, type) { const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], {type})); objectUrls.push(url); return url; }
function updateLoadButton() { el.loadAR.classList.toggle('hidden', !currentUid || processing); el.loadAR.textContent = apiToken ? 'Ver en AR' : 'Agregar token'; }

/* ---------- Visor ---------- */
function showModel(url, options = {}) {
  viewer.replaceChildren();
  const mv = document.createElement('model-viewer');
  mv.src = url; mv.alt = options.name || 'Modelo 3D';
  // Scene Viewer (Android) no puede abrir modelos blob:, así que se usa WebXR, que dibuja las texturas
  // con el mismo motor del visor. En iPhone se usa Quick Look (USDZ de Sketchfab o generado a partir del GLB).
  const attrs = {'camera-controls':'', 'touch-action':'pan-y', 'auto-rotate':'', ar:'', 'ar-modes':'webxr quick-look',
    'ar-scale':'auto', 'ar-placement':'floor', 'shadow-intensity':'1', 'environment-image':'neutral', 'tone-mapping':'neutral'};
  for (const [name, value] of Object.entries(attrs)) mv.setAttribute(name, value);
  if (options.iosUrl) mv.setAttribute('ios-src', options.iosUrl);
  mv.innerHTML = '<button slot="ar-button" class="arButton" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><ellipse cx="12" cy="15" rx="9" ry="4"/><path d="M12 3v9"/></svg>Ver en AR</button>';
  mv.addEventListener('error', () => { error.textContent = 'No se pudo mostrar este modelo.'; });
  mv.addEventListener('ar-status', e => { if (e.detail.status === 'failed') error.textContent = 'No se pudo iniciar AR en este dispositivo. En Android usa Chrome con Servicios de Google Play para RA.'; });
  viewer.append(mv);
  stageTitle.textContent = options.name || 'Modelo 3D';
  status.textContent = '';
}
function showEmbed(uid) {
  clean(); currentUid = uid;
  link.value = `https://sketchfab.com/models/${uid}`;
  const frame = document.createElement('iframe');
  frame.src = `https://sketchfab.com/models/${uid}/embed?autostart=1&ui_infos=0&ui_ar=1`;
  frame.title = 'Modelo 3D de Sketchfab'; frame.allow = 'autoplay; fullscreen; xr-spatial-tracking'; frame.allowFullscreen = true;
  viewer.append(frame);
  source.href = link.value; actions.classList.remove('hidden');
  stageTitle.textContent = 'Vista previa';
  history.replaceState(null, '', `#${uid}`);
  updateLoadButton();
}
function metaCredit(meta, uid) {
  attribution.replaceChildren();
  const author = meta.user?.displayName || meta.user?.username || 'Autor en Sketchfab';
  attribution.append(document.createTextNode(`${meta.name || 'Modelo'}, de ${author}. Licencia: ${meta.license?.label || 'consúltala en Sketchfab'}. `));
  const a = document.createElement('a');
  a.href = `https://sketchfab.com/models/${uid}`; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Página del modelo';
  attribution.append(a); attribution.classList.remove('hidden');
}

/* ---------- glTF: recursos, materiales y empaquetado GLB ---------- */
function makeAssetFinder(assets) {
  const enc = new TextEncoder();
  return uri => {
    if (uri.startsWith('data:')) {
      const [head, data] = uri.split(',', 2);
      if (data === undefined) throw Error('Recurso embebido inválido');
      return head.includes(';base64') ? Uint8Array.from(atob(data), c => c.charCodeAt(0)) : enc.encode(decodeURIComponent(data));
    }
    let key = uri.split(/[?#]/)[0];
    try { key = decodeURIComponent(key); } catch {}
    key = key.replace(/\\/g, '/').replace(/^\.\//, '');
    const base = key.split('/').pop();
    const found = assets.get(key) || assets.get(key.toLowerCase()) || assets.get('#name:' + base.toLowerCase());
    if (!found) throw Error(`Falta un recurso del modelo: ${key}`);
    return found;
  };
}
function imageBytes(gltf, image, getAsset) {
  if (image.uri) return getAsset(image.uri);
  const view = gltf.bufferViews?.[image.bufferView];
  if (!view) throw Error('Imagen sin datos');
  const buf = getAsset(gltf.buffers[view.buffer].uri);
  return buf.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
}
function mimeOf(path, bytes) {
  if (bytes && bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes && bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  const p = (path || '').split('?')[0].toLowerCase();
  return p.endsWith('.png') ? 'image/png' : p.endsWith('.webp') ? 'image/webp' : p.endsWith('.ktx2') ? 'image/ktx2' : 'image/jpeg';
}

// Convierte la textura specular-glossiness (alfa = brillo) en una textura metallic-roughness (verde = rugosidad).
async function glossToRoughness(gltf, texInfo, glossFactor, getAsset, assets, cache) {
  const texIndex = texInfo.index;
  if (cache.has(texIndex)) return cache.get(texIndex);
  const tex = gltf.textures[texIndex], image = gltf.images[tex.source];
  const bytes = imageBytes(gltf, image, getAsset);
  const bmp = await createImageBitmap(new Blob([bytes], {type: image.mimeType || mimeOf(image.uri, bytes)}), {premultiplyAlpha: 'none', colorSpaceConversion: 'none'});
  if (bmp.width * bmp.height > 4096 * 4096) { bmp.close?.(); throw Error('Textura demasiado grande'); }
  const canvas = document.createElement('canvas'); canvas.width = bmp.width; canvas.height = bmp.height;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(bmp, 0, 0); bmp.close?.();
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const rough = 255 - Math.round(d[i + 3] * glossFactor); d[i] = 255; d[i + 1] = rough; d[i + 2] = 0; d[i + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  const blob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(Error('No se pudo codificar')), 'image/png'));
  const key = `__roughness_${texIndex}.png`;
  assets.set(key, new Uint8Array(await blob.arrayBuffer()));
  const newImage = gltf.images.push({uri: key, mimeType: 'image/png'}) - 1;
  const newTex = {source: newImage}; if (tex.sampler !== undefined) newTex.sampler = tex.sampler;
  const idx = gltf.textures.push(newTex) - 1;
  cache.set(texIndex, idx);
  return idx;
}

// El visor actual (three.js / model-viewer 4) ya no soporta KHR_materials_pbrSpecularGlossiness,
// que usan muchos modelos de Sketchfab: sin esta conversión salen grises o no cargan.
async function convertSpecGloss(gltf, assets) {
  const used = gltf.extensionsUsed || [];
  if (!used.includes(SPEC_GLOSS) && !(gltf.materials || []).some(m => m.extensions?.[SPEC_GLOSS])) return;
  const getAsset = makeAssetFinder(assets), cache = new Map();
  for (const mat of gltf.materials || []) {
    const sg = mat.extensions?.[SPEC_GLOSS];
    if (!sg) continue;
    const pbr = mat.pbrMetallicRoughness = mat.pbrMetallicRoughness || {};
    if (sg.diffuseFactor) pbr.baseColorFactor = sg.diffuseFactor;
    if (sg.diffuseTexture) pbr.baseColorTexture = sg.diffuseTexture;
    pbr.metallicFactor = 0;
    const gloss = sg.glossinessFactor ?? 1;
    if (sg.specularGlossinessTexture) {
      try {
        const index = await glossToRoughness(gltf, sg.specularGlossinessTexture, gloss, getAsset, assets, cache);
        pbr.metallicRoughnessTexture = {index, ...(sg.specularGlossinessTexture.texCoord ? {texCoord: sg.specularGlossinessTexture.texCoord} : {})};
        pbr.roughnessFactor = 1;
      } catch { pbr.roughnessFactor = Math.min(1, Math.max(0.35, 1 - gloss * 0.5)); }
    } else pbr.roughnessFactor = 1 - gloss;
    delete mat.extensions[SPEC_GLOSS];
    if (!Object.keys(mat.extensions).length) delete mat.extensions;
  }
  for (const k of ['extensionsUsed', 'extensionsRequired']) {
    if (!gltf[k]) continue;
    gltf[k] = gltf[k].filter(x => x !== SPEC_GLOSS);
    if (!gltf[k].length) delete gltf[k];
  }
}

function packGLB(gltf, assets) {
  const enc = new TextEncoder(), getAsset = makeAssetFinder(assets);
  const chunks = []; let offset = 0;
  const append = bytes => { const padded = (bytes.length + 3) & ~3, start = offset; chunks.push(bytes); if (padded > bytes.length) chunks.push(new Uint8Array(padded - bytes.length)); offset += padded; return start; };
  const bases = (gltf.buffers || []).map(buffer => append(getAsset(buffer.uri)));
  for (const view of gltf.bufferViews || []) { view.byteOffset = bases[view.buffer] + (view.byteOffset || 0); view.buffer = 0; }
  for (const img of gltf.images || []) {
    if (!img.uri) continue;
    const bytes = getAsset(img.uri), start = append(bytes);
    img.mimeType = img.mimeType || mimeOf(img.uri, bytes);
    img.bufferView = (gltf.bufferViews || (gltf.bufferViews = [])).push({buffer: 0, byteOffset: start, byteLength: bytes.length}) - 1;
    delete img.uri;
  }
  gltf.buffers = [{byteLength: offset}];
  const json = enc.encode(JSON.stringify(gltf));
  const jsonSize = (json.length + 3) & ~3, total = 12 + 8 + jsonSize + 8 + offset;
  const out = new Uint8Array(total), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, jsonSize, true); dv.setUint32(16, 0x4e4f534a, true);
  out.fill(32, 20, 20 + jsonSize); out.set(json, 20);
  const pos = 20 + jsonSize; dv.setUint32(pos, offset, true); dv.setUint32(pos + 4, 0x004e4942, true);
  let at = pos + 8; for (const chunk of chunks) { out.set(chunk, at); at += chunk.length; }
  return out;
}

// Revisa un GLB y solo lo reempaqueta si usa materiales que el visor no soporta.
async function normalizeGlb(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw Error('El archivo no es un GLB válido.');
  let pos = 12, gltf = null, bin = null;
  while (pos + 8 <= u8.length) {
    const len = dv.getUint32(pos, true), type = dv.getUint32(pos + 4, true), data = u8.subarray(pos + 8, pos + 8 + len);
    if (type === 0x4e4f534a) gltf = JSON.parse(new TextDecoder().decode(data));
    else if (type === 0x004e4942) bin = data;
    pos += 8 + len;
  }
  if (!gltf) throw Error('GLB sin datos JSON.');
  const needs = (gltf.extensionsUsed || []).includes(SPEC_GLOSS);
  if (!needs) return u8;
  const assets = new Map();
  (gltf.buffers || []).forEach((b, i) => { if (!b.uri) { b.uri = `__glb_bin_${i}`; if (bin) assets.set(b.uri, bin); } });
  await convertSpecGloss(gltf, assets);
  return packGLB(gltf, assets);
}

async function zipToGlb(bytes) {
  if (!window.JSZip) throw Error('No se cargó el descompresor. Comprueba tu conexión y recarga la página.');
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files).filter(n => !zip.files[n].dir && !/(^|\/)__MACOSX\//.test(n));
  const sceneName = names.find(n => /(^|\/)scene\.gltf$/i.test(n)) || names.find(n => /\.gltf$/i.test(n));
  if (!sceneName) {
    const glbName = names.find(n => /\.glb$/i.test(n));
    if (glbName) return normalizeGlb(await zip.file(glbName).async('uint8array'));
    throw Error('La descarga no contiene un archivo glTF compatible.');
  }
  const base = sceneName.slice(0, sceneName.lastIndexOf('/') + 1);
  const scene = JSON.parse(await zip.file(sceneName).async('string'));
  const assets = new Map(); let total = 0;
  for (const name of names) {
    if (name === sceneName) continue;
    const data = await zip.files[name].async('uint8array');
    total += data.byteLength;
    if (total > MAX_UNZIPPED) throw Error('El modelo descomprimido supera el límite de 180 MB para el celular.');
    const key = name.startsWith(base) ? name.slice(base.length) : name;
    assets.set(key, data); assets.set(key.toLowerCase(), data);
    assets.set('#name:' + name.split('/').pop().toLowerCase(), data);
  }
  await convertSpecGloss(scene, assets);
  return packGLB(scene, assets);
}

/* ---------- Descarga desde Sketchfab ---------- */
async function loadDownload(uid) {
  if (processing) return;
  if (!apiToken) { renderToken(true); error.textContent = 'Agrega tu token API de Sketchfab para descargar el modelo con texturas.'; return; }
  processing = true; open.disabled = true; updateLoadButton();
  status.textContent = 'Solicitando descarga…'; error.textContent = '';
  const auth = {headers: {Authorization: `Token ${apiToken}`}};
  try {
    const response = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, auth);
    if (response.status === 401) { apiToken = ''; writeToken(''); renderToken(true); throw Error('Sketchfab rechazó el token guardado. Introdúcelo de nuevo.'); }
    if (response.status === 403 || response.status === 404) throw Error('Sketchfab no permite descargar este modelo con tu cuenta.');
    if (response.status === 429) throw Error('Sketchfab limitó las descargas. Intenta de nuevo en unos minutos.');
    if (!response.ok) throw Error(`Error de Sketchfab (${response.status}).`);
    const links = await response.json();
    const pick = links.glb?.url && (links.glb.size || 0) <= MAX_ZIP ? {kind: 'glb', ...links.glb} : links.gltf?.url ? {kind: 'gltf', ...links.gltf} : null;
    if (!pick) throw Error('El modelo no tiene descarga glTF/GLB disponible.');
    if ((pick.size || 0) > MAX_ZIP) throw Error('El modelo supera el límite de 90 MB.');
    status.textContent = 'Descargando modelo y texturas…';
    const metaP = fetch(`https://api.sketchfab.com/v3/models/${uid}`, auth).then(r => r.ok ? r.json() : null).catch(() => null);
    // En iPhone se guarda el USDZ en memoria: el enlace de Sketchfab caduca pronto.
    const usdzP = isIOS && links.usdz?.url ? fetch(links.usdz.url).then(r => r.ok ? r.blob() : null).catch(() => null) : Promise.resolve(null);
    const archive = await fetch(pick.url);
    if (!archive.ok) throw Error('Falló la descarga autorizada.');
    const bytes = await archive.arrayBuffer();
    if (bytes.byteLength > MAX_ZIP) throw Error('El modelo supera el límite de 90 MB.');
    status.textContent = 'Preparando texturas…';
    const head = new Uint8Array(bytes, 0, 4);
    const isGlb = head[0] === 0x67 && head[1] === 0x6c && head[2] === 0x54 && head[3] === 0x46;
    const glb = isGlb ? await normalizeGlb(bytes) : await zipToGlb(bytes);
    const [meta, usdz] = await Promise.all([metaP, usdzP]);
    if (currentUid !== uid) return;
    const url = blobUrl(glb, 'model/gltf-binary');
    const iosUrl = usdz ? blobUrl(new Blob([usdz], {type: 'model/vnd.usdz+zip'})) : undefined;
    showModel(url, {name: meta?.name || 'Modelo de Sketchfab', iosUrl});
    source.href = `https://sketchfab.com/models/${uid}`; actions.classList.remove('hidden');
    metaCredit(meta || {license: {label: 'Consultar licencia y autor en Sketchfab'}}, uid);
  } catch (e) {
    error.textContent = e instanceof TypeError ? 'No se pudo acceder a la descarga desde este navegador.' : e.message;
  } finally {
    processing = false; open.disabled = false; status.textContent = ''; updateLoadButton();
    if (viewer.querySelector('model-viewer')) el.loadAR.classList.add('hidden');
  }
}

/* ---------- Eventos ---------- */
linkForm.addEventListener('submit', e => {
  e.preventDefault();
  const uid = parseSketch(link.value.trim());
  if (!uid) { error.textContent = 'Pega un enlace válido de modelo de Sketchfab.'; return; }
  if (!saveTokenFromInput()) return;
  renderToken(false);
  showEmbed(uid);
  if (apiToken) loadDownload(uid);
});
el.loadAR.addEventListener('click', () => { if (currentUid) loadDownload(currentUid); });

file.addEventListener('change', async () => {
  const selected = file.files?.[0];
  if (!selected) return;
  if (!/\.(glb|zip)$/i.test(selected.name)) { error.textContent = 'Selecciona un archivo .zip o .glb.'; file.value = ''; return; }
  error.textContent = '';
  if (selected.size > MAX_ZIP) { error.textContent = 'El archivo supera el límite de 90 MB.'; return; }
  try {
    file.disabled = true; status.textContent = 'Preparando archivo…';
    const data = await selected.arrayBuffer();
    const model = /\.zip$/i.test(selected.name) ? await zipToGlb(data) : await normalizeGlb(data);
    clean(); currentUid = null;
    showModel(blobUrl(model, 'model/gltf-binary'), {name: selected.name.replace(/\.(zip|glb)$/i, '')});
    history.replaceState(null, '', location.pathname);
  } catch (e) { error.textContent = e.message || 'No se pudo abrir el archivo.'; }
  finally { file.disabled = false; file.value = ''; status.textContent = ''; }
});

renderToken(false);
const hash = location.hash.slice(1);
if (/^[a-f0-9]{32}$/i.test(hash)) { showEmbed(hash.toLowerCase()); if (apiToken) loadDownload(hash.toLowerCase()); }
