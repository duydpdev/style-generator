import type { ReactNode } from "react";

interface Props {
  badge: string;
  title: ReactNode;
  body: ReactNode;
}

/**
 *
 * @param root0
 * @param root0.badge
 * @param root0.title
 * @param root0.body
 */
export function KeyPoint({ badge, title, body }: Props) {
  return (
    <div className="kp">
      <span className="badge">{badge}</span>
      <div>
        <h5>{title}</h5>
        <p>{body}</p>
      </div>
    </div>
  );
}
