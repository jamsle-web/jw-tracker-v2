import { useEffect, useState } from "react";
import { ArrowDownToLine, CircleHelp, X } from "lucide-react";

type Language = "es" | "en" | "fr" | "pt";
type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const labels = {
  es: {
    install: "Instalar app",
    help: "Cómo instalar",
    title: "Usar JW Tracker sin conexión",
    body: "Instala la app para abrirla sin conexión. Tus datos permanecen en este dispositivo; JW.ORG y las actualizaciones necesitan internet.",
    ios: "En Safari, pulsa Compartir y elige «Añadir a pantalla de inicio».",
    other: "Usa la opción «Instalar aplicación» o «Añadir a pantalla de inicio» del menú del navegador.",
    close: "Cerrar instrucciones de instalación",
  },
  en: {
    install: "Install app",
    help: "How to install",
    title: "Use JW Tracker offline",
    body: "Install the app to open it offline. Your data stays on this device; JW.ORG and updates require internet.",
    ios: "In Safari, tap Share, then choose “Add to Home Screen.”",
    other: "Choose “Install app” or “Add to Home Screen” from your browser menu.",
    close: "Close installation instructions",
  },
  fr: {
    install: "Installer l’application",
    help: "Comment installer",
    title: "Utiliser JW Tracker hors ligne",
    body: "Installez l’application pour l’ouvrir hors ligne. Vos données restent sur cet appareil ; JW.ORG et les mises à jour nécessitent Internet.",
    ios: "Dans Safari, touchez Partager, puis « Sur l’écran d’accueil ».",
    other: "Dans le menu du navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».",
    close: "Fermer les instructions d’installation",
  },
  pt: {
    install: "Instalar aplicativo",
    help: "Como instalar",
    title: "Usar o JW Tracker sem conexão",
    body: "Instale o aplicativo para abri-lo sem conexão. Seus dados ficam neste dispositivo; JW.ORG e atualizações precisam de internet.",
    ios: "No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.",
    other: "No menu do navegador, escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.",
    close: "Fechar instruções de instalação",
  },
} satisfies Record<Language, Record<string, string>>;

function readLanguage(): Language {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem("jw-tracker-v1") ?? "{}");
    if (typeof stored === "object" && stored !== null && "lang" in stored) {
      const language = stored.lang;
      if (language === "en" || language === "fr" || language === "pt" || language === "es") return language;
    }
  } catch {
    return "es";
  }
  return "es";
}

function isInstallPrompt(event: Event): event is InstallPrompt {
  return "prompt" in event && "userChoice" in event;
}

export default function PwaInstallControl() {
  const [language, setLanguage] = useState<Language>(readLanguage);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);
  const copy = labels[language];
  const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent);

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
      if (detail?.lang === "es" || detail?.lang === "en" || detail?.lang === "fr" || detail?.lang === "pt") {
        setLanguage(detail.lang);
      } else {
        setLanguage(readLanguage());
      }
    };
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;

    setInstalled(standalone);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);
    window.addEventListener("jw-tracker-language-change", languageChanged);

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
      window.removeEventListener("jw-tracker-language-change", languageChanged);
    };
  }, []);

  if (installed) return null;

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowInstructions(current => !current);
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === "accepted") setInstalled(true);
    } catch (error) {
      console.error("No se pudo iniciar la instalación de JW Tracker.", error);
      setShowInstructions(true);
    }
  };

  return (
    <aside className="pwa-install-control" aria-label={copy.title}>
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
            onClick={() => setShowInstructions(false)}
          >
            <X size={16} aria-hidden="true" />
          </button>
          <h2 id="pwa-install-title">{copy.title}</h2>
          <p>{copy.body}</p>
          <p>{isAppleMobile ? copy.ios : copy.other}</p>
      </section>
      <button
        type="button"
        className="pwa-install-button"
        aria-controls="pwa-install-instructions"
        aria-expanded={showInstructions}
        onClick={handleInstall}
      >
        {installPrompt ? <ArrowDownToLine size={17} aria-hidden="true" /> : <CircleHelp size={17} aria-hidden="true" />}
        {installPrompt ? copy.install : copy.help}
      </button>
    </aside>
  );
}
