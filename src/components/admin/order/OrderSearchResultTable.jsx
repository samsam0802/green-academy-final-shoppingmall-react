import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  changeOrderProductStatus,
  deleteOneOrder,
} from "../../../api/order/orderApi";
import ConfirmModal from "./ConfirmModal";
import DeliveryConfirmModal from "./DeliveryConfirmModal";

import { refundPayment } from "../../../api/payment/paymentApi";
import ReturnModal from "./ReturnModal";

const OrderSearchResultTable = ({ orders, searchHandler }) => {
  console.log("orders", orders);

  // 상태 변경 모달창
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  // 상태 변경 모달창에 전달하는 주문 상품 item
  const [confirmModalData, setConfirmModalData] = useState({});
  // 상태 변경 요청할 상태
  const [requestStatus, setRequestStatus] = useState();

  // 체크박스로 선택한 상품
  const [selectedItem, setSelectedItem] = useState([]);

  // 선택 상품 출고 모달
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  // 반품/환불 처리 모달
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // orders가 유효한 객체인지 확인하고, 아니면 기본값(빈 객체)을 사용
  const data = orders || {};

  // 주문 목록은 dtoList를 사용하며, dtoList가 없을 경우 빈 배열을 사용 (안전한 접근)
  const orderList = data.dtoList || [];

  const totalCount =
    data.totalDataCount !== undefined ? data.totalDataCount : orderList.length;

  const flatOrders = orderList.flatMap((order) => {
    return order.orderProducts.map((op, index) => {
      return {
        ...op,
        orderId: order.id,
        orderDate: order.orderDate,
        orderNumber: order.orderNumber,
        receiverName: order.receiverName,
        ordererName: order.ordererName,
        paymentMethod: order.paymentMethod,
        isFirstProduct: index === 0,
        productCount: order.orderProducts.length,
      };
    });
  });

  // 선택한 상품의 주문들
  const selectedOrder = orderList.filter((order) =>
    selectedItem.some((item) => item.orderId == order.id)
  );

  console.log("selectedOrder", selectedOrder);

  // console.log("flatOrders", flatOrders);

  useEffect(() => {
    setSelectedItem([]);
  }, [orders]);

  const handleChangeStatus = async (item, value) => {
    console.log("item", item);
    if (value == "PENDING_PAYMENT")
      return alert("주문 접수 상태로는 변경이 불가합니다.");
    if (value == "CONFIRMED")
      return alert("구매확정은 사용자가 할 수 있습니다.");
    if (value == "RETURN_REQUESTED")
      return alert("반품/환불 신청은 사용자가 할 수 있습니다.");
    if (value == "RETURNED")
      return alert("반품/환불 처리는 반품/환불 처리 버튼을 눌러주세요.");
    setConfirmModalData(item);
    setRequestStatus(value);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmChangeStatus = async (item, value) => {
    // console.log("handleConfirmChangeStatus => ", item, value);
    await changeOrderProductStatus(item.orderId, value);
    await searchHandler();
    setSelectedItem([]);
  };

  const handleSelectItem = (item) => {
    setSelectedItem((prev) =>
      prev.some((i) => i.id == item.id)
        ? prev.filter((i) => i.id != item.id)
        : [...prev, item]
    );
  };

  const handleSelectAll = () => {
    if (selectedItem.length != flatOrders.length) setSelectedItem(flatOrders);
    else setSelectedItem([]);
  };

  const handleOpenDeliveryModal = () => {
    if (selectedItem.length === 0) {
      return alert("출고할 상품을 선택해주세요.");
    }

    if (selectedItem.some((i) => i.orderProductStatus !== "PAID")) {
      return alert("결제완료 상태인 상품만 출고가 가능합니다.");
    }

    setIsDeliveryModalOpen(true);
  };

  // 3. 모달에서 '변경 확정'을 눌렀을 때 실행될 최종 로직
  const handleChangeSelectedItemStatus = async () => {
    try {
      // 선택된 아이템들의 orderId를 중복 제거하여 수집
      const uniqueOrderIds = [
        ...new Set(selectedItem.map((item) => item.orderId)),
      ];

      for (const orderId of uniqueOrderIds) {
        // API 구조에 따라 다르겠지만, 기존 로직대로 orderId 기준 변경 수행
        await changeOrderProductStatus(orderId, "PREPARING");
      }

      alert("선택한 주문의 출고 처리가 완료되었습니다.");
      setSelectedItem([]);
      await searchHandler();
    } catch (error) {
      console.error("출고 처리 중 오류 발생:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setIsDeliveryModalOpen(false);
    }
  };

  const handleOpenReturnModal = () => {
    if (
      selectedItem.some((item) => item.orderProductStatus != "RETURN_REQUESTED")
    ) {
      return alert("반품/환불 신청한 상품만 반품/환불 처리가 가능합니다.");
    }

    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = async () => {
    try {
      // 선택된 아이템들의 orderId를 중복 제거하여 수집
      const uniqueOrderIds = [
        ...new Set(selectedItem.map((item) => item.orderId)),
      ];

      for (const orderId of uniqueOrderIds) {
        // "RETURNED" 상태로 변경 API 호출
        const item = selectedItem.filter((item) => item.orderId == orderId);
        // console.log("item", item);
        await refundPayment(orderId, item.returnReason);
        await changeOrderProductStatus(orderId, "RETURNED");
        await deleteOneOrder(orderId);
      }
    } catch (error) {
      console.error("반품 처리 중 오류 발생:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setIsReturnModalOpen(false); // 모달 닫기
      alert("반품/환불 처리가 완료됐습니다.");
      searchHandler();
    }
  };

  console.log("selectedItem", selectedItem);

  return (
    <div className="w-full mt-8">
      <div className="flex justify-between items-center mb-3 text-gray-700 flex-wrap gap-2">
        <span className="font-semibold text-lg">
          검색 결과 (총 {totalCount} 건)
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded-md border border-blue-200 cursor-pointer transition shadow-sm"
            onClick={handleOpenDeliveryModal}
          >
            선택 상품 출고
          </button>
          <button
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded-md border border-blue-200 cursor-pointer transition shadow-sm"
            onClick={handleOpenReturnModal}
          >
            반품/환불 처리
          </button>
        </div>
      </div>

      {/* 결과 테이블 */}
      <div className="overflow-x-auto border border-gray-300 rounded-lg shadow-md">
        <table className="min-w-full border-collapse text-sm text-center">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr className="text-gray-700 font-semibold text-sm divide-x divide-gray-300">
              <th className="px-1 py-3 w-13">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={
                    flatOrders.length > 0 &&
                    selectedItem.length == flatOrders.length
                  }
                ></input>
              </th>
              <th className="px-2 py-3">번호</th>
              <th className="px-3 py-3">주문날짜</th>
              <th className="px-3 py-3">주문번호</th>
              <th className="px-3 py-3">상품명</th>
              <th className="px-3 py-3">수량</th>
              <th className="px-3 py-3">받는사람/주문자</th>
              <th className="px-3 py-3">결제수단</th>
              <th className="px-3 py-3">결제금액</th>
              <th className="px-3 py-3">주문상태</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {flatOrders.map((item) => (
              <tr
                key={`${item.orderId}-${item.id}`} // 주문 id와 상품 id를 조합
                className="hover:bg-gray-50 transition divide-x divide-gray-200"
              >
                <td className="px-2 py-3">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 border-gray-400 rounded text-blue-600 cursor-pointer"
                    onChange={() => handleSelectItem(item)}
                    checked={selectedItem.some((i) => i.id == item.id)}
                  />
                </td>
                {item.isFirstProduct && (
                  <>
                    <td
                      className="px-3 py-3 align-middle"
                      rowSpan={item.productCount}
                    >
                      {item.orderId}
                    </td>
                    <td
                      className="px-3 py-3 align-middle"
                      rowSpan={item.productCount}
                    >
                      {item.orderDate}
                    </td>
                    <td
                      className="px-3 py-3 text-blue-600 cursor-pointer hover:underline align-middle"
                      rowSpan={item.productCount}
                    >
                      {item.orderNumber}
                    </td>
                  </>
                )}
                <td className="px-3 py-3">
                  {item.productName}-{item.productOptionName}
                </td>
                <td className="px-3 py-3">{item.quantity}</td>
                {item.isFirstProduct && (
                  <>
                    <td
                      className="px-3 py-3 align-middle"
                      rowSpan={item.productCount}
                    >
                      {item.receiverName}/{item.ordererName}
                    </td>
                    <td
                      className="px-3 py-3 align-middle"
                      rowSpan={item.productCount}
                    >
                      {item.paymentMethod}
                    </td>
                  </>
                )}

                <td className="px-3 py-3 text-blue-800 font-medium">
                  {item.totalAmount} 원
                </td>

                <td className="px-3 py-3">
                  <select
                    value={item.orderProductStatus}
                    disabled={[
                      "PENDING_PAYMENT",
                      "CONFIRMED",
                      "RETURN_REQUESTED",
                      "RETURNED",
                    ].includes(item.orderProductStatus)}
                    className="border border-gray-300 px-2 py-[2px] text-sm bg-white cursor-pointer rounded-md"
                    onChange={(e) => handleChangeStatus(item, e.target.value)}
                  >
                    <option value="PENDING_PAYMENT" disabled>
                      주문접수
                    </option>
                    <option value="PAID">결제완료</option>
                    <option value="PREPARING">배송준비중</option>
                    <option value="SHIPPING">배송중</option>
                    <option value="DELIVERED">배송완료</option>
                    <option value="CONFIRMED" disabled>
                      구매확정
                    </option>
                    <option value="RETURN_REQUESTED" disabled>
                      반품/환불신청
                    </option>
                    <option value="RETURNED" disabled>
                      반품/환불완료
                    </option>
                  </select>
                </td>
              </tr>
            ))}
            {flatOrders.length === 0 && (
              <tr>
                <td colSpan="10" className="py-10 text-center text-gray-500">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isConfirmModalOpen && (
        <ConfirmModal
          confirmModalData={confirmModalData}
          requestStatus={requestStatus}
          onConfirm={(item, value) => {
            handleConfirmChangeStatus(item, value);
            setIsConfirmModalOpen(false);
          }}
          onClose={() => setIsConfirmModalOpen(false)}
        />
      )}
      {isDeliveryModalOpen && (
        <DeliveryConfirmModal
          selectedCount={selectedItem.length}
          onConfirm={handleChangeSelectedItemStatus}
          onClose={() => setIsDeliveryModalOpen(false)}
        />
      )}
      {isReturnModalOpen && (
        <ReturnModal
          selectedOrder={selectedOrder}
          selectedItem={selectedItem}
          onConfirm={handleConfirmReturn}
          onClose={() => setIsReturnModalOpen(false)}
        />
      )}
    </div>
  );
};

export default OrderSearchResultTable;
