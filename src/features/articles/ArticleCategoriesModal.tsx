import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useConfirm } from "@/components/feedback/confirm-context";
import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useArticleCategories, useArticleCategoryMutations } from "./useArticleCategories";

/** Gestion des catégories d'actualités (articles.manage). */
export function ArticleCategoriesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useArticleCategories();
  const { create, rename, remove } = useArticleCategoryMutations();
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const valid = (value: string) => value.trim().length >= 2 && value.trim().length <= 120;

  return (
    <Modal open={open} onClose={onClose} title="Catégories d'actualités" description="Les articles d'une catégorie supprimée deviennent « sans catégorie ».">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid(name)) create.mutate(name, { onSuccess: () => setName("") });
        }}
      >
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nouvelle catégorie" maxLength={120} aria-label="Nom de la nouvelle catégorie" />
        <Button type="submit" icon={Plus} loading={create.isPending} disabled={!valid(name)}>
          Ajouter
        </Button>
      </form>

      <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
        {categories.isLoading ? (
          <li className="flex justify-center py-6">
            <Spinner className="text-brand" />
          </li>
        ) : !categories.data?.length ? (
          <li className="px-4 py-6 text-center text-sm text-muted">Aucune catégorie pour le moment.</li>
        ) : (
          categories.data.map((category) => (
            <li key={category.id} className="flex items-center gap-2 px-3 py-2">
              {editing?.id === category.id ? (
                <>
                  <Input
                    value={editing.name}
                    onChange={(event) => setEditing({ id: category.id, name: event.target.value })}
                    maxLength={120}
                    aria-label="Nom de la catégorie"
                    autoFocus
                  />
                  <IconButton
                    icon={Check}
                    label="Enregistrer"
                    size="sm"
                    disabled={!valid(editing.name)}
                    onClick={() => rename.mutate(editing, { onSuccess: () => setEditing(null) })}
                  />
                  <IconButton icon={X} label="Annuler" size="sm" onClick={() => setEditing(null)} />
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm font-medium text-ink">{category.name}</span>
                  <span className="hidden font-mono text-xs text-subtle sm:inline">{category.slug}</span>
                  <IconButton icon={Pencil} label={`Renommer ${category.name}`} size="sm" onClick={() => setEditing({ id: category.id, name: category.name })} />
                  <IconButton
                    icon={Trash2}
                    label={`Supprimer ${category.name}`}
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      const ok = await confirm({ tone: "danger", title: `Supprimer « ${category.name} » ?`, confirmLabel: "Supprimer" });
                      if (ok) remove.mutate(category.id);
                    }}
                  />
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </Modal>
  );
}
