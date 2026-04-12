import { useState, useEffect } from "react";
import { Layers, GitBranch, RefreshCw, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LabelCombobox } from "@/components/ui/LabelCombobox";
import { fetchLabels } from "@/services/api";
import type { QueryMode, RecommendRequest } from "@/types";
import { cn } from "@/lib/utils";

const DEMO_LABELS = ["back-end", "banco-de-dados", "bug", "componente", "feature", "front-end", "performance", "refactor", "segurança", "validação"];
const demoMode = import.meta.env.VITE_DEMO_MODE === "true";

interface EpicSelectorProps {
  onSubmit: (params: RecommendRequest) => void;
  loading: boolean;
}

export function EpicSelector({ onSubmit, loading }: EpicSelectorProps) {
  const [mode, setMode] = useState<QueryMode>("epic");
  const [epicKey, setEpicKey] = useState("");
  const [parentKey, setParentKey] = useState("");
  const [labels, setLabels] = useState<string[]>(demoMode ? [DEMO_LABELS[0]] : []);
  const [hoursAvailableToday, setHoursAvailableToday] = useState(8);
  const [availableLabels, setAvailableLabels] = useState<string[]>(demoMode ? DEMO_LABELS : []);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [labelsError, setLabelsError] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) return;

    const loadLabels = () => {
      setLabelsLoading(true);
      setLabelsError(null);
      fetchLabels()
        .then((data) => setAvailableLabels(data))
        .catch((err) => setLabelsError(err.message))
        .finally(() => setLabelsLoading(false));
    };

    loadLabels();
  }, []);

  const loadLabels = () => {
    setLabelsLoading(true);
    setLabelsError(null);
    fetchLabels()
      .then((data) => setAvailableLabels(data))
      .catch((err) => setLabelsError(err.message))
      .finally(() => setLabelsLoading(false));
  };

  const isValid =
    (mode === "epic" ? !!epicKey.trim() : !!parentKey.trim()) && labels.length > 0;

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({
      mode,
      epicKey: mode === "epic" ? epicKey.trim() : undefined,
      parentKey: mode === "story" ? parentKey.trim() : undefined,
      labels: labels.join(","),
      hoursAvailableToday,
    });
  };

  function buildLabelClause() {
    if (labels.length === 0) return ""
    if (labels.length === 1) return ` AND labels = "${labels[0]}"`
    const quoted = labels.map((l) => '"' + l + '"').join(", ")
    return ` AND labels in (${quoted})`
  }
  const labelClause = buildLabelClause();
  const jqlPreview =
    mode === "epic"
      ? `parentEpic = ${epicKey || "…"}${labelClause} AND statusCategory = "To Do"`
      : `parent = ${parentKey || "…"}${labelClause} AND statusCategory = "To Do"`;

  const getLoadingContent = () => (
    <div className="h-8 w-full rounded-lg border border-input bg-muted/50 flex items-center px-3 gap-2">
      <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground">
        Carregando labels...
      </span>
    </div>
  );

  const getErrorContent = () => (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          placeholder="ex: front-end"
          value={labels.join(", ")}
          onChange={(e) => setLabels(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />
      </div>
      <button
        type="button"
        onClick={loadLabels}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Tentar novamente
      </button>
    </div>
  );

  const getEmptyContent = () => (
    <div className="space-y-1">
      <Input
        placeholder="ex: front-end, back-end"
        value={labels.join(", ")}
        onChange={(e) => setLabels(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
      />
      <p className="text-xs text-muted-foreground">
        Nenhuma label encontrada no tracker — digite manualmente, separando por vírgula.
      </p>
    </div>
  );

  const getSelectContent = () => (
    <LabelCombobox value={labels} onChange={setLabels} options={availableLabels} />
  );

  const getLabelContent = () => {
    if (labelsLoading) return getLoadingContent();
    if (labelsError) return getErrorContent();
    if (availableLabels.length === 0) return getEmptyContent();
    return getSelectContent();
  };

  const labelContent = getLabelContent();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode("epic")}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            mode === "epic"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Epic
        </button>
        <button
          type="button"
          onClick={() => setMode("story")}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            mode === "story"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <GitBranch className="h-3.5 w-3.5" />
          História
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          {mode === "epic" ? "Chave da Epic" : "Chave da História pai"}
        </label>
        {mode === "epic" ? (
          <Input
            placeholder="ex: PROJ-123"
            value={epicKey}
            onChange={(e) => setEpicKey(e.target.value)}
          />
        ) : (
          <Input
            placeholder="ex: PROJ-456"
            value={parentKey}
            onChange={(e) => setParentKey(e.target.value)}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="label-select" className="text-sm font-medium">Label</label>
        <div id="label-select">
          {labelContent}
        </div>
      </div>

      {!demoMode && (
        <p className="text-xs text-muted-foreground font-mono truncate">
          {jqlPreview}
        </p>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          Horas disponíveis hoje
        </label>
        <Input
          type="number"
          min={1}
          max={24}
          value={hoursAvailableToday}
          onChange={(e) => setHoursAvailableToday(Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">
          Cards que cabem nesse orçamento vão para <strong>Concluir hoje</strong>. O restante vai para <strong>Deixar para depois</strong>.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/70" />
          <span>
            Os tempos estimados consideram sua aceleração real por IA, calculada automaticamente a partir do seu histórico.
          </span>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !isValid || labelsLoading}
        className={cn("w-full", (loading || labelsLoading) ? "cursor-not-allowed" : "cursor-pointer")}
      >
        {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
        {loading ? "Analisando..." : "Priorizar fila"}
      </Button>
    </form>
  );
}
