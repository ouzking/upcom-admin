import { Badge } from "@/components/ui/Badge";
import {
  CONTACT_STATUS_LABELS,
  CONTACT_STATUS_TONES,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_TONES,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_TONES,
} from "@/lib/labels";
import type { ContactStatus, ContentStatus, QuoteStatus } from "@/types";

export function ContentStatusBadge({ status, scheduled = false }: { status: ContentStatus; scheduled?: boolean }) {
  if (scheduled) {
    return (
      <Badge tone="brand" dot>
        Programmé
      </Badge>
    );
  }
  return (
    <Badge tone={CONTENT_STATUS_TONES[status]} dot>
      {CONTENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <Badge tone={QUOTE_STATUS_TONES[status]} dot>
      {QUOTE_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  return (
    <Badge tone={CONTACT_STATUS_TONES[status]} dot>
      {CONTACT_STATUS_LABELS[status]}
    </Badge>
  );
}
