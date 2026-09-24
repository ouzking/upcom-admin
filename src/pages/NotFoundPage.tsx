import { Compass } from "lucide-react";
import { EmptyState } from "@/components/feedback/States";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon={Compass}
        title="Page introuvable"
        description="L'adresse demandée n'existe pas ou a été déplacée."
        action={<ButtonLink to="/">Retour au tableau de bord</ButtonLink>}
      />
    </Card>
  );
}
