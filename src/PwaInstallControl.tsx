
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import { getLanguage } from "./translations";

import {
  ArrowDownToLine,
  CircleHelp,
  Download,
  RefreshCw,
  Smartphone,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

type Language = "es" | "en" | "fr" | "pt";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const labels = {
  es: {
    install: "Instalar app",
    help: "Cómo instalar",
    title: "Instala JW Tracker",
    body: "Accede rápidamente a JW Tracker desde tu pantalla de inicio. Algunas funciones necesitan conexión a internet.",
    ios: "En Safari, pulsa Compartir y selecciona «Añadir a pantalla de inicio».",
    other: "Abre el menú de tu navegador y selecciona «Instalar aplicación» o «Añadir a pantalla de inicio».",
    close: "Cerrar instrucciones",
    online: "Conexión disponible",
    offline: "Sin conexión a internet",
    noSignal: "Sin señal",
    installed: "Aplicación instalada",
    browser: "Aplicación en navegador",
    update: "Nueva versión disponible",
    updateButton: "Actualizar ahora",
    updating: "Actualizando...",
    updateError: "No se pudo actualizar. Inténtalo de nuevo.",
    installError: "No se pudo iniciar la instalación.",
    connection: "Las funciones de sincronización necesitan internet.",
    closePanel: "Cerrar",
  },
  en: {
    install: "Install app",
    help: "How to install",
    title: "Install JW Tracker",
    body: "Access JW Tracker quickly from your home screen. Some features require an internet connection.",
    ios: "In Safari, tap Share and select “Add to Home Screen.”",
    other: "Open your browser menu and select “Install app” or “Add to Home Screen.”",
    close: "Close instructions",
    online: "Connection available",
    offline: "No internet connection",
    noSignal: "No signal",
    installed: "App installed",
    browser: "Browser application",
    update: "New version available",
    updateButton: "Update now",
    updating: "Updating...",
    updateError: "Update failed. Please try again.",
    installError: "Unable to start installation.",
    connection: "Synchronization features require internet.",
    closePanel: "Close",
  },
  fr: {
    install: "Installer l’application",
    help: "Comment installer",
    title: "Installer JW Tracker",
    body: "Accédez rapidement à JW Tracker depuis votre écran d’accueil. Certaines fonctions nécessitent Internet.",
    ios: "Dans Safari, touchez Partager puis « Sur l’écran d’accueil ».",
    other: "Ouvrez le menu du navigateur et choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».",
    close: "Fermer les instructions",
    online: "Connexion disponible",
    offline: "Pas de connexion Internet",
    noSignal: "Pas de signal",
    installed: "Application installée",
    browser: "Application dans le navigateur",
    update: "Nouvelle version disponible",
    updateButton: "Mettre à jour",
    updating: "Mise à jour...",
    updateError: "Échec de la mise à jour. Réessayez.",
    installError: "Impossible de lancer l’installation.",
    connection: "La synchronisation nécessite Internet.",
    closePanel: "Fermer",
  },
  pt: {
    install: "Instalar aplicativo",
    help: "Como instalar",
    title: "Instalar JW Tracker",
    body: "Acesse rapidamente o JW Tracker pela tela inicial. Algumas funções precisam de internet.",
    ios: "No Safari, toque em Compartilhar e escolha «Adicionar à Tela de Início».",
    other: "Abra o menu do navegador e escolha «Instalar aplicativo» ou «Adicionar à tela inicial».",
    close: "Fechar instruções",
    online: "Conexão disponível",
    offline: "Sem conexão com a internet",
    noSignal: "Sem sinal",
    installed: "Aplicativo instalado",
    browser: "Aplicativo no navegador",
    update: "Nova versão disponível",
    updateButton: "Atualizar agora",
    updating: "Atualizando...",
    updateError: "Falha na atualização. Tente novamente.",
    installError: "Não foi possível iniciar a instalação.",
    connection: "A sincronização precisa de internet.",
    closePanel: "Fechar",
  },
} satisfies Record<Language, Record<string, string>>;

// ========================================
// ESTADO DE CONEXIÓN COMPARTIDO
// ========================================

let onlineSnapshot =
  typeof navigator !== "undefined" ? navigator.onLine : true;

const onlineListeners = new Set<() => void>();

const updateOnlineSnapshot = () => {
  const nextOnline = navigator.onLine;

  if (nextOnline === onlineSnapshot) return;

  onlineSnapshot = nextOnline;

  onlineListeners.forEach(listener => listener());
};

function subscribeOnline(listener: () => void) {
  onlineListeners.add(listener);

  if (onlineListeners.size === 1) {
    onlineSnapshot = navigator.onLine;

    window.addEventListener("online", updateOnlineSnapshot);
    window.addEventListener("offline", updateOnlineSnapshot);
  }

  return () => {
    onlineListeners.delete(listener);

    if (onlineListeners.size === 0) {
      window.removeEventListener("online", updateOnlineSnapshot);
      window.removeEventListener("offline", updateOnlineSnapshot);
    }
  };
}

function getOnlineSnapshot() {
  return onlineSnapshot;
}

function useOnlineStatus() {
  return useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    () => true
  );
}

