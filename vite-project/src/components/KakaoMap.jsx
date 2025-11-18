// src/components/KakaoMap.jsx
// ------------------------------------------------------
// 공용 KakaoMap 컴포넌트
// - markerVariant 로 마커 색상 테마 지정 ("blue" | "red" ...)
//   · 기본값: "blue" (기존 동작 그대로)
// ------------------------------------------------------

import React, { useEffect, useRef, useState } from "react";

const KAKAO_APP_KEY = "7fc0573eaaceb31b52e3a3c9fa97c024";

const useKakaoMapScript = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (window.kakao && window.kakao.maps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services&autoload=false`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => setIsLoaded(true));
    };
    script.onerror = () => {
      console.error("Failed to load Kakao Maps script.");
    };

    document.head.appendChild(script);
  }, []);

  return isLoaded;
};

// markerVariant: "blue"(기본) | "red"(실종 페이지에서 사용)
const KakaoMap = ({
  pets = [],
  selectedPet,
  onMarkerSelect,
  markerVariant = "blue",
}) => {
  const isScriptLoaded = useKakaoMapScript();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]); // [{ pet, overlay, el }]

  // 지도 초기화
  useEffect(() => {
    if (isScriptLoaded && mapContainerRef.current && !mapRef.current) {
      const { kakao } = window;
      const mapOption = {
        center: new kakao.maps.LatLng(35.1601, 126.8517),
        level: 7,
      };
      mapRef.current = new kakao.maps.Map(mapContainerRef.current, mapOption);
    }
  }, [isScriptLoaded]);

  // pets 또는 markerVariant 변경 시 마커 다시 그림
  useEffect(() => {
    if (!isScriptLoaded || !mapRef.current) return;

    const { kakao } = window;
    const map = mapRef.current;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.overlay?.setMap(null));
    markersRef.current = [];

    const bounds = new kakao.maps.LatLngBounds();

    // 색상 테마에 따라 클래스 이름 결정
    const variantClass =
      markerVariant === "red" ? "pet-marker--red" : "pet-marker--blue";

    pets
      .filter((pet) => Array.isArray(pet.latlng) && pet.latlng.length === 2)
      .forEach((pet) => {
        const [lat, lon] = pet.latlng;
        const position = new kakao.maps.LatLng(lat, lon);
        bounds.extend(position);

        const el = document.createElement("div");
        // 기본 마커 + 색상 테마 클래스
        el.className = `pet-marker ${variantClass}`;

        el.innerHTML = `
          <div class="pet-marker-inner">
            <div class="pet-marker-thumb" style="background-image:url('${
              pet.img || ""
            }')"></div>
            <svg class="pet-marker-pin" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0C9 0 0 8.6 0 19.2C0 32.6 18 51 18.8 51.8C19.2 52.2 19.6 52.4 20 52.4C20.4 52.4 20.8 52.2 21.2 51.8C22 51 40 32.6 40 19.2C40 8.6 31 0 20 0Z" />
            </svg>
          </div>
        `;

        const overlay = new kakao.maps.CustomOverlay({
          map,
          position,
          yAnchor: 1,
          content: el,
        });

        el.addEventListener("click", () => {
          if (onMarkerSelect) onMarkerSelect(pet);
        });

        markersRef.current.push({ pet, overlay, el });
      });

    if (!bounds.isEmpty()) {
      map.setBounds(bounds);
    }
  }, [pets, isScriptLoaded, onMarkerSelect, markerVariant]);

  // selectedPet 변경 시 선택 마커 강조
  useEffect(() => {
    if (!isScriptLoaded || !mapRef.current) return;

    const map = mapRef.current;

    markersRef.current.forEach(({ el }) => {
      el.classList.remove("pet-marker--selected");
    });

    if (!selectedPet) return;

    const target = markersRef.current.find(
      ({ pet }) =>
        pet.id === selectedPet.id &&
        (pet.type || "default") === (selectedPet.type || "default")
    );
    if (!target) return;

    target.el.classList.add("pet-marker--selected");

    const pos = target.overlay.getPosition();
    if (pos) map.panTo(pos);
  }, [selectedPet, isScriptLoaded]);

  return (
    <div
      id="map"
      ref={mapContainerRef}
      className="w-full h-full rounded-2xl shadow-lg border border-sky-200"
    >
      {!isScriptLoaded && (
        <div className="flex items-center justify-center w-full h-full text-slate-500">
          지도 로딩 중...
        </div>
      )}
    </div>
  );
};

export default KakaoMap;
