"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import TrendChart from "../TrendChart";

interface Observation {
  id: string;
  note: string | null;
  greenRatio: number;
  yellowBrownRatio: number;
  otherRatio: number;
  avgBrightness: number;
  takenAt: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface PointDetail {
  id: string;
  name: string;
  memo: string | null;
  createdBy: { id: string; name: string };
  observations: Observation[];
}

export default function ObservationPointDetailPage() {
  const params = useParams<{ id: string }>();
  const pointId = params.id;

  const [point, setPoint] = useState<PointDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPoint = useCallback(async () => {
    const res = await fetch(`/api/observation-points/${pointId}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPoint(data);
    setLoading(false);
  }, [pointId]);

  useEffect(() => {
    loadPoint();
  }, [loadPoint]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("photo", file);
      if (note.trim()) formData.append("note", note.trim());

      const res = await fetch(`/api/observation-points/${pointId}/observations`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "アップロードに失敗しました。");
        return;
      }

      setFile(null);
      setPreviewUrl(null);
      setNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadPoint();
    } catch {
      setErrorMessage("通信エラーが発生しました。");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteObservation(obsId: string) {
    if (!confirm("この観測記録を削除しますか？")) return;
    const res = await fetch(`/api/observation-points/${pointId}/observations/${obsId}`, {
      method: "DELETE",
    });
    if (res.ok) await loadPoint();
  }

  if (loading) return <p className="text-sm text-gray-500">読み込み中…</p>;
  if (notFound || !point) {
    return <div className="alert-error">観測地点が見つかりません。</div>;
  }

  const chartPoints = [...point.observations]
    .sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime())
    .map((o) => ({ takenAt: o.takenAt, greenRatio: o.greenRatio, avgBrightness: o.avgBrightness }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">{point.name}</h1>
        {point.memo && <p className="text-sm text-gray-500 mt-0.5">{point.memo}</p>}
        <p className="text-xs text-gray-400 mt-0.5">登録者：{point.createdBy.name}</p>
      </div>

      <TrendChart points={chartPoints} />

      <form onSubmit={handleUpload} className="card card-body space-y-3">
        <h2 className="text-sm font-medium text-gray-800">写真を記録する</h2>

        {errorMessage && <div className="alert-error">{errorMessage}</div>}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="form-input"
        />

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="プレビュー" className="w-full max-h-64 object-contain rounded-lg border border-gray-200" />
        )}

        <textarea
          className="form-input"
          placeholder="メモ（任意）：生育状況や気づいた点など"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={2}
        />

        <button type="submit" className="btn-success w-full" disabled={!file || uploading}>
          {uploading ? "解析中…" : "アップロードして解析"}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-gray-800">観測履歴（{point.observations.length}件）</h2>

        {point.observations.length === 0 ? (
          <div className="card card-body text-center text-gray-500 py-8">
            <p>まだ記録がありません。最初の写真をアップロードしましょう。</p>
          </div>
        ) : (
          <div className="space-y-2">
            {point.observations.map((o) => (
              <div key={o.id} className="card card-body flex gap-3">
                <a
                  href={`/api/observation-points/${pointId}/observations/${o.id}/image`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-shrink-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/observation-points/${pointId}/observations/${o.id}/image`}
                    alt=""
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                </a>
                <div className="flex-1 min-w-0 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">
                      {new Date(o.takenAt).toLocaleString("ja-JP")}
                    </span>
                    <button
                      onClick={() => handleDeleteObservation(o.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                      type="button"
                    >
                      削除
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="badge-use">緑被率 {Math.round(o.greenRatio * 100)}%</span>
                    <span className="badge-deadline">黄褐色 {Math.round(o.yellowBrownRatio * 100)}%</span>
                    <span className="badge-not-use">明るさ {Math.round(o.avgBrightness)}</span>
                  </div>
                  {o.note && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{o.note}</p>}
                  <p className="text-xs text-gray-400 mt-1">記録者：{o.user.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
