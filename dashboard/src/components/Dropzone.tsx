"use client";

import { useCallback, useRef, useState } from "react";
import clsx from "clsx";

export function Dropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      onFiles(Array.from(fileList));
    },
    [onFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        "cursor-pointer rounded-2xl border-2 border-dashed transition-colors flex flex-col items-center justify-center text-center gap-3 py-16 px-6",
        dragging ? "border-sky bg-sky/5" : "border-[#c9d2ef] bg-white hover:border-sky"
      )}
    >
      <div className="text-4xl">📥</div>
      <div className="text-lg font-black text-navy">اسحب تقارير رواء هنا أو اختر الملفات</div>
      <div className="text-xs text-muted">يدعم ملفات CSV / XLS / XLSX — يمكن رفع عدة ملفات دفعة واحدة</div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".csv,.xls,.xlsx"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
