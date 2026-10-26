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
    dayNight: true, dayMinutes: 0, timeMode: 'system', fixedTime: 1080, playerLight: 1.05,
    lights: true, fireEmbers: true, waterSparkles: true,
    objectShadows: true, shadowStyle: 'classic', shadowAlpha: 0.28, shadowHeight: 2.6, moonShadowAlpha: 0.05,
    clouds: true, cloudShadows: true, cloudOpacity: 0.5, cloudShadowOpacity: 0.13,
    cloudDensity: 2, cloudWind: 1, cloudPlayerClear: 1.1,
    wind: true, windStrength: 2,
    reflections: true, reflectionOpacity: 0.38, reflectionWobble: 1,
    audioFix: true, audioLatency: 'playback', stepGain: 0.35, stepLowpass: 2500,
    masterThreshold: -1, sfxThreshold: -6, sfxRatio: 12,
    ambientEnabled: true, ambientVolume: 0.5, uiLanguage: 'auto', uiAdvanced: false, ambientWind: 1,
    ambientBirds: 1, ambientCrickets: 1, ambientFire: 1,
    ambientWater: 1, ambientWaves: 1, launcher: true, onlineBadge: false, questMarks: true, attackMacro: false, livelySprites: true,
  });
  const RANGES = {
    weatherDensity: [0.1, 3], dayMinutes: [0, 240], fixedTime: [0, 1439], playerLight: [0, 2],
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
  // Present only in the desktop client, which stores the start window preference outside the page.
  const CLIENT = window.digimmoClient;
  const accepted = (key, value) => {
    if (!(key in DEFAULTS)) return DEFAULTS[key];
    const sample = DEFAULTS[key];
    if (typeof sample === 'boolean') return typeof value === 'boolean' ? value : sample;
    if (typeof sample === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) return sample;
      const [lo, hi] = RANGES[key];
      const bounded = Math.max(lo, Math.min(hi, value));
      return key === 'fixedTime' ? Math.round(bounded) : bounded;
    }
    if (key === 'season') return ['auto', 'spring', 'summer', 'autumn', 'winter'].includes(value) ? value : sample;
    if (key === 'uiLanguage') return ['auto', 'en', 'es', 'pt'].includes(value) ? value : sample;
    if (key === 'audioLatency') return ['playback', 'balanced'].includes(value) ? value : sample;
    if (key === 'shadowStyle') return ['classic', 'grounded'].includes(value) ? value : sample;
    if (key === 'timeMode') return ['system', 'cycle', 'fixed'].includes(value) ? value : sample;
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
      if (!Object.hasOwn(existing, 'timeMode')) SETTINGS.timeMode = SETTINGS.dayMinutes > 0 ? 'cycle' : 'system';
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
    // Apply the requested cloud baseline once, then preserve subsequent choices.
    if (!localStorage.getItem('digimmo.client.migrated02')) {
      SETTINGS.cloudDensity = DEFAULTS.cloudDensity;
      if (SETTINGS.playerLight === 0.55) SETTINGS.playerLight = DEFAULTS.playerLight;
      localStorage.setItem(STORE_KEY, JSON.stringify(SETTINGS));
      localStorage.setItem('digimmo.client.migrated02', '1');
    }
  } catch {}
  // Technical audio processing values have no menu controls and always use the proven defaults.
  for (const key of ['audioLatency', 'stepLowpass', 'masterThreshold', 'sfxThreshold', 'sfxRatio']) SETTINGS[key] = DEFAULTS[key];


  // Localized overlay; never changes the original game language.
  const TRANSLATIONS = {
  "es": {
    "Calmer birds and distant city traffic.\n• Bird calls are quieter and shorter, with longer pauses and varied passages; the continuous bird loop is gone.\n• Distant daytime traffic replaces the repeating city market voices and fades into quiet wind at night.": "Aves más tranquilas y tráfico lejano en la ciudad.\n• Los cantos de aves son más suaves y cortos, con pausas más largas y fragmentos variados; ya no hay un bucle continuo de aves.\n• El tráfico lejano durante el día sustituye las voces repetitivas del mercado de la ciudad y da paso a un viento tranquilo por la noche.",
    "Excerpts, mono, filtering, volume matching and Opus encoding. Short randomized passages with edge fades and long pauses; no continuous bird loop.": "Fragmentos en mono, filtrado, ajuste de volumen y codificación Opus. Pasajes breves aleatorios con fundidos y pausas largas, sin bucle continuo de aves.",
    "Menu fixes for smaller windows.\n• Settings and keyboard shortcut help stay inside the menu on smaller windows.": "Ajustes del menú para ventanas pequeñas.\n• Los ajustes y la ayuda de atajos de teclado permanecen dentro del menú en ventanas pequeñas.",
    "More window lights and a new campfire sound.\n• Windows light up in Fog City, and a few windows and broken panes glow in Machine City at night.\n• South-facing headlights follow the car body.\n• Weather starts at 2x; Network areas have no clouds, and Holy Peaks snow fades past the northern plateau.\n• A new campfire recording with less low rumble; fountains fade out over a shorter distance.": "Más ventanas iluminadas y un nuevo sonido de hoguera.\n• Las ventanas se iluminan en Fog City, y algunas ventanas y cristales rotos brillan de noche en Machine City.\n• Los faros de los coches orientados al sur siguen la carrocería.\n• El clima empieza en 2x; las zonas de Network no tienen nubes y la nieve de Holy Peaks se desvanece al salir de la meseta norte.\n• Nueva grabación de hoguera con menos retumbo grave; las fuentes dejan de oírse a menor distancia.",
    "Excerpts, mono, filtering, volume matching and Opus encoding. Playback limited to 2.2 seconds with edge fades and long pauses.": "Fragmentos en mono, filtrado, ajuste de volumen y codificación Opus. Reproducción limitada a 2,2 segundos con fundidos y pausas largas.",
    "Previously trimmed, volume matched and encoded to mono Opus. Played as 3.2 second passages with edge fades and long pauses, without a continuous loop.": "Recortado, ajustado de volumen y codificado a Opus mono anteriormente. Se reproduce en pasajes de 3,2 segundos con fundidos y pausas largas, sin bucle continuo.",
    "Sound credits": "Créditos de sonido",
    "Excerpts, mono, filtering, volume matching, edge fades or loop crossfades, Opus encoding.": "Fragmentos, mono, filtrado, ajuste de volumen, fundidos en los extremos o entre bucles y codificación Opus.",
    "Show advanced settings": "Mostrar opciones avanzadas",
    "Start window": "Ventana de inicio",
    "Shows game updates and players online when the client starts.": "Muestra las novedades del juego y los jugadores en línea al abrir el cliente.",
    "Players online": "Jugadores en línea",
    "Shows how many players are online. Drag it anywhere.": "Muestra cuántos jugadores hay en línea. Arrástralo a cualquier lugar.",
    "online": "en línea",
    "capacity": "capacidad",
    "maintenance": "mantenimiento",
    "Server status unavailable": "Estado del servidor no disponible",
    "Quest markers": "Marcas de misión",
    "Attack picks a target": "El ataque elige objetivo",
    "Livelier Paladin Mode": "Paladin Mode más vivo",
    "Wing beats, a moving tail in every direction and enhanced sword attacks for Imperialdramon Paladin Mode.": "Aleteo, cola en movimiento en todas las direcciones y ataques de espada mejorados para Imperialdramon Paladin Mode.",
    "Basic attack without a living target first selects the nearest enemy, in the same press.": "El ataque básico sin un objetivo vivo selecciona primero al enemigo más cercano, con la misma pulsación.",
    "Marks monsters you still need: a gold ! for quests, a blue ! for dailies and the sun for the daily board.": "Marca los monstruos que aún necesitas: un ! dorado para misiones, un ! azul para diarias y el sol para el tablón diario.",
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
    "Footstep volume": "Volumen de pasos",
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
    "The first release: light, shadows and ambience.\n• Soft lighting, object shadows, moving treetops and water reflections.\n• Regional day and night ambience with wildlife, fire, fountains and nearby water.\n• Larger Digimon cast wider light, moonlight shadows are softer, and the atmosphere starts as soon as the map is ready.": "El primer lanzamiento: luz, sombras y ambiente.\n• Iluminación suave, sombras de objetos, copas en movimiento y reflejos en el agua.\n• Ambiente regional de día y de noche con fauna, fuego, fuentes y agua cercana.\n• Los Digimon grandes proyectan una luz más amplia, las sombras lunares son más suaves y la atmósfera aparece en cuanto el mapa está listo.",
    "Keyboard shortcuts": "Atajos de teclado",
    "F10 or Ctrl+Shift+O: open or close settings.\nAlt+F10: toggle atmosphere and ambient sounds.\nCtrl+F10: toggle only ambient sounds.\nEscape: close settings.": "F10 o Ctrl+Shift+O: abrir o cerrar ajustes.\nAlt+F10: activar o desactivar atmósfera y sonidos ambientales.\nCtrl+F10: activar o desactivar solo sonidos ambientales.\nEscape: cerrar ajustes.",
    "Development only: Shift+F10 cycles the selected clock, morning, noon, evening and night with a six second transition. Ctrl+Alt+P shows diagnostic counts.": "Solo desarrollo: Shift+F10 alterna el reloj elegido, mañana, mediodía, tarde y noche con una transición de seis segundos. Ctrl+Alt+P muestra los contadores de diagnóstico.",
    "Mono, 120 Hz low cut, gentle high-frequency filtering, constant volume matching, short loop crossfade and Opus encoding. No compression, pitch or speed change.": "Mono, filtro de corte bajo a 120 Hz, filtrado suave de agudos, ajuste constante de volumen, fundido corto de bucle y codificación Opus. Sin compresión ni cambios de tono o velocidad.",
    "Trimmed, looped, volume matched and encoded to mono Opus.": "Recortado, preparado en bucle, ajustado de volumen y codificado en Opus mono.",
    "Quest markers on monsters.\n• Monsters you still need for a quest show a gold ! for quests, a blue ! for dailies or the sun for the daily board before their name. Switch it off in F10.": "Marcas de misión en los monstruos.\n• Los monstruos que aún necesitas para una misión muestran ante su nombre un ! dorado para misiones, un ! azul para diarias o el sol para el tablón diario. Se desactiva en F10.",
    "A players online counter.\n• An optional counter in the game shows how many players are online. Switch it on in F10 and drag it anywhere.": "Un contador de jugadores en línea.\n• Un contador opcional en el juego muestra cuántos jugadores hay en línea. Actívalo en F10 y arrástralo a cualquier lugar.",
    "A start window, living Toy Town windows and glowing dark towers.\n• The desktop client opens with a start window: the game's latest patch notes, players online and links. Turn it off in F10.\n• Client updates download in the start window with a progress bar; Update and play installs them and restarts the client.\n• Skill effects glow at night in their own colours, such as Seraphimon's Seven Heavens.\n• Dark towers in Tower Forest, Kaiser Canyon and Sunset Bay glow purple at night and pulse with their panels.\n• Toy Town windows have residents: most rooms stay dark, others light up for an evening, a late reader, a TV or a night light, and the lights change during the night.\n• The Toy Town castle windows and the locomotive cab window light up.\n• The lanterns by the phone box in Sea of Darkness glow from their glass.\n• If the game stays black after a restart, the client repairs its cache once by itself.": "Una ventana de inicio, ventanas con vida en Toy Town y torres oscuras que brillan.\n• El cliente de escritorio abre con una ventana de inicio: las últimas notas del parche del juego, los jugadores en línea y enlaces. Se desactiva en F10.\n• Las actualizaciones del cliente se descargan en la ventana de inicio con una barra de progreso; Actualizar y jugar las instala y reinicia el cliente.\n• Los efectos de habilidades brillan de noche con sus propios colores, como Seven Heavens de Seraphimon.\n• Las torres oscuras de Tower Forest, Kaiser Canyon y Sunset Bay brillan en morado de noche y laten al ritmo de sus paneles.\n• Las ventanas de Toy Town tienen habitantes: la mayoría de las habitaciones quedan a oscuras; otras se encienden para una velada, un lector nocturno, una tele o una lamparita, y las luces cambian a lo largo de la noche.\n• Se iluminan las ventanas del castillo de Toy Town y la cabina del maquinista de la locomotora.\n• Los faroles junto a la cabina telefónica de Sea of Darkness brillan desde su cristal.\n• Si el juego se queda en negro tras reiniciar, el cliente repara su caché una vez por sí solo.",
    "Swaying trees in Toy Town and beyond.\n• The redrawn cherry and yard trees in Toy Town sway in the wind again.\n• Snowy firs, bamboo and the cherry and zelkova trees in Highton Terrace and Odaiba now sway too; bamboo bends from its base.": "Árboles que se mecen en Toy Town y más allá.\n• Los cerezos y árboles de jardín redibujados de Toy Town vuelven a mecerse con el viento.\n• Los abetos nevados, el bambú y los cerezos y zelkovas de Highton Terrace y Odaiba ahora también se mecen; el bambú se dobla desde la base.",
    "Night details, a calmer soundscape and a Linux client.\n• New night lights: the dragon's eye in Machine City, the Factory Town generators (also by day), the Kaiser's Fortress incubators, Sunset Bay's tiki torches and its lighthouse with a turning beam.\n• Hanging pumpkin lamps glow at the pumpkin; Piedmon's castle windows glow more softly.\n• Map exits glow at night with rising sparks.\n• Chimneys in Gate Village smoke in autumn and winter.\n• Water, sea and waterfalls are quieter with less rumble; creeks are softly audible from farther away.\n• Savanna acacias sway without gaps in their crowns.\n• Simpler audio settings: the technical compressor controls are gone.\n• Windows, lights and headlights follow the game's redrawn art in Toy Town, Odaiba, Machine City and Fog City.\n• The new Tamers maps get city or nature ambience, matching weather, car headlights and glowing Hypnos towers.\n• Block piles cast one shadow from their base, and narrow pier ends show a reflection again.\n• New Linux client (AppImage) with automatic updates.": "Detalles nocturnos, un paisaje sonoro más tranquilo y un cliente para Linux.\n• Nuevas luces nocturnas: el ojo del dragón en Machine City, los generadores de Factory Town (también de día), las incubadoras de Kaiser's Fortress, las antorchas tiki de Sunset Bay y su faro con un haz giratorio.\n• Las lámparas de calabaza colgantes brillan en la calabaza; las ventanas del castillo de Piedmon brillan con más suavidad.\n• Las salidas de los mapas brillan de noche con chispas que suben.\n• Las chimeneas de Gate Village echan humo en otoño e invierno.\n• El agua, el mar y las cascadas suenan más bajo y con menos retumbo; los arroyos se oyen suavemente desde más lejos.\n• Las acacias de la sabana se mecen sin huecos en sus copas.\n• Ajustes de audio más simples: se quitaron los controles técnicos del compresor.\n• Las ventanas, las luces y los faros siguen el arte redibujado del juego en Toy Town, Odaiba, Machine City y Fog City.\n• Los nuevos mapas de Tamers tienen ambiente de ciudad o de naturaleza, clima a juego, faros en los coches y torres Hypnos iluminadas.\n• Las pilas de bloques proyectan una sola sombra desde su base, y los extremos de los muelles estrechos vuelven a reflejarse.\n• Nuevo cliente para Linux (AppImage) con actualizaciones automáticas.",
    "A large atmosphere update: classic water reflections, natural tree movement and many new lights.\n• Water mirrors characters downward at ponds, lakes and beaches.\n• Leaves and crowns sway while trunks stay put; palms bend from the base.\n• Lanterns, candles and windows glow from their flames and glass, with new night lights across the maps.\n• Attacks, skill projectiles and beams cast a matching light at night.\n• Shadows no longer fall across houses and objects.\n• Water sounds at ponds and lakes, regional wind and loudspeaker chatter in Server Desert.\n• Choose real time, a repeating day or a fixed time for the atmosphere.\n• The desktop client shows DigiMMO as your game in Discord.": "Una gran actualización de ambiente: reflejos clásicos en el agua, árboles con movimiento natural y muchas luces nuevas.\n• El agua refleja a los personajes hacia abajo en estanques, lagos y playas.\n• Hojas y copas se mecen mientras los troncos quedan quietos; las palmeras se doblan desde la base.\n• Faroles, velas y ventanas brillan desde sus llamas y cristales, con nuevas luces nocturnas en los mapas.\n• Los ataques, los proyectiles de habilidades y los rayos proyectan de noche una luz a juego.\n• Las sombras ya no caen sobre casas ni objetos.\n• Sonidos de agua en estanques y lagos, viento regional y voces de megafonía en Server Desert.\n• Elige hora real, un día repetido o una hora fija para el ambiente.\n• El cliente de escritorio muestra DigiMMO como tu juego en Discord.",
    "Trimmed, looped, volume matched and encoded to mono Opus. Regional high-pass and low-pass filters with subtle per-map variation and slow gain changes during playback; no pitch or speed change.": "Recortado, preparado en bucle, con volumen ajustado y codificado en Opus mono. Filtros regionales de paso alto y paso bajo con variaciones sutiles por mapa y cambios lentos de volumen durante la reproducción; sin cambios de tono ni velocidad.",
    "Atmosphere clock": "Reloj de la atmósfera",
    "Repeating day": "Día en bucle",
    "Fixed time": "Hora fija",
    "Day length": "Duración del día",
    "Real time follows your computer clock. Only affects lighting, shadows and ambience.": "La hora real sigue el reloj del equipo. Solo afecta a la iluminación, las sombras y el ambiente.",
    "Excerpt, mono, 200 Hz low cut and two 900 Hz high cuts, constant volume matching, edge fades and Opus encoding. Varied short passages near Server Desert speakers with long pauses; no pitch or speed change.": "Fragmento en mono, filtro de graves de 200 Hz y dos filtros de agudos de 900 Hz, ajuste de volumen constante, fundidos y codificación Opus. Pasajes cortos variados cerca de los altavoces de Server Desert con pausas largas; sin cambios de tono ni velocidad."
  },
  "pt": {
    "Calmer birds and distant city traffic.\n• Bird calls are quieter and shorter, with longer pauses and varied passages; the continuous bird loop is gone.\n• Distant daytime traffic replaces the repeating city market voices and fades into quiet wind at night.": "Pássaros mais calmos e trânsito distante na cidade.\n• Os cantos de pássaros são mais suaves e curtos, com pausas maiores e trechos variados; o loop contínuo de pássaros foi removido.\n• O trânsito distante durante o dia substitui as vozes repetitivas do mercado da cidade e dá lugar a um vento tranquilo à noite.",
    "Excerpts, mono, filtering, volume matching and Opus encoding. Short randomized passages with edge fades and long pauses; no continuous bird loop.": "Trechos em mono, filtragem, ajuste de volume e codificação Opus. Passagens curtas aleatórias com transições suaves e pausas longas, sem loop contínuo de pássaros.",
    "Menu fixes for smaller windows.\n• Settings and keyboard shortcut help stay inside the menu on smaller windows.": "Ajustes no menu para janelas menores.\n• As configurações e a ajuda de atalhos de teclado ficam dentro do menu em janelas menores.",
    "More window lights and a new campfire sound.\n• Windows light up in Fog City, and a few windows and broken panes glow in Machine City at night.\n• South-facing headlights follow the car body.\n• Weather starts at 2x; Network areas have no clouds, and Holy Peaks snow fades past the northern plateau.\n• A new campfire recording with less low rumble; fountains fade out over a shorter distance.": "Mais janelas iluminadas e um novo som de fogueira.\n• As janelas se iluminam em Fog City, e algumas janelas e vidros quebrados brilham à noite em Machine City.\n• Os faróis dos carros voltados para o sul acompanham a carroceria.\n• O clima começa em 2x; as áreas de Network não têm nuvens, e a neve de Holy Peaks desaparece além do planalto norte.\n• Nova gravação de fogueira com menos ruído grave; o som das fontes desaparece a uma distância menor.",
    "Excerpts, mono, filtering, volume matching and Opus encoding. Playback limited to 2.2 seconds with edge fades and long pauses.": "Trechos em mono, filtragem, ajuste de volume e codificação Opus. Reprodução limitada a 2,2 segundos com transições suaves e pausas longas.",
    "Previously trimmed, volume matched and encoded to mono Opus. Played as 3.2 second passages with edge fades and long pauses, without a continuous loop.": "Recortado, ajustado em volume e codificado em Opus mono anteriormente. Reproduzido em trechos de 3,2 segundos com transições suaves e pausas longas, sem repetição contínua.",
    "Sound credits": "Créditos de som",
    "Excerpts, mono, filtering, volume matching, edge fades or loop crossfades, Opus encoding.": "Trechos, mono, filtragem, ajuste de volume, transições nas bordas ou entre loops e codificação Opus.",
    "Show advanced settings": "Mostrar configurações avançadas",
    "Start window": "Janela inicial",
    "Shows game updates and players online when the client starts.": "Mostra as novidades do jogo e os jogadores online ao abrir o cliente.",
    "Players online": "Jogadores online",
    "Shows how many players are online. Drag it anywhere.": "Mostra quantos jogadores estão online. Arraste para qualquer lugar.",
    "online": "online",
    "capacity": "capacidade",
    "maintenance": "manutenção",
    "Server status unavailable": "Status do servidor indisponível",
    "Quest markers": "Marcas de missão",
    "Attack picks a target": "Ataque escolhe alvo",
    "Livelier Paladin Mode": "Paladin Mode mais vivo",
    "Wing beats, a moving tail in every direction and enhanced sword attacks for Imperialdramon Paladin Mode.": "Batidas de asa, cauda em movimento em todas as direções e ataques de espada aprimorados para Imperialdramon Paladin Mode.",
    "Basic attack without a living target first selects the nearest enemy, in the same press.": "O ataque básico sem um alvo vivo seleciona primeiro o inimigo mais próximo, com o mesmo toque.",
    "Marks monsters you still need: a gold ! for quests, a blue ! for dailies and the sun for the daily board.": "Marca os monstros de que você ainda precisa: um ! dourado para missões, um ! azul para diárias e o sol para o quadro diário.",
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
    "Footstep volume": "Volume dos passos",
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
    "The first release: light, shadows and ambience.\n• Soft lighting, object shadows, moving treetops and water reflections.\n• Regional day and night ambience with wildlife, fire, fountains and nearby water.\n• Larger Digimon cast wider light, moonlight shadows are softer, and the atmosphere starts as soon as the map is ready.": "O primeiro lançamento: luz, sombras e ambiente.\n• Iluminação suave, sombras de objetos, copas em movimento e reflexos na água.\n• Ambiente regional de dia e de noite com animais, fogo, fontes e água próxima.\n• Digimon maiores projetam uma luz mais ampla, as sombras do luar são mais suaves e a atmosfera aparece assim que o mapa fica pronto.",
    "Keyboard shortcuts": "Atalhos de teclado",
    "F10 or Ctrl+Shift+O: open or close settings.\nAlt+F10: toggle atmosphere and ambient sounds.\nCtrl+F10: toggle only ambient sounds.\nEscape: close settings.": "F10 ou Ctrl+Shift+O: abrir ou fechar configurações.\nAlt+F10: ativar ou desativar atmosfera e sons ambientes.\nCtrl+F10: ativar ou desativar apenas sons ambientes.\nEscape: fechar configurações.",
    "Development only: Shift+F10 cycles the selected clock, morning, noon, evening and night with a six second transition. Ctrl+Alt+P shows diagnostic counts.": "Apenas desenvolvimento: Shift+F10 alterna o relógio escolhido, manhã, meio-dia, entardecer e noite com uma transição de seis segundos. Ctrl+Alt+P mostra contadores de diagnóstico.",
    "Mono, 120 Hz low cut, gentle high-frequency filtering, constant volume matching, short loop crossfade and Opus encoding. No compression, pitch or speed change.": "Mono, corte de graves em 120 Hz, filtragem suave de agudos, ajuste constante de volume, transição curta do loop e codificação Opus. Sem compressão nem alteração de tom ou velocidade.",
    "Trimmed, looped, volume matched and encoded to mono Opus.": "Recortado, preparado em loop, ajustado em volume e codificado em Opus mono.",
    "Quest markers on monsters.\n• Monsters you still need for a quest show a gold ! for quests, a blue ! for dailies or the sun for the daily board before their name. Switch it off in F10.": "Marcas de missão nos monstros.\n• Os monstros de que você ainda precisa para uma missão mostram antes do nome um ! dourado para missões, um ! azul para diárias ou o sol para o quadro diário. Dá para desativar no F10.",
    "A players online counter.\n• An optional counter in the game shows how many players are online. Switch it on in F10 and drag it anywhere.": "Um contador de jogadores online.\n• Um contador opcional no jogo mostra quantos jogadores estão online. Ative no F10 e arraste para qualquer lugar.",
    "A start window, living Toy Town windows and glowing dark towers.\n• The desktop client opens with a start window: the game's latest patch notes, players online and links. Turn it off in F10.\n• Client updates download in the start window with a progress bar; Update and play installs them and restarts the client.\n• Skill effects glow at night in their own colours, such as Seraphimon's Seven Heavens.\n• Dark towers in Tower Forest, Kaiser Canyon and Sunset Bay glow purple at night and pulse with their panels.\n• Toy Town windows have residents: most rooms stay dark, others light up for an evening, a late reader, a TV or a night light, and the lights change during the night.\n• The Toy Town castle windows and the locomotive cab window light up.\n• The lanterns by the phone box in Sea of Darkness glow from their glass.\n• If the game stays black after a restart, the client repairs its cache once by itself.": "Uma janela inicial, janelas com vida em Toy Town e torres negras que brilham.\n• O cliente de desktop abre com uma janela inicial: as últimas notas de atualização do jogo, os jogadores online e links. Dá para desativar no F10.\n• As atualizações do cliente são baixadas na janela inicial com uma barra de progresso; Atualizar e jogar instala e reinicia o cliente.\n• Os efeitos de habilidades brilham à noite com as próprias cores, como o Seven Heavens do Seraphimon.\n• As torres negras de Tower Forest, Kaiser Canyon e Sunset Bay brilham em roxo à noite e pulsam no ritmo dos seus painéis.\n• As janelas de Toy Town têm moradores: a maioria dos cômodos fica escura; outros acendem para uma noite em família, um leitor noturno, uma TV ou um abajur, e as luzes mudam ao longo da noite.\n• As janelas do castelo de Toy Town e a cabine do maquinista da locomotiva se acendem.\n• As lanternas ao lado da cabine telefônica em Sea of Darkness brilham a partir do vidro.\n• Se o jogo ficar preto depois de reiniciar, o cliente repara o cache sozinho uma vez.",
    "Swaying trees in Toy Town and beyond.\n• The redrawn cherry and yard trees in Toy Town sway in the wind again.\n• Snowy firs, bamboo and the cherry and zelkova trees in Highton Terrace and Odaiba now sway too; bamboo bends from its base.": "Árvores balançando em Toy Town e além.\n• As cerejeiras e árvores de quintal redesenhadas de Toy Town voltam a balançar com o vento.\n• Os pinheiros nevados, o bambu e as cerejeiras e zelkovas de Highton Terrace e Odaiba agora também balançam; o bambu se curva a partir da base.",
    "Night details, a calmer soundscape and a Linux client.\n• New night lights: the dragon's eye in Machine City, the Factory Town generators (also by day), the Kaiser's Fortress incubators, Sunset Bay's tiki torches and its lighthouse with a turning beam.\n• Hanging pumpkin lamps glow at the pumpkin; Piedmon's castle windows glow more softly.\n• Map exits glow at night with rising sparks.\n• Chimneys in Gate Village smoke in autumn and winter.\n• Water, sea and waterfalls are quieter with less rumble; creeks are softly audible from farther away.\n• Savanna acacias sway without gaps in their crowns.\n• Simpler audio settings: the technical compressor controls are gone.\n• Windows, lights and headlights follow the game's redrawn art in Toy Town, Odaiba, Machine City and Fog City.\n• The new Tamers maps get city or nature ambience, matching weather, car headlights and glowing Hypnos towers.\n• Block piles cast one shadow from their base, and narrow pier ends show a reflection again.\n• New Linux client (AppImage) with automatic updates.": "Detalhes noturnos, uma paisagem sonora mais tranquila e um cliente para Linux.\n• Novas luzes noturnas: o olho do dragão em Machine City, os geradores de Factory Town (também de dia), as incubadoras de Kaiser's Fortress, as tochas tiki de Sunset Bay e seu farol com um feixe giratório.\n• As lanternas de abóbora penduradas brilham na abóbora; as janelas do castelo de Piedmon brilham de forma mais suave.\n• As saídas dos mapas brilham à noite com faíscas subindo.\n• As chaminés de Gate Village soltam fumaça no outono e no inverno.\n• Água, mar e cachoeiras soam mais baixo e com menos ronco; os riachos são ouvidos suavemente de mais longe.\n• As acácias da savana balançam sem buracos nas copas.\n• Configurações de áudio mais simples: os controles técnicos do compressor foram removidos.\n• Janelas, luzes e faróis acompanham a arte redesenhada do jogo em Toy Town, Odaiba, Machine City e Fog City.\n• Os novos mapas de Tamers ganham ambiente de cidade ou de natureza, clima combinando, faróis nos carros e torres Hypnos iluminadas.\n• As pilhas de blocos projetam uma única sombra a partir da base, e as pontas de píeres estreitos voltam a ter reflexo.\n• Novo cliente para Linux (AppImage) com atualizações automáticas.",
    "A large atmosphere update: classic water reflections, natural tree movement and many new lights.\n• Water mirrors characters downward at ponds, lakes and beaches.\n• Leaves and crowns sway while trunks stay put; palms bend from the base.\n• Lanterns, candles and windows glow from their flames and glass, with new night lights across the maps.\n• Attacks, skill projectiles and beams cast a matching light at night.\n• Shadows no longer fall across houses and objects.\n• Water sounds at ponds and lakes, regional wind and loudspeaker chatter in Server Desert.\n• Choose real time, a repeating day or a fixed time for the atmosphere.\n• The desktop client shows DigiMMO as your game in Discord.": "Uma grande atualização de ambiente: reflexos clássicos na água, árvores com movimento natural e muitas luzes novas.\n• A água reflete os personagens para baixo em lagoas, lagos e praias.\n• Folhas e copas balançam enquanto os troncos ficam parados; as palmeiras se curvam a partir da base.\n• Lanternas, velas e janelas brilham a partir das chamas e do vidro, com novas luzes noturnas pelos mapas.\n• Ataques, projéteis de habilidades e raios lançam à noite uma luz da mesma cor.\n• As sombras não caem mais sobre casas e objetos.\n• Sons de água em lagoas e lagos, vento regional e vozes de alto-falante em Server Desert.\n• Escolha hora real, um dia repetido ou um horário fixo para o ambiente.\n• O cliente para desktop mostra DigiMMO como seu jogo no Discord.",
    "Trimmed, looped, volume matched and encoded to mono Opus. Regional high-pass and low-pass filters with subtle per-map variation and slow gain changes during playback; no pitch or speed change.": "Recortado, preparado em loop, com volume ajustado e codificado em Opus mono. Filtros regionais de passa-altas e passa-baixas com variações sutis por mapa e mudanças lentas de volume durante a reprodução; sem alterar o tom ou a velocidade.",
    "Atmosphere clock": "Relógio da atmosfera",
    "Repeating day": "Dia em ciclo",
    "Fixed time": "Horário fixo",
    "Day length": "Duração do dia",
    "Real time follows your computer clock. Only affects lighting, shadows and ambience.": "A hora real segue o relógio do computador. Afeta apenas a iluminação, as sombras e o ambiente.",
    "Excerpt, mono, 200 Hz low cut and two 900 Hz high cuts, constant volume matching, edge fades and Opus encoding. Varied short passages near Server Desert speakers with long pauses; no pitch or speed change.": "Trecho em mono, filtro de graves de 200 Hz e dois filtros de agudos de 900 Hz, ajuste de volume constante, fades e codificação Opus. Trechos curtos e variados perto dos alto-falantes de Server Desert com pausas longas; sem alterar o tom ou a velocidade."
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
      // @development-start
      console.info(tag, 'Audio: effects bus rerouted');
      // @development-end
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
      { name: 'Sandstorm', test: /savanna|desert|dune|sand(?!box)|canyon|mesa|pyramid/i, layers: [
        { cfg: { lifespan: [5000, 9000], speedX: [6, 16], speedY: [-3, 3], scale: [1, 2], alpha: 0.65, tint: [0xe8d3a0, 0xd9bf86, 0xf3e4bd], rate: 51 } },
      ] },
      { name: 'Snow', test: /freeze|snow|ice|glacier|frost|holy.?peaks|summit/i, layers: [
        { cfg: { lifespan: [7000, 11000], speedX: [3, 10], speedY: [12, 24], accelX: [-5, 5], scale: [1, 2], alpha: 0.9, tint: [0xffffff, 0xeef6ff, 0xdde9ff], rate: 22 } },
      ] },
      { name: 'Leaves', test: /forest|woods|grove|orchard|harvest|thicket|egg.?valley|primary|_park\b/i, layers: [
        { cfg: { lifespan: [6000, 9000], speedX: [8, 18], speedY: [6, 14], accelX: [-8, 8], scale: [2, 2], alpha: 0.9, tint: [0x6fa04a, 0x8cbf5a, 0x4f7f3a, 0xd08a3a], rate: 280 } },
        { lum: true, night: true, cfg: { lifespan: [3000, 6000], speedX: [-6, 6], speedY: [-6, 6], scale: [1, 1], alpha: 1, ease: blink, tint: [0xd8ff7a, 0xfff27a], rate: 260, add: true } },
      ] },
      { name: 'Fog', test: /fog|mist|marsh|orochimon|destiny|sea.?of.?darkness|dark.?ocean|dream|keep/i, layers: [
        { key: 'digimmo:glow', cfg: { lifespan: [12000, 20000], speedX: [3, 8], speedY: [-1, 1], scale: [3, 6], alpha: 0.09, tint: [0xdfe6ee, 0xcfd8e2], rate: 650 } },
      ] },
      { name: 'Sea spray', test: /bay|beach|shore|reef|sea|ocean|lake|lighthouse|seaside/i, layers: [
        { cfg: { lifespan: [3000, 6000], speedX: [8, 18], speedY: [-4, 2], scale: [1, 1], alpha: 0.45, tint: [0xffffff, 0xe8f6ff], rate: 170 } },
      ] },
      { name: 'Ash', test: /machine|factor|factory|fortress|hangar|engine|foundry|gear.?ridge/i, layers: [
        { cfg: { lifespan: [6000, 9000], speedX: [3, 8], speedY: [-6, 2], scale: [1, 2], alpha: 0.5, tint: [0x8a8a8a, 0x6e6e6e, 0xa0a0a0], rate: 90 } },
        { lum: true, cfg: { lifespan: [700, 1400], speedX: [-6, 6], speedY: [-22, -8], scale: [1, 1], alpha: 1, tint: [0xffd27a, 0xff8a30], rate: 900, add: true } },
      ] },
      { name: 'Data', test: /network|digital|war.?game|revenge|apocalymon|realm|d_reaper_kernel|zhuqiaomon|sovereign|beelzemon|deva_mountain/i, layers: [
        { lum: true, cfg: { lifespan: [2500, 5000], speedX: [-2, 2], speedY: [-14, -6], scale: [1, 2], alpha: 0.9, ease: blink, tint: [0x5ef2ff, 0x7dffb2, 0x3fa8ff], rate: 120, add: true } },
      ] },
      { name: 'Ghost lights', test: /overdell|graveyard|myotismon|chapel|phantom|haunt/i, layers: [
        { lum: true, cfg: { lifespan: [5000, 8000], speedX: [-3, 3], speedY: [-8, -3], scale: [1, 2], alpha: 0.5, tint: [0xc9b6ff, 0xe6dcff], rate: 220, add: true } },
      ] },
      { name: 'Confetti', test: /toy|primary[\s_-]*village/i, layers: [
        { cfg: { lifespan: [5000, 8000], speedX: [-6, 6], speedY: [10, 20], accelX: [-10, 10], scale: [2, 2], alpha: 0.9, tint: [0xff5a7a, 0xffd23a, 0x5ac8ff, 0x7aff8a, 0xc87aff], rate: 140 } },
      ] },
      { name: 'City', test: /odaiba|highton|terrace|city|plaza|street|tamers_(?:shinjuku_evacuation|west_shinjuku|siege_raid|d_reaper_shinjuku|deva_(?:roof|transit))/i, layers: [
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
    // @development-start
    const PREVIEW_SECONDS = 6;
    // @development-end

    let built = null;
    const brokenMaps = new Set();
    let readyScene = null, readyTilemap = null, readyMapId = null, integrityAt = 0;
    let enabled = SETTINGS.atmosphere;
    // @development-start
    let preview = null;
    let anim = null;
    // @development-end

    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const rgb = (c) => (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);

    const realHour = () => {
      if (SETTINGS.timeMode === 'fixed') return SETTINGS.fixedTime / 60;
      if (SETTINGS.timeMode === 'cycle' && DAY_MINUTES() > 0)
        return ((Date.now() / 60000) % DAY_MINUTES()) / DAY_MINUTES() * 24;
      const d = new Date();
      return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    };
    // @development-start
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
    // @development-end
    // @public: const hourNow = realHour;

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
      // Shore tiles reflect only below their foam line: holes open from row 1 to 12 downward.
      for (let top = 1; top <= 12; top++) if (!tx.exists('digimmo:waterHoleFrom' + top)) {
        const c = document.createElement('canvas'); c.width = c.height = 16;
        const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, top, 16, 16 - top);
        tx.addCanvas('digimmo:waterHoleFrom' + top, c);
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
      // Visible artwork drawn over water (lilies, shore edges, rocks, hulls) covers reflections.
      const waterLayer = new Map(), waterCovers = [];
      let layerIndex = -1;
      for (const L of tm.layers) {
        layerIndex++;
        const coversWater = L.name !== 'collision' && !L.name.startsWith('terrain_underlay');
        const isAbove = L.name === 'above';
        const isWalls = L.name === 'walls';
        // One above# row may occupy a full-size tile grid. Skip it before traversing tiles.
        if (L.name.startsWith('above#')) continue;
        for (const row of L.data) for (const t of row) {
          if (!t || t.index <= 0) continue;
          let info = cache.get(t.index);
          if (info === undefined) { info = tileInfo(tm, t.index); cache.set(t.index, info); }
          if (!info) continue;
          const cell = t.x + ',' + t.y, waterBelow = waterLayer.get(cell);
          const isWater = !!info.name && WATER_NAMES.test(baseName(info.name));
          if (isWater && waterBelow === undefined) waterLayer.set(cell, layerIndex);
          else if (!isWater && coversWater && waterBelow < layerIndex && waterCovers.length < 6000) {
            const f = tileFrame(scene, info, t.index);
            if (f) waterCovers.push({ x: t.pixelX, y: t.pixelY, f, flipX: !!t.flipX, flipY: !!t.flipY, rotation: t.rotation || 0 });
          }
          if (info.name) {
            // These two-part lanterns emit from the glass, not their unlit posts.
            const darkPost = (info.ts.name === 'graveyard' && info.name === 'lamp_base') ||
              (info.ts.name === 'keep' && info.name === 'lantern_base') ||
              (info.ts.name === 'shrine' && info.name === 'stone_lantern_base') ||
              (info.ts.name === 'puppetwoods' && info.name === 'hanglamp_base') ||
              (info.ts.name === 'greysea' && info.name === 'camp_lantern_base');
            const bulb = info.ts.name === 'graveyard' && info.name === 'lamp_top' ? [8, 9] :
              info.ts.name === 'keep' && info.name === 'lantern_top' ? [5, 13] :
              info.ts.name === 'shrine' && info.name === 'stone_lantern_top' ? [8, 13] :
              info.ts.name === 'puppetwoods' && info.name === 'hanglamp_top' ? [9, 16] :
              // Sea of Darkness lanterns by the phone box: the glass sits low in the top tile.
              info.ts.name === 'greysea' && info.name === 'camp_lantern_top' ? [7.5, 14] : null;
            // Pre-drawn light pools on the ground are not light sources.
            const def = darkPost || /pool/i.test(info.name) ? null : LIGHTS.find(l => l.test.test(info.name));
            if (def) {
              const isBulb = /torch|lantern|lamp|candle/i.test(info.name);
              // Emit from the bulb, near the upper edge of small lantern tiles.
              lights.push({ x: t.pixelX + (bulb ? bulb[0] : 8), y: t.pixelY + (bulb ? bulb[1] : /^jackolantern$/i.test(info.name) ? 2 : isBulb ? 4 : 8), def,
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
              name: info.name, above: isAbove, solid: info.collides, art: shadowArt(info.name), f,
              flipX: !!t.flipX, flipY: !!t.flipY, rotation: t.rotation || 0 });
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
      // Sand and foam shore overlays draw water but carry no water name. Their lower rows,
      // matched against this map's water colours, reflect like water.
      const shores = [];
      if (water.length) {
        const images = new Map(), palette = new Set(), waterGids = new Set(), shoreCells = new Set();
        const pixels = (key) => {
          if (!images.has(key)) {
            let data = null;
            try {
              const img = scene.textures.get(key).getSourceImage(), c = document.createElement('canvas');
              c.width = img.width; c.height = img.height;
              const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
              data = g.getImageData(0, 0, img.width, img.height);
            } catch {}
            images.set(key, data);
          }
          return images.get(key);
        };
        const colour = (t, info, px, py) => {
          const d = info.ts.image && pixels(info.ts.image.key), c = d && info.ts.getTileTextureCoordinates(t.index);
          if (!c) return -1;
          const k = ((c.y + (t.flipY ? 15 - py : py)) * d.width + c.x + (t.flipX ? 15 - px : px)) * 4;
          return d.data[k + 3] < 128 ? -1 : d.data[k] << 16 | d.data[k + 1] << 8 | d.data[k + 2];
        };
        const wetCells = new Set(water.map(w => (w.x >> 4) + ',' + (w.y >> 4)));
        for (const L of tm.layers) for (const row of L.data) for (const t of row) {
          if (!t || t.index <= 0 || waterGids.has(t.index) || !wetCells.has(t.x + ',' + t.y)) continue;
          const info = cache.get(t.index);
          if (!info || !WATER_NAMES.test(baseName(info.name))) continue;
          waterGids.add(t.index);
          for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) palette.add(colour(t, info, px, py));
        }
        palette.delete(-1);
        const drawn = tm.layers.filter(L => L.name !== 'collision' && L.name !== 'above' &&
          !L.name.startsWith('above#') && !L.name.startsWith('terrain_underlay'));
        const above = tm.layers.filter(L => L.name === 'walls' || L.name === 'above');
        for (const w of water) {
          const cx = w.x >> 4, cy = (w.y >> 4) - 1, key = cx + ',' + cy;
          if (cy < 0 || wetCells.has(key) || shoreCells.has(key)) continue;
          shoreCells.add(key);
          const stack = [];
          for (const L of drawn) {
            const t = L.data[cy]?.[cx];
            if (!t || t.index <= 0 || t.rotation) continue;
            let info = cache.get(t.index);
            if (info === undefined) { info = tileInfo(tm, t.index); cache.set(t.index, info); }
            if (info) stack.push([t, info]);
          }
          let top = 16;
          for (let py = 15; py >= 0; py--) {
            let n = 0;
            for (let px = 0; px < 16; px++) {
              let c = -1;
              for (let i = stack.length - 1; i >= 0 && c < 0; i--) c = colour(stack[i][0], stack[i][1], px, py);
              if (palette.has(c)) n++;
            }
            if (n < 12) break;
            top = py;
          }
          if (top > 12) continue;
          shores.push({ x: cx * 16, y: cy * 16, top });
          // Objects on these shore cells (starfish, crowns) stay above the reflection.
          for (const L of above) {
            const t = L.data[cy]?.[cx];
            if (!t || t.index <= 0) continue;
            const info = cache.get(t.index) ?? tileInfo(tm, t.index), f = info && tileFrame(scene, info, t.index);
            if (f) waterCovers.push({ x: t.pixelX, y: t.pixelY, f, flipX: !!t.flipX, flipY: !!t.flipY, rotation: t.rotation || 0 });
          }
        }
      }
      return { lights: merged, water, runningWater, casters, waterCovers, shores };
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
      const tm = scene.tilemap, families = new Map(), lookup = new Map(), lake = new Map(), shore = new Map();
      // Marshes and the Shinjuku park pond reuse sea tiles; they sound like calm water, without waves or gulls.
      const inland = /marsh|orochimon|shinjuku_park/.test(scene.mapId || '');
      for (const layer of tm.layers) {
        if (layer.name.startsWith('above#')) continue;
        for (const row of layer.data) for (const tile of row) {
          if (!tile || tile.index <= 0) continue;
          if (!lookup.has(tile.index)) lookup.set(tile.index, tileInfo(tm, tile.index)?.name || '');
          const name = lookup.get(tile.index);
          const x = (layer.tilemapLayer?.x ?? layer.x ?? 0) + tile.pixelX, y = (layer.tilemapLayer?.y ?? layer.y ?? 0) + tile.pixelY;
          const base = baseName(name), key = `${x},${y}`;
          // Exact water names exclude shore trim, lamp pools, tanks and frozen ground.
          const sea = SEA_NAMES.test(base) || /^(bay|tb_bay)$/i.test(base);
          if (/^(water|pond|pool|lake)$/i.test(base) || (sea && inland)) lake.set(key, { x: x + 8, y: y + 8 });
          else if (sea) shore.set(key, { x: x + 8, y: y + 8 });
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
      return { fountains, lake: [...lake.values()], shore: [...shore.values()] };
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
      const { lights, water, runningWater, casters, waterCovers, shores } = scan(scene);
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
        // Numbered artwork can continue on the walls layer below and beside its
        // above# part (the lower crates of a block pile). Those wall tiles join
        // the object, so its shadow starts at the real foot instead of floating.
        const todo = cells.map(([x, y]) => [x, y, crownCells.get(x + ',' + y)]);
        for (const [key, owner] of trunkOwner) if (owner === name) {
          const [x, y] = key.split(',').map(Number); todo.push([x, y, wallCells.get(key)]);
        }
        for (let added = 0; todo.length && added < 256;) {
          const [x, y, art] = todo.pop();
          if (!art || art.art.index === undefined) continue;
          for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const key = (x + ax) + ',' + (y + ay), wall = wallCells.get(key);
            if (!wall || aboveOwner.has(key) || trunkOwner.has(key) || !adjacentShadowArt(art, wall, ax, ay)) continue;
            trunkOwner.set(key, name); todo.push([x + ax, y + ay, wall]); added++;
            if (y + ay > foot) foot = y + ay;
          }
        }
        objectFoot.set(name, (foot + 1) * 16);
      }
      const shadowParts = [];
      // The game's ground cache flattens wall artwork into its ground image.
      // Cut those opaque pixels out of our shadow, without changing game layers.
      const shadowOccluders = casters.filter(c => !c.above);
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
      const eraseShadowOnObject = (target, object, clip = null) => {
        if (clip && (object.x + 16 < clip.x || object.x > clip.x + clip.w ||
            object.y + 16 < clip.y || object.y > clip.y + clip.h)) return;
        target.stamp(object.f.key, object.f.name, object.x + 8, object.y + 8, {
          rotation: object.rotation, scaleX: object.flipX ? -1 : 1,
          scaleY: object.flipY ? -1 : 1, blendMode: ERASE,
        });
      };
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
          shadowJob = { key, dx, dy, k: SHADOW_HEIGHT() * 0.3, sink: grounded ? 1.35 : 0.3, grounded, i: 0, erase: 0 };
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
              for (const object of shadowOccluders) eraseShadowOnObject(shadowFront, object, view);
              shadowFront.render(); firstShadowView = visibleKey;
            }
            shadowFront.setVisible(true).setAlpha(opacity);
          }
          const end = Math.min(shadowParts.length, job.i + SHADOW_SLICES_PER_FRAME);
          for (let j = job.i; j < end; j++) {
            const part = shadowParts[j];
            paintShadow(shadowWork, part, job);
          }
          const remaining = SHADOW_SLICES_PER_FRAME - (end - job.i);
          job.i = end;
          if (end >= shadowParts.length) {
            const eraseEnd = Math.min(shadowOccluders.length, job.erase + remaining);
            for (let j = job.erase; j < eraseEnd; j++) eraseShadowOnObject(shadowWork, shadowOccluders[j]);
            job.erase = eraseEnd;
          }
          shadowWork.render();
          if (end >= shadowParts.length && job.erase >= shadowOccluders.length) {
            const shown = shadowWork; shadowWork = shadowFront; shadowFront = shown;
            shadowKey = job.key; shadowJob = null;
            shadowWork.setVisible(false);
          }
        }
        if (shadowKey) shadowFront.setVisible(true).setAlpha(opacity);
      };

      const trees = [];
      // Reassemble reviewed crown artwork across above# layers before separating
      // foliage from wood. Small crowns move together; giant crowns have three masses.
      const splitTreeCrowns = () => {
        const layouts = { bigtree: [4,3,3], oldtree: [8,6,3], ztree: [3,3,1], ginkgo: [3,3,1], acacia: [4,2,1],
          'beach:palm': [2,3,1], 'serverdesert:palm': [3,2,1],
          tree: [2,2,1], dtree: [2,2,1], btree: [2,2,1], pine: [1,1,1],
          vtree: [2,2,1], vpine: [1,1,1], apple_tree: [2,2,1], pineb: [3,3,1],
          hpine: [3,2,1], hpine_s: [2,2,1], cherrytree: [2,2,1], 'toytown:cherry_tree': [2,2,1], 'toytown:yard_tree': [2,2,1],
          'snow:fir': [2,2,1], 'peaks:bamboo': [2,2,1], 'highton:sakurab': [4,4,3], 'city:zelkova': [2,2,1], 'city:sakura': [2,2,1],
          deadtree: [2,2,1], gnarled_tree: [2,2,1], blacktree: [2,2,1], twisttree: [2,2,1] };
        const tipsOnly = new Set(['deadtree','gnarled_tree','blacktree','twisttree']);
        const coloredCrowns = new Set(['tree','dtree','btree','pine','vtree','vpine','apple_tree','pineb','hpine','hpine_s','cherrytree','cherry_tree','yard_tree','fir','sakurab','zelkova','sakura']);
        const groups = new Map();
        for (const layer of [...scene.children.list]) {
          if (layer.type !== 'TilemapLayer' || !layer.layer?.name?.startsWith('above#')) continue;
          for (const row of layer.layer.data) for (const tile of row) {
            if (!tile || tile.index <= 0 || tile.flipX || tile.flipY || tile.rotation) continue;
            const info = tileInfo(tm, tile.index), match = /^(\w+)_(\d+|tl|tr|ml|mr|top)$/.exec(info?.name || '');
            if (!match) continue;
            const shape = layouts[info.ts.name + ':' + match[1]] || (Object.hasOwn(layouts, match[1]) && layouts[match[1]]);
            if (!shape) continue;
            const [cols, rows, count] = shape;
            let index = /^\d+$/.test(match[2]) ? Number(match[2]) : {tl:0,tr:1,ml:2,mr:3,top:0}[match[2]];
            // The bent Highton pine skips the empty lower-left crown cell.
            if (match[1] === 'pineb' && index >= 6) index++;
            // The broad Highton cherry numbers its trunk 12-13 (walls) before the hanging crown ends 14-15.
            if (match[1] === 'sakurab' && index === 14) index = 12;
            if (index >= cols * rows) continue;
            const x = layer.x + tile.pixelX - index % cols * 16;
            const y = layer.y + tile.pixelY - Math.floor(index / cols) * 16;
            const key = info.ts.name + ':' + match[1] + ':' + x + ',' + y;
            if (!groups.has(key)) groups.set(key, { x, y, cols, rows, count, family: match[1], depth: layer.depth, cells: [] });
            const group = groups.get(key); group.depth = Math.max(group.depth, layer.depth);
            group.cells.push({ tile, index, layer });
          }
        }
        const masks = new Map(), textures = new Map();
        for (const group of groups.values()) {
          group.cells.sort((a,b) => a.index - b.index);
          const art = group.family + ':' + group.cells.map(c => c.index + ':' + c.tile.index).join(',');
          const width = group.cols * 16, height = group.rows * 16;
          // Bamboo stalks run through the crown without wood, so they bend from the base like palms.
          const palm = group.family === 'palm' || group.family === 'bamboo', tips = tipsOnly.has(group.family), banded = palm || tips;
          const colored = coloredCrowns.has(group.family);
          let parts = masks.get(art);
          if (!parts) {
            const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            for (const { tile, index } of group.cells) {
              const info = tileInfo(tm, tile.index), frame = info.ts.getTileTextureCoordinates(tile.index);
              const image = scene.textures.get(info.ts.image.key).getSourceImage();
              ctx.drawImage(image, frame.x, frame.y, 16, 16, index % group.cols * 16, Math.floor(index / group.cols) * 16, 16, 16);
            }
            const input = ctx.getImageData(0, 0, width, height);
            parts = Array.from({ length: group.count + 1 }, () => ctx.createImageData(width, height));
            if (banded) parts[0] = input;
            else {
              const foliage = new Uint8Array(width * height);
              const centres = [[0.46,0.19],[0.20,0.55],[0.78,0.60]].map(([x,y]) => [x * width, y * height]);
              for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
                const k = (y * width + x) * 4, r = input.data[k], g = input.data[k+1], b = input.data[k+2];
                // Moss on the lower trunk is part of the fixed wood, not a crown.
                const leaf = group.family === 'ginkgo'
                  ? r > g * 1.05 && (g > b * 2.5 || (r > 230 && g > 180 && b < 180))
                  : g > r * 1.08 && g > b * (group.count === 1 ? 0.85 : 1.15);
                // These reviewed palettes also contain blossoms, fruit and snow.
                // Keep their brown wood fixed without discarding colored foliage.
                const wood = r > g * 1.12 && g >= b * 1.1;
                const fruit = group.family === 'apple_tree' && r > g * 2.5 && b > g * 0.7;
                const gold = (group.family === 'vtree' || group.family === 'vpine') && r > 220 && g > 180 && b < 100;
                if (input.data[k+3] && (colored ? !wood || fruit || gold : leaf) && (group.count === 1 ||
                    y < height * 0.85 || Math.abs(x - width / 2) > width * 0.23)) foliage[y * width + x] = 1;
              }
              for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
                const k = (y * width + x) * 4, r = input.data[k], g = input.data[k+1], b = input.data[k+2];
                if (!input.data[k+3]) continue;
                let leaves = !!foliage[y * width + x];
                // Carry the dark outline with its leaves instead of leaving a
                // stationary pixel fringe behind each moving crown.
                if (!colored && !leaves && Math.max(r,g,b) < 55 && Math.max(r,g,b) - Math.min(r,g,b) < 20) {
                  for (let dy = -1; dy <= 1 && !leaves; dy++) for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height && foliage[ny * width + nx]) { leaves = true; break; }
                  }
                }
                // Acacia canopies weave thin branches through the leaves. Branches within two
                // pixels of foliage move with it so no see-through gaps open; the fork stays fixed.
                if (group.family === 'acacia' && !leaves) {
                  for (let dy = -2; dy <= 2 && !leaves; dy++) for (let dx = -2; dx <= 2; dx++) {
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height && foliage[ny * width + nx]) { leaves = true; break; }
                  }
                }
                const distances = group.count === 1 ? [0] : centres.map(([cx,cy]) => Math.hypot(x-cx,y-cy));
                const nearest = Math.min(...distances);
                for (let part = 0; part <= group.count; part++) {
                  // The pieces can move one pixel in opposite directions. Keep
                  // enough shared foliage to cover that full relative movement.
                  if (part === group.count ? leaves : !leaves || distances[part] > nearest + 3) continue;
                  parts[part].data.set(input.data.subarray(k,k+4),k);
                }
              }
            }
            masks.set(art, parts);
          }
          const phase = (group.x * 0.017 + group.y * 0.011) % 6.283;
          // Keep each small-crown section at the game's original depth. Sections
          // from different layers share one phase, so their edges cannot split.
          const sections = group.count === 3 ? [{ cells: group.cells, depth: group.depth, alpha: 1 }] : [];
          if (group.count === 1) for (const cell of group.cells) {
            let section = sections.find(s => s.depth === cell.layer.depth && s.alpha === cell.layer.alpha);
            if (!section) { section = { cells: [], depth: cell.layer.depth, alpha: cell.layer.alpha }; sections.push(section); }
            section.cells.push(cell);
          }
          for (const section of sections) for (const part of banded ? [0] : [group.count, ...Array(group.count).keys()]) {
            const textureId = art + '|' + section.cells.map(c => c.index).join(',') + '|' + part;
            let texture = textures.get(textureId);
            if (texture === null) continue;
            if (!texture) {
              const key = 'digimmo:crown:' + scene.mapId + ':' + textures.size;
              const c = document.createElement('canvas'); c.width=width;c.height=height;c.getContext('2d').putImageData(parts[part],0,0);
              if (sections.length > 1) {
                const mask = c.getContext('2d'); mask.globalCompositeOperation = 'destination-in';
                mask.beginPath();
                for (const { index } of section.cells) mask.rect(index % group.cols * 16, Math.floor(index / group.cols) * 16, 16, 16);
                mask.fill();
              }
              const pixels = c.getContext('2d').getImageData(0,0,width,height).data;
              if (!pixels.some((value,index) => index % 4 === 3 && value)) {
                textures.set(textureId,null); continue;
              }
              // Reuse identical artwork across placed trees and release it once.
              const images = [];
              cleanups.push(() => { for (const o of images) o.destroy(); if (scene.textures.exists(key)) scene.textures.remove(key); });
              scene.textures.addCanvas(key,c);
              const bands = [];
              if (banded) {
                for (let y = 0; y < height;) {
                  const bandHeight = tips && y >= 8 ? height - y : 4;
                  let filled = false;
                  for (let k = y * width * 4 + 3; k < (y + bandHeight) * width * 4 && !filled; k += 4) filled = !!pixels[k];
                  if (filled) bands.push(y);
                  y += bandHeight;
                }
              }
              texture = { key, images, bands }; textures.set(textureId, texture);
            }
            for (const row of banded ? texture.bands : [0]) {
              const image = own(scene.add.image(group.x,group.y,texture.key)); texture.images.push(image);
              image.setOrigin(0).setDepth(section.depth).setAlpha(section.alpha);
              // A shared seam row keeps diagonal one-pixel twigs connected
              // when neighboring tip bands differ by one pixel.
              if (banded) image.setCrop(0,row,width,tips ? (row >= 8 ? height - row : 5) : 4);
              // The lowest palm band meets the unchanged ground-cache trunk.
              // Dead trees only bend at their upper tips; their main branches stay still.
              if (part < group.count) trees.push({ L:image,bx:group.x,by:group.y,ph:phase + part * 2.094,
                maxStrength:palm ? 2 : 1,bend:tips ? Math.max(0,(12 - row) / 12) : palm ? (height - row - 4) / (height - 4) : 1,
                family:group.family,part:banded ? row : part });
            }
          }
          const saved = group.cells.map(({tile})=>[tile,tile.visible,tile.alpha]);
          cleanups.push(()=>{for(const [t,visible,alpha] of saved){t.visible=visible;t.alpha=alpha;}});
          for (const {tile} of group.cells) {tile.visible=false;tile.alpha=0;}
        }
      };
      splitTreeCrowns();
      const wl = Math.hypot(CLOUDS.wind[0], CLOUDS.wind[1]) || 1, wdx = CLOUDS.wind[0] / wl, wdy = CLOUDS.wind[1] / wl;
      const swayTrees = (time) => {
        const t = time / 1000;
        for (const tr of trees) {
          if (!SETTINGS.wind) { tr.L.x = tr.bx; continue; }
          const along = tr.bx * wdx + tr.by * wdy;
          const gust = 0.5 + 0.5 * Math.sin(along / SWAY.gustLength - t * SWAY.gustSpeed);
          const sway = Math.sin(t * SWAY.speed + tr.ph) * gust;
          const strength = Math.min(SWAY.strong, tr.maxStrength ?? Infinity);
          tr.L.x = tr.bx + Math.round(sway * (gust > 0.75 ? strength : Math.min(1, strength)) * (tr.bend ?? 1) * wdx);
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
        facadeGlass:[0xbad7ef,0,0.24,0.12], ruinWindow:[0xffcf85,0,0.28,0.16],
        window:[0xffdca0,0,0.32,0.24], toyWindow:[0xffdca0,0,0.32,0.24], violetWindow:[0xb69bea,0,0.28,0.22], stained:[0xd8c7ed,0,0.23,0.20],
        furnace:[0xffac55,0.22,0.36,0.40], candle:[0xffd58c,0.15,0.42,0.30],
        candelabra:[0xffd58c,0.15,0.42,0.55], chandelier:[0xffd58c,0.15,0.42,0.50],
        devimon:[0xc74c61,0,0.22,0.24], generator:[0xff645b,0,0.32,0.32], machineSigil:[0xe86d88,0,0.26,0.24],
        wreck:[0xff4f45,0,0.30,0.16], wreckDoor:[0xffbe62,0,0.30,0.42],
        dragonEye:[0xff3b3b,0,0.45,0.10], reactor:[0x74f0d4,0.22,0.24,0.30], lighthouse:[0xffe2a0,0.06,0.45,1.10],
        stasis:[0x6cff7a,0.04,0.30,0.34], torchFlame:[0xffb04a,0.10,0.36,0.38], portal:[0x7cc8ff,0,0.42,0.70],
        summon:[0xb081ef,0.08,0.30,0.26], coral:[0xc5a5f0,0.025,0.095,0.12], pumpkin:[0xffb54d,0.18,0.35,0],
        altarCrystal:[0xb18af0,0.035,0.20,0.22], altarGold:[0xf0c87d,0.015,0.16,0.18],
        tv:[0x9ed9ff,0.10,0.26,0.80], car:[0xffe4ae,0,0.42,0.26], phone:[0xb5e4ff,0.025,0.12,0.28],
        console:[0x7cc4ff,0.05,0.26,0.30], cabWindow:[0xffd38a,0,0.36,0.20],
        darkVein:[0xb08cff,0,0.45,0.14], darkCore:[0xa874ff,0,0.55,0.70],
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
      const fxTiles = [], fxLights = [], fxSeen = new Set(), fxBuckets = new Map(), acidCells = new Map(), screenCells = [], storyTiles = [];
      // Autumn and winter: the cottage chimneys smoke (artwork used in Gate Village).
      const chimneyPoints = [], chimneySmoke = SETTINGS.seasons && ['autumn', 'winter'].includes(seasonNow());
      const addFxLight = (kind,x,y,objectKey,screen) => {
        const bucket = objectKey || kind+':'+Math.floor(x/32)+','+Math.floor(y/32);
        let group=fxBuckets.get(bucket);
        if(!group){group={kind,x:0,y:0,n:0};fxBuckets.set(bucket,group);fxLights.push(group);}
        group.x+=x;group.y+=y;group.n++;
        if(screen)(group.screens ||= []).push(screen);
      };
      for(const layer of tm.layers){
        if(layer.name.startsWith('above#'))continue;
        for(const row of layer.data)for(const tile of row){
          if(!tile||tile.index<=0)continue;
          const info=tileInfo(tm,tile.index);if(!info)continue;
          const x=(layer.tilemapLayer?.x||0)+tile.pixelX,y=(layer.tilemapLayer?.y||0)+tile.pixelY;
          if(info.ts.name==='factory'&&/^sludge_\d+$/.test(info.name))acidCells.set(x+','+y,{x:x+8,y:y+8});
          const screenPart=info.ts.name==='farmland'&&/^tvbig_s([a-d])_(?:[0-2]|off)$/.exec(info.name);
          if(chimneySmoke&&info.ts.name==='farm'&&info.name==='cottage_3')chimneyPoints.push({x:x+1,y:y+5});
          const key=info.ts.name+':'+(screenPart?'tvbig_s'+screenPart[1]+'_0':info.name),definition=fxData[key];if(!definition)continue;
          const kind=definition[0];
          if(kind==='coral'&&scene.mapId!=='spiral_sea')continue;
          if((kind==='altarGold'||kind==='altarCrystal')&&scene.mapId!=='spiral_summit')continue;
          if(kind==='tv'&&!/^(gate_village|primary_village)$/.test(scene.mapId))continue;
          if((kind==='toyWindow'||kind==='cabWindow')&&scene.mapId!=='toy_town')continue;
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
          const screen=kind==='tv'?{layer,tx:tile.x,ty:tile.y,on:false}:null;
          if(screen)screenCells.push(screen);
          const record={kind,key,x:x+8,y:y+8,flipX:!!tile.flipX,flipY:!!tile.flipY,rotation:tile.rotation||0,screen};
          fxTiles.push(record);
          if(kind==='toyWindow'){
            // Lit later per window, by the resident's evening (see windowStory).
            storyTiles.push({record,gx:Math.round(x/16),gy:Math.round(y/16),mask:definition[1],flipX:record.flipX,flipY:record.flipY,
              lightX,lightY,castle:info.ts.name==='toycastle'});
          }else if(kind==='darkCore'){
            // The two blinking base tiles of a dark tower share one light.
            addFxLight(kind,lightX,lightY,'darkCore:'+(x-(info.name.endsWith('_13')?16:0))+','+y);
          }else if(kind==='tv'){
            // The four screen tiles share one soft light spill below the glass.
            const part=screenPart?.[1];
            if(part){const sx=x-(/[bd]/.test(part)?16:0),sy=y-(/[cd]/.test(part)?16:0);addFxLight(kind,sx+16,sy+40,'tv:'+sx+','+sy,screen);}
          }else if(kind==='chandelier'){
            // A complete 2 by 2 fixture shares one light regardless of grid alignment.
            const part=Number(info.name.match(/_(\d+)$/)?.[1]);
            const bx=x-(part%2)*16,by=y-Math.floor(part/2)*16;
            addFxLight(kind,lightX,lightY,info.ts.name+':chandelier:'+bx+','+by);
          }else if(kind==='wreckDoor'){
            // The doorway's 2 by 2 parts (bow_xl rows are 14 tiles wide) share one light at the threshold.
            const part=Number(info.name.match(/_(\d+)$/)?.[1]);
            const bx=x-(part%2)*16,by=y-(part>=174?16:0);
            addFxLight(kind,bx+16,by+30,'wreckDoor:'+bx+','+by);
          }else if(kind==='reactor'){
            // Generator artwork is four tiles wide; its core tiles share one light per generator.
            const part=Number(info.name.match(/_(\d+)$/)?.[1]);
            addFxLight(kind,lightX,lightY,'reactor:'+(x-(part%4)*16)+','+(y-Math.floor(part/4)*16));
          }else if(kind==='candelabra'||kind==='candle'||kind==='torchFlame')addFxLight(kind,lightX,lightY,id);
          else if(fxStyle[kind][3]>0)addFxLight(kind,lightX,lightY);
        }
      }
      const phonePoints=[];
      for(const layer of tm.objects||[])for(const object of layer.objects||[]){
        if(object.name!=='digiphone')continue;
        // Public sprite anchor [16,46], roof centre [16,7].
        const x=object.x,y=object.y-39;phonePoints.push({x,y});addFxLight('phone',x,y);
      }
      // Map exits: the game marks each portal rectangle with a faint pulse that the night layer
      // darkens. Add a night light pool, a glow above the night layer and rising motes inside it.
      const portalPoints=[];
      for(const layer of tm.objects||[])for(const object of layer.objects||[]){
        if((object.type||object.class)!=='portal'||!(object.width>0&&object.height>0))continue;
        const rect={x:object.x,y:object.y,w:object.width,h:object.height};
        portalPoints.push({x:rect.x+rect.w/2,y:rect.y+rect.h/2,rect});
        addFxLight('portal',rect.x+rect.w/2,rect.y+rect.h/2,'portal:'+rect.x+','+rect.y);
      }
      // Maps without portal objects fall back to their warp tiles.
      if(!portalPoints.length)for(const light of lights)if(light.kind==='portal'){
        portalPoints.push({x:light.x,y:light.y,rect:{x:light.x-8,y:light.y-8,w:16,h:16}});addFxLight('portal',light.x,light.y);
      }
      // Toy Town windows belong to residents. Most rooms stay dark at night; the lit ones follow a small routine
      // in the atmosphere clock, and a few people get up now and then, so the lit windows change over the night.
      const hash32=(a,b,c)=>{
        let h=Math.imul(a,73856093)^Math.imul(b,19349663)^Math.imul(c,83492791);
        h=Math.imul(h^(h>>>16),0x45d9f3b);h=Math.imul(h^(h>>>16),0x45d9f3b);return (h^(h>>>16))>>>0;
      };
      // [story, weight in houses, weight in the castle]. Hours run 12 to 36, so the night is one span.
      // evening: the family room until bedtime. late: someone reading past midnight. tv: a blue screen flickers.
      // restless: dark, but someone gets up for a few minutes now and then. nightlight: a child's dim lamp.
      // early: the baker before dawn. watch: the castle guards, all night.
      const STORIES=[['dark',42,40],['evening',18,20],['late',9,10],['tv',7,0],['restless',14,14],['nightlight',5,0],['early',3,0],['watch',2,16]];
      // share: the window's place among all houses (or castle windows) in a fixed shuffled order, so the mix
      // of stories matches the weights on every map instead of depending on luck.
      const windowStory=(gx,gy,castle,share)=>{
        const detail=hash32(gx,gy,2);
        let sum=0,story='dark';
        for(const entry of STORIES){sum+=entry[castle?2:1];if(share*100<sum){story=entry[0];break;}}
        const minutes=n=>(detail>>>(n*5)&31)/31;
        const win={gx,gy,story,on:false,level:1,tint:null};
        if(story==='evening'){win.from=18.5+minutes(0);win.to=castle?22+minutes(1)*3:21+minutes(1)*2.5;}
        else if(story==='late'){win.from=20.5+minutes(0)*2;win.to=24.5+minutes(1)*2;}
        else if(story==='tv'){win.from=19.5+minutes(0);win.to=22.5+minutes(1)*2;win.tint=0x9ed9ff;}
        else if(story==='early'){win.from=28.5+minutes(0);win.to=32;}
        else if(story==='nightlight'){win.level=0.35;win.tint=0xffc48a;}
        return win;
      };
      const storyOn=(win,hour,now)=>{
        const h=hour<12?hour+24:hour;
        if(win.story==='watch'||win.story==='nightlight')return true;
        if(win.story==='restless'){
          // Eight minute turns: in about one in five a light goes on for one and a half to five minutes.
          const turn=Math.floor(now/480000),roll=hash32(win.gx,win.gy,turn),start=roll%240000,length=90000+(roll>>>8)%210000,t=now%480000;
          return roll%100<22&&t>=start&&t<start+length;
        }
        return win.from!==undefined&&h>=win.from&&h<win.to;
      };
      const storyWindows=[];
      if(storyTiles.length){
        // Neighbouring window tiles whose glass meets across the tile edge (mullions are at most two pixels) form one window.
        const at=new Map(),parent=storyTiles.map((_,i)=>i),root=i=>parent[i]===i?i:(parent[i]=root(parent[i]));
        for(const [i,t] of storyTiles.entries()){
          t.rows=[];
          for(let y=0;y<16;y++){
            let bits=parseInt(t.mask.slice(y*4,y*4+4),16);
            if(t.flipX){let m=0;for(let x=0;x<16;x++)if(bits>>x&1)m|=1<<(15-x);bits=m;}
            t.rows.push(bits);
          }
          if(t.flipY)t.rows.reverse();
          at.set(t.gx+','+t.gy,i);
        }
        const high=b=>31-Math.clz32(b),low=b=>31-Math.clz32(b&-b);
        for(const [i,t] of storyTiles.entries()){
          const right=at.get((t.gx+1)+','+t.gy),below=at.get(t.gx+','+(t.gy+1));
          if(right!==undefined){
            const o=storyTiles[right].rows;
            for(let y=0;y<16;y++)if(t.rows[y]&&o[y]&&15-high(t.rows[y])+low(o[y])<=2){parent[root(i)]=root(right);break;}
          }
          if(below!==undefined){
            const o=storyTiles[below].rows;
            for(let x=0;x<16;x++){
              const a=t.rows.findLastIndex(r=>r>>x&1),b=o.findIndex(r=>r>>x&1);
              if(a>=0&&b>=0&&15-a+b<=2){parent[root(i)]=root(below);break;}
            }
          }
        }
        const groups=new Map();
        for(const [i,t] of storyTiles.entries()){const r=root(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(t);}
        const found=[...groups.values()].map(tiles=>{
          const gx=Math.min(...tiles.map(t=>t.gx)),gy=Math.min(...tiles.map(t=>t.gy));
          return {tiles,gx,gy,castle:tiles.some(t=>t.castle),order:hash32(gx,gy,1)};
        });
        for(const castle of [false,true]){
          const list=found.filter(f=>f.castle===castle).sort((a,b)=>a.order-b.order);
          list.forEach((f,rank)=>{f.share=(rank+0.5)/list.length;});
        }
        for(const {tiles,gx,gy,castle,share} of found){
          const win=windowStory(gx,gy,castle,share);
          win.id=storyWindows.length;storyWindows.push(win);
          for(const t of tiles){t.record.window=win;addFxLight('toyWindow',t.lightX,t.lightY,'window:'+win.id);}
          fxBuckets.get('window:'+win.id).window=win;
        }
      }
      for(const point of fxLights){point.x/=point.n;point.y/=point.n;}
      const fxRT=fxTiles.length||portalPoints.length?own(scene.add.renderTexture(0,0,4,4)).setOrigin(0).setDepth(DEPTH_GLOW-1).setBlendMode(ADD):null;
      let fxLast=-Infinity,fxState='',fxVisible=[];
      // The lighthouse lamp is a Tiled tile animation that Phaser draws from its layer clock
      // (timeElapsed). The double beam follows that clock: one turn per animation cycle.
      let lampClock=null;
      for(const layer of scene.children.list){
        if(lampClock)break;
        if(layer.type!=='TilemapLayer'||!layer.layer?.name?.startsWith('above#'))continue;
        for(const row of layer.layer.data){
          for(const tile of row){
            const info=tile&&tile.index>0?tileInfo(tm,tile.index):null;
            if(info?.ts.name!=='sunsetbay'||info.name!=='lighthouse_xl_3')continue;
            const duration=info.ts.getTileData(tile.index)?.animationDuration;
            if(duration>0)lampClock={layer,duration};
            break;
          }
          if(lampClock)break;
        }
      }
      const lampPhase=(time)=>lampClock?(lampClock.layer.timeElapsed%lampClock.duration)/lampClock.duration:(time/10000)%1;
      // Dark tower panels blink as a two-frame tile animation (dim, bright); their glow and light follow its frame.
      let coreClock=null;
      if(fxTiles.some(t=>t.kind==='darkCore'))for(const layer of scene.children.list){
        if(coreClock||layer.type!=='TilemapLayer')continue;
        for(const row of layer.layer.data){
          const tile=row.find(t=>t&&t.index>0&&tileInfo(tm,t.index)?.name==='darktower_12');
          const data=tile&&tileInfo(tm,tile.index).ts.getTileData(tile.index);
          if(data?.animationDuration>0&&Array.isArray(data.animation)){coreClock={layer,duration:data.animationDuration,frames:data.animation};break;}
        }
      }
      const coreLevel=()=>{
        if(!coreClock)return 1;
        let t=coreClock.layer.timeElapsed%coreClock.duration;
        for(const [i,frame] of coreClock.frames.entries()){t-=frame.duration;if(t<0)return i%2?1:0.5;}
        return 1;
      };
      // Frame 0 shows the lamp facing the viewer: the beam points south in the middle of it.
      const beamAngle=(time)=>Math.PI/2+(lampPhase(time)-0.25)*Math.PI*2;
      const fxAmount=(kind,time)=>{
        const style=fxStyle[kind],dark=SETTINGS.dayNight?s.dark:0;
        const flicker=kind==='furnace'||kind==='candle'||kind==='candelabra'||kind==='chandelier'||kind==='torchFlame'?0.94+0.06*Math.sin(time/430):
          kind==='lighthouse'?0.65+0.35*Math.max(0,Math.cos((lampPhase(time)-0.25)*Math.PI*2)):
          kind==='darkCore'?coreLevel():kind==='cabWindow'?0.95+0.05*Math.sin(time/370):1;
        return SETTINGS.lights?(style[1]+style[2]*dark)*flicker:0;
      };
      const updateMapEffects=(time,ox,oy,w,h)=>{
        // Follow the game's screen tiles when a gate switches on or off.
        // Animation frames share the same aperture; no game state is changed.
        for(const screen of screenCells){
          const index=screen.layer.data[screen.ty]?.[screen.tx]?.index;
          screen.on=/^tvbig_s[a-d]_[0-2]$/.test(tileInfo(tm,index)?.name||'');
        }
        if(storyWindows.length){
          const hour=hourNow(),now=Date.now();
          for(const win of storyWindows){
            win.on=storyOn(win,hour,now);
            if(win.story==='tv')win.level=0.7+0.3*Math.sin(now/180)*Math.sin(now/530+win.id);
          }
        }
        const state=[ox,oy,w,h,SETTINGS.lights,s.dark.toFixed(2),screenCells.map(p=>+p.on).join(''),storyWindows.map(p=>+p.on).join(''),coreLevel()].join(':');
        if(time-fxLast<100&&state===fxState)return;fxLast=time;fxState=state;
        fxVisible=SETTINGS.lights?fxLights.filter(p=>{
          const margin=p.kind==='lighthouse'?320:64;
          return (!p.screens||p.screens.some(c=>c.on))&&(!p.window||p.window.on)&&p.x>ox-margin&&p.y>oy-margin&&p.x<ox+w+margin&&p.y<oy+h+margin;
        }):[];
        if(!fxRT)return;
        if(fxRT.texture.width!==w||fxRT.texture.height!==h)fxRT.resize(w,h);
        fxRT.setPosition(ox,oy).setVisible(!!SETTINGS.lights);fxRT.clear();
        let count=0;
        for(const tile of fxTiles){
          if(tile.screen&&!tile.screen.on||tile.window&&!tile.window.on)continue;
          if(tile.x<ox-16||tile.y<oy-16||tile.x>ox+w+16||tile.y>oy+h+16)continue;
          const alpha=fxAmount(tile.kind,time)*(tile.window?.level??1);if(alpha<=0)continue;
          fxRT.stamp(fxKey,tile.key,tile.x-ox,tile.y-oy,{alpha,tint:tile.window?.tint??fxStyle[tile.kind][0],scaleX:tile.flipX?-1:1,scaleY:tile.flipY?-1:1,rotation:tile.rotation});
          if(++count>=1024)break;
        }
        // Portal rectangles glow above the night layer with a slow pulse, faint by day.
        const portalAlpha=SETTINGS.lights?(0.10+0.32*(SETTINGS.dayNight?s.dark:0))*(0.8+0.2*Math.sin(time/450)):0;
        if(portalAlpha>0)for(const {rect} of portalPoints){
          if(rect.x+rect.w<ox-16||rect.y+rect.h<oy-16||rect.x>ox+w+16||rect.y>oy+h+16)continue;
          fxRT.stamp('digimmo:light2',undefined,rect.x+rect.w/2-ox,rect.y+rect.h/2-oy,
            {alpha:portalAlpha,tint:0x8fe3ff,scaleX:(rect.w+24)/80,scaleY:(rect.h+24)/80});
        }
        // Dark tower panels: a soft purple halo above the night layer that blinks with the panel frame.
        const coreAlpha=SETTINGS.lights?0.34*(SETTINGS.dayNight?s.dark:0)*coreLevel():0;
        if(coreAlpha>0)for(const point of fxVisible)if(point.kind==='darkCore')
          fxRT.stamp('digimmo:light2',undefined,point.x-ox,point.y-oy,{alpha:coreAlpha,tint:fxStyle.darkCore[0],scaleX:0.55,scaleY:0.38});
        fxRT.render();
      };
      const stampMapLights=(time,ox,oy)=>{
        let count=0;
        for(const point of fxVisible){
          const style=fxStyle[point.kind],alpha=fxAmount(point.kind,time)*(point.window?.level??1);if(alpha<=0)continue;
          nightRT.stamp('digimmo:light2',undefined,Math.round(point.x-ox),Math.round(point.y-oy),
            {tint:point.window?.tint??style[0],scale:style[3],alpha:Math.min(0.55,alpha*1.2),blendMode:ADD});
          if(point.kind==='lighthouse'){
            // One beam from the lamp outward, 260 px long, turning with the lamp animation.
            const angle=beamAngle(time),length=260;
            nightRT.stamp('digimmo:light2',undefined,Math.round(point.x+Math.cos(angle)*length/2-ox),Math.round(point.y+Math.sin(angle)*length/2-oy),
              {tint:style[0],scaleX:length/160,scaleY:0.22,rotation:angle,alpha:0.45*(SETTINGS.dayNight?s.dark:0),blendMode:ADD});
          }
          if(++count>=128)break;
        }
      };
      // Read existing visual projectiles only. The game owns their movement and lifetime.
      const attackLights=new Map(),attackPoint={x:0,y:0};
      const attackColors={fire:0xff7a2a,water:0x3aa0ff,ice:0xaee8ff,wind:0x7af0c0,
        thunder:0xffe04a,wood:0x6ad04a,land:0xc8a060,steel:0xc0c8d0,light:0xfff6a0,dark:0xa060ff,neutral:0xffffff};
      cleanups.push(()=>attackLights.clear());
      let attackFrame=0;
      const stampAttackLights=(time,ox,oy)=>{
        if(!SETTINGS.lights||s.dark<=0){attackLights.clear();return;}
        const frame=++attackFrame;let checked=0,drawn=0;
        const stamp=(sp,color,source)=>{
          if(++checked>96||drawn>=24||!sp||sp.scene!==scene||!sp.active||!sp.visible||sp.alpha<=0||
              sp.parentContainer||typeof sp.getCenter!=='function'||!sp.willRender?.(cam))return;
          sp.getCenter(attackPoint);const x=attackPoint.x,y=attackPoint.y;
          if(!Number.isFinite(x)||!Number.isFinite(y)||x<view.x||y<view.y||x>view.x+view.w||y>view.y+view.h)return;
          let light=attackLights.get(sp);if(light?.frame===frame)return;
          if(!light||light.source!==source){light={born:time,frame,source};attackLights.set(sp,light);}else light.frame=frame;
          const fade=Math.max(0,Math.min(1,(time-light.born)/120));
          const size=Math.max(Math.abs(sp.displayWidth)||0,Math.abs(sp.displayHeight)||0);
          const tint=Number.isInteger(color)&&color>=0&&color<=0xffffff?color:0xfff0d8;
          nightRT.stamp('digimmo:light2',undefined,Math.round(x-ox),Math.round(y-oy),
            {tint,scale:Math.max(0.3,Math.min(0.8,size/80+0.18)),alpha:0.40*s.dark*Math.min(1,sp.alpha)*fade,blendMode:ADD});
          drawn++;
        };
        for(const p of scene.combat?.projectiles||[]){stamp(p.obj,p.color,p);if(checked>=96||drawn>=24)break;}
        if(checked<96&&drawn<24)for(const p of scene.combat?.sig?.casts?.values?.()||[]){stamp(p.proj,p.color,p);if(checked>=96||drawn>=24)break;}
        if(checked<96&&drawn<24)for(const p of scene.telegraphs?.circles||[]){stamp(p.proj?.obj,attackColors[p.skill?.element],p);if(checked>=96||drawn>=24)break;}
        for(const [sp,light] of attackLights)if(light.frame!==frame)attackLights.delete(sp);
        stampInstantBeams(time,ox,oy);
        stampEffectLights(ox,oy);
      };
      // Instant basic-attack tracers have no projectile record: the game stretches one pooled
      // effect sprite between attacker and target and hides it when its animation ends.
      // Their textures and element colours come from the game's attack content.
      let beamKeys=null;
      const instantBeamKeys=(time)=>{
        const content=scene.combat?.deps?.content?.digimon,sprites=scene.combat?.deps?.sprites;
        // Refresh occasionally in case attack content arrives after the map is built.
        if(content&&typeof sprites?.resolve==='function'&&(beamKeys?.source!==content||time-beamKeys.at>10000)){
          beamKeys=new Map();beamKeys.source=content;beamKeys.at=time;
          for(const d of Object.values(content)){
            const basic=d?.basic;if(!basic?.tracerFx||basic.tracerSpeed)continue;
            try{const key=sprites.resolve(basic.tracerFx);if(key)beamKeys.set(key,attackColors[basic.element]??attackColors.neutral);}catch{}
          }
        }
        return beamKeys?.size?beamKeys:null;
      };
      const stampInstantBeams=(time,ox,oy)=>{
        const keys=instantBeamKeys(time),list=scene.children?.list;if(!keys||!list)return;
        let inspected=0,beams=0;
        for(let i=list.length-1;i>=0&&inspected<3000&&beams<8;i--,inspected++){
          const sp=list[i];
          if(sp.type!=='Sprite'||!keys.has(sp.texture?.key)||attackLights.has(sp)||!sp.active||!sp.visible||
              sp.alpha<=0.01||sp.parentContainer||!sp.willRender?.(cam))continue;
          const length=Math.abs(sp.displayWidth)||0;if(length<24)continue;
          const color=keys.get(sp.texture.key),dx=Math.cos(sp.rotation)*length,dy=Math.sin(sp.rotation)*length;
          const points=Math.max(2,Math.min(6,Math.round(length/32)));
          for(let j=0;j<points;j++){
            const u=(j+0.5)/points-0.5,x=sp.x+dx*u,y=sp.y+dy*u;
            if(x<view.x||y<view.y||x>view.x+view.w||y>view.y+view.h)continue;
            nightRT.stamp('digimmo:light2',undefined,Math.round(x-ox),Math.round(y-oy),
              {tint:color,scale:0.4,alpha:0.38*s.dark*Math.min(1,sp.alpha),blendMode:ADD});
          }
          beams++;
        }
        // Sweeping boss beams follow the game's own angle while they sweep; warning bands stay unlit.
        let sweeps=0;const now=performance.now();
        for(const line of scene.mechB?.lines||[]){
          if(sweeps>=4)break;
          const sweep=line?.sweeping&&line.skill?.sweep;if(!sweep)continue;
          const length=Math.hypot(line.tx-line.fx,line.ty-line.fy),half=sweep.arc*Math.PI/360;
          const progress=Math.min(1,(now-line.start)/Math.max(1,line.end-line.start));
          const angle=Math.atan2(line.ty-line.fy,line.tx-line.fx)-half+2*half*progress;
          if(!Number.isFinite(angle)||!(length>0))continue;
          const color=attackColors[line.skill.element]??attackColors.neutral,points=Math.max(2,Math.min(8,Math.round(length/32)));
          for(let j=0;j<points;j++){
            const d=length*(j+0.5)/points,x=line.fx+Math.cos(angle)*d,y=line.fy+Math.sin(angle)*d;
            if(x<view.x||y<view.y||x>view.x+view.w||y>view.y+view.h)continue;
            nightRT.stamp('digimmo:light2',undefined,Math.round(x-ox),Math.round(y-oy),
              {tint:color,scale:0.44,alpha:0.38*s.dark,blendMode:ADD});
          }
          sweeps++;
        }
      };
      // Skill effects (the game's fx_* sprites) mostly sit below the night layer, so the night
      // dimmed them. Redraw each visible one above it, faded in with the darkness, so effects keep
      // their own colours at night; each also lights its surroundings in its own colour.
      const effectRT=own(scene.add.renderTexture(0,0,4,4)).setOrigin(0).setDepth(DEPTH_NIGHT+50).setVisible(false);
      const effectColors=new Map(),visibleEffects=[];let effectCanvas=null;
      const effectColor=(sp)=>{
        const id=sp.texture.key+':'+sp.frame.name;let color=effectColors.get(id);if(color!==undefined)return color;
        color=0xfff0d8;
        try{
          // Brightness-weighted average of the frame, raised to full brightness.
          if(!effectCanvas){effectCanvas=document.createElement('canvas');effectCanvas.width=effectCanvas.height=8;}
          const f=sp.frame,ctx=effectCanvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,8,8);
          ctx.drawImage(f.source.image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,0,0,8,8);
          const d=ctx.getImageData(0,0,8,8).data;let r=0,g=0,b=0,w=0;
          for(let i=0;i<d.length;i+=4){const k=d[i+3]*(d[i]+d[i+1]+d[i+2]);r+=d[i]*k;g+=d[i+1]*k;b+=d[i+2]*k;w+=k;}
          if(w>0){const m=255/Math.max(1,r/w,g/w,b/w);color=(Math.round(r/w*m)<<16)|(Math.round(g/w*m)<<8)|Math.round(b/w*m);}
        }catch{}
        effectColors.set(id,color);return color;
      };
      const drawEffects=(ox,oy,W,H)=>{
        visibleEffects.length=0;
        const dark=SETTINGS.dayNight&&SETTINGS.lights?s.dark:0,list=scene.children?.list;
        if(dark<=0.02||!list){effectRT.setVisible(false);return;}
        for(let i=list.length-1,seen=0;i>=0&&seen<3000&&visibleEffects.length<32;i--,seen++){
          const sp=list[i];
          if((sp.type!=='Sprite'&&sp.type!=='Image')||!(sp.texture?.key||'').startsWith('fx_')||!sp.visible||
              sp.alpha<=0.02||sp.parentContainer||!sp.frame||!sp.willRender?.(cam))continue;
          if(sp.x<view.x-96||sp.y<view.y-96||sp.x>view.x+view.w+96||sp.y>view.y+view.h+96)continue;
          visibleEffects.push(sp);
        }
        const dimmed=visibleEffects.filter(sp=>sp.depth<DEPTH_NIGHT);
        if(!dimmed.length){effectRT.setVisible(false);return;}
        if(effectRT.texture.width!==W||effectRT.texture.height!==H)effectRT.resize(W,H);
        effectRT.setPosition(ox,oy).clear();
        let lowest=Infinity;
        for(const sp of dimmed){
          lowest=Math.min(lowest,sp.depth);
          effectRT.stamp(sp.texture.key,sp.frame.name,sp.x-ox,sp.y-oy,{originX:sp.originX,originY:sp.originY,
            scaleX:sp.scaleX*(sp.flipX?-1:1),scaleY:sp.scaleY*(sp.flipY?-1:1),rotation:sp.rotation,
            alpha:Math.min(1,sp.alpha)*Math.min(1,dark*1.15),tint:sp.isTinted?sp.tintTopLeft:0xffffff,blendMode:sp.blendMode});
        }
        // Characters standing in front of an effect (a charge drawn behind its caster) keep covering it.
        if(scene.views)for(const v of scene.views.values()){
          const c=v?.sprite;if(!drawnSprite(c)||c.depth<=lowest)continue;
          effectRT.stamp(c.texture.key,c.frame.name,c.x-ox,c.y-oy,{originX:c.originX,originY:c.originY,
            scaleX:c.scaleX*(c.flipX?-1:1),scaleY:c.scaleY*(c.flipY?-1:1),rotation:c.rotation,blendMode:ERASE});
        }
        effectRT.render();effectRT.setVisible(true);
      };
      const stampEffectLights=(ox,oy)=>{
        let count=0;
        for(const sp of visibleEffects){
          const w=Math.abs(sp.displayWidth)||0,h=Math.abs(sp.displayHeight)||0;
          // Projectiles already carry a light; stretched instant tracers light along their length.
          if(attackLights.has(sp)||w>h*3)continue;
          sp.getCenter(attackPoint);
          nightRT.stamp('digimmo:light2',undefined,Math.round(attackPoint.x-ox),Math.round(attackPoint.y-oy),
            {tint:effectColor(sp),scale:Math.max(0.3,Math.min(1.4,Math.max(w,h)/90+0.2)),alpha:0.5*s.dark*Math.min(1,sp.alpha),blendMode:ADD});
          if(++count>=24)break;
        }
      };
      // Shared emitters, not one emitter per light. Only on-screen sources emit.
      const detailEmitters=[];
      for(const [kind,points,frequency,tint] of [
        ['phone',phonePoints,950,0xb5e4ff],
        ['portal',portalPoints,160,0x9fdcff],
        ['furnace',fxLights.filter(p=>p.kind==='furnace'),600,0xffad50],
        ['acid',[...acidCells.values()],300,0xa2ed68],
      ]){
        if(!points.length)continue;
        // Portal motes are small soft sparks; the other details keep their single-pixel motes.
        const em=own(scene.add.particles(0,0,kind==='portal'?'digimmo:light2':'digimmo:px',{
          emitting:false,maxParticles:kind==='acid'?12:kind==='portal'?40:24,lifespan:{min:900,max:1800},speedX:{min:-2,max:2},speedY:{min:-9,max:-4},
          alpha:{start:0,end:kind==='acid'?0.7:kind==='portal'?0.9:0.5,ease:sinEase},scale:kind==='portal'?{start:0.03,end:0.012}:1,
          tint,blendMode:ADD,frequency,quantity:1,
        })).setDepth(DEPTH_GLOW);
        detailEmitters.push({em,points,kind,frequency,next:0});
      }
      const smoke=chimneyPoints.length?own(scene.add.particles(0,0,'digimmo:light2',{
        emitting:false,maxParticles:36,lifespan:{min:2600,max:4200},speedX:{min:2,max:7},speedY:{min:-12,max:-7},
        // The soft light texture peaks at 55 % opacity, so the puffs start nearly opaque.
        scale:{start:0.05,end:0.17},alpha:{start:0.85,end:0},tint:0xd2d2d6,frequency:-1,
      })).setDepth(DEPTH_NIGHT-500):null;
      let smokeNext=0;
      const updateSmoke=(time)=>{
        if(!smoke)return;
        smoke.setVisible(true);
        if(time<smokeNext)return;smokeNext=time+380;
        for(const p of chimneyPoints)if(p.x>view.x&&p.x<view.x+view.w&&p.y>view.y-40&&p.y<view.y+view.h)smoke.emitParticleAt(p.x+(Math.random()-0.5)*2,p.y,1);
      };
      const updateDetailParticles=(time)=>{
        for(const entry of detailEmitters){
          const on=SETTINGS.lights&&(entry.kind!=='furnace'||SETTINGS.fireEmbers);
          const dark=SETTINGS.dayNight?s.dark:0;
          entry.em.setVisible(!!on).setAlpha(entry.kind==='phone'?0.2+0.8*dark:entry.kind==='portal'?0.45+0.55*dark:1);
          if(!on||time<entry.next)continue;
          const points=entry.points.filter(p=>p.x>view.x&&p.x<view.x+view.w&&p.y>view.y&&p.y<view.y+view.h);
          entry.next=time+entry.frequency;
          if(!points.length)continue;
          const point=points[Math.floor(Math.random()*points.length)],rect=point.rect;
          if(rect)entry.em.emitParticleAt(rect.x+Math.random()*rect.w,rect.y+rect.h*(0.4+0.6*Math.random()),1);
          else entry.em.emitParticleAt(point.x+(Math.random()-0.5)*12,point.y,1);
        }
      };
      const hideMapEffects=()=>{fxRT?.setVisible(false);effectRT.setVisible(false);attackLights.clear();smoke?.setVisible(false);for(const {em} of detailEmitters)em.setVisible(false);};

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
      if (SETTINGS.weather && SETTINGS.seasons && seasonCfg.tree && treeGroups.length) {
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
          frequency: t.rate / SETTINGS.weatherDensity,
          quantity: 1,
        }));
        leaves.setDepth(DEPTH_NIGHT - 500);
      }

      const reflectionFootY = (sp) => sp.y + (1 - (sp.originY ?? 0.5)) *
        Math.abs(Number(sp.displayHeight) || (sp.frame.height * Math.abs(sp.scaleY || 1)));
      // Only characters the game actually draws get a light or reflection. The game hides
      // flagged and culled characters with visible=false and fades others through alpha.
      const drawnSprite = (sp) => !!sp && sp.visible && sp.alpha > 0.01 && !sp.parentContainer &&
        !!sp.texture && !!sp.frame && (typeof sp.willRender !== 'function' || sp.willRender(cam));
      let reflRT = null, notWater = null;
      const waterSet = new Set(water.map(w => (w.x >> 4) + ',' + (w.y >> 4)));
      const shoreTops = new Map(shores.map(p => [(p.x >> 4) + ',' + (p.y >> 4), p.top]));
      if (SETTINGS.reflections && water.length) {
        // Viewport sized mask, not a full map framebuffer. White erases pixels;
        // transparent water tiles let reflections show through.
        notWater = own(scene.add.renderTexture(0, 0, 4, 4)).setOrigin(0, 0);
        scene.children.remove(notWater);
        reflRT = own(scene.add.renderTexture(0, 0, 4, 4)).setOrigin(0, 0)
          .setDepth(DEPTH_NIGHT - 2000); // Above late foreground water tiles; masked to water only.
      }
      // Pokemon Emerald style: reflect only into water directly below, mirrored downward.
      // Characters move freely, so a figure standing just above the water is mirrored from
      // the shoreline; a mirror at the feet would leave its legs hidden on land.
      const reflectionAnchor = (x, y) => {
        const cx = Math.floor(x / 16), cy = Math.floor((y - 1) / 16), wet = (tx, ty) => waterSet.has(tx + ',' + ty);
        // Top of the reflecting surface: a whole water tile, or the water rows of a shore tile.
        const surface = ty => wet(cx, ty) ? ty * 16 : shoreTops.has(cx + ',' + ty) ? ty * 16 + shoreTops.get(cx + ',' + ty) : null;
        const here = surface(cy), below = surface(cy + 1);
        if (here !== null) return { x, y: Math.max(y + 1, here), flipY: true };
        if (below === null) return null;
        // Narrow piers, bridges and spits with water at both sides are not a shore.
        // Mirror about the feet there: the pier hides the near part and the image
        // in the water beyond stays attached to the figure.
        const narrow = (wet(cx - 1, cy) || wet(cx - 2, cy)) && (wet(cx + 1, cy) || wet(cx + 2, cy));
        return { x, y: narrow ? y : below, flipY: true };
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
        for (const p of shores) {
          if (p.x < ox - 16 || p.y < oy - 16 || p.x > ox + width || p.y > oy + height) continue;
          notWater.erase(p.top ? 'digimmo:waterHoleFrom' + p.top : 'digimmo:waterHole', p.x + 8 - ox, p.y + 8 - oy);
        }
        // Artwork drawn over the water hides the reflection beneath it.
        for (const c of waterCovers) {
          if (c.x < ox - 16 || c.y < oy - 16 || c.x > ox + width || c.y > oy + height) continue;
          notWater.stamp(c.f.key, c.f.name, c.x + 8 - ox, c.y + 8 - oy,
            { scaleX: c.flipX ? -1 : 1, scaleY: c.flipY ? -1 : 1, rotation: c.rotation });
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

        // @development-start
        if (anim || time - lastSky > 2000) {
        // @development-end
        // @public: if (time - lastSky > 2000) {
          lastSky = time;
          s = sky(hourNow());
        }

        for (const em of northSnow) {
          const on = SETTINGS.weather && view.y < snowBottom;
          if (em.emitting !== on) { if (on) em.start(); else em.stop(); }
        }
        updateDetailParticles(time);
        updateSmoke(time);
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
            if (!drawnSprite(sp)) continue;
            const height = Math.abs(Number(sp.displayHeight) || sp.frame.height * (sp.scaleY || 1));
            const footY = reflectionFootY(sp);
            if (sp.x < ox - 48 || sp.x > ox + W + 48 || footY < oy - height || footY > oy + H) continue;
            const anchor = reflectionAnchor(sp.x, footY);
            if (!anchor) continue;
            any = true; candidates++;
            const wobble = Math.round(Math.sin(time / 280 + sp.y / 7) * REFLECT.wobble);
            reflRT.stamp(sp.texture.key, sp.frame.name,
              Math.round(anchor.x - ox + wobble), Math.round(anchor.y - oy), {
                originX: sp.originX ?? 0.5,
                originY: 1,
                scaleX: Math.abs(sp.scaleX || 1) * (sp.flipX ? -1 : 1),
                scaleY: Math.abs(sp.scaleY || 1) * (anchor.flipY ? -1 : 1),
                alpha: REFLECT.alpha * Math.min(1, sp.alpha), tint: REFLECT.tint,
              });
          }
          if (any) reflRT.erase(notWater, 0, 0);
          stats.reflectionCandidates = candidates;
          reflRT.render();
          reflRT.setVisible(any);
        }

        updateMapEffects(time,ox,oy,W,H);
        ambUpdate(time);
        if(!SETTINGS.dayNight||!SETTINGS.lights||s.dark<=0)attackLights.clear();

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
                if (id === scene.ownId || !sp?.active || !drawnSprite(sp)) continue;
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
                  { tint: 0xfff0d8, scale: PLAYER_LIGHT() * 0.55 * size, alpha: glowAlpha * 0.7 * Math.min(1, sp.alpha), blendMode: ADD });
              }
            }
            const p = ownPos();
            const ownSprite = scene.views?.get?.(scene.ownId)?.sprite;
            const ownSize = Math.max(1, Math.min(3, Math.max(Math.abs(Number(ownSprite?.displayHeight) || 32), Math.abs(Number(ownSprite?.displayWidth) || 24)) / 40));
            if (p) nightRT.stamp('digimmo:light2', undefined, Math.round(p.x - ox), Math.round(p.y - 8 - oy),
              { tint: 0xfff0d8, scale: PLAYER_LIGHT() * ownSize, alpha: glowAlpha, blendMode: ADD });
          }
          stampMapLights(time,ox,oy);
          drawEffects(ox,oy,W,H);
          stampAttackLights(time,ox,oy);
          nightRT.render();
        } else effectRT.setVisible(false);
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
          // @development-start
          console.info(tag, 'Atmosphere:', scene.mapId, built?.stats);
          // @development-end
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

    // @development-start
    const PREVIEWS = [null, 6.4, 12, 19.3, 23];
    const cyclePreview = () => {
      const target = anim ? anim.to : preview;
      const i = PREVIEWS.indexOf(target);
      const next = PREVIEWS[(i + 1) % PREVIEWS.length];
      anim = { from: hourNow(), to: next, start: performance.now(), dur: PREVIEW_SECONDS * 1000 };
      return next;
    };
    // @development-end
    return {
      // @development-start
      tick, toggle, destroy, rebuild, cyclePreview,
      // @development-end
      // @public: tick, toggle, destroy, rebuild,
      toggleAmbient: () => { SETTINGS.ambientEnabled = !SETTINGS.ambientEnabled; store(); return SETTINGS.ambientEnabled; },
      get ambient() { return SETTINGS.ambientEnabled; }, set ambient(v) { SETTINGS.ambientEnabled = !!v; },
      get enabled() { return enabled; }, set enabled(v) { enabled = !!v; SETTINGS.atmosphere = enabled; },
      // @development-start
      get preview() { return preview; }, set preview(v) { preview = v; anim = null; },
      // @development-end
      get built() { return built; },
      // @development-start
      diagnostics: () => ({ map: built && built.mapId, stats: built && built.stats,
        ready: !!readyScene, blockedMaps: [...brokenMaps], clouds: built && built.cloudCount,
      }),
      // @development-end
    };
  })();

  const CHANGELOG_ENTRIES = [
  ["0.3.2", "Quest markers on monsters.\n• Monsters you still need for a quest show a gold ! for quests, a blue ! for dailies or the sun for the daily board before their name. Switch it off in F10."],
  ["0.3.1", "A players online counter.\n• An optional counter in the game shows how many players are online. Switch it on in F10 and drag it anywhere."],
  ["0.3", "A start window, living Toy Town windows and glowing dark towers.\n• The desktop client opens with a start window: the game's latest patch notes, players online and links. Turn it off in F10.\n• Client updates download in the start window with a progress bar; Update and play installs them and restarts the client.\n• Skill effects glow at night in their own colours, such as Seraphimon's Seven Heavens.\n• Dark towers in Tower Forest, Kaiser Canyon and Sunset Bay glow purple at night and pulse with their panels.\n• Toy Town windows have residents: most rooms stay dark, others light up for an evening, a late reader, a TV or a night light, and the lights change during the night.\n• The Toy Town castle windows and the locomotive cab window light up.\n• The lanterns by the phone box in Sea of Darkness glow from their glass.\n• If the game stays black after a restart, the client repairs its cache once by itself."],
  ["0.2.2", "Swaying trees in Toy Town and beyond.\n• The redrawn cherry and yard trees in Toy Town sway in the wind again.\n• Snowy firs, bamboo and the cherry and zelkova trees in Highton Terrace and Odaiba now sway too; bamboo bends from its base."],
  ["0.2.1", "Night details, a calmer soundscape and a Linux client.\n• New night lights: the dragon's eye in Machine City, the Factory Town generators (also by day), the Kaiser's Fortress incubators, Sunset Bay's tiki torches and its lighthouse with a turning beam.\n• Hanging pumpkin lamps glow at the pumpkin; Piedmon's castle windows glow more softly.\n• Map exits glow at night with rising sparks.\n• Chimneys in Gate Village smoke in autumn and winter.\n• Water, sea and waterfalls are quieter with less rumble; creeks are softly audible from farther away.\n• Savanna acacias sway without gaps in their crowns.\n• Simpler audio settings: the technical compressor controls are gone.\n• Windows, lights and headlights follow the game's redrawn art in Toy Town, Odaiba, Machine City and Fog City.\n• The new Tamers maps get city or nature ambience, matching weather, car headlights and glowing Hypnos towers.\n• Block piles cast one shadow from their base, and narrow pier ends show a reflection again.\n• New Linux client (AppImage) with automatic updates."],
  ["0.2", "A large atmosphere update: classic water reflections, natural tree movement and many new lights.\n• Water mirrors characters downward at ponds, lakes and beaches.\n• Leaves and crowns sway while trunks stay put; palms bend from the base.\n• Lanterns, candles and windows glow from their flames and glass, with new night lights across the maps.\n• Attacks, skill projectiles and beams cast a matching light at night.\n• Shadows no longer fall across houses and objects.\n• Water sounds at ponds and lakes, regional wind and loudspeaker chatter in Server Desert.\n• Choose real time, a repeating day or a fixed time for the atmosphere.\n• The desktop client shows DigiMMO as your game in Discord."],
  ["0.1.4", "Calmer birds and distant city traffic.\n• Bird calls are quieter and shorter, with longer pauses and varied passages; the continuous bird loop is gone.\n• Distant daytime traffic replaces the repeating city market voices and fades into quiet wind at night."],
  ["0.1.3", "More window lights and a new campfire sound.\n• Windows light up in Fog City, and a few windows and broken panes glow in Machine City at night.\n• South-facing headlights follow the car body.\n• Weather starts at 2x; Network areas have no clouds, and Holy Peaks snow fades past the northern plateau.\n• A new campfire recording with less low rumble; fountains fade out over a shorter distance."],
  ["0.1.2", "Menu fixes for smaller windows.\n• Settings and keyboard shortcut help stay inside the menu on smaller windows."],
  ["0.1", "The first release: light, shadows and ambience.\n• Soft lighting, object shadows, moving treetops and water reflections.\n• Regional day and night ambience with wildlife, fire, fountains and nearby water.\n• Larger Digimon cast wider light, moonlight shadows are softer, and the atmosphere starts as soon as the map is ready."]
];
  const localizedChangelog = () => tr('Changes to the actual game visuals and sounds only.') + '\n\n' +
    CHANGELOG_ENTRIES.map(([version, note]) => 'v' + version + '\n' + tr(note)).join('\n\n');
  const localizedSoundCredits = () =>
    SOUND_CREDITS.map(c => `${c.title} — ${c.author}\n${c.samples}\n${c.license}: ${c.licenseUrl}\n${c.source}\n${tr(c.changes)}`).join('\n\n');
  const MENU_SECTIONS = [
    { title: 'Environment', fields: [
      ['uiLanguage', 'Language', 'select', [['auto', 'Follow game language'], ['en', 'English'], ['es', 'Español'], ['pt', 'Português (Brazil)']]],
      ['launcher', 'Start window', 'check', 'Shows game updates and players online when the client starts.'],
      ['onlineBadge', 'Players online', 'check', 'Shows how many players are online. Drag it anywhere.'],
      ['questMarks', 'Quest markers', 'check', 'Marks monsters you still need: a gold ! for quests, a blue ! for dailies and the sun for the daily board.'],
      ['attackMacro', 'Attack picks a target', 'check', 'Basic attack without a living target first selects the nearest enemy, in the same press.'],
      ['atmosphere', 'Enable atmosphere', 'check', 'Toggle all atmosphere effects and ambient sounds'],
      ['weather', 'Regional weather', 'check'],
      ['weatherDensity', 'Weather density', 'range', 0.1, 3, 0.1, '×'],
      ['seasons', 'Seasonal effects', 'check'],
      ['season', 'Season', 'select', [['auto', 'Automatic'], ['spring', 'Spring'], ['summer', 'Summer'], ['autumn', 'Autumn'], ['winter', 'Winter']], 'Forest foliage particles appear only in spring and autumn. Summer has no falling autumn leaves; winter can add light snow. Seasons do not recolor the map textures.'],
      ['fireflies', 'Fireflies', 'check'],
    ] },
    { title: 'Sky and lighting', fields: [
      ['dayNight', 'Day and night cycle', 'check'],
      ['timeMode', 'Atmosphere clock', 'select', [['system', 'Real time'], ['cycle', 'Repeating day'], ['fixed', 'Fixed time']], 'Real time follows your computer clock. Only affects lighting, shadows and ambience.'],
      ['dayMinutes', 'Day length', 'range', 5, 240, 5, ' min'],
      ['fixedTime', 'Time of day', 'time'],
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
      ['livelySprites', 'Livelier Paladin Mode', 'check', 'Wing beats, a moving tail in every direction and enhanced sword attacks for Imperialdramon Paladin Mode.'],
    ] },
  ];
  const SOUND_SECTIONS = [
    { title: 'Game audio adjustments', fields: [
      ['audioFix', 'Enable audio adjustments', 'check', 'Restart the game to apply this change'],
      ['stepGain', 'Footstep volume', 'range', 0, 2, 0.05, '×'],
    ] },
    { title: 'Ambient soundscape', fields: [
      ['ambientEnabled', 'Enable ambience', 'check', 'Separate from the game music and sound effect volume controls'],
      ['ambientVolume', 'Master ambience volume', 'range', 0, 1.5, 0.05, '×'],
    ] },
  ];
  const RESTART_FIELDS = new Set(['audioFix']);
  const LIVE_FIELDS = new Set(['launcher', 'onlineBadge', 'questMarks', 'attackMacro', 'livelySprites', 'stepGain', 'ambientEnabled', 'ambientVolume',
    'ambientWind', 'ambientBirds', 'ambientCrickets', 'ambientFire', 'ambientWater', 'ambientWaves']);
  const KEYBOARD_HELP = "F10 or Ctrl+Shift+O: open or close settings.\nAlt+F10: toggle atmosphere and ambient sounds.\nCtrl+F10: toggle only ambient sounds.\nEscape: close settings.";
  // @development-start
  const DEVELOPMENT_HELP = "Development only: Shift+F10 cycles the selected clock, morning, noon, evening and night with a six second transition. Ctrl+Alt+P shows diagnostic counts.";
  // @development-end
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
  const tellClient = () => { try { CLIENT?.launcherPreferences({ show: SETTINGS.launcher, language: currentLanguage() }); } catch {} };
  const updateSetting = (name, value, commit = true) => {
    SETTINGS[name] = accepted(name, value);
    if (name === 'timeMode' && SETTINGS.timeMode === 'cycle' && SETTINGS.dayMinutes < 5) SETTINGS.dayMinutes = 60;
    // @development-start
    if (['timeMode', 'fixedTime', 'dayMinutes'].includes(name)) ATMOS.preview = null;
    // @development-end
    store();
    if (name === 'uiLanguage' || name === 'launcher') tellClient();
    if (name === 'uiLanguage' || name === 'onlineBadge') onlineBadge.sync();
    if (name === 'uiLanguage' || name === 'uiAdvanced') { if (menuRoot && name === 'uiLanguage') renderTab(); return; }
    if (name === 'atmosphere') {
      ATMOS.enabled = SETTINGS.atmosphere;
      if (commit) queueRebuild();
    } else if (RESTART_FIELDS.has(name)) {
      reloadNeeded = true;
      const el = document.getElementById('digimmo-reload');
      if (el) el.hidden = false;
    } else if (!LIVE_FIELDS.has(name) && commit) queueRebuild();
    if ((name === 'timeMode' || name === 'dayNight') && menuRoot) renderTab();
  };
  const MAIN_SETTINGS = new Set(['uiLanguage', 'launcher', 'onlineBadge', 'questMarks', 'attackMacro', 'atmosphere', 'dayNight',
    'timeMode', 'dayMinutes', 'fixedTime', 'season', 'clouds', 'ambientEnabled', 'ambientVolume']);
  const makeFields = (parent, groups) => {
    const main = document.createElement('section'); main.className = 'digimmo-section';
    const title = document.createElement('h3'); title.textContent = tr('Settings'); main.append(title);
    const advanced = document.createElement('section'); advanced.className = 'digimmo-section';
    const advancedTitle = document.createElement('h3'); advancedTitle.textContent = tr('Advanced settings'); advanced.append(advancedTitle);
    for (const group of groups) {
      for (const field of group.fields) {
        const [key, label, type, a, b, step, suffix, note] = field;
        if ((key === 'dayMinutes' && SETTINGS.timeMode !== 'cycle') || (key === 'fixedTime' && SETTINGS.timeMode !== 'fixed')) continue;
        if (key === 'launcher' && !CLIENT) continue;
        const isMain = MAIN_SETTINGS.has(key);
        if (!isMain && !SETTINGS.uiAdvanced) continue;
        const row = document.createElement('label'); row.className = 'digimmo-row';
        const labelEl = document.createElement('span'); labelEl.textContent = tr(label);
        const control = document.createElement('span'); control.className = 'digimmo-control';
        const input = document.createElement(type === 'select' ? 'select' : 'input');
        input.id = 'digimmo-' + key;
        if (['timeMode', 'dayMinutes', 'fixedTime'].includes(key)) input.disabled = !SETTINGS.dayNight;
        if (type === 'check') { input.type = 'checkbox'; input.checked = SETTINGS[key]; }
        if (type === 'range') {
          input.type = 'range'; input.min = a; input.max = b; input.step = step; input.value = SETTINGS[key];
          const out = document.createElement('output'); out.textContent = String(SETTINGS[key]) + (suffix || '');
          input.addEventListener('input', () => { out.textContent = input.value + (suffix || ''); updateSetting(key, Number(input.value), false); });
          input.addEventListener('change', () => updateSetting(key, Number(input.value), true));
          control.append(input, out);
        } else if (type === 'time') {
          const formatted = () => String(Math.floor(SETTINGS[key] / 60)).padStart(2, '0') + ':' + String(SETTINGS[key] % 60).padStart(2, '0');
          input.type = 'time'; input.step = 60; input.value = formatted();
          input.addEventListener('change', () => {
            if (!/^\d{2}:\d{2}$/.test(input.value)) { input.value = formatted(); return; }
            const [hours, minutes] = input.value.split(':').map(Number);
            updateSetting(key, hours * 60 + minutes);
          });
          control.append(input);
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
      #digimmo-panel input[type=time]{width:100%;padding:5px;background:#172e54;color:#fff;border:2px solid #607eaf;font:inherit;color-scheme:dark}
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
      tellClient();
      onlineBadge.sync();
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
    const info = document.createElement('div'); info.textContent = tr(CHANGELOG_ENTRIES[0][1]).split('\n')[0]; // headline only
    const button = document.createElement('button'); button.textContent = tr('View changes');
    button.addEventListener('click', () => { box.remove(); openMenu('changelog'); });
    box.append(label, info, button); document.body.append(box);
    setTimeout(() => box.remove(), 6500);
  };
  const startUI = () => { initMenu(); announceVersion(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startUI, { once: true });
  else startUI();

  // @development-start
  const NAMES = { null: 'Atmosphere clock', 6.4: 'Morning', 12: 'Noon', 19.3: 'Evening', 23: 'Night' };
  // @development-end
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
    // @development-start
    if (e.repeat) return;
    // @development-end
    // @public: if (e.repeat || (e.shiftKey && !backupShortcut)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (backupShortcut) { toggleMenu(); return; }
    if (e.ctrlKey) { const on = ATMOS.toggleAmbient(); toast(tr('Ambient sounds') + ': ' + tr(on ? 'on' : 'off')); }
    // @development-start
    else if (e.shiftKey) { const p = ATMOS.cyclePreview(); toast(tr('Time of day') + ': ' + tr(NAMES[p])); }
    // @development-end
    else if (e.altKey) { const on = ATMOS.toggle(); if (menuRoot && !menuRoot.hidden) renderTab(); toast(tr('Atmosphere') + ': ' + tr(on ? 'on' : 'off')); }
    else toggleMenu();
  }, true);


  // @development-start
  // ---- Test build only: read-only status readout (Ctrl+Alt+P), not for release ----
  (() => {
    let panel = null, refresh = 0;
    const show = () => {
      if (!panel) {
        panel = document.createElement('pre');
        panel.style.cssText = 'position:fixed;left:8px;top:200px;z-index:2147483640;margin:0;padding:8px;background:rgba(0,0,0,.85);color:#fff;font:14px/1.4 Consolas,monospace;pointer-events:none;white-space:pre';
        document.body.append(panel);
      } else if (!panel.hidden) { panel.hidden = true; clearInterval(refresh); refresh = 0; return; }
      // The refresh timer runs only while the readout is visible.
      panel.hidden = false; render();
      refresh ||= setInterval(render, 500);
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

  // @development-end
  // Observe readiness on each animation frame. No settling timer is needed:
  // map identity, loading state and the recreated sprite are the actual guards.
  const atmosphereFrame = () => {
    ATMOS.tick();
    requestAnimationFrame(atmosphereFrame);
  };
  requestAnimationFrame(atmosphereFrame);
  // Once the game has settled on its language, the start window follows it at the next client start.
  if (CLIENT) setTimeout(tellClient, 5000);
  // Optional players online badge (F10, off by default). While shown it reads the game's public status every
  // 30 s; drag it anywhere and the spot is remembered. Events on the badge do not reach the game.
  const onlineBadge = (() => {
    const KEY = 'digimmo.client.onlineBadge';
    let badge = null, timer = null, health = null, failed = false;
    const place = (x, y) => {
      const w = badge.offsetWidth || 100, h = badge.offsetHeight || 24;
      badge.style.left = Math.max(0, Math.min(innerWidth - w, x)) + 'px';
      badge.style.top = Math.max(0, Math.min(innerHeight - h, y)) + 'px';
    };
    const render = () => {
      if (!badge) return;
      const online = Number(health?.online ?? health?.capacity?.online);
      badge.dataset.state = failed ? 'down' : !health ? '' : health.drain?.on ? 'warn' : 'ok';
      badge.querySelector('b').textContent = !failed && Number.isFinite(online) ? String(online) : '–';
      badge.querySelector('span').textContent = tr('online');
      badge.title = failed ? tr('Server status unavailable') : tr('Players online') +
        (health?.capacity?.max ? ' · ' + tr('capacity') + ' ' + health.capacity.max : '') + (health?.drain?.on ? ' · ' + tr('maintenance') : '');
    };
    const refresh = async () => {
      try { health = await (await fetch('/api/health', { cache: 'no-store' })).json(); failed = false; }
      catch { failed = true; }
      render();
    };
    const create = () => {
      const style = document.createElement('style');
      style.textContent = `#digimmo-online{position:fixed;z-index:2147483644;display:flex;align-items:center;gap:6px;padding:4px 10px;
        background:#0c1734e6;color:#eaf1ff;border:2px solid #e8c46b;box-shadow:0 0 0 2px #142850;font:bold 13px 'Courier New',monospace;
        cursor:grab;user-select:none;touch-action:none}#digimmo-online[hidden]{display:none!important}#digimmo-online b{color:#ffe198}
        #digimmo-online i{width:8px;height:8px;border-radius:50%;background:#7a86a8}#digimmo-online[data-state=ok] i{background:#5ee08a}
        #digimmo-online[data-state=warn] i{background:#f5c542}#digimmo-online[data-state=down] i{background:#ff6b6b}
        #digimmo-online.dragging{cursor:grabbing}`;
      badge = document.createElement('div'); badge.id = 'digimmo-online';
      badge.append(document.createElement('i'), document.createElement('b'), document.createElement('span'));
      document.head.append(style); document.body.append(badge);
      render();
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(KEY)); } catch {}
      place(Number.isFinite(saved?.x) ? saved.x : innerWidth - 150, Number.isFinite(saved?.y) ? saved.y : 70);
      let drag = null;
      badge.addEventListener('pointerdown', e => {
        e.stopPropagation(); e.preventDefault();
        drag = { dx: e.clientX - badge.offsetLeft, dy: e.clientY - badge.offsetTop };
        badge.setPointerCapture(e.pointerId); badge.classList.add('dragging');
      });
      badge.addEventListener('pointermove', e => { if (drag) { e.stopPropagation(); place(e.clientX - drag.dx, e.clientY - drag.dy); } });
      const drop = e => {
        if (!drag) return;
        e.stopPropagation(); drag = null; badge.classList.remove('dragging');
        try { localStorage.setItem(KEY, JSON.stringify({ x: badge.offsetLeft, y: badge.offsetTop })); } catch {}
      };
      badge.addEventListener('pointerup', drop); badge.addEventListener('pointercancel', drop);
      for (const type of ['click', 'dblclick', 'mousedown', 'mouseup', 'wheel', 'contextmenu']) badge.addEventListener(type, e => e.stopPropagation());
      addEventListener('resize', () => { if (!badge.hidden) place(badge.offsetLeft, badge.offsetTop); });
    };
    // Show or hide with the setting; also refreshes the language. No requests while it is off.
    const sync = () => {
      if (!document.body) return;
      if (!SETTINGS.onlineBadge) { clearInterval(timer); timer = null; if (badge) badge.hidden = true; return; }
      if (!badge) create();
      badge.hidden = false;
      place(badge.offsetLeft, badge.offsetTop);
      render();
      if (!timer) { refresh(); timer = setInterval(refresh, 30000); }
    };
    return { sync };
  })();
  if (document.body) onlineBadge.sync(); else document.addEventListener('DOMContentLoaded', onlineBadge.sync, { once: true });
  // Quest markers (F10, on by default): before the name of a monster that an active quest, daily or daily board
  // contract still needs (to defeat it or to collect an item it drops), a gold "!" for quests, a blue "!" for dailies
  // and the game's own sun icon for the daily board. Read only from the game's own quest data and progress; the
  // game's name plates are never changed.
  const questMarks = (() => {
    const COLORS = { quest: 0xffd84a, daily: 0x76cef0 }, ORDER = ['quest', 'daily', 'board'];
    // The sun the game's quest tracker shows for daily board contracts (10 by 9 pixels, its own palette).
    const SUN = ['....a.....', '.a..a..a..', '..abbba...', '..bcccb...', 'aabcccbaa.', '..bcccb...', '..abbba...', '.a..a..a..', '....a.....'];
    const sunTexture = () => {
      const key = 'digimmo:boardSun';
      if (!scene.textures.exists(key)) {
        const canvas = document.createElement('canvas'), palette = { a: '#eeb018', b: '#f2ce3e', c: '#fff4a4' };
        canvas.width = 10; canvas.height = 9;
        const ctx = canvas.getContext('2d');
        SUN.forEach((row, y) => [...row].forEach((p, x) => { if (palette[p]) { ctx.fillStyle = palette[p]; ctx.fillRect(x, y, 1, 1); } }));
        scene.textures.addCanvas(key, canvas);
      }
      return key;
    };
    const MOB = 2, DEAD = 2, HIDDEN = 64;
    // The game's own test for one-time story quests; its other quests repeat daily (shown blue at their givers).
    const oneTime = id => /^q(\d\d[a-z]?)?_/.test(id) || /^a[23](_\d\d[a-z]?|q)_/.test(id);
    let scene = null, lastQuests = null, lastContent = null, wanted = new Map();
    const marks = new Map(), drops = new Map();
    // Monsters that can drop an item, as the game's quest tracker finds them.
    const dropSources = (content, itemId) => {
      if (drops.has(itemId)) return drops.get(itemId);
      const found = new Set();
      for (const d of Object.values(content.digimon || {})) if (d?.mob?.drops?.some(x => x.itemId === itemId && x.chance > 0)) found.add(d.id);
      for (const spawn of Object.values(content.spawns || {})) {
        for (const zone of Object.values(spawn?.zones || {})) for (const entry of zone?.entries || []) if (entry.drops?.some(x => x.itemId === itemId)) found.add(entry.species);
        for (const boss of spawn?.bosses || []) if (boss.drops?.some(x => x.itemId === itemId)) found.add(boss.species);
      }
      drops.set(itemId, [...found]);
      return drops.get(itemId);
    };
    const compute = (content, quests) => {
      const next = new Map();
      for (const [id, state] of Object.entries(quests || {})) {
        if (state?.state !== 1) continue;
        const story = content.quests?.[id], contract = story ? null : content.dailyById?.[id.split('#')[0]];
        const kind = story ? (oneTime(id) ? 'quest' : 'daily') : contract ? 'board' : null;
        if (!kind) continue;
        (story || contract).objectives?.forEach((goal, i) => {
          if (!goal || (state.counters?.[i] ?? 0) >= goal.count) return;
          const species = goal.kind === 'kill' ? [goal.species].flat() : goal.kind === 'collect' ? dropSources(content, goal.itemId) : [];
          for (const sp of species) if (sp && (!next.has(sp) || ORDER.indexOf(kind) < ORDER.indexOf(next.get(sp)))) next.set(sp, kind);
        });
      }
      return next;
    };
    const clear = () => { for (const mark of marks.values()) { try { mark.destroy(); } catch {} } marks.clear(); };
    const update = () => {
      if (!SETTINGS.questMarks || !scene?.views) { clear(); return; }
      let content = null;
      for (const view of scene.views.values()) if ((content = view.ctx?.content)) break;
      let quests = null;
      try { quests = window.dmo?.store?.getState?.()?.me?.quests; } catch {}
      if (!content) { clear(); return; }
      if (content !== lastContent) drops.clear();
      if (quests !== lastQuests || content !== lastContent) { wanted = compute(content, quests); lastQuests = quests; lastContent = content; }
      const shown = new Set();
      if (wanted.size) for (const view of scene.views.values()) {
        const kind = view.kind === MOB && !(view.flags & (DEAD | HIDDEN)) ? wanted.get(view.defId) : null;
        const plate = view.plate;
        if (!kind || !plate?.active || typeof plate.font !== 'string') continue;
        const sun = kind === 'board';
        let mark = marks.get(view);
        if (!mark || !mark.active || (mark.type === 'Image') !== sun) {
          if (mark) { try { mark.destroy(); } catch {} }
          mark = sun ? scene.add.image(0, 0, sunTexture()).setOrigin(1, 1) : scene.add.bitmapText(0, 0, plate.font, '!', plate.fontSize || 8).setOrigin(1, 1);
          marks.set(view, mark);
        }
        if (!sun) mark.setTint(COLORS[kind]);
        const left = view.eliteMark?.visible ? view.eliteMark.x : plate.x;
        mark.setDepth(plate.depth).setPosition(Math.round(left - 2), plate.y + (sun ? 1 : 0))
          .setAlpha(plate.alpha).setVisible(!!plate.visible && !!plate.text);
        shown.add(view);
      }
      for (const [view, mark] of marks) if (!shown.has(view)) { try { mark.destroy(); } catch {} marks.delete(view); }
    };
    // Follow the world scene after the game has placed its name plates for the frame.
    const attach = () => {
      let next = null;
      try { next = window.dmo?.game?.scene?.getScene?.('world') || null; } catch {}
      if (next !== scene) {
        try { scene?.events?.off('postupdate', update); } catch {}
        clear(); scene = next; lastQuests = lastContent = null;
        if (scene) { scene.events.on('postupdate', update); scene.events.once('shutdown', () => { clear(); lastQuests = lastContent = null; }); }
      }
    };
    setInterval(attach, 1000);
    return { update };
  })();
  // Livelier Imperialdramon Paladin Mode (F10 advanced, on by default). Its game idle and walk animations are one
  // pose moved up and down by up to 4 px. From that pose the client draws 8 frames per direction in which the wings
  // beat from the shoulders, the tail sways in all four directions and a light runs down the blade. Combat poses
  // gain anticipation, a directional follow-through and a short blade trail, keeping their original timings.
  // The four base poses must match their pixel fingerprints and every
  // idle/walk frame must be that shifted pose, so redrawn artwork is left alone. Regions are pixel areas of the
  // 224 px frames; blue parts in front of a wing
  // (tail, arm guard) and the sword in the back view stay in place while the wing moves behind them. The game's
  // atlas stores identical frames once (frame 1 and 7, idle and walk share a place), so the new frames are drawn
  // into their own area below the sheet and those frames are pointed there.
  (() => {
    const KEY = 'imperialdramon_paladin', SIZE = 224, BOB = [0, 1, 2, 3, 4, 3, 2, 1];
    const WING = 10 * Math.PI / 180;
    const POSE_HASHES = { down: 1920746719, left: 2192349647, right: 3738600876, up: 1277938536 };
    const COMBAT_HASHES = {"attack_down_0":2078000106,"attack_down_1":1019545296,"attack_down_2":1920746719,"attack_left_0":2790544356,"attack_left_1":2555183661,"attack_left_2":2192349647,"attack_right_0":897393937,"attack_right_1":3515321617,"attack_right_2":2114825858,"attack_right_3":3738600876,"attack_up_0":2613169361,"attack_up_1":3535461773,"attack_up_2":1277938536,"skill_down_0":2078000106,"skill_down_1":1513458862,"skill_down_2":3377241467,"skill_left_0":2790544356,"skill_left_1":1207326692,"skill_left_2":2952366150,"skill_right_0":897393937,"skill_right_1":3871470865,"skill_right_2":2123482390,"skill_up_0":2613169361,"skill_up_1":2989644098,"skill_up_2":3535461773,"sig_omega_blade_down_0":2078000106,"sig_omega_blade_down_1":1370529454,"sig_omega_blade_down_2":1513458862,"sig_omega_blade_down_3":1532918446,"sig_omega_blade_down_4":220948654,"sig_omega_blade_down_5":1532918446,"sig_omega_blade_down_6":3377241467,"sig_omega_blade_down_7":1920746719,"sig_omega_blade_left_0":2790544356,"sig_omega_blade_left_1":1365726692,"sig_omega_blade_left_2":1207326692,"sig_omega_blade_left_3":2449562084,"sig_omega_blade_left_4":931683300,"sig_omega_blade_left_5":2449562084,"sig_omega_blade_left_6":2952366150,"sig_omega_blade_left_7":2192349647,"sig_omega_blade_right_0":897393937,"sig_omega_blade_right_1":3515321617,"sig_omega_blade_right_2":3871470865,"sig_omega_blade_right_3":355228945,"sig_omega_blade_right_4":4240885009,"sig_omega_blade_right_5":355228945,"sig_omega_blade_right_6":2123482390,"sig_omega_blade_right_7":3738600876,"sig_omega_blade_up_0":3634281304,"sig_omega_blade_up_1":2103176256,"sig_omega_blade_up_2":2989644098,"sig_omega_blade_up_3":3071352642,"sig_omega_blade_up_4":2732844354,"sig_omega_blade_up_5":3071352642,"sig_omega_blade_up_6":3535461773,"sig_omega_blade_up_7":1277938536};
    const poseHash = pixels => {
      let hash = 2166136261;
      for (let i = 0; i < pixels.length; i += 4)
        for (let c = 0; c < 4; c++) hash = Math.imul(hash ^ (pixels[i + 3] ? pixels[i + c] : 0), 16777619);
      return hash >>> 0;
    };
    const REGIONS = {"down":{"wingL":{"p":[88,110,92,118,84,130,78,142,74,154,70,168,64,186,58,196,44,194,38,164,46,136,64,118],"c":[86,134],"s":1},"wingR":{"p":[139,112,146,120,152,130,158,144,164,162,168,194,158,198,150,178,148,162,149,140,141,124],"c":[126,134],"s":-1},"blade":{"p":[129,164,141,164,141,216,129,216]}},"left":{"wing":{"p":[132,110,141,112,153,119,167,137,179,155,186,176,182,188,170,192,158,192,150,180,146,168,139,160,138,146,138,124],"c":[138,134],"s":-1},"blade":{"p":[88,154,100,154,100,214,88,214]}},"right":{"wing":{"p":[92,110,103,113,101,124,92,132,89,146,85,160,79,172,70,187,58,192,44,190,38,172,47,146,65,123,83,111],"c":[92,136],"s":1},"blade":{"p":[128,154,139,154,139,212,128,212]}},"up":{"wingL":{"p":[96,112,100,122,98,136,96,150,90,164,82,176,66,184,56,180,56,160,66,136,82,118],"c":[100,138],"s":1,"a":0.7,"x":[63,118,78,118,78,216,63,216]},"wingR":{"p":[124,110,134,114,150,130,164,152,172,172,170,196,160,196,150,180,140,168,130,158,124,146,122,124],"c":[122,138],"s":-1},"blade":{"p":[65,164,77,164,77,214,65,214]}}};
    let patched = null, original = null;
    const inside = (p, x, y) => {
      let c = false;
      for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2)
        if ((p[i + 1] > y) !== (p[j + 1] > y) && x < (p[j] - p[i]) * (y - p[i + 1]) / (p[j + 1] - p[i + 1]) + p[i]) c = !c;
      return c;
    };
    const blue = (d, i) => {
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (!max || max - min < 0.5 * max || max !== b) return false;
      const hue = 60 * (4 + (r - g) / (max - min));
      return hue >= 200 && hue <= 240;
    };
    // The tail is the largest connected blue area below the shoulders. Include its dark outline,
    // keep the root fixed, and bend each scanline: no holes from forward rotation or detached tip.
    const swayTail = (out, phase, amplitude = 10) => {
      const src = new Uint8ClampedArray(out), seen = new Uint8Array(SIZE * SIZE);
      let tail = [];
      for (let y = 155; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        const i = y * SIZE + x;
        if (seen[i] || !src[i * 4 + 3] || !blue(src, i * 4)) continue;
        const component = [i]; seen[i] = 1;
        for (let q = 0; q < component.length; q++) {
          const at = component[q], ax = at % SIZE, ay = (at / SIZE) | 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = ax + dx, ny = ay + dy, n = ny * SIZE + nx;
            if (nx < 0 || nx >= SIZE || ny < 155 || ny >= SIZE || seen[n] || !src[n * 4 + 3] || !blue(src, n * 4)) continue;
            seen[n] = 1; component.push(n);
          }
        }
        if (component.length > tail.length) tail = component;
      }
      if (tail.length < 20) return;
      const mask = new Uint8Array(SIZE * SIZE);
      for (const i of tail) {
        const x = i % SIZE, y = (i / SIZE) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy, n = ny * SIZE + nx;
          if (nx >= 0 && nx < SIZE && ny >= 155 && ny < SIZE && src[n * 4 + 3] &&
            (blue(src, n * 4) || Math.max(src[n * 4], src[n * 4 + 1], src[n * 4 + 2]) < 100)) mask[n] = 1;
        }
      }
      const top = Math.max(155, Math.min(...tail.map(i => (i / SIZE) | 0)) - 1), bottom = Math.min(SIZE - 1, Math.max(...tail.map(i => (i / SIZE) | 0)) + 1);
      // Recover only the covered background, never fill the vacated outer contour of a wing.
      for (let y = top; y <= bottom; y++) for (let x = 0; x < SIZE; x++) {
        const i = y * SIZE + x;
        if (!mask[i]) continue;
        let left = x - 1, right = x + 1;
        while (left >= 0 && mask[y * SIZE + left]) left--;
        while (right < SIZE && mask[y * SIZE + right]) right++;
        const l = (y * SIZE + left) * 4, r = (y * SIZE + right) * 4;
        out[i * 4 + 3] = 0;
        if (left >= 0 && right < SIZE && src[l + 3] && src[r + 3]) {
          const from = x - left <= right - x ? l : r;
          for (let c = 0; c < 4; c++) out[i * 4 + c] = src[from + c];
        }
      }
      for (let y = top; y <= bottom; y++) {
        const t = Math.max(0, Math.min(1, (y - top - 8) / Math.max(1, bottom - top - 8)));
        const shift = Math.round(amplitude * Math.sin(phase - t * 0.9) * t * t);
        for (let x = 0; x < SIZE; x++) {
          const i = y * SIZE + x, nx = x + shift, n = (y * SIZE + nx) * 4;
          if (!mask[i] || nx < 0 || nx >= SIZE) continue;
          // White/gold armor stays in front; the blue tail can pass over the grey wing behind it.
          const greyWing = Math.max(out[n], out[n + 1], out[n + 2]) < 190 && Math.max(out[n], out[n + 1], out[n + 2]) - Math.min(out[n], out[n + 1], out[n + 2]) < 35;
          if (!out[n + 3] || mask[y * SIZE + nx] || greyWing || !shift)
            for (let c = 0; c < 4; c++) out[n + c] = src[i * 4 + c];
        }
      }
    };
    const combatFrame = (src, direction, kind, k, length) => {
      const out = new Uint8ClampedArray(src), special = kind === 'sig_omega_blade';
      const strike = k === (kind === 'skill' ? length - 1 : length - 2);
      const recover = kind !== 'skill' && k === length - 1;
      const charge = special && k > 0 && k < length - 2;
      swayTail(out, k * 1.2 + (strike ? 1.4 : 0), strike ? 14 : 10);
      const layer = document.createElement('canvas'); layer.width = layer.height = SIZE;
      layer.getContext('2d').putImageData(new ImageData(out, SIZE, SIZE), 0, 0);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = SIZE;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.imageSmoothingEnabled = false;
      const sign = direction === 'left' || direction === 'up' ? -1 : 1;
      const lean = recover ? 0 : strike ? sign * 0.065 : charge ? sign * Math.sin(k * 1.3) * 0.018 : -sign * 0.035;
      const dx = strike ? sign * 3 : recover ? 0 : -sign;
      const dy = charge ? -Math.round(2 * Math.sin(k * Math.PI / 5)) : strike ? 2 : recover ? 0 : -1;
      ctx.translate(112 + dx, 177 + dy); ctx.rotate(lean); ctx.translate(-112, -177); ctx.drawImage(layer, 0, 0);
      // A short, tapered light ribbon follows the swing; it is painted behind the original blade/body.
      if (strike) {
        const left = direction === 'left' || direction === 'up';
        const start = direction === 'down' ? [106, 75] : direction === 'up' ? [123, 75] : direction === 'left' ? [114, 43] : [132, 46];
        const tip = direction === 'down' ? [kind === 'attack' ? 168 : 173, 210] : direction === 'up' ? [32, 208] : direction === 'left' ? [39, 211] : [kind === 'attack' ? 202 : 192, 207];
        const control = [left ? tip[0] - 13 : tip[0] + 13, 123];
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = special ? 'rgba(174,228,255,0.72)' : 'rgba(255,225,145,0.62)';
        ctx.beginPath();
        ctx.moveTo(...start); ctx.quadraticCurveTo(...control, ...tip);
        ctx.quadraticCurveTo(control[0] + (left ? 16 : -16), control[1] + 12, ...start);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,251,222,0.88)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(...start); ctx.quadraticCurveTo(...control, ...tip); ctx.stroke();
      }
      return ctx.getImageData(0, 0, SIZE, SIZE);
    };
    const maskOf = (name, spec, src) => {
      const mask = new Uint8Array(SIZE * SIZE), xs = spec.p.filter((_, i) => i % 2 === 0), ys = spec.p.filter((_, i) => i % 2);
      for (let y = Math.max(0, Math.min(...ys)); y < Math.min(SIZE, Math.max(...ys) + 1); y++)
        for (let x = Math.max(0, Math.min(...xs)); x < Math.min(SIZE, Math.max(...xs) + 1); x++) {
          if (!inside(spec.p, x + 0.5, y + 0.5) || (spec.x && inside(spec.x, x + 0.5, y + 0.5))) continue;
          if (name.startsWith('wing') && src[(y * SIZE + x) * 4 + 3] && blue(src, (y * SIZE + x) * 4)) continue;
          mask[y * SIZE + x] = 1;
        }
      return mask;
    };
    // Turn a region about its pivot; the angle grows from nothing near the root to the full angle at the tip.
    const bend = (out, src, mask, spec, angle) => {
      const [px, py] = spec.c;
      let far = 1, x0 = SIZE, y0 = SIZE, x1 = 0, y1 = 0;
      for (let i = 0; i < mask.length; i++) if (mask[i]) {
        const x = i % SIZE, y = (i / SIZE) | 0;
        far = Math.max(far, Math.hypot(x - px, y - py)); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        out[i * 4 + 3] = 0;
      }
      const pad = Math.ceil(2 * far * Math.sin(Math.abs(angle) / 2)) + 1;
      for (let y = Math.max(0, y0 - pad); y <= Math.min(SIZE - 1, y1 + pad); y++)
        for (let x = Math.max(0, x0 - pad); x <= Math.min(SIZE - 1, x1 + pad); x++) {
          const w = Math.max(0, Math.min(1, (Math.hypot(x - px, y - py) - 6) / (far - 6))), a = -angle * w * w;
          const sx = Math.round(px + (x - px) * Math.cos(a) - (y - py) * Math.sin(a)), sy = Math.round(py + (x - px) * Math.sin(a) + (y - py) * Math.cos(a));
          if (sx < 0 || sy < 0 || sx >= SIZE || sy >= SIZE || !mask[sy * SIZE + sx] || !src[(sy * SIZE + sx) * 4 + 3]) continue;
          const t = (y * SIZE + x) * 4;
          if (out[t + 3] === 0 || mask[y * SIZE + x]) for (let c = 0; c < 4; c++) out[t + c] = src[(sy * SIZE + sx) * 4 + c];
        }
    };
    const shimmer = (out, spec, k) => {
      const ys = spec.p.filter((_, i) => i % 2), top = Math.min(...ys), bottom = Math.max(...ys);
      const centre = top + (bottom - top + 12) * k / 8 - 6;
      for (let y = top; y < bottom; y++) {
        const t = Math.max(0, 1 - Math.abs(y - centre) / 4);
        if (!t) continue;
        for (let x = 0; x < SIZE; x++) {
          const i = (y * SIZE + x) * 4;
          if (out[i + 3] && out[i] + out[i + 1] + out[i + 2] > 420 && inside(spec.p, x + 0.5, y + 0.5))
            for (let c = 0; c < 3; c++) out[i + c] = Math.round(out[i + c] + (255 - out[i + c]) * 0.7 * t);
        }
      }
    };
    const sameShifted = (a, b, dy) => {
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE * 4; x++) {
        const from = y + dy < SIZE ? a[(y + dy) * SIZE * 4 + x] : 0;
        if (b[y * SIZE * 4 + x] !== from) return false;
      }
      return true;
    };
    const apply = textures => {
      if (!textures?.exists?.(KEY)) return;
      const texture = textures.get(KEY), source = texture.source?.[0];
      if (!source || patched === source) return;
      if (!SETTINGS.livelySprites) return;
      const frame = name => texture.frames?.[name];
      const names = Object.keys(REGIONS).flatMap(d => [...BOB.keys()].flatMap(k => ['idle_' + d + '_' + k, 'walk_' + d + '_' + k]));
      if (!names.every(n => frame(n)?.cutWidth === SIZE && frame(n)?.cutHeight === SIZE &&
        frame(n).source === source && !frame(n).rotated && !frame(n).data?.trim)) { patched = source; return; }
      const combatNames = Object.keys(COMBAT_HASHES);
      const validCombat = combatNames.every(n => frame(n)?.cutWidth === SIZE && frame(n)?.cutHeight === SIZE &&
        frame(n).source === source && !frame(n).rotated && !frame(n).data?.trim);
      const count = Object.keys(REGIONS).length * BOB.length + (validCombat ? combatNames.length : 0);
      const columns = Math.max(Math.floor(source.width / SIZE), Math.ceil(Math.sqrt(count)));
      if (!columns) { patched = source; return; }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(source.width, columns * SIZE); canvas.height = source.height + Math.ceil(count / columns) * SIZE;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source.image, 0, 0);
      const read = name => ctx.getImageData(frame(name).cutX, frame(name).cutY, SIZE, SIZE).data;
      const results = [];
      for (const [d, regions] of Object.entries(REGIONS)) {
        const src = read('idle_' + d + '_0');
        if (poseHash(src) !== POSE_HASHES[d]) { patched = source; return; }
        // The known artwork: frame k is frame 0 raised by BOB[k], and every walk frame repeats its idle frame.
        for (const k of BOB.keys()) {
          const idle = read('idle_' + d + '_' + k);
          if (!sameShifted(src, idle, BOB[k]) || !sameShifted(idle, read('walk_' + d + '_' + k), 0)) { patched = source; return; }
        }
        const masks = Object.fromEntries(Object.entries(regions).map(([name, spec]) => [name, maskOf(name, spec, src)]));
        for (const k of BOB.keys()) {
          const out = new Uint8ClampedArray(src), up = 1 - 2 * BOB[(k + 1) % 8] / 4;
          for (const [name, spec] of Object.entries(regions)) {
            if (name.startsWith('wing')) bend(out, src, masks[name], spec, spec.s * WING * (spec.a || 1) * up);
          }
          swayTail(out, 2 * Math.PI * k / 8);
          if (regions.blade) shimmer(out, regions.blade, k);
          const shifted = new Uint8ClampedArray(SIZE * SIZE * 4);
          shifted.set(out.subarray(BOB[k] * SIZE * 4), 0);
          results.push([['idle_' + d + '_' + k, 'walk_' + d + '_' + k], new ImageData(shifted, SIZE, SIZE)]);
        }
      }
      // Attack poses have their own fingerprints: future combat artwork is never deformed with old assumptions.
      if (validCombat && combatNames.every(n => poseHash(read(n)) === COMBAT_HASHES[n])) {
        for (const name of combatNames) {
          const parts = name.split('_'), k = Number(parts.pop()), direction = parts.pop(), kind = parts.join('_');
          const length = combatNames.filter(n => n.startsWith(kind + '_' + direction + '_')).length;
          results.push([[name], combatFrame(read(name), direction, kind, k, length)]);
        }
      }
      const cuts = new Map(Object.values(texture.frames).map(f => [f, [f.cutX, f.cutY]]));
      results.forEach(([names, image], slot) => {
        const x = (slot % columns) * SIZE, y = source.height + Math.floor(slot / columns) * SIZE;
        ctx.putImageData(image, x, y);
        for (const name of names) cuts.set(frame(name), [x, y]);
      });
      original = { image: source.image, source: source.source, isCanvas: source.isCanvas, width: source.width, height: source.height,
        cuts: new Map(Object.values(texture.frames).map(f => [f, [f.cutX, f.cutY]])) };
      source.image = source.source = canvas; source.isCanvas = true; source.width = canvas.width; source.height = canvas.height;
      refit(texture, cuts);
      try { source.update(); } catch {}
      patched = source;
    };
    // Texture coordinates depend on the sheet size, so every frame is refitted after the sheet grows or shrinks.
    const refit = (texture, cuts) => {
      for (const f of Object.values(texture.frames)) {
        const [x, y] = cuts.get(f) || [f.cutX, f.cutY];
        f.cutX = x; f.cutY = y;
        // The canvas renderer reads the same place from the frame data.
        if (f.data?.cut) { f.data.cut.x = x; f.data.cut.y = y; f.data.cut.r = x + f.cutWidth; f.data.cut.b = y + f.cutHeight; }
        if (f.data?.drawImage) { f.data.drawImage.x = x; f.data.drawImage.y = y; }
        if (f.rotated && typeof f.updateUVsInverted === 'function') f.updateUVsInverted(); else f.updateUVs();
      }
    };
    const restore = textures => {
      if (!original || !patched || !textures?.exists?.(KEY) || textures.get(KEY).source?.[0] !== patched) { original = null; return; }
      const { cuts, ...sourceState } = original;
      Object.assign(patched, sourceState);
      refit(textures.get(KEY), cuts);
      try { patched.update(); } catch {}
      original = null; patched = null;
    };
    setInterval(() => {
      let textures = null;
      try { textures = window.dmo?.game?.textures; } catch {}
      if (!textures) return;
      try { if (SETTINGS.livelySprites) apply(textures); else restore(textures); } catch {}
    }, 1000);
  })();
  // Attack macro (F10, off by default): one press of the game's attack (its key or the basic attack hotbar slot)
  // first runs the game's own "nearest target" when there is no living monster targeted, then the attack itself,
  // like an attack macro. It acts only on that press; nothing repeats and nothing happens without a key press.
  (() => {
    const WRAPPED = Symbol('digimmo attack macro'), MOB = 2, DEAD = 2;
    const hasLivingTarget = scene => {
      let id = null;
      try { id = window.dmo?.store?.getState?.()?.target?.id ?? null; } catch {}
      const entity = id ? (window.dmo?.net?.state?.entities?.get?.(id) ?? scene.views?.get?.(id)) : null;
      return !!entity && entity.kind === MOB && !(entity.flags & DEAD);
    };
    const wrap = () => {
      let scene = null;
      try { scene = window.dmo?.game?.scene?.getScene?.('world') || null; } catch {}
      if (!scene || typeof scene.runAction !== 'function' || scene.runAction[WRAPPED]) return;
      const original = scene.runAction;
      const run = function (action) {
        if (SETTINGS.attackMacro && action?.t === 'attack' && !hasLivingTarget(this)) original.call(this, { t: 'nearestTarget' });
        return original.call(this, action);
      };
      run[WRAPPED] = true;
      scene.runAction = run;
    };
    setInterval(wrap, 1000);
  })();
  // @development-start
  Object.assign(runtime, {
    status: 'ready', settings: SETTINGS, openMenu, closeMenu,
    rebuild: () => ATMOS.rebuild(), getStats: () => ATMOS.built && ATMOS.built.stats,
    diagnostics: () => ATMOS.diagnostics(),
  });
  // @development-end
  // @public: runtime.status = 'ready';
  Object.freeze(runtime);

  // Recorded ambience. Trimmed, looped, loudness matched and re-encoded (Opus).
  const SOUND_CREDITS = __SOUND_CREDITS__;
  const AMB_SAMPLES = __AMB_SAMPLES__;
})();
