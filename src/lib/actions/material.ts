"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isInstructor } from "@/lib/auth/role";
import type { ActionResult, Material } from "@/types";

const MATERIALS_BUCKET = "class-materials";
const SIGNED_URL_TTL = 60 * 10;

async function requireInstructorOfClass(classId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isInstructor(user)) {
    throw new Error("권한이 없습니다.");
  }
  const { data: cls } = await supabase
    .from("classes")
    .select("id, instructor_id")
    .eq("id", classId)
    .single();
  if (!cls || cls.instructor_id !== user.id) {
    throw new Error("해당 수업의 강사가 아닙니다.");
  }
  return { supabase, user };
}

export async function createMaterial(
  classId: string,
  metadata: {
    title: string;
    description: string | null;
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string | null;
  },
): Promise<ActionResult<Material>> {
  try {
    const { supabase, user } = await requireInstructorOfClass(classId);

    const title = metadata.title.trim();
    if (!title) return { success: false, error: "제목을 입력해주세요." };
    if (!metadata.file_path)
      return { success: false, error: "업로드된 파일이 없습니다." };

    const expectedPrefix = `${classId}/`;
    if (!metadata.file_path.startsWith(expectedPrefix)) {
      return { success: false, error: "파일 경로가 올바르지 않습니다." };
    }

    const { data, error } = await supabase
      .from("materials")
      .insert({
        class_id: classId,
        uploader_id: user.id,
        title,
        description: metadata.description?.trim() || null,
        file_path: metadata.file_path,
        file_name: metadata.file_name,
        file_size: metadata.file_size,
        mime_type: metadata.mime_type,
      })
      .select()
      .single();

    if (error) {
      await supabase.storage.from(MATERIALS_BUCKET).remove([metadata.file_path]);
      return { success: false, error: error.message };
    }

    revalidatePath(`/classes/${classId}`);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteMaterial(
  materialId: string,
  classId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireInstructorOfClass(classId);

    const { data: material } = await supabase
      .from("materials")
      .select("file_path")
      .eq("id", materialId)
      .eq("class_id", classId)
      .single();
    if (!material) return { success: false, error: "자료를 찾을 수 없습니다." };

    const { error: storageError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .remove([material.file_path]);
    if (storageError) {
      return { success: false, error: storageError.message };
    }

    const { error } = await supabase
      .from("materials")
      .delete()
      .eq("id", materialId);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/classes/${classId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getMaterials(classId: string): Promise<Material[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("materials")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getMaterialDownloadUrl(
  materialId: string,
): Promise<ActionResult<{ url: string; file_name: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "로그인이 필요합니다." };

    const { data: material } = await supabase
      .from("materials")
      .select("file_path, file_name")
      .eq("id", materialId)
      .single();
    if (!material) return { success: false, error: "자료를 찾을 수 없습니다." };

    const { data, error } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .createSignedUrl(material.file_path, SIGNED_URL_TTL, {
        download: material.file_name,
      });
    if (error || !data) {
      return { success: false, error: error?.message ?? "다운로드 URL 발급 실패" };
    }

    return {
      success: true,
      data: { url: data.signedUrl, file_name: material.file_name },
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
