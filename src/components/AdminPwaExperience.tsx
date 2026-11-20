import { useEffect, useLayoutEffect, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const INSTALL_DISMISSED_KEY = 'barbearia-admin-pwa-install-dismissed';
const ADMIN_APP_SESSION_KEY = 'barbearia-admin-pwa-context';
const initialPathname = window.location.pathname;

if (new URLSearchParams(window.location.search).get('source') === 'admin-pwa') {
  try {
    window.sessionStorage.setItem(ADMIN_APP_SESSION_KEY, 'true');
  } catch {
    // The start URL remains enough to detect this launch for the current page.
  }
}

function isAdminPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function isAppInstalled() {
  const nav = navigator as Navigator & { standalone?: boolean };
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
  if (!isStandalone) return false;
  try {
    return window.sessionStorage.getItem(ADMIN_APP_SESSION_KEY) === 'true'
      || (isIosDevice() && isAdminPath(initialPathname));
  } catch {
    return new URLSearchParams(window.location.search).get('source') === 'admin-pwa'
      || (isIosDevice() && isAdminPath(initialPathname));
  }
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isIosSafari() {
  return isIosDevice()
    && /safari/i.test(navigator.userAgent)
    && !/(crios|fxios|edgios|opios)/i.test(navigator.userAgent);
}

function getBrowserLabel() {
  const userAgent = navigator.userAgent;
  if (/edg/i.test(userAgent)) return 'Microsoft Edge';
  if (/chrome|crios/i.test(userAgent)) return 'Google Chrome';
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  return 'este navegador';
}

export function AdminPwaExperience() {
  const { pathname } = useLocation();
  const adminPath = isAdminPath(pathname);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [installError, setInstallError] = useState('');
  const [serviceWorkerError, setServiceWorkerError] = useState('');

  useLayoutEffect(() => {
    if (!adminPath) return;

    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const appleIconLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    const faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const originalTitle = document.title;
    const originalManifest = manifestLink?.getAttribute('href');
    const originalAppleIcon = appleIconLink?.getAttribute('href');
    const originalFavicon = faviconLink?.getAttribute('href');
    const originalThemeColor = themeColorMeta?.getAttribute('content');

    if (manifestLink) manifestLink.href = `${import.meta.env.BASE_URL}admin/manifest.webmanifest`;
    if (appleIconLink) appleIconLink.href = `${import.meta.env.BASE_URL}iconadm/admin-apple-touch-icon.png`;
    if (faviconLink) faviconLink.href = `${import.meta.env.BASE_URL}iconadm/admin-icon-192.png`;
    if (themeColorMeta) themeColorMeta.content = '#394878';
    document.title = 'Barbearia Admin';

    return () => {
      if (manifestLink && originalManifest != null) manifestLink.href = originalManifest;
      if (appleIconLink && originalAppleIcon != null) appleIconLink.href = originalAppleIcon;
      if (faviconLink && originalFavicon != null) faviconLink.href = originalFavicon;
      if (themeColorMeta && originalThemeColor != null) themeColorMeta.content = originalThemeColor;
      document.title = originalTitle;
    };
  }, [adminPath]);

  useEffect(() => {
    if (!adminPath) return;

    try {
      setDismissed(window.localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true');
    } catch {
      setInstallError('Não foi possível salvar as preferências de instalação neste navegador.');
    }

    setInstalled(isAppInstalled());
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (!isAppInstalled()) setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [adminPath]);

  useEffect(() => {
    if (!adminPath) return;
    if (!('serviceWorker' in navigator)) {
      setServiceWorkerError('Este navegador não oferece suporte a Service Workers para o aplicativo administrativo.');
      return;
    }
    if (!window.isSecureContext) {
      setServiceWorkerError('A instalação exige HTTPS (ou localhost durante o desenvolvimento).');
      return;
    }

    let active = true;
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}admin/sw.js`, {
      scope: `${import.meta.env.BASE_URL}admin/`,
    }).catch((error: unknown) => {
      if (active) {
        setServiceWorkerError(
          error instanceof Error
            ? `Não foi possível preparar o aplicativo administrativo: ${error.message}`
            : 'Não foi possível preparar o aplicativo administrativo.',
        );
      }
    });

    return () => {
      active = false;
    };
  }, [adminPath]);

  const handleInstall = async () => {
    if (!installPrompt) return;

    setInstallError('');
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setInstallPrompt(null);
    } catch {
      setInstallPrompt(null);
      setInstallError('Não foi possível iniciar a instalação. Tente novamente pelo menu do navegador.');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
    } catch {
      setInstallError('O convite foi ocultado, mas não foi possível salvar essa preferência.');
    }
  };

  if (!adminPath || installed || dismissed) return null;

  const ios = isIosDevice();
  const iosSafari = isIosSafari();
  const canPromptInstall = installPrompt !== null;

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 w-[min(22rem,calc(100vw-2rem))]">
      <section
        aria-label="Instalação do aplicativo administrativo"
        className="rounded-2xl border border-[#d4af6b]/50 bg-[#12161d] p-4 text-stone-100 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#d4af6b]/15 p-2 text-[#d4af6b]">
            {ios && !canPromptInstall ? <Share2 aria-hidden="true" className="h-5 w-5" /> : <Download aria-hidden="true" className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Barbearia Admin</p>
            <p className="mt-1 text-sm text-stone-300">
              {canPromptInstall
                ? 'Instale o painel administrativo como um aplicativo separado.'
                : iosSafari
                  ? 'No iPhone/iPad, instale pelo menu de compartilhamento do Safari.'
                  : ios
                    ? 'Abra esta página no Safari para instalar o aplicativo administrativo.'
                    : `O ${getBrowserLabel()} não disponibilizou o botão nesta sessão. Verifique o menu do navegador para instalar.`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dispensar convite de instalação administrativa"
            className="rounded-lg p-1 text-stone-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af6b]"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {canPromptInstall ? (
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="mt-4 w-full rounded-xl bg-[#d4af6b] px-4 py-2.5 text-sm font-semibold text-[#0b0d11] transition hover:bg-[#e2c58f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Instalar aplicativo administrativo
          </button>
        ) : iosSafari ? (
          <>
            <button
              type="button"
              onClick={() => setShowIosSteps((visible) => !visible)}
              aria-expanded={showIosSteps}
              className="mt-4 w-full rounded-xl border border-[#d4af6b]/50 px-4 py-2.5 text-sm font-semibold text-[#e2c58f] transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af6b]"
            >
              {showIosSteps ? 'Ocultar instruções' : 'Instalar aplicativo administrativo'}
            </button>
            {showIosSteps && (
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-stone-300">
                <li>Toque em Compartilhar no Safari.</li>
                <li>Selecione “Adicionar à Tela de Início”.</li>
                <li>Confirme a instalação do Barbearia Admin.</li>
              </ol>
            )}
          </>
        ) : null}
        {installError && <p role="status" className="mt-2 text-sm text-rose-300">{installError}</p>}
        {serviceWorkerError && <p role="status" className="mt-2 text-sm text-rose-300">{serviceWorkerError}</p>}
      </section>
    </div>
  );
}
