import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavBar from "../../layouts/mainpage/NavBar";
import ProductSearchBar from "../../components/search/ProductSearchBar";
import { useDispatch, useSelector } from "react-redux";
import { logoutAsyncThunk } from "../../redux/slices/features/user/authSlice";
import logo from "../../images/logo.png";
import { getActivePoints } from "../../api/point/pointApi";

export default function Header() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.authSlice);
  const [point, setPoint] = useState(0);

  const notices = [
    "[WELCOME] 공지/이벤트",
    "1월 신규가입 3,000원 쿠폰 지급 이벤트",
    "배송지연 지역 안내 (제주도 일부 지역)",
  ];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const fetchActivePoint = async () => {
      const data = await getActivePoints(user?.id);
      setPoint(data);
    };
    fetchActivePoint();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(
      () => setCurrent((prev) => (prev + 1) % notices.length),
      3500
    );
    return () => clearInterval(timer);
  }, [notices.length]);

  const handleLogout = () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      const response = dispatch(logoutAsyncThunk());
      alert("로그아웃 되었습니다.");
      console.log("로그아웃 핸들러 : ", response);
      navigate("/");
    }
  };

  return (
    <header className="w-full ">
      <div className="w-full h-10 bg-[#d4e6fa] flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-sm text-gray-700 font-semibold tracking-tight">
              {notices[current]}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-8 pt-3 flex items-center justify-between gap-8">
          <div className="flex-shrink-0">
            <Link to="/" className="block">
              <img src={logo} alt="달빛나라 로고" className="h-40 w-auto" />
            </Link>
          </div>
          <div className="flex-1 max-w-2xl">
            <ProductSearchBar />
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-4">
            {user?.loginId && (
              <div className="flex items-center gap-2 text-[13px]">
                <span className="font-bold text-gray-700">{user.name}</span>
                <span className="text-gray-400">님</span>
                {user.userRole === "ADMIN" ? (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-[11px] font-semibold rounded">
                    관리자
                  </span>
                ) : (
                  <></>
                )}
                <span className="px-2 py-0.5 bg-blue-500 text-white text-[11px] font-semibold rounded">
                  {user.userGrade}
                </span>
                <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[11px] font-semibold rounded">
                  {point?.toLocaleString() || 0} P
                </span>
              </div>
            )}

            <div className="flex items-center gap-4 text-[13px] font-semibold text-gray-500">
              {user?.loginId ? (
                <>
                  <button
                    onClick={handleLogout}
                    className="hover:text-[#52a3ff] cursor-pointer"
                  >
                    로그아웃
                  </button>

                  <span className="text-[#E9D5D8]">|</span>
                  {user?.userRole === "ADMIN" && (
                    <>
                      <button
                        onClick={() => {
                          // 새 탭에서 여는 로직
                          const newWindow = window.open(
                            "/admin/products",
                            "_blank"
                          );
                          // 보안을 위해 opener 접근 차단
                          if (newWindow) newWindow.opener = null;
                          // navigate("/admin/products");
                        }}
                        className="hover:text-[#52a3ff] cursor-pointer"
                      >
                        관리자페이지
                      </button>
                      <span className="text-[#E9D5D8]">|</span>
                    </>
                  )}
                  <button
                    onClick={() => navigate("/mypage")}
                    className="hover:text-[#52a3ff] cursor-pointer"
                  >
                    마이페이지
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/login")}
                    className="hover:text-[#52a3ff] cursor-pointer"
                  >
                    로그인
                  </button>
                  <span className="text-[#cbe3ff]">|</span>
                  <button
                    onClick={() => navigate("/signup")}
                    className="hover:text-[#52a3ff] cursor-pointer"
                  >
                    회원가입
                  </button>
                </>
              )}
              <span className="text-[#cbe3ff]">|</span>
              <button
                onClick={() => navigate("/cart")}
                className="hover:text-[#52a3ff] cursor-pointer"
              >
                장바구니
              </button>
              <span className="text-[#cbe3ff]">|</span>
              <button
                onClick={() => navigate("/helpcenter")}
                className="hover:text-[#52a3ff] cursor-pointer"
              >
                고객센터
              </button>
            </div>

            <div className="flex items-center gap-2">
              {[
                { label: "오특", color: "bg-orange-400" },
                { label: "랭킹", color: "bg-[#FF8FAB]" },
                { label: "신상", color: "bg-purple-400" },
                { label: "이벤트", color: "bg-red-400", pulse: true },
              ].map((tag) => (
                <button
                  key={tag.label}
                  className={`px-4 py-1.5 rounded-full text-white text-[12px] font-bold shadow-sm hover:scale-105 transition-transform cursor-pointer ${
                    tag.color
                  } ${tag.pulse ? "animate-bounce" : ""}`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <NavBar />
    </header>
  );
}
