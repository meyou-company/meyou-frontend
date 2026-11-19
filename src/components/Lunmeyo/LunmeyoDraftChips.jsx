import { useTranslation } from "react-i18next";
import LunmeyoMedia from "./LunmeyoMedia";
import "./LunmeyoDraftChips.scss";

export default function LunmeyoDraftChips({ stickerIds = [], onRemove }) {
  const { t } = useTranslation();
  if (!stickerIds.length) return null;

  return (
    <ul className="lunmeyoDraftChips" aria-label={t("lunmeyo.sticker")}>
      {stickerIds.map((id, index) => (
        <li key={`${id}-${index}`} className="lunmeyoDraftChips__item">
          <LunmeyoMedia itemId={id} size="picker" />
          <button
            type="button"
            className="lunmeyoDraftChips__remove"
            onClick={() => onRemove?.(index)}
            aria-label={t("lunmeyo.removeSticker")}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
