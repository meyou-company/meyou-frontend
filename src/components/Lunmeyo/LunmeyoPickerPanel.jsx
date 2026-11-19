import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LUNMEYO_CHARACTERS,
  listLunmeyoItems,
} from "../../constants/lunmeyoCatalog";
import LunmeyoMedia from "./LunmeyoMedia";
import "./LunmeyoPickerPanel.scss";

export default function LunmeyoPickerPanel({ type, onSelect }) {
  const { t } = useTranslation();
  const [character, setCharacter] = useState(LUNMEYO_CHARACTERS.LUN);
  const items = useMemo(
    () => listLunmeyoItems({ type, character }),
    [type, character],
  );

  return (
    <div className={`lunmeyoPicker lunmeyoPicker--${type}`}>
      <div className="lunmeyoPicker__chars" role="tablist" aria-label={t("lunmeyo.charactersLabel")}>
        <button
          type="button"
          role="tab"
          aria-selected={character === LUNMEYO_CHARACTERS.LUN}
          className={character === LUNMEYO_CHARACTERS.LUN ? "is-on" : ""}
          onClick={() => setCharacter(LUNMEYO_CHARACTERS.LUN)}
        >
          {t("lunmeyo.characters.lun")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={character === LUNMEYO_CHARACTERS.ROUND}
          className={character === LUNMEYO_CHARACTERS.ROUND ? "is-on" : ""}
          onClick={() => setCharacter(LUNMEYO_CHARACTERS.ROUND)}
        >
          {t("lunmeyo.characters.round")}
        </button>
      </div>
      <div className="lunmeyoPicker__grid">
        {items.length === 0 ? (
          <p className="lunmeyoPicker__empty">{t("lunmeyo.empty")}</p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="lunmeyoPicker__cell"
              onClick={() => onSelect?.(item)}
              aria-label={t(item.nameKey, { defaultValue: item.id })}
            >
              <LunmeyoMedia item={item} size="picker" autoPlay={item.type === "mp4"} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