// ========================================
// IDIOMA
// ========================================

function getCurrentLanguage(): Language {
  const language = getLanguage();

  if (
    language === "es" ||
    language === "en" ||
    language === "fr" ||
    language === "pt"
  ) {
    return language;
  }

  return "es";
}


// ========================================
// INDICADOR DE CONEXIÓN
// ========================================

export function PwaConnectionStatus() {
  const online = useOnlineStatus();

  const [language, setLanguage] =
    useState<Language>(getCurrentLanguage);

  useEffect(() => {
    const languageChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ lang?: unknown }>).detail;

      if (
        detail?.lang === "es" ||
        detail?.lang === "en" ||
        detail?.lang === "fr" ||
        detail?.lang === "pt"
      ) {
        setLanguage(detail.lang);
      } else {
        setLanguage(getCurrentLanguage());
      }
    };

    window.addEventListener(
      "jw-tracker-language-change",
      languageChanged
    );

    return () => {
      window.removeEventListener(
        "jw-tracker-language-change",
        languageChanged
      );
    };
  }, []);

  const copy = labels[language];

  return (
    <div
      className={`pwa-connection-indicator ${
        online ? "is-online" : "is-offline"
      }`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={online ? copy.online : copy.offline}
      title={online ? copy.online : copy.offline}
    >
      {online ? (
        <Wifi size={17} aria-hidden="true" />
      ) : (
        <>
          <WifiOff size={17} aria-hidden="true" />
          <span>{copy.noSignal}</span>
        </>
      )}
    </div>
  );
}


// ========================================
// FUNCIONES AUXILIARES PWA
// ========================================

