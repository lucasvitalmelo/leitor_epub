import { useState, type CSSProperties } from "react";
import { CloudAlert, CloudCheck, CloudOff, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDriveStore, type DriveStatus } from "@/store/drive-store";
import { useSyncStore, type SyncStatus } from "@/store/sync-store";

// The button is hidden while the state is unknown or there's no login server.
const STATES: Partial<Record<DriveStatus, { icon: LucideIcon; label: string }>> = {
  desconectado: { icon: CloudOff, label: "Google Drive: desconectado" },
  conectado: { icon: CloudCheck, label: "Google Drive: conectado" },
  reconectar: { icon: CloudAlert, label: "Google Drive: conecte de novo" },
};

function description(status: DriveStatus, email: string | null): string {
  if (status === "conectado") {
    return email ? `Conectado como ${email}.` : "Conectado ao Google Drive.";
  }
  if (status === "reconectar") {
    return "O acesso ao Google Drive expirou ou foi removido. Conecte de novo para continuar.";
  }
  return "Guarde livros, progresso e grifos no seu Google Drive e continue a leitura em outro aparelho.";
}

function syncLine(status: SyncStatus, lastSyncAt: number | null, error: string | null): string | null {
  if (status === "sincronizando") return "Sincronizando...";
  if (status === "erro") return error;
  if (!lastSyncAt) return null;
  const time = new Date(lastSyncAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `Sincronizado às ${time}.`;
}

export default function DriveButton({ portalStyle }: { portalStyle: CSSProperties }) {
  const status = useDriveStore((s) => s.status);
  const account = useDriveStore((s) => s.account);
  const connect = useDriveStore((s) => s.connect);
  const disconnect = useDriveStore((s) => s.disconnect);
  const syncStatus = useSyncStore((s) => s.status);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const syncError = useSyncStore((s) => s.error);
  const syncNow = useSyncStore((s) => s.run);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const state = STATES[status];
  if (!state) return null;
  const Icon = state.icon;
  const line = status === "conectado" ? syncLine(syncStatus, lastSyncAt, syncError) : null;

  async function handleDisconnect() {
    setLeaving(true);
    try {
      await disconnect();
      setOpen(false);
    } catch {
      toast.error("Não foi possível desconectar", {
        description: "Confira a conexão e tente de novo.",
      });
    } finally {
      setLeaving(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={state.label}
        title={state.label}
        onClick={() => setOpen(true)}
        className="max-sm:size-11"
      >
        <Icon className="size-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={portalStyle}>
          <DialogHeader>
            <DialogTitle>Google Drive</DialogTitle>
            <DialogDescription>{description(status, account?.email ?? null)}</DialogDescription>
          </DialogHeader>
          {line && (
            <p className="text-sm text-muted-foreground" role={syncStatus === "erro" ? "alert" : undefined}>
              {line}
            </p>
          )}
          <DialogFooter>
            {status === "conectado" ? (
              <>
                <Button variant="outline" onClick={handleDisconnect} disabled={leaving}>
                  {leaving ? "Desconectando..." : "Desconectar"}
                </Button>
                <Button onClick={() => void syncNow()} disabled={syncStatus === "sincronizando" || leaving}>
                  Sincronizar agora
                </Button>
              </>
            ) : (
              <Button onClick={connect}>
                {status === "reconectar" ? "Reconectar" : "Conectar ao Google Drive"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
