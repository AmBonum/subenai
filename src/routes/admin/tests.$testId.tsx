import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { ArrowLeft, Archive, Save, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/PageHeader";
import { TestEditor, type TestEditorState } from "@/components/admin/TestEditor";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { adminRepo } from "@/lib/admin/mock-store";
import { useAdminTest } from "@/lib/admin/queries";
import { AdminListLoading, AdminListError } from "@/components/admin/AdminListLoading";
import { tFor } from "@/i18n/tests";

export const Route = createFileRoute("/admin/tests/$testId")({
  component: AdminTestEditorPage,
});

function AdminTestEditorPage() {
  const t = tFor("admin_editor");
  const { testId } = useParams({ from: "/admin/tests/$testId" });
  const nav = useNavigate();
  const testQuery = useAdminTest(testId);
  const test = testQuery.data ?? null;

  const [draft, setDraft] = useState<TestEditorState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  const onChange = useCallback((next: TestEditorState) => {
    setDraft(next);
    setDirty(true);
  }, []);

  if (testQuery.isLoading) {
    return <AdminListLoading testId="admin-test-editor-loading" />;
  }

  if (testQuery.error) {
    return <AdminListError error={testQuery.error as Error} testId="admin-test-editor-error" />;
  }

  if (!test) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/tests" data-testid="admin-test-editor-back-button">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back_button")}
          </Link>
        </Button>
        <div
          className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"
          data-testid="admin-test-editor-not-found"
        >
          <p className="font-medium text-foreground">{t("not_found_title")}</p>
          <p className="mt-1">{t("not_found_body")}</p>
        </div>
      </div>
    );
  }

  const save = () => {
    if (draft) {
      adminRepo.tests.update(test.id, draft);
      setDirty(false);
    }
  };

  const publish = () => {
    save();
    adminRepo.tests.update(test.id, { status: "published" });
  };

  const archive = () => {
    save();
    adminRepo.tests.update(test.id, { status: "archived" });
  };

  const onBack = () => {
    if (dirty) setUnsavedOpen(true);
    else nav({ to: "/admin/tests" });
  };

  return (
    <div className="space-y-6" data-testid="admin-test-editor-root">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="w-fit"
        data-testid="admin-test-editor-back-button"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("back_button")}
      </Button>

      <PageHeader
        title={test.title}
        description={t("page_eyebrow")}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={archive}
              data-testid="admin-test-editor-archive-button"
            >
              <Archive className="mr-2 h-3 w-3" />
              {t("archive_button")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={save}
              data-testid="admin-test-editor-save-button"
            >
              <Save className="mr-2 h-3 w-3" />
              {t("save_button")}
            </Button>
            <Button size="sm" onClick={publish} data-testid="admin-test-editor-publish-button">
              <Send className="mr-2 h-3 w-3" />
              {t("publish_button")}
            </Button>
          </>
        }
      />

      <TestEditor test={test} onChange={onChange} />

      <ConfirmDialog
        open={unsavedOpen}
        onOpenChange={setUnsavedOpen}
        title={t("unsaved_title")}
        description={t("unsaved_body")}
        confirmLabel={t("unsaved_confirm")}
        cancelLabel={t("unsaved_cancel")}
        destructive
        onConfirm={() => nav({ to: "/admin/tests" })}
      />
    </div>
  );
}
