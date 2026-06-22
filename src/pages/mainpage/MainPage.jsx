import { useEffect, useRef, useState } from "react";
import Header from "../../layouts/mainpage/Header";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import Footer from "../../layouts/mainpage/Footer";
import {
  fetchBestProducts,
  fetchNewProducts,
} from "../../api/admin/product/productApi";
import { useNavigate } from "react-router-dom";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const mainImages = [
  "https://res.cloudinary.com/dh1ntaqlj/image/upload/v1782101098/michela-ampolo-7tDGb3HrITg-unsplash_pxthar.jpg",
  "https://res.cloudinary.com/dh1ntaqlj/image/upload/v1782101110/birgith-roosipuu-GdsFTnarsog-unsplash_motzfc.jpg",
  "https://res.cloudinary.com/dh1ntaqlj/image/upload/v1782101118/kadarius-seegars-Mxy5gokl8mE-unsplash_c4xxc5.jpg",
];

const newImages = [
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0020/A00000020917060ko.jpg?l=ko",
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0021/A00000021846519ko.jpg?l=ko",
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0020/A00000020495912ko.jpg?l=ko",
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0022/A00000022564863ko.jpg?l=ko",
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0021/A00000021847210ko.jpg?l=ko",
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0020/A00000020917060ko.jpg?l=ko",
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0021/A00000021846519ko.jpg?l=ko",
];

const bestImages = [
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0023/A00000023119705ko.png?l=ko",
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0023/A00000023119504ko.jpg?l=ko",
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0023/A00000023118905ko.jpg?l=ko",
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0018/A00000018718905ko.jpg?l=ko",
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0014/A00000014512911ko.png?l=ko",
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0023/A00000023119705ko.png?l=ko",
  "https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/550/10/0000/0023/A00000023119504ko.jpg?l=ko",
];

export default function MainPage() {
  const newSwiperRef = useRef(null);
  const bestSwiperRef = useRef(null);
  const bannerSwiperRef = useRef(null);
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);

  const [newProducts, setNewProducts] = useState([]);
  const [bestProducts, setBestProducts] = useState([]);

  const loadNewProducts = async () => {
    const data = await fetchNewProducts();
    console.log("newProductsData : ", data);
    setNewProducts(data);
  };

  const loadBestProducts = async () => {
    const data = await fetchBestProducts();
    console.log("bestProductsData : ", data);
    setBestProducts(data);
  };

  useEffect(() => {
    loadNewProducts();
    loadBestProducts();
  }, []);

  const sliderSettings = {
    modules: [Navigation],
    slidesPerView: 5,
    slidesPerGroup: 1,
    spaceBetween: 16,
    speed: 600,
    loop: true,
    breakpoints: {
      1280: { slidesPerView: 5 },
      1024: { slidesPerView: 4 },
      768: { slidesPerView: 2 },
      480: { slidesPerView: 1 },
    },
  };

  const handlePrevClick = (swiperRef) => {
    if (swiperRef.current && swiperRef.current.swiper)
      swiperRef.current.swiper.slidePrev();
  };

  const handleNextClick = (swiperRef) => {
    if (swiperRef.current && swiperRef.current.swiper)
      swiperRef.current.swiper.slideNext();
  };

  const goToProductPage = (id) => {
    navigate(`/product/${id}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />

      <main className="flex-1">
        {/* 배너 */}
        <section className="relative w-full h-[500px]">
          <div
            className="w-full h-full"
            onMouseEnter={() => bannerSwiperRef.current?.autoplay.stop()}
            onMouseLeave={() => bannerSwiperRef.current?.autoplay.start()}
          >
            <Swiper
              modules={[Autoplay]}
              loop={true}
              slidesPerView={1}
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              speed={1000}
              onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
              onSwiper={(swiper) => (bannerSwiperRef.current = swiper)}
              className="w-full h-full"
            >
              {mainImages.map((img, idx) => (
                <SwiperSlide key={idx}>
                  <img
                    src={img}
                    alt={`Banner ${idx}`}
                    className="w-full h-full object-cover cursor-pointer"
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {/* 하단 동그라미 페이지네이션 */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-40">
            {mainImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => bannerSwiperRef.current?.slideToLoop(idx)}
                className={`w-3 h-3 rounded-full transition-colors duration-300 cursor-pointer ${
                  activeIndex === idx ? "bg-gray-500" : "bg-white/100"
                }`}
              />
            ))}
          </div>
        </section>

        {/* NEW */}
        <section className="max-w-[1250px] mx-auto py-8 px-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold">NEW</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handlePrevClick(newSwiperRef)}
                className="text-2xl font-bold cursor-pointer text-gray-700"
              >
                <ChevronLeftIcon />
              </button>
              <button
                onClick={() => handleNextClick(newSwiperRef)}
                className="text-2xl font-bold cursor-pointer text-gray-700"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
          {newProducts.length > 0 ? (
            <Swiper {...sliderSettings} ref={newSwiperRef} className="w-full">
              {newProducts.map((p, i) => (
                <SwiperSlide key={i}>
                  <div className="cursor-pointer">
                    <img
                      onClick={() => goToProductPage(p.id)}
                      src={p?.mainImages[0].imageUrl}
                      alt={`NEW ${i}`}
                      className="rounded-xl w-full h-[300px] object-cover"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              로딩 중...
            </div>
          )}
        </section>

        {/* BEST */}
        <section className="max-w-[1250px] mx-auto py-8 px-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold">BEST</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handlePrevClick(bestSwiperRef)}
                className="text-2xl font-bold cursor-pointer text-gray-700"
              >
                <ChevronLeftIcon />
              </button>
              <button
                onClick={() => handleNextClick(bestSwiperRef)}
                className="text-2xl font-bold cursor-pointer text-gray-700"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
          {bestProducts.length > 0 ? (
            <Swiper {...sliderSettings} ref={bestSwiperRef} className="w-full">
              {bestProducts.map((p, i) => (
                <SwiperSlide key={i}>
                  <div className="cursor-pointer">
                    <img
                      onClick={() => goToProductPage(p.id)}
                      src={p?.mainImages[0].imageUrl}
                      alt={`BEST ${i}`}
                      className="rounded-xl w-full h-[300px] object-cover"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              로딩 중...
            </div>
          )}
        </section>
      </main>

      <footer>
        <Footer />
      </footer>
    </div>
  );
}
