"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createMaterial,
  deleteMaterial,
  getMaterialDownloadUrl,
} from "@/lib/actions/material";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Material } from "@/types";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MATERIALS_BUCKET = "class-materials";

type Props = {
  classId: string;
  materials: Material[];
  isInstructor: boolean;
};

export default function MaterialsList({
  classId,
  materials,
  isInstructor,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    if (!file) {
      setError("파일을 선택해주세요.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("파일 크기는 50MB를 넘을 수 없습니다.");
      return;
    }

    setUploading(true);

    const supabase = createClient();
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${classId}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setUploading(false);
      setError(`업로드 실패: ${uploadError.message}`);
      return;
    }

    const result = await createMaterial(classId, {
      title: title.trim(),
      description: description.trim() || null,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
    });

    setUploading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    reset();
    setShowForm(false);
    router.refresh();
  }

  async function handleDownload(materialId: string) {
    setDownloadingId(materialId);
    const result = await getMaterialDownloadUrl(materialId);
    setDownloadingId(null);
    if (!result.success) {
      alert(result.error);
      return;
    }
    window.location.href = result.data.url;
  }

  function handleDelete(materialId: string) {
    if (!confirm("이 자료를 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const res = await deleteMaterial(materialId, classId);
      if (!res.success) alert(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {isInstructor && (
        <div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (showForm) reset();
              setShowForm((v) => !v);
            }}
          >
            {showForm ? "닫기" : "+ 자료 업로드"}
          </Button>
          {showForm && (
            <form
              onSubmit={handleUpload}
              className="mt-3 p-4 border rounded-lg bg-muted/40 space-y-3"
            >
              <div className="space-y-1">
                <Label htmlFor="material-title">제목</Label>
                <Input
                  id="material-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 1주차 강의 자료"
                  disabled={uploading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="material-desc">설명 (선택)</Label>
                <Textarea
                  id="material-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="자료에 대한 간단한 설명"
                  disabled={uploading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="material-file">파일 (최대 50MB)</Label>
                <Input
                  id="material-file"
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={uploading}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button size="sm" type="submit" disabled={uploading}>
                {uploading ? "업로드 중..." : "업로드"}
              </Button>
            </form>
          )}
        </div>
      )}

      {materials.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          등록된 자료가 없습니다.
        </p>
      ) : (
        materials.map((m) => (
          <Card key={m.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-medium">
                  {m.title}
                </CardTitle>
                {isInstructor && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive shrink-0 h-7 px-2"
                    onClick={() => handleDelete(m.id)}
                  >
                    삭제
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(m.created_at).toLocaleDateString("ko-KR")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {m.description && (
                <p className="text-sm whitespace-pre-wrap">{m.description}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">
                  {m.file_name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(m.file_size)}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={downloadingId === m.id}
                onClick={() => handleDownload(m.id)}
              >
                {downloadingId === m.id ? "준비 중..." : "다운로드"}
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
