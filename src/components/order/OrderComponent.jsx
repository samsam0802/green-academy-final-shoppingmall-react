import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  completeOrder,
  deleteOneOrder,
  getOneOrder,
  registerOrder,
} from "../../api/order/orderApi";
import { getActivePoints } from "../../api/point/pointApi";
import CouponModal from "./CouponModal";
import { getUserProfileThunk } from "../../redux/slices/features/user/authSlice";
import useCustomCart from "../../hooks/useCustomCart";

// Helper function to format price with commas and '원'
const formatPrice = (price) => {
  return `${Number(price).toLocaleString()}원`;
};

const calculateCouponDiscount = (totalPrice, selectedCoupon) => {
  if (!selectedCoupon) return 0;

  const { coupon } = selectedCoupon;
  if (coupon.discountType === "FIXED") {
    return coupon.fixedDiscountAmount;
  }

  let discount = (totalPrice * coupon.discountPercentage) / 100;
  if (coupon.hasLimitMaxDiscount) {
    discount = Math.min(discount, coupon.maxDiscountAmount);
  }
  return Math.floor(discount);
};

const OrderComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const passedItems = location.state?.items || [];

  const { user, profile } = useSelector((state) => state.authSlice);
  const dispatch = useDispatch();

  // console.log("user", user);
  // console.log("profile", profile);

  const { removeAll } = useCustomCart();

  const [orderItems, setOrderItems] = useState(
    passedItems.length > 0 ? passedItems : []
  );

  // console.log("orderItems", orderItems);

  // 쿠폰모달
  const [showCouponModal, setShowCouponModal] = useState(false);
  // 선택한 쿠폰
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  // 배송지명
  const [addressName, setAddressName] = useState("");
  // 주문자 정보와 동일 토글
  const [useOrdererInfo, setUseOrdererInfo] = useState(false);
  // 수령인
  const [receiverName, setReceiverName] = useState("");
  // 수령인 전화번호
  const [receiverPhone, setReceiverPhone] = useState("");
  // 도로명 주소
  const [streetAddress, setStreetAddress] = useState("");
  // 우편번호
  const [postalCode, setPostalCode] = useState("");
  // 상세주소
  const [detailedAddress, setDetailedAddress] = useState("");
  // 배송 요청 사항
  const [deliveryRequest, setDeliveryRequest] = useState("");
  const [customDeliveryRequest, setCustomDeliveryRequest] = useState("");

  const [pointBalance, setPointBalance] = useState(0); // 보유 포인트
  const [usePoint, setUsePoint] = useState(0); // 사용할 포인트
  const [earnedPoints, setEarnedPoints] = useState(0);

  const paymentMethods = [
    { id: "CARD", label: "신용/체크카드" },
    { id: "KAKAO", label: "카카오페이" },
    { id: "NAVER", label: "네이버페이" },
    { id: "PAYCO", label: "PAYCO" },
    { id: "PHONE", label: "휴대폰 결제" },
    { id: "BANK", label: "계좌이체" },
  ];
  const [selectedPayment, setSelectedPayment] = useState("CARD");

  const paymentMethod = paymentMethods.find(
    (m) => m.id === selectedPayment
  ).label;

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreePurchase, setAgreePurchase] = useState(false);
  const [agreePersonal, setAgreePersonal] = useState(false);
  const [agreeDelegate, setAgreeDelegate] = useState(false);

  const [ordererInfo, setOrdererInfo] = useState({
    name: null,
    phone: null,
  });

  useEffect(() => {
    //로그인 유저는 있는데 프로필이 null이라면 다시 요청
    if (user && !profile) {
      dispatch(getUserProfileThunk(user.loginId));
    }
  }, [user, profile, dispatch]);

  // 약관 전체 동의 상태 업데이트
  useEffect(() => {
    if (agreePurchase && agreePersonal && agreeDelegate) {
      setAgreeAll(true);
    } else {
      setAgreeAll(false);
    }
  }, [agreePurchase, agreePersonal, agreeDelegate]);

  useEffect(() => {
    // console.log("profile", profile);
    const newOrdererInfo = {
      name: profile?.name,
      phone: profile?.phoneNumber,
    };
    setOrdererInfo(newOrdererInfo);
  }, [profile]);

  const fetchPoints = async (userId) => {
    const data = await getActivePoints(userId);
    setPointBalance(data);
  };

  useEffect(() => {
    fetchPoints(user.id);
  }, []);

  useEffect(() => {
    // 포인트는 가격의 1%를 합산하여 구함
    const sumPoints = orderItems.reduce(
      (sum, item) =>
        sum +
        Math.floor(Number(item.sellingPrice) * Number(item.quantity) * 0.01),
      0
    );
    setEarnedPoints(sumPoints);
  }, [orderItems]);

  const totalPrice = orderItems.reduce(
    (sum, item) => sum + Number(item.sellingPrice) * Number(item.quantity),
    0
  );

  // console.log("totalPrice", totalPrice);

  const freeConditionAmount =
    orderItems[0]?.deliveryPolicy?.freeConditionAmount;
  const basicDeliveryFee = orderItems[0]?.deliveryPolicy?.basicDeliveryFee;

  const shippingFee = totalPrice >= freeConditionAmount ? 0 : basicDeliveryFee;

  // console.log("shippingFee", shippingFee);

  const couponDiscount = useMemo(
    () => calculateCouponDiscount(totalPrice, selectedCoupon),
    [totalPrice, selectedCoupon]
  );

  console.log("couponDiscount", couponDiscount);
  // 최종 결제금액 계산: (총 상품금액 + 배송비) - 쿠폰할인 - 포인트사용
  const finalPrice = totalPrice + shippingFee - couponDiscount - usePoint;
  // console.log("finalPrice", finalPrice);
  const couponName = selectedCoupon ? selectedCoupon.coupon.couponName : null;

  const handleOrderCompleteClick = async () => {
    if (!(agreePurchase && agreePersonal && agreeDelegate)) {
      alert("필수 동의 항목에 동의해 주세요.");
      return;
    }

    const phoneRegex = /^01([0|1|6|7|8|9])([0-9]{3,4})([0-9]{4})$/; // 하이픈 유무 상관없이 체크용

    if (!addressName.trim()) {
      alert("배송지명(예: 우리집)을 입력해 주세요.");
      return;
    }
    if (!receiverName.trim()) {
      alert("받는 사람 이름을 입력해 주세요.");
      return;
    }
    if (!receiverPhone.trim()) {
      alert("연락처를 입력해 주세요.");
      return;
    }
    // 연락처 숫자 형식 검증 (하이픈 제거 후 숫자만 10~11자리인지 확인)
    if (!phoneRegex.test(receiverPhone.replace(/-/g, ""))) {
      alert("올바른 연락처 형식(10~11자리 숫자)을 입력해 주세요.");
      return;
    }
    if (!postalCode || !streetAddress) {
      alert("우편번호 찾기를 통해 주소를 입력해 주세요.");
      return;
    }
    if (!detailedAddress.trim()) {
      alert("상세 주소를 입력해 주세요.");
      return;
    }

    if (selectedPayment === "NAVER") {
      alert("해당 결제 수단은 사업자 정보가 필요하여 미구현합니다.");
      return;
    }

    if (selectedPayment !== "KAKAO") {
      alert("해당 결제 수단은 실제 금액이 빠져나가는 이유로 미구현합니다. ");
      return;
    }

    try {
      const orderProducts = orderItems.map((item) => ({
        productOptionId: item.productOptionId,
        quantity: item.quantity,
      }));
      console.log("orderProducts", orderProducts);

      const dto = {
        paymentMethod: selectedPayment,
        receiverName: receiverName,
        receiverPhone: receiverPhone,
        postalCode: postalCode,
        streetAddress: streetAddress,
        detailedAddress: detailedAddress,
        deliveryRequest:
          deliveryRequest === "직접입력"
            ? customDeliveryRequest
            : deliveryRequest,
        userId: user?.id,
        userCouponId: selectedCoupon ? selectedCoupon?.id : null,
        usedPoints: usePoint,
        earnedPoints: earnedPoints,
        orderProducts: orderProducts,
      };

      // 1. 주문 생성(결제 전)
      const resultOrderId = await registerOrder(dto, user.id);
      console.log("백엔드로부터 받은 주문 id", resultOrderId);

      const resultOrder = await getOneOrder(resultOrderId);
      console.log("백엔드로부터 받은 주문", resultOrder);

      // 2. 결제 진행
      // 아임포트 객체 destructuring
      const { IMP } = window;
      if (!IMP) {
        alert("결제 모듈 로딩에 실패했습니다. 페이지를 새로고침해주세요.");
        return;
      }

      // SDK 초기화
      // SDK(Software Development Kit)는 특정 소프트웨어나 서비스를 쉽게 사용할 수
      // 있도록 미리 만들어진 도구 상자 같은 것임.
      // 결제 시스템을 처음부터 끝까지 직접 만드는 것은 매우 복잡하고 보안상 위험하기 때문에,
      // 아임포트 같은 전문 업체가 제공하는 도구(SDK)를 가져와서 사용하는 것임.
      IMP.init("imp62835818");

      IMP.request_pay(
        {
          pg: "kakaopay.TC0ONETIME", // PG사 설정 추가 // 카카오페이 테스트
          pay_method: "kakaopay", //선택한 결제 수단 반영
          merchant_uid: resultOrder.orderNumber, // 주문 고유 번호
          digital: true,
          name:
            orderItems.length > 1
              ? `${orderItems[0].productName} 외 ${orderItems.length - 1}건`
              : orderItems[0].productName,

          amount: 1, // 최종 결제 금액
          buyer_email: "user@example.com", //실제 사용자 이메일로 변경 필요
          buyer_name: receiverName,
          buyer_tel: receiverPhone,
          buyer_addr: `${streetAddress} ${detailedAddress}`,
          buyer_postcode: postalCode,
        },
        async (response) => {
          console.log("결제 응답:", response);
          if (response.success === false) {
            try {
              // 주문 삭제 요청
              await deleteOneOrder(resultOrderId);
              // 포인트 다시 조회
              await fetchPoints(user.id);
              return alert(
                `결제에 실패하였습니다. 에러 내용: ${response.error_msg}`
              );
            } catch (error) {
              console.error("주문 취소 처리 중 오류:", error);
              alert("결제 취소 처리 중 문제가 발생했습니다.");
            }
          }
          if (response.success) {
            console.log("결제 성공(검증 전)! imp_uid:", response.imp_uid);
            try {
              await completeOrder(response.imp_uid, response.merchant_uid);
              navigate("/order/complete", {
                state: { orderId: resultOrderId },
              });
              await removeAll(user.id);
            } catch (error) {
              console.error("주문 확정 처리 중 오류:", error);
              alert("주문 확정 처리 중 문제가 발생했습니다.");
            }
          }
        }
      );
    } catch (error) {
      console.error("주문 생성 중 오류:", error);
      // 1. 서버에서 응답한 에러 메시지가 있는지 확인
      if (error.originalError.response && error.originalError.response.data) {
        const serverMessage = error.originalError.response.data.message;

        // 재고 부족 메시지가 포함되어 있다면 사용자에게 그대로 전달
        if (serverMessage && serverMessage.includes("재고가 부족합니다")) {
          if (
            confirm(
              `${serverMessage}\n장바구니로 돌아가 수량을 수정하시겠습니까?`
            )
          ) {
            navigate("/cart");
          }
          return;
        }

        // 그 외 서버가 정의한 에러 메시지가 있다면 출력
        alert(`주문 실패: ${serverMessage || "서버 오류가 발생했습니다."}`);
      } else {
        // 2. 네트워크 에러 등 아예 응답을 못 받은 경우
        alert(
          "서버와 통신 중 오류가 발생했습니다. 네트워크 상태를 확인해 주세요."
        );
      }
    }
  };

  const handleOrdererInfoChange = (e) => {
    const check = e.target.checked;
    setUseOrdererInfo(check);
    if (check) {
      setReceiverName(ordererInfo.name);
      setReceiverPhone(ordererInfo.phone);
    } else {
      setReceiverName("");
      setReceiverPhone("");
    }
  };

  const execDaumPostcode = () => {
    new daum.Postcode({
      oncomplete: function (data) {
        //팝업에서 검색결과 항목을 클릭했을때 실행할 코드를 작성하는 부분

        //도로명 주소의 노출 규칙에 따라 주소를 표시한다.
        //내려오는 변수가 값이 없는 경우엔 공백('') 값을 가지므로, 이를 참고하여 분기 한다.
        setStreetAddress(data.roadAddress); //도로명 주소 변수
        setPostalCode(data.zonecode); // 우편번호 변수
      },
    }).open();
  };

  return (
    <div className="bg-[#f0f7ff] min-h-screen font-sans pb-20">
      <div className="w-full h-32 bg-gradient-to-b from-[#d0e7ff] to-[#f0f7ff] flex flex-col items-center justify-center">
        {/* 헤더 */}
        <h1 className="text-[32px] font-bold text-[#4a7ab5] tracking-tight flex items-center gap-2">
          <span className="text-2xl">🌙</span> 주문/결제
        </h1>
        <p className="text-[14px] text-[#7da0ca] mt-1">
          촉촉한 달빛을 담아 안전하게 배송해드릴게요
        </p>
      </div>

      <div className="max-w-[1100px] mx-auto -mt-6 px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 좌측 메인 콘텐츠 */}
          <div className="flex-1 space-y-8">
            {/* 1. 주문 상품 정보 */}
            <section className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-[#e1efff]">
              <div className="bg-[#f8fbff] px-8 py-5 border-b border-[#f0f7ff]">
                <h2 className="text-[18px] font-bold text-[#4a6b9d] flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#99c8ff] rounded-full"></span>
                  주문상품 정보
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <colgroup>
                    <col style={{ width: "auto" }} />
                    <col style={{ width: "100px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "120px" }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#fcfdff] border-b border-[#f0f7ff]">
                      <th className="text-left px-8 py-4 text-[13px] font-semibold text-[#8ba4c7]">
                        상품정보
                      </th>
                      <th className="text-center px-4 py-4 text-[13px] font-semibold text-[#8ba4c7]">
                        수량
                      </th>
                      <th className="text-center px-4 py-4 text-[13px] font-semibold text-[#8ba4c7]">
                        판매금액
                      </th>
                      <th className="text-center px-8 py-4 text-[13px] font-semibold text-[#8ba4c7]">
                        적립예정
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f9ff]">
                    {orderItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[#fafcfe] transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-5">
                            <div className="w-[90px] h-[90px] flex-shrink-0 bg-white rounded-[15px] border border-[#f0f7ff] overflow-hidden shadow-sm">
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-[12px] text-[#9db7db] font-bold tracking-wide">
                                [{item.brandName}]
                              </p>
                              <p className="text-[15px] text-[#44526b] font-semibold leading-snug">
                                {item.productName}
                              </p>
                              {item.optionName &&
                                item.optionName !== item.productName && (
                                  <p className="text-[13px] text-[#869ab8] bg-[#f1f7ff] inline-block px-2 py-0.5 rounded-md mt-1">
                                    옵션: {item.optionName}
                                  </p>
                                )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-6 text-center text-[15px] text-[#5c6d8a] font-medium">
                          {item.quantity}개
                        </td>
                        <td className="px-4 py-6 text-center text-[16px] font-bold text-[#4a6b9d]">
                          {formatPrice(
                            Number(item.sellingPrice) * Number(item.quantity)
                          )}
                        </td>
                        <td className="px-8 py-6 text-center text-[14px] font-semibold text-[#9bbfe7]">
                          +
                          {Math.floor(
                            Number(item.sellingPrice) *
                              Number(item.quantity) *
                              0.01
                          ).toLocaleString()}
                          P
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 2. 배송지 정보 */}
            <section className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-[#e1efff]">
              <div className="bg-[#f8fbff] px-8 py-5 border-b border-[#f0f7ff]">
                <h2 className="text-[18px] font-bold text-[#4a6b9d] flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#99c8ff] rounded-full"></span>
                  배송지 정보
                </h2>
              </div>

              <div className="px-8 py-8 space-y-6">
                <div className="flex gap-3">
                  {["기본 배송지", "신규 배송지"].map((label, idx) => (
                    <button
                      key={label}
                      className={`px-6 py-2.5 rounded-full text-[13px] font-bold cursor-pointer transition-all ${
                        (idx === 0 && addressName === "집") ||
                        (idx === 1 && addressName !== "집")
                          ? "bg-[#9bcafc] text-white shadow-md shadow-blue-100"
                          : "bg-white border border-[#e1efff] text-[#8ba4c7] hover:bg-[#f8fbff]"
                      }`}
                      onClick={() => {
                        if (idx === 0) {
                          setAddressName("집");
                          setReceiverName(profile?.name || "");
                          setReceiverPhone(profile?.phoneNumber || "");
                          setPostalCode(profile?.postalCode || "");
                          setStreetAddress(profile?.address || "");
                          setDetailedAddress(profile?.addressDetail || "");
                        } else {
                          setAddressName("");
                          setReceiverName("");
                          setReceiverPhone("");
                          setPostalCode("");
                          setStreetAddress("");
                          setDetailedAddress("");
                        }
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <input
                      className="w-full px-5 py-3.5 bg-[#fbfdff] border border-[#e8f2ff] rounded-[12px] text-[14px]
                    focus:outline-none focus:ring-2 focus:ring-[#c2dfff] transition-all placeholder-[#c0d0e6]"
                      placeholder="배송지명 (예: 우리집)"
                      value={addressName}
                      onChange={(e) => setAddressName(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2 px-1">
                    <input
                      type="checkbox"
                      id="sameAsOrderer"
                      checked={useOrdererInfo}
                      onChange={(e) => handleOrdererInfoChange(e)}
                      className="w-4 h-4 rounded border-[#c2dfff] text-[#9bcafc] focus:ring-[#9bcafc]"
                    />
                    <label
                      htmlFor="sameAsOrderer"
                      className="text-[13px] text-[#7da0ca] font-medium cursor-pointer"
                    >
                      주문자 정보와 동일
                    </label>
                  </div>

                  <input
                    className="w-full px-5 py-3.5 bg-[#fbfdff] border border-[#e8f2ff] rounded-[12px] text-[14px]
                    focus:outline-none focus:ring-2 focus:ring-[#c2dfff] transition-all placeholder-[#c0d0e6]"
                    placeholder="받는 사람"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                  />

                  <input
                    className="w-full px-5 py-3.5 bg-[#fbfdff] border border-[#e8f2ff] rounded-[12px] text-[14px]
                    focus:outline-none focus:ring-2 focus:ring-[#c2dfff] transition-all placeholder-[#c0d0e6]"
                    placeholder="연락처 (- 제외)"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                  />

                  <div className="md:col-span-2 flex gap-3">
                    <input
                      className="flex-1 px-5 py-3.5 bg-[#f3f8ff] border border-[#e8f2ff] rounded-[12px] text-[14px]
                      text-[#4a6b9d]"
                      placeholder="우편번호"
                      value={postalCode}
                      readOnly
                    />
                    <button
                      className="px-6 py-3.5 bg-[#ebf4ff] text-[#4a89d7] rounded-[12px] text-[13px] font-bold cursor-pointer
                      hover:bg-[#d9e9ff] transition-colors border border-[#d3e5ff]"
                      onClick={() => execDaumPostcode()}
                    >
                      우편번호 찾기
                    </button>
                  </div>

                  <input
                    className="md:col-span-2 w-full px-5 py-3.5 bg-[#fbfdff] border border-[#e8f2ff] rounded-[12px]
                    text-[14px] focus:outline-none focus:ring-2 focus:ring-[#c2dfff] transition-all placeholder-[#c0d0e6]"
                    placeholder="기본 주소"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                  />

                  <input
                    className="md:col-span-2 w-full px-5 py-3.5 bg-[#fbfdff] border border-[#e8f2ff] rounded-[12px]
                    text-[14px] focus:outline-none focus:ring-2 focus:ring-[#c2dfff] transition-all placeholder-[#c0d0e6]"
                    placeholder="상세 주소"
                    value={detailedAddress}
                    onChange={(e) => setDetailedAddress(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* 3. 배송 요청사항 */}
            <section className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-[#e1efff]">
              <div className="bg-[#f8fbff] px-8 py-5 border-b border-[#f0f7ff]">
                <h2 className="text-[18px] font-bold text-[#4a6b9d]">
                  배송 요청사항
                </h2>
              </div>

              <div className="px-8 py-8 space-y-6">
                <div className="relative">
                  <select
                    className="w-full px-5 py-4 rounded-[15px] border-2 border-[#dce9f9] bg-white text-[14px] text-[#44526b] appearance-none focus:outline-none focus:border-[#9bcafc] focus:bg-[#f8fbff] transition-all cursor-pointer"
                    value={deliveryRequest}
                    onChange={(e) => setDeliveryRequest(e.target.value)}
                  >
                    <option value="">배송 요청사항을 선택해주세요</option>
                    <option value="문 앞에 놓아주세요.">
                      문 앞에 놓아주세요.
                    </option>
                    <option value="배송 전에 미리 연락 바랍니다.">
                      배송 전에 미리 연락 바랍니다.
                    </option>
                    <option value="부재 시 경비실에 맡겨주세요.">
                      부재 시 경비실에 맡겨주세요.
                    </option>
                    <option value="부재 시 전화/문자 남겨 주세요.">
                      부재 시 전화/문자 남겨 주세요.
                    </option>
                    <option value="직접입력">직접입력</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#9bcafc]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {deliveryRequest === "직접입력" && (
                  <input
                    className="w-full px-5 py-3.5 bg-[#fbfdff] border border-[#e8f2ff] rounded-[12px] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#c2dfff] transition-all placeholder-[#c0d0e6]"
                    placeholder="배송 요청사항을 입력해주세요"
                    value={customDeliveryRequest}
                    onChange={(e) => setCustomDeliveryRequest(e.target.value)}
                  />
                )}
              </div>
            </section>

            {/* 4. 쿠폰 할인 */}
            <section
              className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden
            border border-[#e1efff]"
            >
              <div className="bg-[#f8fbff] px-8 py-5 border-b border-[#f0f7ff]">
                <h2 className="text-[18px] font-bold text-[#4a6b9d]">
                  쿠폰 할인
                </h2>
              </div>

              <div className="px-8 py-8 space-y-6">
                <div
                  className={`p-6 rounded-[18px] border-2 transition-all ${
                    selectedCoupon
                      ? "border-[#9bcafc] bg-[#f0f7ff]"
                      : "border-dashed border-[#dce9f9] bg-[#fbfdff]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[12px] text-[#9db7db] font-bold mb-1">
                        COUPON
                      </p>
                      <p className="text-[15px] font-bold text-[#44526b]">
                        {selectedCoupon
                          ? `[${couponName}]`
                          : "사용 가능한 쿠폰이 있어요"}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        selectedCoupon
                          ? setSelectedCoupon(null)
                          : setShowCouponModal(true)
                      }
                      className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer ${
                        selectedCoupon
                          ? "bg-white text-[#ff8080] border border-[#ffdada]"
                          : "bg-[#4a89d7] text-white shadow-md shadow-blue-100"
                      }`}
                    >
                      {selectedCoupon ? "해제하기" : "쿠폰 선택"}
                    </button>
                  </div>

                  {/* 할인 금액 표시부 */}
                  {selectedCoupon && (
                    <div className="mt-4 pt-4 border-t border-[#dce9f9] flex justify-between items-center">
                      <span className="text-[13px] text-[#7da0ca]">
                        할인 혜택
                      </span>
                      <span className="text-[18px] text-[#4a89d7] font-black">
                        -{formatPrice(couponDiscount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 5. 포인트 */}
            <section
              className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden
            border border-[#e1efff]"
            >
              <div className="bg-[#f8fbff] px-8 py-5 border-b border-[#f0f7ff]">
                <h2 className="text-[18px] font-bold text-[#4a6b9d]">포인트</h2>
              </div>

              <div className="px-8 py-8 space-y-6">
                <div className="flex flex-wrap items-center gap-4 bg-[#f8fbff] p-5 rounded-[18px] border border-[#e8f2ff]">
                  <div className="relative">
                    <input
                      type="number"
                      className="w-[140px] px-4 py-3 bg-white border border-[#e1efff] rounded-[10px] text-[14px]
                      text-right pr-8 focus:outline-none"
                      value={usePoint}
                      onChange={(e) => {
                        const value = Math.floor(Number(e.target.value));
                        if (value <= pointBalance && value >= 0) {
                          setUsePoint(value);
                        } else if (value < 0) {
                          setUsePoint(0);
                        } else if (value > pointBalance) {
                          setUsePoint(pointBalance);
                        }
                      }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#9db7db] font-bold">
                      P
                    </span>
                  </div>
                  <div className="text-[14px]">
                    <span className="text-[#8ba4c7]">보유 포인트 </span>
                    <span className="font-bold text-[#4a6b9d] ml-1">
                      {pointBalance.toLocaleString()}P
                    </span>
                  </div>
                  <button
                    className="ml-auto px-4 py-2 bg-white border border-[#c2dfff] text-[#4a89d7] text-[12px] font-bold rounded-lg hover:bg-[#ebf4ff] cursor-pointer"
                    onClick={() => setUsePoint(pointBalance)}
                  >
                    전액 사용
                  </button>
                </div>
              </div>
            </section>

            {/* 6. 결제수단 */}
            <section
              className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden
            border border-[#e1efff]"
            >
              <div className="bg-[#f8fbff] px-8 py-5 border-b border-[#f0f7ff]">
                <h2 className="text-[18px] font-bold text-[#4a6b9d]">
                  결제수단 선택
                </h2>
              </div>

              <div className="px-8 py-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {paymentMethods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedPayment(m.id)}
                      className={`px-4 py-4 rounded-[15px] text-[14px] font-bold border-2 transition-all cursor-pointer ${
                        selectedPayment === m.id
                          ? "bg-[#ebf4ff] border-[#9bcafc] text-[#4a89d7]"
                          : "bg-white border-[#f0f7ff] text-[#8ba4c7] hover:border-[#e1efff]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 7. 약관 동의 */}
            <section className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-[#e1efff]">
              <div className="bg-[#f8fbff] px-8 py-5 border-b border-[#f0f7ff]">
                <h2 className="text-[18px] font-bold text-[#4a6b9d]">
                  주문 동의
                </h2>
              </div>

              <div className="px-8 py-8 space-y-6">
                <label className="flex items-center gap-3 pb-4 border-b border-[#e5e5e5] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeAll}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAgreeAll(checked);
                      setAgreePurchase(checked);
                      setAgreePersonal(checked);
                      setAgreeDelegate(checked);
                    }}
                    className="w-5 h-5"
                  />
                  <span className="text-[14px] font-bold text-[#111]">
                    전체 동의 (필수)
                  </span>
                </label>

                <div className="space-y-3">
                  {[
                    {
                      id: "purchase",
                      label: "구매조건 확인 및 결제대행 서비스 약관 동의",
                      state: agreePurchase,
                      setter: setAgreePurchase,
                    },
                    {
                      id: "personal",
                      label: "개인정보 수집 및 이용 동의",
                      state: agreePersonal,
                      setter: setAgreePersonal,
                    },
                    {
                      id: "delegate",
                      label: "개인정보 제공 및 위탁 동의",
                      state: agreeDelegate,
                      setter: setAgreeDelegate,
                    },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={item.state}
                        onChange={(e) => item.setter(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-[13px] text-[#666]">
                        {item.label} (필수)
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* 우측 결제 정보 박스 */}
          <div className="lg:w-[380px]">
            <div className="sticky top-10">
              {/* 상단 파란색 헤더 영역 */}
              <div className="bg-[#4a89d7] rounded-t-[24px] px-8 py-7 shadow-lg">
                <h3 className="text-[22px] font-bold text-white flex items-center justify-between">
                  결제정보
                </h3>
              </div>

              {/* 상세 내역 영역 */}
              <div className="bg-white rounded-b-[24px] px-8 py-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-x border-b border-[#e1efff] space-y-5">
                <div className="space-y-4 pb-6 border-b border-[#f0f7ff]">
                  <div className="flex justify-between items-center">
                    <span className="text-[15px] text-[#8ba4c7] font-medium">
                      주문금액
                    </span>
                    <span className="text-[16px] text-[#44526b] font-bold">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[15px] text-[#8ba4c7] font-medium">
                      배송비
                    </span>
                    <span className="text-[16px] text-[#44526b] font-bold">
                      {shippingFee > 0
                        ? `+ ${formatPrice(shippingFee)}`
                        : "무료"}
                    </span>
                  </div>

                  {couponDiscount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[15px] text-[#8ba4c7] font-medium">
                        쿠폰 할인
                      </span>
                      <span className="text-[16px] text-[#ff8080] font-bold">
                        - {formatPrice(couponDiscount)}
                      </span>
                    </div>
                  )}

                  {usePoint > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[15px] text-[#8ba4c7] font-medium">
                        포인트 사용
                      </span>
                      <span className="text-[16px] text-[#ff8080] font-bold">
                        - {formatPrice(usePoint)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-[18px] font-bold text-[#44526b]">
                    총 결제금액
                  </span>
                  <span className="text-[28px] font-black text-[#4a89d7]">
                    {formatPrice(finalPrice)}
                  </span>
                </div>

                <div className="bg-[#f8fbff] rounded-[15px] p-5 space-y-2">
                  <p className="text-[13px] text-[#7da0ca] flex justify-between">
                    <span>• 결제금액</span>
                    <span className="font-semibold">
                      {formatPrice(finalPrice)}
                    </span>
                  </p>
                  <p className="text-[13px] text-[#7da0ca] flex justify-between">
                    <span>• 결제수단</span>
                    <span className="font-semibold">{paymentMethod}</span>
                  </p>
                  <p className="text-[13px] text-[#7da0ca] flex justify-between">
                    <span>• 적립 예정 포인트</span>
                    <span className="font-bold text-[#99c8ff]">
                      {earnedPoints}P
                    </span>
                  </p>
                </div>

                <button
                  className={`w-full py-5 rounded-[18px] text-[17px] font-bold transition-all shadow-lg cursor-pointer ${
                    agreePurchase && agreePersonal && agreeDelegate
                      ? "bg-[#4a89d7] text-white hover:bg-[#3d76bc] shadow-blue-100"
                      : "bg-[#e1efff] text-[#8ba4c7] cursor-not-allowed shadow-none"
                  }`}
                  disabled={!(agreePurchase && agreePersonal && agreeDelegate)}
                  onClick={handleOrderCompleteClick}
                >
                  {formatPrice(finalPrice)} 결제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCouponModal && (
        <CouponModal
          onClose={() => setShowCouponModal(false)}
          onSelect={(coupon) => {
            setSelectedCoupon(coupon);
            setShowCouponModal(false);
          }}
          userId={user.id}
          totalPrice={totalPrice}
        />
      )}
    </div>
  );
};

export default OrderComponent;
