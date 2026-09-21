import { useEffect, useState } from 'react';

const BACKGROUND_MAP = {
  '/dashboard': '/bg_dashboard.jpg',
  '/doctor-dashboard': '/bg_doctor.jpg',
  '/leads': '/bg_leads.jpg',
  '/pipeline': '/bg_leads.jpg',
  '/tasks': '/bg_leads.jpg',
  '/cnp': '/bg_cnp.jpg',
  '/call-again': '/bg_cnp.jpg',
  '/verification': '/bg_verification.jpg',
  '/ready-to-shipment': '/bg_verification.jpg',
  '/shiprocket': '/bg_shipment.jpg',
  '/shiprocket/orders': '/bg_shipment.jpg',
  '/shiprocket/shipments': '/bg_shipment.jpg',
  '/shiprocket/returns': '/bg_shipment.jpg',
  '/shiprocket/ndr': '/bg_shipment.jpg',
  '/shiprocket/ndr/detail': '/bg_shipment.jpg',
  '/shipmaxx': '/bg_shipment.jpg',
  '/shipmaxx/ndr': '/bg_shipment.jpg',
  '/shipmaxx/followup': '/bg_shipment.jpg',
  '/appointments': '/bg_doctor.jpg',
  '/ops-dashboard': '/bg_ops.jpg',
  '/reorder-commission': '/bg_dashboard.jpg',
  '/attendance': '/bg_doctor.jpg',
  '/staff-activity': '/bg_ops.jpg',
  '/whatsapp': '/bg_cnp.jpg',
  '/users': '/bg_dashboard.jpg',
  '/notifications': '/bg_leads.jpg',
  '/account': '/bg_doctor.jpg',
  '/account/delivered': '/bg_shipment.jpg',
};

const DEFAULT_BACKGROUND = '/botanical_bg.jpg';

export default function PageBackground({ pathname }) {
  const [currentImage, setCurrentImage] = useState(DEFAULT_BACKGROUND);
  const [prevImage, setPrevImage] = useState(null);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Match exact path or section prefix
    let targetBg = BACKGROUND_MAP[pathname];
    if (!targetBg) {
      const matchKey = Object.keys(BACKGROUND_MAP).find(k => pathname.startsWith(k));
      targetBg = matchKey ? BACKGROUND_MAP[matchKey] : DEFAULT_BACKGROUND;
    }

    if (targetBg !== currentImage) {
      setPrevImage(currentImage);
      setCurrentImage(targetBg);
      setIsFading(true);

      const timer = setTimeout(() => {
        setIsFading(false);
        setPrevImage(null);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [pathname, currentImage]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Previous background image (fading out) */}
      {prevImage && (
        <div
          className={`absolute inset-0 bg-cover bg-center bg-fixed transition-opacity duration-700 ease-in-out ${
            isFading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(243, 248, 245, 0.98) 0%, rgba(232, 246, 237, 0.97) 100%), url('${prevImage}')`,
          }}
        />
      )}

      {/* Current background image (fading in) */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-fixed transition-opacity duration-700 ease-in-out ${
          isFading ? 'opacity-100 animate-fade-in' : 'opacity-100'
        }`}
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(243, 248, 245, 0.98) 0%, rgba(232, 246, 237, 0.97) 100%), url('${currentImage}')`,
        }}
      />

      {/* Subtle organic radial vignette overlay to keep text ultra sharp */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/5 via-transparent to-emerald-950/10 pointer-events-none" />
    </div>
  );
}
