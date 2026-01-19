import axios from "axios";

// 로컬 개발 api 요청 경로
// export const API_SERVER = "http://localhost:8080";
// aws 로드밸런서 api 요청 경로
export const API_SERVER = "https://api.moisture-village.shop";

export const axiosInstance = axios.create({
  baseURL: API_SERVER,
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  // FormData가 아닐 때만 application/json 설정
  if (!(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

let isRefreshing = false; // 진행중 여부
let failedQueue = []; // 요청 대기목록

const processQueue = (error) => {
  // 대기중인 요청 처리 함수임
  failedQueue.forEach((promise) => {
    // 대기목록을 순환 꺼내면 promise임
    if (error) promise.reject(error); // 에러발생하면 해당요청은 error를 반환
    else promise.resolve(); // 아니면 해당 요청에 토큰 넣어서 재요청
  });
  failedQueue = []; // 완료 후 대기목록 초기화
};

axiosInstance.interceptors.response.use(
  (response) => response, // 응답은 그대로 보냄
  async (error) => {
    console.log("✅인터셉터 Response 에러 발생 로그확인", error);
    const originalRequest = error.config; // 실패한 기존 요청에 대한 에러
    const isRefreshRequest = originalRequest?.url?.includes("/refresh"); // 실패한요청에 해당 경로가있는지 확인

    // 401 에러 처리 (인증 관련)
    if (error.response?.status === 401) {
      if (isRefreshRequest) {
        // 해당 요청이 있을때
        console.error("토큰 갱신 실패 - 재로그인 필요");
        return Promise.reject(error); // 에러 반환
      }

      // 이미 재시도(retry) 한건 더이상 처리하지않고 에러 반환
      if (originalRequest._retry) return Promise.reject(error); // 무한루프 방지

      if (isRefreshing) {
        // 진행중이라면
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject }); // 대기목록에 해당 요청들 저장
        })
          .then(() => axiosInstance(originalRequest)) // 갱신 성공하면 요청 재시도
          .catch((err) => Promise.reject(err)); // 실패하면 에러 반환
      }

      originalRequest._retry = true; // 재시도 설정
      isRefreshing = true; // 갱신중 설정

      try {
        // 서버에 리프레시 요청
        console.log("401 감지 : 리프레시 요청 시작");
        await axiosInstance.post("/api/user/refresh");

        isRefreshing = false;
        console.log("리프레시 요청 성공 : 대기중인 요청들을 이제 다시 시작");
        processQueue(null); // 대기하던 다른 API들에게 "이제 가도 돼!"라고 알림

        return axiosInstance(originalRequest); // 원래 요청 재시도
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        console.error(
          "리프레시 요청 자체가 실패 하였습니다.",
          refreshError.response?.status,
          refreshError.response?.data
        );
        return Promise.reject(refreshError);
      }
    }

    // 403 에러 처리
    if (error.response?.status === 403) {
      const errorMessage =
        error.response.data?.message || "접근 권한이 없습니다.";
      alert(errorMessage);
    }

    // 공통 에러 객체 생성
    if (error.response?.data) {
      const { status, message } = error.response.data;
      return Promise.reject({
        status: status || error.response.status,
        message: message || "오류가 발생했습니다.",
        originalError: error,
      });
    }

    // 네트워크 에러
    return Promise.reject({
      status: 0,
      message: "네트워크 오류가 발생했습니다.",
      originalError: error,
    });
  }
);
