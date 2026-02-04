import { useState } from "react";
import Cropper from "react-easy-crop";
import "./AvatarCropModal.scss";

export default function AvatarCropModal({ src, onClose, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);

  return (
    <div className="cropm" role="dialog" aria-modal="true">
      <div className="cropm__overlay" onClick={onClose} />
      <div className="cropm__panel">
        <div className="cropm__title">Редагування фото</div>

        <div className="cropm__cropArea">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(area, areaPixels) => setCroppedPixels(areaPixels)}
          />
        </div>

        <div className="cropm__controls">
          <div className="cropm__label">Зум</div>
          <input
            className="cropm__range"
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </div>

        <div className="cropm__actions">
          <button type="button" className="cropm__btn ghost" onClick={onClose}>
            Скасувати
          </button>
          <button
            type="button"
            className="cropm__btn primary"
            onClick={() => onConfirm(croppedPixels)}
            disabled={!croppedPixels}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
