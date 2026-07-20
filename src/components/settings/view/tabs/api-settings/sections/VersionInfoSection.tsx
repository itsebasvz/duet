import { MessageSquare } from 'lucide-react';

import { DUET_WORDMARK_FONT_FAMILY } from '../../../../../../constants/branding';

type VersionInfoSectionProps = {
  currentVersion: string;
};

export default function VersionInfoSection({ currentVersion }: VersionInfoSectionProps) {
  return (
    <div className="border-t border-border/50 pt-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/90 shadow-sm">
          <MessageSquare className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold text-foreground"
              style={{ fontFamily: DUET_WORDMARK_FONT_FAMILY }}
            >
              duet
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              v{currentVersion}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Un modelo caro piensa, tú eliges quién ejecuta.
          </p>
        </div>
      </div>
    </div>
  );
}
