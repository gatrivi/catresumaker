export interface Translations {
  appName: string;
  appDescription: string;
  atsStandard: string;
  continuousPipeline: string;
  resetDemo: string;
  printExport: string;
  apiMissing: string;
  apiConnected: string;
  apiChecking: string;
  apiError: string;
  optimalTemplate: string;
  renderingTemplate: string;
  dayToDaySync: string;
  manualCorrection: string;
  rebuildBase: string;
  proTipPrint: string;
  gotIt: string;
  watermark: string;
  footerTag: string;
  designedWith: string;
  firstTimeTitle: string;
  firstTimeDesc: string;
  onboardingBtn: string;
  stepTitle: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  step4Title: string;
  step4Desc: string;
  closeGuide: string;
  connectionHealthy: string;
  connectionTesting: string;
  connectionCheckBtn: string;
  
  // Log update form titles/buttons
  logTitle: string;
  logSubtitle: string;
  logPlaceholder: string;
  saveLocalBtn: string;
  quickSyncBtn: string;
  syncingBtn: string;
  syncPendingBtn: string;
  timelineTitle: string;
  noLogsCaptured: string;
  noLogsDesc: string;
  readyToSync: string;
  synced: string;
  deleteEntry: string;
  changesLogged: string;
  reviewDraft: string;
  discardBtn: string;
  acceptBtn: string;
  revisionCompleted: string;

  // Raw parser titles/buttons
  constructionMatrix: string;
  matrixDesc: string;
  rawTextLabel: string;
  rawTextPlaceholder: string;
  parseFailed: string;
  addApiKeyTip: string;
  loadSampleBtn: string;
  buildResumeBtn: string;
  tipsTitle: string;
  tip1: string;
  tip2: string;
  tip3: string;
  warningOverwritingTitle: string;
  warningOverwritingDesc: string;

  signIn: string;
  signOut: string;
  jobOsNav: string;

  auth: {
    signInTitle: string;
    registerTitle: string;
    privacyNote: string;
    fullName: string;
    email: string;
    password: string;
    submitSignIn: string;
    submitRegister: string;
    switchToRegister: string;
    switchToSignIn: string;
    failed: string;
  };

  jobOs: {
    title: string;
    subtitle: string;
    aiOffline: string;
    backResume: string;
    loginRequiredTitle: string;
    loginRequiredDesc: string;
    loginCta: string;
    applyToday: string;
    ranked: string;
    applied: string;
    total: string;
    syncFolder: string;
    sourceInbox: string;
    scorePack: string;
    forceRepack: string;
    aiTailor: string;
    importLegacy: string;
    addJob: string;
    pasteJobTitle: string;
    companyPh: string;
    rolePh: string;
    urlPh: string;
    descPh: string;
    saveJob: string;
    saving: string;
    emptyQueue: string;
    selectJob: string;
    noPack: string;
    copyPaste: string;
    exportPdf: string;
    open: string;
    copy: string;
    markApplied: string;
    skip: string;
    sessionExpired: string;
    footer: string;
    finderTitle: string;
    finderSubtitle: string;
    finderSearch: string;
    finderSearching: string;
    finderImport: string;
    finderFetchUrl: string;
    finderFetchUrlPh: string;
    finderBookmarklet: string;
    finderFit: string;
    finderQueued: string;
    finderNoResults: string;
    finderKeywordsPh: string;
    finderImportPack: string;
    finderObscuraOn: string;
    finderObscuraOff: string;
    finderPasteBookmarklet: string;
    quickApplyTitle: string;
    quickApplyOpen: string;
    quickApplyCopy: string;
    quickApplyDone: string;
  };
}

