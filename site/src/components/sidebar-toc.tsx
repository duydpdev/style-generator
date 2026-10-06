import type { Chapter } from "../lib/chapters";

interface Props {
  chapters: Chapter[];
  activeIndex: number;
  onJump: (id: string) => void;
}

/**
 *
 * @param root0
 * @param root0.chapters
 * @param root0.activeIndex
 * @param root0.onJump
 */
export function SidebarToc({ chapters, activeIndex, onJump }: Readonly<Props>) {
  return (
    <aside className="toc-aside">
      <div className="toc-sticky">
        <div className="toc-label">Table of contents</div>
        <ol className="toc">
          {chapters.map((ch, i) => (
            <li key={ch.id} className="contents">
              <button
                type="button"
                className={`toc-item${i === activeIndex ? " active" : ""}`}
                onClick={() => {
                  onJump(ch.id);
                }}
              >
                <span className="num">{ch.num}</span>
                <span className="ttl">{ch.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="toc-foot">
          <div className="row">
            <span>License</span>
            <span>MIT</span>
          </div>
          <div className="row">
            <span>Author</span>
            <a
              href="https://duydp.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              duydp ↗
            </a>
          </div>
          <div className="row">
            <span>Source</span>
            <a
              href="https://github.com/duydpdev/style-generator"
              target="_blank"
              rel="noopener noreferrer"
            >
              github ↗
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
