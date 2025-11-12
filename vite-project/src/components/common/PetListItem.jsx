import React from "react";

// 🚩 isSelected prop을 추가했습니다.
const PetListItem = ({ pet, isSelected }) => {
  const isMissing = pet.status === "실종";
  const borderColorClass = isMissing ? "border-red-200" : "border-blue-200"; // 색상 통일 (red-200/blue-200)

  // 🚩 선택 상태에 따라 ring 스타일을 추가합니다.
  const selectedStyle = isSelected
    ? "ring-4 ring-offset-2 ring-sky-300 transform scale-[1.01]"
    : "";

  // TailwindCSS 스타일을 직접 적용하여 status-badge 클래스 제거 (Tailwind 방식 권장)
  const statusBgColor = isMissing
    ? "bg-red-100 text-red-700"
    : "bg-blue-100 text-blue-700";

  return (
    <div
      // 🚩 isSelected와 hover 스타일을 적용
      className={`bg-white p-3 rounded-xl shadow border ${borderColorClass} flex items-center gap-3 cursor-pointer transition-all duration-200 hover:shadow-md ${selectedStyle}`}
    >
      <img
        src={pet.img || "https://via.placeholder.com/96"}
        alt={pet.name}
        className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-base">{pet.name}</h3>
        <p className="text-slate-600 text-xs mt-1 flex items-center gap-2">
          {/* 🚩 Tailwind 스타일로 대체 */}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBgColor}`}
          >
            {pet.status}
          </span>
          <span className="text-slate-600">{pet.location}</span>
        </p>
        <p className="text-slate-400 text-xs mt-1">{pet.time}</p>
      </div>
    </div>
  );
};

export default PetListItem;
