interface Props {
  src: string;
  pathLabel: string;
  meta: string;
  title: string;
}

export function PreviewFrame({ src, pathLabel, meta, title }: Readonly<Props>) {
  return (
    <div className="preview-stage">
      <div className="preview-frame-wrap">
        <div className="frame-titlebar">
          <div className="traffic">
            <span />
            <span />
            <span />
          </div>
          <div className="url-pill">
            <svg className="ic lock" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="3" y="7" width="10" height="7" rx="1" />
              <path d="M5 7V5a3 3 0 016 0v2" />
            </svg>
            <span>localhost:5174</span>
            <span className="path">{pathLabel}</span>
          </div>
          <div className="frame-meta">{meta}</div>
        </div>
        <iframe
          key={src}
          className="preview-iframe"
          src={src}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-forms"
          loading="lazy"
        />
      </div>
    </div>
  );
}
