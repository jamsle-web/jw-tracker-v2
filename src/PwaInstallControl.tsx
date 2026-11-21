
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  CheckCircle2,
  CircleHelp,
  Cloud,
  CloudOff,
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

function readLanguage(): Language {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem("jw-tracker-v1") ?? "{}"
    );

    if (typeof stored === "object" && stored !== null && "lang" in stored) {
      const language = stored.lang;

      if (
        language === "es" ||
        language === "en" ||
        language === "fr" ||
        language === "pt"
      ) {
        return language;
      }
    }
  } catch {
    // Use Spanish as fallback.
  }

  return "es";
}

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

export default function PwaInstallControl() {
  const [language, setLanguage] = useState<Language>(readLanguage);
  const [installPrompt, setInstallPrompt] =
    useState<InstallPrompt | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installed, setInstalled] = useState(isStandalone);
  const [online, setOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(false);

  const copy = labels[language];
  const apple = isAppleMobile();

  const closeInstructions = useCallback(() => {
    setShowInstructions(false);
  }, []);

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

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

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
        setLanguage(readLanguage());
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
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("jw-tracker-language-change", languageChanged);
    window.addEventListener("keydown", handleEscape);

    return () => {
      displayMode.removeEventListener?.("change", handleDisplayChange);

      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "jw-tracker-language-change",
        languageChanged
      );
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeInstructions]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let active = true;

    const checkRegistration = async () => {
      try {
        const registration =
          await navigator.serviceWorker.getRegistration();

        if (!active || !registration) return;

        if (registration.waiting) {
          setUpdateAvailable(true);
        }

        const handleUpdateFound = () => {
          const worker = registration.installing;

          if (!worker) return;

          worker.addEventListener("statechange", () => {
            if (
              active &&
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setUpdateAvailable(true);
            }
          });
        };

        registration.addEventListener("updatefound", handleUpdateFound);
      } catch (error) {
        console.error("Error comprobando actualización PWA:", error);
      }
    };

    void checkRegistration();

    return () => {
      active = false;
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowInstructions(current => !current);
      return;
    }

    try {
      await installPrompt.prompt();

      const choice = await installPrompt.userChoice;

      setInstallPrompt(null);

      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
    } catch (error) {
      console.error(copy.installError, error);
      setShowInstructions(true);
    }
  };

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

      await registration.update();

      const waitingWorker = registration.waiting;

      if (!waitingWorker) {
        setUpdateAvailable(false);
        setUpdating(false);
        return;
      }

      const controllerChanged = new Promise<void>(resolve => {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true }
        );
      });

      waitingWorker.postMessage({ type: "SKIP_WAITING" });

      await controllerChanged;

      window.location.reload();
    } catch (error) {
      console.error(copy.updateError, error);
      setUpdateError(true);
      setUpdating(false);
    }
  };

  return (
    <aside className="pwa-install-control" aria-label="JW Tracker PWA">

      <div
        className="pwa-status"
        role="status"
        aria-live="polite"
      >
        {online ? (
          <span className="pwa-status-item online">
            <Wifi size={14} aria-hidden="true" />
            {copy.online}
          </span>
        ) : (
          <span className="pwa-status-item offline">
            <WifiOff size={14} aria-hidden="true" />
            {copy.offline}
          </span>
        )}

        {installed && (
          <span className="pwa-status-item installed">
            <Smartphone size={14} aria-hidden="true" />
            {copy.installed}
          </span>
        )}
      </div>

      {!online && (
        <p className="pwa-offline-notice">
          <CloudOff size={15} aria-hidden="true" />
          {copy.connection}
        </p>
      )}

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
