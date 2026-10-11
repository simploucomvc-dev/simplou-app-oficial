import { supabase } from "@/lib/supabase";

const BUCKET = "transaction-attachments";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export const ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.pdf";

// A extensão vem do tipo do arquivo, nunca do nome enviado pelo usuário
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

export function validateAttachment(file: File): string | null {
  if (!EXTENSION_BY_MIME[file.type]) return "Apenas JPG, PNG e PDF são permitidos.";
  if (file.size > ATTACHMENT_MAX_BYTES) return "O arquivo deve ter no máximo 2MB.";
  return null;
}

export async function uploadTransactionAttachment(params: {
  userId: string;
  transactionId: string;
  file: File;
  previousPath?: string | null;
}): Promise<string> {
  const { userId, transactionId, file, previousPath } = params;
  const validationError = validateAttachment(file);
  if (validationError) throw new Error(validationError);

  const path = `${userId}/${transactionId}.${EXTENSION_BY_MIME[file.type]}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from("transactions")
    .update({ attachment_path: path, attachment_url: null })
    .eq("id", transactionId);
  if (updateError) throw updateError;

  // Trocar JPG por PDF (ou vice-versa) gera outro caminho: remove o arquivo antigo
  if (previousPath && previousPath !== path) {
    await supabase.storage.from(BUCKET).remove([previousPath]);
  }

  return path;
}

export async function getAttachmentSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) throw error ?? new Error("Não foi possível gerar o link do anexo");
  return data.signedUrl;
}
