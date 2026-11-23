import { useEffect, useState } from "react";

function EducationalAdBanner({ className = "" }) {
  const [loaded, setLoaded] = useState(false);
  const client = process.env.REACT_APP_ADSENSE_CLIENT;
  const slot = process.env.REACT_APP_ADSENSE_SLOT;
  const isDevelopment = window.location.hostname === "localhost";
  const canLoadAd = Boolean(client && slot) && !isDevelopment;

  useEffect(() => {
    if (!canLoadAd) return;

    if (!document.querySelector(`script[data-ad-client="${client}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
      script.dataset.adClient = client;
      document.head.appendChild(script);
    }

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      setLoaded(true);
    } catch {
      setLoaded(false);
    }
  }, [canLoadAd, client]);

  return (
    <aside className={`educational-ad ${className}`} aria-label="Publicidad o recurso recomendado">
      <span className="ad-label">Publicidad / Recurso recomendado</span>
      <div className="ad-slot" aria-live="polite">
        {canLoadAd ? (
          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="horizontal"
            data-full-width-responsive="true"
          />
        ) : (
          <div className="ad-placeholder">
            <span>Espacio educativo recomendado</span>
            <small>{loaded ? "Publicidad cargada" : "728 × 90 / 320 × 100"}</small>
          </div>
        )}
      </div>
    </aside>
  );
}

export default EducationalAdBanner;
