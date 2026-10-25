import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import WarmthSlider from "@/components/WarmthSlider";
import { isScreenWakeLockSupported } from "@/hooks/use-screen-wake-lock";
import { listBooks, removeLocalFile } from "@/lib/db/books";
import type { Book } from "@/lib/db/schema";
import { canFreeSpace, formatSize, spaceUsed } from "@/lib/library-space";
import { pageThemeVars, portalThemeVars } from "@/lib/page-theme";
import { useDriveStore } from "@/store/drive-store";
import { useReadingPrefsStore } from "@/store/reading-prefs-store";
import { useSyncStore } from "@/store/sync-store";
import { useThemeStore } from "@/store/theme-store";

const REPO_URL = "https://github.com/lucasvitalmelo/leitor_epub";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-medium text-muted-foreground">{title}</h2>
      <div className="flex flex-col divide-y rounded-2xl border">{children}</div>
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-4 px-4 py-3">{children}</div>;
}

// A row that is a button (or a link), the whole width.
const actionClass =
  "flex w-full cursor-pointer items-center px-4 py-3 text-left text-sm transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

function Toggle({
  id,
  label,
  checked,
  onChange,
  style,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  style: CSSProperties;
}) {
  return (
    <Row>
      <Label htmlFor={id} className="flex-1 cursor-pointer font-normal">
        {label}
      </Label>
      <Switch id={id} className="cursor-pointer" style={style} checked={checked} onCheckedChange={onChange} />
    </Row>
  );
}

