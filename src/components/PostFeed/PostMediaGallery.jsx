import { useState, useEffect } from "react";
import "./PostMediaGallery.scss";

function normalizeImages(mediaItems = []) {
  return (Array.isArray(mediaItems) ? mediaItems : [])
    .filter((m) => m?.type !== "VIDEO" && typeof m?.url === "string" && m.url)
    .map((m) => m.url);
}

export default function PostMediaGallery({ mediaItems = [], onOpenLightbox }) {

const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);

  const images = normalizeImages(mediaItems);
  if (!images.length) return null;

  const total = images.length;
  const hidden = Math.max(0, total - 5);

  const openAt = (index) => {
    if (typeof onOpenLightbox === "function") onOpenLightbox(images, index);
  };

  if (total === 1) {
    return (
      <div className="pmg pmg--single">
        <button type="button" className="pmg__tile pmg__tile--single" onClick={() => openAt(0)}>
          <img src={images[0]} alt="" className="pmg__img" />
        </button>
      </div>
    );
  }

  if (total === 2) {
    return (
      <div className="pmg pmg--two">
        {images.slice(0, 2).map((url, idx) => (
          <button key={`${url}-${idx}`} type="button" className="pmg__tile" onClick={() => openAt(idx)}>
            <img src={url} alt="" className="pmg__img" />
          </button>
        ))}
      </div>
    );
  }

  if (total === 3) {
    return (
      <div className="pmg pmg--three">
        <button type="button" className="pmg__tile pmg__tile--main" onClick={() => openAt(0)}>
          <img src={images[0]} alt="" className="pmg__img" />
        </button>
        <div className="pmg__side pmg__side--two">
          {images.slice(1, 3).map((url, idx) => (
            <button key={`${url}-${idx}`} type="button" className="pmg__tile" onClick={() => openAt(idx + 1)}>
              <img src={url} alt="" className="pmg__img" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (total === 4) {
    const mobileHidden = 1;
    return (
      <div className="pmg pmg--four">
        <button type="button" className="pmg__tile pmg__tile--main" onClick={() => openAt(0)}>
          <img src={images[0]} alt="" className="pmg__img" />
        </button>
        <div className="pmg__side pmg__side--three">
          {images.slice(1, 4).map((url, idx) => (
            <button key={`${url}-${idx}`} type="button" className="pmg__tile" onClick={() => openAt(idx + 1)}>
              <img src={url} alt="" className="pmg__img" />
              {idx === 1 && mobileHidden > 0 && (
                <span className="pmg__overlay pmg__overlay--mobile">+{mobileHidden}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (total === 5) {
  return (
    <div className="pmg pmg--five">
      <button type="button" className="pmg__tile pmg__tile--main" onClick={() => openAt(0)}>
        <img src={images[0]} alt="" className="pmg__img" />
      </button>
      <div className="pmg__side pmg__side--grid4">
        {images.slice(1, 5).map((url, idx) => (
          <button key={`${url}-${idx}`} type="button" className="pmg__tile" onClick={() => openAt(idx + 1)}>
            <img src={url} alt="" className="pmg__img" />
          </button>
        ))}
      </div>
    </div>
  );
}

  const hiddenDesktop = Math.max(0, total - 5);
  const hiddenMobile = Math.max(0, total - 5);

const visible = isMobile
  ? images.slice(1, 3)
  : images.slice(1, 5);

  return (
    <div className="pmg pmg--fivePlus">
      <button type="button" className="pmg__tile pmg__tile--main" onClick={() => openAt(0)}>
        <img src={images[0]} alt="" className="pmg__img" />
      </button>
      <div className="pmg__side pmg__side--grid4">
         {visible.map((url, idx) => (
          <button key={`${url}-${idx}`} type="button" className="pmg__tile" onClick={() => openAt(idx + 1)}>
            <img src={url} alt="" className="pmg__img" />
            {idx === visible.length - 1 && hiddenDesktop > 0 && (
              <span className="pmg__overlay pmg__overlay--desktop">+{hiddenDesktop}</span>
            )}
            {idx === 1 && hiddenMobile > 0 && (
              <span className="pmg__overlay pmg__overlay--mobile">+{hiddenMobile}</span>
            )}
          </button>
     ))}
      </div>
    </div>
  );
}
