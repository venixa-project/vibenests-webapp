import { useState, useEffect } from "react";
import { globalSettingsApi } from "@/lib/api";

let cachedLogoUrl: string | null = null;

export function updateGlobalLogo(url: string) {
  cachedLogoUrl = url;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("company-logo-updated", { detail: url }));
  }
}

export function useCompanyLogo() {
  const [logoUrl, setLogoUrl] = useState<string>(cachedLogoUrl || "");

  useEffect(() => {
    if (cachedLogoUrl !== null) {
      setLogoUrl(cachedLogoUrl);
    } else {
      globalSettingsApi
        .getPublic()
        .then((settings) => {
          const url = settings?.logoUrl || "";
          cachedLogoUrl = url;
          setLogoUrl(url);
        })
        .catch(() => {
          cachedLogoUrl = "";
        });
    }

    const handleUpdate = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail !== undefined) {
        setLogoUrl(customEv.detail);
      }
    };

    window.addEventListener("company-logo-updated", handleUpdate);
    return () => window.removeEventListener("company-logo-updated", handleUpdate);
  }, []);

  return logoUrl;
}

interface CompanyLogoProps {
  className?: string;
  fallbackSrc?: string;
  alt?: string;
}

export function CompanyLogo({ className = "h-full w-full object-contain", fallbackSrc = "/image.png", alt = "Company Logo" }: CompanyLogoProps) {
  const logoUrl = useCompanyLogo();
  const src = logoUrl || fallbackSrc;

  return <img src={src} alt={alt} className={className} />;
}
