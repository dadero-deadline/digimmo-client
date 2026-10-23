// ==UserScript==
// @name         DigiMMO Tweaks
// @namespace    digimmo.client
// @author       dadero-deadline
// @license      MIT
// @version      0.1-dev1
// @description  Optional visual atmosphere and audio enhancements for DigiMMO. Press F10 for settings.
// @match        https://play.digimmo.com.br/*
// @run-at       document-start
// @grant        none
// @inject-into  page
// ==/UserScript==

(() => {
  'use strict';

  // Runs in the page context before the game initializes its audio system.
  const VERSION = '0.1-dev1';
  // Reserve the page before installing any hooks, including across versions.
  // A different build needs a page reload, not a second set of live effects.
  if (window.__digimmoTweaks) return;
  const runtime = { version: VERSION, status: 'initializing' };
  Object.defineProperty(window, '__digimmoTweaks', { value: runtime, configurable: false });
  const STORE_KEY = 'digimmo.client.settings.v1';
  const DEFAULTS = Object.freeze({
    atmosphere: true, weather: true, weatherDensity: 2,
    seasons: true, season: 'auto', fireflies: true,
    dayNight: true, dayMinutes: 0, playerLight: 0.55,
    lights: true, fireEmbers: true, waterSparkles: true,
    objectShadows: true, shadowStyle: 'classic', shadowAlpha: 0.28, shadowHeight: 2.6, moonShadowAlpha: 0.05,
    clouds: true, cloudShadows: true, cloudOpacity: 0.5, cloudShadowOpacity: 0.13,
    cloudDensity: 1, cloudWind: 1, cloudPlayerClear: 1.1,
    wind: true, windStrength: 2,
    reflections: true, reflectionOpacity: 0.38, reflectionWobble: 1,
    audioFix: true, audioLatency: 'playback', stepGain: 0.35, stepLowpass: 2500,
    masterThreshold: -1, sfxThreshold: -6, sfxRatio: 12,
    ambientEnabled: true, ambientVolume: 0.5, uiLanguage: 'auto', uiAdvanced: false, ambientWind: 1,
    ambientBirds: 1, ambientCrickets: 1, ambientFire: 1,
    ambientWater: 1, ambientWaves: 1,
  });
  const RANGES = {
    weatherDensity: [0.1, 3], dayMinutes: [0, 240], playerLight: [0, 2],
    shadowAlpha: [0, 0.75], shadowHeight: [0.5, 5], moonShadowAlpha: [0, 0.5],
    cloudOpacity: [0, 1], cloudShadowOpacity: [0, 0.5], cloudDensity: [0.1, 3],
    cloudWind: [0, 5], cloudPlayerClear: [0, 2], windStrength: [0, 5],
    reflectionOpacity: [0, 1], reflectionWobble: [0, 5],
    stepGain: [0, 2], stepLowpass: [0, 10000], masterThreshold: [-24, 0],
    sfxThreshold: [-24, 0], sfxRatio: [1, 20], ambientVolume: [0, 1.5],
    ambientWind: [0, 2], ambientBirds: [0, 2], ambientCrickets: [0, 2],
    ambientFire: [0, 2], ambientWater: [0, 2], ambientWaves: [0, 2],
  };
  const SETTINGS = { ...DEFAULTS };
  const accepted = (key, value) => {
    if (!(key in DEFAULTS)) return DEFAULTS[key];
    const sample = DEFAULTS[key];
    if (typeof sample === 'boolean') return typeof value === 'boolean' ? value : sample;
    if (typeof sample === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) return sample;
      const [lo, hi] = RANGES[key];
      return Math.max(lo, Math.min(hi, value));
    }
    if (key === 'season') return ['auto', 'spring', 'summer', 'autumn', 'winter'].includes(value) ? value : sample;
    if (key === 'uiLanguage') return ['auto', 'en', 'es', 'pt'].includes(value) ? value : sample;
    if (key === 'audioLatency') return ['playback', 'balanced'].includes(value) ? value : sample;
    if (key === 'shadowStyle') return ['classic', 'grounded'].includes(value) ? value : sample;
    return sample;
  };
  const store = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(SETTINGS)); } catch {} };
  try {
    // Import existing settings after the namespace rename, without retaining old branding.
    const current = localStorage.getItem(STORE_KEY);
    const previousKey = current ? null : Object.keys(localStorage)
      .find(key => key.endsWith('.tweaks.settings.v5'));
    const existing = JSON.parse(current || (previousKey && localStorage.getItem(previousKey)) || 'null');
    if (!existing) localStorage.setItem('digimmo.client.migrated01', '1');
    if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
      for (const k of Object.keys(DEFAULTS)) {
        let value = existing[k];
        // Preserve season choices from older builds while keeping the current UI English.
        if (k === 'season') value = ({ fruehling: 'spring', sommer: 'summer', herbst: 'autumn' })[value] || value;
        SETTINGS[k] = accepted(k, value);
      }
      // Migrate the former default once; retain explicitly different choices.
      if (!localStorage.getItem('digimmo.client.migrated01')) {
        if (existing.moonShadowAlpha === 0.12) SETTINGS.moonShadowAlpha = 0.05;
        store();
        localStorage.setItem('digimmo.client.migrated01', '1');
      }
      if (previousKey) {
        store();
        localStorage.removeItem(previousKey);
      }
    }
  } catch {}


  // Localized overlay; never changes the original game language.
  const TRANSLATIONS = {
  "es": {
    "Quieter, shorter bird calls with longer pauses and varied passages, without a continuous bird loop. Distant daytime traffic replaces the repeating city market voices and fades into quiet wind at night.": "Cantos de aves más suaves y cortos, con pausas más largas y fragmentos variados, sin un bucle continuo de aves. El tráfico lejano durante el día sustituye las voces repetitivas del mercado de la ciudad y da paso suavemente a un viento tranquilo por la noche.",
    "Excerpts, mono, filtering, volume matching and Opus encoding. Short randomized passages with edge fades and long pauses; no continuous bird loop.": "Fragmentos en mono, filtrado, ajuste de volumen y codificación Opus. Pasajes breves aleatorios con fundidos y pausas largas, sin bucle continuo de aves.",
    "Settings and keyboard shortcut help stay inside the menu on smaller windows.": "Los ajustes y la ayuda de atajos de teclado permanecen dentro del menú en ventanas pequeñas.",
    "Window lighting in Fog City, aligned south-facing headlights, and scattered glowing windows and holes in Machine City at night. Weather defaults to 2x. Network areas have no clouds, and Holy Peaks snow fades naturally past the northern plateau. New campfire recording with less low rumble. Fountains fade out over a shorter distance.": "Iluminación de ventanas en Fog City, faros alineados en los coches orientados al sur y algunas ventanas y agujeros iluminados por la noche en Machine City. La densidad del clima predeterminada es 2x. Las zonas de Network no tienen nubes y la nieve de Holy Peaks se desvanece gradualmente al salir de la meseta norte. Nueva grabación de hoguera con menos retumbo grave. Las fuentes dejan de oírse a menor distancia.",
    "Excerpts, mono, filtering, volume matching and Opus encoding. Playback limited to 2.2 seconds with edge fades and long pauses.": "Fragmentos en mono, filtrado, ajuste de volumen y codificación Opus. Reproducción limitada a 2,2 segundos con fundidos y pausas largas.",
    "Previously trimmed, volume matched and encoded to mono Opus. Played as 3.2 second passages with edge fades and long pauses, without a continuous loop.": "Recortado, ajustado de volumen y codificado a Opus mono anteriormente. Se reproduce en pasajes de 3,2 segundos con fundidos y pausas largas, sin bucle continuo.",
    "Sound credits": "Créditos de sonido",
    "Excerpts, mono, filtering, volume matching, edge fades or loop crossfades, Opus encoding.": "Fragmentos, mono, filtrado, ajuste de volumen, fundidos en los extremos o entre bucles y codificación Opus.",
    "Show advanced settings": "Mostrar opciones avanzadas",
    "Español": "Español",
    "World": "Mundo",
    "Audio": "Audio",
    "Changelog": "Cambios",
    "Environment": "Entorno",
    "Sky and lighting": "Cielo e iluminación",
    "World and movement": "Mundo y movimiento",
    "Game audio adjustments": "Sonido del juego",
    "Ambient soundscape": "Ambiente",
    "Enable atmosphere": "Activar ambiente",
    "Toggle all atmosphere effects and ambient sounds": "Activa o desactiva todos los efectos ambientales",
    "Regional weather": "Clima regional",
    "Weather density": "Densidad del clima",
    "Seasonal effects": "Efectos de temporada",
    "Seasons": "Estaciones",
    "Season": "Estación",
    "Automatic": "Automático",
    "Spring": "Primavera",
    "Summer": "Verano",
    "Autumn": "Otoño",
    "Winter": "Invierno",
    "Fireflies": "Luciérnagas",
    "Day and night cycle": "Ciclo de día y noche",
    "Day length (0 = real time)": "Duración del día (0 = tiempo real)",
    "Fire and portal lighting": "Luces de fuego y portales",
    "Player night light": "Luz nocturna del jugador",
    "Sparks and embers": "Chispas y brasas",
    "Cartoon clouds": "Nubes animadas",
    "Cloud shadows": "Sombras de nubes",
    "Cloud opacity": "Opacidad de nubes",
    "Cloud shadow opacity": "Opacidad de sombras de nubes",
    "Cloud density": "Cantidad de nubes",
    "Cloud movement speed": "Velocidad de nubes",
    "Keep player visible under clouds": "Mantener al jugador visible",
    "Hide clouds at zoom (0 = never)": "Ocultar nubes con zoom (0 = nunca)",
    "Initially set to 4 for testing. Set to 5 if you prefer clouds visible at zoom 4.": "Prueba el valor 4. Selecciona 5 para ver nubes con zoom 4.",
    "Object shadows": "Sombras de árboles",
    "Sunlight shadow strength": "Intensidad de sombras",
    "Tree shadow size": "Tamaño de sombra",
    "Moonlight shadow strength": "Sombras de luna",
    "Treetop wind": "Viento en copas",
    "Water reflections": "Reflejos en agua",
    "Reflection opacity": "Opacidad de reflejos",
    "Water distortion": "Distorsión del agua",
    "Water sparkles": "Destellos del agua",
    "Enable audio adjustments": "Ajustar sonido del juego",
    "Restart the game to apply this change": "Reinicia el juego para aplicar el cambio",
    "Audio buffer": "Búfer de audio",
    "Large (recommended for Firefox)": "Grande (recomendado en Firefox)",
    "Balanced": "Equilibrado",
    "Restart required": "Reinicio necesario",
    "Footstep volume": "Volumen de pasos",
    "Footstep low-pass cutoff": "Filtro de pasos",
    "Master limiter threshold": "Umbral del limitador",
    "Effects compressor threshold": "Umbral del compresor",
    "Effects compressor ratio": "Compresión de efectos",
    "Enable ambience": "Activar sonidos ambientales",
    "Separate from the game music and sound effect volume controls": "Independiente de la música y los efectos del juego",
    "Master ambience volume": "Volumen ambiental",
    "Restart game": "Reiniciar juego",
    "Reset settings": "Restablecer ajustes",
    "Click again to reset": "Pulsa otra vez para restablecer",
    "Settings reset": "Ajustes restablecidos",
    "Shadow style": "Estilo de sombra",
    "Classic": "Clásico",
    "Grounded": "A ras de suelo",
    "Settings categories": "Categorías de ajustes",
    "DigiMMO Tweaks": "DigiMMO Ajustes",
    "View changes": "Ver cambios",
    "Tweaks": "Mejoras",
    "is available": "disponible",
    "Atmosphere": "Ambiente",
    "Ambient sounds": "Sonidos ambientales",
    "Time of day": "Hora del día",
    "Real time": "Tiempo real",
    "Morning": "Mañana",
    "Noon": "Mediodía",
    "Evening": "Tarde",
    "Night": "Noche",
    "Changes to the actual game visuals and sounds only.": "Solo cambios visuales y sonoros del juego.",
    "Forest foliage particles appear only in spring and autumn. Summer has no falling autumn leaves; winter can add light snow. Seasons do not recolor the map textures.": "Las partículas de hojas aparecen solo en primavera y otoño. En verano no caen hojas otoñales; en invierno puede nevar. Las estaciones no cambian las texturas del mapa.",
    "Language": "Idioma",
    "Follow game language": "Idioma del juego",
    "English": "Inglés",
    "Spanish": "Español",
    "Portuguese": "Portugués",
    "Advanced settings": "Opciones avanzadas",
    "Settings": "Ajustes",
    "Experimental tree shadows; disable if they look wrong.": "Sombras de árboles experimentales. Desactívalas si se ven mal.",
    "Soft lighting, object shadows, moving treetops and water reflections. Regional day and night ambience with wildlife, fire, nearby fountains and water. Larger Digimon have wider light, moonlight shadows are softer, and atmosphere starts as soon as the map is ready.": "Iluminación suave, sombras de objetos, copas en movimiento y reflejos en el agua. Ambiente regional de día y de noche con fauna, fuego, agua y fuentes cercanas. Los Digimon grandes tienen una luz más amplia, las sombras lunares son más suaves y la atmósfera aparece cuando el mapa está listo.",
    "Keyboard shortcuts": "Atajos de teclado",
    "F10 or Ctrl+Shift+O: open or close settings.\nAlt+F10: toggle atmosphere and ambient sounds.\nCtrl+F10: toggle only ambient sounds.\nEscape: close settings.": "F10 o Ctrl+Shift+O: abrir o cerrar ajustes.\nAlt+F10: activar o desactivar atmósfera y sonidos ambientales.\nCtrl+F10: activar o desactivar solo sonidos ambientales.\nEscape: cerrar ajustes.",
    "Development only: Shift+F10 cycles real time, morning, noon, evening and night with a six second transition. Ctrl+Alt+P shows diagnostic counts.": "Solo desarrollo: Shift+F10 alterna hora real, mañana, mediodía, tarde y noche con una transición de seis segundos. Ctrl+Alt+P muestra los contadores de diagnóstico.",
    "Mono, 120 Hz low cut, gentle high-frequency filtering, constant volume matching, short loop crossfade and Opus encoding. No compression, pitch or speed change.": "Mono, filtro de corte bajo a 120 Hz, filtrado suave de agudos, ajuste constante de volumen, fundido corto de bucle y codificación Opus. Sin compresión ni cambios de tono o velocidad.",
    "Trimmed, looped, volume matched and encoded to mono Opus.": "Recortado, preparado en bucle, ajustado de volumen y codificado en Opus mono."
  },
  "pt": {
    "Quieter, shorter bird calls with longer pauses and varied passages, without a continuous bird loop. Distant daytime traffic replaces the repeating city market voices and fades into quiet wind at night.": "Cantos de pássaros mais suaves e curtos, com pausas maiores e trechos variados, sem um loop contínuo de pássaros. O trânsito distante durante o dia substitui as vozes repetitivas do mercado da cidade e dá lugar suavemente a um vento tranquilo à noite.",
    "Excerpts, mono, filtering, volume matching and Opus encoding. Short randomized passages with edge fades and long pauses; no continuous bird loop.": "Trechos em mono, filtragem, ajuste de volume e codificação Opus. Passagens curtas aleatórias com transições suaves e pausas longas, sem loop contínuo de pássaros.",
    "Settings and keyboard shortcut help stay inside the menu on smaller windows.": "As configurações e a ajuda de atalhos de teclado ficam dentro do menu em janelas menores.",
    "Window lighting in Fog City, aligned south-facing headlights, and scattered glowing windows and holes in Machine City at night. Weather defaults to 2x. Network areas have no clouds, and Holy Peaks snow fades naturally past the northern plateau. New campfire recording with less low rumble. Fountains fade out over a shorter distance.": "Iluminação nas janelas de Fog City, faróis alinhados nos carros voltados para o sul e algumas janelas e buracos iluminados à noite em Machine City. A densidade padrão do clima é 2x. As áreas de Network não têm nuvens, e a neve de Holy Peaks desaparece gradualmente além do planalto norte. Nova gravação de fogueira com menos ruído grave. O som das fontes desaparece a uma distância menor.",
    "Excerpts, mono, filtering, volume matching and Opus encoding. Playback limited to 2.2 seconds with edge fades and long pauses.": "Trechos em mono, filtragem, ajuste de volume e codificação Opus. Reprodução limitada a 2,2 segundos com transições suaves e pausas longas.",
    "Previously trimmed, volume matched and encoded to mono Opus. Played as 3.2 second passages with edge fades and long pauses, without a continuous loop.": "Recortado, ajustado em volume e codificado em Opus mono anteriormente. Reproduzido em trechos de 3,2 segundos com transições suaves e pausas longas, sem repetição contínua.",
    "Sound credits": "Créditos de som",
    "Excerpts, mono, filtering, volume matching, edge fades or loop crossfades, Opus encoding.": "Trechos, mono, filtragem, ajuste de volume, transições nas bordas ou entre loops e codificação Opus.",
    "Show advanced settings": "Mostrar configurações avançadas",
    "Español": "Español",
    "World": "Mundo",
    "Audio": "Áudio",
    "Changelog": "Alterações",
    "Environment": "Ambiente",
    "Sky and lighting": "Céu e iluminação",
    "World and movement": "Mundo e movimento",
    "Game audio adjustments": "Áudio do jogo",
    "Ambient soundscape": "Sons ambientes",
    "Enable atmosphere": "Ativar atmosfera",
    "Toggle all atmosphere effects and ambient sounds": "Ativa ou desativa todos os efeitos de ambiente",
    "Regional weather": "Clima regional",
    "Weather density": "Densidade do clima",
    "Seasonal effects": "Efeitos sazonais",
    "Seasons": "Estações",
    "Season": "Estação",
    "Automatic": "Automático",
    "Spring": "Primavera",
    "Summer": "Verão",
    "Autumn": "Outono",
    "Winter": "Inverno",
    "Fireflies": "Vaga-lumes",
    "Day and night cycle": "Ciclo de dia e noite",
    "Day length (0 = real time)": "Duração do dia (0 = tempo real)",
    "Fire and portal lighting": "Luz de fogueiras e portais",
    "Player night light": "Luz noturna do jogador",
    "Sparks and embers": "Faíscas e brasas",
    "Cartoon clouds": "Nuvens animadas",
    "Cloud shadows": "Sombras das nuvens",
    "Cloud opacity": "Opacidade das nuvens",
    "Cloud shadow opacity": "Opacidade das sombras",
    "Cloud density": "Densidade das nuvens",
    "Cloud movement speed": "Velocidade das nuvens",
    "Keep player visible under clouds": "Manter jogador visível",
    "Hide clouds at zoom (0 = never)": "Ocultar nuvens no zoom (0 = nunca)",
    "Initially set to 4 for testing. Set to 5 if you prefer clouds visible at zoom 4.": "Teste com 4. Se preferir nuvens no zoom 4, use 5.",
    "Object shadows": "Sombras das árvores",
    "Sunlight shadow strength": "Intensidade das sombras",
    "Tree shadow size": "Tamanho das sombras",
    "Moonlight shadow strength": "Sombras ao luar",
    "Treetop wind": "Vento nas copas",
    "Water reflections": "Reflexos na água",
    "Reflection opacity": "Opacidade dos reflexos",
    "Water distortion": "Distorção da água",
    "Water sparkles": "Brilhos na água",
    "Enable audio adjustments": "Ajustes de áudio do jogo",
    "Restart the game to apply this change": "Reinicie o jogo para aplicar",
    "Audio buffer": "Buffer de áudio",
    "Large (recommended for Firefox)": "Grande (recomendado para Firefox)",
    "Balanced": "Equilibrado",
    "Restart required": "Reinicialização necessária",
    "Footstep volume": "Volume dos passos",
    "Footstep low-pass cutoff": "Filtro dos passos",
    "Master limiter threshold": "Limite do áudio principal",
    "Effects compressor threshold": "Limite do compressor de efeitos",
    "Effects compressor ratio": "Compressão dos efeitos",
    "Enable ambience": "Ativar sons ambientes",
    "Separate from the game music and sound effect volume controls": "Independente dos controles de música e efeitos do jogo",
    "Master ambience volume": "Volume ambiente",
    "Restart game": "Reiniciar jogo",
    "Reset settings": "Redefinir configurações",
    "Click again to reset": "Clique de novo para redefinir",
    "Settings reset": "Configurações redefinidas",
    "Shadow style": "Estilo da sombra",
    "Classic": "Clássico",
    "Grounded": "Rente ao chão",
    "Settings categories": "Categorias de configuração",
    "DigiMMO Tweaks": "DigiMMO Ajustes",
    "View changes": "Ver alterações",
    "Tweaks": "Melhorias",
    "is available": "disponível",
    "Atmosphere": "Atmosfera",
    "Ambient sounds": "Sons ambientes",
    "Time of day": "Hora do dia",
    "Real time": "Tempo real",
    "Morning": "Manhã",
    "Noon": "Meio-dia",
    "Evening": "Tarde",
    "Night": "Noite",
    "Changes to the actual game visuals and sounds only.": "Somente mudanças visuais e sonoras do jogo.",
    "Forest foliage particles appear only in spring and autumn. Summer has no falling autumn leaves; winter can add light snow. Seasons do not recolor the map textures.": "Folhas caem apenas na primavera e outono. No verão não há folhas de outono; no inverno pode nevar. As estações não mudam as texturas do mapa.",
    "Language": "Idioma",
    "Follow game language": "Idioma do jogo",
    "English": "Inglês",
    "Spanish": "Espanhol",
    "Portuguese": "Português",
    "Advanced settings": "Opções avançadas",
    "Settings": "Configurações",
    "Experimental tree shadows; disable if they look wrong.": "Sombras experimentais das árvores. Desative se estiverem erradas.",
    "Soft lighting, object shadows, moving treetops and water reflections. Regional day and night ambience with wildlife, fire, nearby fountains and water. Larger Digimon have wider light, moonlight shadows are softer, and atmosphere starts as soon as the map is ready.": "Iluminação suave, sombras de objetos, copas em movimento e reflexos na água. Ambiente regional de dia e de noite com animais, fogo, água e fontes próximas. Digimon maiores têm uma luz mais ampla, as sombras do luar são mais suaves e a atmosfera aparece assim que o mapa fica pronto.",
    "Keyboard shortcuts": "Atalhos de teclado",
    "F10 or Ctrl+Shift+O: open or close settings.\nAlt+F10: toggle atmosphere and ambient sounds.\nCtrl+F10: toggle only ambient sounds.\nEscape: close settings.": "F10 ou Ctrl+Shift+O: abrir ou fechar configurações.\nAlt+F10: ativar ou desativar atmosfera e sons ambientes.\nCtrl+F10: ativar ou desativar apenas sons ambientes.\nEscape: fechar configurações.",
    "Development only: Shift+F10 cycles real time, morning, noon, evening and night with a six second transition. Ctrl+Alt+P shows diagnostic counts.": "Apenas desenvolvimento: Shift+F10 alterna horário real, manhã, meio-dia, entardecer e noite com uma transição de seis segundos. Ctrl+Alt+P mostra contadores de diagnóstico.",
    "Mono, 120 Hz low cut, gentle high-frequency filtering, constant volume matching, short loop crossfade and Opus encoding. No compression, pitch or speed change.": "Mono, corte de graves em 120 Hz, filtragem suave de agudos, ajuste constante de volume, transição curta do loop e codificação Opus. Sem compressão nem alteração de tom ou velocidade.",
    "Trimmed, looped, volume matched and encoded to mono Opus.": "Recortado, preparado em loop, ajustado em volume e codificado em Opus mono."
  }
};
  const supportedLanguage = input => {
    if (typeof input !== 'string') return null;
    const base = input.toLowerCase().replace('_', '-').split('-')[0];
    return ['en','es','pt'].includes(base) ? base : null;
  };
  const gameLanguage = () => {
    let state = null;
    try { state = window.dmo?.store?.getState?.(); } catch {}
    const candidates = [state?.settings?.language, state?.settings?.locale,
      state?.ui?.language, state?.ui?.locale, state?.language, state?.locale,
      window.dmo?.i18n?.language];
    for (const c of candidates) {
      const lang = supportedLanguage(c);
      if (lang) return lang;
    }
    for (const key of ['i18nextLng','dmo-language','dmo:language','dmo.locale','language','locale']) {
      try { const lang = supportedLanguage(localStorage.getItem(key)); if (lang) return lang; } catch {}
    }
    return supportedLanguage(document.documentElement?.lang) || supportedLanguage(navigator.language) || 'en';
  };
  const currentLanguage = () => SETTINGS.uiLanguage === 'auto' ? gameLanguage() : SETTINGS.uiLanguage;
  const tr = (english) => TRANSLATIONS[currentLanguage()]?.[english] || english;

  // Audio changes requiring a restart keep one consistent setting for this page.
  const AUDIO_ENABLED = SETTINGS.audioFix;
  const STEP_GAIN = () => AUDIO_ENABLED ? SETTINGS.stepGain : 1;
  const MASTER = { threshold: SETTINGS.masterThreshold, knee: 3, ratio: 20, attack: 0.003, release: 0.08 };
  const SFX = { threshold: SETTINGS.sfxThreshold, knee: 6, ratio: SETTINGS.sfxRatio, attack: 0.003, release: 0.15 };
  const LATENCY = AUDIO_ENABLED ? SETTINGS.audioLatency : null;
  const STEAL_FADE = 0.02;
  const STEP_LOWPASS = AUDIO_ENABLED ? SETTINGS.stepLowpass : 0;

  const HOTKEY = 'F10';


  const tag = '[tweaks]';

  const OriginalAudioCtx = window.AudioContext;
  const NativeCtx = OriginalAudioCtx || window.webkitAudioContext;
  let PatchedCtx = null;
  if (NativeCtx && LATENCY) {
    PatchedCtx = class extends NativeCtx {
      constructor(opts) { super({ ...(opts || {}), latencyHint: LATENCY }); }
    };
    try { window.AudioContext = PatchedCtx; } catch {}
  }

  const setComp = (c, v) => {
    c.threshold.value = v.threshold;
    c.knee.value = v.knee;
    c.ratio.value = v.ratio;
    c.attack.value = v.attack;
    c.release.value = v.release;
  };

  const Base = window.BaseAudioContext || window.AudioContext;
  const origCreate = Base?.prototype.createDynamicsCompressor;
  const masterCompressors = new WeakMap();
  let compressorHook = null;
  const restoreAudioBootstrap = () => {
    if (PatchedCtx && window.AudioContext === PatchedCtx) {
      try { window.AudioContext = OriginalAudioCtx; } catch {}
    }
    if (compressorHook && Base.prototype.createDynamicsCompressor === compressorHook) {
      try { Base.prototype.createDynamicsCompressor = origCreate; } catch {}
    }
  };
  const routeAudio = (a) => {
    if (a.__digimmoAudio) return true;
    const ctx = a.ctx, comp = ctx && masterCompressors.get(ctx);
    if (!comp || !a.sfxBus || !a.master) return false;
    let sfxComp = null, directRemoved = false, previous = null;
    try {
      sfxComp = origCreate.call(ctx);
      setComp(sfxComp, SFX);
      // The game connects sfxBus directly to master. Replace only that edge;
      // leave other consumers attached and retain the original route on failure.
      sfxComp.connect(a.master);
      a.sfxBus.connect(sfxComp);
      a.sfxBus.disconnect(a.master);
      directRemoved = true;
      previous = Object.fromEntries(Object.keys(MASTER).map(k => [k, comp[k].value]));
      setComp(comp, MASTER);
      a.__digimmoSfxIn = a.sfxBus;
      a.__digimmoAudio = true;
      console.info(tag, 'Audio: effects bus rerouted');
      return true;
    } catch (e) {
      if (sfxComp) {
        try { a.sfxBus.disconnect(sfxComp); } catch {}
        try { sfxComp.disconnect(); } catch {}
      }
      if (directRemoved) { try { a.sfxBus.connect(a.master); } catch {} }
      if (previous) { try { setComp(comp, previous); } catch {} }
      if (!a.__digimmoRoutingWarning) console.warn(tag, 'Audio: bus routing failed; keeping original audio', e);
      a.__digimmoRoutingWarning = true;
      return false;
    }
  };
  if (typeof origCreate === 'function' && AUDIO_ENABLED) {
    compressorHook = function (...args) {
      const comp = origCreate.apply(this, args);
      const ctx = this;
      // The first compressor in the game context is its output limiter.
      if (!masterCompressors.has(ctx)) masterCompressors.set(ctx, comp);
      queueMicrotask(() => {
        const a = window.dmo && window.dmo.audio;
        if (a?.ctx === ctx && routeAudio(a)) restoreAudioBootstrap();
      });
      return comp;
    };
    try { Base.prototype.createDynamicsCompressor = compressorHook; } catch {}
  }

  const patchAudio = () => {
    if (!AUDIO_ENABLED) return true;
    const d = window.dmo && window.dmo.audioDirector;
    const a = window.dmo && window.dmo.audio;
    if (!d || !a || typeof d.cue !== 'function' || typeof a.kill !== 'function') return false;
    if (!d.__digimmoSteps) {
      const orig = d.cue;
      d.cue = function (e) {
        if (e && e.sfx === 'world.step') {
          if (STEP_GAIN() <= 0) return;
          e = { ...e, gain: (e.gain ?? 1) * STEP_GAIN() };
        }
        return orig.call(this, e);
      };
      d.__digimmoSteps = true;
    }
    if (!a.__digimmoSoft && STEP_LOWPASS > 0 && typeof a.sfxBuffer === 'function') {
      const softened = new WeakMap();
      const soften = (buf) => {
        if (!buf) return buf;
        if (softened.has(buf)) return softened.get(buf);
        const copy = a.ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
        const fs = buf.sampleRate, k = 1 - Math.exp(-2 * Math.PI * STEP_LOWPASS / fs);
        const fadeIn = Math.round(fs * 0.002), fadeOut = Math.round(fs * 0.004);
        for (let c = 0; c < buf.numberOfChannels; c++) {
          const ch = copy.getChannelData(c); ch.set(buf.getChannelData(c)); let y = 0;
          for (let i = 0; i < ch.length; i++) { y += k * (ch[i] - y); ch[i] = y; }
          for (let i = 0; i < fadeIn && i < ch.length; i++) ch[i] *= i / fadeIn;
          for (let i = 0; i < fadeOut && i < ch.length; i++) ch[ch.length - 1 - i] *= i / fadeOut;
        }
        softened.set(buf, copy);
        return copy;
      };
      const origBuf = a.sfxBuffer;
      a.sfxBuffer = function (id) {
        const buf = origBuf.call(this, id);
        if (id === 'world.step') { try { return soften(buf); } catch {} }
        return buf;
      };
      a.__digimmoSoft = true;
    }
    if (!a.__digimmoKill) {
      const origKill = a.kill;
      a.kill = function (v) {
        const src = v && v.src, ctx = this.ctx;
        if (!src || !ctx || !this.sfxBus) return origKill.call(this, v);
        try {
          src.onended = null;
          const now = ctx.currentTime;
          const fade = ctx.createGain();
          fade.gain.setValueAtTime(v.gain.gain.value, now);
          fade.gain.linearRampToValueAtTime(0, now + STEAL_FADE);
          src.disconnect();
          src.connect(fade);
          fade.connect(this.sfxBus);
          src.stop(now + STEAL_FADE + 0.005);
          src.onended = () => { try { src.disconnect(); fade.disconnect(); } catch {} };
          v.src = null;
          this.release(v);
        } catch (e) {
          return origKill.call(this, v);
        }
      };
      a.__digimmoKill = true;
    }
    return typeof origCreate !== 'function' || routeAudio(a);
  };
  if (AUDIO_ENABLED) {
    const finish = () => { clearInterval(audioTimer); clearTimeout(audioDeadline); restoreAudioBootstrap(); };
    const audioTimer = setInterval(() => { if (patchAudio()) finish(); }, 500);
    const audioDeadline = setTimeout(finish, 120000);
  }

  // All visual effects are rendered in the game world without changing gameplay state.
  const EMISSIVE_TILES = __EMISSIVE_TILES__;

  const ATMOS = (() => {
    const ADD = 1, MULTIPLY = 2, ERASE = 17;
    const DEPTH_GLOW = 1500000;
    const DEPTH_NIGHT = 1400000;
    const DEPTH_SHADOW = -994.5;

    const sinEase = (t) => Math.sin(t * Math.PI);
    const blink = (t) => Math.max(0, Math.sin(t * Math.PI)) * (0.55 + 0.45 * Math.sin(t * 31));
    const WEATHER = [
      // Village-specific, quiet floating pollen motes. No screen effects or building movement.
      { name: 'Village motes', test: /primary[\s_-]*village/i, layers: [
        { cfg: { lifespan: [4500, 8000], speedX: [-4, 5], speedY: [-7, -2],
          scale: [1, 1], alpha: 0.36, tint: [0xffe8ae, 0xe0f4c3, 0xfff5d6], rate: 410 } },
      ] },
      { name: 'Sandstorm', test: /savanna|desert|dune|sand(?!box)|canyon|mesa|pyramid/i, layers: [
        { cfg: { lifespan: [5000, 9000], speedX: [6, 16], speedY: [-3, 3], scale: [1, 2], alpha: 0.65, tint: [0xe8d3a0, 0xd9bf86, 0xf3e4bd], rate: 51 } },
      ] },
      { name: 'Snow', test: /freeze|snow|ice|glacier|frost|holy.?peaks|summit/i, layers: [
        { cfg: { lifespan: [7000, 11000], speedX: [3, 10], speedY: [12, 24], accelX: [-5, 5], scale: [1, 2], alpha: 0.9, tint: [0xffffff, 0xeef6ff, 0xdde9ff], rate: 22 } },
      ] },
      { name: 'Leaves', test: /forest|woods|grove|orchard|harvest|thicket|egg.?valley|primary/i, layers: [
        { cfg: { lifespan: [6000, 9000], speedX: [8, 18], speedY: [6, 14], accelX: [-8, 8], scale: [2, 2], alpha: 0.9, tint: [0x6fa04a, 0x8cbf5a, 0x4f7f3a, 0xd08a3a], rate: 280 } },
        { lum: true, night: true, cfg: { lifespan: [3000, 6000], speedX: [-6, 6], speedY: [-6, 6], scale: [1, 1], alpha: 1, ease: blink, tint: [0xd8ff7a, 0xfff27a], rate: 260, add: true } },
      ] },
      { name: 'Fog', test: /fog|mist|marsh|destiny|sea.?of.?darkness|dark.?ocean|dream|keep/i, layers: [
        { key: 'digimmo:glow', cfg: { lifespan: [12000, 20000], speedX: [3, 8], speedY: [-1, 1], scale: [3, 6], alpha: 0.09, tint: [0xdfe6ee, 0xcfd8e2], rate: 650 } },
      ] },
      { name: 'Sea spray', test: /bay|beach|shore|reef|sea|ocean|lake|lighthouse|seaside/i, layers: [
        { cfg: { lifespan: [3000, 6000], speedX: [8, 18], speedY: [-4, 2], scale: [1, 1], alpha: 0.45, tint: [0xffffff, 0xe8f6ff], rate: 170 } },
      ] },
      { name: 'Ash', test: /machine|factor|factory|fortress|hangar|engine|foundry|gear.?ridge/i, layers: [
        { cfg: { lifespan: [6000, 9000], speedX: [3, 8], speedY: [-6, 2], scale: [1, 2], alpha: 0.5, tint: [0x8a8a8a, 0x6e6e6e, 0xa0a0a0], rate: 90 } },
        { lum: true, cfg: { lifespan: [700, 1400], speedX: [-6, 6], speedY: [-22, -8], scale: [1, 1], alpha: 1, tint: [0xffd27a, 0xff8a30], rate: 900, add: true } },
      ] },
      { name: 'Data', test: /network|digital|war.?game|revenge|apocalymon|realm/i, layers: [
        { lum: true, cfg: { lifespan: [2500, 5000], speedX: [-2, 2], speedY: [-14, -6], scale: [1, 2], alpha: 0.9, ease: blink, tint: [0x5ef2ff, 0x7dffb2, 0x3fa8ff], rate: 120, add: true } },
      ] },
      { name: 'Ghost lights', test: /overdell|graveyard|myotismon|chapel|phantom|haunt/i, layers: [
        { lum: true, cfg: { lifespan: [5000, 8000], speedX: [-3, 3], speedY: [-8, -3], scale: [1, 2], alpha: 0.5, tint: [0xc9b6ff, 0xe6dcff], rate: 220, add: true } },
      ] },
      { name: 'Confetti', test: /toy/i, layers: [
        { cfg: { lifespan: [5000, 8000], speedX: [-6, 6], speedY: [10, 20], accelX: [-10, 10], scale: [2, 2], alpha: 0.9, tint: [0xff5a7a, 0xffd23a, 0x5ac8ff, 0x7aff8a, 0xc87aff], rate: 140 } },
      ] },
      { name: 'City', test: /odaiba|highton|terrace|city|plaza|street/i, layers: [
        { cfg: { lifespan: [5000, 9000], speedX: [6, 14], speedY: [-3, 3], scale: [1, 1], alpha: 0.35, tint: [0xd8d8d8, 0xbfbfbf], rate: 140 } },
      ] },
    ];

    const LIGHTS = [
      { test: /campfire|bonfire|brazier/i, color: 0xff9a3c, alpha: 0.6, flicker: 0.18, embers: true, light: 1.0, lightColor: 0xffa860 },
      { test: /embers/i, color: 0xff6a20, alpha: 0.4, flicker: 0.25, embers: true, emberRate: 600, light: 0.45, lightColor: 0xff7a30 },
      { test: /torch|lantern|lamp|candle/i, color: 0xffc070, alpha: 0.4, flicker: 0.12, light: 0.38, lightColor: 0xffc890 },
      { test: /warp/i, color: 0x66d9ff, alpha: 0.18, flicker: 0.02, light: 1, lightColor: 0x70bbff },
    ];
    // Water is matched by the whole tile name (without the frame number), so
    // seacliff, lakecliff, seaweed, beach_hut or watertank are not water.
    const baseName = (name) => name.replace(/_\d+$/, '');
    const WATER_NAMES = /^(water|sea|surf|creek|river|stream|pond|baywater|greywater|darksea|waterfall)$/i;
    const SEA_NAMES = /^(sea|surf|ocean|baywater|greywater|darksea)$/i;
    const RUNNING_NAMES = /^(creek|river|stream|waterfall)$/i;
    const NO_SHADOW_PART = /campfire|embers|warp|scorch|mud|dust|straw|slab|path|steps|seaweed/i;
    const noShadow = (name) => WATER_NAMES.test(baseName(name)) || NO_SHADOW_PART.test(name);

    // Restore the original nighttime palette; the black screenshot was a stalled transition, not night.
    const NIGHT_COLOR = [0x26, 0x32, 0x6e];
    const DUSK_COLOR = [0xff, 0xb8, 0x88];
    const PLAYER_LIGHT = () => SETTINGS.playerLight;
    const SHADOW_ALPHA = () => SETTINGS.shadowAlpha;
    const SHADOW_HEIGHT = () => SETTINGS.shadowHeight;
    const MOON_SHADOW_ALPHA = () => SETTINGS.moonShadowAlpha;
    const DAY_MINUTES = () => SETTINGS.dayMinutes;
    const CLOUDS = {
      get body() { return SETTINGS.cloudOpacity; },
      get shadow() { return SETTINGS.cloudShadowOpacity; },
      get density() { return SETTINGS.cloudDensity / 260000; },
      size: [90, 210],
      life: [150, 360],
      get wind() { return [7 * SETTINGS.cloudWind, 3 * SETTINGS.cloudWind]; },
      height: 7,
      parallax: 0.15,
      get playerClear() { return SETTINGS.cloudPlayerClear; },
      px: 2,
      shade: 0xb4c2da,
    };
    const TREES = /acacia|tree|palm|pine|oak|willow|leaf|leaves|canopy|crown|foliage|baobab|cherry|birch|fir/i;
    const SWAY = { speed: 1.7, gustLength: 260, gustSpeed: 0.55, get strong() { return SETTINGS.windStrength; } };
    const SEASON = () => SETTINGS.season;
    const SEASONS = {
      spring: { tint: [255, 248, 246], tree: { tint: [0xe7cbd8, 0xeccfda, 0xd9e5c0], rate: 440, scale: [0.65, 0.9] } },
      summer:    { tint: [255, 255, 246], tree: null },
      autumn:    { tint: [255, 240, 220], tree: { tint: [0xb99355, 0x9d6f3d, 0xc8a66c, 0xb27f52], rate: 380, scale: [0.65, 0.95] } },
      winter:    { tint: [236, 242, 255], tree: null, snow: true },
    };
    const seasonNow = () => {
      if (SEASON() !== 'auto') return SEASON();
      const m = new Date().getMonth();
      return m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
    };
    const REFLECT = { get alpha() { return SETTINGS.reflectionOpacity; }, tint: 0xa8c8ff, get wobble() { return SETTINGS.reflectionWobble; } };
    const AMBIENT = { get volume() { return SETTINGS.ambientVolume; } };
    const PREVIEW_SECONDS = 6;

    let built = null;
    const brokenMaps = new Set();
    let readyScene = null, readyTilemap = null, readyMapId = null, integrityAt = 0;
    let enabled = SETTINGS.atmosphere;
    let preview = null;
    let anim = null;

    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const rgb = (c) => (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);

    const realHour = () => {
      if (DAY_MINUTES() > 0) return ((Date.now() / 60000) % DAY_MINUTES()) / DAY_MINUTES() * 24;
      const d = new Date();
      return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    };
    const hourNow = () => {
      if (anim) {
        const t = Math.min(1, (performance.now() - anim.start) / anim.dur);
        const e = t * t * (3 - 2 * t);
        const to = anim.to === null ? realHour() : anim.to;
        let span = (to - anim.from + 24) % 24;
        const h = (anim.from + span * e) % 24;
        if (t >= 1) { preview = anim.to; anim = null; }
        return h;
      }
      return preview !== null ? preview : realHour();
    };

    const sky = (h) => {
      if (!SETTINGS.dayNight) h = 12;
      const dark = h < 12 ? 1 - smooth(5.0, 7.5, h) : smooth(18.5, 21.0, h);
      const golden = h < 12
        ? smooth(5.0, 6.5, h) * (1 - smooth(6.5, 8.5, h))
        : smooth(17.0, 19.0, h) * (1 - smooth(19.5, 21.0, h));
      let c = SETTINGS.seasons ? SEASONS[seasonNow()].tint.slice() : [255, 255, 255];
      c = c.map((v, i) => lerp(v, DUSK_COLOR[i], golden * 0.8));
      c = c.map((v, i) => lerp(v, NIGHT_COLOR[i], dark));
      const sunT = Math.max(0, Math.min(1, (h - 6) / 12));
      const sunUp = h > 5.5 && h < 19.5;
      const elev = Math.sin(sunT * Math.PI);
      const len = sunUp ? lerp(2.2, 0.6, elev) : 0;
      const dx = Math.round(-Math.cos(sunT * Math.PI) * 7 * len) || 0;
      const dy = Math.round((3 + 2 * (1 - elev)) * len);
      let shadow = { dx, dy, alpha: SHADOW_ALPHA() * (1 - dark) * (sunUp ? 1 : 0) };
      const moonT = ((h - 20 + 24) % 24) / 9;
      if (dark > 0.5 && moonT >= 0 && moonT <= 1) {
        const me = Math.sin(moonT * Math.PI);
        const ml = lerp(2.0, 0.8, me);
        shadow = {
          dx: Math.round(-Math.cos(moonT * Math.PI) * 7 * ml) || 0,
          dy: Math.round((3 + 2 * (1 - me)) * ml),
          alpha: MOON_SHADOW_ALPHA() * (dark - 0.5) * 2 * Math.min(1, me * 3),
        };
      }
      const cloud = SETTINGS.cloudShadows ? CLOUDS.shadow * (1 - dark) : 0;
      let ct = [255, 255, 255];
      ct = ct.map((v, i) => lerp(v, [255, 196, 160][i], golden * 0.9));
      ct = ct.map((v, i) => lerp(v, [90, 104, 150][i], dark));
      const cloudBody = SETTINGS.clouds ? lerp(CLOUDS.body, 0.28, dark) : 0;
      return { dark, golden, color: rgb(c), shadow, cloud, cloudTint: rgb(ct), cloudBody };
    };

    const mkCircle = (tx, key, S, rings) => {
      if (tx.exists(key)) return;
      const c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d');
      for (const [r, a] of rings) {
        g.fillStyle = `rgba(255,255,255,${a})`;
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          const dx = x - S / 2 + 0.5, dy = y - S / 2 + 0.5;
          if (dx * dx + dy * dy <= r * r) g.fillRect(x, y, 1, 1);
        }
      }
      tx.addCanvas(key, c);
    };

    const ensureTextures = (scene) => {
      const tx = scene.textures;
      if (!tx.exists('digimmo:px')) {
        const c = document.createElement('canvas'); c.width = c.height = 1;
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1, 1);
        tx.addCanvas('digimmo:px', c);
      }
      mkCircle(tx, 'digimmo:glow', 48, [[24, 0.08], [18, 0.16], [12, 0.28], [6, 0.45]]);
      // Solid tile used by RenderTexture.erase. Avoid the unsupported
      // assumption that stamp() with an ERASE blend makes an alpha hole.
      if (!tx.exists('digimmo:waterHole')) {
        const c = document.createElement('canvas'); c.width = c.height = 16;
        const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 16, 16);
        tx.addCanvas('digimmo:waterHole', c);
      }
      if (!tx.exists('digimmo:portalGlow')) {
        const c = document.createElement('canvas'); c.width = c.height = 24;
        const g = c.getContext('2d'), data = g.createImageData(24, 24);
        for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
          const d = Math.hypot(x - 11.5, y - 11.5) / 11.5;
          const a = Math.max(0, 1 - d) ** 2 * 0.28;
          const k = (y * 24 + x) * 4;
          data.data[k] = data.data[k+1] = data.data[k+2] = 255;
          data.data[k+3] = Math.round(a * 255);
        }
        g.putImageData(data, 0, 0); tx.addCanvas('digimmo:portalGlow', c);
      }
      if (!tx.exists('digimmo:leaf')) {
        const c = document.createElement('canvas'); c.width = 5; c.height = 4;
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        // A tiny angled leaf instead of a glowing square pixel.
        for (const [x, y] of [[2,0],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[1,3]]) g.fillRect(x,y,1,1);
        tx.addCanvas('digimmo:leaf', c);
      }
      // A smooth, local falloff. The old nine nested disks drew obvious rings
      // around each exit marker and lantern. Keep the lighting in world space.
      if (!tx.exists('digimmo:light2')) {
        const size = 160, canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const g = canvas.getContext('2d');
        const pixels = g.createImageData(size, size);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          const d = Math.min(1, Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2));
          const a = (1 - d) ** 2 * (1 - d * d) * 0.55;
          const i = (y * size + x) * 4;
          pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
          pixels.data[i + 3] = Math.round(255 * a);
        }
        g.putImageData(pixels, 0, 0);
        tx.addCanvas('digimmo:light2', canvas);
      }
    };

    const tileInfo = (tm, gid) => {
      for (const ts of tm.tilesets) {
        if (gid >= ts.firstgid && gid < ts.firstgid + ts.total) {
          const p = (ts.tileProperties || {})[gid - ts.firstgid] || {};
          return { ts, name: p.name || '', collides: !!p.collides };
        }
      }
      return null;
    };

    const tileFrame = (scene, info, gid) => {
      if (!info || !info.ts.image) return null;
      const key = info.ts.image.key, tex = scene.textures.get(key), name = 'digimmo' + gid;
      const strips = [0, 1, 2, 3].map(i => name + 's' + i);
      if (!tex.has(name) || !tex.has(strips[3])) {
        const c = info.ts.getTileTextureCoordinates(gid);
        if (!c) return null;
        const w = info.ts.tileWidth, h = info.ts.tileHeight, sh = h / 4;
        if (!tex.has(name)) tex.add(name, 0, c.x, c.y, w, h);
        // Horizontal slices for height dependent shadow offsets.
        strips.forEach((strip, i) => { if (!tex.has(strip)) tex.add(strip, 0, c.x, c.y + i * sh, w, sh); });
      }
      return { key, name, strips };
    };

    // Tile names describe artwork parts, not just collision. The three small
    // tree palettes share tree_bl/tree_br bases in the original tileset.
    const shadowArt = (name) => {
      const tree = /^(?:tree|btree|dtree)_([tmb])([lr])$/i.exec(name);
      if (tree) return { family: 'tree', col: tree[2].toLowerCase() === 'l' ? 0 : 1,
        row: 'tmb'.indexOf(tree[1].toLowerCase()) };
      const column = /^(.*)_(top|bottom|base)$/i.exec(name);
      if (column) return { family: column[1].toLowerCase(), col: 0,
        row: column[2].toLowerCase() === 'top' ? 0 : 1 };
      // Igloo artwork is numbered in 2 by 2 blocks, not row-major strips.
      const igloo = /^igloo_xl_(\d+)$/.exec(name);
      if (igloo) {
        const i = Number(igloo[1]);
        return { family: 'igloo_xl', col: (Math.floor(i / 4) % 3) * 2 + i % 2,
          row: Math.floor(i / 12) * 2 + Math.floor((i % 4) / 2) };
      }
      const numbered = /^(.*)_(\d+)$/.exec(name);
      if (numbered) return { family: numbered[1].toLowerCase(), index: Number(numbered[2]) };
      return { family: name.toLowerCase() };
    };
    const adjacentShadowArt = (a, b, dx, dy) => {
      if (a.f.key !== b.f.key || a.art.family !== b.art.family) return false;
      const p = a.art, q = b.art;
      if (p.row !== undefined && q.row !== undefined)
        return q.col - p.col === dx && q.row - p.row === dy;
      if (p.index !== undefined && q.index !== undefined) {
        // Numbered composite artwork runs left to right, then down. A reset
        // marks another instance even when two crowns touch in one above# layer.
        return dy === 0 ? q.index - p.index === dx : (q.index - p.index) * dy > 0;
      }
      return true;
    };

    const scan = (scene) => {
      const tm = scene.tilemap, lights = [], water = [], runningWater = [], casters = [];
      const cache = new Map();
      for (const L of tm.layers) {
        const isAbove = L.name === 'above';
        const isWalls = L.name === 'walls';
        // One above# row may occupy a full-size tile grid. Skip it before traversing tiles.
        if (L.name.startsWith('above#')) continue;
        for (const row of L.data) for (const t of row) {
          if (!t || t.index <= 0) continue;
          let info = cache.get(t.index);
          if (info === undefined) { info = tileInfo(tm, t.index); cache.set(t.index, info); }
          if (!info) continue;
          if (info.name) {
            // Pre-drawn light pools on the ground are not light sources.
            const def = /pool/i.test(info.name) ? null : LIGHTS.find(l => l.test.test(info.name));
            if (def) {
              const isBulb = /torch|lantern|lamp|candle/i.test(info.name);
              // Emit from the bulb, near the upper edge of small lantern tiles.
              lights.push({ x: t.pixelX + 8, y: t.pixelY + (/^jackolantern$/i.test(info.name) ? 2 : isBulb ? 4 : 8), def,
                kind: /warp/i.test(info.name) ? 'portal' : isBulb ? 'lantern' : 'fire' });
              // Lamps and lanterns are solid objects and also cast a shadow.
              if (!isBulb) continue;
            }
            const base = baseName(info.name);
            if (WATER_NAMES.test(base)) {
              water.push({ x: t.pixelX, y: t.pixelY, shore: SEA_NAMES.test(base) });
              if (RUNNING_NAMES.test(base) && runningWater.length < 1000)
                runningWater.push({ x: t.pixelX, y: t.pixelY, fall: base.toLowerCase() === 'waterfall' });
              continue;
            }
          }
          // Keep wall candidates even without collision. Only matched bases
          // or solid loose objects are stamped after physical ownership is known.
          // above# duplicates must never be scanned here.
          if ((isWalls || isAbove) && !noShadow(info.name) && casters.length < 18000) {
            const f = tileFrame(scene, info, t.index);
            if (f) casters.push({ x: t.pixelX, y: t.pixelY,
              name: info.name, above: isAbove, solid: info.collides, art: shadowArt(info.name), f });
          }
        }
      }
      // Do not collapse horizontally adjacent bulbs or portal pads into one
      // emitter. Deduplicate identical tiles across layers; only vertically
      // adjacent parts of an individual lantern can share a bulb.
      const merged = [];
      const unique = new Set();
      for (const light of lights) {
        const key = `${light.kind}:${light.x}:${light.y}`;
        if (unique.has(key)) continue;
        unique.add(key);
        if (light.kind === 'lantern') {
          const previous = merged.find(l => l.kind === 'lantern' && l.def === light.def &&
            l.x === light.x && Math.abs(l.y - light.y) <= 16);
          if (previous) { previous.y = Math.min(previous.y, light.y); continue; }
        }
        merged.push({ ...light });
      }
      return { lights: merged, water, runningWater, casters };
    };

    const rand = (a, b) => a + Math.random() * (b - a);
    const makeCloud = (mapW, mapH, fresh, others) => {
      const S = rand(CLOUDS.size[0], CLOUDS.size[1]);
      let x = 0, y = 0;
      for (let tries = 0; tries < 20; tries++) {
        x = rand(-250, mapW + 250); y = rand(-250, mapH + 250);
        if (!others || others.every(o => !o || Math.hypot(o.x - x, (o.y - y) * 1.8) > (o.S + S) * 0.65)) break;
      }
      const n = 3 + Math.floor(S / 45);
      const puffs = [];
      for (let i = 0; i < n; i++) {
        let u = n === 1 ? 0 : -1 + 2 * i / (n - 1);
        u += rand(-0.12, 0.12);
        const r = S * lerp(0.3, 0.15, Math.abs(u)) * rand(0.85, 1.1);
        puffs.push({ x: u * (S / 2 - r * 0.55), r, amp: rand(0.04, 0.09), per: rand(14, 30), ph: rand(0, 6.283), dx: rand(1, 4), dper: rand(25, 50) });
      }
      const life = rand(CLOUDS.life[0], CLOUDS.life[1]);
      return { x, y, S, puffs, life, age: fresh ? 0 : rand(0, life),
        vx: CLOUDS.wind[0] * rand(0.95, 1.05), vy: CLOUDS.wind[1] * rand(0.9, 1.1),
        hb: Math.min(...puffs.map(p => p.r)) * 0.9 };
    };
    const cloudEnv = (c) => {
      const fade = Math.min(35, c.life * 0.25);
      return Math.min(1, smooth(0, fade, c.age), 1 - smooth(c.life - fade, c.life, c.age));
    };
    const drawCloud = (g, c, cx, cy, env, sec, ox, oy, P, inset, lift) => {
      const base = cy + c.S * 0.12;
      let xl = Infinity, xr = -Infinity;
      for (const p of c.puffs) {
        const r = p.r * env * (1 + p.amp * Math.sin(sec * 6.283 / p.per + p.ph)) - inset;
        if (r < 1) continue;
        const px = cx + p.x * env + p.dx * Math.sin(sec * 6.283 / p.dper + p.ph);
        const py = base - r - lift - inset;
        g.fillCircle((px - ox) / P, (py - oy) / P, r / P);
        xl = Math.min(xl, px); xr = Math.max(xr, px);
      }
      const hb = c.hb * env - inset;
      if (xr > xl && hb > 1) g.fillRect((xl - ox) / P, (base - hb - lift - inset - oy) / P, (xr - xl) / P, hb / P);
    };

    // Recorded ambience (CC0 / CC BY, see SOUND_CREDITS). Decoded once per
    // audio context and reused across map changes.
    // Read actual placed artwork once per map. Connected fountain tiles form
    // one source; source strength depends on its footprint, never tile count
    // accumulated across layers. above# duplicates are excluded.
    const localWaterSources = (scene) => {
      const tm = scene.tilemap, families = new Map(), lookup = new Map(), lake = [];
      for (const layer of tm.layers) {
        if (layer.name.startsWith('above#')) continue;
        for (const row of layer.data) for (const tile of row) {
          if (!tile || tile.index <= 0) continue;
          if (!lookup.has(tile.index)) lookup.set(tile.index, tileInfo(tm, tile.index)?.name || '');
          const name = lookup.get(tile.index);
          const x = (layer.tilemapLayer?.x ?? layer.x ?? 0) + tile.pixelX, y = (layer.tilemapLayer?.y ?? layer.y ?? 0) + tile.pixelY;
          if (scene.mapId === 'toy_town' && /^pool(?:_\d+)?$/.test(name)) lake.push({ x: x + 8, y: y + 8 });
          if (!/fountain/i.test(name)) continue;
          const family = name.replace(/_(?:\d+|tl|tr|bl|br)$/, '');
          if (!families.has(family)) families.set(family, new Map());
          families.get(family).set(`${x},${y}`, { x, y });
        }
      }
      const fountains = [];
      for (const cells of families.values()) while (cells.size) {
        const first = cells.values().next().value, group = [first];
        cells.delete(`${first.x},${first.y}`);
        for (let i = 0; i < group.length; i++) {
          const { x, y } = group[i];
          for (const [dx, dy] of [[16,0],[-16,0],[0,16],[0,-16]]) {
            const key = `${x+dx},${y+dy}`;
            if (cells.has(key)) { group.push(cells.get(key)); cells.delete(key); }
          }
        }
        const xs = group.map(p => p.x), ys = group.map(p => p.y);
        const width = Math.max(...xs) - Math.min(...xs) + 16;
        const height = Math.max(...ys) - Math.min(...ys) + 16;
        const size = Math.min(2, Math.max(width, height) / 32);
        fountains.push({ x: (Math.min(...xs)+Math.max(...xs)+16)/2,
          y: (Math.min(...ys)+Math.max(...ys)+16)/2, range: 48 + size*32, level: 0.20 + size*0.10 });
      }
      return { fountains, lake };
    };


    const sampleCache = new WeakMap();
    const ensureSamples = (ctx) => {
      let entry = sampleCache.get(ctx);
      if (entry) return entry;
      const names = Object.keys(AMB_SAMPLES);
      entry = { buffers: {}, failed: [], total: names.length, ready: names.length === 0 };
      sampleCache.set(ctx, entry);
      let left = names.length;
      for (const name of names) {
        Promise.resolve().then(() => {
          const bin = atob(AMB_SAMPLES[name]), bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          return ctx.decodeAudioData(bytes.buffer);
        }).then(b => {
          if (!b) throw new Error('Decoded ambience buffer is empty');
          entry.buffers[name] = b;
        }).catch(() => { entry.failed.push(name); })
          .finally(() => { if (--left === 0) entry.ready = true; });
      }
      return entry;
    };

    const build = (scene) => {
      ensureTextures(scene);
      const objs = [], tickers = [], cleanups = [];
      // Track each allocation before setup or the next allocation can fail.
      const own = (object) => { objs.push(object); return object; };
      try {
      const tm = scene.tilemap;
      // Never infer weather or wave ambience from a shared tileset name.
      // Tile atlases containing a 'sea' texture are used in inland maps too.
      const mapText = [scene.mapId, (scene.map && scene.map.meta && scene.map.meta.name) || ''].join(' ');
      const weather = WEATHER.filter(w => w.test.test(mapText)).slice(0, 2);
      const { lights, water, runningWater, casters } = scan(scene);
      const localWater = localWaterSources(scene);
      // Group tree tiles only for seasonal foliage emitters. Shadows use the
      // *original sprite outlines*, never the circular placeholders from 5.3.
      const treeTiles = new Map(casters.filter(c => c.above && TREES.test(c.name))
        .map(c => [c.x + ',' + c.y, c]));
      const treeGroups = [];
      for (const first of treeTiles.values()) {
        const originKey = first.x + ',' + first.y;
        if (!treeTiles.has(originKey)) continue;
        const todo = [first]; treeTiles.delete(originKey);
        let minX = first.x, maxX = first.x, bottom = first.y, top = first.y;
        for (let i = 0; i < todo.length; i++) {
          const tile = todo[i];
          minX = Math.min(minX, tile.x); maxX = Math.max(maxX, tile.x);
          bottom = Math.max(bottom, tile.y); top = Math.min(top, tile.y);
          for (const [dx,dy] of [[16,0],[-16,0],[0,16],[0,-16]]) {
            const key = (tile.x + dx) + ',' + (tile.y + dy);
            const other = treeTiles.get(key);
            if (other) { todo.push(other); treeTiles.delete(key); }
          }
        }
        if (todo.length >= 2 && treeGroups.length < 1500)
          treeGroups.push({ x: (minX + maxX + 16) / 2, y: bottom + 15,
            width: Math.min(80, Math.max(20, maxX - minX + 16)), topY: top });
      }
      const cam = scene.cameras.main;
      let s = sky(hourNow());
      const view = { x: 0, y: 0, w: 1, h: 1, getRandomPoint(p) { p.x = this.x + Math.random() * this.w; p.y = this.y + Math.random() * this.h; return p; } };
      // Directional object shadows anchored at the foot of each object.
      // Every caster tile is stamped in four horizontal slices. A slice moves
      // away from the sun in proportion to its height above the lowest caster
      // tile of its column, so trunk and crown stay one continuous silhouette
      // instead of splitting when the sun is low in the east or west.
      const STRIPS = 4, STRIP_H = 16 / STRIPS, MAX_TRUNK = 3, MAX_H = 4, MAX_H_GROUNDED = 12, RIGID_H = 1, RIGID_LEAN = 0.3;
      const crownCells = new Map(), wallCells = new Map();
      for (const c of casters) (c.above ? crownCells : wallCells).set((c.x >> 4) + ',' + (c.y >> 4), c);
      // above# layers are rendering groups and can contain touching objects.
      // Split connected artwork at part resets and changes of artwork family.
      // Each physical object gets its own foot; collision alone is not ownership.
      const aboveOwner = new Map(), objectCells = new Map();
      for (const o of scene.children.list) {
        if (o.type !== 'TilemapLayer' || !o.layer || !/^above#/.test(o.layer.name)) continue;
        const cells = new Map();
        // above# layers can be cropped to their object and placed with an
        // offset, so tile.x/tile.y are local. Use world pixel positions.
        for (const row of o.layer.data) for (const tile of row) {
          if (!tile || tile.index <= 0) continue;
          const gx = Math.round((o.x + tile.pixelX) / 16), gy = Math.round((o.y + tile.pixelY) / 16);
          const key = gx + ',' + gy, caster = crownCells.get(key);
          if (caster) cells.set(key, caster);
        }
        const left = new Set(cells.keys());
        let piece = 0;
        for (const [startKey, first] of cells) {
          if (!left.has(startKey)) continue;
          const sx = first.x >> 4, sy = first.y >> 4;
          const id = o.layer.name + '/' + (piece++), group = [], todo = [[sx, sy]];
          left.delete(startKey);
          while (todo.length) {
            const [x, y] = todo.pop();
            group.push([x, y]); aboveOwner.set(x + ',' + y, id);
            const current = cells.get(x + ',' + y);
            for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const k = (x + ax) + ',' + (y + ay);
              if (left.has(k) && adjacentShadowArt(current, cells.get(k), ax, ay)) {
                left.delete(k); todo.push([x + ax, y + ay]);
              }
            }
          }
          objectCells.set(id, group);
        }
      }
      const trunkOwner = new Map(), objectFoot = new Map();
      for (const [name, cells] of objectCells) {
        const lowest = new Map();
        let foot = -1;
        for (const [x, y] of cells) { if (y > (lowest.get(x) ?? -1)) lowest.set(x, y); if (y > foot) foot = y; }
        for (const [x, yb] of lowest) {
          let previous = crownCells.get(x + ',' + yb);
          for (let y = yb + 1; y <= yb + MAX_TRUNK; y++) {
            const key = x + ',' + y;
            const wall = wallCells.get(key);
            if (!wall || aboveOwner.has(key) || trunkOwner.has(key) || !previous.art.family ||
                !adjacentShadowArt(previous, wall, 0, 1)) break;
            trunkOwner.set(key, name);
            previous = wall;
            if (y > foot) foot = y;
          }
        }
        objectFoot.set(name, (foot + 1) * 16);
      }
      const shadowParts = [];
      let ownedSlices = 0;
      for (const c of casters) {
        if (!c.f.strips) continue;
        const cell = (c.x >> 4) + ',' + (c.y >> 4);
        const owner = c.above ? aboveOwner.get(cell) : trunkOwner.get(cell);
        if (!c.above && !owner && !c.solid) continue;
        const foot = owner ? objectFoot.get(owner) : 0;
        for (let i = 0; i < STRIPS; i++) {
          const y = c.y + i * STRIP_H;
          // Height of the slice's lower edge above the object's foot, in
          // tiles. Loose solid tiles (rocks, mushrooms, walls) move rigidly.
          const hRaw = owner ? Math.max(0, (foot - (y + STRIP_H)) / 16) : RIGID_H;
          const h = owner ? Math.min(MAX_H, hRaw) : RIGID_H;
          const hg = owner ? Math.min(MAX_H_GROUNDED, hRaw) : RIGID_H;
          shadowParts.push({ x: c.x, y, h, hg, rigid: !owner, key: c.f.key, frame: c.f.strips[i] });
          if (owner) ownedSlices++;
        }
      }
      // Two map sized layers: one is shown, the other is redrawn in small
      // portions per frame when the sun has moved, then they swap.
      const mapPxW = tm.widthInPixels, mapPxH = tm.heightInPixels;
      const shadowsWanted = SETTINGS.objectShadows && shadowParts.length > 0 && mapPxW <= 4096 && mapPxH <= 4096;
      let shadowFront = null, shadowWork = null;
      if (shadowsWanted) {
        shadowFront = own(scene.add.renderTexture(0, 0, mapPxW, mapPxH)).setOrigin(0, 0).setDepth(DEPTH_SHADOW).setVisible(false);
        shadowWork = own(scene.add.renderTexture(0, 0, mapPxW, mapPxH)).setOrigin(0, 0).setDepth(DEPTH_SHADOW).setVisible(false);
      }
      let shadowKey = '', shadowJob = null;
      let firstShadowView = '';
      const paintShadow = (target, part, job, clip = null) => {
        // The foot of every object stays where it is. Higher slices lean
        // away from the sun and sink a little, so the silhouette is a
        // slanted, slightly shorter copy that starts at the foot.
        // Grounded flips the silhouette below the foot instead.
        const ph = job.grounded ? part.hg : part.h;
        const lean = part.rigid ? job.dx * RIGID_LEAN : job.dx * ph * job.k * (job.grounded ? 0.5 : 1);
        const sink = part.rigid ? 0 : ph * 16 * job.sink;
        if (clip && (part.x + lean + 16 < clip.x || part.x + lean > clip.x + clip.w ||
            part.y + sink + STRIP_H < clip.y || part.y + sink > clip.y + clip.h)) return;
        target.stamp(part.key, part.frame,
          Math.round(part.x + lean), Math.round(part.y + sink),
          { originX: 0, originY: 0, tint: 0x000000 });
      };
      const SHADOW_SLICES_PER_FRAME = 3000;
      const hideShadows = () => { if (shadowFront) { shadowFront.setVisible(false); shadowWork.setVisible(false); } };
      const drawShadows = (skyState) => {
        if (!shadowFront) return;
        const opacity = skyState.shadow.alpha;
        if (opacity < 0.008) { hideShadows(); return; }
        const dx = skyState.shadow.dx, dy = skyState.shadow.dy;
        const grounded = SETTINGS.shadowStyle === 'grounded';
        const key = dx + ':' + dy + ':' + SHADOW_HEIGHT() + ':' + (grounded ? 'g' : 'c');
        if (key !== shadowKey && (!shadowJob || shadowJob.key !== key)) {
          // Grounded: every slice first drops to the foot of its column, so the
          // silhouette lies flat on the ground and stretches away from the sun.
          shadowJob = { key, dx, dy, k: SHADOW_HEIGHT() * 0.3, sink: grounded ? 1.35 : 0.3, grounded, i: 0 };
          shadowWork.clear();
        }
        if (shadowJob) {
          const job = shadowJob;
          // Paint the current view immediately while the full map cache is
          // filled in bounded batches. The same projection draws both layers.
          if (!shadowKey) {
            const visibleKey = job.key + ':' + [view.x,view.y,view.w,view.h].join(',');
            if (visibleKey !== firstShadowView) {
              shadowFront.clear();
              for (const part of shadowParts) paintShadow(shadowFront, part, job, view);
              shadowFront.render(); firstShadowView = visibleKey;
            }
            shadowFront.setVisible(true).setAlpha(opacity);
          }
          const end = Math.min(shadowParts.length, job.i + SHADOW_SLICES_PER_FRAME);
          for (let j = job.i; j < end; j++) {
            const part = shadowParts[j];
            paintShadow(shadowWork, part, job);
          }
          shadowWork.render();
          job.i = end;
          if (end >= shadowParts.length) {
            const shown = shadowWork; shadowWork = shadowFront; shadowFront = shown;
            shadowKey = job.key; shadowJob = null;
            shadowWork.setVisible(false);
          }
        }
        if (shadowKey) shadowFront.setVisible(true).setAlpha(opacity);
      };

      const nameOfGid = (gid) => { const i = tileInfo(tm, gid); return i ? i.name : ''; };
      // Individual above# layers are often individual objects. Reject every mixed
      // structure or rock layer, but allow actual tree tiles such as acacia_0
      // that do not literally contain the word "canopy".
      const NON_TREE = /roof|house|building|hut|tent|stone|rock|boulder|wall|fence|gate|door|window|bridge|ground|floor|tower|pillar|lamp|shrub|bush|cactus/i;
      const TREE_PART = /acacia|tree|palm|pine|oak|willow|leaf|leaves|canopy|crown|foliage|baobab|cherry|birch|fir|branch|trunk/i;
      // A crown row can share its above# layer with a rock or a roof edge. Such
      // layers used to stay rigid, so part of a tree stood still while the rest
      // swayed. Now only the tree tiles move: they are hidden in the original
      // layer and drawn into a private copy at the same depth, which sways
      // instead. Cleanup restores the original tiles.
      const splitTreeTiles = (layer, tiles) => {
        if (tiles.some(t => t.flipX || t.flipY || t.rotation)) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const t of tiles) {
          minX = Math.min(minX, t.pixelX); minY = Math.min(minY, t.pixelY);
          maxX = Math.max(maxX, t.pixelX + t.width); maxY = Math.max(maxY, t.pixelY + t.height);
        }
        const frames = tiles.map(t => tileFrame(scene, tileInfo(tm, t.index), t.index));
        if (frames.some(f => !f) || maxX <= minX || maxY <= minY) return null;
        const copy = own(scene.add.renderTexture(layer.x + minX, layer.y + minY, maxX - minX, maxY - minY))
          .setOrigin(0, 0).setDepth(layer.depth).setAlpha(layer.alpha);
        tiles.forEach((t, i) => copy.stamp(frames[i].key, frames[i].name, t.pixelX - minX, t.pixelY - minY,
          { originX: 0, originY: 0 }));
        copy.render();
        const saved = tiles.map(t => [t, t.visible, t.alpha]);
        cleanups.push(() => { for (const [t, visible, alpha] of saved) { try { t.visible = visible; t.alpha = alpha; } catch {} } });
        for (const t of tiles) { t.visible = false; t.alpha = 0; }
        return copy;
      };
      const trees = [];
      // The giant tree uses three leaf masses. Branches stay fixed. Build these
      // small masks once from the placed tiles, including above# layer offsets.
      const splitGiantTrees = () => {
        const groups = new Map(), hidden = new Set();
        for (const layer of [...scene.children.list]) {
          if (layer.type !== 'TilemapLayer' || !layer.layer?.name?.startsWith('above#')) continue;
          for (const row of layer.layer.data) for (const tile of row) {
            if (!tile || tile.index <= 0 || tile.flipX || tile.flipY || tile.rotation) continue;
            const match = /^bigtree_(\d+)$/.exec(nameOfGid(tile.index));
            if (!match || Number(match[1]) >= 12) continue;
            const index = Number(match[1]), x = layer.x + tile.pixelX - index % 4 * 16;
            const y = layer.y + tile.pixelY - Math.floor(index / 4) * 16, key = x + ',' + y;
            if (!groups.has(key)) groups.set(key, { x, y, depth: layer.depth, cells: [] });
            const group = groups.get(key); group.depth = Math.max(group.depth, layer.depth);
            group.cells.push({ tile, index });
          }
        }
        let serial = 0;
        for (const group of groups.values()) {
          const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 48;
          const ctx = canvas.getContext('2d');
          for (const { tile, index } of group.cells) {
            const info = tileInfo(tm, tile.index), frame = info.ts.getTileTextureCoordinates(tile.index);
            const image = scene.textures.get(info.ts.image.key).getSourceImage();
            ctx.drawImage(image, frame.x, frame.y, 16, 16, index % 4 * 16, Math.floor(index / 4) * 16, 16, 16);
          }
          const input = ctx.getImageData(0, 0, 64, 48), parts = [0,1,2,3].map(() => ctx.createImageData(64, 48));
          const centres = [[29,9],[13,27],[47,30]];
          for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) {
            const k = (y * 64 + x) * 4, r = input.data[k], g = input.data[k+1], b = input.data[k+2];
            if (!input.data[k+3]) continue;
            const leaves = g > r * 1.08 && g > b * 1.15;
            const distances = centres.map(([cx,cy]) => Math.hypot(x-cx,y-cy));
            const nearest = Math.min(...distances);
            for (let part = 0; part < 4; part++) {
              // One pixel of overlap hides seams between neighbouring leaf masses.
              if (part === 3 ? leaves : !leaves || distances[part] > nearest + 1) continue;
              parts[part].data.set(input.data.subarray(k,k+4),k);
            }
          }
          const phase = Math.random() * 6.283;
          for (let part = 0; part < 4; part++) {
            const key = 'digimmo:giant:' + scene.mapId + ':' + serial + ':' + part;
            const c = document.createElement('canvas'); c.width=64;c.height=48;c.getContext('2d').putImageData(parts[part],0,0);
            // Register cleanup before the next allocation can fail.
            const ownedImages = [];
            cleanups.push(() => { for (const o of ownedImages) o.destroy(); if (scene.textures.exists(key)) scene.textures.remove(key); });
            scene.textures.addCanvas(key,c);
            const image = own(scene.add.image(group.x,group.y,key)); ownedImages.push(image);
            image.setOrigin(0).setDepth(group.depth);
            if (part < 3) trees.push({ L:image,bx:group.x,by:group.y,ph:phase + part*0.45,maxStrength:1 });
          }
          const saved = group.cells.map(({tile})=>[tile,tile.visible,tile.alpha]);
          cleanups.push(()=>{for(const [t,visible,alpha] of saved){t.visible=visible;t.alpha=alpha;}});
          for (const {tile} of group.cells) {hidden.add(tile);tile.visible=false;tile.alpha=0;}
          serial++;
        }
        return hidden;
      };
      const giantTiles = splitGiantTrees();
      for (const o of [...scene.children.list]) {
        if (o.type !== 'TilemapLayer' || !o.layer?.name?.startsWith('above#')) continue;
        const treeTiles = [];
        let otherTileCount = 0, tooLarge = false;
        for (const row of o.layer.data) {
          for (const tile of row) {
            if (!tile || tile.index <= 0) continue;
            if (giantTiles.has(tile)) { otherTileCount++; continue; }
            const name = nameOfGid(tile.index);
            if (!NON_TREE.test(name) && TREE_PART.test(name)) treeTiles.push(tile);
            else otherTileCount++;
            if (treeTiles.length + otherTileCount > 256) { tooLarge = true; break; }
          }
          if (tooLarge) break;
        }
        if (tooLarge || !treeTiles.length) continue;
        const moving = otherTileCount === 0 ? o : splitTreeTiles(o, treeTiles);
        if (moving) trees.push({ L: moving, bx: moving.x, by: moving.y, ph: Math.random() * 6.283 });
      }
      const wl = Math.hypot(CLOUDS.wind[0], CLOUDS.wind[1]) || 1, wdx = CLOUDS.wind[0] / wl, wdy = CLOUDS.wind[1] / wl;
      const swayTrees = (time) => {
        const t = time / 1000;
        for (const tr of trees) {
          if (!SETTINGS.wind) { tr.L.x = tr.bx; continue; }
          const along = tr.bx * wdx + tr.by * wdy;
          const gust = 0.5 + 0.5 * Math.sin(along / SWAY.gustLength - t * SWAY.gustSpeed);
          const sway = Math.sin(t * SWAY.speed + tr.ph) * gust;
          const strength = Math.min(SWAY.strong, tr.maxStrength ?? Infinity);
          tr.L.x = tr.bx + Math.round(sway * (gust > 0.75 ? strength : Math.min(1, strength)) * wdx);
        }
      };

      const P = CLOUDS.px;
      const cloudShadow = own(scene.add.renderTexture(0, 0, 4, 4)).setOrigin(0, 0).setScale(P).setDepth(DEPTH_NIGHT - 1000);
      const cloudBody = own(scene.add.renderTexture(0, 0, 4, 4)).setOrigin(0, 0).setScale(P).setDepth(DEPTH_GLOW + 100000);
      const cloudGfx = own(scene.make.graphics({ add: false }));
      const mapW = tm.widthInPixels, mapH = tm.heightInPixels;
      const cloudList = [];
      // Network and its two dungeon variants have no outdoor sky.
      const cloudCount = /^network(?:_|$)/i.test(scene.mapId) ? 0
        : Math.max(4, Math.min(64, Math.round(mapW * mapH * CLOUDS.density)));
      for (let i = 0; i < cloudCount; i++) cloudList.push(makeCloud(mapW, mapH, false, cloudList));
      let lastCloudSec = null;
      let visibleClouds = 0;
      const nightRT = own(scene.add.renderTexture(0, 0, 4, 4)).setOrigin(0, 0).setDepth(DEPTH_NIGHT).setBlendMode(MULTIPLY);
      const ownPos = () => {
        try {
          const v = scene.views && scene.views.get(scene.ownId);
          if (v && v.sprite) return { x: v.sprite.x, y: v.sprite.y };
          const e = window.dmo.net.state.entities.get(window.dmo.net.hello.tamerId);
          return e ? { x: e.x, y: e.y } : null;
        } catch { return null; }
      };

      // Tile-local aperture masks are generated from reviewed public artwork.
      // One atlas and one viewport render target serve all added light sources.
      const fxStyle = {
        facadeGlass:[0xbad7ef,0,0.16,0.12], ruinWindow:[0xffcf85,0,0.28,0.16],
        window:[0xffdca0,0,0.32,0.24], violetWindow:[0xb69bea,0,0.28,0.22], stained:[0xd8c7ed,0,0.23,0.20],
        furnace:[0xffac55,0.22,0.36,0.40], candle:[0xffd58c,0.15,0.42,0.30], acid:[0x8fdf57,0.05,0.14,0.18],
        devimon:[0xc74c61,0,0.22,0.24], generator:[0xff645b,0,0.32,0.32], machineSigil:[0xe86d88,0,0.26,0.24],
        summon:[0xb081ef,0.08,0.30,0.26], coral:[0xc5a5f0,0.025,0.095,0.12], pumpkin:[0xffb54d,0.18,0.35,0],
        altarCrystal:[0xb18af0,0.035,0.20,0.22], altarGold:[0xf0c87d,0.015,0.16,0.18],
        tv:[0x9ed9ff,0.10,0.26,0.28], car:[0xffe4ae,0,0.42,0.26], phone:[0xb5e4ff,0.025,0.12,0.28], altarThrone:[0xb48ae8,0,0.30,0.42],
      };
      const fxKey = 'digimmo:apertures16', fxData = EMISSIVE_TILES;
      if (!scene.textures.exists(fxKey)) {
        const entries = Object.entries(fxData), canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = Math.ceil(entries.length / 16) * 16;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff';
        entries.forEach(([key,[,mask]],i)=>{
          const bx=i%16*16,by=Math.floor(i/16)*16;
          for(let y=0;y<16;y++){const bits=parseInt(mask.slice(y*4,y*4+4),16);for(let x=0;x<16;x++)if(bits>>x&1)ctx.fillRect(bx+x,by+y,1,1);}
        });
        const texture = scene.textures.addCanvas(fxKey,canvas);
        entries.forEach(([key],i)=>texture.add(key,0,i%16*16,Math.floor(i/16)*16,16,16));
      }
      const fxTiles = [], fxLights = [], fxSeen = new Set(), fxBuckets = new Map();
      const addFxLight = (kind,x,y) => {
        const bucket = kind+':'+Math.floor(x/32)+','+Math.floor(y/32);
        let group=fxBuckets.get(bucket);
        if(!group){group={kind,x:0,y:0,n:0};fxBuckets.set(bucket,group);fxLights.push(group);}
        group.x+=x;group.y+=y;group.n++;
      };
      for(const layer of tm.layers){
        if(layer.name.startsWith('above#'))continue;
        for(const row of layer.data)for(const tile of row){
          if(!tile||tile.index<=0)continue;
          const info=tileInfo(tm,tile.index);if(!info)continue;
          const key=info.ts.name+':'+info.name,definition=fxData[key];if(!definition)continue;
          const kind=definition[0];
          if(kind==='coral'&&scene.mapId!=='spiral_sea')continue;
          if((kind==='altarGold'||kind==='altarCrystal')&&scene.mapId!=='spiral_summit')continue;
          if(kind==='tv'&&!/^(gate_village|primary_village)$/.test(scene.mapId))continue;
          const x=(layer.tilemapLayer?.x||0)+tile.pixelX,y=(layer.tilemapLayer?.y||0)+tile.pixelY;
          if(kind==='ruinWindow'){
            // Keep the same few windows lit across reloads. Slabs follow their upper pane.
            const topY=y-(info.name.startsWith('ocw_slab')?16:0);
            let hash=Math.imul((x/16)|0,73856093)^Math.imul((topY/16)|0,19349663);
            hash=Math.imul(hash^(hash>>>16),0x45d9f3b);hash^=hash>>>16;
            if((hash>>>0)%5!==0)continue;
          }
          const id=key+':'+x+','+y;if(fxSeen.has(id))continue;fxSeen.add(id);
          let sx=0,sy=0,n=0;
          for(let py=0;py<16;py++){const bits=parseInt(definition[1].slice(py*4,py*4+4),16);for(let px=0;px<16;px++)if(bits>>px&1){sx+=px;sy+=py;n++;}}
          const cx=n?sx/n+0.5:8,cy=n?sy/n+0.5:8;
          const dx=(cx-8)*(tile.flipX?-1:1),dy=(cy-8)*(tile.flipY?-1:1),angle=tile.rotation||0;
          const lightX=x+8+dx*Math.cos(angle)-dy*Math.sin(angle),lightY=y+8+dx*Math.sin(angle)+dy*Math.cos(angle);
          fxTiles.push({kind,key,x:x+8,y:y+8,flipX:!!tile.flipX,flipY:!!tile.flipY,rotation:tile.rotation||0});
          if(fxStyle[kind][3]>0)addFxLight(kind,lightX,lightY);
          if(kind==='altarGold'&&info.name.startsWith('throne_'))addFxLight('altarThrone',lightX,lightY);
        }
      }
      const phonePoints=[];
      for(const layer of tm.objects||[])for(const object of layer.objects||[]){
        if(object.name!=='digiphone')continue;
        // Public sprite anchor [16,46], roof centre [16,7].
        const x=object.x,y=object.y-39;phonePoints.push({x,y});addFxLight('phone',x,y);
      }
      for(const point of fxLights){point.x/=point.n;point.y/=point.n;}
      const fxRT=fxTiles.length?own(scene.add.renderTexture(0,0,4,4)).setOrigin(0).setDepth(DEPTH_GLOW-1).setBlendMode(ADD):null;
      let fxLast=-Infinity,fxState='',fxVisible=[];
      const fxAmount=(kind,time)=>{
        const style=fxStyle[kind],dark=SETTINGS.dayNight?s.dark:0;
        const flicker=kind==='furnace'||kind==='candle'?0.94+0.06*Math.sin(time/430):1;
        return SETTINGS.lights?(style[1]+style[2]*dark)*flicker:0;
      };
      const updateMapEffects=(time,ox,oy,w,h)=>{
        const state=[ox,oy,w,h,SETTINGS.lights,s.dark.toFixed(2)].join(':');
        if(time-fxLast<100&&state===fxState)return;fxLast=time;fxState=state;
        fxVisible=SETTINGS.lights?fxLights.filter(p=>p.x>ox-48&&p.y>oy-48&&p.x<ox+w+48&&p.y<oy+h+48):[];
        if(!fxRT)return;
        if(fxRT.texture.width!==w||fxRT.texture.height!==h)fxRT.resize(w,h);
        fxRT.setPosition(ox,oy).setVisible(!!SETTINGS.lights);fxRT.clear();
        let count=0;
        for(const tile of fxTiles){
          if(tile.x<ox-16||tile.y<oy-16||tile.x>ox+w+16||tile.y>oy+h+16)continue;
          const alpha=fxAmount(tile.kind,time);if(alpha<=0)continue;
          fxRT.stamp(fxKey,tile.key,tile.x-ox,tile.y-oy,{alpha,tint:fxStyle[tile.kind][0],scaleX:tile.flipX?-1:1,scaleY:tile.flipY?-1:1,rotation:tile.rotation});
          if(++count>=1024)break;
        }
        fxRT.render();
      };
      const stampMapLights=(time,ox,oy)=>{
        let count=0;
        for(const point of fxVisible){
          const style=fxStyle[point.kind],alpha=fxAmount(point.kind,time);if(alpha<=0)continue;
          nightRT.stamp('digimmo:light2',undefined,Math.round(point.x-ox),Math.round(point.y-oy),
            {tint:style[0],scale:style[3],alpha:Math.min(0.55,alpha*1.2),blendMode:ADD});
          if(++count>=128)break;
        }
      };
      // Shared emitters, not one emitter per light. Only on-screen sources emit.
      const detailEmitters=[];
      for(const [kind,points,frequency,tint] of [
        ['phone',phonePoints,950,0xb5e4ff],
        ['furnace',fxLights.filter(p=>p.kind==='furnace'),600,0xffad50],
      ]){
        if(!points.length)continue;
        const em=own(scene.add.particles(0,0,'digimmo:px',{
          emitting:false,maxParticles:24,lifespan:{min:900,max:1800},speedX:{min:-2,max:2},speedY:{min:-9,max:-4},
          alpha:{start:0,end:0.5,ease:sinEase},scale:1,tint,blendMode:ADD,frequency,quantity:1,
        })).setDepth(DEPTH_GLOW);
        detailEmitters.push({em,points,kind,next:0});
      }
      const updateDetailParticles=(time)=>{
        for(const entry of detailEmitters){
          const on=SETTINGS.lights&&(entry.kind!=='furnace'||SETTINGS.fireEmbers);
          entry.em.setVisible(!!on).setAlpha(entry.kind==='phone'?0.2+0.8*(SETTINGS.dayNight?s.dark:0):1);
          if(!on||time<entry.next)continue;
          const points=entry.points.filter(p=>p.x>view.x&&p.x<view.x+view.w&&p.y>view.y&&p.y<view.y+view.h);
          entry.next=time+(entry.kind==='phone'?950:600);
          if(!points.length)continue;
          const point=points[Math.floor(Math.random()*points.length)];
          entry.em.emitParticleAt(point.x+(Math.random()-0.5)*12,point.y,1);
        }
      };
      const hideMapEffects=()=>{fxRT?.setVisible(false);for(const {em} of detailEmitters)em.setVisible(false);};

      const season = seasonNow(), seasonCfg = SEASONS[season];
      const extra = [];
      if (SETTINGS.seasons && SETTINGS.weather && seasonCfg.snow && !weather.some(w => /Snow|Sandstorm|Data/.test(w.name)))
        extra.push({ name: 'Winter', layers: [{ cfg: { lifespan: [7000, 11000], speedX: [3, 9], speedY: [10, 20], accelX: [-5, 5], scale: [1, 2], alpha: 0.8, tint: [0xffffff, 0xeef6ff], rate: 70 } }] });
      const nightOnly = [], northSnow = [];
      // Holy Peaks: the upper snowy plateau ends at world Y 480.
      const snowBottom = scene.mapId === 'holy_peaks' ? 480 : Infinity;
      const northernSnowZone = { getRandomPoint(p) {
        p.x = view.x + Math.random() * view.w;
        p.y = view.y + Math.random() * Math.max(0, Math.min(view.y + view.h, snowBottom) - view.y);
        return p;
      } };
      // Forest leaves are a seasonal effect, not permanent regional weather.
      // Spring/autumn particles are emitted by actual tree crowns below.
      const regionWeather = weather.flatMap(w => w.name === 'Leaves'
        ? [{ name: 'Forest fireflies', layers: w.layers.filter(layer => layer.night) }]
        : [w]).concat(extra);
      for (const w of regionWeather) for (const layer of w.layers) {
        if (!SETTINGS.weather && !layer.night) continue;
        if (layer.night && !SETTINGS.fireflies) continue;
        const c = layer.cfg, restrictedSnow = snowBottom !== Infinity && /Snow|Winter/.test(w.name);
        const conf = {
          emitZone: { type: 'random', source: restrictedSnow ? northernSnowZone : view },
          lifespan: { min: c.lifespan[0], max: c.lifespan[1] },
          speedX: { min: c.speedX[0], max: c.speedX[1] },
          speedY: { min: c.speedY[0], max: c.speedY[1] },
          scale: { min: c.scale[0], max: c.scale[1] },
          alpha: { start: 0, end: c.alpha, ease: c.ease || sinEase },
          tint: c.tint,
          frequency: c.rate / SETTINGS.weatherDensity,
          quantity: 1,
        };
        if (restrictedSnow) {
          conf.emitting = false;
          // Only emission is restricted. Existing flakes finish their natural fade.
        }
        if (c.accelX) conf.accelerationX = { min: c.accelX[0], max: c.accelX[1] };
        if (c.add) conf.blendMode = ADD;
        const em = own(scene.add.particles(0, 0, layer.key || 'digimmo:px', conf));
        em.setDepth(layer.lum ? DEPTH_GLOW : DEPTH_NIGHT - 500);
        if (layer.night) nightOnly.push(em);
        if (restrictedSnow) northSnow.push(em);
      }

      const treesInView = [];
      if (SETTINGS.seasons && seasonCfg.tree && treeGroups.length) {
        const t = seasonCfg.tree;
        const leaves = own(scene.add.particles(0, 0, 'digimmo:leaf', {
          emitZone: { type: 'random', source: { getRandomPoint: (p) => {
            const tr = treesInView.length ? treesInView[(Math.random() * treesInView.length) | 0] : null;
            if (!tr) { p.x = -9999; p.y = -9999; return p; }
            p.x = tr.x + (Math.random() - 0.5) * tr.width;
            p.y = tr.topY + 8 + Math.random() * Math.max(8, tr.y - tr.topY - 10);
            return p;
          } } },
          lifespan: { min: 4700, max: 7800 },
          speedX: { min: 2, max: 7 }, speedY: { min: 6, max: 11 },
          accelerationX: { min: -10, max: 10 },
          scale: { min: t.scale[0], max: t.scale[1] },
          alpha: { start: 0, end: 0.72, ease: (k) => Math.min(1, k * 8) * (1 - smooth(0.75, 1, k)) },
          tint: t.tint,
          frequency: t.rate,
          quantity: 1,
        }));
        leaves.setDepth(DEPTH_NIGHT - 500);
      }

      const reflectionFootY = (sp) => sp.y + (1 - (sp.originY ?? 0.5)) *
        Math.abs(Number(sp.displayHeight) || (sp.frame.height * Math.abs(sp.scaleY || 1)));
      let reflRT = null, notWater = null;
      const waterSet = new Set(water.map(w => (w.x >> 4) + ',' + (w.y >> 4)));
      if (SETTINGS.reflections && water.length) {
        // Viewport sized mask, not a full map framebuffer. White erases pixels;
        // transparent water tiles let reflections show through.
        notWater = own(scene.add.renderTexture(0, 0, 4, 4)).setOrigin(0, 0);
        scene.children.remove(notWater);
        reflRT = own(scene.add.renderTexture(0, 0, 4, 4)).setOrigin(0, 0)
          .setDepth(DEPTH_NIGHT - 2000); // Above late foreground water tiles; masked to water only.
      }
      // Find the closest shoreline in any direction. The reflection stays
      // vertically inverted; its body extends into the water from that bank.
      const reflectionAnchor = (x, y, width, height) => {
        const reach = 24, cx = Math.floor(x / 16), cy = Math.floor(y / 16);
        let closest = null, best = reach * reach + 1;
        for (let ty = cy - 2; ty <= cy + 2; ty++) for (let tx = cx - 2; tx <= cx + 2; tx++) {
          if (!waterSet.has(tx + ',' + ty)) continue;
          const px = Math.max(tx * 16 + 1, Math.min(tx * 16 + 15, x));
          const py = Math.max(ty * 16 + 1, Math.min(ty * 16 + 15, y));
          const d = (px - x) ** 2 + (py - y) ** 2;
          if (d < best) { best = d; closest = { x: px, y: py }; }
        }
        if (!closest) return null;
        const dx = closest.x - x, dy = closest.y - y, length = Math.hypot(dx, dy);
        if (length <= 2) return { x, y: y + 1 };
        return { x: closest.x + dx / length * width * 0.4,
          y: closest.y + dy / length * height * 0.5 - height * 0.5 };
      };
      let waterMaskPosition = '';
      let lastReflectionFrame = -Infinity;
      const updateWaterMask = (ox, oy, width, height) => {
        if (!notWater) return;
        const state = [ox, oy, width, height].join(':');
        if (waterMaskPosition === state) return;
        waterMaskPosition = state;
        if (notWater.texture.width !== width || notWater.texture.height !== height)
          notWater.resize(width, height);
        notWater.clear();
        notWater.fill(0xffffff, 1);
        const left = Math.floor(ox / 16), right = Math.ceil((ox + width) / 16);
        const top = Math.floor(oy / 16), bottom = Math.ceil((oy + height) / 16);
        for (let cy = top; cy <= bottom; cy++) for (let cx = left; cx <= right; cx++) {
          if (!waterSet.has(cx + ',' + cy)) continue;
          const x = cx * 16 - ox, y = cy * 16 - oy;
          // Use Phaser's explicit erase() operation to punch transparent
          // water holes in the opaque inverse mask. Stamp blending differed
          // between Phaser renderer builds, sometimes hiding the whole sprite.
          notWater.erase('digimmo:waterHole', x + 8, y + 8);
        }
        notWater.render();
      };

