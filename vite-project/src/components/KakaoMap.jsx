// src/components/KakaoMap.jsx

import React, { useEffect, useRef, useState } from "react";

const KAKAO_APP_KEY = "7fc0573eaaceb31b52e3a3c9fa97c024";

// 🚩 1. 카카오맵 스크립트 로드 상태를 관리하는 커스텀 훅 (재사용성 및 안정성 증가)
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
      window.kakao.maps.load(() => {
        // 스크립트 로드 완료 후 지도 라이브러리 로드
        setIsLoaded(true);
      });
    };
    script.onerror = () => {
      console.error("Failed to load Kakao Maps script.");
    };
    document.head.appendChild(script);
  }, []);

  return isLoaded;
};

// 🚩 KakaoMap 컴포넌트
const KakaoMap = ({ pets, selectedPet }) => {
  const isScriptLoaded = useKakaoMapScript();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const currentInfowindowRef = useRef(null);

  // 🚩 2. 지도 인스턴스 초기화 (스크립트 로드 시 1회 실행)
  useEffect(() => {
    if (isScriptLoaded && mapContainerRef.current && !mapRef.current) {
      const { kakao } = window;
      const mapOption = {
        center: new kakao.maps.LatLng(35.1601, 126.8517), // 광주광역시
        level: 7,
      };
      mapRef.current = new kakao.maps.Map(mapContainerRef.current, mapOption);
    }
  }, [isScriptLoaded]);

  // 🚩 3. 마커 표시 및 갱신
  useEffect(() => {
    if (!isScriptLoaded || !mapRef.current) return;

    const map = mapRef.current;
    const { kakao } = window;

    // 기존 마커 및 인포윈도우 제거
    Object.values(markersRef.current).forEach((marker) => marker.setMap(null));
    markersRef.current = {};
    if (currentInfowindowRef.current) {
      currentInfowindowRef.current.close();
      currentInfowindowRef.current = null;
    }

    // ✅ public/images 내부의 마커 이미지 경로
    const missingMarkerImageSrc = "/images/marker_red.png"; // 실종(빨강)
    const protectedMarkerImageSrc = "/images/marker_blue.png"; // 목격(파랑)
    const imageSize = new kakao.maps.Size(30, 35);

    const missingMarkerImage = new kakao.maps.MarkerImage(
      missingMarkerImageSrc,
      imageSize
    );
    const protectedMarkerImage = new kakao.maps.MarkerImage(
      protectedMarkerImageSrc,
      imageSize
    );

    // 🚩 마커 생성 및 이벤트 리스너 추가
    pets?.forEach((pet) => {
      const marker = new kakao.maps.Marker({
        map: map,
        position: new kakao.maps.LatLng(pet.latlng[0], pet.latlng[1]),
        title: pet.title || pet.name,
        image:
          pet.status === "실종" ? missingMarkerImage : protectedMarkerImage,
      });

      markersRef.current[pet.id] = marker;

      const content = `
        <div style="padding:10px; min-width:250px; font-family:'Inter', sans-serif;">
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${pet.img}" alt="${pet.title}" 
              style="width:64px; height:64px; border-radius:8px; object-fit:cover;">
            <div>
              <div style="font-size:14px;">
                <span style="display:inline-block; padding:2px 8px; border-radius:16px;
                  font-size:11px; font-weight:600; margin-right:5px;
                  background-color:${
                    pet.status === "실종" ? "#fee2e2" : "#dbeafe"
                  };
                  color:${pet.status === "실종" ? "#dc2626" : "#2563eb"};">
                  ${pet.status}
                </span>
                <strong>${pet.title || pet.name}</strong>
              </div>
              <div style="font-size:12px; color:#666; margin-top:4px;">${
                pet.time || pet.date
              }</div>
              <a href="#" style="font-size:12px; color:#0ea5e9; font-weight:600; margin-top:6px;
                display:block; text-decoration:none;">자세히 보기</a>
            </div>
          </div>
        </div>`;

      const infowindow = new kakao.maps.InfoWindow({
        content,
        removable: true,
      });

      kakao.maps.event.addListener(marker, "click", function () {
        if (currentInfowindowRef.current) {
          currentInfowindowRef.current.close();
        }
        infowindow.open(map, marker);
        currentInfowindowRef.current = infowindow;
      });
    });
  }, [pets, isScriptLoaded]);

  // 🚩 4. selectedPet 변경 시 해당 마커 포커싱
  useEffect(() => {
    if (!selectedPet || !mapRef.current || !isScriptLoaded) return;

    const map = mapRef.current;
    const marker = markersRef.current[selectedPet.id];

    if (marker) {
      map.panTo(marker.getPosition());
      window.kakao.maps.event.trigger(marker, "click");
    }
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
