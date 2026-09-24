import type { Column } from "@/components/data/DataTable";
import { ContentStatusBadge } from "@/components/data/StatusBadge";
import { Thumbnail } from "@/components/data/Thumbnail";
import { CONTENT_RESOURCES } from "@/config/resources";
import { teamRepository } from "@/repositories/team.repository";
import type { TeamMemberRow } from "@/types";
import { ContentListPage } from "../content/ContentListPage";

const resource = CONTENT_RESOURCES.team_members;

const columns: Column<TeamMemberRow>[] = [
  {
    key: "name",
    header: "Membre",
    cell: (member) => (
      <div className="flex items-center gap-3">
        <Thumbnail bucket="team" path={member.photo_path} rounded="rounded-full" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{member.name}</p>
          <p className="truncate text-xs text-muted">{member.position}</p>
        </div>
      </div>
    ),
  },
  { key: "order", header: "Ordre", hideBelow: "md", cell: (member) => <span className="tabular-nums text-muted">{member.display_order}</span> },
  { key: "status", header: "Statut", cell: (member) => <ContentStatusBadge status={member.status} /> },
];

export default function TeamListPage() {
  return (
    <ContentListPage
      resource={resource}
      repository={teamRepository}
      description="Membres de l'équipe présentés sur la page « Équipe » du site."
      columns={columns}
      itemTitle={(member) => member.name}
      searchPlaceholder="Nom, fonction…"
      newLabel="Nouveau membre"
      emptyDescription="Présentez l'équipe UPCOM à partir des informations validées par la direction."
    />
  );
}