function isInstallPrompt(event: Event): event is InstallPrompt {
  return "prompt" in event && "userChoice" in event;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isAppleMobile(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// ========================================
// CONTROL DE INSTALACIÓN PWA
// ========================================

export default function PwaInstallControl() {
  const [language, setLanguage] =
    useState<Language>(getCurrentLanguage);

  const [installPrompt, setInstallPrompt] =
    useState<InstallPrompt | null>(null);

  const [showInstructions, setShowInstructions] = useState(false);

  const [installed, setInstalled] = useState(isStandalone);

  const online = useOnlineStatus();

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(false);

  const copy = labels[language];
  const apple = isAppleMobile();

  const closeInstructions = useCallback(() => {
    setShowInstructions(false);
  }, []);

  // ========================================
  // EVENTOS DE INSTALACIÓN E IDIOMA
  // ========================================

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      if (!isInstallPrompt(event)) return;

      event.preventDefault();
      setInstallPrompt(event);
    };

    const appInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowInstructions(false);
    };

    const languageChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ lang?: unknown }>).detail;

      if (
        detail?.lang === "es" ||
        detail?.lang === "en" ||
        detail?.lang === "fr" ||
        detail?.lang === "pt"
      ) {
        setLanguage(detail.lang);
      } else {
        setLanguage(getCurrentLanguage());
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeInstructions();
    };

    const displayMode = window.matchMedia("(display-mode: standalone)");

    const handleDisplayChange = () => {
      setInstalled(isStandalone());
    };

    displayMode.addEventListener?.("change", handleDisplayChange);

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);

    window.addEventListener(
      "jw-tracker-language-change",
      languageChanged
    );

    window.addEventListener("keydown", handleEscape);

    return () => {
      displayMode.removeEventListener?.(
        "change",
        handleDisplayChange
      );

      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);

      window.removeEventListener(
        "jw-tracker-language-change",
        languageChanged
      );

      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeInstructions]);

  // ========================================
  // DETECCIÓN DE ACTUALIZACIONES
  // ========================================

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let active = true;

    let registration: ServiceWorkerRegistration | undefined;

    let observedWorker: ServiceWorker | null = null;

    let workerStateHandler: (() => void) | null = null;

    const checkWaitingWorker = () => {
      if (
        active &&
        registration?.waiting &&
        navigator.serviceWorker.controller
      ) {
        setUpdateAvailable(true);
      }
    };

    const observeWorker = (worker: ServiceWorker | null) => {
      if (!worker || worker === observedWorker) return;

      if (observedWorker && workerStateHandler) {
        observedWorker.removeEventListener(
          "statechange",
          workerStateHandler
        );
      }

      observedWorker = worker;

      workerStateHandler = () => {
        if (!active) return;

        if (worker.state === "installed") {
          checkWaitingWorker();
        }
      };

      worker.addEventListener("statechange", workerStateHandler);
    };

    const handleUpdateFound = () => {
      observeWorker(registration?.installing ?? null);
    };

    const checkRegistration = async () => {
      try {
        registration = await navigator.serviceWorker.getRegistration();

        if (!active || !registration) return;

        checkWaitingWorker();

        registration.addEventListener(
          "updatefound",
          handleUpdateFound
        );

        observeWorker(registration.installing);

        try {
          await registration.update();
        } catch (error) {
          console.warn(
            "No se pudo comprobar una actualización PWA.",
            error
          );
        }

        if (!active) return;

        checkWaitingWorker();
        observeWorker(registration.installing);
      } catch (error) {
        console.error(
          "Error comprobando actualización PWA:",
          error
        );
      }
    };

    void checkRegistration();

    return () => {
      active = false;

      registration?.removeEventListener(
        "updatefound",
        handleUpdateFound
      );

      if (observedWorker && workerStateHandler) {
        observedWorker.removeEventListener(
          "statechange",
          workerStateHandler
        );
      }
    };
  }, []);

  // ========================================
  // INSTALAR APLICACIÓN
  // ========================================

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowInstructions(current => !current);
      return;
    }

    try {
      await installPrompt.prompt();

      await installPrompt.userChoice;

      setInstallPrompt(null);
    } catch (error) {
      console.error(copy.installError, error);
      setShowInstructions(true);
    }
  };

  // ========================================
  // ACTUALIZAR APLICACIÓN
  // ========================================

  const handleUpdate = async () => {
    if (!("serviceWorker" in navigator) || updating) return;

    setUpdating(true);
    setUpdateError(false);

    try {
      const registration =
        await navigator.serviceWorker.getRegistration();

      if (!registration) {
        throw new Error("Service Worker no registrado.");
      }

      let waitingWorker = registration.waiting;

      if (!waitingWorker) {
        await registration.update();
        waitingWorker = registration.waiting;
      }

      if (!waitingWorker) {
        throw new Error(
          "La actualización todavía no está preparada."
        );
      }

      if (!navigator.serviceWorker.controller) {
        throw new Error(
          "La aplicación todavía no está controlada por el Service Worker."
        );
      }

      await new Promise<void>((resolve, reject) => {
        let timeoutId: number;

        const cleanup = () => {
          window.clearTimeout(timeoutId);

          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            handleControllerChange
          );
        };

        const handleControllerChange = () => {
          cleanup();
          resolve();
        };

        timeoutId = window.setTimeout(() => {
          cleanup();

          reject(
            new Error(
              "Tiempo de espera agotado al activar la actualización."
            )
          );
        }, 20000);

        navigator.serviceWorker.addEventListener(
          "controllerchange",
          handleControllerChange
        );

        try {
          waitingWorker.postMessage({
            type: "SKIP_WAITING",
          });
        } catch (error) {
          cleanup();
          reject(error);
        }
      });

      window.location.reload();
    } catch (error) {
      console.error(copy.updateError, error);

      setUpdateError(true);
      setUpdating(false);
    }
  };

  // ========================================
  // INTERFAZ
  // ========================================

  return (
    <aside className="pwa-install-control" aria-label="JW Tracker PWA">
      {updateAvailable && (
        <section className="pwa-update-card" aria-live="polite">
          <div className="pwa-update-info">
            <RefreshCw size={17} aria-hidden="true" />
            <span>{copy.update}</span>
          </div>

          <button
            type="button"
            onClick={handleUpdate}
            disabled={updating}
            className="pwa-update-button"
          >
            <Download size={15} aria-hidden="true" />
            {updating ? copy.updating : copy.updateButton}
          </button>

          {updateError && (
            <p role="alert">{copy.updateError}</p>
          )}
        </section>
      )}

      {!installed && (
        <>
          <section
            id="pwa-install-instructions"
            className="pwa-install-card"
            aria-labelledby="pwa-install-title"
            hidden={!showInstructions}
          >
            <button
              type="button"
              className="pwa-install-close"
              aria-label={copy.close}
              onClick={closeInstructions}
            >
              <X size={16} aria-hidden="true" />
            </button>

            <h2 id="pwa-install-title">{copy.title}</h2>

            <p>{copy.body}</p>

            <p className="pwa-install-step">
              <Smartphone size={17} aria-hidden="true" />
              {apple ? copy.ios : copy.other}
            </p>
          </section>

          <button
            type="button"
            className="pwa-install-button"
            aria-controls="pwa-install-instructions"
            aria-expanded={showInstructions}
            onClick={handleInstall}
          >
            {installPrompt ? (
              <ArrowDownToLine size={17} aria-hidden="true" />
            ) : (
              <CircleHelp size={17} aria-hidden="true" />
            )}

            {installPrompt ? copy.install : copy.help}
          </button>
        </>
      )}
    </aside>
  );
}
