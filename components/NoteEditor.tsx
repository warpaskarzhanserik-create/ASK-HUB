"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { marked } from "marked";
import type { Note } from "@/lib/db";
import { deleteNote, saveNote } from "@/app/actions";
import { uploadFile } from "@/lib/upload-client";

export default function NoteEditor({ note }: { note: Note }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [mode, setMode] = useState<"edit" | "view">(note.body ? "view" : "edit");
  const [status, setStatus] = useState("");
  const [, start] = useTransition();
  const ta = useRef<HTMLTextAreaElement>(null);
  const dirty = title !== note.title || body !== note.body;

  // autosave 1.5s after typing stops
  useEffect(() => {
    if (!dirty) return;
    setStatus("…");
    const t = setTimeout(() => start(async () => { await saveNote(note.id, note.project_id, title, body); setStatus("Сохранено"); }), 1500);
    return () => clearTimeout(t);
  }, [title, body, dirty, note.id, note.project_id]);

  const insertImage = async (file: File) => {
    setStatus("Загрузка картинки…");
    try {
      const r = await uploadFile(file, `p${note.project_id}/notes`);
      const el = ta.current;
      const pos = el?.selectionStart ?? body.length;
      setBody((b) => `${b.slice(0, pos)}\n![](${r.url})\n${b.slice(pos)}`);
      setStatus("");
    } catch (e) {
      setStatus(`Ошибка: ${(e as Error).message}`);
    }
  };

  return (
    <div className="stack editor">
      <div className="row">
        <input className="title-input grow" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название заметки" />
        <span className="muted small">{status}</span>
        <button onClick={() => setMode(mode === "edit" ? "view" : "edit")}>{mode === "edit" ? "Просмотр" : "Редактировать"}</button>
        <button className="danger" onClick={() => confirm("Удалить заметку?") && start(() => deleteNote(note.id, note.project_id))}>Удалить</button>
      </div>
      {mode === "edit" ? (
        <>
          <textarea
            ref={ta}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onPaste={(e) => {
              const f = e.clipboardData.files[0];
              if (f?.type.startsWith("image/")) { e.preventDefault(); insertImage(f); }
            }}
            placeholder={"Пиши в Markdown:\n# Заголовок\n- пункт списка\n- [ ] задача\n**жирный**, *курсив*, [ссылка](https://...)\n\nКартинку можно вставить из буфера."}
          />
          <span className="muted small">Markdown. Картинки вставляются через Ctrl/Cmd+V. Сохраняется автоматически.</span>
        </>
      ) : (
        <div
          className="md card pad"
          onDoubleClick={() => setMode("edit")}
          dangerouslySetInnerHTML={{ __html: body ? (marked.parse(body, { async: false, gfm: true, breaks: true }) as string) : "<p class='muted'>Пусто. Нажми «Редактировать».</p>" }}
        />
      )}
    </div>
  );
}