export const resources: Record<'en' | 'es', Translations> = {
  en: {
    appName: "CatResumeMaker",
    appDescription: "Continuous professional ATS-optimized resume builder that incremental merges daily activity logs into formatted designs via Gemini.",
    atsStandard: "ATS Standard",
    continuousPipeline: "Continuous day-to-day resume pipeline",
    resetDemo: "Reset Demo",
    printExport: "Print / Export PDF",
    apiMissing: "AI offline. Set NVIDIA_API_KEY, FREELLMAPI_API_KEY, or GEMINI_API_KEY in `.env`.",
    apiConnected: "System Connected & Ready",
    apiChecking: "Checking pipeline connection...",
    apiError: "Pipeline unreachable. Check server connection.",
    optimalTemplate: "OPTIMAL RENDERING TEMPLATE",
    renderingTemplate: "Optimal Rendering Template",
    dayToDaySync: "Day-To-Day Sync",
    manualCorrection: "Manual Correction",
    rebuildBase: "Re-Build Base",
    proTipPrint: "💡 PRO-TIP: Make sure the margin settings in the browser Print Dialog are set to 'None' or 'Default' for optimal paper alignment.",
    gotIt: "GOT IT",
    watermark: "made with catresumaker by devtrivi",
    footerTag: "🐕 CatResumeMaker — ATS Optimization Framework",
    designedWith: "Designed with Space Grotesk & Inter typeface scales. Double column bento workspaces.",
    firstTimeTitle: "Quick Start Guide",
    firstTimeDesc: "Welcome to CatResumeMaker! It looks like it's your first time here. Follow these steps to build an amazing, up-to-date resume:",
    onboardingBtn: "Onboarding Tutorial",
    stepTitle: "Quick Start & Interactive Onboarding",
    step1Title: "1. Verify Connection Status",
    step1Desc: "Ensure the 'System Connected & Ready' green badge is active in the footer or navbar. This confirms our server-side connection to Gemini API is fully operational.",
    step2Title: "2. Build Your Base Document",
    step2Desc: "Go to the 'Re-Build Base' tab and paste any old CV text or messy career paragraphs. Let Gemini synthesize it into a clean, structured JSON format with optimized STAR verbs.",
    step3Title: "3. Log Updates As You Work",
    step3Desc: "Open the 'Day-To-Day Sync' daily log panel. Type quick updates of your daily achievements, metrics, or technologies learned as they happen, so you never forget them.",
    step4Title: "4. Review, Render & Print",
    step4Desc: "Review the live-simulated A4 paper preview. When ready, click 'Print / Export PDF'—your CV is always current, perfectly targeted, and fully ATS-friendly!",
    closeGuide: "Close Tutorial & Start Building",
    connectionHealthy: "AI Engine Ready",
    connectionTesting: "Testing backend latency...",
    connectionCheckBtn: "Test Live Connection",
    
    // Log update form terms
    logTitle: "Day-To-Day Career Logger",
    logSubtitle: "Record your daily actions, accomplishments, or metrics. Gemini will integrate them cleanly into the PDF layout.",
    logPlaceholder: "Today I wrote a new API route in Express checking parameter structures... OR I optimized our Kubernetes warmup times by 10% using pre-loaded images.",
    saveLocalBtn: "Store to Timeline",
    quickSyncBtn: "Quick AI Sync",
    syncingBtn: "Syncing...",
    syncPendingBtn: "Sync Pending",
    timelineTitle: "Work Logs Timeline",
    noLogsCaptured: "No activity logs captured.",
    noLogsDesc: "Logs entered here track your daily tasks, ready to sync dynamically.",
    readyToSync: "Ready to Sync",
    synced: "Synced",
    deleteEntry: "Delete entry",
    changesLogged: "Changes Logged:",
    reviewDraft: "Review the updated document to verify content placement before committing.",
    discardBtn: "Discard Suggestions",
    acceptBtn: "Accept Changes",
    revisionCompleted: "AI Revision Completed",

    // Builder terms
    constructionMatrix: "AI Construction Matrix",
    matrixDesc: "Paste your messy career logs to instantly manufacture an ATS-perfect document",
    rawTextLabel: "Raw Career Text, Messy Bio or Pasted Profile",
    rawTextPlaceholder: "Example: I worked at Acme Inc as Tech Lead between 2021-2024. I managed a team of 4 engineers and we rebuilt the checkout page using React and Tailwind CSS...",
    parseFailed: "Parsing failed:",
    addApiKeyTip: "Configure NVIDIA_API_KEY, FREELLMAPI_API_KEY, and/or GEMINI_API_KEY in your `.env` file.",
    loadSampleBtn: "Load Sample Profile Ingestion",
    buildResumeBtn: "Build My Resume",
    tipsTitle: "Tips for Elite ATS Construction",
    tip1: "Copy and paste your messy LinkedIn profile page directly.",
    tip2: "Type standard paragraphs describing your past credentials, projects, and educational milestones.",
    tip3: "Paste old PDF resume text blocks that lost formatting during scanners.",
    warningOverwritingTitle: "⚠️ Resynthesizing your file:",
    warningOverwritingDesc: "Providing raw text will parse and manufacture a completely new core profile, overwriting current fields. Ensure you save or export your historical inputs first.",

    signIn: "Sign in",
    signOut: "Sign out",
    jobOsNav: "Job OS",

    auth: {
      signInTitle: "Sign in",
      registerTitle: "Create account",
      privacyNote: "Your resume and Job OS data stay in your private workspace — nothing shared with other users.",
      fullName: "Full name",
      email: "Email",
      password: "Password (min 8 chars)",
      submitSignIn: "Sign in",
      submitRegister: "Create account",
      switchToRegister: "Need an account? Register",
      switchToSignIn: "Already have an account? Sign in",
      failed: "Failed",
    },

    jobOs: {
      title: "Job OS",
      subtitle: "Source → score → AI pack → apply",
      aiOffline: "AI offline (set NVIDIA_API_KEY)",
      backResume: "← Resume",
      loginRequiredTitle: "Job OS — sign in required",
      loginRequiredDesc: "Each account gets a private workspace. Your jobs, packs, and resume never mix with other users.",
      loginCta: "Sign in or create account",
      applyToday: "Apply today",
      ranked: "Ranked",
      applied: "Applied",
      total: "Total",
      syncFolder: "Sync folder → queue",
      sourceInbox: "Source inbox",
      scorePack: "Score + Pack",
      forceRepack: "Force repack",
      aiTailor: "AI tailor selected",
      importLegacy: "Import my legacy jobs",
      addJob: "+ Add job",
      pasteJobTitle: "Paste a job posting",
      companyPh: "Company",
      rolePh: "Role title",
      urlPh: "Job URL",
      descPh: "Paste full job description here…",
      saveJob: "Save to queue",
      saving: "Saving…",
      emptyQueue: "No jobs. Click Sync folder → queue or + Add job.",
      selectJob: "Select a job to preview application pack, paste bank, interview prep, and follow-ups.",
      noPack: "(no generated files yet — run Score + Pack)",
      copyPaste: "Copy paste bank",
      exportPdf: "Export PDF",
      open: "Open",
      copy: "Copy",
      markApplied: "Applied",
      skip: "Skip",
      sessionExpired: "Session expired — sign in again",
      footer: "v1.4.3 — Obscura ATS fetch + faster apply flow.",
      finderTitle: "Find jobs",
      finderSubtitle: "Feeds + Obscura on ATS links (Lever, Greenhouse). You approve — no LinkedIn bots.",
      finderSearch: "Search feeds",
      finderSearching: "Searching…",
      finderImport: "Add to queue",
      finderFetchUrl: "Fetch & pack",
      finderFetchUrlPh: "https://jobs.lever.co/…",
      finderBookmarklet: "Capture bookmarklet",
      finderFit: "Fit",
      finderQueued: "in queue",
      finderNoResults: "Search to load remote React/TS roles from public APIs.",
      finderKeywordsPh: "react, typescript, frontend, remote",
      finderImportPack: "Import & pack",
      finderObscuraOn: "Obscura ready",
      finderObscuraOff: "Obscura off — npm run obscura:install",
      finderPasteBookmarklet: "Paste helper",
      quickApplyTitle: "Next to apply",
      quickApplyOpen: "Open form",
      quickApplyCopy: "Copy paste bank",
      quickApplyDone: "Mark applied",
    },
  },
  es: {
    appName: "CatResumeMaker",
    appDescription: "Generador continuo de currículums profesionales optimizados para ATS que fusiona registros de actividad diaria en diseños de formato mediante Gemini.",
    atsStandard: "Estándar ATS",
    continuousPipeline: "Canal continuo de actualización de currículums",
    resetDemo: "Reiniciar Demo",
    printExport: "Imprimir / Exportar PDF",
    apiMissing: "IA sin conexión. Configure NVIDIA_API_KEY, FREELLMAPI_API_KEY o GEMINI_API_KEY en `.env`.",
    apiConnected: "Sistema Conectado y Listo",
    apiChecking: "Comprobando conexión de la API...",
    apiError: "Línea de conexión inalcanzable. Verifique conexión de servidor.",
    optimalTemplate: "PLANTILLA DE RENDERIZADO ÓPTIMO",
    renderingTemplate: "Plantilla de Renderizado Óptimo",
    dayToDaySync: "Sincronización Diaria",
    manualCorrection: "Corrección Manual",
    rebuildBase: "Reconstruir Base",
    proTipPrint: "💡 CONSEJO: Asegúrese de que los márgenes en el diálogo de impresión estén configurados en 'Ninguno' o 'Predeterminado' para una alineación óptima.",
    gotIt: "ENTENDIDO",
    watermark: "made with catresumaker by devtrivi",
    footerTag: "🐕 CatResumeMaker — Estructura de Optimización ATS",
    designedWith: "Diseñado con escalas de tipografía Space Grotesk e Inter. Espacios de trabajo bilaterales tipo bento.",
    firstTimeTitle: "Guía de Inicio Rápido",
    firstTimeDesc: "¡Bienvenido/a a CatResumeMaker! Parece que es tu primera vez aquí. Sigue estos simples pasos para construir un currículum increíble y siempre actualizado:",
    onboardingBtn: "Tutorial de Inicio",
    stepTitle: "Inicio Rápido y Guía Interactiva",
    step1Title: "1. Verifica el Estado de Conexión",
    step1Desc: "Asegúrate de que el indicador verde 'Sistema Conectado' esté activo en la barra superior o en el pie de página. Esto confirma el acceso seguro al motor de IA de Gemini.",
    step2Title: "2. Reconstruye tu Base",
    step2Desc: "Ve a la pestaña 'Reconstruir Base' y pega cualquier bloque de texto antiguo, perfil desordenado o borrador. Gemini lo sintetizará en un formato JSON ordenado con verbos del método STAR.",
    step3Title: "3. Registra tus Actividades Diarias",
    step3Desc: "Abre el panel 'Sincronización Diaria'. Escribe actualizaciones rápidas de tus tareas diarias, logros, métricas o herramientas aprendidas al momento para que nunca se te olviden.",
    step4Title: "4. Revisa, Aplica e Imprime",
    step4Desc: "Verifica el resultado en la simulación interactiva de hoja A4. Pulsa en 'Imprimir / Exportar PDF': ¡tu documento estará inmediatamente optimizado, personalizado y listo para los bots!",
    closeGuide: "Cerrar Tutorial y Empezar",
    connectionHealthy: "Motor de IA Listo",
    connectionTesting: "Comprobando latencia del backend...",
    connectionCheckBtn: "Probar Conexión en Vivo",

    // Log update form terms
    logTitle: "Registro de Carrera Diario",
    logSubtitle: "Registra tus acciones diarias, logros o métricas. Gemini los integrará limpiamente en la hoja A4.",
    logPlaceholder: "Hoy programé una nueva ruta API en Express que valida parámetros... O bien optimicé el tiempo de preparación de Kubernetes en un 10% mediante imágenes precargadas.",
    saveLocalBtn: "Guardar en historial",
    quickSyncBtn: "Sincronizar con IA",
    syncingBtn: "Sincronizando...",
    syncPendingBtn: "Actualizar pendientes",
    timelineTitle: "Línea de Tiempo de Actividades",
    noLogsCaptured: "No se han capturado registros de actividad.",
    noLogsDesc: "Las anotaciones guardadas aquí te permitirán asociar tus hitos de trabajo y enviarlos en grupo para re-optimizar.",
    readyToSync: "Listo para Sincronizar",
    synced: "Sincronizado",
    deleteEntry: "Eliminar registro",
    changesLogged: "Cambios Realizados por IA:",
    reviewDraft: "Revisa la vista previa de la hoja A4 para verificar la disposición del contenido antes de guardar.",
    discardBtn: "Descartar Cambios",
    acceptBtn: "Aceptar Cambios",
    revisionCompleted: "Sugerencia de IA Completada",

    // Builder terms
    constructionMatrix: "Matriz de Construcción por IA",
    matrixDesc: "Pega tus registros de carrera desordenados para fabricar al instante un CV optimizado para ATS.",
    rawTextLabel: "Texto de Carrera Desordenado, Bio o Perfil Copiado",
    rawTextPlaceholder: "Ejemplo: Trabajé en Acme Inc como Director Técnico entre 2021 y 2024. Dirigí un equipo de 4 desarrolladores y reconstruimos la sección de carrito de compras usando React...",
    parseFailed: "Error de análisis:",
    addApiKeyTip: "Por favor asegúrate de que el servidor de desarrollo contenga la clave GEMINI_API_KEY configurada en Variables de Entorno.",
    loadSampleBtn: "Cargar Ingesta de Perfil de Ejemplo",
    buildResumeBtn: "Construir Mi Currículum",
    tipsTitle: "Consejos para una Construcción Experta",
    tip1: "Copia y pega directamente el texto de tu página de perfil de LinkedIn.",
    tip2: "Describe en párrafos sencillos tus responsabilidades, proyectos insignia e hitos educativos.",
    tip3: "Pega bloques de texto de currículums en PDF que perdieron su estructura al pasar por escáneres previos.",
    warningOverwritingTitle: "⚠️ Resintetizando tu archivo:",
    warningOverwritingDesc: "Proporcionar texto sin procesar analizará y fabricará un perfil central completamente nuevo, sobrescribiendo los campos actuales. Asegúrate de guardar tus datos previos.",

    signIn: "Ingresar",
    signOut: "Salir",
    jobOsNav: "Job OS",

    auth: {
      signInTitle: "Iniciar sesión",
      registerTitle: "Crear cuenta",
      privacyNote: "Tu currículum y datos de Job OS quedan en tu espacio privado — no se comparten con otros usuarios.",
      fullName: "Nombre completo",
      email: "Correo electrónico",
      password: "Contraseña (mín. 8 caracteres)",
      submitSignIn: "Iniciar sesión",
      submitRegister: "Crear cuenta",
      switchToRegister: "¿No tenés cuenta? Registrate",
      switchToSignIn: "¿Ya tenés cuenta? Iniciá sesión",
      failed: "Error",
    },

    jobOs: {
      title: "Job OS",
      subtitle: "Fuente → puntaje → pack IA → postular",
      aiOffline: "IA sin conexión (configurá NVIDIA_API_KEY)",
      backResume: "← Currículum",
      loginRequiredTitle: "Job OS — requiere iniciar sesión",
      loginRequiredDesc: "Cada cuenta tiene su espacio privado. Tus trabajos, packs y CV no se mezclan con otros usuarios.",
      loginCta: "Ingresar o crear cuenta",
      applyToday: "Postular hoy",
      ranked: "Rankeados",
      applied: "Postulados",
      total: "Total",
      syncFolder: "Sincronizar carpeta → cola",
      sourceInbox: "Importar inbox",
      scorePack: "Puntuar + Pack",
      forceRepack: "Forzar repack",
      aiTailor: "Personalizar con IA",
      importLegacy: "Importar trabajos legacy",
      addJob: "+ Agregar trabajo",
      pasteJobTitle: "Pegá una publicación",
      companyPh: "Empresa",
      rolePh: "Rol",
      urlPh: "URL del trabajo",
      descPh: "Pegá la descripción completa acá…",
      saveJob: "Guardar en cola",
      saving: "Guardando…",
      emptyQueue: "Sin trabajos. Usá Sincronizar carpeta o + Agregar trabajo.",
      selectJob: "Seleccioná un trabajo para ver pack, paste bank, entrevista y seguimientos.",
      noPack: "(sin archivos generados — ejecutá Puntuar + Pack)",
      copyPaste: "Copiar paste bank",
      exportPdf: "Exportar PDF",
      open: "Abrir",
      copy: "Copiar",
      markApplied: "Postulado",
      skip: "Omitir",
      sessionExpired: "Sesión expirada — volvé a ingresar",
      footer: "v1.4.3 — Obscura ATS + flujo rápido.",
      finderTitle: "Buscar trabajos",
      finderSubtitle: "Feeds + Obscura en ATS (Lever, Greenhouse). Vos aprobás — sin bots de LinkedIn.",
      finderSearch: "Buscar",
      finderSearching: "Buscando…",
      finderImport: "Agregar a cola",
      finderFetchUrl: "Obtener y pack",
      finderFetchUrlPh: "https://jobs.lever.co/…",
      finderBookmarklet: "Bookmarklet captura",
      finderFit: "Fit",
      finderQueued: "en cola",
      finderNoResults: "Buscá roles React/TS remotos en APIs públicas.",
      finderKeywordsPh: "react, typescript, frontend, remote",
      finderImportPack: "Importar y pack",
      finderObscuraOn: "Obscura listo",
      finderObscuraOff: "Obscura off — npm run obscura:install",
      finderPasteBookmarklet: "Ayudante paste",
      quickApplyTitle: "Siguiente a postular",
      quickApplyOpen: "Abrir formulario",
      quickApplyCopy: "Copiar paste bank",
      quickApplyDone: "Marcar postulado",
    },
  }
};
