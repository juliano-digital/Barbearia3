import { useEffect, useState } from 'react';
import { Download, RefreshCw, Share2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isAppInstalled() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function PwaExperience() {
  const { pathname } = useLocation();
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [installError, setInstallError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updating, setUpdating] = useState(false);
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({ immediate: true });

  useEffect(() => {
    setInstalled(isAppInstalled());
    setIsIos(isIosDevice());

    const handleBeforeInstallPrompt = (event: Event) => {
      if (isAdminPath) return;
      event.preventDefault();
      if (!isAppInstalled()) {
        setInstallPrompt(event as BeforeInstallPromptEvent);
      }
    };
    const handleAppInstalled = () => {
      if (isAdminPath) return;
      setInstalled(true);
      setInstallPrompt(null);
      setDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isAdminPath]);

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

  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateError('');
    try {
      await updateServiceWorker();
    } catch {
      setUpdating(false);
      setUpdateError('Não foi possível atualizar agora. Tente novamente em instantes.');
    }
  };

  const showInstall = !isAdminPath && !installed && !dismissed && (installPrompt !== null || isIos);

  if (isAdminPath || (!showInstall && !needRefresh)) return null;

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 w-[min(22rem,calc(100vw-2rem))] space-y-3">
      {showInstall && (
        <section
          aria-label="Instalação do aplicativo"
          className="rounded-2xl border border-[#d4af6b]/50 bg-[#12161d] p-4 text-stone-100 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#d4af6b]/15 p-2 text-[#d4af6b]">
              {isIos && !installPrompt ? <Share2 aria-hidden="true" className="h-5 w-5" /> : <Download aria-hidden="true" className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Royal Barber House</p>
              <p className="mt-1 text-sm text-stone-300">
                {installPrompt
                  ? 'Adicione o app à tela inicial para abrir em modo aplicativo.'
                  : 'Use o menu de compartilhamento do navegador para adicionar à tela inicial.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dispensar convite de instalação"
              className="rounded-lg p-1 text-stone-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af6b]"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          {installPrompt ? (
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="mt-4 w-full rounded-xl bg-[#d4af6b] px-4 py-2.5 text-sm font-semibold text-[#0b0d11] transition hover:bg-[#e2c58f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Instalar aplicativo
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowIosSteps((visible) => !visible)}
                aria-expanded={showIosSteps}
                className="mt-4 w-full rounded-xl border border-[#d4af6b]/50 px-4 py-2.5 text-sm font-semibold text-[#e2c58f] transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af6b]"
              >
                {showIosSteps ? 'Ocultar instruções' : 'Como instalar no iPhone/iPad'}
              </button>
              {showIosSteps && (
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-stone-300">
                  <li>Abra o menu Compartilhar do navegador.</li>
                  <li>Selecione a opção para adicionar à tela inicial.</li>
                  <li>Confirme a instalação.</li>
                </ol>
              )}
            </>
          )}
          {installError && <p role="status" className="mt-2 text-sm text-rose-300">{installError}</p>}
        </section>
      )}

      {needRefresh && (
        <section
          aria-label="Atualização disponível"
          className="rounded-2xl border border-stone-700 bg-[#12161d] p-4 text-stone-100 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <RefreshCw aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af6b]" />
            <div>
              <p className="font-semibold">Atualização disponível</p>
              <p className="mt-1 text-sm text-stone-300">Atualize quando terminar as ações em andamento.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleUpdate()}
            disabled={updating}
            className="mt-4 w-full rounded-xl bg-[#d4af6b] px-4 py-2.5 text-sm font-semibold text-[#0b0d11] transition hover:bg-[#e2c58f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-70"
          >
            {updating ? 'Atualizando…' : 'Atualizar aplicativo'}
          </button>
          {updateError && <p role="status" className="mt-2 text-sm text-rose-300">{updateError}</p>}
        </section>
      )}
    </div>
  );
}
