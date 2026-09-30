import { useState } from "react";

import type { ExampleSection } from "../lib/example-files";

interface Props {
  sections: ExampleSection[];
  activePath: string | null;
  onOpen: (path: string) => void;
}

function fileNameOf(path: string): string {
  return path.split("/").pop() ?? path;
}

function extOf(name: string): string {
  return name.includes(".") ? name.split(".").pop()! : "";
}

function folderOf(path: string): string {
  const parts = path.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") : "(root)";
}

function FolderIcon() {
  return (
    <svg className="folder-ico" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M1.5 4a1 1 0 011-1h3l1.2 1.5h6.8a1 1 0 011 1V12a1 1 0 01-1 1h-11a1 1 0 01-1-1V4z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="ic" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 1.5h6L13 5.5V14a.5.5 0 01-.5.5h-9A.5.5 0 013 14V2a.5.5 0 010-.5z" />
      <path d="M9 1.5V5h4" />
    </svg>
  );
}

interface FolderProps {
  folder: string;
  files: { path: string; ext: string; name: string }[];
  activePath: string | null;
  onOpen: (path: string) => void;
}

function Folder({ folder, files, activePath, onOpen }: FolderProps) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button
        type="button"
        className={`tree-folder${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="chev">▸</span>
        <FolderIcon />
        <span className="name">{folder}/</span>
      </button>
      <div className={`tree-children${open ? "" : " collapsed"}`}>
        {files.map((f) => (
          <button
            key={f.path}
            type="button"
            className={`tree-file${f.path === activePath ? " active" : ""}`}
            onClick={() => onOpen(f.path)}
          >
            <FileIcon />
            <span className="file-name">{f.name}</span>
            <span className={`ext ${f.ext}`}>{f.ext.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export function FileTree({ sections, activePath, onOpen }: Props) {
  return (
    <>
      {sections.map((sec) => {
        const byFolder = new Map<
          string,
          { path: string; ext: string; name: string }[]
        >();
        for (const f of sec.files) {
          const folder = folderOf(f.path);
          const name = fileNameOf(f.path);
          const ext = extOf(name);
          if (!byFolder.has(folder)) byFolder.set(folder, []);
          byFolder.get(folder)!.push({ path: f.path, ext, name });
        }
        return (
          <div key={sec.section} className="tree-section">
            <div className="tree-heading">
              <span>{sec.section}</span>
              <span className="count">{sec.files.length}</span>
            </div>
            {Array.from(byFolder.entries()).map(([folder, files]) => (
              <Folder
                key={folder}
                folder={folder}
                files={files}
                activePath={activePath}
                onOpen={onOpen}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}
