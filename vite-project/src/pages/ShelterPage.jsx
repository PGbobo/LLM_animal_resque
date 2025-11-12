import React, { useMemo } from "react";

// 나중에 DB에서 가져올 임시 데이터
const shelterAndHospitalData = [
  {
    id: 1,
    type: "shelter",
    name: "광주 동물보호소",
    address: "광주광역시 북구 본촌동 785-1",
    tel: "062-571-2808",
    hours: "10:00 - 17:00",
  },
  {
    id: 3,
    type: "shelter",
    name: "나주 유기동물보호소",
    address: "전라남도 나주시 금천면 촌곡리 55-1",
    tel: "061-330-4344",
    hours: "09:00 - 18:00",
  },
  {
    id: 6,
    type: "shelter",
    name: "화순 유기동물보호소",
    address: "전라남도 화순군 화순읍 일심리 677-1",
    tel: "061-379-3732",
    hours: "10:00 - 17:00 (주말 휴무)",
  },
];

const ShelterPage = () => {
  // 보호소 데이터만 필터링합니다.
  const filteredData = useMemo(
    () => shelterAndHospitalData.filter((item) => item.type === "shelter"),
    [] // 데이터가 정적이므로 의존성 배열을 비워둡니다.
  );

  return (
    <main className="pt-28 pb-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 text-center">
          내 주변 보호소 찾기
        </h1>
        <p className="text-lg text-slate-600 mb-10 text-center">
          도움이 필요한 동물을 위해 가까운 보호소를 찾아보세요.
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

export default ShelterPage;