const time = (at: number) =>
  new Date(at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export default function Settings() {
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.activeTheme);
  const keepScreenOn = useReadingPrefsStore((s) => s.keepScreenOn);
  const setKeepScreenOn = useReadingPrefsStore((s) => s.setKeepScreenOn);
  const syncWhileReading = useReadingPrefsStore((s) => s.syncWhileReading);
  const setSyncWhileReading = useReadingPrefsStore((s) => s.setSyncWhileReading);
  const driveStatus = useDriveStore((s) => s.status);
  const account = useDriveStore((s) => s.account);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const syncing = useSyncStore((s) => s.status === "sincronizando");
  const syncRevision = useSyncStore((s) => s.revision);
  const [books, setBooks] = useState<Book[]>([]);
  const [confirm, setConfirm] = useState<"liberar" | "desconectar" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listBooks().then(setBooks);
  }, [syncRevision]);

  // Opened straight from the address, the Drive state is still unknown.
  useEffect(() => {
    if (useDriveStore.getState().status === "verificando") void useDriveStore.getState().check();
  }, []);

  const pageVars = pageThemeVars(theme);
  const portalVars = portalThemeVars(theme);
  // See the switch in ReaderSettings: the track and thumb read --input/--background.
  const switchStyle = {
    "--background": theme.background,
    "--input": `${theme.textColor}40`,
  } as CSSProperties;
  const connected = driveStatus === "conectado";
  const used = spaceUsed(books);
  const freeable = books.filter(canFreeSpace);
  const freeableBytes = spaceUsed(freeable).bytes;
  const one = freeable.length === 1;

  async function freeSpace() {
    setBusy(true);
    // One book that fails doesn't stop the others.
    let failed = 0;
    for (const book of freeable) {
      try {
        await removeLocalFile(book.id);
      } catch (error) {
        console.error("Não foi possível liberar o espaço do livro", book.id, error);
        failed++;
      }
    }
    setBooks(await listBooks());
    setBusy(false);
    setConfirm(null);
    if (failed === 0) toast("Espaço liberado");
    else
      toast.error(
        `${failed} ${failed === 1 ? "livro não pôde ser liberado." : "livros não puderam ser liberados."}`,
      );
  }

  async function disconnect() {
    setBusy(true);
    try {
      await useDriveStore.getState().disconnect();
      setConfirm(null);
    } catch {
      toast.error("Não foi possível desconectar", {
        description: "Confira a conexão e tente de novo.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col" style={pageVars}>
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Voltar"
            title="Voltar"
            onClick={() => navigate("/")}
            className="max-sm:size-11"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-semibold sm:text-2xl">Configurações</h1>
        </header>

        <div className="flex flex-col gap-8">
          <Section title="Leitura">
            <div className="px-4 py-4">
              <WarmthSlider />
            </div>
            {isScreenWakeLockSupported && (
              <Toggle
                id="keep-screen-on"
                label="Manter a tela acesa durante a leitura"
                checked={keepScreenOn}
                onChange={setKeepScreenOn}
                style={switchStyle}
              />
            )}
          </Section>

          {/* Without a login server (the static deploy, `npm run dev`) or a
              network, there's no Drive to talk to: the section only says so. */}
          <Section title="Google Drive">
            {connected ? (
              <>
                <Row>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{account?.email ?? "Conectado"}</p>
                    {lastSyncAt !== null && (
                      <p className="text-xs text-muted-foreground">Sincronizado às {time(lastSyncAt)}</p>
                    )}
                  </div>
                </Row>
                <Toggle
                  id="sync-while-reading"
                  label="Sincronizar durante a leitura"
                  checked={syncWhileReading}
                  onChange={setSyncWhileReading}
                  style={switchStyle}
                />
                <button
                  type="button"
                  className={actionClass}
                  disabled={syncing}
                  onClick={() => void useSyncStore.getState().run()}
                >
                  {syncing ? "Sincronizando…" : "Sincronizar agora"}
                </button>
                <button
                  type="button"
                  className={`${actionClass} text-destructive`}
                  onClick={() => setConfirm("desconectar")}
                >
                  Desconectar
                </button>
              </>
            ) : (
              <>
                <Row>
                  <p className="text-xs text-muted-foreground">
                    {driveStatus === "indisponivel"
                      ? "Não foi possível falar com o Google agora."
                      : "Conecte para ter os mesmos livros, o progresso e os grifos no app e nos outros aparelhos."}
                  </p>
                </Row>
                <button
                  type="button"
                  className={actionClass}
                  disabled={driveStatus === "verificando" || driveStatus === "indisponivel"}
                  onClick={() => useDriveStore.getState().connect()}
                >
                  {driveStatus === "reconectar" ? "Conectar de novo" : "Conectar Google Drive"}
                </button>
              </>
            )}
          </Section>

          <Section title="Biblioteca">
            <Row>
              <div>
                <p className="text-sm">Espaço usado</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(used.bytes)} em {used.books}{" "}
                  {used.books === 1 ? "livro baixado" : "livros baixados"}
                </p>
              </div>
            </Row>
            <button
              type="button"
              className={actionClass}
              disabled={!connected || freeable.length === 0}
              onClick={() => setConfirm("liberar")}
            >
              Liberar espaço dos livros que estão no Drive
            </button>
          </Section>

          <Section title="Sobre">
            <Row>
              <p className="flex-1 text-sm">Versão</p>
              <p className="text-sm text-muted-foreground">{__BUILD_ID__}</p>
            </Row>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className={actionClass}>
              Política de privacidade
            </a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={actionClass}>
              Código no GitHub
            </a>
          </Section>
        </div>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && !busy && setConfirm(null)}>
        <AlertDialogContent style={portalVars}>
          {confirm === "liberar" ? (
            <AlertDialogHeader>
              <AlertDialogTitle>Liberar espaço?</AlertDialogTitle>
              <AlertDialogDescription>
                {freeable.length} {one ? "livro sai" : "livros saem"} deste aparelho (
                {formatSize(freeableBytes)}) e {one ? "continua" : "continuam"} no Google Drive, com
                progresso e grifos. Dá para baixar de novo quando quiser.
              </AlertDialogDescription>
            </AlertDialogHeader>
          ) : (
            <AlertDialogHeader>
              <AlertDialogTitle>Desconectar o Google Drive?</AlertDialogTitle>
              <AlertDialogDescription>
                Os livros baixados continuam neste aparelho; os que estão só no Drive saem da
                biblioteca e voltam ao conectar de novo.
              </AlertDialogDescription>
            </AlertDialogHeader>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              variant={confirm === "desconectar" ? "destructive" : "default"}
              onClick={(event) => {
                // Closed only once done, so a failure keeps the dialog.
                event.preventDefault();
                void (confirm === "liberar" ? freeSpace() : disconnect());
              }}
            >
              {confirm === "liberar" ? "Liberar" : "Desconectar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster />
    </div>
  );
}
