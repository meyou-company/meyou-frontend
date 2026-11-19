import { splitLunmeyoText } from "../../utils/lunmeyoToken";
import LunmeyoMedia from "./LunmeyoMedia";

export default function LunmeyoRichText({ text, className = "" }) {
  const parts = splitLunmeyoText(text);
  if (!parts.length) return null;

  return (
    <span className={`lunmeyoRichText ${className}`.trim()}>
      {parts.map((part, index) =>
        part.type === "sticker" ? (
          <span key={`${part.id}-${index}`} className="lunmeyoRichText__sticker">
            <LunmeyoMedia itemId={part.id} size="inline" />
          </span>
        ) : (
          <span key={`t-${index}`}>{part.value}</span>
        ),
      )}
    </span>
  );
}
