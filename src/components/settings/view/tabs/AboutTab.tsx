import { MessageSquare } from 'lucide-react';

import { version } from '../../../../../package.json';
import { CLOUDCLI_WORDMARK_FONT_FAMILY } from '../../../../constants/branding';

export default function AboutTab() {
  return (
    <div className="space-y-6">
      {/* Logo + name + version */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/90 shadow-sm">
          <MessageSquare className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-base font-semibold text-foreground"
              style={{ fontFamily: CLOUDCLI_WORDMARK_FONT_FAMILY }}
            >
              duet
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              v{version}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Un modelo caro piensa, tú eliges quién ejecuta.
          </p>
        </div>
      </div>

      {/* Purpose */}
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
        duet deja que un orquestador razone y delegue el trabajo de escritura de
        código a un ejecutor más barato, con supervisión web en vivo de ambos
        agentes. La meta: ahorrar tokens y darte libertad para elegir quién
        orquesta y quién ejecuta.
      </p>

      {/* License */}
      <div className="border-t border-border/50 pt-4">
        <p className="text-xs text-muted-foreground/60">
          Licensed under AGPL-3.0
        </p>
      </div>
    </div>
  );
}