/* @ambience */
      for (const l of lights) {
        l.flick = 1;
        if (SETTINGS.lights) {
          const glow = own(scene.add.image(Math.round(l.x), Math.round(l.y),
            l.kind === 'portal' ? 'digimmo:portalGlow' : 'digimmo:glow'))
            .setTint(l.def.color).setBlendMode(ADD).setDepth(-993.7).setAlpha(0);
          const seed = Math.random() * 1000;
          tickers.push((t) => {
            const f = l.def.flicker;
            const n = Math.sin(t / 90 + seed) * 0.5 + Math.sin(t / 37 + seed * 2) * 0.3 + Math.sin(t / 13 + seed * 3) * 0.2;
            l.flick = 1 - f + f * n;
            // Ground illumination goes below sprites and fades almost entirely at noon.
            glow.setAlpha(Math.min(0.65, l.def.alpha * l.flick * (0.06 + 0.6 * s.dark)));
          });
        }
        if (SETTINGS.fireEmbers && l.def.embers) {
          const em = own(scene.add.particles(l.x, l.y - 4, 'digimmo:px', {
            lifespan: { min: 900, max: 1700 },
            speedX: { min: -5, max: 5 },
            speedY: { min: -26, max: -12 },
            accelerationX: { min: -6, max: 6 },
            alpha: { start: 1, end: 0 },
            tint: [0xffe08a, 0xffa040, 0xff6020],
            frequency: l.def.emberRate || 220,
            quantity: 1,
            emitZone: { type: 'random', source: { getRandomPoint: (p) => { p.x = -5 + Math.random() * 10; p.y = -2 + Math.random() * 4; return p; } } },
          }));
          em.setDepth(DEPTH_GLOW);
        }
      }

      if (SETTINGS.waterSparkles && water.length) {
        const pts = water;
        const sparkle = own(scene.add.particles(0, 0, 'digimmo:px', {
          emitZone: { type: 'random', source: { getRandomPoint: (p) => { const w = pts[(Math.random() * pts.length) | 0]; p.x = w.x + Math.random() * 16; p.y = w.y + Math.random() * 16; return p; } } },
          lifespan: { min: 300, max: 700 },
          alpha: { start: 0.9, end: 0 },
          tint: [0xffffff, 0xd8f4ff],
          frequency: Math.max(30, 4000 / pts.length * 6),
          quantity: 1,
        }));
        sparkle.setDepth(DEPTH_GLOW - 2);
      }

      const game = () => window.dmo.game;
      let lastSky = -1e9;
      const mapIdAtBuild = scene.mapId;
      let firstView = true;
      const update = (time) => {
        // During map transitions the world scene may outlive the tilemap.
        // Never touch retired Phaser textures during that loading interval.
        if (!scene.sys?.settings?.active || !scene.worldDrawn ||
            scene.tilemap !== tm || scene.mapId !== mapIdAtBuild ||
            !scene.views?.get?.(scene.ownId)?.sprite) {
          cloudShadow.setVisible(false); cloudBody.setVisible(false);
          nightRT.setVisible(false);
          hideMapEffects();
          if (reflRT) reflRT.setVisible(false);
          hideShadows();
          ambStop();
          return;
        }
        // The original scene may remain technically active while the UI is
        // loading the next map. Never draw an overlay above that loading screen.
        const worldState = window.dmo?.store?.getState?.()?.world;
        const expectedId = worldState?.mapId;
        const loading = worldState?.loading === true || worldState?.isLoading === true || worldState?.teleporting === true;
        if (loading || (expectedId && expectedId !== mapIdAtBuild)) {
          cloudShadow.setVisible(false); cloudBody.setVisible(false);
          nightRT.setVisible(false);
          hideMapEffects();
          hideShadows();
          if (reflRT) reflRT.setVisible(false);
          ambStop();
          return;
        }
        // camera.worldView is refreshed only when the camera renders, so during
        // a fast zoom it lags one frame behind. Cover the union of the stale
        // view and the view computed from the current zoom and scroll.
        const cv = !firstView && cam.worldView?.width > 0 ? cam.worldView : null, z = cam.zoom || 1;
        firstView = false;
        const vw = cam.width / z, vh = cam.height / z;
        const vx = cam.scrollX + (cam.width - vw) * (cam.originX ?? 0.5);
        const vy = cam.scrollY + (cam.height - vh) * (cam.originY ?? 0.5);
        const x0 = Math.min(vx, cv ? cv.x : vx), y0 = Math.min(vy, cv ? cv.y : vy);
        const x1 = Math.max(vx + vw, cv ? cv.right : vx + vw), y1 = Math.max(vy + vh, cv ? cv.bottom : vy + vh);
        const wv = { x: x0, y: y0, width: x1 - x0, height: y1 - y0, right: x1, bottom: y1,
          centerX: vx + vw / 2, centerY: vy + vh / 2 };
        if (!Number.isFinite(wv.width) || !Number.isFinite(wv.height) ||
            wv.width <= 0 || wv.height <= 0 || wv.width > 4096 || wv.height > 4096) return;
        view.x = wv.x - 32; view.y = wv.y - 32; view.w = wv.width + 64; view.h = wv.height + 64;

        if (anim || time - lastSky > 2000) {
          lastSky = time;
          s = sky(hourNow());
        }

        for (const em of northSnow) {
          const on = SETTINGS.weather && view.y < snowBottom;
          if (em.emitting !== on) { if (on) em.start(); else em.stop(); }
        }
        updateDetailParticles(time);
        for (const fn of tickers) fn(time);
        swayTrees(time);
        treesInView.length = 0;
        for (const tr of treeGroups) if (tr.x > wv.x - 40 && tr.x < wv.right + 40 && tr.y > wv.y - 40 && tr.topY < wv.bottom + 10) treesInView.push(tr);
        for (const em of nightOnly) { const on = s.dark > 0.35; em.setVisible(on); if (em.emitting !== on) { if (on) em.start(); else em.stop(); } }

        const M = 48;
        const ox = Math.floor((wv.x - M) / P) * P, oy = Math.floor((wv.y - M) / P) * P;
        const W = Math.ceil((wv.width + 2 * M) / P) * P + P, H = Math.ceil((wv.height + 2 * M) / P) * P + P;
        const cw = W / P, ch = H / P;

        const sec = time / 1000;
        const dt = lastCloudSec === null ? 0 : Math.min(0.25, sec - lastCloudSec);
        lastCloudSec = sec;
        for (let i = 0; i < cloudList.length; i++) {
          const c = cloudList[i];
          c.age += dt; c.x += c.vx * dt; c.y += c.vy * dt;
          if (c.age >= c.life || c.x > mapW + 450 || c.y > mapH + 450) { cloudList[i] = null; cloudList[i] = makeCloud(mapW, mapH, true, cloudList); }
        }
        const offX = s.shadow.dx * CLOUDS.height, offY = s.shadow.dy * CLOUDS.height + 12;
        const parX = wv.centerX * CLOUDS.parallax, parY = wv.centerY * CLOUDS.parallax;
        const inView = (x, y, r) => x + r > ox && x - r < ox + W && y + r > oy && y - r < oy + H;
        // At zoom 4 hide only the cloud bodies. Ground shadows stay visible.
        const closeZoom = Number(cam.zoom) >= 4;
        visibleClouds = closeZoom ? 0 : cloudList.filter(c => inView(c.x - parX, c.y - parY, c.S * 0.3)).length;
        stats.cloudsInView = visibleClouds;
        stats.cloudsHiddenByZoom = closeZoom;

        const showClouds = cloudCount > 0 && SETTINGS.cloudShadows && s.cloud > 0.005;
        cloudShadow.setVisible(showClouds);
        cloudGfx.clear();
        if (showClouds) {
          cloudGfx.fillStyle(0x000000, 1);
          for (const c of cloudList) {
            const env = cloudEnv(c); if (env <= 0.01) continue;
            const x = c.x + offX, y = c.y + offY;
            if (inView(x, y, c.S)) drawCloud(cloudGfx, c, x, y, env, sec, ox, oy, P, 0, 0);
          }
          if (cloudShadow.texture.width !== cw || cloudShadow.texture.height !== ch) cloudShadow.resize(cw, ch).setScale(P);
          cloudShadow.setPosition(ox, oy).setAlpha(s.cloud);
          cloudShadow.clear(); cloudShadow.draw(cloudGfx, 0, 0); cloudShadow.render();
        }

        // Draw object shadows on a cached layer without repeatedly compositing
        // giant dynamic textures during every camera update.
        drawShadows(s);

        cloudGfx.clear();
        let anyBody = false;
        for (const pass of (!closeZoom && SETTINGS.clouds ? [0, 1] : [])) {
          cloudGfx.fillStyle(pass === 0 ? CLOUDS.shade : 0xffffff, 1);
          for (const c of cloudList) {
            const env = cloudEnv(c); if (env <= 0.01) continue;
            const x = c.x - parX, y = c.y - parY;
            if (!inView(x, y, c.S)) continue;
            anyBody = true;
            drawCloud(cloudGfx, c, x, y, env, sec, ox, oy, P, pass === 0 ? 0 : 2, pass === 0 ? 0 : 3);
          }
        }
        cloudBody.setVisible(!closeZoom && SETTINGS.clouds && anyBody);
        if (!closeZoom && SETTINGS.clouds && anyBody) {
          if (cloudBody.texture.width !== cw || cloudBody.texture.height !== ch) cloudBody.resize(cw, ch).setScale(P);
          cloudBody.setPosition(ox, oy).setAlpha(s.cloudBody).setTint(s.cloudTint);
          cloudBody.clear(); cloudBody.draw(cloudGfx, 0, 0);
          if (CLOUDS.playerClear > 0) {
            const p = ownPos();
            if (p) cloudBody.stamp('digimmo:light2', undefined, (p.x - ox) / P, (p.y - 12 - oy) / P, { scale: 0.56 * CLOUDS.playerClear * 2 / P, blendMode: ERASE });
          }
          cloudBody.render();
        }

        // Mirror the character about its feet. Clip only to actual water tiles,
        // without allocating a huge texture for the whole map.
        if (reflRT && (time - lastReflectionFrame >= 80 || lastReflectionFrame < 0)) {
          lastReflectionFrame = time;
          updateWaterMask(ox, oy, W, H);
          let any = false;
          let candidates = 0;
          if (reflRT.texture.width !== W || reflRT.texture.height !== H) reflRT.resize(W, H);
          reflRT.setPosition(ox, oy);
          reflRT.clear();
          if (scene.views) for (const v of scene.views.values()) {
            const sp = v.sprite;
            if (!sp || !sp.visible || !sp.texture || !sp.frame) continue;
            const height = Math.abs(Number(sp.displayHeight) || sp.frame.height * (sp.scaleY || 1));
            const footY = reflectionFootY(sp);
            if (sp.x < ox - 48 || sp.x > ox + W + 48 || footY < oy - height || footY > oy + H) continue;
            const width = Math.abs(Number(sp.displayWidth) || sp.frame.width * (sp.scaleX || 1));
            const anchor = reflectionAnchor(sp.x, footY, width, height);
            if (!anchor) continue;
            any = true; candidates++;
            const wobble = Math.round(Math.sin(time / 280 + sp.y / 7) * REFLECT.wobble);
            reflRT.stamp(sp.texture.key, sp.frame.name,
              Math.round(anchor.x - ox + wobble), Math.round(anchor.y - oy), {
                originX: sp.originX ?? 0.5,
                originY: 1,
                scaleX: Math.abs(sp.scaleX || 1) * (sp.flipX ? -1 : 1),
                scaleY: -Math.abs(sp.scaleY || 1),
                alpha: REFLECT.alpha, tint: REFLECT.tint,
              });
          }
          if (any) reflRT.erase(notWater, 0, 0);
          stats.reflectionCandidates = candidates;
          reflRT.render();
          reflRT.setVisible(any);
        }

        updateMapEffects(time,ox,oy,W,H);
        ambUpdate(time);

        const needNight = SETTINGS.dayNight && s.color !== 0xffffff && !!ownPos();
        nightRT.setVisible(needNight);
        if (needNight) {
          if (nightRT.texture.width !== W || nightRT.texture.height !== H) nightRT.resize(W, H);
          nightRT.setPosition(ox, oy);
          nightRT.clear();
          nightRT.fill(s.color, 1);
          const R = 90;
          for (const l of SETTINGS.lights ? lights : []) {
            if (l.x < ox - R || l.y < oy - R || l.x > ox + W + R || l.y > oy + H + R) continue;
            nightRT.stamp(l.kind === 'portal' ? 'digimmo:portalGlow' : 'digimmo:light2',
              undefined, Math.round(l.x - ox), Math.round(l.y - oy),
              { tint: l.def.lightColor, scale: l.kind === 'portal' ? 1 : l.def.light,
                  alpha: Math.min(1, s.dark * 1.2) * (0.85 + 0.15 * l.flick), blendMode: ADD });
          }
          if (PLAYER_LIGHT() > 0 && s.dark > 0.2) {
            const glowAlpha = (s.dark - 0.2) / 0.8;
            // Every other visible character carries a smaller, softer light:
            // other tamers, partner Digimon, wild Digimon and NPCs. Sized by
            // sprite height, nearest first, capped for performance.
            if (scene.views) {
              const others = [];
              for (const [id, v] of scene.views) {
                const sp = v && v.sprite;
                if (!sp || id === scene.ownId || !sp.visible || !sp.active) continue;
                if (sp.x < ox - 160 || sp.y < oy - 160 || sp.x > ox + W + 160 || sp.y > oy + H + 160) continue;
                others.push(sp);
              }
              const me = ownPos();
              if (me && others.length > 48) others.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
              for (const sp of others.slice(0, 48)) {
                const height = Math.abs(Number(sp.displayHeight) || 32);
                const size = Math.max(0.6, Math.min(3, Math.max(height, Math.abs(Number(sp.displayWidth) || 24)) / 40));
                const cy = sp.y + (0.5 - (sp.originY ?? 0.5)) * height + height * 0.15;
                nightRT.stamp('digimmo:light2', undefined, Math.round(sp.x - ox), Math.round(cy - oy),
                  { tint: 0xfff0d8, scale: PLAYER_LIGHT() * 0.55 * size, alpha: glowAlpha * 0.7, blendMode: ADD });
              }
            }
            const p = ownPos();
            const ownSprite = scene.views?.get?.(scene.ownId)?.sprite;
            const ownSize = Math.max(1, Math.min(3, Math.max(Math.abs(Number(ownSprite?.displayHeight) || 32), Math.abs(Number(ownSprite?.displayWidth) || 24)) / 40));
            if (p) nightRT.stamp('digimmo:light2', undefined, Math.round(p.x - ox), Math.round(p.y - 8 - oy),
              { tint: 0xfff0d8, scale: PLAYER_LIGHT() * ownSize, alpha: glowAlpha, blendMode: ADD });
          }
          stampMapLights(time,ox,oy);
          nightRT.render();
        }
      };
      const safeUpdate = (time) => {
        try { update(time); }
        catch (e) {
          console.error(tag, 'Visual effects disabled for this map after a renderer error', e);
          scene.events.off('postupdate', safeUpdate);
          // Do not destroy RTs from the middle of a render pass.
          setTimeout(() => { if (built && built.update === safeUpdate) {
            brokenMaps.add(built.mapId); destroy();
          } }, 0);
        }
      };
      const onSceneExit = () => {
        if (built && built.update === safeUpdate) destroy();
      };
      cleanups.push(() => {
        scene.events.off('postupdate', safeUpdate);
        scene.events.off('shutdown', onSceneExit);
        scene.events.off('destroy', onSceneExit);
      });
      scene.events.on('postupdate', safeUpdate);
      scene.events.on('shutdown', onSceneExit);
      scene.events.on('destroy', onSceneExit);

      return { mapId: mapIdAtBuild, tilemap: tm, objs, update: safeUpdate, scene, trees, cleanups, stats };
      } catch (error) {
        // A failed build has no `built` handle yet. Release partial GPU objects.
        for (const fn of cleanups) { try { fn(); } catch {} }
        for (const object of objs) { try { object.destroy(); } catch {} }
        throw error;
      }
    };

    const destroy = () => {
      if (!built) return;
      for (const fn of built.cleanups || []) { try { fn(); } catch {} }
      for (const o of built.objs) { try { o.destroy(); } catch {} }
      for (const tr of built.trees || []) { try { tr.L.x = tr.bx; } catch {} }
      built = null;
    };

    const tick = () => {
      if (!enabled) { if (built) destroy(); return; }
      let scene;
      try { scene = window.dmo.game.scene.getScene('world'); } catch { return; }
      if (!scene || !scene.sys?.settings?.active || !scene.tilemap || !scene.worldDrawn) {
        if (built) destroy();
        readyScene = null; return;
      }
      if (built && (built.mapId !== scene.mapId || built.tilemap !== scene.tilemap ||
          built.scene !== scene)) destroy();
      if (built && performance.now() >= integrityAt) {
        integrityAt = performance.now() + 1000;
        if (built.objs.some(o => !o.scene)) destroy();
      }
      if (brokenMaps.has(scene.mapId)) return;
      if (readyScene !== scene || readyTilemap !== scene.tilemap || readyMapId !== scene.mapId) {
        if (readyMapId !== null && readyMapId !== scene.mapId) brokenMaps.clear();
        readyScene = scene; readyTilemap = scene.tilemap; readyMapId = scene.mapId;
      }
      // Do not build while a different map is being loaded or before the own
      // player sprite has been recreated for this world.
      let expectedId = null;
      try { expectedId = window.dmo?.store?.getState?.()?.world?.mapId; } catch {}
      if (expectedId && expectedId !== scene.mapId) return;
      try {
        const world = window.dmo?.store?.getState?.()?.world;
        if (world?.loading === true || world?.isLoading === true || world?.teleporting === true) {
          if (built) destroy();
          readyScene = null;
          return;
        }
      } catch {}
      if (!scene.views?.get?.(scene.ownId)?.sprite) return;
      if (!built) {
        try {
          built = build(scene);
          built.update(performance.now());
          console.info(tag, 'Atmosphere:', scene.mapId, built?.stats);
        }
        catch (e) {
          console.warn(tag, 'Atmosphere initialization failed on this map', e);
          brokenMaps.add(scene.mapId); destroy();
        }
      }
    };

    const toggle = () => { enabled = !enabled; SETTINGS.atmosphere = enabled; store(); destroy(); if (enabled) { brokenMaps.clear(); readyScene = null; } tick(); return enabled; };
    const rebuild = () => {
      const live = built && built.scene;
      const settled = live && live.sys.settings.active && live.worldDrawn &&
        live.tilemap === readyTilemap && live.mapId === readyMapId;
      destroy(); brokenMaps.clear();
      if (settled) {
        // Settings changes on a stable map can refresh immediately.
        try { built = build(live); } catch (e) {
          brokenMaps.add(live.mapId);
          console.warn(tag, 'Effect rebuild failed', e);
        }
      } else { readyScene = null; tick(); }
    };

    const PREVIEWS = [null, 6.4, 12, 19.3, 23];
    const cyclePreview = () => {
      const target = anim ? anim.to : preview;
      const i = PREVIEWS.indexOf(target);
      const next = PREVIEWS[(i + 1) % PREVIEWS.length];
      anim = { from: hourNow(), to: next, start: performance.now(), dur: PREVIEW_SECONDS * 1000 };
      return next;
    };

    return {
      tick, toggle, destroy, rebuild, cyclePreview,
      toggleAmbient: () => { SETTINGS.ambientEnabled = !SETTINGS.ambientEnabled; store(); return SETTINGS.ambientEnabled; },
      get ambient() { return SETTINGS.ambientEnabled; }, set ambient(v) { SETTINGS.ambientEnabled = !!v; },
      get enabled() { return enabled; }, set enabled(v) { enabled = !!v; SETTINGS.atmosphere = enabled; },
      get preview() { return preview; }, set preview(v) { preview = v; },
      get built() { return built; },
      diagnostics: () => ({ map: built && built.mapId, stats: built && built.stats,
        ready: !!readyScene, blockedMaps: [...brokenMaps], clouds: built && built.cloudCount,
      }),
    };
  })();

  const CHANGELOG_ENTRIES = [
  ["0.1.4", "Quieter, shorter bird calls with longer pauses and varied passages, without a continuous bird loop. Distant daytime traffic replaces the repeating city market voices and fades into quiet wind at night."],
  ["0.1.3", "Window lighting in Fog City, aligned south-facing headlights, and scattered glowing windows and holes in Machine City at night. Weather defaults to 2x. Network areas have no clouds, and Holy Peaks snow fades naturally past the northern plateau. New campfire recording with less low rumble. Fountains fade out over a shorter distance."],
  ["0.1.2", "Settings and keyboard shortcut help stay inside the menu on smaller windows."],
  [
    "0.1",
    "Soft lighting, object shadows, moving treetops and water reflections. Regional day and night ambience with wildlife, fire, nearby fountains and water. Larger Digimon have wider light, moonlight shadows are softer, and atmosphere starts as soon as the map is ready."
  ]
];
  const localizedChangelog = () => tr('Changes to the actual game visuals and sounds only.') + '\n\n' +
    CHANGELOG_ENTRIES.map(([version, note]) => 'v' + version + '\n' + tr(note)).join('\n\n');
  const localizedSoundCredits = () =>
    SOUND_CREDITS.map(c => `${c.title} — ${c.author}\n${c.samples}\n${c.license}: ${c.licenseUrl}\n${c.source}\n${tr(c.changes)}`).join('\n\n');
  const MENU_SECTIONS = [
    { title: 'Environment', fields: [
      ['uiLanguage', 'Language', 'select', [['auto', 'Follow game language'], ['en', 'English'], ['es', 'Español'], ['pt', 'Português (Brazil)']]],
      ['atmosphere', 'Enable atmosphere', 'check', 'Toggle all atmosphere effects and ambient sounds'],
      ['weather', 'Regional weather', 'check'],
      ['weatherDensity', 'Weather density', 'range', 0.1, 3, 0.1, '×'],
      ['seasons', 'Seasonal effects', 'check'],
      ['season', 'Season', 'select', [['auto', 'Automatic'], ['spring', 'Spring'], ['summer', 'Summer'], ['autumn', 'Autumn'], ['winter', 'Winter']], 'Forest foliage particles appear only in spring and autumn. Summer has no falling autumn leaves; winter can add light snow. Seasons do not recolor the map textures.'],
      ['fireflies', 'Fireflies', 'check'],
    ] },
    { title: 'Sky and lighting', fields: [
      ['dayNight', 'Day and night cycle', 'check'],
      ['dayMinutes', 'Day length (0 = real time)', 'range', 0, 240, 5, ' min'],
      ['lights', 'Fire and portal lighting', 'check'],
      ['playerLight', 'Player night light', 'range', 0, 2, 0.05, '×'],
      ['fireEmbers', 'Sparks and embers', 'check'],
      ['clouds', 'Cartoon clouds', 'check'],
      ['cloudShadows', 'Cloud shadows', 'check'],
      ['cloudOpacity', 'Cloud opacity', 'range', 0, 1, 0.05, ''],
      ['cloudShadowOpacity', 'Cloud shadow opacity', 'range', 0, 0.5, 0.01, ''],
      ['cloudDensity', 'Cloud density', 'range', 0.1, 3, 0.1, '×'],
      ['cloudWind', 'Cloud movement speed', 'range', 0, 5, 0.1, '×'],
      ['cloudPlayerClear', 'Keep player visible under clouds', 'range', 0, 2, 0.1, '×'],
    ] },
    { title: 'World and movement', fields: [
      ['objectShadows', 'Tree shadows', 'check', 'Experimental tree shadows; disable if they look wrong.'],
      ['shadowStyle', 'Shadow style', 'select', [['classic', 'Classic'], ['grounded', 'Grounded']]],
      ['shadowAlpha', 'Sunlight shadow strength', 'range', 0, 0.75, 0.01, ''],
      ['shadowHeight', 'Tree shadow size', 'range', 0.5, 5, 0.1, '×'],
      ['moonShadowAlpha', 'Moonlight shadow strength', 'range', 0, 0.5, 0.01, ''],
      ['wind', 'Treetop wind', 'check'],
      ['windStrength', 'Wind strength', 'range', 0, 5, 0.1, '×'],
      ['reflections', 'Water reflections', 'check'],
      ['reflectionOpacity', 'Reflection opacity', 'range', 0, 1, 0.05, ''],
      ['reflectionWobble', 'Water distortion', 'range', 0, 5, 0.5, ' px'],
      ['waterSparkles', 'Water sparkles', 'check'],
    ] },
  ];
  const SOUND_SECTIONS = [
    { title: 'Game audio adjustments', fields: [
      ['audioFix', 'Enable audio adjustments', 'check', 'Restart the game to apply this change'],
      ['audioLatency', 'Audio buffer', 'select', [['playback', 'Large (recommended for Firefox)'], ['balanced', 'Balanced']], 'Restart required'],
      ['stepGain', 'Footstep volume', 'range', 0, 2, 0.05, '×'],
      ['stepLowpass', 'Footstep low-pass cutoff', 'range', 0, 10000, 250, ' Hz', 'Restart required'],
      ['masterThreshold', 'Master limiter threshold', 'range', -24, 0, 1, ' dB', 'Restart required'],
      ['sfxThreshold', 'Effects compressor threshold', 'range', -24, 0, 1, ' dB', 'Restart required'],
      ['sfxRatio', 'Effects compressor ratio', 'range', 1, 20, 1, ':1', 'Restart required'],
    ] },
    { title: 'Ambient soundscape', fields: [
      ['ambientEnabled', 'Enable ambience', 'check', 'Separate from the game music and sound effect volume controls'],
      ['ambientVolume', 'Master ambience volume', 'range', 0, 1.5, 0.05, '×'],
    ] },
  ];
  const RESTART_FIELDS = new Set(['audioFix', 'audioLatency', 'stepLowpass', 'masterThreshold', 'sfxThreshold', 'sfxRatio']);
  const LIVE_FIELDS = new Set(['stepGain', 'ambientEnabled', 'ambientVolume',
    'ambientWind', 'ambientBirds', 'ambientCrickets', 'ambientFire', 'ambientWater', 'ambientWaves']);
  const KEYBOARD_HELP = "F10 or Ctrl+Shift+O: open or close settings.\nAlt+F10: toggle atmosphere and ambient sounds.\nCtrl+F10: toggle only ambient sounds.\nEscape: close settings.";
  const DEVELOPMENT_HELP = "Development only: Shift+F10 cycles real time, morning, noon, evening and night with a six second transition. Ctrl+Alt+P shows diagnostic counts.";
  let menuRoot = null, rebuildTimeout = null, reloadNeeded = false, toastTimer = null;
  let activeTab = 'graphics';
  const toast = (message, ms = 1700) => {
    if (!document.body) return;
    let el = document.getElementById('digimmo-toast');
    if (!el) { el = document.createElement('div'); el.id = 'digimmo-toast'; document.body.append(el); }
    el.textContent = message; el.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = '0'; }, ms);
  };
  const queueRebuild = () => {
    clearTimeout(rebuildTimeout);
    rebuildTimeout = setTimeout(() => ATMOS.rebuild(), 180);
  };
  const updateSetting = (name, value, commit = true) => {
    SETTINGS[name] = accepted(name, value);
    store();
    if (name === 'uiLanguage' || name === 'uiAdvanced') { if (menuRoot && name === 'uiLanguage') renderTab(); return; }
    if (name === 'atmosphere') {
      ATMOS.enabled = SETTINGS.atmosphere;
      if (commit) queueRebuild();
    } else if (RESTART_FIELDS.has(name)) {
      reloadNeeded = true;
      const el = document.getElementById('digimmo-reload');
      if (el) el.hidden = false;
    } else if (!LIVE_FIELDS.has(name) && commit) queueRebuild();
  };
  const MAIN_SETTINGS = new Set(['uiLanguage', 'atmosphere', 'dayNight',
    'season', 'clouds', 'ambientEnabled', 'ambientVolume']);
  const makeFields = (parent, groups) => {
    const main = document.createElement('section'); main.className = 'digimmo-section';
    const title = document.createElement('h3'); title.textContent = tr('Settings'); main.append(title);
    const advanced = document.createElement('section'); advanced.className = 'digimmo-section';
    const advancedTitle = document.createElement('h3'); advancedTitle.textContent = tr('Advanced settings'); advanced.append(advancedTitle);
    for (const group of groups) {
      for (const field of group.fields) {
        const [key, label, type, a, b, step, suffix, note] = field;
        const isMain = MAIN_SETTINGS.has(key);
        if (!isMain && !SETTINGS.uiAdvanced) continue;
        const row = document.createElement('label'); row.className = 'digimmo-row';
        const labelEl = document.createElement('span'); labelEl.textContent = tr(label);
        const control = document.createElement('span'); control.className = 'digimmo-control';
        const input = document.createElement(type === 'select' ? 'select' : 'input');
        input.id = 'digimmo-' + key;
        if (type === 'check') { input.type = 'checkbox'; input.checked = SETTINGS[key]; }
        if (type === 'range') {
          input.type = 'range'; input.min = a; input.max = b; input.step = step; input.value = SETTINGS[key];
          const out = document.createElement('output'); out.textContent = String(SETTINGS[key]) + (suffix || '');
          input.addEventListener('input', () => { out.textContent = input.value + (suffix || ''); updateSetting(key, Number(input.value), false); });
          input.addEventListener('change', () => updateSetting(key, Number(input.value), true));
          control.append(input, out);
        } else if (type === 'select') {
          for (const [value, desc] of a) {
            const option = document.createElement('option'); option.value = value; option.textContent = tr(desc); input.append(option);
          }
          input.value = SETTINGS[key];
          input.addEventListener('change', () => updateSetting(key, input.value));
          control.append(input);
        } else {
          input.addEventListener('change', () => updateSetting(key, input.checked)); control.append(input);
        }
        row.append(labelEl, control);
        const help = type === 'check' ? a : type === 'select' ? b : note;
        // Player settings remain one clean row each. Detail belongs in advanced
        // settings or a tooltip, never a paragraph inside the main menu.
        if (typeof help === 'string') row.title = tr(help);
        (isMain ? main : advanced).append(row);
      }
    }
    parent.append(main);
    const toggle = document.createElement('label'); toggle.className = 'digimmo-row digimmo-advanced-toggle';
    const span = document.createElement('span'); span.textContent = tr('Show advanced settings');
    const check = document.createElement('input'); check.type = 'checkbox'; check.id = 'digimmo-uiAdvanced';
    check.checked = SETTINGS.uiAdvanced;
    check.addEventListener('change', () => { updateSetting('uiAdvanced', check.checked); renderTab(); });
    toggle.append(span, check); parent.append(toggle);
    if (SETTINGS.uiAdvanced && advanced.children.length > 1) parent.append(advanced);
  };
  const renderTab = () => {
    if (!menuRoot) return;
    const content = menuRoot.querySelector('.digimmo-content');
    content.replaceChildren();
    menuRoot.setAttribute('aria-label', tr('DigiMMO Tweaks'));
    menuRoot.querySelector('h2').textContent = 'DigiMMO · ' + tr('Settings').toUpperCase();
    const reset = menuRoot.querySelector('#digimmo-reload'); if (reset) reset.textContent = tr('Restart game');
    const resetAll = menuRoot.querySelector('#digimmo-reset'); if (resetAll) resetAll.textContent = tr('Reset settings');
    for (const button of menuRoot.querySelectorAll('[data-digimmo-tab]')) {
      button.setAttribute('aria-selected', String(button.dataset.digimmoTab === activeTab));
      button.textContent = tr(({ graphics: 'World', sound: 'Audio', changelog: 'Changelog' })[button.dataset.digimmoTab]);
    }
    if (activeTab === 'changelog') {
      const pre = document.createElement('pre'); pre.className = 'digimmo-changelog';
      pre.textContent = localizedChangelog(); content.append(pre);
      const credits = document.createElement('details'), label = document.createElement('summary');
      label.textContent = tr('Sound credits');
      const creditText = document.createElement('pre'); creditText.className = 'digimmo-changelog';
      creditText.textContent = localizedSoundCredits(); credits.append(label, creditText); content.append(credits);
    } else makeFields(content, activeTab === 'sound' ? SOUND_SECTIONS : MENU_SECTIONS);
  };
  const closeMenu = () => { if (menuRoot) menuRoot.hidden = true; };
  const openMenu = (tab = 'graphics') => {
    if (!menuRoot) { initMenu(); if (!menuRoot) return; }
    activeTab = tab; menuRoot.hidden = false; renderTab();
    menuRoot.querySelector('.digimmo-close').focus({ preventScroll: true });
  };
  const toggleMenu = () => {
    if (menuRoot && !menuRoot.hidden) closeMenu(); else openMenu();
  };
  const initMenu = () => {
    if (menuRoot || !document.body) return;
    const css = document.createElement('style');
    css.textContent = `
      #digimmo-panel{position:fixed;inset:4% auto auto 50%;transform:translateX(-50%);width:min(760px,94vw);max-height:90vh;
        display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;
        z-index:2147483646;background:#0c1734;color:#eaf1ff;border:3px solid #e8c46b;
        box-shadow:0 0 0 3px #142850,0 0 0 6px #081126,8px 9px 0 #030714;
        font-family:'Courier New',monospace;font-size:13px;image-rendering:pixelated;}
      #digimmo-panel[hidden]{display:none!important}#digimmo-panel *,#digimmo-panel *:before{box-sizing:border-box}
      #digimmo-panel .digimmo-head{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;
        background:#162d55;border-bottom:3px solid #e8c46b;flex-shrink:0}
      #digimmo-panel h2{font:bold 20px 'Courier New',monospace;letter-spacing:1px;color:#ffe198;margin:0}
      #digimmo-panel button{background:#203a64;color:#ffe198;border:2px solid #8098c0;
        font:inherit;cursor:pointer;padding:7px 12px}
      #digimmo-panel button:hover,#digimmo-panel button:focus-visible{border-color:#ffe198;outline:1px solid #ffe198}
      #digimmo-panel .digimmo-tabs{display:flex;flex-wrap:wrap;flex-shrink:0;gap:4px;padding:12px 12px 0;background:#0c1734}
      #digimmo-panel .digimmo-tabs button{flex:1;min-width:120px;font-weight:bold}
      #digimmo-panel .digimmo-tabs button[aria-selected=true]{background:#e8c46b;color:#101a32;border-color:#e8c46b}
      #digimmo-panel .digimmo-content{overflow:auto;min-height:0;flex:1 1 auto;padding:10px 14px 20px;scrollbar-color:#dabb69 #142850}
      #digimmo-panel .digimmo-section{border:2px solid #314f7a;background:#102040;margin:12px 0;padding:12px 14px}
      #digimmo-panel details{margin-top:12px;border-top:1px solid #48658b;padding-top:12px}
      #digimmo-panel summary{cursor:pointer;color:#ffe198;padding:4px 0;font-weight:bold}
      #digimmo-panel h3{margin:0 0 12px;color:#ffe198;font-size:15px;border-bottom:1px solid #48658b;padding-bottom:7px}
      #digimmo-panel .digimmo-row{display:grid;grid-template-columns:minmax(155px,1fr) minmax(190px,1fr);align-items:center;
        gap:7px 12px;padding:8px 0;border-bottom:1px solid #223a60;cursor:pointer}
      #digimmo-panel .digimmo-row:last-child{border:0}
      #digimmo-panel .digimmo-control{display:flex;justify-content:flex-end;align-items:center;gap:10px}
      #digimmo-panel input[type=checkbox]{width:20px;height:20px;accent-color:#f9d67f;cursor:pointer}
      #digimmo-panel input[type=range]{width:100%;min-width:75px;accent-color:#e8c46b;cursor:pointer}
      #digimmo-panel output{min-width:53px;text-align:right;color:#fce298;font-variant-numeric:tabular-nums}
      #digimmo-panel select{width:100%;padding:5px;background:#172e54;color:#fff;border:2px solid #607eaf;font:inherit}
      #digimmo-panel small{grid-column:1/-1;opacity:.67;font-size:11px}
      #digimmo-panel .digimmo-foot{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:12px;
        flex-shrink:0;max-height:45vh;overflow:auto;padding:10px 14px;border-top:2px solid #314f7a;color:#a9bfdd;font-size:11px}
      #digimmo-panel .digimmo-foot details{flex:1 1 280px;min-width:0;max-height:32vh;overflow:auto}
      #digimmo-panel .digimmo-foot summary,#digimmo-panel .digimmo-foot p{overflow-wrap:anywhere;word-break:break-word}
      #digimmo-panel .digimmo-foot p{margin:6px 0 0;white-space:pre-line;line-height:1.45}
      #digimmo-panel .digimmo-foot .digimmo-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;min-width:0;margin-left:auto}
      #digimmo-panel .digimmo-foot .digimmo-actions button{white-space:nowrap}
      #digimmo-panel .digimmo-foot #digimmo-reload{color:#13203e;background:#ffe198;border-color:#ffe198}
      #digimmo-panel .digimmo-changelog{white-space:pre-wrap;word-break:break-word;line-height:1.6;font:13px/1.6 'Courier New',monospace}
      #digimmo-toast{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483647;
        background:#12254a;color:#ffe198;border:2px solid #ffe198;box-shadow:3px 3px 0 #050a15;
        padding:8px 12px;font:bold 13px 'Courier New',monospace;pointer-events:none;opacity:0;transition:opacity .3s}
      #digimmo-newversion{position:fixed;top:46px;right:16px;z-index:2147483645;
        width:min(320px,92vw);background:#142b51;color:#fff;border:3px solid #f5d483;
        padding:14px;font:13px/1.5 'Courier New',monospace;box-shadow:4px 4px 0 #030819}
      #digimmo-newversion button{margin-top:8px;background:#f5d483;color:#12254a;border:0;padding:8px;cursor:pointer;font:inherit}
      @media(max-width:570px){#digimmo-panel{top:2%;max-height:96vh;font-size:12px}
        #digimmo-panel .digimmo-row{grid-template-columns:1fr 1fr}
        #digimmo-panel .digimmo-foot{flex-direction:column;flex-wrap:nowrap;align-items:stretch}
        #digimmo-panel .digimmo-foot details{flex:1 1 auto;min-height:0;max-height:none}
        #digimmo-panel .digimmo-foot .digimmo-actions{flex-shrink:0;justify-content:flex-start}}
    `;
    document.head.append(css);
    menuRoot = document.createElement('div'); menuRoot.id = 'digimmo-panel'; menuRoot.hidden = true;
    menuRoot.setAttribute('role', 'dialog'); menuRoot.setAttribute('aria-label', tr('DigiMMO Tweaks'));
    const head = document.createElement('header'); head.className = 'digimmo-head';
    const title = document.createElement('h2'); title.textContent = 'DigiMMO · ' + tr('Settings').toUpperCase();
    const close = document.createElement('button'); close.type = 'button'; close.className = 'digimmo-close'; close.textContent = '✕'; close.addEventListener('click', closeMenu);
    head.append(title, close); menuRoot.append(head);
    const tabs = document.createElement('nav'); tabs.className = 'digimmo-tabs';     tabs.setAttribute('aria-label', tr('Settings categories'));
    for (const [id, title] of [['graphics', 'World'], ['sound', 'Audio'], ['changelog', 'Changelog']]) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.digimmoTab = id;
      button.textContent = tr(title); button.addEventListener('click', () => { activeTab = id; renderTab(); }); tabs.append(button);
    }
    menuRoot.append(tabs);
    const content = document.createElement('main'); content.className = 'digimmo-content'; menuRoot.append(content);
    const footer = document.createElement('footer'); footer.className = 'digimmo-foot';
    const keys = document.createElement('details');
    const keyTitle = document.createElement('summary'); keyTitle.textContent = `v${VERSION} · ` + tr('Keyboard shortcuts');
    const keyText = document.createElement('p'); keyText.style.whiteSpace = 'pre-line';
    keyText.textContent = tr(KEYBOARD_HELP);
    // @development-start
    keyText.textContent += '\n' + tr(DEVELOPMENT_HELP);
    // @development-end
    keys.append(keyTitle, keyText);
    const reload = document.createElement('button'); reload.type = 'button'; reload.id = 'digimmo-reload';
    reload.textContent = tr('Restart game'); reload.hidden = !reloadNeeded; reload.addEventListener('click', () => location.reload());
    const resetAll = document.createElement('button'); resetAll.type = 'button'; resetAll.id = 'digimmo-reset';
    resetAll.textContent = tr('Reset settings');
    let resetArmed = null;
    resetAll.addEventListener('click', () => {
      if (!resetArmed) {
        resetAll.textContent = tr('Click again to reset');
        resetArmed = setTimeout(() => { resetArmed = null; resetAll.textContent = tr('Reset settings'); }, 3500);
        return;
      }
      clearTimeout(resetArmed); resetArmed = null;
      const before = { ...SETTINGS };
      Object.assign(SETTINGS, DEFAULTS);
      store();
      if ([...RESTART_FIELDS].some(k => before[k] !== SETTINGS[k])) {
        reloadNeeded = true; reload.hidden = false;
      }
      ATMOS.enabled = SETTINGS.atmosphere;
      queueRebuild();
      resetAll.textContent = tr('Reset settings');
      renderTab();
      toast(tr('Settings reset'));
    });
    const buttons = document.createElement('span'); buttons.className = 'digimmo-actions';
    buttons.append(resetAll, reload);
    footer.append(keys, buttons); menuRoot.append(footer);
    menuRoot.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.append(menuRoot);
  };
  const announceVersion = () => {
    try {
      if (localStorage.getItem('digimmo.client.seenVersion') === VERSION) return;
      localStorage.setItem('digimmo.client.seenVersion', VERSION);
    } catch { return; }
    const box = document.createElement('aside'); box.id = 'digimmo-newversion';
    const label = document.createElement('strong'); label.textContent = tr('Tweaks') + ' ' + VERSION + ' ' + tr('is available');
    const info = document.createElement('div'); info.textContent = tr(CHANGELOG_ENTRIES[0][1]);
    const button = document.createElement('button'); button.textContent = tr('View changes');
    button.addEventListener('click', () => { box.remove(); openMenu('changelog'); });
    box.append(label, info, button); document.body.append(box);
    setTimeout(() => box.remove(), 6500);
  };
  const startUI = () => { initMenu(); announceVersion(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startUI, { once: true });
  else startUI();

  const NAMES = { null: 'Real time', 6.4: 'Morning', 12: 'Noon', 19.3: 'Evening', 23: 'Night' };
  window.addEventListener('keydown', (e) => {
    const focused = e.target;
    const typing = focused && (focused.tagName === 'INPUT' && focused.type !== 'checkbox' && focused.type !== 'range'
      || focused.tagName === 'TEXTAREA' || focused.isContentEditable);
    if (e.key === 'Escape' && menuRoot && !menuRoot.hidden) { e.preventDefault(); e.stopImmediatePropagation(); closeMenu(); return; }
    const backupShortcut = e.ctrlKey && e.shiftKey && e.code === 'KeyO';
    if (e.code !== HOTKEY && !backupShortcut) {
      if (menuRoot && !menuRoot.hidden && !e.ctrlKey && !e.metaKey && !e.altKey) e.stopImmediatePropagation();
      return;
    }
    if (typing && !(menuRoot && menuRoot.contains(focused))) return;
    if (e.repeat) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (backupShortcut) { toggleMenu(); return; }
    if (e.ctrlKey) { const on = ATMOS.toggleAmbient(); toast(tr('Ambient sounds') + ': ' + tr(on ? 'on' : 'off')); }
    else if (e.shiftKey) { const p = ATMOS.cyclePreview(); toast(tr('Time of day') + ': ' + tr(NAMES[p])); }
    else if (e.altKey) { const on = ATMOS.toggle(); if (menuRoot && !menuRoot.hidden) renderTab(); toast(tr('Atmosphere') + ': ' + tr(on ? 'on' : 'off')); }
    else toggleMenu();
  }, true);


  // ---- Test build only: read-only status readout (Ctrl+Alt+P), not for release ----
  (() => {
    let panel = null;
    const show = () => {
      if (!panel) {
        panel = document.createElement('pre');
        panel.style.cssText = 'position:fixed;left:8px;top:200px;z-index:2147483640;margin:0;padding:8px;background:rgba(0,0,0,.85);color:#fff;font:14px/1.4 Consolas,monospace;pointer-events:none;white-space:pre';
        document.body.append(panel);
        setInterval(() => { if (!panel.hidden) render(); }, 500);
      } else if (!panel.hidden) { panel.hidden = true; return; }
      panel.hidden = false; render();
    };
    const render = () => {
      const st = (ATMOS.built && ATMOS.built.stats) || {};
      panel.textContent = [
        `map ${ATMOS.built ? ATMOS.built.mapId : '-'}  weather ${st.weather}`,
        `coast ${st.coast}  shoreTiles ${st.shorelineTiles}  waves ${st.waveGain}`,
        `sound ${st.samples}  wind ${st.windGain}  water ${st.waterGain}  fireLights ${st.lights}`,
        `samples ${st.sampleLoaded ?? 0}/${st.sampleTotal ?? 0}  failed ${st.sampleFailures || 'none'}`,
        `casters ${st.casters}  shadowStyle ${SETTINGS.shadowStyle}`,
        `objects ${st.shadowObjects}  largest ${st.largestObject}  trunks ${st.trunkTiles}  slices ${st.shadowSlices}  owned ${st.ownedSlices}`,
      ].join('\n');
    };
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.altKey && e.code === 'KeyP') { e.preventDefault(); e.stopImmediatePropagation(); show(); }
    }, true);
  })();

  // Observe readiness on each animation frame. No settling timer is needed:
  // map identity, loading state and the recreated sprite are the actual guards.
  const atmosphereFrame = () => {
    ATMOS.tick();
    requestAnimationFrame(atmosphereFrame);
  };
  requestAnimationFrame(atmosphereFrame);
  Object.assign(runtime, {
    status: 'ready', settings: SETTINGS, openMenu, closeMenu,
    rebuild: () => ATMOS.rebuild(), getStats: () => ATMOS.built && ATMOS.built.stats,
    diagnostics: () => ATMOS.diagnostics(),
  });
  Object.freeze(runtime);

  // Recorded ambience. Trimmed, looped, loudness matched and re-encoded (Opus).
  const SOUND_CREDITS = __SOUND_CREDITS__;
  const AMB_SAMPLES = __AMB_SAMPLES__;
})();
