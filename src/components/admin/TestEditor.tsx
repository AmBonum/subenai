import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryMultiSelect } from "@/components/admin/CategoryMultiSelect";
import {
  BRANCHES,
  type AdminTest,
  type TestDifficulty,
  type TestStatus,
} from "@/lib/admin/mock-data";
import { useAdminState } from "@/lib/admin/mock-store";
import { tFor } from "@/i18n/tests";

export interface TestEditorState {
  title: string;
  description: string;
  categories: string[];
  difficulty: TestDifficulty;
  status: TestStatus;
  question_ids: string[];
}

interface TestEditorProps {
  test: AdminTest;
  onChange: (next: TestEditorState) => void;
}

export function TestEditor({ test, onChange }: TestEditorProps) {
  const t = tFor("admin_editor");
  const allQuestions = useAdminState((s) => s.questions);
  const [state, setState] = useState<TestEditorState>({
    title: test.title,
    description: test.description,
    categories: [...test.categories],
    difficulty: test.difficulty,
    status: test.status,
    question_ids: [...test.question_ids],
  });

  useEffect(() => {
    onChange(state);
  }, [state, onChange]);

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= state.question_ids.length) return;
    const next = [...state.question_ids];
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    setState({ ...state, question_ids: next });
  };

  const remove = (idx: number) => {
    setState({
      ...state,
      question_ids: state.question_ids.filter((_, i) => i !== idx),
    });
  };

  const addFirstAvailable = () => {
    const first = allQuestions.find((q) => !state.question_ids.includes(q.id));
    if (first) setState({ ...state, question_ids: [...state.question_ids, first.id] });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="admed-title">{t("title_input_label")}</Label>
            <Input
              id="admed-title"
              value={state.title}
              onChange={(e) => setState({ ...state, title: e.target.value })}
              data-testid="admin-test-editor-title-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admed-desc">{t("description_input_label")}</Label>
            <Textarea
              id="admed-desc"
              rows={3}
              value={state.description}
              onChange={(e) => setState({ ...state, description: e.target.value })}
              data-testid="admin-test-editor-description-input"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("status_label")}</Label>
              <Select
                value={state.status}
                onValueChange={(v) => setState({ ...state, status: v as TestStatus })}
              >
                <SelectTrigger data-testid="admin-test-editor-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="published">published</SelectItem>
                  <SelectItem value="archived">archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("difficulty_label")}</Label>
              <Select
                value={state.difficulty}
                onValueChange={(v) => setState({ ...state, difficulty: v as TestDifficulty })}
              >
                <SelectTrigger data-testid="admin-test-editor-difficulty-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">easy</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="hard">hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("branch_label")}</Label>
              <div data-testid="admin-test-editor-branch-select">
                <CategoryMultiSelect
                  value={state.categories}
                  onChange={(next) => setState({ ...state, categories: next })}
                  placeholder={BRANCHES[0]?.name ?? "—"}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          {state.question_ids.map((qid, idx) => {
            const q = allQuestions.find((x) => x.id === qid);
            return (
              <div
                key={qid}
                className="flex items-center gap-2 rounded-md border p-3"
                data-testid={`admin-test-editor-question-row-${idx}`}
              >
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    data-testid={`admin-test-editor-question-row-up-${idx}`}
                    aria-label={t("question_up")}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => move(idx, 1)}
                    disabled={idx === state.question_ids.length - 1}
                    data-testid={`admin-test-editor-question-row-down-${idx}`}
                    aria-label={t("question_down")}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{q?.title ?? qid}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => remove(idx)}
                  data-testid={`admin-test-editor-question-row-remove-${idx}`}
                  aria-label={t("question_remove")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
          <Button
            size="sm"
            variant="outline"
            onClick={addFirstAvailable}
            data-testid="admin-test-editor-add-question-button"
          >
            <Plus className="mr-2 h-3 w-3" />
            {t("add_question_button")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
