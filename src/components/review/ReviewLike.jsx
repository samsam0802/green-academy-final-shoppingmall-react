import React, { useEffect, useState } from "react";
import {
  reviewLikeCount,
  reviewLikeToggleTrueFalse,
} from "../../api/review/reviewLikeApi";
import { useSelector } from "react-redux";

const ReviewLike = ({ reviewId, reviewUserId }) => {
  const [likeCount, setLikeCount] = useState(0); // 좋아요 개수
  const { user } = useSelector((state) => state.authSlice);

  const isMyReview = user && user.id === reviewUserId;

  //리뷰 좋아요(도움이 돼요) 토글
  const reviewLikeToggleHandler = async () => {
    if (!user) {
      alert("로그인 후 이용해 주세요.");
      return;
    }

    if (isMyReview) {
      alert("본인의 리뷰에는 좋아요를 누를 수 없습니다.");
      return; //본인 리뷰는 무시
    }
    try {
      await reviewLikeToggleTrueFalse(reviewId);

      //토글 후 카운터 재조회
      const count = await reviewLikeCount(reviewId);
      setLikeCount(count);
    } catch (error) {
      console.error("리뷰 좋아요 처리 중 오류:", error);

      const message =
        error.response?.data?.message || "처리 중 오류가 발생했습니다.";
      alert(message);
    }
  };

  // 좋아요 개수 불러오기
  useEffect(() => {
    if (!reviewId) return;

    const fetchReviewLikeCount = async () => {
      try {
        const count = await reviewLikeCount(reviewId);
        setLikeCount(count);
      } catch (error) {
        console.error("리뷰좋아요 개수 조회 실패:", error);
      }
    };
    fetchReviewLikeCount();
  }, [reviewId]);

  return (
    <div>
      <button
        onClick={reviewLikeToggleHandler}
        className={`cursor-pointer transition ${
          user ? "hover:text-gray-900" : "text-gray-400"
        }`}
      >
        👍 도움이 돼요 {likeCount}
      </button>
    </div>
  );
};

export default ReviewLike;
