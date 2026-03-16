"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const MAX_IMAGES = 5;

type PreviewImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type DiagnosisHistoryItem = {
  id: string;
  prompt: string;
  result: string;
  created_at: string;
  images: string[];
};

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  const possibleKeys = [
    "token",
    "authToken",
    "jwt",
    "accessToken",
    "arx_token",
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  return null;
}

function formatDate(value: string) {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function normalizeHistoryItem(item: any): DiagnosisHistoryItem {
  return {
    id: typeof item?.id === "string" ? item.id : "",
    prompt: typeof item?.prompt === "string" ? item.prompt : "",
    result: typeof item?.result === "string" ? item.result : "",
    created_at: typeof item?.created_at === "string" ? item.created_at : "",
    images: Array.isArray(item?.images)
      ? item.images.filter((value: unknown): value is string => typeof value === "string")
      : [],
  };
}

export default function DiagnosePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [result, setResult] = useState("");
  const [savedImages, setSavedImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [history, setHistory] = useState<DiagnosisHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null
  );

  useEffect(() => {
    return () => {
      images.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });
    };
  }, [images]);

  const loadHistory = useCallback(async () => {
    const token = getStoredToken();

    if (!token) {
      setHistory([]);
      setHistoryError("You must be logged in to view diagnosis history.");
      return;
    }

    try {
      setIsLoadingHistory(true);
      setHistoryError("");

      const response = await fetch("/api/diagnose/history", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || data?.details || "Failed to load history."
        );
      }

      const diagnoses = Array.isArray(data?.diagnoses)
        ? data.diagnoses.map(normalizeHistoryItem)
        : [];

      setHistory(diagnoses);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load history.";
      setHistoryError(message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const imageCountText = useMemo(() => {
    return `${images.length}/${MAX_IMAGES} images`;
  }, [images.length]);

  const selectedHistoryItem = useMemo(() => {
    if (!selectedHistoryId) return null;
    return history.find((item) => item.id === selectedHistoryId) || null;
  }, [history, selectedHistoryId]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    if (!fileList) return;

    setError("");

    const incomingFiles = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/")
    );

    if (incomingFiles.length === 0) {
      event.target.value = "";
      return;
    }

    const remainingSlots = MAX_IMAGES - images.length;

    if (remainingSlots <= 0) {
      setError(`You can upload up to ${MAX_IMAGES} images.`);
      event.target.value = "";
      return;
    }

    const filesToAdd = incomingFiles.slice(0, remainingSlots).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    if (incomingFiles.length > remainingSlots) {
      setError(`Only ${MAX_IMAGES} images are allowed. Extra files were skipped.`);
    }

    setImages((prev) => [...prev, ...filesToAdd]);
    event.target.value = "";
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  }

  function openHistoryItem(item: DiagnosisHistoryItem) {
    setSelectedHistoryId(item.id);
    setResult(item.result);
    setSavedImages(item.images);
    setPrompt(item.prompt);
  }

  function startNewDiagnosis() {
    setSelectedHistoryId(null);
    setPrompt("");
    setResult("");
    setSavedImages([]);
    setError("");

    setImages((prev) => {
      prev.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setResult("");
    setSavedImages([]);
    setSelectedHistoryId(null);

    if (!prompt.trim()) {
      setError("Please describe the issue first.");
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("prompt", prompt.trim());

      images.forEach((image) => {
        formData.append("images", image.file);
      });

      const token = getStoredToken();

      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || data?.details || "Failed to generate diagnosis."
        );
      }

      setResult(typeof data?.result === "string" ? data.result : "");
      setSavedImages(
        Array.isArray(data?.images)
          ? data.images.filter((value: unknown): value is string => typeof value === "string")
          : []
      );

      await loadHistory();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="w-full border-b border-white/10 bg-black/30 lg:w-[360px] lg:border-b-0 lg:border-r">
          <div className="sticky top-0 flex h-full flex-col">
            <div className="border-b border-white/10 p-4 sm:p-5">
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-300/90">
                  AI Workspace
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                  Diagnose
                </h1>
                <p className="mt-2 text-sm text-neutral-400">
                  Premium white-label AI support for contractors across all trades.
                </p>
              </div>

              <button
                type="button"
                onClick={startNewDiagnosis}
                className="w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400"
              >
                New diagnosis
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  History
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Recent saved diagnoses
                </p>
              </div>

              <button
                type="button"
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingHistory ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {historyError && (
                <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {historyError}
                </div>
              )}

              {isLoadingHistory && history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-neutral-500">
                  Loading history...
                </div>
              ) : history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-neutral-500">
                  No saved diagnoses yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => {
                    const isActive = selectedHistoryId === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openHistoryItem(item)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isActive
                            ? "border-orange-400/50 bg-orange-500/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                              {formatDate(item.created_at)}
                            </p>
                            <p className="mt-2 line-clamp-2 text-sm font-medium text-white">
                              {truncateText(item.prompt, 110)}
                            </p>
                          </div>

                          <div className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-neutral-300">
                            {item.images.length} img
                          </div>
                        </div>

                        {item.images.length > 0 && (
                          <div className="mt-3 grid grid-cols-4 gap-2">
                            {item.images.slice(0, 4).map((url, index) => (
                              <div
                                key={`${item.id}-${url}-${index}`}
                                className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/40"
                              >
                                <img
                                  src={url}
                                  alt={`History thumbnail ${index + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="mt-3 text-xs leading-6 text-neutral-400">
                          {truncateText(item.result, 140)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="flex-1">
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-4 py-4 sm:px-6 sm:py-6">
            <div className="mb-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-2xl backdrop-blur sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-300/90">
                    Assistant
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                    Contractor AI diagnosis assistant
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-neutral-400">
                    Upload site photos, describe the issue, and generate a professional,
                    neutral diagnosis suitable for internal review or client reporting.
                  </p>
                </div>

                <div className="flex gap-2">
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-neutral-300">
                    White-label output
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-neutral-300">
                    Up to 5 images
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-4 shadow-2xl sm:p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-sm font-semibold text-orange-200">
                    AI
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      Diagnosis assistant
                    </p>
                    <p className="mt-1 text-sm leading-6 text-neutral-400">
                      Describe the issue clearly and add up to 5 photos for better visual analysis.
                    </p>
                  </div>
                </div>

                {selectedHistoryItem && (
                  <div className="mb-4 rounded-2xl border border-orange-400/20 bg-orange-500/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-200">
                      Viewing saved diagnosis
                    </p>
                    <p className="mt-2 text-sm text-neutral-200">
                      {formatDate(selectedHistoryItem.created_at)}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="prompt"
                      className="mb-2 block text-sm font-medium text-neutral-200"
                    >
                      Issue description
                    </label>

                    <textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Example: Water staining is visible below the upstairs bathroom ceiling. Please assess likely cause, urgency, visible evidence, and recommended next steps."
                      className="min-h-[170px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-neutral-200">
                          Site photos
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Mobile and desktop uploads supported
                        </p>
                      </div>

                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300">
                        {imageCountText}
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      id="images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="block w-full text-sm text-neutral-300 file:mr-4 file:rounded-xl file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-orange-400"
                    />

                    {images.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                        {images.map((image) => (
                          <div
                            key={image.id}
                            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                          >
                            <div className="aspect-square overflow-hidden bg-black/40">
                              <img
                                src={image.previewUrl}
                                alt={image.file.name}
                                className="h-full w-full object-cover"
                              />
                            </div>

                            <div className="space-y-2 p-2">
                              <p className="truncate text-xs text-neutral-300">
                                {image.file.name}
                              </p>

                              <button
                                type="button"
                                onClick={() => removeImage(image.id)}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:bg-white/10"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? "Generating diagnosis..." : "Generate diagnosis"}
                    </button>

                    <button
                      type="button"
                      onClick={startNewDiagnosis}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
                    >
                      Clear
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-4 shadow-2xl sm:p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white">
                    R
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      Diagnosis result
                    </p>
                    <p className="mt-1 text-sm leading-6 text-neutral-400">
                      Professional output with neutral wording for contractor and client-facing use.
                    </p>
                  </div>
                </div>

                {isSubmitting && (
                  <div className="mb-4 rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-orange-300" />
                      <p className="text-sm text-orange-100">
                        Analyzing prompt and images...
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                      <div className="h-4 w-11/12 animate-pulse rounded bg-white/10" />
                      <div className="h-4 w-10/12 animate-pulse rounded bg-white/10" />
                      <div className="h-4 w-8/12 animate-pulse rounded bg-white/10" />
                    </div>
                  </div>
                )}

                {savedImages.length > 0 && (
                  <div className="mb-5">
                    <p className="mb-3 text-sm font-medium text-neutral-200">
                      Saved diagnosis images
                    </p>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                      {savedImages.map((url, index) => (
                        <a
                          key={`${url}-${index}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-orange-400/40"
                        >
                          <div className="aspect-square overflow-hidden bg-black/40">
                            <img
                              src={url}
                              alt={`Saved diagnosis image ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {result ? (
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-neutral-200">
                      {result}
                    </pre>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-sm text-neutral-500">
                    Your diagnosis result will appear here after submission, or when you open a saved diagnosis from history.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}