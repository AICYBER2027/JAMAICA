"use client";

export type UploadKind = "photo" | "frame" | "model" | "category" | "tryonModel";

/** Uploads one file through a signed ticket and returns its public URL. Reports progress 0..1. */
export async function uploadFile(file: File, kind: UploadKind, opts: { folder?: string; onProgress?: (p: number) => void } = {}): Promise<string> {
  if (kind === "model") {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (String.fromCharCode(...head) !== "glTF") throw new Error(`${file.name} isn't a GLB file. Export the model as binary glTF (.glb).`);
  }
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, filename: file.name, contentType: file.type || "application/octet-stream", size: file.size, folder: opts.folder }),
  });
  const ticket = await res.json();
  if (!res.ok) throw new Error(ticket.error ?? "Upload refused.");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(ticket.method, ticket.url);
    for (const [k, v] of Object.entries(ticket.headers as Record<string, string>)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && opts.onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `Upload failed (${xhr.status}).`;
      try {
        msg = JSON.parse(xhr.responseText).error ?? msg;
      } catch {}
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading. Check the connection and try again."));
    xhr.send(file);
  });
  opts.onProgress?.(1);
  return ticket.publicUrl as string;
}
