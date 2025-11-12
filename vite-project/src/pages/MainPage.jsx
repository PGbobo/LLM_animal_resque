import React from "react";
import { Link } from "react-router-dom";
import KakaoMap from "../components/KakaoMap.jsx"; // 방금 만든 맵 컴포넌트
import PetListItem from "../components/common/PetListItem.jsx"; // 리스트 아이템 컴포넌트 (분리 추천)

const MainPage = () => {
  // 오른쪽 리스트 아이템 데이터 (임시)
  const petListData = [
    {
      id: 1,
      name: "푸들 / 3살",
      status: "실종",
      location: "광주 서구 풍암호수공원",
      time: "1시간 전",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhalmPMX2psjXDU8BbhNuSGJjAuDwjUkvpPA&s", // 이미지 URL 수정
      type: "missing",
      latlng: [35.1384, 126.8427], // 🚩 지도 표시용 좌표 추가
    },
    {
      id: 2,
      name: "코숏 / 1살 추정",
      status: "보호",
      location: "광주 서구 금호동",
      time: "3시간 전",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhalmPMX2psjXDU8BbhNuSGJjAuDwjUkvpPA&s", // 이미지 URL 수정
      type: "protected",
      latlng: [35.1488, 126.8774], // 🚩 지도 표시용 좌표 추가
    },
    {
      id: 3,
      name: "믹스견 / 5살",
      status: "실종",
      location: "광주 남구 월드컵경기장",
      time: "8시간 전",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhalmPMX2psjXDU8BbhNuSGJjAuDwjUkvpPA&s", // 이미지 URL 수정
      type: "missing",
      latlng: [35.1255, 126.8822], // 🚩 지도 표시용 좌표 추가
    },
    {
      id: 4,
      name: "말티즈 / 2살",
      status: "실종",
      location: "광주 남구 월산동",
      time: "2시간 전",
      img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhalmPMX2psjXDU8BbhNuSGJjAuDwjUkvpPA&s", // 이미지 URL 수정
      type: "missing",
      latlng: [35.1432, 126.8621], // 🚩 지도 표시용 좌표 추가
    },
  ];

  return (
    // <main> 태그는 pt-20 (헤더 높이)를 유지
    <main className="pt-20">
      {/* --- 1. Home Section (Hero) --- */}
      <section id="home" className="bg-sky-100 pt-12 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1
            className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight"
            style={{ lineHeight: 1.2 }}
          >
            <span className="text-sky-500">AI</span>와 함께, 잃어버린 반려동물을
            다시 당신의 품으로
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600">
            '이어주개'는 첨단 AI 기술과 따뜻한 이웃의 마음을 연결하여,
            <br />
            실종/유기동물에게 가장 빠르고 확실한 재회의 길을 찾아주는 통합
            플랫폼 입니다.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
            {/* <a> 대신 <Link> 사용 */}
            <Link
              to="/register-pet"
              className="w-full sm:w-auto inline-block bg-sky-400 text-white font-bold text-lg px-10 py-4 rounded-lg shadow-lg hover:bg-sky-500 transition-transform hover:scale-105"
            >
              실종 동물 등록
            </Link>
            <Link
              to="/report-sighting"
              className="w-full sm:w-auto inline-block bg-white text-slate-700 font-bold text-lg px-10 py-4 rounded-lg shadow-lg hover:bg-sky-500 transition-transform hover:scale-105 border-2"
            >
              우리 동네 동물 제보
            </Link>
          </div>
        </div>
      </section>

      {/* --- 2. Realtime Status Section (Map & List) --- */}
      <section id="realtime-status" className="pb-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 왼쪽: 지도 */}
            <div className="w-full">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                내 주변 실종/보호 동물
              </h2>
              {/* 🚩 맵 컴포넌트가 들어갈 자리. 높이를 부모가 지정해줘야 함 */}
              <div className="w-full h-[500px]">
                {/* 🚩 pets 데이터를 props로 전달해야 마커가 표시됨 */}
                <KakaoMap pets={petListData} />
              </div>
            </div>

            {/* 오른쪽: 리스트 */}
            <div className="w-full">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                주변의 도움이 필요해요!
              </h2>
              {/* 리스트 아이템은 map() 함수를 이용해 동적으로 렌더링 */}
              <div className="announcement-list h-[500px] overflow-y-auto space-y-3 pr-2">
                {petListData.map((pet) => (
                  <PetListItem key={pet.id} pet={pet} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default MainPage;
