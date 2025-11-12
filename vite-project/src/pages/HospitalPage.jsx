import React, { useMemo } from "react";

// 나중에 DB에서 가져올 임시 데이터
const shelterAndHospitalData = [
  {
    id: 2,
    type: "hospital",
    name: "스카이 동물메디컬센터",
    address: "광주광역시 서구 치평동 1182-3",
    tel: "062-373-7575",
    hours: "09:00 - 21:00 (연중무휴)",
  },
  {
    id: 4,
    type: "hospital",
    name: "리더스 동물병원",
    address: "광주광역시 광산구 수완동 1431",
    tel: "062-953-8275",
    hours: "24시간 진료",
  },
  {
    id: 5,
    type: "hospital",
    name: "메디펫 동물병원",
    address: "광주광역시 남구 봉선동 478-5",
    tel: "062-655-7582",
    hours: "09:30 - 19:30",
  },
];

const HospitalPage = () => {
  // 동물병원 데이터만 필터링합니다.
  const filteredData = useMemo(
    () => shelterAndHospitalData.filter((item) => item.type === "hospital"),
    [] // 데이터가 정적이므로 의존성 배열을 비워둡니다.
  );

  return (
    <main className="pt-28 pb-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 text-center">
          내 주변 동물병원 찾기
        </h1>
        <p className="text-lg text-slate-600 mb-10 text-center">
          응급 상황이나 진료가 필요할 때 가까운 동물병원을 찾아보세요.
        </p>

        {/* --- 정보 리스트 --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow flex flex-col"
            >
              <div className="flex-grow">
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {item.name}
                </h3>
                <p className="text-slate-600 mb-1">
                  <span className="font-semibold">주소:</span> {item.address}
                </p>
                <p className="text-slate-600 mb-4">
                  <span className="font-semibold">운영시간:</span> {item.hours}
                </p>
              </div>
              <div className="mt-auto flex space-x-2">
                <a
                  href={`https://map.kakao.com/link/search/${item.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border-2 border-sky-200 hover:bg-sky-500 hover:text-white transition-colors"
                >
                  지도
                </a>
                <a
                  href={`tel:${item.tel}`}
                  className="flex-1 text-center bg-sky-400 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  전화
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default HospitalPage;
