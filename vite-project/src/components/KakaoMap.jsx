// src/components/KakaoMap.jsx
// ------------------------------------------------------
// 공용 KakaoMap 컴포넌트
// - 카카오 지도 스크립트 로드
// - 전달받은 pets 배열을 기반으로 마커(커스텀 오버레이) 생성
// - 마커 안에 동물 사진 썸네일 출력
// - 선택된 마커(selectedPet)는 크기/색상 변경
// - 마커 클릭 시 onMarkerSelect 콜백으로 상위 컴포넌트에 이벤트 전달
// - 예전에 사용하던 인포윈도우(말풍선)는 완전히 제거
// ------------------------------------------------------

import React, { useEffect, useRef, useState } from "react";

const KAKAO_APP_KEY = "7fc0573eaaceb31b52e3a3c9fa97c024";

// 1. 카카오맵 스크립트 로드 상태를 관리하는 커스텀 훅
//    - 컴포넌트가 여러 곳에서 사용돼도, window.kakao가 이미 있으면 바로 완료 처리
const useKakaoMapScript = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 이미 스크립트가 로드된 경우
    if (window.kakao && window.kakao.maps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services&autoload=false`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
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

// 2. KakaoMap 컴포넌트
//    - pets: [{ id, type, latlng:[lat,lon], img, ... }]
//    - selectedPet: 현재 선택된 동물(없으면 null)
//    - onMarkerSelect: 마커 클릭 시 호출되는 콜백 (선택 동물 전달)
//      ※ 다른 페이지에서 onMarkerSelect를 안 넘기면 그냥 선택 이벤트만 없는 지도처럼 동작
const KakaoMap = ({ pets = [], selectedPet, onMarkerSelect }) => {
  const isScriptLoaded = useKakaoMapScript();
  const mapContainerRef = useRef(null); // 지도 DOM 컨테이너
  const mapRef = useRef(null); // kakao.maps.Map 인스턴스
  const markersRef = useRef([]); // [{ pet, overlay, el }]

  // 3. 지도 인스턴스 초기화 (스크립트 로드 + 컨테이너 준비 후 1회 실행)
  useEffect(() => {
    if (isScriptLoaded && mapContainerRef.current && !mapRef.current) {
      const { kakao } = window;
      const mapOption = {
        center: new kakao.maps.LatLng(35.1601, 126.8517), // 광주광역시 기준
        level: 7,
      };
      mapRef.current = new kakao.maps.Map(mapContainerRef.current, mapOption);
    }
  }, [isScriptLoaded]);

  // 4. pets 변경 시 마커(커스텀 오버레이) 전체를 새로 그림
  useEffect(() => {
    if (!isScriptLoaded || !mapRef.current) return;

    const { kakao } = window;
    const map = mapRef.current;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.overlay?.setMap(null));
    markersRef.current = [];

    // bounds: 모든 마커가 화면에 들어오도록 영역 계산
    const bounds = new kakao.maps.LatLngBounds();

    pets
      .filter((pet) => Array.isArray(pet.latlng) && pet.latlng.length === 2)
      .forEach((pet) => {
        const [lat, lon] = pet.latlng;
        const position = new kakao.maps.LatLng(lat, lon);
        bounds.extend(position);

        // 커스텀 마커 DOM 엘리먼트 생성
        const el = document.createElement("div");
        el.className = "pet-marker";

        // 마커 구조:
        //  - 동그란 썸네일
        //  - 아래쪽 물방울 모양 SVG(핀)
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

        // 커스텀 오버레이 생성 (인포윈도우 대신 이걸 마커처럼 사용)
        const overlay = new kakao.maps.CustomOverlay({
          map,
          position,
          yAnchor: 1,
          content: el,
        });

        // DOM 클릭 이벤트 → 상위로 선택 이벤트 전달
        el.addEventListener("click", () => {
          if (onMarkerSelect) {
            onMarkerSelect(pet);
          }
        });

        markersRef.current.push({ pet, overlay, el });
      });

    // 마커가 하나라도 있으면, 그 범위에 맞게 지도 이동
    if (!bounds.isEmpty()) {
      map.setBounds(bounds);
    }
  }, [pets, isScriptLoaded, onMarkerSelect]);

  // 5. selectedPet 변경 시
  //    - 해당 마커만 강조(크기/색상 변경 클래스 부여)
  //    - 지도 중심을 그 마커 위치로 부드럽게 이동
  useEffect(() => {
    if (!isScriptLoaded || !mapRef.current) return;

    const { kakao } = window;
    const map = mapRef.current;

    // 선택 상태 클래스 초기화
    markersRef.current.forEach(({ el }) => {
      el.classList.remove("pet-marker--selected");
    });

    // 선택 해제(null)면 여기서 끝
    if (!selectedPet) return;

    const target = markersRef.current.find(
      ({ pet }) =>
        pet.id === selectedPet.id &&
        (pet.type || "default") === (selectedPet.type || "default")
    );

    if (!target) return;

    // 선택된 마커에만 강조 클래스 부여
    target.el.classList.add("pet-marker--selected");

    // 지도 중심을 해당 마커 위치로 이동
    const pos = target.overlay.getPosition();
    if (pos) {
      map.panTo(pos);
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
