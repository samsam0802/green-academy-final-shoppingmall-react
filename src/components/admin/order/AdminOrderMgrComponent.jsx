import React, { useEffect, useState } from "react";
import OrderSearchResultTable from "./OrderSearchResultTable";
import CheckboxGroup from "../CheckboxGroup";
import dayjs from "dayjs";
import { getOrdersBySearch } from "../../../api/order/orderApi";
import Pagination from "../../pagination/Pagination";
import { useSearchParams } from "react-router-dom";

const AdminOrderMgrComponent = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState({}); // 검색한 주문 결과
  const [selectedSearchType, setSelectedSearchType] = useState("주문번호");
  const [orderNumber, setOrderNumber] = useState(""); // 주문번호
  const [ordererName, setOrdererName] = useState(""); // 주문자명
  const [productName, setProductName] = useState(""); // 상품명
  const [startDate, setStartDate] = useState(""); // 시작 시점 날짜
  const [endDate, setEndDate] = useState(""); // 끝나는 시점 날짜
  const [selectedOrderStatuses, setSelectedOrderStatuses] = useState([
    "전체",
    "주문접수",
    "결제완료",
    "배송준비중",
    "배송중",
    "배송완료",
    "구매확정",
    "반품/환불 신청",
    "반품/환불 완료",
  ]); //주문상태
  const [selectedPayment, setSelectedPayment] = useState([
    "전체",
    "신용/체크카드",
    "카카오페이",
    "네이버페이",
    "PAYCO",
    "휴대폰 결제",
    "계좌이체",
  ]); //주문결제 state

  // 검색 버튼을 눌렀는지 여부
  const [hasSearched, setHasSearched] = useState(false);

  // console.log("selectedOrderStatuses", selectedOrderStatuses);
  // console.log("selectedPayment", selectedPayment);

  // URL 쿼리에서 숫자 값을 읽어오는 함수
  const getNum = (param, defaultValue) => {
    if (!param) return defaultValue;
    return parseInt(param, 10);
  };

  const fetchOrdersBySearch = async () => {
    const page = getNum(searchParams.get("page"), 1);
    const size = getNum(searchParams.get("size"), 10);
    const sort = searchParams.get("sort");
    const condition = {
      orderNumber,
      ordererName,
      productName,
      startDate,
      endDate,
      selectedOrderStatus: selectedOrderStatuses.map((s) => orderStatusMap[s]),
      selectedPayment: selectedPayment.map((p) => paymentMap[p]),
    };
    const result = await getOrdersBySearch(condition, sort, page, size);
    setOrders(result);
  };

  useEffect(() => {
    // console.log("useEffect 실행(searchParams 의존성 배열이 변경됨)");
    if (hasSearched) {
      fetchOrdersBySearch();
    }
  }, [searchParams]);

  const allOrderStatuses = [
    "전체",
    "주문접수",
    "결제완료",
    "배송준비중",
    "배송중",
    "배송완료",
    "구매확정",
    "반품/환불 신청",
    "반품/환불 완료",
  ];

  const orderStatusMap = {
    주문접수: "PENDING_PAYMENT",
    결제완료: "PAID",
    배송준비중: "PREPARING",
    배송중: "SHIPPING",
    배송완료: "DELIVERED",
    구매확정: "CONFIRMED",
    "반품/환불 신청": "RETURN_REQUESTED",
    "반품/환불 완료": "RETURNED",
  };

  const allPayment = [
    "전체",
    "신용/체크카드",
    "카카오페이",
    "네이버페이",
    "PAYCO",
    "휴대폰 결제",
    "계좌이체",
  ];

  const paymentMap = {
    "신용/체크카드": "CARD",
    카카오페이: "KAKAO",
    네이버페이: "NAVER",
    PAYCO: "PAYCO",
    "휴대폰 결제": "PHONE",
    계좌이체: "BANK",
  };

  const dateHandler = (label) => {
    let today = dayjs(); //오늘 기준
    let start;

    if (label === "오늘") {
      start = today;
    } else if (label === "1주일") {
      start = today.subtract(6, "day"); //오늘 포함 1주일
    } else if (label === "14일") {
      start = today.subtract(13, "day");
    } else if (label === "1개월") {
      start = today.subtract(1, "month");
    } else if (label === "3개월") {
      start = today.subtract(3, "month");
    } else if (label === "6개월") {
      start = today.subtract(6, "month");
    } else {
      start = today;
    }

    setStartDate(start.format("YYYY-MM-DD"));
    setEndDate(today.format("YYYY-MM-DD"));
  };

  const changeHandler = (value) => {
    // 모든 state를 초기화 (선택이 바뀌었을 경우 이전 값 제거)
    setOrderNumber("");
    setProductName("");
    setOrdererName("");

    // 현재 선택된 검색 기준에 따라 해당 state에 값 저장
    if (selectedSearchType === "주문번호") {
      setOrderNumber(value);
      // console.log("주문번호", orderNumber);
    } else if (selectedSearchType === "주문자명") {
      setOrdererName(value);
      // console.log("주문자명", ordererName);
    } else if (selectedSearchType === "상품명") {
      setProductName(value);
      // console.log("상품명", productName);
    }
  };

  const searchHandler = async () => {
    // console.log("searchHandler 발생");
    setSearchParams((prev) => {
      prev.set("page", "1");
      // t(timeStamp)를 넣어서 searchParams가 무조건 바뀌게 하여 useEffect를 트리거함
      prev.set("t", Date.now().toString());
      return prev;
    });
    setHasSearched(true);
  };

  const resetFiltersHandler = () => {
    setSelectedSearchType("주문번호");
    setOrderNumber("");
    setOrdererName("");
    setProductName("");
    setStartDate("");
    setEndDate("");
    setSelectedOrderStatuses([
      "전체",
      "주문접수",
      "결제완료",
      "배송준비중",
      "배송중",
      "배송완료",
      "구매확정",
      "반품/환불 신청",
      "반품/환불 완료",
    ]);
    setSelectedPayment([
      "전체",
      "신용/체크카드",
      "카카오페이",
      "네이버페이",
      "PAYCO",
      "휴대폰 결제",
      "계좌이체",
    ]);
  };

  return (
    <div className="w-full bg-white p-6 text-sm font-['Inter'] min-h-screen">
      {/* 헤더 */}
      <h2 className="text-2xl font-bold text-gray-800 border-b border-gray-300 pb-4 mb-6 flex justify-between items-center px-2">
        전체 주문 조회
      </h2>

      {/* 필터 영역 */}

      <div className="border border-gray-300 mb-6 rounded-lg overflow-hidden shadow-lg">
        {/* 검색어 */}
        <div className="flex border-b border-gray-300">
          <div className="w-40 bg-gray-50 border-r border-gray-300 font-semibold text-gray-700 flex items-center justify-center p-2 min-h-[44px]">
            검색어
          </div>
          <div className="p-2 flex items-center flex-wrap flex-grow gap-x-3">
            <select
              className="border border-gray-300 p-1 mr-2 bg-white cursor-pointer h-[32px] rounded-md focus:ring-blue-500 focus:border-blue-500 transition"
              onChange={(e) => {
                setSelectedSearchType(e.target.value);
                setOrderNumber("");
                setOrdererName("");
                setProductName("");
                }
              } // 선택된 값을 selectedSearchType에 저장
              value={selectedSearchType} // 현재 선택된 값 표시
            >
              <option>주문번호</option>
              <option>주문자명</option>
              <option>상품명</option>
            </select>
            <input
              type="text"
              placeholder="검색어를 입력하세요"
              className="border border-gray-300 p-1 w-80 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 transition"
              onChange={(e) => changeHandler(e.target.value)}
              value={
                selectedSearchType === "주문번호"
                  ? orderNumber
                  : selectedSearchType === "주문자명"
                  ? ordererName
                  : selectedSearchType === "상품명"
                  ? productName
                  : ""
              }
            />
          </div>
        </div>

        {/* 날짜 */}
        <div className="flex border-b border-gray-300 items-stretch">
          <div className="w-40 bg-gray-50 border-r border-gray-300 font-semibold text-gray-700 flex items-center justify-center p-2 min-h-[44px]">
            날짜
          </div>
          <div className="p-2 flex items-center flex-wrap flex-grow gap-x-3">
            <select className="border border-gray-300 p-1 mr-2 bg-white cursor-pointer h-[32px] rounded-md focus:ring-blue-500 focus:border-blue-500 transition">
              <option>주문일</option>
              {/* <option>결제일</option> */}
            </select>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                className="border border-gray-300 p-1 bg-white cursor-pointer h-[32px] rounded-md focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-gray-500">~</span>
              <input
                type="date"
                value={endDate}
                className="border border-gray-300 p-1 bg-white cursor-pointer h-[32px] rounded-md focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-1 ml-2">
              {["오늘", "1주일", "14일", "1개월", "3개월", "6개월"].map(
                (label) => (
                  <button
                    key={label}
                    className="border border-gray-300 bg-white px-2 py-1 text-gray-700 text-xs cursor-pointer rounded-md hover:bg-blue-50 hover:border-blue-500 transition"
                    onClick={() => dateHandler(label)}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* 체크박스 그룹 */}
        <CheckboxGroup
          title="주문상태"
          options={allOrderStatuses}
          selectedOptions={selectedOrderStatuses}
          setSelectedOptions={setSelectedOrderStatuses}
          showAll={true}
        />
        <CheckboxGroup
          title="주문결제"
          options={allPayment}
          selectedOptions={selectedPayment}
          setSelectedOptions={setSelectedPayment}
        />
      </div>

      {/* 검색 버튼 */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          className="bg-blue-600 text-white px-8 py-2 cursor-pointer rounded-md shadow-md hover:bg-blue-700 transition font-semibold"
          onClick={() => searchHandler()}
        >
          검색
        </button>
        <button
          className="border border-gray-300 bg-white px-8 py-2 text-gray-700 cursor-pointer rounded-md shadow-md hover:bg-gray-100 transition font-semibold"
          onClick={() => resetFiltersHandler()}
        >
          초기화
        </button>
      </div>

      <OrderSearchResultTable orders={orders} searchHandler={searchHandler} />
      <Pagination pageResponseDTO={orders} />
    </div>
  );
};

export default AdminOrderMgrComponent;
